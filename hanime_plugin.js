(function () {
    'use strict';

    // Define the API base URL and the categories with their titles and relative URLs
    // These are now global within the IIFE and used by the main screen component.
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


    // HanimeCard remains the same - it represents a single card UI element
    function HanimeCard(data, componentRef) { // componentRef will be the HanimeLineComponent instance
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

        var cardElement = $(cardTemplate);

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
                          console.warn("HanimeCard: Created .card__age element dynamically. Prefer including in template.");
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
             if(Object.keys(status).length === 0 && window.Lampa && Lampa.Favorite) console.warn("HanimeCard: Lampa.Favorite.check returned empty status for", processedData.title, ". Data:", processedData);

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
                      imgElement[0].onload = () => { cardElement.addClass('card--loaded'); console.log("HanimeCard: Image loaded (basic):", src); };
                     imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error (basic):', src); imgElement.attr('src', './img/img_broken.svg'); };
                     imgElement.attr('src', src || './img/img_broken.svg');
                 }
             } else {
             }

            this.updateFavoriteIcons();
        }

        this.create = function(){
             if (cardElement.data('created')) {
                 return;
             }

             if (typeof cardElement.on === 'function') {
                cardElement.on('hover:focus', function () {
                     // Delegate scroll update to the parent component (HanimeLineComponent)
                     if (componentRef && componentRef.updateScrollToFocus && typeof componentRef.updateScrollToFocus === 'function') {
                          componentRef.updateScrollToFocus(cardElement);
                     }
                     this.update(); // Update card icons/details on focus
                }.bind(this));

                 cardElement.on('hover:enter', function () {
                     // Delegate click event to the parent component
                     if (componentRef && componentRef.onCardClick && typeof componentRef.onCardClick === 'function') {
                         componentRef.onCardClick(processedData);
                     }
                }.bind(this));

                cardElement.on('hover:long', function(){
                     // Delegate long press event to the parent component
                     if (componentRef && componentRef.showCardContextMenu && typeof componentRef.showCardContextMenu === 'function') {
                          componentRef.showCardContextMenu(cardElement, processedData);
                     }
                 }.bind(this));
             } else {
                 console.warn("HanimeCard: jQuery on() method not available to attach hover events.");
             }

             this.card = cardElement[0];
             if (this.card && typeof this.card.addEventListener === 'function') {
                this.card.addEventListener('visible', this.onVisible.bind(this));
             } else {
                 console.warn("HanimeCard: Cannot attach 'visible' event listener, native element or addEventListener not available.");
             }

             setTimeout(() => {
                  this.addDetails();
                  this.update();
             }, 0);

             cardElement.data('created', true);
        }

        this.update = function(){
            this.updateFavoriteIcons();
             // Lampa's watched_status might rely on data attributes or classes added directly.
             // If needed, uncomment and ensure it works with the cardElement structure.
             // if(window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched_status === 'function') Lampa.Timeline.watched_status(cardElement, processedData);
             // else console.warn("HanimeCard: Cannot update watched status, Lampa.Timeline not available or method missing.");
        }

        this.render = function(js){
             if (!cardElement.data('created')) {
                 this.create();
             }
            return js ? cardElement[0] : cardElement;
        }

        this.destroy = function(){
             if(this.card && typeof this.card.removeEventListener === 'function' && this.onVisible) this.card.removeEventListener('visible', this.onVisible.bind(this));
             if(cardElement && typeof cardElement.remove === 'function') cardElement.remove();
             processedData = null; cardElement = null; this.card = null; componentRef = null;
        }
    }

    // HanimeLineComponent - Represents a single horizontal line of cards for one category
    function HanimeLineComponent(categoryKey, categoryTitle, onCardClick, showCardContextMenu, componentRef) {
        var network = null;
        var scroll = null;

        var items = []; // Array of HanimeCard instances
        var html = null; // The main items-line element
        var itemsContainer = null; // The items-cards element inside scroll

        var lastFocusedCardElement = null; // Keep track of last focused card in this line

        var currentCategoryUrl = API_BASE_URL + CATEGORIES[categoryKey].url;
        var currentTitle = categoryTitle;

        // Reference to the parent component (HanimeCatalogScreen)
        var parentComponentRef = componentRef;

        // Callbacks delegated from parent
        var cardClickHandler = onCardClick;
        var cardContextMenuHandler = showCardContextMenu;


        this.buildLayout = function() {
            html = $(`
                <div class="items-line layer--visible layer--render items-line--type-cards">
                    <div class="items-line__head">
                        <div class="items-line__title">${currentTitle}</div> <!-- Use dynamic title -->
                    </div>
                    <div class="items-line__body">
                    </div>
                </div>
            `);
             itemsContainer = $('<div class="items-cards"></div>');
        };

        this.fetchCatalog = function () {
            var _this = this;
             // Use parent's loader if available, otherwise log a warning
             if(parentComponentRef && parentComponentRef.activity && typeof parentComponentRef.activity.loader === 'function') parentComponentRef.activity.loader(true);
             else console.warn("HanimeLineComponent: Parent activity loader not available in fetchCatalog for", categoryKey);

             console.log("HanimeLineComponent:", categoryKey, "- Starting request to", currentCategoryUrl);

             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeLineComponent:", categoryKey, "- Lampa.Reguest initialized.");
             }

             if (network && typeof network.clear === 'function') network.clear();
             else console.warn("HanimeLineComponent:", categoryKey, "- Network clear method not available.");

             if(network && currentCategoryUrl && typeof network.native === 'function'){
                network.native(currentCategoryUrl, // Use dynamic URL
                    function (data) {
                        if (data && data.metas && Array.isArray(data.metas)) {
                             if (data.metas.length > 0) {
                                _this.build(data.metas);
                             } else {
                                _this.empty("Каталог пуст.");
                             }
                        } else {
                            _this.empty("Неверный формат данных от API.");
                            console.error("HanimeLineComponent:", categoryKey, "- Invalid data format from API.", data);
                        }
                    },
                    function (errorStatus, errorText) {
                        _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                        console.error("HanimeLineComponent:", categoryKey, "- Failed to load catalog.", errorStatus, errorText);
                    },
                    false,
                    { dataType: 'json', timeout: 15000 }
                );
             } else {
                 console.error("HanimeLineComponent:", categoryKey, "- Cannot fetch catalog. Network component, currentCategoryUrl, or network.native missing.");
                  _this.empty("Не удалось загрузить каталог. Ошибка инициализации сети.");
             }
        };

        this.build = function (result) {
            var _this = this;
             console.log("HanimeLineComponent:", categoryKey, "- build() - Building UI with", result.length, "items.");

             // Horizontal scroll for this line
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                  scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
                  console.log("HanimeLineComponent:", categoryKey, "- Lampa.Scroll initialized (horizontal).");
             }

             if(scroll && typeof scroll.minus === 'function') scroll.minus(); // Reset scroll position
             else console.warn("HanimeLineComponent:", categoryKey, "- Scroll or scroll.minus method not available in build(). Cannot scroll to beginning.");

             if (!(itemsContainer && typeof itemsContainer.empty === 'function' && scroll && html && typeof html.find === 'function' && typeof html.append === 'function' && typeof scroll.append === 'function' && typeof scroll.render === 'function')) {
                  console.error("HanimeLineComponent:", categoryKey, "- Missing critical DOM/Lampa dependencies in build(). Aborting UI build.");
                   if (parentComponentRef && parentComponentRef.activity && typeof parentComponentRef.activity.loader === 'function') parentComponentRef.activity.loader(false);
                  _this.empty("Не удалось построить интерфейс.");
                  return;
             }

            itemsContainer.empty();
            // Explicitly destroy previous card objects if any
            if (items && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') {
                 Lampa.Arrays.destroy(items);
            }
            items = []; // Reset items array

            if(itemsContainer && scroll && window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function') {
                 result.forEach(function (meta) {
                    // Pass this HanimeLineComponent instance as the componentRef to the HanimeCard
                    var card = new HanimeCard(meta, _this);
                    var cardElement = card.render();

                     itemsContainer.append(cardElement);
                    items.push(card);
                });
                 console.log("HanimeLineComponent:", categoryKey, "- Created and added", items.length, "cards to itemsContainer.");

                scroll.append(itemsContainer);

                // Replace the items-line__body content with the scroll element
                html.find('.items-line__body').empty().append(scroll.render(true));

            } else {
                console.error("HanimeLineComponent:", categoryKey, "- Missing required objects or methods before building cards in build().");
                if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина при создании карточек.', 5000);
                  }
            }

            // Notify the parent that this line is ready/loaded
            if(parentComponentRef && typeof parentComponentRef.lineLoaded === 'function') {
                 parentComponentRef.lineLoaded(categoryKey, this.getCardsElements());
            } else {
                 console.warn("HanimeLineComponent:", categoryKey, "- Parent component or lineLoaded method not available to notify.");
                 // If parent notification fails, try to hide loader directly (less ideal)
                 if (parentComponentRef && parentComponentRef.activity && typeof parentComponentRef.activity.loader === 'function') parentComponentRef.activity.loader(false);
                  // If parent notification fails, we can't accurately know when *all* lines are ready to toggle activity.
                  // The parent component is responsible for the overall activity toggle.
            }

             console.log("HanimeLineComponent:", categoryKey, "- Build process completed.");
        };

         // Delegate card click up to the parent screen component
         this.onCardClick = function(cardData) {
             console.log("HanimeLineComponent:", categoryKey, "- Card click delegated to parent:", cardData.title);
             if(typeof cardClickHandler === 'function') {
                 cardClickHandler(cardData);
             } else {
                  console.warn("HanimeLineComponent:", categoryKey, "- Card click handler not provided by parent.");
             }
         };

         // Delegate context menu request up to the parent screen component
         this.showCardContextMenu = function(cardElement, cardData) {
             console.log("HanimeLineComponent:", categoryKey, "- Show context menu delegated to parent for", cardData.title);
             if(typeof cardContextMenuHandler === 'function') {
                 cardContextMenuHandler(cardElement, cardData);
             } else {
                  console.warn("HanimeLineComponent:", categoryKey, "- Context menu handler not provided by parent.");
             }
         };


        this.updateScrollToFocus = function(element) {
             // Update this line's horizontal scroll
             if (scroll && typeof scroll.update === 'function' && element && typeof element.length === 'number' && element.length > 0) {
                lastFocusedCardElement = element[0]; // Save last focused element *within this line*
                scroll.update(element, true);
                console.log("HanimeLineComponent:", categoryKey, "- Horizontal scroll updated to focused element.");
            } else {
                console.warn("HanimeLineComponent:", categoryKey, "- Scroll instance or update method, or valid element missing to scroll.");
            }
            // No need to notify parent for vertical scroll here, Controller handles vertical movement between lines
        }

        this.empty = function (msg) {
             console.log("HanimeLineComponent:", categoryKey, "- empty() - Displaying message:", msg);
             // Note: Displaying an empty state for a single line within a screen might look odd.
             // This might need refinement depending on UI requirements.
             // For now, it replaces the cards body with the message.
             if (window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function') {
                 var empty = new Lampa.Empty({ message: msg });
                 // Append the empty element directly into the items-line body instead of the scroll
                 if(html && typeof html.find === 'function') {
                     html.find('.items-line__body').empty().append(empty.render(true));
                     console.log("HanimeLineComponent:", categoryKey, "- Displaying empty state via Lampa.Empty.");
                     // Lampa.Empty component might have its own start/stop/destroy methods.
                     // We might need to manage these instances. For now, just rendering.
                 } else {
                     console.warn("HanimeLineComponent:", categoryKey, "- Html container or its methods missing to show empty state.");
                 }

             } else {
                  console.warn("HanimeLineComponent:", categoryKey, "- Lampa.Empty component not available. Using basic text fallback.");
                  if(html && typeof html.find === 'function') {
                      html.find('.items-line__body').empty().text(msg + ' (Компонент Empty недоступен в Lampa)');
                  }
             }

             // Notify parent even if empty
             if(parentComponentRef && typeof parentComponentRef.lineLoaded === 'function') {
                 parentComponentRef.lineLoaded(categoryKey, []); // Pass empty array of cards
             } else {
                  console.warn("HanimeLineComponent:", categoryKey, "- Parent component or lineLoaded method not available to notify (empty).");
                  if (parentComponentRef && parentComponentRef.activity && typeof parentComponentRef.activity.loader === 'function') parentComponentRef.activity.loader(false);
             }
             console.log("HanimeLineComponent:", categoryKey, "- empty() finished.");
        };

        this.create = function () {
            console.log("HanimeLineComponent:", categoryKey, "- create()");
             // Scroll and network are initialized here or in fetchCatalog if null
              if (!network && window.Lampa && typeof Lampa.Reguest === 'function') { network = new Lampa.Reguest(); }
              if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                  scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
              }

            this.buildLayout();
            this.fetchCatalog();
             console.log("HanimeLineComponent:", categoryKey, "- create() finished. Fetching catalog initiated.");
        };

         // This start method is mainly for internal state/setup of the line, not the main Lampa Controller
         // The main controller is managed by the parent HanimeCatalogScreen
        this.start = function () {
             console.log("HanimeLineComponent:", categoryKey, "- start() called. This component doesn't manage the main Controller.");
             // No need to toggle main controller here.
             // The parent screen component handles the main 'content' controller and focuses the collection.
             // When the parent focuses on an element within this line, the HanimeCard's hover:focus will trigger updateScrollToFocus.
        };

        this.pause = function () {
             console.log("HanimeLineComponent:", categoryKey, "- pause() called.");
             // No specific pause logic needed within the line component itself, as Controller is managed by parent.
             // Last focused element within the line is tracked by lastFocusedCardElement.
        };

        this.stop = function () {
             console.log("HanimeLineComponent:", categoryKey, "- stop() called.");
        };

        this.render = function () {
            // Returns the main DOM element for this line
            if (!html) {
                 this.buildLayout();
            }
            return html;
        };

         // Returns an array of the actual DOM card elements for the parent to use in the Controller collection
         this.getCardsElements = function() {
             if (itemsContainer) {
                 return itemsContainer.find('.card').toArray();
             }
             return [];
         };

         // Method to give focus to the first card in this line, called by the parent
         this.focus = function() {
             if (itemsContainer) {
                  let firstCard = itemsContainer.find('.card').first();
                  if (firstCard.length) {
                       // Use Lampa.Controller.focus if available, otherwise trigger hover:focus manually
                       if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.focus === 'function') {
                           Lampa.Controller.focus(firstCard[0]); // Focus the native DOM element
                       } else {
                           firstCard.trigger('hover:focus'); // Manual trigger
                           console.warn("HanimeLineComponent:", categoryKey, "- Lampa.Controller.focus not available, triggering hover:focus manually.");
                       }
                       lastFocusedCardElement = firstCard[0]; // Update last focused
                       console.log("HanimeLineComponent:", categoryKey, "- Focused first card.");
                       return true; // Successfully focused
                  }
             }
              console.log("HanimeLineComponent:", categoryKey, "- No cards to focus.");
              return false; // Failed to focus
         }

         // Method to get the last focused element in this line, used by the parent
         this.getLastFocused = function() {
             return lastFocusedCardElement;
         }


        this.destroy = function () {
            console.log("HanimeLineComponent:", categoryKey, "- destroy() called.");
            if(network && typeof network.clear === 'function') network.clear(); network = null;

             // Destroy card instances explicitly
             if (items && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') {
                 Lampa.Arrays.destroy(items);
                 console.log("HanimeLineComponent:", categoryKey, "- Destroyed items array.");
             }
            items = null;

             // Destroy horizontal scroll instance
             if (scroll && typeof scroll.destroy === 'function') {
                 scroll.destroy();
                 console.log("HanimeLineComponent:", categoryKey, "- Destroyed scroll instance.");
             }
             scroll = null;

             // Remove main DOM element
             if (html && typeof html.remove === 'function') {
                 html.remove();
                 console.log("HanimeLineComponent:", categoryKey, "- Removed html element from DOM.");
             }
            html = null; itemsContainer = null; lastFocusedCardElement = null;

            console.log("HanimeLineComponent:", categoryKey, "- destroy() finished.");
        };
    }


    // HanimeCatalogScreen - Represents the main screen containing multiple category lines
    function HanimeCatalogScreen(componentObject) {
         var _this = this; // Keep reference to the screen component instance

         var verticalScroll = null; // Vertical scroll for the main screen
         var mainHtml = null; // Main container element for the screen

         // Array to hold instances of HanimeLineComponent
         var lineComponents = [];
         // Map to store line components by category key for easy access
         var lineComponentsMap = {};

         var allCardsCollection = []; // Array to hold all card DOM elements for the main Controller collection
         var lastFocusedElement = null; // Last focused DOM element on the entire screen

         // Track how many lines are expected vs how many have loaded/failed
         var expectedLines = Object.keys(CATEGORIES).length;
         var loadedLinesCount = 0;
         var loadingIndicator = (componentObject && componentObject.activity && typeof componentObject.activity.loader === 'function') ? componentObject.activity.loader : null;
         var activityToggler = (componentObject && componentObject.activity && typeof componentObject.activity.toggle === 'function') ? componentObject.activity.toggle : null;


        this.buildLayout = function() {
            mainHtml = $(`
                <div class="hanime-catalog-screen layer--visible layer--render">
                    <!-- Vertical scroll will go here -->
                </div>
            `);

            // Initialize the main vertical scroll
            if (!verticalScroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                 verticalScroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'vertical' });
                 console.log("HanimeCatalogScreen: Lampa.Scroll initialized (vertical).");
                 mainHtml.append(verticalScroll.render(true)); // Add vertical scroll DOM to main html
            } else {
                 console.error("HanimeCatalogScreen: Lampa.Scroll component missing. Cannot build vertical scroll layout.");
                 if (loadingIndicator) loadingIndicator(false);
                 // Fallback: Show a basic message or empty state if scrolling is impossible
                 if (window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function') {
                     let empty = new Lampa.Empty({ message: "Не удалось создать компонент прокрутки. Обновите Lampa." });
                     mainHtml.empty().append(empty.render(true));
                     this.start = empty.start; // Use Empty's start method for basic navigation
                 } else {
                      mainHtml.empty().text("Не удалось создать компонент прокрутки.");
                       this.start = function() { // Basic fallback start
                            if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                                Lampa.Controller.add('content', { back: this.back });
                                Lampa.Controller.toggle('content');
                            }
                       }.bind(this);
                 }
            }
        };

         // Callback from HanimeLineComponent when it finishes loading/building
         this.lineLoaded = function(categoryKey, cardElements) {
             console.log("HanimeCatalogScreen: Line '" + categoryKey + "' loaded with", cardElements.length, "cards.");

             // Add cards from this line to the main collection for the Controller
             allCardsCollection = allCardsCollection.concat(cardElements);

             loadedLinesCount++;

             console.log("HanimeCatalogScreen: Loaded lines count:", loadedLinesCount, "/", expectedLines);

             // If all expected lines have loaded (or failed to load with empty result)
             if (loadedLinesCount >= expectedLines) {
                 console.log("HanimeCatalogScreen: All lines processed. Final card count for Controller:", allCardsCollection.length);
                  if (loadingIndicator) loadingIndicator(false); // Hide loader

                 // Toggle activity to setup Controller with the final collection
                 if (activityToggler) {
                     // Need a small delay here sometimes to ensure DOM is fully ready after appends
                      setTimeout(() => {
                         console.log("HanimeCatalogScreen: Delay finished, toggling activity.");
                         activityToggler();
                      }, 100); // Small delay

                 } else {
                      console.warn("HanimeCatalogScreen: Activity toggler not available.");
                 }
             }
         };

         // Method to handle card clicks, delegated from HanimeCard -> HanimeLineComponent -> HanimeCatalogScreen
         this.onCardClick = function(cardData) {
             console.log("HanimeCatalogScreen: Received card click for:", cardData.title, ". Fetching stream/meta...");
             this.fetchStreamAndMeta(cardData.id, cardData);
         };

          // Method to handle context menu requests, delegated from HanimeCard -> HanimeLineComponent -> HanimeCatalogScreen
         this.showCardContextMenu = function(cardElement, cardData) {
             console.log("HanimeCatalogScreen: Received context menu request for:", cardData.title, ". Showing menu...");
             var _this = this; // Reference to HanimeCatalogScreen

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
                 console.warn("HanimeCatalogScreen: Lampa.Lang not available, using English for menu items.");
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
                         // Restore controller focus back to the screen after menu is closed
                         if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                          console.log("HanimeCatalogScreen: Context menu back button pressed. Restored controller:", enabled);
                     },
                     onCheck: (a)=>{
                         console.log("HanimeCatalogScreen: Context menu - checkbox checked:", a.where);
                         if(window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function') Lampa.Favorite.toggle(a.where, cardData);
                         // Find the specific Card instance and update its icons
                         // Need to iterate through all line components and their cards
                         let cardObj = null;
                         for (const lineComp of lineComponents) {
                             if (lineComp && lineComp.items) { // Check if items array exists and is populated
                                 cardObj = lineComp.items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                                 if (cardObj) break; // Found the card instance
                             }
                         }

                          if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                         else console.warn("HanimeCatalogScreen: Failed to find Card object to update icons after onCheck.");
                     },
                     onSelect: (a)=>{
                          console.log("HanimeCatalogScreen: Context menu - item selected:", a);
                          if(a.collect && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function'){
                               Lampa.Favorite.toggle(a.where, cardData);
                               // Update icons similarly to onCheck
                               let cardObj = null;
                               for (const lineComp of lineComponents) {
                                   if (lineComp && lineComp.items) {
                                       cardObj = lineComp.items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                                       if (cardObj) break;
                                   }
                               }
                               if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                                else console.warn("HanimeCatalogScreen: Failed to find Card object to update icons after onSelect.");
                          }
                          if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                           // Restore controller focus back to the screen after menu is closed
                           if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                            console.log("HanimeCatalogScreen: Context menu selected and closed.");
                     },
                      onDraw: (item, elem) => {
                           if (elem.collect && window.Lampa && Lampa.Account && typeof Lampa.Account.hasPremium === 'function' && !Lampa.Account.hasPremium()) {
                                // Add lock icon if premium is required and user doesn't have it
                                let lockIconTemplate = (window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.has('icon_lock')) ? Lampa.Template.get('icon_lock') : null;
                                if (lockIconTemplate && window.$ && typeof item.find === 'function' && typeof item.append === 'function') {
                                     let wrap = $('<div class="selectbox-item__lock"></div>');
                                     wrap.append($(lockIconTemplate));
                                     item.find('.selectbox-item__checkbox').remove(); // Remove checkbox for premium item
                                     item.append(wrap);

                                     // Override hover:enter to show premium message
                                     item.off('hover:enter').on('hover:enter', () => {
                                         if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                                          if (window.Lampa && Lampa.Account && typeof Lampa.Account.showCubPremium === 'function') Lampa.Account.showCubPremium();
                                     });
                                } else {
                                     console.warn("HanimeCatalogScreen: icon_lock template or Template/jQuery/methods missing for Premium item draw.");
                                }
                           }
                      }
                 });
             } else {
                 console.warn("HanimeCatalogScreen: Lampa.Select component not available to show context menu.");
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Компонент меню недоступен.', 5000);
                 }
             }
         };

        // Method to fetch stream and meta data, called after card click
        this.fetchStreamAndMeta = function (id, meta) {
             // Use the global network definition
             if (!window.Lampa || typeof Lampa.Reguest !== 'function') {
                 console.error("HanimeCatalogScreen: Lampa.Reguest component not available.");
                  if (loadingIndicator) loadingIndicator(false);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Сетевой компонент недоступен для загрузки потока.', 5000);
                return;
             }

             var network = new Lampa.Reguest(); // Create a new network instance for this specific request

             if (loadingIndicator) loadingIndicator(true);
            console.log("HanimeCatalogScreen: fetchStreamAndMeta for ID:", id);

            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

            Promise.all([
                new Promise((resolve, reject) => {
                    if(streamUrl) network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                    else reject('Stream URL unavailable');
                }),
                // If we already have meta, use it. Otherwise fetch it.
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                     if(metaUrl) network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                     else reject('Meta URL unavailable');
                 })
            ]).then(([streamData, metaDataResponse]) => {
                 if (loadingIndicator) loadingIndicator(false);
                 // Dispose of the network instance after the request
                 if(network && typeof network.clear === 'function') network.clear();

                const fullMetaData = metaDataResponse ? (metaDataResponse.meta || metaDataResponse) : null;
                console.log("HanimeCatalogScreen: Stream data received:", streamData);
                console.log("HanimeCatalogScreen: Full Meta Data received:", fullMetaData);

                if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0];
                    var finalStreamUrl = streamToPlay ? streamToPlay.url : null;

                    if(finalStreamUrl) {
                         try {
                             // Apply proxy if needed
                             var url = new URL(finalStreamUrl);
                             if (url.hostname && url.hostname.includes('highwinds-cdn.com') && PROXY_BASE_URL) {
                                 finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                                 console.log("HanimeCatalogScreen: Stream URL proxied.");
                             } else {
                                console.log("HanimeCatalogScreen: Stream URL does not require proxy:", finalStreamUrl);
                             }
                         } catch (e) {
                            console.error("HanimeCatalogScreen: Failed to parse or proxy stream URL:", e);
                             console.log("HanimeCatalogScreen: Using original stream URL due to error:", finalStreamUrl);
                         }
                    }

                    var playerObject = {
                        title: fullMetaData ? (fullMetaData.name || fullMetaData.title || 'Без названия') : 'Без названия',
                        url: finalStreamUrl,
                        poster: fullMetaData ? (fullMetaData.poster || fullMetaData.background || '') : '',
                    };

                    if (playerObject.url && window.Lampa && Lampa.Player && typeof Lampa.Player.play === 'function' && typeof Lampa.Player.playlist === 'function') {
                         console.log("HanimeCatalogScreen: Launching player.");
                         Lampa.Player.play(playerObject);
                         Lampa.Player.playlist([playerObject]);

                         if (fullMetaData && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                                const historyMeta = {
                                    id: fullMetaData.id || '', title: fullMetaData.name || fullMetaData.title || '', poster: fullMetaData.poster || fullMetaData.background || '',
                                    runtime: fullMetaData.runtime, year: fullMetaData.year, original_name: fullMetaData.original_name || ''
                                };
                                Lampa.Favorite.add('history', historyMeta, 100); // Add to history with progress 100 (watched)
                                console.log("HanimeCatalogScreen: Added to history.");
                         } else {
                              console.warn("HanimeCatalogScreen: Lampa.Favorite or add method not available to add to history.");
                         }

                    } else {
                         console.error("HanimeCatalogScreen: Cannot launch player. Missing stream URL, Lampa.Player, or methods.");
                         if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                             Lampa.Noty.show(playerObject.url ? 'Компонент плеера недоступен.' : 'Не удалось получить ссылку на поток.', 5000);
                         }
                    }

                } else {
                     console.warn("HanimeCatalogScreen: No streams found in API data or invalid structure.");
                     if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                         Lampa.Noty.show('Потоки не найдены для этого аниме.', 5000);
                     }
                }

            }).catch(error => {
                if (loadingIndicator) loadingIndicator(false);
                 // Dispose of the network instance after the request
                 if(network && typeof network.clear === 'function') network.clear();
                console.error("HanimeCatalogScreen: Error fetching stream/meta details:", error);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'), 5000);
                 }
            });
        };


        this.create = function () {
            console.log("HanimeCatalogScreen: create()");

            this.buildLayout();

            // If vertical scroll failed to initialize, stop here (empty state will be shown)
             if (!verticalScroll || !mainHtml || typeof verticalScroll.append !== 'function') {
                 console.error("HanimeCatalogScreen: Vertical scroll not initialized. Aborting line component creation.");
                 // The empty state handling in buildLayout should have set up the basic start method.
                 return;
             }

             if (loadingIndicator) loadingIndicator(true); // Show global loader

             // Create and add each HanimeLineComponent
            for (const categoryKey in CATEGORIES) {
                if (CATEGORIES.hasOwnProperty(categoryKey)) {
                    const category = CATEGORIES[categoryKey];
                    console.log("HanimeCatalogScreen: Creating line component for category:", categoryKey);

                    // Create line component, passing callbacks for card interactions and this screen component as ref
                    var lineComponent = new HanimeLineComponent(
                         categoryKey,
                         category.title,
                         this.onCardClick.bind(this), // Pass bound click handler
                         this.showCardContextMenu.bind(this), // Pass bound context menu handler
                         this // Pass reference to this screen component
                    );

                    lineComponents.push(lineComponent);
                    lineComponentsMap[categoryKey] = lineComponent;

                    // Render the line component and append its main element to the vertical scroll
                    var lineElement = lineComponent.render();
                     if(lineElement) {
                         verticalScroll.append(lineElement[0]); // Append native DOM element
                          console.log("HanimeCatalogScreen: Appended line element for category:", categoryKey);
                     } else {
                          console.error("HanimeCatalogScreen: Failed to render line component for category:", categoryKey);
                          this.lineLoaded(categoryKey, []); // Treat as loaded but empty
                     }
                }
            }
             console.log("HanimeCatalogScreen: create() finished. All line components initiated.");
             // lineLoaded callback from each HanimeLineComponent will handle hiding the loader and toggling activity.
        };

        this.start = function () {
            console.log("HanimeCatalogScreen: start()");
            // Check if this activity is the currently active one before setting up the controller
             if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this.activity) {
                console.log("HanimeCatalogScreen: start() - Not the currently active activity, skipping controller setup.");
                return;
            }
             console.log("HanimeCatalogScreen: start() - Activity is active. Setting up Lampa.Controller.");

            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && verticalScroll && typeof verticalScroll.render === 'function' && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function') {

                 // Collect all card elements from all loaded lines for the main controller collection
                 // Ensure this happens *after* all lines have called lineLoaded and populated allCardsCollection
                 // The lineLoaded callback already handles this and calls toggle() after the last line loads.
                 // So, this `start` method will primarily set up the Controller config and the initial focus if needed.

                 Lampa.Controller.add('content', {
                     toggle: function () {
                         console.log("HanimeCatalogScreen: Controller toggle() called. Setting collection...");
                          // Set the collection of all card DOM elements from all lines
                          Lampa.Controller.collectionSet(allCardsCollection);

                         // Attempt to focus the last focused item or the first item if none saved
                         let focusElement = lastFocusedElement; // Use saved element if any
                         if (!focusElement && allCardsCollection.length > 0) {
                              // Find the first card element in the collection to focus initially
                              focusElement = allCardsCollection[0];
                              console.log("HanimeCatalogScreen: No last focused element, focusing the first card in the collection.");
                         }

                         if (focusElement) {
                              Lampa.Controller.collectionFocus(focusElement, verticalScroll.render()); // Use vertical scroll render as the container
                              // Also ensure the horizontal scroll within that line is updated
                               let focusedCardJq = $(focusElement);
                               if (focusedCardJq.length) {
                                   // Find the HanimeLineComponent instance that contains this card
                                    for (const lineComp of lineComponents) {
                                        if (lineComp && typeof lineComp.updateScrollToFocus === 'function' && $(lineComp.render()).find(focusedCardJq).length) {
                                             lineComp.updateScrollToFocus(focusedCardJq);
                                             break; // Found the line component
                                        }
                                    }
                               }
                              console.log("HanimeCatalogScreen: Controller collectionFocus called.");
                         } else {
                              console.warn("HanimeCatalogScreen: No elements available to focus controller on.");
                         }

                     },
                     left: function () {
                         // Delegate left movement to the currently focused horizontal scroll
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('left')) {
                              Navigator.move('left');
                         } else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                             // If at the leftmost edge of the horizontal line, go to the menu
                              Lampa.Controller.toggle('menu');
                         } else console.log("HanimeCatalogScreen: Cannot move left, Navigator or menu controller unavailable.");
                     },
                     right: function () {
                          // Delegate right movement to the currently focused horizontal scroll
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('right')) {
                             Navigator.move('right');
                         } else {
                              console.log("HanimeCatalogScreen: Cannot move right, Navigator unavailable or no more elements.");
                         }
                     },
                     up: function () {
                          // Delegate up movement to the main vertical scroll
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('up')) {
                             Navigator.move('up');
                         } else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                             // If at the top line and pressing up, go to the head
                              Lampa.Controller.toggle('head');
                         } else console.log("HanimeCatalogScreen: Cannot move up, Navigator or head controller unavailable.");
                     },
                     down: function () {
                          // Delegate down movement to the main vertical scroll
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('down')) {
                             Navigator.move('down');
                         } else {
                              console.log("HanimeCatalogScreen: Cannot move down, Navigator unavailable or no elements below.");
                         }
                     },
                     back: this.back,
                     // The `enter` event is handled by the HanimeCard instances directly and delegated up via callbacks
                     // The `long` event is handled by the HanimeCard instances and delegated up via callbacks
                 });

                // The activityToggler() call from lineLoaded will handle the initial Lampa.Controller.toggle('content');
                // If somehow lineLoaded finished before start() is called, we should call toggle here.
                // However, Lampa activity lifecycle usually calls create -> start -> toggle.
                // Let's rely on the post-load toggle for initial display.
                // But we need to ensure start() also sets the controller config in case toggle is called later.
                 console.log("HanimeCatalogScreen: Controller 'content' configuration added. Initial toggle is handled by lineLoaded.");


             } else {
                console.error("HanimeCatalogScreen: Lampa.Controller or verticalScroll, or required methods not available in start(). Cannot setup main Controller.");
                 // Add a basic controller for the back button as a fallback if main controller setup fails
                 if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                     console.log("HanimeCatalogScreen: Attempting to add basic Controller for Back button.");
                     Lampa.Controller.add('content', { back: this.back });
                      // If we're here, there might be no elements to focus on anyway, just allow back
                      Lampa.Controller.toggle('content');
                 } else console.warn("HanimeCatalogScreen: Lampa.Controller unavailable or methods missing, cannot add basic back handler.");
             }
        };


        this.pause = function () {
             console.log("HanimeCatalogScreen: pause() called.");
             // Save the currently focused DOM element from the main Controller collection
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') {
                 lastFocusedElement = Lampa.Controller.item() || lastFocusedElement;
                  console.log("HanimeCatalogScreen: Activity paused. Saved last focused DOM item:", lastFocusedElement);
             } else {
                  console.log("HanimeCatalogScreen: Pause called, but content controller not active or Controller.item missing. Last focus not saved.");
             }
             // Line components don't need explicit pause calls as they don't manage the main controller
        };

        this.stop = function () {
            console.log("HanimeCatalogScreen: stop() called.");
             // No specific stop logic needed besides what destroy handles
        };

        this.render = function () {
             console.log("HanimeCatalogScreen: render() called.");
            if (!mainHtml) {
                 this.buildLayout();
            }
            return mainHtml;
        };

        this.destroy = function () {
            console.log("HanimeCatalogScreen: destroy() called.");

            // Destroy all child line components
            if (lineComponents) {
                 lineComponents.forEach(lineComp => {
                     if (lineComp && typeof lineComp.destroy === 'function') {
                          lineComp.destroy();
                     }
                 });
                  console.log("HanimeCatalogScreen: Destroyed all line components.");
            }
            lineComponents = [];
            lineComponentsMap = {};

             // Destroy main vertical scroll instance
             if (verticalScroll && typeof verticalScroll.destroy === 'function') {
                 verticalScroll.destroy();
                 console.log("HanimeCatalogScreen: Destroyed vertical scroll instance.");
             }
             verticalScroll = null;

             // Remove main DOM element
             if (mainHtml && typeof mainHtml.remove === 'function') {
                 mainHtml.remove();
                 console.log("HanimeCatalogScreen: Removed main html element from DOM.");
             }
            mainHtml = null; allCardsCollection = []; lastFocusedElement = null;

            // Remove the Controller config associated with this component instance
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function' && typeof Lampa.Controller.collectionSet === 'function') {
                 // Check if this component's controller is currently active before setting collection to empty
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content') {
                       console.log("HanimeCatalogScreen: Clearing Controller collection.");
                      Lampa.Controller.collectionSet([]); // Important for cleanup
                 }
                 // Always try to remove the controller by name
                 Lampa.Controller.remove('content');
                  console.log("HanimeCatalogScreen: Controller 'content' removed.");
            } else console.warn("HanimeCatalogScreen: Lampa.Controller not available or remove method missing for cleanup in destroy.");

            // Reset loading state counters
            loadedLinesCount = 0;
            expectedLines = Object.keys(CATEGORIES).length; // Reset expected lines count

            console.log("HanimeCatalogScreen: destroy() finished.");
        };

        this.back = function () {
             console.log("HanimeCatalogScreen: back() called. Attempting Activity.backward().");
             // Go back in Lampa's activity stack
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') {
                 Lampa.Activity.backward();
             } else console.warn("HanimeCatalogScreen: Lampa.Activity or backward method missing for navigation.");
        };

         // Store componentObject reference (contains activity)
         this.componentObject = componentObject;
         this.activity = componentObject.activity; // Shortcut to activity
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
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Template || typeof Lampa.Template !== 'object' || !Lampa.Component || typeof Lampa.Component !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Scroll || typeof Lampa.Scroll !== 'function' || !Lampa.Reguest || typeof Lampa.Reguest !== 'function') {
                  console.error("Hanime Plugin: CRITICAL: Required Lampa components (Lampa, Template, Component, Activity, Controller, jQuery, Scroll, Reguest) are not available after waiting for appready. Initialization failed. Please check Lampa version and installation.");
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
                 // Template for lock icon used in context menu for premium features
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

             console.log("Hanime Plugin: Custom CSS block REMOVED as requested. Relying on standard Lampa styles.");
             // Note: You might need to add CSS for the HanimeCatalogScreen if its layout differs significantly.
             // E.g., `.hanime-catalog-screen { padding: 2em; }` or similar spacing adjustments.
             // But for a simple vertical stack of existing `items-line`, standard Lampa CSS might suffice.


             console.log("Hanime Plugin: Registering HanimeCatalogScreen component...");
             if (window.Lampa && Lampa.Component && typeof Lampa.Component.add === 'function') {
                 Lampa.Component.add('hanime_catalog_screen', HanimeCatalogScreen);
                 console.log("Hanime Plugin: Component 'hanime_catalog_screen' registered successfully.");
             } else {
                 console.error("Hanime Plugin: Lampa.Component.add method not available. Cannot register component.");
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина: Не удалось зарегистрировать компонент экрана каталога.', 5000);
                  }
                  return; // Stop if the main screen component can't be registered
             }

             console.log("Hanime Plugin: Calling addMenuItem()...");
             addMenuItem(); // Now add the single menu item after the screen component is registered
              console.log("Hanime Plugin: addMenuItem() called from initializeLampaDependencies.");

              console.log("Hanime Plugin: initializeLampaDependencies() finished.");
        }

        // Add a single menu item to launch the main HanimeCatalogScreen
        function addMenuItem() {
             console.log("Hanime Plugin: addMenuItem() called.");

             // Basic Lampa dependency checks for menu item creation
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

             // Check if our main screen component is registered
             var ourScreenComponentRegistered = Lampa.Component.get('hanime_catalog_screen');
             if (!ourScreenComponentRegistered) {
                 console.warn("Hanime Plugin: addMenuItem skipping - Screen component 'hanime_catalog_screen' is not found/registered in Lampa.Component.");
                 return;
             }
             console.log("Hanime Plugin: Screen component 'hanime_catalog_screen' confirmed registered.");

             // Check if the main menu item already exists to prevent duplicates
             const mainMenuItemText = 'Hanime Catalog'; // Define the text for the main menu item
             if (menuList.find('.menu__text:contains("' + mainMenuItemText + '")').length > 0) {
                 console.log("Hanime Plugin: Main menu item with text '" + mainMenuItemText + "' already exists in DOM. Skipping addMenuItem.");
                 return;
             }

             console.log("Hanime Plugin: Adding main menu item DOM element to Lampa menu.");

            var menu_item = $(`
                <li class="menu__item selector">
                    <div class="menu__ico">
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">${mainMenuItemText}</div> <!-- Use main title -->
                </li>
            `);

            if (typeof menu_item.on === 'function') {
                menu_item.on('hover:enter', function () {
                     console.log("Hanime Plugin: Main menu item '" + mainMenuItemText + "' activated via 'hover:enter'. Pushing activity.");
                     if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.push === 'function') {
                         Lampa.Activity.push({
                             url: '', // URL is not strictly needed for component activities
                             title: mainMenuItemText, // Title for the screen header
                             component: 'hanime_catalog_screen', // Launch the main screen component
                             page: 1 // Page is not directly relevant for this screen structure but can be included
                             // No 'category' parameter here, the screen component loads all.
                         });
                          console.log("Hanime Plugin: Lampa.Activity.push called for main screen.");
                     } else {
                          console.warn("Hanime Plugin: Lampa.Activity or push method unavailable to launch main activity.");
                         if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Не удалось запустить каталог.');
                     }
                });
                console.log("Hanime Plugin: 'hover:enter' event listener attached to main menu item.");
            } else {
                console.warn("Hanime Plugin: jQuery on() method not available for main menu item. Cannot attach event listener.");
            }

             // Append the created menu item to the list
            if (menuList.length > 0) {
                 menuList.append(menu_item);
                 console.log("Hanime Plugin: Main menu item DOM element successfully added to Lampa menu list.");
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
