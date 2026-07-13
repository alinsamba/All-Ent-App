/*
 * Author: Nsamba Ali (alinsamba@outlook.com)
 * Copyright (c) 2026 Nsamba Ali. All rights reserved.
 */
module.exports = {
  settings: null,
  appVolume: 1.0,
  win: null,
  view: null, // Points to the active primary view (left pane in split screen)
  views: new Map(), // Map of siteId -> WebContentsView instances
  blocker: null,
  isViewHidden: false,
  isSplitMode: false,
  leftSiteId: null,
  rightSiteId: null,
  isFullscreen: false,
  isPIP: false,
  prePIPBounds: null
};
