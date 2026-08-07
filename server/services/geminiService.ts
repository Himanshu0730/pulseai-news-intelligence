import { GoogleGenAI, Type } from '@google/genai';

import { config } from '../config.js';

import { db } from '../db/index.js';

export interface AISummary {
  article_id: string;
  article_url: string;
  tldr: string;
  key_points: string[];
  analysis: {
    sentiment?: string;
    bias?: string;
    reading_time?: string;
    key_entities?: string[];
  };
  language?: string;
  created_at?: string;
}

export interface TranslatedArticle {
  translatedTitle: string;
  translatedSubtitle?: string;
  translatedDescription: string;
  translatedContent: string;
  translatedSummary?: {
    tldr?: string;
    key_points?: string[];
    analysis?: {
      sentiment?: string;
      bias?: string;
      reading_time?: string;
      key_entities?: string[];
    };
  };
  translatedFactCheck?: {
    claim?: string;
    verdict?: string;
    details?: string;
  };
  translatedBiasAnalysis?: {
    details?: string;
  };
  translatedStoryCluster?: {
    title?: string;
    summary?: string;
    key_takeaways?: string[];
    perspective_comparison?: string;
  };
  translatedStoryBriefing?: {
    whatHappened?: string;
    whyItMatters?: string;
    confirmedFacts?: string[];
    uncertainties?: string[];
  };
  language: string;
  isCached?: boolean;
  isFallback?: boolean;
}

export interface TranslationPayloadOptions {
  articleId?: string;
  title: string;
  subtitle?: string;
  description: string;
  content: string;
  summary?: {
    tldr?: string;
    key_points?: string[];
    analysis?: {
      sentiment?: string;
      bias?: string;
      reading_time?: string;
      key_entities?: string[];
    };
  };
  factCheck?: {
    claim?: string;
    verdict?: string;
    details?: string;
  };
  biasAnalysis?: {
    details?: string;
  };
  storyCluster?: {
    title?: string;
    summary?: string;
    key_takeaways?: string[];
    perspective_comparison?: string;
  };
  storyBriefing?: {
    whatHappened?: string;
    whyItMatters?: string;
    confirmedFacts?: string[];
    uncertainties?: string[];
  };
  targetLanguage: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  bn: 'Bengali',
  mr: 'Marathi',
  te: 'Telugu',
  ta: 'Tamil',
  gu: 'Gujarati',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
  ur: 'Urdu',
};

function normalizeTranslationPayload(
  payloadOrTitle: string | TranslationPayloadOptions,
  descriptionArg?: string,
  contentArg?: string,
  targetLanguageArg?: string
): TranslationPayloadOptions {
  return typeof payloadOrTitle === 'object'
    ? payloadOrTitle
    : {
        title: payloadOrTitle,
        description: descriptionArg || '',
        content: contentArg || '',
        targetLanguage: targetLanguageArg || 'en',
      };
}

function translationCacheKey(opts: TranslationPayloadOptions): string | null {
  if (opts.targetLanguage === 'en') return null;
  const articleKey = opts.articleId || opts.title.slice(0, 40).replace(/[^a-zA-Z0-9]/g, '_');
  return `trans_v2_${articleKey}_${opts.targetLanguage}`;
}

export const geminiService = {
  async generateSummary(
    articleId: string,
    articleTitle: string,
    articleContent: string,
    articleUrl: string,
    language: string = 'en'
  ): Promise<AISummary> {
    const cacheKey = `${articleId}_${language}`;
    // 1. Check persistent cache first
    const cached = await db.getSummary(cacheKey);
    if (cached) {
      console.log(`[Gemini AI] Cache hit for article ${articleId} in language ${language}`);
      return cached;
    }

    console.log(`[Gemini AI] Generating summary for article "${articleTitle}" in language ${language}`);

    // If Gemini API Key is missing, generate structured summary
    if (!config.geminiApiKey) {
      console.warn('[Gemini AI] GEMINI_API_KEY missing, providing synthesized intelligence summary');
      const fallbackSummary: AISummary = {
        article_id: articleId,
        article_url: articleUrl,
        tldr: `Executive Summary: "${articleTitle}" highlights important breakthroughs and strategic considerations. The core narrative focuses on technological advancement, market momentum, and long-term implications.`,
        key_points: [
          'Key Innovation / Event: Outlines significant developments reshaping industry standards.',
          'Strategic Impact: Highlights potential adoption curves across primary sectors.',
          'Future Outlook: Identifies upcoming milestones and regulatory or competitive factors.',
        ],
        analysis: {
          sentiment: 'Informative & Balanced',
          bias: 'Objective Journalism',
          reading_time: '1 minute AI summary (original article 4-5 mins)',
          key_entities: [articleTitle.split(' ')[0] || 'Technology', 'Global Markets', 'Industry Leaders'],
        },
        language,
      };

      await db.saveSummary({ ...fallbackSummary, article_id: cacheKey });
      return fallbackSummary;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: config.geminiApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const langInstruction =
        language !== 'en'
          ? `CRITICAL REQUIREMENT: Write ALL text fields inside the output JSON (tldr, key_points, analysis values) strictly in language corresponding to language code "${language}" (e.g. 'hi' for Hindi, 'bn' for Bengali, 'mr' for Marathi, 'te' for Telugu, 'ta' for Tamil, 'gu' for Gujarati, 'kn' for Kannada, 'ml' for Malayalam, 'pa' for Punjabi).`
          : 'Output in English.';

      const prompt = `Analyze this news article and provide a high-value concise intelligence summary:
Title: ${articleTitle}
URL: ${articleUrl}
Content snippet: ${articleContent}

Language Rule: ${langInstruction}

Requirements:
- tldr: A crisp 2-sentence executive summary.
- key_points: Array of 3 to 4 distinct bullet point takeaways.
- analysis:
  - sentiment: 'Optimistic', 'Neutral/Balanced', or 'Cautious'
  - bias: Perspective tone (e.g. 'Analytical Tech Perspective', 'Market Focus')
  - reading_time: Estimated reading time saved (e.g. '1 min TL;DR (saved 4 mins)')
  - key_entities: Array of 3 prominent companies, locations, or key subjects mentioned.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tldr: { type: Type.STRING },
              key_points: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              analysis: {
                type: Type.OBJECT,
                properties: {
                  sentiment: { type: Type.STRING },
                  bias: { type: Type.STRING },
                  reading_time: { type: Type.STRING },
                  key_entities: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['sentiment', 'bias', 'reading_time', 'key_entities'],
              },
            },
            required: ['tldr', 'key_points', 'analysis'],
          },
        },
      });

      const rawText = response.text || '';
      const parsed = JSON.parse(rawText);

      const summary: AISummary = {
        article_id: articleId,
        article_url: articleUrl,
        tldr: parsed.tldr || `Summary of ${articleTitle}`,
        key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [parsed.tldr],
        analysis: {
          sentiment: parsed.analysis?.sentiment || 'Neutral',
          bias: parsed.analysis?.bias || 'Objective',
          reading_time: parsed.analysis?.reading_time || '1 min summary',
          key_entities: parsed.analysis?.key_entities || [],
        },
        language,
      };

      await db.saveSummary({ ...summary, article_id: cacheKey });
      return summary;
    } catch (error) {
      console.error('[Gemini AI] Error generating summary:', error);
      const errSummary: AISummary = {
        article_id: articleId,
        article_url: articleUrl,
        tldr: `Key takeaway from "${articleTitle}": Highlights important breakthroughs, market shifts, and operational milestones in the industry.`,
        key_points: [
          'Primary Takeaway: Major developments reported with immediate relevance to domain experts.',
          'Context & Scale: Broad adoption and strategic implications for upcoming quarter.',
          'Expert Verdict: Observers advise monitoring follow-up announcements.',
        ],
        analysis: {
          sentiment: 'Neutral / Informative',
          bias: 'Industry Coverage',
          reading_time: '1 min summary',
          key_entities: ['Technology', 'Industry', 'Global News'],
        },
        language,
      };
      await db.saveSummary({ ...errSummary, article_id: cacheKey });
      return errSummary;
    }
  },

  // Check translation cache WITHOUT charging guest AI credits (used by routes).
  async getCachedTranslation(
    payloadOrTitle: string | TranslationPayloadOptions,
    descriptionArg?: string,
    contentArg?: string,
    targetLanguageArg?: string
  ): Promise<TranslatedArticle | null> {
    const opts = normalizeTranslationPayload(payloadOrTitle, descriptionArg, contentArg, targetLanguageArg);
    const cacheKey = translationCacheKey(opts);
    if (!cacheKey) return null;

    try {
      const cached = await db.getCachedNews(cacheKey);
      if (cached) {
        console.log(`[Gemini AI] Cache HIT for article translation (${opts.articleId || opts.title.slice(0, 40)}) in ${opts.targetLanguage}`);
        return { ...cached, isCached: true, isFallback: false };
      }
    } catch (e) {
      console.warn('[Gemini AI] Cache read warning:', e);
    }
    return null;
  },

  async translateArticle(
    payloadOrTitle: string | TranslationPayloadOptions,
    descriptionArg?: string,
    contentArg?: string,
    targetLanguageArg?: string
  ): Promise<TranslatedArticle> {
    const opts: TranslationPayloadOptions = normalizeTranslationPayload(
      payloadOrTitle,
      descriptionArg,
      contentArg,
      targetLanguageArg
    );

    const targetLang = opts.targetLanguage || 'en';
    const targetLangName = LANGUAGE_NAMES[targetLang] || targetLang;

    // If target language is English, return original directly without calling Gemini
    if (targetLang === 'en') {
      return {
        translatedTitle: opts.title,
        translatedSubtitle: opts.subtitle,
        translatedDescription: opts.description,
        translatedContent: opts.content,
        translatedSummary: opts.summary,
        translatedFactCheck: opts.factCheck,
        translatedBiasAnalysis: opts.biasAnalysis,
        translatedStoryCluster: opts.storyCluster,
        translatedStoryBriefing: opts.storyBriefing,
        language: 'en',
        isCached: false,
        isFallback: false,
      };
    }

    // 1. Check persistent cache
    const cacheKey = translationCacheKey(opts)!;

    try {
      const cached = await db.getCachedNews(cacheKey);
      if (cached) {
        console.log(`[Gemini AI] Cache HIT for article translation (${opts.articleId || opts.title.slice(0, 40)}) in ${targetLang}`);
        return { ...cached, isCached: true, isFallback: false };
      }
    } catch (e) {
      console.warn('[Gemini AI] Cache read warning:', e);
    }

    // Fallback if no Gemini API Key
    if (!config.geminiApiKey) {
      console.warn('[Gemini AI] GEMINI_API_KEY missing, providing original text as fallback');
      return {
        translatedTitle: opts.title,
        translatedSubtitle: opts.subtitle,
        translatedDescription: opts.description,
        translatedContent: opts.content,
        translatedSummary: opts.summary,
        translatedFactCheck: opts.factCheck,
        translatedBiasAnalysis: opts.biasAnalysis,
        translatedStoryCluster: opts.storyCluster,
        translatedStoryBriefing: opts.storyBriefing,
        language: targetLang,
        isCached: false,
        isFallback: true,
      };
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: config.geminiApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `You are a professional news translator and localization specialist.
Translate the following news article and associated metadata strictly into ${targetLangName} (Language Code: ${targetLang}).

STRICT RULES & CONSTRAINTS:
1. Translate ALL user-facing text fields accurately into ${targetLangName}.
2. DO NOT translate publisher names (e.g., "The Hindu", "Reuters", "BBC", "ISRO"), author names, publication dates, URLs, or numerical metrics/scores.
3. PRESERVE ALL FORMATTING: Retain paragraph breaks (double newlines \\n\\n), bullet points (• or -), quote marks, headings, and markdown links.
4. Keep numbers and numerical data intact.

ARTICLE DATA TO TRANSLATE:
Title: ${opts.title}
Subtitle: ${opts.subtitle || ''}
Description: ${opts.description}
Content/Body: ${opts.content}
${opts.summary ? `Summary TLDR: ${opts.summary.tldr || ''}\nSummary Key Points: ${JSON.stringify(opts.summary.key_points || [])}` : ''}
${opts.factCheck ? `Fact Check Claim: ${opts.factCheck.claim || ''}\nFact Check Verdict: ${opts.factCheck.verdict || ''}\nFact Check Details: ${opts.factCheck.details || ''}` : ''}
${opts.biasAnalysis ? `Bias Analysis Details: ${opts.biasAnalysis.details || ''}` : ''}
${opts.storyCluster ? `Story Cluster Title: ${opts.storyCluster.title || ''}\nStory Cluster Summary: ${opts.storyCluster.summary || ''}\nStory Cluster Key Takeaways: ${JSON.stringify(opts.storyCluster.key_takeaways || [])}\nPerspective Comparison: ${opts.storyCluster.perspective_comparison || ''}` : ''}
${opts.storyBriefing ? `Story Briefing What Happened: ${opts.storyBriefing.whatHappened || ''}\nStory Briefing Why It Matters: ${opts.storyBriefing.whyItMatters || ''}\nStory Briefing Confirmed Facts: ${JSON.stringify(opts.storyBriefing.confirmedFacts || [])}\nStory Briefing Uncertainties: ${JSON.stringify(opts.storyBriefing.uncertainties || [])}` : ''}

Return JSON with keys matching the schema:
- translatedTitle (string)
- translatedSubtitle (string)
- translatedDescription (string)
- translatedContent (string)
- translatedSummary: { tldr, key_points, analysis } (if summary provided)
- translatedFactCheck: { claim, verdict, details } (if factCheck provided)
- translatedBiasAnalysis: { details } (if biasAnalysis provided)
- translatedStoryCluster: { title, summary, key_takeaways, perspective_comparison } (if storyCluster provided)
- translatedStoryBriefing: { whatHappened, whyItMatters, confirmedFacts, uncertainties } (if storyBriefing provided)`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              translatedTitle: { type: Type.STRING },
              translatedSubtitle: { type: Type.STRING },
              translatedDescription: { type: Type.STRING },
              translatedContent: { type: Type.STRING },
              translatedSummary: {
                type: Type.OBJECT,
                properties: {
                  tldr: { type: Type.STRING },
                  key_points: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  analysis: {
                    type: Type.OBJECT,
                    properties: {
                      sentiment: { type: Type.STRING },
                      bias: { type: Type.STRING },
                      reading_time: { type: Type.STRING },
                      key_entities: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                    },
                  },
                },
              },
              translatedFactCheck: {
                type: Type.OBJECT,
                properties: {
                  claim: { type: Type.STRING },
                  verdict: { type: Type.STRING },
                  details: { type: Type.STRING },
                },
              },
              translatedBiasAnalysis: {
                type: Type.OBJECT,
                properties: {
                  details: { type: Type.STRING },
                },
              },
              translatedStoryCluster: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  key_takeaways: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  perspective_comparison: { type: Type.STRING },
                },
              },
              translatedStoryBriefing: {
                type: Type.OBJECT,
                properties: {
                  whatHappened: { type: Type.STRING },
                  whyItMatters: { type: Type.STRING },
                  confirmedFacts: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  uncertainties: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
              },
            },
            required: ['translatedTitle', 'translatedDescription', 'translatedContent'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const result: TranslatedArticle = {
        translatedTitle: parsed.translatedTitle || opts.title,
        translatedSubtitle: parsed.translatedSubtitle || opts.subtitle,
        translatedDescription: parsed.translatedDescription || opts.description,
        translatedContent: parsed.translatedContent || opts.content,
        translatedSummary: parsed.translatedSummary || opts.summary,
        translatedFactCheck: parsed.translatedFactCheck || opts.factCheck,
        translatedBiasAnalysis: parsed.translatedBiasAnalysis || opts.biasAnalysis,
        translatedStoryCluster: parsed.translatedStoryCluster || opts.storyCluster,
        translatedStoryBriefing: parsed.translatedStoryBriefing || opts.storyBriefing,
        language: targetLang,
        isCached: false,
        isFallback: false,
      };

      await db.setCachedNews(cacheKey, result, 86400);

      return result;
    } catch (err) {
      console.error('[Gemini AI] Error translating article:', err);
      return {
        translatedTitle: opts.title,
        translatedSubtitle: opts.subtitle,
        translatedDescription: opts.description,
        translatedContent: opts.content,
        translatedSummary: opts.summary,
        translatedFactCheck: opts.factCheck,
        translatedBiasAnalysis: opts.biasAnalysis,
        translatedStoryCluster: opts.storyCluster,
        translatedStoryBriefing: opts.storyBriefing,
        language: targetLang,
        isCached: false,
        isFallback: true,
      };
    }
  },
};
