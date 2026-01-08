// RSS Parser - Handles RSS feed parsing with error handling and fallbacks
class RSSParser {
    constructor() {
        this.corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        this.proxyIndex = 0;
    }

    async parseRSSFeed(url, retries = 3) {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const proxyUrl = this.getProxyUrl(url);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

                const response = await fetch(proxyUrl, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/rss+xml, application/xml, text/xml'
                    }
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const text = await response.text();
                if (!text || text.trim().length === 0) {
                    throw new Error('Empty response from feed');
                }

                const parser = new DOMParser();
                const xml = parser.parseFromString(text, 'text/xml');

                // Check for parsing errors
                const parseError = xml.querySelector('parsererror');
                if (parseError) {
                    throw new Error('Invalid XML format');
                }

                const items = this.extractItems(xml);
                return items.slice(0, 50); // Limit to 50 items

            } catch (error) {
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout - feed took too long to respond');
                }
                
                if (attempt === retries - 1) {
                    // Try next proxy on final attempt
                    this.proxyIndex = (this.proxyIndex + 1) % this.corsProxies.length;
                    if (attempt < retries) {
                        continue;
                    }
                }
                
                if (attempt === retries - 1) {
                    throw new Error(`Failed to fetch RSS feed: ${error.message}`);
                }
            }
        }
        return [];
    }

    getProxyUrl(url) {
        const proxy = this.corsProxies[this.proxyIndex];
        return `${proxy}${encodeURIComponent(url)}`;
    }

    extractItems(xml) {
        const items = [];

        // Try RSS 2.0 format
        let entries = xml.querySelectorAll('item');
        if (entries.length === 0) {
            // Try Atom format
            entries = xml.querySelectorAll('entry');
        }

        entries.forEach(entry => {
            const title = this.getTextContent(entry, 'title');
            const description = this.getTextContent(entry, 'description') || 
                              this.getTextContent(entry, 'summary') ||
                              this.getTextContent(entry, 'content');
            const link = this.getTextContent(entry, 'link') || 
                        entry.querySelector('link')?.getAttribute('href');
            const pubDate = this.getTextContent(entry, 'pubDate') || 
                          this.getTextContent(entry, 'published');

            if (title) {
                items.push({
                    title: this.cleanText(title),
                    description: description ? this.cleanText(description) : null,
                    link: link || null,
                    pubDate: pubDate || null
                });
            }
        });

        return items;
    }

    getTextContent(element, tagName) {
        const node = element.querySelector(tagName);
        return node ? node.textContent : null;
    }

    cleanText(text) {
        // Remove HTML tags and decode entities
        const div = document.createElement('div');
        div.innerHTML = text;
        return div.textContent || div.innerText || '';
    }

    async parseURL(url) {
        try {
            // Detect feed type
            if (url.includes('rss') || url.includes('feed') || url.includes('.xml') || 
                url.includes('atom')) {
                const items = await this.parseRSSFeed(url);
                return items.map(item => item.title);
            } else if (url.includes('spotify.com')) {
                return this.parseSpotifyURL(url);
            } else if (url.includes('letterboxd.com')) {
                return this.parseLetterboxdURL(url);
            } else {
                // Try as RSS anyway
                const items = await this.parseRSSFeed(url);
                return items.map(item => item.title);
            }
        } catch (error) {
            console.error('Error parsing URL:', error);
            throw error;
        }
    }

    parseSpotifyURL(url) {
        const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
        if (match) {
            return [`Spotify playlist: ${match[1]} (requires Spotify API for full import)`];
        }
        return [];
    }

    parseLetterboxdURL(url) {
        const match = url.match(/letterboxd\.com\/[^/]+\/list\/([^/]+)/);
        if (match) {
            return [`Letterboxd list: ${match[1]} (requires scraping for full import)`];
        }
        return [];
    }
}
