(function () {
    'use strict';

    // Флаг для проверки, инициализирован ли плагин
    window.plugin_hanime_catalog_ready = false;
    // Флаг для проверки, были ли добавлены стили и шаблоны
    window.hanime_templates_added = false;

    console.log("Hanime Plugin: Script loaded.");

    // --- ОПРЕДЕЛЕНИЕ ФУНКЦИИ addMenuItem ПЕРЕМЕЩЕНО В САМОЕ НАЧАЛО ---
    // Функция для добавления пункта в главное меню Lampa
    function addMenuItem() {
        // Проверяем, добавлен ли уже пункт меню, чтобы избежать дублирования
        if ($('.menu .menu__item .menu__text:contains("Hanime Catalog")').length > 0) { // [cite: 251]
             console.log("Hanime Plugin: Menu item already exists.");
             return;
        }

        // Создаем HTML для пункта меню
        var menu_item = $(`
            <li class="menu__item selector">
                <div class="menu__ico"> // [cite: 252]
                    <svg fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"></path>
                    </svg>
                </div>
                <div class="menu__text">Hanime Catalog</div> // [cite: 253]
            </li>
        `);

        // Обработчик события при выборе пункта меню [cite: 254]
        menu_item.on('hover:enter', function () {
            console.log("Hanime Plugin: Menu item selected, pushing activity.");
            // Добавляем новую активность в Lampa с нашим компонентом
            Lampa.Activity.push({
                url: '', // URL не используется компонентом каталога напрямую
                title: 'Hanime Catalog', // Заголовок активности [cite: 255]
                component: 'hanime_catalog', // Имя нашего компонента
                page: 1, // Номер страницы (для потенциальной пагинации)
                catalog: 'Newset' // Параметр для компонента, указывающий, какой каталог загрузить по умолчанию
            });
        }); // [cite: 256]

        // Находим список меню и добавляем наш пункт
        $('.menu .menu__list').eq(0).append(menu_item);
        console.log("Hanime Plugin: Menu item added."); // [cite: 257]
    }
    // --------------------------------------------------------------------


    // --- Остальные функции определяются после addMenuItem ---

    function HanimeCard(data) {
        var cardTemplate = Lampa.Template.get('hanime-card', {
            id: data.id,
            img: data.poster,
            title: data.name,
        });
        var cardElement = $(cardTemplate); // [cite: 258]
        cardElement.addClass('selector');
        this.render = function () { return cardElement; };
        this.destroy = function () { cardElement.remove(); };
    } // [cite: 259]

    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        // Настройки скролла: маска, оверскролл, шаг [cite: 260]
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = []; // Массив объектов карточек (HanimeCard) [cite: 261]
        var html = $('<div class="hanime-catalog"></div>'); // Основной контейнер компонента [cite: 262]
        // Заголовок с кнопкой выбора каталога
        var head = $('<div class="hanime-head torrent-filter"><div class="hanime__catalog-select simple-button simple-button--filter selector">Catalog: Newset</div></div>');
        // Контейнер для карточек каталога [cite: 263]
        var body = $('<div class="hanime-catalog__body category-full"></div>');
        var active = 0; // Индекс текущего активного элемента [cite: 264]
        var last; // Ссылка на последний сфокусированный DOM-элемент [cite: 265]


        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        // Определяем URLы для разных каталогов [cite: 266]
        var CATALOG_URLS = {
            'Newset': API_BASE_URL + "/catalog/movie/newset.json",
            'Recent': API_BASE_URL + "/catalog/movie/recent.json",
            'Most Likes': API_BASE_URL + "/catalog/movie/mostlikes.json",
            'Most Views': API_BASE_URL + "/catalog/movie/mostviews.json",
        };
        // URL текущего используемого каталога (по умолчанию Newset) [cite: 267]
        var currentCatalogKey = componentObject.catalog || 'Newset'; // Берем из параметров компонента или дефолт [cite: 268]

        // --- Добавлено: Адрес вашего прокси сервера ---
        // Убедитесь, что этот адрес соответствует PROXY_EXTERNAL_BASE_URL в вашем Node.js прокси
        var PROXY_BASE_URL = "http://77.91.78.5:3000"; // [cite: 269]
        // ---------------------------------------------


        // Метод для загрузки данных каталога с выбранного URL
        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true); // Показываем лоадер [cite: 270]

            var catalogUrl = CATALOG_URLS[currentCatalogKey]; // Получаем URL текущего каталога [cite: 271]

            network.clear(); // Отменяем предыдущие запросы [cite: 272]
            network.native(catalogUrl,
                // Успешный ответ
                function (data) {
                    if (data && data.metas && Array.isArray(data.metas)) {
                          _this.clearItems(); // Всегда очищаем список при загрузке нового каталога [cite: 273]
                         if (data.metas.length > 0) {
                            _this.build(data.metas); // Строим список карточек
                         } else {
                             _this.empty("Каталог пуст."); // Показываем сообщение, если каталог пуст [cite: 274]
                         }
                    } else {
                        _this.empty("Неверный формат данных от API."); // Сообщение об ошибке формата [cite: 275]
                        console.error("Hanime Plugin: Invalid data format", data);
                    }
                },
                // Ошибка запроса
                function (errorStatus, errorText) { // [cite: 276]
                    _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus); // Сообщение об ошибке загрузки [cite: 277]
                    console.error("Hanime Plugin: Failed to load catalog", errorStatus, errorText);
                },
                false, // Не кэшируем ответ API каталога
                { dataType: 'json', timeout: 15000 } // Ожидаем JSON, таймаут 15 сек [cite: 278]
            );
            // Обновляем текст в заголовке компонента
            head.find('.hanime__catalog-select').text('Catalog: ' + currentCatalogKey);
            console.log("Hanime Plugin: Fetching catalog:", catalogUrl);
        };

        // Метод для очистки текущих элементов списка
        this.clearItems = function() {
             console.log("Hanime Plugin: Clearing items."); // [cite: 279]
             // Уничтожаем каждый объект карточки и удаляем его DOM элемент
             items.forEach(function(item) { item.destroy(); });
             items = []; // Очищаем массив ссылок на карточки
             body.empty(); // Удаляем все дочерние элементы из контейнера body
        };

        // Метод для построения списка карточек на основе полученных данных [cite: 280]
        this.build = function (result) {
            var _this = this;
            console.log("Hanime Plugin: Building catalog with", result.length, "items."); // [cite: 281]

            // --- ИЗМЕНЕНО: Аппендим head и body в scroll *до того*, как наполняем body карточками ---
            // Это делается только один раз при первом вызове build
            if (scroll.render().find('.hanime-head').length === 0) {
                 scroll.append(head);
                 console.log("Hanime Plugin: Appended head to scroll."); // [cite: 282]
            }
            if (scroll.render().find('.hanime-catalog__body').length === 0) {
                 scroll.append(body);
                 console.log("Hanime Plugin: Appended body to scroll."); // [cite: 283]
            }
            // Аппендим сам scroll в основной HTML компонента, если он еще не добавлен
            if (html.children().length === 0) {
                html.append(scroll.render(true));
                console.log("Hanime Plugin: Appended scroll to html."); // [cite: 284]
            }
            // ---------------------------------------------------------------------------------------


            // Проходим по каждому элементу метаданных в результате и создаем карточки
            result.forEach(function (meta) {
                var card = new HanimeCard(meta); // Создаем объект карточки
                var cardElement = card.render(); // Получаем DOM элемент карточки (jQuery объект) [cite: 285]

                // Добавляем обработчики событий для навигации и выбора
                cardElement.on('hover:focus', function () {
                    last = cardElement[0]; // Сохраняем ссылку на нативный DOM элемент при фокусе
                    active = items.indexOf(card); // Сохраняем индекс активной карточки [cite: 286]
                    // Вызов scroll.update из обработчика focus УДАЛЕН в предыдущей версии.
                    // Полагаемся на Lampa Controller/Navigator/Scroll для автоматического скролла.
                }).on('hover:enter', function () {
                    // При нажатии Enter [cite: 287]
                    console.log("Selected Anime:", meta.id, meta.name);
                    _this.fetchStreamAndMeta(meta.id, meta); // Загружаем стрим и мету для выбранного аниме [cite: 288]
                });

                // Добавляем DOM элемент карточки в контейнер body (который УЖЕ добавлен в scroll) [cite: 289]
                body.append(cardElement);
                items.push(card); // Добавляем объект карточки в массив items [cite: 290]
            });

            // --- ДОБАВЛЕНО: Задержка перед финальным обновлением скролла и переключением активности ---
            // Это дает браузеру время на рендеринг и расчет размеров добавленных элементов,
            // что может предотвратить ошибку "getBoundingClientRect", которая происходила после аппенда body. [cite: 291]
            setTimeout(function() {
                console.log("Hanime Plugin: Running delayed scroll update and toggle."); // [cite: 292]
                // Основное обновление скролла после добавления ВСЕХ элементов в body.
                // Это обновляет границы скролла и подготавливает его к навигации.
                scroll.update();

                // После обновления скролла и небольшой задержки, скрываем лоадер и показываем компонент [cite: 293]
                _this.activity.loader(false);
                _this.activity.toggle();
                console.log("Hanime Plugin: Catalog built (delayed).");
            }, 50); // Задержка 50 миллисекунд. Можно увеличить, если ошибка повторяется. [cite: 294]
            // ---------------------------------------------------------------------------------------

            // --- УДАЛЕНЫ: Немедленные вызовы после добавления scroll ---
            // _this.activity.loader(false); // Удалено, перемещено в setTimeout [cite: 295]
            // _this.activity.toggle(); // Удалено, перемещено в setTimeout [cite: 296]
            // console.log("Hanime Plugin: Catalog built."); // Удалено, перемещено в setTimeout [cite: 297]
            // ---------------------------------------------------------
        };

        // Метод для добавления функционала выбора каталога к заголовку [cite: 298]
        this.setupCatalogSelect = function() {
             var selectElement = head.find('.hanime__catalog-select');
             var _this = this; // [cite: 299]
             selectElement.on('hover:enter', function() {
                 var catalogOptions = Object.keys(CATALOG_URLS).map(function(key) {
                     return { title: key, selected: key === currentCatalogKey, key: key };
                 });
                 // Показываем диалог выбора каталога Lampa.Select
                 Lampa.Select.show({ // [cite: 300]
                     title: 'Select Catalog',
                     items: catalogOptions,
                     onBack: function() { Lampa.Controller.toggle('content'); }, // При нажатии "назад" в диалоге, возвращаемся к контроллеру контента
                     onSelect: function(item) { // [cite: 301]
                         // При выборе нового каталога
                         if (item.key !== currentCatalogKey) {
                             currentCatalogKey = item.key; // Обновляем ключ каталога [cite: 302]
                             componentObject.catalog = currentCatalogKey; // Сохраняем выбор в параметрах компонента (важно при возврате)
                             componentObject.page = 1; // Сбрасываем страницу на первую (если бы была пагинация) [cite: 303]
                             _this.fetchCatalog(); // Загружаем данные нового каталога [cite: 304]
                         }
                         Lampa.Controller.toggle('content'); // Возвращаемся к контроллеру контента после выбора [cite: 305]
                     }
                 });
                 Lampa.Controller.toggle('select'); // Переключаемся на контроллер диалога выбора [cite: 306]
             });
             console.log("Hanime Plugin: Catalog select setup."); // [cite: 307]
        };

        // Метод для загрузки данных потока и детальных метаданных
        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            // URL для получения информации о потоке и метаданных по ID [cite: 308]
            var streamUrl = API_BASE_URL + "/stream/movie/" + id + ".json";
            var metaUrl = API_BASE_URL + "/meta/movie/" + id + ".json"; // [cite: 309]

            _this.activity.loader(true); // Показываем лоадер [cite: 310]

            // Выполняем запросы стрима и меты параллельно с помощью Promise.all
             Promise.all([
                 new Promise((resolve, reject) => {
                     // Используем network.native для запроса Stream URL
                     network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 }); // [cite: 311]
                 }),
                 // Запрашиваем метаданные только если они не были переданы изначально
                 meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                     // Используем network.native для запроса Meta URL [cite: 312]
                      network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                  })

             ]).then(([streamData, metaDataResponse]) => {
                 // Оба запроса выполнены успешно
                 _this.activity.loader(false); // Скрываем лоадер [cite: 313]

                 // Объединяем метаданные из разных источников (переданные изначально и полученные по metaUrl)
                 // metaDataResponse может быть либо { meta: ... }, либо сами данные меты, либо undefined.
                 const fullMetaData = metaDataResponse && metaDataResponse.meta ? metaDataResponse.meta : (metaDataResponse || meta); // [cite: 314]


                 console.log("Stream Data:", streamData);
                 console.log("Full Meta Data:", fullMetaData);
                 // Проверяем, есть ли данные о потоках в ответе [cite: 315]
                 if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                     var streamToPlay = streamData.streams[0]; // Берем первый поток из списка [cite: 316]

                     // --- Использование прокси для URL потока (логика из предыдущих шагов) ---
                     var finalStreamUrl = streamToPlay.url; // Берем оригинальный URL потока из данных API [cite: 317]

                     // Проверяем, является ли URL потока тем, который вызывает проблему CORS (на highwinds-cdn.com)
                     // Если да, оборачиваем его прокси
                     try {
                         var url = new URL(finalStreamUrl); // [cite: 318]
                         if (url.hostname.includes('highwinds-cdn.com')) { // [cite: 319]
                              // Оборачиваем оригинальный URL потока адресом прокси
                              finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                              console.log("Original stream URL proxied:", finalStreamUrl); // [cite: 320]
                          } else {
                             console.log("Hanime Plugin: Stream URL is not highwinds-cdn.com, not proxying:", finalStreamUrl); // [cite: 321]
                          }
                     } catch (e) {
                         console.error("Hanime Plugin: Failed to parse or proxy stream URL", e); // [cite: 322]
                         // В случае ошибки парсинга URL, продолжаем использовать оригинальный URL как есть
                         finalStreamUrl = streamToPlay.url; // [cite: 323]
                     }
                     // -----------------------------------------------------------------------


                     // Формируем объект для плеера Lampa
                     var playerObject = {
                         title: fullMetaData.name || fullMetaData.title || 'Без названия', // Используем имя/заголовок из меты [cite: 324]
                         url: finalStreamUrl, // Используем URL после возможного проксирования
                         poster: fullMetaData.poster || fullMetaData.background, // Используем постер из меты [cite: 325]
                         // Можете добавить другие параметры, которые поддерживает плеер Lampa (например, субтитры)
                     };
                     // Проверяем, что у нас есть валидный URL для плеера [cite: 326]
                     if (playerObject.url) {
                          console.log("Hanime Plugin: Launching player with:", playerObject);
                          Lampa.Player.play(playerObject); // Запускаем плеер с выбранным потоком [cite: 327]
                          Lampa.Player.playlist([playerObject]); // Опционально: добавляем в плейлист [cite: 328]

                          // Добавляем в историю просмотра Lampa, если есть полные метаданные и ID
                          if (fullMetaData && fullMetaData.id) {
                              const historyMeta = { // [cite: 329]
                                    id: fullMetaData.id,
                                    title: fullMetaData.name || fullMetaData.title || 'Без названия', // [cite: 330]
                                    poster: fullMetaData.poster || fullMetaData.background, // [cite: 331]
                                    // Добавьте другие доступные поля из fullMetaData, если они есть и нужны для истории
                                    // (например, год, описание и т.п., если API их предоставляет и они в том же формате, что в стандартной истории Lampa) [cite: 332]
                                    // year: fullMetaData.year,
                                    // description: fullMetaData.description,
                                }; // [cite: 333]
                                Lampa.Favorite.add('history', historyMeta, 100); // Добавляем в историю, лимит 100 элементов [cite: 334]
                                console.log("Hanime Plugin: Added to history", historyMeta);
                          } else { // [cite: 335]
                              console.warn("Hanime Plugin: Skipping history add, fullMetaData or ID missing.", fullMetaData);
                          } // [cite: 336]

                     } else {
                          // Если в playerObject.url пусто после всех шагов
                          Lampa.Noty.show('Не удалось получить ссылку на поток.');
                          console.error("Hanime Plugin: No valid stream URL found after processing stream data:", streamData); // [cite: 337]
                     } // [cite: 338]

                 } else {
                      // Если данные потока пришли, но список streams пуст, не массив или невалиден
                      Lampa.Noty.show('Потоки не найдены для этого аниме.');
                      console.warn("Hanime Plugin: No streams found or invalid stream data structure:", streamData); // [cite: 339]
                 } // [cite: 340]
             }).catch(error => {
                 // Обработка любых ошибок при запросах stream/meta
                 _this.activity.loader(false); // Скрываем лоадер
                 console.error("Hanime Plugin: Failed to fetch stream/meta details", error);
                 // Формируем сообщение об ошибке для пользователя [cite: 341]
                 var errorMessage = 'Неизвестная ошибка';
                 if (error instanceof Error) { errorMessage = error.message; }
                 else if (typeof error === 'string') { errorMessage = error; }
                 else if (error && typeof error === 'object' && error.statusText) { errorMessage = error.statusText; } // Ошибка из network.native [cite: 342]
                 else if (error && typeof error === 'object' && error.message) { errorMessage = error.message; } // Ошибка из fetch/Promise
                 Lampa.Noty.show('Ошибка загрузки деталей: ' + errorMessage);
             });
        }; // [cite: 343]

        // Метод для отображения сообщения "пусто"
        this.empty = function (msg) {
            console.log("Hanime Plugin: Displaying empty state:", msg);
            var empty = new Lampa.Empty({ message: msg }); // [cite: 344]
            html.empty().append(empty.render(true)); // Очищаем и добавляем сообщение "пусто"
            this.activity.loader(false); // Скрываем лоадер [cite: 345]
            this.activity.toggle(); // Показываем компонент [cite: 346]
            // Назначаем start на метод empty, чтобы при фокусе на сообщении "пусто"
            // можно было вернуться к управлению активностью.
            this.start = empty.start; // [cite: 347]
        };

        // Метод, вызываемый Lampa при создании компонента
        this.create = function () {
            console.log("Hanime Plugin: Creating component.");
            this.activity.loader(true); // Показываем лоадер [cite: 348]
            this.setupCatalogSelect(); // Настраиваем функционал выбора каталога [cite: 349]
            this.fetchCatalog(); // Загружаем данные каталога [cite: 350]
        };

        // Метод, вызываемый Lampa, когда компонент становится активным на экране и готов принимать управление [cite: 351]
        this.start = function () {
            // Проверяем, активен ли именно этот экземпляр компонента
            if (Lampa.Activity.active().activity !== this.activity) return;
            console.log("Hanime Plugin: Starting component."); // [cite: 352]

            // Настраиваем контроллер Lampa для навигации по элементам компонента
            // Контроллер 'content' для навигации по карточкам
            Lampa.Controller.add('content', {
                toggle: function () {
                    // Устанавливаем коллекцию элементов для навигации контроллера.
                    // scroll.render() возвращает элемент, которым управляет scroll (он содержит head и body). [cite: 353]
                    Lampa.Controller.collectionSet(scroll.render());
                    // Устанавливаем начальный фокус. Если last определен (т.е. уже был фокус), фокусируемся на нем.
                    // Иначе, пытаемся сфокусироваться на первой кнопке в заголовке. [cite: 354]
                    var initialFocus = last || scroll.render().find('.simple-button').first()[0];
                    Lampa.Controller.collectionFocus(initialFocus, scroll.render()); // Фокусируемся на элементе
                    console.log("Hanime Plugin: Controller 'content' toggle. Focus on:", initialFocus);
                }, // [cite: 355]
                left: function () {
                    // Обработка стрелки влево. Navigator управляет движением внутри текущей коллекции контроллера. [cite: 356]
                    if (Navigator.canmove('left')) { Navigator.move('left'); } // [cite: 357]
                    // Если движение влево невозможно в текущей коллекции (например, крайний левый элемент),
                    // пытаемся переключиться на контроллер меню (левая боковая панель Lampa).
                    else { Lampa.Controller.toggle('menu'); } // [cite: 358]
                },
                right: function () {
                    // Обработка стрелки вправо.
                    Navigator.move('right'); // [cite: 359]
                    // Здесь нет перехода на другой контроллер справа по умолчанию.
                }, // [cite: 360]
                up: function () {
                    // Обработка стрелки вверх.
                    if (Navigator.canmove('up')) { Navigator.move('up'); } // [cite: 361]
                    // Если движение вверх невозможно (верхний ряд карточек), переключаемся на контроллер заголовка.
                    else { Lampa.Controller.toggle('head'); } // [cite: 362]
                },
                down: function () {
                    // Обработка стрелки вниз.
                    Navigator.move('down'); // [cite: 363]
                },
                back: this.back // Обработка кнопки "назад"
            });

            // Контроллер 'head' для навигации по элементам в заголовке (кнопки) [cite: 364]
             Lampa.Controller.add('head', {
                 toggle: function() {
                      // Коллекция для контроллера заголовка - только элементы в head
                      Lampa.Controller.collectionSet(head);
                      // Фокусируемся на первой кнопке в заголовке [cite: 365]
                      Lampa.Controller.collectionFocus(head.find('.simple-button').first()[0], head);
                      console.log("Hanime Plugin: Head controller toggle. Focus on:", head.find('.simple-button').first()[0]);
                 },
                 left: function() { // [cite: 366]
                      // В заголовке можно двигаться влево между кнопками или перейти в меню Lampa
                      if (Navigator.canmove('left')) Navigator.move('left');
                      else Lampa.Controller.toggle('menu');
                 }, // [cite: 367]
                 right: function() {
                      // В заголовке можно двигаться вправо между кнопками
                      Navigator.move('right');
                 }, // [cite: 368]
                 down: function() {
                      // При нажатии вниз из заголовка, переключаемся на контроллер контента (первый ряд карточек)
                      Lampa.Controller.toggle('content');
                 }, // [cite: 369]
                 back: this.back // Кнопка назад в заголовке
             });

            // При старте компонента, по умолчанию переключаемся на контроллер контента [cite: 370]
            Lampa.Controller.toggle('content');
        }; // [cite: 371]

        // Методы жизненного цикла компонента Lampa
        this.pause = function () { console.log("Hanime Plugin: Paused"); }; // Вызывается, когда компонент становится неактивным (например, открыли плеер) [cite: 372]
        this.stop = function () { console.log("Hanime Plugin: Stopped"); }; // Вызывается, когда компонент удаляется из стека активностей [cite: 373]

        // Метод для получения основного HTML элемента компонента
        this.render = function () {
            // Возвращаем основной HTML элемент компонента
            return html; // Возвращаем jQuery объект [cite: 374]
        };

        // Метод, вызываемый Lampa при уничтожении компонента [cite: 375]
        this.destroy = function () {
             console.log("Hanime Plugin: Destroyed");
             // Очистка ресурсов [cite: 376]
            network.clear(); // Отменяем все активные запросы network.native [cite: 377]
            Lampa.Arrays.destroy(items); // Уничтожаем элементы карточек (вызывая их destroy метод) [cite: 378]
            scroll.destroy(); // Уничтожаем компонент скролла [cite: 379]
            html.remove(); // Удаляем основной HTML элемент из DOM [cite: 380]
            // Удаляем зарегистрированные контроллеры, чтобы избежать конфликтов
             Lampa.Controller.remove('content');
             Lampa.Controller.remove('head'); // [cite: 381]

            // Обнуляем ссылки для сборщика мусора
            items = null;
            network = null; scroll = null; html = null; body = null; head = null; last = null; // [cite: 382]
        };

        // Метод для обработки кнопки "назад" [cite: 383]
        this.back = function () {
             console.log("Hanime Plugin: Going back");
             // Стандартное действие "назад" в Lampa - вернуться к предыдущей активности [cite: 384]
             Lampa.Activity.backward();
             // При возврате из диалога выбора каталога, back обрабатывается внутри Select.show [cite: 385]
        };

        // Метод поиска (заглушка, т.к. API не предоставляет endpoint поиска) [cite: 386]
         // Этот метод может быть вызван Lampa, если плагин зарегистрирует функцию search
         this.search = function(query) {
             console.log("Hanime Plugin: Search initiated with query:", query);
             // Показываем уведомление, что поиск не поддерживается через этот API [cite: 387]
             Lampa.Noty.show('Поиск по API Hanime не поддерживается в этом плагине.');
             // Если бы API поддерживал поиск, здесь был бы вызов network.native к endpoint поиска [cite: 388]
         };
    } // [cite: 389]

    // --- Функция для добавления пользовательских стилей и шаблонов ---
    // Определение перемещено выше HanimeComponent и startPlugin
    function addTemplatesAndStyles() {
         // Проверяем, добавлены ли уже стили и шаблоны с помощью нашего флага
         if (window.hanime_templates_added) {
             console.log("Hanime Plugin: Templates and styles already added (via flag).");
             return; // [cite: 390]
         }

         var style = `
             /* Стили для контейнера каталога, который содержит карточки */
             .hanime-catalog__body.category-full {
                 /* Используем flexbox для расположения карточек. justify-content: space-around; распределяет их с равными промежутками по горизонтали. */ /* [cite: 391] */
                 display: flex;
                 flex-wrap: wrap; /* Разрешаем перенос карточек на следующую строку */ /* [cite: 392] */
                 justify-content: space-around; /* Распределяем карточки по ширине */ /* [cite: 393] */
             }
             /* Стили для заголовка компонента */
             .hanime-head {
                 display: flex; /* Располагаем элементы (кнопки) в строку */ /* [cite: 394] */
                 justify-content: flex-start; /* Выравнивание по левому краю */ /* [cite: 395] */
                 align-items: center; /* Выравнивание по центру по вертикали */ /* [cite: 396] */
                 margin-left: 1.5em; /* Отступ слева */ /* [cite: 397] */
                 margin-bottom: 1em; /* Отступ снизу */ /* [cite: 398] */
             }
             /* Стили для кнопок в заголовке */
             .hanime-head .simple-button {
                 margin-right: 1em; /* Отступ между кнопками */ /* [cite: 399] */
                 /* simple-button--filter добавляет стили кнопки фильтра Lampa */
             }

             /* Стили для отдельной карточки аниме */
             .hanime-card {
                 width: 185px; /* Фиксированная ширина карточки (стандартный размер постера) */ /* [cite: 400] */
                 margin-bottom: 1.5em; /* Отступ снизу между рядами карточек */ /* [cite: 401] */
                 border-radius: 0.5em; /* Скругление углов карточки */ /* [cite: 402] */
                 overflow: hidden; /* Обрезаем контент, выходящий за границы */ /* [cite: 403] */
                 transition: transform 0.2s ease, box-shadow 0.2s ease; /* Плавная анимация при фокусе */ /* [cite: 404] */
                 position: relative; /* Для позиционирования дочерних элементов (например, иконок или текста поверх постера) */ /* [cite: 405] */
                 box-sizing: border-box; /* Включаем padding и border в общую ширину/высоту */ /* [cite: 406] */
             }
             /* Стили карточки при фокусе (когда наведена стрелка пульта) */
             .hanime-card.selector:focus {
                 transform: scale(1.05); /* Увеличение размера карточки при фокусе */ /* [cite: 407] */
                 box-shadow: 0 0 15px rgba(255, 0, 0, 0.7); /* Красная тень вокруг карточки */ /* [cite: 408] */
                 z-index: 5; /* Поднимаем карточку на передний план, чтобы тень не перекрывалась */ /* [cite: 409] */
                 border: 3px solid rgba(255, 255, 255, 0.5); /* Полупрозрачная белая обводка */ /* [cite: 410] */
             }
              /* Стили для нативного фокуса (если Lampa использует нативный фокус вместо эмуляции) */
              .hanime-card.selector.focus:not(.native) {
                  border-color: transparent;
                  outline: none; /* Убираем стандартную обводку фокуса браузера */ /* [cite: 411] */
              }

             /* Контейнер для изображения постера */
             .hanime-card__view {
                 position: relative; /* Для позиционирования img внутри */ /* [cite: 412] */
                 height: 270px; /* Фиксированная высота области изображения (стандартный размер постера 185x270) */ /* [cite: 413] */
                 background-color: rgba(255,255,255,0.05); /* Полупрозрачный фон на случай, если изображение не загрузится */ /* [cite: 414] */
                 border-radius: 0.5em; /* Скругление углов (наследуется от родителя) */ /* [cite: 415] */
                 overflow: hidden; /* Обрезаем изображение по границам view */ /* [cite: 416] */
             }
              /* Стили для изображения постера внутри view */
              .hanime-card__img {
                  position: absolute; /* Абсолютное позиционирование внутри view */ /* [cite: 417] */
                  width: 100%; /* Растягиваем на всю ширину контейнера view */ /* [cite: 418] */
                  height: 100%; /* Растягиваем на всю высоту контейнера view */ /* [cite: 419] */
                  object-fit: cover; /* Масштабируем изображение так, чтобы оно покрыло весь контейнер, сохраняя пропорции (обрезается лишнее) */ /* [cite: 420] */
                  border-radius: 0.5em; /* Скругление углов (наследуется от view) */ /* [cite: 421] */
              }
              /* Стили для заголовка карточки (название аниме) */
              .hanime-card__title {
                  margin-top: 0.5em; /* Отступ сверху от изображения */ /* [cite: 422] */
                  padding: 0 0.5em; /* Внутренние отступы слева и справа */ /* [cite: 423] */
                  font-size: 1em; /* Размер шрифта */ /* [cite: 424] */
                  font-weight: bold; /* Жирный шрифт */ /* [cite: 425] */
                  white-space: nowrap; /* Запрещаем перенос текста на новую строку */ /* [cite: 426] */
                  overflow: hidden; /* Обрезаем текст, если он не помещается */ /* [cite: 427] */
                  text-overflow: ellipsis; /* Добавляем многоточие (...) в конце обрезанного текста */ /* [cite: 428] */
                  text-align: center; /* Выравнивание текста по центру */ /* [cite: 429] */
                  color: #fff; /* Белый цвет текста */ /* [cite: 430] */
              }
              /* Стили для иконки плагина в главном меню Lampa */
             .menu__ico svg {
                   width: 1.5em; /* Ширина иконки */ /* [cite: 431] */
                   height: 1.5em; /* Высота иконки */ /* [cite: 432] */
             }
         `;
         // Добавляем стиль как шаблон в реестр Lampa [cite: 433]
         Lampa.Template.add('hanime-style', `<style>${style}</style>`);
         // --- Добавляем стиль в <head> документа --- [cite: 434]
         // Используем Lampa.Template.get с true, чтобы получить HTML-элемент <style>
         // Аппендим его в head документа. // [cite: 435] Делаем это здесь, чтобы стиль гарантированно
         // был добавлен в DOM после регистрации шаблона.
         $('head').append(Lampa.Template.get('hanime-style', {}, true)); // [cite: 436]
         // ----------------------------------------


         // Добавляем HTML шаблон для отдельной карточки
         // Адаптирован на основе вашей структуры, но использует имена полей из примера ответа API Hanime (`id`, `poster`, `name`).
         var cardTemplate = ` // [cite: 437]
             <div class="hanime-card card selector layer--visible layer--render">
                 <div class="hanime-card__view">
                     <img src="{img}" class="hanime-card__img" alt="{title}" loading="lazy" />
                     </div>
                 <div class="hanime-card__title">{title}</div> // [cite: 438]
             </div>
         `;
         // Добавляем шаблон карточки в реестр Lampa [cite: 439]
         Lampa.Template.add('hanime-card', cardTemplate);
         // Устанавливаем флаг, что шаблоны добавлены [cite: 440]
         window.hanime_templates_added = true;
         console.log("Hanime Plugin: Templates and styles added."); // [cite: 441]
    }


    // --- Основная функция инициализации плагина ---
    // Определяется после addMenuItem и addTemplatesAndStyles
    function startPlugin() {
        // Проверяем, инициализирован ли плагин уже с помощью нашего флага
        if (window.plugin_hanime_catalog_ready) {
            console.log("Hanime Plugin: Already initialized.");
            return; // [cite: 442]
        }

        // Устанавливаем флаг, что инициализация началась
        window.plugin_hanime_catalog_ready = true;
        console.log("Hanime Plugin: Starting initialization."); // [cite: 443]

        // Добавляем стили и шаблоны, и аппендим стиль в head
        addTemplatesAndStyles();
        // Регистрируем наш компонент в Lampa [cite: 444]
        // 'hanime_catalog' - уникальное имя компонента
        // HanimeComponent - функция-конструктор нашего компонента
        Lampa.Component.add('hanime_catalog', HanimeComponent);
        console.log("Hanime Plugin: Component 'hanime_catalog' added."); // [cite: 445]

        // Добавляем пункт меню после полной готовности приложения Lampa
        // Это важно, чтобы DOM структура меню уже существовала.
        if (window.appready) { // [cite: 446]
             console.log("Hanime Plugin: App is ready, adding menu item.");
             addMenuItem(); // Вызываем функцию добавления пункта меню [cite: 447]
        } else {
             console.log("Hanime Plugin: Waiting for app ready event.");
             // Если приложение еще не готово, подписываемся на событие 'ready' [cite: 448]
             Lampa.Listener.follow('app', function (e) {
                 if (e.type === 'ready') {
                      console.log("Hanime Plugin: App ready event received, adding menu item.");
                      addMenuItem(); // Вызываем функцию после получения события [cite: 449]
                 }
             });
        } // [cite: 450]
         console.log("Hanime Plugin: Initialization complete.");
    } // [cite: 451]

    // --- Запускаем инициализацию плагина ---
    // Вызываем startPlugin, если плагин еще не был помечен как готовый.
    if (!window.plugin_hanime_catalog_ready) { // [cite: 452]
        startPlugin();
    } else { // [cite: 453]
         console.log("Hanime Plugin: Skipping startPlugin, already ready.");
    }

})();
