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
  - **Mecânicas de Jogo:**
    - **Funil:** Paredes estáticas superiores para direcionar o spawn.
    - **Pegs (Pinos):** Obstáculos estáticos circulares com alta restituição (bounciness) para espalhar as bolinhas.
    - **Spinners (Ventiladores):** Pás giratórias cinemáticas (Kinematic Bodies) que giram constantemente para empurrar as bolinhas, ignorando gravidade.
    - **Paredes Laterais:** Obstáculos estáticos vermelhos nas laterais inferiores para conter as bolinhas.
    - **Score Zone:** Sensor invisível na base que detecta as bolinhas, atribui 10 pontos ao jogador e remove a bolinha.
  - **Assets:** Texturas carregadas via Base64 (players) ou geradas dinamicamente (partículas).
  - **Assets Locais:** `phaser.min.js` servido localmente para evitar dependências externas.
- **Screen 2 (Studio):**
  - **Stack:** HTML5 + WebRTC (getUserMedia).
  - **Funcionalidade:** Captura foto, recorta em canvas circular e envia ao servidor.
  - **Requisito:** HTTPS obrigatório para acesso à câmera em redes externas.
