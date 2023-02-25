//------------------------------------------------------------//
//      Copyright (c) MineSuperior, All rights reserved.      //
//------------------------------------------------------------//

/**
 * A google cloud platform speech-to-text api key.
 * @link [dashboard](https://console.cloud.google.com/apis/credentials)
 */
export type SpeechToTextApiKey = string;

/**
 * A stripped down representation of the payload returned by the google cloud platform speech-to-text api.
 * @link [docs](https://cloud.google.com/speech-to-text/docs/reference/rest/v1/speech/recognize#response-body)
 */
export type SpeechToTextApiResponsePayload = {
    results: {
        alternatives: {
            transcript: string; // The recognized text.
            confidence: number; // A number in the inclusive range of (0.0, 1.0).
        }[];
        isFinal: boolean; // Whether the transcription is final.
    }[];
    totalBilledTime: string; // A duration in seconds with up to nine fractional digits, ending with 's'. Example: "3.5s".
};
