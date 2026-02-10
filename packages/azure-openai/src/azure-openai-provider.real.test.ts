import { describe, expect, it } from 'vitest';
import { createAzureOpenAI } from './azure-openai-provider';

function must(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

describe('azure-openai provider (real)', () => {
  const deploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_ID ?? 'openai-tts';
  const provider = createAzureOpenAI({
    endpoint: process.env.AZURE_ENDPOINT,
    apiVersion: process.env.AZURE_API_VERSION,
    apiKey: must('AZURE_API_KEY'),
    deploymentId,
  });

  const voice = 'alloy';

  it(
    'doSynthesize returns real audio',
    async () => {
      const result = await provider.speech().doSynthesize({
        text: 'Real Azure OpenAI TTS synth test.',
        voice,
      });

      expect(result.audio.length).toBeGreaterThan(0);
    },
    120000,
  );

  it(
    'doStreamSynthesize returns real chunks',
    async () => {
      const result = await provider.speech().doStreamSynthesize({
        text: 'Real Azure OpenAI TTS stream test.',
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
});
