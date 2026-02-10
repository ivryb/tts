# Azure OpenAI Provider

Package: `@tts-sdk/azure-openai`

Uses deployment-based model IDs configured in provider setup.
`apiVersion` is optional and defaults to `2024-02-15-preview`.
Use `AZURE_ENDPOINT` and `AZURE_API_KEY` for env-based auth/config.
For deployment selection, set `deploymentId` in `createAzureOpenAI` or set `AZURE_OPENAI_DEPLOYMENT_ID` (alias: `AZURE_DEPLOYMENT_ID`).
