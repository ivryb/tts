import { describe, expect, it } from "vitest";
import { createOpenAI } from "./openai-provider";

function must(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

describe("openai provider (real)", () => {
  const provider = createOpenAI({
    apiKey: must("OPENAI_API_KEY"),
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const modelId = "gpt-4o-mini-tts";
  const voice = "alloy";

  it("doSynthesize returns real audio", async () => {
    const result = await provider.speech(modelId).doSynthesize({
      text: "Real OpenAI TTS synth test.",
      voice,
    });

    expect(result.audio.length).toBeGreaterThan(0);
  }, 120000);

  it("doStreamSynthesize returns real chunks", async () => {
    const result = await provider.speech(modelId).doStreamSynthesize({
      text: "Real OpenAI TTS stream test.",
      voice,
    });

    let total = 0;
    for await (const part of result.audioStream) {
      total += part.chunk.length;
    }

    expect(total).toBeGreaterThan(0);
  }, 120000);
});
