export enum QuizState {
    ANSWERING = 'ANSWERING',
    WAITING_FOR_CONTACT = 'WAITING_FOR_CONTACT'
}

export interface Question {
    id: number;
    text: string;
    options: string[];
}

export interface QuizAnswer {
    question: string;
    answer: string;
}

export interface UserSession {
    state: QuizState | null;
    currentIndex: number;
    answers: QuizAnswer[];
}

export interface BitrixPayload {
    userId: number;
    username?: string;
    fullName: string;
    answers: QuizAnswer[];
    contact: string;
}

export type UserSessionStorage = Map<number, UserSession>