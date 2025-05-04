/**
 * Lampa Plugin: Hanime Catalog
 * Description: Displays anime cards fetched from the Hanime Stremio API.
 */

(function () {
    'use strict';

    // --- Helper Functions (if needed) ---
    // Lampa framework usually provides necessary helpers.

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

        // Добавляем класс 'selector' для Lampa, чтобы элементы были доступны для навигации с пульта
        cardElement.addClass('selector');

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
        // Включаем маску и оверскролл для лучшей навигации по списку
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = [];
        var html = $('<div class="hanime-catalog"></div>');
        // Используем стандартный класс category-full для сетки карточек
        var body = $('<div class="hanime-catalog__body category-full"></div>');
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

                // Добавляем обработчики событий для взаимодействия с пульта
                cardElement.on('hover:focus', function () {
                    last = cardElement[0]; // Store the DOM element for focus restoration
                    active = items.indexOf(card); // Update active index
                    // Обновляем позицию скролла, чтобы сфокусированный элемент был виден
                    scroll.update(cardElement, true);
                }).on('hover:enter', function () {
                    // Действие при выборе карточки (нажатие Enter/OK)
                    console.log("Selected Anime:", meta.id, meta.name);
                    // Запускаем процесс получения деталей и воспроизведения
                    _this.fetchStreamAndMeta(meta.id, meta); // Передаем весь объект meta
                });

                body.append(cardElement);
                items.push(card);
            });

            scroll.append(body);
            html.append(scroll.render(true)); // Добавляем скролл с элементами в HTML контейнер
            _this.activity.loader(false); // Hide loader
            _this.activity.toggle(); // Make the activity visible and focusable
        };

        /**
         * Fetches Stream and Metadata for a specific anime ID and opens player
         * @param {string} id - The anime ID
         * @param {object} meta - The full metadata object
         */
        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id); // Might not be strictly needed if meta is passed

            _this.activity.loader(true); // Show loader while fetching stream data

            // Используем Promise.all для параллельной загрузки данных
            Promise.all([
                // Используем network.native для консистентности с другими Lampa плагинами,
                // хотя fetch тоже должен работать. Ожидаем JSON.
                new Promise((resolve, reject) => {
                    network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                }),
                 // Если метаданные уже есть (переданы из build), не фетчим их снова
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                     network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                })

            ]).then(([streamData, metaDataResponse]) => {
                 _this.activity.loader(false); // Hide loader

                 // Извлекаем метаданные, учитывая, что они могли быть переданы или получены по URL
                 const fullMetaData = metaDataResponse.meta || metaDataResponse; // API может вернуть meta в корне или внутри meta

                console.log("Stream Data:", streamData);
                console.log("Full Meta Data:", fullMetaData);


                if (streamData && streamData.streams && streamData.streams.length > 0) {
                    // Выбираем поток. Простая логика - берем первый или "лучший" по названию.
                    // Для начала возьмем первый, это надежнее без знания структуры API.
                    var streamToPlay = streamData.streams[0];

                    // Если API предоставляет информацию о качестве в названии, можно попробовать найти лучший:
                    // var streamToPlay = streamData.streams.reduce((prev, current) => {
                    //      const getQuality = (s) => {
                    //          const match = (s.name || s.title || '').match(/(\d+)/); // Ищем цифры в названии
                    //          return match ? parseInt(match[1]) : 0;
                    //      };
                    //      return getQuality(current) > getQuality(prev) ? current : prev;
                    // }, streamData.streams[0]);


                    var playerObject = {
                        title: fullMetaData.name || fullMetaData.title || 'Без названия', // Предпочитаем название из метаданных
                        url: streamToPlay.url,
                        poster: fullMetaData.poster || fullMetaData.background, // Предпочитаем постер/фон из метаданных
                        // behaviorHints могут быть важны для некоторых потоков
                        // behaviorHints: streamToPlay.behaviorHints
                    };

                    // Проверяем, что URL потока получен
                    if (playerObject.url) {
                         console.log("Launching player with:", playerObject);
                         // Lampa Player часто работает с плейлистами, даже если это один элемент
                         Lampa.Player.play(playerObject);
                         Lampa.Player.playlist([playerObject]);


                         // Опционально: Добавляем в историю просмотров Lampa
                         if (fullMetaData) {
                              // Lampa.Favorite.add('history', fullMetaData, 100);
                              // В online.txt используется object.movie для истории, адаптируем
                               const historyMeta = {
                                   id: fullMetaData.id,
                                   title: fullMetaData.name || fullMetaData.title,
                                   poster: fullMetaData.poster || fullMetaData.background,
                                   // Другие поля, которые Lampa использует для истории (опционально)
                                   runtime: fullMetaData.runtime, // если доступно
                                   year: fullMetaData.year, // если доступно
                                   original_name: fullMetaData.original_name // если доступно
                               };
                              Lampa.Favorite.add('history', historyMeta, 100);
                         }


                    } else {
                         Lampa.Noty.show('Не удалось получить ссылку на поток.');
                         console.error("Hanime Plugin: No valid stream URL found in stream data:", streamData);
                    }


                } else {
                     Lampa.Noty.show('Потоки не найдены для этого аниме.');
                     console.warn("Hanime Plugin: No streams found or invalid stream data structure:", streamData);
                }

            }).catch(error => {
                 _this.activity.loader(false);
                 console.error("Hanime Plugin: Failed to fetch stream/meta details", error);
                 // Улучшаем сообщение об ошибке для пользователя
                 Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'));
            });
        };


        /**
         * Handles empty results or errors
         * @param {string} msg - Message to display
         */
        this.empty = function (msg) {
            var empty = new Lampa.Empty({ message: msg });
            html.empty().append(empty.render(true)); // Clear previous content and show empty message
            this.activity.loader(false); // Hide loader
            this.activity.toggle(); // Make the activity visible
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
            // Убедимся, что collectionSet вызывается с правильным контейнером скролла
            Lampa.Controller.add('content', {
                toggle: function () {
                    // Устанавливаем коллекцию элементов для навигации - это элементы внутри скролла
                    Lampa.Controller.collectionSet(scroll.render());
                    // Фокусируемся на последнем выбранном элементе или первом по умолчанию
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu'); // Переход в меню
                },
                right: function () {
                    if (Navigator.canmove('right')) Navigator.move('right'); // Движение вправо по элементам
                },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up');
                     // Переход вверх, например, к фильтрам или заголовку
                     // В данном случае переходим к head, как в стандартных компонентах Lampa
                    else Lampa.Controller.toggle('head');
                },
                down: function () {
                    if (Navigator.canmove('down')) Navigator.move('down'); // Движение вниз по элементам
                },
                 // Событие Enter/OK обрабатывается слушателем 'hover:enter' на самих элементах
                 // Здесь можно добавить дополнительную логику, если нужно, но обычно это не требуется

                back: this.back // Используем метод back компонента
            });
            Lampa.Controller.toggle('content'); // Активируем контроллер для этой активности
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
                box-sizing: border-box; /* Учитываем padding и border в размере элемента */
            }
            /* Визуальное выделение при фокусе */
            .hanime-card.selector:focus {
                transform: scale(1.05); /* Увеличение при фокусировке */
                box-shadow: 0 0 15px rgba(255, 0, 0, 0.7); /* Красная тень при фокусировке */
                z-index: 5; /* Поднимаем фокусированную карточку выше других */
                border: 3px solid rgba(255, 255, 255, 0.5); /* Легкая белая рамка при фокусе */
            }
             /* Убираем рамку по умолчанию Lampa при фокусе, если она мешает */
             .hanime-card.selector.focus:not(.native) {
                 border-color: transparent;
                 outline: none;
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
            /* Убедимся, что описание не выводится - эти стили не активны, так как элемента нет в шаблоне */
            .hanime-card__description {
                display: none;
            }

            /* Базовый стиль для контейнера иконки в меню */
            .menu__ico svg {
                 width: 1.5em; /* Adjust icon size */
                 height: 1.5em; /* Adjust icon size */
            }
        `;
        Lampa.Template.add('hanime-style', `<style>${style}</style>`);

        // Define the HTML template for a single card
        // BASED ON THE PROVIDED API DATA STRUCTURE - DESCRIPTION IS COMMENTED OUT
        Lampa.Template.add('hanime-card', `
            <div class="hanime-card card layer--visible layer--render"> {/* Удален selector, добавляется в JS */}
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
                <li class="menu__item selector"> {/* Класс selector здесь нужен для элемента меню */}
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
