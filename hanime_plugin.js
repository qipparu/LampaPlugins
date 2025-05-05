(function () {
    'use strict';

    // Используем стандартный шаблон карточки Lampa, если он подходит, или ваш кастомный
    // Ваш кастомный шаблон уже использует стандартные классы, что хорошо.
    // Lampa.Template.get('card', ...) - стандартный шаблон
    // Lampa.Template.add('hanime-card', ...) - ваш шаблон

    function HanimeCard(data) {
        // Используем ваш кастомный шаблон, так как он уже определен и стилизован
        var cardTemplate = Lampa.Template.get('hanime-card', {
            id: data.id,
            img: data.poster,
            title: data.name,
        });

        var cardElement = $(cardTemplate);

        // Класс selector уже должен быть в вашем шаблоне hanime-card
        // cardElement.addClass('selector'); // Убедитесь, что он есть в шаблоне

        this.render = function () {
            return cardElement;
        };

        this.destroy = function () {
            cardElement.remove();
        };
    }

    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        // Инициализация скролла
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = [];
        // Основной контейнер компонента
        var html = $('<div class="hanime-catalog"></div>');
        // Контейнер для карточек внутри скролла, используем стандартный класс category-full
        var body = $('<div class="hanime-catalog__body category-full"></div>');
        var active = 0; // Индекс активного элемента
        var last; // Последний сфокусированный элемент DOM

        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json";
        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";

        // --- Добавлено: Адрес вашего прокси сервера ---
        var PROXY_BASE_URL = "http://77.91.78.5:3000";
        // ---------------------------------------------


        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true); // Показываем индикатор загрузки

            network.clear(); // Очищаем предыдущие запросы
            network.native(CATALOG_URL,
                function (data) {
                    // Проверка формата данных
                    if (data && data.metas && Array.isArray(data.metas)) {
                         if (data.metas.length > 0) {
                            _this.build(data.metas); // Строим каталог
                         } else {
                            _this.empty("Каталог пуст."); // Показываем сообщение о пустом каталоге
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
                false, // Не кэшировать
                {
                    dataType: 'json',
                    timeout: 15000 // Таймаут запроса
                }
            );
        };

        this.build = function (result) {
            var _this = this;
            scroll.minus(); // Возможно, нужно для учета верхних элементов, если они есть

            // Очищаем предыдущие элементы перед добавлением новых
            body.empty();
            items = [];

            result.forEach(function (meta) {
                var card = new HanimeCard(meta);
                var cardElement = card.render();

                cardElement.on('hover:focus', function () {
                    last = cardElement[0]; // Сохраняем DOM элемент для фокуса
                    active = items.indexOf(card); // Сохраняем индекс
                    // Обновляем скролл, чтобы сфокусированный элемент был виден
                    scroll.update(cardElement, true);
                }).on('hover:enter', function () {
                    console.log("Selected Anime:", meta.id, meta.name);
                    _this.fetchStreamAndMeta(meta.id, meta); // Запускаем загрузку потока и метаданных
                });

                body.append(cardElement); // Добавляем карточку в контейнер body
                items.push(card); // Добавляем объект карточки в массив
            });

            // Добавляем body в скролл, если еще не добавлен, или обновляем его содержимое
            // scroll.append(body); // Этот вызов нужен только один раз при создании
            // Вместо append, убедимся, что body является содержимым скролла.
            // Lampa.Scroll обычно работает с одним корневым элементом внутри себя.
            // Ваша текущая структура html -> scroll.render() -> body -> cards
            // предполагает, что body уже внутри scroll.render().
            // Давайте убедимся, что body правильно привязан к скроллу.
            // В стандартных компонентах Lampa, body часто является элементом,
            // который передается в scroll.append() или устанавливается как содержимое скролла.
            // Ваш код добавляет body в scroll.render(), а затем scroll.render() в html.
            // Это может быть источником проблемы.
            // Правильнее: html -> scroll.render() (это контейнер скролла) -> body (это содержимое скролла) -> cards.
            // scroll.append(body) добавляет body как содержимое скролла.

            // Перестроим логику добавления body в скролл
            scroll.append(body); // Добавляем body как скроллируемое содержимое

            // Добавляем контейнер скролла в основной html компонента
            html.empty().append(scroll.render(true)); // Очищаем html и добавляем скролл. true для пересчета.

            _this.activity.loader(false); // Скрываем индикатор загрузки
            _this.activity.toggle(); // Показываем активность

            // --- Потенциальное исправление скролла: Явное обновление после показа ---
            // Даем Lampa время отрисовать элементы и контейнеры
            setTimeout(function() {
                 scroll.update(); // Обновляем скролл без привязки к элементу, чтобы пересчитать размеры
                 if (last) {
                     // Если есть последний сфокусированный элемент (например, при возврате)
                     scroll.update($(last), true); // Прокручиваем к нему
                 } else if (items.length > 0) {
                     // Если элементов много, фокусируемся на первом и прокручиваем к нему
                     var firstCardElement = items[0].render();
                     Lampa.Controller.collectionFocus(firstCardElement[0], scroll.render());
                     scroll.update(firstCardElement, true);
                 }
            }, 50); // Небольшая задержка
            // --------------------------------------------------------------------
        };

        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

            _this.activity.loader(true);

            // Используем Promise.all для параллельной загрузки потока и метаданных
            Promise.all([
                new Promise((resolve, reject) => {
                    network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                }),
                // Если метаданные уже есть (из каталога), используем их, иначе загружаем
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                     network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                 })

            ]).then(([streamData, metaDataResponse]) => {
                _this.activity.loader(false);

                // Извлекаем полные метаданные
                const fullMetaData = metaDataResponse.meta || metaDataResponse;

                console.log("Stream Data:", streamData);
                console.log("Full Meta Data:", fullMetaData);

                // Проверяем наличие потоков
                if (streamData && streamData.streams && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0]; // Берем первый поток

                    // --- Изменено: Использование прокси для URL потока ---
                    var finalStreamUrl = streamToPlay.url;

                    // Проверяем, является ли URL потока тем, который вызывает проблему CORS (на highwinds-cdn.com)
                    // Если да, оборачиваем его прокси
                    try {
                         var url = new URL(finalStreamUrl);
                         if (url.hostname.includes('highwinds-cdn.com')) {
                             // Оборачиваем оригинальный URL потока адресом прокси
                             finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                             console.log("Original stream URL proxied:", finalStreamUrl);
                         }
                    } catch (e) {
                        console.error("Hanime Plugin: Failed to parse or proxy stream URL", e);
                        // Продолжаем использовать оригинальный URL, если не удалось обработать
                    }
                    // -------------------------------------------------------

                    // Подготавливаем объект для плеера Lampa
                    var playerObject = {
                        title: fullMetaData.name || fullMetaData.title || 'Без названия',
                        url: finalStreamUrl, // Используем URL после возможного проксирования
                        poster: fullMetaData.poster || fullMetaData.background,
                        // Дополнительные поля, если нужны плееру Lampa
                        // subtitles: streamToPlay.subtitles // Если API предоставляет субтитры
                    };

                    // Запускаем плеер
                    if (playerObject.url) {
                         console.log("Launching player with:", playerObject);
                         Lampa.Player.play(playerObject);
                         Lampa.Player.playlist([playerObject]); // Добавляем в плейлист (можно и один элемент)

                         // Добавляем в историю просмотра
                         if (fullMetaData) {
                                const historyMeta = {
                                    id: fullMetaData.id,
                                    title: fullMetaData.name || fullMetaData.title,
                                    poster: fullMetaData.poster || fullMetaData.background,
                                    runtime: fullMetaData.runtime, // Если есть в метаданных
                                    year: fullMetaData.year, // Если есть
                                    original_name: fullMetaData.original_name // Если есть
                                };
                                Lampa.Favorite.add('history', historyMeta, 100); // Добавляем в историю (тип 'history', данные, лимит)
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
                Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'));
            });
        };

        // Метод для отображения сообщения об ошибке или пустом каталоге
        this.empty = function (msg) {
            var empty = new Lampa.Empty({ message: msg });
            html.empty().append(empty.render(true)); // Очищаем html и добавляем компонент Empty
            this.activity.loader(false);
            this.activity.toggle();
            this.start = empty.start; // Переназначаем start на метод start компонента Empty
        };

        // Метод создания компонента (вызывается Lampa при активации)
        this.create = function () {
            this.activity.loader(true);
            this.fetchCatalog(); // Запускаем загрузку каталога
        };

        // Метод запуска компонента (вызывается Lampa при фокусе на активности)
        this.start = function () {
            // Проверяем, активна ли текущая активность
            if (Lampa.Activity.active().activity !== this.activity) return;

            // Устанавливаем контроллер для навигации по элементам
            Lampa.Controller.add('content', {
                toggle: function () {
                    // Устанавливаем коллекцию элементов для контроллера (все .selector внутри scroll.render())
                    Lampa.Controller.collectionSet(scroll.render());
                    // Устанавливаем фокус на последний активный элемент или на первый
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: function () {
                    // Перемещение влево
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu'); // Если нельзя двигаться влево, переключаемся на меню
                },
                right: function () {
                    // Перемещение вправо
                    if (Navigator.canmove('right')) Navigator.move('right');
                },
                up: function () {
                    // Перемещение вверх
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head'); // Если нельзя двигаться вверх, переключаемся на шапку
                },
                down: function () {
                    // Перемещение вниз
                    if (Navigator.canmove('down')) Navigator.move('down');
                },
                back: this.back // Обработка кнопки "Назад"
            });
            Lampa.Controller.toggle('content'); // Активируем контроллер 'content'

            // --- Потенциальное исправление скролла: Явное обновление после установки контроллера ---
            // Это может быть альтернативой или дополнением к обновлению в build
             setTimeout(function() {
                 scroll.update(); // Обновляем скролл без привязки к элементу
                 if (last) {
                     scroll.update($(last), true); // Прокручиваем к последнему фокусу
                 } else if (items.length > 0) {
                      // Если нет последнего фокуса, но есть элементы, фокусируемся на первом
                      var firstCardElement = items[0].render();
                      Lampa.Controller.collectionFocus(firstCardElement[0], scroll.render());
                      scroll.update(firstCardElement, true);
                 }
             }, 50); // Небольшая задержка
            // ------------------------------------------------------------------------------------
        };

        this.pause = function () {
            // Метод паузы активности (вызывается Lampa)
        };

        this.stop = function () {
            // Метод остановки активности (вызывается Lampa)
        };

        // Метод рендеринга компонента (возвращает корневой DOM элемент)
        this.render = function () {
            return html;
        };

        // Метод уничтожения компонента (вызывается Lampa при закрытии активности)
        this.destroy = function () {
            console.log("Hanime Plugin: Destroying component");
            network.clear(); // Очищаем запросы
            Lampa.Arrays.destroy(items); // Уничтожаем объекты карточек
            scroll.destroy(); // Уничтожаем скролл
            html.remove(); // Удаляем DOM элемент компонента
            // Обнуляем ссылки для сборщика мусора
            items = null;
            network = null;
            scroll = null;
            html = null;
            body = null;
            last = null;
        };

        // Метод для обработки кнопки "Назад"
        this.back = function () {
            Lampa.Activity.backward(); // Возвращаемся к предыдущей активности
        };
    }

    // Функция запуска плагина
    function startPlugin() {
        // Проверяем, был ли плагин уже запущен
        if (window.plugin_hanime_catalog_ready) return;

        window.plugin_hanime_catalog_ready = true;

        // Добавляем CSS стили
        var style = `
            .hanime-catalog__body.category-full {
                justify-content: space-around; /* Стандартное выравнивание для сетки */
                padding: 20px; /* Добавим немного отступа */
            }
            .hanime-card {
                width: 185px; /* Стандартная ширина карточки постера */
                margin: 0 10px 1.5em 10px; /* Отступы между карточками */
                border-radius: 0.5em;
                overflow: hidden;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                position: relative;
                box-sizing: border-box;
            }
            /* Стиль фокуса - ваш текущий стиль выглядит хорошо и использует стандартный селектор */
            .hanime-card.selector:focus {
                transform: scale(1.05);
                box-shadow: 0 0 15px rgba(255, 0, 0, 0.7); /* Красная тень для примера */
                z-index: 5;
                border: 3px solid rgba(255, 255, 255, 0.5);
            }
             /* Убираем стандартный outline, если он есть */
             .hanime-card.selector.focus:not(.native) {
                 border-color: transparent;
                 outline: none;
             }

            .hanime-card__view {
                position: relative;
                height: 270px; /* Стандартная высота для постера */
                background-color: rgba(255,255,255,0.05);
                border-radius: 0.5em;
                overflow: hidden;
            }
             .hanime-card__img {
                 position: absolute;
                 width: 100%;
                 height: 100%;
                 object-fit: cover;
                 border-radius: 0.5em;
             }
             .hanime-card__title {
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
            /* Если описание не используется, можно его скрыть */
            .hanime-card__description {
                display: none;
            }

            /* Стиль иконки меню */
            .menu__ico svg {
                  width: 1.5em;
                  height: 1.5em;
            }
        `;
        Lampa.Template.add('hanime-style', `<style>${style}</style>`);

        // Добавляем шаблон карточки
        Lampa.Template.add('hanime-card', `
            <div class="hanime-card card selector layer--visible layer--render"> <!-- Добавлен класс selector -->
                <div class="hanime-card__view">
                    <img src="{img}" class="hanime-card__img" alt="{title}" loading="lazy" />
                </div>
                <div class="hanime-card__title">{title}</div>
            </div>
        `);

        // Регистрируем компонент в Lampa
        Lampa.Component.add('hanime_catalog', HanimeComponent);

        // Функция добавления пункта меню
        function addMenuItem() {
            // Проверяем, существует ли уже такой пункт меню, чтобы избежать дублирования
            if ($('.menu .menu__list .menu__text:contains("Hanime Catalog")').length > 0) {
                console.log("Hanime Plugin: Menu item already exists.");
                return;
            }

            var menu_item = $(`
                <li class="menu__item selector"> <!-- Добавлен класс selector -->
                    <div class="menu__ico">
                        <!-- Иконка SVG -->
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">Hanime Catalog</div>
                </li>
            `);
            menu_item.on('hover:enter', function () {
                // При нажатии запускаем новую активность с нашим компонентом
                Lampa.Activity.push({
                    url: '', // URL активности (можно оставить пустым, если не используется для роутинга)
                    title: 'Hanime Catalog', // Заголовок активности
                    component: 'hanime_catalog', // Имя зарегистрированного компонента
                    page: 1 // Номер страницы (если применимо)
                });
            });
            // Добавляем пункт меню в первое меню (обычно главное)
            $('.menu .menu__list').eq(0).append(menu_item);
            console.log("Hanime Plugin: Menu item added.");
        }

        // Добавляем стили в head документа
        $('head').append(Lampa.Template.get('hanime-style', {}, true));

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
         console.log("Hanime Plugin: Started.");
    }

    // Запускаем плагин
    startPlugin();

})();
