(function () {
    'use strict';

    // Шаблон карточки без класса card--category для горизонтального отображения
    var standardLampaCardTemplate = `
        <div class="card selector layer--render card--loaded">
            <div class="card__view">
                <img src="{img}" class="card__img" alt="{title}" loading="lazy" />
            </div>
            <div class="card__title">{title}</div>
        </div>
    `;

    // Ручное добавление CSS-стилей для горизонтального скролла
    var style = document.createElement('style');
    style.textContent = `
        .items-line {
            display: flex;
            overflow-x: auto;
            gap: 10px;
            padding: 10px;
            -webkit-overflow-scrolling: touch;
        }
        .card {
            flex: 0 0 auto;
            width: 150px;
            height: auto;
        }
        .card__img {
            aspect-ratio: 2/3;
            object-fit: cover;
        }
        .scroll--horizontal {
            overflow-x: auto;
        }
        .scroll__body {
            display: flex;
            gap: 10px;
        }
    `;
    document.head.appendChild(style);

    function HanimeCard(data) {
        var cardElement = $(Lampa.Template.get('standard-lampa-card', {
            img: data.poster || '',
            title: data.name || ''
        }));
        
        this.render = function () {
            return cardElement;
        };
        
        this.destroy = function () {
            cardElement.remove();
        };
    }

    function HanimeComponent() {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true,
            step: 250,
            horizontal: true // Горизонтальный скролл
        });
        var items = [];
        var html = $('<div></div>');
        var body = $('<div class="items-line"></div>'); // Горизонтальный контейнер
        var last;

        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URLS = {
            newset: API_BASE_URL + "/catalog/movie/newset.json"
        };
        var SELECTED_CATALOG_URL = CATALOG_URLS.newset;
        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var PROXY_BASE_URL = "http://77.91.78.5:3000";

        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true);
            network.clear();
            
            network.native(SELECTED_CATALOG_URL,
                function (data) {
                    if (data && data.metas && Array.isArray(data.metas)) {
                        _this.build(data.metas);
                    } else {
                        _this.empty("Неверный формат данных");
                    }
                },
                function (errorStatus, errorText) {
                    _this.empty("Ошибка загрузки каталога: " + errorStatus);
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
            items.forEach(function(item) { item.destroy(); });
            items = [];
            body.empty();

            result.forEach(function (meta) {
                var card = new HanimeCard(meta);
                var cardElement = card.render();
                
                cardElement.on('hover:focus', function () {
                    last = cardElement[0];
                    scroll.update(cardElement, true);
                }).on('hover:enter', function () {
                    _this.fetchStreamAndMeta(meta.id, meta);
                });

                body.append(cardElement);
                items.push(card);
            });

            // Обертка для горизонтального скролла
            var scrollBody = $('<div class="scroll__body"></div>').append(body);
            var scrollContainer = scroll.render();
            scrollContainer.find('.scroll__content').empty().append(scrollBody);

            if (html.find('.scroll-box').length === 0) {
                html.append(scrollContainer);
            }

            _this.activity.loader(false);
            _this.activity.toggle();
            
            scroll.onEnd = function () {
                console.log("Горизонтальный скролл завершен");
            };
        };

        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            _this.activity.loader(true);
            
            network.native(streamUrl,
                function(streamData) {
                    _this.activity.loader(false);
                    
                    if (streamData && streamData.streams && streamData.streams.length > 0) {
                        var streamToPlay = streamData.streams[0];
                        var finalStreamUrl = streamToPlay.url;
                        
                        try {
                            var url = new URL(finalStreamUrl);
                            if (url.hostname.includes('highwinds-cdn.com') || url.hostname.includes('proxy.hentai.stream')) {
                                finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                            }
                        } catch (e) {
                            console.error("Ошибка проксирования", e);
                        }

                        var playerObject = {
                            title: meta.name || 'Без названия',
                            url: finalStreamUrl,
                            poster: meta.poster
                        };

                        if (playerObject.url) {
                            Lampa.Player.play(playerObject);
                            Lampa.Player.playlist([playerObject]);
                            
                            Lampa.Favorite.add('history', {
                                id: meta.id,
                                title: meta.name,
                                poster: meta.poster
                            }, 100);
                        }
                    }
                },
                function(errorStatus) {
                    _this.activity.loader(false);
                    Lampa.Noty.show('Ошибка потока: ' + errorStatus);
                },
                false,
                {
                    dataType: 'json',
                    timeout: 10000
                }
            );
        };

        this.empty = function (msg) {
            var empty = new Lampa.Empty({ message: msg });
            scroll.render().empty().append(empty.render(true));
            
            if (html.find('.scroll-box').length === 0) {
                html.append(scroll.render(true));
            }
            
            this.activity.loader(false);
            this.activity.toggle();
            this.start = empty.start;
        };

        this.create = function () {
            this.fetchCatalog();
        };

        this.start = function () {
            if (Lampa.Activity.active().activity !== this.activity) return;
            
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function () {
                    if (Navigator.canmove('right')) Navigator.move('right');
                },
                up: function () {
                    Lampa.Controller.toggle('head');
                },
                down: function () {
                    Lampa.Controller.toggle('menu');
                },
                back: this.back
            });
            
            Lampa.Controller.toggle('content');
        };

        this.pause = function () {};
        this.stop = function () {};
        
        this.render = function () {
            return html;
        };
        
        this.destroy = function () {
            network.clear();
            Lampa.Arrays.destroy(items);
            
            if (scroll) {
                scroll.onEnd = null;
                scroll.destroy();
            }
            
            if (html) html.remove();
            items = null;
            network = null;
            scroll = null;
            html = null;
            body = null;
            last = null;
        };
        
        this.back = function () {
            Lampa.Activity.backward();
        };
    }

    function startPlugin() {
        if (window.plugin_hanime_catalog_ready) return;
        window.plugin_hanime_catalog_ready = true;
        
        Lampa.Template.add('standard-lampa-card', standardLampaCardTemplate);
        Lampa.Component.add('hanime_catalog', HanimeComponent);
        
        function addMenuItem() {
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
                Lampa.Activity.push({
                    url: '',
                    title: 'Hanime Catalog',
                    component: 'hanime_catalog',
                    page: 1
                });
            });
            
            $('.menu .menu__list').eq(0).append(menu_item);
        }
        
        if (window.appready) {
            addMenuItem();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') {
                    addMenuItem();
                }
            });
        }
    }

    startPlugin();
})();
