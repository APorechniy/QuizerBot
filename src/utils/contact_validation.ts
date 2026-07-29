type ValidationResult = {
    VALUE: string | null,
    TYPE_ID: "EMAIL" | "PHONE" | "ERROR"
}

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
        return { VALUE: 'Empty string', TYPE_ID: "ERROR" };
    }

    // Проверяем, является ли строка email
    if (trimmed.includes('@')) {
        if (validateEmail(trimmed)) {
            return { VALUE: trimmed, TYPE_ID: "EMAIL" };
        }
        return { VALUE: 'Invalid email format', TYPE_ID: "ERROR" };
    }

    // Проверяем, является ли строка номером телефона
    if (validatePhone(trimmed)) {
        return { VALUE: trimmed, TYPE_ID: "PHONE" };
    }

    // Пытаемся определить по первым символам
    if (/^[\d+]/.test(trimmed)) {
        return { VALUE: 'Invalid phone number format', TYPE_ID: "ERROR" };
    }

    return { VALUE: 'Invalid email or phone number format', TYPE_ID: "ERROR" };
}