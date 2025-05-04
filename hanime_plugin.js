(function () {
    'use strict';

    // Стандартная карточка Lampa
    var standardLampaCardTemplate = `
        <div class="card selector layer--render card--loaded">
            <div class="card__view">
                <img src="{img}" class="card__img" alt="{title}" loading="lazy" />
            </div>
            <div class="card__title">{title}</div>
        </div>
    `;

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
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 180 });
        var items = [];
        var html = $('<div></div>');
        var body = $('<div class="category-full"></div>');
        var last;
        
        // Конфигурация API
        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URLS = {
            newset: API_BASE_URL + "/catalog/movie/newset.json",
            recent: API_BASE_URL + "/catalog/movie/recent.json",
            mostlikes: API_BASE_URL + "/catalog/movie/mostlikes.json",
            mostviews: API_BASE_URL + "/catalog/movie/mostviews.json"
        };
        
        var PROXY_BASE_URL = "http://77.91.78.5:3000";
        var CARDS_PER_ROW = 8;

        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true);
            network.clear();
            
            // Загружаем данные для всех разделов
            const requests = Object.entries(CATALOG_URLS).map(([key, url]) => {
                return new Promise((resolve, reject) => {
                    network.native(url, 
                        function(data) {
                            if (data && data.metas && Array.isArray(data.metas)) {
                                resolve({ key, data: data.metas });
                            } else {
                                reject({ key, error: "Invalid data format" });
                            }
                        },
                        function(errorStatus, errorText) {
                            reject({ key, error: `Request failed: ${errorStatus}` });
                        }
                    );
                });
            });

            Promise.allSettled(requests).then(results => {
                const successfulResults = results
                    .filter(r => r.status === 'fulfilled')
                    .reduce((acc, r) => {
                        acc[r.value.key] = r.value.data;
                        return acc;
                    }, {});

                if (Object.keys(successfulResults).length > 0) {
                    _this.build(successfulResults);
                } else {
                    _this.empty("Не удалось загрузить данные с сервера");
                }
            });
        };

        this.build = function (catalogData) {
            var _this = this;
            
            // Очищаем предыдущие элементы
            items.forEach(item => item.destroy());
            items = [];
            body.empty();

            // Создаем строки для каждого раздела
            Object.entries(catalogData).forEach(([sectionKey, data]) => {
                if (data.length > 0) {
                    const sectionTitle = $(`<div class="category-full__title">${getTitle(sectionKey)}</div>`);
                    const row = $('<div class="items-line"></div>');
                    
                    // Группируем карточки по строкам
                    for (let i = 0; i < data.length; i += CARDS_PER_ROW) {
                        const cardBatch = data.slice(i, i + CARDS_PER_ROW);
                        const cardRow = $('<div class="items-line__row"></div>');
                        
                        cardBatch.forEach(meta => {
                            const card = new HanimeCard(meta);
                            const cardElement = card.render();
                            
                            cardElement.on('hover:focus', () => {
                                last = cardElement[0];
                                scroll.update(cardElement, true);
                            }).on('hover:enter', () => {
                                console.log("Selected Anime:", meta.id, meta.name);
                                _this.fetchStreamAndMeta(meta.id, meta);
                            });
                            
                            cardRow.append(cardElement);
                            items.push(card);
                        });
                        
                        row.append(cardRow);
                    }
                    
                    body.append(sectionTitle).append(row);
                }
            });

            // Инициализируем скролл
            if (!scroll.initialized) {
                const scrollContent = scroll.render();
                const scrollBody = scrollContent.find('.scroll__body') || $('<div class="scroll__body"></div>');
                
                scrollBody.append(body);
                scrollContent.find('.scroll__content').append(scrollBody);
                html.append(scrollContent);
                scroll.initialized = true;
            }

            _this.activity.loader(false);
            _this.activity.toggle();
            requestAnimationFrame(() => scroll.reset());
        };

        function getTitle(key) {
            const titles = {
                newset: "Новое",
                recent: "Последнее",
                mostlikes: "Популярное",
                mostviews: "Самое просматриваемое"
            };
            return titles[key] || key;
        }

        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = API_BASE_URL + "/stream/movie/" + id + ".json";
            
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
                            console.error("URL parsing error", e);
                        }

                        var playerObject = {
                            title: meta.name || meta.title || 'Без названия',
                            url: finalStreamUrl,
                            poster: meta.poster || meta.background
                        };
                        
                        if (playerObject.url) {
                            Lampa.Player.play(playerObject);
                            Lampa.Player.playlist([playerObject]);
                            
                            const historyMeta = {
                                id: meta.id,
                                title: meta.name || meta.title,
                                poster: meta.poster || meta.background
                            };
                            Lampa.Favorite.add('history', historyMeta, 100);
                        } else {
                            Lampa.Noty.show('Не удалось получить ссылку на поток.');
                        }
                    } else {
                        Lampa.Noty.show('Потоки не найдены.');
                    }
                },
                function(errorStatus, errorText) {
                    _this.activity.loader(false);
                    console.error("Stream fetch error", errorStatus, errorText);
                    Lampa.Noty.show('Ошибка загрузки потока: ' + errorStatus);
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
                right: function () { Navigator.move('right'); },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function () { Navigator.move('down'); },
                back: this.back
            });
            
            Lampa.Controller.toggle('content');
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return html; };
        
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

    // Добавьте эти стили в ваш CSS файл
    /*
    .category-full {
        padding: 0 20px;
    }
    
    .category-full__title {
        font-size: 18px;
        margin: 20px 0 10px;
        color: #fff;
    }
    
    .items-line {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }
    
    .items-line__row {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
    }
    
    .card {
        flex: 0 0 calc(12.5% - 9px);
        width: calc(12.5% - 9px);
        max-width: calc(12.5% - 9px);
        height: auto;
        margin: 0;
        transition: transform 0.2s ease;
    }
    
    .card:hover {
        transform: scale(1.05);
    }
    
    .card__view {
        aspect-ratio: 2/3;
        position: relative;
        overflow: hidden;
        border-radius: 4px;
    }
    
    .card__img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 4px;
    }
    
    .card__title {
        font-size: 12px;
        margin-top: 8px;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
    }
    */
    
    startPlugin();
})();
