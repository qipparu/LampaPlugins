// ... (previous code)

    // --- Plugin Initialization ---

    function startPlugin() {
        console.log("Hanime Plugin: startPlugin() invoked.");

         // Prevent double initialization
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: global plugin_hanime_catalog_ready flag already set. Skipping initialization.");
             return;
         }

        function initializeLampaDependencies() {
             console.log("Hanime Plugin: initializeLampaDependencies() called (Lampa appready or fallback delay completed).");

             // Critical check for required Lampa components and jQuery
             // Ensure Lampa.Template and its methods add/get are available
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Template || typeof Lampa.Template !== 'object' || typeof Lampa.Template.get !== 'function' || typeof Lampa.Template.add !== 'function' || !Lampa.Component || typeof Lampa.Component !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Scroll || typeof Lampa.Scroll !== 'function' || !Lampa.Reguest || typeof Lampa.Reguest !== 'function' || !Lampa.Arrays || typeof Lampa.Arrays !== 'object') {
                  console.error("Hanime Plugin: CRITICAL: Required Lampa components (Lampa, Template.get/add, Component, Activity, Controller, jQuery, Scroll, Reguest, Arrays) are not available after waiting for appready. Initialization failed. Please check Lampa version and installation.");
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина: Компоненты Lampa недоступны. Обновите Lampa или плагин.', 15000);
                  }
                  return;
             }
             console.log("Hanime Plugin: All critical Lampa components checked OK. Continuing initialization.");

              // Set the ready flag
              if (!window.plugin_hanime_catalog_ready) {
                 window.plugin_hanime_catalog_ready = true;
                 console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag set.");
              } else {
                   console.warn("Hanime Plugin: Plugin flag was unexpectedly set before initialization. Possible double load issue?");
                   return; // Exit if flag was already set
              }

             // --- Add Standard Template Fallbacks FIRST ---
             console.log("Hanime Plugin: Adding standard template fallbacks using Lampa.Template.add...");
             // Add these unconditionally if Lampa.Template.add is available.
             // This is to ensure they exist if Lampa's core or other plugins need them early.
             // We assume Lampa.Template.add is safe to call even if the template exists.
             Lampa.Template.add('card_vote_temp', '<div class="card__vote"></div>');
             Lampa.Template.add('card_quality_temp', '<div class="card__quality"><div></div></div>');
             Lampa.Template.add('card_year_temp', '<div class="card__age"></div>');
             Lampa.Template.add('card_type_temp', '<div class="card__type"></div>');
             Lampa.Template.add('icon_lock', `<svg style="width: 1em; height: 1em;" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17C13.11 17 14 16.11 14 15C14 13.89 13.11 13 12 13C10.89 13 10 13.89 10 15C10 16.11 10.89 17 12 17M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8M9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8H9V6M18 20H6V10H18V20Z"></path></svg>`);
             console.log("Hanime Plugin: Standard template fallbacks added successfully (unconditionally).");
             // --- End Add Standard Template Fallbacks ---


             console.log("Hanime Plugin: Adding hanime-card template...");
             // Use Lampa.Template.get to check existence for our custom template
             if (Lampa.Template && typeof Lampa.Template.add === 'function' && typeof Lampa.Template.get === 'function') {
                 if (!Lampa.Template.get('hanime-card')) { // Check if our custom template exists
                     Lampa.Template.add('hanime-card', `
                         <div class="hanime-card card selector layer--visible layer--render">
                             <div class="card__view">
                                 <img src="./img/img_load.svg" class="card__img" alt="{title}" loading="lazy" />
                                 <div class="card__icons">
                                     <div class="card__icons-inner"></div>
                                 </div>
                                 <!-- Details elements are added dynamically by HanimeCard.addDetails -->
                                 <!-- .card__vote, .card__quality, .card__type, .card__marker -->
                             </div>
                             <div class="card__title">{title}</div>
                             <!-- .card__age is added dynamically by HanimeCard.addDetails -->
                         </div>
                     `);
                      console.log("Hanime Plugin: HanimeCard template added successfully.");
                 } else {
                      console.log("Hanime Plugin: HanimeCard template already exists. Skipping add.");
                 }
             } else {
                  console.error("Hanime Plugin: Lampa.Template.add or get method not available. Cannot add hanime-card template.");
             }

             console.log("Hanime Plugin: Custom CSS block REMOVED as requested. Relying on standard Lampa styles.");

             console.log("Hanime Plugin: Registering HanimeComponent...");
             if (window.Lampa && Lampa.Component && typeof Lampa.Component.add === 'function') {
                 Lampa.Component.add('hanime_catalog', HanimeComponent);
                 console.log("Hanime Plugin: Component 'hanime_catalog' registered successfully.");
             } else {
                 console.error("Hanime Plugin: Lampa.Component.add method not available. Cannot register component.");
                  if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                     Lampa.Noty.show('Ошибка плагина: Не удалось зарегистрировать компонент.', 5000);
                  }
             }

             console.log("Hanime Plugin: Calling addMenuItem()...");
             addMenuItem(); // Add the plugin's entry to the main menu
              console.log("Hanime Plugin: addMenuItem() called from initializeLampaDependencies.");

              console.log("Hanime Plugin: initializeLampaDependencies() finished.");
        }

        // Adds the plugin's entry to the Lampa main menu
        function addMenuItem() {
             console.log("Hanime Plugin: addMenuItem() called.");

             // Check for required Lampa components and jQuery
             if (!window.Lampa || typeof window.Lampa !== 'object' || !Lampa.Activity || typeof Lampa.Activity !== 'object' || !Lampa.Controller || typeof Lampa.Controller !== 'object' || !window.$ || typeof window.$ !== 'function' || !Lampa.Component || typeof Lampa.Component.get !== 'function') {
                  console.warn("Hanime Plugin: addMenuItem cannot proceed. Missing Lampa core components, jQuery, or Component.get.");
                  return;
             }

             // Find the main menu list
             var menuList = $('.menu .menu__list').eq(0);
             if (!menuList.length) {
                 console.warn("Hanime Plugin: addMenuItem cannot proceed. Lampa menu DOM structure ('.menu .menu__list') not found.");
                 return;
             }

             console.log("Hanime Plugin: addMenuItem checks passed.");

             // Check if our component is registered
             var ourComponentRegistered = Lampa.Component.get('hanime_catalog');
             if (!ourComponentRegistered) {
                 console.warn("Hanime Plugin: addMenuItem skipping - Component 'hanime_catalog' is not found/registered in Lampa.Component.");
                 return;
             }
             console.log("Hanime Plugin: Component 'hanime_catalog' confirmed registered.");

             // Prevent adding the menu item multiple times
             if (menuList.find('.menu__text:contains("Hanime Catalog")').length > 0) {
                 console.log("Hanime Plugin: Menu item with text 'Hanime Catalog' already exists in DOM. Skipping addMenuItem.");
                 return;
             }
             console.log("Hanime Plugin: Adding menu item DOM element to Lampa menu.");

            // Create the menu item HTML
            var menu_item = $(`
                <li class="menu__item selector">
                    <div class="menu__ico">
                        <!-- Simple play icon -->
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                    <div class="menu__text">Hanime Catalog</div>
                </li>
            `);

            // Attach event listener for activation
            if (typeof menu_item.on === 'function') {
                menu_item.on('hover:enter', function () {
                     console.log("Hanime Plugin: Menu item 'Hanime Catalog' activated via 'hover:enter'. Pushing activity.");
                     // Push a new activity using our registered component
                     if (window.Lampa && Lampa.Activity && typeof Lampa.Activity.push === 'function') {
                         Lampa.Activity.push({
                             url: '', // URL is not strictly needed for this component
                             title: 'Hanime Catalog', // Title for the activity header
                             component: 'hanime_catalog', // The name of our registered component
                             page: 1 // Optional page number
                         });
                          console.log("Hanime Plugin: Lampa.Activity.push called.");
                     } else {
                          console.warn("Hanime Plugin: Lampa.Activity or push method unavailable to launch activity.");
                         if(window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') Lampa.Noty.show('Не удалось запустить активность.');
                     }
                });
                console.log("Hanime Plugin: 'hover:enter' event listener attached to menu item.");
            } else {
                console.warn("Hanime Plugin: jQuery on() method not available for menu item. Cannot attach event listener.");
            }

             // Append the menu item to the menu list
             if (menuList.length > 0) {
                 menuList.append(menu_item);
                 console.log("Hanime Plugin: Menu item DOM element successfully added to Lampa menu list.");
             } else {
                 console.error("Hanime Plugin: addMenuItem failed during append: Lampa menu list DOM element ('.menu .menu__list') not found anymore.");
             }
             console.log("Hanime Plugin: addMenuItem finished.");
        }

        console.log("Hanime Plugin: startPlugin() invoked. Setting up Lampa ready listener.");

         // Check if the plugin was already marked as ready (e.g., due to multiple script loads)
         if (window.plugin_hanime_catalog_ready) {
              console.log("Hanime Plugin: Global plugin_hanime_catalog_ready flag is ALREADY SET upon initial execution. Skipping entire startPlugin execution to prevent double init.");
             return;
         }

         // Wait for Lampa to be ready
         if (window.Lampa && typeof window.Lampa !== 'object' || !Lampa.Listener || typeof Lampa.Listener !== 'object' || typeof Lampa.Listener.follow !== 'function') {
              console.warn("Hanime Plugin: Lampa or Lampa.Listener not available or methods missing. Checking appready flag directly or scheduling delayed start as fallback.");

              // Fallback check for appready flag
              if (window.appready && typeof window.appready === 'boolean' && window.appready) {
                  console.log("Hanime Plugin: Lampa 'appready' flag found. Calling initializeLampaDependencies directly as fallback.");
                  initializeLampaDependencies();
              } else {
                   // Last resort: schedule a delayed initialization. This is unreliable.
                   console.error("Hanime Plugin: Neither Lampa Listener nor 'appready' flag available immediately. Cannot reliably wait. Attempting delayed initialization as a HIGHLY UNRELIABLE fallback.");
                  setTimeout(initializeLampaDependencies, 500); // Wait 0.5 seconds
                  console.log("Hanime Plugin: Delayed initialization fallback scheduled.");
              }

         } else {
             // Preferred method: Subscribe to Lampa's 'app:ready' event
             console.log("Hanime Plugin: Lampa Listener available. Subscribing to 'app:ready' event.");
             Lampa.Listener.follow('app', function (e) {
                 if (e.type === 'ready') {
                     console.log("Hanime Plugin: Lampa 'appready' event received. Calling initializeLampaDependencies.");
                     initializeLampaDependencies();
                 }
             });
              console.log("Hanime Plugin: Subscribed to Lampa 'app:ready' event.");
         }

         console.log("Hanime Plugin: startPlugin() finished its initial execution (setup listener or fallback).");
    }

    // Start the plugin initialization process
    startPlugin();

})();
