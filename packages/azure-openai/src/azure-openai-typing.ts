import { createAzureOpenAI } from './azure-openai-provider';
import { azureOpenAICustomVoice } from './azure-openai-options';

const provider = createAzureOpenAI({
  resourceName: 'resource',
  apiKey: 'key',
  deploymentId: 'deployment-id',
});
const model = provider.speech();

void model.doSynthesize({ text: 'hello', voice: 'alloy' });
void model.doSynthesize({ text: 'hello', voice: azureOpenAICustomVoice('my-voice') });

// @ts-expect-error custom voices must be explicit.
void model.doSynthesize({ text: 'hello', voice: 'my-voice' });
