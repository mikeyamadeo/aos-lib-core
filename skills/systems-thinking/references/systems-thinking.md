# Systems Thinking (Meadows)

## Stocks and Flows
Every system accumulates (stocks) and transfers (flows). A message queue is a stock; publish rate and consume rate are flows. When inflow exceeds outflow, the stock grows — back-pressure, disk exhaustion, cascading failure. Identify stocks and flows to make capacity problems visible before they become incidents.

## Feedback Loops
- **Reinforcing loops** amplify: more users → more content → more users. Growth, but also collapse.
- **Balancing loops** stabilize: high load → auto-scaling → reduced latency → load redistributes.
- A system's behavior is determined by the structure of its feedback loops, not by the intent of its designers.

## Leverage Points (most to least effective)
1. Goals of the system (what are we optimizing for?)
2. Rules (consistency models, retry policies, SLAs)
3. Information flows (monitoring, alerting, observability)
4. Stock-and-flow structure (adding a cache tier, introducing a queue)
5. Buffer sizes (queue depths, cache sizes)
6. Constants and parameters (timeout values, batch sizes)

Interventions at the bottom are easy but low-impact. Interventions at the top are hard but transformative.

## System Archetypes
- **Fixes that backfire**: Cache reduces DB load → stale reads require invalidation → invalidation increases DB load
- **Shifting the burden**: Retries mask unreliable dependency instead of fixing the dependency
- **Tragedy of the commons**: Independent services selfishly consume shared resources (connection pools, rate limits)
- **Growth and underinvestment**: Scaling users without scaling infrastructure until performance degrades and growth stalls

## Key Principle
Emergent behavior exists at the system level, not the component level. Latency percentiles, availability, throughput under contention — these are system properties. Design for the system, not the component.
