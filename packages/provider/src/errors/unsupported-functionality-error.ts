import { TTSSDKError } from './tts-sdk-error';

const name = 'TTS_UnsupportedFunctionalityError';
const marker = `tts.error.${name}`;
const symbol = Symbol.for(marker);

export class TTSUnsupportedFunctionalityError extends TTSSDKError {
  private readonly [symbol] = true;
  readonly functionality: string;

  constructor(functionality: string, message?: string) {
    super({
      name,
      message: message ?? `'${functionality}' functionality is not supported.`,
    });
    this.functionality = functionality;
  }

  static isInstance(error: unknown): error is TTSUnsupportedFunctionalityError {
    return TTSSDKError.hasMarker(error, marker);
  }
}
