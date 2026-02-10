# TTS SDK Overview

TTS SDK is a TypeScript-first, provider-agnostic toolkit for text-to-speech.

## Core APIs

- `synthesize`: get audio in one response
- `streamSynthesize`: stream audio chunks as `AsyncIterable`
- `synthesizeWithTimestamps`: get aligned text timing data when providers support it

## Supported providers (v0)

- OpenAI TTS
- ElevenLabs
- Azure OpenAI TTS
- Qwen TTS (DashScope)
- Replicate TTS (including MiniMax preset)
