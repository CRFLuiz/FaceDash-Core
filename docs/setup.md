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
3. Acesse:
   - Arena: http://localhost:3000/arena
   - Studio: http://localhost:3000/studio

## Desenvolvimento
- O container roda com `nodemon`, então alterações nos arquivos `.js` e `.html` reiniciam o servidor ou são servidas imediatamente (para arquivos estáticos, um refresh na página é necessário).
