import { type Context } from "@maxhub/max-bot-api";
import { QUESTIONS } from "../questions";
import { sendQuestion } from "./send_question";
import { QuizState } from "../types";
import { getSession, setSession } from "../storage";

export async function onCallback(ctx: Context) {
    const userId = ctx.user?.user_id;

    if (!userId) {
        await ctx.reply("Извините, сейчас опрос недоступен (список вопросов пуст).");
        return;
    }

    const session = await getSession(userId);
    const payload = ctx.callback?.payload as string;
    const currentQuestionIndex = session.currentIndex

    if (!payload || !payload.startsWith('ans_')) {
        return;
    }

    // Если игрок уже не проходит опрос
    if (session.state !== QuizState.ANSWERING) {
        return;
    }

    const [, qIdxStr, optIdxStr] = payload.split('_');
    const qIdx = parseInt(qIdxStr, 10);
    const optIdx = parseInt(optIdxStr, 10);

    // Игнорируем повторные клики по старым вопросам
    if (qIdx !== currentQuestionIndex) {
        return;
    }

    const question = QUESTIONS[currentQuestionIndex];
    const selectedOption = question.options[optIdx];

    session.answers.push({
        question: question.text,
        answer: selectedOption
    });

    await setSession(userId, {
        ...session,
        currentIndex: currentQuestionIndex + 1
    })

    await ctx.reply(`Ваш выбор: *${selectedOption}*`, { format: 'markdown' });

    // Следующий вопрос
    await sendQuestion(ctx, userId, currentQuestionIndex + 1);
}