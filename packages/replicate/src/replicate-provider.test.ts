import { describe, expect, it, vi } from 'vitest';
import { TTSInvalidArgumentError } from '@tts-sdk/provider';
import { createReplicate } from './replicate-provider';
import {
  MINIMAX_SPEECH_02_TURBO_MODEL,
  replicateCustomSpeechModelId,
  replicateCustomVoice,
  type ReplicateSpeechModelId,
} from './replicate-options';

type MockRoute = {
  method: string;
  url: string;
  response: (request: {
    input: RequestInfo | URL;
    init?: RequestInit;
  }) => Response | Promise<Response>;
};

function createFetchMock(routes: MockRoute[]) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const url = String(input);

    const route = routes.find(candidate => {
      return candidate.method === method && candidate.url === url;
    });

    if (!route) {
      throw new Error(`Unexpected request: ${method} ${url}`);
    }

    return route.response({ input, init });
  });
}

function sseStream(payload: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(payload));
      controller.close();
    },
  });
}

describe('replicate provider', () => {
  it('creates models via speech, speechModel and minimax helper', () => {
    const provider = createReplicate({ apiToken: 'token' });

    expect(provider.speech(replicateCustomSpeechModelId('owner/model')).modelId).toBe(
      'owner/model',
    );
    expect(
      provider.speechModel(replicateCustomSpeechModelId('owner/model')).modelId,
    ).toBe('owner/model');
    expect(provider.minimaxSpeech02Turbo().modelId).toBe(MINIMAX_SPEECH_02_TURBO_MODEL);
  });

  it('rejects unknown plain model id', () => {
    const provider = createReplicate({ apiToken: 'token' });

    expect(() => provider.speech('owner/model' as ReplicateSpeechModelId)).toThrow(
      TTSInvalidArgumentError,
    );
  });

  it('doSynthesize returns audio for succeeded prediction', async () => {
    const fetchMock = createFetchMock([
      {
        method: 'POST',
        url: 'https://api.replicate.com/v1/models/minimax/speech-02-turbo/predictions',
        response: async () =>
          new Response(
            JSON.stringify({
              id: 'pred-1',
              status: 'succeeded',
              output: 'https://files.example/audio.mp3',
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
      },
      {
        method: 'GET',
        url: 'https://files.example/audio.mp3',
        response: async () =>
          new Response(Uint8Array.from([1, 2, 3]), {
            status: 200,
            headers: { 'content-type': 'audio/mpeg' },
          }),
      },
    ]);

    const provider = createReplicate({ apiToken: 'token', fetch: fetchMock });
    const result = await provider
      .minimaxSpeech02Turbo()
      .doSynthesize({ text: 'hello world' });

    expect(Array.from(result.audio)).toEqual([1, 2, 3]);
  });

  it('doStreamSynthesize returns streamed audio chunks', async () => {
    const base64 = Buffer.from([7, 8, 9]).toString('base64');
    const fetchMock = createFetchMock([
      {
        method: 'POST',
        url: 'https://api.replicate.com/v1/models/minimax/speech-02-turbo/predictions',
        response: async () =>
          new Response(
            JSON.stringify({
              id: 'pred-2',
              status: 'starting',
              urls: {
                stream: 'https://stream.example/pred-2',
                get: 'https://api.replicate.com/v1/predictions/pred-2',
              },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
      },
      {
        method: 'GET',
        url: 'https://stream.example/pred-2',
        response: async () =>
          new Response(
            sseStream(`data: {"audio":"${base64}"}\n\ndata: [DONE]\n\n`),
            {
              status: 200,
              headers: { 'content-type': 'text/event-stream' },
            },
          ),
      },
    ]);

    const provider = createReplicate({ apiToken: 'token', fetch: fetchMock });
    const result = await provider
      .minimaxSpeech02Turbo()
      .doStreamSynthesize({ text: 'hello world' });

    const chunks: Array<{ chunk: number[]; isFinal?: boolean }> = [];
    for await (const part of result.audioStream) {
      chunks.push({ chunk: Array.from(part.chunk), isFinal: part.isFinal });
    }

    expect(chunks).toEqual([
      { chunk: [7, 8, 9], isFinal: undefined },
      { chunk: [], isFinal: true },
    ]);
  });

  it('doSynthesizeWithTimestamps returns parsed SRT segments', async () => {
    const fetchMock = createFetchMock([
      {
        method: 'POST',
        url: 'https://api.replicate.com/v1/models/minimax/speech-02-turbo/predictions',
        response: async () =>
          new Response(
            JSON.stringify({
              id: 'pred-3',
              status: 'succeeded',
              output: {
                audio: 'https://files.example/audio2.mp3',
                subtitle: 'https://files.example/audio2.srt',
              },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
      },
      {
        method: 'GET',
        url: 'https://files.example/audio2.mp3',
        response: async () =>
          new Response(Uint8Array.from([11, 12]), {
            status: 200,
            headers: { 'content-type': 'audio/mpeg' },
          }),
      },
      {
        method: 'GET',
        url: 'https://files.example/audio2.srt',
        response: async () =>
          new Response(
            `1\n00:00:00,000 --> 00:00:00,400\nHello\n\n2\n00:00:00,500 --> 00:00:00,900\nworld\n`,
            {
              status: 200,
              headers: { 'content-type': 'text/plain' },
            },
          ),
      },
    ]);

    const provider = createReplicate({ apiToken: 'token', fetch: fetchMock });
    const result = await provider
      .minimaxSpeech02Turbo()
      .doSynthesizeWithTimestamps({ text: 'hello world' });

    expect(Array.from(result.audio)).toEqual([11, 12]);
    expect(result.segments.map(segment => segment.text)).toEqual(['Hello', 'world']);
  });

  it('rejects unknown plain MiniMax voice', async () => {
    const provider = createReplicate({ apiToken: 'token' });

    await expect(
      provider
        .minimaxSpeech02Turbo()
        .doSynthesize({ text: 'hello world', voice: 'UnknownVoice' as any }),
    ).rejects.toBeInstanceOf(TTSInvalidArgumentError);
  });

  it('allows explicit custom MiniMax voice helper', async () => {
    const fetchMock = createFetchMock([
      {
        method: 'POST',
        url: 'https://api.replicate.com/v1/models/minimax/speech-02-turbo/predictions',
        response: async ({ init }) => {
          const body = JSON.parse(String(init?.body));
          expect(body.input.voice_id).toBe('custom_voice_id');

          return new Response(
            JSON.stringify({
              id: 'pred-custom-voice',
              status: 'succeeded',
              output: 'https://files.example/custom-voice.mp3',
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        },
      },
      {
        method: 'GET',
        url: 'https://files.example/custom-voice.mp3',
        response: async () =>
          new Response(Uint8Array.from([1]), {
            status: 200,
            headers: { 'content-type': 'audio/mpeg' },
          }),
      },
    ]);

    const provider = createReplicate({ apiToken: 'token', fetch: fetchMock });
    await provider.minimaxSpeech02Turbo().doSynthesize({
      text: 'hello world',
      voice: replicateCustomVoice('custom_voice_id'),
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
