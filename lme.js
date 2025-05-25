(function () {
    'use strict';

    // --- API и Константы для Hanime ---
    const HANIME_API_BASE = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
    const HANIME_CATS_PATHS = { 
        newset: "/catalog/movie/newset.json",
        recent: "/catalog/movie/recent.json",
        mostlikes: "/catalog/movie/mostlikes.json",
        mostviews: "/catalog/movie/mostviews.json"
    };
    const HANIME_CAT_TITLES = { // Резервные названия, если перевод не найден
        all: "Все категории", 
        newset: "Последние добавленные", 
        recent: "Недавние",
        mostlikes: "Самые залайканные", 
        mostviews: "Самые просматриваемые"
    };
    const ITEMS_PER_PAGE_API = 48; 

    const HANIME_STREAM_TPL = HANIME_API_BASE + "/stream/movie/{id}.json";
    const HANIME_META_TPL = HANIME_API_BASE + "/meta/movie/{id}.json";
    const HANIME_PROXY_URL = "http://77.91.78.5:3000";

    // --- HanimeCard ---
    function HanimeCard(data, userLang) {
        const pr = {
            id: data.id, name: data.name || data.title || 'Без названия', russian: data.name || data.title,
            japanese: data.original_name || data.name || data.title, kind: data.first_air_date ? 'tv' : 'movie',
            score: data.vote_average ? parseFloat(data.vote_average).toFixed(1) : 'N/A',
            status_internal: data.quality || '?',
            season_internal: data.year || (data.release_date ? (''+data.release_date).slice(0,4) : ''),
            poster: { originalUrl: data.poster_path || data.poster || data.img || './img/img_broken.svg' },
        };
        const item = Lampa.Template.get("LMEShikimori-Card", {
            img: pr.poster.originalUrl, type: pr.kind ? pr.kind.toUpperCase() : '?',
            title: userLang === 'ru' ? (pr.russian || pr.name) : (pr.name || pr.japanese),
        });
        const updateFavoriteIcons = () => {
            item.find('.lmeshm-card__fav-icons').remove();
            const favIconsContainer = $('<div class="lmeshm-card__fav-icons"></div>');
            const cardDataForFav = {
                id: data.id, title: data.name || data.title, poster: data.poster_path || data.poster || data.img,
                name: data.name || data.title, year: pr.season_internal,
                type: pr.kind, original_name: data.original_name
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
        this.render = function () { return item; };
        this.destroy = function () { item.remove(); };
        this.getRawData = function () { return data; };
        this.getDisplayTitle = function() { 
            return userLang === 'ru' ? (pr.russian || pr.name) : (pr.name || pr.japanese);
        }
    }

    // --- HanimeComponent ---
    function HanimeComponent(object) {
        this.activity = object;
        const userLang = Lampa.Storage.field('language');
        let network = new Lampa.Reguest();
        let scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        let items_instances = []; 
        let displayed_metas_ids = new Set();
        let current_page_skip = 0;  
        let can_load_more = true;   

        const html = $("<div class='LMEShikimori-module'></div>");
        const head = $(`<div class='LMEShikimori-head torrent-filter'>
                        <div class='lmehanime__home simple-button simple-button--filter selector'>Home</div>
                        <div class='lmehanime__filter simple-button simple-button--filter selector'>Filter</div>
                       </div>`);
        const body = $('<div class="LMEShikimori-catalog--list category-full"></div>');
        let last_focused_card_element = null;

        const currentCategoryKey = (this.activity.params && this.activity.params.category_key) ? 
                                     this.activity.params.category_key : 'all';
        
        const getTranslatedTitle = (lang_key, fallback_cat_key_or_text, default_text, replacements = {}) => {
            let title = Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? Lampa.Lang.translate(lang_key) : null;
            if (!title || title === lang_key) {
                if (typeof HANIME_CAT_TITLES[fallback_cat_key_or_text] !== 'undefined') {
                    title = HANIME_CAT_TITLES[fallback_cat_key_or_text];
                } else if (typeof fallback_cat_key_or_text === 'string') {
                    title = fallback_cat_key_or_text;
                } else {
                    title = default_text || lang_key;
                }
            }
            if (title && typeof title === 'string') {
                for (const key in replacements) {
                    if (replacements.hasOwnProperty(key)) {
                         title = title.replace(new RegExp(`{${key}}`, 'g'), replacements[key]);
                    }
                }
            }
            return title;
        };


        this.fetchData = function (skip_value, onSuccess, onError) {
            this.activity.loader(true);
            let promises;
            let isFetchingAllInitial = (currentCategoryKey === 'all' && skip_value === 0);

            if (isFetchingAllInitial) {
                promises = Object.entries(HANIME_CATS_PATHS).map(([catKey, basePath]) => {
                    const url = HANIME_API_BASE + basePath; 
                    return new Promise((resolve) => {
                        network.native(url, (data) => resolve(data.metas || []),
                            (err) => { console.error(`Hanime: Failed to load initial page for ${catKey}`, err); resolve([]); },
                            false, { dataType: 'json', timeout: 15000 });
                    });
                });
            } else if (currentCategoryKey !== 'all' && HANIME_CATS_PATHS[currentCategoryKey]) {
                let basePath = HANIME_CATS_PATHS[currentCategoryKey];
                let url;
                if (skip_value > 0) {
                    url = HANIME_API_BASE + basePath.replace('.json', `/skip=${skip_value}.json`);
                } else {
                    url = HANIME_API_BASE + basePath; 
                }
                promises = [new Promise((resolve) => {
                    network.native(url, (data) => resolve(data.metas || []),
                        (err) => { console.error(`Hanime: Failed to load ${currentCategoryKey} with skip ${skip_value}`, err); resolve([]); },
                        false, { dataType: 'json', timeout: 15000 });
                })];
            } else {
                this.activity.loader(false);
                can_load_more = false; 
                if (onSuccess) onSuccess([]); 
                return;
            }

            Promise.all(promises).then(results => {
                this.activity.loader(false);
                let newMetasRaw = [];
                results.forEach(metasArray => newMetasRaw.push(...metasArray));
                
                const uniqueNewMetas = [];
                newMetasRaw.forEach(meta => {
                    if (meta && meta.id && !displayed_metas_ids.has(meta.id)) {
                        uniqueNewMetas.push(meta);
                        displayed_metas_ids.add(meta.id); 
                    }
                });
                
                if (onSuccess) onSuccess(uniqueNewMetas);

            }).catch(error => {
                this.activity.loader(false);
                console.error("Hanime: Error fetching data", error);
                if (onError) onError(getTranslatedTitle('hanime_error_fetch_category', 'all', "Ошибка загрузки."));
            });
        };

        this.appendCardsToDOM = function (metasToAppend) {
            if (currentCategoryKey === 'all' && current_page_skip > 0) { 
                 can_load_more = false;
            }
            if (metasToAppend.length < ITEMS_PER_PAGE_API && currentCategoryKey !== 'all' && current_page_skip > 0) {
                can_load_more = false;
            }
            if (metasToAppend.length === 0 && current_page_skip > 0 && currentCategoryKey !== 'all') {
                can_load_more = false;
            }

            metasToAppend.forEach(meta => {
                const card_instance = new HanimeCard(meta, userLang); 
                const card_render = card_instance.render();
                card_render.on("hover:focus", () => { last_focused_card_element = card_render[0]; scroll.update(last_focused_card_element, true);});
                card_render.on("hover:enter", () => {
                    const originalData = card_instance.getRawData();
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
                                title: fullMeta?.name || fullMeta?.title || 'Без названия', url: streamUrl, 
                                poster: fullMeta?.poster_path || fullMeta?.poster || fullMeta?.img || '', timeline: timelineView,
                                id: fullMeta.id, name: fullMeta.name || fullMeta.title,
                                year: fullMeta.year || (fullMeta.release_date ? (''+fullMeta.release_date).slice(0,4) : ''),
                                type: fullMeta.first_air_date ? 'tv' : 'movie', original_name: fullMeta.original_name
                            };
                            if (Lampa.Timeline && typeof Lampa.Timeline.update === 'function') Lampa.Timeline.update(playerObj);
                            if (playerObj.url && Lampa.Player?.play && Lampa.Player?.playlist) {
                                Lampa.Player.play(playerObj); Lampa.Player.playlist([playerObj]);
                                if (Lampa.Favorite && typeof Lampa.Favorite.add === 'function') { Lampa.Favorite.add('history', playerObj); }
                                card_instance.updateIcons();
                            } else { Lampa.Noty.show(playerObj.url ? getTranslatedTitle('hanime_error_player', '', 'Плеер недоступен.') : getTranslatedTitle('hanime_error_stream_url', '', 'Нет ссылки на поток.')); }
                        } else { Lampa.Noty.show(getTranslatedTitle('hanime_error_streams_not_found', '', 'Потоки не найдены.')); }
                    }).catch(error => { this.activity.loader(false); Lampa.Noty.show(getTranslatedTitle('hanime_error_details_flat', '', 'Ошибка загрузки деталей.')); });
                });
                card_render.on('hover:long', () => {
                    const originalData = card_instance.getRawData();
                    const displayTitleOriginal = card_instance.getDisplayTitle(); 
                    
                    // Убираем цифры из названия для поиска и для отображения в пункте меню
                    const titleForMenuDisplay = displayTitleOriginal.replace(/\d+/g, '').trim();
                    const searchTermForPlugin = titleForMenuDisplay; // Уже без цифр

                    const cardDataForFav = {
                        id: originalData.id, title: originalData.name || originalData.title, poster: originalData.poster_path || originalData.poster || originalData.img,
                        name: originalData.name || originalData.title, 
                        year: originalData.year || (originalData.release_date ? (''+originalData.release_date).slice(0,4) : ''),
                        type: originalData.first_air_date ? 'tv' : 'movie', original_name: originalData.original_name
                    };
                    const st = (Lampa.Favorite && typeof Lampa.Favorite.check === 'function' ? Lampa.Favorite.check(cardDataForFav) : {}) || {};
                    
                    const menu = [
                        { 
                            title: getTranslatedTitle('lmehanime_action_search_this_other_catalog', 'Искать "{title}" в другом каталоге', '', {title: titleForMenuDisplay}), // Используем название без цифр
                            action_type: 'search_this_other_catalog',
                            search_term: searchTermForPlugin // Используем название без цифр
                        },
                        { title: getTranslatedTitle('title_book', '', 'Запланировано'), where: 'book', checkbox: true, checked: st.book },
                        { title: getTranslatedTitle('title_like', '', 'Нравится'), where: 'like', checkbox: true, checked: st.like },
                        { title: getTranslatedTitle('title_wath', '', 'Смотрю'), where: 'wath', checkbox: true, checked: st.wath },
                        { title: getTranslatedTitle('menu_history', '', 'История'), where: 'history', checkbox: true, checked: st.history }
                    ];

                    Lampa.Select.show({
                        title: getTranslatedTitle('title_action', '', 'Действие'), items: menu,
                        onBack: () => Lampa.Controller.toggle('content'),
                        onCheck: (item) => { 
                            if (Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function' && item.where) {
                                Lampa.Favorite.toggle(item.where, cardDataForFav);
                                card_instance.updateIcons();
                            }
                        },
                        onSelect: (selectedItem) => { 
                            if (selectedItem.action_type === 'search_this_other_catalog') {
                                Lampa.Select.close(); 
                                const searchTerm = selectedItem.search_term; // Это уже будет название без цифр
                                if (searchTerm) {
                                    let searchResultsTitle = "Поиск: " + searchTerm; 
                                    if (Lampa.Lang && typeof Lampa.Lang.translate === 'function') {
                                        const hhubTitleKey = 'plugin_search_results_title'; 
                                        let translatedHHubTitle = Lampa.Lang.translate(hhubTitleKey);
                                        if (translatedHHubTitle && translatedHHubTitle !== hhubTitleKey) {
                                            searchResultsTitle = translatedHHubTitle.replace('{query}', searchTerm);
                                        }
                                    }

                                    Lampa.Activity.push({
                                        component: 'my_plugin_catalog', 
                                        title: searchResultsTitle,
                                        params: {
                                            search_query: searchTerm 
                                        }
                                    });
                                } else {
                                    Lampa.Controller.toggle('content'); 
                                }
                            } else if (!selectedItem.where && !selectedItem.action_type) { 
                                Lampa.Select.close();
                                Lampa.Controller.toggle('content');
                            }
                        },
                    });
                });
                body.append(card_render);
                items_instances.push(card_instance);
                setTimeout(() => card_instance.updateIcons(), 50);
            });

            if (!last_focused_card_element && items_instances.length > 0) {
                const firstVisibleCard = items_instances.find(ci => $(ci.render()).is(':visible'));
                if (firstVisibleCard) last_focused_card_element = firstVisibleCard.render()[0];
            }
            this.activity.toggle();
        };
        
        this.loadNextPage = function() {
            if (!can_load_more || this.activity.loader()) return;
            if (currentCategoryKey === 'all') { can_load_more = false; return; }

            current_page_skip += ITEMS_PER_PAGE_API;
            this.fetchData(current_page_skip, 
                (newMetas) => { this.appendCardsToDOM(newMetas); }, 
                () => { can_load_more = false; }
            );
        };

        this.build = function () { 
            scroll.minus();
            scroll.onWheel = (step) => {
                if (!Lampa.Controller.own(this)) this.start();
                if (step > 0) Navigator.move('down'); else Navigator.move('up');
            };
            scroll.onEnd = () => { if (can_load_more) { this.loadNextPage(); }};
            this.headeraction();
            this.fetchData(0, 
                (initialMetas) => {
                    if (initialMetas.length > 0) {
                        this.appendCardsToDOM(initialMetas);
                        if (currentCategoryKey === 'all' || initialMetas.length < ITEMS_PER_PAGE_API) {
                            can_load_more = false; 
                        }
                    } else {
                         const catTitle = getTranslatedTitle('lmehanime_cat_' + currentCategoryKey, currentCategoryKey, "каталог");
                         this.empty((getTranslatedTitle('hanime_empty_category', '', "Категория \"{category}\" пуста.", {category: catTitle})));
                    }
                }, 
                (errorMsg) => { this.empty(errorMsg); }
            );
            scroll.append(head);
            scroll.append(body);
            html.append(scroll.render(true));
        }

        this.headeraction = function () {
            const homeButton = head.find('.lmehanime__home');
            const filterButton = head.find('.lmehanime__filter');
            homeButton.on('hover:enter', () => {
                Lampa.Activity.push({
                    component: 'lmehanime_catalog',
                    title: getTranslatedTitle('lmehanime_main_title_all', 'all', "Hanime (Все)"),
                    page: 1,
                    params: { category_key: 'all' } 
                });
            });
            filterButton.on('hover:enter', () => {
                const filterMenuOptions = [{ title: getTranslatedTitle('lmehanime_cat_all', 'all', HANIME_CAT_TITLES.all), category_key: 'all' }];
                Object.keys(HANIME_CATS_PATHS).forEach(catKey => {
                    filterMenuOptions.push({
                        title: getTranslatedTitle('lmehanime_cat_' + catKey, catKey, HANIME_CAT_TITLES[catKey] || catKey),
                        category_key: catKey
                    });
                });
                Lampa.Select.show({
                    title: getTranslatedTitle('lmehanime_filter_title', '', 'Фильтр категорий'),
                    items: filterMenuOptions,
                    onBack: () => { Lampa.Controller.toggle('content'); },
                    onSelect: (selectedItem) => {
                        Lampa.Activity.push({
                            component: 'lmehanime_catalog',
                            title: selectedItem.title, 
                            page: 1,
                            params: { category_key: selectedItem.category_key }
                        });
                    }
                });
            });
        };
        
        this.clear = function() { 
            items_instances.forEach(item => item.destroy());
            items_instances = [];
            displayed_metas_ids.clear(); 
            body.empty();
            current_page_skip = 0; 
            can_load_more = true;  
        }
        this.empty = function (msg) { 
            const empty = new Lampa.Empty();
            empty.msg(msg || getTranslatedTitle('hanime_empty_flat', '', "Каталог пуст.")); 
            html.empty().append(empty.render(true));
            this.start = empty.start; 
            this.activity.loader(false);
            this.activity.toggle();
        }
        this.create = function () { 
            const initialTitle = getTranslatedTitle(
                (currentCategoryKey && currentCategoryKey !== 'all') ? 'lmehanime_cat_' + currentCategoryKey : 'lmehanime_main_title_all',
                currentCategoryKey,
                (currentCategoryKey === 'all' ? HANIME_CAT_TITLES.all : HANIME_CAT_TITLES[currentCategoryKey] || currentCategoryKey)
            );
            if (this.activity && this.activity.activity) { this.activity.activity.title = initialTitle; } 
            else if (this.activity) { this.activity.title = initialTitle; }
            this.build();
        }
        this.start = function () { 
            if (Lampa.Activity.active() && Lampa.Activity.active().activity !== this.activity) return;
            
            const currentActivityTitle = getTranslatedTitle(
                (currentCategoryKey && currentCategoryKey !== 'all') ? 'lmehanime_cat_' + currentCategoryKey : 'lmehanime_main_title_all',
                currentCategoryKey,
                (currentCategoryKey === 'all' ? HANIME_CAT_TITLES.all : HANIME_CAT_TITLES[currentCategoryKey] || currentCategoryKey)
            );
            if (Lampa.Activity.active()) { Lampa.Activity.active().title = currentActivityTitle; }

            Lampa.Controller.add("content", {
                toggle: () => {
                    Lampa.Controller.collectionSet(scroll.render());
                    let focus_element_to_set = false;
                    if (last_focused_card_element && $.contains(document.documentElement, last_focused_card_element) && $(last_focused_card_element).is(':visible')) {
                        focus_element_to_set = last_focused_card_element;
                    } 
                    else if (items_instances.length > 0) {
                        const first_visible_item = items_instances.find(card_instance => {
                            const rendered_card = card_instance.render();
                            return rendered_card && $(rendered_card).is(':visible') && $.contains(body[0], rendered_card[0]);
                        });
                        if (first_visible_item) {
                            focus_element_to_set = first_visible_item.render()[0];
                            last_focused_card_element = focus_element_to_set;
                        }
                    }
                    Lampa.Controller.collectionFocus(focus_element_to_set, scroll.render());
                },
                left: () => { if (Navigator.canmove("left")) Navigator.move("left"); else Lampa.Controller.toggle("menu"); },
                right: () => Navigator.move("right"),
                up: () => { if (Navigator.canmove("up")) Navigator.move("up"); else Lampa.Controller.toggle("head"); },
                down: () => Navigator.move("down"),
                back: this.back
            });
            Lampa.Controller.toggle("content");
        }
        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return html; };
        this.destroy = function () { 
            if (network) network.clear(); 
            if (scroll) scroll.destroy(); 
            this.clear(); 
            html.remove(); 
            items_instances = null; 
            displayed_metas_ids = null; 
            network = null; 
            scroll = null;  
            last_focused_card_element = null;
            current_page_skip = 0; 
            can_load_more = true;
        };
        this.back = () => Lampa.Activity.backward();
    }

    function startPlugin() {
        if (window.plugin_lmehanime_catalog_ready) return;
        function initLampaDeps() {
            const criticalMissing = [];
            if (!window.Lampa) criticalMissing.push("window.Lampa"); if (!window.$) criticalMissing.push("window.$");
            if (window.Lampa) {
                const deps = ["Template", "Component", "Activity", "Controller", "Scroll", "Reguest", "Favorite", "Timeline", "Noty", "Select", "Lang", "Player", "Empty", "Utils"]; 
                deps.forEach(dep => { if (!Lampa[dep]) criticalMissing.push("Lampa." + dep); });
            }
            if (criticalMissing.length > 0) {
                console.error('LMEHanime Plugin: Critical Lampa dependencies missing!', criticalMissing);
                if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                    Lampa.Noty.show('Ошибка плагина LMEHanime: Отсутствуют компоненты Lampa: ' + criticalMissing.join(', '));
                } return;
            }
            if (window.Lampa && !Lampa.ImageCache) { console.warn('LMEHanime Plugin: Lampa.ImageCache not found. Caching disabled.'); }
            window.plugin_lmehanime_catalog_ready = true;

            Lampa.Template.add('LMEShikimoriStyle', "<style>\n .LMEShikimori-catalog--list.category-full{-webkit-box-pack:justify !important;-webkit-justify-content:space-between !important;-ms-flex-pack:justify !important;justify-content:space-between !important}.LMEShikimori-head.torrent-filter{margin-left:1.5em; display: flex; gap: 1em;}.LMEShikimori.card__type{background:#ff4242;color:#fff} .lmeshm-card__fav-icons{position:absolute;top:0.3em;right:0.3em;display:flex;flex-direction:column;gap:0.2em;z-index:5;} .lmeshm-card__fav-icons .card__icon{background-color:rgba(0,0,0,0.5);border-radius:0.2em;padding:0.1em;} \n</style>");
            Lampa.Template.add("LMEShikimori-Card", `
            <div class="LMEShikimori card selector layer--visible layer--render">
                <div class="LMEShikimori card__view">
                    <img src="{img}" class="LMEShikimori card__img" />
                    <div class="LMEShikimori card__type">{type}</div>
                </div>
                <div class="LMEShikimori card__title">{title}</div>
            </div>`);

            if ($('style[data-lmeshikimori-styles]').length === 0) {
                const styleTag = $(Lampa.Template.get('LMEShikimoriStyle', {}, true));
                styleTag.attr('data-lmeshikimori-styles', 'true');
                $('body').append(styleTag);
            }
            
            if (Lampa.Lang?.add) {
                Lampa.Lang.add({ 
                    lmehanime_main_title_all: "Hanime (Все)",
                    lmehanime_filter_title: "Фильтр категорий",
                    lmehanime_cat_all: HANIME_CAT_TITLES.all, 
                    lmehanime_cat_newset: HANIME_CAT_TITLES.newset,
                    lmehanime_cat_recent: HANIME_CAT_TITLES.recent, 
                    lmehanime_cat_mostlikes: HANIME_CAT_TITLES.mostlikes,
                    lmehanime_cat_mostviews: HANIME_CAT_TITLES.mostviews,
                    hanime_empty_category: "Категория \"{category}\" пуста.", 
                    hanime_error_fetch_category: "Ошибка загрузки категории.",
                    hanime_empty_flat: "Каталог пуст.",
                    hanime_error_fetch_all_flat: "Ошибка загрузки каталога.",
                    hanime_error_player: "Плеер недоступен.", 
                    hanime_error_stream_url: "Нет ссылки на поток.", 
                    hanime_error_streams_not_found: "Потоки не найдены.", 
                    hanime_error_details_flat: "Ошибка загрузки деталей для плеера.", 
                    title_book: 'Запланировано', title_like: 'Нравится', 
                    title_wath: 'Смотрю', menu_history: 'История', title_action: 'Действие',
                    lmehanime_action_search_this_other_catalog: 'Искать "{title}" в другом каталоге'
                });
            }
            Lampa.Component.add('lmehanime_catalog', HanimeComponent);
            addMenuItem();
        }

        function addMenuItem() {
            if ($('.menu__list .menu__item[data-action="lmehanime_catalog"]').length > 0) { return; }
            
            const getMenuItemText = () => {
                const key = 'lmehanime_main_title_all';
                let translated = Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? 
                                     Lampa.Lang.translate(key) : null;
                if (!translated || translated === key) {
                    translated = HANIME_CAT_TITLES.all; 
                }
                return translated || "Hanime (Все)";
            };
            const menuItemText = getMenuItemText();

            const menu_item_html = $(`<li class="menu__item selector" data-action="lmehanime_catalog">
                <div class="menu__ico">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                </div> <div class="menu__text">${menuItemText}</div></li>`);
            menu_item_html.on('hover:enter', () => {
                Lampa.Activity.push({ 
                    component: 'lmehanime_catalog', title: getMenuItemText(), page: 1,
                    params: { category_key: 'all' }
                });
            });
            $('.menu .menu__list:first').append(menu_item_html); 
        }

        if (window.appready) { initLampaDeps(); }
        else if (Lampa.Listener?.follow) { Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initLampaDeps(); }); }
        else { setTimeout(initLampaDeps, 1000); }
    }
    startPlugin();
})();
