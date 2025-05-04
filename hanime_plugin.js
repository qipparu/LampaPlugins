/**
 * Lampa Plugin: Hanime Catalog
 * Description: Displays anime cards fetched from the Hanime Stremio API.
 * Author: Your Name/Nickname
 * Version: 1.1.0
 */

(function () {
    'use strict';

    // --- Конфигурация ---
    const CONFIG = {
        API_BASE_URL: "https://86f0740f37f6-hanime-stremio.baby-beamup.club",
        // Получение основного каталога (последние добавленные)
        get CATALOG_URL() { return `${this.API_BASE_URL}/catalog/movie/newset.json`; },
        // Получение информации о потоках для конкретного ID
        getStreamUrl: function(id) { return `${this.API_BASE_URL}/stream/movie/${id}.json`; },
        // Получение метаданных для конкретного ID
        getMetaUrl: function(id) { return `${this.API_BASE_URL}/meta/movie/${id}.json`; },
        REQUEST_TIMEOUT: 15000, // 15 секунд
        DESCRIPTION_MAX_LENGTH: 150, // Макс. длина описания на карточке
        // Иконка для меню (пример - иконка "play"; замените на более подходящую, если есть)
        MENU_ICON_SVG: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M0 0h24v24H0z" fill="none"/>
                            <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                        </svg>`,
        MENU_ITEM_TITLE: 'Hanime Каталог' // Название пункта меню
    };

    // --- Утилиты ---

    /**
     * Безопасное получение вложенного свойства объекта
     * @param {object} obj - Исходный объект
     * @param {string} path - Путь к свойству (например, 'a.b.c')
     * @param {*} defaultValue - Значение по умолчанию, если путь не найден
     * @returns {*} - Значение свойства или defaultValue
     */
    function getNested(obj, path, defaultValue = null) {
        try {
            return path.split('.').reduce((o, k) => (o || {})[k], obj) || defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }

    /**
     * Отображает уведомление об ошибке пользователю и логирует в консоль.
     * @param {string} userMessage - Сообщение для пользователя.
     * @param {*} [errorDetails] - Дополнительные детали для консоли.
     */
    function showError(userMessage, errorDetails) {
        console.error("Hanime Plugin Error:", userMessage, errorDetails || '');
        Lampa.Noty.show(`Ошибка: ${userMessage}`);
    }

    // --- Компонент Карточки ---

    /**
     * Компонент карточки для аниме элемента.
     * @param {object} data - Объект метаданных аниме из API. Ожидаемая структура: { id, poster, name, description? }
     */
    function HanimeCard(data) {
        // Деструктуризация данных с значениями по умолчанию
        const {
            id = 'unknown',
            poster = '', // Можно указать URL заглушки Lampa.Utils.protocol() + '...'
            name = 'Без названия',
            description = 'Описание недоступно.'
        } = data; // (id, poster, name)

        // Обрезаем описание, если оно есть и длиннее лимита
        const shortDescription = description && description.length > CONFIG.DESCRIPTION_MAX_LENGTH
            ? `${description.substring(0, CONFIG.DESCRIPTION_MAX_LENGTH)}...`
            : description; //

        // Используем шаблон Lampa
        const cardTemplate = Lampa.Template.get('hanime-card', {
            id: id, //
            img: poster, //
            title: name, //
            // description: shortDescription // Раскомментируйте, если нужно отображать описание на карточке
        });

        const cardElement = $(cardTemplate);

        this.render = () => cardElement;
        this.destroy = () => cardElement.remove();
        // Добавляем метод для получения ID, если потребуется
        this.getId = () => id;
    }

    // --- Основной Компонент Каталога ---

    /**
     * Компонент для отображения каталога Hanime.
     * @param {object} componentObject - Конфигурация компонента Lampa.
     */
    function HanimeComponent(componentObject) {
        let network = new Lampa.Reguest();
        let scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        let items = []; // Массив экземпляров HanimeCard
        let html = $('<div class="hanime-catalog"></div>');
        let body = $('<div class="hanime-catalog__body category-full"></div>');
        let activity = this.activity; // Ссылка на Lampa Activity

        /**
         * Загрузка данных каталога.
         */
        const fetchCatalog = async () => {
            activity.loader(true);
            network.clear(); // Очищаем предыдущие запросы

            try {
                const data = await new Promise((resolve, reject) => {
                    network.native(CONFIG.CATALOG_URL, resolve, (status, text) => reject({ status, text }), false, {
                        dataType: 'json',
                        timeout: CONFIG.REQUEST_TIMEOUT
                    });
                });

                // Проверяем структуру ответа
                if (data && Array.isArray(data.metas)) {
                    build(data.metas); //
                } else {
                    console.error("Hanime Plugin: Неверный формат данных каталога", data);
                    displayEmpty("Не удалось получить список. Неверный формат ответа от сервера.");
                }
            } catch (error) {
                showError("Не удалось загрузить каталог", error);
                displayEmpty(`Не удалось загрузить каталог. ${error.status ? `Статус: ${error.status}` : ''}`);
            } finally {
                activity.loader(false);
            }
        };

        /**
         * Создание и отображение карточек на основе данных.
         * @param {Array<object>} metas - Массив объектов метаданных.
         */
        const build = (metas) => {
            // Очищаем предыдущие элементы и сбрасываем скролл
            items.forEach(item => item.destroy());
            items = [];
            body.empty();
            scroll.reset();

            if (!metas.length) {
                 displayEmpty("Каталог пуст.");
                 return;
            }

            metas.forEach(meta => { //
                if (!meta || !meta.id) { // Пропускаем невалидные элементы
                     console.warn("Hanime Plugin: Пропущен элемент с невалидными метаданными", meta);
                     return;
                }

                const card = new HanimeCard(meta);
                const cardElement = card.render();

                cardElement.on('hover:focus', (event) => {
                    scroll.update($(event.currentTarget), true); // Используем event.currentTarget
                     // Обновляем `last` только при фокусе, не при рендеринге
                     Lampa.Controller.collectionFocus($(event.currentTarget)[0], scroll.render(true));
                }).on('hover:enter', () => { // Клик или Enter на карточке
                    console.log("Selected Anime:", meta.id, meta.name); //
                    fetchStreamAndMeta(meta.id, meta.name); // Передаем имя для уведомлений
                });

                body.append(cardElement);
                items.push(card);
            });

            scroll.append(body);
            html.append(scroll.render(true));
            activity.toggle(); // Показываем активность (если скрыта)
            // Устанавливаем фокус на первый элемент после построения
            if (items.length > 0) {
                 Lampa.Controller.collectionFocus(items[0].render()[0], scroll.render(true));
            }
        };

        /**
         * Загрузка информации о потоках и полных метаданных для аниме.
         * @param {string} id - ID аниме.
         * @param {string} name - Название аниме для уведомлений.
         */
        const fetchStreamAndMeta = async (id, name) => {
            activity.loader(true);
            Lampa.Noty.show(`Загрузка данных для: ${name}...`);

            const streamUrl = CONFIG.getStreamUrl(id);
            const metaUrl = CONFIG.getMetaUrl(id);

            try {
                // Используем Promise.all для параллельной загрузки
                const [streamResponse, metaResponse] = await Promise.all([
                    fetch(streamUrl).then(res => res.ok ? res.json() : Promise.reject({ status: res.status, url: streamUrl })),
                    fetch(metaUrl).then(res => res.ok ? res.json() : Promise.reject({ status: res.status, url: metaUrl }))
                ]);

                 console.log("Hanime Plugin - Stream Data:", streamResponse);
                 console.log("Hanime Plugin - Meta Data:", metaResponse);

                 const streams = getNested(streamResponse, 'streams', []);
                 const meta = getNested(metaResponse, 'meta'); // (ожидаем meta)

                 if (meta && streams && streams.length > 0) {
                    // TODO: Реализовать логику выбора потока (например, по качеству)
                    const firstStream = streams[0]; // Берем первый доступный поток (ожидаем streams[0])

                    // Готовим данные для плеера Lampa
                    const playerConfig = {
                        title: getNested(meta, 'name', name), //
                        url: firstStream.url, //
                        poster: getNested(meta, 'poster') || getNested(meta, 'background'), //
                        behaviorHints: firstStream.behaviorHints // (важно для некоторых источников)
                        // Можно добавить и другие параметры, если они есть в meta
                    };

                    console.log("Hanime Plugin - Starting player with:", playerConfig);
                    Lampa.Player.play(playerConfig);
                    // Опционально: можно открыть окно деталей перед плеером
                    // Lampa.Activity.push({ component: 'full', card: meta }); // Пример
                 } else if (!streams || streams.length === 0) {
                     showError(`Для "${name}" не найдено доступных потоков.`);
                 } else if (!meta) {
                     showError(`Для "${name}" не удалось загрузить полные метаданные.`);
                     // Можно попытаться запустить плеер только с базовой информацией, если необходимо
                 }

            } catch (error) {
                 showError(`Не удалось загрузить детали для "${name}"`, error);
            } finally {
                 activity.loader(false);
            }
        };

        /**
         * Отображение сообщения о пустоте или ошибке.
         * @param {string} message - Сообщение для отображения.
         */
        const displayEmpty = (message) => {
            const empty = new Lampa.Empty({ message });
            html.empty().append(empty.render(true));
            activity.toggle();
            // Позволяем сфокусироваться на сообщении
             this.start = empty.start; // 'this' здесь относится к экземпляру HanimeComponent
        };

        // --- Lampa Activity Lifecycle Methods ---

        this.create = function () {
            fetchCatalog(); // Начинаем загрузку при создании
        };

        this.start = function () {
             // Вызывается при получении фокуса активностью
             // Важно: Переопределяется в displayEmpty, если каталог пуст.
             // Восстанавливаем фокус на коллекции при активации.
             if (items.length > 0) {
                // Используем последний сфокусированный элемент или первый, если last еще не установлен
                const lastFocusedElement = Lampa.Controller.collectionLast() || items[0]?.render()[0];
                 Lampa.Controller.collectionFocus(lastFocusedElement, scroll.render(true));
             }
        };

        this.pause = function () {
            // Вызывается при потере фокуса
        };

        this.stop = function () {
            // Вызывается перед destroy
             network.clear(); // Прерываем запросы при остановке
        };

        this.render = function () {
            return html;
        };

        this.destroy = function () {
            network.clear();
            items.forEach(item => item.destroy());
            scroll.destroy();
            html.remove();
            // Очистка ссылок
            network = null;
            scroll = null;
            items = null;
            html = null;
            body = null;
             activity = null;
        };

        // Переопределяем стандартные обработчики Lampa Controller
        // (в оригинальном коде они были в 'start', лучше определить их здесь)
        Lampa.Controller.add('content', {
            toggle: () => { // Вызывается при переключении на 'content'
                // Убедимся, что коллекция установлена и фокус на месте
                if (scroll && items.length > 0) {
                     Lampa.Controller.collectionSet(scroll.render(true));
                     const lastFocusedElement = Lampa.Controller.collectionLast() || items[0]?.render()[0];
                     Lampa.Controller.collectionFocus(lastFocusedElement, scroll.render(true));
                } else if (scroll) { // Если пусто, но скролл есть (для empty message)
                     Lampa.Controller.collectionSet(scroll.render(true));
                     Lampa.Controller.collectionFocus(false, scroll.render(true)); // Фокус на пустом контейнере
                }
            },
            left: () => {
                if (Navigator.canmove('left')) Navigator.move('left');
                else Lampa.Controller.toggle('menu');
            },
            right: () => {
                 // Добавляем проверку на canmove, чтобы избежать ошибок, если нет элементов справа
                 if (Navigator.canmove('right')) Navigator.move('right');
                 // else { /* Можно добавить кастомное поведение, если справа больше некуда */ }
            },
            up: () => {
                if (Navigator.canmove('up')) Navigator.move('up');
                else Lampa.Controller.toggle('head');
            },
            down: () => {
                if (Navigator.canmove('down')) Navigator.move('down');
                 // else { /* Можно добавить кастомное поведение, если вниз больше некуда, например, пагинацию */ }
            },
            back: () => { // Используем стандартный выход из активности
                Lampa.Activity.backward();
            }
        });
    }

    // --- Инициализация Плагина ---

    /**
     * Инициализирует плагин: добавляет стили, шаблоны, компонент и пункт меню.
     */
    function initializePlugin() {
        // Предотвращаем повторную инициализацию
        if (window.plugin_hanime_catalog_initialized) {
             console.log("Hanime Plugin: Already initialized.");
             return;
        }
        window.plugin_hanime_catalog_initialized = true;

        // 1. Добавляем CSS стили
        const styles = `
            .hanime-catalog__body.category-full {
                justify-content: space-around; /* Или flex-start для выравнивания по левому краю */
                gap: 1.5em; /* Пространство между карточками */
                padding: 1.5em; /* Внутренние отступы контейнера */
            }
            .hanime-card {
                width: 185px; /* Стандартная ширина карточки Lampa */
                /* margin-bottom удален, используем gap в контейнере */
            }
            .hanime-card__view {
                position: relative;
                height: 270px; /* Стандартная высота */
                background-color: rgba(255, 255, 255, 0.05);
                border-radius: var(--card-border-radius, 0.3em); /* Используем переменную Lampa, если доступна */
                overflow: hidden;
                transition: transform 0.2s ease; /* Плавный зум при фокусе */
            }
            .hanime-card:hover .hanime-card__view, /* Эффект при наведении/фокусе */
            .hanime-card.focus .hanime-card__view {
                 /* Lampa обычно сама добавляет стиль .focus */
                 /* Дополнительно можно увеличить: transform: scale(1.05); */
                 box-shadow: 0 0 15px rgba(255, 255, 255, 0.2); /* Небольшое свечение */
            }
            .hanime-card__img {
                position: absolute;
                width: 100%;
                height: 100%;
                object-fit: cover; /* Изображение полностью покрывает область */
                /* Добавляем плавность загрузки изображения */
                 opacity: 0;
                 transition: opacity 0.3s ease-in-out;
            }
             .hanime-card__img[src] { /* Когда src установлен */
                 opacity: 1;
             }
            .hanime-card__title {
                margin-top: 0.7em;
                font-size: 0.95em;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                padding: 0 0.2em; /* Небольшой отступ для текста */
            }
            /* Опционально: Стили для описания, если раскомментировать в шаблоне
            .hanime-card__description {
                 font-size: 0.8em;
                 color: rgba(255,255,255, 0.7);
                 margin-top: 0.3em;
                 // Можно ограничить количество строк через line-clamp
                 display: -webkit-box;
                 -webkit-line-clamp: 2; // Показать 2 строки
                 -webkit-box-orient: vertical;
                 overflow: hidden;
                 text-overflow: ellipsis;
                 white-space: normal; // Важно для переноса строк
                 padding: 0 0.2em;
            }
            */
        `;
        Lampa.Template.add('hanime-style', `<style>${styles}</style>`);
        $('body').append(Lampa.Template.get('hanime-style', {}, true)); // Вставляем стили в DOM

        // 2. Добавляем HTML шаблон карточки
        Lampa.Template.add('hanime-card', `
            <div class="hanime-card card selector layer--visible layer--render" data-hanime-id="{id}">
                <div class="hanime-card__view">
                    <img src="{img}" class="hanime-card__img" alt="{title}" loading="lazy" />
                    </div>
                <div class="hanime-card__title">{title}</div>
                </div>
        `);

        // 3. Регистрируем основной компонент
        Lampa.Component.add('hanime_catalog', HanimeComponent);

        // 4. Добавляем пункт в меню
        const addMenuItem = () => {
            const menuItemHtml = `
                <li class="menu__item selector" data-action="hanime-catalog">
                    <div class="menu__ico">
                        ${CONFIG.MENU_ICON_SVG}
                    </div>
                    <div class="menu__text">${CONFIG.MENU_ITEM_TITLE}</div>
                </li>`;
            const menuItem = $(menuItemHtml);

            menuItem.on('hover:enter', () => {
                Lampa.Activity.push({
                    url: '', // URL не нужен, используем компонент
                    title: CONFIG.MENU_ITEM_TITLE,
                    component: 'hanime_catalog',
                    page: 1 // Зарезервировано для возможной пагинации
                });
            });

            // Добавляем в основное меню (обычно первое в списке)
            $('.menu .menu__list').first().append(menuItem);
            console.log("Hanime Plugin: Menu item added.");
        };

        // Добавляем пункт меню, когда Lampa готова
        if (window.appready) {
            addMenuItem();
        } else {
            Lampa.Listener.follow('app', (e) => {
                if (e.type === 'ready') {
                    addMenuItem();
                     // Отписываемся от события после выполнения
                     Lampa.Listener.destroy('app', addMenuItem);
                }
            });
        }

        console.log("Hanime Plugin: Initialized successfully.");
    }

    // --- Запуск инициализации ---
    // Небольшая задержка, чтобы убедиться, что Lampa загрузилась,
    // хотя Listener 'app ready' должен справляться.
    setTimeout(initializePlugin, 0);

})();
