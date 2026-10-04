# 📺 Disney+ Continuous Fullscreen

Extensão para Google Chrome (Manifest V3) desenvolvida para resolver o problema de saída automática de tela cheia ao assistir séries no Disney+ quando o episódio termina e o próximo inicia.

---

## 🚀 Como Funciona a Solução

No Disney+, quando um episódio acaba:
1. O React desmonta o elemento do player de vídeo antigo. Como esse elemento estava em tela cheia, o navegador encerrava o modo fullscreen.
2. O script interno do player executava `document.exitFullscreen()` na limpeza do componente.

**A extensão neutraliza esse comportamento:**
* **Elevação para Raiz (`document.documentElement`):** A tela cheia é aplicada no documento como um todo. Quando o vídeo antigo é destruído e o novo é montado, o navegador **não sai de tela cheia**.
* **Bloqueio de Saída Automática:** Intercepta chamadas de `exitFullscreen()` geradas pelos scripts do Disney+ durante a troca de episódios.
* **Saída Manual Preservada:** Você pode sair de tela cheia a qualquer momento usando a tecla **ESC** (gerenciada nativamente pelo Chrome) ou clicando no botão de voltar/sair do player.

---

## 🛠️ Passo a Passo para Instalação no Chrome

1. Abra o Google Chrome.
2. Na barra de endereços, acesse:
   ```
   chrome://extensions/
   ```
3. No canto superior direito, ative a chave **"Modo do desenvolvedor"** (Developer mode).
4. No canto superior esquerdo, clique no botão **"Carregar sem compactação"** (Load unpacked).
5. Selecione a pasta onde os arquivos estão localizados:
   ```
   C:\Users\lira_\Documents\Extesao
   ```
6. A extensão **Disney+ Continuous Fullscreen** aparecerá na sua lista de extensões ativas.

---

## 🎬 Como Testar

1. Acesse o site [Disney+](https://www.disneyplus.com) e faça login.
2. Escolha qualquer série com múltiplos episódios e dê Play.
3. Coloque o vídeo em tela cheia (pelo botão do player ou pressionando a tecla **F**).
4. Avance a barra de progresso para os últimos 20 segundos do episódio.
5. Deixe a contagem regressiva de "Próximo Episódio" terminar ou clique nela.
6. **Resultado:** O novo episódio começará imediatamente em tela cheia, sem retornar à janela normal!

---

## ⌨️ Atalhos e Recursos Adicionais

* **Tecla F:** Alterna rapidamente entre tela cheia e modo janela.
* **Duplo Clique:** Dois cliques rápidos sobre a área do vídeo alternam tela cheia.
* **Ocultar Cursor após 3s:** A seta do mouse desaparece automaticamente após 3 segundos de inatividade durante a reprodução, reaparecendo instantaneamente ao menor movimento.
* **Pular Abertura e Introdução:** Detecta e clica automaticamente nos botões "Pular Abertura", "Pular Introdução" e "Pular Resumo" assim que surgem na tela.
* **Tecla ESC:** Encerra a tela cheia imediatamente.
* **Popup de Configurações:** Clique no ícone da extensão ao lado da barra de endereços para ativar ou desativar qualquer um dos recursos.

---

## 📁 Estrutura de Arquivos

```
Extesao/
├── manifest.json              # Configuração Manifest V3
├── icons/                     # Ícones da extensão (16, 48, 128)
├── src/
│   ├── content/
│   │   ├── inject.js          # Script executado no contexto MAIN da página
│   │   ├── content.js         # Script no contexto isolado com atalhos e sync
│   │   └── styles.css         # CSS para manter proporção 100vw x 100vh
│   └── popup/
│       ├── popup.html         # Menu popup
│       ├── popup.css          # Estilo visual moderno
│       └── popup.js           # Persistência de configurações
└── README.md
```
