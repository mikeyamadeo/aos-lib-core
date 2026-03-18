# Interview Questions: Dotfile Manager CLI

## Analysis of the Prompt

### What's well-specified
- **Form factor**: CLI tool. Clear and unambiguous.
- **Platform targets**: macOS and Linux. Two specific machines mentioned (work laptop, personal desktop).
- **Core function**: Managing and syncing dotfiles/configs.
- **Privacy dimension**: There is a notion of "private" vs "public" configs.

### What's missing or underspecified
- No sync mechanism described (git-based? rsync? custom server? cloud storage?)
- No conflict resolution strategy
- "Private" and "public" are undefined -- could mean secrets vs. non-secrets, or personal vs. shared, or repo visibility
- No clarity on which dotfiles/configs are in scope
- No explanation of how platform differences are handled
- No mention of why existing tools (chezmoi, stow, yadm, bare git repos) are insufficient
- No bootstrapping or first-run story
- No mention of how work/personal boundary interacts with private/public boundary
- No secret management strategy
- No templating or variable substitution model
- No rollback or versioning story
- No mention of whether this is for personal use only or intended for others

---

## Questions (in order)

### Question 1: Sync Mechanism and Source of Truth

**Question:** "You mention syncing configs between your work laptop and personal desktop. Walk me through how you picture that working mechanically -- is there a central place (like a git repo or cloud folder) that both machines push to and pull from, or are you thinking of direct machine-to-machine sync? And when you make a change on one machine, does it get to the other automatically, or do you run a command?"

**Why this matters:** This is the foundational architectural decision. Every other feature -- conflict resolution, private/public separation, bootstrapping -- depends on whether the sync model is git-based, file-system-based, server-based, or something else. Getting this wrong means rebuilding the core.

**Would use AskUserQuestion:** Yes.

---

### Question 2: Conflict Resolution

**Question:** "Say you tweak your .zshrc on your work laptop Monday morning, and that evening you also tweak it on your desktop without syncing first. When you next sync, what should happen? Should one machine's version always win, should the tool merge changes, or should it flag the conflict and make you choose?"

**Why this matters:** Conflict resolution is the hardest problem in any sync system. The answer determines whether this is a simple "last write wins" tool, a git-merge-style tool, or something with manual conflict resolution. Leaving this undefined leads to data loss or a frustrating user experience.

**Would use AskUserQuestion:** Yes.

---

### Question 3: What "Private" and "Public" Actually Mean

**Question:** "You said the tool should support private and public configs. Can you give me a concrete example of each? Specifically, I want to understand: does 'private' mean files containing secrets like API keys and tokens that must be encrypted or excluded from version control? Or does it mean configs that are personal/machine-specific but not necessarily secret? And does 'public' mean you'd literally share these in a public GitHub repo for others to see?"

**Why this matters:** The implementation of private/public is completely different depending on the answer. If "private" means secrets, you need encryption or a secret store. If it means "not shared publicly," you might just need a private repo or .gitignore. If "public" means literally open-source dotfiles, the separation strategy needs to be rigorous to prevent accidental secret leakage. This is also a security-critical decision.

**Would use AskUserQuestion:** Yes.

---

### Question 4: Scope of Configs

**Question:** "Which configs are you actually managing today? I'm trying to understand the full surface area -- is this just shell configs (.zshrc, .bashrc), or does it extend to editor configs (neovim, VS Code), git config, SSH config, application settings, maybe even system-level things like Homebrew bundles or package lists?"

**Why this matters:** The scope determines the tool's complexity. Shell dotfiles are simple text files in $HOME. But editor configs live in nested directories, VS Code settings are in platform-specific paths, and package lists are a different category entirely. Knowing the boundary prevents scope creep and informs the file-management model (symlinks vs. copies vs. templates).

**Would use AskUserQuestion:** Yes.

---

### Question 5: Why Not an Existing Tool?

**Question:** "There are several established tools in this space -- chezmoi, GNU Stow, yadm, bare git repos. Have you tried any of these, and what specifically didn't work for you? I'm asking because the answer tells me what this tool needs to do differently."

**Why this matters:** If the user has tried existing tools and found specific shortcomings, those shortcomings define the core value proposition of this new tool. If they haven't tried them, some of these tools might already solve their problem. Either way, the answer prevents building something that already exists or repeating known mistakes.

**Would use AskUserQuestion:** Yes.

---

### Question 6: Platform Divergence

**Question:** "macOS and Linux often need different configurations -- different package managers, different file paths, sometimes different shell defaults. How do you handle a config that needs to be slightly different on each platform? For example, if your .zshrc sources a Homebrew init on macOS but not on Linux, do you want one file with conditional logic, two separate platform-specific files, or some kind of template with variables?"

**Why this matters:** This is where many dotfile managers get complicated. The answer determines whether the tool needs a templating engine, platform-detection logic, conditional includes, or just separate file trees per OS. It also reveals how much complexity the user is willing to accept in their config files themselves.

**Would use AskUserQuestion:** Yes.

---

### Question 7: Work/Personal Boundary

**Question:** "You have a work laptop and a personal desktop. Is the split purely by machine -- meaning everything on the work laptop is 'work' and everything on the desktop is 'personal'? Or are there configs you want on both machines, configs that should only be on work, and configs that should only be on personal? And on the work side, are there any corporate policies about what tools you can use or where company configs can be stored?"

**Why this matters:** This probes a potential conflict between two categorization axes: private/public and work/personal. If work configs include proprietary settings or credentials, they intersect with the private/public model. Corporate policies might constrain storage choices (e.g., no public repos for anything work-related). The tool needs a coherent model for tagging and filtering configs across both dimensions.

**Would use AskUserQuestion:** Yes.

---

### Question 8: Bootstrap and First-Run Experience

**Question:** "Imagine you just got a brand new MacBook from work, or you reinstalled Linux on your desktop. Walk me through what happens: how do you get the tool itself installed, how does it know where your configs live, and what does it do to set up the machine? Is it a single command that pulls everything down and puts files in the right places?"

**Why this matters:** The bootstrapping experience is often the most painful part of dotfile management and the moment where the tool's value is most visible. If the tool requires itself to already be configured in order to work, there's a chicken-and-egg problem. The answer also reveals whether the tool needs to handle dependency installation (e.g., installing zsh before deploying .zshrc).

**Would use AskUserQuestion:** Yes.

---

## Follow-Up Questions (would ask depending on answers above)

These are questions I would hold in reserve, deploying them based on what the first 8 answers reveal:

- **Secret management specifics:** "For configs that contain secrets, are you thinking encryption at rest (like age/sops), a separate secret manager (1Password CLI, Vault), or just keeping those files out of version control entirely?"
- **Templating depth:** "Beyond platform differences, do any of your configs need machine-specific variables -- like different hostnames, usernames, or directory paths -- substituted in at deploy time?"
- **Rollback:** "If a sync puts a broken config on a machine, how do you get back to the previous working state? Is version history important to you?"
- **Audience:** "Is this tool just for you, or are you building it for others to use too? That changes how much you need to invest in documentation, error messages, and configuration flexibility."
- **Monitoring/validation:** "After syncing, how do you know it worked? Do you want the tool to verify that configs are in the right place, or just trust the sync?"
