import type { TTSResponseMetadata } from '../tts-types';
import { TTSSDKError } from './tts-sdk-error';

const name = 'TTS_NoAudioGeneratedError';
const marker = `tts.error.${name}`;
const symbol = Symbol.for(marker);

export class TTSNoAudioGeneratedError extends TTSSDKError {
  private readonly [symbol] = true;
  readonly responses: TTSResponseMetadata[];

  constructor(responses: TTSResponseMetadata[]) {
    super({ name, message: 'No audio was generated.' });
    this.responses = responses;
  }

  static isInstance(error: unknown): error is TTSNoAudioGeneratedError {
    return TTSSDKError.hasMarker(error, marker);
  }
}
