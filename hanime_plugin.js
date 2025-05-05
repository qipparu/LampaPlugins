(function () {
    'use strict';

    function HanimeCard(data) {
        var cardTemplate = Lampa.Template.get('hanime-card', {
            id: data.id,
            img: data.poster,
            title: data.name,
        });
        var cardElement = $(cardTemplate);
        // Класс selector уже должен быть в шаблоне
        this.render = function () {
            return cardElement;
        };
        this.destroy = function () {
            cardElement.remove();
        };
    }

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
        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";

        var PROXY_BASE_URL = "http://77.91.78.5:3000";


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
            scroll.minus();

            body.empty(); // Очищаем контейнер
            items = []; // Очищаем массив элементов

            result.forEach(function (meta) {
                var card = new HanimeCard(meta);
                var cardElement = card.render();

                cardElement.on('hover:focus', function () {
                    last = cardElement[0];
                    active = items.indexOf(card);
                    // Обновляем скролл, прокручивая к этому конкретному элементу
                    scroll.update(cardElement, true);
                }).on('hover:enter', function () {
                    console.log("Selected Anime:", meta.id, meta.name);
                    _this.fetchStreamAndMeta(meta.id, meta);
                });

                body.append(cardElement);
                items.push(card);
            });

            scroll.append(body); // Добавляем body в скролл

            // Важно: html теперь содержит сам скролл, а не body напрямую.
            // Передаем true для пересчета после добавления содержимого body.
            html.empty().append(scroll.render(true));

            _this.activity.loader(false);
            _this.activity.toggle();

            // --- Удален setTimeout из build ---
            // Логика начального скролла перемещена в start
        };

        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

            _this.activity.loader(true);

            Promise.all([
                new Promise((resolve, reject) => {
                    network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                }),
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                     network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                 })
            ]).then(([streamData, metaDataResponse]) => {
                _this.activity.loader(false);
                const fullMetaData = metaDataResponse.meta || metaDataResponse;

                console.log("Stream Data:", streamData);
                console.log("Full Meta Data:", fullMetaData);

                if (streamData && streamData.streams && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0];
                    var finalStreamUrl = streamToPlay.url;

                    try {
                         var url = new URL(finalStreamUrl);
                         if (url.hostname.includes('highwinds-cdn.com')) {
                             finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                             console.log("Original stream URL proxied:", finalStreamUrl);
                         }
                    } catch (e) {
                        console.error("Hanime Plugin: Failed to parse or proxy stream URL", e);
                    }

                    var playerObject = {
                        title: fullMetaData.name || fullMetaData.title || 'Без названия',
                        url: finalStreamUrl,
                        poster: fullMetaData.poster || fullMetaData.background,
                    };

                    if (playerObject.url) {
                         console.log("Launching player with:", playerObject);
                         Lampa.Player.play(playerObject);
                         Lampa.Player.playlist([playerObject]);

                         if (fullMetaData) {
                                const historyMeta = {
                                    id: fullMetaData.id,
                                    title: fullMetaData.name || fullMetaData.title,
                                    poster: fullMetaData.poster || fullMetaData.background,
                                    runtime: fullMetaData.runtime,
                                    year: fullMetaData.year,
                                    original_name: fullMetaData.original_name
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
                Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'));
            });
        };

        this.empty = function (msg) {
            var empty = new Lampa.Empty({ message: msg });
            html.empty().append(empty.render(true));
            this.activity.loader(false);
            this.activity.toggle();
            this.start = empty.start;
        };

        this.create = function () {
            this.activity.loader(true);
            this.fetchCatalog();
        };

        this.start = function () {
            if (Lampa.Activity.active().activity !== this.activity) return;

            Lampa.Controller.add('content', {
                toggle: function () {
                    // Передаем контроллеру контейнер скролла для поиска селекторов
                    Lampa.Controller.collectionSet(scroll.render());
                    // Устанавливаем фокус на последний активный элемент или на первый
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function () {
                    if (Navigator.canmove('right')) Navigator.move('right');
                },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function () {
                    if (Navigator.canmove('down')) Navigator.move('down');
                },
                back: this.back
            });
            // Активируем контроллер
            Lampa.Controller.toggle('content');

            // --- Потенциальное исправление скролла: Явное обновление после установки контроллера ---
            // Небольшая задержка, чтобы контроллер успел определить начальный фокус и Lampa обновила DOM
             setTimeout(function() {
                 // Получаем элемент, на котором установил фокус Lampa.Controller
                 var focusedElement = Lampa.Controller.item();
                 if (focusedElement) {
                     // Прокручиваем скролл к этому элементу
                     scroll.update($(focusedElement), true);
                 } else if (items.length > 0) {
                      // Fallback: Если контроллер почему-то не установил фокус (крайне маловероятно),
                      // фокусируемся и прокручиваем к первому элементу вручную
                      var firstCardElement = items[0].render();
                       Lampa.Controller.collectionFocus(firstCardElement[0], scroll.render());
                       scroll.update(firstCardElement, true);
                 }
             }, 50); // Задержка остается для надежности
            // ------------------------------------------------------------------------------------
        };

        this.pause = function () {
        };

        this.stop = function () {
        };

        this.render = function () {
            // Возвращаем корневой DOM элемент компонента (содержащий скролл)
            return html;
        };

        this.destroy = function () {
            console.log("Hanime Plugin: Destroying component");
            network.clear();
            Lampa.Arrays.destroy(items);
            scroll.destroy(); // Важно уничтожить инстанс скролла
            html.remove(); // Удаляем основной DOM элемент
            // Обнуляем ссылки
            items = null;
            network = null;
            scroll = null;
            html = null;
            body = null;
            last = null;
        };

        this.back = function () {
            Lampa.Activity.backward();
        };
    }

    function startPlugin() {
        if (window.plugin_hanime_catalog_ready) return;
        window.plugin_hanime_catalog_ready = true;

        // Добавляем CSS стили
        var style = `
            .hanime-catalog__body.category-full {
                justify-content: space-around;
                padding: 20px; /* Отступы */
            }
            .hanime-card {
                width: 185px;
                margin: 0 10px 1.5em 10px; /* Отступы */
                border-radius: 0.5em;
                overflow: hidden;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                position: relative;
                box-sizing: border-box;
            }
            /* Стиль фокуса */
            .hanime-card.selector:focus {
                transform: scale(1.05);
                box-shadow: 0 0 15px rgba(255, 0, 0, 0.7);
                z-index: 5;
                border: 3px solid rgba(255, 255, 255, 0.5);
            }
             .hanime-card.selector.focus:not(.native) {
                 border-color: transparent;
                 outline: none;
             }

            .hanime-card__view {
                position: relative;
                height: 270px;
                background-color: rgba(255,255,255,0.05);
                border-radius: 0.5em;
                overflow: hidden;
            }
             .hanime-card__img {
                 position: absolute;
                 width: 100%;
                 height: 100%;
                 object-fit: cover;
                 border-radius: 0.5em;
             }
             .hanime-card__title {
                 margin-top: 0.5em;
                 padding: 0 0.5em;
                 font-size: 1em;
                 font-weight: bold;
                 white-space: nowrap;
                 overflow: hidden;
                 text-overflow: ellipsis;
                 text-align: center;
                 color: #fff;
             }
            .hanime-card__description {
                display: none;
            }

            .menu__ico svg {
                  width: 1.5em;
                  height: 1.5em;
            }
        `;
        Lampa.Template.add('hanime-style', `<style>${style}</style>`);

        // Шаблон карточки
        Lampa.Template.add('hanime-card', `
            <div class="hanime-card card selector layer--visible layer--render">
                <div class="hanime-card__view">
                    <img src="{img}" class="hanime-card__img" alt="{title}" loading="lazy" />
                </div>
                <div class="hanime-card__title">{title}</div>
            </div>
        `);

        // Регистрация компонента
        Lampa.Component.add('hanime_catalog', HanimeComponent);

        // Добавление пункта меню
        function addMenuItem() {
             if ($('.menu .menu__list .menu__text:contains("Hanime Catalog")').length > 0) {
                 console.log("Hanime Plugin: Menu item already exists.");
                 return;
             }

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
                Lampa.Activity.push({
                    url: '',
                    title: 'Hanime Catalog',
                    component: 'hanime_catalog',
                    page: 1
                });
            });
            $('.menu .menu__list').eq(0).append(menu_item);
             console.log("Hanime Plugin: Menu item added.");
        }

        // Добавляем стили
        $('head').append(Lampa.Template.get('hanime-style', {}, true));

        // Ждем готовности приложения
        if (window.appready) {
             addMenuItem();
        } else {
             Lampa.Listener.follow('app', function (e) {
                 if (e.type === 'ready') {
                     addMenuItem();
                 }
             });
        }
         console.log("Hanime Plugin: Started.");
    }

    startPlugin();

})();
