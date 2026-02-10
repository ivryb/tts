# @tts-sdk/tts

Type-safe TypeScript SDK for text-to-speech across multiple providers.

This README is the canonical documentation for the whole library.

## Contents

- [Packages](#packages)
- [Install](#install)
- [Quick start](#quick-start)
- [Core APIs](#core-apis)
- [Common options](#common-options)
- [Capabilities and SDK limits](#capabilities-and-sdk-limits)
- [Provider options shape](#provider-options-shape)
- [OpenAI provider](#openai-provider)
- [ElevenLabs provider](#elevenlabs-provider)
- [Azure OpenAI provider](#azure-openai-provider)
- [Qwen provider](#qwen-provider)
- [Replicate provider](#replicate-provider)
- [Provider registry and custom providers](#provider-registry-and-custom-providers)
- [Error handling](#error-handling)
- [Testing](#testing)

## Packages

- `@tts-sdk/tts`: core API (`synthesize`, `streamSynthesize`, `synthesizeWithTimestamps`, safe wrappers, registry helpers)
- `@tts-sdk/provider`: provider interfaces and typed errors
- `@tts-sdk/provider-utils`: shared helpers for provider implementations
- `@tts-sdk/openai`
- `@tts-sdk/elevenlabs`
- `@tts-sdk/azure-openai`
- `@tts-sdk/qwen`
- `@tts-sdk/replicate`

## Install

```bash
npm i @tts-sdk/tts @tts-sdk/openai
```

Install only the provider packages you use.

## Quick start

```ts
import { synthesize } from '@tts-sdk/tts';
import { createOpenAI } from '@tts-sdk/openai';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

const result = await synthesize({
  model: openai.speech('gpt-4o-mini-tts'),
  text: 'Hello from TTS SDK',
});

console.log(result.mediaType);
console.log(result.audio.length);
```

## Core APIs

All core methods accept `SynthesizeOptions` and work with any provider model.

### `synthesize(options)`

Generate full audio in one response.

```ts
import { synthesize } from '@tts-sdk/tts';

const res = await synthesize({
  model: openai.speech('tts-1'),
  text: 'One-shot audio generation',
});
```

### `streamSynthesize(options)`

Generate audio as an async stream of chunks.

```ts
import { streamSynthesize } from '@tts-sdk/tts';

const res = await streamSynthesize({
  model: openai.speech('tts-1'),
  text: 'Streaming audio generation',
});

for await (const part of res.audioStream) {
  if (part.isFinal) break;
  // part.chunk is Uint8Array
}
```

### `synthesizeWithTimestamps(options)`

Generate audio with alignment data on providers/models that support timestamps.

```ts
import { synthesizeWithTimestamps } from '@tts-sdk/tts';
import { createElevenLabs, elevenLabsCustomVoiceId } from '@tts-sdk/elevenlabs';

const elevenlabs = createElevenLabs({ apiKey: process.env.ELEVENLABS_API_KEY });

const res = await synthesizeWithTimestamps({
  model: elevenlabs.speech('eleven_multilingual_v2'),
  text: 'Timestamped speech output',
  voice: elevenLabsCustomVoiceId('21m00Tcm4TlvDq8ikWAM'),
});

console.log(res.words);
console.log(res.segments);
```

### Safe wrappers (`neverthrow` Result)

- `safeSynthesize(options)`
- `safeStreamSynthesize(options)`
- `safeSynthesizeWithTimestamps(options)`

```ts
import {
  safeSynthesize,
  safeStreamSynthesize,
  safeSynthesizeWithTimestamps,
} from '@tts-sdk/tts';

const a = await safeSynthesize({ model: openai.speech('tts-1'), text: 'hello' });
if (a.isErr()) {
  console.error(a.error);
}

const b = await safeStreamSynthesize({ model: openai.speech('tts-1'), text: 'hello' });
if (b.isOk()) {
  for await (const part of b.value.audioStream) {
    if (part.isFinal) break;
  }
}

const c = await safeSynthesizeWithTimestamps({
  model: elevenlabs.speech('eleven_multilingual_v2'),
  text: 'hello',
});
if (c.isErr()) {
  console.error(c.error);
}
```

## Common options

`SynthesizeOptions` fields:

- `model`: provider model instance (required)
- `text`: non-empty string (required)
- `voice?`: provider/model-specific voice value
- `language?`: language code string
- `speed?`: positive number
- `instructions?`: free-form provider-specific guidance
- `ssml?`: SSML payload (only works where supported)
- `outputFormat?`: output format string (for example `mp3`, `wav`)
- `sampleRate?`: positive integer
- `providerOptions?`: provider-scoped options object
- `headers?`: extra request headers
- `maxRetries?`: integer `0..5`, default `2`
- `abortSignal?`: request cancellation signal

## Capabilities and SDK limits

### Provider method support

| Provider | `synthesize` | `streamSynthesize` | `synthesizeWithTimestamps` | SSML |
| --- | --- | --- | --- | --- |
| OpenAI | Yes | Yes | No | No |
| ElevenLabs | Yes | Yes | Yes | No |
| Azure OpenAI | Yes | Yes | No | No |
| Qwen | Yes | Yes | No | No |
| Replicate | Yes | Yes | Yes | No |

### SDK-enforced limits

- `text` must be non-empty.
- `speed` must be positive.
- `sampleRate` must be a positive integer.
- `maxRetries` must be `0..5` (default `2`).
- Calling unsupported features throws `TTSUnsupportedFunctionalityError`.
- Empty final audio from one-shot/timestamped APIs throws `TTSNoAudioGeneratedError`.

Provider rate limits, pricing, and quotas are controlled by each vendor and can change. See official docs in each provider section.

## Provider options shape

`providerOptions` is a map keyed by provider namespace.

```ts
providerOptions: {
  openai: { extraBody: { /* provider fields */ } },
  elevenlabs: { languageCode: 'en', seed: 7 },
  qwen: { extraBody: { /* provider fields */ } },
  replicate: { input: { /* model input */ } },
  minimax: { subtitleEnable: true }
}
```

Unknown or invalid values for a provider namespace throw `TTSInvalidArgumentError`.

## OpenAI provider

Package: `@tts-sdk/openai`

### Create provider

- `createOpenAI(settings?)`
- `openai` (default instance from env)

```ts
import { createOpenAI } from '@tts-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG,
  project: process.env.OPENAI_PROJECT,
});
```

### Provider configuration

| Setting | Type | Env fallback | Default |
| --- | --- | --- | --- |
| `apiKey` | `string` | `OPENAI_API_KEY` | required |
| `baseURL` | `string` | `OPENAI_BASE_URL` | `https://api.openai.com/v1` |
| `organization` | `string` | none | unset |
| `project` | `string` | none | unset |
| `headers` | `Record<string, string>` | none | `{}` |
| `fetch` | custom fetch fn | none | global `fetch` |
| `name` | `string` | none | `openai` |

### Available methods and helpers

- `openaiProvider.speech(modelId)`
- `openaiProvider.speechModel(modelId)` (alias of `speech`)
- `openAICustomSpeechModelId('...')`
- `openAICustomVoice('...')`

Known model ids:

- `gpt-4o-mini-tts`
- `tts-1`
- `tts-1-hd`

Known voices:

- `alloy`, `ash`, `ballad`, `coral`, `echo`, `fable`, `onyx`, `nova`, `sage`, `shimmer`, `verse`, `marin`, `cedar`

### OpenAI examples

```ts
import { synthesize, streamSynthesize } from '@tts-sdk/tts';
import {
  createOpenAI,
  openAICustomSpeechModelId,
  openAICustomVoice,
} from '@tts-sdk/openai';

const provider = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

await synthesize({
  model: provider.speech('tts-1'),
  text: 'OpenAI one-shot audio',
});

await streamSynthesize({
  model: provider.speechModel('gpt-4o-mini-tts'),
  text: 'OpenAI streamed audio',
  voice: openAICustomVoice('my-custom-voice'),
  providerOptions: {
    openai: {
      extraBody: { temperature: 0.2 },
    },
  },
});

await synthesize({
  model: provider.speech(openAICustomSpeechModelId('my-tts-model')),
  text: 'Custom OpenAI model id',
});
```

### OpenAI limits

- Supports `synthesize` and `streamSynthesize`.
- Does not support `synthesizeWithTimestamps`.
- SSML is not supported.

### Official docs

- https://developers.openai.com/api/docs/guides/text-to-speech
- https://developers.openai.com/api/reference/resources/audio/subresources/speech/methods/create

## ElevenLabs provider

Package: `@tts-sdk/elevenlabs`

### Create provider

- `createElevenLabs(settings?)`
- `elevenlabs` (default instance from env)

```ts
import { createElevenLabs } from '@tts-sdk/elevenlabs';

const elevenlabs = createElevenLabs({
  apiKey: process.env.ELEVENLABS_API_KEY,
});
```

### Provider configuration

| Setting | Type | Env fallback | Default |
| --- | --- | --- | --- |
| `apiKey` | `string` | `ELEVENLABS_API_KEY` | required |
| `baseURL` | `string` | `ELEVENLABS_BASE_URL` | `https://api.elevenlabs.io` |
| `headers` | `Record<string, string>` | none | `{}` |
| `fetch` | custom fetch fn | none | global `fetch` |
| `name` | `string` | none | `elevenlabs` |

### Available methods and helpers

- `elevenlabsProvider.speech(modelId)`
- `elevenlabsProvider.speechModel(modelId)` (alias of `speech`)
- `elevenLabsCustomSpeechModelId('...')`
- `elevenLabsCustomVoiceId('...')`

Known model ids:

- `eleven_flash_v2_5`
- `eleven_turbo_v2_5`
- `eleven_multilingual_v2`

Known voice ids in SDK list:

- `21m00Tcm4TlvDq8ikWAM`

### ElevenLabs examples

```ts
import {
  synthesize,
  streamSynthesize,
  synthesizeWithTimestamps,
} from '@tts-sdk/tts';
import {
  createElevenLabs,
  elevenLabsCustomSpeechModelId,
  elevenLabsCustomVoiceId,
} from '@tts-sdk/elevenlabs';

const provider = createElevenLabs({ apiKey: process.env.ELEVENLABS_API_KEY });

await synthesize({
  model: provider.speech('eleven_multilingual_v2'),
  text: 'ElevenLabs one-shot audio',
  voice: elevenLabsCustomVoiceId('21m00Tcm4TlvDq8ikWAM'),
});

await streamSynthesize({
  model: provider.speechModel('eleven_turbo_v2_5'),
  text: 'ElevenLabs streaming',
  voice: elevenLabsCustomVoiceId('21m00Tcm4TlvDq8ikWAM'),
  providerOptions: {
    elevenlabs: {
      languageCode: 'en',
      seed: 42,
    },
  },
});

await synthesizeWithTimestamps({
  model: provider.speech(elevenLabsCustomSpeechModelId('my-model-id')),
  text: 'ElevenLabs timestamps',
  voice: elevenLabsCustomVoiceId('21m00Tcm4TlvDq8ikWAM'),
});
```

### ElevenLabs limits

- Supports `synthesize`, `streamSynthesize`, and `synthesizeWithTimestamps`.
- SSML is not supported.
- `providerOptions.elevenlabs` validates these keys:
  - `languageCode`, `seed`, `stability`, `similarityBoost`, `style`, `useSpeakerBoost`
- Current SDK request mapping actively uses `languageCode` and `seed`.

### Official docs

- https://elevenlabs.io/docs/api-reference/text-to-speech/convert

## Azure OpenAI provider

Package: `@tts-sdk/azure-openai`

### Create provider

- `createAzureOpenAI(settings?)`
- `azureOpenAI(settings?)` (function alias of `createAzureOpenAI`)

```ts
import { createAzureOpenAI } from '@tts-sdk/azure-openai';

const azure = createAzureOpenAI({
  endpoint: process.env.AZURE_ENDPOINT,
  apiKey: process.env.AZURE_API_KEY,
  deploymentId: process.env.AZURE_OPENAI_DEPLOYMENT_ID,
});
```

Or Entra token auth:

```ts
const azure = createAzureOpenAI({
  endpoint: process.env.AZURE_ENDPOINT,
  deploymentId: process.env.AZURE_OPENAI_DEPLOYMENT_ID,
  getToken: async () => '<entra-access-token>',
});
```

### Provider configuration

| Setting | Type | Env fallback | Default |
| --- | --- | --- | --- |
| `endpoint` | `string` | `AZURE_ENDPOINT` | required unless `baseURL` or `resourceName` used |
| `baseURL` | `string` | `AZURE_ENDPOINT` | same behavior as `endpoint` |
| `resourceName` | `string` | none | required if no endpoint/baseURL provided |
| `deploymentId` | `string` | `AZURE_OPENAI_DEPLOYMENT_ID`, then `AZURE_DEPLOYMENT_ID` | required |
| `apiVersion` | `string` | `AZURE_API_VERSION` | `2024-02-15-preview` |
| `apiKey` | `string` | `AZURE_API_KEY` | required if no `getToken` |
| `getToken` | `() => Promise<string>` | none | unset |
| `headers` | `Record<string, string>` | none | `{}` |
| `fetch` | custom fetch fn | none | global `fetch` |
| `name` | `string` | none | `azure-openai` |

Notes:

- If endpoint/baseURL does not include `/openai`, the SDK appends it.
- If both `getToken` and `apiKey` are provided, token auth is used.

### Available methods and helpers

- `azureProvider.speech()`
- `azureProvider.speechModel()` (alias of `speech`)
- `azureOpenAICustomVoice('...')`

Known voices:

- `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`

### Azure OpenAI examples

```ts
import { synthesize, streamSynthesize } from '@tts-sdk/tts';
import { createAzureOpenAI, azureOpenAICustomVoice } from '@tts-sdk/azure-openai';

const provider = createAzureOpenAI({
  endpoint: process.env.AZURE_ENDPOINT,
  apiKey: process.env.AZURE_API_KEY,
  deploymentId: process.env.AZURE_OPENAI_DEPLOYMENT_ID,
});

await synthesize({
  model: provider.speech(),
  text: 'Azure one-shot audio',
  voice: azureOpenAICustomVoice('my-custom-voice'),
});

await streamSynthesize({
  model: provider.speechModel(),
  text: 'Azure streamed audio',
});
```

### Azure OpenAI limits

- Supports `synthesize` and `streamSynthesize`.
- Does not support `synthesizeWithTimestamps`.
- SSML is not supported.

### Official docs

- https://learn.microsoft.com/en-us/azure/ai-foundry/openai/reference-preview-latest

## Qwen provider

Package: `@tts-sdk/qwen`

### Create provider

- `createQwen(settings?)`
- `qwen` (default instance from env)

```ts
import { createQwen } from '@tts-sdk/qwen';

const qwen = createQwen({
  apiKey: process.env.ALIBABA_API_KEY,
  // Optional regional override:
  // baseURL: 'https://your-region/compatible-mode/v1'
});
```

### Provider configuration

| Setting | Type | Env fallback | Default |
| --- | --- | --- | --- |
| `apiKey` | `string` | `ALIBABA_API_KEY`, then `DASHSCOPE_API_KEY` | required |
| `baseURL` | `string` | `ALIBABA_BASE_URL`, then `DASHSCOPE_BASE_URL` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| `headers` | `Record<string, string>` | none | `{}` |
| `fetch` | custom fetch fn | none | global `fetch` |
| `name` | `string` | none | `qwen` |

### Available methods and helpers

- `qwenProvider.speech(modelId)`
- `qwenProvider.speechModel(modelId)` (alias of `speech`)
- `qwenCustomSpeechModelId('...')`
- `qwenCustomVoice('...')`

Known model ids:

- `qwen3-tts-flash`
- `qwen-tts`
- `qwen-tts-latest`

Known voices include:

- `Cherry`, `Ethan`, `Chelsie`, `Serena`, `Sunny`, `Vincent`, and others in `qwenKnownVoices`

### Qwen examples

```ts
import { synthesize, streamSynthesize } from '@tts-sdk/tts';
import {
  createQwen,
  qwenCustomSpeechModelId,
  qwenCustomVoice,
} from '@tts-sdk/qwen';

const provider = createQwen({ apiKey: process.env.ALIBABA_API_KEY });

await synthesize({
  model: provider.speech('qwen3-tts-flash'),
  text: 'Qwen one-shot audio',
});

await streamSynthesize({
  model: provider.speechModel('qwen-tts-latest'),
  text: 'Qwen streamed audio',
  voice: qwenCustomVoice('Cherry'),
  providerOptions: {
    qwen: {
      extraBody: {
        // Forwarded directly into provider request body
        emotion: 'happy',
      },
    },
  },
});

await synthesize({
  model: provider.speech(qwenCustomSpeechModelId('qwen-custom-tts')),
  text: 'Custom Qwen model id',
});
```

### Qwen limits

- Supports `synthesize` and `streamSynthesize`.
- Does not support `synthesizeWithTimestamps`.
- SSML is not supported.
- `providerOptions.qwen` validates keys:
  - `pitch`, `volume`, `emotion`, `extraBody`
- Current SDK request mapping actively forwards `extraBody`.

### Official docs

- https://www.alibabacloud.com/help/en/model-studio/qwen-tts-api

## Replicate provider

Package: `@tts-sdk/replicate`

### Create provider

- `createReplicate(settings?)`
- `replicate` (default instance from env)

```ts
import { createReplicate } from '@tts-sdk/replicate';

const replicate = createReplicate({
  apiToken: process.env.REPLICATE_API_TOKEN,
});
```

### Provider configuration

| Setting | Type | Env fallback | Default |
| --- | --- | --- | --- |
| `apiToken` | `string` | `REPLICATE_API_TOKEN` | required |
| `baseURL` | `string` | `REPLICATE_BASE_URL` | `https://api.replicate.com/v1` |
| `headers` | `Record<string, string>` | none | `{}` |
| `fetch` | custom fetch fn | none | global `fetch` |
| `name` | `string` | none | `replicate` |

### Available methods and helpers

- `replicateProvider.speech(modelId)`
- `replicateProvider.speechModel(modelId)` (alias of `speech`)
- `replicateProvider.minimaxSpeech02Turbo()`
- `replicateCustomSpeechModelId('...')`
- `replicateCustomVoice('...')`

Known model helper constant:

- `MINIMAX_SPEECH_02_TURBO_MODEL` (`minimax/speech-02-turbo`)

Known MiniMax voices:

- `Wise_Woman`, `Friendly_Person`, `Inspirational_girl`, `Deep_Voice_Man`, `Calm_Woman`, `Casual_Guy`, `Lively_Girl`, `Patient_Man`, `Young_Knight`, `Determined_Man`, `Lovely_Girl`, `Decent_Boy`, `Imposing_Manner`, `Elegant_Man`, `Abbess`, `Sweet_Girl_2`, `Exuberant_Girl`

### Replicate examples

```ts
import {
  synthesize,
  streamSynthesize,
  synthesizeWithTimestamps,
} from '@tts-sdk/tts';
import {
  createReplicate,
  replicateCustomSpeechModelId,
  replicateCustomVoice,
} from '@tts-sdk/replicate';

const provider = createReplicate({ apiToken: process.env.REPLICATE_API_TOKEN });

await synthesize({
  model: provider.minimaxSpeech02Turbo(),
  text: 'Replicate MiniMax one-shot audio',
});

await streamSynthesize({
  model: provider.minimaxSpeech02Turbo(),
  text: 'Replicate MiniMax stream',
  voice: replicateCustomVoice('custom_voice_id'),
});

await synthesizeWithTimestamps({
  model: provider.minimaxSpeech02Turbo(),
  text: 'Replicate timestamps via subtitles',
  providerOptions: {
    minimax: { subtitleEnable: true },
  },
});

await synthesize({
  model: provider.speech(replicateCustomSpeechModelId('owner/model')),
  text: 'Custom Replicate model',
  providerOptions: {
    replicate: {
      input: { language: 'en' },
      webhook: 'https://example.com/hook',
      webhookEventsFilter: ['completed'],
    },
  },
});
```

### Replicate limits

- Supports `synthesize`, `streamSynthesize`, and `synthesizeWithTimestamps`.
- SSML is not supported.
- Streaming requires model support for Replicate stream URL; unsupported models throw `TTSUnsupportedFunctionalityError`.
- Timestamp output depends on subtitle output availability.
- `providerOptions.replicate` validates keys:
  - `input`, `wait`, `webhook`, `webhookEventsFilter`
- `providerOptions.minimax` validates keys:
  - `subtitleEnable`, `voiceId`, `extraInput`

### Official docs

- https://replicate.com/docs/topics/predictions/create-a-prediction
- https://replicate.com/minimax/speech-02-turbo

## Provider registry and custom providers

### `createProviderRegistry({ providers, separator? })`

Create a single provider that resolves models like `"providerId:modelId"`.

```ts
import { createProviderRegistry, synthesize } from '@tts-sdk/tts';
import { createOpenAI } from '@tts-sdk/openai';
import { createElevenLabs } from '@tts-sdk/elevenlabs';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const eleven = createElevenLabs({ apiKey: process.env.ELEVENLABS_API_KEY });

const registry = createProviderRegistry({
  providers: {
    openai,
    eleven,
  },
});

const model = registry.speechModel('openai:tts-1');
await synthesize({ model, text: 'Registry-based model resolution' });
```

### `customProvider({ speechModels?, fallbackProvider? })`

Create an ad-hoc provider from a map of model ids to model instances.

```ts
import { customProvider, synthesize } from '@tts-sdk/tts';

const p = customProvider({
  speechModels: {
    demo: openai.speech('tts-1'),
  },
});

await synthesize({
  model: p.speechModel('demo'),
  text: 'Custom provider model map',
});
```

## Error handling

Typed errors are exported from `@tts-sdk/tts` (re-exported from `@tts-sdk/provider`):

- `TTSSDKError`
- `TTSLoadApiKeyError`
- `TTSNoAudioGeneratedError`
- `TTSUnsupportedFunctionalityError`
- `TTSAPICallError`
- `TTSInvalidArgumentError`
- `TTSNoSuchProviderError`
- `TTSNoSuchModelError`

Example:

```ts
import { synthesize, TTSUnsupportedFunctionalityError } from '@tts-sdk/tts';

try {
  await synthesize({
    model: openai.speech('tts-1'),
    text: 'hello',
    ssml: '<speak>hello</speak>',
  });
} catch (error) {
  if (TTSUnsupportedFunctionalityError.isInstance(error)) {
    console.error(error.functionality);
  }
}
```

## Testing

Mock/unit tests:

```bash
pnpm test
```

Real provider integration tests (uses real API keys and can incur costs):

```bash
pnpm test:real
```

Populate `.env.example` values before running real tests.

## Release workflow

This repo uses [Changesets](https://github.com/changesets/changesets) for multi-package versioning.

Create a changeset with your version intent:

```bash
pnpm changeset
```

Apply pending changesets and update package versions/changelogs:

```bash
pnpm changeset:version
```

Publish packages in dependency order (`packages/*`), skipping versions that already exist on npm:

```bash
pnpm release:publish
```

Publish as beta:

```bash
pnpm release:publish:beta
```

Preview publish actions without uploading:

```bash
pnpm release:publish:dry-run
```

Notes:

- `release:publish` skips package versions that already exist on npm.
- Prerelease versions (for example `0.2.0-beta.1`) publish with their prerelease tag by default (for example `beta`).

## Environment variable reference

```bash
# OpenAI
OPENAI_API_KEY=
OPENAI_BASE_URL=

# ElevenLabs
ELEVENLABS_API_KEY=
ELEVENLABS_BASE_URL=

# Azure OpenAI
AZURE_ENDPOINT=
AZURE_API_KEY=
AZURE_API_VERSION=
AZURE_OPENAI_DEPLOYMENT_ID=

# Qwen / DashScope
ALIBABA_API_KEY=
ALIBABA_BASE_URL=

# Optional DashScope compatibility aliases
DASHSCOPE_API_KEY=
DASHSCOPE_BASE_URL=

# Replicate
REPLICATE_API_TOKEN=
REPLICATE_BASE_URL=
```

## Docs tooling

Source docs also exist in `content/`.

Generate `llms.txt` from docs content:

```bash
pnpm docs:llms
```

Sync provider model/voice catalog artifacts (snapshot + generated OpenAI voice catalog):

```bash
pnpm providers:sync-catalogs
pnpm providers:check-catalogs
```
