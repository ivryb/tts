import { TTSSDKError } from './tts-sdk-error';

const name = 'TTS_NoSuchModelError';
const marker = `tts.error.${name}`;
const symbol = Symbol.for(marker);

export class TTSNoSuchModelError extends TTSSDKError {
  private readonly [symbol] = true;
  readonly modelId: string;

  constructor(modelId: string) {
    super({
      name,
      message: `No model found for id '${modelId}'.`,
    });
    this.modelId = modelId;
  }

  static isInstance(error: unknown): error is TTSNoSuchModelError {
    return TTSSDKError.hasMarker(error, marker);
  }
}
