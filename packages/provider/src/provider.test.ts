import { describe, expect, it } from 'vitest';
import type { Provider } from './provider';
import type { TTSModel } from './tts-types';

describe('provider contract', () => {
  it('returns a speech model', async () => {
    const model: TTSModel = {
      provider: 'test-provider',
      modelId: 'test-model',
      capabilities: {
        supportsStreaming: false,
        supportsTimestamps: false,
        supportsSsml: false,
        supportsVoiceCloning: false,
      },
      async doSynthesize() {
        return {
          audio: Uint8Array.from([1]),
          mediaType: 'audio/mpeg',
          warnings: [],
          response: {
            timestamp: new Date(),
            modelId: 'test-model',
          },
        };
      },
    };

    const provider: Provider = {
      speechModel() {
        return model;
      },
    };

    expect(provider.speechModel('test-model')).toBe(model);
  });
});
