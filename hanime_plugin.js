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
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = [];
        var html = $('<div></div>');
        var body = $('<div class="category-full"></div>');
        var last;
        
        // Конфигурация API
        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URLS = {
            newset: "/catalog/movie/newset.json",
            recent: "/catalog/movie/recent.json",
            mostlikes: "/catalog/movie/mostlikes.json",
            mostviews: "/catalog/movie/mostviews.json"
        };
        
        var PROXY_BASE_URL = "http://77.91.78.5:3000";

        this.fetchCatalogs = function () {
            var _this = this;
            _this.activity.loader(true);
            network.clear();
            
            const requests = Object.entries(CATALOG_URLS).map(([key, path]) => {
                return new Promise((resolve, reject) => {
                    network.native(API_BASE_URL + path, 
                        function(data) {
                            if (data && data.metas && Array.isArray(data.metas)) {
                                resolve({ key, data: data.metas });
                            } else {
                                reject({ key, error: "Invalid data format" });
                            }
                        },
                        function(errorStatus) {
                            reject({ key, error: `Request failed: ${errorStatus}` });
                        }
                    );
                });
            });

            Promise.allSettled(requests).then(results => {
                const catalogData = results
                    .filter(r => r.status === 'fulfilled')
                    .reduce((acc, r) => {
                        acc[r.value.key] = r.value.data;
                        return acc;
                    }, {});

                if (Object.keys(catalogData).length > 0) {
                    _this.build(catalogData);
                } else {
                    _this.empty("Не удалось загрузить данные с сервера");
                }
            });
        };

        this.build = function (catalogData) {
            var _this = this;
            
            // Очистка предыдущих данных
            items.forEach(item => item.destroy());
            items = [];
            body.empty();

            // Создание разделов
            Object.entries(catalogData).forEach(([sectionKey, data]) => {
                if (data.length > 0) {
                    // Заголовок раздела с кнопкой "Ещё"
                    const sectionTitle = getTitle(sectionKey);
                    const sectionHeader = $(`
                        <div class="items-line__head">
                            <div class="items-line__title">${sectionTitle}</div>
                            <div class="items-line__more selector">Еще</div>
                        </div>
                    `);
                    
                    // Горизонтальный скролл для карточек
                    const horizontalScroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
                    const scrollContainer = $('<div class="items-line__body"></div>').append(horizontalScroll.render());
                    
                    // Добавляем обработчик клика на "Еще"
                    sectionHeader.find('.items-line__more').on('hover:enter', () => {
                        Lampa.Activity.push({
                            url: '',
                            title: sectionTitle,
                            component: 'hanime_section',
                            page: 1,
                            params: {
                                section: sectionKey,
                                url: API_BASE_URL + CATALOG_URLS[sectionKey]
                            }
                        });
                    });

                    // Создаем контейнер items-line
                    const itemsLine = $('<div class="items-line layer--visible layer--render items-line--type-cards"></div>')
                        .append(sectionHeader)
                        .append(scrollContainer);

                    // Добавляем карточки в горизонтальный скролл
                    data.forEach(meta => {
                        const card = new HanimeCard(meta);
                        const cardElement = card.render();
                        
                        cardElement.on('hover:focus', () => {
                            last = cardElement[0];
                            horizontalScroll.update(cardElement, true);
                        }).on('hover:enter', () => {
                            console.log("Selected Anime:", meta.id, meta.name);
                            _this.fetchStreamAndMeta(meta.id, meta);
                        });
                        
                        horizontalScroll.append(cardElement);
                        items.push(card);
                    });
                    
                    // Добавляем раздел в основной контейнер
                    body.append(itemsLine);
                }
            });

            // Инициализация скролла
            if (scroll.render().find('.category-full').length === 0) {
                const scrollBody = scroll.render().find('.scroll__body') || $('<div class="scroll__body"></div>');
                scrollBody.append(body);
                scroll.render().find('.scroll__content').append(scrollBody);
            }

            if (html.find('.scroll-box').length === 0) {
                html.append(scroll.render(true));
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
            var streamUrl = API_BASE_URL + `/stream/movie/${id}.json`;
            
            _this.activity.loader(true);
            network.native(streamUrl,
                function(streamData) {
                    _this.activity.loader(false);
                    
                    if (streamData && streamData.streams && streamData.streams.length > 0) {
                        let finalStreamUrl = streamData.streams[0].url;
                        
                        try {
                            const url = new URL(finalStreamUrl);
                            if (url.hostname.includes('highwinds-cdn.com') || 
                                url.hostname.includes('proxy.hentai.stream')) {
                                finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                            }
                        } catch (e) {
                            console.error("URL parsing error", e);
                        }

                        const playerObject = {
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
                function(errorStatus) {
                    _this.activity.loader(false);
                    console.error("Stream fetch error", errorStatus);
                    Lampa.Noty.show(`Ошибка загрузки потока: ${errorStatus}`);
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
            this.fetchCatalogs();
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

    function HanimeSectionComponent() {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = [];
        var html = $('<div></div>');
        var body = $('<div class="category-full"></div>');
        var last;

        this.fetchSection = function () {
            var _this = this;
            const sectionUrl = this.activity.params.url;
            
            _this.activity.loader(true);
            network.clear();
            
            network.native(sectionUrl,
                function(data) {
                    if (data && data.metas && Array.isArray(data.metas)) {
                        if (data.metas.length > 0) {
                            _this.build(data.metas);
                        } else {
                            _this.empty("Раздел пуст.");
                        }
                    } else {
                        _this.empty("Неверный формат данных.");
                        console.error("Invalid data format", data);
                    }
                },
                function(errorStatus) {
                    _this.empty(`Ошибка загрузки: ${errorStatus}`);
                    console.error("Failed to load section", errorStatus);
                }
            );
        };

        this.build = function (result) {
            var _this = this;
            
            items.forEach(item => item.destroy());
            items = [];
            body.empty();

            // Создаем горизонтальный скролл для раздела
            const horizontalScroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
            const itemsLine = $('<div class="items-line layer--visible layer--render items-line--type-cards"></div>');
            const scrollContainer = $('<div class="items-line__body"></div>').append(horizontalScroll.render());
            
            // Добавляем карточки
            result.forEach(meta => {
                const card = new HanimeCard(meta);
                const cardElement = card.render();
                
                cardElement.on('hover:focus', () => {
                    last = cardElement[0];
                    horizontalScroll.update(cardElement, true);
                }).on('hover:enter', () => {
                    console.log("Selected Anime:", meta.id, meta.name);
                    _this.fetchStreamAndMeta(meta.id, meta);
                });
                
                horizontalScroll.append(cardElement);
                items.push(card);
            });
            
            // Добавляем раздел в основной контейнер
            body.append(itemsLine.append(scrollContainer));

            // Инициализация скролла
            if (scroll.render().find('.category-full').length === 0) {
                const scrollBody = scroll.render().find('.scroll__body') || $('<div class="scroll__body"></div>');
                scrollBody.append(body);
                scroll.render().find('.scroll__content').append(scrollBody);
            }

            if (html.find('.scroll-box').length === 0) {
                html.append(scroll.render(true));
            }

            _this.activity.loader(false);
            _this.activity.toggle();
            requestAnimationFrame(() => scroll.reset());
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
            this.fetchSection();
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

        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = API_BASE_URL + `/stream/movie/${id}.json`;
            
            _this.activity.loader(true);
            network.native(streamUrl,
                function(streamData) {
                    _this.activity.loader(false);
                    
                    if (streamData && streamData.streams && streamData.streams.length > 0) {
                        let finalStreamUrl = streamData.streams[0].url;
                        
                        try {
                            const url = new URL(finalStreamUrl);
                            if (url.hostname.includes('highwinds-cdn.com') || 
                                url.hostname.includes('proxy.hentai.stream')) {
                                finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                            }
                        } catch (e) {
                            console.error("URL parsing error", e);
                        }

                        const playerObject = {
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
                function(errorStatus) {
                    _this.activity.loader(false);
                    console.error("Stream fetch error", errorStatus);
                    Lampa.Noty.show(`Ошибка загрузки потока: ${errorStatus}`);
                }
            );
        };
    }

    function startPlugin() {
        if (window.plugin_hanime_catalog_ready) return;
        window.plugin_hanime_catalog_ready = true;
        
        Lampa.Template.add('standard-lampa-card', standardLampaCardTemplate);
        Lampa.Component.add('hanime_catalog', HanimeComponent);
        Lampa.Component.add('hanime_section', HanimeSectionComponent);
        
        function addMenuItem() {
            var menu_item = $(`
                <li class="menu__item selector">
                    <div class="menu__ico">
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">Hanime Каталог</div>
                </li>
            `);
            
            menu_item.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: 'Hanime Каталог',
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
