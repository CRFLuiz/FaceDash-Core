# Arquitetura do FaceDash Core

## Visão Geral
O **FaceDash Core** é uma aplicação monolítica (Monorepo) que serve tanto o Backend (Node.js/Express) quanto o Frontend estático (HTML/JS/Phaser).

## Backend
- **Tecnologia:** Node.js + Express + Socket.IO.
- **Protocolo:** HTTPS (Utilizando certificados auto-assinados em `/certs`).
- **Porta:** 3000 (Definida em `process.env.PORT`).
- **Rotas:**
  - `/`: Redireciona para `/studio`.
  - `/arena`: Serve `screen1.html` (Tela do Jogo).
  - `/studio`: Serve `screen2.html` (Tela de Cadastro).

## Comunicação em Tempo Real (Socket.IO)
- **Namespaces/Salas:**
  - `arena`: Sala única para a tela principal do jogo.
  - `studio`: Clientes móveis entram aqui.
- **Eventos:**
  - `identify`: Cliente se identifica como 'arena' ou 'studio'.
  - `register-player`: Studio envia dados do jogador (nome + foto base64).
  - `new-player`: Servidor avisa a Arena sobre novo jogador.
  - `player-left`: Servidor avisa a Arena que um jogador desconectou.

## Frontend
- **Screen 1 (Arena):**
  - **Stack:** Phaser 3 + Matter.js.
  - **Fluxo:** Lobby de espera -> Início manual (Botão Start) -> Jogo.
  - **Assets:** Texturas carregadas via Base64 (players) ou geradas dinamicamente (partículas).
  - **Assets Locais:** `phaser.min.js` servido localmente para evitar dependências externas.
- **Screen 2 (Studio):**
  - **Stack:** HTML5 + WebRTC (getUserMedia).
  - **Funcionalidade:** Captura foto, recorta em canvas circular e envia ao servidor.
  - **Requisito:** HTTPS obrigatório para acesso à câmera em redes externas.
