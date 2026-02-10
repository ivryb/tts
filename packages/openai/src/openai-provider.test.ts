import { afterEach, describe, expect, it, vi } from 'vitest';
import { TTSInvalidArgumentError, TTSLoadApiKeyError } from '@tts-sdk/provider';
import { createOpenAI } from './openai-provider';
import {
  openAICustomSpeechModelId,
  openAICustomVoice,
  type OpenAISpeechModelId,
} from './openai-options';

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

describe('openai provider', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses default base URL when OPENAI_BASE_URL is blank', async () => {
    vi.stubEnv('OPENAI_BASE_URL', '');

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('https://api.openai.com/v1/audio/speech');

      return new Response(Uint8Array.from([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createOpenAI({ apiKey: 'test-key', fetch: fetchMock });
    await provider.speech('tts-1').doSynthesize({ text: 'hello' });
  });

  it('throws when API key is missing in both params and env', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');

    const fetchMock = vi.fn(async () => {
      return new Response(Uint8Array.from([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createOpenAI({ fetch: fetchMock });

    await expect(
      provider.speech('tts-1').doSynthesize({ text: 'hello' }),
    ).rejects.toBeInstanceOf(TTSLoadApiKeyError);
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it('creates speech model via speech and speechModel', () => {
    const provider = createOpenAI({ apiKey: 'test-key' });

    expect(provider.speech('tts-1').modelId).toBe('tts-1');
    expect(provider.speechModel('tts-1-hd').modelId).toBe('tts-1-hd');
  });

  it('allows explicit custom model id helper', () => {
    const provider = createOpenAI({ apiKey: 'test-key' });

    expect(provider.speech(openAICustomSpeechModelId('my-model')).modelId).toBe(
      'my-model',
    );
  });

  it('rejects unknown plain model id', () => {
    const provider = createOpenAI({ apiKey: 'test-key' });

    expect(() => provider.speech('my-model' as OpenAISpeechModelId)).toThrow(
      TTSInvalidArgumentError,
    );
  });

  it('doSynthesize returns audio', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe('tts-1');
      expect(body.input).toBe('hello');

      return new Response(Uint8Array.from([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createOpenAI({ apiKey: 'test-key', fetch: fetchMock });
    const result = await provider.speech('tts-1').doSynthesize({ text: 'hello' });

    expect(Array.from(result.audio)).toEqual([1, 2, 3]);
    expect(result.mediaType).toBe('audio/mpeg');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('doStreamSynthesize streams chunks', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(createByteStream([[10, 11], [12]]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createOpenAI({ apiKey: 'test-key', fetch: fetchMock });
    const result = await provider.speech('tts-1').doStreamSynthesize({ text: 'hello' });

    const chunks: Array<{ chunk: number[]; isFinal?: boolean }> = [];
    for await (const part of result.audioStream) {
      chunks.push({ chunk: Array.from(part.chunk), isFinal: part.isFinal });
    }

    expect(chunks).toEqual([
      { chunk: [10, 11], isFinal: undefined },
      { chunk: [12], isFinal: undefined },
      { chunk: [], isFinal: true },
    ]);
  });

  it('rejects unknown plain voice', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(Uint8Array.from([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createOpenAI({ apiKey: 'test-key', fetch: fetchMock });

    await expect(
      provider.speech('tts-1').doSynthesize({
        text: 'hello',
        voice: 'my-voice' as any,
      }),
    ).rejects.toBeInstanceOf(TTSInvalidArgumentError);

    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it('accepts newly added built-in voice', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.voice).toBe('ash');

      return new Response(Uint8Array.from([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createOpenAI({ apiKey: 'test-key', fetch: fetchMock });
    await provider.speech('tts-1').doSynthesize({
      text: 'hello',
      voice: 'ash',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('allows explicit custom voice helper', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.voice).toBe('my-voice');

      return new Response(Uint8Array.from([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createOpenAI({ apiKey: 'test-key', fetch: fetchMock });
    await provider.speech('tts-1').doSynthesize({
      text: 'hello',
      voice: openAICustomVoice('my-voice'),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
