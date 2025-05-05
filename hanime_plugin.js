(function () {
    'use strict';

    // Компонент карточки, адаптированный для использования стандартных классов Lampa
    // и обработки данных, которые могут включать рейтинг, качество и год.
    function HanimeCard(data) {
        // Предполагается, что ваш API возвращает что-то похожее на:
        // { id: ..., name: "Название", poster: "ссылка на постер", vote_average: 8.5, quality: "4K", year: "2023", ... }
        // Адаптируйте эти поля в зависимости от реальной структуры данных API.
        var processedData = {
            id: data.id,
            // Используем поля из ваших данных, если они есть, иначе пустая строка или дефолт
            title: data.name || data.title || 'Без названия', // Поле для заголовка
            poster_path: data.poster || data.img, // Поле для картинки (используем poster_path для совместимости с Lampa шаблонами)
            vote_average: data.vote_average || data.vote || null, // Поле для рейтинга
            quality: data.quality || data.release_quality || null, // Поле для качества
            release_year: ((data.year || data.release_date || '') + '').slice(0, 4), // Поле для года
            // Можно добавить тип (фильм/сериал) если API предоставляет:
            // type: data.first_air_date ? 'tv' : 'movie',
            original_name: data.original_name // Сохраняем для истории и т.п.
        };

         // Загружаем шаблон 'hanime-card'. Он должен использовать стандартные классы card__view и т.д.
        var cardTemplate = Lampa.Template.get('hanime-card', {
            // Передаем обработанные данные в шаблон. Убедитесь, что имена ключей
            // в processedData соответствуют плейсхолдерам в шаблоне ({img}, {title}, {vote}, и т.п.)
            img: processedData.poster_path,
            title: processedData.title,
            // Передаем рейтинг, качество, год, если они есть. Шаблон решит показывать ли их.
            vote: processedData.vote_average > 0 ? parseFloat(processedData.vote_average).toFixed(1) : '', // Форматируем рейтинг
            quality: processedData.quality,
            year: processedData.release_year !== '0000' ? processedData.release_year : '' // Год, если не '0000'
        });

        var cardElement = $(cardTemplate); // Создаем jQuery объект

        // Класс 'selector' должен быть в шаблоне для корректной навигации Controller
        // cardElement.addClass('selector'); // Проверьте, что он есть в шаблоне

        // Добавление иконок (закладки, история) - это делается после рендеринга в build или update
        this.addicon = function(name) {
            var iconsContainer = cardElement.find('.card__icons-inner'); // Находим стандартный контейнер для иконок
            if (iconsContainer.length) {
                var icon = document.createElement('div');
                icon.classList.add('card__icon'); // Стандартный класс Lampa для иконок
                icon.classList.add('icon--'+name); // Класс, определяющий тип иконки (иконка в CSS)
                iconsContainer.append(icon);
            }
        }

        // Обновление иконок закладок - адаптируем из примера card.js
        this.updateFavoriteIcons = function() {
            // Очищаем старые иконки
            cardElement.find('.card__icons-inner').empty();
            // Очищаем маркер состояния (смотрел, смотрю и т.п.)
             cardElement.find('.card__marker').remove();

            // Проверяем статус закладки для этого элемента
            var status = Lampa.Favorite.check(processedData); // Используем Lampa.Favorite

            // Добавляем стандартные иконки на основе статуса закладки
            if (status.book) this.addicon('book');     // Запланировано
            if (status.like) this.addicon('like');     // Нравится
            if (status.wath) this.addicon('wath');     // Просматриваю
            // Проверяем историю или смотрел ли полностью (можно адаптировать Lampa.Timeline)
             if (status.history || Lampa.Timeline.watched(processedData)) this.addicon('history'); // Просмотрено

            // Обработка маркера состояния (надпись над постером)
             var marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown']; // Стандартные маркеры в Lampa
             var activeMarker = marks.find(m => status[m]); // Находим активный маркер

             if (activeMarker) {
                 // Если есть активный маркер, создаем его или обновляем
                 var markerElement = cardElement.find('.card__marker');
                 if (!markerElement.length) {
                     markerElement = $('<div class="card__marker"><span></span></div>');
                     cardElement.find('.card__view').append(markerElement);
                 }
                 markerElement.find('span').text(Lampa.Lang.translate('title_' + activeMarker)); // Используем Lampa.Lang
                 // Удаляем старые классы маркеров и добавляем новый
                 markerElement.removeClass(marks.map(m => 'card__marker--' + m).join(' '))
                             .addClass('card__marker--' + activeMarker);
             } else {
                 // Если нет активного маркера, удаляем его
                 cardElement.find('.card__marker').remove();
             }
        };

        // Метод вызывается, когда карточка становится видимой
        this.onVisible = function() {
            // Загрузка картинки - используем логику из standard card.js
             var imgElement = cardElement.find('.card__img');
             if (imgElement.length && !imgElement.attr('src') || imgElement.attr('src').includes('img_load.svg')) { // Только если src не установлен или placeholder
                 var src = processedData.poster_path; // Ваш путь к картинке из обработанных данных

                 // Fallback для картинки
                 if (!src) src = './img/img_broken.svg';

                 // Загрузка с обработкой ошибок/загрузки и кэшированием
                 imgElement[0].onload = () => { // Используем нативный DOM element
                     cardElement.addClass('card--loaded');
                      // Lampa ImageCache для кэширования
                      if(window.Lampa && Lampa.ImageCache) Lampa.ImageCache.write(imgElement[0], imgElement[0].src);
                 };
                 imgElement[0].onerror = () => { // Используем нативный DOM element
                     console.error('Hanime Plugin: Image failed to load', imgElement.attr('src'));
                     // Показываем иконку "битая картинка"
                     imgElement.attr('src', './img/img_broken.svg');
                     // Возможно, уведомить Lampa о битой картинке TMDB
                      if(window.Lampa && Lampa.Tmdb) Lampa.Tmdb.broken();
                 };

                 // Устанавливаем src для начала загрузки
                 if(window.Lampa && Lampa.ImageCache) {
                      // Пытаемся загрузить из кэша
                      if(!Lampa.ImageCache.read(imgElement[0], src)) {
                         // Если не в кэше, устанавливаем src и загружаем
                          imgElement.attr('src', src);
                      } else {
                         // Если из кэша, возможно, уже нужно добавить card--loaded класс
                         cardElement.addClass('card--loaded');
                      }
                 } else {
                     // Без кэширования Lampa
                     imgElement.attr('src', src);
                 }


                console.log("Hanime Plugin: Card image loaded:", src);
             }


            this.updateFavoriteIcons(); // Обновляем иконки при видимости
        }


        // Метод вызывается после построения DOM карточки. Здесь навешиваются стандартные обработчики Lampa.
        this.create = function(){
             console.log("HanimeCard: create() for", processedData.title);
            // Ваш шаблон должен уже содержать стандартные классы и быть готов для jQuery $(cardTemplate)

            // Добавляем обработчики событий Lampa. hover:focus и hover:enter обязательны для Controller.
            cardElement.on('hover:focus', function () {
                 console.log("HanimeCard: hover:focus on", processedData.title);
                // Логика прокрутки к сфокусированному элементу будет снаружи, в HanimeComponent build/start
                 if (componentObject && componentObject.updateScrollToFocus) {
                      componentObject.updateScrollToFocus(cardElement); // Вызываем метод родительского компонента
                 }
                 // Здесь можно добавить специфичную логику при фокусе, если нужно (например, показать доп. инфо)

                 // В стандартных карточках, при фокусе вызывается update()
                 // для обновления статуса смотрел / иконок
                 if(this.update) this.update(); // Вызываем собственный метод update для этой карточки
            }.bind(this)); // bind(this) чтобы this внутри функции указывал на объект HanimeCard


            cardElement.on('hover:touch', function(){
                 console.log("HanimeCard: hover:touch on", processedData.title);
                 // Действия при тач-событии (если Lampa их генерирует)
                  if(this.update) this.update();
             }.bind(this));

             cardElement.on('hover:hover', function(){
                 console.log("HanimeCard: hover:hover on", processedData.title);
                  if(this.update) this.update();
             }.bind(this));


            cardElement.on('hover:enter', function () {
                // Событие вызывается Controller, когда на элементе нажимают ОК/Enter.
                console.log("HanimeCard: hover:enter on", processedData.title);
                // Здесь должна быть логика запуска воспроизведения или перехода на страницу с деталями
                 if (componentObject && componentObject.onCardClick) {
                     componentObject.onCardClick(processedData); // Вызываем метод родительского компонента для обработки клика
                 }
            }.bind(this));


            cardElement.on('hover:long', function(){
                 console.log("HanimeCard: hover:long on", processedData.title);
                 // Событие длинного нажатия - обычно для контекстного меню
                 if (componentObject && componentObject.showCardContextMenu) {
                      componentObject.showCardContextMenu(cardElement, processedData); // Показываем меню
                 }
             }.bind(this));

            // Привязка обработчика visible для загрузки картинки и обновления иконок
             this.card = cardElement[0]; // Сохраняем нативный DOM элемент для addEventListener
             this.card.addEventListener('visible', this.onVisible.bind(this)); // Событие 'visible' от Lampa

            // Вызываем update() при создании для инициализации иконок и т.п.
            // С задержкой, чтобы DOM успел обновиться
             setTimeout(() => {
                  if(this.update) this.update();
             }, 0);

            console.log("HanimeCard: Event listeners attached and update scheduled.");
        }

        // Метод для обновления состояния карточки (вызывается вручную или при фокусе)
        // Это адаптировано из стандартной Lampa Card component.
        this.update = function(){
             console.log("HanimeCard: update() for", processedData.title);
            this.updateFavoriteIcons(); // Обновляем иконки закладок/статуса
            // Можно добавить логику дляwatched status bar (как в standard Card.js Timeline integration)
             // this.watched(); // Если у вас есть своя реализация Timetable/Timeline
        }

         // Важно: добавить реализацию onMenu, onMenuShow, onMenuSelect, watched, image, visible (см. ниже или standard card.js)
         // или передать эту ответственность родительскому компоненту через componentObject callbacks.
         // В данном случае, я предложил передавать через componentObject callbacks (onCardClick, showCardContextMenu)
         // и updateFavoriteIcons/onVisible методы, чтобы Card была более "глупой".

        // Метод рендеринга - возвращает DOM элемент (jQuery объект)
        this.render = function(js){
            // Убедимся, что create был вызван перед рендером
            if (!this.card) {
                 this.create();
            }
            return js ? this.card : cardElement; // Возвращаем jQuery объект по умолчанию
        }

        // Метод уничтожения - удаляет DOM элемент
        this.destroy = function(){
             console.log("HanimeCard: destroy() for", processedData.title);
             // Отписываемся от событий, если необходимо (Lampa jQuery events должны удалиться сами с remove)
             if(this.card) this.card.removeEventListener('visible', this.onVisible.bind(this));
             if(cardElement) cardElement.remove(); // Удаляем DOM элемент
            // Обнуляем ссылки
             this.card = null;
             cardElement = null;
             processedData = null;
        }

         // Вызываем create сразу при создании экземпляра Card для навешивания событий и initial update
         this.create();
    }


    // Ваш основной компонент HanimeCatalog - теперь как одна горизонтальная линия
    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest(); // Управление запросами

        // Инициализируем ГОРИЗОНТАЛЬНЫЙ скролл
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });

        var items = []; // Массив объектов HanimeCard
        var html; // Корневой DOM-контейнер компонента (items-line)
        var itemsContainer; // Контейнер для карточек внутри скролла (.scroll__body .items-cards)

        var active = 0; // Индекс активного элемента в массиве items
        var last; // DOM-элемент последней сфокусированной карточки

        // Ваши API URL-ы (без изменений)
        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json"; // Загружаем только "Последние добавленные"
        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";

        // Ваш прокси (без изменений)
        var PROXY_BASE_URL = "http://77.91.78.5:3000";


        // Метод для построения основной структуры DOM компонента (одна линия)
        this.buildLayout = function() {
            // Создаем DOM-структуру горизонтальной линии (items-line) по аналогии с примерами Lampa
            html = $(`
                <div class="items-line layer--visible layer--render items-line--type-cards">
                    <div class="items-line__head">
                        <div class="items-line__title">Последние добавленные</div> <!-- Заголовок -->
                        <!-- Можно добавить кнопку "Еще", если API поддерживает -->
                         <!-- <div class="items-line__more selector">Еще</div> -->
                    </div>
                    <div class="items-line__body">
                        <!-- Scroll рендерится сюда -->
                    </div>
                </div>
            `);

            // Контейнер для карточек, который будет внутри скролла
             itemsContainer = $('<div class="items-cards"></div>'); // Scroll добавит scroll__body
             console.log("HanimeComponent: buildLayout completed. Initial html structure created.");
        };


        // Метод загрузки данных каталога (без изменений)
        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true);

            network.clear();
            network.native(CATALOG_URL,
                function (data) {
                     console.log("HanimeComponent: Catalog data received.");
                    if (data && data.metas && Array.isArray(data.metas)) {
                         if (data.metas.length > 0) {
                            _this.build(data.metas);
                         } else {
                            _this.empty("Каталог пуст.");
                         }
                    } else {
                        _this.empty("Неверный формат данных от API.");
                        console.error("HanimeComponent: Invalid data format", data);
                    }
                },
                function (errorStatus, errorText) {
                    _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                    console.error("HanimeComponent: Failed to load catalog", errorStatus, errorText);
                },
                false,
                {
                    dataType: 'json',
                    timeout: 15000
                }
            );
        };

        // Метод построения UI после получения данных
        this.build = function (result) {
            var _this = this;
             console.log("HanimeComponent: build() with", result.length, "items.");

            scroll.minus(); // Standard Scroll method call

            itemsContainer.empty(); // Очищаем контейнер для карточек
            items = []; // Очищаем массив объектов карточек

            result.forEach(function (meta) {
                // Передаем ссылку на сам компонент в HanimeCard для коллбэков
                var card = new HanimeCard(meta, {
                     // Здесь можно передать параметры карточки, если нужны (card_small, card_category и т.д.)
                     // card_category: true, // Например, если хотите стили как в категории, хотя здесь это items-line
                }, _this); // Передаем this компонента
                var cardElement = card.render(); // Получаем DOM элемент (jQuery объект) карточки

                 // Обработчики hover:focus и hover:enter теперь прикрепляются ВНУТРИ HanimeCard,
                 // вызывая методы родительского компонента через переданный "_this".
                // cardElement.on('hover:focus', ...) -> moved inside HanimeCard
                // cardElement.on('hover:enter', ...) -> moved inside HanimeCard
                // cardElement.on('hover:long', ...) -> moved inside HanimeCard


                itemsContainer.append(cardElement); // Добавляем карточку в контейнерitems-cards
                items.push(card); // Добавляем объект карточки в массив items
            });

            // Добавляем itemsContainer (который содержит карточки) в Scroll.
            // Scroll создаст свою внутреннюю структуру DOM вокруг itemsContainer.
            scroll.append(itemsContainer);
             console.log("HanimeComponent: itemsContainer appended to scroll.");


            // Добавляем рендер Scroll'а в items-line__body. scroll.render() возвращает корневой DOM скролла.
            // true в scroll.render(true) заставляет Scroll пересчитать свои размеры.
            html.find('.items-line__body').empty().append(scroll.render(true));
            console.log("HanimeComponent: Scroll rendered into items-line__body.");

            _this.activity.loader(false); // Скрываем лоадер
            _this.activity.toggle(); // Показываем активность

            // Controller setup now in start() method.
        };

         // Метод для обработки клика на карточке (вызывается из HanimeCard hover:enter)
         this.onCardClick = function(cardData) {
             console.log("HanimeComponent: Card clicked", cardData);
             // Здесь логика перехода на страницу деталей или запуска плеера
             // Для простоты, вызываем ваш fetchStreamAndMeta прямо здесь:
             this.fetchStreamAndMeta(cardData.id, cardData);
         }

         // Метод для показа контекстного меню карточки (вызывается из HanimeCard hover:long)
         this.showCardContextMenu = function(cardElement, cardData) {
             console.log("HanimeComponent: Showing context menu for", cardData.title);
             // Логика показа меню, аналогичная той, что была в вашем старом onMenu методе
             var _this = this;
             var enabled = Lampa.Controller.enabled().name; // Текущий активный контроллер
             var status  = Lampa.Favorite.check(cardData); // Статус закладок
             var menu_favorite = [
                  // Элементы меню закладок (скопировано из вашего первого кода)
                 {
                     title: Lampa.Lang.translate('title_book'), where: 'book', checkbox: true, checked: status.book,
                 },
                 {
                     title: Lampa.Lang.translate('title_like'), where: 'like', checkbox: true, checked: status.like
                 },
                 {
                     title: Lampa.Lang.translate('title_wath'), where: 'wath', checkbox: true, checked: status.wath
                 },
                 {
                     title: Lampa.Lang.translate('menu_history'), where: 'history', checkbox: true, checked: status.history
                 },
                 {
                     title: Lampa.Lang.translate('settings_cub_status'), separator: true // Разделитель
                 }
                 // Можно добавить сюда статусы look, viewed, scheduled и т.д. по аналогии с standard Card.js onMenu
             ];

              // Стандартный Select компонент для меню
             Lampa.Select.show({
                 title: Lampa.Lang.translate('title_action'), // Заголовок меню
                 items: menu_favorite, // Пункты меню
                 onBack: ()=>{
                      // При закрытии меню, возвращаем управление предыдущему контроллеру
                     Lampa.Controller.toggle(enabled);
                     console.log("HanimeComponent: Context menu closed. Returning to controller:", enabled);
                 },
                  // Обработка выбора чекбокса в меню
                 onCheck: (a)=>{
                     console.log("HanimeComponent: Context menu - item checked:", a);
                     // Переключаем статус закладки
                      Lampa.Favorite.toggle(a.where, cardData);
                      // Обновляем иконки закладок на карточке
                      var cardObj = items.find(item => item.render()[0] === cardElement[0]);
                      if(cardObj) cardObj.updateFavoriteIcons();
                 },
                  // Обработка выбора обычного пункта меню (если такие есть, например "Смотрел полностью")
                 onSelect: (a)=>{
                     console.log("HanimeComponent: Context menu - item selected:", a);
                      // Если это пункт, который переключает статус маркера
                     if(a.collect){
                          Lampa.Favorite.toggle(a.where, cardData);
                          var cardObj = items.find(item => item.render()[0] === cardElement[0]);
                           if(cardObj) cardObj.updateFavoriteIcons();
                     }

                     // После выбора, закрываем меню и возвращаем управление
                     Lampa.Select.close();
                      Lampa.Controller.toggle(enabled);
                 },
                  // Дополнительная настройка элементов меню (например, иконки замка для premium функций)
                  onDraw: (item, elem) => {
                      // Если элемент помечен как требующий Premium (например, маркеры статуса)
                       if (elem.collect && window.Lampa && Lampa.Account && !Lampa.Account.hasPremium()) {
                           let wrap = $('<div class="selectbox-item__lock"></div>');
                           wrap.append(Lampa.Template.js('icon_lock')); // Используем стандартный шаблон иконки замка
                           item.find('.selectbox-item__checkbox').remove();
                           item.append(wrap);

                           item.on('hover:enter', () => {
                               Lampa.Select.close();
                               if (window.Lampa && Lampa.Account) Lampa.Account.showCubPremium(); // Показать окно Premium
                           });
                       }
                  }
             });
         };


        // Метод для загрузки деталей потока и метаданных (без изменений)
        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

            _this.activity.loader(true);
            console.log("HanimeComponent: Fetching stream/meta for", id);

            Promise.all([
                new Promise((resolve, reject) => {
                    network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                }),
                // Если метаданные уже есть, не загружаем их повторно
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                     network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                 })
            ]).then(([streamData, metaDataResponse]) => {
                _this.activity.loader(false);
                const fullMetaData = metaDataResponse.meta || metaDataResponse;
                console.log("HanimeComponent: Stream Data:", streamData, "Meta Data:", fullMetaData);

                if (streamData && streamData.streams && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0];
                    var finalStreamUrl = streamToPlay.url;

                    try {
                         var url = new URL(finalStreamUrl);
                         if (url.hostname.includes('highwinds-cdn.com')) {
                             finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                             console.log("HanimeComponent: Stream URL proxied.");
                         }
                    } catch (e) {
                        console.error("HanimeComponent: Failed to parse or proxy stream URL", e);
                    }

                    var playerObject = {
                        title: fullMetaData.name || fullMetaData.title || 'Без названия',
                        url: finalStreamUrl,
                        poster: fullMetaData.poster || fullMetaData.background,
                    };

                    if (playerObject.url) {
                         console.log("HanimeComponent: Launching player.");
                         Lampa.Player.play(playerObject);
                         Lampa.Player.playlist([playerObject]);

                         if (fullMetaData) {
                                const historyMeta = {
                                    id: fullMetaData.id,
                                    title: fullMetaData.name || fullMetaData.title,
                                    poster: fullMetaData.poster || fullMetaData.background,
                                    runtime: fullMetaData.runtime,
                                    year: fullMetaData.year,
                                    original_name: fullMetaData.original_name
                                };
                                Lampa.Favorite.add('history', historyMeta, 100);
                                 console.log("HanimeComponent: Added to history.");
                         }

                    } else {
                         Lampa.Noty.show('Не удалось получить ссылку на поток.');
                         console.error("HanimeComponent: No stream URL in data.");
                    }

                } else {
                     Lampa.Noty.show('Потоки не найдены для этого аниме.');
                     console.warn("HanimeComponent: No streams found.");
                }

            }).catch(error => {
                _this.activity.loader(false);
                console.error("HanimeComponent: Error fetching stream/meta:", error);
                Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'));
            });
        };


        // Метод для отображения пустого состояния или ошибки
        this.empty = function (msg) {
             console.log("HanimeComponent: Displaying empty state:", msg);
            var empty = new Lampa.Empty({ message: msg });
            html.empty().append(empty.render(true));
            this.activity.loader(false);
            this.activity.toggle();
             // Важно: Переназначаем start на метод start компонента Empty
            this.start = empty.start;
        };


        // Метод, вызываемый при создании активности
        this.create = function () {
            console.log("HanimeComponent: create()");
            this.buildLayout(); // Сначала строим HTML структуру компонента (items-line)
            this.activity.loader(true); // Показываем лоадер
            this.fetchCatalog(); // Загружаем данные каталога
        };


        // Метод, вызываемый, когда активность становится видимой и фокусируется
        this.start = function () {
            console.log("HanimeComponent: start()");
            if (Lampa.Activity.active().activity !== this.activity) {
                 console.log("HanimeComponent: start() - Not active activity, returning.");
                return;
            }
             console.log("HanimeComponent: start() - Activity is active. Setting up controller.");

            // Устанавливаем Lampa Controller для управления фокусом и навигацией
            Lampa.Controller.add('content', {
                toggle: function () {
                     console.log("HanimeComponent: Controller toggle()");
                    // Указываем Controller, где искать навигационные элементы (с классом 'selector').
                    // scroll.render() возвращает корневой DOM элемент Scroll, в котором Controller будет искать.
                    Lampa.Controller.collectionSet(scroll.render());
                    // Устанавливаем начальный фокус. collectionFocus пытается найти элемент с классом .selector.focus
                    // или элемент, сохраненный в `last`, или первый доступный элемент.
                    // Это вызовет событие 'hover:focus' на сфокусированном элементе.
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                    console.log("HanimeComponent: Controller collectionSet and collectionFocus called.");
                },
                // Стандартные обработчики навигации пультом
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left'); // Двигаем фокус влево внутри Scroll
                    else Lampa.Controller.toggle('menu'); // Если дальше некуда, переключаем на меню
                },
                right: function () {
                    if (Navigator.canmove('right')) Navigator.move('right'); // Двигаем фокус вправо внутри Scroll
                },
                up: function () {
                    // В стандартной items-line структуре, UP/DOWN переключают между горизонтальными линиями
                    // или переходят на Header/Footer. В данной активности у нас только ОДНА линия,
                    // поэтому UP переключит на Header Lampa. DOWN, вероятно, ничего не будет делать, т.к. нет других линий.
                    Lampa.Controller.toggle('head');
                },
                down: function () {
                    // Здесь нет следующей горизонтальной линии. Если бы были, Controller перешел бы вниз.
                     if (Navigator.canmove('down')) Navigator.move('down'); // Controller попытается перейти, но, вероятно, некуда.
                },
                back: this.back // Обработчик кнопки "Назад"
            });
            // Активируем наш контроллер для управления этой активностью
            Lampa.Controller.toggle('content');
            console.log("HanimeComponent: Controller 'content' toggled.");

            // Нет необходимости вручную прокручивать здесь.
            // Controller.collectionFocus вызовет hover:focus на начальном элементе,
            // и наш обработчик в HanimeCard вызовет scroll.update().
        };

         // Метод для прокрутки скролла к заданному элементу (вызывается из HanimeCard hover:focus)
         this.updateScrollToFocus = function(element) {
              last = element[0]; // Сохраняем ссылку на DOM элемент (уже делается в hover:focus обработчике)
              scroll.update(element, true); // Вызываем scroll.update с элементом и плавной прокруткой
              console.log("HanimeComponent: Updating scroll to focused element.");
         }


        this.pause = function () {
            console.log("HanimeComponent: pause()");
            // Сохраняем ссылку на последний сфокусированный элемент перед уходом из активности
             last = Lampa.Controller.item() || last;
             console.log("HanimeComponent: Paused. Saving last focused item:", last);
        };

        this.stop = function () {
             console.log("HanimeComponent: stop()");
            // Метод stop вызывается перед destroy.
        };

        // Метод рендеринга компонента - возвращает его корневой DOM элемент (items-line)
        this.render = function () {
             console.log("HanimeComponent: render()");
             // Убеждаемся, что HTML layout построен перед возвратом DOM элемента
            if (!html) {
                 this.buildLayout();
            }
            return html;
        };

        // Метод уничтожения компонента - освобождаем ресурсы
        this.destroy = function () {
            console.log("HanimeComponent: destroy()");
            network.clear(); // Отменяем сетевые запросы
            // Уничтожаем объекты карточек в массиве items, если у них есть метод destroy
             Lampa.Arrays.destroy(items); // Assuming HanimeCard has a destroy method
            scroll.destroy(); // Уничтожаем Scroll instance (чистит DOM, отписывается от событий)

            // Удаляем корневой DOM элемент компонента из DOM
             if (html) html.remove();

            // Удаляем зарегистрированный контроллер
            if (Lampa.Controller.enabled().name === 'content') {
                 Lampa.Controller.collectionSet([]); // Очищаем коллекцию Controller
                // Optional: Lampa.Controller.toggle('app'); // Вернуть управление другому контроллеру
            }
            Lampa.Controller.remove('content'); // Удаляем наш контроллер

            // Обнуляем ссылки
            items = null;
            network = null;
            scroll = null;
            html = null;
            itemsContainer = null;
            last = null;
            console.log("HanimeComponent: Component destroyed completely.");
        };

        // Обработчик кнопки "Назад"
        this.back = function () {
             console.log("HanimeComponent: back()");
            Lampa.Activity.backward(); // Возвращаемся к предыдущей активности в стеке
        };
    }

    // Функция инициализации плагина Lampa
    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() called.");

        // Проверка на случай повторной инициализации
        if (window.plugin_hanime_catalog_ready) {
             console.log("Hanime Plugin: Plugin already running.");
             return;
        }

        window.plugin_hanime_catalog_ready = true;
        console.log("Hanime Plugin: Plugin flag set.");

        // --- Шаблоны и стили Lampa ---

        // Ваши CSS стили, адаптированные под стандартные классы Lampa
        // Используйте стандартные классы (card, items-line, selector, focus и т.д.)
        // Отступы, размеры, стили фокуса скорректированы, чтобы быть ближе к стандартным.
        var style = `
            /* Стили для контейнера items-line */
            .items-line {
                 padding: 1em 0; /* Отступ сверху/снизу для линии */
            }
            /* Отступы внутри items-line, особенно по горизонтали для Scroll */
            .items-line__body {
                padding: 0 2.5em; /* Стандартный горизонтальный отступ внутри Scroll */
            }
            /* Стили для заголовка линии */
             .items-line__head {
                  padding: 0 3.5em 1em 3.5em; /* Горизонтальные отступы для заголовка */
             }

            /* Базовый стиль карточки. Используем стандартный класс .card. */
            /* Ваши специфичные стили для .hanime-card могут переопределять или добавлять. */
            .card { /* Наш hanime-card тоже имеет класс card */
                width: 185px; /* Стандартная ширина постера */
                 /* Высота рассчитывается из view + title + age */
                 height: calc(270px + 1em + 0.5em + 0.9em); /* Примерный расчет: view height + title height + title margin-top + age height */
                margin: 0 0.5em; /* Горизонтальные отступы между карточками в линии */
                 /* margin-bottom не нужен для items-line, т.к. вертикальные отступы задает контейнер .items-line */
                border-radius: 0.5em;
                overflow: hidden;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                position: relative;
                box-sizing: border-box;
                background-color: rgba(255,255,255,0.05); /* Цвет для загрузки */
            }

            /* Стандартный стиль фокуса Lampa (для элементов с классом selector) */
            /* Он применяется к .card.selector:focus или .hanime-card.selector:focus */
            .card.selector:focus,
            .hanime-card.selector:focus {
                 /* Стандартное увеличение */
                 transform: scale(1.05);
                 /* Свечение вокруг элемента - цвет может варьироваться в Lampa */
                 box-shadow: 0 0 15px rgba(255, 165, 0, 0.8); /* Пример оранжевого свечения */
                 z-index: 5; /* Убедимся, что фокусный элемент сверху */
                 /* Граница - опционально, Lampa часто обходится свечением */
                 border: 3px solid rgba(255, 255, 255, 0.5);
            }

             /* Скрытие стандартного браузерного outline при программном фокусе */
             .card.selector.focus:not(.native),
             .hanime-card.selector.focus:not(.native) {
                 border-color: transparent;
                 outline: none;
             }

            /* Стили для области просмотра (картинки и наложений) */
            .card__view {
                position: relative;
                width: 100%;
                height: 270px; /* Высота постера */
                border-radius: 0.5em;
                overflow: hidden;
                background-color: rgba(255,255,255,0.05); /* Загрузочный фон */
            }

             /* Стили для самой картинки */
             .card__img {
                 position: absolute;
                 width: 100%;
                 height: 100%;
                 object-fit: cover; /* Вписываем с обрезкой */
                 border-radius: 0.5em;
                 opacity: 0.9; /* Немного затемняем */
                 transition: opacity 0.2s ease;
             }
             .card--loaded .card__img {
                  opacity: 1; /* При загрузке картинки убираем затемнение */
             }

            /* Стили для иконок (история, закладки) */
             .card__icons {
                position: absolute;
                top: 0.5em;
                right: 0.5em;
                z-index: 2;
             }
             .card__icons-inner {
                display: flex;
                flex-direction: column;
                gap: 0.3em; /* Отступ между иконками */
             }
             .card__icon {
                 /* Базовый стиль для каждой иконки. Сюда добавятся icon--book, icon--history и т.п. */
                  width: 1em; /* Размер иконки */
                  height: 1em;
                  background-color: rgba(0,0,0,0.5); /* Фон иконки */
                  padding: 0.3em;
                  border-radius: 50%; /* Круглая форма */
                 /* Реальные SVG или шрифтовые иконки определяются в других стилях Lampa */
             }

            /* Стили для рейтинга */
             .card__vote {
                 position: absolute;
                 bottom: 0.5em;
                 left: 0.5em;
                 background-color: rgba(0,0,0,0.7);
                 color: #fff;
                 padding: 0.2em 0.4em;
                 border-radius: 0.3em;
                 font-size: 0.9em;
                 font-weight: bold;
                 z-index: 2;
             }

            /* Стили для качества видео */
             .card__quality {
                position: absolute;
                 bottom: 0.5em;
                 right: 0.5em;
                 background-color: rgba(0,0,0,0.7);
                 color: #fff;
                 padding: 0.2em 0.4em;
                 border-radius: 0.3em;
                 font-size: 0.9em;
                 z-index: 2;
             }

             /* Стили для типа (TV/Movie) */
             .card__type {
                  position: absolute;
                 top: 0.5em;
                 left: 0.5em;
                 background-color: rgba(0,0,0,0.7);
                 color: #fff;
                 padding: 0.2em 0.4em;
                 border-radius: 0.3em;
                 font-size: 0.9em;
                 font-weight: bold;
                 z-index: 2;
             }

            /* Стили для заголовка под постером */
             .card__title {
                 margin-top: 0.5em;
                 padding: 0 0.2em; /* Меньшие горизонтальные отступы для заголовка */
                 font-size: 1em;
                 font-weight: bold;
                 white-space: nowrap;
                 overflow: hidden;
                 text-overflow: ellipsis;
                 text-align: center;
                 color: #fff;
             }
            /* Стили для года под заголовком */
             .card__age {
                text-align: center;
                font-size: 0.9em;
                color: rgba(255, 255, 255, 0.7); /* Более тусклый цвет */
             }


            /* Если нужны другие классы для card--tv, card--movie и т.д. */
             /* .card--tv {} .card--movie {} */

            /* Стиль иконки меню - без изменений */
            .menu__ico svg {
                  width: 1.5em;
                  height: 1.5em;
            }
        `;
        // Добавляем стили на страницу
        Lampa.Template.add('hanime-style', `<style>${style}</style>`);
         $('head').append(Lampa.Template.get('hanime-style', {}, true));


        // Шаблон HTML для карточки, использующий стандартные классы Lampa.
        // Значения {placeholder} будут заменены при рендеринге шаблона.
        Lampa.Template.add('hanime-card', `
            <div class="hanime-card card selector layer--visible layer--render">
                <div class="card__view hanime-card__view">
                    <img src="./img/img_load.svg" class="card__img hanime-card__img" alt="{title}" loading="lazy" /> <!-- Плейсхолдер для загрузки -->
                    <div class="card__icons hanime-card__icons">
                        <div class="card__icons-inner hanime-card__icons-inner"></div> <!-- Здесь будут иконки закладки/истории -->
                    </div>
                    <!-- Блоки для рейтинга, качества, типа и года - будут заполняться если есть данные -->
                     ${Lampa.Template.get('card_vote_temp', { vote: '{vote}' })} <!-- Используем стандартный шаблон рейтинга -->
                     ${Lampa.Template.get('card_quality_temp', { quality: '{quality}' })} <!-- Используем стандартный шаблон качества -->
                     ${Lampa.Template.get('card_type_temp', { type: '{type}' })} <!-- Если тип определяется -->

                </div>
                <div class="card__title hanime-card__title">{title}</div>
                ${Lampa.Template.get('card_year_temp', { year: '{year}' })} <!-- Используем стандартный шаблон года -->
            </div>
        `);
         console.log("Hanime Plugin: HanimeCard template added with standard Lampa structure.");

         // Также убедимся, что есть стандартные шаблоны для vote, quality, type, year если они не встроены
         // в Lampa. В стандартном Card.js они часто добавляются динамически или берутся из отдельных темплейтов.
         // Если Lampa их не предоставляет по умолчанию, можно добавить минимальные шаблоны:
         if(!Lampa.Template.has('card_vote_temp')) {
              Lampa.Template.add('card_vote_temp', '<div class="card__vote hanime-card__vote">{vote}</div>');
         }
          if(!Lampa.Template.has('card_quality_temp')) {
               Lampa.Template.add('card_quality_temp', '<div class="card__quality hanime-card__quality"><div>{quality}</div></div>');
          }
          if(!Lampa.Template.has('card_year_temp')) {
               Lampa.Template.add('card_year_temp', '<div class="card__age hanime-card__age">{year}</div>');
          }
          if(!Lampa.Template.has('card_type_temp')) {
               // Этот шаблон может требовать дополнительной логики для Movie vs TV
               Lampa.Template.add('card_type_temp', '<div class="card__type hanime-card__type">{type}</div>');
          }
         // Иконка замка для premium (если используется)
         if(!Lampa.Template.has('icon_lock')) {
             Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
         }



        // Регистрируем компонент каталога
        Lampa.Component.add('hanime_catalog', HanimeComponent);
        console.log("Hanime Plugin: Component 'hanime_catalog' registered.");


        // Добавляем пункт меню в главное меню Lampa
        function addMenuItem() {
             // Проверка на дубликат
             if ($('.menu .menu__list .menu__text:contains("Hanime Catalog")').length > 0) {
                 console.log("Hanime Plugin: Menu item already exists.");
                 return;
             }
             console.log("Hanime Plugin: Adding menu item.");

            // Создаем пункт меню со стандартными классами
            var menu_item = $(`
                <li class="menu__item selector"> <!-- Класс selector обязателен -->
                    <div class="menu__ico">
                        <!-- Ваша иконка -->
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">Hanime Catalog</div>
                </li>
            `);

            // Обработчик активации пункта меню (hover:enter)
            menu_item.on('hover:enter', function () {
                 console.log("Hanime Plugin: Menu item selected. Pushing 'hanime_catalog' activity.");
                Lampa.Activity.push({
                    url: '',
                    title: 'Hanime Catalog',
                    component: 'hanime_catalog',
                    page: 1
                });
            });

            // Добавляем пункт меню в первое основное меню Lampa
            $('.menu .menu__list').eq(0).append(menu_item);
             console.log("Hanime Plugin: Menu item added to DOM.");
        }

        // Ждем готовности Lampa перед добавлением элементов в UI
        if (window.appready) {
             console.log("Hanime Plugin: Lampa appready. Adding menu item now.");
             addMenuItem();
        } else {
             console.log("Hanime Plugin: Waiting for Lampa appready event.");
             Lampa.Listener.follow('app', function (e) {
                 if (e.type === 'ready') {
                     console.log("Hanime Plugin: Appready event received. Adding menu item.");
                     addMenuItem();
                 }
             });
        }

        console.log("Hanime Plugin: startPlugin finished.");
    }

    // Запускаем плагин при загрузке скрипта
    startPlugin();

})();
