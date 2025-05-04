(function () {
    'use strict';

    // Функция для проксирования URL через allorigins.win
    function proxyUrl(url) {
        return `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&disableCache=true`;
    }

    function HanimeCard(data) {
        var cardTemplate = Lampa.Template.get('hanime-card', {
            id: data.id,
            img: proxyUrl(data.poster), // Проксируем постер
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
        var CATALOG_URL = proxyUrl(API_BASE_URL + "/catalog/movie/newset.json");

        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true);

            network.clear();
            network.native(CATALOG_URL,
                function (data) {
                    try {
                        if (data && data.contents) {
                            const parsed = JSON.parse(data.contents);
                            if (parsed.metas && Array.isArray(parsed.metas)) {
                                _this.build(parsed.metas);
                            } else {
                                _this.empty("Некорректный формат данных");
                            }
                        } else {
                            _this.empty("Пустой ответ от сервера");
                        }
                    } catch (e) {
                        _this.empty("Ошибка обработки данных");
                        console.error("Parsing error:", e);
                    }
                },
                function (errorStatus, errorText) {
                    _this.empty("Ошибка загрузки: " + errorStatus);
                    console.error("Request failed:", errorStatus, errorText);
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
            scroll.minus();

            result.forEach(function (meta) {
                var card = new HanimeCard(meta);
                var cardElement = card.render();

                cardElement.on('hover:focus', function () {
                    last = cardElement[0];
                    active = items.indexOf(card);
                    scroll.update(cardElement, true);
                }).on('hover:enter', function () {
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
            var streamUrl = proxyUrl(API_BASE_URL + `/stream/movie/${id}.json`);
            var metaUrl = proxyUrl(API_BASE_URL + `/meta/movie/${id}.json`);

            _this.activity.loader(true);

            Promise.all([
                network.timeout(10000, streamUrl),
                meta ? Promise.resolve({ contents: JSON.stringify({ meta: meta }) }) : network.timeout(10000, metaUrl)
            ]).then(responses => {
                const [streamRes, metaRes] = responses;
                
                // Обработка данных из прокси
                const streamData = JSON.parse(streamRes.contents);
                const metaData = JSON.parse(metaRes.contents).meta || meta;

                _this.activity.loader(false);

                if (streamData.streams?.length > 0) {
                    const stream = streamData.streams[0];
                    const poster = proxyUrl(metaData.poster);

                    const playerData = {
                        title: metaData.name,
                        url: stream.url,
                        poster: poster,
                        info: metaData.description ? `
                            <div class="player-metadata__description">
                                ${metaData.description}
                            </div>
                        ` : ''
                    };

                    Lampa.Player.play(playerData);
                    Lampa.Player.playlist([playerData]);

                    Lampa.Favorite.add('history', {
                        id: metaData.id,
                        title: metaData.name,
                        poster: poster,
                        description: metaData.description,
                        year: metaData.year
                    }, 100);
                } else {
                    Lampa.Noty.show('Видео недоступно');
                }
            }).catch(error => {
                _this.activity.loader(false);
                Lampa.Noty.show('Ошибка загрузки: ' + (error.message || error));
                console.error('Fetch error:', error);
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
                    Navigator.canmove('left') ? Navigator.move('left') : Lampa.Controller.toggle('menu');
                },
                right: function () {
                    Navigator.canmove('right') && Navigator.move('right');
                },
                up: function () {
                    Navigator.canmove('up') ? Navigator.move('up') : Lampa.Controller.toggle('head');
                },
                down: function () {
                    Navigator.canmove('down') && Navigator.move('down');
                },
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
            scroll.destroy();
            html.remove();
        };
        this.back = function () { Lampa.Activity.backward(); };
    }

    function startPlugin() {
        if (window.plugin_hanime_catalog_ready) return;
        window.plugin_hanime_catalog_ready = true;

        // Стили
        const style = `
            .hanime-catalog__body { padding: 20px; }
            .hanime-card {
                width: 185px;
                margin: 10px;
                border-radius: 8px;
                overflow: hidden;
                background: #2a2a2a;
                transition: transform 0.2s;
            }
            .hanime-card:hover { transform: scale(1.05); }
            .hanime-card__view {
                height: 270px;
                background: #1a1a1a;
                position: relative;
            }
            .hanime-card__img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .hanime-card__title {
                padding: 10px;
                text-align: center;
                color: #fff;
                font-size: 14px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        `;
        Lampa.Template.add('hanime-style', `<style>${style}</style>`);
        $('head').append(Lampa.Template.get('hanime-style', {}, true));

        // Шаблон карточки
        Lampa.Template.add('hanime-card', `
            <div class="hanime-card card layer--visible layer--render">
                <div class="hanime-card__view">
                    <img src="{img}" class="hanime-card__img" alt="{title}">
                </div>
                <div class="hanime-card__title">{title}</div>
            </div>
        `);

        // Регистрация компонента
        Lampa.Component.add('hanime_catalog', HanimeComponent);

        // Добавление пункта меню
        const menuItem = $(`
            <li class="menu__item selector">
                <div class="menu__ico">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                    </svg>
                </div>
                <div class="menu__text">Hanime</div>
            </li>
        `).on('hover:enter', () => {
            Lampa.Activity.push({
                url: '',
                title: 'Hanime',
                component: 'hanime_catalog',
                page: 1
            });
        });

        if (window.appready) {
            $('.menu .menu__list').first().append(menuItem);
        } else {
            Lampa.Listener.follow('app', e => {
                if (e.type === 'ready') $('.menu .menu__list').first().append(menuItem);
            });
        }
    }

    startPlugin();
})();
