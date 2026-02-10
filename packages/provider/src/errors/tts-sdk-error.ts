const marker = 'tts.error';
const symbol = Symbol.for(marker);

export class TTSSDKError extends Error {
  private readonly [symbol] = true;
  readonly cause?: unknown;

  constructor({
    name,
    message,
    cause,
  }: {
    name: string;
    message: string;
    cause?: unknown;
  }) {
    super(message);
    this.name = name;
    this.cause = cause;
  }

  static isInstance(error: unknown): error is TTSSDKError {
    return TTSSDKError.hasMarker(error, marker);
  }

  protected static hasMarker(error: unknown, markerName: string): boolean {
    const markerSymbol = Symbol.for(markerName);
    return (
      error != null &&
      typeof error === 'object' &&
      markerSymbol in error &&
      (error as Record<PropertyKey, unknown>)[markerSymbol] === true
    );
  }
}
