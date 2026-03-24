# Trade-off Methodology (The Hard Parts — Ford, Richards, Sadalage, Dehghani)

## Architecture Decision Records (ADRs)
For every major decision, document:
- **Context**: What situation prompted this decision?
- **Decision**: What was chosen?
- **Consequences**: What trade-offs does this introduce?
- **Alternatives considered**: What was rejected and why?

The act of writing the ADR often reveals that the reasoning is weaker than assumed.

## Decision Matrix
Options as rows, evaluation criteria as columns. Weight criteria by importance. Score each option. Sum weighted scores. Makes subjective decisions auditable. Use for genuinely hard decisions — not for choosing between logging libraries.

## Trade-off Triangle
For any system, you can optimize for at most two of three competing properties (e.g., performance–cost–complexity). Identify which vertex you're sacrificing and whether that sacrifice is acceptable.

## Coupling Analysis
- **Static coupling**: Compile-time dependencies. Cheap to reduce (interfaces, dependency injection).
- **Dynamic coupling**: Runtime call patterns. Harder to reduce (async messaging, event-driven).
- **Semantic coupling**: Shared meaning/contracts. Hardest — may require redesigning domain boundaries.

Each type requires different mitigation. Reducing static coupling is a refactor. Reducing semantic coupling is a redesign.

## Data Ownership
Who owns the data in a distributed system? The service that writes it? Reads it most? Whose domain it belongs to? Each answer has different consistency and coordination implications. Default: the service whose domain the data belongs to.

## Core Thesis
"Architecture is about managing trade-offs, not finding perfect solutions." The difference between a decision and a justified decision is the ability to articulate what was traded off.
