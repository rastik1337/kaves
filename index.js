const { REST, Routes, Client } = require('discord.js');
const {
    joinVoiceChannel,
    VoiceConnectionStatus,
    entersState,
    createAudioPlayer,
    NoSubscriberBehavior,
    createAudioResource,
    AudioPlayerStatus,
    getVoiceConnection
} = require('@discordjs/voice');

const commands = [
    {
        name: 'kafe',
        description: 'co to je kafe?'
    },
    {
        name: 'diskaves',
        description: 'fuj to neni káves, to je kafe'
    }
];
const { TOKEN, CLIENT_ID } = require('./config.json');
const path = require('path');
const client = new Client({
    intents: [
        'Guilds',
        'GuildMessages',
        'GuildMembers',
        'GuildPresences',
        'GuildVoiceStates',
        'GuildWebhooks',
        'MessageContent',
    ]
});
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Refreshing slash commands...');

        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

        console.log('Done.');
    } catch (error) {
        console.error(error);
    }
})();

client.on('ready', () => {
    console.log(client.user.tag);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'diskaves') {
        if (interaction.member.voice.channel) {
            if (getVoiceConnection(interaction.member.voice.channel.guild.id)) {
                if(interaction.member.voice.channel.id === getVoiceConnection(interaction.member.voice.channel.guild.id).joinConfig.channelId) {
                    getVoiceConnection(interaction.member.voice.channel.guild.id).destroy();
                    return interaction.reply('ty kurvo, tohle mi nedělej');
                }
                return interaction.reply('vole, nejsi ve stejný roomce ty zmrdečku');
            }
            return interaction.reply('nemam se odkud odpojit ty zmrde');
        } 
        return interaction.reply('ty píčůsku, nejsi v roomce, nehehehe');
    }
    if (commandName === 'kafe') {
        const { channel } = interaction.member.voice;
        if (channel) {
            if(!channel.permissionsFor(client.user).has('Connect')) return interaction.reply('ty chcanko dej mi práva!')
            if (getVoiceConnection(channel.guild.id)) return interaction.reply('už jsem tu, nechci se opakovat, ty sráčko!');
            await interaction.reply('nevim co je to kafe');
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });
            let loop = () => {
                const player = createAudioPlayer();
                const motivational_song = createAudioResource(path.join(__dirname, '/audio/kaves.mp3'));
                connection.subscribe(player);
                player.play(motivational_song);
                player.on(AudioPlayerStatus.Idle, () => {
                    loop();
                });
            }
            connection.on(VoiceConnectionStatus.Ready, () => {
                const intro = createAudioResource(path.join(__dirname, '/audio/jedine_kaves.mp3'));
                const player = createAudioPlayer();
                player.play(intro);
                connection.subscribe(player);

                player.on(AudioPlayerStatus.Idle, () => {
                    loop();
                });
            });

            connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
                try {
                    oldState.subscription.player ? oldState.subscription.player.stop() : null;
                    newState.subscription.player.stop();
                    await Promise.race([
                        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                    ]);
                } catch (error) {
                    connection.destroy();
                }
            });
        } else {
            await interaction.reply('koukej se napojit do roomky, ty chcanko vole!');
        }
    }
})

client.login(TOKEN);
