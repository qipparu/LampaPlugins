/**
 * Lampa Plugin: Hanime Catalog
 * Description: Displays Hanime items fetched from a Stremio API and integrates with Lampa's full card view.
 * Version: 1.2.3 (Enhanced FullCardEnhancer to handle direct links via source)
 */

(function () {
    'use strict';

    // Base URL for the Hanime Stremio Addon API
    var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
    var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json";
    var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
    var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";

    // Define the source identifier for this addon (based on the provided URL)
    var ADDON_SOURCE_ID = 'cub';

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
            // If the catalog API provided a score, you would pass it here:
            // rate: data.score
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
                var card = new HanimeCard(meta); // Pass the meta data to the card constructor
                var cardElement = card.render();

                cardElement.on('hover:focus', function () {
                    last = cardElement[0];
                    active = items.indexOf(card);
                    scroll.update(cardElement, true);
                }).on('hover:enter', function () {
                    console.log("Opening full card for:", meta.id, meta.name);

                    // Prepare data for Lampa's 'full' component.
                    var cardDataForLampa = {
                        id: meta.id,             // Use Hanime ID
                        name: meta.name,           // Use Hanime name for title
                        title: meta.name,          // Also set title
                        poster_path: meta.poster,  // Use Hanime poster URL (Lampa might handle full URLs)
                        poster: meta.poster,       // Pass poster URL directly too
                        type: meta.type || 'movie',// Pass the type (should be 'movie' based on API)
                        // Add a flag to easily identify our items in the 'full:create' listener
                        isHanime: true,
                        // Also add the source ID to the card data
                        source: ADDON_SOURCE_ID
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
                         // If no Navigator or cannot move right, maybe do nothing or wrap around
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
     * It now checks the source ID or the isHanime flag.
     */
    function HanimeFullCardEnhancer() {
         var network = new Lampa.Reguest();

         // Listen for the 'full:create' event
         Lampa.Listener.follow('full', function(e) {
             // Check if the event is 'create' and if the item is from our catalog (isHanime flag)
             // OR if the source matches our addon's source ID (for direct links)
             if (e.type === 'create' && e.object && e.object.card &&
                 (e.object.card.isHanime || e.object.source === ADDON_SOURCE_ID) &&
                 e.object.method === 'movie') // Ensure it's a movie type as per API
             {

                 var hanimeId = e.object.card.id;
                 console.log("Enhancing full card for Hanime ID:", hanimeId, "Source:", e.object.source);

                 // Access the full component's object to update its properties
                 var fullComponent = e.object;

                 // Fetch the full meta data
                 var metaUrl = META_URL_TEMPLATE.replace('{id}', hanimeId);
                 network.native(metaUrl,
                     function (metaData) {
                         if (metaData && metaData.meta) {
                             console.log("Fetched Hanime meta data:", metaData.meta);

                             // Update description
                             if (metaData.meta.description) {
                                 fullComponent.card.overview = metaData.meta.description;
                                 // Manually update the description element if it exists and the component is already rendered
                                 var descriptionElement = fullComponent.activity.render().find('.full-descr__text');
                                 if (descriptionElement.length) {
                                     descriptionElement.text(metaData.meta.description);
                                 } else {
                                     console.warn("Hanime Plugin: Description element not found in full card DOM.");
                                 }
                             }

                              // Update genres
                              if (metaData.meta.genre && Array.isArray(metaData.meta.genre)) {
                                  // Lampa's full component might expect genres as an array of objects { name: 'Genre Name' }
                                  fullComponent.card.genres = metaData.meta.genre.map(function(g) { return { name: g }; });

                                  // Manually update the genres display if it exists and the component is already rendered
                                  var genreElement = fullComponent.activity.render().find('.full-descr__info-genres .full-descr__text'); // Adjust selector if needed
                                   if (genreElement.length) {
                                       genreElement.text(metaData.meta.genre.join(', '));
                                   } else {
                                        console.warn("Hanime Plugin: Genre element not found in full card DOM.");
                                   }
                              }

                              // Update background image if available and needed
                              if (metaData.meta.background) {
                                   fullComponent.card.backdrop_path = metaData.meta.background;
                                   // You might need to manually update the background element if it's already rendered
                                   var backgroundElement = fullComponent.activity.render().find('.full__background'); // Adjust selector
                                   if (backgroundElement.length) {
                                        backgroundElement.css('background-image', 'url(' + metaData.meta.background + ')');
                                   } else {
                                       console.warn("Hanime Plugin: Background element not found in full card DOM.");
                                   }
                              }

                             // You might need to update other fields like logo, etc., based on Lampa's full component structure
                             // e.g., fullComponent.card.logo = metaData.meta.logo; // If Lampa supports a logo field

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
                             fullComponent.card.playlist = lampaStreams;
                             console.log("Assigned streams to full card:", fullComponent.card.playlist);

                             // Note: If the full component UI is already rendered, simply updating
                             // fullComponent.card.playlist might not automatically update the list
                             // of sources visible to the user without further actions within Lampa's
                             // full component logic (e.g., calling a specific update method or
                             // manually triggering a UI refresh relevant to source selection).
                             // However, setting the playlist property is the correct way to provide
                             // streams for playback when the user initiates it.

                         } else {
                             console.error("Hanime Plugin: Invalid stream data format", streamData);
                              // Optionally display an error message on the full card or log it
                         }
                     },
                     function (errorStatus, errorText) {
                         console.error("Hanime Plugin: Failed to fetch stream data", errorStatus, errorText);
                         // Optionally display an error message on the full card
                     },
                     false,
                     { dataType: 'json', timeout: 10000 }
                  );
             } else {
                 // If the event is 'create' but it's not a Hanime item by flag or source,
                 // let Lampa handle it using its default logic (e.g., TMDB search)
                 console.log("Full card created for non-Hanime item or unknown source:", e.object.card.id, "Source:", e.object.source);
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
             /* Style for vote/score - Hanime API provides score in META, not catalog */
             /* We cannot display score directly on the catalog card based on current API */
             /* If you need a score, the catalog API needs to provide it */
             /*
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
             */

        `;
        Lampa.Template.add('hanime-style', `<style>${style}</style>`);

        // Add card template
        // Removed the conditional score display as it's not in the catalog API
        Lampa.Template.add('hanime-card', `
            <div class="hanime-card card selector layer--visible layer--render">
                <div class="hanime-card__view">
                    <img data-src="{img}" src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="hanime-card__img lazy" alt="{title}" />
                     ${'' /* {rate} placeholder removed as score is not in catalog API */}
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
