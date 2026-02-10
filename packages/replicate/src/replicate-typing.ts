import { createReplicate } from './replicate-provider';
import {
  MINIMAX_SPEECH_02_TURBO_MODEL,
  replicateCustomSpeechModelId,
  replicateCustomVoice,
} from './replicate-options';

const provider = createReplicate({ apiToken: 'token' });

provider.speech(MINIMAX_SPEECH_02_TURBO_MODEL);
provider.speech(replicateCustomSpeechModelId('owner/model'));

const minimax = provider.minimaxSpeech02Turbo();
void minimax.doSynthesize({ text: 'hello', voice: 'Wise_Woman' });
void minimax.doSynthesize({
  text: 'hello',
  voice: replicateCustomVoice('custom-voice-id'),
});

// @ts-expect-error custom model ids must be explicit.
provider.speech('owner/model');

// @ts-expect-error custom voices must be explicit.
void minimax.doSynthesize({ text: 'hello', voice: 'my-voice' });
