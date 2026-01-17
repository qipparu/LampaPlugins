/**
 * Плагин для Lampa
 * Добавляет "Продолжить просмотр" из раздела Аниме в самый верх главной страницы
 */
(function () {
    function start() {
        console.log('Plugin Anime Continue Add', 'started');

        function updateAppleTVTopShelf() {
            try {
                var animeContinues = Lampa.Favorite.continues('anime');
                var items = animeContinues.slice(0, 20).map(function (item) {
                    return {
                        id: item.id.toString(),
                        title: item.title || item.name,
                        imageURL: item.img || item.poster,
                        deepLink: 'lampa://topshelf?card=' + item.id + '&media=' + (item.method || 'tv') + '&source=' + (item.source || 'tmdb')
                    };
                });

                var data = {
                    updatedAt: Math.floor(Date.now() / 1000),
                    sections: [
                        {
                            title: 'Продолжить просмотр аниме',
                            imageShape: 'poster',
                            items: items
                        }
                    ]
                };

                if (items.length) {
                    Lampa.Storage.set('appletv_topshelf', JSON.stringify(data));
                    window.location.assign('lampa://topshelfupdate');
                    console.log('Plugin Anime Continue Add', 'TopShelf updated', data);
                }
            } catch (e) {
                console.log('Plugin Anime Continue Add', 'TopShelf error:', e.message);
            }
        }

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
