(function() {  
    const DEEPWIKI_WEBHOOK_URL = 'https://webhook.site/3e380ca8-e908-4b1e-a533-8521d819c5fb';  
    const WATCH_THRESHOLD = 90;  
      
    let sentEpisodes = new Set();  
  
    /**  
     * Получить данные о просмотре  
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
     * Получить данные о текущем контенте из активности  
     */  
    function getCurrentMovie() {  
        try {  
            const activity = Lampa.Activity.active();  
            if (!activity) return null;  
              
            // Проверяем разные возможные места хранения данных о контенте  
            return activity.movie || activity.card || null;  
        } catch (error) {  
            console.error('[DeepWiki] Ошибка получения данных о контенте:', error);  
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
  
            // Используем original_title или original_name  
            const originalTitle = movie.original_title || movie.original_name || '';  
  
            // Генерируем хеш правильно  
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
     * Обработчик закрытия плеера  
     */  
    function onPlayerDestroy() {  
        console.log('[DeepWiki] Плеер закрыт, ожидание сохранения Timeline...');  
          
        setTimeout(() => {  
            const watchedData = getWatchedData();  
            if (!watchedData) {  
                console.log('[DeepWiki] Нет данных о просмотре');  
                return;  
            }  
              
            // Получаем данные о контенте из текущей активности  
            const movie = getCurrentMovie();  
            if (!movie) {  
                console.log('[DeepWiki] Нет данных о контенте в активности');  
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
            } else {  
                console.log('[DeepWiki] Уже отправлено для этого эпизода');  
            }  
        }, 1000);  
    }  
  
    /**  
     * Инициализация  
     */  
    function init() {  
        // Подписываемся на закрытие плеера  
        Lampa.Player.listener.follow('destroy', onPlayerDestroy);  
          
        console.log('[DeepWiki] Плагин инициализирован');  
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
