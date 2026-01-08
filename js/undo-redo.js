// Undo/Redo Manager - Tracks state changes for undo/redo functionality
class UndoRedoManager {
    constructor(maxHistory = 50) {
        this.history = [];
        this.currentIndex = -1;
        this.maxHistory = maxHistory;
        this.isUndoing = false;
    }

    saveState(state) {
        if (this.isUndoing) return;

        // Remove any states after current index (when undoing then making new change)
        this.history = this.history.slice(0, this.currentIndex + 1);

        // Add new state
        this.history.push(JSON.parse(JSON.stringify(state)));

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.currentIndex++;
        }
    }

    undo() {
        if (this.canUndo()) {
            this.currentIndex--;
            this.isUndoing = true;
            return JSON.parse(JSON.stringify(this.history[this.currentIndex]));
        }
        return null;
    }

    redo() {
        if (this.canRedo()) {
            this.currentIndex++;
            this.isUndoing = true;
            return JSON.parse(JSON.stringify(this.history[this.currentIndex]));
        }
        return null;
    }

    canUndo() {
        return this.currentIndex > 0;
    }

    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    clear() {
        this.history = [];
        this.currentIndex = -1;
    }

    getCurrentState() {
        if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
            return JSON.parse(JSON.stringify(this.history[this.currentIndex]));
        }
        return null;
    }
}
