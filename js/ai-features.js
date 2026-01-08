// AI Features - Natural language processing and intelligent features
class AIFeatures {
    constructor() {
        this.apiKey = null; // Set via setApiKey() if using OpenAI
        this.useLocalNLP = true; // Fallback to local pattern matching
    }

    setApiKey(key) {
        this.apiKey = key;
    }

    async parseNaturalLanguage(input) {
        // Try OpenAI API if available
        if (this.apiKey) {
            try {
                return await this.parseWithOpenAI(input);
            } catch (error) {
                console.warn('OpenAI API failed, using local parser:', error);
            }
        }

        // Fallback to local pattern matching
        return this.parseLocal(input);
    }

    async parseWithOpenAI(input) {
        if (!this.apiKey) throw new Error('API key not set');

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{
                    role: 'system',
                    content: 'Extract structured data from user input about items to read, listen, watch, eat, or do. Return JSON with: category (read/listen/watch/eat/do), title, author/artist/director (if mentioned), description (if provided), and any other relevant metadata.'
                }, {
                    role: 'user',
                    content: input
                }],
                temperature: 0.3,
                max_tokens: 200
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        try {
            return JSON.parse(content);
        } catch (e) {
            // If not JSON, try to extract from text
            return this.parseLocal(input);
        }
    }

    parseLocal(input) {
        const result = {
            category: null,
            title: null,
            description: null,
            author: null,
            link: null
        };

        // Detect category keywords
        const categoryPatterns = {
            read: /\b(read|book|novel|article|essay|magazine|author|writer)\b/i,
            listen: /\b(listen|music|album|song|podcast|artist|band|audio)\b/i,
            watch: /\b(watch|movie|film|show|series|tv|documentary|director)\b/i,
            eat: /\b(eat|restaurant|food|dining|cuisine|chef|meal)\b/i,
            do: /\b(do|visit|go|see|activity|event|place|experience)\b/i
        };

        for (const [category, pattern] of Object.entries(categoryPatterns)) {
            if (pattern.test(input)) {
                result.category = category;
                break;
            }
        }

        // Extract title (usually in quotes or after keywords)
        const quoteMatch = input.match(/["']([^"']+)["']/);
        if (quoteMatch) {
            result.title = quoteMatch[1];
        } else {
            // Try to extract after keywords
            const titleMatch = input.match(/(?:read|listen|watch|eat|do)\s+(?:to|the)?\s*["']?([^"']+?)(?:\s+by|\s+at|$)/i);
            if (titleMatch) {
                result.title = titleMatch[1].trim();
            } else {
                // Fallback: use input as title
                result.title = input.replace(/\b(read|listen|watch|eat|do)\b/gi, '').trim();
            }
        }

        // Extract author/artist/director (after "by")
        const byMatch = input.match(/\bby\s+([^,\.]+)/i);
        if (byMatch) {
            result.author = byMatch[1].trim();
        }

        // Extract description (after dash or colon)
        const descMatch = input.match(/(?:[-–—:]|description:)\s*(.+)/i);
        if (descMatch && descMatch[1] !== result.title) {
            result.description = descMatch[1].trim();
        }

        // Extract URLs
        const urlMatch = input.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
            result.link = urlMatch[1];
        }

        return result;
    }

    async generateRecommendations(userItems, category, count = 5) {
        // Analyze user preferences
        const preferences = this.analyzePreferences(userItems);
        
        // Generate recommendations based on patterns
        // In a real implementation, this would call an AI service
        const recommendations = [];
        
        // Simple pattern-based recommendations
        if (category === 'read') {
            const genres = this.extractGenres(userItems);
            recommendations.push(...this.getBookRecommendations(genres, count));
        } else if (category === 'listen') {
            const artists = this.extractArtists(userItems);
            recommendations.push(...this.getMusicRecommendations(artists, count));
        }
        
        return recommendations;
    }

    analyzePreferences(items) {
        const completed = items.filter(i => i.completed);
        const preferences = {
            genres: [],
            authors: [],
            themes: []
        };

        // Simple keyword extraction
        completed.forEach(item => {
            const text = `${item.text} ${item.description || ''}`.toLowerCase();
            // Extract common genres/themes (simplified)
            if (text.includes('fiction')) preferences.genres.push('fiction');
            if (text.includes('non-fiction')) preferences.genres.push('non-fiction');
            if (text.includes('sci-fi') || text.includes('science fiction')) preferences.genres.push('sci-fi');
        });

        return preferences;
    }

    extractGenres(items) {
        const genres = new Set();
        items.forEach(item => {
            const text = `${item.text} ${item.description || ''}`.toLowerCase();
            if (text.includes('fiction')) genres.add('fiction');
            if (text.includes('non-fiction')) genres.add('non-fiction');
            if (text.includes('mystery')) genres.add('mystery');
            if (text.includes('sci-fi')) genres.add('sci-fi');
        });
        return Array.from(genres);
    }

    extractArtists(items) {
        const artists = new Set();
        items.forEach(item => {
            const byMatch = item.text.match(/\bby\s+([^,\.]+)/i);
            if (byMatch) artists.add(byMatch[1].trim());
        });
        return Array.from(artists);
    }

    getBookRecommendations(genres, count) {
        // Placeholder - in real implementation, would call API
        return [
            { text: 'Recommended book 1', description: 'Based on your preferences' },
            { text: 'Recommended book 2', description: 'Similar to items you liked' }
        ].slice(0, count);
    }

    getMusicRecommendations(artists, count) {
        // Placeholder - in real implementation, would call API
        return [
            { text: 'Recommended album 1', description: 'Similar artists' },
            { text: 'Recommended album 2', description: 'Based on your taste' }
        ].slice(0, count);
    }

    async autoCategorize(item) {
        const text = `${item.text} ${item.description || ''}`.toLowerCase();
        
        const categoryKeywords = {
            read: ['book', 'novel', 'read', 'author', 'essay', 'article', 'magazine'],
            listen: ['album', 'song', 'music', 'listen', 'artist', 'band', 'podcast'],
            watch: ['movie', 'film', 'watch', 'show', 'series', 'tv', 'documentary'],
            eat: ['restaurant', 'food', 'eat', 'dining', 'cuisine', 'meal', 'cafe'],
            do: ['visit', 'go', 'see', 'do', 'activity', 'event', 'place', 'experience']
        };

        let maxScore = 0;
        let bestCategory = 'do'; // default

        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            const score = keywords.reduce((acc, keyword) => {
                return acc + (text.includes(keyword) ? 1 : 0);
            }, 0);
            
            if (score > maxScore) {
                maxScore = score;
                bestCategory = category;
            }
        }

        return bestCategory;
    }

    generateTags(item) {
        const tags = [];
        const text = `${item.text} ${item.description || ''}`.toLowerCase();
        
        // Simple tag generation based on keywords
        const tagKeywords = {
            'london': ['london', 'hackney', 'shoreditch', 'dalston'],
            'fiction': ['fiction', 'novel', 'story'],
            'non-fiction': ['non-fiction', 'essay', 'biography'],
            'electronic': ['electronic', 'techno', 'house', 'garage'],
            'indie': ['indie', 'alternative', 'underground'],
            'film': ['film', 'movie', 'cinema'],
            'restaurant': ['restaurant', 'dining', 'food']
        };

        for (const [tag, keywords] of Object.entries(tagKeywords)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                tags.push(tag);
            }
        }

        return tags;
    }
}
