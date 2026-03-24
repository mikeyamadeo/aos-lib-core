# Domain Boundaries (DDD — Evans)

## Bounded Contexts
A boundary within which a domain model is consistent and complete. The same real-world concept (e.g., "user") can have different representations in different contexts:
- Authentication context: credentials, sessions
- Billing context: payment methods, invoices
- Social context: profile, connections

Forcing a single "User" model across all contexts creates coupling. Bounded contexts make this explicit.

## Context Mapping Patterns
How bounded contexts interact:
- **Shared kernel**: Two contexts share a subset of the model. High coupling. Justified only when shared concepts are truly identical.
- **Customer-supplier**: Upstream produces, downstream consumes. Upstream prioritizes downstream needs.
- **Conformist**: Downstream adopts upstream's model as-is. Low effort, high coupling.
- **Anti-corruption layer (ACL)**: Downstream translates upstream's model into its own. High effort, low coupling. Default for external integrations.
- **Published language**: Shared interchange format (Protocol Buffers, JSON Schema) that both sides agree on.

## Aggregates
A cluster of domain objects treated as a single unit for consistency. Transactions should not span aggregates. The rule: if two things must be consistent, same aggregate. If not, eventual consistency across aggregates.

## Ubiquitous Language
Shared vocabulary within a bounded context that all participants use consistently. Prevents bugs caused by two people using the same word to mean different things.

## Strategic vs Tactical
For system design, strategic design (bounded contexts, context maps) matters far more than tactical design (entities, value objects, repositories). Focus on where to draw boundaries, not on implementation patterns within them.
