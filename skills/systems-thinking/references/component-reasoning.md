# Component Reasoning (DDIA — Kleppmann)

## Storage Engine Trade-offs
- **LSM trees** (Log-Structured Merge): Optimize writes. Good for write-heavy workloads. Compact in background. Used by: Cassandra, RocksDB, LevelDB.
- **B-trees**: Optimize reads. Good for read-heavy workloads with point lookups and range queries. Used by: PostgreSQL, MySQL, most RDBMS.
- **Choice follows from read/write ratio**, not preference.

## Replication Topologies
- **Single-leader**: Linearizable reads from leader. Write bottleneck. Simplest consistency model.
- **Multi-leader**: Better write throughput. Requires conflict resolution. Use when: multi-datacenter, offline-capable clients.
- **Leaderless** (Dynamo-style): High availability. Eventual consistency. Requires quorum reads/writes and conflict resolution (LWW, CRDTs, or application-level).

## Consistency Hierarchy
Linearizability → sequential → causal → eventual. Each step trades correctness for availability and latency. Choose the weakest model the application can tolerate.

## Partitioning
- **Key-range**: Enables range queries. Risks hot spots on sequential keys.
- **Hash**: Even distribution. Destroys ordering. No efficient range scans.
- Secondary indexes: local (scatter-gather on reads) vs global (scatter on writes).

## CAP / PACELC
CAP is about network partitions, not a pick-two menu. PACELC is more useful: if **P**artition → choose **A**vailability or **C**onsistency; **E**lse → choose **L**atency or **C**onsistency.

## Stream vs Batch
- Batch: high throughput, high latency. Reprocessable. Good for analytics, ETL.
- Stream: low latency, continuous. Good for real-time feeds, event-driven systems.
- They compose: kappa architecture (stream-only with reprocessing) vs lambda (parallel batch+stream).
