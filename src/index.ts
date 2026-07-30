import { Bot } from '@maxhub/max-bot-api';
import dotenv from 'dotenv';
import { start } from './commands/start';
import { onMessage } from './commands/on_message';
import { onCallback } from './commands/on_callback';
import { initSessionCleaner } from './storage';

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

async function bootstrap() {
    // 1. Инициализируем фоновую проверку (каждые 30 минут)
    initSessionCleaner(bot.api.sendMessageToUser, 30);

    // 2. Запускаем бота
    await bot.start();
    console.log("🤖 Бот успешно запущен");
}

bootstrap();