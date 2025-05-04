(function () {
    'use strict';

    // Удаляем кастомные стили из 1111.txt (если они были и мешали)
    // var hanimeShikimoriStyle = ` ... `;

    // Определяем шаблон стандартной карточки Lampa с использованием placeholders {}
    // Шаблон содержит только базовые классы card и selector
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
        // data.poster может быть null или undefined, используем пустую строку как fallback
        var cardTemplate = Lampa.Template.get('standard-lampa-card', {
            img: data.poster || '',
            title: data.name || ''
            // Если в шаблоне добавлены vote, year и т.д., их тоже нужно подставлять
            // vote: data.vote || '',
            // year: data.year || ''
        });

        var cardElement = $(cardTemplate);

        // *** ИСПРАВЛЕНИЕ 1: Добавляем классы состояния к элементу карточки ***
        // Эти классы нужны для правильной стилизации и взаимодействия с Lampa.Scroll и навигацией
        cardElement.addClass('card--category card--loaded'); // Это категория и данные загружены

        // API может возвращать тип контента (movie, series).
        // Если Stremio API возвращает type, можно добавить card--movie или card--tv
        // Предполагаем, что Hanime - это по сути TV / Series в Stremio метаданных
        cardElement.addClass('card--tv'); // Добавляем класс типа контента

        // Класс 'selector' уже добавлен в шаблоне standardLampaCardTemplate

        this.render = function () {
            return cardElement;
        };

        this.destroy = function () {
            if (cardElement) {
                cardElement.remove();
            }
            cardElement = null;
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
        var last; // last сфокусированный элемент для восстановления фокуса при возврате
        var currentParams = componentObject || { page: 1 }; // page: 1 не используется для пагинации API

        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URLS = {
            newset: API_BASE_URL + "/catalog/movie/newset.json",
            recent: API_BASE_URL + "/catalog/movie/recent.json",
            mostlikes: API_BASE_URL + "/catalog/movie/mostlikes.json",
            mostviews: API_BASE_URL + "/catalog/movie/mostviews.json",
        };
        var DEFAULT_CATALOG_URL = CATALOG_URLS.newset;

        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        // var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json"; // Не используется
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

            // Устанавливаем выбранный по умолчанию (Newest) при первом открытии или сбросе
             if (!currentParams.sort) {
                 filters.sort.items[0].selected = true; // Newest
             } else {
                 // Если sort уже есть в params, отмечаем его в меню
                 filters.sort.items.forEach(function(item) {
                     if (item.code === currentParams.sort) {
                         item.selected = true;
                     }
                 });
             }


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
                        main(); // Вернуться в главное меню фильтров
                    }
                });
            }

            function mainMenu() {
                for (var i in filters) selected(filters[i]); // Обновляем подзаголовки в меню
                Lampa.Select.show({
                    title: 'Filters',
                    items: [
                        // { title: Lampa.Lang.translate('search_start'), searchHanime: true }, // Функционал поиска по тексту не реализован API
                        filters.sort,
                    ],
                    onBack: function onBack() {
                        Lampa.Controller.toggle("content"); // Вернуться к контенту
                    },
                    onSelect: function onSelect(a) {
                         // if (a.searchHanime) { /* boundSearch(); */ } else
                         submenu(a, mainMenu); // Открыть подменю для выбранного фильтра (сейчас только sort)
                    }
                });
            }

            // Функция для применения фильтров (сейчас только сортировка)
            var applyFilters = (function () {
                var query = queryForHanime();
                currentParams = query;
                currentParams.page = 1; // Сбрасываем страницу при смене фильтров/сортировки

                // Очищаем старые элементы перед загрузкой новых
                items.forEach(function(item) { item.destroy(); });
                items = [];
                body.empty();

                this.fetchCatalog(currentParams); // Загружаем каталог с новыми параметрами

                Lampa.Controller.toggle("content"); // Возвращаемся к отображению контента
            }).bind(this);


            var serverElement = head.find('.LMEShikimori__search'); // Кнопка "Filter"
            serverElement.on('hover:enter', function () {
                 mainMenu(); // Открываем меню фильтров
            });

            var homeElement = head.find('.LMEShikimori__home'); // Кнопка "Home"
            homeElement.on('hover:enter', function () {
                // Сбрасываем все параметры (сейчас только sort к default 'newset')
                currentParams = { page: 1 };
                // Очищаем старые элементы
                items.forEach(function(item) { item.destroy(); });
                items = [];
                body.empty();
                // Перезагружаем каталог с параметрами по умолчанию
                this.fetchCatalog(currentParams);
                Lampa.Controller.toggle("content"); // Возвращаемся к отображению контента
            }.bind(this));

            // Добавляем слушатель на событие закрытия меню Lampa.Select
            // Это нужно, чтобы при закрытии меню фильтров применились выбранные опции
            Lampa.Listener.follow('select', function(e) {
                if (e.type == 'hide' && e.from == mainMenu) { // Проверяем, что это скрытие нашего меню фильтров
                    applyFilters(); // Применяем фильтры
                }
            });
        };


        this.fetchCatalog = function (params) {
            var _this = this;
            _this.activity.loader(true);

            network.clear(); // Отменяем предыдущие запросы

            var sortKey = params && params.sort ? params.sort : 'newset';
            // API не поддерживает пагинацию, поэтому page=1 всегда, и мы всегда грузим полный каталог
            var catalogUrl = CATALOG_URLS[sortKey] || DEFAULT_CATALOG_URL;

            console.log("Fetching catalog from:", catalogUrl);

            network.native(catalogUrl,
                function (data) {
                    if (data && data.metas && Array.isArray(data.metas)) {
                        if (data.metas.length > 0) {
                             // *** ИСПРАВЛЕНИЕ 2: Очищаем только здесь при первой загрузке или смене фильтров ***
                             // Убрали дублирующую очистку из build
                             if (params.page === 1) {
                                 items.forEach(function(item) { item.destroy(); });
                                 items = [];
                                 body.empty();
                             }
                            _this.build(data.metas);

                        } else {
                            // Нет данных в каталоге
                             if (params.page === 1) {
                                _this.empty("Каталог пуст по выбранным фильтрам.");
                             } else {
                                // Это ветка для пагинации, которая сейчас не работает
                                Lampa.Noty.show("Конец списка");
                                _this.activity.loader(false);
                                Lampa.Controller.toggle('content');
                             }
                        }
                    } else {
                        // Неверный формат данных
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
                    // Ошибка загрузки
                    if (params.page === 1) {
                        _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                    } else {
                        Lampa.Noty.show("Ошибка загрузки следующей страницы: " + errorStatus);
                        _this.activity.loader(false);
                        Lampa.Controller.toggle('content');
                    }
                    console.error("Hanime Plugin: Failed to load catalog", errorStatus, errorText);
                },
                false, // POST? false = GET
                {
                    dataType: 'json',
                    timeout: 15000
                }
            );
        };

        this.build = function (result) {
            var _this = this;

            // *** ИСПРАВЛЕНИЕ 2: Убрали дублирующую очистку из build ***
            // Очистка теперь происходит только в fetchCatalog при params.page === 1

            result.forEach(function (meta) {
                var card = new HanimeCard(meta); // HanimeCard теперь добавляет классы card--category, card--loaded, card--tv
                var cardElement = card.render();

                // Добавляем обработчики событий hover:focus и hover:enter
                cardElement.on('hover:focus', function () {
                    last = cardElement[0]; // Сохраняем последний сфокусированный элемент (DOM-элемент)
                    active = items.indexOf(card); // Сохраняем индекс активной карточки (объекта HanimeCard)
                    // Обновляем положение скролла, чтобы активный элемент был виден
                    // scroll.update(cardElement, true) должен вызываться Lampa.Controller автоматически
                    // при управлении фокусом в collectionSet, но явный вызов может помочь
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

             // *** ИСПРАВЛЕНИЕ 3: Убеждаемся, что скролл знает о новых элементах ***
             // Явный вызов update после добавления всех элементов
             scroll.update();


            // После добавления всех элементов и настройки DOM, сообщаем Lampa о завершении загрузки
            _this.activity.loader(false);
            _this.activity.toggle();

            // Логика пагинации по скроллу отключена (см. комментарии в fetchCatalog)
            scroll.onEnd = function () {
                console.log("Reached end of scroll. Pagination is not supported by this API.");
                Lampa.Noty.show("Конец списка"); // Можно вернуть уведомление, раз пагинации нет
            };
        };

        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);

            _this.activity.loader(true);

            network.native(streamUrl,
                function(streamData) {
                    _this.activity.loader(false);

                    const fullMetaData = meta; // Используем метаданные из каталога

                    console.log("Stream Data:", streamData);
                    console.log("Full Meta Data:", fullMetaData);

                    if (streamData && streamData.streams && streamData.streams.length > 0) {
                        // Выбираем первый поток (можно добавить логику выбора по качеству и т.д.)
                        var streamToPlay = streamData.streams[0];

                        var finalStreamUrl = streamToPlay.url;
                        // Логика проксирования URL
                        try {
                            var url = new URL(finalStreamUrl);
                            if (url.hostname.includes('highwinds-cdn.com') || url.hostname.includes('proxy.hentai.stream')) {
                                finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                                console.log("Original stream URL proxied:", finalStreamUrl);
                            }
                        } catch (e) {
                            console.error("Hanime Plugin: Failed to parse or proxy stream URL", e);
                             // Если ошибка парсинга URL, не пытаемся играть
                            Lampa.Noty.show('Ошибка обработки адреса потока.');
                            return; // Выходим из функции
                        }

                        // Формируем объект для плеера Lampa
                        var playerObject = {
                            title: fullMetaData.name || fullMetaData.title || 'Без названия',
                            url: finalStreamUrl,
                            poster: fullMetaData.poster || fullMetaData.background, // Используем постер или фон из метаданных
                            // Можно добавить другие поля, если они нужны плееру (например, subtitles)
                             quality: streamToPlay.quality // Добавим качество, если API его отдает
                        };

                        if (playerObject.url) {
                            console.log("Launching player with:", playerObject);
                             // Lampa Player сам добавит объект в плейлист, если плейлист не передан
                             Lampa.Player.play(playerObject);
                             // Если нужна возможность выбора качества/потока, нужно сформировать плейлист из streamData.streams
                             // Lampa.Player.playlist([playerObject]); // Этот вызов может быть лишним или требовать переработки для списка потоков

                            // Добавляем в историю Lampa
                            if (fullMetaData && fullMetaData.id) { // Убеждаемся, что id существует
                                const historyMeta = {
                                    id: fullMetaData.id,
                                    title: fullMetaData.name || fullMetaData.title,
                                    poster: fullMetaData.poster || fullMetaData.background,
                                };
                                Lampa.Favorite.add('history', historyMeta, 100); // Добавляем в историю, лимит 100 записей
                            } else {
                                console.warn("Hanime Plugin: Cannot add to history, missing meta data or id:", fullMetaData);
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
                 false, // POST? false = GET
                 {
                     dataType: 'json',
                     timeout: 10000
                 }
            );
        };

        this.empty = function (msg) {
            // Очищаем элементы и контейнер
            items.forEach(function(item) { item.destroy(); });
            items = [];
            body.empty();

            var empty = new Lampa.Empty({ message: msg });
            // Заменяем содержимое scroll на сообщение об отсутствии данных
            scroll.render().empty().append(empty.render(true));

            // Проверяем, добавлен ли scroll в основной html, добавляем один раз
            if (html.find('.scroll-box').length === 0) {
                html.append(scroll.render(true));
            }

            this.activity.loader(false);
            this.activity.toggle();
            // Перенаправляем старт на компонент Empty, чтобы по Enter можно было, например, выйти или обновить
            this.start = empty.start; // Это может быть полезно
        };

        this.create = function () {
            // Добавляем header до загрузки каталога
             if (scroll.render().find('.torrent-filter').length === 0) {
                 scroll.append(head);
             }
             // Добавляем body до загрузки каталога (чтобы пустой стейт правильно отобразился)
             if (scroll.render().find('.category-full').length === 0) {
                 scroll.append(body);
             }
             // Добавляем scroll в html
             if (html.find('.scroll-box').length === 0) {
                 html.append(scroll.render(true));
             }

            this.headeraction(); // Инициализируем действия для header
            this.fetchCatalog(currentParams); // Начинаем загрузку каталога
        };

        this.start = function () {
            if (Lampa.Activity.active().activity !== this.activity) return;

             // *** ИСПРАВЛЕНИЕ 4: Убеждаемся, что Controller перенастроен после build/empty ***
             // Перенастраиваем collectionSet и collectionFocus каждый раз при старте компонента
            Lampa.Controller.add('content', {
                toggle: function () {
                    // Установка коллекции элементов для навигации стрелками
                    // Lampa автоматически найдет все элементы с классом 'selector' внутри scroll.render()
                    Lampa.Controller.collectionSet(scroll.render());
                    // Фокусировка на последнем активном элементе или первом (по умолчанию Navigator.focus)
                    // last хранит последний элемент, на который был наведен фокус в build -> hover:focus
                    // scroll.render() передается как контейнер поиска фокуса
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu'); // Уйти в главное меню Lampa
                },
                right: function () {
                     // Определяем элементы заголовка, которые могут быть целью фокуса
                     var filterButton = head.find('.LMEShikimori__search')[0];
                     var homeButton = head.find('.LMEShikimori__home')[0];
                     var focused = Navigator.focused(); // Текущий сфокусированный элемент
                     var headElements = [filterButton, homeButton]; // Элементы в заголовке

                    if (Navigator.canmove('right')) {
                         Navigator.move('right');
                    } else if (body[0].contains(focused)) {
                        // Если мы на карточке и не можем двигаться вправо дальше в сетке,
                        // попробовать переместиться на первый элемент заголовка (Filter)
                         if (filterButton) Lampa.Controller.collectionFocus(filterButton);
                    } else if (headElements.includes(focused)) {
                         // Если мы на элементе заголовка и не можем двигаться вправо, ничего не делаем (или можно уйти куда-то еще?)
                         // Navigator.move('right') здесь уже не сработает
                    } else {
                        // В других случаях (если сфокусированы на чем-то другом?), пытаемся просто подвинуться
                         Navigator.move('right'); // Это может быть запасной вариант
                    }
                },
                up: function () {
                    var focused = Navigator.focused(); // Текущий сфокусированный элемент
                    var homeButton = head.find('.LMEShikimori__home')[0];

                    if (Navigator.canmove('up')) {
                         Navigator.move('up');
                    } else if (body[0].contains(focused)) {
                         // Если мы на карточке и не можем двигаться вверх,
                         // попробовать переместиться на первый элемент заголовка (Home)
                         if (homeButton) Lampa.Controller.collectionFocus(homeButton);
                    } else if (head[0].contains(focused)) {
                        // Если мы на элементе заголовка и не можем двигаться вверх, уходим в шапку Lampa
                        Lampa.Controller.toggle('head');
                    } else {
                        // В других случаях, пытаемся просто подвинуться вверх
                        Navigator.move('up'); // Запасной вариант
                    }
                },
                down: function () {
                     var focused = Navigator.focused(); // Текущий сфокусированный элемент

                    if (Navigator.canmove('down')) {
                         Navigator.move('down');
                    } else if (head[0].contains(focused) && items.length > 0) {
                         // Если мы на элементе заголовка и не можем двигаться вниз,
                         // попробовать переместиться на первый элемент в сетке body
                         var firstCardElement = body.find('.card.selector')[0];
                         if (firstCardElement) Lampa.Controller.collectionFocus(firstCardElement);
                    } else {
                         // В других случаях, пытаемся просто подвинуться вниз
                         Navigator.move('down'); // Запасной вариант
                    }
                },
                back: this.back
            });
            // Включаем контроллер 'content', что вызовет toggle()
            Lampa.Controller.toggle('content');
        };

        this.pause = function () {
            // Сохранить состояние скролла или фокуса, если нужно
            // last уже сохраняется в hover:focus
        };
        this.stop = function () {
            // Пауза или остановка чего-либо
        };
        this.render = function () {
            return html; // Возвращаем корневой элемент компонента
        };
        this.destroy = function () {
            console.log("Hanime Plugin: Destroying component");
            network.clear(); // Отменяем все активные сетевые запросы
            Lampa.Arrays.destroy(items); // Уничтожаем объекты карточек (вызовет их destroy методы)
            if (scroll) {
                scroll.onEnd = null; // Убираем слушатель
                scroll.destroy(); // Уничтожаем компонент скролла
            }
            if (html) {
                html.remove(); // Удаляем корневой DOM-элемент
            }
            // Обнуляем ссылки для очистки памяти
            items = null;
            network = null;
            scroll = null;
            html = null;
            body = null;
            head = null;
            last = null;
            currentParams = null;
            console.log("Hanime Plugin: Component destroyed");
        };
        this.back = function () {
            console.log("Hanime Plugin: Back action");
            Lampa.Activity.backward(); // Возвращаемся к предыдущему экрану
        };
    }

    function startPlugin() {
        if (window.plugin_hanime_catalog_ready) return;

        window.plugin_hanime_catalog_ready = true;
        console.log("Hanime Plugin: Starting...");

        // Регистрируем стандартный шаблон карточки с помощью Lampa.Template.add
        // Важно зарегистрировать шаблон до того, как он будет использован HanimeCard
        Lampa.Template.add('standard-lampa-card', standardLampaCardTemplate);
        console.log("Hanime Plugin: Template 'standard-lampa-card' added.");

        // Регистрируем компонент
        Lampa.Component.add('hanime_catalog', HanimeComponent);
         console.log("Hanime Plugin: Component 'hanime_catalog' added.");


        function addMenuItem() {
            console.log("Hanime Plugin: Adding menu item...");
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
                console.log("Hanime Plugin: Menu item clicked, pushing activity...");
                Lampa.Activity.push({
                    url: '', // URL можно оставить пустым, если компонент не привязан к конкретному URL
                    title: 'Hanime Catalog',
                    component: 'hanime_catalog', // Имя зарегистрированного компонента
                    page: 1 // Начальные параметры для компонента
                });
            });
            // Добавляем пункт в основное меню Lampa (обычно первое .menu__list)
            $('.menu .menu__list').eq(0).append(menu_item);
             console.log("Hanime Plugin: Menu item added.");
        }

        // Применяем любые необходимые общие стили, если есть
        // Например, если для torrent-filter нужен специфичный margin-left
        // Или стили для новых классов card--tv, card--category, card--loaded если они отличаются от дефолтных
        // Lampa обычно имеет стили для этих классов по умолчанию.
         $('head').append('<style>.torrent-filter{margin-left:1.5em;}</style>');
         // Пример добавления стилей для новых классов, если дефолтных стилей Lampa недостаточно
         // $('head').append('<style>.card--tv .card__view{ border-color: blue; }</style>');


        // Ждем готовности приложения Lampa, прежде чем добавить пункт в меню
        if (window.appready) {
             console.log("Hanime Plugin: appready is true, adding menu item now.");
             addMenuItem();
        } else {
             console.log("Hanime Plugin: Waiting for appready event...");
             Lampa.Listener.follow('app', function (e) {
                 if (e.type === 'ready') {
                     console.log("Hanime Plugin: appready event received, adding menu item now.");
                     addMenuItem();
                 }
             });
        }
         console.log("Hanime Plugin: Initialization finished.");
    }

    // Запускаем процесс инициализации плагина
    startPlugin();

})();
