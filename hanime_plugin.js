(function () {
    'use strict';

    // HanimeCard class is no longer strictly necessary as we'll use Lampa.Card
    // We keep it commented out for reference if needed, but the core logic will shift.
    /*
    function HanimeCard(data) {
        var cardTemplate = Lampa.Template.get('hanime-card', {
            id: data.id,
            img: data.poster, // Assuming poster_path or similar is needed for Lampa.Card
            title: data.name, // Assuming title or name is needed for Lampa.Card
        });

        var cardElement = $(cardTemplate);

        cardElement.addClass('selector');

        this.render = function () {
            return cardElement;
        };

        this.destroy = function () {
            cardElement.remove();
        };
    }
    */

    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        // Use Lampa.Scroll for scrolling the content area
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = []; // Array to hold Lampa.Card instances
        var html = document.createElement('div'); // Main container for the component
        var active = 0; // Index of the currently focused item
        var last; // Last focused item element

        // API URLs
        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json";
        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";

        // --- Keep the proxy server address ---
        var PROXY_BASE_URL = "http://77.91.78.5:3000";
        // ---------------------------------------------

        // --- Use Lampa's built-in category-full template for structure ---
        // This template provides a standard layout including a title area and a body for items.
        // We will append the scroll component's rendered element to the body of this template.
        var componentLayout = Lampa.Template.js('category-full');
        componentLayout.classList.add('hanime-catalog-component'); // Add a custom class if needed for specific styling


        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true);

            network.clear();
            network.native(CATALOG_URL,
                function (data) {
                    if (data && data.metas && Array.isArray(data.metas)) {
                         if (data.metas.length > 0) {
                            _this.build(data.metas);
                         } else {
                            _this.empty("Каталог пуст.");
                         }
                    } else {
                        _this.empty("Неверный формат данных от API.");
                        console.error("Hanime Plugin: Invalid data format", data);
                    }
                },
                function (errorStatus, errorText) {
                    _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                    console.error("Hanime Plugin: Failed to load catalog", errorStatus, errorText);
                },
                false,
                {
                    dataType: 'json',
                    timeout: 15000
                }
            );
        };

        this.build = function (result) {
            var _this = this;

            // Clear previous items and the scroll body
            Lampa.Arrays.destroy(items); // Destroy previous card instances
            items = [];
            scroll.clear(); // Clear the DOM elements from the scroll body

            // Add items to the scroll body using Lampa.Card
            result.forEach(function (meta) {
                // Map Stremio meta properties to Lampa.Card expected properties
                var cardData = {
                    id: meta.id,
                    title: meta.name || meta.title, // Use name or title
                    poster_path: meta.poster, // Use poster as poster_path
                    background_path: meta.background, // Use background for wide/collection cards
                    year: meta.year,
                    description: meta.description,
                    // Add other properties if available and relevant for Lampa.Card display
                };

                // Create Lampa.Card instance
                var card = new Lampa.Card(cardData, {
                    object: componentObject, // Pass component object if needed by card events
                    card_category: true, // Display as a category card
                    // Add other card parameters if needed (e.g., card_wide, card_small)
                });

                card.create();

                // Attach Lampa's standard card events
                card.onFocus = function (target, card_data) {
                    last = target; // Keep track of the last focused element for returning
                    active = items.indexOf(card); // Keep track of the active index
                    scroll.update($(target), true); // Update scroll position
                    Lampa.Background.change(Lampa.Utils.cardImgBackground(card_data)); // Change background
                };

                card.onEnter = function (target, card_data) {
                    last = target; // Keep track of the last focused element
                    console.log("Selected Anime:", card_data.id, card_data.title);
                    _this.fetchStreamAndMeta(card_data.id, card_data); // Fetch stream and meta
                };

                // Append the card element to the scroll body
                scroll.append(card.render(true));
                items.push(card); // Add the card instance to the items array
            });

            // Append the scroll component to the component's layout body
            componentLayout.querySelector('.category-full__body').appendChild(scroll.render(true));

            // Append the main layout to the component's html container
            html.appendChild(componentLayout);

            // Update scroll height after content is added
            scroll.minus(componentLayout.querySelector('.category-full__title'));

            // Layer update and visibility
            Lampa.Layer.update();
            _this.activity.loader(false);
            _this.activity.toggle();
            Lampa.Layer.visible(html);
        };

        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

            _this.activity.loader(true);

            // Always fetch meta in case the initial catalog data was incomplete
            Promise.all([
                new Promise((resolve, reject) => {
                    network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                }),
                 new Promise((resolve, reject) => {
                      network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                 })

            ]).then(([streamData, metaDataResponse]) => {
                _this.activity.loader(false);

                const fullMetaData = metaDataResponse.meta || metaDataResponse; // Handle slight variations in meta response

                console.log("Hanime Plugin | Stream Data:", streamData);
                console.log("Hanime Plugin | Full Meta Data:", fullMetaData);

                if (streamData && streamData.streams && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0]; // Assuming the first stream is the one to play

                    // --- Keep and refine the proxy logic ---
                    var finalStreamUrl = streamToPlay.url;
                    try {
                         var urlObj = new URL(finalStreamUrl);
                         // Check if the hostname indicates a known CORS-problematic source
                         // This is a heuristic; adjust or add more hostnames as needed
                         if (urlObj.hostname.includes('highwinds-cdn.com') || urlObj.hostname.includes('mycloudplayer.com')) {
                             // Encode the original URL and pass it as a parameter to the proxy
                             finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                             console.log("Hanime Plugin | Original stream URL proxied:", finalStreamUrl);
                         } else {
                             console.log("Hanime Plugin | Using direct stream URL:", finalStreamUrl);
                         }
                    } catch (e) {
                        console.error("Hanime Plugin | Failed to parse or proxy stream URL", e);
                        // Fallback to using the original URL if parsing/proxying fails
                        finalStreamUrl = streamToPlay.url;
                        console.log("Hanime Plugin | Error during proxying, using original URL:", finalStreamUrl);
                    }
                    // -------------------------------------------------------

                    var playerObject = {
                        title: fullMetaData.name || fullMetaData.title || 'Без названия',
                        url: finalStreamUrl, // Use the URL after applying proxy logic
                        poster: fullMetaData.poster || fullMetaData.background,
                        card: { // Provide card data for history and other Lampa features
                            id: fullMetaData.id,
                            title: fullMetaData.name || fullMetaData.title,
                            poster_path: fullMetaData.poster || fullMetaData.background,
                            runtime: fullMetaData.runtime, // if available
                            year: fullMetaData.year, // if available
                            original_name: fullMetaData.original_name, // if available
                            // Add other relevant meta data for the card
                        },
                        // Add other player parameters if needed, like subtitles, quality options etc.
                        // Based on the Stremio Addon SDK manifest/stream data structure.
                    };

                    if (playerObject.url) {
                         console.log("Hanime Plugin | Launching player with:", playerObject);
                         Lampa.Player.play(playerObject);

                         // Add to history using the card data format Lampa expects
                         if (playerObject.card && playerObject.card.id) {
                              Lampa.Favorite.add('history', playerObject.card, 100); // 100% watched for simplicity or check player state
                         } else {
                             console.warn("Hanime Plugin | Cannot add to history: card data incomplete", playerObject.card);
                         }

                    } else {
                         Lampa.Noty.show('Не удалось получить ссылку на поток.');
                         console.error("Hanime Plugin | No valid stream URL found in stream data:", streamData);
                    }

                } else {
                     Lampa.Noty.show('Потоки не найдены для этого аниме.');
                     console.warn("Hanime Plugin | No streams found or invalid stream data structure:", streamData);
                }

            }).catch(error => {
                _this.activity.loader(false);
                console.error("Hanime Plugin | Failed to fetch stream/meta details", error);
                Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'));
            });
        };


        // --- Use Lampa's Empty component correctly ---
        this.empty = function (msg) {
            // Clear any previous content (like the scroll area)
            componentLayout.querySelector('.category-full__body').innerHTML = '';
            scroll.destroy(); // Destroy the scroll instance if it was created

            var empty = new Lampa.Empty({ text: msg }); // Use 'text' instead of 'message' for Lampa.Empty
            componentLayout.querySelector('.category-full__body').appendChild(empty.render(true)); // Append to the correct container
            // html.empty().append(empty.render(true)); // This was wrong, appending to the main html directly

            this.activity.loader(false);
            this.activity.toggle();
            this.start = empty.start; // Use empty.start to allow navigation on empty screen
        };

        this.create = function () {
            // componentObject.activity is automatically set by Lampa
            this.activity.loader(true);
            this.fetchCatalog();
        };

        // --- Corrected start/pause/stop methods for Lampa Component ---
        // These methods are called by Lampa.Activity
        this.start = function () {
            // The activity component is now active. Set up its controller.
            // Controller 'content' is standard for lists/grids of items.
            Lampa.Controller.add('content', {
                link: this, // Link controller to this component instance
                toggle: function () {
                    // This is called when the controller is activated/toggled.
                    // We need to tell the Navigator which elements are selectable.
                    // The scroll component handles finding .selector elements within its body.
                    Lampa.Controller.collectionSet(scroll.render());
                    // Focus on the last focused element, or the first if none was focused.
                    Lampa.Controller.collectionFocus(last || false, scroll.render());

                    // Make the scrollable area visible
                    Lampa.Layer.visible(scroll.render(true));
                },
                update: function(){
                     // Optional: Handle updates if needed (e.g., redraw visible items)
                     Lampa.Layer.visible(scroll.render(true)); // Ensure visible elements are rendered
                },
                left: function () {
                    // Navigator.move handles focus movement within the current collectionSet
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu'); // Allow moving to the main menu
                },
                right: function () {
                    if (Navigator.canmove('right')) Navigator.move('right');
                },
                up: function () {
                     // If Navigator cannot move up (at the top row), move focus to the head
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function () {
                    if (Navigator.canmove('down')) Navigator.move('down');
                },
                back: this.back // Handle the back key press
            });

            // Toggle the content controller to activate it
            Lampa.Controller.toggle('content');
        };

        this.pause = function () {
             // Called when this activity is paused (e.g., another activity pushed on top)
             // Save current state if necessary (e.g., scroll position, focused item)
        };

        this.stop = function () {
             // Called when this activity is stopped (e.g., navigated back from)
             // Clean up temporary states if necessary
        };

        // --- Corrected render method ---
        // Returns the main HTML element for the component
        this.render = function () {
            return html;
        };

        this.destroy = function () {
            // Called when this activity is destroyed
            network.clear(); // Abort any ongoing network requests
            Lampa.Arrays.destroy(items); // Destroy all card instances
            scroll.destroy(); // Destroy the scroll component
            html.remove(); // Remove the main HTML element from the DOM

            // Nullify references to aid garbage collection
            items = null;
            network = null;
            scroll = null;
            html = null;
            componentLayout = null; // Nullify the layout reference
            last = null;
        };

        this.back = function () {
            // Standard back navigation using Lampa.Activity
            Lampa.Activity.backward();
        };
    }

    // --- Main plugin initialization ---
    function startPlugin() {
        if (window.plugin_hanime_catalog_ready) return;
        window.plugin_hanime_catalog_ready = true;

        console.log('Hanime Plugin', 'Start loading');

        // --- Remove custom styles and card template ---
        // Rely on Lampa's standard .card and .category-full styles

        // Add the HanimeComponent to Lampa's component registry
        Lampa.Component.add('hanime_catalog', HanimeComponent);
        console.log('Hanime Plugin', 'Component added');

        // Function to add the item to the main menu
        function addMenuItem() {
            console.log('Hanime Plugin', 'Adding menu item');
            var menu_item = $(`
                <li class="menu__item selector">
                    <div class="menu__ico">
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">Hanime Catalog</div>
                </li>
            `);
            menu_item.on('hover:enter', function () {
                // Push a new activity with the custom component
                Lampa.Activity.push({
                    url: '', // No specific URL needed for this component's initial state
                    title: 'Hanime Catalog', // Title for the activity header
                    component: 'hanime_catalog', // The component to load
                    page: 1 // Initial page, might not be strictly used by this component but good practice
                });
            });
            // Append to the correct menu list (assuming the first one is the main)
            $('.menu .menu__list').eq(0).append(menu_item);
             console.log('Hanime Plugin', 'Menu item appended');
        }

        // Wait for the Lampa app to be ready before adding the menu item
        if (window.appready) {
             addMenuItem();
        } else {
             Lampa.Listener.follow('app', function (e) {
                 if (e.type === 'ready') {
                     addMenuItem();
                 }
             });
        }

        console.log('Hanime Plugin', 'Initialization complete');
    }

    // Execute the main plugin initialization function
    startPlugin();

})();
