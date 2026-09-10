type SuccessResponse = {
    result: number,
    time: {
        start: number,
        finish: number,
        duration: number,
        processing: number,
        date_start: string,
        date_finish: string,
        operating_reset_at: number,
        operating: number
    }
}

type ErrorResponse = {
    error: string;
    error_description: string
}

type BitrixResponse = SuccessResponse | ErrorResponse

export type BitrixLead = {
    TITLE: string;
    NAME?: string;
    LAST_NAME?: string;
    SECOND_NAME?: string;
    COMPANY_TITLE?: string;
    PHONE?: Array<{ VALUE: string; VALUE_TYPE: string }>;
    EMAIL?: Array<{ VALUE: string; VALUE_TYPE: string }>;
    COMMENTS?: string;
    SOURCE_ID?: string;
    STATUS_ID?: string;
    ASSIGNED_BY_ID: number;
}

export async function sendToBitrix(bitrixLead: BitrixLead) {
    const bitrixWebhookUrl = process.env.BITRIX_WEBHOOK_URL;

    if (!bitrixWebhookUrl) {
        console.error("Не подключен адрес вебхука для Bitrix24!")
        return false
    }

    try {
        const response = await fetch(`${bitrixWebhookUrl}/crm.lead.add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fields: bitrixLead
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: BitrixResponse = await response.json();

        if ("error" in data) {
            throw new Error(`Bitrix API Error: ${data.error_description || data.error}`);
        }

        return data.result as number;
    } catch (error) {
        console.error('Ошибка при создании лида:', error);
        throw error;
    }
}