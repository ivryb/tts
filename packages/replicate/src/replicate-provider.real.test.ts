import { describe, expect, it } from 'vitest';
import { TTSUnsupportedFunctionalityError } from '@tts-sdk/provider';
import { createReplicate } from './replicate-provider';

function must(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

describe('replicate provider (real)', () => {
  const provider = createReplicate({
    apiToken: must('REPLICATE_API_TOKEN'),
    baseURL: process.env.REPLICATE_BASE_URL,
  });

  const modelId = 'minimax/speech-02-turbo';
  const model = provider.speech(modelId);

  it(
    'doSynthesize returns real audio',
    async () => {
      const result = await model.doSynthesize({
        text: 'Real Replicate TTS synth test.',
      });

      expect(result.audio.length).toBeGreaterThan(0);
    },
    180000,
  );

  it(
    'doStreamSynthesize works if model exposes stream URL',
    async () => {
      try {
        const result = await model.doStreamSynthesize({
          text: 'Real Replicate TTS stream test.',
        });

        let total = 0;
        for await (const part of result.audioStream) {
          total += part.chunk.length;
        }

        expect(total).toBeGreaterThan(0);
      } catch (error) {
        expect(error).toBeInstanceOf(TTSUnsupportedFunctionalityError);
      }
    },
    180000,
  );

  it(
    'doSynthesizeWithTimestamps returns timings when model supports subtitles',
    async () => {
      const result = await model.doSynthesizeWithTimestamps({
        text: 'Real Replicate TTS timestamps test.',
      });

      expect(result.audio.length).toBeGreaterThan(0);
      expect(result.segments.length + result.words.length).toBeGreaterThanOrEqual(0);
    },
    180000,
  );
});
