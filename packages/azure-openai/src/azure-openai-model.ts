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
  postJson,
  readResponseBodyAsChunks,
  responseToUint8Array,
} from '@tts-sdk/provider-utils';
import type { FetchFunction } from '@tts-sdk/provider-utils';
import {
  resolveAzureOpenAIVoice,
  type AzureOpenAIVoice,
} from './azure-openai-options';

export type AzureOpenAIModelConfig = {
  provider: string;
  deploymentId: string;
  baseURL: string;
  apiVersion: string;
  headers: () => Promise<Record<string, string>>;
  fetch: FetchFunction;
};

export type AzureOpenAITTSCallOptions = Omit<TTSCallOptions, 'voice'> & {
  voice?: AzureOpenAIVoice;
};

export class AzureOpenAITTSModel implements TTSModel<AzureOpenAITTSCallOptions> {
  readonly capabilities = {
    supportsStreaming: true,
    supportsTimestamps: false,
    supportsSsml: false,
    supportsVoiceCloning: false,
  } as const;

  readonly provider: string;
  readonly modelId: string;

  constructor(private readonly config: AzureOpenAIModelConfig) {
    this.provider = config.provider;
    this.modelId = config.deploymentId;
  }

  private buildUrl(): string {
    const path = `/deployments/${this.modelId}/audio/speech`;
    const query = new URLSearchParams({ 'api-version': this.config.apiVersion });
    return `${this.config.baseURL}${path}?${query.toString()}`;
  }

  private buildBody(options: TTSCallOptions): Record<string, unknown> {
    return {
      input: options.text,
      voice: resolveAzureOpenAIVoice(options.voice),
      response_format: options.outputFormat ?? 'mp3',
      speed: options.speed,
      instructions: options.instructions,
    };
  }

  async doSynthesize(options: AzureOpenAITTSCallOptions): Promise<TTSSynthesizeResult>;
  async doSynthesize(options: TTSCallOptions): Promise<TTSSynthesizeResult> {
    if (options.ssml) {
      throw new TTSUnsupportedFunctionalityError('ssml');
    }

    const response = await postJson({
      fetch: this.config.fetch,
      url: this.buildUrl(),
      body: this.buildBody(options),
      headers: combineHeaders(await this.config.headers(), options.headers),
      abortSignal: options.abortSignal,
    });

    await assertOk(response, 'Azure OpenAI TTS request');

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
    options: AzureOpenAITTSCallOptions,
  ): Promise<TTSStreamSynthesizeResult>;
  async doStreamSynthesize(
    options: TTSCallOptions,
  ): Promise<TTSStreamSynthesizeResult> {
    if (options.ssml) {
      throw new TTSUnsupportedFunctionalityError('ssml');
    }

    const response = await postJson({
      fetch: this.config.fetch,
      url: this.buildUrl(),
      body: this.buildBody(options),
      headers: combineHeaders(await this.config.headers(), options.headers),
      abortSignal: options.abortSignal,
    });

    await assertOk(response, 'Azure OpenAI TTS stream request');

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
}
