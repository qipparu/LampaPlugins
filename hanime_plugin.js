/**
 * Lampa Plugin: Hanime Catalog
 * Description: Displays anime cards fetched from the Hanime Stremio API and injects streams into the full card view.
 * Version: 1.2 (Added stream injection into Lampa's full card)
 */

(function () {
    'use strict';

    // Prevent plugin from running multiple times
    if (window.plugin_hanime_catalog_ready) {
        return;
    }

    window.plugin_hanime_catalog_ready = true;

    // Define the base API URL for the Stremio add-on
    // NOTE: This URL is hardcoded based on your example. If the add-on domain changes, this needs updating.
    const API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club"; // Replace with the actual API URL if it changes

    // Catalog endpoint (for listing items)
    const CATALOG_URL = `${API_BASE_URL}/catalog/movie/newset.json`;

    // Metadata endpoint (for full card details)
    const META_URL_TEMPLATE = `${API_BASE_URL}/meta/movie/{id}.json`;

    // Stream endpoint (for playback streams)
    const STREAM_URL_TEMPLATE = `${API_BASE_URL}/stream/movie/{id}.json`;

    /**
     * Card Component for Hanime Item in the catalog view
     * @param {object} data - Anime metadata object from the API (from the 'metas' array)
     */
    function HanimeCard(data) {
        // Use Lampa's template system to create the card HTML
        var cardTemplate = Lampa.Template.get('hanime-card', {
            id: data.id,
            img: data.poster,
            title: data.name,
            // Add genre as tooltip or perhaps badge if needed
            // description: data.description ? data.description.substring(0, 150) + '...' : 'No description available.' // Not needed for the card itself
        });

        var cardElement = $(cardTemplate);

        // Lazy load image using Lampa's built-in lazy loader
        Lampa.WEEE.watchingLazy(cardElement, function(image) {
             image.attr('src', Lampa.Utils.protocol() + image.data('src').replace('https://', '').replace('http://', ''));
             image.onload = function() {
                $(this).addClass('ready');
             };
        });


        this.render = function () {
            return cardElement;
        };

        this.destroy = function () {
            cardElement.remove();
        };
    }

    /**
     * Main Component for Displaying Hanime Catalog
     * Manages fetching the list and displaying cards.
     * @param {object} componentObject - Lampa component configuration object passed by Lampa
     */
    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        // Scroll component for handling navigation and infinite scrolling
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = []; // Array to hold HanimeCard instances
        var html = $('<div class="hanime-catalog"></div>'); // Main container element
        // Body element where cards are appended
        var body = $('<div class="hanime-catalog__body category-full"></div>');
        var active = 0; // Index of the currently focused item
        var last; // Last focused DOM element

        // We won't use pagination from the Stremio endpoint as it provides a fixed list ('newset.json')
        // but keeping the structure similar to other Lampa components is good practice.
        // In a real scenario with paginated API, you'd use componentObject.page and implement scroll.onEnd

        /**
         * Fetches catalog data from the API
         */
        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true); // Show Lampa's loader

            network.clear(); // Cancel any previous requests

            // Fetch the main catalog list
            network.native(CATALOG_URL,
                function (data) {
                    if (data && data.metas && Array.isArray(data.metas)) {
                        // API returns data in { metas: [...] } structure
                        _this.build(data.metas);
                    } else {
                        _this.empty("Invalid data format received from catalog API.");
                        console.error("Hanime Plugin: Invalid catalog data format", data);
                    }
                },
                function (errorStatus, errorText) {
                    _this.empty("Failed to load catalog. Status: " + errorStatus);
                    console.error("Hanime Plugin: Failed to load catalog", errorStatus, errorText);
                },
                false, // is_json flag (native handles JSON parsing automatically with dataType: 'json')
                {
                    dataType: 'json', // Expect JSON response
                    timeout: 15000 // Set a timeout for the request
                }
            );
        };

        /**
         * Builds the UI with fetched data
         * @param {Array<object>} result - Array of anime metadata objects (from the 'metas' array)
         */
        this.build = function (result) {
            var _this = this;

            // Clear previous items if any (e.g., on filter change or refresh) - Not needed for fixed catalog
            // items.forEach(item => item.destroy());
            // items = [];
            // body.empty();

            // Minus scroll offset initially
            scroll.minus();

            // Bind infinite scroll - not applicable for fixed 'newset' catalog
            // scroll.onEnd = () => { ... fetch next page ... }

            result.forEach(function (meta) { // Iterate through each meta object in the array
                var card = new HanimeCard(meta); // Create a new Card component instance for this item
                var cardElement = card.render(); // Get the rendered DOM element for the card

                // Bind Lampa's hover and enter events
                cardElement.on('hover:focus', function () {
                    last = cardElement[0]; // Keep track of the last focused element for controller binding
                    active = items.indexOf(card); // Keep track of the index
                    scroll.update(cardElement, true); // Update the scroll position to keep the focused item visible
                }).on('hover:enter', function () {
                    // When a card is selected, push Lampa's built-in 'full' component activity.
                    // Lampa's 'full' component is designed to display details and handle playback.
                    // We will pass the necessary data for the 'full' component to work.

                    // We don't fetch meta data *here* on click. We pass the basic info from the catalog
                    // and let the 'full' component trigger its own data fetching based on the ID and type.
                    // Our stream injection listener will handle providing the *streams* later.

                    // Prepare the 'card' object for Lampa's 'full' component.
                    // Lampa's 'full' component expects certain field names (like title, name, poster_path, overview).
                    // We map our API fields to what Lampa expects.
                    var cardDataForLampa = {
                        id: meta.id,                 // Use Hanime ID - Crucial for fetching meta/stream data later
                        name: meta.name,             // Use Hanime name for primary title
                        title: meta.name,            // Also set title (often used in UI)
                        poster_path: meta.poster,    // Use Hanime poster URL (Lampa usually expects poster_path)
                        poster: meta.poster,         // Pass poster URL directly too (sometimes used)
                        background: meta.background, // Use Hanime background if available (for fullscreen background)
                        overview: meta.description,  // Use Hanime description
                        genre_ids: [],               // Lampa links genre_ids to its internal genre list (TMDB IDs).
                                                     // We only have genre names (strings), so passing an empty array is safer than strings.
                                                     // We *could* try mapping names to known Lampa genre IDs if we had a map, but it's complex.
                        genres: meta.genre ? meta.genre.map(g => ({ name: g })) : [], // Format genre strings into objects {name: "genre"}
                        // Add other fields if available and potentially recognized by 'full'
                        // e.g., type: meta.type (should be 'movie'), etc.
                        type: meta.type, // Pass the type ('movie' in this case)
                        // Add a custom flag to identify this item comes from our plugin later in the listener
                        isHanimePluginItem: true
                    };

                    console.log("Hanime Plugin: Opening full card for:", meta.id, meta.name);
                    // Push the 'full' component activity with the prepared data
                    Lampa.Activity.push({
                        url: '', // Not needed when specifying component and card data
                        title: meta.name, // Set the title for the activity stack header
                        component: 'full', // Use Lampa's built-in full card component
                        id: meta.id, // Pass our item ID
                        method: meta.type || 'movie', // Pass the item type ('movie')
                        card: cardDataForLampa // Pass the prepared metadata object
                        // Lampa's 'full' component will use this 'card' object to display details
                        // and attempt to fetch streams based on 'id' and 'method'.
                        // Our Listener will override/inject streams later.
                    });
                });

                body.append(cardElement); // Append the card element to the body container
                items.push(card); // Add the Card instance to our items array
            });

            // Append scroll container to the main HTML element
            scroll.append(body);
            html.append(scroll.render(true));

            _this.activity.loader(false); // Hide loader
            _this.activity.toggle(); // Show the activity/component

             // Trigger lazy loading for initial visible images
             Lampa.WEEE.init(); // Initialize WEEE lazy loader if not already

        };

        /**
         * Handles empty results or errors during catalog fetch
         * @param {string} msg - Message to display in the empty state
         */
        this.empty = function (msg) {
            var empty = new Lampa.Empty({ message: msg });
            html.empty().append(empty.render(true)); // Replace content with empty state
            this.activity.loader(false); // Hide loader
            this.activity.toggle(); // Show the activity/component
            this.start = empty.start; // Make the 'Empty' component focusable if needed
        };

        // --- Lampa Activity Lifecycle Methods ---

        /**
         * Called when the component is created and added to the stack
         */
        this.create = function () {
            console.log('Hanime Plugin: Component created', componentObject);
            this.fetchCatalog(); // Start fetching data immediately
        };

        /**
         * Called when the component becomes the active one
         */
        this.start = function () {
            console.log('Hanime Plugin: Component started');
             // Ensure this component is the active one before adding controller
            if (Lampa.Activity.active().activity !== this.activity) {
                return;
            }

            // Set up controller bindings for navigation within the catalog grid
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render()); // Set the scroll container as the collection for navigation
                    Lampa.Controller.collectionFocus(last || false, scroll.render()); // Focus the last focused item or the first if none
                },
                left: function () {
                    // Move left in the grid, or toggle menu if at the leftmost edge
                    if (Navigator.canmove('left')) {
                        Navigator.move('left');
                    } else {
                        Lampa.Controller.toggle('menu');
                    }
                },
                right: function () {
                    // Move right in the grid
                    Navigator.move('right');
                },
                up: function () {
                    // Move up in the grid, or toggle head (header/filters) if at the top
                     if (Navigator.canmove('up')) {
                         Navigator.move('up');
                     } else {
                         Lampa.Controller.toggle('head');
                     }
                },
                down: function () {
                    // Move down in the grid
                    Navigator.move('down');
                },
                back: this.back // Bind the back action
            });
            Lampa.Controller.toggle('content'); // Activate this controller mode
        };

        /**
         * Called when another component is pushed on top
         */
        this.pause = function () {
             console.log('Hanime Plugin: Component paused');
             // Lampa automatically saves the focus position, so nothing specific needed here
        };

        /**
         * Called when the component is removed from the stack
         */
        this.stop = function () {
             console.log('Hanime Plugin: Component stopped');
             // Cleanup handled in destroy
        };

        /**
         * Renders the component's main HTML element
         * @param {boolean} js - Return raw JavaScript element if true, jQuery object otherwise
         * @returns {HTMLElement|jQuery}
         */
        this.render = function (js) {
            return js ? html[0] : html;
        };

        /**
         * Destroys the component and cleans up resources
         */
        this.destroy = function () {
             console.log('Hanime Plugin: Component destroyed');
            network.clear(); // Cancel any ongoing network requests
            if (items) {
                 Lampa.Arrays.destroy(items); // Destroy card components
            }
            if (scroll) {
                scroll.destroy(); // Destroy scroll component
            }
            if (html) {
                 html.remove(); // Remove main DOM element
            }
            // Dereference everything
            items = null;
            network = null;
            scroll = null;
            html = null;
            body = null;
            active = 0;
            last = null;
        };

        /**
         * Handles the back action
         */
        this.back = function () {
            console.log('Hanime Plugin: Back action');
            Lampa.Activity.backward(); // Go back to the previous activity
        };
    }

    // --- Stream Injection Listener ---
    // Listen for events from Lampa's built-in 'full' component

    Lampa.Listener.follow('full', function (e) {
        // Check if the event type is 'complite', which means the 'full' card has loaded its initial data
        // and check if this item originated from our plugin using the custom flag
        if (e.type === 'complite' && e.object && e.object.card && e.object.card.isHanimePluginItem) {
            console.log('Hanime Plugin: full:complite event captured for our item', e.object.card);

            const hanimeId = e.object.id; // Get the Hanime ID passed when pushing the activity

            if (!hanimeId) {
                 console.warn('Hanime Plugin: No ID found in full card object.');
                 Lampa.Noty.show('Hanime Plugin: Cannot load streams - Missing ID.');
                 return;
            }

            // Construct the URL for fetching streams using the item ID
            const streamUrl = STREAM_URL_TEMPLATE.replace('{id}', hanimeId);
            console.log('Hanime Plugin: Fetching streams from:', streamUrl);

            // Fetch the stream data using Lampa's network request
            Lampa.Reguest.native(streamUrl,
                function (streamData) {
                    console.log('Hanime Plugin: Stream data received', streamData);
                    if (streamData && streamData.streams && Array.isArray(streamData.streams)) {
                        // Stremio API provides streams in { streams: [...] } structure
                        console.log('Hanime Plugin: Found', streamData.streams.length, 'streams.');

                        // Inject the fetched streams into the 'full' component's sources
                        // The 'full' component expects sources in e.object.sources
                        e.object.sources = streamData.streams;

                        // Tell the 'full' component to rebuild its sources list UI
                        if (typeof e.object.buildSources === 'function') {
                            e.object.buildSources();
                             console.log('Hanime Plugin: Streams injected and UI built.');
                        } else {
                             console.warn('Hanime Plugin: buildSources method not found on full component.');
                             Lampa.Noty.show('Hanime Plugin: Streams loaded, but cannot update UI.');
                        }

                        // Optional: Show a success message
                        // Lampa.Noty.show('Hanime Plugin: Streams loaded successfully.');

                    } else {
                        console.warn('Hanime Plugin: Invalid stream data format or no streams found.', streamData);
                        Lampa.Noty.show('Hanime Plugin: No streams found for this item.');

                        // Clear sources if invalid data received to prevent issues
                         e.object.sources = [];
                         if (typeof e.object.buildSources === 'function') {
                              e.object.buildSources();
                         }
                    }
                },
                function (errorStatus, errorText) {
                    console.error('Hanime Plugin: Failed to fetch stream data', errorStatus, errorText);
                    Lampa.Noty.show(`Hanime Plugin: Failed to load streams. Status: ${errorStatus}`);

                    // Clear sources on error
                    e.object.sources = [];
                     if (typeof e.object.buildSources === 'function') {
                          e.object.buildSources();
                     }
                },
                 false, // is_json
                {
                    dataType: 'json',
                    timeout: 15000
                }
            );

             // --- Fetch Full Metadata (Optional but good practice) ---
             // While we passed basic 'card' data, fetching the full metadata
             // from the /meta endpoint might provide more details for the full card view
             // that weren't available in the catalog list.

             const metaUrl = META_URL_TEMPLATE.replace('{id}', hanimeId);
             console.log('Hanime Plugin: Fetching full metadata from:', metaUrl);

             Lampa.Reguest.native(metaUrl,
                 function(metaResponse) {
                     console.log('Hanime Plugin: Full metadata received', metaResponse);
                     if (metaResponse && metaResponse.meta) {
                         // Update the full card object with more complete metadata
                         // Only update fields that are likely to be used and might be better
                         // in the meta endpoint than the catalog endpoint.
                         // Avoid overwriting our custom flag.
                         const updatedCardData = {
                             ...e.object.card, // Keep existing data and our flag
                             ...metaResponse.meta, // Overwrite/add fields from meta response
                             // Ensure genre is still formatted correctly for Lampa
                             genres: metaResponse.meta.genre ? metaResponse.meta.genre.map(g => ({ name: g })) : e.object.card.genres,
                         };

                         e.object.card = updatedCardData; // Update the card data in the full component instance

                         // Lampa's full component might need a method call to re-render its details based on the updated card object.
                         // There isn't one standard public method for this. It often happens implicitly or on init.
                         // For now, let's hope updating e.object.card is enough or that the structure already loaded is sufficient.
                         // If necessary, one might need to manually update specific DOM elements in the full card view,
                         // but that's more fragile as Lampa's internal DOM structure might change.
                         console.log('Hanime Plugin: Full metadata updated on card object.');

                     } else {
                         console.warn('Hanime Plugin: Invalid metadata format from meta API.', metaResponse);
                     }
                 },
                 function(errorStatus, errorText) {
                      console.error('Hanime Plugin: Failed to fetch full metadata', errorStatus, errorText);
                     // Failure to fetch full meta is not critical, as we already have basic info from the catalog
                 },
                 false, // is_json
                 {
                     dataType: 'json',
                     timeout: 15000
                 }
             );
        }
    });


    // --- Plugin Initialization ---

    /**
     * Adds the plugin's menu item.
     */
    function addMenuItem() {
        var menu_item = $(`
            <li class="menu__item selector">
                <div class="menu__ico">
                   <!-- Using a simple icon, replace with a custom one if you have it -->
                   <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" /></svg>
                </div>
                <div class="menu__text">Hanime Catalog</div>
            </li>
        `);

        // Bind the click event to push the new component activity
        menu_item.on('hover:enter', function () {
            Lampa.Activity.push({
                url: '', // Not strictly needed here, but common pattern
                title: 'Hanime Catalog', // Title for the activity header
                component: 'hanime_catalog', // The name of our custom component
                page: 1 // Starting page (ignored by this specific API, but good practice)
            });
        });

        // Append the menu item to the main menu list
        // Use a check as the element might not exist immediately
        var menuList = $('.menu .menu__list').eq(0);
        if (menuList.length) {
            menuList.append(menu_item);
            console.log('Hanime Plugin: Menu item added.');
        } else {
            console.error("Hanime Plugin: Could not find Lampa menu list to append item.");
        }
    }

    /**
     * Starts the plugin: adds styles, templates, component, and menu item.
     */
    function startPlugin() {
        console.log('Hanime Plugin: Starting...');

        // Add custom styles
        const style = `
            .hanime-catalog__body.category-full {
                /* Lampa's default category-full is flex column.
                   We need flex wrap for a grid-like layout.
                   Adjust justify-content based on desired spacing. */
                display: flex;
                flex-wrap: wrap;
                /* Example justify options: */
                /* justify-content: space-between; */ /* Spreads items out */
                /* justify-content: flex-start;   */ /* Aligns items to the start */
                justify-content: center;       /* Centers items */
                padding: 1em 0; /* Add some vertical padding */
            }
            .hanime-card {
                width: 185px; /* Standard card width */
                margin: 0.5em 10px; /* Vertical and horizontal spacing */
                /* Adjust margin as needed */
            }
            .hanime-card__view {
                position: relative;
                height: 270px; /* Standard poster aspect ratio height */
                background-color: rgba(255,255,255,0.05);
                border-radius: 0.3em;
                overflow: hidden; /* Hide overflowing image parts */
            }
            .hanime-card__img {
                 position: absolute;
                 width: 100%;
                 height: 100%;
                 object-fit: cover; /* Ensure image covers the container without distortion */
                 /* Optional: transition for lazy loading effect */
                 opacity: 0;
                 transition: opacity 0.3s ease;
            }
             .hanime-card__img.ready {
                 opacity: 1;
             }
             /* Styles for the title below the poster */
             .hanime-card__title {
                 margin-top: 0.5em;
                 font-size: 0.9em;
                 text-align: center; /* Center the title text */
                 white-space: nowrap; /* Prevent wrapping */
                 overflow: hidden; /* Hide overflowing text */
                 text-overflow: ellipsis; /* Show ellipsis for overflow */
            }
            /* Optional: Add a focus effect */
            .hanime-card.selector.focus .hanime-card__view {
                outline: 3px solid var(--lampa-color-focus); /* Or use box-shadow */
                 outline-offset: 2px;
            }
        `;
        Lampa.Template.add('hanime-style', `<style>${style}</style>`);

        // Add custom HTML template for a single card item
        Lampa.Template.add('hanime-card', `
            <div class="hanime-card card selector layer--visible layer--render">
                <div class="hanime-card__view">
                    <!-- Use data-src for lazy loading -->
                    <img data-src="{img}" src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="hanime-card__img lazy" alt="{title}" />
                </div>
                <div class="hanime-card__title">{title}</div>
            </div>
        `);

        // Register our custom component with Lampa
        Lampa.Component.add('hanime_catalog', HanimeComponent);

        // Add the menu item. Use Lampa's appready listener if app isn't ready yet.
        if (window.appready) {
            addMenuItem();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') {
                    addMenuItem();
                }
            });
        }

        // Append styles to the body
        $('body').append(Lampa.Template.get('hanime-style', {}, true));

         console.log('Hanime Plugin: Initialization complete.');
    }

    // Start the plugin initialization process
    startPlugin();

})();
