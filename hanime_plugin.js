/**
 * Lampa Plugin: Hanime Catalog
 * Description: Displays anime cards fetched from the Hanime Stremio API.
 */

(function () {
    'use strict';

    // --- Helper Functions (if needed) ---
    // (Functions like _asyncToGenerator, etc., are typically included by a build process if needed,
    // but for simplicity and direct modification of the provided code, we'll assume Lampa provides necessary helpers or
    // stick to standard Promises and fetch where possible, as in the original code.)

    /**
     * Card Component for Hanime Item
     * @param {object} data - Anime metadata object from the API
     */
    function HanimeCard(data) {
        // Use Lampa's template system. Define a template or build HTML string.
        // Template defined below in startPlugin function.
        // Описание не выводится в карточке, только изображение и название.
        var cardTemplate = Lampa.Template.get('hanime-card', {
            id: data.id,
            img: data.poster,
            title: data.name,
            // description is intentionally excluded from the template
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
        var body = $('<div class="hanime-catalog__body category-full"></div>'); // Use similar class for styling
        var active = 0; // Keep track of the focused item index
        var last; // Keep track of the last focused element

        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json";
        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";

        /**
         * Fetches catalog data from the API
         */
        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true); // Show loader

            network.clear(); // Clear previous requests
            network.native(CATALOG_URL,
                function (data) {
                    // Check if data has the expected structure
                    if (data && data.metas && Array.isArray(data.metas)) {
                        _this.build(data.metas);
                    } else {
                        _this.empty("Неверный формат данных от API.");
                        console.error("Hanime Plugin: Invalid data format", data);
                    }
                },
                function (errorStatus, errorText) {
                    _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                    console.error("Hanime Plugin: Failed to load catalog", errorStatus, errorText);
                },
                false, // No custom headers needed for this API
                { // Options
                    dataType: 'json', // Expect JSON response
                    timeout: 15000 // 15 seconds timeout
                }
            );
        };

        /**
         * Builds the UI with fetched data
         * @param {Array} result - Array of anime metadata objects
         */
        this.build = function (result) {
            var _this = this;
            scroll.minus(); // Reset scroll

            // Add items to the body
            result.forEach(function (meta) {
                var card = new HanimeCard(meta); // Create a card for each item
                var cardElement = card.render();

                cardElement.on('hover:focus', function () {
                    last = cardElement[0]; // Store the DOM element
                    active = items.indexOf(card); // Update active index
                    scroll.update(cardElement, true); // Ensure focused item is visible
                }).on('hover:enter', function () {
                    // Action when a card is selected (Enter key or click)
                    console.log("Selected Anime:", meta.id, meta.name);
                    // Fetch stream and meta details and then open player
                    _this.fetchStreamAndMeta(meta.id, meta.name);
                });

                body.append(cardElement);
                items.push(card);
            });

            scroll.append(body);
            html.append(scroll.render(true));
            _this.activity.loader(false); // Hide loader
            _this.activity.toggle(); // Make the activity visible
        };

        /**
         * Fetches Stream and Metadata for a specific anime ID and opens player
         * @param {string} id - The anime ID
         * @param {string} title - The anime title for player display
         */
        this.fetchStreamAndMeta = function (id, title) {
            var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

            _this.activity.loader(true);

            Promise.all([
                fetch(streamUrl).then(res => res.ok ? res.json() : Promise.reject('Stream API error: ' + res.status)),
                fetch(metaUrl).then(res => res.ok ? res.json() : Promise.reject('Meta API error: ' + res.status))
            ]).then(([streamData, metaData]) => {
                 _this.activity.loader(false);
                console.log("Stream Data:", streamData);
                console.log("Meta Data:", metaData);

                if (streamData && streamData.streams && streamData.streams.length > 0) {
                    // Find the stream with the highest quality (assuming resolution is in the name/title)
                    // Or just use the first stream as a basic implementation
                    var bestStream = streamData.streams.reduce((prev, current) => {
                         // Basic quality check, assuming '1080p', '720p', etc. in title or name
                         const getQuality = (s) => {
                             const match = (s.name || s.title || '').match(/(\d+)p/);
                             return match ? parseInt(match[1]) : 0;
                         };
                         return getQuality(current) > getQuality(prev) ? current : prev;
                    }, streamData.streams[0]);


                    var playerObject = {
                        title: metaData.meta.name || title, // Use meta title if available, fallback to catalog title
                        url: bestStream.url,
                        poster: metaData.meta.poster || metaData.meta.background, // Use meta poster/background
                        // Add behaviorHints if needed by Lampa/Stremio standard
                        // behaviorHints: bestStream.behaviorHints
                    };

                    // Check if the stream URL is valid before playing
                    if (playerObject.url) {
                         console.log("Launching player with:", playerObject);
                         Lampa.Player.play(playerObject);
                         // Lampa.Player.playlist([playerObject]); // If only one stream, playlist is optional

                         // Optional: Add to history if Lampa's history feature is desired
                         if (metaData.meta) {
                              Lampa.Favorite.add('history', metaData.meta, 100);
                         }

                    } else {
                         Lampa.Noty.show('Не удалось получить ссылку на поток.');
                         console.error("Hanime Plugin: No valid stream URL found.");
                    }


                } else {
                     Lampa.Noty.show('Потоки не найдены для этого аниме.');
                     console.warn("Hanime Plugin: No streams found in stream data.", streamData);
                }

            }).catch(error => {
                 _this.activity.loader(false);
                 console.error("Hanime Plugin: Failed to fetch stream/meta details", error);
                 Lampa.Noty.show('Ошибка загрузки деталей: ' + error);
            });
        };


        /**
         * Handles empty results or errors
         * @param {string} msg - Message to display
         */
        this.empty = function (msg) {
            var empty = new Lampa.Empty({ message: msg });
            html.empty().append(empty.render(true)); // Clear previous content and show empty message
            this.activity.loader(false);
            this.activity.toggle();
            this.start = empty.start; // Allow focusing the empty message
        };

        // --- Lampa Activity Lifecycle Methods ---

        this.create = function () {
            this.activity.loader(true); // Show loader initially
            this.fetchCatalog(); // Start fetching data when component is created
        };

        this.start = function () {
            // Called when the activity gains focus
            if (Lampa.Activity.active().activity !== this.activity) return; // Ignore if not the active activity

            // Set up controller for remote navigation
            Lampa.Controller.add('content', {
                toggle: function () {
                    // Set the collection of focusable elements to the scrollable items
                    Lampa.Controller.collectionSet(scroll.render());
                    // Focus on the last selected item, or the first if none was selected
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu'); // Move to menu on left edge
                },
                right: function () {
                    if (Navigator.canmove('right')) Navigator.move('right'); // Move right within items
                },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head'); // Move to header on top edge
                },
                down: function () {
                    if (Navigator.canmove('down')) Navigator.move('down'); // Move down within items
                },
                enter: function () {
                     // Trigger the hover:enter event on the focused element
                     // This is handled by the .on('hover:enter', ...) listener in build()
                },
                back: this.back // Use component's back method
            });
            Lampa.Controller.toggle('content'); // Activate this controller
        };

        this.pause = function () {
            // Called when the activity loses focus
        };

        this.stop = function () {
            // Called before destroy
        };

        this.render = function () {
            return html;
        };

        this.destroy = function () {
            network.clear(); // Abort ongoing requests
            Lampa.Arrays.destroy(items); // Destroy card instances
            scroll.destroy();
            html.remove();
            // Nullify variables
            items = null;
            network = null;
            scroll = null;
            html = null;
            body = null;
            last = null; // Clear last focused element
        };

        // Define the back behavior (usually close the activity)
        this.back = function () {
            Lampa.Activity.backward();
        };
    }

    /**
     * Initializes the Plugin
     */
    function startPlugin() {
        if (window.plugin_hanime_catalog_ready) return; // Prevent multiple initializations

        window.plugin_hanime_catalog_ready = true;

        // Define CSS Styles for the plugin
        var style = `
            .hanime-catalog__body.category-full {
                justify-content: space-around; /* Adjust spacing */
            }
            .hanime-card {
                width: 185px; /* Adjust card width as needed */
                margin-bottom: 1.5em;
                border-radius: 0.5em; /* Скругленные углы для всей карточки */
                overflow: hidden; /* Обрезаем контент по скругленным углам */
                transition: transform 0.2s ease, box-shadow 0.2s ease; /* Плавный переход */
                position: relative; /* Needed for z-index on focus */
            }
            .hanime-card.selector:focus {
                transform: scale(1.05); /* Увеличение при фокусировке */
                box-shadow: 0 0 15px rgba(255, 0, 0, 0.7); /* Красная тень при фокусировке */
                z-index: 5; /* Поднимаем фокусированную карточку выше других */
            }
            .hanime-card__view {
                position: relative;
                height: 270px; /* Adjust card height */
                background-color: rgba(255,255,255,0.05); /* Placeholder background */
                border-radius: 0.5em; /* Скругленные углы для контейнера изображения */
                overflow: hidden; /* Обрезаем изображение по скругленным углам */
            }
             .hanime-card__img {
                position: absolute;
                width: 100%;
                height: 100%;
                object-fit: cover; /* Ensure image covers the area */
                border-radius: 0.5em; /* Скругленные углы для самого изображения */
            }
             .hanime-card__title {
                margin-top: 0.5em;
                padding: 0 0.5em; /* Добавляем небольшой отступ по бокам */
                font-size: 1em; /* Немного увеличим размер шрифта */
                font-weight: bold; /* Сделаем жирным */
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                text-align: center; /* Выравнивание по центру */
                color: #fff; /* Цвет текста */
             }
            /* Styles for description are not needed as it's not in the template */
            /* Add a basic style for the menu item icon container */
            .menu__ico svg {
                 width: 1.5em; /* Adjust icon size */
                 height: 1.5em; /* Adjust icon size */
            }
        `;
        Lampa.Template.add('hanime-style', `<style>${style}</style>`);

        // Define the HTML template for a single card
        // Based on the provided API data structure
        Lampa.Template.add('hanime-card', `
            <div class="hanime-card card selector layer--visible layer--render">
                <div class="hanime-card__view">
                    <img src="{img}" class="hanime-card__img" alt="{title}" loading="lazy" />
                    {/* Add overlays like type or rating if available/desired */}
                </div>
                <div class="hanime-card__title">{title}</div>
                {/* <div class="hanime-card__description">{description}</div> Описание закомментировано и не выводится */}
            </div>
        `);

        // Register the main component
        Lampa.Component.add('hanime_catalog', HanimeComponent);

        // Add the plugin to the Lampa menu
        function addMenuItem() {
            var menu_item = $(`
                <li class="menu__item selector">
                    <div class="menu__ico">
                        <svg fill="currentColor" viewBox="0 0 24 24"> {/* Use an appropriate SVG icon */}
                            {/* Simple play icon - common for media/catalog */}
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">Hanime Catalog</div>
                </li>
            `);
            menu_item.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '', // URL is not strictly needed for component-based activities
                    title: 'Hanime Catalog',
                    component: 'hanime_catalog', // The component registered above
                    page: 1 // Initial page if pagination is added later
                });
            });
            // Append to the main menu - assuming the first .menu .menu__list is the main one
            $('.menu .menu__list').eq(0).append(menu_item);
        }

        // Append styles and add menu item once Lampa is ready
        // Ensure styles are added before components are rendered
        $('head').append(Lampa.Template.get('hanime-style', {}, true)); // Append to head is often better for styles

        // Wait for Lampa app to be ready before adding the menu item
        if (window.appready) {
             addMenuItem();
        } else {
             Lampa.Listener.follow('app', function (e) {
                 if (e.type === 'ready') {
                      addMenuItem();
                 }
             });
        }
    }

    // Start the plugin initialization
    startPlugin();

})();
