(function () {
    'use strict';

    /**
     * Base URL for the Hanime Stremio Addon API.
     */
    const API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";

    /**
     * Defined categories with their relative URLs and titles.
     */
    const CATEGORIES = {
        newset: { url: "/catalog/movie/newset.json", title: "Последние добавленные" },
        recent: { url: "/catalog/movie/recent.json", title: "Недавние аниме" },
        mostlikes: { url: "/catalog/movie/mostlikes.json", title: "Самые понравившиеся" },
        mostviews: { url: "/catalog/movie/mostviews.json", title: "Самые просматриваемые" }
    };

    /**
     * Optional Proxy URL for specific streams (e.g., highwinds-cdn.com).
     */
    const PROXY_BASE_URL = "http://77.91.78.5:3000";

    /**
     * HanimeCard component for displaying individual items.
     * Reuses Lampa's card structure and adds details/icons.
     * @param {object} data - The item data (meta) from the API.
     * @param {object} componentRef - Reference to the parent HanimeComponent instance.
     */
    function HanimeCard(data, componentRef) {
        // Process data from the API to a more consistent format
        var processedData = {
            id: data.id,
            title: data.name || data.title || 'Без названия',
            poster_path: data.poster || data.img,
            vote_average: data.vote_average || data.vote || null,
            quality: data.quality || data.release_quality || null,
            release_year: ((data.year || data.release_date || '') + '').slice(0, 4), // Extract year from date string
            type: data.first_air_date ? 'tv' : 'movie', // Simple type detection
            original_name: data.original_name
        };

        // Get the card template from Lampa
        var cardTemplate = Lampa.Template.get('hanime-card', {
            img: processedData.poster_path,
            title: processedData.title
        });

        var cardElement = $(cardTemplate); // Convert template string to jQuery object

        /**
         * Adds a status icon to the card.
         * @param {string} name - The class name suffix for the icon (e.g., 'book').
         */
        this.addicon = function(name) {
            var iconsContainer = cardElement.find('.card__icons-inner');
            if (iconsContainer.length) {
                var icon = document.createElement('div');
                icon.classList.add('card__icon');
                icon.classList.add('icon--'+name);
                iconsContainer.append(icon);
                 //console.log("HanimeCard:", processedData.title, "- Added icon:", name);
            } else {
                //console.warn("HanimeCard:", processedData.title, "- Could not find .card__icons-inner to add icon:", name);
            }
        }

        /**
         * Adds or updates detailed information like vote, quality, type, and year on the card.
         */
        this.addDetails = function() {
             var viewElement = cardElement.find('.card__view');
             if (!viewElement.length) {
                  console.warn("HanimeCard:", processedData.title, "- Cannot find .card__view to add details.");
                  return;
             }

             // Add/Update Vote Average
             let voteElement = cardElement.find('.card__vote');
             if (processedData.vote_average > 0) {
                 if (!voteElement.length) {
                     voteElement = $('<div class="card__vote"></div>');
                     viewElement.append(voteElement);
                 }
                 voteElement.text(parseFloat(processedData.vote_average).toFixed(1)).show();
             } else {
                 if(voteElement.length) voteElement.hide();
             }

            // Add/Update Quality
             let qualityElement = cardElement.find('.card__quality');
            if (processedData.quality) {
                 if (!qualityElement.length) {
                     qualityElement = $('<div class="card__quality"><div></div></div>');
                     viewElement.append(qualityElement);
                 }
                 qualityElement.find('div').text(processedData.quality).parent().show(); // Show parent div
            } else {
                 if(qualityElement.length) qualityElement.hide();
            }

             // Add/Update Type
             let typeElement = cardElement.find('.card__type');
             if (processedData.type) {
                  if (!typeElement.length) {
                     typeElement = $('<div class="card__type"></div>');
                      viewElement.append(typeElement);
                  }
                  typeElement.text(processedData.type.toUpperCase()).show();
             } else {
                 if(typeElement.length) typeElement.hide();
             }

             // Add/Update Release Year
             let ageElement = cardElement.find('.card__age');
             const releaseYear = processedData.release_year !== '0000' && processedData.release_year ? processedData.release_year : '';
             if (ageElement.length) {
                  if (releaseYear) {
                      ageElement.text(releaseYear).show();
                  } else {
                       ageElement.text('').hide();
                  }
             } else {
                 if (releaseYear) {
                     // This fallback shouldn't be needed if template is correct, but kept for safety
                     let newAgeElement = $('<div class="card__age"></div>').text(releaseYear);
                      let titleElement = cardElement.find('.card__title');
                      if (titleElement.length) {
                          titleElement.after(newAgeElement);
                          console.warn("HanimeCard:", processedData.title, "Created .card__age element dynamically after .card__title.");
                      } else {
                          cardElement.append(newAgeElement);
                          console.error("HanimeCard:", processedData.title, "Cannot find .card__title to place .card__age dynamically.");
                      }
                 }
             }
             //console.log("HanimeCard:", processedData.title, "- Details added/updated.");
        }

        /**
         * Updates the favorite/history/status icons and markers based on Lampa's state.
         */
        this.updateFavoriteIcons = function() {
            // Clear existing icons and marker
            cardElement.find('.card__icons-inner').empty();
            cardElement.find('.card__marker').remove();

             // Check status using Lampa's Favorite component
             var status = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(processedData) : {};
             //if(Object.keys(status).length === 0 && window.Lampa && Lampa.Favorite) console.warn("HanimeCard:", processedData.title, "- Lampa.Favorite.check returned empty status.");

            // Add icons based on status
            if (status.book) this.addicon('book');
            if (status.like) this.addicon('like');
            if (status.wath) this.addicon('wath');
             // Check history using Favorite or Timeline (Timeline is preferred for watched status)
            if (status.history || (window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched === 'function' && Lampa.Timeline.watched(processedData))) {
                 this.addicon('history');
             } else {
                 // If not in history, check progress percentage for 'history' icon
                 if(window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.get === 'function') {
                     const progress = Lampa.Timeline.get(processedData);
                     if (progress && progress.percent && progress.percent > 5) { // Show history icon if watched > 5%
                          this.addicon('history');
                     }
                 }
             }


             // Add marker for specific statuses (look, viewed, scheduled, continued, thrown)
             var marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];
             var activeMarker = marks.find(m => status[m]);

             if (activeMarker) {
                 var markerElement = cardElement.find('.card__marker');
                 if (!markerElement.length) {
                     markerElement = $('<div class="card__marker"><span></span></div>');
                      var viewElement = cardElement.find('.card__view');
                      if(viewElement.length) viewElement.append(markerElement);
                      else console.warn("HanimeCard:", processedData.title, "- Cannot find .card__view to add marker.");
                 }
                 const markerText = window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? Lampa.Lang.translate('title_' + activeMarker) : activeMarker;
                 markerElement.find('span').text(markerText);

                 // Remove all marker classes and add the active one
                 markerElement.removeClass(marks.map(m => 'card__marker--' + m).join(' '))
                             .addClass('card__marker--' + activeMarker)
                             .show();
             } else {
                 cardElement.find('.card__marker').hide();
             }
            //console.log("HanimeCard:", processedData.title, "- Favorite icons updated. Status:", status);
        };

        /**
         * Called when the card becomes visible in the scrollable area.
         * Loads the image and updates icons.
         */
        this.onVisible = function() {
             var imgElement = cardElement.find('.card__img');

             if (imgElement.length && (!imgElement.attr('src') || imgElement.attr('src').includes('img_load.svg'))) {
                 var src = processedData.poster_path;

                 if(window.Lampa && Lampa.ImageCache && typeof Lampa.ImageCache.read === 'function' && typeof Lampa.ImageCache.write === 'function') {
                      // Use Lampa's image cache
                      if(!Lampa.ImageCache.read(imgElement[0], src)) {
                          imgElement[0].onload = () => {
                              cardElement.addClass('card--loaded');
                              Lampa.ImageCache.write(imgElement[0], imgElement[0].src);
                              //console.log("HanimeCard:", processedData.title, "- Image loaded (cached):", src);
                          };
                          imgElement[0].onerror = () => {
                               console.error('Hanime Plugin: Image load error (cached):', src);
                               imgElement.attr('src', './img/img_broken.svg');
                               if(window.Lampa && Lampa.Tmdb && typeof Lampa.Tmdb.broken === 'function') Lampa.Tmdb.broken();
                          };
                          imgElement.attr('src', src || './img/img_broken.svg');
                      } else {
                         cardElement.addClass('card--loaded');
                         //console.log("HanimeCard:", processedData.title, "- Image loaded (cache hit):", src);
                      }
                 } else {
                     // Fallback to basic image loading if cache is not available
                     //console.warn("Hanime Plugin: Lampa.ImageCache not available. Using basic image loading.");
                      imgElement[0].onload = () => { cardElement.addClass('card--loaded'); /*console.log("HanimeCard: Image loaded (basic):", src);*/ };
                     imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error (basic):', src); imgElement.attr('src', './img/img_broken.svg'); };
                     imgElement.attr('src', src || './img/img_broken.svg');
                 }
             } //else { console.log("HanimeCard:", processedData.title, "- Image already loaded or no img element."); }

            this.updateFavoriteIcons();
            // Update watched status using Lampa's Timeline if available (might be redundant with updateFavoriteIcons, depends on Lampa version)
            // if(window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched_status === 'function') Lampa.Timeline.watched_status(cardElement, processedData);
        }

        /**
         * Sets up event listeners for the card and performs initial updates.
         */
        this.create = function(){
             if (cardElement.data('created')) {
                 //console.log("HanimeCard:", processedData.title, "- Already created.");
                 return;
             }

             if (typeof cardElement.on === 'function') {
                cardElement.on('hover:focus', function () {
                     //console.log("HanimeCard:", processedData.title, "- Focused.");
                     if (componentRef && componentRef.updateScrollToFocus && typeof componentRef.updateScrollToFocus === 'function') {
                          componentRef.updateScrollToFocus(cardElement); // Notify parent component to adjust scroll
                     }
                     this.update(); // Update icons/status on focus
                }.bind(this));

                 cardElement.on('hover:enter', function () {
                      //console.log("HanimeCard:", processedData.title, "- Enter pressed.");
                     if (componentRef && componentRef.onCardClick && typeof componentRef.onCardClick === 'function') {
                         componentRef.onCardClick(processedData); // Notify parent component of click
                     }
                }.bind(this));

                cardElement.on('hover:long', function(){
                     //console.log("HanimeCard:", processedData.title, "- Long press detected.");
                     if (componentRef && componentRef.showCardContextMenu && typeof componentRef.showCardContextMenu === 'function') {
                          componentRef.showCardContextMenu(cardElement, processedData); // Show context menu
                     }
                 }.bind(this));
                 //console.log("HanimeCard:", processedData.title, "- Event listeners attached.");
             } else {
                 console.warn("HanimeCard:", processedData.title, "- jQuery on() method not available to attach hover events.");
             }

             this.card = cardElement[0]; // Get the native DOM element
             if (this.card && typeof this.card.addEventListener === 'function') {
                // Attach the 'visible' event listener for lazy loading/updates
                this.card.addEventListener('visible', this.onVisible.bind(this));
                 //console.log("HanimeCard:", processedData.title, "- 'visible' event listener attached.");
             } else {
                 console.warn("HanimeCard:", processedData.title, "- Cannot attach 'visible' event listener, native element or addEventListener not available.");
             }

             // Perform initial updates (details, icons) after a slight delay to ensure DOM is ready
             setTimeout(() => {
                  this.addDetails();
                  this.update();
             }, 0);

             cardElement.data('created', true); // Mark as created
             //console.log("HanimeCard:", processedData.title, "- Created successfully.");
        }

        /**
         * Updates dynamic aspects of the card (currently just icons).
         */
        this.update = function(){
            //console.log("HanimeCard:", processedData.title, "- update() called.");
            this.updateFavoriteIcons();
            // if(window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched_status === 'function') Lampa.Timeline.watched_status(cardElement, processedData);
             // else console.warn("HanimeCard:", processedData.title, "- Cannot update watched status, Lampa.Timeline not available or method missing.");
        }

        /**
         * Returns the rendered card element. Creates it if not already created.
         * @param {boolean} js - If true, returns the native DOM element; otherwise, returns the jQuery object.
         * @returns {HTMLElement|jQuery} The card element.
         */
        this.render = function(js){
             if (!cardElement.data('created')) {
                 this.create();
             }
            return js ? cardElement[0] : cardElement;
        }

        /**
         * Cleans up card resources.
         */
        this.destroy = function(){
             //console.log("HanimeCard:", processedData.title, "- destroy() called.");
             if(this.card && typeof this.card.removeEventListener === 'function' && this.onVisible) this.card.removeEventListener('visible', this.onVisible.bind(this));
             if(cardElement && typeof cardElement.remove === 'function') cardElement.remove();
             // Nullify references to aid garbage collection
             processedData = null; cardElement = null; this.card = null; componentRef = null; this.onVisible = null; this.create = null; this.update = null; this.render = null; this.destroy = null; this.addicon = null; this.addDetails = null; this.updateFavoriteIcons = null;
             //console.log("HanimeCard: Destroyed.");
        }
    }

    /**
     * Main HanimeComponent for displaying a catalog of items.
     * Manages fetching data, building the UI, and handling user interaction.
     * @param {object} componentObject - Object passed during Activity.push, contains category info.
     */
    function HanimeComponent(componentObject) {
        var network = null; // Lampa.Reguest instance
        var scroll = null; // Lampa.Scroll instance

        var items = []; // Array of HanimeCard instances
        var html = null; // The main component HTML element (jQuery)
        var itemsContainer = null; // Container for the cards (jQuery)

        var active = 0; // Index of the currently focused item (managed by Lampa.Controller)
        var last = null; // Last focused DOM element

        // Get category information from componentObject, default to 'newset'
        this.categoryKey = componentObject.category_key || 'newset';
        const defaultCategory = CATEGORIES[this.categoryKey] || CATEGORIES['newset'];
        this.catalogUrl = componentObject.catalog_url || (API_BASE_URL + defaultCategory.url);
        this.categoryTitle = componentObject.category_title || defaultCategory.title;

        // Keep a reference to the activity instance
         this.activity = componentObject.activity; // Lampa injects activity here

        console.log("HanimeComponent: Initialized for category:", this.categoryKey, "URL:", this.catalogUrl);


        /**
         * Builds the main HTML structure for the component.
         */
        this.buildLayout = function() {
            console.log("HanimeComponent: buildLayout() - Building layout for title:", this.categoryTitle);
            html = $(`
                <div class="items-line layer--visible layer--render items-line--type-cards">
                    <div class="items-line__head">
                        <div class="items-line__title">${this.categoryTitle}</div>
                    </div>
                    <div class="items-line__body">
                        <!-- Scrollable items will be added here -->
                    </div>
                </div>
            `);

             itemsContainer = $('<div class="items-cards"></div>'); // Container where cards will be appended
             console.log("HanimeComponent: Layout structure created.");
        };

        /**
         * Fetches the catalog data from the API based on the selected category.
         */
        this.fetchCatalog = function () {
            var _this = this; // Store reference for callbacks

             // Show loader if activity loader is available
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeComponent: Activity loader not available in fetchCatalog.");

             console.log("HanimeComponent: fetchCatalog() - Starting request to", _this.catalogUrl);

             // Initialize network if not already done
             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeComponent: Lampa.Reguest initialized.");
             }

             // Clear any previous requests
             if (network && typeof network.clear === 'function') network.clear();
             else console.warn("HanimeComponent: Network clear method not available.");

             // Perform the network request
             if(network && _this.catalogUrl && typeof network.native === 'function'){
                network.native(_this.catalogUrl,
                    // Success callback
                    function (data) {
                        console.log("HanimeComponent: fetchCatalog() - Data received:", data);
                        if (data && data.metas && Array.isArray(data.metas)) {
                             if (data.metas.length > 0) {
                                _this.build(data.metas); // Build UI with received data
                             } else {
                                _this.empty("Каталог пуст."); // Show empty message if no items
                             }
                        } else {
                            _this.empty("Неверный формат данных от API."); // Show error message for invalid data
                            console.error("HanimeComponent: Invalid data format from API.", data);
                        }
                    },
                    // Error callback
                    function (errorStatus, errorText) {
                        _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus); // Show error message
                        console.error("HanimeComponent: Failed to load catalog.", errorStatus, errorText);
                    },
                    false, // No headers
                    { dataType: 'json', timeout: 15000 } // JSON response expected, 15s timeout
                );
             } else {
                 console.error("HanimeComponent: Cannot fetch catalog. Network component or _this.catalogUrl missing.");
                  _this.empty("Не удалось загрузить каталог. Ошибка инициализации сети."); // Show error message
             }
        };

        /**
         * Builds the UI (cards) from the fetched data.
         * @param {Array<object>} result - Array of item meta data.
         */
        this.build = function (result) {
            var _this = this;
             console.log("HanimeComponent: build() - Building UI with", result.length, "items.");

             // Initialize Scroll component if not already done
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                  scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
                  console.log("HanimeComponent: Lampa.Scroll initialized (horizontal).");
             }

             // Reset scroll position
             if(scroll && typeof scroll.minus === 'function') scroll.minus();
             else console.warn("HanimeComponent: Scroll or scroll.minus method not available in build(). Cannot scroll to beginning.");

             // Check if required DOM/Lampa components are available
             if (!(itemsContainer && typeof itemsContainer.empty === 'function' && scroll && html && typeof html.find === 'function' && typeof html.append === 'function' && typeof scroll.append === 'function' && typeof scroll.render === 'function' && window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function')) {
                  console.error("HanimeComponent: Missing critical DOM/Lampa dependencies in build(). Aborting UI build.");
                   if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                  _this.empty("Не удалось построить интерфейс.");
                  return;
             }

            // Clear previous items and data
            itemsContainer.empty();
            items = [];

            // Create and append cards for each item in the result
            result.forEach(function (meta) {
                // Filter out items without id or poster path
                if (!meta || !meta.id || (!meta.poster && !meta.img)) {
                    //console.warn("HanimeComponent: Skipping item due to missing id or poster:", meta);
                    return;
                }
                var card = new HanimeCard(meta, _this); // Create a new HanimeCard instance
                var cardElement = card.render(); // Render the card DOM element

                 itemsContainer.append(cardElement); // Add card to the container
                items.push(card); // Store the HanimeCard instance
            });
             console.log("HanimeComponent: Created and added", items.length, "cards to itemsContainer.");

            // Append the container to the scroll component
            scroll.append(itemsContainer);

            // Replace the body content with the scrollable list
            html.find('.items-line__body').empty().append(scroll.render(true));

            // Hide loader and toggle activity focus
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
             if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle(); // Give focus to the component's content
             console.log("HanimeComponent: Build process completed and activity toggled.");
        };

        /**
         * Handles a card click event. Fetches stream and meta details for the clicked item.
         * @param {object} cardData - The processed data for the clicked card.
         */
         this.onCardClick = function(cardData) {
             console.log("HanimeComponent: Card clicked:", cardData.title, "ID:", cardData.id);
            this.fetchStreamAndMeta(cardData.id, cardData); // Fetch streaming info using the item ID
         }

        /**
         * Shows a context menu for a card (e.g., for adding to favorites).
         * @param {jQuery} cardElement - The jQuery object for the card element.
         * @param {object} cardData - The processed data for the card.
         */
         this.showCardContextMenu = function(cardElement, cardData) {
             console.log("HanimeComponent: showCardContextMenu for", cardData.title, "ID:", cardData.id);
             var _this = this;

             // Get the name of the currently enabled controller to restore it later
             var enabledControllerName = (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;

             // Get current favorite status
             var status = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(cardData) : {};

             // Define menu items for favorites/status
             var menu_favorite = [];
             if(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') {
                 // Use Lampa's translation for menu titles
                 menu_favorite = [
                     { title: Lampa.Lang.translate('title_book'), where: 'book', checkbox: true, checked: status.book, collect:true },
                     { title: Lampa.Lang.translate('title_like'), where: 'like', checkbox: true, checked: status.like, collect:true },
                     { title: Lampa.Lang.translate('title_wath'), where: 'wath', checkbox: true, checked: status.wath, collect:true },
                     { title: Lampa.Lang.translate('menu_history'), where: 'history', checkbox: true, checked: status.history, collect:true },
                     { title: Lampa.Lang.translate('settings_cub_status'), separator: true } // Separator for status marks
                 ];
                  // Add status marks (look, viewed, scheduled, continued, thrown)
                  const marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];
                  marks.forEach(mark => {
                       menu_favorite.push({
                            title: Lampa.Lang.translate('title_' + mark),
                            where: mark,
                            selected: status[mark], // Use 'selected' for radio-like behavior in Select component
                            collect: true,
                            radio: true // Indicate this is a radio button group
                       });
                  });

             } else {
                 // Fallback to English titles if Lampa.Lang is not available
                 console.warn("HanimeComponent: Lampa.Lang not available, using English for menu items.");
                 menu_favorite = [
                      { title: 'Planned', where: 'book', checkbox: true, checked: status.book, collect:true },
                     { title: 'Liked', where: 'like', checkbox: true, checked: status.like, collect:true },
                     { title: 'Watching', where: 'wath', checkbox: true, checked: status.wath, collect:true },
                     { title: 'History', where: 'history', checkbox: true, checked: status.history, collect:true },
                     { title: 'Status', separator: true }
                 ];
                  const marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];
                   marks.forEach(mark => {
                       menu_favorite.push({ title: mark, where: mark, selected: status[mark], collect: true, radio: true });
                   });
             }

             // Show the select menu
             if (window.Lampa && Lampa.Select && typeof Lampa.Select.show === 'function') {
                 Lampa.Select.show({
                     title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('title_action') : 'Action',
                     items: menu_favorite,
                     onBack: ()=>{
                         // Restore the previous controller when the menu is closed by 'back'
                         if (window.Lampa && Lampa.Controller && enabledControllerName) Lampa.Controller.toggle(enabledControllerName);
                          console.log("HanimeComponent: Context menu back button pressed. Restored controller:", enabledControllerName);
                     },
                     onSelect: (a)=>{
                          console.log("HanimeComponent: Context menu - item selected:", a.where);
                          // Handle both checkbox and radio button selections
                          if(a.collect && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function'){
                              // Use toggle for both checkbox and radio; Lampa handles the logic for radio groups
                              Lampa.Favorite.toggle(a.where, cardData);
                               // Find the card instance and update its icons/marker
                               var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                              if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                               else console.warn("HanimeComponent: Failed to find Card object to update icons after onSelect.");
                          }

                          // Close the select menu and restore controller if it's not a checkbox (checkboxes stay open)
                           if (!a.checkbox) {
                                if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                                if (window.Lampa && Lampa.Controller && enabledControllerName) Lampa.Controller.toggle(enabledControllerName);
                                console.log("HanimeComponent: Context menu selected non-checkbox item and closed.");
                           } else {
                                // For checkboxes, just update the card visuals immediately
                                var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                                if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                                else console.warn("HanimeComponent: Failed to find Card object to update icons after onCheck (Select component checkbox).");
                                // Select component handles keeping itself open for checkboxes
                           }
                     },
                      onDraw: (itemElement, itemData) => {
                           // Custom draw logic for premium items (e.g., watch status requires premium)
                           // The 'collect' items might require premium based on Lampa settings
                           if (itemData.collect && window.Lampa && Lampa.Account && typeof Lampa.Account.hasPremium === 'function' && !Lampa.Account.hasPremium()) {
                                let lockIconTemplate = (window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.has('icon_lock')) ? Lampa.Template.get('icon_lock') : null;
                                if (lockIconTemplate && window.$ && typeof itemElement.find === 'function' && typeof itemElement.append === 'function') {
                                     let wrap = $('<div class="selectbox-item__lock"></div>');
                                     wrap.append($(lockIconTemplate));
                                     // Remove the checkbox or radio button
                                     itemElement.find('.selectbox-item__checkbox, .selectbox-item__radio').remove();
                                     itemElement.append(wrap);

                                     // Change the click behavior to show premium info
                                     itemElement.off('hover:enter').on('hover:enter', () => {
                                         if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                                          if (window.Lampa && Lampa.Account && typeof Lampa.Account.showCubPremium === 'function') Lampa.Account.showCubPremium();
                                     });
                                } else {
                                     console.warn("Hanime Component: icon_lock template or Template/jQuery/methods missing for Premium item draw.");
                                }
                           }
                      }
                 });
                 console.log("HanimeComponent: Lampa.Select menu shown.");
             } else {
                 console.warn("Hanime Component: Lampa.Select component not available to show context menu.");
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Компонент меню недоступен.', 5000);
                 }
             }
         };

        /**
         * Tells the scroll component to adjust its position to keep the focused element visible.
         * @param {jQuery} element - The focused DOM element wrapped in jQuery.
         */
        this.updateScrollToFocus = function(element) {
             if (scroll && typeof scroll.update === 'function' && element && element.length > 0) {
                last = element[0]; // Store the native DOM element
                scroll.update(element, true); // Update scroll with animation
                 //console.log("HanimeComponent: Scroll updated to focus element.");
            } else {
                console.warn("HanimeComponent: Scroll instance or update method, or valid element missing to scroll.");
            }
        }

        /**
         * Fetches stream URLs and potentially full meta data for a specific item, then launches the player.
         * @param {string} id - The ID of the item.
         * @param {object} [meta] - Initial meta data available (e.g., from catalog), used if full meta fetch fails.
         */
        this.fetchStreamAndMeta = function (id, meta) {
             var _this = this;
            var streamUrl = `${API_BASE_URL}/stream/movie/${id}.json`;
            var metaUrl = `${API_BASE_URL}/meta/movie/${id}.json`;

             // Show loader
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeComponent: Activity loader not available in fetchStreamAndMeta.");

            console.log("HanimeComponent: fetchStreamAndMeta for ID:", id);

            // Ensure network component is available
            if (!network || typeof network.native !== 'function') {
                console.error("HanimeComponent: Network component or its native method not available.");
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Сетевой компонент недоступен для загрузки потока.', 5000);
                return;
            }

            // Use Promises to fetch stream and meta data concurrently
            Promise.all([
                // Fetch stream data
                new Promise((resolve, reject) => {
                    if(streamUrl && network) {
                        console.log("HanimeComponent: Fetching stream data from:", streamUrl);
                        network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                    } else reject('Stream URL or Network unavailable');
                }),
                // Fetch full meta data (if not already provided)
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                     if(metaUrl && network) {
                         console.log("HanimeComponent: Fetching full meta data from:", metaUrl);
                         network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                     } else reject('Meta URL or Network unavailable');
                 })
            ]).then(([streamData, metaDataResponse]) => {
                 // Hide loader on success
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);

                const fullMetaData = metaDataResponse ? (metaDataResponse.meta || metaDataResponse) : null;
                console.log("HanimeComponent: Stream data received:", streamData);
                console.log("HanimeComponent: Full Meta Data received:", fullMetaData);

                // Check if streams are available
                if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                    // Use the first stream found (assuming it's the main one)
                    var streamToPlay = streamData.streams[0];
                    var finalStreamUrl = streamToPlay ? streamToPlay.url : null;

                    // Apply proxy if configured and the stream URL matches
                    if(finalStreamUrl && PROXY_BASE_URL) {
                         try {
                             var url = new URL(finalStreamUrl);
                             // Example condition: proxy highwinds-cdn.com URLs
                             if (url.hostname && url.hostname.includes('highwinds-cdn.com')) {
                                 finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                                 console.log("HanimeComponent: Stream URL proxied:", finalStreamUrl);
                             } else {
                                console.log("HanimeComponent: Stream URL does not require proxy:", finalStreamUrl);
                             }
                         } catch (e) {
                            console.error("HanimeComponent: Failed to parse or proxy stream URL:", e);
                             console.log("HanimeComponent: Using original stream URL due to error:", finalStreamUrl);
                         }
                    }

                    // Prepare data for the Lampa player
                    var playerObject = {
                        title: fullMetaData ? (fullMetaData.name || fullMetaData.title || 'Без названия') : (meta ? (meta.name || meta.title || 'Без названия') : 'Без названия'), // Use full meta title if available, fallback to initial meta or default
                        url: finalStreamUrl,
                        poster: fullMetaData ? (fullMetaData.poster || fullMetaData.background || '') : (meta ? (meta.poster || meta.img || '') : ''), // Use full meta poster if available, fallback to initial meta or empty
                        // Potentially add subtitles here if API provides them and Lampa Player supports the format
                        // subtitles: fullMetaData ? fullMetaData.subtitles : undefined, // Example
                    };

                    // Launch the player if URL is valid and Lampa.Player is available
                    if (playerObject.url && window.Lampa && Lampa.Player && typeof Lampa.Player.play === 'function' && typeof Lampa.Player.playlist === 'function') {
                         console.log("HanimeComponent: Launching player with URL:", playerObject.url);
                         Lampa.Player.play(playerObject);
                         Lampa.Player.playlist([playerObject]); // Add to playlist (usually for single items this is just the item itself)

                         // Add item to history (if full meta data is available and Lampa.Favorite exists)
                         if (fullMetaData && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                                // Create a simplified meta object for history
                                const historyMeta = {
                                    id: fullMetaData.id || '',
                                    title: fullMetaData.name || fullMetaData.title || '',
                                    poster: fullMetaData.poster || fullMetaData.background || '',
                                    runtime: fullMetaData.runtime, // Keep relevant details
                                    year: fullMetaData.year,
                                    original_name: fullMetaData.original_name || ''
                                    // Add other relevant fields from meta if needed for history/favorite display
                                };
                                Lampa.Favorite.add('history', historyMeta); // No need for 100% mark, Lampa handles progress
                                console.log("HanimeComponent: Added to history:", historyMeta.title);
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
                     console.warn("HanimeComponent: No streams found in API data or invalid structure for ID:", id);
                     if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                         Lampa.Noty.show('Потоки не найдены для этого аниме.', 5000);
                     }
                }

            }).catch(error => {
                // Hide loader on error
                if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                console.error("HanimeComponent: Error fetching stream/meta details for ID:", id, error);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'), 5000);
                 }
            });
        };

        /**
         * Displays an empty state message.
         * @param {string} msg - The message to display.
         */
        this.empty = function (msg) {
             console.log("HanimeComponent: empty() - Displaying message:", msg);
             // Use Lampa.Empty component if available
             if (window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function') {
                 var empty = new Lampa.Empty({ message: msg });
                 if(html && typeof html.empty === 'function' && typeof html.append === 'function') html.empty().append(empty.render(true));
                 else console.warn("HanimeComponent: Html container not available or its methods missing to show empty state.");

                 // Hide loader and toggle activity
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();

                 // Replace the 'start' method with the empty component's start method
                 if (typeof empty.start === 'function') this.start = empty.start.bind(empty); // Bind to empty instance
                 else console.warn("HanimeComponent: Empty component does not have a start method.");

                  console.log("HanimeComponent: Displaying empty state via Lampa.Empty.");
             } else {
                  // Fallback to basic text if Lampa.Empty is not available
                  console.warn("HanimeComponent: Lampa.Empty component not available. Using basic text fallback.");
                  if(html && typeof html.empty === 'function' && typeof html.text === 'function') html.empty().text(msg + ' (Компонент Empty недоступен в Lampa)');
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                   // Provide a fallback start method that just sets the controller back button
                   this.start = function() {
                        console.log("HanimeComponent: Fallback start() for empty state. Setting minimal Controller.");
                       if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                            Lampa.Controller.add('content', { back: this.back.bind(this) }); // Bind back method
                            Lampa.Controller.toggle('content');
                       } else console.warn("HanimeComponent: Lampa.Controller not available for fallback start method.");
                   }.bind(this);
             }
        };

        /**
         * Creates the component's initial structure and fetches data.
         * Called once when the activity starts.
         */
        this.create = function () {
            console.log("HanimeComponent: create()");
             // Initialize scroll and network components if not already done (redundant if done in startPlugin, but safe)
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                 scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
                  console.log("HanimeComponent: Lampa.Scroll initialized in create().");
             } else if (!scroll) console.warn("HanimeComponent: Scroll not initialized in create(), Lampa.Scroll missing.");

              if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeComponent: Lampa.Reguest initialized in create().");
              } else if (!network) console.warn("HanimeComponent: Network not initialized in create(), Lampa.Reguest missing.");

            this.buildLayout(); // Create the basic HTML structure
             // Show loader before fetching data
             if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(true);
            this.fetchCatalog(); // Start fetching data
             console.log("HanimeComponent: create() finished. Fetching catalog initiated.");
        };

        /**
         * Starts the component's interaction logic, typically setting up the Lampa Controller.
         * Called when the activity gains focus.
         */
        this.start = function () {
            console.log("HanimeComponent: start()");
            // Check if this activity is the currently active one
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this.activity) {
                console.log("HanimeComponent: start() - Not the currently active activity, skipping controller setup.");
                return;
            }
             console.log("HanimeComponent: start() - Activity is active. Setting up Lampa.Controller.");

            // Setup Lampa Controller for navigation within the component
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && scroll && typeof scroll.render === 'function' && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function') {
                 Lampa.Controller.add('content', {
                     toggle: function () {
                         // Set the collection of focusable elements for the controller
                         Lampa.Controller.collectionSet(scroll.render());
                         // Set focus to the last focused element or the first one
                         Lampa.Controller.collectionFocus(last || false, scroll.render());
                          console.log("HanimeComponent: Controller toggle() called. Collection set.");
                     },
                     left: function () {
                         // Attempt to move focus left using Lampa's Navigator
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('left')) {
                              Navigator.move('left');
                         }
                         // If cannot move left within the component, try to toggle to the menu
                         else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                              Lampa.Controller.toggle('menu');
                         } else {
                              console.log("HanimeComponent: Cannot move left, Navigator unavailable or no element left, and menu controller unavailable.");
                         }
                     },
                     right: function () {
                         // Attempt to move focus right using Lampa's Navigator
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('right')) {
                             Navigator.move('right');
                          } else {
                             console.log("HanimeComponent: Cannot move right, Navigator unavailable or no element right.");
                          }
                     },
                     up: function () {
                         // Attempt to move focus up to the header
                         if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                              Lampa.Controller.toggle('head');
                         } else {
                              console.log("HanimeComponent: Head controller unavailable for UP.");
                         }
                     },
                     down: function () {
                         // Attempt to move focus down using Lampa's Navigator
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('down')) {
                             Navigator.move('down');
                          } else {
                              console.log("HanimeComponent: Cannot move down, Navigator unavailable or no element down.");
                          }
                     },
                     back: this.back.bind(this) // Bind the component's back method
                 });

                 // Toggle the controller to enable navigation within this component
                 Lampa.Controller.toggle('content');
                  console.log("HanimeComponent: Controller 'content' toggled.");

             } else {
                console.error("HanimeComponent: Lampa.Controller or scroll, or required methods not available in start(). Cannot setup main Controller.");
                 // Fallback for basic back button handling if full controller setup fails
                 if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                     console.log("HanimeComponent: Attempting to add basic Controller for Back button.");
                     Lampa.Controller.add('content', { back: this.back.bind(this) });
                     Lampa.Controller.toggle('content');
                 } else console.warn("HanimeComponent: Lampa.Controller unavailable or methods missing, cannot add basic back handler.");
             }
        };

        /**
         * Pauses the component's interaction logic, typically saving the last focused element.
         * Called when the activity loses focus.
         */
        this.pause = function () {
             console.log("HanimeComponent: pause()");
             // Save the currently focused item if the 'content' controller is active
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') {
                 last = Lampa.Controller.item() || last; // Save current item, fallback to previously saved if none focused
                  console.log("HanimeComponent: Activity paused. Saved last focused DOM item:", last);
             } else {
                  console.log("HanimeComponent: Pause called, but content controller not active or Controller.item missing. Last focus not saved.");
             }
        };

        /**
         * Stops the component, releasing resources.
         * Called when the activity is destroyed.
         */
        this.stop = function () {
             console.log("HanimeComponent: stop() called. (No specific stop logic needed currently)");
        };

        /**
         * Renders the main HTML element of the component.
         * @returns {jQuery} The main component HTML element.
         */
        this.render = function () {
            if (!html) {
                 this.buildLayout(); // Build layout if not already built
            }
            return html;
        };

        /**
         * Destroys the component, cleaning up resources, DOM elements, and event listeners.
         */
        this.destroy = function () {
            console.log("HanimeComponent: destroy() called.");
            // Clear network requests
            if(network && typeof network.clear === 'function') network.clear(); network = null;

            // Destroy all HanimeCard instances
             if (items && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') {
                 Lampa.Arrays.destroy(items);
                 console.log("HanimeComponent: Destroyed items array.");
             } else if (items) {
                 items.forEach(item => item && typeof item.destroy === 'function' ? item.destroy() : null);
                  console.log("HanimeComponent: Manually destroyed items (Lampa.Arrays.destroy not available).");
             }
            items = null;

            // Destroy scroll instance
             if (scroll && typeof scroll.destroy === 'function') {
                 scroll.destroy();
                 console.log("HanimeComponent: Destroyed scroll instance.");
             }
             scroll = null;

            // Remove main HTML element from DOM and nullify references
             if (html && typeof html.remove === 'function') {
                 html.remove();
                 console.log("HanimeComponent: Removed html element from DOM.");
             }
            html = null; itemsContainer = null; last = null; this.activity = null;

            // Remove controller reference for this component
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function' && typeof Lampa.Controller.collectionSet === 'function') {
                 // If this component's controller is active, clear its collection
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content') {
                      Lampa.Controller.collectionSet([]);
                       console.log("HanimeComponent: Controller collection set empty.");
                 }
                 Lampa.Controller.remove('content'); // Remove the controller definition
                  console.log("HanimeComponent: Controller 'content' removed.");
            } else console.warn("HanimeComponent: Lampa.Controller not available or remove/collectionSet methods missing for cleanup in destroy.");

            // Nullify component methods themselves to ensure no lingering references
            this.buildLayout = null; this.fetchCatalog = null; this.build = null; this.onCardClick = null; this.showCardContextMenu = null; this.updateScrollToFocus = null; this.fetchStreamAndMeta = null; this.empty = null; this.create = null; this.start = null; this.pause = null; this.stop = null; this.render = null; this.destroy = null; this.back = null;

            console.log("HanimeComponent: destroy() finished. All resources released.");
        };

        /**
         * Handles the back button press, navigating back in the activity stack.
         */
        this.back = function () {
             console.log("HanimeComponent: back() called. Attempting Activity.backward().");
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') {
                 Lampa.Activity.backward(); // Navigate back
             } else console.warn("HanimeComponent: Lampa.Activity or backward method missing for navigation.");
        };
    }

    /**
     * Entry point for the plugin. Sets up Lampa listeners and adds the menu item.
     */
    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() invoked.");

         // Prevent double initialization
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: global plugin_hanime_catalog_ready flag already set. Skipping initialization.");
             return;
         }

        /**
         * Initializes Lampa dependencies and registers the component and menu item.
         * Called when Lampa is ready.
         */
        function initializeLampaDependencies() {
             console.log("Hanime Plugin: initializeLampaDependencies() called (Lampa appready or fallback delay completed).");

             // Critical check: ensure required Lampa components and jQuery are available
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Template || typeof Lampa.Template !== 'object' || !Lampa.Component || typeof Lampa.Component !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Scroll || typeof Lampa.Scroll !== 'function' || !Lampa.Reguest || typeof Lampa.Reguest !== 'function') {
                  console.error("Hanime Plugin: CRITICAL: Required Lampa components (Lampa, Template, Component, Activity, Controller, jQuery, Scroll, Reguest) are not available after waiting for appready. Initialization failed. Please check Lampa version and installation.");
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина: Компоненты Lampa недоступны. Обновите Lampa или плагин.', 15000);
                  }
                  return; // Abort initialization
             }
             console.log("Hanime Plugin: All critical Lampa components checked OK. Continuing initialization.");

              // Set the ready flag to prevent re-initialization
              if (!window.plugin_hanime_catalog_ready) {
                 window.plugin_hanime_catalog_ready = true;
                 console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag set.");
              } else {
                   console.warn("Hanime Plugin: Plugin flag was unexpectedly set before initialization. Possible double load issue?");
                   return; // Abort if flag was somehow set early
              }

             // Add template fallbacks for standard Lampa card elements (can be useful even if our template includes them)
             console.log("Hanime Plugin: Adding standard template fallbacks using Lampa.Template.add...");
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

             // Add the custom hanime-card template
             console.log("Hanime Plugin: Adding hanime-card template...");
             if (Lampa.Template && typeof Lampa.Template.add === 'function') {
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
                              <!-- Marker added dynamically by addDetails -->
                         </div>
                         <div class="card__title">{title}</div>
                         <!-- Year element is included in the template -->
                         <div class="card__age"></div>
                     </div>
                 `);
                  console.log("Hanime Plugin: HanimeCard template added successfully.");
             } else {
                  console.error("Hanime Plugin: Lampa.Template.add method not available. Cannot add hanime-card template.");
             }

             console.log("Hanime Plugin: Custom CSS block REMOVED as requested. Relying on standard Lampa styles.");
             // If you needed custom CSS, you would add a <style> block here and append it to the head.
             // Example: $('head').append('<style>.hanime-card {} ...</style>');

             // Register the main HanimeComponent with Lampa
             console.log("Hanime Plugin: Registering HanimeComponent...");
             if (window.Lampa && Lampa.Component && typeof Lampa.Component.add === 'function') {
                 Lampa.Component.add('hanime_catalog', HanimeComponent);
                 console.log("Hanime Plugin: Component 'hanime_catalog' registered successfully.");
             } else {
                 console.error("Hanime Plugin: Lampa.Component.add method not available. Cannot register component.");
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина: Не удалось зарегистрировать компонент.', 5000);
                  }
             }

             // Add the menu item to the main menu
             console.log("Hanime Plugin: Calling addMenuItem()...");
             addMenuItem();
              console.log("Hanime Plugin: initializeLampaDependencies() finished.");
        }

        /**
         * Adds the main plugin menu item to the Lampa side menu.
         */
        function addMenuItem() {
             console.log("Hanime Plugin: addMenuItem() called.");

             // Check for required Lampa components and menu DOM element
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Component || typeof Lampa.Component.get !== 'function' || !Lampa.Select || typeof Lampa.Select.show !== 'function') {
                  console.warn("Hanime Plugin: addMenuItem cannot proceed. Missing Lampa core components, jQuery, Component.get, or Select.");
                  return;
             }
             var menuList = $('.menu .menu__list').eq(0);
             if (!menuList.length) {
                 console.warn("Hanime Plugin: addMenuItem cannot proceed. Lampa menu DOM structure ('.menu .menu__list') not found.");
                 return;
             }

             // Ensure our component is actually registered
             var ourComponentRegistered = Lampa.Component.get('hanime_catalog');
             if (!ourComponentRegistered) {
                 console.warn("Hanime Plugin: addMenuItem skipping - Component 'hanime_catalog' is not found/registered in Lampa.Component.");
                 return;
             }

             // Prevent adding the menu item multiple times if the function is called repeatedly
             if (menuList.find('.menu__text:contains("Hanime Catalog")').length > 0) {
                 console.log("Hanime Plugin: Menu item with text 'Hanime Catalog' already exists in DOM. Skipping addMenuItem.");
                 return;
             }
             console.log("Hanime Plugin: addMenuItem checks passed. Adding menu item DOM element to Lampa menu.");

            // Create the menu item HTML element
            var menu_item = $(`
                <li class="menu__item selector">
                    <div class="menu__ico">
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <!-- Simple play icon -->
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">Hanime Catalog</div>
                </li>
            `);

            // Attach click/enter event listener
            if (typeof menu_item.on === 'function') {
                menu_item.on('hover:enter', function () {
                     console.log("Hanime Plugin: Menu item 'Hanime Catalog' activated via 'hover:enter'. Showing category select.");

                     // Save current controller state to restore after select menu is closed
                     const currentControllerName = (window.Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;

                     // Prepare items for Lampa.Select based on the CATEGORIES map
                     const selectItems = Object.keys(CATEGORIES).map(key => {
                         const category = CATEGORIES[key];
                         return {
                             title: category.title,
                             key: key // Store the category key in the item data
                         };
                     });

                     // Show the category selection menu
                     Lampa.Select.show({
                         title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('menu_categories') : 'Выберите категорию', // Use translation if available
                         items: selectItems,
                         onSelect: (item) => {
                             // Callback when a category is selected
                             console.log("Hanime Plugin: Category selected:", item.key);
                             const selectedCategory = CATEGORIES[item.key];
                             if (selectedCategory) {
                                 // Close the select menu
                                 Lampa.Select.close();
                                 // Push the new activity, passing category details to the component
                                 Lampa.Activity.push({
                                     url: '', // url is not strictly necessary for this component but can be used for state
                                     title: selectedCategory.title, // Title displayed in the activity header
                                     component: 'hanime_catalog', // The component to launch
                                     page: 1, // Standard page parameter (can be used for pagination later)
                                     // Custom parameters passed to HanimeComponent constructor
                                     category_key: item.key,
                                     catalog_url: API_BASE_URL + selectedCategory.url, // Full URL
                                     category_title: selectedCategory.title // Title to display in the component header
                                 });
                                 console.log("Hanime Plugin: Pushed activity for category:", item.key);
                             } else {
                                 // Handle case where selected key is somehow invalid (shouldn't happen with map lookup)
                                 console.error("Hanime Plugin: Selected category key not found in CATEGORIES map:", item.key);
                                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка: Неверная категория.');
                                 // Close select and restore controller
                                 Lampa.Select.close();
                                  if (currentControllerName && window.Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle(currentControllerName);
                             }
                         },
                         onBack: () => {
                             // Callback when 'back' is pressed in the select menu
                             console.log("Hanime Plugin: Category select back pressed.");
                             // Restore the controller that was active before the select menu was shown
                              if (currentControllerName && window.Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle(currentControllerName);
                         }
                     });

                 } else {
                      console.warn("Hanime Plugin: Lampa.Select, Lampa.Activity, or required methods unavailable to show category select.");
                     if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Компонент выбора недоступен.');
                 }
                });
                console.log("Hanime Plugin: 'hover:enter' event listener attached to menu item.");
            } else {
                console.warn("Hanime Plugin: jQuery on() method not available for menu item. Cannot attach event listener.");
            }

             // Append the menu item to the Lampa menu list
             if (menuList.length > 0) {
                 menuList.append(menu_item);
                 console.log("Hanime Plugin: Menu item DOM element successfully added to Lampa menu list.");
             } else {
                 console.error("Hanime Plugin: addMenuItem failed during append: Lampa menu list DOM element ('.menu .menu__list') not found anymore.");
             }
             console.log("Hanime Plugin: addMenuItem finished.");
        }

        console.log("Hanime Plugin: startPlugin() invoked. Setting up Lampa ready listener.");

         // Check the ready flag again just before setting up the listener
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag is ALREADY SET before listener setup. Exiting startPlugin.");
             return;
         }

         // Wait for Lampa application ready event
         if (window.Lampa && typeof window.Lampa !== 'object' || !Lampa.Listener || typeof Lampa.Listener !== 'object' || typeof Lampa.Listener.follow !== 'function') {
              console.warn("Hanime Plugin: Lampa or Lampa.Listener not available or methods missing. Checking appready flag directly or scheduling delayed start as fallback.");

              // Fallback: Check window.appready flag directly or use a timeout
              if (window.appready && typeof window.appready === 'boolean' && window.appready) {
                  console.log("Hanime Plugin: Lampa 'appready' flag found. Calling initializeLampaDependencies directly as fallback.");
                  initializeLampaDependencies();
              } else {
                   // Last resort fallback: delayed execution (less reliable)
                   console.error("Hanime Plugin: Neither Lampa Listener nor 'appready' flag available immediately. Cannot reliably wait. Attempting delayed initialization as a HIGHLY UNRELIABLE fallback.");
                  setTimeout(initializeLampaDependencies, 500);
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

    // Execute the startPlugin function to begin initialization
    startPlugin();

})();
