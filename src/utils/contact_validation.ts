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

function extractPhoneFromVCF(vcf: string): string | null {
    const lines = vcf.split(/\r?\n/);

    // Ищем строки с TEL в разных форматах
    const telLines = lines.filter(line => {
        const upperLine = line.trim().toUpperCase();
        return upperLine.startsWith('TEL') ||
            upperLine.startsWith('TEL;') ||
            upperLine.includes(':') && upperLine.split(':')[0].includes('TEL');
    });

    for (const line of telLines) {
        // Извлекаем значение после двоеточия
        const parts = line.split(':');
        if (parts.length >= 2) {
            let phoneNumber = parts.slice(1).join(':').trim(); // На случай если в номере есть двоеточие

            // Очищаем от VCF параметров в значении
            phoneNumber = phoneNumber.replace(/;.*$/, '').trim();

            // Удаляем возможные префиксы типов телефонов
            phoneNumber = phoneNumber.replace(/^(tel|phone|voice|fax|cell|mobile|work|home):/i, '').trim();

            if (phoneNumber && validatePhone(phoneNumber)) {
                return phoneNumber;
            }
        }
    }

    return null;
}

function isVCFContent(input: string): boolean {
    const trimmed = input.trim();
    const upperInput = trimmed.toUpperCase();

    return upperInput.includes('BEGIN:VCARD') && upperInput.includes('END:VCARD');
}

function validateVCF(vcf: string): boolean {
    const trimmed = vcf.trim();

    if (!trimmed.startsWith('BEGIN:VCARD') || !trimmed.includes('END:VCARD')) {
        return false;
    }

    if (!/VERSION:\s*\d+\.\d+/i.test(trimmed)) {
        return false;
    }

    const lines = trimmed.split(/\r?\n/);
    const beginIndex = lines.findIndex(line => line.trim().toUpperCase().startsWith('BEGIN:VCARD'));
    const endIndex = lines.findIndex(line => line.trim().toUpperCase().startsWith('END:VCARD'));

    if (beginIndex === -1 || endIndex === -1 || endIndex <= beginIndex) {
        return false;
    }

    return true;
}

export function validateString(input: string | null | undefined): ValidationResult {
    const trimmed = input?.trim();

    if (!trimmed) {
        return { ERROR: 'Empty string' };
    }

    // Проверяем VCF (карточка контакта)
    if (isVCFContent(trimmed)) {
        if (validateVCF(trimmed)) {
            const phoneNumber = extractPhoneFromVCF(trimmed);

            if (phoneNumber) {
                // Если нашли телефон - возвращаем PHONE
                return { PHONE: [{ VALUE: phoneNumber, VALUE_TYPE: "WORK" }] };
            } else {
                // Если телефон не найден в VCF
                return { ERROR: 'No valid phone number found in VCF' };
            }
        }
        return { ERROR: 'Invalid VCF format' };
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

    return { ERROR: `String is neither valid email nor phone number: ${trimmed}` };
}