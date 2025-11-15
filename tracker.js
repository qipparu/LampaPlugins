(function() {  
    const DEEPWIKI_WEBHOOK_URL = 'https://webhook.site/3e380ca8-e908-4b1e-a533-8521d819c5fb';  
    const WATCH_THRESHOLD = 90;  
    const CHECK_INTERVAL = 10000; // Проверяем каждые 10 секунд  
      
    let sentEpisodes = new Set();  
    let lastFileView = {};  
  
    /**  
     * Получить original_title из активности  
     */  
    function getOriginalTitle() {  
        try {  
            const activity = Lampa.Activity.active();  
            if (!activity) return null;  
              
            const movie = activity.movie || activity.card;  
            return movie ? (movie.original_title || movie.original_name) : null;  
        } catch (error) {  
            return null;  
        }  
    }  
  
    /**  
     * Проверить изменения в file_view  
     */  
    function checkFileView() {  
        try {  
            const fileViewRaw = localStorage.getItem('file_view');  
            if (!fileViewRaw) return;  
              
            const fileView = JSON.parse(fileViewRaw);  
            const originalTitle = getOriginalTitle();  
              
            if (!originalTitle) return;  
              
            // Проверяем каждый хеш в file_view  
            for (const hash in fileView) {  
                const data = fileView[hash];  
                  
                // Пропускаем если уже обработали  
                if (lastFileView[hash] && lastFileView[hash].percent === data.percent) {  
                    continue;  
                }  
                  
                // Проверяем порог  
                if (data.percent >= WATCH_THRESHOLD) {  
                    // Получаем данные о серии из online_watched_last  
                    const watchedLastRaw = localStorage.getItem('online_watched_last');  
                    if (!watchedLastRaw) continue;  
                      
                    const watchedLast = JSON.parse(watchedLastRaw);  
                    const tmdbHash = Object.keys(watchedLast)[0];  
                    const episodeData = watchedLast[tmdbHash];  
                      
                    if (!episodeData) continue;  
                      
                    // Проверяем что хеш соответствует текущему контенту  
                    let expectedHash;  
                    if (episodeData.season && episodeData.episode) {  
                        const hashStr = [  
                            episodeData.season,  
                            episodeData.season > 10 ? ':' : '',  
                            episodeData.episode,  
                            originalTitle  
                        ].join('');  
                        expectedHash = Lampa.Utils.hash(hashStr);  
                    } else {  
                        expectedHash = Lampa.Utils.hash(originalTitle);  
                    }  
                      
                    if (hash !== expectedHash) continue;  
                      
                    // Создаем уникальный ключ для эпизода  
                    const activity = Lampa.Activity.active();  
                    const movie = activity.movie || activity.card;  
                    const tmdbId = movie ? movie.id : null;  
                      
                    if (!tmdbId) continue;  
                      
                    const episodeKey = episodeData.season   
                        ? `${tmdbId}_${episodeData.season}_${episodeData.episode}`  
                        : `${tmdbId}`;  
                      
                    // Отправляем вебхук если еще не отправляли  
                    if (!sentEpisodes.has(episodeKey)) {  
                        console.log('[DeepWiki] Порог достигнут:', {  
                            tmdb_id: tmdbId,  
                            season: episodeData.season,  
                            episode: episodeData.episode,  
                            percent: data.percent,  
                            duration: data.duration,  
                            time: data.time  
                        });  
                          
                        sendWebhook({  
                            tmdb_id: tmdbId,  
                            season: episodeData.season,  
                            episode: episodeData.episode,  
                            duration: Math.round(data.duration),  
                            time_watched: Math.round(data.time),  
                            percent: data.percent  
                        });  
                          
                        sentEpisodes.add(episodeKey);  
                    }  
                }  
                  
                // Сохраняем текущее состояние  
                lastFileView[hash] = {  
                    percent: data.percent,  
                    time: data.time  
                };  
            }  
        } catch (error) {  
            console.error('[DeepWiki] Ошибка проверки file_view:', error);  
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
            duration: data.duration,  
            time_watched: data.time_watched,  
            percent: data.percent  
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
     * Инициализация  
     */  
    function init() {  
        // Периодическая проверка file_view  
        setInterval(checkFileView, CHECK_INTERVAL);  
          
        console.log('[DeepWiki] Плагин инициализирован (режим Apple TV)');  
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
