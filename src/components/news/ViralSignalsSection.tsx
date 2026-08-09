import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Radio,
  ShieldAlert,
  TrendingUp,
  Users,
  Eye,
} from 'lucide-react';
import { api } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import {
  SocialSignal,
  SocialSignalsResponse,
  VerificationStatus,
} from '../../types';
import { ViralSignalsSkeleton } from '../common/Skeleton';
import { GeoScope } from '../common/GeographicScopeSelector';

const STATUS_META: Record<VerificationStatus, { label: string; badge: string; dot: string }> = {
  VERIFIED: {
    label: 'Verified by trusted sources',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  CORROBORATED: {
    label: 'Corroborated by 2+ trusted sources',
    badge: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/80 dark:text-sky-400 dark:border-sky-800',
    dot: 'bg-sky-500',
  },
  DEVELOPING: {
    label: 'Single trusted source — developing',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/80 dark:text-amber-400 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  SOCIAL_ONLY: {
    label: 'Social-only — no trusted confirmation yet',
    badge: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/80 dark:text-violet-400 dark:border-violet-800',
    dot: 'bg-violet-500',
  },
  UNVERIFIED: {
    label: 'Unverified — contradicts trusted reporting',
    badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
  FALSE_MISLEADING: {
    label: 'False or misleading',
    badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/80 dark:text-red-400 dark:border-red-800',
    dot: 'bg-red-500',
  },
};

function formatCount(n: number, suffix: string): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M${suffix}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K${suffix}`;
  return `${n}${suffix}`;
}

interface SignalRowProps {
  signal: SocialSignal;
}

const SignalRow: React.FC<SignalRowProps> = ({ signal }) => {
  const meta = STATUS_META[signal.verificationStatus] ?? STATUS_META.UNVERIFIED;
  const [expanded, setExpanded] = useState(false);
  const rep = signal.representativePost;

  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-50/50 dark:bg-slate-800/30 overflow-hidden">
      <div className="p-3">
        <div className="flex items-start gap-2.5">
          <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${meta.dot}`} aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.badge}`}>
                {signal.verificationStatus}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
                <TrendingUp className="w-3 h-3 text-amber-500" />
                {signal.scores.viralityScore}/100
              </span>
            </div>
            <p className="text-xs font-editorial font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-3 mt-2">
              Viral reports suggest {signal.claim}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-slate-500 dark:text-slate-400 font-ui">
              {rep && (
                <>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {formatCount(rep.engagement?.likes || 0, ' likes')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatCount(rep.engagement?.views || 0, ' views')}
                  </span>
                </>
              )}
              <span>
                {signal.postCount} post{signal.postCount === 1 ? '' : 's'}
                {signal.repostCount > 0 ? ` · ${signal.repostCount} repost` : ''}
              </span>
              {signal.location && <span>📍 {signal.location}</span>}
            </div>
          </div>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2.5 w-full flex items-center justify-between text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider hover:text-sky-600 dark:hover:text-sky-300 transition-colors cursor-pointer"
          aria-expanded={expanded}
        >
          Verification checklist
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {expanded && (
          <div className="mt-2 space-y-1.5 border-t border-slate-200 dark:border-slate-700 pt-2 font-ui">
            <CheckRow label="Trusted corroborations" value={signal.trustedCorroborations} />
            <CheckRow label="Independent publishers" value={signal.independentTrustedPublishers} />
            <CheckRow label="Official statements" value={signal.officialStatements.length} />
            <CheckRow label="Conflicting sources" value={signal.conflictingSources.length} warn={signal.conflictingSources.length > 0} />
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span>Source reliability</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{signal.scores.sourceReliabilityScore}/100</span>
            </div>
            <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 pt-1">
              {meta.label}. Social virality is a lead, not confirmation — treat until trusted reporting agrees.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckRow({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  const icon = warn ? (
    <ShieldAlert className="w-3 h-3 text-red-500 shrink-0" />
  ) : value > 0 ? (
    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
  ) : (
    <span className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
  );
  return (
    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
      <span className="flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="font-mono text-slate-700 dark:text-slate-300">{value}</span>
    </div>
  );
}

interface ViralSignalsSectionProps {
  /** Geographic scope; signals are ordered to match it (lenient, never dropped). */
  scope?: GeoScope;
  /** Increment to force a hard refresh that bypasses the client cache. */
  refreshToken?: number;
}

export const ViralSignalsSection: React.FC<ViralSignalsSectionProps> = ({ scope = 'all', refreshToken = 0 }) => {
  const { t } = useLanguage();
  const [data, setData] = useState<SocialSignalsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const forced = refreshToken > 0;
    api
      .get<SocialSignalsResponse>(`/news/social-signals?scope=${scope}`, { refresh: forced })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData({ signals: [], generatedAt: '', providers: [], mock: false, rawPostsCollected: 0, stale: false });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, refreshToken]);

  if (isLoading) return <ViralSignalsSkeleton />;

  const signals = data?.signals ?? [];
  if (signals.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 shadow-2xs font-ui">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="p-1.5 rounded-lg bg-fuchsia-50 dark:bg-fuchsia-950/80 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-200 dark:border-fuchsia-800">
            <Radio className="w-4 h-4" />
          </div>
          <h3 className="text-base font-editorial font-bold text-slate-900 dark:text-slate-100">Emerging on Social</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-3">
          No social-signal sources are currently connected. PulseAI never scrapes social platforms; when an authorized
          source is configured, early-stage viral leads will appear here as unverified signals.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 space-y-3 shadow-2xs font-ui">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-fuchsia-50 dark:bg-fuchsia-950/80 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-200 dark:border-fuchsia-800">
            <Radio className="w-4 h-4" />
          </div>
          <h3 className="text-base font-editorial font-bold text-slate-900 dark:text-slate-100">Emerging on Social</h3>
        </div>
        <span className="text-[10px] font-bold text-fuchsia-700 dark:text-fuchsia-400 uppercase tracking-wider bg-fuchsia-50 dark:bg-fuchsia-950/80 px-2.5 py-1 rounded-full border border-fuchsia-200 dark:border-fuchsia-800">
          Leads
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 py-1.5">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        Unverified virality. Signals are leads — not confirmed news.
      </div>

      {data?.mock && (
        <div className="flex items-center gap-1.5 text-[10px] text-fuchsia-600 dark:text-fuchsia-400 font-semibold bg-fuchsia-50 dark:bg-fuchsia-950/40 border border-fuchsia-200 dark:border-fuchsia-800/60 rounded-lg px-2.5 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 animate-pulse" />
          Development mock source (SOCIAL_SIGNAL_MOCK_ENABLED)
        </div>
      )}

      <div className="space-y-2.5">
        {signals.slice(0, 5).map((signal) => (
          <SignalRow key={signal.id} signal={signal} />
        ))}
      </div>

      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1 border-t border-slate-100 dark:border-slate-800">
        {t('viralSignals.disclaimer') || 'PulseAI scans social channels only as early-warning leads. Nothing on this card is presented as verified news until corroborated by trusted reporting or official sources.'}
      </p>
    </div>
  );
};
