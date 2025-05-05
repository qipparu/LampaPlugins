(function () {
    'use strict';

    const API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";

    const CATEGORIES = {
        newset: { url: "/catalog/movie/newset.json", title: "Последние добавленные" },
        recent: { url: "/catalog/movie/recent.json", title: "Недавние аниме" },
        mostlikes: { url: "/catalog/movie/mostlikes.json", title: "Самые понравившиеся" },
        mostviews: { url: "/catalog/movie/mostviews.json", title: "Самые просматриваемые" }
    };

    const PROXY_BASE_URL = "http://77.91.78.5:3000";

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
            }
        }

        this.addDetails = function() {
             var viewElement = cardElement.find('.card__view');
             if (!viewElement.length) {
                  return;
             }

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

            let qualityElement = cardElement.find('.card__quality');
            if (processedData.quality) {
                 if (!qualityElement.length) {
                     qualityElement = $('<div class="card__quality"><div></div></div>');
                     viewElement.append(qualityElement);
                 }
                 qualityElement.find('div').text(processedData.quality).parent().show();
            } else {
                 if(qualityElement.length) qualityElement.hide();
            }

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
                     let newAgeElement = $('<div class="card__age"></div>').text(releaseYear);
                      let titleElement = cardElement.find('.card__title');
                      if (titleElement.length) {
                          titleElement.after(newAgeElement);
                      } else {
                          cardElement.append(newAgeElement);
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
            if (status.history || (window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched === 'function' && Lampa.Timeline.watched(processedData))) {
                 this.addicon('history');
             } else {
                 if(window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.get === 'function') {
                     const progress = Lampa.Timeline.get(processedData);
                     if (progress && progress.percent && progress.percent > 5) {
                          this.addicon('history');
                     }
                 }
             }


             var marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];
             var activeMarker = marks.find(m => status[m]);

             if (activeMarker) {
                 var markerElement = cardElement.find('.card__marker');
                 if (!markerElement.length) {
                     markerElement = $('<div class="card__marker"><span></span></div>');
                      var viewElement = cardElement.find('.card__view');
                      if(viewElement.length) viewElement.append(markerElement);
                 }
                 const markerText = window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? Lampa.Lang.translate('title_' + activeMarker) : activeMarker;
                 markerElement.find('span').text(markerText);

                 markerElement.removeClass(marks.map(m => 'card__marker--' + m).join(' '))
                             .addClass('card__marker--' + activeMarker)
                             .show();
             } else {
                 cardElement.find('.card__marker').hide();
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
                               imgElement.attr('src', './img/img_broken.svg');
                               if(window.Lampa && Lampa.Tmdb && typeof Lampa.Tmdb.broken === 'function') Lampa.Tmdb.broken();
                          };
                          imgElement.attr('src', src || './img/img_broken.svg');
                      } else {
                         cardElement.addClass('card--loaded');
                      }
                 } else {
                      imgElement[0].onload = () => { cardElement.addClass('card--loaded'); };
                     imgElement[0].onerror = () => { imgElement.attr('src', './img/img_broken.svg'); };
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
             }

             this.card = cardElement[0];
             if (this.card && typeof this.card.addEventListener === 'function') {
                this.card.addEventListener('visible', this.onVisible.bind(this));
             } else {
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
             if(cardElement && typeof cardElement.remove === 'function') cardElement.remove();
             processedData = null; cardElement = null; this.card = null; componentRef = null; this.onVisible = null; this.create = null; this.update = null; this.render = null; this.destroy = null; this.addicon = null; this.addDetails = null; this.updateFavoriteIcons = null;
        }
    }

    function HanimeComponent(componentObject) {
        var network = null;
        var scroll = null;

        var items = [];
        var html = null;
        var itemsContainer = null;

        var active = 0;
        var last = null;

        this.categoryKey = componentObject.category_key || 'newset';
        const defaultCategory = CATEGORIES[this.categoryKey] || CATEGORIES['newset'];
        this.catalogUrl = componentObject.catalog_url || (API_BASE_URL + defaultCategory.url);
        this.categoryTitle = componentObject.category_title || defaultCategory.title;

         this.activity = componentObject.activity;


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
        };

        this.fetchCatalog = function () {
            var _this = this;
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeComponent: Activity loader not available in fetchCatalog.");


             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
             }

             if (network && typeof network.clear === 'function') network.clear();
             else console.warn("HanimeComponent: Network clear method not available.");

             if(network && _this.catalogUrl && typeof network.native === 'function'){
                network.native(_this.catalogUrl,
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
                  _this.empty("Не удалось загрузить каталог. Ошибка инициализации сети.");
             }
        };

        this.build = function (result) {
            var _this = this;

             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                  scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
             }

             if(scroll && typeof scroll.minus === 'function') scroll.minus();
             else console.warn("HanimeComponent: Scroll or scroll.minus method not available in build(). Cannot scroll to beginning.");

             if (!(itemsContainer && typeof itemsContainer.empty === 'function' && scroll && html && typeof html.find === 'function' && typeof html.append === 'function' && typeof scroll.append === 'function' && typeof scroll.render === 'function' && window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function')) {
                   if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                  _this.empty("Не удалось построить интерфейс.");
                  return;
             }

            itemsContainer.empty();
            items = [];

            result.forEach(function (meta) {
                if (!meta || !meta.id || (!meta.poster && !meta.img)) {
                    return;
                }
                var card = new HanimeCard(meta, _this);
                var cardElement = card.render();

                 itemsContainer.append(cardElement);
                items.push(card);
            });

            scroll.append(itemsContainer);

            html.find('.items-line__body').empty().append(scroll.render(true));

             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
             if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
        };

         this.onCardClick = function(cardData) {
            this.fetchStreamAndMeta(cardData.id, cardData);
         }

         this.showCardContextMenu = function(cardElement, cardData) {
             var _this = this;

             var enabledControllerName = (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;

             var status = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(cardData) : {};

             var menu_favorite = [];
             if(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') {
                 menu_favorite = [
                     { title: Lampa.Lang.translate('title_book'), where: 'book', checkbox: true, checked: status.book, collect:true },
                     { title: Lampa.Lang.translate('title_like'), where: 'like', checkbox: true, checked: status.like, collect:true },
                     { title: Lampa.Lang.translate('title_wath'), where: 'wath', checkbox: true, checked: status.wath, collect:true },
                     { title: Lampa.Lang.translate('menu_history'), where: 'history', checkbox: true, checked: status.history, collect:true },
                     { title: Lampa.Lang.translate('settings_cub_status'), separator: true }
                 ];
                  const marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];
                  marks.forEach(mark => {
                       menu_favorite.push({
                            title: Lampa.Lang.translate('title_' + mark),
                            where: mark,
                            selected: status[mark],
                            collect: true,
                            radio: true
                       });
                  });

             } else {
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

             if (window.Lampa && Lampa.Select && typeof Lampa.Select.show === 'function') {
                 Lampa.Select.show({
                     title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('title_action') : 'Action',
                     items: menu_favorite,
                     onBack: ()=>{
                         if (window.Lampa && Lampa.Controller && enabledControllerName) Lampa.Controller.toggle(enabledControllerName);
                     },
                     onSelect: (a)=>{
                          if(a.collect && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function'){
                              Lampa.Favorite.toggle(a.where, cardData);
                               var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                              if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                          }

                           if (!a.checkbox) {
                                if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                                if (window.Lampa && Lampa.Controller && enabledControllerName) Lampa.Controller.toggle(enabledControllerName);
                           } else {
                                var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                                if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                           }
                     },
                      onDraw: (itemElement, itemData) => {
                           if (itemData.collect && window.Lampa && Lampa.Account && typeof Lampa.Account.hasPremium === 'function' && !Lampa.Account.hasPremium()) {
                                let lockIconTemplate = (window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.has('icon_lock')) ? Lampa.Template.get('icon_lock') : null;
                                if (lockIconTemplate && window.$ && typeof itemElement.find === 'function' && typeof itemElement.append === 'function') {
                                     let wrap = $('<div class="selectbox-item__lock"></div>');
                                     wrap.append($(lockIconTemplate));
                                     itemElement.find('.selectbox-item__checkbox, .selectbox-item__radio').remove();
                                     itemElement.append(wrap);

                                     itemElement.off('hover:enter').on('hover:enter', () => {
                                         if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                                          if (window.Lampa && Lampa.Account && typeof Lampa.Account.showCubPremium === 'function') Lampa.Account.showCubPremium();
                                     });
                                } else {
                                }
                           }
                      }
                 });
             } else {
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Компонент меню недоступен.', 5000);
                 }
             }
         };

        this.updateScrollToFocus = function(element) {
             if (scroll && typeof scroll.update === 'function' && element && element.length > 0) {
                last = element[0];
                scroll.update(element, true);
            } else {
            }
        }

        this.fetchStreamAndMeta = function (id, meta) {
             var _this = this;
            var streamUrl = `${API_BASE_URL}/stream/movie/${id}.json`;
            var metaUrl = `${API_BASE_URL}/meta/movie/${id}.json`;

             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeComponent: Activity loader not available in fetchStreamAndMeta.");


            if (!network || typeof network.native !== 'function') {
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

                if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0];
                    var finalStreamUrl = streamToPlay ? streamToPlay.url : null;

                    if(finalStreamUrl && PROXY_BASE_URL) {
                         try {
                             var url = new URL(finalStreamUrl);
                             if (url.hostname && url.hostname.includes('highwinds-cdn.com')) {
                                 finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                             } else {
                             }
                         } catch (e) {
                             console.error("HanimeComponent: Failed to parse or proxy stream URL:", e);
                         }
                    }

                    var playerObject = {
                        title: fullMetaData ? (fullMetaData.name || fullMetaData.title || 'Без названия') : (meta ? (meta.name || meta.title || 'Без названия') : 'Без названия'),
                        url: finalStreamUrl,
                        poster: fullMetaData ? (fullMetaData.poster || fullMetaData.background || '') : (meta ? (meta.poster || meta.img || '') : ''),
                    };

                    if (playerObject.url && window.Lampa && Lampa.Player && typeof Lampa.Player.play === 'function' && typeof Lampa.Player.playlist === 'function') {
                         Lampa.Player.play(playerObject);
                         Lampa.Player.playlist([playerObject]);

                         if (fullMetaData && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                                const historyMeta = {
                                    id: fullMetaData.id || '',
                                    title: fullMetaData.name || fullMetaData.title || '',
                                    poster: fullMetaData.poster || fullMetaData.background || '',
                                    runtime: fullMetaData.runtime,
                                    year: fullMetaData.year,
                                    original_name: fullMetaData.original_name || ''
                                };
                                Lampa.Favorite.add('history', historyMeta);
                           console.log("HanimeComponent: Added to history.");
                         } else {
                         }

                    } else {
                         if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                             Lampa.Noty.show(playerObject.url ? 'Компонент плеера недоступен.' : 'Не удалось получить ссылку на поток.', 5000);
                         }
                    }

                } else {
                     if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                         Lampa.Noty.show('Потоки не найдены для этого аниме.', 5000);
                     }
                }

            }).catch(error => {
                if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'), 5000);
                 }
            });
        };

        this.empty = function (msg) {
             if (window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function') {
                 var empty = new Lampa.Empty({ message: msg });
                 if(html && typeof html.empty === 'function' && typeof html.append === 'function') html.empty().append(empty.render(true));
                 else console.warn("HanimeComponent: Html container not available or its methods missing to show empty state.");

                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();

                 if (typeof empty.start === 'function') this.start = empty.start.bind(empty);
                 else console.warn("HanimeComponent: Empty component does not have a start method.");

             } else {
                  if(html && typeof html.empty === 'function' && typeof html.text === 'function') html.empty().text(msg + ' (Компонент Empty недоступен в Lampa)');
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                   this.start = function() {
                       if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                            Lampa.Controller.add('content', { back: this.back.bind(this) });
                            Lampa.Controller.toggle('content');
                       } else console.warn("HanimeComponent: Lampa.Controller not available for fallback start method.");
                   }.bind(this);
             }
        };

        this.create = function () {
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                 scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
             } else if (!scroll) console.warn("HanimeComponent: Scroll not initialized in create(), Lampa.Scroll missing.");

              if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
              } else if (!network) console.warn("HanimeComponent: Network not initialized in create(), Lampa.Reguest missing.");

            this.buildLayout();
             if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(true);
            this.fetchCatalog();
        };

        this.start = function () {
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this.activity) {
                return;
            }

            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && scroll && typeof scroll.render === 'function' && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function') {
                 Lampa.Controller.add('content', {
                     toggle: function () {
                          Lampa.Controller.collectionSet(scroll.render());
                         Lampa.Controller.collectionFocus(last || false, scroll.render());
                     },
                     left: function () {
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('left')) {
                              Navigator.move('left');
                         }
                         else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                              Lampa.Controller.toggle('menu');
                         } else {
                         }
                     },
                     right: function () {
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('right')) {
                             Navigator.move('right');
                          } else {
                          }
                     },
                     up: function () {
                         if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                              Lampa.Controller.toggle('head');
                         } else {
                         }
                     },
                     down: function () {
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('down')) {
                             Navigator.move('down');
                          } else {
                          }
                     },
                     back: this.back.bind(this)
                 });

                 Lampa.Controller.toggle('content');

             } else {
                 if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                     Lampa.Controller.add('content', { back: this.back.bind(this) });
                     Lampa.Controller.toggle('content');
                 } else console.warn("HanimeComponent: Lampa.Controller unavailable or methods missing, cannot add basic back handler.");
             }
        };

        this.pause = function () {
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') {
                 last = Lampa.Controller.item() || last;
             } else {
             }
        };

        this.stop = function () {
        };

        this.render = function () {
            if (!html) {
                 this.buildLayout();
            }
            return html;
        };

        this.destroy = function () {
            if(network && typeof network.clear === 'function') network.clear(); network = null;

             if (items && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') {
                 Lampa.Arrays.destroy(items);
             } else if (items) {
                 items.forEach(item => item && typeof item.destroy === 'function' ? item.destroy() : null);
             }
            items = null;

             if (scroll && typeof scroll.destroy === 'function') {
                 scroll.destroy();
             }
             scroll = null;

             if (html && typeof html.remove === 'function') {
                 html.remove();
             }
            html = null; itemsContainer = null; last = null; this.activity = null;

            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function' && typeof Lampa.Controller.collectionSet === 'function') {
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content') {
                      Lampa.Controller.collectionSet([]);
                 }
                 Lampa.Controller.remove('content');
            } else console.warn("HanimeComponent: Lampa.Controller not available or remove/collectionSet methods missing for cleanup in destroy.");

            this.buildLayout = null; this.fetchCatalog = null; this.build = null; this.onCardClick = null; this.showCardContextMenu = null; this.updateScrollToFocus = null; this.fetchStreamAndMeta = null; this.empty = null; this.create = null; this.start = null; this.pause = null; this.stop = null; this.render = null; this.destroy = null; this.back = null;
        };

        this.back = function () {
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') {
                 Lampa.Activity.backward();
             } else console.warn("HanimeComponent: Lampa.Activity or backward method missing for navigation.");
        };
    }

    function startPlugin() {

         if (window.plugin_hanime_catalog_ready) {
             return;
         }

        function initializeLampaDependencies() {

             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Template || typeof Lampa.Template !== 'object' || !Lampa.Component || typeof Lampa.Component !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Scroll || typeof Lampa.Scroll !== 'function' || !Lampa.Reguest || typeof Lampa.Reguest !== 'function') {
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина: Компоненты Lampa недоступны. Обновите Lampa или плагин.', 15000);
                  }
                  return;
             }
              if (!window.plugin_hanime_catalog_ready) {
                 window.plugin_hanime_catalog_ready = true;
              } else {
                   return;
              }

             if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                 Lampa.Template.add('card_vote_temp', '<div class="card__vote"></div>');
                 Lampa.Template.add('card_quality_temp', '<div class="card__quality"><div></div></div>');
                 Lampa.Template.add('card_year_temp', '<div class="card__age"></div>');
                 Lampa.Template.add('card_type_temp', '<div class="card__type"></div>');
                 Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
             } else {
             }

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
                         </div>
                         <div class="card__title">{title}</div>
                         <div class="card__age"></div>
                     </div>
                 `);
             } else {
             }


             if (window.Lampa && Lampa.Component && typeof Lampa.Component.add === 'function') {
                 Lampa.Component.add('hanime_catalog', HanimeComponent);
             } else {
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина: Не удалось зарегистрировать компонент.', 5000);
                  }
             }

             addMenuItem();
        }

        function addMenuItem() {

             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Component || typeof Lampa.Component.get !== 'function' || !Lampa.Select || typeof Lampa.Select.show !== 'function') {
                  return;
             }
             var menuList = $('.menu .menu__list').eq(0);
             if (!menuList.length) {
                 return;
             }

             var ourComponentRegistered = Lampa.Component.get('hanime_catalog');
             if (!ourComponentRegistered) {
                 return;
             }

             if (menuList.find('.menu__text:contains("Hanime Catalog")').length > 0) {
                 return;
             }

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

                     const currentControllerName = (window.Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;

                     const selectItems = Object.keys(CATEGORIES).map(key => {
                         const category = CATEGORIES[key];
                         return {
                             title: category.title,
                             key: key
                         };
                     });

                     Lampa.Select.show({
                         title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('menu_categories') : 'Выберите категорию',
                         items: selectItems,
                         onSelect: (item) => {
                             const selectedCategory = CATEGORIES[item.key];
                             if (selectedCategory) {
                                 Lampa.Select.close();
                                 Lampa.Activity.push({
                                     url: '',
                                     title: selectedCategory.title,
                                     component: 'hanime_catalog',
                                     page: 1,
                                     category_key: item.key,
                                     catalog_url: API_BASE_URL + selectedCategory.url,
                                     category_title: selectedCategory.title
                                 });
                             } else {
                                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка: Неверная категория.');
                                 Lampa.Select.close();
                                  if (currentControllerName && window.Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle(currentControllerName);
                             }
                         },
                         onBack: () => {
                              if (currentControllerName && window.Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle(currentControllerName);
                         }
                     });

                 } else {
                      if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Компонент выбора недоступен.');
                 }
                });
            } else {
            }

             if (menuList.length > 0) {
                 menuList.append(menu_item);
             } else {
             }
        }


         if (window.plugin_hanime_catalog_ready) {
             return;
         }

         if (window.Lampa && typeof window.Lampa !== 'object' || !Lampa.Listener || typeof Lampa.Listener !== 'object' || typeof Lampa.Listener.follow !== 'function') {

              if (window.appready && typeof window.appready === 'boolean' && window.appready) {
                  initializeLampaDependencies();
              } else {
                  setTimeout(initializeLampaDependencies, 500);
              }

         } else {
             Lampa.Listener.follow('app', function (e) {
                 if (e.type === 'ready') {
                     initializeLampaDependencies();
                 }
             });
         }
    }

    startPlugin();

})();
