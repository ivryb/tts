import { describe, expect, it, vi } from 'vitest';
import { TTSInvalidArgumentError } from '@tts-sdk/provider';
import { createAzureOpenAI } from './azure-openai-provider';
import { azureOpenAICustomVoice } from './azure-openai-options';

function createByteStream(chunks: number[][]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(Uint8Array.from(chunk));
      }
      controller.close();
    },
  });
}

describe('azure-openai provider', () => {
  it('creates speech model via speech and speechModel', () => {
    const provider = createAzureOpenAI({
      resourceName: 'resource',
      apiKey: 'key',
      deploymentId: 'dep-1',
    });

    expect(provider.speech().modelId).toBe('dep-1');
    expect(provider.speechModel().modelId).toBe('dep-1');
  });

  it('rejects empty deployment id', () => {
    expect(() =>
      createAzureOpenAI({
        resourceName: 'resource',
        apiKey: 'key',
        deploymentId: '   ',
      }),
    ).toThrow(TTSInvalidArgumentError);
  });

  it('uses deployment id from createAzureOpenAI options', () => {
    const provider = createAzureOpenAI({
      resourceName: 'resource',
      apiKey: 'key',
      deploymentId: 'dep-default',
    });

    expect(provider.speech().modelId).toBe('dep-default');
    expect(provider.speechModel().modelId).toBe('dep-default');
  });

  it('uses deployment id from environment', () => {
    const previousDeploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_ID;
    process.env.AZURE_OPENAI_DEPLOYMENT_ID = 'dep-env';

    try {
      const provider = createAzureOpenAI({
        resourceName: 'resource',
        apiKey: 'key',
      });

      expect(provider.speech().modelId).toBe('dep-env');
    } finally {
      if (previousDeploymentId === undefined) {
        delete process.env.AZURE_OPENAI_DEPLOYMENT_ID;
      } else {
        process.env.AZURE_OPENAI_DEPLOYMENT_ID = previousDeploymentId;
      }
    }
  });

  it('uses legacy deployment id environment variable alias', () => {
    const previousDeploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_ID;
    const previousLegacyDeploymentId = process.env.AZURE_DEPLOYMENT_ID;
    delete process.env.AZURE_OPENAI_DEPLOYMENT_ID;
    process.env.AZURE_DEPLOYMENT_ID = 'dep-legacy-env';

    try {
      const provider = createAzureOpenAI({
        resourceName: 'resource',
        apiKey: 'key',
      });

      expect(provider.speech().modelId).toBe('dep-legacy-env');
    } finally {
      if (previousDeploymentId === undefined) {
        delete process.env.AZURE_OPENAI_DEPLOYMENT_ID;
      } else {
        process.env.AZURE_OPENAI_DEPLOYMENT_ID = previousDeploymentId;
      }

      if (previousLegacyDeploymentId === undefined) {
        delete process.env.AZURE_DEPLOYMENT_ID;
      } else {
        process.env.AZURE_DEPLOYMENT_ID = previousLegacyDeploymentId;
      }
    }
  });

  it('throws if deployment id is missing in options and env', () => {
    const previousDeploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_ID;
    const previousLegacyDeploymentId = process.env.AZURE_DEPLOYMENT_ID;
    delete process.env.AZURE_OPENAI_DEPLOYMENT_ID;
    delete process.env.AZURE_DEPLOYMENT_ID;

    try {
      expect(() =>
        createAzureOpenAI({
          resourceName: 'resource',
          apiKey: 'key',
        }),
      ).toThrow(TTSInvalidArgumentError);
    } finally {
      if (previousDeploymentId === undefined) {
        delete process.env.AZURE_OPENAI_DEPLOYMENT_ID;
      } else {
        process.env.AZURE_OPENAI_DEPLOYMENT_ID = previousDeploymentId;
      }

      if (previousLegacyDeploymentId === undefined) {
        delete process.env.AZURE_DEPLOYMENT_ID;
      } else {
        process.env.AZURE_DEPLOYMENT_ID = previousLegacyDeploymentId;
      }
    }
  });

  it('doSynthesize works with default api version and api-key auth', async () => {
    const previousApiVersion = process.env.AZURE_API_VERSION;
    delete process.env.AZURE_API_VERSION;

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(url).toContain(
        '/openai/deployments/dep-1/audio/speech?api-version=2024-02-15-preview',
      );
      expect((init?.headers as Record<string, string>)['api-key']).toBe('key');

      return new Response(Uint8Array.from([1, 2]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createAzureOpenAI({
      resourceName: 'resource',
      apiKey: 'key',
      deploymentId: 'dep-1',
      fetch: fetchMock,
    });

    try {
      const result = await provider.speech().doSynthesize({ text: 'hello' });
      expect(Array.from(result.audio)).toEqual([1, 2]);
    } finally {
      if (previousApiVersion === undefined) {
        delete process.env.AZURE_API_VERSION;
      } else {
        process.env.AZURE_API_VERSION = previousApiVersion;
      }
    }
  });

  it('doSynthesize works with bearer token auth', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>).Authorization).toBe(
        'Bearer token-123',
      );

      return new Response(Uint8Array.from([3]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createAzureOpenAI({
      resourceName: 'resource',
      getToken: async () => 'token-123',
      deploymentId: 'dep-1',
      fetch: fetchMock,
    });

    await provider.speech().doSynthesize({ text: 'hello' });
  });

  it('doStreamSynthesize streams chunks', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(createByteStream([[7], [8, 9]]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createAzureOpenAI({
      resourceName: 'resource',
      apiKey: 'key',
      deploymentId: 'dep-1',
      fetch: fetchMock,
    });

    const result = await provider.speech().doStreamSynthesize({ text: 'hello' });

    const chunks: Array<{ chunk: number[]; isFinal?: boolean }> = [];
    for await (const part of result.audioStream) {
      chunks.push({ chunk: Array.from(part.chunk), isFinal: part.isFinal });
    }

    expect(chunks).toEqual([
      { chunk: [7], isFinal: undefined },
      { chunk: [8, 9], isFinal: undefined },
      { chunk: [], isFinal: true },
    ]);
  });

  it('supports endpoint without /openai suffix', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain(
        'https://resource.openai.azure.com/openai/deployments/dep-1/audio/speech',
      );

      return new Response(Uint8Array.from([5]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createAzureOpenAI({
      endpoint: 'https://resource.openai.azure.com/',
      apiKey: 'key',
      deploymentId: 'dep-1',
      fetch: fetchMock,
    });

    const result = await provider.speech().doSynthesize({ text: 'hello' });
    expect(Array.from(result.audio)).toEqual([5]);
  });

  it('rejects unknown plain voice', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(Uint8Array.from([1]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createAzureOpenAI({
      resourceName: 'resource',
      apiKey: 'key',
      deploymentId: 'dep-1',
      fetch: fetchMock,
    });

    await expect(
      provider.speech().doSynthesize({
        text: 'hello',
        voice: 'my-voice' as any,
      }),
    ).rejects.toBeInstanceOf(TTSInvalidArgumentError);
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it('allows explicit custom voice helper', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.voice).toBe('my-voice');

      return new Response(Uint8Array.from([1]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createAzureOpenAI({
      resourceName: 'resource',
      apiKey: 'key',
      deploymentId: 'dep-1',
      fetch: fetchMock,
    });

    await provider.speech().doSynthesize({
      text: 'hello',
      voice: azureOpenAICustomVoice('my-voice'),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
