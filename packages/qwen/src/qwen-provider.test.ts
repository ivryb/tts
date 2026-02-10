import { afterEach, describe, expect, it, vi } from 'vitest';
import { TTSInvalidArgumentError } from '@tts-sdk/provider';
import { TTSUnsupportedFunctionalityError } from '@tts-sdk/provider';
import { createQwen } from './qwen-provider';
import {
  qwenCustomSpeechModelId,
  qwenCustomVoice,
  type QwenSpeechModelId,
} from './qwen-options';

function createTextStream(content: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(content));
      controller.close();
    },
  });
}

describe('qwen provider', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('creates speech model via speech and speechModel', () => {
    const provider = createQwen({ apiKey: 'test-key' });

    expect(provider.speech('qwen3-tts-flash').modelId).toBe('qwen3-tts-flash');
    expect(provider.speechModel('qwen3-tts-flash').modelId).toBe('qwen3-tts-flash');
  });

  it('allows explicit custom model helper', () => {
    const provider = createQwen({ apiKey: 'test-key' });

    expect(provider.speech(qwenCustomSpeechModelId('qwen3-tts-custom')).modelId).toBe(
      'qwen3-tts-custom',
    );
  });

  it('rejects unknown plain model id', () => {
    const provider = createQwen({ apiKey: 'test-key' });

    expect(() => provider.speech('qwen3-tts-custom' as QwenSpeechModelId)).toThrow(
      TTSInvalidArgumentError,
    );
  });

  it('doSynthesize returns audio', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain('/audio/speech');

      return new Response(Uint8Array.from([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createQwen({ apiKey: 'test-key', fetch: fetchMock });
    const result = await provider.speech('qwen3-tts-flash').doSynthesize({ text: 'hello' });

    expect(Array.from(result.audio)).toEqual([1, 2, 3]);
  });

  it('doStreamSynthesize parses SSE audio chunks', async () => {
    const base64 = Buffer.from([7, 8]).toString('base64');
    const sse = `data: {"audio":"${base64}"}\n\ndata: [DONE]\n\n`;

    const fetchMock = vi.fn(async () => {
      return new Response(createTextStream(sse), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      });
    });

    const provider = createQwen({ apiKey: 'test-key', fetch: fetchMock });
    const result = await provider
      .speech('qwen3-tts-flash')
      .doStreamSynthesize({ text: 'hello' });

    const chunks: Array<{ chunk: number[]; isFinal?: boolean }> = [];
    for await (const part of result.audioStream) {
      chunks.push({ chunk: Array.from(part.chunk), isFinal: part.isFinal });
    }

    expect(chunks).toEqual([
      { chunk: [7, 8], isFinal: undefined },
      { chunk: [], isFinal: true },
    ]);
  });

  it('doStreamSynthesize parses SSE audio chunks with CRLF delimiters', async () => {
    const base64 = Buffer.from([9, 10]).toString('base64');
    const sse = `data: {"audio":"${base64}"}\r\n\r\ndata: [DONE]\r\n\r\n`;

    const fetchMock = vi.fn(async () => {
      return new Response(createTextStream(sse), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      });
    });

    const provider = createQwen({ apiKey: 'test-key', fetch: fetchMock });
    const result = await provider
      .speech('qwen3-tts-flash')
      .doStreamSynthesize({ text: 'hello' });

    const chunks: Array<{ chunk: number[]; isFinal?: boolean }> = [];
    for await (const part of result.audioStream) {
      chunks.push({ chunk: Array.from(part.chunk), isFinal: part.isFinal });
    }

    expect(chunks).toEqual([
      { chunk: [9, 10], isFinal: undefined },
      { chunk: [], isFinal: true },
    ]);
  });

  it('falls back to DASHSCOPE_API_KEY when ALIBABA_API_KEY is blank', async () => {
    vi.stubEnv('ALIBABA_API_KEY', '');
    vi.stubEnv('DASHSCOPE_API_KEY', 'dashscope-key');

    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>).Authorization).toBe(
        'Bearer dashscope-key',
      );

      return new Response(Uint8Array.from([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createQwen({ fetch: fetchMock });
    await provider.speech('qwen3-tts-flash').doSynthesize({ text: 'hello' });
  });

  it('doSynthesizeWithTimestamps throws unsupported', async () => {
    const provider = createQwen({ apiKey: 'test-key' });

    await expect(
      provider.speech('qwen3-tts-flash').doSynthesizeWithTimestamps({ text: 'hello' }),
    ).rejects.toBeInstanceOf(TTSUnsupportedFunctionalityError);
  });

  it('rejects unknown plain voice', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(Uint8Array.from([1]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createQwen({ apiKey: 'test-key', fetch: fetchMock });
    await expect(
      provider.speech('qwen3-tts-flash').doSynthesize({
        text: 'hello',
        voice: 'custom-voice' as any,
      }),
    ).rejects.toBeInstanceOf(TTSInvalidArgumentError);
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it('allows explicit custom voice helper', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.voice).toBe('custom-voice');

      return new Response(Uint8Array.from([1]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createQwen({ apiKey: 'test-key', fetch: fetchMock });
    await provider.speech('qwen3-tts-flash').doSynthesize({
      text: 'hello',
      voice: qwenCustomVoice('custom-voice'),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
