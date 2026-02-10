import { z } from 'zod';
import { TTSInvalidArgumentError } from '@tts-sdk/provider';

export const elevenLabsProviderOptionsSchema = z.object({
  languageCode: z.string().optional(),
  seed: z.number().int().optional(),
  stability: z.number().min(0).max(1).optional(),
  similarityBoost: z.number().min(0).max(1).optional(),
  style: z.number().min(0).max(1).optional(),
  useSpeakerBoost: z.boolean().optional(),
});

const ELEVENLABS_CUSTOM_MODEL_PREFIX = '__tts_sdk_custom_elevenlabs_model__:';
const ELEVENLABS_CUSTOM_VOICE_PREFIX = '__tts_sdk_custom_elevenlabs_voice__:';

export const elevenLabsKnownSpeechModelIds = [
  'eleven_flash_v2_5',
  'eleven_turbo_v2_5',
  'eleven_multilingual_v2',
] as const;

export const elevenLabsKnownVoiceIds = ['21m00Tcm4TlvDq8ikWAM'] as const;

export type ElevenLabsKnownSpeechModelId =
  (typeof elevenLabsKnownSpeechModelIds)[number];
export type ElevenLabsKnownVoiceId = (typeof elevenLabsKnownVoiceIds)[number];

declare const elevenLabsCustomSpeechModelIdBrand: unique symbol;
declare const elevenLabsCustomVoiceIdBrand: unique symbol;

export type ElevenLabsCustomSpeechModelId = string & {
  readonly [elevenLabsCustomSpeechModelIdBrand]: true;
};

export type ElevenLabsCustomVoiceId = string & {
  readonly [elevenLabsCustomVoiceIdBrand]: true;
};

export type ElevenLabsSpeechModelId =
  | ElevenLabsKnownSpeechModelId
  | ElevenLabsCustomSpeechModelId;

export type ElevenLabsVoiceId = ElevenLabsKnownVoiceId | ElevenLabsCustomVoiceId;

const elevenLabsKnownSpeechModelIdSet = new Set<string>(
  elevenLabsKnownSpeechModelIds,
);
const elevenLabsKnownVoiceSet = new Set<string>(elevenLabsKnownVoiceIds);

function requireNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new TTSInvalidArgumentError(`${label} must be a non-empty string.`);
  }

  return normalized;
}

export function elevenLabsCustomSpeechModelId(
  modelId: string,
): ElevenLabsCustomSpeechModelId {
  return `${ELEVENLABS_CUSTOM_MODEL_PREFIX}${requireNonEmpty(modelId, 'ElevenLabs custom model id')}` as ElevenLabsCustomSpeechModelId;
}

export function elevenLabsCustomVoiceId(voiceId: string): ElevenLabsCustomVoiceId {
  return `${ELEVENLABS_CUSTOM_VOICE_PREFIX}${requireNonEmpty(voiceId, 'ElevenLabs custom voice id')}` as ElevenLabsCustomVoiceId;
}

function decodeCustomValue(value: string, prefix: string, label: string): string | undefined {
  if (!value.startsWith(prefix)) {
    return undefined;
  }

  return requireNonEmpty(value.slice(prefix.length), label);
}

export function resolveElevenLabsSpeechModelId(modelId: ElevenLabsSpeechModelId): string {
  if (elevenLabsKnownSpeechModelIdSet.has(modelId)) {
    return modelId;
  }

  const customModelId = decodeCustomValue(
    modelId,
    ELEVENLABS_CUSTOM_MODEL_PREFIX,
    'ElevenLabs custom model id',
  );
  if (customModelId) {
    return customModelId;
  }

  throw new TTSInvalidArgumentError(
    `Invalid ElevenLabs model id '${modelId}'. Use one of: ${elevenLabsKnownSpeechModelIds.join(', ')}, or elevenLabsCustomSpeechModelId('...').`,
  );
}

export function resolveElevenLabsVoiceId(voiceId: string | undefined): string {
  if (voiceId == null) {
    return '21m00Tcm4TlvDq8ikWAM';
  }

  if (elevenLabsKnownVoiceSet.has(voiceId)) {
    return voiceId;
  }

  const customVoiceId = decodeCustomValue(
    voiceId,
    ELEVENLABS_CUSTOM_VOICE_PREFIX,
    'ElevenLabs custom voice id',
  );
  if (customVoiceId) {
    return customVoiceId;
  }

  throw new TTSInvalidArgumentError(
    `Invalid ElevenLabs voice id '${voiceId}'. Use one of: ${elevenLabsKnownVoiceIds.join(', ')}, or elevenLabsCustomVoiceId('...').`,
  );
}
