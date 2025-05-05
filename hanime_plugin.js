(function () {
    'use strict';

    // --- Объявление HanimeCard компонента (остается без изменений) ---
    // Адаптирован для использования стандартных классов Lampa и обработки данных.
    function HanimeCard(data, params = {}, componentRef) {
        var processedData = {
            id: data.id,
            title: data.name || data.title || 'Без названия',
            poster_path: data.poster || data.img,
            vote_average: data.vote_average || data.vote || null,
            quality: data.quality || data.release_quality || null,
            release_year: ((data.year || data.release_date || '') + '').slice(0, 4),
            type: data.first_air_date ? 'tv' : 'movie', // Добавляем тип
            original_name: data.original_name
        };

         // Получаем HTML-код карточки из шаблона 'hanime-card'.
         // Важно: этот шаблон использует внутренние стандартные шаблоны, которые ДОЛЖНЫ БЫТЬ ОПРЕДЕЛЕНЫ ранее.
        var cardTemplate = Lampa.Template.get('hanime-card', {
            // Передаем обработанные данные в шаблон.
            img: processedData.poster_path,
            title: processedData.title,
            vote: processedData.vote_average > 0 ? parseFloat(processedData.vote_average).toFixed(1) : '',
            quality: processedData.quality,
            year: processedData.release_year !== '0000' ? processedData.release_year : '',
             type: processedData.type // Передаем тип в шаблон
        });

        var cardElement = $(cardTemplate); // Создаем jQuery объект

        // Методы для добавления иконок (закладки, история)
        this.addicon = function(name) {
            var iconsContainer = cardElement.find('.card__icons-inner');
            if (iconsContainer.length) {
                var icon = document.createElement('div');
                icon.classList.add('card__icon');
                icon.classList.add('icon--'+name);
                iconsContainer.append(icon);
            }
        }

        // Метод обновления иконок закладок/статуса
        this.updateFavoriteIcons = function() {
            cardElement.find('.card__icons-inner').empty();
            cardElement.find('.card__marker').remove(); // Удаляем старый маркер

            var status = Lampa.Favorite.check(processedData); // Используем Lampa.Favorite

            if (status.book) this.addicon('book');
            if (status.like) this.addicon('like');
            if (status.wath) this.addicon('wath');
            if (status.history || (Lampa.Timeline && Lampa.Timeline.watched && Lampa.Timeline.watched(processedData))) this.addicon('history'); // Проверка Timeline на существование

             var marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];
             var activeMarker = marks.find(m => status[m]);

             if (activeMarker) {
                 var markerElement = cardElement.find('.card__marker');
                 if (!markerElement.length) {
                     markerElement = $('<div class="card__marker"><span></span></div>');
                     cardElement.find('.card__view').append(markerElement);
                 }
                 // Проверка Lampa.Lang на существование перед использованием
                 markerElement.find('span').text(window.Lampa && Lampa.Lang && Lampa.Lang.translate ? Lampa.Lang.translate('title_' + activeMarker) : activeMarker);
                 markerElement.removeClass(marks.map(m => 'card__marker--' + m).join(' '))
                             .addClass('card__marker--' + activeMarker);
             } else {
                 cardElement.find('.card__marker').remove();
             }
        };

        // Метод вызывается, когда карточка становится видимой (Lampa событие 'visible')
        this.onVisible = function() {
             var imgElement = cardElement.find('.card__img');
             if (imgElement.length && (!imgElement.attr('src') || imgElement.attr('src').includes('img_load.svg'))) {
                 var src = processedData.poster_path;

                 if (!src) src = './img/img_broken.svg'; // Placeholder, если картинка отсутствует

                 // Использование ImageCache и обработка событий загрузки/ошибки
                 if(window.Lampa && Lampa.ImageCache) {
                      if(!Lampa.ImageCache.read(imgElement[0], src)) {
                          imgElement[0].onload = () => { cardElement.addClass('card--loaded'); Lampa.ImageCache.write(imgElement[0], imgElement[0].src); };
                          imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error:', imgElement.attr('src')); imgElement.attr('src', './img/img_broken.svg'); if(Lampa.Tmdb) Lampa.Tmdb.broken(); }; // Проверка Lampa.Tmdb
                          imgElement.attr('src', src);
                      } else {
                         // Если загружено из кэша, возможно, добавить card--loaded класс сразу
                         cardElement.addClass('card--loaded');
                      }
                 } else {
                     // Fallback без ImageCache
                      imgElement[0].onload = () => { cardElement.addClass('card--loaded'); };
                     imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error:', imgElement.attr('src')); imgElement.attr('src', './img/img_broken.svg'); };
                     imgElement.attr('src', src);
                 }

                console.log("Hanime Plugin: Card image processing started for:", processedData.title, src);
             }

            this.updateFavoriteIcons(); // Обновляем иконки закладок при видимости
        }


        // Метод вызывается для первоначальной настройки карточки после создания DOM
        this.create = function(){
             console.log("HanimeCard: create() for", processedData.title);

             // Привязка событий Lampa hover:* на корневой элемент карточки.
             // 'hover:focus' вызывается Controller при перемещении фокуса.
            cardElement.on('hover:focus', function () {
                 console.log("HanimeCard: hover:focus on", processedData.title);
                 // Прокручиваем скролл к этому элементу через родительский компонент.
                 if (componentRef && componentRef.updateScrollToFocus) {
                      componentRef.updateScrollToFocus(cardElement);
                 }
                 // Вызываем внутренний метод update для обновления иконок при фокусе
                 this.update();
            }.bind(this)); // bind(this) привязывает контекст HanimeCard к обработчику


             // 'hover:enter' вызывается Controller при нажатии ОК/Enter.
             cardElement.on('hover:enter', function () {
                console.log("HanimeCard: hover:enter on", processedData.title);
                // Обрабатываем клик/выбор через родительский компонент.
                 if (componentRef && componentRef.onCardClick) {
                     componentRef.onCardClick(processedData);
                 }
            }.bind(this));

             // 'hover:long' вызывается Controller при долгом нажатии.
            cardElement.on('hover:long', function(){
                 console.log("HanimeCard: hover:long on", processedData.title);
                 // Показываем контекстное меню через родительский компонент.
                 if (componentRef && componentRef.showCardContextMenu) {
                      componentRef.showCardContextMenu(cardElement, processedData);
                 }
             }.bind(this));


            // Привязка стандартного Lampa события 'visible' для загрузки картинки и иконок.
             this.card = cardElement[0]; // Сохраняем нативный DOM элемент для addEventListener
             this.card.addEventListener('visible', this.onVisible.bind(this)); // Связываем с onVisible

            // Вызываем начальное обновление (иконки, маркеры), возможно, с небольшой задержкой
            // чтобы гарантировать, что DOM элемент добавлен на страницу.
             setTimeout(() => {
                  this.update();
             }, 0); // Задержка 0 ms означает "выполнить после текущего стека", полезно для DOM-зависимых действий

            console.log("HanimeCard: create() completed.");
        }

        // Метод обновления состояния (иконок, маркеров), может быть вызван извне
        this.update = function(){
             console.log("HanimeCard: update() for", processedData.title);
            this.updateFavoriteIcons();
            // Логика для статуса просмотра (полоска прогресса) может быть добавлена здесь
            // this.watched(); // Если своя реализация watch status есть
        }

        // Метод рендеринга - возвращает DOM элемент
        this.render = function(js){
             // Важно: создать DOM элемент перед возвратом. Create вызывается только один раз.
             if (!this.cardElement) { // Проверка, чтобы create не вызывался повторно
                 this.create();
             }
            return js ? cardElement[0] : cardElement; // Возвращаем нативный DOM или jQuery объект
        }

        // Метод уничтожения
        this.destroy = function(){
             console.log("HanimeCard: destroy() for", processedData.title);
             // Удаляем обработчик события 'visible'
             if(this.card) this.card.removeEventListener('visible', this.onVisible.bind(this));
             // Удаляем DOM элемент
             if(cardElement) cardElement.remove();
            // Обнуляем ссылки
             processedData = null;
             cardElement = null;
             this.card = null;
             componentRef = null;
             console.log("HanimeCard: destroy() completed.");
        }

        // Вызываем create при создании экземпляра Card для инициализации
         this.create();
    }


    // --- HanimeComponent (основной компонент каталога) ---
    function HanimeComponent(componentObject) {
        var network = new Lampa.Reguest();
        // Инициализация ГОРИЗОНТАЛЬНОГО скролла
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });

        var items = []; // Массив объектов HanimeCard
        var html; // Корневой DOM-контейнер компонента (items-line)
        var itemsContainer; // Контейнер для карточек внутри скролла (.scroll__body .items-cards)

        var active = 0;
        var last; // DOM-элемент последней сфокусированной карточки

        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json"; // Одна линия - Последние добавленные
        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json";
        var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";
        var PROXY_BASE_URL = "http://77.91.78.5:3000";


        // Построение DOM-структуры items-line
        this.buildLayout = function() {
             console.log("HanimeComponent: buildLayout()");
            html = $(`
                <div class="items-line layer--visible layer--render items-line--type-cards">
                    <div class="items-line__head">
                        <div class="items-line__title">Последние добавленные</div>
                        <!-- Если API поддерживает, можно добавить Еще кнопку -->
                         <!-- <div class="items-line__more selector">Еще</div> -->
                    </div>
                    <div class="items-line__body">
                        <!-- Скролл рендерится сюда -->
                    </div>
                </div>
            `);

            // Создаем контейнер для карточек
             itemsContainer = $('<div class="items-cards"></div>');
             console.log("HanimeComponent: buildLayout completed.");
        };

        // Загрузка каталога
        this.fetchCatalog = function () {
            var _this = this;
            _this.activity.loader(true);
            console.log("HanimeComponent: fetchCatalog() from", CATALOG_URL);

            network.clear();
            network.native(CATALOG_URL,
                function (data) {
                     console.log("HanimeComponent: Catalog data received.");
                    if (data && data.metas && Array.isArray(data.metas)) {
                         if (data.metas.length > 0) {
                            _this.build(data.metas); // Передаем данные в build
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

        // Построение UI из данных
        this.build = function (result) {
            var _this = this;
             console.log("HanimeComponent: build() with", result.length, "items.");

            scroll.minus();

            itemsContainer.empty();
            items = [];

            result.forEach(function (meta) {
                // Создаем HanimeCard, передавая ссылку на _this компонента для коллбэков
                var card = new HanimeCard(meta, {}, _this);
                var cardElement = card.render(); // Получаем jQuery объект карточки

                itemsContainer.append(cardElement); // Добавляем карточку в контейнер
                items.push(card); // Добавляем объект HanimeCard в массив
            });

            // Добавляем itemsContainer в Scroll
            scroll.append(itemsContainer);
            console.log("HanimeComponent: itemsContainer appended to scroll.");

            // Вставляем рендер Scroll в body items-line
            html.find('.items-line__body').empty().append(scroll.render(true));
             console.log("HanimeComponent: Scroll rendered into items-line__body.");


            _this.activity.loader(false);
            _this.activity.toggle();
             console.log("HanimeComponent: UI built and activity toggled.");

            // Настройка контроллера в start()
        };

        // Коллбэк из HanimeCard при клике
        this.onCardClick = function(cardData) {
             console.log("HanimeComponent: Card clicked:", cardData);
            // Переход к запуску потока
            this.fetchStreamAndMeta(cardData.id, cardData);
        }

        // Коллбэк из HanimeCard при долгом нажатии для меню
        this.showCardContextMenu = function(cardElement, cardData) {
             console.log("HanimeComponent: showCardContextMenu for", cardData.title);
            var _this = this;
            var enabled = Lampa.Controller.enabled().name; // Текущий контроллер
            var status  = Lampa.Favorite.check(cardData); // Статус закладок
            var menu_favorite = [
                { title: Lampa.Lang.translate('title_book'), where: 'book', checkbox: true, checked: status.book },
                { title: Lampa.Lang.translate('title_like'), where: 'like', checkbox: true, checked: status.like },
                { title: Lampa.Lang.translate('title_wath'), where: 'wath', checkbox: true, checked: status.wath },
                { title: Lampa.Lang.translate('menu_history'), where: 'history', checkbox: true, checked: status.history },
                { title: Lampa.Lang.translate('settings_cub_status'), separator: true }
                // Добавить статусы marker look, viewed и т.д.
            ];

            Lampa.Select.show({
                title: Lampa.Lang.translate('title_action'),
                items: menu_favorite,
                onBack: ()=>{
                    Lampa.Controller.toggle(enabled);
                    console.log("HanimeComponent: Context menu back. Controller:", enabled);
                },
                onCheck: (a)=>{
                     console.log("HanimeComponent: Context menu checked:", a.where);
                     Lampa.Favorite.toggle(a.where, cardData);
                     // Обновляем иконки на конкретной карточке
                     var cardObj = items.find(item => item.render()[0] === cardElement[0]);
                      if(cardObj) cardObj.updateFavoriteIcons();
                },
                onSelect: (a)=>{
                     console.log("HanimeComponent: Context menu selected:", a);
                     // Обработка маркеров состояния (look, viewed и т.д.)
                    if(a.collect){
                        Lampa.Favorite.toggle(a.where, cardData);
                         var cardObj = items.find(item => item.render()[0] === cardElement[0]);
                         if(cardObj) cardObj.updateFavoriteIcons();
                    }
                    Lampa.Select.close();
                    Lampa.Controller.toggle(enabled);
                },
                 onDraw: (item, elem) => {
                     // Логика замка для premium (если маркер требует premium)
                     if (elem.collect && window.Lampa && Lampa.Account && !Lampa.Account.hasPremium()) {
                          let wrap = $('<div class="selectbox-item__lock"></div>');
                          wrap.append(Lampa.Template.js('icon_lock'));
                          item.find('.selectbox-item__checkbox').remove();
                          item.append(wrap);
                           item.on('hover:enter', () => {
                               Lampa.Select.close();
                               if (Lampa.Account) Lampa.Account.showCubPremium();
                           });
                       }
                 }
            });
        };

        // Коллбэк из HanimeCard для прокрутки скролла при фокусе
        this.updateScrollToFocus = function(element) {
            // 'element' здесь - это jQuery объект карточки
             console.log("HanimeComponent: updateScrollToFocus called.");
            last = element[0]; // Сохраняем ссылку на DOM элемент
            scroll.update(element, true); // Прокрутка к элементу с плавностью
             console.log("HanimeComponent: Scroll updated to focused element.");
        }

        // Загрузка стрима и метаданных (без изменений)
        this.fetchStreamAndMeta = function (id, meta) {
            var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

            _this.activity.loader(true);
             console.log("HanimeComponent: fetchStreamAndMeta for", id);

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
                                if(window.Lampa && Lampa.Favorite) Lampa.Favorite.add('history', historyMeta, 100); // Проверка Lampa.Favorite
                                console.log("HanimeComponent: Added to history.");
                         }

                    } else {
                         if(window.Lampa && Lampa.Noty) Lampa.Noty.show('Не удалось получить ссылку на поток.'); // Проверка Lampa.Noty
                         console.error("HanimeComponent: No valid stream URL.");
                    }

                } else {
                     if(window.Lampa && Lampa.Noty) Lampa.Noty.show('Потоки не найдены для этого аниме.'); // Проверка Lampa.Noty
                     console.warn("HanimeComponent: No streams found.");
                }

            }).catch(error => {
                _this.activity.loader(false);
                console.error("HanimeComponent: Error fetching stream/meta:", error);
                 if(window.Lampa && Lampa.Noty) Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'));
            });
        };

        // Отображение пустого состояния
        this.empty = function (msg) {
             console.log("HanimeComponent: empty() -", msg);
             // Проверка Lampa.Empty
             if (window.Lampa && Lampa.Empty) {
                 var empty = new Lampa.Empty({ message: msg });
                 html.empty().append(empty.render(true));
                 this.activity.loader(false);
                 this.activity.toggle();
                 this.start = empty.start; // Переназначаем start на компонент Empty
             } else {
                  // Fallback, если Lampa.Empty не найден
                  html.empty().text(msg + ' (Empty component not available)');
                  this.activity.loader(false);
                  this.activity.toggle();
                  // Нет start метода у текстового fallback
                  this.start = function() { Lampa.Controller.add('content', { back: this.back }); Lampa.Controller.toggle('content'); }.bind(this);
             }
        };


        // Метод создания активности
        this.create = function () {
            console.log("HanimeComponent: create()");
            this.buildLayout(); // Строим layout items-line
            this.activity.loader(true);
            this.fetchCatalog(); // Загружаем данные
        };

        // Метод запуска активности
        this.start = function () {
            console.log("HanimeComponent: start()");
            if (Lampa.Activity.active().activity !== this.activity) {
                console.log("HanimeComponent: start() - Not active.");
                return;
            }
             console.log("HanimeComponent: start() - Setting Controller.");

            // Настройка Controller для горизонтальной линии
            Lampa.Controller.add('content', {
                toggle: function () {
                     console.log("HanimeComponent: Controller toggle() in start.");
                    Lampa.Controller.collectionSet(scroll.render()); // Элементы для навигации находятся внутри Scroll
                    Lampa.Controller.collectionFocus(last || false, scroll.render()); // Устанавливаем начальный фокус (это вызовет hover:focus на элементе)
                    console.log("HanimeComponent: Controller collectionSet/Focus called.");
                },
                // Обработчики кнопок
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function () {
                    if (Navigator.canmove('right')) Navigator.move('right');
                },
                up: function () {
                     Lampa.Controller.toggle('head'); // Переключение на Header
                },
                down: function () {
                     if (Navigator.canmove('down')) Navigator.move('down'); // В одной линии может не сработать
                     // Можно добавить логику перехода на другую линию, если их будет несколько
                },
                back: this.back
            });
            Lampa.Controller.toggle('content'); // Активируем Controller
             console.log("HanimeComponent: Controller 'content' toggled.");

            // Прокрутка к начальному элементу произойдет через hover:focus
        };

        // Методы паузы и остановки (сохраняем последний фокус)
        this.pause = function () {
             console.log("HanimeComponent: pause()");
             if(Lampa.Controller.enabled().name === 'content') {
                 last = Lampa.Controller.item() || last; // Сохраняем DOM элемент
                  console.log("HanimeComponent: Saved last focused item:", last);
             }
        };

        this.stop = function () {
             console.log("HanimeComponent: stop()");
             // Ничего специфичного здесь не требуется, основная чистка в destroy
        };

        // Метод рендеринга
        this.render = function () {
             console.log("HanimeComponent: render()");
            if (!html) {
                 this.buildLayout();
            }
            return html;
        };

        // Метод уничтожения
        this.destroy = function () {
            console.log("HanimeComponent: destroy()");
            network.clear();
             if (items) Lampa.Arrays.destroy(items); // Уничтожаем объекты карточек
             if (scroll) scroll.destroy(); // Уничтожаем Scroll
             if (html) html.remove(); // Удаляем DOM компонента

            // Очистка и удаление Controller
            if (Lampa.Controller && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content') {
                 Lampa.Controller.collectionSet([]);
                // Можно добавить Lampa.Controller.toggle('app'); если нужно вернуться в базовый контроллер Lampa
            }
             if (Lampa.Controller) Lampa.Controller.remove('content'); // Удаляем зарегистрированный контроллер

            // Обнуляем ссылки
            items = null;
            network = null;
            scroll = null;
            html = null;
            itemsContainer = null;
            last = null;
            console.log("HanimeComponent: destroy() completed.");
        };

        // Обработчик кнопки "Назад"
        this.back = function () {
             console.log("HanimeComponent: back() - Calling Activity.backward()");
             if(window.Lampa && Lampa.Activity) Lampa.Activity.backward();
             else console.warn("HanimeComponent: Lampa.Activity not available for backward navigation.");
        };
    }

    // --- Функция инициализации плагина Lampa ---
    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() called.");

        if (window.plugin_hanime_catalog_ready) {
             console.log("Hanime Plugin: Plugin already running, exiting startPlugin.");
             return;
        }
        window.plugin_hanime_catalog_ready = true;
        console.log("Hanime Plugin: Plugin flag set.");

        // --- ОПРЕДЕЛЕНИЕ СТАНДАРТНЫХ ШАБЛОНОВ Lampa (если их нет) ---
        // ЭТОТ БЛОК ДОЛЖЕН БЫТЬ ДО ОПРЕДЕЛЕНИЯ hanime-card, КОТОРЫЙ ИХ ИСПОЛЬЗУЕТ!
        console.log("Hanime Plugin: Checking and adding standard templates...");
         if(!Lampa.Template.has('card_vote_temp')) {
              console.log("Hanime Plugin: Adding card_vote_temp");
              Lampa.Template.add('card_vote_temp', '<div class="card__vote hanime-card__vote">{vote}</div>');
         }
          if(!Lampa.Template.has('card_quality_temp')) {
              console.log("Hanime Plugin: Adding card_quality_temp");
               Lampa.Template.add('card_quality_temp', '<div class="card__quality hanime-card__quality"><div>{quality}</div></div>');
          }
          if(!Lampa.Template.has('card_year_temp')) {
              console.log("Hanime Plugin: Adding card_year_temp");
               Lampa.Template.add('card_year_temp', '<div class="card__age hanime-card__age">{year}</div>');
          }
           // Простой шаблон для типа (TV/Movie), адаптируйте, если у вас другая логика
          if(!Lampa.Template.has('card_type_temp')) {
              console.log("Hanime Plugin: Adding card_type_temp");
               Lampa.Template.add('card_type_temp', '<div class="card__type hanime-card__type">{type}</div>');
          }
          // Шаблон для иконки замка (используется в контекстном меню)
         if(!Lampa.Template.has('icon_lock')) {
             console.log("Hanime Plugin: Adding icon_lock");
             Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
         }
        console.log("Hanime Plugin: Standard templates check completed.");


        // --- Определение ВАШЕГО шаблона карточки (Использует стандартные шаблоны) ---
        console.log("Hanime Plugin: Adding hanime-card template...");
        Lampa.Template.add('hanime-card', `
            <div class="hanime-card card selector layer--visible layer--render"> <!-- Основные классы карточки Lampa -->
                <div class="card__view hanime-card__view"> <!-- Область с картинкой и наложениями -->
                    <img src="./img/img_load.svg" class="card__img hanime-card__img" alt="{title}" loading="lazy" /> <!-- Картинка (используем src для загрузки) -->
                    <div class="card__icons hanime-card__icons"> <!-- Контейнер для иконок -->
                        <div class="card__icons-inner hanime-card__icons-inner"></div> <!-- Здесь будут иконки закладки/истории -->
                    </div>
                    <!-- Добавляем стандартные блоки через встроенные шаблоны -->
                    ${Lampa.Template.get('card_vote_temp', { vote: '{vote}' })} <!-- Шаблон рейтинга -->
                    ${Lampa.Template.get('card_quality_temp', { quality: '{quality}' })} <!-- Шаблон качества -->
                    ${Lampa.Template.get('card_type_temp', { type: '{type}' })} <!-- Шаблон типа (TV/Movie) -->

                </div>
                <div class="card__title hanime-card__title">{title}</div> <!-- Заголовок -->
                ${Lampa.Template.get('card_year_temp', { year: '{year}' })} <!-- Шаблон года -->
            </div>
        `);
         console.log("Hanime Plugin: HanimeCard template added.");


        // --- CSS Стили (адаптированные под стандартные классы) ---
        console.log("Hanime Plugin: Adding CSS styles...");
        var style = `
            /* Общие стили для линии */
            .items-line {
                 padding: 1em 0; /* Отступ сверху/снизу */
            }
             .items-line__head {
                  padding: 0 3.5em 1em 3.5em; /* Отступы заголовка */
             }
             .items-line__body {
                padding: 0 2.5em; /* Горизонтальные отступы внутри */
            }

            /* Базовый стиль карточки. Класс card должен быть на .hanime-card */
            .card {
                width: 185px; /* Стандартная ширина постера */
                height: auto; /* Высота будет определяться содержимым, а не фиксированной */
                margin: 0 0.5em; /* Горизонтальные отступы */
                border-radius: 0.5em;
                overflow: hidden;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                position: relative;
                box-sizing: border-box;
                background-color: rgba(255,255,255,0.05); /* Загрузочный фон */
                text-align: center; /* Выравнивание текста внутри карточки */
                 display: inline-block; /* Карточки должны быть строчно-блочными для горизонтального скролла */
                 vertical-align: top; /* Выравнивание по верху */
            }

            /* Стиль фокуса - стандартный вид Lampa */
            .card.selector:focus {
                 transform: scale(1.05);
                 box-shadow: 0 0 15px rgba(255, 165, 0, 0.8); /* Оранжевое свечение */
                 z-index: 5;
                 /* Границу уберем, полагаясь на box-shadow */
                 border-color: transparent;
            }

             /* Скрытие outline при программном фокусе */
             .card.selector.focus:not(.native) {
                 outline: none;
             }

            /* Область просмотра (картинка) */
            .card__view {
                position: relative;
                width: 100%;
                height: 270px; /* Фиксированная высота постера */
                border-radius: 0.5em;
                overflow: hidden;
                background-color: rgba(255,255,255,0.05);
            }

             /* Картинка */
             .card__img {
                 position: absolute;
                 width: 100%;
                 height: 100%;
                 object-fit: cover;
                 border-radius: 0.5em;
                 opacity: 0.9;
                 transition: opacity 0.2s ease;
             }
             .card--loaded .card__img { opacity: 1; }

            /* Иконки */
             .card__icons {
                position: absolute;
                top: 0.5em;
                right: 0.5em;
                z-index: 2;
             }
             .card__icons-inner {
                display: flex;
                flex-direction: column;
                gap: 0.3em;
             }
             .card__icon {
                  width: 1em; height: 1em;
                  background-color: rgba(0,0,0,0.5);
                  padding: 0.3em;
                  border-radius: 50%;
                 /* Иконки font-icons или background-image добавляются Lampa. Вам нужны только icon--{name} */
             }

            /* Рейтинг */
             .card__vote {
                 position: absolute; bottom: 0.5em; left: 0.5em;
                 background-color: rgba(0,0,0,0.7); color: #fff;
                 padding: 0.2em 0.4em; border-radius: 0.3em;
                 font-size: 0.9em; font-weight: bold; z-index: 2;
             }

            /* Качество */
             .card__quality {
                position: absolute; bottom: 0.5em; right: 0.5em;
                 background-color: rgba(0,0,0,0.7); color: #fff;
                 padding: 0.2em 0.4em; border-radius: 0.3em;
                 font-size: 0.9em; z-index: 2;
             }

            /* Тип */
             .card__type {
                  position: absolute; top: 0.5em; left: 0.5em;
                 background-color: rgba(0,0,0,0.7); color: #fff;
                 padding: 0.2em 0.4em; border-radius: 0.3em;
                 font-size: 0.9em; font-weight: bold; z-index: 2;
             }

            /* Заголовок */
             .card__title {
                 margin-top: 0.5em;
                 padding: 0 0.2em;
                 font-size: 1em;
                 font-weight: bold;
                 white-space: nowrap;
                 overflow: hidden;
                 text-overflow: ellipsis;
                 text-align: center;
                 color: #fff;
             }

            /* Год */
             .card__age {
                text-align: center;
                font-size: 0.9em;
                color: rgba(255, 255, 255, 0.7);
             }

            /* Стиль иконки меню */
            .menu__ico svg {
                  width: 1.5em;
                  height: 1.5em;
            }
        `;
        Lampa.Template.add('hanime-style', `<style>${style}</style>`);
        $('head').append(Lampa.Template.get('hanime-style', {}, true));
        console.log("Hanime Plugin: CSS styles added.");


        // Регистрируем компонент в Lampa
        Lampa.Component.add('hanime_catalog', HanimeComponent);
        console.log("Hanime Plugin: Component 'hanime_catalog' registered.");


        // Функция добавления пункта меню
        function addMenuItem() {
             if ($('.menu .menu__list .menu__text:contains("Hanime Catalog")').length > 0) {
                 console.log("Hanime Plugin: Menu item already exists.");
                 return;
             }
             console.log("Hanime Plugin: Adding menu item to menu.");

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

            menu_item.on('hover:enter', function () {
                 console.log("Hanime Plugin: Menu item selected. Pushing 'hanime_catalog'.");
                Lampa.Activity.push({
                    url: '',
                    title: 'Hanime Catalog',
                    component: 'hanime_catalog',
                    page: 1
                });
            });

            $('.menu .menu__list').eq(0).append(menu_item);
             console.log("Hanime Plugin: Menu item added to DOM.");
        }

        // Ждем готовности Lampa
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

    // Запускаем плагин
    startPlugin();

})();
