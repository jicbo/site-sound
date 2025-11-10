(function () {
    let observer = null;
    let currentSettings = { enabled: false, volume: 100 };

    function _browser() { return typeof browser !== 'undefined' ? browser : chrome; }
    function getSiteKey() { return window.location.hostname; }

    function getSiteSettings(callback) {
        const siteKey = getSiteKey();
        _browser().storage.local.get([siteKey], r => {
            const settings = r[siteKey] || { enabled: false, volume: 100 };
            callback(settings);
        });
    }

    function applyVolumeToAll(volume) {
        const newVolume = Math.max(0, Math.min(volume / 100, 1));
        const media = [...document.querySelectorAll('audio,video')];
        for (const el of media) {
            el.volume = newVolume;
            el.muted = (newVolume === 0);
        }
    }

    function applyVolumeToElement(el, volume) {
        const newVolume = Math.max(0, Math.min(volume / 100, 1));
        el.volume = newVolume;
        el.muted = (newVolume === 0);
    }

    function startVolumeControl(settings) {
        if (observer) observer.disconnect();
        currentSettings = settings;
        applyVolumeToAll(settings.volume);

        observer = new MutationObserver(mutations => {
            setTimeout(() => {
                const volume = currentSettings.volume;
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
                                applyVolumeToElement(node, volume);
                            } else {
                                if (node.querySelectorAll) {
                                    node.querySelectorAll('audio,video').forEach(el => applyVolumeToElement(el, volume));
                                }
                            }
                        }
                    }
                }
                applyVolumeToAll(volume);
            }, 0);
        });
        
        observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    }

    function stopVolumeControl() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    _browser().runtime.onMessage.addListener((req, _, sendResponse) => {
        if (req.type === 'enableSite') {
            currentSettings.enabled = true;
            startVolumeControl(req.settings);
        } else if (req.type === 'disableSite') {
            currentSettings.enabled = false;
            stopVolumeControl();
        } else if (req.type === 'setVolume') {
            if (currentSettings.enabled) {
                currentSettings.volume = req.volume;
                applyVolumeToAll(req.volume);
            }
        }
        return true;
    });

    getSiteSettings(settings => {
        currentSettings = settings;
        if (settings.enabled) {
            startVolumeControl(settings);
        }
    });
})();