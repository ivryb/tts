import { TTSInvalidArgumentError } from '@tts-sdk/provider';

const AZURE_OPENAI_CUSTOM_VOICE_PREFIX = '__tts_sdk_custom_azure_openai_voice__:';

export const azureOpenAIKnownVoices = [
  'alloy',
  'echo',
  'fable',
  'onyx',
  'nova',
  'shimmer',
] as const;

export type AzureOpenAIKnownVoice = (typeof azureOpenAIKnownVoices)[number];

declare const azureOpenAICustomVoiceBrand: unique symbol;

export type AzureOpenAICustomVoice = string & {
  readonly [azureOpenAICustomVoiceBrand]: true;
};

export type AzureOpenAIVoice = AzureOpenAIKnownVoice | AzureOpenAICustomVoice;

const azureOpenAIKnownVoiceSet = new Set<string>(azureOpenAIKnownVoices);

function requireNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new TTSInvalidArgumentError(`${label} must be a non-empty string.`);
  }

  return normalized;
}

export function azureOpenAICustomVoice(voice: string): AzureOpenAICustomVoice {
  return `${AZURE_OPENAI_CUSTOM_VOICE_PREFIX}${requireNonEmpty(voice, 'Azure OpenAI custom voice')}` as AzureOpenAICustomVoice;
}

function decodeCustomVoice(voice: string): string | undefined {
  if (!voice.startsWith(AZURE_OPENAI_CUSTOM_VOICE_PREFIX)) {
    return undefined;
  }

  return requireNonEmpty(voice.slice(AZURE_OPENAI_CUSTOM_VOICE_PREFIX.length), 'Azure OpenAI custom voice');
}

export function resolveAzureOpenAIDeploymentId(deploymentId: string): string {
  return requireNonEmpty(deploymentId, 'Azure OpenAI deployment id');
}

export function resolveAzureOpenAIVoice(voice: string | undefined): string {
  if (voice == null) {
    return 'alloy';
  }

  if (azureOpenAIKnownVoiceSet.has(voice)) {
    return voice;
  }

  const customVoice = decodeCustomVoice(voice);
  if (customVoice) {
    return customVoice;
  }

  throw new TTSInvalidArgumentError(
    `Invalid Azure OpenAI voice '${voice}'. Use one of: ${azureOpenAIKnownVoices.join(', ')}, or azureOpenAICustomVoice('...').`,
  );
}
