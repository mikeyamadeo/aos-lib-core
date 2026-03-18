# Interview Analysis: Research Skill Spec

## What's Well-Specified

The research skill spec is notably strong in several areas:

- **Clear four-phase workflow**: Plan, Research, Synthesize, Deliver -- the overall flow is well-defined and logical.
- **Depth calibration**: The quick/standard/deep table gives concrete guidance on how many specialists and searches to use, tied to topic scope.
- **Good vs. bad examples**: The query design section does an excellent job of showing what good search strategy looks like (different angles) vs. bad (rephrased duplicates). This is the kind of concrete guidance that actually changes behavior.
- **Report templates by topic type**: Three distinct templates (comparison, exploratory, technical) with full markdown structures. This removes ambiguity about output format.
- **Synthesis quality standards**: The spec explicitly names the difference between "concatenated search results" and real synthesis. The guidance on handling conflicts, dates, and source quality is strong.
- **Failure handling**: Acknowledges that specialists may fail and says to work with whatever is available rather than retrying endlessly.
- **Configuration resolution**: Clean override pattern via `core.local.md` with a sensible default.

## What's Missing, Vague, or Assumed

The following gaps would likely cause the most confusion or inconsistency in implementation. They are ordered by impact -- the first gaps would cause the most rework or divergent behavior if left unaddressed.

---

## Interview Questions

### Question 1: What happens when the Agent tool is unavailable or the environment doesn't support parallel agent spawning?

**Why this matters:** The entire Phase 2 depends on spawning parallel specialist agents via the "Agent tool." The spec treats this as a given, but not all environments or configurations may support it. If the Agent tool isn't available, the skill has no fallback -- it simply can't execute. This is the single biggest assumption in the spec, and if it's wrong, the skill is dead on arrival.

**Gap probed:** Unstated assumptions, undefined boundaries (what capabilities the runtime must have).

**Would use AskUserQuestion:** Yes.

---

### Question 2: How should the skill handle topics where web search yields poor, paywalled, or unreliable results?

**Why this matters:** The spec handles specialist-level failures ("can't find useful results") but doesn't address systemic failure -- what if the topic is too niche, too recent, or too locked behind paywalls for web search to produce anything useful? The current spec would produce a report synthesized from almost nothing, which might be worse than producing no report at all. There's no quality threshold that says "this research isn't good enough to deliver."

**Gap probed:** Missing error paths, undefined quality floor.

**Would use AskUserQuestion:** Yes.

---

### Question 3: The spec says to spawn specialists "in a single turn so they run in parallel" -- what's the maximum number of parallel agents the system can handle, and what happens if that limit is hit on a deep research topic?

**Why this matters:** The spec says "deep" research uses 5 specialists, each doing 3-4 searches. That's potentially 20 concurrent web operations. If there are rate limits, token limits, or concurrency caps on the Agent tool, WebSearch, or WebFetch, the skill could silently degrade or fail. The spec has no guidance on what to do if parallelism is constrained.

**Gap probed:** Scale concerns, operational constraints.

**Would use AskUserQuestion:** Yes.

---

### Question 4: When the spec says to do a "targeted follow-up search yourself" during Phase 3 to fill gaps, who is "yourself" -- the main agent doing synthesis, or a new specialist? And how many follow-up rounds are acceptable before you just ship what you have?

**Why this matters:** This is a subtle recursion risk. The synthesis phase can trigger more research, which could trigger more synthesis. Without a bound, this could loop. It also blurs the clean separation between Phase 2 (research) and Phase 3 (synthesize). The spec needs to define how deep the follow-up rabbit hole goes -- one round? Two? Only for "critical" gaps (and who defines critical)?

**Gap probed:** Conflicting requirements (thoroughness vs. termination), undefined boundaries.

**Would use AskUserQuestion:** Yes.

---

### Question 5: The spec doesn't mention token or context window limits anywhere. A deep research topic with 5 specialists each fetching 2-3 full web pages could produce massive specialist notes. How should the skill handle the case where the combined specialist output exceeds what can fit in context for synthesis?

**Why this matters:** This is a practical constraint that will hit on nearly every "deep" research run. If the synthesizer can't read all the specialist files because they're too large, the report quality degrades silently. The spec needs guidance on whether specialists should summarize aggressively, whether there's a max length per specialist file, or whether the synthesizer should read files in chunks.

**Gap probed:** Scale, operational concerns, unstated assumptions about the execution environment.

**Would use AskUserQuestion:** Yes.

---

### Question 6: How should the skill handle research on topics where information changes rapidly -- for example, ongoing events, recently announced products, or active policy debates? The spec mentions noting dates, but should it also warn the user about the perishability of the findings?

**Why this matters:** The report templates don't include any shelf-life or "researched on" date field. A report produced today about a fast-moving topic could be misleading next week. The spec says to "note when the source was published" but doesn't say to timestamp the report itself or flag when findings are especially perishable. A user discovering an old research report in `agents/knowledge/` months later has no way to know whether to trust it.

**Gap probed:** Staleness, UX gaps (the experience of consuming research over time, not just at delivery).

**Would use AskUserQuestion:** Yes.

---

### Question 7: The specialist prompt template tells agents to "pick the 2-3 most promising results" -- but what criteria define "promising"? Recency? Domain authority? Relevance to the specific query? And who resolves ties between a very recent but lower-authority source vs. an older but highly authoritative one?

**Why this matters:** This is where research quality is actually determined. The spec gives great guidance on query design but then leaves source selection almost entirely to the specialist's judgment with minimal criteria. Different specialists (or different runs of the same specialist) could make very different choices here, leading to inconsistent report quality. Even brief heuristics ("prefer primary sources over commentary, recent over old for fast-moving topics, authoritative over recent for established knowledge") would help.

**Gap probed:** Unstated assumptions, quality consistency.

**Would use AskUserQuestion:** Yes.

---

### Question 8: The output structure puts reports in `agents/knowledge/` by default. Is there any mechanism for discovering existing research on the same or overlapping topics? If a user runs `/research GraphQL performance` and later runs `/research GraphQL vs REST`, should the second run be aware of the first?

**Why this matters:** Without deduplication or cross-referencing, the knowledge base becomes a pile of isolated reports. Over time, users will have overlapping and potentially contradictory research sitting side by side with no connection. This also means redundant web searches -- the system doesn't learn from its own previous work. This is a design decision with big implications for how the skill evolves.

**Gap probed:** Scale and evolution, integration seams (how the skill relates to the broader knowledge management story).

**Would use AskUserQuestion:** Yes.
