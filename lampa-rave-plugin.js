    (function() {
    'use strict';

    // Проверка наличия глобального объекта Lampa
    if (typeof Lampa === 'undefined') {
        console.error('Rave Plugin: Объект Lampa не найден. Плагин не будет загружен.');
        return;
    }

    // Название плагина
    const pluginName = 'rave';
    // Версия плагина
    const version = '1.0.3';

    // Иконка для меню
    const icon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
    `;

    // Объект конфигурации плагина
    const config = {
        author: 'LinuxFlow1',
        name: 'Rave Integration',
        version: version,
        description: 'Интеграция с сервисом Rave для совместного просмотра',
        path: 'https://raw.githubusercontent.com/LinuxFlow1/lampa-rave-plugin/main/lampa-rave-plugin.js'
    };

    // Функция для создания ссылки на Rave
    function createRaveLink(data) {
        if (!data) {
            console.error('Rave Plugin: Данные о фильме/сериале не предоставлены');
            return null;
        }

        try {
            // Базовый URL для Rave
            const raveBaseUrl = 'https://rave.io/watch?v=';
            
            // Формируем ссылку на основе данных о фильме
            let videoUrl = '';
            
            // Проверяем, есть ли у нас прямая ссылка на видео из Lampa
            if (data.url) {
                videoUrl = data.url;
            } else if (data.video_url) {
                videoUrl = data.video_url;
            } else if (data.stream) {
                videoUrl = data.stream;
            } else {
                // Если нет прямой ссылки, создаем идентификатор для поиска
                // Формат: название + год + тип (фильм/сериал)
                const title = data.title || data.name || 'Неизвестный фильм';
                const year = data.year || '';
                const type = data.season ? 'сериал' : 'фильм';
                const searchQuery = encodeURIComponent(`${title} ${year} ${type}`);
                videoUrl = 'search:' + searchQuery;
            }
            
            // Кодируем URL для вставки в ссылку Rave
            const encodedUrl = encodeURIComponent(videoUrl);
            
            // Возвращаем полную ссылку для Rave
            return raveBaseUrl + encodedUrl;
        } catch (error) {
            console.error('Rave Plugin: Ошибка при создании ссылки', error);
            return null;
        }
    }

    // Функция для копирования текста в буфер обмена
    async function copyToClipboard(text) {
        if (!text) {
            showNotification('Ошибка: Нет текста для копирования');
            return false;
        }

        try {
            // Сначала пробуем новый Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
            
            // Запасной вариант - устаревший метод
            const input = document.createElement('input');
            input.value = text;
            document.body.appendChild(input);
            input.select();
            const success = document.execCommand('copy');
            document.body.removeChild(input);
            
            return success;
        } catch (error) {
            console.error('Rave Plugin: Ошибка при копировании', error);
            return false;
        }
    }

    // Функция для показа уведомления
    function showNotification(text, duration = 2000) {
        if (typeof Lampa.Noty !== 'undefined' && Lampa.Noty.show) {
            Lampa.Noty.show(text);
        } else {
            // Запасной вариант, если Noty недоступен
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 15px 20px;
                border-radius: 5px;
                z-index: 9999;
            `;
            notification.textContent = text;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, duration);
        }
    }

    // Функция для показа модального окна с ссылкой
    function showLinkModal(link) {
        if (!link) return;
        
        Lampa.Modal.open({
            title: 'Ссылка для Rave',
            html: `
                <div class="rave-link-modal">
                    <div class="rave-link-container">
                        <input type="text" class="rave-link-input" value="${link}" readonly>
                    </div>
                    <div class="rave-link-buttons">
                        <div class="rave-copy-button selector">Копировать</div>
                        <div class="rave-open-button selector">Открыть в браузере</div>
                    </div>
                </div>
            `,
            size: 'medium',
            onBack: () => {
                Lampa.Modal.close();
            },
            onSelect: (a) => {
                if (a.target.classList.contains('rave-copy-button')) {
                    const input = document.querySelector('.rave-link-input');
                    if (input) {
                        input.select();
                        copyToClipboard(input.value).then(success => {
                            if (success) {
                                showNotification('Ссылка скопирована в буфер обмена');
                            } else {
                                showNotification('Ошибка при копировании ссылки');
                            }
                        });
                    }
                } else if (a.target.classList.contains('rave-open-button')) {
                    const input = document.querySelector('.rave-link-input');
                    if (input && input.value) {
                        window.open(input.value, '_blank');
                    }
                }
            }
        });
        
        // Добавляем стили для модального окна
        const modalStyle = document.createElement('style');
        modalStyle.textContent = `
            .rave-link-modal {
                padding: 20px;
            }
            .rave-link-container {
                margin-bottom: 20px;
            }
            .rave-link-input {
                width: 100%;
                padding: 10px;
                background-color: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 5px;
                color: white;
                font-size: 16px;
            }
            .rave-link-buttons {
                display: flex;
                justify-content: space-between;
                gap: 10px;
            }
            .rave-copy-button, .rave-open-button {
                flex: 1;
                padding: 10px;
                text-align: center;
                background-color: rgba(0, 0, 0, 0.3);
                border-radius: 5px;
                cursor: pointer;
            }
            .rave-copy-button.focus, .rave-open-button.focus {
                background-color: rgba(255, 87, 34, 0.5);
            }
        `;
        document.head.appendChild(modalStyle);
        
        // Фокус на первую кнопку
        setTimeout(() => {
            const firstButton = document.querySelector('.rave-copy-button');
            if (firstButton) {
                Lampa.Controller.focus(firstButton);
            }
        }, 100);
    }

    // Функция для добавления кнопки Rave в плеер
    function addRaveButtonToPlayer() {
        try {
            // Проверяем, есть ли активный плеер
            if (!Lampa.Player.opened()) return;
            
            console.log('Rave Plugin: Добавление кнопки в плеер');
            
            // Получаем контейнер для кнопок
            const playerPanel = document.querySelector('.player-panel');
            if (!playerPanel) {
                console.error('Rave Plugin: Не найдена панель плеера');
                return;
            }
            
            // Проверяем, возможно кнопка уже добавлена
            if (playerPanel.querySelector('.player-panel__rave')) {
                console.log('Rave Plugin: Кнопка уже добавлена в плеер');
                return;
            }
            
            // Получаем контейнер для правых кнопок (где находится кнопка качества)
            const rightGroup = playerPanel.querySelector('.player-panel__right');
            if (!rightGroup) {
                console.error('Rave Plugin: Не найдена правая группа кнопок плеера');
                return;
            }
            
            // Создаем кнопку для плеера
            const raveButton = document.createElement('div');
            raveButton.className = 'player-panel__button player-panel__rave selector';
            raveButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
            `;
            
            // Добавляем обработчик клика
            raveButton.addEventListener('click', async function() {
                // Получаем текущие данные о воспроизводимом контенте
                const currentItem = Lampa.Player.currentItem();
                if (!currentItem) {
                    showNotification('Ошибка: Не удалось получить данные о контенте');
                    return;
                }
                
                console.log('Rave Plugin: Данные текущего видео', currentItem);
                
                // Получаем текущий URL стрима
                const currentStream = Lampa.Player.url();
                if (!currentStream) {
                    showNotification('Ошибка: Не удалось получить URL стрима');
                    return;
                }
                
                console.log('Rave Plugin: Текущий URL стрима', currentStream);
                
                // Создаем данные для ссылки
                const linkData = {
                    ...currentItem,
                    stream: currentStream
                };
                
                // Создаем ссылку для Rave
                const raveLink = createRaveLink(linkData);
                if (!raveLink) {
                    showNotification('Ошибка: Не удалось создать ссылку Rave');
                    return;
                }
                
                // Показываем модальное окно с ссылкой
                showLinkModal(raveLink);
            });
            
            // Добавляем кнопку перед первым элементом в правой группе
            const firstButton = rightGroup.firstChild;
            if (firstButton) {
                rightGroup.insertBefore(raveButton, firstButton);
            } else {
                rightGroup.appendChild(raveButton);
            }
            
            console.log('Rave Plugin: Кнопка успешно добавлена в плеер');
        } catch (error) {
            console.error('Rave Plugin: Ошибка при добавлении кнопки в плеер', error);
        }
    }

    // Функция для добавления кнопки Rave на страницу фильма/сериала
    function addRaveButton() {
        try {
            // Проверяем, находимся ли мы на странице с фильмом или сериалом
            const activeComponent = Lampa.Activity.active();
            if (!activeComponent || !['full', 'movie', 'tv'].includes(activeComponent.component)) return;
            
            // Выводим в консоль информацию о текущем компоненте для отладки
            console.log('Rave Plugin: Текущий компонент', activeComponent.component, activeComponent);
            
            // Пробуем несколько селекторов для поиска места добавления кнопки
            const selectors = [
                '.view--torrent .view--torrent__buttons',
                '.full-start__buttons',
                '.button--filter', // Родительский контейнер кнопок
                '.full-start__details', // Контейнер с деталями
                '.card--button', // Кнопки на карточке
                '.card--actions' // Действия на карточке
            ];
            
            let actionsElement = null;
            
            // Проходим по всем возможным селекторам
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements && elements.length) {
                    console.log('Rave Plugin: Найден элемент для добавления кнопки', selector, elements[0]);
                    actionsElement = elements[0];
                    break;
                }
            }
            
            // Если не нашли подходящий элемент, пробуем создать свой контейнер
            if (!actionsElement) {
                console.log('Rave Plugin: Не найдены стандартные элементы, создаем контейнер');
                const fullStartElement = document.querySelector('.full-start');
                
                if (fullStartElement) {
                    // Создаем новый контейнер для кнопок, если его нет
                    const existingButtonsContainer = fullStartElement.querySelector('.rave-plugin-buttons');
                    
                    if (existingButtonsContainer) {
                        actionsElement = existingButtonsContainer;
                    } else {
                        const buttonsContainer = document.createElement('div');
                        buttonsContainer.className = 'full-start__buttons rave-plugin-buttons';
                        buttonsContainer.style.marginTop = '15px';
                        fullStartElement.appendChild(buttonsContainer);
                        actionsElement = buttonsContainer;
                    }
                }
            }
            
            if (!actionsElement) {
                console.error('Rave Plugin: Не удалось найти или создать контейнер для кнопки');
                return;
            }
            
            // Проверяем, возможно кнопка уже добавлена
            if (document.querySelector('.rave-button')) {
                console.log('Rave Plugin: Кнопка уже добавлена на страницу');
                return;
            }
            
            // Создаем кнопку
            const raveButton = document.createElement('div');
            raveButton.className = 'view--torrent__button selector rave-button';
            raveButton.innerHTML = `
                <div class="view--torrent__button-inner">
                    <div class="custom-button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        <span>Rave</span>
                    </div>
                </div>
            `;
            
            // Добавляем стили для автономной кнопки, если мы используем собственный контейнер
            if (actionsElement.classList.contains('rave-plugin-buttons')) {
                raveButton.style.cssText = `
                    display: inline-block;
                    margin-right: 10px;
                    padding: 10px 15px;
                    background-color: rgba(0, 0, 0, 0.3);
                    border-radius: 5px;
                    cursor: pointer;
                `;
            }
            
            // Добавляем обработчик клика
            raveButton.addEventListener('click', async function() {
                // Получаем текущие данные о фильме/сериале
                const currentData = activeComponent.card;
                if (!currentData) {
                    showNotification('Ошибка: Не удалось получить данные о контенте');
                    return;
                }
                
                // Выводим в консоль информацию о данных карточки для отладки
                console.log('Rave Plugin: Данные карточки', currentData);
                
                // Создаем ссылку для Rave
                const raveLink = createRaveLink(currentData);
                if (!raveLink) {
                    showNotification('Ошибка: Не удалось создать ссылку Rave');
                    return;
                }
                
                // Показываем модальное окно с ссылкой
                showLinkModal(raveLink);
            });
            
            // Добавляем кнопку на страницу
            actionsElement.appendChild(raveButton);
            console.log('Rave Plugin: Кнопка успешно добавлена');
        } catch (error) {
            console.error('Rave Plugin: Ошибка при добавлении кнопки', error);
        }
    }

    // Добавляем стили для плагина
    const style = document.createElement('style');
    style.textContent = `
        .custom-button {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            padding: 0.3em;
        }
        
        .custom-button svg {
            width: 1.5em;
            height: 1.5em;
            margin-bottom: 0.2em;
        }
        
        .rave-button:hover .custom-button {
            color: #ff5722;
        }
        
        .rave-plugin-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 15px;
        }
        
        .player-panel__rave {
            margin-right: 10px;
        }
        
        .player-panel__rave svg {
            width: 1.5em;
            height: 1.5em;
        }
    `;
    document.head.appendChild(style);

    // Функция инициализации плагина
    function startPlugin() {
        try {
            console.log('Rave Plugin: Инициализация плагина...');
            
            // Функция для проверки и добавления кнопки (будет вызываться периодически)
            const tryAddButton = () => {
                if (Lampa.Activity.active() && ['full', 'movie', 'tv'].includes(Lampa.Activity.active().component)) {
                    addRaveButton();
                }
            };
            
            // Отслеживаем события активности для добавления кнопки
            Lampa.Listener.follow('full', function(e) {
                console.log('Rave Plugin: Событие активности', e.type);
                
                if (e.type === 'complite' || e.type === 'ready') {
                    // Пробуем добавить кнопку несколько раз с интервалом, чтобы точно успеть
                    setTimeout(tryAddButton, 100);
                    setTimeout(tryAddButton, 500);
                    setTimeout(tryAddButton, 1000);
                    setTimeout(tryAddButton, 2000);
                }
            });
            
            // Также отслеживаем события роутера для перехватывания перехода на страницу фильма
            Lampa.Listener.follow('activity', function(e) {
                if (['full', 'movie', 'tv'].includes(e.component)) {
                    console.log('Rave Plugin: Активность full', e);
                    setTimeout(tryAddButton, 500);
                }
            });
            
            // Отслеживаем события плеера для добавления кнопки в плеер
            Lampa.Listener.follow('player', function(e) {
                console.log('Rave Plugin: Событие плеера', e.type);
                
                if (e.type === 'ready') {
                    // Пробуем добавить кнопку в плеер несколько раз с интервалом
                    setTimeout(addRaveButtonToPlayer, 500);
                    setTimeout(addRaveButtonToPlayer, 1000);
                    setTimeout(addRaveButtonToPlayer, 2000);
                }
            });
            
            // Добавляем обработчик изменения DOM, чтобы перехватить момент, когда элементы управления появятся
            if (typeof MutationObserver !== 'undefined') {
                const observer = new MutationObserver(function(mutations) {
                    const shouldAddButton = mutations.some(mutation => {
                        // Проверяем, появился ли контейнер для кнопок или нужные элементы
                        if (mutation.addedNodes.length) {
                            for (let node of mutation.addedNodes) {
                                if (node.nodeType === Node.ELEMENT_NODE) {
                                    if (node.classList && 
                                        (node.classList.contains('full-start__buttons') || 
                                         node.classList.contains('view--torrent__buttons') ||
                                         node.classList.contains('card--button') ||
                                         node.classList.contains('card--actions'))) {
                                        return true;
                                    }
                                    
                                    // Проверяем появление панели плеера
                                    if (node.classList && node.classList.contains('player-panel')) {
                                        setTimeout(addRaveButtonToPlayer, 500);
                                    }
                                }
                            }
                        }
                        return false;
                    });
                    
                    if (shouldAddButton) {
                        console.log('Rave Plugin: Обнаружены изменения DOM, пробуем добавить кнопку');
                        tryAddButton();
                    }
                });
                
                // Начинаем наблюдать за изменениями в DOM
                observer.observe(document.body, { childList: true, subtree: true });
                console.log('Rave Plugin: Настроен наблюдатель за DOM');
            }
            
            // Пробуем добавить кнопку сразу, если мы уже на странице фильма
            setTimeout(tryAddButton, 100);
            
            console.info(`Rave Plugin v${version} инициализирован`);
        } catch (error) {
            console.error('Rave Plugin: Ошибка при инициализации', error);
        }
    }

    // Регистрация плагина через SettingsApi
    if (Lampa.SettingsApi) {
        // Удаляем компонент, если он уже существует (для обновления)
        Lampa.SettingsApi.remove('rave');

        // Добавляем компонент с нашим плагином
        Lampa.SettingsApi.addComponent({
            component: 'rave',
            icon: icon,
            name: 'Rave'
        });

        // Добавляем раздел "О плагине"
        Lampa.SettingsApi.addParam({
            component: 'rave',
            param: {
                type: 'title',
                name: 'title_about'
            },
            field: {
                name: 'О плагине'
            }
        });

        // Добавляем информацию о версии
        Lampa.SettingsApi.addParam({
            component: 'rave',
            param: {
                name: 'rave_version',
                type: 'static',
            },
            field: {
                name: 'Версия',
                value: version
            }
        });

        // Добавляем описание
        Lampa.SettingsApi.addParam({
            component: 'rave',
            param: {
                name: 'rave_description',
                type: 'static',
            },
            field: {
                name: 'Описание',
                value: 'Интеграция с сервисом Rave для совместного просмотра'
            }
        });

        // Добавляем инструкцию
        Lampa.SettingsApi.addParam({
            component: 'rave',
            param: {
                name: 'rave_instruction',
                type: 'button',
            },
            field: {
                name: 'Инструкция по использованию',
                // Действие по нажатию кнопки
                onClick: () => {
                    Lampa.Modal.open({
                        title: 'Rave Integration',
                        html: `
                            <div class="about">
                                <div class="about__title">Версия: ${version}</div>
                                <div class="about__text">Плагин для интеграции LAMPA с сервисом Rave для совместного просмотра фильмов и сериалов.</div>
                                <div class="about__text">Инструкция по использованию:</div>
                                <div class="about__text">1. Откройте страницу фильма или сериала</div>
                                <div class="about__text">2. Нажмите на кнопку "Rave" на странице или в плеере</div>
                                <div class="about__text">3. Скопируйте ссылку из появившегося окна</div>
                                <div class="about__text">4. Отправьте ссылку друзьям или вставьте ее в приложение Rave</div>
                                <div class="about__text" style="margin-top: 1em;">
                                    <b>Примечание:</b> Для корректной работы совместного просмотра 
                                    убедитесь, что у всех участников установлено приложение Rave.
                                </div>
                            </div>
                        `,
                        size: 'medium',
                        onBack: () => {
                            Lampa.Modal.close();
                            Lampa.Controller.toggle('settings_component');
                        }
                    });
                }
            }
        });
    }

    // Инициализация плагина - запуск после загрузки всего интерфейса
    if (window.appready) {
        startPlugin();
    } else {
        // Ждем инициализации приложения, если оно еще не готово
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') {
                startPlugin();
            }
        });
    }

    // Добавляем информацию о плагине в список установленных плагинов
    if (Lampa.Storage.get('plugins_installed', '').indexOf(pluginName) === -1) {
        const plugins_installed = Lampa.Storage.get('plugins_installed', '');
        Lampa.Storage.set('plugins_installed', plugins_installed + (plugins_installed ? ', ' : '') + pluginName);
    }
})();
