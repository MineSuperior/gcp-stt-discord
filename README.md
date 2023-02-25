# gcp-stt-discord

Google Cloud Platform Speech-To-Text for Discord

## About

This is a helper library for extending the discord.js and discord.js voice libraries to support easy access to speech-to-text processing via the Google Cloud Platform.

The advantage of this library is that it provides a simple interface for processing speech-to-text data from Discord users.

## Copyright & Licensing

This codebase is licensed under the [MIT License](./LICENSE.md).

## Contributing

Open-source contributions to this project are encouraged.

Please open an issue or pull request if you would like to contribute.

## Installation

This library is not published to npm.

To install this library, you must use the following command:

```
npm i github:@minesuperior/gcp-stt-discord
```

## Documentation

Only the most commonly used features are documented here.

Other features can be found in the source code or via your editor's autocomplete.

<details>

<summary>Click to expand</summary>

### `attachSpeechEvent`

Attaches custom event listeners to the client.

This should be done before the client is ready.

#### Parameters

| Name      | Type                       | Description                             |
|-----------|----------------------------|-----------------------------------------|
| `options` | `AttachSpeechEventOptions` | Options for attaching the speech event. |

##### `AttachSpeechEventOptions`

| Name                  | Type                                          | Description                                                                |
|-----------------------|-----------------------------------------------|----------------------------------------------------------------------------|
| `key`                 | `string`                                      | The Google Cloud Platform API key.                                         |
| `client`              | `Discord.Client`                              | The discord.js client.                                                     |
| `shouldProcessUserId` | `(discordUserId: string) => Promise<boolean>` | A promise that should return true if the user's voice should be processed. |

#### Returns

`void`

### `Events`

The events emitted by the discord.js client injected by this library.

| Name           | Parameters     | Description                            |
|----------------|----------------|----------------------------------------|
| `Error`        | `SpeechError`  | Emitted when an error occurs.          |
| `VoiceMessage` | `VoiceMessage` | Emitted when a user finishes speaking. |

### `SpeechError`

An error that occurred within this library or dependencies.

| Name      | Type              | Description                                   |
|-----------|-------------------|-----------------------------------------------|
| `code`    | `SpeechErrorCode` | A custom error code provided by this library. |
| `message` | `string`          | The error message.                            |
| `error`   | `Error`           | The error that occurred.                      |

#### `SpeechErrorCode`

| Name                           | Description                                           |
|--------------------------------|-------------------------------------------------------|
| `NetworkRequest`               | An error occurred while making a network request.     |
| `NetworkResponse`              | An error occurred while receiving a network response. |
| `CreateVoiceMessage`           | An error occurred while creating a voice message.     |
| `VoiceConnectionStatusTimeout` | The voice connection status did not change in time.   |
| `OpusStream`                   | An error occurred within an opus stream.              |

### `VoiceMessage`

A voice message is an instance of a user's voice data.

#### Properties

| Name         | Type                           | Description                                             |
|--------------|--------------------------------|---------------------------------------------------------|
| `client`     | `Discord.Client`               | The discord.js client.                                  |
| `userId`     | `string`                       | The user's identifier.                                  |
| `channelId`  | `string`                       | The channel's identifier.                               |
| `connection` | `DiscordVoice.VoiceConnection` | The voice connection.                                   |
| `monoBuffer` | `Buffer`                       | The audio represented as a 48kHz PCM mono audio buffer. |
| `duration`   | `number`                       | The duration of the voice message in seconds.           |

#### Methods

| Name        | Parameters | Return Type                               | Description                                     |
|-------------|------------|-------------------------------------------|-------------------------------------------------|
| `recognize` | n/a        | `Promise<SpeechToTextApiResponsePayload>` | A promise to resolve a transcribe from GCP STT. |

#### `SpeechToTextApiResponsePayload`

Refer to the Google Cloud Platform's Speech-To-Text Api's [documentation](https://cloud.google.com/speech-to-text/docs/reference/rest/v1/speech/recognize#response-body) for more information.

</details>

## Example

This example assumes that you are using Discord.js v14, and Discord.js voice 0.14.

<details>

<summary>Click to expand</summary>

```typescript
import * as Discord from 'discord.js';

import * as DiscordSpeechRecognition from '@minesuperior/gcp-stt-discord';

//------------------------------------------------------------//

const gcp_stt_api_key = process.env.GCP_STT_API_KEY as string | undefined;
if (!gcp_stt_api_key?.length) throw new Error('GCP_STT_API_KEY is not set');

const discord_bot_token = process.env.DISCORD_BOT_TOKEN as string | undefined;
if (!discord_bot_token?.length) throw new Error('DISCORD_BOT_TOKEN is not set');

//------------------------------------------------------------//

const discord_client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildVoiceStates,
  ],
});

// Attaches custom event listeners to the client.
// This should be done before the client is ready.
DiscordSpeechRecognition.attachSpeechEvent({
  key: gcp_stt_api_key,
  client: discord_client,
  shouldProcessUserId: (userId) => {
    // Assuming that the bot is currently in a voice channel with a user,
    // every time that a user in the voice channel starts speaking,
    // this function will be called to check if the user's voice should be processed

    // You should ignore bots, system accounts, and people who do not want to be processed.
    // That includes preventing this bot from processing its own voice.

    // Due to laws such as GDPR, it is highly recommended to
    // have users opt-in to your bot's speech recognition.

    // return true to process the user's voice.
    // return false to not process the user's voice.

    return true; // process all users
  },
});

//------------------------------------------------------------//

client.on(DiscordSpeechRecognition.Events.Error, (speechError: DiscordSpeechRecognition.SpeechError) => {
  // It is highly recommended to only listen to errors that you care about.
  // Use `speechError.code` and the enum `SpeechErrorCode` to filter.
});

client.on(DiscordSpeechRecognition.Events.VoiceMessage, (voiceMessage: DiscordSpeechRecognition.VoiceMessage) => {
  // This event is fired every time a user finishes speaking.
  // The `voiceMessage` parameter contains the user's voice data.
  // You should check the duration of the voice message to make sure it isn't too short or too long.

  if (
    voiceMessage.duration < 1 ||
    voiceMessage.duration > 30
  ) return; // voice message is too short or too long

  const { results, totalBilledTime } = await voiceMessage.recognize();

  const [ firstResult ] = results;
  if (!firstResult) return; // first result is not present

  if (!firstResult.isFinal) return; // result is not final (not done processing)

  const [ firstAlternative ] = firstResult.alternatives;
  if (!firstAlternative) return; // first alternative is not present

  const { transcript, confidence } = firstAlternative;

  // do something with the `transcript`, `confidence`, and `totalBilledTime`
});

client.on(Discord.Events.ClientReady, () => {
  // have the bot join a voice channel somehow
  // then, the bot will start processing voice messages
});

//------------------------------------------------------------//

client.login(discord_bot_token);
```

</details>
