// Format South African phone numbers from 0821234567 to +27821234567
export const formatPhoneNumber = (phone) => {
    // Remove all spaces and special characters
    let cleaned = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');

    // If already has +27, return as is
    if (cleaned.startsWith('+27')) {
        return cleaned;
    }

    // If starts with 27, add +
    if (cleaned.startsWith('27')) {
        return '+' + cleaned;
    }

    // If starts with 0, replace with +27
    if (cleaned.startsWith('0')) {
        return '+27' + cleaned.substring(1);
    }

    // Otherwise add +27 to the beginning
    return '+27' + cleaned;
};
