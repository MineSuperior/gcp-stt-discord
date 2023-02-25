//------------------------------------------------------------//
//      Copyright (c) MineSuperior, All rights reserved.      //
//------------------------------------------------------------//

import { SpeechToTextApiResponsePayload, SpeechToTextApiKey } from '../types';

import axios from 'axios';

import { SpeechError, SpeechErrorCode } from './speech_error';

//------------------------------------------------------------//

/**
 * Sends an audio buffer to the google cloud platform speech-to-text api.
 * Returns the response payload if successful.
 */
export async function resolveSpeechWithGoogleSpeechApi(
    key: SpeechToTextApiKey, // The google cloud platform speech-to-text api key
    audioBuffer: Buffer, // 48kHz PCM mono audio (potentially inaccurate, needs confirmation)
): Promise<SpeechToTextApiResponsePayload> {
    let response;
    try {
        response = await axios({
            method: 'post',
            url: 'https://speech.googleapis.com/v1/speech:recognize',
            params: {
                'key': key,
            },
            data: {
                'config': {
                    'encoding': 'LINEAR16',
                    'sampleRateHertz': 48_000,
                    'languageCode': 'en-US',
                    'enableAutomaticPunctuation': true,
                },
                'audio': {
                    'content': audioBuffer.toString('base64'),
                },
            },
            validateStatus: (status) => status === 200,
        });
    } catch (error) {
        throw SpeechError.from(SpeechErrorCode.NetworkRequest, error as Error | string);
    }

    const responseData = response.data as SpeechToTextApiResponsePayload | undefined;
    if (
        !responseData ||
        typeof responseData !== 'object' ||
        !responseData.results ||
        !Array.isArray(responseData.results)
    ) throw SpeechError.from(SpeechErrorCode.NetworkResponse, 'resolveSpeechWithGoogleSpeechApi(): response.data is invalid', response);

    return responseData;
}
