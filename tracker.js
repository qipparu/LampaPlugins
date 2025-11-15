(function() {  
    const DEEPWIKI_WEBHOOK_URL = 'https://webhook.site/3e380ca8-e908-4b1e-a533-8521d819c5fb';  
    const WATCH_THRESHOLD = 90;  
      
    let sentEpisodes = new Set();  
    let pendingContent = null; // Сохраняем данные при запуске  
  
    /**  
     * Получить данные о просмотре из localStorage  
     */  
    function getWatchedData() {  
        try {  
            const watchedLastRaw = localStorage.getItem('online_watched_last');  
            if (!watchedLastRaw) return null;  
              
            const watchedLast = JSON.parse(watchedLastRaw);  
            const tmdbHash = Object.keys(watchedLast)[0];  
            const data = watchedLast[tmdbHash];  
              
            if (!tmdbHash || !data) return null;  
              
            return {  
                tmdb_hash: tmdbHash,  
                season: data.season,  
                episode: data.episode  
            };  
        } catch (error) {  
            console.error('[DeepWiki] Ошибка чтения localStorage:', error);  
            return null;  
        }  
    }  
  
    /**  
     * Получить Timeline данные  
     */  
    function getTimelineData(watchedData, movie) {  
        try {  
            if (!window.Lampa || !window.Lampa.Utils || !window.Lampa.Timeline) {  
                return null;  
            }  
  
            if (!movie) {  
                console.error('[DeepWiki] Нет данных о фильме/сериале');  
                return null;  
            }  
  
            const originalTitle = movie.original_title || movie.original_name || '';  
  
            let hash;  
            if (watchedData.season && watchedData.episode) {  
                const hashStr = [  
                    watchedData.season,   
                    watchedData.season > 10 ? ':' : '',   
                    watchedData.episode,   
                    originalTitle  
                ].join('');  
                hash = Lampa.Utils.hash(hashStr);  
            } else {  
                hash = Lampa.Utils.hash(originalTitle);  
            }  
              
            const timeline = Lampa.Timeline.view(hash);  
              
            console.log('[DeepWiki] Timeline данные:', {  
                hash: hash,  
                original_title: originalTitle,  
                season: watchedData.season,  
                episode: watchedData.episode,  
                duration: timeline.duration,  
                time: timeline.time,  
                percent: timeline.percent  
            });  
              
            return {  
                hash: hash,  
                tmdb_id: movie.id,  
                duration: timeline.duration || 0,  
                time: timeline.time || 0,  
                percent: timeline.percent || 0  
            };  
        } catch (error) {  
            console.error('[DeepWiki] Ошибка получения Timeline:', error);  
            return null;  
        }  
    }  
  
    /**  
     * Отправка вебхука  
     */  
    function sendWebhook(watchedData, timelineData) {  
        if (!DEEPWIKI_WEBHOOK_URL || DEEPWIKI_WEBHOOK_URL === 'ВАШ_URL_ВЕБХУКА_DEEPWIKI') {  
            console.error('[DeepWiki] Webhook: URL не настроен!');  
            return;  
        }  
  
        const payload = {  
            tmdb_id: timelineData.tmdb_id,  
            duration: Math.round(timelineData.duration),  
            time_watched: Math.round(timelineData.time),  
            percent: timelineData.percent  
        };  
          
        if (watchedData.season && watchedData.episode) {  
            payload.season = watchedData.season;  
            payload.episode = watchedData.episode;  
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
     * Обработчик запуска плеера - сохраняем данные о контенте  
     */  
    function onPlayerStart(data) {  
        console.log('[DeepWiki] Плеер запущен, сохраняем данные о контенте');  
          
        // Получаем данные о фильме из активности или из data.card  
        const activity = Lampa.Activity.active();  
        const movie = data.card || activity.movie || activity.card;  
          
        if (movie) {  
            pendingContent = {  
                movie: movie,  
                timestamp: Date.now()  
            };  
            console.log('[DeepWiki] Сохранены данные:', movie.original_title || movie.original_name);  
        }  
    }  
  
    /**  
     * Периодическая проверка Timeline для отправки вебхука  
     */  
    function checkTimeline() {  
        if (!pendingContent) return;  
          
        const watchedData = getWatchedData();  
        if (!watchedData) return;  
          
        const timelineData = getTimelineData(watchedData, pendingContent.movie);  
        if (!timelineData) return;  
          
        const episodeKey = `${timelineData.tmdb_id}_${watchedData.season}_${watchedData.episode}`;  
          
        // Проверяем порог и отправляем вебхук  
        if (timelineData.percent >= WATCH_THRESHOLD && !sentEpisodes.has(episodeKey)) {  
            console.log('[DeepWiki] Порог достигнут:', timelineData.percent + '%');  
            sendWebhook(watchedData, timelineData);  
            sentEpisodes.add(episodeKey);  
            pendingContent = null; // Очищаем после отправки  
        }  
    }  
  
    /**  
     * Обработчик закрытия плеера (для встроенного плеера)  
     */  
    function onPlayerDestroy() {  
        console.log('[DeepWiki] Плеер закрыт, проверка Timeline...');  
          
        setTimeout(() => {  
            const watchedData = getWatchedData();  
            if (!watchedData) {  
                console.log('[DeepWiki] Нет данных о просмотре');  
                return;  
            }  
              
            // Пытаемся получить данные из активности  
            const activity = Lampa.Activity.active();  
            const movie = pendingContent?.movie || activity.movie || activity.card;  
              
            if (!movie) {  
                console.log('[DeepWiki] Нет данных о контенте');  
                return;  
            }  
              
            const timelineData = getTimelineData(watchedData, movie);  
            if (!timelineData) {  
                console.log('[DeepWiki] Нет данных Timeline');  
                return;  
            }  
              
            const episodeKey = `${timelineData.tmdb_id}_${watchedData.season}_${watchedData.episode}`;  
              
            if (timelineData.percent >= WATCH_THRESHOLD && !sentEpisodes.has(episodeKey)) {  
                console.log('[DeepWiki] Порог достигнут:', timelineData.percent + '%');  
                sendWebhook(watchedData, timelineData);  
                sentEpisodes.add(episodeKey);  
            } else if (timelineData.percent < WATCH_THRESHOLD) {  
                console.log('[DeepWiki] Порог не достигнут:', timelineData.percent + '%');  
            }  
              
            pendingContent = null;  
        }, 1000);  
    }  
  
    /**  
     * Инициализация  
     */  
    function init() {  
        // Подписываемся на запуск плеера (срабатывает для всех плееров)  
        Lampa.Player.listener.follow('start', onPlayerStart);  
          
        // Подписываемся на закрытие плеера (только для встроенного)  
        Lampa.Player.listener.follow('destroy', onPlayerDestroy);  
          
        // Периодическая проверка Timeline каждые 30 секунд  
        setInterval(checkTimeline, 30000);  
          
        console.log('[DeepWiki] Плагин инициализирован для Apple TV');  
    }  
  
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
