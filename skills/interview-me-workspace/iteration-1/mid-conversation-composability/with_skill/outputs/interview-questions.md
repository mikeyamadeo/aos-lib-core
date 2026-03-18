# Interview Questions: Plugin System Design

## Analysis: What's Stated vs. What's Missing

### What the user told us

The user's input contains exactly four concrete claims:

1. Plugins are loaded at runtime.
2. Plugins can extend the UI.
3. Plugins can add new data sources.
4. Third-party developers should be able to create plugins.

That's it. There is no mention of the host application's tech stack, the target user base, what "extend the UI" means concretely, what a "data source" is in this context, how plugins are distributed, what trust model governs third-party code, or what happens when anything goes wrong.

### What's conspicuously absent

The user's framing ("what am I not thinking about?") signals they know the idea is underspecified. The biggest blind spots, in order of rework risk:

- **Security and isolation**: Running third-party code at runtime is the highest-risk aspect of this design. No sandboxing model, permission system, or trust framework is mentioned.
- **API contracts and boundaries**: The line between "host app" and "plugin" is completely undefined. Without this, there is no plugin system — just an app with hooks.
- **Failure and lifecycle management**: Plugins crash, have bugs, become abandoned, conflict with updates. None of this is addressed.
- **UI extension specifics**: "Extend the UI" covers a massive design space — from predefined slots to full page injection to style overrides. The mechanism chosen constrains the entire front-end architecture.
- **Ecosystem and distribution**: Third-party developers need tooling, documentation, distribution channels, and incentives. None of this is mentioned.
- **Data governance**: If plugins add data sources, questions arise about data ownership, access control, and what happens to data when a plugin is removed.

---

## Questions (In Order)

### Question 1: Sandboxing and Trust

**Question:** "You want third-party developers to create plugins that run at runtime and can extend the UI and access data. That's a significant trust surface. When a third-party plugin runs in your app, what level of access does it have to the rest of the application — can it read the DOM, make network requests, access other plugins' data? What's your isolation model?"

**Why this matters:** This is the single highest-rework-risk gap. If the user hasn't thought about sandboxing, the entire architecture could need to be redesigned once they realize the security implications. A plugin system without a trust model is a malware distribution system. This question forces the user to confront the tension between "third-party openness" and "application security" immediately, before we build on assumptions.

**Would use AskUserQuestion:** Yes. This is the opening question and the answer determines the direction of several follow-up questions (about permissions, review processes, API surface design).

---

### Question 2: What "Extend the UI" Means Concretely

**Question:** "When you say plugins can 'extend the UI,' what does that look like in practice? Are you imagining predefined extension points — like a sidebar slot or a panel area where plugins can render — or should plugins be able to inject UI anywhere in the app, modify existing views, or add entirely new pages/routes?"

**Why this matters:** This is the question that turns a vague idea into an architecture. The answer determines whether the plugin system is slot-based (like VS Code's sidebar/panel/status bar), page-based (like a tab system), or DOM-level (like a browser extension). Each approach has radically different implementation complexity, security implications, and developer experience. If the user says "anywhere," that's a red flag for maintainability. If they say "predefined slots," the follow-up is about which slots and how they compose.

**Would use AskUserQuestion:** Yes. The answer here directly shapes questions 3-5.

---

### Question 3: What a "Data Source" Is

**Question:** "You mentioned plugins can add new data sources. Can you give me a concrete example of what that looks like? Is a 'data source' an API integration (like pulling data from Salesforce), a local file reader, a database connection, something else? And once a plugin brings in data, does that data become available to the rest of the app and to other plugins, or is it scoped to the plugin that created it?"

**Why this matters:** "Data source" is doing a lot of work in the original statement and could mean almost anything. The answer determines the data architecture — whether there's a shared data layer that plugins contribute to (which requires a schema or contract system) or whether each plugin owns its own data silo. It also surfaces the plugin-to-plugin interaction question: if Plugin A adds a data source and Plugin B wants to use it, that's a dependency and communication system that needs to be designed.

**Would use AskUserQuestion:** Yes. This is a foundational question about the data architecture that affects permissions, lifecycle, and inter-plugin design.

---

### Question 4: Plugin Lifecycle and Failure

**Question:** "Walk me through what happens when a plugin misbehaves. Say a third-party plugin throws an unhandled exception while rendering its UI component, or it makes a data source request that hangs indefinitely. Does the whole app crash? Does just the plugin's area go blank? Can users disable a broken plugin, and if so, what happens to the data it brought in or the UI state it created?"

**Why this matters:** This question probes error paths and lifecycle management — two areas the user hasn't mentioned at all. The answer reveals whether the user has thought about fault isolation (critical for third-party code), graceful degradation, and the relationship between plugin state and application state. It also naturally leads into questions about plugin enable/disable/uninstall flows and data cleanup. If the user says "I haven't thought about that," it confirms this is a major gap that needs dedicated design work.

**Would use AskUserQuestion:** Yes. The answer here may reveal additional gaps around monitoring, error attribution, and user experience during failures.

---

### Question 5: API Stability and Versioning

**Question:** "When you ship a new version of your app that changes the internal structure — maybe you refactor how data flows or restructure a UI component that plugins hook into — what happens to existing plugins? Do you guarantee backwards compatibility of the plugin API? If so, for how long? And how would a third-party developer know their plugin is about to break?"

**Why this matters:** This is the question that surfaces the tension between "move fast on the host app" and "don't break the ecosystem." Every successful plugin platform (VS Code, WordPress, Shopify) has had to solve this, and the answer shapes the API design philosophy. If the user hasn't considered this, they'll likely design an API that's too tightly coupled to internal implementation, creating a maintenance nightmare. This question also probes whether they've thought about semantic versioning for the plugin API, deprecation policies, and developer communication channels.

**Would use AskUserQuestion:** Yes. This often reveals whether the user is thinking of the plugin system as a product (with consumers who have expectations) or as a feature (internal convenience).

---

### Question 6: Checkpoint and Direction Check

**Question:** "Let me summarize where we are. We've been digging into the trust model, how UI extension works, what data sources mean in your context, how failures are handled, and API versioning. Before we go further — I still want to explore how plugins are distributed and discovered (marketplace? manual install?), what the developer experience looks like for someone building a plugin, and how you handle permissions (can a plugin access user data? make network calls?). Are those the right areas to focus on, or is there something else on your mind?"

**Why this matters:** Per the skill's interview rhythm guidance, this is a periodic summary and direction check. By question 6, the user has been answering substantive architectural questions and may have new concerns that emerged from their own answers. This question respects the user's agency and ensures the interview is covering what matters most to them, not just what matters most to the interviewer.

**Would use AskUserQuestion:** Yes. The answer redirects the remaining interview.

---

### Question 7: Distribution and Discovery

**Question:** "How do you imagine users finding and installing plugins? Is there a centralized marketplace you'd run, or would plugins be distributed through npm/package managers, or shared as URLs, or something else? And does every plugin get published freely, or is there a review/approval process before a plugin is available to users?"

**Why this matters:** This question bridges the technical architecture and the ecosystem strategy. The answer determines whether there's a review process (which affects trust/security), whether auto-updates are possible (which affects versioning strategy), and how much infrastructure needs to be built beyond the plugin runtime itself. It also reveals whether the user is thinking about this as a curated ecosystem (like Apple's App Store) or an open one (like npm). The review process question is particularly important because it directly connects back to the sandboxing/trust question from earlier.

**Would use AskUserQuestion:** Yes. This may branch into questions about plugin monetization, developer incentives, or content moderation depending on the answer.

---

### Question 8: Developer Experience and Onboarding

**Question:** "Put yourself in the shoes of a third-party developer who wants to build their first plugin for your app. What do they start with? Is there a CLI that scaffolds a plugin project? A local dev environment that simulates the host app? How do they test their plugin against your app without deploying it? And what documentation or examples exist to help them understand what's possible?"

**Why this matters:** Third-party adoption lives or dies on developer experience. The user explicitly wants external developers to build plugins, but hasn't mentioned any tooling or developer-facing concerns. This question forces them to think about the plugin system from the consumer's perspective rather than the builder's perspective. It also surfaces practical concerns: if there's no way to develop and test plugins locally, the iteration cycle will be too slow for anyone to bother. The answer often reveals how far along the thinking actually is — if the user has clear answers here, the project is more mature than the initial prompt suggested.

**Would use AskUserQuestion:** Yes. This is typically one of the last questions before wrapping up, as it shifts from "what does the system do" to "how do people use the system."
