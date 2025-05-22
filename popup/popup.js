document.addEventListener('DOMContentLoaded', function () {
    const slider = document.getElementById('volume-slider');
    const valueDisplay = document.getElementById('volume-value');
    const presetButtons = document.querySelectorAll('.preset-btn');

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const tab = tabs[0];
        const url = new URL(tab.url);
        const hostname = url.hostname;

        // Load saved volume for this hostname
        chrome.storage.local.get([hostname], function (result) {
            let volume = typeof result[hostname] === "number" ? result[hostname] : 1;
            slider.value = volume;
            valueDisplay.textContent = Math.round(volume * 100) + '%';
        });

        // When slider changes, send message and save volume
        slider.addEventListener('input', function () {
            const volume = parseFloat(slider.value);
            valueDisplay.textContent = Math.round(volume * 100) + '%';
            chrome.tabs.sendMessage(tab.id, { type: 'setVolume', volume: volume });
            chrome.storage.local.set({ [hostname]: volume });
        });

        // Preset buttons
        presetButtons.forEach(btn => {
            btn.addEventListener('click', function () {
                const volume = parseFloat(btn.getAttribute('data-value'));
                slider.value = volume;
                valueDisplay.textContent = Math.round(volume * 100) + '%';
                chrome.tabs.sendMessage(tab.id, { type: 'setVolume', volume: volume });
                chrome.storage.local.set({ [hostname]: volume });
            });
        });
    });
});