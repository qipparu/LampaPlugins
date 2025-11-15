(function() {  
    const DEEPWIKI_WEBHOOK_URL = 'http://77.91.78.5/scraper/catalog/hottest';  
    const CHECK_INTERVAL = 5000; // Проверяем каждые 5 секунд  
      
    let lastWatchedKey = null;  
  
    /**  
     * Получить уникальный ключ текущего просмотра  
     */  
    function getWatchedKey() {  
        try {  
            const watchedLastRaw = localStorage.getItem('online_watched_last');  
            if (!watchedLastRaw) return null;  
              
            const watchedLast = JSON.parse(watchedLastRaw);  
            const tmdbHash = Object.keys(watchedLast)[0];  
            const data = watchedLast[tmdbHash];  
              
            if (!tmdbHash || !data) return null;  
              
            // Создаем уникальный ключ для отслеживания  
            return `${tmdbHash}_${data.season || 0}_${data.episode || 0}`;  
        } catch (error) {  
            return null;  
        }  
    }  
  
    /**  
     * Получить данные для вебхука  
     */  
    function getWebhookData() {  
        try {  
            const watchedLastRaw = localStorage.getItem('online_watched_last');  
            if (!watchedLastRaw) return null;  
              
            const watchedLast = JSON.parse(watchedLastRaw);  
            const tmdbHash = Object.keys(watchedLast)[0];  
            const data = watchedLast[tmdbHash];  
              
            if (!tmdbHash || !data) return null;  
              
            // Получаем TMDB ID из хеша (это сложно, поэтому используем активность)  
            const activity = Lampa.Activity.active();  
            const movie = activity?.movie || activity?.card;  
              
            if (!movie) return null;  
              
            return {  
                tmdb_id: movie.id,  
                season: data.season,  
                episode: data.episode,  
                balanser: data.balanser,  
                voice_name: data.voice_name  
            };  
        } catch (error) {  
            console.error('[DeepWiki] Ошибка получения данных:', error);  
            return null;  
        }  
    }  
  
    /**  
     * Отправка вебхука  
     */  
    function sendWebhook(data) {  
        if (!DEEPWIKI_WEBHOOK_URL || DEEPWIKI_WEBHOOK_URL === 'ВАШ_URL_ВЕБХУКА_DEEPWIKI') {  
            console.error('[DeepWiki] Webhook: URL не настроен!');  
            return;  
        }  
  
        const payload = {  
            tmdb_id: data.tmdb_id,  
            balanser: data.balanser,  
            voice_name: data.voice_name  
        };  
          
        if (data.season && data.episode) {  
            payload.season = data.season;  
            payload.episode = data.episode;  
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
     * Проверка изменений  
     */  
    function checkChanges() {  
        const currentKey = getWatchedKey();  
          
        if (!currentKey) return;  
          
        // Если ключ изменился - пользователь выбрал новый эпизод  
        if (currentKey !== lastWatchedKey) {  
            console.log('[DeepWiki] Обнаружен новый эпизод:', currentKey);  
              
            const webhookData = getWebhookData();  
            if (webhookData) {  
                sendWebhook(webhookData);  
            }  
              
            lastWatchedKey = currentKey;  
        }  
    }  
  
    /**  
     * Инициализация  
     */  
    function init() {  
        // Получаем начальное состояние  
        lastWatchedKey = getWatchedKey();  
          
        // Запускаем периодическую проверку  
        setInterval(checkChanges, CHECK_INTERVAL);  
          
        console.log('[DeepWiki] Плагин запущен (режим Apple TV - отслеживание выбора эпизодов)');  
    }  
  
    if (window.Lampa) {  
        init();  
    } else {  
        const checkLampa = setInterval(() => {  
            if (window.Lampa) {  
                clearInterval(checkLampa);  
                init();  
            }  
        }, 100);  
    }  
})();
