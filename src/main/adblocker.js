/*
 * Author: Nsamba Ali (alinsamba@outlook.com)
 * Copyright (c) 2026 Nsamba Ali. All rights reserved.
 */
const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch');
const { session } = require('electron');
const state = require('./state');

let appliedCustomRules = [];

function applyAdblockRules() {
  if (!state.blocker) return;
  const customRules = state.settings.adblockRules || [];

  const removedRules = appliedCustomRules.filter(r => !customRules.includes(r));

  state.blocker.updateFromDiff({
    added: [
      '@@||youtube.com^',
      '@@||music.youtube.com^',
      '@@||googlevideo.com^',
      '@@||ytimg.com^',
      '@@||ggpht.com^',
      ...customRules
    ],
    removed: removedRules
  });

  appliedCustomRules = customRules;
}

async function initAdblocker() {
  try {
    state.blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
    // Add custom exception rules to bypass blocking on YouTube domains
    applyAdblockRules();

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

module.exports = { initAdblocker, applyAdblockRules };
