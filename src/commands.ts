import {
  SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits,
  ChannelType, MessageFlags
} from 'discord.js';
import { finishSession, getSettings, getUserSummary, setGuildSetting, startSession, writeAudit } from './database.js';

export const commands = [
  new SlashCommandBuilder().setName('ponto').setDescription('Gerencie seu registro de jornada.')
    .addSubcommand(s => s.setName('iniciar').setDescription('Inicia seu expediente.'))
    .addSubcommand(s => s.setName('finalizar').setDescription('Finaliza seu expediente.')),
  new SlashCommandBuilder().setName('meuponto').setDescription('Consulte seu total de horas no mês.'),
  new SlashCommandBuilder().setName('relatorio').setDescription('Consulta o relatório mensal de um membro.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(o => o.setName('usuario').setDescription('Membro consultado.').setRequired(true)),
  new SlashCommandBuilder().setName('config').setDescription('Configura o sistema de ponto.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('canal-log').setDescription('Define o canal de registros.')
      .addChannelOption(o => o.setName('canal').setDescription('Canal de texto.').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(s => s.setName('cargo-gestor').setDescription('Define o cargo gestor.')
      .addRoleOption(o => o.setName('cargo').setDescription('Cargo autorizado.').setRequired(true)))
];

const duration = (total: number) => {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h}h ${m}min`;
};

async function isManager(interaction: ChatInputCommandInteraction, roleId: string | null) {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) || interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  if (!roleId || !interaction.inGuild()) return false;
  const member = await interaction.guild!.members.fetch(interaction.user.id);
  return member.roles.cache.has(roleId);
}

export async function handleCommand(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({ content: 'Este comando só pode ser usado em um servidor.', flags: MessageFlags.Ephemeral });
    return;
  }
  const guildId = interaction.guildId;
  try {
    const settings = await getSettings(guildId);
    if (interaction.commandName === 'ponto') {
      const action = interaction.options.getSubcommand();
      if (action === 'iniciar') {
        const result = await startSession(guildId, interaction.user.id);
        if (result.alreadyOpen) {
          await interaction.reply({ content: 'Você já possui um expediente em andamento.', flags: MessageFlags.Ephemeral });
          return;
        }
        await interaction.reply({ content: `<@${interaction.user.id}> expediente iniciado às <t:${Math.floor(Date.now() / 1000)}:t>.` });
        if (settings.log_channel_id) {
          const channel = await interaction.guild!.channels.fetch(settings.log_channel_id).catch(() => null);
          if (channel?.isTextBased() && 'send' in channel) await channel.send(`🟢 **Ponto iniciado** — <@${interaction.user.id}>.`);
        }
        await writeAudit(guildId, interaction.user.id, 'punch_started');
        return;
      }
      const result = await finishSession(guildId, interaction.user.id);
      if (!result) {
        await interaction.reply({ content: 'Não encontrei um expediente aberto para você.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.reply({ content: `🔴 Expediente finalizado. Tempo registrado: **${duration(result.seconds)}**.` });
      if (settings.log_channel_id) {
        const channel = await interaction.guild!.channels.fetch(settings.log_channel_id).catch(() => null);
        if (channel?.isTextBased() && 'send' in channel) await channel.send(`🔴 **Ponto finalizado** — <@${interaction.user.id}>: ${duration(result.seconds)}.`);
      }
      await writeAudit(guildId, interaction.user.id, 'punch_finished', undefined, { seconds: result.seconds });
      return;
    }
    if (interaction.commandName === 'meuponto' || interaction.commandName === 'relatorio') {
      const target = interaction.commandName === 'relatorio' ? interaction.options.getUser('usuario', true) : interaction.user;
      if (interaction.commandName === 'relatorio' && !(await isManager(interaction, settings.manager_role_id))) {
        await interaction.reply({ content: 'Você não tem permissão para consultar relatórios de terceiros.', flags: MessageFlags.Ephemeral });
        return;
      }
      const summary = await getUserSummary(guildId, target.id);
      await interaction.reply({ content: `📊 **Resumo de <@${target.id}>**\nTotal no mês: **${duration(summary.seconds)}**\nSituação: **${summary.active ? 'Em expediente' : 'Fora de expediente'}**`, flags: MessageFlags.Ephemeral });
      return;
    }
    if (interaction.commandName === 'config') {
      if (!(await isManager(interaction, settings.manager_role_id))) {
        await interaction.reply({ content: 'Você não tem permissão para alterar as configurações.', flags: MessageFlags.Ephemeral });
        return;
      }
      const sub = interaction.options.getSubcommand();
      if (sub === 'canal-log') {
        const channel = interaction.options.getChannel('canal', true);
        await setGuildSetting(guildId, 'log_channel_id', channel.id);
        await writeAudit(guildId, interaction.user.id, 'config_log_channel', channel.id);
        await interaction.reply({ content: `Canal de registros definido: <#${channel.id}>.`, flags: MessageFlags.Ephemeral });
      } else {
        const role = interaction.options.getRole('cargo', true);
        await setGuildSetting(guildId, 'manager_role_id', role.id);
        await writeAudit(guildId, interaction.user.id, 'config_manager_role', role.id);
        await interaction.reply({ content: `Cargo gestor definido: <@&${role.id}>.`, flags: MessageFlags.Ephemeral });
      }
    }
  } catch (error) {
    console.error('Erro ao executar comando:', error);
    const response = { content: 'Ocorreu um erro ao processar o comando. Verifique a configuração do banco e tente novamente.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) await interaction.followUp(response);
    else await interaction.reply(response);
  }
}
