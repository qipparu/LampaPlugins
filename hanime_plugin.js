(function () {
    'use strict';

    function fetchWithCorsProxy(url, callback, fail, options = {}) {
        const proxiedUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
        Lampa.Reguest().native(proxiedUrl, callback, fail, false, options);
    }

    function HanimeCard(data) {
        var cardTemplate = Lampa.Template.get('hanime-card', {
            id: data.id,
            img: data.poster,
            title: data.name,
        });

        var cardElement = $(cardTemplate);

        cardElement.addClass('selector');

        this.render = function () {
            return cardElement;
        };

        this.destroy = function () {
            cardElement.remove();
        };
    }

    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = [];
        var html = $('<div class="hanime-catalog"></div>');
        var body = $('<div class="hanime-catalog__body category-full"></div>');
        var active = 0;
        var last;

        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json";
        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";

        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true);

            network.clear();
            fetchWithCorsProxy(CATALOG_URL,
                function (data) {
                    if (data && data.metas && Array.isArray(data.metas)) {
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
                {
                    dataType: 'json',
                    timeout: 15000
                }
            );
        };

        this.build = function (result) {
            var _this = this;
            scroll.minus();

            result.forEach(function (meta) {
                var card = new HanimeCard(meta);
                var cardElement = card.render();

                cardElement.on('hover:focus', function () {
                    last = cardElement[0];
                    active = items.indexOf(card);
                    scroll.update(cardElement, true);
                }).on('hover:enter', function () {
                    console.log("Selected Anime:", meta.id, meta.name);
                    _this.fetchStreamAndMeta(meta.id, meta);
                });

                body.append(cardElement);
                items.push(card);
            });

            scroll.append(body);
            html.append(scroll.render(true));
            _this.activity.loader(false);
            _this.activity.toggle();
        };

        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

            _this.activity.loader(true);

            Promise.all([
                new Promise((resolve, reject) => {
                    fetchWithCorsProxy(streamUrl, resolve, reject, { dataType: 'json', timeout: 10000 });
                }),
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                    fetchWithCorsProxy(metaUrl, resolve, reject, { dataType: 'json', timeout: 10000 });
                })
            ]).then(([streamData, metaDataResponse]) => {
                _this.activity.loader(false);

                const fullMetaData = metaDataResponse.meta || metaDataResponse;

                console.log("Stream Data:", streamData);
                console.log("Full Meta Data:", fullMetaData);

                if (streamData && streamData.streams && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0];

                    var playerObject = {
                        title: fullMetaData.name || fullMetaData.title || 'Без названия',
                        url: streamToPlay.url,
                        poster: fullMetaData.poster || fullMetaData.background,
                    };

                    if (playerObject.url) {
                        console.log("Launching player with:", playerObject);
                        Lampa.Player.play(playerObject);
                        Lampa.Player.playlist([playerObject]);

                        if (fullMetaData) {
                            const historyMeta = {
                                id: fullMetaData.id,
                                title: fullMetaData.name || fullMetaData.title,
                                poster: fullMetaData.poster || fullMetaData.background,
                                runtime: fullMetaData.runtime,
                                year: fullMetaData.year,
                                original_name: fullMetaData.original_name
                            };
                            Lampa.Favorite.add('history', historyMeta, 100);
                        }
                    } else {
                        Lampa.Noty.show('Не удалось получить ссылку на поток.');
                        console.error("Hanime Plugin: No valid stream URL found in stream data:", streamData);
                    }
                } else {
                    Lampa.Noty.show('Потоки не найдены для этого аниме.');
                    console.warn("Hanime Plugin: No streams found or invalid stream data structure:", streamData);
                }

            }).catch(error => {
                _this.activity.loader(false);
                console.error("Hanime Plugin: Failed to fetch stream/meta details", error);
                Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'));
            });
        };

        this.empty = function (msg) {
            var empty = new Lampa.Empty({ message: msg });
            html.empty().append(empty.render(true));
            this.activity.loader(false);
            this.activity.toggle();
            this.start = empty.start;
        };

        this.create = function () {
            this.activity.loader(true);
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
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function () {
                    if (Navigator.canmove('down')) Navigator.move('down');
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
            scroll.destroy();
            html.remove();
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

        var style = `
            .hanime-catalog__body.category-full { justify-content: space-around; }
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
            .hanime-card__description { display: none; }
            .menu__ico svg { width: 1.5em; height: 1.5em; }
        `;
        Lampa.Template.add('hanime-style', `<style>${style}</style>`);

        Lampa.Template.add('hanime-card', `
            <div class="hanime-card card layer--visible layer--render">
                <div class="hanime-card__view">
                    <img src="{img}" class="hanime-card__img" alt="{title}" loading="lazy" />
                </div>
                <div class="hanime-card__title">{title}</div>
            </div>
        `);

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

        $('head').append(Lampa.Template.get('hanime-style', {}, true));

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
