import { Client, Events, GatewayIntentBits } from 'discord.js';
import { config } from './config.js';
import { handleCommand } from './commands.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
let shuttingDown = false;

client.once(Events.ClientReady, ready => {
  console.log(`[READY] Bot conectado como ${ready.user.tag} (${ready.user.id}).`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) await handleCommand(interaction);
});

client.on(Events.Error, error => console.error('[DISCORD] Erro do cliente:', error));
process.on('unhandledRejection', reason => console.error('[PROCESS] Rejeição não tratada:', reason));
process.on('uncaughtException', error => {
  console.error('[PROCESS] Exceção não tratada:', error);
  process.exit(1);
});

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[SHUTDOWN] Recebido ${signal}; encerrando conexão.`);
  client.destroy();
  process.exit(0);
}
process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

await client.login(config.DISCORD_TOKEN);
