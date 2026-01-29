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
        var tmdbCache = {}; // Кеш для TMDB ID
        var posterCache = {}; // Кеш для путей обложек TMDB
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
            // Use CORS proxy to bypass browser restrictions
            var proxy = 'https://corsproxy.io/?';
            var url = proxy + encodeURIComponent('https://animeapi.my.id/myanimelist/' + malId);

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
                    if (processed === shikiItems.length) callback(items.filter(Boolean));
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
                            if (processed === shikiItems.length) callback(items.filter(Boolean));
                        });
                    } else {
                        items[index] = null;
                        processed++;
                        if (processed === shikiItems.length) callback(items.filter(Boolean));
                    }
                });
            });
        }

        /**
         * Функция обновления данных для Apple TV TopShelf
         */
        function updateAppleTVTopShelf(isBackground) {
            try {
                var animeContinues = Lampa.Favorite.continues('anime');

                /*
                // 1. Секция: Продолжить просмотр
                var continueItems = animeContinues.slice(0, 5).map(function (item) {
                    var img = item.img || item.poster;
                    if (img && img.indexOf('/') === 0) img = 'https://image.tmdb.org/t/p/original' + img;

                    return {
                        id: item.id.toString(),
                        title: item.title || item.name,
                        imageURL: img,
                        deepLink: 'lampa://topshelf?card=' + item.id + '&media=' + (item.method == 'movie' ? 'movie' : 'tv') + '&source=' + (item.source || 'tmdb')
                    };
                });
                */

                var sections = [];
                /*
                if (continueItems.length) {
                    sections.push({
                        title: 'Продолжить просмотр',
                        imageShape: 'poster',
                        items: continueItems
                    });
                }
                */

                // 2. Секции из Shikimori
                var USER_WATCHLIST_QUERY = 'query { userRates(userId: "481150", targetType: Anime, status: watching, limit: 10) { anime { malId russian name kind poster { mainUrl } } } }';
                var NOW_AIRING_QUERY = 'query { animes(status: "ongoing", order: popularity, limit: 10) { malId russian name kind poster { mainUrl } } }';
                var RECENTLY_RELEASED_QUERY = 'query { animes(status: "released", order: aired_on, limit: 10) { malId russian name kind poster { mainUrl } } }';

                fetchShikimori(USER_WATCHLIST_QUERY, function (userData) {
                    var userItems = (userData && userData.userRates) ? userData.userRates.map(function (r) { return r.anime; }) : [];

                    mapShikimoriItems(userItems, function (mappedUser) {
                        if (mappedUser.length) {
                            sections.push({
                                title: 'Смотрю на Shikimori',
                                imageShape: 'poster',
                                items: mappedUser.slice(0, 5)
                            });
                        }

                        fetchShikimori(NOW_AIRING_QUERY, function (ongoingData) {
                            var ongoingItems = ongoingData ? ongoingData.animes : [];

                            mapShikimoriItems(ongoingItems, function (mappedOngoing) {
                                if (mappedOngoing.length) {
                                    sections.push({
                                        title: 'Сейчас выходят',
                                        imageShape: 'poster',
                                        items: mappedOngoing.slice(0, 5)
                                    });
                                }

                                fetchShikimori(RECENTLY_RELEASED_QUERY, function (releasedData) {
                                    var releasedItems = releasedData ? releasedData.animes : [];

                                    mapShikimoriItems(releasedItems, function (mappedReleased) {
                                        if (mappedReleased.length) {
                                            sections.push({
                                                title: 'Недавно вышедшее',
                                                imageShape: 'poster',
                                                items: mappedReleased.slice(0, 5)
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
                                    });
                                });
                            });
                        });
                    });
                });
            } catch (e) {
                console.log('Plugin Anime Continue Add', 'TopShelf error:', e.message);
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
                // Получаем список "Продолжить просмотр" для аниме
                // Lampa автоматически фильтрует это через Favorite.continues('anime')
                var animeContinues = Lampa.Favorite.continues('anime');

                /*
                // Если есть что продолжать смотреть в аниме, добавляем строку в самое начало
                if (animeContinues.length) {
                    console.log('Plugin Anime Continue Add', 'adding anime continue watching to the top');

                    // Добавляем новую функцию в начало массива calls
                    calls.unshift(function (call) {
                        call({
                            results: animeContinues.slice(0, 20),
                            title: Lampa.Lang.translate('title_continue') // "Продолжить просмотр"
                        });
                    });
                }
                */

                // Обновляем TopShelf для Apple TV
                updateAppleTVTopShelf();
            }
        };

        // Обновляем при запуске
        updateAppleTVTopShelf();
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
