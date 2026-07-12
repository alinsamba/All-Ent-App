/*
 * Author: Nsamba Ali (alinsamba@outlook.com)
 * Copyright (c) 2026 Nsamba Ali. All rights reserved.
 */
let currentSettings = null;
    let currentWebstoreExtensionId = null;
    let editingSiteId = null;

    if (window.api && window.api.onPageNavigated) {
      window.api.onPageNavigated((url) => {
        // Update URL bar value
        const urlInput = document.getElementById('url-input');
        if (urlInput && document.activeElement !== urlInput) {
          urlInput.value = url;
        }

        const match = url.match(/chromewebstore\.google\.com\/detail\/[^/]+\/([a-p]{32})/);
        const btn = document.getElementById('titlebar-install-btn');
        if (btn) {
          if (match) {
            currentWebstoreExtensionId = match[1];
            btn.style.display = 'inline-flex';
          } else {
            currentWebstoreExtensionId = null;
            btn.style.display = 'none';
          }
        }
      });
    }

    function handleUrlKeydown(event) {
      if (event.key === 'Enter') {
        let val = event.target.value.trim();
        if (!val) return;
        
        // If it doesn't contain a dot or has spaces, treat it as a Google search query
        const isSearch = !val.includes('.') || val.includes(' ');
        if (isSearch) {
          val = 'https://www.google.com/search?q=' + encodeURIComponent(val);
        } else if (!val.startsWith('http')) {
          val = 'https://' + val;
        }
        
        let matchingSite = null;
        if (!isSearch) {
          try {
            const parsedUrl = new URL(val);
            matchingSite = currentSettings.sites.find(site => {
              try {
                const siteUrl = new URL(site.url);
                const baseHost = siteUrl.hostname.replace(/^www\./, '');
                return parsedUrl.hostname.includes(baseHost);
              } catch(e) {
                return false;
              }
            });
          } catch(e) {
            matchingSite = null;
          }
        }

        if (matchingSite) {
          console.log(`[URL Bar] Input matches configured site: ${matchingSite.name}. Switching tab.`);
          switchApp(val, matchingSite.id, true);
        } else {
          console.log(`[URL Bar] Input is external: ${val}. Opening in popup.`);
          if (window.api && window.api.openExternalPopup) {
            window.api.openExternalPopup(val);
          }
        }
      }
    }

    async function installCurrentWebstoreExtension() {
      if (!currentWebstoreExtensionId) return;
      const btn = document.getElementById('titlebar-install-btn');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'Installing...';
      
      try {
        const result = await window.api.installWebstoreExtension(currentWebstoreExtensionId);
        if (result.success) {
          alert(`Successfully installed extension: ${result.name}`);
          updateExtensionsList();
          renderPinnedExtensions();
        } else {
          alert(`Failed to install: ${result.error}`);
        }
      } catch (err) {
        alert(`An error occurred: ${err.message}`);
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }

    async function renderPinnedExtensions() {
      const container = document.getElementById('pinned-extensions-container-top');
      const puzzleBtn = document.getElementById('extensions-puzzle-btn-top');
      
      container.innerHTML = '';
      
      let loadedExtensions = [];
      try {
        loadedExtensions = await window.api.getLoadedExtensions();
      } catch (err) {
        console.error('Failed to get loaded extensions:', err);
      }
      
      const pinnedIds = currentSettings.pinnedExtensions || [];
      const pinnedExts = loadedExtensions.filter(ext => pinnedIds.includes(ext.id));
      
      if (loadedExtensions.length > 0) {
        puzzleBtn.style.display = 'flex';
      } else {
        puzzleBtn.style.display = 'none';
      }
      
      if (pinnedExts.length > 0) {
        container.style.display = 'flex';
        pinnedExts.forEach(ext => {
          const div = document.createElement('div');
          div.className = 'topbar-extension-icon';
          div.title = ext.name;
          div.onclick = (e) => triggerExtensionPopup(ext.id, ext.popupPath, e);
          
          if (ext.icon) {
            const img = document.createElement('img');
            img.src = ext.icon;
            img.style.width = '18px';
            img.style.height = '18px';
            img.style.borderRadius = '3px';
            img.style.objectFit = 'contain';
            div.appendChild(img);
          } else {
            div.innerHTML = `🧩`;
            div.style.fontSize = '14px';
          }
          
          container.appendChild(div);
        });
      } else {
        container.style.display = 'none';
      }
    }

    async function triggerExtensionPopup(id, popupPath, event) {
      if (!popupPath) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const anchorBounds = {
        x: window.screenX + rect.left,
        y: window.screenY + rect.top,
        width: rect.width,
        height: rect.height
      };
      await window.api.openExtensionPopup(id, popupPath, anchorBounds, 'bottom');
    }

    function toggleExtensionsMenu(event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = Math.round(window.screenX + rect.left);
      const y = Math.round(window.screenY + rect.bottom);
      
      if (window.api && window.api.showExtensionsMenu) {
        window.api.showExtensionsMenu({ x, y });
      }
    }

    if (window.api && window.api.onSettingsUpdated) {
      window.api.onSettingsUpdated((newSettings) => {
        currentSettings = newSettings;
        renderPinnedExtensions();
        updateExtensionsList();
      });
    }

    async function initApp() {
      currentSettings = await window.api.getSettings();
      
      // Dynamic titlebar padding depending on OS to fit system window controls cleanly
      const isMac = navigator.userAgent.includes('Mac');
      const isWin = navigator.userAgent.includes('Win');
      const titlebar = document.getElementById('titlebar');
      if (titlebar) {
        if (isMac) {
          titlebar.style.paddingLeft = '80px';
          titlebar.style.paddingRight = '16px';
        } else if (isWin) {
          titlebar.style.paddingRight = '145px';
        } else {
          // Linux (GNOME window control overlays are narrower, usually around ~90px-100px)
          titlebar.style.paddingRight = '95px';
        }
      }

      renderSidebar();
      renderPinnedExtensions();
      
      // Set initial loader logo to the default site (index 0) on startup
      if (currentSettings.sites && currentSettings.sites.length > 0) {
        const defaultSite = currentSettings.sites[0];
        const logoContainer = document.getElementById('loader-logo-container');
        const textContainer = document.getElementById('loader-text');
        
        if (defaultSite.icon && defaultSite.icon.startsWith('data:')) {
          logoContainer.innerHTML = `<img src="${defaultSite.icon}" alt="${defaultSite.name}">`;
        } else if (defaultSite.svg) {
          logoContainer.innerHTML = defaultSite.svg;
        }
        textContainer.textContent = `Connecting to ${defaultSite.name}...`;
      }
      
      if (currentSettings && currentSettings.sites) {
        let updated = false;
        for (const site of currentSettings.sites) {
          const isGeneric = site.svg && site.svg.includes('<text');
          if (isGeneric && !site.icon) {
            try {
              const iconData = await window.api.getSiteIcon(site.url);
              if (iconData && iconData.startsWith('data:')) {
                site.icon = iconData;
                updated = true;
                renderSidebar();
              }
            } catch (err) {
              console.error(`Failed to background fetch icon for ${site.name}:`, err);
            }
          }
        }
        if (updated) {
          await window.api.updateSettings(currentSettings);
          if (document.getElementById('settings-modal').style.display === 'block') {
            renderManageSites();
          }
        }
      }

      const vol = currentSettings.volume !== undefined ? currentSettings.volume : 1.0;
      const slider = document.getElementById('volume-slider');
      if (slider) {
        slider.value = Math.round(vol * 100);
        document.getElementById('volume-value').textContent = Math.round(vol * 100) + '%';
        updateVolumeIcon(vol);
      }
    }

    function renderSidebar() {
      const container = document.getElementById('sites-container');
      container.innerHTML = '';
      if (!currentSettings || !currentSettings.sites) return;
      
      currentSettings.sites.forEach((site, index) => {
        const div = document.createElement('div');
        div.className = 'icon' + (index === 0 ? ' active' : '');
        div.id = site.id;
        div.title = site.name;
        div.onclick = () => switchApp(site.url, site.id);
        
        if (site.icon && site.icon.startsWith('data:')) {
          const img = document.createElement('img');
          img.src = site.icon;
          div.appendChild(img);
        } else {
          div.innerHTML = site.svg;
        }
        
        container.appendChild(div);
      });
    }

    function switchApp(url, id, forceNavigate = false) {
      document.getElementById('settings-modal').style.display = 'none';
      if (window.api && window.api.toggleSettingsView) {
        window.api.toggleSettingsView(false);
      }
      
      // Update active state
      document.querySelectorAll('.icon').forEach(el => el.classList.remove('active'));
      const activeEl = document.getElementById(id);
      if (activeEl) activeEl.classList.add('active');

      // Update loader logo and text dynamically
      if (currentSettings && currentSettings.sites) {
        const site = currentSettings.sites.find(s => s.id === id);
        if (site) {
          const logoContainer = document.getElementById('loader-logo-container');
          const textContainer = document.getElementById('loader-text');
          
          if (site.icon && site.icon.startsWith('data:')) {
            logoContainer.innerHTML = `<img src="${site.icon}" alt="${site.name}">`;
          } else if (site.svg) {
            logoContainer.innerHTML = site.svg;
          } else {
            logoContainer.innerHTML = '';
          }
          
          textContainer.textContent = `Connecting to ${site.name}...`;
        }
      }
      
      window.api.switchApp(url, id, forceNavigate);
    }

    function switchSettingsTab(tabId) {
      const tabBtns = document.querySelectorAll('.settings-tab-btn');
      tabBtns.forEach(btn => btn.classList.remove('active'));
      
      const tabPanes = document.querySelectorAll('.settings-tab-pane');
      tabPanes.forEach(pane => pane.classList.remove('active'));
      
      const targetBtn = document.getElementById(`tab-btn-${tabId}`);
      if (targetBtn) targetBtn.classList.add('active');
      
      const targetPane = document.getElementById(`pane-${tabId}`);
      if (targetPane) targetPane.classList.add('active');
    }

    function toggleSettings() {
      const modal = document.getElementById('settings-modal');
      const isOpening = modal.style.display !== 'block';
      modal.style.display = isOpening ? 'block' : 'none';
      
      // Close extensions menu when settings modal toggles
      const extensionsMenu = document.getElementById('extensions-menu');
      if (extensionsMenu) extensionsMenu.style.display = 'none';
      
      if (window.api && window.api.toggleSettingsView) {
        window.api.toggleSettingsView(isOpening);
      }
      
      if(isOpening) {
        editingSiteId = null;
        switchSettingsTab('sites');
        updateExtensionsList();
        renderManageSites();
        // Sync adblock toggle state
        const adblockToggle = document.getElementById('adblock-toggle');
        if (adblockToggle) {
          adblockToggle.checked = currentSettings.adBlockEnabled !== false;
        }
      }
    }

    async function toggleAdBlocker() {
      const toggle = document.getElementById('adblock-toggle');
      currentSettings.adBlockEnabled = toggle.checked;
      await window.api.updateSettings(currentSettings);
    }

    function renderManageSites() {
      const list = document.getElementById('manage-sites-list');
      list.innerHTML = '';
      if (!currentSettings || !currentSettings.sites) return;
      
      const totalSites = currentSettings.sites.length;
      const heading = document.getElementById('manage-sites-heading');
      if (heading) {
        heading.textContent = `Manage Sites (${totalSites}/10)`;
      }

      currentSettings.sites.forEach((site, index) => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '10px';
        item.style.borderBottom = '1px solid var(--border)';
        
        let iconHtml = '';
        if (site.icon && site.icon.startsWith('data:')) {
          iconHtml = `<img src="${site.icon}" style="width: 20px; height: 20px; border-radius: 4px; object-fit: contain; margin-right: 10px;">`;
        } else {
          iconHtml = `<span style="display: inline-block; width: 20px; height: 20px; margin-right: 10px; vertical-align: middle;">${site.svg}</span>`;
        }
        
        const isEditing = site.id === editingSiteId;
        const isFirst = index === 0;
        const isLast = index === totalSites - 1;

        if (isEditing) {
          item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
              ${iconHtml}
              <input type="text" id="edit-name-${site.id}" value="${site.name}" style="padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border); background: rgba(255,255,255,0.05); color: var(--text); font-size: 13px; width: 150px;">
              <input type="text" id="edit-url-${site.id}" value="${site.url}" style="padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border); background: rgba(255,255,255,0.05); color: var(--text); font-size: 13px; flex: 1; max-width: 350px;">
            </div>
            <div style="display: flex; gap: 6px; -webkit-app-region: no-drag;">
              <button onclick="saveSiteEdit('${site.id}')" style="padding: 6px 12px; font-size: 12px; background-color: var(--accent); color: var(--bg-dark);">Save</button>
              <button class="secondary" onclick="cancelSiteEdit()" style="padding: 6px 12px; font-size: 12px;">Cancel</button>
            </div>
          `;
        } else {
          item.innerHTML = `
            <div style="display: flex; align-items: center;">
              ${iconHtml}
              <div>
                <strong>${site.name}</strong> <span style="color: var(--text-muted); font-size: 12px; margin-left: 10px;">${site.url}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; -webkit-app-region: no-drag;">
              <button class="secondary" style="padding: 6px; display: flex; align-items: center;" onclick="moveSite('${site.id}', 'up')" ${isFirst ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} title="Move Up">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M7 14l5-5 5 5z"/></svg>
              </button>
              <button class="secondary" style="padding: 6px; display: flex; align-items: center;" onclick="moveSite('${site.id}', 'down')" ${isLast ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} title="Move Down">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M7 10l5 5 5-5z"/></svg>
              </button>
              <button class="secondary" style="padding: 6px 12px; font-size: 12px;" onclick="startEditSite('${site.id}')">Edit</button>
              <button class="secondary" style="padding: 6px 12px; font-size: 12px; border-color: rgba(233,64,87,0.3); color: #e94057;" onclick="removeSite('${site.id}')">Remove</button>
            </div>
          `;
        }
        list.appendChild(item);
      });
    }

    function startEditSite(id) {
      editingSiteId = id;
      renderManageSites();
    }

    function cancelSiteEdit() {
      editingSiteId = null;
      renderManageSites();
    }

    async function saveSiteEdit(id) {
      const newName = document.getElementById(`edit-name-${id}`).value.trim();
      let newUrl = document.getElementById(`edit-url-${id}`).value.trim();
      
      if (!newName || !newUrl) return alert('Please enter both name and URL.');
      if (!newUrl.startsWith('http')) newUrl = 'https://' + newUrl;
      
      const site = currentSettings.sites.find(s => s.id === id);
      if (site) {
        const urlChanged = site.url !== newUrl;
        site.name = newName;
        site.url = newUrl;
        
        const firstLetter = newName.charAt(0).toUpperCase();
        site.svg = `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><rect width="24" height="24" rx="4" fill="currentColor" fill-opacity="0.1"/><text x="50%" y="52%" dominant-baseline="central" text-anchor="middle" font-weight="800" font-size="18" fill="currentColor">${firstLetter}</text></svg>`;
        
        if (urlChanged) {
          try {
            const result = await window.api.getSiteIcon(newUrl);
            if (result && result.startsWith('data:')) {
              site.icon = result;
            } else {
              site.icon = null;
            }
          } catch (e) {
            console.error('Failed to update icon on url edit:', e);
            site.icon = null;
          }
        }
      }
      
      editingSiteId = null;
      await window.api.updateSettings(currentSettings);
      renderManageSites();
      renderSidebar();
    }

    async function moveSite(id, direction) {
      if (!currentSettings.sites) return;
      const index = currentSettings.sites.findIndex(s => s.id === id);
      if (index === -1) return;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= currentSettings.sites.length) return;
      
      const temp = currentSettings.sites[index];
      currentSettings.sites[index] = currentSettings.sites[newIndex];
      currentSettings.sites[newIndex] = temp;
      
      await window.api.updateSettings(currentSettings);
      renderManageSites();
      renderSidebar();
    }

    async function addSite() {
      if (currentSettings.sites && currentSettings.sites.length >= 10) {
        return alert('Maximum of 10 sites allowed. Please remove a site before adding a new one.');
      }

      const nameInput = document.getElementById('new-site-name');
      const urlInput = document.getElementById('new-site-url');
      const addButton = document.querySelector('button[onclick="addSite()"]');
      const name = nameInput.value.trim();
      let url = urlInput.value.trim();
      
      if (!name || !url) return alert('Please enter both name and URL.');
      if (!url.startsWith('http')) url = 'https://' + url;
      
      const originalText = addButton.textContent;
      addButton.textContent = 'Fetching Icon...';
      addButton.disabled = true;
      
      let icon = null;
      try {
        const result = await window.api.getSiteIcon(url);
        if (result && result.startsWith('data:')) {
          icon = result;
        }
      } catch (err) {
        console.error('Failed to get site icon:', err);
      }
      
      addButton.textContent = originalText;
      addButton.disabled = false;
      
      const id = 'nav-custom-' + Date.now();
      const firstLetter = name.charAt(0).toUpperCase();
      const svg = `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><rect width="24" height="24" rx="4" fill="currentColor" fill-opacity="0.1"/><text x="50%" y="52%" dominant-baseline="central" text-anchor="middle" font-weight="800" font-size="18" fill="currentColor">${firstLetter}</text></svg>`;
      
      if (!currentSettings.sites) currentSettings.sites = [];
      currentSettings.sites.push({ id, name, url, svg, icon });
      
      await window.api.updateSettings(currentSettings);
      
      nameInput.value = '';
      urlInput.value = '';
      renderManageSites();
      renderSidebar();
    }

    async function removeSite(id) {
      if (!currentSettings.sites) return;
      currentSettings.sites = currentSettings.sites.filter(s => s.id !== id);
      await window.api.updateSettings(currentSettings);
      renderManageSites();
      renderSidebar();
    }

    async function loadExtension() {
      const ext = await window.api.loadExtension();
      if (ext) {
        updateExtensionsList();
      }
    }

    function getPathBasename(pathStr) {
      const parts = pathStr.split(/[/\\]/);
      return parts[parts.length - 1] || pathStr;
    }

    async function installWebstoreExtension() {
      const input = document.getElementById('webstore-url-input');
      const btn = document.getElementById('webstore-install-btn');
      const query = input.value.trim();
      
      if (!query) {
        showWebstoreStatus('Please enter a Chrome Web Store extension URL or ID.', 'error');
        return;
      }
      
      const match = query.match(/[a-p]{32}/);
      if (!match) {
        showWebstoreStatus('Could not find a valid 32-character extension ID in your input. Please make sure the ID consists of letters a-p.', 'error');
        return;
      }
      
      const extensionId = match[0];
      btn.disabled = true;
      input.disabled = true;
      showWebstoreStatus(`Downloading and extracting extension (ID: ${extensionId})...`, 'info');
      
      try {
        const result = await window.api.installWebstoreExtension(extensionId);
        if (result.success) {
          showWebstoreStatus(`Successfully installed extension: ${result.name}`, 'success');
          input.value = '';
          updateExtensionsList();
          renderPinnedExtensions();
        } else {
          showWebstoreStatus(`Failed to install: ${result.error}`, 'error');
        }
      } catch (err) {
        showWebstoreStatus(`An unexpected error occurred: ${err.message}`, 'error');
      } finally {
        btn.disabled = false;
        input.disabled = false;
      }
    }

    function showWebstoreStatus(msg, type = 'info') {
      const el = document.getElementById('webstore-status-message');
      el.textContent = msg;
      el.style.display = 'block';
      el.style.border = '1px solid';
      if (type === 'success') {
        el.style.backgroundColor = 'rgba(46, 125, 50, 0.15)';
        el.style.borderColor = 'rgba(46, 125, 50, 0.3)';
        el.style.color = '#81c784';
      } else if (type === 'error') {
        el.style.backgroundColor = 'rgba(198, 40, 40, 0.15)';
        el.style.borderColor = 'rgba(198, 40, 40, 0.3)';
        el.style.color = '#e57373';
      } else {
        el.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        el.style.borderColor = 'var(--border)';
        el.style.color = 'var(--text-muted)';
      }
    }

    async function updateExtensionsList() {
      currentSettings = await window.api.getSettings();
      const list = document.getElementById('extensions-list');
      list.innerHTML = '';
      
      let loadedExtensions = [];
      try {
        loadedExtensions = await window.api.getLoadedExtensions();
      } catch (err) {
        console.error('Failed to get loaded extensions:', err);
      }
      
      if (loadedExtensions.length > 0) {
        loadedExtensions.forEach(ext => {
          const li = document.createElement('li');
          li.style.display = 'flex';
          li.style.justifyContent = 'space-between';
          li.style.alignItems = 'center';
          li.style.padding = '12px 16px';
          li.style.background = 'rgba(255, 255, 255, 0.03)';
          li.style.border = '1px solid var(--border)';
          li.style.borderRadius = '8px';
          li.style.marginBottom = '8px';
          
          const isWebstore = ext.path.includes('extensions' + (ext.path.includes('\\') ? '\\' : '/'));
          
          const infoDiv = document.createElement('div');
          infoDiv.style.display = 'flex';
          infoDiv.style.flexDirection = 'column';
          infoDiv.style.gap = '4px';
          infoDiv.style.overflow = 'hidden';
          infoDiv.style.paddingRight = '15px';
          
          const titleSpan = document.createElement('span');
          titleSpan.style.fontWeight = '600';
          titleSpan.style.fontSize = '14px';
          titleSpan.textContent = `${ext.name} (v${ext.version})`;
          
          const pathSpan = document.createElement('span');
          pathSpan.style.fontSize = '11px';
          pathSpan.style.color = 'var(--text-muted)';
          pathSpan.style.wordBreak = 'break-all';
          pathSpan.textContent = isWebstore ? `ID: ${ext.id}` : ext.path;
          
          infoDiv.appendChild(titleSpan);
          infoDiv.appendChild(pathSpan);
          
          const removeBtn = document.createElement('button');
          removeBtn.className = 'secondary';
          removeBtn.style.padding = '6px 12px';
          removeBtn.style.fontSize = '12px';
          removeBtn.style.flexShrink = '0';
          removeBtn.textContent = 'Remove';
          removeBtn.onclick = async () => {
            if (confirm(`Are you sure you want to remove this extension?\n\n${ext.name}`)) {
              const success = await window.api.removeExtension(ext.path);
              if (success) {
                updateExtensionsList();
                renderPinnedExtensions();
              } else {
                alert('Failed to remove extension.');
              }
            }
          };
          
          li.appendChild(infoDiv);
          li.appendChild(removeBtn);
          list.appendChild(li);
        });
      } else {
        const li = document.createElement('li');
        li.textContent = "No extensions loaded yet.";
        li.style.background = "transparent";
        li.style.border = "1px dashed rgba(255,255,255,0.2)";
        li.style.color = "var(--text-muted)";
        list.appendChild(li);
      }
    }


    let volumeTimeout = null;

    function showVolumeSlider() {
      if (volumeTimeout) clearTimeout(volumeTimeout);
      const container = document.getElementById('volume-slider-container');
      container.style.display = 'flex';
    }

    function hideVolumeSlider() {
      volumeTimeout = setTimeout(() => {
        const container = document.getElementById('volume-slider-container');
        container.style.display = 'none';
      }, 500);
    }

    function clearVolumeTimeout() {
      if (volumeTimeout) clearTimeout(volumeTimeout);
    }

    function mediaPlayPause() {
      if (window.api && window.api.mediaPlayPause) {
        window.api.mediaPlayPause();
      }
    }

    function mediaNext() {
      if (window.api && window.api.mediaNext) {
        window.api.mediaNext();
      }
    }

    function mediaPrev() {
      if (window.api && window.api.mediaPrev) {
        window.api.mediaPrev();
      }
    }

    function navBack() {
      if (window.api && window.api.navBack) window.api.navBack();
    }
    
    function navForward() {
      if (window.api && window.api.navForward) window.api.navForward();
    }
    
    function navReload() {
      if (window.api && window.api.navReload) window.api.navReload();
    }

    function setAppVolume(value) {
      const vol = value / 100;
      document.getElementById('volume-value').textContent = value + '%';
      updateVolumeIcon(vol);
      if (window.api && window.api.setVolume) {
        window.api.setVolume(vol);
      }
    }

    function updateVolumeIcon(vol) {
      const icon = document.getElementById('volume-icon');
      if (!icon) return;
      if (vol === 0) {
        icon.innerHTML = `<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>`;
      } else if (vol < 0.3) {
        icon.innerHTML = `<path d="M7 9v6h4l5 5V4l-5 5H7z"/>`;
      } else if (vol < 0.7) {
        icon.innerHTML = `<path d="M5 9v6h4l5 5V4L9 9H5zm11.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>`;
      } else {
        icon.innerHTML = `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>`;
      }
    }

    // Listen for loader controls from the main process
    if (window.api && window.api.onShowLoader) {
      window.api.onShowLoader(() => {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = 'flex';
        overlay.style.opacity = ''; // Clear inline opacity to let CSS handle it
        // Force reflow
        overlay.offsetHeight;
        overlay.classList.add('visible');
      });
    }

    if (window.api && window.api.onHideLoader) {
      window.api.onHideLoader(() => {
        const overlay = document.getElementById('loading-overlay');
        overlay.classList.remove('visible');
        overlay.style.opacity = '0';
        setTimeout(() => {
          if (!overlay.classList.contains('visible')) {
            overlay.style.display = 'none';
          }
        }, 400);
      });
    }

    function toggleSplitMenu(event) {
      console.log('toggleSplitMenu clicked - showing native popup');
      event.preventDefault();
      
      const rect = event.currentTarget.getBoundingClientRect();
      const x = Math.round(rect.left);
      const y = Math.round(rect.bottom);

      if (window.api && window.api.showSplitMenu) {
        window.api.showSplitMenu({ x, y });
      }
    }

    if (window.api && window.api.onSplitStateChanged) {
      window.api.onSplitStateChanged(({ isSplitMode }) => {
        console.log('Split state changed callback:', isSplitMode);
        const btn = document.getElementById('split-screen-btn');
        if (btn) {
          if (isSplitMode) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        }
      });
    }

    function toggleFullscreen() {
      if (window.api && window.api.toggleFullscreen) {
        window.api.toggleFullscreen();
      }
    }

    if (window.api && window.api.onFullscreenChanged) {
      window.api.onFullscreenChanged(({ isFullscreen }) => {
        console.log('Fullscreen state changed callback:', isFullscreen);
        const btn = document.getElementById('fullscreen-btn');
        if (isFullscreen) {
          document.body.classList.add('fullscreen-active');
          if (btn) btn.classList.add('active');
        } else {
          document.body.classList.remove('fullscreen-active');
          if (btn) btn.classList.remove('active');
        }
      });
    }

    initApp();