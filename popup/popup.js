document.addEventListener('DOMContentLoaded', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const tab = tabs[0];
        if (!tab || !tab.url || tab.url.startsWith('about:') || tab.url.startsWith('chrome://')) {
            document.body.innerHTML = '<div class="message">Site Sound does not work on internal browser pages.</div>';
            return;
        }

        const slider = document.getElementById('volume-slider');
        const valueDisplay = document.getElementById('volume-value');
        const enableSwitch = document.getElementById('enable-switch');
        const sliderContainer = document.getElementById('slider-container');
        const hostname = new URL(tab.url).hostname;

        function getSiteSettings(callback) {
            chrome.storage.local.get([hostname], function (result) {
                const settings = result[hostname] || { enabled: false, volume: 100 };
                callback(settings);
            });
        }

        function setSiteSettings(settings) {
            chrome.storage.local.set({ [hostname]: settings });
        }

        function updateUI(settings) {
            enableSwitch.checked = settings.enabled;
            slider.value = settings.volume;
            valueDisplay.textContent = settings.volume + '%';
            slider.style.setProperty('--val', settings.volume);

            if (settings.enabled) {
                sliderContainer.classList.remove('disabled');
            } else {
                sliderContainer.classList.add('disabled');
            }
        }

        getSiteSettings(function (settings) {
            updateUI(settings);
        });

        enableSwitch.addEventListener('change', function () {
            const isEnabled = enableSwitch.checked;
            getSiteSettings(function (settings) {
                settings.enabled = isEnabled;
                setSiteSettings(settings);
                updateUI(settings);
                chrome.tabs.sendMessage(tab.id, { type: isEnabled ? 'enableSite' : 'disableSite', settings: settings });
                chrome.runtime.sendMessage({ type: 'updateBadge' });
            });
        });

        slider.addEventListener('input', function () {
            const volume = parseInt(slider.value, 10);
            valueDisplay.textContent = volume + '%';
            slider.style.setProperty('--val', volume);

            getSiteSettings(function (settings) {
                settings.volume = volume;
                setSiteSettings(settings);
                chrome.tabs.sendMessage(tab.id, { type: 'setVolume', volume: volume });
                chrome.runtime.sendMessage({ type: 'setVolume', volume: volume });
            });
        });
    });
});