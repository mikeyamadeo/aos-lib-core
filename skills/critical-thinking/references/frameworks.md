# Critical Thinking Frameworks — Detailed Reference

This file contains full descriptions of 60+ frameworks referenced by the critical-thinking skill. Navigate to the relevant section when you need detailed mechanics for a specific framework.

## Table of Contents

1. [Problem Structuring & Decomposition](#1-problem-structuring--decomposition) — MECE, Issue Trees, Cynefin, First Principles, Least-to-Most, Abstraction Laddering
2. [Hypothesis Generation & Testing](#2-hypothesis-generation--testing) — ACH, Hypothesis-Driven, Tree of Thoughts, Self-Consistency
3. [Bias Mitigation & Assumption Challenging](#3-bias-mitigation--assumption-challenging) — KAC, Inversion, Red Team, Premortem, Cognitive Biases
4. [Iterative Reasoning & Refinement](#4-iterative-reasoning--refinement) — OODA, ReAct, Reflexion, Self-Refine, Bayesian Updating
5. [Multi-Perspective & Systems Analysis](#5-multi-perspective--systems-analysis) — Latticework, Systems Thinking, Second-Order Thinking, Scenario Planning, Wardley Mapping, Porter's Five Forces, Game Theory, Sensemaking
6. [Decision & Prioritization](#6-decision--prioritization) — Decision Matrix, Reversibility, Real Options, Playing to Win, JTBD, Pyramid Principle
7. [Metacognition & Reasoning Architecture](#7-metacognition--reasoning-architecture) — Paul-Elder, CoALA, Circle of Competence, Map vs Territory
8. [Additional Mental Models](#8-additional-mental-models) — Physics, Math, Economics, Human Nature
9. [Key Sources](#key-sources)

---

## 1. Problem Structuring & Decomposition

### MECE (Mutually Exclusive, Collectively Exhaustive)
- **Origin**: McKinsey / Barbara Minto, *The Pyramid Principle* (1967/1987)
- **What it does**: Ensures any decomposition has no gaps and no overlaps. Every element belongs to exactly one category; all elements are accounted for.
- **Application**: Use as a structural constraint when decomposing any problem space. Guarantees systematic coverage without redundancy.

### Issue Trees
- **What it does**: Hierarchical MECE decomposition of a question into sub-questions. Two types: *diagnostic* ("Why is X happening?") and *solution* ("How can we achieve X?").
- **Application**: The primary tool for turning an ambiguous problem into a structured workplan. Decompose until each leaf node is testable or actionable.

### Cynefin Framework
- **Origin**: Dave Snowden, IBM (1999)
- **What it does**: Classifies problems into five domains, each requiring a fundamentally different approach:
  - **Clear** (obvious cause-effect): Sense → Categorize → Respond. Apply best practices.
  - **Complicated** (knowable, requires expertise): Sense → Analyze → Respond. Apply good practices via expert analysis.
  - **Complex** (emergent cause-effect, unpredictable): Probe → Sense → Respond. Run safe-to-fail experiments and observe patterns.
  - **Chaotic** (no discernible cause-effect): Act → Sense → Respond. Stabilize first, then assess.
  - **Confused/Disorder** (don't know which domain): Break down into smaller parts until each can be classified.
- **Why it matters**: Most analytical frameworks assume the "Complicated" domain. Cynefin prevents applying analytical tools to Complex problems that require experimentation, or treating Chaotic crises as if there's time for analysis.

### First Principles Thinking
- **Origin**: Aristotle; popularized by Elon Musk
- **What it does**: Strips away assumptions and conventions to identify fundamental truths, then reasons upward from those truths.
- **When to deploy**: Novel problems, paradigm shifts, or situations where "the way it's always been done" is the primary justification.

### Least-to-Most Prompting
- **Origin**: Zhou et al., Google Brain (2022)
- **What it does**: Decomposes a complex problem into sub-problems ordered from simplest to hardest, solving each in sequence and feeding solutions forward.
- **Application**: Especially powerful for compositional problems where later answers depend on earlier ones.

### Abstraction Laddering
- **Origin**: Design thinking / Untools.co
- **What it does**: Move up ("Why?") to find the real problem, move down ("How?") to find actionable solutions. Prevents solving the wrong problem.
- **Application**: When a problem feels intractable, ladder up. When too abstract, ladder down.

---

## 2. Hypothesis Generation & Testing

### Analysis of Competing Hypotheses (ACH)
- **Origin**: Richards Heuer, CIA (1970s-1980s); formalized in *Psychology of Intelligence Analysis* (1999)
- **What it does**: Forces simultaneous evaluation of all plausible hypotheses against all evidence, with emphasis on **disconfirming** evidence. Built on Popperian falsification.
- **8-step process**:
  1. List all plausible hypotheses
  2. List evidence
  3. Build hypothesis-evidence matrix
  4. Assess consistency/inconsistency
  5. Reject hypotheses with most inconsistencies
  6. Analyze diagnostic sensitivity
  7. Report with likelihoods
  8. Set monitoring indicators
- **Core insight**: Evidence consistent with all hypotheses has low diagnostic value. The most important evidence is what *differentiates* between hypotheses.
- **Important nuance**: ACH is diagnosticity-based, not truly Bayesian — it does not require explicit prior probabilities or likelihood ratios.

### Hypothesis-Driven Problem Solving
- **Origin**: McKinsey consulting methodology
- **What it does**: Start with an answer on Day 1, then design analyses to prove or disprove it. Identify explicit "kill conditions" that would force abandoning the hypothesis.
- **Application**: Prevents "boiling the ocean." Form a hypothesis, identify what must be true for it to hold, and test those conditions.

### Tree of Thoughts (ToT)
- **Origin**: Yao et al., Princeton/DeepMind (2023)
- **What it does**: Generalizes linear chain-of-thought into a search tree. Generate multiple candidate thoughts at each step, evaluate them, and use BFS/DFS to explore promising branches while pruning dead ends.
- **Key result**: 74% success vs. 4% for chain-of-thought on exploration-heavy problems.

### Self-Consistency
- **Origin**: Wang et al., Google Brain (2022)
- **What it does**: Generates multiple reasoning paths for the same problem, then selects the most common answer via majority vote.
- **Application**: For high-stakes conclusions, generate 3-5 independent analyses and look for convergence.

---

## 3. Bias Mitigation & Assumption Challenging

### Key Assumptions Check (KAC)
- **Origin**: Intelligence community (Heuer & Pherson, 2021); mandated by ODNI ICD 203 Analytic Standards
- **What it does**: Explicitly lists all assumptions underlying an analytic line, then challenges each: What would have to change for this to be wrong? How confident are we? What's the evidence?
- **Application**: Run before any major conclusion. Especially critical for long-standing beliefs or analysis that "feels obvious."

### Inversion
- **Origin**: Jacobi (mathematician); popularized by Charlie Munger
- **What it does**: Instead of "How do I succeed?", ask "What guarantees failure?" Then eliminate those conditions. Two forms: goal inversion (work backward from the outcome) and failure inversion (enumerate failure modes).
- **Application**: Systematically stress-test any strategy by asking "What would make this fail?" before committing.

### Red Team Analysis & Devil's Advocacy
- **Origin**: Intelligence community; U.S. Army UFMCS Red Team Handbook; Catholic Church (advocatus diaboli)
- **What it does**: Build the strongest possible case *against* the prevailing conclusion. Red teaming adopts the adversary's perspective; devil's advocacy argues against consensus.
- **Key caveat**: Effectiveness depends on genuine engagement. Perfunctory red teaming is theater.
- **Application**: Explicitly steelman the opposing position before finalizing a recommendation.

### Premortem Analysis
- **Origin**: Gary Klein, HBR 2007; built on prospective hindsight research (Mitchell, Russo & Pennington, 1989)
- **What it does**: Before launching a plan, imagine it has **already failed spectacularly**. Then independently write down why. Surface and address the most plausible failure modes.
- **Why it works**: Prospective hindsight — imagining an event has already occurred — increases the ability to identify reasons for outcomes by **30%** compared to asking "what could go wrong?"
- **Application**: Given any plan, generate plausible failure scenarios, assess likelihood and impact, recommend mitigations.

### Cognitive Biases to Watch For

| Bias | What it does | Countermeasure |
|------|-------------|----------------|
| **Confirmation bias** | Seek/overweight supporting evidence | ACH — focus on disconfirming evidence |
| **Anchoring** | Over-rely on first information | Generate multiple independent estimates |
| **Availability** | Judge probability by ease of recall | Check base rates explicitly |
| **Mirror imaging** | Assume others think like you | Red team with adversary's actual doctrine |
| **Belief perseverance** | Resist changing established views | Key Assumptions Check; set tripwires |
| **Overconfidence** | Assign extreme probabilities | Calibrate with Bayesian updating |
| **Framing effects** | Let presentation shape judgment | Reframe from multiple angles |
| **Narrative fallacy** | Construct causal stories from random events | Demand statistical evidence, not stories |

---

## 4. Iterative Reasoning & Refinement

### OODA Loop
- **Origin**: Col. John Boyd, USAF (1976-1987)
- **Cycle**: **Observe** → **Orient** (the critical phase — where mental models shape interpretation) → **Decide** → **Act** → repeat.
- **Key insight**: Orient is the schwerpunkt. Competitive advantage comes from cycling faster and with better models than the adversary.

### ReAct (Reasoning + Acting)
- **Origin**: Yao et al., Princeton/Google (2022)
- **Pattern**: Thought → Action → Observation → Thought → Action → ...
- **Key insight**: Pure reasoning hallucinates; pure acting is inefficient. Interleaving reasoning with information-gathering produces grounded, interpretable behavior.

### Reflexion
- **Origin**: Shinn et al., Northeastern (2023)
- **What it does**: After a task attempt, generate verbal self-reflection analyzing what went wrong, store in memory, and condition subsequent attempts on those reflections.
- **Key result**: Improved code generation from 67% to 91% pass rate through iterative self-reflection.

### Self-Refine
- **Origin**: Madaan et al., CMU (2023)
- **Pattern**: Generate → Critique → Refine → Critique → Refine → ...
- **Application**: Always critique your first draft. A single pass of self-critique and revision substantially improves output quality.

### Bayesian Updating
- **Origin**: Thomas Bayes; applied to forecasting by Philip Tetlock (*Superforecasting*, 2015)
- **What it does**: Start with a prior probability, update incrementally as new evidence arrives, weighted by evidence reliability.
- **Superforecaster traits** (Tetlock): Think in probabilities, update frequently in small increments, aggregate from diverse sources, are "foxes" (many models) not "hedgehogs" (one big idea).
- **Application**: Assign confidence levels, update in small increments, avoid anchoring to initial assessments.

---

## 5. Multi-Perspective & Systems Analysis

### Munger's Latticework of Mental Models
- **Origin**: Charlie Munger, Berkshire Hathaway; *Poor Charlie's Almanack*
- **What it does**: Maintain ~80-90 models drawn from physics, biology, psychology, economics, math, engineering, and history. Apply multiple models to the same problem.
- **Mathematical basis**: Scott Page's *Diversity Prediction Theorem*: collective error = average individual error minus diversity of predictions. Multiple diverse models mathematically outperform any single model.

### Systems Thinking
- **Origin**: Forrester (MIT), Meadows, Senge
- **Key concepts**: Feedback loops (reinforcing and balancing), stocks and flows, emergence, leverage points, system archetypes.
- **Meadows' leverage points** (most to least powerful): Paradigm change → System goals → Self-organization → Rules → Information flows → Positive feedback loops → Negative feedback loops → Delays → Structure → Buffers → Parameters.
- **System archetypes**: "Fixes that Fail," "Shifting the Burden," "Limits to Growth," "Tragedy of the Commons," "Success to the Successful."
- **Gall's Law**: "A complex system that works is invariably found to have evolved from a simple system that worked."

### Second-Order Thinking
- **Origin**: Howard Marks, *The Most Important Thing*
- **What it does**: Trace consequences beyond immediate effects. First-order: "What happens?" Second-order: "And then what?" Third-order: "And then what after that?"
- **Chesterton's Fence**: Before removing a policy or structure, understand why it exists — it may serve a non-obvious second-order purpose.

### Scenario Planning
- **Origin**: Pierre Wack / Royal Dutch Shell (1970s); Peter Schwartz
- **Process**: (1) Identify focal question, (2) Map driving forces, (3) Rank by uncertainty x impact, (4) Construct 2-4 scenario logics from critical uncertainties, (5) Develop narratives, (6) Stress-test strategies against each scenario.
- **Key insight**: The goal is not prediction but *preparedness*. Scenarios expand the range of futures considered.

### Wardley Mapping
- **Origin**: Simon Wardley
- **What it does**: Maps a value chain on two axes: (Y) dependency/user-need hierarchy, (X) evolution stage (Genesis → Custom → Product → Commodity). Reveals where components are commoditizing and where competitive advantage is shifting.
- **Why it's different**: Unlike Porter's Value Chain (static), Wardley Maps capture evolution and movement. Unlike SWOT (list-based), they show spatial relationships.

### Porter's Five Forces
- **Origin**: Michael Porter, *Competitive Strategy* (1980)
- **Forces**: Threat of new entrants, supplier power, buyer power, threat of substitutes, competitive rivalry.
- **Application**: Structured lens for competitive/market analysis. Apply when evaluating strategic positioning or industry dynamics.

### Game Theory
- **Origin**: Von Neumann & Morgenstern; Nash; Schelling; Axelrod
- **Key frameworks**:
  - **Nash Equilibrium**: Where no player can improve by unilaterally changing strategy.
  - **Prisoner's Dilemma / Iterated Games**: In repeated interactions, tit-for-tat wins. Reputation and "shadow of the future" change optimal strategy.
  - **Zero-Sum vs. Positive-Sum**: Most real situations are non-zero-sum. Reframe to find positive-sum outcomes.
  - **Mechanism Design**: The inverse of game theory — design rules to produce desired outcomes.
- **Key insight**: Think about others' incentives and likely responses *before* acting.

### Sensemaking (Weick)
- **Origin**: Karl Weick, *Sensemaking in Organizations* (1995)
- **Seven properties**: Identity-based, retrospective, enactive, social, ongoing, focused on extracted cues, plausibility over accuracy.
- **Key insight**: Decisions are made by constructing plausible stories from limited cues, not by optimally processing all facts. Understanding this reveals hidden biases.
- **Application**: Ask: Which cues are being extracted and which ignored? Whose identity is shaping the interpretation? Is the story plausible but inaccurate?

---

## 6. Decision & Prioritization

### Decision Matrix / Weighted Scoring
- **What it does**: List options x criteria, assign weights, score, compute weighted totals. Sensitivity analysis varies weights to test robustness.
- **Variants**: Pugh Matrix (vs. baseline), AHP (pairwise comparisons), Eisenhower Matrix (urgency x importance), Impact-Effort Matrix.

### Reversible vs. Irreversible Decisions
- **Origin**: Jeff Bezos ("one-way doors" vs. "two-way doors")
- **What it does**: Apply heavy analysis only to irreversible decisions. Move fast and experiment with reversible ones.

### Real Options Analysis
- **Origin**: Timothy Luehrman, HBR 1998
- **What it does**: Treats strategic investments as options that can be exercised, deferred, or abandoned as uncertainty resolves.
- **Application**: Recommend when to commit, when to wait, and when to abandon.

### Playing to Win / Strategy Choice Cascade
- **Origin**: Roger Martin & A.G. Lafley, *Playing to Win* (2013)
- **Five cascading choices**: (1) Winning aspiration, (2) Where to play, (3) How to win, (4) Required capabilities, (5) Management systems.
- **Application**: Sequential constraint propagation — each level narrows the decision space.

### Jobs-to-Be-Done (JTBD)
- **Origin**: Tony Ulwick (1991); popularized by Clayton Christensen, HBR 2016
- **What it does**: People don't buy products — they "hire" them to do a "job." Three dimensions: functional, emotional, social.
- **Classic example**: Commuters "hired" milkshakes as engaging breakfast for boring drives. Competitors weren't other milkshakes — they were bagels, bananas, and boredom.
- **Application**: Reframe from solution-space to problem-space. What "job" is being done? What are the real competitors?

### The Pyramid Principle (Communication)
- **Origin**: Barbara Minto, McKinsey
- **What it does**: Structure output as: answer first → supporting arguments (MECE) → evidence. Uses SCR (Situation, Complication, Resolution) framing.

---

## 7. Metacognition & Reasoning Architecture

### Paul-Elder Critical Thinking Framework
- **Elements of Thought**: Purpose, Question, Information, Inference, Concepts, Assumptions, Implications, Point of View.
- **Intellectual Standards**: Clarity, Accuracy, Precision, Relevance, Depth, Breadth, Logic, Significance, Fairness.
- **Application**: Universal checklist for evaluating reasoning quality before finalizing any conclusion.

### CoALA (Cognitive Architectures for Language Agents)
- **Origin**: Sumers et al., Princeton (2023)
- **What it does**: Unifying framework defining agents via: (1) Memory, (2) Action space, (3) Decision procedure (including metacognition).
- **Key insight**: Reason about *when to stop, when to seek more information, and when to change strategy* — not just execute the plan.

### Circle of Competence
- **Origin**: Munger/Buffett
- **What it does**: Know the boundaries of reliable knowledge. Operate within them; flag when venturing outside.
- **Application**: Explicitly signal when operating outside well-supported knowledge.

### Map Is Not the Territory
- **Origin**: Alfred Korzybski
- **What it does**: All models are simplifications. The map omits detail; it can mislead when the omitted detail matters.
- **Application**: Constant vigilance against confusing the model with reality. Every framework in this file is a map.

---

## 8. Additional Mental Models

### From Physics & Systems
- **Entropy / Thermodynamics**: All systems decay without energy input. Plans require active maintenance.
- **Bottleneck / Theory of Constraints** (Goldratt): System performance is limited by the single tightest constraint. Improving non-bottlenecks is wasted effort.
- **Activation Energy / Catalysts**: Change requires overcoming an energy barrier. Catalysts lower it.
- **Emergence**: Complex behaviors arise from simple component interactions but cannot be predicted from components alone.

### From Mathematics & Probability
- **Power Laws / Pareto**: Most outputs come from a few inputs. Prioritize ruthlessly.
- **Compounding**: Small consistent gains produce disproportionate results over time.
- **Regression to the Mean**: Extreme results revert toward average. Prevents over-reaction to outliers.
- **Fat Tails** (Taleb): Real-world distributions often have much heavier tails than normal. Underestimating tail risk → catastrophic surprises.
- **Local vs. Global Optima**: Hill-climbing finds local peaks. Escaping local optima requires accepting temporary degradation.

### From Economics & Strategy
- **Creative Destruction** (Schumpeter): Innovation necessarily destroys what came before.
- **Moral Hazard**: Risk-taking increases when someone else bears the cost.
- **Adverse Selection** (Akerlof): Information asymmetry drives the good out. "Market for Lemons."
- **Preserving Optionality**: Under uncertainty, prefer choices that keep future options open.
- **Path Dependence**: Where you end up depends on the sequence of prior decisions, not just current conditions.
- **Switching Costs / Lock-in**: The cost of changing creates both moats and traps.

### From Human Nature
- **Narrative Fallacy**: Humans compulsively construct causal stories from random events.
- **Mimetic Desire** (Girard): We want what others want, not based on intrinsic value. Explains bubbles.
- **Shirky Principle**: Institutions try to preserve the problem to which they are the solution.
- **Lindy Effect**: Non-perishable things that have survived long are likely to survive longer.
- **Forcing Functions**: Constraints that compel action — deadlines, public commitments, sunsets.

---

## Key Sources

### Foundational Texts
- Heuer, R. (1999). *Psychology of Intelligence Analysis*. CIA CSI.
- Heuer, R. & Pherson, R. (2021). *Structured Analytic Techniques for Intelligence Analysis*, 3rd ed.
- Kahneman, D. (2011). *Thinking, Fast and Slow*.
- Meadows, D. (2008). *Thinking in Systems: A Primer*.
- Minto, B. (1987/2010). *The Pyramid Principle*.
- Munger, C. (2005/2023). *Poor Charlie's Almanack*.
- Porter, M. (1980). *Competitive Strategy*.
- Tetlock, P. & Gardner, D. (2015). *Superforecasting*.
- Schwartz, P. (1991). *The Art of the Long View*.
- Klein, G. (2007). Performing a Project Premortem. HBR.
- Martin, R. & Lafley, A.G. (2013). *Playing to Win*.
- Page, S. (2018). *The Model Thinker*.

### Curated Collections
- Farnam Street — Mental Models (fs.blog/mental-models/)
- Untools.co — interactive thinking tools
- Ness Labs — 30 Mental Models
