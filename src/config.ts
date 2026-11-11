import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info')
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Configuração inválida:', parsed.error.flatten().fieldErrors);
  throw new Error('Verifique as variáveis de ambiente obrigatórias.');
}
export const config = parsed.data;
