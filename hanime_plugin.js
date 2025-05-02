/**
 * Lampa Plugin: Hanime Catalog
 * Description: Displays anime cards fetched from the Hanime Stremio API and a custom details screen.
 * Version: 1.2 (Custom details screen, Play button)
 */

(function () {
    'use strict';

    // --- API Endpoints ---
    var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
    var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json";
    var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
    var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json"; // We might still want this for more details if needed later

    // --- Network Helper ---
    var network = new Lampa.Reguest(); // Use a single instance

    /**
     * Fetches Stream data for playback
     * @param {string} id - Anime ID
     * @param {function} onsuccess - Callback on success (receives stream data)
     * @param {function} onerror - Callback on error
     */
    function fetchStreamData(id, onsuccess, onerror) {
        var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
        network.clear(); // Clear previous requests potentially
        network.native(streamUrl,
            function (data) {
                if (data && data.streams && data.streams.length > 0) {
                    onsuccess(data);
                } else {
                    onerror("No stream data found.");
                    console.warn("Hanime Plugin: No streams in response for ID:", id, data);
                }
            },
            function (status, errorText) {
                onerror("Failed to load stream data. Status: " + status);
                console.error("Hanime Plugin: Failed to load stream data", status, errorText);
            },
            false,
            {
                dataType: 'json',
                timeout: 15000
            }
        );
    }

    /**
     * Card Component for Hanime Catalog Item
     * @param {object} data - Anime metadata object from the API
     */
    function HanimeCatalogCard(data) { // Renamed to avoid confusion
        var cardTemplate = Lampa.Template.get('hanime-catalog-card', {
            id: data.id,
            img: data.poster,
            title: data.name
        });
        var cardElement = $(cardTemplate);

        this.render = function () { return cardElement; };
        this.destroy = function () { cardElement.remove(); };
    }

    /**
     * NEW: Component for Displaying Hanime Details
     * @param {object} componentObject - Lampa component configuration (contains 'card' data)
     */
    function HanimeDetailsComponent(componentObject) {
        var _this = this;
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var html = $('<div></div>'); // Main container
        var animeData = componentObject.card; // Data passed from catalog
        var activity = Lampa.Activity.active(); // Reference to this activity instance

        // Build the HTML structure using a template
        var detailsTemplate = Lampa.Template.get('hanime-details-template', {
            poster: animeData.poster,
            title: animeData.name,
            description: animeData.description || "Описание отсутствует.",
            // Format genres as a comma-separated string or list items
            genres: (animeData.genre && animeData.genre.length) ? animeData.genre.join(', ') : "Нет данных"
        });
        var detailsElement = $(detailsTemplate);

        // Find interactive elements
        var playButton = detailsElement.find('.hanime-details__play-button');
        var descriptionElement = detailsElement.find('.hanime-details__description'); // For potential scrolling

        // Add Play button functionality
        playButton.on('hover:enter', function () {
            Lampa.Utils.vibrate();
            activity.loader(true); // Show loader on this activity

            fetchStreamData(animeData.id,
                function (streamData) { // onsuccess
                    activity.loader(false);
                    var firstStream = streamData.streams[0]; // Take the first (usually highest quality) stream

                    // Prepare data for Lampa Player
                    var playerConfig = {
                        url: firstStream.url,
                        title: animeData.name, // Use the name we already have
                        poster: animeData.poster,
                        // Pass necessary headers from behaviorHints if they exist
                        headers: (firstStream.behaviorHints && firstStream.behaviorHints.proxyHeaders && firstStream.behaviorHints.proxyHeaders.request)
                                 ? firstStream.behaviorHints.proxyHeaders.request
                                 : null,
                         // Potentially add subtitles, timelines etc. if API provides them
                         timeline: {} // Placeholder
                    };
                     console.log("Hanime Plugin: Starting player with config:", playerConfig);
                     Lampa.Player.play(playerConfig);
                     Lampa.Player.playlist([playerConfig]); // Add to playlist as well
                     // Optionally start video engine if needed
                     // Lampa.Player.video()
                     // Lampa.Player.open()
                },
                function (errorMsg) { // onerror
                    activity.loader(false);
                    Lampa.Noty.show(errorMsg);
                }
            );
        });

        // --- Lampa Activity Lifecycle Methods for Details Component ---
        this.create = function () {
            html.append(scroll.render(detailsElement)); // Append rendered template to main container
            this.activity.loader(false); // Ensure loader is off initially
        };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    // Focus the play button by default, or the scrollable description
                    Lampa.Controller.collectionFocus(playButton[0] || false, scroll.render());
                },
                // Navigation within the details view
                up: function () { Navigator.move('up'); },
                down: function () { Navigator.move('down'); },
                left: function() { // Handle left navigation if needed (e.g., focus poster/description)
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu'); // Go to menu if at edge
                },
                right: function() { // Handle right navigation
                    if (Navigator.canmove('right')) Navigator.move('right');
                },
                back: this.back // Standard back action
            });
            Lampa.Controller.toggle('content');
        };

        this.pause = function () {};
        this.stop = function () {};

        this.render = function () { return html; };

        this.destroy = function () {
            network.clear(); // Abort potential stream request
            scroll.destroy();
            html.remove();
            scroll = null;
            html = null;
            animeData = null;
            activity = null;
        };

        this.back = function () { Lampa.Activity.backward(); };
    }


    /**
     * Main Component for Displaying Hanime Catalog
     * @param {object} componentObject - Lampa component configuration
     */
    function HanimeCatalogComponent(componentObject) { // Renamed to avoid confusion
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = [];
        var html = $('<div class="hanime-catalog"></div>');
        var body = $('<div class="hanime-catalog__body category-full"></div>');
        var active = 0;
        var last;
        var activity = Lampa.Activity.active();

        this.fetchCatalog = function () {
            var _this = this;
            activity.loader(true); // Use activity reference

            network.clear();
            network.native(CATALOG_URL,
                function (data) {
                    if (data && data.metas && Array.isArray(data.metas)) {
                        _this.build(data.metas);
                    } else {
                        _this.empty("Invalid data format received from API.");
                        console.error("Hanime Plugin: Invalid data format", data);
                    }
                },
                function (errorStatus, errorText) {
                    _this.empty("Failed to load catalog. Status: " + errorStatus);
                    console.error("Hanime Plugin: Failed to load catalog", errorStatus, errorText);
                },
                false, { dataType: 'json', timeout: 15000 }
            );
        };

        this.build = function (result) {
            var _this = this;
            scroll.minus();

            result.forEach(function (meta) {
                var card = new HanimeCatalogCard(meta); // Use renamed card component
                var cardElement = card.render();

                cardElement.on('hover:focus', function () {
                    last = cardElement[0];
                    active = items.indexOf(card);
                    scroll.update(cardElement, true);
                }).on('hover:enter', function () {
                    // *** MODIFIED PART ***
                    // Push to our custom details component instead of 'full'
                    Lampa.Activity.push({
                        url: '',                     // Not needed
                        title: meta.name,            // Title for the details activity
                        component: 'hanime_details', // Use our new details component
                        card: meta                   // Pass the full meta object directly
                    });
                    // *** END OF MODIFIED PART ***
                });

                body.append(cardElement);
                items.push(card);
            });

            scroll.append(body);
            html.append(scroll.render(true));
            activity.loader(false); // Use activity reference
            activity.toggle();

             // Trigger lazy load after rendering
            setTimeout(simpleLazyLoad, 100);
        };

        this.empty = function (msg) {
            var empty = new Lampa.Empty({ message: msg });
            html.empty().append(empty.render(true));
            activity.loader(false); // Use activity reference
            activity.toggle();
            // Make the empty message focusable
             setTimeout(()=>{ // Ensure element exists in DOM
                 if (this.start === undefined) { // Avoid overwriting if already set
                      this.start = empty.start;
                 }
                 Lampa.Controller.add('content', { // Add controller for empty screen
                      toggle: () => {
                           Lampa.Controller.collectionSet(html);
                           Lampa.Controller.collectionFocus(empty.render(true), html);
                      },
                      back: this.back
                 });
                 Lampa.Controller.toggle('content');
             }, 0);
        };

        // --- Lampa Activity Lifecycle Methods for Catalog Component ---
        this.create = function () {
             // Set activity reference here as it's guaranteed to be the correct one
             activity = Lampa.Activity.active();
             activity.loader(true);
             this.fetchCatalog();
        };

        this.start = function () {
            // Re-set activity reference if needed (e.g., resuming)
            activity = Lampa.Activity.active();
            if (Lampa.Activity.active().activity !== activity) return;

            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function () { if (Navigator.canmove('right')) Navigator.move('right'); },
                up: function () { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); },
                down: function () { if (Navigator.canmove('down')) Navigator.move('down'); },
                back: this.back
            });
            Lampa.Controller.toggle('content');
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return html; };

        this.destroy = function () {
            network.clear();
            if (items) Lampa.Arrays.destroy(items);
            if (scroll) scroll.destroy();
            if (html) html.remove();
            items = null; scroll = null; html = null; body = null; activity = null;
        };
        this.back = function () { Lampa.Activity.backward(); };
    }

    /**
     * Initializes the Plugin
     */
    function startPlugin() {
        if (window.plugin_hanime_catalog_ready) return;
        window.plugin_hanime_catalog_ready = true;

        // --- Styles ---
        var style = `
            /* Catalog Styles */
            .hanime-catalog__body.category-full { justify-content: space-around; display: flex; flex-wrap: wrap; }
            .hanime-catalog-card { width: 185px; margin-bottom: 1.5em; margin-left: 10px; margin-right: 10px; }
            .hanime-catalog-card__view { position: relative; height: 270px; background-color: rgba(255,255,255,0.05); border-radius: 0.3em; overflow: hidden; }
            .hanime-catalog-card__img { position: absolute; width: 100%; height: 100%; object-fit: cover; }
            .hanime-catalog-card__title { margin-top: 0.5em; font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

            /* Details View Styles */
            .hanime-details { display: flex; padding: 1.5em; }
            .hanime-details__poster { width: 200px; height: 300px; flex-shrink: 0; margin-right: 1.5em; }
            .hanime-details__poster img { width: 100%; height: 100%; object-fit: cover; border-radius: 0.3em; background-color: rgba(255,255,255,0.05); }
            .hanime-details__info { flex-grow: 1; }
            .hanime-details__title { font-size: 1.8em; font-weight: bold; margin-bottom: 0.5em; }
            .hanime-details__genres { color: rgba(255,255,255,0.7); margin-bottom: 1em; font-style: italic; }
            .hanime-details__description { max-height: 150px; /* Limit initial height */ overflow-y: auto; margin-bottom: 1.5em; line-height: 1.5; color: rgba(255,255,255,0.85); padding-right: 5px; /* For scrollbar */}
            .hanime-details__description::-webkit-scrollbar { width: 5px; } /* Style scrollbar */
            .hanime-details__description::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 3px; }
            .hanime-details__play-button { /* Style the play button */ }
        `;
        Lampa.Template.add('hanime-style', `<style>${style}</style>`);

        // --- Templates ---
        Lampa.Template.add('hanime-catalog-card', `
            <div class="hanime-catalog-card card selector layer--visible layer--render">
                <div class="hanime-catalog-card__view">
                    <img data-src="{img}" src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="hanime-catalog-card__img lazy" alt="{title}" />
                </div>
                <div class="hanime-catalog-card__title">{title}</div>
            </div>
        `);

        Lampa.Template.add('hanime-details-template', `
            <div class="hanime-details">
                <div class="hanime-details__poster">
                    <img src="{poster}" alt="Poster"/>
                </div>
                <div class="hanime-details__info">
                    <div class="hanime-details__title">{title}</div>
                    <div class="hanime-details__genres">Жанры: {genres}</div>
                    <div class="hanime-details__description selector" tabindex="0">{description}</div>
                    <div class="hanime-details__actions">
                        <div class="hanime-details__play-button simple-button selector">Смотреть</div>
                        {/* Add more buttons here if needed */}
                    </div>
                </div>
            </div>
        `);

        // --- Component Registration ---
        Lampa.Component.add('hanime_catalog', HanimeCatalogComponent);
        Lampa.Component.add('hanime_details', HanimeDetailsComponent); // Register new details component

        // --- Add Menu Item ---
        function addMenuItem() {
            var menu_item = $(`...`); // Same as before
            menu_item.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '', title: 'Hanime Catalog', component: 'hanime_catalog', page: 1
                });
            });
            if ($('.menu .menu__list').eq(0).length) {
                $('.menu .menu__list').eq(0).append(menu_item);
            } else { console.error("Hanime Plugin: Could not find Lampa menu list."); }
        }

        // --- Final Setup ---
        $('body').append(Lampa.Template.get('hanime-style', {}, true));
        if (window.appready) addMenuItem();
        else { Lampa.Listener.follow('app', e => { if (e.type === 'ready') addMenuItem(); }); }

        // --- Lazy Load Setup (keep as is) ---
        function simpleLazyLoad() { /* ... same lazy load function ... */ }
        var originalBuild = HanimeCatalogComponent.prototype.build;
         HanimeCatalogComponent.prototype.build = function(result) {
              originalBuild.call(this, result);
              setTimeout(simpleLazyLoad, 100);
         };
         Lampa.Listener.follow('activity', function(e) {
              if (e.type === 'resumed' || e.type === 'start') {
                   if (Lampa.Activity.active() && Lampa.Activity.active().component === 'hanime_catalog') {
                       setTimeout(simpleLazyLoad, 100);
                   }
              }
         });

    }

    startPlugin();

})();
