# All Entertainment App (All Ent App)

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](CHANGELOG.md)
[![Changelog](https://img.shields.io/badge/changelog-view-orange.svg)](CHANGELOG.md)

All Entertainment App is a premium, lightweight desktop media wrapper designed to isolate, organize, and enhance your favorite entertainment platforms (such as Spotify, YouTube, YouTube Music, and Genius) into a distraction-free, native-feeling desktop experience.

By decoupling your media consumption from standard web browsers, All Ent App eliminates tab clutter, prevents accidental browser closures, and optimizes resource allocation.

---

## 🚀 Key Features

### 🖥️ Split-Screen & Fullscreen Mode
* **Native Split-Screen:** Toggle split-screen mode directly from the titlebar to run two entertainment services side-by-side (e.g., watch YouTube on the left while browsing Spotify on the right). 
* **Sidebar Fullscreen Controls:** Features an enlarged sidebar fullscreen button (`22px` icon) at the top of the sidebar.
* **Esc to Exit:** Exit fullscreen instantly at any time by pressing the `Escape` key.
* **Smart Filtering:** Prevents splitting the same site.
* **Context Preservation:** Retains active media playback on primary and secondary panels.

### 🧩 Native Chrome Extension Engine
All Ent App provides robust support for Chrome extensions to customize your media wrapper:
* **Native OS Dropdown Menu:** Clicking the puzzle icon on the top bar displays a native context menu overlay. This solves the issue of HTML overlays being obscured by the native site views.
* **Pinning & Popup windows:** Manage extensions (pin to top bar, open custom popups, or remove) natively. Standard extension popups render in borderless sub-windows automatically anchored below your controls.
* **Direct Web Store Installer:** Paste any Chrome Web Store link or 32-character extension ID (e.g., `cjpalhdlnbpafiamejdnhcphjbkeiagm` for uBlock Origin) to automatically download, unpack, and register the extension.
* **Unpacked Local Extensions:** Load local custom extension directories via a native file selector.

### ⏳ Automatic Loader Screens
* **Dynamic Event-Driven Loader:** Site loading screens are now driven by real-time `did-start-loading` and `did-stop-loading` page events.
* **Visual Transitions:** The loader automatically displays on initial loads, page navigations, or URL changes and hides smoothly once the active view is ready.

### ⚙️ Redesigned Tabbed Settings Modal
* **Premium Side-Tabbed UI:** The settings modal features a modern tabbed layout split into **Sites**, **Extensions**, and **Preferences**.
* **Glassmorphism Design:** Restructured with smooth animations, active indicators, and glassmorphic cards.

### 🛡️ Built-in Adblocker
* **Ghostery Blocker Engine:** Powered by `@ghostery/adblocker-electron`.
* **Easy Control:** Toggle the adblocker globally from the settings interface.
* **Playback Safe:** Whitelists essential YouTube playback assets to guarantee smooth, uninterrupted streaming.

### 🎛️ Persistent App-Level Volume Control
* **Host Override Prevention:** Uses JavaScript property descriptors (`Object.defineProperty`) on all video and audio elements, locking the media volume and preventing websites from fighting or modifying user-defined volume settings.
* **Global Sync:** Syncs and enforces volume settings across dynamically injected page elements and navigations.

### 🎵 Universal Media Controls
* Native play/pause, next, and previous track buttons in the titlebar. The app executes script overrides tailored for popular media players (Spotify, YouTube, YouTube Music) to control playback states globally.

### 📂 Secure Navigation and Sandbox Popups
* To keep your media space clean, any navigation to links outside the service's base domain (such as outbound advertisements or social links) are intercepted.
* Instead of overtaking your media frame, out-of-scope links open in a temporary sandbox popup window.

### ⚙️ Settings Persistence
All configurations are automatically saved to `settings.json` under Electron's `userData` directory, including:
* Custom sidebar sites and ordering.
* Installed Chrome extensions.
* Pinned extension settings.
* Adblocker toggle state.
* Global application volume level.

### 🐧 Linux Desktop Integration
* When run on Linux, the app automatically generates a desktop entry shortcut (`all-ent-app.desktop` located in `~/.local/share/applications/`) pointing to the local executable and icon (`aea.png`), allowing you to search and launch the app like any native Linux program.

---

## 🛠️ Architecture

* **[src/main.js](file:///home/aria/Documents/GeniusRip/src/main.js):** App initialization, desktop entry setup, and extension bootstrap.
* **[src/main/ipc.js](file:///home/aria/Documents/GeniusRip/src/main/ipc.js):** IPC channels managing settings, native extensions dropdown popup context menu, unpacked/webstore extension installation, extension popups, page navigation, and playback actions.
* **[src/main/window.js](file:///home/aria/Documents/GeniusRip/src/main/window.js):** Window/view setup, layout management (single vs split-screen sizes), volume override script injections, Escape key fullscreen exit, and sandboxed popup management.
* **[src/main/settings.js](file:///home/aria/Documents/GeniusRip/src/main/settings.js):** Default sites list configuration and file-backed persistence.
* **[src/main/adblocker.js](file:///home/aria/Documents/GeniusRip/src/main/adblocker.js):** Custom filter lists and Ghostery engine setup.
* **[src/preload.js](file:///home/aria/Documents/GeniusRip/src/preload.js):** Secure, isolated IPC context bridge exposing actions to the renderer.
* **[src/renderer/](file:///home/aria/Documents/GeniusRip/src/renderer/):** Glassmorphism frontend UI (`index.html`, `styles.css`, `app.js`) styling sidebar controls, loader screens, extension lists, and site configs.

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (LTS recommended) installed on your system.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/alinsamba/GeniusRip.git
   cd GeniusRip
   ```
2. Install all dependencies:
   ```bash
   npm install
   ```

### Execution
* **Launch Development Server:**
  ```bash
  npm run dev
  ```
  *(or `npm start`)*

### Packaging
Build native standalone executables for your operating system (Windows, macOS, Linux RPM/DEB):
```bash
npm run make
```

---

## 📄 License
This project is open-source and available under the [ISC License](file:///home/aria/Documents/GeniusRip/package.json#L15).
