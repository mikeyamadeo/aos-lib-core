# Risk Calibration (Fairbanks)

## The Risk-Driven Model
A 3-step loop — the core calibration mechanism for "how much design is enough?"

1. **Identify and prioritize risks.** What can go wrong? Rank by probability × impact. A system with 100 users has different risks than a payment system processing $1M/day.
2. **Select architectural techniques.** Choose techniques proportional to the risk. High risk of data loss → replication, backups, WAL. Low risk → single database is fine.
3. **Evaluate risk reduction.** Did the technique reduce the risk? If not, try a different technique or re-evaluate the risk.

Repeat until identified risks are at an acceptable level. No more, no less.

## Architecture Hoisting
Decisions should be made at the appropriate level:
- **Low-risk, reversible** → code level (function signatures, local data structures)
- **High-risk, irreversible** → architecture level (database choice, consistency model, service boundaries)

Don't hoist everything. Don't leave everything un-hoisted.

## "Just Enough" Principle
- **Accidental simplicity**: Ignoring real risks. Under-engineering.
- **Accidental complexity**: Addressing phantom risks. Over-engineering.
- **Just enough**: Rigor proportional to actual risk. Every technique has overhead — only justified if risk reduction exceeds the overhead.

## Architecture as Engineering
Architecture is the set of decisions that are hard to change. This definition is functional, not structural — what counts as "architecture" depends on the system. Architecture is risk management, not aesthetic preference.
