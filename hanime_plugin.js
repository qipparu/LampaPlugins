(function () {

    'use strict';



    // Удаляем кастомные стили из 1111.txt

    // var hanimeShikimoriStyle = ` ... `;



    // Определяем шаблон стандартной карточки Lampa с использованием placeholders {}

    var standardLampaCardTemplate = `

        <div class="card selector">

            <div class="card__view">

                <img src="{img}" class="card__img" alt="{title}" loading="lazy" />

            </div>

            <div class="card__title">{title}</div>

        </div>

    `;



    // Модифицированная функция HanimeCard, использующая Lampa.Template.get

    function HanimeCard(data) {

        // Используем Lampa.Template.get для правильной подстановки данных в шаблон

        var cardTemplate = Lampa.Template.get('standard-lampa-card', {

            img: data.poster || '', // Используем пустую строку, если poster нет

            title: data.name || ''  // Используем пустую строку, если name нет

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

        // Вернули параметры mask: true и over: true для Lampa.Scroll

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

        var currentParams = componentObject || { page: 1 };



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

                         main();

                     }

                 });

             }



             function mainMenu() {

                 for (var i in filters) selected(filters[i]);

                 Lampa.Select.show({

                     title: 'Filters',

                     items: [

                         { title: Lampa.Lang.translate('search_start'), searchHanime: true },

                         filters.sort,

                     ],

                     onBack: function onBack() {

                         Lampa.Controller.toggle("content");

                     },

                     onSelect: function onSelect(a) {

                         if (a.searchHanime) {

                             boundSearch();

                         } else submenu(a, mainMenu);

                     }

                 });

             }



             var boundSearch = (function search() {

                 var query = queryForHanime();

                 currentParams = query;

                 currentParams.page = 1;



                 items.forEach(function(item) { item.destroy(); });

                 items = [];

                 body.empty();



                 this.fetchCatalog(currentParams);



                 Lampa.Controller.toggle("content");

             }).bind(this);





             var serverElement = head.find('.LMEShikimori__search');

             serverElement.on('hover:enter', function () {

                 mainMenu();

             });



             var homeElement = head.find('.LMEShikimori__home');

             homeElement.on('hover:enter', function () {

                 currentParams = { page: 1 };

                 items.forEach(function(item) { item.destroy(); });

                 items = [];

                 body.empty();

                 this.fetchCatalog(currentParams);

                 Lampa.Controller.toggle("content");

             }.bind(this));

         };





        this.fetchCatalog = function (params) {

            var _this = this;

            _this.activity.loader(true);



            network.clear();



            var sortKey = params && params.sort ? params.sort : 'newset';

            var catalogUrl = CATALOG_URLS[sortKey] || DEFAULT_CATALOG_URL;



            console.log("Fetching catalog from:", catalogUrl);



            network.native(catalogUrl,

                function (data) {

                    if (data && data.metas && Array.isArray(data.metas)) {

                         if (data.metas.length > 0) {

                             if (params.page === 1) {

                                items.forEach(function(item) { item.destroy(); });

                                items = [];

                                body.empty(); // Очищаем DOM контейнер перед добавлением новых карточек

                            }

                            _this.build(data.metas);



                         } else {

                             if (params.page === 1) {

                                _this.empty("Каталог пуст по выбранным фильтрам.");

                             } else {

                                Lampa.Noty.show("Конец списка");

                                _this.activity.loader(false);

                                Lampa.Controller.toggle('content');

                             }

                         }

                    } else {

                         if (params.page === 1) {

                             _this.empty("Неверный формат данных от API или каталог пуст.");

                         } else {

                              Lampa.Noty.show("Ошибка при загрузке данных.");

                             _this.activity.loader(false);

                             console.error("Hanime Plugin: Invalid data format on scroll end", data);

                             Lampa.Controller.toggle('content');

                         }

                         console.error("Hanime Plugin: Invalid data format", data);

                    }

                },

                function (errorStatus, errorText) {

                    if (params.page === 1) {

                        _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);

                    } else {

                         Lampa.Noty.show("Ошибка загрузки следующей страницы: " + errorStatus);

                         _this.activity.loader(false);

                         Lampa.Controller.toggle('content');

                    }

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



            // При загрузке первой страницы (или смене фильтров) очищаем существующие карточки и DOM

            if (currentParams.page === 1) {

                 body.empty();

                 items = [];

            }



            result.forEach(function (meta) {

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

                    _this.fetchStreamAndMeta(meta.id, meta); // Вызываем загрузку потока

                });



                // Добавляем элемент карточки в контейнер body

                body.append(cardElement);

                items.push(card); // Добавляем объект карточки в массив items

            });



            // Проверяем, добавлены ли header и body в scroll, добавляем один раз

            if (scroll.render().find('.torrent-filter').length === 0) {

                 scroll.append(head);

            }

             if (scroll.render().find('.category-full').length === 0) {

                 scroll.append(body);

             }



            // Проверяем, добавлен ли scroll в основной html контейнер, добавляем один раз

            if (html.find('.scroll-box').length === 0) {

                html.append(scroll.render(true));

            }



            // После добавления всех элементов и настройки DOM, сообщаем Lampa о завершении загрузки

            _this.activity.loader(false);

            _this.activity.toggle();



             // Логика пагинации по скроллу отключена (см. комментарии в fetchCatalog)

             scroll.onEnd = function () {

                 console.log("Reached end of scroll. Pagination is not supported by this API.");

                 // Lampa.Noty.show("Конец списка");

             };

        };



        this.fetchStreamAndMeta = function (id, meta) {

            var _this = this;

            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);



            _this.activity.loader(true);



            network.native(streamUrl,

                function(streamData) {

                     _this.activity.loader(false);



                     const fullMetaData = meta;



                     console.log("Stream Data:", streamData);

                     console.log("Full Meta Data:", fullMetaData);



                     if (streamData && streamData.streams && streamData.streams.length > 0) {

                         var streamToPlay = streamData.streams[0];



                         var finalStreamUrl = streamToPlay.url;

                         try {

                              var url = new URL(finalStreamUrl);

                              if (url.hostname.includes('highwinds-cdn.com') || url.hostname.includes('proxy.hentai.stream')) {

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



                },

                 function(errorStatus, errorText) {

                      _this.activity.loader(false);

                      console.error("Hanime Plugin: Failed to fetch stream details", errorStatus, errorText);

                      Lampa.Noty.show('Ошибка загрузки потока: ' + errorStatus);

                 },

                 false,

                 {

                     dataType: 'json',

                     timeout: 10000

                 }

            );

        };



        this.empty = function (msg) {

            var empty = new Lampa.Empty({ message: msg });

            scroll.render().empty().append(empty.render(true));



            if (html.find('.scroll-box').length === 0) {

                 html.append(scroll.render(true));

            }



            this.activity.loader(false);

            this.activity.toggle();

            this.start = empty.start;

        };



        this.create = function () {

             this.headeraction();

             this.fetchCatalog(currentParams);

        };



        this.start = function () {

            if (Lampa.Activity.active().activity !== this.activity) return;

            Lampa.Controller.add('content', {

                toggle: function () {

                    // Установка коллекции элементов для навигации стрелками

                    // Lampa автоматически найдет все элементы с классом 'selector' внутри scroll.render()

                    Lampa.Controller.collectionSet(scroll.render());

                    // Фокусировка на последнем активном элементе или первом (по умолчанию Navigator.focus)

                    // last хранит последний элемент, на который был наведен фокус в build -> hover:focus

                    Lampa.Controller.collectionFocus(last || false, scroll.render());

                },

                left: function () {

                    if (Navigator.canmove('left')) Navigator.move('left');

                    else Lampa.Controller.toggle('menu');

                },

                right: function () {

                    if (Navigator.canmove('right')) Navigator.move('right');

                    else {

                        var filterButton = head.find('.LMEShikimori__search')[0];

                         if (filterButton && last && body[0].contains(Navigator.focused())) {

                              Lampa.Controller.collectionFocus(filterButton);

                         } else {

                             Navigator.move('right');

                         }

                    }

                },

                up: function () {

                    if (Navigator.canmove('up')) Navigator.move('up');

                    else {

                         if (body[0].contains(Navigator.focused())) {

                             var homeButton = head.find('.LMEShikimori__home')[0];

                              if(homeButton) Lampa.Controller.collectionFocus(homeButton);

                         } else {

                             Lampa.Controller.toggle('head');

                         }

                    }

                },

                down: function () {

                    if (Navigator.canmove('down')) Navigator.move('down');

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

            Lampa.Arrays.destroy(items);

            if (scroll) {

                scroll.onEnd = null;

                scroll.destroy();

            }

            if (html) html.remove();

            items = null;

            network = null;

            scroll = null;

            html = null;

            body = null;

            head = null;

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



        // Регистрируем стандартный шаблон карточки с помощью Lampa.Template.add

        Lampa.Template.add('standard-lampa-card', standardLampaCardTemplate);



        // Стандартные стили Lampa для карточек и выделения должны работать автоматически

        // при использовании классов 'card' и 'selector'.



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

                    page: 1

                });

            });

            $('.menu .menu__list').eq(0).append(menu_item);

        }



        // Применяем любые необходимые общие стили, если есть

        // Например, если для torrent-filter нужен специфичный margin-left

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
