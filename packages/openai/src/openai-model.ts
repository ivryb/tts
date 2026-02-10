import {
  type TTSCallOptions,
  type TTSModel,
  type TTSStreamSynthesizeResult,
  type TTSSynthesizeResult,
  TTSUnsupportedFunctionalityError,
} from '@tts-sdk/provider';
import {
  assertOk,
  combineHeaders,
  headersToRecord,
  parseProviderOptions,
  postJson,
  readResponseBodyAsChunks,
  responseToUint8Array,
} from '@tts-sdk/provider-utils';
import type { FetchFunction } from '@tts-sdk/provider-utils';
import {
  openAITTSProviderOptionsSchema,
  resolveOpenAIVoice,
  type OpenAIVoice,
} from './openai-options';

export type OpenAIModelConfig = {
  provider: string;
  modelId: string;
  baseURL: string;
  headers: () => Record<string, string>;
  fetch: FetchFunction;
};

export type OpenAITTSCallOptions = Omit<TTSCallOptions, 'voice'> & {
  voice?: OpenAIVoice;
};

export class OpenAITTSModel implements TTSModel<OpenAITTSCallOptions> {
  readonly capabilities = {
    supportsStreaming: true,
    supportsTimestamps: false,
    supportsSsml: false,
    supportsVoiceCloning: false,
  } as const;

  readonly provider: string;
  readonly modelId: string;

  constructor(private readonly config: OpenAIModelConfig) {
    this.provider = config.provider;
    this.modelId = config.modelId;
  }

  private buildBody(options: TTSCallOptions): Record<string, unknown> {
    const openAIOptions = parseProviderOptions({
      provider: 'openai',
      providerOptions: options.providerOptions,
      schema: openAITTSProviderOptionsSchema,
    });

    return {
      model: this.modelId,
      input: options.text,
      voice: resolveOpenAIVoice(options.voice),
      response_format: options.outputFormat ?? 'mp3',
      speed: options.speed,
      instructions: options.instructions,
      ...(openAIOptions?.extraBody ?? {}),
    };
  }

  async doSynthesize(options: OpenAITTSCallOptions): Promise<TTSSynthesizeResult>;
  async doSynthesize(options: TTSCallOptions): Promise<TTSSynthesizeResult> {
    if (options.ssml) {
      throw new TTSUnsupportedFunctionalityError('ssml');
    }

    const body = this.buildBody(options);
    const response = await postJson({
      fetch: this.config.fetch,
      url: `${this.config.baseURL}/audio/speech`,
      body,
      headers: combineHeaders(this.config.headers(), options.headers),
      abortSignal: options.abortSignal,
    });

    await assertOk(response, 'OpenAI TTS request');

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
    options: OpenAITTSCallOptions,
  ): Promise<TTSStreamSynthesizeResult>;
  async doStreamSynthesize(
    options: TTSCallOptions,
  ): Promise<TTSStreamSynthesizeResult> {
    if (options.ssml) {
      throw new TTSUnsupportedFunctionalityError('ssml');
    }

    const body = this.buildBody(options);
    const response = await postJson({
      fetch: this.config.fetch,
      url: `${this.config.baseURL}/audio/speech`,
      body,
      headers: combineHeaders(this.config.headers(), options.headers),
      abortSignal: options.abortSignal,
    });

    await assertOk(response, 'OpenAI TTS stream request');

    return {
      audioStream: (async function* () {
        if (!response.body) {
          const full = await response.arrayBuffer();
          yield { chunk: new Uint8Array(full), isFinal: true };
          return;
        }

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
}
