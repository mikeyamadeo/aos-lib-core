# Temporality (The Bitter Lesson — Sutton + Practitioner Extensions)

## The 5 Design Tests
Apply to any architectural decision involving a rapidly-improving component:

| Test | Question |
|------|----------|
| **With or around** | Are you building *with* the component's capabilities or *around* its current deficiencies? |
| **Excitement** | When the component improves, does your architecture benefit or break? |
| **Scaffolding** | As the component improves, does your architecture need *less* prescriptive structure? |
| **Removability** | If you must compensate for a limitation today, is the compensation easy to remove later? |
| **What vs how** | Are you specifying desired outcomes, or prescribing methodology? |

## Durability Classification
Categorize every decision by expected lifespan:
- **Durable**: Objectives, evaluations, constraints, data pipelines, infrastructure, coordination patterns
- **Semi-durable**: Context engineering, tool interfaces, feedback loops — shifts form but doesn't disappear
- **Expiring**: Domain-specific rules, fixed workflows, capability-compensating scaffolding, hard-coded reasoning chains
- **Already expired**: Pipeline RAG, template-based orchestration, complex multi-step validation compensating for reasoning limitations

## Millidge's Scalability Criterion
The real question is not "does this encode domain knowledge?" but **"does this structure scale with the component's improvement?"** Hand-crafted rules don't scale → they become constraints. Specifying objectives and constraints scales → they become more powerful as the component improves.

## The Key Tension
You often *must* build compensating architecture today. The skill is not avoiding scaffolding entirely, but: (a) knowing it's temporary, (b) designing it for removal, and (c) not confusing it with durable architecture.
