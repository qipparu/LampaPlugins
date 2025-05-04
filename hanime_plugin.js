(function () {

    'use strict';

    // Определяем шаблон стандартной карточки Lampa с использованием placeholders {}
    // Добавляем классы, которые видно в рабочем скролле для карточек в вертикальном списке
    var standardLampaCardTemplate = `
        <div class="card selector layer--render card--category card--loaded">
            <div class="card__view">
                <img src="{img}" class="card__img" alt="{title}" loading="lazy" />
            </div>
            <div class="card__title">{title}</div>
        </div>
    `;

    // Модифицированная функция HanimeCard, использующая Lampa.Template.get
    function HanimeCard(data) {
        // Используем Lampa.Template.get для правильной подстановки данных в шаблон
        // Lampa.Template.get сам подставит данные из второго аргумента в плейсхолдеры {key} в шаблоне
        var cardTemplate = Lampa.Template.get('standard-lampa-card', {
            img: data.poster || '', // Используем пустую строку, если poster нет
            title: data.name || ''  // Используем пустую строку, если name нет
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
        // step: 250 - шаг скролла в пикселях
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = [];
        // Используем простой div как основной контейнер, который будет содержать скролл
        var html = $('<div></div>');
        // Используем стандартный класс category-full для контейнера карточек
        // Этот контейнер будет внутри скролла
        var body = $('<div class="category-full"></div>');
        // Перенесен HTML заголовка с кнопками фильтрации
        var head = $("<div class='torrent-filter'><div class='LMEShikimori__home simple-button simple-button--filter selector'>Home</div><div class='LMEShikimori__search simple-button simple-button--filter selector'>Filter</div></div>");


        var active = 0;
        var last; // Для сохранения последнего сфокусированного элемента
        var currentParams = componentObject || { page: 1 }; // Параметры для запроса API, по умолчанию страница 1

        // Адреса API
        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URLS = {
            newset: API_BASE_URL + "/catalog/movie/newset.json",
            recent: API_BASE_URL + "/catalog/movie/recent.json",
            mostlikes: API_BASE_URL + "/catalog/movie/mostlikes.json",
            mostviews: API_BASE_URL + "/catalog/movie/mostviews.json",
        };
        var DEFAULT_CATALOG_URL = CATALOG_URLS.newset;

        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        // var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json"; // Не используется в текущем коде
        var PROXY_BASE_URL = "http://77.91.78.5:3000"; // Адрес прокси для обхода CORS/блокировок

        // Действие для хедера (кнопки Home и Filter)
        this.headeraction = function () {
            var filters = {};

            // Определение доступных фильтров (сортировка в данном случае)
            filters.sort = {
                title: 'Sort',
                items: [
                    { title: "Newest", code: "newset" },
                    { title: "Recent", code: "recent" },
                    { title: "Most Likes", code: "mostlikes" },
                    { title: "Most Views", code: "mostviews" },
                ]
            };

            // Функция для формирования объекта запроса из выбранных фильтров
            function queryForHanime() {
                var query = {};
                filters.sort.items.forEach(function (a) {
                    if (a.selected) query.sort = a.code;
                });
                return query;
            }

            // Функция для обновления подзаголовков фильтров на основе выбранных элементов
            function selected(where) {
                var title = [];
                where.items.forEach(function (a) {
                    if (a.selected || a.checked) title.push(a.title);
                });
                where.subtitle = title.length ? title.join(', ') : Lampa.Lang.translate('nochoice');
            }

            // Функция для выбора одного элемента в списке фильтров (радио-кнопка)
            function select(where, a) {
                where.forEach(function (element) {
                    element.selected = false;
                });
                a.selected = true;
            }

            // Функция для открытия подменю фильтрации
            function submenu(item, main) {
                Lampa.Select.show({
                    title: item.title,
                    items: item.items,
                    onBack: main, // Возврат в главное меню фильтров
                    onSelect: function onSelect(a) {
                        select(item.items, a); // Выбираем элемент в подменю
                        main(); // Возвращаемся в главное меню фильтров
                    }
                });
            }

            // Функция для открытия главного меню фильтров
            function mainMenu() {
                for (var i in filters) selected(filters[i]); // Обновляем подзаголовки
                Lampa.Select.show({
                    title: 'Filters', // Заголовок меню фильтров
                    items: [
                        // { title: Lampa.Lang.translate('search_start'), searchHanime: true }, // Возможность поиска
                        filters.sort, // Меню сортировки
                    ],
                    onBack: function onBack() {
                        Lampa.Controller.toggle("content"); // При нажатии Назад выходим из меню фильтров и возвращаемся к контенту
                    },
                    onSelect: function onSelect(a) {
                        // if (a.searchHanime) {
                        //     boundSearch(); // Если выбран поиск, выполняем его (сейчас не реализован)
                        // } else
                        submenu(a, mainMenu); // Если выбран фильтр, открываем его подменю
                    }
                });
            }

            // Функция для выполнения поиска/применения фильтров (сейчас просто применяет сортировку)
            var boundSearch = (function search() {
                var query = queryForHanime(); // Получаем выбранные параметры фильтрации
                currentParams = query; // Обновляем текущие параметры
                currentParams.page = 1; // Сбрасываем страницу на 1 при смене фильтров

                // Очищаем предыдущие элементы перед загрузкой новых
                items.forEach(function(item) { item.destroy(); });
                items = [];
                body.empty(); // Очищаем DOM контейнер карточек

                this.fetchCatalog(currentParams); // Загружаем каталог с новыми параметрами

                Lampa.Controller.toggle("content"); // Возвращаемся к контенту
            }).bind(this); // Привязываем this к HanimeComponent

            // Обработчики для кнопок Home и Filter в хедере
            var serverElement = head.find('.LMEShikimori__search');
            serverElement.on('hover:enter', function () {
                mainMenu(); // При нажатии на Filter открываем меню фильтров
            });

            var homeElement = head.find('.LMEShikimori__home');
            homeElement.on('hover:enter', function () {
                currentParams = { page: 1 }; // Сброс параметров на дефолт (первая страница, дефолтная сортировка)
                items.forEach(function(item) { item.destroy(); }); // Очищаем предыдущие элементы
                items = [];
                body.empty(); // Очищаем DOM контейнер карточек
                this.fetchCatalog(currentParams); // Загружаем каталог с дефолтными параметрами
                Lampa.Controller.toggle("content"); // Возвращаемся к контенту
            }.bind(this)); // Привязываем this к HanimeComponent
        };

        // Функция для загрузки каталога аниме
        this.fetchCatalog = function (params) {
            var _this = this;
            _this.activity.loader(true); // Показываем лоадер

            network.clear(); // Отменяем предыдущие запросы

            var sortKey = params && params.sort ? params.sort : 'newset'; // Получаем ключ сортировки из параметров
            var catalogUrl = CATALOG_URLS[sortKey] || DEFAULT_CATALOG_URL; // Формируем URL каталога

            console.log("Fetching catalog from:", catalogUrl);

            // Выполняем HTTP запрос к API
            network.native(catalogUrl,
                function (data) {
                    // Успешный ответ от API
                    if (data && data.metas && Array.isArray(data.metas)) {
                        if (data.metas.length > 0) {
                             // При загрузке первой страницы или смене фильтров, очищаем перед построением
                            if (params.page === 1) {
                                items.forEach(function(item) { item.destroy(); });
                                items = [];
                                body.empty(); // Очищаем DOM контейнер перед добавлением новых карточек
                            }
                            _this.build(data.metas); // Строим карточки из полученных данных

                        } else {
                            // Нет данных по текущим параметрам
                             if (params.page === 1) {
                                _this.empty("Каталог пуст по выбранным фильтрам.");
                             } else {
                                // Это ветка для пагинации, но API каталога не поддерживает пагинацию
                                Lampa.Noty.show("Конец списка");
                                _this.activity.loader(false);
                                Lampa.Controller.toggle('content'); // Важно вернуть управление после Noty, если пагинация не работает
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
                             Lampa.Controller.toggle('content'); // Важно вернуть управление после ошибки
                         }
                        console.error("Hanime Plugin: Invalid data format", data);
                    }
                },
                function (errorStatus, errorText) {
                    // Ошибка при запросе
                     if (params.page === 1) {
                        _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                     } else {
                        Lampa.Noty.show("Ошибка загрузки следующей страницы: " + errorStatus);
                         _this.activity.loader(false);
                         Lampa.Controller.toggle('content'); // Важно вернуть управление после ошибки
                     }
                    console.error("Hanime Plugin: Failed to load catalog", errorStatus, errorText);
                },
                false, // Не кешировать запрос
                {
                    dataType: 'json', // Ожидаем JSON
                    timeout: 15000 // Таймаут запроса
                }
            );
        };

        // Функция для построения карточек на основе полученных данных
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
                    _this.fetchStreamAndMeta(meta.id, meta); // Вызываем загрузку потока и метаданных
                });

                // Добавляем элемент карточки в контейнер body
                body.append(cardElement);
                items.push(card); // Добавляем объект карточки в массив items
            });

            // Проверяем, добавлены ли header и body в scroll, добавляем один раз при первом построении
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
            _this.activity.toggle(); // Переключаем активность, чтобы Lampa обновила контроллер

            // Логика пагинации по скроллу отключена, так как API каталога не поддерживает страницы
            // Устанавливаем onEnd, чтобы реагировать на достижение конца скролла (например, показать сообщение)
            scroll.onEnd = function () {
                console.log("Reached end of scroll. Pagination is not supported by this API.");
                 // Lampa.Noty.show("Конец списка"); // Можно включить, если нужно уведомление
            };
        };

        // Функция для загрузки потока и метаданных аниме по ID
        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);

            _this.activity.loader(true); // Показываем лоадер

            network.native(streamUrl,
                function(streamData) {
                    _this.activity.loader(false); // Скрываем лоадер

                    const fullMetaData = meta; // Используем уже полученные метаданные из каталога

                    console.log("Stream Data:", streamData);
                    console.log("Full Meta Data:", fullMetaData);

                    // Проверяем наличие потоков в ответе
                    if (streamData && streamData.streams && streamData.streams.length > 0) {
                        // Выбираем первый поток (можно добавить логику выбора потока по качеству и т.п.)
                        var streamToPlay = streamData.streams[0];

                        var finalStreamUrl = streamToPlay.url;
                        // Проксируем URL, если он ведет на определенные домены
                        try {
                            var url = new URL(finalStreamUrl);
                            if (url.hostname.includes('highwinds-cdn.com') || url.hostname.includes('proxy.hentai.stream')) {
                                finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                                console.log("Original stream URL proxied:", finalStreamUrl);
                            }
                        } catch (e) {
                            console.error("Hanime Plugin: Failed to parse or proxy stream URL", e);
                            // Продолжаем использовать оригинальный URL, если проксирование не удалось
                        }


                        // Формируем объект для плеера
                        var playerObject = {
                            title: fullMetaData.name || fullMetaData.title || 'Без названия', // Заголовок из метаданных
                            url: finalStreamUrl, // URL потока (возможно, проксированный)
                            poster: fullMetaData.poster || fullMetaData.background, // Постер из метаданных
                        };

                        // Запускаем плеер, если есть URL потока
                        if (playerObject.url) {
                            console.log("Launching player with:", playerObject);
                            Lampa.Player.play(playerObject);
                            Lampa.Player.playlist([playerObject]); // Добавляем в плейлист (если нужно)

                            // Добавляем в историю просмотров
                            if (fullMetaData) {
                                const historyMeta = {
                                    id: fullMetaData.id,
                                    title: fullMetaData.name || fullMetaData.title,
                                    poster: fullMetaData.poster || fullMetaData.background,
                                };
                                Lampa.Favorite.add('history', historyMeta, 100); // Добавить в историю, лимит 100 записей
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
                    // Ошибка при загрузке потока
                     _this.activity.loader(false); // Скрываем лоадер
                     console.error("Hanime Plugin: Failed to fetch stream details", errorStatus, errorText);
                     Lampa.Noty.show('Ошибка загрузки потока: ' + errorStatus);
                },
                 false, // Не кешировать запрос
                 {
                     dataType: 'json', // Ожидаем JSON
                     timeout: 10000 // Таймаут запроса
                 }
            );
        };


        // Функция для отображения сообщения об отсутствии данных
        this.empty = function (msg) {
            var empty = new Lampa.Empty({ message: msg });
            // Очищаем скролл и добавляем сообщение
            scroll.render().empty().append(empty.render(true));

             // Добавляем скролл в основной контейнер, если еще не добавлен
             if (html.find('.scroll-box').length === 0) {
                 html.append(scroll.render(true));
             }

            this.activity.loader(false); // Скрываем лоадер
            this.activity.toggle(); // Переключаем активность
            this.start = empty.start; // Переназначаем start на метод Empty (для обработки кнопки OK)
        };

        // Инициализация компонента
        this.create = function () {
             this.headeraction(); // Настраиваем кнопки хедера
             this.fetchCatalog(currentParams); // Загружаем каталог
        };

        // Запуск компонента (когда он становится активным)
        this.start = function () {
            // Проверяем, что это текущая активная активность
            if (Lampa.Activity.active().activity !== this.activity) return;

            // Добавляем обработчики навигации для контроллера 'content'
            Lampa.Controller.add('content', {
                toggle: function () {
                    // Установка коллекции элементов для навигации стрелками
                    // Lampa автоматически найдет все элементы с классом 'selector' внутри scroll.render()
                    Lampa.Controller.collectionSet(scroll.render());
                    // Фокусировка на последнем активном элементе или первом (по умолчанию Navigator.focus)
                    // last хранит последний элемент, на который был наведен фокус в build -> hover:focus
                    // Если last не определен, Navigator.focus() с scroll.render() сфокусируется на первом selector внутри скролла.
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                // Обработка нажатий стрелок и кнопки Назад
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left'); // Если можно двигаться влево в текущей коллекции, двигаемся
                    else Lampa.Controller.toggle('menu'); // Иначе переключаемся на меню
                },
                right: function () {
                    if (Navigator.canmove('right')) Navigator.move('right'); // Если можно двигаться вправо в текущей коллекции, двигаемся
                    else {
                         // Особая логика: если фокус на последнем элементе карточек, возможно, хотим переключиться на кнопку фильтра
                         var filterButton = head.find('.LMEShikimori__search')[0];
                          // Проверяем, что кнопка фильтра существует и текущий фокус находится внутри body (контейнера карточек)
                         if (filterButton && Navigator.focused() && body[0].contains(Navigator.focused())) {
                              // Проверяем, является ли текущий элемент последним в строке или в целом списке,
                              // и если при движении вправо Navigator.canmove не сработал,
                              // возможно, это конец строки/списка, и мы хотим перейти на кнопку фильтра.
                              // Простая проверка canmove('right') уже должна это учитывать, но добавим явную логику перехода на хедер.
                              // Более надежный способ - проверить, находится ли сфокусированный элемент в последней колонке.
                              // Но для простоты пока оставим так: если нельзя двигаться вправо и фокус в body, попробуем перейти на хедер.
                              // Фреймворк Navigator сам определяет, куда двигаться, поэтому явный фокус на хедер здесь может быть избыточен,
                              // но если Navigator.canmove('right') на последнем элементе не переключает на хедер автоматически,
                              // то эта логика может помочь.
                              // Примечание: Lampa Navigator обычно сам обрабатывает переходы между коллекциями (header, content, menu)
                              // если они правильно заданы. Возможно, нужно просто позволить Navigator'у сделать свою работу,
                              // убрав этот else блок или уточнив его условия.
                             Lampa.Controller.toggle('head'); // Переключаемся на хедер (где кнопки Filter и Home)
                         } else {
                              // Если не можем двигаться вправо и не находимся в контейнере карточек (например, на кнопке Home/Filter),
                              // или кнопка фильтра не найдена, просто пытаемся двигаться дальше (хотя Navigator.canmove('right') уже сказал "нет")
                              // Это fallback, который, вероятно, не будет часто использоваться, если Navigator настроен правильно.
                             Navigator.move('right'); // Пытаемся двигаться вправо еще раз (менее вероятно, что сработает)
                         }
                    }
                },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up'); // Если можно двигаться вверх, двигаемся
                    else {
                         // Если нельзя двигаться вверх из контейнера карточек, переходим на хедер
                         if (Navigator.focused() && body[0].contains(Navigator.focused())) {
                              Lampa.Controller.toggle('head');
                         } else {
                              // Если нельзя двигаться вверх и мы не в контейнере карточек, возможно, мы уже в хедере
                              // и пытаемся подняться выше (что невозможно). Можно ничего не делать или добавить специфичную логику.
                              // Например, вернуться в меню, если текущая активность это позволяет.
                              // Lampa.Controller.toggle('menu'); // Пример: вернуться в меню
                         }
                    }
                },
                down: function () {
                    if (Navigator.canmove('down')) Navigator.move('down'); // Если можно двигаться вниз, двигаемся
                    // Если нельзя двигаться вниз, значит, мы внизу списка.
                    // onEnd скролла уже обрабатывает достижение конца, поэтому дополнительная логика здесь может не потребоваться,
                    // если API не поддерживает пагинацию.
                },
                back: this.back // Обработка кнопки Назад
            });
            Lampa.Controller.toggle('content'); // Активируем контроллер 'content'
        };

        // Методы жизненного цикла компонента Lampa
        this.pause = function () {
            // Вызывается, когда компонент временно перестает быть активным (например, открылось другое окно)
        };
        this.stop = function () {
            // Вызывается, когда компонент полностью останавливается (например, при переходе на другую страницу Lampa)
        };
        // Метод для получения DOM элемента компонента
        this.render = function () {
            return html;
        };
        // Метод для очистки ресурсов компонента
        this.destroy = function () {
            network.clear(); // Отменяем все активные сетевые запросы
            Lampa.Arrays.destroy(items); // Очищаем массив объектов карточек и вызываем их destroy методы
            if (scroll) {
                scroll.onEnd = null; // Удаляем обработчик onEnd
                scroll.destroy(); // Уничтожаем экземпляр скролла
            }
            if (html) html.remove(); // Удаляем корневой DOM элемент компонента
            // Обнуляем ссылки на объекты, чтобы помочь сборщику мусора
            items = null;
            network = null;
            scroll = null;
            html = null;
            body = null;
            head = null;
            last = null;
            currentParams = null;
        };
        // Обработка кнопки Назад в компоненте
        this.back = function () {
            Lampa.Activity.backward(); // Возвращаемся к предыдущей активности
        };
    }

    // Функция для старта плагина
    function startPlugin() {
        // Проверяем, был ли плагин уже инициализирован
        if (window.plugin_hanime_catalog_ready) return;

        window.plugin_hanime_catalog_ready = true; // Устанавливаем флаг инициализации

        // Регистрируем стандартный шаблон карточки с помощью Lampa.Template.add
        Lampa.Template.add('standard-lampa-card', standardLampaCardTemplate);

        // Стандартные стили Lampa для карточек и выделения должны работать автоматически
        // при использовании классов 'card' и 'selector'.

        // Регистрируем компонент в Lampa
        Lampa.Component.add('hanime_catalog', HanimeComponent);

        // Функция для добавления пункта в меню Lampa
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
            // Обработчик нажатия на пункт меню
            menu_item.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '', // URL для истории (можно оставить пустым или добавить специфичный)
                    title: 'Hanime Catalog', // Заголовок активности
                    component: 'hanime_catalog', // Имя компонента для запуска
                    page: 1 // Начальная страница (для API, если бы поддерживал)
                });
            });
            // Добавляем пункт меню в первый список меню Lampa
            $('.menu .menu__list').eq(0).append(menu_item);
        }

        // Применяем любые необходимые общие стили, если есть
        // Например, если для torrent-filter нужен специфичный margin-left
         $('head').append('<style>.torrent-filter{margin-left:1.5em;}</style>');


        // Ждем готовности приложения Lampa, прежде чем добавлять пункт меню
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

    // Запускаем плагин
    startPlugin();

})();
