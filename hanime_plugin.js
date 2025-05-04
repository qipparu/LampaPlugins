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

  function HanimeSectionComponent() {
    var network = new Lampa.Reguest();
    var scroll = new Lampa.Scroll({ mask: true });
    var items = [];
    var html = $('<div></div>');
    var body = $('<div class="category-full"></div>');
    var last;
    var activity = Lampa.Activity.active();

    this.create = function () {
      this.activity = activity;
      this.url = activity.params.url;
      this.section = activity.params.section;

      this.activity.loader(true);
      network.native(this.url,
        data => {
          if (data && data.metas && Array.isArray(data.metas)) {
            this.build(data.metas);
          } else {
            this.empty('Неверный формат данных');
          }
        },
        err => {
          this.empty('Не удалось загрузить данные');
          console.error(err);
        }
      );
    };

    this.build = function (metas) {
      items.forEach(item => item.destroy());
      items = [];
      body.empty();

      metas.forEach(meta => {
        const card = new HanimeCard(meta);
        const cardElement = card.render();

        cardElement.on('hover:focus', () => {
          last = cardElement[0];
          scroll.update(cardElement, true);
        }).on('hover:enter', () => {
          this.fetchStreamAndMeta(meta.id, meta);
        });

        body.append(cardElement);
        items.push(card);
      });

      let scrollRender = scroll.render();
      let scrollContent = scrollRender.find('.scroll__content');
      let scrollBody = scrollRender.find('.scroll__body');

      if (!scrollBody.length) {
        scrollBody = $('<div class="scroll__body"></div>');
        scrollContent.append(scrollBody);
      } else {
        scrollBody.empty();
      }

      scrollBody.append(body);

      if (!html.find('.scroll-box').length) {
        html.append(scrollRender);
      }

      this.activity.loader(false);
      this.activity.toggle();
      requestAnimationFrame(() => scroll.reset());
    };

    this.fetchStreamAndMeta = HanimeComponent.prototype.fetchStreamAndMeta;
    this.empty = HanimeComponent.prototype.empty;
    this.start = HanimeComponent.prototype.start;
    this.pause = function () {};
    this.stop = function () {};
    this.render = function () { return html; };
    this.destroy = HanimeComponent.prototype.destroy;
    this.back = HanimeComponent.prototype.back;
  }

  function startPlugin() {
    if (window.plugin_hanime_catalog_ready) return;
    window.plugin_hanime_catalog_ready = true;

    Lampa.Template.add('standard-lampa-card', standardLampaCardTemplate);
    Lampa.Component.add('hanime_catalog', HanimeComponent);
    Lampa.Component.add('hanime_section', HanimeSectionComponent);

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
