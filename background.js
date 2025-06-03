// background.js - Site Sound
function _browser() {
    return typeof browser !== 'undefined' ? browser : chrome;
}

let siteVolumes = {};
let lastVolume = 100;

// Load per-site volumes on startup
_browser().storage.local.get(['siteVolumes', 'lastVolume'], result => {
    siteVolumes = result.siteVolumes || {};
    lastVolume = typeof result.lastVolume === 'number' ? result.lastVolume : 100;
    updateBadgeText();
});

function getCurrentHostname(cb) {
    _browser().tabs.query({ currentWindow: true, active: true }, tabs => {
        if (tabs.length > 0) {
            try { cb(new URL(tabs[0].url).hostname); } catch { cb(null); }
        } else cb(null);
    });
}

function saveVolume(host, vol) {
    siteVolumes[host] = vol;
    lastVolume = vol;
    _browser().storage.local.set({ siteVolumes, lastVolume });
}

function getVolume(host) {
    return siteVolumes[host] !== undefined ? siteVolumes[host] : lastVolume;
}

function setBadgeText(vol) {
    // Always clear badge if no per-site value or value is 100
    if (vol == null || vol === 100 || isNaN(vol)) {
        _browser().browserAction.setBadgeText({ text: '' });
    } else {
        _browser().browserAction.setBadgeText({ text: String(vol) });
    }
}

function updateBadgeText() {
    getCurrentHostname(host => {
        if (!host) {
            setBadgeText(100);
            return;
        }
        _browser().storage.local.get(['siteVolumes', 'lastVolume'], result => {
            const vols = result.siteVolumes || {};
            if (vols[host] !== undefined && vols[host] !== 100 && vols[host] != null && !isNaN(vols[host])) {
                setBadgeText(vols[host]);
            } else {
                setBadgeText(100);
            }
        });
    });
}

_browser().runtime.onMessage.addListener((req, _, sendResponse) => {
    if (req.action === 'changeSoundVolume' && req.data && typeof req.data.soundVolume === 'number') {
        getCurrentHostname(host => { if (host) saveVolume(host, req.data.soundVolume); setBadgeText(req.data.soundVolume); });
    }
    if (req.type === 'setVolume') {
        getCurrentHostname(host => { if (host) saveVolume(host, req.volume); setBadgeText(req.volume); });
        _browser().tabs.query({ currentWindow: true, active: true }, tabs => {
            if (tabs.length > 0) _browser().tabs.sendMessage(tabs[0].id, { action: 'changeSoundVolume' }, r => sendResponse && sendResponse(r));
        });
        return true;
    }
});

_browser().tabs.onActivated.addListener(updateBadgeText);
_browser().tabs.onUpdated.addListener(updateBadgeText);