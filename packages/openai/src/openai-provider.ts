import type { Provider } from '@tts-sdk/provider';
import {
  loadApiKey,
  loadOptionalSetting,
  withoutTrailingSlash,
  withUserAgentSuffix,
} from '@tts-sdk/provider-utils';
import type { FetchFunction } from '@tts-sdk/provider-utils';
import { OpenAITTSModel } from './openai-model';
import {
  resolveOpenAISpeechModelId,
  type OpenAISpeechModelId,
} from './openai-options';

export type OpenAIProviderSettings = {
  baseURL?: string;
  apiKey?: string;
  organization?: string;
  project?: string;
  headers?: Record<string, string>;
  fetch?: FetchFunction;
  name?: string;
};

export interface OpenAIProvider extends Provider {
  speech(modelId: OpenAISpeechModelId): OpenAITTSModel;
  speechModel(modelId: OpenAISpeechModelId): OpenAITTSModel;
}

export function createOpenAI(options: OpenAIProviderSettings = {}): OpenAIProvider {
  const baseURL =
    withoutTrailingSlash(
      loadOptionalSetting({
        settingValue: options.baseURL,
        environmentVariableName: 'OPENAI_BASE_URL',
      }) ?? 'https://api.openai.com/v1',
    ) ?? 'https://api.openai.com/v1';

  const providerName = options.name ?? 'openai';

  const getHeaders = () =>
    withUserAgentSuffix(
      {
        Authorization: `Bearer ${loadApiKey({
          apiKey: options.apiKey,
          environmentVariableName: 'OPENAI_API_KEY',
          description: 'OpenAI',
        })}`,
        'OpenAI-Organization': options.organization,
        'OpenAI-Project': options.project,
        ...options.headers,
      },
      'tts-sdk/openai/0.1.0',
    );

  const fetchFn = options.fetch ?? fetch;

  const createSpeechModel = (modelId: OpenAISpeechModelId) =>
    new OpenAITTSModel({
      provider: `${providerName}.speech`,
      modelId: resolveOpenAISpeechModelId(modelId),
      baseURL,
      headers: getHeaders,
      fetch: fetchFn,
    });

  return {
    speech: createSpeechModel,
    speechModel: createSpeechModel,
  };
}

export const openai = createOpenAI();
