# Security · agent-fleet-preset

## Reporting

Email the KINFX maintainer privately for vulnerabilities. Do not open public issues with exploit details or leaked secrets.

## Secrets policy

- No real credentials in git, CI logs, presets, or examples.
- Runtime keys: `$DSH_HOME/.credentials.yaml` or user secret store.
- This M0 is a white-label **preset list** + theme placeholder — no live fleet orchestrator.

## Supply chain

Pin host `@deepseek-ai/dsh@0.2.1-rc.5`. Default resolve-wrap is **exactly one**: `@omdp/dsh-key-fallback`. Do not recommend `--allow-version` / allow-version peer bypasses in product presets.
