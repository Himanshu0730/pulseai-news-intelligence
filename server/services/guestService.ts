import { config } from '../config.js';

interface GuestUsage {
  date: string;
  articlesOpened: number;
  searchesPerformed: number;
  aiRequestsPerformed: number;
}

class GuestService {
  private store: Map<string, GuestUsage> = new Map();

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getUsage(guestId: string): GuestUsage {
    const today = this.getTodayString();
    const existing = this.store.get(guestId);

    if (!existing || existing.date !== today) {
      const initial: GuestUsage = {
        date: today,
        articlesOpened: 0,
        searchesPerformed: 0,
        aiRequestsPerformed: 0,
      };
      this.store.set(guestId, initial);
      return initial;
    }

    return existing;
  }

  public getGuestStatus(guestId: string) {
    const usage = this.getUsage(guestId);
    return {
      date: usage.date,
      articlesOpened: usage.articlesOpened,
      articlesLimit: config.guestArticleLimit,
      articlesRemaining: Math.max(0, config.guestArticleLimit - usage.articlesOpened),
      searchesPerformed: usage.searchesPerformed,
      searchesLimit: config.guestSearchLimit,
      searchesRemaining: Math.max(0, config.guestSearchLimit - usage.searchesPerformed),
      aiRequestsPerformed: usage.aiRequestsPerformed,
      aiLimit: config.guestAiLimit,
      aiRemaining: Math.max(0, config.guestAiLimit - usage.aiRequestsPerformed),
    };
  }

  public checkAndIncrementArticle(guestId: string): { allowed: boolean; remaining: number; limit: number } {
    const usage = this.getUsage(guestId);
    if (usage.articlesOpened >= config.guestArticleLimit) {
      return { allowed: false, remaining: 0, limit: config.guestArticleLimit };
    }
    usage.articlesOpened += 1;
    return {
      allowed: true,
      remaining: config.guestArticleLimit - usage.articlesOpened,
      limit: config.guestArticleLimit,
    };
  }

  public checkAndIncrementSearch(guestId: string): { allowed: boolean; remaining: number; limit: number } {
    const usage = this.getUsage(guestId);
    if (usage.searchesPerformed >= config.guestSearchLimit) {
      return { allowed: false, remaining: 0, limit: config.guestSearchLimit };
    }
    usage.searchesPerformed += 1;
    return {
      allowed: true,
      remaining: config.guestSearchLimit - usage.searchesPerformed,
      limit: config.guestSearchLimit,
    };
  }

  public checkAndIncrementAi(guestId: string): { allowed: boolean; remaining: number; limit: number } {
    const usage = this.getUsage(guestId);
    if (usage.aiRequestsPerformed >= config.guestAiLimit) {
      return { allowed: false, remaining: 0, limit: config.guestAiLimit };
    }
    usage.aiRequestsPerformed += 1;
    return {
      allowed: true,
      remaining: config.guestAiLimit - usage.aiRequestsPerformed,
      limit: config.guestAiLimit,
    };
  }
}

export const guestService = new GuestService();
