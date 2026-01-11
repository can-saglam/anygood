// SettingsManager - User preferences and settings
class SettingsManager {
    constructor(storageManager, authService = null, syncService = null) {
        this.storage = storageManager;
        this.authService = authService;
        this.syncService = syncService;
        
        // Default settings
        this.defaultSettings = {
            theme: 'system', // 'light', 'dark', 'system'
            notifications: true,
            hapticFeedback: true,
            autoSync: false,
            version: '1.0.0'
        };
        
        // Load settings
        this.settings = this.loadSettings();
        this.currentTab = 'general';
    }

    loadSettings() {
        const saved = this.storage.load('settings');
        return saved ? { ...this.defaultSettings, ...saved } : { ...this.defaultSettings };
    }

    saveSettings() {
        this.storage.save('settings', this.settings);
    }

    // Get setting value
    get(key) {
        return this.settings[key];
    }

    // Set setting value
    set(key, value) {
        this.settings[key] = value;
        this.saveSettings();
        this.applySettings();
    }

    // Apply settings to the app
    applySettings() {
        // Theme
        if (this.settings.theme === 'dark') {
            document.documentElement.classList.add('dark-mode');
        } else if (this.settings.theme === 'light') {
            document.documentElement.classList.remove('dark-mode');
        }
        // 'system' uses the media query in setupDarkMode()
    }

    // Show settings modal
    showSettingsModal() {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modal-body');
        
        if (!modal || !modalBody) return;

        const html = `
            <div class="modal-header">
                <h2>Settings</h2>
                <button class="modal-close-btn" onclick="app.settings.closeSettingsModal()">×</button>
            </div>
            
            <div class="settings-tabs">
                <button class="settings-tab ${this.currentTab === 'general' ? 'active' : ''}" onclick="app.settings.switchTab('general')">
                    <span class="tab-icon">⚙️</span>
                    <span class="tab-label">General</span>
                </button>
                <button class="settings-tab ${this.currentTab === 'sync' ? 'active' : ''}" onclick="app.settings.switchTab('sync')">
                    <span class="tab-icon">🔄</span>
                    <span class="tab-label">Sync</span>
                </button>
                <button class="settings-tab ${this.currentTab === 'about' ? 'active' : ''}" onclick="app.settings.switchTab('about')">
                    <span class="tab-icon">ℹ️</span>
                    <span class="tab-label">About</span>
                </button>
            </div>

            <div class="settings-content">
                ${this.renderTabContent()}
            </div>
        `;

        modalBody.innerHTML = html;
        modal.style.display = 'block';
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }

    closeSettingsModal() {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300); // Match the CSS transition duration
        }
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        this.showSettingsModal(); // Re-render with new tab
    }

    renderTabContent() {
        switch (this.currentTab) {
            case 'general':
                return this.renderGeneralTab();
            case 'sync':
                return this.renderSyncTab();
            case 'about':
                return this.renderAboutTab();
            default:
                return '';
        }
    }

    renderGeneralTab() {
        const themeOptions = [
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' }
        ];

        return `
            <div class="settings-section">
                <h3 class="settings-section-title">Appearance</h3>
                
                <div class="settings-option">
                    <label for="theme-select">Theme</label>
                    <select id="theme-select" onchange="app.settings.set('theme', this.value)">
                        ${themeOptions.map(opt => `
                            <option value="${opt.value}" ${this.settings.theme === opt.value ? 'selected' : ''}>
                                ${opt.label}
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>

            <div class="settings-section">
                <h3 class="settings-section-title">Preferences</h3>
                
                <div class="settings-option">
                    <label>
                        <input type="checkbox" 
                               id="notifications-toggle"
                               ${this.settings.notifications ? 'checked' : ''}
                               onchange="app.settings.set('notifications', this.checked)">
                        Show notifications
                    </label>
                </div>

                <div class="settings-option">
                    <label>
                        <input type="checkbox" 
                               id="haptic-toggle"
                               ${this.settings.hapticFeedback ? 'checked' : ''}
                               onchange="app.settings.set('hapticFeedback', this.checked)">
                        Haptic feedback
                    </label>
                </div>
            </div>
        `;
    }

    renderSyncTab() {
        const isAuthenticated = this.authService && this.authService.isAuthenticated();
        const syncStatus = this.syncService ? this.syncService.getStatus() : null;

        if (isAuthenticated) {
            const user = this.authService.getCurrentUser();
            return `
                <div class="settings-section">
                    <h3 class="settings-section-title">Account</h3>
                    <div class="user-info">
                        <p><strong>Signed in as:</strong></p>
                        <p>${user.email}</p>
                    </div>
                    <button class="settings-button secondary" onclick="app.settings.signOut()">Sign Out</button>
                </div>

                <div class="settings-section">
                    <h3 class="settings-section-title">Sync Settings</h3>
                    
                    <div class="settings-option">
                        <label>
                            <input type="checkbox" 
                                   ${syncStatus?.autoSyncEnabled ? 'checked' : ''}
                                   onchange="app.settings.toggleAutoSync(this.checked)">
                            Auto sync
                        </label>
                    </div>

                    ${syncStatus?.lastSyncTime ? `
                        <p class="sync-status">Last synced: ${new Date(syncStatus.lastSyncTime).toLocaleString()}</p>
                    ` : ''}

                    <button class="settings-button primary" onclick="app.settings.manualSync()">Sync Now</button>
                </div>
            `;
        } else {
            return `
                <div class="settings-section">
                    <h3 class="settings-section-title">Cloud Sync</h3>
                    <p class="settings-description">
                        Sign in to sync your data across devices and back up to the cloud.
                    </p>
                    
                    <div class="auth-notice">
                        <p>⚠️ Authentication is not yet available</p>
                        <p class="settings-description-small">
                            Cloud sync and authentication features are coming soon. 
                            Your data is currently stored locally on this device.
                        </p>
                    </div>
                    
                    <button class="settings-button primary" disabled>Sign In</button>
                </div>
            `;
        }
    }

    renderAboutTab() {
        return `
            <div class="settings-section">
                <h3 class="settings-section-title">About</h3>
                <div class="about-info">
                    <div class="app-logo">
                        <h1 style="font-size: 32px; font-weight: 700; margin-bottom: 8px;">anygood</h1>
                        <p style="color: var(--text-secondary); margin-bottom: 20px;">Version ${this.settings.version}</p>
                    </div>
                    <p class="settings-description">
                        A curated todo app for East London creatives.
                    </p>
                </div>
            </div>

            <div class="settings-section">
                <h3 class="settings-section-title">Data Management</h3>
                <button class="settings-button secondary" onclick="app.settings.exportData()">
                    Export Data
                </button>
                <button class="settings-button secondary" onclick="app.settings.importData()">
                    Import Data
                </button>
            </div>

            <div class="settings-section">
                <h3 class="settings-section-title">Support</h3>
                <p class="settings-description">
                    <a href="#" onclick="event.preventDefault(); app.openExternalLink('https://github.com/anygood/anygood');" style="color: var(--accent-blue); cursor: pointer;">
                        View on GitHub
                    </a>
                </p>
            </div>
        `;
    }

    // Auth actions
    async signOut() {
        if (this.authService) {
            await this.authService.signOut();
            if (this.syncService) {
                this.syncService.stopAutoSync();
            }
            this.showSettingsModal(); // Refresh
        }
    }

    // Sync actions
    async manualSync() {
        if (this.syncService) {
            try {
                const result = await this.syncService.sync();
                if (result.success) {
                    alert('Sync complete!');
                } else {
                    alert('Sync failed: ' + result.message);
                }
            } catch (error) {
                alert('Sync error: ' + error.message);
            }
        }
    }

    toggleAutoSync(enabled) {
        if (this.syncService) {
            this.syncService.setAutoSync(enabled);
        }
    }

    // Data management
    exportData() {
        try {
            const data = {
                items: this.storage.load('items'),
                collections: this.storage.load('collections'),
                categories: this.storage.load('categories'),
                categoryMetadata: this.storage.load('categoryMetadata'),
                settings: this.settings,
                exportDate: new Date().toISOString()
            };

            const dataStr = JSON.stringify(data, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `anygood-backup-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert('Data exported successfully!');
        } catch (error) {
            alert('Export failed: ' + error.message);
        }
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    // Validate data structure
                    if (!data.items || !data.collections) {
                        throw new Error('Invalid backup file format');
                    }

                    // Confirm before overwriting
                    if (confirm('This will replace all current data. Continue?')) {
                        this.storage.save('items', data.items);
                        this.storage.save('collections', data.collections);
                        if (data.categories) this.storage.save('categories', data.categories);
                        if (data.categoryMetadata) this.storage.save('categoryMetadata', data.categoryMetadata);
                        
                        alert('Data imported successfully! Reloading...');
                        window.location.reload();
                    }
                } catch (error) {
                    alert('Import failed: ' + error.message);
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }
}
