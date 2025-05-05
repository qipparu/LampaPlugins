(function () {
    'use strict';

    // Убираем кастомный HanimeCard, используем стандартный Lampa.Card
    // function HanimeCard(...) { ... }

    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        // Используем Lampa.Scroll
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        // Храним экземпляры Lampa.Card
        var items = [];
        var html = $('<div class="hanime-catalog"></div>');
        // Используем стандартные классы для тела каталога
        var body = $('<div class="hanime-catalog__body category-full"></div>');
        var active = 0; // Индекс активного элемента в items
        var lastFocusedElement = null; // Последний сфокусированный DOM элемент
        var total_pages = 1; // Hanime API не пагинирован в этом каталоге, ставим 1
        var waitload = false; // Для потенциальной будущей пагинации

        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json";
        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";

        // Адрес вашего прокси сервера
        var PROXY_BASE_URL = "http://77.91.78.5:3000";


        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true);

            network.clear();
            network.native(CATALOG_URL,
                function (data) {
                    if (data && data.metas && Array.isArray(data.metas)) {
                         if (data.metas.length > 0) {
                            // Передаем только массив metas
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
                    timeout: 15000 // Увеличим таймаут на всякий случай
                }
            );
        };

        // Метод для добавления одной карточки
        this.appendCard = function(meta) {
            var _this = this;

            // Создаем экземпляр Lampa.Card, маппим данные из meta
            // Стандартный Card ожидает poster, title, id и т.д.
            var cardData = {
                id: meta.id,
                title: meta.name || meta.title || 'Без названия', // Используем name, если title нет
                poster: meta.poster,
                // Добавляем другие данные, которые могут быть полезны, если есть
                // year: meta.year, // Если API предоставляет
                // runtime: meta.runtime, // Если API предоставляет
                source: 'hanime', // Указываем источник
                // Lampa.Card также может использовать:
                // url: 'hanime:'+meta.id, // Пользовательская URL для активности, если нужно
                // method: 'movie', // или 'tv'
            };

            var card = new Lampa.Card(cardData);

            // Создаем DOM элемент карточки
            card.create();

            // Настраиваем обработчики событий на экземпляре Card
            card.onFocus = function(target, card_data) {
                lastFocusedElement = target; // Сохраняем сфокусированный DOM элемент
                active = items.indexOf(card); // Сохраняем индекс активной карточки

                // Обновляем скролл, чтобы текущая карточка была видна
                // scroll.update(card.render(true)) работает с DOM элементом
                 scroll.update(card.render(true));

                 // Обновляем фон (опционально)
                 if (card_data.poster) {
                     Lampa.Background.change(Lampa.Utils.cardImgBackground(card_data));
                 } else {
                     // Установить фон по умолчанию или предыдущий, если постер отсутствует
                     Lampa.Background.change(''); // Например, пустая строка или базовый фон
                 }
            };

            card.onEnter = function(target, card_data) {
                lastFocusedElement = target; // Сохраняем сфокусированный DOM элемент
                console.log("Hanime Plugin: Card selected", card_data);
                // При нажатии Enter, запускаем загрузку стрима и метаданных
                _this.fetchStreamAndMeta(card_data.id, card_data);
            };

            // Добавляем DOM элемент карточки в тело скролла
            body.append(card.render(true));
            // Добавляем экземпляр карточки в массив items
            items.push(card);

            // Добавляем элемент карточки в коллекцию навигатора, если компонент активен
            // Это нужно для правильной работы стрелок Up/Down/Left/Right
             if (Lampa.Controller.own(_this)) {
                 Lampa.Controller.collectionAppend(card.render(true)[0]); // Добавляем сам DOM элемент
             }

            return card; // Возвращаем экземпляр Card
        };

        // Метод для построения всего каталога
        this.build = function (metas) {
            var _this = this;

            // Очищаем предыдущие элементы, если они были
            items = [];
            body.empty();

            // Настраиваем скролл
            scroll.minus();
            // scroll.onEnd = this.next.bind(this); // Для пагинации, если будет
            // scroll.onScroll = this.limit.bind(this); // Для управления видимостью (layer--render)
            scroll.onWheel = (step)=>{
                if(!Lampa.Controller.own(this)) this.start();
                // При скролле колесом, двигаем навигатор
                if(step > 0) Lampa.Navigator.move('down');
                else Lampa.Navigator.move('up');
            };

            // Добавляем каждую карточку
            metas.forEach(this.appendCard.bind(this));

            // Добавляем тело с карточками в скролл
            scroll.append(body);

            // Добавляем скролл в главный HTML элемент компонента
            html.append(scroll.render(true));

            // Устанавливаем коллекцию элементов для навигатора и фокусируемся на первом
            // Делаем это после того, как все элементы добавлены в DOM
            this.limit(); // Устанавливаем коллекцию и управляем видимостью
            this.focusFirst(); // Фокусируемся на первом элементе

            // Отключаем лоадер и активируем контроллер
            _this.activity.loader(false);
            _this.activity.toggle();

            // Сообщаем Lampa, что компонент готов и его можно сделать видимым (layer--visible)
            Lampa.Layer.update(html); // Обновить слои DOM
            Lampa.Layer.visible(html); // Сделать этот слой видимым
        };

        // Метод для управления видимостью карточек и установки коллекции для навигатора
        this.limit = function() {
            // Определяем количество видимых элементов (примерно)
            let limit_view = 15; // Сколько элементов держать в DOM с layer--render
            let limit_collection = 50; // Сколько элементов включить в коллекцию навигатора

            // Определяем диапазон элементов для рендеринга и навигации
            // Используем Math.max(0, ...) чтобы не уйти в отрицательные индексы
            let render_start = Math.max(0, active - Math.floor(limit_view / 2));
            let render_end = render_start + limit_view;

            let collection_start = Math.max(0, active - Math.floor(limit_collection / 2));
             let collection_end = collection_start + limit_collection;


            let collection_elements = [];

            items.forEach((item, index) => {
                const element = item.render(true)[0]; // Получаем DOM элемент

                // Управляем классом layer--render для оптимизации
                if (index >= render_start && index < render_end) {
                    element.classList.add('layer--render');
                } else {
                    element.classList.remove('layer--render');
                }

                // Собираем элементы для коллекции навигатора
                 if (index >= collection_start && index < collection_end) {
                     collection_elements.push(element);
                 }
            });

            // Устанавливаем коллекцию элементов, по которым будет работать Navigator
            Lampa.Navigator.setCollection(collection_elements);

            // Убеждаемся, что сфокусированный элемент всё еще в коллекции
            // Lampa.Navigator.focused(lastFocusedElement); // Navigator сам управляет фокусом после setCollection
        };


        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id); // Используем, даже если у нас уже есть метаданные, чтобы получить полные, если API дает больше

            _this.activity.loader(true);

            // Запрашиваем стримы. Если у нас уже есть полные метаданные (переданные в meta),
            // используем их, иначе запрашиваем метаданные отдельно.
            const metaPromise = meta && meta.title ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                 network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
             });


            Promise.all([
                new Promise((resolve, reject) => {
                    network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                }),
                metaPromise

            ]).then(([streamData, metaDataResponse]) => {
                _this.activity.loader(false);

                // Извлекаем метаданные. Приоритет: полные данные из запроса, затем данные с карточки
                const fullMetaData = metaDataResponse.meta || meta; // Используем метаданные с карточки как запасной вариант

                console.log("Hanime Plugin: Stream Data:", streamData);
                console.log("Hanime Plugin: Full Meta Data:", fullMetaData);

                if (streamData && streamData.streams && streamData.streams.length > 0) {
                    // Находим наилучший поток, или берем первый
                    var streamToPlay = streamData.streams.find(s => s.quality && s.quality.includes('1080')) || // Поиск 1080p
                                       streamData.streams.find(s => s.quality && s.quality.includes('720')) || // Поиск 720p
                                       streamData.streams[0]; // Если ничего не найдено, берем первый

                    // --- Использование прокси для URL потока ---
                    var finalStreamUrl = streamToPlay.url;

                    try {
                         var url = new URL(finalStreamUrl);
                         // Проверяем хост. Можно добавить другие, если известны
                         if (url.hostname.includes('highwinds-cdn.com') || url.hostname.includes('akamaihd.net')) {
                             // Оборачиваем оригинальный URL потока адресом прокси
                             finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                             console.log("Hanime Plugin: Original stream URL proxied:", finalStreamUrl);
                         }
                    } catch (e) {
                        console.error("Hanime Plugin: Failed to parse or proxy stream URL", e);
                        // Продолжаем использовать оригинальный URL, если не удалось обработать
                    }
                    // -------------------------------------------

                    var playerObject = {
                        title: fullMetaData.name || fullMetaData.title || 'Без названия',
                        url: finalStreamUrl, // Используем URL после возможного проксирования
                        poster: fullMetaData.poster || fullMetaData.background, // background тоже может быть постером
                        // Добавляем другие метаданные для плеера, если они есть и нужны
                         id: fullMetaData.id,
                         // seasons: [...] // Если есть информация о сезонах/эпизодах
                         // episodes: [...]
                    };

                    if (playerObject.url) {
                         console.log("Hanime Plugin: Launching player with:", playerObject);
                         Lampa.Player.play(playerObject);
                         Lampa.Player.playlist([playerObject]); // Плейлист из одного элемента

                         // Добавляем в историю
                         if (fullMetaData && fullMetaData.id) {
                                const historyMeta = {
                                    id: fullMetaData.id,
                                    title: fullMetaData.name || fullMetaData.title,
                                    poster: fullMetaData.poster || fullMetaData.background,
                                    runtime: fullMetaData.runtime, // Если есть
                                    year: fullMetaData.year, // Если есть
                                    original_name: fullMetaData.original_name // Если есть
                                    // Добавьте сюда другие поля, которые Lampa использует в истории
                                };
                                Lampa.Favorite.add('history', historyMeta, 100); // 100 - максимальное количество записей?
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
                Lampa.Noty.show('Ошибка загрузки деталей: ' + (error && error.message ? error.message : 'Неизвестная ошибка'));
            });
        };

        this.empty = function (msg) {
            var empty = new Lampa.Empty({ message: msg });
            // Очищаем html и добавляем Empty
            html.empty().append(empty.render(true));
            this.activity.loader(false);
            // При пустом состоянии, контроллер должен быть привязан к Empty
            this.activity.toggle(); // Отключаем старый контроллер
            empty.start(); // Активируем контроллер Empty
            this.start = empty.start; // Переопределяем start, чтобы он запускал Empty
        };

        this.create = function () {
            // fetchCatalog() будет вызван в activity.start(), когда компонент станет активным
            // this.fetchCatalog();
        };

         this.focusFirst = function(){
            // Фокусируемся на первом элементе, если он есть
            if(items.length > 0){
                lastFocusedElement = items[0].render(true)[0]; // Первый DOM элемент
                active = 0; // Первый индекс
                Lampa.Controller.collectionFocus(lastFocusedElement, scroll.render(true)); // Фокусируемся через Controller
                // Опционально: вызвать onFocus для первого элемента вручную,
                // чтобы обновить скролл и фон сразу при старте
                 if (items[0].onFocus) {
                     items[0].onFocus(lastFocusedElement, items[0].data);
                 }
            } else {
                 // Если элементов нет, возможно, нужно сфокусироваться на пустом состоянии или другом элементе
                 // empty() уже должен настроить контроллер для своего состояния
            }
         }


        this.start = function () {
            // Проверяем, что мы - активный компонент
            if (Lampa.Activity.active().activity !== this.activity && !this.activity.canRefresh()) {
                 // Если мы не активны и не в состоянии "нуждается в обновлении",
                 // это может быть попытка вернуться к этому компоненту.
                 // В этом случае, просто переключаем контроллер на нас.
                 console.log("Hanime Plugin: Reactivating component start");
                 Lampa.Controller.toggle('content'); // Переключаем на свой контроллер 'content'
                 // Lampa.Controller.collectionFocus(lastFocusedElement || false, scroll.render(true)); // Восстанавливаем фокус
                 return;
             }


            console.log("Hanime Plugin: Component start");

            // Если каталог еще не загружен, загружаем его
            if (items.length === 0 && !this._catalog_loaded) {
                 this._catalog_loaded = true; // Флаг, чтобы загрузить один раз
                 this.fetchCatalog();
            } else {
                 // Если каталог уже загружен, просто активируем контроллер и восстанавливаем фокус
                 Lampa.Controller.add('content', {
                     link: this,
                     toggle: function () {
                         console.log("Hanime Plugin: Controller Toggle");
                         // Устанавливаем коллекцию для навигатора
                         // this.limit() уже это делает или должна делать
                         // Lampa.Navigator.setCollection(items.map(item => item.render(true)[0])); // Или используем limit()

                         // Восстанавливаем фокус на последнем элементе
                         if (lastFocusedElement) {
                              Lampa.Controller.collectionFocus(lastFocusedElement, scroll.render(true));
                         } else {
                             // Если последнего фокуса нет (первый старт или после destroy), фокусируемся на первом
                              this.focusFirst();
                         }
                     }.bind(this), // Привязываем контекст
                     left: function () {
                         // Navigator.canmove('left') проверяет, есть ли куда двигаться влево в текущей коллекции
                         if (Lampa.Navigator.canmove('left')) {
                              Lampa.Navigator.move('left');
                         } else {
                             // Если двигаться некуда, переключаемся на меню
                             Lampa.Controller.toggle('menu');
                         }
                     },
                     right: function () {
                         if (Lampa.Navigator.canmove('right')) {
                              Lampa.Navigator.move('right');
                         }
                         // else if (this.onRight) this.onRight(); // Если нужна какая-то логика справа
                     },
                     up: function () {
                         if (Lampa.Navigator.canmove('up')) {
                              Lampa.Navigator.move('up');
                         } else {
                             // Если двигаться некуда, переключаемся на заголовок/шапку
                             Lampa.Controller.toggle('head');
                         }
                     },
                     down: function () {
                         if (Lampa.Navigator.canmove('down')) {
                              Lampa.Navigator.move('down');
                             // Опционально: загрузка следующей страницы, если бы была пагинация
                             // this.next();
                         }
                     },
                     back: this.back.bind(this) // Привязываем контекст
                 });

                 Lampa.Controller.toggle('content'); // Активируем этот контроллер
                 this.limit(); // Обновляем коллекцию навигатора и видимость
                 // focusFirst() или Controller.collectionFocus будет вызван в toggle
            }
        };

        this.pause = function () {
           console.log("Hanime Plugin: Component paused");
           // Сохраняем текущий фокус перед паузой
           lastFocusedElement = Lampa.Navigator.focused();
           // Можно остановить лоадеры и т.п.
        };

        this.stop = function () {
           console.log("Hanime Plugin: Component stopped");
           // Останавливаем все процессы (загрузки и т.п.)
           network.clear();
        };

        this.render = function (js) {
            // Возвращаем DOM элемент или jQuery объект
            return js ? html[0] : html;
        };

        this.destroy = function () {
            console.log("Hanime Plugin: Component destroyed");
            network.clear();
            // Корректное удаление элементов и экземпляров
            Lampa.Arrays.destroy(items); // Lampa.Arrays.destroy вызывает destroy() на каждом элементе массива, если метод существует
            scroll.destroy();
            html.remove(); // Удаляем главный DOM элемент
            items = null;
            network = null;
            scroll = null;
            html = null;
            body = null;
            lastFocusedElement = null;
        };

        this.back = function () {
            console.log("Hanime Plugin: Back pressed");
            Lampa.Activity.backward(); // Возврат к предыдущей активности
        };
    }

    // --- Плагин активация ---
    function startPlugin() {
        if (window.plugin_hanime_catalog_ready) return;
        window.plugin_hanime_catalog_ready = true;

        // Убираем старый hanime-card шаблон
        // Lampa.Template.add('hanime-card', ...);

        // Добавляем стили, возможно, переопределяющие стили стандартных карточек
        var style = `
            /* Стили для контейнера, используем стандартный category-full */
            .hanime-catalog__body.category-full {
                justify-content: flex-start; /* Обычно карточки выравниваются по левому краю в категориях */
                align-items: flex-start; /* Выравнивание по верхнему краю */
                 padding: 20px 60px; /* Стандартные отступы category-full */
                 box-sizing: border-box; /* Учитываем padding в ширине */
            }

            /* Стили для стандартных карточек (.card) внутри нашего компонента (.hanime-catalog) */
            /* Используем стандартные стили Lampa.Card, переопределяя только необходимое */
            .hanime-catalog .card {
                 width: 185px; /* Стандартная ширина карточки фильма/сериала */
                 margin: 10px; /* Стандартные отступы между карточками */
                 /* Остальные стили (border-radius, overflow, transition) уже есть у стандартного .card */
                 /* Убираем box-sizing: border-box; если не нужно */
            }

             /* Стили для фокуса - используем стандартные focus/selector стили Lampa */
             /* У Lampa уже есть стили для .selector:focus */
             /* Если хотите кастомный фокус, переопределите их: */
             /*
             .hanime-catalog .card.selector:focus {
                 transform: scale(1.05);
                 box-shadow: 0 0 15px rgba(255, 0, 0, 0.7);
                 z-index: 5;
                 border: 3px solid rgba(255, 255, 255, 0.5);
             }
             */

            /* Убираем специфичные стили для кастомной карточки */
            /*
            .hanime-card__view { ... }
            .hanime-card__img { ... }
            .hanime-card__title { ... }
            */

            /* Стили для иконки меню */
            .menu__ico svg {
                  width: 1.5em;
                  height: 1.5em;
            }
        `;
        Lampa.Template.add('hanime-style', `<style>${style}</style>`);

        // Регистрируем компонент
        Lampa.Component.add('hanime_catalog', HanimeComponent);

        // Функция добавления пункта в меню
        function addMenuItem() {
            var menu_item = $(`
                <li class="menu__item selector">
                    <div class="menu__ico">
                        <!-- Иконка - можно использовать стандартную, например movie.svg -->
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">${Lampa.Lang.translate('hanime_catalog_title', 'Hanime Catalog')}</div> <!-- Добавим перевод -->
                </li>
            `);
            menu_item.on('hover:enter', function () {
                // Запускаем компонент через Activity
                Lampa.Activity.push({
                    title: Lampa.Lang.translate('hanime_catalog_title', 'Hanime Catalog'), // Перевод заголовка
                    component: 'hanime_catalog', // Имя нашего компонента
                    page: 1 // Если бы была пагинация
                    // source: 'hanime', // Можно добавить источник для идентификации
                });
            });
            // Добавляем пункт в первое (главное) меню
            $('.menu .menu__list').eq(0).append(menu_item);
        }

        // Добавляем стили в head
        $('head').append(Lampa.Template.get('hanime-style', {}, true));

        // Ждем готовности приложения Lampa перед добавлением пункта меню
        if (window.appready) {
             addMenuItem();
        } else {
             Lampa.Listener.follow('app', function (e) {
                 if (e.type === 'ready') {
                     addMenuItem();
                 }
             });
        }

        // Опционально: добавить перевод для заголовка
        Lampa.Lang.add({
             hanime_catalog_title: {
                 ru: 'Каталог Hanime',
                 en: 'Hanime Catalog'
                 // Добавьте другие языки по необходимости
             }
        });
    }

    // Запускаем плагин
    startPlugin();

})();
