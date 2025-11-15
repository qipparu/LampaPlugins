(function() {  
    const DEEPWIKI_WEBHOOK_URL = 'https://webhook.site/3e380ca8-e908-4b1e-a533-8521d819c5fb';  
    const WATCH_THRESHOLD = 0.9;  
      
    let currentHash = null;  
    let isCurrentContentMarked = false;  
    let videoElement = null;  
  
    /**  
     * Получить данные из localStorage  
     */  
    function getViewingData() {  
        try {  
            const watchedLastRaw = localStorage.getItem('online_watched_last');  
            if (!watchedLastRaw) return null;  
              
            const watchedLast = JSON.parse(watchedLastRaw);  
            const tmdbId = Object.keys(watchedLast)[0];  
            const data = watchedLast[tmdbId];  
              
            if (!tmdbId || !data) return null;  
              
            // Генерируем хеш так же, как Lampa  
            let hash;  
            if (data.season && data.episode) {  
                const hashStr = [data.season, data.season > 10 ? ':' : '', data.episode, data.original_title || ''].join('');  
                hash = Lampa.Utils.hash(hashStr);  
            } else {  
                hash = tmdbId;  
            }  
              
            return {  
                hash: hash,  
                tmdb_id: tmdbId,  
                season: data.season,  
                episode: data.episode  
            };  
        } catch (error) {  
            console.error('[DeepWiki] Ошибка получения данных:', error);  
            return null;  
        }  
    }  
  
    /**  
     * Отправка вебхука  
     */  
    function sendWebhook(viewData, duration, time) {  
        if (!DEEPWIKI_WEBHOOK_URL || DEEPWIKI_WEBHOOK_URL === 'ВАШ_URL_ВЕБХУКА_DEEPWIKI') {  
            console.error('[DeepWiki] Webhook: URL не настроен!');  
            return;  
        }  
  
        const payload = {  
            tmdb_id: viewData.tmdb_id,  
            duration: Math.round(duration),  
            time_watched: Math.round(time),  
            percent: Math.round((time / duration) * 100)  
        };  
          
        if (viewData.season && viewData.episode) {  
            payload.season = viewData.season;  
            payload.episode = viewData.episode;  
        }  
  
        fetch(DEEPWIKI_WEBHOOK_URL, {  
            method: 'POST',  
            headers: { 'Content-Type': 'application/json' },  
            body: JSON.stringify(payload),  
        })  
        .then(response => {  
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);  
            console.log('[DeepWiki] Webhook отправлен:', payload);  
        })  
        .catch(error => {  
            console.error('[DeepWiki] Ошибка отправки:', error);  
        });  
    }  
  
    /**  
     * Обработчик timeupdate  
     */  
    function onTimeUpdate() {  
        if (!videoElement || !videoElement.duration || isNaN(videoElement.duration)) return;  
  
        const currentProgress = videoElement.currentTime / videoElement.duration;  
        const viewData = getViewingData();  
          
        if (!viewData) return;  
          
        // Проверяем смену контента  
        if (viewData.hash !== currentHash) {  
            console.log('[DeepWiki] Обнаружена смена контента:', currentHash, '->', viewData.hash);  
            currentHash = viewData.hash;  
            isCurrentContentMarked = false;  
        }  
          
        // Отправка вебхука при достижении порога  
        if (currentProgress >= WATCH_THRESHOLD && !isCurrentContentMarked) {  
            console.log('[DeepWiki] Порог просмотра достигнут:', viewData, 'прогресс:', Math.round(currentProgress * 100) + '%');  
            isCurrentContentMarked = true;  
            sendWebhook(viewData, videoElement.duration, videoElement.currentTime);  
        }  
    }  
  
    /**  
     * Подписка на запуск плеера  
     */  
    function onPlayerStart(data) {  
        console.log('[DeepWiki] Плеер запущен, ожидание видео элемента...');  
          
        // Ждем появления video элемента  
        const checkVideo = setInterval(() => {  
            const video = document.querySelector('video');  
            if (video) {  
                clearInterval(checkVideo);  
                  
                // Удаляем старый обработчик если есть  
                if (videoElement) {  
                    videoElement.removeEventListener('timeupdate', onTimeUpdate);  
                }  
                  
                videoElement = video;  
                videoElement.addEventListener('timeupdate', onTimeUpdate);  
                  
                console.log('[DeepWiki] Видео элемент найден, отслеживание активно');  
                  
                // Сбрасываем состояние для нового видео  
                setTimeout(() => {  
                    const viewData = getViewingData();  
                    if (viewData && viewData.hash !== currentHash) {  
                        console.log('[DeepWiki] Новое видео:', viewData.hash);  
                        currentHash = viewData.hash;  
                        isCurrentContentMarked = false;  
                    }  
                }, 500);  
            }  
        }, 100);  
          
        // Таймаут на случай если видео не появится  
        setTimeout(() => clearInterval(checkVideo), 5000);  
    }  
  
    /**  
     * Инициализация  
     */  
    function init() {  
        // Подписываемся на запуск плеера  
        Lampa.Player.listener.follow('start', onPlayerStart);  
          
        console.log('[DeepWiki] Плагин инициализирован, ожидание запуска плеера');  
    }  
  
    // Ждем готовности Lampa  
    if (window.Lampa && window.Lampa.Player) {  
        init();  
    } else {  
        const checkLampa = setInterval(() => {  
            if (window.Lampa && window.Lampa.Player) {  
                clearInterval(checkLampa);  
                init();  
            }  
        }, 100);  
    }  
})();