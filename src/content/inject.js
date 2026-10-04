/**
 * Disney+ Continuous Fullscreen - Injected Script (MAIN world)
 * 
 * Intercepta chamadas de fullscreen no contexto nativo da página do Disney+ para:
 * 1. Promover o fullscreen para document.documentElement (evita fechamento na desmontagem do React).
 * 2. Bloquear chamadas automáticas de exitFullscreen disparadas pelo player na troca de episódios.
 */
(function () {
  'use strict';

  console.log('[Disney+ Continuous Fullscreen] Script injetado no contexto MAIN inicializado.');

  // Configuração padrão
  let settings = {
    continuousFullscreen: true
  };

  // Carrega configuração salva se houver
  try {
    const saved = localStorage.getItem('dplus_continuous_fs_settings');
    if (saved) {
      settings = Object.assign(settings, JSON.parse(saved));
    }
  } catch (e) {
    // Silently ignore localStorage read errors
  }

  // Recebe atualizações do content script
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'DPLUS_UPDATE_SETTINGS') {
      settings = Object.assign(settings, event.data.settings);
      try {
        localStorage.setItem('dplus_continuous_fs_settings', JSON.stringify(settings));
      } catch (e) {}
    }
  });

  const originalRequestFullscreen = Element.prototype.requestFullscreen;
  const originalExitFullscreen = Document.prototype.exitFullscreen;

  let allowExplicitExit = false;

  // Função auxiliar para checar se estamos em rota de vídeo
  function isPlaybackRoute() {
    const path = window.location.pathname;
    return path.includes('/play/') || path.includes('/video/') || !!document.querySelector('video');
  }

  // 1. Intercepta chamadas de requestFullscreen
  Element.prototype.requestFullscreen = function (...args) {
    if (!settings.continuousFullscreen) {
      return originalRequestFullscreen.apply(this, args);
    }

    // Se a chamada for feita em um container do Disney+ ou no elemento de vídeo
    const isVideoRelated = 
      this.tagName === 'VIDEO' || 
      this.querySelector('video') !== null ||
      this.classList.contains('btm-media-client') ||
      this.getAttribute('data-testid')?.includes('player') ||
      isPlaybackRoute();

    if (isVideoRelated) {
      console.log('[Disney+ Continuous Fullscreen] Redirecionando fullscreen para document.documentElement.');
      // Coloca a raiz do documento em tela cheia para ser imune à remoção de nós filhos
      return originalRequestFullscreen.call(document.documentElement, ...args);
    }

    return originalRequestFullscreen.apply(this, args);
  };

  // 2. Intercepta chamadas de exitFullscreen
  Document.prototype.exitFullscreen = function (...args) {
    if (!settings.continuousFullscreen) {
      return originalExitFullscreen.apply(this, args);
    }

    // Se estivermos em tela cheia e na rota de reprodução
    if (document.fullscreenElement && isPlaybackRoute()) {
      if (!allowExplicitExit) {
        console.log('[Disney+ Continuous Fullscreen] Bloqueada saída automática de tela cheia disparada pelo Disney+ (transição de episódio).');
        // Retorna Promise resolvida simulando sucesso sem realmente sair da tela cheia
        return Promise.resolve();
      }
    }

    return originalExitFullscreen.apply(this, args);
  };

  // 3. Monitora intenções explícitas de saída por clique em botões de fechar/voltar
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!target) return;

    // Se o usuário clicar explicitamente no botão de sair de tela cheia ou voltar do player
    const isExitButton = 
      target.closest('[data-testid="exit-fullscreen-button"]') ||
      target.closest('[aria-label*="tela cheia" i]') ||
      target.closest('[aria-label*="fullscreen" i]') ||
      target.closest('[data-testid="player-back-button"]') ||
      target.closest('[aria-label*="voltar" i]') ||
      target.closest('[aria-label*="back" i]') ||
      target.closest('button[data-testid*="close" i]');

    if (isExitButton) {
      allowExplicitExit = true;
      setTimeout(() => {
        allowExplicitExit = false;
      }, 800);
    }
  }, true);

  // Monitora tecla ESC para garantir liberação imediata
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      allowExplicitExit = true;
      setTimeout(() => {
        allowExplicitExit = false;
      }, 800);
    }
  }, true);

})();
