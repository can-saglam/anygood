// Search Engine - Provides search functionality
class SearchEngine {
    search(query, items) {
        if (!query || !items) return [];
        
        const lowerQuery = query.toLowerCase();
        return items.filter(item => {
            const text = item.text?.toLowerCase() || '';
            const desc = item.description?.toLowerCase() || '';
            return text.includes(lowerQuery) || desc.includes(lowerQuery);
        });
    }
}
