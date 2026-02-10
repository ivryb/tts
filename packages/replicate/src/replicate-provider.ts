import type { Provider } from '@tts-sdk/provider';
import { loadApiKey, loadOptionalSetting, withoutTrailingSlash, withUserAgentSuffix } from '@tts-sdk/provider-utils';
import type { FetchFunction } from '@tts-sdk/provider-utils';
import {
  MINIMAX_SPEECH_02_TURBO_MODEL,
  resolveReplicateSpeechModelId,
  type ReplicateSpeechModelId,
} from './replicate-options';
import { ReplicateTTSModel } from './replicate-model';

export type ReplicateProviderSettings = {
  apiToken?: string;
  baseURL?: string;
  headers?: Record<string, string>;
  fetch?: FetchFunction;
  name?: string;
};

export interface ReplicateProvider extends Provider {
  speech(modelId: ReplicateSpeechModelId): ReplicateTTSModel;
  speechModel(modelId: ReplicateSpeechModelId): ReplicateTTSModel;
  minimaxSpeech02Turbo(): ReplicateTTSModel;
}

export function createReplicate(
  options: ReplicateProviderSettings = {},
): ReplicateProvider {
  const baseURL = withoutTrailingSlash(
    loadOptionalSetting({
      settingValue: options.baseURL,
      environmentVariableName: 'REPLICATE_BASE_URL',
    }) ?? 'https://api.replicate.com/v1',
  );

  const providerName = options.name ?? 'replicate';
  const fetchFn = options.fetch ?? fetch;

  const getHeaders = () =>
    withUserAgentSuffix(
      {
        Authorization: `Bearer ${loadApiKey({
          apiKey: options.apiToken,
          environmentVariableName: 'REPLICATE_API_TOKEN',
          description: 'Replicate',
          apiKeyParameterName: 'apiToken',
        })}`,
        ...options.headers,
      },
      'tts-sdk/replicate/0.1.0',
    );

  const createSpeechModel = (modelId: ReplicateSpeechModelId) =>
    new ReplicateTTSModel({
      provider: `${providerName}.speech`,
      modelId: resolveReplicateSpeechModelId(modelId),
      baseURL,
      headers: getHeaders,
      fetch: fetchFn,
    });

  return {
    speech: createSpeechModel,
    speechModel: createSpeechModel,
    minimaxSpeech02Turbo: () => createSpeechModel(MINIMAX_SPEECH_02_TURBO_MODEL),
  };
}

export const replicate = createReplicate();
