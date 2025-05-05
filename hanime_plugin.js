(function () {
    'use strict';

    // --- HanimeCard компонента ---
    // Этот компонент создает DOM-элемент карточки, используя ТОЛЬКО стандартные классы Lampa.
    function HanimeCard(data, componentRef) {
        // Обрабатываем данные из вашего API для соответствия стандартным полям Lampa-подобных карточек.
        var processedData = {
            id: data.id,
            // Заголовок
            title: data.name || data.title || 'Без названия',
            // Путь к картинке постера
            poster_path: data.poster || data.img, // Убедитесь, что здесь корректный URL
            // Рейтинг (преобразуем, если нужно)
            vote_average: data.vote_average || data.vote || null,
            // Качество видео (строка, например "4K", "webdl")
            quality: data.quality || data.release_quality || null,
            // Год релиза
            release_year: ((data.year || data.release_date || '') + '').slice(0, 4),
            // Тип контента (movie или tv) - важно для некоторых стилей и логики Lampa
            type: data.first_air_date ? 'tv' : 'movie', // Если есть признак сериала (например, 'first_air_date')
            // Оригинальное название (может пригодиться)
            original_name: data.original_name // Для истории или других нужд
        };

        // Получаем HTML-код карточки из нашего шаблона 'hanime-card'.
        // Важно: этот шаблон должен быть определен РАНЕЕ в коде, и он должен использовать ТОЛЬКО
        // стандартные классы Lampa (card, selector, card__view, card__title и т.д.)
        var cardTemplate = Lampa.Template.get('hanime-card', {
            // Передаем обработанные данные в плейсхолдеры шаблона.
            img: processedData.poster_path, // Будет использовано внутри onVisible для установки src
            title: processedData.title,
            // Данные для стандартных блоков (рейтинг, качество, год, тип), которые будут вставлены через шаблоны-заглушки
            vote: processedData.vote_average > 0 ? parseFloat(processedData.vote_average).toFixed(1) : '', // Форматируем рейтинг
            quality: processedData.quality,
            year: processedData.release_year !== '0000' ? processedData.release_year : '', // Передаем год, если не "0000"
            type: processedData.type // Передаем тип
        });

        var cardElement = $(cardTemplate); // Создаем jQuery объект из HTML-строки шаблона.


        // --- Методы экземпляра HanimeCard ---

        // Метод для добавления иконки (закладки, история и т.д.). Использует стандартные классы иконок Lampa.
        this.addicon = function(name) {
             // Находим стандартный контейнер для иконок внутри карточки
            var iconsContainer = cardElement.find('.card__icons-inner');
            if (iconsContainer.length) {
                var icon = document.createElement('div');
                icon.classList.add('card__icon'); // Базовый класс иконки Lampa
                icon.classList.add('icon--'+name); // Специфичный класс для стилизации типа иконки (стили для них в главном CSS Lampa)
                iconsContainer.append(icon);
            } else {
                console.warn("HanimeCard: Could not find .card__icons-inner to add icon:", name);
            }
        }

        // Метод обновления иконок закладок и маркера состояния (смотрел/смотрю и т.п.).
        // Использует стандартные Lampa классы для маркеров.
        this.updateFavoriteIcons = function() {
             //console.log("HanimeCard: updateFavoriteIcons() for", processedData.title);
             // Очищаем все предыдущие иконки и маркеры.
            cardElement.find('.card__icons-inner').empty(); // Очищаем контейнер иконок
            cardElement.find('.card__marker').remove(); // Удаляем старый маркер

            // Получаем статус закладок элемента с помощью Lampa.Favorite
             var status = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(processedData) : {};
             if(Object.keys(status).length === 0) console.warn("HanimeCard: Failed to get favorite status for", processedData.title, "Lampa.Favorite may not be fully available.");


            // Добавляем стандартные иконки на основе статуса закладки.
            if (status.book) this.addicon('book');     // Запланировано
            if (status.like) this.addicon('like');     // Нравится
            if (status.wath) this.addicon('wath');     // Просматриваю (watching)
             // Проверяем статус просмотра (из истории/таймлайна Lampa).
            if (status.history || (window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched === 'function' && Lampa.Timeline.watched(processedData))) this.addicon('history'); // Из истории или Просмотрено полностью

            // Логика отображения текстового маркера состояния над постером (Смотрю, Просмотрено, Запланировано и т.п.).
             var marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown']; // Стандартные типы маркеров Lampa
             var activeMarker = marks.find(m => status[m]); // Ищем первый активный маркер

             if (activeMarker) {
                 // Если нашли активный маркер, добавляем его DOM-элемент со стандартным классом .card__marker.
                 var markerElement = cardElement.find('.card__marker');
                 if (!markerElement.length) { // Если элемента еще нет, создаем его
                     markerElement = $('<div class="card__marker"><span></span></div>');
                      // Добавляем элемент маркера в область просмотра (.card__view), т.к. он отображается над постером.
                     cardElement.find('.card__view').append(markerElement);
                 }
                 // Устанавливаем текст маркера, используя переводчик Lampa (Lampa.Lang).
                 // Проверяем, что Lampa.Lang доступен и метод translate есть.
                 markerElement.find('span').text(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? Lampa.Lang.translate('title_' + activeMarker) : activeMarker);
                 // Добавляем класс, специфичный для типа маркера (card__marker--look, card__marker--viewed и т.д.).
                 // Эти классы стилизуются в основном CSS Lampa.
                 markerElement.removeClass(marks.map(m => 'card__marker--' + m).join(' ')) // Удаляем все предыдущие классы маркеров типов
                             .addClass('card__marker--' + activeMarker); // Добавляем класс активного типа
             } else {
                 // Если для элемента нет активного маркера, убеждаемся, что его DOM-элемент удален.
                 cardElement.find('.card__marker').remove();
             }
        };

        // Метод вызывается Lampa (например, Scroll компонентом), когда DOM-элемент этой карточки становится видимым на экране.
        // Используется для отложенной загрузки изображений.
        this.onVisible = function() {
             //console.log("HanimeCard: onVisible() for", processedData.title);
             var imgElement = cardElement.find('.card__img'); // Находим стандартный DOM-элемент картинки.

             // Проверяем, нужно ли загружать картинку (если src пустой, или содержит placeholder).
             if (imgElement.length && (!imgElement.attr('src') || imgElement.attr('src').includes('img_load.svg'))) {
                 var src = processedData.poster_path; // Получаем URL картинки из данных.

                 // Используем стандартную Lampa логику загрузки картинок с кэшированием (Lampa.ImageCache).
                 // Это стандартный и рекомендованный способ для оптимизации производительности и памяти.
                 if(window.Lampa && Lampa.ImageCache && typeof Lampa.ImageCache.read === 'function' && typeof Lampa.ImageCache.write === 'function') {
                      // Пробуем прочитать картинку из кэша. ImageCache.read вернет true и установит src, если найдена в кэше.
                      if(!Lampa.ImageCache.read(imgElement[0], src)) { // Передаем нативный DOM-элемент img.
                         // Если картинка не найдена в кэше, устанавливаем обработчики событий загрузки/ошибки.
                          imgElement[0].onload = () => {
                              cardElement.addClass('card--loaded'); // Добавляем стандартный класс 'card--loaded' для стилей (например, плавного появления картинки).
                              Lampa.ImageCache.write(imgElement[0], imgElement[0].src); // Записываем картинку в кэш после успешной загрузки.
                              //console.log("HanimeCard: Image loaded and cached:", src);
                          };
                          imgElement[0].onerror = () => {
                               console.error('Hanime Plugin: Image load error:', src);
                               imgElement.attr('src', './img/img_broken.svg'); // При ошибке загрузки устанавливаем заглушку.
                               // Если Lampa.Tmdb доступен, можно уведомить его об ошибке картинки (хотя это больше для отладки TMDB источников).
                               if(window.Lampa && Lampa.Tmdb && typeof Lampa.Tmdb.broken === 'function') Lampa.Tmdb.broken();
                          };
                          // Устанавливаем src картинки. Браузер начнет загрузку.
                          imgElement.attr('src', src || './img/img_broken.svg'); // Используем Fallback src сразу, если основной пустой.
                      } else {
                         // Если картинка успешно загружена из кэша (Lampa.ImageCache.read вернула true),
                         // нужно вручную добавить класс 'card--loaded', т.к. onload не сработает.
                         cardElement.addClass('card--loaded');
                         //console.log("HanimeCard: Image loaded from cache:", src);
                      }
                 } else {
                     // Fallback, если Lampa.ImageCache недоступен. Простая загрузка картинки.
                     console.warn("Hanime Plugin: Lampa.ImageCache not available. Using basic image loading.");
                      imgElement[0].onload = () => { cardElement.addClass('card--loaded'); console.log("HanimeCard: Image loaded (basic):", src); };
                     imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error (basic):', src); imgElement.attr('src', './img/img_broken.svg'); };
                     imgElement.attr('src', src || './img/img_broken.svg'); // Устанавливаем src
                 }
             } else {
                 //console.log("HanimeCard: Image already loaded or placeholder set for", processedData.title);
             }


            // Обновляем иконки закладок и маркер статуса при появлении в видимости.
            // Это гарантирует, что актуальный статус будет показан.
            this.updateFavoriteIcons();
        }

        // Метод для первоначальной настройки экземпляра HanimeCard после создания ее DOM-элемента.
        // Навешиваем стандартные обработчики событий Lampa (hover:*).
        // Этот метод вызывается при первом рендере карточки.
        this.create = function(){
             //console.log("HanimeCard: create() for", processedData.title);

             // Проверяем, был ли create вызван ранее (для предотвращения дублирования).
             // Используем data-атрибут для этого.
             if (cardElement.data('created')) {
                 //console.log("HanimeCard: create() already called for", processedData.title);
                 return;
             }


             // Привязываем стандартные события Lampa hover:* к корневому DOM-элементу карточки (jQuery-объекту).
             // Эти события генерируются Lampa.Controller при навигации с пульта.
             // Все эти события делегируют обработку методам родительского компонента (componentRef).
            cardElement.on('hover:focus', function () {
                 //console.log("HanimeCard: hover:focus on", processedData.title);
                 // Когда карточка получает фокус от Controller, сообщаем родительскому компоненту, чтобы он прокрутил Scroll к ней.
                 if (componentRef && componentRef.updateScrollToFocus && typeof componentRef.updateScrollToFocus === 'function') {
                      componentRef.updateScrollToFocus(cardElement); // Передаем jQuery-объект карточки
                 }
                 // Обновляем состояние карточки (иконки, маркер) при получении фокуса.
                 this.update();
            }.bind(this)); // Важно привязать контекст (this = экземпляр HanimeCard)

             cardElement.on('hover:enter', function () {
                //console.log("HanimeCard: hover:enter on", processedData.title);
                 // Когда на карточке нажимают ОК/Enter, обрабатываем выбор/клик.
                 // Делегируем эту задачу родительскому HanimeComponent.
                 if (componentRef && componentRef.onCardClick && typeof componentRef.onCardClick === 'function') {
                     componentRef.onCardClick(processedData); // Передаем данные карточки.
                 }
            }.bind(this));

            cardElement.on('hover:long', function(){
                 //console.log("HanimeCard: hover:long on", processedData.title);
                 // Когда на карточке нажимают долго (для контекстного меню).
                 // Делегируем эту задачу родительскому HanimeComponent.
                 if (componentRef && componentRef.showCardContextMenu && typeof componentRef.showCardContextMenu === 'function') {
                      componentRef.showCardContextMenu(cardElement, processedData); // Передаем DOM и данные.
                 }
             }.bind(this));


            // Привязываем стандартное Lampa событие 'visible'.
            // Это событие генерируется Lampa, когда DOM-элемент становится видимым в прокручиваемой области.
             this.card = cardElement[0]; // Получаем нативный DOM-элемент. Нужен для addEventListener.
             if (this.card && typeof this.card.addEventListener === 'function') {
                this.card.addEventListener('visible', this.onVisible.bind(this)); // Привязываем метод onVisible.
                //console.log("HanimeCard: Attached 'visible' event listener.");
             } else {
                 console.warn("HanimeCard: Cannot attach 'visible' event listener, native element or addEventListener not available.");
             }


            // Вызываем первоначальное обновление (иконки, маркеры, возможно прогресс-бар),
            // чтобы они отобразились при создании карточки. Делаем с небольшой задержкой,
            // чтобы DOM элемент был добавлен на страницу к этому моменту.
             setTimeout(() => {
                  this.update();
             }, 0); // Задержка 0 мс означает "выполнить как можно скорее после завершения текущего стека JS".

             // Отмечаем, что create был вызван для этого jQuery-объекта.
             cardElement.data('created', true);
             //console.log("HanimeCard: create() finished.");
        }

        // Метод обновления состояния карточки. Может вызываться вручную или при событиях (например, hover:focus).
        this.update = function(){
             //console.log("HanimeCard: update() called for", processedData.title);
             // Обновляем иконки закладок и маркер состояния.
            this.updateFavoriteIcons();
            // Логика обновления прогресс-бара просмотра (используя Lampa.Timeline.watched_status),
            // если у вас включен прогресс-бар в плагине и доступен Timeline компонент.
             // if(window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched_status === 'function') Lampa.Timeline.watched_status(cardElement, processedData);
        }

        // Метод рендеринга. Возвращает DOM-элемент карточки для вставки в дерево документа.
        // Этот метод вызывается HanimeComponent.build().
        this.render = function(js){
             //console.log("HanimeCard: render() called.");
             // Вызываем метод create() только в первый раз, когда вызывается render().
             if (!cardElement.data('created')) {
                 this.create();
             }
            return js ? cardElement[0] : cardElement; // Возвращаем нативный DOM-элемент или jQuery-объект в зависимости от аргумента js.
        }

        // Метод уничтожения экземпляра HanimeCard. Вызывается из HanimeComponent.destroy().
        this.destroy = function(){
             //console.log("HanimeCard: destroy() for", processedData.title);
             // Удаляем привязку события 'visible'.
             if(this.card && typeof this.card.removeEventListener === 'function' && this.onVisible) this.card.removeEventListener('visible', this.onVisible.bind(this));
             // Удаляем сам DOM-элемент карточки из документа.
             if(cardElement) cardElement.remove();
             // Обнуляем ссылки на объекты для сборщика мусора.
             processedData = null; cardElement = null; this.card = null; componentRef = null;
             //console.log("HanimeCard: destroy() completed.");
        }

        // HanimeCard не должна вызывать create() самостоятельно сразу при создании.
        // Create() вызывается в методе render(), который вызывает компонент-владелец (HanimeComponent).
        // Удален прямой вызов create() здесь.
    }


    // --- HanimeComponent (основной компонент, отображает одну горизонтальную линию аниме) ---
    function HanimeComponent(componentObject) {
        var network = null; // Объект Lampa.Reguest для сетевых запросов
        var scroll = null; // Объект Lampa.Scroll для управления прокруткой

        var items = []; // Массив JS-объектов HanimeCard
        var html = null; // Корневой DOM-контейнер компонента (items-line)
        var itemsContainer = null; // DOM-контейнер для самих карточек внутри Scroll

        var active = 0; // Индекс текущего активного элемента в массиве items
        var last = null; // Ссылка на DOM-элемент последней сфокусированной карточки

        // URL-ы вашего API. Используйте свои реальные URL здесь.
        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        // Пример URL для получения списка последних добавлений (одна горизонтальная линия).
        var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json"; // ИЛИ URL вашей реальной категории
        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json"; // URL для получения потока
        var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";     // URL для получения подробных метаданных
        // Адрес вашего прокси для обхода CORS, если необходимо.
        var PROXY_BASE_URL = "http://77.91.78.5:3000";


        // Метод для построения основной структуры DOM компонента (одна линия items-line).
        // Использует стандартные классы Lampa для лейаута. Вызывается в create().
        this.buildLayout = function() {
             //console.log("HanimeComponent: buildLayout()");
             // Создаем корневой DOM-элемент компонента, имитирующий структуру items-line Lampa.
            html = $(`
                <div class="items-line layer--visible layer--render items-line--type-cards"> <!-- Стандартные классы контейнера линии -->
                    <div class="items-line__head"> <!-- Заголовок линии -->
                        <div class="items-line__title">Последние добавленные</div> <!-- Заголовок категории -->
                         <!-- Можно добавить кнопку "Еще" со стандартными классами Lampa items-line__more selector -->
                         <!-- <div class="items-line__more selector">Еще</div> -->
                    </div>
                    <div class="items-line__body"> <!-- Контейнер для содержимого линии (здесь будет скролл) -->
                        <!-- Lampa.Scroll.render() будет вставлен сюда при build -->
                    </div>
                </div>
            `);

            // Создаем контейнер, в который будем добавлять DOM-элементы карточек.
            // Scroll компонент Lampa автоматически обернет этот контейнер в свою структуру (.scroll__content > .scroll__body).
             itemsContainer = $('<div class="items-cards"></div>'); // Класс items-cards стандартный для контейнера карточек в линиях/категориях.
             //console.log("HanimeComponent: buildLayout completed. Initial DOM structure ready.");
        };

        // Метод для загрузки данных каталога из API.
        // Вызывается в create().
        this.fetchCatalog = function () {
            var _this = this; // Сохраняем ссылку на компонент для использования внутри коллбэков.
             // Показываем индикатор загрузки Lampa активности. Проверяем наличие activity и loader.
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeComponent: Activity loader not available in fetchCatalog.");

             //console.log("HanimeComponent: fetchCatalog() - Starting request to", CATALOG_URL);

             // Инициализируем Lampa.Reguest компонент, если еще не создан.
             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  //console.log("HanimeComponent: Lampa.Reguest initialized.");
             }

             // Если network компонент доступен, отменяем все предыдущие запросы.
             if (network && typeof network.clear === 'function') network.clear();
             else console.warn("HanimeComponent: Network clear method not available.");


             // Выполняем сетевой запрос к API.
             if(network && CATALOG_URL){ // Проверяем, что network компонент и URL доступны.
                network.native(CATALOG_URL,
                    function (data) { // Коллбэк успешного получения данных.
                         //console.log("HanimeComponent: Catalog data received:", data);
                        if (data && data.metas && Array.isArray(data.metas)) { // Проверяем формат ответа (ожидаем { metas: [...] })
                             if (data.metas.length > 0) {
                                _this.build(data.metas); // Если есть элементы в metas, переходим к построению UI.
                             } else {
                                _this.empty("Каталог пуст."); // Если metas пустой массив.
                             }
                        } else {
                            _this.empty("Неверный формат данных от API."); // Если ответ не в ожидаемом формате.
                            console.error("HanimeComponent: Invalid data format from API.", data);
                        }
                    },
                    function (errorStatus, errorText) { // Коллбэк ошибки запроса.
                        _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus); // Показываем сообщение об ошибке.
                        console.error("HanimeComponent: Failed to load catalog.", errorStatus, errorText);
                    },
                    false, // Не кэшировать ответ от API по этому URL (Lampa по умолчанию кэширует).
                    { dataType: 'json', timeout: 15000 } // Указываем тип данных (JSON) и таймаут (15 секунд).
                );
             } else {
                 // Если Network компонент или URL недоступны, сообщаем об ошибке.
                 console.error("HanimeComponent: Cannot fetch catalog. Network component or CATALOG_URL missing.");
                  _this.empty("Не удалось загрузить каталог. Ошибка инициализации сети.");
             }
        };

        // Метод для построения UI из полученного списка элементов (metadata).
        // Вызывается из fetchCatalog() после успешной загрузки.
        this.build = function (result) {
            var _this = this;
             console.log("HanimeComponent: build() - Building UI with", result.length, "items.");

            // Инициализируем Lampa.Scroll компонент (горизонтальный), если еще не создан.
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                  // step: 250 - величина прокрутки при стрелках вверх/вниз на строке (шаг перехода между строками)
                  // direction: 'horizontal' - указываем, что это горизонтальный скролл.
                  scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
                  //console.log("HanimeComponent: Lampa.Scroll initialized (horizontal).");
             }


             // Если Scroll инициализирован, прокручиваем его в начало (актуально при многостраничных категориях).
             if(scroll && typeof scroll.minus === 'function') scroll.minus();
             else console.warn("HanimeComponent: Scroll or scroll.minus method not available in build().");

             // Убеждаемся, что itemsContainer и Scroll доступны для работы с DOM.
             if (!(itemsContainer && scroll && html && window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function')) {
                  console.error("HanimeComponent: Missing critical dependencies (itemsContainer, scroll, html, Lampa.Template.get) in build(). Aborting UI build.");
                   // Если не можем построить UI, показываем ошибку/пустое состояние.
                   if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                  _this.empty("Не удалось построить интерфейс.");
                  return;
             }


            // Очищаем контейнер для карточек и массив объектов HanimeCard перед добавлением новых элементов.
            itemsContainer.empty(); // Удаляем все предыдущие DOM-элементы карточек.
            items = []; // Очищаем массив JS-объектов HanimeCard.


            // Для каждого элемента метаданных создаем HanimeCard, получаем ее DOM и добавляем в itemsContainer.
            result.forEach(function (meta) {
                 // Создаем новый экземпляр HanimeCard, передавая данные и ссылку на текущий HanimeComponent (_this).
                var card = new HanimeCard(meta, _this); // new HanimeCard(data, componentRef)
                 // Получаем jQuery-объект корневого DOM-элемента этой карточки.
                var cardElement = card.render();

                 // Добавляем DOM-элемент карточки в контейнер, который будет прокручиваться Scroll-ом.
                 itemsContainer.append(cardElement);
                 // Добавляем объект HanimeCard в массив items. Этот массив нужен для управления экземплярами HanimeCard (destroy, поиск по элементу).
                items.push(card);
            });
             console.log("HanimeComponent: Created and added", items.length, "cards to itemsContainer.");


            // Добавляем itemsContainer (который содержит все карточки) в Scroll компонент.
            // Lampa.Scroll автоматически создает вокруг itemsContainer свою внутреннюю DOM-структуру с классами scroll__content и scroll__body.
            if (typeof scroll.append === 'function') scroll.append(itemsContainer);
            else console.error("HanimeComponent: Scroll append method not available.");


            // Вставляем рендер Scroll компонента в items-line__body основного layout'а компонента.
            // scroll.render() возвращает корневой DOM-элемент Scroll.
            // Передача 'true' в render() заставляет Scroll пересчитать свои размеры и положение.
            if (html && typeof html.find === 'function' && typeof scroll.render === 'function') {
                html.find('.items-line__body').empty().append(scroll.render(true));
                 //console.log("HanimeComponent: Scroll rendered into items-line__body.");
            } else console.error("HanimeComponent: Html or scroll.render method not available for rendering scroll.");


             // Убираем индикатор загрузки активности и делаем основной DOM компонента видимым.
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
             if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
             //console.log("HanimeComponent: Build process completed and activity toggled.");

             // Настройка Controller для навигации и первый фокус будут в start() методе.
        };

         // Коллбэк метод, который вызывается из HanimeCard при клике/выборе элемента (например, ОК/Enter).
         this.onCardClick = function(cardData) {
             console.log("HanimeComponent: Card clicked:", cardData.title);
             // Вызываем метод fetchStreamAndMeta для загрузки деталей потока и запуска плеера.
            this.fetchStreamAndMeta(cardData.id, cardData);
         }

         // Коллбэк метод, который вызывается из HanimeCard при долгом нажатии (для показа контекстного меню).
         this.showCardContextMenu = function(cardElement, cardData) {
             console.log("HanimeComponent: showCardContextMenu for", cardData.title);
             var _this = this;

             // Определяем имя текущего активного контроллера Lampa, чтобы вернуться к нему после закрытия меню Select.
             // Проверяем, что Lampa.Controller доступен и его метод enabled есть.
             var enabled = (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;

             // Получаем статус закладок для элемента с помощью Lampa.Favorite. Проверяем его наличие.
             var status  = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(cardData) : {};


             // Формируем массив пунктов для контекстного меню.
             // Используем Lampa.Lang для получения переводов текстов пунктов. Проверяем наличие Lang.
             var menu_favorite = [
                 { title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('title_book') : 'Запланировано', where: 'book', checkbox: true, checked: status.book }, // Запланировано (чекбокс)
                 { title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('title_like') : 'Нравится', where: 'like', checkbox: true, checked: status.like }, // Нравится (чекбокс)
                 { title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('title_wath') : 'Смотрю', where: 'wath', checkbox: true, checked: status.wath }, // Смотрю (чекбокс)
                 { title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('menu_history') : 'История', where: 'history', checkbox: true, checked: status.history }, // История (чекбокс)
                 { title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('settings_cub_status') : 'Статус', separator: true } // Разделитель для статусов
                 // Добавьте сюда пункты для маркеров состояния (Смотрю, Просмотрено, и т.д.), если API поддерживает.
                 // Например: { title: Lampa.Lang.translate('title_viewed'), where: 'viewed', checked: status.viewed, collect: true, noenter: !Lampa.Account.hasPremium() },
             ];

             // Показываем стандартное контекстное меню Lampa (Lampa.Select).
             // Проверяем наличие Lampa.Select.
             if (window.Lampa && Lampa.Select && typeof Lampa.Select.show === 'function') {
                 Lampa.Select.show({
                     title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('title_action') : 'Действие', // Заголовок меню Select
                     items: menu_favorite, // Пункты меню
                     // Обработчик события "Назад" в меню Select.
                     onBack: ()=>{
                          // При закрытии меню Select, возвращаем управление Controller-у, который был активен до открытия меню.
                         if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                          console.log("HanimeComponent: Context menu back button pressed. Restored controller:", enabled);
                     },
                     // Обработка выбора чекбокса в меню.
                     onCheck: (a)=>{
                         console.log("HanimeComponent: Context menu - checkbox checked:", a.where);
                         // Переключаем статус закладки с помощью Lampa.Favorite.
                         if(window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function') Lampa.Favorite.toggle(a.where, cardData);
                          // Обновляем иконки закладок и маркер на конкретной карточке.
                         // Находим JS-объект HanimeCard, соответствующий DOM-элементу карточки.
                         var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                          if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                         else console.warn("HanimeComponent: Failed to find Card object to update icons after onCheck.");
                     },
                     // Обработка выбора обычного пункта меню (например, переключение маркера статуса).
                     onSelect: (a)=>{
                          console.log("HanimeComponent: Context menu - item selected:", a);
                          // Если выбран пункт, который переключает статус маркера ('collect' флаг в определении пункта меню).
                          if(a.collect && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function'){
                              Lampa.Favorite.toggle(a.where, cardData); // Переключаем статус маркера.
                               // Обновляем иконки и маркер на карточке.
                               var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                              if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                               else console.warn("HanimeComponent: Failed to find Card object to update icons after onSelect.");
                          }
                          // Закрываем меню Select.
                          if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                           // Возвращаем управление Controller-у, который был активен до вызова меню.
                           if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                            console.log("HanimeComponent: Context menu selected and closed.");
                     },
                      // Метод, вызываемый для настройки внешнего вида каждого пункта меню перед его отображением.
                      // Используется для добавления иконки замка к пунктам, требующим Premium.
                      onDraw: (item, elem) => {
                           // Проверяем, если пункт меню помечен как "collection" (маркер статуса)
                           // И у пользователя нет Premium аккаунта.
                           if (elem.collect && window.Lampa && Lampa.Account && typeof Lampa.Account.hasPremium === 'function' && !Lampa.Account.hasPremium()) {
                                // Получаем HTML-шаблон иконки замка из Lampa.Template.
                                let lockIconTemplate = (window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.has('icon_lock')) ? Lampa.Template.get('icon_lock') : null;
                                if (lockIconTemplate) {
                                     // Создаем jQuery-объект из шаблона замка.
                                     let wrap = $('<div class="selectbox-item__lock"></div>'); // Стандартный класс Lampa для оформления замка в меню.
                                     wrap.append($(lockIconTemplate)); // Добавляем SVG-иконку замка.
                                     item.find('.selectbox-item__checkbox').remove(); // Удаляем стандартный чекбокс, если есть.
                                     item.append(wrap); // Добавляем блок с иконкой замка к пункту меню.

                                     // Переопределяем стандартное поведение hover:enter для этого пункта.
                                     // Теперь при нажатии ОК/Enter на пункте с замком, показывается окно Premium.
                                     item.off('hover:enter').on('hover:enter', () => { // Удаляем старые hover:enter обработчики и добавляем свой.
                                         if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close(); // Закрываем меню.
                                          if (window.Lampa && Lampa.Account && typeof Lampa.Account.showCubPremium === 'function') Lampa.Account.showCubPremium(); // Показываем окно Premium.
                                     });
                                } else {
                                     console.warn("Hanime Component: icon_lock template or Template.has/get missing for Premium item draw.");
                                }
                           }
                      }
                 });
             } else {
                 // Если Lampa.Select недоступен, показываем базовое уведомление.
                 console.warn("Hanime Component: Lampa.Select component not available to show context menu.");
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Компонент меню недоступен.');
             }
         };

        // Метод для прокрутки Scroll компонента к заданному DOM-элементу карточки.
        // Вызывается из HanimeCard в ответ на событие 'hover:focus'.
        this.updateScrollToFocus = function(element) {
            // 'element' здесь - это jQuery-объект карточки, на которой установлен фокус.
             //console.log("HanimeComponent: updateScrollToFocus() called with element:", element);
             // Убедимся, что Scroll компонент инициализирован и доступен.
            if (scroll && typeof scroll.update === 'function') {
                last = element[0]; // Сохраняем ссылку на нативный DOM-элемент сфокусированной карточки для восстановления фокуса при возврате.
                scroll.update(element, true); // Вызываем метод update Scroll-а. element - DOM или jQuery объект элемента, true - плавная прокрутка.
                 //console.log("HanimeComponent: Scroll updated to focused element:", last);
            } else {
                console.warn("HanimeComponent: Scroll instance or update method not available to scroll to element.");
            }
        }

        // Метод для загрузки стрима и метаданных (для воспроизведения).
        // Вызывается из onCardClick.
        this.fetchStreamAndMeta = function (id, meta) {
             var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

            // Показываем индикатор загрузки.
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeComponent: Activity loader not available in fetchStreamAndMeta.");

            console.log("HanimeComponent: fetchStreamAndMeta for ID:", id);

            // Проверяем, доступен ли Network компонент для запросов.
            if (!network) {
                console.error("HanimeComponent: Network component not available.");
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Сетевой компонент недоступен.', 5000);
                return;
            }

            // Выполняем параллельные сетевые запросы для потока и метаданных.
            Promise.all([
                new Promise((resolve, reject) => { // Запрос на получение данных потока
                    if(network) network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                    else reject('Network unavailable');
                }),
                // Запрос на получение метаданных (если метаданных из списка недостаточно или их нет)
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                     if(network) network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                     else reject('Network unavailable');
                 })
            ]).then(([streamData, metaDataResponse]) => {
                 // Скрываем лоадер после успешного получения обоих ответов.
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);

                // Получаем полные метаданные (из metaDataResponse.meta или из самого metaDataResponse).
                const fullMetaData = metaDataResponse.meta || metaDataResponse;
                console.log("HanimeComponent: Stream data received:", streamData);
                console.log("HanimeComponent: Full Meta Data received:", fullMetaData);

                // Проверяем, есть ли в ответе streamData список потоков и что он не пустой.
                if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0]; // Берем первый поток из списка.
                    var finalStreamUrl = streamToPlay.url; // Получаем URL потока.

                    // Логика проксирования URL с highwinds-cdn.com (для обхода CORS).
                    try {
                         // Пробуем парсить URL потока.
                         var url = new URL(finalStreamUrl);
                         // Если домен содержит 'highwinds-cdn.com', оборачиваем оригинальный URL прокси адресом.
                         if (url.hostname && url.hostname.includes('highwinds-cdn.com')) {
                             finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                             console.log("HanimeComponent: Stream URL proxied:", finalStreamUrl);
                         } else {
                            console.log("HanimeComponent: Stream URL does not require proxy:", finalStreamUrl);
                         }
                    } catch (e) {
                        console.error("HanimeComponent: Failed to parse or proxy stream URL:", e);
                         console.log("HanimeComponent: Using original stream URL due to error:", finalStreamUrl);
                         // Если парсинг вызвал ошибку, продолжаем использовать оригинальный URL.
                    }

                    // Подготавливаем объект с информацией для стандартного Lampa Player.
                    var playerObject = {
                        title: fullMetaData.name || fullMetaData.title || 'Без названия', // Заголовок для плеера.
                        url: finalStreamUrl, // URL потока для воспроизведения.
                        poster: fullMetaData.poster || fullMetaData.background || '', // URL постера для плеера.
                         // Можно добавить другие поля, если Lampa Player их поддерживает и API предоставляет (длительность, субтитры и т.д.).
                         // duration: fullMetaData.runtime ? fullMetaData.runtime * 60 : undefined, // Длительность в секундах
                         // subtitles: streamToPlay.subtitles // Массив объектов субтитров.
                    };

                    // Проверяем, есть ли валидный URL для плеера и доступен ли Lampa Player.
                    if (playerObject.url && window.Lampa && Lampa.Player && typeof Lampa.Player.play === 'function' && typeof Lampa.Player.playlist === 'function') {
                         console.log("HanimeComponent: Launching player with URL:", playerObject.url);
                         Lampa.Player.play(playerObject); // Запуск воспроизведения.
                         Lampa.Player.playlist([playerObject]); // Устанавливаем текущий элемент как плейлист (можно добавить больше, если логика сложнее).

                         // Добавляем элемент в историю просмотра Lampa.
                         if (fullMetaData && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                                const historyMeta = {
                                    id: fullMetaData.id || '', // Уникальный идентификатор.
                                    title: fullMetaData.name || fullMetaData.title || '', // Заголовок.
                                    poster: fullMetaData.poster || fullMetaData.background || '', // Постер.
                                    runtime: fullMetaData.runtime, // Продолжительность (если есть).
                                    year: fullMetaData.year, // Год (если есть).
                                    original_name: fullMetaData.original_name || '' // Оригинальное название (если есть).
                                };
                                Lampa.Favorite.add('history', historyMeta, 100); // Добавляем в историю (тип 'history') с лимитом в 100 записей.
                                console.log("HanimeComponent: Added to history:", historyMeta);
                         } else {
                              console.warn("HanimeComponent: Lampa.Favorite not available to add to history.");
                         }

                    } else {
                         console.error("HanimeComponent: Cannot launch player. Missing URL, Lampa.Player, or methods.");
                         // Показываем уведомление об ошибке.
                         if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                             Lampa.Noty.show(playerObject.url ? 'Компонент плеера недоступен.' : 'Не удалось получить ссылку на поток.', 5000);
                         }
                    }

                } else {
                     console.warn("HanimeComponent: No streams found in API data or invalid structure.");
                     // Показываем уведомление об отсутствии потоков.
                     if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                         Lampa.Noty.show('Потоки не найдены для этого аниме.', 5000);
                     }
                }

            }).catch(error => {
                 // Обработка ошибок Promise.all (ошибки запросов).
                if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); // Скрываем лоадер.
                console.error("HanimeComponent: Error fetching stream/meta details:", error);
                 // Показываем уведомление об ошибке.
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'), 5000);
                 }
            });
        };

        // Метод для отображения сообщения о пустом состоянии каталога или ошибке загрузки.
        // Вызывается из fetchCatalog() или build().
        this.empty = function (msg) {
             console.log("HanimeComponent: empty() - Displaying message:", msg);
             // Проверяем, доступен ли стандартный Lampa компонент Empty.
             if (window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function') {
                 var empty = new Lampa.Empty({ message: msg }); // Создаем экземпляр Empty.
                 // Если корневой DOM компонента (html) создан, очищаем его и добавляем DOM Empty компонента.
                 if(html && typeof html.empty === 'function' && typeof html.append === 'function') html.empty().append(empty.render(true));
                 else console.warn("HanimeComponent: Html container not available or its methods missing to show empty state.");

                 // Скрываем индикатор загрузки и делаем активность видимой.
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                 // Переназначаем метод start текущей активности на метод start Empty компонента.
                 // Это гарантирует, что Lampa Controller будет правильно управлять Empty компонентом (например, обработка кнопки Назад).
                 if (typeof empty.start === 'function') this.start = empty.start;
                 else console.warn("HanimeComponent: Empty component does not have a start method.");

                  console.log("HanimeComponent: Displaying empty state via Lampa.Empty.");
             } else {
                  // Fallback на случай, если Lampa.Empty недоступен. Просто выводим текст в контейнер html.
                  console.warn("HanimeComponent: Lampa.Empty component not available. Using basic text fallback.");
                  if(html && typeof html.empty === 'function' && typeof html.text === 'function') html.empty().text(msg + ' (Компонент Empty недоступен)'); // Очищаем и добавляем текст сообщения.
                  // Скрываем лоадер и показываем активность.
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                   // В этом случае, нам нужен свой минимальный метод start, чтобы кнопка Назад работала.
                   this.start = function() {
                        console.log("HanimeComponent: Fallback start() for empty state. Setting minimal Controller.");
                        // Устанавливаем Controller только с обработчиком Назад.
                       if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                            Lampa.Controller.add('content', { back: this.back });
                            Lampa.Controller.toggle('content');
                       } else console.warn("HanimeComponent: Lampa.Controller not available for fallback start method.");
                   }.bind(this); // Важно привязать контекст (this = HanimeComponent).
             }
        };

        // Метод создания активности. Вызывается Lampa при первом переходе на эту активность.
        this.create = function () {
            console.log("HanimeComponent: create()");
             // Сначала строим основную DOM-структуру компонента (items-line).
            this.buildLayout();
            // Показываем стандартный индикатор загрузки Lampa.
             if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(true);
            // Запускаем загрузку данных каталога из API.
            this.fetchCatalog();
             console.log("HanimeComponent: create() finished. Fetching catalog initiated.");
        };

        // Метод запуска активности. Вызывается Lampa, когда активность становится видимой и должна получить фокус Controller.
        // Это происходит при первом открытии активности и при возврате на нее из другой активности (например, из меню или плеера).
        this.start = function () {
            console.log("HanimeComponent: start()");
             // Проверяем, что текущая активность Lampa - именно эта активность.
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this.activity) {
                console.log("HanimeComponent: start() - Not the currently active activity, skipping.");
                return; // Выходим, если активность не активна.
            }
             console.log("HanimeComponent: start() - Activity is active. Setting up Lampa.Controller.");

            // Настраиваем Lampa.Controller для управления фокусом и навигацией в этой активности.
            // Используем имя 'content' - стандартное имя для контроллера основного содержимого.
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && scroll && typeof scroll.render === 'function') {
                 Lampa.Controller.add('content', {
                     toggle: function () {
                         // Этот метод toggle() вызывается Controller'ом при активации/переключении на него.
                         console.log("HanimeComponent: Controller toggle() called.");
                         // 1. Указываем Controller-у коллекцию DOM-элементов (селекторов), по которым можно перемещаться.
                         //    Controller ищет элементы с классом '.selector' внутри контейнера, который возвращает scroll.render().
                         if(Lampa.Controller && typeof Lampa.Controller.collectionSet === 'function' && scroll) Lampa.Controller.collectionSet(scroll.render());
                          else console.warn("HanimeComponent: Controller collectionSet method or scroll missing.");

                         // 2. Устанавливаем начальный фокус в этой коллекции.
                         //    Controller.collectionFocus попытается сфокусироваться на элементе 'last' (если он был сохранен),
                         //    или на первом доступном элементе в коллекции по умолчанию.
                         //    Установка фокуса с помощью Controller.collectionFocus ВЫЗЫВАЕТ стандартное событие 'hover:focus'
                         //    на том DOM-элементе, который получил фокус.
                         if(Lampa.Controller && typeof Lampa.Controller.collectionFocus === 'function' && scroll) Lampa.Controller.collectionFocus(last || false, scroll.render());
                         else console.warn("HanimeComponent: Controller collectionFocus method or scroll missing.");

                          console.log("HanimeComponent: Controller collectionSet/Focus called in toggle().");
                     },
                     // Обработчики событий нажатия на кнопки пульта/стрелки.
                     left: function () {
                         // Пытаемся переместить фокус влево в текущей коллекции Controller'а.
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('left')) Navigator.move('left');
                          // Если перемещение внутри коллекции невозможно (достигли левого края), переключаем контроллер на стандартное меню Lampa.
                         else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('menu');
                         else console.log("HanimeComponent: Cannot move left, Navigator or menu controller unavailable.");
                     },
                     right: function () {
                          // Пытаемся переместить фокус вправо.
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('right')) Navigator.move('right');
                          else console.log("HanimeComponent: Cannot move right, Navigator unavailable or no more elements.");
                     },
                     up: function () {
                          // В контексте горизонтальной линии (items-line), стрелка ВВЕРХ обычно переключает на Controller заголовка активности ('head').
                         if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('head');
                         else console.log("HanimeComponent: Head controller unavailable for UP.");
                     },
                     down: function () {
                          // В контексте одной горизонтальной линии, стрелка ВНИЗ обычно не приводит к перемещению фокуса, т.к. нет элементов или других линий ниже.
                          // Если бы были другие горизонтальные линии под этой, Navigator мог бы переместить фокус вниз.
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('down')) Navigator.move('down');
                          else console.log("HanimeComponent: Cannot move down, Navigator unavailable or no elements below.");
                     },
                     // Назначаем метод back текущего компонента в качестве обработчика кнопки "Назад".
                     back: this.back
                 });

                 // Активируем наш Controller 'content'. Это приведет к вызову его метода toggle().
                 Lampa.Controller.toggle('content');
                  console.log("HanimeComponent: Controller 'content' toggled. Initial focus attempt made by Controller.");

                 // Важно: Начальная прокрутка Scroll к первому (или last) элементу не делается вручную здесь.
                 // Она происходит автоматически, потому что Controller.collectionFocus() выше вызывает событие 'hover:focus' на элементе,
                 // а обработчик 'hover:focus' внутри HanimeCard вызывает this.updateScrollToFocus().

             } else {
                // Fallback, если Lampa.Controller или Scroll недоступны. Пытаемся установить базовый контроллер хотя бы для кнопки "Назад".
                console.error("HanimeComponent: Lampa.Controller or scroll not available in start(). Cannot setup main Controller.");
                 if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                     console.log("HanimeComponent: Attempting to add basic Controller for Back button.");
                     Lampa.Controller.add('content', { back: this.back }); // Добавляем минимальный контроллер.
                     Lampa.Controller.toggle('content'); // Активируем его.
                 } else console.warn("HanimeComponent: Lampa.Controller unavailable, cannot add basic back handler.");
             }
        };

        // Метод вызывается Lampa, когда активность временно приостанавливается (например, при открытии меню, плеера, другой активности).
        // Важно сохранить состояние (последний сфокусированный элемент) для последующего возврата.
        this.pause = function () {
             console.log("HanimeComponent: pause()");
             // Проверяем, что Lampa.Controller доступен, что наш контроллер 'content' активен.
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') {
                 // Получаем текущий сфокусированный DOM-элемент из Controller и сохраняем его в 'last'.
                 // Используем || last, чтобы сохранить предыдущее значение, если item() вернет null.
                 last = Lampa.Controller.item() || last;
                  console.log("HanimeComponent: Activity paused. Saved last focused DOM item:", last);
             } else {
                  console.log("HanimeComponent: Pause called, but content controller not active or Controller.item missing. Last focus not saved.");
             }
        };

        // Метод вызывается Lampa, когда активность полностью останавливается (перед уничтожением).
        this.stop = function () {
             //console.log("HanimeComponent: stop()");
            // В методе stop обычно сбрасываются таймауты, интервалы, подписки на глобальные события,
            // которые не очищаются автоматически в методе destroy.
            // В данном случае, большинство чистки происходит в destroy().
        };

        // Метод рендеринга. Вызывается Lampa, когда ей нужен DOM-элемент для отображения этой активности.
        this.render = function () {
             //console.log("HanimeComponent: render() called.");
             // Если корневая DOM-структура компонента еще не была создана, создаем ее.
            if (!html) {
                 this.buildLayout(); // buildLayout() создает html и itemsContainer.
            }
            return html; // Возвращаем jQuery-объект корневого DOM-элемента (items-line).
        };

        // Метод уничтожения. Вызывается Lampa, когда активность закрывается навсегда.
        // Освобождаем все ресурсы, чтобы избежать утечек памяти.
        this.destroy = function () {
            console.log("HanimeComponent: destroy() called.");
             // Отменяем все незавершенные сетевые запросы Network компонента.
            if(network && typeof network.clear === 'function') network.clear(); network = null; // Обнуляем ссылку.

            // Уничтожаем все экземпляры HanimeCard в массиве 'items'.
            // Lampa.Arrays.destroy вызывает метод destroy() для каждого объекта в массиве.
             if (items && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') {
                 Lampa.Arrays.destroy(items); // Вызывает destroy() на каждом HanimeCard объекте.
                 console.log("HanimeComponent: Destroyed items array.");
             }
            items = null; // Обнуляем ссылку на массив.

            // Уничтожаем экземпляр Lampa.Scroll. Это удалит DOM Scroll и отпишется от событий.
             if (scroll && typeof scroll.destroy === 'function') {
                 scroll.destroy();
                 console.log("HanimeComponent: Destroyed scroll instance.");
             }
             scroll = null;

            // Удаляем корневой DOM-элемент компонента (items-line) из документа.
             if (html && typeof html.remove === 'function') {
                 html.remove();
                 console.log("HanimeComponent: Removed html element from DOM.");
             }
            html = null; itemsContainer = null; // Обнуляем ссылки на DOM-элементы. last = null; // Сбрасываем ссылку на последний сфокусированный элемент.


            // Очищаем и удаляем регистрацию нашего Controller из Lampa Controller Manager.
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function') {
                 // Если наш контроллер ('content') сейчас активен,先清空他的元素集合，
                 // Можливо повернути управління стандартному контроллеру (опціонально)
                 if (Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.collectionSet === 'function') {
                      Lampa.Controller.collectionSet([]); // Снимаем все элементы с контроля.
                      // Опционально: Lampa.Controller.toggle('app'); // Переключаемся на основной контроллер.
                       console.log("HanimeComponent: Controller collection set empty.");
                 }
                 // Удаляем нашу регистрацию контроллера по имени.
                 Lampa.Controller.remove('content');
                  console.log("HanimeComponent: Controller 'content' removed.");
            } else console.warn("HanimeComponent: Lampa.Controller not available or remove method missing for cleanup in destroy.");

            console.log("HanimeComponent: destroy() finished. All resources released.");
        };

        // Обработчик кнопки "Назад".
        // Привязывается к Controller в методе start().
        this.back = function () {
             console.log("HanimeComponent: back() called. Attempting Activity.backward().");
             // Используем стандартный метод Lampa.Activity для навигации назад по стеку активностей.
             // Проверяем наличие Lampa.Activity и метода backward.
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') {
                 Lampa.Activity.backward();
             } else console.warn("HanimeComponent: Lampa.Activity or backward method missing for navigation.");
        };
    }


    // --- Глобальная функция инициализации плагина. Является входной точкой после загрузки файла. ---
    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() invoked.");

        // Устанавливаем глобальный флаг. Делаем это сейчас, перед ожиданием Lampa, чтобы
        // избежать двойной инициализации, если скрипт каким-то образом загрузится дважды.
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: plugin_hanime_catalog_ready flag already set. Skipping initialization.");
             return; // Если флаг уже установлен, плагин уже запущен, выходим.
         }
         // Не устанавливаем флаг здесь, перенес установку внутрь initializeLampaDependencies после проверок Lampa.


        // --- Функция, содержащая основную логику инициализации, зависящую от готовой Lampa. ---
        // Эта функция будет вызвана только после того, как Lampa просигнализирует о готовности.
        function initializeLampaDependencies() {
             console.log("Hanime Plugin: initializeLampaDependencies() called (Lampa appready or fallback delay completed).");

             // В этом месте мы ожидаем, что все основные компоненты Lampa (Lampa.Template, Lampa.Component, Lampa.Activity, etc.) доступны.
             // Выполняем строгую проверку наличия критических компонентов перед продолжением.
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Template || typeof Lampa.Template !== 'object' || !Lampa.Component || typeof Lampa.Component !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function') {
                  console.error("Hanime Plugin: CRITICAL: Required Lampa components (Lampa.*, jQuery) are not available after waiting for appready. Initialization failed. Please check Lampa version and installation.");
                  // Показываем сообщение об ошибке пользователю, если компонент Noty доступен.
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина: Компоненты Lampa недоступны. Обновите Lampa или плагин.', 10000);
                  }
                  return; // Прерываем дальнейшую инициализацию.
             }
             console.log("Hanime Plugin: Basic required Lampa components checked OK. Continuing initialization.");


             // --- Устанавливаем глобальный флаг ПЛАГИНА ПОСЛЕ ТОГО, КАК УБЕДИЛИСЬ, ЧТО LAMPA ГОТОВА. ---
              if (!window.plugin_hanime_catalog_ready) { // Повторная проверка на всякий случай.
                 window.plugin_hanime_catalog_ready = true;
                 console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag set.");
              } else {
                   console.warn("Hanime Plugin: plugin_hanime_catalog_ready was unexpectedly set before initialization. Possible double load issue?");
                   return; // Если флаг каким-то образом уже установлен, прерываем инициализацию, чтобы избежать проблем.
              }


             // --- 1. Определение СТАНДАРТНЫХ ВНУТРЕННИХ шаблонов Lampa (как fallback). ---
             // Добавляем их НАПРЯМУЮ, используя Lampa.Template.add. НЕ НУЖНЫ ПРОВЕРКИ Lampa.Template.has().
             // Они должны быть доступны после appready и проверки window.Lampa.Template.
             console.log("Hanime Plugin: Adding standard template fallbacks using Lampa.Template.add...");
             // Проверяем наличие add метода.
             if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                 Lampa.Template.add('card_vote_temp', '<div class="card__vote hanime-card__vote">{vote}</div>');
                 Lampa.Template.add('card_quality_temp', '<div class="card__quality hanime-card__quality"><div>{quality}</div></div>');
                 Lampa.Template.add('card_year_temp', '<div class="card__age hanime-card__age">{year}</div>');
                 Lampa.Template.add('card_type_temp', '<div class="card__type hanime-card__type">{type}</div>');
                 Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
                  console.log("Hanime Plugin: Standard template fallbacks added successfully.");
             } else {
                 console.error("Hanime Plugin: Lampa.Template.add method not available. Cannot add template fallbacks.");
                 // Можно продолжить без шаблонов, но UI будет неполным.
             }


             // --- 2. Определение ВАШЕГО основного шаблона карточки 'hanime-card'. ---
             // Этот шаблон ИСПОЛЬЗУЕТ стандартные внутренние шаблоны, определенные выше.
             console.log("Hanime Plugin: Adding hanime-card template...");
             if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                 // Теперь Lampa.Template.get должно работать для стандартных шаблонов, определенных выше.
                 Lampa.Template.add('hanime-card', `
                     <div class="hanime-card card selector layer--visible layer--render">
                         <div class="card__view hanime-card__view">
                             <img src="./img/img_load.svg" class="card__img hanime-card__img" alt="{title}" loading="lazy" />
                             <div class="card__icons hanime-card__icons">
                                 <div class="card__icons-inner hanime-card__icons-inner"></div>
                             </div>
                             <!-- Используем Lampa.Template.get для вставки внутренних стандартных блоков -->
                             <!-- Если стандартный шаблон отсутствует (крайне маловероятно после добавления), Template.get может вернуть null/undefined -->
                             ${ (Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.get('card_vote_temp')) ? Lampa.Template.get('card_vote_temp', { vote: '{vote}' }) : ''}
                             ${ (Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.get('card_quality_temp')) ? Lampa.Template.get('card_quality_temp', { quality: '{quality}' }) : ''}
                             ${ (Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.get('card_type_temp')) ? Lampa.Template.get('card_type_temp', { type: '{type}' }) : ''}
                         </div>
                         <div class="card__title hanime-card__title">{title}</div>
                         ${ (Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.get('card_year_temp')) ? Lampa.Template.get('card_year_temp', { year: '{year}' }) : ''}
                     </div>
                 `);
                  console.log("Hanime Plugin: HanimeCard template added successfully.");
             } else {
                  console.error("Hanime Plugin: Lampa.Template.add method not available. Cannot add hanime-card template.");
             }


             // --- 3. CSS Стили ---
             // УДАЛЕН ВЕСЬ БЛОК ОПРЕДЕЛЕНИЯ И ДОБАВЛЕНИЯ ВАШИХ КАТОМНЫХ CSS СТИЛЕЙ.
             // Плагин будет полагаться ТОЛЬКО на стандартные стили Lampa для классов,
             // которые используются в DOM (card, selector, items-line и т.д.).
             console.log("Hanime Plugin: Custom CSS block removed as requested. Relying on standard Lampa styles.");


             // --- 4. Регистрируем ВАШ основной компонент каталога. ---
             // Делаем это после того, как все шаблоны и основные ресурсы определены.
             console.log("Hanime Plugin: Registering HanimeComponent...");
             if (window.Lampa && Lampa.Component && typeof Lampa.Component.add === 'function') { // Проверяем Component Manager
                 Lampa.Component.add('hanime_catalog', HanimeComponent);
                 console.log("Hanime Plugin: Component 'hanime_catalog' registered successfully.");
             } else {
                 console.error("Hanime Plugin: Lampa.Component.add method not available. Cannot register component.");
                  // Можно показать ошибку Noty, если Noty доступен
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина: Не удалось зарегистрировать компонент.', 5000);
                  }
             }


             // --- 5. Добавляем пункт меню. ---
             // Это действие должно выполняться после того, как наш компонент зарегистрирован,
             // и основные компоненты Lampa (Activity, Controller, jQuery) доступны.
             console.log("Hanime Plugin: Calling addMenuItem()...");
             addMenuItem();
              console.log("Hanime Plugin: addMenuItem() called from initializeLampaDependencies.");

              console.log("Hanime Plugin: initializeLampaDependencies() finished.");
        }


        // --- Функция добавления пункта меню. ---
        // Вызывается из initializeLampaDependencies().
        function addMenuItem() {
             console.log("Hanime Plugin: addMenuItem() called.");

             // Выполняем все необходимые проверки перед взаимодействием с UI Lampa.
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Component || typeof Lampa.Component !== 'object' || typeof Lampa.Component.get !== 'function' || !$('.menu .menu__list').length) {
                  console.warn("Hanime Plugin: addMenuItem cannot proceed. Missing Lampa core components, jQuery, Component.get, or menu DOM structure.");
                  return; // Выходим, если не можем надежно добавить меню.
             }
             console.log("Hanime Plugin: addMenuItem checks passed. Lampa UI seems ready.");


             // Проверяем, что наш КОМПОНЕНТ 'hanime_catalog' был успешно зарегистрирован.
             var ourComponentRegistered = Lampa.Component.get('hanime_catalog');
             if (!ourComponentRegistered) {
                 console.warn("Hanime Plugin: addMenuItem skipping - Component 'hanime_catalog' is not registered.");
                 return;
             }
             console.log("Hanime Plugin: Component 'hanime_catalog' found.");


             // Проверка на случай дублирования пункта меню по тексту. (Не критично, но для чистоты).
             if ($('.menu .menu__list .menu__text:contains("Hanime Catalog")').length > 0) {
                 console.log("Hanime Plugin: Menu item 'Hanime Catalog' already exists in DOM. Skipping addition.");
                 return;
             }
             console.log("Hanime Plugin: Adding menu item DOM element to Lampa menu.");

             // Создаем DOM-элемент пункта меню, используя СТАНДАРТНЫЕ классы Lampa и ОБЯЗАТЕЛЬНЫЙ класс 'selector'.
             // Эти классы (menu__item, menu__ico, menu__text) уже имеют стандартные стили Lampa.
            var menu_item = $(`
                <li class="menu__item selector">
                    <div class="menu__ico">
                        <!-- Иконка в формате SVG -->
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">Hanime Catalog</div>
                </li>
            `);

            // Привязываем обработчик стандартного события Lampa 'hover:enter'.
            // Это событие генерируется Lampa Controller при выборе пункта меню пультом (кнопка OK).
            menu_item.on('hover:enter', function () {
                 console.log("Hanime Plugin: Menu item 'Hanime Catalog' activated via 'hover:enter'. Pushing activity.");
                 // Запускаем новую активность Lampa с нашим зарегистрированным компонентом.
                Lampa.Activity.push({
                    url: '', // URL для навигации/истории браузера (можно оставить пустым)
                    title: 'Hanime Catalog', // Заголовок, который отобразится в шапке новой активности
                    component: 'hanime_catalog', // Имя зарегистрированного компонента, который Lampa должна использовать
                    page: 1 // Стартовый номер страницы (если ваш компонент поддерживает пагинацию)
                });
                 console.log("Hanime Plugin: Lampa.Activity.push called.");
            });

            // Находим стандартный DOM-элемент списка меню Lampa.
            // eq(0) берет первый элемент, т.к. может быть несколько списков меню.
            var menuList = $('.menu .menu__list').eq(0);
             if (menuList.length > 0) {
                 // Добавляем созданный DOM-элемент пункта меню в список меню.
                 menuList.append(menu_item);
                 console.log("Hanime Plugin: Menu item DOM element successfully added to Lampa menu list.");
             } else {
                 console.error("Hanime Plugin: addMenuItem failed: Could not find Lampa menu list DOM element ('.menu .menu__list').");
                 // Если DOM меню не найден даже после appready, это может указывать на серьезную проблему с Lampa или ее стилями.
                 // Повторная попытка добавления с задержкой может помочь в редких случаях, но здесь она опущена для ясности.
             }
             console.log("Hanime Plugin: addMenuItem finished.");
        }


        // --- ТОЧКА ВХОДА СКРИПТА ПЛАГИНА: Логика ожидания готовности LAMPA. ---
        console.log("Hanime Plugin: startPlugin() invoked. Setting up Lampa ready listener.");

        // Проверяем, доступен ли стандартный Listener Lampa для подписки на событие готовности 'app'.
        if (window.Lampa && typeof window.Lampa === 'object' && Lampa.Listener && typeof Lampa.Listener === 'object' && typeof Lampa.Listener.follow === 'function') {
             // Подписываемся на событие 'app'. Коллбэк сработает, когда Lampa вызовет 'app' событие.
             Lampa.Listener.follow('app', function (e) {
                 // Проверяем, что тип события - 'ready'.
                 if (e.type === 'ready') {
                     console.log("Hanime Plugin: Lampa 'appready' event received. Calling initializeLampaDependencies.");
                     // Когда Lampa полностью готова ('appready'), вызываем основную функцию инициализации плагина.
                     initializeLampaDependencies();
                 }
             });
             console.log("Hanime Plugin: Subscribed to Lampa 'app:ready' event.");

         } else if (window.appready && typeof window.appready === 'boolean' && window.appready) {
             // Fallback: Если Lampa уже установила флаг appready до того, как мы успели подписаться на Listener (что может случиться при очень быстрой загрузке),
             // и сам Listener недоступен или его API отличается, мы можем попытаться вызвать инициализацию напрямую.
             console.warn("Hanime Plugin: Lampa 'appready' flag found, but Lampa.Listener seems unavailable or unusual. Calling initializeLampaDependencies directly as fallback.");
             initializeLampaDependencies(); // Вызываем инициализацию сразу.

         } else {
             // КРИТИЧЕСКИЙ FALLBACK: Если ни Listener, ни флаг appready не доступны.
             // Мы не можем надежно определить, когда Lampa будет готова. Попытаемся вызвать инициализацию с небольшой задержкой,
             // но это очень ненадежный подход и может привести к ошибкам, если Lampa не успеет загрузиться.
             console.error("Hanime Plugin: Lampa.Listener is unavailable AND 'appready' flag not set. Cannot reliably determine Lampa readiness. Attempting delayed initialization as a HIGHLY UNRELIABLE fallback.");
              // Инициализируем через 500 мс. Настройки таймаута могут потребоваться разные в зависимости от устройства/условий загрузки.
             setTimeout(initializeLampaDependencies, 500); // Настраиваемая задержка
             console.log("Hanime Plugin: Delayed initialization fallback scheduled.");
         }

         console.log("Hanime Plugin: startPlugin() finished its initial execution.");
    }

    // Вызываем функцию startPlugin(), чтобы запустить весь процесс плагина при загрузке его файла.
    startPlugin();

})();
