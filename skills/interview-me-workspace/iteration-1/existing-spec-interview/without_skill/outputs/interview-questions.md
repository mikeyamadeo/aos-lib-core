# Interview Questions: Research Skill Spec

## Document Analysis

### What This Spec Defines
A `/research` skill that conducts web research by spawning parallel specialist sub-agents, each responsible for a specific search query. The results are synthesized into a single structured markdown report. The skill has four phases: Plan, Research (parallel), Review & Synthesize, and Deliver. Depth tiers (quick/standard/deep) control how many specialists run and how many searches each performs.

### Strengths of the Spec
- **Clear workflow structure.** Four phases with well-defined responsibilities.
- **Opinionated about quality.** The section on report quality standards and good vs. bad query design shows the author has thought carefully about what separates useful research from noise.
- **Sensible defaults with configurability.** Output path defaults to `agents/knowledge/` but can be overridden via `core.local.md`. Depth defaults to "standard."
- **Pragmatic failure handling.** Specialists that fail just write a note; the synthesis phase adapts.

### Areas of Ambiguity or Risk
1. **Scope boundaries.** The description casts a wide net ("even if they don't say research explicitly"). Where does this skill end and a simple web search begin?
2. **Parallel agent execution model.** The spec says "spawn all specialist agents in a single turn so they run in parallel" using the "Agent tool" -- but the mechanics (resource limits, timeouts, error propagation) are unspecified.
3. **No iteration or follow-up model.** The skill is described as a one-shot pipeline. What happens when the user wants to refine, extend, or update a previous research report?
4. **Clarification heuristics.** The spec says to ask when the topic is "ambiguous, overly broad, or could mean several things" but also says "most of the time, just go." The threshold is left to judgment.
5. **Source quality and recency.** Specialists are told to "prefer recent, authoritative sources" but there's no guidance on what counts as authoritative or how recent is recent enough.

---

## Questions

### Question 1: What is the boundary between this skill and a simple web search?

The description says to trigger this skill even when the user doesn't say "research" explicitly -- for example, "what's the latest on X." But a user might ask "what's the latest on X" and just want a quick one-paragraph answer, not a full report with specialist agents and saved files.

**Why this matters:** If the trigger is too broad, users get a heavyweight research pipeline when they wanted a quick answer. If too narrow, they have to remember to say "/research." Getting this boundary right is critical to the user experience. I want to understand what signal the author expects the agent to use when deciding "this is a research task" vs. "this is a quick lookup."

---

### Question 2: How should the agent decide between asking for clarification and just starting?

The spec says to ask when the topic is ambiguous but also says "most of the time, just go." In your mental model, can you walk me through 2-3 examples where you would definitely ask, and 2-3 where you would definitely not?

**Why this matters:** This is one of the highest-judgment calls in the entire skill. Different implementers will draw the line differently. Getting concrete examples from the author establishes a calibration point. It also reveals whether the author envisions this as "almost never ask" (biased toward action) or "ask whenever there's meaningful ambiguity" (biased toward precision).

---

### Question 3: What happens when a user wants to refine or extend a previous research report?

The spec describes a one-shot pipeline: plan, research, synthesize, deliver. But research is often iterative -- the user reads the report and says "dig deeper into the performance angle" or "that's not quite what I meant, focus on X instead."

**Why this matters:** If the skill is intentionally one-shot (user just runs `/research` again with a refined topic), the spec is fine as-is. But if the author envisions iteration, the spec needs to address how to handle existing output directories, how to preserve or extend specialist findings, and how the agent should understand the context of a follow-up request. This is a fork-in-the-road design decision.

---

### Question 4: What are the constraints on the Agent tool that spawns specialists?

The spec references the "Agent tool" for parallel specialist spawning. What are the practical limits? For example: Is there a maximum number of concurrent agents? Is there a timeout per specialist? What happens if one specialist hangs -- do the others proceed, and does synthesis start after a timeout?

**Why this matters:** The parallel execution model is the architectural centerpiece of this skill. The spec describes the happy path well, but production behavior depends on understanding the execution environment's constraints. If the Agent tool has a concurrency limit of 3, then a "deep" research with 5 specialists actually runs in two batches, which changes timing expectations. If there's no timeout, a stuck specialist blocks the entire pipeline.

---

### Question 5: How should depth selection work in practice -- is it always auto-detected, or can the user override it?

The spec says to pick depth "based on the topic's scope" and defaults to standard. But there's no mechanism for the user to say "I want a deep dive" or "just a quick look" and have that map to the depth tiers.

**Why this matters:** The depth tiers are well-designed, but the user has no explicit control over them. If the user says "do a deep research on X," should that force the "deep" tier? If they say "quick overview of X," should that force "quick"? Or is depth always an internal decision? This affects both the invocation syntax and the planning logic. It also determines whether the user can meaningfully control the trade-off between thoroughness and speed.

---

### Question 6: What does "pick the 2-3 most promising results" mean for specialists in practice?

The specialist prompt says to pick "2-3 most promising results" from the web search and then WebFetch each one. What criteria define "most promising"? And what should a specialist do if search results are mostly low-quality (e.g., SEO spam, forum posts with no real content)?

**Why this matters:** Source selection is where research quality is won or lost. The specialist agents are operating autonomously -- they can't ask the parent agent or the user for guidance. If the heuristics for "promising" are too vague, specialists will waste their fetches on poor sources. The author may have implicit criteria (e.g., prefer .edu/.gov domains, prefer sources with dates, avoid listicles) that should be made explicit.

---

### Question 7: How should the skill handle topics where web sources are unreliable or scarce?

Some topics have very little reliable web coverage (niche technical topics, recent events, topics dominated by marketing content). The spec's failure handling says specialists should "write a short note explaining what it tried and what didn't work," but what should the synthesis phase do if most or all specialists came back with weak findings?

**Why this matters:** The spec optimizes for the case where the web has good coverage of the topic. But the skill's credibility depends on how it handles the case where it can't deliver. Should it produce a partial report with heavy caveats? Should it tell the user "I couldn't find enough reliable information on this"? Or should it still produce a full-format report with what it has? The answer reveals the author's quality bar and affects user trust.

---

### Question 8: Is the output directory structure designed for human consumption, machine consumption, or both?

The spec saves a prompt file, individual specialist notes, and the final report in a structured directory. Is the expectation that users browse these files directly, that other tools/skills consume them, or both?

**Why this matters:** This determines several downstream decisions. If the specialist notes are meant for human reading, they need to be well-formatted and self-contained. If they're intermediate artifacts that only the synthesis phase reads, they can be more terse. If other tools consume the output (e.g., a future "update research" skill or a knowledge-base indexer), the format becomes a contract that needs to be stable. The answer also clarifies whether the `specialists/` directory is a feature (transparency into the research process) or an implementation detail that could be hidden.
