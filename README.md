# All Entertainment App (All Ent App)

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](CHANGELOG.md)
[![Changelog](https://img.shields.io/badge/changelog-view-orange.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](package.json)
[![Electron](https://img.shields.io/badge/built%20with-Electron-47848F.svg)](https://www.electronjs.org/)

> A premium, distraction-free desktop wrapper for your favourite entertainment platforms — Spotify, YouTube, YouTube Music, Genius, and more.

All Entertainment App isolates your media from the browser, eliminating tab clutter, preventing accidental closures, and giving you a native, focused media experience with powerful built-in tools.

---

## 🚀 Key Features

### 🖥️ Split-Screen & Fullscreen Mode
Run two entertainment services side-by-side with a single click from the titlebar.
* **Native Split-Screen:** e.g. YouTube on the left, Spotify on the right — simultaneously.
* **Smart Filtering:** Prevents accidentally splitting the same site into both panels.
* **Context Preservation:** Active media keeps playing when switching panels.
* **Fullscreen Controls:** Dedicated fullscreen button in the sidebar; press `Esc` at any time to exit.

### 🧩 Native Chrome Extension Engine
Full Chrome extension support without needing a browser:
* **Native OS Dropdown Menu:** The puzzle-piece icon opens a native OS-level context menu, unobscured by web content.
* **Pin & Popup:** Pin extensions to the top bar; popups render in auto-anchored borderless sub-windows.
* **Web Store Installer:** Paste a Chrome Web Store URL or 32-character ID to automatically download, unpack, and register any extension (e.g. `cjpalhdlnbpafiamejdnhcphjbkeiagm` for uBlock Origin).
* **Load Unpacked:** Load any local extension directory via a native file picker.

### 🛡️ Built-in Adblocker
* **Ghostery Engine:** Powered by `@ghostery/adblocker-electron` — industry-grade blocking.
* **One-Click Toggle:** Enable or disable globally from the Settings panel.
* **Streaming-Safe:** Custom exception rules whitelist YouTube's video delivery CDN so playback is never interrupted.

### 🎛️ Persistent App-Level Volume Control
Websites can't override your volume preference:
* **Override Lock:** Uses `Object.defineProperty` to lock `HTMLMediaElement.volume` against site scripts.
* **Global Sync:** Dynamically injected media elements on navigations and SPA route changes are caught and volume-locked instantly via a `MutationObserver`.

### 🎵 Universal Media Controls
Control playback from the titlebar regardless of which service is active:
* **Play / Pause**, **Next Track**, **Previous Track** buttons wired to platform-specific DOM selectors for Spotify, YouTube, and YouTube Music.
* Also available as **keyboard shortcuts** (see below).

### ⏳ Smart Loading Screens
* Event-driven loader triggered by real Electron `did-start-loading` / `did-stop-loading` events.
* Automatically shows on navigations and hides with a smooth fade once the page is ready.

### 📂 Secure Navigation & Sandbox Popups
* Out-of-scope links (e.g. ad redirects, social share links) are intercepted before they hijack your media view.
* Intercepted URLs open in a lightweight, sandboxed popup window, keeping your main session clean.

### ⚙️ Tabbed Settings Modal
* **Sites Tab:** Add, remove, and reorder your sidebar services; set any URL as a custom site with its own icon.
* **Extensions Tab:** Manage all installed extensions, pin/unpin, and install new ones.
* **Preferences Tab:** Toggle adblocker, adjust default volume, and more.
* All settings auto-persist to `settings.json` in Electron's `userData` directory.

### 🐧 Linux Desktop Integration
Automatically creates a `~/.local/share/applications/all-ent-app.desktop` entry and installs the app icon to `~/.local/share/icons/` on first launch — making the app searchable in your application launcher.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `F11` | Toggle Fullscreen |
| `Esc` | Exit Fullscreen |
| `F12` / `Ctrl+Shift+I` | Toggle DevTools |
| `F5` / `Ctrl+R` | Reload Active Page |
| `Alt+Left` / `Ctrl+[` | Navigate Back |
| `Alt+Right` / `Ctrl+]` | Navigate Forward |
| `Ctrl+=` / `Ctrl++` | Zoom In |
| `Ctrl+-` | Zoom Out |
| `Ctrl+0` | Reset Zoom |
| `Ctrl+Space` | Play / Pause |
| `Ctrl+ArrowRight` | Next Track |
| `Ctrl+ArrowLeft` | Previous Track |

---

## 🛠️ Architecture

```
src/
├── main.js              # App entry point — bootstraps settings, adblocker, IPC, and window
├── preload.js           # Context bridge — securely exposes IPC API to the renderer
├── main/
│   ├── ipc.js           # All IPC handlers: navigation, extensions, media, settings, split-screen
│   ├── window.js        # Window/view lifecycle, layout engine, volume injection, keyboard shortcuts
│   ├── settings.js      # Default sites, settings load/save with file persistence
│   ├── adblocker.js     # Ghostery engine init, YouTube exception rules
│   └── state.js         # Shared mutable application state
└── renderer/
    ├── index.html       # App shell — sidebar, titlebar, loader, settings modal
    ├── styles.css       # Glassmorphism design system, animations, dark theme
    └── app.js           # Renderer logic — UI events, IPC calls, settings panels
```

**Key design decisions:**
- `WebContentsView` is used (not deprecated `BrowserView` or `<webview>`) for each service panel.
- All views share a `persist:allentapp` session partition so cookies/auth is preserved across app restarts.
- The renderer never has Node.js access; all privileged operations go through the preload bridge.

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) **LTS** (v18 or later recommended)
* `npm` (bundled with Node.js)
* Linux only: `dpkg` (for `.deb`) or `rpmbuild` (for `.rpm`) for packaging

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/alinsamba/All-Ent-App.git
   cd GeniusRip
   ```

2. Install all dependencies:
   ```bash
   npm install
   ```

### Running in Development

```bash
npm run dev
# or
npm start
```

### Building for Production

**Linux (`.deb` + `.rpm` + `.zip`):**
```bash
npm run make
```

**Windows (`.exe` NSIS installer, cross-built from Linux):**
```bash
npm run build:win
```

**Linux RPM (manual, Fedora-compatible):**
```bash
bash build-rpm.sh
```

Built artifacts are placed in the `out/` (Forge) or `dist/` (electron-builder) directories.

---

## 🔒 Security

* `nodeIntegration` is disabled in all WebContentsView and popup windows.
* `contextIsolation` and `sandbox` are enabled everywhere.
* The preload script uses `contextBridge` — no direct `ipcRenderer` exposure.
* All WebContentsViews use a shared, persistent session with extensions loaded at startup.
* Out-of-scope navigations are intercepted at the `will-navigate` event level.
* Electron security fuses are configured at package time via `@electron-forge/plugin-fuses`:
  - `RunAsNode` → **disabled**
  - `EnableCookieEncryption` → **enabled**
  - `EnableEmbeddedAsarIntegrityValidation` → **enabled**
  - `OnlyLoadAppFromAsar` → **enabled**

---

## 📄 License

This project is open-source and available under the [ISC License](ISC-License).  
Copyright © 2026 [Nsamba Ali](mailto:alinsamba@outlook.com)
