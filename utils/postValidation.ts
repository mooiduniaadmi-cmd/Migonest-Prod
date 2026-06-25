/**
 * Utility to detect forbidden contact information in posts.
 * Prevents sharing of Emails, URLs/Websites, and Phone Numbers.
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// URLs: Matches http/https, www. and common domain patterns
// Removing global flag to avoid lastIndex persistence bug in SPAs
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(?:com|org|net|edu|gov|io|co|me|ai|app|info|university|expert|study|biz|online|tech|site|me|top|xyz|id|au|uk|bn|ca|us|de|fr|es|it|nl)(?:\/[^\s]*)?)/i;

// Phone Numbers: Matches international and local formats with 8+ digits and common separators
const PHONE_REGEX = /(?:\+?\d{1,3}[-. ]?)?\(?\d{3,4}\)?[-. ]?\d{3,4}[-. ]?\d{4,}/;

export const containsContactInfo = (text: string): boolean => {
    if (!text) return false;

    // Clean text for validation (strip basic HTML if any, though innerText is preferred)
    const cleanText = text.replace(/<[^>]*>/g, ' ');

    return (
        EMAIL_REGEX.test(cleanText) ||
        URL_REGEX.test(cleanText) ||
        PHONE_REGEX.test(cleanText)
    );
};
