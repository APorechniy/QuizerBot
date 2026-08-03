import { type Message } from "@maxhub/max-bot-api/types";
import { type UserSession } from "../types";
import { redis } from "./redis-client";
import { getNotifyMessage } from "../utils/get_notify_message";

const SESSION_PREFIX = "session:";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

const getKey = (userId: number): string => `${SESSION_PREFIX}${userId}`;

// Вспомогательные функции сессий
export async function getSession(userId: number): Promise<UserSession> {
    const key = getKey(userId);
    const data = await redis.get(key);
    console.log("--------")
    console.log("DATA", data)
    console.log("--------")
    if (!data) {
        const newSession: UserSession = {
            state: null,
            currentIndex: 0,
            answers: [],
            lastActivityAt: Date.now(),
            isNotified: false
        };
        // Сохраняем новую сессию
        await setSession(userId, newSession);
        return newSession;
    }

    const session: UserSession = JSON.parse(data);
    return session;
}

export async function setSession(userId: number, session: UserSession): Promise<void> {
    if (!userId) return;

    // Обновляем время активности
    session.lastActivityAt = Date.now();

    const key = getKey(userId);
    const serializedData = JSON.stringify(session);

    // Сохраняем в Redis и выставляем TTL (Time-To-Live)
    await redis.set(key, serializedData, "EX", SESSION_TTL_SECONDS);
}

export async function clearSession(userId: number): Promise<void> {
    const key = getKey(userId);
    await redis.del(key);
}

export async function checkStaleSessions(
    sendMessageFn: (userId: number, message: string) => Promise<Message>
): Promise<void> {
    const NOW = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    let cursor = "0";

    // Используем SCAN вместо KEYS, чтобы не блокировать Redis на больших объемах данных
    do {
        const [nextCursor, keys] = await redis.scan(
            cursor,
            "MATCH", `${SESSION_PREFIX}*`,
            "COUNT", 100
        );
        cursor = nextCursor;

        for (const key of keys) {
            const userId = Number(key.replace(SESSION_PREFIX, ""));
            const data = await redis.get(key);

            if (!data) continue;

            const session: UserSession = JSON.parse(data);

            // Игнорируем пользователей, которые не проходят тест прямо сейчас
            if (!session.state) continue;

            const isStale = (NOW - session.lastActivityAt) > TWENTY_FOUR_HOURS_MS;

            // Если висит > 24ч и еще не уведомляли
            if (isStale && !session.isNotified) {
                try {
                    const templateMessage = getNotifyMessage(session.state);
                    await sendMessageFn(userId, templateMessage);

                    // Отмечаем, что уведомили
                    session.isNotified = true;
                    await setSession(userId, session);
                } catch (error) {
                    console.error(`❌ Ошибка отправки напоминания ${userId}:`, error);
                }
            }
        }
    } while (cursor !== "0");
}

/**
 * Инициализация таймера проверки зависших сессий
 */
export function initSessionCleaner(
    sendMessageFn: (userId: number, message: string) => Promise<Message>,
    intervalMinutes: number = 30
): NodeJS.Timeout {
    const intervalMs = intervalMinutes * 60 * 1000;

    // Запускаем первую проверку через 10 секунд после старта
    setTimeout(() => checkStaleSessions(sendMessageFn), 10000);

    return setInterval(() => {
        checkStaleSessions(sendMessageFn);
    }, intervalMs);
}