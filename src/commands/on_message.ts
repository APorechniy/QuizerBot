import { type Context } from "@maxhub/max-bot-api";
import { clearSession, getSession } from "../storage";
import { QuizState } from "../types";
import { sendToBitrix } from "../integrations/send-to-bitrix";
import { validateString } from "../utils/contact_validation";

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

    const session = await getSession(userId);

    // Если человек пытается писать текстом во время квиза
    if (session.state === QuizState.ANSWERING) {
        await ctx.reply("Пожалуйста, выберите один из вариантов ответа с помощью кнопок.");
        return;
    }

    // Ожидание контактов
    if (session.state === QuizState.WAITING_FOR_CONTACT) {
        let contactInfo: string | null | undefined = ctx.contactInfo?.tel;

        // Вложение с контактом
        if (ctx.message?.body.attachments && !contactInfo) {
            const contactAttach = ctx.message.body.attachments.find((a) => a.type === 'contact');
            if (contactAttach) {
                contactInfo = contactAttach.payload.vcf_info || '';
            }
        }

        // Ввод вручную
        if (!contactInfo && textMessage) {
            contactInfo = textMessage.trim();
        }

        const validateContact = validateString(contactInfo)

        if (!validateContact || "ERROR" in validateContact) {
            await ctx.reply(`Пожалуйста, отправьте контакт по кнопке или напишите его в виде текста. Ошибка: ${validateContact?.ERROR}`);
            return;
        }

        const username = ctx.user.username || '';

        const success = await sendToBitrix({
            TITLE: "Тестовый лид с бота в MAX",
            NAME: username,
            ...validateContact,
            COMMENTS: session.answers.reduce((acc, curr, index) => {
                return acc + `Ответ №${index + 1}: ${curr.answer}\n`
            }, '')
        });

        if (success) {
            await ctx.reply("Спасибо за заявку! Ваши данные успешно сохранены. Менеджер свяжется с вами в ближайшее время.");
        } else {
            await ctx.reply("Произошла ошибка при регистрации заявки. Попробуйте еще раз позже.");
        }

        await clearSession(userId);
    }
}