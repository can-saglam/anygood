// AI Features - Natural language processing and AI features
class AIFeatures {
    async parseNaturalLanguage(text) {
        // Enhanced parsing for better detection of consumable content
        const trimmed = text.trim();
        const lower = trimmed.toLowerCase();
        
        // Enhanced category detection with more patterns
        let category = null;
        const categoryPatterns = {
            read: [
                /\b(read|book|novel|author|chapter|page|library|literature|essay|article|blog|post)\b/i,
                /\bISBN\b/i,
                /^["']?[^"'\n]+["']?\s+by\s+/i,
            ],
            listen: [
                /\b(listen|music|album|song|track|artist|band|podcast|episode|playlist|spotify|soundcloud)\b/i,
                /spotify:(track|album|artist|playlist):/i,
            ],
            watch: [
                /\b(watch|movie|film|cinema|series|show|episode|season|netflix|hulu|disney\+|youtube|video)\b/i,
                /\b(IMDB|tt\d{7,8})\b/i,
                /\b\(\d{4}\)\s*$/,  // Year in parentheses at end
            ],
            eat: [
                /\b(eat|restaurant|cafe|bar|bistro|diner|eatery|food|cuisine|menu|dining|reservation)\b/i,
                /\b(michelin|review|yelp|opentable)\b/i,
            ],
            do: [
                /\b(do|activity|event|experience|visit|go|see|explore|trip|travel|adventure)\b/i,
            ]
        };
        
        // Check patterns in order of specificity
        for (const [cat, patterns] of Object.entries(categoryPatterns)) {
            if (patterns.some(pattern => pattern.test(trimmed))) {
                category = cat;
                break;
            }
        }
        
        // Extract title with improved patterns
        let title = trimmed;
        let author = null;
        let description = null;
        
        // Extract title from "Title" by Author format
        const titleByAuthorMatch = trimmed.match(/^["']?([^"'\n]+)["']?\s+by\s+([A-Z][a-zA-Z\s.]+?)(?:\s*[-–—]\s*(.+))?$/i);
        if (titleByAuthorMatch) {
            title = titleByAuthorMatch[1].trim();
            author = titleByAuthorMatch[2].trim();
            description = titleByAuthorMatch[3] ? titleByAuthorMatch[3].trim() : null;
        }
        
        // Extract title from quotes
        const quotedMatch = trimmed.match(/^["']([^"'\n]+)["'](?:\s+(.+))?$/);
        if (quotedMatch && quotedMatch[1].length > 5) {
            title = quotedMatch[1].trim();
            description = quotedMatch[2] ? quotedMatch[2].trim() : null;
        }
        
        // Remove action verbs and category words from beginning
        if (!titleByAuthorMatch && !quotedMatch) {
            title = trimmed.replace(/^(read|watch|listen to|eat at|visit|check out|see)\s+/i, '').trim();
            // Remove category words if category was detected
            if (category) {
                const categoryWords = {
                    read: ['book', 'read'],
                    listen: ['music', 'album', 'song', 'listen'],
                    watch: ['movie', 'film', 'watch', 'show'],
                    eat: ['restaurant', 'cafe', 'food', 'eat'],
                    do: ['activity', 'event', 'do']
                };
                const words = categoryWords[category] || [];
                words.forEach(word => {
                    title = title.replace(new RegExp(`\\b${word}\\b`, 'gi'), '').trim();
                });
            }
        }
        
        // Extract links - enhanced patterns
        const urlPatterns = [
            /https?:\/\/[^\s]+/i,  // HTTP/HTTPS URLs
            /www\.\w+\.\w+[^\s]*/i,  // www URLs
            /spotify:(track|album|artist|playlist):[a-zA-Z0-9]+/i,  // Spotify URIs
        ];
        let link = null;
        for (const pattern of urlPatterns) {
            const match = trimmed.match(pattern);
            if (match) {
                link = match[0];
                // Remove link from title if present
                title = title.replace(pattern, '').trim();
                break;
            }
        }
        
        // Extract ISBN
        const isbnMatch = trimmed.match(/\b(ISBN[- ]*(13|10)?[: ]*)?([0-9]{9,13}[0-9X])\b/i);
        if (isbnMatch && !link) {
            // Could potentially use ISBN to look up book info
        }
        
        // Extract IMDB ID
        const imdbMatch = trimmed.match(/tt(\d{7,8})/i);
        if (imdbMatch && !link) {
            link = `https://www.imdb.com/title/tt${imdbMatch[1]}/`;
        }
        
        // Clean up title - remove trailing punctuation, extra whitespace
        title = title.replace(/\s+/g, ' ').replace(/[.,;:]+$/, '').trim();
        
        // Fallback: use original text if title extraction failed
        if (!title || title.length < 3) {
            title = trimmed;
        }
        
        return {
            title: title,
            description: description,
            link: link,
            category: category,
            author: author
        };
    }

    async autoCategorize(item) {
        const text = (item.text || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        const combined = text + ' ' + desc;
        
        if (combined.includes('book') || combined.includes('read') || combined.includes('author')) return 'read';
        if (combined.includes('music') || combined.includes('album') || combined.includes('song') || combined.includes('listen')) return 'listen';
        if (combined.includes('movie') || combined.includes('film') || combined.includes('watch') || combined.includes('series')) return 'watch';
        if (combined.includes('restaurant') || combined.includes('food') || combined.includes('eat') || combined.includes('dining')) return 'eat';
        if (combined.includes('activity') || combined.includes('do') || combined.includes('event')) return 'do';
        
        return 'do'; // default
    }

    generateTags(item) {
        // Simple tag generation - can be enhanced
        return [];
    }

    summarizeDescription(text, maxLength = 100) {
        if (!text || text.length <= maxLength) return text;
        
        // Try to find a sentence boundary near the max length
        const truncated = text.substring(0, maxLength);
        const lastPeriod = truncated.lastIndexOf('.');
        const lastExclamation = truncated.lastIndexOf('!');
        const lastQuestion = truncated.lastIndexOf('?');
        const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
        
        // If we found a sentence end within reasonable distance, use it
        if (lastSentenceEnd > maxLength * 0.7) {
            return text.substring(0, lastSentenceEnd + 1);
        }
        
        // Otherwise, truncate at word boundary
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > maxLength * 0.8) {
            return text.substring(0, lastSpace) + '...';
        }
        
        // Fallback: hard truncate
        return truncated + '...';
    }
}
