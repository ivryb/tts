import { describe, expect, it } from 'vitest';
import { createElevenLabs } from './elevenlabs-provider';

function must(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

describe('elevenlabs provider (real)', () => {
  const provider = createElevenLabs({
    apiKey: must('ELEVENLABS_API_KEY'),
    baseURL: process.env.ELEVENLABS_BASE_URL,
  });

  const modelId = 'eleven_turbo_v2_5';
  const voice = '21m00Tcm4TlvDq8ikWAM';

  it(
    'doSynthesize returns real audio',
    async () => {
      const result = await provider.speech(modelId).doSynthesize({
        text: 'Real ElevenLabs synth test.',
        voice,
      });

      expect(result.audio.length).toBeGreaterThan(0);
    },
    120000,
  );

  it(
    'doStreamSynthesize returns real chunks',
    async () => {
      const result = await provider.speech(modelId).doStreamSynthesize({
        text: 'Real ElevenLabs stream test.',
        voice,
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
    'doSynthesizeWithTimestamps returns real timings',
    async () => {
      const result = await provider.speech(modelId).doSynthesizeWithTimestamps({
        text: 'Real ElevenLabs timestamp test.',
        voice,
      });

      expect(result.audio.length).toBeGreaterThan(0);
      expect(result.segments.length + result.words.length).toBeGreaterThan(0);
    },
    120000,
  );
});
