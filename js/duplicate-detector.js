// Duplicate Detector - Finds duplicate items
class DuplicateDetector {
    findDuplicates(items) {
        // Simple duplicate detection - can be enhanced
        const duplicates = [];
        const seen = new Map();
        
        items.forEach((item, index) => {
            const key = item.text?.toLowerCase().trim();
            if (key && seen.has(key)) {
                const existing = seen.get(key);
                if (!duplicates.find(d => d.indices.includes(existing.index))) {
                    duplicates.push({
                        items: [items[existing.index], item],
                        indices: [existing.index, index]
                    });
                }
            } else if (key) {
                seen.set(key, { index });
            }
        });
        
        return duplicates;
    }

    mergeItems(items) {
        // Merge duplicate items, keeping the best data from each
        const merged = { ...items[0] };
        items.forEach(item => {
            if (item.description && !merged.description) merged.description = item.description;
            if (item.link && !merged.link) merged.link = item.link;
            if (item.tags && !merged.tags) merged.tags = item.tags;
        });
        return merged;
    }
}
