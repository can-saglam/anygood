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
      partition: 'persist:anygood',
      // Enable clipboard access
      clipboard: true,
      // Enable IPC for communication
      preload: path.join(__dirname, 'preload.js')
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

  // Global keyboard shortcut: Cmd+A to open Anygood
  // Note: On macOS, this may require accessibility permissions
  const { globalShortcut, app } = require('electron');
  
  const registerShortcut = () => {
    // Try to unregister first in case it's already registered
    globalShortcut.unregister('CommandOrControl+A');
    
    const registered = globalShortcut.register('CommandOrControl+A', () => {
      console.log('Cmd+A pressed - opening Anygood');
      mb.showWindow();
      if (mb.window) {
        mb.window.focus();
        // Send message to focus input field
        mb.window.webContents.send('focus-quick-add');
      }
    });
    
    if (!registered) {
      console.log('Failed to register Cmd+A shortcut. It may be in use by another app.');
      console.log('Note: On macOS, you may need to grant accessibility permissions.');
    } else {
      console.log('Cmd+A shortcut registered successfully');
    }
  };

  // Register immediately and also after app is ready
  registerShortcut();
  
  // Also try registering after a delay (sometimes helps on macOS)
  setTimeout(registerShortcut, 500);
  setTimeout(registerShortcut, 2000);

  // Optional: Add a context menu for right-click
  const { Menu, globalShortcut } = require('electron');
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Anygood',
      accelerator: 'CommandOrControl+A',
      click: () => {
        mb.showWindow();
        if (mb.window) {
          mb.window.focus();
        }
      }
    },
    {
      type: 'separator'
    },
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

  // Register global shortcut Command+A to show window
  const shortcut = process.platform === 'darwin' ? 'Command+A' : 'CommandOrControl+A';
  globalShortcut.register(shortcut, () => {
    if (mb.window && mb.window.isVisible()) {
      mb.hideWindow();
    } else {
      mb.showWindow();
    }
  });
});

// Unregister shortcuts on app quit
mb.app.on('will-quit', () => {
  const { globalShortcut } = require('electron');
  globalShortcut.unregisterAll();
});

// Unregister shortcuts on app quit
mb.app.on('will-quit', () => {
  const { globalShortcut } = require('electron');
  globalShortcut.unregisterAll();
});

mb.on('after-create-window', () => {
  // Open DevTools in development (comment out for production)
  // mb.window.webContents.openDevTools({ mode: 'detach' });
  
  // Focus input field when window is shown
  mb.window.on('show', () => {
    setTimeout(() => {
      if (mb.window && !mb.window.isDestroyed()) {
        mb.window.webContents.send('focus-quick-add');
      }
    }, 150);
  });
  
  // Also focus when window gains focus
  mb.window.on('focus', () => {
    setTimeout(() => {
      if (mb.window && !mb.window.isDestroyed()) {
        mb.window.webContents.send('focus-quick-add');
      }
    }, 150);
  });
});

// Handle window show event from menubar
mb.on('show', () => {
  setTimeout(() => {
    if (mb.window && !mb.window.isDestroyed()) {
      mb.window.webContents.send('focus-quick-add');
    }
  }, 150);
});

// Handle app activation (macOS)
mb.app.on('activate', () => {
  mb.showWindow();
});
