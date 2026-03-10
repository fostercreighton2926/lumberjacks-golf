'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LiveScoreboard from '@/components/tournament/LiveScoreboard';
import { TournamentWithDetails, GolferResult } from '@/types';

interface League {
  id: string;
  name: string;
  members: { userId: string; username: string }[];
}

interface MemberPick {
  userId: string;
  username: string;
  hasPicked: boolean;
  picks: {
    id: string;
    golferId: string;
    golferName: string;
    pickOrder: number;
  }[];
}

interface ScoreboardGolfer {
  name: string;
  position: number | null;
  scoreToPar: number | null;
  r1: number | null;
  r2: number | null;
  r3: number | null;
  r4: number | null;
  isCounting: boolean;
  status: string;
}

interface ScoreboardTeam {
  userId: string;
  username: string;
  totalScore: number;
  golfers: ScoreboardGolfer[];
}

const COUNTING_GOLFERS = 4;

function buildTeams(
  members: MemberPick[],
  results: GolferResult[]
): ScoreboardTeam[] {
  const resultMap = new Map(results.map((r) => [r.golferId, r]));

  return members
    .filter((m) => m.picks.length > 0)
    .map((member) => {
      const golferScores = member.picks.map((pick) => {
        const result = resultMap.get(pick.golferId);
        return {
          name: pick.golferName,
          position: result?.position ?? null,
          scoreToPar: result?.scoreToPar ?? null,
          r1: result?.r1Score ?? null,
          r2: result?.r2Score ?? null,
          r3: result?.r3Score ?? null,
          r4: result?.r4Score ?? null,
          status: result?.status ?? 'active',
          _sortScore: result?.scoreToPar ?? 999,
        };
      });

      // Sort by score to determine best 4
      const sorted = [...golferScores].sort((a, b) => a._sortScore - b._sortScore);

      const golfers: ScoreboardGolfer[] = golferScores.map((g) => {
        const idx = sorted.indexOf(g);
        return {
          name: g.name,
          position: g.position,
          scoreToPar: g.scoreToPar,
          r1: g.r1,
          r2: g.r2,
          r3: g.r3,
          r4: g.r4,
          isCounting: idx < COUNTING_GOLFERS,
          status: g.status,
        };
      });

      const countingScores = sorted.slice(0, COUNTING_GOLFERS);
      const totalScore = countingScores.reduce(
        (sum, g) => sum + (g.scoreToPar ?? 99),
        0
      );

      return {
        userId: member.userId,
        username: member.username,
        totalScore,
        golfers,
      };
    });
}

export default function TournamentPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<TournamentWithDetails | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [teams, setTeams] = useState<ScoreboardTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch tournament detail
  const fetchTournament = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`);
      if (!res.ok) throw new Error('Failed to fetch tournament');
      const data: TournamentWithDetails = await res.json();
      setTournament(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tournament');
      return null;
    }
  }, [tournamentId]);

  // Fetch leagues
  useEffect(() => {
    async function fetchLeagues() {
      try {
        const res = await fetch('/api/leagues');
        if (!res.ok) throw new Error('Failed to fetch leagues');
        const data = await res.json();
        setLeagues(data.leagues || []);
        if (data.leagues?.length > 0) {
          setSelectedLeagueId(data.leagues[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leagues');
      }
    }
    fetchLeagues();
  }, []);

  // Fetch picks and merge with results
  const fetchPicksAndBuild = useCallback(
    async (tournamentData?: TournamentWithDetails | null) => {
      const t = tournamentData || tournament;
      if (!t || !selectedLeagueId) return;

      try {
        const res = await fetch(`/api/picks/${tournamentId}/league/${selectedLeagueId}`);
        if (!res.ok) throw new Error('Failed to fetch picks');
        const data = await res.json();
        const builtTeams = buildTeams(data.members || [], t.results || []);
        setTeams(builtTeams);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load picks');
      }
    },
    [tournament, selectedLeagueId, tournamentId]
  );

  // Initial load
  useEffect(() => {
    async function init() {
      setLoading(true);
      const t = await fetchTournament();
      if (t && selectedLeagueId) {
        await fetchPicksAndBuild(t);
      }
      setLoading(false);
    }
    if (selectedLeagueId) {
      init();
    }
  }, [selectedLeagueId, fetchTournament, fetchPicksAndBuild]);

  // Full refresh (tournament data + picks)
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const t = await fetchTournament();
    await fetchPicksAndBuild(t);
    setRefreshing(false);
  }, [fetchTournament, fetchPicksAndBuild]);

  // Auto-poll every 60 seconds if tournament is not complete
  useEffect(() => {
    if (tournament && !tournament.isComplete) {
      intervalRef.current = setInterval(() => {
        handleRefresh();
      }, 60000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [tournament, handleRefresh]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card className="p-8 text-center">
          <p className="text-gray-500 text-sm">Loading tournament...</p>
        </Card>
      </div>
    );
  }

  if (error && !tournament) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card className="p-8 text-center">
          <p className="text-red-600 text-sm">{error}</p>
        </Card>
      </div>
    );
  }

  if (!tournament) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* League selector */}
          {leagues.length > 1 && (
            <select
              value={selectedLeagueId}
              onChange={(e) => setSelectedLeagueId(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-augusta-green focus:outline-none focus:ring-2 focus:ring-augusta-green/30"
            >
              {leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>
          )}

          {leagues.length === 1 && (
            <span className="text-sm text-gray-500">{leagues[0].name}</span>
          )}
        </div>

        <Button
          variant="secondary"
          size="sm"
          loading={refreshing}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          Refresh Scores
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <Card className="p-4">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      {/* No leagues */}
      {leagues.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">Join a league to see team scores.</p>
          <a href="/leagues">
            <Button variant="primary">Join or Create a League</Button>
          </a>
        </Card>
      )}

      {/* Scoreboard */}
      {leagues.length > 0 && (
        <LiveScoreboard
          tournament={{
            name: tournament.name,
            course: tournament.course,
            startDate: tournament.startDate,
            endDate: tournament.endDate,
            isComplete: tournament.isComplete,
          }}
          teams={teams}
        />
      )}
    </div>
  );
}
