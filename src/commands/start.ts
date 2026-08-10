import { type Context } from "@maxhub/max-bot-api";
import { QuizState } from "../types";

import { QUESTIONS } from "../questions";
import { sendQuestion } from "./send_question";
import { setSession } from "../storage";
import { delay } from "../utils/delay";

const START_MESSAGE = `
    Приветствуем! На связи компания ООО "АРКО". Мы занимаемся привозом авто из Японии, Китая и Кореи.\n
Работаем с 2008 года и за 18 лет мы прошли через все кризисы, изменения пошлин и курсовые скачки, поэтому знаем, как привезти машину максимально выгодно для вас и с полным соблюдением всех норм законодательства. Мы отработали алгоритм до мелочей — никаких сбоев, задержек и непредвиденных расходов. \n
Каждый автомобиль мы подбираем индивидуально под конкретного клиента. Универсальных решений не бывает, поэтому перед поиском мы всегда уточняем ключевые детали. Это занимает пару минут, но экономит вам часы перебора неподходящих вариантов. \n
Чтобы мы могли подобрать для вас оптимальный вариант, пожалуйста, ответьте на несколько вопросов.
`

export async function start(ctx: Context) {
    const userId = ctx.user?.user_id;

    if (!QUESTIONS || QUESTIONS.length === 0 || !userId) {
        await ctx.reply("Извините, сейчас опрос недоступен (список вопросов пуст).");
        return;
    }

    setSession(userId, {
        state: QuizState.ANSWERING,
        currentIndex: 0,
        answers: [],
        lastActivityAt: Date.now(),
        isNotified: false
    });

    await ctx.reply(START_MESSAGE);
    await delay(7)
    await sendQuestion(ctx, userId);
}