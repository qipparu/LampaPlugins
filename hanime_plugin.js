(function () {
    'use strict';

    // Перенесенные шаблоны и стили карточек из 1111.txt
    // Переименованы, чтобы избежать конфликтов и показать происхождение/цель
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
        .hanime-shikimori-card__description {
            display: none;
        }

        /* Styles for Type, Rate, Season, Status from 1111.txt, adapted */
        .hanime-shikimori-card__type {
            position: absolute;
            left: 0.8em; /* Adjusted position */
            top: 0.8em; /* Adjusted position */
            padding: .2em .4em; /* Reduced padding */
            background:#ff4242;
            color:#fff;
            font-size:.7em; /* Reduced font size */
            border-radius:.3em;
            z-index: 2; /* Ensure it's above the image */
        }
        .hanime-shikimori-card__vote {
             position: absolute;
             right: 0.8em; /* Adjusted position */
             top: 0.8em; /* Adjusted position */
             padding: .2em .4em; /* Reduced padding */
             background: rgba(0, 0, 0, 0.7); /* Dark background */
             color: #fff;
             font-size: .7em; /* Reduced font size */
             border-radius: .3em;
             z-index: 2; /* Ensure it's above the image */
        }
        .hanime-shikimori-card__season {
            position:absolute;
            left:-0.8em;
            top:3.4em;
            padding:.4em .4em;
            background:#05f;
            color:#fff;
            font-size:.8em;
            border-radius:.3em;
            z-index: 2; /* Ensure it's above the image */
        }
        .hanime-shikimori-card__status {
            position:absolute;
            left:-0.8em;
            bottom:1em;
            padding:.4em .4em;
            background:#ffe216;
            color:#000;
            font-size:.8em;
            border-radius:.3em;
            z-index: 2; /* Ensure it's above the image */
        }
        .hanime-shikimori-card__season.no-season { /* This class might not be needed if data is always mapped */
            display: none;
        }

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

    var hanimeShikimoriCardTemplate = `
        <div class="hanime-shikimori-card card selector layer--visible layer--render">
            <div class="hanime-shikimori-card__view">
                <img src="{img}" class="hanime-shikimori-card__img" alt="{title}" loading="lazy" />
                <div class="hanime-shikimori-card__type">{type}</div>
                <div class="hanime-shikimori-card__vote">{rate}</div>
                <div class="hanime-shikimori-card__season">{season}</div>
                <div class="hanime-shikimori-card__status">{status}</div>
            </div>
            <div class="hanime-shikimori-card__title">{title}</div>
        </div>
    `;

    // Модифицированная функция HanimeCard, использующая новый шаблон
    function HanimeCard(data) {
        // Маппинг данных из Hanime API к полям шаблона Shikimori
        // Некоторые поля (type, rate, season, status) могут быть недоступны или требовать обработки
        var cardTemplate = Lampa.Template.get('hanime-shikimori-card', {
            // Hanime API fields: id, name, poster, year, type (string like 'movie')
            id: data.id,
            img: data.poster,
            title: data.name,
            // Поля из Shikimori, для которых у нас может не быть данных
            // Попробуем использовать доступные данные или заглушки
            type: data.type ? data.type.toUpperCase() : 'N/A', // Используем type из meta data если есть
            rate: data.score ? data.score.toFixed(1) : 'N/A', // Используем score если есть
            season: data.year ? data.year : 'N/A', // Используем год как "сезон" если есть
            status: 'N/A' // Статус, вероятно, отсутствует в Hanime API
        });

        var cardElement = $(cardTemplate);
        cardElement.addClass('selector'); // Класс selector уже был в HanimeCard, оставляем

        this.render = function () {
            return cardElement;
        };

        this.destroy = function () {
            cardElement.remove();
        };
    }

    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        // Убрали mask: true и over: true, т.к. они в стилях 1111.txt для body
        var scroll = new Lampa.Scroll({ step: 250 });
        var items = [];
        var html = $('<div class="hanime-catalog"></div>');
        var body = $('<div class="hanime-catalog__body category-full"></div>');
        // Перенесен HTML заголовка с кнопками фильтрации из 1111.txt
        var head = $("<div class='torrent-filter'><div class='LMEShikimori__home simple-button simple-button--filter selector'>Home</div><div class='LMEShikimori__search simple-button simple-button--filter selector'>Filter</div></div>");

        var active = 0;
        var last;
        // Храним текущие параметры запроса (для пагинации и фильтрации)
        var currentParams = componentObject || { page: 1 }; // Начальные параметры

        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        // URL для разных сортировок Hanime. Будут выбираться в зависимости от фильтра.
        var CATALOG_URLS = {
             newset: API_BASE_URL + "/catalog/movie/newset.json",
             recent: API_BASE_URL + "/catalog/movie/recent.json",
             mostlikes: API_BASE_URL + "/catalog/movie/mostlikes.json",
             mostviews: API_BASE_URL + "/catalog/movie/mostviews.json",
             // Добавьте другие URL, если Hanime API предоставляет другие сортировки
        };
        // Дефолтный URL, если сортировка не выбрана или не поддерживается
        var DEFAULT_CATALOG_URL = CATALOG_URLS.newset;

        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";
        // --- Оставлено: Адрес вашего прокси сервера ---
        var PROXY_BASE_URL = "http://77.91.78.5:3000";
        // ---------------------------------------------


        // Перенесенная логика фильтрации и меню из 1111.txt
        this.headeraction = function () {
             // Определение доступных фильтров.
             // Важно: большинство этих фильтров (кроме sort) не поддерживаются Hanime API.
             // Они будут отображаться в UI, но не будут влиять на API запрос.
             var filters = {};

             // Пример фильтров из 1111.txt. Вам нужно адаптировать их под Hanime, если возможно.
             // Для Hanime API, скорее всего, имеет смысл только фильтр 'sort',
             // который будет выбирать один из предопределенных каталогов (newset, recent, etc.)

             // Типы (можно оставить для UI, но не будет фильтровать API)
             filters.AnimeKindEnum = {
                 title: 'Type',
                 items: [
                     { title: "Movie", code: "movie" },
                     { title: "Series", code: "series" }, // Адаптировано для Hanime, если есть такой тип
                     // Другие типы из Shikimori, которые не применимы к Hanime, можно убрать или оставить для UI
                     { title: "OVA", code: "ova" },
                     { title: "ONA", code: "ona" },
                     { title: "Special", code: "special" },
                 ]
             };

             // Статусы (не поддерживаются Hanime API)
             filters.status = {
                 title: 'Status',
                 items: [
                     { title: "Planned", code: "anons" },
                     { title: "Airing", code: "ongoing" },
                     { title: "Released", code: "released" }
                 ]
             };

              // Жанры (не поддерживаются Hanime API)
             filters.genre = {
                 title: 'Genre',
                 // Здесь должен быть список жанров, возможно, пустой или с заглушками
                 // Если Hanime API не предоставляет список жанров, этот фильтр не будет работать.
                 // Можете оставить его пустым [] или добавить заглушки.
                 items: [] // Нет данных по жанрам из Hanime API
             };

             // Сортировка (единственный фильтр, который может влиять на API запрос Hanime)
             filters.sort = {
                 title: 'Sort',
                 items: [
                     { title: "Newest", code: "newset" },
                     { title: "Recent", code: "recent" },
                     { title: "Most Likes", code: "mostlikes" },
                     { title: "Most Views", code: "mostviews" },
                     // Другие сортировки из Shikimori, которые не поддерживаются Hanime, можно убрать
                     // { title: "By popularity", code: "popularity" },
                     // { title: "In alphabetical order", code: "name" },
                 ]
             };

             // Сезоны (не поддерживаются Hanime API)
             filters.seasons = {
                 title: 'Season',
                 // Генерация сезонов из 1111.txt - не применима к Hanime
                 items: [] // Нет данных по сезонам из Hanime API
             };


             function queryForHanime() {
                 var query = {};
                 // Собираем выбранные фильтры. Только 'sort' будет использоваться для API запроса.
                 filters.sort.items.forEach(function (a) {
                     if (a.selected) query.sort = a.code;
                 });
                 // Другие фильтры (kind, status, genre, seasons) собираются, но не используются в fetchCatalog
                 filters.AnimeKindEnum.items.forEach(function (a) {
                      if (a.selected) query.kind = a.code;
                 });
                 filters.status.items.forEach(function (a) {
                     if (a.selected) query.status = a.code;
                 });
                 filters.genre.items.forEach(function (a) {
                     if (a.selected) query.genre = a.id; // Shikimori uses genre id
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
                         filters.sort, // Первым ставим сортировку, т.к. она работает
                         filters.AnimeKindEnum, // Эти фильтры будут отображаться, но не фильтровать API
                         filters.status,
                         filters.genre,
                         filters.seasons,
                     ],
                     onBack: function onBack() {
                         Lampa.Controller.toggle("content");
                     },
                     onSelect: function onSelect(a) {
                         if (a.searchHanime) {
                             search(); // Вызываем функцию поиска/фильтрации
                         } else submenu(a, mainMenu);
                     }
                 });
             }

             // Функция поиска/фильтрации. Теперь она не создает новый компонент,
             // а перезагружает текущий с новыми параметрами.
             function search() {
                 var query = queryForHanime();
                 // Обновляем текущие параметры компонента и сбрасываем страницу
                 currentParams = query;
                 currentParams.page = 1; // Сбрасываем страницу при смене фильтров

                 // Очищаем текущий список карточек
                 items.forEach(function(item) { item.destroy(); });
                 items = [];
                 body.empty(); // Очищаем DOM контейнер

                 // Запускаем загрузку каталога с новыми параметрами
                 this.fetchCatalog(currentParams);

                 Lampa.Controller.toggle("content"); // Возвращаемся к каталогу
             }

             // Привязываем функцию search к контексту компонента, чтобы она могла вызывать this.fetchCatalog
             var boundSearch = search.bind(this);


             var serverElement = head.find('.LMEShikimori__search');
             serverElement.on('hover:enter', function () {
                 mainMenu();
             });

             var homeElement = head.find('.LMEShikimori__home');
             homeElement.on('hover:enter', function () {
                 // При нажатии Home сбрасываем фильтры и загружаем дефолтный каталог
                 currentParams = { page: 1 };
                 items.forEach(function(item) { item.destroy(); });
                 items = [];
                 body.empty();
                 this.fetchCatalog(currentParams);
                 Lampa.Controller.toggle("content");
             }.bind(this)); // Привязываем контекст

              // Вызываем mainMenu при первом открытии фильтров, если нужно
              // mainMenu();
         };


        this.fetchCatalog = function (params) {
            var _this = this;
            _this.activity.loader(true);

            network.clear();

            // Определяем URL каталога на основе выбранной сортировки или используем дефолтный
            var sortKey = params && params.sort ? params.sort : 'newset'; // По умолчанию Newset
            var catalogUrl = CATALOG_URLS[sortKey] || DEFAULT_CATALOG_URL;

            // TODO: Hanime API Stremio Addon не поддерживает пагинацию через page параметр в этих URL
            // Если каталог очень большой, потребуется доработка API или клиентская пагинация/подгрузка
            // Для данного примера, мы просто загружаем весь каталог с выбранной сортировкой.
            // Если API будет поддерживать page, раскомментируйте строку ниже и используйте params.page
            // catalogUrl += (catalogUrl.includes('?') ? '&' : '?') + 'page=' + params.page;


            console.log("Fetching catalog from:", catalogUrl);

            network.native(catalogUrl,
                function (data) {
                    if (data && data.metas && Array.isArray(data.metas)) {
                         if (data.metas.length > 0) {
                            // Убираем старые элементы только если загружаем первую страницу (при смене фильтров)
                            if (params.page === 1) {
                                items.forEach(function(item) { item.destroy(); });
                                items = [];
                                body.empty();
                            }
                            _this.build(data.metas);

                             // TODO: Проверка на наличие следующей страницы. Hanime API Stremio Addon может не предоставлять эту информацию.
                             // Если API не предоставляет, пагинация "подгрузкой при скролле" работать не будет корректно.
                             // Предполагаем, что API возвращает все сразу или нет явной пагинации.
                             // Если бы пагинация была, тут была бы логика для определения scroll.onEnd
                         } else {
                             // Если на первой странице нет данных, показываем empty
                             if (params.page === 1) {
                                _this.empty("Каталог пуст по выбранным фильтрам.");
                             } else {
                                // Если на не первой странице нет данных, значит конец списка
                                Lampa.Noty.show("Конец списка");
                                _this.activity.loader(false);
                                Lampa.Controller.toggle('content'); // Возвращаемся к управлению каталогом
                             }
                         }
                    } else {
                        // Если на первой странице неверный формат или пусто
                         if (params.page === 1) {
                             _this.empty("Неверный формат данных от API или каталог пуст.");
                         } else {
                              Lampa.Noty.show("Ошибка при загрузке данных.");
                             _this.activity.loader(false);
                             console.error("Hanime Plugin: Invalid data format on scroll end", data);
                              Lampa.Controller.toggle('content'); // Возвращаемся к управлению каталогом
                         }

                         console.error("Hanime Plugin: Invalid data format", data);
                    }
                },
                function (errorStatus, errorText) {
                    // Если на первой странице ошибка
                    if (params.page === 1) {
                        _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                    } else {
                         Lampa.Noty.show("Ошибка загрузки следующей страницы: " + errorStatus);
                         _this.activity.loader(false);
                         Lampa.Controller.toggle('content'); // Возвращаемся к управлению каталогом
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

            // Очищаем body перед добавлением новых карточек (нужно при смене фильтров)
            if (currentParams.page === 1) {
                 body.empty();
                 items = []; // Сбрасываем массив элементов
            }


            result.forEach(function (meta) {
                // Передаем всю meta информацию в HanimeCard для использования доступных полей
                var card = new HanimeCard(meta);
                var cardElement = card.render();

                cardElement.on('hover:focus', function () {
                    last = cardElement[0];
                    active = items.indexOf(card);
                    scroll.update(cardElement, true);
                }).on('hover:enter', function () {
                    console.log("Selected Anime:", meta.id, meta.name);
                    _this.fetchStreamAndMeta(meta.id, meta); // Передаем meta дальше
                });

                body.append(cardElement);
                items.push(card);
            });

             // Добавляем head и body к scroll только один раз при первом построении
            if (scroll.render().find('.torrent-filter').length === 0) {
                 scroll.append(head);
            }
             // Проверяем, что body уже добавлен, чтобы не дублировать
             if (scroll.render().find('.hanime-catalog__body').length === 0) {
                 scroll.append(body);
             }


            // Добавляем scroll к html контейнеру
            if (html.find('.scroll-box').length === 0) {
                html.append(scroll.render(true));
            }


            _this.activity.loader(false);
            _this.activity.toggle();

             // Логика подгрузки следующей страницы при скролле
             // Учитывая, что Hanime API Stremio Addon может не поддерживать пагинацию,
             // этот код может загружать весь каталог за один раз или некорректно работать.
             // Если API поддерживает пагинацию, нужно модифицировать fetchCatalog и эту часть.
             // Если пагинации нет, возможно, стоит отключить onEnd или показывать "Конец списка" сразу.
             // Оставляем логику onEnd, предполагая возможность будущей поддержки пагинации API.
             scroll.onEnd = function () {
                // Увеличиваем номер страницы
                currentParams.page++;
                console.log("Fetching next page:", currentParams.page, "with params:", currentParams);
                // Запускаем загрузку следующей страницы с текущими параметрами
                _this.fetchCatalog(currentParams);
            };
        };

        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            // Используем meta, которое получили из каталога, чтобы не делать лишний запрос meta/movie/{id}.json
            // Если по каким-то причинам meta в каталоге неполное, можно сделать запрос metaUrl
            // var metaUrl = META_URL_TEMPLATE.replace('{id}', id);


            _this.activity.loader(true);

            // Запрос потока
            network.native(streamUrl,
                function(streamData) {
                     _this.activity.loader(false);

                     const fullMetaData = meta; // Используем meta из каталога

                     console.log("Stream Data:", streamData);
                     console.log("Full Meta Data:", fullMetaData);

                     if (streamData && streamData.streams && streamData.streams.length > 0) {
                         var streamToPlay = streamData.streams[0]; // Берем первый поток

                         // --- Изменено: Использование прокси для URL потока ---
                         var finalStreamUrl = streamToPlay.url;
                         // Проверяем, является ли URL потока тем, который вызывает проблему CORS (на highwinds-cdn.com)
                         // Если да, оборачиваем его прокси
                         try {
                              var url = new URL(finalStreamUrl);
                              if (url.hostname.includes('highwinds-cdn.com') || url.hostname.includes('proxy.hentai.stream')) { // Добавлен еще один домен для проксирования
                                  // Оборачиваем оригинальный URL потока адресом прокси
                                  finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                                  console.log("Original stream URL proxied:", finalStreamUrl);
                              }
                         } catch (e) {
                             console.error("Hanime Plugin: Failed to parse or proxy stream URL", e);
                             // Продолжаем использовать оригинальный URL, если не удалось обработать
                         }
                         // -------------------------------------------------------


                         var playerObject = {
                             title: fullMetaData.name || fullMetaData.title || 'Без названия',
                             url: finalStreamUrl, // Используем URL после возможного проксирования
                             poster: fullMetaData.poster || fullMetaData.background, // Используем poster из meta
                         };

                         if (playerObject.url) {
                              console.log("Launching player with:", playerObject);
                              Lampa.Player.play(playerObject);
                              Lampa.Player.playlist([playerObject]);

                              if (fullMetaData) {
                                     // Адаптируем сохранение истории под поля Hanime meta data
                                     const historyMeta = {
                                         id: fullMetaData.id,
                                         title: fullMetaData.name || fullMetaData.title,
                                         poster: fullMetaData.poster || fullMetaData.background,
                                         // У Hanime API Stremio Addon нет runtime, year, original_name в метаданных каталога
                                         // Если они появятся в будущем или доступны по отдельному запросу, добавьте их здесь.
                                         // runtime: fullMetaData.runtime,
                                         // year: fullMetaData.year,
                                         // original_name: fullMetaData.original_name
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
            // Очищаем и добавляем заглушку в scroll.render()
            scroll.render().empty().append(empty.render(true));

            // Обновляем html контейнер, если он еще не содержит scroll
            if (html.find('.scroll-box').length === 0) {
                 html.append(scroll.render(true));
            }


            this.activity.loader(false);
            this.activity.toggle();
            this.start = empty.start;
        };

        this.create = function () {
            // Инициализируем header с фильтрами
             this.headeraction();
            // Запускаем первую загрузку каталога с начальными параметрами (или дефолтными)
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
                        // Привязываем кнопку Filter к навигатору вправо от последней карточки
                        var filterButton = head.find('.LMEShikimori__search')[0];
                         if (filterButton && last && last.contains(Navigator.focused())) {
                              Lampa.Controller.collectionFocus(filterButton);
                         } else {
                             Navigator.move('right');
                         }
                    }
                },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else {
                         // Привязываем навигацию вверх с карточек к Header
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
            if (scroll) scroll.destroy(); // Проверяем перед уничтожением
            if (html) html.remove();     // Проверяем перед удалением
            items = null;
            network = null;
            scroll = null;
            html = null;
            body = null;
            head = null; // Очищаем ссылку на header
            last = null;
        };
        this.back = function () {
            Lampa.Activity.backward();
        };
    }

    function startPlugin() {
        if (window.plugin_hanime_catalog_ready) return;

        window.plugin_hanime_catalog_ready = true;

        // Добавляем новые шаблоны и стили
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
                    url: '', // url может быть пустым, т.к. fetchCatalog вызывается с params
                    title: 'Hanime Catalog',
                    component: 'hanime_catalog',
                    page: 1 // Начальная страница
                    // Здесь можно передать начальные параметры сортировки, например: sort: 'newset'
                });
            });
            $('.menu .menu__list').eq(0).append(menu_item);
        }

        // Применяем стили
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
