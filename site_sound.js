console.log("Site Sound content script loaded on", window.location.href);

// site_sound.js - Site Sound content script
(function () {
    function _browser() { return typeof browser !== 'undefined' ? browser : chrome; }
    function getSiteKey() { return window.location.hostname; }
    function getStoredVolume(cb) {
        _browser().storage.local.get([getSiteKey()], r => cb(typeof r[getSiteKey()] === 'number' ? r[getSiteKey()] : 100));
    }
    function setStoredVolume(vol) { _browser().storage.local.set({ [getSiteKey()]: vol }); }
    function applyVolumeToAll(volume) {
        window.localSoundVolume = volume;
        const newVolume = Math.max(0, Math.min(volume / 100, 1)); // Only allow 0-100%
        const media = [...document.querySelectorAll('audio,video')];
        // Always set volume for all media elements, regardless of play state
        window.prevSoundVolume = window.localSoundVolume;
        for (const el of media) {
            el.volume = newVolume;
            // Do not force mute; let the user/site control the muted state
        }
    }
    function applyVolumeToElement(el, volume) {
        const newVolume = Math.max(0, Math.min(volume / 100, 1));
        el.volume = newVolume;
        el.muted = (newVolume === 0);
    }
    function changeSoundVolume() { getStoredVolume(applyVolumeToAll); }
    function hasNativeVolumeControl() {
        // Heuristic: if any audio/video element has controls attribute, or iframes with YouTube/Twitch
        const media = document.querySelectorAll('audio[controls], video[controls]');
        if (media.length > 0) return true;
        // Check for embedded YouTube/Twitch players
        const iframes = document.querySelectorAll('iframe');
        for (const frame of iframes) {
            const src = frame.src || '';
            if (src.includes('youtube.com/embed') || src.includes('twitch.tv')) return true;
        }
        // Check for YouTube/Twitch main site
        if (/youtube\.com|twitch\.tv/.test(window.location.hostname)) return true;
        return false;
    }

    if (hasNativeVolumeControl()) {
        // Instead of injecting a message into the page, send a message to the popup to update its text
        _browser().runtime.onMessage.addListener((req, sender, sendResponse) => {
            if (req && req.type === 'checkNativeVolumeControl') {
                sendResponse({ hasNative: true });
            }
        });
        return;
    } else {
        _browser().runtime.onMessage.addListener((req, sender, sendResponse) => {
            if (req && req.type === 'checkNativeVolumeControl') {
                sendResponse({ hasNative: false });
            }
        });
    }

    getStoredVolume(applyVolumeToAll);
    // Improved MutationObserver: apply volume to new audio/video elements as soon as they appear
    const observer = new MutationObserver(mutations => {
        getStoredVolume(volume => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) {
                        if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
                            applyVolumeToElement(node, volume);
                        } else {
                            // Check for nested audio/video
                            node.querySelectorAll && node.querySelectorAll('audio,video').forEach(el => applyVolumeToElement(el, volume));
                        }
                    }
                }
            }
            // Also re-apply to all in case of attribute changes or missed nodes
            applyVolumeToAll(volume);
        });
    });
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    _browser().runtime.onMessage.addListener((req, _, sendResponse) => {
        if (req.type === 'setVolume') {
            applyVolumeToAll(req.volume); setStoredVolume(req.volume); sendResponse && sendResponse({ soundVolume: req.volume });
        } else if (req.action === 'changeSoundVolume') {
            if (req.data && typeof req.data.soundVolume === 'number') {
                window.localSoundVolume = Number(req.data.soundVolume);
                applyVolumeToAll(window.localSoundVolume);
            }
            sendResponse && sendResponse({ soundVolume: window.localSoundVolume });
        } else if (req.action === 'getSoundVolume') {
            sendResponse && sendResponse({ soundVolume: window.localSoundVolume });
        }
        return true;
    });
})();


