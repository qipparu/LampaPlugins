(function () {
    'use strict';

    // Define the API base URL and the categories with their titles and relative URLs
    var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
    var CATEGORIES = {
        newset: { url: "/catalog/movie/newset.json", title: "Последние добавленные" },
        recent: { url: "/catalog/movie/recent.json", title: "Недавние" },
        mostlikes: { url: "/catalog/movie/mostlikes.json", title: "Популярные (лайки)" },
        mostviews: { url: "/catalog/movie/mostviews.json", title: "Популярные (просмотры)" }
    };
    var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
    var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";
    var PROXY_BASE_URL = "http://77.91.78.5:3000"; // Keep this if needed for proxying

    // --- HanimeCard Class (Mostly Unchanged) ---
    // Represents a single card element and its data binding/event handling
    function HanimeCard(data, componentRef) {
        var processedData = {
            id: data.id,
            title: data.name || data.title || 'Без названия',
            poster_path: data.poster || data.img,
            vote_average: data.vote_average || data.vote || null,
            quality: data.quality || data.release_quality || null,
            release_year: ((data.year || data.release_date || '') + '').slice(0, 4),
            type: data.first_air_date ? 'tv' : 'movie',
            original_name: data.original_name
        };

        var cardTemplate = Lampa.Template.get('hanime-card', {
            img: processedData.poster_path,
            title: processedData.title
        });

        var cardElement = $(cardTemplate); // Use jQuery

        // Attach data and component reference to the element for later access
        cardElement.data('cardData', processedData);
        cardElement.data('cardComponentRef', componentRef); // Reference to the main screen component

        this.addicon = function(name) {
            var iconsContainer = cardElement.find('.card__icons-inner');
            if (iconsContainer.length) {
                var icon = document.createElement('div');
                icon.classList.add('card__icon');
                icon.classList.add('icon--'+name);
                iconsContainer.append(icon);
            } else {
                console.warn("HanimeCard: Could not find .card__icons-inner to add icon:", name);
            }
        }

        this.addDetails = function() {
             var viewElement = cardElement.find('.card__view');

             if (processedData.vote_average > 0 && viewElement.length) {
                 let voteElement = cardElement.find('.card__vote');
                 if (!voteElement.length) {
                     voteElement = $('<div class="card__vote"></div>');
                     viewElement.append(voteElement);
                 }
                 voteElement.text(parseFloat(processedData.vote_average).toFixed(1));
             } else {
                 cardElement.find('.card__vote').remove();
             }

            if (processedData.quality && viewElement.length) {
                 let qualityElement = cardElement.find('.card__quality');
                 if (!qualityElement.length) {
                     qualityElement = $('<div class="card__quality"><div></div></div>');
                     viewElement.append(qualityElement);
                 }
                 qualityElement.find('div').text(processedData.quality);
            } else {
                cardElement.find('.card__quality').remove();
            }

             if (processedData.type && viewElement.length) {
                 let typeElement = cardElement.find('.card__type');
                  if (!typeElement.length) {
                     typeElement = $('<div class="card__type"></div>');
                      viewElement.append(typeElement);
                  }
                  typeElement.text(processedData.type.toUpperCase());
             } else {
                 cardElement.find('.card__type').remove();
             }

             let ageElement = cardElement.find('.card__age');
             if (ageElement.length) {
                  if (processedData.release_year !== '0000' && processedData.release_year) {
                      ageElement.text(processedData.release_year).show();
                  } else {
                       ageElement.text('').hide();
                  }
             } else {
                 if (processedData.release_year !== '0000' && processedData.release_year) {
                     let newAgeElement = $('<div class="card__age"></div>').text(processedData.release_year);
                      let titleElement = cardElement.find('.card__title');
                      if (titleElement.length) {
                          titleElement.after(newAgeElement);
                          // console.warn("HanimeCard: Created .card__age element dynamically. Prefer including in template.");
                      } else {
                          cardElement.append(newAgeElement);
                          console.error("HanimeCard: Cannot find .card__title to place .card__age dynamically.");
                      }
                 }
             }
        }

        this.updateFavoriteIcons = function() {
            cardElement.find('.card__icons-inner').empty();
            cardElement.find('.card__marker').remove();

             var status = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(processedData) : {};
             if(Object.keys(status).length === 0 && window.Lampa && Lampa.Favorite) console.log("HanimeCard: Lampa.Favorite.check returned empty status for", processedData.title, ". Data:", processedData);

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
                     cardElement.find('.card__view').append(markerElement);
                 }
                 markerElement.find('span').text(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? Lampa.Lang.translate('title_' + activeMarker) : activeMarker);
                 markerElement.removeClass(marks.map(m => 'card__marker--' + m).join(' '))
                             .addClass('card__marker--' + activeMarker);
             } else {
                 cardElement.find('.card__marker').remove();
             }
        };

        // This is called when the card becomes visible in the scrollable area
        this.onVisible = function() {
             var imgElement = cardElement.find('.card__img');

             if (imgElement.length && (!imgElement.attr('src') || imgElement.attr('src').includes('img_load.svg'))) {
                 var src = processedData.poster_path;

                 if(window.Lampa && Lampa.ImageCache && typeof Lampa.ImageCache.read === 'function' && typeof Lampa.ImageCache.write === 'function') {
                      if(!Lampa.ImageCache.read(imgElement[0], src)) {
                          imgElement[0].onload = () => {
                              cardElement.addClass('card--loaded');
                              Lampa.ImageCache.write(imgElement[0], imgElement[0].src);
                          };
                          imgElement[0].onerror = () => {
                               console.error('Hanime Plugin: Image load error:', src);
                               imgElement.attr('src', './img/img_broken.svg');
                               if(window.Lampa && Lampa.Tmdb && typeof Lampa.Tmdb.broken === 'function') Lampa.Tmdb.broken();
                          };
                          imgElement.attr('src', src || './img/img_broken.svg');
                      } else {
                         cardElement.addClass('card--loaded');
                      }
                 } else {
                     console.warn("Hanime Plugin: Lampa.ImageCache not available. Using basic image loading.");
                      imgElement[0].onload = () => { cardElement.addClass('card--loaded'); /* console.log("HanimeCard: Image loaded (basic):", src); */ };
                     imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error (basic):', src); imgElement.attr('src', './img/img_broken.svg'); };
                     imgElement.attr('src', src || './img/img_broken.svg');
                 }
             } // If img already has src and not loading placeholder, do nothing

            this.updateFavoriteIcons();
        }

        // Creates DOM elements and attaches basic listeners (visible)
        this.create = function(){
             if (cardElement.data('created')) {
                 return; // Already created
             }

             // Event listeners for focus and interaction will be handled by the main screen controller
             // and delegated based on focused element.

             this.card = cardElement[0]; // Get native DOM element
             if (this.card && typeof this.card.addEventListener === 'function') {
                this.card.addEventListener('visible', this.onVisible.bind(this));
             } else {
                 console.warn("HanimeCard: Cannot attach 'visible' event listener, native element or addEventListener not available.");
             }

             // Add details and update icons once
             setTimeout(() => {
                  this.addDetails();
                  this.updateFavoriteIcons(); // Initial update
             }, 0);


             cardElement.data('created', true);
        }

        // Called to update dynamic parts like favorite icons
        this.update = function(){
            this.updateFavoriteIcons();
             // Lampa's Timeline watched status update is often done externally via Controller.item()
             // We don't need to do it inside the card itself typically.
             // if(window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched_status === 'function') Lampa.Timeline.watched_status(cardElement, processedData);
             // else console.warn("HanimeCard: Cannot update watched status, Lampa.Timeline not available or method missing.");
        }

        // Returns the card's DOM element (jQuery or native)
        this.render = function(js){
             if (!cardElement.data('created')) {
                 this.create();
             }
            return js ? cardElement[0] : cardElement;
        }

        // Destroys the card instance and its DOM element
        this.destroy = function(){
             console.log("HanimeCard: destroy()", processedData.title);
             if(this.card && typeof this.card.removeEventListener === 'function' && this.onVisible) this.card.removeEventListener('visible', this.onVisible.bind(this));
             if(cardElement && typeof cardElement.remove === 'function') cardElement.remove();

             // Remove data attached to the element
             if (cardElement && typeof cardElement.removeData === 'function') {
                cardElement.removeData('cardData');
                cardElement.removeData('cardComponentRef');
                cardElement.removeData('created');
             }

             // Nullify references
             processedData = null; cardElement = null; this.card = null; componentRef = null;
        }
    }

    // --- HanimeRow Class (Internal Helper for Main Screen) ---
    // Represents a single horizontal row/list of cards for a specific category
    function HanimeRow(categoryKey, categoryTitle, itemsData, parentScreenRef) {
        var scroll = null;
        var items = []; // Array of HanimeCard instances
        var html = null; // The main DOM element for this row (.items-line)
        var itemsContainer = null; // The container for cards (.items-cards)

        this.categoryKey = categoryKey;
        this.categoryTitle = categoryTitle;
        this.itemsData = itemsData; // The raw data for items in this row
        this.$cards = $(); // jQuery collection of card DOM elements
        this.parentScreenRef = parentScreenRef; // Reference to the main screen component

        console.log("HanimeRow: Initializing for category:", categoryTitle);

        // Builds the row's DOM structure initially
        this.buildLayout = function() {
             html = $(`
                 <div class="items-line layer--visible layer--render items-line--type-cards">
                     <div class="items-line__head">
                         <div class="items-line__title">${this.categoryTitle}</div>
                     </div>
                     <div class="items-line__body">
                     </div>
                 </div>
             `);
             itemsContainer = $('<div class="items-cards"></div>');

             // Initialize scroll for this row
             if (window.Lampa && typeof Lampa.Scroll === 'function') {
                  scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
                  console.log("HanimeRow:", this.categoryTitle, "- Lampa.Scroll initialized (horizontal).");
             } else {
                  console.warn("HanimeRow:", this.categoryTitle, "- Lampa.Scroll not available.");
             }
        };

        // Populates the row with cards from the data
        this.buildCards = function() {
             console.log("HanimeRow:", this.categoryTitle, "- Building UI with", this.itemsData.length, "items.");

             if (!(itemsContainer && typeof itemsContainer.empty === 'function' && scroll && html && typeof html.find === 'function' && typeof html.append === 'function' && typeof scroll.append === 'function' && typeof scroll.render === 'function')) {
                  console.error("HanimeRow:", this.categoryTitle, "- Missing critical DOM/Lampa dependencies to build cards. Aborting UI build.");
                   return;
             }

            itemsContainer.empty();
            items = [];

            if(itemsContainer && scroll && window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function') {
                 this.itemsData.forEach(function (meta) {
                    // Pass the parentScreenRef to each card instance
                    var card = new HanimeCard(meta, parentScreenRef);
                    var cardElement = card.render(); // Get the card's jQuery element

                    // No need to attach click/long listeners here, the main controller handles them
                    // cardElement.on('hover:enter', ...);
                    // cardElement.on('hover:long', ...);

                     itemsContainer.append(cardElement); // Append jQuery element
                    items.push(card);
                });
                 console.log("HanimeRow:", this.categoryTitle, "- Created and added", items.length, "cards to itemsContainer.");

                scroll.append(itemsContainer); // Append jQuery element

                html.find('.items-line__body').empty().append(scroll.render(true)); // Append native DOM element

                 // Store the collection of selectable card elements for this row
                 this.$cards = itemsContainer.find('.selector');
                 console.log("HanimeRow:", this.categoryTitle, "- Found", this.$cards.length, "selectable cards.");

            } else {
                console.error("HanimeRow:", this.categoryTitle, "- Missing required objects or methods before building cards.");
                 // Error state might be handled by main screen
            }
        };

        // Public method: Returns the main DOM element for this row
        this.render = function() {
            if (!html) {
                 this.buildLayout();
                 this.buildCards(); // Build cards immediately after layout if data is ready
            }
            return html[0]; // Return native DOM element
        }

        // Public method: Returns the jQuery collection of selectable card elements in this row
        this.getSelectableElements = function() {
             return this.$cards;
        }

        // Public method: Updates the scroll position to make the given element visible
        this.updateScrollPosition = function(element) {
            if (scroll && typeof scroll.update === 'function' && element && typeof element.length !== 'undefined') {
                scroll.update($(element), true); // Ensure element is a jQuery object
            } else {
                 console.warn("HanimeRow:", this.categoryTitle, "- Scroll instance or update method, or valid element missing to scroll.");
            }
        }

        // Public method: Destroys the row instance and its DOM elements
        this.destroy = function() {
             console.log("HanimeRow:", this.categoryTitle, "- destroy() called.");
             if (items && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') {
                 Lampa.Arrays.destroy(items); // Destroys all HanimeCard instances
                 console.log("HanimeRow:", this.categoryTitle, "- Destroyed items array.");
             }
            items = null; this.itemsData = null; this.$cards = $(); // Clear references

             if (scroll && typeof scroll.destroy === 'function') {
                 scroll.destroy();
                 console.log("HanimeRow:", this.categoryTitle, "- Destroyed scroll instance.");
             }
             scroll = null;

             if (html && typeof html.remove === 'function') {
                 html.remove();
                 console.log("HanimeRow:", this.categoryTitle, "- Removed html element from DOM.");
             }
            html = null; itemsContainer = null; this.parentScreenRef = null;

            console.log("HanimeRow:", this.categoryTitle, "- destroy() finished.");
        }

        // Initial build
        if (this.itemsData && Array.isArray(this.itemsData)) {
            this.buildLayout();
            this.buildCards();
        } else {
             console.error("HanimeRow: Initialized without valid itemsData for category:", categoryTitle);
             // This row might be created empty or an error message shown by the parent
        }
    }


    // --- HanimeMainScreenComponent Class (Main Component) ---
    // Manages the entire screen, fetches data for all categories,
    // creates HanimeRow instances, and manages the Controller navigation.
    function HanimeMainScreenComponent(componentObject) {
        var network = null;
        var html = null; // Main container element for the screen
        var rows = []; // Array of HanimeRow instances
        var focusedRowIndex = 0; // Index of the currently focused row
        var lastFocusedItemIndex = 0; // Index of the focused item within the focused row

        this.activity = componentObject.activity; // Keep activity reference for loader

        console.log("HanimeMainScreenComponent: Initializing.");

        // Builds the main screen container layout
        this.buildLayout = function() {
            html = $(`
                <div class="hanime-main-screen">
                    <!-- Rows will be appended here -->
                </div>
            `);
             console.log("HanimeMainScreenComponent: Main layout built.");
        };

        // Fetches data for all categories concurrently
        this.fetchCatalogs = function () {
            var _this = this;
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeMainScreenComponent: Activity loader not available in fetchCatalogs.");

            console.log("HanimeMainScreenComponent: fetchCatalogs() - Starting requests for all categories.");

             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeMainScreenComponent: Lampa.Reguest initialized.");
             }

             if (network && typeof network.clear === 'function') network.clear();
             else console.warn("HanimeMainScreenComponent: Network clear method not available.");

             if(!network || typeof network.native !== 'function'){
                 console.error("HanimeMainScreenComponent: Network component or its native method not available.");
                  _this.empty("Не удалось загрузить каталоги. Ошибка инициализации сети.");
                 return;
             }

             // Create a promise for each category fetch
             const fetchPromises = Object.keys(CATEGORIES).map(key => {
                 const category = CATEGORIES[key];
                 const url = API_BASE_URL + category.url;
                 console.log("HanimeMainScreenComponent: Fetching category:", key, "from", url);
                 // Wrap the native call in a Promise
                 return new Promise((resolve, reject) => {
                     network.native(url,
                         (data) => { resolve({ key, data }); }, // Resolve with category key and data
                         (errorStatus, errorText) => {
                             console.error("HanimeMainScreenComponent: Failed to load category:", key, "Status:", errorStatus, "Error:", errorText);
                              // Resolve with null data or a specific error structure for this category
                              // so Promise.all doesn't fail if one category fails.
                              resolve({ key, error: { status: errorStatus, text: errorText } });
                         },
                         false,
                         { dataType: 'json', timeout: 15000 }
                     );
                 });
             });

             Promise.all(fetchPromises)
                 .then(results => {
                      if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                     console.log("HanimeMainScreenComponent: All category fetches completed.", results);
                     _this.build(results);
                 })
                 .catch(error => {
                     // This catch would only be hit if Promise.all itself failed, not individual native calls
                     // because we are resolving individual promises even on error.
                      if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                     console.error("HanimeMainScreenComponent: Unhandled error in Promise.all during catalog fetch:", error);
                      _this.empty("Произошла неожиданная ошибка при загрузке каталогов.");
                 });
        };

        // Builds the screen layout with rows using fetched data
        this.build = function (results) {
            var _this = this;
             console.log("HanimeMainScreenComponent: build() - Processing fetch results.");

             if (!(html && typeof html.empty === 'function' && typeof html.append === 'function')) {
                  console.error("HanimeMainScreenComponent: Missing main screen HTML container in build(). Aborting UI build.");
                   if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                  _this.empty("Не удалось построить интерфейс.");
                  return;
             }

            html.empty(); // Clear any previous content
            rows = []; // Reset rows array

            let allCardsCollection = $(); // To collect all card elements for the global controller

            results.forEach(result => {
                 const categoryKey = result.key;
                 const categoryData = CATEGORIES[categoryKey];
                 const fetchedData = result.data;
                 const fetchError = result.error;

                 if (fetchError) {
                     console.warn("HanimeMainScreenComponent: Skipping row for category", categoryKey, "due to fetch error:", fetchError);
                     // Optionally, add a row placeholder indicating the error
                     // html.append($(`<div class="items-line"><div class="items-line__head"><div class="items-line__title">${categoryData.title}</div></div><div class="items-line__body">Ошибка загрузки: ${fetchError.status}</div></div>`));
                     return; // Skip this category
                 }

                 if (fetchedData && fetchedData.metas && Array.isArray(fetchedData.metas) && fetchedData.metas.length > 0) {
                    // Create a HanimeRow instance for this category
                    var row = new HanimeRow(categoryKey, categoryData.title, fetchedData.metas, _this);
                    rows.push(row);

                    // Append the row's DOM element to the main screen HTML
                    html.append($(row.render()));

                    // Add the selectable cards from this row to the main collection
                    allCardsCollection = allCardsCollection.add(row.getSelectableElements());

                 } else {
                      console.log("HanimeMainScreenComponent: No items or invalid data for category:", categoryKey);
                      // Optionally, add an empty row or message
                      // html.append($(`<div class="items-line"><div class="items-line__head"><div class="items-line__title">${categoryData.title}</div></div><div class="items-line__body">Нет элементов в этой категории.</div></div>`));
                 }
            });

             if (rows.length === 0) {
                _this.empty("Не удалось загрузить ни один каталог или они пусты.");
                 console.log("HanimeMainScreenComponent: No rows built.");
             } else {
                 console.log("HanimeMainScreenComponent: Built", rows.length, "rows.");
                  console.log("HanimeMainScreenComponent: Total selectable cards:", allCardsCollection.length);

                 // Store the complete collection of selectable cards for the controller
                 this.$allCards = allCardsCollection;
             }


             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
             if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
             console.log("HanimeMainScreenComponent: Build process completed and activity toggled.");
        };

         // Helper to find row and item index for a given card element
         this.findCardPosition = function(element) {
             if (!element || !element.jquery) element = $(element); // Ensure it's a jQuery object

              for(let i = 0; i < rows.length; i++) {
                  const row = rows[i];
                   const itemIndex = row.getSelectableElements().index(element);
                  if (itemIndex !== -1) {
                      return { rowIndex: i, itemIndex: itemIndex, element: element, row: row };
                  }
              }
              console.warn("HanimeMainScreenComponent: Could not find position for element:", element);
              return { rowIndex: -1, itemIndex: -1, element: element, row: null }; // Not found
         }

        // Handler for card click (Enter press)
         this.onCardClick = function(cardData) {
             console.log("HanimeMainScreenComponent: Card clicked:", cardData.title, "(ID:", cardData.id, ")");
             // Fetch stream and meta using the card data
            this.fetchStreamAndMeta(cardData.id, cardData);
         }

         // Handler for card long press
         this.showCardContextMenu = function(cardElement, cardData) {
             console.log("HanimeMainScreenComponent: showCardContextMenu for", cardData.title);
             var _this = this;

             var enabled = (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;

             // Ensure cardData is the processed data stored on the element
             const dataFromElement = $(cardElement).data('cardData');
             if (!dataFromElement) {
                  console.error("HanimeMainScreenComponent: No cardData found on element for context menu.");
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка данных карточки.', 5000);
                  }
                  return;
             }
             cardData = dataFromElement; // Use data from element

             var status = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(cardData) : {};

             var menu_favorite = [];
             if(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') {
                 menu_favorite = [
                     { title: Lampa.Lang.translate('title_book'), where: 'book', checkbox: true, checked: status.book, collect: true }, // Added collect: true
                     { title: Lampa.Lang.translate('title_like'), where: 'like', checkbox: true, checked: status.like, collect: true }, // Added collect: true
                     { title: Lampa.Lang.translate('title_wath'), where: 'wath', checkbox: true, checked: status.wath, collect: true }, // Added collect: true
                     { title: Lampa.Lang.translate('menu_history'), where: 'history', checkbox: true, checked: status.history, collect: true }, // Added collect: true
                     { title: Lampa.Lang.translate('settings_cub_status'), separator: true }
                 ];
                 // Add status items if they exist in Lampa.Lang
                 const marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];
                 marks.forEach(mark => {
                      if (Lampa.Lang.translate('title_' + mark) !== 'title_' + mark) { // Check if translation exists
                          menu_favorite.push({
                              title: Lampa.Lang.translate('title_' + mark),
                              where: mark,
                              checkbox: true, // Checkbox for status
                              checked: status[mark],
                              collect: true // Collect status changes
                          });
                      }
                 });

             } else {
                 console.warn("HanimeMainScreenComponent: Lampa.Lang not available, using English for menu items.");
                 menu_favorite = [
                      { title: 'Planned', where: 'book', checkbox: true, checked: status.book, collect: true },
                     { title: 'Liked', where: 'like', checkbox: true, checked: status.like, collect: true },
                     { title: 'Watching', where: 'wath', checkbox: true, checked: status.wath, collect: true },
                     { title: 'History', where: 'history', checkbox: true, checked: status.history, collect: true },
                     { title: 'Status', separator: true },
                     { title: 'Looked', where: 'look', checkbox: true, checked: status.look, collect: true },
                     { title: 'Viewed', where: 'viewed', checkbox: true, checked: status.viewed, collect: true },
                     { title: 'Scheduled', where: 'scheduled', checkbox: true, checked: status.scheduled, collect: true },
                     { title: 'Continued', where: 'continued', checkbox: true, checked: status.continued, collect: true },
                     { title: 'Thrown', where: 'thrown', checkbox: true, checked: status.thrown, collect: true }
                 ];
             }


             if (window.Lampa && Lampa.Select && typeof Lampa.Select.show === 'function') {
                 Lampa.Select.show({
                     title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('title_action') : 'Action',
                     items: menu_favorite,
                     onBack: ()=>{
                         if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                          console.log("HanimeMainScreenComponent: Context menu back button pressed. Restored controller:", enabled);
                     },
                      // onCheck is called when a checkbox changes state
                     onCheck: (a)=>{
                         console.log("HanimeMainScreenComponent: Context menu - checkbox toggled:", a.where, "Checked:", a.checked);
                         if(window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function') Lampa.Favorite.toggle(a.where, cardData);

                         // Find the card instance and update its icons
                         const cardInstance = $(cardElement).data('cardInstance');
                          if(cardInstance && typeof cardInstance.update === 'function') cardInstance.update();
                         else console.warn("HanimeMainScreenComponent: Failed to find Card object to update icons after onCheck.");
                     },
                      // onSelect is called when an item is selected (relevant for non-checkbox items, or if checkbox logic is complex)
                      // For simple toggles, onCheck is often sufficient. We use collect: true with onCheck.
                     onSelect: (a)=>{
                         // This part is mainly for items without `collect: true` or custom logic
                          console.log("HanimeMainScreenComponent: Context menu - item selected:", a);
                           // Close the selectbox and restore controller
                           if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                           if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                            console.log("HanimeMainScreenComponent: Context menu selected and closed.");
                     },
                      onDraw: (item, elem) => {
                           // Custom drawing logic, e.g., for premium features lock icon
                           if (elem.collect && window.Lampa && Lampa.Account && typeof Lampa.Account.hasPremium === 'function' && !Lampa.Account.hasPremium()) {
                                let lockIconTemplate = (window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.has('icon_lock')) ? Lampa.Template.get('icon_lock') : null;
                                if (lockIconTemplate && window.$ && typeof item.find === 'function' && typeof item.append === 'function') {
                                     let wrap = $('<div class="selectbox-item__lock"></div>');
                                     wrap.append($(lockIconTemplate));
                                     item.find('.selectbox-item__checkbox').remove(); // Remove default checkbox for premium items
                                     item.append(wrap);

                                     // Modify hover:enter behavior for premium items
                                     item.off('hover:enter').on('hover:enter', () => {
                                         if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                                          if (window.Lampa && Lampa.Account && typeof Lampa.Account.showCubPremium === 'function') Lampa.Account.showCubPremium();
                                     });
                                } else {
                                     console.warn("HanimeMainScreenComponent: icon_lock template or Template/jQuery/methods missing for Premium item draw.");
                                }
                           }
                      }
                 });
             } else {
                 console.warn("HanimeMainScreenComponent: Lampa.Select component not available to show context menu.");
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Компонент меню недоступен.', 5000);
                 }
             }
         };


        // Fetches stream and meta data for playback
        this.fetchStreamAndMeta = function (id, meta) {
             var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeMainScreenComponent: Activity loader not available in fetchStreamAndMeta.");

            console.log("HanimeMainScreenComponent: fetchStreamAndMeta for ID:", id);

            if (!network || typeof network.native !== 'function') {
                console.error("HanimeMainScreenComponent: Network component or its native method not available.");
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Сетевой компонент недоступен для загрузки потока.', 5000);
                return;
            }

            // Use Promise.all to fetch stream and meta in parallel
            Promise.all([
                new Promise((resolve, reject) => {
                    if(streamUrl && network) network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                    else reject('Stream URL or Network unavailable');
                }),
                // If we already have sufficient meta data from the list, use it. Otherwise, fetch.
                // The `meta` argument is the data from the list, which might be incomplete.
                // The API provides a full meta endpoint if needed.
                // For this API, the list meta seems sufficient, so we can often skip the metaUrl call.
                // Let's assume the meta provided in the list is sufficient for player info and history.
                // If you need full details (like plot, genres, etc.), you might need to fetch metaUrl here.
                // For now, relying on the list meta.
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                     // Fallback to fetching full meta if list meta is missing (shouldn't happen with this API)
                     if(metaUrl && network) network(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                     else reject('Meta URL or Network unavailable for fallback');
                 })
            ]).then(([streamData, metaDataResponse]) => {
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);

                // Use the meta data provided initially if available, otherwise the fetched one
                const fullMetaData = meta || (metaDataResponse ? (metaDataResponse.meta || metaDataResponse) : null);
                console.log("HanimeMainScreenComponent: Stream data received:", streamData);
                console.log("HanimeMainScreenComponent: Meta Data (used for player/history):", fullMetaData);

                if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0]; // Assuming the first stream is the primary one
                    var finalStreamUrl = streamToPlay ? streamToPlay.url : null;

                    if(finalStreamUrl) {
                         try {
                             // Check if the stream URL requires proxying
                             // This is based on the specific API and potential geo-restrictions
                             var url = new URL(finalStreamUrl);
                             if (url.hostname && url.hostname.includes('highwinds-cdn.com') && PROXY_BASE_URL) {
                                 finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                                 console.log("HanimeMainScreenComponent: Stream URL proxied.");
                             } else {
                                console.log("HanimeMainScreenComponent: Stream URL does not require proxy:", finalStreamUrl);
                             }
                         } catch (e) {
                            console.error("HanimeMainScreenComponent: Failed to parse or proxy stream URL:", e);
                             console.log("HanimeMainScreenComponent: Using original stream URL due to error:", finalStreamUrl);
                         }
                    }

                    // Prepare the player object
                    var playerObject = {
                        title: fullMetaData ? (fullMetaData.name || fullMetaData.title || 'Без названия') : 'Без названия',
                        url: finalStreamUrl,
                        poster: fullMetaData ? (fullMetaData.poster || fullMetaData.background || '') : '',
                    };

                    if (playerObject.url && window.Lampa && Lampa.Player && typeof Lampa.Player.play === 'function' && typeof Lampa.Player.playlist === 'function') {
                         console.log("HanimeMainScreenComponent: Launching player.");
                         Lampa.Player.play(playerObject);
                         Lampa.Player.playlist([playerObject]); // Player might need a playlist array

                         // Add item to history (using the meta data)
                         if (fullMetaData && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                                // Structure the history meta data appropriately
                                const historyMeta = {
                                    id: fullMetaData.id || '', // Required
                                     title: fullMetaData.name || fullMetaData.title || '', // Required
                                     poster: fullMetaData.poster || fullMetaData.background || '',
                                    runtime: fullMetaData.runtime, // If available
                                     year: fullMetaData.year || (fullMetaData.release_date ? fullMetaData.release_date.slice(0,4) : ''), // If available
                                    original_name: fullMetaData.original_name || '',
                                    // Add other fields Lampa's history/favorite might use if available in fullMetaData
                                     type: fullMetaData.type || (fullMetaData.first_air_date ? 'tv' : 'movie') // Important for history/favorite checks
                                };
                                Lampa.Favorite.add('history', historyMeta, 100); // Add to history, percentage watched 100 (start)
                                console.log("HanimeMainScreenComponent: Added to history.", historyMeta);
                         } else {
                              console.warn("HanimeMainScreenComponent: Lampa.Favorite or add method not available to add to history.");
                         }

                    } else {
                         console.error("HanimeMainScreenComponent: Cannot launch player. Missing stream URL, Lampa.Player, or methods.");
                         if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                             Lampa.Noty.show(playerObject.url ? 'Компонент плеера недоступен.' : 'Не удалось получить ссылку на поток.', 5000);
                         }
                    }

                } else {
                     console.warn("HanimeMainScreenComponent: No streams found in API data or invalid structure for ID:", id);
                     if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                         Lampa.Noty.show('Потоки не найдены для этого аниме.', 5000);
                     }
                }

            }).catch(error => {
                 // This catch would only be hit if the Promises themselves failed (e.g., network error before native call)
                if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                console.error("HanimeMainScreenComponent: Error fetching stream/meta details:", error);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'), 5000);
                 }
            });
        };


        // Displays an empty state message
        this.empty = function (msg) {
             console.log("HanimeMainScreenComponent: empty() - Displaying message:", msg);
             if (window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function') {
                 var empty = new Lampa.Empty({ message: msg });
                 if(html && typeof html.empty === 'function' && typeof html.append === 'function') html.empty().append(empty.render(true));
                 else console.warn("HanimeMainScreenComponent: Main HTML container not available or its methods missing to show empty state.");

                 if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(false);
                 if(this.activity && typeof this.activity.toggle === 'function') this.activity.toggle();
                 // Assign the start method from Lampa.Empty to allow navigation out
                 if (typeof empty.start === 'function') this.start = empty.start;
                 else console.warn("HanimeMainScreenComponent: Empty component does not have a start method.");

                  console.log("HanimeMainScreenComponent: Displaying empty state via Lampa.Empty.");
             } else {
                  console.warn("HanimeMainScreenComponent: Lampa.Empty component not available. Using basic text fallback.");
                  if(html && typeof html.empty === 'function' && typeof html.text === 'function') html.empty().text(msg + ' (Компонент Empty недоступен в Lampa)');
                 if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(false);
                 if(this.activity && typeof this.activity.toggle === 'function') this.activity.toggle();
                   // Fallback start method if Lampa.Empty is not available
                   this.start = function() {
                        console.log("HanimeMainScreenComponent: Fallback start() for empty state. Setting minimal Controller.");
                       if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                            // Add a basic controller just for the back button
                            Lampa.Controller.add('content', { back: this.back });
                            Lampa.Controller.toggle('content');
                       } else console.warn("HanimeMainScreenComponent: Lampa.Controller not available for fallback start method.");
                   }.bind(this);
             }
        };


        // Creates the component's initial structure and starts data fetching
        this.create = function () {
            console.log("HanimeMainScreenComponent: create()");
             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeMainScreenComponent: Lampa.Reguest initialized in create().");
              } else if (!network) console.warn("HanimeMainScreenComponent: Network not initialized in create(), Lampa.Reguest missing.");

            this.buildLayout(); // Build the main screen container HTML
             if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(true);
            this.fetchCatalogs(); // Fetch data for all rows
             console.log("HanimeMainScreenComponent: create() finished. Fetching catalogs initiated.");
        };

        // Called when the component becomes the active screen
        this.start = function () {
            console.log("HanimeMainScreenComponent: start()");
            // Check if this activity is the currently active one before setting up the controller
             if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this.activity) {
                console.log("HanimeMainScreenComponent: start() - Not the currently active activity, skipping controller setup.");
                return;
            }

             if (rows.length === 0 || !this.$allCards || this.$allCards.length === 0) {
                  console.log("HanimeMainScreenComponent: No rows or cards to display. Start will rely on empty state setup.");
                 // If empty state was already set up by build/empty, its start method will be called
                 if (typeof this.start === 'function' && this.start !== HanimeMainScreenComponent.prototype.start) {
                      this.start(); // Call the start method from Lampa.Empty or fallback
                 } else {
                      // Fallback if empty state setup somehow failed to assign start
                      console.error("HanimeMainScreenComponent: Cannot start, no rows/cards and empty state start not available.");
                      if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Нечего отобразить.');
                 }
                 return;
             }

             console.log("HanimeMainScreenComponent: start() - Activity is active. Setting up Lampa.Controller.");

            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function' && window.Navigator) {

                 // Get all selectable elements (cards) from all rows
                 let allSelectableElements = this.$allCards; // Use the pre-collected collection

                 Lampa.Controller.add('content', {
                     // This toggle method is called when the controller is activated
                     toggle: function () {
                         console.log("HanimeMainScreenComponent: Controller toggle() called.");
                          // Set the entire collection of selectable items on the screen
                         Lampa.Controller.collectionSet(allSelectableElements);

                          // Try to restore focus to the last known position
                         let lastElement = rows[focusedRowIndex] ? rows[focusedRowIndex].getSelectableElements().eq(lastFocusedItemIndex) : $();

                         if (lastElement.length === 0) {
                             // If last element not found (e.g., category was empty), try the first card of the first row
                             lastElement = allSelectableElements.eq(0);
                             focusedRowIndex = 0;
                             lastFocusedItemIndex = 0;
                         }

                         if (lastElement.length > 0) {
                              Lampa.Controller.collectionFocus(lastElement); // Set focus
                             // Manually ensure the relevant row is scrolled to the focused element
                             rows[focusedRowIndex].updateScrollPosition(lastElement);
                              console.log("HanimeMainScreenComponent: Controller collectionSet/Focus called in toggle(). Restored focus to row", focusedRowIndex, "item", lastFocusedItemIndex);
                         } else {
                             console.warn("HanimeMainScreenComponent: No selectable elements found to focus on start.");
                              // This case should ideally be handled by the empty() call in build()
                         }
                     }.bind(this), // Bind 'this' to access component methods/properties

                     // Navigation handlers. Lampa's Navigator handles finding the *next* element
                     // within the collection set by collectionSet. We react to the movement.
                     left: function () {
                         let newElement = window.Navigator.move('left');
                         this.onFocusChange(newElement); // React to the focus change
                     }.bind(this),
                     right: function () {
                         let newElement = window.Navigator.move('right');
                         this.onFocusChange(newElement); // React to the focus change
                     }.bind(this),
                     up: function () {
                         let newElement = window.Navigator.move('up');
                         this.onFocusChange(newElement); // React to the focus change
                     }.bind(this),
                     down: function () {
                         let newElement = window.Navigator.move('down');
                         this.onFocusChange(newElement); // React to the focus change
                     }.bind(this),

                      // Interaction handlers
                     enter: function (element, event) {
                          console.log("HanimeMainScreenComponent: Enter pressed on element:", element);
                          const cardData = $(element).data('cardData'); // Get data from the element
                          if (cardData) {
                               this.onCardClick(cardData);
                          } else {
                              console.error("HanimeMainScreenComponent: No cardData found on element on Enter press.");
                          }
                     }.bind(this),
                     long: function (element, event) {
                          console.log("HanimeMainScreenComponent: Long press on element:", element);
                          const cardData = $(element).data('cardData'); // Get data from the element
                          const cardElement = $(element); // Get jQuery element
                          if (cardData) {
                               this.showCardContextMenu(cardElement, cardData);
                          } else {
                              console.error("HanimeMainScreenComponent: No cardData found on element on Long press.");
                          }
                     }.bind(this),

                     // Back button handler
                     back: this.back.bind(this) // Bind 'this'
                 });

                 // Activate the controller
                 Lampa.Controller.toggle('content');
                  console.log("HanimeMainScreenComponent: Controller 'content' toggled.");

             } else {
                console.error("HanimeMainScreenComponent: Lampa.Controller or Navigator, or required methods not available in start(). Cannot setup main Controller.");
                 // Add a basic controller for the back button as a fallback
                 if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                     console.log("HanimeMainScreenComponent: Attempting to add basic Controller for Back button.");
                     Lampa.Controller.add('content', { back: this.back.bind(this) });
                     Lampa.Controller.toggle('content');
                 } else console.warn("HanimeMainScreenComponent: Lampa.Controller unavailable or methods missing, cannot add basic back handler.");
             }
        };

        // Called by navigation handlers when focus changes
        this.onFocusChange = function(element) {
             if (!element) {
                 console.log("HanimeMainScreenComponent: onFocusChange called with null element. Likely leaving collection boundary.");
                 // Handle leaving collection if needed (e.g., move to menu if leaving left from first item)
                 // Navigator.move handles this if it's set up to wrap or boundary check.
                 // For now, if element is null after move, assume we're at a boundary Lampa didn't navigate past.
                 return;
             }

             // Find the position of the newly focused element
             const position = this.findCardPosition(element);

             if (position.rowIndex !== -1) {
                  console.log("HanimeMainScreenComponent: Focus changed to row", position.rowIndex, "item", position.itemIndex);

                  // Update internal state
                 this.focusedRowIndex = position.rowIndex;
                 this.lastFocusedItemIndex = position.itemIndex;

                  // Tell the row to scroll to make the item visible
                 position.row.updateScrollPosition(position.element);

                  // Optional: Update favorite icons on focus for the focused card
                  // This is already done by HanimeCard's 'visible' event, but focusing *might* not trigger 'visible' if already in viewport
                   // let cardInstance = $(element).data('cardInstance');
                   // if(cardInstance && typeof cardInstance.update === 'function') cardInstance.update();

             } else {
                  console.warn("HanimeMainScreenComponent: onFocusChange called with element not found in any row:", element);
                  // This might happen if Navigator moves focus to something unexpected
             }
        };


        this.pause = function () {
             console.log("HanimeMainScreenComponent: pause() called.");
             // Save the last focused item's position when pausing
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content') {
                 let focusedElement = Lampa.Controller.item();
                  if (focusedElement) {
                      const position = this.findCardPosition(focusedElement);
                       if (position.rowIndex !== -1) {
                           this.focusedRowIndex = position.rowIndex;
                           this.lastFocusedItemIndex = position.itemIndex;
                           console.log("HanimeMainScreenComponent: Activity paused. Saved focus position: row", this.focusedRowIndex, "item", this.lastFocusedItemIndex);
                       } else {
                           console.warn("HanimeMainScreenComponent: Pause called, but focused element not found in rows. Position not saved.");
                       }
                  } else {
                       console.log("HanimeMainScreenComponent: Pause called, but no element currently focused by Controller.");
                  }
             } else {
                  console.log("HanimeMainScreenComponent: Pause called, but content controller not active. Last focus not saved.");
             }
        };

        this.stop = function () {
             console.log("HanimeMainScreenComponent: stop() called.");
             // No specific stop logic needed beyond pause/destroy cleanup
        };

        // Returns the main screen's DOM element
        this.render = function () {
            if (!html) {
                 this.buildLayout();
                 // Data fetching and row building happens in create/fetchCatalogs/build
                 // The render method just returns the container
            }
            return html; // Return jQuery object
        };

        // Destroys the component and cleans up resources
        this.destroy = function () {
            console.log("HanimeMainScreenComponent: destroy() called.");

            if(network && typeof network.clear === 'function') network.clear(); network = null;

             // Destroy all HanimeRow instances
             if (rows && Array.isArray(rows)) {
                 rows.forEach(row => {
                     if (row && typeof row.destroy === 'function') row.destroy();
                 });
                 console.log("HanimeMainScreenComponent: Destroyed all row instances.");
             }
            rows = null; this.$allCards = $(); // Clear references

             if (html && typeof html.remove === 'function') {
                 html.remove();
                 console.log("HanimeMainScreenComponent: Removed html element from DOM.");
             }
            html = null;

            // Remove the controller
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function') {
                 // Check if this component's controller is currently active before potentially clearing collection
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.collectionSet === 'function') {
                       console.log("HanimeMainScreenComponent: Clearing Controller collection.");
                      Lampa.Controller.collectionSet([]); // Clear collection managed by this controller
                 }
                 // Always try to remove the controller by name
                 Lampa.Controller.remove('content');
                  console.log("HanimeMainScreenComponent: Controller 'content' removed.");
            } else console.warn("HanimeMainScreenComponent: Lampa.Controller not available or remove method missing for cleanup in destroy.");

             // Reset focus state
             this.focusedRowIndex = 0;
             this.lastFocusedItemIndex = 0;

            console.log("HanimeMainScreenComponent: destroy() finished.");
        };

        // Back button handler
        this.back = function () {
             console.log("HanimeMainScreenComponent: back() called. Attempting Activity.backward().");
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') {
                 Lampa.Activity.backward();
             } else console.warn("HanimeMainScreenComponent: Lampa.Activity or backward method missing for navigation.");
        };
    }

    // --- Plugin Initialization ---
    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() invoked.");

         // Check if the plugin is already ready to prevent double initialization
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: global plugin_hanime_catalog_ready flag already set. Skipping initialization.");
             return;
         }

        function initializeLampaDependencies() {
             console.log("Hanime Plugin: initializeLampaDependencies() called (Lampa appready or fallback delay completed).");

             // Perform critical Lampa component availability checks
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Template || typeof Lampa.Template !== 'object' || !Lampa.Component || typeof Lampa.Component !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Scroll || typeof Lampa.Scroll !== 'function' || !Lampa.Reguest || typeof Lampa.Reguest !== 'function' || !window.Navigator || typeof window.Navigator !== 'object') {
                  console.error("Hanime Plugin: CRITICAL: Required Lampa components (Lampa, Template, Component, Activity, Controller, jQuery, Scroll, Reguest, Navigator) are not available after waiting for appready. Initialization failed. Please check Lampa version and installation.");
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина: Компоненты Lampa недоступны. Обновите Lampa или плагин.', 15000);
                  }
                  return; // Stop initialization if critical components are missing
             }
             console.log("Hanime Plugin: All critical Lampa components checked OK. Continuing initialization.");

              // Set the ready flag *after* checking critical dependencies
              if (!window.plugin_hanime_catalog_ready) {
                 window.plugin_hanime_catalog_ready = true;
                 console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag set.");
              } else {
                   // This should not be reached if the initial check passed, but as a failsafe
                   console.warn("Hanime Plugin: Plugin flag was unexpectedly set before initialization. Possible double load issue?");
                   return;
              }

             console.log("Hanime Plugin: Adding standard template fallbacks using Lampa.Template.add...");
             if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                 // These templates might already exist in Lampa, but adding them here ensures fallback compatibility
                 Lampa.Template.add('card_vote_temp', '<div class="card__vote"></div>');
                 Lampa.Template.add('card_quality_temp', '<div class="card__quality"><div></div></div>');
                 Lampa.Template.add('card_year_temp', '<div class="card__age"></div>');
                 Lampa.Template.add('card_type_temp', '<div class="card__type"></div>');
                 Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
                  console.log("Hanime Plugin: Standard template fallbacks added successfully.");
             } else {
                 console.error("Hanime Plugin: Lampa.Template.add method not available. Cannot add template fallbacks.");
             }

             console.log("Hanime Plugin: Adding hanime-card template...");
             if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                 Lampa.Template.add('hanime-card', `
                     <div class="hanime-card card selector layer--visible layer--render">
                         <div class="card__view">
                             <img src="./img/img_load.svg" class="card__img" alt="{title}" loading="lazy" />
                             <div class="card__icons">
                                 <div class="card__icons-inner"></div>
                             </div>
                             <div class="card__vote"></div>
                             <div class="card__quality"><div></div></div>
                             <div class="card__type"></div>
                              <!-- Card marker will be added dynamically here if needed -->
                         </div>
                         <div class="card__title">{title}</div>
                         <div class="card__age"></div>
                     </div>
                 `);
                  console.log("Hanime Plugin: HanimeCard template added successfully.");
             } else {
                  console.error("Hanime Plugin: Lampa.Template.add method not available. Cannot add hanime-card template.");
             }

             // Note: Custom CSS was removed as requested in previous iteration.
             // Ensure Lampa's default card/items-line styles are sufficient or provide custom CSS separately if needed.

             console.log("Hanime Plugin: Registering HanimeMainScreenComponent...");
             if (window.Lampa && Lampa.Component && typeof Lampa.Component.add === 'function') {
                 Lampa.Component.add('hanime_catalog_screen', HanimeMainScreenComponent); // Register the new main component
                 console.log("Hanime Plugin: Component 'hanime_catalog_screen' registered successfully.");
             } else {
                 console.error("Hanime Plugin: Lampa.Component.add method not available. Cannot register component.");
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина: Не удалось зарегистрировать компонент.', 5000);
                  }
             }

             console.log("Hanime Plugin: Calling addMenuItem()...");
             addMenuItem(); // Add the single menu item
              console.log("Hanime Plugin: addMenuItem() called from initializeLampaDependencies.");

              console.log("Hanime Plugin: initializeLampaDependencies() finished.");
        }

        function addMenuItem() {
             console.log("Hanime Plugin: addMenuItem() called.");

             // Basic Lampa dependency checks for menu item creation
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Component || typeof Lampa.Component !== 'object' || typeof Lampa.Component.get !== 'function') {
                  console.warn("Hanime Plugin: addMenuItem cannot proceed. Missing Lampa core components, jQuery, or Component.get.");
                  return;
             }

             // Find the main menu list
             var menuList = $('.menu .menu__list').eq(0);
             if (!menuList.length) {
                 console.warn("Hanime Plugin: addMenuItem cannot proceed. Lampa menu DOM structure ('.menu .menu__list') not found.");
                 return;
             }

             console.log("Hanime Plugin: addMenuItem checks passed.");

             // Check if our main screen component is registered
             var ourComponentRegistered = Lampa.Component.get('hanime_catalog_screen');
             if (!ourComponentRegistered) {
                 console.warn("Hanime Plugin: addMenuItem skipping - Component 'hanime_catalog_screen' is not found/registered in Lampa.Component.");
                 return;
             }
             console.log("Hanime Plugin: Component 'hanime_catalog_screen' confirmed registered.");

             // Define the text for the single menu item
             const menuItemText = 'Hanime Catalog';

             // Check if the menu item already exists
             if (menuList.find('.menu__text:contains("' + menuItemText + '")').length > 0) {
                 console.log("Hanime Plugin: Menu item with text '" + menuItemText + "' already exists in DOM. Skipping addMenuItem.");
                 return;
             }

             console.log("Hanime Plugin: Adding single menu item DOM element to Lampa menu.");

             var menu_item = $(`
                 <li class="menu__item selector">
                     <div class="menu__ico">
                         <!-- Use a fitting icon, e.g., a grid or multiple squares -->
                         <svg fill="currentColor" viewBox="0 0 24 24">
                             <path d="M4 11H9V5H4M9 18H4V12H9M18 18H13V12H18M18 11H13V5H18V11Z"></path>
                         </svg>
                     </div>
                     <div class="menu__text">${menuItemText}</div>
                 </li>
             `);

            if (typeof menu_item.on === 'function') {
                menu_item.on('hover:enter', function () {
                     console.log("Hanime Plugin: Menu item '" + menuItemText + "' activated via 'hover:enter'. Pushing main activity.");
                     if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.push === 'function') {
                         Lampa.Activity.push({
                             url: '', // Not used by the component itself for fetching
                             title: menuItemText, // Use the menu item text as the activity title
                             component: 'hanime_catalog_screen', // Launch the main screen component
                             page: 1 // Or whatever initial state is needed
                         });
                          console.log("Hanime Plugin: Lampa.Activity.push called for main screen.");
                     } else {
                          console.warn("Hanime Plugin: Lampa.Activity or push method unavailable to launch main activity.");
                         if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Не удалось запустить активность.');
                     }
                });
                console.log("Hanime Plugin: 'hover:enter' event listener attached to menu item.");
            } else {
                console.warn("Hanime Plugin: jQuery on() method not available for menu item. Cannot attach event listener.");
            }

             // Append the created menu item to the list
            if (menuList.length > 0) {
                 menuList.append(menu_item);
                 console.log("Hanime Plugin: Menu item DOM element successfully added to Lampa menu list.");
            } else {
                 console.error("Hanime Plugin: addMenuItem failed during append: Lampa menu list DOM element ('.menu .menu__list') not found anymore.");
            }
             console.log("Hanime Plugin: addMenuItem finished.");
        }


        console.log("Hanime Plugin: startPlugin() invoked. Setting up Lampa ready listener.");

         // Double-check the ready flag at the start of startPlugin as well
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag is ALREADY SET upon initial execution. Skipping entire startPlugin execution to prevent double init.");
             return;
         }

         // Use Lampa.Listener to wait for the 'app:ready' event
         if (window.Lampa && typeof window.Lampa !== 'object' || !Lampa.Listener || typeof Lampa.Listener !== 'object' || typeof Lampa.Listener.follow !== 'function') {
              console.warn("Hanime Plugin: Lampa or Lampa.Listener not available or methods missing. Checking appready flag directly or scheduling delayed start as fallback.");

              // Fallback: Check the appready flag if Listener is not available
              if (window.appready && typeof window.appready === 'boolean' && window.appready) {
                  console.log("Hanime Plugin: Lampa 'appready' flag found. Calling initializeLampaDependencies directly as fallback.");
                  initializeLampaDependencies();
              } else {
                   // Less reliable fallback: Schedule a delayed initialization
                   console.error("Hanime Plugin: Neither Lampa Listener nor 'appready' flag available immediately. Cannot reliably wait. Attempting delayed initialization as a HIGHLY UNRELIABLE fallback.");
                  setTimeout(initializeLampaDependencies, 500); // Delay slightly to wait for DOM/basic Lampa setup
                  console.log("Hanime Plugin: Delayed initialization fallback scheduled.");
              }

         } else {
             console.log("Hanime Plugin: Lampa Listener available. Subscribing to 'app:ready' event.");
             // Subscribe to the 'app:ready' event
             Lampa.Listener.follow('app', function (e) {
                 if (e.type === 'ready') {
                     console.log("Hanime Plugin: Lampa 'appready' event received. Calling initializeLampaDependencies.");
                     initializeLampaDependencies();
                 }
             });
              console.log("Hanime Plugin: Subscribed to Lampa 'app:ready' event.");
         }

         console.log("Hanime Plugin: startPlugin() finished its initial execution (setup listener or fallback).");
    }

    // Start the plugin initialization process
    startPlugin();

})();
