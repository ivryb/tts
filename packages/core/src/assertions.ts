import {
  TTSInvalidArgumentError,
  TTSNoAudioGeneratedError,
  TTSUnsupportedFunctionalityError,
  type TTSModel,
  type TTSResponseMetadata,
} from '@tts-sdk/provider';

export function assertModel(model: unknown): asserts model is TTSModel {
  if (!model || typeof model !== 'object') {
    throw new TTSInvalidArgumentError('model must be a valid TTS model instance.');
  }

  const candidate = model as Partial<TTSModel>;

  if (typeof candidate.doSynthesize !== 'function') {
    throw new TTSInvalidArgumentError('model.doSynthesize must be a function.');
  }
}

export function assertHasAudio(
  audio: Uint8Array,
  response: TTSResponseMetadata,
): void {
  if (audio.length === 0) {
    throw new TTSNoAudioGeneratedError([response]);
  }
}

export function assertStreamingSupport(model: TTSModel): void {
  if (!model.capabilities.supportsStreaming || !model.doStreamSynthesize) {
    throw new TTSUnsupportedFunctionalityError('streamSynthesize');
  }
}

export function assertTimestampSupport(model: TTSModel): void {
  if (
    !model.capabilities.supportsTimestamps ||
    !model.doSynthesizeWithTimestamps
  ) {
    throw new TTSUnsupportedFunctionalityError('synthesizeWithTimestamps');
  }
}

export function assertSsmlSupport(model: TTSModel, ssml?: string): void {
  if (ssml && !model.capabilities.supportsSsml) {
    throw new TTSUnsupportedFunctionalityError(
      'ssml',
      `${model.provider}:${model.modelId} does not support SSML.`,
    );
  }
}
