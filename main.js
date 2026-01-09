const { menubar } = require('menubar');
const path = require('path');

// Helper function to parse HTML metadata
function parseHTMLMetadata(html, url) {
  const metadata = {
    title: null,
    description: null,
    image: null
  };

  try {
    // Extract Open Graph title (handle both attribute orders)
    let match = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    if (match) metadata.title = match[1];

    // Fallback to Twitter title
    if (!metadata.title) {
      match = html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i) ||
              html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:title["']/i);
      if (match) metadata.title = match[1];
    }

    // Fallback to standard title tag
    if (!metadata.title) {
      match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (match) metadata.title = match[1];
    }

    // Try to extract from JSON-LD structured data (YouTube uses this)
    if (!metadata.title) {
      const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
      if (jsonLdMatches) {
        for (const jsonLd of jsonLdMatches) {
          try {
            const jsonContent = jsonLd.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim();
            const data = JSON.parse(jsonContent);
            // Handle both single objects and arrays
            const items = Array.isArray(data) ? data : [data];
            for (const item of items) {
              if (item.name && !metadata.title) {
                metadata.title = item.name;
              } else if (item.headline && !metadata.title) {
                metadata.title = item.headline;
              } else if (item.title && !metadata.title) {
                metadata.title = item.title;
              }
              if (item.description && !metadata.description) {
                metadata.description = item.description;
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    // Try to extract from YouTube's ytInitialData (YouTube-specific)
    // YouTube embeds video data in a script tag with ytInitialData
    if (!metadata.title && url.includes('youtube.com')) {
      // Try multiple patterns for ytInitialData
      const patterns = [
        /var ytInitialData = ({.+?});/s,
        /window\["ytInitialData"\] = ({.+?});/s,
        /ytInitialData\s*=\s*({.+?});/s,
        /"ytInitialData":\s*({.+?})/s
      ];
      
      for (const pattern of patterns) {
        const ytDataMatch = html.match(pattern);
        if (ytDataMatch) {
          try {
            // Try to extract a reasonable chunk (first 500KB should be enough)
            let jsonStr = ytDataMatch[1];
            // Find the matching closing brace
            let braceCount = 0;
            let endPos = 0;
            for (let i = 0; i < jsonStr.length && i < 500000; i++) {
              if (jsonStr[i] === '{') braceCount++;
              if (jsonStr[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                  endPos = i + 1;
                  break;
                }
              }
            }
            if (endPos > 0) {
              jsonStr = jsonStr.substring(0, endPos);
            }
            
            const ytData = JSON.parse(jsonStr);
            
            // Try multiple paths to find the video title
            const paths = [
              () => ytData?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]?.videoPrimaryInfoRenderer?.title?.runs?.[0]?.text,
              () => ytData?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]?.videoPrimaryInfoRenderer?.title?.simpleText,
              () => ytData?.videoDetails?.title,
              () => ytData?.playerResponse?.videoDetails?.title,
              () => ytData?.microformat?.playerMicroformatRenderer?.title?.simpleText,
              () => ytData?.microformat?.microformatDataRenderer?.title?.simpleText,
              () => ytData?.metadata?.videoDetails?.title
            ];
            
            for (const getTitle of paths) {
              const title = getTitle();
              if (title) {
                metadata.title = title;
                break;
              }
            }
            
            if (metadata.title) break; // Found title, stop trying other patterns
          } catch (e) {
            // Continue to next pattern
            continue;
          }
        }
      }
    }

    // Extract Open Graph description
    match = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
    if (match) metadata.description = match[1];

    // Fallback to Twitter description
    if (!metadata.description) {
      match = html.match(/<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i) ||
              html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:description["']/i);
      if (match) metadata.description = match[1];
    }

    // Fallback to standard meta description
    if (!metadata.description) {
      match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
              html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
      if (match) metadata.description = match[1];
    }

    // Extract Open Graph image
    match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (match) metadata.image = match[1];

    // Fallback to Twitter image
    if (!metadata.image) {
      match = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
              html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
      if (match) metadata.image = match[1];
    }

    // Clean up HTML entities in title and description
    if (metadata.title) {
      metadata.title = metadata.title
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .trim();
    }

    if (metadata.description) {
      metadata.description = metadata.description
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .trim();
    }

    // If no title found, use hostname as fallback
    if (!metadata.title) {
      try {
        const urlObj = new URL(url);
        metadata.title = urlObj.hostname.replace(/^www\./, '');
      } catch (e) {
        metadata.title = 'Untitled';
      }
    }

  } catch (error) {
    console.error('HTML parsing error:', error);
  }

  return metadata;
}

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
  const { globalShortcut, app, ipcMain } = require('electron');

  // Handle haptic feedback requests
  ipcMain.on('trigger-haptic', (event, intensity) => {
    // On macOS, use audio-based haptic feedback
    // Note: NSHapticFeedbackManager doesn't work for Force Touch trackpad
    if (process.platform === 'darwin' && mb.window && !mb.window.isDestroyed()) {
      const { exec } = require('child_process');
      
      // Use system sound at very low volume for subtle tactile feedback
      const volumeMap = {
        light: '0.05',
        medium: '0.08', 
        heavy: '0.12'
      };
      const volume = volumeMap[intensity] || '0.05';
      
      // Play system sound "Tink" which creates a haptic-like click sensation
      exec(`afplay /System/Library/Sounds/Tink.aiff -v ${volume}`, (error) => {
        if (error) {
          console.log('Audio haptic feedback error:', error.message);
        }
      });
    }
  });

  // Handle URL metadata fetching requests
  ipcMain.handle('fetch-url-metadata', async (event, url) => {
    console.log('Fetching metadata for:', url);
    
    return new Promise((resolve, reject) => {
      const fs = require('fs');
      const logPath = path.join(__dirname, '.cursor', 'debug.log');
      try {
        // Validate URL
        if (!url || typeof url !== 'string') {
          resolve({ error: 'Invalid URL: URL is required' });
          return;
        }

        // For YouTube, use oEmbed API which is more reliable
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          const https = require('https');
          const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
          
          https.get(oembedUrl, { timeout: 8000 }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
              try {
                const oembed = JSON.parse(data);
                resolve({
                  title: oembed.title || null,
                  description: oembed.description || null,
                  image: oembed.thumbnail_url || null
                });
              } catch (e) {
                // Fall through to regular HTML parsing
                fetchHTMLMetadata();
              }
            });
            res.on('error', (error) => {
              // Fall through to regular HTML parsing
              fetchHTMLMetadata();
            });
          }).on('error', (error) => {
            // Fall through to regular HTML parsing
            fetchHTMLMetadata();
          });
          
          return; // Don't continue with HTML parsing for YouTube
        }
        
        // Regular HTML parsing for non-YouTube URLs (or fallback for YouTube)
        const fetchHTMLMetadata = () => {
          const urlObj = new URL(url);
          const https = require('https');
          const http = require('http');
          const protocol = urlObj.protocol === 'https:' ? https : http;

          // Set timeout for request
          const timeout = 8000; // Increased timeout

          const req = protocol.get(url, { 
          timeout,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        }, (res) => {
          console.log('Response status:', res.statusCode);
          
          // Handle redirects
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            console.log('Redirect to:', res.headers.location);
            resolve({ error: 'redirect', url: res.headers.location });
            return;
          }

          // Only process successful responses
          if (res.statusCode !== 200) {
            console.log('HTTP error:', res.statusCode);
            resolve({ error: 'HTTP error', statusCode: res.statusCode });
            return;
          }

          let html = '';
          res.setEncoding('utf8');

          // Collect data chunks
          res.on('data', (chunk) => {
            html += chunk;
            
            // For YouTube, collect more data since ytInitialData can be large
            const maxHtmlLength = url.includes('youtube.com') ? 500000 : 100000;
            
            // Stop collecting if we have enough data
            if (html.length > maxHtmlLength) {
              res.destroy();
              // Parse what we have so far
              try {
                const metadata = parseHTMLMetadata(html, url);
                console.log('Parsed metadata (truncated):', metadata);
                resolve(metadata);
              } catch (parseError) {
                console.error('Parse error:', parseError);
                resolve({ error: 'Parse error: ' + parseError.message });
              }
            }
          });

          // Parse HTML when complete
          res.on('end', () => {
            try {
              console.log('HTML received, length:', html.length);
              const metadata = parseHTMLMetadata(html, url);
              console.log('Parsed metadata:', metadata);
              resolve(metadata);
            } catch (parseError) {
              console.error('Parse error on end:', parseError);
              resolve({ error: 'Parse error: ' + parseError.message });
            }
          });

          // Handle response errors
          res.on('error', (error) => {
            console.error('Response error:', error);
            resolve({ error: 'Response error: ' + error.message });
          });
        });

        req.on('error', (error) => {
          console.error('Fetch error:', error);
          resolve({ error: 'Fetch error: ' + error.message });
        });

        req.on('timeout', () => {
          console.log('Request timeout');
          req.destroy();
          resolve({ error: 'timeout' });
        });

        // Ensure we always resolve, even if something goes wrong
        setTimeout(() => {
          if (!req.destroyed) {
            console.log('Force resolving after safety timeout');
            req.destroy();
            resolve({ error: 'Request took too long' });
          }
        }, 10000); // Safety timeout
        };
        
        // Call fetchHTMLMetadata for non-YouTube URLs
        fetchHTMLMetadata();
        
      } catch (error) {
        console.error('URL parsing error:', error);
        resolve({ error: 'URL parsing error: ' + error.message });
      }
    });
  });

  // Fallback audio feedback function
  function fallbackToAudio(intensity) {
    const { exec } = require('child_process');
    const soundMap = {
      light: 'Tink',
      medium: 'Pop',
      heavy: 'Funk'
    };
    const sound = soundMap[intensity] || 'Tink';
    exec(`afplay /System/Library/Sounds/${sound}.aiff -v 0.2`, (error) => {
      if (error) {
        console.log('Could not play audio feedback:', error.message);
      }
    });
  }
  
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
