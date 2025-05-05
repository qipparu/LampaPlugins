(function () {
    'use strict';

    // HanimeCard component - handles individual card rendering and updates
    function HanimeCard(data, componentRef) {
        // Process raw data into a consistent format
        var processedData = {
            id: data.id,
            title: data.name || data.title || 'Без названия',
            poster_path: data.poster || data.img,
            vote_average: data.vote_average || data.vote || null,
            quality: data.quality || data.release_quality || null,
            release_year: ((data.year || data.release_date || '') + '').slice(0, 4),
            type: data.first_air_date ? 'tv' : 'movie', // Assuming 'tv' for series, 'movie' otherwise
            original_name: data.original_name
        };

        // Get the card template from Lampa
        var cardTemplate = Lampa.Template.get('hanime-card', {
            img: processedData.poster_path,
            title: processedData.title
        });

        // Create a jQuery object from the template
        var cardElement = $(cardTemplate);

        // Method to add an icon to the card (e.g., favorite status)
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

        // Method to add/update details like rating, quality, year, type
        this.addDetails = function() {
             var viewElement = cardElement.find('.card__view');

             // Add/update vote average
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

            // Add/update quality
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

             // Add/update type (movie/tv)
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

             // Add/update release year
             let ageElement = cardElement.find('.card__age');
             if (ageElement.length) {
                  if (processedData.release_year !== '0000' && processedData.release_year) {
                      ageElement.text(processedData.release_year).show();
                  } else {
                       ageElement.text('').hide();
                  }
             } else {
                 // Fallback if .card__age is not in template - try to add it
                 if (processedData.release_year !== '0000' && processedData.release_year) {
                     let newAgeElement = $('<div class="card__age"></div>').text(processedData.release_year);
                      let titleElement = cardElement.find('.card__title');
                      if (titleElement.length) {
                          titleElement.after(newAgeElement);
                          console.warn("HanimeCard: Created .card__age element dynamically. Prefer including in template.");
                      } else {
                          cardElement.append(newAgeElement);
                          console.error("HanimeCard: Cannot find .card__title to place .card__age dynamically.");
                      }
                 }
             }
        }

        // Update favorite/watched icons and markers
        this.updateFavoriteIcons = function() {
            // Clear existing icons and markers
            cardElement.find('.card__icons-inner').empty();
            cardElement.find('.card__marker').remove();

            // Check favorite status using Lampa's Favorite component
             var status = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(processedData) : {};
             if(Object.keys(status).length === 0 && window.Lampa && Lampa.Favorite) console.warn("HanimeCard: Lampa.Favorite.check returned empty status for", processedData.title, ". Data:", processedData);

            // Add icons based on status
            if (status.book) this.addicon('book');
            if (status.like) this.addicon('like');
            if (status.wath) this.addicon('wath');
            // Check history status using Lampa's Timeline component or Favorite status
            if (status.history || (window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched === 'function' && Lampa.Timeline.watched(processedData))) this.addicon('history');

            // Add status marker (e.g., viewed, planned)
             var marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];
             var activeMarker = marks.find(m => status[m]);

             if (activeMarker) {
                 var markerElement = cardElement.find('.card__marker');
                 if (!markerElement.length) {
                     markerElement = $('<div class="card__marker"><span></span></div>');
                     cardElement.find('.card__view').append(markerElement);
                 }
                 // Translate marker text if Lampa.Lang is available
                 markerElement.find('span').text(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? Lampa.Lang.translate('title_' + activeMarker) : activeMarker);
                 // Add specific class for styling
                 markerElement.removeClass(marks.map(m => 'card__marker--' + m).join(' '))
                             .addClass('card__marker--' + activeMarker);
             } else {
                 cardElement.find('.card__marker').remove();
             }
        };

        // Called when the card becomes visible in the viewport
        this.onVisible = function() {
             var imgElement = cardElement.find('.card__img');

             // Load image only if it's not already loaded or is the loading placeholder
             if (imgElement.length && (!imgElement.attr('src') || imgElement.attr('src').includes('img_load.svg'))) {
                 var src = processedData.poster_path;

                 // Use Lampa's ImageCache if available for better performance
                 if(window.Lampa && Lampa.ImageCache && typeof Lampa.ImageCache.read === 'function' && typeof Lampa.ImageCache.write === 'function') {
                      if(!Lampa.ImageCache.read(imgElement[0], src)) {
                          imgElement[0].onload = () => {
                              cardElement.addClass('card--loaded');
                              Lampa.ImageCache.write(imgElement[0], imgElement[0].src);
                          };
                          imgElement[0].onerror = () => {
                               console.error('Hanime Plugin: Image load error:', src);
                               imgElement.attr('src', './img/img_broken.svg');
                               if(window.Lampa && Lampa.Tmdb && typeof Lampa.Tmdb.broken === 'function') Lampa.Tmdb.broken(); // Notify Lampa Tmdb if available
                          };
                          imgElement.attr('src', src || './img/img_broken.svg');
                      } else {
                         cardElement.addClass('card--loaded'); // Image was in cache
                      }
                 } else {
                     console.warn("Hanime Plugin: Lampa.ImageCache not available. Using basic image loading.");
                      imgElement[0].onload = () => { cardElement.addClass('card--loaded'); console.log("HanimeCard: Image loaded (basic):", src); };
                     imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error (basic):', src); imgElement.attr('src', './img/img_broken.svg'); };
                     imgElement.attr('src', src || './img/img_broken.svg');
                 }
             } else {
                 // Image already loaded or no img element
             }

            // Update favorite icons when visible (status might change)
            this.updateFavoriteIcons();
        }

        // Create the card element and attach event listeners
        this.create = function(){
             if (cardElement.data('created')) {
                 return; // Prevent double creation
             }

             // Attach hover events using jQuery (Lampa's selector system)
             if (typeof cardElement.on === 'function') {
                cardElement.on('hover:focus', function () {
                     // Notify the parent component when this card is focused
                     if (componentRef && componentRef.updateScrollToFocus && typeof componentRef.updateScrollToFocus === 'function') {
                          componentRef.updateScrollToFocus(cardElement);
                     }
                     this.update(); // Update icons/status on focus
                }.bind(this)); // Bind 'this' to the HanimeCard instance

                 cardElement.on('hover:enter', function () {
                     // Notify the parent component when this card is clicked/entered
                     if (componentRef && componentRef.onCardClick && typeof componentRef.onCardClick === 'function') {
                         componentRef.onCardClick(processedData);
                     }
                }.bind(this));

                cardElement.on('hover:long', function(){
                     // Notify the parent component for context menu
                     if (componentRef && componentRef.showCardContextMenu && typeof componentRef.showCardContextMenu === 'function') {
                          componentRef.showCardContextMenu(cardElement, processedData);
                     }
                 }.bind(this));
             } else {
                 console.warn("HanimeCard: jQuery on() method not available to attach hover events.");
             }

             // Attach 'visible' event listener (native DOM event used by Lampa's Scroll)
             this.card = cardElement[0]; // Get the native DOM element
             if (this.card && typeof this.card.addEventListener === 'function') {
                this.card.addEventListener('visible', this.onVisible.bind(this));
             } else {
                 console.warn("HanimeCard: Cannot attach 'visible' event listener, native element or addEventListener not available.");
             }

             // Add details and update icons after a short delay to allow DOM rendering
             setTimeout(() => {
                  this.addDetails();
                  this.update();
             }, 0);

             cardElement.data('created', true); // Mark as created
        }

        // Update method - currently just updates favorite icons
        this.update = function(){
            this.updateFavoriteIcons();
             // Optional: Integrate Lampa.Timeline.watched_status if needed
             // if(window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched_status === 'function') Lampa.Timeline.watched_status(cardElement, processedData);
             // else console.warn("HanimeCard: Cannot update watched status, Lampa.Timeline not available or method missing.");
        }

        // Render method - returns the card element
        this.render = function(js){
             if (!cardElement.data('created')) {
                 this.create();
             }
            return js ? cardElement[0] : cardElement; // Return native element or jQuery object
        }

        // Destroy method - cleans up resources
        this.destroy = function(){
             console.log("HanimeCard: destroy() called for", processedData ? processedData.title : 'unknown card');
             // Remove event listener
             if(this.card && typeof this.card.removeEventListener === 'function' && this.onVisible) this.card.removeEventListener('visible', this.onVisible.bind(this));
             // Remove element from DOM
             if(cardElement && typeof cardElement.remove === 'function') cardElement.remove();
             // Nullify references
             processedData = null; cardElement = null; this.card = null; componentRef = null;
             console.log("HanimeCard: destroy() finished.");
        }
    }

    // Define API base URL and proxy URL
    const API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
    const PROXY_BASE_URL = "http://77.91.78.5:3000"; // Proxy for specific CDNs if needed

    // Define the categories and their corresponding API paths and titles
    const CATEGORIES = {
        newset: { title: 'Последние добавленные', path: '/catalog/movie/newset.json' },
        recent: { title: 'Недавние', path: '/catalog/movie/recent.json' },
        mostlikes: { title: 'Популярные (лайки)', path: '/catalog/movie/mostlikes.json' },
        mostviews: { title: 'Популярные (просмотры)', path: '/catalog/movie/mostviews.json' }
    };

    // HanimeComponent - manages the list of cards and overall view
    function HanimeComponent(componentObject) {
        var network = null; // Lampa Reguest instance
        var scroll = null; // Lampa Scroll instance

        var items = []; // Array of HanimeCard instances
        var html = null; // Main component HTML element (jQuery object)
        var itemsContainer = null; // Container for cards within the scroll (jQuery object)

        var active = 0; // Index of the active card (not strictly used for focus by Lampa Controller)
        var last = null; // Last focused DOM element, used by Lampa Controller for restoring focus

        this.currentCategoryKey = 'newset'; // State variable for the currently displayed category

        // Build the basic HTML layout for the component
        this.buildLayout = function() {
            html = $(`
                <div class="items-line layer--visible layer--render items-line--type-cards">
                    <div class="items-line__head">
                        <div class="items-line__title"></div> <!-- Title will be set dynamically -->
                    </div>
                    <div class="items-line__body">
                    </div>
                </div>
            `);

             itemsContainer = $('<div class="items-cards"></div>'); // Container for the cards
        };

        // Fetch catalog data from the API based on the current category
        this.fetchCatalog = function () {
            var _this = this;
            // Get the category details based on the current key
            const category = CATEGORIES[this.currentCategoryKey];
            if (!category) {
                console.error("HanimeComponent: Invalid category key:", this.currentCategoryKey);
                _this.empty("Неверная категория.");
                return;
            }
            // Construct the full API URL
            const catalogUrl = API_BASE_URL + category.path;

             // Show loader while fetching
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeComponent: Activity loader not available in fetchCatalog.");

             console.log("HanimeComponent: fetchCatalog() - Starting request to", catalogUrl);

             // Initialize network request component if not already
             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeComponent: Lampa.Reguest initialized.");
             }

             // Clear previous requests
             if (network && typeof network.clear === 'function') network.clear();
             else console.warn("HanimeComponent: Network clear method not available.");

             // Perform the native HTTP request
             if(network && catalogUrl && typeof network.native === 'function'){
                network.native(catalogUrl,
                    function (data) {
                        // Success callback
                        if (data && data.metas && Array.isArray(data.metas)) {
                             if (data.metas.length > 0) {
                                _this.build(data.metas); // Build UI with received data
                             } else {
                                _this.empty("Каталог пуст."); // Show empty state if no items
                             }
                        } else {
                            _this.empty("Неверный формат данных от API."); // Show error for invalid data
                            console.error("HanimeComponent: Invalid data format from API.", data);
                        }
                    },
                    function (errorStatus, errorText) {
                        // Error callback
                        _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus); // Show error message
                        console.error("HanimeComponent: Failed to load catalog.", errorStatus, errorText);
                    },
                    false, // No headers
                    { dataType: 'json', timeout: 15000 } // Request options
                );
             } else {
                 console.error("HanimeComponent: Cannot fetch catalog. Network component, catalogUrl, or network.native missing.");
                  _this.empty("Не удалось загрузить каталог. Ошибка инициализации сети.");
             }
        };

        // Build the UI (create cards and add them to the scroll)
        this.build = function (result) {
            var _this = this;
             console.log("HanimeComponent: build() - Building UI with", result.length, "items.");

             // Initialize horizontal scroll component if not already
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                  scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
                  console.log("HanimeComponent: Lampa.Scroll initialized (horizontal).");
             }

             // Reset scroll position
             if(scroll && typeof scroll.minus === 'function') scroll.minus();
             else console.warn("HanimeComponent: Scroll or scroll.minus method not available in build(). Cannot scroll to beginning.");

             // Check for required DOM/Lampa components before building
             if (!(itemsContainer && typeof itemsContainer.empty === 'function' && scroll && html && typeof html.find === 'function' && typeof html.append === 'function' && typeof scroll.append === 'function' && typeof scroll.render === 'function')) {
                  console.error("HanimeComponent: Missing critical DOM/Lampa dependencies in build(). Aborting UI build.");
                   if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                  _this.empty("Не удалось построить интерфейс.");
                  return;
             }

            // Clear previous items
            itemsContainer.empty();
            items = [];

            // Create and append HanimeCard instances
            if(itemsContainer && scroll && window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function') {
                 result.forEach(function (meta) {
                    var card = new HanimeCard(meta, _this); // Create card instance
                    var cardElement = card.render(); // Render card DOM element

                     itemsContainer.append(cardElement); // Add card to container
                    items.push(card); // Store card instance
                });
                 console.log("HanimeComponent: Created and added", items.length, "cards to itemsContainer.");

                // Add the container to the scroll component
                scroll.append(itemsContainer);

                // Add the scroll component's rendered element to the main HTML body
                html.find('.items-line__body').empty().append(scroll.render(true));

                // Set the title based on the current category
                const currentCategory = CATEGORIES[this.currentCategoryKey];
                if (currentCategory) {
                     html.find('.items-line__title').text(currentCategory.title);
                } else {
                     html.find('.items-line__title').text('Каталог'); // Fallback title
                }


            } else {
                console.error("HanimeComponent: Missing required objects or methods before building cards in build().");
                if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина при создании карточек.', 5000);
                  }
            }

             // Hide loader and toggle activity state
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
             if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
             console.log("HanimeComponent: Build process completed and activity toggled.");
        };

        // Handle card click event - fetch stream and meta data
         this.onCardClick = function(cardData) {
             console.log("HanimeComponent: Card clicked:", cardData.title);
            this.fetchStreamAndMeta(cardData.id, cardData);
         }

        // Show context menu for a card (e.g., for adding to favorites)
         this.showCardContextMenu = function(cardElement, cardData) {
             console.log("HanimeComponent: showCardContextMenu for", cardData.title);
             var _this = this;

             // Save current controller state to restore later
             var enabled = (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;

             // Get current favorite status
             var status = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(cardData) : {};

             // Prepare menu items for Lampa.Select
             var menu_favorite = [];
             if(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') {
                 // Use Lampa's translation if available
                 menu_favorite = [
                     { title: Lampa.Lang.translate('title_book'), where: 'book', checkbox: true, checked: status.book, collect: true }, // Added collect: true
                     { title: Lampa.Lang.translate('title_like'), where: 'like', checkbox: true, checked: status.like, collect: true }, // Added collect: true
                     { title: Lampa.Lang.translate('title_wath'), where: 'wath', checkbox: true, checked: status.wath, collect: true }, // Added collect: true
                     { title: Lampa.Lang.translate('menu_history'), where: 'history', checkbox: true, checked: status.history, collect: true }, // Added collect: true
                     { title: Lampa.Lang.translate('settings_cub_status'), separator: true } // Status marker options
                 ];
                 // Add status marker options if Lampa.Favorite has them
                 if (window.Lampa.Favorite.marks) {
                      menu_favorite = menu_favorite.concat(
                           Lampa.Favorite.marks.map(m => {
                                return {
                                     title: Lampa.Lang.translate('title_' + m),
                                     where: m,
                                     checkbox: true,
                                     checked: status[m],
                                     collect: true
                                };
                           })
                      );
                 }
             } else {
                 console.warn("HanimeComponent: Lampa.Lang not available, using English/basic for menu items.");
                 // Fallback English/basic titles
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


             // Show the select menu using Lampa.Select
             if (window.Lampa && Lampa.Select && typeof Lampa.Select.show === 'function') {
                 Lampa.Select.show({
                     title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('title_action') : 'Action',
                     items: menu_favorite,
                     onBack: ()=>{
                         // Restore controller on back press
                         if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                          console.log("HanimeComponent: Context menu back button pressed. Restored controller:", enabled);
                     },
                     onCheck: (a)=>{
                         // Handle checkbox changes (favorite status)
                         console.log("HanimeComponent: Context menu - checkbox checked:", a.where);
                         if(window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function') Lampa.Favorite.toggle(a.where, cardData);
                         // Find the corresponding card instance and update its icons
                         var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                          if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                         else console.warn("HanimeComponent: Failed to find Card object to update icons after onCheck.");
                     },
                     onSelect: (a)=>{
                          // Handle item selection (if any non-checkbox items were added)
                          console.log("HanimeComponent: Context menu - item selected:", a);
                          // If it's a 'collect' item (favorite status), toggle it
                          if(a.collect && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function'){
                              Lampa.Favorite.toggle(a.where, cardData);
                               var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                              if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                               else console.warn("HanimeComponent: Failed to find Card object to update icons after onSelect.");
                          }
                          // Close the menu and restore controller
                          if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                           if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                            console.log("HanimeComponent: Context menu selected and closed.");
                     },
                      onDraw: (item, elem) => {
                           // Custom drawing for menu items (e.g., adding lock icon for premium features)
                           if (elem.collect && window.Lampa && Lampa.Account && typeof Lampa.Account.hasPremium === 'function' && !Lampa.Account.hasPremium()) {
                                let lockIconTemplate = (window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.has('icon_lock')) ? Lampa.Template.get('icon_lock') : null;
                                if (lockIconTemplate && window.$ && typeof item.find === 'function' && typeof item.append === 'function') {
                                     let wrap = $('<div class="selectbox-item__lock"></div>');
                                     wrap.append($(lockIconTemplate));
                                     item.find('.selectbox-item__checkbox').remove(); // Remove checkbox for premium items
                                     item.append(wrap);

                                     // Change action on enter for premium items
                                     item.off('hover:enter').on('hover:enter', () => {
                                         if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                                          if (window.Lampa && Lampa.Account && typeof Lampa.Account.showCubPremium === 'function') Lampa.Account.showCubPremium();
                                     });
                                } else {
                                     console.warn("Hanime Component: icon_lock template or Template/jQuery/methods missing for Premium item draw.");
                                }
                           }
                      }
                 });
             } else {
                 console.warn("Hanime Component: Lampa.Select component not available to show context menu.");
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Компонент меню недоступен.', 5000);
                 }
             }
         };

        // Update scroll position to focus on the given element
        this.updateScrollToFocus = function(element) {
             if (scroll && typeof scroll.update === 'function' && element && typeof element.length === 'number' && element.length > 0) {
                last = element[0]; // Save the native DOM element
                scroll.update(element, true); // Update scroll position
            } else {
                console.warn("HanimeComponent: Scroll instance or update method, or valid element missing to scroll.");
            }
        }

        // Fetch stream and meta data for playback
        this.fetchStreamAndMeta = function (id, meta) {
             var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeComponent: Activity loader not available in fetchStreamAndMeta.");

            console.log("HanimeComponent: fetchStreamAndMeta for ID:", id);

            if (!network || typeof network.native !== 'function') {
                console.error("HanimeComponent: Network component or its native method not available.");
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Сетевой компонент недоступен для загрузки потока.', 5000);
                return;
            }

            // Use Promise.all to fetch stream and meta data concurrently
            Promise.all([
                new Promise((resolve, reject) => {
                    if(streamUrl && network) network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                    else reject('Stream URL or Network unavailable');
                }),
                // If meta data is already available (from catalog), use it, otherwise fetch it
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                     if(metaUrl && network) network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                     else reject('Meta URL or Network unavailable');
                 })
            ]).then(([streamData, metaDataResponse]) => {
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);

                const fullMetaData = metaDataResponse ? (metaDataResponse.meta || metaDataResponse) : null;
                console.log("HanimeComponent: Stream data received:", streamData);
                console.log("HanimeComponent: Full Meta Data received:", fullMetaData);

                // Process stream data and prepare for player
                if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0]; // Assuming the first stream is the primary one
                    var finalStreamUrl = streamToPlay ? streamToPlay.url : null;

                    // Apply proxy if the URL matches a specific CDN
                    if(finalStreamUrl) {
                         try {
                             var url = new URL(finalStreamUrl);
                             if (url.hostname && url.hostname.includes('highwinds-cdn.com') && PROXY_BASE_URL) {
                                 finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                                 console.log("HanimeComponent: Stream URL proxied.");
                             } else {
                                console.log("HanimeComponent: Stream URL does not require proxy:", finalStreamUrl);
                             }
                         } catch (e) {
                            console.error("HanimeComponent: Failed to parse or proxy stream URL:", e);
                             console.log("HanimeComponent: Using original stream URL due to error:", finalStreamUrl);
                         }
                    }

                    // Prepare player object
                    var playerObject = {
                        title: fullMetaData ? (fullMetaData.name || fullMetaData.title || 'Без названия') : 'Без названия',
                        url: finalStreamUrl,
                        poster: fullMetaData ? (fullMetaData.poster || fullMetaData.background || '') : '',
                    };

                    // Launch Lampa player
                    if (playerObject.url && window.Lampa && Lampa.Player && typeof Lampa.Player.play === 'function' && typeof Lampa.Player.playlist === 'function') {
                         console.log("HanimeComponent: Launching player.");
                         Lampa.Player.play(playerObject);
                         Lampa.Player.playlist([playerObject]); // Add to playlist (even if only one item)

                         // Add to history if meta data is available
                         if (fullMetaData && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                                const historyMeta = {
                                    id: fullMetaData.id || '', title: fullMetaData.name || fullMetaData.title || '', poster: fullMetaData.poster || fullMetaData.background || '',
                                    runtime: fullMetaData.runtime, year: fullMetaData.year, original_name: fullMetaData.original_name || ''
                                };
                                Lampa.Favorite.add('history', historyMeta, 100); // Add to history with 100% progress (as it's just started)
                                console.log("HanimeComponent: Added to history.");
                         } else {
                              console.warn("HanimeComponent: Lampa.Favorite or add method not available to add to history.");
                         }

                    } else {
                         console.error("HanimeComponent: Cannot launch player. Missing stream URL, Lampa.Player, or methods.");
                         if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                             Lampa.Noty.show(playerObject.url ? 'Компонент плеера недоступен.' : 'Не удалось получить ссылку на поток.', 5000);
                         }
                    }

                } else {
                     console.warn("HanimeComponent: No streams found in API data or invalid structure.");
                     if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                         Lampa.Noty.show('Потоки не найдены для этого аниме.', 5000);
                     }
                }

            }).catch(error => {
                // Handle errors during fetch
                if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                console.error("HanimeComponent: Error fetching stream/meta details:", error);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'), 5000);
                 }
            });
        };

        // Show category selection menu
        this.showCategorySelect = function() {
            console.log("HanimeComponent: showCategorySelect() called.");
            var _this = this;
            // Save current controller state
            var enabled = (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;

            // Check if Lampa.Select is available
            if (!window.Lampa || !Lampa.Select || typeof Lampa.Select.show !== 'function') {
                console.warn("HanimeComponent: Lampa.Select component not available to show category menu.");
                if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                    Lampa.Noty.show('Компонент меню выбора недоступен.', 5000);
                }
                // Restore controller if it was saved
                if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                return;
            }

            // Prepare items for the select menu
            const selectItems = Object.keys(CATEGORIES).map(key => {
                return {
                    title: CATEGORIES[key].title,
                    key: key,
                    selected: key === _this.currentCategoryKey // Mark the currently active category
                };
            });

            // Show the select menu
            Lampa.Select.show({
                title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('title_category') : 'Category', // Use Lampa Lang for title if available
                items: selectItems,
                onSelect: (item) => {
                    // Handle category selection
                    console.log("HanimeComponent: Category selected:", item.key);
                    if (item.key !== _this.currentCategoryKey) {
                        _this.currentCategoryKey = item.key; // Update current category
                        _this.fetchCatalog(); // Fetch data for the newly selected category
                    }
                    // Close the menu and restore controller
                    if (window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                    if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                },
                onBack: () => {
                    // Handle back press from the menu
                    console.log("HanimeComponent: Category select menu back pressed.");
                    // Restore controller
                    if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                }
            });
        };


        // Show empty state message
        this.empty = function (msg) {
             console.log("HanimeComponent: empty() - Displaying message:", msg);
             // Use Lampa.Empty component if available
             if (window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function') {
                 var empty = new Lampa.Empty({ message: msg });
                 if(html && typeof html.empty === 'function' && typeof html.append === 'function') html.empty().append(empty.render(true));
                 else console.warn("HanimeComponent: Html container not available or its methods missing to show empty state.");

                 // Hide loader and toggle activity state
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();

                 // Replace the component's start method with the empty component's start method
                 // This ensures the controller is set correctly for the empty state
                 this.start = empty.start ? empty.start.bind(empty) : function() {
                      console.log("HanimeComponent: Fallback start() for empty state.");
                      if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                           Lampa.Controller.add('content', { back: this.back });
                           Lampa.Controller.toggle('content');
                      } else console.warn("HanimeComponent: Lampa.Controller not available for fallback start method.");
                 }.bind(this);

                  console.log("HanimeComponent: Displaying empty state via Lampa.Empty.");
             } else {
                  // Fallback to basic text if Lampa.Empty is not available
                  console.warn("HanimeComponent: Lampa.Empty component not available. Using basic text fallback.");
                  if(html && typeof html.empty === 'function' && typeof html.text === 'function') html.empty().text(msg + ' (Компонент Empty недоступен в Lampa)');
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                   // Fallback start method for basic text empty state
                   this.start = function() {
                        console.log("HanimeComponent: Fallback start() for empty state. Setting minimal Controller.");
                       if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                            Lampa.Controller.add('content', { back: this.back });
                            Lampa.Controller.toggle('content');
                       } else console.warn("HanimeComponent: Lampa.Controller not available for fallback start method.");
                   }.bind(this);
             }
        };

        // Create the component - build layout and fetch initial data
        this.create = function () {
            console.log("HanimeComponent: create()");
             // Initialize scroll and network components if not already
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                 scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
                  console.log("HanimeComponent: Lampa.Scroll initialized in create().");
             } else if (!scroll) console.warn("HanimeComponent: Scroll not initialized in create(), Lampa.Scroll missing.");

              if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeComponent: Lampa.Reguest initialized in create().");
              } else if (!network) console.warn("HanimeComponent: Network not initialized in create(), Lampa.Reguest missing.");

            this.buildLayout(); // Build the HTML structure
             if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(true); // Show loader
            this.fetchCatalog(); // Fetch initial data (defaults to 'newset')
             console.log("HanimeComponent: create() finished. Fetching catalog initiated.");
        };

        // Start the component - set up the Lampa Controller
        this.start = function () {
            console.log("HanimeComponent: start()");
            // Check if this activity is the currently active one
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this.activity) {
                console.log("HanimeComponent: start() - Not the currently active activity, skipping.");
                return;
            }
             console.log("HanimeComponent: start() - Activity is active. Setting up Lampa.Controller.");

            // Set up the Lampa Controller for navigation within this component
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && scroll && typeof scroll.render === 'function' && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function') {
                 Lampa.Controller.add('content', {
                     toggle: function () {
                         console.log("HanimeComponent: Controller toggle() called.");
                          // Set the collection of focusable elements (the cards within the scroll)
                          Lampa.Controller.collectionSet(scroll.render());
                         // Set focus to the last focused item or the first one
                         Lampa.Controller.collectionFocus(last || false, scroll.render());
                          console.log("HanimeComponent: Controller collectionSet/Focus called in toggle().");
                     },
                     left: function () {
                         // Navigate left within the scroll or toggle to the menu
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('left')) Navigator.move('left');
                         else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('menu');
                         else console.log("HanimeComponent: Cannot move left, Navigator or menu controller unavailable.");
                     },
                     right: function () {
                         // Navigate right within the scroll
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('right')) Navigator.move('right');
                          else console.log("HanimeComponent: Cannot move right, Navigator unavailable or no more elements.");
                     },
                     up: function () {
                         // On UP, show the category selection menu
                         _this.showCategorySelect();
                         // Lampa.Select handles controller switching; onSelect/onBack will restore 'content'
                     },
                     down: function () {
                         // Navigate down within the scroll (if multiple rows were present)
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('down')) Navigator.move('down');
                          else console.log("HanimeComponent: Cannot move down, Navigator unavailable or no elements below.");
                     },
                     back: this.back // Handle back button press
                 });

                 // Toggle the controller to 'content' to activate navigation
                 Lampa.Controller.toggle('content');
                  console.log("HanimeComponent: Controller 'content' toggled. Initial focus attempt made by Controller.");

             } else {
                console.error("HanimeComponent: Lampa.Controller or scroll, or required methods not available in start(). Cannot setup main Controller.");
                 // Fallback for basic back button handling if full controller setup fails
                 if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                     console.log("HanimeComponent: Attempting to add basic Controller for Back button.");
                     Lampa.Controller.add('content', { back: this.back });
                     Lampa.Controller.toggle('content');
                 } else console.warn("HanimeComponent: Lampa.Controller unavailable or methods missing, cannot add basic back handler.");
             }
        };

        // Pause the component - save the last focused element
        this.pause = function () {
             console.log("HanimeComponent: pause()");
             // Save the currently focused item if the 'content' controller is active
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') {
                 last = Lampa.Controller.item() || last;
                  console.log("HanimeComponent: Activity paused. Saved last focused DOM item:", last);
             } else {
                  console.log("HanimeComponent: Pause called, but content controller not active or Controller.item missing. Last focus not saved.");
             }
        };

        // Stop the component (currently does nothing specific)
        this.stop = function () {
             console.log("HanimeComponent: stop() called.");
        };

        // Render the component's main HTML element
        this.render = function () {
            console.log("HanimeComponent: render() called.");
            if (!html) {
                 this.buildLayout(); // Build layout if not already built
            }
            return html;
        };

        // Destroy the component - clean up resources and DOM elements
        this.destroy = function () {
            console.log("HanimeComponent: destroy() called.");
            // Clear network requests
            if(network && typeof network.clear === 'function') network.clear(); network = null;

            // Destroy card instances
             if (items && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') {
                 Lampa.Arrays.destroy(items); // Use Lampa helper to destroy array of objects
                 console.log("HanimeComponent: Destroyed items array.");
             }
            items = null;

            // Destroy scroll instance
             if (scroll && typeof scroll.destroy === 'function') {
                 scroll.destroy();
                 console.log("HanimeComponent: Destroyed scroll instance.");
             }
             scroll = null;

            // Remove main HTML element from DOM
             if (html && typeof html.remove === 'function') {
                 html.remove();
                 console.log("HanimeComponent: Removed html element from DOM.");
             }
            html = null; itemsContainer = null; last = null; // Nullify DOM references

            // Remove the controller definition
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function') {
                 // Clear the collection if the controller was active
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.collectionSet === 'function') {
                      Lampa.Controller.collectionSet([]);
                       console.log("HanimeComponent: Controller collection set empty.");
                 }
                 Lampa.Controller.remove('content');
                  console.log("HanimeComponent: Controller 'content' removed.");
            } else console.warn("HanimeComponent: Lampa.Controller not available or remove method missing for cleanup in destroy.");

            console.log("HanimeComponent: destroy() finished. All resources released.");
        };

        // Handle back button press - navigate backward in activity stack
        this.back = function () {
             console.log("HanimeComponent: back() called. Attempting Activity.backward().");
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') {
                 Lampa.Activity.backward();
             } else console.warn("HanimeComponent: Lampa.Activity or backward method missing for navigation.");
        };
    }

    // startPlugin function - initializes the plugin
    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() invoked.");

         // Prevent double initialization
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: global plugin_hanime_catalog_ready flag already set. Skipping initialization.");
             return;
         }

        // Function to initialize Lampa dependencies and register components/menu
        function initializeLampaDependencies() {
             console.log("Hanime Plugin: initializeLampaDependencies() called (Lampa appready or fallback delay completed).");

             // Check for critical Lampa components
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Template || typeof Lampa.Template !== 'object' || !Lampa.Component || typeof Lampa.Component !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Scroll || typeof Lampa.Scroll !== 'function' || !Lampa.Reguest || typeof Lampa.Reguest !== 'function' || !Lampa.Select || typeof Lampa.Select !== 'object') { // Added Lampa.Select check
                  console.error("Hanime Plugin: CRITICAL: Required Lampa components (Lampa, Template, Component, Activity, Controller, jQuery, Scroll, Reguest, Select) are not available after waiting for appready. Initialization failed. Please check Lampa version and installation.");
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина: Компоненты Lampa недоступны. Обновите Lampa или плагин.', 15000);
                  }
                  return;
             }
             console.log("Hanime Plugin: All critical Lampa components checked OK. Continuing initialization.");

              // Set the global flag to indicate plugin is ready
              if (!window.plugin_hanime_catalog_ready) {
                 window.plugin_hanime_catalog_ready = true;
                 console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag set.");
              } else {
                   console.warn("Hanime Plugin: Plugin flag was unexpectedly set before initialization. Possible double load issue?");
                   return;
              }

             console.log("Hanime Plugin: Adding standard template fallbacks using Lampa.Template.add...");
             // Add necessary templates if they don't exist (for compatibility)
             if (Lampa.Template && typeof Lampa.Template.add === 'function') {
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
             // Add the custom card template for this plugin
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
                             <div class="card__marker"><span></span></div> <!-- Added marker element -->
                         </div>
                         <div class="card__title">{title}</div>
                         <div class="card__age"></div>
                     </div>
                 `);
                  console.log("Hanime Plugin: HanimeCard template added successfully.");
             } else {
                  console.error("Hanime Plugin: Lampa.Template.add method not available. Cannot add hanime-card template.");
             }

             console.log("Hanime Plugin: Custom CSS block REMOVED as requested. Relying on standard Lampa styles.");

             console.log("Hanime Plugin: Registering HanimeComponent...");
             // Register the main component with Lampa
             if (window.Lampa && Lampa.Component && typeof Lampa.Component.add === 'function') {
                 Lampa.Component.add('hanime_catalog', HanimeComponent);
                 console.log("Hanime Plugin: Component 'hanime_catalog' registered successfully.");
             } else {
                 console.error("Hanime Plugin: Lampa.Component.add method not available. Cannot register component.");
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина: Не удалось зарегистрировать компонент.', 5000);
                  }
             }

             console.log("Hanime Plugin: Calling addMenuItem()...");
             addMenuItem(); // Add the plugin's menu item
              console.log("Hanime Plugin: addMenuItem() called from initializeLampaDependencies.");

              console.log("Hanime Plugin: initializeLampaDependencies() finished.");
        }

        // Add the plugin's menu item to the main Lampa menu
        function addMenuItem() {
             console.log("Hanime Plugin: addMenuItem() called.");

             // Check for required Lampa components and DOM elements
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Component || typeof Lampa.Component.get !== 'function') {
                  console.warn("Hanime Plugin: addMenuItem cannot proceed. Missing Lampa core components, jQuery, or Component.get.");
                  return;
             }
             var menuList = $('.menu .menu__list').eq(0); // Get the main menu list element
             if (!menuList.length) {
                 console.warn("Hanime Plugin: addMenuItem cannot proceed. Lampa menu DOM structure ('.menu .menu__list') not found.");
                 return;
             }

             console.log("Hanime Plugin: addMenuItem checks passed.");

             // Ensure the component is registered before adding the menu item that uses it
             var ourComponentRegistered = Lampa.Component.get('hanime_catalog');
             if (!ourComponentRegistered) {
                 console.warn("Hanime Plugin: addMenuItem skipping - Component 'hanime_catalog' is not found/registered in Lampa.Component.");
                 return;
             }
             console.log("Hanime Plugin: Component 'hanime_catalog' confirmed registered.");

             // Prevent adding the menu item multiple times
             if (menuList.find('.menu__text:contains("Hanime Catalog")').length > 0) {
                 console.log("Hanime Plugin: Menu item with text 'Hanime Catalog' already exists in DOM. Skipping addMenuItem.");
                 return;
             }
             console.log("Hanime Plugin: Adding menu item DOM element to Lampa menu.");

            // Create the menu item HTML element
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

            // Attach event listener for menu item activation
            if (typeof menu_item.on === 'function') {
                menu_item.on('hover:enter', function () {
                     console.log("Hanime Plugin: Menu item 'Hanime Catalog' activated via 'hover:enter'. Pushing activity.");
                     // Push a new activity onto the stack to show the component
                     if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.push === 'function') {
                         Lampa.Activity.push({
                             url: '', // URL is not strictly needed for component activities
                             title: 'Hanime Catalog', // Main activity title
                             component: 'hanime_catalog', // The registered component name
                             page: 1 // Not used by this component, but good practice
                         });
                          console.log("Hanime Plugin: Lampa.Activity.push called.");
                     } else {
                          console.warn("Hanime Plugin: Lampa.Activity or push method unavailable to launch activity.");
                         if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Не удалось запустить активность.');
                     }
                });
                console.log("Hanime Plugin: 'hover:enter' event listener attached to menu item.");
            } else {
                console.warn("Hanime Plugin: jQuery on() method not available for menu item. Cannot attach event listener.");
            }

             // Append the menu item to the menu list
             if (menuList.length > 0) {
                 menuList.append(menu_item);
                 console.log("Hanime Plugin: Menu item DOM element successfully added to Lampa menu list.");
             } else {
                 console.error("Hanime Plugin: addMenuItem failed during append: Lampa menu list DOM element ('.menu .menu__list') not found anymore.");
             }
             console.log("Hanime Plugin: addMenuItem finished.");
        }

        console.log("Hanime Plugin: startPlugin() invoked. Setting up Lampa ready listener.");

         // Check the global flag again in case of unexpected execution flow
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag is ALREADY SET upon initial execution. Skipping entire startPlugin execution to prevent double init.");
             return;
         }

         // Wait for Lampa's 'app:ready' event before initializing the plugin
         // Use Lampa.Listener if available, otherwise check window.appready or use a timeout as fallback
         if (window.Lampa && typeof window.Lampa !== 'object' || !Lampa.Listener || typeof Lampa.Listener !== 'object' || typeof Lampa.Listener.follow !== 'function') {
              console.warn("Hanime Plugin: Lampa or Lampa.Listener not available or methods missing. Checking appready flag directly or scheduling delayed start as fallback.");

              if (window.appready && typeof window.appready === 'boolean' && window.appready) {
                  console.log("Hanime Plugin: Lampa 'appready' flag found. Calling initializeLampaDependencies directly as fallback.");
                  initializeLampaDependencies();
              } else {
                   console.error("Hanime Plugin: Neither Lampa Listener nor 'appready' flag available immediately. Cannot reliably wait. Attempting delayed initialization as a HIGHLY UNRELIABLE fallback.");
                  setTimeout(initializeLampaDependencies, 500); // Fallback delay
                  console.log("Hanime Plugin: Delayed initialization fallback scheduled.");
              }

         } else {
             console.log("Hanime Plugin: Lampa Listener available. Subscribing to 'app:ready' event.");
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

    // Execute the startPlugin function
    startPlugin();

})();
