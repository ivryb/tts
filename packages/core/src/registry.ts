import {
  type Provider,
  type TTSModel,
  TTSNoSuchModelError,
  TTSNoSuchProviderError,
} from '@tts-sdk/provider';

export function customProvider({
  speechModels,
  fallbackProvider,
}: {
  speechModels?: Record<string, TTSModel>;
  fallbackProvider?: Provider;
}): Provider {
  return {
    speechModel(modelId: string): TTSModel {
      if (speechModels?.[modelId]) {
        return speechModels[modelId];
      }

      if (fallbackProvider) {
        return fallbackProvider.speechModel(modelId);
      }

      throw new TTSNoSuchModelError(modelId);
    },
  };
}

export function createProviderRegistry({
  providers,
  separator = ':',
}: {
  providers: Record<string, Provider>;
  separator?: string;
}): Provider {
  return {
    speechModel(modelIdWithProvider: string): TTSModel {
      const idx = modelIdWithProvider.indexOf(separator);
      if (idx <= 0 || idx === modelIdWithProvider.length - 1) {
        throw new TTSNoSuchModelError(modelIdWithProvider);
      }

      const providerId = modelIdWithProvider.slice(0, idx);
      const modelId = modelIdWithProvider.slice(idx + separator.length);
      const provider = providers[providerId];

      if (!provider) {
        throw new TTSNoSuchProviderError(providerId);
      }

      return provider.speechModel(modelId);
    },
  };
}
