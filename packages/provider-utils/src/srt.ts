import type { TTSTimeSegment } from '@tts-sdk/provider';

function parseTimeToMs(value: string): number {
  const [h, m, rest] = value.split(':');
  const [s, ms] = rest.split(/[,.]/);
  return (
    Number(h) * 3_600_000 +
    Number(m) * 60_000 +
    Number(s) * 1_000 +
    Number(ms)
  );
}

export function parseSrt(text: string): TTSTimeSegment[] {
  const blocks = text.split(/\n\s*\n/).map(block => block.trim());
  const segments: TTSTimeSegment[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map(line => line.trim());
    if (lines.length < 3) {
      continue;
    }

    const times = lines[1];
    const [start, end] = times.split('-->').map(part => part.trim());

    if (!start || !end) {
      continue;
    }

    segments.push({
      text: lines.slice(2).join(' ').replace(/<[^>]+>/g, '').trim(),
      startMs: parseTimeToMs(start),
      endMs: parseTimeToMs(end),
    });
  }

  return segments;
}
