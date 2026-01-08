const { menubar } = require('menubar');
const path = require('path');

const mb = menubar({
  index: `file://${path.join(__dirname, 'index.html')}`,
  icon: path.join(__dirname, 'assets', 'IconTemplate.png'),
  browserWindow: {
    width: 420,
    height: 680,
    minWidth: 380,
    minHeight: 500,
    maxWidth: 500,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      // Allow localStorage to work
      partition: 'persist:anygood'
    },
    // Make it look more native
    transparent: false,
    frame: false,
    hasShadow: true,
    vibrancy: 'popover'
  },
  preloadWindow: true,
  showDockIcon: false,
  tooltip: 'anygood'
});

mb.on('ready', () => {
  console.log('anygood is ready in menu bar');

  // Optional: Add a context menu for right-click
  const { Menu } = require('electron');
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Refresh',
      click: () => {
        mb.window.reload();
      }
    },
    {
      label: 'Quit',
      click: () => {
        mb.app.quit();
      }
    }
  ]);

  mb.tray.on('right-click', () => {
    mb.tray.popUpContextMenu(contextMenu);
  });
});

mb.on('after-create-window', () => {
  // Open DevTools in development (comment out for production)
  // mb.window.webContents.openDevTools({ mode: 'detach' });
});

// Handle app activation (macOS)
mb.app.on('activate', () => {
  mb.showWindow();
});
