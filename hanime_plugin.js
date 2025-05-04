(function () {
    'use strict';

    // Флаг для проверки, были ли добавлены стили и шаблоны
    // Используем другой флаг, чтобы не конфликтовать с window.plugin_hanime_catalog_ready
    window.hanime_templates_added = false;

    function HanimeCard(data) {
        var cardTemplate = Lampa.Template.get('hanime-card', {
            id: data.id,
            img: data.poster,
            title: data.name,
            // Можете добавить сюда другие данные, если нужно отобразить их на карточке
            // Например: type: data.type, score: data.score (если API это предоставляет)
        });

        var cardElement = $(cardTemplate);

        cardElement.addClass('selector');

        this.render = function () {
            return cardElement;
        };

        this.destroy = function () {
            cardElement.remove();
        };
    }

    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var items = [];
        var html = $('<div class="hanime-catalog"></div>');
        // Добавляем элементы управления в заголовок
        var head = $('<div class="hanime-head torrent-filter"><div class="hanime__catalog-select simple-button simple-button--filter selector">Catalog: Newset</div></div>');
        var body = $('<div class="hanime-catalog__body category-full"></div>');
        var active = 0;
        var last;

        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        // Определяем URLы для разных каталогов
        var CATALOG_URLS = {
            'Newset': API_BASE_URL + "/catalog/movie/newset.json",
            'Recent': API_BASE_URL + "/catalog/movie/recent.json",
            'Most Likes': API_BASE_URL + "/catalog/movie/mostlikes.json",
            'Most Views': API_BASE_URL + "/catalog/movie/mostviews.json",
        };
        // URL текущего используемого каталога (по умолчанию Newset)
        var currentCatalogKey = componentObject.catalog || 'Newset'; // Берем из параметров компонента или дефолт

        // --- Добавлено: Адрес вашего прокси сервера ---
        // Убедитесь, что этот адрес соответствует PROXY_EXTERNAL_BASE_URL в вашем Node.js прокси
        var PROXY_BASE_URL = "http://77.91.78.5:3000";
        // ---------------------------------------------


        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true);

            var catalogUrl = CATALOG_URLS[currentCatalogKey]; // Получаем URL текущего каталога

            network.clear();
            network.native(catalogUrl,
                function (data) {
                    if (data && data.metas && Array.isArray(data.metas)) {
                         if (data.metas.length > 0) {
                            // Очищаем предыдущие элементы, если это не подгрузка следующей страницы (здесь пагинации нет в API, но оставим на будущее)
                            // Пока API не поддерживает пагинацию, всегда очищаем и загружаем весь каталог
                            _this.clearItems(); // Очищаем список при загрузке нового каталога/первой страницы

                            _this.build(data.metas);
                         } else {
                            _this.empty("Каталог пуст.");
                         }
                    } else {
                        _this.empty("Неверный формат данных от API.");
                        console.error("Hanime Plugin: Invalid data format", data);
                    }
                },
                function (errorStatus, errorText) {
                    _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                    console.error("Hanime Plugin: Failed to load catalog", errorStatus, errorText);
                },
                false, // Не кэшируем (чтобы видеть обновления в каталогах)
                {
                    dataType: 'json',
                    timeout: 15000
                }
            );
             // Обновляем текст в заголовке
            head.find('.hanime__catalog-select').text('Catalog: ' + currentCatalogKey);
        };

        // Метод для очистки текущих элементов списка
        this.clearItems = function() {
             console.log("Hanime Plugin: Clearing items.");
             items.forEach(function(item) {
                 item.destroy();
             });
             items = [];
             body.empty();
             // scroll.minus(); // Сброс скролла может понадобиться, если пагинация будет реализована
        };


        this.build = function (result) {
            var _this = this;
            // scroll.minus(); // Сбрасываем минус скролла перед добавлением новых элементов (если нужна пагинация)

            console.log("Hanime Plugin: Building catalog with", result.length, "items.");

            // Put Data
            result.forEach(function (meta) {
                var card = new HanimeCard(meta);
                var cardElement = card.render();

                cardElement.on('hover:focus', function () {
                    last = cardElement[0];
                    active = items.indexOf(card);
                    scroll.update(cardElement, true);
                }).on('hover:enter', function () {
                    console.log("Selected Anime:", meta.id, meta.name);
                    _this.fetchStreamAndMeta(meta.id, meta);
                });

                body.append(cardElement);
                items.push(card);
            });

            // Put blank (структура Lampa)
            // Добавляем заголовок и body в scroll только один раз
            if (scroll.render().find('.hanime-head').length === 0) {
                 scroll.append(head);
            }
             if (scroll.render().find('.hanime-catalog__body').length === 0) {
                scroll.append(body);
            }

            // Обновляем scroll после добавления новых элементов
            scroll.update(); // Обновляем scroll, чтобы он учел новые элементы

            // Put all in page
            if (html.children().length === 0) { // Добавляем scroll в HTML только один раз
                 html.append(scroll.render(true));
            }

            _this.activity.loader(false);
            _this.activity.toggle();
            console.log("Hanime Plugin: Catalog built.");
        };

         // Метод для добавления функционала выбора каталога к заголовку
        this.setupCatalogSelect = function() {
             var selectElement = head.find('.hanime__catalog-select');
             var _this = this;

             selectElement.on('hover:enter', function() {
                 var catalogOptions = Object.keys(CATALOG_URLS).map(function(key) {
                     return {
                         title: key,
                         selected: key === currentCatalogKey,
                         key: key
                     };
                 });

                 Lampa.Select.show({
                     title: 'Select Catalog',
                     items: catalogOptions,
                     onBack: function() {
                         Lampa.Controller.toggle('content'); // Возвращаемся к контенту
                     },
                     onSelect: function(item) {
                         if (item.key !== currentCatalogKey) {
                             currentCatalogKey = item.key;
                             componentObject.catalog = currentCatalogKey; // Сохраняем выбор в параметрах компонента
                             componentObject.page = 1; // Сбрасываем страницу (важно, если бы была пагинация)
                             _this.fetchCatalog(); // Загружаем новый каталог
                         }
                         Lampa.Controller.toggle('content'); // Возвращаемся к контенту после выбора
                     }
                 });
                 Lampa.Controller.toggle('select'); // Переключаемся на контроллер выбора
             });
             console.log("Hanime Plugin: Catalog select setup.");
        };


        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            // URL для получения информации о потоке и метаданных
            var streamUrl = API_BASE_URL + "/stream/movie/" + id + ".json";
            var metaUrl = API_BASE_URL + "/meta/movie/" + id + ".json"; // В API Hanime meta и stream могут приходить вместе

            _this.activity.loader(true);

            // Выполняем запросы стрима и меты параллельно
            // Используем Promise.all, как было ранее
             Promise.all([
                 new Promise((resolve, reject) => {
                     // Используем network.native для запроса Stream URL
                     network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                 }),
                 meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                      // Используем network.native для запроса Meta URL, если метаданных еще нет
                      network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                  })

             ]).then(([streamData, metaDataResponse]) => {
                 // Оба запроса выполнены успешно
                 _this.activity.loader(false);

                 // Объединяем метаданные из разных источников (переданные изначально и полученные по metaUrl)
                 // Предполагаем, что metaDataResponse.meta имеет приоритет, если существует
                 const fullMetaData = metaDataResponse.meta || metaDataResponse || meta;


                 console.log("Stream Data:", streamData);
                 console.log("Full Meta Data:", fullMetaData);

                 if (streamData && streamData.streams && streamData.streams.length > 0) {
                     var streamToPlay = streamData.streams[0]; // Берем первый поток из списка streamData.streams

                     // --- Использование прокси для URL потока (логика из предыдущих шагов) ---
                     var finalStreamUrl = streamToPlay.url; // Берем оригинальный URL потока

                     // Проверяем, является ли URL потока тем, который вызывает проблему CORS (на highwinds-cdn.com)
                     // Если да, оборачиваем его прокси
                     try {
                          var url = new URL(finalStreamUrl);
                          if (url.hostname.includes('highwinds-cdn.com')) {
                              // Оборачиваем оригинальный URL потока адресом прокси
                              finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                              console.log("Original stream URL proxied:", finalStreamUrl);
                          } else {
                             console.log("Stream URL is not highwinds-cdn.com, not proxying:", finalStreamUrl);
                          }
                     } catch (e) {
                         console.error("Hanime Plugin: Failed to parse or proxy stream URL", e);
                         // В случае ошибки парсинга URL, продолжаем использовать оригинальный URL как есть
                         finalStreamUrl = streamToPlay.url;
                     }
                     // -----------------------------------------------------------------------


                     var playerObject = {
                         title: fullMetaData.name || fullMetaData.title || 'Без названия', // Используем имя из меты
                         url: finalStreamUrl, // Используем URL после возможного проксирования
                         poster: fullMetaData.poster || fullMetaData.background, // Используем постер из меты
                         // Можете добавить другие параметры, которые поддерживает плеер Lampa
                     };

                     // Проверяем, что у нас есть URL для плеера
                     if (playerObject.url) {
                          console.log("Launching player with:", playerObject);
                          Lampa.Player.play(playerObject); // Запускаем плеер с выбранным потоком
                          Lampa.Player.playlist([playerObject]); // Опционально: добавляем в плейлист

                          // Добавляем в историю просмотра, если есть полные метаданные
                          if (fullMetaData && fullMetaData.id) {
                                const historyMeta = {
                                    id: fullMetaData.id,
                                    title: fullMetaData.name || fullMetaData.title || 'Без названия',
                                    poster: fullMetaData.poster || fullMetaData.background,
                                    // Добавьте другие доступные поля из fullMetaData, если они есть и нужны для истории
                                    // runtime: fullMetaData.runtime, // Пример: если API предоставляет
                                    // year: fullMetaData.year,     // Пример: если API предоставляет
                                    // original_name: fullMetaData.original_name // Пример: если API предоставляет
                                };
                                Lampa.Favorite.add('history', historyMeta, 100); // Добавляем в историю Lampa
                                console.log("Hanime Plugin: Added to history", historyMeta);
                          } else {
                              console.warn("Hanime Plugin: Skipping history add, fullMetaData or ID missing.", fullMetaData);
                          }

                     } else {
                          // Если потоков нет или URL невалидный
                          Lampa.Noty.show('Не удалось получить ссылку на поток.');
                          console.error("Hanime Plugin: No valid stream URL found in stream data:", streamData);
                     }

                 } else {
                      // Если данные потока пришли, но список streams пуст или невалиден
                      Lampa.Noty.show('Потоки не найдены для этого аниме.');
                      console.warn("Hanime Plugin: No streams found or invalid stream data structure:", streamData);
                 }

             }).catch(error => {
                 // Обработка ошибок запросов stream/meta
                 _this.activity.loader(false);
                 console.error("Hanime Plugin: Failed to fetch stream/meta details", error);
                 // Проверяем, является ли ошибка объектом с message
                 var errorMessage = 'Неизвестная ошибка';
                 if (error instanceof Error) {
                     errorMessage = error.message;
                 } else if (typeof error === 'string') {
                     errorMessage = error;
                 } else if (error && typeof error === 'object' && error.statusText) {
                     errorMessage = error.statusText; // Ошибка из network.native
                 }

                 Lampa.Noty.show('Ошибка загрузки деталей: ' + errorMessage);
             });
        };


        this.empty = function (msg) {
            console.log("Hanime Plugin: Displaying empty state:", msg);
            var empty = new Lampa.Empty({ message: msg });
            html.empty().append(empty.render(true)); // Очищаем и добавляем сообщение "пусто"
            this.activity.loader(false);
            this.activity.toggle();
            // Назначаем start на метод empty, чтобы при фокусе на сообщении "пусто"
            // можно было вернуться к управлению активностью.
             this.start = empty.start;
        };

        this.create = function () {
            console.log("Hanime Plugin: Creating component.");
            this.activity.loader(true);
             this.setupCatalogSelect(); // Настраиваем выбор каталога в заголовке
            this.fetchCatalog(); // Загружаем данные
        };

        this.start = function () {
            // Проверяем, активен ли наш компонент
            if (Lampa.Activity.active().activity !== this.activity) return;

            console.log("Hanime Plugin: Starting component.");

            // Настраиваем контроллер Lampa для навигации
            Lampa.Controller.add('content', {
                toggle: function () {
                    // Устанавливаем коллекцию элементов для навигации
                    // Если last не установлен (например, при первой загрузке), фокусируемся на первом элементе scroll (который должен быть head)
                    var initialFocus = last || scroll.render().find('.simple-button').first()[0];
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(initialFocus, scroll.render());
                    console.log("Hanime Plugin: Controller toggle. Focus on:", initialFocus);
                },
                left: function () {
                    // Обработка стрелки влево
                    if (Navigator.canmove('left')) {
                        Navigator.move('left'); // Если можно двигаться влево в коллекции
                    } else {
                         // Если слева в коллекции ничего нет, и фокус не на голове,
                         // пытаемся переключиться на меню.
                        if (!Lampa.Controller.own(head[0])) { // Проверяем, не находится ли фокус уже на голове
                             Lampa.Controller.toggle('menu'); // Иначе, переключаемся на меню
                        } else {
                             // Если фокус на голове, и движения влево нет в голове,
                             // возможно, ничего не делаем или пытаемся переключиться на меню.
                             // Для кнопок в голове Navigator.canmove('left') должен работать.
                             Lampa.Controller.toggle('menu'); // По умолчанию, переключаемся на меню
                        }
                    }
                },
                right: function () {
                     // Обработка стрелки вправо
                    Navigator.move('right'); // Двигаемся вправо в коллекции
                     // Здесь нет перехода куда-то еще, так как нет боковой панели справа
                },
                up: function () {
                    // Обработка стрелки вверх
                    if (Navigator.canmove('up')) {
                         Navigator.move('up'); // Если можно двигаться вверх в коллекции
                    } else {
                         // Если сверху в коллекции ничего нет, переключаемся на заголовок
                         Lampa.Controller.toggle('head');
                    }
                },
                down: function () {
                     // Обработка стрелки вниз
                    Navigator.move('down'); // Двигаемся вниз в коллекции
                },
                back: this.back // Обработка кнопки "назад"
            });

             // Добавляем контроллер для заголовка
             Lampa.Controller.add('head', {
                 toggle: function() {
                      Lampa.Controller.collectionSet(head); // Коллекция - только элементы заголовка
                      Lampa.Controller.collectionFocus(head.find('.simple-button').first()[0], head); // Фокус на первой кнопке
                      console.log("Hanime Plugin: Head controller toggle.");
                 },
                 left: function() {
                      if (Navigator.canmove('left')) Navigator.move('left'); // Двигаемся влево в заголовке
                      else Lampa.Controller.toggle('menu'); // Переключаемся на меню
                 },
                 right: function() {
                      Navigator.move('right'); // Двигаемся вправо в заголовке
                 },
                 down: function() {
                      Lampa.Controller.toggle('content'); // Переключаемся на контент
                 },
                 back: this.back // Кнопка назад в заголовке
             });


             // Переключаемся на контроллер контента или заголовка при старте
            Lampa.Controller.toggle('content'); // Начинаем с контента

        };

        // Методы жизненного цикла компонента Lampa
        this.pause = function () {
             console.log("Hanime Plugin: Paused");
        };

        this.stop = function () {
             console.log("Hanime Plugin: Stopped");
        };

        this.render = function () {
            // Возвращаем основной HTML элемент компонента
            // true означает вернуть DOM элемент, false - jQuery объект (по умолчанию)
            return html; // Возвращаем jQuery объект
        };

        this.destroy = function () {
             console.log("Hanime Plugin: Destroyed");
            // Очистка ресурсов
            network.clear(); // Отменяем все активные запросы
            Lampa.Arrays.destroy(items); // Уничтожаем элементы карточек
            scroll.destroy(); // Уничтожаем скролл
            html.remove(); // Удаляем HTML из DOM
            // Удаляем контроллеры
             Lampa.Controller.remove('content');
             Lampa.Controller.remove('head');

            // Обнуляем ссылки для сборщика мусора
            items = null;
            network = null;
            scroll = null;
            html = null;
            body = null;
            head = null; // Обнуляем ссылку на заголовок
            last = null;
        };

        this.back = function () {
             console.log("Hanime Plugin: Going back");
            // Проверяем, находимся ли мы на странице фильтров (если она была бы реализована)
            // или просто возвращаемся назад в истории активностей Lampa
             // Если находимся в меню выбора каталога, он обрабатывает back сам.
             // Если в контроллере content или head, возвращаемся назад.
             Lampa.Activity.backward();

        };

        // Добавляем компонент поиска (минимальный вариант, без интеграции с TMDB)
         // Этот метод может быть вызван из Lampa, если плагин зарегистрирует функцию search
         // Например, через Lampa.Plugin.add_search(manifest.component, this.search);
         this.search = function(query) {
             console.log("Hanime Plugin: Search initiated with query:", query);
             // API Hanime не поддерживает поиск через каталог endpoint.
             // Здесь можно было бы перенаправить пользователя на страницу "пусто" с сообщением,
             // или, если API Hanime имеет отдельный endpoint для поиска, использовать его.
             // В данном случае, просто показываем сообщение.
             Lampa.Noty.show('Поиск по API Hanime не поддерживается в этом плагине.');
             // Или можно было бы сделать запрос к API, если endpoint существует
             // Например: network.native(API_BASE_URL + '/search?query=' + encodeURIComponent(query), ...);

             // Важно: Если поиск открывает новую активность или переключает контроллер,
             // нужно убедиться, что текущая активность ставится на паузу и восстанавливается при возврате.
             // В данном простом случае, мы остаемся на текущей странице.
         };


    }

    // Функция для добавления пользовательских стилей и шаблонов
    function addTemplatesAndStyles() {
         // Проверяем, добавлены ли уже стили и шаблоны с помощью нашего флага
         if (window.hanime_templates_added) {
             console.log("Hanime Plugin: Templates and styles already added (via flag).");
             return;
         }
         // Дополнительная проверка через Lampa.Template.get (может вызвать ошибку, если add не сработал)
         // try {
         //      if (Lampa.Template.get('hanime-style') || Lampa.Template.get('hanime-card')) {
         //          console.log("Hanime Plugin: Templates and styles already exist (via get).");
         //          window.hanime_templates_added = true; // Устанавливаем флаг на всякий случай
         //          return;
         //      }
         // } catch (e) {
         //      // Template not found is expected here if not added yet
         // }


         // Добавляем CSS стили
         var style = `
             /* Стили для контейнера каталога */
             .hanime-catalog__body.category-full {
                 justify-content: space-around; /* Распределяем карточки по ширине */
             }
             /* Стили для заголовка с элементами управления */
             .hanime-head {
                 display: flex; /* Располагаем элементы в строку */
                 justify-content: flex-start; /* Выравнивание по левому краю */
                 align-items: center; /* Выравнивание по центру по вертикали */
                 margin-left: 1.5em; /* Отступ слева */
                 margin-bottom: 1em; /* Отступ снизу */
             }
             .hanime-head .simple-button {
                 margin-right: 1em; /* Отступ между кнопками */
                 /* Дополнительные стили для кнопок, если нужно */
             }

             /* Стили для карточки аниме */
             .hanime-card {
                 width: 185px; /* Фиксированная ширина карточки */
                 margin-bottom: 1.5em; /* Отступ снизу */
                 border-radius: 0.5em; /* Скругление углов */
                 overflow: hidden; /* Обрезаем контент, выходящий за границы */
                 transition: transform 0.2s ease, box-shadow 0.2s ease; /* Анимация при фокусе */
                 position: relative; /* Для позиционирования дочерних элементов */
                 box-sizing: border-box; /* Включаем padding и border в размер */
             }
             /* Стили карточки при фокусе */
             .hanime-card.selector:focus {
                 transform: scale(1.05); /* Увеличение при фокусе */
                 box-shadow: 0 0 15px rgba(255, 0, 0, 0.7); /* Красная тень */
                 z-index: 5; /* Поверх других элементов */
                 border: 3px solid rgba(255, 255, 255, 0.5); /* Белая обводка */
             }
              /* Дополнительный стиль фокуса для нативных элементов, если нужно */
              .hanime-card.selector.focus:not(.native) {
                  border-color: transparent;
                  outline: none;
              }

             /* Стили для контейнера изображения/инфо на карточке */
             .hanime-card__view {
                 position: relative; /* Для позиционирования img внутри */
                 height: 270px; /* Фиксированная высота области изображения */
                 background-color: rgba(255,255,255,0.05); /* Полупрозрачный фон */
                 border-radius: 0.5em; /* Скругление углов */
                 overflow: hidden; /* Обрезаем изображение */
             }
              /* Стили для изображения постера */
              .hanime-card__img {
                  position: absolute; /* Абсолютное позиционирование внутри view */
                  width: 100%; /* Растягиваем на всю ширину */
                  height: 100%; /* Растягиваем на всю высоту */
                  object-fit: cover; /* Сохраняем пропорции, обрезая лишнее */
                  border-radius: 0.5em; /* Скругление углов */
              }
              /* Стили для заголовка карточки */
              .hanime-card__title {
                  margin-top: 0.5em; /* Отступ сверху */
                  padding: 0 0.5em; /* Внутренние отступы по бокам */
                  font-size: 1em; /* Размер шрифта */
                  font-weight: bold; /* Жирный шрифт */
                  white-space: nowrap; /* Текст в одну строку */
                  overflow: hidden; /* Обрезаем текст, который не помещается */
                  text-overflow: ellipsis; /* Добавляем многоточие, если текст обрезан */
                  text-align: center; /* Выравнивание по центру */
                  color: #fff; /* Белый цвет текста */
              }
              /* Стили для других элементов карточки (если добавите их в шаблон) */
              /*
              .hanime-card__type, .hanime-card__vote, .hanime-card__season, .hanime-card__status {
                  position: absolute;
                  padding: 0.2em 0.5em;
                  font-size: 0.8em;
                  border-radius: 0.3em;
                  z-index: 2; // Над изображением, но под фокусом
              }
              .hanime-card__type { top: 0.5em; left: 0.5em; background: #ff4242; color: #fff; }
              .hanime-card__vote { top: 0.5em; right: 0.5em; background: #ffe216; color: #000; }
              .hanime-card__season { bottom: 0.5em; left: 0.5em; background: #05f; color: #fff; }
              .hanime-card__status { bottom: 0.5em; right: 0.5em; background: #ffe216; color: #000; }
              */

             /* Стили для иконки в меню */
             .menu__ico svg {
                   width: 1.5em;
                   height: 1.5em;
             }
         `;
         // Добавляем стиль как шаблон в Lampa
         Lampa.Template.add('hanime-style', `<style>${style}</style>`);

         // --- Добавляем стиль в <head> документа ---
         // Используем Lampa.Template.get с true, чтобы получить HTML-элемент <style>
         // Аппендим его в head документа
         $('head').append(Lampa.Template.get('hanime-style', {}, true));
         // ----------------------------------------


         // Добавляем HTML шаблон для карточки
         // Адаптирован на основе вашей структуры, но использует имена полей из примера ответа API Hanime
         var cardTemplate = `
             <div class="hanime-card card selector layer--visible layer--render">
                 <div class="hanime-card__view">
                     <img src="{img}" class="hanime-card__img" alt="{title}" loading="lazy" />
                     </div>
                 <div class="hanime-card__title">{title}</div>
             </div>
         `;
         Lampa.Template.add('hanime-card', cardTemplate);

         // Устанавливаем флаг, что шаблоны добавлены
         window.hanime_templates_added = true;
         console.log("Hanime Plugin: Templates and styles added.");
    }


    // Основная функция инициализации плагина
    function startPlugin() {
        // Проверяем, инициализирован ли плагин уже
        if (window.plugin_hanime_catalog_ready) {
            console.log("Hanime Plugin: Already initialized.");
            return;
        }

        window.plugin_hanime_catalog_ready = true;
        console.log("Hanime Plugin: Starting initialization.");

        // Добавляем стили и шаблоны, и аппендим их в head
        addTemplatesAndStyles();

        // Регистрируем наш компонент в Lampa
        Lampa.Component.add('hanime_catalog', HanimeComponent);
        console.log("Hanime Plugin: Component 'hanime_catalog' added.");

        // Добавляем пункт меню после готовности приложения Lampa
        // (Lampa должна быть полностью загружена, чтобы DOM меню был доступен)
        if (window.appready) {
             console.log("Hanime Plugin: App is ready, adding menu item.");
             addMenuItem();
        } else {
             console.log("Hanime Plugin: Waiting for app ready event.");
             Lampa.Listener.follow('app', function (e) {
                 if (e.type === 'ready') {
                      console.log("Hanime Plugin: App ready event received, adding menu item.");
                      addMenuItem();
                 }
             });
        }
         console.log("Hanime Plugin: Initialization complete.");
    }

    // Запускаем инициализацию плагина
    // Проверяем на всякий случай, чтобы не запустить инициализацию несколько раз
    if (!window.plugin_hanime_catalog_ready) {
        startPlugin();
    } else {
         console.log("Hanime Plugin: Skipping startPlugin, already ready.");
         // Если плагин уже был помечен как готовый, но стили/шаблоны могли быть потеряны
         // (хотя флаг hanime_templates_added должен предотвратить это),
         // можно попробовать добавить их снова, но это скорее обходной путь для проблем в Lampa.
         // addTemplatesAndStyles(); // Опционально: попробовать добавить стили/шаблоны снова
         // addMenuItem(); // Опционально: попробовать добавить меню снова
    }


})();
