// Metadata Extractor - Extracts rich metadata from URLs
class MetadataExtractor {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days
    }

    async extractMetadata(url) {
        // Check cache first
        const cached = this.cache.get(url);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }

        try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(proxyUrl, {
                signal: controller.signal,
                headers: {
                    'Accept': 'text/html'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const metadata = {
                title: this.extractTitle(doc, url),
                description: this.extractDescription(doc),
                image: this.extractImage(doc, url),
                author: this.extractAuthor(doc),
                siteName: this.extractSiteName(doc),
                type: this.extractType(doc)
            };

            // Cache the result
            this.cache.set(url, {
                data: metadata,
                timestamp: Date.now()
            });

            return metadata;
        } catch (error) {
            console.error('Metadata extraction error:', error);
            // Return basic metadata from URL
            return {
                title: this.extractTitleFromURL(url),
                description: null,
                image: null,
                author: null,
                siteName: this.extractDomain(url),
                type: 'website'
            };
        }
    }

    extractTitle(doc, url) {
        // Try Open Graph first
        const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
        if (ogTitle) return ogTitle;

        // Try Twitter Card
        const twitterTitle = doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content');
        if (twitterTitle) return twitterTitle;

        // Try JSON-LD
        const jsonLd = doc.querySelector('script[type="application/ld+json"]');
        if (jsonLd) {
            try {
                const data = JSON.parse(jsonLd.textContent);
                if (data.name || data.headline) return data.name || data.headline;
            } catch (e) {}
        }

        // Fallback to page title
        const pageTitle = doc.querySelector('title')?.textContent;
        if (pageTitle) return pageTitle;

        return this.extractTitleFromURL(url);
    }

    extractDescription(doc) {
        // Try Open Graph
        const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content');
        if (ogDesc) return ogDesc;

        // Try Twitter Card
        const twitterDesc = doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content');
        if (twitterDesc) return twitterDesc;

        // Try meta description
        const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content');
        if (metaDesc) return metaDesc;

        // Try JSON-LD
        const jsonLd = doc.querySelector('script[type="application/ld+json"]');
        if (jsonLd) {
            try {
                const data = JSON.parse(jsonLd.textContent);
                if (data.description) return data.description;
            } catch (e) {}
        }

        return null;
    }

    extractImage(doc, url) {
        // Try Open Graph
        const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
        if (ogImage) return this.resolveUrl(ogImage, url);

        // Try Twitter Card
        const twitterImage = doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
        if (twitterImage) return this.resolveUrl(twitterImage, url);

        // Try JSON-LD
        const jsonLd = doc.querySelector('script[type="application/ld+json"]');
        if (jsonLd) {
            try {
                const data = JSON.parse(jsonLd.textContent);
                if (data.image) {
                    const image = typeof data.image === 'string' ? data.image : data.image.url;
                    return this.resolveUrl(image, url);
                }
            } catch (e) {}
        }

        return null;
    }

    extractAuthor(doc) {
        // Try various author meta tags
        const author = doc.querySelector('meta[name="author"]')?.getAttribute('content') ||
                      doc.querySelector('meta[property="article:author"]')?.getAttribute('content') ||
                      doc.querySelector('[rel="author"]')?.textContent;

        if (author) return author;

        // Try JSON-LD
        const jsonLd = doc.querySelector('script[type="application/ld+json"]');
        if (jsonLd) {
            try {
                const data = JSON.parse(jsonLd.textContent);
                if (data.author) {
                    if (typeof data.author === 'string') return data.author;
                    if (data.author.name) return data.author.name;
                }
            } catch (e) {}
        }

        return null;
    }

    extractSiteName(doc) {
        const siteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
        return siteName || null;
    }

    extractType(doc) {
        const ogType = doc.querySelector('meta[property="og:type"]')?.getAttribute('content');
        return ogType || 'website';
    }

    extractTitleFromURL(url) {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(p => p);
            if (pathParts.length > 0) {
                return pathParts[pathParts.length - 1].replace(/[-_]/g, ' ').replace(/\.[^.]+$/, '');
            }
            return urlObj.hostname.replace('www.', '');
        } catch (e) {
            return url;
        }
    }

    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch (e) {
            return url;
        }
    }

    resolveUrl(url, baseUrl) {
        if (!url) return null;
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        try {
            return new URL(url, baseUrl).href;
        } catch (e) {
            return url;
        }
    }
}
