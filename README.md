# Старт рядом

Bot-first MVP для MAX: студент получает inline-меню, проходит короткую анкету и получает рекомендации прямо в чате. Mini-app подготовлен как следующий слой, но пока не является обязательным и не зарегистрирован в MAX. Текущий каталог содержит синтетические данные для демонстрации.

## Запуск

Требования: Node.js 20+ и Docker Desktop.

### Только MAX-бот

Это текущий основной MVP: отдельный сайт для пользователя не нужен.

```bash
cp .env.example .env
nano .env
npm install
npm run bot
```

В `.env` обязательно укажите `MAX_BOT_TOKEN`. Для разработки бот использует Long Polling, поэтому входящие порты не требуются.

То же через Docker, без web/API/Caddy:

```bash
docker compose -f compose.bot.yaml up -d --build
```

Для разработки mini-app отдельно:

```bash
npm install
npm run api
npm run dev
```

Бот получает обновления через Long Polling и не требует входящего HTTPS. Команда `/start` отправляет одно inline-меню; mini-app подключается позже через `open_app`.

## Docker

Все локальные компоненты запускаются одной командой:

```bash
docker compose up --build
```

После запуска клиент доступен на `http://localhost:4173`, API — на `http://localhost:3001`.

Остановка и повторный запуск:

```bash
docker compose down
docker compose up --build
```

## Production на Ubuntu

`compose.production.yaml` оставлен для будущего режима bot + mini-app. Для текущего bot-first MVP используйте `compose.bot.yaml`. Для production MAX рекомендует заменить Long Polling на Webhook; тогда потребуется публичный HTTPS endpoint для событий бота.

Для текущего бота DNS и порты `80/443` не обязательны. Они понадобятся при подключении mini-app.

Создайте локальный `.env` рядом с `compose.production.yaml`:

```bash
cp .env.example .env
nano .env
```

Заполните минимум:

```env
MAX_BOT_TOKEN=рабочий_токен_из_локального_файла
MAX_MINIAPP_URL=
```

Запуск:

```bash
docker compose -f compose.production.yaml up -d --build
```

Проверка:

```bash
curl http://localhost:3001/api/health
docker compose -f compose.production.yaml logs -f bot
```

Остановка без удаления сертификатов:

```bash
docker compose -f compose.production.yaml down
```

Caddy хранит сертификаты в Docker volume `caddy_data`. Не удаляйте этот volume при обычном обновлении проекта.

## MAX и Telegram: параллели

| Telegram | MAX | Наш проект |
| --- | --- | --- |
| `getUpdates` / webhook | Long Polling / webhook | Long Polling для разработки, Webhook для production |
| `callback_query` | событие `message_callback` | inline-кнопки с callback payload |
| Inline Keyboard | `inline_keyboard` | анкета и навигация прямо в чате |
| Web App button | кнопка типа `open_app` | подключается после регистрации mini-app |
| `Telegram.WebApp` | `window.WebApp` / MAX Bridge | `initData`, платформа, стартовый payload |
| BotFather Web App settings | MAX для бизнеса → настройки бота | mini-app принадлежит боту и не автономен |

Важное различие: MAX mini-app нельзя рассматривать как отдельный сайт. HTTPS-адрес нужен только как технический URL загрузки, а пользователь запускает приложение внутри чата MAX. Обычная кнопка `link` открывает внешнюю ссылку; для mini-app используется `open_app`.

Источники:

- [MAX Bridge](https://dev.max.ru/docs/webapps/bridge)
- [Подключение мини-приложения](https://dev.max.ru/docs/webapps/introduction)
- [Клавиатура и open_app](https://dev.max.ru/docs-api/use-cases/sending-messages/keyboard)
- [Long Polling и Webhook](https://dev.max.ru/docs-api/methods/GET/updates)
- [Официальный MAX Bot API Client](https://github.com/max-messenger/max-bot-api-client-ts)

## Основной сценарий

1. Открыть стартовый экран и нажать «Начать подбор».
2. Выбрать направление, город, формат и опыт.
3. Открыть одну из рекомендаций.
4. Проверить объяснение совпадения и чек-лист.
5. Сохранить вариант.

## Архитектура

- `src/` — подготовленный React/Vite mini-app, пока необязательный слой.
- `server/server.js` — Node.js API без закрытых библиотек.
- `server/max-bot.js` — MAX-бот на официальном `@maxhub/max-bot-api`, inline-клавиатуры и основной пользовательский сценарий.
- API возвращает синтетический каталог возможностей и выполняет объяснимый скоринг.
- MAX API подключен через официальный Bot SDK. Long Polling используется для разработки; перед production нужно перейти на Webhook по рекомендациям MAX. MAX UI и MAX Bridge подготовлены для следующего этапа после регистрации mini-app.
- mini-app не является отдельным сайтом: он открывается внутри MAX после регистрации URL у бота и запуска кнопкой `open_app`.

## API

- `GET /api/health` — состояние сервиса.
- `GET /api/opportunities` — список возможностей; фильтры: `direction`, `city`, `format`.
- `GET /api/opportunities/:id` — одна возможность.
- `POST /api/recommendations` — профиль пользователя в JSON и список рекомендаций.
- `POST /api/saved` — демонстрационное сохранение возможности.

Пример запроса рекомендаций:

```json
{
  "direction": "IT и аналитика",
  "city": "Казань",
  "format": "Любой",
  "experience": "Без опыта"
}
```

## Ограничения MVP

- Данные синтетические и не являются реальными вакансиями.
- Реальные интеграции с вузами и работодателями пока не подключены.
- Mini-app еще не зарегистрирован в MAX; текущая проверяемая версия работает через inline-сообщения бота.
- Авторизация и хранение персональных данных отсутствуют.
- Напоминания являются следующим этапом после проверки основного сценария.

## Проверка качества

```bash
npm run lint
npm run build
```

Рабочие токены и другие секреты не хранятся в репозитории. Для будущих интеграций используйте `.env.example` как шаблон переменных окружения.
