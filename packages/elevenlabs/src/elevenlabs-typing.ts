import { createElevenLabs } from './elevenlabs-provider';
import {
  elevenLabsCustomSpeechModelId,
  elevenLabsCustomVoiceId,
} from './elevenlabs-options';

const provider = createElevenLabs({ apiKey: 'key' });

provider.speech('eleven_multilingual_v2');
provider.speech(elevenLabsCustomSpeechModelId('my-model'));

const model = provider.speech('eleven_multilingual_v2');
void model.doSynthesize({
  text: 'hello',
  voice: elevenLabsCustomVoiceId('voice-id'),
});

// @ts-expect-error custom model ids must be explicit.
provider.speech('my-model');

// @ts-expect-error custom voices must be explicit.
void model.doSynthesize({ text: 'hello', voice: 'voice-id' });
