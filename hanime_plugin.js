(function () {
    'use strict';

    function HanimeCard(d, cr) {
        const pr = {
            id: d.id, title: d.name || d.title || 'Без названия', poster_path: d.poster || d.img,
            vote_average: d.vote_average || d.vote || null, quality: d.quality || d.release_quality || null,
            release_year: ('' + (d.year || d.release_date || '')).slice(0, 4),
            type: d.first_air_date ? 'tv' : 'movie', original_name: d.original_name,
            background: d.background, runtime: d.runtime
        };
        const ce = $(Lampa.Template.get('hanime-card', { img: pr.poster_path, title: pr.title }));
        let cardDom = null;
        this.parentRowScroll = null; // Will be set by HanimeComponent

        this.addicon = (name) => {
            const ic = ce.find('.card__icons-inner');
            if (ic.length) ic.append($('<div>').addClass('card__icon icon--' + name));
        };

        this.addDetails = () => {
            const ve = ce.find('.card__view'); if (!ve.length) return;
            let el, val;

            val = pr.vote_average > 0 ? (+pr.vote_average).toFixed(1) : null;
            el = ce.find('.card__vote');
            if (el.length) { val ? el.text(val) : el.empty(); }
            else if (val) { ve.append($('<div class="card__vote"></div>').text(val)); }

            el = ce.find('.card__quality div');
            if (el.length) { pr.quality ? el.text(pr.quality) : el.empty(); }
            else if (pr.quality) { ve.append($('<div class="card__quality"><div></div></div>').find('div').text(pr.quality).end());}

            el = ce.find('.card__type');
            if (el.length) { pr.type ? el.text(pr.type.toUpperCase()) : el.empty(); }
            else if (pr.type) { ve.append($('<div class="card__type"></div>').text(pr.type.toUpperCase()));}

            const year = pr.release_year;
            el = ce.find('.card__age');
            if (el.length) { (year && year !== '0000') ? el.text(year).show() : el.hide(); }
            else if (year && year !== '0000') {
                const newAgeEl = $('<div class="card__age"></div>').text(year);
                const titleEl = ce.find('.card__title');
                titleEl.length ? titleEl.after(newAgeEl) : ce.append(newAgeEl);
            }
        };

        this.updateFavoriteIcons = () => {
            ce.find('.card__icons-inner').empty(); ce.find('.card__marker').remove();
            const st = Lampa.Favorite?.check?.(pr) || {};
            if (st.book) this.addicon('book'); if (st.like) this.addicon('like');
            if (st.wath) this.addicon('wath'); if (st.history || Lampa.Timeline?.watched?.(pr)) this.addicon('history');

            const marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];
            const activeMarker = marks.find(m => st[m]);
            if (activeMarker) {
                let markerEl = ce.find('.card__marker');
                if (!markerEl.length) { markerEl = $('<div class="card__marker"><span></span></div>'); ce.find('.card__view').append(markerEl); }
                markerEl.find('span').text(Lampa.Lang?.translate?.('title_' + activeMarker) || activeMarker);
                markerEl.removeClass(marks.map(m => 'card__marker--' + m).join(' ')).addClass('card__marker--' + activeMarker);
            }
        };

        this.onVisible = () => {
            const img = ce.find('.card__img'); const src = pr.poster_path;
            if (img.length && src && (!img.attr('src') || img.attr('src').includes('img_load.svg'))) {
                const imgNode = img[0];
                const onImgLoad = () => { ce.addClass('card--loaded'); if (Lampa.ImageCache) Lampa.ImageCache.write(imgNode, imgNode.src); };
                const onImgError = () => { imgNode.src = './img/img_broken.svg'; Lampa.Tmdb?.broken?.(); };
                if (Lampa.ImageCache && Lampa.ImageCache.read(imgNode, src)) { ce.addClass('card--loaded'); }
                else { imgNode.onload = onImgLoad; imgNode.onerror = onImgError; imgNode.src = src || './img/img_broken.svg'; }
            }
            this.updateFavoriteIcons();
        };

        this.create = () => {
            if (ce.data('created')) return;
            cardDom = ce[0];

            const handleFocus = () => {
                if (cr && typeof cr.onCardFocus === 'function') {
                    cr.onCardFocus(cardDom, pr, this.parentRowScroll);
                }
                this.update();
            };

            ce.on('hover:focus', handleFocus); // Lampa's event for mouse/touch
            cardDom.addEventListener('focus', handleFocus); // Standard DOM event for keyboard

            ce.on('hover:enter', () => cr?.onCardClick?.(pr))
              .on('hover:long', () => cr?.showCardContextMenu?.(ce, pr));

            try { cardDom.addEventListener('visible', this.onVisible, { passive: true }); }
            catch (e) { cardDom.addEventListener('visible', this.onVisible); }
            
            setTimeout(() => { this.addDetails(); this.update(); }, 0);
            ce.data('created', true);
        };

        this.update = () => this.updateFavoriteIcons();
        this.render = (js) => { if (!ce.data('created')) this.create(); return js ? cardDom : ce; };
        this.destroy = () => {
            if (cardDom) {
                if (this.onVisible) {
                    try { cardDom.removeEventListener('visible', this.onVisible, { passive: true }); }
                    catch (e) { cardDom.removeEventListener('visible', this.onVisible); }
                }
                cardDom.removeEventListener('focus', this.onCardFocus); // Assuming onCardFocus was the handler
            }
            ce?.off?.(); // Remove jQuery events
            ce?.remove?.();
            d = pr = ce = cardDom = cr = null;
        };
    }

    function HanimeComponent(co) {
        let nt, mvs, h, last; let rows = [];
        const API_BASE = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        const CATS = { newset: "/catalog/movie/newset.json", recent: "/catalog/movie/recent.json", mostlikes: "/catalog/movie/mostlikes.json", mostviews: "/catalog/movie/mostviews.json" };
        const CAT_TITLES = { newset: 'hanime_newset_title', recent: 'hanime_recent_title', mostlikes: 'hanime_mostlikes_title', mostviews: 'hanime_mostviews_title' };
        const CAT_DEFAULTS = { newset: "Последние добавленные", recent: "Недавние", mostlikes: "Самые залайканные", mostviews: "Самые просматриваемые" };
        const STREAM_TPL = API_BASE + "/stream/movie/{id}.json";
        const META_TPL = API_BASE + "/meta/movie/{id}.json";
        const PROXY_URL = "http://77.91.78.5:3000";

        this.buildLayout = () => { h = $('<div class="component"><div class="component__body"></div></div>'); };

        this.fetchCatalog = () => {
            co?.loader?.(true);
            if (!nt && Lampa.Reguest) nt = new Lampa.Reguest();
            if (!nt) { this.empty(Lampa.Lang?.translate?.('hanime_error_network') || "Сетевой компонент недоступен."); return; }
            nt.clear();
            const promises = Object.entries(CATS).map(([key, path]) => new Promise((resolve, reject) => {
                nt.native(API_BASE + path, (data) => resolve({ key, data }), (err) => reject({ key, err }), false, { dataType: 'json', timeout: 15000 });
            }));
            Promise.allSettled(promises).then(results => {
                if (!h) { co?.loader?.(false); return; }
                co?.loader?.(false);
                const goodResults = results.filter(r => r.status === 'fulfilled' && r.value?.data?.metas?.length > 0).map(r => ({ key: r.value.key, metas: r.value.data.metas }));
                if (goodResults.length > 0) this.build(goodResults);
                else {
                    const anyReject = results.some(r => r.status === 'rejected');
                    const msg = anyReject ? (Lampa.Lang?.translate?.('hanime_error_partial') || "Не удалось загрузить некоторые каталоги.") + " " + (Lampa.Lang?.translate?.('hanime_empty_nodata') || "Нет данных для отображения.") : (Lampa.Lang?.translate?.('hanime_empty') || "Каталог пуст.");
                    this.empty(msg);
                }
            }).catch(error => {
                if (h) { co?.loader?.(false); this.empty(Lampa.Lang?.translate?.('hanime_error_fetch_all') || "Произошла ошибка при загрузке каталогов."); }
            });
        };

        this.build = (data) => {
            this.clearRows();
            const mainVCont = h.find('.component__body').empty();
            if (!(Lampa.Scroll && Lampa.Template?.get)) { this.empty(Lampa.Lang?.translate?.('hanime_error_lampa_components') || "Не удалось построить интерфейс."); return; }
            if (!data || data.length === 0) { this.empty(Lampa.Lang?.translate?.('hanime_empty_build_failed') || "Нет данных."); return; }

            data.forEach(({ key, metas }) => {
                const titleKey = CAT_TITLES[key], defaultTitle = CAT_DEFAULTS[key] || key;
                let catTitle = defaultTitle;
                if(Lampa.Lang?.translate && titleKey) { const tr = Lampa.Lang.translate(titleKey); if(tr && typeof tr === 'string' && tr !== titleKey) catTitle = tr; }

                const rowHtml = $(Lampa.Template.get('items_line', {title: catTitle})); // Use Lampa's line template
                rowHtml.addClass('selector'); // Make the row itself focusable

                const hScroll = new Lampa.Scroll({ mask: true, over: true, step: 250, horizontal: true }); // Ensure horizontal
                const itemsCont = $('<div class="items-cards"></div>'); // Standard Lampa class for card container
                
                const catCards = metas.map(meta => { 
                    const card = new HanimeCard(meta, this); 
                    card.parentRowScroll = hScroll; // Give card a reference to its row's scroller
                    itemsCont.append(card.render(true)); // Append DOM element
                    return card; 
                });

                hScroll.append(itemsCont[0]); // Append DOM element of itemsCont
                rowHtml.find('.items-line__body').append(hScroll.render(true));
                
                rowHtml.on('focus', () => { // Standard DOM focus event
                    if (mvs) mvs.update(rowHtml, true);
                    const firstCardInRow = rowHtml.find('.hanime-card.selector').first()[0];
                    if (firstCardInRow) {
                        last = firstCardInRow; // Update 'last' to the first card of the focused row
                    }
                });

                rows.push({ key, title: catTitle, html: rowHtml, horizontalScroll: hScroll, cards: catCards });
                mainVCont.append(rowHtml);
            });

            if (rows.length > 0) {
                mvs = new Lampa.Scroll({ mask: true, over: true, step: 250, scroll_by_item: true }); // scroll_by_item for rows
                mvs.append(mainVCont[0]); // Append DOM element
                h.append(mvs.render(true));
                if (!last && rows[0] && rows[0].cards.length > 0) {
                    last = rows[0].cards[0].render(true); // Initialize 'last' to the first card of the first row
                }
            } else { this.empty(Lampa.Lang?.translate?.('hanime_empty_build_failed') || "Не удалось построить строки каталога."); return; }
            co?.toggle?.();
        };
        
        this.onCardFocus = (cardElement, cardData, parentRowScroll) => {
            last = cardElement; // Update the component-wide 'last' focused element
            if (parentRowScroll) {
                parentRowScroll.update($(cardElement), true); // Ensure horizontal scroll
            }
            const currentRowElement = $(cardElement).closest('.items-line.selector');
            if (currentRowElement.length && mvs) {
                mvs.update(currentRowElement, false); // Ensure vertical scroll, false to not center if already mostly visible
            }
            // Lampa.Background.change(Lampa.Utils.cardImgBackground(cardData)); // Example
        };

        this.onCardClick = (cardData) => this.fetchStreamAndMeta(cardData.id, cardData);

        this.showCardContextMenu = (cardEl, cardData) => {
            const st = Lampa.Favorite?.check?.(cardData) || {};
            const menu = [
                { title: Lampa.Lang?.translate?.('title_book') || 'Planned', where: 'book', checkbox: true, checked: st.book },
                { title: Lampa.Lang?.translate?.('title_like') || 'Liked', where: 'like', checkbox: true, checked: st.like },
                { title: Lampa.Lang?.translate?.('title_wath') || 'Watching', where: 'wath', checkbox: true, checked: st.wath },
                { title: Lampa.Lang?.translate?.('menu_history') || 'History', where: 'history', checkbox: true, checked: st.history },
                { title: Lampa.Lang?.translate?.('settings_cub_status') || 'Status', separator: true }
            ];
            Lampa.Select?.show({
                title: Lampa.Lang?.translate?.('title_action') || 'Action', items: menu,
                onBack: () => Lampa.Controller?.toggle?.('content'),
                onCheck: (item) => { Lampa.Favorite?.toggle?.(item.where, cardData); rows.flatMap(r => r.cards).find(c => c?.render?.(true) === cardEl[0])?.updateFavoriteIcons?.(); },
                onSelect: () => { Lampa.Select?.close?.(); Lampa.Controller?.toggle?.('content'); },
            });
        };

        this.fetchStreamAndMeta = (id, initialMeta) => {
            co?.loader?.(true);
            if (!(nt?.native)) { co?.loader?.(false); Lampa.Noty?.show?.(Lampa.Lang?.translate?.('hanime_error_network') || 'Сетевой компонент недоступен.'); return; }
            const streamP = new Promise((res, rej) => nt.native(STREAM_TPL.replace('{id}', id), res, rej, false, { dataType: 'json', timeout: 10000 }));
            const metaP = initialMeta ? Promise.resolve({ meta: initialMeta }) : new Promise((res, rej) => nt.native(META_TPL.replace('{id}', id), res, rej, false, { dataType: 'json', timeout: 10000 }));

            Promise.all([streamP, metaP]).then(([streamData, metaResp]) => {
                if (!h) { co?.loader?.(false); return; }
                co?.loader?.(false);
                const fullMeta = metaResp?.meta || metaResp;
                if (streamData?.streams?.length > 0) {
                    let streamUrl = streamData.streams[0]?.url;
                    if (streamUrl && PROXY_URL) { try { if (new URL(streamUrl).hostname.includes('highwinds-cdn.com')) streamUrl = `${PROXY_URL}/proxy?url=${encodeURIComponent(streamUrl)}`; } catch (e) {} }
                    const playerObj = { title: fullMeta?.name || fullMeta?.title || 'Без названия', url: streamUrl, poster: fullMeta?.poster || fullMeta?.background || '', timeline: fullMeta?.timeline };
                    if (playerObj.url && Lampa.Player?.play && Lampa.Player?.playlist) {
                        Lampa.Player.play(playerObj); Lampa.Player.playlist([playerObj]);
                        if (fullMeta && Lampa.Favorite?.add) { Lampa.Favorite.add('history', { id: fullMeta.id || '', title: fullMeta.name || fullMeta.title || '', poster: fullMeta.poster || '', runtime: fullMeta.runtime, year: fullMeta.year, original_name: fullMeta.original_name || '', type: fullMeta.type || (fullMeta.first_air_date ? 'tv' : 'movie') }); }
                    } else { Lampa.Noty?.show?.(playerObj.url ? (Lampa.Lang?.translate?.('hanime_error_player') || 'Плеер недоступен.') : (Lampa.Lang?.translate?.('hanime_error_stream_url') || 'Нет ссылки на поток.')); }
                } else { Lampa.Noty?.show?.(Lampa.Lang?.translate?.('hanime_error_streams_not_found') || 'Потоки не найдены.'); }
            }).catch(error => { if (h) { co?.loader?.(false); Lampa.Noty?.show?.(Lampa.Lang?.translate?.('hanime_error_details') || 'Ошибка загрузки деталей.'); }});
        };

        this.empty = (msg) => {
            co?.loader?.(false); co?.toggle?.();
            this.clearRows(); mvs?.destroy?.(); mvs = null;
            const mainVCont = h?.find?.('.component__body');
            if (mainVCont?.length) {
                mainVCont.empty();
                if (Lampa.Empty) { const emp = new Lampa.Empty(); emp.message(msg); mainVCont.append(emp.render(true)); this.start = emp.start; } // Adjusted for Lampa.Empty
                else { mainVCont.text(msg); this.start = () => { Lampa.Controller?.add?.('content', { back: this.back }); Lampa.Controller?.toggle?.('content'); Lampa.Controller?.collectionSet?.([]); }; }
            } else { h?.empty?.().text(msg); this.start = () => { Lampa.Controller?.add?.('content', { back: this.back }); Lampa.Controller?.toggle?.('content'); Lampa.Controller?.collectionSet?.([]); }; }
        };

        this.clearRows = () => { rows.forEach(r => { r.cards.forEach(c => c.destroy()); r.horizontalScroll?.destroy?.(); r.html?.remove?.(); }); rows = []; };
        this.create = () => { if (!nt && Lampa.Reguest) nt = new Lampa.Reguest(); this.buildLayout(); co?.loader?.(true); this.fetchCatalog(); };
        
        this.start = () => {
            if (Lampa.Activity?.active?.()?.activity !== co) return;
            Lampa.Controller?.add?.('content', {
                link: this, // Link component for Lampa.Controller.own(this)
                toggle: () => { 
                    if (mvs) { 
                        Lampa.Controller?.collectionSet?.(mvs.render(true)); 
                        Lampa.Controller?.collectionFocus?.(last || (rows.length && rows[0].html[0]) || false, mvs.render(true));
                    } else { 
                        Lampa.Controller?.collectionSet?.([]); 
                        last = null; 
                    }
                },
                left: () => { Navigator?.canmove?.('left') ? Navigator.move('left') : Lampa.Controller?.toggle?.('menu'); },
                right: () => Navigator?.move?.('right'),
                up: () => { Navigator?.canmove?.('up') ? Navigator.move('up') : Lampa.Controller?.toggle?.('head'); },
                down: () => Navigator?.move?.('down'),
                back: this.back
            });
            Lampa.Controller?.toggle?.('content');
        };
        this.pause = () => { if (Lampa.Controller?.enabled?.()?.name === 'content') last = Lampa.Controller?.focused?.() || last; };
        this.stop = () => {};
        this.render = () => { if (!h) this.buildLayout(); return h; };
        this.destroy = () => {
            nt?.clear?.(); nt = null; this.clearRows(); mvs?.destroy?.(); mvs = null;
            h?.remove?.(); h = null; last = null;
            Lampa.Controller?.remove?.('content');
        };
        this.back = () => Lampa.Activity?.backward?.();
    }

    function startPlugin() {
        if (window.plugin_hanime_catalog_ready) return;
        function initLampaDeps() {
            if (!window.Lampa || !Lampa.Template || !Lampa.Component || !Lampa.Activity || !Lampa.Controller || !window.$ || !Lampa.Scroll || !Lampa.Reguest || !Lampa.Favorite || !Lampa.Timeline || !Lampa.Noty || !Lampa.Select || !Lampa.Lang || !Lampa.Player || !Lampa.Empty) { Lampa.Noty?.show?.('Ошибка плагина: Компоненты Lampa недоступны.'); return; }
            window.plugin_hanime_catalog_ready = true;
            if (Lampa.Template?.add) {
                Lampa.Template.add('hanime-card', `<div class="hanime-card card selector layer--visible layer--render"><div class="card__view"><img src="./img/img_load.svg" class="card__img" alt="{title}" loading="lazy" /><div class="card__icons"><div class="card__icons-inner"></div></div></div><div class="card__title">{title}</div></div>`);
                if (Lampa.Lang?.add) { Lampa.Lang.add({ hanime_newset_title: "Últimos adicionados", hanime_recent_title: "Recentes", hanime_mostlikes_title: "Mais curtidos", hanime_mostviews_title: "Mais vistos", hanime_error_network: "Componente de rede indisponível.", hanime_error_partial: "Falha ao carregar alguns catálogos.", hanime_empty: "Catálogo vazio.", hanime_empty_nodata: "Não há dados para exibir.", hanime_empty_build_failed: "Não foi possível construir as linhas do catálogo.", hanime_error_lampa_components: "Falha ao construir interface.", hanime_error_fetch_all: "Ocorreu um erro ao carregar os catálogos.", hanime_error_player: "Componente do player indisponível.", hanime_error_stream_url: "Não foi possível obter o URL do fluxo.", hanime_error_streams_not_found: "Fluxos não encontrados.", hanime_error_details: "Erro ao carregar detalhes." }); }
            }
            if (Lampa.Component?.add) { Lampa.Component.add('hanime_catalog', HanimeComponent); addMenuItem(); }
        }
        function addMenuItem() {
            const menuList = $('.menu .menu__list').eq(0);
            if (!menuList.length || !Lampa.Activity?.push || !Lampa.Component?.get?.('hanime_catalog') || menuList.find('.menu__text:contains("Hanime Catalog")').length > 0) return;
            const item = $(`<li class="menu__item selector"><div class="menu__ico"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg></div><div class="menu__text">Hanime Catalog</div></li>`);
            item.on('hover:enter', () => Lampa.Activity.push({ url: '', title: 'Hanime Catalog', component: 'hanime_catalog', page: 1 }));
            menuList.append(item);
        }
        if (window.appready) initLampaDeps();
        else if (Lampa.Listener?.follow) Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initLampaDeps(); });
        else setTimeout(initLampaDeps, 500);
    }
    startPlugin();
})();
