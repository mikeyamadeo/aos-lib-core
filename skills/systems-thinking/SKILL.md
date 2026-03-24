---
name: systems-thinking
description: >-
  Use this skill when the user asks to design a system, evaluate an architecture,
  or make a system design trade-off decision. Trigger for: "design a system for",
  "how should I architect", "system design for", "evaluate this architecture",
  "review this design", "what's wrong with this architecture", "should I use X or Y",
  "how should I partition", "what database for", "monolith vs microservices",
  "how should I scale", "design review", "architecture review".
  EXCLUDE: code review, implementation details, infrastructure provisioning,
  deployment/CI/CD, simple "what is X" factual questions, writing code.
  This skill is compositional — it augments system design work rather than
  producing a standalone deliverable.
argument-hint: "design|evaluate|decide [description]"
---

# Systems Thinking

Structured reasoning about trade-offs in distributed systems. Provides a 7-step methodology grounded in 7 failure modes — each step exists to prevent a specific way system design thinking goes wrong.

This skill is compositional. It augments design work you're already doing — greenfield architecture, design reviews, component selection, scaling decisions — rather than producing a separate "system design document." Weave the reasoning into the work.

## Adaptive Depth

Match analytical rigor to the problem's stakes and complexity.

### Light Touch

**When:** Single trade-off, component selection, quick architecture question.

Run steps 2+4 (access patterns → component selection). Load 1-2 references. Don't announce the methodology — just reason through it naturally. If the trade-off is complex, add step 6 (justify trade-offs).

*Example: "Should I use Redis or Memcached for this cache?" → Classify the access pattern, match to component properties, state the trade-off.*

### Standard

**When:** Multi-component design, architecture review, evaluating an existing system.

Run steps 1-4+6. Load 3-4 references. Name the steps when it helps structure the analysis. When evaluating an existing design, use the failure modes table as a diagnostic checklist — scan for which modes are present, then load the relevant references for the gaps found.

### Deep

**When:** Full greenfield design, major redesign, high-stakes architecture decisions.

Run all 7 steps. Load all relevant references. Explicit reasoning at each phase. This is the full treatment — use when the wrong architecture would be expensive to unwind.

## The 7 Failure Modes

These are the ways system design thinking goes wrong. Each step in the reasoning sequence exists to prevent one.

| # | Failure Mode | Signal |
|---|---|---|
| 1 | **Generic component shopping** | Every design looks the same: LB → app → cache → DB → queue. No reasoning about *why*. |
| 2 | **Missing feedback loops** | Components treated as independent. No reasoning about emergent behavior or system dynamics. |
| 3 | **Miscalibrated rigor** | Over-engineering simple systems or under-engineering critical ones. No risk calibration. |
| 4 | **Unjustified trade-offs** | "We'll use Kafka" without articulating what workload properties justify a log-based broker. |
| 5 | **Wrong abstraction boundaries** | Decomposition along technical layers instead of domain boundaries. Splitting things that change together. |
| 6 | **Design disconnected from access patterns** | Choosing storage before understanding reads/writes. APIs that don't reflect how clients use the system. |
| 7 | **Encoding transient limitations as permanent architecture** | Scaffolding that compensates for current component limitations becomes a constraint when the component improves. |

## The 7-Step Reasoning Sequence

```
Layer 5 (Temporality):  WHEN do these decisions expire?
Layer 4 (Methodology):  HOW to walk through the design
Layer 3 (Decisions):    HOW to justify each trade-off
Layer 2 (Boundaries):   WHERE to draw boundaries / HOW MUCH rigor
Layer 1 (Thinking):     HOW to see the system as a system
Layer 0 (Substrate):    WHAT the components are and how they behave
```

### Step 1: Understand the Domain
**Question:** What are the natural boundaries in this problem space?
**Reference:** [references/domain-boundaries.md](references/domain-boundaries.md)
**Output:** Bounded contexts, context map, ubiquitous language

### Step 2: Identify Access Patterns
**Question:** How will data be read and written?
**Reference:** [references/access-patterns.md](references/access-patterns.md)
**Output:** "Given A, get B" list, data classification, volume estimates

### Step 3: Assess Risk
**Question:** What can go wrong, and how much rigor does this warrant?
**Reference:** [references/risk-calibration.md](references/risk-calibration.md)
**Output:** Risk inventory (probability × impact), rigor calibration

### Step 4: Select Components
**Question:** Given the access patterns and risk profile, which technologies fit?
**Reference:** [references/component-reasoning.md](references/component-reasoning.md)
**Output:** Component choices with reasoning tied to access patterns + risk

### Step 5: Analyze System Dynamics
**Question:** What feedback loops does this design create?
**Reference:** [references/systems-thinking.md](references/systems-thinking.md)
**Output:** Feedback loops, leverage points, potential system archetypes

### Step 6: Justify Trade-offs
**Question:** For each major decision, what was traded off and why?
**Reference:** [references/tradeoff-methodology.md](references/tradeoff-methodology.md)
**Output:** ADR for each major decision, explicit trade-offs with alternatives considered

### Step 7: Assess Temporality
**Question:** Which decisions have expiration dates?
**Reference:** [references/temporality.md](references/temporality.md)
**Output:** Durability classification for each decision, removal plan for expiring scaffolding

## Principles

- **Access patterns drive technology selection, not the reverse.** Derive storage, API, and scaling decisions from how data will be read and written. "Given A, get B" is the primitive unit of design.
- **Trade-offs must be explicit and justified.** "We chose X" is not a decision. "We chose X because Y, accepting Z as a consequence" is a decision. Every major choice gets an ADR.
- **Calibrate rigor to risk.** Not every system needs the same depth. A side project with 100 users has different risks than a payment system. Match architectural technique to actual risk.
- **See the system as a system.** Components interact through feedback loops. Adding a cache changes load patterns, which changes scaling needs, which changes cost. Identify reinforcing and balancing loops.
- **Structure should scale with improving components.** If a component improves 10x, does your architecture benefit or break? Design scaffolding for removal. Know which decisions are durable and which are expiring.
- **Boundaries are load-bearing decisions.** Where you draw the boundary determines what's easy and what's hard for the lifetime of the system. Decompose along domain boundaries, not technical layers.

## Deep Reading

For the full treatment of each reference with detailed frameworks, examples, and limitations:
`artifacts/core/system-design-thinking-resources/system-design-thinking-curated.md`
