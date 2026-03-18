# Interview Strategy: Research Skill Spec

## Document Assessment

The research skill spec is a mid-to-high maturity document. It has a clear workflow, concrete examples, and well-structured output templates. This is not a loose idea that needs fundamentals -- the author clearly knows what they want to build. The spec's strengths are in the "happy path" -- what happens when things go right. Its weaknesses are in the boundaries: what happens at the edges, under stress, and over time.

This means the interview should skip foundational questions ("what is this skill for?") and go straight to probing the gaps between design intent and operational reality.

## Overall Strategy

### Opening Move: Runtime Assumptions (Questions 1, 3, 5)

The spec's biggest risk is that it assumes a runtime environment with specific capabilities (Agent tool for parallel spawning, sufficient context windows, WebSearch/WebFetch availability) without ever naming those assumptions. If any of these are wrong, the skill doesn't gracefully degrade -- it just breaks.

I would start here because these are the gaps most likely to cause rework. If the Agent tool has concurrency limits, or if context windows can't hold all specialist output, the entire Phase 2/Phase 3 architecture needs adjustment. Better to surface this early.

### Middle: Quality and Consistency (Questions 2, 4, 7)

Once the runtime foundation is solid, I'd probe the quality control layer. The spec has good taste (the synthesis quality standards section is strong) but leaves a lot of quality-critical decisions to individual agent judgment without criteria. Source selection, follow-up research bounds, and minimum quality thresholds are all areas where vague guidance will produce inconsistent results across runs.

I'd expect the author's answers here to reveal whether they want tight, reproducible behavior or are comfortable with variance. Either answer is valid, but it shapes the rest of the spec.

### Closing: Lifecycle and Evolution (Questions 6, 8)

These are "what happens after v1" questions. They're important but less urgent -- the skill can ship without answers here, but will accumulate debt. I'd bring these up toward the end, and if the author wants to defer them, that's fine. I'd just note them as known gaps in the enriched spec.

## Adaptive Branching

The interview strategy above is a starting plan, not a fixed script. Key decision points where I'd adapt:

- **If Question 1 reveals that the Agent tool is NOT reliably available:** I'd pivot heavily into fallback design. The entire Phase 2 needs a serial-execution alternative. This would become the dominant thread of the interview.

- **If Question 5 reveals that context limits are a real concern:** I'd dig into specialist output format -- should specialists produce summaries instead of raw findings? Should there be a max token budget per specialist? This could reshape the specialist prompt template.

- **If Question 8 reveals that the author has broader knowledge management ambitions:** I'd explore how research reports relate to other artifacts in the system. Are they just files, or should they be indexed, searchable, linkable? This could surface a whole layer of requirements not in the current spec.

- **If any answer reveals the author hasn't considered an area at all:** That's a signal to go deeper, not to move on. The most valuable interview moments happen when the interviewee says "huh, I hadn't thought about that."

## Question Style

All questions would be asked one at a time via AskUserQuestion, per the interview-me skill's instructions. Each question is open-ended and targets a specific gap. I would avoid:

- Yes/no questions (they don't surface reasoning)
- Generic checklist questions ("have you thought about X?")
- Questions about things the spec already covers well

After every 2-3 questions, I'd do a brief checkpoint: summarize what I've learned, confirm direction, and ask if there are areas the author wants to steer toward.

## Expected Output

After the interview, I would rewrite the research skill SKILL.md in-place, enriching it with:

- Explicit runtime requirements / assumptions section
- Guidance on follow-up search bounds in Phase 3
- Source selection criteria in the specialist prompt
- A minimum quality threshold or "bail out" heuristic
- A report metadata section (date researched, topic tags) in the output templates
- Any other details surfaced during the interview

The rewritten spec would preserve the original structure (it's good) but add the missing operational and edge-case guidance that the interview surfaces.
