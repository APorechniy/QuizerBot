import { type Context } from "@maxhub/max-bot-api";
import { clearSession, getSession } from "../storage";
import { QuizState } from "../types";
import { sendToBitrix } from "../integrations/send-to-bitrix";

export async function onMessage(ctx: Context) {
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

        const success = await sendToBitrix({
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
}