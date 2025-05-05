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

    function HanimeComponent(componentObject) {
        var network = null;
        var scroll = null;

        var items = [];
        var html = null;
        var itemsContainer = null;

        var active = 0; // Appears unused, but kept
        var last = null;

        // Get the category key from componentObject, default to 'newset'
        var currentCategoryKey = componentObject && componentObject.category ? componentObject.category : 'newset';
        var currentCategory = CATEGORIES[currentCategoryKey];

        // Fallback if category key is invalid (shouldn't happen if using CATEGORIES object)
        if (!currentCategory) {
            console.error("HanimeComponent: Invalid category key received:", currentCategoryKey, ". Falling back to newset.");
            currentCategoryKey = 'newset';
            currentCategory = CATEGORIES[currentCategoryKey];
        }

        var currentCatalogUrl = API_BASE_URL + currentCategory.url;
        var currentTitle = currentCategory.title;


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
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeComponent: Activity loader not available in fetchCatalog.");

             console.log("HanimeComponent: fetchCatalog() - Starting request to", currentCatalogUrl); // Use dynamic URL

             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeComponent: Lampa.Reguest initialized.");
             }

             if (network && typeof network.clear === 'function') network.clear();
             else console.warn("HanimeComponent: Network clear method not available.");

             if(network && currentCatalogUrl && typeof network.native === 'function'){
                network.native(currentCatalogUrl, // Use dynamic URL
                    function (data) {
                        if (data && data.metas && Array.isArray(data.metas)) {
                             if (data.metas.length > 0) {
                                _this.build(data.metas);
                             } else {
                                _this.empty("Каталог пуст.");
                             }
                        } else {
                            _this.empty("Неверный формат данных от API.");
                            console.error("HanimeComponent: Invalid data format from API.", data);
                        }
                    },
                    function (errorStatus, errorText) {
                        _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                        console.error("HanimeComponent: Failed to load catalog.", errorStatus, errorText);
                    },
                    false,
                    { dataType: 'json', timeout: 15000 }
                );
             } else {
                 console.error("HanimeComponent: Cannot fetch catalog. Network component, currentCatalogUrl, or network.native missing.");
                  _this.empty("Не удалось загрузить каталог. Ошибка инициализации сети.");
             }
        };

        this.build = function (result) {
            var _this = this;
             console.log("HanimeComponent: build() - Building UI with", result.length, "items.");

             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                  scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
                  console.log("HanimeComponent: Lampa.Scroll initialized (horizontal).");
             }

             if(scroll && typeof scroll.minus === 'function') scroll.minus();
             else console.warn("HanimeComponent: Scroll or scroll.minus method not available in build(). Cannot scroll to beginning.");

             if (!(itemsContainer && typeof itemsContainer.empty === 'function' && scroll && html && typeof html.find === 'function' && typeof html.append === 'function' && typeof scroll.append === 'function' && typeof scroll.render === 'function')) {
                  console.error("HanimeComponent: Missing critical DOM/Lampa dependencies (itemsContainer, scroll, html, Lampa.Template.get methods) in build(). Aborting UI build.");
                   if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                  _this.empty("Не удалось построить интерфейс.");
                  return;
             }

            itemsContainer.empty();
            items = [];

            if(itemsContainer && scroll && window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function') {
                 result.forEach(function (meta) {
                    var card = new HanimeCard(meta, _this);
                    var cardElement = card.render();

                     itemsContainer.append(cardElement);
                    items.push(card);
                });
                 console.log("HanimeComponent: Created and added", items.length, "cards to itemsContainer.");

                scroll.append(itemsContainer);

                html.find('.items-line__body').empty().append(scroll.render(true));

            } else {
                console.error("HanimeComponent: Missing required objects or methods before building cards in build().");
                if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина при создании карточек.', 5000);
                  }
            }

             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
             if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
             console.log("HanimeComponent: Build process completed and activity toggled.");
        };

         this.onCardClick = function(cardData) {
             console.log("HanimeComponent: Card clicked:", cardData.title);
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
                         var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                          if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                         else console.warn("HanimeComponent: Failed to find Card object to update icons after onCheck.");
                     },
                     onSelect: (a)=>{
                          console.log("HanimeComponent: Context menu - item selected:", a);
                          if(a.collect && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function'){
                              Lampa.Favorite.toggle(a.where, cardData);
                               var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                              if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                               else console.warn("HanimeComponent: Failed to find Card object to update icons after onSelect.");
                          }
                          if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                           if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                            console.log("HanimeComponent: Context menu selected and closed.");
                     },
                      onDraw: (item, elem) => {
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

        this.updateScrollToFocus = function(element) {
             if (scroll && typeof scroll.update === 'function' && element && typeof element.length === 'number' && element.length > 0) {
                last = element[0];
                scroll.update(element, true);
            } else {
                console.warn("HanimeComponent: Scroll instance or update method, or valid element missing to scroll.");
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
                             // Check if the stream URL requires proxying
                             // Note: This check assumes a specific hostname 'highwinds-cdn.com'
                             // If other hostnames require proxying, they should be added here.
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
                    };

                    if (playerObject.url && window.Lampa && Lampa.Player && typeof Lampa.Player.play === 'function' && typeof Lampa.Player.playlist === 'function') {
                         console.log("HanimeComponent: Launching player.");
                         Lampa.Player.play(playerObject);
                         Lampa.Player.playlist([playerObject]);

                         if (fullMetaData && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                                const historyMeta = {
                                    id: fullMetaData.id || '', title: fullMetaData.name || fullMetaData.title || '', poster: fullMetaData.poster || fullMetaData.background || '',
                                    runtime: fullMetaData.runtime, year: fullMetaData.year, original_name: fullMetaData.original_name || ''
                                };
                                Lampa.Favorite.add('history', historyMeta, 100);
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
                if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                console.error("HanimeComponent: Error fetching stream/meta details:", error);
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

                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                 // Assign the start method from Lampa.Empty
                 if (typeof empty.start === 'function') this.start = empty.start;
                 else console.warn("HanimeComponent: Empty component does not have a start method.");

                  console.log("HanimeComponent: Displaying empty state via Lampa.Empty.");
             } else {
                  console.warn("HanimeComponent: Lampa.Empty component not available. Using basic text fallback.");
                  if(html && typeof html.empty === 'function' && typeof html.text === 'function') html.empty().text(msg + ' (Компонент Empty недоступен в Lampa)');
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                   // Fallback start method if Lampa.Empty is not available
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
            console.log("HanimeComponent: create() for category:", currentCategoryKey);
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                 scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
                  console.log("HanimeComponent: Lampa.Scroll initialized in create().");
             } else if (!scroll) console.warn("HanimeComponent: Scroll not initialized in create(), Lampa.Scroll missing.");

              if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeComponent: Lampa.Reguest initialized in create().");
              } else if (!network) console.warn("HanimeComponent: Network not initialized in create(), Lampa.Reguest missing.");

            this.buildLayout();
             if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(true);
            this.fetchCatalog();
             console.log("HanimeComponent: create() finished. Fetching catalog initiated for category:", currentCategoryKey);
        };

        this.start = function () {
            console.log("HanimeComponent: start() for category:", currentCategoryKey);
            // Check if this activity is the currently active one before setting up the controller
             if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this.activity) {
                console.log("HanimeComponent: start() - Not the currently active activity, skipping controller setup.");
                return;
            }
             console.log("HanimeComponent: start() - Activity is active. Setting up Lampa.Controller.");

            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && scroll && typeof scroll.render === 'function' && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function') {
                 Lampa.Controller.add('content', {
                     toggle: function () {
                         console.log("HanimeComponent: Controller toggle() called for category:", currentCategoryKey);
                          Lampa.Controller.collectionSet(scroll.render());
                         Lampa.Controller.collectionFocus(last || false, scroll.render());
                          console.log("HanimeComponent: Controller collectionSet/Focus called in toggle() for category:", currentCategoryKey);
                     },
                     left: function () {
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('left')) Navigator.move('left');
                         else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('menu');
                         else console.log("HanimeComponent: Cannot move left for category:", currentCategoryKey, ", Navigator or menu controller unavailable.");
                     },
                     right: function () {
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('right')) Navigator.move('right');
                          else console.log("HanimeComponent: Cannot move right for category:", currentCategoryKey, ", Navigator unavailable or no more elements.");
                     },
                     up: function () {
                         if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('head');
                         else console.log("HanimeComponent: Head controller unavailable for UP from category:", currentCategoryKey);
                     },
                     down: function () {
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('down')) Navigator.move('down');
                          else console.log("HanimeComponent: Cannot move down for category:", currentCategoryKey, ", Navigator unavailable or no elements below.");
                     },
                     back: this.back
                 });

                 Lampa.Controller.toggle('content');
                  console.log("HanimeComponent: Controller 'content' toggled for category:", currentCategoryKey, ". Initial focus attempt made by Controller.");

             } else {
                console.error("HanimeComponent: Lampa.Controller or scroll, or required methods not available in start() for category:", currentCategoryKey, ". Cannot setup main Controller.");
                 // Add a basic controller for the back button as a fallback
                 if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                     console.log("HanimeComponent: Attempting to add basic Controller for Back button for category:", currentCategoryKey);
                     Lampa.Controller.add('content', { back: this.back });
                     Lampa.Controller.toggle('content');
                 } else console.warn("HanimeComponent: Lampa.Controller unavailable or methods missing, cannot add basic back handler.");
             }
        };


        this.pause = function () {
             console.log("HanimeComponent: pause() called for category:", currentCategoryKey);
             // Save the last focused item if the content controller is active
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') {
                 last = Lampa.Controller.item() || last;
                  console.log("HanimeComponent: Activity paused. Saved last focused DOM item:", last, " for category:", currentCategoryKey);
             } else {
                  console.log("HanimeComponent: Pause called for category:", currentCategoryKey, ", but content controller not active or Controller.item missing. Last focus not saved.");
             }
        };

        this.stop = function () {
             console.log("HanimeComponent: stop() called for category:", currentCategoryKey);
        };

        this.render = function () {
            if (!html) {
                 this.buildLayout();
            }
            return html;
        };

        this.destroy = function () {
            console.log("HanimeComponent: destroy() called for category:", currentCategoryKey);
            if(network && typeof network.clear === 'function') network.clear(); network = null;

             if (items && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') {
                 Lampa.Arrays.destroy(items);
                 console.log("HanimeComponent: Destroyed items array for category:", currentCategoryKey);
             }
            items = null;

             if (scroll && typeof scroll.destroy === 'function') {
                 scroll.destroy();
                 console.log("HanimeComponent: Destroyed scroll instance for category:", currentCategoryKey);
             }
             scroll = null;

             if (html && typeof html.remove === 'function') {
                 html.remove();
                 console.log("HanimeComponent: Removed html element from DOM for category:", currentCategoryKey);
             }
            html = null; itemsContainer = null;

            // Remove the controller associated with this component instance
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function') {
                 // Check if this component's controller is currently active before setting collection to empty
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.collectionSet === 'function') {
                     // Only clear collection if this specific controller was active
                     // A more robust check would involve checking if the activity matches
                      // For simplicity, we'll just clear if 'content' is active, assuming this is the only 'content' controller used by this plugin
                      // If other plugins use 'content', this might interfere slightly, but Lampa typically manages controllers per activity.
                       console.log("HanimeComponent: Clearing Controller collection for category:", currentCategoryKey);
                      Lampa.Controller.collectionSet([]); // Important for cleanup
                 }
                 // Always try to remove the controller by name, even if it wasn't active
                 Lampa.Controller.remove('content'); // Removes the controller named 'content'
                  console.log("HanimeComponent: Controller 'content' removed for category:", currentCategoryKey);
            } else console.warn("HanimeComponent: Lampa.Controller not available or remove method missing for cleanup in destroy for category:", currentCategoryKey);

            console.log("HanimeComponent: destroy() finished. All resources released for category:", currentCategoryKey);
        };

        this.back = function () {
             console.log("HanimeComponent: back() called for category:", currentCategoryKey, ". Attempting Activity.backward().");
             // Go back in Lampa's activity stack
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') {
                 Lampa.Activity.backward();
             } else console.warn("HanimeComponent: Lampa.Activity or backward method missing for navigation.");
        };
    }

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
             addMenuItem(); // Now add the menu items after the component is registered
              console.log("Hanime Plugin: initializeLampaDependencies() called addMenuItem().");

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

             // Check if our component is registered
             var ourComponentRegistered = Lampa.Component.get('hanime_catalog');
             if (!ourComponentRegistered) {
                 console.warn("Hanime Plugin: addMenuItem skipping - Component 'hanime_catalog' is not found/registered in Lampa.Component.");
                 return;
             }
             console.log("Hanime Plugin: Component 'hanime_catalog' confirmed registered.");

             // Check if any of our menu items already exist to prevent duplicates on re-runs (e.g., plugin reload)
             // Check for existing text content from our defined categories
             let itemsExist = false;
             for (const categoryKey in CATEGORIES) {
                  if (CATEGORIES.hasOwnProperty(categoryKey)) {
                       if (menuList.find('.menu__text:contains("' + CATEGORIES[categoryKey].title + '")').length > 0) {
                            itemsExist = true;
                           break;
                       }
                  }
             }

             if (itemsExist) {
                 console.log("Hanime Plugin: At least one Hanime Catalog menu item already exists in DOM. Skipping addMenuItem.");
                 return;
             }

             console.log("Hanime Plugin: Adding menu item DOM elements to Lampa menu.");

             // Loop through the CATEGORIES object and add a menu item for each
            for (const categoryKey in CATEGORIES) {
                if (CATEGORIES.hasOwnProperty(categoryKey)) {
                    const category = CATEGORIES[categoryKey];

                    var menu_item = $(`
                        <li class="menu__item selector">
                            <div class="menu__ico">
                                <svg fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"></path>
                                </svg>
                            </div>
                            <div class="menu__text">${category.title}</div> <!-- Use category title -->
                        </li>
                    `);

                    if (typeof menu_item.on === 'function') {
                        // Attach event listener. Use a closure to capture the current categoryKey.
                        (function(key, title) {
                            menu_item.on('hover:enter', function () {
                                console.log("Hanime Plugin: Menu item for category '" + key + "' ('" + title + "') activated via 'hover:enter'. Pushing activity.");
                                 if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.push === 'function') {
                                     Lampa.Activity.push({
                                         url: '', // The component uses its own URL logic based on 'category' param
                                         title: title, // Use the category title for the activity header
                                         component: 'hanime_catalog',
                                         page: 1, // Start at page 1 (if applicable, component handles pagination)
                                         category: key // Pass the category key to the component
                                     });
                                      console.log("Hanime Plugin: Lampa.Activity.push called with category:", key);
                                 } else {
                                      console.warn("Hanime Plugin: Lampa.Activity or push method unavailable to launch activity for category:", key);
                                     if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Не удалось запустить активность.');
                                 }
                            });
                        })(categoryKey, category.title); // Pass the current key and title into the closure

                        console.log("Hanime Plugin: 'hover:enter' event listener attached for category:", categoryKey);
                    } else {
                        console.warn("Hanime Plugin: jQuery on() method not available for menu item. Cannot attach event listener for category:", categoryKey);
                    }

                     // Append the created menu item to the list
                    if (menuList.length > 0) {
                         menuList.append(menu_item);
                         console.log("Hanime Plugin: Menu item DOM element for category '" + categoryKey + "' successfully added to Lampa menu list.");
                    } else {
                         console.error("Hanime Plugin: addMenuItem failed during append for category '" + categoryKey + "': Lampa menu list DOM element ('.menu .menu__list') not found anymore.");
                         break; // Stop adding if list is gone unexpectedly
                    }
                }
            }

             console.log("Hanime Plugin: addMenuItem finished adding all category items.");
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
