/**
 * Lampa Plugin: Hanime Catalog
 * Description: Displays Hanime items fetched from a Stremio API and integrates with Lampa's full card view.
 * Version: 1.2 (Integrates meta and stream fetching with Lampa's full component)
 */

(function () {
    'use strict';

    // Base URL for the Hanime Stremio Addon API
    var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
    var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json";
    var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
    var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";

    /**
     * Card Component for Hanime Item in the catalog view.
     * @param {object} data - Anime metadata object from the API.
     */
    function HanimeCard(data) {
        // Use posterShape from API if available, default to poster if not landscape
        var posterShapeClass = data.posterShape === 'landscape' ? 'card--landscape' : 'card--poster';

        var cardTemplate = Lampa.Template.get('hanime-card', {
            id: data.id,
            img: data.poster, // Use poster URL from API
            title: data.name, // Use name from API
            // Description is not shown on the card itself, but will be used in full view
        });

        var cardElement = $(cardTemplate);
        cardElement.addClass(posterShapeClass); // Add class based on poster shape

        this.render = function () {
            return cardElement;
        };

        this.destroy = function () {
            cardElement.remove();
        };
    }

    /**
     * Main Component for Displaying Hanime Catalog.
     * Handles fetching the catalog and displaying cards.
     * @param {object} componentObject - Lampa component configuration.
     */
    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = [];
        var html = $('<div class="hanime-catalog"></div>');
        var body = $('<div class="hanime-catalog__body category-full"></div>');
        var active = 0;
        var last;

        /**
         * Fetches catalog data from the API.
         */
        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true);

            network.clear();
            network.native(CATALOG_URL,
                function (data) {
                    if (data && data.metas && Array.isArray(data.metas)) {
                        _this.build(data.metas); // Pass the array of metas
                    } else {
                        _this.empty("Invalid data format received from API.");
                        console.error("Hanime Plugin: Invalid data format", data);
                    }
                },
                function (errorStatus, errorText) {
                    _this.empty("Failed to load catalog. Status: " + errorStatus);
                    console.error("Hanime Plugin: Failed to load catalog", errorStatus, errorText);
                },
                false,
                {
                    dataType: 'json',
                    timeout: 15000
                }
            );
        };

        /**
         * Builds the UI with fetched data.
         * @param {Array} result - Array of anime metadata objects.
         */
        this.build = function (result) {
            var _this = this;
            scroll.minus();

            result.forEach(function (meta) { // Iterate through each meta object
                var card = new HanimeCard(meta);
                var cardElement = card.render();

                cardElement.on('hover:focus', function () {
                    last = cardElement[0];
                    active = items.indexOf(card);
                    scroll.update(cardElement, true);
                }).on('hover:enter', function () {
                    console.log("Opening full card for:", meta.id, meta.name);

                    // Prepare data for Lampa's 'full' component.
                    // The 'full' component will use this initial data and then
                    // our listener for 'full:create' will fetch the full meta and stream.
                    var cardDataForLampa = {
                        id: meta.id,             // Use Hanime ID
                        name: meta.name,           // Use Hanime name for title
                        title: meta.name,          // Also set title
                        poster_path: meta.poster,  // Use Hanime poster URL (Lampa might handle full URLs)
                        poster: meta.poster,       // Pass poster URL directly too
                        // description and genres will be fetched in the 'full:create' listener
                        type: meta.type || 'movie',// Pass the type (should be 'movie' based on API)
                    };

                    Lampa.Activity.push({
                        url: '',                     // Not strictly needed when component is specified
                        title: meta.name,            // Set the title for the activity stack
                        component: 'full',           // Use Lampa's built-in full card component
                        id: meta.id,                 // Pass the Hanime ID
                        method: cardDataForLampa.type,// Pass the type
                        card: cardDataForLampa       // Pass the initial metadata object
                    });
                });

                body.append(cardElement);
                items.push(card);
            });

            scroll.append(body);
            html.append(scroll.render(true));
            _this.activity.loader(false);
            _this.activity.toggle();

            // Trigger lazy load after building
            simpleLazyLoad();
        };

        /**
         * Handles empty results or errors.
         * @param {string} msg - Message to display.
         */
        this.empty = function (msg) {
            var empty = new Lampa.Empty({ message: msg });
            html.empty().append(empty.render(true));
            this.activity.loader(false);
            this.activity.toggle();
            this.start = empty.start;
        };

        // --- Lampa Activity Lifecycle Methods ---

        this.create = function () {
            this.activity.loader(true);
            this.fetchCatalog();
        };

        this.start = function () {
            if (Lampa.Activity.active().activity !== this.activity) return;
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function () {
                    if (typeof Navigator !== 'undefined' && Navigator.canmove('right')) {
                        Navigator.move('right');
                    } else {
                         // If no Navigator or cannot move right, maybe focus the last item?
                         // console.log("Cannot move right or Navigator not available.");
                    }
                },
                up: function () {
                    if (typeof Navigator !== 'undefined' && Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function () {
                     if (typeof Navigator !== 'undefined' && Navigator.canmove('down')) Navigator.move('down');
                },
                back: this.back
            });
            Lampa.Controller.toggle('content');
        };

        this.pause = function () {};
        this.stop = function () {};

        this.render = function () {
            return html;
        };

        this.destroy = function () {
            network.clear();
            if (items) { // Check if items exists before destroying
                 Lampa.Arrays.destroy(items);
            }
            if (scroll) { // Check if scroll exists
                scroll.destroy();
            }
            if (html) { // Check if html exists
                 html.remove();
            }
            items = null;
            network = null;
            scroll = null;
            html = null;
            body = null;
        };

        this.back = function () {
            Lampa.Activity.backward();
        };
    }

    /**
     * Component/Listener to enhance Lampa's 'full' component with Hanime data.
     * This listens for the 'full:create' event which happens when the full card is being built.
     */
    function HanimeFullCardEnhancer() {
         var network = new Lampa.Reguest();

         // Listen for the 'full:create' event
         Lampa.Listener.follow('full', function(e) {
             // Check if the event is 'create' and if the item is from our catalog
             // We can identify our items by checking if the 'card' object passed
             // has an 'id' structure that matches our API (e.g., simple ID string)
             // or by adding a custom flag when pushing the activity.
             // For simplicity, let's assume if `e.object.card.id` exists and
             // `e.object.method` is 'movie', it might be one of ours.
             // A more robust way would be to add a flag like `isHanime: true` to the card data.
             if (e.type === 'create' && e.object && e.object.card && e.object.card.id && e.object.method === 'movie') {

                 var hanimeId = e.object.card.id;
                 console.log("Enhancing full card for Hanime ID:", hanimeId);

                 // Fetch the full meta data
                 var metaUrl = META_URL_TEMPLATE.replace('{id}', hanimeId);
                 network.native(metaUrl,
                     function (metaData) {
                         if (metaData && metaData.meta) {
                             console.log("Fetched Hanime meta data:", metaData.meta);
                             // Update the full card display with fetched meta data
                             // Lampa's full component expects certain properties.
                             // We'll map Hanime meta to Lampa's expected fields.

                             // Access the full component's object to update its properties
                             var fullComponent = e.object;

                             // Update description
                             if (metaData.meta.description) {
                                 fullComponent.card.overview = metaData.meta.description;
                                 // Manually update the description element if it exists
                                 var descriptionElement = fullComponent.activity.render().find('.full-descr__text');
                                 if (descriptionElement.length) {
                                     descriptionElement.text(metaData.meta.description);
                                 }
                             }

                              // Update genres
                              if (metaData.meta.genre && Array.isArray(metaData.meta.genre)) {
                                  // Lampa's full component might expect genres as an array of objects { name: 'Genre Name' }
                                  fullComponent.card.genres = metaData.meta.genre.map(function(g) { return { name: g }; });

                                  // Manually update the genres display if it exists
                                  var genreElement = fullComponent.activity.render().find('.full-descr__info-genres .full-descr__text');
                                   if (genreElement.length) {
                                       genreElement.text(metaData.meta.genre.join(', '));
                                   }
                              }

                             // Note: Lampa's full component structure might change, and direct DOM manipulation
                             // might be necessary for some elements if simply updating `fullComponent.card` isn't enough.
                             // You might need to inspect Lampa's full component DOM structure to update other fields.
                             // e.g., poster, background images might need to be updated via data-src and lazy loading.
                             // However, the initial push already includes poster. Background might need custom handling.

                         } else {
                             console.error("Hanime Plugin: Invalid meta data format", metaData);
                         }
                     },
                     function (errorStatus, errorText) {
                         console.error("Hanime Plugin: Failed to fetch meta data", errorStatus, errorText);
                         // Optionally display an error message on the full card
                     },
                     false,
                     { dataType: 'json', timeout: 10000 }
                 );

                 // Fetch the stream data
                 var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', hanimeId);
                  network.native(streamUrl,
                     function (streamData) {
                         if (streamData && Array.isArray(streamData.streams)) {
                              console.log("Fetched Hanime stream data:", streamData.streams);

                              // Lampa's full component typically expects a `playlist` property
                              // on the card object, which is an array of stream objects.
                              // Map the Hanime stream data to Lampa's expected format.
                              // Lampa stream object might need: url, title, quality, name, etc.
                              // The Hanime stream object already provides url, title, name.

                             var lampaStreams = streamData.streams.map(function(stream) {
                                 return {
                                     url: stream.url,
                                     title: stream.title, // e.g., "Sex Ga Suki De Suki De Daisuki Na Classmate 3 💾 129 MB ⌚ 15 min"
                                     quality: stream.name.replace('Hanime.TV\n', '').trim(), // e.g., "720p"
                                     name: stream.name, // e.g., "Hanime.TV\n720p"
                                     // Include behaviorHints if Lampa's player supports them
                                     headers: stream.behaviorHints && stream.behaviorHints.proxyHeaders && stream.behaviorHints.proxyHeaders.request ? stream.behaviorHints.proxyHeaders.request : undefined
                                 };
                             });

                             // Assign the streams to the full component's card object
                             e.object.card.playlist = lampaStreams;
                             console.log("Assigned streams to full card:", e.object.card.playlist);

                             // If the full component is already rendered, we might need to
                             // manually trigger an update or add the streams to its UI elements.
                             // Lampa's full component has a method to update data, but it might
                             // re-fetch everything. A simpler approach is to ensure `playlist`
                             // is set before playback is initiated.

                             // Lampa's full component often has a `play` method or similar.
                             // We need to make sure this method uses the `e.object.card.playlist`.
                             // This might happen automatically if `playlist` is a standard property.
                             // If not, you might need to override the play button's behavior or
                             // hook into a playback initiation event if Lampa provides one.

                         } else {
                             console.error("Hanime Plugin: Invalid stream data format", streamData);
                              // Optionally display an error message on the full card
                         }
                     },
                     function (errorStatus, errorText) {
                         console.error("Hanime Plugin: Failed to fetch stream data", errorStatus, errorText);
                         // Optionally display an error message on the full card
                     },
                     false,
                     { dataType: 'json', timeout: 10000 }
                  );
             }
         });

         // Optional: Listen for full card becoming complete/ready if needed for further modifications
         // Lampa.Listener.follow('full', function(e) {
         //     if (e.type === 'complite') {
         //          console.log("Full card is complete:", e.object.card.name);
                  // Now the DOM elements for the full card should be available
                  // You can find elements and add event listeners or modify content further here
         //     }
         // });
    }


    /**
     * Basic Lazy Load Implementation (optional but good for performance)
     * Scans for images with class 'lazy' and loads them when they become visible.
     */
    function simpleLazyLoad() {
        var lazyImages = [].slice.call(document.querySelectorAll("img.lazy"));
        if ("IntersectionObserver" in window) {
            let lazyImageObserver = new IntersectionObserver(function(entries, observer) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        let lazyImage = entry.target;
                        if (lazyImage.dataset.src) {
                            lazyImage.src = lazyImage.dataset.src;
                            lazyImage.classList.remove("lazy");
                            lazyImageObserver.unobserve(lazyImage);
                        }
                    }
                });
            });
            lazyImages.forEach(function(lazyImage) {
                lazyImageObserver.observe(lazyImage);
            });
        } else {
            // Fallback for browsers without IntersectionObserver
            lazyImages.forEach(function(lazyImage) {
                 if (lazyImage.dataset.src) {
                    lazyImage.src = lazyImage.dataset.src;
                    lazyImage.classList.remove("lazy");
                 }
            });
        }
    }


    /**
     * Initializes the Plugin.
     * Adds templates, components, and menu item.
     */
    function startPlugin() {
        if (window.plugin_hanime_catalog_ready) return;

        window.plugin_hanime_catalog_ready = true;

        // Add custom CSS styles
        var style = `
            .hanime-catalog__body.category-full {
                justify-content: space-around;
                display: flex; /* Ensure flex layout for justify-content */
                flex-wrap: wrap; /* Allow items to wrap */
            }
            /* Default card styling */
            .hanime-card.card--poster {
                 width: 185px; /* Standard poster width */
                 height: auto; /* Adjust height based on aspect ratio */
            }
             .hanime-card.card--landscape {
                 width: 300px; /* Example landscape width */
                 height: auto; /* Adjust height */
             }
            .hanime-card {
                margin-bottom: 1.5em;
                margin-left: 10px; /* Add some horizontal spacing */
                margin-right: 10px;/* Add some horizontal spacing */
            }
            .hanime-card__view {
                position: relative;
                /*height: 270px;*/ /* Remove fixed height, use aspect ratio */
                background-color: rgba(255,255,255,0.05);
                border-radius: 0.3em;
                 overflow: hidden;
            }
             .hanime-card.card--poster .hanime-card__view {
                 padding-top: 150%; /* 2:3 aspect ratio (height / width * 100) for poster */
             }
             .hanime-card.card--landscape .hanime-card__view {
                  padding-top: 56.25%; /* 16:9 aspect ratio (height / width * 100) for landscape */
             }

             .hanime-card__img {
                 position: absolute;
                 top: 0;
                 left: 0;
                 width: 100%;
                 height: 100%;
                 object-fit: cover;
            }
             .hanime-card__title {
                 margin-top: 0.5em;
                 font-size: 0.9em;
                 white-space: nowrap;
                 overflow: hidden;
                 text-overflow: ellipsis;
            }
             /* Style for vote/score - Hanime API provides score, let's display it */
             .hanime-card .card__vote {
                 position: absolute;
                 top: 0.5em;
                 right: 0.5em;
                 background-color: rgba(0, 0, 0, 0.7);
                 color: #fff;
                 padding: 0.2em 0.5em;
                 border-radius: 0.3em;
                 font-size: 0.8em;
             }

        `;
        Lampa.Template.add('hanime-style', `<style>${style}</style>`);

        // Add card template
        // Note: Added {rate} placeholder for score if available in catalog API
        Lampa.Template.add('hanime-card', `
            <div class="hanime-card card selector layer--visible layer--render">
                <div class="hanime-card__view">
                    <img data-src="{img}" src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="hanime-card__img lazy" alt="{title}" />
                     ${'' /* Add vote/score if API provides it in catalog */}
                    ${componentObject.card && componentObject.card.score !== undefined ? '<div class="card__vote">{rate}</div>' : ''}
                </div>
                <div class="hanime-card__title">{title}</div>
            </div>
        `);

        // Register the main catalog component
        Lampa.Component.add('hanime_catalog', HanimeComponent);

        // Initialize the full card enhancer/listener
        new HanimeFullCardEnhancer();


        // Function to add a menu item to Lampa's main menu
        function addMenuItem() {
            var menu_item = $(`
                <li class="menu__item selector">
                    <div class="menu__ico">
                       <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" /></svg> {/* Example simple icon */}
                    </div>
                    <div class="menu__text">Hanime Catalog</div>
                </li>
            `);
            menu_item.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: 'Hanime Catalog',
                    component: 'hanime_catalog',
                    page: 1 // Start with the first page of the catalog
                });
            });
             // Append only if the menu list element exists
             if ($('.menu .menu__list').eq(0).length) {
                $('.menu .menu__list').eq(0).append(menu_item);
             } else {
                 console.error("Hanime Plugin: Could not find Lampa menu list to append item.");
             }
        }

        // Append styles to the body
        $('body').append(Lampa.Template.get('hanime-style', {}, true));

        // Add the menu item when the Lampa app is ready
        if (window.appready) addMenuItem();
        else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') addMenuItem();
            });
        }

        // Listen for activity changes that might reveal the component and trigger lazy load
        Lampa.Listener.follow('activity', function(e) {
             if (e.type === 'resumed' || e.type === 'start') {
                 // Check if the current component is ours
                 if (Lampa.Activity.active() && Lampa.Activity.active().component === 'hanime_catalog') {
                      // Use a timeout to ensure DOM is ready
                      setTimeout(simpleLazyLoad, 100);
                 }
             }
        });

    }

    // Start the plugin initialization
    startPlugin();

})();
