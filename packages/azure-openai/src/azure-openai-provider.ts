import {
  type Provider,
  TTSInvalidArgumentError,
  TTSLoadApiKeyError,
} from '@tts-sdk/provider';
import {
  loadOptionalSetting,
  withoutTrailingSlash,
  withUserAgentSuffix,
} from '@tts-sdk/provider-utils';
import type { FetchFunction } from '@tts-sdk/provider-utils';
import { AzureOpenAITTSModel } from './azure-openai-model';
import { resolveAzureOpenAIDeploymentId } from './azure-openai-options';

export type AzureOpenAIProviderSettings = {
  apiVersion?: string;
  endpoint?: string;
  baseURL?: string;
  resourceName?: string;
  deploymentId?: string;
  apiKey?: string;
  getToken?: () => Promise<string>;
  headers?: Record<string, string>;
  fetch?: FetchFunction;
  name?: string;
};

export interface AzureOpenAIProvider extends Provider {
  speech(): AzureOpenAITTSModel;
  speechModel(): AzureOpenAITTSModel;
}

const DEFAULT_AZURE_API_VERSION = '2024-02-15-preview';

function ensureOpenAIPath(value: string): string {
  const normalized = withoutTrailingSlash(value);
  if (/(^|\/)openai(\/|$)/.test(normalized)) {
    return normalized;
  }

  return `${normalized}/openai`;
}

function resolveBaseURL(options: AzureOpenAIProviderSettings): string {
  const explicit = loadOptionalSetting({
    settingValue: options.endpoint ?? options.baseURL,
    environmentVariableName: 'AZURE_ENDPOINT',
  });

  if (explicit) {
    return ensureOpenAIPath(explicit);
  }

  const resourceName = options.resourceName;

  if (!resourceName) {
    throw new TTSInvalidArgumentError(
      'Azure OpenAI requires endpoint/baseURL or resourceName (or AZURE_ENDPOINT).',
    );
  }

  return `https://${resourceName}.openai.azure.com/openai`;
}

function resolveApiVersion(options: AzureOpenAIProviderSettings): string {
  return (
    loadOptionalSetting({
      settingValue: options.apiVersion,
      environmentVariableName: 'AZURE_API_VERSION',
    }) ??
    DEFAULT_AZURE_API_VERSION
  );
}

function resolveDeploymentId(options: AzureOpenAIProviderSettings): string {
  const deploymentId =
    loadOptionalSetting({
      settingValue: options.deploymentId,
      environmentVariableName: 'AZURE_OPENAI_DEPLOYMENT_ID',
    }) ??
    loadOptionalSetting({
      settingValue: options.deploymentId,
      environmentVariableName: 'AZURE_DEPLOYMENT_ID',
    });

  if (deploymentId == null) {
    throw new TTSInvalidArgumentError(
      'Azure OpenAI deployment id is required. Set deploymentId in createAzureOpenAI(), AZURE_OPENAI_DEPLOYMENT_ID, or AZURE_DEPLOYMENT_ID.',
    );
  }

  return resolveAzureOpenAIDeploymentId(deploymentId);
}

async function resolveAuthHeader(
  options: AzureOpenAIProviderSettings,
): Promise<Record<string, string>> {
  if (options.getToken) {
    const token = await options.getToken();
    return { Authorization: `Bearer ${token}` };
  }

  const apiKey =
    options.apiKey ??
    (typeof process !== 'undefined' ? process.env.AZURE_API_KEY : undefined);

  if (!apiKey) {
    throw new TTSLoadApiKeyError(
      'Azure OpenAI authentication missing. Provide apiKey/getToken or set AZURE_API_KEY.',
    );
  }

  return { 'api-key': apiKey };
}

export function createAzureOpenAI(
  options: AzureOpenAIProviderSettings = {},
): AzureOpenAIProvider {
  const baseURL = resolveBaseURL(options);
  const apiVersion = resolveApiVersion(options);
  const deploymentId = resolveDeploymentId(options);
  const fetchFn = options.fetch ?? fetch;
  const providerName = options.name ?? 'azure-openai';

  const getHeaders = async () => {
    const auth = await resolveAuthHeader(options);
    return withUserAgentSuffix(
      {
        ...auth,
        ...options.headers,
      },
      'tts-sdk/azure-openai/0.1.0',
    );
  };

  const createSpeechModel = () =>
    new AzureOpenAITTSModel({
      provider: `${providerName}.speech`,
      deploymentId,
      baseURL,
      apiVersion,
      headers: getHeaders,
      fetch: fetchFn,
    });

  return {
    speech: createSpeechModel,
    speechModel: createSpeechModel,
  };
}

export const azureOpenAI = createAzureOpenAI;
