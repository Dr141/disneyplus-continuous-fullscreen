/**
 * Disney+ Continuous Fullscreen - Content Script
 * 
 * Executado no contexto isolado da extensão para gerenciar:
 * 1. Sincronização de configurações com chrome.storage.
 * 2. Atalhos de conveniência (tecla 'F' e duplo clique no player).
 * 3. Monitoramento do DOM para o novo episódio e reprodução contínua.
 */
(function () {
  'use strict';

  // Validação estrita de domínio: garante execução exclusiva no Disney+
  function isDisneyPlusDomain() {
    const hostname = window.location.hostname.toLowerCase();
    return hostname === 'disneyplus.com' || hostname.endsWith('.disneyplus.com');
  }

  // Aborta imediatamente se não estiver no domínio oficial do Disney+
  if (!isDisneyPlusDomain()) {
    return;
  }

  // Adiciona classe de escopo na raiz para que o styles.css funcione exclusivamente nesta extensão no Disney+
  document.documentElement.classList.add('dplus-active');

  // Configurações padrão
  let settings = {
    continuousFullscreen: true,
    enableKeyF: true,
    enableDblClick: true,
    hideCursorOnIdle: true,
    autoSkipIntro: true
  };

  // Carrega configurações do chrome.storage
  function loadSettings() {
    chrome.storage.sync.get(settings, (items) => {
      if (items) {
        settings = Object.assign(settings, items);
        notifyInjectScript();
      }
    });
  }

  // Notifica o inject.js (no contexto MAIN) sobre as configurações
  function notifyInjectScript() {
    window.postMessage(
      {
        type: 'DPLUS_UPDATE_SETTINGS',
        settings: settings
      },
      '*'
    );
  }

  // Monitora alterações em tempo real das opções
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync') {
      for (const [key, change] of Object.entries(changes)) {
        settings[key] = change.newValue;
      }
      if (!settings.hideCursorOnIdle) {
        showCursor();
        clearTimeout(idleTimer);
      }
      notifyInjectScript();
    }
  });

  loadSettings();

  // Verifica se o usuário está assistindo a um vídeo no Disney+
  function isPlaybackRoute() {
    if (!isDisneyPlusDomain()) return false;
    const path = window.location.pathname;
    const isPlayerPath = path.includes('/play/') || path.includes('/video/');
    const hasPlayerElement = !!document.querySelector('.btm-media-client, [data-testid="video-player"], [data-testid="playback-container"], .web-player');
    const hasVideo = !!document.querySelector('video');
    return isPlayerPath || (hasPlayerElement && hasVideo);
  }

  // Alterna tela cheia
  function toggleFullscreen() {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } else {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    }
  }

  // 1. Atalho Tecla 'F'
  window.addEventListener('keydown', (event) => {
    if (!settings.enableKeyF) return;

    // Ignora se estiver digitando em campo de texto
    const target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    if (event.key.toLowerCase() === 'f' && isPlaybackRoute()) {
      event.preventDefault();
      toggleFullscreen();
    }
  });

  // 2. Duplo clique para alternar tela cheia
  document.addEventListener('dblclick', (event) => {
    if (!settings.enableDblClick || !isPlaybackRoute()) return;

    const target = event.target;
    // Se o clique foi no vídeo ou no container do player
    if (target.tagName === 'VIDEO' || target.closest('.btm-media-client') || target.closest('[data-testid="video-player"]')) {
      // Ignora duplo clique em botões de controle
      if (target.closest('button') || target.closest('[role="button"]') || target.closest('input')) {
        return;
      }
      event.preventDefault();
      toggleFullscreen();
    }
  });

  // 3. Observer para monitorar novos vídeos (próximo episódio)
  let lastVideoElement = null;

  const observer = new MutationObserver(() => {
    if (!isPlaybackRoute()) return;

    if (settings.autoSkipIntro) {
      checkAndSkipIntro();
    }

    const video = document.querySelector('video');
    if (video && video !== lastVideoElement) {
      lastVideoElement = video;
      console.log('[Disney+ Continuous Fullscreen] Novo elemento de vídeo detectado (início do próximo episódio).');

      // Se a página já está em tela cheia, garante que o estilo e autoplay funcionem
      if (document.fullscreenElement) {
        if (video.paused && video.readyState >= 2) {
          video.play().catch(() => {
            // Autoplay pode aguardar buffer
          });
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // 4. Ocultação do cursor após 3 segundos de inatividade
  let idleTimer = null;
  const IDLE_TIMEOUT_MS = 3000;

  function showCursor() {
    document.documentElement.classList.remove('dplus-cursor-hidden');
  }

  function hideCursor() {
    if (settings.hideCursorOnIdle && isPlaybackRoute()) {
      document.documentElement.classList.add('dplus-cursor-hidden');
    }
  }

  function onUserActivity() {
    showCursor();
    clearTimeout(idleTimer);

    if (settings.hideCursorOnIdle && isPlaybackRoute()) {
      idleTimer = setTimeout(hideCursor, IDLE_TIMEOUT_MS);
    }
  }

  // Ouvintes de atividade do mouse e teclado
  window.addEventListener('mousemove', onUserActivity, { passive: true });
  window.addEventListener('pointermove', onUserActivity, { passive: true });
  window.addEventListener('mousedown', onUserActivity, { passive: true });
  window.addEventListener('keydown', onUserActivity, { passive: true });
  window.addEventListener('wheel', onUserActivity, { passive: true });

  // Restaura o cursor se sair de tela cheia ou mudar de rota
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      showCursor();
      clearTimeout(idleTimer);
    }
  });

  window.addEventListener('popstate', () => {
    if (!isPlaybackRoute()) {
      showCursor();
      clearTimeout(idleTimer);
    }
  });

  // 5. Pular abertura e introdução automaticamente
  let lastSkipTime = 0;

  function checkAndSkipIntro() {
    if (!isDisneyPlusDomain() || !settings.autoSkipIntro || !isPlaybackRoute()) return;

    const now = Date.now();
    // Previne cliques repetidos em rajada dentro de 1.5s
    if (now - lastSkipTime < 1500) return;

    // 1. Seletores diretos por data-testid ou classes conhecidas no Disney+
    const selectors = [
      'button[data-testid="player-skip-intro"]',
      'button[data-testid="player-skip-recap"]',
      'button[data-testid*="skip-intro" i]',
      'button[data-testid*="skip-recap" i]',
      'button[data-testid*="skipIntro" i]',
      'button[data-testid*="skipRecap" i]',
      '.skip__button',
      '.skip-intro-button',
      '.skip-intro',
      '.skip-recap',
      '[aria-label*="pular abertura" i]',
      '[aria-label*="pular introdução" i]',
      '[aria-label*="pular introducao" i]',
      '[aria-label*="pular resumo" i]',
      '[aria-label*="pular recapitulação" i]',
      '[aria-label*="pular recapitulacao" i]',
      '[aria-label*="skip intro" i]',
      '[aria-label*="skip recap" i]'
    ];

    for (const selector of selectors) {
      const btn = document.querySelector(selector);
      if (btn && btn.offsetParent !== null) {
        lastSkipTime = now;
        btn.click();
        console.log('[Disney+ Continuous Fullscreen] Abertura/Introdução pulada via seletor:', selector);
        return true;
      }
    }

    // 2. Busca restrita aos botões do player de vídeo
    const playerContainer = document.querySelector('.btm-media-client, [data-testid="video-player"], [data-testid="playback-container"], .web-player, .player-container') || document.body;
    const candidateButtons = playerContainer ? playerContainer.querySelectorAll('button, [role="button"]') : [];

    for (const btn of candidateButtons) {
      if (btn.offsetParent === null) continue;

      const text = (btn.textContent || '').trim().toLowerCase();
      const aria = (btn.getAttribute('aria-label') || '').trim().toLowerCase();
      const combined = `${text} ${aria}`;

      // Evita botão de próximo episódio ou controles de reprodução comuns
      if (
        combined.includes('próximo') ||
        combined.includes('proximo') ||
        combined.includes('next episode') ||
        combined.includes('play') ||
        combined.includes('pause')
      ) {
        continue;
      }

      // Procura especificamente por expressões claras de pular abertura/resumo (evitando palavras soltas genéricas como "resumo" de carrinho/pedido)
      const isIntroOrRecap =
        combined.includes('pular abertura') ||
        combined.includes('pular introdução') ||
        combined.includes('pular introducao') ||
        combined.includes('pular resumo') ||
        combined.includes('pular recapitulação') ||
        combined.includes('pular recapitulacao') ||
        combined.includes('saltar abertura') ||
        combined.includes('saltar introdução') ||
        combined.includes('saltar resumo') ||
        combined.includes('skip intro') ||
        combined.includes('skip recap') ||
        (combined.startsWith('pular') && !combined.includes('episódio') && !combined.includes('episodio')) ||
        (combined.startsWith('saltar') && !combined.includes('episódio') && !combined.includes('episodio'));

      if (isIntroOrRecap) {
        lastSkipTime = now;
        btn.click();
        console.log('[Disney+ Continuous Fullscreen] Abertura/Introdução pulada via texto:', text || aria);
        return true;
      }
    }

    return false;
  }

  // Intervalo leve para verificação periódica no player
  setInterval(() => {
    if (settings.autoSkipIntro && isPlaybackRoute()) {
      checkAndSkipIntro();
    }
  }, 600);

})();
