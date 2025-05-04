(function () {
    'use strict';

    // Используем стандартный шаблон карточки Lampa с использованием placeholders {}
    var standardLampaCardTemplate = `
        <div class="card selector">
            <div class="card__view">
                <img src="{img}" class="card__img" alt="{title}" loading="lazy" />
            </div>
            <div class="card__title">{title}</div>
        </div>
    `;

    // Модифицированная функция HanimeCard, использующая Lampa.Template.get и стандартный шаблон
    function HanimeCard(data) {
        // Используем Lampa.Template.get для правильной подстановки данных в шаблон
        // Убедимся, что передаем данные, которые ожидает стандартный шаблон
        var cardTemplate = Lampa.Template.get('standard-lampa-card', {
            img: data.poster || '', // Используем poster или пустую строку
            title: data.name || data.title || ''  // Используем name, title или пустую строку
        });

        var cardElement = $(cardTemplate);
        // Класс 'selector' уже добавлен в шаблоне standardLampaCardTemplate

        this.render = function () {
            return cardElement;
        };

        this.destroy = function () {
            cardElement.remove();
        };
    }

    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        // Используем Lampa.Scroll со стандартными параметрами
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = [];
        // Используем простой div как основной контейнер
        var html = $('<div></div>');
        // Используем стандартный класс category-full для контейнера карточек
        var body = $('<div class="category-full"></div>');
         // Перенесен HTML заголовка с кнопками фильтрации
        var head = $("<div class='torrent-filter'><div class='LMEShikimori__home simple-button simple-button--filter selector'>Home</div><div class='LMEShikimori__search simple-button simple-button--filter selector'>Filter</div></div>");


        var active = 0;
        var last;
        var currentParams = componentObject || { page: 1, sort: 'newset' }; // Устанавливаем дефолтный sort

        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URLS = {
             newset: API_BASE_URL + "/catalog/movie/newset.json",
             recent: API_BASE_URL + "/catalog/movie/recent.json",
             mostlikes: API_BASE_URL + "/catalog/movie/mostlikes.json",
             mostviews: API_BASE_URL + "/catalog/movie/mostviews.json",
        };
        var DEFAULT_CATALOG_URL = CATALOG_URLS.newset;

        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";
        var PROXY_BASE_URL = "http://77.91.78.5:3000";


        this.headeraction = function () {
             var filters = {};

             filters.sort = {
                 title: 'Sort',
                 items: [
                     { title: "Newest", code: "newset" },
                     { title: "Recent", code: "recent" },
                     { title: "Most Likes", code: "mostlikes" },
                     { title: "Most Views", code: "mostviews" },
                 ]
             };

             // Устанавливаем текущий выбранный фильтр при открытии меню
             filters.sort.items.forEach(item => {
                 if (item.code === currentParams.sort) {
                     item.selected = true;
                 }
             });


             function queryForHanime() {
                 var query = {};
                 filters.sort.items.forEach(function (a) {
                     if (a.selected) query.sort = a.code;
                 });
                 return query;
             }

             function selected(where) {
                 var title = [];
                 where.items.forEach(function (a) {
                     if (a.selected || a.checked) title.push(a.title);
                 });
                 where.subtitle = title.length ? title.join(', ') : Lampa.Lang.translate('nochoice');
             }

             function select(where, a) {
                 where.forEach(function (element) {
                     element.selected = false;
                 });
                 a.selected = true;
             }

             function submenu(item, main) {
                 Lampa.Select.show({
                     title: item.title,
                     items: item.items,
                     onBack: main,
                     onSelect: function onSelect(a) {
                         select(item.items, a);
                         main(); // Возвращаемся в основное меню фильтров
                     }
                 });
             }

             function mainMenu() {
                 for (var i in filters) selected(filters[i]);
                 Lampa.Select.show({
                     title: 'Filters',
                     items: [
                         // { title: Lampa.Lang.translate('search_start'), searchHanime: true }, // Поиск отключен
                         filters.sort,
                     ],
                     onBack: function onBack() {
                         Lampa.Controller.toggle("content"); // Возвращаемся к контенту при закрытии меню
                     },
                     onSelect: function onSelect(a) {
                         // if (a.searchHanime) {
                         //     boundSearch();
                         // } else
                         if (a.items) { // Если это пункт с подменю (например, Sort)
                             submenu(a, mainMenu);
                         } else { // Если это выбор в подменю
                             // После выбора фильтра (Sort), применяем его и обновляем каталог
                             var query = queryForHanime();
                             currentParams = query;
                             currentParams.page = 1; // Сбрасываем страницу при смене фильтра

                             // Очистка и загрузка нового каталога произойдет в fetchCatalog при page: 1
                             this.fetchCatalog(currentParams);

                             Lampa.Controller.toggle("content"); // Возвращаемся к контенту
                         }
                     }.bind(this) // Биндим контекст HanimeComponent
                 });
             }


             var serverElement = head.find('.LMEShikimori__search');
             serverElement.on('hover:enter', function () {
                 mainMenu.call(this); // Биндим контекст HanimeComponent при вызове mainMenu
             }.bind(this)); // Биндим контекст HanimeComponent к обработчику

             var homeElement = head.find('.LMEShikimori__home');
             homeElement.on('hover:enter', function () {
                 currentParams = { page: 1, sort: 'newset' }; // Сброс на дефолтный Home
                 items.forEach(function(item) { item.destroy(); });
                 items = [];
                 body.empty();
                 this.fetchCatalog(currentParams);
                 Lampa.Controller.toggle("content");
             }.bind(this)); // Биндим контекст HanimeComponent
         };


        this.fetchCatalog = function (params) {
            var _this = this;
            _this.activity.loader(true);

            network.clear();

            // Выбираем URL каталога на основе параметра sort
            var sortKey = params && params.sort ? params.sort : 'newset';
            var catalogUrl = CATALOG_URLS[sortKey] || CATALOG_URLS.newset; // Fallback на newset

            console.log("Fetching catalog from:", catalogUrl);

            network.native(catalogUrl,
                function (data) {
                    console.log("Catalog Data Received:", data); // Лог для проверки полученных данных
                    if (data && data.metas && Array.isArray(data.metas)) {
                         if (data.metas.length > 0) {
                             // Всегда очищаем body и items при загрузке, т.к. пагинации нет
                             items.forEach(function(item) { item.destroy(); });
                             items = [];
                             body.empty();

                             _this.build(data.metas);

                         } else {
                             _this.empty("Каталог пуст по выбранным фильтрам.");
                         }
                    } else {
                         _this.empty("Неверный формат данных от API или каталог пуст.");
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

            console.log("Building cards for", result.length, "items."); // Лог количества элементов для построения

            // При загрузке новой порции данных (при page: 1 или смене фильтра),
            // body уже очищен в fetchCatalog. Добавляем элементы.
            result.forEach(function (meta) {
                // console.log("Processing meta:", meta); // Лог каждого элемента meta перед созданием карточки (можно раскомментировать для детальной отладки)
                var card = new HanimeCard(meta);
                var cardElement = card.render();

                // Добавляем обработчики событий hover:focus и hover:enter
                cardElement.on('hover:focus', function () {
                    last = cardElement[0]; // Сохраняем последний сфокусированный элемент
                    active = items.indexOf(card); // Сохраняем индекс активной карточки
                    // Обновляем положение скролла, чтобы активный элемент был виден
                    scroll.update(cardElement, true);
                }).on('hover:enter', function () {
                    console.log("Selected Anime:", meta.id, meta.name);
                     // Передаем полное meta при вызове fetchStreamAndMeta
                    _this.fetchStreamAndMeta(meta.id, meta); // Вызываем загрузку потока
                });

                // Добавляем элемент карточки в контейнер body
                body.append(cardElement);
                items.push(card); // Добавляем объект карточки в массив items
            });

            // После добавления всех элементов, сообщаем Lampa о завершении загрузки
            _this.activity.loader(false);
            _this.activity.toggle();

             // Логика пагинации по скроллу отключена (см. комментарии в fetchCatalog)
             scroll.onEnd = function () {
                 console.log("Reached end of scroll. Pagination is not supported by this API.");
                 Lampa.Noty.show("Конец списка"); // Уведомляем пользователя
             };
        };

        // Метод fetchStreamAndMeta из рабочей версии с Promise.all и проксированием
        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);


            _this.activity.loader(true);

            // Используем Promise.all для одновременной загрузки потока и метаданных
            Promise.all([
                new Promise((resolve, reject) => {
                    network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                }),
                // Если метаданные уже есть (переданы из build), не фетчим их заново
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
                         // Проксируем только определенные домены
                         if (url.hostname.includes('highwinds-cdn.com') || url.hostname.includes('proxy.hentai.stream')) {
                             finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                             console.log("Original stream URL proxied:", finalStreamUrl);
                         } else {
                             console.log("Stream URL not proxied:", finalStreamUrl);
                         }
                    } catch (e) {
                        console.error("Hanime Plugin: Failed to parse or proxy stream URL", e);
                        // Используем оригинальную ссылку, если парсинг не удался
                        console.log("Using original stream URL due to parsing error:", streamToPlay.url);
                        finalStreamUrl = streamToPlay.url;
                    }


                    var playerObject = {
                        title: fullMetaData.name || fullMetaData.title || 'Без названия',
                        url: finalStreamUrl, // Используем URL после возможного проксирования
                        poster: fullMetaData.poster || fullMetaData.background,
                    };

                    if (playerObject.url) {
                         console.log("Launching player with:", playerObject);
                         Lampa.Player.play(playerObject);
                         Lampa.Player.playlist([playerObject]);

                         if (fullMetaData) {
                                // Сохраняем в историю с дополнительными полями
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
            // Очищаем scroll и добавляем сообщение об отсутствии контента
            scroll.render().empty().append(empty.render(true));

            // Убедимся, что scroll добавлен в html, если еще не был (добавляется в create)
             if (html.find('.scroll-box').length === 0) {
                  html.append(scroll.render(true));
             }

            this.activity.loader(false);
            this.activity.toggle();
            // Сбрасываем last, так как нет элементов для фокуса
            last = null;
             // Если есть сообщение "пусто", возможно, имеет смысл сфокусироваться на нем
            // this.start = empty.start; // Это может быть полезно
        };

        // --- СТРУКТУРА DOM СОЗДАЕТСЯ ОДИН РАЗ ЗДЕСЬ ---
        this.create = function () {
             // Создаем базовую структуру DOM один раз при создании компонента
             scroll.append(head);
             scroll.append(body); // body изначально пустой
             html.append(scroll.render(true));

             this.headeraction(); // Инициализируем действия хедера
             this.fetchCatalog(currentParams); // Начинаем загрузку каталога
        };


        this.start = function () {
            if (Lampa.Activity.active().activity !== this.activity) return;

            // Обновляем коллекцию элементов для контроллера перед фокусировкой
            Lampa.Controller.collectionSet(scroll.render());

            Lampa.Controller.add('content', {
                toggle: function () {
                    // Фокусировка на последнем активном элементе, первом элементе или хедере, если элементов нет
                     var target = last && $(last).closest('.selector').length ? last : (items.length > 0 ? items[0].render()[0] : false);
                     if (target) {
                         Lampa.Controller.collectionFocus(target, scroll.render());
                     } else {
                         // Если элементов нет (например, при сообщении empty), фокусируемся на первом элементе хедера
                         var firstHeaderElement = head.find('.selector')[0];
                         if(firstHeaderElement) Lampa.Controller.collectionFocus(firstHeaderElement, scroll.render());
                         else Lampa.Controller.clear(); // Если даже хедера нет, очищаем контроллер
                     }
                },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function () {
                    // Если фокус на карточке, пробуем сдвинуть вправо.
                    // Если на последней карточке справа, пробуем перейти на кнопку фильтра.
                    if (body[0].contains(Navigator.focused())) {
                         if (Navigator.canmove('right')) Navigator.move('right');
                         else {
                             var filterButton = head.find('.LMEShikimori__search')[0];
                              if (filterButton) Lampa.Controller.collectionFocus(filterButton);
                         }
                    } else {
                        // Если фокус не на карточке (вероятно, на кнопке хедера), пробуем сдвинуть вправо
                         if (Navigator.canmove('right')) Navigator.move('right');
                    }
                },
                up: function () {
                    // Если фокус на карточке, пробуем сдвинуть вверх.
                    // Если в верхнем ряду карточек, пробуем перейти на кнопку Home.
                    if (body[0].contains(Navigator.focused())) {
                        if (Navigator.canmove('up')) Navigator.move('up');
                        else {
                             var homeButton = head.find('.LMEShikimori__home')[0];
                              if(homeButton) Lampa.Controller.collectionFocus(homeButton);
                        }
                    } else {
                        // Если фокус не на карточке (вероятно, на кнопке хедера), пробуем сдвинуть вверх
                        if (Navigator.canmove('up')) Navigator.move('up');
                        else Lampa.Controller.toggle('head'); // Если не можем сдвинуть в хедере, переходим на activity head
                    }
                },
                down: function () {
                     // Если фокус на хедере, пробуем сдвинуть вниз на первую карточку
                     if (head[0].contains(Navigator.focused())) {
                         var firstCardElement = body.find('.selector')[0];
                         if(firstCardElement) Lampa.Controller.collectionFocus(firstCardElement);
                         else Navigator.move('down'); // Если карточек нет, пробуем просто сдвинуть вниз
                     } else {
                        // Если фокус на карточке, пробуем сдвинуть вниз
                        if (Navigator.canmove('down')) Navigator.move('down');
                     }
                },
                back: this.back
            });
            Lampa.Controller.toggle('content');
        };

        this.pause = function () {
        };
        this.stop = function () {
        };
        this.render = function () {
            return html;
        };
        this.destroy = function () {
            network.clear();
            // Correctly destroy each item
            items.forEach(function(item) {
                if (item && item.destroy) item.destroy();
            });
            items = []; // Очищаем массив после уничтожения элементов

            if (scroll) {
                scroll.onEnd = null;
                scroll.destroy();
            }
             if (html) html.remove();

            // Nullify references to help garbage collection
            network = null;
            scroll = null;
            html = null;
            body = null;
            head = null; // Не забываем очищать head
            last = null;
            currentParams = null;
        };
        this.back = function () {
            Lampa.Activity.backward();
        };
    }

    function startPlugin() {
        if (window.plugin_hanime_catalog_ready) return;

        window.plugin_hanime_catalog_ready = true;

        // Регистрируем стандартный шаблон карточки Lampa
        Lampa.Template.add('standard-lampa-card', standardLampaCardTemplate);

        // Стандартные стили Lampa для карточек и выделения должны работать автоматически
        // при использовании классов 'card' и 'selector', а также category-full.

        Lampa.Component.add('hanime_catalog', HanimeComponent);

        function addMenuItem() {
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
                    page: 1 // Передаем page: 1 для первой загрузки
                });
            });
            $('.menu .menu__list').eq(0).append(menu_item);
        }

        // Применяем минимальный необходимый стиль для хедера
         $('head').append('<style>.torrent-filter{margin-left:1.5em;}</style>');


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

    startPlugin();

})();
