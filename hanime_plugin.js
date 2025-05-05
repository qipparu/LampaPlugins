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

        // Use the registered template, checking existence safely
        let cardTemplate = '<div>Error: Template not available</div>';
        if (window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function') {
            try {
                // Attempt to get the template - it might still throw if missing
                let fetchedTemplate = Lampa.Template.get('hanime-card', { img: processedData.poster_path, title: processedData.title });
                if (fetchedTemplate) {
                     cardTemplate = fetchedTemplate;
                } else {
                     console.error("HanimeCard: Lampa.Template.get('hanime-card') returned empty/null.");
                }
            } catch (e) {
                console.error("HanimeCard: Failed to get 'hanime-card' template:", e.message);
            }
        } else {
            console.error("HanimeCard: Lampa.Template or get method not available.");
        }


        var cardElement = $(cardTemplate);

        this.addicon = function(name) {
            var iconsContainer = cardElement.find('.card__icons-inner');
            if (iconsContainer.length) {
                var icon = document.createElement('div');
                icon.classList.add('card__icon');
                icon.classList.add('icon--'+name);
                iconsContainer.append(icon);
            } else {
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

            if (status.book) this.addicon('book');
            if (status.like) this.addicon('like');
            if (status.wath) this.addicon('wath');
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
        }

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
                      imgElement[0].onload = () => { cardElement.addClass('card--loaded'); };
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
                     if (componentRef && componentRef.updateScrollToFocus && typeof componentRef.updateScrollToFocus === 'function') {
                          componentRef.updateScrollToFocus(cardElement);
                     }
                     this.update();
                }.bind(this));

                 cardElement.on('hover:enter', function () {
                     if (componentRef && componentRef.onCardClick && typeof componentRef.onCardClick === 'function') {
                         componentRef.onCardClick(processedData);
                     }
                }.bind(this));

                cardElement.on('hover:long', function(){
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
        }

        this.render = function(js){
             if (!cardElement.data('created')) {
                 this.create();
             }
            return js ? cardElement[0] : cardElement;
        }

        this.destroy = function(){
             if(this.card && typeof this.card.removeEventListener === 'function' && this.onVisible) this.card.removeEventListener('visible', this.onVisible.bind(this));
             if(cardElement && typeof cardElement.off === 'function') {
                 cardElement.off('hover:focus');
                 cardElement.off('hover:enter');
                 cardElement.off('hover:long');
             }

             if(cardElement && typeof cardElement.remove === 'function') cardElement.remove();

             processedData = null; cardElement = null; this.card = null; componentRef = null;
        }
    }

    function HanimeComponent(componentObject) {
        var network = null;
        var scrolls = {};
        var items = {};
        var itemsContainers = {};

        var html = null;

        var last = null;
        var categoryData = {};
        var loadingCount = 0;

        this.buildLayout = function() {
            html = $(`<div class="hanime-catalog-container"></div>`);
             console.log("HanimeComponent: buildLayout() - Main container created.");
        };

        this.fetchAllCategories = function () {
            var _this = this;
            _this.loadingCount = CATEGORIES.length;
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
                return new Promise((resolve) => {
                    network.native(url,
                        function (data) {
                            console.log(`HanimeComponent: Data received for category "${category.key}"`, data ? data.metas ? data.metas.length : 'no metas' : 'no data');
                            if (data && data.metas && Array.isArray(data.metas)) {
                                if (_this.categoryData) {
                                    _this.categoryData[category.key] = data.metas;
                                    resolve({ category: category.key, success: true, count: data.metas.length });
                                } else {
                                     console.warn(`HanimeComponent: Component destroyed before receiving data for "${category.key}".`);
                                     resolve({ category: category.key, success: false, error: 'Component destroyed' });
                                }
                            } else {
                                console.error(`HanimeComponent: Invalid data format for category "${category.key}".`, data);
                                if (_this.categoryData) {
                                    _this.categoryData[category.key] = [];
                                }
                                resolve({ category: category.key, success: false, error: 'Invalid data format' });
                            }
                        },
                        function (errorStatus, errorText) {
                            console.error(`HanimeComponent: Failed to load category "${category.key}". Status: ${errorStatus}`, errorText);
                            if (_this.categoryData) {
                                _this.categoryData[category.key] = [];
                            }
                            resolve({ category: category.key, success: false, error: `Status: ${errorStatus}` });
                        },
                        false,
                        { dataType: 'json', timeout: 15000 }
                    );
                });
            });

            Promise.all(fetchPromises).then(results => {
                console.log("HanimeComponent: All category fetch promises settled.", results);
                _this.loadingCount = 0;
                if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);

                const hasAnyData = CATEGORIES.some(cat => _this.categoryData[cat.key] && _this.categoryData[cat.key].length > 0);

                if (hasAnyData) {
                    _this.buildAllCategories();
                    _this.updateControllerCollection();
                } else {
                    _this.empty("Не удалось загрузить данные ни для одной категории.");
                }

                 if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                 console.log("HanimeComponent: fetchAllCategories() finished.");
            });
        };

        this.buildAllCategories = function() {
            var _this = this;
            console.log("HanimeComponent: buildAllCategories() - Building UI for all categories.");

            if (!(html && typeof html.empty === 'function' && typeof html.append === 'function')) {
                 console.error("HanimeComponent: Missing main html container or its methods in buildAllCategories(). Aborting UI build.");
                 _this.empty("Не удалось построить интерфейс.");
                 return;
            }

            html.empty();

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

            const categoryScroll = (window.Lampa && typeof Lampa.Scroll === 'function')
                ? new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' })
                : null;

            if (!categoryScroll) {
                 console.error(`HanimeComponent: Lampa.Scroll not available. Cannot build category "${category.key}".`);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина: Компонент Scroll недоступен.', 5000);
                  }
                 return;
            }


            _this.items[category.key] = [];
            _this.itemsContainers[category.key] = categoryItemsContainer;
            _this.scrolls[category.key] = categoryScroll;

            if(categoryItemsContainer && categoryScroll && window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function') {
                 data.forEach(function (meta) {
                    var card = new HanimeCard(meta, _this);
                    var cardElement = card.render();

                    cardElement.data('category', category.key);

                    categoryItemsContainer.append(cardElement);
                    _this.items[category.key].push(card);
                });
                 console.log(`HanimeComponent: Created and added ${_this.items[category.key].length} cards for category "${category.key}".`);

                categoryScroll.append(categoryItemsContainer);
                categoryHtml.find('.items-line__body').empty().append(categoryScroll.render(true));

                html.append(categoryHtml);

            } else {
                console.error(`HanimeComponent: Missing required objects or methods before building cards for category "${category.key}".`);
                if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show(`Ошибка плагина при создании карточек для "${category.title}".`, 5000);
                  }
            }
        };

        this.updateControllerCollection = function() {
             var _this = this;
             console.log("HanimeComponent: updateControllerCollection() called.");

             if (!(window.Lampa && Lampa.Controller && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function')) {
                  console.warn("HanimeComponent: Lampa.Controller or required methods not available to update collection.");
                  return;
             }

             let allCardElements = [];
             CATEGORIES.forEach(category => {
                 const categoryItems = Array.isArray(this.items[category.key]) ? this.items[category.key] : [];
                 categoryItems.forEach(card => {
                     const cardElement = card.render(true);
                     if (cardElement) {
                         allCardElements.push(cardElement);
                     }
                 });
             });

             if (allCardElements.length === 0) {
                  console.warn("HanimeComponent: No card elements found to set Controller collection.");
                  Lampa.Controller.collectionSet([]);
                  return;
             }

             Lampa.Controller.collectionSet(allCardElements);
             console.log("HanimeComponent: Controller collectionSet with", allCardElements.length, "elements.");


             let focusElement = null;
             if (last && last.element && allCardElements.includes(last.element)) {
                 focusElement = last.element;
                 console.log("HanimeComponent: Focusing last element:", focusElement);
             } else {
                 for (const category of CATEGORIES) {
                     const categoryItems = Array.isArray(_this.items[category.key]) ? _this.items[category.key] : [];
                     if (categoryItems.length > 0) {
                         focusElement = categoryItems[0].render(true);
                         console.log(`HanimeComponent: Focusing first element of category "${category.key}".`);
                         break;
                     }
                 }
                 if (!focusElement && allCardElements.length > 0) {
                      focusElement = allCardElements[0];
                      console.log("HanimeComponent: Focusing first element in combined collection as fallback.");
                 }
             }

             if (focusElement) {
                  Lampa.Controller.collectionFocus(focusElement);
                  _this.updateScrollToFocus($(focusElement));
             } else {
                  console.warn("HanimeComponent: No element found to focus.");
             }
             console.log("HanimeComponent: Controller collectionFocus called.");
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
                         const cardDomElement = cardElement[0];
                         let cardObj = null;
                         for(const key in _this.items) {
                             cardObj = (Array.isArray(_this.items[key]) ? _this.items[key] : []).find(item => item && typeof item.render === 'function' && item.render(true) === cardDomElement);
                             if (cardObj) break;
                         }
                          if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                         else console.warn("HanimeComponent: Failed to find Card object to update icons after onCheck.");
                     },
                     onSelect: (a)=>{
                          console.log("HanimeComponent: Context menu - item selected:", a);
                          if(a.collect && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function'){
                              Lampa.Favorite.toggle(a.where, cardData);
                              const cardDomElement = cardElement[0];
                              let cardObj = null;
                              for(const key in _this.items) {
                                  cardObj = (Array.isArray(_this.items[key]) ? _this.items[key] : []).find(item => item && typeof item.render === 'function' && item.render(true) === cardDomElement);
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
                           if (elem.collect && window.Lampa && Lampa.Account && typeof Lampa.Account.hasPremium === 'function' && !Lampa.Account.hasPremium()) {
                                let lockIconTemplate = (window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function') ? (function() { try { return Lampa.Template.get('icon_lock'); } catch(e) { return null; }})() : null; // Safe get
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

        this.updateScrollToFocus = function(element) {
             if (!element || element.length === 0) {
                 console.warn("HanimeComponent: updateScrollToFocus called with invalid element.");
                 return;
             }

             const cardElement = element[0];
             const categoryKey = $(cardElement).data('category');

             if (categoryKey && this.scrolls[categoryKey] && typeof this.scrolls[categoryKey].update === 'function') {
                last = { element: cardElement, category: categoryKey };
                this.scrolls[categoryKey].update($(cardElement), true);
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
                    var streamToPlay = streamData.streams[0];
                    var finalStreamUrl = streamToPlay ? streamToPlay.url : null;

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

                    var playerObject = {
                        title: fullMetaData ? (fullMetaData.name || fullMetaData.title || 'Без названия') : 'Без названия',
                        url: finalStreamUrl,
                        poster: fullMetaData ? (fullMetaData.poster || fullMetaData.background || '') : '',
                        id: fullMetaData ? fullMetaData.id : id,
                        year: fullMetaData ? fullMetaData.year : null,
                        type: fullMetaData ? fullMetaData.type : null,
                        original_name: fullMetaData ? fullMetaData.original_name : null
                    };

                    if (playerObject.url && window.Lampa && Lampa.Player && typeof Lampa.Player.play === 'function' && typeof Lampa.Player.playlist === 'function') {
                         console.log("HanimeComponent: Launching player with URL:", playerObject.url);
                         Lampa.Player.play(playerObject);
                         Lampa.Player.playlist([playerObject]);

                         if (fullMetaData && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                                const historyMeta = {
                                    id: fullMetaData.id || id,
                                    title: fullMetaData.name || fullMetaData.title || 'Без названия',
                                    poster: fullMetaData.poster || fullMetaData.background || '',
                                    runtime: fullMetaData.runtime,
                                    year: fullMetaData.year,
                                    original_name: fullMetaData.original_name || '',
                                    type: fullMetaData.type || (meta && meta.type) || 'movie'
                                };
                                Lampa.Favorite.add('history', historyMeta, 100);
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

                 if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(false);
                 if(this.activity && typeof this.activity.toggle === 'function') this.activity.toggle();

                 if (typeof empty.start === 'function') this.start = empty.start;
                 else console.warn("HanimeComponent: Empty component does not have a start method.");

                  console.log("HanimeComponent: Displaying empty state via Lampa.Empty.");
             } else {
                  console.warn("HanimeComponent: Lampa.Empty component not available. Using basic text fallback.");
                  if(html && typeof html.empty === 'function' && typeof html.text === 'function') html.empty().text(msg + ' (Компонент Empty недоступен в Lampa)');
                 if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(false);
                 if(this.activity && typeof this.activity.toggle === 'function') this.activity.toggle();
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
            this.buildLayout();
            this.fetchAllCategories();
             console.log("HanimeComponent: create() finished. Fetching all categories initiated.");
        };

        this.start = function () {
            console.log("HanimeComponent: start()");
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this.activity) {
                console.log("HanimeComponent: start() - Not the currently active activity, skipping.");
                return;
            }
             console.log("HanimeComponent: start() - Activity is active. Setting up Lampa.Controller.");

            if (!(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function')) {
                 console.error("HanimeComponent: Lampa.Controller or required methods not available in start(). Cannot setup main Controller.");
                 if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                     console.log("HanimeComponent: Attempting to add basic Controller for Back button.");
                     Lampa.Controller.add('content', { back: this.back });
                     Lampa.Controller.toggle('content');
                 } else console.warn("HanimeComponent: Lampa.Controller unavailable or methods missing, cannot add basic back handler.");
                 return;
            }

            Lampa.Controller.add('content', {
                toggle: function () {
                    console.log("HanimeComponent: Controller toggle() called.");
                    let allCardElements = [];
                    CATEGORIES.forEach(category => {
                        const categoryItems = Array.isArray(this.items[category.key]) ? this.items[category.key] : [];
                        categoryItems.forEach(card => {
                            const cardElement = card.render(true);
                            if (cardElement) {
                                allCardElements.push(cardElement);
                            }
                        });
                    });
                     Lampa.Controller.collectionSet(allCardElements);

                    Lampa.Controller.collectionFocus(last ? last.element : false);
                    console.log("HanimeComponent: Controller collectionSet/Focus called in toggle(). Focused:", last ? last.element : 'default');
                },
                left: function () {
                    if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('left')) Navigator.move('left');
                    else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('menu');
                    else console.log("HanimeComponent: Cannot move left, Navigator or menu controller unavailable.");
                },
                right: function () {
                    if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('right')) Navigator.move('right');
                     else console.log("HanimeComponent: Cannot move right, Navigator unavailable or no more elements.");
                },
                up: function () {
                    if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('up')) Navigator.move('up');
                    else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('head');
                    else console.log("HanimeComponent: Cannot move up, Navigator or head controller unavailable.");
                },
                down: function () {
                    if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('down')) Navigator.move('down');
                     else console.log("HanimeComponent: Cannot move down, Navigator unavailable or no elements below.");
                },
                back: this.back
            });

             console.log("HanimeComponent: Controller 'content' added. Initial toggle will happen via Activity.");
        };

        this.pause = function () {
             console.log("HanimeComponent: pause()");
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') {
                 const focusedElement = Lampa.Controller.item();
                 if (focusedElement) {
                     const categoryKey = $(focusedElement).data('category');
                     if (categoryKey) {
                         last = { element: focusedElement, category: categoryKey };
                         console.log("HanimeComponent: Activity paused. Saved last focused DOM item:", last.element, "in category:", last.category);
                     } else {
                         console.warn("HanimeComponent: Focused element has no category data. Last focus not saved with category.");
                         last = { element: focusedElement, category: null };
                     }
                 } else {
                     console.log("HanimeComponent: Pause called, but Controller.item returned null. Last focus not saved.");
                     last = null;
                 }
             } else {
                  console.log("HanimeComponent: Pause called, but content controller not active or Controller.item missing. Last focus not saved.");
                  last = null;
             }
        };

        this.stop = function () {
             console.log("HanimeComponent: stop() called.");
        };

        this.render = function () {
            if (!html) {
                 this.buildLayout();
            }
            return html;
        };

        this.destroy = function () {
            console.log("HanimeComponent: destroy() called.");

            if(network && typeof network.clear === 'function') network.clear(); network = null;

             for (const key in this.scrolls) {
                 if (this.scrolls[key] && typeof this.scrolls[key].destroy === 'function') {
                     this.scrolls[key].destroy();
                     console.log(`HanimeComponent: Destroyed scroll instance for category "${key}".`);
                 }
             }
             this.scrolls = {};

             for (const key in this.items) {
                 if (Array.isArray(this.items[key]) && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') {
                     Lampa.Arrays.destroy(this.items[key]);
                     console.log(`HanimeComponent: Destroyed items array for category "${key}".`);
                 } else if (Array.isArray(this.items[key])) {
                     this.items[key].forEach(item => {
                         if (item && typeof item.destroy === 'function') item.destroy();
                     });
                     console.log(`HanimeComponent: Fallback destroyed items array for category "${key}".`);
                 }
             }
            this.items = {};
            this.categoryData = {};
            this.itemsContainers = {};

             if (html && typeof html.remove === 'function') {
                 html.remove();
                 console.log("HanimeComponent: Removed html element from DOM.");
             }
            html = null;

            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function') {
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.collectionSet === 'function') {
                      Lampa.Controller.collectionSet([]);
                       console.log("HanimeComponent: Controller collection set empty.");
                 }
                 Lampa.Controller.remove('content');
                  console.log("HanimeComponent: Controller 'content' removed.");
            } else {
                console.warn("HanimeComponent: Lampa.Controller not available or remove method missing for cleanup in destroy.");
            }

            last = null;
            console.log("HanimeComponent: destroy() finished. All resources released.");
        };

        this.back = function () {
             console.log("HanimeComponent: back() called. Attempting Activity.backward().");
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') {
                 Lampa.Activity.backward();
             } else console.warn("HanimeComponent: Lampa.Activity or backward method missing for navigation.");
        };
    }

    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() invoked.");

         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: global plugin_hanime_catalog_ready flag already set. Skipping initialization.");
             return;
         }

        function initializeLampaDependencies() {
             console.log("Hanime Plugin: initializeLampaDependencies() called (Lampa appready or fallback delay completed).");

             // Critical check for required Lampa components and jQuery
             // Check if Lampa.Template has *at least* get and add functions
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Template || typeof Lampa.Template !== 'object' || typeof Lampa.Template.get !== 'function' || typeof Lampa.Template.add !== 'function' || !Lampa.Component || typeof Lampa.Component !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Scroll || typeof Lampa.Scroll !== 'function' || !Lampa.Reguest || typeof Lampa.Reguest !== 'function' || !Lampa.Arrays || typeof Lampa.Arrays !== 'object') {
                  console.error("Hanime Plugin: CRITICAL: Required Lampa components (Lampa, Template.get/add, Component, Activity, Controller, jQuery, Scroll, Reguest, Arrays) are not available after waiting for appready. Initialization failed. Please check Lampa version and installation.");
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
                   return;
              }

             // Helper function to safely check if a template exists
             const templateExistsSafely = (name) => {
                 if (!Lampa.Template || typeof Lampa.Template.get !== 'function') return false; // Template system not available
                 try {
                     // Attempt to get the template. In some Lampa versions, get throws if not found.
                     // In others, it returns null/undefined. This handles both.
                     return Lampa.Template.get(name) !== undefined && Lampa.Template.get(name) !== null;
                 } catch (e) {
                     // If Lampa.Template.get throws, the template does not exist
                     // console.warn(`Hanime Plugin: Lampa.Template.get('${name}') threw an error:`, e.message, "Assuming template does not exist."); // Too noisy
                     return false;
                 }
             };


             // --- Add Standard Template Fallbacks FIRST ---
             console.log("Hanime Plugin: Adding standard template fallbacks using Lampa.Template.add...");
             if (Lampa.Template && typeof Lampa.Template.add === 'function' && typeof Lampa.Template.get === 'function') {
                 // Add templates if they don't exist using the safe check
                 if (!templateExistsSafely('card_vote_temp')) Lampa.Template.add('card_vote_temp', '<div class="card__vote"></div>');
                 if (!templateExistsSafely('card_quality_temp')) Lampa.Template.add('card_quality_temp', '<div class="card__quality"><div></div></div>');
                 if (!templateExistsSafely('card_year_temp')) Lampa.Template.add('card_year_temp', '<div class="card__age"></div>');
                 if (!templateExistsSafely('card_type_temp')) Lampa.Template.add('card_type_temp', '<div class="card__type"></div>');
                 if (!templateExistsSafely('icon_lock')) Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
                  console.log("Hanime Plugin: Standard template fallbacks added successfully.");
             } else {
                  console.error("Hanime Plugin: Lampa.Template.add or get method not available. Cannot add template fallbacks.");
             }
             // --- End Add Standard Template Fallbacks ---


             console.log("Hanime Plugin: Adding hanime-card template...");
             if (Lampa.Template && typeof Lampa.Template.add === 'function' && typeof Lampa.Template.get === 'function') {
                 // Add our custom template if it doesn't exist using the safe check
                 if (!templateExistsSafely('hanime-card')) {
                     Lampa.Template.add('hanime-card', `
                         <div class="hanime-card card selector layer--visible layer--render">
                             <div class="card__view">
                                 <img src="./img/img_load.svg" class="card__img" alt="{title}" loading="lazy" />
                                 <div class="card__icons">
                                     <div class="card__icons-inner"></div>
                                 </div>
                             </div>
                             <div class="card__title">{title}</div>
                         </div>
                     `);
                      console.log("Hanime Plugin: HanimeCard template added successfully.");
                 } else {
                      console.log("Hanime Plugin: HanimeCard template already exists. Skipping add.");
                 }
             } else {
                  console.error("Hanime Plugin: Lampa.Template.add or get method not available. Cannot add hanime-card template.");
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
             addMenuItem();
              console.log("Hanime Plugin: addMenuItem() called from initializeLampaDependencies.");

              console.log("Hanime Plugin: initializeLampaDependencies() finished.");
        }

        function addMenuItem() {
             console.log("Hanime Plugin: addMenuItem() called.");

             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Component || typeof Lampa.Component.get !== 'function') {
                  console.warn("Hanime Plugin: addMenuItem cannot proceed. Missing Lampa core components, jQuery, or Component.get.");
                  return;
             }

             var menuList = $('.menu .menu__list').eq(0);
             if (!menuList.length) {
                 console.warn("Hanime Plugin: addMenuItem cannot proceed. Lampa menu DOM structure ('.menu .menu__list') not found.");
                 return;
             }

             console.log("Hanime Plugin: addMenuItem checks passed.");

             var ourComponentRegistered = Lampa.Component.get('hanime_catalog');
             if (!ourComponentRegistered) {
                 console.warn("Hanime Plugin: addMenuItem skipping - Component 'hanime_catalog' is not found/registered in Lampa.Component.");
                 return;
             }
             console.log("Hanime Plugin: Component 'hanime_catalog' confirmed registered.");

             if (menuList.find('.menu__text:contains("Hanime Catalog")').length > 0) {
                 console.log("Hanime Plugin: Menu item with text 'Hanime Catalog' already exists in DOM. Skipping addMenuItem.");
                 return;
             }
             console.log("Hanime Plugin: Adding menu item DOM element to Lampa menu.");

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

            if (typeof menu_item.on === 'function') {
                menu_item.on('hover:enter', function () {
                     console.log("Hanime Plugin: Menu item 'Hanime Catalog' activated via 'hover:enter'. Pushing activity.");
                     if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.push === 'function') {
                         Lampa.Activity.push({
                             url: '',
                             title: 'Hanime Catalog',
                             component: 'hanime_catalog',
                             page: 1
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

             if (menuList.length > 0) {
                 menuList.append(menu_item);
                 console.log("Hanime Plugin: Menu item DOM element successfully added to Lampa menu list.");
             } else {
                 console.error("Hanime Plugin: addMenuItem failed during append: Lampa menu list DOM element ('.menu .menu__list') not found anymore.");
             }
             console.log("Hanime Plugin: addMenuItem finished.");
        }

        console.log("Hanime Plugin: startPlugin() invoked. Setting up Lampa ready listener.");

         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: global plugin_hanime_catalog_ready flag already set. Skipping entire startPlugin execution to prevent double init.");
             return;
         }

         if (window.Lampa && typeof window.Lampa !== 'object' || !Lampa.Listener || typeof Lampa.Listener !== 'object' || typeof Lampa.Listener.follow !== 'function') {
              console.warn("Hanime Plugin: Lampa or Lampa.Listener not available or methods missing. Checking appready flag directly or scheduling delayed start as fallback.");

              if (window.appready && typeof window.appready === 'boolean' && window.appready) {
                  console.log("Hanime Plugin: Lampa 'appready' flag found. Calling initializeLampaDependencies directly as fallback.");
                  initializeLampaDependencies();
              } else {
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

    startPlugin();

})();
