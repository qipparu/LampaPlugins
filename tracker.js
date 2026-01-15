/**
 * Плагин для Lampa
 * Заменяет "Сейчас смотрят" на главной странице на историю просмотров пользователя
 */
(function () {
    function start() {
        console.log('Plugin History Replace', 'started');

        // Перехватываем вызов отрисовки строк контента
        var originalCall = Lampa.ContentRows.call;

        Lampa.ContentRows.call = function (screen, params, calls) {
            // Сначала вызываем оригинальный метод, чтобы получить стандартные строки
            originalCall(screen, params, calls);

            // Если мы на главной странице
            if (screen == 'main') {
                // Получаем историю просмотров (тип 'history')
                var history = Lampa.Favorite.get({
                    type: 'history'
                });

                // Если история не пуста, заменяем первую строку (Сейчас смотрят)
                if (history.length) {
                    console.log('Plugin History Replace', 'replacing "Now Watch" with history');

                    // В TMDB и CUB "Сейчас смотрят" всегда идет первой (индекс 0 в parts_data)
                    calls[0] = function (call) {
                        call({
                            results: history.slice(0, 20),
                            title: Lampa.Lang.translate('title_history')
                        });
                    };
                }
            }
        };
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
