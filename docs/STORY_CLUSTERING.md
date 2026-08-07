# Incremental Story Clustering Engine Specifications

## 1. Threshold-Based Clustering Logic
PulseAI groups articles covering the same real-world event into unified `StoryCluster` instances.

```
Incoming Article
       |
       v
Check Canonical URL / Explicit Cluster ID
       |
       ├─► [ Match Found ] ──► Add to existing cluster
       |
       └─► [ No Direct Match ] ──► Calculate Similarity Score S against active cluster representatives
                                     S = 0.60 * TitleSim + 0.30 * DescSim + 0.10 * CategoryMatch
                                     
                                     If S >= 0.35:
                                         Assign to best matching cluster
                                     Else:
                                         Spawn new cluster
```

## 2. Cluster Metadata
Every cluster computes:
- **`clusterTitle`**: Representative title from the primary or earliest reporting outlet.
- **`sourcesCount`**: Total number of articles in cluster.
- **`distinctPublisherCount`**: Count of unique reporting publishers (e.g. PIB, Reuters, The Hindu).
- **`timeline`**: `firstSeen` and `latestUpdate` timestamps tracking narrative evolution.
- **`summaryBriefing`**: Cross-source agreement, differences, and confirmed facts.
