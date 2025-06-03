document.addEventListener('DOMContentLoaded', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const tab = tabs[0];
        if (!tab || !tab.url || tab.url.startsWith('about:') || tab.url.startsWith('chrome://')) {
            document.body.innerHTML = '<div style="padding:16px;max-width:260px;font-size:1em;color:#fff;">' +
                'Site Sound does not work on internal browser pages like <b>about:debugging</b> or <b>about:addons</b>.' +
                '<br><br>Try this extension on a regular website tab.' +
                '</div>';
            return;
        }
        const slider = document.getElementById('volume-slider');
        const valueDisplay = document.getElementById('volume-value');
        const hostname = new URL(tab.url).hostname;
        // Set initial fill for slider
        slider.style.setProperty('--val', slider.value);
        // Ask content script if native volume control is present
        chrome.tabs.sendMessage(tab.id, { type: 'checkNativeVolumeControl' }, function(response) {
            if (response && response.hasNative) {
                document.body.innerHTML = '<div style="padding:16px;max-width:260px;font-size:1em;color:#fff;">' +
                    'Site Sound is not needed: this website already has its own volume control.' +
                    '</div>';
                return;
            }
            chrome.storage.local.get([hostname], function (result) {
                let volume = typeof result[hostname] === "number" ? result[hostname] : 100;
                slider.min = 0;
                slider.max = 100;
                slider.value = volume;
                slider.style.setProperty('--val', volume);
                valueDisplay.textContent = volume + '%';
                slider.addEventListener('input', function () {
                    const volume = parseInt(slider.value, 10);
                    slider.style.setProperty('--val', volume);
                    valueDisplay.textContent = volume + '%';
                    chrome.tabs.sendMessage(tab.id, { type: 'setVolume', volume }, function(response) {
                        if (chrome.runtime.lastError) {
                            slider.disabled = true;
                            valueDisplay.textContent = "Not supported on this page.";
                        }
                    });
                    chrome.runtime.sendMessage({ type: "setVolume", volume });
                    chrome.storage.local.set({ [hostname]: volume });
                });
            });
        });
        const settingsBtn = document.getElementById('open-settings');
        if (settingsBtn) {
            settingsBtn.remove();
        }
    });
});