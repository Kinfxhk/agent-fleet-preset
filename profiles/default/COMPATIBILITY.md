# Compatibility matrix · agent-fleet-preset M0

| Component | Pin / note | On `@deepseek-ai/dsh@0.2.1-rc.5` |
|-----------|------------|----------------------------------|
| Host | `@deepseek-ai/dsh@0.2.1-rc.5` | Required tip |
| `dsh-soul-md` | soul docs / persona cards | Install |
| `@omdp/dsh-key-fallback` | **default** resolve-wrap (**exactly one**) | Install |
| `dsh-llm-fallbacks` | model/provider degrade | Install |
| `@nanmicoder/dsh-agent-teams` | teams / activity starter | Install |
| `@goodandready/dsh-key-rotation` | optional **alternative** wrap | Do **not** co-install with key-fallback |
| `dsh-subagent-progress` | peer/gate reject | **Blocked** — do **not** recommend allow-version |
| `dsh-bridges` | peer locked older line | **Blocked** |
| Host `dsh-llm-retry` | shipped with dsh | Leave to host |

## Sibling refs (not vendored)

| Repo | Role |
|------|------|
| `agent-home-recipes` | L0 recipes / health patterns |
| `agent-quota-router` | L2 quota **contract** |
| `agent-soul-pack` | L1 templates |
| `agent-progress-dock` | L3 progress follow (if present) |

Box scaffold 2026-11-03. Re-verify peers before production.
