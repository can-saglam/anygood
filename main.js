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

  // Global keyboard shortcut: Cmd+Shift+A to open Anygood
  // Note: On macOS, this may require accessibility permissions
  const { globalShortcut, app } = require('electron');
  
  const registerShortcut = () => {
    // Use platform-specific shortcut (Command+Shift+A on macOS, Ctrl+Shift+A elsewhere)
    const shortcut = process.platform === 'darwin' ? 'Command+Shift+A' : 'CommandOrControl+Shift+A';
    // Try to unregister first in case it's already registered
    globalShortcut.unregister(shortcut);
    globalShortcut.unregister('CommandOrControl+Shift+A'); // Also unregister generic version
    globalShortcut.unregister('Command+A'); // Unregister old shortcut
    globalShortcut.unregister('CommandOrControl+A'); // Also unregister old generic version
    
    const registered = globalShortcut.register(shortcut, () => {
      console.log('Cmd+Shift+A pressed - toggling Anygood');
      if (mb.window && mb.window.isVisible()) {
        mb.hideWindow();
      } else {
        mb.showWindow();
        if (mb.window) {
          mb.window.focus();
          // Send message to focus input field with delay to ensure DOM is ready
          setTimeout(() => {
            if (mb.window && !mb.window.isDestroyed()) {
              mb.window.webContents.send('focus-quick-add');
            }
          }, 300);
        }
      }
    });
    
    if (!registered) {
      console.log('Failed to register Cmd+Shift+A shortcut. It may be in use by another app.');
      console.log('Note: On macOS, you may need to grant accessibility permissions.');
    } else {
      console.log('Cmd+Shift+A shortcut registered successfully');
    }
  };

  // Register immediately and also after app is ready
  registerShortcut();
  
  // Also try registering after a delay (sometimes helps on macOS)
  setTimeout(registerShortcut, 500);
  setTimeout(registerShortcut, 2000);

  // Optional: Add a context menu for right-click
  const { Menu } = require('electron');
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Anygood',
      accelerator: 'CommandOrControl+Shift+A',
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
    // Use longer delay to ensure DOM is ready
    setTimeout(() => {
      if (mb.window && !mb.window.isDestroyed()) {
        mb.window.webContents.send('focus-quick-add');
      }
    }, 300);
  });
  
  // Also focus when window gains focus
  mb.window.on('focus', () => {
    setTimeout(() => {
      if (mb.window && !mb.window.isDestroyed()) {
        mb.window.webContents.send('focus-quick-add');
      }
    }, 200);
  });
});

// Handle window show event from menubar
mb.on('show', () => {
  setTimeout(() => {
    if (mb.window && !mb.window.isDestroyed()) {
      mb.window.webContents.send('focus-quick-add');
    }
  }, 300);
});

// Handle app activation (macOS)
mb.app.on('activate', () => {
  mb.showWindow();
});
