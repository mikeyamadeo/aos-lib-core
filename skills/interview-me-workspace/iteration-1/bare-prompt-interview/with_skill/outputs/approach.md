# Interview Strategy: Dotfile Manager CLI

## Overall Approach

The prompt gives a clear high-level vision but is thin on specifics. This is an early-stage idea rather than a detailed spec, so the skill instructions say to focus on fundamentals: *what is it, who is it for, what does success look like, what are the hard parts.*

The interview strategy follows the skill's prescribed rhythm:
1. Start with the biggest gaps -- the architectural and design decisions that would cause the most rework if left unaddressed.
2. Let answers guide follow-ups -- go deep where the user reveals uncertainty.
3. Periodically summarize and check direction.
4. Wind down when answers are confident and remaining gaps are minor.

## What's Well-Specified

These aspects are clear enough that I would NOT ask about them:
- **Platform targets**: macOS and Linux. Two specific machines (work laptop, personal desktop).
- **Interface**: CLI tool.
- **Core use case**: Syncing configuration files across machines.
- **Privacy model (high level)**: There are "private" and "public" configs, implying some separation of visibility.

## What's Missing or Vague

Organized by severity of potential rework:

### Critical Unknowns (would ask first)

1. **Sync mechanism and source of truth**: How does syncing actually work? Is there a central remote (git repo, cloud storage, custom server)? Is one machine the source of truth, or is it peer-to-peer? This is the single most consequential architectural decision.

2. **Conflict resolution**: When the same file is edited on both machines before a sync, what happens? This is the hardest technical problem in any sync system and is completely unaddressed.

3. **Private vs. public -- what does this mean concretely?** Does "private" mean secrets/credentials that must never hit a public repo? Or configs that are personal but not secret? Or machine-specific overrides? The implementation differs wildly depending on the answer.

4. **Scope of "dotfiles"**: Which configs? Just shell profiles (.zshrc, .bashrc)? Editor configs (neovim, vim, VS Code settings)? Git config? SSH config? Application configs? The answer shapes the entire file management strategy.

### Important Unknowns (would ask second)

5. **Platform divergence handling**: macOS and Linux often need different configs (Homebrew vs apt packages, different paths, launchd vs systemd). How does the tool handle configs that must differ per platform vs. configs that are identical?

6. **Existing landscape**: Is the user currently using anything (bare git repo, stow, chezmoi, yadm)? What pain points are driving a custom tool? Understanding why existing tools are insufficient is critical to scoping this correctly.

7. **Work vs. personal boundary**: Is the distinction just "which machine" or is it also "which configs"? Can work configs appear on the personal machine and vice versa? Are there compliance or policy constraints on the work side?

### Secondary Unknowns (would ask if time permits)

8. **Installation and bootstrapping**: How does a user set up a fresh machine? What's the "day one" experience?
9. **Secret management specifics**: Are we talking about encrypting files, using a separate secret store, or just .gitignore-level separation?
10. **Templating and variables**: Do configs need machine-specific variable substitution (e.g., different $HOME paths, different usernames)?
11. **Dependency management**: Does the tool also handle installing the software that the configs belong to?
12. **Rollback and history**: Can the user revert to a previous config state?

## Interview Pacing

I would plan for roughly 8-12 questions in the core interview, with natural follow-ups. The first 3-4 questions address the critical unknowns, because those answers reshape everything else. Questions 5-8 address the important unknowns. Beyond that, I would assess whether the user has enough clarity to start building or whether more depth is needed.

I would use `AskUserQuestion` for every question, one at a time, as the skill mandates. Each answer would inform whether I go deeper on that topic or move to the next gap.
