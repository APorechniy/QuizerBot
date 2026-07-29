import { type Context } from "@maxhub/max-bot-api";
import { QuizState } from "../types";

import { QUESTIONS } from "../questions";
import { sendQuestion } from "./send_question";
import { setSession } from "../storage";

export async function start(ctx: Context) {
    const userId = ctx.user?.user_id;

    if (!QUESTIONS || QUESTIONS.length === 0 || !userId) {
        await ctx.reply("Извините, сейчас опрос недоступен (список вопросов пуст).");
        return;
    }

    setSession(userId, {
        state: QuizState.ANSWERING,
        currentIndex: 0,
        answers: []
    });

    await ctx.reply("Приветствуем! Ответьте на несколько вопросов, чтобы мы подобрали лучшее решение.");
    await sendQuestion(ctx, userId, 0);
}