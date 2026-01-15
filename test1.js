(function () {
    'use strict';

    // --- API и Константы ---
    const FLASK_API_BASE = "http://77.91.78.5/scraper";
    const API_CATALOG_CONFIG = {
        'new-releases': { path: "/catalog/new-releases", paginated: true, default_main: true },
        'hottest': { path: "/catalog/hottest", paginated: false },
        'random': { path: "/catalog/random", paginated: true },
        'playlists': { path: "/catalog/playlists", paginated: true }, // Added Playlists API config
    };
    const API_SEARCH_ENDPOINT = "/search";

    const CATALOG_TITLES_FALLBACK = {
        'all_main_title': "Каталог H-Hub",
        'new-releases': "Новые релизы",
        'hottest': "Популярные",
        'random': "Случайные",
        'playlists': "Плейлисты", // Added Playlists title fallback
        'playlist_videos_title': "Видео в плейлисте: {playlist_name}", // New title for playlist video selection page
        'tags': "Теги",
        'filter_title': "Фильтр",
        'search_input_title': "Поиск по каталогу",
        'search_results_title': "Поиск: {query}",
        'cookie_set_title': "Установить Cookie",
        'cookie_set_descr': "Вставьте значение Cookie. Оставьте пустым для удаления.",
        'cookie_saved': "Cookie сохранено",
        'cookie_removed': "Cookie удалено",
        'empty_catalog': "Каталог пуст.",
        'empty_category': "Категория \"{category}\" пуста.",
        'error_fetch_data': "Ошибка загрузки данных.",
        'player_select_title': "Выберите плеер",
        'player_no_streams_found': "Плееры не найдены.",
        'player_streams_fetch_error': "Ошибка загрузки плееров",
        'player_stream_error_url': "Некорректные данные плеера",
        'proxy_loading_notification': "Загрузка через прокси...",
        'title_book': 'Запланировано',
        'title_like': 'Нравится',
        'title_wath': 'Смотрю',
        'menu_history': 'История',
        'title_action': 'Действие',
        'home_button_text': 'Домой'
    };

    const TAG_SLUG_MAP = {"ahegao": "Ахегао", "bdsm": "БДСМ", "big-boobs": "Большая\xa0грудь", "blow-job": "Минет", "bondage": "Бондаж", "paizuri": "Пайзури", "censored": "С\xa0цензурой", "comedy": "Комедия", "cosplay": "Косплей", "creampie": "Крем-пай", "dark-skin": "Темная\xa0кожа", "facial": "На\xa0лицо", "fantasy": "Фэнтези", "filming": "Съемка", "footjob": "Футджоб", "futanari": "Футанари", "gangbang": "Гэнгбэнг", "glasses": "В\xa0очках", "harem": "Гарем", "hd": "HD", "horror": "Ужасы", "incest": "Инцест", "inflation": "Раздувание", "lactation": "Лактация", "small-boobs": "Маленькая\xa0грудь", "maids": "Горничные", "masturbation": "Мастурбация", "milf": "Милфы", "mind-break": "Свести\xa0с\xa0ума", "mind-control": "Контроль\xa0сознания", "monster-girl": "Монстры", "neko": "Неко", "ntr": "НТР", "nurses": "Медсестры", "orgy": "Оргия", "plot": "С\xa0сюжетом", "pov": "От\xa0первого\xa0лица", "pregnant": "Беременные", "public-sex": "Публичный\xa0секс", "rape": "Изнасилование", "reverse-rape": "Обратное\xa0изнасилование", "scat": "Дерьмо", "schoolgirls": "Школьницы", "shota": "Шота", "ero": "Эротика", "swimsuit": "Купальник", "teacher": "Учитель", "tentacles": "Тентакли", "threesome": "Тройничок", "toys": "Игрушки", "tsundere": "Цундере", "ugly-bastard": "Противный\xa0ублюдок", "uncensored": "Без\xa0цензуры", "vanilla": "Классика", "virgin": "Девственность", "watersports": "Золотой\xa0дождь", "x-ray": "X-ray", "yuri": "Юри"};
	const ITEMS_PER_API_REQUEST = 47;
    const STREAM_ENDPOINT_TPL = FLASK_API_BASE + "/streams/{type}/{id}.json";
    const PROXY_FOR_EXTERNAL_URLS = "http://77.91.78.5/proxy/proxy?url=";
    const PLUGIN_SOURCE_KEY = 'h_hub_plugin_source';

    // --- Small shared constants/helpers (no logic changes) ---
    const SKELETON_CARD_COUNT = 6;
    const MIN_APPEND_DELAY_MS = 400;

    function buildStreamsUrlFromCompositeId(compositeId) {
        let itemId = compositeId;
        let streamType = 'hentai';
        if (typeof compositeId === 'string' && compositeId.includes('::')) {
            const parts = compositeId.split('::');
            streamType = parts[0];
            itemId = parts[1];
        }
        return STREAM_ENDPOINT_TPL
            .replace('{type}', streamType)
            .replace('{id}', itemId);
    }

    function getRequestOptionsWithCookie() {
        const options = { dataType: 'json', timeout: 20000 };
        const savedCookie = localStorage.getItem('my_plugin_cookie');
        if (savedCookie) options.headers = { 'X-Custom-Cookie': savedCookie };
        return options;
    }

    function computeCatalogTitle({ isSearchMode, searchQuery, isTagCatalog, currentTagSlug, currentCatalogKey }) {
        if (isSearchMode) {
            return getLangText('search_results_title', CATALOG_TITLES_FALLBACK.search_results_title, { query: searchQuery });
        }
        const titleKeySuffix = isTagCatalog ? ('tag_' + currentTagSlug) : ('cat_' + currentCatalogKey);
        const fallbackText = isTagCatalog ? TAG_SLUG_MAP[currentTagSlug] : (CATALOG_TITLES_FALLBACK[currentCatalogKey] || currentCatalogKey);
        return getLangText(titleKeySuffix, fallbackText);
    }

    // --- Global Language Helper ---
    const getLangText = (lang_key_suffix, fallback_text_or_default, replacements = {}) => {
        const full_lang_key = 'plugin_' + lang_key_suffix;
        let text = Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? Lampa.Lang.translate(full_lang_key) : null;
        if (!text || text === full_lang_key) {
            text = (typeof fallback_text_or_default !== 'undefined') ? fallback_text_or_default : CATALOG_TITLES_FALLBACK[lang_key_suffix];
        }
        if (typeof text === 'undefined') text = lang_key_suffix;
        if (text && typeof text === 'string') {
            for (const key in replacements) {
                if (replacements.hasOwnProperty(key)) {
                     text = text.replace(new RegExp(`{${key}}`, 'g'), replacements[key]);
                }
            }
        }
        return text;
    };

    /**
     * Unified Player Starter to match online.js structure for better metadata handling (SharePlay)
     */
    function startPlayer(stream_details, card_data, card_instance) {
        if (stream_details.url) {
            let video_url = stream_details.url;
            video_url = PROXY_FOR_EXTERNAL_URLS + encodeURIComponent(video_url);

            if (Lampa.Noty) Lampa.Noty.show(getLangText('proxy_loading_notification', CATALOG_TITLES_FALLBACK.proxy_loading_notification), { time: 1500 });

            // Structure similar to online.js toPlayElement and display logic
            const element = {
                title: card_data.name || card_data.title || 'Без названия',
                poster: card_data.poster || '',
                url: video_url,
                id: card_data.id,
                type: card_data.type === "series" ? "tv" : "movie",
                source: PLUGIN_SOURCE_KEY,
                isonline: true, // Flag often used in online.js
                callback: function() {
                    // This callback is triggered by Lampa's player when playback starts/progresses
                    if (card_instance && typeof card_instance.updateIcons === 'function') {
                        card_instance.updateIcons();
                    }
                }
            };

            // Timeline logic
            if (Lampa.Timeline && typeof Lampa.Timeline.view === 'function') {
                element.timeline = Lampa.Timeline.view(element.id);
            }

            // Play
            Lampa.Player.play(element);
            
            // Set Playlist (even if single item, ensures structure matches online.js)
            Lampa.Player.playlist([element]);

            // History
            if (Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                Lampa.Favorite.add('history', element);
            }
            
            // Immediate icon update fallback
            if (card_instance) card_instance.updateIcons();

        } else if (stream_details.externalUrl) {
            let uo = PROXY_FOR_EXTERNAL_URLS + encodeURIComponent(stream_details.externalUrl);
            if (Lampa.Noty) Lampa.Noty.show(getLangText('proxy_loading_notification', CATALOG_TITLES_FALLBACK.proxy_loading_notification), { time: 1500 });
            Lampa.Utils.openLink(uo);
        } else {
            if (Lampa.Noty) Lampa.Noty.show(getLangText('player_stream_error_url', CATALOG_TITLES_FALLBACK.player_stream_error_url));
        }
    }

    // --- PluginCard ---
    function PluginCard(data, userLang) {
        const pr = {id: data.id, name: data.name || 'Без названия', poster: data.poster || './img/img_broken.svg', type_display: data.type === "series" ? "SERIES" : (data.type === "movie" ? "MOVIE" : (data.type ? data.type.toUpperCase() : "MOVIE"))};
        
        const displayTitle = data.name || 'Без названия';
        const displayDescription = data.description || '';
        const item = Lampa.Template.get("LMEShikimori-Card", {img: pr.poster, type: pr.type_display, title: displayTitle, description: displayDescription});

        const updateFavoriteIcons = () => {
            item.find('.lmeshm-card__fav-icons').remove();
            const fc = $('<div class="lmeshm-card__fav-icons"></div>');
            const cdf = {id: data.id, title: data.name, name: data.name, poster: data.poster, year: data.year || '', type: data.type === "series" ? "tv" : "movie", original_name: data.original_name || '', source: PLUGIN_SOURCE_KEY};
            const st = (Lampa.Favorite && typeof Lampa.Favorite.check === 'function' ? Lampa.Favorite.check(cdf) : {}) || {};
            if (st.book) fc.append($('<div>').addClass('card__icon icon--book'));
            if (st.like) fc.append($('<div>').addClass('card__icon icon--like'));
            if (st.wath) fc.append($('<div>').addClass('card__icon icon--wath'));
            if (st.history || (Lampa.Timeline && typeof Lampa.Timeline.watched === 'function' && Lampa.Timeline.watched(cdf))) fc.append($('<div>').addClass('card__icon icon--history'));
            item.find('.LMEShikimori.card__view').append(fc);
        };
        this.updateIcons = updateFavoriteIcons; this.render = function(){return item}; this.destroy = function(){item.remove()}; this.getRawData = function(){return data};
    }

    // --- PlaylistDetailsComponent ---
    function PlaylistDetailsComponent(object) {
        this.activity = object;
        const playlistId = this.activity.params.playlist_id;
        const playlistName = this.activity.params.playlist_name;
        const userLang = Lampa.Storage.field('language'); 
        let network = new Lampa.Reguest();
        let scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        let items_instances = [];
        let displayed_metas_ids = new Set();
        let saved_scroll_position = 0;
        const html = $("<div class='LMEShikimori-module playlist-details-module'></div>");
        const body = $('<div class="LMEShikimori-catalog--list category-full"></div>');
        let last_focused_card_element = null;

        this.fetchPlaylistVideos = function(onSuccess, onError) {
            this.activity.loader(true);
            const playlistDetailsUrl = FLASK_API_BASE + `/catalog/playlists/${playlistId}.json`;
            const requestOptions = getRequestOptionsWithCookie();

            network.native(playlistDetailsUrl, (playlistData) => {
                this.activity.loader(false);
                if (playlistData && playlistData.meta && playlistData.meta.videos) {
                    const videos = playlistData.meta.videos.map(video => ({
                        id: video.id,
                        name: video.title,
                        poster: video.thumbnail,
                        type: "movie",
                        original_name: video.title,
                        source: PLUGIN_SOURCE_KEY
                    }));
                    onSuccess(videos);
                } else {
                    onError(getLangText('empty_category', CATALOG_TITLES_FALLBACK.empty_category, {category: playlistName}));
                }
            }, (errStatus, errData) => {
                this.activity.loader(false);
                console.error(`Plugin: Error fetching playlist videos for ${playlistId}`, errStatus, errData);
                onError(getLangText('error_fetch_data', CATALOG_TITLES_FALLBACK.error_fetch_data));
            }, false, requestOptions);
        };

        this.appendCardsToDOM = function (videosToAppend) {
            if (videosToAppend.length === 0 && items_instances.length === 0) {
                this.empty(getLangText('empty_category', CATALOG_TITLES_FALLBACK.empty_category, {category: playlistName}));
                return;
            }
            const fragment = document.createDocumentFragment();
            const new_card_instances = [];

            videosToAppend.forEach(videoMeta => {
                if (!displayed_metas_ids.has(videoMeta.id)) {
                    const card = new PluginCard(videoMeta, userLang);
                    const card_render = card.render();
                    card_render.addClass('card-fade-in--initial');

                    card_render.on("hover:enter", () => {
                        const videoFlaskData = card.getRawData();
                        const streamsUrl = buildStreamsUrlFromCompositeId(videoFlaskData.id);
                        network.clear();
                        const requestOptions = getRequestOptionsWithCookie();

                        this.activity.loader(true);
                        network.native(streamsUrl, fr => {
                            this.activity.loader(false);
                            if(fr && fr.streams && fr.streams.length > 0) {
                                const pi = fr.streams.map(s => {
                                    let st = s.name || "P";
                                    if(s.title) st += ` - ${s.title}`;
                                    return {title: st, stream_details: s};
                                });
                                Lampa.Select.show({
                                    title: getLangText('player_select_title', CATALOG_TITLES_FALLBACK.player_select_title),
                                    items: pi,
                                    onBack: () => Lampa.Controller.toggle('content'),
                                    onSelect: si => {
                                        // Use startPlayer for consistent playback
                                        startPlayer(si.stream_details, videoFlaskData, card);
                                    }
                                });
                            } else {
                                if(Lampa.Noty) Lampa.Noty.show(getLangText('player_no_streams_found', CATALOG_TITLES_FALLBACK.player_no_streams_found));
                            }
                        }, () => {
                            this.activity.loader(false);
                            if(Lampa.Noty) Lampa.Noty.show(getLangText('player_streams_fetch_error', CATALOG_TITLES_FALLBACK.player_streams_fetch_error));
                        }, false, requestOptions);
                    });

                    card_render.on("hover:focus", () => {
                        last_focused_card_element = card_render[0];
                        scroll.update(last_focused_card_element, true);
                    });

                    card_render.on('hover:long', () => {
                        const oD = card.getRawData();
                        const cdF = {id: oD.id, title: oD.name, name: oD.name, poster: oD.poster, year: oD.year||'', type: 'movie', original_name: oD.original_name||'', source: PLUGIN_SOURCE_KEY};
                        const sT = (Lampa.Favorite&&typeof Lampa.Favorite.check==='function'?Lampa.Favorite.check(cdF):{})||{};
                        let russianTitle = oD.name || '';
                        if (russianTitle.includes(' / ')) {
                            russianTitle = russianTitle.split(' / ')[0];
                        }
                        const searchTitle = russianTitle.replace(/\d+/g, '').trim();
                        const mn = [
                            {
                                title: 'Искать аниме',
                                search_title: searchTitle
                            },
                            { title: getLangText('title_book', CATALOG_TITLES_FALLBACK.title_book), where: 'book', checkbox: true, checked: sT.book },
                            { title: getLangText('title_like', CATALOG_TITLES_FALLBACK.title_like), where: 'like', checkbox: true, checked: sT.like },
                            { title: getLangText('title_wath', CATALOG_TITLES_FALLBACK.title_wath), where: 'wath', checkbox: true, checked: sT.wath },
                            { title: getLangText('menu_history', CATALOG_TITLES_FALLBACK.menu_history), where: 'history', checkbox: true, checked: sT.history }
                        ];
                        Lampa.Select.show({
                            title: getLangText('title_action', CATALOG_TITLES_FALLBACK.title_action), items: mn,
                            onBack: () => Lampa.Controller.toggle('content'),
                            onCheck: i => { if (Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function') Lampa.Favorite.toggle(i.where, cdF); card.updateIcons(); },
                            onSelect: (selected) => {
                                if (selected.search_title) {
                                    Lampa.Activity.push({
                                        component: 'my_plugin_catalog',
                                        title: 'Поиск: ' + selected.search_title,
                                        params: { search_query: selected.search_title }
                                    });
                                } else {
                                    Lampa.Select.close();
                                    Lampa.Controller.toggle('content');
                                }
                            }
                        });
                    });

                    fragment.appendChild(card_render[0]);
                    new_card_instances.push(card);
                    displayed_metas_ids.add(videoMeta.id);
                }
            });

            body.append(fragment);
            items_instances.push(...new_card_instances);

            requestAnimationFrame(() => {
                body.find('.card-fade-in--initial').removeClass('card-fade-in--initial');
            });
            
            setTimeout(() => {
                new_card_instances.forEach(card => card.updateIcons());
            }, 50);

            if (!last_focused_card_element && items_instances.length > 0) {
                const fvc = items_instances.find(ci => $(ci.render()).is(':visible'));
                if (fvc) last_focused_card_element = fvc.render()[0];
            }
        };

        this.build = function () {
            scroll.minus();
            scroll.onWheel = (step) => { if (!Lampa.Controller.own(this)) this.start(); if (step > 0) Navigator.move('down'); else Navigator.move('up'); };
            
            this.fetchPlaylistVideos(
                (videos) => {
                    this.appendCardsToDOM(videos);
                    this.activity.toggle();
                },
                (errorMsg) => {
                    this.empty(errorMsg);
                }
            );
            scroll.append(body); html.append(scroll.render(true));
        };

        this.create = function () {
            this.activity.title = getLangText('playlist_videos_title', CATALOG_TITLES_FALLBACK.playlist_videos_title, { playlist_name: playlistName });
            this.build();
        };

        this.start = function () {
            scroll.render().scrollTop(saved_scroll_position);
            
            if(Lampa.Activity.active() && Lampa.Activity.active().activity !== this.activity) return;

            Lampa.Controller.add("content",{
                toggle:()=>{
                    Lampa.Controller.collectionSet(scroll.render());
                    let fe=false;
                    if(last_focused_card_element && $.contains(document.documentElement,last_focused_card_element) && $(last_focused_card_element).is(':visible')) fe=last_focused_card_element;
                    else if(items_instances.length>0){
                        const fvi=items_instances.find(ci=>{const rc=ci.render();return rc&&$(rc).is(':visible')&&$.contains(body[0],rc[0])});
                        if(fvi){fe=fvi.render()[0];last_focused_card_element=fe;}
                    }
                    Lampa.Controller.collectionFocus(fe,scroll.render())
                },
                left:()=>{if(Navigator.canmove("left"))Navigator.move("left");else Lampa.Controller.toggle("menu")},
                right:()=>Navigator.move("right"),
                up:()=>{if(Navigator.canmove("up"))Navigator.move("up");else Lampa.Controller.toggle("head")},
                down:()=>Navigator.move("down"),
                back:this.back
            });
            Lampa.Controller.toggle("content");
        };

        this.pause = function () {
            saved_scroll_position = scroll.render().scrollTop();
        };
        this.stop = function () {};
        this.render = function () { return html; };
        this.destroy = function () {
            if(network) network.clear(); if(scroll) scroll.destroy(); this.clear(); html.remove();
            items_instances=null;displayed_metas_ids=null;network=null;scroll=null;last_focused_card_element=null;
            saved_scroll_position = 0;
        };
        this.back = () => Lampa.Activity.backward();
        this.empty = function (msg) {
            const e = new Lampa.Empty();
            e.msg(msg || getLangText('empty_category', CATALOG_TITLES_FALLBACK.empty_category, {category: playlistName}));
            html.empty().append(e.render(true));
            this.start = e.start;
            this.activity.loader(false);
            this.activity.toggle();
        };
        this.clear = function() { items_instances.forEach(i=>i.destroy());items_instances=[];displayed_metas_ids.clear();body.empty(); };
    }

    // --- PluginComponent ---
    function PluginComponent(object) {
        this.activity = object;
        const PRELOAD_THRESHOLD = 12;
        const userLang = Lampa.Storage.field('language');
        let network = new Lampa.Reguest();
        let scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        let items_instances = []; let displayed_metas_ids = new Set();
        let current_api_page = 1; let can_load_more = true; let auto_load_attempts = 0;
        let saved_scroll_position = 0;
        const MAX_AUTO_LOAD_ATTEMPTS = 5;
        const html = $("<div class='LMEShikimori-module'></div>");
        const head = $(`<div class='LMEShikimori-head torrent-filter'>
                        <div class='plugin__home simple-button simple-button--filter selector'>${getLangText('home_button_text', CATALOG_TITLES_FALLBACK.home_button_text)}</div>
                        <div class='plugin__filter simple-button simple-button--filter selector'>${getLangText('filter_title', CATALOG_TITLES_FALLBACK.filter_title)}</div>
                        <div class='plugin__search simple-button simple-button--filter selector'>${getLangText('search_input_title', CATALOG_TITLES_FALLBACK.search_input_title)}</div>
                        <div class='plugin__playlists simple-button simple-button--filter selector'>${getLangText('playlists', CATALOG_TITLES_FALLBACK.playlists)}</div>
                        <div class='plugin__cookie simple-button simple-button--filter selector'>Авторизация Cookie</div>
                       </div>`);
        const body = $('<div class="LMEShikimori-catalog--list category-full"></div>');
        let last_focused_card_element = null;
        let searchCache = {};
        this.isSearchMode = !!(this.activity.params && this.activity.params.search_query);
        this.searchQuery = this.isSearchMode ? this.activity.params.search_query : '';
        this.currentCatalogKey = this.isSearchMode ? 'search' : ((this.activity.params && this.activity.params.catalog_key) ? this.activity.params.catalog_key : 'new-releases');
        let currentCatalogConfig = API_CATALOG_CONFIG[this.currentCatalogKey];
        let isTagCatalog = false; let currentTagSlug = '';
        if (!this.isSearchMode && this.currentCatalogKey.startsWith('tag__')) {
            isTagCatalog = true; currentTagSlug = this.currentCatalogKey.substring(5);
            currentCatalogConfig = { paginated: true, title_key_suffix: 'tag_' + currentTagSlug };
        } else if (!this.isSearchMode && !currentCatalogConfig) {
             this.currentCatalogKey = 'new-releases'; currentCatalogConfig = API_CATALOG_CONFIG['new-releases'];
        }

        this.fetchData = function (page_to_fetch, onSuccess, onError, isAutoRetry = false) {
            if (!isAutoRetry) { auto_load_attempts = 0; }
            
            if (page_to_fetch === 1) {
                this.activity.loader(true);
            }

            if (this.isSearchMode && page_to_fetch === 1 && searchCache[this.searchQuery]) {
                if (onSuccess) {
                    onSuccess(searchCache[this.searchQuery], searchCache[this.searchQuery].length, false);
                }
                this.activity.loader(false);
                return;
            }

            const isRandomCategory = this.currentCatalogKey === 'random';
            const requestCount = isRandomCategory ? 2 : 1;
            const requests = [];

            for (let i = 0; i < requestCount; i++) {
                let urlToFetch;

                if (this.isSearchMode) {
                    urlToFetch = FLASK_API_BASE + API_SEARCH_ENDPOINT + `?q=${encodeURIComponent(this.searchQuery)}&page=${page_to_fetch}`;
                } else if (isTagCatalog) {
                    urlToFetch = FLASK_API_BASE + `/catalog/tag/${currentTagSlug}?page=${page_to_fetch}`;
                } else if (this.currentCatalogKey === 'playlists') {
                    urlToFetch = FLASK_API_BASE + API_CATALOG_CONFIG['playlists'].path + `?page=${page_to_fetch}`;
                } else if (currentCatalogConfig && currentCatalogConfig.path) {
                    urlToFetch = FLASK_API_BASE + currentCatalogConfig.path;
                    if (currentCatalogConfig.paginated && !isRandomCategory) {
                        urlToFetch += `?page=${page_to_fetch}`;
                    }
                } else {
                    continue;
                }

                if (!this.isSearchMode && !isTagCatalog && this.currentCatalogKey !== 'playlists' && currentCatalogConfig && !currentCatalogConfig.paginated && page_to_fetch > 1) {
                    continue;
                }

                let fetchDataRequestOptions = { dataType: 'json', timeout: 20000 };
                const savedCookie = localStorage.getItem('my_plugin_cookie');
                if (savedCookie) {
                    fetchDataRequestOptions.headers = { 'X-Custom-Cookie': savedCookie };
                }

                const requestPromise = new Promise((resolve, reject) => {
                    const singleRequestNetwork = new Lampa.Reguest();
                    singleRequestNetwork.native(urlToFetch,
                        (responseData) => resolve(responseData.metas || []), 
                        (errStatus, errData) => {
                            console.error(`Plugin: Error fetching data from ${urlToFetch}`, errStatus, errData);
                            resolve([]); 
                        }, 
                        false, 
                        fetchDataRequestOptions
                    );
                });
                requests.push(requestPromise);
            }

            if (requests.length === 0) {
                if (page_to_fetch === 1) this.activity.loader(false);
                can_load_more = false;
                if (onSuccess) onSuccess([], 0);
                return;
            }

            Promise.all(requests).then(results => {
                if (page_to_fetch === 1) this.activity.loader(false);
                
                const combinedMetasRaw = [].concat(...results);
                const uniqueNewMetas = [];

                combinedMetasRaw.forEach(meta => {
                    if (meta && meta.id && !displayed_metas_ids.has(meta.id)) {
                        if (meta.type !== "series" || meta.id.startsWith('pl_')) {
                            uniqueNewMetas.push(meta);
                            displayed_metas_ids.add(meta.id);
                        }
                    }
                });

                if (this.isSearchMode && page_to_fetch === 1) {
                    searchCache[this.searchQuery] = uniqueNewMetas;
                }

                const isEmptyAfterFilter = combinedMetasRaw.length > 0 && uniqueNewMetas.length === 0;
                if (onSuccess) onSuccess(uniqueNewMetas, combinedMetasRaw.length, isEmptyAfterFilter);

            }).catch(error => {
                if (page_to_fetch === 1) this.activity.loader(false);
                can_load_more = false;
                console.error('Plugin: Error in Promise.all for fetching data', error);
                if (onError) onError(getLangText('error_fetch_data', CATALOG_TITLES_FALLBACK.error_fetch_data));
            });
        };
        
        this.appendCardsToDOM = function (metasToAppend, originalApiBatchLength, isEmptyAfterFilter = false) {
            body.find('.skeleton-loader-container').remove();

            // --- ИСПРАВЛЕННЫЙ БЛОК ЛОГИКИ ПАГИНАЦИИ ---
            const isPaginating = this.isSearchMode || isTagCatalog || (currentCatalogConfig && currentCatalogConfig.paginated) || this.currentCatalogKey === 'playlists';
            
            if (this.currentCatalogKey === 'random') {
                can_load_more = true;
            } else if (isPaginating) {
                if (this.currentCatalogKey === 'playlists') {
                    // Для плейлистов используется более безопасная логика, так как их размер страницы отличается.
                    // Подгрузка остановится только когда сервер вернет пустой список.
                    can_load_more = originalApiBatchLength > 0;
                } else {
                    // Для остальных категорий используется стандартная, более эффективная логика,
                    // так как мы знаем размер их страницы (ITEMS_PER_API_REQUEST).
                    if (originalApiBatchLength < ITEMS_PER_API_REQUEST) {
                        can_load_more = false;
                    }
                }
            } else {
                // Для непагинируемых категорий.
                can_load_more = false;
            }
            // --- КОНЕЦ ИСПРАВЛЕННОГО БЛОКА ---

            if (isEmptyAfterFilter && can_load_more && auto_load_attempts < MAX_AUTO_LOAD_ATTEMPTS) {
                auto_load_attempts++; this.loadNextPage(true); return;
            } else if (metasToAppend.length === 0 && !can_load_more && items_instances.length === 0) {
                const catTitle = computeCatalogTitle({
                    isSearchMode: this.isSearchMode,
                    searchQuery: this.searchQuery,
                    isTagCatalog,
                    currentTagSlug,
                    currentCatalogKey: this.currentCatalogKey
                });
                this.empty(getLangText('empty_category', CATALOG_TITLES_FALLBACK.empty_category, {category: catTitle}));
                return;
            }
            if (metasToAppend.length > 0) auto_load_attempts = 0;

            const fragment = document.createDocumentFragment();
            const new_card_instances = [];

            metasToAppend.forEach(meta => {
                const card = new PluginCard(meta, userLang);
                const card_render = card.render();
                card_render.addClass('card-fade-in--initial');

                const handleCardEnter = () => {
                    last_focused_card_element = card_render[0];

                    const cardFlaskData = card.getRawData();
                    network.clear();
                    const requestOptions = getRequestOptionsWithCookie();

                    const isPlaylistCard = cardFlaskData.id && cardFlaskData.id.startsWith('pl_') && cardFlaskData.type === 'series';

                    if (isPlaylistCard) {
                        Lampa.Activity.push({
                            component: 'my_plugin_playlist_details',
                            title: cardFlaskData.name,
                            params: {
                                playlist_id: cardFlaskData.id,
                                playlist_name: cardFlaskData.name
                            }
                        });
                    } else {
                        const streamsUrl = buildStreamsUrlFromCompositeId(cardFlaskData.id);
                        this.activity.loader(true);
                        network.native(streamsUrl, fr => {
                            this.activity.loader(false);
                            if(fr && fr.streams && fr.streams.length > 0) {
                                const pi = fr.streams.map(s => {
                                    let st = s.name || "P";
                                    if(s.title) st += ` - ${s.title}`;
                                    return {title: st, stream_details: s};
                                });
                                Lampa.Select.show({
                                    title: getLangText('player_select_title', CATALOG_TITLES_FALLBACK.player_select_title),
                                    items: pi,
                                    onBack: () => Lampa.Controller.toggle('content'),
                                    onSelect: si => {
                                        // Use startPlayer for consistent playback
                                        startPlayer(si.stream_details, cardFlaskData, card);
                                    }
                                });
                            } else {
                                if(Lampa.Noty) Lampa.Noty.show(getLangText('player_no_streams_found', CATALOG_TITLES_FALLBACK.player_no_streams_found));
                            }
                        }, () => {
                            this.activity.loader(false);
                            if(Lampa.Noty) Lampa.Noty.show(getLangText('player_streams_fetch_error', CATALOG_TITLES_FALLBACK.player_streams_fetch_error));
                        }, false, requestOptions);
                    }
                };
                card_render.on("hover:enter", handleCardEnter);

                card_render.on("hover:focus", () => {
                    last_focused_card_element = card_render[0];
                    scroll.update(last_focused_card_element, true);
                    const cardIndex = items_instances.findIndex(inst => inst === card);
                    if (cardIndex > -1 && can_load_more && items_instances.length - cardIndex <= PRELOAD_THRESHOLD) {
                        this.loadNextPage(false);
                    }
                });

                card_render.on('hover:long', () => {
                    const oD = card.getRawData();
                    const cdF = {id: oD.id, title: oD.name, name: oD.name, poster: oD.poster, year: oD.year||'', type: oD.type==='series'?'tv':'movie', original_name: oD.original_name||'', source: PLUGIN_SOURCE_KEY};
                    const sT = (Lampa.Favorite&&typeof Lampa.Favorite.check==='function'?Lampa.Favorite.check(cdF):{})||{};
                    let russianTitle = oD.name || '';
                    if (russianTitle.includes(' / ')) {
                        russianTitle = russianTitle.split(' / ')[0];
                    }
                    const searchTitle = russianTitle.replace(/\d+/g, '').trim();
                    const mn = [
                        {
                            title: 'Искать аниме',
                            search_title: searchTitle
                        },
                        { title: getLangText('title_book', CATALOG_TITLES_FALLBACK.title_book), where: 'book', checkbox: true, checked: sT.book },
                        { title: getLangText('title_like', CATALOG_TITLES_FALLBACK.title_like), where: 'like', checkbox: true, checked: sT.like },
                        { title: getLangText('title_wath', CATALOG_TITLES_FALLBACK.title_wath), where: 'wath', checkbox: true, checked: sT.wath },
                        { title: getLangText('menu_history', CATALOG_TITLES_FALLBACK.menu_history), where: 'history', checkbox: true, checked: sT.history }
                    ];
                    Lampa.Select.show({
                        title: getLangText('title_action', CATALOG_TITLES_FALLBACK.title_action), items: mn,
                        onBack: () => Lampa.Controller.toggle('content'),
                        onCheck: i => { if (Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function') Lampa.Favorite.toggle(i.where, cdF); card.updateIcons(); },
                        onSelect: (selected) => {
                            if (selected.search_title) {
                                Lampa.Activity.push({
                                    component: 'my_plugin_catalog',
                                    title: 'Поиск: ' + selected.search_title,
                                    params: {
                                        search_query: selected.search_title
                                    }
                                });
                            } else {
                                Lampa.Select.close();
                                Lampa.Controller.toggle('content');
                            }
                        }
                    });
                });
                
                fragment.appendChild(card_render[0]);
                new_card_instances.push(card);
            });

            body.append(fragment);
            items_instances.push(...new_card_instances);

            requestAnimationFrame(() => {
                body.find('.card-fade-in--initial').removeClass('card-fade-in--initial');
            });
            
            setTimeout(() => {
                new_card_instances.forEach(card => card.updateIcons());
            }, 50);

            if(!last_focused_card_element&&items_instances.length>0){const fvc=items_instances.find(ci=>$(ci.render()).is(':visible'));if(fvc)last_focused_card_element=fvc.render()[0]}
        };

        this.loadNextPage = function(isAutoRetry = false) {
            if (!can_load_more || body.find('.skeleton-loader-container').length > 0) return;
            
            const skeleton_container = $('<div class="skeleton-loader-container"></div>');
            for (let i = 0; i < SKELETON_CARD_COUNT; i++) {
                skeleton_container.append('<div class="card-skeleton"></div>');
            }
            body.append(skeleton_container);
            scroll.update(skeleton_container.find('.card-skeleton:first-child')[0], true);

            if (!isAutoRetry) auto_load_attempts = 0;
            current_api_page++;
            
            const fetchDataPromise = new Promise((resolve, reject) => {
                this.fetchData(
                    current_api_page,
                    (newMetas, originalLength, isEmptyAfterFilter) => {
                        resolve({ newMetas, originalLength, isEmptyAfterFilter });
                    },
                    reject,
                    isAutoRetry
                );
            });

            const minDelayPromise = new Promise(resolve => setTimeout(resolve, MIN_APPEND_DELAY_MS));

            Promise.all([fetchDataPromise, minDelayPromise])
                .then(([dataResult]) => {
                    this.appendCardsToDOM(dataResult.newMetas, dataResult.originalLength, dataResult.isEmptyAfterFilter);
                    this.activity.toggle();
                })
                .catch(() => {
                    body.find('.skeleton-loader-container').remove();
                    can_load_more = false;
                });
        };

        this.build = function () {
            scroll.minus();
            scroll.onWheel = (step) => { if (!Lampa.Controller.own(this)) this.start(); if (step > 0) Navigator.move('down'); else Navigator.move('up'); };
            
            this.headeraction();
            this.fetchData(1,
                (initialMetas, originalLength, isEmptyAfterFilterOnInit) => {
                    if (initialMetas.length > 0 || items_instances.length > 0) {
                        this.appendCardsToDOM(initialMetas, originalLength, isEmptyAfterFilterOnInit);
                        this.activity.toggle();
                    } else if (isEmptyAfterFilterOnInit && can_load_more) {
                        auto_load_attempts++; this.loadNextPage(true);
                    } else {
                        const catTitle = computeCatalogTitle({
                            isSearchMode: this.isSearchMode,
                            searchQuery: this.searchQuery,
                            isTagCatalog,
                            currentTagSlug,
                            currentCatalogKey: this.currentCatalogKey
                        });
                        this.empty(getLangText('empty_category', CATALOG_TITLES_FALLBACK.empty_category, {category: catTitle}));
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
            const playlistsButton = head.find('.plugin__playlists');
            const cookieButton = head.find('.plugin__cookie');

            homeButton.on('hover:enter', () => {
                const mainDefaultKey = Object.keys(API_CATALOG_CONFIG).find(k => API_CATALOG_CONFIG[k].default_main) || 'new-releases';
                Lampa.Activity.push({component: 'my_plugin_catalog', title: getLangText('cat_' + mainDefaultKey, CATALOG_TITLES_FALLBACK[mainDefaultKey]), params: { catalog_key: mainDefaultKey }});
            });

            filterButton.on('hover:enter', () => {
                const filterMenu = [];
                Object.keys(API_CATALOG_CONFIG).forEach(catKey => {
                    if (catKey !== 'playlists') {
                        filterMenu.push({title: getLangText('cat_' + catKey, CATALOG_TITLES_FALLBACK[catKey] || catKey), catalog_key: catKey, is_tag_menu: false});
                    }
                });
                filterMenu.push({title: getLangText('tags', CATALOG_TITLES_FALLBACK.tags), is_tag_menu: true});
                Lampa.Select.show({title: getLangText('filter_title', CATALOG_TITLES_FALLBACK.filter_title), items: filterMenu, onBack: () => { Lampa.Controller.toggle('content'); },
                    onSelect: (selectedItem) => {
                        if (selectedItem.is_tag_menu) {
                            const tagMenuItems = Object.keys(TAG_SLUG_MAP).map(tagSlug => ({title: getLangText('tag_' + tagSlug, TAG_SLUG_MAP[tagSlug]), catalog_key: 'tag__' + tagSlug }));
                            Lampa.Select.show({title: getLangText('tags', CATALOG_TITLES_FALLBACK.tags), items: tagMenuItems, onBack: () => filterButton.trigger('hover:enter'),
                                onSelect: (selectedTag) => {Lampa.Activity.push({ component: 'my_plugin_catalog', title: selectedTag.title, params: { catalog_key: selectedTag.catalog_key }});}
                            });
                        } else {Lampa.Activity.push({ component: 'my_plugin_catalog', title: selectedItem.title, params: { catalog_key: selectedItem.catalog_key }});}
                    }
                });
            });

            searchButton.on('hover:enter', () => {
                Lampa.Input.edit({ title: getLangText('search_input_title', CATALOG_TITLES_FALLBACK.search_input_title), value: this.isSearchMode ? this.searchQuery : '', free: true, nosave: true },
                (search_text_raw) => {
                    const normalized = (typeof search_text_raw === 'string' ? search_text_raw : (search_text_raw && search_text_raw.value) || '').trim();
                    if (normalized.length > 0) {
                        const title = getLangText('search_results_title', CATALOG_TITLES_FALLBACK.search_results_title, { query: normalized });
                        setTimeout(() => {
                            Lampa.Activity.push({ component: 'my_plugin_catalog', title: title, params: { search_query: normalized } });
                        }, 10);
                    } else {
                        Lampa.Controller.toggle('content');
                    }
                });
            });

            playlistsButton.on('hover:enter', () => {
                Lampa.Activity.push({
                    component: 'my_plugin_catalog',
                    title: getLangText('playlists', CATALOG_TITLES_FALLBACK.playlists),
                    params: { catalog_key: 'playlists' }
                });
            });

            cookieButton.on('hover:enter', () => {
                const currentCookie = localStorage.getItem('my_plugin_cookie') || '';
                Lampa.Input.edit({title: getLangText('cookie_set_title', CATALOG_TITLES_FALLBACK.cookie_set_title), value: currentCookie, free: true, nosave: true, desc: getLangText('cookie_set_descr', CATALOG_TITLES_FALLBACK.cookie_set_descr)},
                (new_cookie_value) => {
                    if (typeof new_cookie_value === 'string') {
                        if (new_cookie_value.trim() === '') {localStorage.removeItem('my_plugin_cookie'); Lampa.Noty.show(getLangText('cookie_removed', CATALOG_TITLES_FALLBACK.cookie_removed));}
                        else {localStorage.setItem('my_plugin_cookie', new_cookie_value); Lampa.Noty.show(getLangText('cookie_saved', CATALOG_TITLES_FALLBACK.cookie_saved));}
                    } Lampa.Controller.toggle('content');
                });
            });
        };
        this.clear = function() { items_instances.forEach(i=>i.destroy());items_instances=[];displayed_metas_ids.clear();body.empty();current_api_page=1;can_load_more=true; auto_load_attempts = 0;};
        this.empty = function (msg) { const e=new Lampa.Empty();e.msg(msg||getLangText('empty_catalog', CATALOG_TITLES_FALLBACK.empty_catalog));html.empty().append(e.render(true));this.start=e.start;this.activity.loader(false);this.activity.toggle();};
        this.create = function () {
            let initialTitle;
            if (this.isSearchMode) {
                initialTitle = computeCatalogTitle({
                    isSearchMode: true,
                    searchQuery: this.searchQuery,
                    isTagCatalog,
                    currentTagSlug,
                    currentCatalogKey: this.currentCatalogKey
                });
            } else {
                initialTitle = computeCatalogTitle({
                    isSearchMode: false,
                    searchQuery: '',
                    isTagCatalog,
                    currentTagSlug,
                    currentCatalogKey: this.currentCatalogKey
                });
            }
            if(this.activity && this.activity.activity) {this.activity.activity.title = initialTitle;}
            else if (this.activity) {this.activity.title = initialTitle;}
            this.build();
        };
        this.start = function () {
            scroll.render().scrollTop(saved_scroll_position);
            
            if(Lampa.Activity.active() && Lampa.Activity.active().activity !== this.activity) return;
            const currentActivityTitle = computeCatalogTitle({
                isSearchMode: this.isSearchMode,
                searchQuery: this.searchQuery,
                isTagCatalog,
                currentTagSlug,
                currentCatalogKey: this.currentCatalogKey
            });
            if(Lampa.Activity.active()) Lampa.Activity.active().title = currentActivityTitle;
            Lampa.Controller.add("content",{toggle:()=>{Lampa.Controller.collectionSet(scroll.render());let fe=false;if(last_focused_card_element&&$.contains(document.documentElement,last_focused_card_element)&&$(last_focused_card_element).is(':visible'))fe=last_focused_card_element;else if(items_instances.length>0){const fvi=items_instances.find(ci=>{const rc=ci.render();return rc&&$(rc).is(':visible')&&$.contains(body[0],rc[0])});if(fvi){fe=fvi.render()[0];last_focused_card_element=fe;}}Lampa.Controller.collectionFocus(fe,scroll.render())},left:()=>{if(Navigator.canmove("left"))Navigator.move("left");else Lampa.Controller.toggle("menu")},right:()=>Navigator.move("right"),up:()=>{if(Navigator.canmove("up"))Navigator.move("up");else Lampa.Controller.toggle("head")},down:()=>Navigator.move("down"),back:this.back});Lampa.Controller.toggle("content");
        };
        this.pause = function () {
            saved_scroll_position = scroll.render().scrollTop();
        };
        this.stop = function () {};
        this.render = function () { return html; };
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
                const deps = ["Template", "Component", "Activity", "Controller", "Scroll", "Reguest", "Favorite", "Timeline", "Noty", "Select", "Lang", "Player", "Empty", "Utils", "Listener"];
                deps.forEach(dep => { if (!Lampa[dep]) criticalMissing.push("Lampa." + dep); });
            }
            if (criticalMissing.length > 0) {console.error('Plugin: Critical Lampa dependencies missing!', criticalMissing); if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка плагина: Отсутствуют компоненты Lampa: ' + criticalMissing.join(', ')); return;}
            window.plugin_mycustom_catalog_ready = true;

            Lampa.Template.add('LMEShikimoriStyle', "<style>\n .LMEShikimori-catalog--list.category-full{-webkit-box-pack:justify !important;-webkit-justify-content:space-between !important;-ms-flex-pack:justify !important;justify-content:space-between !important}.LMEShikimori-head.torrent-filter{margin-left:1.5em; display: flex; gap: 1em;}.LMEShikimori.card__type{background:#ff4242;color:#fff} .lmeshm-card__fav-icons{position:absolute;top:0.3em;right:0.3em;display:flex;flex-direction:column;gap:0.2em;z-index:5;} .lmeshm-card__fav-icons .card__icon{background-color:rgba(0,0,0,0.5);border-radius:0.2em;padding:0.1em;} .LMEShikimori.card { transition: opacity 0.4s ease-out, transform 0.4s ease-out; } .card-fade-in--initial { opacity: 0; transform: translateY(20px); } .skeleton-loader-container { display: contents; } .card-skeleton { background: rgba(255, 255, 255, 0.1); border-radius: 0.3em; height: 180px; position: relative; overflow: hidden; } .card-skeleton::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent); animation: shimmer 1.5s infinite; } @keyframes shimmer { 100% { left: 100%; } } @media (max-width: 768px){.LMEShikimori-catalog--list{padding: 0 0.5em;}.LMEShikimori.card, .card-skeleton{width:48%;margin-bottom:1em;}.LMEShikimori.card__title{font-size:0.9em;}.LMEShikimori-head.torrent-filter{flex-wrap:wrap;margin-left:0.5em;}} @media (max-width: 480px){.LMEShikimori.card, .card-skeleton{width:47%;}} .lampa-layer{transition:opacity .3s ease,backdrop-filter .3s ease,-webkit-backdrop-filter .3s ease}.lampa-layer--show{opacity:1;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}.lampa-layer:not(.lampa-layer--show){opacity:0;backdrop-filter:blur(0px);-webkit-backdrop-filter:blur(0px)} \n /* Plugin-specific styles */ \n .LMEShikimori.card__description { font-size: 0.75em; color: rgba(255, 255, 255, 0.6); padding: 0 0.5em 0.5em 0.5em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; position: relative; z-index: 1; } \n</style>");
            Lampa.Template.add("LMEShikimori-Card", `
            <div class="LMEShikimori card selector layer--visible layer--render">
                <div class="LMEShikimori card__view">
                    <img src="{img}" class="LMEShikimori card__img" />
                </div>
                <div class="LMEShikimori card__title">{title}</div>
                <div class="LMEShikimori card__description">{description}</div>
            </div>`);
            if ($('style[data-lmeshikimori-styles]').length === 0) { const s=$(Lampa.Template.get('LMEShikimoriStyle',{},true));s.attr('data-lmeshikimori-styles','true');$('body').append(s); }

            let lang_packs = {};
            Object.assign(lang_packs, {
                plugin_all_main_title: CATALOG_TITLES_FALLBACK.all_main_title,
                plugin_filter_title: CATALOG_TITLES_FALLBACK.filter_title,
                plugin_tags: CATALOG_TITLES_FALLBACK.tags,
                plugin_playlists: CATALOG_TITLES_FALLBACK.playlists,
                plugin_playlist_videos_title: CATALOG_TITLES_FALLBACK.playlist_videos_title,
                plugin_search_input_title: CATALOG_TITLES_FALLBACK.search_input_title,
                plugin_search_results_title: CATALOG_TITLES_FALLBACK.search_results_title,
                plugin_cat_new_releases: CATALOG_TITLES_FALLBACK['new-releases'],
                plugin_cat_hottest: CATALOG_TITLES_FALLBACK.hottest,
                plugin_cat_random: CATALOG_TITLES_FALLBACK.random,
                plugin_cat_playlists: CATALOG_TITLES_FALLBACK.playlists,
                plugin_empty_catalog: CATALOG_TITLES_FALLBACK.empty_catalog,
                plugin_empty_category: CATALOG_TITLES_FALLBACK.empty_category,
                plugin_error_fetch_data: CATALOG_TITLES_FALLBACK.error_fetch_data,
                plugin_player_select_title: CATALOG_TITLES_FALLBACK.player_select_title,
                plugin_player_no_streams_found: CATALOG_TITLES_FALLBACK.player_no_streams_found,
                plugin_player_streams_fetch_error: CATALOG_TITLES_FALLBACK.player_streams_fetch_error,
                plugin_player_stream_error_url: CATALOG_TITLES_FALLBACK.player_stream_error_url,
                plugin_proxy_loading_notification: CATALOG_TITLES_FALLBACK.proxy_loading_notification,
                plugin_cookie_set_title: CATALOG_TITLES_FALLBACK.cookie_set_title,
                plugin_cookie_set_descr: CATALOG_TITLES_FALLBACK.cookie_set_descr,
                plugin_cookie_saved: CATALOG_TITLES_FALLBACK.cookie_saved,
                plugin_cookie_removed: CATALOG_TITLES_FALLBACK.cookie_removed,
                plugin_title_book: CATALOG_TITLES_FALLBACK.title_book,
                plugin_title_like: CATALOG_TITLES_FALLBACK.title_like,
                plugin_title_wath: CATALOG_TITLES_FALLBACK.title_wath,
                plugin_menu_history: CATALOG_TITLES_FALLBACK.menu_history,
                plugin_title_action: CATALOG_TITLES_FALLBACK.title_action,
                plugin_home_button_text: CATALOG_TITLES_FALLBACK.home_button_text
            });
            Object.keys(TAG_SLUG_MAP).forEach(slug => {
                lang_packs['plugin_tag_' + slug] = TAG_SLUG_MAP[slug];
            });
            if (Lampa.Lang?.add) { Lampa.Lang.add(lang_packs); }

            if (Lampa.Activity && typeof Lampa.Activity.push === 'function') {
                const originalLampaActivityPush = Lampa.Activity.push;
                Lampa.Activity.push = function(new_activity_params) {
                    const isOurPluginComponentPush = new_activity_params.component && (new_activity_params.component === 'my_plugin_catalog' || new_activity_params.component === 'my_plugin_playlist_details');
                    
                    let isOurCardForPlayback = false;
                    let cardDataForPlugin = null;

                    if (new_activity_params && new_activity_params.params && new_activity_params.params.source === PLUGIN_SOURCE_KEY) {
                        isOurCardForPlayback = true;
                        cardDataForPlugin = new_activity_params.params;
                    } else if (new_activity_params && new_activity_params.params && new_activity_params.params.card && new_activity_params.params.card.source === PLUGIN_SOURCE_KEY) {
                        isOurCardForPlayback = true;
                        cardDataForPlugin = new_activity_params.params.card;
                    } else if (new_activity_params && new_activity_params.card && new_activity_params.card.source === PLUGIN_SOURCE_KEY) {
                        isOurCardForPlayback = true;
                        cardDataForPlugin = new_activity_params.card;
                    } else if (new_activity_params && new_activity_params.source === PLUGIN_SOURCE_KEY) {
                         isOurCardForPlayback = true;
                         cardDataForPlugin = new_activity_params;
                    }

                    if (isOurPluginComponentPush) {
                        return originalLampaActivityPush.apply(Lampa.Activity, arguments);
                    }

                    if (isOurCardForPlayback && cardDataForPlugin) {
                        const currentActivity = Lampa.Activity.active();
                        if (currentActivity && typeof currentActivity.loader === 'function') {
                            currentActivity.loader(true);
                        }
                        let network_custom = new Lampa.Reguest();
                        const requestOptions = getRequestOptionsWithCookie();
                        
                        const streamsUrl = buildStreamsUrlFromCompositeId(cardDataForPlugin.id);

                        network_custom.native(streamsUrl, (fr) => {
                            if (currentActivity && typeof currentActivity.loader === 'function') {
                                currentActivity.loader(false);
                            }
                            if (fr && fr.streams && fr.streams.length > 0) {
                                const stream_items = fr.streams.map(s => ({ title: (s.name || "P") + (s.title ? ` - ${s.title}` : ''), stream_details: s }));
                                
                                Lampa.Select.show({
                                    title: getLangText('player_select_title', CATALOG_TITLES_FALLBACK.player_select_title),
                                    items: stream_items,
                                    onBack: () => {
                                        Lampa.Controller.toggle('content'); 
                                    },
                                    onSelect: (selected_stream_item) => {
                                        // Use startPlayer for consistent playback
                                        startPlayer(selected_stream_item.stream_details, cardDataForPlugin, null);
                                    }
                                });
                            } else {
                                Lampa.Noty.show(getLangText('player_no_streams_found', CATALOG_TITLES_FALLBACK.player_no_streams_found));
                            }
                        }, (es, ed) => {
                            if (currentActivity && typeof currentActivity.loader === 'function') {
                                currentActivity.loader(false);
                            }
                            console.error("Plugin (Activity.push intercept): Error fetching streams", es, ed);
                            Lampa.Noty.show(getLangText('player_streams_fetch_error', CATALOG_TITLES_FALLBACK.player_streams_fetch_error));
                        }, false, requestOptions);
                        return;
                    }
                    return originalLampaActivityPush.apply(Lampa.Activity, arguments);
                };
            } else {
                console.error("Plugin: Lampa.Activity.push is not available for overriding!");
                if(Lampa.Noty) Lampa.Noty.show('Ошибка плагина: Lampa.Activity.push отсутствует.');
            }
            
            Lampa.Component.add('my_plugin_catalog', PluginComponent);
            Lampa.Component.add('my_plugin_playlist_details', PlaylistDetailsComponent);
            addMenuItem();
        }

        function addMenuItem() {
            const componentName = 'my_plugin_catalog';
            if ($(`.menu__list .menu__item[data-action="${componentName}"]`).length > 0) { return; }
            const menuItemText = getLangText('all_main_title', CATALOG_TITLES_FALLBACK.all_main_title);
            const menu_item_html = $(`<li class="menu__item selector" data-action="${componentName}">
                <div class="menu__ico">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                </div> <div class="menu__text">${menuItemText}</div></li>`);
            menu_item_html.on('hover:enter', () => {
                const mainDefaultKey = Object.keys(API_CATALOG_CONFIG).find(k => API_CATALOG_CONFIG[k].default_main) || 'new-releases';
                Lampa.Activity.push({ component: componentName, title: menuItemText, params: { catalog_key: mainDefaultKey } });
            });
            const menuList = $('.menu .menu__list');
            if (menuList.length > 0) menuList.eq(0).append(menu_item_html);
            else { $('.menu').append($('<ul class="menu__list"></ul>').append(menu_item_html)); console.warn("Plugin: Could not find .menu__list, appended to .menu directly.");}
        }

        if (window.appready) { initLampaDeps(); }
        else if (Lampa.Listener?.follow) { Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initLampaDeps(); }); }
        else { setTimeout(initLampaDeps, 1000); }
    }
    startPlugin();
})();
