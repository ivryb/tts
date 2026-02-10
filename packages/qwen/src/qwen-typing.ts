import { createQwen } from './qwen-provider';
import { qwenCustomSpeechModelId, qwenCustomVoice } from './qwen-options';

const provider = createQwen({ apiKey: 'key' });

provider.speech('qwen3-tts-flash');
provider.speech(qwenCustomSpeechModelId('qwen-custom'));

const model = provider.speech('qwen3-tts-flash');
void model.doSynthesize({ text: 'hello', voice: 'Cherry' });
void model.doSynthesize({ text: 'hello', voice: qwenCustomVoice('my-voice') });

// @ts-expect-error custom model ids must be explicit.
provider.speech('qwen-custom');

// @ts-expect-error custom voices must be explicit.
void model.doSynthesize({ text: 'hello', voice: 'my-voice' });
