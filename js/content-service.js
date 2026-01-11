// ContentService - Manages curated content from Supabase
class ContentService {
    constructor() {
        this.supabase = null;
        this.cache = {
            curatedPicks: {},
            rssSources: {},
            lastFetch: null
        };
        this.cacheExpiry = 60 * 60 * 1000; // 1 hour cache
        this.isInitialized = false;
    }

    async init() {
        try {
            // Check if Supabase is available
            if (typeof window.supabase === 'undefined') {
                console.warn('Supabase library not loaded. Using fallback mode.');
                return;
            }

            // Load config from external file or localStorage
            const config = this.loadConfig();
            
            if (!config.url || !config.anonKey) {
                console.warn('Supabase not configured. Run with fallback mode.');
                return;
            }

            // Initialize Supabase client
            this.supabase = window.supabase.createClient(config.url, config.anonKey);
            this.isInitialized = true;
            
            console.log('ContentService initialized with Supabase');
        } catch (error) {
            console.error('Error initializing ContentService:', error);
        }
    }

    loadConfig() {
        // Try to load from localStorage first (for easy configuration)
        const stored = localStorage.getItem('supabase_config');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.warn('Invalid stored Supabase config');
            }
        }

        // Fallback to environment or placeholder
        return {
            url: process.env.SUPABASE_URL || '',
            anonKey: process.env.SUPABASE_ANON_KEY || ''
        };
    }

    // Configure Supabase credentials (call this before init)
    setConfig(url, anonKey) {
        localStorage.setItem('supabase_config', JSON.stringify({ url, anonKey }));
        console.log('Supabase config saved. Reinitialize to apply.');
    }

    // Fetch curated picks for a category
    async getCuratedPicks(category, forceRefresh = false) {
        // Check cache first
        const now = Date.now();
        if (!forceRefresh && this.cache.curatedPicks[category] && 
            this.cache.lastFetch && (now - this.cache.lastFetch) < this.cacheExpiry) {
            return this.cache.curatedPicks[category];
        }

        if (!this.supabase || !this.isInitialized) {
            console.log('Supabase not available, returning fallback curated picks');
            return this.getFallbackCuratedPicks(category);
        }

        try {
            const { data, error } = await this.supabase
                .from('curated_picks')
                .select('*')
                .eq('category', category)
                .eq('is_published', true)
                .order('priority', { ascending: false })
                .order('published_at', { ascending: false })
                .limit(10); // Top 10 picks per category

            if (error) {
                console.error('Supabase query error:', error);
                return this.getFallbackCuratedPicks(category);
            }

            // Transform to app format
            const picks = data.map(item => ({
                id: item.id,
                text: item.title,
                description: item.description,
                link: item.link,
                image: item.image_url,
                author: item.author,
                curatorNote: item.curator_note,
                tags: item.tags || [],
                completed: false,
                curated: true,
                source: 'Anygood',
                createdAt: item.created_at
            }));

            // Update cache
            this.cache.curatedPicks[category] = picks;
            this.cache.lastFetch = now;

            return picks;
        } catch (error) {
            console.error('Error fetching curated picks:', error);
            return this.getFallbackCuratedPicks(category);
        }
    }

    // Fallback curated picks (hardcoded for demo/offline mode)
    getFallbackCuratedPicks(category) {
        const fallbacks = {
            read: [
                {
                    id: 'fallback-read-1',
                    text: 'Tomorrow, and Tomorrow, and Tomorrow',
                    description: 'Gabrielle Zevin - A novel about two friends and the video game they create',
                    link: 'https://www.goodreads.com/book/show/58784475',
                    author: 'Gabrielle Zevin',
                    completed: false,
                    curated: true,
                    source: 'Anygood'
                },
                {
                    id: 'fallback-read-2',
                    text: 'The Creative Act - Rick Rubin',
                    description: 'Essential reading for any creative person',
                    link: 'https://www.penguinrandomhouse.com/books/717356/',
                    author: 'Rick Rubin',
                    completed: false,
                    curated: true,
                    source: 'Anygood'
                },
                {
                    id: 'fallback-read-3',
                    text: 'How to Do Nothing',
                    description: 'Jenny Odell - Resisting the attention economy',
                    link: 'https://www.penguinrandomhouse.com/books/600671/',
                    author: 'Jenny Odell',
                    completed: false,
                    curated: true,
                    source: 'Anygood'
                }
            ],
            listen: [
                {
                    id: 'fallback-listen-1',
                    text: 'Overmono - Good Lies',
                    description: 'UK electronic duo\'s debut album blending garage and breaks',
                    link: 'https://overmono.lnk.to/GoodLies',
                    completed: false,
                    curated: true,
                    source: 'Anygood'
                },
                {
                    id: 'fallback-listen-2',
                    text: 'The Lot Radio',
                    description: 'Independent online radio broadcasting live from a shipping container',
                    link: 'https://thelotradio.com',
                    completed: false,
                    curated: true,
                    source: 'Anygood'
                }
            ],
            watch: [
                {
                    id: 'fallback-watch-1',
                    text: 'Past Lives',
                    description: 'Celine Song - A deeply moving film about childhood friends reuniting',
                    link: 'https://www.imdb.com/title/tt13238346/',
                    completed: false,
                    curated: true,
                    source: 'Anygood'
                }
            ],
            eat: [
                {
                    id: 'fallback-eat-1',
                    text: 'Rochelle Canteen',
                    description: 'Arnold Circus - Simple British cooking in a beautiful space',
                    link: 'https://www.arnoldandhenderson.com',
                    completed: false,
                    curated: true,
                    source: 'Anygood'
                }
            ],
            do: [
                {
                    id: 'fallback-do-1',
                    text: 'Barbican Conservatory',
                    description: 'Hidden tropical oasis in the heart of the City',
                    link: 'https://www.barbican.org.uk/visit/conservatory',
                    completed: false,
                    curated: true,
                    source: 'Anygood'
                }
            ]
        };

        return fallbacks[category] || [];
    }

    // Fetch all curated picks (for initial load)
    async getAllCuratedPicks(forceRefresh = false) {
        const categories = ['read', 'listen', 'watch', 'eat', 'do'];
        const results = {};

        await Promise.all(
            categories.map(async (category) => {
                results[category] = await this.getCuratedPicks(category, forceRefresh);
            })
        );

        return results;
    }

    // Fetch RSS sources (so you can manage them in Supabase too)
    async getRSSSources(category) {
        if (!this.supabase || !this.isInitialized) {
            return this.getDefaultRSSSources(category);
        }

        try {
            const { data, error } = await this.supabase
                .from('rss_sources')
                .select('*')
                .eq('category', category)
                .eq('is_active', true)
                .order('priority', { ascending: true });

            if (error) {
                console.error('Error fetching RSS sources:', error);
                return this.getDefaultRSSSources(category);
            }

            return data.map(source => ({
                name: source.name,
                url: source.url,
                type: 'rss'
            }));
        } catch (error) {
            console.error('Error fetching RSS sources:', error);
            return this.getDefaultRSSSources(category);
        }
    }

    // Fallback hardcoded RSS sources
    getDefaultRSSSources(category) {
        const sources = {
            read: [
                { name: 'The Guardian Books', url: 'https://www.theguardian.com/books/rss', type: 'rss' },
                { name: 'London Review of Books', url: 'https://www.lrb.co.uk/feed', type: 'rss' },
                { name: 'Literary Hub', url: 'https://lithub.com/feed/', type: 'rss' }
            ],
            listen: [
                { name: 'Resident Advisor Events', url: 'https://ra.co/xml/eventlistings.xml', type: 'rss' },
                { name: 'The Quietus Music', url: 'https://thequietus.com/feed', type: 'rss' },
                { name: 'Pitchfork Reviews', url: 'https://pitchfork.com/rss/reviews/albums/', type: 'rss' }
            ],
            watch: [
                { name: 'Little White Lies', url: 'https://lwlies.com/feed/', type: 'rss' },
                { name: 'The Guardian Film', url: 'https://www.theguardian.com/film/rss', type: 'rss' },
                { name: 'BFI', url: 'https://www.bfi.org.uk/rss', type: 'rss' }
            ],
            eat: [
                { name: 'Hot Dinners London', url: 'https://www.hot-dinners.com/feed', type: 'rss' },
                { name: 'London Eater', url: 'https://london.eater.com/rss/index.xml', type: 'rss' },
                { name: 'Timeout London Food', url: 'https://www.timeout.com/london/restaurants/rss.xml', type: 'rss' }
            ],
            do: [
                { name: 'Londonist Events', url: 'https://londonist.com/feed', type: 'rss' },
                { name: 'Time Out London', url: 'https://www.timeout.com/london/feed', type: 'rss' },
                { name: 'Eventbrite London', url: 'https://www.eventbrite.co.uk/rss/london', type: 'rss' }
            ]
        };
        return sources[category] || [];
    }

    // Clear cache (for manual refresh)
    clearCache() {
        this.cache = {
            curatedPicks: {},
            rssSources: {},
            lastFetch: null
        };
    }

    // Check if Supabase is properly configured
    isConfigured() {
        return this.isInitialized && this.supabase !== null;
    }

    // Get configuration status for debugging
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasSupabase: this.supabase !== null,
            cacheStatus: {
                categories: Object.keys(this.cache.curatedPicks),
                lastFetch: this.cache.lastFetch ? new Date(this.cache.lastFetch).toISOString() : null
            }
        };
    }
}
