# Access Patterns (interviewing.io)

## Access-Pattern-First Design
Before choosing any technology:
1. Identify business objects and their relationships
2. Express access patterns: **"Given [object A], retrieve all related [object B]"**
3. Classify each by frequency, latency requirement, and consistency need
4. Derive storage decisions from the access patterns — not the other way around

This prevents choosing a database and then discovering it doesn't support your access patterns.

## Data Classification
Before choosing storage, classify each data type:
- **Structured vs blob**: Structured (relationships, queries) → relational or document store. Blobs (images, video, files) → object storage.
- **Read-heavy vs write-heavy**: Read-heavy + staleness-tolerant → add cache. Write-heavy → append-only stores, write-optimized engines.
- **Access shape**: Point lookups → hash indexes. Range scans → B-trees. Graph traversals → graph DB or adjacency lists.

## Scaling Justification
Every scaling technique must be justified by a specific bottleneck:
- **Cache**: Same data read frequently + expensive computation + staleness tolerable
- **Horizontal scaling**: Single instance can't handle the request rate
- **Sharding**: Single DB can't hold the data or serve the query rate
- **CDN**: Static content + geographically distributed users

If you can't name the bottleneck, don't add the infrastructure.

## Powers-of-10 Estimation
- 1 server ≈ 10K concurrent connections
- 1 database ≈ 10K queries/sec (simple), 1K queries/sec (complex joins)
- 1 GB/sec ≈ network throughput within a datacenter

Use to identify which components hit limits at estimated scale.
