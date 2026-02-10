# Error Handling

The SDK throws typed errors such as:

- `TTSLoadApiKeyError`
- `TTSUnsupportedFunctionalityError`
- `TTSNoAudioGeneratedError`
- `TTSAPICallError`
- `TTSInvalidArgumentError`

For result-style flows, use the safe APIs:

- `safeSynthesize`
- `safeStreamSynthesize`
- `safeSynthesizeWithTimestamps`
