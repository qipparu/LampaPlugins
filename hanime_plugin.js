(function () {
    'use strict';

    // --- HanimeCard компонента ---
    // Полностью полагаемся на стандартные классы Lampa для дизайна.
    function HanimeCard(data, componentRef) {
        // Обрабатываем данные из вашего API для соответствия ожиданиям Lampa классов и шаблонов.
        var processedData = {
            id: data.id,
            // Стандартные поля для заголовка
            title: data.name || data.title || 'Без названия',
            // Стандартное поле для пути к картинке постера
            poster_path: data.poster || data.img, // Убедитесь, что data.poster или data.img содержат URL картинки
            // Стандартные поля для рейтинга, качества, года
            vote_average: data.vote_average || data.vote || null,
            quality: data.quality || data.release_quality || null,
            release_year: ((data.year || data.release_date || '') + '').slice(0, 4),
            // Поле для типа (Movie/TV)
            type: data.first_air_date ? 'tv' : 'movie', // Если API предоставляет признак сериала (first_air_date)
            original_name: data.original_name // Для истории и т.п.
        };

        // Получаем HTML-код карточки из нашего шаблона 'hanime-card'.
        // Этот шаблон использует ТОЛЬКО стандартные классы Lampa и внутренние стандартные шаблоны.
        var cardTemplate = Lampa.Template.get('hanime-card', {
            // Передаем обработанные данные. Названия плейсхолдеров соответствуют стандартным: {img}, {title}, {vote}, {quality}, {year}, {type}.
            // HanimeCard будет обрабатывать отображение этих данных внутри стандартной структуры DOM.
            img: processedData.poster_path, // Ссылка на картинку (будет использована внутри onVisible)
            title: processedData.title,
            // Передаем данные в шаблоны-заглушки. Эти шаблоны добавятся динамически.
            vote: processedData.vote_average > 0 ? parseFloat(processedData.vote_average).toFixed(1) : '', // Форматируем рейтинг
            quality: processedData.quality,
            year: processedData.release_year !== '0000' ? processedData.release_year : '', // Год (если не 0000)
            type: processedData.type // Тип
        });

        var cardElement = $(cardTemplate); // Создаем jQuery объект DOM-элемента карточки

        // --- Методы для HanimeCard ---

        // Добавление иконки (закладка, история) - использует стандартные классы Lampa для иконок
        this.addicon = function(name) {
            var iconsContainer = cardElement.find('.card__icons-inner'); // Находим стандартный контейнер для иконок
            if (iconsContainer.length) {
                var icon = document.createElement('div');
                icon.classList.add('card__icon'); // Стандартный класс Lampa для иконки
                icon.classList.add('icon--'+name); // Добавляем специфический класс для типа иконки (например, icon--book)
                iconsContainer.append(icon);
            }
        }

        // Обновление иконок закладок и маркера статуса
        this.updateFavoriteIcons = function() {
             //console.log("HanimeCard: updateFavoriteIcons() for", processedData.title);
             // Очищаем предыдущие иконки и маркер
            cardElement.find('.card__icons-inner').empty();
            cardElement.find('.card__marker').remove(); // Удаляем старый маркер состояния (смотрю/смотрел)

            // Получаем статус закладки, используя Lampa.Favorite
             var status = (window.Lampa && Lampa.Favorite) ? Lampa.Favorite.check(processedData) : {};

            // Добавляем стандартные иконки в зависимости от статуса закладки
            if (status.book) this.addicon('book');     // "Запланировано" (букмарк)
            if (status.like) this.addicon('like');     // "Нравится"
            if (status.wath) this.addicon('wath');     // "Просматриваю"
             // Проверяем статус просмотра через Timeline (если есть и watched метод доступен)
            if (status.history || (window.Lampa && Lampa.Timeline && Lampa.Timeline.watched && Lampa.Timeline.watched(processedData))) this.addicon('history'); // "История просмотров"

            // Логика маркера состояния (текст над постером: Смотрю, Просмотрено и т.д.)
             var marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown']; // Стандартные типы маркеров в Lampa
             var activeMarker = marks.find(m => status[m]); // Ищем, какой маркер активен для этого элемента

             if (activeMarker) {
                 // Если есть активный маркер, создаем его DOM-элемент или находим существующий
                 var markerElement = cardElement.find('.card__marker');
                 if (!markerElement.length) {
                     // Создаем новый элемент маркера со стандартным классом .card__marker
                     markerElement = $('<div class="card__marker"><span></span></div>');
                     // Добавляем его внутрь .card__view (область с картинкой)
                     cardElement.find('.card__view').append(markerElement);
                 }
                 // Устанавливаем текст маркера, используя переводчик Lampa
                 markerElement.find('span').text(window.Lampa && Lampa.Lang && Lampa.Lang.translate ? Lampa.Lang.translate('title_' + activeMarker) : activeMarker);
                 // Удаляем старые классы типов маркера и добавляем класс для активного маркера
                 markerElement.removeClass(marks.map(m => 'card__marker--' + m).join(' '))
                             .addClass('card__marker--' + activeMarker);
             } else {
                 // Если активного маркера нет, удаляем его DOM-элемент
                 cardElement.find('.card__marker').remove();
             }
        };

        // Метод вызывается Lampa (например, Scroll) когда карточка становится видимой на экране
        this.onVisible = function() {
             //console.log("HanimeCard: onVisible() for", processedData.title);
             var imgElement = cardElement.find('.card__img'); // Находим стандартный img элемент

             // Загрузка картинки - используем логику с кэшированием Lampa и обработчиками загрузки/ошибки.
             // Проверяем, если img src еще не установлен или является placeholder-ом img_load.svg
             if (imgElement.length && (!imgElement.attr('src') || imgElement.attr('src').includes('img_load.svg'))) {
                 var src = processedData.poster_path; // Получаем URL картинки из данных

                 // Fallback картинка, если основной URL пустой
                 if (!src) src = './img/img_broken.svg';

                 // Используем Lampa.ImageCache для кэширования и более эффективной загрузки
                 if(window.Lampa && Lampa.ImageCache) {
                      // Пробуем прочитать картинку из кэша. read возвращает true, если успешно найдена.
                      if(!Lampa.ImageCache.read(imgElement[0], src)) {
                         // Если картинка не найдена в кэше, устанавливаем обработчики и устанавливаем src
                          imgElement[0].onload = () => {
                              cardElement.addClass('card--loaded'); // Добавляем класс, когда картинка загружена (для CSS анимации opacity)
                              Lampa.ImageCache.write(imgElement[0], imgElement[0].src); // Записываем в кэш после успешной загрузки
                              //console.log("HanimeCard: Image loaded:", src);
                          };
                          imgElement[0].onerror = () => {
                               console.error('Hanime Plugin: Image load error:', src);
                               imgElement.attr('src', './img/img_broken.svg'); // Устанавливаем картинку "битая ссылка"
                               if(window.Lampa && Lampa.Tmdb) Lampa.Tmdb.broken(); // Уведомляем Lampa TMDB, если есть такой компонент
                          };
                          imgElement.attr('src', src); // Устанавливаем src, чтобы инициировать загрузку
                      } else {
                         // Если картинка загружена из кэша, добавляем класс 'card--loaded' сразу
                         cardElement.addClass('card--loaded');
                         //console.log("HanimeCard: Image from cache:", src);
                      }
                 } else {
                     // Fallback без Lampa.ImageCache (просто устанавливаем src и обработчики)
                     console.warn("Hanime Plugin: Lampa.ImageCache not available, using basic image loading.");
                      imgElement[0].onload = () => { cardElement.addClass('card--loaded'); console.log("HanimeCard: Image loaded (no cache):", src); };
                     imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error (no cache):', src); imgElement.attr('src', './img/img_broken.svg'); };
                     imgElement.attr('src', src); // Устанавливаем src
                     //console.log("HanimeCard: Image processing started (no cache):", src);
                 }
             }

            // Обновляем иконки закладок и маркер статуса при появлении в видимости
            this.updateFavoriteIcons();
        }

        // Метод для первоначальной настройки экземпляра Card после создания DOM.
        // Навешиваем обработчики событий Lampa (hover:*) здесь.
        this.create = function(){
             //console.log("HanimeCard: create() for", processedData.title);

             // Привязываем обработчики событий Lampa hover:* к корневому элементу карточки (jQuery объект).
             // Эти события генерируются Lampa.Controller при навигации с пульта.
            cardElement.on('hover:focus', function () {
                 //console.log("HanimeCard: hover:focus on", processedData.title);
                 // Когда карточка получает фокус от Controller, прокручиваем скролл к ней
                 // Делегируем эту задачу родительскому HanimeComponent через componentRef.
                 if (componentRef && componentRef.updateScrollToFocus) {
                      componentRef.updateScrollToFocus(cardElement);
                 }
                 // Также обновляем иконки и маркеры на карточке при фокусе
                 this.update();
            }.bind(this)); // bind(this) гарантирует, что `this` внутри обработчика будет указывать на экземпляр HanimeCard


             cardElement.on('hover:enter', function () {
                //console.log("HanimeCard: hover:enter on", processedData.title);
                // Когда на карточке нажимают ОК/Enter, обрабатываем выбор
                 // Делегируем задачу родительскому HanimeComponent.
                 if (componentRef && componentRef.onCardClick) {
                     componentRef.onCardClick(processedData);
                 }
            }.bind(this));

            cardElement.on('hover:long', function(){
                 //console.log("HanimeCard: hover:long on", processedData.title);
                 // Когда на карточке нажимают долго (для контекстного меню)
                 // Делегируем задачу родительскому HanimeComponent.
                 if (componentRef && componentRef.showCardContextMenu) {
                      componentRef.showCardContextMenu(cardElement, processedData);
                 }
             }.bind(this));


            // Привязка стандартного Lampa события 'visible' к нативному DOM-элементу.
             // Это событие генерируется Lampa (например, Scroll компонентом) когда элемент становится видимым.
             this.card = cardElement[0]; // Получаем нативный DOM-элемент
             this.card.addEventListener('visible', this.onVisible.bind(this)); // Привязываем наш метод onVisible


            // Вызываем начальное обновление иконок/маркеров после создания, но с небольшой задержкой
            //, чтобы DOM элемент был добавлен в дерево документа и updateFavoriteIcons мог найти элементы.
             setTimeout(() => {
                  this.update();
             }, 0); // Задержка 0 мс = выполнить после текущего потока JS.

             //console.log("HanimeCard: create() completed and event listeners attached.");
             cardElement.data('created', true); // Помечаем jQuery объект, чтобы не вызывать create() повторно
        }

        // Метод обновления состояния карточки. Вызывается из hover:focus.
        this.update = function(){
             //console.log("HanimeCard: update() called for", processedData.title);
            this.updateFavoriteIcons(); // Обновляем иконки и маркер
             // Здесь можно добавить вызов логики прогресс-бара "смотрел" из Timeline.
             // if(window.Lampa && Lampa.Timeline && Lampa.Timeline.watched_status) Lampa.Timeline.watched_status(cardElement, processedData);
        }

        // Метод рендеринга. Возвращает DOM-элемент карточки.
        // Вызывается HanimeComponent при построении списка.
        this.render = function(js){
             //console.log("HanimeCard: render() called.");
             // Вызываем create() только в первый раз, когда вызывается render().
             if (!cardElement.data('created')) {
                 this.create();
             }
            return js ? cardElement[0] : cardElement; // Возвращаем нативный DOM-элемент или jQuery-объект
        }

        // Метод уничтожения экземпляра Card. Вызывается из HanimeComponent.destroy().
        this.destroy = function(){
             //console.log("HanimeCard: destroy() for", processedData.title);
             // Удаляем привязку события 'visible'.
             if(this.card && this.onVisible) this.card.removeEventListener('visible', this.onVisible.bind(this));
             // Удаляем DOM-элемент карточки.
             if(cardElement) cardElement.remove();
            // Обнуляем ссылки для сборщика мусора.
             processedData = null; cardElement = null; this.card = null; componentRef = null;
             //console.log("HanimeCard: destroy() completed.");
        }

        // HanimeCard не вызывается create() сама по себе. create() вызывается при первом вызове render()
        //, который вызывается HanimeComponent.build().
    }


    // --- HanimeComponent (основной компонент, отображает одну горизонтальную линию) ---
    function HanimeComponent(componentObject) {
        var network = null; // Сетевой компонент, инициализируется в create
        var scroll = null; // Scroll компонент, инициализируется в create

        var items = []; // Массив объектов HanimeCard
        var html = null; // Корневой DOM-контейнер компонента (items-line), инициализируется в buildLayout
        var itemsContainer = null; // Контейнер для карточек внутри Scroll (.scroll__body .items-cards), инициализируется в buildLayout

        var active = 0; // Индекс активного элемента (для сохранения позиции)
        var last = null; // DOM-элемент последнего сфокусированного элемента

        // Ваши API URL-ы
        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json"; // URL для последник добавлений
        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";
        var PROXY_BASE_URL = "http://77.91.78.5:3000";


        // Метод для создания DOM-структуры компонента items-line. Использует стандартные классы Lampa.
        this.buildLayout = function() {
             //console.log("HanimeComponent: buildLayout()");
             // Создаем DOM-структуру горизонтальной линии, как в стандартных компонентах Lampa.
            html = $(`
                <div class="items-line layer--visible layer--render items-line--type-cards"> <!-- Стандартные классы items-line -->
                    <div class="items-line__head"> <!-- Стандартный контейнер заголовка -->
                        <div class="items-line__title">Последние добавленные</div> <!-- Стандартный класс для заголовка -->
                         <!-- Можно добавить стандартную кнопку "Еще" с классом selector, если API позволяет. -->
                         <!-- <div class="items-line__more selector">Еще</div> -->
                    </div>
                    <div class="items-line__body"> <!-- Стандартный контейнер для содержимого (здесь будет Scroll) -->
                        <!-- Lampa.Scroll.render() вставится сюда при build -->
                    </div>
                </div>
            `);

            // Создаем контейнер, в который будут добавляться все карточки.
            // Lampa.Scroll обернет этот элемент в свою DOM-структуру с классами scroll__content и scroll__body.
             itemsContainer = $('<div class="items-cards"></div>'); // Класс items-cards - стандартный для контейнера карточек
             //console.log("HanimeComponent: buildLayout completed. itemsContainer created.");
        };

        // Метод для загрузки данных каталога из API. Вызывается в create().
        this.fetchCatalog = function () {
            var _this = this;
             // Убедимся, что activity и loader доступны
             if(_this.activity && _this.activity.loader) _this.activity.loader(true);

             //console.log("HanimeComponent: fetchCatalog() from", CATALOG_URL);

             // Инициализируем Network, если еще не инициализирован.
             if (!network && window.Lampa && Lampa.Reguest) {
                  network = new Lampa.Reguest();
                  console.log("HanimeComponent: Lampa.Reguest initialized.");
             }

             if (network) network.clear(); // Очищаем предыдущие запросы


             if(network && CATALOG_URL){
                network.native(CATALOG_URL,
                    function (data) {
                         //console.log("HanimeComponent: Catalog data received.");
                        if (data && data.metas && Array.isArray(data.metas)) {
                             if (data.metas.length > 0) {
                                _this.build(data.metas); // Переходим к построению UI
                             } else {
                                _this.empty("Каталог пуст."); // Если нет данных
                             }
                        } else {
                            _this.empty("Неверный формат данных от API."); // Неверный формат ответа
                            console.error("HanimeComponent: Invalid data format", data);
                        }
                    },
                    function (errorStatus, errorText) {
                        _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus); // Ошибка загрузки
                        console.error("HanimeComponent: Failed to load catalog", errorStatus, errorText);
                    },
                    false, // Не кэшировать ответ по URL
                    { dataType: 'json', timeout: 15000 } // Ожидаем JSON, таймаут
                );
             } else {
                 console.error("HanimeComponent: Network component or CATALOG_URL not available.");
                  _this.empty("Не удалось загрузить каталог. Ошибка инициализации сети.");
             }
        };

        // Метод для построения DOM на основе полученных данных. Вызывается в fetchCatalog().
        this.build = function (result) {
            var _this = this;
             console.log("HanimeComponent: build() with", result.length, "items.");

            // Инициализируем Scroll, если еще не инициализирован.
             if (!scroll && window.Lampa && Lampa.Scroll) {
                  scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
                  console.log("HanimeComponent: Lampa.Scroll initialized (horizontal).");
             }

             // Если Scroll инициализирован, прокручиваем на начало.
             if(scroll) scroll.minus();
             else console.warn("HanimeComponent: Scroll not initialized in build().");


             // Очищаем контейнер для карточек и массив объектов карточек перед добавлением новых.
             if (itemsContainer) itemsContainer.empty();
             else console.error("HanimeComponent: itemsContainer not available in build().");

            items = []; // Очищаем массив js-объектов карточек


            // Создаем и добавляем новые HanimeCard для каждого элемента из данных.
            if(itemsContainer && scroll && window.Lampa && Lampa.Template) { // Проверка на наличие нужных компонентов/DOM элементов
                 result.forEach(function (meta) {
                     // Создаем экземпляр HanimeCard, передавая данные и ссылку на this компонента
                    var card = new HanimeCard(meta, _this); // new HanimeCard(data, componentRef)
                     // Получаем DOM элемент карточки (jQuery объект)
                    var cardElement = card.render();

                     // Добавляем DOM элемент карточки в itemsContainer.
                     itemsContainer.append(cardElement);
                     // Сохраняем объект HanimeCard в массиве items.
                    items.push(card);
                });
                 console.log("HanimeComponent: Created", items.length, "cards.");

                 // Добавляем itemsContainer в Lampa.Scroll. Scroll обернет его своей структурой.
                scroll.append(itemsContainer);
                 //console.log("HanimeComponent: itemsContainer appended to scroll.");


                 // Вставляем рендер Scroll (который содержит itemsContainer) в items-line__body основного layout'а.
                 // scroll.render() возвращает корневой DOM Scroll.
                 // true в scroll.render(true) заставляет Scroll пересчитать свои размеры и положение.
                 if(html) html.find('.items-line__body').empty().append(scroll.render(true));
                 else console.error("HanimeComponent: Html container not available in build().");

            } else {
                console.error("HanimeComponent: Missing dependencies (itemsContainer, scroll, Lampa.Template) in build(). Skipping card creation.");
            }


             // Убираем индикатор загрузки и показываем UI активности.
             if(_this.activity && _this.activity.loader) _this.activity.loader(false);
             if(_this.activity && _this.activity.toggle) _this.activity.toggle();
             //console.log("HanimeComponent: Build completed and activity toggled.");

             // Контроллер будет настроен и первый фокус установлен в start().
        };

         // Коллбэк из HanimeCard при клике (выборе элемента).
         this.onCardClick = function(cardData) {
             console.log("HanimeComponent: Card clicked:", cardData.title);
            // Вызываем метод для загрузки деталей потока и запуска плеера.
            this.fetchStreamAndMeta(cardData.id, cardData);
         }

         // Коллбэк из HanimeCard при долгом нажатии (показ контекстного меню).
         this.showCardContextMenu = function(cardElement, cardData) {
             console.log("HanimeComponent: showCardContextMenu for", cardData.title);
             var _this = this;
             // Получаем имя текущего активного контроллера для возврата после закрытия меню.
             var enabled = (window.Lampa && Lampa.Controller && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;

             // Получаем статус закладок для элемента.
             var status  = (window.Lampa && Lampa.Favorite) ? Lampa.Favorite.check(cardData) : {};

             // Формируем пункты меню. Используем Lampa.Lang для переводов и проверяем его наличие.
             var menu_favorite = [
                 { title: (window.Lampa && Lampa.Lang) ? Lampa.Lang.translate('title_book') : 'Запланировано', where: 'book', checkbox: true, checked: status.book },
                 { title: (window.Lampa && Lampa.Lang) ? Lampa.Lang.translate('title_like') : 'Нравится', where: 'like', checkbox: true, checked: status.like },
                 { title: (window.Lampa && Lampa.Lang) ? Lampa.Lang.translate('title_wath') : 'Смотрю', where: 'wath', checkbox: true, checked: status.wath },
                 { title: (window.Lampa && Lampa.Lang) ? Lampa.Lang.translate('menu_history') : 'История', where: 'history', checkbox: true, checked: status.history },
                 { title: (window.Lampa && Lampa.Lang) ? Lampa.Lang.translate('settings_cub_status') : 'Статус', separator: true }
                 // Здесь можно добавить стандартные пункты для маркеров состояния ('look', 'viewed', 'scheduled', 'continued', 'thrown')
                 // По аналогии с standard Card.js onMenu методом и логикой в HanimeCard.updateFavoriteIcons.
             ];

             // Показываем стандартное Lampa Select (контекстное меню).
             if (window.Lampa && Lampa.Select) {
                 Lampa.Select.show({
                     title: (window.Lampa && Lampa.Lang) ? Lampa.Lang.translate('title_action') : 'Действие',
                     items: menu_favorite,
                     // Обработчик кнопки "Назад" или "Отмена" в меню
                     onBack: ()=>{
                          // Возвращаем управление контроллеру, который был активен до вызова меню.
                         if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                          console.log("HanimeComponent: Context menu back. Restored controller:", enabled);
                     },
                     // Обработка выбора чекбокса в меню (для закладок book, like, wath, history)
                     onCheck: (a)=>{
                         console.log("HanimeComponent: Context menu checked:", a.where);
                         // Переключаем статус закладки с помощью Lampa.Favorite
                         if(window.Lampa && Lampa.Favorite) Lampa.Favorite.toggle(a.where, cardData);
                         // Находим объект HanimeCard, соответствующий выбранному DOM-элементу карточки.
                         var cardObj = items.find(item => item.render(true) === cardElement[0]);
                          if(cardObj) cardObj.updateFavoriteIcons(); // Обновляем иконки на этой карточке
                     },
                     // Обработка выбора обычного пункта меню (для маркеров статуса)
                     onSelect: (a)=>{
                          console.log("HanimeComponent: Context menu selected:", a);
                          // Если выбран пункт маркера (имеет флаг 'collect')
                          if(a.collect && window.Lampa && Lampa.Favorite){
                              Lampa.Favorite.toggle(a.where, cardData); // Переключаем статус маркера
                               // Обновляем иконки на этой карточке
                               var cardObj = items.find(item => item.render(true) === cardElement[0]);
                              if(cardObj) cardObj.updateFavoriteIcons();
                          }
                          // Закрываем меню Select.
                          if(window.Lampa && Lampa.Select) Lampa.Select.close();
                           // Возвращаем управление контроллеру.
                           if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                            console.log("HanimeComponent: Context menu closed.");
                     },
                      // Метод для настройки внешнего вида пунктов меню перед их показом.
                      // Используется для добавления иконок замка для Premium функций.
                      onDraw: (item, elem) => {
                           // Проверяем, если пункт имеет флаг 'collect' (например, маркеры)
                           // и пользователь не имеет Premium аккаунта.
                           if (elem.collect && window.Lampa && Lampa.Account && !Lampa.Account.hasPremium()) {
                                // Получаем HTML шаблон иконки замка.
                                let lockIconTemplate = (window.Lampa && Lampa.Template && Lampa.Template.get) ? Lampa.Template.get('icon_lock') : null;
                                if (lockIconTemplate) {
                                     // Если шаблон замка найден, добавляем его к пункту меню.
                                     let wrap = $('<div class="selectbox-item__lock"></div>'); // Стандартный класс Lampa
                                     wrap.append($(lockIconTemplate)); // Преобразуем HTML в jQuery объект
                                     item.find('.selectbox-item__checkbox').remove(); // Удаляем стандартный чекбокс, если есть
                                     item.append(wrap); // Добавляем иконку замка
                                     // Привязываем обработчик hover:enter (Enter) к пункту с замком,
                                     // чтобы вместо выбора действия, показать окно с Premium.
                                     item.on('hover:enter', () => {
                                         if(window.Lampa && Lampa.Select) Lampa.Select.close(); // Закрываем меню
                                          if (window.Lampa && Lampa.Account) Lampa.Account.showCubPremium(); // Показываем окно с информацией о Premium
                                     });
                                } else {
                                     console.warn("Hanime Component: icon_lock template missing for Premium item draw.");
                                }
                           }
                      }
                 });
             } else {
                 console.warn("Hanime Component: Lampa.Select not available for context menu.");
                 if(window.Lampa && Lampa.Noty) Lampa.Noty.show('Компонент меню недоступен.');
             }
         };

        // Метод для прокрутки Scroll к сфокусированному элементу.
        // Вызывается из HanimeCard в ответ на событие 'hover:focus' (когда Controller устанавливает фокус).
        this.updateScrollToFocus = function(element) {
            // 'element' здесь - это jQuery объект карточки, на которой установлен фокус.
             //console.log("HanimeComponent: updateScrollToFocus() called.");
             // Убедимся, что Scroll компонент инициализирован и доступен.
            if (scroll) {
                last = element[0]; // Сохраняем ссылку на нативный DOM элемент для восстановления фокуса
                // Вызываем метод Scroll для прокрутки. element - DOM или jQuery объект, true - плавная прокрутка.
                scroll.update(element, true);
                 //console.log("HanimeComponent: Scroll updated to focused element:", last);
            } else {
                console.warn("HanimeComponent: Scroll instance not available for update.");
            }
        }

        // Метод для загрузки стрима и метаданных (для воспроизведения).
        // Вызывается из onCardClick.
        this.fetchStreamAndMeta = function (id, meta) {
             // (Ваша реализация этого метода с небольшими улучшениями и проверками Lampa)
             var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

            // Показываем лоадер активности.
             if(_this.activity && _this.activity.loader) _this.activity.loader(true);
             else console.warn("HanimeComponent: Activity or loader not available.");

            console.log("HanimeComponent: fetchStreamAndMeta for ID:", id);

            // Проверяем наличие сетевого компонента.
            if (!network) {
                console.error("HanimeComponent: Network component not available to fetch stream.");
                 if(_this.activity && _this.activity.loader) _this.activity.loader(false);
                 if(window.Lampa && Lampa.Noty) Lampa.Noty.show('Сетевой компонент недоступен для загрузки потока.');
                return;
            }

            // Параллельно загружаем данные потока и метаданные.
            Promise.all([
                new Promise((resolve, reject) => {
                    network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 }); // Загружаем поток
                }),
                // Если метаданные уже есть (из списка каталога), используем их. Иначе загружаем.
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                     network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 }); // Загружаем метаданные
                 })
            ]).then(([streamData, metaDataResponse]) => {
                 // После успешной загрузки, убираем лоадер.
                 if(_this.activity && _this.activity.loader) _this.activity.loader(false);

                // Объединяем или берем полные метаданные.
                const fullMetaData = metaDataResponse.meta || metaDataResponse;
                console.log("HanimeComponent: Stream data received:", streamData);
                console.log("HanimeComponent: Full Meta Data received:", fullMetaData);

                // Проверяем, есть ли потоки в ответе API.
                if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0]; // Берем первый поток из списка.
                    var finalStreamUrl = streamToPlay.url; // Получаем URL потока.

                    // Логика проксирования URL с highwinds-cdn.com.
                    try {
                         // Пытаемся парсить URL.
                         var url = new URL(finalStreamUrl);
                         // Если hostname содержит 'highwinds-cdn.com', оборачиваем URL адресом прокси.
                         if (url.hostname && url.hostname.includes('highwinds-cdn.com')) {
                             finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                             console.log("HanimeComponent: Stream URL proxied:", finalStreamUrl);
                         } else {
                            console.log("HanimeComponent: Stream URL does not require proxy:", finalStreamUrl);
                         }
                    } catch (e) {
                        console.error("HanimeComponent: Failed to parse or proxy stream URL:", e);
                         console.log("HanimeComponent: Using original stream URL due to error:", finalStreamUrl);
                         // Если парсинг URL вызвал ошибку, продолжаем использовать оригинальный URL.
                    }

                    // Подготавливаем объект с данными для стандартного плеера Lampa.
                    var playerObject = {
                        title: fullMetaData.name || fullMetaData.title || 'Без названия', // Название для плеера
                        url: finalStreamUrl, // URL потока (может быть проксированным)
                        poster: fullMetaData.poster || fullMetaData.background || '', // URL постера для плеера
                         // Другие поля, если нужны плееру (продолжительность, субтитры и т.д.)
                         // duration: fullMetaData.runtime ? fullMetaData.runtime * 60 : undefined, // Длительность в секундах
                         // subtitles: streamToPlay.subtitles // Массив объектов субтитров, если API их предоставил в потоке
                    };

                    // Проверяем, есть ли валидный URL потока и доступен ли Lampa Player.
                    if (playerObject.url && window.Lampa && Lampa.Player) {
                         console.log("HanimeComponent: Launching player with URL:", playerObject.url);
                         Lampa.Player.play(playerObject); // Запускаем воспроизведение
                         // Можно добавить текущий элемент в плейлист (Lampa умеет показывать плейлист)
                         Lampa.Player.playlist([playerObject]);
                         // Если нужно добавить другие потоки из data.streams в плейлист, логика здесь сложнее.

                         // Добавляем элемент в историю просмотра с помощью Lampa.Favorite (тип 'history').
                         if (fullMetaData && window.Lampa && Lampa.Favorite) {
                                const historyMeta = {
                                    id: fullMetaData.id || '', // Используем id для идентификации в истории
                                    title: fullMetaData.name || fullMetaData.title || '',
                                    poster: fullMetaData.poster || fullMetaData.background || '',
                                    runtime: fullMetaData.runtime,
                                    year: fullMetaData.year,
                                    original_name: fullMetaData.original_name || ''
                                };
                                Lampa.Favorite.add('history', historyMeta, 100); // Добавляем в историю с лимитом 100 записей.
                                console.log("HanimeComponent: Added to history:", historyMeta);
                         }

                    } else {
                         console.error("HanimeComponent: Cannot launch player - Missing stream URL or Lampa.Player.");
                         // Показываем уведомление об ошибке, используя Lampa.Noty.
                         if(window.Lampa && Lampa.Noty) Lampa.Noty.show(playerObject.url ? 'Компонент плеера недоступен.' : 'Не удалось получить ссылку на поток.');
                    }

                } else {
                     console.warn("HanimeComponent: No streams found in API data or invalid structure.");
                     // Показываем уведомление, если потоки не найдены.
                     if(window.Lampa && Lampa.Noty) Lampa.Noty.show('Потоки не найдены для этого аниме.');
                }

            }).catch(error => {
                 // Обработка ошибок при загрузке потока или метаданных.
                if(_this.activity && _this.activity.loader) _this.activity.loader(false); // Скрываем лоадер.
                console.error("HanimeComponent: Error fetching stream/meta details:", error);
                // Показываем уведомление об ошибке.
                 if(window.Lampa && Lampa.Noty) Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'));
            });
        };

        // Метод для отображения сообщения о пустом каталоге или ошибке.
        this.empty = function (msg) {
             console.log("HanimeComponent: empty() -", msg);
             // Проверяем, доступен ли стандартный Lampa компонент Empty.
             if (window.Lampa && Lampa.Empty) {
                 var empty = new Lampa.Empty({ message: msg }); // Создаем экземпляр Empty.
                 // Заменяем содержимое основного DOM-контейнера на Empty.render().
                 if(html) html.empty().append(empty.render(true));
                 else console.warn("HanimeComponent: Html container not available to show empty state.");

                 // Скрываем лоадер и показываем активность.
                 if(_this.activity && _this.activity.loader) _this.activity.loader(false);
                 if(_this.activity && _this.activity.toggle) _this.activity.toggle();
                 // Переназначаем метод start нашей активности на start Empty компонента.
                 // Это нужно, чтобы Controller правильно управлял компонентом Empty (например, кнопкой Назад).
                 this.start = empty.start;
                  console.log("HanimeComponent: Displaying empty state via Lampa.Empty.");
             } else {
                  // Fallback, если Lampa.Empty недоступен (менее вероятно после appready).
                  console.warn("HanimeComponent: Lampa.Empty not available. Using basic text fallback for empty state.");
                  if(html) html.empty().text(msg + ' (Компонент Empty недоступен в Lampa)'); // Просто добавляем текст сообщения.
                  if(_this.activity && _this.activity.loader) _this.activity.loader(false);
                 if(_this.activity && _this.activity.toggle) _this.activity.toggle();
                   // Определяем минимальный метод start дляfallback, чтобы работала только кнопка "Назад".
                   this.start = function() {
                        console.log("HanimeComponent: Fallback start() for empty state.");
                       if(window.Lampa && Lampa.Controller) {
                            Lampa.Controller.add('content', { back: this.back });
                            Lampa.Controller.toggle('content');
                       }
                   }.bind(this); // Важно привязать контекст this.
             }
        };

        // Метод создания активности. Вызывается Lampa при переходе на эту активность.
        this.create = function () {
            console.log("HanimeComponent: create()");
            // Построим основную структуру DOM компонента items-line.
            this.buildLayout();
            // Показываем индикатор загрузки Lampa.
             if(this.activity && this.activity.loader) this.activity.loader(true);
            // Начинаем загрузку данных каталога.
            this.fetchCatalog();
             console.log("HanimeComponent: create() finished. Fetching catalog initiated.");
        };

        // Метод запуска активности. Вызывается Lampa, когда активность становится видимой и должна получить фокус.
        this.start = function () {
            console.log("HanimeComponent: start()");
             // Проверяем, является ли эта активность текущей активной активностью Lampa.
            if (window.Lampa && Lampa.Activity && Lampa.Activity.active().activity !== this.activity) {
                console.log("HanimeComponent: start() - Not the active activity, skipping.");
                return;
            }
             console.log("HanimeComponent: start() - Activity is active. Setting up Lampa.Controller.");

            // Настраиваем Lampa.Controller для управления фокусом и навигацией в этой активности.
            // 'content' - это стандартное имя контроллера для основного содержимого активности.
            if (window.Lampa && Lampa.Controller && scroll) {
                 Lampa.Controller.add('content', {
                     toggle: function () {
                         console.log("HanimeComponent: Controller toggle() called.");
                         // 1. Указываем Controller-у коллекцию навигационных элементов.
                         //    Controller ищет элементы с классом '.selector' внутри контейнера, который возвращает scroll.render().
                         if(Lampa.Controller && scroll) Lampa.Controller.collectionSet(scroll.render());
                          else console.warn("HanimeComponent: Controller or scroll missing for collectionSet.");

                         // 2. Устанавливаем начальный фокус.
                         //    collectionFocus ищет элемент для фокусировки (последний || первый)
                         //    и ставит на него программный фокус, что ДОЛЖНО ВЫЗВАТЬ СОБЫТИЕ 'hover:focus' на элементе.
                         if(Lampa.Controller && scroll) Lampa.Controller.collectionFocus(last || false, scroll.render());
                         else console.warn("HanimeComponent: Controller or scroll missing for collectionFocus.");

                          console.log("HanimeComponent: Controller collectionSet/Focus called.");
                     },
                     // Обработчики навигационных кнопок пульта/стрелок
                     left: function () {
                         // Проверяем, может ли Navigator переместить фокус влево в текущей коллекции.
                         if (Navigator && Navigator.canmove && Navigator.canmove('left')) Navigator.move('left');
                          // Если нет элементов слева в текущей коллекции, переключаем на контроллер меню (если доступен).
                         else if (window.Lampa && Lampa.Controller) Lampa.Controller.toggle('menu');
                         else console.log("HanimeComponent: Cannot move left and menu controller unavailable.");
                     },
                     right: function () {
                          // Проверяем, может ли Navigator переместить фокус вправо.
                         if (Navigator && Navigator.canmove && Navigator.canmove('right')) Navigator.move('right');
                          else console.log("HanimeComponent: Cannot move right.");
                     },
                     up: function () {
                          // В горизонтальной линии, UP обычно переключает на Header.
                         if (window.Lampa && Lampa.Controller) Lampa.Controller.toggle('head');
                         else console.log("HanimeComponent: Head controller unavailable for UP.");
                     },
                     down: function () {
                          // В одной горизонтальной линии, DOWN обычно некуда переходить.
                          // Можно добавить логику переключения на следующую линию, если бы их было несколько.
                         if (Navigator && Navigator.canmove && Navigator.canmove('down')) Navigator.move('down');
                          else console.log("HanimeComponent: Cannot move down.");
                     },
                     // Назначаем наш метод back для кнопки Назад.
                     back: this.back
                 });

                 // Активируем наш контроллер 'content'. Это вызовет его метод toggle().
                 Lampa.Controller.toggle('content');
                  console.log("HanimeComponent: Controller 'content' toggled. Initial focus attempt.");

                 // Начальная прокрутка к первому элементу происходит благодаря обработчику 'hover:focus'
                 // внутри HanimeCard, который вызывает updateScrollToFocus, после того как
                 // Controller.collectionFocus устанавливает этот самый первый фокус.

             } else {
                console.error("HanimeComponent: Lampa.Controller or scroll not available in start(). Cannot setup Controller.");
                // Fallback: Если Controller недоступен, добавляем хотя бы обработчик Back к базовому контроллеру, если возможно.
                 if(window.Lampa && Lampa.Controller) {
                     Lampa.Controller.add('content', { back: this.back });
                     Lampa.Controller.toggle('content');
                 } else console.warn("HanimeComponent: Lampa.Controller unavailable, cannot add basic back handler.");
             }
        };

        // Метод, вызываемый при паузе активности (переход на другую).
        this.pause = function () {
             console.log("HanimeComponent: pause()");
             // Сохраняем ссылку на DOM-элемент, который был в фокусе, для возврата.
             // Проверяем, что Lampa.Controller доступен и наш контроллер 'content' активен.
             if(window.Lampa && Lampa.Controller && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content') {
                 last = Lampa.Controller.item() || last; // Получаем текущий элемент в фокусе. Если null (странно), оставляем предыдущее значение last.
                  console.log("HanimeComponent: Paused. Saved last focused item:", last);
             } else {
                  console.log("HanimeComponent: Pause called, but content controller not active. Last focus not saved.");
             }
        };

        // Метод, вызываемый при остановке активности (перед destroy).
        this.stop = function () {
             //console.log("HanimeComponent: stop()");
            // В Stop обычно сбрасываются таймауты/интервалы/обработчики, которые не чистятся автоматом в destroy.
            // В данном случае, большинство чистки происходит в destroy().
        };

        // Метод рендеринга. Возвращает корневой DOM-элемент компонента items-line для вставки в Lampa.
        // Lampa вызывает этот метод, когда ей нужен DOM для активности.
        this.render = function () {
             //console.log("HanimeComponent: render() called.");
             // Убедимся, что основная структура DOM построена, если не была построена ранее в create().
            if (!html) {
                 this.buildLayout();
            }
            return html; // Возвращаем jQuery-объект корневого DOM-элемента.
        };

        // Метод уничтожения. Вызывается Lampa, когда активность полностью завершается (например, закрывается).
        // Освобождает все ресурсы, чтобы избежать утечек памяти.
        this.destroy = function () {
            console.log("HanimeComponent: destroy() called.");
            // Отменяем все активные сетевые запросы.
            if(network) network.clear(); network = null;

            // Уничтожаем все экземпляры HanimeCard в массиве. Lampa.Arrays.destroy вызывает .destroy() на каждом элементе.
             if (items && window.Lampa && Lampa.Arrays) {
                 Lampa.Arrays.destroy(items);
                 console.log("HanimeComponent: Destroyed items.");
             }
            items = null; // Обнуляем ссылку на массив.

            // Уничтожаем экземпляр Lampa.Scroll. Он должен удалить свой DOM и отписаться от событий.
             if (scroll) {
                 scroll.destroy();
                 console.log("HanimeComponent: Destroyed scroll.");
             }
             scroll = null;

            // Удаляем корневой DOM-элемент компонента из документа.
             if (html) {
                 html.remove();
                 console.log("HanimeComponent: Removed html element.");
             }
            html = null; itemsContainer = null; // Обнуляем ссылки на DOM элементы. last = null; // Обнуляем ссылку на последний сфокусированный элемент.


            // Очищаем и удаляем наш Controller из Lampa.
            if (window.Lampa && Lampa.Controller) {
                 // Если наш контроллер ('content') сейчас активен, сначала очищаем его коллекцию элементов
                 // и можем попытаться вернуться к базовому контроллеру ('app'), прежде чем удалять наш.
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content') {
                      Lampa.Controller.collectionSet([]); // Снимаем элементы с контроллера.
                      // Опционально: Lampa.Controller.toggle('app'); // Возвращаемся в основной контроллер.
                       console.log("HanimeComponent: Controller collection cleared.");
                 }
                 // Удаляем регистрацию нашего контроллера по имени.
                 Lampa.Controller.remove('content');
                  console.log("HanimeComponent: Content controller removed.");
            } else console.warn("HanimeComponent: Lampa.Controller not available for cleanup in destroy.");

            console.log("HanimeComponent: destroy() finished. All resources released.");
        };

        // Обработчик кнопки "Назад".
        // Привязан к Controller.
        this.back = function () {
             console.log("HanimeComponent: back() called. Calling Activity.backward().");
             // Используем стандартный метод Lampa.Activity для возврата к предыдущей активности в стеке.
             if(window.Lampa && Lampa.Activity && Lampa.Activity.backward) Lampa.Activity.backward();
             else console.warn("HanimeComponent: Lampa.Activity not available or backward method missing for navigation.");
        };
    }

    // --- Функция инициализации плагина. Входная точка выполнения скрипта. ---
    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() invoked.");

        // Устанавливаем глобальный флаг, чтобы плагин не инициализировался дважды.
        // Проверяем флаг в самом начале.
        if (window.plugin_hanime_catalog_ready) {
             console.log("Hanime Plugin: Global plugin flag already set. Skipping initialization.");
             return;
        }
        // Не устанавливаем флаг сразу, устанавливаем его ПОСЛЕ успешного выполнения initializeLampaDependencies.


        // --- Логика инициализации, зависящая от Lampa. Выполняется после события 'appready'. ---
        function initializeLampaDependencies() {
             console.log("Hanime Plugin: initializeLampaDependencies() called (Lampa appready or fallback delay completed).");

             // Внутри этой функции мы должны иметь доступ к основным компонентам Lampa.
             // Выполняем проверки наличия критических компонентов Lampa.
             if (!window.Lampa || !Lampa.Template || !Lampa.Component || !Lampa.Activity || !Lampa.Controller || !window.$) {
                  console.error("Hanime Plugin: CRITICAL: Required Lampa components not available after waiting for appready. Initialization failed.");
                  // Показываем сообщение об ошибке пользователю, если возможно.
                  if(window.Lampa && Lampa.Noty) Lampa.Noty.show('Ошибка инициализации плагина: Компоненты Lampa недоступны.', 7000);
                  return; // Прерываем инициализацию, если нет критически важных компонентов.
             }
             console.log("Hanime Plugin: Basic required Lampa components checked OK.");


             // --- Устанавливаем глобальный флаг ПОСЛЕ проверки наличия Lampa. ---
             // Это более безопасно, чем устанавливать его до waitForLampaReady().
              if (!window.plugin_hanime_catalog_ready) {
                 window.plugin_hanime_catalog_ready = true;
                 console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag set successfully.");
              } else {
                   console.warn("Hanime Plugin: Plugin flag was set by another instance? Unexpected behavior.");
                   return; // Возможно, двойной запуск, прерываем.
              }


             // --- 1. Определение СТАНДАРТНЫХ ВНУТРЕННИХ шаблонов Lampa (как fallback). ---
             // Используем Lampa.Template.add напрямую. Не нужны проверки .has().
             console.log("Hanime Plugin: Adding standard template fallbacks...");
             if (Lampa.Template) { // Убедимся еще раз, что Template доступен.
                 Lampa.Template.add('card_vote_temp', '<div class="card__vote hanime-card__vote">{vote}</div>'); // Шаблон для рейтинга
                 Lampa.Template.add('card_quality_temp', '<div class="card__quality hanime-card__quality"><div>{quality}</div></div>'); // Шаблон для качества
                 Lampa.Template.add('card_year_temp', '<div class="card__age hanime-card__age">{year}</div>'); // Шаблон для года
                 Lampa.Template.add('card_type_temp', '<div class="card__type hanime-card__type">{type}</div>'); // Шаблон для типа (TV/Movie)
                 // Шаблон иконки замка (используется в контекстном меню для Premium)
                 Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
                  console.log("Hanime Plugin: Standard template fallbacks added.");
             }


             // --- 2. Определение ВАШЕГО основного шаблона карточки 'hanime-card'. ---
             // Он использует стандартные внутренние шаблоны, определенные выше.
             console.log("Hanime Plugin: Adding hanime-card template...");
             if (Lampa.Template) { // Убедимся, что Template доступен.
                 Lampa.Template.add('hanime-card', `
                     <div class="hanime-card card selector layer--visible layer--render"> <!-- Основные классы Lampa для карточек -->
                         <div class="card__view hanime-card__view"> <!-- Область просмотра (постер) -->
                             <img src="./img/img_load.svg" class="card__img hanime-card__img" alt="{title}" loading="lazy" /> <!-- Картинка -->
                             <div class="card__icons hanime-card__icons"> <!-- Контейнер для иконок (закладки, история) -->
                                 <div class="card__icons-inner hanime-card__icons-inner"></div> <!-- Внутренний контейнер -->
                             </div>
                             <!-- Вставляем внутренние стандартные блоки, используя Lampa.Template.get -->
                              ${Lampa.Template.get('card_vote_temp', { vote: '{vote}' })} <!-- Шаблон рейтинга -->
                              ${Lampa.Template.get('card_quality_temp', { quality: '{quality}' })} <!-- Шаблон качества -->
                              ${Lampa.Template.get('card_type_temp', { type: '{type}' })} <!-- Шаблон типа (TV/Movie) -->
                         </div>
                         <div class="card__title hanime-card__title">{title}</div> <!-- Заголовок под постером -->
                         ${Lampa.Template.get('card_year_temp', { year: '{year}' })} <!-- Год под заголовком -->
                     </div>
                 `);
                  console.log("Hanime Plugin: HanimeCard template added.");
             }


             // --- 3. Добавление CSS Стили. ---
             // Полностью ваши кастомные стили, адаптированные под стандартные классы Lampa.
             // Определяют отступы, размеры, стили фокуса и вид элементов карточки.
             console.log("Hanime Plugin: Adding CSS styles...");
             var style = `
                 /* Стили для контейнера линии */
                 .items-line { padding: 1em 0; } /* Отступ сверху/снизу */
                 .items-line__head { padding: 0 3.5em 1em 3.5em; } /* Отступы заголовка */
                 .items-line__body { padding: 0 2.5em; } /* Горизонтальные отступы внутри Scroll */

                 /* Базовый стиль для КАРТОЧКИ. Применяется к элементам с классом .card (наш hanime-card его имеет) */
                 .card {
                     width: 185px; /* Стандартная ширина постера */
                     height: auto; /* Высота определяется содержимым */
                     margin: 0 0.5em; /* Горизонтальные отступы между карточками */
                     border-radius: 0.5em;
                     overflow: hidden;
                     transition: transform 0.2s ease, box-shadow 0.2s ease; /* Плавное изменение при фокусе */
                     position: relative;
                     box-sizing: border-box;
                     background-color: rgba(255,255,255,0.05); /* Фон при загрузке/нет картинки */
                     text-align: center; /* Выравнивание текста внизу */
                     display: inline-block; /* Важно для горизонтального ряда */
                     vertical-align: top; /* Выравнивание по верху в ряду */
                 }

                 /* СТАНДАРТНЫЙ СТИЛЬ ФОКУСА Lampa. Применяется к элементам с классом .selector (наш .card его имеет). */
                 .card.selector:focus {
                      transform: scale(1.05); /* Увеличение */
                     /* Свечение. Используйте цвета, принятые в Lampa (например, оранжевый, как на скриншотах). */
                      box-shadow: 0 0 15px rgba(255, 165, 0, 0.8); /* Пример оранжевого свечения */
                     z-index: 5; /* Фокусированный элемент должен быть поверх других */
                     border-color: transparent; /* Убираем границу при фокусе, если она была по умолчанию */
                 }
                  /* Скрытие стандартного браузерного outline при программном фокусе. */
                  .card.selector.focus:not(.native) { outline: none; }


                 /* Стили для ОБЛАСТИ ПРОСМОТРА КАРТИНКИ. Класс .card__view. */
                 .card__view {
                     position: relative;
                     width: 100%; /* Занимает всю ширину родительской .card */
                     height: 270px; /* Фиксированная высота для области постера */
                     border-radius: 0.5em;
                     overflow: hidden;
                     background-color: rgba(255,255,255,0.05); /* Фон загрузки */
                 }

                 /* Стили для самой КАРТИНКИ. Класс .card__img. */
                 .card__img {
                     position: absolute; /* Позиционирование внутри .card__view */
                     width: 100%; height: 100%;
                     object-fit: cover; /* Масштабирование с сохранением пропорций (обрезает) */
                     border-radius: 0.5em;
                     opacity: 0.9; /* Немного затемняем картинку по умолчанию */
                     transition: opacity 0.2s ease; /* Плавное появление */
                 }
                 .card--loaded .card__img { opacity: 1; } /* Полная видимость, когда картинка загружена */


                 /* Стили для КОНТЕЙНЕРА ИКОНОК (закладки, история). Класс .card__icons. */
                 .card__icons { position: absolute; top: 0.5em; right: 0.5em; z-index: 2; } /* Положение справа сверху */
                 .card__icons-inner { display: flex; flex-direction: column; gap: 0.3em; } /* Вертикальный столбец иконок */

                 /* Стили для ОТДЕЛЬНОЙ ИКОНКИ. Класс .card__icon. */
                 .card__icon {
                      width: 1em; height: 1em; /* Размер иконки */
                     background-color: rgba(0,0,0,0.5); /* Полупрозрачный фон */
                      padding: 0.3em; border-radius: 50%; /* Круглая форма */
                     /* Сами иконки (SVG, font-icons) определяются через классы типа .icon--book в других стилях Lampa */
                 }

                 /* Стили для РЕЙТИНГА. Класс .card__vote. */
                 .card__vote {
                     position: absolute; bottom: 0.5em; left: 0.5em; /* Положение слева снизу */
                     background-color: rgba(0,0,0,0.7); color: #fff;
                     padding: 0.2em 0.4em; border-radius: 0.3em;
                     font-size: 0.9em; font-weight: bold; z-index: 2;
                 }

                 /* Стили для КАЧЕСТВА. Класс .card__quality. */
                 .card__quality {
                    position: absolute; bottom: 0.5em; right: 0.5em; /* Положение справа снизу */
                     background-color: rgba(0,0,0,0.7); color: #fff;
                     padding: 0.2em 0.4em; border-radius: 0.3em;
                     font-size: 0.9em; z-index: 2;
                 }

                 /* Стили для ТИПА (TV/Movie). Класс .card__type. */
                 .card__type {
                      position: absolute; top: 0.5em; left: 0.5em; /* Положение слева сверху */
                     background-color: rgba(0,0,0,0.7); color: #fff;
                     padding: 0.2em 0.4em; border-radius: 0.3em;
                     font-size: 0.9em; font-weight: bold; z-index: 2;
                 }

                 /* Стили для ЗАГОЛОВКА. Класс .card__title. */
                 .card__title {
                     margin-top: 0.5em;
                     padding: 0 0.2em;
                     font-size: 1em; font-weight: bold;
                     white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                     text-align: center; /* Выравнивание по центру */
                     color: #fff;
                 }

                 /* Стили для ГОДА. Класс .card__age. */
                 .card__age {
                    text-align: center; /* Выравнивание по центру */
                    font-size: 0.9em;
                    color: rgba(255, 255, 255, 0.7); /* Цвет текста (более тусклый) */
                 }

                 /* Стили для МАРКЕРА СОСТОЯНИЯ (Смотрю, Просмотрено и т.п.). Класс .card__marker. */
                  .card__marker {
                       position: absolute; top: 0; left: 0; right: 0; /* Растянут по верхней части .card__view */
                       background-color: rgba(0,0,0,0.7); /* Полупрозрачный фон */
                       color: #fff; text-align: center; font-size: 0.8em;
                       padding: 0.2em; z-index: 3; /* Выше иконок и данных на постере */
                  }
                  /* Пример стилей маркеров по типу статуса */
                   .card__marker--viewed { background-color: rgba(0,128,0,0.7); } /* Green */
                   .card__marker--continued { background-color: rgba(0,0,255,0.7); } /* Blue */
                   .card__marker--look, .card__marker--scheduled { background-color: rgba(255,165,0,0.7); } /* Orange/Yellow */
                   .card__marker--thrown { background-color: rgba(255,0,0,0.7); } /* Red */


                 /* Стили для ИКОНКИ В МЕНЮ. Класс .menu__ico svg. */
                .menu__ico svg { width: 1.5em; height: 1.5em; } /* Размер иконки меню */
             `;
             // Добавляем стили на страницу. Используем Lampa.Template для создания элемента style, затем jQuery для добавления в head.
             if (window.Lampa && Lampa.Template && window.$) {
                 Lampa.Template.add('hanime-style', `<style>${style}</style>`);
                 $('head').append(Lampa.Template.get('hanime-style', {}, true));
                 console.log("Hanime Plugin: CSS styles added to HEAD.");
             } else {
                 console.error("Hanime Plugin: Cannot add CSS styles. Lampa.Template or jQuery not available.");
                 // Fallback: попытаться добавить style тег напрямую, если jQuery хотя бы есть
                  if (window.$) {
                     try {
                        $('<style>').text(style).appendTo('head');
                        console.log("Hanime Plugin: CSS styles added using jQuery fallback.");
                     } catch (e) {
                        console.error("Hanime Plugin: Error adding CSS styles with jQuery fallback:", e);
                     }
                  } else {
                      console.error("Hanime Plugin: Cannot add CSS styles. jQuery is missing.");
                  }
             }


             // --- 4. Регистрируем ВАШ основной компонент каталога в Lampa Component Manager. ---
             // Делаем это после того, как все шаблоны и стили определены.
             console.log("Hanime Plugin: Registering HanimeComponent...");
             if (window.Lampa && Lampa.Component) { // Проверяем наличие Component Manager
                 Lampa.Component.add('hanime_catalog', HanimeComponent);
                 console.log("Hanime Plugin: Component 'hanime_catalog' registered.");
             } else {
                 console.error("Hanime Plugin: Lampa.Component not available. Cannot register component.");
             }


             // --- 5. Добавляем пункт меню в основное меню Lampa. ---
             // Эта функция вызывается в самом конце initializeLampaDependencies.
             addMenuItem();
              console.log("Hanime Plugin: Menu item addition logic called from initializeLampaDependencies.");

              console.log("Hanime Plugin: initializeLampaDependencies() finished successfully.");
        }


        // Отдельная функция для добавления пункта меню. Вызывается из initializeLampaDependencies().
        function addMenuItem() {
             console.log("Hanime Plugin: addMenuItem() called.");

             // Проверяем наличие ВСЕХ необходимых компонентов и DOM структуры Lampa для добавления меню.
             if (!window.Lampa || !Lampa.Activity || !Lampa.Controller || !window.$ || !Lampa.Component || !$('.menu .menu__list').length) {
                  console.warn("Hanime Plugin: Cannot add menu item. Required Lampa components (Activity, Controller, jQuery, menu DOM) not fully available.");
                  return; // Выходим, если что-то критическое отсутствует.
             }

             // Проверяем, что наш КОМПОНЕНТ зарегистрирован, прежде чем ссылаться на него.
             // Это более корректная проверка, чем Template.has('hanime_catalog').
             if (!(window.Lampa && Lampa.Component && typeof Lampa.Component.get === 'function' && Lampa.Component.get('hanime_catalog'))) {
                 console.warn("Hanime Plugin: Component 'hanime_catalog' not found in Lampa.Component. Skipping menu item.");
                  return; // Выходим, если наш компонент не зарегистрирован (по какой-то причине).
             }


             // Проверка на случай дублирования элемента меню по тексту (просто для чистоты).
             if ($('.menu .menu__list .menu__text:contains("Hanime Catalog")').length > 0) {
                 console.log("Hanime Plugin: Menu item with same text already exists. Skipping addMenuItem.");
                 return;
             }

             console.log("Hanime Plugin: Creating menu item DOM element.");
             // Создаем DOM-элемент пункта меню, используя стандартные классы Lampa и класс 'selector'.
            var menu_item = $(`
                <li class="menu__item selector"> <!-- menu__item и selector - стандартные классы -->
                    <div class="menu__ico"> <!-- Контейнер иконки -->
                        <!-- Ваша иконка SVG (вставлена прямо в HTML) -->
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">Hanime Catalog</div> <!-- Текст пункта меню -->
                </li>
            `);

            // Привязываем обработчик стандартного события Lampa hover:enter (выбор/активация пункта меню).
            menu_item.on('hover:enter', function () {
                 console.log("Hanime Plugin: Menu item activated ('hover:enter'). Pushing activity 'hanime_catalog'.");
                 // При активации пункта меню запускаем нашу новую активность, используя Lampa.Activity.push.
                Lampa.Activity.push({
                    url: '', // Опциональный URL для роутинга/ссылок.
                    title: 'Hanime Catalog', // Заголовок для отображения в шапке активности.
                    component: 'hanime_catalog', // Имя нашего ЗАРЕГИСТРИРОВАННОГО компонента.
                    page: 1 // Стартовая страница (для пагинации в компоненте).
                });
            });

            // Находим стандартный список меню Lampa (первый элемент '.menu .menu__list')
            // и добавляем наш пункт в конец списка.
            var menuList = $('.menu .menu__list').eq(0);
             if (menuList.length > 0) {
                 menuList.append(menu_item); // Добавляем DOM-элемент пункта меню.
                 console.log("Hanime Plugin: Menu item added to DOM.");
             } else {
                 console.error("Hanime Plugin: Could not find Lampa menu list DOM element to append menu item.");
                 // Возможно, DOM Lampa меню еще не создан? (менее вероятно после appready)
                 // Можно попробовать добавить пункт меню с небольшой задержкой.
                  // setTimeout(function() {
                  //      var menuListRetry = $('.menu .menu__list').eq(0);
                  //      if (menuListRetry.length > 0) {
                  //           menuListRetry.append(menu_item);
                  //           console.log("Hanime Plugin: Menu item added on retry.");
                  //      } else {
                  //           console.error("Hanime Plugin: Menu list still not found after retry.");
                  //      }
                  // }, 1000); // Повторная попытка через 1 секунду.
             }
        }


        // --- ТОЧКА ВХОДА СКРИПТА ПЛАГИНА: ОЖИДАНИЕ ГОТОВНОСТИ LAMPA. ---
        console.log("Hanime Plugin: Setting up appready listener...");
         // Проверяем, доступны ли Lampa и ее Listener компонент для подписки на событие.
         if (window.Lampa && Lampa.Listener && Lampa.Listener.follow) {
             Lampa.Listener.follow('app', function (e) {
                 // Обработчик события 'app'. Проверяем, что это событие типа 'ready'.
                 if (e.type === 'ready') {
                     console.log("Hanime Plugin: Lampa 'appready' event received.");
                     // Когда Lampa полностью готова, вызываем нашу основную функцию инициализации плагина.
                     initializeLampaDependencies();
                 }
             });
             console.log("Hanime Plugin: Subscribed to Lampa 'app' event.");
         } else if (window.appready) {
             // Fallback: Если Lampa уже поставила флаг appready до того, как мы успели подписаться (может быть, при очень быстрой загрузке),
             // но Listener недоступен или сломан, пытаемся вызвать инициализацию напрямую.
              console.warn("Hanime Plugin: Lampa 'appready' flag already set, but Lampa.Listener is missing. Calling initialization directly as fallback.");
              initializeLampaDependencies();

         } else {
             // Критический fallback: Если Lampa не установила флаг appready, и Listener недоступен,
             // мы не можем надежно дождаться готовности Lampa. Попытаемся инициализировать через небольшую задержку,
             // надеясь, что Lampa все же загрузится. Это самый ненадежный вариант.
             console.error("Hanime Plugin: Lampa.Listener not available AND appready flag not set. Cannot reliably wait. Attempting delayed initialization as unreliable fallback.");
              // Инициализируем через 500 мс. Это может все равно завершиться ошибками, если Lampa не полностью загружена.
             setTimeout(initializeLampaDependencies, 500);
         }

         console.log("Hanime Plugin: startPlugin() finished listener setup.");
    }

    // Вызываем главную функцию старта плагина при загрузке файла скрипта.
    startPlugin();

})();
