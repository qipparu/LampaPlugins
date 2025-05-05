(function () {
'use strict';

// Шаблон карточки
var standardLampaCardTemplate = `
<div class="card selector layer--visible layer--render card--loaded">
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
    title: data.name || data.title || 'Без названия'
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
  var scroll = new Lampa.Scroll({ mask: true, over: true });
  var items = [];
  var html = $('<div class="hanime-root"></div>');
  var body = $('<div class="category-full"></div>');
  var last;

  const API_BASE_URL = "https://86f0740f37f6-hanime-stremio.baby-beamup.club";
  const CATALOG_URLS = {
    newset: "/catalog/movie/newset.json",
    recent: "/catalog/movie/recent.json",
    mostlikes: "/catalog/movie/mostlikes.json",
    mostviews: "/catalog/movie/mostviews.json"
  };
  const PROXY_BASE_URL = "http://77.91.78.5:3000";

  this.create = function () {
    this.fetchCatalogs();
  };

  this.fetchCatalogs = () => {
    this.activity.loader(true);
    network.clear();

    const promises = Object.entries(CATALOG_URLS).map(([key, path]) => {
      return new Promise((resolve, reject) => {
        network.native(API_BASE_URL + path,
          (data) => {
            if (data && Array.isArray(data.metas)) resolve({ key, data: data.metas });
            else reject(key);
          },
          (error) => reject(key)
        );
      });
    });

    Promise.allSettled(promises).then(results => {
      const catalogData = {};
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          catalogData[result.value.key] = result.value.data;
        }
      });

      if (Object.keys(catalogData).length > 0) {
        this.build(catalogData);
      } else {
        this.empty("Ошибка загрузки данных.");
      }
    });
  };

  this.build = (catalogData) => {
    items.forEach(i => i.destroy());
    items = [];
    body.empty();

    Object.entries(catalogData).forEach(([key, data]) => {
      if (!data.length) return;

      const sectionTitle = getTitle(key);
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
            section: key,
            url: API_BASE_URL + CATALOG_URLS[key]
          }
        });
      });

      const sectionBlock = $('<div class="items-line layer--visible layer--render items-line--type-cards"></div>')
        .append(sectionHeader)
        .append(scrollContainer);

      data.forEach(meta => {
        const card = new HanimeCard(meta);
        const cardElem = card.render();

        cardElem.on('hover:focus', () => {
          last = cardElem[0];
          horizontalScroll.update(cardElem, true);
        });

        cardElem.on('hover:enter', () => {
          this.fetchStreamAndMeta(meta.id, meta);
        });

        scrollContainer.find('.items-cards').append(cardElem);
        items.push(card);
      });

      body.append(sectionBlock);
    });

    scroll.render().find('.scroll__body').empty().append(body);

    if (!html.find('.scroll-box').length) {
      html.append(scroll.render(true));
    }

    this.activity.loader(false);
    this.activity.toggle();
    scroll.reset();
  };

  function getTitle(key) {
    return {
      newset: "Новое",
      recent: "Последние",
      mostlikes: "Популярное",
      mostviews: "Самые просматриваемые"
    }[key] || key;
  }

  this.fetchStreamAndMeta = (id, meta) => {
    this.activity.loader(true);
    network.native(`${API_BASE_URL}/stream/movie/${id}.json`,
      (streamData) => {
        this.activity.loader(false);
        if (!streamData.streams?.length) {
          Lampa.Noty.show('Нет потоков.');
          return;
        }

        let streamUrl = streamData.streams[0].url;

        try {
          const url = new URL(streamUrl);
          if (url.hostname.includes('highwinds-cdn.com') || url.hostname.includes('proxy.hentai.stream')) {
            streamUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(streamUrl)}`;
          }
        } catch {}

        const player = {
          title: meta.name || meta.title,
          url: streamUrl,
          poster: meta.poster || meta.background
        };

        Lampa.Player.play(player);
        Lampa.Player.playlist([player]);
        Lampa.Favorite.add('history', {
          id: meta.id,
          title: player.title,
          poster: player.poster
        }, 100);
      },
      (err) => {
        this.activity.loader(false);
        Lampa.Noty.show("Ошибка потока");
      }
    );
  };

  this.empty = (msg) => {
    const empty = new Lampa.Empty({ message: msg });
    scroll.render().empty().append(empty.render(true));
    if (!html.find('.scroll-box').length) html.append(scroll.render(true));
    this.activity.loader(false);
    this.activity.toggle();
    this.start = empty.start;
  };

  this.start = () => {
    if (Lampa.Activity.active().activity !== this.activity) return;

    Lampa.Controller.add('content', {
      toggle: () => {
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

  this.pause = () => {};
  this.stop = () => {};
  this.render = () => html;
  this.back = () => Lampa.Activity.backward();
  this.destroy = () => {
    network.clear();
    Lampa.Arrays.destroy(items);
    scroll?.destroy();
    html.remove();
  };
}

function startPlugin() {
  if (window.plugin_hanime_catalog_ready) return;
  window.plugin_hanime_catalog_ready = true;

  Lampa.Template.add('standard-lampa-card', standardLampaCardTemplate);
  Lampa.Component.add('hanime_catalog', HanimeComponent);

  function addMenuItem() {
    const menuItem = $(`
      <li class="menu__item selector">
        <div class="menu__ico">
          <svg fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <div class="menu__text">Hanime Каталог</div>
      </li>
    `);

    menuItem.on('hover:enter', () => {
      Lampa.Activity.push({
        url: '',
        title: 'Hanime Каталог',
        component: 'hanime_catalog',
        page: 1
      });
    });

    $('.menu .menu__list').eq(0).append(menuItem);
  }

  if (window.appready) {
    addMenuItem();
  } else {
    Lampa.Listener.follow('app', (e) => {
      if (e.type === 'ready') addMenuItem();
    });
  }
}

startPlugin();
})();
