/**
 * Lampa Plugin: Shikimori Catalog
 * Description: Add Shikimori catalogue and integrate with Lampa.
 * Version: 0.1
 */

(function () {
    'use strict';

    /**
     * API interaction functions for Shikimori and TMDB.
     */
    var API = {
        /**
         * Fetches anime list from Shikimori API.
         * @param {object} params - Parameters for the API request (page, sort, kind, status, genre, seasons).
         * @param {function} oncomplite - Callback for successful request.
         * @param {function} onerror - Callback for request error.
         */
        main: function (params, oncomplite, onerror) {
            // Build the GraphQL query based on provided parameters
            var query = "\n            query Animes {\n                animes(limit: 36, order: ".concat(params.sort || 'aired_on', ", page: ").concat(params.page, "\n        ");

            if (params.kind) {
                query += ", kind: \"".concat(params.kind, "\"");
            }
            if (params.status) {
                query += ", status: \"".concat(params.status, "\"");
            }
            if (params.genre) {
                query += ", genre: \"".concat(params.genre, "\"");
            }
            if (params.seasons) {
                query += ", season: \"".concat(params.seasons, "\"");
            }

            query += ") {\n                    id\n                    name\n                    russian\n                    licenseNameRu\n                    english\n                    japanese\n                    kind\n                    score\n                    status\n                    season\n                    airedOn { year }\n                    poster {\n                        originalUrl\n                    }\n                }\n            }\n        ";

            $.ajax({
                url: 'https://shikimori.one/api/graphql',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ query: query }),
                success: function success(response) {
                    if (response.data && response.data.animes) {
                        oncomplite(response.data.animes);
                    } else {
                        onerror("Invalid data format from Shikimori API.");
                    }
                },
                error: function error(_error) {
                    console.error('Shikimori API Error:', _error);
                    onerror(_error);
                }
            });
        },

        /**
         * Searches for TMDB information based on anime data (primarily name).
         * Used to link Shikimori entry to TMDB for Lampa's full card component.
         * @param {object} animeData - Anime data from Shikimori.
         */
        search: function (animeData) {
            // Helper function to clean anime name for better search results
            function cleanName(name) {
                var regex = /\b(Season|Part)\s*\d*\.?\d*\b/gi;
                var cleanedName = name.replace(regex, '').trim();
                cleanedName = cleanedName.replace(/\s{2,}/g, ' ');
                return cleanedName;
            }

            // First attempt to get TMDB ID from an external mapping service
            $.get("https://arm.haglund.dev/api/v2/ids?source=myanimelist&id=".concat(animeData.id), function (response) {
                if (response === null || response.themoviedb === null) {
                    console.log('Shikimori Plugin: No direct TMDB link found, searching TMDB by name.');
                    // If no direct link, search TMDB by cleaned name
                    searchTmdb(animeData.name, function (tmdbResponse) {
                         // If no results by English/main name, try Japanese name
                        if (tmdbResponse.total_results === 0 && animeData.japanese) {
                            searchTmdb(animeData.japanese, handleTmdbResponse);
                        } else {
                            handleTmdbResponse(tmdbResponse);
                        }
                    });
                } else {
                    console.log('Shikimori Plugin: Found TMDB ID:', response.themoviedb);
                    // If TMDB ID found, fetch detailed info from TMDB
                    // Determine TMDB type ('movie' or 'tv') - needs improvement based on Shikimori kind
                    var tmdbType = (animeData.kind === 'movie' || animeData.kind === 'ova' || animeData.kind === 'special') ? 'movie' : 'tv';
                     getTmdb(response.themoviedb, tmdbType, processResults);
                }
            }).fail(function (jqXHR) {
                console.warn('Shikimori Plugin: Failed to fetch mapping from arm.haglund.dev:', jqXHR.status);
                // If mapping service fails, search TMDB by cleaned name
                searchTmdb(animeData.name, function (tmdbResponse) {
                     // If no results by English/main name, try Japanese name
                    if (tmdbResponse.total_results === 0 && animeData.japanese) {
                        searchTmdb(animeData.japanese, handleTmdbResponse);
                    } else {
                        handleTmdbResponse(tmdbResponse);
                    }
                });
            });

            // Search TMDB API
            function searchTmdb(query, callback) {
                var apiKey = "4ef0d7355d9ffb5151e987764708ce96"; // TMDB API Key
                var apiUrlTMDB = 'https://api.themoviedb.org/3/';
                // Use Lampa's proxy if configured
                var apiUrlProxy = 'apitmdb.' + (Lampa.Manifest && Lampa.Manifest.cub_domain ? Lampa.Manifest.cub_domain : 'cub.red') + '/3/';
                var request = "search/multi?api_key=".concat(apiKey, "&language=").concat(Lampa.Storage.field('language'), "&include_adult=true&query=").concat(encodeURIComponent(cleanName(query)));

                $.get(Lampa.Storage.field('proxy_tmdb') ? Lampa.Utils.protocol() + apiUrlProxy + request : apiUrlTMDB + request, callback)
                 .fail(function(jqXHR) {
                     console.error('Shikimori Plugin: TMDB Search API Error:', jqXHR.status);
                      callback({ total_results: 0 }); // Call callback with empty results on error
                 });
            }

            // Get detailed info from TMDB API by ID
            function getTmdb(id, type, callback) {
                var apiKey = "4ef0d7355d9ffb5151e987764708ce96"; // TMDB API Key
                var apiUrlTMDB = 'https://api.themoviedb.org/3/';
                 // Use Lampa's proxy if configured
                var apiUrlProxy = 'apitmdb.' + (Lampa.Manifest && Lampa.Manifest.cub_domain ? Lampa.Manifest.cub_domain : 'cub.red') + '/3/';
                var request = "".concat(type, "/").concat(id, "?api_key=").concat(apiKey, "&language=").concat(Lampa.Storage.field('language'));

                $.get(Lampa.Storage.field('proxy_tmdb') ? Lampa.Utils.protocol() + apiUrlProxy + request : apiUrlTMDB + request, callback)
                .fail(function(jqXHR) {
                    console.error('Shikimori Plugin: TMDB Get API Error:', jqXHR.status);
                    // Decide how to handle failure - perhaps show basic Shikimori info?
                    Lampa.Noty.show('Failed to get TMDB data.');
                });
            }

            // Handle response from TMDB search
            function handleTmdbResponse(tmdbResponse) {
                 processResults(tmdbResponse);
            }


            // Process the results from TMDB (either search or get)
            function processResults(response) {
                var menu = [];
                if (response.total_results !== undefined) { // This looks like a search response
                    if (response.total_results === 0) {
                        Lampa.Noty.show('Бядосе, обыскали все углы и ничего не нашли'); // Not found message
                    } else if (response.total_results === 1) {
                         // If only one result, go directly to full card
                        Lampa.Activity.push({
                            url: '', // Not needed when component is specified
                            component: 'full', // Use Lampa's full card component
                            id: response.results[0].id, // TMDB ID
                            method: response.results[0].media_type, // 'movie' or 'tv'
                            card: response.results[0] // Pass TMDB card data
                        });
                    } else if (response.total_results > 1) {
                        // If multiple results, show a selection menu
                        response.results.forEach(function (item) {
                            menu.push({
                                // Display title with media type
                                title: "[".concat(item.media_type.toUpperCase(), "] ").concat(item.name ? item.name : item.title),
                                card: item // Store the TMDB item data
                            });
                        });
                        Lampa.Select.show({
                            title: 'Find', // Title for the selection menu
                            items: menu,
                            onBack: function onBack() {
                                Lampa.Controller.toggle("content"); // Go back to the catalog
                            },
                            onSelect: function onSelect(item) {
                                // On selection, push the full card for the chosen item
                                Lampa.Activity.push({
                                    url: '',
                                    component: 'full',
                                    id: item.card.id, // TMDB ID
                                    method: item.card.media_type, // 'movie' or 'tv'
                                    card: item.card // Pass TMDB card data
                                });
                            }
                        });
                    }
                } else { // This looks like a get response (single item details)
                    // Go directly to full card with the detailed TMDB data
                    Lampa.Activity.push({
                        url: '',
                        component: 'full',
                        id: response.id, // TMDB ID
                        // Determine type based on presence of number_of_episodes
                        method: response.number_of_episodes ? 'tv' : 'movie',
                        card: response // Pass the detailed TMDB data
                    });
                }
            }
        }
    };

    /**
     * Card Component for displaying anime items in the catalog view.
     * @param {object} data - Anime metadata object from Shikimori API.
     * @param {string} userLang - User's selected language.
     */
    function Card(data, userLang) {
        // Format season string for display
        var formattedSeason = data.season ?
            data.season.replace('_', ' ').replace(/^\w/, function (c) {
                return c.toUpperCase();
            }) : '';

        // Helper to capitalize the first letter of a string
        function capitalizeFirstLetter(string) {
            if (!string) return string;
            return string.charAt(0).toUpperCase() + string.slice(1);
        }

        // Get the card template with data placeholders
        var item = Lampa.Template.get("LMEShikimori-Card", {
            img: data.poster && data.poster.originalUrl ? data.poster.originalUrl : '', // Use poster URL
            type: data.kind ? data.kind.toUpperCase() : '', // Display anime kind (TV, Movie, etc.)
            status: data.status ? capitalizeFirstLetter(data.status) : '', // Display status (Released, Ongoing, etc.)
            rate: data.score !== undefined ? data.score : '', // Display score if available
            // Use Russian title if user language is Russian, otherwise use main name or Japanese
            title: userLang === 'ru' ? data.russian || data.name || data.japanese : data.name || data.japanese,
            // Display formatted season or aired year
            season: data.season !== null ? formattedSeason : (data.airedOn && data.airedOn.year ? data.airedOn.year : ''),
        });

        // Add class for no season if season is not available (for potential CSS styling)
        if (!data.season) {
            $(item).find('.LMEShikimori.card__season').addClass('no-season');
        }

        this.render = function () {
            return item;
        };
        this.destroy = function () {
            item.remove();
        };
    }

    /**
     * Main Component for the Shikimori Catalog view.
     * @param {object} object - Component configuration object.
     */
    function Component$1(object) {
        var userLang = Lampa.Storage.field('language');
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true,
            step: 250
        });
        var items = [];
        var html = $("<div class='LMEShikimori-module'></div>");
        // Header with Home and Filter buttons
        var head = $("<div class='LMEShikimori-head torrent-filter'><div class='LMEShikimori__home simple-button simple-button--filter selector'>Home</div><div class='LMEShikimori__search simple-button simple-button--filter selector'>Filter</div></div>");
        var body = $('<div class="LMEShikimori-catalog--list category-full"></div>');
        var active, last;

        // Lifecycle method: Called when the component is created.
        this.create = function () {
             // Start fetching initial catalog data
            API.main(object, this.build.bind(this), this.empty.bind(this));
        };

        // Builds the UI with fetched catalog data.
        this.build = function (result) {
            var _this = this;
            scroll.minus();

            // Configure infinite scrolling
            scroll.onWheel = function (step) {
                if (!Lampa.Controller.own(_this)) _this.start();
                if (step > 0) Navigator.move('down'); else Navigator.move('up');
            };
            scroll.onEnd = function () {
                // Fetch next page when scrolling reaches the end
                object.page++;
                API.main(object, _this.body.bind(_this), _this.empty.bind(_this)); // Pass build method for appending
            };

            // Setup header actions (filter and home)
            this.headeraction();

            // Populate the body with cards
            this.body(result);

            // Append header and body to the scroll element
            scroll.append(head);
            scroll.append(body);

            // Append the scroll element to the main HTML container
            html.append(scroll.render(true));

            // Hide loader and toggle activity
            this.activity.loader(false);
            this.activity.toggle();
        };

        // Sets up actions for header buttons (Filter and Home).
        this.headeraction = function () {
            var settings = {
                "url": "https://shikimori.one/api/genres",
                "method": "GET",
                "timeout": 0
            };
            var filters = {};

            // Fetch genres from Shikimori API
            $.ajax(settings).done(function (response) {
                // Filter for Anime genres and format them for the filter menu
                var filteredResponse = response.filter(function (item) {
                    return item.entry_type === "Anime";
                });
                var modifiedResponse = filteredResponse.map(function (item) {
                    return {
                         title: item.name,
                         code: item.id // Use genre ID as code
                    };
                });
                filters.kind = {
                    title: 'Genre',
                    items: modifiedResponse
                };
            });

            // Define static filter options for Anime Kind
            filters.AnimeKindEnum = {
                title: 'Type',
                items: [{ title: "TV Series", code: "tv" }, { title: "Movie", code: "movie" }, { title: "OVA", code: "ova" }, { title: "ONA", code: "ona" }, { title: "Special", code: "special" }, { title: "TV Special", code: "tv_special" }, { title: "Music", code: "music" }, { title: "PV", code: "pv" }, { title: "CM", code: "cm" }]
            };

             // Define static filter options for Status
            filters.status = {
                title: 'Status',
                items: [{ title: "Planned", code: "anons" }, { title: "Airing", code: "ongoing" }, { title: "Released", code: "released" }]
            };

            // Define static filter options for Sorting
            filters.sort = {
                title: 'Sort',
                items: [{ title: "By ID", code: "id" }, { title: "id_desc", code: "id_desc" }, { title: "By rank", code: "ranked" }, { title: "By type", code: "kind" }, { title: "By popularity", code: "popularity" }, { title: "In alphabetical order", code: "name" }, { title: "By release date", code: "aired_on" }, { title: "By number of episodes", code: "episodes" }, { title: "By status", code: "status" }, { title: "By random", code: "random" }, { title: "By random", code: "ranked_random" }, { title: "By Shikimori ranking", code: "ranked_shiki" }, { title: "created_at", code: "created_at" }, { title: "created_at_desc", code: "created_at_desc" }]
            };

            /** Season Range Generation **/
            function getCurrentSeason() {
                var now = new Date();
                var month = now.getMonth();
                var year = now.getFullYear();
                var seasons = ['winter', 'spring', 'summer', 'fall'];
                // Calculate current season index (0=winter, 1=spring, 2=summer, 3=fall)
                var seasonIndex = (month + 1) % 12 === 0 ? 0 : Math.floor((month + 1) / 3);
                // Adjust year for winter season starting in December
                return "".concat(seasons[seasonIndex], "_").concat(month === 11 ? year + 1 : year);
            }

            function generateDynamicSeasons() {
                var now = new Date();
                var seasons = new Set([getCurrentSeason()]);

                // Add the next three seasons
                for (var i = 1; i <= 3; i++) {
                    var nextDate = new Date(now);
                    nextDate.setMonth(now.getMonth() + 3 * i);
                    // Recalculate season for the next date
                    var nextSeasonMonth = nextDate.getMonth();
                    var nextSeasonYear = nextDate.getFullYear();
                     var seasonsNames = ['winter', 'spring', 'summer', 'fall'];
                     var nextSeasonIndex = (nextSeasonMonth + 1) % 12 === 0 ? 0 : Math.floor((nextSeasonMonth + 1) / 3);
                     seasons.add("".concat(seasonsNames[nextSeasonIndex], "_").concat(nextSeasonMonth === 11 ? nextSeasonYear + 1 : nextSeasonYear));
                }
                return Array.from(seasons);
            }

            function generateYearRanges() {
                var currentYear = new Date().getFullYear();
                var ranges = [];

                // Generate ranges of 10 years
                for (var startYear = currentYear; startYear >= 2000; startYear -= 10) {
                    var endYear = Math.max(startYear - 9, 2000);
                    ranges.push("".concat(endYear, "_").concat(startYear));
                }

                // Add static ranges for older years
                ranges.push("199x", "198x", "ancient");
                return ranges;
            }

            function generateSeasonJSON() {
                var dynamicSeasons = generateDynamicSeasons();
                var yearRanges = generateYearRanges();
                 // Combine and ensure uniqueness
                var allSeasons = Array.from(new Set([].concat(dynamicSeasons, yearRanges)));
                return allSeasons.map(function (season) {
                    return {
                        "code": season,
                        // Format season string for display (e.g., "winter-2025" or "2020-2029")
                        "title": season.replace(/_/g, '-').replace(/(\d{4})-(\d{4})/, '$1-$2')
                    };
                });
            }

            filters.seasons = {
                title: 'Season',
                items: generateSeasonJSON()
            };
            /** End Season Range Generation **/


            var serverElement = head.find('.LMEShikimori__search'); // Filter button

            // Function to get the currently selected filter parameters
            function queryForShikimori() {
                var query = {};
                if (filters.AnimeKindEnum) filters.AnimeKindEnum.items.forEach(function (a) {
                    if (a.selected) query.kind = a.code;
                });
                if (filters.status) filters.status.items.forEach(function (a) {
                    if (a.selected) query.status = a.code;
                });
                 if (filters.kind) filters.kind.items.forEach(function (a) {
                    if (a.selected) query.genre = a.code; // Use code (ID) for genre filter
                });
                 if (filters.sort) filters.sort.items.forEach(function (a) {
                    if (a.selected) query.sort = a.code;
                });
                 if (filters.seasons) filters.seasons.items.forEach(function (a) {
                    if (a.selected) query.seasons = a.code;
                });
                return query;
            }

            // Helper to update subtitle of filter items based on selection
            function selected(where) {
                var title = [];
                where.items.forEach(function (a) {
                    if (a.selected || a.checked) title.push(a.title);
                });
                where.subtitle = title.length ? title.join(', ') : Lampa.Lang.translate('nochoice'); // 'No choice' in user's language
            }

            // Helper to handle single selection in filter menus
            function select(where, a) {
                where.forEach(function (element) {
                    element.selected = false;
                });
                a.selected = true;
            }

            // Shows a submenu for a specific filter category
            function submenu(item, main) {
                Lampa.Select.show({
                    title: item.title,
                    items: item.items,
                    onBack: main, // Go back to the main filter menu
                    onSelect: function onSelect(a) {
                        select(item.items, a); // Select the chosen item
                        main(); // Go back to the main filter menu
                    }
                });
            }

            // Shows the main filter menu
            function mainMenu() {
                // Update subtitles for all filter categories before showing
                for (var i in filters) selected(filters[i]);

                Lampa.Select.show({
                    title: 'Filters', // Title for the filter menu
                    items: [
                        { title: Lampa.Lang.translate('search_start'), searchShikimori: true }, // Button to apply filters
                        filters.status,
                        filters.AnimeKindEnum,
                        filters.kind, // Genre filter
                        filters.sort,
                        filters.seasons // Season filter
                    ],
                    onBack: function onBack() {
                        Lampa.Controller.toggle("content"); // Go back to the catalog view
                    },
                    onSelect: function onSelect(a) {
                        if (a.searchShikimori) {
                            search(); // Apply selected filters and search
                        } else submenu(a, mainMenu); // Open submenu for selected filter category
                    }
                });
            }

            // Initiates a new catalog search with selected filters
            function search() {
                var query = queryForShikimori(); // Get selected filters
                var params = {
                    url: '', // Not needed for component push
                    title: 'Shikimori', // Title for the activity
                    component: 'LMEShikimori', // Component to open
                    page: 1 // Start from the first page with new filters
                };

                // Add selected filter parameters to activity params
                if (query.kind) params.kind = query.kind;
                if (query.status) params.status = query.status;
                if (query.genre) params.genre = query.genre;
                if (query.sort) params.sort = query.sort;
                if (query.seasons) params.seasons = query.seasons;

                Lampa.Activity.push(params); // Push the new activity with filter params
            }

            // Attach click/enter listener to the Filter button
            serverElement.on('hover:enter', function () {
                mainMenu(); // Open the filter menu
            });

            // Attach click/enter listener to the Home button
            var homeElement = head.find('.LMEShikimori__home');
            homeElement.on('hover:enter', function () {
                 // Go back to the default catalog view (page 1, default sort)
                Lampa.Activity.push({
                    url: '',
                    title: 'Shikimori',
                    component: 'LMEShikimori',
                    page: 1
                });
            });
        };

        // Handles empty results or errors from the API.
        this.empty = function (msg) {
            var empty = new Lampa.Empty({ message: msg || "Ничего не найдено" }); // Default message if none provided
            html.empty().append(empty.render(true));
            this.start = empty.start; // Set the start method to the empty component's start
            this.activity.loader(false);
            this.activity.toggle();
        };

        // Populates the body with anime cards.
        this.body = function (data) {
             // Check if data is an array before processing
             if (!Array.isArray(data)) {
                 console.error("Shikimori Plugin: Invalid data received for building body.", data);
                 // Optionally show an error or empty message here
                 return;
             }

            data.forEach(function (anime) {
                // Create a new Card instance for each anime item
                var item = new Card(anime, userLang);
                // Render the card and add focus/enter listeners
                item.render(true).on("hover:focus", function () {
                    last = item.render()[0]; // Keep track of the last focused element
                    active = items.indexOf(item);
                    scroll.update(items[active].render(true), true); // Update scroll position
                }).on("hover:enter", /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
                    return _regeneratorRuntime().wrap(function _callee$(_context) {
                        while (1) switch (_context.prev = _context.next) {
                            case 0:
                                // When a card is selected, initiate the search for TMDB data
                                API.search(anime);
                            case 1:
                            case "end":
                                return _context.stop();
                        }
                    }, _callee);
                })));
                body.append(item.render(true)); // Append the card to the body
                items.push(item); // Add the card to the items array
            });
            // After adding new items, refresh scroll and potentially trigger lazy load
            scroll.render().toggleClass('full-start', true); // Adjust class based on Lampa's structure
             simpleLazyLoad(); // Trigger lazy load for new images
        };

        // Lifecycle method: Called when the component becomes active.
        this.start = function () {
            if (Lampa.Activity.active().activity !== this.activity) return;

            // Add controller actions for navigation
            Lampa.Controller.add("content", {
                toggle: function toggle() {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: function left() {
                    if (Navigator.canmove("left")) Navigator.move("left"); else Lampa.Controller.toggle("menu");
                },
                right: function right() {
                    Navigator.move("right");
                },
                up: function up() {
                    if (Navigator.canmove("up")) Navigator.move("up"); else Lampa.Controller.toggle("head");
                },
                down: function down() {
                    if (Navigator.canmove("down")) Navigator.move("down");
                },
                back: this.back
            });
            Lampa.Controller.toggle("content"); // Activate the content controller
        };

        // Lifecycle method: Called when the component is paused.
        this.pause = function () {};
        // Lifecycle method: Called when the component is stopped.
        this.stop = function () {};

        // Renders the component's HTML.
        this.render = function (js) {
            return js ? html : $(html); // Return jQuery object or raw HTML element
        };

        // Lifecycle method: Called when the component is destroyed.
        this.destroy = function () {
            network.clear(); // Clear any ongoing network requests
            Lampa.Arrays.destroy(items); // Destroy card instances
            scroll.destroy(); // Destroy scroll instance
            html.remove(); // Remove component HTML from DOM
            // Nullify references to aid garbage collection
            items = null;
            network = null;
            scroll = null;
            html = null;
            body = null;
        };

        // Handles the back action.
        this.back = function () {
            Lampa.Activity.backward(); // Go back to the previous activity
        };
    }

    /**
     * Component/Listener to enhance Lampa's 'full' component with Shikimori data.
     * This listens for the 'full:complite' event which indicates the full card has been populated.
     * It then fetches additional data from Shikimori and injects it into the full card UI.
     */
    function FullCardEnhancer() {
         // Listen for the 'full:complite' event
        Lampa.Listener.follow("full", /*#__PURE__*/function () {
            var _ref = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee(e) {
                var getMAL, response, dubbers, subbers, shikimoriRates;
                return _regeneratorRuntime().wrap(function _callee$(_context) {
                    while (1) switch (_context.prev = _context.next) {
                        case 0:
                            // Check if the event type is 'complite' (full card finished loading initial data)
                            if (!(e.type === "complite")) {
                                _context.next = 21;
                                break;
                            }
                            _context.prev = 1;
                            // Attempt to get Shikimori ID from TMDB ID using an external mapping service
                            _context.next = 4;
                            return $.ajax({
                                url: "https://arm.haglund.dev/api/v2/themoviedb?id=".concat(e.object.id), // Use TMDB ID from full card
                                method: "GET",
                                timeout: 0
                            });
                        case 4:
                            getMAL = _context.sent;
                            // Check if mapping returned data and includes a MyAnimeList ID
                            if (getMAL && getMAL.length && getMAL[0].myanimelist) {
                                _context.next = 8;
                                break;
                            }
                            console.warn("Shikimori Plugin: No MyAnimeList ID found for TMDB ID", e.object.id);
                            return _context.abrupt("return"); // Exit if no MAL ID found
                        case 8:
                            console.log("Shikimori Plugin: Found MyAnimeList ID:", getMAL[0].myanimelist);
                            // Fetch full anime data from Shikimori API using the MAL ID
                            _context.next = 11;
                            return $.ajax({
                                url: "https://shikimori.one/api/animes/".concat(getMAL[0].myanimelist),
                                method: "GET",
                                timeout: 0
                            });
                        case 11:
                            response = _context.sent;

                            // Inject additional data into the full card UI
                            // Inject Fan Dubbers info
                            if (response && response.fandubbers && response.fandubbers.length > 0) {
                                dubbers = "\n                                <div class=\"full-descr__info\">\n                                    <div class=\"full-descr__info-name\">Fan Dubbers</div>\n                                    <div class=\"full-descr__text\">".concat(response.fandubbers.join(', '), "</div>\n                                </div>");
                                 e.object.activity.render().find(".full-descr__right").append(dubbers); // Append to the description area
                            }

                            // Inject Fan Subbers info
                            if (response && response.fansubbers && response.fansubbers.length > 0) {
                                subbers = "\n                                <div class=\"full-descr__info\">\n                                    <div class=\"full-descr__info-name\">Fan Subbers</div>\n                                    <div class=\"full-descr__text\">".concat(response.fansubbers.join(', '), "</div>\n                                </div>");
                                 e.object.activity.render().find(".full-descr__right").append(subbers); // Append to the description area
                            }


                            // Inject Shikimori score
                            if (response && response.score !== undefined) {
                                shikimoriRates = "<div class=\"full-start__rate rate--shikimori\"><div>".concat(response.score, "</div><div>Shikimori</div></div>");
                                // Prepend to the rate line (adjust selector based on Lampa version)
                                e.object.activity.render().find(".full-start-new__rate-line, .full-start__rate-line").prepend(shikimoriRates);
                            }

                            _context.next = 21;
                            break;
                        case 18:
                            _context.prev = 18;
                            _context.t0 = _context["catch"](1);
                            console.error("Shikimori Plugin: Error fetching or injecting Shikimori data:", _context.t0);
                        case 21:
                        case "end":
                            return _context.stop();
                    }
                }, _callee, null, [[1, 18]]);
            }));
            return function (_x) {
                return _ref.apply(this, arguments);
            };
        }());
    }

    /**
     * Adds the Shikimori menu item to Lampa's main menu.
     */
    function addMenuItem() {
        var button = $("<li class=\"menu__item selector\">\n            <div class=\"menu__ico\">\n                <svg fill=\"currentColor\" viewBox=\"0 0 24 24\" role=\"img\" xmlns=\"http://www.w3.org/2000/svg\" stroke=\"\"><g id=\"SVGRepo_bgCarrier\" stroke-width=\"0\"></g><g id=\"SVGRepo_tracerCarrier\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></g><g id=\"SVGRepo_iconCarrier\"><title>Shikimori icon</title><path d=\"M2.8025.0025C2.7779.03 2.8332.1223 2.9834.3c.0981.1134.1594.2328.233.4444.0551.1594.1198.3157.1443.3464.0368.049.0396.037.0427-.1102V.8181l.218.3004c.331.4568.5365.6992.6744.7973.0706.046.1136.0919.0952.098-.049.0153-.4785-.2208-.6778-.374-.1012-.0767-.196-.1411-.2114-.1411-.0153 0-.0644-.0461-.1073-.1013-.0399-.0552-.1348-.1408-.2053-.1898-.1717-.1196-.3527-.2913-.3957-.374C2.763.7721 2.668.7323 2.668.7814c0 .049.245.377.435.5793.5825.6224 1.1776.932 2.7688 1.4287.3373.1043.6347.2085.6623.233.0246.0215.0737.0398.1074.0398.0306 0 .0795.0152.104.0305.0399.0245.0367.031-.0093.031-.0368 0-.0521.018-.046.0548.0092.0552.1595.1045.4477.1444.1287.0184.1593.0124.1593-.0244 0-.049-.0889-.083-.2207-.083-.049 0-.0858-.0151-.0858-.0304 0-.0184.031-.025.0708-.0188.0368.0092.1652.0306.2817.052.276.046.353.0768.353.135 0 .0644.0826.092.1377.046.0307-.0276.046-.0274.046-.0028 0 .0183.0151.0337.0304.0337.0184 0 .031-.0214.031-.046 0-.0582-.0309-.0586.4842.0212.3066.046.42.077.374.0923-.098.0368-.0428.0858.0952.0858.0705 0 .1195.0153.1195.0337 0 .0276.0704.0306.2452.0183.1594-.0123.2516-.0093.2639.0122.0122.0184.0643.0275.1195.0183.0521-.0092.1961.0034.3126.0248.3066.0583 1.1313.1044 2.977.1688 2.983.1042 5.157.3277 5.9726.6159.3617.1287.9075.4048 1.0087.509.1594.1686.2082.3066.1898.5334-.0092.1135-.0092.2149 0 .2241.089.089.2855-.0859.2855-.2545 0-.0338.0639-.1165.1467-.187.331-.2913.3803-.454.3436-1.1194-.0246-.4476-.031-.4782-.2302-1.1343-.2606-.8585-.3215-.9903-.6342-1.3214-.3679-.3863-.7023-.6072-1.1592-.7635-.1103-.0368-.3434-.1224-.5212-.1899-.2483-.098-.4262-.141-.788-.1931-.512-.0736-1.6126-.1256-1.956-.0919-.1226.0123-.6132 0-1.1498-.0337-.61-.0337-.984-.046-1.0729-.0277-.0766.0154-.2085.0274-.2944.0305-.1257 0-.1837.0187-.291.0984-.1257.092-.2149.1194-.5644.1777-.5641.092-.929.1653-1.0823.2175-.1196.0429-.3157.0706-.6192.089-.8309.0521-1.3029.0952-1.4071.129-.0706.0214-.3406.0274-.7913.0182-.5488-.0123-.6895-.006-.7171.0277-.0276.0306-.0155.0398.0581.0398.1809 0 1.7968.1258 1.8121.141.0154.0154-.273.003-1.0977-.0491-.2423-.0154-.4567-.0186-.472-.0094-.0583.0368-.4939.0307-.9108-.0122-.515-.0521-1.0115-.138-1.4714-.2545-.2146-.0521-.4662-.0916-.644-.1008-.328-.0153-.6778-.129-1.1714-.3773-.325-.1625-.3614-.1684-.3614-.0366v.1008L3.244.5331c-.0552-.0644-.1224-.1689-.15-.2302-.0552-.1165-.2609-.328-.2915-.3004zm.4584 3.1887c-.5697.0269-1.0938.4707-1.47 1.2628-.2238.4752-.2635.6593-.2789 1.291-.0122.4966-.0063.598.0642 1.0119.1503.8615.19.9625.5058 1.2721.3342.3312 1.1654.785 1.6284.8892.1594.0338.3464.0768.4139.0952.2575.0644.61.0885 1.4868.1008.8431.0153.9136.0125 1.027-.0427.0797-.0398.2486-.0707.4908-.089.2023-.0184.4165-.0459.4748-.0643.0582-.0153.1841-.0309.276-.0309.0951 0 .1903-.0182.2087-.0366.0735-.0735.4228-.1503.757-.1687.187-.0092.3621-.0273.3928-.0427.1011-.0551.052-.0859-.1135-.0675-.095.0092-.187.003-.2207-.0154-.0491-.0307-.034-.0335.0825-.0366.0766 0 .2269-.0093.3342-.0216.1655-.0153.1842-.0248.1382-.0585-.1134-.0828-.0153-.1041.4936-.1041.4568 0 .5886-.0215.4537-.0736-.0275-.0092-.1413-.0216-.2517-.0216-.1134-.003-.1624-.0119-.1134-.015.0521-.006.1628-.0277.2517-.043.0859-.0185.6255-.0399 1.1958-.046.5702-.0061 1.0542-.0124 1.0757-.0155.0276 0 .0338-.0215.0216-.0614-.0123-.043-.0061-.061.0276-.061.0245 0 .083-.049.129-.1073.0919-.1195.1161-.1137.156.0427l.0277.1012.2207.0094c.1748.0061.2333-.003.2916-.046.0398-.0306.1224-.0645.1837-.0768l.1135-.0216-.0183.1782c-.0184.144-.0152.1716.0215.1593.0246-.0092.1222-.0338.2203-.0553l.1749-.0337-.0675-.089c-.043-.0491-.1226-.098-.1931-.1163l-.1224-.031.1838-.006a4.812 4.812 0 0 1 .3004 0c.0644.003.1135-.0089.1135-.0272 0-.0184-.0182-.034-.0366-.037-.0215-.0031-.089-.0064-.1472-.0095-.0582-.006-.1564-.0398-.2147-.0735-.0582-.0368-.1317-.067-.1593-.067-.0307 0-.0553-.0157-.0553-.031 0-.0215.092-.0305.2545-.0244.2483.0092.2514.0091.2606.0919.0123.095.0122.095.0797.0675a.0498.0498 0 0 0 .0305-.0581c-.0184-.049.037-.0893.083-.0586.0183.0092.0918.0215.1593.0276.1655.0092.9718.0737 1.1803.0952.1103.0122.1593.0307.1593.0614 0 .0521.037.0549.083.0089.0245-.0245.1442-.021.4354.0066.3557.0337.4017.0425.4017.0946 0 .0368.0213.0556.0704.0586.0368 0 .1656.0121.2821.0244.1196.0123.2329.0181.2513.009.0214-.0062.0891-.0979.1504-.2021.1196-.1993.2208-.3253.2607-.3253.0153 0 .018.0219.0089.0464-.0123.0245-.003.046.0154.046.0215 0 .0338.0244.0277.052-.0061.0367.0213.0582.0919.0735.1134.0246.1657.0582.089.0582-.0276 0-.0525.0183-.0525.0398 0 .0215.1812.0984.4448.1842.2821.095.4444.1623.4444.1899 0 .0306-.095.0092-.3586-.0797-.6254-.2146-.898-.2606-.898-.1533 0 .046.0488.0676.285.1228.1532.0368.3002.0642.3248.0642.0214 0 .0798.0338.1289.0736.049.043.294.144.5638.233.273.092.5153.19.5644.233.049.0398.1349.0952.1931.1166.1932.0828.4693.3309.6778.6099.3005.4047.2973.3895.1317.3895-.0766 0-.2946-.0214-.4847-.046-.19-.0245-.429-.0461-.53-.0492-.2147-.0061-1.9684.0278-2.6245.0493l-.4449.0154-.0703-.1504c-.0398-.0828-.1533-.2298-.2545-.331-.1747-.1717-.1837-.175-.2236-.1167-.0245.0337-.1168.1626-.2057.2822l-.1622.2236-.1992.0065c-.1104 0-.2242.0031-.2517 0-.0675-.006-.0703.0305-.009.144l.0427.0857-.3126.0216c-.8524.0582-2.661.282-3.268.4078-.135.0276-.4203.049-.6778.052-.46.0061-.5028.0184-.794.187-.0522.0276-.0922.0339-.129.0155-.0337-.0215-.0643-.0154-.0858.0122-.0337.0398-.144.058-.9534.1439-.1778.0184-.475.0584-.665.089-.3312.0552-.3499.0552-.5246 0-.184-.0582-.7572-.135-1.2478-.1687l-.276-.0216-.1622.1472c-.092.0797-.218.2177-.2855.3066-.092.1257-.141.166-.1992.166-.1257 0-1.2448.1743-2.0573.3215-.8768.1594-1.2077.1904-1.4652.1382-.2668-.0551-.2701-.0583-.2578-.3956.0122-.2851.0093-.2941-.0643-.3309-.1686-.0858-.331-.0371-.5517.1622-.052.046-.1133.0675-.1992.0675-.0705-.003-.1993.0306-.3004.0797l-.181.083.009.1593c.006.0858-.0032.1868-.0216.2175-.0245.0368-.0306.1994-.0183.4692.0123.328.003.4476-.0398.607l-.052.1964.1471.2086c.2943.4139.503.7294.503.763 0 .0185.0916.1169.208.218.506.4446.7207.5642 1.2174.6685.5273.1134.6131.1072.9412-.0675.1502-.0828.3251-.1965.3895-.2578.0797-.0736.3067-.1931.742-.3863.6776-.3004.7631-.3342.7631-.2943 0 .0122.043.426.0952.9135.1073 1.024.1411 2.0052.0951 2.7595-.0368.5917-.0644.6743-.4814 1.4591-.6469 1.2172-1.4224 2.3947-2.008 3.0477-.1043.1196-.2636.325-.3525.4599-.1686.2544-.4815.595-.871.9445-.1317.1195-.2177.2206-.2085.2451.0092.0245.1046.0734.2119.1102.1042.0398.2052.083.2236.0984.049.049.1101.0303.337-.0924l.2207-.1223.0891.0614c.1073.0705.3006.0763.4631.015.0644-.0245.1932-.052.2883-.0581.19-.0184.3126-.0703.5118-.2236.0736-.0552.1687-.1073.2147-.1195.089-.0184.8585-.7976 1.2694-1.2881.1287-.1502.4506-.4905.7204-.7542.3771-.374.5457-.5148.7603-.6436.3096-.184.5548-.4076.5854-.5395.0123-.046.052-.1413.0919-.2118.095-.1625.2024-.5792.1748-.6835-.0092-.0429-.0552-.147-.1012-.233-.0797-.141-.0855-.1901-.1008-.5826-.0276-.6898-.138-1.0515-.4875-1.5941-.2023-.3127-.2516-.4231-.3773-.8278-.2085-.696-.2697-1.3493-.1655-1.8613.049-.2545.0735-.2883.279-.4078.1072-.0644.2484-.1656.3159-.227l.1256-.1162.5948-.0675c.328-.0398.6958-.0889.8123-.1134.1196-.0245.3831-.0797.5855-.1195.2054-.043.497-.1164.6473-.1655.1502-.0521.3616-.1137.472-.1383.2146-.049.9472-.1192.9717-.0946.0092.0092.0185.4476.0155.975 0 .8277-.0092 1.0515-.0797 1.6616-.1196 1.0455-.1442 1.3732-.1749 2.526-.0276 1.1466-.0365 1.1986-.2236 1.3335-.1349.0981-.2728.0802-.6806-.1007-.2023-.089-.6286-.264-.9505-.3928-.3189-.1288-.7727-.3277-1.0027-.4411-.233-.1165-.4232-.2028-.4232-.1936 0 .0092.1165.1595.2606.3342.144.1748.2606.325.2606.3342 0 .0092-.0274.0188-.0642.0188-.0552 0-.0584.006-.0155.0642.0276.0398.0369.101.0277.1654-.0123.0828-.0032.1106.058.1505.04.0276.1046.1041.1445.1716.0368.0643.1012.147.141.1776.04.0307.098.1044.1318.1627.0306.0582.1348.1654.233.239.098.0736.193.1687.2113.2086.0184.046.1077.1133.2119.1655.2422.1226.5975.4353.6557.5732.0338.0859.1015.1534.2977.2822.1564.1042.4321.3433.7387.6469.558.5518.5887.5703 1.0425.5427.2943-.0214.4416-.0768.6164-.2362.0705-.0644.1563-.1316.187-.15.0306-.0184.1072-.1072.1655-.1992.0582-.095.147-.1932.193-.2208.1288-.0766.3587-.402.3587-.5062 0-.1533.0582-.251.2606-.441.1778-.1656.2149-.2213.3253-.4941.1717-.417.2326-.6864.2878-1.223.0674-.6622.0616-1.4623-.015-1.962-.1257-.8156-.604-3.0876-.7481-3.5414-.1196-.377-.233-.8676-.233-1.0087 0-.0337.064-.0369.3155-.0215.23.0153.4108.0094.6745-.0305.3127-.046.4202-.049.7514-.0183.2115.0184.3923.0396.3984.0488.0245.0214.4968 1.5575.5765 1.8702.1656.6408.1688.687.2025 2.2996.0153.8431.0304 1.8426.0366 2.2228.0061.6407.0124.7111.089.9932.0981.3587.2054.5919.4261.9108.089.1257.2238.3464.3005.4874.1533.2852.3527.521.6103.7172.3372.2606.6652.4724.8676.5644.2422.1103.4382.2849.6314.5577.0797.1104.1932.2609.2545.3375.0613.0767.1378.1932.1716.2607.0582.1226.0766.1348.4078.233.1532.0459.5762.0548.8123.015.1318-.0216.1812-.052.3928-.2574.285-.276.42-.469.42-.607 0-.2146.0303-.279.156-.3281.0798-.0307.1196-.0673.1196-.1041 0-.1932-.2023-.9723-.3066-1.1747-.0674-.1349-.9471-1.324-1.686-2.2836-.7849-1.0148-1.061-1.4567-1.2234-1.935-.0521-.1624-.2481-1.2754-.3708-2.143-.0889-.6224-.2608-1.2386-.5306-1.9223-.092-.233-.1564-.4228-.141-.4228.0735 0 1.6526.4415 1.7445.4875.0583.0307.2974.159.5274.2878.23.1318.4537.2363.4935.2363.046 0 .239.1073.466.2606l.3895.2606.2025-.0155c.2912-.0276.346-.0398.4687-.1256.1748-.1196.2792-.138.4172-.0736.2667.1257.4507.1472.2883.0338-.2422-.1687-.2667-.2516-.1257-.4632.1687-.2575.1867-.2757.3614-.3646.279-.141.2976-.1745.3895-.6774.043-.2452.1011-.4848.1257-.5338.0705-.1472.0553-.2419-.0642-.3553-.0614-.0583-.1627-.1904-.2302-.2916-.095-.1472-.1223-.2175-.1223-.3248 0-.1196-.0124-.144-.1013-.1992a1.3114 1.3114 0 0 0-.218-.1074c-.1318-.046-.3369-.2635-.3093-.3248a2.3155 2.3155 0 0 0 .0337-.083c.0246-.0613-.2239-.1962-.4692-.2545-.2452-.0582-.2421-.0583-.1992-.1073.0215-.0276.0212-.1227.0028-.3005-.092-.84-.4321-1.4285-.9993-1.7259-.1226-.0644-.2299-.1288-.239-.1471-.0583-.089-.7818-.365-1.1803-.4477-.1257-.0245-.3744-.0857-.5522-.1378-.1778-.049-.4504-.1016-.6098-.12-.4568-.043-1.073-.147-1.2754-.2114-.1012-.0307-.3403-.0858-.5335-.1195-.1931-.0368-.3587-.0766-.368-.0919-.0122-.0184-.0858-.0156-.187.0028-.1164.0215-.2912.0217-.5671-.0028-.2177-.0215-.7573-.034-1.1957-.031-.6745.0031-.8585-.0057-1.2019-.0609-.2207-.0368-.518-.0646-.659-.0646-.3373-.0031-1.331-.1042-1.1531-.1196.0276 0 .1195-.0181.2053-.0365.141-.0307.1504-.0372.1228-.0985-.0306-.0644-.0458-.0673-.478-.0642-.368 0-.4539.0094-.4815.0492-.0306.0399-.0615.0428-.1964.0183-.144-.0306-.1533-.0368-.1073-.0736.049-.0368.0492-.046.0094-.0736-.0246-.0153-.0676-.031-.0952-.031-.0399 0-1.9562-.19-2.7533-.2727-.1564-.0184-.2941-.0365-.3033-.0488-.0092-.0092.0061-.0154.0337-.0154.0307 0 .052-.0124.052-.0277 0-.046-.156-.058-.3707-.0244-.1502.0215-.2303.0213-.2794-.0032-.0582-.0246-.0395-.0273.0924-.015.2912.0306.1683-.0401-.1383-.077-.1656-.0214-.3372-.043-.3801-.0491a.486.486 0 0 1-.1379-.046c-.0306-.0184-.3679-.0763-.748-.1284-.3802-.0521-.8065-.1291-.9506-.172-.4967-.141-.9532-.371-1.2169-.607l-.1382-.1224.0492-.1167c.1011-.2422.2299-.3832.4598-.4936.3158-.1533.46-.178 1.0762-.1964.561-.0122.693-.0365.6286-.1101-.0307-.043-.472-.1106-.6928-.1106-.138 0-.4815-.0674-.7973-.1594a1.2257 1.2257 0 0 0-.4003-.0488zm8.8497 2.9503a.3051.3051 0 0 0-.0675.0051c-.181.0307-.285.0734-.3769.15l-.0919.0736.1472.0033c.1564 0 .239-.0306.3525-.1317.0713-.0644.0838-.0963.0366-.1003zm5.7762.951c.0383-.0023.0814.0089.1626.0319.092.0276.193.0401.2236.031.0307-.0093.0674-.0033.0797.0182.0153.0276-.0305.0308-.1838.0155-.1349-.0154-.2025-.0126-.2025.0089 0 .0184.0368.04.0858.0492.2238.049.2607.0737.0675.0553-.1103-.0123-.276-.0213-.368-.0244-.1594 0-.1684.003-.1776.0797-.0092.0705-.0307.0856-.181.1163-.2053.0398-.1775.0428-.3308-.0277-.138-.0674-.4418-.141-.819-.1992-.141-.0215-.2112-.0396-.1621-.0427.0521 0 .3342.0307.6286.0736.5457.0767.6988.0919.6651.0582-.0092-.0092-.2483-.0644-.5334-.1196l-.5151-.1012.3004-.0033c.2637-.003.3098.0064.3895.0647.0675.049.1011.0583.1256.0337.0215-.0214.1133-.028.2574-.0187.1931.0153.2452.0095.3525-.0488.0628-.0322.0966-.0483.135-.0506zm-4.3466.5128c.0152-.0005.0284.0022.036.0099.0124.0092.0002.0306-.0243.0459-.0582.0368-.0828.037-.1073.0033-.0138-.0253.0499-.0575.0956-.059zm4.9869.09c.0057-.002.0158.0105.0342.0366.0214.0276.0673.052.098.052.049 0 .0524.006.0126.0305-.0245.0153-.0522.0276-.0614.0276-.0613-.0061-.0919-.0428-.0919-.098.0015-.0306.0027-.0468.0085-.0487zm-3.9515.1805c-.0613 0-.104.052-.104.1256 0 .0153.0702.0276.156.0276.1472 0 .1536-.003.1168-.052-.0613-.0797-.0983-.1012-.1688-.1012zm6.1901 1.8304c.0215-.0092.0738.012.1167.0426.0675.0521.0674.0584.0122.0553-.0858 0-.184-.0765-.1289-.098Z\"></path></g></svg>\n            </div>\n            <div class=\"menu__text\">Shikimori</div>\n        </li>");
        button.on("hover:enter", function () {
             // Push the Shikimori catalog component when the menu item is selected
            Lampa.Activity.push({
                url: '', // Not needed for component push
                title: 'Shikimori', // Title for the activity
                component: 'LMEShikimori', // Name of the component to open
                page: 1 // Start on the first page
            });
        });
         // Append the menu item to the first menu list found
        $(".menu .menu__list").eq(0).append(button);
    }

    /**
     * Basic Lazy Load Implementation (optional but good for performance)
     * Scans for images with class 'lazy' and loads them when they become visible.
     */
     function simpleLazyLoad() {
         var lazyImages = [].slice.call(document.querySelectorAll("img.lazy"));
         if ("IntersectionObserver" in window) {
             let lazyImageObserver = new IntersectionObserver(function(entries, observer) {
                 entries.forEach(function(entry) {
                     if (entry.isIntersecting) {
                         let lazyImage = entry.target;
                         if (lazyImage.dataset.src) {
                             lazyImage.src = lazyImage.dataset.src;
                             lazyImage.classList.remove("lazy");
                             lazyImageObserver.unobserve(lazyImage);
                         }
                     }
                 });
             });
             lazyImages.forEach(function(lazyImage) {
                 lazyImageObserver.observe(lazyImage);
             });
         } else {
             // Fallback for browsers without IntersectionObserver
             lazyImages.forEach(function(lazyImage) {
                  if (lazyImage.dataset.src) {
                     lazyImage.src = lazyImage.dataset.src;
                     lazyImage.classList.remove("lazy");
                  }
             });
         }
     }


    /**
     * Initializes the Plugin.
     * Sets up styles, templates, components, and menu item.
     */
    function startPlugin() {
        // Prevent re-initialization
        if (window.plugin_shikimori_ready) return;
        window.plugin_shikimori_ready = true;

        // Define plugin manifest (optional but good practice)
        var manifest = {
            type: "other",
            version: "0.1",
            name: "LME Shikimori",
            description: "Add Shikimori catalogue",
            component: "LMEShikimori" // Component name
        };
        // Assign manifest to Lampa (adjust if Lampa handles manifests differently)
        Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};
        Lampa.Manifest.plugins[manifest.component] = manifest;


        // Add custom CSS styles
        var style = `
            .LMEShikimori-catalog--list.category-full {
                -webkit-box-pack: justify !important;
                -webkit-justify-content: space-between !important;
                -ms-flex-pack: justify !important;
                justify-content: space-between !important;
                 display: flex; /* Ensure flex layout */
                 flex-wrap: wrap; /* Allow items to wrap */
            }
            .LMEShikimori-head.torrent-filter {
                margin-left: 1.5em;
            }
             /* Card specific styles */
            .LMEShikimori.card {
                width: 185px; /* Standard poster width */
                height: auto; /* Adjust height */
                margin-bottom: 1.5em;
                margin-left: 10px; /* Add some horizontal spacing */
                margin-right: 10px;/* Add some horizontal spacing */
            }
             .LMEShikimori .card__view {
                 position: relative;
                 padding-top: 150%; /* 2:3 aspect ratio for poster */
                 background-color: rgba(255,255,255,0.05);
                 border-radius: 0.3em;
                 overflow: hidden;
             }
              .LMEShikimori .card__img {
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
             }
            .LMEShikimori .card__type {
                position: absolute;
                top: 0.5em;
                left: 0.5em;
                background: #ff4242; /* Example background color */
                color: #fff;
                padding: .2em .4em;
                border-radius: .3em;
                font-size: .8em;
                z-index: 1; /* Ensure it's above the image */
            }
            .LMEShikimori .card__vote {
                position: absolute;
                top: 0.5em;
                right: 0.5em;
                background: rgba(0, 0, 0, 0.7); /* Example background color */
                color: #fff;
                padding: .2em .4em;
                border-radius: .3em;
                font-size: .8em;
                 z-index: 1; /* Ensure it's above the image */
            }
            .LMEShikimori .card__season {
                position: absolute;
                left: -0.8em;
                top: 3.4em; /* Adjust position */
                padding: .4em .4em;
                background: #05f; /* Example background color */
                color: #fff;
                font-size: .8em;
                border-radius: .3em;
                 z-index: 1; /* Ensure it's above the image */
            }
            .LMEShikimori .card__status {
                position: absolute;
                left: -0.8em;
                bottom: 1em; /* Adjust position */
                padding: .4em .4em;
                background: #ffe216; /* Example background color */
                color: #000;
                font-size: .8em;
                border-radius: .3em;
                 z-index: 1; /* Ensure it's above the image */
            }
            .LMEShikimori.card__season.no-season {
                display: none; /* Hide season if not available */
            }
             .LMEShikimori .card__title {
                 margin-top: 0.5em;
                 font-size: 0.9em;
                 white-space: nowrap;
                 overflow: hidden;
                 text-overflow: ellipsis;
            }

            /* Styles for Shikimori data in the full card view */
            .full-start__rate.rate--shikimori {
                 margin-right: 1em; /* Add some space */
            }
        `;
        Lampa.Template.add('LMEShikimoriStyle', `<style>${style}</style>`);

        // Add card template with placeholders for dynamic data
        Lampa.Template.add("LMEShikimori-Card", `
            <div class="LMEShikimori card selector layer--visible layer--render">
                <div class="LMEShikimori card__view">
                    <img data-src="{img}" src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="LMEShikimori card__img lazy" alt="{title}" />
                    <div class="LMEShikimori card__type">{type}</div>
                    ${'' /* Only show vote if rate is provided */}
                    ${'{rate}' !== '' ? '<div class="LMEShikimori card__vote">{rate}</div>' : ''}
                    <div class="LMEShikimori card__season">{season}</div>
                    <div class="LMEShikimori card__status">{status}</div>
                </div>
                <div class="LMEShikimori card__title">{title}</div>
            </div>
        `);

        // Register the main Shikimori catalog component
        Lampa.Component.add(manifest.component, Component$1);

        // Initialize the full card enhancer
        FullCardEnhancer();

        // Append styles to the body
        $('body').append(Lampa.Template.get('LMEShikimoriStyle', {}, true));

        // Add the menu item when the Lampa app is ready
        if (window.appready) addMenuItem();
        else {
            Lampa.Listener.follow("app", function (e) {
                if (e.type === "ready") addMenuItem();
            });
        }

        // Listen for activity changes that might reveal the component and trigger lazy load
         Lampa.Listener.follow('activity', function(e) {
              if (e.type === 'resumed' || e.type === 'start') {
                  // Check if the current component is ours
                  if (Lampa.Activity.active() && Lampa.Activity.active().component === 'LMEShikimori') {
                       // Use a timeout to ensure DOM is ready
                       setTimeout(simpleLazyLoad, 100);
                  }
              }
         });
    }

    // Start the plugin initialization
    if (!window.plugin_shikimori_ready) startPlugin();

})();
