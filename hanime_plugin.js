/**
 * Lampa Plugin: Hanime Catalog
 * Description: Displays anime cards fetched from the Hanime Stremio API.
 * Version: 1.1 (Opens full card view on selection)
 */

(function () {
    'use strict';

    /**
     * Card Component for Hanime Item
     * @param {object} data - Anime metadata object from the API
     */
    function HanimeCard(data) {
        var cardTemplate = Lampa.Template.get('hanime-card', {
            id: data.id,
            img: data.poster,
            title: data.name,
            description: data.description ? data.description.substring(0, 150) + '...' : 'No description available.'
        });

        var cardElement = $(cardTemplate);

        this.render = function () {
            return cardElement;
        };

        this.destroy = function () {
            cardElement.remove();
        };
    }

    /**
     * Main Component for Displaying Hanime Catalog
     * @param {object} componentObject - Lampa component configuration
     */
    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = [];
        var html = $('<div class="hanime-catalog"></div>');
        var body = $('<div class="hanime-catalog__body category-full"></div>');
        var active = 0;
        var last;

        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json";
        // Keep these for potential future use within the 'full' component adaptation
        // var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        // var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";

        /**
         * Fetches catalog data from the API
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
         * Builds the UI with fetched data
         * @param {Array} result - Array of anime metadata objects
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
                    // *** MODIFIED PART ***
                    // Instead of fetching stream, push to Lampa's 'full' component view
                    console.log("Opening full card for:", meta.id, meta.name);

                    // Prepare the 'card' object for the 'full' component.
                    // Lampa's 'full' component expects certain field names (like title, name, poster_path, overview).
                    // We map our API fields to what Lampa might expect.
                    var cardDataForLampa = {
                        id: meta.id,             // Use Hanime ID
                        name: meta.name,           // Use Hanime name for title
                        title: meta.name,          // Also set title
                        poster_path: meta.poster,  // Use Hanime poster URL (Lampa might handle full URLs)
                        poster: meta.poster,       // Pass poster URL directly too
                        overview: meta.description,// Use Hanime description
                        genre_ids: meta.genre,     // Pass genre strings (Lampa might not display these correctly without adapter)
                        genres: meta.genre.map(g => ({ name: g })), // Attempt to format genres as objects
                        // Add other fields if available and potentially recognized by 'full'
                        // e.g., backdrop_path: meta.background (if available)
                    };


                    Lampa.Activity.push({
                        url: '',                     // Not needed when specifying component
                        title: meta.name,            // Set the title for the activity stack
                        component: 'full',           // Use Lampa's built-in full card component
                        id: meta.id,                 // Pass the Hanime ID
                        method: meta.type || 'movie',// Pass the type (should be 'movie' based on API)
                        card: cardDataForLampa       // Pass the prepared metadata object
                    });
                    // *** END OF MODIFIED PART ***

                });

                body.append(cardElement);
                items.push(card);
            });

            scroll.append(body);
            html.append(scroll.render(true));
            _this.activity.loader(false);
            _this.activity.toggle();
        };

        // ** Removed fetchStreamAndMeta function as it's not called here anymore **

        /**
         * Handles empty results or errors
         * @param {string} msg - Message to display
         */
        this.empty = function (msg) {
            var empty = new Lampa.Empty({ message: msg });
            html.empty().append(empty.render(true));
            this.activity.loader(false);
            this.activity.toggle();
            this.start = empty.start;
        };

        // --- Lampa Activity Lifecycle Methods (Keep as they were) ---

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
                    // Need to check if Navigator exists and can move right
                    if (typeof Navigator !== 'undefined' && Navigator.canmove('right')) {
                        Navigator.move('right');
                    } else {
                         // If no Navigator or cannot move right, maybe focus the last item?
                         // Or do nothing. This depends on desired behavior.
                         console.log("Cannot move right or Navigator not available.");
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
     * Initializes the Plugin (Keep as it was)
     */
    function startPlugin() {
        if (window.plugin_hanime_catalog_ready) return;

        window.plugin_hanime_catalog_ready = true;

        var style = `
            .hanime-catalog__body.category-full {
                justify-content: space-around;
                display: flex; /* Ensure flex layout for justify-content */
                flex-wrap: wrap; /* Allow items to wrap */
            }
            .hanime-card {
                width: 185px;
                margin-bottom: 1.5em;
                margin-left: 10px; /* Add some horizontal spacing */
                margin-right: 10px;/* Add some horizontal spacing */
            }
            .hanime-card__view {
                position: relative;
                height: 270px;
                background-color: rgba(255,255,255,0.05);
                border-radius: 0.3em;
                 overflow: hidden;
            }
             .hanime-card__img {
                 position: absolute;
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
        `;
        Lampa.Template.add('hanime-style', `<style>${style}</style>`);

        Lampa.Template.add('hanime-card', `
            <div class="hanime-card card selector layer--visible layer--render">
                <div class="hanime-card__view">
                    <img data-src="{img}" src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="hanime-card__img lazy" alt="{title}" />
                </div>
                <div class="hanime-card__title">{title}</div>
            </div>
        `); // Added lazy loading placeholder

        Lampa.Component.add('hanime_catalog', HanimeComponent);

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
                    page: 1
                });
            });
             // Append only if the element exists
             if ($('.menu .menu__list').eq(0).length) {
                $('.menu .menu__list').eq(0).append(menu_item);
             } else {
                 console.error("Hanime Plugin: Could not find Lampa menu list to append item.");
             }
        }

        $('body').append(Lampa.Template.get('hanime-style', {}, true));
        if (window.appready) addMenuItem();
        else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') addMenuItem();
            });
        }

         // Basic Lazy Load Implementation (optional but good for performance)
         function simpleLazyLoad() {
             var lazyImages = [].slice.call(document.querySelectorAll("img.lazy"));
             if ("IntersectionObserver" in window) {
                 let lazyImageObserver = new IntersectionObserver(function(entries, observer) {
                     entries.forEach(function(entry) {
                         if (entry.isIntersecting) {
                             let lazyImage = entry.target;
                             lazyImage.src = lazyImage.dataset.src;
                             lazyImage.classList.remove("lazy");
                             lazyImageObserver.unobserve(lazyImage);
                         }
                     });
                 });
                 lazyImages.forEach(function(lazyImage) {
                     lazyImageObserver.observe(lazyImage);
                 });
             } else {
                 // Fallback for browsers without IntersectionObserver
                 lazyImages.forEach(function(lazyImage) {
                     lazyImage.src = lazyImage.dataset.src;
                     lazyImage.classList.remove("lazy");
                 });
             }
         }

         // Trigger lazy load when content changes or scrolls significantly
         // This needs to be called after new cards are added.
         // A simple way is to call it after `_this.activity.toggle()` in `build`
         // and maybe hook into scroll events if needed.
         var originalBuild = HanimeComponent.prototype.build;
         HanimeComponent.prototype.build = function(result) {
              originalBuild.call(this, result);
              // Use timeout to allow DOM update
              setTimeout(simpleLazyLoad, 100);
         };
         // Also listen for activity changes that might reveal the component
         Lampa.Listener.follow('activity', function(e) {
              if (e.type === 'resumed' || e.type === 'start') {
                  // Check if the current component is ours
                  if (Lampa.Activity.active() && Lampa.Activity.active().component === 'hanime_catalog') {
                       setTimeout(simpleLazyLoad, 100);
                  }
              }
         });


    }

    startPlugin();

})();
