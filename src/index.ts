import { Bot } from '@maxhub/max-bot-api';
import dotenv from 'dotenv';
import { start } from './commands/start';
import { onMessage } from './commands/on_message';
import { onCallback } from './commands/on_callback';

dotenv.config();

const TOKEN = process.env.BOT_TOKEN;
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

if (!TOKEN) {
    console.error("❌ Ошибка: BOT_TOKEN не задан в .env файле!");
    process.exit(1);
}

// Инициализация бота
const bot = new Bot(TOKEN);

// 0. Кнопка "Начать"
bot.on('bot_started', start);
// 1. Команда /start
bot.command('start', start);

// 2. Обработка нажатий на inline-кнопки (callbacks)
bot.on('message_callback', onCallback);

// 3. Обработка текста и контактов
bot.on('message_created', onMessage);

bot.start()
console.log("🚀 TypeScript Бот Макс Мессенджера запущен!");