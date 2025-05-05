(function () {
    'use strict';

    // --- Константы и общие настройки ---
    var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
    // URL для получения последних добавлений (используется в HanimeLineComponent)
    var CATALOG_URL_LATEST = API_BASE_URL + "/catalog/movie/newset.json";
    // URL для получения ВСЕХ или PAGINATED элементов (используется в HanimeFullCatalogComponent).
    // Если ваш API поддерживает пагинацию, этот URL должен быть базовым,
    // а компонент полного каталога должен добавлять параметры пагинации (например, ?page=1).
    var CATALOG_URL_ALL = API_BASE_URL + "/catalog/movie/all.json"; // <<< Используйте этот URL для полного каталога
    // Если API поддерживает разные категории, добавьте URLы для них:
    // var CATALOG_URL_POPULAR = API_BASE_URL + "/catalog/movie/popular.json";
    // var CATALOG_URL_GENRE_ACTION = API_BASE_URL + "/catalog/movie/genre/action.json";
    // и т.п.
    var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
    var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";
    var PROXY_BASE_URL = "http://77.91.78.5:3000"; // Ваш прокси

    // Добавим структуру данных для категорий, которые будут отображены в главном меню
    var CATEGORIES_CONFIG = [
        {
            title: 'Последние добавленные',
            url: CATALOG_URL_LATEST,
            type: 'line', // Indicate this should be a horizontal line
            // Возможно, добавите filter/genre info here later if API supports filtered 'Еще'
        },
        // Добавьте другие категории здесь, если ваш API их поддерживает:
        // {
        //     title: 'Популярное',
        //     url: CATALOG_URL_POPULAR, // <-- Замените на реальный URL популярного
        //     type: 'line'
        // },
        // {
        //     title: 'Боевик',
        //     url: CATALOG_URL_GENRE_ACTION, // <-- Замените на реальный URL жанра
        //     type: 'line',
        //     genre: 'action' // Идентификатор жанра для передачи в Full Catalog
        // },
        // ...
    ];


    // --- HanimeCard компонента ---
    // Создает и управляет DOM-элементом одной карточки.
    // Использует только стандартные классы Lampa.
    // componentRef - ссылка на родительский компонент (HanimeLineComponent или HanimeFullCatalogComponent),
    //               для вызова методов onCardClick, showCardContextMenu, updateScrollToFocus.
    function HanimeCard(data, componentRef) {
        // Обрабатываем данные из вашего API для соответствия стандартным полям Lampa-подобных карточек.
        var processedData = {
            id: data.id,
            title: data.name || data.title || 'Без названия',
            poster_path: data.poster || data.img, // URL картинки (имя поля Lampa)
            vote_average: data.vote_average || data.vote || null,
            quality: data.quality || data.release_quality || null,
            release_year: ((data.year || data.release_date || '') + '').slice(0, 4),
            type: data.first_air_date ? 'tv' : 'movie', // Lampa uses 'tv' and 'movie'
            original_name: data.original_name
        };

        // Получаем HTML-код базовой структуры карточки из шаблона 'hanime-card'.
        // Шаблон должен использовать ТОЛЬКО стандартные классы Lampa и простую структуру.
        var cardTemplate = Lampa.Template.get('hanime-card', {
            img: './img/img_load.svg', // Используем заглушку, картинка загрузится в onVisible
            title: processedData.title
        });

        var cardElement = $(cardTemplate); // Создаем jQuery-объект DOM-элемента.
        cardElement.addClass('card--' + processedData.type); // Добавляем класс типа card--tv/card--movie


        // --- Методы экземпляра HanimeCard ---

        // Добавление иконки (закладка, история).
        this.addicon = function(name) {
            var iconsContainer = cardElement.find('.card__icons-inner');
            if (iconsContainer.length) {
                var icon = document.createElement('div');
                icon.classList.add('card__icon'); // Стандартный класс Lampa
                icon.classList.add('icon--'+name); // Специфичный класс для стилей (icon--book, icon--history и т.п.)
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
             if (!viewElement.length) {
                  console.warn("HanimeCard: addDetails - .card__view not found for", processedData.title);
                 return;
             }

             // Рейтинг: найти .card__vote и заполнить
             let voteElement = cardElement.find('.card__vote');
             if (processedData.vote_average > 0) { // Проверяем данные
                 if (!voteElement.length) { // Если элемент отсутствует в шаблоне, добавляем
                      voteElement = $('<div class="card__vote"></div>');
                      viewElement.append(voteElement);
                      //console.warn("HanimeCard: .card__vote added dynamically for", processedData.title);
                 }
                 voteElement.text(parseFloat(processedData.vote_average).toFixed(1)).show();
             } else if (voteElement.length) {
                  voteElement.hide(); // Скрываем, если данных нет
             }

             // Качество: найти .card__quality и заполнить
             let qualityElement = cardElement.find('.card__quality');
             if (processedData.quality) { // Проверяем данные
                  if (!qualityElement.length) { // Если элемент отсутствует, добавляем
                      qualityElement = $('<div class="card__quality"><div></div></div>');
                      viewElement.append(qualityElement);
                       //console.warn("HanimeCard: .card__quality added dynamically for", processedData.title);
                  }
                  qualityElement.find('div').text(processedData.quality);
                  qualityElement.show();
             } else if (qualityElement.length) {
                  qualityElement.hide(); // Скрываем
             }

             // Тип (TV/Movie): найти .card__type и заполнить
             let typeElement = cardElement.find('.card__type');
             // Тип обычно всегда есть, но проверяем
             if (processedData.type) {
                  if (!typeElement.length) {
                      typeElement = $('<div class="card__type"></div>');
                       viewElement.append(typeElement);
                       //console.warn("HanimeCard: .card__type added dynamically for", processedData.title);
                  }
                  typeElement.text(processedData.type.toUpperCase()).show();
             } else if (typeElement.length) {
                  typeElement.hide();
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
                          componentRef.updateScrollToFocus(cardElement); // Notify parent to update its scroll
                     }
                     this.update(); // Update this card's state (icons, markers)
                }.bind(this));

                 cardElement.on('hover:enter', function () {
                    //console.log("HanimeCard: hover:enter on", processedData.title);
                     if (componentRef && componentRef.onCardClick && typeof componentRef.onCardClick === 'function') {
                         componentRef.onCardClick(processedData); // Notify parent about click
                     }
                }.bind(this));

                cardElement.on('hover:long', function(){
                     //console.log("HanimeCard: hover:long on", processedData.title);
                     if (componentRef && componentRef.showCardContextMenu && typeof componentRef.showCardContextMenu === 'function') {
                          componentRef.showCardContextMenu(cardElement, processedData); // Notify parent about context menu
                     }
                 }.bind(this));
             } // else console.warn("HanimeCard: jQuery on() not available.");


            // Привязка стандартного события Lampa 'visible' к нативному элементу.
             this.card = cardElement[0]; // Store native DOM element
             if (this.card && typeof this.card.addEventListener === 'function') {
                this.card.addEventListener('visible', this.onVisible.bind(this));
                //console.log("HanimeCard: Attached 'visible' event listener.");
             } //else console.warn("HanimeCard: Cannot attach 'visible' listener.");


            // Динамически добавляем детали (рейтинг, качество, тип, год) и обновляем иконки/маркеры.
             setTimeout(() => { // С небольшой задержкой для готовности DOM.
                  this.addDetails();
                  this.updateFavoriteIcons(); // updateFavoriteIcons() should handle markers too
                  // If watch status bar is needed, call Timeline.watched_status here or in addDetails
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
             if (this.card && typeof this.card.removeEventListener === 'function' && this.onVisible) {
                 this.card.removeEventListener('visible', this.onVisible.bind(this));
             }
             if(cardElement && typeof cardElement.remove === 'function') cardElement.remove();
             processedData = null; cardElement = null; this.card = null; componentRef = null;
             //console.log("HanimeCard: destroy() completed.");
        }

    }


    // --- HanimeLineComponent (Компонент одной горизонтальной линии карточек) ---
    // Отображает одну горизонтальную линию карточек (например, "Последние добавленные").
    // componentObject - ссылка на родительский компонент (HanimeMainComponent),
    //                   для вызова методов onCardClick, showCardContextMenu, onShowFullCategory.
    // categoryData - объект с данными о категории (title, url, type)
    function HanimeComponent(componentObject, categoryData) {
        var network = null; // Network for fetching this line's data
        var scroll = null; // Horizontal scroll for this line

        var items = []; // Array of HanimeCard objects
        var html = null; // Root DOM for this line (.items-line)
        var itemsContainer = null; // Container for cards within the horizontal scroll (.items-cards)

        var active = 0; // Unused internally by this line, managed by parent's controller
        var last = null; // Last focused DOM element *within this line*

        var categoryTitle = categoryData.title;
        var categoryUrl = categoryData.url;
        var categoryInfo = categoryData; // Store full category info

        this.buildLayout = function() {
             //console.log("HanimeComponent:", categoryTitle, "- buildLayout()");
            // Структура items-line со стандартными классами И КНОПКОЙ "ЕЩЕ"
            // Этот layout возвращается рендером компонента.
            html = $(`
                <div class="items-line layer--visible layer--render items-line--type-cards">
                    <div class="items-line__head">
                        <div class="items-line__title">${categoryTitle}</div>
                         <div class="items-line__more selector">Еще</div> <!-- Кнопка Еще -->
                    </div>
                    <div class="items-line__body">
                        <!-- Horizontal Scroll will be rendered here -->
                    </div>
                </div>
            `);
             // itemsContainer - это элемент, куда добавляются карточки внутри горизонтального скролла
             // Сам скролл будет создан в build.
             // Lampa Scroll injects its DOM (scroll__content, scroll__body) when appending content.
             itemsContainer = $('<div class="items-cards"></div>'); // This will hold the actual card DOM elements
             //console.log("HanimeComponent:", categoryTitle, "- buildLayout completed.");
        };


        this.fetchCatalog = function () {
             var _this = this;
             // Loader handled by the main component for the whole view
             // if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);

             console.log("HanimeComponent:", categoryTitle, "- fetchCatalog() - Starting request to", categoryUrl);

             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeComponent:", categoryTitle, "- Lampa.Reguest initialized.");
             }

             if (network && typeof network.clear === 'function') network.clear();
             else console.warn("HanimeComponent:", categoryTitle, "- Network clear method not available.");

             if(network && categoryUrl && typeof network.native === 'function'){
                network.native(categoryUrl,
                    function (data) {
                        //console.log("HanimeComponent:", categoryTitle, "- Catalog data received.");
                        if (data && data.metas && Array.isArray(data.metas)) {
                             if (data.metas.length > 0) {
                                _this.build(data.metas);
                             } else {
                                // Handle empty line - maybe show a message or hide the line?
                                console.log("HanimeComponent:", categoryTitle, "- Catalog is empty for this line.");
                                // Optional: Add an empty state message specific to this line
                                if (html && typeof html.find === 'function') {
                                     html.find('.items-line__body').empty().text('Нет элементов.');
                                }
                             }
                        } else {
                            console.error("HanimeComponent:", categoryTitle, "- Invalid data format from API.", data);
                            // Optional: Add an error message specific to this line
                             if (html && typeof html.find === 'function') {
                                html.find('.items-line__body').empty().text('Ошибка формата данных.');
                            }
                        }
                         // Loader handled by main component
                         // if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                         // Activity toggle handled by main component
                         // if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                    },
                    function (errorStatus, errorText) {
                         console.error("HanimeComponent:", categoryTitle, "- Failed to load catalog.", errorStatus, errorText);
                        // Optional: Add an error message specific to this line
                         if (html && typeof html.find === 'function') {
                             html.find('.items-line__body').empty().text('Ошибка загрузки: ' + errorStatus);
                         }
                         // Loader handled by main component
                         // if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                         // Activity toggle handled by main component
                         // if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                    },
                    false, { dataType: 'json', timeout: 15000 }
                );
             } else {
                 console.error("HanimeComponent:", categoryTitle, "- Cannot fetch catalog. Network component or categoryUrl missing.");
                  if (html && typeof html.find === 'function') {
                     html.find('.items-line__body').empty().text('Ошибка инициализации сети.');
                 }
                 // Loader/toggle handled by main component
                  // if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                  // if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
             }
        };

        // Builds the horizontal scroll line with cards
        this.build = function (result) {
             var _this = this;
             console.log("HanimeComponent:", categoryTitle, "- build() - Building UI with", result.length, "items.");

             // Initialize Horizontal Scroll
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                  scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
                  console.log("HanimeComponent:", categoryTitle, "- Lampa.Scroll initialized (horizontal).");
             }

             // Check for critical components before proceeding
              if (!(itemsContainer && typeof itemsContainer.empty === 'function' && scroll && typeof scroll.append === 'function' && typeof scroll.render === 'function' && html && typeof html.find === 'function' && typeof html.append === 'function' && window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function')) {
                  console.error("HanimeComponent:", categoryTitle, "- Missing critical dependencies in build(). Aborting UI build.");
                   // Loader/toggle handled by main component
                   return;
             }

            itemsContainer.empty(); // Clear previous cards if any
            items = []; // Clear previous item objects

            if (itemsContainer && scroll) {
                 result.forEach(function (meta) {
                    // Create HanimeCard instance, passing THIS component as componentRef
                    var card = new HanimeCard(meta, _this);
                    var cardElement = card.render(); // Get card DOM element

                     itemsContainer.append(cardElement); // Append card DOM to itemsContainer
                    items.push(card); // Store HanimeCard object
                });
                 console.log("HanimeComponent:", categoryTitle, "- Created and added", items.length, "cards to itemsContainer.");

                // Append the itemsContainer (which now contains all cards) to the Scroll
                // The Scroll component manages its own internal DOM structure
                scroll.append(itemsContainer);
                 // Append the Scroll's rendered DOM to the .items-line__body
                 html.find('.items-line__body').empty().append(scroll.render());


            } else {
                console.error("HanimeComponent:", categoryTitle, "- Required objects or methods missing before building cards.");
                if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка плагина при создании карточек линии.', 5000);
            }

            // Add listener for the "Еще" button AFTER the HTML is built and attached
             var moreButton = html.find('.items-line__more.selector');
             if(moreButton.length && typeof moreButton.on === 'function' && componentObject && typeof componentObject.onShowFullCategory === 'function') {
                 moreButton.on('hover:enter', function() {
                      console.log("HanimeComponent:", categoryTitle, "- 'Еще' button pressed. Notifying parent.");
                     // Notify parent component to show the full catalog for this category
                      componentObject.onShowFullCategory(categoryInfo);
                 });
                  console.log("HanimeComponent:", categoryTitle, "- 'Еще' button listener attached.");
             } else if (moreButton.length) {
                 // If parent method or Lampa.Activity.push is not available, hide or disable the button?
                 // For now, just log a warning.
                 console.warn("HanimeComponent:", categoryTitle, "- 'Еще' button or its methods, or parent callback (onShowFullCategory) not available. Cannot attach listener.");
                 // moreButton.remove(); // Or hide it
             }
        };

        // --- Callbacks delegated from HanimeCard ---
        // These methods are called by HanimeCard instances and delegate logic up to the parent (HanimeMainComponent)

        this.onCardClick = function(cardData) {
             console.log("HanimeComponent:", categoryTitle, "- Card clicked:", cardData.title);
            // Delegate click handling to parent component
            if (componentObject && typeof componentObject.onCardClick === 'function') {
                 componentObject.onCardClick(cardData);
             } else {
                  console.warn("HanimeComponent:", categoryTitle, "- Parent component object or onCardClick method missing.");
             }
        }

        this.showCardContextMenu = function(cardElement, cardData) {
             console.log("HanimeComponent:", categoryTitle, "- showCardContextMenu for", cardData.title);
            // Delegate context menu handling to parent component
             if (componentObject && typeof componentObject.showCardContextMenu === 'function') {
                 componentObject.showCardContextMenu(cardElement, cardData, this); // Pass 'this' line component for update callbacks
             } else {
                 console.warn("HanimeComponent:", categoryTitle, "- Parent component object or showCardContextMenu method missing.");
             }
         };

        // This is called by HanimeCard when it gets focus.
        // It's responsible for updating the *horizontal* scroll for THIS line.
        this.updateScrollToFocus = function(element) {
            //console.log("HanimeComponent:", categoryTitle, "- updateScrollToFocus() called.");
            // Update the horizontal scroll of THIS line
            if (scroll && typeof scroll.update === 'function' && element && typeof element.length === 'number' && element.length > 0) {
                last = element[0]; // Keep track of last focused item within this line
                scroll.update(element, true); // Update horizontal scroll
                //console.log("HanimeComponent:", categoryTitle, "- Horizontal scroll updated.");
            } else { console.warn("HanimeComponent:", categoryTitle, "- Scroll or element missing for horizontal scroll update."); }

            // Also notify the parent component's vertical scroll
            // No, the parent Controller handles vertical scroll implicitly based on focused element position.
            // We just need to ensure the current line element is known to the parent.
            // The parent's Controller.collectionSet points to the parent's vertical scroll render output.
            // Navigator.move('up') or 'down' will naturally find the next/prev horizontal line element.
        }

        // --- Standard Component Lifecycle Methods ---

        this.create = function () {
            console.log("HanimeComponent:", categoryTitle, "- create()");
            // Init Scroll and Network here as they are specific to this line
            if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' }); else if(!scroll) console.warn("Horizontal Scroll not init for", categoryTitle);
            if (!network && window.Lampa && typeof Lampa.Reguest === 'function') network = new Lampa.Reguest(); else if(!network) console.warn("Network not init for", categoryTitle);

            this.buildLayout(); // Build the DOM structure for this line

            // Fetch data for this specific line
            this.fetchCatalog();

             console.log("HanimeComponent:", categoryTitle, "- create() finished.");
        };

        // Start method for this line component - primarily used for controller binding,
        // but in a multi-line view, the *main* component manages the controller.
        // This start method might be less critical or unused depending on parent component design.
        this.start = function () {
            //console.log("HanimeComponent:", categoryTitle, "- start()");
            // No Controller setup here. Controller is managed by HanimeMainComponent.
            // Maybe restore last focus if needed?
            // If start is called when this line comes into view within parent vertical scroll:
            // Ensure horizontal scroll is ready?
             if (scroll && typeof scroll.update === 'function' && last) {
                  // Restore focus/scroll position if needed
                  // console.log("HanimeComponent:", categoryTitle, "- Restoring focus/scroll on start.");
                  // scroll.update($(last), false); // Update without animation?
             }
        };

        this.pause = function () {
             //console.log("HanimeComponent:", categoryTitle, "- pause()");
             // Save last focused element within this line when focus leaves it
             // This is handled by the hover:focus event calling updateScrollToFocus, which saves `last`.
        };

        this.stop = function () { //console.log("HanimeComponent:", categoryTitle, "- stop()");
            // Clean up line-specific resources if needed
        };

        this.render = function () { //console.log("HanimeComponent:", categoryTitle, "- render()");
            if (!html) { this.buildLayout(); }
            // The rendered output is the root items-line element
            return html;
        };

        this.destroy = function () {
            console.log("HanimeComponent:", categoryTitle, "- destroy() called.");
            if(network && typeof network.clear === 'function') network.clear(); network = null;
             if (items && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') Lampa.Arrays.destroy(items); items = null;
             if (scroll && typeof scroll.destroy === 'function') scroll.destroy(); scroll = null;
             if (html && typeof html.remove === 'function') html.remove(); html = null; itemsContainer = null; last = null; categoryInfo = null; componentObject = null;

            // This component does not manage the main Controller, so no Controller.remove needed here.
            console.log("HanimeComponent:", categoryTitle, "- destroy() finished.");
        };

        this.back = function () {
            // Back button handled by the main component
             console.log("HanimeComponent:", categoryTitle, "- back() called (should be handled by parent).");
        };

         // Method to update individual card's favorite icons (called by parent after favorite action)
         this.updateCardFavoriteIcons = function(cardElement) {
             var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
             if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') {
                 console.log("HanimeComponent:", categoryTitle, "- Updating favorite icons for a card.");
                 cardObj.updateFavoriteIcons();
             } else {
                 console.warn("HanimeComponent:", categoryTitle, "- Could not find card object to update icons.");
             }
         }
    }


    // --- HanimeFullCatalogComponent (Компонент полного списка аниме в виде сетки) ---
    // Отображает полный список аниме в виде вертикально прокручиваемой сетки.
    // Launched from "Еще" button.
    // componentObject - ссылка на Lampa.Activity
    // params - объект с параметрами, переданными при запуске (e.g., { title, categoryUrl, genre, ... })
    function HanimeFullCatalogComponent(componentObject, params) {
         var network = null; // Network component for fetching ALL data
         var scroll = null; // Vertical scroll component

         var items = []; // Array of HanimeCard objects
         var html = null; // Root DOM for this component - will be the Scroll's render
         var itemsContainer = null; // Container for cards within the scroll (.category-full)

         var active = 0;
         var last = null; // Last focused DOM element

         // Use the URL for the full catalog or a specific category passed in params
         var componentTitle = params.title || 'Весь каталог';
         var CATALOG_FETCH_URL = params.categoryUrl || CATALOG_URL_ALL;
         // If API supports pagination by page number:
         // CATALOG_FETCH_URL = params.categoryUrl || (API_BASE_URL + "/catalog/movie/all.json"); // Example
         // var paginationParameter = params.genre ? `&genre=${params.genre}` : ''; // Example parameter

         // Pagination state
         var currentPage = 1;
         var totalPages = 1; // Assume 1 page if API doesn't provide total pages
         var itemsPerPage = 50; // Estimate items per page if API doesn't provide count/pagination details
         var loadingMore = false;


         // Build the basic layout structure *inside* the scroll.
         // The scroll's render() will be the component's root html.
        this.buildLayout = function() {
             console.log("HanimeFullCatalogComponent:", componentTitle, "- buildLayout()");
            // Create the container for the vertical grid. Use standard Lampa class 'category-full'.
            // Cards will be appended directly into this container.
             itemsContainer = $('<div class="category-full"></div>');
             console.log("HanimeFullCatalogComponent:", componentTitle, "- itemsContainer (.category-full) created.");
        };

         // Fetch data for the full catalog (or a specific page/filter)
         this.fetchCatalog = function (page = 1) {
             var _this = this;
             // Check if API supports pagination and construct URL
             // Example with page parameter: var url = `${CATALOG_FETCH_URL.split('?')[0]}?page=${page}${paginationParameter}`;
             // If API is just a single list:
             var url = CATALOG_FETCH_URL; // Use the base URL for full list or category list

             // If not page 1 and we are already loading, do nothing
             if (page !== 1 && loadingMore) {
                  console.log("HanimeFullCatalogComponent:", componentTitle, "- Already loading page", page, "skipping.");
                 return;
             }

             // If fetching full list without pagination support, only fetch page 1
             if (page > 1 && CATALOG_FETCH_URL === CATALOG_URL_ALL) { // Assuming CATALOG_URL_ALL is a single list
                  console.log("HanimeFullCatalogComponent:", componentTitle, "- API does not support pagination for", CATALOG_FETCH_URL, ". Skipping fetch for page > 1.");
                 loadingMore = false;
                 // Remove needmore listener if it was attached
                 if (scroll && typeof scroll.off === 'function') scroll.off('needmore');
                 return;
             }


             loadingMore = true; // Set loading flag

             // Show loader only for the initial load (page 1)
             if (page === 1 && componentObject && typeof componentObject.loader === 'function') {
                  componentObject.loader(true);
             } else {
                  // Optional: Show a small loader at the bottom for pagination
                  // You might need to add a loading indicator DOM element below your grid for this
                   console.log("HanimeFullCatalogComponent:", componentTitle, "- Showing pagination loader (if implemented).");
             }


             console.log("HanimeFullCatalogComponent:", componentTitle, "- fetchCatalog() - Starting request for page", page, "to", url);

             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeFullCatalogComponent:", componentTitle, "- Lampa.Reguest initialized.");
             }

             // Clear previous requests only for initial load (page 1)
             if (page === 1 && network && typeof network.clear === 'function') network.clear();
             else if (network && typeof network.native === 'function') { /* Do not clear for pagination */ }
             else {
                  console.error("HanimeFullCatalogComponent:", componentTitle, "- Network component or native method missing.");
                  loadingMore = false;
                   if (page === 1 && componentObject && typeof componentObject.loader === 'function') componentObject.loader(false);
                   if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Сетевой компонент недоступен.', 5000);
                 return;
             }

              network.native(url, // Use the constructed URL with or without page param
                function (data) {
                     loadingMore = false; // Reset loading flag
                     // Hide initial loader
                    if (page === 1 && componentObject && typeof componentObject.loader === 'function') componentObject.loader(false);
                    // Hide pagination loader (if any)


                     //console.log("HanimeFullCatalogComponent:", componentTitle, "- Catalog data received for page", page, ":", data);
                    if (data && data.metas && Array.isArray(data.metas)) {
                         if (page === 1 && data.metas.length === 0) {
                             _this.empty("Каталог пуст.");
                         } else if (data.metas.length > 0) {
                             // Build or append data
                             _this.build(data.metas, page); // Pass page number to build
                             // If API provides total pages, update totalPages
                             // if(data.total_pages) totalPages = data.total_pages; // Example
                             // if(data.total_items && data.items_per_page) totalPages = Math.ceil(data.total_items / data.items_per_page); // Example
                             // For simple list API, assume 1 page total
                             totalPages = (CATALOG_FETCH_URL === CATALOG_URL_ALL) ? 1 : totalPages; // If full list URL, force totalPages to 1

                             currentPage = page; // Update current page after successful fetch
                         } else {
                              // If page > 1 and metas.length is 0, it's the end.
                              console.log("HanimeFullCatalogComponent:", componentTitle, "- Fetched page", page, "no more items.");
                              totalPages = currentPage; // Set total pages to current to stop future 'needmore'
                         }
                    } else {
                         if (page === 1) _this.empty("Неверный формат данных от API."); // Show error only for initial load
                        console.error("HanimeFullCatalogComponent:", componentTitle, "- Invalid data format from API for page", page, ".", data);
                         // For pagination error, might show a Noty instead of full empty state
                    }
                },
                function (errorStatus, errorText) {
                     loadingMore = false; // Reset loading flag
                     // Hide initial loader
                    if (page === 1 && componentObject && typeof componentObject.loader === 'function') componentObject.loader(false);
                     // Hide pagination loader (if any)

                     if (page === 1) _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                     else console.error("HanimeFullCatalogComponent:", componentTitle, "- Failed to load page", page, ".", errorStatus, errorText);
                     // For pagination error, might show Noty instead
                },
                false, // Do not cache API response URL by default
                { dataType: 'json', timeout: 15000 } // Expect JSON, 15s timeout
             );
         };

         // Build the UI for the full catalog grid
         this.build = function (result, page = 1) {
             var _this = this;
             console.log("HanimeFullCatalogComponent:", componentTitle, "- build() - Building UI for page", page, "with", result.length, "items.");

             // Initialize Vertical Scroll on the component's root DOM (which is scroll.render())
              // Need to initialize scroll only once in create or first build call
              if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                   // Default direction is vertical, no need to specify
                   // Use { container: html } if you want scroll to wrap html, but standard is scroll.render() is html
                   scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 }); // Vertical Scroll
                   console.log("HanimeFullCatalogComponent:", componentTitle, "- Lampa.Scroll initialized (vertical).");
              }

              // Check for critical components before proceeding
              if (!(itemsContainer && typeof itemsContainer.append === 'function' && scroll && typeof scroll.append === 'function' && window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function')) {
                  console.error("HanimeFullCatalogComponent:", componentTitle, "- Missing critical dependencies in build(). Aborting UI build.");
                   if (page === 1 && componentObject && typeof componentObject.loader === 'function') componentObject.loader(false);
                   if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Не удалось построить интерфейс.', 5000);
                  return;
             }


            // For page 1, clear the container and item objects array.
            if (page === 1) {
                 itemsContainer.empty(); // Удаляем предыдущие DOM elements
                 items = []; // Очищаем массив JS objects
                 console.log("HanimeFullCatalogComponent:", componentTitle, "- Cleared itemsContainer for page 1 build.");
             }

            // Создаем и добавляем новые HanimeCard для каждого элемента из данных.
            result.forEach(function (meta) {
                // Создаем новый экземпляр HanimeCard, передавая данные и ссылку на this компонента.
                var card = new HanimeCard(meta, _this); // Pass componentRef (this component)
                // Получаем DOM элемент карточки.
                var cardElement = card.render();

                 // Добавляем DOM элемент карточки в itemsContainer (.category-full grid).
                 itemsContainer.append(cardElement);
                // Сохраняем объект HanimeCard в массиве items.
                items.push(card);
            });
             console.log("HanimeFullCatalogComponent:", componentTitle, "- Added", result.length, "cards. Total items:", items.length);

             // Append the itemsContainer (the .category-full grid) to the Scroll's body IF NOT ALREADY appended
             // Scroll.append is usually called once in create or first build.
             // subsequent builds for pagination just append cards to itemsContainer, and scroll should auto-detect or need refresh.
             // A safer way might be to re-append itemsContainer to scroll body in build if it wasn't there,
             // or rely on Scroll.append being smart, or call scroll.update() if needed.
             // Let's try appending in create and then just adding cards to itemsContainer in build.

             // If page > 1, the Scroll might need an explicit update call to re-measure its content.
              if (page > 1 && scroll && typeof scroll.update === 'function') {
                  scroll.update(); // Re-measure all content after adding more cards
                   console.log("HanimeFullCatalogComponent:", componentTitle, "- Scroll updated after loading page", page);
              }


             // Hide initial loader (for page 1)
             if(page === 1 && componentObject && typeof componentObject.loader === 'function') componentObject.loader(false);
             // Hide pagination loader (if added)


            // Show the activity - only needed for the initial load (page 1)
             if(componentObject && typeof componentObject.toggle === 'function' && page === 1) componentObject.toggle();


            // Add pagination load trigger
             if (scroll && typeof scroll.on === 'function' && currentPage < totalPages) { // Check if pagination needed and more pages exist
                // Ensure we don't add multiple listeners
                scroll.off('needmore'); // Remove previous listener
                scroll.on('needmore', function() { // 'needmore' is a standard event in Scroll for pagination
                    console.log("HanimeFullCatalogComponent:", componentTitle, "- Scroll needs more data. Loading next page.");
                    if (!loadingMore && currentPage < totalPages) { // Prevent multiple concurrent loads and check if more pages are expected
                        _this.fetchCatalog(currentPage + 1); // Fetch next page
                    } else {
                         console.log("HanimeFullCatalogComponent:", componentTitle, "- Pagination trigger but already loading or no more pages.");
                    }
                });
                console.log("HanimeFullCatalogComponent:", componentTitle, "- Attached 'needmore' listener.");
             } else if (scroll) {
                 console.log("HanimeFullCatalogComponent:", componentTitle, "- Pagination not needed or already at last page. Detaching 'needmore' listener if any.");
                 if (typeof scroll.off === 'function') scroll.off('needmore');
             }
        };

         // --- Callbacks delegated from HanimeCard ---

         // Callback for card click in the full catalog grid
         this.onCardClick = function(cardData) {
             console.log("HanimeFullCatalogComponent:", componentTitle, "- Card clicked:", cardData.title);
            this.fetchStreamAndMeta(cardData.id, cardData);
         }

         // Callback for card context menu in the full catalog grid
         this.showCardContextMenu = function(cardElement, cardData) {
             // (Same implementation as HanimeComponent, handles favorite logic)
             console.log("HanimeFullCatalogComponent:", componentTitle, "- showCardContextMenu for", cardData.title);
             var _this = this;
             // Get currently focused controller name to restore focus after menu closes
             var enabled = (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;
             // Check current favorite status
             var status  = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(cardData) : {};

             var menu_favorite = [];
             if(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') {
                 // Standard favorite options
                 menu_favorite = [
                     { title: Lampa.Lang.translate('title_book'), where: 'book', checkbox: true, checked: status.book },
                     { title: Lampa.Lang.translate('title_like'), where: 'like', checkbox: true, checked: status.like },
                     { title: Lampa.Lang.translate('title_wath'), where: 'wath', checkbox: true, checked: status.wath },
                     { title: Lampa.Lang.translate('menu_history'), where: 'history', checkbox: true, checked: status.history },
                     { title: Lampa.Lang.translate('settings_cub_status'), separator: true, nofocus: true } // Separator option
                 ];
             } else { console.warn("Lampa.Lang missing, using English titles for context menu.");
                  menu_favorite = [
                     { title: 'Planned', where: 'book', checkbox: true, checked: status.book },
                     { title: 'Liked', where: 'like', checkbox: true, checked: status.like },
                     { title: 'Watching', where: 'wath', checkbox: true, checked: status.wath },
                     { title: 'History', where: 'history', checkbox: true, checked: status.history },
                     { title: 'Status', separator: true, nofocus: true }
                 ];
             }


             if (window.Lampa && Lampa.Select && typeof Lampa.Select.show === 'function') {
                 Lampa.Select.show({
                     title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('title_action') : 'Action',
                     items: menu_favorite,
                     onBack: ()=>{
                         // Restore focus to the component's controller after menu back
                         if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                         console.log("HanimeFullCatalogComponent:", componentTitle, "- Context menu back.");
                     },
                     onCheck: (a)=>{
                         // Called when a checkbox item is toggled
                         console.log("HanimeFullCatalogComponent:", componentTitle, "- Context menu checked:", a.where, "checked:", a.checked);
                         if(window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function'){
                              // Toggle the favorite status using Lampa's API
                             Lampa.Favorite.toggle(a.where, cardData);
                             // Find the corresponding HanimeCard object and update its icons
                             var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                              if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                         } else { console.warn("Lampa.Favorite.toggle missing."); }
                     },
                     onSelect: (a)=>{
                          // Called when a non-checkbox item is selected (e.g., separator, or future non-favorite options)
                          console.log("HanimeFullCatalogComponent:", componentTitle, "- Context menu selected:", a);
                          // If this was a checkbox disguised as select (less common but possible), handle it:
                          if(a.collect && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function'){
                              Lampa.Favorite.toggle(a.where, cardData);
                               var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                              if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                          }
                          // Close the select menu
                          if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                           // Restore focus to the component's controller
                           if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                            console.log("HanimeFullCatalogComponent:", componentTitle, "- Context menu closed.");
                     },
                      onDraw: (item, elem) => {
                          // Custom drawing logic for menu items (e.g., adding premium lock icon)
                           if (elem.collect && window.Lampa && Lampa.Account && typeof Lampa.Account.hasPremium === 'function' && !Lampa.Account.hasPremium()) {
                                let lockIconTemplate = (window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.has('icon_lock')) ? Lampa.Template.get('icon_lock') : null;
                                if (lockIconTemplate && window.$ && typeof item.find === 'function' && typeof item.append === 'function' && typeof item.off === 'function' && typeof item.on === 'function') {
                                     let wrap = $('<div class="selectbox-item__lock"></div>');
                                     wrap.append($(lockIconTemplate));
                                     item.find('.selectbox-item__checkbox').remove(); // Remove default checkbox for premium items
                                     item.append(wrap);
                                     // Prevent selecting premium item without premium account
                                     item.off('hover:enter').on('hover:enter', () => {
                                         if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                                          if (window.Lampa && Lampa.Account && typeof Lampa.Account.showCubPremium === 'function') Lampa.Account.showCubPremium();
                                     });
                                } else {
                                     console.warn("Hanime Full Catalog: icon_lock template or required methods missing for Premium item draw.");
                                }
                           }
                      }
                 });
             } else { console.warn("Hanime Full Catalog: Lampa.Select not available."); if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Компонент меню недоступен.', 5000); }
         };

         // This is called by HanimeCard when it gets focus.
         // It's responsible for updating the *vertical* scroll for THIS grid.
        this.updateScrollToFocus = function(element) {
             //console.log("HanimeFullCatalogComponent:", componentTitle, "- updateScrollToFocus called.");
             if (scroll && typeof scroll.update === 'function' && element && typeof element.length === 'number' && element.length > 0) {
                 last = element[0]; // Keep track of last focused item in this grid
                 scroll.update(element, true); // Update vertical scroll
                  //console.log("HanimeFullCatalogComponent:", componentTitle, "- Vertical Scroll updated.");
             } else { console.warn("HanimeFullCatalogComponent:", componentTitle, "- Scroll or element missing for vertical scroll update."); }
        }


        // Fetches stream and meta data for playback
        // This logic could potentially live in the main component or even a shared helper.
        this.fetchStreamAndMeta = function (id, meta) {
             var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

             // Use the activity loader provided by Lampa (passed as componentObject)
             if(componentObject && typeof componentObject.loader === 'function') componentObject.loader(true); else console.warn("Activity loader missing in Full Catalog.");

            console.log("HanimeFullCatalogComponent:", componentTitle, "- fetchStreamAndMeta for ID:", id);

            if (!network || typeof network.native !== 'function') {
                console.error("Network missing in Full Catalog.");
                 if(componentObject && typeof componentObject.loader === 'function') componentObject.loader(false);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Сетевой компонент недоступен.', 5000);
                return;
            }

            // Fetch stream and meta data concurrently
            Promise.all([
                new Promise((resolve, reject) => {
                    if(streamUrl && network) network.native(streamUrl, resolve, (xhr, status, error) => reject('Stream fetch failed: ' + status + ' ' + error), false, { dataType: 'json', timeout: 10000 });
                    else reject('Stream URL/Network unavailable');
                }),
                meta ? Promise.resolve({ meta: meta }) // If meta is already available, use it
                     : new Promise((resolve, reject) => { // Otherwise, fetch meta
                    if(metaUrl && network) network.native(metaUrl, resolve, (xhr, status, error) => reject('Meta fetch failed: ' + status + ' ' + error), false, { dataType: 'json', timeout: 10000 });
                    else reject('Meta URL/Network unavailable');
                })
            ]).then(([streamData, metaDataResponse]) => {
                 // Hide loader
                 if(componentObject && typeof componentObject.loader === 'function') componentObject.loader(false);

                const fullMetaData = metaDataResponse ? (metaDataResponse.meta || metaDataResponse) : null;
                //console.log("Stream data:", streamData, "Meta data:", fullMetaData);

                if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0]; // Assuming the first stream is the primary one
                    var finalStreamUrl = streamToPlay ? streamToPlay.url : null;

                    // Apply proxy if needed (e.g., for specific CDNs)
                    if(finalStreamUrl && PROXY_BASE_URL) {
                         try {
                             var url = new URL(finalStreamUrl);
                             // Example: Proxy only if hostname matches 'highwinds-cdn.com'
                             if (url.hostname && url.hostname.includes('highwinds-cdn.com')) {
                                  finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                                  console.log("HanimeFullCatalogComponent:", componentTitle, "- Applied proxy to stream URL.");
                             }
                         } catch (e) { console.error("HanimeFullCatalogComponent:", componentTitle, "- URL parse/proxy error:", e); }
                    }

                    // Prepare player object
                    var playerObject = {
                         title: fullMetaData ? (fullMetaData.name || fullMetaData.title || 'Без названия') : 'Без названия',
                         url: finalStreamUrl,
                         poster: fullMetaData ? (fullMetaData.poster || fullMetaData.background || '') : '',
                         // Add other relevant meta data for player/history if needed
                         timeline: fullMetaData ? { // Add timeline data structure if available
                             id: fullMetaData.id,
                             title: fullMetaData.name || fullMetaData.title,
                             // Add other relevant timeline fields like season, episode, etc. if applicable
                         } : undefined
                    };

                    if (playerObject.url && window.Lampa && Lampa.Player && typeof Lampa.Player.play === 'function' && typeof Lampa.Player.playlist === 'function') {
                         console.log("HanimeFullCatalogComponent:", componentTitle, "- Launching player.");
                         Lampa.Player.play(playerObject); // Start playback
                         Lampa.Player.playlist([playerObject]); // Set playlist (can be just one item)

                         // Add item to history using Lampa.Favorite or Lampa.Timeline
                         if (fullMetaData && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                                // Construct history meta object with required fields
                                const historyMeta = {
                                     id: fullMetaData.id || '',
                                     title: fullMetaData.name || fullMetaData.title || '',
                                     poster: fullMetaData.poster || fullMetaData.background || '',
                                     // Add other fields Lampa uses for history/favorites:
                                     runtime: fullMetaData.runtime, // assuming exists
                                     year: fullMetaData.year,     // assuming exists
                                     original_name: fullMetaData.original_name || '', // assuming exists
                                     // type: fullMetaData.type // Lampa uses 'movie' or 'tv'
                                };
                                Lampa.Favorite.add('history', historyMeta); // Type 'history', data, optional time watched (e.g., 100 for full)
                                console.log("HanimeFullCatalogComponent:", componentTitle, "- Added to history:", historyMeta.title);
                         } else { console.warn("Lampa.Favorite or add method missing. Cannot add to history."); }

                    } else {
                        console.error("HanimeFullCatalogComponent:", componentTitle, "- Player component or stream URL missing.");
                        if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show(playerObject.url ? 'Компонент плеера недоступен.' : 'Не удалось получить ссылку на поток.', 5000);
                    }

                } else {
                    console.warn("HanimeFullCatalogComponent:", componentTitle, "- No streams found for ID:", id);
                    if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Потоки не найдены для этого аниме.', 5000);
                }

            }).catch(error => {
                 // Hide loader on error
                 if(componentObject && typeof componentObject.loader === 'function') componentObject.loader(false);
                console.error("HanimeFullCatalogComponent:", componentTitle, "- Error fetching stream/meta:", error);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'), 5000);
            });
        };

        // Displays an empty/error message
        this.empty = function (msg) {
             console.log("HanimeFullCatalogComponent:", componentTitle, "- empty() -", msg);
             // Use Lampa's Empty component if available
             if (window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function') {
                 var empty = new Lampa.Empty({ message: msg });
                 // The empty message should be appended to the itemsContainer (the .category-full div)
                 if(itemsContainer && typeof itemsContainer.empty === 'function' && typeof itemsContainer.append === 'function') {
                     itemsContainer.empty().append(empty.render(true));
                      console.log("HanimeFullCatalogComponent:", componentTitle, "- Rendered Lampa.Empty.");
                 } else {
                     console.warn("HanimeFullCatalogComponent:", componentTitle, "- itemsContainer missing for empty message.");
                 }
                 // Hide loader
                 if(componentObject && typeof componentObject.loader === 'function') componentObject.loader(false);
                 // Show activity (needed if empty state is the initial view)
                 if(componentObject && typeof componentObject.toggle === 'function') componentObject.toggle();
                 // Important: Set the start method to the empty component's start,
                 // so navigation from the empty screen works (e.g., Back button)
                 if (typeof empty.start === 'function') this.start = empty.start; else console.warn("Lampa.Empty start method missing.");

             } else {
                  console.warn("HanimeFullCatalogComponent:", componentTitle, "- Lampa.Empty missing. Basic text fallback.");
                  // Basic text fallback if Lampa.Empty is not available
                  if(itemsContainer && typeof itemsContainer.empty === 'function' && typeof itemsContainer.text === 'function') {
                      itemsContainer.empty().text(msg + ' (Empty component missing)');
                       console.log("HanimeFullCatalogComponent:", componentTitle, "- Rendered basic text empty message.");
                  } else {
                      console.warn("HanimeFullCatalogComponent:", componentTitle, "- itemsContainer missing, cannot display basic empty message.");
                  }
                  // Hide loader
                  if(componentObject && typeof componentObject.loader === 'function') componentObject.loader(false);
                  // Show activity
                  if(componentObject && typeof componentObject.toggle === 'function') componentObject.toggle();
                   // Fallback start method for Back button
                   this.start = function() {
                       console.log("HanimeFullCatalogComponent:", componentTitle, "- Fallback start called.");
                       if(window.Lampa && Lampa.Controller) {
                           // Add controller just for the back button
                           Lampa.Controller.add('content', { back: this.back });
                           Lampa.Controller.toggle('content');
                            console.log("HanimeFullCatalogComponent:", componentTitle, "- Fallback controller set.");
                       } else console.warn("Lampa.Controller missing, cannot add fallback back handler.");
                    }.bind(this); // Bind 'this'
             }
        };

        // --- Standard Component Lifecycle Methods ---

        this.create = function () {
            console.log("HanimeFullCatalogComponent:", componentTitle, "- create()");
            // Init Scroll and Network
            // Scroll will manage the main content area
            if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 }); else if(!scroll) console.warn("Vertical Scroll not init in Full Catalog.");
            if (!network && window.Lampa && typeof Lampa.Reguest === 'function') network = new Lampa.Reguest(); else if(!network) console.warn("Network not init in Full Catalog.");

            this.buildLayout(); // Create itemsContainer (.category-full grid)

            // Append the itemsContainer (which is the grid) to the Scroll's body.
            // The Scroll DOM will be the main component render output.
            if (scroll && itemsContainer && typeof scroll.append === 'function') {
                 scroll.append(itemsContainer);
                 console.log("HanimeFullCatalogComponent:", componentTitle, "- itemsContainer appended to Scroll.");
            } else {
                console.error("HanimeFullCatalogComponent:", componentTitle, "- Scroll or itemsContainer missing, cannot append.");
            }

            // Fetch data for the first page
            this.fetchCatalog(1);

             console.log("HanimeFullCatalogComponent:", componentTitle, "- create() finished.");
        };

        // Called by Lampa Activity Manager when this component becomes active.
        this.start = function () {
            console.log("HanimeFullCatalogComponent:", componentTitle, "- start()");
            // Check if this component's activity is actually the active one
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this) {
                 console.log("HanimeFullCatalogComponent:", componentTitle, "- start() called but not active activity.");
                 return;
             }
             console.log("HanimeFullCatalogComponent:", componentTitle, "- Activity active. Setting Controller for vertical grid.");

             // Set up Controller for Vertical Grid Navigation
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function' && scroll && typeof scroll.render === 'function') {

                 Lampa.Controller.add('content', {
                     toggle: function () {
                         console.log("HanimeFullCatalogComponent:", componentTitle, "- Controller toggle().");
                         // Set the controller's collection to the scroll's render output.
                         // The controller will find all .selector elements within the scroll's DOM.
                         Lampa.Controller.collectionSet(scroll.render());
                         // Set initial focus to the last focused item or the first available
                         Lampa.Controller.collectionFocus(last || false, scroll.render());
                         console.log("HanimeFullCatalogComponent:", componentTitle, "- Controller set/focus finished.");
                     }.bind(this), // Bind toggle method to 'this' component instance

                     // Navigation methods for a vertical grid:
                     left: function () {
                         // Move left within the current row (between columns)
                         if (window.Navigator && typeof Navigator.canmove === 'function' && Navigator.canmove('left')) Navigator.move('left');
                          // If at the leftmost element, move to the menu (if available)
                         else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('menu');
                          else console.log("HanimeFullCatalogComponent:", componentTitle, "- Nav left blocked.");
                     },
                     right: function () {
                         // Move right within the current row
                         if (window.Navigator && typeof Navigator.canmove === 'function' && Navigator.canmove('right')) Navigator.move('right');
                          else console.log("HanimeFullCatalogComponent:", componentTitle, "- Nav right blocked.");
                     },
                     up: function () {
                         // Move up to the previous row or to the Header
                         if (window.Navigator && typeof Navigator.canmove === 'function' && Navigator.canmove('up')) Navigator.move('up');
                          // If at the top row, move to the Header (if available)
                         else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('head');
                          else console.log("HanimeFullCatalogComponent:", componentTitle, "- Nav up blocked.");
                     },
                     down: function () {
                         // Move down to the next row
                         // Navigator.move handles finding the next .selector downwards
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('down')) {
                              Navigator.move('down');
                              // The Scroll's 'needmore' event listener handles loading more data when nearing the end.
                         } else { console.log("HanimeFullCatalogComponent:", componentTitle, "- Nav down blocked."); } // If no more rows below
                     },
                     back: this.back.bind(this) // Bind back method
                 });
                 // Set the controller to 'content' for this component
                 Lampa.Controller.toggle('content');
                 console.log("HanimeFullCatalogComponent:", componentTitle, "- Controller 'content' toggled.");
             } else {
                console.error("HanimeFullCatalogComponent:", componentTitle, "- CRITICAL: Controller or scroll missing in start(). Cannot setup main Controller.");
                 // Fallback: Add basic controller for Back if possible
                 if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                     console.log("HanimeFullCatalogComponent:", componentTitle, "- Attempting to add basic Controller for Back button.");
                     Lampa.Controller.add('content', { back: this.back.bind(this) });
                     Lampa.Controller.toggle('content');
                 } else console.warn("HanimeFullCatalogComponent:", componentTitle, "- Lampa.Controller missing, cannot add basic back handler.");
            }
        };

        // Called by Lampa Activity Manager when another component becomes active.
        this.pause = function () {
             console.log("HanimeFullCatalogComponent:", componentTitle, "- pause()");
             // Save the currently focused element if the controller is active for this component
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') {
                 last = Lampa.Controller.item() || last; // Save current item, fallback to previous saved
                  console.log("HanimeFullCatalogComponent:", componentTitle, "- Paused. Saved last focused item:", last);
             } else {
                  //console.log("HanimeFullCatalogComponent:", componentTitle, "- Pause - content controller not active or Controller.item missing. Last focus not saved.");
             }
        };

        // Called by Lampa Activity Manager when this component is removed from the stack.
        this.stop = function () { //console.log("HanimeFullCatalogComponent:", componentTitle, "- stop()");
            // Clean up resources specific to this component that should not persist
        };

        // Called by Lampa to get the DOM element for this component.
        this.render = function () { //console.log("HanimeFullCatalogComponent:", componentTitle, "- render()");
            // If scroll wasn't created in create (e.g., due to error), try creating it now.
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                  console.warn("HanimeFullCatalogComponent:", componentTitle, "- Scroll was not created in create(), creating now in render().");
                  scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
                  if (itemsContainer && typeof scroll.append === 'function') {
                      scroll.append(itemsContainer);
                      console.log("HanimeFullCatalogComponent:", componentTitle, "- itemsContainer appended to Scroll during render.");
                  } else {
                       console.error("HanimeFullCatalogComponent:", componentTitle, "- itemsContainer missing, cannot append to Scroll in render.");
                  }
             }

            // The rendered output of a list/grid component is typically the Scroll's DOM.
             if(scroll && typeof scroll.render === 'function') {
                 return scroll.render();
             } else {
                  // Fallback if scroll is not available. Return the grid container directly.
                  console.warn("HanimeFullCatalogComponent:", componentTitle, "- Scroll not available in render, returning itemsContainer directly as fallback.");
                 return itemsContainer || $('<div>Error rendering component</div>'); // Return itemsContainer or a basic error message
             }
        };

        // Called by Lampa Activity Manager when this component is destroyed.
        this.destroy = function () {
            console.log("HanimeFullCatalogComponent:", componentTitle, "- destroy() called.");
            // Clean up network requests
            if(network && typeof network.clear === 'function') network.clear(); network = null;
            // Destroy HanimeCard instances
             if (items && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') Lampa.Arrays.destroy(items); items = null;
             // Destroy Scroll instance
             if (scroll && typeof scroll.destroy === 'function') scroll.destroy(); scroll = null;
             // Remove itemsContainer DOM (if it wasn't already removed by scroll destroy)
             if (itemsContainer && typeof itemsContainer.remove === 'function') itemsContainer.remove(); itemsContainer = null;
             // Clear saved last focused element
             last = null;
             // Clear activity reference (passed as componentObject)
             componentObject = null;
             params = null; // Clear params

            // Clean up the Controller state if this component's controller was active
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function') {
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content') {
                      // Clear the collection set on the controller
                      Lampa.Controller.collectionSet([]);
                      console.log("HanimeFullCatalogComponent:", componentTitle, "- Cleared Controller collection.");
                 }
                 // Remove the controller bind for 'content' by this component
                 Lampa.Controller.remove('content');
                  console.log("HanimeFullCatalogComponent:", componentTitle, "- Controller removed.");
            } else { console.warn("Controller cleanup missing or unavailable."); }
            console.log("HanimeFullCatalogComponent:", componentTitle, "- destroy() finished.");
        };

        // Called by Lampa when the Back button is pressed while this component is active.
        this.back = function () {
             console.log("HanimeFullCatalogComponent:", componentTitle, "- back() called. Going backward in activity stack.");
             // Use Lampa's Activity.backward to go back to the previous activity (HanimeMainComponent)
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') {
                 Lampa.Activity.backward();
             } else {
                  console.warn("Lampa.Activity.backward missing.");
                  // Fallback if backward is not available? Maybe manual history manipulation?
                  // Or just log error as this is a critical Lampa function.
             }
        };

         // Method to update individual card's favorite icons (called after favorite action)
         this.updateCardFavoriteIcons = function(cardElement) {
             var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
             if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') {
                 console.log("HanimeFullCatalogComponent:", componentTitle, "- Updating favorite icons for a card.");
                 cardObj.updateFavoriteIcons();
             } else {
                 console.warn("HanimeFullCatalogComponent:", componentTitle, "- Could not find card object to update icons.");
             }
         }
    }

    // --- HanimeMainComponent (НОВЫЙ: Компонент главного экрана с несколькими категориями/линиями) ---
    // Этот компонент отображает несколько горизонтальных линий (HanimeComponent)
    // в одном вертикально прокручиваемом представлении.
    function HanimeMainComponent(componentObject) {
         var network = null; // Network component for fetching data (e.g., list of categories or data for lines)
         var scroll = null; // Vertical scroll component for the main view

         var lines = []; // Array of HanimeComponent instances
         var html = null; // Root DOM for this component (will be the Scroll's render)
         var itemsContainer = null; // Container for horizontal lines within the vertical scroll

         var active = 0;
         var last = null; // Last focused DOM element (a horizontal line element)

        // No specific CATALOG_URL here, as it will fetch data for each line based on CATEGORIES_CONFIG

        // Builds the structure for the main view (vertical scroll containing lines)
        this.buildLayout = function() {
             console.log("HanimeMainComponent: buildLayout()");
            // Create the container where horizontal lines will be appended.
            // This container will be managed by the vertical scroll.
             itemsContainer = $('<div></div>'); // Simple container div
             console.log("HanimeMainComponent: itemsContainer created.");
        };

         // Fetches data needed for the categories/lines.
         // Currently, it just uses the predefined CATEGORIES_CONFIG.
         // In a real-world scenario, it might fetch a list of categories from an API first.
         this.fetchData = function () {
             var _this = this;
             // Show global loader for the entire view load
             if(componentObject && typeof componentObject.loader === 'function') componentObject.loader(true);
             else console.warn("HanimeMainComponent: Activity loader missing in fetchData.");

             console.log("HanimeMainComponent: fetchData() - Using CATEGORIES_CONFIG to build lines.");

             // Assuming CATEGORIES_CONFIG is ready and contains info for lines
             if (CATEGORIES_CONFIG.length > 0) {
                 // For simplicity, we will just create HanimeComponent instances
                 // and let *each line component* fetch its own data.
                 // This avoids complex data fetching logic in the main component
                 // but means loaders/errors might be handled per-line or require careful coordination.
                 // Let's build the lines immediately based on config.
                 _this.build(CATEGORIES_CONFIG);

             } else {
                 _this.empty("Нет доступных категорий."); // Show empty state if no categories configured
             }

            // Hide global loader after lines are built (even if they are still fetching data)
             if(componentObject && typeof componentObject.loader === 'function') componentObject.loader(false);
            // Toggle activity to show the content
             if(componentObject && typeof componentObject.toggle === 'function') componentObject.toggle();

         };

         // Builds the UI by creating horizontal line components
         this.build = function (categories) {
             var _this = this;
             console.log("HanimeMainComponent: build() - Building UI with", categories.length, "categories.");

             // Initialize Vertical Scroll only once
              if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                   scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 }); // Vertical Scroll
                   console.log("HanimeMainComponent: Lampa.Scroll initialized (vertical).");
              }

              // Check for critical components before proceeding
              if (!(itemsContainer && typeof itemsContainer.empty === 'function' && scroll && typeof scroll.append === 'function' && window.Lampa)) {
                  console.error("HanimeMainComponent: Missing critical dependencies in build(). Aborting UI build.");
                   if (componentObject && typeof componentObject.loader === 'function') componentObject.loader(false);
                   if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Не удалось построить интерфейс.', 5000);
                  return;
             }

            itemsContainer.empty(); // Clear previous lines if any
            lines = []; // Clear previous line objects

            // Create and append HanimeComponent instances for each category
            categories.forEach(function (category) {
                if (category.type === 'line') { // Only create horizontal lines for specified types
                     // Create HanimeComponent instance, passing THIS main component as componentObject
                    var lineComponent = new HanimeComponent(_this, category);
                    var lineElement = lineComponent.render(); // Get the line's DOM element

                     itemsContainer.append(lineElement); // Append line DOM to itemsContainer
                    lines.push(lineComponent); // Store the HanimeComponent object
                     // The line component will fetch its own data and build its cards after create() is called.
                     // We need to call lineComponent.create() here or ensure it's called when lineElement is added to DOM?
                     // Lampa's Component lifecycle often expects create() to be called after instantiation.
                     if (typeof lineComponent.create === 'function') {
                         lineComponent.create();
                     } else {
                          console.warn("HanimeMainComponent:", category.title, "- Line component missing create method.");
                     }
                } else {
                     console.warn("HanimeMainComponent: Skipping category type:", category.type);
                }
            });
             console.log("HanimeMainComponent: Created and added", lines.length, "line components.");

             // Append the itemsContainer (which now contains all horizontal lines) to the Scroll's body.
             // The Scroll DOM will be the main component render output.
             // This should typically be done once in create or first build.
             if (scroll && itemsContainer && typeof scroll.append === 'function' && !scroll.render().find('.scroll__body').has(itemsContainer).length) {
                 scroll.append(itemsContainer); // Append itemsContainer to scroll body if not already there
                 console.log("HanimeMainComponent: itemsContainer appended to Scroll.");
            } else if (!scroll || !itemsContainer || typeof scroll.append !== 'function') {
                 console.error("HanimeMainComponent: Scroll or itemsContainer missing, cannot append lines.");
            } else {
                 console.log("HanimeMainComponent: itemsContainer already appended to Scroll.");
            }


             console.log("HanimeMainComponent: Build process completed.");

            // Loader and toggle handled in fetchData
        };

         // --- Callbacks delegated from HanimeLineComponent ---
         // These methods are called by the child HanimeLineComponent instances

         // Called when a card in any horizontal line is clicked
         this.onCardClick = function(cardData) {
             console.log("HanimeMainComponent: Card clicked:", cardData.title);
            // Delegate click handling to the common playback logic
            this.fetchStreamAndMeta(cardData.id, cardData);
         }

         // Called when context menu is requested for a card in any horizontal line
         // Pass the lineComponent that triggered the context menu, so we can call its update method later.
         this.showCardContextMenu = function(cardElement, cardData, lineComponent) {
             // (Same implementation as in HanimeFullCatalogComponent)
             console.log("HanimeMainComponent: showCardContextMenu for", cardData.title);
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
                     { title: Lampa.Lang.translate('settings_cub_status'), separator: true, nofocus: true }
                 ];
             } else { console.warn("Lampa.Lang missing, using English titles for context menu.");
                  menu_favorite = [
                     { title: 'Planned', where: 'book', checkbox: true, checked: status.book },
                     { title: 'Liked', where: 'like', checkbox: true, checked: status.like },
                     { title: 'Watching', where: 'wath', checkbox: true, checked: status.wath },
                     { title: 'History', where: 'history', checkbox: true, checked: status.history },
                     { title: 'Status', separator: true, nofocus: true }
                 ];
             }

             if (window.Lampa && Lampa.Select && typeof Lampa.Select.show === 'function') {
                 Lampa.Select.show({
                     title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('title_action') : 'Action',
                     items: menu_favorite,
                     onBack: ()=>{
                         if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                         console.log("HanimeMainComponent: Context menu back.");
                     },
                     onCheck: (a)=>{
                         console.log("HanimeMainComponent: Context menu checked:", a.where);
                         if(window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function'){
                              Lampa.Favorite.toggle(a.where, cardData);
                               // Find the line component and tell it to update the specific card's icons
                              if(lineComponent && typeof lineComponent.updateCardFavoriteIcons === 'function') {
                                  lineComponent.updateCardFavoriteIcons(cardElement);
                              } else {
                                  console.warn("HanimeMainComponent: Cannot find line component or its update method for icon refresh.");
                              }
                         }
                     },
                     onSelect: (a)=>{
                          console.log("HanimeMainComponent: Context menu selected:", a);
                          if(a.collect && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function'){
                              Lampa.Favorite.toggle(a.where, cardData);
                               if(lineComponent && typeof lineComponent.updateCardFavoriteIcons === 'function') {
                                  lineComponent.updateCardFavoriteIcons(cardElement);
                              }
                          }
                          if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                           if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                            console.log("HanimeMainComponent: Context menu closed.");
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
             } else { console.warn("HanimeMainComponent: Lampa.Select not available."); if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Компонент меню недоступен.', 5000); }
         };

         // Called by HanimeLineComponent when a card gets focus.
         // This method is responsible for updating the *vertical* scroll of the *main* view.
        this.updateScrollToFocus = function(element) {
             //console.log("HanimeMainComponent: updateScrollToFocus() called on card:", element[0]);
             // The element is a card DOM element within a horizontal line.
             // The main scroll is vertical. Lampa's vertical scroll updates automatically
             // as focus moves between different horizontal line elements.
             // We primarily need to save the last focused element for Controller.collectionFocus
             // when the component is resumed from pause.
             if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.item === 'function') {
                  last = Lampa.Controller.item() || last; // Save the currently focused DOM element (which is a card)
                  //console.log("HanimeMainComponent: Saved last focused item:", last);
             } else {
                  //console.warn("HanimeMainComponent: Controller.item missing, cannot save last focus.");
                  // Fallback: If we can't get the currently focused item from Controller,
                  // we rely on the element passed in by the card, but this might not be correct after navigation moves focus.
                  // Let's assume Controller.item is available when needed.
             }

             // No explicit scroll.update() needed here for the main vertical scroll.
             // Lampa's Controller/Navigator handles vertical scrolling as focus changes between rows.
             // The line component handles the horizontal scroll update *within* its row.
        }

        // Called by a HanimeLineComponent when its "Еще" button is clicked.
        this.onShowFullCategory = function(categoryInfo) {
             console.log("HanimeMainComponent: 'Еще' clicked for category:", categoryInfo.title);
             if (window.Lampa && typeof Lampa.Activity === 'object' && typeof Lampa.Activity.push === 'function') {
                 // Push the Full Catalog component activity
                 Lampa.Activity.push({
                     url: '', // Can pass URL if needed, but params is better for data
                     title: categoryInfo.title || 'Весь каталог', // Set activity title
                     component: 'hanime_full_catalog', // The component name for the full grid view
                     params: categoryInfo // Pass category info to the full catalog component
                 });
                  console.log("HanimeMainComponent: Pushed 'hanime_full_catalog' activity with params:", categoryInfo);
             } else {
                 console.error("HanimeMainComponent: Lampa.Activity.push missing. Cannot launch full catalog.");
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Компонент активности недоступен.', 5000);
             }
        }

         // Fetches stream and meta data for playback.
         // This logic is common and can live here in the main component.
        this.fetchStreamAndMeta = function (id, meta) {
             var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

             // Use the activity loader provided by Lampa (passed as componentObject)
             if(componentObject && typeof componentObject.loader === 'function') componentObject.loader(true); else console.warn("Activity loader missing in Main Component.");

            console.log("HanimeMainComponent: fetchStreamAndMeta for ID:", id);

            if (!network || typeof network.native !== 'function') {
                console.error("Network missing in Main Component.");
                 if(componentObject && typeof componentObject.loader === 'function') componentObject.loader(false);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Сетевой компонент недоступен.', 5000);
                return;
            }

             // Clear previous requests (important if multiple clicks happen quickly)
             if(network && typeof network.clear === 'function') network.clear();

            // Fetch stream and meta data concurrently
            Promise.all([
                new Promise((resolve, reject) => {
                    if(streamUrl && network) network.native(streamUrl, resolve, (xhr, status, error) => reject('Stream fetch failed: ' + status + ' ' + error), false, { dataType: 'json', timeout: 10000 });
                    else reject('Stream URL/Network unavailable');
                }),
                meta ? Promise.resolve({ meta: meta }) // If meta is already available, use it
                     : new Promise((resolve, reject) => { // Otherwise, fetch meta
                    if(metaUrl && network) network.native(metaUrl, resolve, (xhr, status, error) => reject('Meta fetch failed: ' + status + ' ' + error), false, { dataType: 'json', timeout: 10000 });
                    else reject('Meta URL/Network unavailable');
                })
            ]).then(([streamData, metaDataResponse]) => {
                 // Hide loader
                 if(componentObject && typeof componentObject.loader === 'function') componentObject.loader(false);

                const fullMetaData = metaDataResponse ? (metaDataResponse.meta || metaDataResponse) : null;
                //console.log("Stream data:", streamData, "Meta data:", fullMetaData);

                if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0]; // Assuming the first stream is the primary one
                    var finalStreamUrl = streamToPlay ? streamToPlay.url : null;

                    // Apply proxy if needed (e.g., for specific CDNs)
                    if(finalStreamUrl && PROXY_BASE_URL) {
                         try {
                             var url = new URL(finalStreamUrl);
                             // Example: Proxy only if hostname matches 'highwinds-cdn.com'
                             if (url.hostname && url.hostname.includes('highwinds-cdn.com')) {
                                  finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                                   console.log("HanimeMainComponent: Applied proxy to stream URL.");
                             }
                         } catch (e) { console.error("HanimeMainComponent: URL parse/proxy error:", e); }
                    }

                    // Prepare player object
                    var playerObject = {
                         title: fullMetaData ? (fullMetaData.name || fullMetaData.title || 'Без названия') : 'Без названия',
                         url: finalStreamUrl,
                         poster: fullMetaData ? (fullMetaData.poster || fullMetaData.background || '') : '',
                         // Add other relevant meta data for player/history if needed
                         timeline: fullMetaData ? { // Add timeline data structure if available
                             id: fullMetaData.id,
                             title: fullMetaData.name || fullMetaData.title,
                             // Add other relevant timeline fields like season, episode, etc. if applicable
                         } : undefined
                    };

                    if (playerObject.url && window.Lampa && Lampa.Player && typeof Lampa.Player.play === 'function' && typeof Lampa.Player.playlist === 'function') {
                         console.log("HanimeMainComponent: Launching player.");
                         Lampa.Player.play(playerObject); // Start playback
                         Lampa.Player.playlist([playerObject]); // Set playlist (can be just one item)

                         // Add item to history using Lampa.Favorite or Lampa.Timeline
                         if (fullMetaData && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                                // Construct history meta object with required fields
                                const historyMeta = {
                                     id: fullMetaData.id || '',
                                     title: fullMetaData.name || fullMetaData.title || '',
                                     poster: fullMetaData.poster || fullMetaData.background || '',
                                     // Add other fields Lampa uses for history/favorites:
                                     runtime: fullMetaData.runtime, // assuming exists
                                     year: fullMetaData.year,     // assuming exists
                                     original_name: fullMetaData.original_name || '', // assuming exists
                                     // type: fullMetaData.type // Lampa uses 'movie' or 'tv'
                                };
                                Lampa.Favorite.add('history', historyMeta); // Type 'history', data, optional time watched (e.g., 100 for full)
                                console.log("HanimeMainComponent: Added to history:", historyMeta.title);
                         } else { console.warn("Lampa.Favorite or add method missing. Cannot add to history."); }

                    } else {
                        console.error("HanimeMainComponent: Player component or stream URL missing.");
                        if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show(playerObject.url ? 'Компонент плеера недоступен.' : 'Не удалось получить ссылку на поток.', 5000);
                    }

                } else {
                    console.warn("HanimeMainComponent: No streams found for ID:", id);
                    if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Потоки не найдены для этого аниме.', 5000);
                }

            }).catch(error => {
                 // Hide loader on error
                 if(componentObject && typeof componentObject.loader === 'function') componentObject.loader(false);
                console.error("HanimeMainComponent: Error fetching stream/meta:", error);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'), 5000);
            });
        };


        // Displays an empty/error message for the main view
        this.empty = function (msg) {
             console.log("HanimeMainComponent: empty() -", msg);
             // Use Lampa's Empty component if available
             if (window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function') {
                 var empty = new Lampa.Empty({ message: msg });
                 // Append empty message to the itemsContainer (which is inside the scroll)
                 if(itemsContainer && typeof itemsContainer.empty === 'function' && typeof itemsContainer.append === 'function') {
                     itemsContainer.empty().append(empty.render(true));
                     console.log("HanimeMainComponent: Rendered Lampa.Empty.");
                 } else {
                      console.warn("HanimeMainComponent: itemsContainer missing for empty message.");
                 }
                 // Hide loader
                 if(componentObject && typeof componentObject.loader === 'function') componentObject.loader(false);
                 // Show activity (needed if empty state is the initial view)
                 if(componentObject && typeof componentObject.toggle === 'function') componentObject.toggle();
                 // Important: Set the start method to the empty component's start,
                 // so navigation from the empty screen works (e.g., Back button)
                 if (typeof empty.start === 'function') this.start = empty.start; else console.warn("Lampa.Empty start method missing.");

             } else {
                  console.warn("HanimeMainComponent: Lampa.Empty missing. Basic text fallback.");
                  // Basic text fallback if Lampa.Empty is not available
                  if(itemsContainer && typeof itemsContainer.empty === 'function' && typeof itemsContainer.text === 'function') {
                      itemsContainer.empty().text(msg + ' (Empty component missing)');
                       console.log("HanimeMainComponent: Rendered basic text empty message.");
                  } else {
                       console.warn("HanimeMainComponent: itemsContainer missing, cannot display basic empty message.");
                  }
                   // Hide loader
                  if(componentObject && typeof componentObject.loader === 'function') componentObject.loader(false);
                   // Show activity
                  if(componentObject && typeof componentObject.toggle === 'function') componentObject.toggle();
                   // Fallback start method for Back button
                   this.start = function() {
                       console.log("HanimeMainComponent: Fallback start called.");
                       if(window.Lampa && Lampa.Controller) {
                           // Add controller just for the back button
                           Lampa.Controller.add('content', { back: this.back.bind(this) });
                           Lampa.Controller.toggle('content');
                            console.log("HanimeMainComponent: Fallback controller set.");
                       } else console.warn("Lampa.Controller missing, cannot add fallback back handler.");
                    }.bind(this); // Bind 'this'
             }
        };


        // --- Standard Component Lifecycle Methods ---

        this.create = function () {
            console.log("HanimeMainComponent: create()");
            // Init Scroll and Network
            // Scroll will manage the main content area
            if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 }); else if(!scroll) console.warn("Vertical Scroll not init in Main Component.");
            if (!network && window.Lampa && typeof Lampa.Reguest === 'function') network = new Lampa.Reguest(); else if(!network) console.warn("Network not init in Main Component.");

            this.buildLayout(); // Create itemsContainer (div for holding lines)

            // Append the itemsContainer to the Scroll's body.
            // The Scroll DOM will be the main component render output.
             if (scroll && itemsContainer && typeof scroll.append === 'function') {
                 scroll.append(itemsContainer);
                 console.log("HanimeMainComponent: itemsContainer appended to Scroll.");
            } else {
                console.error("HanimeMainComponent: Scroll or itemsContainer missing, cannot append.");
            }


            // Fetch data (or use config) to build the lines
            this.fetchData();

             console.log("HanimeMainComponent: create() finished.");
        };


        this.start = function () {
            console.log("HanimeMainComponent: start()");
            // Check if this component's activity is actually the active one
             if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this) {
                 console.log("HanimeMainComponent: start() called but not active activity.");
                 return;
             }
             console.log("HanimeMainComponent: Activity active. Setting Controller for main view.");

             // Set up Controller for Vertical Scroll view containing horizontal lines
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function' && scroll && typeof scroll.render === 'function') {

                 Lampa.Controller.add('content', {
                     toggle: function () {
                         console.log("HanimeMainComponent: Controller toggle().");
                         // Set the controller's collection to the scroll's render output.
                         // The controller will find all .selector elements within the scroll's DOM.
                         // These selectors will be the cards *inside* the horizontal lines,
                         // and the "Еще" buttons.
                         Lampa.Controller.collectionSet(scroll.render());
                         // Set initial focus to the last focused item or the first available (.selector)
                         Lampa.Controller.collectionFocus(last || false, scroll.render());
                         console.log("HanimeMainComponent: Controller set/focus finished.");
                     }.bind(this), // Bind toggle method to 'this' component instance

                     // Navigation methods for a main view with multiple horizontal lines:
                     left: function () {
                         // Move left within the current horizontal line
                         if (window.Navigator && typeof Navigator.canmove === 'function' && Navigator.canmove('left')) Navigator.move('left');
                          // If at the leftmost element, move to the menu (if available)
                         else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('menu');
                          else console.log("HanimeMainComponent: Nav left blocked.");
                     },
                     right: function () {
                         // Move right within the current horizontal line
                         if (window.Navigator && typeof Navigator.canmove === 'function' && Navigator.canmove('right')) Navigator.move('right');
                          else console.log("HanimeMainComponent: Nav right blocked.");
                     },
                     up: function () {
                         // Move up to the previous horizontal line or to the Header
                         // Navigator.move handles finding the next .selector upwards, which will be in the previous line
                         if (window.Navigator && typeof Navigator.canmove === 'function' && Navigator.canmove('up')) Navigator.move('up');
                          // If at the top row, move to the Header (if available)
                         else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('head');
                          else console.log("HanimeMainComponent: Nav up blocked.");
                     },
                     down: function () {
                         // Move down to the next horizontal line
                         // Navigator.move handles finding the next .selector downwards, which will be in the next line
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('down')) {
                              Navigator.move('down');
                              // No 'needmore' event on the main vertical scroll in this structure,
                              // as each horizontal line loads its own fixed set of items initially.
                              // Pagination ('needmore') is relevant only in the Full Catalog Grid view.
                         } else { console.log("HanimeMainComponent: Nav down blocked."); } // If no more rows below
                     },
                     back: this.back.bind(this) // Bind back method
                 });
                 // Set the controller to 'content' for this component
                 Lampa.Controller.toggle('content');
                 console.log("HanimeMainComponent: Controller 'content' toggled.");

                  // Restore focus if there was a last focused element when pausing
                  if (last) {
                      // Use Controller.collectionFocus to restore focus within the scroll's DOM
                      Lampa.Controller.collectionFocus(last, scroll.render());
                      console.log("HanimeMainComponent: Restored focus to last item.");
                  }

            } else {
                console.error("HanimeMainComponent: CRITICAL: Controller or scroll missing in start(). Cannot setup main Controller.");
                 // Fallback: Add basic controller for Back if possible
                 if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                     console.log("HanimeMainComponent: Attempting to add basic Controller for Back button.");
                     Lampa.Controller.add('content', { back: this.back.bind(this) });
                     Lampa.Controller.toggle('content');
                 } else console.warn("HanimeMainComponent: Lampa.Controller missing, cannot add basic back handler.");
            }
        };

        // Called by Lampa Activity Manager when another component becomes active.
        this.pause = function () {
             console.log("HanimeMainComponent: pause()");
             // Save the currently focused element if the controller is active for this component
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') {
                 last = Lampa.Controller.item() || last; // Save current item, fallback to previous saved
                  console.log("HanimeMainComponent: Paused. Saved last focused item:", last);
             } else {
                  //console.log("HanimeMainComponent: Pause - content controller not active or Controller.item missing. Last focus not saved.");
             }
        };

        // Called by Lampa Activity Manager when this component is removed from the stack.
        this.stop = function () { //console.log("HanimeMainComponent: stop()");
            // Clean up resources specific to this component that should not persist
        };

        // Called by Lampa to get the DOM element for this component.
        this.render = function () { //console.log("HanimeMainComponent: render()");
            // If scroll wasn't created in create (e.g., due to error), try creating it now.
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                  console.warn("HanimeMainComponent: Scroll was not created in create(), creating now in render().");
                   this.buildLayout(); // Ensure itemsContainer exists
                  scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
                  if (itemsContainer && typeof scroll.append === 'function') {
                      scroll.append(itemsContainer);
                       console.log("HanimeMainComponent: itemsContainer appended to Scroll during render.");
                  } else {
                       console.error("HanimeMainComponent: itemsContainer missing, cannot append to Scroll in render.");
                  }
             }

            // The rendered output of a list/grid component is typically the Scroll's DOM.
             if(scroll && typeof scroll.render === 'function') {
                 return scroll.render();
             } else {
                  // Fallback if scroll is not available. Return the itemsContainer.
                  console.warn("HanimeMainComponent: Scroll not available in render, returning itemsContainer directly as fallback.");
                 return itemsContainer || $('<div>Error rendering component</div>'); // Return itemsContainer or a basic error message
             }
        };

        // Called by Lampa Activity Manager when this component is destroyed.
        this.destroy = function () {
            console.log("HanimeMainComponent: destroy() called.");
            // Clean up network requests
            if(network && typeof network.clear === 'function') network.clear(); network = null;
            // Destroy child HanimeLineComponent instances
             if (lines && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') Lampa.Arrays.destroy(lines); lines = null;
             // Destroy Scroll instance
             if (scroll && typeof scroll.destroy === 'function') scroll.destroy(); scroll = null;
             // Remove itemsContainer DOM (if it wasn't already removed by scroll destroy)
             if (itemsContainer && typeof itemsContainer.remove === 'function') itemsContainer.remove(); itemsContainer = null;
             // Clear saved last focused element
             last = null;
             // Clear activity reference (passed as componentObject)
             componentObject = null;

            // Clean up the Controller state if this component's controller was active
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function') {
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content') {
                      // Clear the collection set on the controller
                      Lampa.Controller.collectionSet([]);
                       console.log("HanimeMainComponent: Cleared Controller collection.");
                 }
                 // Remove the controller bind for 'content' by this component
                 Lampa.Controller.remove('content');
                 console.log("HanimeMainComponent: Controller removed.");
            } else { console.warn("Controller cleanup missing or unavailable."); }
            console.log("HanimeMainComponent: destroy() finished.");
        };

        // Called by Lampa when the Back button is pressed while this component is active.
        this.back = function () {
             console.log("HanimeMainComponent: back() called. Going backward in activity stack.");
             // Use Lampa's Activity.backward to go back to the previous activity (e.g., Main Menu)
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') {
                 Lampa.Activity.backward();
             } else {
                  console.warn("Lampa.Activity.backward missing.");
                  // Fallback needed? Maybe redirect to a known main screen?
             }
        };
    }


    // --- Глобальная функция инициализации плагина. ---
    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() invoked.");

         // Use a flag to prevent double initialization
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: plugin_hanime_catalog_ready flag already set. Skipping initialization.");
             return;
         }


        // --- Логика инициализации, зависящая от Lampa. Выполняется после 'appready'. ---
        function initializeLampaDependencies() {
             console.log("Hanime Plugin: initializeLampaDependencies() called.");

             // Критические проверки Lampa компонентов.
             if (!window.Lampa || typeof window.Lampa !== 'object' ||
                 !Lampa.Template || typeof Lampa.Template !== 'object' ||
                 !Lampa.Component || typeof Lampa.Component !== 'object' ||
                 !Lampa.Activity || typeof Lampa.Activity !== 'object' ||
                 !Lampa.Controller || typeof Lampa.Controller !== 'object' ||
                 !window.$ || typeof window.$ !== 'function' ||
                 !Lampa.Scroll || typeof Lampa.Scroll !== 'function' ||
                 !Lampa.Reguest || typeof Lampa.Reguest !== 'function' ||
                 !Lampa.Favorite || typeof Lampa.Favorite !== 'object' || // Favorite needed for icons/context menu
                 !Lampa.Select || typeof Lampa.Select !== 'object' ||     // Select needed for context menu
                 !Lampa.Lang || typeof Lampa.Lang !== 'object' ||         // Lang needed for translations
                 !Lampa.Player || typeof Lampa.Player !== 'object' ||     // Player needed for playback
                 !Lampa.Noty || typeof Lampa.Noty !== 'object'            // Noty needed for notifications
                )
             {
                  console.error("Hanime Plugin: CRITICAL: Required Lampa components missing after waiting for appready.");
                  // Display error notification if Noty is available
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка инициализации плагина: Компоненты Lampa недоступны. Обновите Lampa или плагин.', 15000);
                  }
                  return; // Stop initialization
             }
             console.log("Hanime Plugin: Required Lampa components checked OK.");

             // Устанавливаем глобальный флаг ПЛАГИНА после проверок Lampa.
              // This flag indicates that THIS specific plugin has initialized successfully with Lampa deps.
              if (!window.plugin_hanime_catalog_ready) {
                 window.plugin_hanime_catalog_ready = true;
                 console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag set.");
              } else {
                   // This case should ideally not happen if the initial check at startPlugin works.
                   console.warn("Hanime Plugin: plugin_hanime_catalog_ready flag was already set before initializeLampaDependencies completed.");
                   return; // Avoid re-initializing templates/components/menu if flag was somehow set early.
              }


             // --- 1. Определение СТАНДАРТНЫХ ВНУТРЕННИХ шаблонов Lampa (fallback). ---
             // Add directly using Lampa.Template.add. No has checks here as they are fallbacks.
             console.log("Hanime Plugin: Adding standard template fallbacks (card details, lock icon)...");
             if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                 // These templates might be provided by Lampa core, but add as fallbacks
                 Lampa.Template.add('card_vote_temp', '<div class="card__vote"></div>');
                 Lampa.Template.add('card_quality_temp', '<div class="card__quality"><div></div></div>');
                 Lampa.Template.add('card_year_temp', '<div class="card__age"></div>');
                 Lampa.Template.add('card_type_temp', '<div class="card__type"></div>');
                 Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
                  console.log("Standard template fallbacks added.");
             } else console.warn("Lampa.Template.add method missing, cannot add template fallbacks.");

             // --- 2. Определение ВАШЕГО шаблона карточки 'hanime-card'. ---
             // This template is used by HanimeCard. It must contain standard Lampa classes
             // and placeholders (.card__vote, .card__quality, .card__type, .card__age, .card__icons-inner).
             console.log("Hanime Plugin: Adding hanime-card template...");
              if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                 Lampa.Template.add('hanime-card', `
                     <div class="hanime-card card selector layer--visible layer--render">
                         <div class="card__view">
                             <!-- img src="./img/img_load.svg" class="card__img" alt="{title}" loading="lazy" / -->
                             <img data-img="{img}" src="./img/img_load.svg" class="card__img" alt="{title}" loading="lazy" /> <!-- Use data-img and set src in onVisible -->
                             <div class="card__icons">
                                 <div class="card__icons-inner"></div> <!-- Icons added here -->
                             </div>
                             <!-- Placeholders for details - populated by JS addDetails method -->
                              <div class="card__vote"></div>
                              <div class="card__quality"><div></div></div>
                              <div class="card__type"></div>
                              <!-- Marker is added dynamically -->
                         </div>
                         <div class="card__title">{title}</div>
                         <div class="card__age"></div> <!-- Year added here -->
                     </div>
                 `);
                  console.log("HanimeCard template added.");
             } else console.warn("Lampa.Template.add method missing, cannot add hanime-card template.");


             // --- 3. CSS Стили ---
             // Custom CSS is not included as requested. Relying on standard Lampa CSS classes.
             console.log("Hanime Plugin: Custom CSS REMOVED. Relying on standard Lampa styles for .card, .items-line, .category-full etc.");
             // If custom styles are needed, they should be injected here using Lampa.Controller.create('style', {...}) or similar.


             // --- 4. Регистрируем ВАШИ компоненты в Lampa Component Manager. ---
             // Register the Main Component and the Full Catalog Component.
             // The Line Component is used internally by the Main Component and doesn't need global registration.
             console.log("Hanime Plugin: Registering components HanimeMainComponent and HanimeFullCatalogComponent...");
             if (window.Lampa && Lampa.Component && typeof Lampa.Component.add === 'function') {
                 Lampa.Component.add('hanime_main_catalog', HanimeMainComponent); // Main component for multiple lines
                 Lampa.Component.add('hanime_full_catalog', HanimeFullCatalogComponent); // Full grid component
                 console.log("Components registered: hanime_main_catalog, hanime_full_catalog.");
             } else {
                 console.error("Lampa.Component.add missing. Cannot register components.");
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка плагина: Не удалось зарегистрировать компоненты.', 5000);
             }


             // --- 5. Добавляем пункт меню. ---
             // Add a menu item to launch the main component.
             console.log("Hanime Plugin: Calling addMenuItem()...");
             addMenuItem();
              console.log("addMenuItem() called from initializeLampaDependencies.");

              console.log("initializeLampaDependencies() finished.");
        }


        // --- Функция добавления пункта меню. ---
        // Adds a menu item to Lampa's main menu to launch HanimeMainComponent.
        function addMenuItem() {
             console.log("Hanime Plugin: addMenuItem() called.");

             // Strict check for required Lampa UI components before adding menu item
             if (!window.Lampa || !Lampa.Activity || !Lampa.Controller || !window.$ || !Lampa.Component || typeof Lampa.Component.get !== 'function') {
                  console.warn("Hanime Plugin: addMenuItem cannot proceed: Lampa UI components missing.");
                  return;
             }
             var menuList = $('.menu .menu__list').eq(0);
             if (!menuList.length) {
                 console.warn("Hanime Plugin: addMenuItem cannot proceed: Lampa menu DOM (.menu .menu__list) not found.");
                 return;
             }

             // Check if our MAIN component ('hanime_main_catalog') is registered
             var mainComponentRegistered = Lampa.Component.get('hanime_main_catalog');
             if (!mainComponentRegistered) {
                 console.warn("Hanime Plugin: addMenuItem skipping: Main component 'hanime_main_catalog' not registered.");
                 return;
             }

             // Prevent adding duplicate menu items
             if (menuList.find('.menu__text:contains("Hanime Catalog")').length > 0) {
                 console.log("Hanime Plugin: Menu item already exists. Skipping.");
                 return;
             }
             console.log("Hanime Plugin: Adding menu item DOM element.");

            // Create the menu item DOM element using standard Lampa classes
            var menu_item = $(`
                <li class="menu__item selector">
                    <div class="menu__ico">
                         <!-- Simple SVG icon, replace with a relevant one if you have -->
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">Hanime Catalog</div>
                </li>
            `);

            // Attach event listener for activation
            if (typeof menu_item.on === 'function' && typeof Lampa.Activity.push === 'function') {
                menu_item.on('hover:enter', function () {
                     console.log("Hanime Plugin: Menu item activated. Pushing 'hanime_main_catalog' activity.");
                    // Push the main component activity onto the stack
                    Lampa.Activity.push({
                        url: '', // No specific URL needed for the main view currently
                        title: 'Hanime Catalog', // Title for the activity header
                        component: 'hanime_main_catalog', // The name of the main component
                        page: 1 // Start page (relevant if main view itself was paginated, but not currently)
                    });
                     console.log("Hanime Plugin: Activity.push called for hanime_main_catalog.");
                });
                console.log("Hanime Plugin: 'hover:enter' listener attached to menu item.");
            } else {
                console.warn("Hanime Plugin: jQuery.on or Activity.push missing. Cannot attach menu item listener.");
            }

            // Append the menu item to the Lampa menu list
            menuList.append(menu_item);
            console.log("Hanime Plugin: Menu item DOM element added.");

             console.log("Hanime Plugin: addMenuItem finished.");
        }


        // --- ENTRY POINT: Wait for Lampa readiness ---
        console.log("Hanime Plugin: startPlugin() invoked. Setting up Lampa ready listener.");

         // Check the flag first before setting listener or calling directly
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: Flag already set at entry. Exiting.");
             return;
         }

         // Use the most reliable method to wait for Lampa ('app:ready' event)
         // If Lampa.Listener is available, use it.
         if (window.Lampa && typeof window.Lampa === 'object' && Lampa.Listener && typeof Lampa.Listener === 'object' && typeof Lampa.Listener.follow === 'function') {
             console.log("Hanime Plugin: Lampa Listener available. Subscribing to 'app:ready' event.");
             Lampa.Listener.follow('app', function (e) {
                 // Check for event type to be 'ready'
                 if (e.type === 'ready') {
                     console.log("Hanime Plugin: Lampa 'appready' event received. Calling initializeLampaDependencies.");
                     initializeLampaDependencies();
                 }
             });
         } else if (window.appready === true) { // Direct check for the appready flag (less reliable, but fallback)
             // Fallback A: Lampa is already ready when this script runs (can happen in some environments)
              console.warn("Hanime Plugin: Lampa Listener not available OR appready already true. Calling initializeLampaDependencies directly as fallback A.");
              initializeLampaDependencies(); // Call init directly

         } else {
             // Fallback B: Neither Listener nor appready is immediately available.
             // Attempting a delayed initialization. This is the least reliable and may fail.
             console.error("Hanime Plugin: Neither Listener nor 'appready' flag immediately available. Cannot reliably wait. Attempting delayed initialization as UNRELIABLE fallback B.");
             setTimeout(initializeLampaDependencies, 1000); // Try after 1 second
             console.log("Hanime Plugin: Delayed initialization fallback scheduled.");
         }

         console.log("Hanime Plugin: startPlugin() finished initial setup.");
    }

    // Execute the main function to start the plugin process
    startPlugin();

})();
