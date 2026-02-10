import { z } from 'zod';
import { TTSInvalidArgumentError } from '@tts-sdk/provider';
import { openAIKnownVoices } from './openai-voice-catalog.generated';

export const openAITTSProviderOptionsSchema = z.object({
  extraBody: z.record(z.string(), z.unknown()).optional(),
});

export type OpenAITTSProviderOptions = z.infer<
  typeof openAITTSProviderOptionsSchema
>;

const OPENAI_CUSTOM_MODEL_PREFIX = '__tts_sdk_custom_openai_model__:';
const OPENAI_CUSTOM_VOICE_PREFIX = '__tts_sdk_custom_openai_voice__:';

export const openAIKnownSpeechModelIds = [
  'gpt-4o-mini-tts',
  'tts-1',
  'tts-1-hd',
] as const;
export { openAIKnownVoices };

export type OpenAIKnownSpeechModelId = (typeof openAIKnownSpeechModelIds)[number];
export type OpenAIKnownVoice = (typeof openAIKnownVoices)[number];

declare const openAICustomSpeechModelIdBrand: unique symbol;
declare const openAICustomVoiceBrand: unique symbol;

export type OpenAICustomSpeechModelId = string & {
  readonly [openAICustomSpeechModelIdBrand]: true;
};

export type OpenAICustomVoice = string & {
  readonly [openAICustomVoiceBrand]: true;
};

export type OpenAISpeechModelId =
  | OpenAIKnownSpeechModelId
  | OpenAICustomSpeechModelId;

export type OpenAIVoice = OpenAIKnownVoice | OpenAICustomVoice;

const openAIKnownSpeechModelIdSet = new Set<string>(openAIKnownSpeechModelIds);
const openAIKnownVoiceSchema = z.enum(openAIKnownVoices);

function requireNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new TTSInvalidArgumentError(`${label} must be a non-empty string.`);
  }

  return normalized;
}

export function openAICustomSpeechModelId(modelId: string): OpenAICustomSpeechModelId {
  return `${OPENAI_CUSTOM_MODEL_PREFIX}${requireNonEmpty(modelId, 'OpenAI custom model id')}` as OpenAICustomSpeechModelId;
}

export function openAICustomVoice(voice: string): OpenAICustomVoice {
  return `${OPENAI_CUSTOM_VOICE_PREFIX}${requireNonEmpty(voice, 'OpenAI custom voice')}` as OpenAICustomVoice;
}

function decodeCustomValue(value: string, prefix: string): string | undefined {
  if (!value.startsWith(prefix)) {
    return undefined;
  }

  return requireNonEmpty(value.slice(prefix.length), 'OpenAI custom value');
}

export function resolveOpenAISpeechModelId(modelId: OpenAISpeechModelId): string {
  if (openAIKnownSpeechModelIdSet.has(modelId)) {
    return modelId;
  }

  const customModelId = decodeCustomValue(modelId, OPENAI_CUSTOM_MODEL_PREFIX);
  if (customModelId) {
    return customModelId;
  }

  throw new TTSInvalidArgumentError(
    `Invalid OpenAI model id '${modelId}'. Use one of: ${openAIKnownSpeechModelIds.join(', ')}, or openAICustomSpeechModelId('...').`,
  );
}

export function resolveOpenAIVoice(voice: string | undefined): string {
  if (voice == null) {
    return 'alloy';
  }

  const knownVoice = openAIKnownVoiceSchema.safeParse(voice);
  if (knownVoice.success) {
    return knownVoice.data;
  }

  const customVoice = decodeCustomValue(voice, OPENAI_CUSTOM_VOICE_PREFIX);
  if (customVoice) {
    return customVoice;
  }

  throw new TTSInvalidArgumentError(
    `Invalid OpenAI voice '${voice}'. Use one of: ${openAIKnownVoices.join(', ')}, or openAICustomVoice('...').`,
  );
}
