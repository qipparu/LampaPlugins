(function () {
    'use strict';

    // --- HanimeCard компонента ---
    // Создает и управляет DOM-элементом одной карточки аниме.
    // Использует только стандартные классы Lampa для интеграции дизайна.
    function HanimeCard(data, componentRef) {
        // Обрабатываем данные из вашего API, извлекая нужную информацию.
        var processedData = {
            id: data.id,
            title: data.name || data.title || 'Без названия',
            poster_path: data.poster || data.img, // Используем имя поля, ожидаемое standard Card (poster_path)
            vote_average: data.vote_average || data.vote || null, // Рейтинг
            quality: data.quality || data.release_quality || null, // Качество (строка)
            release_year: ((data.year || data.release_date || '') + '').slice(0, 4), // Год
            type: data.first_air_date ? 'tv' : 'movie', // Тип (tv/movie) - определяем на основе данных
            original_name: data.original_name // Оригинальное название
        };

         // Получаем HTML-код базовой структуры карточки из нашего шаблона 'hanime-card'.
         // Этот шаблон должен содержать только основные классы и структуру (.card, .card__view, .card__icons, .card__title, .card__age placeholders).
         // Данные типа рейтинга, качества, года, типа БУДУТ ДОБАВЛЯТЬСЯ ДИНАМИЧЕСКИ позже.
        var cardTemplate = Lampa.Template.get('hanime-card', {
            // В шаблон передаем только те данные, которые используются непосредственно в нем.
            img: processedData.poster_path, // Изображение
            title: processedData.title // Заголовок
            // Рейтинг, качество, год, тип не передаются напрямую сюда.
        });

        var cardElement = $(cardTemplate); // Создаем jQuery-объект DOM-элемента из шаблона.

        // Привязываем данные и ссылку на компонент к DOM-элементу.
        cardElement.data('cardData', processedData);
        cardElement.data('cardComponentRef', componentRef); // Reference to the main screen component
        cardElement.data('cardInstance', this); // Store instance reference for update


        // --- Методы экземпляра HanimeCard ---

        // Метод для добавления иконки (закладка, история и т.д.).
        // Использует стандартные классы иконок Lampa.
        this.addicon = function(name) {
            var iconsContainer = cardElement.find('.card__icons-inner'); // Находим стандартный контейнер иконок.
            if (iconsContainer.length) {
                var icon = document.createElement('div');
                icon.classList.add('card__icon'); // Базовый класс иконки Lampa.
                icon.classList.add('icon--'+name); // Специфический класс для стилизации (icon--book, icon--history, и т.п.).
                iconsContainer.append(icon);
                //console.log("HanimeCard: Added icon:", name);
            } else {
                console.warn("HanimeCard: Could not find .card__icons-inner to add icon:", name);
            }
        }

        // Метод для динамического добавления или обновления данных вроде рейтинга, качества, типа, года.
        // Использует стандартные классы элементов карточки (.card__vote, .card__quality, .card__type, .card__age).
        this.addDetails = function() {
             //console.log("HanimeCard: addDetails() for", processedData.title);
             var viewElement = cardElement.find('.card__view'); // Контейнер с картинкой, куда добавляются оверлеи (рейтинг, качество, тип).

            // Добавление/обновление Рейтинга
             if (processedData.vote_average > 0 && viewElement.length) {
                 let voteElement = cardElement.find('.card__vote'); // Находим элемент с классом .card__vote.
                 if (!voteElement.length) { // Если элемента нет, создаем его со стандартным классом.
                     voteElement = $('<div class="card__vote"></div>');
                     viewElement.append(voteElement); // Добавляем его в область view.
                 }
                 voteElement.text(parseFloat(processedData.vote_average).toFixed(1)); // Устанавливаем форматированный текст рейтинга.
             } else {
                 cardElement.find('.card__vote').remove(); // Удаляем элемент рейтинга, если данных нет или <= 0.
             }

             // Добавление/обновление Качества
            if (processedData.quality && viewElement.length) {
                 let qualityElement = cardElement.find('.card__quality'); // Находим элемент .card__quality.
                 if (!qualityElement.length) { // Если элемента нет, создаем его со стандартным классом и внутренней структурой.
                     qualityElement = $('<div class="card__quality"><div></div></div>'); // Стандартный div внутри качества.
                     viewElement.append(qualityElement);
                 }
                 qualityElement.find('div').text(processedData.quality); // Устанавливаем текст качества.
            } else {
                cardElement.find('.card__quality').remove(); // Удаляем элемент качества, если данных нет.
            }

             // Добавление/обновление Типа (TV/Movie)
             if (processedData.type && viewElement.length) {
                 let typeElement = cardElement.find('.card__type'); // Находим элемент .card__type.
                  if (!typeElement.length) { // Если нет, создаем.
                     typeElement = $('<div class="card__type"></div>');
                      viewElement.append(typeElement);
                  }
                  typeElement.text(processedData.type.toUpperCase()); // Устанавливаем текст типа (TV или MOVIE).
             } else {
                 cardElement.find('.card__type').remove(); // Удаляем элемент типа, если данных нет.
             }

             // Добавление/обновление Года (под заголовком)
             let ageElement = cardElement.find('.card__age'); // Находим элемент .card__age (он должен быть в шаблоне).
             if (ageElement.length) {
                  // Если элемент для года есть в шаблоне, просто обновляем его текст.
                  if (processedData.release_year !== '0000' && processedData.release_year) {
                      ageElement.text(processedData.release_year).show(); // Устанавливаем год и показываем элемент.
                  } else {
                       ageElement.text('').hide(); // Если года нет или 0000, скрываем элемент.
                  }
             } else {
                 // Если элемента .card__age нет в шаблоне, можно его динамически создать
                 // (но лучше, чтобы он был в шаблоне с display: none по умолчанию, если данных нет).
                 if (processedData.release_year !== '0000' && processedData.release_year) {
                     // Только если реально есть год И элемента нет, создаем его и добавляем.
                     let newAgeElement = $('<div class="card__age"></div>').text(processedData.release_year);
                     // Находим .card__title и добавляем после него (если есть).
                      let titleElement = cardElement.find('.card__title');
                      if (titleElement.length) {
                          titleElement.after(newAgeElement);
                          console.warn("HanimeCard: Created .card__age element dynamically. Prefer including in template.");
                      } else {
                          // Fallback, если даже заголовка нет, добавляем в конец карточки.
                          cardElement.append(newAgeElement);
                          console.error("HanimeCard: Cannot find .card__title to place .card__age dynamically.");
                      }
                 }
             }
             //console.log("HanimeCard: addDetails() completed.");
        }


        // Метод обновления иконок закладок и маркера состояния.
        // Использует стандартные Lampa классы для маркеров.
        // Вызывается из .update() и .onVisible().
        this.updateFavoriteIcons = function() {
             //console.log("HanimeCard: updateFavoriteIcons() for", processedData.title);
             // Очищаем все предыдущие иконки и маркеры.
            cardElement.find('.card__icons-inner').empty(); // Очищаем контейнер иконок
            cardElement.find('.card__marker').remove(); // Удаляем старый маркер состояния (смотрю/смотрел)

            // Получаем статус закладок элемента с помощью Lampa.Favorite
             var status = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(processedData) : {};
             if(Object.keys(status).length === 0 && window.Lampa && Lampa.Favorite) console.warn("HanimeCard: Lampa.Favorite.check returned empty status for", processedData.title, ". Data:", processedData);


            // Добавляем стандартные иконки на основе статуса закладки.
            if (status.book) this.addicon('book');     // "Запланировано" (букмарк)
            if (status.like) this.addicon('like');     // "Нравится"
            if (status.wath) this.addicon('wath');     // "Просматриваю"
             // Проверяем статус просмотра через Timeline (если есть и watched метод доступен)
            if (status.history || (window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched === 'function' && Lampa.Timeline.watched(processedData))) this.addicon('history'); // "Из истории" или "Просмотрено полностью"

            // Логика отображения текстового маркера состояния над постером (Смотрю, Просмотрено и т.п.).
             var marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown']; // Стандартные типы маркеров Lampa
             var activeMarker = marks.find(m => status[m]); // Ищем, какой маркер активен для этого элемента

             if (activeMarker) {
                 // Если нашли активный маркер, добавляем его DOM-элемент со стандартным классом .card__marker.
                 var markerElement = cardElement.find('.card__marker');
                 if (!markerElement.length) { // Если элемента еще нет, создаем его
                     markerElement = $('<div class="card__marker"><span></span></div>');
                      // Добавляем элемент маркера в область просмотра (.card__view), т.к. он отображается над постером.
                     cardElement.find('.card__view').append(markerElement);
                     //console.log("HanimeCard: Added .card__marker element.");
                 }
                 // Устанавливаем текст маркера, используя переводчик Lampa (Lampa.Lang).
                 // Проверяем, что Lampa.Lang доступен и метод translate есть.
                 markerElement.find('span').text(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? Lampa.Lang.translate('title_' + activeMarker) : activeMarker);
                 // Добавляем класс, специфичный для типа маркера (card__marker--look, card__marker--viewed и т.c.).
                 // Эти классы стилизуются в основном CSS Lampa.
                 markerElement.removeClass(marks.map(m => 'card__marker--' + m).join(' ')) // Удаляем все предыдущие классы маркеров типов
                             .addClass('card__marker--' + activeMarker); // Добавляем класс активного типа
             } else {
                 // Если для элемента нет активного маркера, убеждаемся, что его DOM-элемент удален.
                 cardElement.find('.card__marker').remove();
             }
             //console.log("HanimeCard: updateFavoriteIcons() completed.");
        };

        // Метод вызывается Lampa (например, Scroll компонентом), когда DOM-элемент этой карточки становится видимым на экране.
        // Используется для отложенной загрузки изображений и обновления иконок.
        this.onVisible = function() {
             //console.log("HanimeCard: onVisible() for", processedData.title);
             var imgElement = cardElement.find('.card__img'); // Находим стандартный img элемент.

             // Проверяем, нужно ли загружать картинку (если src пустой, или содержит placeholder).
             if (imgElement.length && (!imgElement.attr('src') || imgElement.attr('src').includes('img_load.svg'))) {
                 var src = processedData.poster_path; // Получаем URL картинки из данных.

                 // Используем стандартную Lampa логику загрузки картинок с кэшированием (Lampa.ImageCache).
                 // Это стандартный и рекомендованный способ для оптимизации производительности и памяти.
                 if(window.Lampa && Lampa.ImageCache && typeof Lampa.ImageCache.read === 'function' && typeof Lampa.ImageCache.write === 'function') {
                      // Пробуем прочитать картинку из кэша. read вернет true и установит src, если найдена в кэше.
                      if(!Lampa.ImageCache.read(imgElement[0], src)) { // Передаем нативный DOM-элемент img.
                         // Если картинка не найдена в кэше, устанавливаем обработчики событий загрузки/ошибки.
                          imgElement[0].onload = () => {
                              cardElement.addClass('card--loaded'); // Добавляем стандартный класс 'card--loaded' для стилей (например, плавного появления картинки).
                              Lampa.ImageCache.write(imgElement[0], imgElement[0].src); // Записываем в кэш после успешной загрузки.
                              //console.log("HanimeCard: Image loaded and cached:", src);
                          };
                          imgElement[0].onerror = () => {
                               console.error('Hanime Plugin: Image load error:', src);
                               imgElement.attr('src', './img/img_broken.svg'); // При ошибке загрузки устанавливаем заглушку.
                               // Если Lampa.Tmdb доступен, можно уведомить его об ошибке картинки (хотя это больше для отладки TMDB источников).
                               if(window.Lampa && Lampa.Tmdb && typeof Lampa.Tmdb.broken === 'function') Lampa.Tmdb.broken();
                          };
                          // Устанавливаем src картинки. Браузер начнет загрузку.
                          imgElement.attr('src', src || './img/img_broken.svg'); // Используем Fallback src сразу, если основной пустой.
                      } else {
                         // Если картинка успешно загружена из кэша (Lampa.ImageCache.read вернула true),
                         // нужно вручную добавить класс 'card--loaded', т.к. onload не сработает.
                         cardElement.addClass('card--loaded');
                         //console.log("HanimeCard: Image loaded from cache:", src);
                      }
                 } else {
                     // Fallback, если Lampa.ImageCache недоступен. Простая загрузка картинки.
                     console.warn("Hanime Plugin: Lampa.ImageCache not available. Using basic image loading.");
                      imgElement[0].onload = () => { cardElement.addClass('card--loaded'); console.log("HanimeCard: Image loaded (basic):", src); };
                     imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error (basic):', src); imgElement.attr('src', './img/img_broken.svg'); };
                     imgElement.attr('src', src || './img/img_broken.svg'); // Устанавливаем src
                     //console.log("HanimeCard: Image processing started (basic):", src);
                 }
             } else {
                 //console.log("HanimeCard: Image already loaded or placeholder set for", processedData.title);
             }


            // Обновляем иконки закладок и маркер статуса при появлении в видимости.
            // Это гарантирует, что актуальный статус будет показан.
            this.updateFavoriteIcons();
        }

        // Метод для первоначальной настройки экземпляра HanimeCard после создания ее DOM-элемента.
        // Навешиваем стандартные обработчики событий Lampa (hover:*).
        // Этот метод вызывается при первом рендере карточки.
        this.create = function(){
             //console.log("HanimeCard: create() for", processedData.title);

             // Проверяем, был ли create вызван ранее (для предотвращения дублирования).
             // Используем data-атрибут для этого.
             if (cardElement.data('created')) {
                 //console.log("HanimeCard: create() already called for", processedData.title);
                 return;
             }


             // Привязываем стандартные события Lampa hover:* к корневому DOM-элементу карточки (jQuery-объекту).
             // Эти события генерируются Lampa.Controller при навигации с пульта.
             // Все эти события делегируют обработку методам родительского компонента (componentRef).
             if (typeof cardElement.on === 'function') { // Проверяем, что jQuery on() доступен
                cardElement.on('hover:focus', function () {
                     //console.log("HanimeCard: hover:focus on", processedData.title);
                     // Когда карточка получает фокус от Controller, сообщаем родительскому компоненту, чтобы он прокрутил Scroll к ней.
                     if (componentRef && componentRef.updateScrollToFocus && typeof componentRef.updateScrollToFocus === 'function') {
                          componentRef.updateScrollToFocus(cardElement); // Передаем jQuery-объект карточки
                     }
                     // Обновляем состояние карточки (иконки, маркер) при получении фокуса.
                     this.update();
                }.bind(this)); // Важно привязать контекст (this = экземпляр HanimeCard)

                 cardElement.on('hover:enter', function () {
                    //console.log("HanimeCard: hover:enter on", processedData.title);
                    // Когда на карточке нажимают ОК/Enter, обрабатываем выбор/клик.
                     // Делегируем эту задачу родительскому HanimeComponent.
                     if (componentRef && componentRef.onCardClick && typeof componentRef.onCardClick === 'function') {
                         componentRef.onCardClick(processedData); // Передаем данные карточки.
                     }
                }.bind(this));

                cardElement.on('hover:long', function(){
                     //console.log("HanimeCard: hover:long on", processedData.title);
                     // Когда на карточке нажимают долго (для контекстного меню).
                     // Делегируем эту задачу родительскому HanimeComponent.
                     if (componentRef && componentRef.showCardContextMenu && typeof componentRef.showCardContextMenu === 'function') {
                          componentRef.showCardContextMenu(cardElement, processedData); // Передаем DOM и данные.
                     }
                 }.bind(this));
             } else {
                 console.warn("HanimeCard: jQuery on() method not available to attach hover events.");
             }


            // Привязываем стандартное Lampa событие 'visible'.
            // Это событие генерируется Lampa (например, Scroll компонентом) когда элемент становится видимым в прокручиваемой области.
             this.card = cardElement[0]; // Получаем нативный DOM-элемент. Нужен для addEventListener.
             if (this.card && typeof this.card.addEventListener === 'function') {
                this.card.addEventListener('visible', this.onVisible.bind(this)); // Привязываем метод onVisible.
                //console.log("HanimeCard: Attached 'visible' event listener.");
             } else {
                 console.warn("HanimeCard: Cannot attach 'visible' event listener, native element or addEventListener not available.");
             }


            // Вызываем первоначальное обновление (иконки, маркеры, возможно прогресс-бар),
            // чтобы они отобразились при создании карточки. Делаем с небольшой задержкой,
            // чтобы DOM элемент был добавлен на страницу к этому моменту и addDetails/update мог найти элементы внутри.
             setTimeout(() => {
                  this.addDetails(); // Добавляем/обновляем детали (рейтинг, качество, год, тип)
                  this.update(); // Обновляем иконки закладок/маркеры (update вызывает updateFavoriteIcons)
             }, 0); // Задержка 0 мс = "выполнить как можно скорее после завершения текущего стека JS".

             // Отмечаем, что create был вызван для этого jQuery-объекта.
             cardElement.data('created', true);
             //console.log("HanimeCard: create() finished.");
        }

        // Метод обновления состояния карточки. Может вызываться вручную или при событиях (например, hover:focus).
        this.update = function(){
             //console.log("HanimeCard: update() called for", processedData.title);
             // Обновляем иконки закладок и маркер состояния.
            this.updateFavoriteIcons();
            // Логика обновления прогресс-бара просмотра (используя Lampa.Timeline.watched_status),
            // если у вас включен прогресс-бар в плагине и доступен Timeline компонент.
             // if(window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched_status === 'function') Lampa.Timeline.watched_status(cardElement, processedData);
             // else console.warn("HanimeCard: Cannot update watched status, Lampa.Timeline not available or method missing.");
        }

        // Метод рендеринга. Возвращает DOM-элемент карточки для вставки в дерево документа.
        // Этот метод вызывается HanimeComponent.build().
        this.render = function(js){
             //console.log("HanimeCard: render() called.");
             // Вызываем метод create() только в первый раз, когда вызывается render().
             if (!cardElement.data('created')) {
                 this.create();
             }
            return js ? cardElement[0] : cardElement; // Возвращаем нативный DOM-элемент или jQuery-объект в зависимости от аргумента js.
        }

        // Метод уничтожения экземпляра HanimeCard. Вызывается из HanimeComponent.destroy().
        this.destroy = function(){
             console.log("HanimeCard: destroy() for", processedData.title);
             // Удаляем привязку события 'visible'.
             if(this.card && typeof this.card.removeEventListener === 'function' && this.onVisible) this.card.removeEventListener('visible', this.onVisible.bind(this));
             // Удаляем сам DOM-элемент карточки из документа.
             if(cardElement && typeof cardElement.remove === 'function') cardElement.remove();
             // Обнуляем ссылки на объекты для сборщика мусора.
             processedData = null; cardElement = null; this.card = null; componentRef = null;
             //console.log("HanimeCard: destroy() completed.");
        }

        // HanimeCard не должна вызывать create() самостоятельно сразу при создании.
        // Create() вызывается в методе render(), который вызывает компонент-владелец (HanimeComponent).
    }


    // --- HanimeComponent (основной компонент, отображает одну горизонтальную линию аниме) ---
    function HanimeComponent(componentObject) {
        var network = null; // Объект Lampa.Reguest для сетевых запросов
        var scroll = null; // Объект Lampa.Scroll для управления прокруткой

        var items = []; // Массив JS-объектов HanimeCard
        var html = null; // Корневой DOM-контейнер компонента (items-line), инициализируется в buildLayout
        var itemsContainer = null; // DOM-контейнер для самих карточек внутри Scroll, инициализируется в buildLayout

        var active = 0; // Индекс текущего активного элемента в массиве items (для сохранения позиции)
        var last = null; // Ссылка на DOM-элемент последней сфокусированной карточки

        // URL-ы вашего API. Используйте свои реальные URL здесь.
        var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
        // Пример URL для получения списка последних добавлений (одна горизонтальная линия).
        var CATALOG_URL = API_BASE_URL + "/catalog/movie/newset.json"; // ИЛИ URL вашей реальной категории
        var STREAM_URL_TEMPLATE = API_BASE_URL + "/stream/movie/{id}.json"; // URL для получения потока
        var META_URL_TEMPLATE = API_BASE_URL + "/meta/movie/{id}.json";     // URL для получения подробных метаданных
        // Адрес вашего прокси для обхода CORS, если необходимо.
        var PROXY_BASE_URL = "http://77.91.78.5:3000";


        // Метод для построения основной структуры DOM компонента (одна линия items-line).
        // Использует стандартные классы Lampa для лейаута. Вызывается в create().
        this.buildLayout = function() {
             //console.log("HanimeComponent: buildLayout()");
             // Создаем корневой DOM-элемент компонента, имитирующий структуру items-line Lampa.
             // Используем СТАНДАРТНЫЕ классы для обеспечения корректного дизайна Lampa.
            html = $(`
                <div class="items-line layer--visible layer--render items-line--type-cards"> <!-- Стандартные классы контейнера линии -->
                    <div class="items-line__head"> <!-- Заголовок линии -->
                        <div class="items-line__title">Последние добавленные</div> <!-- Стандартный класс для заголовка -->
                         <!-- Можно добавить кнопку "Еще" со стандартными классами Lampa items-line__more selector -->
                         <!-- <div class="items-line__more selector">Еще</div> -->
                    </div>
                    <div class="items-line__body"> <!-- Контейнер для содержимого линии (здесь будет скролл) -->
                        <!-- Lampa.Scroll.render() будет вставлен сюда при build -->
                    </div>
                </div>
            `);

            // Создаем контейнер, в который будем добавлять DOM-элементы карточек.
            // Lampa.Scroll обернет этот элемент в свою DOM-структуру с классами scroll__content и scroll__body.
             itemsContainer = $('<div class="items-cards"></div>'); // Класс items-cards - стандартный для контейнера карточек в линиях/категориях.
             //console.log("HanimeComponent: buildLayout completed. Initial DOM structure ready.");
        };

        // Метод для загрузки данных каталога из API.
        // Вызывается в create().
        this.fetchCatalog = function () {
            var _this = this; // Сохраняем ссылку на компонент для использования внутри коллбэков.
             // Показываем индикатор загрузки Lampa активности. Проверяем наличие activity и loader.
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeComponent: Activity loader not available in fetchCatalog.");

             console.log("HanimeComponent: fetchCatalog() - Starting request to", CATALOG_URL);

             // Инициализируем Lampa.Reguest компонент, если еще не создан.
             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeComponent: Lampa.Reguest initialized.");
             }

             // Если network компонент доступен, отменяем все предыдущие запросы.
             if (network && typeof network.clear === 'function') network.clear();
             else console.warn("HanimeComponent: Network clear method not available.");


             // Выполняем сетевой запрос к API.
             if(network && CATALOG_URL && typeof network.native === 'function'){ // Проверяем, что network компонент и URL доступны, и метод native есть.
                network.native(CATALOG_URL,
                    function (data) { // Коллбэк успешного получения данных.
                         //console.log("HanimeComponent: Catalog data received:", data);
                        if (data && data.metas && Array.isArray(data.metas)) { // Проверяем формат ответа (ожидаем { metas: [...] })
                             if (data.metas.length > 0) {
                                _this.build(data.metas); // Если есть элементы в metas, переходим к построению UI.
                             } else {
                                _this.empty("Каталог пуст."); // Если metas пустой массив.
                             }
                        } else {
                            _this.empty("Неверный формат данных от API."); // Если ответ не в ожидаемом формате.
                            console.error("HanimeComponent: Invalid data format from API.", data);
                        }
                    },
                    function (errorStatus, errorText) { // Коллбэк ошибки запроса.
                        _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus); // Показываем сообщение об ошибке.
                        console.error("HanimeComponent: Failed to load catalog.", errorStatus, errorText);
                    },
                    false, // Не кэшировать ответ от API по этому URL (Lampa по умолчанию кэширует).
                    { dataType: 'json', timeout: 15000 } // Указываем тип данных (JSON) и таймаут (15 секунд).
                );
             } else {
                 // Если Network компонент или URL недоступны, сообщаем об ошибке.
                 console.error("HanimeComponent: Cannot fetch catalog. Network component, CATALOG_URL, or network.native missing.");
                  _this.empty("Не удалось загрузить каталог. Ошибка инициализации сети.");
             }
        };

        // Метод для построения UI из полученного списка элементов (metadata).
        // Вызывается из fetchCatalog() после успешной загрузки.
        this.build = function (result) {
            var _this = this;
             console.log("HanimeComponent: build() - Building UI with", result.length, "items.");

            // Инициализируем Lampa.Scroll компонент (горизонтальный), если еще не создан.
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                  // step: 250 - величина прокрутки при стрелках вверх/вниз на строке (шаг перехода между строками)
                  // direction: 'horizontal' - указываем, что это горизонтальный скролл.
                  scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
                  console.log("HanimeComponent: Lampa.Scroll initialized (horizontal).");
             }


             // Если Scroll инициализирован, прокручиваем его в начало (актуально при многостраничных категориях).
             if(scroll && typeof scroll.minus === 'function') scroll.minus();
             else console.warn("HanimeComponent: Scroll or scroll.minus method not available in build(). Cannot scroll to beginning.");


             // Убеждаемся, что itemsContainer и Scroll доступны для работы с DOM.
             if (!(itemsContainer && typeof itemsContainer.empty === 'function' && scroll && html && typeof html.find === 'function' && typeof html.append === 'function' && typeof scroll.append === 'function' && typeof scroll.render === 'function')) {
                  console.error("HanimeComponent: Missing critical DOM/Lampa dependencies (itemsContainer, scroll, html, Lampa.Template.get methods) in build(). Aborting UI build.");
                   // Если не можем построить UI, показываем ошибку/пустое состояние.
                   if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                  _this.empty("Не удалось построить интерфейс.");
                  return;
             }


            // Очищаем контейнер для карточек и массив объектов HanimeCard перед добавлением новых элементов.
            itemsContainer.empty(); // Удаляем все предыдущие DOM-элементы карточек.
            items = []; // Очищаем массив JS-объектов HanimeCard.


            // Для каждого элемента метаданных создаем HanimeCard, получаем ее DOM и добавляем в itemsContainer.
            if(itemsContainer && scroll && window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function') { // Повторная проверка перед циклом forEach.
                 result.forEach(function (meta) {
                     // Создаем новый экземпляр HanimeCard, передавая данные и ссылку на текущий HanimeComponent (_this).
                    var card = new HanimeCard(meta, _this); // new HanimeCard(data, componentRef)
                     // Получаем jQuery-объект корневого DOM-элемента этой карточки.
                    var cardElement = card.render();

                     // Добавляем DOM-элемент карточки в контейнер, который будет прокручиваться Scroll-ом.
                     itemsContainer.append(cardElement);
                     // Сохраняем объект HanimeCard в массиве items. Этот массив нужен для управления экземплярами HanimeCard (destroy, поиск по элементу).
                    items.push(card);
                });
                 console.log("HanimeComponent: Created and added", items.length, "cards to itemsContainer.");

                 // Добавляем itemsContainer (который содержит все карточки) в Scroll компонент.
                 // Lampa.Scroll автоматически обернет вокруг itemsContainer свою внутреннюю структуру DOM.
                scroll.append(itemsContainer);
                 //console.log("HanimeComponent: itemsContainer appended to scroll.");


                 // Вставляем рендер Scroll компонента в items-line__body основного layout'а компонента.
                 // scroll.render() возвращает корневой DOM-элемент Scroll.
                 // Передача 'true' в render() заставляет Scroll пересчитать свои размеры и положение.
                html.find('.items-line__body').empty().append(scroll.render(true));
                 //console.log("HanimeComponent: Scroll rendered into items-line__body.");

            } else {
                console.error("HanimeComponent: Missing required objects or methods before building cards in build().");
                if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина при создании карточек.', 5000);
                  }
            }


             // Убираем индикатор загрузки активности и делаем основной DOM компонента видимым.
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
             if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
             console.log("HanimeComponent: Build process completed and activity toggled.");

             // Настройка Controller для навигации и первый фокус будут в start() методе.
        };

         // Коллбэк метод, который вызывается из HanimeCard при клике/выборе элемента (например, ОК/Enter).
         this.onCardClick = function(cardData) {
             console.log("HanimeComponent: Card clicked:", cardData.title);
             // Вызываем метод fetchStreamAndMeta для загрузки деталей потока и запуска плеера.
            this.fetchStreamAndMeta(cardData.id, cardData);
         }

         // Коллбэк метод, который вызывается из HanimeCard при долгом нажатии (для показа контекстного меню).
         this.showCardContextMenu = function(cardElement, cardData) {
             console.log("HanimeComponent: showCardContextMenu for", cardData.title);
             var _this = this;

             // Определяем имя текущего активного контроллера Lampa, чтобы вернуться к нему после закрытия меню Select.
             // Проверяем, что Lampa.Controller доступен и его метод enabled есть.
             var enabled = (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;

             // Получаем статус закладок для элемента с помощью Lampa.Favorite. Проверяем его наличие.
             var status  = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(cardData) : {};


             // Формируем массив пунктов для контекстного меню.
             // Используем Lampa.Lang для получения переводов текстов пунктов. Проверяем наличие Lang.
             var menu_favorite = [];
             if(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') {
                 // Пункты для стандартных коллекций закладок
                 menu_favorite = [
                     { title: Lampa.Lang.translate('title_book'), where: 'book', checkbox: true, checked: status.book, collect: true }, // Добавил collect: true для стандартного поведения Lampa.Select с чекбоксами
                     { title: Lampa.Lang.translate('title_like'), where: 'like', checkbox: true, checked: status.like, collect: true }, // Добавил collect: true
                     { title: Lampa.Lang.translate('title_wath'), where: 'wath', checkbox: true, checked: status.wath, collect: true }, // Добавил collect: true
                     { title: Lampa.Lang.translate('menu_history'), where: 'history', checkbox: true, checked: status.history, collect: true }, // Добавил collect: true
                     { title: Lampa.Lang.translate('settings_cub_status'), separator: true } // Разделитель для статусов просмотра
                 ];
                 // Добавляем пункты для маркеров состояния ('look', 'viewed' и т.д.), если есть переводы
                 const marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];
                 marks.forEach(mark => {
                      const translatedTitle = Lampa.Lang.translate('title_' + mark);
                       // Проверяем, что перевод существует и не является просто ключом
                      if (translatedTitle && translatedTitle !== 'title_' + mark) {
                          menu_favorite.push({
                              title: translatedTitle,
                              where: mark,
                              checkbox: true, // Эти пункты обычно представлены как чекбоксы в Lampa.Select
                              checked: status[mark], // Текущее состояние
                              collect: true // Флаг для Lampa.Select, чтобы обрабатывать как переключение статуса
                          });
                      }
                 });

             } else {
                 console.warn("HanimeComponent: Lampa.Lang not available, using English fallbacks for menu items.");
                 menu_favorite = [ // Fallback на английском или просто название маркера
                      { title: 'Planned', where: 'book', checkbox: true, checked: status.book, collect: true },
                     { title: 'Liked', where: 'like', checkbox: true, checked: status.like, collect: true },
                     { title: 'Watching', where: 'wath', checkbox: true, checked: status.wath, collect: true },
                     { title: 'History', where: 'history', checkbox: true, checked: status.history, collect: true },
                     { title: 'Status', separator: true },
                     { title: 'Looked', where: 'look', checkbox: true, checked: status.look, collect: true },
                     { title: 'Viewed', where: 'viewed', checkbox: true, checked: status.viewed, collect: true },
                     { title: 'Scheduled', where: 'scheduled', checkbox: true, checked: status.scheduled, collect: true },
                     { title: 'Continued', where: 'continued', checkbox: true, checked: status.continued, collect: true },
                     { title: 'Thrown', where: 'thrown', checkbox: true, checked: status.thrown, collect: true }
                 ];
             }


             // Показываем стандартное контекстное меню Lampa (Lampa.Select).
             // Проверяем наличие Lampa.Select.
             if (window.Lampa && Lampa.Select && typeof Lampa.Select.show === 'function') {
                 Lampa.Select.show({
                     title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('title_action') : 'Action', // Заголовок меню Select
                     items: menu_favorite, // Пункты меню
                     // Обработчик события "Назад" в меню Select.
                     onBack: ()=>{
                          // При закрытии меню Select, возвращаем управление Controller-у, который был активен до открытия меню.
                         if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                          console.log("HanimeComponent: Context menu back button pressed. Restored controller:", enabled);
                     },
                     // Обработка выбора чекбокса в меню (для закладок book, like, wath, history и маркеров look, viewed и т.д. с collect: true)
                     onCheck: (itemData)=>{
                         console.log("HanimeComponent: Context menu - checkbox toggled:", itemData.where, "Checked:", itemData.checked);
                         // Переключаем статус закладки или маркера с помощью Lampa.Favorite.toggle.
                         if(window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function') {
                              Lampa.Favorite.toggle(itemData.where, cardData);
                         } else {
                              console.warn("HanimeComponent: Lampa.Favorite or toggle method not available for onCheck.");
                         }

                         // Находим объект HanimeCard, соответствующий выбранному DOM-элементу карточки, и обновляем его иконки/маркер.
                         // Это необходимо, чтобы изменения (например, добавление в Смотрю) сразу отобразились на карточке.
                          // Ищем по оригинальному DOM-элементу карточки, который был передан в showCardContextMenu.
                         const cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                          if(cardObj && typeof cardObj.update === 'function') { // Используем общий метод update, который вызывает updateFavoriteIcons и др.
                                console.log("HanimeComponent: Calling card.update() after onCheck.");
                              cardObj.update();
                          } else {
                              console.warn("HanimeComponent: Failed to find Card object to update icons after onCheck.");
                          }

                          // Просим Select компонент обновить свое отображение, чтобы состояние чекбокса/маркера обновилось в меню.
                          if(window.Lampa && Lampa.Select && typeof Lampa.Select.update === 'function') {
                               // Lampa.Select.update() обычно перерисовывает пункты меню на основе текущих данных.
                               // Убедитесь, что данные пунктов меню (menu_favorite) актуальны,
                               // или что Lampa.Favorite.check() вызывается внутри onDraw или Lampa.Select.update()
                               // для каждого пункта при перерисовке.
                               // Для надежности можно принудительно обновить данные для текущего пункта itemData.
                               // (Это зависит от реализации Lampa.Select, но часто itemData является ссылкой на объект из items)
                               const updatedStatus = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(cardData) : {};
                               itemData.checked = updatedStatus[itemData.where]; // Обновляем статус в самом объекте пункта меню
                               Lampa.Select.update(); // Просим перерисовать
                          } else {
                               console.warn("HanimeComponent: Lampa.Select or update method not available to redraw menu after onCheck.");
                          }
                     },
                     // Обработка выбора обычного пункта меню (например, переключение маркера статуса, если collect не использовался, или другие действия).
                     // Для маркеров с collect: true, основная логика идет в onCheck.
                     onSelect: (itemData)=>{
                          // Этот обработчик более общий. Для пунктов с collect: true, он может и не вызываться, или вызываться после onCheck.
                          console.log("HanimeComponent: Context menu - item selected:", itemData);

                          // Если есть флаг collect и toggle метод Favorite, это, вероятно, маркер статуса.
                          // В новой Lampa с collect:true это обрабатывается в onCheck.
                          // if(itemData.collect && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function'){
                          //     Lampa.Favorite.toggle(itemData.where, cardData);
                          //      var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                          //     if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                          //      else console.warn("HanimeComponent: Failed to find Card object to update icons after onSelect.");
                          // }

                          // Закрываем меню Select.
                          if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                           // Возвращаем управление Controller-у, который был активен до вызова меню.
                           if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                            console.log("HanimeComponent: Context menu selected and closed.");
                     },
                      // Метод, вызываемый для настройки внешнего вида каждого пункта меню перед его отображением.
                      // 'item' - jQuery объект DOM-элемента пункта меню (<li class="selectbox-item selector">...</li>).
                      // 'elem' - объект данных для этого пункта меню (один объект из массива menu_favorite).
                      onDraw: (item, elem) => {
                           // Проверяем, если пункт меню помечен как "collect" (маркер статуса или закладка)
                           // И у пользователя нет Premium аккаунта.
                           // Это стандартная Lampa логика, которая применяется к элементам с флагом `collect: true`.
                           if (elem.collect && window.Lampa && Lampa.Account && typeof Lampa.Account.hasPremium === 'function' && !Lampa.Account.hasPremium()) {
                                // Если item является "коллекционным" (т.е. может быть добавлен в коллекцию/имеет статус)
                                // И у пользователя НЕ Premium аккаунт...
                                // Получаем HTML-шаблон иконки замка из Lampa.Template. Проверяем его наличие.
                                let lockIconTemplate = (window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.has('icon_lock')) ? Lampa.Template.get('icon_lock') : null;
                                if (lockIconTemplate && window.$ && typeof item.find === 'function' && typeof item.append === 'function') { // Проверяем jQuery и методы
                                     // Создаем jQuery-объект из шаблона замка.
                                     let wrap = $('<div class="selectbox-item__lock"></div>'); // Стандартный класс Lampa для оформления замка в меню.
                                     wrap.append($(lockIconTemplate)); // Добавляем SVG-иконку замка внутрь wrap.
                                     item.find('.selectbox-item__checkbox').remove(); // Удаляем стандартный чекбокс, если есть, т.к. этот пункт становится недоступным.
                                     item.append(wrap); // Добавляем блок с иконкой замка к DOM-элементу пункта меню.

                                     // Переопределяем стандартное поведение hover:enter (нажатие ОК/Enter) для этого пункта.
                                     // Теперь при нажатии ОК/Enter на пункте с замком, не переключается статус, а показывается окно Premium.
                                     item.off('hover:enter').on('hover:enter', () => { // Удаляем старые hover:enter обработчики и добавляем свой.
                                         if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close(); // Закрываем меню Select.
                                          // Проверяем наличие Lampa.Account и метода showCubPremium.
                                          if (window.Lampa && Lampa.Account && typeof Lampa.Account.showCubPremium === 'function') Lampa.Account.showCubPremium(); // Показываем окно Premium.
                                     });
                                     item.addClass('disabled'); // Опционально: добавляем класс 'disabled' для стилизации пункта (например, серым текстом). Нужны соответствующие стили в CSS.
                                } else {
                                     console.warn("Hanime Component: icon_lock template or Template/jQuery/methods missing for Premium item draw.");
                                }
                           }
                      }
                 });
             } else {
                 // Если Lampa.Select недоступен, показываем базовое уведомление.
                 console.warn("Hanime Component: Lampa.Select component not available to show context menu.");
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Компонент меню недоступен.', 5000);
                 }
             }
         };

        // Метод для прокрутки Scroll компонента к заданному DOM-элементу карточки.
        // Вызывается из HanimeCard в ответ на событие 'hover:focus'.
        this.updateScrollToFocus = function(element) {
            // 'element' здесь - это jQuery-объект карточки, на которой установлен фокус.
             //console.log("HanimeComponent: updateScrollToFocus() called with element:", element);
             // Убедимся, что Scroll компонент инициализирован и доступен, и у него есть метод update.
            if (scroll && typeof scroll.update === 'function' && element && typeof element.length === 'number' && element.length > 0) {
                last = element[0]; // Сохраняем ссылку на нативный DOM-элемент сфокусированной карточки для восстановления фокуса при возврате.
                scroll.update(element, true); // Вызываем метод update Scroll-а. element - DOM или jQuery объект элемента, true - плавная прокрутка.
                 //console.log("HanimeComponent: Scroll updated to focused element:", last);
            } else {
                console.warn("HanimeComponent: Scroll instance or update method, or valid element missing to scroll.");
            }
        }

        // Метод для загрузки стрима и метаданных (для воспроизведения).
        // Вызывается из onCardClick.
        this.fetchStreamAndMeta = function (id, meta) {
             var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            // var metaUrl = META_URL_TEMPLATE.replace('{id}', id); // Не используется, т.к. метаданные берем из списка


            // --- ДОБАВЛЕННЫЕ ЛОГИ ДЛЯ ДИАГНОСТИКИ ---
            console.log("HanimeComponent: fetchStreamAndMeta for ID:", id, " - Starting.");
            console.log("HanimeComponent: Requesting Stream URL:", streamUrl);
            console.log("HanimeComponent: Initial Meta data passed:", meta);
            // --- КОНЕЦ ЛОГОВ ---


            // Показываем индикатор загрузки.
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeComponent: Activity loader not available in fetchStreamAndMeta.");

            // Проверяем, доступен ли Network компонент для запросов.
            if (!network || typeof network.native !== 'function') {
                console.error("HanimeComponent: Network component or its native method not available.");
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Сетевой компонент недоступен для загрузки потока.', 5000);
                return;
            }

            // Выполняем сетевой запрос для получения данных потока.
            network.native(streamUrl,
                // Success handler - вызывается при успешном ответе от API
                function (streamData) {
                     // Скрываем лоадер.
                     if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);

                    // --- ДОБАВЛЕННЫЕ ЛОГИ ---
                    console.log("HanimeComponent: Stream data received (raw):", streamData);
                    console.log("HanimeComponent: Meta Data (from list, used for player):", meta);
                    // --- КОНЕЦ ЛОГОВ ---


                    // Проверяем структуру полученных данных потока: должен быть массив 'streams' и он не должен быть пустым.
                    if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                        var streamToPlay = streamData.streams[0]; // Берем первый объект потока из массива.
                        // --- ДОБАВЛЕННЫЕ ЛОГИ ---
                        console.log("HanimeComponent: Selected stream object (first in list):", streamToPlay);
                        // --- КОНЕЦ ЛОГОВ ---

                        var finalStreamUrl = streamToPlay ? streamToPlay.url : null; // Получаем URL потока из объекта.

                        // --- ДОБАВЛЕННЫЕ ЛОГИ ---
                        console.log("HanimeComponent: Extracted raw stream URL:", finalStreamUrl);
                        // --- КОНЕЦ ЛОГОВ ---

                        // Логика проксирования URL с highwinds-cdn.com (для обхода CORS), если PROXY_BASE_URL определен.
                        if(finalStreamUrl && PROXY_BASE_URL) {
                             try {
                                 // Пробуем парсить URL потока, чтобы проверить его хост.
                                 var url = new URL(finalStreamUrl);
                                 // Если хост содержит 'highwinds-cdn.com', оборачиваем URL через прокси.
                                 if (url.hostname && url.hostname.includes('highwinds-cdn.com')) {
                                     finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                                     console.log("HanimeComponent: Stream URL proxied to:", finalStreamUrl);
                                 } else {
                                    console.log("HanimeComponent: Stream URL does not require proxy:", finalStreamUrl);
                                 }
                             } catch (e) {
                                console.error("HanimeComponent: Failed to parse or proxy stream URL:", e);
                                 console.log("HanimeComponent: Using original stream URL due to error:", finalStreamUrl);
                             }
                        } else if (finalStreamUrl) {
                             // Лог, если прокси не применяется (либо не нужен, либо PROXY_BASE_URL не определен).
                             console.log("HanimeComponent: Proxy not needed or PROXY_BASE_URL not defined. Using original URL:", finalStreamUrl);
                        } else {
                            console.error("HanimeComponent: finalStreamUrl is null after extraction.");
                        }


                        // Подготавливаем объект с данными для стандартного плеера Lampa.
                        // Используем метаданные, которые были получены ранее (из списка элементов).
                         // Проверяем, что метаданные доступны и содержат нужные поля.
                        if (!meta) {
                            console.error("HanimeComponent: Meta data is missing for player launch.");
                             if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка данных для плеера.', 5000);
                             return; // Прекращаем выполнение, если метаданные отсутствуют.
                        }

                        var playerObject = {
                            title: meta.name || meta.title || 'Без названия', // Название для плеера.
                            url: finalStreamUrl, // URL потока для воспроизведения (используем финальный, возможно проксированный).
                            poster: meta.poster || meta.background || '', // URL постера для плеера.
                            // Дополнительные поля для плеера Lampa, если они нужны (например, длительность, субтитры).
                            // duration: streamToPlay?.duration, // Если API предоставляет длительность
                            // subtitles: streamToPlay?.subtitles // Если API предоставляет субтитры в нужном формате
                        };
                         console.log("HanimeComponent: Player object prepared:", playerObject);


                        // Проверяем, что у нас есть валидный URL для плеера И доступны все необходимые компоненты Lampa Player.
                        if (playerObject.url && window.Lampa && Lampa.Player && typeof Lampa.Player.play === 'function' && typeof Lampa.Player.playlist === 'function') {
                             console.log("HanimeComponent: Launching player with URL:", playerObject.url);
                             Lampa.Player.play(playerObject); // Запуск воспроизведения с текущим элементом.
                             Lampa.Player.playlist([playerObject]); // Установка плейлиста (для плеера Lampa часто нужен массив).


                             // Добавляем элемент в историю просмотра Lampa.
                             if (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                                    // Формируем объект historyMeta, который Lampa.Favorite ожидает для истории.
                                    // Используем метаданные, полученные из списка каталога.
                                    const historyMeta = {
                                        id: meta.id || '', // Обязательное поле
                                         title: meta.name || meta.title || '', // Обязательное поле
                                         poster: meta.poster || meta.background || '', // URL постера
                                        runtime: meta.runtime, // Если есть в метаданных
                                         year: meta.year || (meta.release_date ? meta.release_date.slice(0,4) : ''), // Если есть год или дата выхода
                                        original_name: meta.original_name || '', // Если есть оригинальное название
                                         type: meta.type || (meta.first_air_date ? 'tv' : 'movie') // Важно для правильного сохранения в истории/избранном Lampa
                                        // Добавьте другие поля из `meta`, которые могут быть полезны для истории Lampa (e.g., genres, seasons, episodes)
                                    };
                                    // Добавляем в коллекцию 'history'. 100 - процент просмотра (начали смотреть).
                                    // Lampa сама будет обновлять прогресс при просмотре.
                                    Lampa.Favorite.add('history', historyMeta, 100);
                                    console.log("HanimeComponent: Added to history.", historyMeta);

                                    // При добавлении в историю, иконки на карточке (например, иконка истории) должны обновиться.
                                     // Обновление иконок на видимых карточках происходит при событии 'visible' или 'hover:focus',
                                     // а также вручную при изменении статуса через контекстное меню.
                                     // Явный вызов update() здесь для *всех* видимых карточек может быть избыточен,
                                     // но если иконка истории не появляется сразу, можно рассмотреть этот вариант.
                                     // В текущей логике это не требуется, т.к. Lampa Favorite может триггерить обновление.

                             } else {
                                  console.warn("HanimeComponent: Lampa.Favorite or add method not available to add to history.");
                             }

                        } else {
                             // Этот блок выполняется, если playerObject.url пустой ИЛИ компонент Lampa.Player недоступен.
                             console.error("HanimeComponent: Cannot launch player. Missing stream URL, Lampa.Player component, or required methods.");
                             // Показываем уведомление об ошибке пользователю.
                             if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                                 const errorMessage = playerObject.url ? 'Компонент плеера недоступен.' : 'Не удалось получить ссылку на поток.';
                                 console.error("HanimeComponent:", errorMessage);
                                 Lampa.Noty.show(errorMessage, 5000);
                             }
                        }

                    } else {
                         // Этот блок выполняется, если в streamData нет массива streams или он пустой.
                         console.warn("HanimeComponent: No streams found in API data or invalid structure for ID:", id, streamData);
                         // Показываем уведомление об отсутствии потоков.
                         if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                             Lampa.Noty.show('Потоки не найдены для этого аниме.', 5000);
                         }
                    }
                },
                // Error handler - вызывается при ошибке сетевого запроса потока
                function (errorStatus, errorText) {
                     if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); // Скрываем лоадер.
                    console.error("HanimeComponent: Error fetching stream for ID:", id, "Status:", errorStatus, "Error:", errorText);
                     // Показываем уведомление об ошибке загрузки потока.
                     if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                         Lampa.Noty.show('Ошибка загрузки потока: ' + (typeof errorText === 'string' ? errorText : errorStatus), 5000);
                     }
                },
                false, // Не кэшировать ответ на запрос потока.
                { dataType: 'json', timeout: 10000 } // Указываем тип данных (JSON) и таймаут (10 секунд).
            );
        };


        // Метод для отображения сообщения о пустом состоянии каталога или ошибке загрузки.
        // Вызывается из fetchCatalog() или build().
        this.empty = function (msg) {
             console.log("HanimeComponent: empty() - Displaying message:", msg);
             // Проверяем, доступен ли стандартный Lampa компонент Empty.
             if (window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function') {
                 var empty = new Lampa.Empty({ message: msg }); // Создаем экземпляр Empty.
                 // Если корневой DOM компонента (html) создан, очищаем его и добавляем DOM Empty компонента.
                 if(html && typeof html.empty === 'function' && typeof html.append === 'function') html.empty().append(empty.render(true));
                 else console.warn("HanimeComponent: Html container not available or its methods missing to show empty state.");

                 // Скрываем индикатор загрузки и делаем активность видимой.
                 if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(false);
                 if(this.activity && typeof this.activity.toggle === 'function') this.activity.toggle();
                 // Переназначаем метод start текущей активности на метод start Empty компонента.
                 // Это гарантирует, что Lampa Controller будет правильно управлять компонентом Empty (например, обработка кнопки Назад).
                 if (typeof empty.start === 'function') {
                     this.start = empty.start;
                     console.log("HanimeComponent: Replaced start method with Lampa.Empty's start.");
                 } else {
                     console.warn("HanimeComponent: Empty component does not have a start method. Using fallback start.");
                      // Fallback start method if Lampa.Empty doesn't provide one
                      this.start = function() {
                           console.log("HanimeComponent: Fallback start() for empty state. Setting minimal Controller.");
                        // Проверяем доступность Lampa.Controller перед использованием.
                          if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                               // Добавляем базовый контроллер только для обработки кнопки "Назад".
                               Lampa.Controller.add('content', { back: this.back.bind(this) }); // Привязываем контекст this.
                               Lampa.Controller.toggle('content'); // Активируем этот контроллер.
                          } else console.warn("HanimeComponent: Lampa.Controller not available for fallback start method.");
                      }.bind(this); // Важно привязать контекст this.
                      console.log("HanimeComponent: Replaced start method with fallback start.");
                 }

                  console.log("HanimeComponent: Displaying empty state via Lampa.Empty.");
             } else {
                  // Fallback на случай, если Lampa.Empty недоступен (менее вероятно после appready).
                  console.warn("HanimeComponent: Lampa.Empty component not available. Using basic text fallback.");
                   // Пытаемся очистить контейнер и добавить просто текст сообщения.
                  if(html && typeof html.empty === 'function' && typeof html.text === 'function') {
                       html.empty().text(msg + ' (Компонент Empty недоступен в Lampa)');
                  } else {
                      console.error("HanimeComponent: Cannot display basic empty message, main HTML container missing.");
                  }

                  // Скрываем лоадер и показываем активность.
                 if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(false);
                 if(this.activity && typeof this.activity.toggle === 'function') this.activity.toggle();

                   // В этом случае, нам нужен свой минимальный метод start, чтобы кнопка Назад работала.
                   this.start = function() {
                        console.log("HanimeComponent: Fallback start() for empty state (no Lampa.Empty). Setting minimal Controller.");
                         // Проверяем доступность Lampa.Controller перед использованием.
                       if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                            // Добавляем базовый контроллер только для обработки кнопки "Назад".
                            Lampa.Controller.add('content', { back: this.back.bind(this) }); // Привязываем контекст this.
                            Lampa.Controller.toggle('content'); // Активируем этот контроллер.
                       } else console.warn("HanimeComponent: Lampa.Controller not available for fallback start method.");
                   }.bind(this); // Важно привязать контекст this.
                    console.log("HanimeComponent: Replaced start method with basic text fallback start.");
             }
             // Нет необходимости в return здесь. Переназначенный this.start будет вызван Lampa позже, если потребуется.
        };

        // Метод создания активности. Вызывается Lampa при первом переходе на эту активность.
        this.create = function (componentObject) {
            console.log("HanimeComponent: create()");

            // Инициализируем Network компонент, если еще не создан.
             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeComponent: Lampa.Reguest initialized in create().");
              } else if (!network) console.warn("HanimeComponent: Network not initialized in create(), Lampa.Reguest missing.");

             // Инициализируем Scroll компонент, если еще не создан.
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                 // Здесь Scroll компонент нужен для ОДНОЙ горизонтальной линии.
                 scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
                  console.log("HanimeComponent: Lampa.Scroll initialized in create().");
             } else if (!scroll) console.warn("HanimeComponent: Scroll not initialized in create(), Lampa.Scroll missing.");


             // Строим основную DOM-структуру компонента (одна items-line).
            this.buildLayout();
            // Запускаем загрузку данных каталога из API.
            this.fetchCatalog(); // fetchCatalog вызовет build() после загрузки данных.

             console.log("HanimeComponent: create() finished. Fetching catalog initiated.");

             // NOTE: Метод create() должен вернуть корневой DOM-элемент компонента.
             // Lampa вставит этот элемент в контейнер активности.
             // render() может быть вызван Lampa перед start() для получения этого элемента.
        };


        // Метод запуска активности. Вызывается Lampa, когда активность становится видимой и должна получить фокус Controller.
        // Происходит при первом открытии и при возврате на активность.
        this.start = function () {
            console.log("HanimeComponent: start()");
             // Проверяем, что текущая активность Lampa - именно эта активность.
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this.activity) {
                console.log("HanimeComponent: start() - Not the currently active activity, skipping.");
                return; // Выходим, если активность не активна.
            }
             console.log("HanimeComponent: start() - Activity is active. Setting up Lampa.Controller.");


            // Проверяем, что у нас есть элементы для отображения.
            // Если fetchCatalog() или build() вызвали empty() из-за ошибки или пустого каталога,
            // метод start() был переназначен. В этом случае, просто выходим из этого "стандартного" start().
             // Проверка rows.length === 0 не совсем корректна здесь, т.к. items - это массив HanimeCard, а не rows.
             // Правильнее проверять items.length или просто полагаться на то, что this.start был переписан empty().
             // Но для простоты и совместимости с предыдущими версиями оставим проверку items.length.
            if (items.length === 0) { // <-- Проверяем количество HanimeCard объектов
                 console.log("HanimeComponent: start() called, but no items available (empty state). Relying on empty handler.");
                 // Если empty() был вызван ранее, он уже переписал this.start.
                 // Мы просто выходим из текущего выполнения этого метода.
                 return; // <-- Важно выйти здесь!
            }


            // Настраиваем Lampa.Controller для управления фокусом и навигацией в этой активности.
            // Используем имя 'content'.
            // Проверяем наличие Controller, Scroll, Navigator и их методов.
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && scroll && typeof scroll.render === 'function' && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function' && window.Navigator && typeof window.Navigator.move === 'function') {
                 Lampa.Controller.add('content', {
                     // Этот метод toggle() вызывается Controller'ом при активации/переключении на него.
                     toggle: function () {
                         console.log("HanimeComponent: Controller toggle() called.");
                         // Указываем Controller-у коллекцию DOM-элементов (с классом .selector) для навигации.
                         // Scroll.render() возвращает контейнер, содержащий все карточки.
                         Lampa.Controller.collectionSet(scroll.render()); // Устанавливаем коллекцию элементов.

                         // Устанавливаем начальный фокус в коллекции.
                         // Controller.collectionFocus попытается сфокусироваться на элементе 'last' (если он был сохранен),
                         // или на первом доступном элементе по умолчанию.
                         // Это вызовет событие 'hover:focus' на сфокусированном элементе, что, в свою очередь, вызовет updateScrollToFocus.
                         Lampa.Controller.collectionFocus(last || false, scroll.render()); // Устанавливаем фокус.

                          console.log("HanimeComponent: Controller collectionSet/Focus called in toggle().");
                     }.bind(this), // Привязываем контекст HanimeComponent

                     // Обработчики нажатия стрелок.
                     left: function () {
                         if (window.Navigator.canmove('left')) window.Navigator.move('left'); // Если возможно движение влево по коллекции
                         else if (window.Lampa.Controller.toggle) Lampa.Controller.toggle('menu'); // Если нет, переключаем на контроллер меню
                     }.bind(this), // Привязываем контекст

                     right: function () {
                         if (window.Navigator.canmove('right')) window.Navigator.move('right'); // Движение вправо по коллекции
                         // Если нет движения вправо, ничего не происходит (остаемся на последнем элементе).
                     }.bind(this),

                     up: function () {
                         // Движение вверх с горизонтальной линии - обычно переключение на контроллер шапки.
                         if (window.Lampa.Controller.toggle) Lampa.Controller.toggle('head');
                     }.bind(this),

                     down: function () {
                         // Движение вниз с горизонтальной линии - обычно нет движения, если это единственная линия.
                         if (window.Navigator.canmove('down')) window.Navigator.move('down'); // Navigator проверит, есть ли элементы ниже.
                     }.bind(this),

                     // Обработчики нажатия OK (Enter) и долгого нажатия.
                     enter: function (element, event) {
                          // Событие Enter на сфокусированном элементе.
                          console.log("HanimeComponent: Enter pressed on element:", element);
                           // Извлекаем данные карточки, которые мы привязали к DOM-элементу.
                          const cardData = $(element).data('cardData');
                          if (cardData) {
                               // Вызываем наш метод обработки клика по карточке.
                               this.onCardClick(cardData);
                          } else {
                              console.error("HanimeComponent: No cardData found on element on Enter press.");
                               if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка данных карточки.');
                          }
                     }.bind(this),

                     long: function (element, event) {
                          // Событие Long Press на сфокусированном элементе.
                          console.log("HanimeComponent: Long press on element:", element);
                           // Извлекаем данные карточки и сам jQuery-элемент.
                          const cardData = $(element).data('cardData');
                          const cardElement = $(element); // Передаем jQuery элемент в метод контекстного меню.
                          if (cardData) {
                               // Вызываем наш метод показа контекстного меню.
                               this.showCardContextMenu(cardElement, cardData);
                          } else {
                              console.error("HanimeComponent: No cardData found on element on Long press.");
                               if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка данных карточки.');
                          }
                     }.bind(this),

                     // Обработчик кнопки "Назад".
                     back: this.back.bind(this) // Привязываем контекст
                 });

                 // Активируем наш Controller 'content'. Это приведет к вызову его метода toggle().
                 Lampa.Controller.toggle('content');
                  console.log("HanimeComponent: Controller 'content' toggled.");

                 // Начальная прокрутка Scroll к первому (или last) элементу произойдет автоматически
                 // через hover:focus -> updateScrollToFocus.

             } else {
                // Fallback, если Lampa.Controller или Scroll недоступны. Пытаемся установить базовый контроллер хотя бы для кнопки "Назад".
                console.error("HanimeComponent: Lampa.Controller or scroll, or required methods not available in start(). Cannot setup main Controller.");
                 // Проверяем доступность Lampa.Controller перед использованием.
                 if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                     console.log("HanimeComponent: Attempting to add basic Controller for Back button.");
                     Lampa.Controller.add('content', { back: this.back.bind(this) }); // Добавляем минимальный контроллер.
                     Lampa.Controller.toggle('content'); // Активируем его.
                 } else console.warn("HanimeComponent: Lampa.Controller unavailable or methods missing, cannot add basic back handler.");
             }
        };

        // Метод вызывается Lampa, когда активность временно приостанавливается (например, при открытии меню, плеера, другой активности).
        // Важно сохранить состояние (последний сфокусированный элемент) для последующего возврата.
        this.pause = function () {
             console.log("HanimeComponent: pause()");
             // Сохраняем ссылку на DOM-элемент, который был в фокусе, для возврата.
             // Проверяем, что Lampa.Controller доступен, что наш контроллер 'content' активен,
             // И ЧТО МЕТОД Controller.item() СУЩЕСТВУЕТ И ЯВЛЯЕТСЯ ФУНКЦИЕЙ перед вызовом.
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') { // <-- ДОБАВЛЕНА ПРОВЕРКА typeof Lampa.Controller.item === 'function'
                 // Получаем текущий сфокусированный DOM-элемент из Controller и сохраняем его в 'last'.
                 // Используем || last, чтобы сохранить предыдущее значение, если item() вернет null (нет сфокусированного элемента).
                 last = Lampa.Controller.item() || last;
                  console.log("HanimeComponent: Activity paused. Saved last focused DOM item:", last);
             } else {
                  console.log("HanimeComponent: Pause called, but content controller not active or Controller.item missing/not a function. Last focus not saved.");
             }
        };

        // Метод вызывается Lampa, когда активность полностью останавливается (перед уничтожением).
        this.stop = function () {
             console.log("HanimeComponent: stop()");
            // В Stop обычно сбрасываются таймауты, интервалы, подписки на глобальные события,
            // которые не чистятся автоматом в методе destroy.
            // В данном случае, большинство чистки происходит в destroy().
        };

        // Метод рендеринга. Вызывается Lampa, когда ей нужен DOM-элемент для отображения этой активности.
        this.render = function () {
             console.log("HanimeComponent: render() called.");
             // Если корневая DOM-структура компонента еще не была создана, создаем ее.
            if (!html) {
                 this.buildLayout(); // buildLayout() создает html и itemsContainer.
                 // fetchCatalog() и build() вызовут empty() или заполнят html асинхронно.
                 // render() просто возвращает контейнер.
                 console.log("HanimeComponent: buildLayout called during render(). HTML layout created.");
            } else {
                 console.log("HanimeComponent: render() called. Returning existing HTML layout.");
            }
            return html; // Возвращаем jQuery-объект корневого DOM-элемента (items-line).
        };

        // Метод уничтожения. Вызывается Lampa, когда активность закрывается навсегда.
        // Освобождает все ресурсы, чтобы избежать утечек памяти.
        this.destroy = function () {
            console.log("HanimeComponent: destroy() called.");
             // Отменяем все незавершенные сетевые запросы Network компонента.
            if(network && typeof network.clear === 'function') network.clear(); network = null; // Обнуляем ссылку.

            // Уничтожаем все экземпляры HanimeCard в массиве 'items'.
            // Lampa.Arrays.destroy вызывает метод destroy() для каждого объекта в массиве.
             if (items && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') {
                 Lampa.Arrays.destroy(items); // Вызывает destroy() на каждом HanimeCard объекте.
                 console.log("HanimeComponent: Destroyed items array.");
             }
            items = null; // Обнуляем ссылку на массив.

            // Уничтожаем экземпляр Lampa.Scroll. Это удалит DOM Scroll и отпишется от событий.
             if (scroll && typeof scroll.destroy === 'function') {
                 scroll.destroy();
                 console.log("HanimeComponent: Destroyed scroll instance.");
             }
             scroll = null;

            // Удаляем корневой DOM-элемент компонента (items-line) из документа.
             if (html && typeof html.remove === 'function') {
                 html.remove();
                 console.log("HanimeComponent: Removed html element from DOM.");
             }
            html = null; itemsContainer = null; // Обнуляем ссылки на DOM-элементы.
            last = null; // Сбрасываем ссылку на последний сфокусированный элемент.


            // Очищаем и удаляем регистрацию нашего Controller из Lampa Controller Manager.
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function') {
                 // Если наш контроллер ('content') сейчас активен, сначала очищаем его коллекцию элементов
                 // и можем попытаться вернуться к базовому контроллеру ('app'), прежде чем удалить наш.
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.collectionSet === 'function') {
                      Lampa.Controller.collectionSet([]); // Снимаем все элементы с контроля.
                      // Опционально: Lampa.Controller.toggle('app'); // Переключаемся на основной контроллер.
                       console.log("HanimeComponent: Controller collection set empty.");
                 }
                 // Удаляем нашу регистрацию контроллера по имени.
                 Lampa.Controller.remove('content');
                  console.log("HanimeComponent: Controller 'content' removed.");
            } else console.warn("HanimeComponent: Lampa.Controller not available or remove method missing for cleanup in destroy.");

            console.log("HanimeComponent: destroy() finished. All resources released.");
        };

        // Обработчик кнопки "Назад".
        // Привязывается к Controller в методе start().
        this.back = function () {
             console.log("HanimeComponent: back() called. Attempting Activity.backward().");
             // Используем стандартный метод Lampa.Activity для навигации назад по стеку активностей.
             // Проверяем наличие Lampa.Activity и метода backward.
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') {
                 Lampa.Activity.backward();
             } else console.warn("HanimeComponent: Lampa.Activity or backward method missing for navigation.");
        };
    }


    // --- Глобальная функция инициализации плагина. Является входной точкой после загрузки файла. ---
    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() invoked.");

        // Проверяем глобальный флаг плагина, чтобы избежать двойной инициализации.
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: global plugin_hanime_catalog_ready flag already set. Skipping initialization.");
             return; // Если флаг уже установлен, выходим.
         }


        // --- Функция, содержащая основную логику инициализации, зависящую от готовой Lampa. ---
        // Эта функция будет вызвана только после того, как Lampa просигнализирует о готовности ('appready').
        function initializeLampaDependencies() {
             console.log("Hanime Plugin: initializeLampaDependencies() called (Lampa appready or fallback delay completed).");

             // В этом месте мы ожидаем, что все основные компоненты Lampa доступны.
             // Выполняем строгую проверку наличия критических компонентов перед продолжением.
             // Navigator также нужен для Controller навигации.
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Template || typeof Lampa.Template !== 'object' || !Lampa.Component || typeof Lampa.Component !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Scroll || typeof Lampa.Scroll !== 'function' || !Lampa.Reguest || typeof Lampa.Reguest !== 'function' || !window.Navigator || typeof window.Navigator.move !== 'function') {
                  console.error("Hanime Plugin: CRITICAL: Required Lampa components (Lampa, Template, Component, Activity, Controller, jQuery, Scroll, Reguest, Navigator) are not available after waiting for appready. Initialization failed. Please check Lampa version and installation.");
                  // Показываем сообщение об ошибке пользователю, если компонент Noty доступен.
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина Hanime: Компоненты Lampa недоступны. Обновите Lampa или плагин.', 15000); // Более длительное уведомление
                  }
                  return; // Прерываем дальнейшую инициализацию.
             }
             console.log("Hanime Plugin: All critical Lampa components checked OK. Continuing initialization.");


             // --- Устанавливаем глобальный флаг ПЛАГИНА ПОСЛЕ ТОГО, КАК УБЕДИЛИСЬ, ЧТО LAMPA ГОТОВА И КОМПОНЕНТЫ ЕСТЬ. ---
              if (!window.plugin_hanime_catalog_ready) { // Повторная проверка на всякий случай.
                 window.plugin_hanime_catalog_ready = true;
                 console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag set.");
              } else {
                   console.warn("Hanime Plugin: Plugin flag was unexpectedly set before initialization. Possible double load issue?");
                   return; // Если флаг каким-то образом уже установлен, прерываем инициализацию.
              }


             // --- 1. Определение СТАНДАРТНЫХ ВНУТРЕННИХ шаблонов Lampa (как fallback). ---
             // Используем Lampa.Template.add напрямую. НЕ НУЖНЫ ПРОВЕРКИ Lampa.Template.has().
             // Проверяем наличие add метода перед использованием.
             console.log("Hanime Plugin: Adding standard template fallbacks using Lampa.Template.add...");
             if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                 Lampa.Template.add('card_vote_temp', '<div class="card__vote"></div>'); // Только базовый div
                 Lampa.Template.add('card_quality_temp', '<div class="card__quality"><div></div></div>'); // div с внутренним div
                 Lampa.Template.add('card_year_temp', '<div class="card__age"></div>'); // Только базовый div
                 Lampa.Template.add('card_type_temp', '<div class="card__type"></div>'); // Только базовый div
                 Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
                  console.log("Hanime Plugin: Standard template fallbacks added successfully.");
             } else {
                 console.error("Hanime Plugin: Lampa.Template.add method not available. Cannot add template fallbacks.");
             }


             // --- 2. Определение ВАШЕГО основного шаблона карточки 'hanime-card'. ---
             // Этот шаблон ДОЛЖЕН ИСПОЛЬЗОВАТЬ ТОЛЬКО СТАНДАРТНЫЕ КЛАССЫ и простую структуру.
             // Динамическое заполнение деталей (рейтинг, качество и т.п.) будет в HanimeCard.addDetails().
             console.log("Hanime Plugin: Adding hanime-card template...");
             if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                 Lampa.Template.add('hanime-card', `
                     <div class="hanime-card card selector layer--visible layer--render">
                         <div class="card__view"> <!-- Стандартный card__view. addDetails() добавит внутрь card__vote, card__quality, card__type -->
                             <img src="./img/img_load.svg" class="card__img" alt="{title}" loading="lazy" /> <!-- Стандартный card__img -->
                             <div class="card__icons"> <!-- Стандартный card__icons -->
                                 <div class="card__icons-inner"></div> <!-- Стандартный card__icons-inner -->
                             </div>
                             <!-- ПЛЕЙСХОЛДЕРЫ для динамического добавления деталей (рейтинг, качество, тип) -->
                              <!-- Не используем Lampa.Template.get() здесь напрямую в шаблоне для этих деталей! -->
                              <!-- Они будут добавлены через addDetails(). -->
                             <!-- Просто включаем эти div с их классами в шаблон -->
                             <div class="card__vote"></div>
                             <div class="card__quality"><div></div></div>
                             <div class="card__type"></div>
                             <!-- Маркер состояния будет добавлен динамически в updateFavoriteIcons -->
                             <!-- <div class="card__marker"><span></span></div> -->
                         </div>
                         <div class="card__title">{title}</div> <!-- Стандартный card__title -->
                         <div class="card__age"></div> <!-- Стандартный card__age -->
                     </div>
                 `);
                  console.log("Hanime Plugin: HanimeCard template added successfully.");
             } else {
                  console.error("Hanime Plugin: Lampa.Template.add method not available. Cannot add hanime-card template.");
             }


             // --- 3. CSS Стили ---
             // УДАЛЕН ВЕСЬ БЛОК ВАШИХ КАТОМНЫХ СТИЛЕЙ.
             // Плагин будет полагаться ТОЛЬКО на стандартные стили Lampa для классов,
             // которые используются в DOM (card, selector, items-line, card__view, card__img и т.п.).
             console.log("Hanime Plugin: Custom CSS block REMOVED as requested. Relying on standard Lampa styles.");


             // --- 4. Регистрируем ВАШ основной компонент каталога. ---
             // Делаем это после того, как все шаблоны (включая базовый hanime-card) определены.
             console.log("Hanime Plugin: Registering HanimeComponent...");
             if (window.Lampa && Lampa.Component && typeof Lampa.Component.add === 'function') {
                 Lampa.Component.add('hanime_catalog', HanimeComponent);
                 console.log("Hanime Plugin: Component 'hanime_catalog' registered successfully.");
             } else {
                 console.error("Hanime Plugin: Lampa.Component.add method not available. Cannot register component.");
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина: Не удалось зарегистрировать компонент.', 5000);
                  }
             }


             // --- 5. Добавляем пункт меню в основное меню Lampa. ---
             // Вызывается из initializeLampaDependencies().
             console.log("Hanime Plugin: Calling addMenuItem()...");
             addMenuItem();
              console.log("Hanime Plugin: addMenuItem() called from initializeLampaDependencies.");

              console.log("Hanime Plugin: initializeLampaDependencies() finished.");
        }


        // --- Функция добавления пункта меню. ---
        // Вызывается из initializeLampaDependencies().
        function addMenuItem() {
             console.log("Hanime Plugin: addMenuItem() called.");

             // Выполняем проверки наличия необходимых компонентов Lampa и DOM структуры перед добавлением меню.
             // Убедимся, что компонент Lampa Activity и Controller доступны для управления активностями/навигацией.
             // Убедимся, что jQuery доступен для манипуляций с DOM.
             // Убедимся, что Lampa Component Manager доступен и может проверить регистрацию нашего компонента.
             // Убедимся, что стандартная DOM структура меню Lampa ('.menu .menu__list') существует.
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Component || typeof Lampa.Component !== 'object' || typeof Lampa.Component.get !== 'function') {
                  console.warn("Hanime Plugin: addMenuItem cannot proceed. Missing Lampa core components, jQuery, or Component.get.");
                  return;
             }
             // Проверяем, что DOM меню доступен.
             var menuList = $('.menu .menu__list').eq(0);
             if (!menuList.length) {
                 console.warn("Hanime Plugin: addMenuItem cannot proceed. Lampa menu DOM structure ('.menu .menu__list') not found.");
                 return;
             }

             console.log("Hanime Plugin: addMenuItem checks passed.");


             // Проверяем, что наш КОМПОНЕНТ 'hanime_catalog' был успешно зарегистрирован в Lampa Component Manager.
             // Это ключевая проверка, прежде чем мы будем ссылаться на имя компонента 'hanime_catalog' при Activity.push.
             var ourComponentRegistered = Lampa.Component.get('hanime_catalog');
             if (!ourComponentRegistered) {
                 console.warn("Hanime Plugin: addMenuItem skipping - Component 'hanime_catalog' is not found/registered in Lampa.Component.");
                  // Можно попытаться добавить меню снова с задержкой, надеясь, что регистрация завершится, но лучше убедиться,
                 // что Component.add был вызван перед addMenuItem.
                 return; // Выходим, если наш компонент не найден.
             }
             console.log("Hanime Plugin: Component 'hanime_catalog' confirmed registered.");


             // Проверка на случай дублирования пункта меню по тексту.
             const menuItemText = 'Hanime Catalog'; // Текст нашего пункта меню
             if (menuList.find('.menu__text:contains("' + menuItemText + '")').length > 0) {
                 console.log("Hanime Plugin: Menu item with text 'Hanime Catalog' already exists in DOM. Skipping addMenuItem.");
                 return;
             }
             console.log("Hanime Plugin: Adding menu item DOM element to Lampa menu.");

             // Создаем DOM-элемент пункта меню, используя СТАНДАРТНЫЕ классы Lampa и ОБЯЗАТЕЛЬНЫЙ класс 'selector'.
             // Классы (menu__item, menu__ico, menu__text) уже имеют стандартные стили Lampa.
            var menu_item = $(`
                <li class="menu__item selector"> <!-- menu__item и selector - стандартные классы для навигации меню -->
                    <div class="menu__ico"> <!-- Стандартный класс контейнера иконки -->
                        <!-- Иконка в формате SVG -->
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">${menuItemText}</div> <!-- Текст пункта меню -->
                </li>
            `);

            // Привязываем обработчик стандартного события Lampa 'hover:enter'.
            // Это событие генерируется Lampa Controller при выборе пункта меню пультом (кнопка OK).
             // Проверяем, что on() метод доступен на jQuery объекте.
            if (typeof menu_item.on === 'function') {
                menu_item.on('hover:enter', function () {
                     console.log("Hanime Plugin: Menu item 'Hanime Catalog' activated via 'hover:enter'. Pushing activity.");
                     // Запускаем новую активность Lampa с нашим зарегистрированным компонентом.
                     // Проверяем, что Lampa.Activity доступен и метод push есть.
                     if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.push === 'function') {
                         Lampa.Activity.push({
                             url: '', // Опциональный URL для роутинга/истории.
                             title: menuItemText, // Заголовок, который отобразится в шапке новой активности.
                             component: 'hanime_catalog', // Имя нашего ЗАРЕГИСТРИРОВАННОГО компонента для запуска.
                             page: 1 // Стартовый номер страницы (для пагинации в компоненте).
                         });
                          console.log("Hanime Plugin: Lampa.Activity.push called.");
                     } else {
                          console.warn("Hanime Plugin: Lampa.Activity or push method unavailable to launch activity.");
                         if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Не удалось запустить активность.');
                     }
                });
                console.log("Hanime Plugin: 'hover:enter' event listener attached to menu item.");
            } else {
                console.warn("Hanime Plugin: jQuery on() method not available for menu item. Cannot attach event listener.");
            }


            // Находим стандартный DOM-элемент списка меню Lampa (первый элемент '.menu .menu__list')
            // и добавляем наш пункт в конец списка.
             // Проверка уже была в начале функции, но повторяем перед использованием на всякий случай.
             if (menuList.length > 0) {
                 menuList.append(menu_item); // Добавляем DOM-элемент пункта меню.
                 console.log("Hanime Plugin: Menu item DOM element successfully added to Lampa menu list.");
             } else {
                 // Этот else должен сработать только если menuList внезапно пропал после проверки в начале.
                 console.error("Hanime Plugin: addMenuItem failed during append: Lampa menu list DOM element ('.menu .menu__list') not found anymore.");
             }
             console.log("Hanime Plugin: addMenuItem finished.");
        }


        // --- ТОЧКА ВХОДА СКРИПТА ПЛАГИНА: Логика ожидания готовности LAMPA. ---
        console.log("Hanime Plugin: startPlugin() invoked. Setting up Lampa ready listener.");

         // Устанавливаем глобальный флаг, чтобы предотвратить двойную инициализацию ПЕРЕД ожиданием.
         // Это базовый механизм. Надежная инициализация логики зависит от initializeLampaDependencies.
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: global plugin_hanime_catalog_ready flag already set. Skipping entire startPlugin execution to prevent double init.");
             return; // Если флаг уже установлен, выходим.
         }
          // Мы УСТАНОВИМ флаг window.plugin_hanime_catalog_ready внутри initializeLampaDependencies,
          // после того как убедимся, что Lampa готова.

         // Проверяем, доступен ли стандартный Listener Lampa для подписки на событие готовности 'app'.
         if (window.Lampa && typeof window.Lampa !== 'object' || !Lampa.Listener || typeof Lampa.Listener !== 'object' || typeof Lampa.Listener.follow !== 'function') {
             // Fallback: Если Listener недоступен или его API странное, проверяем флаг appready напрямую.
              console.warn("Hanime Plugin: Lampa or Lampa.Listener not available or methods missing. Checking appready flag directly or scheduling delayed start as fallback.");

              if (window.appready && typeof window.appready === 'boolean' && window.appready) {
                  // Fallback A: Если appready флаг уже установлен (быстрая загрузка).
                  console.log("Hanime Plugin: Lampa 'appready' flag found. Calling initializeLampaDependencies directly as fallback.");
                  initializeLampaDependencies(); // Вызываем инициализацию сразу.
              } else {
                   // Fallback B: Если ни Listener, ни appready не доступны сразу.
                   console.error("Hanime Plugin: Neither Lampa Listener nor 'appready' flag available immediately. Cannot reliably wait. Attempting delayed initialization as a HIGHLY UNRELIABLE fallback.");
                   // Попытка инициализировать через небольшую задержку. Очень ненадежный вариант.
                   // Если Lampa все еще не будет готова через 500мс, инициализация провалится с ошибками.
                  setTimeout(initializeLampaDependencies, 500); // Настраиваемая задержка (можно увеличить).
                  console.log("Hanime Plugin: Delayed initialization fallback scheduled.");
              }

         } else {
             // Ожидание готовности Lampa через стандартный Listener (предпочтительный способ).
             console.log("Hanime Plugin: Lampa Listener available. Subscribing to 'app:ready' event.");
             Lampa.Listener.follow('app', function (e) {
                 // Обработчик события 'app'. Проверяем, что тип события - 'ready'.
                 if (e.type === 'ready') {
                     console.log("Hanime Plugin: Lampa 'appready' event received. Calling initializeLampaDependencies.");
                     // Когда Lampa полностью готова ('appready'), вызываем нашу основную функцию инициализации плагина.
                     initializeLampaDependencies();
                 }
             });
              console.log("Hanime Plugin: Subscribed to Lampa 'app:ready' event.");
         }

         console.log("Hanime Plugin: startPlugin() finished its initial execution (setup listener or fallback).");
    }

    // Вызываем главную функцию старта плагина, чтобы начать процесс.
    startPlugin();

})();
