(function () {
    'use strict';

    // --- HanimeCard компонента (почти без изменений, делегирует логику родителю) ---
    // Использует стандартные классы Lampa для своей структуры DOM.
    function HanimeCard(data, componentRef) { // Убираем params т.к. не используются в конструкторе
        // Обрабатываем входящие данные, чтобы соответствовали ожиданиям шаблона и логики.
        var processedData = {
            id: data.id,
            title: data.name || data.title || 'Без названия',
            poster_path: data.poster || data.img,
            vote_average: data.vote_average || data.vote || null,
            quality: data.quality || data.release_quality || null,
            release_year: ((data.year || data.release_date || '') + '').slice(0, 4),
            type: data.first_air_date ? 'tv' : 'movie',
            original_name: data.original_name
        };

         // Получаем HTML из шаблона 'hanime-card'.
         // Шаблон должен использовать внутренние Lampa-подобные шаблоны и классы.
        var cardTemplate = Lampa.Template.get('hanime-card', {
            img: processedData.poster_path,
            title: processedData.title,
            vote: processedData.vote_average > 0 ? parseFloat(processedData.vote_average).toFixed(1) : '',
            quality: processedData.quality,
            year: processedData.release_year !== '0000' ? processedData.release_year : '',
            type: processedData.type
        });

        var cardElement = $(cardTemplate); // Создаем jQuery объект из HTML

        // Добавление иконок (вызывается из updateFavoriteIcons)
        this.addicon = function(name) {
            var iconsContainer = cardElement.find('.card__icons-inner');
            if (iconsContainer.length) {
                var icon = document.createElement('div');
                icon.classList.add('card__icon'); // Стандартный класс Lampa
                icon.classList.add('icon--'+name); // Стилизация иконки
                iconsContainer.append(icon);
            }
        }

        // Обновление иконок закладок и маркера статуса
        this.updateFavoriteIcons = function() {
             console.log("HanimeCard: updateFavoriteIcons() for", processedData.title);
            cardElement.find('.card__icons-inner').empty();
            cardElement.find('.card__marker').remove();

            // Проверка статуса закладки (используем Lampa.Favorite)
             var status = (window.Lampa && Lampa.Favorite) ? Lampa.Favorite.check(processedData) : {};

            if (status.book) this.addicon('book');
            if (status.like) this.addicon('like');
            if (status.wath) this.addicon('wath');
             // Проверка истории/просмотра (используем Lampa.Timeline)
            if (status.history || (window.Lampa && Lampa.Timeline && Lampa.Timeline.watched && Lampa.Timeline.watched(processedData))) this.addicon('history');

            // Маркеры статуса (look, viewed, scheduled и т.д.)
             var marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];
             var activeMarker = marks.find(m => status[m]);

             if (activeMarker) {
                 var markerElement = cardElement.find('.card__marker');
                 if (!markerElement.length) {
                     markerElement = $('<div class="card__marker"><span></span></div>');
                     cardElement.find('.card__view').append(markerElement);
                 }
                 // Перевод названия маркера (используем Lampa.Lang)
                 markerElement.find('span').text(window.Lampa && Lampa.Lang && Lampa.Lang.translate ? Lampa.Lang.translate('title_' + activeMarker) : activeMarker);
                 // Добавляем класс для стилизации маркера по типу
                 markerElement.removeClass(marks.map(m => 'card__marker--' + m).join(' '))
                             .addClass('card__marker--' + activeMarker);
             } else {
                 cardElement.find('.card__marker').remove(); // Удаляем маркер, если статуса нет
             }
        };

        // Метод вызывается, когда карточка становится видимой в области прокрутки
        this.onVisible = function() {
             console.log("HanimeCard: onVisible() for", processedData.title);
             var imgElement = cardElement.find('.card__img');

             // Загрузка картинки с кэшированием Lampa и обработчиками
             // Проверяем, если картинка уже установлена или является placeholder-ом
             if (imgElement.length && (!imgElement.attr('src') || imgElement.attr('src').includes('img_load.svg'))) {
                 var src = processedData.poster_path;

                 // Используем fallback картинку, если src пустой
                 if (!src) src = './img/img_broken.svg';

                 if(window.Lampa && Lampa.ImageCache) {
                      // Пытаемся прочитать из кэша
                      if(!Lampa.ImageCache.read(imgElement[0], src)) {
                         // Если не в кэше, загружаем
                          imgElement[0].onload = () => { cardElement.addClass('card--loaded'); Lampa.ImageCache.write(imgElement[0], imgElement[0].src); console.log("HanimeCard: Image loaded:", src); };
                          imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error:', src); imgElement.attr('src', './img/img_broken.svg'); if(window.Lampa && Lampa.Tmdb) Lampa.Tmdb.broken(); };
                          imgElement.attr('src', src); // Устанавливаем src для начала загрузки
                      } else {
                         // Если из кэша, добавляем класс 'card--loaded' сразу
                         cardElement.addClass('card--loaded');
                         console.log("HanimeCard: Image from cache:", src);
                      }
                 } else {
                     // Fallback без Lampa.ImageCache (прямая загрузка)
                      imgElement[0].onload = () => { cardElement.addClass('card--loaded'); console.log("HanimeCard: Image loaded (no cache):", src); };
                     imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error (no cache):', src); imgElement.attr('src', './img/img_broken.svg'); };
                     imgElement.attr('src', src);
                     console.log("HanimeCard: Image processing started (no cache):", src);
                 }
             }

            this.updateFavoriteIcons(); // Обновляем иконки при появлении в видимости
        }


        // Метод первоначальной настройки карточки после создания ее DOM-элемента.
        // Здесь навешиваются стандартные Lampa события.
        this.create = function(){
             console.log("HanimeCard: create() for", processedData.title);

             // Привязка событий Lampa hover:* к корневому элементу карточки ($('.hanime-card', context)).
             // События 'hover:*' генерируются Lampa.Controller при навигации.
            cardElement.on('hover:focus', function () {
                 console.log("HanimeCard: hover:focus on", processedData.title);
                 // Сообщаем родительскому компоненту, чтобы он прокрутил скролл к этому элементу.
                 if (componentRef && componentRef.updateScrollToFocus) {
                      componentRef.updateScrollToFocus(cardElement);
                 }
                 // Обновляем состояние карточки (иконки и т.п.) при получении фокуса.
                 this.update();
            }.bind(this));


             cardElement.on('hover:enter', function () {
                console.log("HanimeCard: hover:enter on", processedData.title);
                // Обработка активации (выбора) карточки.
                 if (componentRef && componentRef.onCardClick) {
                     componentRef.onCardClick(processedData);
                 }
            }.bind(this));


            cardElement.on('hover:long', function(){
                 console.log("HanimeCard: hover:long on", processedData.title);
                 // Обработка долгого нажатия (контекстное меню).
                 if (componentRef && componentRef.showCardContextMenu) {
                      componentRef.showCardContextMenu(cardElement, processedData);
                 }
             }.bind(this));


            // Привязка стандартного Lampa события 'visible'. Это событие генерируется Scroll
            // или другими компонентами Lampa, когда элемент попадает в видимую область.
             this.card = cardElement[0]; // Сохраняем нативный DOM элемент для addEventListener
             this.card.addEventListener('visible', this.onVisible.bind(this)); // Привязываем onVisible

            // Вызываем update при создании для начальной установки иконок и т.п.
            // Небольшая задержка для надежности, т.к. create может быть вызван до вставки в DOM.
             setTimeout(() => {
                  this.update();
             }, 0); // Задержка 0 мс выполнит после текущего потока выполнения

            console.log("HanimeCard: create() completed and event listeners attached.");
        }

        // Метод для обновления состояния карточки.
        this.update = function(){
             console.log("HanimeCard: update() called for", processedData.title);
            this.updateFavoriteIcons(); // Обновляем иконки и маркер
            // Логику прогресс-бара "смотрел" можно добавить здесь.
             // if(window.Lampa && Lampa.Timeline) Lampa.Timeline.watched_status(cardElement, processedData);
        }

        // Метод рендеринга. Возвращает DOM-элемент карточки (jQuery объект).
        this.render = function(js){
             console.log("HanimeCard: render() called.");
             // Ensure create is called once before rendering.
             if (!cardElement[0] || !cardElement.data('created')) { // Проверка, чтобы create вызывался один раз
                 this.create();
                 cardElement.data('created', true); // Помечаем, что create вызван
             }
            return js ? cardElement[0] : cardElement;
        }

        // Метод уничтожения экземпляра карточки.
        this.destroy = function(){
             console.log("HanimeCard: destroy() for", processedData.title);
             // Удаляем обработчик 'visible'
             if(this.card) this.card.removeEventListener('visible', this.onVisible.bind(this));
             // Удаляем DOM-элемент карточки из документа.
             if(cardElement) cardElement.remove();
            // Обнуляем ссылки.
             processedData = null;
             cardElement = null;
             this.card = null;
             componentRef = null;
             console.log("HanimeCard: destroy() completed.");
        }

         // Важно: вызываем create только ОДИН раз. В Lampa, компонент управляет вызовами render, pause, start, destroy.
         // Обычно HanimeCard создается в HanimeComponent.build(), и тогда HanimeComponent вызывает render().
         // Инициализация должна происходить, когда render() будет вызван ВПЕРВЫЕ.
         // Удаляем этот вызов create(); здесь. Он будет вызван в HanimeCard.render().
    }


    // --- HanimeComponent (основной компонент каталога, отображает одну горизонтальную линию) ---
    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest(); // Для сетевых запросов

        // Инициализируем ГОРИЗОНТАЛЬНЫЙ Scroll
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });

        var items = []; // Массив объектов HanimeCard
        var html; // Корневой DOM-контейнер компонента (будет items-line)
        var itemsContainer; // Контейнер для карточек внутри Scroll (.scroll__body .items-cards)

        var active = 0; // Индекс активного элемента в массиве items (для сохранения состояния)
        var last; // DOM-элемент последней сфокусированной карточки (для восстановления фокуса и прокрутки)

        // Ваши API URL-ы
        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json"; // Пример URL для "Последних добавленных"
        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";
        var PROXY_BASE_URL = "http://77.91.78.5:3000";


        // Метод для создания DOM-структуры компонента (items-line). Вызывается в create().
        this.buildLayout = function() {
             console.log("HanimeComponent: buildLayout()");
             // Используем стандартные классы для items-line.
            html = $(`
                <div class="items-line layer--visible layer--render items-line--type-cards">
                    <div class="items-line__head">
                        <div class="items-line__title">Последние добавленные</div>
                         <!-- Пример стандартной кнопки "Еще", если нужно. Требует обработки click. -->
                         <!-- <div class="items-line__more selector">Еще</div> -->
                    </div>
                    <div class="items-line__body">
                        <!-- Scroll компонент будет вставлен сюда при build() -->
                    </div>
                </div>
            `);

            // Контейнер, в который будут добавлены все карточки. Scroll обернет его в .scroll__body.
             itemsContainer = $('<div class="items-cards"></div>');
             console.log("HanimeComponent: buildLayout completed. itemsContainer created.");
        };

        // Метод для загрузки данных каталога. Вызывается в create().
        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true);
            console.log("HanimeComponent: fetchCatalog() from", CATALOG_URL);

            // Очищаем предыдущие запросы
            if(network) network.clear();

            network.native(CATALOG_URL,
                function (data) {
                     console.log("HanimeComponent: Catalog data received.");
                    if (data && data.metas && Array.isArray(data.metas)) {
                         if (data.metas.length > 0) {
                            _this.build(data.metas); // Если есть данные, строим UI
                         } else {
                            _this.empty("Каталог пуст."); // Если данных нет, показываем Empty
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
                false, // Не кэшировать ответ по URL
                {
                    dataType: 'json', // Ожидаем JSON
                    timeout: 15000 // Таймаут 15 секунд
                }
            );
        };

        // Метод для построения DOM на основе полученных данных. Вызывается в fetchCatalog().
        this.build = function (result) {
            var _this = this;
             console.log("HanimeComponent: build() with", result.length, "items.");

            // Прокручиваем скролл на начало перед добавлением новых элементов (для многостраничных категорий)
            if(scroll) scroll.minus();

            // Очищаем предыдущие карточки и массив объектов HanimeCard
             if (itemsContainer) itemsContainer.empty();
            items = [];

            // Создаем и добавляем новые HanimeCard
            result.forEach(function (meta) {
                // Создаем экземпляр HanimeCard, передавая данные и ссылку на _this компонента
                var card = new HanimeCard(meta, _this);
                // Получаем DOM элемент карточки
                var cardElement = card.render();

                // Добавляем DOM элемент карточки в контейнер для элементов скролла
                 if (itemsContainer) itemsContainer.append(cardElement);
                // Сохраняем объект HanimeCard в массиве items
                items.push(card);
            });
             console.log("HanimeComponent: Created", items.length, "cards.");


            // Добавляем контейнер с карточками в Scroll компонент.
            // Scroll автоматически создает свою обертку (.scroll__content, .scroll__body) вокруг него.
             if(scroll && itemsContainer) scroll.append(itemsContainer);
             else console.error("HanimeComponent: Scroll or itemsContainer not available in build().");


            // Вставляем рендер Scroll компонента в items-line__body основного DOM компонента.
            // scroll.render() возвращает корневой DOM Scroll.
            // true = заставляем Scroll пересчитать свои размеры и положение после добавления содержимого.
             if(html && scroll) html.find('.items-line__body').empty().append(scroll.render(true));
             else console.error("HanimeComponent: Html or scroll not available in build().");

            _this.activity.loader(false); // Скрываем индикатор загрузки
            _this.activity.toggle(); // Показываем основной DOM компонента

            console.log("HanimeComponent: Build completed and activity toggled.");

            // Контроллер будет настроен в start(), где произойдет initial focus и scroll follow.
        };

         // Метод для обработки клика/выбора карточки. Вызывается из HanimeCard.
         this.onCardClick = function(cardData) {
             console.log("HanimeComponent: Card clicked:", cardData);
             // Вызываем метод загрузки потока и метаданных для запуска плеера
            this.fetchStreamAndMeta(cardData.id, cardData);
         }

         // Метод для показа контекстного меню карточки. Вызывается из HanimeCard.
         this.showCardContextMenu = function(cardElement, cardData) {
             console.log("HanimeComponent: showCardContextMenu for", cardData.title);
             var _this = this;
             // Определяем, какой Controller сейчас активен, чтобы вернуться к нему после закрытия меню
             var enabled = (window.Lampa && Lampa.Controller && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;

             // Определяем статус закладки (используем Lampa.Favorite)
             var status = (window.Lampa && Lampa.Favorite) ? Lampa.Favorite.check(cardData) : {};

             // Формируем пункты меню. Используем Lampa.Lang для переводов.
             var menu_favorite = [
                 { title: (window.Lampa && Lampa.Lang && Lampa.Lang.translate) ? Lampa.Lang.translate('title_book') : 'Запланировано', where: 'book', checkbox: true, checked: status.book },
                 { title: (window.Lampa && Lampa.Lang && Lampa.Lang.translate) ? Lampa.Lang.translate('title_like') : 'Нравится', where: 'like', checkbox: true, checked: status.like },
                 { title: (window.Lampa && Lampa.Lang && Lampa.Lang.translate) ? Lampa.Lang.translate('title_wath') : 'Смотрю', where: 'wath', checkbox: true, checked: status.wath },
                 { title: (window.Lampa && Lampa.Lang && Lampa.Lang.translate) ? Lampa.Lang.translate('menu_history') : 'История', where: 'history', checkbox: true, checked: status.history },
                 { title: (window.Lampa && Lampa.Lang && Lampa.Lang.translate) ? Lampa.Lang.translate('settings_cub_status') : 'Статус', separator: true } // Разделитель
                 // Можно добавить маркеры look, viewed и т.д. по аналогии с HanimeCard updateFavoriteIcons
             ];

             // Показываем стандартный Select (меню Lampa)
             if (window.Lampa && Lampa.Select) {
                 Lampa.Select.show({
                     title: (window.Lampa && Lampa.Lang && Lampa.Lang.translate) ? Lampa.Lang.translate('title_action') : 'Действие', // Заголовок меню
                     items: menu_favorite,
                     onBack: ()=>{
                         // При закрытии меню, возвращаем управление Controller-у, который был активен до меню.
                         if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                          console.log("HanimeComponent: Context menu back. Restored controller:", enabled);
                     },
                     onCheck: (a)=>{
                         // Обработка выбора чекбокса (закладки)
                         console.log("HanimeComponent: Context menu checked:", a.where);
                         if(window.Lampa && Lampa.Favorite) Lampa.Favorite.toggle(a.where, cardData);
                         // Обновляем иконки закладок на конкретной карточке
                         var cardObj = items.find(item => item.render(true) === cardElement[0]);
                         if(cardObj) cardObj.updateFavoriteIcons();
                     },
                     onSelect: (a)=>{
                         // Обработка выбора обычного пункта меню (например, маркеры статуса)
                          console.log("HanimeComponent: Context menu selected:", a);
                          if(a.collect){ // Если это пункт, который переключает статус маркера
                              if(window.Lampa && Lampa.Favorite) Lampa.Favorite.toggle(a.where, cardData);
                               var cardObj = items.find(item => item.render(true) === cardElement[0]);
                              if(cardObj) cardObj.updateFavoriteIcons();
                          }
                          // Закрываем меню
                          Lampa.Select.close();
                           // Возвращаем управление Controller-у
                           if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                            console.log("HanimeComponent: Context menu selected and closed. Restored controller:", enabled);
                     },
                      // Настройка внешнего вида пунктов меню (например, добавление иконки замка для Premium)
                      onDraw: (item, elem) => {
                           // Проверяем, если пункт требует Premium и у пользователя нет Premium
                           if (elem.collect && window.Lampa && Lampa.Account && !Lampa.Account.hasPremium()) {
                               // Находим стандартный шаблон иконки замка. Проверяем, что он добавлен ранее.
                                let lockIconTemplate = (window.Lampa && Lampa.Template && Lampa.Template.has('icon_lock')) ? Lampa.Template.get('icon_lock') : '';
                                if (lockIconTemplate) {
                                     let wrap = $('<div class="selectbox-item__lock"></div>');
                                     wrap.append($(lockIconTemplate)); // Создаем jQuery объект из HTML
                                     item.find('.selectbox-item__checkbox').remove(); // Удаляем чекбокс, если есть
                                     item.append(wrap); // Добавляем замок

                                     // Обработчик Enter на пункте с замком - показать окно Premium
                                     item.on('hover:enter', () => {
                                         Lampa.Select.close(); // Закрываем меню
                                          if (Lampa.Account) Lampa.Account.showCubPremium(); // Показываем окно Premium
                                     });
                                } else {
                                     console.warn("Hanime Component: icon_lock template not available for Premium item.");
                                }
                           }
                      }
                 });
             } else {
                 console.warn("Hanime Component: Lampa.Select not available for context menu.");
                 if(window.Lampa && Lampa.Noty) Lampa.Noty.show('Компонент меню недоступен.');
             }
         };

        // Метод для прокрутки Scroll к сфокусированному элементу. Вызывается из HanimeCard hover:focus.
        this.updateScrollToFocus = function(element) {
            // 'element' здесь - это jQuery объект карточки
             console.log("HanimeComponent: updateScrollToFocus() called.");
             // Проверяем, что Scroll инстанс доступен
            if (scroll) {
                last = element[0]; // Сохраняем ссылку на нативный DOM элемент для восстановления фокуса
                scroll.update(element, true); // Вызываем метод Scroll для прокрутки к элементу с плавностью
                 console.log("HanimeComponent: Scroll updated to focused element:", last);
            } else {
                console.warn("HanimeComponent: Scroll instance not available for update.");
            }
        }

        // Метод загрузки стрима и метаданных для воспроизведения (без изменений)
        this.fetchStreamAndMeta = function (id, meta) {
             // (Ваша реализация этого метода без изменений, добавьте только console.log и проверки window.Lampa.*)
             var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

            _this.activity.loader(true);
            console.log("HanimeComponent: fetchStreamAndMeta for", id);

            if (!network) {
                console.error("HanimeComponent: Network component not available.");
                _this.activity.loader(false);
                 if(window.Lampa && Lampa.Noty) Lampa.Noty.show('Сетевой компонент недоступен.');
                return;
            }

            Promise.all([
                new Promise((resolve, reject) => {
                    network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                }),
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                     network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                 })
            ]).then(([streamData, metaDataResponse]) => {
                _this.activity.loader(false);
                const fullMetaData = metaDataResponse.meta || metaDataResponse;
                console.log("HanimeComponent: Stream data:", streamData, "Meta data:", fullMetaData);

                if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0];
                    var finalStreamUrl = streamToPlay.url;

                    try {
                         // Улучшенная проверка и парсинг URL для проксирования
                         var url = new URL(finalStreamUrl); // Создаем объект URL для легкого доступа к hostname
                         if (url.hostname && url.hostname.includes('highwinds-cdn.com')) { // Проверяем hostname на highwinds-cdn.com
                             finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`; // Оборачиваем прокси
                             console.log("HanimeComponent: Stream URL proxied:", finalStreamUrl);
                         } else {
                            console.log("HanimeComponent: Stream URL not needing proxy:", finalStreamUrl);
                         }
                    } catch (e) {
                        console.error("HanimeComponent: Failed to parse or proxy stream URL", e);
                        console.log("HanimeComponent: Using original stream URL due to parse error:", finalStreamUrl);
                    }

                    var playerObject = {
                        title: fullMetaData.name || fullMetaData.title || 'Без названия',
                        url: finalStreamUrl, // Используем потенциально проксированный URL
                        poster: fullMetaData.poster || fullMetaData.background || '', // Fallback пустая строка для постера
                         // Можно добавить другие поля для плеера Lampa, если API их предоставляет
                         // duration: fullMetaData.runtime * 60, // Например, длительность в секундах
                         // subtitles: streamToPlay.subtitles // Если есть субтитры в потоке
                    };

                    if (playerObject.url && window.Lampa && Lampa.Player) {
                         console.log("HanimeComponent: Launching player.");
                         Lampa.Player.play(playerObject);
                         // Очищаем старый плейлист и добавляем текущий элемент.
                         // Если вы хотите плейлист со всеми эпизодами, логика должна быть сложнее.
                         Lampa.Player.playlist([playerObject]);

                         if (fullMetaData && window.Lampa && Lampa.Favorite) {
                                const historyMeta = {
                                    id: fullMetaData.id || '', // Убедимся, что id всегда строка
                                    title: fullMetaData.name || fullMetaData.title || '',
                                    poster: fullMetaData.poster || fullMetaData.background || '',
                                    runtime: fullMetaData.runtime, // number or null
                                    year: fullMetaData.year, // number or null
                                    original_name: fullMetaData.original_name || ''
                                };
                                Lampa.Favorite.add('history', historyMeta, 100);
                                console.log("HanimeComponent: Added to history:", historyMeta);
                         }

                    } else {
                         console.error("HanimeComponent: Cannot launch player - No URL or Lampa.Player not available.");
                         if(window.Lampa && Lampa.Noty) Lampa.Noty.show(playerObject.url ? 'Компонент плеера недоступен.' : 'Не удалось получить ссылку на поток.');
                    }

                } else {
                     console.warn("HanimeComponent: No streams found in data or invalid data structure.");
                     if(window.Lampa && Lampa.Noty) Lampa.Noty.show('Потоки не найдены для этого аниме.');
                }

            }).catch(error => {
                _this.activity.loader(false);
                console.error("HanimeComponent: Error fetching stream/meta details:", error);
                 if(window.Lampa && Lampa.Noty) Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'));
            });
        };


        // Метод для отображения пустого состояния или ошибки (без изменений, добавлено больше проверок)
        this.empty = function (msg) {
             console.log("HanimeComponent: empty() -", msg);
             // Проверяем, что Lampa.Empty доступен
             if (window.Lampa && Lampa.Empty) {
                 var empty = new Lampa.Empty({ message: msg });
                 // Заменяем текущий контент основного DOM компонента на Empty компонент
                 if(html) html.empty().append(empty.render(true));
                 else console.warn("HanimeComponent: Html container not available to show empty state.");

                 this.activity.loader(false);
                 this.activity.toggle();
                 // Переназначаем метод start этой активности на start Empty компонента
                 // Это передает управление Lampa.Controller Empty компоненту для навигации (например, кнопка Назад)
                 this.start = empty.start;
                  console.log("HanimeComponent: Displaying empty state via Lampa.Empty.");
             } else {
                  // Fallback на случай, если Lampa.Empty недоступен
                  console.warn("HanimeComponent: Lampa.Empty not available, using basic text for empty state.");
                  if(html) html.empty().text(msg + ' (Компонент Empty недоступен в Lampa)');
                  this.activity.loader(false);
                  this.activity.toggle();
                   // В этомfallback, метод start не делает ничего кроме настройки Controller.
                   this.start = function() {
                        console.log("HanimeComponent: Fallback start() for empty state.");
                       // Устанавливаем минимальный контроллер, чтобы кнопка "Назад" работала.
                       if(window.Lampa && Lampa.Controller) {
                            Lampa.Controller.add('content', { back: this.back });
                            Lampa.Controller.toggle('content');
                       }
                   }.bind(this); // Важно привязать контекст this
             }
        };


        // Метод, вызываемый при создании активности Lampa.
        this.create = function () {
            console.log("HanimeComponent: create()");
            // Построим основную структуру DOM компонента items-line
            this.buildLayout();
            // Показываем индикатор загрузки Lampa
            this.activity.loader(true);
            // Начинаем загрузку данных каталога
            this.fetchCatalog();
             console.log("HanimeComponent: create() finished. Fetching catalog.");
        };


        // Метод, вызываемый, когда активность становится видимой и должна получить фокус Controller.
        this.start = function () {
            console.log("HanimeComponent: start()");
             // Проверяем, является ли эта активность текущей активной активностью Lampa
            if (window.Lampa && Lampa.Activity && Lampa.Activity.active().activity !== this.activity) {
                console.log("HanimeComponent: start() - Not the active activity, skipping.");
                return;
            }
             console.log("HanimeComponent: start() - Activity is active. Setting up Lampa.Controller.");

            // Настраиваем Lampa.Controller для управления навигацией в этой активности.
            // 'content' - это стандартное имя контроллера для основного содержимого активности.
            if (window.Lampa && Lampa.Controller && scroll) {
                 Lampa.Controller.add('content', {
                     toggle: function () {
                         console.log("HanimeComponent: Controller toggle() called.");
                         // 1. Указываем Controller-у коллекцию навигационных элементов.
                         //    scroll.render() возвращает корневой DOM Scroll (содержащий наши карточки).
                         Lampa.Controller.collectionSet(scroll.render());
                         // 2. Устанавливаем начальный фокус.
                         //    collectionFocus ищет элемент для фокусировки (последний | первый)
                         //    и ставит на него программный фокус, что ВЫЗЫВАЕТ СОБЫТИЕ 'hover:focus' на элементе.
                         Lampa.Controller.collectionFocus(last || false, scroll.render());
                          console.log("HanimeComponent: Controller collectionSet/Focus finished.");
                     },
                     // Обработчики навигационных кнопок (Left, Right, Up, Down, Back)
                     left: function () {
                         // Проверяем, может ли Navigator переместить фокус влево (внутри Scroll)
                         if (Navigator.canmove('left')) Navigator.move('left');
                          // Если нет элементов слева в текущей коллекции, переключаем контроллер на 'menu'
                         else if (window.Lampa && Lampa.Controller) Lampa.Controller.toggle('menu');
                         else console.log("HanimeComponent: Cannot move left and menu controller not available.");
                     },
                     right: function () {
                         // Проверяем, может ли Navigator переместить фокус вправо (внутри Scroll)
                         if (Navigator.canmove('right')) Navigator.move('right');
                          else console.log("HanimeComponent: Cannot move right.");
                     },
                     up: function () {
                         // В рамках одной горизонтальной линии, UP/DOWN обычно переключает между линиями
                         // или на шапку (Header) / подвал (Footer).
                         // Здесь, так как только одна линия, UP переключает на стандартный Lampa Header.
                         if (window.Lampa && Lampa.Controller) Lampa.Controller.toggle('head');
                         else console.log("HanimeComponent: Head controller not available for UP.");
                     },
                     down: function () {
                          // Здесь нет элементов или линий под текущей. Controller.canmove('down') скорее всего вернет false.
                         if (Navigator.canmove('down')) Navigator.move('down');
                          else console.log("HanimeComponent: Cannot move down.");
                     },
                     // Назначаем метод back нашего компонента для кнопки Назад
                     back: this.back
                 });

                 // Активируем наш контроллер 'content'. Это вызовет его метод toggle() один раз.
                 Lampa.Controller.toggle('content');
                  console.log("HanimeComponent: Controller 'content' toggled.");

                 // Начальная прокрутка к первому элементу происходит автоматически
                 // благодаря hover:focus, который вызывается после Controller.collectionFocus.

             } else {
                console.error("HanimeComponent: Lampa.Controller or scroll not available in start().");
                // Если контроллер или скролл недоступны, можем по крайней мере добавить обработчик Back.
                 if(window.Lampa && Lampa.Controller) {
                     Lampa.Controller.add('content', { back: this.back });
                     Lampa.Controller.toggle('content');
                 } else console.warn("HanimeComponent: Lampa.Controller not available, basic Back might not work.");
             }
        };

        // Метод, вызываемый при паузе активности (переходе на другую).
        this.pause = function () {
             console.log("HanimeComponent: pause()");
             // Сохраняем ссылку на DOM элемент, который был в фокусе перед паузой.
             // Controller.item() возвращает текущий фокусированный DOM элемент.
             if(window.Lampa && Lampa.Controller && Lampa.Controller.enabled().name === 'content') {
                 last = Lampa.Controller.item() || last; // Сохраняем текущий фокус, или последний известный
                  console.log("HanimeComponent: Paused. Saved last focused item:", last);
             } else {
                  console.log("HanimeComponent: Pause called, but content controller not active. Last focus not saved.");
             }
        };

        // Метод, вызываемый при остановке активности (перед уничтожением).
        this.stop = function () {
             console.log("HanimeComponent: stop()");
            // В Stop обычно сбрасываются таймауты/интервалы. Основная очистка ресурсов в destroy.
        };

        // Метод рендеринга. Возвращает корневой DOM-элемент компонента для вставки в структуру Lampa.
        this.render = function () {
             console.log("HanimeComponent: render() called.");
             // Убеждаемся, что layout создан перед возвратом DOM элемента.
            if (!html) {
                 this.buildLayout();
            }
            return html; // Возвращаем jQuery объект корневого DOM элемента
        };

        // Метод уничтожения. Освобождает все ресурсы компонента.
        this.destroy = function () {
            console.log("HanimeComponent: destroy() called.");
             // Отменяем сетевые запросы
            if(network) network.clear();
            network = null;

            // Уничтожаем объекты карточек в массиве (вызывая их метод destroy)
            if (items && window.Lampa && Lampa.Arrays) Lampa.Arrays.destroy(items);
            items = null;

            // Уничтожаем Scroll компонент
            if (scroll) scroll.destroy();
            scroll = null;

            // Удаляем корневой DOM элемент компонента из документа
            if (html) html.remove();
            html = null;
            itemsContainer = null; // Также обнуляем ссылку на контейнер карточек

            // Очищаем и удаляем наш Controller
            if (window.Lampa && Lampa.Controller) {
                // Если наш контроллер 'content' сейчас активен, сначала очистим его коллекцию
                // и можем попробовать вернуться к базовому контроллеру (app), прежде чем удалить наш.
                 if (Lampa.Controller.enabled().name === 'content') {
                      Lampa.Controller.collectionSet([]); // Снимаем элементы с Controller-а
                     // Lampa.Controller.toggle('app'); // Возвращаемся в основной контроллер (опционально, Lampa может сама)
                      console.log("HanimeComponent: Content controller active, collection cleared.");
                 }
                 Lampa.Controller.remove('content'); // Удаляем зарегистрированный контроллер
                  console.log("HanimeComponent: Content controller removed.");
            }

            // Сбрасываем последний сфокусированный элемент
            last = null;

            console.log("HanimeComponent: destroy() finished. Resources released.");
        };

        // Обработчик кнопки "Назад".
        this.back = function () {
             console.log("HanimeComponent: back() called. Navigating backward.");
             // Используем стандартный метод Lampa.Activity для навигации назад в стеке активностей.
             if(window.Lampa && Lampa.Activity) Lampa.Activity.backward();
             else console.warn("HanimeComponent: Lampa.Activity not available for backward.");
        };
    }

    // --- Функция инициализации плагина. Входная точка. ---
    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() invoked.");

        // Проверяем флаг, чтобы избежать повторной инициализации.
        if (window.plugin_hanime_catalog_ready) {
             console.log("Hanime Plugin: Plugin flag already set. Skipping startPlugin.");
             return;
        }

        // Отдельная функция, содержащая логику инициализации Lampa-зависимых частей плагина.
        // Эта функция будет вызвана, когда Lampa будет готова.
        function initializeLampaDependencies() {
             console.log("Hanime Plugin: initializeLampaDependencies() called (Lampa appready).");

             // Устанавливаем флаг после того, как Lampa готова и мы собираемся добавить наши компоненты.
             window.plugin_hanime_catalog_ready = true;
             console.log("Hanime Plugin: plugin_hanime_catalog_ready flag set.");

             // --- 1. Определение СТАНДАРТНЫХ ВНУТРЕННИХ шаблонов Lampa (как fallback) ---
             // ОПРЕДЕЛЯЕМ ИХ ПЕРЕД ШАБЛОНОМ hanime-card, который их использует.
             // Используем проверки наличия, но в случае отсутствия просто добавляем.
             console.log("Hanime Plugin: Checking/Adding standard template fallbacks...");
             if (window.Lampa && Lampa.Template) {
                 // Добавляем шаблоны только если компонент Lampa.Template существует.
                 if(!Lampa.Template.has('card_vote_temp')) {
                      console.log("Hanime Plugin: Adding card_vote_temp template.");
                      Lampa.Template.add('card_vote_temp', '<div class="card__vote hanime-card__vote">{vote}</div>');
                 }
                  if(!Lampa.Template.has('card_quality_temp')) {
                       console.log("Hanime Plugin: Adding card_quality_temp template.");
                       Lampa.Template.add('card_quality_temp', '<div class="card__quality hanime-card__quality"><div>{quality}</div></div>');
                  }
                  if(!Lampa.Template.has('card_year_temp')) {
                       console.log("Hanime Plugin: Adding card_year_temp template.");
                       Lampa.Template.add('card_year_temp', '<div class="card__age hanime-card__age">{year}</div>');
                  }
                   // Шаблон для типа (TV/Movie)
                  if(!Lampa.Template.has('card_type_temp')) {
                       console.log("Hanime Plugin: Adding card_type_temp template.");
                       Lampa.Template.add('card_type_temp', '<div class="card__type hanime-card__type">{type}</div>');
                  }
                  // Шаблон для иконки замка (используется в контекстном меню для Premium)
                 if(!Lampa.Template.has('icon_lock')) {
                      console.log("Hanime Plugin: Adding icon_lock template.");
                      Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
                 }
             } else {
                 console.error("Hanime Plugin: Lampa.Template component not available.");
             }
             console.log("Hanime Plugin: Standard templates check/add completed.");


             // --- 2. Определение ВАШЕГО основного шаблона карточки ---
             // Этот шаблон должен теперь успешно найти внутренние шаблоны, определенные выше.
             if (window.Lampa && Lampa.Template) {
                 console.log("Hanime Plugin: Adding hanime-card template...");
                 Lampa.Template.add('hanime-card', `
                     <div class="hanime-card card selector layer--visible layer--render">
                         <div class="card__view hanime-card__view">
                             <img src="./img/img_load.svg" class="card__img hanime-card__img" alt="{title}" loading="lazy" />
                             <div class="card__icons hanime-card__icons">
                                 <div class="card__icons-inner hanime-card__icons-inner"></div>
                             </div>
                             <!-- Вставляем внутренние блоки с данными через Lampa.Template.get -->
                             ${Lampa.Template.has('card_vote_temp') ? Lampa.Template.get('card_vote_temp', { vote: '{vote}' }) : ''}
                             ${Lampa.Template.has('card_quality_temp') ? Lampa.Template.get('card_quality_temp', { quality: '{quality}' }) : ''}
                             ${Lampa.Template.has('card_type_temp') ? Lampa.Template.get('card_type_temp', { type: '{type}' }) : ''}
                         </div>
                         <div class="card__title hanime-card__title">{title}</div>
                         ${Lampa.Template.has('card_year_temp') ? Lampa.Template.get('card_year_temp', { year: '{year}' }) : ''}
                     </div>
                 `);
                 console.log("Hanime Plugin: HanimeCard template added.");
             }


             // --- 3. Добавление CSS Стили ---
             // Эти стили определяют внешний вид на основе стандартных классов Lampa.
             console.log("Hanime Plugin: Adding CSS styles...");
             var style = `
                /* Ваши CSS стили как в предыдущем варианте */
                .items-line { padding: 1em 0; }
                .items-line__head { padding: 0 3.5em 1em 3.5em; }
                .items-line__body { padding: 0 2.5em; }

                .card {
                     width: 185px;
                     height: auto; /* Allow height to be determined by content */
                     margin: 0 0.5em;
                     border-radius: 0.5em; overflow: hidden;
                     transition: transform 0.2s ease, box-shadow 0.2s ease;
                     position: relative; box-sizing: border-box;
                     background-color: rgba(255,255,255,0.05);
                     text-align: center; /* Center text for title/age */
                      display: inline-block; /* Essential for horizontal layout in items-cards */
                      vertical-align: top; /* Align cards to the top in the row */
                }

                 /* Standard Lampa Focus Style */
                .card.selector:focus {
                    transform: scale(1.05);
                    box-shadow: 0 0 15px rgba(255, 165, 0, 0.8); /* Orange glow example */
                    z-index: 5;
                    border-color: transparent; /* No border for focus */
                }
                .card.selector.focus:not(.native) { outline: none; }


                .card__view {
                     position: relative; width: 100%; height: 270px;
                     border-radius: 0.5em; overflow: hidden;
                     background-color: rgba(255,255,255,0.05);
                }

                 .card__img {
                      position: absolute; width: 100%; height: 100%;
                      object-fit: cover; border-radius: 0.5em;
                      opacity: 0.9; transition: opacity 0.2s ease;
                 }
                 .card--loaded .card__img { opacity: 1; }


                .card__icons { position: absolute; top: 0.5em; right: 0.5em; z-index: 2; }
                .card__icons-inner { display: flex; flex-direction: column; gap: 0.3em; }
                .card__icon {
                     width: 1em; height: 1em; padding: 0.3em; border-radius: 50%;
                     background-color: rgba(0,0,0,0.5);
                 }

                .card__vote {
                     position: absolute; bottom: 0.5em; left: 0.5em;
                     background-color: rgba(0,0,0,0.7); color: #fff;
                     padding: 0.2em 0.4em; border-radius: 0.3em;
                     font-size: 0.9em; font-weight: bold; z-index: 2;
                }

                .card__quality {
                    position: absolute; bottom: 0.5em; right: 0.5em;
                     background-color: rgba(0,0,0,0.7); color: #fff;
                     padding: 0.2em 0.4em; border-radius: 0.3em;
                     font-size: 0.9em; z-index: 2;
                 }

                .card__type {
                      position: absolute; top: 0.5em; left: 0.5em;
                     background-color: rgba(0,0,0,0.7); color: #fff;
                     padding: 0.2em 0.4em; border-radius: 0.3em;
                     font-size: 0.9em; font-weight: bold; z-index: 2;
                 }


                .card__title {
                     margin-top: 0.5em; padding: 0 0.2em;
                     font-size: 1em; font-weight: bold;
                     white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                     text-align: center; color: #fff;
                 }

                .card__age {
                    text-align: center;
                    font-size: 0.9em;
                    color: rgba(255, 255, 255, 0.7);
                 }

                 /* Marker style */
                  .card__marker {
                       position: absolute; top: 0; left: 0; right: 0;
                       background-color: rgba(0,0,0,0.7); /* Dark semi-transparent background */
                       color: #fff; text-align: center; font-size: 0.8em;
                       padding: 0.2em; z-index: 3;
                  }
                  /* Optional: style markers based on status */
                   .card__marker--viewed { background-color: rgba(0,128,0,0.7); } /* Green */
                   .card__marker--continued { background-color: rgba(0,0,255,0.7); } /* Blue */
                   .card__marker--planned, .card__marker--scheduled { background-color: rgba(255,165,0,0.7); } /* Orange/Yellow */
                   .card__marker--thrown { background-color: rgba(255,0,0,0.7); } /* Red */


                .menu__ico svg { width: 1.5em; height: 1.5em; }
            `;

             if (window.Lampa && Lampa.Template) {
                 Lampa.Template.add('hanime-style', `<style>${style}</style>`);
                 $('head').append(Lampa.Template.get('hanime-style', {}, true));
                 console.log("Hanime Plugin: CSS styles added.");
             } else {
                 console.error("Hanime Plugin: Cannot add CSS, Lampa.Template or jQuery not available.");
                 // Fallback: Attempt to add style tag directly if jQuery exists
                 if (window.$) {
                     $('<style>').text(style).appendTo('head');
                     console.log("Hanime Plugin: CSS styles added using jQuery fallback.");
                 } else {
                     console.error("Hanime Plugin: Cannot add CSS, jQuery not available.");
                 }
             }


             // --- 4. Регистрируем ВАШ компонент в Lampa Component Manager ---
             if (window.Lampa && Lampa.Component) {
                 Lampa.Component.add('hanime_catalog', HanimeComponent);
                 console.log("Hanime Plugin: Component 'hanime_catalog' registered.");
             } else {
                 console.error("Hanime Plugin: Lampa.Component not available.");
             }


             // --- 5. Добавляем пункт меню (только после appready и регистрации компонента) ---
             addMenuItem(); // Функция определена ниже.
             console.log("Hanime Plugin: Initializing menu item addition logic.");

             console.log("Hanime Plugin: initializeLampaDependencies() finished.");
        }


        // Отдельная функция для добавления пункта меню. Вызывается из initializeLampaDependencies().
        function addMenuItem() {
             console.log("Hanime Plugin: addMenuItem() called.");

             // Проверяем наличие Lampa и jQuery перед взаимодействием с DOM Lampa
             if (!window.Lampa || !window.Lampa.Activity || !window.Lampa.Controller || !window.$ || !window.Lampa.Template || !Lampa.Template.has('hanime_catalog')) {
                  console.warn("Hanime Plugin: Cannot add menu item. Lampa components or 'hanime_catalog' template not fully ready.");
                  return; // Выходим, если не все компоненты Lampa доступны или наш компонент не зарегистрирован.
             }


             // Проверка на случай дублирования элемента меню (менее вероятна при правильном тайминге, но для надежности)
             if ($('.menu .menu__list .menu__text:contains("Hanime Catalog")').length > 0) {
                 console.log("Hanime Plugin: Menu item already exists.");
                 return;
             }

             console.log("Hanime Plugin: Creating menu item DOM element.");
            // Создаем DOM элемент пункта меню со стандартными классами Lampa.
            // Класс 'selector' ОБЯЗАТЕЛЕН для того, чтобы Controller мог фокусироваться на пункте меню.
            var menu_item = $(`
                <li class="menu__item selector">
                    <div class="menu__ico">
                        <!-- Ваша иконка -->
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">Hanime Catalog</div>
                </li>
            `);

            // Привязываем обработчик события hover:enter (нажатие ОК/Выбор) к пункту меню.
            menu_item.on('hover:enter', function () {
                 console.log("Hanime Plugin: Menu item activated ('hover:enter'). Pushing activity.");
                 // При активации пункта меню запускаем нашу новую активность (HanimeComponent).
                Lampa.Activity.push({
                    url: '', // Можно использовать для глубоких ссылок, если плагин их поддерживает.
                    title: 'Hanime Catalog', // Заголовок, отображаемый в шапке активности.
                    component: 'hanime_catalog', // Имя зарегистрированного компонента для этой активности.
                    page: 1 // Опционально, для компонентов с пагинацией.
                });
            });

            // Находим первое основное меню в DOM Lampa (обычно '.menu .menu__list').
            // Убедимся, что элемент найден перед append.
            var menuList = $('.menu .menu__list').eq(0);
             if (menuList.length > 0) {
                 menuList.append(menu_item); // Добавляем наш пункт в список меню.
                 console.log("Hanime Plugin: Menu item added to DOM.");
             } else {
                 console.error("Hanime Plugin: Could not find Lampa menu list to append menu item.");
             }
        }


        // --- Входная точка логики, которая ждет готовности Lampa ---
        // Проверяем, установила ли Lampa глобальный флаг 'appready'.
        if (window.appready) {
             console.log("Hanime Plugin: Lampa is already appready. Calling initializeLampaDependencies directly.");
            // Если Lampa уже готова, вызываем функцию инициализации сразу.
            initializeLampaDependencies();
        } else {
             console.log("Hanime Plugin: Lampa is not yet appready. Setting up listener.");
            // Если Lampa еще не готова, подписываемся на стандартное событие готовности 'app'.
            // Это стандартный способ Lampa сообщать плагинам о полной загрузке.
            if (window.Lampa && Lampa.Listener) {
                Lampa.Listener.follow('app', function (e) {
                    if (e.type === 'ready') {
                        console.log("Hanime Plugin: Lampa 'appready' event received.");
                        // Когда Lampa готова, вызываем нашу функцию инициализации.
                        initializeLampaDependencies();
                    }
                });
            } else {
                console.error("Hanime Plugin: Lampa.Listener not available. Cannot wait for appready.");
                 // Если Listener недоступен, возможно, Lampa не загрузилась правильно или версия другая.
                 // В этом случае плагин может не работать. Можно попытаться инициализировать
                 // сразу с задержкой, но это менее надежно.
                 console.log("Hanime Plugin: Attempting delayed initialization as fallback...");
                 setTimeout(initializeLampaDependencies, 2000); // Пример: попытка через 2 секунды
            }
        }

        console.log("Hanime Plugin: startPlugin() finished setting up listener.");
    }

    // Вызываем startPlugin() при загрузке файла скрипта плагина.
    startPlugin();

})();
