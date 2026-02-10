import { describe, expect, it, vi } from 'vitest';
import {
  TTSNoAudioGeneratedError,
  TTSUnsupportedFunctionalityError,
  type TTSModel,
  type TTSSynthesizeResult,
  type TTSTimestampedSynthesizeResult,
} from '@tts-sdk/provider';
import { streamSynthesize } from './stream-synthesize';
import { synthesize } from './synthesize';
import { synthesizeWithTimestamps } from './synthesize-with-timestamps';

function createBaseSynthesizeResult(audio: Uint8Array): TTSSynthesizeResult {
  return {
    audio,
    mediaType: 'audio/mpeg',
    warnings: [],
    response: {
      timestamp: new Date(),
      modelId: 'test-model',
      headers: {},
    },
  };
}

function createBaseTimestampedResult(
  audio: Uint8Array,
): TTSTimestampedSynthesizeResult {
  return {
    ...createBaseSynthesizeResult(audio),
    words: [],
    segments: [],
  };
}

function createModel(overrides?: Partial<TTSModel>): TTSModel {
  return {
    provider: 'test-provider',
    modelId: 'test-model',
    capabilities: {
      supportsStreaming: true,
      supportsTimestamps: true,
      supportsSsml: true,
      supportsVoiceCloning: false,
    },
    doSynthesize: vi.fn(async () =>
      createBaseSynthesizeResult(Uint8Array.from([1, 2, 3])),
    ),
    doStreamSynthesize: vi.fn(async () => ({
      audioStream: (async function* () {
        yield { chunk: Uint8Array.from([1]) };
        yield { chunk: new Uint8Array(0), isFinal: true };
      })(),
      mediaType: 'audio/mpeg',
      warnings: [],
      response: {
        timestamp: new Date(),
        modelId: 'test-model',
        headers: {},
      },
    })),
    doSynthesizeWithTimestamps: vi.fn(async () =>
      createBaseTimestampedResult(Uint8Array.from([1])),
    ),
    ...overrides,
  };
}

describe('core synthesize pipeline', () => {
  it('maps options once and forwards them to doSynthesize', async () => {
    const model = createModel();

    await synthesize({
      model,
      text: 'hello',
      voice: 'voice-a',
      language: 'en',
      speed: 1.1,
      outputFormat: 'mp3',
      sampleRate: 44100,
      providerOptions: {
        openai: { extraBody: { style: 'calm' } },
      },
      headers: { 'x-test': '1' },
    });

    expect(model.doSynthesize).toHaveBeenCalledTimes(1);
    expect(model.doSynthesize).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'hello',
        voice: 'voice-a',
        language: 'en',
        speed: 1.1,
        outputFormat: 'mp3',
        sampleRate: 44100,
        headers: { 'x-test': '1' },
      }),
    );
  });

  it('fails stream calls when streaming is unsupported', async () => {
    const model = createModel({
      capabilities: {
        supportsStreaming: false,
        supportsTimestamps: true,
        supportsSsml: true,
        supportsVoiceCloning: false,
      },
      doStreamSynthesize: undefined,
    });

    await expect(
      streamSynthesize({
        model,
        text: 'hello',
      }),
    ).rejects.toBeInstanceOf(TTSUnsupportedFunctionalityError);
  });

  it('fails timestamp calls when no audio is generated', async () => {
    const model = createModel({
      doSynthesizeWithTimestamps: vi.fn(async () =>
        createBaseTimestampedResult(new Uint8Array(0)),
      ),
    });

    await expect(
      synthesizeWithTimestamps({
        model,
        text: 'hello',
      }),
    ).rejects.toBeInstanceOf(TTSNoAudioGeneratedError);
  });
});
