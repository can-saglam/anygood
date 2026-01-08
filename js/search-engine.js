// Search Engine - Fuzzy search with semantic capabilities
class SearchEngine {
    constructor() {
        this.index = new Map();
        this.stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    }

    buildIndex(items) {
        this.index.clear();
        items.forEach((item, index) => {
            const terms = this.tokenize(item);
            terms.forEach(term => {
                if (!this.index.has(term)) {
                    this.index.set(term, new Set());
                }
                this.index.get(term).add(index);
            });
        });
    }

    tokenize(item) {
        const text = `${item.text || ''} ${item.description || ''} ${item.tags?.join(' ') || ''}`.toLowerCase();
        const terms = text
            .split(/\s+/)
            .map(term => term.replace(/[^\w]/g, ''))
            .filter(term => term.length > 2 && !this.stopWords.has(term));
        
        // Add n-grams for fuzzy matching
        const ngrams = [];
        terms.forEach(term => {
            if (term.length > 3) {
                for (let i = 0; i <= term.length - 3; i++) {
                    ngrams.push(term.substring(i, i + 3));
                }
            }
        });
        
        return [...new Set([...terms, ...ngrams])];
    }

    search(query, items, options = {}) {
        if (!query || query.trim().length === 0) {
            return items.map((item, index) => ({ item, index, score: 1 }));
        }

        const queryTerms = this.tokenize({ text: query });
        const scores = new Map();

        // Exact matches
        queryTerms.forEach(term => {
            if (this.index.has(term)) {
                this.index.get(term).forEach(index => {
                    scores.set(index, (scores.get(index) || 0) + 10);
                });
            }
        });

        // Fuzzy matches
        items.forEach((item, index) => {
            const itemText = `${item.text || ''} ${item.description || ''}`.toLowerCase();
            queryTerms.forEach(term => {
                if (itemText.includes(term)) {
                    scores.set(index, (scores.get(index) || 0) + 5);
                }
                // Levenshtein distance for typos
                const similarity = this.calculateSimilarity(term, itemText);
                if (similarity > 0.7) {
                    scores.set(index, (scores.get(index) || 0) + similarity * 3);
                }
            });
        });

        // Sort by score
        const results = Array.from(scores.entries())
            .map(([index, score]) => ({ item: items[index], index, score }))
            .sort((a, b) => b.score - a.score);

        // Filter by minimum score if specified
        const minScore = options.minScore || 1;
        return results.filter(r => r.score >= minScore);
    }

    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[str2.length][str1.length];
    }
}
