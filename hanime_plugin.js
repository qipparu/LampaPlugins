(function () {
    'use strict';

    // --- Константы и общие настройки ---
    var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
    // URL для получения последних добавлений (используется в HanimeComponent)
    var CATALOG_URL_LATEST = API_BASE_URL + "/catalog/movie/newset.json";
    // Предполагаем, что ваш API имеет URL для получения ВСЕХ или PAGINATED элементов.
    // ЗАМЕНИТЕ ЭТОТ URL НА РЕАЛЬНЫЙ URL ВСЕГО КАТАЛОГА ВАШЕГО API.
    var CATALOG_URL_ALL = API_BASE_URL + "/catalog/movie/all.json"; // <<< Замените на реальный URL всего каталога
    // Если API поддерживает только пагинацию (например, CATALOG_URL?page=1), то HanimeFullCatalogComponent должен будет обрабатывать пагинацию.
    var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
    var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";
    var PROXY_BASE_URL = "http://77.91.78.5:3000";


    // --- HanimeCard компонента ---
    // Создает и управляет DOM-элементом одной карточки.
    // Использует только стандартные классы Lampa.
    function HanimeCard(data, componentRef) {
        // Обрабатываем данные из вашего API для соответствия стандартным полям Lampa-подобных карточек.
        var processedData = {
            id: data.id,
            title: data.name || data.title || 'Без названия',
            poster_path: data.poster || data.img, // URL картинки (имя поля Lampa)
            vote_average: data.vote_average || data.vote || null,
            quality: data.quality || data.release_quality || null,
            release_year: ((data.year || data.release_date || '') + '').slice(0, 4),
            type: data.first_air_date ? 'tv' : 'movie',
            original_name: data.original_name
        };

        // Получаем HTML-код базовой структуры карточки из шаблона 'hanime-card'.
        // Шаблон должен использовать ТОЛЬКО стандартные классы Lampa и простую структуру.
        var cardTemplate = Lampa.Template.get('hanime-card', {
            img: processedData.poster_path, // Передаем только поля, которые используются в самом шаблоне.
            title: processedData.title
            // Другие детали (рейтинг, качество и т.п.) добавляются динамически.
        });

        var cardElement = $(cardTemplate); // Создаем jQuery-объект DOM-элемента.


        // --- Методы экземпляра HanimeCard ---

        // Добавление иконки (закладка, история).
        this.addicon = function(name) {
            var iconsContainer = cardElement.find('.card__icons-inner');
            if (iconsContainer.length) {
                var icon = document.createElement('div');
                icon.classList.add('card__icon'); // Стандартный класс Lampa
                icon.classList.add('icon--'+name); // Специфичный класс
                iconsContainer.append(icon);
                //console.log("HanimeCard: Added icon:", name);
            } // else console.warn("HanimeCard: Could not find .card__icons-inner to add icon:", name);
        }

         // Добавление/обновление деталей (рейтинг, качество, тип, год) динамически.
         // Вызывается после создания DOM-элемента карточки.
         this.addDetails = function() {
             //console.log("HanimeCard: addDetails() for", processedData.title);
              var viewElement = cardElement.find('.card__view');

             // Проверяем наличие нужных элементов в DOM before manipulating
             if (!(viewElement.length)) {
                  console.warn("HanimeCard: addDetails - .card__view not found for", processedData.title);
                 return;
             }


             // Рейтинг: найти/создать .card__vote и заполнить
             let voteElement = cardElement.find('.card__vote');
             if (processedData.vote_average > 0 && voteElement.length) { // Проверяем данные и наличие элемента в шаблоне
                 voteElement.text(parseFloat(processedData.vote_average).toFixed(1));
                 // В стандартном Card.js vote element может создаваться, если отсутствует.
                 // В данном случае полагаемся на его наличие в шаблоне.
             } else if (voteElement.length) { // Если элемент есть, но данных нет
                  voteElement.remove(); // Удаляем его
             }

             // Качество: найти/создать .card__quality и заполнить
             let qualityElement = cardElement.find('.card__quality');
             if (processedData.quality && qualityElement.length) { // Проверяем данные и наличие элемента
                  let qualityTextElement = qualityElement.find('div');
                  if(qualityTextElement.length) qualityTextElement.text(processedData.quality); // Устанавливаем текст
             } else if (qualityElement.length) {
                  qualityElement.remove(); // Удаляем
             }

             // Тип (TV/Movie): найти/создать .card__type и заполнить
             let typeElement = cardElement.find('.card__type');
             if (processedData.type && viewElement.length) { // Проверяем данные и наличие контейнера
                 if(!typeElement.length) { // Если тип элемент отсутствует в шаблоне, можно динамически добавить
                     typeElement = $('<div class="card__type"></div>');
                     viewElement.append(typeElement);
                     console.warn("HanimeCard: .card__type added dynamically for", processedData.title);
                 }
                  typeElement.text(processedData.type.toUpperCase()); // Устанавливаем текст (TV, MOVIE)
             } else if (typeElement.length) {
                  typeElement.remove(); // Удаляем
             }

             // Год: найти .card__age и заполнить
             let ageElement = cardElement.find('.card__age'); // Этот элемент ДОЛЖЕН БЫТЬ в шаблоне, не в .card__view!
             if (ageElement.length) {
                  if (processedData.release_year && processedData.release_year !== '0000') {
                      ageElement.text(processedData.release_year).show(); // Устанавливаем текст и показываем
                  } else {
                       ageElement.text('').hide(); // Скрываем, если года нет
                  }
             } else {
                 // Можно добавить fallback на создание элемента, но лучше включать в шаблон
                  console.warn("HanimeCard: .card__age element not found in template for", processedData.title, processedData.release_year);
                  if (processedData.release_year && processedData.release_year !== '0000') {
                     // Добавляем динамически, если отсутствует в шаблоне и данные есть
                      let newAgeElement = $('<div class="card__age"></div>').text(processedData.release_year);
                       let titleElement = cardElement.find('.card__title');
                       if(titleElement.length) titleElement.after(newAgeElement); // Добавляем после заголовка
                       else cardElement.append(newAgeElement); // Добавляем в конец, если заголовка нет
                       console.warn("HanimeCard: Added .card__age dynamically as not found in template.");
                  }
             }

             //console.log("HanimeCard: addDetails() completed for", processedData.title);
         }


        // Обновление иконок закладок и маркера состояния.
        // Вызывается из .update() и .onVisible().
        this.updateFavoriteIcons = function() {
             //console.log("HanimeCard: updateFavoriteIcons() for", processedData.title);
             // Очищаем предыдущие иконки и маркеры.
            cardElement.find('.card__icons-inner').empty();
            cardElement.find('.card__marker').remove();

             var status = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(processedData) : {};
             //if(Object.keys(status).length === 0 && window.Lampa && Lampa.Favorite) console.warn("HanimeCard: Failed to get favorite status for", processedData.title, "Lampa.Favorite may not be fully available. Data:", processedData);


            // Добавляем стандартные иконки на основе статуса закладки.
            if (status.book) this.addicon('book');     // Запланировано
            if (status.like) this.addicon('like');     // Нравится
            if (status.wath) this.addicon('wath');     // Просматриваю
             // Проверяем статус просмотра через Timeline (если есть и watched метод доступен)
            if (status.history || (window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched === 'function' && Lampa.Timeline.watched(processedData))) this.addicon('history'); // Из истории или Просмотрено полностью


             var marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];
             var activeMarker = marks.find(m => status[m]);

             if (activeMarker) {
                 var markerElement = cardElement.find('.card__marker');
                 if (!markerElement.length) { // Если элемента маркера нет, создаем его со стандартным классом.
                     markerElement = $('<div class="card__marker"><span></span></div>');
                      var viewElement = cardElement.find('.card__view'); // Добавляем его в область view.
                      if(viewElement.length) viewElement.append(markerElement);
                      else console.warn("HanimeCard: Could not find .card__view to add .card__marker.");
                 }
                 // Устанавливаем текст маркера (перевод).
                 markerElement.find('span').text(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? Lampa.Lang.translate('title_' + activeMarker) : activeMarker);
                 // Добавляем класс типа маркера для стилизации.
                 markerElement.removeClass(marks.map(m => 'card__marker--' + m).join(' '))
                             .addClass('card__marker--' + activeMarker);
             } else {
                 cardElement.find('.card__marker').remove(); // Удаляем маркер, если не активен.
             }
             //console.log("HanimeCard: updateFavoriteIcons() completed.");
        };

        // Метод вызывается Lampa, когда карточка становится видимой (для отложенной загрузки).
        this.onVisible = function() {
             //console.log("HanimeCard: onVisible() for", processedData.title);
             var imgElement = cardElement.find('.card__img'); // Находим стандартный img элемент.

             // Проверяем, нужно ли загружать картинку.
             if (imgElement.length && (!imgElement.attr('src') || imgElement.attr('src').includes('img_load.svg'))) {
                 var src = processedData.poster_path; // URL картинки.

                 if (!src) src = './img/img_broken.svg'; // Fallback.

                 // Загрузка с кэшированием Lampa.
                 if(window.Lampa && Lampa.ImageCache && typeof Lampa.ImageCache.read === 'function' && typeof Lampa.ImageCache.write === 'function') {
                      if(!Lampa.ImageCache.read(imgElement[0], src)) {
                          imgElement[0].onload = () => { cardElement.addClass('card--loaded'); Lampa.ImageCache.write(imgElement[0], imgElement[0].src); /*console.log("Image loaded:", src);*/ };
                          imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error:', src); imgElement.attr('src', './img/img_broken.svg'); if(window.Lampa && Lampa.Tmdb && typeof Lampa.Tmdb.broken === 'function') Lampa.Tmdb.broken(); };
                          imgElement.attr('src', src);
                      } else {
                         cardElement.addClass('card--loaded');
                         //console.log("Image from cache:", src);
                      }
                 } else {
                     // Fallback без кэша.
                     console.warn("Hanime Plugin: Lampa.ImageCache not available.");
                      imgElement[0].onload = () => { cardElement.addClass('card--loaded'); console.log("Image loaded (basic):", src); };
                     imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error (basic):', src); imgElement.attr('src', './img/img_broken.svg'); };
                     imgElement.attr('src', src);
                 }
             } //else console.log("Image already loaded.");

            this.updateFavoriteIcons(); // Обновляем иконки при видимости.
        }

        // Метод первоначальной настройки Card после создания DOM.
        // Навешиваем стандартные события Lampa.
        this.create = function(){
             //console.log("HanimeCard: create() for", processedData.title);

             if (cardElement.data('created')) return; // Избегаем повторного вызова.

             if (typeof cardElement.on === 'function') {
                cardElement.on('hover:focus', function () {
                     //console.log("HanimeCard: hover:focus on", processedData.title);
                     if (componentRef && componentRef.updateScrollToFocus && typeof componentRef.updateScrollToFocus === 'function') {
                          componentRef.updateScrollToFocus(cardElement);
                     }
                     this.update();
                }.bind(this));

                 cardElement.on('hover:enter', function () {
                    //console.log("HanimeCard: hover:enter on", processedData.title);
                     if (componentRef && componentRef.onCardClick && typeof componentRef.onCardClick === 'function') {
                         componentRef.onCardClick(processedData);
                     }
                }.bind(this));

                cardElement.on('hover:long', function(){
                     //console.log("HanimeCard: hover:long on", processedData.title);
                     if (componentRef && componentRef.showCardContextMenu && typeof componentRef.showCardContextMenu === 'function') {
                          componentRef.showCardContextMenu(cardElement, processedData);
                     }
                 }.bind(this));
             } // else console.warn("HanimeCard: jQuery on() not available.");


            // Привязка стандартного события Lampa 'visible' к нативному элементу.
             this.card = cardElement[0];
             if (this.card && typeof this.card.addEventListener === 'function') {
                this.card.addEventListener('visible', this.onVisible.bind(this));
                //console.log("HanimeCard: Attached 'visible' event listener.");
             } //else console.warn("HanimeCard: Cannot attach 'visible' listener.");


            // Динамически добавляем детали (рейтинг, качество, тип, год) и обновляем иконки/маркеры.
             setTimeout(() => { // С небольшой задержкой для готовности DOM.
                  this.addDetails();
                  this.updateFavoriteIcons(); // updateFavoriteIcons() вызывает update() для некоторых сценариев в стандартной карте, но здесь разделил логику.
                  // В стандартном Card.js update() вызывал watched(), что связано с Timeline.
                  // Если нужен watch status bar, его логику нужно добавить сюда или в updateDetails.
                  // if(window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched_status === 'function') Lampa.Timeline.watched_status(cardElement, processedData);

             }, 0);

             cardElement.data('created', true);
             //console.log("HanimeCard: create() finished.");
        }

        // Метод обновления состояния (иконки, маркер). Вызывается из hover:focus.
        this.update = function(){
             //console.log("HanimeCard: update() called for", processedData.title);
             this.updateFavoriteIcons();
             // Обновление watch status bar, если есть
             // if(window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched_status === 'function') Lampa.Timeline.watched_status(cardElement, processedData);
        }

        // Метод рендеринга.
        this.render = function(js){
             //console.log("HanimeCard: render() called.");
             if (!cardElement.data('created')) {
                 this.create();
             }
            return js ? cardElement[0] : cardElement; // Возвращаем нативный DOM или jQuery объект
        }

        // Метод уничтожения.
        this.destroy = function(){
             //console.log("HanimeCard: destroy() for", processedData.title);
             if(this.card && typeof this.card.removeEventListener === 'function' && this.onVisible) this.card.removeEventListener('visible', this.onVisible.bind(this));
             if(cardElement && typeof cardElement.remove === 'function') cardElement.remove();
             processedData = null; cardElement = null; this.card = null; componentRef = null;
             //console.log("HanimeCard: destroy() completed.");
        }

    }


    // --- HanimeComponent (Компонент одной горизонтальной линии "Последние добавленные") ---
    function HanimeComponent(componentObject) {
        var network = null;
        var scroll = null;

        var items = []; // Массив объектов HanimeCard
        var html = null; // Root DOM (.items-line)
        var itemsContainer = null; // Container for cards (.items-cards)

        var active = 0;
        var last = null; // Last focused DOM element

        // Используем URL для "Последние добавленные"
        var CATALOG_URL = CATALOG_URL_LATEST;


        this.buildLayout = function() {
             //console.log("HanimeComponent: buildLayout()");
            // Структура items-line со стандартными классами И КНОПКОЙ "ЕЩЕ"
            html = $(`
                <div class="items-line layer--visible layer--render items-line--type-cards">
                    <div class="items-line__head">
                        <div class="items-line__title">Последние добавленные</div>
                         <div class="items-line__more selector">Еще</div> <!-- Добавляем кнопку Еще -->
                    </div>
                    <div class="items-line__body">
                        <!-- Scroll here -->
                    </div>
                </div>
            `);
             itemsContainer = $('<div class="items-cards"></div>');
             //console.log("HanimeComponent: buildLayout completed. Including 'Еще' button.");
        };


        this.fetchCatalog = function () {
             // (Ваша реализация fetchCatalog без изменений, загружает CATALOG_URL_LATEST)
              var _this = this;
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeComponent: Activity loader not available in fetchCatalog.");

             console.log("HanimeComponent: fetchCatalog() - Starting request to", CATALOG_URL);

             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeComponent: Lampa.Reguest initialized.");
             }

             if (network && typeof network.clear === 'function') network.clear();
             else console.warn("HanimeComponent: Network clear method not available.");

             if(network && CATALOG_URL && typeof network.native === 'function'){
                network.native(CATALOG_URL,
                    function (data) {
                        //console.log("HanimeComponent: Catalog data received.");
                        if (data && data.metas && Array.isArray(data.metas)) {
                             if (data.metas.length > 0) {
                                _this.build(data.metas);
                             } else {
                                _this.empty("Каталог пуст.");
                             }
                        } else {
                            _this.empty("Неверный формат данных от API.");
                            console.error("HanimeComponent: Invalid data format from API.", data);
                        }
                    },
                    function (errorStatus, errorText) {
                        _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                        console.error("HanimeComponent: Failed to load catalog.", errorStatus, errorText);
                    },
                    false, { dataType: 'json', timeout: 15000 }
                );
             } else {
                 console.error("HanimeComponent: Cannot fetch catalog. Network component, CATALOG_URL, or network.native missing.");
                  _this.empty("Не удалось загрузить каталог. Ошибка инициализации сети.");
             }
        };

        this.build = function (result) {
             // (Ваша реализация build без изменений, строит карточки и добавляет в Scroll)
             var _this = this;
             console.log("HanimeComponent: build() - Building UI with", result.length, "items.");

             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                  scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
                  console.log("HanimeComponent: Lampa.Scroll initialized (horizontal).");
             }

             if(scroll && typeof scroll.minus === 'function') scroll.minus();
             else console.warn("HanimeComponent: Scroll or scroll.minus method not available in build(). Cannot scroll to beginning.");

             if (!(itemsContainer && typeof itemsContainer.empty === 'function' && scroll && typeof scroll.append === 'function' && typeof scroll.render === 'function' && html && typeof html.find === 'function' && typeof html.append === 'function' && window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function')) {
                  console.error("HanimeComponent: Missing critical DOM/Lampa dependencies in build(). Aborting UI build.");
                   if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                  _this.empty("Не удалось построить интерфейс.");
                  return;
             }

            itemsContainer.empty();
            items = [];

            if (itemsContainer && scroll) {
                 result.forEach(function (meta) {
                    var card = new HanimeCard(meta, _this); // Pass componentRef
                    var cardElement = card.render();

                     itemsContainer.append(cardElement);
                    items.push(card);
                });
                 console.log("HanimeComponent: Created and added", items.length, "cards to itemsContainer.");

                scroll.append(itemsContainer);
                 html.find('.items-line__body').empty().append(scroll.render(true));

            } else {
                console.error("HanimeComponent: Required objects or methods missing before building cards in build().");
                if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка плагина при создании карточек.', 5000);
            }


             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
             if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
             console.log("HanimeComponent: Build process completed and activity toggled.");

            // ДОБАВЛЯЕМ ОБРАБОТЧИК КНОПКИ "ЕЩЕ" ПОСЛЕ ПОСТРОЕНИЯ UI
             var moreButton = html.find('.items-line__more.selector');
             if(moreButton.length && typeof moreButton.on === 'function' && window.Lampa && typeof Lampa.Activity === 'object' && typeof Lampa.Activity.push === 'function') {
                 moreButton.on('hover:enter', function() {
                      console.log("HanimeComponent: 'Еще' button pressed. Pushing HanimeFullCatalogComponent.");
                     Lampa.Activity.push({
                         url: '', // Можно передать URL или идентификатор для компонента полного каталога
                         title: 'Весь каталог аниме', // Заголовок для активности полного каталога
                         component: 'hanime_full_catalog', // Имя НОВОГО компонента для полного каталога
                         page: 1 // Стартовая страница, если полный каталог с пагинацией
                     });
                      console.log("HanimeComponent: Pushed 'hanime_full_catalog' activity.");
                 });
                  console.log("HanimeComponent: 'Еще' button listener attached.");
             } else {
                  console.warn("HanimeComponent: 'Еще' button or its methods, or Lampa.Activity.push not available. Cannot attach listener.");
             }

        };


        this.onCardClick = function(cardData) {
             console.log("HanimeComponent: Card clicked:", cardData.title);
            this.fetchStreamAndMeta(cardData.id, cardData);
        }

        this.showCardContextMenu = function(cardElement, cardData) {
             // (Ваша реализация showCardContextMenu, делегирует Lampa.Select)
             console.log("HanimeComponent: showCardContextMenu for", cardData.title);
             var _this = this;
             var enabled = (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;
             var status  = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(cardData) : {};

             var menu_favorite = [];
             if(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') {
                 menu_favorite = [
                     { title: Lampa.Lang.translate('title_book'), where: 'book', checkbox: true, checked: status.book },
                     { title: Lampa.Lang.translate('title_like'), where: 'like', checkbox: true, checked: status.like },
                     { title: Lampa.Lang.translate('title_wath'), where: 'wath', checkbox: true, checked: status.wath },
                     { title: Lampa.Lang.translate('menu_history'), where: 'history', checkbox: true, checked: status.history },
                     { title: Lampa.Lang.translate('settings_cub_status'), separator: true }
                 ];
             } // Fallbackhandled in show method

             if (window.Lampa && Lampa.Select && typeof Lampa.Select.show === 'function') {
                 Lampa.Select.show({
                     title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('title_action') : 'Action',
                     items: menu_favorite,
                     onBack: ()=>{ if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled); console.log("HanimeComponent: Context menu back."); },
                     onCheck: (a)=>{
                         console.log("HanimeComponent: Context menu checked:", a.where);
                         if(window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function') Lampa.Favorite.toggle(a.where, cardData);
                         var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                          if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                     },
                     onSelect: (a)=>{
                          console.log("HanimeComponent: Context menu selected:", a);
                          if(a.collect && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function'){
                              Lampa.Favorite.toggle(a.where, cardData);
                               var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                              if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                          }
                          if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                           if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                            console.log("HanimeComponent: Context menu closed.");
                     },
                      onDraw: (item, elem) => {
                           if (elem.collect && window.Lampa && Lampa.Account && typeof Lampa.Account.hasPremium === 'function' && !Lampa.Account.hasPremium()) {
                                let lockIconTemplate = (window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.has('icon_lock')) ? Lampa.Template.get('icon_lock') : null;
                                if (lockIconTemplate && window.$ && typeof item.find === 'function' && typeof item.append === 'function' && typeof item.off === 'function' && typeof item.on === 'function') {
                                     let wrap = $('<div class="selectbox-item__lock"></div>');
                                     wrap.append($(lockIconTemplate));
                                     item.find('.selectbox-item__checkbox').remove();
                                     item.append(wrap);
                                     item.off('hover:enter').on('hover:enter', () => {
                                         if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                                          if (window.Lampa && Lampa.Account && typeof Lampa.Account.showCubPremium === 'function') Lampa.Account.showCubPremium();
                                     });
                                } else {
                                     console.warn("Hanime Component: icon_lock template or required methods missing for Premium item draw.");
                                }
                           }
                      }
                 });
             } else { console.warn("HanimeComponent: Lampa.Select not available."); if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Компонент меню недоступен.', 5000); }
         };

        this.updateScrollToFocus = function(element) {
            //console.log("HanimeComponent: updateScrollToFocus() called.");
            if (scroll && typeof scroll.update === 'function' && element && typeof element.length === 'number' && element.length > 0) {
                last = element[0];
                scroll.update(element, true);
                //console.log("HanimeComponent: Scroll updated.");
            } else { console.warn("HanimeComponent: Scroll or element missing for scroll update."); }
        }

        this.fetchStreamAndMeta = function (id, meta) {
             // (Ваша реализация fetchStreamAndMeta)
             var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true); else console.warn("Activity loader missing.");
            console.log("HanimeComponent: fetchStreamAndMeta for ID:", id);
            if (!network || typeof network.native !== 'function') { console.error("Network missing."); if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Сетевой компонент недоступен.', 5000); return; }

            Promise.all([
                new Promise((resolve, reject) => { if(streamUrl && network) network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 }); else reject('Stream URL/Network unavailable'); }),
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => { if(metaUrl && network) network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 }); else reject('Meta URL/Network unavailable'); })
            ]).then(([streamData, metaDataResponse]) => {
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                const fullMetaData = metaDataResponse ? (metaDataResponse.meta || metaDataResponse) : null;
                //console.log("Stream data:", streamData, "Meta data:", fullMetaData);

                if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0];
                    var finalStreamUrl = streamToPlay ? streamToPlay.url : null;
                    if(finalStreamUrl) {
                         try { var url = new URL(finalStreamUrl); if (url.hostname && url.hostname.includes('highwinds-cdn.com') && PROXY_BASE_URL) finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`; } catch (e) { console.error("URL parse/proxy error:", e); }
                    }

                    var playerObject = { title: fullMetaData ? (fullMetaData.name || fullMetaData.title || 'Без названия') : 'Без названия', url: finalStreamUrl, poster: fullMetaData ? (fullMetaData.poster || fullMetaData.background || '') : '' };

                    if (playerObject.url && window.Lampa && Lampa.Player && typeof Lampa.Player.play === 'function' && typeof Lampa.Player.playlist === 'function') {
                         console.log("Launching player."); Lampa.Player.play(playerObject); Lampa.Player.playlist([playerObject]);
                         if (fullMetaData && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                                const historyMeta = { id: fullMetaData.id || '', title: fullMetaData.name || fullMetaData.title || '', poster: fullMetaData.poster || fullMetaData.background || '', runtime: fullMetaData.runtime, year: fullMetaData.year, original_name: fullMetaData.original_name || '' };
                                Lampa.Favorite.add('history', historyMeta, 100);
                                console.log("Added to history.");
                         } else console.warn("Favorite/Add missing.");
                    } else { console.error("Player/URL missing."); if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show(playerObject.url ? 'Компонент плеера недоступен.' : 'Не удалось получить ссылку на поток.', 5000); }

                } else { console.warn("No streams found."); if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Потоки не найдены для этого аниме.', 5000); }

            }).catch(error => {
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                console.error("Error fetching stream/meta:", error);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'), 5000);
            });
        };

        this.empty = function (msg) {
             console.log("HanimeComponent: empty() -", msg);
             if (window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function') {
                 var empty = new Lampa.Empty({ message: msg });
                 if(html && typeof html.empty === 'function' && typeof html.append === 'function') html.empty().append(empty.render(true));
                 else console.warn("Html container missing for empty.");
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                 if (typeof empty.start === 'function') this.start = empty.start; else console.warn("Empty start missing.");
                  console.log("Displayed Empty state.");
             } else {
                  console.warn("Lampa.Empty missing. Basic text fallback.");
                  if(html && typeof html.empty === 'function' && typeof html.text === 'function') html.empty().text(msg + ' (Empty component missing)');
                  if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                   this.start = function() { if(window.Lampa && Lampa.Controller) { Lampa.Controller.add('content', { back: this.back }); Lampa.Controller.toggle('content'); } }.bind(this);
             }
        };

        this.create = function () {
            console.log("HanimeComponent: create()");
            if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' }); else if(!scroll) console.warn("Scroll not init.");
            if (!network && window.Lampa && typeof Lampa.Reguest === 'function') network = new Lampa.Reguest(); else if(!network) console.warn("Network not init.");

            this.buildLayout();
            if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(true);
            this.fetchCatalog();
             console.log("HanimeComponent: create() finished.");
        };

        this.start = function () {
            console.log("HanimeComponent: start()");
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this.activity) { console.log("Not active activity."); return; }
             console.log("HanimeComponent: Activity active. Setting Controller.");

             // УБЕДИМСЯ, что Controller, Scroll и их методы ДОСТУПНЫ
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function' && scroll && typeof scroll.render === 'function') {
                 Lampa.Controller.add('content', {
                     toggle: function () {
                         console.log("HanimeComponent: Controller toggle().");
                         Lampa.Controller.collectionSet(scroll.render()); // Pass scroll DOM as container
                         Lampa.Controller.collectionFocus(last || false, scroll.render()); // Set focus
                         console.log("HanimeComponent: Controller set/focus finished.");
                     }.bind(this), // Bind toggle
                     left: function () { if (window.Navigator && typeof Navigator.canmove === 'function' && Navigator.canmove('left')) Navigator.move('left'); else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('menu'); },
                     right: function () { if (window.Navigator && typeof Navigator.canmove === 'function' && Navigator.canmove('right')) Navigator.move('right'); },
                     up: function () { if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('head'); },
                     down: function () { if (window.Navigator && typeof Navigator.canmove === 'function' && Navigator.canmove('down')) Navigator.move('down'); },
                     back: this.back
                 });
                 Lampa.Controller.toggle('content');
                  console.log("HanimeComponent: Controller 'content' toggled.");
            } else {
                console.error("HanimeComponent: CRITICAL: Lampa.Controller or scroll, or required methods NOT available in start(). Cannot setup main Controller.");
                 // Fallback: Add basic controller for Back if possible
                 if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                     console.log("HanimeComponent: Attempting to add basic Controller for Back button.");
                     Lampa.Controller.add('content', { back: this.back });
                     Lampa.Controller.toggle('content');
                 } else console.warn("HanimeComponent: Lampa.Controller missing, cannot add basic back handler.");
            }
        };

        this.pause = function () {
             console.log("HanimeComponent: pause()");
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') {
                 last = Lampa.Controller.item() || last;
                  console.log("HanimeComponent: Paused. Saved last focused item:", last);
             } else {
                  //console.log("HanimeComponent: Pause - content controller not active or Controller.item missing. Last focus not saved.");
             }
        };

        this.stop = function () { //console.log("HanimeComponent: stop()");
        };

        this.render = function () { //console.log("HanimeComponent: render()");
            if (!html) { this.buildLayout(); } return html;
        };

        this.destroy = function () {
            console.log("HanimeComponent: destroy() called.");
            if(network && typeof network.clear === 'function') network.clear(); network = null;
             if (items && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') Lampa.Arrays.destroy(items); items = null;
             if (scroll && typeof scroll.destroy === 'function') scroll.destroy(); scroll = null;
             if (html && typeof html.remove === 'function') html.remove(); html = null; itemsContainer = null; last = null;

            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function') {
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.collectionSet === 'function') {
                      Lampa.Controller.collectionSet([]);
                 }
                 Lampa.Controller.remove('content');
                  console.log("HanimeComponent: Controller removed.");
            } else console.warn("Controller cleanup missing.");
            console.log("HanimeComponent: destroy() finished.");
        };

        this.back = function () {
             console.log("HanimeComponent: back() called.");
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') Lampa.Activity.backward();
             else console.warn("Activity.backward missing.");
        };
    }


    // --- HanimeFullCatalogComponent (НОВЫЙ: Компонент полного списка аниме в виде сетки) ---
    // Отображает полный список аниме в виде вертикально прокручиваемой сетки.
    function HanimeFullCatalogComponent(componentObject) {
         var network = null; // Network component for fetching ALL data
         var scroll = null; // Vertical scroll component

         var items = []; // Array of HanimeCard objects
         var html = null; // Root DOM for this component (e.g., a simple div or container)
         var itemsContainer = null; // Container for cards within the scroll (.category-full)

         var active = 0;
         var last = null; // Last focused DOM element

         // Use the URL for the full catalog
         var CATALOG_URL = CATALOG_URL_ALL; // <<< Use the ALL CATALOG URL

         // currentPage and totalPages for potential pagination
         var currentPage = 1;
         var totalPages = 1; // Assume 1 for now if API doesn't provide total pages

         // Indicates if currently loading more data (for pagination)
         var loadingMore = false;


        // Build the basic layout (container for the full grid)
        this.buildLayout = function() {
             console.log("HanimeFullCatalogComponent: buildLayout()");
            // Create a container for the vertical grid. Use standard Lampa class 'category-full'.
            // The Scroll component will wrap this container.
            html = $(`<div class="category-full"></div>`); // Standard class for a full category grid

             itemsContainer = html; // In a single vertical category, the root html container is also the items container for Scroll
             console.log("HanimeFullCatalogComponent: buildLayout completed.");
        };

         // Fetch data for the full catalog (or a specific page for pagination)
         this.fetchCatalog = function (page = 1) {
             var _this = this;
             // Check if URL has page parameter or if we need to modify URL for page
             var url = CATALOG_URL;
             // Example for API with page parameter: url = `${CATALOG_URL}?page=${page}`;

             // If not page 1 and we are already loading, do nothing
             if (page !== 1 && loadingMore) {
                  console.log("HanimeFullCatalogComponent: Already loading page", page, "skipping.");
                 return;
             }

             loadingMore = true; // Set loading flag

             // Show loader only for the initial load (page 1)
             if (page === 1 && _this.activity && typeof _this.activity.loader === 'function') {
                  _this.activity.loader(true);
             } else {
                  // Optional: Show a small loader at the bottom for pagination
                  // You might need to add a loading indicator DOM element below your grid for this
             }


             console.log("HanimeFullCatalogComponent: fetchCatalog() - Starting request for page", page, "to", url);

             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeFullCatalogComponent: Lampa.Reguest initialized.");
             }

             // Clear previous requests only for initial load (page 1)
             if (page === 1 && network && typeof network.clear === 'function') network.clear();
             else if (network && typeof network.native === 'function') { /* Do not clear for pagination */ }
             else {
                  console.error("HanimeFullCatalogComponent: Network component or native method missing.");
                  loadingMore = false;
                   if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                   if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Сетевой компонент недоступен.', 5000);
                 return;
             }

              network.native(url, // Use the constructed URL with or without page param
                function (data) {
                     loadingMore = false; // Reset loading flag
                     // Hide initial loader
                    if (page === 1 && _this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                    // Hide pagination loader (if any)

                     //console.log("HanimeFullCatalogComponent: Catalog data received for page", page, ":", data);
                    if (data && data.metas && Array.isArray(data.metas)) {
                         if (page === 1 && data.metas.length === 0) {
                             _this.empty("Каталог пуст.");
                         } else if (data.metas.length > 0) {
                             // Build or append data
                             _this.build(data.metas, page); // Pass page number to build
                             // If API provides total pages, update totalPages
                             // if(data.total_pages) totalPages = data.total_pages; // Example
                             currentPage = page; // Update current page after successful fetch
                         } else {
                              // If page > 1 and metas.length is 0, it might be the last page
                              console.log("HanimeFullCatalogComponent: Fetched page", page, "no more items.");
                         }
                    } else {
                         if (page === 1) _this.empty("Неверный формат данных от API."); // Show error only for initial load
                        console.error("HanimeFullCatalogComponent: Invalid data format from API for page", page, ".", data);
                         // For pagination error, might show a Noty instead of full empty state
                    }
                },
                function (errorStatus, errorText) {
                     loadingMore = false; // Reset loading flag
                     // Hide initial loader
                    if (page === 1 && _this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                     // Hide pagination loader (if any)

                     if (page === 1) _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                     else console.error("HanimeFullCatalogComponent: Failed to load page", page, ".", errorStatus, errorText);
                     // For pagination error, might show Noty instead
                },
                false, // Do not cache API response URL by default
                { dataType: 'json', timeout: 15000 } // Expect JSON, 15s timeout
             );
         };

         // Build the UI for the full catalog grid
         this.build = function (result, page = 1) {
             var _this = this;
             console.log("HanimeFullCatalogComponent: build() - Building UI for page", page, "with", result.length, "items.");

             // Initialize Vertical Scroll on the itemsContainer (which is the html root here)
              if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                   // Default direction is vertical, no need to specify
                   scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 }); // Vertical Scroll
                   console.log("HanimeFullCatalogComponent: Lampa.Scroll initialized (vertical).");
              }

              // Прокручиваем Scroll в начало только для page 1
              if(page === 1 && scroll && typeof scroll.minus === 'function') scroll.minus();
              else if (page === 1) console.warn("Scroll or minus missing for initial scroll reset.");

             // Убедимся, что itemsContainer (html), Scroll и Lampa Template доступны.
              if (!(itemsContainer && scroll && typeof itemsContainer.append === 'function' && typeof scroll.render === 'function' && window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function')) {
                  console.error("HanimeFullCatalogComponent: Missing critical dependencies in build(). Aborting UI build.");
                   if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                   if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Не удалось построить интерфейс.', 5000);
                  return;
             }


            // Для page 1, очищаем контейнер и массив item objects.
            if (page === 1) {
                 itemsContainer.empty(); // Удаляем предыдущие DOM elements
                 items = []; // Очищаем массив JS objects
                 console.log("HanimeFullCatalogComponent: Cleared items for page 1 build.");
             }

            // Создаем и добавляем новые HanimeCard для каждого элемента из данных.
            if(itemsContainer && scroll) { // Repeat essential check before loop
                 result.forEach(function (meta) {
                     // Создаем новый экземпляр HanimeCard, передавая данные и ссылку на this компонента.
                    var card = new HanimeCard(meta, _this); // Pass componentRef
                     // Получаем DOM элемент карточки.
                    var cardElement = card.render();

                     // Добавляем DOM элемент карточки в itemsContainer.
                     itemsContainer.append(cardElement);
                     // Сохраняем объект HanimeCard в массиве items.
                    items.push(card);
                });
                 console.log("HanimeFullCatalogComponent: Added", result.length, "cards to itemsContainer. Total items:", items.length);


                 // Scroll обернет itemsContainer в свою структуру при первом append, или просто
                 // удостоверится, что он его контент при последующих append (for pagination)
                 // The root html is itemsContainer for this component, so we append to html.
                 // scroll.append(itemsContainer) will internally work with itemsContainer
                 // We should insert the scroll render OUTSIDE the itemsContainer/html if itemsContainer is scroll.render's content.
                 // Correct: The root html *IS* the scroll container in category-full setup,
                 // and the cards go into the scroll__body. Let's reconsider structure based on example HTML.

                 // Example Full Category DOM:
                 // <div class="activity__body">
                 //    <div> <-- often a container for scroll
                 //      <div class="scroll scroll--mask scroll--over layer--wheight"> <-- Vertical Scroll
                 //         <div class="scroll__content">
                 //            <div class="scroll__body"> <-- This contains the grid
                 //                <div class="category-full"> <-- This is the grid itself, containing cards
                 //                    <div class="card selector ...">...</div>
                 //                    <div class="card selector ...">...</div>
                 //                </div>
                 //            </div>
                 //         </div>
                 //      </div>
                 //   </div>
                 // </div>
                 // In this structure, scroll.render() is wrapped in *another* div, and the cards go into a nested scroll__body/category-full structure.

                 // Let's adjust HanimeFullCatalogComponent layout/build to match.
                 // buildLayout creates <div class="category-full"></div> (this is the grid)
                 // build attaches cards to this <div class="category-full"> (our itemsContainer)
                 // The Scroll needs to wrap this structure.

                 // We need a main root element for HanimeFullCatalogComponent. Let's use `<div class="hanime-full-catalog"></div>`.
                 // buildLayout will create this root, and also the itemsContainer (<div class="category-full">).
                 // create will append scroll.render(itemsContainer) into the root.


            } else {
                 console.error("HanimeFullCatalogComponent: Required objects or methods missing before building cards in build().");
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка плагина при создании карточек.', 5000);
            }

             // Update the Scroll element's content - especially important for pagination
             // After appending new cards for page > 1, the scroll needs to know its content size increased
             if (scroll && typeof scroll.append === 'function') {
                 // For pagination, scroll.append adds new items to the content.
                 // In this build, itemsContainer is already the list of items for scroll.
                 // We might need a different call or trust scroll to detect children changes.
                 // Standard Scroll usually re-measures when new items are added to its content.
                 // If itemsContainer is the scroll's content, appending to it should suffice.
                 // If scroll needs an explicit update call, we might need:
                 // scroll.update(); // Re-measure all content
             }

             // Hide loader
             if(page === 1 && _this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
             // Hide pagination loader (if added)

            // Show the activity
             if(_this.activity && typeof _this.activity.toggle === 'function' && page === 1) _this.activity.toggle();


            // Add pagination load trigger
             if (scroll && typeof scroll.on === 'function' && currentPage < totalPages) { // Check if pagination needed and more pages exist
                scroll.on('needmore', function() { // 'needmore' is a standard event in Scroll for pagination
                    console.log("HanimeFullCatalogComponent: Scroll needs more data. Loading next page.");
                    if (!loadingMore) { // Prevent multiple concurrent loads
                        _this.fetchCatalog(currentPage + 1); // Fetch next page
                    } else {
                         console.log("HanimeFullCatalogComponent: Pagination trigger but already loading.");
                    }
                });
                console.log("HanimeFullCatalogComponent: Attached 'needmore' listener.");
             } else if (scroll) {
                 console.log("HanimeFullCatalogComponent: Pagination not needed or already at last page. Detaching 'needmore' listener if any.");
                 if (typeof scroll.off === 'function') scroll.off('needmore');
             }
        };


         // Callback for card click in the full catalog
         this.onCardClick = function(cardData) {
             console.log("HanimeFullCatalogComponent: Card clicked:", cardData.title);
            this.fetchStreamAndMeta(cardData.id, cardData);
         }

         // Callback for card context menu in the full catalog
         this.showCardContextMenu = function(cardElement, cardData) {
             // (Same implementation as HanimeComponent)
             console.log("HanimeFullCatalogComponent: showCardContextMenu for", cardData.title);
             var _this = this;
             var enabled = (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;
             var status  = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(cardData) : {};

             var menu_favorite = [];
             if(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') {
                 menu_favorite = [
                     { title: Lampa.Lang.translate('title_book'), where: 'book', checkbox: true, checked: status.book },
                     { title: Lampa.Lang.translate('title_like'), where: 'like', checkbox: true, checked: status.like },
                     { title: Lampa.Lang.translate('title_wath'), where: 'wath', checkbox: true, checked: status.wath },
                     { title: Lampa.Lang.translate('menu_history'), where: 'history', checkbox: true, checked: status.history },
                     { title: Lampa.Lang.translate('settings_cub_status'), separator: true }
                 ];
             }

             if (window.Lampa && Lampa.Select && typeof Lampa.Select.show === 'function') {
                 Lampa.Select.show({
                     title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('title_action') : 'Action',
                     items: menu_favorite,
                     onBack: ()=>{ if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled); console.log("Menu back."); },
                     onCheck: (a)=>{
                         console.log("Menu checked:", a.where);
                         if(window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function') Lampa.Favorite.toggle(a.where, cardData);
                         // Find card object using its DOM element to update icons
                         var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                          if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                     },
                     onSelect: (a)=>{
                          console.log("Menu selected:", a);
                          if(a.collect && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function'){
                              Lampa.Favorite.toggle(a.where, cardData);
                               var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                              if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                          }
                          if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                           if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                            console.log("Menu closed.");
                     },
                      onDraw: (item, elem) => {
                           if (elem.collect && window.Lampa && Lampa.Account && typeof Lampa.Account.hasPremium === 'function' && !Lampa.Account.hasPremium()) {
                                let lockIconTemplate = (window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.has('icon_lock')) ? Lampa.Template.get('icon_lock') : null;
                                if (lockIconTemplate && window.$ && typeof item.find === 'function' && typeof item.append === 'function' && typeof item.off === 'function' && typeof item.on === 'function') {
                                     let wrap = $('<div class="selectbox-item__lock"></div>');
                                     wrap.append($(lockIconTemplate));
                                     item.find('.selectbox-item__checkbox').remove();
                                     item.append(wrap);
                                     item.off('hover:enter').on('hover:enter', () => {
                                         if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                                          if (window.Lampa && Lampa.Account && typeof Lampa.Account.showCubPremium === 'function') Lampa.Account.showCubPremium();
                                     });
                                } // else missing lock icon template or methods
                           }
                      }
                 });
             } else { console.warn("Lampa.Select missing."); if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Компонент меню недоступен.', 5000); }
         };

         // Callback to scroll (Vertical)
        this.updateScrollToFocus = function(element) {
             console.log("HanimeFullCatalogComponent: updateScrollToFocus called.");
             if (scroll && typeof scroll.update === 'function' && element && typeof element.length === 'number' && element.length > 0) {
                 last = element[0];
                 scroll.update(element, true); // Vertical scroll update uses same syntax
                  console.log("HanimeFullCatalogComponent: Scroll updated.");
             } else { console.warn("Scroll or element missing for scroll update."); }
        }


        this.fetchStreamAndMeta = function (id, meta) {
             // (Same implementation as HanimeComponent)
             var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true); else console.warn("Activity loader missing.");
            console.log("HanimeFullCatalogComponent: fetchStreamAndMeta for ID:", id);
            if (!network || typeof network.native !== 'function') { console.error("Network missing."); if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Сетевой компонент недоступен.', 5000); return; }

            Promise.all([
                new Promise((resolve, reject) => { if(streamUrl && network) network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 }); else reject('Stream URL/Network unavailable'); }),
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => { if(metaUrl && network) network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 }); else reject('Meta URL/Network unavailable'); })
            ]).then(([streamData, metaDataResponse]) => {
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                const fullMetaData = metaDataResponse ? (metaDataResponse.meta || metaDataResponse) : null;
                //console.log("Stream data:", streamData, "Meta data:", fullMetaData);

                if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0];
                    var finalStreamUrl = streamToPlay ? streamToPlay.url : null;
                    if(finalStreamUrl) {
                         try { var url = new URL(finalStreamUrl); if (url.hostname && url.hostname.includes('highwinds-cdn.com') && PROXY_BASE_URL) finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`; } catch (e) { console.error("URL parse/proxy error:", e); }
                    }
                    var playerObject = { title: fullMetaData ? (fullMetaData.name || fullMetaData.title || 'Без названия') : 'Без названия', url: finalStreamUrl, poster: fullMetaData ? (fullMetaData.poster || fullMetaData.background || '') : '' };
                    if (playerObject.url && window.Lampa && Lampa.Player && typeof Lampa.Player.play === 'function' && typeof Lampa.Player.playlist === 'function') {
                         console.log("Launching player."); Lampa.Player.play(playerObject); Lampa.Player.playlist([playerObject]);
                         if (fullMetaData && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                                const historyMeta = { id: fullMetaData.id || '', title: fullMetaData.name || fullMetaData.title || '', poster: fullMetaData.poster || fullMetaData.background || '', runtime: fullMetaData.runtime, year: fullMetaData.year, original_name: fullMetaData.original_name || '' };
                                Lampa.Favorite.add('history', historyMeta, 100); console.log("Added to history.");
                         } else console.warn("Favorite/Add missing.");
                    } else { console.error("Player/URL missing."); if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show(playerObject.url ? 'Компонент плеера недоступен.' : 'Не удалось получить ссылку на поток.', 5000); }

                } else { console.warn("No streams found."); if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Потоки не найдены для этого аниме.', 5000); }

            }).catch(error => {
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                console.error("Error fetching stream/meta:", error);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'), 5000);
            });
        };

        this.empty = function (msg) {
             console.log("HanimeFullCatalogComponent: empty() -", msg);
             if (window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function') {
                 var empty = new Lampa.Empty({ message: msg });
                 if(html && typeof html.empty === 'function' && typeof html.append === 'function') html.empty().append(empty.render(true));
                 else console.warn("Html container missing for empty.");
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                 if (typeof empty.start === 'function') this.start = empty.start; else console.warn("Empty start missing.");
                  console.log("Displayed Empty state.");
             } else {
                  console.warn("Lampa.Empty missing. Basic text fallback.");
                  if(html && typeof html.empty === 'function' && typeof html.text === 'function') html.empty().text(msg + ' (Empty component missing)');
                  if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                   this.start = function() { if(window.Lampa && Lampa.Controller) { Lampa.Controller.add('content', { back: this.back }); Lampa.Controller.toggle('content'); } }.bind(this);
             }
        };


        this.create = function () {
            console.log("HanimeFullCatalogComponent: create()");
            // Init Scroll and Network
            if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 }); else if(!scroll) console.warn("Scroll not init.");
            if (!network && window.Lampa && typeof Lampa.Reguest === 'function') network = new Lampa.Reguest(); else if(!network) console.warn("Network not init.");

            this.buildLayout(); // Build root html (.category-full)
            if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(true);

            // Fetch data for the first page
            this.fetchCatalog(1);

             console.log("HanimeFullCatalogComponent: create() finished.");
        };


        this.start = function () {
            console.log("HanimeFullCatalogComponent: start()");
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this.activity) { console.log("Not active activity."); return; }
             console.log("HanimeFullCatalogComponent: Activity active. Setting Controller.");

             // Set up Controller for Vertical Grid Navigation
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function' && scroll && typeof scroll.render === 'function') {

                 Lampa.Controller.add('content', {
                     toggle: function () {
                         console.log("HanimeFullCatalogComponent: Controller toggle().");
                         // Set the collection to the scroll's render (which contains our category-full)
                         Lampa.Controller.collectionSet(scroll.render()); // Controller will find .selector elements within scroll DOM
                         // Set initial focus
                         Lampa.Controller.collectionFocus(last || false, scroll.render());
                         console.log("HanimeFullCatalogComponent: Controller set/focus finished.");
                     }.bind(this), // Bind toggle

                     // Navigation in a Vertical Grid:
                     left: function () {
                         // Move left within the row (between columns)
                         if (window.Navigator && typeof Navigator.canmove === 'function' && Navigator.canmove('left')) Navigator.move('left');
                          // If at the leftmost element, move to the menu
                         else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('menu');
                          else console.log("Nav left blocked.");
                     },
                     right: function () {
                         // Move right within the row (between columns)
                         if (window.Navigator && typeof Navigator.canmove === 'function' && Navigator.canmove('right')) Navigator.move('right');
                          else console.log("Nav right blocked.");
                     },
                     up: function () {
                         // Move up to the previous row or to the Header
                         if (window.Navigator && typeof Navigator.canmove === 'function' && Navigator.canmove('up')) Navigator.move('up');
                          // If at the top row, move to the Header
                         else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('head');
                          else console.log("Nav up blocked.");
                     },
                     down: function () {
                         // Move down to the next row
                         if (window.Navigator && typeof Navigator.canmove === 'function' && Navigator.move === 'function' && Navigator.canmove('down')) { // Use move() here too for vertical navigation
                              Navigator.move('down');
                              // Optional: Check if we moved to the last row and might need to load more
                              // var currentElement = Lampa.Controller.item();
                              // if(currentElement && currentElement.classList.contains('last-row-class') && currentPage < totalPages && !loadingMore) {
                              //    _this.fetchCatalog(currentPage + 1);
                              // }
                         } else { console.log("Nav down blocked."); } // If no more rows below
                     },
                     back: this.back
                 });
                 Lampa.Controller.toggle('content');
                 console.log("HanimeFullCatalogComponent: Controller 'content' toggled.");
             } else {
                console.error("HanimeFullCatalogComponent: CRITICAL: Controller or scroll missing in start(). Cannot setup main Controller.");
                 if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                     console.log("Attempting basic Controller for Back button.");
                     Lampa.Controller.add('content', { back: this.back }); Lampa.Controller.toggle('content');
                 } else console.warn("Lampa.Controller missing, cannot add basic back handler.");
            }
        };

        this.pause = function () {
             console.log("HanimeFullCatalogComponent: pause()");
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') {
                 last = Lampa.Controller.item() || last;
                  console.log("HanimeFullCatalogComponent: Paused. Saved last focused item:", last);
             } //else console.log("Pause - controller inactive or missing.");
        };

        this.stop = function () { //console.log("HanimeFullCatalogComponent: stop()");
        };

        this.render = function () { //console.log("HanimeFullCatalogComponent: render()");
            if (!html) this.buildLayout(); // Make sure layout is built before rendering

            // In FullCatalog (grid), scroll.render() *is* the main content DOM
            // so we just return that. Scroll's render already includes itemsContainer
             if(scroll && typeof scroll.render === 'function') {
                 return scroll.render();
             } else {
                  // Fallback if scroll is not ready. Return raw itemsContainer (the grid).
                  console.warn("HanimeFullCatalogComponent: Scroll not available in render, returning itemsContainer directly.");
                 return itemsContainer;
             }
        };

        this.destroy = function () {
            console.log("HanimeFullCatalogComponent: destroy() called.");
            if(network && typeof network.clear === 'function') network.clear(); network = null;
             if (items && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') Lampa.Arrays.destroy(items); items = null;
             if (scroll && typeof scroll.destroy === 'function') scroll.destroy(); scroll = null;
             if (html && typeof html.remove === 'function') html.remove(); html = null; itemsContainer = null; last = null;

            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function') {
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.collectionSet === 'function') {
                      Lampa.Controller.collectionSet([]);
                 }
                 Lampa.Controller.remove('content');
                  console.log("Controller removed.");
            } // else Controller cleanup missing/unavailable
            console.log("HanimeFullCatalogComponent: destroy() finished.");
        };

        this.back = function () {
             console.log("HanimeFullCatalogComponent: back() called.");
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') Lampa.Activity.backward();
             else console.warn("Activity.backward missing.");
        };
    }


    // --- Глобальная функция инициализации плагина. ---
    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() invoked.");

         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: flag already set. Skipping initialization.");
             return;
         }


        // --- Логика инициализации, зависящая от Lampa. Выполняется после 'appready'. ---
        function initializeLampaDependencies() {
             console.log("Hanime Plugin: initializeLampaDependencies() called.");

             // Критические проверки Lampa компонентов.
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Template || typeof Lampa.Template !== 'object' || !Lampa.Component || typeof Lampa.Component !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Scroll || typeof Lampa.Scroll !== 'function' || !Lampa.Reguest || typeof Lampa.Reguest !== 'function') {
                  console.error("Hanime Plugin: CRITICAL: Lampa components missing after waiting for appready.");
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка инициализации плагина: Компоненты Lampa недоступны. Обновите Lampa или плагин.', 15000);
                  }
                  return; // Прерываем.
             }
             console.log("Hanime Plugin: Lampa components checked OK.");

             // Устанавливаем глобальный флаг ПЛАГИНА после проверок Lampa.
              if (!window.plugin_hanime_catalog_ready) {
                 window.plugin_hanime_catalog_ready = true;
                 console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag set.");
              } // else flag already set by another instance? (logged previously)


             // --- 1. Определение СТАНДАРТНЫХ ВНУТРЕННИХ шаблонов Lampa (fallback). ---
             // Add directly using Lampa.Template.add. No has checks here.
             console.log("Hanime Plugin: Adding standard template fallbacks...");
             if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                 Lampa.Template.add('card_vote_temp', '<div class="card__vote"></div>');
                 Lampa.Template.add('card_quality_temp', '<div class="card__quality"><div></div></div>');
                 Lampa.Template.add('card_year_temp', '<div class="card__age"></div>');
                 Lampa.Template.add('card_type_temp', '<div class="card__type"></div>');
                 Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
                  console.log("Standard template fallbacks added.");
             } // else add method missing, logged already

             // --- 2. Определение ВАШЕГО шаблона карточки 'hanime-card'. ---
             // Use only standard Lampa classes. Details like vote/quality/year/type
             // are handled by addDetails() in HanimeCard.
             console.log("Hanime Plugin: Adding hanime-card template...");
              if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                 Lampa.Template.add('hanime-card', `
                     <div class="hanime-card card selector layer--visible layer--render">
                         <div class="card__view">
                             <img src="./img/img_load.svg" class="card__img" alt="{title}" loading="lazy" />
                             <div class="card__icons">
                                 <div class="card__icons-inner"></div>
                             </div>
                             <!-- Placeholders for details - will be populated by JS -->
                              <div class="card__vote"></div>
                              <div class="card__quality"><div></div></div>
                              <div class="card__type"></div>
                         </div>
                         <div class="card__title">{title}</div>
                         <div class="card__age"></div> <!-- card__age placeholder -->
                     </div>
                 `);
                  console.log("HanimeCard template added.");
             } // else add method missing


             // --- 3. CSS Стили ---
             // Removed as requested. Relying on standard Lampa CSS.
             console.log("Hanime Plugin: Custom CSS REMOVED. Relying on standard Lampa styles for .card, .items-line, .category-full etc.");


             // --- 4. Регистрируем ВАШИ компоненты в Lampa Component Manager. ---
             console.log("Hanime Plugin: Registering components HanimeComponent and HanimeFullCatalogComponent...");
             if (window.Lampa && Lampa.Component && typeof Lampa.Component.add === 'function') {
                 Lampa.Component.add('hanime_catalog', HanimeComponent); // Horizontal line component
                 Lampa.Component.add('hanime_full_catalog', HanimeFullCatalogComponent); // Full grid component
                 console.log("Components registered.");
             } else {
                 console.error("Lampa.Component.add missing. Cannot register components.");
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка плагина: Не удалось зарегистрировать компоненты.', 5000);
             }


             // --- 5. Добавляем пункт меню. ---
             console.log("Hanime Plugin: Calling addMenuItem()...");
             addMenuItem();
              console.log("addMenuItem() called from initializeLampaDependencies.");

              console.log("initializeLampaDependencies() finished.");
        }


        // --- Функция добавления пункта меню. ---
        // Adds a menu item to Lampa's main menu to launch HanimeComponent.
        function addMenuItem() {
             console.log("Hanime Plugin: addMenuItem() called.");

             // Strict check for required Lampa UI components before adding menu item
             if (!window.Lampa || !Lampa.Activity || !Lampa.Controller || !window.$ || !Lampa.Component || typeof Lampa.Component.get !== 'function') {
                  console.warn("addMenuItem cannot proceed: Lampa UI components missing.");
                  return;
             }
             var menuList = $('.menu .menu__list').eq(0);
             if (!menuList.length) {
                 console.warn("addMenuItem cannot proceed: Lampa menu DOM not found.");
                 return;
             }

             // Check if our MAIN component ('hanime_catalog' - the horizontal line view) is registered
             var mainComponentRegistered = Lampa.Component.get('hanime_catalog');
             if (!mainComponentRegistered) {
                 console.warn("addMenuItem skipping: Main component 'hanime_catalog' not registered.");
                 return;
             }


             if (menuList.find('.menu__text:contains("Hanime Catalog")').length > 0) {
                 console.log("Menu item already exists. Skipping.");
                 return;
             }
             console.log("Adding menu item DOM element.");

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

            if (typeof menu_item.on === 'function' && typeof Lampa.Activity.push === 'function') {
                menu_item.on('hover:enter', function () {
                     console.log("Menu item activated. Pushing 'hanime_catalog' activity.");
                    Lampa.Activity.push({
                        url: '', title: 'Hanime Catalog', component: 'hanime_catalog', page: 1
                    });
                     console.log("Activity.push called.");
                });
                console.log("'hover:enter' listener attached to menu item.");
            } else {
                console.warn("jQuery.on or Activity.push missing. Cannot attach menu item listener.");
            }

            menuList.append(menu_item);
            console.log("Menu item DOM element added.");

             console.log("addMenuItem finished.");
        }


        // --- ENTRY POINT: Wait for Lampa readiness ---
        console.log("Hanime Plugin: startPlugin() invoked. Setting up Lampa ready listener.");

         // Flag to prevent double init
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: Flag already set. Exiting.");
             return;
         }
         // The flag is SET within initializeLampaDependencies *after* Lampa checks pass.

         // Use the most reliable method to wait for Lampa
         if (window.Lampa && typeof window.Lampa === 'object' && Lampa.Listener && typeof Lampa.Listener === 'object' && typeof Lampa.Listener.follow === 'function') {
             // Preferred method: Listen for the standard Lampa 'app:ready' event
             console.log("Hanime Plugin: Lampa Listener available. Subscribing to 'app:ready' event.");
             Lampa.Listener.follow('app', function (e) {
                 if (e.type === 'ready') {
                     console.log("Hanime Plugin: Lampa 'appready' event received. Calling initializeLampaDependencies.");
                     initializeLampaDependencies();
                 }
             });
         } else if (window.appready === true) { // Direct check for the appready flag
             // Fallback A: Lampa is already ready when this script runs (happens in some environments)
              console.warn("Hanime Plugin: Lampa Listener not available OR appready already true. Calling initializeLampaDependencies directly as fallback A.");
              initializeLampaDependencies(); // Call init directly

         } else {
             // Fallback B: Neither Listener nor appready is immediately available.
             // Attempting a delayed initialization. This is the least reliable.
             console.error("Hanime Plugin: Neither Listener nor 'appready' flag immediately available. Cannot reliably wait. Attempting delayed initialization as UNRELIABLE fallback B.");
             setTimeout(initializeLampaDependencies, 1000); // Try after 1 second
             console.log("Hanime Plugin: Delayed initialization fallback scheduled.");
         }

         console.log("Hanime Plugin: startPlugin() finished initial setup.");
    }

    // Start the plugin process
    startPlugin();

})();
