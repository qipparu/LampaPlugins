/**
 * Плагин для Lampa
 * Добавляет "Продолжить просмотр" из раздела Аниме в самый верх главной страницы
 */
(function () {
    function start() {
        console.log('Plugin Anime Continue Add', 'started');

        // Устанавливаем флаг кастомного TopShelf
        Lampa.Storage.set('appletv_topshelf_custom', 'true');

        var updateTimer;
        var updateDelay = 0; // Задержка в миллисекундах (15 секунд)
        var loading = false; // Флаг процесса обновления
        // Кеширование (Persistent)
        function loadCache(key) {
            var val = Lampa.Storage.get(key, '{}');
            try { return typeof val === 'string' ? JSON.parse(val) : val; }
            catch (e) { return {}; }
        }

        var tmdbCache = loadCache('shikimori_tmdb_cache');
        var posterCache = loadCache('shikimori_poster_cache');

        function saveCaches() {
            Lampa.Storage.set('shikimori_tmdb_cache', JSON.stringify(tmdbCache));
            Lampa.Storage.set('shikimori_poster_cache', JSON.stringify(posterCache));
        }
        var TMDB_API_KEY = '7f4a0bd0bd3315bb832e17feda70b5cd';

        /**
         * Утилита для запросов к Shikimori GraphQL
         */
        function fetchShikimori(query, callback) {
            var network = new Lampa.Reguest();
            network.native('https://shikimori.one/api/graphql', function (data) {
                try {
                    var json = typeof data === 'string' ? JSON.parse(data) : data;
                    if (json && json.data) callback(json.data);
                    else callback(null);
                } catch (e) {
                    callback(null);
                }
            }, function () {
                callback(null);
            }, JSON.stringify({ query: query }), {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        /**
         * Утилита для маппинга MAL ID -> TMDB ID
         */
        function getTMDBId(malId, callback) {
            if (tmdbCache[malId]) return callback(tmdbCache[malId]);

            var network = new Lampa.Reguest();
            var url = 'https://qipparu.duckdns.org/animeapi/myanimelist/' + malId;

            network.silent(url, function (data) {
                if (data && data.themoviedb) {
                    var result = {
                        id: data.themoviedb,
                        type: data.themoviedb_type
                    };
                    tmdbCache[malId] = result;
                    callback(result);
                }
                else callback(null);
            }, function () {
                callback(null);
            });
        }

        /**
         * Утилита для получения обложки из TMDB
         */
        function getTMDBPoster(tmdbId, kind, callback) {
            if (posterCache[tmdbId]) return callback(posterCache[tmdbId]);

            var network = new Lampa.Reguest();
            var type = (kind === 'movie') ? 'movie' : 'tv';
            var otherType = (type === 'movie') ? 'tv' : 'movie';

            function fetchImages(currentType, fallback) {
                var url = 'https://api.tmdb.org/3/' + currentType + '/' + tmdbId + '/images?api_key=' + TMDB_API_KEY + '&include_image_language=ru,xx,en,ja';

                network.silent(url, function (data) {
                    if (data && data.posters && data.posters.length) {
                        var priorities = ['ru', 'xx', 'en', 'ja'];
                        var found = null;

                        for (var i = 0; i < priorities.length; i++) {
                            var lang = priorities[i];
                            for (var j = 0; j < data.posters.length; j++) {
                                var p = data.posters[j];
                                var pLang = p.iso_639_1;
                                // xx often represents textless, but can be null/empty in some contexts. 
                                // TMDB usually returns "xx" or null for no language.
                                if (pLang == lang || (lang == 'xx' && (!pLang || pLang == 'null'))) {
                                    found = p;
                                    break;
                                }
                            }
                            if (found) break;
                        }

                        if (found) {
                            var img = 'https://image.tmdb.org/t/p/original' + found.file_path;
                            posterCache[tmdbId] = img;
                            callback(img);
                        } else if (fallback) {
                            fallback();
                        } else {
                            callback(null);
                        }
                    } else if (fallback) {
                        fallback();
                    } else {
                        callback(null);
                    }
                }, function () {
                    if (fallback) fallback();
                    else callback(null);
                });
            }

            fetchImages(type, function () {
                fetchImages(otherType, null);
            });
        }

        /**
         * Преобразование элементов Shikimori в формат TopShelf
         */
        function mapShikimoriItems(shikiItems, callback) {
            var items = new Array(shikiItems.length);
            var processed = 0;

            if (!shikiItems || shikiItems.length === 0) return callback([]);

            shikiItems.forEach(function (shiki, index) {
                if (!shiki || !shiki.malId) {
                    items[index] = null;
                    processed++;
                    if (processed === shikiItems.length) {
                        saveCaches();
                        callback(items.filter(Boolean));
                    }
                    return;
                }

                getTMDBId(shiki.malId, function (tmdbInfo) {
                    if (tmdbInfo && tmdbInfo.id) {
                        // Use the type from API or fallback to shikimori kind logic
                        var mediaType = tmdbInfo.type || (shiki.kind === 'movie' ? 'movie' : 'tv');

                        getTMDBPoster(tmdbInfo.id, mediaType, function (posterURL) {
                            items[index] = {
                                id: tmdbInfo.id.toString(),
                                title: shiki.russian || shiki.name,
                                imageURL: posterURL || (shiki.poster ? shiki.poster.mainUrl : ''),
                                deepLink: 'lampa://topshelf?card=' + tmdbInfo.id + '&media=' + mediaType + '&source=tmdb'
                            };
                            processed++;
                            if (processed === shikiItems.length) {
                                saveCaches();
                                callback(items.filter(Boolean));
                            }
                        });
                    } else {
                        items[index] = null;
                        processed++;
                        if (processed === shikiItems.length) {
                            saveCaches();
                            callback(items.filter(Boolean));
                        }
                    }
                });
            });
        }

        /**
         * Функция обновления данных для Apple TV TopShelf
         */
        var lastUpdateTimestamp = 0;
        var UPDATE_INTERVAL = 120 * 60 * 1000; // 5 минут

        /**
         * Функция обновления данных для Apple TV TopShelf
         */
        function updateAppleTVTopShelf(isBackground) {
            if (loading) return;

            // Если не в фоне и прошло меньше времени, чем интервал обновления — пропускаем
            if (!isBackground && (Date.now() - lastUpdateTimestamp < UPDATE_INTERVAL)) {
                console.log('Plugin Anime Continue Add', 'Skipping TopShelf update (throttled)');
                return;
            }

            loading = true;

            try {
                var sections = [];

                // 2. Секции из Shikimori
                var USER_WATCHLIST_QUERY = 'query { userRates(userId: "481150", targetType: Anime, status: watching, limit: 20) { anime { malId russian name kind poster { mainUrl } } } }';
                var ON_HOLD_QUERY = 'query { userRates(userId: "481150", targetType: Anime, status: on_hold, limit: 50) { episodes anime { malId russian name kind episodes poster { mainUrl } } } }';
                var PLANNED_QUERY = 'query { userRates(userId: "481150", targetType: Anime, status: planned, limit: 20, order: { field: updated_at, order: desc }) { anime { malId russian name kind poster { mainUrl } } } }';

                fetchShikimori(USER_WATCHLIST_QUERY, function (userData) {
                    var userItems = (userData && userData.userRates) ? userData.userRates.map(function (r) { return r.anime; }) : [];

                    mapShikimoriItems(userItems, function (mappedUser) {
                        if (mappedUser.length) {
                            sections.push({
                                title: 'Смотрю на Shikimori',
                                imageShape: 'poster',
                                items: mappedUser.slice(0, 10)
                            });
                        }

                        fetchShikimori(ON_HOLD_QUERY, function (holdData) {
                            var holdRates = (holdData && holdData.userRates) ? holdData.userRates : [];

                            // Сортировка: чем меньше осталось серий, тем выше
                            holdRates.sort(function (a, b) {
                                var aTotal = a.anime.episodes || 9999;
                                var bTotal = b.anime.episodes || 9999;
                                var aLeft = aTotal - a.episodes;
                                var bLeft = bTotal - b.episodes;
                                return aLeft - bLeft;
                            });

                            var holdItems = holdRates.map(function (r) { return r.anime; });

                            mapShikimoriItems(holdItems, function (mappedHold) {
                                if (mappedHold.length) {
                                    sections.push({
                                        title: 'Отложенные',
                                        imageShape: 'poster',
                                        items: mappedHold.slice(0, 10)
                                    });
                                }

                                fetchShikimori(PLANNED_QUERY, function (plannedData) {
                                    var plannedItems = (plannedData && plannedData.userRates) ? plannedData.userRates.map(function (r) { return r.anime; }) : [];

                                    mapShikimoriItems(plannedItems, function (mappedPlanned) {
                                        if (mappedPlanned.length) {
                                            sections.push({
                                                title: 'Запланировано',
                                                imageShape: 'poster',
                                                items: mappedPlanned.slice(0, 10)
                                            });
                                        }

                                        // Сохраняем
                                        if (sections.length) {
                                            var data = {
                                                updatedAt: Math.floor(Date.now() / 1000),
                                                sections: sections
                                            };
                                            Lampa.Storage.set('appletv_topshelf', JSON.stringify(data));
                                            console.log('Plugin Anime Continue Add', 'TopShelf JSON saved' + (isBackground ? ' on background' : ''));

                                            // Если мы не в фоне, уведомляем систему об изменении с задержкой
                                            if (!isBackground) {
                                                if (updateTimer) clearTimeout(updateTimer);
                                                updateTimer = setTimeout(function () {
                                                    window.location.assign('lampa://topshelfupdate');
                                                    console.log('Plugin Anime Continue Add', 'TopShelf update triggered');
                                                }, updateDelay);
                                            }
                                        }
                                        loading = false;
                                        lastUpdateTimestamp = Date.now();
                                    });
                                });
                            });
                        });
                    });
                });
            } catch (e) {
                console.log('Plugin Anime Continue Add', 'TopShelf error:', e.message);
                loading = false;
            }
        }

        // Подписываемся на сворачивание приложения
        function onAppBackground(e) {
            console.log('Plugin Anime Continue Add', 'handling app-background');
            updateAppleTVTopShelf(true);
        }

        window.addEventListener('appletv:app-background', onAppBackground);

        // Перехватываем вызов отрисовки строк контента
        var originalCall = Lampa.ContentRows.call;

        Lampa.ContentRows.call = function (screen, params, calls) {
            // Сначала вызываем оригинальный метод, чтобы получить стандартные строки
            originalCall(screen, params, calls);

            // Если мы на главной странице
            if (screen == 'main') {

                // Обновляем TopShelf для Apple TV
                updateAppleTVTopShelf();
            }
        };

        // Обновляем при запуске - убрал, так как ContentRows.call('main') сработает сам
        // updateAppleTVTopShelf();
    }

    // Ждем готовности приложения
    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') start();
        });
    }
})();
