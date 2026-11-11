# REEDS Bate-Ponto 2

Bot de controle de jornada para Discord, preparado para deploy na Discloud. O projeto não inclui dashboard web.

## Requisitos
- Node.js 22 ou superior (recomendado Node 24)
- Projeto Supabase com PostgreSQL
- Aplicação/bot criado no Discord Developer Portal

## Configuração
1. Copie `.env.example` para `.env` e preencha as credenciais.
2. No SQL Editor do Supabase, execute `database/schema.sql`.
3. Instale dependências: `npm install`.
4. Registre comandos: `npm run deploy:commands`.
5. Compile: `npm run build`; inicie com `npm start`.

Para registrar comandos em um servidor específico, defina `DISCORD_GUILD_ID`. Sem essa variável, os comandos são registrados globalmente.

## Comandos
- `/ponto iniciar`: abre uma sessão de trabalho.
- `/ponto finalizar`: encerra a sessão aberta.
- `/meuponto`: mostra o estado e o total de horas do dia.
- `/relatorio usuario`: consulta total acumulado no mês (gestores).
- `/config canal-log`: define o canal de registros (gestores).
- `/config cargo-gestor`: define o cargo autorizado a gerenciar o sistema.

## Discloud
Envie o projeto com `package.json`, `package-lock.json` (gerado por npm install), `discloud.config` e os fontes. O comando de build deve gerar `dist/index.js`; configure o processo para executar `npm run build && npm start` caso o painel permita build no deploy. Nunca envie o arquivo `.env`; cadastre as variáveis no ambiente seguro da hospedagem.

## Segurança e operação
- A chave Supabase service role fica somente nas variáveis de ambiente do bot.
- O bot valida permissões no servidor, não confia em IDs enviados pelo usuário.
- Sessões são persistidas no PostgreSQL e sobrevivem a reinicializações.
- Configure intents mínimos no Developer Portal: Guilds.
