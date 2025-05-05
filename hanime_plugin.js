(function () {
    'use strict';

    // Ваш компонент карточки - остается почти без изменений
    // Использует ваш шаблон 'hanime-card', который должен включать класс 'selector'
    function HanimeCard(data) {
        var cardTemplate = Lampa.Template.get('hanime-card', {
            id: data.id,
            img: data.poster,
            title: data.name,
        });

        var cardElement = $(cardTemplate);

        // cardElement.addClass('selector'); // Этот класс должен быть в шаблоне для Controller
        // Если вы добавили его в шаблоне, эта строка не нужна.
        // Проверьте ваш шаблон 'hanime-card'.

        this.render = function () {
            return cardElement;
        };

        this.destroy = function () {
            cardElement.remove();
        };
    }

    // Ваш основной компонент
    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        // Инициализация скролла - как и было
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = []; // Массив объектов карточек
        var html = $('<div class="hanime-catalog"></div>'); // Основной контейнер компонента
        // Контейнер для карточек, который будет скроллиться
        var body = $('<div class="hanime-catalog__body category-full"></div>');
        var active = 0; // Индекс активного элемента
        var last; // Ссылка на DOM-элемент последней сфокусированной карточки

        // Ваши URL
        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json";
        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";

        // Ваш прокси
        var PROXY_BASE_URL = "http://77.91.78.5:3000";


        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true); // Показываем лоадер

            network.clear();
            network.native(CATALOG_URL,
                function (data) {
                    if (data && data.metas && Array.isArray(data.metas)) {
                         if (data.metas.length > 0) {
                            _this.build(data.metas); // Переходим к построению каталога
                         } else {
                            _this.empty("Каталог пуст."); // Если метаданных нет
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

        // Метод построения UI после загрузки данных
        this.build = function (result) {
            var _this = this;
            scroll.minus(); // Возможно, используется для расчета отступов в Scroll

            // Очищаем предыдущие элементы и массив перед добавлением новых
            body.empty();
            items = [];

            // Создаем и добавляем карточки
            result.forEach(function (meta) {
                var card = new HanimeCard(meta);
                var cardElement = card.render(); // Получаем DOM элемент карточки

                // Добавляем обработчики событий Lampa на DOM элемент
                cardElement.on('hover:focus', function () {
                    // Событие возникает, когда элемент получает фокус от Lampa Controller
                    last = cardElement[0]; // Сохраняем DOM элемент
                    active = items.indexOf(card); // Сохраняем индекс в массиве
                    // Обновляем скролл, прокручивая К этому конкретному сфокусированному элементу.
                    // Этот вызов необходим и достаточен для следования за фокусом.
                    scroll.update(cardElement, true);
                }).on('hover:enter', function () {
                    // Событие возникает при нажатии кнопки "ОК" или "Ввод"
                    console.log("Selected Anime:", meta.id, meta.name);
                    _this.fetchStreamAndMeta(meta.id, meta); // Запускаем загрузку потока и метаданных
                });

                body.append(cardElement); // Добавляем карточку в скроллируемый контейнер
                items.push(card); // Добавляем объект карточки в массив items
            });

            // Добавляем контейнер body как содержимое скролла
            // Если body уже был добавлен (например, при повторном вызове build),
            // этот вызов просто убедится, что scroll связан с этим body.
            scroll.append(body);

            // Добавляем сам контейнер скролла в основной DOM компонента.
            // Передаем true, чтобы scroll пересчитал свои размеры после добавления body с элементами.
            html.empty().append(scroll.render(true));

            _this.activity.loader(false); // Скрываем лоадер
            _this.activity.toggle(); // Показываем активность компонента (делает его видимым)

            // Здесь не требуется setTimeout с вызовом scroll.update().
            // Начальный фокус и связанная с ним прокрутка обрабатывается в методе start
            // после того, как контроллер установлен.
        };

        // Метод для загрузки деталей потока и метаданных (без изменений)
        this.fetchStreamAndMeta = function (id, meta) {
             var _this = this;
             var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
             var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

             _this.activity.loader(true);

             Promise.all([
                 new Promise((resolve, reject) => {
                     network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                 }),
                 meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                      network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                  })
             ]).then(([streamData, metaDataResponse]) => {
                 _this.activity.loader(false);
                 const fullMetaData = metaDataResponse.meta || metaDataResponse;

                 console.log("Stream Data:", streamData);
                 console.log("Full Meta Data:", fullMetaData);

                 if (streamData && streamData.streams && streamData.streams.length > 0) {
                     var streamToPlay = streamData.streams[0];
                     var finalStreamUrl = streamToPlay.url;

                     try {
                          var url = new URL(finalStreamUrl);
                          if (url.hostname.includes('highwinds-cdn.com')) {
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
                                     runtime: fullMetaData.runtime,
                                     year: fullMetaData.year,
                                     original_name: fullMetaData.original_name
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

             }).catch(error => {
                 _this.activity.loader(false);
                 console.error("Hanime Plugin: Failed to fetch stream/meta details", error);
                 Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'));
             });
        };


        this.empty = function (msg) {
            var empty = new Lampa.Empty({ message: msg });
            html.empty().append(empty.render(true));
            this.activity.loader(false);
            this.activity.toggle();
            // При пустом состоянии переназначаем start на компонент Empty
            this.start = empty.start;
        };

        // Метод вызывается, когда активность создается
        this.create = function () {
            this.activity.loader(true);
            this.fetchCatalog(); // Начинаем загрузку данных
        };

        // Метод вызывается, когда активность становится видимой и фокусируется
        this.start = function () {
            // Убеждаемся, что это наша активность текущая активная
            if (Lampa.Activity.active().activity !== this.activity) return;

            // Устанавливаем Lampa Controller для этой активности
            Lampa.Controller.add('content', {
                toggle: function () {
                    // При активации контроллера, указываем ему коллекцию элементов для навигации
                    // Это все элементы с классом 'selector' внутри scroll.render() (контейнера скролла)
                    Lampa.Controller.collectionSet(scroll.render());
                    // Устанавливаем начальный фокус: на last элемент, если есть (при возврате),
                    // или на первый доступный, если last нет.
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu'); // Переключение на меню
                },
                right: function () {
                    if (Navigator.canmove('right')) Navigator.move('right'); // Перемещение вправо
                },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up'); // Перемещение вверх
                    else Lampa.Controller.toggle('head'); // Переключение на шапку (заголовок)
                },
                down: function () {
                    if (Navigator.canmove('down')) Navigator.move('down'); // Перемещение вниз
                },
                back: this.back // Обработка кнопки "Назад"
            });
            // Активируем наш контроллер 'content'
            Lampa.Controller.toggle('content');

            // --- Починка скролла и начального фокуса после запуска контроллера ---
            // Добавим небольшую задержку, чтобы DOM точно обновился после того, как контроллер установил фокус
             setTimeout(function() {
                 // Получаем элемент, на котором Lampa Controller УЖЕ установил фокус.
                 // Lampa.Controller.collectionFocus выше уже должен был установить фокус.
                 var focusedElement = Lampa.Controller.item(); // Получаем текущий DOM элемент в фокусе

                 if (focusedElement) {
                     // Если элемент найден (что должно быть почти всегда), прокручиваем скролл к нему.
                     scroll.update($(focusedElement), true); // Передаем jQuery объект элемента
                     console.log("Hanime Plugin: Initial scroll updated to focused element:", focusedElement);
                 } else {
                     // Этот блок на всякий случай, если focusedElement по какой-то причине null.
                     // Если есть элементы и last был null/false, controllerFocus ДОЛЖЕН был поставить фокус на первый.
                      console.warn("Hanime Plugin: Could not get focused element from Controller.");
                       // Fallback: Пробуем прокрутить к last сохраненному элементу или к первому
                       if(last) {
                            scroll.update($(last), true);
                             console.log("Hanime Plugin: Fallback scroll to last element.");
                       } else if (items.length > 0) {
                             var firstCardElement = items[0].render();
                             // Возможно, здесь потребуется явно установить фокус контроллеру, если он не справился
                             // Lampa.Controller.collectionFocus(firstCardElement[0], scroll.render()); // Можно добавить, если предыдущая строка не помогла
                             scroll.update(firstCardElement, true);
                             console.log("Hanime Plugin: Fallback scroll to first element.");
                       }
                 }
             }, 50); // Короткая задержка (50-100 мс обычно достаточно)
            // --------------------------------------------------------------------
        };

        this.pause = function () {
            // Метод паузы активности (вызывается Lampa при переходе на другую активность)
        };

        this.stop = function () {
            // Метод остановки активности (вызывается Lampa перед уничтожением)
        };

        // Метод рендеринга компонента - возвращает его корневой DOM элемент
        this.render = function () {
            return html;
        };

        // Метод уничтожения компонента - очищаем ресурсы
        this.destroy = function () {
            console.log("Hanime Plugin: Destroying component");
            network.clear(); // Отменяем незавершенные сетевые запросы
            Lampa.Arrays.destroy(items); // Уничтожаем объекты карточек (если у них есть методы destroy)
            scroll.destroy(); // Уничтожаем экземпляр Lampa.Scroll
            html.remove(); // Удаляем основной DOM элемент компонента
            // Обнуляем ссылки для сборщика мусора
            items = null;
            network = null;
            scroll = null;
            html = null;
            body = null;
            last = null;
        };

        // Обработчик кнопки "Назад"
        this.back = function () {
            Lampa.Activity.backward(); // Возвращаемся к предыдущей активности
        };
    }

    // Функция инициализации плагина
    function startPlugin() {
        // Проверяем, не запущен ли плагин уже
        if (window.plugin_hanime_catalog_ready) {
            console.log("Hanime Plugin: Already running.");
            return;
        }

        window.plugin_hanime_catalog_ready = true; // Устанавливаем флаг

        // Ваши CSS стили
        var style = `
            .hanime-catalog__body.category-full {
                justify-content: space-around; /* Распределение элементов */
                padding: 20px; /* Отступы вокруг сетки */
            }
            .hanime-card {
                width: 185px; /* Стандартная ширина для постеров */
                margin: 0 10px 1.5em 10px; /* Отступы между карточками */
                border-radius: 0.5em;
                overflow: hidden;
                transition: transform 0.2s ease, box-shadow 0.2s ease; /* Анимация при фокусе */
                position: relative;
                box-sizing: border-box;
            }
            /* Ваш стиль фокуса - должен применяться благодаря классу 'selector' и Controller */
            .hanime-card.selector:focus {
                transform: scale(1.05); /* Увеличение */
                box-shadow: 0 0 15px rgba(255, 0, 0, 0.7); /* Тень */
                z-index: 5; /* Убедимся, что карточка поверх других */
                border: 3px solid rgba(255, 255, 255, 0.5); /* Граница */
            }
             /* Скрытие стандартного outline */
             .hanime-card.selector.focus:not(.native) {
                 border-color: transparent;
                 outline: none;
             }

            /* Стили для содержимого карточки - как в вашем первом коде */
            .hanime-card__view {
                position: relative;
                height: 270px; /* Высота области с картинкой */
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
            .hanime-card__description {
                display: none; /* Если описание не используется */
            }

            /* Стиль для иконки в меню - как в вашем первом коде */
            .menu__ico svg {
                  width: 1.5em;
                  height: 1.5em;
            }
        `;
        // Добавляем стили в <head>
        Lampa.Template.add('hanime-style', `<style>${style}</style>`);
        $('head').append(Lampa.Template.get('hanime-style', {}, true)); // Используем add напрямую с шаблоном

        // Ваш шаблон карточки с классом 'selector'
        Lampa.Template.add('hanime-card', `
            <div class="hanime-card card selector layer--visible layer--render"> <!-- Класс 'selector' здесь -->
                <div class="hanime-card__view">
                    <img src="{img}" class="hanime-card__img" alt="{title}" loading="lazy" />
                </div>
                <div class="hanime-card__title">{title}</div>
            </div>
        `);

        // Регистрируем ваш компонент в Lampa
        Lampa.Component.add('hanime_catalog', HanimeComponent);

        // Функция для добавления пункта меню
        function addMenuItem() {
            // Проверка, чтобы избежать дублирования
            if ($('.menu .menu__list .menu__text:contains("Hanime Catalog")').length > 0) {
                 console.log("Hanime Plugin: Menu item already exists.");
                 return;
             }

            var menu_item = $(`
                <li class="menu__item selector"> <!-- Класс 'selector' на пункте меню тоже -->
                    <div class="menu__ico">
                        <!-- Ваша иконка -->
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">Hanime Catalog</div>
                </li>
            `);
            // Обработчик клика/ввода на пункте меню
            menu_item.on('hover:enter', function () {
                // Запускаем нашу активность с Hanime Catalog
                Lampa.Activity.push({
                    url: '',
                    title: 'Hanime Catalog',
                    component: 'hanime_catalog', // Используем имя нашего компонента
                    page: 1 // Номер страницы
                });
            });
            // Добавляем пункт в главное меню (обычно это первое .menu__list)
            $('.menu .menu__list').eq(0).append(menu_item);
            console.log("Hanime Plugin: Menu item added.");
        }


        // Ждем, пока приложение Lampa полностью загрузится ('appready')
        // Это важно, чтобы DOM Lampa был готов, и мы могли добавить наш пункт меню
        if (window.appready) {
             addMenuItem();
        } else {
             // Если Lampa еще не готова, подписываемся на событие готовности
             Lampa.Listener.follow('app', function (e) {
                 if (e.type === 'ready') {
                     addMenuItem();
                 }
             });
        }
        console.log("Hanime Plugin: Started.");
    }

    // Запускаем функцию инициализации плагина
    startPlugin();

})();
