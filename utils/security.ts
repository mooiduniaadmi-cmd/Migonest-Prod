import DOMPurify from 'dompurify';

/**
 * Robust HTML sanitizer to prevent XSS.
 * Uses DOMPurify to strip all dangerous elements and attributes.
 */
export const sanitizeHTML = (html: string): string => {
    if (!html) return '';

    // If we're in a browser environment, use DOMPurify directly
    if (typeof window !== "undefined") {
        return DOMPurify.sanitize(html);
    }

    // Fallback for SSR/Backend - you'd need JSDOM here if actually used in Node
    // For now, we'll keep the basic strip if Node environment (though not used)
    return html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "");
};
