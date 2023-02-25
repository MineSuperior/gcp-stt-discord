//------------------------------------------------------------//
//      Copyright (c) MineSuperior, All rights reserved.      //
//------------------------------------------------------------//

import { SpeechToTextApiResponsePayload, SpeechToTextApiKey } from '../types';

import { Client } from 'discord.js';

import { VoiceConnection } from '@discordjs/voice';

import { resolveSpeechWithGoogleSpeechApi } from './speech_recognition';

//------------------------------------------------------------//

/**
 * The audio buffer should be 48k stereo PCM data.
 * @todo Find out if this is true
 */
export function convertStereoToMono(
    input: Buffer,
): Buffer {
    const stereoData = new Int16Array(input);

    // a mono buffer is 1/2 the size of a stereo buffer
    const monoData = new Int16Array(stereoData.length / 2);

    /**
     * The stereo buffer is interleaved,
     * so we need to skip every other sample to get the mono buffer
     * (which will become what used to be the left channel).
     * @todo Find out why this is necessary for the google speech api to work.
     */
    for (
        let stereoIndex = 0, monoIndex = 0;
        stereoIndex < stereoData.length;
        stereoIndex += 4, monoIndex += 2
    ) {
        monoData[monoIndex] = stereoData[stereoIndex];
        monoData[monoIndex + 1] = stereoData[stereoIndex + 1];
    }

    return Buffer.from(monoData);
}

/**
 * The audio buffer should be 48k mono PCM data.
 * The return value is presumably in seconds.
 * @todo Find out if this is true
 */
export function getDurationFromMonoBuffer(
    buffer: Buffer,
): number {
    return buffer.length / 48000 / 2;
}

//------------------------------------------------------------//

export type VoiceMessageConstructorOptions = {
    /** The google cloud platform speech-to-text api key */
    key: SpeechToTextApiKey;
    /** The discord client responsible for recording the voice message */
    client: Client<true>;
    /** The user id that this voice message belongs to */
    userId: string;
    /** The voice channel id that this voice message belongs to */
    channelId: string;
    /** The voice connection used */
    connection: VoiceConnection;
    /**
     * PCM mono 48k audio data
     * @todo Find out if this is true
     */
    monoBuffer: Buffer;
    /** The duration in seconds */
    duration: number;
}

export type VoiceMessageFromOptions = {
    /** The google cloud platform speech-to-text api key */
    key: SpeechToTextApiKey;
    /** The discord client responsible for recording the voice message */
    client: Client<true>;
    /** The voice connection to tap into */
    connection: VoiceConnection;
    /**
     * PCM stereo 48k audio data
     * @todo Find out if this is true
     */
    stereoBufferData: Uint8Array[];
    /** The user id that this voice message belongs to */
    userId: string;
};

//------------------------------------------------------------//

export class VoiceMessage {
    private readonly _key: string;

    protected _processed_data: SpeechToTextApiResponsePayload | undefined;

    public client;
    public userId;
    public channelId;
    public connection;
    public monoBuffer;
    public duration;

    private constructor(
        opts: VoiceMessageConstructorOptions,
    ) {
        this._key = opts.key;
        this.client = opts.client;
        this.userId = opts.userId;
        this.channelId = opts.channelId;
        this.connection = opts.connection;
        this.monoBuffer = opts.monoBuffer;
        this.duration = opts.duration;
    }

    /**
     * Creates a new VoiceMessage instance from the given parameters.
     *
     * @example
     * ```ts
     * const voiceMessage = await VoiceMessage.from(...);
     * ```
     *
     * @internal This method is intended to be used internally.
     */
    public static async from(
        opts: VoiceMessageFromOptions,
    ): Promise<VoiceMessage> {
        const channelId = opts.connection.joinConfig.channelId;
        if (!channelId) throw new Error('VoiceMessage.from: channelId is undefined');

        const stereoBuffer = Buffer.concat(opts.stereoBufferData);
        const monoBuffer = convertStereoToMono(stereoBuffer);

        const duration = getDurationFromMonoBuffer(monoBuffer);

        const voiceMessage = new VoiceMessage({
            key: opts.key,
            client: opts.client,
            userId: opts.userId,
            channelId: channelId,
            connection: opts.connection,
            monoBuffer: monoBuffer,
            duration: duration,
        });

        return voiceMessage;
    }

    /**
     * Sends the audio buffer to the Google Cloud Platform Speech-to-Text Api.
     *
     * This is useful if you want to implement some form of intermediary processing.
     *
     * If called multiple times, the cached result will be returned.
     *
     * This method can throw errors for a variety of reasons.
     *
     * @example
     * ```ts
     * const voiceMessage = await VoiceMessage.from(...);
     *
     * // ignore voice messages that are too short or too long (in seconds)
     * if (voiceMessage.duration < 1 || voiceMessage.duration > 30) return;
     *
     * const googleCloudPlatformSpeechToTextData = await voiceMessage.recognize();
     * ```
     */
    public async recognize(): Promise<SpeechToTextApiResponsePayload> {
        return this._processed_data ??= await resolveSpeechWithGoogleSpeechApi(this._key, this.monoBuffer);
    }
}
