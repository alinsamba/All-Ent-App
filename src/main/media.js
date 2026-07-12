/*
 * Author: Nsamba Ali (alinsamba@outlook.com)
 * Copyright (c) 2026 Nsamba Ali. All rights reserved.
 */

const PLAY_PAUSE_SCRIPT = `
  (function() {
    function clickElement(el) {
      if (!el) return false;
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
      el.dispatchEvent(clickEvent);
      if (typeof el.click === 'function') el.click();
      return true;
    }

    const playButtons = [
      '[data-testid="control-button-playpause"]', // Spotify
      '.ytp-play-button',                         // YouTube
      '#play-pause-button',                       // YouTube Music
      '.play-pause-button'                        // Generic
    ];
    for (const selector of playButtons) {
      const btn = document.querySelector(selector);
      if (btn) {
        clickElement(btn);
        return 'clicked-' + selector;
      }
    }

    const media = Array.from(document.querySelectorAll('video, audio'));
    if (media.length > 0) {
      const playing = media.find(el => !el.paused);
      if (playing) {
        playing.pause();
        return 'paused';
      } else {
        media[0].play().catch((e) => { console.warn('Play blocked:', e.message); });
        return 'playing';
      }
    }
    return 'none';
  })()
`;

const NEXT_SCRIPT = `
  (function() {
    function clickElement(el) {
      if (!el) return false;
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
      el.dispatchEvent(clickEvent);
      if (typeof el.click === 'function') el.click();
      return true;
    }

    const nextButtons = [
      '[data-testid="control-button-skip-forward"]', // Spotify
      '.ytp-next-button',                            // YouTube
      '#next-button',                                // YouTube Music
      '.next-button'                                 // Generic
    ];
    for (const selector of nextButtons) {
      const btn = document.querySelector(selector);
      if (btn) {
        clickElement(btn);
        return 'next-' + selector;
      }
    }

    const media = document.querySelector('video, audio');
    if (media) {
      media.currentTime += 10;
      return 'seek-forward';
    }
    return 'none';
  })()
`;

const PREV_SCRIPT = `
  (function() {
    function clickElement(el) {
      if (!el) return false;
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
      el.dispatchEvent(clickEvent);
      if (typeof el.click === 'function') el.click();
      return true;
    }

    const prevButtons = [
      '[data-testid="control-button-skip-back"]', // Spotify
      '.ytp-prev-button',                         // YouTube
      '#previous-button',                         // YouTube Music
      '.previous-button',
      '.prev-button'                              // Generic
    ];
    for (const selector of prevButtons) {
      const btn = document.querySelector(selector);
      if (btn) {
        clickElement(btn);
        return 'prev-' + selector;
      }
    }

    const media = document.querySelector('video, audio');
    if (media) {
      media.currentTime = Math.max(0, media.currentTime - 10);
      return 'seek-backward';
    }
    return 'none';
  })()
`;

module.exports = {
  PLAY_PAUSE_SCRIPT,
  NEXT_SCRIPT,
  PREV_SCRIPT
};
