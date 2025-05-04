/**
 * Lampa Plugin: Hanime Catalog
 * Description: Displays anime cards fetched from the Hanime Stremio API,
 * allowing users to browse and potentially view details/streams.
 * Author:      [Your Name/Alias Here - Optional]
 * Version:     1.0.0
 * Lampa Version: Compatible with [Specify Lampa version if known]
 */

(function () {
    'use strict';

    // --- Configuration ---
    const API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
    const CATALOG_ENDPOINT = "/catalog/movie/newset.json";
    const STREAM_ENDPOINT_TPL = "/stream/movie/{id}.json";
    const META_ENDPOINT_TPL = "/meta/movie/{id}.json";

    const COMPONENT_NAME = 'hanime_catalog';
    const CARD_TEMPLATE_NAME = 'hanime_card';
    const STYLE_TEMPLATE_NAME = 'hanime_style';
    const PLUGIN_MENU_TEXT = 'Hanime Catalog';

    // --- Plugin Initialization Flag ---
    // Prevents the plugin from being initialized multiple times
    if (window.plugin_hanime_catalog_initialized) {
        console.log("Hanime Catalog Plugin: Already initialized.");
        return;
    }
    window.plugin_hanime_catalog_initialized = true;

    // --- Plugin Styles ---
    // Define CSS styles for the component and cards
    const pluginStyle = `
        .hanime-catalog__body.category-full {
            display: flex; /* Use flexbox for layout */
            flex-wrap: wrap; /* Allow items to wrap to the next line */
            justify-content: flex-start; /* Align items to the start */
            padding: 1.5em; /* Add some padding around the container */
        }
        /* Style adjustments for card spacing */
        .hanime-catalog__body .hanime-card {
            margin-right: 1.5em; /* Spacing between cards horizontally */
            margin-bottom: 1.5em; /* Spacing between cards vertically */
        }
        /* Ensure last item in a row doesn't have extra margin if justify-content: space-between is used */
        /* .hanime-catalog__body .hanime-card:last-child { margin-right: auto; } */

        .hanime-card {
            display: flex;
            flex-direction: column;
            width: 185px; /* Standard card width */
            height: auto; /* Adjust height based on content */
            cursor: pointer; /* Indicate interactivity */
            transition: transform 0.2s ease; /* Smooth hover effect */
        }
        .hanime-card:hover {
             transform: scale(1.03); /* Slight zoom on hover */
        }
        .hanime-card__view {
            position: relative;
            width: 100%;
            height: 270px; /* Fixed height for the image container */
            background-color: rgba(255, 255, 255, 0.05); /* Dark placeholder */
            border-radius: 0.3em;
            overflow: hidden; /* Clip the image */
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Subtle shadow */
        }
        .hanime-card__img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover; /* Cover the container, cropping if necessary */
            border-radius: 0.3em; /* Match container rounding */
            transition: opacity 0.3s ease; /* Fade in image */
            opacity: 0.9; /* Slightly transparent */
        }
        .hanime-card:hover .hanime-card__img {
             opacity: 1; /* Full opacity on hover */
        }
         /* Style for focused state (Lampa specific) */
         .hanime-card.focus .hanime-card__view {
             outline: 2px solid var(--color-focus, #fff); /* Highlight focused card */
             box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
         }
        .hanime-card__title {
            margin-top: 0.7em;
            font-size: 0.9em;
            font-weight: 500; /* Slightly bolder title */
            color: rgba(255, 255, 255, 0.9); /* Slightly dimmed text */
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis; /* Add '...' for long titles */
            text-align: center; /* Center the title */
            max-width: 100%; /* Prevent overflow */
        }
        /* Optional: Add styles for description if used */
        /* .hanime-card__description {
            font-size: 0.8em;
            color: rgba(255, 255, 255, 0.6);
            margin-top: 0.3em;
            height: 3.6em; // Limit to ~3 lines
            overflow: hidden;
        } */
    `;
    Lampa.Template.add(STYLE_TEMPLATE_NAME, `<style>${pluginStyle}</style>`);

    // --- Card Template ---
    // HTML structure for a single anime card
    Lampa.Template.add(CARD_TEMPLATE_NAME, `
        <div class="hanime-card card selector layer--visible layer--render">
            <div class="hanime-card__view">
                <img data-src="{img}" src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="hanime-card__img" alt="{title}" loading="lazy" />
                </div>
            <div class="hanime-card__title">{title}</div>
            </div>
    `);

    /**
     * Represents a single Anime Card UI element.
     * @param {object} data - Anime metadata (expects id, poster, name, description)
     */
    function HanimeCard(data) {
        this.data = data;
        this.cardElement = null;

        /**
         * Creates and renders the card's HTML element using the template.
         * @returns {jQuery} The jQuery object representing the card element.
         */
        this.render = function () {
            const cardHtml = Lampa.Template.get(CARD_TEMPLATE_NAME, {
                id: this.data.id, //
                img: this.data.poster || '', // Use poster, provide fallback
                title: Lampa.Utils.escapeHtml(this.data.name || 'Untitled'), // Escape title
                // Truncate description nicely
                description: this.data.description
                           ? Lampa.Utils.shortText(this.data.description, 100) // Use Lampa utility
                           : 'No description available.'
            });

            this.cardElement = $(cardHtml);

            // Lazy load image
            const img = this.cardElement.find('.hanime-card__img');
            const imgSrc = img.attr('data-src');
            if (imgSrc) {
                img.on('load', function() { $(this).addClass('loaded'); }); // Optional: add class on load
                img.attr('src', imgSrc); // Set src to start loading
            }

            return this.cardElement;
        };

        /**
         * Cleans up the card element and removes it from the DOM.
         */
        this.destroy = function () {
            if (this.cardElement) {
                this.cardElement.remove();
                this.cardElement = null; // Prevent memory leaks
            }
            this.data = null;
        };
    }

    /**
     * Main Lampa Component for the Hanime Catalog screen.
     * Handles data fetching, UI building, and interactions.
     * @param {object} componentObject - Lampa component configuration object.
     */
    function HanimeComponent(componentObject) {
        let network = new Lampa.Reguest();
        let scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        let items = []; // Holds HanimeCard instances
        let html = $('<div class="hanime-catalog"></div>'); // Main container
        let body = $('<div class="hanime-catalog__body category-full"></div>'); // Grid container
        let activity = this; // Reference to the component instance for callbacks
        let lastFocusedElement; // Keep track of the last focused DOM element

        /**
         * Fetches the main catalog data from the Hanime API.
         */
        function fetchCatalogData() {
            activity.activity.loader(true); // Show loading indicator

            const url = API_BASE_URL + CATALOG_ENDPOINT;
            network.clear(); // Cancel previous requests
            network.native(url,
                function (data) {
                    // Validate API response structure
                    if (data && data.metas && Array.isArray(data.metas)) {
                        if (data.metas.length > 0) {
                            buildUI(data.metas); // Build cards if data is valid
                        } else {
                             displayEmptyMessage("The catalog is currently empty.");
                        }
                    } else {
                         displayEmptyMessage("Received invalid data format from the API.");
                        console.error("Hanime Plugin: Invalid data format received:", data);
                    }
                     activity.activity.loader(false); // Hide loader regardless of outcome
                },
                function (jqXHR, textStatus, errorThrown) {
                    const errorMsg = `Failed to load catalog. Status: ${jqXHR.status} - ${errorThrown || textStatus}`;
                     displayEmptyMessage(errorMsg);
                    console.error("Hanime Plugin: Catalog fetch error -", errorMsg, jqXHR);
                     activity.activity.loader(false); // Hide loader on error
                },
                false, // No custom headers needed
                { // Request options
                    dataType: 'json',
                    timeout: 20000 // 20 seconds timeout
                }
            );
        }

        /**
         * Fetches Stream and Metadata details for a specific anime ID.
         * @param {string} id - The unique ID of the anime item.
         */
        function fetchStreamAndMeta(id) {
            if (!id) {
                console.error("Hanime Plugin: Invalid ID provided for fetching details.");
                Lampa.Noty.show('Cannot fetch details: Invalid ID.', { type: 'error' });
                return;
            }

            const streamUrl = API_BASE_URL + STREAM_ENDPOINT_TPL.replace('{id}', id);
            const metaUrl = API_BASE_URL + META_ENDPOINT_TPL.replace('{id}', id);

            activity.activity.loader(true); // Show loader
            Lampa.Noty.show('Fetching details...', { time: 2000 });

            Promise.all([
                fetch(streamUrl).then(handleFetchResponse),
                fetch(metaUrl).then(handleFetchResponse)
            ]).then(([streamData, metaData]) => {
                activity.activity.loader(false);
                console.log("Hanime Plugin: Stream Data:", streamData);
                console.log("Hanime Plugin: Meta Data:", metaData);

                // --- Player Integration Logic ---
                // TODO: Implement the actual logic to start playback using Lampa's player.
                // This requires knowledge of Lampa.Player or similar APIs.

                if (streamData && streamData.streams && streamData.streams.length > 0) {
                    // Example: Get the first (likely highest quality) stream
                    const stream = streamData.streams[0];
                    const title = metaData?.meta?.name || 'Unknown Title'; // Use meta title
                    const poster = metaData?.meta?.poster || metaData?.meta?.background; // Use poster/background

                    console.log(`Hanime Plugin: Attempting to play: ${title} (${stream.title || 'Stream'})`);
                    Lampa.Noty.show(`Found stream: ${stream.title || stream.url}`, { time: 4000 });

                    // --- Placeholder for Lampa Player Launch ---
                     Lampa.Player.play({
                         url: stream.url,
                         title: title,
                         poster: poster,
                         // behaviorHints might contain necessary headers (e.g., Referer, User-Agent)
                         // Make sure Lampa's player can handle these if needed.
                         // behaviorHints: stream.behaviorHints || {}
                         // Add other necessary player parameters based on Lampa's API
                     });
                     // Lampa.Player.callback = ()=>{ // Example callback on player close/error
                     //    Lampa.Activity.backward(); // Go back from player
                     // };
                     // Lampa.Player.start(); // Start the player if needed


                } else {
                    Lampa.Noty.show('No playable streams found for this item.', { type: 'warning' });
                    console.warn("Hanime Plugin: No streams available in response:", streamData);
                }

            }).catch(error => {
                activity.activity.loader(false);
                console.error("Hanime Plugin: Failed to fetch stream/meta details:", error);
                Lampa.Noty.show(`Error fetching details: ${error.message || error}`, { type: 'error' });
            });
        }

        /**
         * Helper to handle fetch API responses, checking for ok status and parsing JSON.
         * @param {Response} response - The fetch Response object.
         * @returns {Promise<object>} - A promise resolving with the JSON data.
         */
        function handleFetchResponse(response) {
            if (!response.ok) {
                return Promise.reject(new Error(`HTTP error! Status: ${response.status}`));
            }
            // Check if content type is JSON, handle potential non-JSON responses gracefully
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return response.json();
            } else {
                console.warn("Hanime Plugin: Received non-JSON response for", response.url);
                return response.text().then(text => Promise.reject(new Error(`Expected JSON, got: ${text.substring(0,100)}...`)));
            }
        }

        /**
         * Creates card elements for each anime item and adds them to the UI.
         * @param {Array<object>} results - Array of anime metadata objects.
         */
        function buildUI(results) {
            scroll.minus(); // Reset scroll position
            body.empty(); // Clear previous items
             Lampa.Arrays.destroy(items); // Destroy previous card instances
            items = []; // Reset items array

            results.forEach((meta, index) => { // Iterate through metadata
                if (!meta || !meta.id) { // Basic validation
                    console.warn("Hanime Plugin: Skipping item with missing ID/data:", meta);
                    return;
                }

                const card = new HanimeCard(meta);
                const cardElement = card.render();

                cardElement.on('hover:focus', function () {
                    lastFocusedElement = this; // Store the DOM element
                    scroll.update(cardElement, true); // Ensure focused item is visible
                     // Optional: Update background or some info panel based on focus
                     // Lampa.Background.change(meta.background || meta.poster);
                }).on('hover:enter', function () {
                    // Action when a card is selected (Enter key or click)
                    console.log(`Hanime Plugin: Selected Anime - ID: ${meta.id}, Name: ${meta.name}`); //
                    fetchStreamAndMeta(meta.id); // Fetch details and attempt playback
                });

                body.append(cardElement);
                items.push(card);
            });

            scroll.append(body);
            html.append(scroll.render(true)); // Add scrollable content to the main container
            activity.activity.toggle(); // Make the activity visible
        }

        /**
         * Displays an informative message when no data is available or an error occurs.
         * @param {string} message - The message to display.
         */
        function displayEmptyMessage(message) {
            const emptyMsg = new Lampa.Empty({ message: Lampa.Utils.escapeHtml(message) });
            html.empty().append(emptyMsg.render(true)); // Clear container and show message
             activity.activity.loader(false); // Ensure loader is hidden
             activity.activity.toggle(); // Show the activity with the message
            // Allow focusing the empty message container (if needed by Lampa)
            activity.start = emptyMsg.start.bind(emptyMsg);
        }

        // --- Lampa Activity Lifecycle Methods ---

        /**
         * Called when the component/activity is first created.
         * Use this for one-time setup.
         */
        this.create = function () {
            console.log("Hanime Plugin: Component create");
             this.activity.loader(true); // Show loader immediately
            fetchCatalogData(); // Initiate data fetching
        };

        /**
         * Called when the activity gains focus (becomes the active screen).
         * Set up navigation controllers here.
         */
        this.start = function () {
            console.log("Hanime Plugin: Component start");
            // Ensure this activity is the currently active one before setting up controllers
            if (Lampa.Activity.active() && Lampa.Activity.active().activity !== this.activity) {
                console.log("Hanime Plugin: Start called on inactive activity, ignoring.");
                return;
            }
            Lampa.Controller.add('content', {
                toggle: () => {
                    Lampa.Controller.collectionSet(scroll.render()); // Set the scrollable container
                    Lampa.Controller.collectionFocus(lastFocusedElement || items[0]?.cardElement[0] || false, scroll.render()); // Focus last item or first
                },
                left: () => {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu'); // Open menu if cannot move left
                },
                right: () => {
                    if (Navigator.canmove('right')) Navigator.move('right');
                    // Optional: Implement endless scrolling or pagination trigger here
                },
                up: () => {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head'); // Focus header elements
                },
                down: () => {
                    if (Navigator.canmove('down')) Navigator.move('down');
                     // Optional: Implement loading more items when reaching the bottom
                },
                back: this.back // Use the component's back method
            });
            Lampa.Controller.toggle('content'); // Activate the content controller
        };

        /**
         * Called when the activity loses focus.
         * Optional: Clean up temporary states if needed.
         */
        this.pause = function () {
            console.log("Hanime Plugin: Component pause");
            // Lampa.Controller.clear(); // Might be necessary depending on Lampa version/behavior
        };

        /**
         * Called just before the activity is destroyed.
         * Perform cleanup related to active state.
         */
        this.stop = function () {
            console.log("Hanime Plugin: Component stop");
             // Lampa.Controller.clear(); // Ensure controllers are cleared
        };

        /**
         * Returns the main HTML element of the component.
         * @returns {jQuery} The root jQuery element for this component.
         */
        this.render = function () {
            return html;
        };

        /**
         * Called when the activity is being completely removed.
         * Perform final cleanup: abort requests, remove elements, nullify variables.
         */
        this.destroy = function () {
            console.log("Hanime Plugin: Component destroy");
            network.clear(); // Abort any ongoing network requests
            Lampa.Arrays.destroy(items); // Destroy all card instances
            scroll.destroy(); // Clean up scroll component
            html.remove(); // Remove component HTML from DOM

            // Nullify references to prevent memory leaks
            items = null;
            network = null;
            scroll = null;
            html = null;
            body = null;
             activity = null; // Break self-reference
            lastFocusedElement = null;
        };

        /**
         * Handles the 'back' action (e.g., Backspace key or remote button).
         * Typically navigates to the previous screen.
         */
        this.back = function () {
            console.log("Hanime Plugin: Back action triggered");
            Lampa.Activity.backward(); // Navigate back in Lampa's activity stack
        };
    }

    /**
     * Initializes the Hanime Catalog plugin.
     * Adds styles, registers the component, and adds a menu item.
     */
    function initializePlugin() {
        console.log("Hanime Plugin: Initializing...");

        // Append plugin styles to the document head
        $('head').append(Lampa.Template.get(STYLE_TEMPLATE_NAME, {}, true));

        // Register the main component with Lampa
        Lampa.Component.add(COMPONENT_NAME, HanimeComponent);

        // Function to add the item to Lampa's main menu
        function addMenuItem() {
            // Simple Placeholder SVG Icon (Replace with a relevant one if possible)
            const menuIconSvg = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width: 1.5em; height: 1.5em;">
                    <path d="M0 0h24v24H0z" fill="none"/>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7z"/>
                </svg>
            `;

            const menuItemHtml = `
                <li class="menu__item selector" data-component-name="${COMPONENT_NAME}">
                    <div class="menu__ico">
                        ${menuIconSvg}
                    </div>
                    <div class="menu__text">${PLUGIN_MENU_TEXT}</div>
                </li>
            `;

            const menuItem = $(menuItemHtml);

            menuItem.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '', // URL is not needed when using component name
                    title: PLUGIN_MENU_TEXT,
                    component: COMPONENT_NAME,
                    page: 1 // Initial page (useful for future pagination)
                });
            });

            // Append to the primary menu list (usually the first '.menu__list')
             const menuContainer = $('.menu .menu__list').first();
             if (menuContainer.length) {
                 menuContainer.append(menuItem);
                 console.log("Hanime Plugin: Menu item added.");
             } else {
                 console.error("Hanime Plugin: Could not find menu container to add item.");
             }
        }

        // Wait for Lampa to be fully ready before adding the menu item
        if (window.appready) {
            console.log("Hanime Plugin: Lampa already ready, adding menu item.");
            addMenuItem();
        } else {
            console.log("Hanime Plugin: Lampa not ready yet, listening for 'app:ready' event.");
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') {
                    console.log("Hanime Plugin: Lampa ready event received, adding menu item.");
                    addMenuItem();
                     // Optional: Stop listening after adding the item
                     // Lampa.Listener.remove('app', arguments.callee);
                }
            });
        }
    }

    // --- Start Plugin Execution ---
    // Ensure Lampa objects are available before initialization
    if (typeof Lampa !== 'undefined' && Lampa.Template && Lampa.Component && Lampa.Activity) {
        initializePlugin();
    } else {
        console.error("Hanime Plugin: Lampa environment not detected or not ready. Plugin initialization failed.");
        // Optionally retry after a delay
        // setTimeout(initializePlugin, 1000);
    }

})();
