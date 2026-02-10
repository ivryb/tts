import {
  TTSInvalidArgumentError,
  type TTSCallOptions,
  type TTSModel,
  type TTSResponseMetadata,
} from '@tts-sdk/provider';
import {
  assertHasAudio,
  assertModel,
  assertSsmlSupport,
  assertStreamingSupport,
  assertTimestampSupport,
} from './assertions';
import { withRetries } from './retry';
import { synthesizeOptionsSchema } from './schemas';
import type {
  ModelCallOptions,
  SpeechResult,
  SpeechStreamResult,
  SynthesizeOptions,
  TimestampedSpeechResult,
} from './types';

function validateOptions<Model extends TTSModel>(
  options: SynthesizeOptions<Model>,
): SynthesizeOptions<Model> {
  assertModel(options.model);

  const parsed = synthesizeOptionsSchema.safeParse(options);
  if (!parsed.success) {
    throw new TTSInvalidArgumentError(parsed.error.message, parsed.error);
  }

  return options;
}

export function toCallOptions<Model extends TTSModel>(
  options: SynthesizeOptions<Model>,
): ModelCallOptions<Model> {
  return {
    text: options.text,
    voice: options.voice as TTSCallOptions['voice'],
    language: options.language,
    speed: options.speed,
    instructions: options.instructions,
    ssml: options.ssml,
    outputFormat: options.outputFormat,
    sampleRate: options.sampleRate,
    providerOptions: options.providerOptions,
    headers: options.headers,
    abortSignal: options.abortSignal,
  } as ModelCallOptions<Model>;
}

type SharedExecutionOptions<Model extends TTSModel, Result> = {
  options: SynthesizeOptions<Model>;
  assertCapabilities?: (model: Model) => void;
  run: (model: Model, callOptions: ModelCallOptions<Model>) => Promise<Result>;
  getAudioAndResponse?: (result: Result) => {
    audio: Uint8Array;
    response: TTSResponseMetadata;
  };
};

async function execute<Model extends TTSModel, Result>({
  options,
  assertCapabilities,
  run,
  getAudioAndResponse,
}: SharedExecutionOptions<Model, Result>): Promise<Result> {
  const validated = validateOptions(options);
  assertSsmlSupport(validated.model, validated.ssml);
  assertCapabilities?.(validated.model);

  const maxRetries = validated.maxRetries ?? 2;

  const result = await withRetries({
    maxRetries,
    abortSignal: validated.abortSignal,
    run: () => run(validated.model, toCallOptions(validated)),
  });

  if (getAudioAndResponse) {
    const { audio, response } = getAudioAndResponse(result);
    assertHasAudio(audio, response);
  }

  return result;
}

export function executeSynthesize<Model extends TTSModel>(
  options: SynthesizeOptions<Model>,
): Promise<SpeechResult> {
  return execute({
    options,
    run: (model, callOptions) => model.doSynthesize(callOptions),
    getAudioAndResponse: result => ({
      audio: result.audio,
      response: result.response,
    }),
  });
}

export function executeStreamSynthesize<Model extends TTSModel>(
  options: SynthesizeOptions<Model>,
): Promise<SpeechStreamResult> {
  return execute({
    options,
    assertCapabilities: assertStreamingSupport,
    run: (model, callOptions) => model.doStreamSynthesize!(callOptions),
  });
}

export function executeSynthesizeWithTimestamps<Model extends TTSModel>(
  options: SynthesizeOptions<Model>,
): Promise<TimestampedSpeechResult> {
  return execute({
    options,
    assertCapabilities: assertTimestampSupport,
    run: (model, callOptions) => model.doSynthesizeWithTimestamps!(callOptions),
    getAudioAndResponse: result => ({
      audio: result.audio,
      response: result.response,
    }),
  });
}
