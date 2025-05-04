(function () {

    'use strict';

    // Определяем шаблон стандартной карточки Lampa с использованием placeholders {}
    // Используем классы, стандартные для карточек в Lampa
    var standardLampaCardTemplate = `
        <div class="card selector">
            <div class="card__view">
                <img src="{img}" class="card__img" alt="{title}" loading="lazy" />
            </div>
            <div class="card__title">{title}</div>
        </div>
    `;

    // Функция для создания объекта карточки (обертка над DOM элементом)
    function HanimeCard(data) {
        // Используем Lampa.Template.get для правильной подстановки данных в шаблон
        var cardElement = $(Lampa.Template.get('standard-lampa-card', {
            img: data.poster || '',
            title: data.name || ''
        }));

        this.render = function () {
            return cardElement;
        };

        this.destroy = function () {
            cardElement.remove();
        };
    }

    // Главный компонент Hanime Catalog
    function HanimeComponent() {
        var network = new Lampa.Reguest();
        // Главный вертикальный скролл, который будет содержать горизонтальные ряды
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = []; // Массив всех объектов карточек для управления памятью
        var html = $('<div></div>'); // Корневой DOM элемент компонента
        // Используем scroll.render().find('.scroll__body') как контейнер для items-line
        var body = null; // Будет инициализирован после рендеринга scroll

        var last; // Последний сфокусированный элемент

        // Адреса API
        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URLS = {
            newset: {
                title: 'Новые поступления', // Заголовок для ряда
                url: API_BASE_URL + "/catalog/movie/newset.json"
            },
            recent: {
                 title: 'Недавние',
                 url: API_BASE_URL + "/catalog/movie/recent.json"
             },
            mostlikes: {
                 title: 'Популярные (лайки)',
                 url: API_BASE_URL + "/catalog/movie/mostlikes.json"
             },
             mostviews: {
                 title: 'Популярные (просмотры)',
                 url: API_BASE_URL + "/catalog/movie/mostviews.json"
             }
        };

        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var PROXY_BASE_URL = "http://77.91.78.5:3000"; // Адрес прокси

        // Список категорий для отображения в горизонтальных рядах
        var categoriesToShow = ['newset', 'recent', 'mostlikes', 'mostviews'];
        var loadedCategories = 0; // Счетчик загруженных категорий
        var allMetas = {}; // Объект для хранения метаданных по категориям

        // Функция для загрузки данных каталога для всех выбранных категорий
        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true); // Показываем лоадер
            loadedCategories = 0; // Сбрасываем счетчик
            allMetas = {}; // Очищаем данные

            categoriesToShow.forEach(function(categoryKey) {
                var category = CATALOG_URLS[categoryKey];
                if (category) {
                     network.native(category.url,
                         function (data) {
                             // Успешный ответ для категории
                             if (data && data.metas && Array.isArray(data.metas)) {
                                 allMetas[categoryKey] = data.metas; // Сохраняем метаданные
                             } else {
                                 console.warn("Hanime Plugin: Invalid data format for category", categoryKey, data);
                                 allMetas[categoryKey] = []; // Сохраняем пустой массив при ошибке
                             }
                             loadedCategories++;
                             _this.checkIfAllCategoriesLoaded(); // Проверяем, все ли категории загружены
                         },
                         function (errorStatus, errorText) {
                             // Ошибка загрузки для категории
                             console.error("Hanime Plugin: Failed to load catalog for category", categoryKey, errorStatus, errorText);
                             allMetas[categoryKey] = []; // Сохраняем пустой массив при ошибке
                             loadedCategories++;
                             _this.checkIfAllCategoriesLoaded(); // Проверяем, все ли категории загружены
                         },
                         false,
                         {
                             dataType: 'json',
                             timeout: 15000
                         }
                     );
                }
            });
        };

        // Функция для проверки, все ли категории загружены
        this.checkIfAllCategoriesLoaded = function() {
            if (loadedCategories === categoriesToShow.length) {
                this.build(allMetas); // Если все загружено, строим интерфейс
            }
        };


        // Функция для построения горизонтальных рядов с карточками
        this.build = function (categoriesData) {
            var _this = this;
            var hasContent = false; // Флаг наличия контента

            // Очищаем предыдущие ряды и карточки
            items.forEach(function(item) { item.destroy(); });
            items = [];
            scroll.render().find('.scroll__body').empty(); // Очищаем контейнер в скролле
            body = scroll.render().find('.scroll__body'); // Обновляем ссылку на body

            categoriesToShow.forEach(function(categoryKey) {
                var category = CATALOG_URLS[categoryKey];
                var metas = categoriesData[categoryKey] || [];

                if (metas.length > 0) {
                    hasContent = true; // Есть контент хотя бы в одной категории

                    // Создаем элемент items-line для ряда
                    var itemsLine = $('<div class="items-line layer--visible layer--render items-line--type-cards"></div>');
                    var itemsLineHead = $('<div class="items-line__head"></div>');
                    var itemsLineTitle = $('<div class="items-line__title">' + category.title + '</div>');
                    var itemsLineMore = $('<div class="items-line__more selector">Еще</div>'); // Кнопка "Еще"

                    // Обработчик для кнопки "Еще"
                    itemsLineMore.on('hover:enter', function() {
                        console.log("Show all items for category:", categoryKey);
                        // Здесь можно реализовать логику открытия отдельного экрана со всеми элементами этой категории
                        // Например, новую активность с vertical scroll компонентом, который загрузит все элементы этой категории
                        // Lampa.Activity.push({
                        //     url: '',
                        //     title: category.title,
                        //     component: 'hanime_catalog_full', // Название нового компонента для полного списка
                        //     params: { category: categoryKey } // Передаем параметры для загрузки полного списка
                        // });
                        Lampa.Noty.show("Функция 'Еще' пока не реализована."); // Заглушка
                    });

                    itemsLineHead.append(itemsLineTitle);
                    itemsLineHead.append(itemsLineMore);
                    itemsLine.append(itemsLineHead);

                    // Создаем горизонтальный скролл для карточек в этом ряду
                    var itemsLineBody = $('<div class="items-line__body"></div>');
                    var horizontalScroll = new Lampa.Scroll({ mask: true, over: true, horizontal: true, step: 200 });
                    var horizontalScrollBody = horizontalScroll.render().find('.scroll__body'); // Контейнер для карточек в горизонтальном скролле

                    // Добавляем карточки в горизонтальный скролл
                    metas.forEach(function (meta) {
                        var card = new HanimeCard(meta);
                        var cardElement = card.render();

                         // Добавляем обработчики событий hover:focus и hover:enter для карточек
                         cardElement.on('hover:focus', function () {
                             last = cardElement[0]; // Сохраняем последний сфокусированный элемент
                             // Обновляем положение родительского вертикального скролла, чтобы активный ряд был виден
                             scroll.update(itemsLine, true);
                             // Обновляем положение горизонтального скролла внутри ряда
                             horizontalScroll.update(cardElement, true);
                         }).on('hover:enter', function () {
                             console.log("Selected Anime:", meta.id, meta.name);
                             _this.fetchStreamAndMeta(meta.id, meta); // Вызываем загрузку потока
                         });

                        horizontalScrollBody.append(cardElement);
                        items.push(card); // Добавляем объект карточки в общий массив items
                    });

                    itemsLineBody.append(horizontalScroll.render(true));
                    itemsLine.append(itemsLineBody);

                    // Добавляем готовый items-line в основной вертикальный скролл
                    body.append(itemsLine);
                }
            });

            // Проверяем, добавлен ли главный скролл в основной html контейнер, добавляем один раз
            if (html.find('.scroll-box').length === 0) {
                html.append(scroll.render(true));
            }

            // После добавления всех элементов и настройки DOM, сообщаем Lampa о завершении загрузки
            _this.activity.loader(false);
            _this.activity.toggle(); // Переключаем активность, чтобы Lampa обновила контроллер

            // Если контента нет вообще, показываем сообщение
            if (!hasContent) {
                 _this.empty("Каталог пуст.");
            } else {
                 // Иначе, настраиваем onEnd для главного вертикального скролла (если нужна пагинация или другое действие в конце)
                 // В данном случае пагинация не поддерживается API, поэтому просто сообщаем об этом.
                scroll.onEnd = function () {
                    console.log("Reached end of main scroll.");
                    // Lampa.Noty.show("Конец списка категорий");
                };
            }

        };

         // Функция для загрузки потока и метаданных аниме по ID
         this.fetchStreamAndMeta = function (id, meta) {
             var _this = this;
             var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);

             _this.activity.loader(true); // Показываем лоадер

             network.native(streamUrl,
                 function(streamData) {
                     _this.activity.loader(false); // Скрываем лоадер

                     const fullMetaData = meta; // Используем уже полученные метаданные из каталога

                     console.log("Stream Data:", streamData);
                     console.log("Full Meta Data:", fullMetaData);

                     // Проверяем наличие потоков в ответе
                     if (streamData && streamData.streams && streamData.streams.length > 0) {
                         // Выбираем первый поток (можно добавить логику выбора потока по качеству и т.п.)
                         var streamToPlay = streamData.streams[0];

                         var finalStreamUrl = streamToPlay.url;
                         // Проксируем URL, если он ведет на определенные домены
                         try {
                             var url = new URL(finalStreamUrl);
                             if (url.hostname.includes('highwinds-cdn.com') || url.hostname.includes('proxy.hentai.stream')) {
                                 finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                                 console.log("Original stream URL proxied:", finalStreamUrl);
                             }
                         } catch (e) {
                             console.error("Hanime Plugin: Failed to parse or proxy stream URL", e);
                             // Продолжаем использовать оригинальный URL, если проксирование не удалось
                         }


                         // Формируем объект для плеера
                         var playerObject = {
                             title: fullMetaData.name || fullMetaData.title || 'Без названия', // Заголовок из метаданных
                             url: finalStreamUrl, // URL потока (возможно, проксированный)
                             poster: fullMetaData.poster || fullMetaData.background, // Постер из метаданных
                         };

                         // Запускаем плеер, если есть URL потока
                         if (playerObject.url) {
                             console.log("Launching player with:", playerObject);
                             Lampa.Player.play(playerObject);
                             Lampa.Player.playlist([playerObject]); // Добавляем в плейлист (если нужно)

                             // Добавляем в историю просмотров
                             if (fullMetaData) {
                                 const historyMeta = {
                                     id: fullMetaData.id,
                                     title: fullMetaData.name || fullMetaData.title,
                                     poster: fullMetaData.poster || fullMetaData.background,
                                 };
                                 Lampa.Favorite.add('history', historyMeta, 100); // Добавить в историю, лимит 100 записей
                             }

                         } else {
                             Lampa.Noty.show('Не удалось получить ссылку на поток.');
                             console.error("Hanime Plugin: No valid stream URL found in stream data:", streamData);
                         }

                     } else {
                         Lampa.Noty.show('Потоки не найдены для этого аниме.');
                         console.warn("Hanime Plugin: No streams found or invalid stream data structure:", streamData);
                     }

                 },
                 function(errorStatus, errorText) {
                     // Ошибка при загрузке потока
                      _this.activity.loader(false); // Скрываем лоадер
                      console.error("Hanime Plugin: Failed to fetch stream details", errorStatus, errorText);
                      Lampa.Noty.show('Ошибка загрузки потока: ' + errorStatus);
                 },
                  false, // Не кешировать запрос
                  {
                      dataType: 'json', // Ожидаем JSON
                      timeout: 10000 // Таймаут запроса
                  }
             );
         };


        // Функция для отображения сообщения об отсутствии данных во всех категориях
        this.empty = function (msg) {
            var empty = new Lampa.Empty({ message: msg });
            // Очищаем скролл и добавляем сообщение
            scroll.render().empty().append(empty.render(true));

             // Добавляем скролл в основной контейнер, если еще не добавлен
             if (html.find('.scroll-box').length === 0) {
                 html.append(scroll.render(true));
             }

            this.activity.loader(false); // Скрываем лоадер
            this.activity.toggle(); // Переключаем активность
            this.start = empty.start; // Переназначаем start на метод Empty (для обработки кнопки OK)
        };

        // Инициализация компонента
        this.create = function () {
             // Нет кнопок в хедере, поэтому headeraction не нужен
             this.fetchCatalog(); // Загружаем каталог для всех категорий
        };

        // Запуск компонента (когда он становится активным)
        this.start = function () {
            // Проверяем, что это текущая активная активность
            if (Lampa.Activity.active().activity !== this.activity) return;

            // Добавляем обработчики навигации для контроллера 'content'
            Lampa.Controller.add('content', {
                toggle: function () {
                    // Установка коллекции элементов для навигации стрелками
                    // Lampa автоматически найдет все элементы с классом 'selector' внутри scroll.render()
                    Lampa.Controller.collectionSet(scroll.render());
                    // Фокусировка на последнем активном элементе или первом
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                // Обработка нажатий стрелок и кнопки Назад
                left: function () {
                    // Двигаемся влево в текущей коллекции (горизонтальный скролл или "Еще" кнопка)
                    Navigator.move('left');
                },
                right: function () {
                     // Двигаемся вправо в текущей коллекции (горизонтальный скролл или "Еще" кнопка)
                    Navigator.move('right');
                },
                up: function () {
                     // Двигаемся вверх в текущей коллекции (переход между горизонтальными рядами или на "Еще" кнопку/заголовок ряда)
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head'); // Если нельзя двигаться вверх, возможно, переходим на хедер Lampa
                },
                down: function () {
                     // Двигаемся вниз в текущей коллекции (переход между горизонтальными рядами)
                    Navigator.move('down');
                },
                back: this.back // Обработка кнопки Назад
            });

            // Устанавливаем контроллер для хедера Lampa (если есть кастомные кнопки в хедере)
            // В данном случае у нас нет кастомных кнопок в хедере Lampa, только Home и Filter
            // вставленные в наш scroll. Поэтому отдельный контроллер 'head' может быть не нужен,
            // если Navigator правильно обрабатывает переход между рядами и элементами в них.
            // Если бы мы использовали Lampa.Header.add, тогда бы нужен был отдельный контроллер для хедера.
            // Для данного случая, где кнопки Home и Filter находятся внутри нашего scroll,
            // они будут частью коллекции 'content', и Navigator должен обрабатывать их фокус.
            // Однако, если Navigator по умолчанию не переключается на эти кнопки при движении вверх
            // с первого ряда, возможно, потребуется доработка контроллеров или структуры.
            // Пока оставим только 'content' контроллер, полагаясь на Navigator.

            Lampa.Controller.toggle('content'); // Активируем контроллер 'content'
        };

        // Методы жизненного цикла компонента Lampa
        this.pause = function () {};
        this.stop = function () {};

        // Метод для получения DOM элемента компонента
        this.render = function () {
            return html;
        };
        // Метод для очистки ресурсов компонента
        this.destroy = function () {
            network.clear(); // Отменяем все активные сетевые запросы
            Lampa.Arrays.destroy(items); // Очищаем массив объектов карточек и вызываем их destroy методы
            if (scroll) {
                scroll.onEnd = null; // Удаляем обработчик onEnd
                scroll.destroy(); // Уничтожаем экземпляр скролла
            }
             // Уничтожаем все горизонтальные скроллы внутри items-line
             scroll.render().find('.scroll--horizontal').each(function() {
                 var hScrollElement = $(this);
                 if (hScrollElement[0] && hScrollElement[0].scroll) {
                     hScrollElement[0].scroll.destroy();
                 }
             });

            if (html) html.remove(); // Удаляем корневой DOM элемент компонента
            // Обнуляем ссылки на объекты, чтобы помочь сборщику мусора
            items = null;
            network = null;
            scroll = null;
            html = null;
            body = null;
            last = null;
            allMetas = null;
        };
        // Обработка кнопки Назад в компоненте
        this.back = function () {
            Lampa.Activity.backward(); // Возвращаемся к предыдущей активности
        };
    }

    // Функция для старта плагина
    function startPlugin() {
        // Проверяем, был ли плагин уже инициализирован
        if (window.plugin_hanime_catalog_ready) return;

        window.plugin_hanime_catalog_ready = true; // Устанавливаем флаг инициализации

        // Регистрируем стандартный шаблон карточки с помощью Lampa.Template.add
        Lampa.Template.add('standard-lampa-card', standardLampaCardTemplate);

        // Регистрируем компонент в Lampa
        Lampa.Component.add('hanime_catalog', HanimeComponent);

        // Функция для добавления пункта в меню Lampa
        function addMenuItem() {
            var menu_item = $(`
                <li class="menu__item selector">
                    <div class="menu__ico">
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">Hanime Catalog</div>
                </li>
            `);
            // Обработчик нажатия на пункт меню
            menu_item.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '', // URL для истории
                    title: 'Hanime Catalog', // Заголовок активности
                    component: 'hanime_catalog', // Имя компонента для запуска
                    page: 1 // Начальная страница (для совместимости, хотя пагинация не используется)
                });
            });
            // Добавляем пункт меню в первый список меню Lampa
            $('.menu .menu__list').eq(0).append(menu_item);
        }

        // Ждем готовности приложения Lampa, прежде чем добавлять пункт меню
        if (window.appready) {
             addMenuItem();
        } else {
             Lampa.Listener.follow('app', function (e) {
                 if (e.type === 'ready') {
                     addMenuItem();
                 }
             });
        }
    }

    // Запускаем плагин
    startPlugin();

})();
