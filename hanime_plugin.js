(function () {
    'use strict';

    // --- Функция для создания карточки ---
    function HanimeCard(data) {
        var cardTemplate = Lampa.Template.get('hanime-card', {
            id: data.id,
            img: data.poster,
            title: data.name,
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

    // --- Основной компонент каталога Hanime ---
    function HanimeComponent(componentObject) {
        // --- НАСТРОЙКА АДРЕСА ПРОКСИ-СЕРВЕРА ---
        // Замените 'http://localhost:8080' на реальный адрес вашего запущенного
        // Docker CORS прокси (IP-адрес или доменное имя машины, где запущен Docker, и порт 8080).
        const MY_PROXY_BASE_URL = 'http://77.91.78.5:8080/:8080';
        // --- КОНЕЦ НАСТРОЙКИ ПРОКСИ ---

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

        // Загрузка каталога
        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true);

            network.clear();
            network.native(CATALOG_URL,
                function (data) {
                    _this.activity.loader(false); // Убираем загрузчик здесь
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
                    _this.activity.loader(false); // Убираем загрузчик и при ошибке
                    _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                    console.error("Hanime Plugin: Failed to load catalog", errorStatus, errorText);
                },
                false, // Не использовать кеш Lampa
                {
                    dataType: 'json',
                    timeout: 15000 // Таймаут запроса
                }
            );
        };

        // Построение списка карточек
        this.build = function (result) {
            var _this = this;
            scroll.minus(); // Очищаем предыдущие элементы скролла

            body.empty(); // Очищаем контейнер перед добавлением новых карточек
            items = []; // Очищаем массив элементов

            result.forEach(function (meta) {
                var card = new HanimeCard(meta);
                var cardElement = card.render();

                cardElement.on('hover:focus', function () {
                    last = cardElement[0]; // Запоминаем последний элемент в фокусе
                    active = items.indexOf(card); // Обновляем активный индекс
                    scroll.update(cardElement, true); // Обновляем позицию скролла
                }).on('hover:enter', function () { // Действие при нажатии Enter/OK
                    console.log("Selected Anime:", meta.id, meta.name);
                    // Запрашиваем данные для потока и метаданные
                    _this.fetchStreamAndMeta(meta.id, meta);
                });

                body.append(cardElement); // Добавляем карточку в DOM
                items.push(card); // Добавляем объект карточки в массив
            });

            // Если есть элементы, добавляем их в скролл и отображаем
            if(items.length > 0) {
                scroll.append(body);
                html.append(scroll.render(true)); // Добавляем скролл в основной контейнер
                // _this.activity.loader(false); // Загрузчик убран раньше
                _this.activity.toggle(); // Показываем активность
            } else {
                 this.empty("Ничего не найдено."); // Если после обработки массив пуст
            }
        };

        // Загрузка данных о потоке и метаданных для выбранного аниме
        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

            _this.activity.loader(true); // Показываем загрузчик

            // Используем Promise.all для параллельной загрузки потоков и метаданных
            Promise.all([
                // Запрос потоков
                new Promise((resolve, reject) => {
                    network.native(streamUrl, resolve, (jqXHR, textStatus, errorThrown) => reject(errorThrown || textStatus), false, { dataType: 'json', timeout: 10000 });
                }),
                // Запрос метаданных (или использование переданных, если есть)
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                    network.native(metaUrl, resolve, (jqXHR, textStatus, errorThrown) => reject(errorThrown || textStatus), false, { dataType: 'json', timeout: 10000 });
                })
            ]).then(([streamData, metaDataResponse]) => {
                _this.activity.loader(false); // Скрываем загрузчик

                // Получаем полные метаданные
                const fullMetaData = metaDataResponse.meta || metaDataResponse;

                console.log("Stream Data:", streamData);
                console.log("Full Meta Data:", fullMetaData);

                // Проверяем наличие потоков
                if (streamData && streamData.streams && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0]; // Берем первый поток
                    var originalUrl = streamToPlay.url; // Получаем оригинальный URL потока
                    var proxiedUrl = '';

                    // --- МОДИФИКАЦИЯ: Формирование URL для СВОЕГО Docker прокси ---
                    if (MY_PROXY_BASE_URL && originalUrl && originalUrl.startsWith('http')) {
                        try {
                            // Используем встроенный URL парсер браузера
                            const urlObject = new URL(originalUrl);
                            const scheme = urlObject.protocol.replace(':', ''); // 'http' или 'https'
                            const host = urlObject.hostname; // 's33.highwinds-cdn.com'
                            // Путь включает ведущий слэш и параметры запроса
                            const pathAndQuery = urlObject.pathname + urlObject.search; // '/3/3/0/5/h1x/...' или '/'

                            // Собираем URL для прокси
                            proxiedUrl = `${MY_PROXY_BASE_URL}/proxy/${scheme}/${host}${pathAndQuery}`;
                            console.log("Using Docker Proxy URL:", proxiedUrl);

                        } catch (e) {
                            console.error("Hanime Plugin: Failed to parse original URL for proxy:", originalUrl, e);
                            proxiedUrl = originalUrl; // Возвращаемся к оригиналу при ошибке парсинга
                        }
                    } else {
                        proxiedUrl = originalUrl; // Используем оригинал, если URL не http(s), пустой или прокси не задан
                        if (!originalUrl) {
                            console.error("Hanime Plugin: Original stream URL is empty!");
                        } else if (!originalUrl.startsWith('http')) {
                             console.warn("Hanime Plugin: URL doesn't seem to need proxying or has an unexpected format:", originalUrl);
                        }
                    }
                    // --- КОНЕЦ МОДИФИКАЦИИ ---

                    // Создаем объект для плеера Lampa
                    var playerObject = {
                        title: fullMetaData.name || fullMetaData.title || 'Без названия',
                        url: proxiedUrl, // <--- Используем URL нашего Docker прокси
                        poster: fullMetaData.poster || fullMetaData.background,
                        // Можно добавить другие параметры, если нужно (субтитры и т.д.)
                    };

                    // Проверяем, что URL существует и запускаем плеер
                    if (playerObject.url) {
                        console.log("Launching player with:", playerObject);
                        Lampa.Player.play(playerObject); // Запускаем воспроизведение
                        Lampa.Player.playlist([playerObject]); // Добавляем в плейлист (для истории и управления)

                        // Сохраняем в историю просмотров
                        if (fullMetaData) {
                            const historyMeta = {
                                id: fullMetaData.id,
                                title: fullMetaData.name || fullMetaData.title,
                                poster: fullMetaData.poster || fullMetaData.background,
                                runtime: fullMetaData.runtime,
                                year: fullMetaData.year,
                                // original_name: fullMetaData.original_name // Раскомментировать, если нужно
                            };
                            // Добавляем в историю, ограничивая количество записей (например, 100)
                            Lampa.Favorite.add('history', historyMeta, 100);
                        }
                    } else {
                        Lampa.Noty.show('Не удалось получить или обработать ссылку на поток.');
                        console.error("Hanime Plugin: No valid stream URL after processing:", playerObject.url, "Original:", originalUrl);
                    }

                } else {
                    // Если потоки не найдены
                    Lampa.Noty.show('Потоки не найдены для этого аниме.');
                    console.warn("Hanime Plugin: No streams found or invalid stream data structure:", streamData);
                }

            }).catch(error => {
                // Обработка ошибок при загрузке потоков/метаданных
                _this.activity.loader(false);
                console.error("Hanime Plugin: Failed to fetch stream/meta details", error);
                // Показываем уведомление об ошибке
                const errorMessage = typeof error === 'string' ? error : (error.message || 'Неизвестная ошибка сети');
                Lampa.Noty.show('Ошибка загрузки деталей: ' + errorMessage);
            });
        };

        // Отображение пустого состояния
        this.empty = function (msg) {
            var empty = new Lampa.Empty({ // Используем стандартный компонент Lampa для пустого экрана
                message: msg || "Здесь пока ничего нет"
            });
            html.empty().append(empty.render(true)); // Очищаем и добавляем сообщение
            this.activity.loader(false); // Убедимся, что загрузчик скрыт
            this.activity.toggle(); // Показываем активность (с сообщением)
            // Переназначаем метод start на метод start компонента Empty, чтобы можно было сфокусироваться на сообщении
            this.start = empty.start.bind(empty);
        };

        // Инициализация компонента
        this.create = function () {
            this.activity.loader(true); // Показываем загрузчик при создании
            this.fetchCatalog(); // Запускаем загрузку каталога
        };

        // Вызывается при активации (показе) компонента
        this.start = function () {
            // Убедимся, что активна именно эта активность
            if (Lampa.Activity.active().activity !== this.activity) return;

            Lampa.Controller.add('content', { // Регистрируем обработчики навигации
                toggle: function () { // Вызывается при переключении на этот контент
                    Lampa.Controller.collectionSet(scroll.render()); // Устанавливаем коллекцию для навигации
                    Lampa.Controller.collectionFocus(last || false, scroll.render()); // Фокусируемся на последнем элементе или первом
                },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu'); // Если влево нельзя, переходим в меню
                },
                right: function () {
                    // Проверяем, можно ли двигаться вправо
                    if (Navigator.canmove('right')) {
                         Navigator.move('right');
                    } else {
                         // Можно добавить логику перехода к скроллбару, если он есть
                         // Lampa.Scroll.hsbar(scroll.render(), 'right')
                    }
                },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head'); // Если вверх нельзя, переходим к шапке
                },
                down: function () {
                    if (Navigator.canmove('down')) {
                        Navigator.move('down');
                    } else {
                        // Можно добавить логику подгрузки контента или перехода к скроллбару
                        // Lampa.Scroll.hsbar(scroll.render(), 'down')
                    }
                },
                back: this.back // Вызываем метод back компонента для возврата назад
            });
            Lampa.Controller.toggle('content'); // Активируем управление контентом
        };

        // Вызывается при приостановке активности (например, открытии плеера)
        this.pause = function () {
            // Можно добавить логику сохранения состояния, если нужно
        };

        // Вызывается при полной остановке активности
        this.stop = function () {
            // Можно добавить логику очистки таймеров и т.д.
        };

        // Возвращает DOM-элемент компонента
        this.render = function () {
            return html;
        };

        // Уничтожение компонента, очистка ресурсов
        this.destroy = function () {
            network.clear(); // Прерываем все сетевые запросы
            // Уничтожаем все созданные карточки Lampa.Arrays.destroy(items); вызовет метод destroy() у каждого элемента
            Lampa.Arrays.destroy(items);
            scroll.destroy(); // Уничтожаем скролл
            html.remove(); // Удаляем основной HTML элемент
            // Обнуляем переменные для сборщика мусора
            items = null;
            network = null;
            scroll = null;
            html = null;
            body = null;
            last = null;
        };

        // Метод для возврата на предыдущий экран
        this.back = function () {
            Lampa.Activity.backward();
        };
    }

    // --- Функция инициализации плагина ---
    function startPlugin() {
        // Проверка, чтобы плагин не инициализировался дважды
        if (window.plugin_hanime_catalog_ready) return;
        window.plugin_hanime_catalog_ready = true;

        // --- Стили CSS ---
        var style = `
            .hanime-catalog__body.category-full {
                display: flex; /* Используем Flexbox для выравнивания */
                flex-wrap: wrap; /* Разрешаем перенос карточек на новую строку */
                justify-content: center; /* Центрируем карточки по горизонтали */
                padding: 1em 0; /* Добавляем немного отступов */
            }
            .hanime-card {
                width: 185px; /* Ширина карточки */
                margin: 10px; /* Отступы вокруг карточки */
                border-radius: 0.5em; /* Скругление углов */
                overflow: hidden; /* Скрываем все, что выходит за пределы */
                transition: transform 0.2s ease, box-shadow 0.2s ease; /* Плавные переходы */
                position: relative;
                box-sizing: border-box;
                background-color: rgba(255, 255, 255, 0.03); /* Легкий фон */
            }
            .hanime-card.selector:focus { /* Стили при фокусе */
                transform: scale(1.05); /* Немного увеличить */
                box-shadow: 0 0 15px rgba(255, 100, 0, 0.7); /* Оранжевое свечение */
                z-index: 5; /* Поверх других элементов */
                /* Стандартную рамку фокуса Lampa обычно добавляет сама */
                /* border: 3px solid rgba(255, 255, 255, 0.7); */
                outline: none;
            }
            /* Дополнительный стиль для Lampa тем без нативной рамки */
            .hanime-card.selector.focus:not(.native) {
                 border: 2px solid rgba(255, 100, 0, 0.8);
            }

            .hanime-card__view { /* Контейнер для изображения */
                position: relative;
                height: 270px; /* Фиксированная высота */
                background-color: rgba(255,255,255,0.05); /* Фон-заглушка */
                border-radius: 0.5em 0.5em 0 0; /* Скругление только верхних углов */
                overflow: hidden;
            }
             .hanime-card__img { /* Изображение */
                position: absolute;
                width: 100%;
                height: 100%;
                object-fit: cover; /* Масштабировать с обрезкой */
                border-radius: 0.5em 0.5em 0 0;
                /* Плавное появление после загрузки lazyload */
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            .hanime-card__img.lazyloaded { /* Класс добавляется lazyload после загрузки */
                opacity: 1;
            }
             .hanime-card__title { /* Заголовок */
                margin: 0; /* Убираем внешние отступы */
                padding: 0.5em; /* Внутренние отступы */
                font-size: 0.9em; /* Уменьшаем шрифт */
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                text-align: center;
                color: rgba(255, 255, 255, 0.8); /* Слегка приглушенный белый */
                background-color: rgba(0,0,0,0.2); /* Полупрозрачный фон под текстом */
                min-height: 2.4em; /* Минимальная высота в 2 строки */
                line-height: 1.2em;
                display: flex; /* Для выравнивания по центру, если текст короткий */
                align-items: center;
                justify-content: center;
            }
            .hanime-card__description {
                display: none; /* Описание не используется */
            }

            /* Стили для иконки меню */
            .menu__item[data-action="hanime"] .menu__ico svg { /* Уточняем селектор */
                 width: 1.5em;
                 height: 1.5em;
                 fill: #f3a712; /* Оранжевый цвет для иконки */
            }
        `;
        Lampa.Template.add('hanime-style', `<style>${style}</style>`);

        // --- Шаблон HTML для карточки ---
        Lampa.Template.add('hanime-card', `
            <div class="hanime-card card selector layer--visible layer--render" data-id="{id}">
                <div class="hanime-card__view">
                    <img data-src="{img}" src="./img/img_loading.svg" class="hanime-card__img lazyload" alt="{title}" />
                </div>
                <div class="hanime-card__title">{title}</div>
            </div>
        `); // Используем lazyload для изображений

        // --- Регистрация компонента в Lampa ---
        Lampa.Component.add('hanime_catalog', HanimeComponent);

        // --- Функция добавления пункта в меню Lampa ---
        function addMenuItem() {
            var menu_item = $(`
                <li class="menu__item selector" data-action="hanime">
                    <div class="menu__ico">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1.16-11.49l-1.41 1.41L12 12.34l2.57-2.42-1.41-1.41L12 9.51l-1.16-1.07zM12 14.48c-1.93 0-3.5 1.57-3.5 3.5s1.57 3.5 3.5 3.5 3.5-1.57 3.5-3.5-1.57-3.5-3.5-3.5z"/>
                        </svg> </div>
                    <div class="menu__text">Hanime TV</div> </li>
            `);
            // Обработчик нажатия на пункт меню
            menu_item.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '', // URL не используется, но нужен Lampa
                    title: 'Hanime TV', // Заголовок окна
                    component: 'hanime_catalog', // Имя нашего компонента
                    page: 1 // Начальная страница (может использоваться внутри компонента)
                });
            });
            // Добавляем пункт меню в основной список (обычно первый ul)
            $('.menu .menu__list').eq(0).append(menu_item);
        }

        // --- Добавление стилей и пункта меню при готовности Lampa ---
        // Добавляем стили в head документа
        $('head').append(Lampa.Template.get('hanime-style', {}, true));

        // Проверяем, готова ли Lampa
        if (window.appready) {
             addMenuItem(); // Если готова, сразу добавляем пункт меню
        } else {
             // Если Lampa еще не готова, подписываемся на событие 'app'
             var LampaListener = function (e) {
                 if (e.type === 'ready') {
                      addMenuItem(); // Добавляем пункт меню, когда Lampa готова
                      // Отписываемся от события, чтобы не сработать повторно
                      Lampa.Listener.remove('app', LampaListener);
                 }
             };
             Lampa.Listener.follow('app', LampaListener);
        }

        // Добавляем поддержку lazyload для изображений, если она еще не подключена
        if(typeof $.fn.lazyload == 'undefined'){
            Lampa.Utils.putScriptAsync(['./libs/jquery.lazyload.min.js'], function(){} );
        }
    }

    // --- Запускаем инициализацию плагина ---
    startPlugin();

})();
