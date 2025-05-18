(function () {
    'use strict';

    // --- API и Константы для ВАШЕГО Flask API ---
    const FLASK_API_BASE = "http://77.91.78.5:5000"; 
    const API_CATALOG_ENDPOINTS = { 
        newset: "/list" 
    };
    const CATALOG_TITLES = { 
        all: "Все категории", 
        newset: "Последние добавленные", 
    };
    const ITEMS_PER_API_REQUEST = 20; 
    const STREAM_ENDPOINT_TPL = FLASK_API_BASE + "/streams/{type}/{id}.json"; 
    const PROXY_FOR_EXTERNAL_URLS = "http://77.91.78.5:3000/proxy?url=";

    // --- PluginCard ---
    function PluginCard(data, userLang) {
        const pr = {
            id: data.id, name: data.name || 'Без названия',
            poster: data.poster || './img/img_broken.svg',
            type_display: data.type === "series" ? "SERIES" : "MOVIE" 
        };
        const item = Lampa.Template.get("LMEShikimori-Card", {
            img: pr.poster, type: pr.type_display, 
            title: pr.name,
        });
        const updateFavoriteIcons = () => {
            item.find('.lmeshm-card__fav-icons').remove();
            const favIconsContainer = $('<div class="lmeshm-card__fav-icons"></div>');
            let favId = data.id;
            let favType = data.type === "series" ? "tv" : "movie"; 
            if (data.id.includes('::') && data.type === "series") { favId = data.id.split('::')[1];}
            const cardDataForFav = {
                id: favId, title: data.name, name: data.name, poster: data.poster,
                year: data.year || '', type: favType, original_name: data.original_name || ''
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
    }

    // --- PluginComponent ---
    function PluginComponent(object) {
        this.activity = object;
        const userLang = Lampa.Storage.field('language');
        let network = new Lampa.Reguest();
        let scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        let items_instances = []; 
        let displayed_metas_ids = new Set();
        let current_api_page = 1;  
        let can_load_more = true;   

        const html = $("<div class='LMEShikimori-module'></div>");
        const head = $(`<div class='LMEShikimori-head torrent-filter'>
                        <div class='plugin__home simple-button simple-button--filter selector'>Home</div>
                        <div class='plugin__filter simple-button simple-button--filter selector'>Filter</div>
                       </div>`);
        const body = $('<div class="LMEShikimori-catalog--list category-full"></div>');
        let last_focused_card_element = null;

        const currentCatalogKey = (this.activity.params && this.activity.params.catalog_key) ? 
                                     this.activity.params.catalog_key : 'all';
        
        const getTranslatedText = (lang_key, fallback_text_or_cat_key, default_text_if_no_fallback_key) => {
            let text = Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? Lampa.Lang.translate(lang_key) : null;
            if (!text || text === lang_key) { 
                text = CATALOG_TITLES[fallback_text_or_cat_key] || default_text_if_no_fallback_key || lang_key;
            }
            return text;
        };

        this.fetchData = function (page_to_fetch, onSuccess, onError) {
            this.activity.loader(true);
            let urlToFetch;
            let isFetchingAllInitial = (currentCatalogKey === 'all' && page_to_fetch === 1);

            if (isFetchingAllInitial) {
                if (API_CATALOG_ENDPOINTS.newset) {
                    urlToFetch = FLASK_API_BASE + API_CATALOG_ENDPOINTS.newset + `?page=${page_to_fetch}`;
                } else { 
                    this.activity.loader(false); can_load_more = false; 
                    if (onSuccess) onSuccess([]); return;
                }
            } else if (currentCatalogKey !== 'all' && API_CATALOG_ENDPOINTS[currentCatalogKey]) {
                urlToFetch = FLASK_API_BASE + API_CATALOG_ENDPOINTS[currentCatalogKey] + `?page=${page_to_fetch}`;
            } else if (currentCatalogKey === 'all' && page_to_fetch > 1) {
                this.activity.loader(false); can_load_more = false;
                if (onSuccess) onSuccess([]); return;
            } else { 
                this.activity.loader(false); can_load_more = false; 
                if (onSuccess) onSuccess([]); return;
            }

            network.clear(); 
            network.native(urlToFetch, (responseData) => {
                this.activity.loader(false);
                let newMetasRaw = responseData.metas || [];
                const uniqueNewMetas = [];
                newMetasRaw.forEach(meta => {
                    if (meta && meta.id && !displayed_metas_ids.has(meta.id)) {
                        uniqueNewMetas.push(meta);
                        displayed_metas_ids.add(meta.id); 
                    }
                });
                if (onSuccess) onSuccess(uniqueNewMetas);
            }, (errStatus, errData) => { 
                this.activity.loader(false); can_load_more = false; 
                console.error(`Plugin: Error fetching data from ${urlToFetch}`, errStatus, errData);
                if (onError) onError(getTranslatedText('plugin_error_fetch_data', '', "Ошибка загрузки данных."));
            }, false, {dataType: 'json', timeout: 20000});
        };

        this.appendCardsToDOM = function (metasToAppend) {
            if (currentCatalogKey === 'all' && current_api_page > 1) { can_load_more = false; }
            if (metasToAppend.length === 0 && current_api_page > 1) { can_load_more = false;} 
            if (currentCatalogKey !== 'all' && metasToAppend.length < ITEMS_PER_API_REQUEST && current_api_page > 0) {
                can_load_more = false;
            }

            metasToAppend.forEach(meta => {
                const card = new PluginCard(meta, userLang);
                const card_render = card.render();
                card_render.on("hover:focus", () => { last_focused_card_element = card_render[0]; scroll.update(last_focused_card_element, true);});
                card_render.on("hover:enter", () => {
                    const cardFlaskData = card.getRawData(); 
                    let item_id_slug = cardFlaskData.id;
                    let item_type_for_stream = "hentai"; 
                    if (cardFlaskData.id.includes('::')) {
                        const parts = cardFlaskData.id.split('::');
                        item_id_slug = parts[1]; 
                    }
                    
                    const streamsUrl = STREAM_ENDPOINT_TPL.replace('{type}', item_type_for_stream).replace('{id}', item_id_slug);
                    this.activity.loader(true);
                    
                    network.clear(); 
                    network.native(streamsUrl, (flaskResponse) => { 
                        this.activity.loader(false);
                        if (flaskResponse && flaskResponse.streams && flaskResponse.streams.length > 0) {
                            const playerItems = flaskResponse.streams.map(stream => {
                                let streamTitle = stream.name || "Player";
                                if (stream.title) { streamTitle += ` - ${stream.title}`; }
                                return { 
                                    title: streamTitle, 
                                    stream_details: stream 
                                };
                            });
                            Lampa.Select.show({
                                title: getTranslatedText('player_select_title', '', 'Выберите плеер'),
                                items: playerItems,
                                onBack: () => { Lampa.Controller.toggle('content'); },
                                onSelect: (selectedPlayerItem) => { 
                                    const streamDetails = selectedPlayerItem.stream_details; 
                                    
                                    const playerLaunchData = {
                                        title: cardFlaskData.name || 'Без названия',
                                        poster: cardFlaskData.poster || '',
                                        id: cardFlaskData.id, 
                                        name: cardFlaskData.name,
                                        type: cardFlaskData.type === 'series' ? 'tv' : 'movie',
                                    };

                                    if (streamDetails.url) { 
                                        let videoUrl = streamDetails.url;
                                        let useVideoProxy = true; 

                                        // Пример логики исключения (раскомментируйте и адаптируйте при необходимости)
                                        // try {
                                        //     const parsedVideoUrl = new URL(videoUrl);
                                        //     if (parsedVideoUrl.hostname === "77.91.78.5" || // IP вашего прокси
                                        //         parsedVideoUrl.hostname === "localhost"
                                        //     ) {
                                        //         useVideoProxy = false;
                                        //     }
                                        // } catch (e) {
                                        //     console.warn("Plugin: Could not parse videoUrl to check for proxying", videoUrl, e);
                                        // }

                                        if (useVideoProxy) {
                                            videoUrl = PROXY_FOR_EXTERNAL_URLS + encodeURIComponent(videoUrl);
                                            if (Lampa.Noty) Lampa.Noty.show(getTranslatedText('proxy_loading_notification', '', 'Загрузка видео через прокси...'), {time: 1500});
                                        }
                                        
                                        playerLaunchData.url = videoUrl;

                                        if (Lampa.Timeline && typeof Lampa.Timeline.view === 'function') { playerLaunchData.timeline = Lampa.Timeline.view(playerLaunchData.id) || {};}
                                        if (Lampa.Timeline && typeof Lampa.Timeline.update === 'function') Lampa.Timeline.update(playerLaunchData);
                                        Lampa.Player.play(playerLaunchData); Lampa.Player.playlist([playerLaunchData]);
                                        if (Lampa.Favorite && typeof Lampa.Favorite.add === 'function') { Lampa.Favorite.add('history', playerLaunchData); }
                                        card.updateIcons();
                                    } else if (streamDetails.externalUrl) { 
                                        let urlToOpen = streamDetails.externalUrl;
                                        urlToOpen = PROXY_FOR_EXTERNAL_URLS + encodeURIComponent(urlToOpen);
                                        if (Lampa.Noty) Lampa.Noty.show(getTranslatedText('proxy_loading_notification', '', 'Загрузка через прокси...'), {time: 1500});
                                        Lampa.Utils.openLink(urlToOpen);
                                    } else { 
                                        Lampa.Noty.show(getTranslatedText('player_stream_error_url', '', 'Некорректные данные для потока'));
                                    }
                                }
                            });
                        } else { Lampa.Noty.show(getTranslatedText('player_no_streams_found', '', 'Плееры не найдены'));}
                    }, (errStatus, errData) => { 
                        this.activity.loader(false); 
                        console.error("Plugin: Error fetching streams from Flask API", errStatus, errData); 
                        let errMsg = getTranslatedText('player_streams_fetch_error','','Ошибка загрузки плееров');
                        if(errData && typeof errData === 'string' && errData.length < 150) { try {let pe = JSON.parse(errData); if(pe.error) errMsg += `: ${pe.error}`;}catch(e){errMsg+=`: ${errData}`;} }
                        else if (errStatus) { errMsg += ` (status ${errStatus})`;}
                        Lampa.Noty.show(errMsg);
                    }, false, {dataType: 'json', timeout: 20000}); 
                });
                card_render.on('hover:long', () => { 
                    const originalData = card.getRawData();
                    let favId = originalData.id;
                    let favType = originalData.type === 'series' ? 'tv' : 'movie';
                    if (originalData.id.includes('::') && originalData.type === "series") { favId = originalData.id.split('::')[1];}

                    const cardDataForFav = {
                        id: favId, title: originalData.name, name: originalData.name, poster: originalData.poster,
                        year: originalData.year || '', type: favType, 
                        original_name: originalData.original_name || ''
                    };
                    const st = (Lampa.Favorite && typeof Lampa.Favorite.check === 'function' ? Lampa.Favorite.check(cardDataForFav) : {}) || {};
                    const menu = [
                        { title: getTranslatedText('title_book', '', 'Запланировано'), where: 'book', checkbox: true, checked: st.book },
                        { title: getTranslatedText('title_like', '', 'Нравится'), where: 'like', checkbox: true, checked: st.like },
                        { title: getTranslatedText('title_wath', '', 'Смотрю'), where: 'wath', checkbox: true, checked: st.wath },
                        { title: getTranslatedText('menu_history', '', 'История'), where: 'history', checkbox: true, checked: st.history },
                    ];
                    Lampa.Select.show({
                        title: getTranslatedText('title_action', '', 'Действие'), items: menu,
                        onBack: () => Lampa.Controller.toggle('content'),
                        onCheck: (item) => {
                            if (Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function') Lampa.Favorite.toggle(item.where, cardDataForFav);
                            card.updateIcons();
                        },
                        onSelect: () => { Lampa.Select.close(); Lampa.Controller.toggle('content'); },
                    });
                 });
                body.append(card_render);
                items_instances.push(card);
                setTimeout(() => card.updateIcons(), 50);
            });
            if (!last_focused_card_element && items_instances.length > 0) {
                const firstVisibleCard = items_instances.find(card_instance => $(card_instance.render()).is(':visible'));
                if (firstVisibleCard) last_focused_card_element = firstVisibleCard.render()[0];
            }
            this.activity.toggle();
        };
        
        this.loadNextPage = function() {
            if (!can_load_more || this.activity.loader()) return;
            if (currentCatalogKey === 'all') { can_load_more = false; return; }
            current_api_page++; 
            this.fetchData(current_api_page, 
                (newMetas) => { this.appendCardsToDOM(newMetas); }, 
                () => { can_load_more = false; }
            );
        };

        this.build = function () { 
            scroll.minus();
            scroll.onWheel = (step) => { if (!Lampa.Controller.own(this)) this.start(); if (step > 0) Navigator.move('down'); else Navigator.move('up'); };
            scroll.onEnd = () => { if (can_load_more) { this.loadNextPage(); }};
            this.headeraction();
            this.fetchData(1, 
                (initialMetas) => {
                    if (initialMetas.length > 0) {
                        this.appendCardsToDOM(initialMetas);
                        if (currentCatalogKey === 'all' || initialMetas.length < ITEMS_PER_API_REQUEST) { 
                            can_load_more = false; 
                        }
                    } else {
                         const catTitle = getTranslatedText('plugin_cat_' + currentCatalogKey, currentCatalogKey, "каталог");
                         this.empty((getTranslatedText('plugin_empty_category', '', "Категория \"{category}\" пуста.")).replace('{category}', catTitle));
                    }
                }, 
                (errorMsg) => { this.empty(errorMsg); }
            );
            scroll.append(head); scroll.append(body); html.append(scroll.render(true));
        };

        this.headeraction = function () {
            const homeButton = head.find('.plugin__home');
            const filterButton = head.find('.plugin__filter');
            homeButton.on('hover:enter', () => {
                Lampa.Activity.push({
                    component: 'my_plugin_catalog', 
                    title: getTranslatedText('plugin_title_all', 'all', CATALOG_TITLES.all),
                    params: { catalog_key: 'all' } 
                });
            });
            filterButton.on('hover:enter', () => {
                const filterMenuOptions = [{ title: getTranslatedText('plugin_cat_all', 'all', CATALOG_TITLES.all), catalog_key: 'all' }];
                Object.keys(API_CATALOG_ENDPOINTS).forEach(catKey => {
                    filterMenuOptions.push({
                        title: getTranslatedText('plugin_cat_' + catKey, catKey, CATALOG_TITLES[catKey] || catKey),
                        catalog_key: catKey
                    });
                });
                Lampa.Select.show({
                    title: getTranslatedText('plugin_filter_title', '', 'Фильтр категорий'),
                    items: filterMenuOptions,
                    onBack: () => { Lampa.Controller.toggle('content'); },
                    onSelect: (selectedItem) => {
                        Lampa.Activity.push({
                            component: 'my_plugin_catalog', 
                            title: selectedItem.title, 
                            params: { catalog_key: selectedItem.catalog_key }
                        });
                    }
                });
            });
        };
        
        this.clear = function() { items_instances.forEach(i=>i.destroy());items_instances=[];displayed_metas_ids.clear();body.empty();current_api_page=1;can_load_more=true;};
        this.empty = function (msg) { const e=new Lampa.Empty();e.msg(msg||getTranslatedText('plugin_empty_catalog','',"Каталог пуст."));html.empty().append(e.render(true));this.start=e.start;this.activity.loader(false);this.activity.toggle();};
        this.create = function () {
            const initialTitle = getTranslatedText(
                (currentCatalogKey && currentCatalogKey !== 'all') ? 'plugin_cat_' + currentCatalogKey : 'plugin_title_all',
                currentCatalogKey, 
                (currentCatalogKey === 'all' ? CATALOG_TITLES.all : CATALOG_TITLES[currentCatalogKey] || currentCatalogKey)
            );
            if(this.activity && this.activity.activity) {this.activity.activity.title = initialTitle;} 
            else if (this.activity) {this.activity.title = initialTitle;}
            this.build();
        };
        this.start = function () {
            if(Lampa.Activity.active() && Lampa.Activity.active().activity !== this.activity) return;
            const currentActivityTitle = getTranslatedText(
                (currentCatalogKey && currentCatalogKey !== 'all') ? 'plugin_cat_' + currentCatalogKey : 'plugin_title_all',
                currentCatalogKey,
                (currentCatalogKey === 'all' ? CATALOG_TITLES.all : CATALOG_TITLES[currentCatalogKey] || currentCatalogKey)
            );
            if(Lampa.Activity.active()) Lampa.Activity.active().title = currentActivityTitle;
            Lampa.Controller.add("content",{toggle:()=>{Lampa.Controller.collectionSet(scroll.render());let fe=false;if(last_focused_card_element&&$.contains(document.documentElement,last_focused_card_element)&&$(last_focused_card_element).is(':visible'))fe=last_focused_card_element;else if(items_instances.length>0){const fvi=items_instances.find(ci=>{const rc=ci.render();return rc&&$(rc).is(':visible')&&$.contains(body[0],rc[0])});if(fvi){fe=fvi.render()[0];last_focused_card_element=fe;}}Lampa.Controller.collectionFocus(fe,scroll.render())},left:()=>{if(Navigator.canmove("left"))Navigator.move("left");else Lampa.Controller.toggle("menu")},right:()=>Navigator.move("right"),up:()=>{if(Navigator.canmove("up"))Navigator.move("up");else Lampa.Controller.toggle("head")},down:()=>Navigator.move("down"),back:this.back});Lampa.Controller.toggle("content");
        };
        this.pause = function () {}; this.stop = function () {}; this.render = function () { return html; };
        this.destroy = function () {
            if(network) network.clear(); 
            if(scroll) scroll.destroy(); 
            this.clear(); 
            html.remove(); 
            items_instances = null; 
            displayed_metas_ids = null; 
            network = null; 
            scroll = null;  
            last_focused_card_element = null;
            current_api_page = 1; 
            can_load_more = true;
        };
        this.back = () => Lampa.Activity.backward();
    }

    function startPlugin() {
        if (window.plugin_mycustom_catalog_ready) return; 
        function initLampaDeps() {
            const criticalMissing = []; 
            if (!window.Lampa) criticalMissing.push("window.Lampa"); if (!window.$) criticalMissing.push("window.$");
            if (window.Lampa) {
                const deps = ["Template", "Component", "Activity", "Controller", "Scroll", "Reguest", "Favorite", "Timeline", "Noty", "Select", "Lang", "Player", "Empty", "Utils"]; 
                deps.forEach(dep => { if (!Lampa[dep]) criticalMissing.push("Lampa." + dep); });
            }
            if (criticalMissing.length > 0) {
                console.error('Plugin: Critical Lampa dependencies missing!', criticalMissing);
                if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                    Lampa.Noty.show('Ошибка плагина: Отсутствуют компоненты Lampa: ' + criticalMissing.join(', '));
                } return;
            }
            window.plugin_mycustom_catalog_ready = true; 

            Lampa.Template.add('LMEShikimoriStyle', "<style>\n .LMEShikimori-catalog--list.category-full{-webkit-box-pack:justify !important;-webkit-justify-content:space-between !important;-ms-flex-pack:justify !important;justify-content:space-between !important}.LMEShikimori-head.torrent-filter{margin-left:1.5em; display: flex; gap: 1em;}.LMEShikimori.card__type{background:#ff4242;color:#fff} .lmeshm-card__fav-icons{position:absolute;top:0.3em;right:0.3em;display:flex;flex-direction:column;gap:0.2em;z-index:5;} .lmeshm-card__fav-icons .card__icon{background-color:rgba(0,0,0,0.5);border-radius:0.2em;padding:0.1em;} \n</style>");
            Lampa.Template.add("LMEShikimori-Card", `
            <div class="LMEShikimori card selector layer--visible layer--render">
                <div class="LMEShikimori card__view">
                    <img src="{img}" class="LMEShikimori card__img" />
                    <div class="LMEShikimori card__type">{type}</div>
                </div>
                <div class="LMEShikimori card__title">{title}</div>
            </div>`);
            if ($('style[data-lmeshikimori-styles]').length === 0) { const s=$(Lampa.Template.get('LMEShikimoriStyle',{},true));s.attr('data-lmeshikimori-styles','true');$('body').append(s); }
            
            if (Lampa.Lang?.add) {
                Lampa.Lang.add({ 
                    plugin_title_all: CATALOG_TITLES.all, 
                    plugin_filter_title: "Фильтр",
                    plugin_cat_all: CATALOG_TITLES.all, 
                    plugin_cat_newset: CATALOG_TITLES.newset,
                    plugin_empty_catalog: "Каталог пуст.", 
                    plugin_empty_category: "Категория \"{category}\" пуста.", 
                    plugin_error_fetch_data: "Ошибка загрузки данных.",
                    player_select_title: "Выберите плеер", 
                    player_no_streams_found: "Плееры не найдены.",
                    player_streams_fetch_error: "Ошибка загрузки плееров", 
                    player_stream_error_url: "Некорректные данные плеера", 
                    proxy_loading_notification: "Загрузка через прокси...",
                    title_book: 'Запланировано', title_like: 'Нравится', 
                    title_wath: 'Смотрю', menu_history: 'История', title_action: 'Действие'
                });
            }
            Lampa.Component.add('my_plugin_catalog', PluginComponent); 
            addMenuItem();
        }

        function addMenuItem() {
            const componentName = 'my_plugin_catalog';
            if ($(`.menu__list .menu__item[data-action="${componentName}"]`).length > 0) { return; }
            
            const getMenuItemText = () => {
                const key = 'plugin_title_all';
                let translated = Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? Lampa.Lang.translate(key) : null;
                if (!translated || translated === key) { translated = CATALOG_TITLES.all; }
                return translated || "Каталог";
            };
            const menuItemText = getMenuItemText();

            const menu_item_html = $(`<li class="menu__item selector" data-action="${componentName}">
                <div class="menu__ico">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                </div> <div class="menu__text">${menuItemText}</div></li>`);
            menu_item_html.on('hover:enter', () => {
                Lampa.Activity.push({ 
                    component: componentName, title: getMenuItemText(),
                    params: { catalog_key: 'all' }
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
