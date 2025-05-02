(function () {
    'use strict';

    // Base URL for the API endpoints provided by the user
    const API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
    const CATALOG_URL = `${API_BASE_URL}/catalog/movie/newset.json`; // URL to fetch the list of anime

    // Function to fetch data from a URL
    function fetchData(url, callback) {
        Lampa.Utils.fetch(url, {
            method: 'GET',
            headers: {
                // Add any necessary headers here if required by the API
                'Accept': 'application/json'
            }
        }).then(response => response.json())
          .then(data => callback(null, data))
          .catch(error => {
              console.error("Hanime API Fetch Error:", url, error);
              Lampa.Noty.show('Ошибка загрузки данных с Hanime API');
              callback(error, null);
          });
    }

    // Function to build the anime cards for Lampa UI
    function buildAnimeCards(items) {
        let elements = [];
        items.forEach(item => {
            // Map the API data structure ('metas' array from newset.json) to Lampa's card structure
            // The structure seems similar to Lampa's default card structure.
            // We'll use the fields provided in newset.txt [cite: 1]
            elements.push({
                id: item.id, // Use the 'id' from the meta object [cite: 1]
                name: item.name, // Use the 'name' [cite: 1]
                poster: item.poster, // Use the 'poster' [cite: 1]
                description: item.description, // Use the 'description' [cite: 1]
                genres: item.genre, // Use the 'genre' array [cite: 1]
                type: item.type, // Use the 'type' (e.g., 'movie') [cite: 1]
                logo: item.logo, // Use the 'logo' if available [cite: 1]
                background: item.background, // Use 'background' if available (from meta example, not in newset.txt)
                posterShape: item.posterShape, // Use 'posterShape' [cite: 1]
                // Add any other relevant fields Lampa uses for cards
                // behaviourHints might be useful for default video ID, but playback logic handles this
                card_type: 'movie', // Assuming 'movie' type fits best
                url: item.id // We'll use the ID to fetch stream/meta later
            });
        });
        return elements;
    }

    // Function to fetch stream information for a specific anime ID
    function getStreamInfo(animeId, callback) {
        const streamUrl = `${API_BASE_URL}/stream/movie/${animeId}.json`;
        fetchData(streamUrl, (error, data) => {
            if (error || !data || !data.streams) {
                console.error("Error fetching stream data for:", animeId, error, data);
                Lampa.Noty.show('Не удалось получить информацию о потоке');
                return callback(error || 'No stream data');
            }
            // Process the streams data as provided in the prompt example
            callback(null, data.streams); // Pass the array of stream objects
        });
    }

    // Function to fetch metadata (although most is in the catalog, might be needed for background etc.)
    function getMetaInfo(animeId, callback) {
        const metaUrl = `${API_BASE_URL}/meta/movie/${animeId}.json`;
        fetchData(metaUrl, (error, data) => {
            if (error || !data || !data.meta) {
                console.error("Error fetching meta data for:", animeId, error, data);
                // Not critical for playback, maybe just log
                return callback(error || 'No meta data');
            }
            // Process meta data if needed (e.g., background image)
            callback(null, data.meta);
        });
    }

    // Create a Lampa component to display the anime catalog
    function createHanimeComponent() {
        let scroll = new Lampa.Scroll({mask: true, over: true});
        let items = []; // To store the card elements

        // Method to initialize and start loading data
        this.create = function () {
            this.activity.loader(true); // Show loader

            fetchData(CATALOG_URL, (error, data) => {
                this.activity.loader(false); // Hide loader
                if (error || !data || !data.metas) {
                    // Show error message centered on screen if data fails to load
                    let error_msg = Lampa.Template.get('error',{title: 'Ошибка', text: 'Не удалось загрузить каталог Hanime. Проверьте соединение или URL API.'});
                    scroll.append(error_msg);
                    this.empty(); // Maybe render an empty state
                    return;
                }

                // Build cards from the fetched 'metas' array
                items = buildAnimeCards(data.metas);

                // Add cards to the scroll container
                items.forEach(element => {
                    let card = Lampa.Card.create(element); // Use Lampa's card creation
                    card.onFocus = (target, card_data) => {
                        // Handle focus if needed (e.g., update background)
                        // Optional: Fetch full meta here for background
                        // getMetaInfo(card_data.id, (err, meta) => {
                        //     if (!err && meta && meta.background) {
                        //         Lampa.Background.immediately(meta.background);
                        //     }
                        // });
                    };
                    card.onEnter = (target, card_data) => {
                        // Handle item selection (Enter press)
                        this.activity.loader(true);
                        getStreamInfo(card_data.id, (streamErr, streams) => {
                            this.activity.loader(false);
                            if (streamErr || !streams || streams.length === 0) {
                                Lampa.Noty.show('Не удалось загрузить видеопотоки');
                                return;
                            }

                            // Prepare streams for Lampa Player
                            // The structure from the prompt example matches Lampa's requirements quite well.
                            let video = {
                                title: card_data.name,
                                url: streams[0].url, // Default to the first stream (likely highest quality)
                                // You might want to let the user choose quality later
                            };

                            let playlist = streams.map(stream => {
                                return {
                                    title: stream.name.replace('\\n', ' '), // Clean up name
                                    url: stream.url,
                                    // Pass behaviorHints directly if Lampa supports it or adapt as needed
                                    // Lampa might use 'headers' or similar for proxyHeaders
                                    headers: stream.behaviorHints ? stream.behaviorHints.proxyHeaders : null,
                                    timeline: null, // Add timeline if available
                                    quality: stream.name.match(/(\d+p)/) ? stream.name.match(/(\d+p)/)[1] : '?' // Extract quality from name
                                };
                            });

                            // Add metadata details to the player start if needed
                            getMetaInfo(card_data.id, (metaErr, meta) => {
                                if (!metaErr && meta) {
                                    video.poster = meta.poster || card_data.poster;
                                    video.background = meta.background;
                                    // Add other meta details if Lampa player uses them
                                }

                                Lampa.Player.play(video);
                                Lampa.Player.playlist(playlist);

                                // Optional: Set player background
                                if (video.background) {
                                    Lampa.Player.background(video.background);
                                }
                            });
                        });
                    };
                    scroll.append(card.render()); // Render the card and add to scroll
                });

                // Add the scroll container to the main view
                this.render().find('.hanime-catalog__content').append(scroll.render());
            });

            return this.render(); // Return the main component template
        };

        // Method to pause activity
        this.pause = function () {};

        // Method to resume activity
        this.resume = function () {};

        // Method to stop and clean up
        this.stop = function () {
            scroll.destroy(); // Clean up scroll component
        };

        // Method to render the main container for the component
        this.render = function () {
            // Use Lampa's templating engine
            return Lampa.Template.get('hanime_catalog_component', {});
        };

        // Method to handle destruction
        this.destroy = function () {
            this.stop();
        };
    }

    // Initialize the plugin
    function startPlugin() {
        // Make sure Lampa is ready
        if (!window.appready) {
            Lampa.Listener.follow('app', (e) => {
                if (e.type === 'ready') init();
            });
        } else {
            init();
        }

        function init() {
            console.log('Hanime Catalog Plugin Initializing');

            // Define the template for the component's main container
            Lampa.Template.add('hanime_catalog_component', `
                <div class="hanime-catalog">
                    <div class="hanime-catalog__content layer--wheight"></div>
                </div>
            `);

            // Register the component with Lampa
            Lampa.Component.add('hanime_catalog', createHanimeComponent);

            // Add a menu item to access the component
            let menu_item = {
                title: 'Hanime Catalog', // Catalog title in the menu
                component: 'hanime_catalog', // The component to launch
                icon: '<s>H</s>', // Simple text icon, replace with SVG if desired
                background: 'rgba(255, 0, 111, 0.3)', // Example background color for the menu item
            };
            Lampa.Menu.add(menu_item);

            console.log('Hanime Catalog Plugin Ready');
        }
    }

    // Start the plugin execution
    startPlugin();

})();
