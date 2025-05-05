(function () {
    'use strict';

    // Define the categories with their keys, titles, and URLs
    const CATEGORIES = [
        { key: 'newset', title: 'Последние добавленные', url: "/catalog/movie/newset.json" },
        { key: 'recent', title: 'Недавние', url: "/catalog/movie/recent.json" },
        { key: 'mostlikes', title: 'Самые понравившиеся', url: "/catalog/movie/mostlikes.json" },
        { key: 'mostviews', title: 'Самые просматриваемые', url: "/catalog/movie/mostviews.json" }
    ];

    const API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
    const STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
    const META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";
    const PROXY_BASE_URL = "http://77.91.78.5:3000"; // Keep proxy if needed

    function HanimeCard(data, componentRef) {
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

        // Use the registered template
        var cardTemplate = Lampa.Template.get('hanime-card', {
            img: processedData.poster_path,
            title: processedData.title
        });

        var cardElement = $(cardTemplate);

        this.addicon = function(name) {
            var iconsContainer = cardElement.find('.card__icons-inner');
            if (iconsContainer.length) {
                var icon = document.createElement('div');
                icon.classList.add('card__icon');
                icon.classList.add('icon--'+name);
                iconsContainer.append(icon);
            } else {
                // console.warn("HanimeCard: Could not find .card__icons-inner to add icon:", name); // Too noisy
            }
        }

        this.addDetails = function() {
             var viewElement = cardElement.find('.card__view');

             // Vote Average
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

            // Quality
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

             // Type (Movie/TV)
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

             // Year
             let ageElement = cardElement.find('.card__age');
             const year = processedData.release_year;
             if (ageElement.length) {
                  if (year && year !== '0000') {
                      ageElement.text(year).show();
                  } else {
                       ageElement.text('').hide();
                  }
             } else {
                 if (year && year !== '0000') {
                     let newAgeElement = $('<div class="card__age"></div>').text(year);
                      let titleElement = cardElement.find('.card__title');
                      if (titleElement.length) {
                          titleElement.after(newAgeElement);
                          // console.warn("HanimeCard: Created .card__age element dynamically. Prefer including in template."); // Too noisy
                      } else {
                          cardElement.append(newAgeElement);
                          console.error("HanimeCard: Cannot find .card__title to place .card__age dynamically.");
                      }
                 }
             }
        }

        this.updateFavoriteIcons = function() {
            // Clear existing icons and markers before adding
            cardElement.find('.card__icons-inner').empty();
            cardElement.find('.card__marker').remove();

             var status = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(processedData) : {};
             // if(Object.keys(status).length === 0 && window.Lampa && Lampa.Favorite) console.warn("HanimeCard: Lampa.Favorite.check returned empty status for", processedData.title, ". Data:", processedData); // Too noisy

            if (status.book) this.addicon('book');
            if (status.like) this.addicon('like');
            if (status.wath) this.addicon('wath');
            // Check history status using Timeline if available, fallback to Favorite status
            const isHistory = (window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched === 'function' && Lampa.Timeline.watched(processedData)) || status.history;
            if (isHistory) this.addicon('history');


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

        this.onVisible = function() {
             var imgElement = cardElement.find('.card__img');

             // Only load image if it's not already loaded or broken
             if (imgElement.length && (!imgElement.attr('src') || imgElement.attr('src').includes('img_load.svg'))) {
                 var src = processedData.poster_path;

                 if(window.Lampa && Lampa.ImageCache && typeof Lampa.ImageCache.read === 'function' && typeof Lampa.ImageCache.write === 'function') {
                      // Use ImageCache if available
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
                     // Fallback to basic image loading
                     // console.warn("Hanime Plugin: Lampa.ImageCache not available. Using basic image loading."); // Too noisy
                      imgElement[0].onload = () => { cardElement.addClass('card--loaded'); /* console.log("HanimeCard: Image loaded (basic):", src); */ }; // Too noisy
                     imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error (basic):', src); imgElement.attr('src', './img/img_broken.svg'); };
                     imgElement.attr('src', src || './img/img_broken.svg');
                 }
             } else {
                 // console.log("HanimeCard: Image already loaded or no img element.", imgElement.attr('src')); // Too noisy
             }

            this.updateFavoriteIcons();
        }

        this.create = function(){
             if (cardElement.data('created')) {
                 return;
             }

             if (typeof cardElement.on === 'function') {
                cardElement.on('hover:focus', function () {
                     // Call componentRef method to handle scroll update
                     if (componentRef && componentRef.updateScrollToFocus && typeof componentRef.updateScrollToFocus === 'function') {
                          componentRef.updateScrollToFocus(cardElement);
                     }
                     this.update(); // Update icons when focused
                }.bind(this));

                 cardElement.on('hover:enter', function () {
                     // Call componentRef method to handle card click
                     if (componentRef && componentRef.onCardClick && typeof componentRef.onCardClick === 'function') {
                         componentRef.onCardClick(processedData);
                     }
                }.bind(this));

                cardElement.on('hover:long', function(){
                     // Call componentRef method to show context menu
                     if (componentRef && componentRef.showCardContextMenu && typeof componentRef.showCardContextMenu === 'function') {
                          componentRef.showCardContextMenu(cardElement, processedData);
                     }
                 }.bind(this));
             } else {
                 console.warn("HanimeCard: jQuery on() method not available to attach hover events.");
             }

             this.card = cardElement[0]; // Store native DOM element
             if (this.card && typeof this.card.addEventListener === 'function') {
                this.card.addEventListener('visible', this.onVisible.bind(this));
             } else {
                 console.warn("HanimeCard: Cannot attach 'visible' event listener, native element or addEventListener not available.");
             }

             // Add details and update icons after a short delay to allow DOM attachment
             setTimeout(() => {
                  this.addDetails();
                  this.update();
             }, 0);

             cardElement.data('created', true);
        }

        this.update = function(){
            this.updateFavoriteIcons();
             // Lampa.Timeline.watched_status is usually called by Lampa itself on collection update
             // if(window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched_status === 'function') Lampa.Timeline.watched_status(cardElement, processedData);
             // else console.warn("HanimeCard: Cannot update watched status, Lampa.Timeline not available or method missing.");
        }

        this.render = function(js){
             if (!cardElement.data('created')) {
                 this.create();
             }
            return js ? cardElement[0] : cardElement; // Return native element if js=true
        }

        this.destroy = function(){
             // Remove event listeners
             if(this.card && typeof this.card.removeEventListener === 'function' && this.onVisible) this.card.removeEventListener('visible', this.onVisible.bind(this));
             if(cardElement && typeof cardElement.off === 'function') { // Use jQuery off()
                 cardElement.off('hover:focus');
                 cardElement.off('hover:enter');
                 cardElement.off('hover:long');
             }

             if(cardElement && typeof cardElement.remove === 'function') cardElement.remove();

             // Nullify references
             processedData = null; cardElement = null; this.card = null; componentRef = null;
             // console.log("HanimeCard: Destroyed."); // Too noisy
        }
    }

    function HanimeComponent(componentObject) {
        var network = null;
        var scrolls = {}; // Object to hold scroll instances per category
        var items = {}; // Object to hold card items per category
        var itemsContainers = {}; // Object to hold item containers per category

        var html = null; // Main container for all categories

        var last = null; // Stores the last focused element { element: DOMElement, category: 'key' }
        var categoryData = {}; // Stores fetched raw data per category
        var loadingCount = 0; // Counter for pending network requests

        this.buildLayout = function() {
            // Create the main container for all category lines
            html = $(`<div class="hanime-catalog-container"></div>`);
             console.log("HanimeComponent: buildLayout() - Main container created.");
        };

        // Fetches data for all categories concurrently
        this.fetchAllCategories = function () {
            var _this = this;
            _this.loadingCount = CATEGORIES.length; // Initialize loading counter
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeComponent: Activity loader not available in fetchAllCategories.");

             console.log("HanimeComponent: fetchAllCategories() - Starting requests for", CATEGORIES.length, "categories.");

             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeComponent: Lampa.Reguest initialized.");
             }

             if (network && typeof network.clear === 'function') network.clear();
             else console.warn("HanimeComponent: Network clear method not available.");

             if(!network || typeof network.native !== 'function'){
                 console.error("HanimeComponent: Cannot fetch categories. Network component or network.native missing.");
                  if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                  _this.empty("Не удалось загрузить каталог. Ошибка инициализации сети.");
                  if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                 return;
             }

            const fetchPromises = CATEGORIES.map(category => {
                const url = API_BASE_URL + category.url;
                return new Promise((resolve) => { // Always resolve the promise, even on error, to let Promise.all finish
                    network.native(url,
                        function (data) {
                            console.log(`HanimeComponent: Data received for category "${category.key}"`, data ? data.metas ? data.metas.length : 'no metas' : 'no data');
                            if (data && data.metas && Array.isArray(data.metas)) {
                                _this.categoryData[category.key] = data.metas;
                                resolve({ category: category.key, success: true, count: data.metas.length });
                            } else {
                                console.error(`HanimeComponent: Invalid data format for category "${category.key}".`, data);
                                _this.categoryData[category.key] = []; // Store empty array on format error
                                resolve({ category: category.key, success: false, error: 'Invalid data format' });
                            }
                        },
                        function (errorStatus, errorText) {
                            console.error(`HanimeComponent: Failed to load category "${category.key}". Status: ${errorStatus}`, errorText);
                            _this.categoryData[category.key] = []; // Store empty array on network error
                            resolve({ category: category.key, success: false, error: `Status: ${errorStatus}` });
                        },
                        false,
                        { dataType: 'json', timeout: 15000 }
                    );
                });
            });

            Promise.all(fetchPromises).then(results => {
                console.log("HanimeComponent: All category fetch promises settled.", results);
                _this.loadingCount = 0; // Reset counter
                if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);

                // Check if any data was successfully loaded for any category
                const hasAnyData = CATEGORIES.some(cat => _this.categoryData[cat.key] && _this.categoryData[cat.key].length > 0);

                if (hasAnyData) {
                    _this.buildAllCategories(); // Build UI with all available data
                } else {
                    _this.empty("Не удалось загрузить данные ни для одной категории.");
                }

                 if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                 console.log("HanimeComponent: fetchAllCategories() finished.");
            });
        };

        // Builds the UI for all fetched categories
        this.buildAllCategories = function() {
            var _this = this;
            console.log("HanimeComponent: buildAllCategories() - Building UI for all categories.");

            if (!(html && typeof html.empty === 'function' && typeof html.append === 'function')) {
                 console.error("HanimeComponent: Missing main html container or its methods in buildAllCategories(). Aborting UI build.");
                 _this.empty("Не удалось построить интерфейс.");
                 return;
            }

            html.empty(); // Clear previous content

            // Iterate through categories and build a line for each that has data
            CATEGORIES.forEach(category => {
                const data = _this.categoryData[category.key] || [];
                if (data.length > 0) {
                    _this.buildCategory(category, data);
                } else {
                    console.log(`HanimeComponent: Skipping category "${category.key}" as it has no data.`);
                }
            });

             console.log("HanimeComponent: buildAllCategories() finished.");
        };

        // Builds a single horizontal line for a specific category
        this.buildCategory = function(category, data) {
            var _this = this;
            console.log(`HanimeComponent: buildCategory() - Building UI for category "${category.key}" with ${data.length} items.`);

            const categoryHtml = $(`
                <div class="items-line layer--visible layer--render items-line--type-cards">
                    <div class="items-line__head">
                        <div class="items-line__title">${category.title}</div>
                    </div>
                    <div class="items-line__body">
                    </div>
                </div>
            `);
            const categoryItemsContainer = $('<div class="items-cards"></div>');

            // Create a new Scroll instance for this category line
            const categoryScroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });

            // Store references
            _this.items[category.key] = [];
            _this.itemsContainers[category.key] = categoryItemsContainer;
            _this.scrolls[category.key] = categoryScroll;

            if(categoryItemsContainer && categoryScroll && window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function') {
                 data.forEach(function (meta) {
                    var card = new HanimeCard(meta, _this); // Pass componentRef (this component)
                    var cardElement = card.render(); // Get jQuery element

                    cardElement.data('category', category.key); // Store category key on the card element

                    categoryItemsContainer.append(cardElement);
                    _this.items[category.key].push(card);
                });
                 console.log(`HanimeComponent: Created and added ${_this.items[category.key].length} cards for category "${category.key}".`);

                categoryScroll.append(categoryItemsContainer); // Append items container to scroll
                categoryHtml.find('.items-line__body').empty().append(categoryScroll.render(true)); // Append scroll's DOM element

                html.append(categoryHtml); // Add the category line to the main container

            } else {
                console.error(`HanimeComponent: Missing required objects or methods before building cards for category "${category.key}".`);
                if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show(`Ошибка плагина при создании карточек для "${category.title}".`, 5000);
                  }
            }
        };


         this.onCardClick = function(cardData) {
             console.log("HanimeComponent: Card clicked:", cardData.title, "ID:", cardData.id);
            this.fetchStreamAndMeta(cardData.id, cardData);
         }

         this.showCardContextMenu = function(cardElement, cardData) {
             console.log("HanimeComponent: showCardContextMenu for", cardData.title);
             var _this = this;

             var enabled = (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;

             var status = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(cardData) : {};

             var menu_favorite = [];
             if(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') {
                 menu_favorite = [
                     { title: Lampa.Lang.translate('title_book'), where: 'book', checkbox: true, checked: status.book },
                     { title: Lampa.Lang.translate('title_like'), where: 'like', checkbox: true, checked: status.like },
                     { title: Lampa.Lang.translate('title_wath'), where: 'wath', checkbox: true, checked: status.wath },
                     { title: Lampa.Lang.translate('menu_history'), where: 'history', checkbox: true, checked: status.history },
                     { title: Lampa.Lang.translate('settings_cub_status'), separator: true }
                 ];
             } else {
                 console.warn("HanimeComponent: Lampa.Lang not available, using English for menu items.");
                 menu_favorite = [
                      { title: 'Planned', where: 'book', checkbox: true, checked: status.book },
                     { title: 'Liked', where: 'like', checkbox: true, checked: status.like },
                     { title: 'Watching', where: 'wath', checkbox: true, checked: status.wath },
                     { title: 'History', where: 'history', checkbox: true, checked: status.history },
                     { title: 'Status', separator: true }
                 ];
             }

             if (window.Lampa && Lampa.Select && typeof Lampa.Select.show === 'function') {
                 Lampa.Select.show({
                     title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('title_action') : 'Action',
                     items: menu_favorite,
                     onBack: ()=>{
                         if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                          console.log("HanimeComponent: Context menu back button pressed. Restored controller:", enabled);
                     },
                     onCheck: (a)=>{
                         console.log("HanimeComponent: Context menu - checkbox checked:", a.where);
                         if(window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function') Lampa.Favorite.toggle(a.where, cardData);
                         // Find the card object and update its icons
                         const cardDomElement = cardElement[0];
                         let cardObj = null;
                         for(const key in _this.items) {
                             cardObj = _this.items[key].find(item => item && typeof item.render === 'function' && item.render(true) === cardDomElement);
                             if (cardObj) break;
                         }
                          if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                         else console.warn("HanimeComponent: Failed to find Card object to update icons after onCheck.");
                     },
                     onSelect: (a)=>{
                          console.log("HanimeComponent: Context menu - item selected:", a);
                          if(a.collect && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function'){
                              Lampa.Favorite.toggle(a.where, cardData);
                               // Find the card object and update its icons
                              const cardDomElement = cardElement[0];
                              let cardObj = null;
                              for(const key in _this.items) {
                                  cardObj = _this.items[key].find(item => item && typeof item.render === 'function' && item.render(true) === cardDomElement);
                                  if (cardObj) break;
                              }
                              if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                               else console.warn("HanimeComponent: Failed to find Card object to update icons after onSelect.");
                          }
                          if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                           if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                            console.log("HanimeComponent: Context menu selected and closed.");
                     },
                      onDraw: (item, elem) => {
                           // Handle premium lock icon if applicable
                           if (elem.collect && window.Lampa && Lampa.Account && typeof Lampa.Account.hasPremium === 'function' && !Lampa.Account.hasPremium()) {
                                let lockIconTemplate = (window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.has('icon_lock')) ? Lampa.Template.get('icon_lock') : null;
                                if (lockIconTemplate && window.$ && typeof item.find === 'function' && typeof item.append === 'function') {
                                     let wrap = $('<div class="selectbox-item__lock"></div>');
                                     wrap.append($(lockIconTemplate));
                                     item.find('.selectbox-item__checkbox').remove();
                                     item.append(wrap);

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

        // Updates the scroll position for the category containing the focused element
        this.updateScrollToFocus = function(element) {
             if (!element || element.length === 0) {
                 console.warn("HanimeComponent: updateScrollToFocus called with invalid element.");
                 return;
             }

             const cardElement = element[0]; // Get native DOM element
             const categoryKey = $(cardElement).data('category'); // Get category key from data attribute

             if (categoryKey && this.scrolls[categoryKey] && typeof this.scrolls[categoryKey].update === 'function') {
                last = { element: cardElement, category: categoryKey }; // Save last focused element with category
                this.scrolls[categoryKey].update($(cardElement), true); // Pass jQuery element to scroll.update
                // console.log(`HanimeComponent: Scrolled category "${categoryKey}" to focus element.`); // Too noisy
            } else {
                console.warn("HanimeComponent: Scroll instance not found for category or update method missing to scroll.", categoryKey);
            }
        }

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

            Promise.all([
                new Promise((resolve, reject) => {
                    if(streamUrl && network) network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                    else reject('Stream URL or Network unavailable');
                }),
                // If meta data is already available from the card, use it. Otherwise, fetch it.
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                     if(metaUrl && network) network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                     else reject('Meta URL or Network unavailable');
                 })
            ]).then(([streamData, metaDataResponse]) => {
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);

                const fullMetaData = metaDataResponse ? (metaDataResponse.meta || metaDataResponse) : null;
                console.log("HanimeComponent: Stream data received:", streamData);
                console.log("HanimeComponent: Full Meta Data received:", fullMetaData);

                if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0]; // Assuming the first stream is the one to play
                    var finalStreamUrl = streamToPlay ? streamToPlay.url : null;

                    if(finalStreamUrl) {
                         try {
                             // Apply proxy if the URL matches the highwinds pattern
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

                    var playerObject = {
                        title: fullMetaData ? (fullMetaData.name || fullMetaData.title || 'Без названия') : 'Без названия',
                        url: finalStreamUrl,
                        poster: fullMetaData ? (fullMetaData.poster || fullMetaData.background || '') : '',
                        // Add other meta info if player supports it (e.g., id, year, type)
                        id: fullMetaData ? fullMetaData.id : id,
                        year: fullMetaData ? fullMetaData.year : null,
                        type: fullMetaData ? fullMetaData.type : null,
                        original_name: fullMetaData ? fullMetaData.original_name : null
                    };

                    if (playerObject.url && window.Lampa && Lampa.Player && typeof Lampa.Player.play === 'function' && typeof Lampa.Player.playlist === 'function') {
                         console.log("HanimeComponent: Launching player with URL:", playerObject.url);
                         Lampa.Player.play(playerObject);
                         Lampa.Player.playlist([playerObject]); // Simple playlist with just the current item

                         // Add to history using Lampa.Favorite or Lampa.Timeline
                         if (fullMetaData && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                                // Prepare data for history, ensure required fields are present
                                const historyMeta = {
                                    id: fullMetaData.id || id, // Use fetched ID or original ID
                                    title: fullMetaData.name || fullMetaData.title || 'Без названия',
                                    poster: fullMetaData.poster || fullMetaData.background || '',
                                    runtime: fullMetaData.runtime,
                                    year: fullMetaData.year,
                                    original_name: fullMetaData.original_name || '',
                                    // Add type if available, Lampa history might use it
                                    type: fullMetaData.type || (meta && meta.type) || 'movie'
                                };
                                Lampa.Favorite.add('history', historyMeta, 100); // 100 is progress (watched fully)
                                console.log("HanimeComponent: Added to history:", historyMeta);
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
                if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                console.error("HanimeComponent: Error fetching stream/meta details for ID:", id, error);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'), 5000);
                 }
            });
        };

        this.empty = function (msg) {
             console.log("HanimeComponent: empty() - Displaying message:", msg);
             if (window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function') {
                 var empty = new Lampa.Empty({ message: msg });
                 if(html && typeof html.empty === 'function' && typeof html.append === 'function') html.empty().append(empty.render(true));
                 else console.warn("HanimeComponent: Html container not available or its methods missing to show empty state.");

                 // Ensure loader is off and activity is toggled
                 if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(false);
                 if(this.activity && typeof this.activity.toggle === 'function') this.activity.toggle();

                 // Replace the start method with the empty component's start method for navigation
                 if (typeof empty.start === 'function') this.start = empty.start;
                 else console.warn("HanimeComponent: Empty component does not have a start method.");

                  console.log("HanimeComponent: Displaying empty state via Lampa.Empty.");
             } else {
                  console.warn("HanimeComponent: Lampa.Empty component not available. Using basic text fallback.");
                  if(html && typeof html.empty === 'function' && typeof html.text === 'function') html.empty().text(msg + ' (Компонент Empty недоступен в Lampa)');
                 if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(false);
                 if(this.activity && typeof this.activity.toggle === 'function') this.activity.toggle();
                   // Fallback start method for basic back navigation
                   this.start = function() {
                        console.log("HanimeComponent: Fallback start() for empty state. Setting minimal Controller.");
                       if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                            Lampa.Controller.add('content', { back: this.back });
                            Lampa.Controller.toggle('content');
                       } else console.warn("HanimeComponent: Lampa.Controller not available for fallback start method.");
                   }.bind(this);
             }
        };

        this.create = function () {
            console.log("HanimeComponent: create()");
             // Scroll and Network instances are now created/managed within fetchAllCategories/buildCategory
            this.buildLayout(); // Build the main container HTML
             // Loader is handled within fetchAllCategories
            this.fetchAllCategories(); // Start fetching data for all categories
             console.log("HanimeComponent: create() finished. Fetching all categories initiated.");
        };

        this.start = function () {
            console.log("HanimeComponent: start()");
            // Check if this activity is currently active
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this.activity) {
                console.log("HanimeComponent: start() - Not the currently active activity, skipping.");
                return;
            }
             console.log("HanimeComponent: start() - Activity is active. Setting up Lampa.Controller.");

            // Check for required Lampa Controller components
            if (!(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function')) {
                 console.error("HanimeComponent: Lampa.Controller or required methods not available in start(). Cannot setup main Controller.");
                 // Fallback to basic controller for back button if possible
                 if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                     console.log("HanimeComponent: Attempting to add basic Controller for Back button.");
                     Lampa.Controller.add('content', { back: this.back });
                     Lampa.Controller.toggle('content');
                 } else console.warn("HanimeComponent: Lampa.Controller unavailable or methods missing, cannot add basic back handler.");
                 return;
            }

            // Build the full collection array from all card elements across all categories
            let allCardElements = [];
            CATEGORIES.forEach(category => {
                const categoryItems = this.items[category.key] || [];
                categoryItems.forEach(card => {
                    const cardElement = card.render(true); // Get native DOM element
                    if (cardElement) {
                        allCardElements.push(cardElement);
                    }
                });
            });

            if (allCardElements.length === 0) {
                 console.warn("HanimeComponent: No card elements found to set Controller collection.");
                 // Fallback to basic controller if no items were built
                 Lampa.Controller.add('content', { back: this.back });
                 Lampa.Controller.toggle('content');
                 return;
            }

            // Add the main controller for the content area
            Lampa.Controller.add('content', {
                toggle: function () {
                    console.log("HanimeComponent: Controller toggle() called.");
                    // Set the collection to ALL card elements from ALL categories
                    Lampa.Controller.collectionSet(allCardElements);

                    // Determine which element to focus:
                    // 1. The last focused element if it exists and is still in the collection.
                    // 2. The first element of the first category with data.
                    // 3. The very first element in the combined collection as a last resort.
                    let focusElement = null;
                    if (last && last.element && allCardElements.includes(last.element)) {
                        focusElement = last.element;
                        console.log("HanimeComponent: Focusing last element:", focusElement);
                    } else {
                        // Find the first element of the first category that has data
                        for (const category of CATEGORIES) {
                            const categoryItems = _this.items[category.key] || [];
                            if (categoryItems.length > 0) {
                                focusElement = categoryItems[0].render(true);
                                console.log(`HanimeComponent: Focusing first element of category "${category.key}".`);
                                break; // Found the first category with data, focus its first item
                            }
                        }
                        // If no category had data (shouldn't happen if hasAnyData check passed, but safety)
                        if (!focusElement && allCardElements.length > 0) {
                             focusElement = allCardElements[0];
                             console.log("HanimeComponent: Focusing first element in combined collection as fallback.");
                        }
                    }

                    // Set the focus
                    if (focusElement) {
                         Lampa.Controller.collectionFocus(focusElement);
                         // Manually trigger scroll update for the initial focus
                         _this.updateScrollToFocus($(focusElement));
                    } else {
                         console.warn("HanimeComponent: No element found to focus.");
                    }

                    console.log("HanimeComponent: Controller collectionSet/Focus called in toggle().");
                },
                left: function () {
                    // Use Navigator for standard movement
                    if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('left')) Navigator.move('left');
                    // If cannot move left within the collection, try toggling to the menu
                    else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('menu');
                    else console.log("HanimeComponent: Cannot move left, Navigator or menu controller unavailable.");
                },
                right: function () {
                    // Use Navigator for standard movement
                    if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('right')) Navigator.move('right');
                     else console.log("HanimeComponent: Cannot move right, Navigator unavailable or no more elements.");
                },
                up: function () {
                    // Lampa Controller handles UP/DOWN between lines automatically if collection is set correctly
                    if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('up')) Navigator.move('up');
                    // If cannot move up within the collection, try toggling to the head (if exists)
                    else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('head');
                    else console.log("HanimeComponent: Cannot move up, Navigator or head controller unavailable.");
                },
                down: function () {
                    // Lampa Controller handles UP/DOWN between lines automatically
                    if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('down')) Navigator.move('down');
                     else console.log("HanimeComponent: Cannot move down, Navigator unavailable or no elements below.");
                },
                back: this.back // Use the component's back method
            });

            // Toggle the 'content' controller to activate it
            Lampa.Controller.toggle('content');
             console.log("HanimeComponent: Controller 'content' toggled. Initial focus attempt made by Controller.");
        };

        this.pause = function () {
             console.log("HanimeComponent: pause()");
             // Save the currently focused element and its category key
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') {
                 const focusedElement = Lampa.Controller.item(); // Get the currently focused DOM element
                 if (focusedElement) {
                     const categoryKey = $(focusedElement).data('category'); // Get category key from data attribute
                     if (categoryKey) {
                         last = { element: focusedElement, category: categoryKey };
                         console.log("HanimeComponent: Activity paused. Saved last focused DOM item:", last.element, "in category:", last.category);
                     } else {
                         console.warn("HanimeComponent: Focused element has no category data. Last focus not saved with category.");
                         last = { element: focusedElement, category: null }; // Save element but note missing category
                     }
                 } else {
                     console.log("HanimeComponent: Pause called, but Controller.item returned null. Last focus not saved.");
                     last = null; // Clear last focus if nothing was focused
                 }
             } else {
                  console.log("HanimeComponent: Pause called, but content controller not active or Controller.item missing. Last focus not saved.");
                  last = null; // Clear last focus if controller state is unexpected
             }
        };

        this.stop = function () {
             console.log("HanimeComponent: stop() called.");
             // Stop is called when the activity is completely removed.
             // Cleanup happens in destroy.
        };

        this.render = function () {
            // Render is called to get the main DOM element of the component
            if (!html) {
                 this.buildLayout(); // Build the main container if not already built
            }
            return html; // Return the main container jQuery element
        };

        this.destroy = function () {
            console.log("HanimeComponent: destroy() called.");

            // Clear network requests
            if(network && typeof network.clear === 'function') network.clear(); network = null;

             // Destroy all scroll instances
             for (const key in this.scrolls) {
                 if (this.scrolls[key] && typeof this.scrolls[key].destroy === 'function') {
                     this.scrolls[key].destroy();
                     console.log(`HanimeComponent: Destroyed scroll instance for category "${key}".`);
                 }
             }
             this.scrolls = {}; // Clear the scrolls object

             // Destroy all card items
             for (const key in this.items) {
                 if (Array.isArray(this.items[key]) && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') {
                     Lampa.Arrays.destroy(this.items[key]);
                     console.log(`HanimeComponent: Destroyed items array for category "${key}".`);
                 } else if (Array.isArray(this.items[key])) {
                     // Fallback destroy if Lampa.Arrays.destroy is missing
                     this.items[key].forEach(item => {
                         if (item && typeof item.destroy === 'function') item.destroy();
                     });
                     console.log(`HanimeComponent: Fallback destroyed items array for category "${key}".`);
                 }
             }
            this.items = {}; // Clear the items object
            this.categoryData = {}; // Clear fetched data
            this.itemsContainers = {}; // Clear containers reference

             // Remove the main HTML element from the DOM
             if (html && typeof html.remove === 'function') {
                 html.remove();
                 console.log("HanimeComponent: Removed html element from DOM.");
             }
            html = null;

            // Remove the controller associated with this component
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function') {
                 // If this component's controller is active, clear its collection before removing
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.collectionSet === 'function') {
                      Lampa.Controller.collectionSet([]);
                       console.log("HanimeComponent: Controller collection set empty.");
                 }
                 Lampa.Controller.remove('content');
                  console.log("HanimeComponent: Controller 'content' removed.");
            } else console.warn("HanimeComponent: Lampa.Controller not available or remove method missing for cleanup in destroy.");

            last = null; // Clear last focused element reference
            console.log("HanimeComponent: destroy() finished. All resources released.");
        };

        this.back = function () {
             console.log("HanimeComponent: back() called. Attempting Activity.backward().");
             // Use Lampa's activity manager to go back
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') {
                 Lampa.Activity.backward();
             } else console.warn("HanimeComponent: Lampa.Activity or backward method missing for navigation.");
        };
    }

    // --- Plugin Initialization ---

    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() invoked.");

         // Prevent double initialization
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: global plugin_hanime_catalog_ready flag already set. Skipping initialization.");
             return;
         }

        function initializeLampaDependencies() {
             console.log("Hanime Plugin: initializeLampaDependencies() called (Lampa appready or fallback delay completed).");

             // Critical check for required Lampa components and jQuery
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Template || typeof Lampa.Template !== 'object' || !Lampa.Component || typeof Lampa.Component !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Scroll || typeof Lampa.Scroll !== 'function' || !Lampa.Reguest || typeof Lampa.Reguest !== 'function' || !Lampa.Arrays || typeof Lampa.Arrays !== 'object') {
                  console.error("Hanime Plugin: CRITICAL: Required Lampa components (Lampa, Template, Component, Activity, Controller, jQuery, Scroll, Reguest, Arrays) are not available after waiting for appready. Initialization failed. Please check Lampa version and installation.");
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина: Компоненты Lampa недоступны. Обновите Lampa или плагин.', 15000);
                  }
                  return;
             }
             console.log("Hanime Plugin: All critical Lampa components checked OK. Continuing initialization.");

              // Set the ready flag
              if (!window.plugin_hanime_catalog_ready) {
                 window.plugin_hanime_catalog_ready = true;
                 console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag set.");
              } else {
                   console.warn("Hanime Plugin: Plugin flag was unexpectedly set before initialization. Possible double load issue?");
                   return; // Exit if flag was already set
              }

             console.log("Hanime Plugin: Adding standard template fallbacks using Lampa.Template.add...");
             if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                 // Add templates if they don't exist (Lampa might provide them)
                 if (!Lampa.Template.has('card_vote_temp')) Lampa.Template.add('card_vote_temp', '<div class="card__vote"></div>');
                 if (!Lampa.Template.has('card_quality_temp')) Lampa.Template.add('card_quality_temp', '<div class="card__quality"><div></div></div>');
                 if (!Lampa.Template.has('card_year_temp')) Lampa.Template.add('card_year_temp', '<div class="card__age"></div>');
                 if (!Lampa.Template.has('card_type_temp')) Lampa.Template.add('card_type_temp', '<div class="card__type"></div>');
                 if (!Lampa.Template.has('icon_lock')) Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
                  console.log("Hanime Plugin: Standard template fallbacks added successfully.");
             } else {
                  console.error("Hanime Plugin: Lampa.Template.add method not available. Cannot add template fallbacks.");
             }

             console.log("Hanime Plugin: Adding hanime-card template...");
             if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                 // Add the custom card template
                 Lampa.Template.add('hanime-card', `
                     <div class="hanime-card card selector layer--visible layer--render">
                         <div class="card__view">
                             <img src="./img/img_load.svg" class="card__img" alt="{title}" loading="lazy" />
                             <div class="card__icons">
                                 <div class="card__icons-inner"></div>
                             </div>
                             <!-- Details elements are added dynamically by HanimeCard.addDetails -->
                             <!-- .card__vote, .card__quality, .card__type, .card__marker -->
                         </div>
                         <div class="card__title">{title}</div>
                         <!-- .card__age is added dynamically by HanimeCard.addDetails -->
                     </div>
                 `);
                  console.log("Hanime Plugin: HanimeCard template added successfully.");
             } else {
                  console.error("Hanime Plugin: Lampa.Template.add method not available. Cannot add hanime-card template.");
             }

             console.log("Hanime Plugin: Custom CSS block REMOVED as requested. Relying on standard Lampa styles.");

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

             console.log("Hanime Plugin: Calling addMenuItem()...");
             addMenuItem(); // Add the plugin's entry to the main menu
              console.log("Hanime Plugin: addMenuItem() called from initializeLampaDependencies.");

              console.log("Hanime Plugin: initializeLampaDependencies() finished.");
        }

        // Adds the plugin's entry to the Lampa main menu
        function addMenuItem() {
             console.log("Hanime Plugin: addMenuItem() called.");

             // Check for required Lampa components and jQuery
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Component || typeof Lampa.Component.get !== 'function') {
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

             // Check if our component is registered
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

            // Create the menu item HTML
            var menu_item = $(`
                <li class="menu__item selector">
                    <div class="menu__ico">
                        <!-- Simple play icon -->
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">Hanime Catalog</div>
                </li>
            `);

            // Attach event listener for activation
            if (typeof menu_item.on === 'function') {
                menu_item.on('hover:enter', function () {
                     console.log("Hanime Plugin: Menu item 'Hanime Catalog' activated via 'hover:enter'. Pushing activity.");
                     // Push a new activity using our registered component
                     if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.push === 'function') {
                         Lampa.Activity.push({
                             url: '', // URL is not strictly needed for this component
                             title: 'Hanime Catalog', // Title for the activity header
                             component: 'hanime_catalog', // The name of our registered component
                             page: 1 // Optional page number
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

         // Check if the plugin was already marked as ready (e.g., due to multiple script loads)
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag is ALREADY SET upon initial execution. Skipping entire startPlugin execution to prevent double init.");
             return;
         }

         // Wait for Lampa to be ready
         if (window.Lampa && typeof window.Lampa !== 'object' || !Lampa.Listener || typeof Lampa.Listener !== 'object' || typeof Lampa.Listener.follow !== 'function') {
              console.warn("Hanime Plugin: Lampa or Lampa.Listener not available or methods missing. Checking appready flag directly or scheduling delayed start as fallback.");

              // Fallback check for appready flag
              if (window.appready && typeof window.appready === 'boolean' && window.appready) {
                  console.log("Hanime Plugin: Lampa 'appready' flag found. Calling initializeLampaDependencies directly as fallback.");
                  initializeLampaDependencies();
              } else {
                   // Last resort: schedule a delayed initialization. This is unreliable.
                   console.error("Hanime Plugin: Neither Lampa Listener nor 'appready' flag available immediately. Cannot reliably wait. Attempting delayed initialization as a HIGHLY UNRELIABLE fallback.");
                  setTimeout(initializeLampaDependencies, 500); // Wait 0.5 seconds
                  console.log("Hanime Plugin: Delayed initialization fallback scheduled.");
              }

         } else {
             // Preferred method: Subscribe to Lampa's 'app:ready' event
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

    // Start the plugin initialization process
    startPlugin();

})();
