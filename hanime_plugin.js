(function () {
    'use strict';

    // =========================================================================
    // HanimeCard - Остается практически без изменений,
    // только убедимся, что componentRef корректно передается
    // =========================================================================
    function HanimeCard(data, componentRef) {
        var processedData = {
            id: data.id,
            title: data.name || data.title || 'Без названия',
            poster_path: data.poster || data.img,
            vote_average: data.vote_average || data.vote || null,
            quality: data.quality || data.release_quality || null,
            release_year: ((data.year || data.release_date || '') + '').slice(0, 4),
            type: data.first_air_date ? 'tv' : 'movie', // Предполагаем, что 'tv' для сериалов, хотя API может быть только movie
            original_name: data.original_name
        };

        // Ensure we have a valid poster path, default to placeholder if not
        if (!processedData.poster_path || processedData.poster_path.trim() === '') {
             processedData.poster_path = './img/img_broken.svg';
             console.warn(`HanimeCard: Missing poster for ID ${processedData.id}. Using placeholder.`);
        }


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
                console.warn("HanimeCard: Could not find .card__icons-inner to add icon:", name, "for", processedData.title);
            }
        }

        this.addDetails = function() {
             var viewElement = cardElement.find('.card__view');

             // Vote
             if (processedData.vote_average > 0 && viewElement.length) {
                 let voteElement = cardElement.find('.card__vote');
                 if (!voteElement.length) {
                     voteElement = Lampa.Template.get('card_vote_temp') ? $(Lampa.Template.get('card_vote_temp')) : $('<div class="card__vote"></div>');
                     viewElement.append(voteElement);
                     console.warn("HanimeCard: Added .card__vote dynamically for", processedData.title, ". Prefer including in template.");
                 }
                 voteElement.text(parseFloat(processedData.vote_average).toFixed(1));
             } else {
                 cardElement.find('.card__vote').remove();
             }

             // Quality
             if (processedData.quality && viewElement.length) {
                 let qualityElement = cardElement.find('.card__quality');
                  if (!qualityElement.length) {
                     qualityElement = Lampa.Template.get('card_quality_temp') ? $(Lampa.Template.get('card_quality_temp')) : $('<div class="card__quality"><div></div></div>');
                      viewElement.append(qualityElement);
                      console.warn("HanimeCard: Added .card__quality dynamically for", processedData.title, ". Prefer including in template.");
                  }
                 qualityElement.find('div').text(processedData.quality);
            } else {
                cardElement.find('.card__quality').remove();
            }

             // Type (movie/tv)
             // Note: This API seems movie-focused, but keep the logic just in case 'first_air_date' appears
             if (processedData.type && viewElement.length) {
                 let typeElement = cardElement.find('.card__type');
                  if (!typeElement.length) {
                      typeElement = Lampa.Template.get('card_type_temp') ? $(Lampa.Template.get('card_type_temp')) : $('<div class="card__type"></div>');
                      viewElement.append(typeElement);
                       console.warn("HanimeCard: Added .card__type dynamically for", processedData.title, ". Prefer including in template.");
                  }
                  typeElement.text(processedData.type.toUpperCase());
             } else {
                 cardElement.find('.card__type').remove();
             }

             // Year
             let ageElement = cardElement.find('.card__age');
             if (ageElement.length) {
                  if (processedData.release_year && processedData.release_year !== '0000') {
                      ageElement.text(processedData.release_year).show();
                  } else {
                       ageElement.text('').hide();
                  }
             } else {
                 // Fallback: create if not in template
                 if (processedData.release_year && processedData.release_year !== '0000') {
                     let newAgeElement = Lampa.Template.get('card_year_temp') ? $(Lampa.Template.get('card_year_temp')) : $('<div class="card__age"></div>');
                      newAgeElement.text(processedData.release_year);
                      let titleElement = cardElement.find('.card__title');
                      if (titleElement.length) {
                          titleElement.after(newAgeElement);
                          console.warn("HanimeCard: Created .card__age element dynamically for", processedData.title, ". Prefer including in template.");
                      } else {
                          cardElement.append(newAgeElement); // Less ideal placement
                          console.error("HanimeCard: Cannot find .card__title to place .card__age dynamically for", processedData.title, " appended at end.");
                      }
                 }
             }
        }

        this.updateFavoriteIcons = function() {
            cardElement.find('.card__icons-inner').empty();
            cardElement.find('.card__marker').remove();

             // Check if Lampa.Favorite and its methods are available
             if (!(window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function' && typeof Lampa.Favorite.add === 'function')) {
                 // console.warn("HanimeCard: Lampa.Favorite component or methods not available. Skipping favorite icon update.");
                 return; // Cannot update icons if Favorite component is missing
             }

             var status = Lampa.Favorite.check(processedData);
             // if(Object.keys(status).length === 0) console.warn("HanimeCard: Lampa.Favorite.check returned empty status for", processedData.title, ". Data:", processedData);


            if (status.book) this.addicon('book');
            if (status.like) this.addicon('like');
            if (status.wath) this.addicon('wath'); // Typo 'wath' -> 'watch'? Using 'wath' as per original code
            // Use Lampa.Timeline if available for history, fallback to Favorite status
            const historyStatus = (window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched === 'function' && Lampa.Timeline.watched(processedData)) || status.history;
            if (historyStatus) this.addicon('history');


             // Update watch status marker (look, viewed, scheduled, continued, thrown)
             var marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];
             // Prioritize Timeline status if available
             let activeMarker = null;
              if (window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.get === 'function') {
                   const timelineStatus = Lampa.Timeline.get(processedData);
                   activeMarker = marks.find(m => timelineStatus && timelineStatus.status === m);
              }
              // Fallback to Favorite status if Timeline not available or no status set there
              if (!activeMarker) {
                   activeMarker = marks.find(m => status[m]);
              }


             if (activeMarker) {
                 var markerElement = cardElement.find('.card__marker');
                 if (!markerElement.length) {
                     markerElement = $('<div class="card__marker"><span></span></div>');
                     cardElement.find('.card__view').append(markerElement);
                     console.warn("HanimeCard: Added .card__marker dynamically for", processedData.title, ". Prefer including in template.");
                 }
                 // Ensure Lampa.Lang is available for translation
                 const markerText = (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? Lampa.Lang.translate('title_' + activeMarker) : activeMarker);
                 markerElement.find('span').text(markerText);
                 markerElement.removeClass(marks.map(m => 'card__marker--' + m).join(' '))
                             .addClass('card__marker--' + activeMarker);
                  // console.log(`HanimeCard: Set marker '${activeMarker}' for ${processedData.title}`);
             } else {
                 cardElement.find('.card__marker').remove();
                 // console.log(`HanimeCard: No marker set for ${processedData.title}`);
             }
        };

        this.onVisible = function() {
             // console.log("HanimeCard: onVisible called for", processedData.title);
             var imgElement = cardElement.find('.card__img');

             // Only load if src is not set or is the loading placeholder
             if (imgElement.length && (!imgElement.attr('src') || imgElement.attr('src').includes('img_load.svg'))) {
                 var src = processedData.poster_path;

                 // Use Lampa.ImageCache if available
                 if(window.Lampa && Lampa.ImageCache && typeof Lampa.ImageCache.read === 'function' && typeof Lampa.ImageCache.write === 'function') {
                      if(!Lampa.ImageCache.read(imgElement[0], src)) {
                          // Image not in cache, load it
                          imgElement[0].onload = () => {
                              cardElement.addClass('card--loaded');
                              Lampa.ImageCache.write(imgElement[0], imgElement[0].src); // Cache the successfully loaded image
                              // console.log("HanimeCard: Image loaded and cached:", src);
                          };
                          imgElement[0].onerror = () => {
                               console.error('Hanime Plugin: Image load error:', src);
                               imgElement.attr('src', './img/img_broken.svg');
                               if(window.Lampa && Lampa.Tmdb && typeof Lampa.Tmdb.broken === 'function') Lampa.Tmdb.broken(); // Notify Lampa Tmdb component (if applicable)
                          };
                          imgElement.attr('src', src || './img/img_broken.svg'); // Set src to start loading
                      } else {
                         // Image found in cache, it's already set by Lampa.ImageCache.read
                         cardElement.addClass('card--loaded');
                         // console.log("HanimeCard: Image loaded from cache:", src);
                      }
                 } else {
                     // Lampa.ImageCache not available, use basic loading
                     console.warn("Hanime Plugin: Lampa.ImageCache not available. Using basic image loading for", processedData.title);
                      imgElement[0].onload = () => { cardElement.addClass('card--loaded'); /* console.log("HanimeCard: Image loaded (basic):", src); */ };
                     imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error (basic):', src); imgElement.attr('src', './img/img_broken.svg'); };
                     imgElement.attr('src', src || './img/img_broken.svg');
                 }
             } else {
                 // Image is already loaded or placeholder is intentionally set
                 // console.log("HanimeCard: Image already loaded or has broken placeholder for", processedData.title);
             }

            // Always update icons when visible, as status might change in background
            this.updateFavoriteIcons();
        }

        this.create = function(){
             if (cardElement.data('created')) {
                  // console.log("HanimeCard: create() called, but card already created for", processedData.title);
                 return;
             }
             // console.log("HanimeCard: create() called for", processedData.title);

             // Ensure componentRef methods exist before binding
             const hasComponentRefMethods = componentRef && typeof componentRef.updateScrollToFocus === 'function' && typeof componentRef.onCardClick === 'function' && typeof componentRef.showCardContextMenu === 'function';

             if (typeof cardElement.on === 'function') {
                cardElement.on('hover:focus', function () {
                     // console.log("HanimeCard: focus on", processedData.title);
                     if (hasComponentRefMethods) {
                          componentRef.updateScrollToFocus(cardElement); // Call back to component to update its scroll state
                     } else {
                          console.warn("HanimeCard: componentRef methods missing during hover:focus for", processedData.title);
                     }
                     this.update(); // Update icons when focused
                }.bind(this)); // Bind 'this' to refer to the Card instance

                 cardElement.on('hover:enter', function () {
                     console.log("HanimeCard: enter on", processedData.title);
                     if (hasComponentRefMethods) {
                         componentRef.onCardClick(processedData); // Call back to component for click action
                     } else {
                          console.warn("HanimeCard: componentRef methods missing during hover:enter for", processedData.title);
                     }
                }.bind(this)); // Bind 'this'

                cardElement.on('hover:long', function(){
                     console.log("HanimeCard: long press on", processedData.title);
                     if (hasComponentRefMethods) {
                          componentRef.showCardContextMenu(cardElement, processedData); // Call back to component for context menu
                     } else {
                          console.warn("HanimeCard: componentRef methods missing during hover:long for", processedData.title);
                     }
                 }.bind(this)); // Bind 'this'
             } else {
                 console.warn("HanimeCard: jQuery on() method not available to attach hover events for", processedData.title);
             }

             this.card = cardElement[0];
             if (this.card && typeof this.card.addEventListener === 'function') {
                this.card.addEventListener('visible', this.onVisible.bind(this));
                // console.log("HanimeCard: Added 'visible' event listener to native element for", processedData.title);
             } else {
                 console.warn("HanimeCard: Cannot attach 'visible' event listener, native element or addEventListener not available for", processedData.title);
             }

             // Add details immediately
             this.addDetails();

             // Update icons after a slight delay to ensure DOM structure is ready
             setTimeout(() => {
                  this.updateFavoriteIcons();
             }, 0);


             cardElement.data('created', true);
             // console.log("HanimeCard: create() finished for", processedData.title);
        }

        this.update = function(){
            // console.log("HanimeCard: update() called for", processedData.title);
            this.updateFavoriteIcons();
             // Example: If using Lampa.Timeline for progress dots
             // if(window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched_status === 'function') Lampa.Timeline.watched_status(cardElement, processedData);
             // else console.warn("HanimeCard: Cannot update watched status dots, Lampa.Timeline not available or method missing.");
        }

        this.render = function(js){
             // console.log("HanimeCard: render() called for", processedData.title, " js:", js);
             if (!cardElement.data('created')) {
                 this.create();
             }
            return js ? cardElement[0] : cardElement;
        }

        this.destroy = function(){
            // console.log("HanimeCard: destroy() called for", processedData ? processedData.title : 'Unknown Card');
             if(this.card && typeof this.card.removeEventListener === 'function' && this.onVisible) this.card.removeEventListener('visible', this.onVisible.bind(this));
             if(cardElement && typeof cardElement.remove === 'function') cardElement.remove();
             // Nullify references to aid garbage collection
             processedData = null; cardElement = null; this.card = null; componentRef = null;
             // console.log("HanimeCard: destroy() finished.");
        }
    }

    // =========================================================================
    // HanimeComponent - Modified to handle multiple categories
    // =========================================================================
    function HanimeComponent(componentObject) {
        var network = null;

        // Use a vertical scroll for the main layout
        var verticalScroll = null;
        // Store horizontal scrolls for each category
        var horizontalScrolls = {}; // { categoryKey: Lampa.Scroll instance }
        // Store card items for each category
        var rowItems = {}; // { categoryKey: [HanimeCard instances] }

        var html = null; // Main container element

        // Navigation state
        var activeRowKey = null; // Key of the currently focused horizontal row
        var lastFocusedElements = {}; // { categoryKey: last focused DOM element }


        // Define categories with their titles and URL paths
        const CATEGORIES = {
            newset: { title: "Последние добавленные", url: "/catalog/movie/newset.json" },
            recent: { title: "Недавние", url: "/catalog/movie/recent.json" }, // Note: Confirm if this exists or is handled differently
            mostlikes: { title: "Популярное (лайки)", url: "/catalog/movie/mostlikes.json" },
            mostviews: { title: "Популярное (просмотры)", url: "/catalog/movie/mostviews.json" }
        };

        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var PROXY_BASE_URL = "http://77.91.78.5:3000"; // Keep proxy for highwinds

        // Prepend base URL to category paths
        for (const key in CATEGORIES) {
             CATEGORIES[key].fullUrl = API_BASE_URL + CATEGORIES[key].url;
        }


        this.buildLayout = function() {
            console.log("HanimeComponent: buildLayout()");
            // Main container for the vertical scroll
            html = $(`
                <div class="hanime-catalog-component layer--visible layer--render">
                    <div class="items-lines">
                        <!-- Category rows will be appended here -->
                    </div>
                </div>
            `);

             // Initialize the main vertical scroll
             if (!verticalScroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                  verticalScroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'vertical' });
                   // Append the vertical scroll's rendered element to the main container
                   html.find('.items-lines').append(verticalScroll.render(true));
                   console.log("HanimeComponent: Main vertical Lampa.Scroll initialized.");
             } else if (!verticalScroll) {
                 console.error("HanimeComponent: Lampa.Scroll component not available to initialize vertical scroll.");
                 this.empty("Компонент скролла недоступен.");
             }
        };

        this.fetchCatalog = function () {
            var _this = this;
             console.log("HanimeComponent: fetchCatalog() - Starting requests for all categories.");

             // Show loader
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);

             // Initialize network request handler if not already
             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeComponent: Lampa.Reguest initialized.");
             }
             // Clear previous requests just in case
             if (network && typeof network.clear === 'function') network.clear();
             else console.warn("HanimeComponent: Network clear method not available.");

             if (!network) {
                 console.error("HanimeComponent: Network component not available. Cannot fetch data.");
                 _this.empty("Сетевой компонент недоступен.");
                  if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                  if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                 return;
             }

             const fetchPromises = Object.keys(CATEGORIES).map(key => {
                 const category = CATEGORIES[key];
                 // Create a promise for each category fetch
                 return new Promise((resolve) => { // Use resolve for errors too, so Promise.all doesn't fail fast
                      console.log(`HanimeComponent: Fetching category: ${key} from ${category.fullUrl}`);
                      network.native(category.fullUrl,
                         (data) => {
                            if (data && data.metas && Array.isArray(data.metas)) {
                                 console.log(`HanimeComponent: Successfully fetched ${data.metas.length} items for category ${key}`);
                                resolve({ key: key, data: data.metas });
                            } else {
                                console.warn(`HanimeComponent: Invalid data format for category ${key}`, data);
                                resolve({ key: key, data: [], error: 'Invalid data' }); // Resolve with empty data on format error
                            }
                         },
                         (errorStatus, errorText) => {
                            console.error(`HanimeComponent: Failed to fetch category ${key}. Status: ${errorStatus}`, errorText);
                            resolve({ key: key, data: [], error: `Fetch failed: ${errorStatus}` }); // Resolve with empty data on network error
                         },
                         false,
                         { dataType: 'json', timeout: 15000 }
                     );
                 });
             });

             // Wait for all category fetches to complete
             Promise.all(fetchPromises).then(results => {
                 const dataMap = {};
                 let totalItems = 0;
                 // Process results, store data by category key
                 results.forEach(r => {
                     dataMap[r.key] = r.data;
                     totalItems += r.data.length;
                 });

                 // Build UI with the fetched data
                 if (totalItems > 0) {
                     _this.build(dataMap);
                 } else {
                     _this.empty("Не удалось загрузить данные для всех категорий или каталоги пусты.");
                 }

             }).catch(error => {
                 // This catch block is mainly for errors in Promise.all itself,
                 // not for individual fetch errors which are handled by resolving with data: []
                 console.error("HanimeComponent: Critical error during Promise.all category fetch:", error);
                 _this.empty("Критическая ошибка при загрузке данных.");

             }).finally(() => {
                 // Hide loader and toggle activity regardless of success/failure
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                 console.log("HanimeComponent: fetchCatalog() process completed.");
             });
        };

        this.build = function (dataMap) {
            var _this = this;
             console.log("HanimeComponent: build() - Building UI with fetched data.");

             // Clear previous scrolls and items
             this.clearScrollsAndItems();

             let firstRowKey = null;

             // Iterate through categories in the defined order
             for (const key in CATEGORIES) {
                 if (CATEGORIES.hasOwnProperty(key)) {
                      const category = CATEGORIES[key];
                     const itemsData = dataMap[key] || []; // Get data for this category, default to empty array

                     if (itemsData.length > 0) {
                         console.log(`HanimeComponent: Building row for category: "${category.title}" (${key}) with ${itemsData.length} items.`);

                         // Create DOM structure for one category row
                         const lineHtml = $(`
                             <div class="items-line layer--visible layer--render items-line--type-cards" data-category-key="${key}">
                                 <div class="items-line__head">
                                     <div class="items-line__title">${category.title}</div>
                                 </div>
                                 <div class="items-line__body">
                                     <!-- Horizontal scroll will go here -->
                                 </div>
                             </div>
                         `);

                         // Create a horizontal scroll for the cards in this row
                         const horizontalScroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
                         const cardsContainer = $('<div class="items-cards"></div>');
                         const currentItems = []; // Array to hold HanimeCard instances for this row

                         // Create and append cards to the horizontal scroll's container
                         itemsData.forEach(meta => {
                             // Pass 'this' (the HanimeComponent instance) as componentRef
                             const card = new HanimeCard(meta, _this);
                             const cardElement = card.render();
                             cardsContainer.append(cardElement);
                             currentItems.push(card);
                         });

                         // Store the items and scroll instance for this category
                         rowItems[key] = currentItems;
                         horizontalScroll.append(cardsContainer);
                         lineHtml.find('.items-line__body').append(horizontalScroll.render(true));
                         horizontalScrolls[key] = horizontalScroll;

                         // Append the complete category row to the main vertical scroll
                         verticalScroll.append(lineHtml);

                         // Remember the key of the first row with content for initial focus
                         if (!firstRowKey) {
                             firstRowKey = key;
                         }

                     } else {
                         console.log(`HanimeComponent: Category "${category.title}" (${key}) has no items or failed to load.`);
                         // This category's row will be skipped
                     }
                 }
             }

             // Update the vertical scroll to re-calculate heights/positions after adding rows
             verticalScroll.update();

             // Set the active row for navigation
             if (firstRowKey) {
                  activeRowKey = firstRowKey;
                  console.log("HanimeComponent: Setting initial active row for focus:", activeRowKey);
             } else {
                 // If no categories had items, display empty message
                 _this.empty("Нет доступных категорий с контентом.");
             }

             // Loader and toggle are handled in fetchCatalog's finally block
             // if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
             // if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
             console.log("HanimeComponent: build() process completed.");
        };

         // Helper to clear previous scroll instances and card items
         this.clearScrollsAndItems = function() {
             console.log("HanimeComponent: clearScrollsAndItems()");
             // Destroy all horizontal scrolls
             for (const key in horizontalScrolls) {
                 if (horizontalScrolls.hasOwnProperty(key)) {
                     if (horizontalScrolls[key] && typeof horizontalScrolls[key].destroy === 'function') {
                          horizontalScrolls[key].destroy();
                          console.log(`HanimeComponent: Destroyed horizontal scroll for ${key}.`);
                     }
                 }
             }
             horizontalScrolls = {};

             // Destroy all card items using Lampa's helper
             for (const key in rowItems) {
                 if (rowItems.hasOwnProperty(key)) {
                      if (rowItems[key] && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') {
                          Lampa.Arrays.destroy(rowItems[key]);
                          console.log(`HanimeComponent: Destroyed items array for ${key}.`);
                      } else if (rowItems[key]) {
                          // Fallback destruction if Lampa.Arrays is missing
                           rowItems[key].forEach(item => { if (item && typeof item.destroy === 'function') item.destroy(); });
                           console.warn(`HanimeComponent: Lampa.Arrays.destroy not available. Manually destroying items for ${key}.`);
                      }
                 }
             }
            rowItems = {};
             lastFocusedElements = {}; // Reset last focused elements for all rows
             activeRowKey = null; // Reset active row key

             // Clear vertical scroll content (elements added via append)
             if (verticalScroll && typeof verticalScroll.clear === 'function') {
                 verticalScroll.clear();
                  console.log("HanimeComponent: Cleared vertical scroll content.");
             } else if (verticalScroll && verticalScroll.render()) {
                 // Fallback if clear is not available, manually remove child elements
                 $(verticalScroll.render()).empty();
                 console.warn("HanimeComponent: verticalScroll.clear not available. Manually emptied vertical scroll DOM.");
             }

         }


         // Called by HanimeCard when it gets focus
        this.updateScrollToFocus = function(element) {
             // This is called from a card within an active row.
             // We only need to update the *horizontal* scroll for the active row.
             // The vertical scroll updates when rows are added/removed or explicitly via verticalScroll.update()
             // We also save the last focused element for the *current* active row.

             const currentFocusedElement = Lampa.Controller.item(); // Get the currently focused DOM element from Lampa Controller
             const rowElement = currentFocusedElement ? $(currentFocusedElement).closest('.items-line--type-cards') : null;

             if (rowElement && rowElement.length > 0) {
                  const rowKey = rowElement.data('category-key');

                  if (rowKey && horizontalScrolls[rowKey] && typeof horizontalScrolls[rowKey].update === 'function') {
                       // This is the element receiving focus (element === $(currentFocusedElement) usually)
                       lastFocusedElements[rowKey] = element[0]; // Save the actual DOM element

                       // Update the horizontal scroll for this specific row
                       // Note: Pass the DOM element, not the jQuery object, to Lampa.Scroll.update
                       horizontalScrolls[rowKey].update(element[0], true);
                       // console.log(`HanimeComponent: Saved focus for ${rowKey}. Updated its horizontal scroll.`);

                  } else {
                       console.warn("HanimeComponent: Cannot update horizontal scroll/save focus. Row key, scroll instance, or update method missing for element:", element, "Row key:", rowKey);
                  }
             } else {
                  console.warn("HanimeComponent: updateScrollToFocus called, but element not found within a row element:", element);
             }
        }

        // Called by HanimeCard on Enter press
         this.onCardClick = function(cardData) {
             console.log("HanimeComponent: Card clicked:", cardData.title, "ID:", cardData.id);
            this.fetchStreamAndMeta(cardData.id, cardData);
         }

        // Called by HanimeCard on Long press
         this.showCardContextMenu = function(cardElement, cardData) {
             console.log("HanimeComponent: showCardContextMenu for", cardData.title);
             // Ensure Lampa.Select is available
             if (!(window.Lampa && Lampa.Select && typeof Lampa.Select.show === 'function')) {
                 console.warn("Hanime Component: Lampa.Select component not available to show context menu.");
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Компонент меню недоступен.', 5000);
                 }
                 return;
             }

             var _this = this;

             // Get current focused element name to restore focus after menu
             var enabledControllerName = (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;

             // Get favorite status using Lampa.Favorite component
             var status = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(cardData) : {};

             // Build menu items - check for Lampa.Lang translation
             var menu_favorite = [];
             if(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') {
                 menu_favorite = [
                     { title: Lampa.Lang.translate('title_book'), where: 'book', checkbox: true, checked: status.book },
                     { title: Lampa.Lang.translate('title_like'), where: 'like', checkbox: true, checked: status.like },
                     { title: Lampa.Lang.translate('title_wath'), where: 'wath', checkbox: true, checked: status.wath }, // Use 'wath' as in Lampa's keys
                     // Lampa's history is often handled by Timeline, but Favorite also has a history flag
                     { title: (window.Lampa.Lang.translate('menu_history') || 'History'), where: 'history', checkbox: true, checked: status.history },
                     { title: (window.Lampa.Lang.translate('settings_cub_status') || 'Status'), separator: true }
                     // Add other status options if needed, mapping to Favorite keys like 'look', 'viewed', etc.
                     // Example: { title: Lampa.Lang.translate('title_look'), where: 'look', checkbox: true, checked: status.look },
                 ];
             } else {
                 console.warn("HanimeComponent: Lampa.Lang not available for context menu, using English fallbacks.");
                 menu_favorite = [
                      { title: 'Planned', where: 'book', checkbox: true, checked: status.book },
                     { title: 'Liked', where: 'like', checkbox: true, checked: status.like },
                     { title: 'Watching', where: 'wath', checkbox: true, checked: status.wath },
                     { title: 'History', where: 'history', checkbox: true, checked: status.history },
                     { title: 'Status', separator: true }
                 ];
             }

             Lampa.Select.show({
                 title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('title_action') : 'Action',
                 items: menu_favorite,
                 onBack: ()=>{
                     console.log("HanimeComponent: Context menu back button pressed.");
                     // Restore the controller that was active before the menu opened
                     if (window.Lampa && Lampa.Controller && enabledControllerName) Lampa.Controller.toggle(enabledControllerName);
                     else console.warn("HanimeComponent: Cannot restore controller, name not saved or Lampa.Controller missing.");
                 },
                 // Called when a checkbox item is checked/unchecked
                 onCheck: (itemData)=>{
                     console.log("HanimeComponent: Context menu - checkbox toggled:", itemData.where, "checked:", itemData.checked);
                      // Toggle favorite status using Lampa.Favorite component
                     if(window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function') {
                         Lampa.Favorite.toggle(itemData.where, cardData);
                          // Find the corresponding card object and update its icons
                         // We need the rowItems map to find the card instance
                         let cardObj = null;
                          for (const key in rowItems) {
                               if (rowItems[key]) {
                                   cardObj = rowItems[key].find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                                   if (cardObj) break; // Found it
                               }
                          }
                          if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') {
                              console.log("HanimeComponent: Updating card icons after favorite toggle.");
                              cardObj.updateFavoriteIcons();
                          } else {
                             console.warn("HanimeComponent: Failed to find Card object to update icons after onCheck.");
                          }
                     } else {
                         console.warn("HanimeComponent: Lampa.Favorite component or toggle method not available for onCheck.");
                     }
                     // Menu stays open after check
                 },
                 // Called when any item (checkbox or not) is selected/clicked
                 onSelect: (itemData)=>{
                      console.log("HanimeComponent: Context menu - item selected:", itemData);
                      // If it's a checkbox item, the check was handled by onCheck.
                      // If it's another type of item, handle here.
                      // For favorite menu, onCheck is typically enough.
                      // If you add non-checkbox items, add their logic here.

                      // Close the menu after selection
                      if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                      // Restore controller
                       if (window.Lampa && Lampa.Controller && enabledControllerName) Lampa.Controller.toggle(enabledControllerName);
                       else console.warn("HanimeComponent: Cannot restore controller after menu select, name not saved or Lampa.Controller missing.");
                       console.log("HanimeComponent: Context menu selected and closed.");
                 },
                 // Allows modifying the menu item's appearance (e.g., adding lock icon for premium features)
                  onDraw: (itemElement, itemData) => {
                       // Example: Add a lock icon if the feature is premium and user isn't premium
                       // Check if itemData has a 'collect' property (used by Lampa for collections/favorites)
                       if (itemData.collect && window.Lampa && Lampa.Account && typeof Lampa.Account.hasPremium === 'function' && !Lampa.Account.hasPremium()) {
                            let lockIconTemplate = (window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.has('icon_lock')) ? Lampa.Template.get('icon_lock') : null;
                            if (lockIconTemplate && window.$ && typeof itemElement.find === 'function' && typeof itemElement.append === 'function') {
                                 let wrap = $('<div class="selectbox-item__lock"></div>');
                                 wrap.append($(lockIconTemplate));
                                 // Remove the standard checkbox if this is a premium item
                                 itemElement.find('.selectbox-item__checkbox').remove();
                                 itemElement.append(wrap);

                                 // Override the default 'enter' behavior to show premium info
                                 itemElement.off('hover:enter').on('hover:enter', () => {
                                     console.log("HanimeComponent: Premium menu item selected without premium.");
                                     if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                                      if (window.Lampa && Lampa.Account && typeof Lampa.Account.showCubPremium === 'function') Lampa.Account.showCubPremium();
                                 });
                            } else {
                                 console.warn("Hanime Component: icon_lock template or required Lampa/jQuery methods missing for Premium item draw.");
                            }
                       }
                  }
             });
         };


        this.fetchStreamAndMeta = function (id, meta) {
             var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

             console.log("HanimeComponent: fetchStreamAndMeta for ID:", id);

             // Show loader
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);

             if (!network || typeof network.native !== 'function') {
                 console.error("HanimeComponent: Network component or its native method not available.");
                  if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Сетевой компонент недоступен для загрузки потока.', 5000);
                return;
            }

            // Fetch stream and meta data concurrently
            Promise.all([
                new Promise((resolve, reject) => {
                    if(streamUrl && network) network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                    else reject('Stream URL or Network unavailable');
                }),
                 // Use provided meta if available, otherwise fetch it
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                     if(metaUrl && network) network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                     else reject('Meta URL or Network unavailable');
                 })
            ]).then(([streamData, metaDataResponse]) => {
                 // Hide loader
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);

                const fullMetaData = metaDataResponse ? (metaDataResponse.meta || metaDataResponse) : null;
                console.log("HanimeComponent: Stream data received:", streamData);
                console.log("HanimeComponent: Full Meta Data received:", fullMetaData);

                // Check if stream data is valid and contains streams
                if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0]; // Assuming the first stream is the one to play
                    var finalStreamUrl = streamToPlay ? streamToPlay.url : null;

                    // Apply proxy if needed (e.g., for highwinds CDN)
                    if(finalStreamUrl && PROXY_BASE_URL) {
                         try {
                             var url = new URL(finalStreamUrl);
                             // Check if the hostname matches the one needing proxy
                             if (url.hostname && url.hostname.includes('highwinds-cdn.com')) { // Replace with the actual hostname if different
                                 finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                                 console.log("HanimeComponent: Stream URL proxied:", finalStreamUrl);
                             } else {
                                console.log("HanimeComponent: Stream URL does not require proxy:", finalStreamUrl);
                             }
                         } catch (e) {
                            console.error("HanimeComponent: Failed to parse or proxy stream URL:", e);
                             console.log("HanimeComponent: Using original stream URL due to error:", finalStreamUrl);
                         }
                    } else if (!finalStreamUrl) {
                        console.error("HanimeComponent: No stream URL found in data.");
                         if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Не удалось получить ссылку на поток.', 5000);
                         return; // Stop execution if no stream URL
                    }


                    // Prepare player object
                    var playerObject = {
                        title: fullMetaData ? (fullMetaData.name || fullMetaData.title || 'Без названия') : 'Без названия',
                        url: finalStreamUrl,
                        poster: fullMetaData ? (fullMetaData.poster || fullMetaData.background || '') : '', // Use poster or background for player poster
                        // Include meta data in player object for history/timeline if needed
                        data: fullMetaData
                    };


                    // Launch player
                    if (playerObject.url && window.Lampa && Lampa.Player && typeof Lampa.Player.play === 'function' && typeof Lampa.Player.playlist === 'function') {
                         console.log("HanimeComponent: Launching player with URL:", playerObject.url);
                         Lampa.Player.play(playerObject);
                         Lampa.Player.playlist([playerObject]); // Add to playlist (often required)

                         // Add to history using Lampa.Favorite or Lampa.Timeline
                         if (fullMetaData && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                                // Ensure minimum data is present for history entry
                                const historyMeta = {
                                    id: fullMetaData.id || '',
                                    title: fullMetaData.name || fullMetaData.title || 'Без названия',
                                    poster: fullMetaData.poster || fullMetaData.background || '',
                                    runtime: fullMetaData.runtime, // Can be useful for timeline
                                    year: fullMetaData.year,
                                    original_name: fullMetaData.original_name || '',
                                    // Add other relevant fields from fullMetaData
                                    release_quality: fullMetaData.release_quality || fullMetaData.quality,
                                     vote_average: fullMetaData.vote_average || fullMetaData.vote
                                };
                                // Add to history favorite list (type 'history', item data, unique ID e.g., 100)
                                Lampa.Favorite.add('history', historyMeta, 100); // Using 100 as a fixed type ID for this plugin's history
                                console.log("HanimeComponent: Added item to Lampa history.");

                                // If Lampa.Timeline is available, update watch status there too
                                if (window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.add === 'function') {
                                     try {
                                          // Use Lampa.Timeline.add to record watching
                                          // Status 'continued' is typical when starting to watch
                                          Lampa.Timeline.add(historyMeta, { status: 'continued' });
                                           console.log("HanimeComponent: Added/updated item in Lampa Timeline.");
                                     } catch(e) {
                                          console.error("HanimeComponent: Error adding to Lampa.Timeline:", e);
                                     }
                                } else {
                                     console.warn("HanimeComponent: Lampa.Timeline component not available to update watch status.");
                                }

                                // Update icons on the card if it's still in view
                                // Find the card element by its ID
                                const cardElement = $(`.card[data-id="${historyMeta.id}"]`); // Assuming cards have data-id
                                if (cardElement.length > 0) {
                                     // Find the corresponding card object instance
                                     let cardObjToUpdate = null;
                                     // Iterate through all rowItems to find the card instance
                                     for (const key in rowItems) {
                                        if (rowItems[key]) {
                                             cardObjToUpdate = rowItems[key].find(item => item && item.processedData && item.processedData.id === historyMeta.id);
                                             if (cardObjToUpdate) break;
                                        }
                                     }
                                     if(cardObjToUpdate && typeof cardObjToUpdate.updateFavoriteIcons === 'function') {
                                          cardObjToUpdate.updateFavoriteIcons();
                                           console.log("HanimeComponent: Updated icons on card after adding to history/timeline.");
                                     } else {
                                          console.warn("HanimeComponent: Could not find card object instance to update icons after adding to history.");
                                     }
                                }


                         } else {
                              console.warn("HanimeComponent: Lampa.Favorite or add method not available to add to history.");
                         }

                    } else {
                         console.error("HanimeComponent: Cannot launch player. Missing stream URL, Lampa.Player, or required methods.");
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

        this.empty = function (msg) {
             console.log("HanimeComponent: empty() - Displaying message:", msg);
             // Ensure the main container exists before trying to add empty state
             if (!html) this.buildLayout();
             if (!html) {
                 console.error("HanimeComponent: Cannot show empty state, main html container is null.");
                 // Attempt basic alert if Noty is also missing
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show(msg, 5000);
                  else alert(msg);
                 return; // Cannot proceed without the main container
             }

             // Hide loader if it's still visible
             if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(false);

             // Clear any existing content (rows)
             this.clearScrollsAndItems();
             if (verticalScroll && verticalScroll.render()) {
                 $(verticalScroll.render()).empty(); // Ensure the vertical scroll content is empty
             }

             // Use Lampa.Empty component if available
             if (window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function') {
                 var empty = new Lampa.Empty({ message: msg });
                 const emptyElement = empty.render(true);
                 if(html && typeof html.find === 'function' && typeof html.find('.items-lines').empty === 'function' && typeof html.find('.items-lines').append === 'function') {
                     // Append empty state to the container meant for rows
                     html.find('.items-lines').empty().append(emptyElement);
                      console.log("HanimeComponent: Displaying empty state via Lampa.Empty.");
                 } else {
                     console.error("HanimeComponent: Could not find .items-lines container to place Lampa.Empty element.");
                      // Fallback: append to main html if .items-lines is missing
                      if (html && typeof html.empty === 'function' && typeof html.append === 'function') html.empty().append(emptyElement);
                      else console.error("HanimeComponent: Cannot place Lampa.Empty element, html container or methods missing.");
                 }


                 // Set the 'start' method to the empty component's start for back button handling
                  if (typeof empty.start === 'function') this.start = empty.start;
                  else console.warn("HanimeComponent: Lampa.Empty component instance does not have a start method. Basic controller fallback will be used.");

             } else {
                  console.warn("HanimeComponent: Lampa.Empty component not available. Using basic text fallback.");
                  // Fallback: display message directly in the container
                  if(html && typeof html.find === 'function' && typeof html.find('.items-lines').empty === 'function' && typeof html.find('.items-lines').text === 'function') {
                       html.find('.items-lines').empty().text(msg + ' (Lampa.Empty component недоступен)');
                  } else {
                      // Last resort text display
                      if (html && typeof html.empty === 'function' && typeof html.text === 'function') html.empty().text(msg + ' (Lampa.Empty component недоступен, контейнер недоступен)');
                      else {
                           console.error("HanimeComponent: Cannot display empty message text fallback, html container or methods missing.");
                            if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show(msg + ' (ошибка отображения сообщения)', 5000);
                      }
                  }

                  // Set a basic start method to handle the back button
                   this.start = function() {
                        console.log("HanimeComponent: Fallback start() for empty state. Setting basic Controller.");
                       if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                            Lampa.Controller.add('content', { back: this.back });
                            Lampa.Controller.toggle('content');
                       } else console.warn("HanimeComponent: Lampa.Controller not available for fallback start method.");
                   }.bind(this); // Bind 'this' to ensure 'this.back' works
             }

             // Toggle activity after displaying empty state
             if(this.activity && typeof this.activity.toggle === 'function') this.activity.toggle();
        };


        this.create = function () {
            console.log("HanimeComponent: create()");

             // Initialize network and vertical scroll if not already
             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeComponent: Lampa.Reguest initialized in create().");
              } else if (!network) console.warn("HanimeComponent: Network not initialized in create(), Lampa.Reguest missing.");

             if (!verticalScroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                 // The buildLayout method now initializes the vertical scroll
                  this.buildLayout();
                  console.log("HanimeComponent: buildLayout called in create() to initialize vertical scroll.");
             } else if (!verticalScroll) {
                 console.error("HanimeComponent: Vertical scroll not initialized, buildLayout failed or Lampa.Scroll missing.");
                 this.empty("Ошибка инициализации компонентов.");
                 return; // Stop creation if essential components are missing
             }


             // If buildLayout succeeded and html/verticalScroll exist, fetch data
            if (html && verticalScroll) {
                 console.log("HanimeComponent: buildLayout successful. Proceeding to fetchCatalog.");
                 this.fetchCatalog();
            } else {
                 console.error("HanimeComponent: html or verticalScroll is null after buildLayout. Cannot fetch catalog.");
                 this.empty("Ошибка инициализации интерфейса.");
            }

             console.log("HanimeComponent: create() finished.");
        };

        this.start = function () {
            console.log("HanimeComponent: start()");
             // Check if this activity is the active one in Lampa
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this.activity) {
                console.log("HanimeComponent: start() - Not the currently active activity, skipping controller setup.");
                return;
            }
             console.log("HanimeComponent: start() - Activity is active. Setting up Lampa.Controller.");

            // Check for critical dependencies before setting up controller
            if (!(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function')) {
                 console.error("HanimeComponent: Missing critical Lampa Controller dependencies in start(). Cannot setup main navigation.");
                 // Fallback: add basic controller for back if possible
                 if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                     console.log("HanimeComponent: Attempting to add basic Controller for Back button only.");
                     Lampa.Controller.add('content', { back: this.back });
                     Lampa.Controller.toggle('content');
                 } else console.warn("HanimeComponent: Lampa.Controller unavailable or methods missing, cannot add even basic back handler.");
                 return;
             }

             // The main 'content' controller manages navigation within this component.
             // It will delegate horizontal movement to the active row's collection.
             Lampa.Controller.add('content', {
                 toggle: function () {
                     console.log("HanimeComponent: Controller toggle() called for 'content'.");

                     // Get the DOM element containing all the category rows
                     const rowsContainerElement = verticalScroll ? verticalScroll.render() : null;

                     if (!rowsContainerElement) {
                         console.error("HanimeComponent: Cannot toggle controller, verticalScroll or its render() is null.");
                          Lampa.Controller.collectionSet([]); // Set empty collection if container is missing
                         return;
                     }

                      // The Controller needs the *current* collection of selectable items.
                      // This collection is the set of cards within the *active* horizontal scroll.
                      let currentCollection = [];
                      if (activeRowKey && horizontalScrolls[activeRowKey]) {
                          // Get the DOM element containing cards for the active row
                          const cardsContainerElement = horizontalScrolls[activeRowKey].render();
                           if (cardsContainerElement) {
                               // Find all selectable elements (cards) within this container
                                currentCollection = $(cardsContainerElement).find('.selector');
                                console.log(`HanimeComponent: Controller collectionSet to active row (${activeRowKey}) with ${currentCollection.length} items.`);
                           } else {
                                console.warn(`HanimeComponent: Cards container for active row (${activeRowKey}) is null.`);
                           }
                      } else {
                           console.warn("HanimeComponent: Active row key or horizontal scroll not set/available. Setting empty collection.");
                      }

                      Lampa.Controller.collectionSet(currentCollection);

                     // Determine which element to focus initially
                     let initialFocusElement = null;

                     // 1. Try to focus the last focused element in the active row
                     if (activeRowKey && lastFocusedElements[activeRowKey]) {
                          initialFocusElement = lastFocusedElements[activeRowKey];
                          console.log(`HanimeComponent: Attempting to focus last element in active row ${activeRowKey}.`);
                     }

                     // 2. If no last focused or it's gone, try focusing the first item in the active row
                     if (!initialFocusElement && currentCollection && currentCollection.length > 0) {
                         initialFocusElement = currentCollection[0];
                         console.log(`HanimeComponent: No last element or not found, focusing first element in active row ${activeRowKey}.`);
                     }

                     // 3. If still no focus element, try focusing the first item in the first available row
                     if (!initialFocusElement) {
                         console.warn("HanimeComponent: No focus element found in active row. Searching for first item in any row.");
                         const firstAvailableRowKey = Object.keys(horizontalScrolls).find(key => rowItems[key] && rowItems[key].length > 0);
                         if (firstAvailableRowKey) {
                              activeRowKey = firstAvailableRowKey; // Switch to the first available row
                              const firstItemInFirstRow = horizontalScrolls[activeRowKey].render().find('.selector').first();
                               if(firstItemInFirstRow.length) {
                                   initialFocusElement = firstItemInFirstRow[0];
                                    Lampa.Controller.collectionSet($(horizontalScrolls[activeRowKey].render()).find('.selector')); // Update collection to the new active row
                                    console.log(`HanimeComponent: Switched and focusing first item in first available row ${activeRowKey}.`);
                               } else console.error("HanimeComponent: Cannot find any selectable item to focus in the first available row.");
                         } else {
                              console.error("HanimeComponent: No items found in any category to focus.");
                               if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Нет элементов для фокусировки.', 3000);
                         }
                     }


                     // Finally, set the focus using Lampa.Controller
                     if (initialFocusElement) {
                          Lampa.Controller.collectionFocus($(initialFocusElement)); // Pass jQuery object to collectionFocus
                           // Ensure the vertical scroll is positioned correctly to show the focused item's row
                           const focusedRowElement = $(initialFocusElement).closest('.items-line--type-cards');
                           if (focusedRowElement.length) {
                                verticalScroll.update(focusedRowElement, true);
                           }
                          console.log("HanimeComponent: Controller focus set.");
                     } else {
                          console.warn("HanimeComponent: No element could be found to set initial focus.");
                     }

                 },
                 left: function () {
                     console.log("HanimeComponent: Controller left() called.");
                      // Move left *within* the current active horizontal row's collection
                     if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('left')) {
                         Navigator.move('left');
                          // Update the last focused element for the current row after moving
                         lastFocusedElements[activeRowKey] = Lampa.Controller.item();
                         // The card's hover:focus listener will call updateScrollToFocus which updates the horizontal scroll
                     } else {
                          console.log(`HanimeComponent: Cannot move left within row ${activeRowKey}. At boundary or Navigator unavailable.`);
                          // Optional: Move to menu if at the far left?
                          if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                              // Save current focus before leaving
                              const currentFocused = Lampa.Controller.item();
                              if (currentFocused && activeRowKey) lastFocusedElements[activeRowKey] = currentFocused;
                              Lampa.Controller.toggle('menu');
                             console.log("HanimeComponent: Moved to 'menu' controller from leftmost item.");
                          } else {
                              console.log("HanimeComponent: At leftmost item, cannot move left, and 'menu' controller unavailable.");
                          }
                     }
                 },
                 right: function () {
                      console.log("HanimeComponent: Controller right() called.");
                     // Move right *within* the current active horizontal row's collection
                     if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('right')) {
                         Navigator.move('right');
                         // Update the last focused element for the current row after moving
                         lastFocusedElements[activeRowKey] = Lampa.Controller.item();
                          // The card's hover:focus listener will call updateScrollToFocus which updates the horizontal scroll
                     } else {
                         console.log(`HanimeComponent: Cannot move right within row ${activeRowKey}. At boundary or Navigator unavailable.`);
                         // Standard Lampa behavior is often just to stay focused on the rightmost item.
                     }
                 },
                 up: function () {
                     console.log("HanimeComponent: Controller up() called.");
                     const currentFocused = Lampa.Controller.item(); // Get the currently focused DOM element

                     if (!currentFocused) {
                         console.warn("HanimeComponent: Cannot move up, no current focused item.");
                         // If nothing is focused, maybe try to go to the head?
                          if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('head');
                         return;
                     }

                     // Find the DOM element of the row the current item belongs to
                     const currentRowElement = $(currentFocused).closest('.items-line--type-cards')[0];
                      if (!currentRowElement) {
                           console.warn("HanimeComponent: Cannot move up, current focused item not within a row element.");
                            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('head');
                           return;
                      }

                     // Get all row elements from the vertical scroll
                     const allRows = verticalScroll.render().find('.items-line--type-cards').get();
                     const currentRowIndex = allRows.indexOf(currentRowElement);

                     // Check if there is a row above the current one
                     if (currentRowIndex > 0) {
                         const prevRowIndex = currentRowIndex - 1;
                         const prevRowElement = allRows[prevRowIndex];
                         const prevRowKey = $(prevRowElement).data('category-key');

                         // Ensure the previous row exists and has items/scroll
                         if (prevRowKey && horizontalScrolls[prevRowKey] && rowItems[prevRowKey] && rowItems[prevRowKey].length > 0) {
                             // Save the last focused element in the *current* row before switching
                             lastFocusedElements[activeRowKey] = currentFocused;
                             activeRowKey = prevRowKey; // Switch the active row

                             // Determine the element to focus in the *previous* row
                             let nextFocusedElement = null;
                             // 1. Try to focus the last saved element for the previous row
                             if (lastFocusedElements[activeRowKey]) {
                                  // Find the element in the DOM to ensure it's still valid/present
                                  const savedElement = $(lastFocusedElements[activeRowKey]);
                                   if (savedElement.length && $.contains(prevRowElement, savedElement[0])) {
                                        nextFocusedElement = savedElement[0];
                                        console.log(`HanimeComponent: Moving up to row ${activeRowKey}. Focusing last saved element.`);
                                   } else {
                                        console.log(`HanimeComponent: Moving up to row ${activeRowKey}. Last saved element not found/invalid.`);
                                   }
                             }

                             // 2. If no last saved or invalid, focus the element in the previous row
                             // that is closest horizontally to the current element's position.
                             // Lampa's Navigator handles this positioning logic internally when you set collection.
                             if (!nextFocusedElement) {
                                  // We just need to set the collection to the previous row's items.
                                  // Navigator.move('up') will then handle finding the best element in the new collection.
                                   console.log(`HanimeComponent: Moving up to row ${activeRowKey}. Relying on Navigator for focus.`);
                                   // Set the controller's collection to the items of the new active row
                                  Lampa.Controller.collectionSet($(horizontalScrolls[activeRowKey].render()).find('.selector'));
                                   // Now, let Navigator handle the 'up' move within the *new* collection
                                   // Note: This single Navigator.move('up') might not work as expected if the controller
                                   // has just been toggled to the new collection. It expects to move *from* the previous collection.
                                   // A more robust approach is to manually find the element and use collectionFocus.

                                  // Let's manually find the closest element: Get current element's horizontal position
                                  const currentElementOffsetLeft = $(currentFocused).offset().left;
                                   let closestElement = null;
                                   let minDiff = Infinity;

                                  // Iterate through items in the previous row
                                  const prevRowSelectors = $(horizontalScrolls[activeRowKey].render()).find('.selector');
                                   if (prevRowSelectors.length > 0) {
                                       prevRowSelectors.each((index, elem) => {
                                           const elemOffsetLeft = $(elem).offset().left;
                                            const diff = Math.abs(elemOffsetLeft - currentElementOffsetLeft);
                                            if (diff < minDiff) {
                                                minDiff = diff;
                                                closestElement = elem;
                                            }
                                       });
                                        nextFocusedElement = closestElement;
                                        console.log(`HanimeComponent: Moving up to row ${activeRowKey}. Manually found closest element for focus.`);
                                   } else {
                                       console.warn(`HanimeComponent: Previous row (${activeRowKey}) has no selectable items.`);
                                       // If the previous row has no items, stay on the current row
                                       activeRowKey = $(currentRowElement).data('category-key'); // Revert active row
                                   }
                             }


                             if (nextFocusedElement) {
                                  // Update the controller collection to the new active row's items *before* focusing
                                  Lampa.Controller.collectionSet($(horizontalScrolls[activeRowKey].render()).find('.selector'));
                                   // Set focus on the calculated element in the new row
                                   Lampa.Controller.collectionFocus($(nextFocusedElement));
                                   // Scroll the vertical view to make the new row visible
                                   verticalScroll.update($(prevRowElement), true);
                                   console.log(`HanimeComponent: Successfully moved up to row ${activeRowKey} and focused element.`);
                             } else {
                                 console.warn(`HanimeComponent: Could not find element to focus in row ${activeRowKey} after moving up.`);
                                  // If we couldn't find an element in the previous row, revert the active row key
                                  activeRowKey = $(currentRowElement).data('category-key');
                             }

                         } else {
                              console.warn(`HanimeComponent: Previous row key ${prevRowKey} or horizontal scroll/items not found or empty.`);
                              // If the previous row is invalid or empty, stay on the current row or go to head
                               if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                                   lastFocusedElements[activeRowKey] = currentFocused; // Save focus
                                    Lampa.Controller.toggle('head'); // Go to the head if cannot move up to a valid row
                                   console.log("HanimeComponent: Cannot move up to valid row, moved to 'head'.");
                               } else {
                                   console.log("HanimeComponent: Cannot move up to valid row, and 'head' controller unavailable.");
                               }
                         }

                     } else {
                         // Already at the top row, move to the 'head' controller
                         if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                              lastFocusedElements[activeRowKey] = currentFocused; // Save current focus before leaving
                              Lampa.Controller.toggle('head');
                             console.log("HanimeComponent: Moved up to 'head' controller.");
                         } else {
                             console.log("HanimeComponent: At top row and 'head' controller unavailable.");
                         }
                     }
                 },
                 down: function () {
                     console.log("HanimeComponent: Controller down() called.");
                     const currentFocused = Lampa.Controller.item(); // Get the currently focused DOM element

                     if (!currentFocused) {
                         console.warn("HanimeComponent: Cannot move down, no current focused item.");
                         return;
                     }

                     // Find the DOM element of the row the current item belongs to
                     const currentRowElement = $(currentFocused).closest('.items-line--type-cards')[0];
                      if (!currentRowElement) {
                           console.warn("HanimeComponent: Cannot move down, current focused item not within a row element.");
                           return;
                      }

                     // Get all row elements from the vertical scroll
                     const allRows = verticalScroll.render().find('.items-line--type-cards').get();
                     const currentRowIndex = allRows.indexOf(currentRowElement);

                     // Check if there is a row below the current one
                     if (currentRowIndex < allRows.length - 1) {
                         const nextRowIndex = currentRowIndex + 1;
                         const nextRowElement = allRows[nextRowIndex];
                         const nextRowKey = $(nextRowElement).data('category-key');

                         // Ensure the next row exists and has items/scroll
                         if (nextRowKey && horizontalScrolls[nextRowKey] && rowItems[nextRowKey] && rowItems[nextRowKey].length > 0) {
                             // Save the last focused element in the *current* row before switching
                             lastFocusedElements[activeRowKey] = currentFocused;
                             activeRowKey = nextRowKey; // Switch the active row

                             // Determine the element to focus in the *next* row
                             let nextFocusedElement = null;
                             // 1. Try to focus the last saved element for the next row
                             if (lastFocusedElements[activeRowKey]) {
                                  // Find the element in the DOM to ensure it's still valid/present
                                   const savedElement = $(lastFocusedElements[activeRowKey]);
                                   if (savedElement.length && $.contains(nextRowElement, savedElement[0])) {
                                        nextFocusedElement = savedElement[0];
                                        console.log(`HanimeComponent: Moving down to row ${activeRowKey}. Focusing last saved element.`);
                                   } else {
                                        console.log(`HanimeComponent: Moving down to row ${activeRowKey}. Last saved element not found/invalid.`);
                                   }
                             }

                              // 2. If no last saved or invalid, focus the element in the next row
                              // that is closest horizontally to the current element's position.
                              if (!nextFocusedElement) {
                                   // Manually find the closest element using horizontal position
                                   const currentElementOffsetLeft = $(currentFocused).offset().left;
                                    let closestElement = null;
                                    let minDiff = Infinity;

                                   const nextRowSelectors = $(horizontalScrolls[activeRowKey].render()).find('.selector');
                                    if (nextRowSelectors.length > 0) {
                                        nextRowSelectors.each((index, elem) => {
                                            const elemOffsetLeft = $(elem).offset().left;
                                             const diff = Math.abs(elemOffsetLeft - currentElementOffsetLeft);
                                             if (diff < minDiff) {
                                                 minDiff = diff;
                                                 closestElement = elem;
                                             }
                                        });
                                         nextFocusedElement = closestElement;
                                          console.log(`HanimeComponent: Moving down to row ${activeRowKey}. Manually found closest element for focus.`);
                                    } else {
                                         console.warn(`HanimeComponent: Next row (${activeRowKey}) has no selectable items.`);
                                         // If the next row has no items, stay on the current row
                                         activeRowKey = $(currentRowElement).data('category-key'); // Revert active row
                                    }
                              }


                             if (nextFocusedElement) {
                                  // Update the controller collection to the new active row's items *before* focusing
                                  Lampa.Controller.collectionSet($(horizontalScrolls[activeRowKey].render()).find('.selector'));
                                   // Set focus on the calculated element in the new row
                                   Lampa.Controller.collectionFocus($(nextFocusedElement));
                                   // Scroll the vertical view to make the new row visible
                                   verticalScroll.update($(nextRowElement), true);
                                   console.log(`HanimeComponent: Successfully moved down to row ${activeRowKey} and focused element.`);
                             } else {
                                 console.warn(`HanimeComponent: Could not find element to focus in row ${activeRowKey} after moving down.`);
                                  // If we couldn't find an element in the next row, revert the active row key
                                  activeRowKey = $(currentRowElement).data('category-key');
                             }

                         } else {
                              console.warn(`HanimeComponent: Next row key ${nextRowKey} or horizontal scroll/items not found or empty.`);
                              // Stay on the current row if the next row is invalid or empty
                              console.log("HanimeComponent: At bottommost valid row, cannot move down further.");
                         }
                     } else {
                          console.log("HanimeComponent: At bottom row. Cannot move down further.");
                     }
                 },
                 enter: function () {
                     console.log("HanimeComponent: Controller enter() called.");
                     // The HanimeCard's 'hover:enter' listener already calls onCardClick
                     // If you attach enter directly to the row element, you'd handle it here.
                     // Since we attach it to the card, the card handles the event and calls back to the component.
                     // So, this 'enter' method in the component's Controller isn't strictly necessary if cards handle it.
                     // But it's good practice to have it defined. It can get the focused item and delegate.
                     const currentFocusedElement = Lampa.Controller.item();
                      if (currentFocusedElement) {
                          // Find the associated card instance and trigger its logic or call the component method directly
                          // Assuming cards are selectable elements with data-id or some identifier
                           const cardElement = $(currentFocusedElement);
                           if (cardElement.hasClass('card') || cardElement.hasClass('hanime-card')) {
                               // Find the card object
                               let cardObject = null;
                                for (const key in rowItems) {
                                     if (rowItems[key]) {
                                          cardObject = rowItems[key].find(item => item && typeof item.render === 'function' && item.render(true) === currentFocusedElement);
                                          if (cardObject) break; // Found it
                                     }
                                }
                                if (cardObject && cardObject.processedData) {
                                     console.log("HanimeComponent: Controller received Enter, delegating click for", cardObject.processedData.title);
                                    this.onCardClick(cardObject.processedData); // Delegate to component's click handler
                                } else {
                                     console.warn("HanimeComponent: Controller Enter - Could not find HanimeCard instance for focused element.");
                                }
                           } else {
                                console.warn("HanimeComponent: Controller Enter - Focused element is not a card.");
                           }
                      } else {
                           console.warn("HanimeComponent: Controller Enter - No current focused item.");
                      }
                 }.bind(this), // Bind 'this' to access component methods like onCardClick
                 long: function () {
                     console.log("HanimeComponent: Controller long() called.");
                     // Similar to 'enter', the HanimeCard's 'hover:long' listener already calls showCardContextMenu.
                     // This method can get the focused item and delegate.
                      const currentFocusedElement = Lampa.Controller.item();
                      if (currentFocusedElement) {
                          const cardElement = $(currentFocusedElement);
                           if (cardElement.hasClass('card') || cardElement.hasClass('hanime-card')) {
                                let cardObject = null;
                                for (const key in rowItems) {
                                     if (rowItems[key]) {
                                          cardObject = rowItems[key].find(item => item && typeof item.render === 'function' && item.render(true) === currentFocusedElement);
                                          if (cardObject) break; // Found it
                                     }
                                }
                                if (cardObject && cardObject.processedData) {
                                     console.log("HanimeComponent: Controller received Long Press, delegating context menu for", cardObject.processedData.title);
                                    this.showCardContextMenu(cardElement, cardObject.processedData); // Delegate to component's context menu handler
                                } else {
                                     console.warn("HanimeComponent: Controller Long Press - Could not find HanimeCard instance for focused element.");
                                }
                           } else {
                                console.warn("HanimeComponent: Controller Long Press - Focused element is not a card.");
                           }
                      } else {
                           console.warn("HanimeComponent: Controller Long Press - No current focused item.");
                      }
                 }.bind(this), // Bind 'this'
                 back: this.back // Component's back method handles activity navigation
             });

            // Initial Controller setup
            // collectionSet needs to be called *after* data is built and scrolls are created.
            // The build method finishes and sets activeRowKey.
            // The toggle method (called right after this add) handles the initial collectionSet and focus.
            console.log("HanimeComponent: Controller 'content' added.");

            // Toggle the controller to activate it and set initial focus
            Lampa.Controller.toggle('content');
            console.log("HanimeComponent: Controller 'content' toggled.");

        };

        this.pause = function () {
             console.log("HanimeComponent: pause()");
             // Save the last focused element for the *current* active row
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') {
                 const currentFocused = Lampa.Controller.item();
                 if (currentFocused && activeRowKey) {
                      lastFocusedElements[activeRowKey] = currentFocused;
                      console.log(`HanimeComponent: Activity paused. Saved last focused DOM item for row ${activeRowKey}.`);
                 } else {
                      console.log("HanimeComponent: Pause called, but no item focused or active row key missing. Last focus not saved.");
                 }
             } else {
                  console.log("HanimeComponent: Pause called, but content controller not active or Controller.item missing. Last focus not saved.");
             }
        };

        this.stop = function () {
             console.log("HanimeComponent: stop()");
            // Stop is called when the activity is fully stopped, not just paused.
            // Clean up resources here if they shouldn't persist (e.g., network requests).
            // Full destruction happens in this.destroy().
        };

        this.render = function () {
             console.log("HanimeComponent: render() called.");
             // Build the layout if it hasn't been already
            if (!html) {
                 console.log("HanimeComponent: html is null, calling buildLayout from render.");
                 this.buildLayout();
            }
             // Return the main container element
            return html;
        };

        this.destroy = function () {
            console.log("HanimeComponent: destroy() called. Performing cleanup.");

            // Clear any pending network requests
            if(network && typeof network.clear === 'function') network.clear(); network = null;
             console.log("HanimeComponent: Network cleared.");

             // Clear and destroy all horizontal scrolls and card items
             this.clearScrollsAndItems();
             console.log("HanimeComponent: Horizontal scrolls and items cleared/destroyed.");

             // Destroy the main vertical scroll
             if (verticalScroll && typeof verticalScroll.destroy === 'function') {
                 verticalScroll.destroy();
                 console.log("HanimeComponent: Destroyed vertical scroll instance.");
             }
             verticalScroll = null;

             // Remove the main HTML element from the DOM
             if (html && typeof html.remove === 'function') {
                 html.remove();
                 console.log("HanimeComponent: Removed main html element from DOM.");
             }
            html = null; // Nullify the reference

            // Remove the controller for this component
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function') {
                 // Before removing, clear its collection if it's the active controller
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.collectionSet === 'function') {
                      Lampa.Controller.collectionSet([]);
                       console.log("HanimeComponent: Controller collection set empty before removal.");
                 }
                 Lampa.Controller.remove('content');
                  console.log("HanimeComponent: Controller 'content' removed.");
            } else console.warn("HanimeComponent: Lampa.Controller not available or remove method missing for cleanup in destroy.");

             // Ensure componentObject reference is cleared if needed, though Lampa usually manages this
             componentObject = null;

            console.log("HanimeComponent: destroy() finished. All resources released.");
        };

        this.back = function () {
             console.log("HanimeComponent: back() called. Attempting Activity.backward().");
             // Use Lampa's Activity component to navigate back
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') {
                 Lampa.Activity.backward();
             } else {
                  console.warn("HanimeComponent: Lampa.Activity or backward method missing for navigation.");
                  // Fallback: try to navigate back via browser history (less reliable in Lampa environment)
                  if(window.history && typeof window.history.back === 'function') window.history.back();
                  else console.warn("HanimeComponent: Browser history back also unavailable.");
             }
        };
    }

    // =========================================================================
    // Plugin Initialization
    // =========================================================================
    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() invoked.");

         // Prevent double initialization
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: global plugin_hanime_catalog_ready flag already set. Skipping initialization.");
             return;
         }

        function initializeLampaDependencies() {
             console.log("Hanime Plugin: initializeLampaDependencies() called (Lampa appready event or fallback).");

             // Perform crucial checks for Lampa core components and dependencies
             if (!window.Lampa || typeof window.Lampa !== 'object') { console.error("Hanime Plugin: CRITICAL: Lampa object not found."); return; }
             if (!Lampa.Template || typeof Lampa.Template !== 'object' || typeof Lampa.Template.add !== 'function') { console.error("Hanime Plugin: CRITICAL: Lampa.Template or add method missing."); return; }
             if (!Lampa.Component || typeof Lampa.Component !== 'object' || typeof Lampa.Component.add !== 'function') { console.error("Hanime Plugin: CRITICAL: Lampa.Component or add method missing."); return; }
             if (!Lampa.Activity || typeof Lampa.Activity !== 'object' || typeof Lampa.Activity.push !== 'function') { console.error("Hanime Plugin: CRITICAL: Lampa.Activity or push method missing."); return; }
             if (!Lampa.Controller || typeof Lampa.Controller !== 'object' || typeof Lampa.Controller.add !== 'function') { console.error("Hanime Plugin: CRITICAL: Lampa.Controller or add method missing."); return; }
             if (!window.$ || typeof window.$ !== 'function') { console.error("Hanime Plugin: CRITICAL: jQuery ($) not found."); return; }
             if (!Lampa.Scroll || typeof Lampa.Scroll !== 'function') { console.error("Hanime Plugin: CRITICAL: Lampa.Scroll component missing."); return; }
             if (!Lampa.Reguest || typeof Lampa.Reguest !== 'function') { console.error("Hanime Plugin: CRITICAL: Lampa.Reguest component missing."); return; }

             console.log("Hanime Plugin: All critical Lampa components checked OK. Proceeding.");

             // Set the ready flag to prevent re-initialization
              if (!window.plugin_hanime_catalog_ready) {
                 window.plugin_hanime_catalog_ready = true;
                 console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag set.");
              } else {
                   console.warn("Hanime Plugin: Plugin flag was unexpectedly set before full initialization logic. Possible double load issue?");
                   return; // Exit if flag was already set before this point
              }


             console.log("Hanime Plugin: Adding standard template fallbacks and custom card template...");

             // Add standard templates that might be needed but not always present
             if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                 Lampa.Template.add('card_vote_temp', '<div class="card__vote"></div>');
                 Lampa.Template.add('card_quality_temp', '<div class="card__quality"><div></div></div>');
                 Lampa.Template.add('card_year_temp', '<div class="card__age"></div>');
                 Lampa.Template.add('card_type_temp', '<div class="card__type"></div>');
                 Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
                  console.log("Hanime Plugin: Standard template fallbacks added.");

                  // Add the custom card template
                 Lampa.Template.add('hanime-card', `
                     <div class="hanime-card card selector layer--visible layer--render">
                         <div class="card__view">
                             <img src="./img/img_load.svg" class="card__img" alt="{title}" loading="lazy" />
                             <div class="card__icons">
                                 <div class="card__icons-inner"></div>
                             </div>
                             <!-- Adding placeholders for potential dynamic elements -->
                             <!-- These will be filled or removed by HanimeCard.addDetails -->
                             <div class="card__vote"></div>
                             <div class="card__quality"><div></div></div>
                             <div class="card__type"></div>
                             <div class="card__marker"><span></span></div> <!-- Placeholder for watch status marker -->
                         </div>
                         <div class="card__title">{title}</div>
                         <div class="card__age"></div> <!-- Placeholder for year -->
                     </div>
                 `);
                  console.log("Hanime Plugin: HanimeCard template added.");

             } else {
                  console.error("Hanime Plugin: Lampa.Template.add method not available. Cannot add templates.");
             }


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

             // Add custom CSS for layout if needed (adjust as per your Lampa setup)
             // IMPORTANT: Verify these styles don't conflict with your Lampa version.
             // This block is COMMENTED OUT by default, relying on Lampa's standard styling.
             // If you need specific styles for vertical scrolling/rows, uncomment and test carefully.
             /*
             console.log("Hanime Plugin: Adding custom CSS...");
             const customCss = `
                .hanime-catalog-component .items-lines {
                     display: flex;
                     flex-direction: column; // Stack rows vertically
                     padding: 2rem; // Example padding, adjust as needed
                     box-sizing: border-box;
                 }
                .hanime-catalog-component .items-line {
                    margin-bottom: 2rem; // Space between rows
                }
                .hanime-catalog-component .items-line__body {
                     overflow: hidden; // Important for horizontal scroll within the row
                 }
                .hanime-catalog-component .items-cards {
                    display: flex; // Cards within a row are flex items
                 }
                .hanime-card {
                    margin-right: 1.4rem; // Space between cards horizontally
                 }
                .hanime-card:last-child {
                    margin-right: 0; // No margin on the last card
                 }
                // Add styles for card__vote, card__quality, card__type, card__age, card__marker
                // if they are not already defined in Lampa's main CSS and you added them dynamically
                // or want to override their appearance.
                // Example:
                // .hanime-card .card__vote,
                // .hanime-card .card__quality,
                // .hanime-card .card__type,
                // .hanime-card .card__age {
                //      position: absolute;
                //      z-index: 1;
                //      font-size: 0.8rem;
                //      padding: 0.2rem 0.4rem;
                //      background: rgba(0,0,0,0.7);
                //      color: #fff;
                //      border-radius: 0.3rem;
                // }
                // .hanime-card .card__vote { top: 0.5rem; left: 0.5rem; }
                // .hanime-card .card__quality { top: 0.5rem; right: 0.5rem; }
                // .hanime-card .card__type { bottom: 0.5rem; left: 0.5rem; }
                // .hanime-card .card__age { bottom: 0.5rem; right: 0.5rem; }
                // .hanime-card .card__marker {
                //    position: absolute;
                //    top: 0.5rem;
                //    left: 50%;
                //    transform: translateX(-50%);
                //    z-index: 2;
                //    padding: 0.2rem 0.4rem;
                //    background: #f00; // Example color
                //    color: #fff;
                //    border-radius: 0.3rem;
                //    font-size: 0.8rem;
                // }
             `;
             // Append the CSS to the document head
             if (window.$ && typeof $('head').append === 'function') {
                  $('head').append('<style id="hanime-catalog-plugin-styles">' + customCss + '</style>');
                  console.log("Hanime Plugin: Custom CSS added.");
             } else {
                  console.warn("Hanime Plugin: Cannot add custom CSS, jQuery or head element missing.");
             }
             */


             console.log("Hanime Plugin: Calling addMenuItem()...");
             addMenuItem(); // Add the menu item to Lampa's main menu
              console.log("Hanime Plugin: initializeLampaDependencies() finished.");
        }

        function addMenuItem() {
             console.log("Hanime Plugin: addMenuItem() called.");

             // Check if essential Lampa components and DOM elements are available
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Component || typeof Lampa.Component.get !== 'function') {
                  console.warn("Hanime Plugin: addMenuItem cannot proceed. Missing Lampa core components, jQuery, or Component.get.");
                  return;
             }

             // Find the main menu list element
             var menuList = $('.menu .menu__list').eq(0);
             if (!menuList.length) {
                 console.warn("Hanime Plugin: addMenuItem cannot proceed. Lampa menu DOM structure ('.menu .menu__list') not found.");
                 return;
             }
             console.log("Hanime Plugin: Lampa menu list found.");

             // Check if our component is registered
             var ourComponentRegistered = Lampa.Component.get('hanime_catalog');
             if (!ourComponentRegistered) {
                 console.warn("Hanime Plugin: addMenuItem skipping - Component 'hanime_catalog' is not found/registered in Lampa.Component.");
                 return;
             }
             console.log("Hanime Plugin: Component 'hanime_catalog' confirmed registered.");


             // Check if the menu item already exists to prevent duplicates
             // Use a more specific selector or attribute if possible, but text is a fallback
             if (menuList.find('.menu__text:contains("Hanime Catalog")').length > 0) {
                 console.log("Hanime Plugin: Menu item with text 'Hanime Catalog' already exists in DOM. Skipping addMenuItem.");
                 return;
             }
             console.log("Hanime Plugin: Adding menu item DOM element to Lampa menu.");

            // Create the menu item DOM element
            var menu_item = $(`
                <li class="menu__item selector">
                    <div class="menu__ico">
                        <!-- Simple play icon - replace with a custom one if desired -->
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">Hanime Catalog</div>
                </li>
            `);

            // Attach the event listener to launch the activity
            if (typeof menu_item.on === 'function') {
                menu_item.on('hover:enter', function () {
                     console.log("Hanime Plugin: Menu item 'Hanime Catalog' activated via 'hover:enter'. Pushing activity.");
                     // Push our component as a new activity
                     if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.push === 'function') {
                         Lampa.Activity.push({
                             url: '', // Not strictly needed for a component activity
                             title: 'Hanime Catalog', // Title for the activity header
                             component: 'hanime_catalog', // The registered name of our component
                             page: 1 // Starting page, might be useful for pagination later
                         });
                          console.log("Hanime Plugin: Lampa.Activity.push called for hanime_catalog component.");
                     } else {
                          console.warn("Hanime Plugin: Lampa.Activity or push method unavailable to launch activity.");
                         if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Не удалось запустить активность.', 5000);
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

         // Check if the plugin is already marked as ready
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag is ALREADY SET upon initial execution. Skipping entire startPlugin execution to prevent double init.");
             return;
         }

         // Wait for Lampa to be ready using Lampa.Listener (preferred method)
         // Check if Lampa and Lampa.Listener are available
         if (window.Lampa && typeof window.Lampa !== 'object' || !Lampa.Listener || typeof Lampa.Listener !== 'object' || typeof Lampa.Listener.follow !== 'function') {
              console.warn("Hanime Plugin: Lampa or Lampa.Listener not available or methods missing. Checking appready flag directly or scheduling delayed start as fallback.");

              // Fallback: Check Lampa's global appready flag directly
              if (window.appready && typeof window.appready === 'boolean' && window.appready) {
                  console.log("Hanime Plugin: Lampa 'appready' flag found true. Calling initializeLampaDependencies directly as fallback.");
                  initializeLampaDependencies();
              } else {
                   // Less reliable fallback: Schedule delayed initialization.
                   // This might fail if Lampa takes longer to load or if the DOM isn't fully ready.
                   console.error("Hanime Plugin: Neither Lampa Listener nor 'appready' flag available immediately. Cannot reliably wait. Attempting delayed initialization as a HIGHLY UNRELIABLE fallback.");
                   setTimeout(initializeLampaDependencies, 1000); // Wait 1 second
                   console.log("Hanime Plugin: Delayed initialization fallback scheduled.");
              }

         } else {
             // Use Lampa.Listener to wait for the 'app:ready' event
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

    // Execute the startPlugin function to begin the initialization process
    startPlugin();

})();
