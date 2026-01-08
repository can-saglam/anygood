// Storage Manager - Handles all data persistence with validation and migrations
class StorageManager {
    constructor() {
        this.storagePrefix = 'anygood_';
        this.dataVersion = 2; // Increment when schema changes
    }

    save(key, data) {
        try {
            const versionedData = {
                version: this.dataVersion,
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(`${this.storagePrefix}${key}`, JSON.stringify(versionedData));
            return true;
        } catch (error) {
            console.error('Storage save error:', error);
            this.showError('Failed to save data. Storage may be full.');
            return false;
        }
    }

    load(key) {
        try {
            const stored = localStorage.getItem(`${this.storagePrefix}${key}`);
            if (!stored) return null;

            const parsed = JSON.parse(stored);
            
            // Handle migration from old format
            if (!parsed.version) {
                return this.migrateFromV1(parsed);
            }

            // Migrate if version is older
            if (parsed.version < this.dataVersion) {
                return this.migrate(parsed, parsed.version);
            }

            return parsed.data;
        } catch (error) {
            console.error('Storage load error:', error);
            return null;
        }
    }

    migrateFromV1(oldData) {
        // Migrate from version 1 (no version field) to version 2
        const migrated = {};
        if (Array.isArray(oldData)) {
            // Old format was just arrays
            return oldData;
        }
        return oldData;
    }

    migrate(data, fromVersion) {
        // Handle migrations between versions
        if (fromVersion === 1 && this.dataVersion === 2) {
            // Add any new required fields, transform data structure, etc.
            return data.data || data;
        }
        return data.data || data;
    }

    clear(key) {
        try {
            localStorage.removeItem(`${this.storagePrefix}${key}`);
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    }

    clearAll() {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.storagePrefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Storage clearAll error:', error);
            return false;
        }
    }

    exportData() {
        const exportData = {
            version: this.dataVersion,
            exportedAt: new Date().toISOString(),
            app: 'anygood',
            data: {}
        };

        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.storagePrefix)) {
                const cleanKey = key.replace(this.storagePrefix, '');
                exportData.data[cleanKey] = this.load(cleanKey);
            }
        });

        return exportData;
    }

    importData(importedData) {
        try {
            if (importedData.version && importedData.version < this.dataVersion) {
                // Migrate imported data
                Object.keys(importedData.data || importedData).forEach(key => {
                    const data = importedData.data ? importedData.data[key] : importedData[key];
                    this.save(key, data);
                });
            } else {
                Object.keys(importedData.data || importedData).forEach(key => {
                    const data = importedData.data ? importedData.data[key] : importedData[key];
                    this.save(key, data);
                });
            }
            return true;
        } catch (error) {
            console.error('Import error:', error);
            this.showError('Failed to import data. File may be corrupted.');
            return false;
        }
    }

    showError(message) {
        // Will be overridden by app instance
        console.error(message);
    }
}
