# How to Run anygood as an Electron App (Beginner Guide)

## What is Electron?
Electron lets you run web apps (HTML/CSS/JavaScript) as a desktop application. Think of it like a special browser that wraps your website into an app you can install on your computer.

## Step-by-Step Instructions

### Step 1: Install Dependencies
First, you need to install the required packages. Open your terminal/command prompt in the project folder and run:

```bash
npm install
```

This downloads Electron and other required packages. It might take a minute or two.

**What you'll see:**
- A progress bar showing packages being downloaded
- When it's done, you'll see a `node_modules` folder created

### Step 2: Run the App
Once dependencies are installed, run:

```bash
npm start
```

**What will happen:**
- A window will open (this is your Electron app!)
- On macOS, you might also see an icon in your menu bar (top right)
- The app will look like a native desktop application

### Step 3: Using the App

#### On macOS:
- **Menu Bar Icon**: Click the icon in your menu bar (top right) to open/close the app window
- **Window**: The app window will open showing the category grid

#### On Windows/Linux:
- **Window Only**: The app will open in a regular window (no menu bar icon)

### Step 4: Try the Features

1. **Click a category** (Read, Listen, Watch, Eat, Do) to see items
2. **Press Cmd+K** (Mac) or **Ctrl+K** (Windows/Linux) to search
3. **Click the + button** to add a new item
4. **Try natural language**: When adding, type something like "Read 'The Creative Act' by Rick Rubin"
5. **Dark mode**: Should automatically match your system theme

### Troubleshooting

#### "npm: command not found"
- You need to install Node.js first
- Download from: https://nodejs.org/
- Install it, then try again

#### "Error: Cannot find module"
- Run `npm install` again
- Make sure you're in the project folder

#### App window doesn't open
- Check the terminal for error messages
- Make sure no other app is using port 8000
- Try closing and reopening the terminal

#### Menu bar icon doesn't appear (macOS)
- This is normal if you're running from terminal
- The window should still open
- When you package the app (see below), the menu bar icon will work properly

### Advanced: Package as a Real App

To create an installable app file:

**On macOS:**
```bash
npm run package:mac
```

This creates a `.app` file in the `dist` folder that you can drag to your Applications folder.

**On Windows/Linux:**
```bash
npm run package
```

### Quick Reference

| Command | What it does |
|---------|-------------|
| `npm install` | Install required packages (do this first!) |
| `npm start` | Run the app |
| `npm run package:mac` | Create installable app (macOS) |
| `npm run package` | Create installable app (Windows/Linux) |

### Keyboard Shortcuts in the App

- **Cmd/Ctrl + K**: Open search
- **Cmd/Ctrl + N**: Add new item
- **Cmd/Ctrl + Z**: Undo
- **Cmd/Ctrl + Shift + Z**: Redo
- **ESC**: Close modal/dialog

### Need Help?

If something doesn't work:
1. Check the terminal for error messages
2. Make sure you ran `npm install` first
3. Try closing everything and starting fresh
4. Check that you're in the correct folder (should contain `package.json`)
