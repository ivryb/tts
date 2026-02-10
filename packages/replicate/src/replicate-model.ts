import {
  type TTSCallOptions,
  type TTSModel,
  type TTSStreamSynthesizeResult,
  type TTSSynthesizeResult,
  type TTSTimestampedSynthesizeResult,
  TTSAPICallError,
  TTSUnsupportedFunctionalityError,
} from '@tts-sdk/provider';
import {
  assertOk,
  decodeBase64,
  parseProviderOptions,
  parseSrt,
  postJson,
  readSSEAudioChunks,
  responseToUint8Array,
} from '@tts-sdk/provider-utils';
import type { FetchFunction } from '@tts-sdk/provider-utils';
import {
  minimaxProviderOptionsSchema,
  replicateProviderOptionsSchema,
  resolveReplicateVoice,
  type ReplicateVoice,
} from './replicate-options';
import type { ReplicatePrediction } from './replicate-types';

type ReplicateModelConfig = {
  provider: string;
  modelId: string;
  baseURL: string;
  headers: () => Record<string, string>;
  fetch: FetchFunction;
};

export type ReplicateTTSCallOptions = Omit<TTSCallOptions, 'voice'> & {
  voice?: ReplicateVoice;
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isUrl(value: string): boolean {
  return /^https?:\/\//.test(value);
}

function extractAudioRef(output: unknown): string | undefined {
  if (typeof output === 'string') {
    return output;
  }

  if (Array.isArray(output)) {
    const firstString = output.find(item => typeof item === 'string');
    return firstString as string | undefined;
  }

  if (output && typeof output === 'object') {
    const obj = output as Record<string, unknown>;

    for (const key of ['audio', 'audio_url', 'url', 'output']) {
      const value = obj[key];
      if (typeof value === 'string') {
        return value;
      }
    }
  }

  return undefined;
}

function extractSubtitleRef(output: unknown): string | undefined {
  if (!output || typeof output !== 'object') {
    return undefined;
  }

  const obj = output as Record<string, unknown>;
  for (const key of ['subtitle', 'subtitles', 'subtitle_url']) {
    const value = obj[key];
    if (typeof value === 'string') {
      return value;
    }
  }

  return undefined;
}

async function readAudioFromRef({
  ref,
  fetch,
  headers,
}: {
  ref: string;
  fetch: FetchFunction;
  headers: Record<string, string>;
}): Promise<Uint8Array> {
  if (ref.startsWith('data:')) {
    const base64 = ref.split(',')[1] ?? '';
    return decodeBase64(base64);
  }

  if (!isUrl(ref)) {
    return decodeBase64(ref);
  }

  const response = await fetch(ref, {
    method: 'GET',
    headers,
  });
  await assertOk(response, 'Replicate audio download');
  return responseToUint8Array(response);
}

async function readSubtitleFromRef({
  ref,
  fetch,
  headers,
}: {
  ref: string;
  fetch: FetchFunction;
  headers: Record<string, string>;
}): Promise<string | undefined> {
  if (!ref) {
    return undefined;
  }

  if (!isUrl(ref)) {
    return ref;
  }

  const response = await fetch(ref, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    return undefined;
  }

  return response.text();
}

export class ReplicateTTSModel implements TTSModel<ReplicateTTSCallOptions> {
  readonly capabilities = {
    supportsStreaming: true,
    supportsTimestamps: true,
    supportsSsml: false,
    supportsVoiceCloning: true,
  } as const;

  readonly provider: string;
  readonly modelId: string;

  constructor(private readonly config: ReplicateModelConfig) {
    this.provider = config.provider;
    this.modelId = config.modelId;
  }

  private buildPredictionRequest(options: TTSCallOptions): {
    url: string;
    body: Record<string, unknown>;
  } {
    const replicateOptions = parseProviderOptions({
      provider: 'replicate',
      providerOptions: options.providerOptions,
      schema: replicateProviderOptionsSchema,
    });

    const minimaxOptions = parseProviderOptions({
      provider: 'minimax',
      providerOptions: options.providerOptions,
      schema: minimaxProviderOptionsSchema,
    });

    const input: Record<string, unknown> = {
      text: options.text,
      ...(replicateOptions?.input ?? {}),
    };

    const voice = resolveReplicateVoice({
      voice: options.voice,
      modelId: this.modelId,
    });
    if (voice) {
      input.voice = voice;
      input.voice_id = voice;
    }

    if (options.outputFormat) {
      input.format = options.outputFormat;
    }

    if (options.speed != null) {
      input.speed = options.speed;
    }

    if (minimaxOptions?.voiceId) {
      input.voice_id = minimaxOptions.voiceId;
    }

    if (minimaxOptions?.subtitleEnable != null) {
      input.subtitle_enable = minimaxOptions.subtitleEnable;
    }

    if (minimaxOptions?.extraInput) {
      Object.assign(input, minimaxOptions.extraInput);
    }

    const commonBody: Record<string, unknown> = {
      input,
      webhook: replicateOptions?.webhook,
      webhook_events_filter: replicateOptions?.webhookEventsFilter,
    };

    if (this.modelId.includes(':')) {
      return {
        url: `${this.config.baseURL}/predictions`,
        body: {
          ...commonBody,
          version: this.modelId,
        },
      };
    }

    const [owner, ...nameParts] = this.modelId.split('/');
    if (!owner || nameParts.length === 0) {
      throw new TTSAPICallError({
        message: `Invalid Replicate model id '${this.modelId}'. Expected 'owner/model' or 'version'.`,
      });
    }

    const name = nameParts.join('/');
    return {
      url: `${this.config.baseURL}/models/${owner}/${name}/predictions`,
      body: commonBody,
    };
  }

  private async createPrediction(
    options: TTSCallOptions,
    extraBody?: Record<string, unknown>,
  ): Promise<ReplicatePrediction> {
    const { url, body } = this.buildPredictionRequest(options);

    const response = await postJson({
      fetch: this.config.fetch,
      url,
      body: {
        ...body,
        ...(extraBody ?? {}),
      },
      headers: this.config.headers(),
      abortSignal: options.abortSignal,
    });

    await assertOk(response, 'Replicate prediction create');
    return response.json() as Promise<ReplicatePrediction>;
  }

  private async pollPrediction({
    prediction,
    abortSignal,
    timeoutMs = 90_000,
  }: {
    prediction: ReplicatePrediction;
    abortSignal?: AbortSignal;
    timeoutMs?: number;
  }): Promise<ReplicatePrediction> {
    const startedAt = Date.now();
    let current = prediction;

    while (
      current.status === 'starting' ||
      current.status === 'processing'
    ) {
      if (abortSignal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }

      if (Date.now() - startedAt > timeoutMs) {
        throw new TTSAPICallError({
          message: `Replicate prediction '${current.id}' timed out.`,
        });
      }

      const response = await this.config.fetch(
        `${this.config.baseURL}/predictions/${current.id}`,
        {
          method: 'GET',
          headers: this.config.headers(),
          signal: abortSignal,
        },
      );

      await assertOk(response, 'Replicate prediction poll');
      current = (await response.json()) as ReplicatePrediction;
      await sleep(800);
    }

    if (current.status !== 'succeeded') {
      throw new TTSAPICallError({
        message: `Replicate prediction failed: ${current.error ?? current.status}`,
        responseBody: current,
      });
    }

    return current;
  }

  async doSynthesize(options: ReplicateTTSCallOptions): Promise<TTSSynthesizeResult>;
  async doSynthesize(options: TTSCallOptions): Promise<TTSSynthesizeResult> {
    const created = await this.createPrediction(options);
    const done = await this.pollPrediction({
      prediction: created,
      abortSignal: options.abortSignal,
    });

    const audioRef = extractAudioRef(done.output);
    if (!audioRef) {
      throw new TTSAPICallError({
        message: 'Replicate prediction did not return audio output.',
        responseBody: done,
      });
    }

    const audio = await readAudioFromRef({
      ref: audioRef,
      fetch: this.config.fetch,
      headers: this.config.headers(),
    });

    return {
      audio,
      mediaType: 'audio/mpeg',
      warnings: [],
      response: {
        timestamp: new Date(),
        modelId: this.modelId,
        body: done,
      },
    };
  }

  async doStreamSynthesize(
    options: ReplicateTTSCallOptions,
  ): Promise<TTSStreamSynthesizeResult>;
  async doStreamSynthesize(
    options: TTSCallOptions,
  ): Promise<TTSStreamSynthesizeResult> {
    const created = await this.createPrediction(options, { stream: true });

    if (!created.urls?.stream) {
      throw new TTSUnsupportedFunctionalityError(
        'streamSynthesize',
        `Replicate model '${this.modelId}' does not expose a stream URL.`,
      );
    }

    const streamResponse = await this.config.fetch(created.urls.stream, {
      method: 'GET',
      headers: this.config.headers(),
      signal: options.abortSignal,
    });

    await assertOk(streamResponse, 'Replicate stream connect');
    const config = this.config;

    return {
      audioStream: (async function* () {
        let yielded = false;

        for await (const chunk of readSSEAudioChunks(streamResponse)) {
          yielded = true;
          yield { chunk };
        }

        if (!yielded) {
          const finalPrediction = await (async () => {
            if (!created.urls?.get) {
              return undefined;
            }

            const response = await config.fetch(created.urls.get, {
              headers: config.headers(),
            });
            if (!response.ok) {
              return undefined;
            }
            return (await response.json()) as ReplicatePrediction;
          })();

          const audioRef = finalPrediction ? extractAudioRef(finalPrediction.output) : undefined;
          if (audioRef) {
            const audio = await readAudioFromRef({
              ref: audioRef,
              fetch: config.fetch,
              headers: config.headers(),
            });
            yield { chunk: audio };
          }
        }

        yield { chunk: new Uint8Array(0), isFinal: true };
      })(),
      mediaType: 'audio/mpeg',
      warnings: [],
      response: {
        timestamp: new Date(),
        modelId: this.modelId,
      },
    };
  }

  async doSynthesizeWithTimestamps(
    options: ReplicateTTSCallOptions,
  ): Promise<TTSTimestampedSynthesizeResult>;
  async doSynthesizeWithTimestamps(
    options: TTSCallOptions,
  ): Promise<TTSTimestampedSynthesizeResult> {
    const created = await this.createPrediction(options, {
      input: {
        ...(this.buildPredictionRequest(options).body.input as Record<string, unknown>),
        subtitle_enable: true,
      },
    });

    const done = await this.pollPrediction({
      prediction: created,
      abortSignal: options.abortSignal,
    });

    const audioRef = extractAudioRef(done.output);
    if (!audioRef) {
      throw new TTSAPICallError({
        message: 'Replicate prediction did not return audio output.',
        responseBody: done,
      });
    }

    const subtitleRef = extractSubtitleRef(done.output);

    const [audio, subtitleText] = await Promise.all([
      readAudioFromRef({
        ref: audioRef,
        fetch: this.config.fetch,
        headers: this.config.headers(),
      }),
      subtitleRef
        ? readSubtitleFromRef({
            ref: subtitleRef,
            fetch: this.config.fetch,
            headers: this.config.headers(),
          })
        : Promise.resolve(undefined),
    ]);

    const segments = subtitleText ? parseSrt(subtitleText) : [];

    return {
      audio,
      mediaType: 'audio/mpeg',
      warnings: [],
      response: {
        timestamp: new Date(),
        modelId: this.modelId,
        body: done,
      },
      segments,
      words: [],
    };
  }
}
