# 🚀 Quick Start Guide - Running anygood

## Super Simple Version (3 Steps)

### 1️⃣ Open Terminal
- **Mac**: Press `Cmd + Space`, type "Terminal", press Enter
- **Windows**: Press `Win + R`, type "cmd", press Enter
- **Linux**: Press `Ctrl + Alt + T`

### 2️⃣ Go to Project Folder
Type this (replace with your actual folder path):
```bash
cd /workspace
```
Or if the project is somewhere else, use that path instead.

### 3️⃣ Run the App
Type this and press Enter:
```bash
npm start
```

**That's it!** A window should open with the app. 🎉

---

## What You'll See

When you run `npm start`:
- ✅ A desktop window opens (this is your app!)
- ✅ You'll see 5 categories: Read, Listen, Watch, Eat, Do
- ✅ Click any category to see items
- ✅ On Mac, you might also see a menu bar icon (top right)

---

## First Time Setup (Only Once)

If you get an error saying "Cannot find module", run this first:
```bash
npm install
```

Wait for it to finish (might take 1-2 minutes), then try `npm start` again.

---

## Try These Features

1. **Search**: Press `Cmd+K` (Mac) or `Ctrl+K` (Windows)
2. **Add Item**: Click the `+` button, try typing: "Read 'The Creative Act' by Rick Rubin"
3. **Dark Mode**: Should automatically match your computer's theme
4. **Bulk Select**: Click the checkbox button next to search, then select multiple items

---

## Common Issues

### ❌ "npm: command not found"
**Solution**: Install Node.js from https://nodejs.org/ (download the LTS version)

### ❌ "Cannot find module"
**Solution**: Run `npm install` first, then `npm start`

### ❌ Window doesn't open
**Solution**: Check the terminal for error messages - they'll tell you what's wrong

### ❌ Nothing happens
**Solution**: 
- Make sure you're in the right folder (should have `package.json` file)
- Try `npm install` again
- Check terminal for errors

---

## What Each Command Does

| Command | What It Does |
|---------|--------------|
| `npm install` | Downloads required software (do this first if needed) |
| `npm start` | Opens the app in a window |
| `npm run package:mac` | Creates an installable app file (advanced) |

---

## Need More Help?

Check `HOW_TO_RUN.md` for detailed instructions.
