(function () {
    'use strict';

    // Убираем кастомный HanimeCard и его шаблон, используем стандартный Lampa.Card и его шаблон
    // Убираем кастомные стили


    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        // Используем Lampa.Scroll
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        // Храним экземпляры Lampa.Card
        var items = [];
        // Создаем главный DOM элемент компонента нативным JS
        var html = document.createElement('div');
        html.classList.add('hanime-catalog'); // Оставляем класс-контейнер, если нужно

        // Создаем тело каталога, используем стандартные классы Lampa для макета
        var body = document.createElement('div');
        body.classList.add('hanime-catalog__body', 'category-full');

        var active = 0; // Индекс активного элемента в items
        var lastFocusedElement = null; // Последний сфокусированный DOM элемент (нативный элемент)

        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json";
        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";

        // Адрес вашего прокси сервера
        var PROXY_BASE_URL = "http://77.91.78.5:3000";

        // Флаг, чтобы загрузить каталог только один раз
        this._catalog_loaded = false;


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
                    timeout: 20000 // Увеличим таймаут на всякий случай
                }
            );
        };

        // Метод для добавления одной карточки
        this.appendCard = function(meta) {
            var _this = this;

            // Создаем экземпляр Lampa.Card, маппим данные из meta
            var cardData = {
                id: meta.id,
                title: meta.name || meta.title || 'Без названия',
                poster: meta.poster,
                // Добавляем другие данные, которые могут быть полезны
                year: meta.year,
                runtime: meta.runtime,
                source: 'hanime',
                // url, method - Lampa.Card может их использовать для перехода к FullInfo по умолчанию
                // url: 'hanime_full:' + meta.id, // Пример пользовательского URL, если не хотим стандартный FullInfo
                method: 'movie', // Указываем тип контента (фильм), т.к. hanime обычно фильмы
            };

            // Lampa.Card принимает данные и опции
            var card = new Lampa.Card(cardData, {
                 object: componentObject, // Передаем объект компонента
                 card_category: true, // Это карточки в категории/списке
                 card_wide: false,
                 card_small: false,
                 card_broad: false,
                 card_collection: false,
                 // card_events: {}, // Дополнительные события для карточки
            });

            // Создаем DOM элемент карточки (это метод Lampa.Card)
            card.create();

            // Настраиваем обработчики событий на экземпляре Card
            card.onFocus = function(target, card_data) {
                // target - нативный DOM элемент карточки, который получил фокус
                lastFocusedElement = target; // Сохраняем сфокусированный DOM элемент

                // Находим индекс текущей карточки в массиве items
                const currentActiveIndex = items.indexOf(card);
                 if (currentActiveIndex !== -1) {
                     active = currentActiveIndex; // Обновляем active
                 } else {
                      console.warn("Hanime Plugin: Focused card not found in items array.");
                      active = 0; // Сброс на всякий случай
                 }


                // Обновляем скролл, чтобы текущая карточка была видна
                 scroll.update(card.render(true));

                 // Обновляем фон (опционально)
                 if (card_data.poster) {
                      Lampa.Background.change(Lampa.Utils.cardImgBackground(card_data));
                 } else {
                     Lampa.Background.change('');
                 }

                 // Обновляем классы layer--render
                 _this.limit();
            };

            // onEnter уже обрабатывается Lampa.Card по умолчанию,
            // используя url и method из cardData, если они заданы.
            // Если нужна кастомная логика (как вызов fetchStreamAndMeta), переопределяем onEnter:
            card.onEnter = function(target, card_data) {
                lastFocusedElement = target;
                console.log("Hanime Plugin: Card selected", card_data);
                // При нажатии Enter, запускаем загрузку стрима и метаданных
                _this.fetchStreamAndMeta(card_data.id, card_data); // Передаем card_data как метаданные
            };

            // Добавляем DOM элемент карточки в тело скролла
            body.appendChild(card.render(true)); // Используем appendChild для нативных элементов
            // Добавляем экземпляр карточки в массив items
            items.push(card);

            return card; // Возвращаем экземпляр Card
        };

        // Метод для построения всего каталога
        this.build = function (metas) {
            console.log("Hanime Plugin: Building catalog");
            // Очищаем предыдущие элементы, если они были
            items = [];
            body.innerHTML = ''; // Очищаем содержимое тела

            // Настраиваем скролл
            scroll.minus();

            // === ИСПРАВЛЕНИЕ: Изменяем onWheel для делегирования контроллеру ===
            scroll.onWheel = (step)=>{
                // Если компонент Hanime - текущий активный контроллер
                if(Lampa.Controller.own(this)) {
                     // Делегируем действие нашему контроллеру
                     if(step > 0) this.down(); // Вызываем свой метод down
                     else this.up();   // Вызываем свой метод up
                } else {
                    // Если мы не активны, но колесо прокрутили на нашем элементе,
                    // пытаемся активировать наш компонент.
                    this.start();
                }
            };
            // ===============================================================


            // Добавляем каждую карточку
            metas.forEach(this.appendCard.bind(this));

            // Добавляем тело с карточками в скролл
            scroll.append(body);

            // Добавляем скролл в главный HTML элемент компонента
            html.appendChild(scroll.render(true)); // Используем appendChild

            // Делаем компонент видимым и активируем контроллер.
            // Установка коллекции навигатора и начального фокуса перенесена в start().toggle().
             this.activity.loader(false);
             this.activity.toggle(); // Активирует компонент и вызывает start().toggle()
        };

        // Метод для управления видимостью карточек (layer--render)
        this.limit = function() {
            if (!items || items.length === 0) return;

            // Определяем количество видимых элементов для рендеринга
            let limit_view = 25;

            // Определяем диапазон элементов для рендеринга
            let current_active = active >= 0 && active < items.length ? active : 0;

            let render_start = Math.max(0, current_active - Math.floor(limit_view / 2));
            let render_end = render_start + limit_view;

            items.forEach((item, index) => {
                const element = item.render(true); // Получаем нативный DOM элемент

                // Управляем классом layer--render для оптимизации
                if (element) { // Проверка, что элемент существует
                    if (index >= render_start && index < render_end) {
                        element.classList.add('layer--render');
                    } else {
                        element.classList.remove('layer--render');
                    }
                }
            });

            // Обновляем слои видимости Lampa
             Lampa.Layer.visible(scroll.render(true));
        };


        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

            _this.activity.loader(true);

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

                const fullMetaData = metaDataResponse && metaDataResponse.meta ? metaDataResponse.meta : meta; // Приоритет: полный ответ API, затем метаданные с карточки

                console.log("Hanime Plugin: Stream Data:", streamData);
                console.log("Hanime Plugin: Full Meta Data:", fullMetaData);

                if (streamData && streamData.streams && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams.find(s => s.quality && s.quality.includes('1080')) ||
                                       streamData.streams.find(s => s.quality && s.quality.includes('720')) ||
                                       streamData.streams[0];

                    var finalStreamUrl = streamToPlay.url;

                    try {
                         var url = new URL(finalStreamUrl);
                         // Добавляем больше потенциальных CDN хостов
                         if (url.hostname.includes('highwinds-cdn.com') ||
                             url.hostname.includes('akamaihd.net') ||
                             url.hostname.includes('cdn77.com') ||
                             url.hostname.includes('fastly.net')) // Добавьте другие, если встречаете проблемы
                         {
                             finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                             console.log("Hanime Plugin: Original stream URL proxied:", finalStreamUrl);
                         }
                    } catch (e) {
                        console.error("Hanime Plugin: Failed to parse or proxy stream URL", e);
                    }

                    var playerObject = {
                        title: fullMetaData.name || fullMetaData.title || 'Без названия',
                        url: finalStreamUrl,
                        poster: fullMetaData.poster || fullMetaData.background,
                         id: fullMetaData.id, // Передаем id для истории/прогресса
                         // season: ..., // Если есть информация о сезоне
                         // episode: ..., // Если есть информация об эпизоде
                         // file: finalStreamUrl // file тоже может использоваться плеером
                    };

                    if (playerObject.url) {
                         console.log("Hanime Plugin: Launching player with:", playerObject);
                         Lampa.Player.play(playerObject);
                         Lampa.Player.playlist([playerObject]);

                         // Добавляем в историю
                         if (fullMetaData && fullMetaData.id) {
                                const historyMeta = {
                                    id: fullMetaData.id,
                                    title: fullMetaData.name || fullMetaData.title,
                                    poster: fullMetaData.poster || fullMetaData.background,
                                    runtime: fullMetaData.runtime,
                                    year: fullMetaData.year,
                                    original_name: fullMetaData.original_name,
                                    // Добавьте любые другие поля, которые Lampa сохраняет в истории
                                };
                                Lampa.Favorite.add('history', historyMeta); // Lampa сама управляет лимитом
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
            console.log("Hanime Plugin: Displaying empty state:", msg);
            var empty = new Lampa.Empty({ message: msg });
            // Очищаем html и добавляем Empty (нативно)
            html.innerHTML = '';
            html.appendChild(empty.render(true)); // empty.render(true) возвращает нативный элемент

            this.activity.loader(false);
            // При пустом состоянии, контроллер должен быть привязан к Empty
            empty.start(); // Активируем контроллер Empty
            this.start = empty.start; // Переопределяем start, чтобы он запускал Empty
        };

        this.create = function () {
             console.log("Hanime Plugin: Component created");
            // Логика загрузки перенесена в start()
        };

        // === Добавляем методы up и down для навигации по стрелкам ===
        this.up = function(){
             if (Lampa.Navigator.canmove('up')) {
                  Lampa.Navigator.move('up');
             } else {
                 // Если двигаться вверх некуда в коллекции, переключаемся на шапку/заголовок
                 Lampa.Controller.toggle('head');
             }
        }

        this.down = function(){
             if (Lampa.Navigator.canmove('down')) {
                  Lampa.Navigator.move('down');
                  // Здесь можно добавить логику подгрузки следующей страницы, если бы была пагинация
                  // this.next();
             }
        }
        // ==========================================================


        this.start = function () {
            console.log("Hanime Plugin: Component start");

            // Если каталог еще не загружен, загружаем его в первый раз
            if (items.length === 0 && !this._catalog_loaded) {
                 this._catalog_loaded = true; // Флаг, чтобы загрузить один раз
                 console.log("Hanime Plugin: Loading catalog for the first time.");
                 this.fetchCatalog(); // fetchCatalog вызовет build, а build вызовет activity.toggle(), который затем вызовет start().toggle()
            } else {
                 // Если каталог уже загружен, просто активируем контроллер и восстанавливаем состояние
                 console.log("Hanime Plugin: Catalog already loaded, setting up controller.");

                 // Регистрируем наш контроллер с именем 'content'
                 Lampa.Controller.add('content', {
                     link: this, // Ссылка на экземпляр компонента
                     toggle: function () {
                         console.log("Hanime Plugin: Controller Toggle activated");

                         if (!Lampa.Navigator) {
                             console.error("Hanime Plugin: Lampa.Navigator is undefined during controller toggle.");
                             // Возможно, здесь нужно обработать ошибку или вернуться в безопасное состояние
                             return false; // Не можем настроить навигацию
                         }

                         if (items.length === 0) {
                             console.warn("Hanime Plugin: No items to set collection for.");
                             // Переключаемся на empty state, если он еще не активен
                             if (this.empty && !Lampa.Controller.own(this.empty)) { // Проверка, что empty существует и не активен
                                 this.empty("Каталог пуст.");
                             }
                             return false; // Нечего фокусировать/контролировать
                         }

                         // Получаем нативные DOM элементы всех карточек
                         const itemElements = items.map(item => item.render(true)).filter(el => el !== null);

                         if (itemElements.length === 0) {
                              console.warn("Hanime Plugin: No DOM elements to set collection for.");
                               if (this.empty && !Lampa.Controller.own(this.empty)) {
                                     this.empty("Нет отображаемых элементов.");
                                }
                              return false;
                         }

                         // Устанавливаем коллекцию элементов, по которым будет работать Navigator
                         Lampa.Navigator.setCollection(itemElements);
                         console.log("Hanime Plugin: Navigator collection set with", itemElements.length, "items.");

                         // Определяем элемент для фокусировки: последний сфокусированный или первый
                         const elementToFocus = lastFocusedElement && itemElements.includes(lastFocusedElement)
                                              ? lastFocusedElement
                                              : (itemElements.length > 0 ? itemElements[0] : false);

                         if (elementToFocus) {
                             console.log("Hanime Plugin: Focusing element:", elementToFocus);
                             // Фокусируемся через Controller. collectionFocus сам вызывает Navigator.focus
                             Lampa.Controller.collectionFocus(elementToFocus, scroll.render(true));

                             // Находим соответствующий экземпляр Card и вызываем его onFocus
                             const focusedCard = items.find(item => item.render(true) === elementToFocus);
                             if(focusedCard && focusedCard.onFocus) {
                                 // Убедимся, что active индекс корректен перед вызовом onFocus
                                  const focusedIndex = items.indexOf(focusedCard);
                                  if(focusedIndex !== -1) {
                                      active = focusedIndex;
                                  } else {
                                       active = 0; // Сброс
                                  }
                                  focusedCard.onFocus(elementToFocus, focusedCard.data); // Вызываем onFocus
                             } else {
                                  console.warn("Hanime Plugin: Could not find focused card instance or onFocus method.");
                             }

                         } else {
                             console.warn("Hanime Plugin: No element to focus after setting collection.");
                             // Если сюда дошли, хотя items.length > 0, это странно.
                             // Возможно, коллекция Navigator не совпадает с itemsElements.
                             // Или нужно переключиться в empty state
                         }

                         // Сообщаем Lampa, что наш главный элемент готов и можно управлять видимостью слоев
                         // Layer.update нужен для пересчета позиций элементов
                         Lampa.Layer.update(html);
                         // Layer.visible делает слой видимым. Возможно, уже вызвано activity.toggle
                         // Lampa.Layer.visible(html); // Это может быть лишним, activity.toggle уже делает это

                     }.bind(this), // Привязываем контекст toggle
                     left: function () {
                         if (Lampa.Navigator && Lampa.Navigator.canmove('left')) {
                              Lampa.Navigator.move('left');
                         } else {
                             // Если двигаться некуда, переключаемся на меню
                             Lampa.Controller.toggle('menu');
                         }
                     },
                     right: function () {
                         if (Lampa.Navigator && Lampa.Navigator.canmove('right')) {
                              Lampa.Navigator.move('right');
                         }
                         // else if (this.onRight) this.onRight(); // Если нужна какая-то логика справа
                     },
                     // === Используем наши новые методы up/down ===
                     up: this.up.bind(this),
                     down: this.down.bind(this),
                     // ==========================================
                     back: this.back.bind(this) // Привязываем контекст back
                 });

                 // Этот toggle переключит контроллер на 'content' и вызовет функцию toggle, которую мы только что зарегистрировали
                 Lampa.Controller.toggle('content');
            }
        };

        this.pause = function () {
           console.log("Hanime Plugin: Component paused");
           // lastFocusedElement уже обновлен в onFocus.
           // Не нужно вызывать Lampa.Navigator.focused() здесь.
           // lastFocusedElement = Lampa.Navigator.focused(); // <-- УДАЛЕНО
        };

        this.stop = function () {
           console.log("Hanime Plugin: Component stopped");
           // Останавливаем все процессы (загрузки и т.п.)
           network.clear();
           // Очищаем коллекцию навигатора, чтобы не было ссылок на удаляемые элементы
           if (Lampa.Navigator) { // Проверка на существование Navigator
               Lampa.Navigator.setCollection([]);
           }
        };

        this.render = function (js) {
            // Возвращаем DOM элемент или jQuery объект
            return js ? html : $(html); // Возвращаем нативный элемент или jQuery обертку
        };

        this.destroy = function () {
            console.log("Hanime Plugin: Component destroyed");
            network.clear();
            // Корректное удаление элементов и экземпляров
            if (items) { // Проверка на существование items
                Lampa.Arrays.destroy(items); // Lampa.Arrays.destroy вызывает destroy() на каждом экземпляре Card
            }
            if (scroll) scroll.destroy();
            if (html) html.remove(); // Удаляем главный DOM элемент

            // Обнуляем ссылки
            items = null;
            network = null;
            scroll = null;
            html = null;
            body = null;
            lastFocusedElement = null;
            this._catalog_loaded = false; // Сброс флага загрузки
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

        // Убираем добавление кастомных стилей
        // $('head').append(Lampa.Template.get('hanime-style', {}, true));

        // Регистрируем компонент
        Lampa.Component.add('hanime_catalog', HanimeComponent);

        // Функция добавления пункта в меню
        function addMenuItem() {
            // Создаем пункт меню нативным JS
            var menu_item = document.createElement('li');
            menu_item.classList.add('menu__item', 'selector'); // selector обязателен для навигации

            menu_item.innerHTML = `
                <div class="menu__ico">
                    <!-- Иконка - можно использовать стандартную, например movie.svg -->
                    <svg fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"></path>
                    </svg>
                </div>
                <div class="menu__text">${Lampa.Lang.translate('hanime_catalog_title', 'Hanime Catalog')}</div> <!-- Добавим перевод -->
            `;

            // Обработчик события enter (нативный)
            menu_item.addEventListener('hover:enter', function () {
                 console.log("Hanime Plugin: Menu item selected");
                // Запускаем компонент через Activity
                Lampa.Activity.push({
                    title: Lampa.Lang.translate('hanime_catalog_title', 'Hanime Catalog'), // Перевод заголовка
                    component: 'hanime_catalog', // Имя нашего компонента
                    // source: 'hanime', // Можно добавить источник для идентификации
                });
            });

            // Добавляем пункт в первое (главное) меню, используя нативный JS
            // Проверяем, что меню уже есть в DOM
            var menuList = document.querySelector('.menu .menu__list');
            if (menuList) {
                menuList.appendChild(menu_item);
                console.log("Hanime Plugin: Menu item added.");
            } else {
                console.warn("Hanime Plugin: Menu list not found, cannot add item.");
            }
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
