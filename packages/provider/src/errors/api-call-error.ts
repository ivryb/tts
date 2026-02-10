import { TTSSDKError } from './tts-sdk-error';

const name = 'TTS_ApiCallError';
const marker = `tts.error.${name}`;
const symbol = Symbol.for(marker);

export class TTSAPICallError extends TTSSDKError {
  private readonly [symbol] = true;
  readonly statusCode?: number;
  readonly responseHeaders?: Record<string, string>;
  readonly responseBody?: unknown;

  constructor({
    message,
    statusCode,
    responseHeaders,
    responseBody,
    cause,
  }: {
    message: string;
    statusCode?: number;
    responseHeaders?: Record<string, string>;
    responseBody?: unknown;
    cause?: unknown;
  }) {
    super({ name, message, cause });
    this.statusCode = statusCode;
    this.responseHeaders = responseHeaders;
    this.responseBody = responseBody;
  }

  static isInstance(error: unknown): error is TTSAPICallError {
    return TTSSDKError.hasMarker(error, marker);
  }
}
