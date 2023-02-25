//------------------------------------------------------------//
//      Copyright (c) MineSuperior, All rights reserved.      //
//------------------------------------------------------------//

import { SpeechToTextApiKey } from '../types';

import { opus as PrismMediaOpus } from 'prism-media';

import { Client } from 'discord.js';

import { EndBehaviorType, getVoiceConnection, entersState, VoiceConnectionStatus } from '@discordjs/voice';

import { VoiceMessage } from './voice_message';

import { SpeechErrorCode, SpeechError } from './speech_error';

//------------------------------------------------------------//

export enum Events {
    VoiceMessage = 'MineSuperior:GoogleCloudPlatform:SpeechToText:Discord:VoiceMessage',
    Error = 'MineSuperior:GoogleCloudPlatform:SpeechToText:Discord:Error',
}

//------------------------------------------------------------//

export type AttachSpeechEventOptions = {
    key: SpeechToTextApiKey; // a google cloud platform speech-to-text api key
    client: Client<true>; // a discord client from the discord.js library
    /**
     * A callback is used to determine if the voice message should be processed.
     *
     * This is useful when complying with the European Union's General Data Protection Regulation (GDPR).
     * Voice data is considered personal data, and should only be processed with the user's consent.
     *
     * Additionally, this callback should be used to ignore the bot's own voice messages as it does not automatically.
     */
    shouldProcessUserId?: (discordUserId: string) => Promise<boolean>;
}

//------------------------------------------------------------//

type ClientId = string;

type GuildId = string;

/**
 * Keeps track of the active voice listeners grouped by client id.
 *
 * Doing it this way allows for multiple clients to be used in the same process.
 * For whatever reason you might want to do that...
 */
const activeClients = new Map<ClientId, Set<GuildId>>();

//------------------------------------------------------------//

/**
 * Performs the primary function of this library.
 * Attaches a voice listener to the client.
 * When the voice listener detects a voice message, it will be processed and emitted.
 * Listeners can be attached 
 */
export function attachSpeechEvent({
    key,
    client,
    shouldProcessUserId,
}: AttachSpeechEventOptions) {
    client.on('voiceStateUpdate', async (_oldVoiceState, newVoiceState) => {
        if (newVoiceState.id !== client.user.id) return; // ignore when the voice state update is not from the bot

        if (!activeClients.has(client.user.id)) {
            activeClients.set(client.user.id, new Set<GuildId>());
        }

        const activeGuilds = activeClients.get(client.user.id)!;

        // check if the voice listener is already active, if so, ignore.
        if (activeGuilds.has(newVoiceState.guild.id)) return;

        // add the guild id to the active voice listeners set
        activeGuilds.add(newVoiceState.guild.id);

        const connection = getVoiceConnection(newVoiceState.guild.id);
        if (!connection) return;

        if (
            connection.state.status === VoiceConnectionStatus.Destroyed
        ) {
            activeGuilds.delete(newVoiceState.guild.id);

            return; // ignore when the connection is destroyed or disconnected
        }

        try {
            // wait for the connection to be ready
            await entersState(connection, VoiceConnectionStatus.Ready, 20_000); // 20 seconds
        } catch (error) {
            client.emit(Events.Error, SpeechError.from(SpeechErrorCode.VoiceConnectionStatusTimeout, error as Error | string, 'Timed out waiting for connection to enter ready state'));

            return;
        }

        connection.receiver.speaking.on('start', async function(userId) {
            if (
                typeof shouldProcessUserId === 'function' &&
                !(await shouldProcessUserId(userId))
            ) return;

            const opusStream = connection.receiver.subscribe(userId, {
                end: {
                    behavior: EndBehaviorType.AfterSilence,
                    duration: 100, // end stream after 100ms of silence
                },
            });

            const bufferData: Uint8Array[] = [];
            opusStream.pipe(
                new PrismMediaOpus.Decoder({ rate: 48000, channels: 2, frameSize: 960 })
            ).on('data', (data: Uint8Array) => {
                bufferData.push(data);
            });

            opusStream.on('error', (error) => {
                client.emit(Events.Error, SpeechError.from(SpeechErrorCode.OpusStream, error, 'Opus Stream Error'));
            });

            opusStream.on('end', async () => {
                let voiceMessage;
                try {
                    voiceMessage = await VoiceMessage.from({
                        key: key,
                        connection: connection,
                        stereoBufferData: bufferData,
                        client: client,
                        userId: userId,
                    });
                } catch (error) {
                    client.emit(Events.Error, SpeechError.from(SpeechErrorCode.CreateVoiceMessage, error as Error | string, 'Failed to create VoiceMessage'));

                    return;
                }
                if (!voiceMessage) return;

                client.emit(Events.VoiceMessage, voiceMessage);
            });
        });
    });
}
