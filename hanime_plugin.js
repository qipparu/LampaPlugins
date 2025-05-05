(function () {
    'use strict';

    // Ваш компонент карточки - остается без изменений
    // Он должен создавать DOM-элемент с классом 'card', 'selector' и другими стандартными Lampa классами.
    // Проверьте ваш шаблон 'hanime-card' ниже - он должен включать 'selector' и структуру вида card__view, card__icons, etc.
    function HanimeCard(data) {
        // Получаем HTML-код карточки из шаблона. Ваш шаблон должен содержать стандартные классы Lampa.
        var cardTemplate = Lampa.Template.get('hanime-card', {
            id: data.id,
            img: data.poster, // Предполагается, что API возвращает poster или используйте другие поля
            title: data.name,   // Предполагается, что API возвращает name или используйте другие поля
        });

        var cardElement = $(cardTemplate); // Создаем jQuery объект из HTML

        // Важно: Класс 'selector' должен быть в самом шаблоне hanime-card.
        // Если он уже там, следующая строка не нужна:
        // cardElement.addClass('selector');

        // Методы render и destroy для работы с компонентом
        this.render = function () {
            return cardElement;
        };

        this.destroy = function () {
            cardElement.remove(); // Удаляем DOM элемент карточки при уничтожении
        };
    }

    // Ваш основной компонент для отображения горизонтальной линии аниме
    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest(); // Управление сетевыми запросами

        // Инициализируем горизонтальный скролл!
        // Direction: 'horizontal' указывает направление прокрутки
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });

        var items = []; // Массив объектов HanimeCard
        var html; // Основной DOM-контейнер компонента (будет типа items-line)
        var itemsContainer; // DOM-контейнер для карточек внутри скролла (будет типа scroll__body items-cards)

        var active = 0; // Индекс текущего сфокусированного элемента
        var last; // DOM-элемент последнего сфокусированного элемента

        // URL-ы API (из вашего первого кода)
        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        // Пока используем 'newset' как источник данных для одной горизонтальной линии
        var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json";
        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";

        // Ваш прокси
        var PROXY_BASE_URL = "http://77.91.78.5:3000";


        // Метод для создания основной структуры DOM компонента
        this.buildLayout = function() {
            // Создаем структуру, имитирующую items-line из примеров Lampa
            html = $(`
                <div class="items-line layer--visible layer--render items-line--type-cards">
                    <div class="items-line__head">
                        <div class="items-line__title">Последние добавленные</div> <!-- Заголовок категории -->
                        <!-- Возможно, добавить items-line__more selector если API поддерживает пагинацию/другие категории -->
                    </div>
                    <div class="items-line__body">
                        <!-- Сюда Scroll вставит свой DOM -->
                    </div>
                </div>
            `);

            // Создаем контейнер, куда будем добавлять сами карточки.
            // Он получит классы 'scroll__body items-cards' от Scroll при scroll.append()
             itemsContainer = $('<div class="items-cards"></div>'); // Начальные классы, Scroll добавит 'scroll__body'
             console.log("Hanime Plugin: Layout built, itemsContainer created:", itemsContainer[0]);
        };


        // Метод для загрузки данных каталога
        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true); // Показываем лоадер

            network.clear();
            network.native(CATALOG_URL,
                function (data) {
                    console.log("Hanime Plugin: Catalog data received", data);
                    if (data && data.metas && Array.isArray(data.metas)) {
                         if (data.metas.length > 0) {
                            _this.build(data.metas); // Передаем метаданные в build
                         } else {
                            _this.empty("Каталог пуст."); // Показываем сообщение, если нет данных
                         }
                    } else {
                        _this.empty("Неверный формат данных от API."); // Неверный формат
                        console.error("Hanime Plugin: Invalid data format", data);
                    }
                },
                function (errorStatus, errorText) {
                    _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus); // Ошибка загрузки
                    console.error("Hanime Plugin: Failed to load catalog", errorStatus, errorText);
                },
                false,
                {
                    dataType: 'json',
                    timeout: 15000
                }
            );
        };

        // Метод для построения UI после получения данных
        this.build = function (result) {
            var _this = this;

            itemsContainer.empty(); // Очищаем контейнер перед добавлением новых карточек
            items = []; // Очищаем массив объектов карточек

            console.log("Hanime Plugin: Building UI with", result.length, "items.");

            result.forEach(function (meta) {
                var card = new HanimeCard(meta); // Создаем новый объект карточки
                var cardElement = card.render(); // Получаем его DOM элемент (jQuery объект)

                // Добавляем обработчики событий на DOM элемент карточки
                cardElement.on('hover:focus', function () {
                    // Это событие генерируется Lampa Controller, когда фокус попадает на этот элемент.
                    console.log("Hanime Plugin: Item focused:", meta.name);
                    last = cardElement[0]; // Сохраняем ссылку на DOM элемент
                    active = items.indexOf(card); // Сохраняем индекс в массиве
                    // Прокручиваем скролл к этому элементу. Parameter 'true' = сглаженная прокрутка.
                    scroll.update(cardElement, true);
                     console.log("Hanime Plugin: Scroll updated for focused item.");
                }).on('hover:enter', function () {
                    // Событие вызывается при нажатии ОК/Enter на сфокусированном элементе.
                    console.log("Hanime Plugin: Item selected:", meta.name);
                    _this.fetchStreamAndMeta(meta.id, meta); // Переходим к воспроизведению
                });

                itemsContainer.append(cardElement); // Добавляем DOM элемент карточки в контейнер
                items.push(card); // Сохраняем объект карточки в массив
            });

            // Добавляем itemsContainer в Lampa.Scroll. Lampa.Scroll обернет его в scroll__body items-cards.
            scroll.append(itemsContainer);
             console.log("Hanime Plugin: itemsContainer appended to scroll.");

            // Вставляем рендеринг скролла в items-line__body основного html компонента.
            // scroll.render() возвращает корневой элемент Lampa.Scroll, который включает scroll__content и scroll__body.
             html.find('.items-line__body').empty().append(scroll.render(true));
             console.log("Hanime Plugin: Scroll rendered into items-line__body. Redraw forced.");

            _this.activity.loader(false); // Скрываем лоадер
            _this.activity.toggle(); // Показываем активность компонента
             console.log("Hanime Plugin: UI built and activity shown. Total items:", items.length);

            // Теперь контроллер в методе start будет настроен навигацию по элементам внутри Scroll DOM
            // Initial focus will be handled by Controller.collectionFocus triggering the first hover:focus event.
        };

        // Метод для загрузки потока и метаданных (без изменений)
        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

            _this.activity.loader(true);
            console.log("Hanime Plugin: Fetching stream and meta for ID:", id);

            Promise.all([
                new Promise((resolve, reject) => {
                    network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                }),
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                     network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                 })
            ]).then(([streamData, metaDataResponse]) => {
                _this.activity.loader(false);

                // Используем полученные метаданные или метаданные из ответа API
                const fullMetaData = metaDataResponse.meta || metaDataResponse;

                console.log("Stream Data received:", streamData);
                console.log("Full Meta Data received:", fullMetaData);

                if (streamData && streamData.streams && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0]; // Берем первый поток
                    var finalStreamUrl = streamToPlay.url;

                    // Логика проксирования highwinds-cdn URL (без изменений)
                    try {
                         var url = new URL(finalStreamUrl);
                         if (url.hostname.includes('highwinds-cdn.com')) {
                             finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                             console.log("Original stream URL proxied:", finalStreamUrl);
                         }
                    } catch (e) {
                        console.error("Hanime Plugin: Failed to parse or proxy stream URL", e);
                        // Если ошибка парсинга, оставляем оригинальный URL
                    }

                    // Подготовка объекта для Lampa Player
                    var playerObject = {
                        title: fullMetaData.name || fullMetaData.title || 'Без названия',
                        url: finalStreamUrl,
                        poster: fullMetaData.poster || fullMetaData.background, // Или другие поля для постера
                    };

                    // Запуск плеера
                    if (playerObject.url) {
                         console.log("Hanime Plugin: Launching player with:", playerObject);
                         Lampa.Player.play(playerObject);
                         Lampa.Player.playlist([playerObject]); // Можно добавить только текущий элемент

                         // Добавление в историю просмотра (без изменений)
                         if (fullMetaData) {
                                const historyMeta = {
                                    id: fullMetaData.id, // Используем id из метаданных
                                    title: fullMetaData.name || fullMetaData.title,
                                    poster: fullMetaData.poster || fullMetaData.background,
                                    runtime: fullMetaData.runtime, // Если есть в метаданных
                                    year: fullMetaData.year,     // Если есть
                                    original_name: fullMetaData.original_name // Если есть
                                };
                                // 'history' - тип закладки, historyMeta - данные, 100 - лимит истории
                                Lampa.Favorite.add('history', historyMeta, 100);
                                console.log("Hanime Plugin: Added to history:", historyMeta);
                         }

                    } else {
                         Lampa.Noty.show('Не удалось получить ссылку на поток.');
                         console.error("Hanime Plugin: No valid stream URL found:", streamData);
                    }

                } else {
                     Lampa.Noty.show('Потоки не найдены для этого аниме.');
                     console.warn("Hanime Plugin: No streams found or invalid structure:", streamData);
                }

            }).catch(error => {
                _this.activity.loader(false);
                console.error("Hanime Plugin: Failed to fetch stream/meta details", error);
                Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'));
            });
        };

        // Метод для отображения пустого состояния или ошибки
        this.empty = function (msg) {
            console.log("Hanime Plugin: Displaying empty state:", msg);
            var empty = new Lampa.Empty({ message: msg });
            // Заменяем текущий контент компонента на Empty
            html.empty().append(empty.render(true));
            this.activity.loader(false);
            this.activity.toggle();
             // Переназначаем метод start на start Empty компонента для корректной навигации
            this.start = empty.start;
        };

        // Метод вызывается при создании активности
        this.create = function () {
            console.log("Hanime Plugin: create()");
            this.buildLayout(); // Строим основной layout items-line
            this.activity.loader(true); // Показываем лоадер, пока загружаем данные
            this.fetchCatalog(); // Начинаем загрузку данных каталога
        };

        // Метод вызывается при переходе на эту активность и ее фокусе
        this.start = function () {
            console.log("Hanime Plugin: start()");
            // Убеждаемся, что мы работаем с активной активностью
            if (Lampa.Activity.active().activity !== this.activity) return;
             console.log("Hanime Plugin: start() - Activity is active.");

            // Устанавливаем Controller для навигации по нашим элементам
            Lampa.Controller.add('content', {
                toggle: function () {
                     console.log("Hanime Plugin: Controller toggle()");
                    // collectionSet указывает Controller, где искать навигационные элементы (.selector).
                    // scroll.render() возвращает DOM элемент, который является контейнером для scroll.
                    Lampa.Controller.collectionSet(scroll.render());
                    // collectionFocus устанавливает начальный фокус. Он попытается сфокусироваться
                    // на 'last' элементе (если есть, при возврате), или на первом по умолчанию.
                    // Этот вызов инициирует первый 'hover:focus' событие на элементе.
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                    console.log("Hanime Plugin: Controller collectionSet and collectionFocus called.");
                },
                // Стандартные обработчики кнопок пульта/стрелок
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu'); // Переключение на меню
                },
                right: function () {
                    if (Navigator.canmove('right')) Navigator.move('right'); // Перемещение вправо
                },
                up: function () {
                    // В горизонтальной линии, перемещение вверх может переключить на Header,
                    // или переместить фокус на элементы над этой линией, если они есть
                    // в родительском вертикальном скролле.
                    // Здесь, так как это отдельная активность, просто переключаемся на Header.
                    Lampa.Controller.toggle('head');
                },
                down: function () {
                    // В горизонтальной линии, перемещение вниз может переместить на элементы
                    // под этой линией, если они есть в родительском вертикальном скролле.
                    // Здесь, так как это отдельная активность, нет элементов ниже по умолчанию.
                    // Если бы компонент содержал несколько горизонтальных линий, здесь нужно
                    // было бы реализовать переход на следующую линию.
                    // Сейчас просто оставим Navigator.canmove('down'), но оно вероятно будет false.
                    // Или можно переключиться на другой контроллер, если он есть.
                    // Для одной горизонтальной линии в отдельной активности, стрелка "вниз" может не делать ничего
                     if (Navigator.canmove('down')) Navigator.move('down');
                },
                back: this.back // Обработчик кнопки "Назад"
            });
            // Активируем наш Controller для этой активности
            Lampa.Controller.toggle('content');
             console.log("Hanime Plugin: Controller 'content' toggled.");

            // Нет необходимости вручную вызывать scroll.update() с setTimeout здесь.
            // Controller.collectionFocus выше вызовет hover:focus на элементе,
            // и наш обработчик hover:focus позаботится о прокрутке.

        };

        this.pause = function () {
            console.log("Hanime Plugin: pause()");
            // Сохраняем последний сфокусированный DOM-элемент, чтобы вернуться к нему
            last = Lampa.Controller.item() || last; // Lampa.Controller.item() возвращает текущий DOM элемент в фокусе
             console.log("Hanime Plugin: Saving last focused item:", last);
        };

        this.stop = function () {
             console.log("Hanime Plugin: stop()");
            // Методы stop и destroy вызываются при закрытии активности.
            // Основная очистка в destroy.
        };

        // Метод рендеринга компонента - возвращает его корневой DOM элемент items-line
        this.render = function () {
             console.log("Hanime Plugin: render()");
            // Убеждаемся, что layout построен, если не был построен раньше
            if (!html) {
                this.buildLayout();
            }
            return html;
        };

        // Метод уничтожения компонента - освобождаем ресурсы
        this.destroy = function () {
            console.log("Hanime Plugin: destroy()");
            network.clear(); // Отменяем все сетевые запросы
            Lampa.Arrays.destroy(items); // Уничтожаем объекты карточек
            scroll.destroy(); // Уничтожаем экземпляр Lampa.Scroll (очищает DOM Scroll и отписывается от событий)
            if(html) html.remove(); // Удаляем корневой DOM элемент компонента

            // Удаляем наш Controller при уничтожении компонента
            if(Lampa.Controller.enabled().name === 'content') {
                // Прежде чем удалить наш контроллер, можем очистить его коллекцию и
                // вернуть управление базовому контроллеру (например, 'app').
                // Это может помочь избежать ошибок, если Controller все еще пытается работать
                // с удаленными элементами.
                Lampa.Controller.collectionSet([]);
                // Lampa.Controller.toggle('app'); // Не всегда нужно, Lampa может управлять сама
            }
            Lampa.Controller.remove('content'); // Удаляем зарегистрированный контроллер

            // Обнуляем ссылки для сборщика мусора
            items = null;
            network = null;
            scroll = null;
            html = null;
            itemsContainer = null;
            last = null;
            console.log("Hanime Plugin: Component destroyed.");
        };

        // Обработчик кнопки "Назад"
        this.back = function () {
             console.log("Hanime Plugin: back() - Going backward.");
            Lampa.Activity.backward(); // Стандартный метод Lampa для возврата к предыдущей активности
        };
    }

    // Функция инициализации плагина
    function startPlugin() {
        console.log("Hanime Plugin: startPlugin()");

        // Проверяем, не запущен ли плагин уже, по флагу window.plugin_hanime_catalog_ready
        if (window.plugin_hanime_catalog_ready) {
             console.log("Hanime Plugin: Plugin already initialized.");
             return;
        }

        window.plugin_hanime_catalog_ready = true; // Устанавливаем флаг
        console.log("Hanime Plugin: Setting plugin_hanime_catalog_ready flag.");


        // --- Важно: Шаблоны и стили должны использовать СТАНДАРТНЫЕ классы Lampa ---

        // Ваши CSS стили для горизонтальной линии и карточек
        // Стили из вашего первого варианта, адаптированные под структуру items-line
        // Проверьте отступы и размеры, чтобы соответствовали Lampa
        var style = `
            /* Стили для самого контейнера items-line */
            .items-line {
                 padding: 0 0 2em 0; /* Вертикальный отступ между линиями */
            }
            .items-line__head {
                 padding: 0 3.5em 1em 3.5em; /* Горизонтальные отступы и снизу */
            }
            /* Стили для body, содержащего горизонтальный скролл */
            .items-line__body {
                padding: 0 2.5em; /* Горизонтальный отступ внутри линии */
            }
            /* Сам контейнер для карточек внутри скролла - класс items-cards */
            .items-cards {
                /* Lampa.Scroll добавляет сюда flex или похожий стиль */
                /* Убедитесь, что flex-direction: row; если Lampa Scroll не ставит сам */
            }


            /* Ваши стили для карточек - используют стандартные классы */
            .hanime-card {
                /* Базовый стиль карточки */
                width: 185px; /* Стандартная ширина для постеров */
                height: 270px + 1em + 0.5em; /* Высота view + margin-top + padding-bottom на title */
                margin: 0 0.5em; /* Горизонтальный отступ между карточками */
                /* Важно: vertical margin 0, т.к. отступы между строками задает .items-line */
                border-radius: 0.5em;
                overflow: hidden;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                position: relative;
                box-sizing: border-box;
                /* background-color: rgba(255,255,255,0.05); /* Может быть определен на .card */
            }

            /* Стиль фокуса для карточки */
            .hanime-card.selector:focus,
            .card.selector:focus { /* Можно добавить универсальный селектор для совместимости */
                transform: scale(1.05); /* Увеличение */
                box-shadow: 0 0 15px rgba(255, 0, 0, 0.7); /* Тень */
                z-index: 5; /* Убедимся, что фокусный элемент поверх других */
                border: 3px solid rgba(255, 255, 255, 0.5); /* Граница */
            }

             /* Скрытие стандартного outline фокуса */
             .hanime-card.selector.focus:not(.native),
             .card.selector.focus:not(.native) {
                 border-color: transparent;
                 outline: none;
             }


            /* Стили для view области с картинкой - используют стандартные классы */
            .hanime-card__view { /* Может быть .card__view в вашем шаблоне */
                position: relative;
                width: 100%; /* Занимает всю ширину карточки */
                height: 270px; /* Фиксированная высота для картинки */
                border-radius: 0.5em;
                overflow: hidden;
                background-color: rgba(255,255,255,0.05); /* Цвет загрузки */
            }

             /* Стили для самой картинки - используют стандартные классы */
             .hanime-card__img { /* Может быть .card__img в вашем шаблоне */
                 position: absolute;
                 width: 100%;
                 height: 100%;
                 object-fit: cover; /* Масштабирование с сохранением пропорций */
                 border-radius: 0.5em;
             }

            /* Стили для заголовка карточки - используют стандартные классы */
             .hanime-card__title { /* Может быть .card__title в вашем шаблоне */
                 margin-top: 0.5em;
                 padding: 0 0.5em;
                 font-size: 1em;
                 font-weight: bold;
                 white-space: nowrap;
                 overflow: hidden;
                 text-overflow: ellipsis; /* Многоточие для длинных заголовков */
                 text-align: center;
                 color: #fff;
             }
            /* Если у карточки есть поле .card__age, можно задать ему стиль */
             .hanime-card .card__age { /* Убедитесь, что age элемент в шаблоне имеет класс card__age */
                text-align: center;
                font-size: 0.9em;
                color: rgba(255, 255, 255, 0.7);
             }


            /* Дополнительные стандартные классы для элементов внутри card__view */
             .card__icons { /* Контейнер для иконок (история, закладки и т.д.) */
                position: absolute;
                top: 0.5em;
                right: 0.5em;
                z-index: 2;
             }
             .card__icons-inner { /* Внутренний контейнер для самих иконок */
                display: flex;
                flex-direction: column;
                gap: 0.2em;
             }
             .card__vote { /* Рейтинг (IMDb/Kinopoisk и т.д.) */
                 position: absolute;
                 bottom: 0.5em;
                 left: 0.5em;
                 background-color: rgba(0,0,0,0.7);
                 color: #fff;
                 padding: 0.2em 0.4em;
                 border-radius: 0.3em;
                 font-size: 0.9em;
                 z-index: 2;
             }
             .card__quality { /* Качество видео */
                position: absolute;
                 bottom: 0.5em;
                 right: 0.5em;
                 background-color: rgba(0,0,0,0.7);
                 color: #fff;
                 padding: 0.2em 0.4em;
                 border-radius: 0.3em;
                 font-size: 0.9em;
                 z-index: 2;
             }


            /* Стиль для иконки меню - без изменений */
            .menu__ico svg {
                  width: 1.5em;
                  height: 1.5em;
            }
        `;
        // Добавляем стили в <head> документа. Используем Lampa.Template для добавления styles.
        Lampa.Template.add('hanime-style', `<style>${style}</style>`);
         $('head').append(Lampa.Template.get('hanime-style', {}, true)); // Используем jQuery append после создания template


        // Ваш шаблон карточки с правильными классами
        Lampa.Template.add('hanime-card', `
            <div class="hanime-card card selector layer--visible layer--render">
                <div class="card__view hanime-card__view"> <!-- Используем card__view как контейнер -->
                    <img src="{img}" class="card__img hanime-card__img" alt="{title}" loading="lazy" /> <!-- Используем card__img -->
                    <div class="card__icons hanime-card__icons"> <!-- Используем card__icons -->
                        <div class="card__icons-inner hanime-card__icons-inner"></div>
                    </div>
                    <!-- Если API предоставляет рейтинг и качество, можно добавить эти блоки в шаблон -->
                    <!-- <div class="card__vote hanime-card__vote"></div> -->
                    <!-- <div class="card__quality hanime-card__quality"><div></div></div> -->
                </div>
                <div class="card__title hanime-card__title">{title}</div> <!-- Используем card__title -->
                 <!-- Если API предоставляет год, можно добавить этот блок в шаблон -->
                 <!-- <div class="card__age hanime-card__age"></div> -->
            </div>
        `);
         console.log("Hanime Plugin: HanimeCard template added.");


        // Регистрируем ваш компонент в Lampa Component Manager
        Lampa.Component.add('hanime_catalog', HanimeComponent);
        console.log("Hanime Plugin: Component 'hanime_catalog' registered.");


        // Функция для добавления пункта меню в главное меню Lampa
        function addMenuItem() {
             // Проверяем, чтобы не добавлять дубликаты
             if ($('.menu .menu__list .menu__text:contains("Hanime Catalog")').length > 0) {
                 console.log("Hanime Plugin: Menu item already exists. Skipping addition.");
                 return;
             }
             console.log("Hanime Plugin: Adding menu item to Lampa menu.");

            // Создаем DOM элемент пункта меню, используя стандартные классы Lampa
            var menu_item = $(`
                <li class="menu__item selector"> <!-- Класс 'selector' нужен и для пунктов меню -->
                    <div class="menu__ico">
                        <!-- Ваша SVG иконка -->
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">Hanime Catalog</div> <!-- Текст пункта меню -->
                </li>
            `);

            // Добавляем обработчик клика/нажатия на пункт меню
            menu_item.on('hover:enter', function () {
                 console.log("Hanime Plugin: Menu item selected. Pushing activity 'hanime_catalog'.");
                // При активации пункта меню, запускаем новую активность с нашим компонентом
                Lampa.Activity.push({
                    url: '', // URL активности (можно оставить пустым, если не используется роутинг)
                    title: 'Hanime Catalog', // Заголовок, который будет виден вверху
                    component: 'hanime_catalog', // Имя зарегистрированного компонента для запуска
                    page: 1 // Стартовая страница (если компонент поддерживает пагинацию)
                });
            });

            // Находим первое меню в Lampa и добавляем туда наш пункт
            $('.menu .menu__list').eq(0).append(menu_item);
             console.log("Hanime Plugin: Menu item added to DOM.");
        }


        // Ждем события 'appready' от Lampa, прежде чем добавлять UI элементы (как пункт меню).
        // Это гарантирует, что DOM структура Lampa готова.
        if (window.appready) {
             console.log("Hanime Plugin: Lampa is already appready. Adding menu item.");
             addMenuItem();
        } else {
             // Если Lampa еще не готова, подписываемся на событие
             console.log("Hanime Plugin: Waiting for Lampa appready event.");
             Lampa.Listener.follow('app', function (e) {
                 if (e.type === 'ready') {
                     console.log("Hanime Plugin: Lampa appready event received. Adding menu item.");
                     addMenuItem();
                 }
             });
        }

        console.log("Hanime Plugin: startPlugin finished.");
    }

    // Запускаем функцию инициализации плагина при загрузке скрипта
    startPlugin();

})();
