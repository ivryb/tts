import { TTSSDKError } from './tts-sdk-error';

const name = 'TTS_LoadApiKeyError';
const marker = `tts.error.${name}`;
const symbol = Symbol.for(marker);

export class TTSLoadApiKeyError extends TTSSDKError {
  private readonly [symbol] = true;

  constructor(message: string) {
    super({ name, message });
  }

  static isInstance(error: unknown): error is TTSLoadApiKeyError {
    return TTSSDKError.hasMarker(error, marker);
  }
}
