import { type UserSessionStorage, type UserSession, QuizState } from "../types";
// In-Memory Хранилище сессий (аналог MemoryStorage в aiogram)
const userSessions: UserSessionStorage = new Map<number, UserSession>();

// Вспомогательные функции сессий
export function getSession(userId: number): UserSession {
    if (!userSessions.has(userId)) {
        userSessions.set(userId, { state: null, currentIndex: 0, answers: [] });
    }
    return userSessions.get(userId)!;
}

export function setSession(userId: number, session: UserSession): void {
    if (!userId || !session.answers || !session.state) {
        console.error("❌ Ошибка при регистрации сессии");
    }
    userSessions.set(userId, session);
}

export function clearSession(userId: number): void {
    userSessions.delete(userId);
}