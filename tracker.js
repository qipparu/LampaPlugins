(function () {
    'use strict';

    // Configuration
    var WEBHOOK_URL = 'https://webhook.site/91fb471f-2554-470a-9000-e1d07c802169';
    var WATCHED_THRESHOLD = 90; // Percentage to mark as watched

    function whenReady(callback) {
        if (typeof window === 'undefined') return;

        if (window.Lampa && Lampa.Storage && Lampa.Storage.listener) {
            callback();
        } else {
            setTimeout(function () {
                whenReady(callback);
            }, 500);
        }
    }

    whenReady(function () {
        if (window.webhookTrackerInitialized) return;
        window.webhookTrackerInitialized = true;

        console.log('Webhook Tracker: Plugin initialized');

        // Listen to Storage changes
        Lampa.Storage.listener.follow('change', function (event) {
            console.log('Webhook Tracker: Storage change detected:', event.name);

            // Monitor history changes
            if (event.name === 'history') {
                console.log('Webhook Tracker: History event triggered');
                processHistory(event.value);
            }
        });

        function processHistory(historyArray) {
            console.log('Webhook Tracker: Processing history', historyArray);

            if (!Array.isArray(historyArray) || historyArray.length === 0) {
                console.log('Webhook Tracker: History is empty or not an array');
                return;
            }

            // Latest item is at index 0
            var item = historyArray[0];
            if (!item) {
                console.log('Webhook Tracker: No item found');
                return;
            }

            console.log('Webhook Tracker: Latest item:', item);

            // Calculate viewing percentage
            var time = item.time || 0;
            var duration = item.duration || 0;
            var percent = 0;

            if (duration > 0) {
                percent = (time / duration) * 100;
            }

            console.log('Webhook Tracker: Progress ' + percent.toFixed(2) + '% (Time: ' + time + 's / Duration: ' + duration + 's)');

            // Check if threshold met
            if (percent < WATCHED_THRESHOLD) {
                console.log('Webhook Tracker: Threshold not met (' + percent.toFixed(2) + '% < ' + WATCHED_THRESHOLD + '%)');
                return;
            }

            // Create unique ID to avoid duplicates
            var uniqueId = (item.id || 'noid') + '_' + (item.season || 0) + '_' + (item.episode || 0);
            var storageKey = 'webhook_tracker_sent_' + uniqueId;

            if (Lampa.Storage.get(storageKey)) {
                console.log('Webhook Tracker: Already sent for ' + uniqueId);
                return;
            }

            // Prepare payload
            var payload = {
                tmdb_id: item.id,
                season: item.season || 0,
                episode: item.episode || 0,
                title: item.title || item.name || '',
                original_title: item.original_title || item.original_name || '',
                percent: Math.round(percent),
                timestamp: new Date().toISOString()
            };

            // Try to add Russian title if available
            if (item.name_ru) payload.title_ru = item.name_ru;
            if (item.title_ru) payload.title_ru = item.title_ru;

            console.log('Webhook Tracker: Sending webhook', payload);

            sendWebhook(payload, storageKey);
        }

        function sendWebhook(payload, storageKey) {
            if (WEBHOOK_URL.indexOf('your-webhook-url') !== -1) {
                console.warn('Webhook Tracker: URL not configured');
                return;
            }

            fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
                .then(function (response) {
                    if (response.ok) {
                        console.log('Webhook Tracker: Successfully sent to webhook');
                        // Mark as sent to avoid duplicates
                        Lampa.Storage.set(storageKey, true);
                    } else {
                        console.error('Webhook Tracker: Server error', response.status);
                    }
                })
                .catch(function (error) {
                    console.error('Webhook Tracker: Network error', error);
                });
        }
    });

})();
