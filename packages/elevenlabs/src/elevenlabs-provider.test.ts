import { describe, expect, it, vi } from 'vitest';
import { TTSInvalidArgumentError } from '@tts-sdk/provider';
import { createElevenLabs } from './elevenlabs-provider';
import {
  elevenLabsCustomSpeechModelId,
  elevenLabsCustomVoiceId,
  type ElevenLabsSpeechModelId,
} from './elevenlabs-options';

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

describe('elevenlabs provider', () => {
  it('creates speech model via speech and speechModel', () => {
    const provider = createElevenLabs({ apiKey: 'test-key' });

    expect(provider.speech('eleven_multilingual_v2').modelId).toBe(
      'eleven_multilingual_v2',
    );
    expect(provider.speechModel('eleven_turbo_v2_5').modelId).toBe(
      'eleven_turbo_v2_5',
    );
  });

  it('allows explicit custom model helper', () => {
    const provider = createElevenLabs({ apiKey: 'test-key' });

    expect(
      provider.speech(elevenLabsCustomSpeechModelId('custom-model')).modelId,
    ).toBe('custom-model');
  });

  it('rejects unknown plain model id', () => {
    const provider = createElevenLabs({ apiKey: 'test-key' });

    expect(() =>
      provider.speech('custom-model' as ElevenLabsSpeechModelId),
    ).toThrow(TTSInvalidArgumentError);
  });

  it('doSynthesize returns audio', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain('/v1/text-to-speech/voice-1');

      return new Response(Uint8Array.from([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createElevenLabs({ apiKey: 'test-key', fetch: fetchMock });
    const result = await provider
      .speech('eleven_multilingual_v2')
      .doSynthesize({ text: 'hello', voice: elevenLabsCustomVoiceId('voice-1') });

    expect(Array.from(result.audio)).toEqual([1, 2, 3]);
  });

  it('doStreamSynthesize streams chunks', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain('/stream');

      return new Response(createByteStream([[5], [6, 7]]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createElevenLabs({ apiKey: 'test-key', fetch: fetchMock });
    const result = await provider
      .speech('eleven_multilingual_v2')
      .doStreamSynthesize({
        text: 'hello',
        voice: elevenLabsCustomVoiceId('voice-1'),
      });

    const chunks: Array<{ chunk: number[]; isFinal?: boolean }> = [];
    for await (const part of result.audioStream) {
      chunks.push({ chunk: Array.from(part.chunk), isFinal: part.isFinal });
    }

    expect(chunks).toEqual([
      { chunk: [5], isFinal: undefined },
      { chunk: [6, 7], isFinal: undefined },
      { chunk: [], isFinal: true },
    ]);
  });

  it('doSynthesizeWithTimestamps returns words and segments', async () => {
    const audio = Buffer.from([8, 9, 10]).toString('base64');

    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          audio_base64: audio,
          alignment: {
            characters: ['h', 'i', ' ', 't', 'h', 'e', 'r', 'e'],
            character_start_times_seconds: [0.0, 0.05, 0.1, 0.2, 0.25, 0.3, 0.35, 0.4],
            character_end_times_seconds: [0.04, 0.09, 0.12, 0.24, 0.29, 0.34, 0.39, 0.44],
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    });

    const provider = createElevenLabs({ apiKey: 'test-key', fetch: fetchMock });
    const result = await provider
      .speech('eleven_multilingual_v2')
      .doSynthesizeWithTimestamps({
        text: 'hi there',
        voice: elevenLabsCustomVoiceId('voice-1'),
      });

    expect(Array.from(result.audio)).toEqual([8, 9, 10]);
    expect(result.words.map(word => word.word)).toEqual(['hi', 'there']);
    expect(result.segments.map(segment => segment.text)).toEqual(['hi', 'there']);
  });

  it('rejects unknown plain voice id', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(Uint8Array.from([1]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createElevenLabs({ apiKey: 'test-key', fetch: fetchMock });

    await expect(
      provider
        .speech('eleven_multilingual_v2')
        .doSynthesize({ text: 'hello', voice: 'voice-1' as any }),
    ).rejects.toBeInstanceOf(TTSInvalidArgumentError);
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it('allows explicit custom voice helper', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain('/v1/text-to-speech/voice-1');

      return new Response(Uint8Array.from([1]), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    });

    const provider = createElevenLabs({ apiKey: 'test-key', fetch: fetchMock });
    await provider.speech('eleven_multilingual_v2').doSynthesize({
      text: 'hello',
      voice: elevenLabsCustomVoiceId('voice-1'),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
