# SpeedWash

Общий репозиторий сайтов, виджетов и решений для [SpeedWash](https://speedwash.ru).

**[Каталог проектов](https://pvchernev.github.io/speedwash/)**

## Проекты

| Проект | Описание | Ссылки |
| --- | --- | --- |
| `projects/cases-map/` | Интерактивная карта кейсов: выбор региона, поиск, модели робот-моек и карточки объектов | [Демо](https://pvchernev.github.io/speedwash/projects/cases-map/) · [Инструкция](projects/cases-map/README.md) · [Код для Тильды](projects/cases-map/tilda-embed.html) |

## Структура

```text
speedwash/
├── index.html                 # Каталог проектов
├── README.md                  # Общая документация
├── package.json               # npm workspaces и общие команды
└── projects/
    └── cases-map/             # Самостоятельный проект карты кейсов
        ├── index.html         # Демо карты
        ├── tilda-embed.html    # Короткий код вставки
        ├── speedwash-map.js
        ├── speedwash-map.css
        ├── assets/
        ├── scripts/
        ├── package.json
        └── README.md
```

Для каждого нового сайта или решения создавайте отдельную папку `projects/<название>/` со своим `README.md`, исходниками и ресурсами. Если нужен отдельный npm-пакет, добавьте в него `package.json` с именем `@speedwash/<название>` и `private: true`: шаблон npm workspaces уже подключает такие папки.

Готовую страницу проекта размещайте в его `index.html`; добавьте ссылку на неё в каталог и таблицу выше. Статические проекты доступны по адресу `https://pvchernev.github.io/speedwash/projects/<название>/`. Для проектов со сборкой публикуйте её статический результат в этой папке. Серверные приложения требуют отдельного хостинга, их исходники также можно хранить здесь.

## Публикация

GitHub Pages публикует корень ветки `main`. Общий адрес: `https://pvchernev.github.io/speedwash/`. Каждый проект имеет собственный путь и использует относительные ссылки на свои ресурсы.

После переименования репозитория код подключения карты на Тильде нужно заменить на новый:

```html
<div data-speedwash-map></div>
<script defer src="https://pvchernev.github.io/speedwash/projects/cases-map/speedwash-map.js"></script>
```

## Локальная работа

```sh
npm ci
npm run serve
```

Откройте `http://localhost:8765/` для каталога или `http://localhost:8765/projects/cases-map/` для карты.

Команды проекта карты из корня:

```sh
npm run build:map       # Пересобрать векторную геометрию
npm run refresh:cases   # Обновить резервную копию публичных кейсов
```

Для обычного просмотра готовой карты Node.js и установка зависимостей не нужны: достаточно `python3 -m http.server 8765`.
