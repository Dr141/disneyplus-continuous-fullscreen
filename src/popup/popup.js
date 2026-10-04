/**
 * Disney+ Continuous Fullscreen - Popup Script
 * Salva e restaura as preferências do usuário no chrome.storage
 */
document.addEventListener('DOMContentLoaded', () => {
  const defaults = {
    continuousFullscreen: true,
    enableKeyF: true,
    enableDblClick: true,
    hideCursorOnIdle: true,
    autoSkipIntro: true
  };

  const inputs = {
    continuousFullscreen: document.getElementById('continuousFullscreen'),
    enableKeyF: document.getElementById('enableKeyF'),
    enableDblClick: document.getElementById('enableDblClick'),
    hideCursorOnIdle: document.getElementById('hideCursorOnIdle'),
    autoSkipIntro: document.getElementById('autoSkipIntro')
  };

  // Carrega opções salvas
  chrome.storage.sync.get(defaults, (items) => {
    for (const [key, element] of Object.entries(inputs)) {
      if (element) {
        element.checked = items[key] !== undefined ? items[key] : defaults[key];
      }
    }
  });

  // Registra alteração para cada checkbox
  for (const [key, element] of Object.entries(inputs)) {
    if (element) {
      element.addEventListener('change', () => {
        const update = {};
        update[key] = element.checked;
        chrome.storage.sync.set(update);
      });
    }
  }
});
