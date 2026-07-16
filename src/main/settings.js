/*
 * Author: Nsamba Ali (alinsamba@outlook.com)
 * Copyright (c) 2026 Nsamba Ali. All rights reserved.
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const state = require('./state');

const settingsPath = path.join(app.getPath('userData'), 'settings.json');
const defaultSites = [
  { id: 'nav-spotify', url: 'https://open.spotify.com', name: 'Spotify', svg: '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.24 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.239.54-.959.72-1.56.3z"/></svg>' },
  { id: 'nav-yt', url: 'https://www.youtube.com', name: 'YouTube', svg: '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>' },
  { id: 'nav-ytm', url: 'https://music.youtube.com', name: 'YouTube Music', svg: '<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>' },
  { id: 'nav-genius', url: 'https://genius.com', name: 'Genius', svg: '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><rect width="24" height="24" rx="4" fill="currentColor" fill-opacity="0.1"/><text x="50%" y="52%" dominant-baseline="central" text-anchor="middle" font-weight="800" font-size="18" fill="currentColor">G</text></svg>' }
];

async function loadSettings() {
  let loaded = { extensions: [], sites: defaultSites, adBlockEnabled: true, pinnedExtensions: [], volume: 1.0, adblockRules: [], theme: 'pitch-black' };
  try {
    try {
      await fs.promises.access(settingsPath);
      const data = await fs.promises.readFile(settingsPath, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed.extensions) loaded.extensions = parsed.extensions;
      if (parsed.sites) loaded.sites = parsed.sites;
      if (parsed.adBlockEnabled !== undefined) loaded.adBlockEnabled = parsed.adBlockEnabled;
      if (parsed.pinnedExtensions) loaded.pinnedExtensions = parsed.pinnedExtensions;
      if (parsed.volume !== undefined) loaded.volume = parsed.volume;
      if (parsed.adblockRules !== undefined) loaded.adblockRules = parsed.adblockRules;
      if (parsed.theme !== undefined) loaded.theme = parsed.theme;
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  } catch(e) {
    console.error('Error loading settings', e);
  }
  
  state.settings = loaded;
  state.appVolume = loaded.volume !== undefined ? loaded.volume : 1.0;
  return loaded;
}

let saveTimeout = null;

async function saveSettings(settings) {
  state.settings = settings;
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    saveTimeout = null;
  }, 500);
}

module.exports = { loadSettings, saveSettings, defaultSites };
