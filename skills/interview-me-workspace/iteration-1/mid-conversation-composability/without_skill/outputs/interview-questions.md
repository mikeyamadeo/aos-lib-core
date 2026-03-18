# Interview: Plugin System for Boost-OS

## Analysis: What's Stated vs. What's Missing

### What's Stated (Explicitly or Implied by Codebase)

- **Runtime-loaded plugins** that extend UI and add new data sources
- **Third-party developer support** is a goal
- A working first-party plugin architecture already exists: `plugins/src/` with `core` and `hubspot` plugins, a `marketplace.json` registry, and `plugin.json` manifests per plugin
- Plugins currently contain **skills** (markdown-driven AI workflows like `interview-me`, `research`) and **commands** (like `create-skill`, `refine-prompt`)
- There is a `meta` plugin that is self-referential -- it creates other plugins/skills
- Plugins are loaded via `claude --plugin-dir plugins/src/`
- The system uses progressive disclosure: metadata always in context, SKILL.md loaded on trigger, bundled resources loaded on demand
- A packaging/distribution format exists (`.skill` zip files)
- The schema.yaml sketches out a broader architecture: brain (knowledge), space (projects), plugins, apps

### What's Missing or Underspecified

These are the gaps I would probe during the interview, roughly ordered from "would cause the most rework if unaddressed" to "important but deferrable":

1. **Plugin boundary and contract definition** -- What exactly constitutes the plugin API surface? Right now plugins are essentially directories of markdown files that Claude reads. If third-party developers will build plugins, what is the stable contract they code against? What can change without breaking their plugins?

2. **"Extend the UI" is vague** -- The current system is CLI-based (Claude Code). What does "UI extension" mean in this context? Adding new slash commands? Rendering custom output? Or is there a planned graphical interface where plugins would contribute visual components?

3. **"New data sources" is vague** -- The HubSpot plugin integrates via API keys and expertise.yaml config. Is this the model for all data source plugins? How do credentials flow? Is there a standardized data source interface, or does each plugin bring its own?

4. **Security and sandboxing for third-party code** -- The justfile includes `--dangerously-skip-permissions`. Plugins can contain executable Python scripts. What prevents a malicious third-party plugin from exfiltrating data, modifying the brain/knowledge base, or executing destructive commands?

5. **Discovery and distribution** -- `marketplace.json` exists but is a local flat file. How do third-party developers publish plugins? How do users discover them? Is there a registry, a store, or just git repos?

6. **Versioning and compatibility** -- `plugin.json` has a version field but no dependency or compatibility constraints. What happens when the host system evolves? How are breaking changes communicated?

7. **Plugin isolation and conflict resolution** -- What happens when two plugins register skills with overlapping trigger descriptions? The current system relies on natural language description matching -- how does priority work?

8. **State and persistence** -- Plugins appear stateless today (markdown instructions + scripts). Can plugins persist configuration or state across sessions? Where does that state live?

9. **Composability between plugins** -- The interview-me skill is designed to "compose with other workflows." But this is implicit (via conversation context). Is there a formal mechanism for plugin-to-plugin communication?

10. **Testing and quality assurance** -- The skill-creation flow mentions "iterate based on real usage" but there is no automated testing framework. How would third-party plugin quality be assured?

---

## Interview Questions (Ordered)

### Question 1: What does "extend the UI" actually mean for a CLI-based agent system?

**Why this matters:** This is the single biggest ambiguity. The current system is pure CLI (Claude Code). If "UI" means adding slash commands and custom output formatting, that's a fundamentally different plugin API than if it means contributing React components to a future web dashboard. The entire plugin contract depends on the answer. Getting this wrong means rebuilding the plugin interface layer.

---

### Question 2: When you say third-party developers, who specifically are you picturing -- and what do they already know?

**Why this matters:** "Third-party developers" could mean power users building personal plugins (like you with HubSpot), a small community of Claude Code enthusiasts, or a broad developer ecosystem with a marketplace. Each scenario implies radically different levels of documentation, sandboxing, versioning discipline, and distribution infrastructure. The investment profile changes by an order of magnitude depending on the answer.

---

### Question 3: Your HubSpot plugin relies on an API key and an expertise.yaml config file. Is this the general pattern you envision for all data source plugins, or should there be a standardized data source interface that plugins implement?

**Why this matters:** Right now each plugin brings its own integration approach. That works for first-party plugins where you control everything, but third-party developers need a predictable contract. If there is no standard interface for data sources (authentication, querying, schema exposure), every plugin will reinvent the wheel differently, and users will face inconsistent experiences. This also determines whether plugins can interoperate -- e.g., can a "reporting" plugin query data from both the HubSpot plugin and a future Salesforce plugin through a common interface?

---

### Question 4: A third-party plugin can include arbitrary Python scripts that Claude will execute. What's your plan for preventing a malicious or buggy plugin from reading your brain/ directory, exfiltrating API keys, or running destructive commands?

**Why this matters:** This is the security question that third-party support makes unavoidable. Today your justfile has both a sandboxed and a `dangerously-skip-permissions` mode. But the plugin architecture itself has no isolation layer -- a plugin's scripts run with the same permissions as the host. For first-party plugins you trust, this is fine. For third-party code, it is a serious risk. The answer determines whether you need a permission model, a sandboxed execution environment, or at minimum a review/signing process.

---

### Question 5: Two plugins both define skills with overlapping trigger descriptions -- say a "research" skill from core and a "research" skill from a third-party analytics plugin. What happens?

**Why this matters:** The current triggering mechanism is entirely based on natural language description matching in YAML frontmatter. This works elegantly when one person controls all plugins, but breaks down with multiple independent authors. This question probes namespace collisions, priority/ordering, and whether users need the ability to disable or override specific skills from specific plugins. It also surfaces whether you need explicit namespacing (e.g., `core:research` vs `analytics:research`).

---

### Question 6: Can a plugin persist state or configuration across sessions today, and should it be able to?

**Why this matters:** The current plugin architecture appears stateless -- plugins are markdown files and scripts that run fresh each time. But real plugins often need to remember things: user preferences, cached API tokens, intermediate results, learned patterns. If plugins cannot persist state, their usefulness is limited. If they can, you need to define where state lives, how it is scoped (per-user? per-project? global?), and what happens to plugin state when a plugin is uninstalled or updated.

---

### Question 7: You have a packaging system (`.skill` files) and a local `marketplace.json` registry. What is your actual distribution story -- how does a third-party developer get their plugin to a user?

**Why this matters:** Distribution is where most plugin ecosystems live or die. The current system is local-only. The gap between "I can zip a skill and hand it to someone" and "there's a searchable registry with versioned packages, dependency resolution, and update notifications" is enormous. Understanding the target point on that spectrum determines how much infrastructure to build, and whether existing distribution mechanisms (npm, git repos, a custom registry) are sufficient.

---

### Question 8: The interview-me skill mentions it is "designed to compose with other workflows." But this composition is implicit -- it happens through conversation context. If you want plugins to formally depend on or invoke capabilities from other plugins, what does that look like?

**Why this matters:** Composability is where plugin systems either become powerful ecosystems or remain collections of isolated features. Right now the meta plugin creates skills, and skills reference other skills informally. But there is no import/require mechanism, no way for a plugin to declare "I need the research skill to be available," and no way to invoke another plugin's capability programmatically. If composability is important (and your schema.yaml suggests it is, with plugins spanning core, meta, and domain-specific concerns), the plugin contract needs to support it explicitly. Otherwise you will end up with plugins duplicating each other's functionality.

