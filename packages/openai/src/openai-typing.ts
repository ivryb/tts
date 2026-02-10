import {
  createOpenAI,
  openAICustomSpeechModelId,
  openAICustomVoice,
} from './index';

const provider = createOpenAI({ apiKey: 'test' });
const model = provider.speech('tts-1');

provider.speech(openAICustomSpeechModelId('legacy-tts-model'));

void model.doSynthesize({ text: 'hello', voice: 'alloy' });
void model.doSynthesize({ text: 'hello', voice: openAICustomVoice('my-voice') });

// @ts-expect-error custom model ids must be explicit.
provider.speech('legacy-tts-model');

// @ts-expect-error custom voices must be explicit.
void model.doSynthesize({ text: 'hello', voice: 'my-voice' });
