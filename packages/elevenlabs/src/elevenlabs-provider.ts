import type { Provider } from '@tts-sdk/provider';
import {
  loadApiKey,
  loadOptionalSetting,
  withoutTrailingSlash,
  withUserAgentSuffix,
} from '@tts-sdk/provider-utils';
import type { FetchFunction } from '@tts-sdk/provider-utils';
import { ElevenLabsTTSModel } from './elevenlabs-model';
import {
  resolveElevenLabsSpeechModelId,
  type ElevenLabsSpeechModelId,
} from './elevenlabs-options';

export type ElevenLabsProviderSettings = {
  apiKey?: string;
  baseURL?: string;
  headers?: Record<string, string>;
  fetch?: FetchFunction;
  name?: string;
};

export interface ElevenLabsProvider extends Provider {
  speech(modelId: ElevenLabsSpeechModelId): ElevenLabsTTSModel;
  speechModel(modelId: ElevenLabsSpeechModelId): ElevenLabsTTSModel;
}

export function createElevenLabs(
  options: ElevenLabsProviderSettings = {},
): ElevenLabsProvider {
  const baseURL = withoutTrailingSlash(
    loadOptionalSetting({
      settingValue: options.baseURL,
      environmentVariableName: 'ELEVENLABS_BASE_URL',
    }) ?? 'https://api.elevenlabs.io',
  );

  const providerName = options.name ?? 'elevenlabs';
  const fetchFn = options.fetch ?? fetch;

  const getHeaders = () =>
    withUserAgentSuffix(
      {
        'xi-api-key': loadApiKey({
          apiKey: options.apiKey,
          environmentVariableName: 'ELEVENLABS_API_KEY',
          description: 'ElevenLabs',
        }),
        ...options.headers,
      },
      'tts-sdk/elevenlabs/0.1.0',
    );

  const createSpeechModel = (modelId: ElevenLabsSpeechModelId) =>
    new ElevenLabsTTSModel({
      provider: `${providerName}.speech`,
      modelId: resolveElevenLabsSpeechModelId(modelId),
      baseURL,
      headers: getHeaders,
      fetch: fetchFn,
    });

  return {
    speech: createSpeechModel,
    speechModel: createSpeechModel,
  };
}

export const elevenlabs = createElevenLabs();
