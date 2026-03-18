# Interview Strategy: Dotfile Management CLI Tool

## Overall Approach

The interview follows a **funnel strategy**: start with the user's lived experience and pain points, move into core architectural decisions, then narrow into implementation specifics. Each question is designed to resolve a key ambiguity that blocks design work.

## Phase Structure

### Phase 1: Context and Motivation (Questions 1)

**Goal:** Understand the problem before proposing solutions.

Before discussing features, establish what the user does today and why it is not working. This prevents building a solution to the wrong problem. It also reveals implicit requirements the user may not have stated -- for example, they might mention "I always forget to push my changes," which tells us the tool may need automatic sync or reminders.

### Phase 2: Core Architecture (Questions 2-5)

**Goal:** Lock down the four hardest design decisions.

These four questions cover the pillars of the system:
- **Transport** (Q2): How configs move between machines.
- **Privacy model** (Q3): How secrets are separated or protected.
- **Conflict handling** (Q4): What happens when machines diverge.
- **Platform abstraction** (Q5): How OS differences are managed.

These are asked in dependency order. The transport mechanism constrains the conflict model; the privacy model constrains the file organization; the platform abstraction strategy depends on whether we use templates (which ties back to the privacy/templating answer).

### Phase 3: Scope and Audience (Questions 6-7)

**Goal:** Define boundaries.

These questions prevent scope creep and determine how much generality the tool needs. A tool that manages "just my shell config" is a weekend project. A tool that bootstraps a full machine from scratch, handles system configs, and is publishable as open source is a months-long effort. The user needs to make this tradeoff consciously.

### Phase 4: Implementation Constraints (Question 8)

**Goal:** Ground the design in practical reality.

Language choice and dependency constraints come last because they should not drive architecture -- but they absolutely constrain it. A Bash-only tool cannot easily do templating; a Rust tool cannot easily be extended by casual users; a Python tool requires a runtime on every target machine.

## Adaptive Follow-Up Strategy

After the initial 8 questions, follow-ups would be driven by the answers:

- **If git-backed:** Ask about repo structure (mono-repo vs. multi-repo), branch strategy, and whether they want automatic commits.
- **If value-level secrets:** Ask about encryption tooling preferences (age, sops, git-crypt, or a custom approach) and whether secrets should be injectable from a password manager (1Password CLI, Bitwarden, etc.).
- **If open-source is a goal:** Ask about config schema, plugin architecture, and documentation expectations.
- **If full-machine bootstrap is in scope:** Ask about idempotency requirements, package manager integration, and whether they want a "dry run" mode.

## Principles Guiding the Interview

1. **Ask "what" before "how."** Understand the user's goals and constraints before discussing implementation.
2. **Surface hidden assumptions.** The prompt says "syncing" -- but syncing can mean many things. Force specificity.
3. **Present tradeoffs, not opinions.** When a question has well-known alternatives, name them so the user can make an informed choice rather than accepting a default they did not understand.
4. **One decision per question.** Compound questions lead to incomplete answers. Each question targets exactly one ambiguity.
5. **Order by dependency.** Earlier answers constrain later questions, so the sequence matters. Do not ask about conflict resolution before knowing the transport mechanism.
