---
name: research
description: Conducts web research on a topic and produces a structured markdown report. Use this skill whenever the user invokes `/research <topic>`, asks to "research", "look into", "investigate", "find out about", or "what's the latest on" a topic. Also trigger when the user wants a report, briefing, or analysis that requires gathering information from multiple web sources — even if they don't say "research" explicitly. If the task involves searching the web for information and synthesizing it, this is the right skill.
---

# Research Skill

Conduct web research on a topic and produce a structured markdown report with sourced findings.

## Invocation

```
/research <topic>
```

Or naturally: "research X", "look into X", "what's the current state of X", etc.

## Variables

- **RESEARCH_TOPIC**: `$ARGUMENTS` — the topic to research
- **OUTPUT_PATH**: `${DEFAULT_AGENT_OUTPUT_PATH}core/` — read `DEFAULT_AGENT_OUTPUT_PATH` from `.env`

Derive `RESEARCH_TOPIC_SLUG` from the topic: lowercase, hyphens for spaces, strip special characters.

## Output Structure

```
OUTPUT_PATH/RESEARCH_TOPIC_SLUG/
├── RESEARCH_TOPIC_SLUG.md              # Final synthesized report
├── RESEARCH_TOPIC_SLUG.prompt.md       # Original prompt + research plan
└── specialists/
    ├── <query-slug>-notes.md           # Individual specialist findings
    └── ...
```

---

## Workflow

Four phases, executed in order:

1. **Plan** — Understand the topic, determine depth, design search strategy
2. **Research** — Spawn parallel specialist agents to search and extract findings
3. **Review & Synthesize** — Read all findings, identify gaps, write the final report
4. **Deliver** — Save report and confirm with user

---

## Phase 1: Plan

### Clarify the Topic

If the topic is ambiguous, overly broad, or could mean several things — ask. Use AskUserQuestion to narrow scope:

- "What aspect of [topic] matters most for your use case?"
- "Looking for a quick overview or a deep dive?"
- "Any specific angle — technical, business, comparison?"

Skip clarification when the topic is specific and clear. Most of the time, just go.

### Determine Depth

Depth controls how many specialists to spawn and how much each one searches. Pick based on the topic's scope:

| Topic scope | Depth | Specialists | Searches each |
|-------------|-------|-------------|---------------|
| Narrow, factual, single-answer | quick | 2 | 1-2 |
| Moderate, multi-faceted | standard | 3-4 | 2-3 |
| Broad, complex, controversial | deep | 5 | 3-4 |

Default to **standard** unless the topic clearly fits quick or deep.

### Design Search Strategy

This is the most important part of planning. Generate search queries that cover different angles of the topic — not just rephrased versions of the same question.

Think about it like assembling a research team: each specialist should bring a different perspective.

**Good query design example:**
```
Topic: "Should we migrate from REST to GraphQL for our mobile app?"

Queries:
1. "GraphQL mobile app performance latency bandwidth 2024 2025"
2. "REST API mobile development advantages limitations"
3. "GraphQL migration challenges production experience"
4. "GraphQL vs REST developer experience tooling ecosystem"
```

Each query targets a different angle: performance data, REST's strengths (not just weaknesses), real migration stories, and the developer experience dimension.

**Bad query design:**
```
1. "GraphQL vs REST"
2. "GraphQL vs REST comparison"
3. "GraphQL vs REST which is better"
4. "REST vs GraphQL differences"
```

These all return the same results. Waste of specialists.

### Create Output Structure

```bash
mkdir -p OUTPUT_PATH/RESEARCH_TOPIC_SLUG/specialists
```

### Save Prompt Context

Write `RESEARCH_TOPIC_SLUG.prompt.md`:

```markdown
# Research: RESEARCH_TOPIC

## Original Request
[What the user asked for]

## Research Plan
- **Depth**: [quick/standard/deep]
- **Specialists**: [count]
- **Search queries**: [numbered list]
- **Clarifications**: [any Q&A with user, or "none needed"]
```

---

## Phase 2: Research (Parallel Specialists)

Spawn all specialist agents in parallel using the Agent tool. Each specialist gets one search query and works independently.

For each query, spawn an agent with this prompt:

```
You are a research specialist. Your job is to search the web for information on a specific query and extract structured findings.

Topic: "RESEARCH_TOPIC"
Your assigned query: "<query>"

Steps:
1. Use WebSearch with your assigned query
2. Pick the 2-3 most promising results (prefer recent, authoritative sources)
3. Use WebFetch on each to get the full content
4. Extract key findings

Write your findings to: OUTPUT_PATH/RESEARCH_TOPIC_SLUG/specialists/<query-slug>-notes.md

Use this format:

# <Query>

## Sources
- [Title](URL) — [publication date if available]

## Key Findings
- [Bulleted findings, each tied to a source]

## Notable Quotes
> "Direct quotes that are especially relevant" — Source

## Notes
- [Credibility observations, caveats, potential bias]
```

**Important**: Launch all specialist agents in a single turn so they run in parallel. Don't wait for one to finish before starting the next.

### Handling failures

If a specialist can't find useful results (search returns nothing relevant, pages won't load), that's OK — it writes a short note explaining what it tried and what didn't work. Don't retry endlessly. The synthesis phase will work with whatever findings are available.

---

## Phase 3: Review & Synthesize

Once all specialists have completed, read every file in the `specialists/` directory.

### Identify Issues

As you read through the specialist findings, watch for:

- **Gaps**: Important angles nobody covered. If a gap is critical, do a targeted follow-up search yourself before writing the report.
- **Conflicts**: Sources that disagree. Present both sides in the report — don't silently pick one.
- **Staleness**: Old information presented as current. Flag dates and caveat time-sensitive claims.
- **Redundancy**: Multiple specialists found the same thing. Deduplicate in the report.
- **Source quality**: Opinion pieces cited as fact, marketing content, outdated docs. Weight accordingly.

### Write the Final Report

Write `RESEARCH_TOPIC_SLUG.md`. The structure depends on the topic type:

**Comparison topics** (X vs Y, should we use A or B):
```markdown
# [Topic]

## Summary
[2-3 sentence synthesis of the key takeaway]

## [Option A]
[Strengths, use cases, evidence]

## [Option B]
[Strengths, use cases, evidence]

## Comparison

| Dimension | Option A | Option B |
|-----------|----------|----------|
| ...       | ...      | ...      |

## Recommendation
[Based on the evidence, with caveats]

## Sources
- [Source list with URLs]
```

**Exploratory topics** (what is X, how does Y work, state of Z):
```markdown
# [Topic]

## Summary
[2-3 sentence overview]

## Background
[Context needed to understand the topic]

## Key Findings
### [Theme 1]
[Findings grouped by theme, not by source]

### [Theme 2]
...

## Implications
[What this means, what to watch]

## Sources
- [Source list with URLs]
```

**Technical topics** (how to implement X, architecture of Y):
```markdown
# [Topic]

## Overview
[What it is and why it matters]

## How It Works
[Technical explanation]

## Use Cases
[When and where to apply this]

## Tradeoffs
[Strengths, limitations, alternatives]

## Getting Started
[Practical next steps]

## Sources
- [Source list with URLs]
```

### Report Quality Standards

The difference between a good research report and a bad one is synthesis. A bad report reads like concatenated search results. A good report connects ideas, identifies patterns, and gives the reader a coherent understanding they couldn't get from reading any single source.

- **Synthesize across sources**: Combine findings from multiple specialists into coherent themes. If three specialists all mention the same point from different angles, weave them together — don't repeat it three times.
- **Distinguish fact from opinion**: "According to [source]..." for claims. Raw data and benchmarks speak for themselves.
- **Note conflicts explicitly**: "Sources disagree on this point. [Source A] found X, while [Source B] found Y. The difference may be due to [context]."
- **Include dates**: For anything time-sensitive, note when the source was published. "As of [date]..." for fast-moving topics.
- **End with a Sources section**: List every URL cited, with titles. The reader should be able to verify any claim.

---

## Phase 4: Deliver

Tell the user where the report is saved and give a brief (2-3 sentence) summary of the key findings. If you noticed significant gaps or limitations in the research, mention them.

```
Report saved to OUTPUT_PATH/RESEARCH_TOPIC_SLUG/RESEARCH_TOPIC_SLUG.md

[Brief summary of findings and any caveats]
```

---

## Status Updates

Keep the user informed at each phase transition:

- "Planning research on [topic]..."
- "Spawning [N] research specialists..."
- "All specialists complete. Reviewing findings and writing report..."
- "Report saved to [path]"

Don't over-communicate during the research phase — the specialists are working in parallel and the user doesn't need a play-by-play.
