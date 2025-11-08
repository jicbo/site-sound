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
        }
    }

    function applyVolumeToElement(el, volume) {
        const newVolume = Math.max(0, Math.min(volume / 100, 1));
        el.volume = newVolume;
    }

    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() {
        if (currentSettings.enabled) {
            applyVolumeToElement(this, currentSettings.volume);
        }
        return originalPlay.apply(this, arguments);
    };

    function startVolumeControl(settings) {
        if (observer) observer.disconnect();
        currentSettings = settings;
        applyVolumeToAll(settings.volume);

        observer = new MutationObserver(mutations => {
            applyVolumeToAll(currentSettings.volume);
        });
        observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    }

    function stopVolumeControl() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        applyVolumeToAll(100);
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


