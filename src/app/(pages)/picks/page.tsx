'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface GolferScore {
  golferId: string;
  golferName: string;
  ranking: number | null;
  scoreToPar: number | null;
  r1Score: number | null;
  r2Score: number | null;
  r3Score: number | null;
  r4Score: number | null;
  status: string;
  isCounting: boolean;
}

interface Tournament {
  id: string;
  name: string;
  course: string;
  startDate: string;
  endDate: string;
  isComplete: boolean;
  results?: Array<{
    golferId: string;
    scoreToPar: number | null;
    r1Score: number | null;
    r2Score: number | null;
    r3Score: number | null;
    r4Score: number | null;
    status: string;
  }>;
}

interface League {
  id: string;
  name: string;
}

function formatScore(score: number | null): string {
  if (score == null) return '--';
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : `${score}`;
}

function formatRound(score: number | null): string {
  if (score == null) return '-';
  return String(score);
}

export default function MyTeamPage() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [golfers, setGolfers] = useState<GolferScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [meRes, tournamentRes, leaguesRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/tournaments/current'),
          fetch('/api/leagues'),
        ]);

        if (!meRes.ok) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        if (!tournamentRes.ok) {
          setLoading(false);
          return;
        }

        const tournamentData = await tournamentRes.json();
        if (!tournamentData.tournament) {
          setLoading(false);
          return;
        }

        const detailRes = await fetch(`/api/tournaments/${tournamentData.tournament.id}`);
        const detail = detailRes.ok ? await detailRes.json() : tournamentData.tournament;
        setTournament(detail);

        if (leaguesRes.ok) {
          const leaguesData = await leaguesRes.json();
          setLeagues(leaguesData.leagues || []);
          if (leaguesData.leagues?.length > 0) {
            setSelectedLeagueId(leaguesData.leagues[0].id);
          }
        }
      } catch {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Fetch user's picks when league/tournament changes
  useEffect(() => {
    if (!selectedLeagueId || !tournament) return;

    async function fetchPicks() {
      try {
        const picksRes = await fetch(
          `/api/picks/${tournament!.id}?leagueId=${selectedLeagueId}`
        );
        if (!picksRes.ok) return;
        const picksData = await picksRes.json();
        const picks = picksData.picks || [];

        if (picks.length === 0) {
          setGolfers([]);
          return;
        }

        // Build results map
        const resultsMap = new Map<string, {
          scoreToPar: number | null;
          r1Score: number | null;
          r2Score: number | null;
          r3Score: number | null;
          r4Score: number | null;
          status: string;
        }>();
        if (tournament!.results) {
          for (const r of tournament!.results) {
            resultsMap.set(r.golferId, r);
          }
        }

        const golferScores: GolferScore[] = picks.map((p: {
          golferId: string;
          golferName: string;
          ranking?: number | null;
        }) => {
          const result = resultsMap.get(p.golferId);
          return {
            golferId: p.golferId,
            golferName: p.golferName,
            ranking: p.ranking ?? null,
            scoreToPar: result?.scoreToPar ?? null,
            r1Score: result?.r1Score ?? null,
            r2Score: result?.r2Score ?? null,
            r3Score: result?.r3Score ?? null,
            r4Score: result?.r4Score ?? null,
            status: result?.status ?? 'active',
            isCounting: false,
          };
        });

        // Determine best 4 only if scores exist
        const anyScores = golferScores.some(g => g.scoreToPar != null);
        if (anyScores) {
          const sorted = [...golferScores].sort(
            (a, b) => (a.scoreToPar ?? 999) - (b.scoreToPar ?? 999)
          );
          const best4Ids = new Set(sorted.slice(0, 4).map((g) => g.golferId));
          for (const g of golferScores) {
            g.isCounting = best4Ids.has(g.golferId);
          }
          golferScores.sort((a, b) => {
            if (a.isCounting !== b.isCounting) return a.isCounting ? -1 : 1;
            return (a.scoreToPar ?? 999) - (b.scoreToPar ?? 999);
          });
        } else {
          // No scores yet - all golfers shown equally, sorted by ranking
          for (const g of golferScores) g.isCounting = true;
          golferScores.sort((a, b) => (a.ranking ?? 999) - (b.ranking ?? 999));
        }

        setGolfers(golferScores);
      } catch {
        // ignore
      }
    }
    fetchPicks();
  }, [selectedLeagueId, tournament]);

  const anyScores = golfers.some(g => g.scoreToPar != null);
  const teamTotal = anyScores
    ? golfers.filter((g) => g.isCounting).reduce((sum, g) => sum + (g.scoreToPar ?? 0), 0)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-augusta-green" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8">
        <Card className="p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
        </Card>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="px-4 py-8">
        <Card className="p-8 text-center">
          <h2 className="text-lg font-bold text-gray-900 mb-2">No Active Tournament</h2>
          <p className="text-gray-500 text-sm mb-4">Check back when a tournament is scheduled.</p>
          <Link href="/dashboard">
            <Button variant="secondary">Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (golfers.length === 0) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Team</h1>
          <p className="text-sm text-gray-500">{tournament.name}</p>
        </div>
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">No golfers drafted yet for this tournament.</p>
          <Link href="/draft">
            <Button variant="primary">Go to Draft</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 pb-24 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Team</h1>
          <p className="text-sm text-gray-500">{tournament.name}</p>
        </div>
        {leagues.length > 1 && (
          <select
            value={selectedLeagueId}
            onChange={(e) => setSelectedLeagueId(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006747]"
          >
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Team Total */}
      <Card goldBorder className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              {anyScores ? 'Team Total' : 'Your Roster'}
            </p>
            <p className="text-sm text-gray-400">
              {anyScores ? 'Best 4 of 7' : `Starts ${new Date(tournament.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
            </p>
          </div>
          {anyScores ? (
            <p
              className={`text-3xl font-bold ${
                teamTotal! < 0 ? 'text-red-600' : teamTotal! > 0 ? 'text-gray-700' : 'text-[#006747]'
              }`}
            >
              {formatScore(teamTotal)}
            </p>
          ) : (
            <p className="text-lg font-semibold text-gray-400">7 golfers</p>
          )}
        </div>
      </Card>

      {/* Golfer List */}
      <div className="space-y-2">
        {golfers.map((golfer, idx) => (
          <Card
            key={golfer.golferId}
            className={`overflow-hidden ${!golfer.isCounting && anyScores ? 'opacity-60' : ''}`}
          >
            <div
              className={`px-4 py-3 ${
                golfer.isCounting
                  ? 'bg-[#006747]/5 border-l-4 border-[#006747]'
                  : 'border-l-4 border-transparent'
              }`}
            >
              {/* Golfer name and score */}
              <div className="flex items-center justify-between mb-2">
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold ${
                      !golfer.isCounting && anyScores ? 'line-through text-gray-400' : 'text-gray-900'
                    }`}
                  >
                    {golfer.golferName}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {golfer.ranking && <span>#{golfer.ranking}</span>}
                    {golfer.status !== 'active' && (
                      <span className="uppercase text-red-500 font-medium">{golfer.status}</span>
                    )}
                    {golfer.isCounting ? (
                      <span className="text-[#006747] font-medium">Counting</span>
                    ) : (
                      <span className="text-gray-400">Dropped</span>
                    )}
                    {!golfer.isCounting && idx >= 4 && (
                      <span className="text-gray-300">&mdash; worst {idx - 3}</span>
                    )}
                  </div>
                </div>
                <p
                  className={`text-lg font-bold ${
                    golfer.scoreToPar == null
                      ? 'text-gray-300'
                      : golfer.scoreToPar < 0
                      ? 'text-red-600'
                      : golfer.scoreToPar > 0
                      ? 'text-gray-600'
                      : 'text-[#006747]'
                  }`}
                >
                  {formatScore(golfer.scoreToPar)}
                </p>
              </div>

              {/* Round scores - only show when scores exist */}
              {anyScores && (
                <div className="grid grid-cols-4 gap-2">
                  {['R1', 'R2', 'R3', 'R4'].map((label, i) => {
                    const score = [golfer.r1Score, golfer.r2Score, golfer.r3Score, golfer.r4Score][i];
                    return (
                      <div key={label} className="text-center bg-gray-50 rounded py-1">
                        <p className="text-[10px] text-gray-400 uppercase">{label}</p>
                        <p className="text-sm font-medium text-gray-700">{formatRound(score)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Link to tournament leaderboard */}
      <div className="text-center pt-2">
        <Link
          href={`/tournament/${tournament.id}`}
          className="text-sm text-[#006747] font-medium hover:underline"
        >
          View Full Tournament Leaderboard &rarr;
        </Link>
      </div>
    </div>
  );
}
