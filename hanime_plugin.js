this.build = function (result) {
    var _this = this;

    // Очищаем предыдущие карточки
    items.forEach(function(item) { item.destroy(); });
    items = [];
    body.empty();

    // Создаем блок с заголовком и кнопкой "Ещё"
    const header = $(`
        <div class="items-line__head">
            <div class="items-line__title">Аниме</div>
            <div class="items-line__more selector">Еще</div>
        </div>
    `);

    // Создаем контейнер для карточек в виде горизонтальной ленты
    const itemsLineBody = $('<div class="items-line__body"></div>');
    const horizontalScroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });

    // Добавляем карточки в горизонтальный скролл
    result.forEach(function (meta) {
        var card = new HanimeCard(meta);
        var cardElement = card.render();

        // Обработчики событий для фокуса и нажатия
        cardElement.on('hover:focus', function () {
            last = cardElement[0];
            horizontalScroll.update(cardElement, true);
        }).on('hover:enter', function () {
            console.log("Selected Anime:", meta.id, meta.name);
            _this.fetchStreamAndMeta(meta.id, meta);
        });

        // Добавляем карточку в скролл
        horizontalScroll.append(cardElement);
        items.push(card);
    });

    // Добавляем скролл в items-line__body
    itemsLineBody.append(horizontalScroll.render());

    // Собираем общий блок items-line
    const itemsLine = $('<div class="items-line layer--visible layer--render items-line--type-cards"></div>')
        .append(header)
        .append(itemsLineBody);

    // Добавляем items-line в body (category-full)
    body.append(itemsLine);

    // Проверяем, был ли уже добавлен body в scroll
    if (scroll.render().find('.category-full').length === 0) {
        const scrollBody = scroll.render().find('.scroll__body') || $('<div class="scroll__body"></div>');
        scroll.render().find('.scroll__content').append(scrollBody);
        scrollBody.append(body);
    }

    if (html.find('.scroll-box').length === 0) {
        html.append(scroll.render(true));
    }

    // Завершение загрузки
    _this.activity.loader(false);
    _this.activity.toggle();

    // Инициализируем обработчик окончания скролла
    scroll.onEnd = function () {
        console.log("Reached end of scroll.");
    };

    // Сброс позиции скролла
    requestAnimationFrame(() => scroll.reset());
};
