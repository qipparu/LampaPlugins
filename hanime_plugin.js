(function () {
    'use strict';

    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        // Use Lampa.Scroll for scrolling the content area
        // *** Add horizontal: true option ***
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, horizontal: true });
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

        // Set the title for the component
        componentLayout.querySelector('.category-full__title').innerText = componentObject.title || 'Hanime Catalog';
        // Append the layout to the main component container immediately
        html.appendChild(componentLayout);

        // Append the scroll component's rendered element to the component's layout body immediately
        // This ensures the scroll element exists in the DOM structure when build runs
        componentLayout.querySelector('.category-full__body').appendChild(scroll.render(true));


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

            console.log('Hanime Plugin | Building catalog with', result.length, 'items');

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
                    overview: meta.description, // Use description as overview
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
                    scroll.update($(target), true); // Update scroll position. Pass true to center.
                    Lampa.Background.change(Lampa.Utils.cardImgBackground(card_data)); // Change background
                     // console.log('Hanime Plugin | Card focused:', card_data.title);
                };

                card.onEnter = function (target, card_data) {
                    last = target; // Keep track of the last focused element
                    console.log("Hanime Plugin | Selected Anime:", card_data.id, card_data.title);
                    _this.fetchStreamAndMeta(card_data.id, card_data); // Fetch stream and meta
                };

                 // Optional: Handle hover for mouse/touch devices
                 card.onHover = function(target, card_data) {
                     // console.log('Hanime Plugin | Card hovered:', card_data.title);
                     Lampa.Background.change(Lampa.Utils.cardImgBackground(card_data)); // Change background on hover
                 };


                // Append the card element to the scroll body
                // Note: We append to the scroll's body, NOT the componentLayout's body directly
                scroll.append(card.render(true));
                items.push(card); // Add the card instance to the items array
            });

            // Update scroll height based on title bar height (for horizontal scroll)
            // This sets the height of the scroll container correctly within the layout.
            scroll.minus(componentLayout.querySelector('.category-full__title'));

            // Add onWheel handler to the scroll itself (for mouse wheel)
            // *** Corrected Controller/Navigator calls ***
            scroll.onWheel = function(step){
                 // If this component's controller is not active, activate it first
                 if(!Lampa.Controller.own(_this)) {
                     console.log('Hanime Plugin | onWheel: Toggling controller to own');
                     Lampa.Controller.toggle('content');
                 } else {
                      // If it is owned, perform the scroll directly using the scroll component's method
                      console.log('Hanime Plugin | onWheel: Performing scroll wheel', step);
                      scroll.wheel(step);
                      // Note: D-pad moves are handled by Navigator.move, not here.
                      // Mouse wheel should just scroll the content directly.
                 }
            };

             // Add onScroll handler to handle events when the user scrolls (mouse wheel or Navigator movement)
             scroll.onScroll = function() {
                 // This is where you'd typically implement lazy loading based on which items are visible.
                 // For now, ensure visible elements are correctly handled (Lampa.Layer.visible does this).
                 // console.log('Hanime Plugin | onScroll: Updating layer visibility');
                 Lampa.Layer.visible(scroll.render(true));
                 // Optional: Implement logic to append more items if near the end (like Lampa.Main component does)
             };

             // Optional: Add onEnd handler for lazy loading when scroll reaches the end horizontally
             // scroll.onEnd = function() {
             //      console.log('Hanime Plugin | onEnd: Reached end of scroll');
             //      // Implement logic to load more items if available
             // };


            // Layer update and visibility
            Lampa.Layer.update(); // Update layers including the new scroll component
            _this.activity.loader(false);
            _this.activity.toggle(); // Toggle the activity's controller
            // Lampa.Layer.visible(html); // No longer needed here, toggle handles visibility
            console.log('Hanime Plugin | Build complete, activity toggled');
        };

        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

            _this.activity.loader(true);
            console.log('Hanime Plugin | Fetching stream and meta for ID:', id);

            // Always fetch stream and meta details for the selected item
            Promise.all([
                new Promise((resolve, reject) => {
                    network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                }),
                 new Promise((resolve, reject) => {
                      network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                 })

            ]).then(([streamData, metaDataResponse]) => {
                _this.activity.loader(false);
                console.log('Hanime Plugin | Stream and Meta fetched successfully');

                // Handle slight variations in meta response structure
                const fullMetaData = metaDataResponse.meta || metaDataResponse;

                console.log("Hanime Plugin | Stream Data:", streamData);
                console.log("Hanime Plugin | Full Meta Data:", fullMetaData);

                // Process stream data
                if (streamData && streamData.streams && streamData.streams.length > 0) {
                    // Sort streams by quality if possible, or pick a suitable one
                    // For simplicity, taking the first stream as before
                    var streamToPlay = streamData.streams[0];

                    // --- Keep and refine the proxy logic ---
                    var finalStreamUrl = streamToPlay.url;
                    try {
                         var urlObj = new URL(finalStreamUrl);
                         // Check if the hostname indicates a known CORS-problematic source
                         // This is a heuristic; adjust or add more hostnames as needed
                         // Added mycloudplayer.com based on common Stremio addon issues
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

                    // Prepare player object using combined stream and meta data
                    var playerObject = {
                        title: fullMetaData.name || fullMetaData.title || 'Без названия',
                        url: finalStreamUrl, // Use the URL after applying proxy logic
                        // Use background for poster in player if poster is not suitable or missing
                        poster: fullMetaData.poster || fullMetaData.background,
                        card: { // Provide card data for history and other Lampa features
                            id: fullMetaData.id,
                            title: fullMetaData.name || fullMetaData.title,
                            poster_path: fullMetaData.poster || fullMetaData.background, // Use poster or background
                            runtime: fullMetaData.runtime, // if available
                            year: fullMetaData.year, // if available
                            original_name: fullMetaData.original_name, // if available
                            // Add other relevant meta data for the card if available
                            // E.g., genres, description, rating etc. based on Stremio meta structure
                            genres: fullMetaData.genres,
                            overview: fullMetaData.description,
                            vote_average: fullMetaData.rating,
                        },
                        // Add other player parameters if needed, like subtitles, quality options etc.
                        // based on the Stremio Addon SDK manifest/stream data structure.
                        // Example: Add subtitles if available in streamData.streams
                         subtitles: streamData.streams
                             .filter(s => s.url && s.title && (s.url.endsWith('.srt') || s.url.endsWith('.vtt') || s.url.includes('subtitle'))) // Filter for known subtitle formats and check 'subtitle' in URL
                             .map((s, index) => ({
                                 index: index, // Assign a unique index
                                 label: s.title, // Use stream title as subtitle label
                                 url: s.url // The URL to the subtitle file
                             })),
                    };

                    if (playerObject.url) {
                         console.log("Hanime Plugin | Launching player with:", playerObject);
                         Lampa.Player.play(playerObject);

                         // Add to history using the card data format Lampa expects
                         // Use the card data prepared for the playerObject
                         if (playerObject.card && playerObject.card.id) {
                              // The add('history', ...) function expects properties like title, poster_path, year, etc.
                              // We provide the card object which contains these properties.
                              Lampa.Favorite.add('history', playerObject.card, 100); // Assume watched 100% on launch for simplicity
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
                // Display a more user-friendly error message
                Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка. Проверьте интернет-соединение или попробуйте позже.'));
            });
        };


        // --- Use Lampa's Empty component correctly ---
        this.empty = function (msg) {
            console.log('Hanime Plugin | Displaying empty state:', msg);
            // Clear any previous content (like the scroll area)
            componentLayout.querySelector('.category-full__body').innerHTML = '';
            if (scroll) { // Check if scroll instance exists before destroying
                 scroll.destroy();
                 scroll = null; // Nullify the reference
            }

            // Use 'text' property for the message in Lampa.Empty
            var empty = new Lampa.Empty({ text: msg });
            componentLayout.querySelector('.category-full__body').appendChild(empty.render(true)); // Append to the correct container

            this.activity.loader(false);
            this.activity.toggle(); // Toggle controller to allow navigation on empty state
            console.log('Hanime Plugin | Empty state shown, activity toggled');
        };

        this.create = function () {
            // componentObject.activity is automatically set by Lampa
            console.log('Hanime Plugin | create method called');
            this.activity.loader(true); // Show loader when component is created
            this.fetchCatalog(); // Start fetching data
        };

        // --- Corrected start/pause/stop methods for Lampa Component ---
        // These methods are called by Lampa.Activity lifecycle
        // Using arrow functions to preserve 'this' context
        this.start = () => {
            console.log('Hanime Plugin | start method called, setting up controller');
            // The activity component is now active. Set up its controller.
            // Controller 'content' is standard for lists/grids of items.
            Lampa.Controller.add('content', {
                link: this, // Link controller to this component instance
                toggle: () => {
                     console.log('Hanime Plugin | controller toggle called');
                    // This is called when the controller is activated/toggled.
                    // We need to tell the Navigator which elements are selectable.
                    // Explicitly find selectable elements within the scroll or main layout
                    let selectableElements = [];
                    if (scroll && scroll.render(true)) {
                         selectableElements = scroll.render(true).querySelectorAll('.selector');
                         console.log('Hanime Plugin | Found', selectableElements.length, 'selectable elements in scroll');
                    } else {
                         // If no scroll (e.g., empty state), find selectors in the main layout
                         selectableElements = componentLayout.querySelectorAll('.selector');
                         console.log('Hanime Plugin | Found', selectableElements.length, 'selectable elements in layout');
                    }


                    if (selectableElements.length > 0) {
                         // Convert NodeList to Array if necessary, though collectionSet usually handles NodeList
                         Lampa.Controller.collectionSet(selectableElements);
                         // Focus on the last focused element, or the first if available
                         Lampa.Controller.collectionFocus(last || false, selectableElements[0]); // Pass the first element for focus if last is false
                    } else {
                         // If no selectable elements, clear the collection
                         Lampa.Controller.clear();
                         console.log('Hanime Plugin | No selectable elements found, clearing collection');
                    }

                    // Ensure the component's main element is visible layers-wise
                    Lampa.Layer.visible(html);
                },
                update: () => { // Use arrow function here
                     console.log('Hanime Plugin | controller update called');
                     // Trigger layer visibility update when the controller is updated
                     // This is crucial for image loading in Lampa.Card components
                     if (scroll && scroll.render(true)) {
                         Lampa.Layer.visible(scroll.render(true));
                     } else {
                          Lampa.Layer.visible(componentLayout);
                     }
                },
                left: () => { // Use arrow function here
                     console.log('Hanime Plugin | controller left called');
                    // Navigator.move handles focus movement within the current collectionSet
                    if (Lampa.Navigator.canmove('left')) Lampa.Navigator.move('left');
                    else Lampa.Controller.toggle('menu'); // Allow moving to the main menu
                },
                right: () => { // Use arrow function here
                     console.log('Hanime Plugin | controller right called');
                    if (Lampa.Navigator.canmove('right')) Lampa.Navigator.move('right');
                },
                up: () => { // Use arrow function here
                     console.log('Hanime Plugin | controller up called');
                     // If Navigator cannot move up (at the top row), move focus to the head
                    if (Lampa.Navigator.canmove('up')) Lampa.Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: () => { // Use arrow function here
                     console.log('Hanime Plugin | controller down called');
                    if (Lampa.Navigator.canmove('down')) Lampa.Navigator.move('down');
                },
                back: this.back // Handle the back key press
            });

            // Toggle the content controller to activate it
            Lampa.Controller.toggle('content');
             console.log('Hanime Plugin | Controller content toggled');
        };

        this.pause = () => {
             console.log('Hanime Plugin | pause method called');
             // Called when this activity is paused (e.g., another activity pushed on top)
             // The controller for this component is automatically deactivated by Lampa.Activity.
             // You might save the current state (scroll position, focused item) here if needed,
             // but Lampa often handles focused element persistence via `last`.
        };

        this.stop = () => {
             console.log('Hanime Plugin | stop method called');
             // Called when this activity is stopped (e.g., navigated back from)
             // This method is called *before* destroy in some cases.
             // Clean up temporary states here if necessary.
        };

        // --- Corrected render method ---
        // Returns the main HTML element for the component instance
        this.render = function () {
            return html; // This is the root DOM element for the component
        };

        this.destroy = function () {
            console.log('Hanime Plugin | destroy method called');
            // Called when this activity is removed from the stack (e.g., after navigating back).
            // Clean up resources to prevent memory leaks.
            network.clear(); // Abort any ongoing network requests
            Lampa.Arrays.destroy(items); // Destroy all Lampa.Card instances
            if (scroll) { // Check if scroll instance exists before destroying
                 scroll.destroy();
                 scroll = null; // Nullify the reference
            }
            if (html && html.parentNode) { // Check if html element is in the DOM before removing
                 html.parentNode.removeChild(html);
            }

            // Nullify remaining references
            items = null;
            network = null;
            html = null;
            componentLayout = null; // Nullify the layout reference
            last = null;
            console.log('Hanime Plugin | destroy complete');
        };

        this.back = () => {
            console.log('Hanime Plugin | back method called');
            // Standard back navigation using Lampa.Activity
            Lampa.Activity.backward();
        };
    }

    // --- Main plugin initialization ---
    function startPlugin() {
        if (window.plugin_hanime_catalog_ready) return;
        window.plugin_hanime_catalog_ready = true;

        console.log('Hanime Plugin', 'Start loading');

        // --- Add CSS for the component layout and cards ---
        // This replaces the old styles and ensures the standard card looks right within the new layout.
        var style = `
            /* Styles for the main component container */
            .hanime-catalog-component {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column; /* Arrange title above content */
                overflow: hidden; /* Hide overflow */
            }

            /* Styles for the category-full layout elements used within the component */
            .hanime-catalog-component .category-full__title {
                 /* Standard title styles from category-full */
                 padding: 1.5em 2em 1em 2em; /* Add padding around the title */
                 font-size: 1.8em; /* Adjust font size if needed */
                 font-weight: 600;
                 color: var(--text);
                 flex-shrink: 0; /* Prevent title from shrinking */
            }

            .hanime-catalog-component .category-full__body {
                /* This is where the scroll component will be placed */
                flex-grow: 1; /* Allow the body to take remaining space */
                overflow: hidden; /* Handled by the scroll component inside */
                position: relative; /* Needed for absolute positioning inside if any */
            }

            /* Styles for the Lampa.Scroll component used within the body */
            .hanime-catalog-component .scroll {
                 width: 100%;
                 height: 100%; /* Scroll takes the full height of the body */
                 /* Lampa.Scroll already handles its own display/overflow based on its type */
            }

            /* Styles for the scroll's internal body (where cards are appended) */
            .hanime-catalog-component .scroll__body.items-cards {
                 /* Lampa's standard class for horizontal card lists */
                 display: flex; /* Make the scroll body a flex container */
                 flex-direction: row; /* Arrange items horizontally */
                 flex-wrap: nowrap; /* Prevent wrapping */
                 align-items: flex-start; /* Align items to the top */
                 padding: 0 2em; /* Add horizontal padding */
                 box-sizing: border-box; /* Include padding in element's total width */
            }

            /* Style adjustments for Lampa.Card within this horizontal list */
            .hanime-catalog-component .card.card--category {
                /* Inherits basic card styles, adjust spacing */
                margin: 0 0.5em; /* Add horizontal margin between cards */
                flex-shrink: 0; /* Prevent cards from shrinking */
                /* Ensure card width is consistent */
                width: 185px; /* Standard card width */
                box-sizing: border-box;
            }

             .hanime-catalog-component .card.card--category:first-child {
                 margin-left: 0; /* Remove left margin for the first card */
             }
              .hanime-catalog-component .card.card--category:last-child {
                 margin-right: 0; /* Remove right margin for the last card */
             }

            /* Ensure card content fits */
            .hanime-catalog-component .card__view {
                /* Card view already has aspect ratio, ensure it fits */
                height: 270px; /* Standard card height */
            }

             /* Focus styles for selectable elements (cards in this case) */
             .hanime-catalog-component .selector:focus {
                 /* Apply Lampa's default focus style or customize */
                 transform: scale(1.05);
                 box-shadow: 0 0 15px rgba(255, 0, 0, 0.7); /* Example custom shadow */
                 z-index: 5;
                 outline: 3px solid rgba(255, 255, 255, 0.5); /* Example custom outline */
             }
             /* Remove default focus outline on non-native focus */
             .hanime-catalog-component .selector.focus:not(.native) {
                 outline: none;
             }


             .hanime-catalog-component .card__title {
                 /* Adjust title styling if needed */
                 text-align: center;
                 padding: 0 0.5em;
                 margin-top: 0.5em;
                 font-weight: bold;
                 white-space: nowrap;
                 overflow: hidden;
                 text-overflow: ellipsis;
             }

            /* Style for the menu icon */
            .menu__ico svg {
                  width: 1.5em;
                  height: 1.5em;
            }

             /* Style for the empty state */
             .hanime-catalog-component .empty {
                 /* Center empty state content within the body */
                 display: flex;
                 justify-content: center;
                 align-items: center;
                 height: 100%; /* Take full height of the body */
             }
        `;
        // Append the style element to the head
        $('head').append($('<style>').html(style));

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
            // Use .eq(0) to get the first list
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
