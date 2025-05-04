(function () {
    'use strict';

    window.plugin_hanime_catalog_ready = false;
    window.hanime_templates_added = false;

    console.log("Hanime Plugin: Script loaded.");

    function addMenuItem() {
        if ($('.menu .menu__item .menu__text:contains("Hanime Catalog")').length > 0) {
             console.log("Hanime Plugin: Menu item already exists.");
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

        menu_item.on('hover:enter', function () {
            console.log("Hanime Plugin: Menu item selected, pushing activity.");
            Lampa.Activity.push({
                url: '',
                title: 'Hanime Catalog',
                component: 'hanime_catalog',
                page: 1,
                catalog: 'Newset'
            });
        });

        $('.menu .menu__list').eq(0).append(menu_item);
        console.log("Hanime Plugin: Menu item added.");
    }

    function HanimeCard(data) {
        var cardTemplate = Lampa.Template.get('hanime-card', {
            id: data.id,
            img: data.poster,
            title: data.name,
        });
        var cardElement = $(cardTemplate);
        cardElement.addClass('selector');
        this.render = function () { return cardElement; };
        this.destroy = function () { cardElement.remove(); };
    }

    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = [];
        var html = $('<div class="hanime-catalog"></div>');
        var head = $('<div class="hanime-head torrent-filter"><div class="hanime__catalog-select simple-button simple-button--filter selector">Catalog: Newset</div></div>');
        var body = $('<div class="hanime-catalog__body category-full"></div>');
        var active = 0;
        var last;

        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URLS = {
            'Newset': API_BASE_URL + "/catalog/movie/newset.json",
            'Recent': API_BASE_URL + "/catalog/movie/recent.json",
            'Most Likes': API_BASE_URL + "/catalog/movie/mostlikes.json",
            'Most Views': API_BASE_URL + "/catalog/movie/mostviews.json",
        };
        var currentCatalogKey = componentObject.catalog || 'Newset';

        var PROXY_BASE_URL = "http://77.91.78.5:3000";

        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true);

            var catalogUrl = CATALOG_URLS[currentCatalogKey];

            network.clear();
            network.native(catalogUrl,
                function (data) {
                    if (data && data.metas && Array.isArray(data.metas)) {
                          _this.clearItems();
                         if (data.metas.length > 0) {
                            _this.build(data.metas);
                         } else {
                             _this.empty("Каталог пуст.");
                         }
                    } else {
                        _this.empty("Неверный формат данных от API.");
                        console.error("Hanime Plugin: Invalid data format", data);
                    }
                },
                function (errorStatus, errorText) {
                    _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                    console.error("Hanime Plugin: Failed to load catalog", errorStatus, errorText);
                },
                false,
                { dataType: 'json', timeout: 15000 }
            );
            head.find('.hanime__catalog-select').text('Catalog: ' + currentCatalogKey);
            console.log("Hanime Plugin: Fetching catalog:", catalogUrl);
        };

        this.clearItems = function() {
             console.log("Hanime Plugin: Clearing items.");
             items.forEach(function(item) { item.destroy(); });
             items = [];
             body.empty();
        };

        this.build = function (result) {
            var _this = this;
            console.log("Hanime Plugin: Building catalog with", result.length, "items.");

            if (scroll.render().find('.hanime-head').length === 0) {
                 scroll.append(head);
                 console.log("Hanime Plugin: Appended head to scroll.");
            }
            if (scroll.render().find('.hanime-catalog__body').length === 0) {
                 scroll.append(body);
                 console.log("Hanime Plugin: Appended body to scroll.");
            }
            if (html.children().length === 0) {
                html.append(scroll.render(true));
                console.log("Hanime Plugin: Appended scroll to html.");
            }

            result.forEach(function (meta) {
                var card = new HanimeCard(meta);
                var cardElement = card.render();

                cardElement.on('hover:focus', function () {
                    last = cardElement[0];
                    active = items.indexOf(card);
                }).on('hover:enter', function () {
                    console.log("Selected Anime:", meta.id, meta.name);
                    _this.fetchStreamAndMeta(meta.id, meta);
                });

                body.append(cardElement);
                items.push(card);
            });

            setTimeout(function() {
                console.log("Hanime Plugin: Running delayed scroll update and toggle.");
                scroll.update();
                _this.activity.loader(false);
                _this.activity.toggle();
                console.log("Hanime Plugin: Catalog built (delayed).");
            }, 50);

        };

        this.setupCatalogSelect = function() {
             var selectElement = head.find('.hanime__catalog-select');
             var _this = this;
             selectElement.on('hover:enter', function() {
                 var catalogOptions = Object.keys(CATALOG_URLS).map(function(key) {
                     return { title: key, selected: key === currentCatalogKey, key: key };
                 });
                 Lampa.Select.show({
                     title: 'Select Catalog',
                     items: catalogOptions,
                     onBack: function() { Lampa.Controller.toggle('content'); },
                     onSelect: function(item) {
                         if (item.key !== currentCatalogKey) {
                             currentCatalogKey = item.key;
                             componentObject.catalog = currentCatalogKey;
                             componentObject.page = 1;
                             _this.fetchCatalog();
                         }
                         Lampa.Controller.toggle('content');
                     }
                 });
                 Lampa.Controller.toggle('select');
             });
             console.log("Hanime Plugin: Catalog select setup.");
        };

        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = API_BASE_URL + "/stream/movie/" + id + ".json";
            var metaUrl = API_BASE_URL + "/meta/movie/" + id + ".json";

            _this.activity.loader(true);

             Promise.all([
                 new Promise((resolve, reject) => {
                     network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                 }),
                 meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                      network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                  })

             ]).then(([streamData, metaDataResponse]) => {
                 _this.activity.loader(false);

                 const fullMetaData = metaDataResponse && metaDataResponse.meta ? metaDataResponse.meta : (metaDataResponse || meta);

                 console.log("Stream Data:", streamData);
                 console.log("Full Meta Data:", fullMetaData);
                 if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                     var streamToPlay = streamData.streams[0];
                     var finalStreamUrl = streamToPlay.url;

                     try {
                         var url = new URL(finalStreamUrl);
                         if (url.hostname.includes('highwinds-cdn.com')) {
                              finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                              console.log("Original stream URL proxied:", finalStreamUrl);
                          } else {
                             console.log("Hanime Plugin: Stream URL is not highwinds-cdn.com, not proxying:", finalStreamUrl);
                          }
                     } catch (e) {
                         console.error("Hanime Plugin: Failed to parse or proxy stream URL", e);
                         finalStreamUrl = streamToPlay.url;
                     }

                     var playerObject = {
                         title: fullMetaData.name || fullMetaData.title || 'Без названия',
                         url: finalStreamUrl,
                         poster: fullMetaData.poster || fullMetaData.background,
                     };
                     if (playerObject.url) {
                          console.log("Hanime Plugin: Launching player with:", playerObject);
                          Lampa.Player.play(playerObject);
                          Lampa.Player.playlist([playerObject]);

                          if (fullMetaData && fullMetaData.id) {
                              const historyMeta = {
                                    id: fullMetaData.id,
                                    title: fullMetaData.name || fullMetaData.title || 'Без названия',
                                    poster: fullMetaData.poster || fullMetaData.background,
                                };
                                Lampa.Favorite.add('history', historyMeta, 100);
                                console.log("Hanime Plugin: Added to history", historyMeta);
                          } else {
                              console.warn("Hanime Plugin: Skipping history add, fullMetaData or ID missing.", fullMetaData);
                          }

                     } else {
                          Lampa.Noty.show('Не удалось получить ссылку на поток.');
                          console.error("Hanime Plugin: No valid stream URL found after processing stream data:", streamData);
                     }

                 } else {
                      Lampa.Noty.show('Потоки не найдены для этого аниме.');
                      console.warn("Hanime Plugin: No streams found or invalid stream data structure:", streamData);
                 }
             }).catch(error => {
                 _this.activity.loader(false);
                 console.error("Hanime Plugin: Failed to fetch stream/meta details", error);
                 var errorMessage = 'Неизвестная ошибка';
                 if (error instanceof Error) { errorMessage = error.message; }
                 else if (typeof error === 'string') { errorMessage = error; }
                 else if (error && typeof error === 'object' && error.statusText) { errorMessage = error.statusText; }
                 else if (error && typeof error === 'object' && error.message) { errorMessage = error.message; }
                 Lampa.Noty.show('Ошибка загрузки деталей: ' + errorMessage);
             });
        };

        this.empty = function (msg) {
            console.log("Hanime Plugin: Displaying empty state:", msg);
            var empty = new Lampa.Empty({ message: msg });
            html.empty().append(empty.render(true));
            this.activity.loader(false);
            this.activity.toggle();
            this.start = empty.start;
        };

        this.create = function () {
            console.log("Hanime Plugin: Creating component.");
            this.activity.loader(true);
            this.setupCatalogSelect();
            this.fetchCatalog();
        };

        this.start = function () {
            if (Lampa.Activity.active().activity !== this.activity) return;
            console.log("Hanime Plugin: Starting component.");

            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    var initialFocus = last || scroll.render().find('.simple-button').first()[0];
                    Lampa.Controller.collectionFocus(initialFocus, scroll.render());
                    console.log("Hanime Plugin: Controller 'content' toggle. Focus on:", initialFocus);
                },
                left: function () {
                    if (Navigator.canmove('left')) { Navigator.move('left'); }
                    else { Lampa.Controller.toggle('menu'); }
                },
                right: function () {
                    Navigator.move('right');
                },
                up: function () {
                    if (Navigator.canmove('up')) { Navigator.move('up'); }
                    else { Lampa.Controller.toggle('head'); }
                },
                down: function () {
                    Navigator.move('down');
                },
                back: this.back
            });

             Lampa.Controller.add('head', {
                 toggle: function() {
                      Lampa.Controller.collectionSet(head);
                      Lampa.Controller.collectionFocus(head.find('.simple-button').first()[0], head);
                      console.log("Hanime Plugin: Head controller toggle. Focus on:", head.find('.simple-button').first()[0]);
                 },
                 left: function() {
                      if (Navigator.canmove('left')) Navigator.move('left');
                      else Lampa.Controller.toggle('menu');
                 },
                 right: function() {
                      Navigator.move('right');
                 },
                 down: function() {
                      Lampa.Controller.toggle('content');
                 },
                 back: this.back
             });

            Lampa.Controller.toggle('content');
        };

        this.pause = function () { console.log("Hanime Plugin: Paused"); };
        this.stop = function () { console.log("Hanime Plugin: Stopped"); };

        this.render = function () {
            return html;
        };

        this.destroy = function () {
             console.log("Hanime Plugin: Destroyed");
            network.clear();
            Lampa.Arrays.destroy(items);
            scroll.destroy();
            html.remove();
             Lampa.Controller.remove('content');
             Lampa.Controller.remove('head');

            items = null;
            network = null; scroll = null; html = null; body = null; head = null; last = null;
        };

        this.back = function () {
             console.log("Hanime Plugin: Going back");
             Lampa.Activity.backward();
        };

         this.search = function(query) {
             console.log("Hanime Plugin: Search initiated with query:", query);
             Lampa.Noty.show('Поиск по API Hanime не поддерживается в этом плагине.');
         };
    }

    function addTemplatesAndStyles() {
         if (window.hanime_templates_added) {
             console.log("Hanime Plugin: Templates and styles already added (via flag).");
             return;
         }

         var style = `
             .hanime-catalog__body.category-full {
                 display: flex;
                 flex-wrap: wrap;
                 justify-content: space-around;
             }
             .hanime-head {
                 display: flex;
                 justify-content: flex-start;
                 align-items: center;
                 margin-left: 1.5em;
                 margin-bottom: 1em;
             }
             .hanime-head .simple-button {
                 margin-right: 1em;
             }
             .hanime-card {
                 width: 185px;
                 margin-bottom: 1.5em;
                 border-radius: 0.5em;
                 overflow: hidden;
                 transition: transform 0.2s ease, box-shadow 0.2s ease;
                 position: relative;
                 box-sizing: border-box;
             }
             .hanime-card.selector:focus {
                 transform: scale(1.05);
                 box-shadow: 0 0 15px rgba(255, 0, 0, 0.7);
                 z-index: 5;
                 border: 3px solid rgba(255, 255, 255, 0.5);
             }
              .hanime-card.selector.focus:not(.native) {
                  border-color: transparent;
                  outline: none;
              }
             .hanime-card__view {
                 position: relative;
                 height: 270px;
                 background-color: rgba(255,255,255,0.05);
                 border-radius: 0.5em;
                 overflow: hidden;
             }
              .hanime-card__img {
                  position: absolute;
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  border-radius: 0.5em;
              }
              .hanime-card__title {
                  margin-top: 0.5em;
                  padding: 0 0.5em;
                  font-size: 1em;
                  font-weight: bold;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  text-align: center;
                  color: #fff;
              }
             .menu__ico svg {
                   width: 1.5em;
                   height: 1.5em;
             }
         `;
         Lampa.Template.add('hanime-style', `<style>${style}</style>`);
         $('head').append(Lampa.Template.get('hanime-style', {}, true));

         var cardTemplate = `
             <div class="hanime-card card selector layer--visible layer--render">
                 <div class="hanime-card__view">
                     <img src="{img}" class="hanime-card__img" alt="{title}" loading="lazy" />
                     </div>
                 <div class="hanime-card__title">{title}</div>
             </div>
         `;
         Lampa.Template.add('hanime-card', cardTemplate);
         window.hanime_templates_added = true;
         console.log("Hanime Plugin: Templates and styles added.");
    }

    function startPlugin() {
        if (window.plugin_hanime_catalog_ready) {
            console.log("Hanime Plugin: Already initialized.");
            return;
        }

        window.plugin_hanime_catalog_ready = true;
        console.log("Hanime Plugin: Starting initialization.");

        addTemplatesAndStyles();
        Lampa.Component.add('hanime_catalog', HanimeComponent);
        console.log("Hanime Plugin: Component 'hanime_catalog' added.");

        if (window.appready) {
             console.log("Hanime Plugin: App is ready, adding menu item.");
             addMenuItem();
        } else {
             console.log("Hanime Plugin: Waiting for app ready event.");
             Lampa.Listener.follow('app', function (e) {
                 if (e.type === 'ready') {
                      console.log("Hanime Plugin: App ready event received, adding menu item.");
                      addMenuItem();
                 }
             });
        }
         console.log("Hanime Plugin: Initialization complete.");
    }

    if (!window.plugin_hanime_catalog_ready) {
        startPlugin();
    } else {
         console.log("Hanime Plugin: Skipping startPlugin, already ready.");
    }

})();
