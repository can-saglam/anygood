// Enhanced AnygoodApp with all improvements and AI features
class AnygoodApp {
    constructor() {
        // Initialize modules
        this.storage = new StorageManager();
        this.storage.showError = (msg) => this.showNotification(msg, 'error');
        this.rssParser = new RSSParser();
        this.metadataExtractor = new MetadataExtractor();
        this.duplicateDetector = new DuplicateDetector();
        this.searchEngine = new SearchEngine();
        this.aiFeatures = new AIFeatures();
        this.undoRedo = new UndoRedoManager();
        this.urlParser = new URLParser();
        
        // Initialize settings and services
        this.authService = new AuthService();
        this.syncService = new SyncService(this.authService, this.storage);
        this.settings = new SettingsManager(this.storage, this.authService, this.syncService);

        // Core data - load categories from storage or use defaults
        const savedCategories = this.storage.load('categories');
        this.categories = savedCategories || ['read', 'listen', 'watch', 'eat', 'do'];
        this.categoryMetadata = this.storage.load('categoryMetadata') || {
            read: { icon: '📚', name: 'Read' },
            listen: { icon: '🎵', name: 'Listen' },
            watch: { icon: '📺', name: 'Watch' },
            eat: { icon: '🍽️', name: 'Eat' },
            do: { icon: '✨', name: 'Do' }
        };
        this.items = this.storage.load('items') || {};
        this.collections = this.storage.load('collections') || {};
        this.currentCategory = null;
        this.selectedItems = new Set();
        this.bulkMode = false;
        this.pendingToggle = null;
        this.isLoading = false;
        this.completedItemsExpanded = {}; // Track which categories have completed items expanded
        this.activeItemId = null; // Track which item is in active/editing state

        // Initialize categories
        this.categories.forEach(cat => {
            if (!this.items[cat]) this.items[cat] = [];
            if (!this.collections[cat]) this.collections[cat] = [];
            if (this.completedItemsExpanded[cat] === undefined) {
                this.completedItemsExpanded[cat] = false; // Collapsed by default
            }
        });

        // Suggested sources
        this.suggestedSources = {
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

        // Populate placeholder data if first run
        if (this.isFirstRun()) {
            this.populatePlaceholderData();
            // Save placeholder data immediately
            this.storage.save('items', this.items);
            this.storage.save('collections', this.collections);
        } else {
            // Ensure each default category has at least an empty Anygood Digest collection if collections are empty
            // Only create digest for default categories, not user-created ones
            const defaultCategories = ['read', 'listen', 'watch', 'eat', 'do'];
            this.categories.forEach(cat => {
                // Only create digest for default categories
                if (defaultCategories.includes(cat)) {
                    if (!this.collections[cat] || this.collections[cat].length === 0) {
                        // Create empty Anygood Digest collection
                        this.collections[cat] = [{
                            id: Date.now(),
                            name: 'Anygood Digest',
                            digest: true,
                            expanded: true,
                            lastUpdated: Date.now(),
                            sourceUrl: null,
                            items: []
                        }];
                        this.storage.save('collections', this.collections);
                    } else {
                        // Check if Anygood Digest exists, if not add it
                        const hasDigest = this.collections[cat].some(c => c.name === 'Anygood Digest' && c.digest);
                        if (!hasDigest) {
                            this.collections[cat].unshift({
                                id: Date.now(),
                                name: 'Anygood Digest',
                                digest: true,
                                expanded: true,
                                lastUpdated: Date.now(),
                                sourceUrl: null,
                                items: []
                            });
                            this.storage.save('collections', this.collections);
                        }
                    }
                }
            });
        }

        // Save initial state for undo
        this.saveState();

        // Initialize async services
        this.authService.init().catch(err => console.error('Auth init error:', err));
        this.syncService.init().catch(err => console.error('Sync init error:', err));
        this.settings.applySettings();

        this.init();

        // Auto-populate recommendations in background (only if empty)
        // Don't await - let it run asynchronously
        setTimeout(() => {
            this.autoPopulateRecommendations().catch(err => {
                // Silently handle errors - this is background operation
                console.log('Auto-populate recommendations error:', err);
            });
        }, 1000);
    }

    isFirstRun() {
        // Check if items are empty or don't exist
        const itemsEmpty = Object.keys(this.items).length === 0 || 
                          Object.values(this.items).every(arr => !arr || arr.length === 0);
        // Check if collections are empty or don't exist
        const collectionsEmpty = Object.keys(this.collections).length === 0 || 
                                Object.values(this.collections).every(arr => !arr || arr.length === 0);
        return itemsEmpty && collectionsEmpty;
    }

    isCoreCategory(category) {
        // Core categories are the default 5 categories
        const coreCategories = ['read', 'listen', 'watch', 'eat', 'do'];
        return coreCategories.includes(category);
    }

    populatePlaceholderData() {
        // READ items
        this.items.read = [
            {
                id: Date.now() - 1000,
                text: 'Tomorrow, and Tomorrow, and Tomorrow',
                description: 'Gabrielle Zevin - A novel about two friends and the video game they create',
                link: 'https://www.goodreads.com/book/show/58784475',
                completed: false
            },
            { id: Date.now() - 999, text: 'The Creative Act - Rick Rubin', completed: true },
            { id: Date.now() - 998, text: 'Raven Leilani - Luster', completed: false },
            { id: Date.now() - 997, text: 'How to Do Nothing - Jenny Odell', completed: false },
            { id: Date.now() - 996, text: 'Brick Lane - Monica Ali', completed: true }
        ];

        // LISTEN items
        this.items.listen = [
            {
                id: Date.now() - 2000,
                text: 'The Lot Radio',
                description: 'Independent online radio broadcasting live from a shipping container',
                link: 'https://thelotradio.com',
                completed: false
            },
            {
                id: Date.now() - 1999,
                text: 'Overmono - Good Lies',
                description: 'UK electronic duo\'s debut album blending garage and breaks',
                link: 'https://overmono.lnk.to/GoodLies',
                completed: true
            },
            {
                id: Date.now() - 1998,
                text: 'NTS Radio - Floating Points',
                description: 'Eclectic DJ sets and radio shows from the electronic producer',
                link: 'https://www.nts.live/artists/floating-points',
                completed: false
            },
            {
                id: Date.now() - 1997,
                text: 'Black Country, New Road - Ants From Up There',
                description: 'Expansive post-rock masterpiece from London septet',
                link: 'https://blackcountrynewroad.bandcamp.com',
                completed: false
            },
            {
                id: Date.now() - 1996,
                text: 'Fred again.. - actual life 3',
                description: 'Electronic diary of found sounds and club beats',
                link: 'https://www.fredagain.com',
                completed: true
            }
        ];

        // WATCH items
        this.items.watch = [
            {
                id: Date.now() - 3000,
                text: 'Past Lives',
                description: 'Celine Song - Quietly devastating romance about paths not taken',
                link: 'https://www.imdb.com/title/tt13238346/',
                completed: false
            },
            {
                id: Date.now() - 2999,
                text: 'The Bear S3',
                description: 'Chicago restaurant drama continues its Michelin-star ambitions',
                link: 'https://www.imdb.com/title/tt14452776/',
                completed: false
            },
            {
                id: Date.now() - 2998,
                text: 'Aftersun',
                description: 'Charlotte Wells - A daughter\'s fragmented memories of a Turkish holiday',
                link: 'https://www.imdb.com/title/tt19770238/',
                completed: true
            },
            {
                id: Date.now() - 2997,
                text: 'Anatomy of a Fall',
                description: 'Justine Triet - Palme d\'Or winner dissecting a marriage',
                link: 'https://www.imdb.com/title/tt17009710/',
                completed: false
            },
            {
                id: Date.now() - 2996,
                text: 'How To with John Wilson',
                description: 'Anxious New Yorker documents life\'s absurdities',
                link: 'https://www.imdb.com/title/tt10801534/',
                completed: true
            }
        ];

        // EAT items
        this.items.eat = [
            {
                id: Date.now() - 4000,
                text: 'Brat x Supper Club',
                description: 'Seasonal British cooking at Netil Market, Hackney',
                link: 'https://bratrestaurant.com',
                completed: false
            },
            {
                id: Date.now() - 3999,
                text: 'Mangal 2',
                description: 'Turkish charcoal grill institution in Dalston',
                link: 'https://www.mangal2.com',
                completed: true
            },
            {
                id: Date.now() - 3998,
                text: 'Lyle\'s',
                description: 'Michelin-starred British seasonal tasting menu in Shoreditch',
                link: 'https://www.lyleslondon.com',
                completed: false
            },
            {
                id: Date.now() - 3997,
                text: 'St. JOHN Bread and Wine',
                description: 'Nose-to-tail dining and legendary roasted bone marrow',
                link: 'https://www.stjohnrestaurant.com',
                completed: false
            },
            {
                id: Date.now() - 3996,
                text: 'Bright',
                description: 'Natural wine bar with creative small plates in Hackney',
                link: 'https://www.brightlondon.co.uk',
                completed: false
            },
            {
                id: Date.now() - 3995,
                text: 'E5 Bakehouse',
                description: 'Artisan sourdough and pastries by London Fields',
                link: 'https://www.e5bakehouse.com',
                completed: true
            },
            {
                id: Date.now() - 3994,
                text: 'Smoking Goat',
                description: 'Thai BBQ and drinking food in Shoreditch',
                link: 'https://smokinggoatbar.com',
                completed: false
            }
        ];

        // DO items
        this.items.do = [
            {
                id: Date.now() - 5000,
                text: 'Morning swim at London Fields Lido',
                description: 'Olympic-sized heated outdoor pool open year-round',
                link: 'https://www.better.org.uk/leisure-centre/london/hackney/london-fields-lido',
                completed: true
            },
            {
                id: Date.now() - 4999,
                text: 'Ise-ji: Walk With Me',
                description: 'Notes on a coastal pilgrimage in rural Tokyo, Japan',
                link: 'https://walkkumano.com',
                completed: false
            },
            {
                id: Date.now() - 4998,
                text: 'Sunday roast at The Marksman',
                description: 'Legendary East End gastropub with seasonal British cooking',
                link: 'https://www.marksmanpublichouse.com',
                completed: false
            },
            {
                id: Date.now() - 4997,
                text: 'Open studio weekend in Hackney Wick',
                description: 'Explore artist studios and creative spaces in London\'s art district',
                link: 'https://www.hackneywick.org',
                completed: false
            },
            {
                id: Date.now() - 4996,
                text: 'Night ride to Epping Forest',
                description: 'Moonlit cycling through ancient woodland on the edge of London',
                link: 'https://www.cityoflondon.gov.uk/things-to-do/epping-forest',
                completed: false
            },
            {
                id: Date.now() - 4995,
                text: 'Sauna session at Ironmonger Row',
                description: 'Historic Edwardian baths with sauna and Turkish baths',
                link: 'https://www.better.org.uk/leisure-centre/london/islington/ironmonger-row-baths',
                completed: true
            }
        ];

        // Collections (simplified - keeping main structure)
        this.collections.read = [
            {
                id: Date.now() - 6000,
                name: 'Anygood Digest',
                digest: true,
                expanded: true,
                lastUpdated: Date.now() - 3600000, // 1 hour ago
                sourceUrl: 'https://www.lrb.co.uk/feed',
                items: [
                    {
                        id: Date.now() - 6001,
                        text: 'The Uses of Disenchantment',
                        description: 'A review of recent works on the history of magic and the supernatural in early modern Europe',
                        link: 'https://www.lrb.co.uk/the-paper/v46/n01',
                        source: 'London Review of Books',
                        sourceUrl: 'https://www.lrb.co.uk/feed',
                        importedAt: Date.now() - 3600000,
                        pubDate: new Date(Date.now() - 3600000).toISOString(),
                        completed: false
                    },
                    {
                        id: Date.now() - 6002,
                        text: 'On Not Being Able to Read',
                        description: 'An essay on the changing nature of reading in the digital age and what we lose when we skim',
                        link: 'https://www.lrb.co.uk/the-paper/v46/n02',
                        source: 'London Review of Books',
                        sourceUrl: 'https://www.lrb.co.uk/feed',
                        importedAt: Date.now() - 7200000,
                        pubDate: new Date(Date.now() - 7200000).toISOString(),
                        completed: false
                    },
                    {
                        id: Date.now() - 6003,
                        text: 'The Quietus Book Review: The New Nature Writing',
                        description: 'Exploring how contemporary writers are reimagining our relationship with the natural world',
                        link: 'https://thequietus.com/articles/book-review-nature-writing',
                        source: 'The Quietus - Books',
                        sourceUrl: 'https://thequietus.com/feed',
                        importedAt: Date.now() - 10800000,
                        pubDate: new Date(Date.now() - 10800000).toISOString(),
                        completed: false
                    },
                    {
                        id: Date.now() - 6004,
                        text: 'London Review of Books: The Art of Translation',
                        description: 'A deep dive into the challenges and rewards of literary translation, featuring interviews with leading translators',
                        link: 'https://www.lrb.co.uk/the-paper/v46/n03',
                        source: 'London Review of Books',
                        sourceUrl: 'https://www.lrb.co.uk/feed',
                        importedAt: Date.now() - 14400000,
                        pubDate: new Date(Date.now() - 14400000).toISOString(),
                        completed: false
                    },
                    {
                        id: Date.now() - 6005,
                        text: 'The Quietus: Independent Bookshops in London',
                        description: 'A guide to the best independent bookshops across London, from Hackney to Hampstead',
                        link: 'https://thequietus.com/articles/london-bookshops-guide',
                        source: 'The Quietus - Books',
                        sourceUrl: 'https://thequietus.com/feed',
                        importedAt: Date.now() - 18000000,
                        pubDate: new Date(Date.now() - 18000000).toISOString(),
                        completed: false
                    },
                    {
                        id: Date.now() - 6006,
                        text: 'LRB: The Future of the Novel',
                        description: 'Leading authors discuss how the novel is evolving in response to new technologies and changing reader habits',
                        link: 'https://www.lrb.co.uk/the-paper/v46/n04',
                        source: 'London Review of Books',
                        sourceUrl: 'https://www.lrb.co.uk/feed',
                        importedAt: Date.now() - 21600000,
                        pubDate: new Date(Date.now() - 21600000).toISOString(),
                        completed: false
                    }
                ]
            },
            {
                id: Date.now() - 6007,
                name: 'London Literature',
                curated: true,
                items: [
                    {
                        id: Date.now() - 6008,
                        text: 'White Teeth',
                        description: 'Zadie Smith - Multi-generational saga of three London families',
                        link: 'https://www.goodreads.com/book/show/3711.White_Teeth',
                        completed: false
                    },
                    {
                        id: Date.now() - 6009,
                        text: 'NW',
                        description: 'Zadie Smith - Four Londoners reconnect in northwest London',
                        link: 'https://www.goodreads.com/book/show/13486385-nw',
                        completed: false
                    }
                ]
            }
        ];

        this.collections.listen = [
            {
                id: Date.now() - 7000,
                name: 'Anygood Digest',
                digest: true,
                expanded: true,
                lastUpdated: Date.now() - 1800000, // 30 minutes ago
                sourceUrl: 'https://pitchfork.com/rss/reviews/albums/',
                items: [
                    {
                        id: Date.now() - 7001,
                        text: 'Pitchfork: Overmono - Good Lies (9.0)',
                        description: 'The UK electronic duo deliver a masterful debut album that blends garage, breaks, and ambient textures into something entirely new',
                        link: 'https://pitchfork.com/reviews/albums/overmono-good-lies/',
                        source: 'Pitchfork Reviews',
                        sourceUrl: 'https://pitchfork.com/rss/reviews/albums/',
                        importedAt: Date.now() - 1800000,
                        pubDate: new Date(Date.now() - 1800000).toISOString(),
                        completed: false
                    },
                    {
                        id: Date.now() - 7002,
                        text: 'The Quietus: Floating Points Live at Printworks',
                        description: 'A review of the electronic producer\'s stunning live performance, blending jazz, classical, and club music',
                        link: 'https://thequietus.com/articles/floating-points-printworks-review',
                        source: 'The Quietus Music',
                        sourceUrl: 'https://thequietus.com/feed',
                        importedAt: Date.now() - 5400000,
                        pubDate: new Date(Date.now() - 5400000).toISOString(),
                        completed: false
                    },
                    {
                        id: Date.now() - 7003,
                        text: 'Pitchfork: Black Country, New Road - Ants From Up There (9.2)',
                        description: 'The London septet\'s sophomore album is a sprawling, emotionally devastating masterpiece that defies categorization',
                        link: 'https://pitchfork.com/reviews/albums/black-country-new-road-ants-from-up-there/',
                        source: 'Pitchfork Reviews',
                        sourceUrl: 'https://pitchfork.com/rss/reviews/albums/',
                        importedAt: Date.now() - 9000000,
                        pubDate: new Date(Date.now() - 9000000).toISOString(),
                        completed: false
                    },
                    {
                        id: Date.now() - 7004,
                        text: 'The Quietus: NTS Radio\'s Best Shows of the Month',
                        description: 'A curated selection of the finest radio shows from NTS, featuring everything from ambient to techno',
                        link: 'https://thequietus.com/articles/nts-radio-best-shows-month',
                        source: 'The Quietus Music',
                        sourceUrl: 'https://thequietus.com/feed',
                        importedAt: Date.now() - 12600000,
                        pubDate: new Date(Date.now() - 12600000).toISOString(),
                        completed: false
                    },
                    {
                        id: Date.now() - 7005,
                        text: 'Pitchfork: Fred again.. - actual life 3 (8.5)',
                        description: 'The producer\'s third installment of his diary series continues to blur the lines between found sounds and club music',
                        link: 'https://pitchfork.com/reviews/albums/fred-again-actual-life-3/',
                        source: 'Pitchfork Reviews',
                        sourceUrl: 'https://pitchfork.com/rss/reviews/albums/',
                        importedAt: Date.now() - 16200000,
                        pubDate: new Date(Date.now() - 16200000).toISOString(),
                        completed: false
                    },
                    {
                        id: Date.now() - 7006,
                        text: 'The Quietus: The Lot Radio - 24/7 Independent Broadcasting',
                        description: 'A feature on the Brooklyn-based online radio station that has become a hub for underground electronic music',
                        link: 'https://thequietus.com/articles/lot-radio-feature',
                        source: 'The Quietus Music',
                        sourceUrl: 'https://thequietus.com/feed',
                        importedAt: Date.now() - 19800000,
                        pubDate: new Date(Date.now() - 19800000).toISOString(),
                        completed: false
                    },
                    {
                        id: Date.now() - 7007,
                        text: 'Pitchfork: Essential UK Garage Classics',
                        description: 'A guide to the foundational tracks of UK garage, from its origins in the 90s to its modern revival',
                        link: 'https://pitchfork.com/features/lists/uk-garage-classics/',
                        source: 'Pitchfork Reviews',
                        sourceUrl: 'https://pitchfork.com/rss/reviews/albums/',
                        importedAt: Date.now() - 23400000,
                        pubDate: new Date(Date.now() - 23400000).toISOString(),
                        completed: false
                    }
                ]
            },
            {
                id: Date.now() - 7008,
                name: 'Essential UK Dance',
                curated: true,
                items: [
                    { id: Date.now() - 7009, text: 'Overmono - Good Lies', completed: false },
                    { id: Date.now() - 7010, text: 'Fred again.. - actual life', completed: false }
                ]
            }
        ];

        // Add watch digest collection
        this.collections.watch = [
            {
                id: Date.now() - 8000,
                name: 'Anygood Digest',
                digest: true,
                expanded: true,
                lastUpdated: Date.now() - 2700000, // 45 minutes ago
                sourceUrl: 'https://lwlies.com/feed/',
                items: [
                    {
                        id: Date.now() - 8001,
                        text: 'Little White Lies: Past Lives Review',
                        description: 'Celine Song\'s quietly devastating debut about two childhood friends reconnecting after decades apart',
                        link: 'https://lwlies.com/films/past-lives-review/',
                        source: 'Little White Lies',
                        sourceUrl: 'https://lwlies.com/feed/',
                        importedAt: Date.now() - 2700000,
                        pubDate: new Date(Date.now() - 2700000).toISOString(),
                        completed: false
                    },
                    {
                        id: Date.now() - 8002,
                        text: 'Little White Lies: The Bear Season 3 - TV Review',
                        description: 'The Chicago restaurant drama continues its Michelin-star ambitions with another season of high-stakes kitchen drama',
                        link: 'https://lwlies.com/tv/the-bear-season-3-review/',
                        source: 'Little White Lies',
                        sourceUrl: 'https://lwlies.com/feed/',
                        importedAt: Date.now() - 6300000,
                        pubDate: new Date(Date.now() - 6300000).toISOString(),
                        completed: false
                    },
                    {
                        id: Date.now() - 8003,
                        text: 'Little White Lies: Aftersun - Film of the Year',
                        description: 'Charlotte Wells\' stunning debut about a daughter\'s fragmented memories of a Turkish holiday with her father',
                        link: 'https://lwlies.com/films/aftersun-review/',
                        source: 'Little White Lies',
                        sourceUrl: 'https://lwlies.com/feed/',
                        importedAt: Date.now() - 9900000,
                        pubDate: new Date(Date.now() - 9900000).toISOString(),
                        completed: false
                    },
                    {
                        id: Date.now() - 8004,
                        text: 'Little White Lies: Anatomy of a Fall - Palme d\'Or Winner',
                        description: 'Justine Triet\'s courtroom drama dissects a marriage through the lens of a murder investigation',
                        link: 'https://lwlies.com/films/anatomy-of-a-fall-review/',
                        source: 'Little White Lies',
                        sourceUrl: 'https://lwlies.com/feed/',
                        importedAt: Date.now() - 13500000,
                        pubDate: new Date(Date.now() - 13500000).toISOString(),
                        completed: false
                    },
                    {
                        id: Date.now() - 8005,
                        text: 'Little White Lies: How To with John Wilson - Documentary Series',
                        description: 'An anxious New Yorker documents life\'s absurdities in this hilarious and poignant HBO series',
                        link: 'https://lwlies.com/tv/how-to-with-john-wilson-review/',
                        source: 'Little White Lies',
                        sourceUrl: 'https://lwlies.com/feed/',
                        importedAt: Date.now() - 17100000,
                        pubDate: new Date(Date.now() - 17100000).toISOString(),
                        completed: false
                    },
                    {
                        id: Date.now() - 8006,
                        text: 'Little White Lies: Best Films of 2024 So Far',
                        description: 'A mid-year roundup of the finest cinema releases, from festival favorites to mainstream hits',
                        link: 'https://lwlies.com/features/best-films-2024/',
                        source: 'Little White Lies',
                        sourceUrl: 'https://lwlies.com/feed/',
                        importedAt: Date.now() - 20700000,
                        pubDate: new Date(Date.now() - 20700000).toISOString(),
                        completed: false
                    }
                ]
            }
        ];

        this.storage.save('items', this.items);
        this.storage.save('collections', this.collections);
    }

    init() {
        this.setupModalClose();
        this.setupKeyboardShortcuts();
        this.setupDarkMode();
        this.setupSearch();
        this.setupQuickAdd();
        this.setupClipboardMonitoring();
        this.setupElectronIPC();
        this.setupCategoryClicks();
        this.setupActiveItemClickOff();
        this.renderOverview();
        this.renderKeyboardShortcuts('overview');
        this.checkForSharedData();
        this.updateCategoryCounts();
    }

    setupCategoryClicks() {
        // Use event delegation to handle category card clicks
        // Only set up once to avoid duplicate listeners
        if (this.categoryClicksSetup) return;
        
        const grid = document.getElementById('category-grid');
        if (grid) {
            // Store handler references so we can remove them if needed
            this.categoryClickHandler = (e) => {
                const card = e.target.closest('.category-card');
                if (card && !e.target.closest('.category-delete-btn')) {
                    const category = card.getAttribute('data-category');
                    if (category) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.openCategory(category);
                    }
                }
            };

            this.categoryKeydownHandler = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    const card = e.target.closest('.category-card');
                    if (card && !e.target.closest('.category-delete-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        const category = card.getAttribute('data-category');
                        if (category) {
                            this.openCategory(category);
                        }
                    }
                }
            };

            grid.addEventListener('click', this.categoryClickHandler);
            grid.addEventListener('keydown', this.categoryKeydownHandler);
            
            this.categoryClicksSetup = true;
        }
    }

    setupActiveItemClickOff() {
        // Click outside active item to deactivate it
        document.addEventListener('click', (e) => {
            // Only handle if there's an active item
            if (!this.activeItemId) return;

            // Don't deactivate if clicking on ANY item (not just active one)
            // This prevents the same click that activates an item from deactivating it
            const anyItem = e.target.closest('.item');
            if (anyItem) return;

            // Don't deactivate if clicking on modal
            const modal = e.target.closest('.modal');
            if (modal && modal.classList.contains('show')) return;

            // Don't deactivate if clicking on any item checkbox or other interactive elements
            if (e.target.closest('.item-checkbox') ||
                e.target.closest('.item-link') ||
                e.target.closest('a') ||
                e.target.closest('button') ||
                e.target.closest('.item-checkbox-bulk')) {
                return;
            }

            // Deactivate the active item
            this.setActiveItem(null);
        });
    }

    setupElectronIPC() {
        // Listen for focus events from Electron
        if (window.electronAPI) {
            window.electronAPI.onFocusQuickAdd(() => {
                // Use a longer timeout to ensure DOM is ready
                setTimeout(() => this.focusQuickAddInput(), 200);
            });
        }
        
        // Also focus when window becomes visible (for browser compatibility)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && !this.currentCategory) {
                setTimeout(() => this.focusQuickAddInput(), 200);
            }
        });
        
        // Focus on initial load if on main view
        setTimeout(() => {
            if (!this.currentCategory) {
                this.focusQuickAddInput();
            }
        }, 300);
    }

    focusQuickAddInput() {
        // Only focus if we're on the main view
        if (!this.currentCategory) {
            // Try multiple times with increasing delays to ensure DOM is ready
            const tryFocus = (attempt = 0) => {
                const input = document.getElementById('quick-add-input');
                if (input) {
                    try {
                        input.focus();
                        input.select();
                    } catch (e) {
                        // Retry if focus failed and we haven't tried too many times
                        if (attempt < 3) {
                            setTimeout(() => tryFocus(attempt + 1), 100 * (attempt + 1));
                        }
                    }
                } else if (attempt < 5) {
                    // Retry if element not found yet
                    setTimeout(() => tryFocus(attempt + 1), 100 * (attempt + 1));
                }
            };
            tryFocus();
        }
    }

    setupQuickAdd() {
        const input = document.getElementById('quick-add-input');
        if (input) {
            let debounceTimer;
            
            // Handle paste events for immediate metadata extraction
            input.addEventListener('paste', async (e) => {
                const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                
                if (!pastedText) return;
                
                // Check if pasted text is a URL
                const detectedURL = this.urlParser.detectURL(pastedText);
                const isURLResult = this.urlParser.isURL(pastedText.trim());
                
                if (detectedURL && isURLResult) {
                    e.preventDefault(); // Prevent default paste
                    
                    // Set the URL in the input
                    input.value = detectedURL;
                    
                    // Immediately fetch metadata and update preview
                    try {
                        const metadata = await this.fetchURLMetadata(detectedURL);
                        
                        if (metadata && !metadata.error) {
                            // Update preview immediately with metadata
                            const parsed = {
                                title: metadata.title || detectedURL,
                                description: metadata.description || null,
                                link: detectedURL,
                                author: null
                            };
                            
                            // Auto-categorize based on URL and title
                            const category = await this.aiFeatures.autoCategorize({ text: parsed.title });
                            this.showPreview(parsed, category);
                        } else {
                            // If metadata fetch fails, still show preview with URL
                            await this.updatePreview(detectedURL);
                        }
                    } catch (error) {
                        console.error('URL metadata fetch error on paste:', error);
                        // Fallback to normal preview update
                        await this.updatePreview(detectedURL);
                    }
                }
            });
            
            // Handle input changes with debounce
            input.addEventListener('input', async (e) => {
                const text = input.value.trim();
                
                // Clear existing timer
                clearTimeout(debounceTimer);
                
                // Hide preview if input is empty
                if (!text) {
                    this.hidePreview();
                    return;
                }
                
                // Debounce parsing (500ms for URLs to avoid unnecessary fetches)
                debounceTimer = setTimeout(async () => {
                    await this.updatePreview(text);
                }, 500);
            });
            
            // Handle Enter key - add from preview if visible, otherwise show preview
            input.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const preview = document.getElementById('input-preview');
                    if (preview && preview.style.display !== 'none') {
                        this.addFromPreview();
                    } else {
                        const text = input.value.trim();
                        if (text) {
                            await this.updatePreview(text);
                        }
                    }
                }
            });
            
            // Hide preview when input loses focus (with delay to allow button clicks)
            input.addEventListener('blur', (e) => {
                setTimeout(() => {
                    const preview = document.getElementById('input-preview');
                    if (!preview) return;
                    
                    // Check if focus moved to preview or its children
                    const activeElement = document.activeElement;
                    const isFocusInPreview = preview.contains(activeElement);
                    const isHoveringPreview = preview.matches(':hover');
                    
                    if (!isFocusInPreview && !isHoveringPreview) {
                        this.hidePreview();
                    }
                }, 200);
            });
        }
    }
    
    async updatePreview(text) {
        if (!text || text.trim().length === 0) {
            this.hidePreview();
            return;
        }
        
        try {
            // Check if text is a URL
            const detectedURL = this.urlParser.detectURL(text);
            
            // Only try URL parsing if the ENTIRE text is a URL (not just contains a URL)
            if (detectedURL && this.urlParser.isURL(text)) {
                try {
                    // Text is a URL - fetch metadata
                    const metadata = await this.fetchURLMetadata(detectedURL);
                    
                    // Only use URL metadata if we got a valid title without errors
                    if (metadata && metadata.title && !metadata.error) {
                        // Successfully fetched metadata
                        const parsed = {
                            title: metadata.title,
                            description: metadata.description || null,
                            link: detectedURL,
                            author: null
                        };
                        
                        // Auto-categorize based on URL and title
                        let category = await this.aiFeatures.autoCategorize({ text: metadata.title });
                        
                        // Show preview with metadata
                        this.showPreview(parsed, category);
                        return;
                    }
                    // If URL fetch failed, fall through to natural language parsing
                    console.log('URL metadata fetch failed, falling back to natural language parsing');
                } catch (urlError) {
                    console.log('URL parsing error, falling back:', urlError);
                    // Fall through to natural language parsing
                }
            }
            
            // Not a URL or metadata fetch failed - use natural language parsing
            const parsed = await this.aiFeatures.parseNaturalLanguage(text);
            
            if (!parsed.title) {
                this.hidePreview();
                return;
            }
            
            // Determine category
            let category = parsed.category;
            if (!category) {
                category = await this.aiFeatures.autoCategorize({ text: parsed.title || text });
            }
            
            // Show preview
            this.showPreview(parsed, category);
        } catch (error) {
            console.error('Preview update error:', error);
            this.hidePreview();
        }
    }
    
    showPreview(parsed, detectedCategory) {
        const preview = document.getElementById('input-preview');
        const previewTitle = document.getElementById('preview-title');
        const categorySelector = document.getElementById('preview-category-selector');
        
        if (!preview || !previewTitle || !categorySelector) return;
        
        // Update title
        previewTitle.textContent = parsed.title;
        
        // Populate category selector
        categorySelector.innerHTML = '';
        this.categories.forEach(cat => {
            const metadata = this.categoryMetadata[cat] || { name: cat };
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = metadata.name;
            option.selected = cat === detectedCategory;
            categorySelector.appendChild(option);
        });
        
        // Show preview with animation
        preview.style.display = 'block';
        requestAnimationFrame(() => {
            preview.classList.add('preview-visible');
        });
    }
    
    hidePreview() {
        const preview = document.getElementById('input-preview');
        if (preview) {
            preview.classList.remove('preview-visible');
            setTimeout(() => {
                preview.style.display = 'none';
            }, 200);
        }
    }
    
    async addFromPreview() {
        const input = document.getElementById('quick-add-input');
        const previewTitle = document.getElementById('preview-title');
        const categorySelector = document.getElementById('preview-category-selector');
        
        if (!input || !previewTitle || !categorySelector) return;
        
        const text = input.value.trim();
        if (!text) return;
        
        try {
            this.showLoading('Processing...');
            
            // Parse natural language
            const parsed = await this.aiFeatures.parseNaturalLanguage(text);
            
            // Get selected category
            const category = categorySelector.value || parsed.category;
            
            // Ensure category exists
            if (!this.categories.includes(category)) {
                this.addCategorySilently(category, parsed.title || text);
            }
            
            // Create item
            const newItem = {
                id: Date.now(),
                text: parsed.title || text,
                completed: false
            };
            
            if (parsed.description) newItem.description = parsed.description;
            if (parsed.link) {
                newItem.link = parsed.link;
                setTimeout(() => this.extractMetadataForItem(newItem), 100);
            }
            if (parsed.author) newItem.author = parsed.author;
            
            // Generate tags
            const tags = this.aiFeatures.generateTags(newItem);
            if (tags.length > 0) newItem.tags = tags;
            
            // Add to category
            if (!this.items[category]) this.items[category] = [];
            this.items[category].push(newItem);
            
            this.saveState();
            this.storage.save('items', this.items);
            this.updateCategoryCounts();
            
            // Clear input and hide preview
            input.value = '';
            this.hidePreview();
            input.focus();
            
            this.hideLoading();
            
        } catch (error) {
            this.hideLoading();
            this.showNotification(`Error: ${error.message}`, 'error');
            console.error('Add from preview error:', error);
        }
    }

    setupClipboardMonitoring() {
        this.lastClipboardContent = '';
        this.clipboardCheckInterval = null;

        // Check clipboard when app becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkClipboard();
            }
        });

        // Check clipboard periodically (every 2 seconds)
        this.clipboardCheckInterval = setInterval(() => {
            this.checkClipboard();
        }, 2000);

        // Initial check
        setTimeout(() => this.checkClipboard(), 1000);
    }

    async checkClipboard() {
        try {
            let clipboardText = '';
            
            // Try modern clipboard API first
            if (navigator.clipboard && navigator.clipboard.readText) {
                try {
                    clipboardText = await navigator.clipboard.readText();
                } catch (e) {
                    // Fallback to document.execCommand for older browsers/Electron
                    const textArea = document.createElement('textarea');
                    textArea.style.position = 'fixed';
                    textArea.style.opacity = '0';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    document.execCommand('paste');
                    clipboardText = textArea.value;
                    document.body.removeChild(textArea);
                }
            } else {
                // Fallback for environments without clipboard API
                return;
            }
            
            // Skip if same content or empty
            if (!clipboardText || clipboardText === this.lastClipboardContent) {
                return;
            }

            // Skip if it's too short or looks like random text
            if (clipboardText.trim().length < 3) {
                return;
            }

            // Skip if it looks like code or system text
            if (this.looksLikeCode(clipboardText)) {
                return;
            }

            // Parse clipboard content to see if it's addable
            const parsed = await this.aiFeatures.parseNaturalLanguage(clipboardText);
            
            // Check if it looks like something we can add
            if (this.isAddableContent(clipboardText, parsed)) {
                this.lastClipboardContent = clipboardText;
                this.showClipboardSuggestion(clipboardText, parsed);
            }
        } catch (error) {
            // Clipboard access might be denied or not available
            // Silently fail - this is expected in some contexts
        }
    }

    looksLikeCode(text) {
        // Skip if it looks like code (has lots of special characters, brackets, etc.)
        const trimmed = text.trim();
        const codePatterns = [
            /^[a-zA-Z0-9_$]+\s*[=:]\s*/,  // Variable assignments
            /^[{}[\]]+/,  // Brackets
            /^(\/\/|\/\*|#|<!--|```|~~)/,  // Comments and code blocks
            /^function\s*\(|^const\s+\w+\s*=|^let\s+\w+\s*=|^var\s+\w+\s*=|^class\s+\w+|^import\s+|^export\s+/,  // Code patterns
            /\n.*\{.*\}/,  // Code blocks with braces
            /<[a-z]+[^>]*>.*<\/[a-z]+>/i,  // HTML tags
            /^\s*(if|for|while|switch|case|def|import|from|require)\s*\(?/,  // Code keywords
            /\/\/.*|\/\*[\s\S]*?\*\//,  // Comments
            /```[\s\S]*?```/,  // Code fences
        ];
        
        // Check for method calls (but exclude URLs)
        const urlPattern = /^https?:\/\//i;
        if (!urlPattern.test(trimmed) && /^\w+\.\w+\(/.test(trimmed)) {
            return true;
        }
        
        // Check if it has too many code-like characters
        const codeCharCount = (trimmed.match(/[{}[\]();=<>]/g) || []).length;
        const totalChars = trimmed.length;
        const codeCharRatio = totalChars > 0 ? codeCharCount / totalChars : 0;
        
        // If more than 10% are code characters and no URLs, likely code
        if (codeCharRatio > 0.1 && !/https?:\/\//.test(trimmed)) {
            return true;
        }
        
        return codePatterns.some(pattern => pattern.test(trimmed));
    }

    isAddableContent(text, parsed) {
        const trimmed = text.trim();
        
        // Skip if too short or too long
        if (trimmed.length < 5 || trimmed.length > 300) {
            return false;
        }

        // Enhanced URL detection - support various URL patterns
        const urlPatterns = [
            /https?:\/\/[^\s]+/i,  // HTTP/HTTPS URLs
            /www\.\w+\.\w+[^\s]*/i,  // www URLs
            /[\w\-]+\.(com|org|net|io|co|uk|edu|gov|me|app|dev)[^\s]*/i,  // Domain patterns
        ];
        const hasUrl = urlPatterns.some(pattern => pattern.test(trimmed));

        // Enhanced title detection patterns
        const titlePatterns = [
            // Book titles with "by" author
            /^["'"]?[^"'"\n]{10,}["'"]?\s+by\s+[A-Z][a-zA-Z\s]+$/i,
            // Movie/show titles with year
            /^[A-Z][^0-9]{10,}\s*\(\d{4}\)/i,
            // Titles in quotes
            /^["'"]([^"'"\n]{10,})["'"]$/,
            // ISBN patterns
            /\b(ISBN[- ]*(13|10)?[: ]*)?([0-9]{9,13}[0-9X])\b/i,
            // IMDB IDs
            /tt\d{7,8}/i,
            // Spotify URIs
            /spotify:(track|album|artist|playlist):[a-zA-Z0-9]+/i,
            // Article/blog titles (sentence case, reasonable length)
            /^[A-Z][^.!?]{20,}[a-z]$/,
        ];
        const looksLikeTitle = titlePatterns.some(pattern => pattern.test(trimmed)) ||
                              (parsed.title && parsed.title.length > 3 && parsed.title !== trimmed);

        // Media identifiers
        const mediaIndicators = [
            /\b(ISBN|IMDB|Spotify|Apple Music|YouTube|Netflix|Hulu|Disney\+)\b/i,
            /^watch\s+/i,
            /^read\s+/i,
            /^listen\s+to\s+/i,
            /\b(movie|film|book|album|song|podcast|series|show|episode)\b/i,
        ];
        const hasMediaIndicator = mediaIndicators.some(pattern => pattern.test(trimmed));

        // Restaurant/place indicators
        const placeIndicators = [
            /\b(restaurant|cafe|bar|bistro|diner|eatery|food|cuisine|menu)\b/i,
            /\d+\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Boulevard|Blvd)/i,
        ];
        const looksLikePlace = placeIndicators.some(pattern => pattern.test(trimmed));

        // Check parsed results
        const hasParsedTitle = parsed.title && parsed.title.length > 5 && parsed.title !== trimmed;
        const hasCategory = parsed.category !== null;
        const hasParsedLink = parsed.link && parsed.link.length > 0;

        // Exclude common non-consumable patterns
        const excludePatterns = [
            /^(error|warning|debug|log|console|exception)/i,
            /^\d{1,2}:\d{2}(\s*(AM|PM))?$/i,  // Time only
            /^\d{4}-\d{2}-\d{2}$/,  // Date only
            /^[\d\s\+\-\(\)]+$/,  // Phone numbers or numbers only
            /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i,  // Email only (without context)
        ];
        const shouldExclude = excludePatterns.some(pattern => pattern.test(trimmed));

        if (shouldExclude) {
            return false;
        }

        // Must have at least one indicator of consumable content
        return (hasUrl || hasParsedLink || looksLikeTitle || hasParsedTitle || hasMediaIndicator || looksLikePlace || hasCategory) &&
               !this.looksLikeCode(trimmed);
    }

    showClipboardSuggestion(clipboardText, parsed) {
        // Don't show if modal is already open
        if (document.getElementById('modal').style.display === 'block') {
            return;
        }

        // Don't show if user is typing
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            return;
        }

        const category = parsed.category || 'do';
        const categoryName = this.categoryMetadata[category]?.name || category;
        const title = parsed.title || clipboardText.substring(0, 50) + (clipboardText.length > 50 ? '...' : '');
        
        // Get link and favicon if available
        let linkHtml = '';
        if (parsed.link) {
            try {
                const domain = new URL(parsed.link).hostname;
                const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                linkHtml = `
                    <a href="#" class="clipboard-suggestion-link" onclick="event.stopPropagation(); event.preventDefault(); app.openExternalLink('${this.escapeHtml(parsed.link)}');">
                        <img src="${faviconUrl}" alt="" class="site-favicon" onerror="this.style.display='none'">
                        <span>${this.escapeHtml(domain)}</span>
                    </a>
                `;
            } catch (e) {
                // Invalid URL, skip link
            }
        }

        // Create a non-intrusive suggestion banner
        const existingBanner = document.getElementById('clipboard-suggestion');
        if (existingBanner) {
            existingBanner.remove();
        }

        const banner = document.createElement('div');
        banner.id = 'clipboard-suggestion';
        banner.className = 'clipboard-suggestion';
        banner.innerHTML = `
            <div class="clipboard-suggestion-content">
                <div class="clipboard-suggestion-left">
                    <span class="clipboard-suggestion-text">
                        Add "${this.escapeHtml(title)}" to ${categoryName}?
                    </span>
                    ${linkHtml}
                </div>
                <div class="clipboard-suggestion-actions">
                    <button onclick="app.addFromClipboard('${this.escapeHtml(clipboardText)}')" class="clipboard-add-btn">Add</button>
                    <button onclick="app.dismissClipboardSuggestion()" class="clipboard-dismiss-btn">×</button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (banner.parentNode) {
                banner.classList.add('dismissing');
                setTimeout(() => banner.remove(), 300);
            }
        }, 10000);
    }

    async addFromClipboard(clipboardText) {
        this.dismissClipboardSuggestion();
        
        try {
            this.showLoading('Adding from clipboard...');
            
            const parsed = await this.aiFeatures.parseNaturalLanguage(clipboardText);
            let category = parsed.category;
            
            if (!category) {
                category = await this.aiFeatures.autoCategorize({ text: parsed.title || clipboardText });
            }

            if (!this.categories.includes(category)) {
                this.addCategorySilently(category, parsed.title || clipboardText);
            }

            const newItem = {
                id: Date.now(),
                text: parsed.title || clipboardText.trim(),
                completed: false
            };

            if (parsed.description) newItem.description = parsed.description;
            if (parsed.link) {
                newItem.link = parsed.link;
                setTimeout(() => this.extractMetadataForItem(newItem), 100);
            }
            if (parsed.author) newItem.author = parsed.author;

            const tags = this.aiFeatures.generateTags(newItem);
            if (tags.length > 0) newItem.tags = tags;

            if (!this.items[category]) this.items[category] = [];
            this.items[category].push(newItem);

            this.saveState();
            this.storage.save('items', this.items);
            this.updateCategoryCounts();

            this.hideLoading();

        } catch (error) {
            this.hideLoading();
            this.showNotification(`Error: ${error.message}`, 'error');
            console.error('Clipboard add error:', error);
        }
    }

    dismissClipboardSuggestion() {
        const banner = document.getElementById('clipboard-suggestion');
        if (banner) {
            banner.classList.add('dismissing');
            setTimeout(() => banner.remove(), 300);
        }
    }

    setupModalClose() {
        const modal = document.getElementById('modal');
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
        // ESC key to close modal or exit active item state
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('modal');
                if (modal.classList.contains('show') || modal.style.display === 'block') {
                    this.closeModal();
                } else if (this.activeItemId) {
                    this.setActiveItem(null);
                }
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

            // Don't handle shortcuts when typing in input fields (except ESC)
            const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
            if (isTyping && e.key !== 'Escape') {
                return;
            }

            // Cmd/Ctrl + 1-5: Toggle between categories (works from anywhere)
            if (cmdOrCtrl) {
                const categoryMap = {
                    '1': 'read',
                    '2': 'listen',
                    '3': 'watch',
                    '4': 'eat',
                    '5': 'do'
                };
                
                if (categoryMap[e.key]) {
                    e.preventDefault();
                    const targetCategory = categoryMap[e.key];
                    
                    // If already in this category, go back to overview
                    if (this.currentCategory === targetCategory) {
                        this.closeCategory();
                    } else {
                        // Switch to the target category
                        this.openCategory(targetCategory);
                    }
                }
            }

            // Cmd/Ctrl + N: Context-aware
            // - From main view: Create new category
            // - From list view: Add new item
            if (cmdOrCtrl && e.key === 'n') {
                e.preventDefault();
                if (this.currentCategory) {
                    // In list view - add new item
                    this.showAddItemModal();
                } else {
                    // In main view - create new category
                    this.showAddCategoryModal();
                }
            }

            // Cmd/Ctrl + Z: Undo
            if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }

            // Cmd/Ctrl + Shift + Z: Redo
            if (cmdOrCtrl && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                this.redo();
            }

            // Cmd/Ctrl + A: Select all (in bulk mode only)
            // Note: Global Cmd+A to open app is handled by Electron
            if (cmdOrCtrl && e.key === 'a' && this.bulkMode) {
                e.preventDefault();
                this.selectAllItems();
            }

            // Delete/Backspace: Delete selected items (in bulk mode)
            if ((e.key === 'Delete' || e.key === 'Backspace') && this.bulkMode && this.selectedItems.size > 0) {
                e.preventDefault();
                this.deleteSelectedItems();
            }

            // ESC: Go back to overview if in a category (and no modal is open)
            if (e.key === 'Escape' && this.currentCategory) {
                const modal = document.getElementById('modal');
                const modalOpen = modal && (modal.classList.contains('show') || modal.style.display === 'block');
                
                if (!modalOpen && !this.activeItemId) {
                    e.preventDefault();
                    this.closeCategory();
                }
            }
        });
    }

    setupDarkMode() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
        const updateDarkMode = (e) => {
            document.documentElement.classList.toggle('dark-mode', e.matches);
        };
        updateDarkMode(prefersDark);
        prefersDark.addEventListener('change', updateDarkMode);
    }

    setupSearch() {
        // Search functionality removed from detail view
    }

    // State management
    saveState() {
        const state = {
            items: JSON.parse(JSON.stringify(this.items)),
            collections: JSON.parse(JSON.stringify(this.collections))
        };
        this.undoRedo.saveState(state);
    }

    undo() {
        const state = this.undoRedo.undo();
        if (state) {
            this.items = state.items;
            this.collections = state.collections;
            this.storage.save('items', this.items);
            this.storage.save('collections', this.collections);
            this.renderDetail();
            this.renderOverview();
        }
    }

    redo() {
        const state = this.undoRedo.redo();
        if (state) {
            this.items = state.items;
            this.collections = state.collections;
            this.storage.save('items', this.items);
            this.storage.save('collections', this.collections);
            this.renderDetail();
            this.renderOverview();
        }
    }

    // Notifications
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    triggerHapticFeedback(intensity = 'light') {
        // Try native Electron haptic feedback if available
        if (window.electronAPI && window.electronAPI.triggerHaptic) {
            window.electronAPI.triggerHaptic(intensity);
        }
        
        // Fallback to web vibration API (works on mobile/touch devices)
        if ('vibrate' in navigator) {
            const patterns = {
                light: 10,
                medium: 20,
                heavy: 30
            };
            navigator.vibrate(patterns[intensity] || 10);
        }
        
        // Visual feedback - pulse the app container with CSS animation
        const app = document.querySelector('.app');
        if (app) {
            app.classList.add('haptic-feedback');
            setTimeout(() => {
                app.classList.remove('haptic-feedback');
            }, 160);
        }
        
        // Audio feedback - subtle click sound
        const audioContext = window.AudioContext || window.webkitAudioContext;
        if (audioContext && !this.audioMuted) {
            try {
                const ctx = new audioContext();
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);
                
                oscillator.frequency.value = 1000;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
                
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.03);
            } catch (e) {
                // Audio context not available or blocked
            }
        }
    }

    showLoading(message = 'Loading...') {
        this.isLoading = true;
        const loading = document.createElement('div');
        loading.id = 'loading-overlay';
        loading.innerHTML = `
            <div class="loading-spinner"></div>
            <p>${message}</p>
        `;
        document.body.appendChild(loading);
    }

    hideLoading() {
        this.isLoading = false;
        const loading = document.getElementById('loading-overlay');
        if (loading) loading.remove();
    }

    // Navigation
    openCategory(category) {
        this.currentCategory = category;
        this.selectedItems.clear();
        this.bulkMode = false;
        this.activeItemId = null; // Clear active state when switching categories
        document.getElementById('overview-screen').classList.remove('active');
        document.getElementById('detail-screen').classList.add('active');
        this.renderDetail();
        this.renderKeyboardShortcuts('detail');
    }

    closeCategory() {
        this.currentCategory = null;
        this.selectedItems.clear();
        this.bulkMode = false;
        this.activeItemId = null; // Clear active state when closing category
        this.closeCategoryMenu(); // Close kebab menu when closing category
        document.getElementById('detail-screen').classList.remove('active');
        document.getElementById('overview-screen').classList.add('active');
        this.renderOverview();
        this.renderKeyboardShortcuts('overview');
        // Focus input when returning to main view
        setTimeout(() => this.focusQuickAddInput(), 100);
    }

    // Kebab Menu Methods
    toggleCategoryMenu(event) {
        event.stopPropagation();
        const dropdown = document.getElementById('category-menu-dropdown');
        if (!dropdown) return;

        const isVisible = dropdown.style.display === 'block';
        
        if (isVisible) {
            this.closeCategoryMenu();
        } else {
            dropdown.style.display = 'block';
            // Add click-outside listener after a small delay to avoid immediate trigger
            setTimeout(() => {
                document.addEventListener('click', this.handleClickOutsideMenu);
            }, 0);
        }
    }

    closeCategoryMenu() {
        const dropdown = document.getElementById('category-menu-dropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
        document.removeEventListener('click', this.handleClickOutsideMenu);
    }

    handleClickOutsideMenu = (event) => {
        const dropdown = document.getElementById('category-menu-dropdown');
        const menuBtn = document.getElementById('category-menu-btn');
        
        if (dropdown && !dropdown.contains(event.target) && !menuBtn.contains(event.target)) {
            this.closeCategoryMenu();
        }
    }


    // Rendering
    renderOverview() {
        const grid = document.getElementById('category-grid');
        if (!grid) return;

        // Clear existing custom categories (keep default structure)
        const defaultCategories = ['read', 'listen', 'watch', 'eat', 'do'];
        const customCategories = this.categories.filter(cat => !defaultCategories.includes(cat));

        // Render default categories
        defaultCategories.forEach(category => {
            const count = (this.items[category] || []).filter(item => !item.completed).length;
            const countEl = document.getElementById(`${category}-count`);
            if (countEl) countEl.textContent = count;
        });

        // Render custom categories
        const existingCustom = grid.querySelectorAll('.category-card.custom');
        existingCustom.forEach(el => el.remove());

        customCategories.forEach(category => {
            const metadata = this.categoryMetadata[category] || { icon: '📋', name: category };
            const count = (this.items[category] || []).filter(item => !item.completed).length;
            
            const card = document.createElement('div');
            card.className = 'category-card custom';
            card.setAttribute('data-category', category);
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `${metadata.name} category`);
            // Note: Click handling is done via event delegation in setupCategoryClicks()
            
            card.innerHTML = `
                <div class="category-icon" aria-hidden="true">${metadata.icon}</div>
                <h2>${this.escapeHtml(metadata.name)}</h2>
                <div class="category-count" id="${category}-count" aria-label="${count} uncompleted items">${count}</div>
                <button class="category-delete-btn" onclick="event.stopPropagation(); app.deleteCategory('${category}')" 
                        title="Delete category" aria-label="Delete category">×</button>
            `;
            
            grid.appendChild(card);
        });
    }

    updateCategoryCounts() {
        this.renderOverview();
    }

    renderKeyboardShortcuts(context = 'overview') {
        const shortcutsBar = document.querySelector('.keyboard-shortcuts-bar');
        if (!shortcutsBar) return;

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modKey = isMac ? '⌘' : 'Ctrl';

        let shortcuts = [];

        if (context === 'overview') {
            shortcuts = [
                { keys: [`${modKey}`, 'N'], desc: 'New Category' },
                { keys: [`${modKey}`, 'Z'], desc: 'Undo' },
                { keys: [`${modKey}`, '⇧', 'Z'], desc: 'Redo' },
                { keys: ['Esc'], desc: 'Close' }
            ];
        } else if (context === 'detail') {
            shortcuts = [
                { keys: [`${modKey}`, 'N'], desc: 'New Item' },
                { keys: [`${modKey}`, 'Z'], desc: 'Undo' },
                { keys: [`${modKey}`, '⇧', 'Z'], desc: 'Redo' },
                { keys: ['←'], desc: 'Back' }
            ];
        }

        const shortcutsHTML = shortcuts.map(shortcut => {
            const keysHTML = shortcut.keys.map(key => `<kbd>${key}</kbd>`).join('');
            return `<div class="shortcut-hint">${keysHTML} <span class="shortcut-desc">${shortcut.desc}</span></div>`;
        }).join('');

        shortcutsBar.innerHTML = shortcutsHTML;
    }

    renderDetail() {
        if (!this.currentCategory) return;

        const metadata = this.categoryMetadata[this.currentCategory] || { name: this.currentCategory };
        const titleEl = document.getElementById('detail-title');
        if (titleEl) titleEl.textContent = metadata.name;

        // Show/hide kebab menu based on category type
        const menuBtn = document.getElementById('category-menu-btn');
        if (menuBtn) {
            // Only show kebab menu for custom categories (not core categories)
            if (this.isCoreCategory(this.currentCategory)) {
                menuBtn.style.display = 'none';
            } else {
                menuBtn.style.display = 'inline-flex';
            }
        }

        // Ensure menu is closed when rendering
        this.closeCategoryMenu();

        this.renderDetailItems();
        this.renderDetailCollections();
    }

    renderDetailItems() {
        const listElement = document.getElementById('detail-items-list');
        if (!listElement) return;

        const items = this.items[this.currentCategory] || [];

        if (items.length === 0) {
            listElement.innerHTML = `
                <div class="empty-state">
                    No items yet. Tap + to add one.
                </div>
            `;
            return;
        }

        // Separate active and completed
        const activeItems = items.filter(item => !item.completed);
        const completedItems = items.filter(item => item.completed);

        let html = '';

        // Active items
        if (activeItems.length > 0) {
            html += '<div class="items-container">';
            activeItems.forEach((item) => {
                const actualIndex = this.items[this.currentCategory].findIndex(i => i.id === item.id);
                const hasMetadata = item.description || item.link;
                const isSelected = this.selectedItems.has(item.id);
                const isActive = this.activeItemId === item.id;

                if (isActive) {
                    // Active state: editable fields, remove button, Move button
                    html += `
                        <div class="item active ${hasMetadata ? 'has-metadata' : ''}" 
                             data-item-id="${item.id}">
                            <div class="item-checkbox" onclick="app.toggleItem(${actualIndex})"></div>
                            <div class="item-content">
                                <input type="text" 
                                       class="item-text-input" 
                                       value="${this.escapeHtml(item.text)}"
                                       data-item-id="${item.id}"
                                       data-field="text"
                                       onblur="app.updateItemField('${item.id}', 'text', this.value)"
                                       onkeydown="if(event.key==='Enter') this.blur(); if(event.key==='Escape') app.setActiveItem(null);"
                                       placeholder="Title">
                                <textarea class="item-description-input" 
                                          data-item-id="${item.id}"
                                          data-field="description"
                                          onblur="app.updateItemField('${item.id}', 'description', this.value)"
                                          onkeydown="if(event.key==='Escape') app.setActiveItem(null);"
                                          placeholder="Description (optional)">${item.description ? this.escapeHtml(item.description) : ''}</textarea>
                                <input type="url" 
                                       class="item-link-input" 
                                       value="${item.link ? this.escapeHtml(item.link) : ''}"
                                       data-item-id="${item.id}"
                                       data-field="link"
                                       onblur="app.updateItemField('${item.id}', 'link', this.value)"
                                       onkeydown="if(event.key==='Enter') this.blur(); if(event.key==='Escape') app.setActiveItem(null);"
                                       placeholder="Link URL (optional)">
                            </div>
                            <div class="item-actions active-actions">
                                <button onclick="app.showMoveItemModal(${actualIndex})" 
                                        title="Move to category"
                                        aria-label="Move to category"
                                        class="move-btn">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                        <polyline points="7 10 12 15 17 10"/>
                                        <line x1="12" y1="15" x2="12" y2="3"/>
                                    </svg>
                                </button>
                                <button onclick="app.deleteItem(${actualIndex})" 
                                        title="Delete"
                                        aria-label="Delete item"
                                        class="delete-btn">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="3 6 5 6 21 6"/>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                        <line x1="10" y1="11" x2="10" y2="17"/>
                                        <line x1="14" y1="11" x2="14" y2="17"/>
                                    </svg>
                                </button>
                                <button onclick="app.setActiveItem(null)" 
                                        title="Cancel"
                                        aria-label="Cancel editing"
                                        class="cancel-btn">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"/>
                                        <line x1="6" y1="6" x2="18" y2="18"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `;
                } else {
                    // Default state: full title, truncated description, link, no buttons
                    html += `
                        <div class="item ${hasMetadata ? 'has-metadata' : ''} ${isSelected ? 'selected' : ''}" 
                             data-item-id="${item.id}"
                             draggable="true"
                             ondragstart="app.handleDragStart(event, ${actualIndex})"
                             ondragover="app.handleDragOver(event)"
                             ondrop="app.handleDrop(event, ${actualIndex})"
                             ondragend="app.handleDragEnd(event)"
                             onclick="app.handleItemClick(event, '${item.id}')">
                            ${this.bulkMode ? `
                                <div class="item-checkbox-bulk" onclick="app.toggleItemSelection(${item.id}); event.stopPropagation();">
                                    ${isSelected ? '✓' : ''}
                                </div>
                            ` : ''}
                            <div class="item-checkbox" onclick="app.toggleItem(${actualIndex}); event.stopPropagation();"></div>
                            <div class="item-content">
                                <div class="item-text">${this.escapeHtml(item.text)}</div>
                                ${item.description ? `<div class="item-description">${this.escapeHtml(item.description)}</div>` : ''}
                                ${item.tags ? `<div class="item-tags">${item.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}</div>` : ''}
                                ${item.link ? `<a href="#" class="item-link" onclick="event.stopPropagation(); event.preventDefault(); app.openExternalLink('${this.escapeHtml(item.link)}');">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                                    </svg>
                                    ${this.escapeHtml(new URL(item.link).hostname)}
                                </a>` : ''}
                            </div>
                        </div>
                    `;
                }
            });
            html += '</div>';
        }

        // Completed items (collapsed by default)
        if (completedItems.length > 0) {
            const isExpanded = this.completedItemsExpanded[this.currentCategory] || false;
            html += `
                <div class="completed-section ${isExpanded ? 'expanded' : ''}">
                    <h4 class="completed-header" onclick="app.toggleCompletedItems()" style="cursor: pointer;">
                        <span class="completed-toggle">${isExpanded ? '▼' : '▶'}</span>
                        Completed (${completedItems.length})
                    </h4>
                    <div class="items-container completed-items-container" ${isExpanded ? '' : 'style="display: none;"'}>
            `;
            completedItems.forEach((item) => {
                const actualIndex = this.items[this.currentCategory].findIndex(i => i.id === item.id);
                const hasMetadata = item.description || item.link;

                html += `
                    <div class="item completed ${hasMetadata ? 'has-metadata' : ''}" data-item-id="${item.id}">
                        <div class="item-checkbox" onclick="app.toggleItem(${actualIndex})"></div>
                        <div class="item-content">
                            <div class="item-text">${this.escapeHtml(item.text)}</div>
                            ${item.description ? `<div class="item-description">${this.escapeHtml(item.description)}</div>` : ''}
                            ${item.link ? `<a href="#" class="item-link" onclick="event.stopPropagation(); event.preventDefault(); app.openExternalLink('${this.escapeHtml(item.link)}');">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                                </svg>
                                ${this.escapeHtml(new URL(item.link).hostname)}
                            </a>` : ''}
                        </div>
                        <div class="item-actions">
                            <button onclick="app.deleteItem(${actualIndex})" title="Delete">🗑️</button>
                        </div>
                    </div>
                `;
            });
            html += '</div></div>';
        }

        listElement.innerHTML = html;
    }

    // Search functionality removed from detail view

    // Anygood Digest - Shuffle and merge recommendation collections
    shuffleDailyPicks(items, category) {
        // Check if today's shuffle exists for this category
        const today = new Date().toDateString();
        const shuffleKey = `dailyPicksShuffle_${category}`;
        const dateKey = `dailyPicksDate_${category}`;
        const lastShuffleDate = localStorage.getItem(dateKey);
        
        if (lastShuffleDate === today) {
            // Retrieve cached shuffle order
            const shuffledOrderJson = localStorage.getItem(shuffleKey);
            if (shuffledOrderJson) {
                try {
                    const shuffledOrder = JSON.parse(shuffledOrderJson);
                    // Reorder items by cached IDs
                    const itemsById = new Map(items.map(item => [item.id || item.text, item]));
                    const reordered = [];
                    for (const id of shuffledOrder) {
                        if (itemsById.has(id)) {
                            reordered.push(itemsById.get(id));
                            itemsById.delete(id);
                        }
                    }
                    // Add any new items not in cached order
                    reordered.push(...Array.from(itemsById.values()));
                    return reordered;
                } catch (e) {
                    console.error('Error parsing shuffle order:', e);
                }
            }
        }
        
        // Perform new shuffle (Fisher-Yates algorithm)
        const shuffled = [...items];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // Cache for today
        localStorage.setItem(dateKey, today);
        localStorage.setItem(shuffleKey, JSON.stringify(shuffled.map(item => item.id || item.text)));
        
        return shuffled;
    }

    createDailyPicks(category) {
        const collections = this.collections[category] || [];
        
        // Gather all items from digest and curated collections
        const allItems = [];
        const sourceMap = new Map(); // Track which collection each item came from
        
        collections.forEach(collection => {
            const isDailyPicksSource = collection.digest || collection.curated;
            if (isDailyPicksSource && collection.items && collection.items.length > 0) {
                collection.items.forEach(item => {
                    // Add source information to each item
                    const itemWithSource = {
                        ...item,
                        _sourceCollection: collection.name,
                        _sourceCurated: collection.curated || false,
                        _sourceDigest: collection.digest || false
                    };
                    allItems.push(itemWithSource);
                    sourceMap.set(item.id || item.text, collection);
                });
            }
        });
        
        if (allItems.length === 0) {
            return null;
        }
        
        // Shuffle items using daily shuffle
        const shuffledItems = this.shuffleDailyPicks(allItems, category);
        
        // Limit to 15 items to keep it manageable
        const limitedItems = shuffledItems.slice(0, 15);
        
        return {
            id: 'daily-picks',
            name: 'Anygood Digest 🎲',
            items: limitedItems,
            expanded: true,
            digest: true, // Use digest styling (horizontal scroll)
            isDailyPicks: true, // Special flag
            lastUpdated: Date.now()
        };
    }

    refreshDailyPicks() {
        // Clear cached shuffle for current category
        const shuffleKey = `dailyPicksShuffle_${this.currentCategory}`;
        const dateKey = `dailyPicksDate_${this.currentCategory}`;
        localStorage.removeItem(shuffleKey);
        localStorage.removeItem(dateKey);
        
        // Re-render to show new shuffle
        this.renderDetail();
        this.showNotification('Anygood Digest reshuffled!', 'success');
    }

    renderDetailCollections() {
        const collectionsElement = document.getElementById('detail-collections');
        if (!collectionsElement) return;

        const collections = this.collections[this.currentCategory] || [];
        const defaultCategories = ['read', 'listen', 'watch', 'eat', 'do'];
        const isDefaultCategory = defaultCategories.includes(this.currentCategory);

        // Hide collections section entirely for custom categories
        const collectionsSection = collectionsElement.closest('.section');
        if (!isDefaultCategory) {
            if (collectionsSection) {
                collectionsSection.style.display = 'none';
            }
            return;
        }

        // Show collections section for default categories
        if (collectionsSection) {
            collectionsSection.style.display = 'block';
        }

        // For default categories, create Anygood Digest instead of showing all collections
        let collectionsToRender = [];
        
        if (isDefaultCategory) {
            // Create unified Anygood Digest collection
            const dailyPicks = this.createDailyPicks(this.currentCategory);
            if (dailyPicks) {
                collectionsToRender = [dailyPicks];
            }
            
            // Add user-created (non-digest, non-curated) collections
            const userCollections = collections.filter(c => !c.digest && !c.curated);
            collectionsToRender.push(...userCollections);
        } else {
            // For custom categories, show all non-digest collections
            collectionsToRender = collections.filter(c => !c.digest);
        }

        if (collectionsToRender.length === 0) {
            collectionsElement.innerHTML = '<div class="empty-state">No recommendations yet</div>';
            return;
        }

        const sortedCollections = collectionsToRender;

        collectionsElement.innerHTML = sortedCollections.map((collection, collectionIndex) => {
            const isDailyPicks = collection.isDailyPicks;
            const isDigest = collection.digest;
            const lastUpdated = collection.lastUpdated ? this.rssParser.formatRelativeTime(new Date(collection.lastUpdated).toISOString()) : null;
            
            return `
            <div class="collection ${collection.expanded ? 'expanded' : ''} ${collection.curated ? 'curated' : 'imported'} ${isDigest ? 'digest' : ''} ${isDailyPicks ? 'daily-picks' : ''}" data-collection-id="${collection.id}">
                <div class="collection-header">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                        ${!isDigest ? `<button class="collection-toggle" onclick="app.toggleCollectionById('${collection.id}')" aria-label="Toggle collection">▸</button>` : ''}
                        <span class="collection-name">
                            ${!isDigest && collection.curated ? '<span class="badge-curated">★</span>' : ''}
                            ${this.escapeHtml(collection.name)}
                        </span>
                        ${!isDailyPicks && lastUpdated ? `<span class="collection-updated">Updated ${lastUpdated}</span>` : ''}
                    </div>
                    <div class="collection-actions">
                        ${!isDigest && !isDailyPicks ? `<span style="color: var(--text-secondary); font-size: 0.85em;">${collection.items.length}</span>` : ''}
                        ${!isDailyPicks && isDigest ? `<button class="refresh-btn" onclick="app.refreshDigest(${collectionIndex})" title="Refresh feed" aria-label="Refresh feed">↻</button>` : ''}
                        ${!isDigest && !isDailyPicks ? `<button onclick="app.deleteCollection(${collectionIndex})" title="Delete" aria-label="Delete collection">🗑️</button>` : ''}
                    </div>
                </div>
                <div class="collection-items ${isDigest ? 'digest-items-horizontal' : ''}">
                    ${collection.items.length === 0 ?
                        '<div class="empty-state" style="padding: 20px;">Empty collection</div>' :
                        collection.items.map((item, itemIndex) => {
                            const hasMetadata = item.description || item.link || (!isDigest && (item.pubDate || item.source));
                            // Summarize description for digest items
                            const displayDescription = isDigest && item.description 
                                ? this.aiFeatures.summarizeDescription(item.description, 80)
                                : item.description;
                            
                            // Get favicon URL for digest items
                            let faviconUrl = null;
                            if (isDigest && item.link) {
                                try {
                                    const domain = new URL(item.link).hostname;
                                    faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                                } catch (e) {
                                    // Invalid URL, skip favicon
                                }
                            }
                            
                            // For Anygood Digest, add source badge
                            let sourceBadge = '';
                            if (isDailyPicks) {
                                if (item._sourceCurated) {
                                    sourceBadge = '<span class="source-badge source-curated" title="From Anygood Picks">★</span>';
                                } else if (item._sourceDigest) {
                                    sourceBadge = '<span class="source-badge source-rss" title="From RSS feeds">📰</span>';
                                }
                            }
                            
                            // For non-digest items, show date and source as before
                            const itemDate = !isDigest && item.pubDate ? this.rssParser.formatRelativeTime(item.pubDate) : null;
                            
                            // For Anygood Digest, need to find the original collection index to add items
                            let addButtonCallback = '';
                            if (isDailyPicks) {
                                // We'll handle this specially in addCollectionItemToMain
                                addButtonCallback = `app.addDailyPickItemToMain('${this.escapeHtml(item.id || item.text)}')`;
                            } else {
                                addButtonCallback = `app.addCollectionItemToMain(${collectionIndex}, ${itemIndex})`;
                            }
                            
                            return `
                                <div class="collection-item ${isDigest ? 'digest-item-card' : ''} ${hasMetadata ? 'has-metadata' : ''}" 
                                     data-collection-item-id="${item.id || itemIndex}" 
                                     data-collection-index="${collectionIndex}" 
                                     data-item-index="${itemIndex}">
                                    <div class="collection-item-content">
                                        <div class="collection-item-header-row">
                                            <div class="collection-item-text">${this.escapeHtml(item.text)}</div>
                                            ${sourceBadge}
                                        </div>
                                        ${displayDescription ? `<div class="collection-item-description" title="${this.escapeHtml(item.description || '')}">${this.escapeHtml(displayDescription)}</div>` : ''}
                                        ${!isDigest ? `<div class="collection-item-meta">
                                            ${item.source ? `<span class="item-source">from ${this.escapeHtml(item.source)}</span>` : ''}
                                            ${itemDate ? `<span class="item-date">${itemDate}</span>` : ''}
                                            ${item.link ? `<a href="#" class="collection-item-link" onclick="event.stopPropagation(); event.preventDefault(); app.openExternalLink('${this.escapeHtml(item.link)}');">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                                                </svg>
                                                ${this.escapeHtml(new URL(item.link).hostname)}
                                            </a>` : ''}
                                        </div>` : ''}
                                        ${isDigest ? `<div class="digest-item-footer">
                                            ${item.link ? `<a href="#" class="collection-item-link" onclick="event.stopPropagation(); event.preventDefault(); app.openExternalLink('${this.escapeHtml(item.link)}');">
                                                ${faviconUrl ? `<img src="${faviconUrl}" alt="" class="site-favicon" onerror="this.style.display='none'">` : ''}
                                                ${this.escapeHtml(new URL(item.link).hostname)}
                                            </a>` : ''}
                                            <button class="add-to-main-btn" onclick="${addButtonCallback}">Add</button>
                                        </div>` : ''}
                                    </div>
                                    ${!isDigest ? `<div class="collection-item-actions">
                                        <button class="add-to-main-btn" onclick="${addButtonCallback}">Add</button>
                                        ${!isDailyPicks ? `<button onclick="app.deleteCollectionItem(${collectionIndex}, ${itemIndex})">×</button>` : ''}
                                    </div>` : ''}
                                </div>
                            `;
                        }).join('')
                    }
                </div>
            </div>
        `;
        }).join('');
    }

    // Items - Enhanced with AI and metadata
    showAddItemModal() {
        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');
        const modalBody = document.getElementById('modal-body');

        // Ensure modal-body has the class (in case it was missing)
        if (modalBody && !modalBody.classList.contains('modal-body')) {
            modalBody.classList.add('modal-body');
        }

        // Remove any existing header within this modal-content to ensure clean state
        const existingHeader = modalContent?.querySelector('.modal-header');
        if (existingHeader) {
            existingHeader.remove();
        }

        // Create fresh header
        let modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        if (modalContent && modalBody) {
            modalContent.insertBefore(modalHeader, modalBody);
        }

        // Set header content
        modalHeader.innerHTML = `
            <h2>New Item</h2>
            <button class="modal-close-btn" onclick="app.closeModal()" aria-label="Close">×</button>
        `;

        // Set body content (without the h2 title since it's in header now)
        modalBody.innerHTML = `
            <div style="padding: 16px 24px 20px;">
                <p style="color: var(--text-secondary); font-size: 0.85em; margin-bottom: 8px;">
                    Type a title, natural language (e.g., "Read 'The Creative Act' by Rick Rubin"), or paste a URL
                </p>
                <input type="text" id="item-input" placeholder="Enter title, natural language, or URL..." autofocus>
                <textarea id="item-description" placeholder="Description (optional)" rows="2"></textarea>
                <div class="modal-buttons">
                    <button onclick="app.addItem()">Add</button>
                </div>
            </div>
        `;

        modal.style.display = 'block';
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });

        const input = document.getElementById('item-input');
        const descriptionInput = document.getElementById('item-description');
        
        let urlParseTimer;
        let detectedLink = null; // Store detected URL/link separately
        
        // Handle paste events for immediate metadata extraction
        const handlePaste = async (e) => {
            // Get pasted text
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            
            if (!pastedText) return;
            
            // Check if pasted text is a URL
            const detectedURL = this.urlParser.detectURL(pastedText);
            const isURLResult = this.urlParser.isURL(pastedText.trim());
            
            if (detectedURL && isURLResult) {
                e.preventDefault(); // Prevent default paste
                
                // Store the detected URL
                detectedLink = detectedURL;
                modal.dataset.detectedLink = detectedLink;
                
                // Show visual feedback (optional - can add loading state)
                input.placeholder = "Fetching metadata...";
                
                // Immediately fetch metadata
                try {
                    const metadata = await this.fetchURLMetadata(detectedURL);
                    
                    if (metadata && !metadata.error) {
                        // Populate title if available
                        if (metadata.title) {
                            input.value = metadata.title;
                        } else {
                            // If no metadata title, just show the URL
                            input.value = detectedURL;
                        }
                        
                        // Populate description if available and field is empty
                        if (metadata.description && !descriptionInput.value) {
                            descriptionInput.value = metadata.description;
                        }
                    } else {
                        // If metadata fetch fails, show the URL
                        input.value = detectedURL;
                    }
                } catch (error) {
                    console.error('URL metadata fetch error:', error);
                    // If metadata fetch fails, show the URL
                    input.value = detectedURL;
                } finally {
                    // Restore placeholder
                    input.placeholder = "Enter title, natural language, or URL...";
                }
            }
        };
        
        // Add paste listener
        input.addEventListener('paste', handlePaste);
        
        // Handle input changes with debounce for URL detection (fallback for typing URLs)
        input.addEventListener('input', async (e) => {
            const text = input.value.trim();
            
            // Clear existing timer
            clearTimeout(urlParseTimer);
            
            // Update modal dataset immediately when input changes
            modal.dataset.detectedLink = detectedLink || '';
            
            // Skip if empty
            if (!text) {
                detectedLink = null;
                modal.dataset.detectedLink = '';
                return;
            }
            
            // Debounce URL parsing
            urlParseTimer = setTimeout(async () => {
                // Check if text is a URL (must be ONLY a URL)
                const detectedURL = this.urlParser.detectURL(text);
                
                if (detectedURL && this.urlParser.isURL(text)) {
                    // Text is a URL - store it and fetch metadata
                    detectedLink = detectedURL;
                    modal.dataset.detectedLink = detectedLink;
                    
                    try {
                        const metadata = await this.fetchURLMetadata(detectedURL);
                        
                        // Only proceed if we got valid metadata without errors
                        if (metadata && metadata.title && !metadata.error) {
                            // Replace URL with fetched title
                            input.value = metadata.title;
                            
                            // Populate description if available and field is empty
                            if (metadata.description && !descriptionInput.value) {
                                descriptionInput.value = metadata.description;
                            }
                        }
                    } catch (error) {
                        console.error('URL metadata fetch error:', error);
                        // Silently fail - user can continue typing
                    }
                } else {
                    // Not a URL - clear detected link
                    detectedLink = null;
                    modal.dataset.detectedLink = '';
                }
            }, 500);
        });
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.addItem();
            }
        });

        // Auto-detect if it's natural language
        input.addEventListener('blur', async () => {
            const text = input.value.trim();
            if (text && text.length > 10 && !detectedLink) {
                // Check if it's a URL first
                const detectedURL = this.urlParser.detectURL(text);
                if (detectedURL && this.urlParser.isURL(text)) {
                    // Already handled by input event, skip
                    return;
                }
                
                // Not a URL - try natural language parsing
                try {
                    const parsed = await this.aiFeatures.parseNaturalLanguage(text);
                    if (parsed.title && parsed.title !== text) {
                        input.value = parsed.title;
                        if (parsed.description && !descriptionInput.value) {
                            descriptionInput.value = parsed.description;
                        }
                        if (parsed.link) {
                            detectedLink = parsed.link;
                            modal.dataset.detectedLink = detectedLink;
                        }
                    }
                } catch (error) {
                    console.error('Natural language parsing error:', error);
                    // Silently fail - user input preserved
                }
            }
        });
        
        // Initialize modal dataset
        modal.dataset.detectedLink = '';
    }

    async addItem() {
        const modal = document.getElementById('modal');
        const input = document.getElementById('item-input');
        const descriptionInput = document.getElementById('item-description');

        const text = input.value.trim();
        let description = descriptionInput?.value.trim();
        let link = modal.dataset.detectedLink || ''; // Get detected link from modal dataset

        if (!text) return;

        // Try natural language parsing
        const parsed = await this.aiFeatures.parseNaturalLanguage(text);
        if (parsed.title) {
            const finalText = parsed.title;
            if (!description && parsed.description) description = parsed.description;
            if (!link && parsed.link) link = parsed.link;

            // Auto-categorize if in wrong category
            const suggestedCategory = await this.aiFeatures.autoCategorize({ text: finalText, description });
            if (suggestedCategory !== this.currentCategory) {
                // Could show a suggestion here
            }

            // Generate tags
            const tags = this.aiFeatures.generateTags({ text: finalText, description });

            const newItem = {
                id: Date.now(),
                text: finalText,
                completed: false
            };

            if (description) newItem.description = description;
            if (link) {
                newItem.link = link;
                // Extract metadata in background
                this.extractMetadataForItem(newItem);
            }
            if (tags.length > 0) newItem.tags = tags;
            if (parsed.author) newItem.author = parsed.author;

            this.items[this.currentCategory].push(newItem);
            this.saveState();
            this.storage.save('items', this.items);
            this.renderDetail();
            this.updateCategoryCounts();
            this.closeModal();

            // Check for duplicates
            setTimeout(() => this.checkDuplicates(), 500);
        } else {
            // Fallback to simple add
            const newItem = {
                id: Date.now(),
                text: text,
                completed: false
            };

            if (description) newItem.description = description;
            if (link) {
                newItem.link = link;
                this.extractMetadataForItem(newItem);
            }

            this.items[this.currentCategory].push(newItem);
            this.saveState();
            this.storage.save('items', this.items);
            this.renderDetail();
            this.updateCategoryCounts();
            this.closeModal();
        }
    }

    async fetchURLMetadata(url) {
        try {
            // Check if electronAPI is available
            if (typeof window.electronAPI === 'undefined' || !window.electronAPI.fetchURLMetadata) {
                console.warn('electronAPI.fetchURLMetadata not available');
                return { error: 'API not available' };
            }

            // Normalize URL
            const normalizedURL = this.urlParser.normalizeURL(url);
            
            // Fetch metadata via IPC
            const metadata = await window.electronAPI.fetchURLMetadata(normalizedURL);
            
            // Return metadata as-is (let caller handle errors)
            return metadata;
    } catch (error) {
        console.error('fetchURLMetadata error:', error);
        return { 
            error: error.message
        };
    }
    }

    async extractMetadataForItem(item) {
        if (!item.link) return;

        try {
            this.showLoading('Extracting metadata...');
            const metadata = await this.metadataExtractor.extractMetadata(item.link);
            
            if (metadata.title && !item.text.includes(metadata.title)) {
                // Could update title if it's better
            }
            if (metadata.description && !item.description) {
                item.description = metadata.description;
            }
            if (metadata.image && !item.image) {
                item.image = metadata.image;
            }
            if (metadata.author && !item.author) {
                item.author = metadata.author;
            }

            this.storage.save('items', this.items);
            this.renderDetail();
        } catch (error) {
            console.error('Metadata extraction failed:', error);
        } finally {
            this.hideLoading();
        }
    }

    toggleItem(index) {
        if (this.bulkMode) {
            const item = this.items[this.currentCategory][index];
            this.toggleItemSelection(item.id);
            return;
        }

        const item = this.items[this.currentCategory][index];
        if (this.pendingToggle) {
            clearTimeout(this.pendingToggle);
            this.pendingToggle = null;
        }

        item.completed = !item.completed;

        const itemElement = document.querySelector(`.item[data-item-id="${item.id}"]`);
        if (itemElement) {
            itemElement.classList.toggle('completed', item.completed);
        }

        this.saveState();
        this.storage.save('items', this.items);
        this.updateCategoryCounts();

        this.pendingToggle = setTimeout(() => {
            const currentIndex = this.items[this.currentCategory].findIndex(i => i.id === item.id);
            if (currentIndex !== -1) {
                const itemEl = document.querySelector(`.item[data-item-id="${item.id}"]`);
                if (itemEl) itemEl.classList.add('moving-out');

                setTimeout(() => {
                    const movedItem = this.items[this.currentCategory].splice(currentIndex, 1)[0];
                    this.items[this.currentCategory].push(movedItem);
                    this.saveState();
                    this.storage.save('items', this.items);
                    this.renderDetail();

                    setTimeout(() => {
                        const newItemElement = document.querySelector(`.item[data-item-id="${item.id}"]`);
                        if (newItemElement) newItemElement.classList.add('moving-in');
                    }, 50);
                }, 400);
            }
            this.pendingToggle = null;
        }, 2000);
    }

    toggleItemSelection(itemId) {
        if (this.selectedItems.has(itemId)) {
            this.selectedItems.delete(itemId);
        } else {
            this.selectedItems.add(itemId);
        }
        this.renderDetailItems();
    }

    toggleBulkMode() {
        this.bulkMode = !this.bulkMode;
        this.selectedItems.clear();
        this.renderDetailItems();
    }

    selectAllItems() {
        const items = this.items[this.currentCategory].filter(item => !item.completed);
        items.forEach(item => this.selectedItems.add(item.id));
        this.renderDetailItems();
    }

    deleteSelectedItems() {
        if (this.selectedItems.size === 0) return;
        if (confirm(`Delete ${this.selectedItems.size} selected item(s)?`)) {
            this.items[this.currentCategory] = this.items[this.currentCategory].filter(
                item => !this.selectedItems.has(item.id)
            );
            this.saveState();
            this.storage.save('items', this.items);
            this.selectedItems.clear();
            this.bulkMode = false;
            this.renderDetail();
            this.updateCategoryCounts();
        }
    }

    deleteItem(index) {
        if (confirm('Delete this item?')) {
            this.items[this.currentCategory].splice(index, 1);
            this.activeItemId = null; // Clear active state
            this.saveState();
            this.storage.save('items', this.items);
            // Only re-render items, not collections (which haven't changed)
            this.renderDetailItems();
            this.updateCategoryCounts();
        }
    }

    handleItemClick(event, itemId) {
        // Don't activate if clicking on interactive elements
        if (event.target.closest('.item-checkbox') || 
            event.target.closest('.item-link') || 
            event.target.closest('a') ||
            event.target.closest('.item-checkbox-bulk') ||
            event.target.closest('.item-tags') ||
            event.target.closest('.tag')) {
            return;
        }
        this.setActiveItem(itemId);
    }

    setActiveItem(itemId) {
        // Convert itemId to number to match item.id type (itemId comes as string from onclick handler)
        this.activeItemId = itemId ? (typeof itemId === 'string' ? parseFloat(itemId) : itemId) : null;
        this.renderDetailItems();
        // Focus the title input if activating
        if (this.activeItemId) {
            setTimeout(() => {
                const input = document.querySelector(`.item-text-input[data-item-id="${this.activeItemId}"]`);
                if (input) input.focus();
                
                // Setup auto-resize for description textarea
                const textarea = document.querySelector(`.item-description-input[data-item-id="${this.activeItemId}"]`);
                if (textarea) {
                    // Initial resize - run synchronously without delay
                    this.autoResizeTextarea(textarea);
                    
                    // Listen for input changes (avoid duplicate listeners)
                    if (textarea.dataset.resizeListenerAttached !== 'true') {
                        textarea.dataset.resizeListenerAttached = 'true';
                        textarea.addEventListener('input', () => this.autoResizeTextarea(textarea));
                    }
                }
            }, 0);
        }
    }

    autoResizeTextarea(textarea) {
        // Reset height to get accurate scrollHeight
        textarea.style.height = 'auto';
        // Get the scroll height (this includes all content + padding)
        const scrollHeight = textarea.scrollHeight;
        // Set the height
        textarea.style.height = scrollHeight + 'px';
    }

    updateItemField(itemId, field, value) {
        const item = this.items[this.currentCategory].find(i => i.id === itemId);
        if (!item) return;

        if (field === 'text') {
            item.text = value.trim();
        } else if (field === 'description') {
            item.description = value.trim() || undefined;
        } else if (field === 'link') {
            item.link = value.trim() || undefined;
            // Re-extract metadata if link changed
            if (item.link) {
                setTimeout(() => this.extractMetadataForItem(item), 100);
            }
        }

        this.saveState();
        this.storage.save('items', this.items);
        this.renderDetail();
    }

    // Drag and drop handlers
    handleDragStart(event, index) {
        this.draggedItemIndex = index;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/html', event.target.outerHTML);
        event.currentTarget.classList.add('dragging');
        
        // Trigger haptic feedback
        this.triggerHapticFeedback('light');
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        const item = event.currentTarget;
        const draggingItem = document.querySelector('.item.dragging');
        if (draggingItem && item !== draggingItem) {
            const rect = item.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            if (event.clientY < midpoint) {
                item.classList.add('drag-over-top');
                item.classList.remove('drag-over-bottom');
            } else {
                item.classList.add('drag-over-bottom');
                item.classList.remove('drag-over-top');
            }
        }
    }

    handleDrop(event, dropIndex) {
        event.preventDefault();
        event.stopPropagation();
        
        const dragIndex = this.draggedItemIndex;
        if (dragIndex === undefined || dragIndex === dropIndex) {
            this.handleDragEnd(event);
            return;
        }

        const items = this.items[this.currentCategory];
        const draggedItem = items[dragIndex];
        
        // Remove from old position
        items.splice(dragIndex, 1);
        
        // Calculate new index (accounting for removal)
        let newIndex = dropIndex;
        if (dragIndex < dropIndex) {
            newIndex = dropIndex - 1;
        }
        
        // Insert at new position
        items.splice(newIndex + 1, 0, draggedItem);
        
        // Trigger haptic feedback
        this.triggerHapticFeedback('light');
        
        this.saveState();
        this.storage.save('items', this.items);
        this.renderDetailItems();
    }

    handleDragEnd(event) {
        event.preventDefault();
        document.querySelectorAll('.item').forEach(item => {
            item.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
        });
        this.draggedItemIndex = undefined;
    }

    showMoveItemModal(itemIndex) {
        const item = this.items[this.currentCategory][itemIndex];
        if (!item) return;

        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');
        const modalBody = document.getElementById('modal-body');

        // Ensure modal-body has the class (in case it was missing)
        if (modalBody && !modalBody.classList.contains('modal-body')) {
            modalBody.classList.add('modal-body');
        }

        // Remove any existing header within this modal-content to ensure clean state
        const existingHeader = modalContent?.querySelector('.modal-header');
        if (existingHeader) {
            existingHeader.remove();
        }

        // Create fresh header
        let modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        if (modalContent && modalBody) {
            modalContent.insertBefore(modalHeader, modalBody);
        }

        // Set header content
        modalHeader.innerHTML = `
            <h2>Move Item</h2>
            <button class="modal-close-btn" onclick="app.closeModal()" aria-label="Close">×</button>
        `;

        // Get all categories except current
        const otherCategories = this.categories.filter(cat => cat !== this.currentCategory);

        const categoriesHTML = otherCategories.map(cat => {
            const metadata = this.categoryMetadata[cat] || { name: cat };
            return `
                <div class="modal-collection-option" onclick="app.moveItemToCategory(${itemIndex}, '${cat}')">
                    <strong>${this.escapeHtml(metadata.name)}</strong>
                </div>
            `;
        }).join('');

        modalBody.innerHTML = `
            <div style="padding: 20px 24px;">
                <p style="color: var(--text-secondary); margin-bottom: 16px;">${this.escapeHtml(item.text)}</p>
                <p style="color: var(--text-secondary); font-size: 0.9em; margin-bottom: 12px;">Select destination category:</p>
                ${categoriesHTML || '<p style="color: var(--text-secondary);">No other categories available</p>'}
                <div class="modal-buttons">
                    <button class="secondary" onclick="app.closeModal()">Cancel</button>
                </div>
            </div>
        `;

        modal.style.display = 'block';
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }

    moveItemToCategory(itemIndex, targetCategory) {
        const item = this.items[this.currentCategory][itemIndex];
        if (!item) return;

        // Remove from current category
        this.items[this.currentCategory].splice(itemIndex, 1);
        
        // Add to target category
        if (!this.items[targetCategory]) {
            this.items[targetCategory] = [];
        }
        this.items[targetCategory].push(item);

        this.activeItemId = null; // Clear active state
        this.saveState();
        this.storage.save('items', this.items);
        this.closeModal();
        this.renderDetail();
        this.updateCategoryCounts();
    }

    checkDuplicates() {
        const items = this.items[this.currentCategory];
        const duplicates = this.duplicateDetector.findDuplicates(items);
        
        if (duplicates.length > 0) {
            const dup = duplicates[0];
            if (confirm(`Found ${dup.items.length} similar items. Merge them?`)) {
                const merged = this.duplicateDetector.mergeItems(dup.items);
                // Remove duplicates
                dup.indices.reverse().forEach(idx => {
                    if (idx !== dup.indices[0]) {
                        this.items[this.currentCategory].splice(idx, 1);
                    }
                });
                // Update first item with merged data
                const firstIdx = dup.indices[0];
                this.items[this.currentCategory][firstIdx] = { ...this.items[this.currentCategory][firstIdx], ...merged };
                this.saveState();
                this.storage.save('items', this.items);
                this.renderDetail();
            }
        }
    }

    // [Continue with remaining methods - Collections, Import, Export, etc.]
    // Keeping methods from original but enhanced with error handling

    showAddToCollectionModal(itemIndex) {
        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');
        const modalBody = document.getElementById('modal-body');
        const item = this.items[this.currentCategory][itemIndex];
        const collections = this.collections[this.currentCategory] || [];

        // Ensure modal-body has the class (in case it was missing)
        if (modalBody && !modalBody.classList.contains('modal-body')) {
            modalBody.classList.add('modal-body');
        }

        // Remove any existing header within this modal-content to ensure clean state
        const existingHeader = modalContent?.querySelector('.modal-header');
        if (existingHeader) {
            existingHeader.remove();
        }

        // Create fresh header
        let modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        if (modalContent && modalBody) {
            modalContent.insertBefore(modalHeader, modalBody);
        }

        // Set header content
        modalHeader.innerHTML = `
            <h2>Add to Collection</h2>
            <button class="modal-close-btn" onclick="app.closeModal()" aria-label="Close">×</button>
        `;

        let collectionsHTML = '';
        if (collections.length === 0) {
            collectionsHTML = '<div class="empty-state">No collections yet. Create one first!</div>';
        } else {
            collectionsHTML = collections.map((collection, idx) => `
                <div class="modal-collection-option" onclick="app.addItemToCollection(${itemIndex}, ${idx})">
                    <strong>${this.escapeHtml(collection.name)}</strong>
                    <span>${collection.items.length} items</span>
                </div>
            `).join('');
        }

        modalBody.innerHTML = `
            <div style="padding: 20px 24px;">
                <p style="color: var(--text-secondary); margin-bottom: 16px;">${this.escapeHtml(item.text)}</p>
                ${collectionsHTML}
                <div class="modal-buttons">
                    <button class="secondary" onclick="app.closeModal()">Cancel</button>
                </div>
            </div>
        `;
        modal.style.display = 'block';
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }

    addItemToCollection(itemIndex, collectionIndex) {
        const item = this.items[this.currentCategory][itemIndex];
        const collection = this.collections[this.currentCategory][collectionIndex];
        if (!collection.items.find(i => i.id === item.id)) {
            collection.items.push({ ...item });
            this.saveState();
            this.storage.save('collections', this.collections);
            this.renderDetail();
        }
        this.closeModal();
    }

    // Collections
    showImportModal() {
        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');
        const modalBody = document.getElementById('modal-body');

        // Ensure modal-body has the class (in case it was missing)
        if (modalBody && !modalBody.classList.contains('modal-body')) {
            modalBody.classList.add('modal-body');
        }

        // Remove any existing header within this modal-content to ensure clean state
        const existingHeader = modalContent?.querySelector('.modal-header');
        if (existingHeader) {
            existingHeader.remove();
        }

        // Create fresh header
        let modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        if (modalContent && modalBody) {
            modalContent.insertBefore(modalHeader, modalBody);
        }

        // Set header content
        modalHeader.innerHTML = `
            <h2>Import Collection</h2>
            <button class="modal-close-btn" onclick="app.closeModal()" aria-label="Close">×</button>
        `;

        const sources = this.suggestedSources[this.currentCategory] || [];
        const sourcesHTML = sources.length > 0 ? `
            <div style="margin-bottom: 16px;">
                <p style="color: var(--text-secondary); font-size: 0.85em; margin-bottom: 8px;">Suggested Sources:</p>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${sources.map(source => `
                        <button class="source-chip" onclick="app.quickImport('${source.url}', '${this.escapeHtml(source.name)}')">
                            ${this.escapeHtml(source.name)}
                        </button>
                    `).join('')}
                </div>
            </div>
        ` : '';

        modalBody.innerHTML = `
            <div style="padding: 20px 24px;">
                ${sourcesHTML}
                <p style="color: var(--text-secondary); font-size: 0.9em; margin-bottom: 16px;">
                    Or paste a URL, share link, or list of items (one per line)
                </p>
                <input type="text" id="import-name-input" placeholder="Collection name..." style="margin-bottom: 12px;">
                <textarea id="import-text-input" placeholder="Paste URL, share link, or list here..." rows="6" autofocus></textarea>
                <div class="modal-buttons">
                    <button class="secondary" onclick="app.closeModal()">Cancel</button>
                    <button onclick="app.processImport()">Import</button>
                </div>
            </div>
        `;
        modal.style.display = 'block';
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }

    async quickImport(url, name) {
        try {
            this.showLoading(`Importing from ${name}...`);
            const items = await this.rssParser.parseURL(url);
            this.hideLoading();

            if (items.length > 0) {
                // Check if "Anygood Digest" collection exists for this category
                let digestCollection = this.collections[this.currentCategory].find(
                    c => c.name === 'Anygood Digest'
                );

                if (!digestCollection) {
                    // Create new "Anygood Digest" collection
                    digestCollection = {
                        id: Date.now(),
                        name: 'Anygood Digest',
                        items: [],
                        expanded: true,
                        digest: true,
                        lastUpdated: Date.now()
                    };
                    this.collections[this.currentCategory].push(digestCollection);
                }

                // Add items with full metadata
                const newItems = items.map(item => {
                    const itemObj = {
                        id: Date.now() + Math.random(),
                        text: item.title || item,
                        completed: false,
                        source: name,
                        sourceUrl: url,
                        importedAt: Date.now()
                    };
                    
                    if (item.description) itemObj.description = item.description;
                    if (item.link) itemObj.link = item.link;
                    if (item.pubDate) itemObj.pubDate = item.pubDate;
                    
                    return itemObj;
                });

                // Add to digest collection
                digestCollection.items.push(...newItems);
                digestCollection.lastUpdated = Date.now();

                this.saveState();
                this.storage.save('collections', this.collections);
                this.renderDetail();
                this.closeModal();
            } else {
                this.hideLoading();
                this.showNotification(`Could not fetch items from ${name}`, 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification(`Import failed: ${error.message}`, 'error');
        }
    }

    async processImport() {
        const nameInput = document.getElementById('import-name-input');
        const textInput = document.getElementById('import-text-input');
        const input = textInput.value.trim();
        const collectionName = nameInput.value.trim() || 'Imported Collection';

        if (!input) return;

        try {
            this.showLoading('Processing import...');
            let items = [];
            let isRSSFeed = false;

            if (input.startsWith('http://') || input.startsWith('https://')) {
                items = await this.rssParser.parseURL(input);
                isRSSFeed = true;
            } else {
                items = input.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .map(line => line.replace(/^[-*•]\s*/, ''));
            }

            this.hideLoading();

            if (items.length > 0) {
                if (isRSSFeed) {
                    // For RSS feeds, add to "Anygood Digest"
                    let digestCollection = this.collections[this.currentCategory].find(
                        c => c.name === 'Anygood Digest'
                    );

                    if (!digestCollection) {
                        digestCollection = {
                            id: Date.now(),
                            name: 'Anygood Digest',
                            items: [],
                            expanded: true,
                            digest: true,
                            lastUpdated: Date.now()
                        };
                        this.collections[this.currentCategory].push(digestCollection);
                    }

                    const newItems = items.map(item => {
                        const itemObj = {
                            id: Date.now() + Math.random(),
                            text: item.title || item,
                            completed: false,
                            source: collectionName,
                            sourceUrl: input,
                            importedAt: Date.now()
                        };
                        
                        if (item.description) itemObj.description = item.description;
                        if (item.link) itemObj.link = item.link;
                        if (item.pubDate) itemObj.pubDate = item.pubDate;
                        
                        return itemObj;
                    });

                    digestCollection.items.push(...newItems);
                    digestCollection.lastUpdated = Date.now();
                } else {
                    // For plain text lists, create regular collection
                    this.collections[this.currentCategory].push({
                        id: Date.now(),
                        name: collectionName,
                        items: items.map(text => ({
                            id: Date.now() + Math.random(),
                            text: text,
                            completed: false
                        })),
                        expanded: true
                    });
                }
                
                this.saveState();
                this.storage.save('collections', this.collections);
                this.renderDetail();
                this.closeModal();
            } else {
                this.showNotification('Could not parse any items', 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification(`Import failed: ${error.message}`, 'error');
        }
    }

    showAddCollectionModal() {
        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');
        const modalBody = document.getElementById('modal-body');

        // Ensure modal-body has the class (in case it was missing)
        if (modalBody && !modalBody.classList.contains('modal-body')) {
            modalBody.classList.add('modal-body');
        }

        // Remove any existing header within this modal-content to ensure clean state
        const existingHeader = modalContent?.querySelector('.modal-header');
        if (existingHeader) {
            existingHeader.remove();
        }

        // Create fresh header
        let modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        if (modalContent && modalBody) {
            modalContent.insertBefore(modalHeader, modalBody);
        }

        // Set header content
        modalHeader.innerHTML = `
            <h2>New Collection</h2>
            <button class="modal-close-btn" onclick="app.closeModal()" aria-label="Close">×</button>
        `;

        modalBody.innerHTML = `
            <div style="padding: 20px 24px;">
                <input type="text" id="collection-name-input" placeholder="Collection name..." autofocus>
                <div class="modal-buttons">
                    <button class="secondary" onclick="app.closeModal()">Cancel</button>
                    <button onclick="app.addCollection()">Create</button>
                </div>
            </div>
        `;
        modal.style.display = 'block';
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });

        const input = document.getElementById('collection-name-input');
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addCollection();
        });
    }

    addCollection() {
        const input = document.getElementById('collection-name-input');
        const name = input.value.trim();
        if (name) {
            this.collections[this.currentCategory].push({
                id: Date.now(),
                name: name,
                items: [],
                expanded: false
            });
            this.saveState();
            this.storage.save('collections', this.collections);
            this.renderDetail();
            this.closeModal();
        }
    }

    toggleCollectionById(collectionId) {
        const collections = this.collections[this.currentCategory] || [];
        const collectionIndex = collections.findIndex(c => c.id === collectionId);
        if (collectionIndex === -1) return;
        
        collections[collectionIndex].expanded = !collections[collectionIndex].expanded;
        this.storage.save('collections', this.collections);
        this.renderDetail();
    }

    toggleCollection(collectionIndex) {
        // Legacy method - kept for backwards compatibility
        const collections = this.collections[this.currentCategory] || [];
        if (collectionIndex < 0 || collectionIndex >= collections.length) return;
        
        collections[collectionIndex].expanded = !collections[collectionIndex].expanded;
        this.storage.save('collections', this.collections);
        this.renderDetail();
    }

    deleteCollection(collectionIndex) {
        const collection = this.collections[this.currentCategory][collectionIndex];
        if (collection && collection.digest) {
            this.showNotification('Cannot delete Anygood Digest collection', 'error');
            return;
        }
        if (confirm('Delete this collection?')) {
            this.collections[this.currentCategory].splice(collectionIndex, 1);
            this.saveState();
            this.storage.save('collections', this.collections);
            this.renderDetail();
        }
    }

    deleteCollectionItem(collectionIndex, itemIndex) {
        const collection = this.collections[this.currentCategory][collectionIndex];
        if (collection && collection.digest) {
            // Cannot delete items from digest collections
            return;
        }
        this.collections[this.currentCategory][collectionIndex].items.splice(itemIndex, 1);
        this.saveState();
        this.storage.save('collections', this.collections);
        this.renderDetail();
    }

    addCollectionItemToMain(collectionIndex, itemIndex) {
        const collection = this.collections[this.currentCategory][collectionIndex];
        const collectionItem = collection.items[itemIndex];
        const isDigest = collection.digest;
        
        if (!this.items[this.currentCategory].find(i => i.id === collectionItem.id)) {
            // Create item copy
            const newItem = { ...collectionItem, completed: false };
            
            // If it's from digest and has a description, summarize it
            if (isDigest && newItem.description) {
                newItem.description = this.aiFeatures.summarizeDescription(newItem.description, 100);
            }
            
            this.items[this.currentCategory].push(newItem);
            this.saveState();
            this.storage.save('items', this.items);
            this.updateCategoryCounts();
            
            // If it's a digest item, animate removal
            if (isDigest) {
                const itemElement = document.querySelector(
                    `.collection-item[data-collection-index="${collectionIndex}"][data-item-index="${itemIndex}"]`
                );
                
                if (itemElement) {
                    // Add animation class
                    itemElement.classList.add('moving-out');
                    
                    // Remove item after animation completes
                    setTimeout(() => {
                        // Remove from collection
                        collection.items.splice(itemIndex, 1);
                        this.saveState();
                        this.storage.save('collections', this.collections);
                        // Re-render to update UI
                        this.renderDetail();
                    }, 400); // Match the animation duration + small delay
                } else {
                    // Fallback: remove immediately if element not found
                    collection.items.splice(itemIndex, 1);
                    this.saveState();
                    this.storage.save('collections', this.collections);
                    this.renderDetail();
                }
            } else {
                // For non-digest items, just re-render
                this.renderDetail();
            }
        }
    }

    addDailyPickItemToMain(itemId) {
        // Find the item in the original collections (digest or curated)
        const collections = this.collections[this.currentCategory] || [];
        let foundItem = null;
        let sourceCollection = null;
        
        for (const collection of collections) {
            if (collection.digest || collection.curated) {
                const item = collection.items.find(i => (i.id || i.text) === itemId);
                if (item) {
                    foundItem = item;
                    sourceCollection = collection;
                    break;
                }
            }
        }
        
        if (!foundItem) return;
        
        // Check if item already exists in main list
        if (!this.items[this.currentCategory].find(i => i.id === foundItem.id)) {
            // Create item copy
            const newItem = { ...foundItem, completed: false };
            
            // Remove internal tracking properties
            delete newItem._sourceCollection;
            delete newItem._sourceCurated;
            delete newItem._sourceDigest;
            
            // If it has a description, summarize it
            if (newItem.description) {
                newItem.description = this.aiFeatures.summarizeDescription(newItem.description, 100);
            }
            
            this.items[this.currentCategory].push(newItem);
            this.saveState();
            this.storage.save('items', this.items);
            this.updateCategoryCounts();
            
            // Animate removal from Anygood Digest
            const itemElement = document.querySelector(
                `.collection-item[data-collection-item-id="${itemId}"]`
            );
            
            if (itemElement) {
                itemElement.classList.add('moving-out');
                
                setTimeout(() => {
                    // Remove from source collection
                    if (sourceCollection) {
                        const itemIndex = sourceCollection.items.findIndex(i => (i.id || i.text) === itemId);
                        if (itemIndex !== -1) {
                            sourceCollection.items.splice(itemIndex, 1);
                            this.saveState();
                            this.storage.save('collections', this.collections);
                        }
                    }
                    // Re-render to update UI
                    this.renderDetail();
                }, 400);
            } else {
                // Fallback: remove immediately
                if (sourceCollection) {
                    const itemIndex = sourceCollection.items.findIndex(i => (i.id || i.text) === itemId);
                    if (itemIndex !== -1) {
                        sourceCollection.items.splice(itemIndex, 1);
                        this.saveState();
                        this.storage.save('collections', this.collections);
                    }
                }
                this.renderDetail();
            }
        }
    }

    // Share List
    showShareModal() {
        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');
        const modalBody = document.getElementById('modal-body');

        // Ensure modal-body has the class (in case it was missing)
        if (modalBody && !modalBody.classList.contains('modal-body')) {
            modalBody.classList.add('modal-body');
        }

        // Remove any existing header within this modal-content to ensure clean state
        const existingHeader = modalContent?.querySelector('.modal-header');
        if (existingHeader) {
            existingHeader.remove();
        }

        // Create fresh header
        let modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        if (modalContent && modalBody) {
            modalContent.insertBefore(modalHeader, modalBody);
        }

        // Get category metadata for display name
        const metadata = this.categoryMetadata[this.currentCategory] || { name: this.currentCategory };
        const categoryName = metadata.name || this.currentCategory;

        // Generate share link immediately
        let shareData, encoded, shareUrl;
        try {
            shareData = {
                version: "1.0",
                type: "custom-category",
                category: this.currentCategory,
                categoryMetadata: this.categoryMetadata[this.currentCategory],
                items: this.items[this.currentCategory] || [],
                collections: this.collections[this.currentCategory] || [],
                sharedAt: new Date().toISOString(),
                itemCount: (this.items[this.currentCategory] || []).length,
                collectionCount: (this.collections[this.currentCategory] || []).length
            };
            
            // Use proper Unicode-safe encoding: first encode to URI component, then base64
            const jsonString = JSON.stringify(shareData);
            // Convert to base64 safely by first encoding as URI component to handle Unicode
            encoded = btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, (match, p1) => {
                return String.fromCharCode('0x' + p1);
            }));
            shareUrl = `${window.location.origin}${window.location.pathname}#share=${encoded}`;
        } catch (error) {
            console.error('Error generating share link:', error);
            this.showNotification('Error generating share link', 'error');
            return;
        }

        // Set header content
        modalHeader.innerHTML = `
            <h2>Share List</h2>
            <button class="modal-close-btn" onclick="app.closeModal()" aria-label="Close">×</button>
        `;

        modalBody.innerHTML = `
            <div style="padding: 20px 24px;">
                <p style="color: var(--text-secondary); font-size: 0.9em; margin-bottom: 20px;">
                    Share your <strong>${this.escapeHtml(categoryName)}</strong> list with another Anygood user
                </p>
                <div style="background: var(--bg-primary); padding: 16px; border-radius: var(--radius-sm); margin-bottom: 16px;">
                    <p style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 8px;">Share this link:</p>
                    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                        <input type="text" value="${shareUrl}" readonly style="flex: 1; font-size: 0.8em; padding: 8px;" id="share-url-input">
                        <button onclick="app.copyShareLink()" style="padding: 8px 16px; font-size: 0.85em;">Copy</button>
                    </div>
                    <div id="copy-feedback" style="min-height: 20px;"></div>
                </div>
                <button class="secondary" onclick="app.closeModal()" style="width: 100%; justify-content: center;">Done</button>
            </div>
        `;
        modal.style.display = 'block';
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }

    copyShareLink() {
        const input = document.getElementById('share-url-input');
        if (input) {
            input.select();
            document.execCommand('copy');
            const feedback = document.getElementById('copy-feedback');
            if (feedback) {
                feedback.innerHTML = '<p style="color: var(--accent-blue); font-size: 0.85em;">✓ Link copied to clipboard!</p>';
                // Clear feedback after 3 seconds
                setTimeout(() => {
                    if (feedback) feedback.innerHTML = '';
                }, 3000);
            }
        }
    }

    checkForSharedData() {
        const hash = window.location.hash;
        if (hash.startsWith('#share=')) {
            try {
                const encoded = hash.substring(7);
                // Decode with Unicode support: reverse the encoding process
                const decodedString = decodeURIComponent(atob(encoded).split('').map((c) => {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const decoded = JSON.parse(decodedString);
                
                // Validate shared data structure
                if (decoded.category && decoded.items) {
                    setTimeout(() => {
                        // Build detailed confirmation message
                        const categoryName = decoded.categoryMetadata?.name || decoded.category;
                        const itemCount = decoded.itemCount || decoded.items.length;
                        const collectionCount = decoded.collectionCount || (decoded.collections?.length || 0);
                        
                        let message = `Import "${categoryName}" list?\n\n`;
                        message += `📝 ${itemCount} item${itemCount !== 1 ? 's' : ''}`;
                        if (collectionCount > 0) {
                            message += `\n📚 ${collectionCount} collection${collectionCount !== 1 ? 's' : ''}`;
                        }
                        message += `\n\nItems will be merged with any existing items in this category.`;
                        
                        if (confirm(message)) {
                            this.importSharedData(decoded);
                        }
                        window.location.hash = '';
                    }, 500);
                }
            } catch (error) {
                console.error('Error parsing shared data:', error);
                this.showNotification('Invalid or corrupted share link', 'error');
                window.location.hash = '';
            }
        }
    }

    importSharedData(sharedData) {
        const category = sharedData.category;
        const categoryMetadata = sharedData.categoryMetadata;
        
        // Create category if it doesn't exist
        if (!this.categories.includes(category)) {
            this.categories.push(category);
            this.items[category] = [];
            this.collections[category] = [];
            
            // Store category metadata if provided
            if (categoryMetadata) {
                this.categoryMetadata[category] = categoryMetadata;
                this.storage.save('categoryMetadata', this.categoryMetadata);
            }
            
            this.storage.save('categories', this.categories);
        }
        
        // Track import stats
        let importedItems = 0;
        let importedCollections = 0;
        let skippedItems = 0;
        
        // Import items (avoid duplicates based on text)
        const existingTexts = new Set(this.items[category].map(i => i.text));
        
        sharedData.items.forEach(item => {
            if (!existingTexts.has(item.text)) {
                this.items[category].push({
                    ...item,
                    id: Date.now() + Math.random(),
                    completed: false // Reset completion status on import
                });
                importedItems++;
            } else {
                skippedItems++;
            }
        });

        // Import collections if present
        if (sharedData.collections && sharedData.collections.length > 0) {
            sharedData.collections.forEach(collection => {
                this.collections[category].push({
                    ...collection,
                    id: Date.now() + Math.random(),
                    imported: true,
                    importedAt: new Date().toISOString()
                });
                importedCollections++;
            });
        }

        // Save state
        this.saveState();
        this.storage.save('items', this.items);
        this.storage.save('collections', this.collections);
        this.updateCategoryCounts();
        this.renderOverview();
        
        // Show success notification with details
        let message = `Imported ${importedItems} item${importedItems !== 1 ? 's' : ''}`;
        if (importedCollections > 0) {
            message += ` and ${importedCollections} collection${importedCollections !== 1 ? 's' : ''}`;
        }
        if (skippedItems > 0) {
            message += ` (${skippedItems} duplicate${skippedItems !== 1 ? 's' : ''} skipped)`;
        }
        this.showNotification(message, 'success');
        
        // Open the category to show imported content
        this.openCategory(category);
    }

    // Quick Add from Main View (now uses preview flow)
    async quickAddFromMain() {
        // This function is kept for backward compatibility
        // The actual add logic is now in addFromPreview()
        const input = document.getElementById('quick-add-input');
        if (!input) return;

        const text = input.value.trim();
        if (!text) return;

        // Show preview first, or add directly if preview is visible
        const preview = document.getElementById('input-preview');
        if (preview && preview.style.display !== 'none') {
            this.addFromPreview();
        } else {
            await this.updatePreview(text);
        }
    }

    // Category Management
    showAddCategoryModal() {
        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');
        const modalBody = document.getElementById('modal-body');

        // Ensure modal-body has the class (in case it was missing)
        if (modalBody && !modalBody.classList.contains('modal-body')) {
            modalBody.classList.add('modal-body');
        }

        // Remove any existing header within this modal-content to ensure clean state
        const existingHeader = modalContent?.querySelector('.modal-header');
        if (existingHeader) {
            existingHeader.remove();
        }

        // Create fresh header
        let modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        if (modalContent && modalBody) {
            modalContent.insertBefore(modalHeader, modalBody);
        }

        // Set header content
        modalHeader.innerHTML = `
            <h2>Create New Category</h2>
            <button class="modal-close-btn" onclick="app.closeModal()" aria-label="Close">×</button>
        `;

        // Set body content (without the h2 title since it's in header now)
        modalBody.innerHTML = `
            <div style="padding: 20px 24px;">
                <input type="text" id="category-name-input" placeholder="Category name..." autofocus>
                <div class="modal-buttons">
                    <button class="secondary" onclick="app.closeModal()">Cancel</button>
                    <button onclick="app.addCategory()">Create</button>
                </div>
            </div>
        `;

        modal.style.display = 'block';
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });

        const nameInput = document.getElementById('category-name-input');
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addCategory();
        });
    }

    showEditCategoryModal() {
        if (!this.currentCategory) return;
        
        // Don't allow editing core categories
        if (this.isCoreCategory(this.currentCategory)) {
            this.showNotification('Core categories cannot be renamed', 'error');
            return;
        }

        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');
        const modalBody = document.getElementById('modal-body');

        // Ensure modal-body has the class
        if (modalBody && !modalBody.classList.contains('modal-body')) {
            modalBody.classList.add('modal-body');
        }

        // Remove any existing header
        const existingHeader = modalContent?.querySelector('.modal-header');
        if (existingHeader) {
            existingHeader.remove();
        }

        // Create fresh header
        let modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        if (modalContent && modalBody) {
            modalContent.insertBefore(modalHeader, modalBody);
        }

        // Get current category name
        const currentMetadata = this.categoryMetadata[this.currentCategory] || { name: this.currentCategory };
        const escapedName = currentMetadata.name.replace(/"/g, '&quot;');
        
        // Set header content
        modalHeader.innerHTML = `
            <h2>Edit Category Name</h2>
            <button class="modal-close-btn" onclick="app.closeModal()" aria-label="Close">×</button>
        `;

        // Set body content with current name
        modalBody.innerHTML = `
            <div style="padding: 20px 24px;">
                <input type="text" id="edit-category-name-input" placeholder="Category name..." value="${escapedName}" autofocus>
                <div class="modal-buttons">
                    <button class="secondary" onclick="app.closeModal()">Cancel</button>
                    <button onclick="app.updateCategoryName()">Save</button>
                </div>
            </div>
        `;

        modal.style.display = 'block';
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });

        const nameInput = document.getElementById('edit-category-name-input');
        // Select the text for easy editing
        nameInput.select();
        
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.updateCategoryName();
        });
    }

    updateCategoryName() {
        if (!this.currentCategory) return;
        
        const nameInput = document.getElementById('edit-category-name-input');
        const newName = nameInput.value.trim();

        if (!newName) {
            this.showNotification('Please enter a category name', 'error');
            return;
        }

        // Update the metadata with new name (keep the same slug)
        this.categoryMetadata[this.currentCategory] = {
            ...this.categoryMetadata[this.currentCategory],
            name: newName
        };

        // Save and update UI
        this.storage.save('categoryMetadata', this.categoryMetadata);
        this.closeModal();
        this.renderDetail();
        this.renderOverview();
        this.showNotification('Category name updated', 'success');
    }


    addCategory() {
        const nameInput = document.getElementById('category-name-input');
        
        const name = nameInput.value.trim();
        const icon = '📋';

        if (!name) {
            this.showNotification('Please enter a category name', 'error');
            return;
        }

        // Create slug from name
        const slug = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        if (this.categories.includes(slug)) {
            this.showNotification('Category already exists', 'error');
            return;
        }

        // Add category
        this.categories.push(slug);
        this.categoryMetadata[slug] = { icon: icon, name: name };
        this.items[slug] = [];
        this.collections[slug] = [];
        this.completedItemsExpanded[slug] = false;

        this.saveState();
        this.storage.save('categories', this.categories);
        this.storage.save('categoryMetadata', this.categoryMetadata);
        this.storage.save('items', this.items);
        this.storage.save('collections', this.collections);

        this.renderOverview();
        this.closeModal();
    }

    addCategorySilently(slug, name) {
        if (this.categories.includes(slug)) return;

        this.categories.push(slug);
        this.categoryMetadata[slug] = { 
            icon: this.getCategoryIcon(slug), 
            name: name || slug.charAt(0).toUpperCase() + slug.slice(1)
        };
        this.items[slug] = [];
        this.collections[slug] = [];
        this.completedItemsExpanded[slug] = false;

        this.storage.save('categories', this.categories);
        this.storage.save('categoryMetadata', this.categoryMetadata);
        this.storage.save('items', this.items);
        this.storage.save('collections', this.collections);
    }

    getCategoryIcon(slug) {
        // Try to infer icon from category name
        const iconMap = {
            'read': '📚', 'listen': '🎵', 'watch': '📺', 'eat': '🍽️', 'do': '✨',
            'book': '📚', 'music': '🎵', 'movie': '📺', 'food': '🍽️', 'activity': '✨',
            'travel': '✈️', 'shop': '🛍️', 'learn': '📖', 'exercise': '💪', 'play': '🎮'
        };
        return iconMap[slug] || '📋';
    }

    deleteCategory(categorySlug) {
        // Don't allow deleting default categories
        const defaultCategories = ['read', 'listen', 'watch', 'eat', 'do'];
        if (defaultCategories.includes(categorySlug)) {
            this.showNotification('Cannot delete default categories', 'error');
            return;
        }

        if (!confirm(`Delete category "${this.categoryMetadata[categorySlug]?.name || categorySlug}" and all its items?`)) {
            return;
        }

        // Remove category
        this.categories = this.categories.filter(cat => cat !== categorySlug);
        delete this.categoryMetadata[categorySlug];
        delete this.items[categorySlug];
        delete this.collections[categorySlug];
        delete this.completedItemsExpanded[categorySlug];

        // If currently viewing this category, go back
        if (this.currentCategory === categorySlug) {
            this.closeCategory();
        }

        this.saveState();
        this.storage.save('categories', this.categories);
        this.storage.save('categoryMetadata', this.categoryMetadata);
        this.storage.save('items', this.items);
        this.storage.save('collections', this.collections);

        this.renderOverview();
    }

    toggleCompletedItems() {
        if (!this.currentCategory) return;
        this.completedItemsExpanded[this.currentCategory] = !this.completedItemsExpanded[this.currentCategory];
        this.renderDetailItems();
    }

    async refreshDigest(collectionIndex) {
        const collection = this.collections[this.currentCategory][collectionIndex];
        if (!collection || !collection.digest) return;

        // Find the source URL from the first item
        const firstItem = collection.items.find(item => item.sourceUrl);
        if (!firstItem || !firstItem.sourceUrl) {
            this.showNotification('Cannot refresh: no source URL found', 'error');
            return;
        }

        const sourceName = firstItem.source || 'feed';
        
        try {
            this.showLoading(`Refreshing ${sourceName}...`);
            const items = await this.rssParser.parseURL(firstItem.sourceUrl);
            this.hideLoading();

            if (items.length > 0) {
                // Add new items (avoid duplicates by checking text)
                const existingTexts = new Set(collection.items.map(i => i.text));
                const newItems = items
                    .filter(item => !existingTexts.has(item.title || item))
                    .map(item => {
                        const itemObj = {
                            id: Date.now() + Math.random(),
                            text: item.title || item,
                            completed: false,
                            source: sourceName,
                            sourceUrl: firstItem.sourceUrl,
                            importedAt: Date.now()
                        };
                        
                        if (item.description) itemObj.description = item.description;
                        if (item.link) itemObj.link = item.link;
                        if (item.pubDate) itemObj.pubDate = item.pubDate;
                        
                        return itemObj;
                    });

                if (newItems.length > 0) {
                    collection.items.unshift(...newItems); // Add new items at the top
                    collection.lastUpdated = Date.now();
                    this.saveState();
                    this.storage.save('collections', this.collections);
                    this.renderDetail();
                }
            } else {
                this.hideLoading();
                this.showNotification('Could not fetch items', 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification(`Refresh failed: ${error.message}`, 'error');
        }
    }

    async autoPopulateRecommendations() {
        // Only populate if digest collections are empty (don't overwrite existing data)
        // This runs silently in the background
        // Only populate for default categories, not user-created ones
        const defaultCategories = ['read', 'listen', 'watch', 'eat', 'do'];
        for (const category of this.categories) {
            // Skip user-created categories
            if (!defaultCategories.includes(category)) continue;
            
            const collections = this.collections[category] || [];
            const digestCollection = collections.find(c => c.name === 'Anygood Digest' && c.digest);
            
            // Only populate if digest collection exists and is empty
            if (digestCollection && (!digestCollection.items || digestCollection.items.length === 0)) {
                const sources = this.suggestedSources[category] || [];
                
                // Try to populate from the first available RSS source
                for (const source of sources) {
                    if (source.type === 'rss' && source.url) {
                        try {
                            const items = await this.rssParser.parseURL(source.url);
                            
                            if (items && items.length > 0) {
                                // Add items to digest collection
                                const newItems = items.slice(0, 20).map(item => {
                                    const itemObj = {
                                        id: Date.now() + Math.random(),
                                        text: item.title || item,
                                        completed: false,
                                        source: source.name,
                                        sourceUrl: source.url,
                                        importedAt: Date.now()
                                    };
                                    
                                    if (item.description) itemObj.description = item.description;
                                    if (item.link) itemObj.link = item.link;
                                    if (item.pubDate) itemObj.pubDate = item.pubDate;
                                    
                                    return itemObj;
                                });

                                digestCollection.items = newItems;
                                digestCollection.lastUpdated = Date.now();
                                digestCollection.sourceUrl = source.url;
                                
                                this.storage.save('collections', this.collections);
                                
                                // Only populate from first successful source per category
                                break;
                            }
                        } catch (error) {
                            // Silently fail - try next source or skip category
                            console.log(`Failed to auto-populate from ${source.name}:`, error.message);
                            continue;
                        }
                    }
                }
            }
        }
    }

    // Utilities
    closeModal() {
        const modal = document.getElementById('modal');
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Match transition duration
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    openExternalLink(url) {
        // Use Electron API if available, otherwise fallback to window.open
        if (window.electronAPI && window.electronAPI.openExternal) {
            window.electronAPI.openExternal(url);
        } else {
            window.open(url, '_blank');
        }
    }
}

// Initialize app
const app = new AnygoodApp();
