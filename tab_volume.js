// Helper to get hostname from current location
function getHostname() {
    return window.location.hostname;
}

// Save volume for current site
function saveVolume(volume) {
    const hostname = getHostname();
    chrome.storage.local.set({ [hostname]: volume });
}

// Get saved volume for current site
function getSavedVolume(callback) {
    const hostname = getHostname();
    chrome.storage.local.get([hostname], function(result) {
        let volume = typeof result[hostname] === "number" ? result[hostname] : 1;
        callback(volume);
    });
}

// Apply volume to all audio/video elements
function applyVolumeToAllElements(volume) {
    document.querySelectorAll('audio,video').forEach(el => {
        el.volume = Math.min(volume, 1); // Set native volume (max 1)
        // Boost using gain node if volume > 1
        if (volume > 1) {
            if (!el._boostCtx) {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const source = ctx.createMediaElementSource(el);
                const gain = ctx.createGain();
                source.connect(gain).connect(ctx.destination);
                el._boostCtx = { ctx, gain };
            }
            el._boostCtx.gain.gain.value = volume;
        } else if (el._boostCtx) {
            el._boostCtx.gain.gain.value = 1;
        }
    });
}

// Apply saved volume to all elements now and on DOMContentLoaded
function applySavedVolume() {
    getSavedVolume(applyVolumeToAllElements);
}
applySavedVolume();
document.addEventListener('DOMContentLoaded', applySavedVolume);

// Observe for new audio/video elements and apply saved volume
const observer = new MutationObserver(mutations => {
    let found = false;
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (
                node.nodeType === 1 &&
                (node.tagName === 'AUDIO' || node.tagName === 'VIDEO' ||
                 (node.querySelector && (node.querySelector('audio') || node.querySelector('video'))))
            ) {
                found = true;
            }
        });
    });
    if (found) applySavedVolume();
});
observer.observe(document.body, { childList: true, subtree: true });

// Listen for messages from popup to change volume and save it
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'setVolume') {
        applyVolumeToAllElements(request.volume);
        saveVolume(request.volume);
    }
});