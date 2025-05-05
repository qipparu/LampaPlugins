(function () {
    'use strict';

    // Компонент карточки остается без изменений, убедитесь что в шаблоне 'hanime-card' есть класс 'selector'
    function HanimeCard(data) {
        var cardTemplate = Lampa.Template.get('hanime-card', {
            id: data.id,
            img: data.poster,
            title: data.name,
        });

        var cardElement = $(cardTemplate);

        // Убедитесь, что класс 'selector' присутствует в вашем шаблоне 'hanime-card'.
        // Если он есть, следующая строка не нужна:
        // cardElement.addClass('selector');

        this.render = function () {
            return cardElement;
        };

        this.destroy = function () {
            cardElement.remove();
        };
    }

    // Ваш основной компонент каталога
    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = [];
        var html = $('<div class="hanime-catalog"></div>'); // Корневой контейнер
        var body = $('<div class="hanime-catalog__body category-full"></div>'); // Скроллируемое содержимое (сетка)
        var active = 0;
        var last; // Ссылка на DOM элемент последнего сфокусированного элемента

        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json";
        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";

        var PROXY_BASE_URL = "http://77.91.78.5:3000";


        // Метод загрузки каталога
        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true);

            network.clear();
            network.native(CATALOG_URL,
                function (data) {
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
                    _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                    console.error("Hanime Plugin: Failed to load catalog", errorStatus, errorText);
                },
                false,
                {
                    dataType: 'json',
                    timeout: 15000
                }
            );
        };

        // Метод построения DOM из данных каталога
        this.build = function (result) {
            var _this = this;
            scroll.minus(); // Предполагается, что это стандартный вызов Scroll

            body.empty(); // Очищаем контейнер перед добавлением новых элементов
            items = []; // Очищаем массив элементов

            result.forEach(function (meta) {
                var card = new HanimeCard(meta);
                var cardElement = card.render(); // Получаем jQuery объект элемента карточки

                // Добавляем обработчики событий на каждую карточку
                cardElement.on('hover:focus', function () {
                    // Событие вызывается Controller, когда элемент получает фокус
                    last = cardElement[0]; // Сохраняем DOM элемент для возможного восстановления фокуса
                    active = items.indexOf(card);
                    // Этот вызов прокручивает скролл, чтобы сфокусированный элемент стал видимым
                    scroll.update(cardElement, true);
                    console.log("Hanime Plugin: Focused on item:", active, "Scroll updated.");
                }).on('hover:enter', function () {
                    // Событие вызывается Controller, когда на элементе нажимают ОК/Enter
                    console.log("Selected Anime:", meta.id, meta.name);
                    _this.fetchStreamAndMeta(meta.id, meta);
                });

                body.append(cardElement); // Добавляем карточку в контейнер скролла
                items.push(card); // Сохраняем объект карточки в массив
            });

            // Добавляем body (контейнер карточек) в Lampa.Scroll
            scroll.append(body);

            // Добавляем скролл (контейнер, который возвращает scroll.render())
            // в основной DOM компонента html. true = пересчитать размеры после добавления содержимого.
            html.empty().append(scroll.render(true));

            _this.activity.loader(false); // Скрываем лоадер
            _this.activity.toggle(); // Показываем компонент (активность)
            
            console.log("Hanime Plugin: Catalog built. Items count:", items.length);

            // Здесь больше НЕ ВЫЗЫВАЕМ scroll.update().
            // Начальная прокрутка будет обработана в методе start после установки Controller
        };

        // Метод для загрузки потока и метаданных (без изменений)
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
             // Важно: если каталог пуст, Controller должен управлять Empty компонентом.
            this.start = empty.start; // Переназначаем start на метод start компонента Empty
            console.log("Hanime Plugin: Catalog empty or error. Showing Empty component.");
        };

        // Метод вызывается, когда активность создается
        this.create = function () {
            console.log("Hanime Plugin: create()");
            this.activity.loader(true);
            this.fetchCatalog(); // Запускаем загрузку
        };

        // Метод вызывается, когда активность становится видимой и фокусируется
        this.start = function () {
            console.log("Hanime Plugin: start()");
            // Убеждаемся, что это наша активность
            if (Lampa.Activity.active().activity !== this.activity) return;

            // Устанавливаем Controller для навигации по содержимому нашей активности
            Lampa.Controller.add('content', {
                toggle: function () {
                    // Указываем Controller, где искать элементы с классом 'selector'
                    Lampa.Controller.collectionSet(scroll.render());
                    // Устанавливаем начальный фокус: на last (если вернулись) или на первый
                    // Этот вызов collectionFocus ДОЛЖЕН ВЫЗВАТЬ СОБЫТИЕ 'hover:focus'
                    // для первого (или последнего) элемента, который получит фокус.
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                    console.log("Hanime Plugin: Controller set and focused.");
                },
                // Стандартные обработчики навигационных кнопок
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function () {
                    if (Navigator.canmove('right')) Navigator.move('right');
                },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function () {
                    if (Navigator.canmove('down')) Navigator.move('down');
                },
                back: this.back
            });
            // Активируем наш Controller
            Lampa.Controller.toggle('content');

            // --- Удален setTimeout блок, вызывающий Lampa.Controller.item() ---
            // Теперь полагаемся на автоматическое срабатывание hover:focus после collectionFocus.
            // Этот обработчик в методе build уже содержит scroll.update(cardElement, true).
        };

        this.pause = function () {
            console.log("Hanime Plugin: pause()");
             // Сохраняем последний сфокусированный элемент перед паузой,
             // чтобы вернуться к нему при последующем start.
             last = Lampa.Controller.item() || last; // Берем текущий фокус или сохраняем старый если текущего нет (на всякий случай)
        };

        this.stop = function () {
             console.log("Hanime Plugin: stop()");
            // Controller будет уничтожен вместе с активностью, но полезно
            // сбросить ссылки и отписаться от событий вручную в destroy.
        };

        // Метод рендеринга компонента
        this.render = function () {
             console.log("Hanime Plugin: render()");
            return html; // Возвращаем корневой DOM элемент
        };

        // Метод уничтожения компонента - освобождаем ресурсы
        this.destroy = function () {
            console.log("Hanime Plugin: destroy()");
            network.clear(); // Отменяем запросы
            Lampa.Arrays.destroy(items); // Уничтожаем объекты карточек
            scroll.destroy(); // Уничтожаем экземпляр скролла
            html.remove(); // Удаляем DOM элемент компонента
            // Обнуляем ссылки
            items = null;
            network = null;
            scroll = null;
            html = null;
            body = null;
            last = null; // Сбрасываем last
            // Также возможно, нужно очистить controller
            if(Lampa.Controller.enabled().name === 'content') {
                 Lampa.Controller.collectionSet([]); // Очищаем коллекцию Controller
                 Lampa.Controller.toggle('app'); // Возвращаем управление Controller.app
            }
             Lampa.Controller.remove('content'); // Удаляем наш контроллер

        };

        // Обработчик кнопки "Назад"
        this.back = function () {
             console.log("Hanime Plugin: back()");
            Lampa.Activity.backward(); // Возвращаемся к предыдущей активности
        };
    }

    // Функция инициализации плагина
    function startPlugin() {
        if (window.plugin_hanime_catalog_ready) {
             console.log("Hanime Plugin: Already running, exiting startPlugin.");
             return;
        }

        window.plugin_hanime_catalog_ready = true;
        console.log("Hanime Plugin: Initializing...");

        // Добавляем ваши стили - оставлены как в первом варианте
        var style = `
            .hanime-catalog__body.category-full {
                justify-content: space-around;
                padding: 20px; /* Добавим отступ, как в предыдущем варианте */
            }
            .hanime-card {
                width: 185px;
                margin: 0 10px 1.5em 10px; /* Добавим отступы */
                border-radius: 0.5em;
                overflow: hidden;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                position: relative;
                box-sizing: border-box;
            }
            .hanime-card.selector:focus {
                transform: scale(1.05);
                box-shadow: 0 0 15px rgba(255, 0, 0, 0.7);
                z-index: 5;
                border: 3px solid rgba(255, 255, 255, 0.5);
            }
             .hanime-card.selector.focus:not(.native) {
                 border-color: transparent;
                 outline: none;
             }
            .hanime-card__view {
                position: relative;
                height: 270px;
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
                display: none;
            }
            .menu__ico svg {
                  width: 1.5em;
                  height: 1.5em;
            }
        `;
        Lampa.Template.add('hanime-style', `<style>${style}</style>`);
        $('head').append(Lampa.Template.get('hanime-style', {}, true));

        // Ваш шаблон карточки - УБЕДИТЕСЬ ЧТО ЗДЕСЬ ЕСТЬ КЛАСС "selector"
        Lampa.Template.add('hanime-card', `
            <div class="hanime-card card selector layer--visible layer--render"> <!-- Здесь должен быть класс 'selector' -->
                <div class="hanime-card__view">
                    <img src="{img}" class="hanime-card__img" alt="{title}" loading="lazy" />
                </div>
                <div class="hanime-card__title">{title}</div>
            </div>
        `);

        // Регистрируем компонент
        Lampa.Component.add('hanime_catalog', HanimeComponent);
        console.log("Hanime Plugin: Component 'hanime_catalog' added.");


        // Функция добавления пункта меню - без изменений, кроме проверки на дублирование
        function addMenuItem() {
             // Проверяем, существует ли уже пункт меню с таким текстом
             if ($('.menu .menu__list .menu__text:contains("Hanime Catalog")').length > 0) {
                 console.log("Hanime Plugin: Menu item already exists, skipping addMenuItem.");
                 return;
             }
             console.log("Hanime Plugin: Adding menu item.");

            var menu_item = $(`
                <li class="menu__item selector"> <!-- Класс selector для пункта меню -->
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
                    component: 'hanime_catalog', // Имя вашего компонента
                    page: 1
                });
            });
            // Добавляем пункт в главное меню Lampa
            $('.menu .menu__list').eq(0).append(menu_item);
            console.log("Hanime Plugin: Menu item added successfully.");
        }

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
        console.log("Hanime Plugin: Initialization complete.");
    }

    // Запускаем плагин
    startPlugin();

})();
