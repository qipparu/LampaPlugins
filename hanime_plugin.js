(function () {
    'use strict';

    // --- HanimeCard компонента ---
    // Этот компонент создает и управляет DOM-элементом ОДНОЙ карточки, используя стандартные классы Lampa.
    // Он делегирует логику взаимодействия (клик, меню) родительскому компоненту (HanimeComponent).
    function HanimeCard(data, componentRef) {
        // Обрабатываем входящие данные API, чтобы подготовить их для использования в шаблоне и логике.
        // Адаптируйте имена полей (data.name, data.poster и т.д.) под реальную структуру от вашего API.
        var processedData = {
            id: data.id, // Уникальный ID элемента
            title: data.name || data.title || 'Без названия', // Заголовок (используем name или title, если есть)
            poster_path: data.poster || data.img, // Путь к изображению постера
            vote_average: data.vote_average || data.vote || null, // Числовой рейтинг (например, из TMDb)
            quality: data.quality || data.release_quality || null, // Строка качества (например, "4K", "HD")
            release_year: ((data.year || data.release_date || '') + '').slice(0, 4), // Год релиза (обрезаем до 4 символов)
            type: data.first_air_date ? 'tv' : 'movie', // Определяем тип: сериал (tv) если есть дата первого эпизода, иначе фильм (movie)
            original_name: data.original_name // Оригинальное название (для истории и т.п.)
        };

        // Получаем HTML-строку для DOM-элемента карточки из нашего шаблона 'hanime-card'.
        // Плейсхолдеры {key} будут заменены соответствующими значениями из processedData.
        // В шаблоне будут использоваться ТОЛЬКО стандартные классы Lampa.
        var cardTemplate = Lampa.Template.get('hanime-card', {
            // Передаем обработанные данные в шаблон:
            img: processedData.poster_path, // URL изображения
            title: processedData.title, // Заголовок
            // Передаем значения для внутренних блоков (рейтинг, качество, год, тип).
            // Шаблон hanime-card должен быть построен так, чтобы отображать эти данные в соответствующих стандартных местах (card__vote, card__quality и т.д.).
            vote: processedData.vote_average > 0 ? parseFloat(processedData.vote_average).toFixed(1) : '', // Форматированный рейтинг (или пустая строка, если нет/ноль)
            quality: processedData.quality, // Строка качества
            year: processedData.release_year !== '0000' ? processedData.release_year : '', // Год (если валидный, иначе пустая строка)
            type: processedData.type // Тип ('tv' или 'movie')
        });

        var cardElement = $(cardTemplate); // Создаем jQuery-объект из полученной HTML-строки. Это наш корневой DOM-элемент для этой карточки.


        // --- Методы экземпляра HanimeCard ---

        // Метод добавления иконки состояния (закладки, история).
        // Использует стандартные Lampa классы для иконок.
        this.addicon = function(name) {
            // Находим стандартный контейнер для иконок внутри карточки.
            var iconsContainer = cardElement.find('.card__icons-inner');
            if (iconsContainer.length) { // Если контейнер найден...
                var icon = document.createElement('div'); // Создаем новый DOM-элемент для иконки.
                icon.classList.add('card__icon'); // Добавляем базовый класс иконки Lampa.
                icon.classList.add('icon--'+name); // Добавляем специфичный класс для типа иконки (например, icon--book, icon--history). Стиль самой иконки определяется в основном CSS Lampa.
                iconsContainer.append(icon); // Добавляем иконку в контейнер.
            } else {
                console.warn("HanimeCard: Could not find .card__icons-inner to add icon:", name, "for", processedData.title);
            }
        }

        // Метод обновления иконок закладок и маркера состояния.
        // Использует стандартные Lampa классы для маркеров состояния (.card__marker, card__marker--type).
        this.updateFavoriteIcons = function() {
             //console.log("HanimeCard: updateFavoriteIcons() for", processedData.title);
             // Сначала очищаем все предыдущие иконки и маркеры на карточке.
            cardElement.find('.card__icons-inner').empty(); // Удаляем все иконки из их контейнера.
            cardElement.find('.card__marker').remove(); // Удаляем DOM-элемент маркера состояния, если он есть.

            // Получаем текущий статус закладок и маркеров состояния для этого элемента с помощью Lampa.Favorite.
            // Проверяем, доступен ли компонент Lampa.Favorite и его метод check.
             var status = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(processedData) : {};
             if(Object.keys(status).length === 0 && (window.Lampa && !Lampa.Favorite)) console.warn("HanimeCard: Lampa.Favorite not available to check status for", processedData.title);
             else if (Object.keys(status).length === 0) console.warn("HanimeCard: Failed to get favorite status for", processedData.title, ". Status object empty.");


            // Добавляем стандартные иконки (в .card__icons-inner) на основе полученного статуса закладки.
            if (status.book) this.addicon('book');     // Если "Запланировано" (bookmarked).
            if (status.like) this.addicon('like');     // Если "Нравится" (liked).
            if (status.wath) this.addicon('wath');     // Если "Просматриваю" (watching).
             // Проверяем статус просмотра (если элемент просмотрен или есть запись в истории просмотра Lampa).
            if (status.history || (window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched === 'function' && Lampa.Timeline.watched(processedData))) this.addicon('history'); // Иконка "История просмотров" или "Просмотрено".

            // Логика отображения текстового маркера состояния (.card__marker), который появляется над постером.
            // Например, "Смотрю", "Просмотрено", "Запланировано", "Брошено", "Продолжаю смотреть".
             var marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown']; // Стандартные типы маркеров Lampa.
             var activeMarker = marks.find(m => status[m]); // Ищем первый активный маркер в списке по статусу.

             if (activeMarker) { // Если для элемента определен активный маркер состояния...
                 // Создаем или находим DOM-элемент маркера.
                 var markerElement = cardElement.find('.card__marker');
                 if (!markerElement.length) { // Если элемента маркера еще нет в DOM карточки, создаем его.
                     // Создаем новый DOM-элемент маркера со стандартным классом Lampa .card__marker.
                     markerElement = $('<div class="card__marker"><span></span></div>');
                     // Добавляем элемент маркера в область просмотра (.card__view), т.к. он отображается поверх постера.
                     cardElement.find('.card__view').append(markerElement);
                 }
                 // Устанавливаем текст маркера, используя переводчик Lampa (Lampa.Lang).
                 // Проверяем наличие Lampa.Lang и его метода translate перед использованием.
                 markerElement.find('span').text(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? Lampa.Lang.translate('title_' + activeMarker) : activeMarker);
                 // Добавляем класс, специфичный для типа активного маркера (например, card__marker--viewed),
                 // который используется для стилизации маркера в основном CSS Lampa (например, цвет фона).
                 markerElement.removeClass(marks.map(m => 'card__marker--' + m).join(' ')) // Сначала удаляем все классы типов маркеров.
                             .addClass('card__marker--' + activeMarker); // Добавляем класс активного типа.
             } else {
                 // Если нет активного маркера состояния, удаляем его DOM-элемент из карточки.
                 cardElement.find('.card__marker').remove();
             }
        };

        // Метод, вызываемый Lampa (например, Scroll компонентом) когда DOM-элемент этой карточки попадает в видимую область на экране.
        // Используется для отложенной загрузки изображений (lazy loading).
        this.onVisible = function() {
             //console.log("HanimeCard: onVisible() for", processedData.title);
             // Находим стандартный DOM-элемент картинки (.card__img) внутри карточки.
             var imgElement = cardElement.find('.card__img');

             // Проверяем, нужно ли загружать картинку для этого элемента.
             // Это необходимо, если элемент img существует, но его src не установлен или установлен на placeholder img_load.svg.
             if (imgElement.length && (!imgElement.attr('src') || imgElement.attr('src').includes('img_load.svg'))) {
                 var src = processedData.poster_path; // Получаем URL картинки из данных карточки.

                 // Если основной URL картинки отсутствует, используем стандартную заглушку для битых ссылок Lampa.
                 if (!src) src = './img/img_broken.svg';


                 // Используем стандартный механизм загрузки изображений Lampa с кэшированием (Lampa.ImageCache).
                 // Это обеспечивает лучшую производительность, управление памятью и повторное использование картинок.
                 if(window.Lampa && Lampa.ImageCache && typeof Lampa.ImageCache.read === 'function' && typeof Lampa.ImageCache.write === 'function') {
                      // Пытаемся прочитать картинку из кэша по URL.
                      // Lampa.ImageCache.read возвращает true, если картинка найдена в кэше и установлена как src.
                      if(!Lampa.ImageCache.read(imgElement[0], src)) { // Передаем нативный DOM-элемент <img> [0].
                         // Если картинка НЕ НАЙДЕНА в кэше, настраиваем обработчики событий загрузки и ошибки для нативного DOM-элемента <img>.
                          imgElement[0].onload = () => {
                              cardElement.addClass('card--loaded'); // При успешной загрузке добавляем класс 'card--loaded'. Этот класс часто используется в CSS Lampa для эффектов появления (например, плавное изменение прозрачности).
                              Lampa.ImageCache.write(imgElement[0], imgElement[0].src); // Записываем успешно загруженную картинку в кэш для последующего использования.
                              //console.log("HanimeCard: Image loaded and cached:", src);
                          };
                          imgElement[0].onerror = () => {
                               console.error('Hanime Plugin: Image load error:', src);
                               imgElement.attr('src', './img/img_broken.svg'); // Если произошла ошибка загрузки (например, битая ссылка), устанавливаем заглушку.
                               // Можно также уведомить компонент TMDB в Lampa о битой картинке, если он доступен (для статистики TMDB источников).
                               if(window.Lampa && Lampa.Tmdb && typeof Lampa.Tmdb.broken === 'function') Lampa.Tmdb.broken();
                          };
                          // Устанавливаем src изображения. Браузер начнет процесс загрузки.
                          // Если src был пустой, используем заглушку img_broken.svg сразу.
                          imgElement.attr('src', src || './img/img_broken.svg');
                      } else {
                         // Если картинка успешно загружена из кэша (Lampa.ImageCache.read вернула true),
                         // стандартный обработчик onload не сработает. Поэтому нужно вручную добавить класс 'card--loaded', если он используется для стилей.
                         cardElement.addClass('card--loaded');
                         //console.log("HanimeCard: Image loaded from cache:", src);
                      }
                 } else {
                     // Fallback, если Lampa.ImageCache недоступен (менее вероятно после appready, но для надежности).
                     console.warn("Hanime Plugin: Lampa.ImageCache not available. Using basic image loading for", processedData.title);
                     // Простая загрузка изображения без кэширования Lampa.
                      imgElement[0].onload = () => { cardElement.addClass('card--loaded'); console.log("HanimeCard: Image loaded (basic):", src); };
                     imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error (basic):', src); imgElement.attr('src', './img/img_broken.svg'); };
                     imgElement.attr('src', src || './img/img_broken.svg');
                     //console.log("HanimeCard: Basic image processing started for", processedData.title);
                 }
             } else {
                 //console.log("HanimeCard: Image already processed or placeholder is intentional for", processedData.title);
             }


            // Обновляем иконки закладок и маркер состояния при появлении карточки в видимости.
            // Это важно, чтобы статус отображался корректно при прокрутке или возврате к линии.
            this.updateFavoriteIcons();
        }

        // Метод для первоначальной настройки экземпляра HanimeCard после создания ее DOM-элемента.
        // Навешиваются стандартные обработчики событий Lampa (hover:*).
        // Этот метод вызывается только ОДИН раз - при первом вызове render() для этой карточки.
        this.create = function(){
             //console.log("HanimeCard: create() called for", processedData.title);

             // Проверяем, был ли метод create() вызван ранее для этого DOM-элемента.
             // Используем data-атрибут 'created' на jQuery-объекте карточки.
             if (cardElement.data('created')) {
                 //console.log("HanimeCard: create() already called for", processedData.title);
                 return; // Выходим, если уже настроено.
             }
              // Помечаем, что create() вызывается сейчас.
             cardElement.data('created', true);
              //console.log("HanimeCard: create() - First time initialization for", processedData.title);


             // Привязываем стандартные обработчики событий Lampa hover:* к корневому DOM-элементу карточки (jQuery-объекту).
             // Эти события ('hover:focus', 'hover:enter', 'hover:long') генерируются Lampa.Controller при навигации пультом.
             // Мы делегируем их обработку методам родительского компонента (HanimeComponent) через componentRef.

             // 'hover:focus': вызывается Controller, когда элемент получает фокус.
            cardElement.on('hover:focus', function () {
                 //console.log("HanimeCard: Event: hover:focus on", processedData.title);
                 // 1. Сообщаем родительскому компоненту, чтобы он прокрутил скролл к этому элементу.
                 //    Проверяем, что componentRef доступен и метод updateScrollToFocus существует и является функцией.
                 if (componentRef && typeof componentRef.updateScrollToFocus === 'function') {
                      componentRef.updateScrollToFocus(cardElement); // Передаем jQuery-объект текущей карточки.
                 } else { console.warn("HanimeCard: updateScrollToFocus method not available on componentRef."); }
                 // 2. Обновляем состояние карточки (иконки, маркер) при получении фокуса.
                 this.update();
            }.bind(this)); // bind(this) необходим, чтобы `this` внутри обработчика ссылался на экземпляр HanimeCard.

             // 'hover:enter': вызывается Controller, когда на сфокусированном элементе нажимают кнопку OK/Enter.
             cardElement.on('hover:enter', function () {
                //console.log("HanimeCard: Event: hover:enter on", processedData.title);
                // Делегируем обработку клика родительскому компоненту.
                 // Проверяем, что componentRef доступен и метод onCardClick существует и является функцией.
                 if (componentRef && typeof componentRef.onCardClick === 'function') {
                     componentRef.onCardClick(processedData); // Передаем данные карточки для обработки (например, запуска плеера).
                 } else { console.warn("HanimeCard: onCardClick method not available on componentRef."); }
            }.bind(this));

             // 'hover:long': вызывается Controller, когда на сфокусированном элементе выполняют долгое нажатие (например, для контекстного меню).
            cardElement.on('hover:long', function(){
                 //console.log("HanimeCard: Event: hover:long on", processedData.title);
                 // Делегируем показ контекстного меню родительскому компоненту.
                 // Проверяем, что componentRef доступен и метод showCardContextMenu существует и является функцией.
                 if (componentRef && typeof componentRef.showCardContextMenu === 'function') {
                      componentRef.showCardContextMenu(cardElement, processedData); // Передаем jQuery-объект карточки и данные.
                 } else { console.warn("HanimeCard: showCardContextMenu method not available on componentRef."); }
             }.bind(this));


            // Привязываем стандартное событие Lampa 'visible' к НАТИВНОМУ DOM-элементу карточки.
            // Это событие генерируется Lampa (например, Scroll компонентом), когда элемент попадает в видимую область при прокрутке.
            // Нужен нативный DOM-элемент [0] для addEventListener.
             this.card = cardElement[0];
             // Проверяем, что нативный элемент существует и имеет метод addEventListener.
             if (this.card && typeof this.card.addEventListener === 'function') {
                this.card.addEventListener('visible', this.onVisible.bind(this)); // Привязываем наш метод onVisible для загрузки картинки.
                //console.log("HanimeCard: Attached 'visible' event listener to native element.");
             } else {
                 console.warn("HanimeCard: Cannot attach 'visible' event listener, native DOM element missing or addEventListener not a function.");
             }


            // Вызываем начальное обновление состояния карточки (иконки закладок, маркер).
            // Делаем это с минимальной задержкой, чтобы дать DOM время обновиться и присоединенный DOM-элемент стал "измеримым" для некоторых методов (хотя для updateFavoriteIcons это обычно не критично).
             setTimeout(() => {
                  this.update();
             }, 0); // Задержка 0 мс - выполнится асинхронно после текущего скрипта.

             //console.log("HanimeCard: create() finished.");
             // Флаг 'created' установлен выше, перед проверкой.
        }

        // Метод обновления состояния карточки (иконок, маркеров).
        // Может быть вызван вручную (например, при изменении статуса закладки из меню) или автоматически (например, при hover:focus).
        this.update = function(){
             //console.log("HanimeCard: update() called for", processedData.title);
             // Вызываем метод обновления иконок закладок и маркера состояния.
            this.updateFavoriteIcons();
            // Если в Lampa доступен компонент Timeline и его метод watched_status, можно обновить полоску прогресса просмотра.
             // Проверяем наличие Timeline и его метода watched_status перед вызовом.
             // if(window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched_status === 'function') Lampa.Timeline.watched_status(cardElement, processedData);
        }

        // Метод рендеринга экземпляра HanimeCard.
        // Возвращает DOM-элемент карточки для вставки в родительский контейнер.
        // Этот метод вызывается родительским HanimeComponent в его методе build().
        this.render = function(js){
             //console.log("HanimeCard: render() called for", processedData.title);
             // Гарантируем, что метод create() (первоначальная настройка и привязка событий) вызывается ТОЛЬКО ОДИН раз.
             // Проверка data('created') происходит внутри create().
             if (!cardElement.data('created')) {
                 this.create();
             }
            // Возвращаем DOM-элемент: нативный (element[0]) если js === true, иначе jQuery-объект.
            return js ? cardElement[0] : cardElement;
        }

        // Метод уничтожения экземпляра HanimeCard. Вызывается из HanimeComponent.destroy().
        // Освобождает ресурсы, связанные с этой конкретной карточкой.
        this.destroy = function(){
             //console.log("HanimeCard: destroy() called for", processedData.title);
             // Удаляем привязку события 'visible' с нативного DOM-элемента, чтобы избежать утечек памяти.
             if(this.card && typeof this.card.removeEventListener === 'function' && this.onVisible) {
                 this.card.removeEventListener('visible', this.onVisible.bind(this));
                 //console.log("HanimeCard: Removed 'visible' event listener.");
             }

             // Удаляем сам DOM-элемент карточки из документа.
             if(cardElement && typeof cardElement.remove === 'function') {
                 cardElement.remove();
                 //console.log("HanimeCard: Removed DOM element.");
             }
             // Обнуляем ссылки на связанные объекты, чтобы помочь сборщику мусора.
             processedData = null; cardElement = null; this.card = null; componentRef = null;
             //console.log("HanimeCard: destroy() completed.");
        }

        // Важно: create() не вызывается здесь напрямую при определении класса.
        // Он будет вызван при ПЕРВОМ вызове метода render() для экземпляра.
        // Эта логика находится в самом методе render() (`if (!cardElement.data('created')) this.create();`).
    }


    // --- HanimeComponent (основной компонент плагина, отображает одну горизонтальную линию аниме) ---
    // Этот компонент управляет загрузкой данных, созданием карточек HanimeCard, управлением Scroll-ом и Lampa.Controller-ом для навигации.
    function HanimeComponent(componentObject) {
        var network = null; // Для выполнения сетевых запросов (Lampa.Reguest). Инициализируется в create.
        var scroll = null; // Для управления горизонтальной прокруткой списка карточек (Lampa.Scroll). Инициализируется в create.

        var items = []; // Массив объектов-экземпляров HanimeCard (для управления их жизненным циклом).
        var html = null; // Корневой DOM-контейнер компонента (jQuery-объект), имитирующий стандартную структуру Lampa items-line. Инициализируется в buildLayout.
        var itemsContainer = null; // DOM-контейнер (jQuery-объект) для размещения ДОМ-элементов карточек. Находится внутри Scroll. Инициализируется в buildLayout.

        var active = 0; // Индекс текущего сфокусированного элемента в массиве items (не всегда используется явно в этом коде, больше для отслеживания).
        var last = null; // Ссылка на DOM-элемент (нативный или jQuery?) последней сфокусированной карточки. Используется Controller-ом для восстановления фокуса при возврате.

        // --- URL-ы вашего API ---
        // Адаптируйте их под ваши реальные эндпоинты.
        var API_BASE_URL = "https://akidoo.top"; // Пример из скриншота с ошибкой. Используйте реальный BASE_URL вашего API.
        // URL для получения списка последних добавлений.
        var CATALOG_URL = API_BASE_URL + "/api/new_anime?page=1"; // Пример URL каталога из реального API.
        // URL для получения информации о потоке (стриме) по ID элемента.
        var STREAM_URL_TEMPLATE = API_BASE_URL + "/api/anime/{id}/stream"; // Пример URL стрима. Замените {id} на реальный ID.
        // URL для получения подробных метаданных по ID элемента.
        var META_URL_TEMPLATE = API_BASE_URL + "/api/anime/{id}"; // Пример URL метаданных. Замените {id} на реальный ID.
        // Адрес вашего прокси сервера. Используется для обхода CORS, если API отдает ссылки, которые блокируются браузером.
        var PROXY_BASE_URL = "http://77.91.78.5:3000";


        // Метод для построения основной структуры DOM компонента, имитирующей стандартную горизонтальную линию Lampa (items-line).
        // Использует только стандартные классы Lampa. Вызывается в методе create().
        this.buildLayout = function() {
             //console.log("HanimeComponent: buildLayout()");
             // Создаем корневой jQuery-объект компонента.
             // Используем стандартные классы Lampa для контейнера горизонтальной линии.
            html = $(`
                <div class="items-line layer--visible layer--render items-line--type-cards"> <!-- items-line и другие классы Lampa -->
                    <div class="items-line__head"> <!-- Стандартный контейнер для заголовка линии -->
                        <div class="items-line__title">Последние добавленные</div> <!-- Стандартный класс для заголовка -->
                         <!-- Если API поддерживает переход к полной категории или пагинацию, можно добавить кнопку "Еще". -->
                         <!-- Использует стандартные классы items-line__more и selector. -->
                         <!-- <div class="items-line__more selector">Еще</div> -->
                    </div>
                    <div class="items-line__body"> <!-- Стандартный контейнер для содержимого линии (сюда вставится Scroll) -->
                        <!-- Результат scroll.render() будет вставлен сюда в методе build(). -->
                    </div>
                </div>
            `);

            // Создаем контейнер (jQuery-объект), который будет содержать DOM-элементы всех карточек (HanimeCard.render()).
            // Этот контейнер будет передан Scroll-у. Lampa.Scroll обернет его своей структурой (.scroll__content > .scroll__body), и сам добавит класс items-cards.
            // Здесь добавляем класс items-cards заранее, т.к. он используется в CSS Lampa для стилизации самих элементов внутри скролла (например, flexbox свойства).
             itemsContainer = $('<div class="items-cards"></div>');
             //console.log("HanimeComponent: buildLayout completed. Initial DOM structure created.");
        };

        // Метод для загрузки данных каталога из API.
        // Инициализирует сетевой запрос и обрабатывает ответ или ошибку.
        // Вызывается в методе create().
        this.fetchCatalog = function () {
            var _this = this; // Сохраняем ссылку на текущий экземпляр HanimeComponent.
             // Показываем стандартный индикатор загрузки Lampa активности. Проверяем наличие activity и loader.
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeComponent: Activity or loader component not available to show loading.");

             console.log("HanimeComponent: fetchCatalog() - Starting network request to", CATALOG_URL);

             // Инициализируем компонент Lampa.Reguest для сетевых запросов, если он еще не создан.
             // Проверяем наличие Lampa и самого компонента Reguest.
             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  //console.log("HanimeComponent: Lampa.Reguest initialized.");
             }

             // Если сетевой компонент доступен, очищаем все предыдущие (возможно незавершенные) запросы.
             if (network && typeof network.clear === 'function') network.clear();
             else console.warn("HanimeComponent: Network clear method not available.");


             // Выполняем стандартный "native" запрос с помощью Lampa.Reguest.
             // Это основной способ работы с сетью в Lampa.
             if(network && CATALOG_URL){ // Проверяем, что сетевой компонент и URL API доступны.
                network.native(CATALOG_URL, // URL для запроса каталога.
                    function (data) { // Коллбэк: выполняется при успешном получении ответа от API.
                         console.log("HanimeComponent: Catalog data received:", data);
                        // Проверяем формат полученных данных. Ожидаем объект с полем 'metas', которое является массивом.
                        if (data && typeof data === 'object' && Array.isArray(data.metas) && data.metas) {
                             if (data.metas.length > 0) {
                                _this.build(data.metas); // Если массив 'metas' не пустой, переходим к построению UI.
                             } else {
                                _this.empty("Каталог пуст."); // Если массив 'metas' пустой.
                             }
                        } else {
                            // Если ответ API не в ожидаемом формате.
                            _this.empty("Неверный формат данных от API."); // Показываем сообщение об ошибке формата.
                            console.error("HanimeComponent: Invalid data format received from API.", data);
                        }
                    },
                    function (errorStatus, errorText) { // Коллбэк: выполняется при ошибке сетевого запроса.
                        // Показываем сообщение об ошибке загрузки каталога пользователю.
                        _this.empty("Не удалось загрузить каталог. Статус: " + errorStatus);
                        console.error("HanimeComponent: Failed to load catalog.", errorStatus, errorText);
                    },
                    false, // Аргумент 'cache': false отключает кэширование Lampa по этому URL.
                    { dataType: 'json', timeout: 15000 } // Дополнительные опции запроса: ожидаем JSON и устанавливаем таймаут 15 секунд.
                );
             } else {
                 // Если Network компонент или CATALOG_URL недоступны, сообщаем об ошибке инициализации сети.
                 console.error("HanimeComponent: Cannot initiate catalog fetch. Network component or CATALOG_URL is missing.");
                  _this.empty("Не удалось загрузить каталог. Ошибка инициализации сети."); // Показываем ошибку пользователю.
             }
        };

        // Метод для построения DOM-интерфейса на основе списка элементов каталога (result - массив метаданных).
        // Вызывается из fetchCatalog() после успешной загрузки данных.
        this.build = function (result) {
            var _this = this; // Сохраняем ссылку на текущий экземпляр HanimeComponent.
             console.log("HanimeComponent: build() - Starting UI construction with", result.length, "items.");

            // Инициализируем Lampa.Scroll компонент для горизонтальной прокрутки, если он еще не создан.
            // Проверяем наличие Lampa и компонента Scroll перед инициализацией.
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                  // options: mask: true, over: true - стандартные опции для визуальных эффектов скролла Lampa.
                  // step: 250 - величина "шага" прокрутки при нажатии стрелок UP/DOWN, если компонент скролла находится в вертикальном списке других компонентов (актуально, если HanimeComponent является строкой в более крупной категории).
                  // direction: 'horizontal' - КРИТИЧНО, чтобы указать, что это горизонтальный скролл.
                  scroll = new Lampa.Scroll({ mask: true, over: true, step: 250, direction: 'horizontal' });
                  //console.log("HanimeComponent: Lampa.Scroll initialized (horizontal).");
             }

             // Если Scroll компонент инициализирован и доступен, прокручиваем его на самое начало перед добавлением новых элементов.
             // Метод minus() используется для прокрутки к верхнему/левому краю скролла.
             if(scroll && typeof scroll.minus === 'function') scroll.minus();
             else console.warn("HanimeComponent: Scroll or scroll.minus method not available in build(). Cannot reset scroll position.");

             // Убедимся, что контейнер для карточек (itemsContainer), Scroll компонент и основной HTML-контейнер компонента (html) доступны.
             // Также проверяем доступность Lampa.Template.get, который используется в Card.render().
             if (!(itemsContainer && typeof itemsContainer.empty === 'function' && scroll && html && typeof html.find === 'function' && window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function')) {
                  console.error("HanimeComponent: Missing critical dependencies (itemsContainer, scroll, html, Lampa.Template.get) in build(). Aborting UI build.");
                   // Если не удается построить UI из-за отсутствия компонентов/DOM, показываем ошибку/пустое состояние.
                   if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); // Скрываем лоадер.
                  _this.empty("Не удалось построить интерфейс."); // Показываем сообщение об ошибке.
                  return; // Выходим из метода build.
             }


            // Очищаем предыдущее содержимое контейнера для карточек (удаляем старые DOM-элементы).
            itemsContainer.empty();
            items = []; // Очищаем массив JS-объектов HanimeCard.


            // Для каждого элемента метаданных из результата API:
            result.forEach(function (meta) {
                 // 1. Создаем новый экземпляр JS-объекта HanimeCard, передавая данные для этой карточки (meta)
                 //    и ссылку на текущий HanimeComponent (_this) для коллбэков событий.
                var card = new HanimeCard(meta, _this); // new HanimeCard(data, componentRef)

                 // 2. Получаем корневой DOM-элемент (jQuery-объект) этой карточки.
                var cardElement = card.render();

                 // 3. Добавляем DOM-элемент карточки в itemsContainer.
                 itemsContainer.append(cardElement);

                 // 4. Добавляем объект HanimeCard в массив items.
                 //    Этот массив нужен для управления экземплярами HanimeCard (например, для вызова их метода destroy при уничтожении HanimeComponent).
                items.push(card);
            });
             console.log("HanimeComponent: Created and added", items.length, "cards to itemsContainer.");


            // 5. Добавляем itemsContainer (который теперь содержит все DOM-элементы карточек) в Lampa.Scroll компонент.
            //    Lampa.Scroll самостоятельно создает свою внутреннюю DOM-структуру (.scroll__content > .scroll__body) вокруг itemsContainer.
            //    Этот шаг помещает все карточки под управление горизонтального скролла.
            if (typeof scroll.append === 'function') scroll.append(itemsContainer);
            else console.error("HanimeComponent: Scroll append method not available in build.");


            // 6. Вставляем рендер Scroll компонента в items-line__body основного DOM-контейнера компонента (html).
            //    scroll.render() возвращает корневой DOM-элемент Scroll'а.
            //    Передача 'true' в scroll.render(true) очень важна - она заставляет Lampa.Scroll ПЕРЕСЧИТАТЬ свои размеры и положение
            //    после того, как его содержимое (itemsContainer с карточками) было добавлено/обновлено и контейнер скролла добавлен в основной layout.
            if (html && typeof html.find === 'function' && typeof scroll.render === 'function') {
                html.find('.items-line__body').empty().append(scroll.render(true)); // Находим .items-line__body и вставляем Scroll.
                 //console.log("HanimeComponent: Scroll rendered into items-line__body.");
            } else console.error("HanimeComponent: Html find method or scroll.render not available for rendering scroll into layout.");


             // 7. Скрываем индикатор загрузки активности и делаем основной DOM-контейнер компонента (items-line) видимым.
             //    Проверяем наличие activity и ее методов.
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
             if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
             //console.log("HanimeComponent: Build process completed and activity toggled (UI visible).");

             // Настройка Controller для навигации и установка первого фокуса будут выполнены в методе start().
        };

         // Коллбэк метод, который вызывается из экземпляра HanimeCard при клике/выборе элемента (например, кнопкой OK/Enter на пульте).
         this.onCardClick = function(cardData) {
             console.log("HanimeComponent: Card clicked:", cardData.title, "ID:", cardData.id);
             // Делегируем дальнейшую логику методу загрузки потока и метаданных.
            this.fetchStreamAndMeta(cardData.id, cardData);
         }

         // Коллбэк метод, который вызывается из экземпляра HanimeCard при долгом нажатии (например, для показа контекстного меню).
         this.showCardContextMenu = function(cardElement, cardData) {
             console.log("HanimeComponent: showCardContextMenu for", cardData.title, "ID:", cardData.id);
             var _this = this;

             // Получаем имя текущего активного контроллера Lampa.
             // Это необходимо, чтобы вернуть управление этому контроллеру после закрытия меню Select.
             // Проверяем наличие Lampa.Controller и его метода enabled.
             var enabled = (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;
             if(!enabled) console.warn("HanimeComponent: No active Lampa Controller found before showing context menu.");


             // Получаем статус закладок и маркеров для данного элемента с помощью Lampa.Favorite.
             // Этот статус будет использоваться для отображения чекбоксов и пунктов в контекстном меню.
             // Проверяем наличие Lampa.Favorite и его метода check.
             var status  = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(cardData) : {};
              if(Object.keys(status).length === 0 && (window.Lampa && !Lampa.Favorite)) console.warn("HanimeComponent: Lampa.Favorite not available to check status for menu.");
             else if (Object.keys(status).length === 0) console.warn("HanimeComponent: Favorite status is empty for menu:", cardData.title);


             // Формируем массив пунктов для стандартного контекстного меню Lampa (Lampa.Select).
             // Каждый объект в массиве представляет собой один пункт меню.
             // Используем Lampa.Lang для получения переводов текстов пунктов.
             var menu_favorite = [];
             // Проверяем наличие Lampa.Lang перед попыткой перевода.
             var translate = (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate : (text => text); // Заглушка, если переводчик недоступен.

             menu_favorite.push( // Пункты меню для закладок (с чекбоксами).
                 { title: translate('title_book'), where: 'book', checkbox: true, checked: status.book }, // Запланировано
                 { title: translate('title_like'), where: 'like', checkbox: true, checked: status.like }, // Нравится
                 { title: translate('title_wath'), where: 'wath', checkbox: true, checked: status.wath }, // Смотрю
                 { title: translate('menu_history'), where: 'history', checkbox: true, checked: status.history }, // История просмотра
                 { title: translate('settings_cub_status'), separator: true } // Разделитель перед пунктами статуса маркера.
             );
              // Добавьте сюда пункты для стандартных маркеров состояния (Смотрю, Просмотрено, Брошено и т.д.),
              // если API предоставляет соответствующие данные и вы хотите дать пользователю возможность менять этот статус из меню.
              // Эти пункты обычно имеют флаг 'collect: true' и могут требовать Premium ('noenter: !Lampa.Account.hasPremium()').
              // Пример (если бы API и плагин поддерживали эти статусы через Favorite):
              // var marksOptions = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];
              // marksOptions.forEach(mark => {
              //     menu_favorite.push({
              //          title: translate('title_' + mark),
              //          where: mark, // Используется Lampa.Favorite
              //          checked: status[mark], // Если уже отмечен
              //          collect: true, // Это маркер статуса, Lampa Favorite управляет только ОДНИМ таким активным маркером
              //          noenter: (window.Lampa && Lampa.Account && typeof Lampa.Account.hasPremium === 'function') ? !Lampa.Account.hasPremium() : true // Требует Premium, если Account доступен
              //     });
              // });


             // Показываем стандартное контекстное меню Lampa (Lampa.Select).
             // Проверяем, доступен ли Lampa.Select и его метод show.
             if (window.Lampa && Lampa.Select && typeof Lampa.Select.show === 'function') {
                 Lampa.Select.show({
                     title: translate('title_action'), // Заголовок меню.
                     items: menu_favorite, // Сформированный массив пунктов меню.
                     // Обработчик события "Назад" (Esc на клавиатуре или соответствующая кнопка на пульте) в меню Select.
                     onBack: ()=>{
                          console.log("HanimeComponent: Context menu dismissed via Back button.");
                          // Возвращаем управление Controller-у, который был активен до вызова меню Select.
                         // Проверяем, доступен ли Lampa.Controller и было ли имя активного контроллера сохранено.
                         if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function' && enabled) {
                              Lampa.Controller.toggle(enabled); // Переключаемся обратно на сохраненный контроллер.
                              console.log("HanimeComponent: Restored previous controller:", enabled);
                         } else console.warn("HanimeComponent: Cannot restore previous controller, Controller unavailable or 'enabled' state missing.");
                     },
                     // Обработка выбора пункта меню типа "чекбокс" (для закладок book, like, wath, history).
                     onCheck: (item) => { // item - объект пункта меню из массива items, у него есть поле 'where'.
                         console.log("HanimeComponent: Context menu - checkbox checked/unchecked:", item.where);
                         // Переключаем статус закладки с помощью Lampa.Favorite.
                         // Проверяем доступность Lampa.Favorite и его метода toggle.
                         if(window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function') Lampa.Favorite.toggle(item.where, cardData);
                         else console.warn("HanimeComponent: Lampa.Favorite.toggle method not available for onCheck.");
                          // После изменения статуса закладки, обновляем иконки и маркер на карточке.
                         // Находим объект HanimeCard в массиве 'items', соответствующий DOM-элементу выбранной карточки (cardElement).
                         var cardObj = items.find(card => card && typeof card.render === 'function' && card.render(true) === cardElement[0]);
                          if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons(); // Вызываем метод обновления иконок этой карточки.
                          else console.warn("HanimeComponent: Could not find HanimeCard object to update icons after onCheck.");
                     },
                     // Обработка выбора обычного пункта меню (например, для переключения маркера состояния - look, viewed, etc.).
                     onSelect: (item) => { // item - объект пункта меню из массива items, у него может быть флаг 'collect'.
                          console.log("HanimeComponent: Context menu - item selected:", item.title, "Where:", item.where);
                          // Если выбранный пункт помечен как "collection" ('collect: true'),
                          // это означает, что он управляет статусом маркера состояния.
                          if(item.collect && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function'){
                              Lampa.Favorite.toggle(item.where, cardData); // Переключаем статус маркера состояния.
                               // Обновляем иконки закладок и маркер на карточке.
                               var cardObj = items.find(card => card && typeof card.render === 'function' && card.render(true) === cardElement[0]);
                              if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                               else console.warn("HanimeComponent: Could not find HanimeCard object to update icons after onSelect (collect).");
                          }
                           // После выбора любого пункта (кроме, возможно, чекбокса), закрываем меню Select.
                          if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                           // Возвращаем управление Controller-у.
                           if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function' && enabled) {
                               Lampa.Controller.toggle(enabled);
                                console.log("HanimeComponent: Context menu selected and closed. Restored controller:", enabled);
                           } else console.warn("HanimeComponent: Cannot restore controller after onSelect, Controller unavailable or 'enabled' state missing.");
                     },
                      // Метод для настройки внешнего вида каждого пункта меню перед его отображением.
                      // Используется, например, для добавления иконки замка к пунктам, требующим Premium подписку.
                      onDraw: (itemElement, itemData) => { // itemElement - jQuery-объект DOM пункта меню, itemData - объект пункта меню.
                           // Проверяем, если пункт меню помечен как "collection" (статус маркера) И
                           // у пользователя НЕТ активной Premium подписки Lampa.
                           if (itemData.collect && window.Lampa && Lampa.Account && typeof Lampa.Account.hasPremium === 'function' && !Lampa.Account.hasPremium()) {
                                // Получаем HTML-шаблон иконки замка из Lampa.Template.
                                // Проверяем, что Lampa.Template доступен, его метод get есть и шаблон icon_lock был добавлен ранее.
                                let lockIconTemplate = (window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.has('icon_lock')) ? Lampa.Template.get('icon_lock', {}, true) : null; // Получаем сырую HTML строку
                                if (lockIconTemplate) {
                                     // Если шаблон замка найден, создаем его DOM-элемент.
                                     let wrap = $('<div class="selectbox-item__lock"></div>'); // Стандартный класс Lampa для оформления замка в Select.
                                     wrap.append($(lockIconTemplate)); // Преобразуем HTML строку замка в jQuery-объект и добавляем в контейнер.
                                     itemElement.find('.selectbox-item__checkbox').remove(); // Удаляем стандартный чекбокс (т.к. он заменяется замком).
                                     itemElement.append(wrap); // Добавляем блок с иконкой замка к DOM-элементу пункта меню.

                                     // Переопределяем стандартное действие (hover:enter) для этого пункта меню.
                                     // Теперь при нажатии OK/Enter на этом пункте, будет показано окно с информацией о Premium.
                                     itemElement.off('hover:enter').on('hover:enter', () => { // Сначала удаляем все старые hover:enter обработчики, затем добавляем свой.
                                         if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close(); // Закрываем контекстное меню.
                                          // Показываем окно с информацией о Premium. Проверяем доступность Lampa.Account и его метода showCubPremium.
                                          if (window.Lampa && Lampa.Account && typeof Lampa.Account.showCubPremium === 'function') Lampa.Account.showCubPremium();
                                          else console.warn("Hanime Component: Lampa.Account or showCubPremium missing for Premium menu action.");
                                     });
                                } else {
                                     console.warn("Hanime Component: icon_lock template, Template.has/get, or raw HTML option missing for Premium item draw.");
                                }
                           }
                      }
                 });
             } else {
                 // Если компонент Lampa.Select недоступен, показываем базовое уведомление.
                 console.warn("Hanime Component: Lampa.Select component not available to show context menu.");
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Компонент меню недоступен.', 5000);
                 else console.warn("Hanime Component: Lampa.Noty not available to show menu unavailable message.");
             }
         };

        // Коллбэк метод, который вызывается из экземпляра HanimeCard при получении фокуса (например, от Lampa.Controller).
        // Этот метод отвечает за прокрутку Scroll компонента к сфокусированной карточке.
        this.updateScrollToFocus = function(element) {
            // 'element' здесь - это jQuery-объект DOM-элемента карточки, на которой Controller установил фокус.
             //console.log("HanimeComponent: updateScrollToFocus() called with element:", element);

             // Убеждаемся, что Lampa.Scroll компонент инициализирован и доступен для обновления.
            if (scroll && typeof scroll.update === 'function') {
                // Сохраняем ссылку на нативный DOM-элемент сфокусированной карточки в переменную 'last'.
                // Это позволяет Controller-у восстановить фокус на этом элементе при последующем возврате в эту активность.
                last = element[0]; // jQuery-объект element, [0] возвращает нативный DOM-элемент.
                // Вызываем метод update Scroll-а для прокрутки к заданному элементу.
                // Первый аргумент - DOM-элемент или jQuery-объект элемента для прокрутки.
                // Второй аргумент (true) - указывает на плавную прокрутку.
                scroll.update(element, true);
                 //console.log("HanimeComponent: Scroll updated to focused element:", last);
            } else {
                console.warn("HanimeComponent: Scroll instance or scroll.update method not available to scroll to element.");
            }
        }

        // Метод для загрузки деталей потока (стрима) и дополнительных метаданных для воспроизведения.
        // Вызывается из метода onCardClick, когда пользователь выбирает карточку.
        this.fetchStreamAndMeta = function (id, meta) {
             var _this = this; // Сохраняем ссылку на текущий экземпляр компонента.
             // Показываем индикатор загрузки активности. Проверяем наличие activity и loader.
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             else console.warn("HanimeComponent: Activity loader not available in fetchStreamAndMeta.");

            console.log("HanimeComponent: fetchStreamAndMeta for ID:", id);

            // Проверяем, доступен ли компонент Lampa.Reguest (Network) для выполнения сетевых запросов.
            if (!network) {
                console.error("HanimeComponent: Network component not available to fetch stream and metadata.");
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 // Показываем уведомление пользователю об ошибке сети.
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Сетевой компонент недоступен для загрузки потока.', 5000);
                 }
                return; // Прерываем выполнение метода.
            }

            // Используем Promise.all для выполнения двух сетевых запросов (стрим и метаданные) ПАРАЛЛЕЛЬНО.
            Promise.all([
                new Promise((resolve, reject) => { // Первый промис: запрос на данные потока.
                    // Выполняем native запрос для URL стрима. Заменяем плейсхолдер {id}.
                    if(network && typeof network.native === 'function') network.native(STREAM_URL_TEMPLATE.replace('{id}', id), resolve, reject, false, { dataType: 'json', timeout: 10000 });
                    else reject('Network or native method unavailable for stream request.'); // Отклоняем промис, если network не доступен.
                }),
                // Второй промис: запрос на подробные метаданные.
                // Если метаданные УЖЕ доступны в данных, переданных в метод (например, из списка каталога), используем их напрямую без повторного запроса.
                // Если meta равно null/undefined/false, выполняем запрос на получение метаданных по URL.
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => {
                     // Выполняем native запрос для URL метаданных. Заменяем плейсхолдер {id}.
                     if(network && typeof network.native === 'function') network.native(META_URL_TEMPLATE.replace('{id}', id), resolve, reject, false, { dataType: 'json', timeout: 10000 });
                     else reject('Network or native method unavailable for meta request.'); // Отклоняем, если network не доступен.
                 })
            ]).then(([streamData, metaDataResponse]) => { // Коллбэк: выполняется после успешного получения ответов ОТ ОБАИХ ПРОМИСОВ.
                 // Скрываем индикатор загрузки активности.
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);

                // Получаем полные метаданные из ответа метаданных или используем метаданные из начального 'meta' (если были).
                const fullMetaData = metaDataResponse.meta || metaDataResponse;
                console.log("HanimeComponent: Stream data received:", streamData);
                console.log("HanimeComponent: Full Meta Data received:", fullMetaData);

                // Проверяем, есть ли в полученных данных потока (streamData) список стримов (streams) и что этот список является массивом и не пустой.
                if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0]; // Берем ПЕРВЫЙ доступный поток из списка (если есть несколько).
                    var finalStreamUrl = streamToPlay.url; // Получаем URL этого потока.

                    // Логика проксирования URL потока для обхода блокировок или CORS, если URL соответствует определенному домену (например, highwinds-cdn.com).
                    try {
                         // Пробуем создать объект URL для удобного парсинга адреса.
                         var url = new URL(finalStreamUrl);
                         // Если домен (hostname) в URL потока содержит "highwinds-cdn.com"...
                         if (url.hostname && url.hostname.includes('highwinds-cdn.com')) {
                             // ...создаем новый проксированный URL, кодируя оригинальный URL как параметр 'url'.
                             finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
                             console.log("HanimeComponent: Stream URL matched 'highwinds-cdn.com', proxied to:", finalStreamUrl);
                         } else {
                            // Если домен не соответствует правилу проксирования, используем оригинальный URL потока.
                            console.log("HanimeComponent: Stream URL does not require proxy:", finalStreamUrl);
                         }
                    } catch (e) {
                        // Если парсинг оригинального URL потока вызвал ошибку (например, некорректный формат URL),
                        // логируем ошибку, но ПРОДОЛЖАЕМ использовать оригинальный URL, не применяя проксирование.
                        console.error("HanimeComponent: Failed to parse or proxy stream URL:", finalStreamUrl, "Error:", e);
                         console.log("HanimeComponent: Using original stream URL due to URL parsing error.");
                    }

                    // Подготавливаем объект с информацией для стандартного Lampa Player.
                    var playerObject = {
                        title: fullMetaData.name || fullMetaData.title || 'Без названия', // Заголовок для отображения в плеере.
                        url: finalStreamUrl, // URL потока для воспроизведения (проксированный или оригинальный).
                        poster: fullMetaData.poster || fullMetaData.background || '', // URL постера для отображения в плеере (если есть).
                         // Сюда можно добавить другие поля, если ваш API их предоставляет и Lampa Player их поддерживает (например, продолжительность, информация об эпизодах, субтитры и т.д.).
                         // duration: fullMetaData.runtime ? fullMetaData.runtime * 60 : undefined, // Длительность в секундах.
                         // subtitles: streamToPlay.subtitles // Массив объектов субтитров, если доступны в потоке.
                    };

                    // Проверяем, есть ли действительный URL потока для плеера И доступен ли сам Lampa Player компонент с нужными методами.
                    if (playerObject.url && window.Lampa && Lampa.Player && typeof Lampa.Player.play === 'function' && typeof Lampa.Player.playlist === 'function') {
                         console.log("HanimeComponent: Launching player with URL:", playerObject.url);
                         Lampa.Player.play(playerObject); // Запускаем воспроизведение этого потока.
                         Lampa.Player.playlist([playerObject]); // Очищаем текущий плейлист плеера и устанавливаем в него только текущий элемент. (Если нужен плейлист из нескольких потоков или эпизодов, логика сложнее).

                         // Добавляем просмотренный элемент в стандартную историю просмотра Lampa (используя Lampa.Favorite с типом 'history').
                         // Проверяем, доступны ли fullMetaData и Lampa.Favorite.
                         if (fullMetaData && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                                // Формируем объект с информацией для записи в историю.
                                const historyMeta = {
                                    id: fullMetaData.id || '', // Уникальный идентификатор элемента (например, id из API). Важно для восстановления просмотра.
                                    title: fullMetaData.name || fullMetaData.title || '', // Заголовок.
                                    poster: fullMetaData.poster || fullMetaData.background || '', // Постер.
                                    runtime: fullMetaData.runtime, // Продолжительность (если есть).
                                    year: fullMetaData.year, // Год (если есть).
                                    original_name: fullMetaData.original_name || '' // Оригинальное название.
                                };
                                // Добавляем запись в историю. 'history' - стандартный тип закладки в Lampa для истории просмотра. 100 - лимит записей истории.
                                Lampa.Favorite.add('history', historyMeta, 100);
                                console.log("HanimeComponent: Added to history:", historyMeta);
                         } else {
                              console.warn("HanimeComponent: Cannot add to history. Full metadata or Lampa.Favorite not available or add method missing.");
                         }

                    } else {
                         // Если URL потока отсутствует или Lampa Player недоступен/некорректен.
                         console.error("HanimeComponent: Cannot launch player. Missing stream URL or Lampa.Player component/methods.", playerObject);
                         // Показываем уведомление об ошибке пользователю.
                         // Проверяем, доступен ли Lampa.Noty и его метод show.
                         if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                             // Выводим разные сообщения в зависимости от того, чего не хватает (URL или Player).
                             Lampa.Noty.show(playerObject.url ? 'Компонент плеера недоступен.' : 'Не удалось получить ссылку на поток.', 5000); // Показываем уведомление на 5 секунд.
                         } else console.warn("HanimeComponent: Lampa.Noty not available to show error message.");
                    }

                } else {
                     // Если в полученных данных потока (streamData) нет списка streams или он пустой/некорректный.
                     console.warn("HanimeComponent: No streams found in API data or data structure is invalid.", streamData);
                     // Показываем уведомление об отсутствии потоков.
                     if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                         Lampa.Noty.show('Потоки не найдены для этого аниме.', 5000); // Показываем уведомление на 5 секунд.
                     } else console.warn("HanimeComponent: Lampa.Noty not available to show message.");
                }

            }).catch(error => { // Коллбэк: выполняется, если какой-либо из промисов в Promise.all отклонен (ошибка сетевого запроса).
                 console.error("HanimeComponent: Error fetching stream/meta details:", error);
                 // Скрываем индикатор загрузки.
                if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);

                // Показываем уведомление об ошибке пользователю.
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     // Формируем сообщение об ошибке.
                     const errorMessage = 'Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка');
                     Lampa.Noty.show(errorMessage, 5000); // Показываем уведомление на 5 секунд.
                 } else console.warn("HanimeComponent: Lampa.Noty not available to show error message.");
            });
        };

        // Метод для отображения сообщения пользователю о пустом состоянии каталога или ошибке загрузки.
        // Вызывается из fetchCatalog() или build(), когда нет элементов для отображения.
        this.empty = function (msg) {
             console.log("HanimeComponent: empty() - Called with message:", msg);
             // Проверяем, доступен ли стандартный Lampa компонент Empty (для отображения сообщений об ошибках и пустых состояний).
             if (window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function' && typeof Lampa.Empty.prototype.start === 'function') {
                 var empty = new Lampa.Empty({ message: msg }); // Создаем новый экземпляр Empty компонента с нужным сообщением.
                 // Если основной корневой DOM-контейнер компонента (html) существует...
                 if(html && typeof html.empty === 'function' && typeof html.append === 'function') {
                     html.empty(); // Очищаем текущее содержимое корневого контейнера (удаляем, например, Scroll).
                     html.append(empty.render(true)); // Вставляем DOM-элемент Empty компонента в корневой контейнер. true в render() заставляет Empty пересчитать свои размеры.
                 } else { console.warn("HanimeComponent: Html container or its methods missing to show empty state via Lampa.Empty."); }

                 // Скрываем индикатор загрузки активности и делаем активность видимой.
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();

                 // Переназначаем метод 'start' текущей активности Lampa на метод 'start' экземпляра Empty компонента.
                 // Это очень важно! Lampa Activity Manager вызовет Empty.start(), который настроит Controller для управления компонентом Empty.
                 // Это обеспечит, например, правильную работу кнопки "Назад" на пустом экране.
                 this.start = empty.start;
                  console.log("HanimeComponent: Displaying empty state via Lampa.Empty. Reassigned start method.");
             } else {
                  // Fallback, если Lampa.Empty компонент недоступен.
                  // Просто выводим текст сообщения об ошибке в основной DOM-контейнер компонента (html).
                  console.warn("HanimeComponent: Lampa.Empty component not available. Using basic text fallback for empty state.");
                  if(html && typeof html.empty === 'function' && typeof html.text === 'function') {
                       html.empty(); // Очищаем контейнер.
                       html.text(msg + ' (Компонент Empty недоступен в Lampa)'); // Вставляем только текст.
                  } else console.warn("HanimeComponent: Html container or its methods missing for text fallback empty state.");

                  // Скрываем лоадер и показываем активность.
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                 if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();

                   // Определяем свой минимальный метод 'start' для этого fallback.
                   // Его единственная цель - настроить Controller, чтобы работала кнопка "Назад".
                   this.start = function() {
                        console.log("HanimeComponent: Fallback start() for empty state. Setting minimal Controller for Back button.");
                        // Проверяем доступность Lampa.Controller и его методов.
                       if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                            // Добавляем контроллер с именем 'content' только с обработчиком кнопки "Назад".
                            Lampa.Controller.add('content', { back: this.back });
                            Lampa.Controller.toggle('content'); // Активируем этот минимальный контроллер.
                       } else console.warn("HanimeComponent: Lampa.Controller not available for fallback start method.");
                   }.bind(this); // Важно привязать контекст 'this' (к экземпляру HanimeComponent) к этому методу.
             }
             console.log("HanimeComponent: empty() finished.");
        };


        // Метод создания активности. Это один из стандартных методов жизненного цикла Lampa Activity.
        // Вызывается Lampa при первом переходе на эту активность.
        this.create = function () {
            console.log("HanimeComponent: create()");
             // 1. Сначала построим основную DOM-структуру компонента (items-line layout).
            this.buildLayout(); // buildLayout() создает и инициализирует переменные html и itemsContainer.
            // 2. Показываем стандартный индикатор загрузки Lampa активности.
             if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(true);
            // 3. Запускаем асинхронную загрузку данных каталога из API.
            this.fetchCatalog(); // fetchCatalog() после загрузки вызовет build() или empty().
             console.log("HanimeComponent: create() finished. Layout built and catalog fetch initiated.");
        };

        // Метод запуска активности. Это один из стандартных методов жизненного цикла Lampa Activity.
        // Вызывается Lampa, когда активность должна стать видимой и получить фокус Controller.
        // Это происходит при первом открытии активности, а также при возврате на нее (например, из меню, плеера или другой активности).
        this.start = function () {
            console.log("HanimeComponent: start()");
             // Проверяем, является ли этот экземпляр HanimeComponent текущей активной активностью Lampa.
             // Проверяем наличие Lampa.Activity и его метода active.
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this.activity) {
                console.log("HanimeComponent: start() - Not the currently active activity, skipping setup.");
                return; // Выходим из метода, если активность не является текущей активной.
            }
             console.log("HanimeComponent: start() - Activity is current active activity. Proceeding with Controller setup.");

            // Настраиваем Lampa.Controller для управления фокусом и навигацией в этой активности.
            // Используем стандартное имя 'content' для контроллера основного содержимого.
            // Проверяем, что Lampa.Controller и его методы add/toggle доступны.
             if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {

                 // Проверяем, что Scroll компонент был инициализирован в методе build() и его метод render() доступен.
                 // Scroll должен быть инициализирован К этому моменту, если fetchCatalog() и build() прошли успешно.
                 if (scroll && typeof scroll.render === 'function') {

                      console.log("HanimeComponent: Setting up 'content' Controller with Scroll DOM.");
                      // Регистрируем или перенастраиваем контроллер с именем 'content'.
                      Lampa.Controller.add('content', {
                          // Метод toggle() вызывается Controller-ом при активации этого контроллера (например, Controller.toggle('content')).
                          toggle: function () {
                              console.log("HanimeComponent: Controller toggle() called.");
                              // 1. Указываем Controller-у КОЛЛЕКЦИЮ НАВИГАЦИОННЫХ ЭЛЕМЕНТОВ.
                              //    Controller будет искать все элементы с классом '.selector' внутри контейнера, который возвращает scroll.render().
                              //    Наши карточки HanimeCard имеют класс 'selector' (прописан в шаблоне).
                              //    Проверяем доступность Lampa.Controller.collectionSet.
                              if(Lampa.Controller && typeof Lampa.Controller.collectionSet === 'function') Lampa.Controller.collectionSet(scroll.render());
                               else console.warn("HanimeComponent: Controller collectionSet method is missing.");

                              // 2. Устанавливаем НАЧАЛЬНЫЙ ФОКУС в этой коллекции.
                              //    Controller.collectionFocus попытается установить фокус:
                              //    а) На DOM-элементе, который сохранен в переменной 'last' (если 'last' не null/false). Это используется при возврате в активность.
                              //    б) Если 'last' отсутствует, на ПЕРВОМ доступном элементе в коллекции, которую задали с помощью collectionSet.
                              //    Установка фокуса Controller.collectionFocus ВЫЗЫВАЕТ СТАНДАРТНОЕ СОБЫТИЕ Lampa 'hover:focus' на том элементе, который получает фокус.
                              //    Наш HanimeCard компонент имеет обработчик на это событие, который вызывает this.updateScrollToFocus(),
                              //    именно поэтому скролл перемещается к начальному элементу автоматически!
                              //    Проверяем доступность Lampa.Controller.collectionFocus.
                              if(Lampa.Controller && typeof Lampa.Controller.collectionFocus === 'function') Lampa.Controller.collectionFocus(last || false, scroll.render());
                              else console.warn("HanimeComponent: Controller collectionFocus method is missing.");

                               console.log("HanimeComponent: Controller collectionSet/Focus called in toggle().");
                          },
                          // --- Обработчики стандартных навигационных кнопок (Лево, Право, Вверх, Вниз, Назад). ---
                          // Эти функции вызываются Controller-ом, когда соответствующая кнопка нажимается, и этот контроллер активен.
                          left: function () {
                              // Пытаемся переместить фокус влево внутри ТЕКУЩЕЙ КОЛЛЕКЦИИ Controller-а.
                              // Lampa.Navigator (обертка для D-pad навигации) определяет, куда можно перемещаться.
                              // Проверяем доступность Navigator и его методов.
                              if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('left')) Navigator.move('left');
                               // Если перемещение внутри коллекции НЕВОЗМОЖНО (достигнут левый край) И
                               // доступен компонент Lampa.Controller для переключения контроллеров,
                               // переключаем на стандартный контроллер 'menu' (меню Lampa).
                               else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('menu');
                               else console.log("HanimeComponent: Cannot move left, Navigator unavailable or no more elements/menu.");
                           },
                           right: function () {
                                // Пытаемся переместить фокус вправо в текущей коллекции.
                               if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('right')) Navigator.move('right');
                                // Если перемещение невозможно (достигнут правый край), обычно ничего не происходит в одной горизонтальной линии.
                                // В случае многострочной сетки или нескольких горизонтальных линий, Controller сам обрабатывает переходы между ними.
                                else console.log("HanimeComponent: Cannot move right, Navigator unavailable or no more elements.");
                           },
                           up: function () {
                                // В контексте ОДНОЙ ГОРИЗОНТАЛЬНОЙ ЛИНИИ в отдельной активности Lampa:
                                // Нажатие ВВЕРХ обычно переключает на стандартный контроллер ЗАГОЛОВКА активности ('head').
                               // Проверяем доступность Controller и метода toggle.
                               if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('head');
                               else console.log("HanimeComponent: Head controller unavailable for UP action.");
                           },
                           down: function () {
                                // В контексте ОДНОЙ ГОРИЗОНТАЛЬНОЙ ЛИНИИ:
                                // Нажатие ВНИЗ обычно некуда перемещаться, если под этой линией нет других элементов/линий в DOM, управляемых этим же Controller-ом.
                               // Navigator.canmove('down') скорее всего вернет false.
                               if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('down')) Navigator.move('down');
                                // Если есть другие горизонтальные линии под этой, Controller.toggle может использоваться для переключения на следующую линию или на другой контроллер, если структура сложнее.
                                 else console.log("HanimeComponent: Cannot move down, Navigator unavailable or no elements below.");
                           },
                           // Назначаем метод 'back' ТЕКУЩЕГО КОМПОНЕНТА ('this.back') в качестве обработчика для кнопки "Назад".
                           // Lampa Controller вызовет this.back() когда кнопка "Назад" будет нажата, и этот контроллер активен.
                           back: this.back
                       });

                       // Активируем наш настроенный контроллер с именем 'content'.
                       // Это заставит Lampa Activity Manager передать управление фокусом и событиями этому контроллеру.
                       // Вызов toggle('content') ВЫЗЫВАЕТ метод toggle() определенный ВНУТРИ ОБЪЕКТА { toggle: function() { ... } } выше один раз.
                       Lampa.Controller.toggle('content');
                        console.log("HanimeComponent: Controller 'content' added and toggled. Lampa should now handle navigation within scroll.");

                   } else {
                       // Если Scroll компонент еще не доступен в start() (очень странная ситуация, может быть ранняя вызов start или проблема с build),
                       // то мы не можем правильно настроить Controller с элементами для навигации.
                        console.error("HanimeComponent: Scroll instance or scroll.render method not available in start(). Cannot setup main Controller for scroll.");
                        // В этом случае, пытаемся установить хотя бы базовый Controller только с обработчиком кнопки "Назад", чтобы пользователь мог выйти из активности.
                        console.log("HanimeComponent: Attempting to set up minimal Controller for Back button.");
                       if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                           // Добавляем контроллер с именем 'content', но только с методом 'back'.
                            Lampa.Controller.add('content', { back: this.back });
                            Lampa.Controller.toggle('content'); // Активируем этот минимальный контроллер.
                       } else console.warn("HanimeComponent: Lampa.Controller unavailable to set up minimal back handler.");
                   }

               } else {
                   // Если Lampa.Controller компонент сам по себе недоступен (что крайне маловероятно после appready),
                   // выводим ошибку и не можем настроить никакую навигацию через Controller.
                    console.error("HanimeComponent: Lampa.Controller component is not available in start(). Cannot setup any controller.");
                    // Возможно, уведомить пользователя об ошибке, если Lampa.Noty доступен.
                    if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                        Lampa.Noty.show('Ошибка плагина: Навигационный контроллер недоступен.', 7000);
                    }
               }
               console.log("HanimeComponent: start() finished.");
           };


           // Метод паузы активности. Один из стандартных методов жизненного цикла Lampa Activity.
           // Вызывается Lampa, когда другая активность становится активной поверх текущей (например, открылось меню или плеер).
           // Используется для сохранения текущего состояния (например, последний сфокусированный элемент).
           this.pause = function () {
                console.log("HanimeComponent: pause()");
                // Сохраняем ссылку на ДОМ-элемент, который был в фокусе перед переходом на другую активность.
                // Это нужно, чтобы Lampa Controller мог вернуть фокус на этот же элемент при последующем вызове start() этой активности.
                // Проверяем доступность Lampa.Controller, что наш контроллер 'content' сейчас активен (иначе Controller.item может вернуть null или относиться к другому контроллеру).
                // Проверяем доступность метода item().
                if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') {
                    // Lampa.Controller.item() возвращает нативный ДОМ-элемент текущего сфокусированного элемента в коллекции Controller.
                    // Сохраняем его в переменную 'last'. Если Controller.item() вернет null по какой-то причине, сохраняем предыдущее значение 'last'.
                    last = Lampa.Controller.item() || last;
                     console.log("HanimeComponent: Activity paused. Saved last focused DOM item:", last);
                } else {
                     console.log("HanimeComponent: Pause called, but content controller not active or Controller.item missing. Last focus not saved.");
                }
                // Добавьте здесь логику сохранения других состояний, если нужно (например, позиция скролла, если last недостаточно).
                console.log("HanimeComponent: pause() finished.");
           };

           // Метод остановки активности. Один из стандартных методов жизненного цикла Lampa Activity.
           // Вызывается Lampa перед тем, как активность будет уничтожена (например, когда ее закрыли кнопкой "Назад" или через API).
           // Используется для остановки таймеров, анимаций, подписок на события, которые не управляются компонентами Lampa.
           this.stop = function () {
                //console.log("HanimeComponent: stop()");
               // В методе stop обычно выполняют "легкую" очистку. В данном коде большая часть очистки происходит в методе destroy().
                console.log("HanimeComponent: stop() finished.");
           };

           // Метод рендеринга. Один из стандартных методов жизненного цикла Lampa Activity.
           // Вызывается Lampa, когда ей нужен DOM-элемент, который представляет эту активность для отображения на экране.
           // Lampa вставит DOM-элемент, возвращаемый render(), в свое общее DOM-дерево активностей.
           this.render = function () {
                //console.log("HanimeComponent: render() called.");
                // Если корневая DOM-структура компонента (items-line) еще не была создана (например, при первом вызове create), создаем ее.
                // create() вызывает buildLayout(), который инициализирует переменную html.
               if (!html) {
                    console.log("HanimeComponent: render() - Html layout not built yet, building now.");
                    this.buildLayout();
               }
               console.log("HanimeComponent: render() - Returning html element.");
               return html; // Возвращаем jQuery-объект корневого DOM-элемента компонента (структуру items-line).
           };

           // Метод уничтожения. Один из стандартных методов жизненного цикла Lampa Activity.
           // Вызывается Lampa, когда активность полностью завершается и удаляется из стека активностей.
           // Крайне важно освободить ВСЕ связанные ресурсы (сетевые запросы, экземпляры других компонентов, DOM-элементы, подписки на события), чтобы избежать утечек памяти и проблем.
           this.destroy = function () {
               console.log("HanimeComponent: destroy() called. Cleaning up resources.");
               // Отменяем все незавершенные сетевые запросы компонента Lampa.Reguest.
              if(network && typeof network.clear === 'function') network.clear(); network = null; // Отменяем и обнуляем ссылку.
               //console.log("HanimeComponent: Network requests cleared.");

               // Уничтожаем все экземпляры HanimeCard в массиве 'items'.
               // Lampa.Arrays.destroy специально разработана для вызова метода destroy() на каждом элементе массива.
                if (items && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') {
                    Lampa.Arrays.destroy(items); // Вызовет HanimeCard.destroy() для каждой карточки.
                    console.log("HanimeComponent: Destroyed all HanimeCard instances.");
                }
               items = null; // Обнуляем ссылку на массив JS-объектов карточек.

               // Уничтожаем экземпляр Lampa.Scroll.
               // Метод destroy() Lampa.Scroll должен удалить все DOM-элементы Scroll-а из документа и отписаться от всех внутренних событий.
                if (scroll && typeof scroll.destroy === 'function') {
                    scroll.destroy();
                    console.log("HanimeComponent: Destroyed Lampa.Scroll instance.");
                }
               scroll = null; // Обнуляем ссылку на Scroll.

               // Удаляем корневой DOM-элемент компонента (всю структуру items-line) из документа.
                if (html && typeof html.remove === 'function') {
                    html.remove();
                    console.log("HanimeComponent: Removed html (items-line) element from DOM.");
                }
               html = null; itemsContainer = null; // Обнуляем ссылки на DOM-элементы контейнеров. last = null; // Сбрасываем ссылку на последний сфокусированный элемент.


               // Очищаем и удаляем регистрацию нашего Controller из Lampa Controller Manager.
               // Это освобождает имя контроллера 'content' для использования другими компонентами и гарантирует, что Lampa Controller не будет пытаться управлять удаленными элементами.
               if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function' && typeof Lampa.Controller.collectionSet === 'function') {
                    // Если наш контроллер ('content') сейчас является активным или последним активным,先清空 его элементы集合，
                    // before removing its registration. This prevents potential issues if Controller
                    // tries to access elements after they are removed from DOM.
                    if (Lampa.Controller.enabled().name === 'content') { // Если 'content' текущий активный контроллер
                         Lampa.Controller.collectionSet([]); // Снимаем все элементы с контроля Controller-а.
                         // Опционально: Lampa.Controller.toggle('app'); // Можно попробовать вернуть управление стандартному базовому контроллеру Lampa. (Часто не требуется, Lampa управляет этим).
                          console.log("HanimeComponent: Controller 'content' was active. Collection cleared.");
                    }
                    // Удаляем регистрацию контроллера с именем 'content'.
                    Lampa.Controller.remove('content');
                     console.log("HanimeComponent: Controller 'content' registration removed.");
               } else console.warn("HanimeComponent: Lampa.Controller or its methods missing for cleanup in destroy.");

               console.log("HanimeComponent: destroy() finished. All associated resources should be released.");
           };

           // Обработчик стандартного события Lampa "Назад".
           // Привязывается к Controller в методе start().
           this.back = function () {
                console.log("HanimeComponent: back() called. Attempting Activity.backward().");
                // Вызываем стандартный метод Lampa.Activity для навигации назад по стеку активностей.
                // Это стандартный способ Lampa переходить на предыдущий экран.
                // Проверяем наличие Lampa.Activity и его метода backward.
                if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') {
                    Lampa.Activity.backward();
                     console.log("HanimeComponent: Called Lampa.Activity.backward().");
                } else console.warn("HanimeComponent: Lampa.Activity or backward method missing for back navigation.");
           };
       }


       // --- Глобальная функция startPlugin. Точка входа для инициализации плагина. ---
       // Эта функция вызывается ОДИН раз при загрузке файла скрипта плагина.
       function startPlugin() {
           console.log("Hanime Plugin: startPlugin() invoked.");

           // Проверяем глобальный флаг плагина. Если он уже установлен, плагин уже был инициализирован ранее. Выходим.
           // Это важно, чтобы избежать двойной инициализации, если скрипт будет загружен/выполнен несколько раз.
            if (window.plugin_hanime_catalog_ready) {
                 console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag already set. Skipping startPlugin initialization.");
                return; // Прерываем выполнение startPlugin().
            }
           // Не устанавливаем флаг ЗДЕСЬ. Флаг будет установлен ПОЗЖЕ, внутри initializeLampaDependencies(),
           // только после того, как мы успешно убедимся, что Lampa доступна и готова к инициализации.


           // --- ОЖИДАНИЕ ГОТОВНОСТИ LAMPA ---
           // Плагин должен инициализировать свои Lampa-зависимые части только после того, как сама Lampa полностью загружена и готова.
           // Lampa сигнализирует об этом событием 'app:ready' (с типом 'ready').
           console.log("Hanime Plugin: Setting up listener for Lampa 'app:ready' event.");

            // 1. Предпочтительный способ: Использовать стандартный Lampa Listener для подписки на событие 'app'.
            // Проверяем, доступен ли компонент Lampa.Listener и его метод follow.
           if (window.Lampa && typeof window.Lampa === 'object' && Lampa.Listener && typeof Lampa.Listener === 'object' && typeof Lampa.Listener.follow === 'function') {
               Lampa.Listener.follow('app', function (e) {
                   // Обработчик события 'app'. Проверяем тип события.
                   if (e.type === 'ready') {
                       console.log("Hanime Plugin: Lampa 'appready' event received. Calling initializeLampaDependencies.");
                       // Когда Lampa полностью готова ('appready'), вызываем основную функцию инициализации, зависящую от Lampa.
                       initializeLampaDependencies();
                   }
               });
               console.log("Hanime Plugin: Subscribed to Lampa 'app:ready' event via Listener.");

           } else if (window.appready && typeof window.appready === 'boolean' && window.appready) {
               // 2. Fallback 1: Если Lampa уже установила глобальный флаг `appready` до того, как наш Listener был подписан,
               // (например, при очень быстрой загрузке или если Listener компонент отсутствует),
               // мы можем проверить этот флаг напрямую и вызвать инициализацию немедленно.
               // Этот способ менее предпочтителен, чем Listener, т.к. flag 'appready' может быть установлен до того, как некоторые подкомпоненты Lampa станут полностью готовы.
                console.warn("Hanime Plugin: Lampa 'appready' flag found set on window, but Lampa.Listener seems unavailable or unusual. Calling initializeLampaDependencies directly as fallback.");
               initializeLampaDependencies(); // Вызываем функцию инициализации, зависящую от Lampa.

           } else {
               // 3. КРИТИЧЕСКИЙ Fallback 2: Если ни Lampa Listener не доступен, ни флаг `appready` не установлен на `window`.
               // В этой ситуации мы не можем надежно определить, когда Lampa будет готова.
               // Это может указывать на проблему с самой Lampa или на другую версию фреймворка.
               // Попытка инициализировать плагин С НИЗКОЙ ЗАДЕРЖКОЙ может иногда сработать (если Lampa загрузится через очень короткое время), но это ОЧЕНЬ НЕНАДЕЖНЫЙ метод.
               console.error("Hanime Plugin: CRITICAL FALLBACK: Lampa.Listener is unavailable AND 'appready' flag not set. Cannot reliably determine Lampa readiness. Attempting delayed initialization as a highly UNRELIABLE fallback.");
               // Инициализируем через 500 миллисекунд. Таймаут может потребовать настройки.
                // В Production окружениях такое часто указывает на несовместимость версии Lampa.
              setTimeout(initializeLampaDependencies, 500);
               console.log("Hanime Plugin: Delayed initialization fallback scheduled (500ms).");
           }

           console.log("Hanime Plugin: startPlugin() finished its initial execution (listener/fallback scheduled).");
       }


       // --- Функция, содержащая основную логику ИНИЦИАЛИЗАЦИИ ПЛАГИНА, которая ДОЛЖНА выполняться только после того, как LAMPA полностью готова. ---
       // Вызывается из обработчика события 'app:ready' Lampa (или изfallback-логики).
       function initializeLampaDependencies() {
            console.log("Hanime Plugin: initializeLampaDependencies() called. Proceeding with Lampa-dependent initialization.");

            // В ЭТОТ МОМЕНТ мы ОЖИДАЕМ, что ВСЕ ОСНОВНЫЕ КОМПОНЕНТЫ Lampa (Lampa.Template, Lampa.Component, Activity, Controller, Select, Favorite, т.д.) ДОСТУПНЫ и ФУНКЦИОНАЛЬНЫ.

            // Выполняем последнюю проверку наличия КРИТИЧЕСКИ ВАЖНЫХ компонентов Lampa, без которых плагин не может работать.
            // Проверяем, что Lampa (как базовый объект), а также Template, Component, Activity, Controller и jQuery ($) доступны.
            if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Template || typeof Lampa.Template !== 'object' || !Lampa.Component || typeof Lampa.Component !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function') {
                 console.error("Hanime Plugin: CRITICAL ERROR: Required Lampa components (Lampa.*, jQuery) are still not available inside initializeLampaDependencies. Initialization failed.");
                 // Показываем сообщение об ошибке пользователю через Lampa.Noty (если доступен).
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                    Lampa.Noty.show('Ошибка плагина: Базовые компоненты Lampa недоступны. Пожалуйста, убедитесь, что Lampa загрузилась полностью и корректно.', 10000);
                 } else console.warn("Hanime Plugin: Lampa.Noty not available to show critical error message.");
                 return; // Прерываем дальнейшую инициализацию плагина.
            }
            console.log("Hanime Plugin: Critical Lampa components checked and confirmed available.");


            // --- УСТАНАВЛИВАЕМ ГЛОБАЛЬНЫЙ ФЛАГ ПЛАГИНА. ---
            // Делаем это только ПОСЛЕ ТОГО, как успешно проверили, что Lampa ГОТОВА.
            // Если флаг был установлен раньше, это ошибка (двойная инициализация?).
             if (window.plugin_hanime_catalog_ready) {
                  console.warn("Hanime Plugin: plugin_hanime_catalog_ready flag was unexpectedly set BEFORE initializationLampaDependencies completed. Likely double load issue. Aborting.");
                  // Можно показать ошибку, т.к. плагин, возможно, был инициализирован некорректно.
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Плагин уже запущен или конфликт инициализации.', 7000);
                  }
                 return; // Прерываем инициализацию, если флаг уже установлен.
             }
            window.plugin_hanime_catalog_ready = true;
             console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag set.");


            // --- 1. Определение СТАНДАРТНЫХ ВНУТРЕННИХ шаблонов Lampa (как fallback). ---
            // Эти маленькие шаблоны используются внутри нашего основного шаблона hanime-card.
            // Мы добавляем их НАПРЯМУЮ используя Lampa.Template.add.
            // НЕ НУЖНО ПРОВЕРЯТЬ Template.has(), так как мы знаем, что Template должен быть доступен здесь.
            console.log("Hanime Plugin: Adding standard template fallbacks using Lampa.Template.add...");
            if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                // Шаблоны для отображения рейтинга, качества, года, типа, иконки замка.
                // Классы (.card__vote, .card__quality, и т.д.) уже имеют стили в основном CSS Lampa.
                Lampa.Template.add('card_vote_temp', '<div class="card__vote hanime-card__vote">{vote}</div>');
                Lampa.Template.add('card_quality_temp', '<div class="card__quality hanime-card__quality"><div>{quality}</div></div>');
                Lampa.Template.add('card_year_temp', '<div class="card__age hanime-card__age">{year}</div>');
                Lampa.Template.add('card_type_temp', '<div class="card__type hanime-card__type">{type}</div>');
                // Шаблон для иконки замка (используется в контекстном меню Premium). SVG код иконки.
                Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
                 console.log("Hanime Plugin: Standard template fallbacks added.");
            } else {
                console.error("Hanime Plugin: Lampa.Template.add method not available. Cannot add template fallbacks.");
                 // Возможно, продолжить, но некоторые элементы UI могут не отобразиться.
            }


            // --- 2. Определение ВАШЕГО ОСНОВНОГО шаблона карточки 'hanime-card'. ---
            // Этот шаблон использует стандартные внутренние шаблоны (определенные выше) и стандартные классы Lampa.
            console.log("Hanime Plugin: Adding hanime-card template...");
             if (Lampa.Template && typeof Lampa.Template.add === 'function') { // Проверяем доступность Template.add.
                Lampa.Template.add('hanime-card', `
                    <div class="hanime-card card selector layer--visible layer--render"> <!-- Корневой элемент карточки: standard Lampa classes -->
                        <div class="card__view hanime-card__view"> <!-- Область просмотра с постером и наложениями -->
                            <img src="./img/img_load.svg" class="card__img hanime-card__img" alt="{title}" loading="lazy" /> <!-- Стандартный элемент img для картинки. Placeholder src="./img/img_load.svg" указывает на заглушку загрузки Lampa. src будет установлен в HanimeCard.onVisible. -->
                            <div class="card__icons hanime-card__icons"> <!-- Контейнер для иконок закладок/истории -->
                                <div class="card__icons-inner hanime-card__icons-inner"></div> <!-- Внутренний контейнер -->
                            </div>
                            <!-- Вставляем стандартные внутренние блоки данных, используя Lampa.Template.get. -->
                            <!-- Передача 'true' как третьего аргумента в Lampa.Template.get() возвращает сырую HTML-строку, а не jQuery-объект. -->
                            <!-- Это КРИТИЧНО, чтобы избежать [object Object] в строке шаблона. -->
                            <!-- Используем Ternary оператор для безопасного вызова Lampa.Template.get только если Template и его методы доступны -->
                             ${ (Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.get('card_vote_temp', {}, true)) ? Lampa.Template.get('card_vote_temp', { vote: '{vote}' }, true) : ''}
                             ${ (Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.get('card_quality_temp', {}, true)) ? Lampa.Template.get('card_quality_temp', { quality: '{quality}' }, true) : ''}
                             ${ (Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.get('card_type_temp', {}, true)) ? Lampa.Template.get('card_type_temp', { type: '{type}' }, true) : ''}
                        </div>
                        <div class="card__title hanime-card__title">{title}</div> <!-- Заголовок под постером -->
                        ${ (Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.get('card_year_temp', {}, true)) ? Lampa.Template.get('card_year_temp', { year: '{year}' }, true) : ''} <!-- Год под заголовком -->
                    </div>
                `);
                 console.log("Hanime Plugin: HanimeCard template added successfully.");
            } else {
                 console.error("Hanime Plugin: Lampa.Template.add method not available. Cannot add hanime-card template.");
            }


            // --- 3. CSS Стили ---
            // ПОЛНОСТЬЮ УДАЛЕН БЛОК ОПРЕДЕЛЕНИЯ И ДОБАВЛЕНИЯ ВАШИХ КАСТОМНЫХ CSS СТИЛЕЙ.
            // Плагин теперь НЕ ДОБАВЛЯЕТ свои CSS правила.
            // Он полагается ТОЛЬКО на стандартные стили Lampa для всех используемых классов
            // (card, selector, items-line, card__view, card__img, etc.), которые Lampa уже предоставляет.
             console.log("Hanime Plugin: Custom CSS block is removed as requested. Relying on standard Lampa CSS styles.");


            // --- 4. Регистрируем ВАШ ОСНОВНОЙ КОМПОНЕНТ (HanimeComponent) в Lampa Component Manager. ---
            // Делаем это после того, как все шаблоны (которые компонент может использовать) определены.
            console.log("Hanime Plugin: Registering HanimeComponent...");
            // Проверяем, доступен ли Lampa.Component Manager и его метод add.
            if (window.Lampa && Lampa.Component && typeof Lampa.Component.add === 'function') {
                Lampa.Component.add('hanime_catalog', HanimeComponent); // Регистрируем компонент по уникальному имени.
                console.log("Hanime Plugin: Component 'hanime_catalog' registered successfully.");
            } else {
                console.error("Hanime Plugin: Lampa.Component.add method not available. Cannot register component 'hanime_catalog'.");
                 // Если не удается зарегистрировать компонент, показываем уведомление пользователю (если Noty доступен).
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                    Lampa.Noty.show('Ошибка плагина: Не удалось зарегистрировать компонент каталога.', 7000);
                 } else console.warn("Hanime Plugin: Lampa.Noty not available to show error.");
            }


            // --- 5. Добавляем пункт меню в основное меню Lampa. ---
            // Это позволяет пользователю запустить активность нашего плагина из главного меню.
            // Этот вызов addMenuItem() находится внутри initializeLampaDependencies(),
            // т.к. для добавления меню требуются некоторые готовые компоненты Lampa (Activity, Controller, jQuery)
            // и зарегистрированный наш компонент.
            console.log("Hanime Plugin: Calling addMenuItem() after component registration...");
            addMenuItem(); // addMenuItem() определена ниже в файле.
             console.log("Hanime Plugin: initializeLampaDependencies() finished.");
       }


       // --- Отдельная функция для добавления пункта меню в стандартное меню Lampa. ---
       // Эта функция вызывается из initializeLampaDependencies(), когда Lampa готова и наш компонент зарегистрирован.
       function addMenuItem() {
            console.log("Hanime Plugin: addMenuItem() called.");

            // Выполняем все необходимые проверки наличия компонентов Lampa и структуры DOM меню перед взаимодействием.
            // Эти компоненты должны быть доступны к этому моменту, т.к. initializeLampaDependencies уже прошел проверки.
            if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Component || typeof Lampa.Component !== 'object' || typeof Lampa.Component.get !== 'function') {
                 console.error("Hanime Plugin: addMenuItem critical check failed. Lampa core components or jQuery missing. Skipping menu item addition.");
                 // Не показываем уведомление, т.к. ошибка будет показана при критическом провале инициализации Lampa.
                 return; // Выходим из функции, если необходимые компоненты Lampa отсутствуют.
            }
             // Проверяем наличие структуры DOM списка меню Lampa (например, .menu .menu__list).
            var menuList = $('.menu .menu__list').eq(0);
            if (!menuList.length) {
                 console.error("Hanime Plugin: addMenuItem critical check failed. Lampa menu list DOM element ('.menu .menu__list') not found. Skipping menu item addition.");
                 return; // Выходим, если DOM списка меню не найден.
            }
             console.log("Hanime Plugin: addMenuItem checks passed. Required Lampa components and menu DOM available.");


            // Проверяем, был ли наш компонент 'hanime_catalog' успешно зарегистрирован в Lampa.Component Manager.
            // Без этого нельзя запустить активность с нашим компонентом. Используем Lampa.Component.get.
            var ourComponentRegistered = Lampa.Component.get('hanime_catalog');
            if (!ourComponentRegistered) {
                console.error("Hanime Plugin: addMenuItem failed - Component 'hanime_catalog' is not registered in Lampa.Component. Cannot create menu item that launches it. Skipping menu item addition.");
                 // Ошибка регистрации уже логировалась в initializeLampaDependencies, но здесь тоже можно напомнить.
                 return; // Выходим, если наш компонент не зарегистрирован.
            }
             console.log("Hanime Plugin: Component 'hanime_catalog' found registered.");


            // Дополнительная (необязательная, для чистоты) проверка на случай дублирования пункта меню по тексту в DOM.
            // При правильной инициализации это не должно происходить, т.к. startPlugin() выполняется только один раз.
            if ($('.menu .menu__list .menu__text:contains("Hanime Catalog")').length > 0) {
                console.warn("Hanime Plugin: addMenuItem skipping - Menu item with text 'Hanime Catalog' already exists in DOM.");
                return; // Выходим, если пункт меню с таким текстом уже есть.
            }
            console.log("Hanime Plugin: Proceeding to create menu item DOM element.");


            // Создаем jQuery-объект DOM-элемента пункта меню.
            // Используем СТАНДАРТНЫЕ классы Lampa для элементов меню (menu__item, menu__ico, menu__text)
            // и ОБЯЗАТЕЛЬНО добавляем класс 'selector'.
            // Класс 'selector' необходим Lampa.Controller для навигации по элементам меню.
            var menu_item = $(`
                <li class="menu__item selector"> <!-- Standard Lampa menu item classes + selector -->
                    <div class="menu__ico"> <!-- Standard icon container -->
                        <!-- Иконка для пункта меню. В формате SVG, вставлена прямо в HTML. -->
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">Hanime Catalog</div> <!-- Текст, отображаемый в меню -->
                </li>
            `);

            // Привязываем обработчик стандартного события Lampa 'hover:enter' к DOM-элементу пункта меню.
            // Событие 'hover:enter' генерируется Lampa.Controller при активации (выборе, нажатии кнопки OK) сфокусированного элемента меню.
            if (typeof menu_item.on === 'function') { // Проверяем, что jQuery-объект имеет метод on.
                menu_item.on('hover:enter', function () {
                    console.log("Hanime Plugin: Menu item 'Hanime Catalog' activated via 'hover:enter'. Preparing to push activity.");
                    // При активации пункта меню, запускаем новую активность Lampa, которая будет использовать наш компонент.
                    // Проверяем наличие Lampa.Activity и ее метода push.
                    if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.push === 'function') {
                       Lampa.Activity.push({
                           url: '', // Опциональный URL для навигации браузера/истории. Можно оставить пустым.
                           title: 'Hanime Catalog', // Заголовок, который отобразится в шапке новой активности.
                           component: 'hanime_catalog', // Имя зарегистрированного компонента (HanimeComponent), который Lampa должна создать и использовать для этой активности.
                           page: 1 // Стартовый номер страницы (для компонента с пагинацией, опционально).
                       });
                        console.log("Hanime Plugin: Lampa.Activity.push called for component 'hanime_catalog'.");
                   } else console.warn("Hanime Plugin: Lampa.Activity.push method not available. Cannot launch activity.");
               });
                //console.log("Hanime Plugin: 'hover:enter' event handler attached to menu item.");
            } else console.warn("Hanime Plugin: jQuery object 'on' method not available for menu item events.");


            // Добавляем DOM-элемент пункта меню в стандартный список меню Lampa.
            // menuList уже получен и проверен выше.
            menuList.append(menu_item);
            console.log("Hanime Plugin: Menu item DOM element successfully added to Lampa menu list DOM.");

            console.log("Hanime Plugin: addMenuItem finished.");
        }

        // Вызываем главную функцию старта плагина при загрузке файла скрипта.
        startPlugin();

})();
