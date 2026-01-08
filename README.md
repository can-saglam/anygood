# anygood

A curated todo app for East London creatives.

## Development

Install dependencies:
```bash
npm install
```

Run the app:
```bash
npm start
```

## Building

Package for macOS:
```bash
npm run package:mac
```

This will create a `.app` file in the `dist` folder that you can drag to your Applications folder.

## Menu Bar Icon

You'll need to create a menu bar icon:
- Place a 22x22px PNG icon at `assets/IconTemplate.png`
- For Retina displays, also create `assets/IconTemplate@2x.png` (44x44px)
- The icon should be black with transparency (macOS will automatically adjust it)

## Features

- Lives in your macOS menu bar
- Quick access with a single click
- Persistent data storage
- Native macOS look and feel
