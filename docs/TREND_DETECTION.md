# Signal-Based Trend Detection Specifications

## 1. Multi-Signal Trend Formula
Rather than assigning static or arbitrary trending badges, PulseAI computes trend scores using four observable real-time signals:

$$\text{TrendScore} = 0.35 \cdot V + 0.30 \cdot D + 0.25 \cdot F + 0.10 \cdot E$$

1. **$V$ (Coverage Velocity)**: Number of articles sharing dynamic keywords published per hour.
2. **$D$ (Source Diversity)**: Number of distinct news domains reporting on the topic.
3. **$F$ (Freshness Score)**: Recency score with exponential age decay ($100 - 4 \times \text{ageHours}$).
4. **$E$ (User Engagement Boost)**: Real-time user opens, bookmarks, and summary requests.

## 2. Trend Classification
Articles and clusters are assigned honest, descriptive category labels:
- **`Trending by coverage`**: High velocity ($V > 70$) + high publisher diversity ($D > 60$).
- **`Rapidly developing`**: High freshness ($F > 85$) + accelerating volume.
- **`Widely reported`**: Broad publisher consensus across global or national desks.
- **`Emerging story`**: Early single-outlet breaking report.
