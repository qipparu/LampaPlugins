(function () {
    'use strict';

    // Перенесенные шаблоны и стили карточек из 1111.txt
    // Адаптированы и переименованы. Убраны элементы типа, рейтинга, сезона, статуса.
    var hanimeShikimoriStyle = `
        .hanime-catalog__body.category-full {
            justify-content: space-around;
        }
        .hanime-shikimori-card {
            width: 185px;
            margin-bottom: 1.5em;
            border-radius: 0.5em;
            overflow: hidden;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            position: relative;
            box-sizing: border-box;
        }
        .hanime-shikimori-card.selector:focus {
            transform: scale(1.05);
            box-shadow: 0 0 15px rgba(255, 0, 0, 0.7);
            z-index: 5;
            border: 3px solid rgba(255, 255, 255, 0.5);
        }
         .hanime-shikimori-card.selector.focus:not(.native) {
             border-color: transparent;
             outline: none;
         }

        .hanime-shikimori-card__view {
            position: relative;
            height: 270px;
            background-color: rgba(255,255,255,0.05);
            border-radius: 0.5em;
            overflow: hidden;
        }
         .hanime-shikimori-card__img {
             position: absolute;
             width: 100%;
             height: 100%;
             object-fit: cover;
             border-radius: 0.5em;
         }
         .hanime-shikimori-card__title {
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
        /* Удалены стили для type, vote, season, status */

        /* Styles for header/filters from 1111.txt */
        .hanime-catalog .torrent-filter { /* Added .hanime-catalog prefix */
            margin-left:1.5em;
        }
        .hanime-catalog .simple-button--filter { /* Added .hanime-catalog prefix */
             margin-right: 1em;
             display: inline-block;
        }


        .menu__ico svg {
              width: 1.5em;
              height: 1.5em;
        }
    `;

    // Модифицированный шаблон карточки, убраны элементы type, vote, season, status
    var hanimeShikimoriCardTemplate = `
        <div class="hanime-shikimori-card card selector layer--visible layer--render">
            <div class="hanime-shikimori-card__view">
                <img src="{img}" class="hanime-shikimori-card__img" alt="{title}" loading="lazy" />
                </div>
            <div class="hanime-shikimori-card__title">{title}</div>
        </div>
    `;

    // Модифицированная функция HanimeCard, использующая новый шаблон
    function HanimeCard(data) {
        // Маппинг данных из Hanime API к полям шаблона
        var cardTemplate = Lampa.Template.get('hanime-shikimori-card', {
            // Hanime API fields: id, name, poster, year, type (string like 'movie'), score (might be present in some responses)
            id: data.id,
            img: data.poster,
            title: data.name,
            // Убраны поля type, rate, season, status из маппинга, т.к. они удалены из шаблона
        });

        var cardElement = $(cardTemplate);
        cardElement.addClass('selector');

        this.render = function () {
            return cardElement;
        };

        this.destroy = function () {
            cardElement.remove();
        };
    }

    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ step: 250 });
        var items = [];
        var html = $('<div class="hanime-catalog"></div>');
        var body = $('<div class="hanime-catalog__body category-full"></div>');
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

             // Оставляем структуру фильтров, но знаем, что только 'sort' работает с API
             filters.AnimeKindEnum = {
                 title: 'Type',
                 items: [
                     { title: "Movie", code: "movie" },
                     { title: "Series", code: "series" },
                     { title: "OVA", code: "ova" },
                     { title: "ONA", code: "ona" },
                     { title: "Special", code: "special" },
                 ]
             };

             filters.status = {
                 title: 'Status',
                 items: [
                     { title: "Planned", code: "anons" },
                     { title: "Airing", code: "ongoing" },
                     { title: "Released", code: "released" }
                 ]
             };

             filters.genre = {
                 title: 'Genre',
                 items: []
             };

             filters.sort = {
                 title: 'Sort',
                 items: [
                     { title: "Newest", code: "newset" },
                     { title: "Recent", code: "recent" },
                     { title: "Most Likes", code: "mostlikes" },
                     { title: "Most Views", code: "mostviews" },
                 ]
             };

             filters.seasons = {
                 title: 'Season',
                 items: []
             };


             function queryForHanime() {
                 var query = {};
                 // Собираем выбранную сортировку
                 filters.sort.items.forEach(function (a) {
                     if (a.selected) query.sort = a.code;
                 });
                 // Другие фильтры собираются, но не используются для API запроса
                 filters.AnimeKindEnum.items.forEach(function (a) {
                      if (a.selected) query.kind = a.code;
                 });
                 filters.status.items.forEach(function (a) {
                     if (a.selected) query.status = a.code;
                 });
                 filters.genre.items.forEach(function (a) {
                     if (a.selected) query.genre = a.id;
                 });
                 filters.seasons.items.forEach(function (a) {
                     if (a.selected) query.seasons = a.code;
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
                         filters.AnimeKindEnum,
                         filters.status,
                         filters.genre,
                         filters.seasons,
                     ],
                     onBack: function onBack() {
                         Lampa.Controller.toggle("content");
                     },
                     // !!! ИСПРАВЛЕНИЕ ОШИБКИ: Явно привязываем контекст this к функции search
                     onSelect: function onSelect(a) {
                         if (a.searchHanime) {
                             boundSearch(); // Вызываем привязанную функцию
                         } else submenu(a, mainMenu);
                     }
                 });
             }

             // Привязываем функцию search к контексту компонента сразу
             var boundSearch = (function search() {
                 var query = queryForHanime();
                 currentParams = query;
                 currentParams.page = 1;

                 items.forEach(function(item) { item.destroy(); });
                 items = [];
                 body.empty();

                 this.fetchCatalog(currentParams); // Теперь this ссылается на HanimeComponent

                 Lampa.Controller.toggle("content");
             }).bind(this); // Привязываем контекст this здесь


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

            if (scroll.render().find('.torrent-filter').length === 0) {
                 scroll.append(head);
            }
             if (scroll.render().find('.hanime-catalog__body').length === 0) {
                 scroll.append(body);
             }

            if (html.find('.scroll-box').length === 0) {
                html.append(scroll.render(true));
            }

            _this.activity.loader(false);
            _this.activity.toggle();

             // TODO: Пагинация по скроллу остается как TODO, т.к. Hanime API может не поддерживать page параметр.
             // Если API загружает весь список сразу, onEnd не должен делать повторный запрос.
             // В текущей реализации он будет пытаться загрузить "следующую страницу" по тому же URL, что может привести к бесконечной загрузке или ошибкам.
             // Если API действительно не поддерживает пагинацию, этот onEnd нужно отключить или изменить логику.
             scroll.onEnd = function () {
                 // Убрано увеличение page++, т.к. API не поддерживает пагинацию.
                 // Вместо этого можно просто показать сообщение или ничего не делать.
                 console.log("Reached end of scroll.");
                 // Lampa.Noty.show("Конец списка"); // Можно добавить уведомление
                 // _this.activity.loader(false); // Убираем лоадер, если был
                 // Lampa.Controller.toggle('content'); // Возвращаемся к управлению
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
                    Lampa.Controller.collectionSet(scroll.render());
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
                         if (filterButton && last && body[0].contains(Navigator.focused())) { // Проверяем, что фокус на карточке
                              Lampa.Controller.collectionFocus(filterButton);
                         } else {
                             // Если не на карточке или нет кнопки фильтра, пробуем обычный move right
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
                scroll.onEnd = null; // Убираем обработчик onEnd при уничтожении
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
            currentParams = null; // Очищаем параметры
        };
        this.back = function () {
            Lampa.Activity.backward();
        };
    }

    function startPlugin() {
        if (window.plugin_hanime_catalog_ready) return;

        window.plugin_hanime_catalog_ready = true;

        Lampa.Template.add('hanime-shikimori-style', hanimeShikimoriStyle);
        Lampa.Template.add('hanime-shikimori-card', hanimeShikimoriCardTemplate);

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

        $('head').append(Lampa.Template.get('hanime-shikimori-style', {}, true));

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
