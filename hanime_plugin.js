/**
 * Lampa Plugin: Hanime Catalog
 * Description: Displays anime cards fetched from the Hanime Stremio API.
 * Version: 1.2 (Improved error handling and responsive design)
 */

(function () {
    'use strict';

    // Card Component
    function HanimeCard(data) {
        var safeData = {
            id: data.id || '',
            poster: data.poster || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
            title: data.name || 'Untitled',
            description: data.description ? data.description.substring(0, 150) + '...' : 'No description available.'
        };

        var cardHTML = `
            <div class="hanime-card card selector layer--visible layer--render">
                <div class="hanime-card__view">
                    <img data-src="${safeData.poster}" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" 
                        class="hanime-card__img lazy" alt="${safeData.title}" 
                        onerror="this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';">
                </div>
                <div class="hanime-card__title">${safeData.title}</div>
            </div>
        `;

        this.element = $(cardHTML);
        this.render = () => this.element;
        this.destroy = () => this.element.remove();
    }

    // Main Component
    function HanimeComponent() {
        const API_BASE = 'https://86f0740f37f6-hanime-stremio.baby-beamup.club';
        const CATALOG_URL = `${API_BASE}/catalog/movie/newset.json`;
        
        let network = new Lampa.Reguest();
        let scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        let items = [];
        let html = $('<div class="hanime-catalog"></div>');
        let body = $('<div class="hanime-catalog__body"></div>');
        let observer;

        // Main lifecycle
        this.create = function() {
            this.activity.loader(true);
            this.initIntersectionObserver();
            this.fetchCatalog();
        };

        // Data fetching
        this.fetchCatalog = function() {
            network.native({
                url: CATALOG_URL,
                method: 'GET',
                timeout: 15000,
                dataType: 'json'
            }, 
            (data) => {
                if (data?.metas?.length) {
                    this.build(data.metas);
                } else {
                    this.empty("No content available");
                    console.warn("Empty response:", data);
                }
            },
            (error) => {
                this.empty(`Error loading: ${error.statusText || 'Connection failed'}`);
                console.error("Fetch error:", error);
            });
        };

        // UI construction
        this.build = function(metas) {
            body.empty();
            items = metas.map(meta => {
                let card = new HanimeCard(meta);
                card.render()
                    .on('hover:focus', () => this.handleFocus(card))
                    .on('hover:enter', () => this.showFullCard(meta));
                return card;
            });

            body.append(items.map(c => c.render()));
            scroll.append(body);
            html.append(scroll.render());
            this.activity.loader(false);
            this.initLazyLoad();
        };

        // Full card handling
        this.showFullCard = function(meta) {
            Lampa.Activity.push({
                component: 'full',
                id: meta.id,
                method: 'movie',
                card: {
                    id: meta.id,
                    title: meta.name,
                    poster: meta.poster,
                    background: meta.background,
                    description: meta.description,
                    genres: meta.genre?.map(g => ({ name: g })) || [],
                    runtime: '15 min',
                    videos: [{ site: 'Hanime' }]
                }
            });
        };

        // Performance optimizations
        this.initIntersectionObserver = function() {
            if (window.IntersectionObserver) {
                observer = new IntersectionObserver(entries => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            img.src = img.dataset.src;
                            observer.unobserve(img);
                        }
                    });
                });
            }
        };

        this.initLazyLoad = function() {
            $('.hanime-card__img.lazy').each((i, img) => {
                observer ? observer.observe(img) : img.src = img.dataset.src;
            });
        };

        // Error handling
        this.empty = function(message) {
            html.empty().append(new Lampa.Empty({ 
                message: message,
                description: 'Try reloading the page'
            }).render());
            this.activity.loader(false);
        };

        // Navigation
        this.start = function() {
            Lampa.Controller.add('content', {
                toggle: () => Lampa.Controller.collectionSet(scroll.render()),
                back: () => Lampa.Activity.backward(),
                up: () => Navigator.move('up'),
                down: () => Navigator.move('down'),
                left: () => Navigator.canmove('left') ? Navigator.move('left') : null,
                right: () => Navigator.move('right')
            });
            Lampa.Controller.toggle('content');
        };

        // Cleanup
        this.destroy = function() {
            observer?.disconnect();
            network.clear();
            scroll.destroy();
            items.forEach(c => c.destroy());
            html.remove();
        };
    }

    // Plugin initialization
    function initPlugin() {
        if (window.hanimePluginLoaded) return;
        window.hanimePluginLoaded = true;

        // Styles
        const styles = `
            .hanime-catalog__body {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
                gap: 1.5rem;
                padding: 0 1rem;
            }
            
            .hanime-card__view {
                aspect-ratio: 2/3;
                background: rgba(255,255,255,0.05);
                border-radius: 8px;
                overflow: hidden;
                position: relative;
            }
            
            .hanime-card__img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.2s ease;
            }
            
            .hanime-card:hover .hanime-card__img {
                transform: scale(1.05);
            }
            
            @media (max-width: 600px) {
                .hanime-catalog__body {
                    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                    gap: 1rem;
                }
            }
        `;

        // Registration
        Lampa.Template.add('hanime-styles', `<style>${styles}</style>`);
        Lampa.Component.add('hanime_catalog', HanimeComponent);
        $('body').append(Lampa.Template.get('hanime-styles', {}, true));

        // Menu integration
        function addMenuEntry() {
            const menuItem = $(`
                <li class="menu__item selector">
                    <div class="menu__ico">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                        </svg>
                    </div>
                    <div class="menu__text">Hanime</div>
                </li>
            `);

            menuItem.on('hover:enter', () => {
                Lampa.Activity.push({
                    title: 'Hanime Catalog',
                    component: 'hanime_catalog',
                    page: 1
                });
            });

            const menuList = $('.menu .menu__list').first();
            menuList.length ? menuList.append(menuItem) : console.error('Menu container missing');
        }

        // Activation
        if (window.appready) addMenuEntry();
        else Lampa.Listener.follow('app', e => e.type === 'ready' && addMenuEntry());
    }

    initPlugin();
})();
