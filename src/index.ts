import { Bot, Context } from '@maxhub/max-bot-api';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { QuizState, type Question, type UserSession, type BitrixPayload } from './types';

dotenv.config();

const TOKEN = process.env.BOT_TOKEN;

if (!TOKEN) {
    console.error("❌ Ошибка: BOT_TOKEN не задан в .env файле!");
    process.exit(1);
}

// Инициализация бота
const bot = new Bot(TOKEN);

// In-Memory Хранилище сессий (аналог MemoryStorage в aiogram)
const userSessions = new Map<number, UserSession>();

// Загрузка вопросов из файла
function loadQuestions(): Question[] {
    try {
        const filePath = path.resolve(process.cwd(), 'questions.json');
        const rawData = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(rawData) as Question[];
    } catch (err) {
        console.error("❌ Ошибка при чтении questions.json:", (err as Error).message);
        return [];
    }
}

const QUESTIONS: Question[] = loadQuestions();

// Вспомогательные функции сессий
function getSession(userId: number): UserSession {
    if (!userSessions.has(userId)) {
        userSessions.set(userId, { state: null, currentIndex: 0, answers: [] });
    }
    return userSessions.get(userId)!;
}

function clearSession(userId: number): void {
    userSessions.delete(userId);
}

// Мок-функция отправки в Битрикс24
async function sendToBitrix24(payload: BitrixPayload): Promise<boolean> {
    console.log("\n--- [ОТПРАВКА В БИТРИКС24] ---");
    console.log(`ID пользователя TG/MAX: ${payload.userId}`);
    console.log(`Логин: @${payload.username || 'N/A'}`);
    console.log(`Имя: ${payload.fullName}`);
    console.log(`Ответы: ${JSON.stringify(payload.answers, null, 2)}`);
    console.log(`Контакт: ${payload.contact}`);
    console.log("-----------------------------\n");
    return true;
}

// Отправка вопроса пользователю
async function sendQuestion(ctx: Context, userId: number, questionIndex: number): Promise<void> {
    const session = getSession(userId);

    if (questionIndex < QUESTIONS.length) {
        const question = QUESTIONS[questionIndex];

        // Строим инлайн-кнопки
        const buttons = question.options.map((option: string, optIdx: number) => [
            {
                text: option,
                type: 'callback' as const,
                payload: `ans_${questionIndex}_${optIdx}`
            }
        ]);

        const text = `Вопрос ${questionIndex + 1} из ${QUESTIONS.length}:\n\n${question.text}`;

        await ctx.reply(text, {
            attachments: [
                {
                    type: 'inline_keyboard',
                    payload: { buttons }
                }
            ]
        });
    } else {
        // Переходим к сбору контактов
        session.state = QuizState.WAITING_FOR_CONTACT;

        const contactText =
            "Спасибо за ваши ответы! 🎉\n" +
            "Пожалуйста, оставьте ваш телефон или email, чтобы мы могли связаться с вами.\n\n" +
            "Вы можете нажать на кнопку ниже, чтобы отправить свой контакт из профиля, " +
            "или написать данные текстом вручную.";

        await ctx.reply(contactText, {
            attachments: [
                {
                    type: 'inline_keyboard',
                    payload: {
                        buttons: [
                            [{ text: "📱 Поделиться контактом", type: "request_contact" }]
                        ]
                    }
                }
            ]
        });
    }
}

// 1. Команда /start
bot.command('start', async (ctx: Context) => {
    const userId = ctx.user?.user_id;

    if (!QUESTIONS || QUESTIONS.length === 0 || !userId) {
        await ctx.reply("Извините, сейчас опрос недоступен (список вопросов пуст).");
        return;
    }

    userSessions.set(userId, {
        state: QuizState.ANSWERING,
        currentIndex: 0,
        answers: []
    });

    await ctx.reply("Приветствуем! Ответьте на несколько вопросов, чтобы мы подобрали лучшее решение.");
    await sendQuestion(ctx, userId, 0);
});

// 2. Обработка нажатий на inline-кнопки (callbacks)
bot.on('message_callback', async (ctx: Context) => {
    const userId = ctx.user?.user_id;

    if (!userId) {
        await ctx.reply("Извините, сейчас опрос недоступен (список вопросов пуст).");
        return;
    }

    const session = getSession(userId);
    const payload = ctx.callback?.payload as string;

    if (!payload || !payload.startsWith('ans_')) {
        return;
    }

    // Если игрок уже не проходит опрос
    if (session.state !== QuizState.ANSWERING) {
        await ctx.answerOnCallback({});
        return;
    }

    const [, qIdxStr, optIdxStr] = payload.split('_');
    const qIdx = parseInt(qIdxStr, 10);
    const optIdx = parseInt(optIdxStr, 10);

    // Игнорируем повторные клики по старым вопросам
    if (qIdx !== session.currentIndex) {
        await ctx.answerOnCallback({});
        return;
    }

    const question = QUESTIONS[session.currentIndex];
    const selectedOption = question.options[optIdx];

    session.answers.push({
        question: question.text,
        answer: selectedOption
    });

    session.currentIndex += 1;

    await ctx.answerOnCallback({});
    await ctx.reply(`Ваш выбор: *${selectedOption}*`, { format: 'markdown' });

    // Следующий вопрос
    await sendQuestion(ctx, userId, session.currentIndex);
});

// 3. Обработка текста и контактов
bot.on('message_created', async (ctx: Context) => {
    const textMessage = ctx.message?.body.text;

    // Игнорируем вызовы команд
    if (textMessage && textMessage.startsWith('/')) {
        return;
    }

    const userId = ctx.user?.user_id;

    if (!userId) {
        await ctx.reply("Извините, сейчас опрос недоступен (список вопросов пуст).");
        return;
    }

    const session = getSession(userId);

    // Если человек пытается писать текстом во время квиза
    if (session.state === QuizState.ANSWERING) {
        await ctx.reply("Пожалуйста, выберите один из вариантов ответа с помощью кнопок.");
        return;
    }

    // Ожидание контактов
    if (session.state === QuizState.WAITING_FOR_CONTACT) {
        let contactInfo: string | null = null;

        // Вложение с контактом
        if (ctx.message?.body.attachments) {
            const contactAttach = ctx.message.body.attachments.find((a) => a.type === 'contact');
            if (contactAttach) {
                contactInfo = contactAttach.payload.vcf_info || '';
            }
        }

        // Ввод вручную
        if (!contactInfo && textMessage) {
            contactInfo = textMessage.trim();
        }

        if (!contactInfo) {
            await ctx.reply("Пожалуйста, отправьте контакт по кнопке или напишите его в виде текста.");
            return;
        }

        const username = ctx.user.username || '';
        const fullName = `${ctx.user.name}`.trim();

        const success = await sendToBitrix24({
            userId,
            username,
            fullName,
            answers: session.answers,
            contact: contactInfo
        });

        if (success) {
            await ctx.reply("Спасибо за заявку! Ваши данные успешно сохранены. Менеджер свяжется с вами в ближайшее время.");
        } else {
            await ctx.reply("Произошла ошибка при регистрации заявки. Попробуйте еще раз позже.");
        }

        clearSession(userId);
    }
});

bot.start()
console.log("🚀 TypeScript Бот Макс Мессенджера запущен!");