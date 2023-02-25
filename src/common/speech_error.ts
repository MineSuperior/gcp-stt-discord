//------------------------------------------------------------//
//      Copyright (c) MineSuperior, All rights reserved.      //
//------------------------------------------------------------//

/**
 * A set of expected error codes to be returned by this library.
 */
export enum SpeechErrorCode {
    /**
     * Errors related to making the network request to the google cloud platform speech-to-text api.
     * Any HTTP status code other than `200` is considered a network request error.
     */
    NetworkRequest = 'NetworkRequest',
    /**
     * Errors encountered when parsing the response from the google cloud platform speech-to-text api.
     */
    NetworkResponse = 'NetworkResponse',
    /**
     * Errors concerning the creation of a voice message.
     */
    CreateVoiceMessage = 'CreateVoiceMessage',
    /**
     * Errors when a voice connection state fails to enter a specific state within a certain amount of time.
     */
    VoiceConnectionStatusTimeout = 'VoiceConnectionStatusTimeout',
    /**
     * Any errors encountered by the opus audio receiver stream for discord voice connections.
     */
    OpusStream = 'OpusStream',
}

//------------------------------------------------------------//

/**
 * A custom error class used by this library to allow users of this library to handle errors easily.
 */
export class SpeechError {
    public readonly name = 'SpeechError';

    protected constructor(
        public readonly code: SpeechErrorCode,
        public readonly error: Error,
        public readonly details?: unknown,
    ) {
        // TypeScript is nice enough to automatically set the parameters as properties for this instance
    }

    public static from(
        code: SpeechErrorCode,
        error: SpeechError | Error | string,
        details?: unknown, // can literally be anything
    ): SpeechError {
        if (error instanceof SpeechError) return error;

        if (error instanceof Error) return new SpeechError(code, error);

        return new SpeechError(code, new Error(error), details);
    }
}
