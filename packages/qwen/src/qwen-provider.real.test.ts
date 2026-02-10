import { describe, expect, it } from 'vitest';
import { TTSUnsupportedFunctionalityError } from '@tts-sdk/provider';
import { createQwen } from './qwen-provider';

function mustOneOf(names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing required env var. Set one of: ${names.join(', ')}`);
}

describe('qwen provider (real)', () => {
  const provider = createQwen({
    apiKey: mustOneOf(['ALIBABA_API_KEY', 'DASHSCOPE_API_KEY']),
    baseURL: process.env.ALIBABA_BASE_URL ?? process.env.DASHSCOPE_BASE_URL,
  });

  const modelId = 'qwen3-tts-flash';

  it(
    'doSynthesize returns real audio',
    async () => {
      const result = await provider.speech(modelId).doSynthesize({
        text: 'Real Qwen TTS synth test.',
      });

      expect(result.audio.length).toBeGreaterThan(0);
    },
    120000,
  );

  it(
    'doStreamSynthesize returns real chunks',
    async () => {
      const result = await provider.speech(modelId).doStreamSynthesize({
        text: 'Real Qwen TTS stream test.',
      });

      let total = 0;
      for await (const part of result.audioStream) {
        total += part.chunk.length;
      }

      expect(total).toBeGreaterThan(0);
    },
    120000,
  );

  it(
    'doSynthesizeWithTimestamps remains unsupported',
    async () => {
      await expect(
        provider.speech(modelId).doSynthesizeWithTimestamps({
          text: 'Real Qwen timestamp test.',
        }),
      ).rejects.toBeInstanceOf(TTSUnsupportedFunctionalityError);
    },
    120000,
  );
});
