import { Keyboard, type Context } from "@maxhub/max-bot-api";
import { QuizState } from "../types";

import { QUESTIONS } from "../questions";
import { getSession } from "../storage";

// Отправка вопроса пользователю
export async function sendQuestion(ctx: Context, userId: number, questionIndex: number): Promise<void> {
    const session = await getSession(userId);

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
            ],
        });
    } else {
        // Переходим к сбору контактов
        session.state = QuizState.WAITING_FOR_CONTACT;

        const contactText =
            "Спасибо за ваши ответы! 🎉\n" +
            "Пожалуйста, оставьте ваш телефон или email, чтобы мы могли связаться с вами.\n\n" +
            "Вы можете нажать на кнопку ниже, чтобы отправить свой контакт из профиля, " +
            "или написать данные текстом вручную.";

        const keyboard = Keyboard.inlineKeyboard([
            [Keyboard.button.requestContact('📱 Поделиться контактом')]
        ])

        await ctx.reply(contactText, {
            attachments: [
                keyboard
            ]
        });
    }
}