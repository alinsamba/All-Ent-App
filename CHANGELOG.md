# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-12

### Added
- **Multi-Platform Support**: Added configuration for Electron Forge makers to package the app for Linux (`.deb`, `.rpm`), Windows (`.exe` via Squirrel), and macOS/Linux (`.zip`).
- **Production Assets**: Generated a multi-resolution `aea.ico` file for Windows desktop and installer usage.
- **Split-Screen & Fullscreen**: Custom split-screen interface to view two sites side-by-side with smart prevention of splitting the same site.
- **Native Extension Engine**: Direct installation of Chrome Extensions via URL or 32-character ID. Supports native context menus, popup anchors, and unpacked local extensions.
- **Persistent Volume Controls**: Volume lock overrides preventing external domains from fighting user settings, with custom sliders.
- **Adblocker**: Integrated Ghostery-powered adblocker with customized exception rules for video streaming safety.
- **Tabbed Settings UI**: Tabbed interface featuring glassmorphic design and smooth transition animations.
- **Linux Desktop Entry**: Automated generation of local `.desktop` shortcut integration.

### Changed
- **Log Management**: Wrapped verbose web-view console log forwarding in development-only flags (`!app.isPackaged`) to avoid flooding user terminals in production.
- **Package Metadata**: Standardized package information with official author info and dependencies.
