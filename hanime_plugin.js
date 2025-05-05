(function () {
    'use strict';

    // --- HanimeCard: Компонент для одной карточки аниме ---
    // Использует ТОЛЬКО стандартные классы Lampa для DOM и функциональности.
    function HanimeCard(data, componentRef) { // componentRef - ссылка на родительский компонент (HanimeComponent)
        // Обрабатываем входные данные API, чтобы они соответствовали стандартным полям Lampa-подобных карточек.
        var processedData = {
            id: data.id,
            // Заголовок (используется в шаблоне)
            title: data.name || data.title || 'Без названия',
            // Путь к картинке постера (используется в шаблоне и для загрузки)
            poster_path: data.poster || data.img, // Используйте реальные имена полей из вашего API
            // Рейтинг
            vote_average: data.vote_average || data.vote || null,
            // Качество (например, "4K", "webdl")
            quality: data.quality || data.release_quality || null,
            // Год релиза
            release_year: ((data.year || data.release_date || '') + '').slice(0, 4),
            // Тип контента ("tv" или "movie")
            type: data.first_air_date ? 'tv' : 'movie', // Пример: если API предоставляет поле 'first_air_date', считаем это сериалом
            original_name: data.original_name // Оригинальное название для истории и т.п.
        };

         // Получаем HTML-код базовой структуры карточки из шаблона 'hanime-card'.
         // Этот шаблон должен быть определен РАНЕЕ и использовать ТОЛЬКО стандартные классы Lampa.
        var cardTemplate = Lampa.Template.get('hanime-card', {
            // Передаем в шаблон только поля, которые используются непосредственно в его статической части (картинка, заголовок).
            img: processedData.poster_path, // Будет использовано для src="". Динамическая загрузка в onVisible.
            title: processedData.title
        });

        // Создаем jQuery-объект DOM-элемента карточки из шаблона.
        var cardElement = $(cardTemplate);


        // --- Методы экземпляра HanimeCard ---

        // Метод для добавления иконки (закладка, история и т.д.) в стандартный контейнер.
        // Использует стандартные классы Lampa для иконок.
        this.addicon = function(name) {
             // Находим стандартный контейнер для иконок внутри карточки.
            var iconsContainer = cardElement.find('.card__icons-inner');
            if (iconsContainer.length) { // Убедимся, что контейнер найден.
                var icon = document.createElement('div');
                icon.classList.add('card__icon'); // Стандартный базовый класс Lampa для иконок.
                icon.classList.add('icon--'+name); // Класс для стилизации иконки по типу (например, icon--book).
                iconsContainer.append(icon);
                //console.log("HanimeCard:", processedData.title, "Added icon:", name);
            } // else console.warn("HanimeCard:", processedData.title, "Could not find .card__icons-inner to add icon:", name);
        }

         // Метод для динамического добавления/обновления деталей карточки (рейтинг, качество, тип, год).
         // Использует стандартные классы Lampa элементов. Вызывается после создания DOM.
         this.addDetails = function() {
             //console.log("HanimeCard:", processedData.title, "addDetails()");
              // Находим стандартную область просмотра картинки (.card__view). Сюда добавляются оверлеи (рейтинг, качество, тип).
             var viewElement = cardElement.find('.card__view');
             if (!(viewElement.length)) { // Проверяем, что viewElement найден.
                  console.warn("HanimeCard:", processedData.title, ".card__view not found in addDetails.");
                 return; // Выходим, если viewElement не найден.
             }


             // Добавление/обновление Рейтинга (.card__vote).
              let voteElement = cardElement.find('.card__vote'); // Находим элемент по стандартному классу.
              if (voteElement.length) { // Если элемент для рейтинга есть в шаблоне.
                  if (processedData.vote_average > 0) { // Проверяем наличие данных рейтинга.
                     voteElement.text(parseFloat(processedData.vote_average).toFixed(1)).show(); // Форматируем, устанавливаем текст, показываем.
                  } else {
                      voteElement.text('').hide(); // Скрываем элемент, если данных нет.
                  }
             } else { // Если элемента .card__vote нет в шаблоне.
                  console.warn("HanimeCard:", processedData.title, ".card__vote element not found in template.");
                  // Можно динамически создать элемент, если нужен, но предпочтительнее, чтобы он был в шаблоне с display: none по умолчанию.
                  if (processedData.vote_average > 0) { // Только если данные есть и элемент отсутствовал.
                       let newVoteElement = $('<div class="card__vote"></div>').text(parseFloat(processedData.vote_average).toFixed(1));
                       viewElement.append(newVoteElement); // Добавляем в view.
                       console.warn("HanimeCard:", processedData.title, "Added .card__vote element dynamically.");
                  }
             }


             // Добавление/обновление Качества (.card__quality).
            let qualityElement = cardElement.find('.card__quality'); // Находим элемент .card__quality.
             if (qualityElement.length) { // Если элемент качества есть в шаблоне.
                  let qualityTextElement = qualityElement.find('div'); // Находим внутренний div (стандартная структура).
                  if (processedData.quality && qualityTextElement.length) { // Проверяем данные и внутренний элемент.
                       qualityTextElement.text(processedData.quality).show(); // Устанавливаем текст, показываем.
                       qualityElement.show(); // Показываем родительский div.
                  } else {
                       qualityElement.text('').hide(); // Скрываем элемент, если данных нет.
                  }
            } else { // Если элемента .card__quality нет в шаблоне.
                 console.warn("HanimeCard:", processedData.title, ".card__quality element not found in template.");
                  if (processedData.quality) { // Только если данные есть и элемент отсутствовал.
                     let newQualityElement = $('<div class="card__quality"><div></div></div>');
                     newQualityElement.find('div').text(processedData.quality);
                     viewElement.append(newQualityElement);
                     console.warn("HanimeCard:", processedData.title, "Added .card__quality dynamically.");
                  }
            }


             // Добавление/обновление Типа (TV/Movie) (.card__type).
             let typeElement = cardElement.find('.card__type'); // Находим элемент .card__type.
              if (typeElement.length) { // Если элемент типа есть в шаблоне.
                  if (processedData.type && processedData.type !== 'movie') { // Обычно тип "Movie" не отображается. Проверяем, что тип не Movie и данные есть.
                       typeElement.text(processedData.type.toUpperCase()).show(); // Устанавливаем текст (TV, MOVIE) и показываем.
                  } else {
                      typeElement.text('').hide(); // Скрываем, если тип Movie или данных нет.
                  }
             } else { // Если элемента .card__type нет в шаблоне.
                 console.warn("HanimeCard:", processedData.title, ".card__type element not found in template.");
                 // Если элемента нет, но данные есть и не Movie, можно добавить динамически.
                  if (processedData.type && processedData.type !== 'movie') {
                     let newTypeElement = $('<div class="card__type"></div>').text(processedData.type.toUpperCase());
                     viewElement.append(newTypeElement);
                     console.warn("HanimeCard:", processedData.title, "Added .card__type dynamically.");
                  }
             }


             // Добавление/обновление Года (.card__age) - располагается под заголовком, не в view.
             let ageElement = cardElement.find('.card__age'); // Находим элемент .card__age.
             if (ageElement.length) { // Если элемент года есть в шаблоне.
                  if (processedData.release_year && processedData.release_year !== '0000') { // Проверяем наличие и значение года.
                      ageElement.text(processedData.release_year).show(); // Устанавливаем текст, показываем.
                  } else {
                       ageElement.text('').hide(); // Скрываем элемент, если года нет или он "0000".
                  }
             } else { // Если элемента .card__age нет в шаблоне.
                 console.warn("HanimeCard:", processedData.title, ".card__age element not found in template.");
                  // Если элемента нет, но год есть и не 0000, можно добавить динамически.
                  if (processedData.release_year && processedData.release_year !== '0000') {
                     let newAgeElement = $('<div class="card__age"></div>').text(processedData.release_year);
                       let titleElement = cardElement.find('.card__title');
                       if(titleElement.length) titleElement.after(newAgeElement); // Добавляем после заголовка.
                       else cardElement.append(newAgeElement); // Добавляем в конец, если нет заголовка.
                       console.warn("HanimeCard:", processedData.title, "Added .card__age dynamically as not found in template.");
                  }
             }

             //console.log("HanimeCard:", processedData.title, "addDetails() completed.");
         }


        // Метод обновления иконок закладок и маркера состояния.
        // Использует стандартные классы маркеров и иконок Lampa.
        this.updateFavoriteIcons = function() {
             //console.log("HanimeCard:", processedData.title, "updateFavoriteIcons()");
             // Очищаем предыдущие иконки и маркеры из DOM.
            cardElement.find('.card__icons-inner').empty(); // Очищаем контейнер иконок.
            cardElement.find('.card__marker').remove(); // Удаляем старый маркер состояния.

            // Получаем статус закладки/состояния элемента с помощью Lampa.Favorite.
             var status = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(processedData) : {};
             //if(Object.keys(status).length === 0 && window.Lampa && Lampa.Favorite) console.warn("HanimeCard:", processedData.title, "Failed to get favorite status. Lampa.Favorite may be missing.");


            // Добавляем стандартные иконки Lampa в контейнер иконок (.card__icons-inner)
            // в зависимости от статуса закладки.
            if (status.book) this.addicon('book');     // Иконка "Запланировано"
            if (status.like) this.addicon('like');     // Иконка "Нравится"
            if (status.wath) this.addicon('wath');     // Иконка "Просматриваю"
             // Проверяем статус просмотра (просмотрено ли полностью или есть прогресс в истории/таймлайне Lampa).
            if (status.history || (window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched === 'function' && Lampa.Timeline.watched(processedData))) this.addicon('history'); // Иконка "Просмотрено"

            // Логика отображения текстового маркера состояния (Смотрю, Просмотрено и т.п.) над постером.
             var marks = ['look', 'viewed', 'scheduled', 'continued', 'thrown']; // Стандартные типы маркеров Lampa
             var activeMarker = marks.find(m => status[m]); // Ищем, какой маркер активен.

             if (activeMarker) {
                 // Если активный маркер найден, добавляем его DOM-элемент со стандартным классом .card__marker.
                 var markerElement = cardElement.find('.card__marker'); // Находим элемент, если уже существует в шаблоне.
                 if (!markerElement.length) { // Если элемента маркера нет в шаблоне, создаем его динамически.
                     markerElement = $('<div class="card__marker"><span></span></div>'); // Стандартная структура маркера.
                      var viewElement = cardElement.find('.card__view'); // Маркер добавляется внутрь .card__view (над постером).
                      if(viewElement.length) viewElement.append(markerElement);
                      //else console.warn("HanimeCard:", processedData.title, "Could not find .card__view to add .card__marker dynamically.");
                 }
                 // Устанавливаем текст маркера, используя переводчик Lampa (Lampa.Lang).
                 markerElement.find('span').text(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function' ? Lampa.Lang.translate('title_' + activeMarker) : activeMarker);
                 // Добавляем класс, специфичный для типа маркера (card__marker--look, card__marker--viewed и т.д.). Эти классы стилизуются в основном CSS Lampa.
                 markerElement.removeClass(marks.map(m => 'card__marker--' + m).join(' ')) // Удаляем старые классы типов.
                             .addClass('card__marker--' + activeMarker); // Добавляем новый класс типа.
                 //console.log("HanimeCard:", processedData.title, "Added/Updated marker:", activeMarker);
             } else {
                 // Если нет активного маркера, убеждаемся, что его DOM-элемент удален.
                 cardElement.find('.card__marker').remove();
             }
             //console.log("HanimeCard:", processedData.title, "updateFavoriteIcons() completed.");
        };

        // Метод вызывается Lampa (например, Scroll компонентом), когда DOM-элемент этой карточки становится видимым на экране.
        // Используется для отложенной загрузки изображений и обновления иконок/деталей.
        this.onVisible = function() {
             //console.log("HanimeCard:", processedData.title, "onVisible()");
             var imgElement = cardElement.find('.card__img'); // Находим стандартный DOM-элемент картинки (.card__img).

             // Проверяем, нужно ли загружать картинку (если src пустой, или содержит стандартный placeholder img_load.svg).
             if (imgElement.length && (!imgElement.attr('src') || imgElement.attr('src').includes('img_load.svg'))) {
                 var src = processedData.poster_path; // Получаем URL картинки из обработанных данных.

                 // Используем стандартную Lampa логику загрузки картинок с кэшированием (Lampa.ImageCache).
                 // Это предпочтительный способ в Lampa.
                 if(window.Lampa && Lampa.ImageCache && typeof Lampa.ImageCache.read === 'function' && typeof Lampa.ImageCache.write === 'function') {
                      // Пробуем прочитать картинку из кэша. read вернет true и установит src, если найдена в кэше.
                      if(!Lampa.ImageCache.read(imgElement[0], src)) { // Передаем нативный DOM-элемент img.
                         // Если картинка не найдена в кэше, устанавливаем обработчики событий onload/onerror
                         // и устанавливаем src для начала загрузки.
                          imgElement[0].onload = () => {
                              cardElement.addClass('card--loaded'); // Добавляем стандартный класс 'card--loaded' (для CSS opacity).
                              Lampa.ImageCache.write(imgElement[0], imgElement[0].src); // Записываем картинку в кэш после успешной загрузки.
                              //console.log("HanimeCard:", processedData.title, "Image loaded and cached:", src);
                          };
                          imgElement[0].onerror = () => {
                               console.error('Hanime Plugin: Image load error for', processedData.title, src);
                               imgElement.attr('src', './img/img_broken.svg'); // При ошибке загрузки устанавливаем заглушку "битая картинка".
                               // Можно уведомить Lampa TMDB, если этот компонент доступен.
                               if(window.Lampa && Lampa.Tmdb && typeof Lampa.Tmdb.broken === 'function') Lampa.Tmdb.broken();
                          };
                          // Устанавливаем src. Используем fallback, если src пустой.
                          imgElement.attr('src', src || './img/img_broken.svg');
                          //console.log("HanimeCard:", processedData.title, "Image processing started:", src);
                      } else {
                         // Если картинка успешно загружена из кэша, добавляем класс 'card--loaded' сразу (т.к. onload не сработает).
                         cardElement.addClass('card--loaded');
                         //console.log("HanimeCard:", processedData.title, "Image loaded from cache:", src);
                      }
                 } else {
                     // Fallback, если Lampa.ImageCache недоступен. Простая загрузка картинки с обработчиками.
                     console.warn("Hanime Plugin:", processedData.title, "Lampa.ImageCache not available. Using basic image loading.");
                      imgElement[0].onload = () => { cardElement.addClass('card--loaded'); console.log("HanimeCard:", processedData.title, "Image loaded (basic):", src); };
                     imgElement[0].onerror = () => { console.error('Hanime Plugin: Image load error (basic) for', processedData.title, src); imgElement.attr('src', './img/img_broken.svg'); };
                     imgElement.attr('src', src || './img/img_broken.svg');
                     //console.log("HanimeCard:", processedData.title, "Image processing started (basic):", src);
                 }
             } else {
                 //console.log("HanimeCard:", processedData.title, "Image already loaded or placeholder set.");
             }

            // Обновляем иконки закладок и маркер статуса при появлении карточки в видимой области.
            // Это гарантирует, что их состояние будет актуальным.
            this.updateFavoriteIcons();
        }

        // Метод для первоначальной настройки экземпляра HanimeCard после создания ее DOM-элемента из шаблона.
        // Навешиваются стандартные обработчики событий Lampa (hover:*).
        // Этот метод вызывается при первом вызове .render().
        this.create = function(){
             //console.log("HanimeCard:", processedData.title, "create()");

             // Проверяем, был ли create вызван ранее (по data-атрибуту), чтобы не дублировать инициализацию.
             if (cardElement.data('created')) {
                 //console.log("HanimeCard:", processedData.title, "create() already called.");
                 return;
             }


             // Привязываем стандартные события Lampa hover:* к корневому DOM-элементу карточки (jQuery-объекту).
             // Эти события генерируются Lampa.Controller при навигации с пульта.
             // Обработка этих событий делегируется методам родительского компонента (componentRef).
             if (cardElement && typeof cardElement.on === 'function') {
                cardElement.on('hover:focus', function () {
                     // Событие: карточка получила программный фокус от Controller (имитация ховера).
                     //console.log("HanimeCard:", processedData.title, "hover:focus");
                     // Сообщаем родительскому компоненту, чтобы он прокрутил Scroll к этой карточке.
                     if (componentRef && componentRef.updateScrollToFocus && typeof componentRef.updateScrollToFocus === 'function') {
                          componentRef.updateScrollToFocus(cardElement); // Передаем jQuery-объект карточки.
                     }
                     // Обновляем состояние самой карточки (иконки, маркеры) при получении фокуса.
                     this.update();
                }.bind(this)); // Важно привязать контекст `this` к экземпляру HanimeCard.

                 cardElement.on('hover:enter', function () {
                    // Событие: на карточке нажали кнопку OK/Enter.
                    //console.log("HanimeCard:", processedData.title, "hover:enter");
                     // Обработку выбора делегируем родительскому компоненту (например, запуск плеера или переход на детальную страницу).
                     if (componentRef && componentRef.onCardClick && typeof componentRef.onCardClick === 'function') {
                         componentRef.onCardClick(processedData); // Передаем данные карточки.
                     }
                }.bind(this));

                cardElement.on('hover:long', function(){
                     // Событие: на карточке нажали и удерживали кнопку OK (долгое нажатие).
                     //console.log("HanimeCard:", processedData.title, "hover:long");
                     // Показ контекстного меню делегируем родительскому компоненту.
                     if (componentRef && componentRef.showCardContextMenu && typeof componentRef.showCardContextMenu === 'function') {
                          componentRef.showCardContextMenu(cardElement, processedData); // Передаем DOM и данные карточки.
                     }
                 }.bind(this));
             } else {
                 console.warn("HanimeCard:", processedData.title, "jQuery object or .on() method not available to attach hover events.");
             }


            // Привязываем стандартное Lampa событие 'visible' к нативному DOM-элементу карточки.
            // Это событие генерируется Lampa (например, Scroll компонентом) когда элемент появляется в видимой области.
             this.card = cardElement[0]; // Получаем нативный DOM-элемент для использования с addEventListener.
             if (this.card && typeof this.card.addEventListener === 'function') {
                this.card.addEventListener('visible', this.onVisible.bind(this)); // Привязываем метод onVisible.
                //console.log("HanimeCard:", processedData.title, "Attached 'visible' event listener to native DOM element.");
             } else {
                 console.warn("HanimeCard:", processedData.title, "Native DOM element or addEventListener missing for 'visible' event.");
             }


            // Динамически добавляем детали (рейтинг, качество, тип, год) и вызываем первое обновление (иконки, маркер).
            // Используем setTimeout с задержкой 0 мс, чтобы гарантировать, что DOM-элемент карточки
            // добавлен в дерево документа, прежде чем пытаться найти его дочерние элементы (.card__vote, .card__icons-inner и т.д.).
             setTimeout(() => {
                  // Проверяем, что cardElement все еще существует перед выполнением логики.
                  if (cardElement && cardElement.length) {
                     this.addDetails(); // Добавляем/обновляем детали (рейтинг, качество, год, тип).
                     this.updateFavoriteIcons(); // Обновляем иконки закладок и маркер.
                      // Также вызываем update(), который в стандартной логике Card мог обновлять, например, полоску прогресса просмотра.
                      // if(typeof this.update === 'function') this.update();
                  } else {
                      console.warn("HanimeCard:", processedData.title, "cardElement missing in setTimeout callback.");
                  }
             }, 0); // Задержка 0 мс позволяет коду выполниться после отрисовки текущих синхронных задач.

             // Помечаем jQuery-объект data-атрибутом, чтобы избежать повторного вызова create() при следующих вызовах render().
             cardElement.data('created', true);
             //console.log("HanimeCard:", processedData.title, "create() finished. Element marked as created.");
        }

        // Метод обновления состояния карточки (иконки, маркер, возможно прогресс просмотра).
        // Вызывается из hover:focus и при других событиях, когда статус мог измениться.
        this.update = function(){
             //console.log("HanimeCard:", processedData.title, "update() called.");
             // Обновляем иконки закладок и маркер состояния.
             // В стандартном Card.js этот метод также отвечает за обновление полоски прогресса просмотра, если используется Lampa.Timeline.watched_status.
             this.updateFavoriteIcons();
             // Добавьте вызов обновления прогресс-бара, если ваша интеграция с Timeline требует этого здесь:
             // if(window.Lampa && Lampa.Timeline && typeof Lampa.Timeline.watched_status === 'function') Lampa.Timeline.watched_status(cardElement, processedData);
             // else console.warn("HanimeCard:", processedData.title, "Cannot update watched status, Lampa.Timeline missing.");

        }

        // Метод рендеринга. Возвращает DOM-элемент карточки.
        // Этот метод вызывается компонентом-владельцем (HanimeComponent.build()), когда нужно добавить карточку в DOM.
        this.render = function(js){
             //console.log("HanimeCard:", processedData.title, "render() called. jQuery object:", cardElement);
             // Вызываем метод create() только в первый раз, когда render() вызывается для данного экземпляра HanimeCard.
             if (!cardElement.data('created')) {
                 this.create();
             }
            return js ? cardElement[0] : cardElement; // Возвращаем нативный DOM-элемент или jQuery-объект.
        }

        // Метод уничтожения экземпляра HanimeCard. Освобождает ресурсы.
        // Вызывается компонентом-владельцем (HanimeComponent.destroy()).
        this.destroy = function(){
             console.log("HanimeCard:", processedData.title, "destroy()");
             // Удаляем привязку события 'visible' с нативного DOM-элемента.
             if(this.card && typeof this.card.removeEventListener === 'function' && this.onVisible) this.card.removeEventListener('visible', this.onVisible.bind(this));
             // Удаляем сам DOM-элемент карточки из документа. jQuery .remove() удаляет и элементы, и их обработчики событий, привязанные jQuery.
             if(cardElement && typeof cardElement.remove === 'function') cardElement.remove();
             // Обнуляем ссылки на объекты и DOM-элементы для сборщика мусора.
             processedData = null; cardElement = null; this.card = null; componentRef = null;
             //console.log("HanimeCard:", processedData.title, "destroy() completed. Resources released.");
        }

        // ВАЖНО: HanimeCard НЕ должна вызывать .create() или .render() самостоятельно в своем конструкторе.
        // create() будет вызван при ПЕРВОМ вызове .render() компонентом-владельцем (HanimeComponent).
        // Таким образом, создание DOM и навешивание событий происходят только тогда, когда карточка действительно нужна для отображения.
    }


    // --- HanimeComponent: Компонент для отображения списка аниме в виде ВЕРТИКАЛЬНОЙ сетки ---
    // Использует структуру category-full и вертикальный скролл.
    function HanimeComponent(componentObject) { // componentObject - стандартный объект активности Lampa.
        var network = null; // Объект Lampa.Reguest для сетевых запросов.
        var scroll = null; // Объект Lampa.Scroll для управления прокруткой.

        var items = []; // Массив JS-объектов HanimeCard.
        var html = null; // Корневой DOM-контейнер компонента. Будет структурой категории.
        var itemsContainer = null; // Контейнер для самих карточек внутри Scroll (сетка).

        var active = 0; // Индекс текущего активного элемента в массиве items. Используется Lampa Controller для сохранения позиции.
        var last = null; // Ссылка на нативный DOM-элемент последней сфокусированной карточки. Используется для восстановления фокуса Controller-ом.

        // URL для загрузки каталога. Поскольку это единственный компонент, он грузит "Новое".
        var CATALOG_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club/catalog/movie/newset.json";
        var STREAM_URL_TEMPLATE = "https://86f0740f37f6-hanime-stremio.baby-beamup.club/stream/movie/{id}.json";
        var META_URL_TEMPLATE = "https://86f0740f37f6-hanime-stremio.baby-beamup.club/meta/movie/{id}.json";
        var PROXY_BASE_URL = "http://77.91.78.5:3000"; // Адрес вашего прокси.


        // Метод для построения основной структуры DOM компонента (вертикальная сетка category-full).
        // Использует стандартные классы Lampa для лейаута категории. Вызывается в create().
        this.buildLayout = function() {
             //console.log("HanimeComponent: buildLayout()");
             // Создаем корневой DOM-элемент компонента, который будет содержать Scroll.
             // Scroll внутри будет управлять элементами сетки.
            html = $(`
                <div class="category-layout layer--render"> <!-- Общий контейнер для категории -->
                     <div class="category-title">Hanime Catalog</div> <!-- Заголовок категории (можно получить из Activity title) -->
                     <!-- Scroll компонент Lampa будет вставлен здесь и обернет элементы сетки -->
                 </div>
            `);

            // В компонентах Category, контейнером для самих элементов сетки (.card)
            // является div с классом category-full, который располагается внутри структуры Scroll.
            // Наш itemsContainer будет этим div'ом с классом category-full.
             itemsContainer = $('<div class="category-full"></div>'); // Стандартный класс для контейнера элементов сетки.

             console.log("HanimeComponent: buildLayout completed. Initial DOM structure ready for category-full.");
        };

        // Метод для загрузки данных каталога из API.
        // Вызывается в create().
        this.fetchCatalog = function () {
            var _this = this;
             // Показываем индикатор загрузки Lampa активности. Проверяем наличие activity и loader.
             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true);
             //else console.warn("HanimeComponent: Activity loader not available in fetchCatalog.");

             console.log("HanimeComponent: fetchCatalog() - Starting request to", CATALOG_URL);

             // Инициализируем Lampa.Reguest компонент, если еще не создан.
             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeComponent: Lampa.Reguest initialized.");
             } else if (!network) console.warn("HanimeComponent: Network component not initialized, Lampa.Reguest missing.");


             // Если network компонент доступен, отменяем все предыдущие запросы.
             if (network && typeof network.clear === 'function') network.clear();
             //else console.warn("HanimeComponent: Network clear method not available.");


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

            // Инициализируем Lampa.Scroll компонент (ВЕРТИКАЛЬНЫЙ - по умолчанию).
             if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                   scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 }); // Vertical Scroll by default
                   console.log("HanimeComponent: Lampa.Scroll initialized (vertical).");
             } else if (!scroll) console.warn("HanimeComponent: Scroll not initialized in build().");


             // Если Scroll инициализирован, прокручиваем его в начало.
             if(scroll && typeof scroll.minus === 'function') scroll.minus();
             else console.warn("HanimeComponent: Scroll or scroll.minus method not available in build(). Cannot scroll to beginning.");

             // Убеждаемся, что itemsContainer (категория-сетка), Scroll и другие зависимости доступны.
             if (!(itemsContainer && typeof itemsContainer.empty === 'function' && scroll && typeof scroll.append === 'function' && typeof scroll.render === 'function' && html && typeof html.append === 'function' && window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function')) {
                  console.error("HanimeComponent: Missing critical DOM/Lampa dependencies in build(). Aborting UI build.");
                   if (_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                  _this.empty("Не удалось построить интерфейс.");
                  return;
             }


            // Очищаем контейнер для карточек и массив объектов HanimeCard перед добавлением новых элементов.
            itemsContainer.empty(); // Удаляем все предыдущие DOM-элементы карточек из itemsContainer (.category-full).
            items = []; // Очищаем массив JS-объектов HanimeCard.


            // Создаем и добавляем новые HanimeCard для каждого элемента из данных.
            if(itemsContainer && scroll) { // Повторная проверка перед циклом forEach.
                 result.forEach(function (meta) {
                     // Создаем новый экземпляр HanimeCard, передавая данные и ссылку на текущий HanimeComponent (_this).
                    var card = new HanimeCard(meta, _this); // new HanimeCard(data, componentRef)
                     // Получаем jQuery-объект корневого DOM-элемента этой карточки.
                    var cardElement = card.render();

                     // Добавляем DOM-элемент карточки в itemsContainer (.category-full).
                     itemsContainer.append(cardElement);
                     // Сохраняем объект HanimeCard в массиве items.
                    items.push(card);
                });
                 console.log("HanimeComponent: Created and added", items.length, "cards to itemsContainer (.category-full).");

                 // Добавляем itemsContainer (.category-full) в Scroll компонент как его содержимое.
                 // Lampa.Scroll автоматически обернет вокруг itemsContainer свою внутреннюю DOM-структуру.
                 if (typeof scroll.append === 'function') scroll.append(itemsContainer);
                 else console.error("HanimeComponent: Scroll append method not available.");

                // Вставляем рендер Scroll компонента в основной DOM-контейнер компонента (html).
                // scroll.render() возвращает корневой DOM-элемент Scroll.
                // true в scroll.render(true) заставляет Scroll пересчитать свои размеры и положение.
                if (html) { // Убедимся, что html доступен.
                     html.append(scroll.render(true)); // В компонентах Category, scroll render добавляется ВНУТРИ общего html контейнера.
                     //console.log("HanimeComponent: Scroll rendered into main html container.");
                } else console.error("HanimeComponent: Main html container not available to append scroll render.");


            } else {
                console.error("HanimeComponent: Required objects or methods missing before building cards in build().");
                if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка плагина при создании карточек.', 5000);
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
             // (Стандартная реализация showCardContextMenu, делегирует Lampa.Select)
             console.log("HanimeComponent: showCardContextMenu for", cardData.title);
             var _this = this;

             // Определяем имя текущего активного контроллера Lampa.
             var enabled = (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled()) ? Lampa.Controller.enabled().name : null;

             // Получаем статус закладок для элемента.
             var status  = (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.check === 'function') ? Lampa.Favorite.check(cardData) : {};


             // Формируем пункты меню.
             var menu_favorite = [];
             if(window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') {
                 menu_favorite = [
                     { title: Lampa.Lang.translate('title_book'), where: 'book', checkbox: true, checked: status.book }, // Запланировано
                     { title: Lampa.Lang.translate('title_like'), where: 'like', checkbox: true, checked: status.like }, // Нравится
                     { title: Lampa.Lang.translate('title_wath'), where: 'wath', checkbox: true, checked: status.wath }, // Смотрю
                     { title: Lampa.Lang.translate('menu_history'), where: 'history', checkbox: true, checked: status.history }, // История
                     { title: Lampa.Lang.translate('settings_cub_status'), separator: true } // Разделитель
                 ];
             } else { // Fallback переводы
                 console.warn("HanimeComponent: Lampa.Lang missing, using default texts for menu.");
                  menu_favorite = [
                      { title: 'Planned', where: 'book', checkbox: true, checked: status.book },
                     { title: 'Liked', where: 'like', checkbox: true, checked: status.like },
                     { title: 'Watching', where: 'wath', checkbox: true, checked: status.wath },
                     { title: 'History', where: 'history', checkbox: true, checked: status.history },
                     { title: 'Status', separator: true }
                  ];
             }


             // Показываем стандартное контекстное меню Lampa (Lampa.Select).
             if (window.Lampa && Lampa.Select && typeof Lampa.Select.show === 'function') {
                 Lampa.Select.show({
                     title: (window.Lampa && Lampa.Lang && typeof Lampa.Lang.translate === 'function') ? Lampa.Lang.translate('title_action') : 'Action',
                     items: menu_favorite,
                     onBack: ()=>{ if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled); console.log("Menu back."); },
                     onCheck: (a)=>{
                         console.log("Menu checked:", a.where);
                         if(window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function') Lampa.Favorite.toggle(a.where, cardData);
                         var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                          if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                         else console.warn("Failed to find Card object after onCheck.");
                     },
                     onSelect: (a)=>{
                          console.log("Menu selected:", a);
                          if(a.collect && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.toggle === 'function'){
                              Lampa.Favorite.toggle(a.where, cardData);
                               var cardObj = items.find(item => item && typeof item.render === 'function' && item.render(true) === cardElement[0]);
                              if(cardObj && typeof cardObj.updateFavoriteIcons === 'function') cardObj.updateFavoriteIcons();
                              else console.warn("Failed to find Card object after onSelect.");
                          }
                          if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                           if (window.Lampa && Lampa.Controller && enabled) Lampa.Controller.toggle(enabled);
                            console.log("Menu closed.");
                     },
                      // Метод для настройки внешнего вида каждого пункта меню (для иконки замка Premium).
                      onDraw: (item, elem) => {
                           if (elem.collect && window.Lampa && Lampa.Account && typeof Lampa.Account.hasPremium === 'function' && !Lampa.Account.hasPremium()) {
                                let lockIconTemplate = (window.Lampa && Lampa.Template && typeof Lampa.Template.get === 'function' && Lampa.Template.has('icon_lock')) ? Lampa.Template.get('icon_lock') : null;
                                if (lockIconTemplate && window.$ && typeof item.find === 'function' && typeof item.append === 'function' && typeof item.off === 'function' && typeof item.on === 'function') {
                                     let wrap = $('<div class="selectbox-item__lock"></div>');
                                     wrap.append($(lockIconTemplate));
                                     item.find('.selectbox-item__checkbox').remove();
                                     item.append(wrap);
                                     item.off('hover:enter').on('hover:enter', () => {
                                         if(window.Lampa && Lampa.Select && typeof Lampa.Select.close === 'function') Lampa.Select.close();
                                          if (window.Lampa && Lampa.Account && typeof Lampa.Account.showCubPremium === 'function') Lampa.Account.showCubPremium();
                                     });
                                } // else missing lock icon template or methods
                           }
                      }
                 });
             } else { console.warn("Lampa.Select missing."); if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Компонент меню недоступен.', 5000); }
         };

        // Метод для прокрутки Scroll компонента к заданному DOM-элементу карточки.
        // Вызывается из HanimeCard в ответ на событие 'hover:focus'.
        this.updateScrollToFocus = function(element) {
             console.log("HanimeComponent: updateScrollToFocus called.");
             // Проверяем наличие Scroll и его метода update.
             // 'element' - это jQuery объект карточки, element[0] - нативный DOM элемент.
             if (scroll && typeof scroll.update === 'function' && element && typeof element.length === 'number' && element.length > 0 && element[0]) {
                 last = element[0]; // Сохраняем ссылку на нативный DOM-элемент для восстановления фокуса.
                 scroll.update(element[0], true); // Вызываем update. Передаем нативный DOM элемент для надежности. true = плавная прокрутка.
                  console.log("HanimeComponent: Scroll updated.");
             } else { console.warn("Scroll or element missing for scroll update."); }
        }


        this.fetchStreamAndMeta = function (id, meta) {
             // (Реализация fetchStreamAndMeta, копипаста из предыдущего кода, добавил проверки методов)
             var _this = this;
            var streamUrl = STREAM_URL_TEMPLATE.replace('{id}', id);
            var metaUrl = META_URL_TEMPLATE.replace('{id}', id);

             if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(true); else console.warn("Activity loader missing.");
            console.log("HanimeComponent: fetchStreamAndMeta for ID:", id);
            if (!network || typeof network.native !== 'function') { console.error("Network missing."); if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Сетевой компонент недоступен.', 5000); return; }

            Promise.all([
                new Promise((resolve, reject) => { if(streamUrl && network && typeof network.native === 'function') network.native(streamUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 }); else reject('Stream URL/Network/native missing'); }),
                meta ? Promise.resolve({ meta: meta }) : new Promise((resolve, reject) => { if(metaUrl && network && typeof network.native === 'function') network.native(metaUrl, resolve, reject, false, { dataType: 'json', timeout: 10000 }); else reject('Meta URL/Network/native missing'); })
            ]).then(([streamData, metaDataResponse]) => {
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                const fullMetaData = metaDataResponse ? (metaDataResponse.meta || metaDataResponse) : null;
                //console.log("Stream data:", streamData, "Meta data:", fullMetaData);

                if (streamData && streamData.streams && Array.isArray(streamData.streams) && streamData.streams.length > 0) {
                    var streamToPlay = streamData.streams[0];
                    var finalStreamUrl = streamToPlay ? streamToPlay.url : null;
                    if(finalStreamUrl && typeof finalStreamUrl === 'string') {
                         try { var url = new URL(finalStreamUrl); if (url.hostname && url.hostname.includes('highwinds-cdn.com') && PROXY_BASE_URL) finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`; } catch (e) { console.error("URL parse/proxy error:", e); }
                    }

                    var playerObject = { title: fullMetaData ? (fullMetaData.name || fullMetaData.title || 'Без названия') : 'Без названия', url: finalStreamUrl, poster: fullMetaData ? (fullMetaData.poster || fullMetaData.background || '') : '' };

                    if (playerObject.url && window.Lampa && Lampa.Player && typeof Lampa.Player.play === 'function' && typeof Lampa.Player.playlist === 'function') {
                         console.log("Launching player."); Lampa.Player.play(playerObject); Lampa.Player.playlist([playerObject]);
                         if (fullMetaData && window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.add === 'function') {
                                const historyMeta = { id: fullMetaData.id || '', title: fullMetaData.name || fullMetaData.title || '', poster: fullMetaData.poster || fullMetaData.background || '', runtime: fullMetaData.runtime, year: fullMetaData.year, original_name: fullMetaData.original_name || '' };
                                Lampa.Favorite.add('history', historyMeta, 100); console.log("Added to history.");
                         } else console.warn("Favorite/Add missing.");
                    } else { console.error("Player/URL missing."); if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show(playerObject.url ? 'Компонент плеера недоступен.' : 'Не удалось получить ссылку на поток.', 5000); }

                } else { console.warn("No streams found."); if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Потоки не найдены для этого аниме.', 5000); }

            }).catch(error => {
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false);
                console.error("Error fetching stream/meta:", error);
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка загрузки деталей: ' + (typeof error === 'string' ? error : error.message || 'Неизвестная ошибка'), 5000);
            });
        };

        // Метод для отображения пустого состояния каталога или ошибки загрузки.
        this.empty = function (msg) {
             console.log("HanimeComponent: empty() -", msg);
             if (window.Lampa && Lampa.Empty && typeof Lampa.Empty === 'function' && typeof Lampa.Empty.prototype.render === 'function') {
                 var empty = new Lampa.Empty({ message: msg });
                 // В Category layout, Scroll обернут в дополнительные div. Нам нужно найти div, куда добавить empty.
                 // Полагаемся на то, что html это корневой контейнер.
                 if(html && typeof html.empty === 'function' && typeof html.append === 'function') html.empty().append(empty.render(true));
                 else console.warn("Html container missing for empty.");
                 if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                 if (typeof empty.start === 'function') this.start = empty.start; else console.warn("Empty start missing.");
                  console.log("Displayed Empty state.");
             } else {
                  console.warn("Lampa.Empty missing. Basic text fallback.");
                  if(html && typeof html.empty === 'function' && typeof html.text === 'function') html.empty().text(msg + ' (Empty component missing)');
                  if(_this.activity && typeof _this.activity.loader === 'function') _this.activity.loader(false); if(_this.activity && typeof _this.activity.toggle === 'function') _this.activity.toggle();
                   this.start = function() { if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') { Lampa.Controller.add('content', { back: this.back }); Lampa.Controller.toggle('content'); } }.bind(this);
             }
        };


        // Метод создания активности. Вызывается Lampa при первом переходе на эту активность.
        this.create = function () {
            console.log("HanimeComponent: create()");
             // Инициализируем Network компонент в начале создания компонента.
             if (!network && window.Lampa && typeof Lampa.Reguest === 'function') {
                  network = new Lampa.Reguest();
                  console.log("HanimeComponent: Lampa.Reguest initialized in create().");
             } else if (!network) console.warn("HanimeComponent: Network not initialized in create(), Lampa.Reguest missing.");

            // Построим основную DOM-структуру компонента (category-layout + category-title).
            this.buildLayout();

            // Инициализируем Scroll компонент в create() AFTER buildLayout().
             // ВЕРТИКАЛЬНЫЙ скролл по умолчанию. Step = 250 - шаг прокрутки.
            if (!scroll && window.Lampa && typeof Lampa.Scroll === 'function') {
                 scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
                  console.log("HanimeComponent: Lampa.Scroll initialized in create().");
             } else if (!scroll) console.warn("HanimeComponent: Scroll not initialized in create(), Lampa.Scroll missing.");


            // Если Scroll и itemsContainer (category-full) доступны,
            // привязываем itemsContainer к Scroll как его содержимое.
            // Scroll внутренне создаст обертку (scroll__content/scroll__body) вокруг itemsContainer.
             if(scroll && itemsContainer && typeof scroll.append === 'function') {
                 scroll.append(itemsContainer);
                  console.log("HanimeComponent: itemsContainer appended to scroll in create().");
             } else if (!itemsContainer) {
                 console.warn("HanimeComponent: itemsContainer missing in create(). Cannot append to scroll.");
             } else if (!scroll) {
                 console.warn("HanimeComponent: Scroll missing in create(). Cannot append itemsContainer.");
             } else {
                  console.warn("HanimeComponent: Scroll.append missing in create().");
             }


            // Вставляем DOM Scroll компонента в основной html контейнер.
             // Проверяем, что html контейнер доступен.
            if (html && scroll && typeof html.append === 'function' && typeof scroll.render === 'function') {
                 html.append(scroll.render(true)); // render(true) заставляет Scroll пересчитать размеры.
                 //console.log("HanimeComponent: Scroll render appended to html in create().");
             } else {
                 console.warn("HanimeComponent: Cannot append Scroll render to html in create(). Missing html, scroll, append, or render.");
             }


            // Показываем стандартный индикатор загрузки Lampa.
             if(this.activity && typeof this.activity.loader === 'function') this.activity.loader(true);
            // Запускаем загрузку данных каталога из API.
            this.fetchCatalog();
             console.log("HanimeComponent: create() finished. Fetching catalog initiated.");
        };

        // Метод запуска активности. Вызывается Lampa, когда активность становится видимой и должна получить фокус.
        this.start = function () {
            console.log("HanimeComponent: start()");
             // Проверяем, что текущая активность Lampa - именно эта.
            if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.active === 'function' && Lampa.Activity.active().activity !== this.activity) {
                console.log("Not active activity.");
                return;
            }
             console.log("HanimeComponent: Activity active. Setting up Lampa.Controller for vertical grid.");

            // Настраиваем Lampa.Controller для навигации в ВЕРТИКАЛЬНОЙ СЕТКЕ.
            // Controller управляет фокусом по элементам с классом '.selector' внутри контейнера, который мы ему укажем.
            // В Category/Grid компонентах, контейнером для Controller.collectionSet является DOM, который возвращает scroll.render().
            // Проверяем наличие Controller, Scroll, и их нужных методов.
            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function' && typeof Lampa.Controller.collectionSet === 'function' && typeof Lampa.Controller.collectionFocus === 'function' && scroll && typeof scroll.render === 'function') {

                 Lampa.Controller.add('content', {
                     toggle: function () {
                         console.log("HanimeComponent: Controller toggle().");
                         // 1. Указываем Controller-у коллекцию элементов для навигации.
                         //    В VERTICAL GRID, это Scroll's render, который содержит нашу .category-full.
                         if (Lampa.Controller && typeof Lampa.Controller.collectionSet === 'function' && scroll && typeof scroll.render === 'function') {
                              Lampa.Controller.collectionSet(scroll.render());
                              console.log("HanimeComponent: Controller collectionSet using scroll.render().");
                         } else console.warn("Controller.collectionSet or scroll/render missing in toggle.");


                         // 2. Устанавливаем начальный фокус (на last элемент, если есть, или на первый).
                         //    Этот вызов ВЫЗЫВАЕТ стандартное событие 'hover:focus' на элементе.
                         if (Lampa.Controller && typeof Lampa.Controller.collectionFocus === 'function' && scroll && typeof scroll.render === 'function') {
                              Lampa.Controller.collectionFocus(last || false, scroll.render());
                              console.log("HanimeComponent: Controller collectionFocus called.");
                         } else console.warn("Controller.collectionFocus or scroll/render missing in toggle.");

                          console.log("HanimeComponent: Controller setup finished in toggle().");
                     }.bind(this), // Важно привязать контекст this

                     // Обработчики навигационных кнопок пульта/стрелок ДЛЯ ВЕРТИКАЛЬНОЙ СЕТКИ:
                     left: function () {
                         // Перемещение влево ВНУТРИ СТРОКИ (между карточками в одной горизонтальной линии).
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('left')) Navigator.move('left');
                          // Если у левого края сетки, переключаем на меню.
                         else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('menu');
                          else console.log("Nav left blocked/menu unavailable.");
                     },
                     right: function () {
                          // Перемещение вправо ВНУТРИ СТРОКИ.
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('right')) Navigator.move('right');
                          else console.log("Nav right blocked.");
                     },
                     up: function () {
                         // Перемещение ВВЕРХ на ПРЕДЫДУЩУЮ СТРОКУ карточек.
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('up')) Navigator.move('up');
                          // Если на ВЕРХНЕЙ строке сетки, переключаем на Controller шапки активности ('head').
                         else if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.toggle === 'function') Lampa.Controller.toggle('head');
                          else console.log("Nav up blocked/head unavailable.");
                     },
                     down: function () {
                          // Перемещение ВНИЗ на СЛЕДУЮЩУЮ СТРОКУ карточек.
                         if (window.Navigator && typeof Navigator.canmove === 'function' && typeof Navigator.move === 'function' && Navigator.canmove('down')) {
                             Navigator.move('down');
                              // TODO: Здесь может понадобиться логика загрузки следующей страницы при прокрутке к последней видимой строке, если у вас пагинация.
                         } else { console.log("Nav down blocked/no elements below."); }
                     },
                     // Назначаем метод back нашего компонента в качестве обработчика кнопки "Назад".
                     back: this.back
                 });

                 // Активируем наш Controller 'content'. Это приведет к вызову его метода toggle().
                 Lampa.Controller.toggle('content');
                  console.log("HanimeComponent: Controller 'content' toggled. Initial focus setup.");

                 // Initial scroll to focus happens automatically via hover:focus triggered by Controller.collectionFocus.

             } else {
                console.error("HanimeComponent: CRITICAL: Lampa.Controller or scroll, or required methods NOT available in start(). Cannot setup main Controller.");
                 // Fallback: If Controller missing, try adding basic Back controller
                 if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.add === 'function' && typeof Lampa.Controller.toggle === 'function') {
                     console.log("Attempting basic Controller for Back button.");
                     Lampa.Controller.add('content', { back: this.back });
                     Lampa.Controller.toggle('content');
                 } else console.warn("Lampa.Controller missing for fallback.");
            }
        };

        // Метод, вызываемый при паузе активности.
        this.pause = function () {
             console.log("HanimeComponent: pause()");
             // Сохраняем ссылку на DOM-элемент, который был в фокусе, для восстановления.
             if(window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.item === 'function') {
                 last = Lampa.Controller.item() || last; // Get current focused element
                  console.log("HanimeComponent: Paused. Saved last focused item:", last);
             } //else console.log("Pause - controller inactive or missing.");
        };

        // Метод, вызываемый при остановке активности.
        this.stop = function () { //console.log("HanimeComponent: stop()");
        };

        // Метод рендеринга. Возвращает корневой DOM-элемент компонента.
        this.render = function () { //console.log("HanimeComponent: render()");
            if (!html) this.buildLayout(); // Build layout if not already built
            // In a standard Category/Grid component, scroll.render() IS the main content DOM that represents the scrollable grid.
            if (scroll && typeof scroll.render === 'function') {
                 return scroll.render(); // Return the scroll's root DOM
            } else {
                 // Fallback: If scroll is not ready, return the category-full div itself (itemsContainer).
                 console.warn("HanimeComponent: Scroll missing in render, returning itemsContainer (category-full) directly.");
                 return itemsContainer;
            }
        };

        // Метод уничтожения. Освобождает ресурсы.
        this.destroy = function () {
            console.log("HanimeComponent: destroy() called.");
            if(network && typeof network.clear === 'function') network.clear(); network = null; // Clear requests & nullify
             if (items && window.Lampa && Lampa.Arrays && typeof Lampa.Arrays.destroy === 'function') Lampa.Arrays.destroy(items); items = null; // Destroy Card instances
             if (scroll && typeof scroll.destroy === 'function') scroll.destroy(); scroll = null; // Destroy Scroll
             // Removing html might not be necessary if render() returns scroll.render(), as scroll.destroy should handle DOM.
             // But removing itemsContainer directly is bad as Scroll expects to manage it.
             // Let's be explicit about cleanup.
             if (html && typeof html.remove === 'function') html.remove(); html = null; // Remove main container
             itemsContainer = null; last = null; // Nullify references

            if (window.Lampa && Lampa.Controller && typeof Lampa.Controller.enabled === 'function' && typeof Lampa.Controller.remove === 'function') {
                 if (Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'content' && typeof Lampa.Controller.collectionSet === 'function') {
                      Lampa.Controller.collectionSet([]);
                 }
                 Lampa.Controller.remove('content');
                  console.log("Controller removed.");
            } else console.warn("Controller cleanup missing/unavailable.");
            console.log("HanimeComponent: destroy() finished.");
        };

        this.back = function () {
             console.log("HanimeComponent: back() called.");
             if(window.Lampa && Lampa.Activity && typeof Lampa.Activity.backward === 'function') Lampa.Activity.backward();
             else console.warn("Activity.backward missing.");
        };
    }


    // --- Глобальная функция инициализации плагина. ---
    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() invoked.");

         if (window.plugin_hanime_catalog_ready) { console.log("Hanime Plugin: Flag already set."); return; }


        // --- Логика инициализации, зависящая от Lampa. Выполняется после 'appready'. ---
        function initializeLampaDependencies() {
             console.log("Hanime Plugin: initializeLampaDependencies() called.");

             // Критические проверки Lampa компонентов.
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Template || typeof Lampa.Template !== 'object' || !Lampa.Component || typeof Lampa.Component !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Scroll || typeof Lampa.Scroll !== 'function' || !Lampa.Reguest || typeof Lampa.Reguest !== 'function') {
                  console.error("Hanime Plugin: CRITICAL: Lampa components missing after appready.");
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка инициализации плагина: Компоненты Lampa недоступны. Обновите Lampa или плагин.', 15000);
                  }
                  return;
             }
             console.log("Hanime Plugin: Lampa components checked OK.");

             // Устанавливаем глобальный флаг ПЛАГИНА после проверок Lampa.
              if (!window.plugin_hanime_catalog_ready) {
                 window.plugin_hanime_catalog_ready = true;
                 console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag set.");
              } // else flag already set

             // --- 1. Определение СТАНДАРТНЫХ ВНУТРЕННИХ шаблонов Lampa (fallback). ---
             // Add directly using Lampa.Template.add.
             console.log("Hanime Plugin: Adding standard template fallbacks...");
             if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                 Lampa.Template.add('card_vote_temp', '<div class="card__vote"></div>'); // Only basic div
                 Lampa.Template.add('card_quality_temp', '<div class="card__quality"><div></div></div>'); // div with inner div
                 Lampa.Template.add('card_year_temp', '<div class="card__age"></div>'); // Only basic div
                 Lampa.Template.add('card_type_temp', '<div class="card__type"></div>'); // Only basic div
                 Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
                  console.log("Standard template fallbacks added.");
             } // else add method missing

             // --- 2. Определение ВАШЕГО шаблона карточки 'hanime-card'. ---
             // Use only standard Lampa classes. Details like vote/quality/year/type
             // are handled by addDetails() in HanimeCard dynamically.
             console.log("Hanime Plugin: Adding hanime-card template...");
              if (Lampa.Template && typeof Lampa.Template.add === 'function') {
                 Lampa.Template.add('hanime-card', `
                     <div class="hanime-card card selector layer--visible layer--render">
                         <div class="card__view"> <!-- Standard card__view -->
                             <img src="./img/img_load.svg" class="card__img" alt="{title}" loading="lazy" /> <!-- Standard card__img -->
                             <div class="card__icons"> <!-- Standard card__icons -->
                                 <div class="card__icons-inner"></div> <!-- Standard card__icons-inner. Icons added dynamically. -->
                             </div>
                             <!-- PLACEHOLDERS for details like vote, quality, type -->
                              <!-- These div elements EXIST IN TEMPLATE but content added/updated dynamically by JS -->
                              <div class="card__vote"></div> <!-- vote text added here -->
                              <div class="card__quality"><div></div></div> <!-- quality text added here -->
                              <div class="card__type"></div> <!-- type text added here -->
                              <!-- Note: .card__marker is also dynamically added in addDetails/updateFavoriteIcons -->
                         </div>
                         <div class="card__title">{title}</div> <!-- Standard card__title -->
                         <div class="card__age"></div> <!-- Standard card__age. Year text added here. -->
                     </div>
                 `);
                  console.log("HanimeCard template added.");
             } // else add method missing


             // --- 3. CSS Стили ---
             // Removed all custom CSS. Relying on standard Lampa CSS.
             console.log("Hanime Plugin: Custom CSS REMOVED as requested. Relying on standard Lampa styles for .card, .items-line, .category-full etc.");


             // --- 4. Регистрируем ВАШ основной компонент (HanimeComponent) в Lampa Component Manager. ---
             console.log("Hanime Plugin: Registering HanimeComponent...");
             if (window.Lampa && Lampa.Component && typeof Lampa.Component.add === 'function') {
                 Lampa.Component.add('hanime_catalog', HanimeComponent); // Register the main component (Vertical Grid)
                 console.log("HanimeComponent registered successfully.");
             } else {
                 console.error("Lampa.Component.add missing. Cannot register components.");
                 if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Ошибка плагина: Не удалось зарегистрировать компоненты.', 5000);
             }


             // --- 5. Добавляем пункт меню. ---
             console.log("Hanime Plugin: Calling addMenuItem()...");
             addMenuItem();
              console.log("addMenuItem() called from initializeLampaDependencies.");

              console.log("initializeLampaDependencies() finished.");
        }


        // --- Функция добавления пункта меню. ---
        // Adds a menu item to Lampa's main menu to launch the HanimeComponent (Vertical Grid).
        function addMenuItem() {
             console.log("Hanime Plugin: addMenuItem() called.");

             // Strict check for required Lampa UI components before adding menu item
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Component || typeof Lampa.Component.get !== 'function') {
                  console.warn("addMenuItem cannot proceed: Lampa UI components missing.");
                  return;
             }
             var menuList = $('.menu .menu__list').eq(0);
             if (!menuList.length) {
                 console.warn("addMenuItem cannot proceed: Lampa menu DOM not found.");
                 return;
             }

             // Check if our MAIN component ('hanime_catalog' - the vertical grid view) is registered
             var mainComponentRegistered = Lampa.Component.get('hanime_catalog');
             if (!mainComponentRegistered) {
                 console.warn("addMenuItem skipping: Main component 'hanime_catalog' is not registered.");
                 return;
             }


             if (menuList.find('.menu__text:contains("Hanime Catalog")').length > 0) {
                 console.log("Menu item already exists. Skipping.");
                 return;
             }
             console.log("Adding menu item DOM element.");

            // Create menu item with standard Lampa classes
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

            if (typeof menu_item.on === 'function' && window.Lampa && Lampa.Activity && typeof Lampa.Activity.push === 'function') {
                menu_item.on('hover:enter', function () {
                     console.log("Menu item activated. Pushing 'hanime_catalog' activity.");
                    // Push our main component's activity
                    Lampa.Activity.push({
                        url: '', title: 'Hanime Catalog', component: 'hanime_catalog', page: 1
                    });
                     console.log("Activity.push called.");
                });
                console.log("'hover:enter' listener attached to menu item.");
            } else {
                console.warn("jQuery.on, Lampa.Activity, or push missing. Cannot attach menu item listener.");
            }

            menuList.append(menu_item);
            console.log("Menu item DOM element added.");

             console.log("addMenuItem finished.");
        }


        // --- ENTRY POINT: Wait for Lampa readiness ---
        console.log("Hanime Plugin: startPlugin() invoked. Setting up Lampa ready listener.");

         // Flag to prevent double init
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: Flag already set. Exiting startPlugin.");
             return;
         }
         // Flag is SET within initializeLampaDependencies *after* Lampa checks pass.


         // Use the most reliable method to wait for Lampa
         if (window.Lampa && typeof window.Lampa === 'object' && Lampa.Listener && typeof Lampa.Listener === 'object' && typeof Lampa.Listener.follow === 'function') {
             // Preferred method: Listen for the standard Lampa 'app:ready' event
             console.log("Hanime Plugin: Lampa Listener available. Subscribing to 'app:ready' event.");
             Lampa.Listener.follow('app', function (e) {
                 if (e.type === 'ready') {
                     console.log("Hanime Plugin: Lampa 'appready' event received. Calling initializeLampaDependencies.");
                     initializeLampaDependencies();
                 }
             });
             console.log("Subscribed to Lampa 'app:ready' event.");

         } else if (window.appready === true) { // Direct check for the appready flag
             // Fallback A: Lampa is already ready when this script runs (happens in some environments)
              console.warn("Hanime Plugin: Lampa Listener not available OR appready already true. Calling initializeLampaDependencies directly as fallback A.");
              initializeLampaDependencies(); // Call init directly

         } else {
             // Fallback B: Neither Listener nor appready is immediately available.
             // Attempting a delayed initialization. This is the least reliable.
             console.error("Hanime Plugin: Neither Listener nor 'appready' flag immediately available. Cannot reliably wait. Attempting delayed initialization as UNRELIABLE fallback B.");
             setTimeout(initializeLampaDependencies, 1000); // Try after 1 second
             console.log("Hanime Plugin: Delayed initialization fallback scheduled.");
         }

         console.log("Hanime Plugin: startPlugin() finished initial setup (listener or fallback).");
    }

    // Start the plugin process
    startPlugin();

})();
