(function () {
    const API = 'https://86f0740f37f6-hanime-stremio.baby-beamup.club';

    function fetchCatalog() {
        return fetch(`${API}/catalog/movie/newset.json`)
            .then(res => res.json())
            .then(data => data.metas || []);
    }

    function fetchMeta(id) {
        return fetch(`${API}/meta/movie/${id}.json`)
            .then(res => res.json())
            .then(data => data.meta);
    }

    function fetchStreams(id) {
        return fetch(`${API}/stream/movie/${id}.json`)
            .then(res => res.json())
            .then(data => data.streams);
    }

    function createCard(item) {
        return {
            title: item.name,
            original_title: item.name,
            image: item.poster,
            description: item.description,
            id: item.id,
            type: 'movie'
        };
    }

    function renderPage() {
        let scroll = new Lampa.Scroll({ mask: true });
        let html = Template.get('items_line', { title: 'Hanime' });
        let body = html.querySelector('.items-line__container');

        fetchCatalog().then(animeList => {
            animeList.forEach(anime => {
                const card = Template.get('card', createCard(anime));
                card.addEventListener('hover:enter', () => {
                    Lampa.Activity.push({
                        url: '',
                        title: anime.name,
                        component: 'full',
                        id: anime.id,
                        source: 'hanime',
                        page: 1,
                        search: '',
                        card: createCard(anime)
                    });
                });
                body.appendChild(card);
                Lampa.Card.render(card, createCard(anime));
            });

            scroll.append(html);
            Lampa.Controller.add('hanime_ui', {
                toggle: () => {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(false);
                },
                up: () => scroll.move('up'),
                down: () => scroll.move('down'),
                right: () => scroll.move('right'),
                left: () => scroll.move('left'),
                back: () => {
                    Lampa.Activity.backward();
                }
            });

            Lampa.Activity.push({
                url: '',
                title: 'Hanime',
                component: 'hanime_ui',
                page: 1
            });
        });
    }

    function startPlugin() {
        Lampa.SettingsApi.addButton({
            component: 'more',
            name: 'hanime_ext',
            type: 'button',
            title: 'Hanime',
            onClick: renderPage
        });
    }

    if (window.appready) startPlugin();
    else {
        Lampa.Listener.follow('app', e => {
            if (e.type === 'ready') startPlugin();
        });
    }

})();
