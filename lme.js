(function () {
    'use strict';

    // --- API и Константы для Hanime ---
    const HANIME_API_BASE = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
    const HANIME_CATS = {
        newset: "/catalog/movie/newset.json",
        recent: "/catalog/movie/recent.json",
        mostlikes: "/catalog/movie/mostlikes.json",
        mostviews: "/catalog/movie/mostviews.json"
    };
    const HANIME_STREAM_TPL = HANIME_API_BASE + "/stream/movie/{id}.json";
    const HANIME_META_TPL = HANIME_API_BASE + "/meta/movie/{id}.json";
    const HANIME_PROXY_URL = "http://77.91.78.5:3000"; // Ваш прокси

    // --- HanimeCard (адаптированный под дизайн Shikimori) ---
    function HanimeCard(data, userLang) { // data - это объект из API Hanime (meta)
        const pr = { // Преобразование данных Hanime к формату, похожему на Shikimori
            id: data.id,
            name: data.name || data.title || 'Без названия',
            russian: data.name || data.title,
            japanese: data.original_name || data.name || data.title,
            kind: data.first_air_date ? 'tv' : 'movie',
            score: data.vote_average ? parseFloat(data.vote_average).toFixed(1) : 'N/A',
            status: data.quality || '?',
            season: data.year || (data.release_date ? (''+data.release_date).slice(0,4) : ''),
            poster: { originalUrl: data.poster_path || data.poster || data.img || './img/img_broken.svg' },
            airedOn: { year: data.year || (data.release_date ? (''+data.release_date).slice(0,4) : '') }
        };

        let displaySeason = pr.season;
        if (pr.airedOn && pr.airedOn.year && pr.airedOn.year !== pr.season) {
            displaySeason = pr.airedOn.year;
        }
        if (!displaySeason || displaySeason === '0000') displaySeason = '?';

        const item = Lampa.Template.get("LMEShikimori-Card", {
            img: pr.poster.originalUrl,
            type: pr.kind ? pr.kind.toUpperCase() : '?',
            status: pr.status,
            rate: pr.score,
            title: userLang === 'ru' ? (pr.russian || pr.name) : (pr.name || pr.japanese),
            season: displaySeason
        });

        const updateFavoriteIcons = () => {
            item.find('.lmeshm-card__fav-icons').remove();
            const favIconsContainer = $('<div class="lmeshm-card__fav-icons"></div>');

            const cardDataForFav = { // Данные для Lampa.Favorite
                id: data.id,
                title: data.name || data.title,
                poster: data.poster_path || data.poster || data.img,
                name: data.name || data.title,
                year: data.year || (data.release_date ? (''+data.release_date).slice(0,4) : ''),
                type: data.first_air_date ? 'tv' : 'movie',
                original_name: data.original_name
            };

            const st = (Lampa.Favorite && typeof Lampa.Favorite.check === 'function' ? Lampa.Favorite.check(cardDataForFav) : {}) || {};
            if (st.book) favIconsContainer.append($('<div>').addClass('card__icon icon--book'));
            if (st.like) favIconsContainer.append($('<div>').addClass('card__icon icon--like'));
            if (st.wath) favIconsContainer.append($('<div>').addClass('card__icon icon--wath'));
            if (st.history || (Lampa.Timeline && typeof Lampa.Timeline.watched === 'function' && Lampa.Timeline.watched(cardDataForFav))) {
                 favIconsContainer.append($('<div>').addClass('card__icon icon--history'));
            }
            item.find('.LMEShikimori.card__view').append(favIconsContainer);
        };
        this.updateIcons = updateFavoriteIcons;

        this.render = function () {
            return item;
        };
        this.destroy = function () {
            item.remove();
        };
        this.getRawData = function () { return data; };
    }


    // --- HanimeComponent (адаптированный под структуру Shikimori) ---
    function HanimeComponent(object) { // object является ссылкой на сам Lampa-компонент (this из Lampa.Component)
        this.activity = object; // <--- ИСПРАВЛЕНИЕ ЗДЕСЬ

        const userLang = Lampa.Storage.field('language');
        const network = new Lampa.Reguest();
        const scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        let items = [];
        let allFetchedData = [];
        let currentDataPointer = 0;
        const itemsPerPage = 24;

        const html = $("<div class='LMEShikimori-module'></div>");
        const head = $(`<div class='LMEShikimori-head torrent-filter'>
                        <div class='lmehanime__home simple-button simple-button--filter selector'>Home</div>
                       </div>`);
        const body = $('<div class="LMEShikimori-catalog--list category-full"></div>');
        let last_focused_card_element;

        this.fetchAllHanimeData = function (onSuccess, onError) {
            this.activity.loader(true); // Теперь this.activity корректно ссылается на Lampa-компонент
            const promises = Object.entries(HANIME_CATS).map(([key, path]) => {
                return new Promise((resolve, reject) => {
                    network.native(HANIME_API_BASE + path,
                        (data) => resolve(data.metas || []),
                        (err) => { console.error(`Hanime: Failed to load ${key}`, err); resolve([]); },
                        false, { dataType: 'json', timeout: 15000 }
                    );
                });
            });

            Promise.all(promises).then(results => {
                let combinedMetas = [];
                results.forEach(metasArray => combinedMetas.push(...metasArray));
                const uniqueMetasMap = new Map();
                combinedMetas.forEach(meta => {
                    if (meta && meta.id && !uniqueMetasMap.has(meta.id)) {
                        uniqueMetasMap.set(meta.id, meta);
                    }
                });
                allFetchedData = Array.from(uniqueMetasMap.values());
                currentDataPointer = 0;
                this.activity.loader(false);
                if (allFetchedData.length > 0) {
                    onSuccess();
                } else {
                    onError(Lampa.Lang.translate('hanime_empty_flat') || "Каталог Hanime пуст.");
                }
            }).catch(error => {
                this.activity.loader(false);
                console.error("Hanime: Error fetching all catalogs", error);
                onError(Lampa.Lang.translate('hanime_error_fetch_all_flat') || "Ошибка загрузки каталога Hanime.");
            });
        };

        this.appendNextBatch = function () {
            const batch = allFetchedData.slice(currentDataPointer, currentDataPointer + itemsPerPage);
            if (batch.length === 0 && currentDataPointer > 0) {
                return;
            }
            currentDataPointer += batch.length;

            batch.forEach(meta => {
                const card = new HanimeCard(meta, userLang);
                const card_render = card.render();

                card_render.on("hover:focus", () => {
                    last_focused_card_element = card_render[0];
                    scroll.update(last_focused_card_element, true);
                }).on("hover:enter", () => {
                    const originalData = card.getRawData();
                    this.activity.loader(true);
                    const streamP = new Promise((res, rej) => network.native(HANIME_STREAM_TPL.replace('{id}', originalData.id), res, rej, false, { dataType: 'json', timeout: 10000 }));
                    const metaP = Promise.resolve({ meta: originalData });

                    Promise.all([streamP, metaP]).then(([streamData, metaResp]) => {
                        this.activity.loader(false);
                        const fullMeta = metaResp.meta;
                        if (streamData?.streams?.length > 0) {
                            let streamUrl = streamData.streams[0]?.url;
                            if (streamUrl && HANIME_PROXY_URL) { try { if (new URL(streamUrl).hostname.includes('highwinds-cdn.com')) streamUrl = `${HANIME_PROXY_URL}/proxy?url=${encodeURIComponent(streamUrl)}`; } catch (e) { console.error("Hanime Proxy URL error:", e)} }
                            
                            const timelineView = (Lampa.Timeline && typeof Lampa.Timeline.view === 'function' ? Lampa.Timeline.view(fullMeta.id) : {}) || {};
                            const playerObj = { 
                                title: fullMeta?.name || fullMeta?.title || 'Без названия', 
                                url: streamUrl, 
                                poster: fullMeta?.poster_path || fullMeta?.poster || fullMeta?.img || '', 
                                timeline: timelineView,
                                id: fullMeta.id,
                                name: fullMeta.name || fullMeta.title,
                                year: fullMeta.year || (fullMeta.release_date ? (''+fullMeta.release_date).slice(0,4) : ''),
                                type: fullMeta.first_air_date ? 'tv' : 'movie',
                                original_name: fullMeta.original_name
                            };
                            
                            if (Lampa.Timeline && typeof Lampa.Timeline.update === 'function') Lampa.Timeline.update(playerObj);

                            if (playerObj.url && Lampa.Player?.play && Lampa.Player?.playlist) {
                                Lampa.Player.play(playerObj); Lampa.Player.playlist([playerObj]);
                                if (Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                                    Lampa.Favorite.add('history', playerObj);
                                }
                                card.updateIcons();
                            } else { Lampa.Noty.show(playerObj.url ? Lampa.Lang.translate('hanime_error_player') : Lampa.Lang.translate('hanime_error_stream_url')); }
                        } else { Lampa.Noty.show(Lampa.Lang.translate('hanime_error_streams_not_found')); }
                    }).catch(error => { this.activity.loader(false); Lampa.Noty.show(Lampa.Lang.translate('hanime_error_details_flat')); });
                }).on('hover:long', () => {
                    const originalData = card.getRawData();
                    const cardDataForFav = {
                        id: originalData.id,
                        title: originalData.name || originalData.title,
                        poster: originalData.poster_path || originalData.poster || originalData.img,
                        name: originalData.name || originalData.title,
                        year: originalData.year || (originalData.release_date ? (''+originalData.release_date).slice(0,4) : ''),
                        type: originalData.first_air_date ? 'tv' : 'movie',
                        original_name: originalData.original_name
                    };
                    const st = (Lampa.Favorite && typeof Lampa.Favorite.check === 'function' ? Lampa.Favorite.check(cardDataForFav) : {}) || {};
                    const menu = [
                        { title: Lampa.Lang.translate('title_book'), where: 'book', checkbox: true, checked: st.book },
                        { title: Lampa.Lang.translate('title_like'), where: 'like', checkbox: true, checked: st.like },
                        { title: Lampa.Lang.translate('title_wath'), where: 'wath', checkbox: true, checked: st.wath },
                        { title: Lampa.Lang.translate('menu_history'), where: 'history', checkbox: true, checked: st.history },
                    ];
                    Lampa.Select.show({
                        title: Lampa.Lang.translate('title_action'), items: menu,
                        onBack: () => Lampa.Controller.toggle('content'),
                        onCheck: (item) => {
                            if (Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function') Lampa.Favorite.toggle(item.where, cardDataForFav);
                            card.updateIcons();
                        },
                        onSelect: () => { Lampa.Select.close(); Lampa.Controller.toggle('content'); },
                    });
                });
                body.append(card_render);
                items.push(card);
                setTimeout(() => card.updateIcons(), 50);
            });

            if (!last_focused_card_element && items.length > 0) {
                last_focused_card_element = items[0].render()[0];
            }
            this.activity.loader(false);
            this.activity.toggle();
        };

        this.build = function () {
            scroll.minus();
            scroll.onWheel = (step) => {
                if (!Lampa.Controller.own(this)) this.start();
                if (step > 0) Navigator.move('down'); else Navigator.move('up');
            };
            scroll.onEnd = () => {
                if (this.activity.loader()) return;
                if (currentDataPointer < allFetchedData.length) {
                    this.activity.loader(true);
                    setTimeout(() => {
                        this.appendNextBatch();
                        this.activity.loader(false);
                    }, 300);
                }
            };
            this.headeraction();
            this.appendNextBatch();
            scroll.append(head);
            scroll.append(body);
            html.append(scroll.render(true));
        };

        this.headeraction = function () {
            head.find('.lmehanime__home').on('hover:enter', () => {
                this.clear();
                this.fetchAllHanimeData(this.build.bind(this), this.empty.bind(this));
            });
        };

        this.empty = function (msg) {
            const empty = new Lampa.Empty();
            empty.message(msg || Lampa.Lang.translate('hanime_empty_flat'));
            html.empty().append(empty.render(true));
            this.start = empty.start;
            this.activity.loader(false);
            this.activity.toggle();
        };
        
        this.clear = function() {
            items.forEach(item => item.destroy());
            items = [];
            body.empty();
            last_focused_card_element = null;
            currentDataPointer = 0;
        };

        this.create = function () {
            this.fetchAllHanimeData(this.build.bind(this), this.empty.bind(this));
        };

        this.start = function () {
            if (Lampa.Activity.active().activity !== this.activity) return;
            Lampa.Controller.add("content", {
                toggle: () => {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(last_focused_card_element || false, scroll.render());
                },
                left: () => {
                    if (Navigator.canmove("left")) Navigator.move("left");
                    else Lampa.Controller.toggle("menu");
                },
                right: () => Navigator.move("right"),
                up: () => {
                    if (Navigator.canmove("up")) Navigator.move("up");
                    else Lampa.Controller.toggle("head");
                },
                down: () => Navigator.move("down"),
                back: this.back
            });
            Lampa.Controller.toggle("content");
        };

        this.pause = function () {
            if(Lampa.Controller.enabled().name == 'content') {
                last_focused_card_element = Lampa.Controller.focused();
            }
        };
        this.stop = function () { };
        this.render = function () { return html; };
        this.destroy = function () {
            network.clear();
            this.clear();
            scroll.destroy();
            html.remove();
            allFetchedData = null;
            items = null;
            network = null;
        };
        this.back = () => Lampa.Activity.backward();
    }

    function startPlugin() {
        if (window.plugin_lmehanime_catalog_ready) return;
        function initLampaDeps() {
            const criticalMissing = [];
            if (!window.Lampa) criticalMissing.push("window.Lampa");
            if (!window.$) criticalMissing.push("window.$");
            if (window.Lampa) {
                const deps = ["Template", "Component", "Activity", "Controller", "Scroll", "Reguest", "Favorite", "Timeline", "Noty", "Select", "Lang", "Player", "Empty", "Utils"];
                deps.forEach(dep => { if (!Lampa[dep]) criticalMissing.push("Lampa." + dep); });
            }
            if (criticalMissing.length > 0) {
                console.error('LMEHanime Plugin: Critical Lampa dependencies missing!', criticalMissing);
                if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                    Lampa.Noty.show('Ошибка плагина LMEHanime: Отсутствуют компоненты Lampa: ' + criticalMissing.join(', '));
                }
                return;
            }
            if (window.Lampa && !Lampa.ImageCache) {
                console.warn('LMEHanime Plugin: Lampa.ImageCache not found. Caching disabled.');
            }
            window.plugin_lmehanime_catalog_ready = true;

            Lampa.Template.add('LMEShikimoriStyle', "<style>\n .LMEShikimori-catalog--list.category-full{-webkit-box-pack:justify !important;-webkit-justify-content:space-between !important;-ms-flex-pack:justify !important;justify-content:space-between !important}.LMEShikimori-head.torrent-filter{margin-left:1.5em; display: flex; gap: 1em;}.LMEShikimori.card__type{background:#ff4242;color:#fff}.LMEShikimori .card__season{position:absolute;left:-0.8em;top:3.4em;padding:.4em .4em;background:#05f;color:#fff;font-size:.8em;-webkit-border-radius:.3em;border-radius:.3em}.LMEShikimori .card__status{position:absolute;left:-0.8em;bottom:1em;padding:.4em .4em;background:#ffe216;color:#000;font-size:.8em;-webkit-border-radius:.3em;border-radius:.3em}.LMEShikimori.card__season.no-season{display:none} .lmeshm-card__fav-icons{position:absolute;top:0.3em;right:0.3em;display:flex;flex-direction:column;gap:0.2em;z-index:5;} .lmeshm-card__fav-icons .card__icon{background-color:rgba(0,0,0,0.5);border-radius:0.2em;padding:0.1em;} \n</style>");
            Lampa.Template.add("LMEShikimori-Card", "<div class=\"LMEShikimori card selector layer--visible layer--render\">\n                <div class=\"LMEShikimori card__view\">\n                    <img src=\"{img}\" class=\"LMEShikimori card__img\" />\n                    <div class=\"LMEShikimori card__type\">{type}</div>\n                    <div class=\"LMEShikimori card__vote\">{rate}</div>\n                    <div class=\"LMEShikimori card__season\">{season}</div>\n                    <div class=\"LMEShikimori card__status\">{status}</div>\n                </div>\n                <div class=\"LMEShikimori card__title\">{title}</div>\n            </div>");

            if ($('style[data-lmeshikimori-styles]').length === 0) {
                const styleTag = $(Lampa.Template.get('LMEShikimoriStyle', {}, true));
                styleTag.attr('data-lmeshikimori-styles', 'true');
                $('body').append(styleTag);
            }
            
            if (Lampa.Lang?.add) {
                Lampa.Lang.add({ 
                    lmehanime_title: "Hanime Catalog",
                    hanime_empty_flat: "Каталог Hanime пуст.",
                    hanime_error_fetch_all_flat: "Ошибка загрузки каталога Hanime.",
                    hanime_error_player: "Плеер недоступен.",
                    hanime_error_stream_url: "Нет ссылки на поток.",
                    hanime_error_streams_not_found: "Потоки не найдены.",
                    hanime_error_details_flat: "Ошибка загрузки деталей для плеера.",
                    title_book: 'Запланировано', // Пример, если нет в Lampa по умолчанию
                    title_like: 'Нравится',
                    title_wath: 'Смотрю',
                    menu_history: 'История',
                    title_action: 'Действие'
                });
            }
            Lampa.Component.add('lmehanime_catalog', HanimeComponent);
            addMenuItem();
        }

        function addMenuItem() {
            if ($('.menu__item[data-action="lmehanime_catalog"]').length > 0) return;
            const menuItemText = (Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? Lampa.Lang.translate('lmehanime_title') : '') || 'Hanime Catalog';
            const menu_item = $(`<li class="menu__item selector" data-action="lmehanime_catalog">
                <div class="menu__ico">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M0 0h24v24H0z" fill="none"/>
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                    </svg>
                </div>
                <div class="menu__text">${menuItemText}</div>
            </li>`);
            menu_item.on('hover:enter', () => {
                Lampa.Activity.push({ component: 'lmehanime_catalog', title: menuItemText, page: 1 });
            });
            $('.menu .menu__list').append(menu_item);
        }

        if (window.appready) {
            initLampaDeps();
        } else if (Lampa.Listener?.follow) {
            Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initLampaDeps(); });
        } else {
            setTimeout(initLampaDeps, 1000);
        }
    }
    startPlugin();
})();