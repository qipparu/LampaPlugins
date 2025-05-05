(function () {
    'use strict';

    // --- HanimeCard component ---
    // No significant logic change needed in HanimeCard itself for this specific error.
    // It relies on the templates and Lampa components being ready when it's constructed and used.
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

         // IMPORTANT: The 'hanime-card' template must exist in Lampa.Template before this is called.
         // This will be handled in initializeLampaDependencies before component registration.
        var cardTemplate = Lampa.Template.get('hanime-card', {
            img: processedData.poster_path,
            title: processedData.title,
            vote: processedData.vote_average > 0 ? parseFloat(processedData.vote_average).toFixed(1) : '',
            quality: processedData.quality,
            year: processedData.release_year !== '0000' ? processedData.release_year : '',
            type: processedData.type
        });

        var cardElement = $(cardTemplate);

        this.addicon = function(name) {
            var iconsContainer = cardElement.find('.card__icons-inner');
            if (iconsContainer.length) {
                var icon = document.createElement('div');
                icon.classList.add('card__icon');
                icon.classList.add('icon--'+name);
                iconsContainer.append(icon);
            }
        }

        this.updateFavoriteIcons = function() {
             console.log("HanimeCard: updateFavoriteIcons() for", processedData.title);
            cardElement.find('.card__icons-inner').empty();
            cardElement.find('.card__marker').remove();

             var status = (window.Lampa && Lampa.Favorite) ? Lampa.Favorite.check(processedData) : {};

            if (status.book) this.addicon('book');
            if (status.like) this.addicon('like');
            if (status.wath) this.addicon('wath');
             if (status.history || (window.Lampa && Lampa.Timeline && Lampa.Timeline.watched && Lampa.Timeline.watched(processedData))) this.addicon('history');

             var marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];
             var activeMarker = marks.find(m => status[m]);

             if (activeMarker) {
                 var markerElement = cardElement.find('.card__marker');
                 if (!markerElement.length) {
                     markerElement = $('<div class="card__marker"><span></span></div>');
                     cardElement.find('.card__view').append(markerElement);
                 }
                 markerElement.find('span').text(window.Lampa && Lampa.Lang && Lampa.Lang.translate ? Lampa.Lang.translate('title_' + activeMarker) : activeMarker);
                 markerElement.removeClass(marks.map(m => 'card__marker--' + m).join(' '))
                             .addClass('card__marker--' + activeMarker);
             } else {
                 cardElement.find('.card__marker').remove();
             }
        };

        this.onVisible = function() {
             console.log("HanimeCard: onVisible() for", processedData.title);
             var imgElement = cardElement.find('.card__img');

             if (imgElement.length && (!imgElement.attr('src') || imgElement.attr('src').includes('img_load.svg'))) {
                 var src = processedData.poster_path;
                 if (!src) src = './img/img_broken.svg';

                 if(window.Lampa && Lampa.ImageCache) {
                      if(!Lampa.ImageCache.read(imgElement[0], src)) {
                          imgElement[0].onload = () => { cardElement.addClass('card--loaded'); Lampa.ImageCache.write(imgElement[0], imgElement[0].src); console.log("HanimeCard: Image loaded:", src); };
                          imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error:', src); imgElement.attr('src', './img/img_broken.svg'); if(window.Lampa && Lampa.Tmdb) Lampa.Tmdb.broken(); };
                          imgElement.attr('src', src);
                      } else {
                         cardElement.addClass('card--loaded');
                         console.log("HanimeCard: Image from cache:", src);
                      }
                 } else {
                      imgElement[0].onload = () => { cardElement.addClass('card--loaded'); console.log("HanimeCard: Image loaded (no cache):", src); };
                     imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error (no cache):', src); imgElement.attr('src', './img/img_broken.svg'); };
                     imgElement.attr('src', src);
                     console.log("HanimeCard: Image processing started (no cache):", src);
                 }
             }
            this.updateFavoriteIcons();
        }

        this.create = function(){
             console.log("HanimeCard: create() for", processedData.title);
             if (!cardElement[0] || cardElement.data('created')) { // Prevent duplicate creation
                  console.log("HanimeCard: create() already called or element not ready.", cardElement[0]);
                  return;
             }
              cardElement.data('created', true); // Mark as created

            cardElement.on('hover:focus', function () {
                 console.log("HanimeCard: hover:focus on", processedData.title);
                 if (componentRef && componentRef.updateScrollToFocus) {
                      componentRef.updateScrollToFocus(cardElement);
                 }
                 this.update();
            }.bind(this));

             cardElement.on('hover:enter', function () {
                console.log("HanimeCard: hover:enter on", processedData.title);
                 if (componentRef && componentRef.onCardClick) {
                     componentRef.onCardClick(processedData);
                 }
            }.bind(this));

            cardElement.on('hover:long', function(){
                 console.log("HanimeCard: hover:long on", processedData.title);
                 if (componentRef && componentRef.showCardContextMenu) {
                      componentRef.showCardContextMenu(cardElement, processedData);
                 }
             }.bind(this));

             this.card = cardElement[0];
             this.card.addEventListener('visible', this.onVisible.bind(this));

             setTimeout(() => {
                  this.update();
             }, 0);

            console.log("HanimeCard: create() completed and event listeners attached.");
        }

        this.update = function(){
             console.log("HanimeCard: update() called for", processedData.title);
            this.updateFavoriteIcons();
             // Add Timeline status update here if available and needed
             // if(window.Lampa && Lampa.Timeline && Lampa.Timeline.watched_status) Lampa.Timeline.watched_status(cardElement, processedData);
        }

        this.render = function(js){
             console.log("HanimeCard: render() called.");
             this.create(); // Ensure create is called before returning the element
            return js ? cardElement[0] : cardElement;
        }

        this.destroy = function(){
             console.log("HanimeCard: destroy() for", processedData.title);
             if(this.card) {
                 this.card.removeEventListener('visible', this.onVisible.bind(this));
                 console.log("HanimeCard: Visible event listener removed.");
             } else {
                 console.warn("HanimeCard: DOM element not available for event listener removal during destroy.");
             }

             if(cardElement) {
                 cardElement.remove();
                 console.log("HanimeCard: DOM element removed.");
             } else {
                  console.warn("HanimeCard: jQuery element not available for removal during destroy.");
             }

             processedData = null;
             cardElement = null;
             this.card = null;
             componentRef = null;
             console.log("HanimeCard: destroy() completed.");
        }

        // Do NOT call create() here. It's called inside render().
        // this.create();
    }


    // --- HanimeComponent ---
    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
        var items = [];
        var html;
        var itemsContainer;
        var active = 0;
        var last;

        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json";
        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";
        var PROXY_BASE_URL = "http://77.91.78.5:3000";


        this.buildLayout = function() {
             console.log("HanimeComponent: buildLayout()");
            html = $(`
                <div class="items-line layer--visible layer--render items-line--type-cards">
                    <div class="items-line__head">
                        <div class="items-line__title">Последние добавленные</div>
                    </div>
                    <div class="items-line__body">
                    </div>
                </div>
            `);
             itemsContainer = $('<div class="items-cards"></div>');
             console.log("HanimeComponent: buildLayout completed.");
        };

        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true);
            console.log("HanimeComponent: fetchCatalog() from", CATALOG_URL);

            if(network) network.clear();

            network.native(CATALOG_URL,
                function (data) {
                     console.log("HanimeComponent: Catalog data received.");
                    if (data && data.metas && Array.isArray(data.metas)) {
                         if (data.metas.length > 0) {
                            _this.build(data.metas);
                         } else {
                            _this.empty("Каталог пуст.");
                         }
                    } else {
                        _this.empty("Неверный формат данных от API.");
                        console.error("HanimeComponent: Invalid data format", data);
                    }
                },
                function (errorStatus, errorText) {
                    _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                    console.error("HanimeComponent: Failed to load catalog", errorStatus, errorText);
                },
                false,
                {
                    dataType: 'json',
                    timeout: 15000
                }
            );
        };

        this.build = function (result) {
            var _this = this;
             console.log("HanimeComponent: build() with", result.length, "items.");

            if(scroll) scroll.minus();

            if (itemsContainer) itemsContainer.empty();
            // Destroy previous card objects to clean up event listeners and DOM (important!)
            if(items && window.Lampa && Lampa.Arrays) Lampa.Arrays.destroy(items);
            items = [];

            result.forEach(function (meta) {
                var card = new HanimeCard(meta, _this); // Pass component ref
                var cardElement = card.render();

                if (itemsContainer) itemsContainer.append(cardElement);
                items.push(card);
            });
             console.log("HanimeComponent: Created", items.length, "cards.");

            if(scroll && itemsContainer) scroll.append(itemsContainer);
            else console.error("HanimeComponent: Scroll or itemsContainer not available for append in build().");


            if(html && scroll) html.find('.items-line__body').empty().append(scroll.render(true));
            else console.error("HanimeComponent: Html or scroll not available for rendering scroll in build().");


            _this.activity.loader(false);
            _this.activity.toggle();
             console.log("HanimeComponent: Build completed and activity toggled.");
        };

        this.onCardClick = function(cardData) {
             console.log("HanimeComponent: Card clicked:", cardData);
            this.fetchStreamAndMeta(cardData.id, cardData);
        }

        this.showCardContextMenu = function(cardElement, cardData) {
             console.log("HanimeComponent: showCardContextMenu for", cardData.title);
             var _this = this;
             var enabled = (window.Lampa && Lampa.Controller && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;

             var status = (window.Lampa && Lampa.Favorite) ? Lampa.Favorite.check(cardData) : {};

             var menu_favorite = [
                 { title: (window.Lampa && Lampa.Lang && Lampa.Lang.translate) ? Lampa.Lang.translate('title_book') : 'Запланировано', where: 'book', checkbox: true, checked: status.book },
                 { title: (window.Lampa && Lampa.Lang && Lampa.Lang.translate) ? Lampa.Lang.translate('title_like') : 'Нравится', where: 'like', checkbox: true, checked: status.like },
                 { title: (window.Lampa && Lampa.Lang && Lampa.Lang.translate) ? Lampa.Lang.translate('title_wath') : 'Смотрю', where: 'wath', checkbox: true, checked: status.wath },
                 { title: (window.Lampa && Lampa.Lang && Lampa.Lang.translate) ? Lampa.Lang.translate('menu_history') : 'История', where: 'history', checkbox: true, checked: status.history },
                 { title: (window.Lampa && Lampa.Lang && Lampa.Lang.translate) ? Lampa.Lang.translate('settings_cub_status') : 'Статус', separator: true }
             ];

             if (window.Lampa && Lampa.Select && Lampa.Lang && Lampa.Template) { // Added Template check here
                 Lampa.Select.show({
                     title: Lampa.Lang.translate('title_action'),
                     items: menu_favorite,
                     onBack: ()=>{
                         if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                          console.log("HanimeComponent: Context menu back. Restored controller:", enabled);
                     },
                     onCheck: (a)=>{
                         console.log("HanimeComponent: Context menu checked:", a.where);
                         if(window.Lampa && Lampa.Favorite) Lampa.Favorite.toggle(a.where, cardData);
                         var cardObj = items.find(item => item.render(true) === cardElement[0]);
                         if(cardObj) cardObj.updateFavoriteIcons();
                     },
                     onSelect: (a)=>{
                          console.log("HanimeComponent: Context menu selected:", a);
                          if(a.collect){
                              if(window.Lampa && Lampa.Favorite) Lampa.Favorite.toggle(a.where, cardData);
                               var cardObj = items.find(item => item.render(true) === cardElement[0]);
                              if(cardObj) cardObj.updateFavoriteIcons();
                          }
                          Lampa.Select.close();
                           if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                            console.log("HanimeComponent: Context menu selected and closed. Restored controller:", enabled);
                     },
                      onDraw: (item, elem) => {
                           if (elem.collect && window.Lampa && Lampa.Account && !Lampa.Account.hasPremium()) {
                                let lockIconTemplate = Lampa.Template.has('icon_lock') ? Lampa.Template.get('icon_lock') : ''; // Using has AFTER appready should be okay here
                                if (lockIconTemplate) {
                                     let wrap = $('<div class="selectbox-item__lock"></div>');
                                     wrap.append($(lockIconTemplate));
                                     item.find('.selectbox-item__checkbox').remove();
                                     item.append(wrap);
                                     item.on('hover:enter', () => {
                                         Lampa.Select.close();
                                          if (Lampa.Account) Lampa.Account.showCubPremium();
                                     });
                                } else {
                                     console.warn("Hanime Component: icon_lock template not available for Premium item in onDraw.");
                                }
                           }
                      }
                 });
             } else {
                 console.warn("Hanime Component: Lampa.Select, Lang or Template not available for context menu.");
                 if(window.Lampa && Lampa.Noty) Lampa.Noty.show('Компонент меню или переводы недоступны.');
             }
         };

        this.updateScrollToFocus = function(element) {
             console.log("HanimeComponent: updateScrollToFocus() called.");
            if (scroll) {
                last = element[0];
                scroll.update(element, true);
                 console.log("HanimeComponent: Scroll updated to focused element:", last);
            } else {
                console.warn("HanimeComponent: Scroll instance not available for update.");
            }
        }

        this.fetchStreamAndMeta = function (id, meta) {
             var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

            _this.activity.loader(true);
            console.log("HanimeComponent: fetchStreamAndMeta for", id);

            if (!network) {
                console.error("HanimeComponent: Network component not available.");
                _this.activity.loader(false);
                 if(window.Lampa && Lampa.Noty) Lampa.Noty.show('Сетевой компонент недоступен.');
                return;
            }

            Promise.all([
                new Promise((resolve, reject) => {
                    network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                }),
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                     network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                 })
            ]).then(([streamData, metaDataResponse]) => {
                _this.activity.loader(false);
                const fullMetaData = metaDataResponse.meta || metaDataResponse;
                console.log("HanimeComponent: Stream data:", streamData, "Meta data:", fullMetaData);

                if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0];
                    var finalStreamUrl = streamToPlay.url;

                    try {
                         var url = new URL(finalStreamUrl);
                         if (url.hostname && url.hostname.includes('highwinds-cdn.com')) {
                             finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                             console.log("HanimeComponent: Stream URL proxied:", finalStreamUrl);
                         } else {
                            console.log("HanimeComponent: Stream URL not needing proxy:", finalStreamUrl);
                         }
                    } catch (e) {
                        console.error("HanimeComponent: Failed to parse or proxy stream URL", e);
                        console.log("HanimeComponent: Using original stream URL due to parse error:", finalStreamUrl);
                    }

                    var playerObject = {
                        title: fullMetaData.name || fullMetaData.title || 'Без названия',
                        url: finalStreamUrl,
                        poster: fullMetaData.poster || fullMetaData.background || '',
                    };

                    if (playerObject.url && window.Lampa && Lampa.Player) {
                         console.log("HanimeComponent: Launching player.");
                         Lampa.Player.play(playerObject);
                         Lampa.Player.playlist([playerObject]);

                         if (fullMetaData && window.Lampa && Lampa.Favorite) {
                                const historyMeta = {
                                    id: fullMetaData.id || '',
                                    title: fullMetaData.name || fullMetaData.title || '',
                                    poster: fullMetaData.poster || fullMetaData.background || '',
                                    runtime: fullMetaData.runtime,
                                    year: fullMetaData.year,
                                    original_name: fullMetaData.original_name || ''
                                };
                                Lampa.Favorite.add('history', historyMeta, 100);
                                 console.log("HanimeComponent: Added to history.");
                         }

                    } else {
                         console.error("HanimeComponent: Cannot launch player - No URL or Lampa.Player not available.");
                         if(window.Lampa && Lampa.Noty) Lampa.Noty.show(playerObject.url ? 'Компонент плеера недоступен.' : 'Не удалось получить ссылку на поток.');
                    }

                } else {
                     console.warn("HanimeComponent: No streams found in data or invalid data structure.");
                     if(window.Lampa && Lampa.Noty) Lampa.Noty.show('Потоки не найдены для этого аниме.');
                }

            }).catch(error => {
                _this.activity.loader(false);
                console.error("HanimeComponent: Error fetching stream/meta details:", error);
                 if(window.Lampa && Lampa.Noty) Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'));
            });
        };

        this.empty = function (msg) {
             console.log("HanimeComponent: empty() -", msg);
             if (window.Lampa && Lampa.Empty) {
                 var empty = new Lampa.Empty({ message: msg });
                 if(html) html.empty().append(empty.render(true));
                 else console.warn("HanimeComponent: Html container not available to show empty state.");

                 this.activity.loader(false);
                 this.activity.toggle();
                 this.start = empty.start;
                  console.log("HanimeComponent: Displaying empty state via Lampa.Empty.");
             } else {
                  console.warn("HanimeComponent: Lampa.Empty not available, using basic text for empty state.");
                  if(html) html.empty().text(msg + ' (Компонент Empty недоступен в Lampa)');
                  this.activity.loader(false);
                  this.activity.toggle();
                   this.start = function() {
                        console.log("HanimeComponent: Fallback start() for empty state.");
                       if(window.Lampa && Lampa.Controller) {
                            Lampa.Controller.add('content', { back: this.back });
                            Lampa.Controller.toggle('content');
                       }
                   }.bind(this);
             }
        };

        this.create = function () {
            console.log("HanimeComponent: create()");
            this.buildLayout();
            this.activity.loader(true);
            this.fetchCatalog();
             console.log("HanimeComponent: create() finished. Fetching catalog.");
        };

        this.start = function () {
            console.log("HanimeComponent: start()");
            if (window.Lampa && Lampa.Activity && Lampa.Activity.active().activity !== this.activity) {
                console.log("HanimeComponent: start() - Not the active activity, skipping.");
                return;
            }
             console.log("HanimeComponent: start() - Activity is active. Setting up Lampa.Controller.");

            if (window.Lampa && Lampa.Controller && scroll && html) { // Added html check here
                 Lampa.Controller.add('content', {
                     toggle: function () {
                         console.log("HanimeComponent: Controller toggle() called.");
                         Lampa.Controller.collectionSet(scroll.render());
                         Lampa.Controller.collectionFocus(last || false, scroll.render());
                          console.log("HanimeComponent: Controller collectionSet/Focus finished.");
                     },
                     left: function () {
                         if (Navigator.canmove('left')) Navigator.move('left');
                         else if (window.Lampa && Lampa.Controller) Lampa.Controller.toggle('menu');
                         else console.log("HanimeComponent: Cannot move left and menu controller not available.");
                     },
                     right: function () {
                         if (Navigator.canmove('right')) Navigator.move('right');
                          else console.log("HanimeComponent: Cannot move right.");
                     },
                     up: function () {
                         if (window.Lampa && Lampa.Controller) Lampa.Controller.toggle('head');
                         else console.log("HanimeComponent: Head controller not available for UP.");
                     },
                     down: function () {
                          if (Navigator.canmove('down')) Navigator.move('down');
                          else console.log("HanimeComponent: Cannot move down.");
                     },
                     back: this.back
                 });
                 Lampa.Controller.toggle('content');
                  console.log("HanimeComponent: Controller 'content' toggled.");

             } else {
                console.error("HanimeComponent: Lampa.Controller, scroll or html not available in start().");
                 if(window.Lampa && Lampa.Controller) {
                     Lampa.Controller.add('content', { back: this.back });
                     Lampa.Controller.toggle('content');
                 } else console.warn("HanimeComponent: Lampa.Controller not available, basic Back might not work.");
             }
        };

        this.pause = function () {
             console.log("HanimeComponent: pause()");
             if(window.Lampa && Lampa.Controller && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content') {
                 last = Lampa.Controller.item() || last;
                  console.log("HanimeComponent: Paused. Saved last focused item:", last);
             } else {
                  console.log("HanimeComponent: Pause called, but content controller not active. Last focus not saved.");
             }
        };

        this.stop = function () {
             console.log("HanimeComponent: stop()");
        };

        this.render = function () {
             console.log("HanimeComponent: render() called.");
            if (!html) {
                 this.buildLayout();
            }
            return html;
        };

        this.destroy = function () {
            console.log("HanimeComponent: destroy() called.");
            if(network) network.clear();
            network = null;

            if (items && window.Lampa && Lampa.Arrays) { Lampa.Arrays.destroy(items); console.log("HanimeComponent: Destroyed items.");}
            items = null;

            if (scroll) { scroll.destroy(); console.log("HanimeComponent: Destroyed scroll."); }
            scroll = null;

            if (html) { html.remove(); console.log("HanimeComponent: Removed html."); }
            html = null;
            itemsContainer = null;

            if (window.Lampa && Lampa.Controller) {
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content') {
                      Lampa.Controller.collectionSet([]);
                       console.log("HanimeComponent: Content controller active, collection cleared.");
                 }
                 Lampa.Controller.remove('content');
                  console.log("HanimeComponent: Content controller removed.");
            }

            last = null;

            console.log("HanimeComponent: destroy() finished. Resources released.");
        };

        this.back = function () {
             console.log("HanimeComponent: back() - Calling Activity.backward()");
             if(window.Lampa && Lampa.Activity) Lampa.Activity.backward();
             else console.warn("HanimeComponent: Lampa.Activity not available for backward navigation.");
        };
    }

    // --- Plugin Initialization Function ---
    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() invoked.");

        // Check the ready flag first to avoid attaching multiple listeners
        if (window.plugin_hanime_catalog_ready_listener) { // Use a different flag for the listener itself
             console.log("Hanime Plugin: appready listener already attached.");
             return;
        }

        // Check the ready flag that indicates if the plugin dependencies are fully initialized.
         // If dependencies are already initialized (meaning appready already fired and ran initializeLampaDependencies), just return.
        if (window.plugin_hanime_catalog_ready) {
            console.log("Hanime Plugin: Plugin dependencies already initialized. Skipping startPlugin listener.");
             return;
        }


        // Separate function to handle Lampa-dependent initializations after appready
        function initializeLampaDependencies() {
             console.log("Hanime Plugin: initializeLampaDependencies() called (Lampa appready event received).");

             // IMPORTANT: Set the 'fully initialized' flag here *after* dependencies are added.
             if (!window.plugin_hanime_catalog_ready) { // Check again just in case
                 window.plugin_hanime_catalog_ready = true;
                 console.log("Hanime Plugin: plugin_hanime_catalog_ready flag set.");
             } else {
                 console.log("Hanime Plugin: plugin_hanime_catalog_ready flag was already set before initializeLampaDependencies completed? Skipping template/component/css setup to avoid duplicates.");
                 // If the flag is somehow set here, it means this function was called multiple times or logic is mixed.
                 // In a complex scenario, one might add more sophisticated checks or clear previously added resources.
                 // For now, if the flag is set, we assume initial setup already ran successfully.
                 // Just proceed with menu item addition if not already there.
                 if (window.Lampa && window.Lampa.Activity && window.Lampa.Controller && window.$) {
                     addMenuItem(); // Attempt to add menu item if Lampa core is available.
                 } else {
                     console.error("Hanime Plugin: Lampa core components not available despite flag being set.");
                 }
                 return; // Exit to prevent re-adding everything
             }


             // --- 1. Define Standard Lampa Template Fallbacks (if they don't exist) ---
             // These are defined BEFORE our custom template uses them.
             console.log("Hanime Plugin: Defining standard template fallbacks...");
             if (window.Lampa && Lampa.Template) {
                 Lampa.Template.add('card_vote_temp', '<div class="card__vote hanime-card__vote">{vote}</div>');
                 Lampa.Template.add('card_quality_temp', '<div class="card__quality hanime-card__quality"><div>{quality}</div></div>');
                 Lampa.Template.add('card_year_temp', '<div class="card__age hanime-card__age">{year}</div>');
                 Lampa.Template.add('card_type_temp', '<div class="card__type hanime-card__type">{type}</div>');
                 Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
                 console.log("Hanime Plugin: Standard template fallbacks defined.");
             } else {
                 console.error("Hanime Plugin: Lampa.Template not available for defining standard fallbacks.");
             }


             // --- 2. Define Your Custom Card Template ---
             // It can now safely use the standard templates defined above.
             if (window.Lampa && Lampa.Template) {
                 console.log("Hanime Plugin: Adding hanime-card template...");
                 Lampa.Template.add('hanime-card', `
                     <div class="hanime-card card selector layer--visible layer--render">
                         <div class="card__view hanime-card__view">
                             <img src="./img/img_load.svg" class="card__img hanime-card__img" alt="{title}" loading="lazy" />
                             <div class="card__icons hanime-card__icons">
                                 <div class="card__icons-inner hanime-card__icons-inner"></div>
                             </div>
                             <!-- Safely use standard templates as they are defined -->
                             ${Lampa.Template.get('card_vote_temp', { vote: '{vote}' })}
                             ${Lampa.Template.get('card_quality_temp', { quality: '{quality}' })}
                             ${Lampa.Template.get('card_type_temp', { type: '{type}' })}
                         </div>
                         <div class="card__title hanime-card__title">{title}</div>
                         ${Lampa.Template.get('card_year_temp', { year: '{year}' })}
                     </div>
                 `);
                 console.log("Hanime Plugin: HanimeCard template defined.");
             } else {
                  console.error("Hanime Plugin: Lampa.Template not available for defining hanime-card template.");
             }


             // --- 3. Add CSS Styles ---
             // These define the visual appearance based on standard Lampa classes.
             console.log("Hanime Plugin: Adding CSS styles...");
             var style = `
                /* Your CSS styles as in previous version */
                .items-line { padding: 1em 0; }
                .items-line__head { padding: 0 3.5em 1em 3.5em; }
                .items-line__body { padding: 0 2.5em; }
                .card {
                     width: 185px; height: auto; margin: 0 0.5em; border-radius: 0.5em;
                     overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease;
                     position: relative; box-sizing: border-box; background-color: rgba(255,255,255,0.05);
                     text-align: center; display: inline-block; vertical-align: top;
                }
                .card.selector:focus { transform: scale(1.05); box-shadow: 0 0 15px rgba(255, 165, 0, 0.8); z-index: 5; border-color: transparent; }
                .card.selector.focus:not(.native) { outline: none; }
                .card__view { position: relative; width: 100%; height: 270px; border-radius: 0.5em; overflow: hidden; background-color: rgba(255,255,255,0.05); }
                 .card__img { position: absolute; width: 100%; height: 100%; object-fit: cover; border-radius: 0.5em; opacity: 0.9; transition: opacity 0.2s ease; }
                 .card--loaded .card__img { opacity: 1; }
                .card__icons { position: absolute; top: 0.5em; right: 0.5em; z-index: 2; }
                .card__icons-inner { display: flex; flex-direction: column; gap: 0.3em; }
                .card__icon { width: 1em; height: 1em; padding: 0.3em; border-radius: 50%; background-color: rgba(0,0,0,0.5); }
                .card__vote { position: absolute; bottom: 0.5em; left: 0.5em; background-color: rgba(0,0,0,0.7); color: #fff; padding: 0.2em 0.4em; border-radius: 0.3em; font-size: 0.9em; font-weight: bold; z-index: 2; }
                .card__quality { position: absolute; bottom: 0.5em; right: 0.5em; background-color: rgba(0,0,0,0.7); color: #fff; padding: 0.2em 0.4em; border-radius: 0.3em; font-size: 0.9em; z-index: 2; }
                .card__type { position: absolute; top: 0.5em; left: 0.5em; background-color: rgba(0,0,0,0.7); color: #fff; padding: 0.2em 0.4em; border-radius: 0.3em; font-size: 0.9em; font-weight: bold; z-index: 2; }
                .card__title { margin-top: 0.5em; padding: 0 0.2em; font-size: 1em; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; color: #fff; }
                .card__age { text-align: center; font-size: 0.9em; color: rgba(255, 255, 255, 0.7); }
                 .card__marker { position: absolute; top: 0; left: 0; right: 0; background-color: rgba(0,0,0,0.7); color: #fff; text-align: center; font-size: 0.8em; padding: 0.2em; z-index: 3; }
                  .card__marker--viewed { background-color: rgba(0,128,0,0.7); } /* Green */
                   .card__marker--continued { background-color: rgba(0,0,255,0.7); } /* Blue */
                   .card__marker--planned, .card__marker--scheduled { background-color: rgba(255,165,0,0.7); } /* Orange/Yellow */
                   .card__marker--thrown { background-color: rgba(255,0,0,0.7); } /* Red */

                .menu__ico svg { width: 1.5em; height: 1.5em; }
             `;

             if (window.Lampa && Lampa.Template && window.$) { // Added $ check for append
                 Lampa.Template.add('hanime-style', `<style>${style}</style>`);
                 $('head').append(Lampa.Template.get('hanime-style', {}, true));
                 console.log("Hanime Plugin: CSS styles added.");
             } else {
                  console.error("Hanime Plugin: Cannot add CSS. Lampa.Template or jQuery not available.");
             }


             // --- 4. Register Your Main Component ---
             if (window.Lampa && Lampa.Component && Lampa.Template && Lampa.Template.has('hanime_catalog')) { // Added template check here as a safeguard
                 Lampa.Component.add('hanime_catalog', HanimeComponent);
                 console.log("Hanime Plugin: Component 'hanime_catalog' registered.");
             } else {
                 console.error("Hanime Plugin: Lampa.Component or 'hanime_catalog' template not available for registration.");
             }


             // --- 5. Add Menu Item (if Lampa core is ready and our component is registered) ---
             if (window.Lampa && Lampa.Activity && Lampa.Controller && window.$ && Lampa.Component && Lampa.Component.get('hanime_catalog')) { // Check all needed dependencies
                 addMenuItem(); // Call the function to add the menu item.
                 console.log("Hanime Plugin: Attempting to add menu item.");
             } else {
                 console.error("Hanime Plugin: Lampa core components or HanimeComponent not fully available for adding menu item.");
             }

             console.log("Hanime Plugin: initializeLampaDependencies() finished.");
        }


        // Function to add the menu item
        function addMenuItem() {
             console.log("Hanime Plugin: addMenuItem() called.");

             // Final checks before DOM manipulation and event binding
             if (!window.Lampa || !Lampa.Activity || !Lampa.Controller || !window.$ || !Lampa.Template || !Lampa.Component || !Lampa.Component.get('hanime_catalog')) {
                  console.warn("Hanime Plugin: Prerequisite Lampa components not available for adding menu item.");
                  return;
             }


             // Check if menu item already exists
             if ($('.menu .menu__list .menu__text:contains("Hanime Catalog")').length > 0) {
                 console.log("Hanime Plugin: Menu item already exists in DOM. Skipping addition.");
                 return;
             }

             console.log("Hanime Plugin: Creating and adding menu item DOM element.");
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

            menu_item.on('hover:enter', function () {
                 console.log("Hanime Plugin: Menu item activated. Pushing 'hanime_catalog' activity.");
                Lampa.Activity.push({
                    url: '',
                    title: 'Hanime Catalog',
                    component: 'hanime_catalog',
                    page: 1
                });
            });

            var menuList = $('.menu .menu__list').eq(0);
             if (menuList.length > 0) {
                 menuList.append(menu_item);
                 console.log("Hanime Plugin: Menu item added to DOM successfully.");
             } else {
                 console.error("Hanime Plugin: Could not find Lampa menu list to append menu item.");
             }
        }


        // --- Entry point to wait for Lampa to be ready ---
        console.log("Hanime Plugin: startPlugin() setting up appready listener.");

         // Check if the 'appready' listener has already been attached by this plugin instance.
        if (window.plugin_hanime_catalog_ready_listener) {
             console.log("Hanime Plugin: appready listener was already attached by a previous run of startPlugin in this scope. Exiting startPlugin to prevent duplicate listeners.");
             // If the listener was already attached, it means startPlugin ran multiple times in the same global scope without the page reloading.
             // The previous listener will handle the initialization when appready fires.
             return;
         }

         // Set a flag indicating that we have attached the listener in this scope.
         window.plugin_hanime_catalog_ready_listener = true;
         console.log("Hanime Plugin: plugin_hanime_catalog_ready_listener flag set.");


        if (window.appready) {
             console.log("Hanime Plugin: Lampa is already appready. Calling initializeLampaDependencies directly.");
            // Remove the listener flag if we are handling appready immediately.
             if (window.plugin_hanime_catalog_ready_listener) delete window.plugin_hanime_catalog_ready_listener;
            initializeLampaDependencies();
        } else {
             console.log("Hanime Plugin: Lampa is not yet appready. Attaching listener.");
             if (window.Lampa && Lampa.Listener) {
                 Lampa.Listener.follow('app', function (e) {
                     if (e.type === 'ready') {
                         console.log("Hanime Plugin: Lampa 'appready' event received.");
                         // Remove the listener flag once the event is handled.
                         if (window.plugin_hanime_catalog_ready_listener) delete window.plugin_hanime_catalog_ready_listener;
                         // Remove the listener itself to avoid being called again?
                         // Lampa's Listener might manage this automatically, check docs if needed.
                         // For robustness, remove the event listener here if possible, though Lampa's system might be auto-cleaning.
                         // Removing listeners dynamically can be complex; relying on the `plugin_hanime_catalog_ready` flag set within `initializeLampaDependencies`
                         // to prevent duplicate template/component/css setup is often sufficient.
                         initializeLampaDependencies();
                     }
                 });
                  console.log("Hanime Plugin: Lampa 'appready' listener attached.");
             } else {
                 console.error("Hanime Plugin: Lampa.Listener not available. Cannot wait for appready. Plugin initialization failed.");
                 // If Listener is not available, the plugin likely won't work correctly. Log error.
                 // Do NOT proceed with initialization that relies on Lampa components.
             }
        }

        console.log("Hanime Plugin: startPlugin() execution finished.");
    }

    // Call the main entry function to start the plugin initialization process.
    startPlugin();

})();
