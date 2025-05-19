(function () {
    'use strict';

    // --- API и Константы для ВАШЕГО Flask API ---
    const FLASK_API_BASE = "http://77.91.78.5:5000"; 
    const API_CATALOG_CONFIG = { 
        'new-releases': { path: "/catalog/new-releases", paginated: true, default_main: true },
        'hottest': { path: "/catalog/hottest", paginated: false },
        'random': { path: "/catalog/random", paginated: false },    
    };
    const API_SEARCH_ENDPOINT = "/search";

    const CATALOG_TITLES_FALLBACK = { 
        'all_main_title': "Каталог H-Hub", 
        'new-releases': "Новые релизы", 
        'hottest': "Популярные",
        'random': "Случайные",
        'tags': "Теги", 
        'filter_title': "Фильтр",
        'search_input_title': "Поиск по каталогу",
        'search_results_title': "Поиск: {query}",
        'cookie_set_title': "Установить Cookie",
        'cookie_set_descr': "Вставьте значение Cookie. Оставьте пустым для удаления.",
        'cookie_saved': "Cookie сохранено",
        'cookie_removed': "Cookie удалено"
    };

    const TAG_SLUG_MAP = {"ahegao":"Ахегао","bdsm":"БДСМ","big-boobs":"Большая грудь","blow-job":"Минет","bondage":"Бондаж","paizuri":"Пайзури","censored":"С цензурой","comedy":"Комедия","cosplay":"Косплей","creampie":"Крем-пай","dark-skin":"Темная кожа","facial":"На лицо","fantasy":"Фэнтези","filming":"Съемка","footjob":"Футджоб","futanari":"Футанари","gangbang":"Гэнгбэнг","glasses":"В очках","harem":"Гарем","hd":"HD","horror":"Ужасы","incest":"Инцест","inflation":"Раздувание","lactation":"Лактация","small-boobs":"Маленькая грудь","maids":"Горничные","masturbation":"Мастурбация","milf":"Милфы","mind-break":"Свести с ума","mind-control":"Контроль сознания","monster-girl":"Монстры (девушки)","neko":"Неко","ntr":"НТР","nurses":"Медсестры","orgy":"Оргия","plot":"С сюжетом","pov":"От первого лица","pregnant":"Беременные","public-sex":"Публичный секс","rape":"Изнасилование","reverse-rape":"Обратное изнасилование","scat":"Дерьмо","schoolgirls":"Школьницы","shota":"Шота","ero":"Эротика","swimsuit":"Купальник","teacher":"Учитель","tentacles":"Тентакли","threesome":"Тройничок","toys":"Игрушки","tsundere":"Цундере","ugly-bastard":"Противный ублюдок","uncensored":"Без цензуры","vanilla":"Классика","virgin":"Девственность","watersports":"Золотой дождь","x-ray":"X-ray","yuri":"Юри"};
    const ITEMS_PER_API_REQUEST = 20; 
    const STREAM_ENDPOINT_TPL = FLASK_API_BASE + "/streams/{type}/{id}.json"; 
    const PROXY_FOR_EXTERNAL_URLS = "http://77.91.78.5:3000/proxy?url=";

    // --- PluginCard ---
    function PluginCard(data, userLang) {
        const pr = {id: data.id, name: data.name || 'Без названия', poster: data.poster || './img/img_broken.svg', type_display: data.type === "series" ? "SERIES" : (data.type === "movie" ? "MOVIE" : (data.type ? data.type.toUpperCase() : "MOVIE"))};
        const item = Lampa.Template.get("LMEShikimori-Card", {img: pr.poster, type: pr.type_display, title: pr.name});
        const updateFavoriteIcons = () => { item.find('.lmeshm-card__fav-icons').remove(); const fc=$('<div class="lmeshm-card__fav-icons"></div>'); let fid=data.id; let ft=data.type==="series"?"tv":"movie"; if(data.id.includes('::')&&data.type==="series")fid=data.id.split('::')[1]; const cdf={id:fid,title:data.name,name:data.name,poster:data.poster,year:data.year||'',type:ft,original_name:data.original_name||''}; const st=(Lampa.Favorite&&typeof Lampa.Favorite.check==='function'?Lampa.Favorite.check(cdf):{})||{}; if(st.book)fc.append($('<div>').addClass('card__icon icon--book')); if(st.like)fc.append($('<div>').addClass('card__icon icon--like')); if(st.wath)fc.append($('<div>').addClass('card__icon icon--wath')); if(st.history||(Lampa.Timeline&&typeof Lampa.Timeline.watched==='function'&&Lampa.Timeline.watched(cdf)))fc.append($('<div>').addClass('card__icon icon--history')); item.find('.LMEShikimori.card__view').append(fc);};
        this.updateIcons=updateFavoriteIcons; this.render=function(){return item}; this.destroy=function(){item.remove()}; this.getRawData=function(){return data};
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
        let auto_load_attempts = 0; 
        const MAX_AUTO_LOAD_ATTEMPTS = 5; 

        const html = $("<div class='LMEShikimori-module'></div>");
        const head = $(`<div class='LMEShikimori-head torrent-filter'>
                        <div class='plugin__home simple-button simple-button--filter selector'>Home</div>
                        <div class='plugin__filter simple-button simple-button--filter selector'>Filter</div>
                        <div class='plugin__search simple-button simple-button--filter selector'>Поиск</div>
                        <div class='plugin__cookie simple-button simple-button--filter selector'>Cookie</div>
                       </div>`);
        const body = $('<div class="LMEShikimori-catalog--list category-full"></div>');
        let last_focused_card_element = null;

        this.isSearchMode = this.activity.params && this.activity.params.search_query;
        this.searchQuery = this.isSearchMode ? this.activity.params.search_query : '';
        this.currentCatalogKey = this.isSearchMode ? 'search' : ((this.activity.params && this.activity.params.catalog_key) ? this.activity.params.catalog_key : 'new-releases');
        
        let currentCatalogConfig = API_CATALOG_CONFIG[this.currentCatalogKey];
        let isTagCatalog = false;
        let currentTagSlug = '';

        if (!this.isSearchMode && this.currentCatalogKey.startsWith('tag__')) {
            isTagCatalog = true;
            currentTagSlug = this.currentCatalogKey.substring(5); 
            currentCatalogConfig = { paginated: true, title_key_suffix: 'tag_' + currentTagSlug };
        } else if (!this.isSearchMode && !currentCatalogConfig) { 
             this.currentCatalogKey = 'new-releases';
             currentCatalogConfig = API_CATALOG_CONFIG['new-releases'];
        }
        
        const getLangText = (lang_key_suffix, fallback_text) => {
            const full_lang_key = 'plugin_' + lang_key_suffix;
            let text = Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? Lampa.Lang.translate(full_lang_key) : null;
            return (text && text !== full_lang_key) ? text : fallback_text;
        };

        this.fetchData = function (page_to_fetch, onSuccess, onError, isAutoRetry = false) {
            if (!isAutoRetry) { auto_load_attempts = 0;}
            this.activity.loader(true);
            let urlToFetch;
            
            if (this.isSearchMode) {
                urlToFetch = FLASK_API_BASE + API_SEARCH_ENDPOINT + `?q=${encodeURIComponent(this.searchQuery)}&page=${page_to_fetch}`;
            } else if (isTagCatalog) {
                urlToFetch = FLASK_API_BASE + `/catalog/tag/${currentTagSlug}?page=${page_to_fetch}`;
            } else if (currentCatalogConfig && currentCatalogConfig.path) {
                urlToFetch = FLASK_API_BASE + currentCatalogConfig.path;
                if (currentCatalogConfig.paginated) { urlToFetch += `?page=${page_to_fetch}`; }
            } else { this.activity.loader(false); can_load_more = false; if (onSuccess) onSuccess([], 0); return;}
            
            if (!this.isSearchMode && !isTagCatalog && currentCatalogConfig && !currentCatalogConfig.paginated && page_to_fetch > 1) {
                this.activity.loader(false); can_load_more = false; if (onSuccess) onSuccess([], 0); return;
            }

            network.clear(); 
            network.native(urlToFetch, (responseData) => {
                this.activity.loader(false); let newMetasRaw = responseData.metas || [];
                const uniqueNewMetas = [];
                newMetasRaw.forEach(meta => {
                    if (meta && meta.id && !displayed_metas_ids.has(meta.id)) {
                        if (meta.type !== "series") { uniqueNewMetas.push(meta); }
                        displayed_metas_ids.add(meta.id); 
                    }
                });
                const isEmptyAfterFilter = newMetasRaw.length > 0 && uniqueNewMetas.length === 0;
                if (onSuccess) onSuccess(uniqueNewMetas, newMetasRaw.length, isEmptyAfterFilter); 
            }, (errStatus, errData) => { this.activity.loader(false); can_load_more = false; console.error(`Plugin: Error fetching data from ${urlToFetch}`, errStatus, errData); if (onError) onError(getLangText('error_fetch_data',"Ошибка загрузки данных."))},false,{dataType:'json',timeout:20000});
        };

        this.appendCardsToDOM = function (metasToAppend, originalApiBatchLength, isEmptyAfterFilter = false) {
            const isPaginating = this.isSearchMode || isTagCatalog || (currentCatalogConfig && currentCatalogConfig.paginated);
            if (isPaginating) {
                if (originalApiBatchLength === 0 && current_api_page > 1) { can_load_more = false; }
                if (originalApiBatchLength < ITEMS_PER_API_REQUEST && current_api_page >= 1) { can_load_more = false;}
            } else { can_load_more = false; }

            if (isEmptyAfterFilter && can_load_more && auto_load_attempts < MAX_AUTO_LOAD_ATTEMPTS) {
                auto_load_attempts++; this.loadNextPage(true); return; 
            } else if (metasToAppend.length === 0 && !can_load_more && items_instances.length === 0) {
                let catTitle;
                if(this.isSearchMode) catTitle = (getLangText('search_results_title', CATALOG_TITLES_FALLBACK.search_results_title)).replace('{query}', this.searchQuery);
                else {
                    const titleKeySuffix = isTagCatalog ? 'tag_' + currentTagSlug : 'cat_' + this.currentCatalogKey;
                    const fallbackText = isTagCatalog ? TAG_SLUG_MAP[currentTagSlug] : CATALOG_TITLES_FALLBACK[this.currentCatalogKey];
                    catTitle = getLangText(titleKeySuffix, fallbackText || this.currentCatalogKey);
                }
                this.empty((getLangText('empty_category', "Категория \"{category}\" пуста.")).replace('{category}', catTitle));
                return; 
            }
            if(metasToAppend.length > 0) auto_load_attempts = 0;

            metasToAppend.forEach(meta => {
                const card = new PluginCard(meta, userLang); const card_render = card.render();
                card_render.on("hover:focus", () => { last_focused_card_element = card_render[0]; scroll.update(last_focused_card_element, true);});
                card_render.on("hover:enter", () => {
                    const cardFlaskData = card.getRawData();let item_id_slug = cardFlaskData.id;let item_type_for_stream = "hentai"; 
                    if (cardFlaskData.id.includes('::')) {const parts = cardFlaskData.id.split('::'); item_id_slug = parts[1];}
                    const streamsUrl = STREAM_ENDPOINT_TPL.replace('{type}', item_type_for_stream).replace('{id}', item_id_slug);
                    this.activity.loader(true); network.clear(); 
                    
                    let requestOptions = {dataType: 'json', timeout: 20000};
                    const savedCookie = localStorage.getItem('my_plugin_cookie');
                    if (savedCookie) {
                        requestOptions.headers = {'X-Custom-Cookie': savedCookie};
                        console.log("Plugin: Sending X-Custom-Cookie for stream request:", savedCookie.substring(0,30) + "...");
                    }
                    
                    network.native(streamsUrl,fr=>{this.activity.loader(false);if(fr&&fr.streams&&fr.streams.length>0){const pi=fr.streams.map(s=>{let st=s.name||"P";if(s.title)st+=` - ${s.title}`;return{title:st,stream_details:s}});Lampa.Select.show({title:getLangText('player_select_title','Выберите плеер'),items:pi,onBack:()=>Lampa.Controller.toggle('content'),
                        onSelect:si=>{const sd=si.stream_details;const pld={title:cardFlaskData.name||'Без названия',poster:cardFlaskData.poster||'',id:cardFlaskData.id,name:cardFlaskData.name,type:cardFlaskData.type==='series'?'tv':'movie'};
                            if(sd.url){let vu=sd.url;let uvp=true;if(uvp){vu=PROXY_FOR_EXTERNAL_URLS+encodeURIComponent(vu);if(Lampa.Noty)Lampa.Noty.show(getLangText('proxy_loading_notification','Загрузка видео через прокси...'),{time:1500})}pld.url=vu;if(Lampa.Timeline&&typeof Lampa.Timeline.view==='function')pld.timeline=Lampa.Timeline.view(pld.id)||{};if(Lampa.Timeline&&typeof Lampa.Timeline.update==='function')Lampa.Timeline.update(pld);Lampa.Player.play(pld);Lampa.Player.playlist([pld]);if(Lampa.Favorite&&typeof Lampa.Favorite.add==='function')Lampa.Favorite.add('history',pld);card.updateIcons()}
                            else if(sd.externalUrl){let uo=sd.externalUrl;uo=PROXY_FOR_EXTERNAL_URLS+encodeURIComponent(uo);if(Lampa.Noty)Lampa.Noty.show(getLangText('proxy_loading_notification','Загрузка через прокси...'),{time:1500});Lampa.Utils.openLink(uo)}
                            else Lampa.Noty.show(getLangText('player_stream_error_url','Некорректные данные для потока'))
                        }})}else Lampa.Noty.show(getLangText('player_no_streams_found','Плееры не найдены'))
                    }, (es,ed)=>{this.activity.loader(false);console.error("P:Err fetch streams",es,ed);Lampa.Noty.show(getLangText('player_streams_fetch_error','Ошибка загрузки плееров'))},false, requestOptions);
                });
                card_render.on('hover:long', () => { const oD=card.getRawData();let fI=oD.id;let fT=oD.type==='series'?'tv':'movie';if(oD.id.includes('::')&&oD.type==="series")fI=oD.id.split('::')[1];const cdF={id:fI,title:oD.name,name:oD.name,poster:oD.poster,year:oD.year||'',type:fT,original_name:oD.original_name||''};const sT=(Lampa.Favorite&&typeof Lampa.Favorite.check==='function'?Lampa.Favorite.check(cdF):{})||{};const mn=[{title:getLangText('title_book','Запланировано'),where:'book',checkbox:true,checked:sT.book},{title:getLangText('title_like','Нравится'),where:'like',checkbox:true,checked:sT.like},{title:getLangText('title_wath','Смотрю'),where:'wath',checkbox:true,checked:sT.wath},{title:getLangText('menu_history','История'),where:'history',checkbox:true,checked:sT.history}];Lampa.Select.show({title:getLangText('title_action','Действие'),items:mn,onBack:()=>Lampa.Controller.toggle('content'),onCheck:i=>{if(Lampa.Favorite&&typeof Lampa.Favorite.toggle==='function')Lampa.Favorite.toggle(i.where,cdF);card.updateIcons()},onSelect:()=>{Lampa.Select.close();Lampa.Controller.toggle('content')}})});
                body.append(card_render); items_instances.push(card); setTimeout(()=>card.updateIcons(),50);
            });
            if(!last_focused_card_element&&items_instances.length>0){const fvc=items_instances.find(ci=>$(ci.render()).is(':visible'));if(fvc)last_focused_card_element=fvc.render()[0]}this.activity.toggle();
        };
        
        this.loadNextPage = function(isAutoRetry = false) {
            if (!can_load_more || this.activity.loader()) return;
            if (!this.isSearchMode && !isTagCatalog && (this.currentCatalogKey === 'all' || (currentCatalogConfig && !currentCatalogConfig.paginated)) ) {can_load_more = false; return;}
            if (!isAutoRetry) auto_load_attempts = 0; 
            current_api_page++; 
            this.fetchData(current_api_page, (newMetas, originalLength, isEmptyAfterFilter) => { this.appendCardsToDOM(newMetas, originalLength, isEmptyAfterFilter); }, () => { can_load_more = false; }, isAutoRetry);
        };

        this.build = function () { 
            scroll.minus();
            scroll.onWheel = (step) => { if (!Lampa.Controller.own(this)) this.start(); if (step > 0) Navigator.move('down'); else Navigator.move('up'); };
            scroll.onEnd = () => { if (can_load_more) { this.loadNextPage(false); }};
            this.headeraction();
            this.fetchData(1, 
                (initialMetas, originalLength, isEmptyAfterFilterOnInit) => {
                    if (initialMetas.length > 0 || items_instances.length > 0) { 
                        this.appendCardsToDOM(initialMetas, originalLength, isEmptyAfterFilterOnInit);
                    } else if (isEmptyAfterFilterOnInit && can_load_more) { 
                        auto_load_attempts++; this.loadNextPage(true);
                    } else { 
                        let catTitle;
                        if(this.isSearchMode) catTitle = (getLangText('search_results_title', CATALOG_TITLES_FALLBACK.search_results_title)).replace('{query}', this.searchQuery);
                        else {
                            const titleKeySuffix = isTagCatalog ? 'tag_' + currentTagSlug : 'cat_' + this.currentCatalogKey;
                            const fallbackText = isTagCatalog ? TAG_SLUG_MAP[currentTagSlug] : CATALOG_TITLES_FALLBACK[this.currentCatalogKey];
                            catTitle = getLangText(titleKeySuffix, fallbackText || this.currentCatalogKey);
                        }
                         this.empty((getLangText('empty_category', "Категория \"{category}\" пуста.")).replace('{category}', catTitle));
                    }
                }, 
                (errorMsg) => { this.empty(errorMsg); }
            );
            scroll.append(head); scroll.append(body); html.append(scroll.render(true));
        };

        this.headeraction = function () {
            const homeButton = head.find('.plugin__home');
            const filterButton = head.find('.plugin__filter');
            const searchButton = head.find('.plugin__search');
            const cookieButton = head.find('.plugin__cookie');

            homeButton.on('hover:enter', () => {
                const mainDefaultKey = Object.keys(API_CATALOG_CONFIG).find(k => API_CATALOG_CONFIG[k].default_main) || 'new-releases';
                Lampa.Activity.push({component: 'my_plugin_catalog', title: getLangText('cat_' + mainDefaultKey, CATALOG_TITLES_FALLBACK[mainDefaultKey]), params: { catalog_key: mainDefaultKey }});
            });
            filterButton.on('hover:enter', () => {
                const filterMenu = [];
                Object.keys(API_CATALOG_CONFIG).forEach(catKey => {
                    filterMenu.push({title: getLangText('cat_' + catKey, CATALOG_TITLES_FALLBACK[catKey] || catKey), catalog_key: catKey, is_tag_menu: false});
                });
                filterMenu.push({title: getLangText('tags_menu_title', CATALOG_TITLES_FALLBACK.tags || "Теги"), is_tag_menu: true});
                Lampa.Select.show({title: getLangText('filter_title', '', 'Фильтр'), items: filterMenu, onBack: () => { Lampa.Controller.toggle('content'); },
                    onSelect: (selectedItem) => {
                        if (selectedItem.is_tag_menu) {
                            const tagMenuItems = Object.keys(TAG_SLUG_MAP).map(tagSlug => ({title: getLangText('tag_' + tagSlug, TAG_SLUG_MAP[tagSlug]), catalog_key: 'tag__' + tagSlug }));
                            Lampa.Select.show({title: getLangText('tags_menu_title', CATALOG_TITLES_FALLBACK.tags || "Теги"), items: tagMenuItems, onBack: () => filterButton.trigger('hover:enter'), 
                                onSelect: (selectedTag) => {Lampa.Activity.push({ component: 'my_plugin_catalog', title: selectedTag.title, params: { catalog_key: selectedTag.catalog_key }});}
                            });
                        } else {Lampa.Activity.push({ component: 'my_plugin_catalog', title: selectedItem.title, params: { catalog_key: selectedItem.catalog_key }});}
                    }
                });
            });
            searchButton.on('hover:enter', () => {
                Lampa.Input.edit({title: getLangText('search_input_title', 'Поиск'), value: this.isSearchMode ? this.searchQuery : '', free: true, nosave: true }, 
                (search_text) => {
                    if (search_text) {
                        Lampa.Activity.push({component: 'my_plugin_catalog', title: (getLangText('search_results_title', 'Поиск: {query}')).replace('{query}', search_text), params: { search_query: search_text }});
                    } else { Lampa.Controller.toggle('content'); }
                });
            });
            cookieButton.on('hover:enter', () => {
                const currentCookie = localStorage.getItem('my_plugin_cookie') || '';
                Lampa.Input.edit({title: getLangText('cookie_set_title', 'Установить Cookie'), value: currentCookie, free: true, nosave: true, desc: getLangText('cookie_set_descr', 'Оставьте пустым для удаления.')}, 
                (new_cookie_value) => {
                    if (typeof new_cookie_value === 'string') { 
                        if (new_cookie_value.trim() === '') {localStorage.removeItem('my_plugin_cookie'); Lampa.Noty.show(getLangText('cookie_removed', 'Cookie удалено'));}
                        else {localStorage.setItem('my_plugin_cookie', new_cookie_value); Lampa.Noty.show(getLangText('cookie_saved', 'Cookie сохранено'));}
                    } Lampa.Controller.toggle('content'); 
                });
            });
        };
        
        this.clear = function() { items_instances.forEach(i=>i.destroy());items_instances=[];displayed_metas_ids.clear();body.empty();current_api_page=1;can_load_more=true; auto_load_attempts = 0;};
        this.empty = function (msg) { const e=new Lampa.Empty();e.msg(msg||getLangText('empty_catalog','',"Каталог пуст."));html.empty().append(e.render(true));this.start=e.start;this.activity.loader(false);this.activity.toggle();};
        
        this.create = function () {
            let initialTitle;
            if (this.isSearchMode) {initialTitle = (getLangText('search_results_title', CATALOG_TITLES_FALLBACK.search_results_title)).replace('{query}', this.searchQuery);}
            else {const titleKeySuffix = isTagCatalog ? 'tag_' + currentTagSlug : 'cat_' + this.currentCatalogKey; const fallbackText = isTagCatalog ? TAG_SLUG_MAP[currentTagSlug] : CATALOG_TITLES_FALLBACK[this.currentCatalogKey]; initialTitle = getLangText(titleKeySuffix, fallbackText || this.currentCatalogKey);}
            if(this.activity && this.activity.activity) {this.activity.activity.title = initialTitle;} 
            else if (this.activity) {this.activity.title = initialTitle;}
            this.build();
        };

        this.start = function () {
            if(Lampa.Activity.active() && Lampa.Activity.active().activity !== this.activity) return;
            let currentActivityTitle;
            if (this.isSearchMode) {currentActivityTitle = (getLangText('search_results_title', CATALOG_TITLES_FALLBACK.search_results_title)).replace('{query}', this.searchQuery);}
            else {const titleKeySuffix = isTagCatalog ? 'tag_' + currentTagSlug : 'cat_' + this.currentCatalogKey; const fallbackText = isTagCatalog ? TAG_SLUG_MAP[currentTagSlug] : CATALOG_TITLES_FALLBACK[this.currentCatalogKey]; currentActivityTitle = getLangText(titleKeySuffix, fallbackText || this.currentCatalogKey);}
            if(Lampa.Activity.active()) Lampa.Activity.active().title = currentActivityTitle;
            Lampa.Controller.add("content",{toggle:()=>{Lampa.Controller.collectionSet(scroll.render());let fe=false;if(last_focused_card_element&&$.contains(document.documentElement,last_focused_card_element)&&$(last_focused_card_element).is(':visible'))fe=last_focused_card_element;else if(items_instances.length>0){const fvi=items_instances.find(ci=>{const rc=ci.render();return rc&&$(rc).is(':visible')&&$.contains(body[0],rc[0])});if(fvi){fe=fvi.render()[0];last_focused_card_element=fe;}}Lampa.Controller.collectionFocus(fe,scroll.render())},left:()=>{if(Navigator.canmove("left"))Navigator.move("left");else Lampa.Controller.toggle("menu")},right:()=>Navigator.move("right"),up:()=>{if(Navigator.canmove("up"))Navigator.move("up");else Lampa.Controller.toggle("head")},down:()=>Navigator.move("down"),back:this.back});Lampa.Controller.toggle("content");
        };
        this.pause = function () {}; this.stop = function () {}; this.render = function () { return html; };
        this.destroy = function () {
            if(network) network.clear(); if(scroll) scroll.destroy(); this.clear(); html.remove(); 
            items_instances=null;displayed_metas_ids=null;network=null;scroll=null;last_focused_card_element=null;
            current_api_page=1;can_load_more=true;auto_load_attempts=0;
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
            
            let lang_packs = { 
                plugin_title_all: CATALOG_TITLES_FALLBACK.all_main_title, 
                plugin_filter_title: CATALOG_TITLES_FALLBACK.filter_title,
                plugin_tags_menu_title: CATALOG_TITLES_FALLBACK.tags,
                plugin_search_input_title: CATALOG_TITLES_FALLBACK.search_input_title,
                plugin_search_results_title: CATALOG_TITLES_FALLBACK.search_results_title,
                plugin_cat_new_releases: CATALOG_TITLES_FALLBACK['new-releases'],
                plugin_cat_hottest: CATALOG_TITLES_FALLBACK.hottest,
                plugin_cat_random: CATALOG_TITLES_FALLBACK.random,
                plugin_empty_catalog: "Каталог пуст.", 
                plugin_empty_category: "Категория \"{category}\" пуста.", 
                plugin_error_fetch_data: "Ошибка загрузки данных.",
                player_select_title: "Выберите плеер", 
                player_no_streams_found: "Плееры не найдены.",
                player_streams_fetch_error: "Ошибка загрузки плееров", 
                player_stream_error_url: "Некорректные данные плеера", 
                proxy_loading_notification: "Загрузка через прокси...",
                cookie_set_title: CATALOG_TITLES_FALLBACK.cookie_set_title,
                cookie_set_descr: CATALOG_TITLES_FALLBACK.cookie_set_descr,
                cookie_saved: CATALOG_TITLES_FALLBACK.cookie_saved,
                cookie_removed: CATALOG_TITLES_FALLBACK.cookie_removed,
                title_book: 'Запланировано', title_like: 'Нравится', 
                title_wath: 'Смотрю', menu_history: 'История', title_action: 'Действие'
            };
            Object.keys(TAG_SLUG_MAP).forEach(slug => {
                lang_packs['plugin_tag_' + slug] = TAG_SLUG_MAP[slug];
            });
            if (Lampa.Lang?.add) { Lampa.Lang.add(lang_packs); }

            Lampa.Component.add('my_plugin_catalog', PluginComponent); 
            addMenuItem();
        }

        function addMenuItem() {
            const componentName = 'my_plugin_catalog';
            if ($(`.menu__list .menu__item[data-action="${componentName}"]`).length > 0) { return; }
            
            const getMenuItemText = () => {
                const langKey = 'plugin_title_all';
                let translated = Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? Lampa.Lang.translate(langKey) : null;
                if (!translated || translated === langKey) { translated = CATALOG_TITLES_FALLBACK.all_main_title; }
                return translated || "Каталог H-Hub";
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
                const mainDefaultKey = Object.keys(API_CATALOG_CONFIG).find(k => API_CATALOG_CONFIG[k].default_main) || 'new-releases';
                Lampa.Activity.push({ 
                    component: componentName, title: getMenuItemText(),
                    params: { catalog_key: mainDefaultKey }
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
