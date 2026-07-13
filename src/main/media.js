/*
 * Author: Nsamba Ali (alinsamba@outlook.com)
 * Copyright (c) 2026 Nsamba Ali. All rights reserved.
 */

function playPause() {
  return `
    (function() {
      if (navigator.mediaSession && navigator.mediaSession.playbackState) {
        if (navigator.mediaSession.playbackState === 'playing') {
          // Native media session is playing, try native DOM elements to pause.
          const media = Array.from(document.querySelectorAll('video, audio'));
          const playing = media.find(el => !el.paused);
          if (playing) {
            playing.pause();
            return 'paused';
          }
        } else if (navigator.mediaSession.playbackState === 'paused') {
          const media = Array.from(document.querySelectorAll('video, audio'));
          if (media.length > 0) {
            media[0].play().catch(() => {});
            return 'playing';
          }
        }
      }

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
          media[0].play().catch(() => {});
          return 'playing';
        }
      }
      return 'none';
    })()
  `;
}

function nextTrack() {
  return `
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
}

function prevTrack() {
  return `
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
        media.currentTime -= 10;
        return 'seek-backward';
      }
      return 'none';
    })()
  `;
}

function pausePlayback() {
  return `
    (function() {
      const media = document.querySelectorAll('video, audio');
      media.forEach(m => { try { m.pause(); } catch(e) { console.error('Error pausing media:', e); } });
      try {
        const spotifyPlayBtn = document.querySelector('[data-testid="control-button-playpause"]');
        if (spotifyPlayBtn && spotifyPlayBtn.getAttribute('aria-label') === 'Pause') {
          spotifyPlayBtn.click();
        }
      } catch(e) { console.error('Error pausing Spotify:', e); }
      try {
        const ytPlayBtn = document.querySelector('.ytp-play-button');
        if (ytPlayBtn && ytPlayBtn.getAttribute('title') && ytPlayBtn.getAttribute('title').includes('Pause')) {
          ytPlayBtn.click();
        }
      } catch(e) { console.error('Error pausing YouTube:', e); }
    })()
  `;
}

module.exports = { playPause, nextTrack, prevTrack, pausePlayback };
