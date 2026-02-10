import { TTSSDKError } from './tts-sdk-error';

const name = 'TTS_NoSuchProviderError';
const marker = `tts.error.${name}`;
const symbol = Symbol.for(marker);

export class TTSNoSuchProviderError extends TTSSDKError {
  private readonly [symbol] = true;
  readonly providerId: string;

  constructor(providerId: string) {
    super({
      name,
      message: `No provider found for id '${providerId}'.`,
    });
    this.providerId = providerId;
  }

  static isInstance(error: unknown): error is TTSNoSuchProviderError {
    return TTSSDKError.hasMarker(error, marker);
  }
}
