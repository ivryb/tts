import {
  type TTSCallOptions,
  type TTSModel,
  type TTSStreamSynthesizeResult,
  type TTSSynthesizeResult,
  type TTSTimestampedSynthesizeResult,
} from '@tts-sdk/provider';
import {
  assertOk,
  combineHeaders,
  decodeBase64,
  headersToRecord,
  parseProviderOptions,
  postJson,
  readResponseBodyAsChunks,
  responseToUint8Array,
} from '@tts-sdk/provider-utils';
import type { FetchFunction } from '@tts-sdk/provider-utils';
import {
  elevenLabsProviderOptionsSchema,
  resolveElevenLabsVoiceId,
  type ElevenLabsVoiceId,
} from './elevenlabs-options';

type ElevenLabsConfig = {
  provider: string;
  modelId: string;
  baseURL: string;
  headers: () => Record<string, string>;
  fetch: FetchFunction;
};

export type ElevenLabsTTSCallOptions = Omit<TTSCallOptions, 'voice'> & {
  voice?: ElevenLabsVoiceId;
};

function buildWordTimingsFromCharacters(alignment: {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}): Array<{ word: string; startMs: number; endMs: number }> {
  const words: Array<{ word: string; startMs: number; endMs: number }> = [];

  let currentWord = '';
  let currentStart = 0;
  let currentEnd = 0;

  for (let i = 0; i < alignment.characters.length; i++) {
    const ch = alignment.characters[i];

    if (ch.trim() === '') {
      if (currentWord) {
        words.push({ word: currentWord, startMs: currentStart, endMs: currentEnd });
        currentWord = '';
      }
      continue;
    }

    if (!currentWord) {
      currentStart = Math.round(alignment.character_start_times_seconds[i] * 1000);
    }

    currentWord += ch;
    currentEnd = Math.round(alignment.character_end_times_seconds[i] * 1000);
  }

  if (currentWord) {
    words.push({ word: currentWord, startMs: currentStart, endMs: currentEnd });
  }

  return words;
}

export class ElevenLabsTTSModel implements TTSModel<ElevenLabsTTSCallOptions> {
  readonly capabilities = {
    supportsStreaming: true,
    supportsTimestamps: true,
    supportsSsml: false,
    supportsVoiceCloning: true,
  } as const;

  readonly provider: string;
  readonly modelId: string;

  constructor(private readonly config: ElevenLabsConfig) {
    this.provider = config.provider;
    this.modelId = config.modelId;
  }

  private getArgs(options: TTSCallOptions): {
    voiceId: string;
    query: URLSearchParams;
    body: Record<string, unknown>;
  } {
    const providerOptions = parseProviderOptions({
      provider: 'elevenlabs',
      providerOptions: options.providerOptions,
      schema: elevenLabsProviderOptionsSchema,
    });

    const voiceId = resolveElevenLabsVoiceId(options.voice);

    const query = new URLSearchParams();
    query.set('output_format', options.outputFormat ?? 'mp3_44100_128');

    const body: Record<string, unknown> = {
      text: options.text,
      model_id: this.modelId,
    };

    if (options.language ?? providerOptions?.languageCode) {
      body.language_code = options.language ?? providerOptions?.languageCode;
    }

    if (options.speed != null) {
      body.voice_settings = {
        speed: options.speed,
      };
    }

    if (providerOptions?.seed != null) {
      body.seed = providerOptions.seed;
    }

    return { voiceId, query, body };
  }

  async doSynthesize(options: ElevenLabsTTSCallOptions): Promise<TTSSynthesizeResult>;
  async doSynthesize(options: TTSCallOptions): Promise<TTSSynthesizeResult> {
    const { voiceId, query, body } = this.getArgs(options);

    const response = await postJson({
      fetch: this.config.fetch,
      url: `${this.config.baseURL}/v1/text-to-speech/${voiceId}?${query.toString()}`,
      body,
      headers: combineHeaders(this.config.headers(), options.headers),
      abortSignal: options.abortSignal,
    });

    await assertOk(response, 'ElevenLabs TTS request');

    return {
      audio: await responseToUint8Array(response),
      mediaType: response.headers.get('content-type') ?? 'audio/mpeg',
      warnings: [],
      response: {
        timestamp: new Date(),
        modelId: this.modelId,
        headers: headersToRecord(response.headers),
      },
    };
  }

  async doStreamSynthesize(
    options: ElevenLabsTTSCallOptions,
  ): Promise<TTSStreamSynthesizeResult>;
  async doStreamSynthesize(
    options: TTSCallOptions,
  ): Promise<TTSStreamSynthesizeResult> {
    const { voiceId, query, body } = this.getArgs(options);

    const response = await postJson({
      fetch: this.config.fetch,
      url: `${this.config.baseURL}/v1/text-to-speech/${voiceId}/stream?${query.toString()}`,
      body,
      headers: combineHeaders(this.config.headers(), options.headers),
      abortSignal: options.abortSignal,
    });

    await assertOk(response, 'ElevenLabs TTS stream request');

    return {
      audioStream: (async function* () {
        for await (const chunk of readResponseBodyAsChunks(response)) {
          yield { chunk };
        }

        yield { chunk: new Uint8Array(0), isFinal: true };
      })(),
      mediaType: response.headers.get('content-type') ?? 'audio/mpeg',
      warnings: [],
      response: {
        timestamp: new Date(),
        modelId: this.modelId,
        headers: headersToRecord(response.headers),
      },
    };
  }

  async doSynthesizeWithTimestamps(
    options: ElevenLabsTTSCallOptions,
  ): Promise<TTSTimestampedSynthesizeResult>;
  async doSynthesizeWithTimestamps(
    options: TTSCallOptions,
  ): Promise<TTSTimestampedSynthesizeResult> {
    const { voiceId, query, body } = this.getArgs(options);

    const response = await postJson({
      fetch: this.config.fetch,
      url: `${this.config.baseURL}/v1/text-to-speech/${voiceId}/with-timestamps?${query.toString()}`,
      body,
      headers: combineHeaders(this.config.headers(), options.headers),
      abortSignal: options.abortSignal,
    });

    await assertOk(response, 'ElevenLabs timestamp TTS request');
    const json = (await response.json()) as {
      audio_base64: string;
      alignment?: {
        characters: string[];
        character_start_times_seconds: number[];
        character_end_times_seconds: number[];
      };
    };

    const words = json.alignment
      ? buildWordTimingsFromCharacters(json.alignment)
      : [];

    return {
      audio: decodeBase64(json.audio_base64),
      mediaType: 'audio/mpeg',
      warnings: [],
      response: {
        timestamp: new Date(),
        modelId: this.modelId,
        headers: headersToRecord(response.headers),
        body: json,
      },
      words,
      segments: words.map(word => ({
        text: word.word,
        startMs: word.startMs,
        endMs: word.endMs,
      })),
    };
  }
}
