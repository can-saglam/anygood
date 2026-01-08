// Duplicate Detector - Finds and suggests merging of duplicate items
class DuplicateDetector {
    constructor() {
        this.similarityThreshold = 0.85; // 85% similarity
    }

    findDuplicates(items) {
        const duplicates = [];
        const processed = new Set();

        for (let i = 0; i < items.length; i++) {
            if (processed.has(i)) continue;

            const group = [i];
            for (let j = i + 1; j < items.length; j++) {
                if (processed.has(j)) continue;

                const similarity = this.calculateSimilarity(items[i], items[j]);
                if (similarity >= this.similarityThreshold) {
                    group.push(j);
                    processed.add(j);
                }
            }

            if (group.length > 1) {
                duplicates.push({
                    indices: group,
                    items: group.map(idx => items[idx]),
                    confidence: this.calculateGroupConfidence(group.map(idx => items[idx]))
                });
                processed.add(i);
            }
        }

        return duplicates.sort((a, b) => b.confidence - a.confidence);
    }

    calculateSimilarity(item1, item2) {
        const scores = [];

        // Compare titles
        if (item1.text && item2.text) {
            scores.push(this.stringSimilarity(
                this.normalizeText(item1.text),
                this.normalizeText(item2.text)
            ));
        }

        // Compare descriptions
        if (item1.description && item2.description) {
            scores.push(this.stringSimilarity(
                this.normalizeText(item1.description),
                this.normalizeText(item2.description)
            ) * 0.7); // Weight descriptions less
        }

        // Compare links (exact match = high score)
        if (item1.link && item2.link) {
            if (this.normalizeUrl(item1.link) === this.normalizeUrl(item2.link)) {
                scores.push(1.0);
            } else {
                scores.push(this.stringSimilarity(
                    this.normalizeUrl(item1.link),
                    this.normalizeUrl(item2.link)
                ) * 0.5);
            }
        }

        // Return weighted average
        if (scores.length === 0) return 0;
        return scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    stringSimilarity(str1, str2) {
        // Levenshtein distance normalized to 0-1
        const maxLen = Math.max(str1.length, str2.length);
        if (maxLen === 0) return 1.0;

        const distance = this.levenshteinDistance(str1, str2);
        return 1 - (distance / maxLen);
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

    normalizeText(text) {
        return text.toLowerCase()
            .trim()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ');
    }

    normalizeUrl(url) {
        try {
            const urlObj = new URL(url);
            return `${urlObj.hostname}${urlObj.pathname}`.toLowerCase();
        } catch (e) {
            return url.toLowerCase();
        }
    }

    calculateGroupConfidence(items) {
        // Higher confidence if more fields match
        let matches = 0;
        let total = 0;

        for (let i = 0; i < items.length - 1; i++) {
            for (let j = i + 1; j < items.length; j++) {
                if (items[i].text && items[j].text) {
                    total++;
                    if (this.normalizeText(items[i].text) === this.normalizeText(items[j].text)) {
                        matches++;
                    }
                }
                if (items[i].link && items[j].link) {
                    total++;
                    if (this.normalizeUrl(items[i].link) === this.normalizeUrl(items[j].link)) {
                        matches++;
                    }
                }
            }
        }

        return total > 0 ? matches / total : 0;
    }

    mergeItems(items) {
        // Merge items, keeping the most complete one
        const merged = { ...items[0] };

        // Combine all unique fields
        items.forEach(item => {
            if (item.description && !merged.description) {
                merged.description = item.description;
            }
            if (item.link && !merged.link) {
                merged.link = item.link;
            }
            if (item.tags && !merged.tags) {
                merged.tags = item.tags;
            }
            // Keep the earliest creation date
            if (item.id && item.id < merged.id) {
                merged.id = item.id;
            }
        });

        return merged;
    }
}
