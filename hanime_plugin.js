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

    // --- HanimeCard Class ---
    // Represents a single card element and its data binding/event handling
    function HanimeCard(data, componentRef) {
        var processedData = {
            id: data.id,
            title: data.name || data.title || 'Без названия',
            poster_path: data.poster || data.img,
            vote_average: data.vote_average || data.vote || null,
            quality: data.quality || data.release_quality || null,
            release_year: ((data.year || data.release_date || '') + '').slice(0, 4),
            type: data.first_air_date ? 'tv' : 'movie', // Infer type if not provided
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
        cardElement.data('cardInstance', this); // Store instance reference for update

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
             // Check if element exists before trying to modify/access it
             if (ageElement.length) {
                  if (processedData.release_year !== '0000' && processedData.release_year) {
                      ageElement.text(processedData.release_year).show();
                  } else {
                       ageElement.text('').hide();
                  }
             } else {
                 // Fallback to adding dynamically if template doesn't include it (less ideal)
                 if (processedData.release_year !== '0000' && processedData.release_year) {
                     let newAgeElement = $('<div class="card__age"></div>').text(processedData.release_year);
                      let titleElement = cardElement.find('.card__title');
                      if (titleElement.length) {
                          titleElement.after(newAgeElement);
                          // console.warn("HanimeCard: Created .card__age element dynamically. Prefer including in template."); // Removed warning as template should have it now
                      } else {
                          cardElement.append(newAgeElement);
                          console.error("HanimeCard: Cannot find .card__title to place .card__age dynamically.");
                      }
                 }
             }
        }

        this.updateFavoriteIcons = function() {
            cardElement.find('.card__icons-inner').empty(); // Clear existing icons
            cardElement.find('.card__marker').remove(); // Remove existing marker

             var status = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(processedData) : {};
             if(Object.keys(status).length === 0 && window.Lampa && Lampa.Favorite) console.log("HanimeCard: Lampa.Favorite.check returned empty status for", processedData.title, ". Data:", processedData);

            // Add icons based on status
            if (status.book) this.addicon('book');
            if (status.like) this.addicon('like');
            if (status.wath) this.addicon('wath');
            // History icon: check both Favorite history status and Timeline watched status
            if (status.history || (window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched === 'function' && Lampa.Timeline.watched(processedData))) this.addicon('history');

             // Add marker based on status
             var marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];
             var activeMarker = marks.find(m => status[m]); // Find the first active status marker

             if (activeMarker) {
                 var markerElement = cardElement.find('.card__marker');
                 if (!markerElement.length) {
                     markerElement = $('<div class="card__marker"><span></span></div>');
                     cardElement.find('.card__view').append(markerElement); // Append marker to the view area
                 }
                 // Translate or use key if translation not available
                 markerElement.find('span').text(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? Lampa.Lang.translate('title_' + activeMarker) : activeMarker);
                 // Remove all possible marker classes before adding the active one
                 markerElement.removeClass(marks.map(m => 'card__marker--' + m).join(' '))
                             .addClass('card__marker--' + activeMarker);
             } else {
                 cardElement.find('.card__marker').remove(); // Remove marker if no status is active
             }
        };

        // This is called when the card becomes visible in the scrollable area
        this.onVisible = function() {
             var imgElement = cardElement.find('.card__img');

             // Load image only if it's the placeholder or src is missing
             if (imgElement.length && (!imgElement.attr('src') || imgElement.attr('src').includes('img_load.svg'))) {
                 var src = processedData.poster_path;

                 // Use Lampa ImageCache if available for better performance
                 if(window.Lampa && Lampa.ImageCache && typeof Lampa.ImageCache.read === 'function' && typeof Lampa.ImageCache.write === 'function') {
                      // Try to read from cache first
                      if(!Lampa.ImageCache.read(imgElement[0], src)) {
                           // If not in cache, load and write to cache on load
                          imgElement[0].onload = () => {
                              cardElement.addClass('card--loaded'); // Add class for styling (e.g., fade-in)
                              Lampa.ImageCache.write(imgElement[0], imgElement[0].src); // Write the loaded image to cache
                          };
                          imgElement[0].onerror = () => {
                               console.error('Hanime Plugin: Image load error:', src);
                               imgElement.attr('src', './img/img_broken.svg'); // Show broken image icon
                               if(window.Lampa && Lampa.Tmdb && typeof Lampa.Tmdb.broken === 'function') Lampa.Tmdb.broken(); // Notify Lampa TMDB broken image handler (optional)
                          };
                           // Set the src to start loading
                          imgElement.attr('src', src || './img/img_broken.svg'); // Use broken img as default if src is empty
                      } else {
                          // If image was read from cache, it's already set and might need the loaded class
                         cardElement.addClass('card--loaded');
                      }
                 } else {
                     console.warn("Hanime Plugin: Lampa.ImageCache not available. Using basic image loading.");
                      // Basic loading without cache
                      imgElement[0].onload = () => { cardElement.addClass('card--loaded'); /* console.log("HanimeCard: Image loaded (basic):", src); */ };
                     imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error (basic):', src); imgElement.attr('src', './img/img_broken.svg'); };
                     imgElement.attr('src', src || './img/img_broken.svg');
                 }
             } // If img already has src and not loading placeholder, do nothing

            // Update favorite icons whenever the card becomes visible
            this.updateFavoriteIcons();
        }

        // Creates DOM elements and attaches basic listeners (visible)
        this.create = function(){
             if (cardElement.data('created')) {
                 return; // Already created
             }

             // Event listeners for focus (hover:focus) and interaction (hover:enter, hover:long)
             // are now handled by the main screen's Controller and delegated.
             // The card itself only needs the 'visible' event listener.

             this.card = cardElement[0]; // Get native DOM element
             if (this.card && typeof this.card.addEventListener === 'function') {
                this.card.addEventListener('visible', this.onVisible.bind(this));
             } else {
                 console.warn("HanimeCard: Cannot attach 'visible' event listener, native element or addEventListener not available.");
             }

             // Add details and update icons once immediately after creation
             // Use a timeout to allow DOM appending if needed
             setTimeout(() => {
                  this.addDetails();
                  this.updateFavoriteIcons(); // Initial update of icons/marker
             }, 0);


             cardElement.data('created', true);
        }

        // Called to update dynamic parts like favorite icons
        this.update = function(){
             console.log("HanimeCard: update() called for", processedData.title);
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
             // Remove event listener
             if(this.card && typeof this.card.removeEventListener === 'function' && this.onVisible) this.card.removeEventListener('visible', this.onVisible.bind(this));
             // Remove element from DOM
             if(cardElement && typeof cardElement.remove === 'function') cardElement.remove();

             // Remove data attached to the element to prevent memory leaks
             if (cardElement && typeof cardElement.removeData === 'function') {
                cardElement.removeData('cardData');
                cardElement.removeData('cardComponentRef');
                 cardElement.removeData('cardInstance'); // Remove instance reference
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

            itemsContainer.empty(); // Clear any existing cards
            items = []; // Reset internal items array

            if(itemsContainer && scroll && window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function') {
                 this.itemsData.forEach(function (meta) {
                    // Pass the parentScreenRef to each card instance
                    var card = new HanimeCard(meta, parentScreenRef);
                    var cardElement = card.render(); // Get the card's jQuery element

                    // Important: Card event listeners (enter, long, focus) are handled by the main screen's Controller.
                    // We don't attach them directly to individual cards here.

                     itemsContainer.append(cardElement); // Append jQuery element
                    items.push(card); // Store the card instance
                });
                 console.log("HanimeRow:", this.categoryTitle, "- Created and added", items.length, "cards to itemsContainer.");

                // Append the container with cards to the scroll instance
                scroll.append(itemsContainer);

                // Append the scrollable area (native DOM element) to the row's body
                html.find('.items-line__body').empty().append(scroll.render(true));

                 // Store the collection of selectable card elements for this row for the main controller
                 this.$cards = itemsContainer.find('.selector'); // Select elements with class 'selector'
                 console.log("HanimeRow:", this.categoryTitle, "- Found", this.$cards.length, "selectable cards.");

            } else {
                console.error("HanimeRow:", this.categoryTitle, "- Missing required objects or methods before building cards.");
                 // Error state might be handled by main screen's empty()
            }
        };

        // Public method: Returns the main DOM element for this row
        this.render = function() {
            if (!html) {
                 this.buildLayout();
                 // Build cards immediately after layout if data is ready
                 if (this.itemsData && Array.isArray(this.itemsData)) {
                      this.buildCards();
                 } else {
                      console.warn("HanimeRow: render() called with no data ready for", this.categoryTitle);
                      // Handle case where data wasn't provided initially (e.g., fetch failed)
                      // The main screen's build() should prevent this, but safe check.
                 }
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
                scroll.update($(element), true); // Ensure element is a jQuery object and update scroll
            } else {
                 console.warn("HanimeRow:", this.categoryTitle, "- Scroll instance or update method, or valid element missing to scroll.");
            }
        }

         // Public method: Finds and returns a card instance by its DOM element
         this.getCardInstanceByElement = function(element) {
             // The card instance is stored directly on the element's data
              return $(element).data('cardInstance');
         }


        // Public method: Destroys the row instance and its DOM elements
        this.destroy = function() {
             console.log("HanimeRow:", this.categoryTitle, "- destroy() called.");
             // Destroy all HanimeCard instances managed by this row
             if (items && Array.isArray(items)) {
                 items.forEach(item => {
                     if (item && typeof item.destroy === 'function') item.destroy();
                 });
                 console.log("HanimeRow:", this.categoryTitle, "- Destroyed items array.");
             }
            items = null; this.itemsData = null; this.$cards = $(); // Clear references

             // Destroy the scroll instance
             if (scroll && typeof scroll.destroy === 'function') {
                 scroll.destroy();
                 console.log("HanimeRow:", this.categoryTitle, "- Destroyed scroll instance.");
             }
             scroll = null;

             // Remove the main row element from DOM
             if (html && typeof html.remove === 'function') {
                 html.remove();
                 console.log("HanimeRow:", this.categoryTitle, "- Removed html element from DOM.");
             }
            html = null; itemsContainer = null; this.parentScreenRef = null;

            console.log("HanimeRow:", this.categoryTitle, "- destroy() finished.");
        }

        // Initial build if data is provided at creation time
        if (this.itemsData && Array.isArray(this.itemsData)) {
             // Layout and cards are built on first render() call by the parent component
             // Or you could call buildLayout() and buildCards() here if you prefer
             // console.log("HanimeRow: Data available at init, will build on render.");
        } else {
             console.warn("HanimeRow: Initialized without itemsData for category:", categoryTitle);
             // This row will be empty. The main screen's build() should handle this case.
        }
    }


    // --- HanimeMainScreenComponent Class (Main Component) ---
    // Manages the entire screen, fetches data for all categories,
    // creates HanimeRow instances, and manages the Controller navigation.
    function HanimeMainScreenComponent(componentObject) {
        var network = null;
        var html = null; // Main container element for the screen (jQuery object)
        var rows = []; // Array of HanimeRow instances
        var focusedRowIndex = 0; // Index of the currently focused row (0-based)
        var lastFocusedItemIndex = 0; // Index of the focused item within the focused row (0-based)

        this.activity = componentObject.activity; // Keep activity reference for loader/toggle

        console.log("HanimeMainScreenComponent: Initializing.");

        // Builds the main screen container layout
        this.buildLayout = function() {
            // Use a class like 'hanime-main-screen' for potential custom styling
            html = $(`
                <div class="hanime-main-screen layer--visible layer--render">
                    <!-- Rows will be appended here -->
                </div>
            `);
             console.log("HanimeMainScreenComponent: Main layout built.");
        };

        // Fetches data for all categories concurrently
        this.fetchCatalogs = function () {
            var _this = this;
             // Show loader
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeMainScreenComponent: Activity loader not available in fetchCatalogs.");

            console.log("HanimeMainScreenComponent: fetchCatalogs() - Starting requests for all categories.");

            // Initialize network component if not already done
             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeMainScreenComponent: Lampa.Reguest initialized.");
             }

             // Clear previous requests
             if (network && typeof network.clear === 'function') network.clear();
             else console.warn("HanimeMainScreenComponent: Network clear method not available.");

             // Check if network is ready to make calls
             if(!network || typeof network.native !== 'function'){
                 console.error("HanimeMainScreenComponent: Network component or its native method not available.");
                  _this.empty("Не удалось загрузить каталоги. Ошибка инициализации сети."); // Show empty state with error
                 return;
             }

             // Create a promise for each category fetch
             const fetchPromises = Object.keys(CATEGORIES).map(key => {
                 const category = CATEGORIES[key];
                 const url = API_BASE_URL + category.url;
                 console.log("HanimeMainScreenComponent: Fetching category:", key, "from", url);
                 // Wrap the native call in a Promise. Resolve even on error so Promise.all doesn't stop.
                 return new Promise((resolve, reject) => {
                     network.native(url,
                         // Success handler
                         (data) => { resolve({ key, data }); },
                         // Error handler - Resolve with an error object
                         (errorStatus, errorText) => {
                             console.error("HanimeMainScreenComponent: Failed to load category:", key, "Status:", errorStatus, "Error:", errorText);
                              resolve({ key, error: { status: errorStatus, text: errorText } });
                         },
                         false, // No cache? Or use Lampa's default? Let's use default (false).
                         { dataType: 'json', timeout: 15000 } // Request options
                     );
                 });
             });

             // Wait for all promises to settle (resolve or reject)
             Promise.all(fetchPromises)
                 .then(results => {
                      // Hide loader
                      if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);

                     console.log("HanimeMainScreenComponent: All category fetches completed.", results);
                     // Build the UI with the results (even if some had errors)
                     _this.build(results);
                 })
                 .catch(error => {
                     // This catch would only be hit if Promise.all itself failed,
                     // which is unlikely if individual promises resolve on error.
                     // Handle unexpected errors here.
                      if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                     console.error("HanimeMainScreenComponent: Unhandled error in Promise.all during catalog fetch:", error);
                      _this.empty("Произошла неожиданная ошибка при загрузке каталогов."); // Show empty state with generic error
                 });
        };

        // Builds the screen layout with rows using fetched data
        this.build = function (results) {
            var _this = this;
             console.log("HanimeMainScreenComponent: build() - Processing fetch results.");

             // Check if main HTML container is available
             if (!(html && typeof html.empty === 'function' && typeof html.append === 'function')) {
                  console.error("HanimeMainScreenComponent: Missing main screen HTML container in build(). Aborting UI build.");
                   if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                  _this.empty("Не удалось построить интерфейс."); // Show empty state error
                  return;
             }

            html.empty(); // Clear any previous content in the main container
            rows = []; // Reset the array of HanimeRow instances
            this.$allCards = $(); // Reset the collection of all selectable cards

            // Process the results for each category
            results.forEach(result => {
                 const categoryKey = result.key;
                 const categoryData = CATEGORIES[categoryKey]; // Get category info from our definition
                 const fetchedData = result.data;
                 const fetchError = result.error;

                 if (fetchError) {
                     console.warn("HanimeMainScreenComponent: Skipping row for category", categoryKey, "due to fetch error:", fetchError.status, fetchError.text);
                     // Optionally, add a row placeholder indicating the error for this category
                     // html.append($(`<div class="items-line"><div class="items-line__head"><div class="items-line__title">${categoryData.title}</div></div><div class="items-line__body">Ошибка загрузки: ${fetchError.text || fetchError.status || 'Неизвестно'}</div></div>`));
                     return; // Skip creating a row for this failed category
                 }

                 // Check if data is valid and has items
                 if (fetchedData && fetchedData.metas && Array.isArray(fetchedData.metas) && fetchedData.metas.length > 0) {
                    // Create a HanimeRow instance for this category, passing fetched data and screen reference
                    var row = new HanimeRow(categoryKey, categoryData.title, fetchedData.metas, _this);
                    rows.push(row); // Add the row instance to our array

                    // Append the row's native DOM element to the main screen HTML
                    html.append($(row.render())); // Use $(row.render()) to get jQuery object from native element

                    // Add the selectable cards from this row to the main collection for the controller
                    this.$allCards = this.$allCards.add(row.getSelectableElements());

                 } else {
                      console.log("HanimeMainScreenComponent: No items or invalid data structure for category:", categoryKey, fetchedData);
                      // Optionally, add an empty row or message for this category
                      // html.append($(`<div class="items-line"><div class="items-line__head"><div class="items-line__title">${categoryData.title}</div></div><div class="items-line__body">Нет элементов в этой категории.</div></div>`));
                 }
            });

             // After processing all results, check if any rows were successfully built
             if (rows.length === 0) {
                // If no rows were built (all categories failed or were empty)
                _this.empty("Не удалось загрузить ни один каталог или они пусты."); // Show global empty state
                 console.log("HanimeMainScreenComponent: No rows built. Displaying empty state.");
             } else {
                 console.log("HanimeMainScreenComponent: Successfully built", rows.length, "rows.");
                  console.log("HanimeMainScreenComponent: Total selectable cards across all rows:", this.$allCards.length);
             }

             // Hide loader and toggle activity visibility
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
             if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
             console.log("HanimeMainScreenComponent: Build process completed and activity toggled.");
        };

         // Helper to find row and item index for a given card DOM element
         this.findCardPosition = function(element) {
             if (!element) return { rowIndex: -1, itemIndex: -1, element: null, row: null };

             // Ensure element is a jQuery object
             let $element = $(element);
             if ($element.length === 0) return { rowIndex: -1, itemIndex: -1, element: null, row: null };

              // Iterate through each row to find which one contains this element
              for(let i = 0; i < rows.length; i++) {
                  const row = rows[i];
                  // Check if the element is within this row's selectable elements
                   const itemIndex = row.getSelectableElements().index($element);
                  if (itemIndex !== -1) {
                      return { rowIndex: i, itemIndex: itemIndex, element: $element, row: row };
                  }
              }
              // If element wasn't found in any row
              console.warn("HanimeMainScreenComponent: Could not find position for element:", element);
              return { rowIndex: -1, itemIndex: -1, element: $element, row: null }; // Not found
         }

        // Handler for card click (Enter press)
         this.onCardClick = function(cardData) {
             console.log("HanimeMainScreenComponent: Card clicked:", cardData.title, "(ID:", cardData.id, ")");
             // Fetch stream and meta using the card data and launch player
            this.fetchStreamAndMeta(cardData.id, cardData);
         }

         // Handler for card long press to show context menu
         this.showCardContextMenu = function(cardElement, cardData) {
             console.log("HanimeMainScreenComponent: showCardContextMenu for", cardData.title);
             var _this = this;

             // Save the current controller state to restore it after the selectbox closes
             var enabledControllerName = (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;

             // Ensure cardData is the processed data stored on the element for reliability
             const dataFromElement = $(cardElement).data('cardData');
             if (!dataFromElement) {
                  console.error("HanimeMainScreenComponent: No cardData found on element for context menu.");
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка данных карточки.', 5000);
                  }
                  return;
             }
             cardData = dataFromElement; // Use data from element

             // Get current favorite/watched status
             var status = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(cardData) : {};

             var menu_favorite = [];
             // Populate menu items using Lampa.Lang if available
             if(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') {
                 // Basic collection statuses
                 menu_favorite = [
                     { title: Lampa.Lang.translate('title_book'), where: 'book', checkbox: true, checked: status.book, collect: true },
                     { title: Lampa.Lang.translate('title_like'), where: 'like', checkbox: true, checked: status.like, collect: true },
                     { title: Lampa.Lang.translate('title_wath'), where: 'wath', checkbox: true, checked: status.wath, collect: true },
                     { title: Lampa.Lang.translate('menu_history'), where: 'history', checkbox: true, checked: status.history, collect: true },
                     { title: Lampa.Lang.translate('settings_cub_status'), separator: true }
                 ];
                 // Add watched status items if translations exist
                 const marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];
                 marks.forEach(mark => {
                      const translatedTitle = Lampa.Lang.translate('title_' + mark);
                       // Check if translation is not just the key itself
                      if (translatedTitle && translatedTitle !== 'title_' + mark) {
                          menu_favorite.push({
                              title: translatedTitle,
                              where: mark,
                              checkbox: true, // These are checkbox statuses
                              checked: status[mark],
                              collect: true // Mark as collectible status
                          });
                      }
                 });

             } else {
                 console.warn("HanimeMainScreenComponent: Lampa.Lang not available, using English fallbacks for menu items.");
                 // Fallback menu items with English titles and collect flag
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

             // Show the selectbox menu
             if (window.Lampa && Lampa.Select && typeof Lampa.Select.show === 'function') {
                 Lampa.Select.show({
                     title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('title_action') : 'Action',
                     items: menu_favorite,
                     onBack: ()=>{
                         // Restore controller focus when menu is closed via back button
                         if (window.Lampa && Lampa.Controller && enabledControllerName) Lampa.Controller.toggle(enabledControllerName);
                          console.log("HanimeMainScreenComponent: Context menu back button pressed. Restored controller:", enabledControllerName);
                     },
                      // onCheck is called when a checkbox changes state (used for collect: true items)
                     onCheck: (itemData)=>{
                         console.log("HanimeMainScreenComponent: Context menu - checkbox toggled:", itemData.where, "Checked:", itemData.checked);
                         // Toggle favorite status
                         if(window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function') {
                              Lampa.Favorite.toggle(itemData.where, cardData);
                         } else {
                              console.warn("HanimeMainScreenComponent: Lampa.Favorite or toggle method not available for onCheck.");
                         }

                         // Find the corresponding card instance and update its icons/marker
                         const cardInstance = $(cardElement).data('cardInstance');
                          if(cardInstance && typeof cardInstance.update === 'function') {
                              console.log("HanimeMainScreenComponent: Calling card.update() after onCheck.");
                              cardInstance.update(); // Update icons/marker on the card
                          } else {
                              console.warn("HanimeMainScreenComponent: Failed to find Card instance to update icons after onCheck.");
                          }

                          // Re-draw the selectbox to update checked status visually
                          if(window.Lampa && Lampa.Select && typeof Lampa.Select.update === 'function') {
                               // Fetch updated status for redrawing
                              const updatedStatus = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(cardData) : {};
                               // Update the checked status in the itemData object reference (assuming Lampa.Select uses references)
                               itemData.checked = updatedStatus[itemData.where];
                               // Tell Lampa.Select to redraw its items based on the updated data
                               Lampa.Select.update();
                          } else {
                               console.warn("HanimeMainScreenComponent: Lampa.Select or update method not available to redraw menu after onCheck.");
                          }
                     },
                      // onSelect is called when an item is selected (relevant for non-checkbox items, or specific select logic)
                      // For simple toggles with collect: true, onCheck is primary.
                     onSelect: (itemData)=>{
                         // This part is mainly for items without `collect: true` or custom logic
                          console.log("HanimeMainScreenComponent: Context menu - item selected:", itemData);
                           // Close the selectbox and restore controller
                           if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                           if (window.Lampa && Lampa.Controller && enabledControllerName) Lampa.Controller.toggle(enabledControllerName);
                            console.log("HanimeMainScreenComponent: Context menu selected and closed.");
                     },
                      onDraw: (item, elem) => {
                           // Custom drawing logic for menu items, e.g., adding lock icon for premium features
                           // 'item' is the jQuery element for the menu item line
                           // 'elem' is the data object for the menu item (from menu_favorite array)
                           if (elem.collect && window.Lampa && Lampa.Account && typeof Lampa.Account.hasPremium === 'function' && !Lampa.Account.hasPremium()) {
                                // If item is 'collectible' and user does NOT have premium
                                let lockIconTemplate = (window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.has('icon_lock')) ? Lampa.Template.get('icon_lock') : null;
                                if (lockIconTemplate && window.$ && typeof item.find === 'function' && typeof item.append === 'function') {
                                     let wrap = $('<div class="selectbox-item__lock"></div>');
                                     wrap.append($(lockIconTemplate));
                                     item.find('.selectbox-item__checkbox').remove(); // Remove default checkbox for premium items
                                     item.append(wrap);

                                     // Modify hover:enter behavior for premium items to show premium message
                                     item.off('hover:enter').on('hover:enter', () => {
                                         if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close(); // Close the menu
                                          if (window.Lampa && Lampa.Account && typeof Lampa.Account.showCubPremium === 'function') Lampa.Account.showCubPremium(); // Show premium required message
                                     });
                                     item.addClass('disabled'); // Add a class to style it as disabled (optional CSS needed)
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
            // var metaUrl = META_URL_TEMPLATE.replace('{id}', id); // Not strictly needed if list meta is sufficient

            // Add logs to track the process
            console.log("HanimeMainScreenComponent: fetchStreamAndMeta for ID:", id, " - Starting.");
            console.log("HanimeMainScreenComponent: Stream URL being requested:", streamUrl);
            console.log("HanimeMainScreenComponent: Meta data passed:", meta);


             // Show loader while fetching playback details
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeMainScreenComponent: Activity loader not available in fetchStreamAndMeta.");

            // Check network readiness
            if (!network || typeof network.native !== 'function') {
                console.error("HanimeMainScreenComponent: Network component or its native method not available.");
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Сетевой компонент недоступен для загрузки потока.', 5000);
                return;
            }

            // Fetch stream data using network.native
            network.native(streamUrl,
                // Success handler
                (streamData) => {
                     if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); // Hide loader

                    console.log("HanimeMainScreenComponent: Stream data received (raw):", streamData);
                    console.log("HanimeMainScreenComponent: Meta Data (from list):", meta); // Use meta data passed from card

                    // Check if stream data structure is valid
                    if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                        var streamToPlay = streamData.streams[0]; // Assuming the first stream is the primary one
                        console.log("HanimeMainScreenComponent: Selected stream object:", streamToPlay);

                        var finalStreamUrl = streamToPlay ? streamToPlay.url : null;
                        console.log("HanimeMainScreenComponent: Extracted stream URL:", finalStreamUrl);


                        // Apply proxy if needed and PROXY_BASE_URL is defined
                        if(finalStreamUrl && PROXY_BASE_URL) {
                             try {
                                 var url = new URL(finalStreamUrl);
                                 // Check if the stream URL requires proxying based on hostname
                                 // Be careful: The API might change hostnames or require proxy for other reasons.
                                 // This check is specific to the previous observation ('highwinds-cdn.com').
                                 if (url.hostname && url.hostname.includes('highwinds-cdn.com')) {
                                     finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                                     console.log("HanimeMainScreenComponent: Stream URL proxied to:", finalStreamUrl);
                                 } else {
                                    console.log("HanimeMainScreenComponent: Stream URL does not require proxy:", finalStreamUrl);
                                 }
                             } catch (e) {
                                console.error("HanimeMainScreenComponent: Failed to parse or proxy stream URL:", e);
                                 console.log("HanimeMainScreenComponent: Using original stream URL due to error:", finalStreamUrl);
                             }
                        } else if (finalStreamUrl) {
                            console.log("HanimeMainScreenComponent: Proxy not needed or PROXY_BASE_URL not defined. Using original URL:", finalStreamUrl);
                        }


                        // Prepare the player object
                        // Ensure meta data is available and has required properties for the player
                        if (!meta) {
                            console.error("HanimeMainScreenComponent: Meta data is missing for player launch.");
                             if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка данных для плеера.', 5000);
                             return; // Stop if meta is missing
                        }

                        var playerObject = {
                            title: meta.name || meta.title || 'Без названия', // Use title from meta
                            url: finalStreamUrl, // Use the final (potentially proxied) URL
                            poster: meta.poster || meta.background || '', // Use poster from meta
                            // Add other relevant meta fields if player component uses them (e.g., year, duration)
                            // Check Lampa's player documentation for what it expects.
                        };
                         console.log("HanimeMainScreenComponent: Player object prepared:", playerObject);


                        // Launch the player if URL is valid and Lampa.Player component is available
                        if (playerObject.url && window.Lampa && Lampa.Player && typeof Lampa.Player.play === 'function' && typeof Lampa.Player.playlist === 'function') {
                             console.log("HanimeMainScreenComponent: Launching player with URL:", playerObject.url);
                             Lampa.Player.play(playerObject); // Play the single item
                             Lampa.Player.playlist([playerObject]); // Set the playlist (usually an array)

                             // Add item to history using the meta data provided
                             if (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                                    // Structure the history meta data appropriately for Lampa
                                    const historyMeta = {
                                        id: meta.id || '', // Required
                                         title: meta.name || meta.title || '', // Required
                                         poster: meta.poster || meta.background || '',
                                        runtime: meta.runtime, // If available
                                         year: meta.year || (meta.release_date ? meta.release_date.slice(0,4) : ''), // If available
                                        original_name: meta.original_name || '',
                                         type: meta.type || (meta.first_air_date ? 'tv' : 'movie') // Important for history/favorite checks
                                        // Add other fields Lampa's history/favorite might use if available in meta
                                    };
                                    // Add to history, 100% watched status indicates "started" or "seen"
                                    // Use 0 if you want to track progress, but this API provides full videos usually.
                                    Lampa.Favorite.add('history', historyMeta, 100);
                                    console.log("HanimeMainScreenComponent: Added to history.", historyMeta);

                                    // Note: Updating card icons after history add is handled by 'visible' event
                                    // or context menu's onCheck/onDraw. No explicit call needed here.

                             } else {
                                  console.warn("HanimeMainScreenComponent: Lampa.Favorite or add method not available to add to history.");
                             }

                        } else {
                             console.error("HanimeMainScreenComponent: Cannot launch player. Missing stream URL, Lampa.Player component, or required methods.");
                             if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                                 const errorMessage = playerObject.url ? 'Компонент плеера недоступен.' : 'Не удалось получить ссылку на поток.';
                                 console.error("HanimeMainScreenComponent:", errorMessage);
                                 Lampa.Noty.show(errorMessage, 5000);
                             }
                        }

                    } else {
                         console.warn("HanimeMainScreenComponent: No streams found in API data or invalid structure for ID:", id, streamData);
                         if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                             Lampa.Noty.show('Потоки не найдены для этого аниме.', 5000);
                         }
                    }
                },
                // Error handler for stream fetch
                (errorStatus, errorText) => {
                     if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); // Hide loader
                    console.error("HanimeMainScreenComponent: Error fetching stream for ID:", id, "Status:", errorStatus, "Error:", errorText);
                     if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                         Lampa.Noty.show('Ошибка загрузки потока: ' + (typeof errorText === 'string' ? errorText : errorStatus), 5000);
                     }
                },
                false, // No cache for stream URL
                { dataType: 'json', timeout: 10000 }
            );
        };


        // Displays an empty state message
        this.empty = function (msg) {
             console.log("HanimeMainScreenComponent: empty() - Displaying message:", msg);
             // Use Lampa.Empty component if available
             if (window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function') {
                 var empty = new Lampa.Empty({ message: msg });
                 // Append the empty component's DOM element to the main container
                 if(html && typeof html.empty === 'function' && typeof html.append === 'function') {
                      html.empty().append(empty.render(true)); // Clear container and add empty message
                 } else {
                     console.warn("HanimeMainScreenComponent: Main HTML container not available or its methods missing to show empty state.");
                 }

                 // Hide loader and toggle activity visibility
                 if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(false);
                 if(this.activity && typeof this.activity.toggle === 'function') this.activity.toggle();

                 // *** IMPORTANT ***
                 // Replace the component's start method with Lampa.Empty's start method.
                 // Lampa will call this *new* start method when activating/resuming this activity.
                 if (typeof empty.start === 'function') {
                     this.start = empty.start;
                     console.log("HanimeMainScreenComponent: Replaced start method with Lampa.Empty's start.");
                 } else {
                     console.warn("HanimeMainScreenComponent: Empty component does not have a start method. Using fallback start.");
                      // Fallback start method if Lampa.Empty doesn't provide one
                      this.start = function() {
                           console.log("HanimeMainScreenComponent: Fallback start() for empty state. Setting minimal Controller.");
                          if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                               // Add a basic controller just for the back button
                               Lampa.Controller.add('content', { back: this.back.bind(this) });
                               Lampa.Controller.toggle('content');
                          } else console.warn("HanimeMainScreenComponent: Lampa.Controller not available for fallback start method.");
                      }.bind(this);
                      console.log("HanimeMainScreenComponent: Replaced start method with fallback start.");
                 }

                  console.log("HanimeMainScreenComponent: Displaying empty state via Lampa.Empty.");
             } else {
                  // Fallback if Lampa.Empty component is not available
                  console.warn("HanimeMainScreenComponent: Lampa.Empty component not available. Using basic text fallback.");
                  if(html && typeof html.empty === 'function' && typeof html.text === 'function') {
                       html.empty().text(msg + ' (Компонент Empty недоступен в Lampa)');
                  } else {
                      console.error("HanimeMainScreenComponent: Cannot display basic empty message, main HTML container missing.");
                  }

                 if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(false);
                 if(this.activity && typeof this.activity.toggle === 'function') this.activity.toggle();

                   // Use fallback start method
                   this.start = function() {
                        console.log("HanimeMainScreenComponent: Fallback start() for empty state (no Lampa.Empty). Setting minimal Controller.");
                       if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                            // Add a basic controller just for the back button
                            Lampa.Controller.add('content', { back: this.back.bind(this) });
                            Lampa.Controller.toggle('content');
                       } else console.warn("HanimeMainScreenComponent: Lampa.Controller not available for fallback start method.");
                   }.bind(this);
                    console.log("HanimeMainScreenComponent: Replaced start method with basic text fallback start.");
             }
             // Note: No need for a return here. The reassigned `this.start` will be called later by Lampa if needed.
        };


        // Creates the component's initial structure and starts data fetching
        this.create = function (componentObject) {
            console.log("HanimeMainScreenComponent: create()");

            // Initialize network component if not already done
             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeMainScreenComponent: Lampa.Reguest initialized in create().");
              } else if (!network) console.warn("HanimeMainScreenComponent: Network not initialized in create(), Lampa.Reguest missing.");

            this.buildLayout(); // Build the main screen container HTML (but don't append to body yet)
             // Data fetching and row building happens AFTER layout is built, but before appending to body.
             // Fetching is asynchronous, so it happens *after* create returns the component's DOM.
             // The start() method is called *after* the DOM is appended.

            // Start fetching data for all rows
             console.log("HanimeMainScreenComponent: create() finished. Fetching catalogs initiated.");
             this.fetchCatalogs(); // Initiate fetch, which calls build() upon completion

             // NOTE: The return value of create() is the main DOM element.
             // Lampa appends this element to the activity's container.
             // The start() method is then called.
        };

        // Called when the component becomes the active screen
        this.start = function () {
            console.log("HanimeMainScreenComponent: start()");
            // Check if this activity is the currently active one before setting up the controller
             if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this.activity) {
                console.log("HanimeMainScreenComponent: start() - Not the currently active activity, skipping controller setup.");
                return;
            }

             // Check if there are any rows or cards to display.
             // If not, the empty() method was called in build() and it replaced this.start
             // with a minimal navigation handler. We just need to return here.
             // DO NOT remove the `rows.length === 0` check. This is the condition
             // that tells us if content was successfully loaded.
             if (rows.length === 0 || !this.$allCards || this.$allCards.length === 0) {
                  console.log("HanimeMainScreenComponent: start() called, but no rows/cards available (empty state). Relying on empty handler.");
                  // The empty() method already replaced this.start. We just exit this standard start logic.
                  return; // <--- CORRECT PLACE TO RETURN IF EMPTY STATE
             }

             // --- Normal Start Logic (only if content is available) ---
             console.log("HanimeMainScreenComponent: start() - Activity is active and has content. Setting up Lampa.Controller.");

            // Ensure Lampa core components needed for Controller navigation are available
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function' && window.Navigator && typeof window.Navigator.move === 'function') {

                 // Get all selectable elements (cards) from all rows
                 let allSelectableElements = this.$allCards; // Use the pre-collected collection

                 // Add/define the Controller for this screen
                 Lampa.Controller.add('content', {
                     // This toggle method is called when the controller is activated
                     toggle: function () {
                         console.log("HanimeMainScreenComponent: Controller toggle() called.");
                          // Set the entire collection of selectable items on the screen for Navigator
                         Lampa.Controller.collectionSet(allSelectableElements);

                          // Try to restore focus to the last known position
                          // Ensure focusedRowIndex is within bounds
                         let targetRowIndex = Math.min(Math.max(0, this.focusedRowIndex), rows.length - 1);
                         let targetRow = rows[targetRowIndex];

                         let lastElement = targetRow ? targetRow.getSelectableElements().eq(this.lastFocusedItemIndex) : $();

                         // If last element not found or invalid index, try the very first element
                         if (lastElement.length === 0 && allSelectableElements.length > 0) {
                              console.log("HanimeMainScreenComponent: Last focused element not found, focusing first element.");
                              lastElement = allSelectableElements.eq(0);
                              // Reset tracking indexes to the first element's position
                              const firstPos = this.findCardPosition(lastElement);
                              if(firstPos.rowIndex !== -1) {
                                  this.focusedRowIndex = firstPos.rowIndex;
                                  this.lastFocusedItemIndex = firstPos.itemIndex;
                                  targetRow = firstPos.row; // Update targetRow
                              } else {
                                   console.error("HanimeMainScreenComponent: Failed to find position of the first selectable element.");
                                    // Cannot focus if even the first element position is unknown
                                    if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка: нет фокусируемых элементов.');
                                    return; // Cannot proceed with focusing
                              }
                         } else if (lastElement.length === 0) {
                             console.warn("HanimeMainScreenComponent: No selectable elements available at all to focus.");
                             // This case should be caught by the initial empty check, but defensive coding.
                              return; // Cannot proceed with focusing
                         }


                         // Set focus using the Controller
                         Lampa.Controller.collectionFocus(lastElement);

                         // Manually ensure the relevant row is scrolled to the focused element
                         if(targetRow) targetRow.updateScrollPosition(lastElement);

                          console.log("HanimeMainScreenComponent: Controller collectionSet/Focus called in toggle(). Focused row", this.focusedRowIndex, "item", this.lastFocusedItemIndex);

                     }.bind(this), // Bind 'this' to the handler

                     // Navigation handlers. Navigator finds the next element.
                     left: function () {
                         let newElement = window.Navigator.move('left');
                         // React to the focus change determined by Navigator
                         this.onFocusChange(newElement);
                     }.bind(this),
                     right: function () {
                         let newElement = window.Navigator.move('right');
                         this.onFocusChange(newElement);
                     }.bind(this),
                     up: function () {
                         let newElement = window.Navigator.move('up');
                         this.onFocusChange(newElement);
                     }.bind(this),
                     down: function () {
                         let newElement = window.Navigator.move('down');
                         this.onFocusChange(newElement);
                     }.bind(this),

                      // Interaction handlers (Enter and Long Press)
                     enter: function (element, event) {
                          console.log("HanimeMainScreenComponent: Enter pressed on element:", element);
                          // Get card data associated with the focused element
                          const cardData = $(element).data('cardData');
                          if (cardData) {
                               // Call the component's click handler
                               this.onCardClick(cardData);
                          } else {
                              console.error("HanimeMainScreenComponent: No cardData found on element on Enter press.");
                              if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка данных карточки.');
                          }
                     }.bind(this),
                     long: function (element, event) {
                          console.log("HanimeMainScreenComponent: Long press on element:", element);
                           // Get card data and element for context menu
                          const cardData = $(element).data('cardData');
                          const cardElement = $(element); // Pass jQuery element
                          if (cardData) {
                               // Call the component's context menu handler
                               this.showCardContextMenu(cardElement, cardData);
                          } else {
                              console.error("HanimeMainScreenComponent: No cardData found on element on Long press.");
                               if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка данных карточки.');
                          }
                     }.bind(this),

                     // Back button handler
                     back: this.back.bind(this) // Bind 'this'
                 });

                 // Activate the controller for this component
                 Lampa.Controller.toggle('content');
                  console.log("HanimeMainScreenComponent: Controller 'content' toggled.");

             } else {
                console.error("HanimeMainScreenComponent: Lampa.Controller or Navigator, or required methods not available in start(). Cannot setup main Controller.");
                 // Add a basic controller just for the back button as a fallback
                 if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                     console.log("HanimeMainScreenComponent: Attempting to add basic Controller for Back button.");
                     Lampa.Controller.add('content', { back: this.back.bind(this) });
                     Lampa.Controller.toggle('content');
                 } else console.warn("HanimeMainScreenComponent: Lampa.Controller unavailable or methods missing, cannot add basic back handler.");
             }
        };

        // Called by navigation handlers when focus changes (via Navigator.move)
        this.onFocusChange = function(element) {
             // element is the native DOM element that Navigator moved focus to
             if (!element) {
                 console.log("HanimeMainScreenComponent: onFocusChange called with null element. Likely leaving collection boundary.");
                 // Navigator.move returns null if it can't move further in that direction
                 // (e.g., left from the first item, up from the first row's head).
                 // Lampa's core might handle moving to sidebar/head/etc. automatically based on Controller setup.
                 // If needed, you could add specific boundary handling here (e.g., manual toggle('menu')).
                 return; // Do nothing if element is null
             }

             // Find the position (row and item index) of the newly focused element
             const position = this.findCardPosition(element);

             // Check if the element is one of our cards within a row
             if (position.rowIndex !== -1) {
                  // Check if the focus actually moved to a different row or item within the row
                  if (position.rowIndex !== this.focusedRowIndex || position.itemIndex !== this.lastFocusedItemIndex) {
                       console.log(`HanimeMainScreenComponent: Focus changed to row ${position.rowIndex}, item ${position.itemIndex}.`);
                       // Update internal state with the new focus position
                       this.focusedRowIndex = position.rowIndex;
                       this.lastFocusedItemIndex = position.itemIndex;

                        // Tell the row containing the focused element to scroll to make it visible
                       if(position.row) {
                            position.row.updateScrollPosition(position.element);
                            console.log(`HanimeMainScreenComponent: Row ${position.rowIndex} scrolled to item.`);
                       } else {
                           console.warn("HanimeMainScreenComponent: onFocusChange could not find row reference for scrolling.");
                       }

                        // Optional: Trigger update on the newly focused card instance
                        // This ensures icons/markers are fresh. Handled by 'visible' event too,
                        // but calling explicitly here guarantees update immediately on focus.
                       let cardInstance = position.row.getCardInstanceByElement(position.element);
                        if(cardInstance && typeof cardInstance.update === 'function') {
                             console.log("HanimeMainScreenComponent: Calling card.update() on focused card.");
                             cardInstance.update();
                        } else {
                            console.warn("HanimeMainScreenComponent: Could not get card instance to update on focus change.");
                        }
                  } else {
                       // Focus moved, but stayed on the *same* logically tracked item? (Shouldn't happen with Navigator.move unless something is off)
                       // Could potentially still trigger update if needed, but maybe too frequent.
                       // console.log("HanimeMainScreenComponent: Focus apparently remained on the same item.");
                  }
             } else {
                  console.warn("HanimeMainScreenComponent: onFocusChange called with element not found in any handled row:", element);
                  // This might happen if Navigator moves focus to something outside our collection unexpectedly.
                  // You might need logic here to handle such cases, e.g., toggle to another controller if needed.
             }
        };


        this.pause = function () {
             console.log("HanimeMainScreenComponent: pause() called.");
             // Save the last focused item's position when pausing the activity.
             // This allows restoring focus when the activity is resumed (in start()).
             // Check if the 'content' controller is enabled AND Lampa.Controller.item is a function before calling it.
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') { // <-- Добавлена проверка typeof Lampa.Controller.item
                 let focusedElement = Lampa.Controller.item(); // Get the currently focused DOM element from the controller
                  if (focusedElement) {
                       // Find the position of the focused element within our rows
                      const position = this.findCardPosition(focusedElement);
                       if (position.rowIndex !== -1) {
                           // Save the row and item index
                           this.focusedRowIndex = position.rowIndex;
                           this.lastFocusedItemIndex = position.itemIndex;
                           console.log("HanimeMainScreenComponent: Activity paused. Saved focus position: row", this.focusedRowIndex, "item", this.lastFocusedItemIndex);
                       } else {
                           console.warn("HanimeMainScreenComponent: Pause called, but focused element found by Controller.item not found in rows. Position not saved.");
                       }
                  } else {
                       console.log("HanimeMainScreenComponent: Pause called, but Controller.item() returned null/undefined (no element focused).");
                  }
             } else {
                  console.log("HanimeMainScreenComponent: Pause called, but content controller not active or Controller.item not a function. Last focus not saved.");
             }
        };

        this.stop = function () {
             console.log("HanimeMainScreenComponent: stop() called.");
             // No specific stop logic needed beyond pause/destroy cleanup typically.
        };

        // Returns the main screen's DOM element (jQuery object)
        // Lampa appends this element to the activity's container when the activity starts.
        this.render = function () {
            if (!html) {
                 this.buildLayout();
                 // Data fetching and row building (which populates `html`) happens in create/fetchCatalogs/build,
                 // but asynchronously. So `html` might be empty when render is first called by Lampa.
                 // The build() method will populate it later.
                 console.log("HanimeMainScreenComponent: render() called. HTML layout created (might be empty initially).");
            } else {
                 console.log("HanimeMainScreenComponent: render() called. Returning existing HTML layout.");
            }
            return html; // Return jQuery object
        };

        // Destroys the component and cleans up resources
        this.destroy = function () {
            console.log("HanimeMainScreenComponent: destroy() called.");

            // Clear any ongoing network requests
            if(network && typeof network.clear === 'function') network.clear(); network = null;

             // Destroy all created HanimeRow instances and their contents
             if (rows && Array.isArray(rows)) {
                 rows.forEach(row => {
                     if (row && typeof row.destroy === 'function') row.destroy();
                 });
                 console.log("HanimeMainScreenComponent: Destroyed all row instances.");
             }
            rows = null; this.$allCards = $(); // Clear references and the collection

             // Remove the main screen HTML element from DOM
             if (html && typeof html.remove === 'function') {
                 html.remove();
                 console.log("HanimeMainScreenComponent: Removed html element from DOM.");
             }
            html = null;

            // Remove the Controller instance associated with this component
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function') {
                 // Check if this component's controller is currently active before potentially clearing collection
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.collectionSet === 'function') {
                       console.log("HanimeMainScreenComponent: Clearing Controller collection.");
                      Lampa.Controller.collectionSet([]); // Clear the collection managed by this controller
                 }
                 // Always try to remove the controller by name
                 Lampa.Controller.remove('content');
                  console.log("HanimeMainScreenComponent: Controller 'content' removed.");
            } else console.warn("HanimeMainScreenComponent: Lampa.Controller not available or remove method missing for cleanup in destroy.");

             // Reset focus state variables
             this.focusedRowIndex = 0;
             this.lastFocusedItemIndex = 0;

            console.log("HanimeMainScreenComponent: destroy() finished. Resources released.");
        };

        // Back button handler for the Controller
        this.back = function () {
             console.log("HanimeMainScreenComponent: back() called. Attempting Activity.backward().");
             // Navigate back in Lampa's activity stack
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') {
                 Lampa.Activity.backward();
             } else console.warn("HanimeMainScreenComponent: Lampa.Activity or backward method missing for navigation.");
        };

        // Initial creation setup
        // The constructor calls create, which builds layout and starts fetch.
        // Fetch calls build() on completion, which populates the layout with rows and cards.
        // Lampa then calls render() to get the main element, and then start() to activate it.
        this.create(componentObject); // Call create immediately upon instantiation
    }

    // --- Plugin Initialization ---
    // Function to register the component and add the menu item
    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() invoked.");

         // Check if the plugin is already ready to prevent double initialization
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: global plugin_hanime_catalog_ready flag already set. Skipping initialization.");
             return;
         }

        // Function called once Lampa is ready (or after a fallback delay)
        function initializeLampaDependencies() {
             console.log("Hanime Plugin: initializeLampaDependencies() called (Lampa appready or fallback delay completed).");

             // Perform critical Lampa component availability checks
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Template || typeof Lampa.Template !== 'object' || !Lampa.Component || typeof Lampa.Component !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Scroll || typeof Lampa.Scroll !== 'function' || !Lampa.Reguest || typeof Lampa.Reguest !== 'function' || !window.Navigator || typeof window.Navigator.move !== 'function') {
                  console.error("Hanime Plugin: CRITICAL: Required Lampa components (Lampa, Template, Component, Activity, Controller, jQuery, Scroll, Reguest, Navigator) are not available after waiting for appready. Initialization failed. Please check Lampa version and installation.");
                  // Display a critical error notification if Noty is available
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина Hanime: Компоненты Lampa недоступны. Обновите Lampa или плагин.', 15000);
                  }
                  return; // Stop initialization if critical components are missing
             }
             console.log("Hanime Plugin: All critical Lampa components checked OK. Continuing initialization.");

              // Set the ready flag *after* successfully checking critical dependencies
              if (!window.plugin_hanime_catalog_ready) {
                 window.plugin_hanime_catalog_ready = true;
                 console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag set.");
              } else {
                   // This should ideally not be reached if the initial check passed, but as a failsafe
                   console.warn("Hanime Plugin: Plugin flag was unexpectedly set before initialization. Possible double load issue?");
                   return; // Prevent re-initialization
              }

             console.log("Hanime Plugin: Adding standard template fallbacks using Lampa.Template.add...");
             if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                 // Add templates needed by HanimeCard that might not be standard in all Lampa versions
                 Lampa.Template.add('card_vote_temp', '<div class="card__vote"></div>');
                 Lampa.Template.add('card_quality_temp', '<div class="card__quality"><div></div></div>');
                 Lampa.Template.add('card_year_temp', '<div class="card__age"></div>'); // This is used by addDetails
                 Lampa.Template.add('card_type_temp', '<div class="card__type"></div>');
                 // Template for lock icon used in context menu for premium features
                 Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
                  console.log("Hanime Plugin: Standard template fallbacks added successfully.");
             } else {
                 console.error("Hanime Plugin: Lampa.Template.add method not available. Cannot add template fallbacks.");
             }

             console.log("Hanime Plugin: Adding hanime-card template...");
             if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                 // Add the main card template
                 Lampa.Template.add('hanime-card', `
                     <div class="hanime-card card selector layer--visible layer--render">
                         <div class="card__view">
                             <img src="./img/img_load.svg" class="card__img" alt="{title}" loading="lazy" />
                             <div class="card__icons">
                                 <div class="card__icons-inner"></div>
                             </div>
                             <!-- These elements are included in the template -->
                             <div class="card__vote"></div>
                             <div class="card__quality"><div></div></div>
                             <div class="card__type"></div>
                              <!-- Card marker will be added dynamically by updateFavoriteIcons -->
                             <!-- <div class="card__marker"><span></span></div> -->
                         </div>
                         <div class="card__title">{title}</div>
                         <!-- This element is included in the template -->
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
                 // Register the new main screen component with Lampa
                 Lampa.Component.add('hanime_catalog_screen', HanimeMainScreenComponent);
                 console.log("Hanime Plugin: Component 'hanime_catalog_screen' registered successfully.");
             } else {
                 console.error("Hanime Plugin: Lampa.Component.add method not available. Cannot register component.");
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина Hanime: Не удалось зарегистрировать компонент.', 5000);
                  }
             }

             console.log("Hanime Plugin: Calling addMenuItem()...");
             addMenuItem(); // Add the single menu item that launches the main screen
              console.log("Hanime Plugin: addMenuItem() called from initializeLampaDependencies.");

              console.log("Hanime Plugin: initializeLampaDependencies() finished.");
        }

        // Function to add the plugin's entry to the Lampa main menu
        function addMenuItem() {
             console.log("Hanime Plugin: addMenuItem() called.");

             // Basic Lampa dependency checks for menu item creation
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Component || typeof Lampa.Component !== 'object' || typeof Lampa.Component.get !== 'function') {
                  console.warn("Hanime Plugin: addMenuItem cannot proceed. Missing Lampa core components, jQuery, or Component.get.");
                  return;
             }

             // Find the main menu list element in the DOM
             var menuList = $('.menu .menu__list').eq(0);
             if (!menuList.length) {
                 console.warn("Hanime Plugin: addMenuItem cannot proceed. Lampa menu DOM structure ('.menu .menu__list') not found.");
                 return;
             }

             console.log("Hanime Plugin: addMenuItem checks passed.");

             // Check if our main screen component is registered before adding menu item
             var ourComponentRegistered = Lampa.Component.get('hanime_catalog_screen');
             if (!ourComponentRegistered) {
                 console.warn("Hanime Plugin: addMenuItem skipping - Component 'hanime_catalog_screen' is not found/registered in Lampa.Component.");
                 return;
             }
             console.log("Hanime Plugin: Component 'hanime_catalog_screen' confirmed registered.");

             // Define the text for the single menu item
             const menuItemText = 'Hanime Catalog'; // Use a single title for the main screen

             // Check if the menu item with this text already exists to prevent duplicates
             if (menuList.find('.menu__text:contains("' + menuItemText + '")').length > 0) {
                 console.log("Hanime Plugin: Menu item with text '" + menuItemText + "' already exists in DOM. Skipping addMenuItem.");
                 return;
             }

             console.log("Hanime Plugin: Adding single menu item DOM element to Lampa menu.");

             // Create the DOM element for the menu item
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

            // Attach event listener for 'hover:enter' (Enter button press)
            if (typeof menu_item.on === 'function') {
                menu_item.on('hover:enter', function () {
                     console.log("Hanime Plugin: Menu item '" + menuItemText + "' activated via 'hover:enter'. Pushing main activity.");
                     // Use Lampa.Activity.push to navigate to our main screen component
                     if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.push === 'function') {
                         Lampa.Activity.push({
                             url: '', // The component itself doesn't use this URL for fetching categories anymore
                             title: menuItemText, // Set the activity title
                             component: 'hanime_catalog_screen', // Specify the component to launch
                             page: 1 // Optional: pass initial state if needed by the component
                         });
                          console.log("Hanime Plugin: Lampa.Activity.push called for main screen component.");
                     } else {
                          console.warn("Hanime Plugin: Lampa.Activity or push method unavailable to launch main activity.");
                         if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Не удалось запустить активность.');
                     }
                });
                console.log("Hanime Plugin: 'hover:enter' event listener attached to menu item.");
            } else {
                console.warn("Hanime Plugin: jQuery on() method not available for menu item. Cannot attach event listener.");
            }

             // Append the created menu item to the main menu list
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

         // Use Lampa.Listener to wait for the 'app:ready' event, which indicates Lampa's core is initialized.
         if (window.Lampa && typeof window.Lampa !== 'object' || !Lampa.Listener || typeof Lampa.Listener !== 'object' || typeof Lampa.Listener.follow !== 'function') {
              console.warn("Hanime Plugin: Lampa or Lampa.Listener not available or methods missing. Checking appready flag directly or scheduling delayed start as fallback.");

              // Fallback: Check the global appready flag if Listener is not available
              if (window.appready && typeof window.appready === 'boolean' && window.appready) {
                  console.log("Hanime Plugin: Lampa 'appready' flag found. Calling initializeLampaDependencies directly as fallback.");
                  initializeLampaDependencies(); // Call init function immediately
              } else {
                   // Less reliable fallback: Schedule a delayed initialization if no reliable ready signal
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
                     initializeLampaDependencies(); // Call init function when app is ready
                 }
             });
              console.log("Hanime Plugin: Subscribed to Lampa 'app:ready' event.");
         }

         console.log("Hanime Plugin: startPlugin() finished its initial execution (setup listener or fallback).");
    }

    // Start the plugin initialization process
    startPlugin();

})();
