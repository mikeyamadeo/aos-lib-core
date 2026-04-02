---
name: ids
description: >-
  Use this skill whenever someone tells a story about a problem they cannot explain or fix despite
  trying. The phrase "IDS this" is an automatic trigger. Also trigger on "root cause", "5 whys",
  "what am I not seeing", "what's really going on", "what's actually going on", or "find the real
  problem." Beyond keywords, trigger on the NARRATIVE SHAPE: the user describes something broken or
  underperforming, mentions attempts that failed or fixes that didn't last, and wants to understand
  WHY. Examples: workarounds that only help temporarily; symptoms that shift or recur; teams blaming
  each other; metrics moving unexpectedly with no explanation; process changes that didn't improve
  anything. Covers any domain — code, ops, management, meetings, business metrics, team dynamics.
  Do NOT trigger for: clear error messages or stack traces where the cause is evident, technology
  comparisons or architecture decisions, or when the user already knows the cause and just needs
  implementation steps.
---

# IDS — Root Cause Analysis

Issues are **problems**, not tasks. The stated problem is almost always a symptom.

## When IDS Applies

Someone says "X is broken" or "Y keeps happening" and the real question is **why**. If the root cause is already known and just needs a fix, skip IDS — go straight to the solution.

## The Method

Three phases, weighted deliberately:

| Phase | Effort | Purpose |
|-------|--------|---------|
| **Identify** | 60% | Find root cause, not symptoms |
| **Discuss** | 10% | Surface constraints — keep it short |
| **Solve** | 30% | Commit to a specific action with a single owner |

Most people want to jump to Solve. That impulse is the single biggest reason problems recur — the "fix" addresses a symptom, the real cause stays untouched, and the problem comes back in weeks. Spending 60% of effort on Identify feels slow but prevents this cycle.

---

## Phase 1: Identify (60%)

**Goal:** Find the primary root cause — the single biggest lever. Most problems have contributing factors, but there's usually one that matters most. Find that one.

### Process

1. Start with the stated problem
2. Ask **"Why is this happening?"** — write the answer
3. Ask **"Why is THAT happening?"** — write the answer
4. Repeat until you reach something directly actionable
5. Validate: **"If we fix this, will it prevent recurrence?"**
6. Ask: **"What evidence would change my mind?"** — if you can't answer this, the root cause is a guess, not a finding

Gather evidence at each level. Read code, logs, docs, history — whatever the domain demands. Each "why" should be grounded in observation, not speculation. When evidence is incomplete, say so — false certainty is worse than honest uncertainty.

### The "Stupid Obvious" Test

State the primary root cause in one sentence. In retrospect, it should feel obvious — the kind of thing that makes someone say "oh, of course." If your root cause is complex or hedged, you probably haven't gone deep enough — but if the honest answer genuinely involves multiple factors, name the primary one and note 1-2 contributing factors rather than forcing false simplicity.

### Confidence Check

After identifying root cause, assess your confidence:
- **High** — direct evidence supports it, and you can explain what would falsify it
- **Medium** — circumstantial evidence, plausible but unverified assumptions
- **Low** — best hypothesis given limited information, needs validation

State the confidence level and what would change your mind. This prevents the analysis from projecting more certainty than the evidence supports.

### Common Traps

- **Stopping at first plausible cause** — usually a symptom. Keep going.
- **"Communication problem"** — always dig deeper. What specifically wasn't communicated, by whom, and what system gap allowed it?
- **Blaming people instead of systems** — people fail because systems allow it. Find the system gap.
- **Accepting the user's framing** — the stated problem is almost always a symptom. Respectfully reframe.

### Present the Root Cause

Show the chain from symptom to root cause:

```
Stated problem: [what was reported]
  -> Why? [first-level cause]
  -> Why? [second-level cause]
  -> Why? [third-level cause, if needed]

Primary root cause: [one sentence, stupid obvious]
Contributing factors: [1-2 if relevant, omit if truly single-cause]
Confidence: [high/medium/low] — [what would falsify this]
```

The chain should be 2-5 levels. Fewer than 2 means you probably stopped at a symptom. More than 5 usually means you're going too abstract.

---

## Phase 2: Discuss (10%)

Keep this SHORT. The purpose is to surface constraints, not debate solutions.

1. What constraints affect the solution? (time, resources, dependencies, politics)
2. What has been tried before? Why didn't it work?
3. Are there competing priorities or tradeoffs?

If discussion drags on, that's a signal you haven't finished Identify — the root cause isn't clear enough to constrain the solution space. Go back.

---

## Phase 3: Solve (30%)

1. Propose a specific action that addresses the root cause (not the symptom)
2. Name a single owner — one person, by name if known. If the right person isn't clear, define the assignment step: "The [role] closest to [area] assigns an owner by [date]"
3. Define a concrete next step — not "improve X" but "do Y by Z"
4. Define a success metric — how will you know the root cause is actually fixed?
5. Set a review date — when to check whether the fix worked

### Solution Quality Check

Verify internally (don't include this checklist in output):
- [ ] States a specific action (what)
- [ ] Names a single owner OR defines assignment step with deadline (who)
- [ ] Has a concrete next step (how)
- [ ] Is completable in <2 weeks (when)
- [ ] Has a success metric (how we'll know it worked)

"The team will handle it" means no one handles it. If you can't name one person or define how one gets assigned, the solution isn't concrete enough.

---

## Anti-Patterns

These are signs the analysis has gone wrong:

| Signal | What's Wrong | Fix |
|--------|-------------|-----|
| Proposing solutions before root cause feels obvious | Jumped to Solve | Go back to Identify |
| Root cause takes a paragraph to explain | Too shallow or too abstract | Sharpen — one sentence |
| "The team will handle it" | No real owner | Name one person or define assignment step |
| Generating research/artifacts but no committed action | Activity ≠ resolution | Define the specific action |
| Problem framed as a task ("implement X") | Confused task with problem | Reframe as the problem it solves |
| "High confidence" with no falsification criteria | False certainty | State what evidence would change your mind |

---

## Output Format

Present the full IDS analysis as three sections:

1. **Why Chain** — The path from symptom to root cause, with confidence level and falsification criteria (from Identify)
2. **Constraints** — Key constraints that shape the solution (from Discuss — omit if none surfaced)
3. **Solution** — The specific action, owner, next step, success metric, and review date (from Solve)

**Example output shape:**

```
## Why Chain

Stated problem: Deploys keep failing with different errors
  -> Why? Tests pass locally but fail in CI
  -> Why? CI runs tests in parallel with shared database state
  -> Why? Test fixtures write to the same tables without isolation

Primary root cause: Tests share mutable database state across parallel workers.
Contributing factor: No ownership of test infrastructure means nobody noticed the drift.
Confidence: High — re-run timing correlates with parallel worker count; would change
  my mind if failures persist after adding isolation.

## Constraints

- Migrating to per-worker databases would require CI config changes across 12 repos
- Team has a release deadline in 10 days

## Solution

- **Action:** Add transaction-scoped test isolation to the shared test helper
- **Owner:** Jamie (backend lead, owns test infrastructure)
- **Next step:** Open a PR with the isolation wrapper by Wednesday
- **Success metric:** First-run pass rate >95% for 2 consecutive weeks
- **Review date:** April 7
```

After presenting, ask if the analysis resonates or if any assumptions need challenging. A good IDS often surfaces something the user hadn't considered — if it merely confirms what they already knew, probe whether you went deep enough.
