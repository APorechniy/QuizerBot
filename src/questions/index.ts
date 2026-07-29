import { type Question } from "../types";
import * as fs from 'fs';
import * as path from 'path';

// Загрузка вопросов из файла
function loadQuestions(): Question[] {
    try {
        const filePath = path.resolve(__dirname, 'questions.json');
        const rawData = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(rawData) as Question[];
    } catch (err) {
        console.error("❌ Ошибка при чтении questions.json:", (err as Error).message);
        return [];
    }
}

export const QUESTIONS: Question[] = loadQuestions();