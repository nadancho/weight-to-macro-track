---
description: Update repo docs (worklog, architecture, CLAUDE.md, codex) with session learnings
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
---

End-of-session documentation update for the weight-to-macro-track repo. Scans the conversation, updates in-repo docs, and commits.

This skill does NOT touch the global second brain. Run the global `/wrap-up` separately if needed.

## Instructions

### Step 1: Scan the conversation

Review the full conversation history. Extract:

- **Files changed** — new files, modified files, deleted files
- **Features added or completed** — user-visible functionality
- **Bugs fixed** — what was broken, what fixed it
- **Decisions made** — design choices, trade-offs, "we chose X because Y"
- **Architecture changes** — new domains, modules, services, integrations, tables, routes
- **Convention changes** — new rules, patterns, or constraints that should be documented

### Step 2: Filter

Discard anything that is:
- Trivial (typo fixes, formatting-only changes)
- Already documented in the repo docs
- Temporary debugging steps that were reverted

If nothing worth documenting remains, say so and stop.

### Step 3: Determine which docs need updates

Read the current state of each doc to decide what's stale:

1. **`docs/worklog/YYYY-MM-DD.md`** — always update if work was done. Use today's date. If the file exists, determine the next session number (e.g. `## Session 3: Title`). If not, create it with frontmatter:
   ```
   ---
   date: YYYY-MM-DD
   ---
   # YYYY-MM-DD
   ```

2. **`docs/architecture.md`** — update if new domains, integrations, or architectural layers were added/changed. Check the "Domains and public API" and "Integrations" sections.

3. **`CLAUDE.md`** — update if:
   - New domains or module exports were added
   - New database tables or columns were created
   - Auth/routing rules changed (protected paths, middleware)
   - New key components were built
   - New conventions or UI rules emerged

4. **`docs/codex/app-improvements/README.md`** — update if:
   - Items from "Up Next" were completed (move to "Completed" with date and bullet summary)
   - New improvement ideas surfaced (add to "Up Next" or "Future")

5. **`docs/codex/woodland-grove/`** — update relevant files if Woodland Grove features were worked on (vision.md, creatures.md, technical.md, etc.)

### Step 4: Present proposed changes

Show the user a numbered list of proposed doc updates. Group by file. Example:

```
Proposed doc updates:

1. docs/worklog/2026-03-31.md (create)
   - Session 1: Cache architecture refactor
   - Extracted storage/broadcast/connectivity from React provider
   - New CacheService class with pluggable storage backends

2. CLAUDE.md (edit)
   - Add `cache` domain to Domains section
   - Add CacheService to Key Components table

3. docs/codex/app-improvements/README.md (edit)
   - Move "Cache architecture refactor" from Up Next to Completed
```

Ask the user to confirm, adjust, or skip via AskUserQuestion. One confirmation for the whole batch.

### Step 5: Apply updates

After confirmation, make all the doc edits. Follow these format conventions:

**Worklog entries** — match the existing style:
```markdown
## Session N: Short Title

- Bullet points describing what was done
- Include file paths for new/modified files when helpful
- Keep it factual and terse

### Key decisions
- Decision and rationale (only if non-obvious choices were made)
```

**CLAUDE.md edits** — keep the same table/list formatting already in the file. Don't restructure existing sections.

**Architecture.md edits** — append to existing sections, don't reorganize.

**Codex edits** — match the heading/bullet style of the target file.

### Step 6: Commit

Stage only the doc files that were changed and commit:

```bash
git add docs/ CLAUDE.md
git commit -m "docs: wrap-up session YYYY-MM-DD — <brief summary>"
```

Do NOT push — let the user decide when to push.

### Step 7: Confirm

List what was updated and where. Keep it brief.
