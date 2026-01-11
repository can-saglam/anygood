// URL Parser - Detects and validates URLs
class URLParser {
    constructor() {
        // Comprehensive URL regex pattern
        this.urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    }

    /**
     * Detects if the text contains a URL
     * @param {string} text - The text to check
     * @returns {string|null} - The detected URL or null
     */
    detectURL(text) {
        if (!text || typeof text !== 'string') {
            return null;
        }

        const trimmedText = text.trim();
        
        // Reset regex state
        this.urlPattern.lastIndex = 0;
        
        // Check if entire text is a URL
        const match = trimmedText.match(this.urlPattern);
        
        if (match && match.length > 0) {
            // Return the first matched URL
            return match[0];
        }
        
        return null;
    }

    /**
     * Validates if the entire input is a URL
     * @param {string} text - The text to validate
     * @returns {boolean} - True if entire text is a URL
     */
    isURL(text) {
        if (!text || typeof text !== 'string') {
            return false;
        }

        const trimmedText = text.trim();
        
        // Must start with http:// or https://
        const protocolMatch = trimmedText.match(/^https?:\/\//i);
        
        if (!protocolMatch) {
            return false;
        }
        
        // Reset regex state
        this.urlPattern.lastIndex = 0;
        
        // Check if entire text matches URL pattern
        const match = trimmedText.match(this.urlPattern);
        
        if (match && match.length > 0) {
            // Check if the match is the entire string (allowing trailing slashes)
            return match[0] === trimmedText || match[0] + '/' === trimmedText;
        }
        
        return false;
    }

    /**
     * Normalizes a URL by adding protocol if missing
     * @param {string} url - The URL to normalize
     * @returns {string} - Normalized URL
     */
    normalizeURL(url) {
        if (!url) return '';
        
        const trimmed = url.trim();
        
        // Add https:// if no protocol
        const hasProtocol = trimmed.match(/^https?:\/\//i);
        
        if (!hasProtocol) {
            return 'https://' + trimmed;
        }
        
        return trimmed;
    }

    /**
     * Extracts hostname from URL
     * @param {string} url - The URL
     * @returns {string} - Hostname or empty string
     */
    getHostname(url) {
        try {
            const urlObj = new URL(this.normalizeURL(url));
            return urlObj.hostname.replace(/^www\./, '');
        } catch (error) {
            return '';
        }
    }

    /**
     * Checks if URL is from a specific domain
     * @param {string} url - The URL to check
     * @param {string} domain - The domain to match (e.g., 'youtube.com')
     * @returns {boolean}
     */
    isFromDomain(url, domain) {
        const hostname = this.getHostname(url);
        return hostname.includes(domain);
    }
}
