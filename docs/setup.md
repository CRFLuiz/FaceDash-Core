# Setup e Execução

## Pré-requisitos
- Docker e Docker Compose instalados.
- Navegador moderno (Chrome/Firefox/Edge).

## Como Rodar
A infraestrutura é gerenciada externamente pela pasta `FaceDash-Infra`.

1. Navegue até `../FaceDash-Infra`.
2. Execute:
   ```bash
   docker-compose up --build
   ```
3. Acesse (via HTTPS):
   - Arena: https://localhost:3000/arena
   - Studio: https://localhost:3000/studio
   
   *Nota: Como os certificados são auto-assinados, aceite o aviso de segurança do navegador.*

## Troubleshooting
- **Tela Branca na Arena:** Verifique se o `phaser.min.js` está carregando. O servidor agora serve este arquivo localmente.
- **Câmera Bloqueada no Studio:** Certifique-se de estar usando `https://` e não `http://`. Navegadores modernos bloqueiam WebRTC em conexões inseguras (exceto localhost).
