# Interview Approach: Research Skill Spec

## Document Summary

The spec defines a `/research` skill for a Claude-based agent system ("boost-os"). The skill takes a topic, spawns parallel specialist sub-agents to search the web, then synthesizes their findings into a structured markdown report. It has four phases (Plan, Research, Synthesize, Deliver), a configurable output path, and depth tiers (quick/standard/deep) that control how many specialists are spawned.

## Interview Strategy

### Goal

Understand the author's intent, uncover unstated assumptions, surface edge cases, and identify areas where the spec is ambiguous or incomplete. The interview should result in a clearer, more robust spec -- or confirm that the current spec is already sufficient for implementation.

### Approach: Outside-In

I would start from the **user-facing experience** and work inward toward **implementation details**. This ordering matters because:

1. It grounds the conversation in real scenarios before diving into mechanics.
2. Ambiguities in user-facing behavior often reveal deeper architectural questions.
3. The author is more likely to have strong, quick opinions about user experience than about internal implementation tradeoffs, so starting there builds momentum.

### Three Interview Arcs

**Arc 1: User Intent and Invocation (Questions 1-3)**
Focus on how users actually trigger the skill, what happens at the boundaries of its scope, and how the clarification step works in practice. The spec gives guidance here but leaves room for judgment calls -- I want to understand the author's mental model for when this skill fires vs. when it shouldn't.

**Arc 2: Architecture and Execution Model (Questions 4-6)**
The spec describes spawning parallel agents, which raises questions about the execution environment, failure modes, resource limits, and how the specialist agents relate to the parent agent. This is where most of the implementation risk lives.

**Arc 3: Output Quality and Iteration (Questions 7-8)**
The spec is opinionated about report quality (synthesis over concatenation, conflict handling, date awareness) but says nothing about iteration. Can the user ask for revisions? Re-run with different depth? These questions probe whether the skill is a one-shot pipeline or something more interactive.

### Interview Style

- Ask one question at a time, with a brief framing of why it matters.
- Use the author's own examples when probing edge cases (e.g., the GraphQL vs REST example).
- If the author gives a short answer, follow up to understand reasoning. If they give a long answer, summarize back to confirm understanding.
- Avoid leading questions -- the goal is to discover what the author thinks, not to steer them.

### What I Am NOT Trying to Do

- Critique the spec. This is an information-gathering interview, not a review.
- Suggest alternatives. If issues surface, I note them but keep focus on understanding intent.
- Cover every line. The spec is well-written; I would focus on the areas with the most ambiguity or the highest implementation risk.
