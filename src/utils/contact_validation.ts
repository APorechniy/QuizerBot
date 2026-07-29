type Value = {
    VALUE: string;
    VALUE_TYPE: "WORK"
}

type ValidationResult =
    | { EMAIL: Value[] }
    | { PHONE: Value[] }
    | { ERROR: string };

function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone: string): boolean {
    // Формат: +7XXXXXXXXXX, 8XXXXXXXXXX, +XXX...
    const phoneRegex = /^(\+?\d{1,3})?[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}$/;
    const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleanedPhone) && cleanedPhone.replace(/\D/g, '').length >= 10;
}

export function validateString(input: string | null): ValidationResult {
    const trimmed = input?.trim();

    if (!trimmed) {
        return { ERROR: 'Empty string' };
    }

    // Проверяем, является ли строка email
    if (trimmed.includes('@')) {
        if (validateEmail(trimmed)) {
            return { EMAIL: [{ VALUE: trimmed, VALUE_TYPE: "WORK" }] };
        }
        return { ERROR: 'Invalid email format' };
    }

    // Проверяем, является ли строка номером телефона
    if (validatePhone(trimmed)) {
        return { PHONE: [{ VALUE: trimmed, VALUE_TYPE: "WORK" }] };
    }

    // Пытаемся определить по первым символам
    if (/^[\d+]/.test(trimmed)) {
        return { ERROR: 'Invalid phone number format' };
    }

    return { ERROR: 'String is neither valid email nor phone number' };
}