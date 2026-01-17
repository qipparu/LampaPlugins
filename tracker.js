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
        var updateDelay = 15000; // Задержка в миллисекундах (15 секунд)
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
                    if (json && json.data) callback(json.data.animes || []);
                    else callback([]);
                } catch (e) {
                    callback([]);
                }
            }, function () {
                callback([]);
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
            network.silent('https://arm.haglund.dev/api/v2/ids?source=myanimelist&include=themoviedb&id=' + malId, function (data) {
                if (data && data.themoviedb) {
                    tmdbCache[malId] = data.themoviedb;
                    callback(data.themoviedb);
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

            function tryFetch(currentType, fallback) {
                network.silent('https://api.tmdb.org/3/' + currentType + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=ru', function (data) {
                    if (data && data.poster_path) {
                        var img = 'https://image.tmdb.org/t/p/original' + data.poster_path;
                        posterCache[tmdbId] = img;
                        callback(img);
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

            tryFetch(type, function () {
                tryFetch(otherType, null);
            });
        }

        /**
         * Преобразование элементов Shikimori в формат TopShelf
         */
        function mapShikimoriItems(shikiItems, callback) {
            var items = new Array(shikiItems.length);
            var processed = 0;

            if (shikiItems.length === 0) return callback([]);

            shikiItems.forEach(function (shiki, index) {
                getTMDBId(shiki.malId, function (tmdbId) {
                    if (tmdbId) {
                        getTMDBPoster(tmdbId, shiki.kind, function (posterURL) {
                            items[index] = {
                                id: tmdbId.toString(),
                                title: shiki.russian || shiki.name,
                                imageURL: posterURL || (shiki.poster ? shiki.poster.mainUrl : ''),
                                deepLink: 'lampa://topshelf?card=' + tmdbId + '&media=' + (shiki.kind === 'movie' ? 'movie' : 'tv') + '&source=tmdb'
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

                var sections = [];
                if (continueItems.length) {
                    sections.push({
                        title: 'Продолжить просмотр',
                        imageShape: 'poster',
                        items: continueItems
                    });
                }

                // 2. Секции из Shikimori
                var NOW_AIRING_QUERY = 'query { animes(status: "ongoing", order: popularity, limit: 10) { malId russian name kind poster { mainUrl } } }';
                var RECENTLY_RELEASED_QUERY = 'query { animes(status: "released", order: aired_on, limit: 10) { malId russian name kind poster { mainUrl } } }';

                fetchShikimori(NOW_AIRING_QUERY, function (ongoingItems) {
                    mapShikimoriItems(ongoingItems, function (mappedOngoing) {
                        if (mappedOngoing.length) {
                            sections.push({
                                title: 'Сейчас выходят',
                                imageShape: 'poster',
                                items: mappedOngoing.slice(0, 5)
                            });
                        }

                        fetchShikimori(RECENTLY_RELEASED_QUERY, function (releasedItems) {
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
