# 🤖 Quiz Bot for Max (Node.js + TypeScript + Redis)

Чат-бот для проведения квизов с интеграцией Bitrix24 и хранением сессий в Redis. Запускается под управлением менеджера процессов PM2.

## 🛠 Технологический стек
- **Node.js** (v18+) & **TypeScript**
- **Redis** — хранение активных сессий пользователей и отслеживание заброшенных квизов (>24ч)
- **PM2** — менеджер процессов для продакшена
- **Bitrix24 REST API** — отправка результатов квиза

---

## 📋 Переменные окружения (`.env`)

Создайте файл `.env` в корневом каталоге проекта со следующим содержимым:

```env
# Токен бота Max
BOT_TOKEN=your_bot_token_here

### Вебхук Bitrix24 для интеграции
BITRIX_WEBHOOK_URL=https://your-domain.bitrix24.ru/rest/1/your_webhook_key/

### Игнорировать ошибки SSL-сертификатов (если требуется для локальных/самоподписанных сертификатов)
NODE_TLS_REJECT_UNAUTHORIZED=0

### Подключение к Redis (по умолчанию локальное)
REDIS_URL=redis://127.0.0.1:6379
```

---

## 🚀 Инструкция по развертыванию на сервере (Ubuntu / Debian)

### 1. Клонирование репозитория
```
git clone https://github.com/your-username/your-quiz-bot.git
cd your-quiz-bot
```

### 2. Установка зависимостей и сборка TypeScript
Используйте `npm` или `yarn`:

**Используя npm:**
```bash
npm install
npm run build
```

**Используя yarn:**
```bash
yarn install
yarn build
```

---

### 3. Настройка и запуск Redis
Для надежного хранения сессий и защиты от потери данных при перезапусках приложения требуется запущенная база данных Redis.

1. Установите Redis:
   ```bash
   sudo apt update
   sudo apt install redis-server -y
   ```
2. Включите автозапуск Redis при старте сервера и запустите его:
   ```bash
   sudo systemctl enable redis-server
   sudo systemctl start redis-server
   ```
3. Проверьте работоспособность (должна вернуть `PONG`):
   ```bash
   redis-cli ping
   ```

---

### 4. Настройка PM2 и ротации логов

1. Установите PM2 глобально (если еще не установлен):
   ```bash
   npm install -g pm2
   ```

2. **[Важно] Настройка плагина ротации логов `pm2-logrotate`:**
   Чтобы логи приложения не переполнили диск сервера, установите и настройте модуль ротации:
   ```bash
   # Установка плагина
   pm2 install pm2-logrotate

   # Лимит одного файла лога — 10 МБ
   pm2 set pm2-logrotate:max_size 10M

   # Хранить не более 10 архивных файлов
   pm2 set pm2-logrotate:retain 10

   # Включить сжатие архивных логов в .gz
   pm2 set pm2-logrotate:compress true
   ```

---

### 5. Запуск приложения

Запустите скомпилированный бот через PM2:

```bash
# Простой запуск из скомпилированной папки dist
pm2 start dist/index.js --name "quiz-bot"
```

*Или через конфигурационный файл (если используется `ecosystem.config.js`):*
```bash
pm2 start ecosystem.config.js
```

Чтобы PM2 и бот автоматически восстанавливались после перезагрузки самого VPS:
```bash
pm2 startup
# (Выполните команду, которую выведет PM2 на экран)
pm2 save
```

---

## 🛠 Полезные команды PM2

- **Статус процессов:** `pm2 status`
- **Просмотр логов в реальном времени:** `pm2 logs quiz-bot`
- **Очистка файлов логов:** `pm2 flush`
- **Перезапуск бота:** `pm2 restart quiz-bot`
- **Остановка бота:** `pm2 stop quiz-bot`
`;