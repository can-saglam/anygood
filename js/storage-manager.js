// Storage Manager - Handles localStorage with validation
class StorageManager {
    constructor() {
        this.prefix = 'anygood_';
    }

    load(key) {
        try {
            const item = localStorage.getItem(this.prefix + key);
            if (item === null) return null;
            return JSON.parse(item);
        } catch (error) {
            console.error(`Error loading ${key}:`, error);
            return null;
        }
    }

    save(key, value) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error saving ${key}:`, error);
            if (this.showError) {
                this.showError(`Failed to save ${key}: ${error.message}`);
            }
            return false;
        }
    }

    exportData() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.prefix)) {
                const cleanKey = key.replace(this.prefix, '');
                data[cleanKey] = this.load(cleanKey);
            }
        }
        return data;
    }
}
