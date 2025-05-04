(function () {
  'use strict';

  var standardLampaCardTemplate = `
    <div class="card selector layer--visible layer--render card--loaded" tabindex="0">
      <div class="card__view">
        <img src="{img}" class="card__img" alt="{title}" loading="lazy" />
        <div class="card__icons"><div class="card__icons-inner"></div></div>
        <div class="card__vote">7.0</div>
        <div class="card__quality"><div>HD</div></div>
      </div>
      <div class="card__title">{title}</div>
      <div class="card__age">2025</div>
    </div>
  `;

  function HanimeCard(data) {
    var cardElement = $(Lampa.Template.get('standard-lampa-card', {
      img: data.poster || '',
      title: data.name || ''
    }));

    this.render = function () {
      return cardElement;
    };

    this.destroy = function () {
      cardElement.remove();
    };
  }

  function HanimeComponent() {
    var network = new Lampa.Reguest();
    var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
    var items = [];
    var html = $('<div></div>');
    var body = $('<div class="category-full"></div>');
    var last;

    var API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
    var CATALOG_URLS = {
      newset: "/catalog/movie/newset.json",
      recent: "/catalog/movie/recent.json",
      mostlikes: "/catalog/movie/mostlikes.json",
      mostviews: "/catalog/movie/mostviews.json"
    };
    var PROXY_BASE_URL = "http://77.91.78.5:3000";

    this.fetchCatalogs = function () {
      var _this = this;
      _this.activity.loader(true);
      network.clear();

      const requests = Object.entries(CATALOG_URLS).map(([key, path]) => {
        return new Promise((resolve, reject) => {
          network.native(API_BASE_URL + path,
            function (data) {
              if (data && data.metas && Array.isArray(data.metas)) {
                resolve({ key, data: data.metas });
              } else {
                reject({ key, error: "Invalid data format" });
              }
            },
            function (errorStatus) {
              reject({ key, error: `Request failed: ${errorStatus}` });
            });
        });
      });

      Promise.allSettled(requests).then(results => {
        const catalogData = results
          .filter(r => r.status === 'fulfilled')
          .reduce((acc, r) => {
            acc[r.value.key] = r.value.data;
            return acc;
          }, {});

        if (Object.keys(catalogData).length > 0) {
          _this.build(catalogData);
        } else {
          _this.empty("Не удалось загрузить данные с сервера");
        }
      });
    };

    this.build = function (catalogData) {
      var _this = this;
      items.forEach(item => item.destroy());
      items = [];
      body.empty();

      Object.entries(catalogData).forEach(([sectionKey, data]) => {
        if (data.length > 0) {
          const sectionTitle = getTitle(sectionKey);
          const sectionHeader = $(`
            <div class="items-line__head">
              <div class="items-line__title">${sectionTitle}</div>
              <div class="items-line__more selector">Еще</div>
            </div>
          `);

          const horizontalScroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
          const scrollContainer = $('<div class="items-line__body"><div class="scroll scroll--horizontal"><div class="scroll__content"><div class="scroll__body items-cards"></div></div></div></div>');

          sectionHeader.find('.items-line__more').on('hover:enter', () => {
            Lampa.Activity.push({
              url: '',
              title: sectionTitle,
              component: 'hanime_section',
              page: 1,
              params: {
                section: sectionKey,
                url: API_BASE_URL + CATALOG_URLS[sectionKey]
              }
            });
          });

          const itemsLine = $('<div class="items-line layer--visible layer--render items-line--type-cards"></div>')
            .append(sectionHeader)
            .append(scrollContainer);

          const cardsContainer = scrollContainer.find('.items-cards');

          data.forEach(meta => {
            const card = new HanimeCard(meta);
            const cardElement = card.render();

            cardElement.on('hover:focus', () => {
              last = cardElement[0];

              if (cardElement && cardElement[0] && typeof cardElement[0].getBoundingClientRect === 'function') {
                horizontalScroll.update(cardElement, true);
              }
            }).on('hover:enter', () => {
              _this.fetchStreamAndMeta(meta.id, meta);
            });

            cardsContainer.append(cardElement);
            items.push(card);
          });

          horizontalScroll.append(itemsLine);
          horizontalScroll.update();
          body.append(itemsLine);
        }
      });

      const renderedScroll = scroll.render();
      const scrollContent = renderedScroll.find('.scroll__content');
      let scrollBody = renderedScroll.find('.scroll__body');

      if (!scrollBody.length) {
        scrollBody = $('<div class="scroll__body"></div>');
        scrollContent.append(scrollBody);
      } else {
        scrollBody.empty();
      }

      scrollBody.append(body);

      if (!html.find('.scroll-box').length) {
        html.append(renderedScroll);
      }

      _this.activity.loader(false);
      _this.activity.toggle();
      requestAnimationFrame(() => scroll.reset());
    };

    function getTitle(key) {
      const titles = {
        newset: "Новое",
        recent: "Последнее",
        mostlikes: "Популярное",
        mostviews: "Самое просматриваемое"
      };
      return titles[key] || key;
    }

    this.fetchStreamAndMeta = function (id, meta) {
      var _this = this;
      var streamUrl = API_BASE_URL + `/stream/movie/${id}.json`;

      _this.activity.loader(true);
      network.native(streamUrl,
        function (streamData) {
          _this.activity.loader(false);

          if (streamData && streamData.streams && streamData.streams.length > 0) {
            let finalStreamUrl = streamData.streams[0].url;

            try {
              const url = new URL(finalStreamUrl);
              if (url.hostname.includes('highwinds-cdn.com') || url.hostname.includes('proxy.hentai.stream')) {
                finalStreamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
              }
            } catch (e) {
              console.error("URL parsing error", e);
            }

            const playerObject = {
              title: meta.name || meta.title || 'Без названия',
              url: finalStreamUrl,
              poster: meta.poster || meta.background
            };

            if (playerObject.url) {
              Lampa.Player.play(playerObject);
              Lampa.Player.playlist([playerObject]);
              Lampa.Favorite.add('history', {
                id: meta.id,
                title: meta.name || meta.title,
                poster: meta.poster || meta.background
              }, 100);
            } else {
              Lampa.Noty.show('Не удалось получить ссылку на поток.');
            }
          } else {
            Lampa.Noty.show('Потоки не найдены.');
          }
        },
        function (errorStatus) {
          _this.activity.loader(false);
          console.error("Stream fetch error", errorStatus);
          Lampa.Noty.show(`Ошибка загрузки потока: ${errorStatus}`);
        });
    };

    this.empty = function (msg) {
      var empty = new Lampa.Empty({ message: msg });
      scroll.render().empty().append(empty.render(true));
      if (!html.find('.scroll-box').length) {
        html.append(scroll.render(true));
      }
      this.activity.loader(false);
      this.activity.toggle();
      this.start = empty.start;
    };

    this.create = function () {
      this.fetchCatalogs();
    };

    this.start = function () {
      if (Lampa.Activity.active().activity !== this.activity) return;
      Lampa.Controller.add('content', {
        toggle: function () {
          Lampa.Controller.collectionSet(scroll.render());
          Lampa.Controller.collectionFocus(last || false, scroll.render());
        },
        left: () => Navigator.canmove('left') ? Navigator.move('left') : Lampa.Controller.toggle('menu'),
        right: () => Navigator.move('right'),
        up: () => Navigator.canmove('up') ? Navigator.move('up') : Lampa.Controller.toggle('head'),
        down: () => Navigator.move('down'),
        back: this.back
      });
      Lampa.Controller.toggle('content');
    };

    this.pause = function () {};
    this.stop = function () {};
    this.render = function () { return html; };
    this.destroy = function () {
      network.clear();
      Lampa.Arrays.destroy(items);
      if (scroll) {
        scroll.onEnd = null;
        scroll.destroy();
      }
      if (html) html.remove();
      items = null; network = null; scroll = null; html = null; body = null; last = null;
    };
    this.back = function () { Lampa.Activity.backward(); };
  }

  function startPlugin() {
    if (window.plugin_hanime_catalog_ready) return;
    window.plugin_hanime_catalog_ready = true;

    Lampa.Template.add('standard-lampa-card', standardLampaCardTemplate);
    Lampa.Component.add('hanime_catalog', HanimeComponent);

    function addMenuItem() {
      var menu_item = $(
        `<li class="menu__item selector">
          <div class="menu__ico">
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"></path>
            </svg>
          </div>
          <div class="menu__text">Hanime Каталог</div>
        </li>`
      );

      menu_item.on('hover:enter', function () {
        Lampa.Activity.push({
          url: '',
          title: 'Hanime Каталог',
          component: 'hanime_catalog',
          page: 1
        });
      });

      $('.menu .menu__list').eq(0).append(menu_item);
    }

    if (window.appready) {
      addMenuItem();
    } else {
      Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') addMenuItem();
      });
    }
  }

  startPlugin();
})();
