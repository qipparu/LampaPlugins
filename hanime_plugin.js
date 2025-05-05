(function () {
    'use strict';

    // --- Константы и общие настройки ---
    var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
    // Вам нужно знать URL для получения СПИСКА КАТЕГОРИЙ.
    // ЗАМЕНИТЕ ЭТОТ URL НА РЕАЛЬНЫЙ URL ВАШЕГО API, ВОЗВРАЩАЮЩИЙ СПИСОК КАТЕГОРИЙ.
    var API_URL_CATEGORIES = API_BASE_URL + "/categories.json"; // <<< ЗАМЕНИТЕ
    // API для деталей и потока остается тем же
    var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
    var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";
    var PROXY_BASE_URL = "http://77.91.78.5:3000";

    // Сколько элементов показывать в одной горизонтальной линии
    var ITEMS_PER_HORIZONTAL_LINE = 20; // Adjust this value


    // --- HanimeCard компонента ---
    // Этот компонент создает и управляет DOM-элементом одной карточки аниме.
    // Полностью полагается на стандартные классы Lampa для интеграции дизайна.
    function HanimeCard(data, componentRef) {
         // Обработка данных и методы addicon, addDetails, updateFavoriteIcons, onVisible, create, update, render, destroy
         // ... (Код HanimeCard из предыдущего ответа без изменений, включая методы addDetails и updateFavoriteIcons)
         // ... (Важно: Ensure processedData has standard fields like poster_path, vote_average, quality, release_year, type)

        // Example structure of the HanimeCard function (copy from previous successful version):
        var processedData = { /* ... process data ... */ };
        var cardTemplate = Lampa.Template.get('hanime-card', { /* ... pass basic data ... */ });
        var cardElement = $(cardTemplate);

        this.addicon = function(name) { /* ... standard addicon ... */ };
        this.addDetails = function() { /* ... standard addDetails using standard Lampa classes like .card__vote, .card__quality, .card__type, .card__age */ };
        this.updateFavoriteIcons = function() { /* ... standard updateFavoriteIcons using Lampa.Favorite/Timeline and standard .card__icon/.card__marker */ };
        this.onVisible = function() { /* ... standard onVisible for image loading and calling updateFavoriteIcons/addDetails ... */ };
        this.create = function(){
             // Attach hover:* events calling componentRef methods
             if (typeof cardElement.on === 'function') {
                cardElement.on('hover:focus', function () { if (componentRef && typeof componentRef.updateScrollToFocus === 'function') componentRef.updateScrollToFocus(cardElement); this.update(); }.bind(this));
                cardElement.on('hover:enter', function () { if (componentRef && typeof componentRef.onCardClick === 'function') componentRef.onCardClick(processedData); }.bind(this));
                cardElement.on('hover:long', function(){ if (componentRef && typeof componentRef.showCardContextMenu === 'function') componentRef.showCardContextMenu(cardElement, processedData); }.bind(this));
             } // else warn
             this.card = cardElement[0]; // native element
             if (this.card && typeof this.card.addEventListener === 'function') this.card.addEventListener('visible', this.onVisible.bind(this)); // else warn
             setTimeout(() => { this.addDetails(); this.updateFavoriteIcons(); }, 0); // Initial populate/update
             cardElement.data('created', true);
        };
        this.update = function(){ /* ... calls updateFavoriteIcons (and potentially watched status) ... */ };
        this.render = function(js){ if (!cardElement.data('created')) this.create(); return js ? cardElement[0] : cardElement; };
        this.destroy = function(){ /* ... remove listeners and element ... */ };
    }


    // --- HorizontalLineComponent (Component for a single horizontal line of items) ---
    // This component represents ONE items-line, including its title, horizontal scroll, and "Еще" button.
    // It's intended to be used MULTIPLE times within a larger vertical scrolling component.
    function HorizontalLineComponent(categoryData, componentRef) {
         var scroll = null; // Horizontal scroll for THIS line
         var items = []; // Array of HanimeCard objects in THIS line
         var html = null; // Root DOM for THIS line (.items-line)
         var itemsContainer = null; // Container for cards within THIS line's scroll

         // Data specific to THIS category line
         var category = categoryData; // categoryData = { id: ..., title: ..., url: ... }


         // Build the DOM for this specific horizontal line
         this.buildLayout = function() {
             //console.log("HorizontalLineComponent: buildLayout() for", category.title);
            // Create the structure for one horizontal items-line.
            html = $(`
                <div class="items-line layer--visible layer--render items-line--type-cards">
                    <div class="items-line__head">
                        <div class="items-line__title">${category.title || 'Без названия'}</div> <!-- Category Title -->
                         <div class="items-line__more selector">Еще</div> <!-- "Еще" button -->
                    </div>
                    <div class="items-line__body">
                        <!-- Horizontal Scroll will render here -->
                    </div>
                </div>
            `);
             // Container for cards within this horizontal line's scroll
             itemsContainer = $('<div class="items-cards"></div>');
             //console.log("HorizontalLineComponent: layout built.");
         };

         // Fetch data for THIS specific category line (limited number of items)
         this.fetchData = function () {
             var _this = this;
              // Pass loader control to the ROOT component (componentRef) if available
              if (componentRef && componentRef.activity && typeof componentRef.activity.loader === 'function') {
                   componentRef.activity.loader(true);
               }


             console.log("HorizontalLineComponent: fetching data for category:", category.title, "from", category.url);

             // Initialize network if needed (though root component might handle this)
              if (!window.Lampa || !Lampa.Reguest) { console.error("Lampa.Reguest missing for HorizontalLineComponent."); return; }
             var network = new Lampa.Reguest(); // Use a new instance or share from root component


             if(network && category.url && typeof network.native === 'function'){
                // Add a limit parameter to the URL for horizontal line (if API supports)
                // Example: If category.url is /catalog/movie/newset.json, we fetch /catalog/movie/newset.json?limit=20
                 var urlWithLimit = category.url;
                 try {
                      var urlObj = new URL(category.url, window.location.origin); // Parse URL relative to current origin
                      // If API supports 'limit' query param
                       urlObj.searchParams.set('limit', ITEMS_PER_HORIZONTAL_LINE);
                       urlWithLimit = urlObj.toString();
                       console.log("Fetching with limit:", urlWithLimit);

                       // Add other filtering parameters if category id implies it (e.g., /catalog/movie/year.json?year=2023)
                       if(category.id === 'year' && category.year) urlObj.searchParams.set('year', category.year);
                       // Handle other specific category types if needed
                        if (category.id === 'genres' && category.genre_id) urlObj.searchParams.set('genre_id', category.genre_id);
                        if (category.id === 'countries' && category.country_id) urlObj.searchParams.set('country_id', category.country_id);
                       // Add others...

                       urlWithLimit = urlObj.toString();


                 } catch(e) { console.warn("Failed to add limit param to URL:", category.url, e); urlWithLimit = category.url; } // Use original URL if parsing fails


                 network.native(urlWithLimit,
                    function (data) {
                         // Pass loader control back to root
                        if (componentRef && componentRef.activity && typeof componentRef.activity.loader === 'function') componentRef.activity.loader(false);

                         //console.log("HorizontalLineComponent: data received for", category.title, data);
                        if (data && data.metas && Array.isArray(data.metas)) {
                             if (data.metas.length > 0) {
                                _this.build(data.metas); // Build the line UI
                             } else {
                                 // If no items in this category, we might just remove this line from view?
                                 // Or show a "no items" message within the line? Standard Lampa removes empty lines.
                                  _this.destroy(); // Destroy this line if it's empty
                                  console.log("HorizontalLineComponent: Category", category.title, "is empty. Destroying line.");
                             }
                        } else {
                            console.error("HorizontalLineComponent: Invalid data format for category", category.title, data);
                             _this.destroy(); // Destroy on error or bad format
                             if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function' && componentRef && componentRef.isMainCatalogVisible()) { // Show error only if on main catalog screen
                                 Lampa.Noty.show('Ошибка загрузки категории: ' + category.title, 3000);
                             }
                        }
                    },
                    function (errorStatus, errorText) {
                        // Pass loader control back to root
                        if (componentRef && componentRef.activity && typeof componentRef.activity.loader === 'function') componentRef.activity.loader(false);
                         console.error("HorizontalLineComponent: Failed to load category:", category.title, errorStatus, errorText);
                         _this.destroy(); // Destroy on network error
                         if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function' && componentRef && componentRef.isMainCatalogVisible()) {
                             Lampa.Noty.show('Ошибка загрузки категории: ' + category.title + ' (' + errorStatus + ')', 3000);
                         }
                    },
                    false, { dataType: 'json', timeout: 10000 } // Lower timeout for individual lines
                 );
             } else {
                 console.error("HorizontalLineComponent: Cannot fetch data - Network missing or category URL missing/invalid.", category);
                  if (componentRef && componentRef.activity && typeof componentRef.activity.loader === 'function') componentRef.activity.loader(false);
                 _this.destroy(); // Destroy if cant fetch
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function' && componentRef && componentRef.isMainCatalogVisible()) {
                      Lampa.Noty.show('Ошибка: Не удалось начать загрузку категории: ' + (category.title || category.id), 5000);
                  }
             }
         };


         // Build the UI for THIS specific horizontal line
         this.build = function (result) {
             var _this = this;
             console.log("HorizontalLineComponent: build() - Building line for", category.title, "with", result.length, "items.");

             // Initialize THIS line's Horizontal Scroll if not already
              if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                   scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
                   //console.log("HorizontalLineComponent: Horizontal Scroll initialized for", category.title);
              } else if (!scroll) { console.error("HorizontalLineComponent: Scroll not available in build."); return; }


             // Clear items container and items array for this line
            itemsContainer.empty();
            items = [];

             // Create and add HanimeCards for THIS line
            if (itemsContainer && typeof itemsContainer.append === 'function') {
                 result.forEach(function (meta) {
                     // Create HanimeCard, pass data and ref to the ROOT component for click/menu handling
                    var card = new HanimeCard(meta, componentRef); // Pass ROOT componentRef
                    var cardElement = card.render();

                     itemsContainer.append(cardElement);
                    items.push(card);
                });
                 console.log("HorizontalLineComponent: Added", items.length, "cards to", category.title);

                // Append THIS line's itemsContainer to its Scroll
                 if (typeof scroll.append === 'function') scroll.append(itemsContainer); else console.error("HorizontalLineComponent: scroll.append missing.");

                 // Render THIS line's Scroll into its own html layout (.items-line__body)
                 if (html && typeof html.find === 'function' && typeof html.append === 'function' && typeof scroll.render === 'function') {
                     html.find('.items-line__body').empty().append(scroll.render(true));
                      //console.log("HorizontalLineComponent: Scroll rendered into layout.");
                 } else console.error("HorizontalLineComponent: Failed to render scroll into layout.");

            } else console.error("HorizontalLineComponent: itemsContainer missing or append method missing in build.");


             // Add listener to the "Еще" button (in THIS line's layout)
             var moreButton = html.find('.items-line__more.selector');
             // Check button existence, method availability, and ROOT component existence
             if(moreButton.length && typeof moreButton.on === 'function' && componentRef && typeof componentRef.openFullCategory === 'function') {
                 moreButton.on('hover:enter', function() {
                      console.log("HorizontalLineComponent: 'Еще' button pressed for category:", category.title);
                     // Call a method on the ROOT component to open the full category view
                     componentRef.openFullCategory(category); // Pass THIS category's data
                      console.log("HorizontalLineComponent: Called openFullCategory on root.");
                 });
                  console.log("HorizontalLineComponent: 'Еще' button listener attached for", category.title);
             } else if (moreButton.length) {
                  console.warn("HorizontalLineComponent: 'Еще' button found but componentRef, openFullCategory, or jQuery.on missing. Cannot attach listener for", category.title);
             }

         };


         // Pass scroll update to the ROOT component for vertical + horizontal combined scrolling logic
         // (This method will be called by HanimeCard hover:focus)
         this.updateScrollToFocus = function(element) {
              //console.log("HorizontalLineComponent: updateScrollToFocus called by card for", category.title);
             // Delegate scroll update to the root component. The root component
             // needs to handle updating both the horizontal scroll of THIS line
             // AND the vertical scroll of the main page.
             if (componentRef && typeof componentRef.updateCombinedScrollToFocus === 'function') {
                 componentRef.updateCombinedScrollToFocus(element, this); // Pass focused card element and THIS HorizontalLineComponent
             } else {
                  console.warn("HorizontalLineComponent: componentRef or updateCombinedScrollToFocus missing. Cannot delegate scroll update.");
                  // Fallback: Only update THIS horizontal scroll
                  if (scroll && typeof scroll.update === 'function') scroll.update(element, true);
                   else console.warn("HorizontalLineComponent: Fallback scroll update failed - Scroll missing.");
             }
         }

         // Pass card click handling to the ROOT component
         // (This method will be called by HanimeCard hover:enter)
         this.onCardClick = function(cardData) {
             console.log("HorizontalLineComponent: Card clicked:", cardData.title, "in", category.title);
             // Delegate the action (e.g., fetch stream and play) to the root component
             if (componentRef && typeof componentRef.fetchStreamAndMeta === 'function') {
                 componentRef.fetchStreamAndMeta(cardData.id, cardData); // Use ROOT's fetch method
             } else {
                 console.warn("HorizontalLineComponent: componentRef or fetchStreamAndMeta missing. Cannot process card click.");
                 // Fallback: Could try calling fetchStreamAndMeta locally if needed
             }
         }

         // Pass context menu handling to the ROOT component
         // (This method will be called by HanimeCard hover:long)
         this.showCardContextMenu = function(cardElement, cardData) {
              console.log("HorizontalLineComponent: showCardContextMenu for", cardData.title, "in", category.title);
             // Delegate showing the menu to the root component
              if (componentRef && typeof componentRef.showCardContextMenu === 'function') {
                  componentRef.showCardContextMenu(cardElement, cardData); // Use ROOT's menu method
              } else {
                   console.warn("HorizontalLineComponent: componentRef or showCardContextMenu missing. Cannot show context menu.");
                   // Fallback: Could implement menu handling locally if needed
               }
         }

        // Standard Component methods
        this.create = function() {
             // buildLayout called from constructor or render
             // fetchData called after layout is built (from constructor or build)
         }

        this.render = function() {
             //console.log("HorizontalLineComponent: render() for", category.title);
             if (!html) this.buildLayout(); // Ensure layout is built
             // Fetch data right after rendering the layout
             if(items.length === 0 && category.url) { // Only fetch if empty and category URL exists
                 this.fetchData();
             } else if (items.length > 0) {
                 // If already has items (e.g., restored from pause), ensure scroll is rendered and visible
                  if (html && typeof html.find === 'function' && typeof html.append === 'function' && scroll && typeof scroll.render === 'function') {
                     // Re-render the scroll content
                     html.find('.items-line__body').empty().append(scroll.render(true));
                      console.log("HorizontalLineComponent: Re-rendered scroll for existing items.");
                  }
             } else {
                  console.warn("HorizontalLineComponent: No items and no category URL for fetch in render.");
             }

             return html; // Return the line's root DOM
        };

        this.destroy = function() {
             console.log("HorizontalLineComponent: destroy() for", category.title);
            // Destroy HanimeCard objects in THIS line
             if (items && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') Lampa.Arrays.destroy(items);
             items = null;

            // Destroy THIS line's horizontal scroll
             if (scroll && typeof scroll.destroy === 'function') scroll.destroy();
             scroll = null;

            // Remove THIS line's DOM element
             if (html && typeof html.remove === 'function') html.remove();
             html = null; itemsContainer = null; category = null; componentRef = null;
             console.log("HorizontalLineComponent: destroy() finished for", category.title);
        };

         // Call buildLayout immediately on construction, it doesn't require Lampa to be fully ready
         // The fetch and building cards will happen in render() when Lampa asks for DOM, or later.
         // This way, we create the line's basic structure even before fetch, allowing it to be added to the main vertical scroll.
        this.buildLayout();
        // Data fetching happens later (e.g., in render or when added to the main scroll's visible area if Scroll triggers that)
         // A common pattern is to fetch in render if items are empty.
    }


    // --- MainCatalogComponent (Component for the main catalog page with multiple horizontal lines) ---
    // This component acts as the root for the entire catalog page.
    // It contains the main VERTICAL scroll and adds multiple HorizontalLineComponents inside.
    function MainCatalogComponent(componentObject) {
         var network = null; // Network component for fetching CATEGORY LIST
         var scroll = null; // Main VERTICAL scroll for the page

         var categories = []; // Array of category data objects { id, title, url }
         var horizontalLines = []; // Array of HorizontalLineComponent instances
         var html = null; // Root DOM for this component

         var last = null; // Last focused DOM element (for the main vertical scroll)

         var currentFocus = { line: 0, card: 0 }; // Track focus position by line and card index

         var mainContainer = null; // Container where HorizontalLineComponents are added (inside the main vertical scroll)


         // Build the basic layout for the main page
         this.buildLayout = function() {
             console.log("MainCatalogComponent: buildLayout()");
             // Root container for the main page
             html = $('<div></div>'); // Simple div as root

              // Main container for all horizontal lines - this is what the VERTICAL scroll wraps
             mainContainer = $('<div class="full-catalog-content"></div>'); // A custom class for this content container


             // Initialize the MAIN VERTICAL Scroll
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                 scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 }); // Default is vertical
                 console.log("MainCatalogComponent: Main Vertical Scroll initialized.");
             } else if (!scroll) console.error("MainCatalogComponent: Main Vertical Scroll missing in buildLayout.");


             // Add the Scroll render (wrapping mainContainer implicitly or explicitly) to the root HTML
              if (html && mainContainer && scroll && typeof html.append === 'function' && typeof scroll.render === 'function' && typeof scroll.append === 'function') {
                 // The Scroll render *is* the scroll container itself. We need to append mainContainer *into* it.
                 // Let's adjust the structure: html is root, scroll is directly inside html, mainContainer is scroll content.
                 html.append(scroll.render(true)); // Append the Scroll container to root HTML (true = calculate size)
                 scroll.append(mainContainer); // Set mainContainer as the scrollable content for the main vertical scroll
                  console.log("MainCatalogComponent: Main Vertical Scroll added to layout with mainContainer.");
              } else console.error("MainCatalogComponent: Required elements/methods missing for adding scroll to layout.");

         };


         // Fetch the list of categories from the API
         this.fetchCategories = function () {
             var _this = this;
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);

             console.log("MainCatalogComponent: fetching categories from", API_URL_CATEGORIES);

             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("MainCatalogComponent: Lampa.Reguest initialized.");
             }

             if (network && typeof network.clear === 'function') network.clear();

             if(network && API_URL_CATEGORIES && typeof network.native === 'function'){
                network.native(API_URL_CATEGORIES,
                    function (data) {
                         // Hide initial loader after category list is fetched
                        if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                         console.log("MainCatalogComponent: Categories data received:", data);
                        if (data && data.categories && Array.isArray(data.categories)) { // Assuming API returns { categories: [...] }
                             if (data.categories.length > 0) {
                                categories = data.categories; // Save category data
                                _this.buildCategoryLines(); // Build UI for each category line
                             } else {
                                _this.empty("Нет доступных категорий аниме.");
                             }
                        } else {
                            _this.empty("Неверный формат списка категорий от API.");
                            console.error("MainCatalogComponent: Invalid categories data format.", data);
                        }
                    },
                    function (errorStatus, errorText) {
                         if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                         _this.empty("Не удалось загрузить список категорий. Статус: " + errorStatus);
                        console.error("MainCatalogComponent: Failed to load categories.", errorStatus, errorText);
                    },
                    false, { dataType: 'json', timeout: 10000 }
                 );
             } else {
                 console.error("MainCatalogComponent: Cannot fetch categories - Network missing or URL invalid.");
                  if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 _this.empty("Не удалось загрузить список категорий. Ошибка инициализации сети.");
             }
         };

         // Build HorizontalLineComponents for each category and add to the main vertical scroll
         this.buildCategoryLines = function() {
              console.log("MainCatalogComponent: buildCategoryLines() - Creating", categories.length, "horizontal lines.");

             if (!(mainContainer && typeof mainContainer.append === 'function' && scroll && typeof scroll.render === 'function')) {
                 console.error("MainCatalogComponent: Missing critical DOM/Lampa dependencies (mainContainer, scroll, scroll.render) in buildCategoryLines(). Aborting UI build.");
                  if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                  _this.empty("Не удалось построить категории.");
                 return;
             }

             horizontalLines = []; // Clear previous lines

             categories.forEach(function(category) {
                 // Create an instance of HorizontalLineComponent for this category
                 // Pass category data and a reference to THIS MainCatalogComponent as the componentRef
                var lineComponent = new HorizontalLineComponent(category, this); // Pass 'this'
                 horizontalLines.push(lineComponent);

                 // Get the DOM element of the horizontal line and add it to the main vertical scroll container
                var lineElement = lineComponent.render(); // HorizontalLineComponent.render returns the items-line DOM

                 // Add the rendered line element to the main vertical scroll's content container
                 mainContainer.append(lineElement); // Append items-line DOM to mainContainer

                 console.log("MainCatalogComponent: Added horizontal line for category:", category.title);

                 // Note: Data fetching for each HorizontalLineComponent (the items inside)
                 // is handled internally by the HorizontalLineComponent itself, often triggered in its render()
             }, this); // Use 'this' to bind the forEach callback context to MainCatalogComponent


             // After all lines are added, inform the main Vertical Scroll about the new content size
              // This is crucial for vertical scrolling to work.
             if(scroll && typeof scroll.update === 'function') scroll.update(mainContainer, false); // Update scroll measurements


             // If MainCatalogComponent has Loader, hide it.
             // This was hidden after fetchCategories, but maybe need to ensure hidden after UI build.
             // if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(false);


             // Toggle activity to show the UI.
             if(this.activity && typeof this.activity.toggle === 'function') this.activity.toggle();

             console.log("MainCatalogComponent: Built and added", horizontalLines.length, "horizontal lines.");

             // Controller setup and initial focus happens in start() method
         };


         // This is a combined scroll update method called by HanimeCard hover:focus (delegated by HorizontalLineComponent)
         // It needs to update BOTH the Horizontal scroll of the line AND the main Vertical scroll of the page.
         this.updateCombinedScrollToFocus = function(focusedCardElement, sourceLineComponent) {
              // focusedCardElement: The jQuery element of the card that got focus.
              // sourceLineComponent: The HorizontalLineComponent instance containing the card.

              // console.log("MainCatalogComponent: updateCombinedScrollToFocus called by card in line:", sourceLineComponent.category.title);

             // 1. Update the Horizontal Scroll of the SOURCE line
             if (sourceLineComponent && sourceLineComponent.scroll && typeof sourceLineComponent.scroll.update === 'function') {
                  sourceLineComponent.scroll.update(focusedCardElement, true); // Scroll horizontally to the card in its line
             } else {
                  console.warn("MainCatalogComponent: Source line scroll missing for horizontal update.");
             }

             // 2. Update the MAIN Vertical Scroll to make the source line visible
             // We need to make the entire line's DOM element visible in the main vertical scroll area.
             if (scroll && typeof scroll.update === 'function' && sourceLineComponent && typeof sourceLineComponent.render === 'function') {
                  var lineElement = sourceLineComponent.render(); // Get the DOM element of the line

                  // Need to update the main vertical scroll to show THIS LINE ELEMENT
                  // last should probably track the LAST FOCUSED ITEM DOM across ALL lines, not just in the first line's context.
                  // Or it should track the position ({ lineIndex: ..., cardIndex: ... })

                 last = focusedCardElement[0]; // Update last to the focused card element DOM

                 // Update the main vertical scroll to scroll to the line element
                  scroll.update(lineElement, true); // Scroll vertically to the focused line

             } else {
                  console.warn("MainCatalogComponent: Main vertical scroll or source line element missing for vertical update.");
             }

              // Also update tracking of focus position for restoring later
             var lineIndex = horizontalLines.indexOf(sourceLineComponent);
             var cardIndex = sourceLineComponent.items.findIndex(item => item && typeof item.render === 'function' && item.render(true) === focusedCardElement[0]);
             if (lineIndex !== -1 && cardIndex !== -1) {
                  currentFocus = { line: lineIndex, card: cardIndex };
                  //console.log("MainCatalogComponent: Updated focus tracking:", currentFocus);
              } else {
                   console.warn("MainCatalogComponent: Failed to track focus position.");
               }


         };

         // Method called by "Еще" button on HorizontalLineComponent
         this.openFullCategory = function(categoryData) {
             console.log("MainCatalogComponent: openFullCategory called for", categoryData.title);
             // Launch the HanimeFullCatalogComponent activity
             if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.push === 'function' && window.Lampa.Component && typeof Lampa.Component.get === 'function' && Lampa.Component.get('hanime_full_catalog')) {
                 Lampa.Activity.push({
                     url: '', // URL or data for the full category (pass categoryData?)
                     title: categoryData.title || 'Полный каталог', // Use category title for header
                     component: 'hanime_full_catalog', // Launch the full grid component
                     page: 1, // Start at page 1 for full catalog
                     data: categoryData // Pass the category data so FullCatalog knows which category to load
                 });
                 console.log("MainCatalogComponent: Pushed 'hanime_full_catalog' activity with category data:", categoryData);
             } else {
                 console.error("MainCatalogComponent: Cannot launch full category activity. Missing Lampa components, push method, or 'hanime_full_catalog' component not registered.");
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Не удалось открыть полный каталог категории.', 5000);
             }
         };


         // Pass generic card click handling to This Main Component
         this.onCardClick = function(cardData) {
              console.log("MainCatalogComponent: Card clicked:", cardData.title);
              // Delegate to fetchStreamAndMeta from this component
              this.fetchStreamAndMeta(cardData.id, cardData);
         }

         // Pass generic context menu handling to This Main Component
         this.showCardContextMenu = function(cardElement, cardData) {
             // (Same implementation as previous components)
             console.log("MainCatalogComponent: showCardContextMenu for", cardData.title);
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
                         // Find the Card object within its LINE component to update icons
                         var lineComponent = horizontalLines.find(line => line && Array.isArray(line.items) && line.items.some(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]));
                         if(lineComponent) {
                             var cardObj = lineComponent.items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                              if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                         } // else warn Card object not found
                     },
                     onSelect: (a)=>{
                          console.log("Menu selected:", a);
                          if(a.collect && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function'){
                              Lampa.Favorite.toggle(a.where, cardData);
                               var lineComponent = horizontalLines.find(line => line && Array.isArray(line.items) && line.items.some(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]));
                               if(lineComponent) {
                                   var cardObj = lineComponent.items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                                    if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                               }
                          }
                          if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                           if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                            console.log("Menu closed.");
                     },
                      onDraw: (item, elem) => {
                           if (elem.collect && window.Lampa && Lampa.Account && typeof Lampa.Account.hasPremium === 'function' && !Lampa.Account.hasPremium()) {
                                let lockIconTemplate = (window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.has('icon_lock')) ? Lampa.Template.get('icon_lock') : null;
                                if (lockIconTemplate && window.$ && typeof item.find === 'function' && typeof item.append === 'function' && typeof item.off === 'function' && typeof item.on === 'function') {
                                     let wrap = $('<div class="selectbox-item__lock"></div>'); wrap.append($(lockIconTemplate)); item.find('.selectbox-item__checkbox').remove(); item.append(wrap);
                                     item.off('hover:enter').on('hover:enter', () => {
                                         if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                                          if (window.Lampa && Lampa.Account && typeof Lampa.Account.showCubPremium === 'function') Lampa.Account.showCubPremium();
                                     });
                                } // else missing template/methods
                           }
                      }
                 });
             } else { console.warn("Lampa.Select missing."); if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Компонент меню недоступен.', 5000); }
         };

         // This is used by FetchStreamAndMeta to know if Noty messages should be shown (i.e., user is on THIS catalog page)
         this.isMainCatalogVisible = function() {
              return window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity === this.activity;
         }


        this.fetchStreamAndMeta = function (id, meta) {
             // (Same implementation as HorizontalLineComponent, but check isMainCatalogVisible before showing Noty)
              var _this = this;
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true); else console.warn("Activity loader missing.");
             console.log("MainCatalogComponent: fetchStreamAndMeta for ID:", id);

             if (!network || typeof network.native !== 'function') {
                  console.error("Network missing.");
                  if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                  if(_this.isMainCatalogVisible() && window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Сетевой компонент недоступен.', 5000);
                 return;
              }

            Promise.all([ /* ... requests ... */ ])
             .then(([streamData, metaDataResponse]) => {
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 // ... processing stream/meta data ...
                 // Launch Player...
                 // ...
                 if (!playerObject.url || !window.Lampa || typeof Lampa.Player !== 'function') {
                      console.error("Player/URL missing.");
                       if(_this.isMainCatalogVisible() && window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show(playerObject.url ? 'Компонент плеера недоступен.' : 'Не удалось получить ссылку на поток.', 5000);
                  } // else launch player, add to history...
                 // ...
                  if (!streamData || !streamData.streams || !Array.isArray(streamData.streams) || streamData.streams.length === 0) {
                      console.warn("No streams found.");
                       if(_this.isMainCatalogVisible() && window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Потоки не найдены для этого аниме.', 5000);
                   }
             })
             .catch(error => {
                  if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 console.error("Error fetching stream/meta:", error);
                  if(_this.isMainCatalogVisible() && window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'), 5000);
              });
        };


         // Empty state - Called when NO categories are found
         this.empty = function (msg) {
             console.log("MainCatalogComponent: empty() -", msg);
              if (window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function') {
                  var empty = new Lampa.Empty({ message: msg });
                  // Replace the MAIN scroll container content with Empty component's DOM
                 if (mainContainer && typeof mainContainer.empty === 'function' && typeof mainContainer.append === 'function' && typeof empty.render === 'function') {
                     mainContainer.empty().append(empty.render(true)); // Replace Scroll's content
                      console.log("MainCatalogComponent: Replaced mainContainer content with Empty.");
                  } else {
                       console.warn("MainCatalogComponent: Main container missing for Empty.");
                       // As fallback, try adding empty to the root html if mainContainer is not suitable.
                       if(html && typeof html.empty === 'function' && typeof html.append === 'function') html.empty().append(empty.render(true));
                       else console.error("MainCatalogComponent: Root html also missing for Empty.");
                  }

                  if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();

                 // Main activity start needs to delegate to Empty start now
                  if (typeof empty.start === 'function') this.start = empty.start; else console.warn("Empty start missing.");
                   console.log("Displayed Empty state.");

              } else {
                   // Fallback basic text empty state
                  console.warn("Lampa.Empty missing for MainCatalogComponent.");
                  if(html && typeof html.empty === 'function' && typeof html.text === 'function') html.empty().text(msg + ' (Empty component missing)');
                   if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                   this.start = function() { if(window.Lampa && Lampa.Controller) { Lampa.Controller.add('content', { back: this.back }); Lampa.Controller.toggle('content'); } }.bind(this);
              }
         };

        this.create = function () {
            console.log("MainCatalogComponent: create()");
            // Init Scroll and Network (should already be init in initializeLampaDependencies, but double check)
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                  scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
                   console.log("Scroll initialized in create().");
               } else if (!scroll) console.warn("Scroll missing in create.");
              if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                   console.log("Network initialized in create().");
               } else if (!network) console.warn("Network missing in create.");


            this.buildLayout(); // Build the root html and mainContainer

            if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(true);

            // Fetch the list of categories to then build the lines
            this.fetchCategories();

            console.log("MainCatalogComponent: create() finished. Fetching categories.");
        };


        this.start = function () {
            console.log("MainCatalogComponent: start()");
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this.activity) { console.log("Not active activity."); return; }
             console.log("Activity active. Setting Controller.");

            // Set up the MAIN CONTROLLER for VERTICAL navigation between lines
             if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function' && scroll && typeof scroll.render === 'function') {

                 // The collection for the MAIN controller are the LINE DOM elements
                 // that have the 'selector' class. Need to ensure each items-line__more button also has 'selector'.
                 Lampa.Controller.add('content', {
                     toggle: function () {
                         console.log("MainCatalogComponent: Controller toggle().");
                         // Controller collects all .selector elements inside the main scroll content (mainContainer)
                         Lampa.Controller.collectionSet(mainContainer); // Main Controller collects elements in mainContainer

                         // Set initial focus. Controller will try to focus on the last element or the first in the mainCollection
                         // The focus needs to land on the FIRST selectable element in the FIRST line (or where 'last' was).
                         // We might need custom collectionFocus logic here if standard collectionFocus doesn't land inside the first line correctly.
                         // Standard collectionFocus will likely target the first .selector which could be the 'Еще' button of the first line, or the first card if More is hidden/missing.
                         Lampa.Controller.collectionFocus(last || false, mainContainer); // Focus within mainContainer

                         // If standard focus lands on an element inside a line, the line's hover:focus -> updateCombinedScrollToFocus will scroll it.
                         console.log("MainCatalogComponent: Controller set/focus finished.");
                     }.bind(this),

                     // Navigation for Main Catalog (Vertical scroll)
                     left: function () {
                          // In the main catalog view, LEFT typically goes to the main menu
                         if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('menu');
                          else console.log("Menu controller unavailable for LEFT.");
                         // Horizontal navigation within a line is handled by Controller automatically once focused inside the line
                     },
                     right: function () {
                         // Right movement is usually handled WITHIN the currently focused line
                          console.log("Navigating Right (handled by focused line Controller).");
                          if (window.Navigator && typeof Navigator.move === 'function') Navigator.move('right');
                     },
                     up: function () {
                         // Move UP to the previous line or to the Header
                         if (window.Navigator && typeof Navigator.canmove === 'function' && Navigator.canmove('up')) Navigator.move('up');
                          else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('head');
                          else console.log("Nav UP blocked.");
                     },
                     down: function () {
                         // Move DOWN to the next line
                         if (window.Navigator && typeof Navigator.canmove === 'function' && Navigator.move === 'function' && Navigator.canmove('down')) Navigator.move('down');
                          // Need logic here or in build to potentially load more lines if infinite scroll is desired.
                          else console.log("Nav DOWN blocked or no more lines.");
                     },
                     back: this.back
                 });
                 Lampa.Controller.toggle('content');
                 console.log("MainCatalogComponent: Main Controller 'content' toggled.");

                 // The combined scroll update handles the initial focus and subsequent scrolling.

            } else {
                 console.error("MainCatalogComponent: CRITICAL: Lampa.Controller, Scroll, or methods NOT available in start(). Cannot setup main Controller.");
                 // Fallback for Back button if possible
                 if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                     console.log("Attempting basic Controller for Back button.");
                     Lampa.Controller.add('content', { back: this.back }); Lampa.Controller.toggle('content');
                 } // else cannot even add basic back handler
            }
        };

        this.pause = function () {
             console.log("MainCatalogComponent: pause()");
             // Save the last focused element position for returning
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') {
                 last = Lampa.Controller.item() || last; // Save focused DOM element
                 // Alternatively, save the {line: index, card: index} structure:
                 // if (last) { // If we saved a DOM element last time
                 //     var foundLine = horizontalLines.find(line => line && Array.isArray(line.items) && line.items.some(item => item && typeof item.render === 'function' && item.render(true) === last));
                 //     if (foundLine) {
                 //          var lineIndex = horizontalLines.indexOf(foundLine);
                 //          var cardIndex = foundLine.items.findIndex(item => item && typeof item.render === 'function' && item.render(true) === last);
                 //         if (lineIndex !== -1 && cardIndex !== -1) currentFocus = { line: lineIndex, card: cardIndex };
                 //          else console.warn("Failed to find line/card index for last focused element.");
                 //     } // else last element not found in current lines? (unlikely)
                 // } else {
                 //     // If last was null, try to get current focused item from Controller
                 //     var currentDomItem = Lampa.Controller.item();
                 //     if(currentDomItem) {
                 //         var foundLine = horizontalLines.find(line => line && Array.isArray(line.items) && line.items.some(item => item && typeof item.render === 'function' && item.render(true) === currentDomItem));
                 //          if (foundLine) {
                 //               var lineIndex = horizontalLines.indexOf(foundLine);
                 //               var cardIndex = foundLine.items.findIndex(item => item && typeof item.render === 'function' && item.render(true) === currentDomItem);
                 //              if (lineIndex !== -1 && cardIndex !== -1) currentFocus = { line: lineIndex, card: cardIndex };
                 //               else console.warn("Failed to find line/card index for current focused item.");
                 //          }
                 //     } // else current focused item is not a card/line? (unexpected)
                 // }
                 // console.log("Paused. Saved last focus position:", currentFocus, "or DOM:", last);

             } // else Controller not active/missing, focus not saved.
        };

        this.stop = function () { //console.log("MainCatalogComponent: stop()");
        };

        this.render = function () { //console.log("MainCatalogComponent: render()");
            if (!html) this.buildLayout(); // Build layout including scroll and mainContainer

            // Render returns the root DOM of the MainCatalogComponent
             return html; // The root DOM (which contains the Vertical Scroll)
        };

        this.destroy = function () {
            console.log("MainCatalogComponent: destroy() called.");

            // Destroy Network
            if(network && typeof network.clear === 'function') network.clear(); network = null;

            // Destroy all HorizontalLineComponent instances in the array
             if (horizontalLines && Array.isArray(horizontalLines)) {
                 horizontalLines.forEach(function(line) {
                      if(line && typeof line.destroy === 'function') line.destroy();
                 });
                  console.log("Destroyed horizontal lines.");
             }
             horizontalLines = null; categories = null;

             // Destroy the main Vertical Scroll
             if (scroll && typeof scroll.destroy === 'function') scroll.destroy(); scroll = null;

            // Remove the root DOM element
             if (html && typeof html.remove === 'function') html.remove(); html = null; mainContainer = null; last = null; currentFocus = null;

            // Controller cleanup
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function') {
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.collectionSet === 'function') {
                      Lampa.Controller.collectionSet([]);
                 }
                 Lampa.Controller.remove('content'); console.log("Controller removed.");
            } else console.warn("Controller cleanup missing.");
            console.log("MainCatalogComponent: destroy() finished.");
        };

        this.back = function () {
             console.log("MainCatalogComponent: back() called.");
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') Lampa.Activity.backward();
             else console.warn("Activity.backward missing.");
        };
    }


    // --- HanimeFullCatalogComponent (НОВЫЙ: Component for full list in Grid) ---
    // This component displays the full list of anime for a specific category in a vertical grid.
    function HanimeFullCatalogComponent(componentObject) {
         // (Your previous HanimeFullCatalogComponent code, adapted)
         // Key changes:
         // - It should receive category data via componentObject.data when pushed.
         // - Use categoryData.url (maybe with pagination) to fetch data.
         // - buildLayout creates the category-full DOM structure directly.
         // - build populates this category-full with cards.
         // - Scroll is VERTICAL (default).
         // - Navigation is grid-like (left/right within row, up/down to next/previous row).
         // - Should handle pagination (fetch next page when scroll needs more).
         // - updateScrollToFocus updates only this component's VERTICAL scroll.

         var network = null;
         var scroll = null;
         var items = [];
         var html = null; // Root DOM (will be the category-full div)
         var itemsContainer = null; // Same as html

         var active = 0;
         var last = null;

         var categoryData = componentObject.data; // Get category data passed via Activity.push({ data: ... })

         var CATALOG_URL = categoryData ? categoryData.url : CATALOG_URL_ALL; // Use passed URL or a default ALL URL

         var currentPage = 1;
         var totalPages = 1; // Implement logic to get total pages if API provides
         var loadingMore = false;


         this.buildLayout = function() {
             console.log("HanimeFullCatalogComponent: buildLayout() for", categoryData?.title);
             // Root and items container is the category-full grid
             html = $(`<div class="category-full"></div>`);
             itemsContainer = html; // Category-full is the direct content for vertical scroll

             // No internal horizontal scrolls or header/footer for this full list component

             console.log("HanimeFullCatalogComponent: layout built.");
         };

         this.fetchCatalog = function (page = 1) {
             var _this = this;
             var url = CATALOG_URL;
             // Adapt URL for pagination if needed (e.g., append ?page=N&limit=50)
             try {
                  var urlObj = new URL(CATALOG_URL, window.location.origin);
                  urlObj.searchParams.set('page', page);
                  // You might need to set a higher limit for the full view if your API supports it
                  // urlObj.searchParams.set('limit', 50);
                  url = urlObj.toString();
                  console.log("HanimeFullCatalogComponent: Fetching URL with page:", url);

             } catch(e) { console.warn("URL parse error for pagination:", CATALOG_URL, e); url = CATALOG_URL; }


             if (page !== 1 && loadingMore) { console.log("Already loading page", page); return; }
             loadingMore = true;
             if (page === 1 && _this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             // else show pagination loader at bottom


             console.log("Fetching page", page, "from", url);
              if (!network && window.Lampa && typeof Lampa.Reguest === 'function') network = new Lampa.Reguest();
             if (!network || typeof network.native !== 'function') { console.error("Network missing."); loadingMore = false; if(page===1) if(_this.activity?.loader) _this.activity.loader(false); if(window.Lampa?.Noty?.show) Lampa.Noty.show('Сетевой компонент недоступен.', 5000); return; }


             network.native(url,
                 function (data) {
                      loadingMore = false;
                      if (page === 1 && _this.activity?.loader) _this.activity.loader(false); // Hide initial loader
                      // hide pagination loader

                     //console.log("Data received for page", page, ":", data);
                     if (data && data.metas && Array.isArray(data.metas)) {
                          if (page === 1 && data.metas.length === 0) {
                             _this.empty("В этой категории пока ничего нет.");
                         } else if (data.metas.length > 0) {
                             _this.build(data.metas, page); // Pass page number to build
                              // Update totalPages from API if available
                              // if(data.total_pages) totalPages = data.total_pages;
                              currentPage = page; // Update current page
                         } else {
                              console.log("Fetched page", page, "no more items.");
                              totalPages = currentPage; // Assume this is the last page
                         }
                     } else {
                          console.error("Invalid data format for page", page, data);
                         if (page === 1) _this.empty("Неверный формат данных.");
                     }
                 },
                 function (errorStatus, errorText) {
                     loadingMore = false;
                     if (page === 1 && _this.activity?.loader) _this.activity.loader(false);
                     console.error("Failed to load page", page, ":", errorStatus);
                     if (page === 1) _this.empty("Ошибка загрузки каталога: " + errorStatus);
                      // For pagination error, maybe show a Noty instead of empty
                 },
                 false, { dataType: 'json', timeout: 15000 }
             );
         };

         this.build = function (result, page = 1) {
             var _this = this;
             console.log("HanimeFullCatalogComponent: build() - Adding", result.length, "items for page", page);

              if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                  scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 }); // Vertical scroll
                   console.log("Scroll initialized.");
              } else if (!scroll) { console.error("Scroll missing in build."); return; }


             // For page 1, clear the itemsContainer and items array
             if (page === 1) {
                 itemsContainer.empty(); // This IS the .category-full div
                 items = [];
                 console.log("Cleared items for page 1.");
             }

             // Append new cards to itemsContainer (.category-full div)
              if (itemsContainer && typeof itemsContainer.append === 'function' && window.Lampa?.Template?.get) {
                  result.forEach(function(meta) {
                      var card = new HanimeCard(meta, _this); // Pass THIS componentRef
                      var cardElement = card.render();
                      itemsContainer.append(cardElement); // Append to .category-full
                      items.push(card);
                  });
                   console.log("Added", result.length, "cards. Total items:", items.length);
              } else console.error("ItemsContainer or append missing, or Lampa.Template.get missing.");


             // Main Vertical Scroll handles its content directly.
             // The first time build is called (page 1), scroll needs its content (itemsContainer) added.
             if(page === 1 && scroll && typeof scroll.append === 'function') {
                 // scroll.append(itemsContainer); // Main content for scroll
                 // Render the Scroll. In category-full, render might be just the scroll DOM
                 // We need to make the ROOT DOM of the component (html) the scroll container.
                 // Correct: Main component's root is scroll. ItemsContainer is inside scroll.
                 // Let's fix the render method and how Scroll is added.
                 // For now, trust scroll.append and that rendering handles this.

                 // Recalculate scroll size after adding items (especially for pagination)
                 if(scroll && typeof scroll.update === 'function') {
                      // scroll.update(itemsContainer, false); // Update scroll content measurements
                      // Lampa Scroll might auto-update when items are appended to its content
                      // Or a general update call is needed:
                       //scroll.update(); // General update
                       console.log("Scroll update called after build (page 1).");
                  }


             } else if (page > 1 && scroll && typeof scroll.update === 'function') {
                  // For subsequent pages, explicitly update the scroll
                  scroll.update(itemsContainer, false); // Update scroll content measurement after appending
                   console.log("Scroll update called after build (page", page, ") for pagination.");
                  // Or simply scroll.update(); might be enough
             }


             // Add 'needmore' listener for pagination ONLY to THIS component's scroll
              if (scroll && typeof scroll.on === 'function' && currentPage < totalPages) { // Check pagination needed and more pages
                  if (!scroll.data('pagination_attached')) { // Attach only once
                      scroll.on('needmore', function() {
                          console.log("Scroll needs more data. Loading page", currentPage + 1);
                           if (!loadingMore && currentPage < totalPages) {
                                _this.fetchCatalog(currentPage + 1);
                            } // else already loading or no more pages
                      });
                       scroll.data('pagination_attached', true);
                       console.log("'needmore' listener attached to Full Catalog Scroll.");
                  }
              } else if (scroll && scroll.data('pagination_attached')) { // If no more pages, detach listener
                  if (typeof scroll.off === 'function') scroll.off('needmore');
                   scroll.data('pagination_attached', false);
                   console.log("'needmore' listener detached from Full Catalog Scroll.");
               }


              if(page === 1 && _this.activity?.loader) _this.activity.loader(false);
               if(page === 1 && _this.activity?.toggle) _this.activity.toggle();

               // Update Controller's collection if this is page 1, or if it lost focus somehow
              if (page === 1 || (window.Lampa?.Controller?.enabled()?.name === 'content' && typeof Lampa.Controller.collectionSet === 'function')) {
                  // After building/appending, Controller needs to know about new/updated collection
                  // If currently focused on this activity, update its collection set
                  if (window.Lampa && Lampa.Controller && Lampa.Controller.enabled() && Lampa.Controller.enabled().activity === _this.activity) { // Only update if active
                     // Re-set the collection for the active controller to the scroll DOM
                     // The scroll DOM (scroll.render()) is the container that Controller will search within.
                      if (typeof Lampa.Controller.collectionSet === 'function' && typeof scroll.render === 'function') {
                          Lampa.Controller.collectionSet(scroll.render());
                           // console.log("Controller collection set to scroll.render()");
                       } else console.warn("Controller collectionSet or scroll.render missing for update.");
                  }
              }


             console.log("HanimeFullCatalogComponent: Build completed for page", page);
         };

         // (Same methods as HorizontalLineComponent or MainCatalogComponent:
         // onCardClick, showCardContextMenu, updateScrollToFocus, fetchStreamAndMeta, empty,
         // create, start, pause, stop, render, destroy, back)
         // These should be adapted to the context of this Full Catalog Component.
         // E.g., updateScrollToFocus only affects the VERTICAL scroll instance specific to THIS component.


        this.fetchStreamAndMeta = function (id, meta) {
             // (Same fetchStreamAndMeta implementation, but tailored for this component's context)
              var _this = this;
             if(_this.activity?.loader) _this.activity.loader(true); else console.warn("Loader missing.");
             console.log("Full Catalog fetchStreamAndMeta for ID:", id);

             if (!network || typeof network.native !== 'function') { console.error("Network missing."); if(_this.activity?.loader) _this.activity.loader(false); if(window.Lampa?.Noty?.show) Lampa.Noty.show('Сетевой компонент недоступен.', 5000); return; }

            Promise.all([ /* ... requests ... */ ])
             .then(([streamData, metaDataResponse]) => {
                 if(_this.activity?.loader) _this.activity.loader(false);
                 const fullMetaData = metaDataResponse ? (metaDataResponse.meta || metaDataResponse) : null;
                 // ... processing stream/meta data ...
                 // Check if Noty should be shown based on THIS component's visibility
                  if(_this.isFullCatalogVisible() && window.Lampa?.Noty?.show) { /* show Noty */ }

             })
             .catch(error => {
                  if(_this.activity?.loader) _this.activity.loader(false); console.error("Error fetching stream/meta:", error);
                  if(_this.isFullCatalogVisible() && window.Lampa?.Noty?.show) { /* show error Noty */ }
              });
        };

        this.isFullCatalogVisible = function() {
             // Check if THIS FullCatalog component is currently the active activity
             return window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity === this.activity;
         }

        this.empty = function (msg) {
             console.log("Full Catalog empty() -", msg);
             // Show empty state in THIS component's layout/main container
             if (window.Lampa?.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function') {
                 var empty = new Lampa.Empty({ message: msg });
                 if (itemsContainer && typeof itemsContainer.empty === 'function' && typeof itemsContainer.append === 'function') {
                     itemsContainer.empty().append(empty.render(true)); // Replace scroll's content with Empty
                 } else console.warn("ItemsContainer missing for empty.");
                 if(_this.activity?.loader) _this.activity.loader(false); if(_this.activity?.toggle) _this.activity.toggle();
                 if (typeof empty.start === 'function') this.start = empty.start; else console.warn("Empty start missing.");
             } else {
                  console.warn("Lampa.Empty missing for Full Catalog.");
                  if(html && typeof html.empty === 'function' && typeof html.text === 'function') html.empty().text(msg + ' (Empty component missing)');
                  if(_this.activity?.loader) _this.activity.loader(false); if(_this.activity?.toggle) _this.activity.toggle();
                  this.start = function() { if(window.Lampa?.Controller) { Lampa.Controller.add('content', { back: this.back }); Lampa.Controller.toggle('content'); } }.bind(this);
             }
         };


         this.create = function () {
            console.log("HanimeFullCatalogComponent: create()");
             // Init Scroll and Network (ensure these are specific to this component)
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 }); else if (!scroll) console.warn("Scroll missing.");
              if (!network && window.Lampa && typeof Lampa.Reguest === 'function') network = new Lampa.Reguest(); else if (!network) console.warn("Network missing.");

            this.buildLayout(); // Build root html (.category-full)
            if(this.activity?.loader) this.activity.loader(true);

            // Fetch data for the first page using the specific category URL
            // Use the category data passed to the component (componentObject.data)
             if(categoryData && categoryData.url) {
                  this.fetchCatalog(1);
                  console.log("Full Catalog create(): Fetching catalog for category", categoryData.title);
              } else {
                  console.error("Full Catalog create(): No category data or URL provided. Cannot fetch catalog.");
                 this.empty("Не удалось загрузить каталог: Нет данных категории.");
              }

            console.log("HanimeFullCatalogComponent: create() finished.");
         };

        this.start = function () {
            console.log("HanimeFullCatalogComponent: start()");
            if (window.Lampa?.Activity?.active()?.activity !== this.activity) { console.log("Not active."); return; }
             console.log("Activity active. Setting Controller.");

             // Set up Controller for VERTICAL Grid navigation on THIS component's scroll
             if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function' && scroll && typeof scroll.render === 'function' && itemsContainer) { // Check itemsContainer too

                 Lampa.Controller.add('content', {
                     toggle: function () {
                         console.log("Full Catalog Controller toggle().");
                         // Set the collection for the controller to the Scroll render (the main content area)
                         Lampa.Controller.collectionSet(scroll.render()); // Search within scroll's DOM
                         // Set initial focus (last focused element or the first)
                         Lampa.Controller.collectionFocus(last || false, scroll.render()); // Focus within scroll's DOM
                          console.log("Full Catalog Controller set/focus finished.");
                     }.bind(this),

                     // Navigation in Vertical Grid:
                     left: function () {
                         if (window.Navigator?.canmove('left')) Navigator.move('left'); else if (window.Lampa?.Controller?.toggle) Lampa.Controller.toggle('menu');
                     },
                     right: function () {
                         if (window.Navigator?.canmove('right')) Navigator.move('right');
                     },
                     up: function () {
                         if (window.Navigator?.canmove('up')) Navigator.move('up'); else if (window.Lampa?.Controller?.toggle) Lampa.Controller.toggle('head');
                     },
                     down: function () {
                          // Vertical navigation using Navigator.move
                         if (window.Navigator?.canmove('down') && window.Navigator?.move('down')) {
                              // If navigated down successfully, check if near bottom and load more
                              // Requires tracking if the current focused element is in the last few rows
                              // or if scroll emits a 'needmore' like event when nearing bottom of visual area
                               console.log("Navigated down.");
                              // Simple check: if total items exceed container height significantly, try loading next page
                               // This requires a method to check if current element is near bottom visible row
                               // A robust way is to rely on the 'needmore' event from the Scroll component
                         } else {
                              console.log("Nav down blocked.");
                         }
                     },
                     back: this.back
                 });
                 Lampa.Controller.toggle('content');
                 console.log("Full Catalog Controller 'content' toggled.");

                 // Initial scroll update should happen due to Controller.collectionFocus calling hover:focus

            } else { console.error("CRITICAL: Controller or scroll missing for Full Catalog start()."); if(window.Lampa?.Controller?.add) { Lampa.Controller.add('content', { back: this.back }); Lampa.Controller.toggle('content'); } }
        };

        this.pause = function () {
             console.log("HanimeFullCatalogComponent: pause()");
             if(window.Lampa?.Controller?.enabled()?.name === 'content' && window.Lampa?.Controller?.item) { last = Lampa.Controller.item() || last; console.log("Paused. Saved last focused item:", last); }
        };

        this.stop = function () { //console.log("stop()");
        };

        this.render = function () {
             console.log("HanimeFullCatalogComponent: render()");
             if (!html) this.buildLayout();

             // For this component, render needs to make sure the Scroll DOM is available.
             // In category-full, Scroll's render is the main component DOM.
             // It needs itemsContainer as content.

             if (!scroll && window.Lampa?.Scroll) scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });

             if (scroll && itemsContainer && typeof scroll.append === 'function' && typeof scroll.render === 'function') {
                 scroll.append(itemsContainer); // Make itemsContainer content of Scroll
                 console.log("HanimeFullCatalogComponent: render() - Appended itemsContainer to scroll.");
                 return scroll.render(); // Return Scroll's root DOM
             } else {
                 console.error("HanimeFullCatalogComponent: render() failed: Scroll or itemsContainer missing.");
                 return html || $('<div>Error loading</div>'); // Return basic HTML if scroll cannot be rendered
             }
        };

        this.destroy = function () {
            console.log("HanimeFullCatalogComponent: destroy() called.");
            if(network?.clear) network.clear(); network = null;
            if (items?.length && window.Lampa?.Arrays?.destroy) Lampa.Arrays.destroy(items); items = null;
            // Remove needmore listener explicitly
            if (scroll && typeof scroll.off === 'function') scroll.off('needmore');
             if (scroll?.destroy) scroll.destroy(); scroll = null;
            if (html?.remove) html.remove(); html = null; itemsContainer = null; last = null; categoryData = null;

            if (window.Lampa?.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function') {
                 if (Lampa.Controller.enabled()?.name === 'content' && typeof Lampa.Controller.collectionSet === 'function') Lampa.Controller.collectionSet([]);
                 Lampa.Controller.remove('content'); console.log("Controller removed.");
            } else console.warn("Controller cleanup missing.");
            console.log("HanimeFullCatalogComponent: destroy() finished.");
        };

        this.back = function () {
             console.log("HanimeFullCatalogComponent: back() called.");
             if(window.Lampa?.Activity?.backward) Lampa.Activity.backward();
             else console.warn("Activity.backward missing.");
        };
    }


    // --- Global Plugin Initialization ---
    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() invoked.");

        if (window.plugin_hanime_catalog_ready === true) { console.log("Flag already set. Exiting."); return; }
         // Flag set within initializeLampaDependencies.

        function initializeLampaDependencies() {
             console.log("Hanime Plugin: initializeLampaDependencies() called.");

             // Critical Lampa component checks
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Template || typeof Lampa.Template !== 'object' || !Lampa.Component || typeof Lampa.Component !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Scroll || typeof Lampa.Scroll !== 'function' || !Lampa.Reguest || typeof Lampa.Reguest !== 'function') {
                  console.error("Hanime Plugin: CRITICAL: Lampa components missing after waiting.");
                  if(window.Lampa?.Noty?.show) Lampa.Noty.show('Ошибка плагина: Компоненты Lampa недоступны.', 15000);
                  return; // Abort.
             }
             console.log("Lampa components OK.");

             // Set the global flag NOW, after checks
              if (window.plugin_hanime_catalog_ready !== true) { // Check again to be safe
                 window.plugin_hanime_catalog_ready = true;
                 console.log("Global flag set.");
              } else console.warn("Flag set unexpectedly.");


             // 1. Standard template fallbacks (Add directly)
             console.log("Adding template fallbacks...");
             if (Lampa.Template?.add) {
                 Lampa.Template.add('card_vote_temp', '<div class="card__vote"></div>');
                 Lampa.Template.add('card_quality_temp', '<div class="card__quality"><div></div></div>');
                 Lampa.Template.add('card_year_temp', '<div class="card__age"></div>');
                 Lampa.Template.add('card_type_temp', '<div class="card__type"></div>');
                 Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
                  console.log("Templates added.");
             } else console.error("Template.add missing.");


             // 2. Define OUR card template
             console.log("Adding hanime-card template...");
             if (Lampa.Template?.add) {
                 Lampa.Template.add('hanime-card', `
                     <div class="hanime-card card selector layer--visible layer--render">
                         <div class="card__view">
                             <img src="./img/img_load.svg" class="card__img" alt="{title}" loading="lazy" />
                             <div class="card__icons"><div class="card__icons-inner"></div></div>
                             <!-- Placeholders, populated by JS addDetails() -->
                              <div class="card__vote"></div>
                              <div class="card__quality"><div></div></div>
                              <div class="card__type"></div>
                         </div>
                         <div class="card__title">{title}</div>
                         <div class="card__age"></div>
                     </div>
                 `);
                  console.log("HanimeCard template added.");
             } else console.error("Template.add missing.");


             // 3. CSS Styles - Removed
             console.log("Custom CSS REMOVED.");


             // 4. Register OUR components
             console.log("Registering components...");
             if (Lampa.Component?.add) {
                 Lampa.Component.add('main_hanime_catalog', MainCatalogComponent); // The main catalog component
                 Lampa.Component.add('hanime_full_category', HanimeFullCatalogComponent); // The full category component (used by More button)
                 console.log("Components registered: main_hanime_catalog, hanime_full_category.");
             } else console.error("Component.add missing. Cannot register.");


             // 5. Add menu item (launches the MAIN catalog component)
             console.log("Calling addMenuItem()...");
             addMenuItem();


             console.log("initializeLampaDependencies finished.");
        }


        // Add a menu item to launch the main catalog component
        function addMenuItem() {
             console.log("addMenuItem() called.");

             if (!window.Lampa || !Lampa.Activity || !Lampa.Controller || !window.$ || !Lampa.Component || typeof Lampa.Component.get !== 'function') {
                  console.warn("addMenuItem cannot proceed: Lampa UI components missing."); return;
             }
             var menuList = $('.menu .menu__list').eq(0);
             if (!menuList.length) { console.warn("addMenuItem cannot proceed: menu DOM missing."); return; }

             // Check if our MAIN catalog component is registered
             var mainCatalogComponentRegistered = Lampa.Component.get('main_hanime_catalog');
             if (!mainCatalogComponentRegistered) {
                 console.warn("addMenuItem skipping: Component 'main_hanime_catalog' not registered."); return;
             }


             if (menuList.find('.menu__text:contains("Hanime Catalog")').length > 0) {
                 console.log("Menu item exists."); return;
             }
             console.log("Adding menu item DOM.");

            var menu_item = $(`
                <li class="menu__item selector">
                    <div class="menu__ico"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg></div>
                    <div class="menu__text">Hanime Catalog</div>
                </li>
            `);

            if (typeof menu_item.on === 'function' && typeof Lampa.Activity.push === 'function') {
                menu_item.on('hover:enter', function () {
                     console.log("Menu item activated. Pushing 'main_hanime_catalog'.");
                     // Launch the main catalog component activity
                    Lampa.Activity.push({
                        url: '', title: 'Каталог аниме', component: 'main_hanime_catalog', page: 1
                    });
                }); console.log("Listener attached to menu item.");
            } else console.warn("jQuery.on or Activity.push missing.");

            menuList.append(menu_item); console.log("Menu item DOM added.");
        }


        // --- ENTRY POINT: Wait for Lampa readiness ---
        console.log("startPlugin() invoked. Setting up Lampa ready listener.");

         if (window.plugin_hanime_catalog_ready === true) { console.log("Flag already set."); return; }


         if (!window.Lampa?.Listener?.follow) { // Check for listener Availability
              console.warn("Lampa Listener missing. Checking appready flag directly or scheduling delayed start.");
              if (window.appready === true) {
                  console.log("Lampa 'appready' flag found. Calling init directly.");
                  initializeLampaDependencies(); // Call init directly
              } else {
                  console.error("Neither Listener nor 'appready' available. Attempting delayed initialization as UNRELIABLE fallback.");
                   setTimeout(initializeLampaDependencies, 1500); // Increase delay a bit for more complex init
                   console.log("Delayed initialization scheduled.");
               }
         } else {
             console.log("Lampa Listener available. Subscribing to 'app:ready'.");
             Lampa.Listener.follow('app', function (e) {
                 if (e.type === 'ready') {
                     console.log("Lampa 'appready' event received. Calling initializeLampaDependencies.");
                     initializeLampaDependencies();
                 }
             }); console.log("Subscribed.");
         }

         console.log("startPlugin() finished initial setup.");
    }

    startPlugin(); // Start the plugin
})();
