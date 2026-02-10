import { z } from 'zod';
import { TTSInvalidArgumentError } from '@tts-sdk/provider';

export const qwenProviderOptionsSchema = z.object({
  pitch: z.number().optional(),
  volume: z.number().optional(),
  emotion: z.string().optional(),
  extraBody: z.record(z.string(), z.unknown()).optional(),
});

const QWEN_CUSTOM_MODEL_PREFIX = '__tts_sdk_custom_qwen_model__:';
const QWEN_CUSTOM_VOICE_PREFIX = '__tts_sdk_custom_qwen_voice__:';

export const qwenKnownSpeechModelIds = [
  'qwen3-tts-flash',
  'qwen-tts',
  'qwen-tts-latest',
] as const;

export const qwenKnownVoices = [
  'Aiden',
  'Alek',
  'Andre',
  'Arthur',
  'Bella',
  'Bellona',
  'Bodega',
  'Bunny',
  'Chelsie',
  'Cherry',
  'Dolce',
  'Dylan',
  'Ebona',
  'Eldric Sage',
  'Elias',
  'Emilien',
  'Eric',
  'Ethan',
  'Jada',
  'Jennifer',
  'Kai',
  'Katerina',
  'Kiki',
  'Lenn',
  'Li',
  'Maia',
  'Marcus',
  'Mia',
  'Mochi',
  'Momo',
  'Moon',
  'Neil',
  'Nini',
  'Nofish',
  'Ono Anna',
  'Peter',
  'Pip',
  'Radio Gol',
  'Rocky',
  'Roy',
  'Ryan',
  'Seren',
  'Serena',
  'Sohee',
  'Sonrisa',
  'Stella',
  'Sunny',
  'Vincent',
  'Vivian',
] as const;

export type QwenKnownSpeechModelId = (typeof qwenKnownSpeechModelIds)[number];
export type QwenKnownVoice = (typeof qwenKnownVoices)[number];

declare const qwenCustomSpeechModelIdBrand: unique symbol;
declare const qwenCustomVoiceBrand: unique symbol;

export type QwenCustomSpeechModelId = string & {
  readonly [qwenCustomSpeechModelIdBrand]: true;
};

export type QwenCustomVoice = string & {
  readonly [qwenCustomVoiceBrand]: true;
};

export type QwenSpeechModelId = QwenKnownSpeechModelId | QwenCustomSpeechModelId;
export type QwenVoice = QwenKnownVoice | QwenCustomVoice;

const qwenKnownSpeechModelIdSet = new Set<string>(qwenKnownSpeechModelIds);
const qwenKnownVoiceSet = new Set<string>(qwenKnownVoices);

function requireNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new TTSInvalidArgumentError(`${label} must be a non-empty string.`);
  }

  return normalized;
}

export function qwenCustomSpeechModelId(modelId: string): QwenCustomSpeechModelId {
  return `${QWEN_CUSTOM_MODEL_PREFIX}${requireNonEmpty(modelId, 'Qwen custom model id')}` as QwenCustomSpeechModelId;
}

export function qwenCustomVoice(voice: string): QwenCustomVoice {
  return `${QWEN_CUSTOM_VOICE_PREFIX}${requireNonEmpty(voice, 'Qwen custom voice')}` as QwenCustomVoice;
}

function decodeCustomValue(value: string, prefix: string, label: string): string | undefined {
  if (!value.startsWith(prefix)) {
    return undefined;
  }

  return requireNonEmpty(value.slice(prefix.length), label);
}

export function resolveQwenSpeechModelId(modelId: QwenSpeechModelId): string {
  if (qwenKnownSpeechModelIdSet.has(modelId)) {
    return modelId;
  }

  const customModelId = decodeCustomValue(
    modelId,
    QWEN_CUSTOM_MODEL_PREFIX,
    'Qwen custom model id',
  );
  if (customModelId) {
    return customModelId;
  }

  throw new TTSInvalidArgumentError(
    `Invalid Qwen model id '${modelId}'. Use one of: ${qwenKnownSpeechModelIds.join(', ')}, or qwenCustomSpeechModelId('...').`,
  );
}

export function resolveQwenVoice(voice: string | undefined): string | undefined {
  if (voice == null) {
    return undefined;
  }

  if (qwenKnownVoiceSet.has(voice)) {
    return voice;
  }

  const customVoice = decodeCustomValue(voice, QWEN_CUSTOM_VOICE_PREFIX, 'Qwen custom voice');
  if (customVoice) {
    return customVoice;
  }

  throw new TTSInvalidArgumentError(
    `Invalid Qwen voice '${voice}'. Use one of: ${qwenKnownVoices.join(', ')}, or qwenCustomVoice('...').`,
  );
}
