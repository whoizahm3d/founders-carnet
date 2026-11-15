# The Founder's Carnet: instructions for Gemini (Antigravity)

Read `AGENTS.md` in this folder, then `CLAUDE.md`, and follow both. They hold the project scope, architecture rules, data rules, git workflow and safety rules. This file adds nothing to them. If anything disagrees, `CLAUDE.md` wins.

Skills are in `.agents/skills/` after you run `python scripts/sync_agent_skills.py`. The feature plan is `docs/context/coding-plan.md`.

## Frontend Workflow Rules

- For any frontend task, systematically apply:
  - `frontend-ui-engineering`
  - `webapp-testing`
  - `api-and-interface-design`
  - `performance-optimization`
- **Be economical**:
  - Capture screenshots once per step after code is completed at 1440, 768, and 390 only.
  - Fix all issues found in a single pass. Do not loop over minor pixel differences.
  - Run `tsc --noEmit` and `lint` after code edits, and `npm run build` once at the very end of the step.
  - Never re-read files or re-run commands when results are already known.


## Context economy (read this first)
- Start every task by reading docs/frontend-map.md and the last 40 lines of docs/build-log.md. Do not re-read the whole repo.
- Read only the files named in the prompt or listed in the map for that screen. Use search with line ranges instead of opening whole files.
- Read only the DESIGN.md section for the screen you are building (use search for its heading). Read all of DESIGN.md only when asked.
- Do not re-measure colors, contrast or alignment that a previous step already reported unless the prompt asks.
- Reuse the last screenshots if the screen did not change. One screenshot round, one build at the end.
- After each step, update docs/frontend-map.md (new or changed components, tokens, routes, decisions) in a few lines.
