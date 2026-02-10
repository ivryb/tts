import { decodeBase64 } from './media';

export async function* readResponseBodyAsChunks(
  response: Response,
): AsyncIterable<Uint8Array> {
  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    yield value;
  }
}

export async function* readSSEAudioChunks(
  response: Response,
): AsyncIterable<Uint8Array> {
  if (!response.body) {
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of readResponseBodyAsChunks(response)) {
    buffer += decoder.decode(chunk, { stream: true });

    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() ?? '';

    for (const eventBlock of parts) {
      const dataLines = eventBlock
        .split(/\r?\n/)
        .filter(line => line.startsWith('data:'))
        .map(line => line.replace(/^data:\s?/, '').trim());

      if (dataLines.length === 0) {
        continue;
      }

      const joined = dataLines.join('');
      if (joined === '[DONE]') {
        return;
      }

      try {
        const parsed = JSON.parse(joined) as Record<string, unknown>;
        const base64 =
          (parsed.audio as string | undefined) ??
          (parsed.output_audio as string | undefined) ??
          ((parsed.data as Record<string, unknown> | undefined)
            ?.audio_base64 as string | undefined);

        if (base64) {
          yield decodeBase64(base64);
        }
      } catch {
        continue;
      }
    }
  }
}
