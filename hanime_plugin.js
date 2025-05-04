(function () {

    'use strict';

    // Определяем шаблон стандартной карточки Lampa с использованием placeholders {}
    // Используем классы, стандартные для карточек в вертикальном списке Lampa
    var standardLampaCardTemplate = `
        <div class="card selector layer--render card--loaded">
            <div class="card__view">
                <img src="{img}" class="card__img" alt="{title}" loading="lazy" />
            </div>
            <div class="card__title">{title}</div>
        </div>
    `;

    // Функция для создания объекта карточки (обертка над DOM элементом)
    function HanimeCard(data) {
        // Используем Lampa.Template.get для правильной подстановки данных в шаблон
        var cardElement = $(Lampa.Template.get('standard-lampa-card', {
            img: data.poster || '',
            title: data.name || ''
        }));

        this.render = function () {
            return cardElement;
        };

        this.destroy = function () {
            cardElement.remove();
        };
    }

    // Главный компонент Hanime Catalog
    function HanimeComponent() {
        var network = new Lampa.Reguest();
        // Главный вертикальный скролл
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = []; // Массив всех объектов карточек для управления памятью
        var html = $('<div></div>'); // Корневой DOM элемент компонента
        // Контейнер для карточек внутри скролла
        var body = $('<div class="category-full"></div>');


        var last; // Последний сфокусированный элемент

        // Адреса API
        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URLS = {
            newset: API_BASE_URL + "/catalog/movie/newset.json",
            recent: API_BASE_URL + "/catalog/movie/recent.json",
            mostlikes: API_BASE_URL + "/catalog/movie/mostlikes.json",
            mostviews: API_BASE_URL + "/catalog/movie/mostviews.json",
        };
        // Выбираем один URL для загрузки, так как фильтров нет
        var DEFAULT_CATALOG_URL = CATALOG_URLS.newset;


        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var PROXY_BASE_URL = "http://77.91.78.5:3000"; // Адрес прокси

        // Функция для загрузки каталога аниме
        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true); // Показываем лоадер

            network.clear(); // Отменяем предыдущие запросы

            // Загружаем данные с выбранного URL
            network.native(DEFAULT_CATALOG_URL,
                function (data) {
                    // Успешный ответ от API
                    if (data && data.metas && Array.isArray(data.metas)) {
                        if (data.metas.length > 0) {
                            _this.build(data.metas); // Строим карточки из полученных данных
                        } else {
                            _this.empty("Каталог пуст."); // Нет данных
                        }
                    } else {
                        _this.empty("Неверный формат данных от API или каталог пуст."); // Неверный формат
                        console.error("Hanime Plugin: Invalid data format", data);
                    }
                },
                function (errorStatus, errorText) {
                    // Ошибка при запросе
                    _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                    console.error("Hanime Plugin: Failed to load catalog", errorStatus, errorText);
                },
                false, // Не кешировать запрос
                {
                    dataType: 'json', // Ожидаем JSON
                    timeout: 15000 // Таймаут запроса
                }
            );
        };


        // Функция для построения карточек в вертикальном списке
        this.build = function (result) {
            var _this = this;

            // Очищаем предыдущие карточки и DOM
            items.forEach(function(item) { item.destroy(); });
            items = [];
            body.empty(); // Очищаем DOM контейнер карточек

            result.forEach(function (meta) {
                var card = new HanimeCard(meta);
                var cardElement = card.render();

                // Добавляем обработчики событий hover:focus и hover:enter
                cardElement.on('hover:focus', function () {
                    last = cardElement[0]; // Сохраняем последний сфокусированный элемент
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

            // Проверяем, добавлен ли body в scroll, добавляем один раз при первом построении
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

            // Устанавливаем onEnd для главного вертикального скролла (если нужна пагинация или другое действие в конце)
            // В данном случае пагинация не поддерживается API, поэтому просто сообщаем об этом.
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
             this.fetchCatalog(); // Загружаем каталог
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
                    // Фокусировка на последнем активном элементе или первом
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                // Обработка нажатий стрелок и кнопки Назад
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left'); // Двигаемся влево
                    else Lampa.Controller.toggle('menu'); // Если нельзя, переключаемся на меню
                },
                right: function () {
                    Navigator.move('right'); // Двигаемся вправо
                },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up'); // Двигаемся вверх
                    else Lampa.Controller.toggle('head'); // Если нельзя, переключаемся на хедер Lampa
                },
                down: function () {
                    Navigator.move('down'); // Двигаемся вниз
                },
                back: this.back // Обработка кнопки Назад
            });

            Lampa.Controller.toggle('content'); // Активируем контроллер 'content'
        };

        // Методы жизненного цикла компонента Lampa
        this.pause = function () {};
        this.stop = function () {};

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
            last = null;
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
                    url: '', // URL для истории
                    title: 'Hanime Catalog', // Заголовок активности
                    component: 'hanime_catalog', // Имя компонента для запуска
                    page: 1 // Начальная страница (для совместимости, хотя пагинация не используется)
                });
            });
            // Добавляем пункт меню в первый список меню Lampa
            $('.menu .menu__list').eq(0).append(menu_item);
        }

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
