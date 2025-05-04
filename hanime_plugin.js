(function () {
    'use strict';

    // Стандартная карточка Lampa
    var standardLampaCardTemplate = `
        <div class="card selector layer--render card--loaded">
            <div class="card__view">
                <img src="{img}" class="card__img" alt="{title}" loading="lazy" />
            </div>
            <div class="card__title">{title}</div>
        </div>
    `;

    function HanimeCard(data) {
        // Use the stored template string directly with jQuery
        var cardElement = $(standardLampaCardTemplate
            .replace('{img}', data.poster || '')
            .replace('{title}', data.name || ''));

        this.render = function () {
            return cardElement;
        };

        this.destroy = function () {
            cardElement.remove();
        };
    }

    function HanimeComponent() {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = [];
        var html = $('<div></div>'); // Main container for this component
        var body = $('<div class="category-full"></div>'); // Container for catalog sections
        var last;

        // Конфигурация API
        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URLS = {
            newset: "/catalog/movie/newset.json",
            recent: "/catalog/movie/recent.json",
            mostlikes: "/catalog/movie/mostlikes.json",
            mostviews: "/catalog/movie/mostviews.json"
        };

        var PROXY_BASE_URL = "http://77.91.78.5:3000";

        this.fetchCatalogs = function () {
            var _this = this;
            _this.activity.loader(true);
            network.clear();

            const requests = Object.entries(CATALOG_URLS).map(([key, path]) => {
                return new Promise((resolve, reject) => {
                    network.native(API_BASE_URL + path,
                        function(data) {
                            if (data && data.metas && Array.isArray(data.metas)) {
                                resolve({ key, data: data.metas });
                            } else {
                                console.warn(`API request for ${key} returned invalid data:`, data);
                                resolve({ key, data: [] }); // Resolve with empty data for this section
                            }
                        },
                        function(errorStatus) {
                            console.error(`API request for ${key} failed:`, errorStatus);
                            resolve({ key, data: [] }); // Resolve with empty data on error
                        }
                    );
                });
            });

            Promise.allSettled(requests).then(results => {
                const catalogData = results
                    .filter(r => r.status === 'fulfilled' && r.value && Array.isArray(r.value.data) && r.value.data.length > 0) // Filter for successful requests with non-empty data
                    .reduce((acc, r) => {
                        acc[r.value.key] = r.value.data;
                        return acc;
                    }, {});

                if (Object.keys(catalogData).length > 0) {
                    _this.build(catalogData);
                } else {
                    _this.empty("Не удалось загрузить данные с сервера или все разделы пусты.");
                }
            });
        };

        this.build = function (catalogData) {
            var _this = this;

            // Очистка предыдущих данных
            items.forEach(item => item.destroy());
            items = [];
            body.empty(); // Clear the content body

            // Создание разделов
            Object.entries(catalogData).forEach(([sectionKey, data]) => {
                // Data filter is now handled in fetchCatalogs, but double-checking here doesn't hurt
                if (data.length > 0) {
                    // Заголовок раздела с кнопкой "Ещё"
                    const sectionTitle = getTitle(sectionKey);
                    const sectionHeader = $(`
                        <div class="items-line__head">
                            <div class="items-line__title">${sectionTitle}</div>
                            <div class="items-line__more selector">Еще</div>
                        </div>
                    `);

                    // Горизонтальный скролл для карточек
                    const horizontalScroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
                    // Append the horizontal scroll component's render element to the container
                    const scrollContainer = $('<div class="items-line__body"></div>').append(horizontalScroll.render());

                    // Добавляем обработчик клика на "Еще"
                    sectionHeader.find('.items-line__more').on('hover:enter', () => {
                        Lampa.Activity.push({
                            url: '',
                            title: sectionTitle,
                            component: 'hanime_section',
                            page: 1,
                            params: {
                                section: sectionKey,
                                url: API_BASE_URL + CATALOG_URLS[sectionKey]
                            }
                        });
                    });

                    // Создаем контейнер items-line
                    const itemsLine = $('<div class="items-line layer--visible layer--render items-line--type-cards"></div>')
                        .append(sectionHeader)
                        .append(scrollContainer); // Append the scroll container to the itemsLine

                    // Добавляем карточки в горизонтальный скролл
                    // Append cards to the *body* of the horizontal scroll
                    const horizontalScrollBody = horizontalScroll.render().find('.scroll__body');
                    if (horizontalScrollBody.length > 0) {
                         data.forEach(meta => {
                             const card = new HanimeCard(meta);
                             const cardElement = card.render();

                             cardElement.on('hover:focus', () => {
                                 last = cardElement[0]; // Keep track of the last focused card for main scroll
                                 horizontalScroll.update(cardElement, true); // Update the horizontal scroll
                             }).on('hover:enter', () => {
                                 console.log("Selected Anime:", meta.id, meta.name);
                                 _this.fetchStreamAndMeta(meta.id, meta);
                             });

                             horizontalScrollBody.append(cardElement); // Append card to horizontal scroll's body
                             items.push(card); // Add to items list for cleanup
                         });
                    } else {
                         console.error("Lampa Horizontal Scroll structure unexpected: could not find .scroll__body");
                    }


                    // Добавляем раздел itemsLine в основной контейнер body
                    body.append(itemsLine);
                }
            });

            // Инициализация основного вертикального скролла
            // Find the scroll body provided by the main vertical scroll component
            const mainScrollBody = scroll.render().find('.scroll__body');

            if (mainScrollBody.length > 0) {
                // Append the content container ('body' which holds all sections) to the main vertical scroll's body
                mainScrollBody.empty().append(body); // Use empty() to clear previous content if build is called again
            } else {
                 // Fallback or error handling if scroll structure is unexpected
                console.error("Lampa Scroll structure unexpected: could not find .scroll__body for main scroll.");
                 // As a fallback, append body directly to the scroll's content area, though scroll__body is preferred
                 scroll.render().find('.scroll__content').empty().append(body);
            }


            // Добавляем основной скролл компонент в главный контейнер html
            // Check if the scroll component is already appended to html
            if (html.find('.scroll-box').length === 0) {
                html.append(scroll.render(true));
            }

            _this.activity.loader(false);
            _this.activity.toggle();
            // Reset scroll position after building
            requestAnimationFrame(() => scroll.reset());
        };

        function getTitle(key) {
            const titles = {
                newset: "Новое",
                recent: "Последнее",
                mostlikes: "Популярное",
                mostviews: "Самое просматриваемое"
            };
            return titles[key] || key;
        }

        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = API_BASE_URL + `/stream/movie/${id}.json`;

            _this.activity.loader(true);
            network.native(streamUrl,
                function(streamData) {
                    _this.activity.loader(false);

                    if (streamData && streamData.streams && streamData.streams.length > 0) {
                        let finalStreamUrl = streamData.streams[0].url;

                        try {
                            const url = new URL(finalStreamUrl);
                            // Apply proxy logic only if URL matches specific hostnames
                            if (url.hostname.includes('highwinds-cdn.com') ||
                                url.hostname.includes('proxy.hentai.stream')) {
                                finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                            }
                        } catch (e) {
                            console.error("URL parsing error during proxy check", e);
                            // Continue with original URL if parsing fails
                        }

                        const playerObject = {
                            title: meta.name || meta.title || 'Без названия',
                            url: finalStreamUrl,
                            poster: meta.poster || meta.background
                        };

                        if (playerObject.url) {
                            Lampa.Player.play(playerObject);
                            Lampa.Player.playlist([playerObject]); // Add to playlist

                            // Add to history
                            const historyMeta = {
                                id: meta.id,
                                title: meta.name || meta.title,
                                poster: meta.poster || meta.background
                            };
                            Lampa.Favorite.add('history', historyMeta, 100); // Add to history, limit to 100 items
                        } else {
                            Lampa.Noty.show('Не удалось получить ссылку на поток.');
                        }
                    } else {
                        Lampa.Noty.show('Потоки не найдены.');
                    }
                },
                function(errorStatus) {
                    _this.activity.loader(false);
                    console.error("Stream fetch error", errorStatus);
                    Lampa.Noty.show(`Ошибка загрузки потока: ${errorStatus}`);
                }
            );
        };

        this.empty = function (msg) {
            // Clear previous content from the scroll body
            const mainScrollBody = scroll.render().find('.scroll__body');
             if (mainScrollBody.length > 0) {
                 mainScrollBody.empty();
             } else {
                 scroll.render().find('.scroll__content').empty();
             }

            var empty = new Lampa.Empty({ message: msg });
            // Append the empty message to the scroll body
             if (mainScrollBody.length > 0) {
                 mainScrollBody.append(empty.render(true));
             } else {
                  scroll.render().find('.scroll__content').append(empty.render(true));
             }


            if (html.find('.scroll-box').length === 0) {
                html.append(scroll.render(true));
            }

            this.activity.loader(false);
            this.activity.toggle();
            // Set the start focusable element to the empty message
            this.start = empty.start;
        };

        this.create = function () {
            this.fetchCatalogs();
        };

        this.start = function () {
            // Check if this component's activity is currently active
            if (Lampa.Activity.active().activity !== this.activity) return;

            Lampa.Controller.add('content', {
                toggle: function () {
                    // Set the scrollable area as the collection source
                    Lampa.Controller.collectionSet(scroll.render());
                    // Focus the last focused element, or the first focusable if none
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: function () {
                    // Try to move left within the current collection
                    if (Navigator.canmove('left')) Navigator.move('left');
                    // If cannot move left, toggle the menu
                    else Lampa.Controller.toggle('menu');
                },
                right: function () {
                     // Move right within the current collection
                    Navigator.move('right');
                },
                up: function () {
                    // Try to move up within the current collection
                    if (Navigator.canmove('up')) Navigator.move('up');
                    // If cannot move up, toggle the head (top bar)
                    else Lampa.Controller.toggle('head');
                },
                down: function () {
                     // Move down within the current collection
                    Navigator.move('down');
                },
                back: this.back // Use the component's back method
            });

            // Switch the controller to handle content navigation
            Lampa.Controller.toggle('content');
        };

        this.pause = function () {
             // Store the last focused element when pausing
             last = Navigator.last;
             // Removed: Lampa.Controller.remove('content');
        };
        this.stop = function () {
             // Same as pause, but typically called when activity is completely stopped
             last = Navigator.last;
             // Removed: Lampa.Controller.remove('content');
        };
        this.render = function () { return html; }; // Return the main container element

        this.destroy = function () {
            network.clear(); // Abort any ongoing network requests
            Lampa.Arrays.destroy(items); // Destroy all card components

            if (scroll) {
                scroll.onEnd = null; // Clear event listeners
                scroll.destroy(); // Destroy the scroll component
            }

            if (html) html.remove(); // Remove the main container from the DOM
            // Nullify references to help with garbage collection
            items = null;
            network = null;
            scroll = null;
            html = null;
            body = null;
            last = null;
        };

        this.back = function () {
            // Navigate back in the activity stack
            Lampa.Activity.backward();
        };
    }

    function HanimeSectionComponent() {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 }); // Main vertical scroll for this section view
        var items = []; // Cards in this section
        var html = $('<div></div>'); // Main container
        var body = $('<div class="category-full"></div>'); // Container for the single horizontal row
        var last; // Last focused card

        // Use the same base URL as the main component
        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var PROXY_BASE_URL = "http://77.91.78.5:3000"; // Ensure PROXY_BASE_URL is accessible here

        this.fetchSection = function () {
            var _this = this;
            const sectionUrl = this.activity.params.url; // Get the specific section URL from activity params

            _this.activity.loader(true);
            network.clear();

            network.native(sectionUrl,
                function(data) {
                    if (data && data.metas && Array.isArray(data.metas)) {
                        if (data.metas.length > 0) {
                            _this.build(data.metas);
                        } else {
                            _this.empty("Раздел пуст.");
                        }
                    } else {
                        _this.empty("Неверный формат данных.");
                        console.error("Invalid data format for section", sectionUrl, data);
                    }
                },
                function(errorStatus) {
                    _this.empty(`Ошибка загрузки раздела: ${errorStatus}`);
                    console.error("Failed to load section", sectionUrl, errorStatus);
                }
            );
        };

        this.build = function (result) {
            var _this = this;

            items.forEach(item => item.destroy());
            items = [];
            body.empty(); // Clear the content body

            // Create a horizontal scroll for the section's items
            const horizontalScroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
            const itemsLine = $('<div class="items-line layer--visible layer--render items-line--type-cards"></div>');
            // Append the horizontal scroll component's render element to the container
            const scrollContainer = $('<div class="items-line__body"></div>').append(horizontalScroll.render());

            // Append the scroll container to the itemsLine
            itemsLine.append(scrollContainer);

            // Add cards to the horizontal scroll body
            const horizontalScrollBody = horizontalScroll.render().find('.scroll__body');
            if (horizontalScrollBody.length > 0) {
                 result.forEach(meta => {
                     const card = new HanimeCard(meta);
                     const cardElement = card.render();

                     cardElement.on('hover:focus', () => {
                         last = cardElement[0]; // Keep track of the last focused card for main scroll
                         horizontalScroll.update(cardElement, true); // Update the horizontal scroll
                     }).on('hover:enter', () => {
                         console.log("Selected Anime:", meta.id, meta.name);
                         _this.fetchStreamAndMeta(meta.id, meta); // Use the component's stream fetcher
                     });

                     horizontalScrollBody.append(cardElement); // Append card to horizontal scroll's body
                     items.push(card); // Add to items list for cleanup
                 });
            } else {
                 console.error("Lampa Horizontal Scroll structure unexpected in section component: could not find .scroll__body");
            }


            // Append the itemsLine (containing the horizontal scroll) to this component's body container
            body.append(itemsLine);

            // Initialize the main vertical scroll for THIS component (which contains only one horizontal row)
            // Find the scroll body provided by the main vertical scroll component
            const mainSectionScrollBody = scroll.render().find('.scroll__body'); // Use the scroll variable declared at the top of HanimeSectionComponent

            if (mainSectionScrollBody.length > 0) {
                // Append this component's content container ('body') to the main vertical scroll's body
                mainSectionScrollBody.empty().append(body); // Use empty() to clear previous content
            } else {
                console.error("Lampa Scroll structure unexpected for section component: could not find .scroll__body.");
                // Fallback: append body directly to the scroll's content area
                 scroll.render().find('.scroll__content').empty().append(body);
            }


            // Add the main vertical scroll component to the plugin's main html container for THIS component
            // Check if the scroll component is already appended to html
            if (html.find('.scroll-box').length === 0) {
                 html.append(scroll.render(true));
            }


            _this.activity.loader(false);
            _this.activity.toggle();
            // Reset scroll position after building
            requestAnimationFrame(() => scroll.reset());
        };

         this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = API_BASE_URL + `/stream/movie/${id}.json`;

            _this.activity.loader(true);
            network.native(streamUrl,
                function(streamData) {
                    _this.activity.loader(false);

                    if (streamData && streamData.streams && streamData.streams.length > 0) {
                        let finalStreamUrl = streamData.streams[0].url;

                        try {
                            const url = new URL(finalStreamUrl);
                             // Apply proxy logic only if URL matches specific hostnames
                            if (url.hostname.includes('highwinds-cdn.com') ||
                                url.hostname.includes('proxy.hentai.stream')) {
                                finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                            }
                        } catch (e) {
                            console.error("URL parsing error during proxy check", e);
                            // Continue with original URL if parsing fails
                        }

                        const playerObject = {
                            title: meta.name || meta.title || 'Без названия',
                            url: finalStreamUrl,
                            poster: meta.poster || meta.background
                        };

                        if (playerObject.url) {
                            Lampa.Player.play(playerObject);
                            Lampa.Player.playlist([playerObject]);

                            const historyMeta = {
                                id: meta.id,
                                title: meta.name || meta.title,
                                poster: meta.poster || meta.background
                            };
                            Lampa.Favorite.add('history', historyMeta, 100);
                        } else {
                            Lampa.Noty.show('Не удалось получить ссылку на поток.');
                        }
                    } else {
                        Lampa.Noty.show('Потоки не найдены.');
                    }
                },
                function(errorStatus) {
                    _this.activity.loader(false);
                    console.error("Stream fetch error", errorStatus);
                    Lampa.Noty.show(`Ошибка загрузки потока: ${errorStatus}`);
                }
            );
        };


        this.empty = function (msg) {
             // Clear previous content from the scroll body
            const mainSectionScrollBody = scroll.render().find('.scroll__body');
             if (mainSectionScrollBody.length > 0) {
                 mainSectionScrollBody.empty();
             } else {
                 scroll.render().find('.scroll__content').empty();
             }

            var empty = new Lampa.Empty({ message: msg });
             // Append the empty message to the scroll body
             if (mainSectionScrollBody.length > 0) {
                 mainSectionScrollBody.append(empty.render(true));
             } else {
                  scroll.render().find('.scroll__content').append(empty.render(true));
             }


            if (html.find('.scroll-box').length === 0) {
                html.append(scroll.render(true));
            }

            this.activity.loader(false);
            this.activity.toggle();
            this.start = empty.start;
        };

        this.create = function () {
            this.fetchSection();
        };

        this.start = function () {
             // Check if this component's activity is currently active
            if (Lampa.Activity.active().activity !== this.activity) return;

            Lampa.Controller.add('content', {
                toggle: function () {
                    // Set the scrollable area as the collection source
                    Lampa.Controller.collectionSet(scroll.render());
                     // Focus the last focused element, or the first focusable if none
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: function () {
                    // Try to move left within the current collection
                    if (Navigator.canmove('left')) Navigator.move('left');
                    // If cannot move left, toggle the menu
                    else Lampa.Controller.toggle('menu');
                },
                right: function () {
                    // Move right within the current collection
                    Navigator.move('right');
                },
                up: function () {
                    // Try to move up within the current collection
                    if (Navigator.canmove('up')) Navigator.move('up');
                    // If cannot move up, toggle the head (top bar)
                    else Lampa.Controller.toggle('head');
                },
                down: function () {
                     // Move down within the current collection
                    Navigator.move('down');
                },
                back: this.back // Use the component's back method
            });

             // Switch the controller to handle content navigation
            Lampa.Controller.toggle('content');
        };

        this.pause = function () {
             // Store the last focused element when pausing
             last = Navigator.last;
             // Removed: Lampa.Controller.remove('content');
        };
        this.stop = function () {
             // Same as pause
             last = Navigator.last;
             // Removed: Lampa.Controller.remove('content');
        };
        this.render = function () { return html; }; // Return the main container element

        this.destroy = function () {
            network.clear(); // Abort network requests
            Lampa.Arrays.destroy(items); // Destroy cards

            if (scroll) {
                scroll.onEnd = null;
                scroll.destroy(); // Destroy scroll component
            }

            if (html) html.remove(); // Remove from DOM
             // Nullify references
            items = null;
            network = null;
            scroll = null;
            html = null;
            body = null;
            last = null;
        };

        this.back = function () {
             // Navigate back
            Lampa.Activity.backward();
        };
    }

    function startPlugin() {
        // Prevent multiple initialization
        if (window.plugin_hanime_catalog_ready) return;
        window.plugin_hanime_catalog_ready = true;

        // Add the card template
        Lampa.Template.add('standard-lampa-card', standardLampaCardTemplate);
        // Register the components with Lampa
        Lampa.Component.add('hanime_catalog', HanimeComponent);
        Lampa.Component.add('hanime_section', HanimeSectionComponent);

        // Function to add the plugin item to the Lampa menu
        function addMenuItem() {
            // Create the menu item element
            var menu_item = $(`
                <li class="menu__item selector">
                    <div class="menu__ico">
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">Hanime Каталог</div>
                </li>
            `);

            // Attach event listener to the menu item
            menu_item.on('hover:enter', function () {
                // Push a new activity onto the stack to show the catalog component
                Lampa.Activity.push({
                    url: '', // URL can be empty for custom components
                    title: 'Hanime Каталог',
                    component: 'hanime_catalog', // The registered component name
                    page: 1 // Initial page, if needed
                });
            });

            // Append the new menu item to the first menu list in the DOM
            // Use eq(0) to target the main menu list
            $('.menu .menu__list').eq(0).append(menu_item);
        }

        // Check if the Lampa application is already ready
        if (window.appready) {
            addMenuItem(); // Add the menu item immediately
        } else {
            // If not ready, wait for the 'app' event with type 'ready'
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') {
                    addMenuItem(); // Add the menu item when the app is ready
                }
            });
        }
    }

    // Start the plugin initialization process
    startPlugin();
})();
