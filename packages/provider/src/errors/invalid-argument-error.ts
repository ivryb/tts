import { TTSSDKError } from './tts-sdk-error';

const name = 'TTS_InvalidArgumentError';
const marker = `tts.error.${name}`;
const symbol = Symbol.for(marker);

export class TTSInvalidArgumentError extends TTSSDKError {
  private readonly [symbol] = true;

  constructor(message: string, cause?: unknown) {
    super({ name, message, cause });
  }

  static isInstance(error: unknown): error is TTSInvalidArgumentError {
    return TTSSDKError.hasMarker(error, marker);
  }
}
