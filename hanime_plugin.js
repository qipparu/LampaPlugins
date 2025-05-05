javascript
(function () {
    'use strict';

    // --- Константы и общие настройки API ---
    var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
    // URL для получения списка КАТЕГОРИЙ аниме (замените на реальный эндпоинт вашего API)
    var API_URL_CATEGORIES = API_BASE_URL + "/categories.json"; // Пример: должен вернуть { categories: [{ id: 'latest', title: '...', url: '/catalog/latest.json' }, ...] }
    // Шаблоны URL для получения КАТАЛОГА по конкретной КАТЕГОРИИ
    var API_URL_CATALOG_TEMPLATE = API_BASE_URL + "/catalog/{id}.json"; // Пример: /catalog/latest.json
    // Шаблоны URL для получения СТРИМА и МЕТАДАННЫХ конкретного элемента
    var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
    var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";
    // Адрес вашего прокси
    var PROXY_BASE_URL = "http://77.91.78.5:3000";

    // --- HanimeCard компонента (Карточка одного элемента аниме) ---
    // Использует стандартные классы Lampa.
    function HanimeCard(data, componentRef) {
        // Обрабатываем данные из вашего API.
        var processedData = {
            id: data.id,
            title: data.name || data.title || 'Без названия',
            poster_path: data.poster || data.img, // URL картинки
            vote_average: data.vote_average || data.vote || null, // Рейтинг
            quality: data.quality || data.release_quality || null, // Качество (строка)
            release_year: ((data.year || data.release_date || '') + '').slice(0, 4), // Год
            type: data.first_air_date ? 'tv' : 'movie', // Тип (tv/movie)
            original_name: data.original_name
        };

         // Получаем HTML из шаблона 'hanime-card'. Он использует стандартные классы.
         // Детали (рейтинг, качество, год, тип) НЕ передаются напрямую сюда, а добавляются динамически.
        var cardTemplate = Lampa.Template.get('hanime-card', {
            img: processedData.poster_path, // Изображение
            title: processedData.title // Заголовок
        });
        var cardElement = $(cardTemplate); // jQuery-объект DOM-элемента.


        // --- Методы HanimeCard ---

        // Добавление иконки (закладка, история). Использует стандартные классы.
        this.addicon = function(name) {
            var iconsContainer = cardElement.find('.card__icons-inner');
            if (iconsContainer.length) {
                var icon = document.createElement('div');
                icon.classList.add('card__icon'); // Стандартный класс Lampa
                icon.classList.add('icon--'+name); // Специфичный класс для стилизации
                iconsContainer.append(icon);
            }
        }

         // Добавление/обновление деталей (рейтинг, качество, тип, год) динамически.
         // Вызывается после создания DOM-элемента карточки.
         this.addDetails = function() {
             var viewElement = cardElement.find('.card__view'); // Контейнер с картинкой
             if (!viewElement.length) return; // Важная проверка

             // Рейтинг: найти/создать .card__vote и заполнить
             let voteElement = cardElement.find('.card__vote');
             if (processedData.vote_average > 0 && voteElement.length) voteElement.text(parseFloat(processedData.vote_average).toFixed(1));
             else if (voteElement.length) voteElement.remove();

             // Качество: найти/создать .card__quality и заполнить
             let qualityElement = cardElement.find('.card__quality');
             if (processedData.quality && qualityElement.length) {
                  let qualityTextElement = qualityElement.find('div');
                  if(qualityTextElement.length) qualityTextElement.text(processedData.quality);
             } else if (qualityElement.length) qualityElement.remove();

             // Тип (TV/Movie): найти/создать .card__type и заполнить
             let typeElement = cardElement.find('.card__type');
             if (processedData.type && viewElement.length) {
                  if (!typeElement.length) { typeElement = $('<div class="card__type"></div>'); viewElement.append(typeElement); }
                  typeElement.text(processedData.type.toUpperCase());
             } else if (typeElement.length) typeElement.remove();

             // Год: найти .card__age и заполнить
             let ageElement = cardElement.find('.card__age');
             if (ageElement.length) {
                  if (processedData.release_year && processedData.release_year !== '0000') ageElement.text(processedData.release_year).show();
                  else ageElement.text('').hide();
             } else if (processedData.release_year && processedData.release_year !== '0000') {
                  // Fallback для динамического добавления года, если нет в шаблоне
                  let newAgeElement = $('<div class="card__age"></div>').text(processedData.release_year);
                   let titleElement = cardElement.find('.card__title');
                   if(titleElement.length) titleElement.after(newAgeElement);
                   else cardElement.append(newAgeElement);
                   console.warn("HanimeCard: .card__age added dynamically.");
             }
         }


        // Обновление иконок закладок и маркера состояния.
        this.updateFavoriteIcons = function() {
            cardElement.find('.card__icons-inner').empty();
            cardElement.find('.card__marker').remove();

             var status = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(processedData) : {};

            if (status.book) this.addicon('book');
            if (status.like) this.addicon('like');
            if (status.wath) this.addicon('wath');
            if (status.history || (window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched === 'function' && Lampa.Timeline.watched(processedData))) this.addicon('history');

             var marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];
             var activeMarker = marks.find(m => status[m]);

             if (activeMarker) {
                 var markerElement = cardElement.find('.card__marker');
                 if (!markerElement.length) {
                     markerElement = $('<div class="card__marker"><span></span></div>');
                     var viewElement = cardElement.find('.card__view');
                     if(viewElement.length) viewElement.append(markerElement); else console.warn("view missing.");
                 }
                 markerElement.find('span').text(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? Lampa.Lang.translate('title_' + activeMarker) : activeMarker);
                 markerElement.removeClass(marks.map(m => 'card__marker--' + m).join(' '))
                             .addClass('card__marker--' + activeMarker);
             } else { cardElement.find('.card__marker').remove(); }
        };

        // Вызывается Lampa, когда карточка становится видимой. Для отложенной загрузки картинок.
        this.onVisible = function() {
             var imgElement = cardElement.find('.card__img');
             if (imgElement.length && (!imgElement.attr('src') || imgElement.attr('src').includes('img_load.svg'))) {
                 var src = processedData.poster_path;
                 if (!src) src = './img/img_broken.svg';
                 if(window.Lampa && Lampa.ImageCache && typeof Lampa.ImageCache.read === 'function' && typeof Lampa.ImageCache.write === 'function') {
                      if(!Lampa.ImageCache.read(imgElement[0], src)) {
                          imgElement[0].onload = () => { cardElement.addClass('card--loaded'); Lampa.ImageCache.write(imgElement[0], imgElement[0].src); };
                          imgElement[0].onerror = () => { console.error('Img error:', src); imgElement.attr('src', './img/img_broken.svg'); if(window.Lampa && Lampa.Tmdb && typeof Lampa.Tmdb.broken === 'function') Lampa.Tmdb.broken(); };
                          imgElement.attr('src', src);
                      } else cardElement.addClass('card--loaded');
                 } else {
                      imgElement[0].onload = () => { cardElement.addClass('card--loaded'); };
                     imgElement[0].onerror = () => { console.error('Img error:', src); imgElement.attr('src', './img/img_broken.svg'); };
                     imgElement.attr('src', src); console.warn("ImageCache missing.");
                 }
             }
            this.updateFavoriteIcons(); // Update icons when visible
        }

        // Первоначальная настройка Card (привязка событий, добавление деталей)
        this.create = function(){
             if (cardElement.data('created')) return;

             if (typeof cardElement.on === 'function') {
                cardElement.on('hover:focus', function () {
                     if (componentRef && componentRef.updateScrollToFocus && typeof componentRef.updateScrollToFocus === 'function') {
                          componentRef.updateScrollToFocus(cardElement); // Delegate to parent to update scroll
                     }
                     this.update(); // Update icons/marker on focus
                }.bind(this));

                 cardElement.on('hover:enter', function () {
                     if (componentRef && componentRef.onCardClick && typeof componentRef.onCardClick === 'function') {
                         componentRef.onCardClick(processedData); // Delegate click to parent
                     }
                }.bind(this));

                cardElement.on('hover:long', function(){
                     if (componentRef && componentRef.showCardContextMenu && typeof componentRef.showCardContextMenu === 'function') {
                          componentRef.showCardContextMenu(cardElement, processedData); // Delegate context menu to parent
                     }
                 }.bind(this));
             } // else console.warn("jQuery on() missing.");


             this.card = cardElement[0]; // Native DOM element
             if (this.card && typeof this.card.addEventListener === 'function') {
                this.card.addEventListener('visible', this.onVisible.bind(this)); // Listen for Lampa visible event
             } //else console.warn("Visible listener missing.");

            // Add dynamic details and update icons shortly after DOM is created
             setTimeout(() => {
                  this.addDetails(); // Add rating, quality, type, year elements and data
                  this.updateFavoriteIcons(); // Update favorite/history icons and marker
                  // Add watched status bar logic if needed
                  // if(window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched_status === 'function') Lampa.Timeline.watched_status(cardElement, processedData);
             }, 0);

             cardElement.data('created', true);
        }

        // Update state (called on focus)
        this.update = function(){
             this.updateFavoriteIcons(); // Re-check favorites and update icons/marker
             // Update watched status bar if needed
             // if(window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched_status === 'function') Lampa.Timeline.watched_status(cardElement, processedData);
        }

        // Render method, creates and returns the DOM element
        this.render = function(js){
             if (!cardElement.data('created')) this.create(); // Create only on first render call
            return js ? cardElement[0] : cardElement;
        }

        // Destroy method
        this.destroy = function(){
             if(this.card && typeof this.card.removeEventListener === 'function' && this.onVisible) this.card.removeEventListener('visible', this.onVisible.bind(this));
             if(cardElement && typeof cardElement.remove === 'function') cardElement.remove();
             processedData = null; cardElement = null; this.card = null; componentRef = null;
        }

    }


    // --- HanimeLineComponent (Компонент одной горизонтальной линии категорий) ---
    // Это компоненты типа items-line. Будет несколько таких на главном экране.
    function HanimeLineComponent(categoryData, parentComponentRef) {
         // categoryData should contain { id: ..., title: ..., url: ... }
         var network = null;
         var scroll = null; // Horizontal Scroll for THIS line

         var items = []; // Array of HanimeCard objects
         var html = null; // Root DOM (.items-line)
         var itemsContainer = null; // Container for cards (.items-cards) within horizontal scroll

         var active = 0; // Last focused index in this line
         var last = null; // Last focused DOM element in this line

         // Use the catalog URL for this specific category
         var CATALOG_URL = categoryData.url ? (API_BASE_URL + categoryData.url) : null;


         // Build the DOM structure for a single horizontal category line
        this.buildLayout = function() {
             //console.log("HanimeLineComponent: buildLayout() for category:", categoryData.title);
            // Create the items-line structure, including title and "Еще" button
            html = $(`
                <div class="items-line layer--visible layer--render items-line--type-cards"> <!-- Standard items-line class -->
                    <div class="items-line__head"> <!-- Standard head for title and more -->
                        <div class="items-line__title">${categoryData.title || 'Без названия'}</div> <!-- Category title -->
                        <div class="items-line__more selector">Еще</div> <!-- "Еще" button - must have .selector -->
                    </div>
                    <div class="items-line__body"> <!-- Container for horizontal scroll content -->
                        <!-- Horizontal Scroll will be inserted here -->
                    </div>
                </div>
            `);
            // Create the container for cards that will go inside the horizontal scroll
             itemsContainer = $('<div class="items-cards"></div>'); // Standard items-cards class
             //console.log("HanimeLineComponent: buildLayout completed.");
        };


        // Fetch data for this category's line
        this.fetchCatalog = function () {
             var _this = this;

             // Only show loader on the main activity if it's loading the whole screen (optional)
             // Or implement a loader per line if needed for very slow lines

             console.log("HanimeLineComponent: fetchCatalog() - Starting request for category:", categoryData.title, "from", CATALOG_URL);

             // Ensure network is initialized
             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  //console.log("HanimeLineComponent: Lampa.Reguest initialized.");
             }

             if (network && typeof network.clear === 'function') network.clear(); // Clear previous requests

             // Make the API request for this category
             if(network && CATALOG_URL && typeof network.native === 'function'){
                network.native(CATALOG_URL,
                    function (data) {
                         //console.log("HanimeLineComponent: Catalog data received for", categoryData.title, ":", data);
                        if (data && data.metas && Array.isArray(data.metas)) {
                             if (data.metas.length > 0) {
                                _this.build(data.metas); // Build the line UI
                             } else {
                                 // If no items in this line, maybe hide the entire line? Or show an empty message in its place?
                                 // Hiding the line is common. Need to inform parentComponentRef.
                                  console.log("HanimeLineComponent: No items found for category:", categoryData.title, "Hiding line.");
                                 if (html && typeof html.hide === 'function') html.hide();
                                 // Or call parent method: if(parentComponentRef && parentComponentRef.hideLine) parentComponentRef.hideLine(_this);
                                  _this.destroyItems(); // Destroy any existing items just in case
                                 // Note: Should inform the parent component that this line has no items, so the vertical scroll collection can be updated.
                             }
                        } else {
                             console.error("HanimeLineComponent: Invalid data format for", categoryData.title, ".", data);
                              if (html && typeof html.hide === 'function') html.hide(); // Hide on error too
                             // Inform parent about error?
                        }
                    },
                    function (errorStatus, errorText) { // Error callback
                         console.error("HanimeLineComponent: Failed to load catalog for", categoryData.title, ".", errorStatus, errorText);
                          if (html && typeof html.hide === 'function') html.hide(); // Hide on error
                         // Inform parent about error?
                    },
                    false, // Do not cache by URL
                    { dataType: 'json', timeout: 15000 } // Expect JSON, 15s timeout
                );
             } else {
                 console.error("HanimeLineComponent: Network, CATALOG_URL, or native method missing for category:", categoryData.title);
                  if (html && typeof html.hide === 'function') html.hide(); // Hide if cannot fetch
                 // Inform parent?
             }
        };

        // Build the UI for this horizontal line with received data
        this.build = function (result) {
             var _this = this;
             console.log("HanimeLineComponent: build() for category:", categoryData.title, "with", result.length, "items.");

            // Initialize Horizontal Scroll for THIS line
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                   scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
                   //console.log("HanimeLineComponent: Horizontal Scroll initialized.");
             } else if (!scroll) { console.error("Horizontal Scroll not available."); return; } // Cannot proceed without scroll


             if(typeof scroll.minus === 'function') scroll.minus(); // Scroll to beginning

             // Ensure itemsContainer, scroll, and html structure are available.
             if (!(itemsContainer && typeof itemsContainer.empty === 'function' && scroll && typeof scroll.append === 'function' && typeof scroll.render === 'function' && html && typeof html.find === 'function' && typeof html.append === 'function' && window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function')) {
                  console.error("HanimeLineComponent: Missing critical DOM/Lampa dependencies in build(). Aborting UI build for", categoryData.title);
                  // Hide the line on error?
                  if (html && typeof html.hide === 'function') html.hide();
                  return;
             }


            // Clear existing items in this line
            itemsContainer.empty();
            items = [];

            // Create and add HanimeCards
             if (itemsContainer && scroll) { // Repeat essential check
                 result.forEach(function (meta) {
                    // Create HanimeCard, passing parentComponentRef (this LineComponent)
                    var card = new HanimeCard(meta, _this);
                    var cardElement = card.render(); // Get DOM element

                     itemsContainer.append(cardElement); // Add to container for horizontal scroll
                    items.push(card); // Add to items array
                });
                 //console.log("HanimeLineComponent: Created", items.length, "cards for", categoryData.title);

                // Add itemsContainer to THIS horizontal Scroll
                if (typeof scroll.append === 'function') scroll.append(itemsContainer);
                 else console.error("Scroll append method missing.");


                 // Insert the render of THIS horizontal Scroll into the items-line__body
                if (html && typeof html.find === 'function' && typeof html.append === 'function') {
                    html.find('.items-line__body').empty().append(scroll.render(true)); // true = redraw
                     //console.log("HanimeLineComponent: Horizontal Scroll rendered into items-line__body.");
                } else console.error("HTML find/append missing.");

            } else {
                 console.error("HanimeLineComponent: Required objects missing before building cards for", categoryData.title);
            }

            // Ensure the line is visible if it was previously hidden due to empty data/error
            if (html && typeof html.show === 'function') html.show();

            // ATTACH LISTENER TO THE "ЕЩЕ" BUTTON
            var moreButton = html.find('.items-line__more.selector'); // Find the Еще button by its standard class and selector class
             if(moreButton.length && typeof moreButton.on === 'function' && parentComponentRef && typeof parentComponentRef.showFullCatalog === 'function') {
                 moreButton.on('hover:enter', function() {
                      console.log("HanimeLineComponent: 'Еще' button pressed for category:", categoryData.title);
                     // Delegate showing the full catalog to the PARENT component
                     parentComponentRef.showFullCatalog(categoryData); // Pass the data of THIS category
                 });
                  console.log("HanimeLineComponent: 'Еще' button listener attached for", categoryData.title);
             } else {
                  console.warn("HanimeLineComponent: 'Еще' button, or parent showFullCatalog missing for", categoryData.title, ". Cannot attach listener.");
             }
             console.log("HanimeLineComponent: Build process completed for category:", categoryData.title);
        };


         // Callback for card click - delegate to parent
         this.onCardClick = function(cardData) {
             //console.log("HanimeLineComponent: Card clicked:", cardData.title);
             if (parentComponentRef && typeof parentComponentRef.onCardClick === 'function') {
                  parentComponentRef.onCardClick(cardData); // Parent component handles playing stream
             } else console.warn("HanimeLineComponent: Parent onCardClick missing.");
         }

         // Callback for card context menu - delegate to parent
         this.showCardContextMenu = function(cardElement, cardData) {
             //console.log("HanimeLineComponent: showCardContextMenu for", cardData.title);
             if (parentComponentRef && typeof parentComponentRef.showCardContextMenu === 'function') {
                 parentComponentRef.showCardContextMenu(cardElement, cardData); // Parent handles showing menu
             } else console.warn("HanimeLineComponent: Parent showCardContextMenu missing.");
         }

         // Callback for scrolling within THIS horizontal line
        this.updateScrollToFocus = function(element) {
             //console.log("HanimeLineComponent: updateScrollToFocus called for", categoryData.title);
             // Update THIS horizontal scroll
             if (scroll && typeof scroll.update === 'function' && element && typeof element.length === 'number' && element.length > 0) {
                 last = element[0]; // Save focused element within THIS line
                 scroll.update(element, true); // Scroll THIS line to the element
                 //console.log("Horizontal Scroll updated for", categoryData.title);
             } // else console.warn("Horizontal Scroll missing for update.");
        }


         // Basic component methods
        this.create = function () {
             console.log("HanimeLineComponent: create() for category:", categoryData.title);
             // Init Network (can be shared with parent, but init here for this component's needs)
              if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                   network = new Lampa.Reguest();
                   //console.log("Line Network initialized.");
              }

             this.buildLayout(); // Build the basic DOM structure
             // Fetch data after layout is built
             this.fetchCatalog();

             // Note: Line components do NOT have their own 'start', 'pause', 'stop', 'destroy' methods called directly by Lampa.
             // They are managed by the PARENT component (HanimeMainComponent).
             // They do not have their own Activity methods (loader, toggle).
        };

        this.destroyItems = function() {
            // Destroy individual Card instances within this line
             if (items && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') {
                 Lampa.Arrays.destroy(items); // Calls destroy() on each HanimeCard
                 console.log("HanimeLineComponent: Destroyed items for category:", categoryData.title);
             }
            items = []; // Clear array

            // Destroy THIS horizontal Scroll
             if (scroll && typeof scroll.destroy === 'function') {
                 scroll.destroy();
                 console.log("HanimeLineComponent: Destroyed horizontal scroll for category:", categoryData.title);
             }
             scroll = null;

             // Remove THIS LineComponent's root HTML from the DOM
             if (html && typeof html.remove === 'function') {
                  html.remove();
                  console.log("HanimeLineComponent: Removed html element for category:", categoryData.title);
             }
             html = null; itemsContainer = null; last = null; network = null;

             console.log("HanimeLineComponent: All resources cleared for category:", categoryData.title);
        }

        this.render = function () {
             // Make sure create is called on first render
             if (!html) { this.create(); } // Call create to build layout and fetch data

             return html; // Return the root DOM element of this line
        };

        // Lines don't manage Controller focus globally, the Parent does.
        // However, Parent might need to know which item *within* the focused line has focus.
        this.getLastFocus = function() { return last; } // Method to get last focused element within the line
        this.restoreFocus = function() {
             // Called by the Parent when THIS line receives vertical focus
             // We need to set the Controller focus back to the last item in this line,
             // or the first if none saved.
             // The Controller will handle calling hover:focus on the chosen item,
             // which in turn updates THIS horizontal scroll.

             if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.collectionFocus === 'function' && scroll && typeof scroll.render === 'function' && items && items.length > 0) {
                 var itemsDom = scroll.render().find('.selector'); // Get all focusable items in THIS line
                 var elementToFocus = last ? $(last) : $(itemsDom).first(); // Focus last or first item's DOM
                  console.log("HanimeLineComponent: Restoring focus for category:", categoryData.title, "To element:", elementToFocus[0]);
                 Lampa.Controller.collectionFocus(elementToFocus[0], scroll.render()); // Tell controller to focus it WITHIN this line's scroll DOM
             } else {
                  console.warn("HanimeLineComponent: Cannot restore focus for category:", categoryData.title, ". Controller or Scroll or items missing.");
             }

             // Ensure parent's vertical scroll is updated to show this line
             if (parentComponentRef && typeof parentComponentRef.updateVerticalScrollToFocus === 'function') {
                  parentComponentRef.updateVerticalScrollToFocus(this.render()); // Update vertical scroll to show this line's DOM root
             } else {
                  console.warn("HanimeLineComponent: Parent updateVerticalScrollToFocus missing.");
             }

        }


         this.getControllerCollections = function() {
             // Called by Parent to get the focusable elements within this line (the cards)
             // This helps the Parent set its *vertical* collection. However, Controller typically manages focus
             // BETWEEN items within a single collectionSet call.
             // A better approach for vertical scroll of horizontal lines: The Parent's collection
             // for the Vertical Scroll should be the ROOT DOM ELEMENTS OF THE HanimeLineComponents themselves.
             // When a line root is focused vertically, the Controller *then* needs to manage horizontal
             // focus *within* that line. This is handled by toggle/add controllers.

             // Let's try the simplified way: Parent Controller collectionSet = root DOM of Lines.
             // When a line is focused, THIS LineComponent takes over with its OWN horizontal Controller.

             // Revised approach for vertical scroll/horizontal lines:
             // - Main component has ONE vertical Scroll containing ROOTs of LineComponents.
             // - Main component sets its Vertical Controller's collectionSet to the ROOTs of LineComponents.
             // - Main component's Controller handles UP/DOWN navigation BETWEEN Line ROOTs.
             // - When a Line ROOT gets vertical focus (hover:focus event on line root? Or via custom vertical scroll logic?),
             //   THIS LineComponent needs to ADD its OWN HORIZONTAL Controller and toggle to it,
             //   setting ITS collectionSet to the cards WITHIN this line.
             // - Pressing UP/DOWN within a horizontal line should return focus control to the Parent's vertical controller.

             // This requires significant refactoring of Controller handling. Let's simplify first:
             // Assume Controller can navigate INTO a horizontal line component when it's vertically focused.
             // When vertical focus is on the Line's root, horizontal moves navigate cards inside.
             // When focus reaches horizontal edges, horizontal moves try to move vertically via Controller.toggle('parent_vertical_controller').

             // Let's make the Parent (HanimeMainComponent) responsible for both Vertical and Horizontal Controller state switching.


             // Instead, this method will help the PARENT component (HanimeMainComponent) manage its collection
             // of focusable elements *within* this line when *this line* is vertically active.
             // This might be overly complex. Revisit Lampa examples of category screens.

             // Standard approach: Parent sets collectionSet to ALL focusable elements on screen (cards in ALL lines).
             // Lampa Controller handles vertical and horizontal moves automatically based on element positions.
             // In this case, this line needs a reference back to the main Scroll so cards in THIS line
             // can call scroll.update() on the MAIN vertical scroll.

             // Correcting HanimeCard `updateScrollToFocus` calls: They should call Scroll.update on the MAIN vertical scroll!
             // Passing the ROOT DOM of the *LineComponent* to the main scroll update ensures the whole line is visible.

             // Let's refine HanimeCard `updateScrollToFocus` - it should update the MAIN vertical scroll to show the LINE.
             // And ALSO update the Line's *horizontal* scroll to show the *card*.
         }

         // Initialize upon creation
         this.create();
    }


    // --- HanimeGridComponent (Компонент полного списка элементов категории в виде СЕТКИ) ---
    // Это компонент типа category-full. Запускается по кнопке "Еще".
    function HanimeGridComponent(componentObject) {
         var network = null;
         var scroll = null; // Vertical scroll for THIS grid

         var items = []; // Array of HanimeCard objects
         var html = null; // Root DOM (category-full)

         var active = 0;
         var last = null; // Last focused DOM element

         // Category data passed via Lampa.Activity.push in componentObject.
         // Assume componentObject has componentParams { categoryId: '...', categoryTitle: '...', categoryUrl: '/catalog/...' }
         var categoryData = componentObject.componentParams; // Access data passed from Activity.push
         var CATALOG_URL = categoryData.categoryUrl ? (API_BASE_URL + categoryData.categoryUrl) : null;


         // Build the basic layout (container for the vertical grid)
        this.buildLayout = function() {
             console.log("HanimeGridComponent: buildLayout() for category:", categoryData.categoryTitle);
            // Create a container for the vertical grid. Use standard Lampa class 'category-full'.
            // The Scroll component will wrap this container.
            html = $(`<div class="category-full"></div>`); // Standard class for a full category grid
             // itemsContainer is the root html element for this component as it's a single scrollable grid
             console.log("HanimeGridComponent: buildLayout completed.");
        };


         // Fetch data for this specific category grid
         this.fetchCatalog = function () {
             var _this = this;
             // In a full category grid, fetching might involve pagination.
             // Let's fetch all data for simplicity first, assuming API /catalog/{id}.json returns ALL.
             // If pagination is needed, implement it here based on API (page parameter).
             var url = CATALOG_URL; // URL for the full catalog of this category

             // Show initial loader
             if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
              else console.warn("Activity loader missing.");

             console.log("HanimeGridComponent: fetchCatalog() - Starting request for category:", categoryData.categoryTitle, "from", url);

             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest(); console.log("Grid Network initialized.");
             }
             if (network && typeof network.clear === 'function') network.clear(); // Clear previous requests

              if(network && url && typeof network.native === 'function'){
                 network.native(url,
                    function (data) {
                         if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); // Hide loader
                         //console.log("HanimeGridComponent: Catalog data received for", categoryData.categoryTitle, ":", data);
                        if (data && data.metas && Array.isArray(data.metas)) {
                             if (data.metas.length > 0) {
                                 // Build the grid UI with all data received
                                 // No pagination logic in this build for simplicity.
                                _this.build(data.metas);
                             } else {
                                 // Empty state for this category
                                 _this.empty("Каталог пуст.");
                             }
                        } else {
                            _this.empty("Неверный формат данных от API.");
                            console.error("HanimeGridComponent: Invalid data format for", categoryData.categoryTitle, ".", data);
                        }
                    },
                    function (errorStatus, errorText) {
                         if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                         _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                         console.error("HanimeGridComponent: Failed to load catalog for", categoryData.categoryTitle, ".", errorStatus, errorText);
                    },
                    false, // No cache by URL
                    { dataType: 'json', timeout: 15000 } // JSON, timeout
                 );
             } else {
                 console.error("HanimeGridComponent: Network, URL, or native method missing for category:", categoryData.categoryTitle);
                  if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                   _this.empty("Не удалось загрузить каталог. Ошибка.");
             }
         };


         // Build the UI for the full grid with received data
         this.build = function (result) {
             var _this = this;
             console.log("HanimeGridComponent: build() for", categoryData.categoryTitle, "with", result.length, "items.");

             // Initialize Vertical Scroll
              if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                   scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 }); // Vertical Scroll (default direction)
                   console.log("HanimeGridComponent: Vertical Scroll initialized.");
              } else if (!scroll) { console.error("Vertical Scroll not available."); return; }

             // Clear existing items
             if(html && typeof html.empty === 'function') html.empty(); else { console.error("HTML element missing."); return; }
            items = []; // Clear items array

            // Add HanimeCards to the root html element (.category-full)
             if (html && scroll) { // Check if HTML and Scroll are available
                 result.forEach(function (meta) {
                    // Create HanimeCard, passing parentComponentRef (this GridComponent)
                    var card = new HanimeCard(meta, _this);
                    var cardElement = card.render(); // Get DOM element

                    html.append(cardElement); // Add card directly to the root (category-full)
                    items.push(card); // Add to items array
                });
                 console.log("HanimeGridComponent: Added", items.length, "cards to grid.");

                // The Scroll needs to wrap the html element.
                // We build the grid (html), THEN let scroll append its content to html,
                // and then append the scroll's root DOM somewhere else? No.

                // The standard pattern for category-full is:
                // A container div wraps the scroll.
                // The scroll contains the category-full grid.

                // Correct structure for render: html -> scroll -> category-full (our items)
                // So, buildLayout just creates itemsContainer (<div class="category-full">)
                // and build appends cards to itemsContainer.
                // render returns scroll.render(itemsContainer). Let's adjust.


                // This build method populates itemsContainer (the category-full div) with cards.
                // The scroll component's render method will be called by Lampa's activity system.
                // Lampa's render method will provide the final wrapping structure.

                // The build method itself only populates the list of items and updates internal state.
                // It doesn't manage the final DOM structure or attach Scroll rendering directly here.
                // Let's rethink build and render based on this.

                // Okay, let's follow the example DOM structure provided earlier for full category:
                // <div class="activity__body"> <div> <div class="scroll"> <div class="scroll__content"> <div class="scroll__body"> <div class="category-full"> [CARDS] </div> </div> </div> </div> </div> </div>
                // So, the 'category-full' IS INSIDE scroll__body.

                // HanimeGridComponent will build the 'category-full' structure first,
                // then attach cards to it, then when rendered, wrap it in the Scroll.

                // Reworking `buildLayout` and `render` methods based on this.

            } else {
                 console.error("HanimeGridComponent: HTML element or Scroll missing for build process.");
                  if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                   if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Не удалось построить интерфейс.', 5000);
            }

            // Note: Pagination loading more trigger would be added here or in start
             // (on Scroll 'needmore' event).

             console.log("HanimeGridComponent: Build completed for", categoryData.categoryTitle);

            // Show the activity (will be called by Lampa after render/create/start)
             if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
        };


         // Callback for card click - delegate to the parent component launching this grid
         this.onCardClick = function(cardData) {
             console.log("HanimeGridComponent: Card clicked:", cardData.title);
            this.fetchStreamAndMeta(cardData.id, cardData); // GridComponent handles stream fetch
         }

         // Callback for card context menu - GridComponent handles showing the menu
         this.showCardContextMenu = function(cardElement, cardData) {
             // (Same implementation as HanimeLineComponent and HanimeMainComponent)
             console.log("HanimeGridComponent: showCardContextMenu for", cardData.title);
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


         // Callback for scrolling (Vertical)
        this.updateScrollToFocus = function(element) {
             console.log("HanimeGridComponent: updateScrollToFocus called.");
             if (scroll && typeof scroll.update === 'function' && element && typeof element.length === 'number' && element.length > 0) {
                 last = element[0];
                 scroll.update(element, true); // Vertical scroll update uses same syntax
                  console.log("Grid Scroll updated.");
             } else { console.warn("Scroll or element missing for scroll update."); }
        }

        // Fetch stream and meta - HanimeGridComponent handles this
        this.fetchStreamAndMeta = function (id, meta) {
             // (Same implementation as HanimeLineComponent)
             var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true); else console.warn("Activity loader missing.");
            console.log("HanimeGridComponent: fetchStreamAndMeta for ID:", id);
            if (!network || typeof network.native !== 'function') { console.error("Network missing."); if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Сетевой компонент недоступен.', 5000); return; }

            Promise.all([
                new Promise((resolve, reject) => { if(streamUrl && network) network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 }); else reject('Stream URL/Network unavailable'); }),
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => { if(metaUrl && network) network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 }); else reject('Meta URL/Network unavailable'); })
            ]).then(([streamData, metaDataResponse]) => {
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                const fullMetaData = metaDataResponse ? (metaDataResponse.meta || metaDataResponse) : null;
                if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0]; var finalStreamUrl = streamToPlay ? streamToPlay.url : null;
                    if(finalStreamUrl) { try { var url = new URL(finalStreamUrl); if (url.hostname && url.hostname.includes('highwinds-cdn.com') && PROXY_BASE_URL) finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`; } catch (e) { console.error("URL parse/proxy error:", e); } }
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
             console.log("HanimeGridComponent: empty() -", msg);
             if (window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function') {
                 var empty = new Lampa.Empty({ message: msg });
                 // Render Empty directly in the activity body? No, standard is replace root DOM.
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


         // Standard Lampa Component methods: create, start, pause, stop, render, destroy, back

        this.create = function () {
            console.log("HanimeGridComponent: create()");
            // Init Scroll and Network (can be shared across components, but init here for component needs)
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                 scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 }); // Vertical Scroll (default)
                 console.log("Grid Scroll initialized in create().");
             } else if(!scroll) console.warn("Grid Scroll not init in create.");
             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                 network = new Lampa.Reguest(); console.log("Grid Network initialized.");
             } else if(!network) console.warn("Grid Network not init in create.");

            this.buildLayout(); // Build html (.category-full)
            if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(true);

            // Fetch data for this specific category grid
            this.fetchCatalog(); // Starts fetching page 1 if implementing pagination


             console.log("HanimeGridComponent: create() finished. Fetching catalog initiated.");
        };


        this.start = function () {
            console.log("HanimeGridComponent: start() for category:", categoryData.categoryTitle);
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this.activity) { console.log("Not active activity."); return; }
             console.log("HanimeGridComponent: Activity active. Setting Controller for Grid.");

             // Set up Controller for VERTICAL Grid Navigation (category-full)
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function' && scroll && typeof scroll.render === 'function') {

                 Lampa.Controller.add('content', { // Use 'content' controller name
                     toggle: function () {
                         console.log("HanimeGridComponent: Controller toggle().");
                         // Set the collection to the scroll's content (the category-full div)
                         // Controller finds .selector elements WITHIN scroll.render() DOM.
                         if(scroll) Lampa.Controller.collectionSet(scroll.render());
                          else console.warn("Controller set failed: Scroll missing.");

                         // Set initial focus
                         if(scroll) Lampa.Controller.collectionFocus(last || false, scroll.render());
                          else console.warn("Controller focus failed: Scroll missing.");

                         console.log("HanimeGridComponent: Controller set/focus finished.");
                     }.bind(this), // Bind toggle

                     // Navigation in a VERTICAL GRID:
                     left: function () {
                         // Move left WITHIN a row (between cards/columns)
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('left')) Navigator.move('left');
                          // If at the leftmost card, move to the menu
                         else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('menu');
                          else console.log("Nav left blocked.");
                     },
                     right: function () {
                         // Move right WITHIN a row
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('right')) Navigator.move('right');
                          else console.log("Nav right blocked.");
                     },
                     up: function () {
                         // Move up to the PREVIOUS ROW or to the HEADER
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('up')) Navigator.move('up');
                          // If at the TOP ROW, move to the HEADER
                         else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('head');
                          else console.log("Nav up blocked.");
                     },
                     down: function () {
                         // Move down to the NEXT ROW
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('down')) {
                              Navigator.move('down');
                              // Potential Pagination trigger: If moved to the last visible row, try to load more data.
                              // You need to implement a check here based on item positions and scroll state.
                              // E.g., check if the current focused item is in the last 'N' items and currentPage < totalPages.
                              // if(shouldLoadMoreData) { _this.fetchCatalog(currentPage + 1); }
                         } else { console.log("Nav down blocked. No more elements below."); } // No more rows below or Navigator failed
                     },
                     back: this.back
                 });
                 Lampa.Controller.toggle('content'); // Activate this controller
                 console.log("HanimeGridComponent: Controller 'content' toggled for Grid.");

                 // Initial scroll to the first or last focused item happens automatically via hover:focus.

            } else {
                console.error("HanimeGridComponent: CRITICAL: Controller or scroll, or required methods NOT available in start(). Cannot setup Grid Controller.");
                 // Fallback for Back button
                 if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                     console.log("Attempting basic Controller for Back button.");
                     Lampa.Controller.add('content', { back: this.back }); Lampa.Controller.toggle('content');
                 } else console.warn("Lampa.Controller missing for basic back handler.");
            }
        };

        this.pause = function () {
             console.log("HanimeGridComponent: pause()");
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') {
                 last = Lampa.Controller.item() || last;
                  console.log("HanimeGridComponent: Paused. Saved last focused item:", last);
             } else {
                  //console.log("Pause - controller inactive or missing.");
             }
        };

        this.stop = function () { //console.log("HanimeGridComponent: stop()");
        };

        this.render = function () {
             console.log("HanimeGridComponent: render()");
            // In a category-full component structure, the Scroll itself IS the main renderable DOM.
            // The Scroll wraps the category-full element (our html/itemsContainer).
            // We build the category-full div (html) and populate it in build().
            // Then we need to initialize the vertical Scroll to wrap the html element.
            // Render should return the Scroll's root DOM element.

             // Ensure scroll is initialized
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                 scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
                  console.log("Grid Scroll initialized in render().");
             } else if(!scroll) {
                  console.error("Grid Scroll missing in render.");
                  // Fallback: Return raw itemsContainer if scroll isn't available. Might not scroll properly.
                  return html || $('<div>Error: HTML missing</div>'); // Return html (which is category-full) if built, or error div.
             }


             // Ensure layout (category-full html) is built. build() populates it with cards.
            if (!html) {
                this.buildLayout(); // Builds the category-full html div.
                // Note: build() itself will be called by create() or fetchCatalog(), which populates 'html'.
                // render is called AFTER create usually. html should be available here.
                if (!html) { // Re-check in case buildLayout failed.
                     console.error("HanimeGridComponent: HTML layout not built in render(). Cannot return Scroll.");
                     return $('<div>Error building layout</div>'); // Error div.
                }
            }


             // Add the populated html (category-full div) AS the content for the vertical Scroll.
             // scroll.append(html) will make 'html' the scrollable content.
            if (typeof scroll.append === 'function') scroll.append(html);
             else console.error("Scroll append method missing in render.");


            // Return the ROOT DOM element generated by the Scroll component.
            // This is what Lampa Activity needs to display.
             if (typeof scroll.render === 'function') {
                 return scroll.render(); // Returns the DOM element that contains scroll bars and content.
             } else {
                  console.error("Scroll render method missing in render.");
                  return html || $('<div>Error rendering scroll</div>'); // Return raw html or error div.
             }
        };


        this.destroy = function () {
            console.log("HanimeGridComponent: destroy() called.");
            if(network && typeof network.clear === 'function') network.clear(); network = null;
             // Destroy individual HanimeCard objects
             if (items && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') Lampa.Arrays.destroy(items); items = null;
             // Destroy Vertical Scroll component
             if (scroll && typeof scroll.destroy === 'function') scroll.destroy(); scroll = null;
             // The html element (category-full) might be managed by scroll destruction, but removing explicitly is safer.
             if (html && typeof html.remove === 'function') html.remove(); html = null; last = null;


            // Controller cleanup
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function') {
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.collectionSet === 'function') {
                      Lampa.Controller.collectionSet([]);
                 }
                 Lampa.Controller.remove('content');
                  console.log("Controller removed.");
            } // else cleanup missing

            console.log("HanimeGridComponent: destroy() finished.");
        };

        this.back = function () {
             console.log("HanimeGridComponent: back() called.");
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') Lampa.Activity.backward();
             else console.warn("Activity.backward missing.");
        };

         // Call create on instance creation
         this.create();
    }


    // --- HanimeMainComponent (НОВЫЙ: Главный компонент, отображает список горизонтальных линий категорий) ---
    // Запускается из меню Lampa. Содержит вертикальный скролл, в котором расположены LineComponent'ы.
    function HanimeMainComponent(componentObject) {
         var network = null; // Network for fetching categories list
         var scroll = null; // Main Vertical Scroll

         var categories = []; // Array of category data { id, title, url }
         var lineComponents = []; // Array of HanimeLineComponent instances

         var html = null; // Root DOM for the MainComponent (container for Vertical Scroll)
         var scrollItemsContainer = null; // Container within Scroll where lineComponents are added


         var active = 0; // Last focused index among the LineComponent roots (for vertical scroll/focus)
         var last = null; // Last focused DOM element overall (within the focused line) - saved by LineComponents

         // This component's create is called directly by Lampa when activity is pushed.


        // Build the main layout structure
        this.buildLayout = function() {
            console.log("HanimeMainComponent: buildLayout()");
             // The root is just a simple div to contain the vertical scroll.
             html = $(`<div></div>`); // Or use a specific class like 'hanime-main-catalog'
             console.log("HanimeMainComponent: Main layout container created.");
        };

         // Fetch the list of categories
         this.fetchCategories = function() {
             var _this = this;
             console.log("HanimeMainComponent: fetchCategories() from", API_URL_CATEGORIES);

             if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true); else console.warn("Activity loader missing.");

             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest(); console.log("Main Network initialized.");
             }
             if (network && typeof network.clear === 'function') network.clear();

             if(network && API_URL_CATEGORIES && typeof network.native === 'function') {
                  network.native(API_URL_CATEGORIES,
                     function (data) {
                          //console.log("HanimeMainComponent: Categories data received:", data);
                          if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); // Hide loader

                          if (data && data.categories && Array.isArray(data.categories)) { // Assuming API returns { categories: [...] }
                              categories = data.categories; // Save category data

                              if (categories.length > 0) {
                                 _this.buildCategoriesUI(); // Build UI lines for categories
                              } else {
                                  _this.empty("Нет категорий для отображения.");
                              }
                          } else {
                              _this.empty("Неверный формат данных категорий от API.");
                              console.error("HanimeMainComponent: Invalid categories data format.", data);
                          }
                     },
                     function (errorStatus, errorText) {
                          if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                         _this.empty("Не удалось загрузить список категорий. Статус: " + errorStatus);
                          console.error("HanimeMainComponent: Failed to fetch categories.", errorStatus, errorText);
                     },
                     false, { dataType: 'json', timeout: 15000 }
                  );
             } else {
                 console.error("HanimeMainComponent: Network, API_URL_CATEGORIES, or native method missing.");
                  if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                  _this.empty("Не удалось загрузить категории. Ошибка инициализации сети.");
             }
         };

         // Build the UI with multiple horizontal lines for each category
         this.buildCategoriesUI = function() {
              var _this = this;
             console.log("HanimeMainComponent: buildCategoriesUI() - Building UI for", categories.length, "categories.");

             // Initialize Main Vertical Scroll
              if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                  scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 }); // Vertical Scroll
                   console.log("HanimeMainComponent: Main Vertical Scroll initialized.");
              } else if (!scroll) { console.error("Main Vertical Scroll not available. Cannot build UI."); return; }


             // Container that the Vertical Scroll wraps
             scrollItemsContainer = $('<div></div>'); // Standard container for scroll content body? Or rely on Scroll default?

             // Let's follow the standard Main Vertical Scroll DOM:
             // html -> scroll -> scroll__content -> scroll__body -> [ LineComponent Root DOMs ]
             // So html is the main container, Scroll wraps scrollItemsContainer (scroll body equivalent)
             // And line components go into scrollItemsContainer.

             // Create the container that will hold all the horizontal line components' roots
             // This container is the scrollable content for the main vertical scroll.
             var verticalContent = $('<div></div>'); // This will hold our LineComponent root elements

             // Clear existing line components and their DOMs
             lineComponents.forEach(comp => comp.destroyItems()); // Call destroy on LineComponents
             lineComponents = []; // Clear the array

             verticalContent.empty(); // Clear the DOM container

             // For each category, create a HanimeLineComponent and add its rendered DOM to the main vertical scroll content
             if (scroll && typeof scroll.append === 'function') { // Check scroll
                 categories.forEach(function (category) {
                      console.log("HanimeMainComponent: Creating HanimeLineComponent for category:", category.title);
                     // Create LineComponent, passing category data and parent ref (this MainComponent)
                    var lineComponent = new HanimeLineComponent(category, _this); // Pass parentRef (this MainComponent)

                     // Render the LineComponent to get its root DOM element (.items-line)
                     var lineElement = lineComponent.render();

                     // Add the LineComponent's root DOM to the main vertical scroll content container
                    verticalContent.append(lineElement);
                    lineComponents.push(lineComponent); // Add to the list of LineComponents
                 });
                 console.log("HanimeMainComponent: Created", lineComponents.length, "LineComponents.");

                 // Append the container with LineComponent roots to the main Vertical Scroll.
                 // The vertical Scroll will now manage scrolling this verticalContent div.
                scroll.append(verticalContent);

                 // Insert the main Vertical Scroll's DOM into the MainComponent's root html
                if (html && typeof html.append === 'function') {
                     html.append(scroll.render(true)); // true = redraw scroll
                      console.log("HanimeMainComponent: Vertical Scroll rendered into main html.");
                } else console.error("Main html missing.");


             } else {
                 console.error("HanimeMainComponent: Vertical Scroll or append method missing.");
                  _this.empty("Не удалось отобразить категории."); // Show empty on build failure
             }

              // Show the main activity
             if (_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
             console.log("HanimeMainComponent: Main activity toggled.");


             // Note: Setting up Controller collection happens in start()
         };

         // Callback from HanimeLineComponent when its "Еще" button is clicked
         this.showFullCatalog = function(categoryData) {
              console.log("HanimeMainComponent: showFullCatalog called for category:", categoryData.title);
             // Launch the HanimeGridComponent activity
              if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.push === 'function') {
                  Lampa.Activity.push({
                     url: '', // Optional URL
                     title: categoryData.title || 'Полный каталог', // Title for the grid activity
                     component: 'hanime_grid', // Name of the FULL CATALOG (Grid) Component
                     componentParams: { categoryId: categoryData.id, categoryTitle: categoryData.title, categoryUrl: categoryData.url }, // Pass data to the new component
                     page: 1 // Start on page 1
                  });
                  console.log("HanimeMainComponent: Pushed HanimeGridComponent activity for", categoryData.title);
              } else console.warn("Lampa.Activity.push missing. Cannot show full catalog.");
         }


         // Callback from HanimeCard (via HanimeLineComponent or HanimeGridComponent) on click
         // MainComponent handles playing the stream (can delegate if needed, but common here)
        this.onCardClick = function(cardData) {
             console.log("HanimeMainComponent: Card clicked:", cardData.title, ". Fetching stream.");
            this.fetchStreamAndMeta(cardData.id, cardData); // Main component handles fetching stream
        }

         // Callback from HanimeCard (via HanimeLineComponent or HanimeGridComponent) on long press
         // MainComponent handles showing the context menu (can delegate if needed)
         this.showCardContextMenu = function(cardElement, cardData) {
              console.log("HanimeMainComponent: showCardContextMenu for", cardData.title);
             // (Same implementation as other components)
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
             } // Fallback handled in show method

             if (window.Lampa && Lampa.Select && typeof Lampa.Select.show === 'function') {
                 Lampa.Select.show({
                     title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('title_action') : 'Action',
                     items: menu_favorite,
                     onBack: ()=>{ if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled); console.log("Menu back."); },
                     onCheck: (a)=>{
                         console.log("Menu checked:", a.where);
                         if(window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function') Lampa.Favorite.toggle(a.where, cardData);
                         // Need to find the correct Card object and update its icons.
                         // If menu was from a LineComponent, need to find that LineComponent first.
                         // Finding the card might require iterating through ALL lineComponents and their items.

                         // Simpler: CardComponent itself (via componentRef) should update its own icons.
                         // Re-call the addDetails and updateFavoriteIcons on the *original card element*
                         var cardElement = $(Lampa.Controller.item()); // Get currently focused element (should be the card)
                         // How to find the HanimeCard instance from the DOM element?
                         // Can add the HanimeCard instance to the DOM element's data() in Card.create
                         // var cardInstance = cardElement.data('hanimeCardInstance');
                         // if(cardInstance && typeof cardInstance.update === 'function') cardInstance.update();

                         // Alternative: Just trust that Lampa Controller will refocus after menu closes,
                         // which triggers hover:focus and calls Card.update(). Less code here, but relies on Controller behavior.
                         // Let's rely on refocus updating the card for now.
                     },
                     onSelect: (a)=>{
                          console.log("Menu selected:", a);
                          if(a.collect && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function'){
                              Lampa.Favorite.toggle(a.where, cardData);
                               // Rely on refocus after menu closes to update the card via its hover:focus/update.
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
                                     wrap.append($(lockIconTemplate)); item.find('.selectbox-item__checkbox').remove(); item.append(wrap);
                                     item.off('hover:enter').on('hover:enter', () => {
                                         if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                                          if (window.Lampa && Lampa.Account && typeof Lampa.Account.showCubPremium === 'function') Lampa.Account.showCubPremium();
                                     });
                                }
                           }
                      }
                 });
             } else { console.warn("Lampa.Select missing."); if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Компонент меню недоступен.', 5000); }
         };

         // Callback from HanimeCard (via Line or Grid) to update the Vertical Scroll of THIS MainComponent
        this.updateVerticalScrollToFocus = function(element) {
             // 'element' is the ROOT DOM of the LineComponent or Card in the Grid that got focus
             console.log("HanimeMainComponent: updateVerticalScrollToFocus called. Scrolling to element:", element);
             if (scroll && typeof scroll.update === 'function' && element && typeof element.length === 'number' && element.length > 0) {
                 // In a vertical scroll of horizontal lines, the element to scroll to is the LINE's root.
                 // In a vertical grid, the element is the Card itself.
                 scroll.update(element, true); // Scroll Main Vertical Scroll to show this element (line root or card)
                  console.log("Main Vertical Scroll updated.");
             } else { console.warn("Main Scroll or element missing for scroll update."); }
        }


         // Main component handles stream/meta fetching and player launch
        this.fetchStreamAndMeta = function (id, meta) {
             // (Same implementation as other components)
             var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true); else console.warn("Activity loader missing.");
            console.log("MainComponent: fetchStreamAndMeta for ID:", id);
            if (!network || typeof network.native !== 'function') { console.error("Network missing."); if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Сетевой компонент недоступен.', 5000); return; }

            Promise.all([
                new Promise((resolve, reject) => { if(streamUrl && network) network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 }); else reject('Stream URL/Network unavailable'); }),
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => { if(metaUrl && network) network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 }); else reject('Meta URL/Network unavailable'); })
            ]).then(([streamData, metaDataResponse]) => {
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                const fullMetaData = metaDataResponse ? (metaDataResponse.meta || metaDataResponse) : null;
                if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0]; var finalStreamUrl = streamToPlay ? streamToPlay.url : null;
                    if(finalStreamUrl) { try { var url = new URL(finalStreamUrl); if (url.hostname && url.hostname.includes('highwinds-cdn.com') && PROXY_BASE_URL) finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`; } catch (e) { console.error("URL parse/proxy error:", e); } }
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

         this.empty = function(msg) {
              console.log("HanimeMainComponent: empty() -", msg);
              if(window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function') {
                 var empty = new Lampa.Empty({message: msg});
                 if(html && typeof html.empty === 'function' && typeof html.append === 'function') html.empty().append(empty.render(true));
                 else console.warn("html missing for empty.");
                  if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(false);
                 if(this.activity && typeof this.activity.toggle === 'function') this.activity.toggle();
                  if(typeof empty.start === 'function') this.start = empty.start;
                 console.log("Displayed Empty state.");
              } else { console.warn("Lampa.Empty missing."); }
         }

         // Standard Lampa Activity methods
        this.create = function () {
            console.log("HanimeMainComponent: create()");
            // Init Scroll and Network (used for fetching categories)
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                  scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 }); // Main Vertical Scroll
                   console.log("Main Scroll initialized in create().");
              } else if(!scroll) console.warn("Main Scroll not init in create.");
             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest(); console.log("Main Network initialized.");
              } else if(!network) console.warn("Main Network not init in create.");

            this.buildLayout(); // Builds main html container

            // Fetch category data (which will then build line components)
            this.fetchCategories();

             console.log("HanimeMainComponent: create() finished.");
        };


        this.start = function () {
            console.log("HanimeMainComponent: start()");
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this.activity) { console.log("Not active activity."); return; }
             console.log("HanimeMainComponent: Activity active. Setting Main Controller for Vertical Navigation.");

            // Set up MAIN Lampa.Controller for VERTICAL Navigation between LINE COMPONENTS
            // The Controller collection will be the root DOM elements of the Horizontal LineComponents
            // rendered inside the main Vertical Scroll.

             if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function' && scroll && typeof scroll.render === 'function' && Array.isArray(lineComponents)) {

                  // Get the DOM elements of all the LineComponents.
                  var lineRootElements = lineComponents.map(comp => comp && typeof comp.render === 'function' ? comp.render() : null).filter(Boolean);
                   console.log("HanimeMainComponent: Main Controller collectionSet using", lineRootElements.length, "line root elements.");

                 Lampa.Controller.add('content', { // Use 'content' controller
                     toggle: function () {
                         console.log("HanimeMainComponent: Main Controller toggle().");
                         // Set the collection to the ROOT DOMs of the HanimeLineComponents.
                         // Controller will find .selector elements among these root DOMs (e.g. the line itself might have selector or first focusable element inside).
                         // Lampa Controller has special handling for nesting. When it focuses a Line Root,
                         // it *might* automatically try to navigate into the FIRST focusable element (.selector) within that line.
                         // If that doesn't work automatically, we might need to manually delegate Controller focus to the line.

                         // Lampa standard controller can handle nesting! We pass the scroll's render DOM as the container.
                         // Controller finds ALL .selectors within, regardless of nesting, and figures out vertical/horizontal.
                         // So the toggle logic we had for the single horizontal line IS likely correct for the MAIN Controller too!
                         // It will navigate horizontally within lines, and vertically between them.

                         // Let's go back to the simpler Controller setup, passing the MAIN Scroll DOM.
                         if(scroll) Lampa.Controller.collectionSet(scroll.render());
                         else console.warn("Main Controller set failed: Scroll missing.");

                         // Set initial focus - Controller will find the element
                         if(scroll) Lampa.Controller.collectionFocus(last || false, scroll.render()); // 'last' saved should be a CARD's DOM now.
                         else console.warn("Main Controller focus failed: Scroll missing.");

                         console.log("HanimeMainComponent: Main Controller set/focus finished.");
                     }.bind(this), // Bind toggle to MainComponent

                     // Navigation handlers for the MAIN Controller
                     left: function () {
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('left')) Navigator.move('left');
                         else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('menu');
                         else console.log("Main Nav left blocked.");
                     },
                     right: function () {
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('right')) Navigator.move('right');
                         else console.log("Main Nav right blocked.");
                     },
                     up: function () {
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('up')) Navigator.move('up');
                         else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('head');
                         else console.log("Main Nav up blocked.");
                     },
                     down: function () {
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('down')) {
                             Navigator.move('down');
                              // TODO: Optional Pagination Trigger for Vertical Scroll if main content is paginated rows
                             // This is complex, depends on API for category list and if IT is paginated, not just item lists.
                         } else console.log("Main Nav down blocked.");
                     },
                     back: this.back // Handle Back button for the main activity
                 });
                 Lampa.Controller.toggle('content'); // Activate main controller
                 console.log("HanimeMainComponent: Main Controller 'content' toggled.");


                 // After toggling the controller and setting focus, we might need
                 // to explicitly tell the Vertical Scroll to make the currently focused item visible.
                 // Controller.collectionFocus should trigger hover:focus on the element.
                 // That element's hover:focus calls `this.updateScrollToFocus` on the parent (MainComponent)

             } else {
                 console.error("HanimeMainComponent: CRITICAL: Main Controller or scroll, or methods not available in start(). Cannot setup.");
                  if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                      console.log("Attempting basic Controller for Back button.");
                      Lampa.Controller.add('content', { back: this.back }); Lampa.Controller.toggle('content');
                   }
             }
        };

        this.pause = function () {
             console.log("HanimeMainComponent: pause()");
             // Save last focused element (should be a Card DOM element)
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') {
                 last = Lampa.Controller.item() || last;
                  console.log("HanimeMainComponent: Paused. Saved last focused item:", last);
             } //else console.log("Pause - controller inactive or missing.");
        };

        this.stop = function () { //console.log("HanimeMainComponent: stop()");
        };

        this.render = function () {
             console.log("HanimeMainComponent: render()");
             // The Scroll component IS the main renderable DOM here.
             // Ensure layout is built (which initiates fetching and builds lines/populates scroll content).
             if (!html) { this.buildLayout(); } // Builds the root html div
             // buildCategoriesUI populates scroll content
             // render of Scroll should be called only once.
             // We call create, which calls fetchCategories, which calls buildCategoriesUI, which builds line components and populates the scroll.
             // Lampa Activity system then calls render().

             // Ensure scroll is initialized before returning its render
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                 scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
                  console.log("Main Scroll initialized in render().");
             } else if(!scroll) { console.error("Main Scroll missing in render. Cannot render."); return $('<div>Error: Main Scroll missing</div>'); }

             // html should already contain the rendered scroll because buildCategoriesUI appends scroll.render() to html.
             // Returning html should suffice. But standard render returns scroll.render(). Let's adjust build/render logic.

             // Reworking `buildCategoriesUI` - it builds the *LineComponents* and gets their roots.
             // `render` will wrap `verticalContent` in Scroll and return scroll.render().

             // Let's return the main Scroll's root DOM element.
             if(typeof scroll.render === 'function') {
                  // Ensure the LineComponent roots are appended to the scrollable content area of the scroll.
                  // buildCategoriesUI is responsible for creating line components and appending their roots to a container.
                  // We need to ensure this container is the content of the main scroll.
                  // It seems the simplest is: buildLayout makes the main div (html). create/fetch/build build lines and get their roots.
                  // In render: initialize scroll, append line roots to scroll content, return scroll.render().

                  // Let's refine: MainComponent buildLayout makes the root container (html) and a content container (verticalContent).
                  // fetch/build gets category data, creates LineComponents, and appends lineElement.render() to verticalContent.
                  // render method will initialize the Main Scroll, make verticalContent its content, and return scroll.render().

                   // Ensure categories are fetched and built if not already
                  if(categories.length === 0 && !network && !Array.isArray(lineComponents) || lineComponents.length === 0) {
                       console.warn("MainComponent: Categories not fetched or built in render. Attempting fetch.");
                       this.fetchCategories(); // Try fetching data if not done (should be in create though)
                       // Cannot render until data is built, this might lead to flicker or errors.
                       // Render might be called before async fetch/build finishes. Lampa rendering needs a loading state?
                       // The activity loader is for the entire screen. Initial state should probably just show loader.

                       // If render is called BEFORE build finishes, we can return an empty div or loader DOM
                       if (!html) this.buildLayout(); // Build basic container
                       if(this.activity && typeof this.activity.loader === 'function' && this.activity.loader()) {
                            // If loader is active, return loader DOM
                            // Assuming activity.loader() without args returns the loader DOM or check internal flag.
                            // This is complex - trust Lampa activity manages its own loading screen based on activity.loader(true/false) calls.
                            // For now, just ensure we return a valid DOM, even if empty.
                             return html || $('<div></div>');
                       }
                        return html || $('<div></div>'); // Return base html container if loader is off or no data built yet
                  }


                   // If categories are built and line components created
                   var verticalContent = $('<div></div>'); // Create content wrapper for vertical scroll
                   lineComponents.forEach(comp => {
                        if (comp && typeof comp.render === 'function') verticalContent.append(comp.render()); // Append LineComponent root DOMs
                         else console.warn("MainComponent: Invalid lineComponent during render append.");
                   });


                   // Initialize Vertical Scroll and set its content
                   if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                       scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
                       console.log("Main Scroll initialized in render() before append.");
                   } else if (!scroll) { console.error("Main Scroll missing in render."); return $('<div>Scroll Missing</div>'); }


                   if (typeof scroll.append === 'function') scroll.append(verticalContent);
                    else console.error("Main Scroll append missing in render.");

                   // Return the DOM of the main Vertical Scroll
                  return scroll.render();

             } else {
                  console.error("MainComponent: render() - Categories or LineComponents missing after fetch/build.");
                  return html || $('<div>Error: Categories missing</div>');
             }
        };


        this.destroy = function () {
            console.log("HanimeMainComponent: destroy() called.");
            if(network && typeof network.clear === 'function') network.clear(); network = null;

            // Destroy all HanimeLineComponent instances (which in turn destroy their items and horizontal scrolls)
            if (Array.isArray(lineComponents)) {
                lineComponents.forEach(comp => {
                     if (comp && typeof comp.destroyItems === 'function') comp.destroyItems(); // Call custom cleanup method
                      // Standard destroy method call is better if lineComponent class has one
                     // if(comp && typeof comp.destroy === 'function') comp.destroy(); // If LineComponent has destroy
                     else console.warn("MainComponent: Invalid lineComponent during destroy iteration.");
                });
                lineComponents = []; // Clear the array
                 console.log("HanimeMainComponent: Destroyed line components.");
            }

             // Destroy Main Vertical Scroll component
             if (scroll && typeof scroll.destroy === 'function') {
                 scroll.destroy();
                 console.log("Main Vertical Scroll destroyed.");
             }
             scroll = null;

             // Remove root html element
             if (html && typeof html.remove === 'function') { html.remove(); console.log("Main html removed."); }
             html = null; scrollItemsContainer = null; last = null; // Clear references

            // Controller cleanup
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function') {
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.collectionSet === 'function') {
                      Lampa.Controller.collectionSet([]);
                 }
                 Lampa.Controller.remove('content'); console.log("Main Controller removed.");
            } // else cleanup missing
            console.log("HanimeMainComponent: destroy() finished.");
        };

        this.back = function () {
             console.log("HanimeMainComponent: back() called.");
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') Lampa.Activity.backward();
             else console.warn("Activity.backward missing.");
        };

         // Call create on instance creation
         this.create(); // This will initiate fetch categories -> build UI lines -> populate scroll
    }


    // --- Глобальная функция инициализации плагина. Входная точка. ---
    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() invoked.");

         // Flag to prevent double init
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: flag already set. Exiting.");
             return;
         }

        // --- Logic to wait for Lampa readiness ---
        function waitForLampaReady(callback) {
             console.log("Hanime Plugin: waitForLampaReady() called.");

             // Method A (Preferred): Listen for 'app:ready' via Lampa Listener
             if (window.Lampa && typeof window.Lampa === 'object' && Lampa.Listener && typeof Lampa.Listener === 'object' && typeof Lampa.Listener.follow === 'function') {
                 console.log("Hanime Plugin: Lampa Listener available. Subscribing to 'app:ready'.");
                 Lampa.Listener.follow('app', function handleAppEvent(e) {
                     if (e.type === 'ready') {
                         console.log("Hanime Plugin: Lampa 'appready' event received. Calling callback.");
                         Lampa.Listener.unfollow('app', handleAppEvent); // Unsubscribe after triggering
                         callback();
                     }
                 });
             } else if (window.appready === true) {
                 // Method B (Fallback): Lampa is already ready by the time this script runs
                  console.warn("Hanime Plugin: Lampa Listener not available OR appready true. Calling callback directly as fallback.");
                  callback(); // Call init directly
             } else {
                 // Method C (Unreliable Fallback): Neither Listener nor appready immediately available. Delayed attempt.
                  console.error("Hanime Plugin: Neither Listener nor 'appready' available. Cannot reliably wait. Attempting delayed callback.");
                  setTimeout(callback, 1500); // Retry after 1.5 seconds
             }
        }


        // --- Logic that runs after Lampa is confirmed ready ---
        function initializeLampaDependencies() {
             console.log("Hanime Plugin: initializeLampaDependencies() called (Lampa ready).");

             // Critical check for core Lampa components again.
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Template || typeof Lampa.Template !== 'object' || !Lampa.Component || typeof Lampa.Component !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Scroll || typeof Lampa.Scroll !== 'function' || !Lampa.Reguest || typeof Lampa.Reguest !== 'function') {
                  console.error("Hanime Plugin: CRITICAL: Lampa components missing AFTER wait. Aborting init.");
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка плагина: Компоненты Lampa недоступны. Обновите Lampa.', 20000);
                  return;
             }
             console.log("Hanime Plugin: Lampa components available. Proceeding with initialization.");

             // SET GLOBAL FLAG NOW - Lampa is ready and components are checked
              if (!window.plugin_hanime_catalog_ready) {
                 window.plugin_hanime_catalog_ready = true;
                 console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag SET.");
              } // else already set, should have exited startPlugin

             // --- 1. Define Standard Internal Templates (fallbacks) ---
             console.log("Hanime Plugin: Adding standard template fallbacks...");
             if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                 Lampa.Template.add('card_vote_temp', '<div class="card__vote"></div>');
                 Lampa.Template.add('card_quality_temp', '<div class="card__quality"><div></div></div>');
                 Lampa.Template.add('card_year_temp', '<div class="card__age"></div>');
                 Lampa.Template.add('card_type_temp', '<div class="card__type"></div>');
                 Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
                  console.log("Standard template fallbacks added.");
             } // else Template add missing

             // --- 2. Define YOUR Card Template ---
             // Use only standard Lampa classes and simple structure. addDetails() will populate.
             console.log("Hanime Plugin: Adding hanime-card template...");
             if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                 Lampa.Template.add('hanime-card', `
                     <div class="hanime-card card selector layer--visible layer--render">
                         <div class="card__view">
                             <img src="./img/img_load.svg" class="card__img" alt="{title}" loading="lazy" />
                             <div class="card__icons">
                                 <div class="card__icons-inner"></div>
                             </div>
                             <!-- Placeholders for details - will be populated by JS addDetails() -->
                              <div class="card__vote"></div>
                              <div class="card__quality"><div></div></div>
                              <div class="card__type"></div>
                         </div>
                         <div class="card__title">{title}</div>
                         <div class="card__age"></div> <!-- Placeholder -->
                     </div>
                 `);
                  console.log("HanimeCard template added.");
             } // else Template add missing

             // --- 3. CSS Styles ---
             // Removed. Relying on standard Lampa CSS.
             console.log("Hanime Plugin: Custom CSS removed. Relying on standard Lampa styles.");

             // --- 4. Register YOUR Components ---
             console.log("Hanime Plugin: Registering components HanimeMainComponent and HanimeGridComponent...");
             if (window.Lampa && Lampa.Component && typeof Lampa.Component.add === 'function') {
                 Lampa.Component.add('hanime_main', HanimeMainComponent); // Main activity component (list of lines)
                 Lampa.Component.add('hanime_grid', HanimeGridComponent); // Grid activity component (full list of a category)
                 console.log("Components registered.");
             } else {
                 console.error("Lampa.Component.add missing. Cannot register components.");
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка плагина: Не удалось зарегистрировать компоненты.', 5000);
             }


             // --- 5. Add Menu Item ---
             // Launches the MAIN component (HanimeMainComponent)
             console.log("Hanime Plugin: Calling addMenuItem()...");
             addMenuItem();
              console.log("addMenuItem() called from initializeLampaDependencies.");

              console.log("initializeLampaDependencies() finished.");
        }


        // --- Function to Add Menu Item ---
        function addMenuItem() {
             console.log("Hanime Plugin: addMenuItem() called.");

             // Checks for Lampa UI components and Main Component registration
             if (!window.Lampa || !Lampa.Activity || !Lampa.Controller || !window.$ || !Lampa.Component || typeof Lampa.Component.get !== 'function') { console.warn("addMenuItem cannot proceed: Lampa UI components missing."); return; }
             var menuList = $('.menu .menu__list').eq(0);
             if (!menuList.length) { console.warn("addMenuItem cannot proceed: Lampa menu DOM not found."); return; }

             // Check if our MAIN component ('hanime_main') is registered
             var mainComponentRegistered = Lampa.Component.get('hanime_main');
             if (!mainComponentRegistered) { console.warn("addMenuItem skipping: Main component 'hanime_main' not registered."); return; }

             if (menuList.find('.menu__text:contains("Hanime Catalog")').length > 0) { console.log("Menu item already exists. Skipping."); return; }
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
                     console.log("Menu item activated. Pushing 'hanime_main' activity.");
                    // Launch the MAIN component activity (which displays lines of categories)
                    Lampa.Activity.push({
                        url: '', title: 'Hanime Catalog', component: 'hanime_main', page: 1
                    });
                     console.log("Activity.push called for 'hanime_main'.");
                });
            } else { console.warn("jQuery.on or Activity.push missing for menu item listener."); }

            if (menuList.length > 0) { menuList.append(menu_item); console.log("Menu item DOM element added."); }
            else { console.error("addMenuItem failed: menu DOM missing."); }

             console.log("addMenuItem finished.");
        }


        // --- ENTRY POINT: Start the waiting process ---
        console.log("Hanime Plugin: startPlugin() invoked. Initiating Lampa readiness wait.");

         // Check flag to prevent double init on first run
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: flag already set. Exiting startPlugin to prevent double init.");
             return;
         }

         // Call the function to wait for Lampa and then initialize
         waitForLampaReady(initializeLampaDependencies);

         console.log("Hanime Plugin: startPlugin() finished initiating wait.");
    }

    // Start the plugin
    startPlugin();

})();
