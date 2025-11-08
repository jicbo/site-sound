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
        if (tabs.length > 0 && tabs[0].url) {
            try {
                cb(new URL(tabs[0].url).hostname);
            } catch (e) {
                cb(null);
            }
        } else {
            cb(null);
        }
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

function setBadgeText(settings) {
    let text = '';
    if (settings.enabled && settings.volume !== 100) {
        text = String(settings.volume);
    }
    _browser().browserAction.setBadgeText({ text: text });
}

function updateBadgeText() {
    getCurrentHostname(host => {
        getSiteSettings(host, settings => {
            setBadgeText(settings);
        });
    });
}

function getSiteSettings(host, callback) {
    if (!host) {
        callback({ enabled: false, volume: 100 });
        return;
    }
    _browser().storage.local.get([host], function (result) {
        const settings = result[host] || { enabled: false, volume: 100 };
        callback(settings);
    });
}

_browser().runtime.onMessage.addListener((req, _, sendResponse) => {
    if (req.action === 'changeSoundVolume' && req.data && typeof req.data.soundVolume === 'number') {
        getCurrentHostname(host => { if (host) saveVolume(host, req.data.soundVolume); setBadgeText(req.data.soundVolume); });
    }
    if (req.type === 'setVolume') {
        getCurrentHostname(host => {
            if (host) {
                _browser().storage.local.get([host], function (result) {
                    const settings = result[host] || { enabled: false, volume: 100 };
                    settings.volume = req.volume;
                    _browser().storage.local.set({ [host]: settings }, () => {
                        updateBadgeText();
                    });
                });
            }
        });
    } else if (req.type === 'updateBadge') {
        updateBadgeText();
    }
});

_browser().tabs.onActivated.addListener(updateBadgeText);
_browser().tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        updateBadgeText();
    }
});