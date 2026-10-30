# Видео о направляющей зимних ворот

Карточка на странице [зимних ПВХ ворот](https://speedwash.ru/rulonnye-zimnie-pvh-vorota) открывает оригинальный вертикальный MP4 в модальном окне.

[Демо](https://pvchernev.github.io/speedwash/projects/winter-gates-video/)

## Подключение в Tilda

В Zero Block используются обычные редактируемые группы, изображения и тексты. Превью целиком ссылается на `#sw-winter-video`.

Для поведения поп-апа добавлен один служебный HTML-элемент 1×1 px со скриптом:

```html
<script defer src="https://pvchernev.github.io/speedwash/projects/winter-gates-video/winter-gates-video.js?v=2"></script>
```

Скрипт создаёт native `dialog` только при первом открытии. Ролик не загружается до клика. В плеере доступны звук, перемотка и полноэкранный режим. Закрытие работает по крестику, фону и Esc; воспроизведение останавливается, фокус возвращается на превью.

Изображения блока загружены на CDN Tilda. MP4 размещён на GitHub Pages: `assets/heating-guide.mp4`. Видео сохранено без перекодирования; `faststart` переносит MP4-индекс в начало для быстрого запуска.

## Файлы

- `winter-gates-video.js` — изолированный плеер, не меняющий стили страницы.
- `index.html` — демонстрация карточки и изображения механизма.
- `assets/` — MP4, превью, значок Play и фото механизма без фона.

Проверка локально из корня репозитория: `python3 -m http.server 8765`, затем `/projects/winter-gates-video/`.
