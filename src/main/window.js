/*
 * Author: Nsamba Ali (alinsamba@outlook.com)
 * Copyright (c) 2026 Nsamba Ali. All rights reserved.
 */
const { app, BrowserWindow, WebContentsView, shell, nativeImage } = require('electron');
const path = require('path');
const state = require('./state');

function injectVolume(webContents, volume) {
  webContents.executeJavaScript(`
    (function() {
      // Find all media elements (video and audio)
      const mediaElements = Array.from(document.querySelectorAll('video, audio'));
      
      // Setup a MutationObserver to observe new elements injected dynamically (like on YouTube/Spotify navigations)
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') {
              node.volume = ${volume};
              node.muted = false;
            } else if (node.querySelectorAll) {
              const children = node.querySelectorAll('video, audio');
              children.forEach(c => {
                c.volume = ${volume};
                c.muted = false;
              });
            }
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });

      // Apply to all existing media
      mediaElements.forEach(media => {
        media.volume = ${volume};
        media.muted = false;
        
        // Block websites from changing the volume back
        try {
          Object.defineProperty(media, 'volume', {
            get: function() { return ${volume}; },
            set: function(val) { console.log('Blocked site from setting volume to ' + val); }
          });
        } catch (e) {}
      });
    })()
  `).catch(err => console.error('Volume inject error:', err));
}

function pauseViewPlayback(view) {
  if (!view) return;
  view.webContents.executeJavaScript(`
    (function() {
      const media = document.querySelectorAll('video, audio');
      media.forEach(m => { try { m.pause(); } catch(e) {} });
      try {
        const spotifyPlayBtn = document.querySelector('[data-testid="control-button-playpause"]');
        if (spotifyPlayBtn && spotifyPlayBtn.getAttribute('aria-label') === 'Pause') {
          spotifyPlayBtn.click();
        }
      } catch(e) {}
      try {
        const ytPlayBtn = document.querySelector('.ytp-play-button');
        if (ytPlayBtn && ytPlayBtn.getAttribute('title') && ytPlayBtn.getAttribute('title').includes('Pause')) {
          ytPlayBtn.click();
        }
      } catch(e) {}
    })()
  `).catch(err => console.error('Error pausing playback:', err));
}

// Global shortcut handler for WebContentsViews
const handleShortcut = (event, input) => {
  if (input.type !== 'keyDown') return;

  const controlOrMeta = input.control || input.meta;

  // DevTools (F12 or Ctrl + Shift + I)
  if (input.key === 'F12' || (controlOrMeta && input.shift && input.key.toLowerCase() === 'i')) {
    event.sender.toggleDevTools();
    event.preventDefault();
    return;
  }

  // Toggle Fullscreen (F11)
  if (input.key === 'F11') {
    toggleFullscreen();
    event.preventDefault();
    return;
  }

  // Exit Fullscreen (Escape)
  if (input.key === 'Escape') {
    if (state.isFullscreen) {
      toggleFullscreen();
      event.preventDefault();
      return;
    }
  }

  // Web Browsing: Reload (F5 or Ctrl + R)
  if (input.key === 'F5' || (controlOrMeta && input.key.toLowerCase() === 'r')) {
    event.sender.reload();
    event.preventDefault();
    return;
  }

  // Web Browsing: Back (Alt + Left or Ctrl + [)
  if ((input.alt && (input.key === 'ArrowLeft' || input.key === 'Left')) || (controlOrMeta && input.key === '[')) {
    if (event.sender.canGoBack()) {
      event.sender.goBack();
    }
    event.preventDefault();
    return;
  }

  // Web Browsing: Forward (Alt + Right or Ctrl + ])
  if ((input.alt && (input.key === 'ArrowRight' || input.key === 'Right')) || (controlOrMeta && input.key === ']')) {
    if (event.sender.canGoForward()) {
      event.sender.goForward();
    }
    event.preventDefault();
    return;
  }

  // Web Browsing: Zoom In (Ctrl + = or Ctrl + +)
  if (controlOrMeta && (input.key === '=' || input.key === '+')) {
    const zoom = event.sender.getZoomLevel();
    event.sender.setZoomLevel(zoom + 0.5);
    event.preventDefault();
    return;
  }

  // Web Browsing: Zoom Out (Ctrl + -)
  if (controlOrMeta && input.key === '-') {
    const zoom = event.sender.getZoomLevel();
    event.sender.setZoomLevel(zoom - 0.5);
    event.preventDefault();
    return;
  }

  // Web Browsing: Reset Zoom (Ctrl + 0)
  if (controlOrMeta && input.key === '0') {
    event.sender.setZoomLevel(0);
    event.preventDefault();
    return;
  }

  // Media: Play/Pause (Ctrl + Space)
  if (controlOrMeta && input.key === ' ') {
    event.sender.executeJavaScript(`
      (function() {
        function clickElement(el) {
          if (!el) return false;
          const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
          el.dispatchEvent(clickEvent);
          if (typeof el.click === 'function') el.click();
          return true;
        }
        const playButtons = [
          '[data-testid="control-button-playpause"]',
          '.ytp-play-button',
          '#play-pause-button',
          '.play-pause-button'
        ];
        for (const selector of playButtons) {
          const btn = document.querySelector(selector);
          if (btn) { return clickElement(btn); }
        }
        const media = Array.from(document.querySelectorAll('video, audio'));
        if (media.length > 0) {
          const playing = media.find(el => !el.paused);
          if (playing) { playing.pause(); } else { media[0].play().catch(() => {}); }
        }
      })()
    `).catch(() => {});
    event.preventDefault();
    return;
  }

  // Media: Next Track (Ctrl + ArrowRight)
  if (controlOrMeta && (input.key === 'ArrowRight' || input.key === 'Right')) {
    event.sender.executeJavaScript(`
      (function() {
        function clickElement(el) {
          if (!el) return false;
          const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
          el.dispatchEvent(clickEvent);
          if (typeof el.click === 'function') el.click();
          return true;
        }
        const nextButtons = [
          '[data-testid="control-button-skip-forward"]',
          '.ytp-next-button',
          '#next-button',
          '.next-button'
        ];
        for (const selector of nextButtons) {
          const btn = document.querySelector(selector);
          if (btn) { return clickElement(btn); }
        }
        const media = document.querySelector('video, audio');
        if (media) { media.currentTime += 10; }
      })()
    `).catch(() => {});
    event.preventDefault();
    return;
  }

  // Media: Previous Track (Ctrl + ArrowLeft)
  if (controlOrMeta && (input.key === 'ArrowLeft' || input.key === 'Left')) {
    event.sender.executeJavaScript(`
      (function() {
        function clickElement(el) {
          if (!el) return false;
          const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
          el.dispatchEvent(clickEvent);
          if (typeof el.click === 'function') el.click();
          return true;
        }
        const prevButtons = [
          '[data-testid="control-button-skip-back"]',
          '.ytp-prev-button',
          '#prev-button',
          '.prev-button'
        ];
        for (const selector of prevButtons) {
          const btn = document.querySelector(selector);
          if (btn) { return clickElement(btn); }
        }
        const media = document.querySelector('video, audio');
        if (media) { media.currentTime -= 10; }
      })()
    `).catch(() => {});
    event.preventDefault();
    return;
  }
};

function getOrCreateSiteView(siteId, url) {
  if (state.views.has(siteId)) {
    return state.views.get(siteId);
  }

  const view = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      partition: 'persist:allentapp'
    }
  });

  view.setBackgroundColor('#070707');

  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
  view.webContents.setUserAgent(userAgent);

  const sendNav = () => {
    try {
      // Only send navigation updates for the current active view (or the left split pane)
      if (state.view && state.view.webContents === view.webContents) {
        const currentUrl = view.webContents.getURL();
        state.win.webContents.send('page-navigated', currentUrl);
      }
    } catch (err) {}
  };

  view.webContents.on('did-navigate', sendNav);
  view.webContents.on('did-navigate-in-page', sendNav);
  
  view.webContents.on('dom-ready', () => {
    injectVolume(view.webContents, state.appVolume);
  });
  
  view.webContents.on('did-start-loading', () => {
    if (state.view && state.view.webContents === view.webContents) {
      if (state.win && !state.win.isDestroyed()) {
        state.win.webContents.send('show-loader');
      }
    }
  });

  view.webContents.on('did-stop-loading', () => {
    if (state.view && state.view.webContents === view.webContents) {
      if (state.win && !state.win.isDestroyed()) {
        state.win.webContents.send('hide-loader');
      }
    }
  });

  view.webContents.on('before-input-event', handleShortcut);

  view.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (!app.isPackaged) {
      const levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR'];
      console.log(`[Browser Console - ${levels[level] || 'LOG'}] ${message} (${sourceId}:${line})`);
    }
  });

  const isAllowed = (urlStr) => {
    try {
      const parsedUrl = new URL(urlStr);
      return state.settings.sites.some(site => {
        try {
          const siteUrl = new URL(site.url);
          const baseHost = siteUrl.hostname.replace(/^www\./, '');
          return parsedUrl.hostname.includes(baseHost);
        } catch (e) {
          return false;
        }
      });
    } catch(e) {
      return false;
    }
  };

  view.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!isAllowed(navigationUrl)) {
      console.log(`[Navigation Redirect Intercepted] Opening popup: ${navigationUrl}`);
      event.preventDefault();
      openBriefPopup(navigationUrl);
    } else {
      console.log(`[Navigation Allowed] Navigating to: ${navigationUrl}`);
    }
  });

  view.webContents.setWindowOpenHandler(({ url: popupUrl }) => {
    console.log(`[Window Open Intercepted] Opening popup: ${popupUrl}`);
    openBriefPopup(popupUrl);
    return { action: 'deny' };
  });

  view.webContents.loadURL(url);
  state.views.set(siteId, view);
  return view;
}

const resizeView = () => {
  if (state.isViewHidden) return;
  try {
    const { width, height } = state.win.contentView.getBounds();

    if (state.isFullscreen) {
      if (state.isSplitMode) {
        const leftView = state.views.get(state.leftSiteId);
        const rightView = state.views.get(state.rightSiteId);
        const halfWidth = Math.floor(width / 2);
        
        if (leftView) {
          leftView.setBounds({ x: 0, y: 0, width: halfWidth, height: height });
        }
        if (rightView) {
          rightView.setBounds({ x: halfWidth, y: 0, width: width - halfWidth, height: height });
        }
      } else if (state.view) {
        state.view.setBounds({ x: 0, y: 0, width: width, height: height });
      }
    } else {
      const contentWidth = width - 68;
      const contentHeight = height - 40;

      if (state.isSplitMode) {
        const leftView = state.views.get(state.leftSiteId);
        const rightView = state.views.get(state.rightSiteId);
        const halfWidth = Math.floor(contentWidth / 2);
        
        if (leftView) {
          leftView.setBounds({ x: 68, y: 40, width: halfWidth, height: contentHeight });
        }
        if (rightView) {
          rightView.setBounds({ x: 68 + halfWidth, y: 40, width: contentWidth - halfWidth, height: contentHeight });
        }
      } else if (state.view) {
        state.view.setBounds({ x: 68, y: 40, width: contentWidth, height: contentHeight });
      }
    }
  } catch (e) {}
};

const resizeViewDelayed = () => {
  resizeView();
  setTimeout(resizeView, 50);
  setTimeout(resizeView, 150);
};

function switchAppView(url, siteId, forceNavigate = false) {
  if (!state.win) return;

  // Pause playback of the active outgoing view
  if (state.view && (!state.isSplitMode || state.leftSiteId !== siteId)) {
    pauseViewPlayback(state.view);
  }

  // Get or create the target view
  const targetView = getOrCreateSiteView(siteId, url);

  if (forceNavigate) {
    targetView.webContents.loadURL(url);
  }

  if (state.isSplitMode) {
    if (state.rightSiteId === siteId) {
      state.rightSiteId = state.leftSiteId;
    }
    
    const oldLeftView = state.views.get(state.leftSiteId);
    if (oldLeftView && oldLeftView !== targetView && state.rightSiteId !== state.leftSiteId) {
      try {
        state.win.contentView.removeChildView(oldLeftView);
      } catch (e) {
        console.error('Error removing old left view:', e);
      }
    }

    state.leftSiteId = siteId;
    state.view = targetView;

    try {
      state.win.contentView.addChildView(targetView);
    } catch (e) {}

    const currentUrl = targetView.webContents.getURL();
    state.win.webContents.send('page-navigated', currentUrl);
    
    resizeViewDelayed();
  } else {
    state.views.forEach((v, id) => {
      if (id !== siteId) {
        try {
          state.win.contentView.removeChildView(v);
        } catch (e) {}
      }
    });

    state.view = targetView;
    state.leftSiteId = siteId;

    try {
      state.win.contentView.addChildView(targetView);
    } catch (e) {}

    const currentUrl = targetView.webContents.getURL();
    state.win.webContents.send('page-navigated', currentUrl);

    resizeViewDelayed();
  }

  // Sync loader overlay based on current load state of the newly active view
  if (state.win && !state.win.isDestroyed()) {
    if (targetView.webContents.isLoading()) {
      state.win.webContents.send('show-loader');
    } else {
      state.win.webContents.send('hide-loader');
    }
  }
}

function setSplitScreenMode(rightSiteId, enable) {
  console.log(`[Split Screen] setSplitScreenMode: rightSiteId=${rightSiteId}, enable=${enable}`);
  if (!state.win || !state.leftSiteId) {
    console.log(`[Split Screen] Ignored: win=${!!state.win}, leftSiteId=${state.leftSiteId}`);
    return;
  }

  if (enable) {
    if (state.leftSiteId === rightSiteId) {
      console.log(`[Split Screen] Prevented split of same site: ${rightSiteId}`);
      return;
    }

    const rightSite = state.settings.sites.find(s => s.id === rightSiteId);
    if (!rightSite) {
      console.log(`[Split Screen] Site not found in settings: ${rightSiteId}`);
      return;
    }

    console.log(`[Split Screen] Activating split with right site ${rightSite.name} (${rightSite.url})`);
    
    const isNew = !state.views.has(rightSiteId);
    const rightView = getOrCreateSiteView(rightSiteId, rightSite.url);
    if (!isNew) {
      console.log(`[Split Screen] Reloading right-side view to base URL`);
      rightView.webContents.loadURL(rightSite.url);
    }

    state.isSplitMode = true;
    state.rightSiteId = rightSiteId;

    const leftView = state.views.get(state.leftSiteId);
    if (leftView) {
      try {
        console.log(`[Split Screen] Mounting left view: ${state.leftSiteId}`);
        state.win.contentView.addChildView(leftView);
      } catch(e) {
        console.error('[Split Screen] Error mounting left view:', e);
      }
    }
    try {
      console.log(`[Split Screen] Mounting right view: ${rightSiteId}`);
      state.win.contentView.addChildView(rightView);
    } catch(e) {
      console.error('[Split Screen] Error mounting right view:', e);
    }

    resizeViewDelayed();
  } else {
    console.log(`[Split Screen] Disabling split screen`);
    const rightView = state.views.get(state.rightSiteId);
    if (rightView) {
      console.log(`[Split Screen] Pausing and unmounting right view: ${state.rightSiteId}`);
      pauseViewPlayback(rightView);
      try { state.win.contentView.removeChildView(rightView); } catch(e) {}
    }

    state.isSplitMode = false;
    state.rightSiteId = null;

    resizeViewDelayed();
  }
}

function createWindow() {
  state.win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#070707',
    show: false,
    titleBarStyle: 'hidden',
    icon: nativeImage.createFromPath(path.join(__dirname, '..', '..', 'aea.png')),
    titleBarOverlay: {
      color: '#070707',
      symbolColor: '#ffffff',
      height: 40
    },
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, '..', 'preload.js')
    }
  });

  state.win.once('ready-to-show', () => {
    state.win.show();
  });

  state.win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  state.win.webContents.on('before-input-event', handleShortcut);

  state.win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (!app.isPackaged) {
      const levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR'];
      console.log(`[Main Window Console - ${levels[level] || 'LOG'}] ${message} (${sourceId}:${line})`);
    }
  });

  state.win.on('resize', resizeViewDelayed);
  state.win.on('maximize', resizeViewDelayed);
  state.win.on('unmaximize', resizeViewDelayed);
  state.win.on('restore', resizeViewDelayed);
  state.win.on('show', resizeViewDelayed);

  state.win.on('enter-full-screen', () => {
    state.isFullscreen = true;
    resizeViewDelayed();
    if (state.win && !state.win.isDestroyed()) {
      state.win.webContents.send('fullscreen-changed', { isFullscreen: true });
    }
  });

  state.win.on('leave-full-screen', () => {
    state.isFullscreen = false;
    resizeViewDelayed();
    if (state.win && !state.win.isDestroyed()) {
      state.win.webContents.send('fullscreen-changed', { isFullscreen: false });
    }
  });

  state.win.webContents.once('dom-ready', () => {
    if (state.settings.sites.length > 0) {
      const def = state.settings.sites[0];
      switchAppView(def.url, def.id);
    }
  });
}

function toggleFullscreen() {
  if (!state.win) return;
  state.win.setFullScreen(!state.win.isFullScreen());
}

function openBriefPopup(url) {
  const { BrowserWindow } = require('electron');
  const popup = new BrowserWindow({
    width: 1024,
    height: 700,
    parent: state.win || undefined,
    modal: false,
    backgroundColor: '#070707',
    title: 'Browse',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      partition: 'persist:allentapp'
    }
  });

  if (state.blocker) {
    try {
      state.blocker.enableBlockingInSession(popup.webContents.session);
    } catch(e) {}
  }

  popup.loadURL(url);
  popup.setMenu(null);
}

module.exports = { createWindow, injectVolume, switchAppView, setSplitScreenMode, pauseViewPlayback, openBriefPopup, toggleFullscreen };
