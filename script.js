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
                { name: 'London Review of Books', url: 'https://www.lrb.co.uk/feed', type: 'rss' },
                { name: 'The Quietus - Books', url: 'https://thequietus.com/feed', type: 'rss' }
            ],
            listen: [
                { name: 'Resident Advisor Events', url: 'https://ra.co/xml/eventlistings.xml', type: 'rss' },
                { name: 'The Quietus Music', url: 'https://thequietus.com/feed', type: 'rss' },
                { name: 'Pitchfork Reviews', url: 'https://pitchfork.com/rss/reviews/albums/', type: 'rss' }
            ],
            watch: [
                { name: 'BFI Film Releases', url: 'https://whatson.bfi.org.uk/Online/default.asp', type: 'list' },
                { name: 'Little White Lies', url: 'https://lwlies.com/feed/', type: 'rss' }
            ],
            eat: [
                { name: 'Hot Dinners London', url: 'https://www.hot-dinners.com/feed', type: 'rss' },
                { name: 'London Eater', url: 'https://london.eater.com/rss/index.xml', type: 'rss' }
            ],
            do: [
                { name: 'Londonist Events', url: 'https://londonist.com/feed', type: 'rss' },
                { name: 'Time Out London', url: 'https://www.timeout.com/london/feed', type: 'rss' }
            ]
        };

        // Populate placeholder data if first run
        if (this.isFirstRun()) {
            this.populatePlaceholderData();
            // Save placeholder data immediately
            this.storage.save('items', this.items);
            this.storage.save('collections', this.collections);
        }

        // Save initial state for undo
        this.saveState();

        this.init();
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
        this.renderOverview();
        this.checkForSharedData();
        this.updateCategoryCounts();
    }

    setupCategoryClicks() {
        // Use event delegation to handle category card clicks
        const grid = document.getElementById('category-grid');
        if (grid) {
            grid.addEventListener('click', (e) => {
                const card = e.target.closest('.category-card');
                if (card && !e.target.closest('.category-delete-btn')) {
                    const category = card.getAttribute('data-category');
                    if (category) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.openCategory(category);
                    }
                }
            });

            // Add keyboard support
            grid.addEventListener('keydown', (e) => {
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
            });
        }
    }

    setupElectronIPC() {
        // Listen for focus events from Electron
        if (window.electronAPI) {
            window.electronAPI.onFocusQuickAdd(() => {
                this.focusQuickAddInput();
            });
        }
        
        // Also focus when window becomes visible (for browser compatibility)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && !this.currentCategory) {
                setTimeout(() => this.focusQuickAddInput(), 100);
            }
        });
    }

    focusQuickAddInput() {
        // Only focus if we're on the main view
        if (!this.currentCategory) {
            const input = document.getElementById('quick-add-input');
            if (input) {
                input.focus();
                input.select();
            }
        }
    }

    setupQuickAdd() {
        const input = document.getElementById('quick-add-input');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.quickAddFromMain();
                }
            });
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
        const codePatterns = [
            /^[a-zA-Z0-9_$]+\s*[=:]\s*/,  // Variable assignments
            /^[{}[\]]+/,  // Brackets
            /^(\/\/|\/\*|#|<!--)/,  // Comments
            /^function\s*\(|^const\s+\w+\s*=|^let\s+\w+\s*=|^var\s+\w+\s*=/,  // Code patterns
            /\n.*\{.*\}/,  // Code blocks
        ];
        
        return codePatterns.some(pattern => pattern.test(text.trim()));
    }

    isAddableContent(text, parsed) {
        // Check if it looks like a title, URL, or structured content
        const hasUrl = /https?:\/\/[^\s]+/.test(text);
        const hasTitle = parsed.title && parsed.title.length > 3;
        const hasCategory = parsed.category !== null;
        const looksLikeItem = text.length > 5 && text.length < 200;

        return (hasUrl || hasTitle || hasCategory) && looksLikeItem;
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
                <span class="clipboard-suggestion-text">
                    📋 Add "${this.escapeHtml(title)}" to ${categoryName}?
                </span>
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
            this.showNotification(`✓ Added to ${this.categoryMetadata[category]?.name || category}`, 'success');

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
        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                this.closeModal();
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

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
            this.showNotification('Undone', 'success');
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
            this.showNotification('Redone', 'success');
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
        document.getElementById('overview-screen').classList.remove('active');
        document.getElementById('detail-screen').classList.add('active');
        this.renderDetail();
    }

    closeCategory() {
        this.currentCategory = null;
        this.selectedItems.clear();
        this.bulkMode = false;
        document.getElementById('detail-screen').classList.remove('active');
        document.getElementById('overview-screen').classList.add('active');
        this.renderOverview();
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

    renderDetail() {
        if (!this.currentCategory) return;

        const metadata = this.categoryMetadata[this.currentCategory] || { icon: '📋', name: this.currentCategory };
        const titleEl = document.getElementById('detail-title');
        if (titleEl) titleEl.textContent = `${metadata.icon} ${metadata.name}`;

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

                html += `
                    <div class="item ${hasMetadata ? 'has-metadata' : ''} ${isSelected ? 'selected' : ''}" 
                         data-item-id="${item.id}">
                        ${this.bulkMode ? `
                            <div class="item-checkbox-bulk" onclick="app.toggleItemSelection(${item.id})">
                                ${isSelected ? '✓' : ''}
                            </div>
                        ` : ''}
                        <div class="item-checkbox" onclick="app.toggleItem(${actualIndex})"></div>
                        <div class="item-content">
                            <div class="item-text">${this.escapeHtml(item.text)}</div>
                            ${item.description ? `<div class="item-description">${this.escapeHtml(item.description)}</div>` : ''}
                            ${item.tags ? `<div class="item-tags">${item.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}</div>` : ''}
                            ${item.link ? `<a href="${this.escapeHtml(item.link)}" target="_blank" class="item-link" onclick="event.stopPropagation()">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                                </svg>
                                ${this.escapeHtml(new URL(item.link).hostname)}
                            </a>` : ''}
                        </div>
                        ${!this.bulkMode ? `
                            <div class="item-actions">
                                <button onclick="app.showAddToCollectionModal(${actualIndex})" 
                                        title="Add to collection"
                                        aria-label="Add to collection">📁</button>
                                <button onclick="app.deleteItem(${actualIndex})" 
                                        title="Delete"
                                        aria-label="Delete item">🗑️</button>
                            </div>
                        ` : ''}
                    </div>
                `;
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
                            ${item.link ? `<a href="${this.escapeHtml(item.link)}" target="_blank" class="item-link" onclick="event.stopPropagation()">
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

    renderDetailCollections() {
        const collectionsElement = document.getElementById('detail-collections');
        if (!collectionsElement) return;

        const collections = this.collections[this.currentCategory] || [];

        if (collections.length === 0) {
            collectionsElement.innerHTML = '<div class="empty-state">No collections yet</div>';
            return;
        }

        // Separate digest collections from regular collections
        const digestCollections = collections.filter(c => c.digest);
        const regularCollections = collections.filter(c => !c.digest);

        // Sort digest collections by last updated (newest first)
        digestCollections.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));

        // Combine: digest first, then regular
        const sortedCollections = [...digestCollections, ...regularCollections];

        collectionsElement.innerHTML = sortedCollections.map((collection, collectionIndex) => {
            const actualIndex = collections.indexOf(collection);
            const isDigest = collection.digest;
            const lastUpdated = collection.lastUpdated ? this.rssParser.formatRelativeTime(new Date(collection.lastUpdated).toISOString()) : null;
            
            return `
            <div class="collection ${collection.expanded ? 'expanded' : ''} ${collection.curated ? 'curated' : 'imported'} ${isDigest ? 'digest' : ''}" data-collection-id="${collection.id}">
                <div class="collection-header">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                        <button class="collection-toggle" onclick="app.toggleCollection(${actualIndex})" aria-label="Toggle collection">▸</button>
                        <span class="collection-name">
                            ${isDigest ? '<span class="badge-digest">📰</span>' : ''}
                            ${collection.curated ? '<span class="badge-curated">★</span>' : ''}
                            ${this.escapeHtml(collection.name)}
                            ${isDigest ? '<span class="badge-live">LIVE</span>' : ''}
                        </span>
                        ${lastUpdated ? `<span class="collection-updated">Updated ${lastUpdated}</span>` : ''}
                    </div>
                    <div class="collection-actions">
                        <span style="color: var(--text-secondary); font-size: 0.85em;">${collection.items.length}</span>
                        ${isDigest ? `<button class="refresh-btn" onclick="app.refreshDigest(${actualIndex})" title="Refresh feed" aria-label="Refresh feed">↻</button>` : ''}
                        <button onclick="app.deleteCollection(${actualIndex})" title="Delete" aria-label="Delete collection">🗑️</button>
                    </div>
                </div>
                <div class="collection-items">
                    ${collection.items.length === 0 ?
                        '<div class="empty-state" style="padding: 20px;">Empty collection</div>' :
                        collection.items.map((item, itemIndex) => {
                            const hasMetadata = item.description || item.link || item.pubDate || item.source;
                            const itemDate = item.pubDate ? this.rssParser.formatRelativeTime(item.pubDate) : null;
                            
                            return `
                                <div class="collection-item ${hasMetadata ? 'has-metadata' : ''}">
                                    <div class="collection-item-content">
                                        <div class="collection-item-text">${this.escapeHtml(item.text)}</div>
                                        ${item.description ? `<div class="collection-item-description">${this.escapeHtml(item.description)}</div>` : ''}
                                        <div class="collection-item-meta">
                                            ${item.source ? `<span class="item-source">from ${this.escapeHtml(item.source)}</span>` : ''}
                                            ${itemDate ? `<span class="item-date">${itemDate}</span>` : ''}
                                            ${item.link ? `<a href="${this.escapeHtml(item.link)}" target="_blank" class="collection-item-link" onclick="event.stopPropagation()">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                                                </svg>
                                                ${this.escapeHtml(new URL(item.link).hostname)}
                                            </a>` : ''}
                                        </div>
                                    </div>
                                    <div class="collection-item-actions">
                                        <button class="add-to-main-btn" onclick="app.addCollectionItemToMain(${actualIndex}, ${itemIndex})">Add</button>
                                        <button onclick="app.deleteCollectionItem(${actualIndex}, ${itemIndex})">×</button>
                                    </div>
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
        const modalBody = document.getElementById('modal-body');

        modalBody.innerHTML = `
            <h2>New Item</h2>
            <p style="color: var(--text-secondary); font-size: 0.85em; margin-bottom: 12px;">
                Try natural language: "Read 'The Creative Act' by Rick Rubin"
            </p>
            <input type="text" id="item-input" placeholder="Title or natural language..." autofocus>
            <textarea id="item-description" placeholder="Description (optional)" rows="2"></textarea>
            <input type="url" id="item-link" placeholder="Link (optional - metadata will be auto-extracted)">
            <div class="modal-buttons">
                <button class="secondary" onclick="app.closeModal()">Cancel</button>
                <button onclick="app.addItem()">Add</button>
            </div>
        `;

        modal.style.display = 'block';

        const input = document.getElementById('item-input');
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.addItem();
            }
        });

        // Auto-detect if it's natural language
        input.addEventListener('blur', async () => {
            const text = input.value.trim();
            if (text && text.length > 10 && !document.getElementById('item-link').value) {
                const parsed = await this.aiFeatures.parseNaturalLanguage(text);
                if (parsed.title && parsed.title !== text) {
                    input.value = parsed.title;
                    if (parsed.description) {
                        document.getElementById('item-description').value = parsed.description;
                    }
                    if (parsed.link) {
                        document.getElementById('item-link').value = parsed.link;
                    }
                }
            }
        });
    }

    async addItem() {
        const input = document.getElementById('item-input');
        const descriptionInput = document.getElementById('item-description');
        const linkInput = document.getElementById('item-link');

        const text = input.value.trim();
        let description = descriptionInput?.value.trim();
        let link = linkInput?.value.trim();

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
            this.showNotification('Item added', 'success');

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
            this.showNotification('Item added', 'success');
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
        this.showNotification(this.bulkMode ? 'Bulk mode enabled' : 'Bulk mode disabled', 'info');
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
            this.showNotification('Items deleted', 'success');
        }
    }

    deleteItem(index) {
        if (confirm('Delete this item?')) {
            this.items[this.currentCategory].splice(index, 1);
            this.saveState();
            this.storage.save('items', this.items);
            this.renderDetail();
            this.updateCategoryCounts();
            this.showNotification('Item deleted', 'success');
        }
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
                this.showNotification('Duplicates merged', 'success');
            }
        }
    }

    // [Continue with remaining methods - Collections, Import, Export, etc.]
    // Keeping methods from original but enhanced with error handling

    showAddToCollectionModal(itemIndex) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        const item = this.items[this.currentCategory][itemIndex];
        const collections = this.collections[this.currentCategory] || [];

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
            <h2>Add to Collection</h2>
            <p style="color: var(--text-secondary); margin-bottom: 16px;">${this.escapeHtml(item.text)}</p>
            ${collectionsHTML}
            <div class="modal-buttons">
                <button class="secondary" onclick="app.closeModal()">Cancel</button>
            </div>
        `;
        modal.style.display = 'block';
    }

    addItemToCollection(itemIndex, collectionIndex) {
        const item = this.items[this.currentCategory][itemIndex];
        const collection = this.collections[this.currentCategory][collectionIndex];
        if (!collection.items.find(i => i.id === item.id)) {
            collection.items.push({ ...item });
            this.saveState();
            this.storage.save('collections', this.collections);
            this.renderDetail();
            this.showNotification('Added to collection', 'success');
        }
        this.closeModal();
    }

    // Collections
    showImportModal() {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
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
            <h2>Import Collection</h2>
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
        `;
        modal.style.display = 'block';
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
                this.showNotification(`Imported ${items.length} items to Anygood Digest`, 'success');
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
                this.showNotification(`Imported ${items.length} items${isRSSFeed ? ' to Anygood Digest' : ''}`, 'success');
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
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <h2>New Collection</h2>
            <input type="text" id="collection-name-input" placeholder="Collection name..." autofocus>
            <div class="modal-buttons">
                <button class="secondary" onclick="app.closeModal()">Cancel</button>
                <button onclick="app.addCollection()">Create</button>
            </div>
        `;
        modal.style.display = 'block';

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
            this.showNotification('Collection created', 'success');
        }
    }

    toggleCollection(collectionIndex) {
        const collection = this.collections[this.currentCategory][collectionIndex];
        collection.expanded = !collection.expanded;
        this.storage.save('collections', this.collections);
        this.renderDetail();
    }

    deleteCollection(collectionIndex) {
        if (confirm('Delete this collection?')) {
            this.collections[this.currentCategory].splice(collectionIndex, 1);
            this.saveState();
            this.storage.save('collections', this.collections);
            this.renderDetail();
            this.showNotification('Collection deleted', 'success');
        }
    }

    deleteCollectionItem(collectionIndex, itemIndex) {
        this.collections[this.currentCategory][collectionIndex].items.splice(itemIndex, 1);
        this.saveState();
        this.storage.save('collections', this.collections);
        this.renderDetail();
    }

    addCollectionItemToMain(collectionIndex, itemIndex) {
        const collectionItem = this.collections[this.currentCategory][collectionIndex].items[itemIndex];
        if (!this.items[this.currentCategory].find(i => i.id === collectionItem.id)) {
            this.items[this.currentCategory].push({ ...collectionItem, completed: false });
            this.saveState();
            this.storage.save('items', this.items);
            this.renderDetail();
            this.updateCategoryCounts();
            this.showNotification('Item added to list', 'success');
        }
    }

    // Export & Share
    showExportModal() {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <h2>Export & Share</h2>
            <p style="color: var(--text-secondary); font-size: 0.9em; margin-bottom: 20px;">Share your ${this.currentCategory} list with others</p>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <button onclick="app.exportAsJSON()" style="justify-content: center;">📥 Download as JSON</button>
                <button onclick="app.generateShareLink()" style="justify-content: center;">🔗 Generate Share Link</button>
                <button class="secondary" onclick="app.closeModal()">Cancel</button>
            </div>
            <div id="share-output" style="margin-top: 16px;"></div>
        `;
        modal.style.display = 'block';
    }

    exportAsJSON() {
        const exportData = this.storage.exportData();
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `anygood-${this.currentCategory}-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        const output = document.getElementById('share-output');
        if (output) output.innerHTML = '<p style="color: var(--accent-blue); font-size: 0.9em;">✓ Downloaded successfully!</p>';
    }

    generateShareLink() {
        const shareData = {
            category: this.currentCategory,
            items: this.items[this.currentCategory],
            collections: this.collections[this.currentCategory]
        };
        const encoded = btoa(JSON.stringify(shareData));
        const shareUrl = `${window.location.origin}${window.location.pathname}#share=${encoded}`;
        const output = document.getElementById('share-output');
        if (output) {
            output.innerHTML = `
                <div style="background: var(--bg-primary); padding: 12px; border-radius: var(--radius-sm); margin-top: 12px;">
                    <p style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 8px;">Share this link:</p>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" value="${shareUrl}" readonly style="flex: 1; font-size: 0.8em; padding: 8px;" id="share-url-input">
                        <button onclick="app.copyShareLink()" style="padding: 8px 16px; font-size: 0.85em;">Copy</button>
                    </div>
                </div>
            `;
        }
    }

    copyShareLink() {
        const input = document.getElementById('share-url-input');
        if (input) {
            input.select();
            document.execCommand('copy');
            const output = document.getElementById('share-output');
            if (output) output.innerHTML += '<p style="color: var(--accent-blue); font-size: 0.9em; margin-top: 8px;">✓ Link copied!</p>';
        }
    }

    checkForSharedData() {
        const hash = window.location.hash;
        if (hash.startsWith('#share=')) {
            try {
                const encoded = hash.substring(7);
                const decoded = JSON.parse(atob(encoded));
                if (decoded.category && decoded.items) {
                    setTimeout(() => {
                        if (confirm(`Import shared ${decoded.category} list with ${decoded.items.length} items?`)) {
                            this.importSharedData(decoded);
                        }
                        window.location.hash = '';
                    }, 500);
                }
            } catch (error) {
                console.error('Error parsing shared data:', error);
                this.showNotification('Invalid share link', 'error');
            }
        }
    }

    importSharedData(sharedData) {
        const category = sharedData.category;
        const existingTexts = new Set(this.items[category].map(i => i.text));
        let imported = 0;

        sharedData.items.forEach(item => {
            if (!existingTexts.has(item.text)) {
                this.items[category].push({
                    ...item,
                    id: Date.now() + Math.random(),
                    completed: false
                });
                imported++;
            }
        });

        if (sharedData.collections && sharedData.collections.length > 0) {
            sharedData.collections.forEach(collection => {
                this.collections[category].push({
                    ...collection,
                    id: Date.now() + Math.random(),
                    imported: true
                });
            });
        }

        this.saveState();
        this.storage.save('items', this.items);
        this.storage.save('collections', this.collections);
        this.updateCategoryCounts();
        this.openCategory(category);
        this.showNotification(`Imported ${imported} items`, 'success');
    }

    // Quick Add from Main View
    async quickAddFromMain() {
        const input = document.getElementById('quick-add-input');
        if (!input) return;

        const text = input.value.trim();
        if (!text) return;

        try {
            this.showLoading('Processing...');
            
            // Parse natural language
            const parsed = await this.aiFeatures.parseNaturalLanguage(text);
            
            // Determine category
            let category = parsed.category;
            if (!category) {
                // Auto-categorize
                category = await this.aiFeatures.autoCategorize({ text: parsed.title || text });
            }

            // Ensure category exists
            if (!this.categories.includes(category)) {
                // Create category if it doesn't exist
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
                // Extract metadata in background
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

            // Clear input
            input.value = '';
            input.focus();

            this.hideLoading();
            this.showNotification(`✓ Added to ${this.categoryMetadata[category]?.name || category}`, 'success');

        } catch (error) {
            this.hideLoading();
            this.showNotification(`Error: ${error.message}`, 'error');
            console.error('Quick add error:', error);
        }
    }

    // Category Management
    showAddCategoryModal() {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');

        modalBody.innerHTML = `
            <h2>Create New Category</h2>
            <input type="text" id="category-name-input" placeholder="Category name..." autofocus>
            <div style="margin-top: 12px;">
                <label style="display: block; margin-bottom: 6px; color: var(--text-secondary); font-size: 0.85em;">Icon (emoji):</label>
                <input type="text" id="category-icon-input" placeholder="📋" maxlength="2" style="font-size: 24px; text-align: center;">
            </div>
            <div class="modal-buttons">
                <button class="secondary" onclick="app.closeModal()">Cancel</button>
                <button onclick="app.addCategory()">Create</button>
            </div>
        `;

        modal.style.display = 'block';

        const nameInput = document.getElementById('category-name-input');
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addCategory();
        });
    }

    addCategory() {
        const nameInput = document.getElementById('category-name-input');
        const iconInput = document.getElementById('category-icon-input');
        
        const name = nameInput.value.trim();
        const icon = iconInput.value.trim() || '📋';

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
        this.showNotification(`Category "${name}" created`, 'success');
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
        this.showNotification('Category deleted', 'success');
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
                    this.showNotification(`Added ${newItems.length} new items`, 'success');
                } else {
                    this.showNotification('No new items found', 'info');
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

    // Utilities
    closeModal() {
        document.getElementById('modal').style.display = 'none';
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app
const app = new AnygoodApp();
