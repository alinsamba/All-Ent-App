/*
 * Author: Nsamba Ali (alinsamba@outlook.com)
 * Copyright (c) 2026 Nsamba Ali. All rights reserved.
 */
const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch');
const { session } = require('electron');
const state = require('./state');

async function initAdblocker() {
  try {
    state.blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
    // Add custom exception rules to bypass blocking on YouTube domains
    state.blocker.updateFromDiff({
      added: [
        '@@||youtube.com^',
        '@@||music.youtube.com^',
        '@@||googlevideo.com^',
        '@@||ytimg.com^',
        '@@||ggpht.com^'
      ],
      removed: []
    });
    if (state.settings.adBlockEnabled !== false) {
      state.blocker.enableBlockingInSession(session.defaultSession);
      state.blocker.enableBlockingInSession(session.fromPartition('persist:allentapp'));
      console.log('Adblocker initialized and enabled (with YouTube exceptions)');
    } else {
      console.log('Adblocker initialized but disabled by default settings');
    }
  } catch (err) {
    console.error('Failed to load adblocker:', err);
  }
}

module.exports = { initAdblocker };
