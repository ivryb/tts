import type { Provider } from '@tts-sdk/provider';
import { loadApiKey, loadOptionalSetting, withoutTrailingSlash, withUserAgentSuffix } from '@tts-sdk/provider-utils';
import type { FetchFunction } from '@tts-sdk/provider-utils';
import { QwenTTSModel } from './qwen-model';
import {
  resolveQwenSpeechModelId,
  type QwenSpeechModelId,
} from './qwen-options';

export type QwenProviderSettings = {
  apiKey?: string;
  baseURL?: string;
  headers?: Record<string, string>;
  fetch?: FetchFunction;
  name?: string;
};

export interface QwenProvider extends Provider {
  speech(modelId: QwenSpeechModelId): QwenTTSModel;
  speechModel(modelId: QwenSpeechModelId): QwenTTSModel;
}

export function createQwen(options: QwenProviderSettings = {}): QwenProvider {
  const baseURL = withoutTrailingSlash(
    loadOptionalSetting({
      settingValue: options.baseURL,
      environmentVariableName: 'ALIBABA_BASE_URL',
    }) ??
      loadOptionalSetting({
        settingValue: options.baseURL,
        environmentVariableName: 'DASHSCOPE_BASE_URL',
      }) ??
      'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
  );

  const providerName = options.name ?? 'qwen';
  const fetchFn = options.fetch ?? fetch;

  const resolvedApiKey =
    loadOptionalSetting({
      settingValue: options.apiKey,
      environmentVariableName: 'ALIBABA_API_KEY',
    }) ??
    loadOptionalSetting({
      settingValue: options.apiKey,
      environmentVariableName: 'DASHSCOPE_API_KEY',
    });

  const getHeaders = () =>
    withUserAgentSuffix(
      {
        Authorization: `Bearer ${loadApiKey({
          apiKey: resolvedApiKey,
          environmentVariableName: 'ALIBABA_API_KEY',
          description: 'Qwen (DashScope)',
        })}`,
        ...options.headers,
      },
      'tts-sdk/qwen/0.1.0-beta',
    );

  const createSpeechModel = (modelId: QwenSpeechModelId) =>
    new QwenTTSModel({
      provider: `${providerName}.speech`,
      modelId: resolveQwenSpeechModelId(modelId),
      baseURL,
      headers: getHeaders,
      fetch: fetchFn,
    });

  return {
    speech: createSpeechModel,
    speechModel: createSpeechModel,
  };
}

export const qwen = createQwen();
