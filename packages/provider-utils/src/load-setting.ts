import { TTSInvalidArgumentError } from '@tts-sdk/provider';

function resolveOptionalString(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  return value.trim().length > 0 ? value : undefined;
}

export function loadOptionalSetting({
  settingValue,
  environmentVariableName,
}: {
  settingValue?: string;
  environmentVariableName: string;
}): string | undefined {
  const providedValue = resolveOptionalString(settingValue);
  if (providedValue !== undefined) {
    return providedValue;
  }

  if (typeof process === 'undefined') {
    return undefined;
  }

  return resolveOptionalString(process.env[environmentVariableName]);
}

export function loadRequiredSetting({
  settingValue,
  environmentVariableName,
  description,
}: {
  settingValue?: string;
  environmentVariableName: string;
  description: string;
}): string {
  const value = loadOptionalSetting({ settingValue, environmentVariableName });

  if (value === undefined) {
    throw new TTSInvalidArgumentError(
      `${description} is required. Provide it in config or ${environmentVariableName}.`,
    );
  }

  return value;
}

export function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}
