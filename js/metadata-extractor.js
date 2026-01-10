// Metadata Extractor - Extracts metadata from URLs
class MetadataExtractor {
    async extractMetadata(url) {
        try {
            // Use Electron IPC to fetch metadata from main process
            if (typeof window.electronAPI === 'undefined' || !window.electronAPI.fetchURLMetadata) {
                console.warn('electronAPI.fetchURLMetadata not available');
                return {
                    title: null,
                    description: null,
                    image: null,
                    author: null
                };
            }

            // Normalize URL (add protocol if missing)
            let normalizedURL = url.trim();
            if (!normalizedURL.match(/^https?:\/\//i)) {
                normalizedURL = 'https://' + normalizedURL;
            }

            // Fetch metadata via IPC
            const metadata = await window.electronAPI.fetchURLMetadata(normalizedURL);
            
            if (metadata.error) {
                console.log('Metadata extraction error:', metadata.error);
                return {
                    title: null,
                    description: null,
                    image: null,
                    author: null
                };
            }
            
            return {
                title: metadata.title || null,
                description: metadata.description || null,
                image: metadata.image || null,
                author: null // Author not typically in Open Graph tags
            };
        } catch (error) {
            console.error('Metadata extraction error:', error);
            return {
                title: null,
                description: null,
                image: null,
                author: null
            };
        }
    }
}
