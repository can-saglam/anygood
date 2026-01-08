# 📱 How to Run anygood Electron App

## ⚡ Quick Start (Copy & Paste These Commands)

### Step 1: Install Dependencies (First Time Only)
```bash
npm install
```
⏱️ Wait 1-2 minutes for packages to download

### Step 2: Run the App
```bash
npm start
```
🎉 A window will open with your app!

---

## 📖 Detailed Explanation

### What is Electron?
Electron is a tool that turns websites into desktop apps. Your app runs in a special browser window that looks like a native app.

### What You Need
- **Node.js** installed (download from https://nodejs.org/ if you don't have it)
- A terminal/command prompt
- This project folder

### Step-by-Step

#### 1. Open Terminal
- **Mac**: `Cmd + Space` → type "Terminal" → Enter
- **Windows**: `Win + R` → type "cmd" → Enter  
- **Linux**: `Ctrl + Alt + T`

#### 2. Navigate to Project
```bash
cd /path/to/anygood
```
*(Replace with your actual folder path)*

#### 3. Install (First Time Only)
```bash
npm install
```
This downloads Electron and other required packages. You'll see:
- Progress bars
- A `node_modules` folder being created
- "added X packages" message when done

#### 4. Run the App
```bash
npm start
```

**What happens:**
- ✅ Electron window opens
- ✅ You see the app interface
- ✅ On Mac: Menu bar icon appears (top right)
- ✅ Ready to use!

---

## 🎮 Using the App

### Basic Navigation
- **Click categories** (Read, Listen, Watch, Eat, Do) to view items
- **Click + button** to add new items
- **Click checkbox** to mark items complete

### Keyboard Shortcuts
- `Cmd/Ctrl + K` → Search
- `Cmd/Ctrl + N` → New item
- `Cmd/Ctrl + Z` → Undo
- `Cmd/Ctrl + Shift + Z` → Redo
- `ESC` → Close dialogs

### Try AI Features
1. Click **+** to add item
2. Type: **"Read 'The Creative Act' by Rick Rubin"**
3. The AI will extract: title, author, and suggest category!

### Other Features
- **Search**: Type in search bar or press `Cmd+K`
- **Bulk Mode**: Click checkbox button next to search
- **Dark Mode**: Automatically matches your system theme
- **Metadata**: Paste URLs when adding items - auto-extracts info!

---

## 🐛 Troubleshooting

### Problem: "npm: command not found"
**Solution**: 
1. Install Node.js from https://nodejs.org/
2. Download the "LTS" version
3. Install it
4. Restart terminal
5. Try again

### Problem: "Cannot find module"
**Solution**:
```bash
npm install
```
Then try `npm start` again

### Problem: Window doesn't open
**Solution**:
1. Check terminal for error messages
2. Make sure you're in the project folder
3. Try `npm install` again
4. Make sure no other app is blocking

### Problem: Menu bar icon doesn't show (Mac)
**Solution**: 
- This is normal when running from terminal
- The window should still work
- Icon appears when you package the app properly

### Problem: App looks broken
**Solution**:
1. Close the app
2. Delete `node_modules` folder
3. Run `npm install` again
4. Run `npm start`

---

## 📦 Create Installable App (Optional)

### For macOS:
```bash
npm run package:mac
```
Creates `dist/anygood.app` - drag to Applications folder!

### For Windows/Linux:
```bash
npm run package
```
Creates installable files in `dist/` folder

---

## 📁 Project Structure

```
anygood/
├── index.html          # Main app page
├── script.js           # Main app code
├── styles.css          # Styling
├── main.js             # Electron setup
├── package.json        # App configuration
└── js/                 # Module files
    ├── storage-manager.js
    ├── rss-parser.js
    ├── ai-features.js
    └── ... (other modules)
```

---

## ✅ Checklist

Before running, make sure:
- [ ] Node.js is installed (`node --version` should work)
- [ ] You're in the project folder
- [ ] You've run `npm install` at least once
- [ ] No error messages in terminal

---

## 🆘 Still Stuck?

1. **Check terminal output** - error messages tell you what's wrong
2. **Verify Node.js**: Run `node --version` - should show a version number
3. **Verify npm**: Run `npm --version` - should show a version number
4. **Check folder**: Make sure `package.json` exists in your current folder

---

## 🎯 What Success Looks Like

When everything works:
- ✅ Terminal shows: `> electron .`
- ✅ A window opens automatically
- ✅ You see the "anygood" app with 5 categories
- ✅ You can click around and everything works
- ✅ No error messages in terminal

---

**That's it! You're ready to use your app.** 🚀

For more details, see `HOW_TO_RUN.md` or `START_HERE.md`
