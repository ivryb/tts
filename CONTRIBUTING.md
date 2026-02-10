# Contributing

Thanks for contributing to `tts-sdk`.

## Project setup

1. Install prerequisites:
- Node.js 20+
- pnpm 10+

2. Install dependencies:

```bash
pnpm install
```

3. Create local env file (only needed for real provider tests):

```bash
cp .env.example .env
```

4. Run baseline checks:

```bash
pnpm build
pnpm test
```

## Start working

1. Create a branch from `main`.
2. Make your changes.
3. Run checks before opening a merge request:

```bash
pnpm build
pnpm test
pnpm typecheck
```

4. If you changed production code, add a changeset:

```bash
pnpm changeset
```

## Add a new provider

Create a new package under `packages/<provider-name>`.

Use an existing provider package as a template (for example `packages/openai` or `packages/qwen`), then adapt:

1. `package.json`
- Set package name to `@tts-sdk/<provider-name>`.
- Add dependencies on `@tts-sdk/provider` and `@tts-sdk/provider-utils`.
- Keep scripts aligned with other providers (`build`, `typecheck`, `test`, optionally `test:real`).

2. `src` files
- `index.ts`: public exports for the provider.
- `<provider>-provider.ts`: factory (`create...`) and default provider instance if applicable.
- `<provider>-model.ts`: model implementation methods (`doSynthesize`, `doStreamSynthesize`, etc.).
- `<provider>-options.ts`: provider/model options and validation.
- `<provider>-typing.ts`: lightweight compile-time typing checks (pattern used in current providers).
- `<provider>-provider.test.ts`: unit tests.
- `<provider>-provider.real.test.ts` and `vitest.real.config.ts`: optional real API tests.

3. Config files
- `tsconfig.json`
- `tsconfig.build.json`

4. Documentation
- Add `packages/<provider>/README.md`.
- Add provider page in `content/providers/<provider-name>.md`.
- Update root `README.md` provider list/examples if needed.

5. Validation

```bash
pnpm build
pnpm test
```

## Build and merge request workflow

1. Keep PRs focused and small where possible.
2. Include tests for behavior changes.
3. Update docs for user-visible changes.
4. Add one changeset file per PR that changes publishable code.
5. Open a merge request (GitHub Pull Request) into `main`.
6. Ensure CI passes (build/test and release workflow checks).

Recommended commit style:
- `feat: ...` for features
- `fix: ...` for bug fixes
- `docs: ...` for documentation
- `chore: ...` for maintenance

## Versioning and release process

This repo uses Changesets + GitHub Actions release automation.

### How version updates work

1. Contributors add changesets in PRs with `pnpm changeset`.
2. On `main`, the release workflow creates/updates a "version packages" PR.
3. That PR applies version bumps and changelog updates.
4. Merging it triggers package publishing.

### Release commands

Use these manually when needed:

```bash
pnpm changeset
pnpm changeset:status
pnpm changeset:version
pnpm release:publish:dry-run
pnpm release:publish
pnpm release:publish:beta
```

Notes:
- `release:publish` publishes in internal dependency order.
- Already published versions are skipped.
- Pre-release versions (for example `0.1.0-beta`) are automatically published with prerelease tag unless overridden.

### Required repository secret

Set `NPM_TOKEN` in repository secrets so GitHub Actions can publish to npm.
