---
name: critical-thinking
description: "ALWAYS use this skill when the user asks you to evaluate a decision, compare options, critique a plan, diagnose a problem, or assess a strategy — even if you think you can handle it without a skill. This skill provides specific analytical frameworks (premortem analysis, reversibility framing, competing hypotheses, system archetype recognition) that produce measurably better analysis than responding without it. Trigger on: 'help me think through', 'poke holes', 'what am I missing', 'evaluate', 'critique', 'what's the right call', 'help me decide', 'think about this more carefully', 'what should I be looking at', debates between options (build vs buy, stay vs switch, hire vs promote), diagnosing why metrics changed, reviewing roadmaps or strategies, assessing risks of a commitment or contract, any situation where someone presents a plan and wants rigorous feedback, and organizational or structural problems where surface fixes haven't worked. Do NOT trigger for: pure research/information-gathering, code review, writing code, fixing bugs, data analysis/computation, creating mental model YAML files, or Linear/GitHub issue management. This skill is compositional — it augments the current workflow rather than producing a standalone deliverable."
---

# Critical Thinking Frameworks & Mental Models

A latticework of 60+ frameworks drawn from philosophy, intelligence analysis, decision science, consulting, systems thinking, and AI reasoning research. The power is not in any single framework — it's in knowing which ones to reach for and how to combine them for the problem at hand.

This skill is compositional. It augments analysis you're already doing — brainstorming, design critique, strategy evaluation, root cause diagnosis — rather than producing a separate "framework analysis" artifact. Weave the frameworks into the work.

## Adaptive Depth

Match analytical effort to the problem's stakes and complexity. Not every question needs the full protocol.

### Light Touch

**When:** Brainstorming, quick critiques, incremental decisions, low-stakes choices, time-pressured situations.

Select 1-2 relevant frameworks and apply them naturally within the response. Don't announce "I'm using Inversion here" — just invert. Don't create separate analysis sections — weave the thinking into the flow.

*Example: During a brainstorm about pricing, naturally ask "what pricing approach would guarantee we lose customers?" (inversion) and "what job is the customer hiring this product to do?" (JTBD) without labeling either.*

### Standard

**When:** Design decisions, strategy evaluation, comparing 3+ options, moderate-complexity problems, situations where the wrong call has real cost.

Explicitly select 2-4 frameworks with brief rationale for why they apply. Structure the analysis around them. Name the frameworks when it helps the reader follow the reasoning structure.

### Deep

**When:** Major strategic decisions, root cause analysis on critical failures, high-stakes irreversible commitments, situations where being wrong is very expensive.

Run the full 5-phase reasoning protocol below. Multiple frameworks per phase. Explicit hypothesis generation and testing. This is the full treatment — use sparingly.

## Phase 0: Classify the Problem Domain

Before selecting frameworks, classify the problem. This single step prevents the most common analytical error: applying the wrong type of thinking.

| Domain | Signal | Response Pattern |
|--------|--------|-----------------|
| **Clear** | Obvious cause-effect, best practices exist | Sense → Categorize → Respond. Apply known solutions directly. |
| **Complicated** | Knowable but requires expertise/analysis | Sense → Analyze → Respond. Most frameworks below apply here. |
| **Complex** | Emergent, unpredictable cause-effect | Probe → Sense → Respond. Run experiments, observe patterns. Don't over-analyze upfront. |
| **Chaotic** | No discernible cause-effect, crisis mode | Act → Sense → Respond. Stabilize first, then assess. |
| **Confused** | Can't tell which domain applies | Break into smaller parts until each can be classified. |

Most analytical frameworks assume the Complicated domain. Cynefin prevents applying analytical tools to Complex problems that need experimentation, or treating Chaotic crises as if there's time for analysis.

At light-touch depth, do this classification silently. At standard/deep, state it explicitly.

## Framework Selection Guide

Match the problem type to the right frameworks. When multiple types apply, combine — the latticework is the point.

| Problem Type | Primary Frameworks | Supporting Models |
|---|---|---|
| **Ambiguous, ill-defined problem** | MECE + Issue Trees, First Principles | Abstraction Laddering, Least-to-Most |
| **Diagnosing root cause** | Analysis of Competing Hypotheses, Issue Trees | Key Assumptions Check, Inversion |
| **Choosing between options** | Decision Matrix, Second-Order Thinking | Premortem, Reversibility Test |
| **Competitive/market analysis** | Porter's Five Forces, Wardley Mapping | Scenario Planning, Game Theory |
| **Dynamic adversarial environment** | OODA Loop, Red Team / Devil's Advocacy | Game Theory, ACH |
| **High uncertainty, long horizon** | Scenario Planning, Real Options | Bayesian Updating, Preserving Optionality |
| **Complex adaptive system** | Systems Thinking, Cynefin (Complex) | Leverage Points, Second-Order Thinking |
| **Novel problem, no precedent** | First Principles, Tree of Thoughts | Self-Consistency, Inversion |
| **Strategic positioning** | Wardley Mapping, Playing to Win | Porter's Five Forces, JTBD |
| **Evaluating a plan or proposal** | Premortem, Key Assumptions Check | Inversion, Red Team |
| **Resource allocation** | Bottleneck / Theory of Constraints, Pareto | Eisenhower Matrix, Impact-Effort |
| **Multi-stakeholder situation** | Game Theory, Sensemaking | Mechanism Design, Second-Order Thinking |
| **Product/innovation strategy** | Jobs-to-Be-Done, First Principles | Wardley Mapping, Creative Destruction |

## Reasoning Protocol

Scale to depth. At light touch, draw from Phase 1-2 only. At standard, Phases 1-4. At deep, all five.

### Phase 1: Frame

1. **Define the problem precisely.** What question are we actually answering? Use Abstraction Laddering: move up ("Why?") to check you're solving the right problem, down ("How?") to find actionable scope.
2. **Decompose into sub-problems** using MECE + Issue Trees. No gaps, no overlaps. Each leaf node should be testable or actionable.
3. **Surface and challenge assumptions.** Key Assumptions Check: what must be true for our current thinking to hold? What evidence supports each assumption? What would have to change for it to be wrong?
4. **Select frameworks** from the selection guide above based on the problem type.

### Phase 2: Explore

5. **Generate multiple hypotheses.** Don't anchor on the first plausible explanation. Brainstorm at least 3 competing explanations or approaches before evaluating any.
6. **Seek disconfirming evidence.** Evidence consistent with all hypotheses has low diagnostic value. The most important evidence is what *differentiates* between hypotheses.
7. **Apply multiple mental models.** Look at the problem through 2-3 different lenses. What does this look like from an economics perspective? A systems perspective? An adversary's perspective?
8. **Steelman the opposing view.** Build the strongest possible case against the leading hypothesis before committing to it.

### Phase 3: Evaluate

9. **Test hypotheses against evidence.** For diagnostic problems, build the hypothesis-evidence matrix (ACH). Focus on inconsistencies, not confirmations.
10. **Trace second-order consequences.** "And then what?" For any proposed action, trace at least two levels of downstream effects. Check for Chesterton's Fence — understand why something exists before proposing to remove it.
11. **Analyze systemic effects.** Look for feedback loops (reinforcing and balancing), leverage points, and unintended consequences. Check for common system archetypes: "Fixes that Fail," "Shifting the Burden," "Limits to Growth."
12. **Stress-test.** Premortem: "Imagine this has already failed spectacularly — why?" Inversion: "What would guarantee failure?" Scenario Planning: "Does this hold under different futures?"

### Phase 4: Decide

13. **Score options against weighted criteria** when comparing alternatives. Make trade-offs explicit and auditable.
14. **Classify reversibility.** One-way door (irreversible) → heavy analysis justified. Two-way door (reversible) → decide and iterate. Don't analysis-paralyze two-way doors.
15. **Apply margin of safety.** Your model is imperfect. What's the cost if you're wrong? Size the margin accordingly.
16. **Set tripwires.** What signals would tell you this decision needs revisiting? Define them now so you don't rationalize later.

### Phase 5: Reflect

17. **Self-critique the analysis.** What did you miss? What framework might reveal something you haven't considered?
18. **Check reasoning quality** against Paul-Elder standards: Is the analysis clear? Accurate? Relevant? Deep enough? Broad enough? Logical?
19. **Flag confidence and boundaries.** Where are you operating inside your circle of competence? Where outside? Say so.
20. **Communicate answer-first.** Lead with the recommendation, then the reasoning (Pyramid Principle). Situation → Complication → Resolution.

## Core Principles

These apply across all depths and all frameworks.

**Latticework over monoculture.** Multiple diverse models mathematically outperform any single model (Scott Page's Diversity Prediction Theorem: collective error = average individual error minus diversity). Always ask: "What does this look like through a *different* lens?"

**Disconfirming evidence is king.** Confirmation bias is the most damaging analytical error. Actively seek what proves the current hypothesis wrong. If you can only find supporting evidence, you're not looking hard enough.

**Second-order thinking.** First-order: "What happens?" Second-order: "And then what?" Most analytical errors come from stopping at first-order effects.

**Map is not territory.** Every framework is a simplification. A framework that isn't serving the analysis should be discarded, not forced. "All models are wrong, but some are useful."

**Calibrate effort to reversibility.** Irreversible decisions warrant deep analysis. Reversible decisions warrant speed. Analysis paralysis on a two-way door is as wasteful as recklessness on a one-way door.

## Anti-Patterns

**Framework theater** — Naming frameworks without applying them. "Using Porter's Five Forces" followed by generic competitive commentary is theater. Actually analyze each force with specifics.

**Confirmation framework selection** — Unconsciously picking frameworks that support a pre-existing conclusion. Counter: always include at least one lens that challenges the leading hypothesis (inversion, premortem, red team).

**Framework as oracle** — "Porter's Five Forces says X" as if the framework is evidence. Frameworks organize analysis; evidence supports conclusions.

**Analysis paralysis** — Applying the full protocol to a reversible, low-stakes decision. Match depth to stakes.

**Monoculture** — Reaching for the same 1-2 frameworks every time. If everything gets a SWOT, the latticework has collapsed.

## Cognitive Biases to Actively Counter

| Bias | What It Does | Countermeasure |
|------|-------------|----------------|
| Confirmation bias | Seek/overweight supporting evidence | Focus on disconfirming evidence (ACH) |
| Anchoring | Over-rely on first information | Generate multiple independent estimates |
| Availability | Judge probability by ease of recall | Check base rates explicitly |
| Overconfidence | Assign extreme probabilities | Use ranges, not point estimates |
| Narrative fallacy | Construct causal stories from noise | Demand statistical evidence, not just stories |
| Framing effects | Let presentation shape judgment | Reframe from multiple angles |
| Belief perseverance | Resist changing established views | Set tripwires; do Key Assumptions Check |

## Detailed Framework Reference

For full descriptions of each framework — origins, detailed processes (like ACH's 8-step method), key insights, examples, and citations — consult:

`references/frameworks.md`

Organized by cognitive function:
1. Problem Structuring & Decomposition (MECE, Issue Trees, Cynefin, First Principles, etc.)
2. Hypothesis Generation & Testing (ACH, Tree of Thoughts, Self-Consistency)
3. Bias Mitigation & Assumption Challenging (KAC, Inversion, Red Team, Premortem)
4. Iterative Reasoning & Refinement (OODA, Reflexion, Bayesian Updating)
5. Multi-Perspective & Systems Analysis (Latticework, Systems Thinking, Wardley Mapping, Game Theory)
6. Decision & Prioritization (Decision Matrix, Reversibility, Real Options, JTBD)
7. Metacognition & Reasoning Architecture (Paul-Elder, Circle of Competence)
8. Additional Mental Models (from physics, math, economics, human nature)

Read the relevant section when you need the detailed mechanics of a specific framework — you don't need to read the whole file.
