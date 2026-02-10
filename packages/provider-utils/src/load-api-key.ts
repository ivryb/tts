import { TTSLoadApiKeyError } from '@tts-sdk/provider';

function hasNonEmptyValue(value: string): boolean {
  return value.trim().length > 0;
}

function missingApiKeyMessage({
  description,
  apiKeyParameterName,
  environmentVariableName,
}: {
  description: string;
  apiKeyParameterName: string;
  environmentVariableName: string;
}): string {
  return `${description} API key is missing. Pass '${apiKeyParameterName}' or set ${environmentVariableName}.`;
}

export function loadApiKey({
  apiKey,
  environmentVariableName,
  apiKeyParameterName = 'apiKey',
  description,
}: {
  apiKey: string | undefined;
  environmentVariableName: string;
  apiKeyParameterName?: string;
  description: string;
}): string {
  if (typeof apiKey === 'string') {
    if (hasNonEmptyValue(apiKey)) {
      return apiKey;
    }
  } else if (apiKey != null) {
    throw new TTSLoadApiKeyError(`${description} API key must be a string.`);
  }

  if (typeof process === 'undefined') {
    throw new TTSLoadApiKeyError(
      `${description} API key is missing. Pass it using '${apiKeyParameterName}'.`,
    );
  }

  const envValue = process.env[environmentVariableName];

  if (envValue == null) {
    throw new TTSLoadApiKeyError(
      missingApiKeyMessage({
        description,
        apiKeyParameterName,
        environmentVariableName,
      }),
    );
  }

  if (typeof envValue !== 'string') {
    throw new TTSLoadApiKeyError(
      `${description} API key from ${environmentVariableName} must be a string.`,
    );
  }

  if (!hasNonEmptyValue(envValue)) {
    throw new TTSLoadApiKeyError(
      missingApiKeyMessage({
        description,
        apiKeyParameterName,
        environmentVariableName,
      }),
    );
  }

  return envValue;
}
