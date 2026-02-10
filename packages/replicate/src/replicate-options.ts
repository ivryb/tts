import { z } from 'zod';
import { TTSInvalidArgumentError } from '@tts-sdk/provider';

export const replicateProviderOptionsSchema = z.object({
  input: z.record(z.string(), z.unknown()).optional(),
  wait: z.number().int().positive().optional(),
  webhook: z.string().url().optional(),
  webhookEventsFilter: z.array(z.string()).optional(),
});

export const minimaxProviderOptionsSchema = z.object({
  subtitleEnable: z.boolean().optional(),
  voiceId: z.string().optional(),
  extraInput: z.record(z.string(), z.unknown()).optional(),
});

export const MINIMAX_SPEECH_02_TURBO_MODEL = 'minimax/speech-02-turbo';

const REPLICATE_CUSTOM_MODEL_PREFIX = '__tts_sdk_custom_replicate_model__:';
const REPLICATE_CUSTOM_VOICE_PREFIX = '__tts_sdk_custom_replicate_voice__:';

export const replicateKnownSpeechModelIds = [MINIMAX_SPEECH_02_TURBO_MODEL] as const;

export const replicateMiniMaxKnownVoiceIds = [
  'Wise_Woman',
  'Friendly_Person',
  'Inspirational_girl',
  'Deep_Voice_Man',
  'Calm_Woman',
  'Casual_Guy',
  'Lively_Girl',
  'Patient_Man',
  'Young_Knight',
  'Determined_Man',
  'Lovely_Girl',
  'Decent_Boy',
  'Imposing_Manner',
  'Elegant_Man',
  'Abbess',
  'Sweet_Girl_2',
  'Exuberant_Girl',
] as const;

export type ReplicateKnownSpeechModelId = (typeof replicateKnownSpeechModelIds)[number];
export type ReplicateMiniMaxKnownVoiceId =
  (typeof replicateMiniMaxKnownVoiceIds)[number];

declare const replicateCustomSpeechModelIdBrand: unique symbol;
declare const replicateCustomVoiceBrand: unique symbol;

export type ReplicateCustomSpeechModelId = string & {
  readonly [replicateCustomSpeechModelIdBrand]: true;
};

export type ReplicateCustomVoice = string & {
  readonly [replicateCustomVoiceBrand]: true;
};

export type ReplicateSpeechModelId =
  | ReplicateKnownSpeechModelId
  | ReplicateCustomSpeechModelId;

export type ReplicateVoice = ReplicateMiniMaxKnownVoiceId | ReplicateCustomVoice;

const replicateKnownSpeechModelIdSet = new Set<string>(replicateKnownSpeechModelIds);
const replicateMiniMaxKnownVoiceIdSet = new Set<string>(replicateMiniMaxKnownVoiceIds);

function requireNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new TTSInvalidArgumentError(`${label} must be a non-empty string.`);
  }

  return normalized;
}

export function replicateCustomSpeechModelId(
  modelId: string,
): ReplicateCustomSpeechModelId {
  return `${REPLICATE_CUSTOM_MODEL_PREFIX}${requireNonEmpty(modelId, 'Replicate custom model id')}` as ReplicateCustomSpeechModelId;
}

export function replicateCustomVoice(voice: string): ReplicateCustomVoice {
  return `${REPLICATE_CUSTOM_VOICE_PREFIX}${requireNonEmpty(voice, 'Replicate custom voice')}` as ReplicateCustomVoice;
}

function decodeCustomValue(value: string, prefix: string, label: string): string | undefined {
  if (!value.startsWith(prefix)) {
    return undefined;
  }

  return requireNonEmpty(value.slice(prefix.length), label);
}

export function resolveReplicateSpeechModelId(modelId: ReplicateSpeechModelId): string {
  if (replicateKnownSpeechModelIdSet.has(modelId)) {
    return modelId;
  }

  const customModelId = decodeCustomValue(
    modelId,
    REPLICATE_CUSTOM_MODEL_PREFIX,
    'Replicate custom model id',
  );
  if (customModelId) {
    return customModelId;
  }

  throw new TTSInvalidArgumentError(
    `Invalid Replicate model id '${modelId}'. Use replicateCustomSpeechModelId('...') for custom models.`,
  );
}

export function resolveReplicateVoice({
  voice,
  modelId,
}: {
  voice: string | undefined;
  modelId: string;
}): string | undefined {
  if (voice == null) {
    return undefined;
  }

  if (modelId === MINIMAX_SPEECH_02_TURBO_MODEL) {
    if (replicateMiniMaxKnownVoiceIdSet.has(voice)) {
      return voice;
    }

    const customVoice = decodeCustomValue(
      voice,
      REPLICATE_CUSTOM_VOICE_PREFIX,
      'Replicate custom voice',
    );
    if (customVoice) {
      return customVoice;
    }

    throw new TTSInvalidArgumentError(
      `Invalid Replicate MiniMax voice '${voice}'. Use one of: ${replicateMiniMaxKnownVoiceIds.join(', ')}, or replicateCustomVoice('...').`,
    );
  }

  const customVoice = decodeCustomValue(
    voice,
    REPLICATE_CUSTOM_VOICE_PREFIX,
    'Replicate custom voice',
  );
  return customVoice ?? voice;
}
