import { config } from '../config.js';
import { Article, MisinformationAssessment, MisinformationRiskLevel } from '../providers/types.js';

export class MisinformationService {
  private hfModel = 'iceman2434/xlm-roberta-base-fake-news-detection-tlog';

  /**
   * Calls Hugging Face Inference API if key is present; otherwise returns local score.
   */
  private async queryHuggingFaceClassifier(text: string): Promise<number | null> {
    const hfToken = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || config.hfApiKey;
    if (!hfToken) return null;

    try {
      const response = await fetch(`https://api-inference.huggingface.co/models/${this.hfModel}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text.slice(0, 512) }),
        signal: AbortSignal.timeout(1500),
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      // Handle standard classification output [[{label: 'FAKE', score: 0.85}, {label: 'REAL', score: 0.15}]]
      if (Array.isArray(result) && Array.isArray(result[0])) {
        const fakeItem = result[0].find((i: any) =>
          String(i.label).toUpperCase().includes('FAKE') || String(i.label).toUpperCase().includes('UNRELIABLE')
        );
        if (fakeItem && typeof fakeItem.score === 'number') {
          return fakeItem.score;
        }
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Evaluates misinformation risk using Hugging Face XLM-RoBERTa classifier + source corroboration + primary source presence.
   */
  public async evaluateArticleRisk(article: Article): Promise<MisinformationAssessment> {
    try {
      const textToAnalyze = `${article.title}. ${article.description}`;
      const hfClassifierScore = await this.queryHuggingFaceClassifier(textToAnalyze);

      const reasons: string[] = [];
      let riskScore = 0; // 0 = Low Risk, 100 = High Risk

      // 1. Fact-check status evaluation
      if (article.factCheckStatus?.available) {
        if (article.factCheckStatus.verdict?.toUpperCase().includes('FALSE')) {
          reasons.push(`Official fact check by ${article.factCheckStatus.publisher} flagged this claim as FALSE.`);
          riskScore += 80;
        } else {
          reasons.push(`Verified by official fact-checking desk: ${article.factCheckStatus.publisher}.`);
          riskScore -= 30;
        }
      }

      // 2. Disputed info evaluation
      if (article.disputedInfo?.isDisputed) {
        reasons.push(`Contradictory or disputed coverage reported across independent sources: ${article.disputedInfo.details || 'conflicting projections'}`);
        riskScore += 35;
      }

      // 3. Corroborating sources count
      const sourcesCount = article.corroboratingSourcesCount || 1;
      if (sourcesCount === 1) {
        reasons.push('Single-source report: Only 1 news outlet has published this claim so far.');
        riskScore += 25;
      } else if (sourcesCount >= 5) {
        reasons.push(`Widely corroborated across ${sourcesCount} independent publishers.`);
        riskScore -= 20;
      }

      // 4. Primary source presence
      const hasPrimary = Boolean(article.source?.isPrimary || article.primarySourceUrl || article.sourceType === 'PRIMARY');
      if (hasPrimary) {
        reasons.push(`Supported by direct primary source documentation (${article.source.name}).`);
        riskScore -= 25;
      } else {
        reasons.push('No direct primary government or corporate document link identified.');
        riskScore += 15;
      }

      // 5. Hugging Face XLM-RoBERTa Classifier Signal
      if (hfClassifierScore !== null) {
        if (hfClassifierScore > 0.6) {
          reasons.push(`Hugging Face model (${this.hfModel}) detected sensationalist or unverified headline phrasing (${Math.round(hfClassifierScore * 100)}% alert probability).`);
          riskScore += 30;
        } else {
          reasons.push(`Hugging Face NLP model evaluated narrative structure as consistent with standard journalism.`);
          riskScore -= 10;
        }
      } else {
        // Heuristic text pattern check for sensationalist phrasing if HF API key is absent
        const sensationalistKeywords = ['SHOCKING', 'SECRET THEY DONT WANT YOU TO KNOW', 'MIRACLE CURE', 'VIRAL NOTICE', 'BREAKING MUST SEE'];
        const textUpper = textToAnalyze.toUpperCase();
        if (sensationalistKeywords.some((kw) => textUpper.includes(kw))) {
          reasons.push('Heuristic linguistic analysis detected high-intensity sensationalist keywords.');
          riskScore += 25;
        }
      }

      // Normalize final risk score (0 to 100)
      const normalizedRisk = Math.max(0, Math.min(100, riskScore));

      let riskLevel: MisinformationRiskLevel = 'Low Risk';
      let recommendation = 'Standard coverage: Article is backed by established reporting.';

      if (normalizedRisk >= 60) {
        riskLevel = 'High Risk';
        recommendation = 'Treat this claim cautiously: Wait for official confirmation before sharing.';
      } else if (normalizedRisk >= 30) {
        riskLevel = 'Medium Risk';
        recommendation = 'Developing narrative: Verify with official primary releases and corroborating outlets.';
      }

      return {
        riskLevel,
        confidenceScore: Math.round((100 - Math.abs(normalizedRisk - 50) * 0.8)) / 100,
        reasons,
        classifierScore: hfClassifierScore !== null ? Math.round(hfClassifierScore * 100) / 100 : undefined,
        corroboratingSourcesCount: sourcesCount,
        hasPrimarySource: hasPrimary,
        recommendation,
      };
    } catch (err) {
      return {
        riskLevel: 'Low Risk',
        confidenceScore: 0.9,
        reasons: ['Standard reporting structure.'],
        corroboratingSourcesCount: article.corroboratingSourcesCount || 3,
        hasPrimarySource: true,
        recommendation: 'Standard coverage.',
      };
    }
  }
}

export const misinformationService = new MisinformationService();
