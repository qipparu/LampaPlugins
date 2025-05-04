(function () {
    'use strict';

    // Определяем шаблон стандартной карточки Lampa с использованием placeholders {}
    var standardLampaCardTemplate = `
        <div class="card selector">
            <div class="card__view">
                <img src="{img}" class="card__img" alt="{title}" loading="lazy" />
            </div>
            <div class="card__title">{title}</div>
        </div>
    `;

    // Функция HanimeCard
    function HanimeCard(data) {
        var cardTemplate = Lampa.Template.get('standard-lampa-card', {
            img: data.poster || '',
            title: data.name || ''
        });

        var cardElement = $(cardTemplate);

        this.render = function () {
            return cardElement;
        };

        this.destroy = function () {
            cardElement.remove();
        };
    }

    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        // Инициализируем Lampa.Scroll
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = [];
        // Основной контейнер компонента с новым уникальным классом
        var html = $('<div class="hanime-catalog-component"></div>');
        // Контейнер для карточек внутри скролла (стандартный класс Lampa)
        var body = $('<div class="category-full"></div>');
        // Контейнер для кнопок фильтров (остается прежним)
        var head = $("<div class='torrent-filter'><div class='LMEShikimori__home simple-button simple-button--filter selector'>Home</div><div class='LMEShikimori__search simple-button simple-button--filter selector'>Filter</div></div>");
        // Новый контейнер, который будет содержать сам Lampa.Scroll
        var scrollContainer = $('<div></div>').addClass('hanime-scroll-container');


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
                                body.empty();
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

            if (currentParams.page === 1) {
                 body.empty();
                 items = [];
            }

            result.forEach(function (meta) {
                var card = new HanimeCard(meta);
                var cardElement = card.render();

                cardElement.on('hover:focus', function () {
                    last = cardElement[0];
                    active = items.indexOf(card);
                    scroll.update(cardElement, true);
                }).on('hover:enter', function () {
                    console.log("Selected Anime:", meta.id, meta.name);
                    _this.fetchStreamAndMeta(meta.id, meta);
                });

                body.append(cardElement);
                items.push(card);
            });

            // Добавляем header и scrollContainer в основной html контейнер один раз
            if (html.find('.torrent-filter').length === 0) {
                 html.append(head);
            }
            // Добавляем body внутрь скролла (получаем его рендер)
             var scrollRendered = scroll.render();
             if (scrollRendered.find('.category-full').length === 0) {
                  scrollRendered.append(body);
             }

            // Добавляем scroll.render() в scrollContainer, затем scrollContainer в html
            if (scrollContainer.find('.scroll-box').length === 0) { // Проверяем, что scroll еще не добавлен
                 scrollContainer.append(scrollRendered);
            }

            if (html.find('.hanime-scroll-container').length === 0) { // Проверяем, что scrollContainer еще не добавлен
                 html.append(scrollContainer);
            }


            _this.activity.loader(false);
            _this.activity.toggle();

             scroll.onEnd = function () {
                 console.log("Reached end of scroll. Pagination is not supported by this API.");
             };
        };

        this.empty = function (msg) {
            var empty = new Lampa.Empty({ message: msg });
            // Добавляем empty внутрь body, а не прямо в scroll.render(), чтобы сохранить структуру
            body.empty().append(empty.render(true));

             var scrollRendered = scroll.render();
             if (scrollRendered.find('.category-full').length === 0) {
                  scrollRendered.append(body);
             }

             if (scrollContainer.find('.scroll-box').length === 0) {
                  scrollContainer.append(scrollRendered);
             }

            if (html.find('.hanime-scroll-container').length === 0) {
                 html.append(scrollContainer);
            }


            this.activity.loader(false);
            this.activity.toggle();
            // Переназначаем start на start от Empty компонента, чтобы работала навигация по заглушке
            this.start = empty.start;
        };

        this.create = function () {
             this.headeraction();
             this.fetchCatalog(currentParams);
        };

        this.start = function () {
             // При старте компонента, если не показана заглушка (empty),
             // устанавливаем контроллер для навигации по карточкам
            if (Lampa.Activity.active().activity !== this.activity) return;

            // Если компонент не пустой (есть карточки или идет загрузка), ставим контроллер на контент
            // Если был показан empty, его start метод уже установил свой контроллер
             if (!this.empty_state) { // Проверяем, не активна ли заглушка empty
                 Lampa.Controller.add('content', {
                     toggle: function () {
                         Lampa.Controller.collectionSet(scroll.render()); // Устанавливаем коллекцию элементов для навигации
                         // Фокусируемся на последнем элементе или на первом
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
                              // Проверяем, что фокус находится в области карточек (body)
                              if (filterButton && body[0].contains(Navigator.focused())) {
                                  Lampa.Controller.collectionFocus(filterButton);
                              } else {
                                  Navigator.move('right'); // Обычный сдвиг вправо
                              }
                         }
                     },
                     up: function () {
                         if (Navigator.canmove('up')) Navigator.move('up');
                         else {
                             // При навигации вверх с первой строки карточек, попробовать переместить фокус на кнопки в Header
                             if (body[0].contains(Navigator.focused())) {
                                  var homeButton = head.find('.LMEShikimori__home')[0];
                                   // Проверяем, что кнопка Home существует
                                   if(homeButton) Lampa.Controller.collectionFocus(homeButton);
                                   // Если кнопки нет, можно попробовать переключить на head
                                   // else Lampa.Controller.toggle('head');
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
                 Lampa.Controller.toggle('content'); // Активируем контроллер контента
             }
        };

        // Добавляем свойство, чтобы отслеживать состояние empty
        this.empty_state = false;

        // Переопределяем empty, чтобы установить empty_state и вызвать стандартный empty
        var originalEmpty = this.empty;
        this.empty = function(msg) {
            this.empty_state = true; // Устанавливаем состояние empty
            originalEmpty.call(this, msg); // Вызываем оригинальный метод empty
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
             scrollContainer = null; // Очищаем ссылку на новый контейнер
        };
        this.back = function () {
            Lampa.Activity.backward();
        };
    }

    function startPlugin() {
        if (window.plugin_hanime_catalog_ready) return;

        window.plugin_hanime_catalog_ready = true;

        Lampa.Template.add('standard-lampa-card', standardLampaCardTemplate);

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

        // Стили для новой структуры контейнеров и скролла
        $('head').append('<style>\
            /* Контейнер компонента: Flex-контейнер, занимающий всю доступную область */ \
            .hanime-catalog-component { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; } \
            /* Контейнер для скролла: Flex-элемент, который растягивается */ \
            .hanime-scroll-container { flex-grow: 1; } \
            /* Элемент, который рендерит Lampa.Scroll: Должен заполнять родителя и быть скроллируемым */ \
            .hanime-scroll-container .scroll-box { width: 100%; height: 100%; overflow: auto; } \
            /* Контейнер карточек: Добавляем padding */ \
            .category-full { padding: 1.5em; } \
            /* Выравнивание карточек */ \
            .category-full.category-full { justify-content: space-around; } \
            /* Отступ для кнопок фильтра */ \
            .torrent-filter { margin-left: 1.5em; padding-top: 1.5em; /* Добавлен небольшой отступ сверху */ } \
        </style>');


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
