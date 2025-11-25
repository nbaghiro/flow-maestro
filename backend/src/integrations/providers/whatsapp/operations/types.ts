/**
 * WhatsApp operation response types
 */

export interface WhatsAppSendResponse {
    messageId: string;
    recipientPhone: string;
    status?: string;
}

export interface WhatsAppBusinessProfileResponse {
    about?: string;
    address?: string;
    description?: string;
    email?: string;
    profilePictureUrl?: string;
    vertical?: string;
    websites?: string[];
}

export interface WhatsAppPhoneNumberResponse {
    id: string;
    displayPhoneNumber: string;
    verifiedName: string;
    qualityRating: string;
    codeVerificationStatus?: string;
    platformType?: string;
    throughputLevel?: string;
}

export interface WhatsAppMessageTemplateResponse {
    id: string;
    name: string;
    status: string;
    category: string;
    language: string;
    components: Array<{
        type: string;
        text?: string;
        format?: string;
        buttons?: Array<{
            type: string;
            text: string;
            url?: string;
            phoneNumber?: string;
        }>;
    }>;
}
