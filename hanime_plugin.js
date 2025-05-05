(function () {
    'use strict';

    // --- HanimeCard компонента ---
    // Компонент для отображения одной карточки аниме.
    function HanimeCard(data, componentRef) {
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
        var cardTemplate = (window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function') ? Lampa.Template.get('hanime-card', {
            img: processedData.poster_path,
            title: processedData.title,
            vote: processedData.vote_average > 0 ? parseFloat(processedData.vote_average).toFixed(1) : '',
            quality: processedData.quality,
            year: processedData.release_year !== '0000' ? processedData.release_year : '',
            type: processedData.type
        }) : '';
        if (!cardTemplate) {
             console.error("HanimeCard: Failed to get 'hanime-card' template.");
             // Fallback - минимальная заглушка, если шаблон не найден
             cardTemplate = `<div class="card selector"><div class="card__title">Error: Template missing</div></div>`;
        }


        var cardElement = $(cardTemplate); // Создаем jQuery объект


        // --- Методы экземпляра HanimeCard ---

        this.addicon = function(name) {
            var iconsContainer = cardElement.find('.card__icons-inner');
            if (iconsContainer.length) {
                var icon = document.createElement('div');
                icon.classList.add('card__icon');
                icon.classList.add('icon--'+name);
                iconsContainer.append(icon);
            } else { console.warn("HanimeCard: Missing .card__icons-inner for icon:", name); }
        }

        this.updateFavoriteIcons = function() {
            cardElement.find('.card__icons-inner').empty();
            cardElement.find('.card__marker').remove();

             var status = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(processedData) : {};
             var marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];

            if (status.book) this.addicon('book'); if (status.like) this.addicon('like'); if (status.wath) this.addicon('wath');
            if (status.history || (window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched === 'function' && Lampa.Timeline.watched(processedData))) this.addicon('history');

             var activeMarker = marks.find(m => status[m]);
             if (activeMarker) {
                 var markerElement = cardElement.find('.card__marker');
                 if (!markerElement.length) { markerElement = $('<div class="card__marker"><span></span></div>'); cardElement.find('.card__view').append(markerElement); }
                 markerElement.find('span').text(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? Lampa.Lang.translate('title_' + activeMarker) : activeMarker);
                 markerElement.removeClass(marks.map(m => 'card__marker--' + m).join(' ')).addClass('card__marker--' + activeMarker);
             } else { cardElement.find('.card__marker').remove(); }
        };

        this.onVisible = function() {
             var imgElement = cardElement.find('.card__img');
             if (imgElement.length && (!imgElement.attr('src') || imgElement.attr('src').includes('img_load.svg'))) {
                 var src = processedData.poster_path;
                 if (!src) src = './img/img_broken.svg';

                 if(window.Lampa && Lampa.ImageCache && typeof Lampa.ImageCache.read === 'function' && typeof Lampa.ImageCache.write === 'function') {
                      if(!Lampa.ImageCache.read(imgElement[0], src)) {
                          imgElement[0].onload = () => { cardElement.addClass('card--loaded'); Lampa.ImageCache.write(imgElement[0], imgElement[0].src); };
                          imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error:', src); imgElement.attr('src', './img/img_broken.svg'); if(window.Lampa && Lampa.Tmdb && typeof Lampa.Tmdb.broken === 'function') Lampa.Tmdb.broken(); };
                          imgElement.attr('src', src || './img/img_broken.svg');
                      } else { cardElement.addClass('card--loaded'); }
                 } else {
                      imgElement[0].onload = () => { cardElement.addClass('card--loaded'); };
                     imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error (basic):', src); imgElement.attr('src', './img/img_broken.svg'); };
                     imgElement.attr('src', src || './img/img_broken.svg');
                 }
             }
            this.updateFavoriteIcons();
        }

        // Первоначальная настройка и привязка событий Lampa
        this.create = function(){
             if (cardElement.data('created')) { return; }

             // События Lampa hover:* (от Lampa.Controller)
            cardElement.on('hover:focus', function () {
                 if (componentRef && typeof componentRef.updateScrollToFocus === 'function') { componentRef.updateScrollToFocus(cardElement); }
                 this.update();
            }.bind(this));
             cardElement.on('hover:enter', function () {
                 if (componentRef && typeof componentRef.onCardClick === 'function') { componentRef.onCardClick(processedData); }
            }.bind(this));
            cardElement.on('hover:long', function(){
                 if (componentRef && typeof componentRef.showCardContextMenu === 'function') { componentRef.showCardContextMenu(cardElement, processedData); }
             }.bind(this));

            // Событие Lampa 'visible' (от Scroll или др. компонентов)
             this.card = cardElement[0];
             if (this.card && typeof this.card.addEventListener === 'function') {
                this.card.addEventListener('visible', this.onVisible.bind(this));
             }

             // Начальное обновление с задержкой
             setTimeout(() => { this.update(); }, 0);

             cardElement.data('created', true); // Помечаем как созданный
        }

        // Обновление состояния
        this.update = function(){
            this.updateFavoriteIcons();
            // if(window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched_status === 'function') Lampa.Timeline.watched_status(cardElement, processedData); // Прогресс-бар
        }

        // Рендеринг (возвращает DOM)
        this.render = function(js){
             if (!cardElement.data('created')) { this.create(); }
            return js ? cardElement[0] : cardElement;
        }

        // Уничтожение
        this.destroy = function(){
             if(this.card && typeof this.card.removeEventListener === 'function' && this.onVisible) {
                 this.card.removeEventListener('visible', this.onVisible.bind(this));
             }
             if(cardElement && typeof cardElement.remove === 'function') { cardElement.remove(); }
             processedData = null; cardElement = null; this.card = null; componentRef = null;
        }

        // HanimeCard не вызывает create() сама по себе при определении.
        // create() вызывается в render().
    }


    // --- HanimeComponent (основной компонент, линия аниме) ---
    function HanimeComponent(componentObject) {
        var network = null;
        var scroll = null;

        var items = [];
        var html = null;
        var itemsContainer = null;

        var active = 0;
        var last = null;

        // --- Ваши API URL-ы ---
        var API_BASE_URL = "https://akidoo.top"; // Базовый URL API. Исправьте, если нужно.
        // URL для получения последних добавлений. Исправьте, если нужен другой эндпоинт.
        var CATALOG_URL_RELATIVE = "/api/new_anime?page=1"; // Относительный URL каталога.
        // !!! ИСПОЛЬЗУЕМ ОТНОСИТЕЛЬНЫЙ URL ЗДЕСЬ. ПРОКСИРОВАНИЕ БУДЕТ НАКЛАДЫВАТЬСЯ В fetchCatalog. !!!
        var CATALOG_URL = CATALOG_URL_RELATIVE; // По умолчанию используем относительный.


        var STREAM_URL_TEMPLATE = API_BASE_URL + "/api/anime/{id}/stream";
        var META_URL_TEMPLATE = API_BASE_URL + "/api/anime/{id}";

        var PROXY_BASE_URL = "http://77.91.78.5:3000"; // Адрес вашего прокси.

         // Флаг, что нужно использовать прокси для API запросов (по умолчанию выкл).
         // Включим его, если будет ошибка CORS или если URL содержит запрещенный домен.
        var useApiProxy = false;
        var apiProxyDomain = 'akidoo.top'; // Домен, при обнаружении которого нужно использовать прокси для API запросов.


        // Метод для построения DOM items-line. Использует стандартные классы Lampa.
        this.buildLayout = function() {
             //console.log("HanimeComponent: buildLayout()");
             // Используем стандартные классы items-line
            html = $(`
                <div class="items-line layer--visible layer--render items-line--type-cards">
                    <div class="items-line__head">
                        <div class="items-line__title">Последние добавленные</div>
                    </div>
                    <div class="items-line__body">
                        <!-- Scroll here -->
                    </div>
                </div>
            `);

            // Контейнер для карточек, который будет прокручиваться Scroll-ом.
             itemsContainer = $('<div class="items-cards"></div>');
             //console.log("HanimeComponent: buildLayout completed.");
        };

        // Метод для загрузки данных каталога из API.
        this.fetchCatalog = function () {
            var _this = this;
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeComponent: Activity loader not available in fetchCatalog.");


             // --- Логика проксирования запроса К API каталога ---
             var finalCatalogUrl = CATALOG_URL; // Начинаем с оригинального URL каталога

             if(useApiProxy) {
                 // Если флаг useApiProxy включен, формируем проксированный URL.
                 finalCatalogUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(API_BASE_URL + CATALOG_URL_RELATIVE)}`;
                 console.log("HanimeComponent: Using proxy for catalog fetch:", finalCatalogUrl);
             } else {
                  // Пытаемся определить, нужно ли использовать прокси на основе домена URL API.
                  // Только если useApiProxy еще не включен.
                 try {
                      var url = new URL(API_BASE_URL + CATALOG_URL_RELATIVE);
                      if (apiProxyDomain && url.hostname && url.hostname.includes(apiProxyDomain)) {
                         // Если домен API соответствует домену, требующему прокси (например, по вашему правилу),
                         // включаем флаг и формируем проксированный URL.
                         useApiProxy = true;
                         finalCatalogUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(API_BASE_URL + CATALOG_URL_RELATIVE)}`;
                         console.log("HanimeComponent: Catalog API domain requires proxy, using:", finalCatalogUrl);
                      } else {
                         // Иначе используем оригинальный URL.
                         console.log("HanimeComponent: Catalog API domain does not require proxy, using:", finalCatalogUrl);
                      }
                 } catch(e) {
                      console.error("HanimeComponent: Failed to parse CATALOG_URL for proxy check:", e);
                      console.log("HanimeComponent: Proceeding with original CATALOG_URL due to parse error.");
                     finalCatalogUrl = API_BASE_URL + CATALOG_URL_RELATIVE; // Если не можем парсить, используем оригинальный URL.
                 }
             }
              console.log("HanimeComponent: Fetching catalog from:", finalCatalogUrl);

             // Инициализация Network и выполнение запроса к finalCatalogUrl
             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') { network = new Lampa.Reguest(); }
             if (network && typeof network.clear === 'function') network.clear();

             if(network && finalCatalogUrl){
                network.native(finalCatalogUrl, // Используем потенциально проксированный URL
                    function (data) { // Коллбэк успеха
                         console.log("HanimeComponent: Catalog data received:", data);
                        if (data && typeof data === 'object' && Array.isArray(data.metas) && data.metas) {
                             if (data.metas.length > 0) { _this.build(data.metas); }
                             else { _this.empty("Каталог пуст."); }
                        } else {
                            _this.empty("Неверный формат данных от API.");
                            console.error("HanimeComponent: Invalid data format.", data);
                        }
                         if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); // Убираем лоадер здесь тоже, на случай успеха.
                    },
                    function (errorStatus, errorText) { // Коллбэк ошибки запроса
                        console.error("HanimeComponent: Failed to load catalog.", errorStatus, errorText);
                        // Если произошла ошибка CORS (обычно status 0) и мы не использовали прокси, попробуем с прокси.
                        if ((errorStatus === 0 || errorStatus >= 400) && !useApiProxy && apiProxyDomain) { // >=400 на случай других ошибок, указывающих на проблемы с доступом.
                            console.warn("HanimeComponent: Catalog fetch failed, likely CORS or network issue. Attempting with proxy.");
                            useApiProxy = true; // Включаем флаг использования прокси
                            _this.fetchCatalog(); // Повторяем запрос с включенным прокси
                            // ВАЖНО: Не вызывать _this.empty() здесь, так как мы повторяем запрос.
                        } else {
                            // Если ошибка не CORS или мы уже пытались с прокси, показываем сообщение об ошибке пользователю.
                            _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); // Убираем лоадер при окончательной ошибке.
                        }
                    },
                    false,
                    { dataType: 'json', timeout: 15000 }
                );
             } else {
                console.error("HanimeComponent: Cannot fetch catalog. Network component or finalCatalogUrl is missing.");
                 _this.empty("Не удалось загрузить каталог. Ошибка инициализации сети или URL.");
                  if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
             }
        };

        // Построение UI из данных.
        this.build = function (result) {
            var _this = this;
             console.log("HanimeComponent: build() - Building UI with", result.length, "items.");

             // Инициализация Scroll
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                  scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
                  //console.log("HanimeComponent: Lampa.Scroll initialized.");
             }


             if(scroll && typeof scroll.minus === 'function') scroll.minus();
             else console.warn("HanimeComponent: Scroll or minus method not available in build().");


             // Проверки перед работой с DOM и Scroll
             if (!(itemsContainer && typeof itemsContainer.empty === 'function' && scroll && html && typeof html.find === 'function' && window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function')) {
                  console.error("HanimeComponent: Missing critical dependencies for UI build (itemsContainer, scroll, html, Lampa.Template). Aborting.");
                  if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                  _this.empty("Не удалось построить интерфейс.");
                  return;
             }


            itemsContainer.empty();
            items = [];

            result.forEach(function (meta) {
                 var card = new HanimeCard(meta, _this);
                 var cardElement = card.render();
                 if (itemsContainer) itemsContainer.append(cardElement);
                items.push(card);
            });
             console.log("HanimeComponent: Created and added", items.length, "cards.");

             if(scroll && typeof scroll.append === 'function' && itemsContainer) scroll.append(itemsContainer);
             else console.error("HanimeComponent: Scroll append method or itemsContainer missing in build.");


             if(html && typeof html.find === 'function' && scroll && typeof scroll.render === 'function') {
                html.find('.items-line__body').empty().append(scroll.render(true));
             } else console.error("HanimeComponent: Html find or scroll.render missing in build.");


             // Лоадер убирается в коллбэке успеха fetchCatalog.
             if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
             console.log("HanimeComponent: Build completed. UI toggled.");
        };

        // Коллбэк: клик на карточке
         this.onCardClick = function(cardData) {
             console.log("HanimeComponent: Card clicked:", cardData.title, "ID:", cardData.id);
            this.fetchStreamAndMeta(cardData.id, cardData);
         }

        // Коллбэк: показ контекстного меню
         this.showCardContextMenu = function(cardElement, cardData) {
             console.log("HanimeComponent: showCardContextMenu for", cardData.title);
             var _this = this;
             var enabled = (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;
             var status  = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(cardData) : {};

             var menu_favorite = [];
             var translate = (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate : (text => text);

             menu_favorite.push(
                 { title: translate('title_book'), where: 'book', checkbox: true, checked: status.book },
                 { title: translate('title_like'), where: 'like', checkbox: true, checked: status.like },
                 { title: translate('title_wath'), where: 'wath', checkbox: true, checked: status.wath },
                 { title: translate('menu_history'), where: 'history', checkbox: true, checked: status.history },
                 { title: translate('settings_cub_status'), separator: true }
             );

             if (window.Lampa && Lampa.Select && typeof Lampa.Select.show === 'function') {
                 Lampa.Select.show({
                     title: translate('title_action'), items: menu_favorite,
                     onBack: ()=>{ if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function' && enabled) Lampa.Controller.toggle(enabled); console.log("HanimeComponent: Context menu back."); },
                     onCheck: (a)=>{
                         console.log("HanimeComponent: Context menu checked:", a.where);
                         if(window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function') Lampa.Favorite.toggle(a.where, cardData);
                         var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                          if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                     },
                     onSelect: (a)=>{
                          console.log("HanimeComponent: Context menu selected:", a);
                          if(a.collect && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function'){
                              Lampa.Favorite.toggle(a.where, cardData);
                               var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                              if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                          }
                          if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                           if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function' && enabled) { Lampa.Controller.toggle(enabled); }
                     },
                      onDraw: (itemElement, itemData) => {
                           if (itemData.collect && window.Lampa && Lampa.Account && typeof Lampa.Account.hasPremium === 'function' && !Lampa.Account.hasPremium()) {
                                let lockIconTemplate = (window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.has('icon_lock')) ? Lampa.Template.get('icon_lock', {}, true) : null;
                                if (lockIconTemplate) {
                                     let wrap = $('<div class="selectbox-item__lock"></div>');
                                     wrap.append($(lockIconTemplate));
                                     itemElement.find('.selectbox-item__checkbox').remove();
                                     itemElement.append(wrap);
                                     itemElement.off('hover:enter').on('hover:enter', () => {
                                         if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                                          if (window.Lampa && Lampa.Account && typeof Lampa.Account.showCubPremium === 'function') Lampa.Account.showCubPremium();
                                     });
                                } else { console.warn("Hanime Component: icon_lock template missing for Premium item draw."); }
                           }
                      }
                 });
             } else {
                 console.warn("HanimeComponent: Lampa.Select component not available.");
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Компонент меню недоступен.', 5000);
                 else console.warn("HanimeComponent: Lampa.Noty not available to show menu unavailable message.");
             }
         };

        // Коллбэк: прокрутка при фокусе
        this.updateScrollToFocus = function(element) {
            //console.log("HanimeComponent: updateScrollToFocus() called with element:", element);
            if (scroll && typeof scroll.update === 'function') {
                last = element[0];
                scroll.update(element, true);
                //console.log("HanimeComponent: Scroll updated to focused element:", last);
            } else { console.warn("HanimeComponent: Scroll instance or update method not available to scroll to element."); }
        }

        // Загрузка стрима и метаданных
        this.fetchStreamAndMeta = function (id, meta) {
             var _this = this;
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeComponent: Activity loader not available in fetchStreamAndMeta.");

            console.log("HanimeComponent: fetchStreamAndMeta for ID:", id);

            if (!network) {
                console.error("HanimeComponent: Network component not available.");
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Сетевой компонент недоступен.', 5000);
                return;
            }

            // URLs for stream and meta, need to handle base URL and potentially replace {id}
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

            Promise.all([
                new Promise((resolve, reject) => {
                    if(network && typeof network.native === 'function') network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                    else reject('Network unavailable for stream request');
                }),
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                     if(network && typeof network.native === 'function') network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 });
                     else reject('Network unavailable for meta request');
                 })
            ]).then(([streamData, metaDataResponse]) => {
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                const fullMetaData = metaDataResponse.meta || metaDataResponse;
                console.log("HanimeComponent: Stream data received:", streamData);
                console.log("HanimeComponent: Full Meta Data received:", fullMetaData);

                if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0];
                    var finalStreamUrl = streamToPlay.url;

                    // Proxy logic for stream URL
                    try {
                         var url = new URL(finalStreamUrl);
                         // Check if proxy is needed for the stream URL's hostname
                         if (apiProxyDomain && url.hostname && url.hostname.includes(apiProxyDomain)) {
                              finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                              console.log("HanimeComponent: Stream URL requires proxy based on apiProxyDomain, proxied:", finalStreamUrl);
                         } else if (url.hostname && url.hostname.includes('highwinds-cdn.com')) { // Specific highwinds rule
                             finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                             console.log("HanimeComponent: Stream URL matched 'highwinds-cdn.com', proxied:", finalStreamUrl);
                         }
                         else { console.log("HanimeComponent: Stream URL does not require proxy:", finalStreamUrl); }
                    } catch (e) {
                        console.error("HanimeComponent: Failed to parse or proxy stream URL:", finalStreamUrl, "Error:", e);
                        console.log("HanimeComponent: Using original stream URL due to parse error.");
                    }

                    var playerObject = {
                        title: fullMetaData.name || fullMetaData.title || 'Без названия', url: finalStreamUrl,
                        poster: fullMetaData.poster || fullMetaData.background || '',
                    };

                    if (playerObject.url && window.Lampa && Lampa.Player && typeof Lampa.Player.play === 'function' && typeof Lampa.Player.playlist === 'function') {
                         console.log("HanimeComponent: Launching player.");
                         Lampa.Player.play(playerObject); Lampa.Player.playlist([playerObject]);

                         if (fullMetaData && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                                const historyMeta = { id: fullMetaData.id || '', title: fullMetaData.name || fullMetaData.title || '', poster: fullMetaData.poster || fullMetaData.background || '', runtime: fullMetaData.runtime, year: fullMetaData.year, original_name: fullMetaData.original_name || '' };
                                Lampa.Favorite.add('history', historyMeta, 100); console.log("HanimeComponent: Added to history:", historyMeta);
                         } else { console.warn("HanimeComponent: Lampa.Favorite not available to add to history."); }

                    } else {
                         console.error("HanimeComponent: Cannot launch player. Missing stream URL or Lampa.Player component/methods.");
                         if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                             Lampa.Noty.show(playerObject.url ? 'Компонент плеера недоступен.' : 'Не удалось получить ссылку на поток.', 5000);
                         } else console.warn("HanimeComponent: Lampa.Noty not available to show error message.");
                    }

                } else {
                     console.warn("HanimeComponent: No streams found in API data or data structure is invalid.", streamData);
                     if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                         Lampa.Noty.show('Потоки не найдены для этого аниме.', 5000);
                     } else console.warn("HanimeComponent: Lampa.Noty not available to show message.");
                }

            }).catch(error => {
                console.error("HanimeComponent: Error fetching stream/meta details:", error);
                if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     const errorMessage = 'Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка');
                     Lampa.Noty.show(errorMessage, 5000);
                 } else console.warn("HanimeComponent: Lampa.Noty not available to show error message.");
            });
        };

        // Отображение пустого состояния
        this.empty = function (msg) {
             console.log("HanimeComponent: empty() - Called with message:", msg);
             if (window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function' && typeof Lampa.Empty.prototype.start === 'function') {
                 var empty = new Lampa.Empty({ message: msg });
                 if(html && typeof html.empty === 'function' && typeof html.append === 'function') {
                     html.empty();
                     html.append(empty.render(true));
                 } else console.warn("HanimeComponent: Html container or methods missing for empty state via Lampa.Empty.");

                 if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(false);
                 if(this.activity && typeof this.activity.toggle === 'function') this.activity.toggle();

                 this.start = empty.start; // Redirect start method to Empty component's start.
                  console.log("HanimeComponent: Displaying empty state via Lampa.Empty. Reassigned start method.");
             } else {
                  console.warn("HanimeComponent: Lampa.Empty component not available. Using basic text fallback for empty state.");
                  if(html && typeof html.empty === 'function' && typeof html.text === 'function') {
                       html.empty();
                       html.text(msg + ' (Компонент Empty недоступен в Lampa)');
                  } else console.warn("HanimeComponent: Html container or methods missing for text fallback empty state.");

                  if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(false);
                 if(this.activity && typeof this.activity.toggle === 'function') this.activity.toggle();

                   this.start = function() {
                        console.log("HanimeComponent: Fallback start() for empty state. Setting minimal Controller for Back button.");
                       if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                            Lampa.Controller.add('content', { back: this.back });
                            Lampa.Controller.toggle('content');
                       } else console.warn("HanimeComponent: Lampa.Controller not available for fallback start method.");
                   }.bind(this); // Bind 'this'
             }
             console.log("HanimeComponent: empty() finished.");
        };

        // Метод создания активности.
        this.create = function () {
            console.log("HanimeComponent: create()");
            this.buildLayout(); // Build HTML structure
            if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(true);
            this.fetchCatalog(); // Start data fetch
             console.log("HanimeComponent: create() finished. Layout built and catalog fetch initiated.");
        };

        // Метод запуска активности.
        this.start = function () {
            console.log("HanimeComponent: start()");
             // Check if this is the active activity.
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this.activity) {
                console.log("HanimeComponent: start() - Not the currently active activity, skipping setup.");
                return;
            }
             console.log("HanimeComponent: start() - Activity is current active activity. Proceeding with Controller setup.");

            // Setup Lampa.Controller for navigation IF scroll and controller components are available.
             // THIS IS WHERE THE PREVIOUS ERROR OCCURRED because 'scroll' might be null if build failed or was skipped.
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && scroll && typeof scroll.render === 'function' && html && typeof html.find === 'function') {
                 console.log("HanimeComponent: Lampa Controller, Scroll and HTML are available. Setting up 'content' Controller.");
                 Lampa.Controller.add('content', {
                     toggle: function () {
                         //console.log("HanimeComponent: Controller toggle() called.");
                         if(Lampa.Controller && typeof Lampa.Controller.collectionSet === 'function' && scroll && typeof scroll.render === 'function') Lampa.Controller.collectionSet(scroll.render());
                         else console.warn("HanimeComponent: collectionSet missing dependencies in toggle.");

                         if(Lampa.Controller && typeof Lampa.Controller.collectionFocus === 'function' && scroll && typeof scroll.render === 'function') Lampa.Controller.collectionFocus(last || false, scroll.render());
                         else console.warn("HanimeComponent: collectionFocus missing dependencies in toggle.");

                          //console.log("HanimeComponent: Controller collectionSet/Focus called in toggle().");
                     },
                     left: function () { if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('left')) Navigator.move('left'); else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('menu'); else console.log("HanimeComponent: Cannot move left."); },
                     right: function () { if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('right')) Navigator.move('right'); else console.log("HanimeComponent: Cannot move right."); },
                     up: function () { if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('head'); else console.log("HanimeComponent: Head controller unavailable for UP."); },
                     down: function () { if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('down')) Navigator.move('down'); else console.log("HanimeComponent: Cannot move down."); },
                     back: this.back
                 });

                 Lampa.Controller.toggle('content');
                 console.log("HanimeComponent: Controller 'content' added and toggled.");

             } else {
                // If scroll or essential Controller methods are not available here, log the error.
                 console.error("HanimeComponent: ERROR: Scroll instance or required Controller methods missing in start(). Scroll is:", scroll, "Controller:", Lampa.Controller);
                console.warn("HanimeComponent: Attempting to set up minimal Controller for Back button as fallback.");
                // Set up a basic Controller only with 'back' logic as fallback.
                if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                    Lampa.Controller.add('content', { back: this.back });
                    Lampa.Controller.toggle('content');
                    console.log("HanimeComponent: Minimal fallback Controller for Back button setup.");
               } else console.warn("HanimeComponent: Lampa.Controller not available for basic back handler fallback.");
            }
           console.log("HanimeComponent: start() finished.");
       };

        // Метод паузы активности.
        this.pause = function () {
             console.log("HanimeComponent: pause()");
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') {
                 last = Lampa.Controller.item() || last;
                  console.log("HanimeComponent: Activity paused. Saved last focused DOM item:", last);
             } else { console.log("HanimeComponent: Pause called, but content controller not active or item missing. Last focus not saved."); }
             console.log("HanimeComponent: pause() finished.");
        };

        // Метод остановки активности.
        this.stop = function () {
             //console.log("HanimeComponent: stop() called.");
             console.log("HanimeComponent: stop() finished.");
        };

        // Метод рендеринга активности.
        this.render = function () {
             //console.log("HanimeComponent: render() called.");
            if (!html) { console.log("HanimeComponent: render() - Html layout not built yet, building now."); this.buildLayout(); }
             console.log("HanimeComponent: render() - Returning html element.");
            return html;
        };

        // Метод уничтожения активности.
        this.destroy = function () {
            console.log("HanimeComponent: destroy() called. Cleaning up resources.");
            if(network && typeof network.clear === 'function') network.clear(); network = null;
             if (items && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') Lampa.Arrays.destroy(items); items = null;
             if (scroll && typeof scroll.destroy === 'function') scroll.destroy(); scroll = null;
             if (html && typeof html.remove === 'function') html.remove(); html = null; itemsContainer = null; last = null;

            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function' && typeof Lampa.Controller.collectionSet === 'function') {
                 if (Lampa.Controller.enabled().name === 'content') { Lampa.Controller.collectionSet([]); }
                 Lampa.Controller.remove('content');
            } else console.warn("HanimeComponent: Lampa.Controller cleanup methods missing in destroy.");

            console.log("HanimeComponent: destroy() finished.");
        };

        // Обработчик кнопки "Назад".
        this.back = function () {
             console.log("HanimeComponent: back() called. Attempting Activity.backward().");
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') { Lampa.Activity.backward(); }
             else console.warn("HanimeComponent: Lampa.Activity or backward method missing for back navigation.");
        };
    }


    // --- Глобальная функция startPlugin. Точка входа. ---
    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() invoked.");

         // Проверка флага инициализации.
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag already set. Skipping startPlugin initialization.");
             return;
         }
        // Флаг будет установлен позже в initializeLampaDependencies после проверок Lampa.


        // --- ОЖИДАНИЕ ГОТОВНОСТИ LAMPA ---
       console.log("Hanime Plugin: Setting up listener for Lampa 'app:ready' event.");
         if (window.Lampa && typeof window.Lampa === 'object' && Lampa.Listener && typeof Lampa.Listener === 'object' && typeof Lampa.Listener.follow === 'function') {
             Lampa.Listener.follow('app', function (e) {
                 if (e.type === 'ready') {
                     console.log("Hanime Plugin: Lampa 'appready' event received. Calling initializeLampaDependencies.");
                     initializeLampaDependencies();
                 }
             });
             console.log("Hanime Plugin: Subscribed to Lampa 'app:ready' event.");

         } else if (window.appready && typeof window.appready === 'boolean' && window.appready) {
              console.warn("Hanime Plugin: Lampa 'appready' flag found set, but Lampa.Listener seems unavailable or unusual. Calling initializeLampaDependencies directly as fallback.");
              initializeLampaDependencies();

         } else {
             console.error("Hanime Plugin: CRITICAL FALLBACK: Lampa.Listener is unavailable AND 'appready' flag not set. Cannot reliably determine Lampa readiness. Attempting delayed initialization as a HIGHLY UNRELIABLE fallback.");
              setTimeout(initializeLampaDependencies, 500);
               console.log("Hanime Plugin: Delayed initialization fallback scheduled (500ms).");
         }

         console.log("Hanime Plugin: startPlugin() finished its initial execution (listener/fallback scheduled).");
    }


    // --- Функция инициализации, выполняющаяся после ГОТОВНОСТИ LAMPA. ---
    function initializeLampaDependencies() {
         console.log("Hanime Plugin: initializeLampaDependencies() called.");

         // Проверки критически важных компонентов Lampa.
         if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Template || typeof Lampa.Template !== 'object' || !Lampa.Component || typeof Lampa.Component !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function') {
              console.error("Hanime Plugin: CRITICAL ERROR: Required Lampa components are not available inside initializeLampaDependencies. Initialization failed.");
              if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                 Lampa.Noty.show('Ошибка плагина: Базовые компоненты Lampa недоступны.', 10000);
              } else console.warn("Hanime Plugin: Lampa.Noty not available to show critical error message.");
             // Флаг plugin_hanime_catalog_ready НЕ устанавливается при критической ошибке.
              return;
         }
         console.log("Hanime Plugin: Critical Lampa components checked OK.");


         // --- УСТАНОВКА ГЛОБАЛЬНОГО ФЛАГА ---
         if (window.plugin_hanime_catalog_ready) { // Повторная проверка на всякий случай.
              console.warn("Hanime Plugin: plugin_hanime_catalog_ready flag was unexpectedly set before initialization. Possible double load issue? Aborting.");
             if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                Lampa.Noty.show('Плагин уже запущен или конфликт инициализации.', 7000);
             }
            return; // Прерываем, если флаг уже стоит.
         }
         window.plugin_hanime_catalog_ready = true; // Устанавливаем флаг, что плагин инициализирован.
         console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag set.");


         // --- 1. Определение СТАНДАРТНЫХ ВНУТРЕННИХ шаблонов Lampa (как fallback). ---
         // Добавляем напрямую. Проверки наличия add метода на Template.
         console.log("Hanime Plugin: Adding standard template fallbacks...");
         if (Lampa.Template && typeof Lampa.Template.add === 'function') {
             Lampa.Template.add('card_vote_temp', '<div class="card__vote hanime-card__vote">{vote}</div>');
             Lampa.Template.add('card_quality_temp', '<div class="card__quality hanime-card__quality"><div>{quality}</div></div>');
             Lampa.Template.add('card_year_temp', '<div class="card__age hanime-card__age">{year}</div>');
             Lampa.Template.add('card_type_temp', '<div class="card__type hanime-card__type">{type}</div>');
             Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
              console.log("Hanime Plugin: Standard template fallbacks added.");
         } else {
             console.error("Hanime Plugin: Lampa.Template.add method not available. Cannot add template fallbacks.");
         }


         // --- 2. Определение ВАШЕГО основного шаблона карточки 'hanime-card'. ---
         console.log("Hanime Plugin: Adding hanime-card template...");
          if (Lampa.Template && typeof Lampa.Template.add === 'function' && typeof Lampa.Template.get === 'function') { // Check Template add/get methods
             Lampa.Template.add('hanime-card', `
                 <div class="hanime-card card selector layer--visible layer--render">
                     <div class="card__view hanime-card__view">
                         <img src="./img/img_load.svg" class="card__img hanime-card__img" alt="{title}" loading="lazy" />
                         <div class="card__icons hanime-card__icons">
                             <div class="card__icons-inner hanime-card__icons-inner"></div>
                         </div>
                         <!-- Используем Template.get для внутренних шаблонов (если доступен get) -->
                          ${ (Lampa.Template.get('card_vote_temp', {}, true)) ? Lampa.Template.get('card_vote_temp', { vote: '{vote}' }, true) : ''}
                          ${ (Lampa.Template.get('card_quality_temp', {}, true)) ? Lampa.Template.get('card_quality_temp', { quality: '{quality}' }, true) : ''}
                          ${ (Lampa.Template.get('card_type_temp', {}, true)) ? Lampa.Template.get('card_type_temp', { type: '{type}' }, true) : ''}
                     </div>
                     <div class="card__title hanime-card__title">{title}</div>
                     ${ (Lampa.Template.get('card_year_temp', {}, true)) ? Lampa.Template.get('card_year_temp', { year: '{year}' }, true) : ''}
                 </div>
             `);
              console.log("Hanime Plugin: HanimeCard template added successfully.");
         } else {
              console.error("Hanime Plugin: Lampa.Template.add or get methods missing. Cannot add hanime-card template.");
         }


         // --- 3. CSS Стили ---
         // ПОЛНОСТЬЮ УДАЛЕН.

         console.log("Hanime Plugin: Custom CSS block removed.");


         // --- 4. Регистрируем ВАШ ОСНОВНОЙ КОМПОНЕНТ ---
         console.log("Hanime Plugin: Registering HanimeComponent...");
          if (window.Lampa && Lampa.Component && typeof Lampa.Component.add === 'function' && typeof Lampa.Component.get === 'function') { // Check Component Manager and get
             Lampa.Component.add('hanime_catalog', HanimeComponent);
              console.log("Hanime Plugin: Component 'hanime_catalog' registered successfully.");
          } else {
              console.error("Hanime Plugin: Lampa.Component.add or get methods missing. Cannot register component.");
               if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                  Lampa.Noty.show('Ошибка плагина: Не удалось зарегистрировать компонент.', 7000);
               }
          }


         // --- 5. Добавляем пункт меню ---
         console.log("Hanime Plugin: Calling addMenuItem()...");
         addMenuItem(); // addMenuItem() defined below.
          console.log("Hanime Plugin: initializeLampaDependencies finished.");
      }

        // --- Функция добавления пункта меню ---
       function addMenuItem() {
            console.log("Hanime Plugin: addMenuItem() called.");

             // Выполняем проверки перед взаимодействием с UI.
            if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Component || typeof Lampa.Component !== 'object' || typeof Lampa.Component.get !== 'function') {
                 console.error("Hanime Plugin: addMenuItem critical check failed - Lampa core components or jQuery missing."); return;
            }
           var menuList = $('.menu .menu__list').eq(0);
           if (!menuList.length) { console.error("Hanime Plugin: addMenuItem critical check failed - Lampa menu list DOM not found."); return; }
            var ourComponentRegistered = Lampa.Component.get('hanime_catalog');
            if (!ourComponentRegistered) { console.error("Hanime Plugin: addMenuItem failed - Component 'hanime_catalog' not registered."); return; }

           // Необязательная проверка на дублирование
            if ($('.menu .menu__list .menu__text:contains("Hanime Catalog")').length > 0) { console.warn("Hanime Plugin: addMenuItem skipping - duplicate menu item found."); return; }

           console.log("Hanime Plugin: Proceeding to create menu item DOM element.");
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

           if (typeof menu_item.on === 'function') {
               menu_item.on('hover:enter', function () {
                    console.log("Hanime Plugin: Menu item 'Hanime Catalog' activated.");
                   if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.push === 'function') {
                      Lampa.Activity.push({
                          url: '', title: 'Hanime Catalog', component: 'hanime_catalog', page: 1
                      });
                       console.log("Hanime Plugin: Lampa.Activity.push called.");
                  } else console.warn("Hanime Plugin: Lampa.Activity.push missing.");
              });
               console.log("Hanime Plugin: 'hover:enter' handler attached to menu item.");
           } else console.warn("Hanime Plugin: jQuery object 'on' method missing for menu item.");

           menuList.append(menu_item);
           console.log("Hanime Plugin: Menu item added to DOM.");
           console.log("Hanime Plugin: addMenuItem finished.");
       }

       // --- ТОЧКА ВХОДА ---
       startPlugin();

   })();
