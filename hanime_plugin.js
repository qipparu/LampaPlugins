(function () {
    'use strict';

    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = []; // Array of Lampa.Card instances
        var html = $('<div class="hanime-catalog"></div>'); // Main component container
        var body = $('<div class="hanime-catalog__body category-full"></div>'); // Container for cards inside scroll
        var active = 0; // Index of the currently focused card in the items array
        var lastFocusedElement = null; // Reference to the DOM element of the last focused card
        var _catalog_loaded = false; // Flag to prevent multiple catalog loads

        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json";
        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";

        var PROXY_BASE_URL = "http://77.91.78.5:3000";

        this.activity = componentObject; // Reference to the Lampa Activity

        console.log('Hanime Plugin: Component initialized', this.activity);

        this.fetchCatalog = function () {
            console.log('Hanime Plugin: Fetching catalog from', CATALOG_URL);
            this.activity.loader(true);

            network.clear(); // Clear previous requests
            network.native(CATALOG_URL,
                (data) => {
                    console.log('Hanime Plugin: Catalog data received', data);
                    if (data && data.metas && Array.isArray(data.metas)) {
                         if (data.metas.length > 0) {
                             console.log('Hanime Plugin: Building catalog with', data.metas.length, 'items');
                            this.build(data.metas); // Build UI with received data
                         } else {
                            console.log('Hanime Plugin: Catalog is empty');
                            this.empty("Каталог пуст.");
                         }
                    } else {
                        console.error("Hanime Plugin: Invalid data format received", data);
                        this.empty("Неверный формат данных от API.");
                    }
                },
                (errorStatus, errorText) => {
                    console.error("Hanime Plugin: Failed to load catalog", errorStatus, errorText);
                    this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                },
                false, // No JSON parse needed if dataType is 'json'
                {
                    dataType: 'json',
                    timeout: 20000 // Increased timeout
                }
            );
        };

        this.appendCard = function(meta) {
            // Create CardData mapping required fields for Lampa.Card
            const cardData = {
                id: meta.id,
                title: meta.name || meta.title || 'Без названия',
                poster: meta.poster,
                // Add other potential fields if available and useful for display/history
                // year: meta.year,
                // runtime: meta.runtime,
                source: 'hanime',
                // card_wide, card_small etc. can be passed as second argument to Card constructor
                // but standard card size works fine here.
            };

            const card = new Lampa.Card(cardData);

            // Create the card's DOM element
            card.create();

            // Attach event handlers directly to the Card instance
            card.onFocus = (target, data) => {
                // Lampa.Card.onFocus passes the card's DOM element and the card's data
                lastFocusedElement = target; // Store the element that received focus
                active = items.indexOf(card); // Update the active index

                // Update scroll position to show the focused card
                 scroll.update(target); // scroll.update works directly with the focused element

                 // Change background if poster is available
                 if (data.poster) {
                     Lampa.Background.change(Lampa.Utils.cardImgBackground(data));
                 } else {
                     Lampa.Background.change(''); // Clear background if no poster
                 }
                 console.log('Hanime Plugin: Card focused', data.title);
            };

            card.onEnter = (target, data) => {
                // Lampa.Card.onEnter passes the card's DOM element and the card's data
                lastFocusedElement = target; // Store the element that was activated
                console.log("Hanime Plugin: Card entered", data.title, data.id);
                // Fetch stream and meta data when a card is selected
                this.fetchStreamAndMeta(data.id, data);
            };

             // onHover is optional, but good practice
            card.onHover = (target, data) => {
                 // Background change is typically handled in onFocus, but can also be done here for hover preview
                 // if (data.poster) Lampa.Background.change(Lampa.Utils.cardImgBackground(data));
            };


            // Append the card's DOM element to the scroll body
            body.append(card.render(true)); // render(true) returns jQuery object, [0] gets the DOM element if needed elsewhere

            // Add the Card instance to our items array
            items.push(card);

            return card;
        };

        this.build = function (metas) {
            console.log('Hanime Plugin: Building UI');
            // Clear previous items and DOM elements
            Lampa.Arrays.destroy(items); // Destroy previous card instances
            items = []; // Reset items array
            body.empty(); // Clear body element

            // Configure scroll events
            scroll.minus(); // Adjust scroll size
            // scroll.onEnd = this.next.bind(this); // For future pagination
            // scroll.onScroll = this.limit.bind(this); // Can link limit to scroll for dynamic rendering

            // Add wheel handler for basic UP/DOWN navigation
            scroll.onWheel = (step) => {
                if (!Lampa.Controller.own(this)) this.start(); // Gain control if not owned
                if (step > 0) Lampa.Navigator.move('down');
                else Lampa.Navigator.move('up');
            };

            // Append all cards to the body and items array
            metas.forEach(this.appendCard.bind(this));

            // Append body to scroll and scroll to component html
            scroll.append(body);
            html.append(scroll.render(true));

            // Do NOT call limit() or focusFirst() here in build.
            // These will be called by the component's controller toggle method
            // when the component becomes active.

            this.activity.loader(false); // Hide loader
            this.activity.toggle(); // This activates the component and triggers its 'start' -> 'toggle' flow
            console.log('Hanime Plugin: UI Built, loader off, toggling activity');
        };

        // Controls which cards are 'layer--render' and sets the Navigator collection
        this.limit = function() {
            // console.log('Hanime Plugin: Running limit');
            let limit_view = 20; // More elements visible with layer--render for smoother scroll
            let limit_collection = 60; // Keep a larger collection for smoother navigation wrap-around

            // Ensure active index is valid
            active = Math.max(0, Math.min(active, items.length - 1));

            // Calculate indices for rendering (layer--render) and navigation collection
            let render_start = Math.max(0, active - Math.floor(limit_view / 2));
            let render_end = render_start + limit_view;

            let collection_start = Math.max(0, active - Math.floor(limit_collection / 2));
            let collection_end = collection_start + limit_collection;

            let collection_elements = []; // Array to hold DOM elements for Navigator

            items.forEach((item, index) => {
                 // Get the DOM element from the Card instance's render method
                 const element = item && typeof item.render === 'function' ? item.render(true) : null; // Get jQuery object
                 const domElement = element ? element[0] : null; // Get raw DOM element

                if (domElement) { // Ensure we have a valid DOM element
                    // Manage layer--render class
                    if (index >= render_start && index < render_end) {
                        domElement.classList.add('layer--render');
                    } else {
                        domElement.classList.remove('layer--render');
                    }

                    // Add element to the collection for Navigator if within range
                     if (index >= collection_start && index < collection_end) {
                         collection_elements.push(domElement);
                     }
                } else {
                    // Log a warning if an item or its DOM element is invalid
                     console.warn("Hanime Plugin: limit found invalid item or element at index", index, item);
                }
            });

            // Set the collection of DOM elements for Lampa.Navigator
            Lampa.Navigator.setCollection(collection_elements);

            // Note: Restoring focus after setCollection is often handled by Navigator,
            // but focusFirst() or Controller.collectionFocus ensures it.
        };

        // Focuses on the first element in the items array if available
         this.focusFirst = function(){
             console.log('Hanime Plugin: Focusing first element');
             if(items.length > 0){
                 // Find the DOM element for the first card
                 const firstCard = items[0];
                 const firstElement = firstCard.render(true)[0];

                 if(firstElement){
                     lastFocusedElement = firstElement; // Set initial last focused
                     active = 0; // Set active index
                     // Use Controller.collectionFocus to set focus within the current collection
                     Lampa.Controller.collectionFocus(lastFocusedElement, scroll.render(true));

                     // Manually trigger onFocus for the first card to update scroll/background
                     if (firstCard.onFocus) {
                         firstCard.onFocus(lastFocusedElement, firstCard.data); // Pass element and data
                     }
                 } else {
                      console.warn('Hanime Plugin: First element DOM not found');
                 }
             } else {
                 console.log('Hanime Plugin: No items to focus on');
                 // If no items, maybe redirect focus elsewhere or do nothing
                 // Empty state should handle its own focus
             }
         }


        this.fetchStreamAndMeta = function (id, meta) {
            console.log('Hanime Plugin: Fetching stream and meta for', id);
            this.activity.loader(true);

            const streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            const metaUrl = META_URL_TEMPLATE.replace('{id}', id);

            // Fetch streams. If we already have detailed meta (e.g., from build data),
            // use it, otherwise fetch full meta data.
            const metaPromise = (meta && meta.title && meta.poster) // Simple check if meta is likely complete from catalog
                 ? Promise.resolve({ meta: meta }) // Use existing meta if it seems sufficient
                 : new Promise((resolve, reject) => { // Otherwise, fetch full meta
                     console.log('Hanime Plugin: Fetching full meta from', metaUrl);
                      network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                  });


            Promise.all([
                new Promise((resolve, reject) => {
                    console.log('Hanime Plugin: Fetching streams from', streamUrl);
                    network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                }),
                metaPromise

            ]).then(([streamData, metaDataResponse]) => {
                console.log('Hanime Plugin: Stream and meta data received');
                this.activity.loader(false);

                // Prioritize meta data from the explicit meta request if available and has 'meta' field,
                // otherwise use the meta data that was potentially passed directly (from the card)
                const fullMetaData = metaDataResponse.meta || meta;

                console.log("Hanime Plugin: Stream Data:", streamData);
                console.log("Hanime Plugin: Full Meta Data:", fullMetaData);

                if (streamData && streamData.streams && streamData.streams.length > 0) {
                    // Find the best quality stream (e.g., 1080p, 720p, then first)
                    var streamToPlay = streamData.streams.find(s => s.quality && s.quality.includes('1080')) ||
                                       streamData.streams.find(s => s.quality && s.quality.includes('720')) ||
                                       streamData.streams[0]; // Fallback to first stream


                    // --- Apply CORS Proxy to stream URL ---
                    var finalStreamUrl = streamToPlay.url;

                    try {
                         var url = new URL(finalStreamUrl);
                         // Check against known CORS-problematic CDNs
                         if (url.hostname.includes('highwinds-cdn.com') || url.hostname.includes('akamaihd.net') || url.hostname.includes('wpc.video')) { // Added another potential CDN
                             finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                             console.log("Hanime Plugin: Original stream URL proxied:", finalStreamUrl);
                         } else {
                              console.log("Hanime Plugin: Stream URL does not need proxy:", finalStreamUrl);
                         }
                    } catch (e) {
                        console.error("Hanime Plugin: Failed to parse or proxy stream URL", finalStreamUrl, e);
                        // Continue with original URL if parsing failed
                    }
                    // -----------------------------------

                    // Prepare player object
                    const playerObject = {
                        title: fullMetaData.name || fullMetaData.title || 'Без названия',
                        url: finalStreamUrl, // Use the potentially proxied URL
                        poster: fullMetaData.poster || fullMetaData.background, // Use background if poster is missing
                        // Add other relevant info for history/player UI
                        id: fullMetaData.id,
                        year: fullMetaData.year, // If available
                        runtime: fullMetaData.runtime, // If available
                        // Add seasons/episodes if this API provided them (unlikely for movie type)
                    };

                    if (playerObject.url) {
                         console.log("Hanime Plugin: Launching player with:", playerObject);
                         Lampa.Player.play(playerObject);
                         Lampa.Player.playlist([playerObject]); // Create a playlist with the single item

                         // Add to history
                         if (fullMetaData && fullMetaData.id) {
                                const historyMeta = {
                                    id: fullMetaData.id,
                                    title: fullMetaData.name || fullMetaData.title,
                                    poster: fullMetaData.poster || fullMetaData.background,
                                    runtime: fullMetaData.runtime,
                                    year: fullMetaData.year,
                                    original_name: fullMetaData.original_name // If available
                                };
                                Lampa.Favorite.add('history', historyMeta); // Lampa manages limit internally
                         }

                    } else {
                         console.error("Hanime Plugin: Player URL is empty.");
                         Lampa.Noty.show('Не удалось получить ссылку на поток.');
                    }

                } else {
                     console.warn("Hanime Plugin: No streams found or invalid stream data structure:", streamData);
                     Lampa.Noty.show('Потоки не найдены для этого аниме.');
                }

            }).catch(error => {
                console.error("Hanime Plugin: Failed to fetch stream/meta details", error);
                this.activity.loader(false);
                Lampa.Noty.show('Ошибка загрузки деталей: ' + (error && error.message ? error.message : 'Неизвестная ошибка'));
            });
        };

        this.empty = function (msg) {
            console.log('Hanime Plugin: Showing empty state:', msg);
            const empty = new Lampa.Empty({ message: msg });
            html.empty().append(empty.render(true)); // Use empty().append to replace content
            this.activity.loader(false);
            // Empty component manages its own controller and focus
            empty.start();
            // Overwrite component's start method while empty is active
            this.start = empty.start;
             // Keep track that we are in an empty state (optional)
            this._is_empty = true;
        };

        this.create = function () {
             console.log('Hanime Plugin: Component create');
             // Initial setup, fetchCatalog happens in start()
        };

        // Method called when the component gains focus/control
        this.start = function () {
            // Check if this component instance is the currently active Lampa Activity
            if (Lampa.Activity.active().activity !== this.activity && !this._is_empty) {
                 console.log("Hanime Plugin: Start called but not active activity, skipping or reactivating.");
                 // If we are not the active activity (e.g. returning from player),
                 // simply activate our controller state.
                 Lampa.Controller.toggle('content');
                 return; // Exit start, the toggle method will handle focus restore
             }

             console.log('Hanime Plugin: Component start - Active activity');

             // If catalog hasn't been loaded yet, initiate fetch
             if (!this._catalog_loaded) {
                 console.log('Hanime Plugin: Catalog not loaded, fetching...');
                 this._catalog_loaded = true; // Mark as loading
                 this.fetchCatalog(); // This calls build() on success
             } else if (this._is_empty) {
                 // If in empty state, call the empty component's start method
                 console.log('Hanime Plugin: In empty state, calling empty.start()');
                 this.start(); // This calls the empty component's start due to override
             }
             else {
                 // If catalog is loaded (and not empty), add and toggle controller
                 console.log('Hanime Plugin: Catalog loaded, adding controller...');
                 Lampa.Controller.add('content', {
                     link: this, // Link controller to this component instance
                     toggle: function () {
                         console.log('Hanime Plugin: Controller Toggle');
                         // Update collection and visibility based on current active index
                         this.limit();

                         // Restore focus to the last focused element or the first if none/invalid
                         if (lastFocusedElement && Lampa.Navigator.collection().includes(lastFocusedElement)) {
                             console.log('Hanime Plugin: Restoring focus to last element');
                             Lampa.Controller.collectionFocus(lastFocusedElement, scroll.render(true));
                         } else {
                              console.log('Hanime Plugin: Focusing first element after toggle');
                             this.focusFirst(); // Handles focusing the first element
                         }
                     }.bind(this), // Ensure 'this' inside toggle is the component instance
                     // Navigation handlers using Lampa.Navigator
                     left: () => {
                         if (Lampa.Navigator.canmove('left')) Lampa.Navigator.move('left');
                         else Lampa.Controller.toggle('menu'); // Go to menu if left is blocked
                     },
                     right: () => {
                         if (Lampa.Navigator.canmove('right')) Lampa.Navigator.move('right');
                     },
                     up: () => {
                         if (Lampa.Navigator.canmove('up')) Lampa.Navigator.move('up');
                         else Lampa.Controller.toggle('head'); // Go to header if up is blocked
                     },
                     down: () => {
                         if (Lampa.Navigator.canmove('down')) Lampa.Navigator.move('down');
                         // Add next page logic here if using pagination and reached the end of current items
                         // else this.next();
                     },
                     back: this.back.bind(this) // Ensure context for back handler
                 });

                 Lampa.Controller.toggle('content'); // Activate this component's controller state
             }
        };

        this.pause = function () {
             console.log('Hanime Plugin: Component paused');
             // Save the currently focused element before pausing
             lastFocusedElement = Lampa.Navigator.focused();
             // Clear any ongoing network requests that aren't critical (like catalog load)
             // network.clear(); // Be careful, this might stop ongoing stream/meta fetches
        };

        this.stop = function () {
             console.log('Hanime Plugin: Component stopped');
             // Clear network requests and destroy elements when stopped/destroyed
             network.clear();
             // Destroyer handles item/scroll cleanup
        };

        this.render = function (js) {
             // Return the main DOM element or its jQuery wrapper
             return js ? html[0] : html;
        };

        this.destroy = function () {
             console.log('Hanime Plugin: Component destroyed');
             network.clear();
             // Properly destroy card instances, which should also remove their DOM elements
             Lampa.Arrays.destroy(items);
             items = null; // Dereference the array

             // Destroy scroll instance, which removes its DOM element
             scroll.destroy();
             scroll = null; // Dereference

             // Remove the component's main HTML element from the DOM
             if(html) html.remove();
             html = null;
             body = null;
             lastFocusedElement = null;
             this.activity = null; // Dereference activity

             console.log('Hanime Plugin: Component cleanup complete');
        };

        // Handle back button press
        this.back = function () {
            console.log('Hanime Plugin: Back button pressed');
            Lampa.Activity.backward(); // Navigate back using Lampa Activity manager
        };

        // Optional: Add a method to refresh the catalog
        // this.refresh = function(){
        //     console.log('Hanime Plugin: Refreshing catalog');
        //     this._catalog_loaded = false; // Reset flag to force reload
        //     this.fetchCatalog(); // Start the fetch process
        // }
    }

    // --- Plugin Initialization ---
    function startPlugin() {
        // Prevent multiple initializations
        if (window.plugin_hanime_catalog_ready) {
            console.log('Hanime Plugin: Already initialized.');
            return;
        }
        window.plugin_hanime_catalog_ready = true;
        console.log('Hanime Plugin: Starting initialization.');

        // Add custom styles to potentially override standard Lampa styles
        // Styles are designed to work with standard .card class
        var style = `
            /* Container for the cards, uses standard category-full flex layout */
            .hanime-catalog__body.category-full {
                justify-content: flex-start; /* Align items from the start */
                align-items: flex-start; /* Align items to the top */
                padding: 20px 60px; /* Standard padding around content */
                box-sizing: border-box; /* Include padding in element's total width and height */
            }

            /* Style standard Lampa cards (.card) when inside our catalog */
            .hanime-catalog .card {
                 width: 185px; /* Standard card width (e.g., for movies/tv) */
                 margin: 10px; /* Standard margin around cards */
                 /* Standard Lampa styles handle border-radius, overflow, transition, focus state (.selector:focus) */
            }

            /* Ensure card images cover the view area */
            .hanime-catalog .card__img {
                object-fit: cover; /* Make image cover the container */
            }

            /* Optional: Adjust title style if needed, though standard usually works */
            .hanime-catalog .card__title {
                text-align: center; /* Center title text */
            }

            /* Optional: Adjust age/year style if needed */
             .hanime-catalog .card__age {
                 text-align: center; /* Center age text */
             }


            /* Style for the menu icon */
            .menu__ico svg {
                  width: 1.5em;
                  height: 1.5em;
            }
        `;
        Lampa.Template.add('hanime-style', `<style>${style}</style>`);

        // Register the HanimeComponent with Lampa
        Lampa.Component.add('hanime_catalog', HanimeComponent);
        console.log('Hanime Plugin: Component "hanime_catalog" registered.');

        // Function to add the menu item
        function addMenuItem() {
            console.log('Hanime Plugin: Adding menu item.');
            var menu_item = $(`
                <li class="menu__item selector">
                    <div class="menu__ico">
                        <!-- Standard play icon -->
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">${Lampa.Lang.translate('hanime_catalog_title', 'Hanime Catalog')}</div>
                </li>
            `);
            menu_item.on('hover:enter', function () {
                console.log('Hanime Plugin: Menu item clicked, pushing activity.');
                // Push the new component activity onto the stack
                Lampa.Activity.push({
                    title: Lampa.Lang.translate('hanime_catalog_title', 'Hanime Catalog'),
                    component: 'hanime_catalog', // Use the registered component name
                    // Pass any initial data needed by the component constructor
                    // page: 1 // If using pagination
                });
            });
            // Append the menu item to the first menu list (usually the main one)
            $('.menu .menu__list').eq(0).append(menu_item);
            console.log('Hanime Plugin: Menu item added.');
        }

        // Add the styles to the document head
        $('head').append(Lampa.Template.get('hanime-style', {}, true));
         console.log('Hanime Plugin: Styles added.');


        // Add translation key for the menu item title
        Lampa.Lang.add({
             hanime_catalog_title: {
                 ru: 'Каталог Hanime',
                 en: 'Hanime Catalog'
                 // Add other languages as needed
             }
        });
        console.log('Hanime Plugin: Translation added.');


        // Wait for Lampa application to be ready before adding menu item
        if (window.appready) {
             console.log('Hanime Plugin: appready is true, adding menu item now.');
             addMenuItem();
        } else {
             console.log('Hanime Plugin: Waiting for appready event.');
             Lampa.Listener.follow('app', function (e) {
                 if (e.type === 'ready') {
                     console.log('Hanime Plugin: appready event received, adding menu item.');
                     addMenuItem();
                 }
             });
        }
        console.log('Hanime Plugin: Initialization complete.');
    }

    // Execute the plugin initialization
    startPlugin();

})();
