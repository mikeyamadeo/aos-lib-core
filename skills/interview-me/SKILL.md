---
name: interview-me
description: "Probes gaps, assumptions, and tradeoffs by interviewing the user about their idea, spec, plan, or design. MUST use this skill when the user says 'interview me', 'ask me questions', 'ask me about', 'grill me', 'poke holes', 'what am I missing', 'what am I not thinking about', 'help me think through', 'flesh this out', or wants to be questioned/challenged about ANY project, spec, RFC, design doc, architecture, feature, or idea — even if they don't use the word 'interview'. Also trigger when the user presents an underspecified idea and wants help figuring out what to build, when they ask for gaps or blind spots in a plan, when they want someone to challenge their assumptions, or when another skill needs to gather detailed requirements before proceeding. Works with or without an existing document. If the user describes something they want to build and asks for probing questions or critical analysis of their plan, this is the right skill."
---

# Interview Me

Conduct a thorough, probing interview to surface missing details, unstated assumptions, edge cases, and tradeoffs in whatever the user is working on. The goal is to ask the questions the user hasn't thought to ask themselves.

## Input

`$ARGUMENTS` may be:
- A path to a file (spec, PRD, design doc, RFC, brief, anything)
- Inline text describing an idea or project
- Empty (interview about whatever's in the current conversation context)

If a file path is provided, read it first. If composing with another skill or prompt, treat the surrounding context as the input.

## How It Works

### 1. Digest

Read and deeply understand the input material. Build a mental model of what's being described: the goals, the architecture, the user experience, the constraints, the stakeholders.

### 2. Identify Gaps

This is the core of the skill. Don't ask about what's already well-specified — focus on what's missing, vague, or assumed. Look for:

- **Unstated assumptions** — What is the author taking for granted that could go wrong?
- **Missing error paths** — What happens when things fail? What does the user see?
- **Undefined boundaries** — Where does this system end and another begin?
- **Conflicting requirements** — Are any goals in tension with each other?
- **Unaddressed stakeholders** — Who's affected that isn't mentioned?
- **Scale & evolution** — What happens when usage grows or requirements change?
- **Security & privacy** — What data flows where? Who can see what?
- **UX gaps** — What does the first-time experience look like? The error experience? The power-user experience?
- **Operational concerns** — How is this deployed, monitored, debugged, rolled back?
- **Integration seams** — How does this connect to existing systems? What contracts exist?

Not every category applies to every input. Skip what's irrelevant. If the input is a loose idea rather than a detailed spec, focus on the fundamentals: what is it, who is it for, what does success look like, what are the hard parts.

### 3. Interview

Ask questions **one at a time** using AskUserQuestion. This is important — don't batch questions. Each answer may change what you ask next.

**Question quality matters more than quantity.** A good interview question:
- Targets something specific and underspecified, not something the doc already covers
- Reveals a tension, tradeoff, or hidden complexity
- Can't be answered with "yes" or "no" (unless you're confirming a specific assumption)
- Comes from genuine analysis of the material, not a generic checklist

**Bad questions** (don't ask these):
- "What is the goal of this project?" (if the doc already says)
- "Have you thought about security?" (too vague)
- "What tech stack will you use?" (obvious/surface-level)

**Good questions** (the kind to ask):
- "The spec mentions real-time sync but doesn't address conflict resolution — if two users edit the same record simultaneously, which write wins?"
- "You're storing user preferences client-side, but the onboarding flow runs server-side — how does the server know about preferences before the first sync?"
- "The retry logic will keep hammering a failing service. What's your circuit-breaker strategy, and at what failure rate do you alert vs. degrade gracefully?"

**Interview rhythm:**
- Start with the biggest gaps — the things that would cause the most rework if left unaddressed
- Let the user's answers guide follow-up questions — go deep on areas where their answers reveal more uncertainty
- Periodically summarize what you've learned and check direction: "So far we've nailed down X, Y, and Z. I still want to dig into A and B — anything else you'd rather cover?"
- When the user's answers are getting confident and consistent, and the remaining gaps are minor, you're approaching done

### 4. Write the Output

Once the interview is substantively complete, synthesize everything learned into the document.

**If working with an existing file:** Rewrite it in-place, enriching it with the details gathered during the interview. Preserve the original structure where it makes sense, but restructure if the new information warrants it. The result should read as a cohesive document, not a Q&A transcript appended to the original.

**If working from a prompt or conversation context:** Write a new document. Ask the user where to save it if the location isn't obvious from context.

**If composing with another skill:** Return the enriched content in whatever form the calling context needs — you might update a file, produce structured output, or just feed the results back into the conversation.

Before writing, give the user a brief summary of what you're about to produce and where, so there are no surprises.
