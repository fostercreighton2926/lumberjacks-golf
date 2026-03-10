'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StandingsTable from '@/components/standings/StandingsTable';
import WeeklyBreakdown from '@/components/standings/WeeklyBreakdown';
import { StandingsRow } from '@/types';

interface League {
  id: string;
  name: string;
  inviteCode: string;
  members: { userId: string; username: string }[];
}

interface Tournament {
  id: string;
  name: string;
  startDate: string;
  isComplete: boolean;
}

interface BreakdownTeam {
  userId: string;
  username: string;
  totalScore: number;
  golfers: {
    golferName: string;
    scoreToPar: number | null;
    isCounting: boolean;
  }[];
}

export default function StandingsPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [standings, setStandings] = useState<StandingsRow[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Weekly breakdown state
  const [selectedTournament, setSelectedTournament] = useState<{ id: string; name: string } | null>(null);
  const [breakdownTeams, setBreakdownTeams] = useState<BreakdownTeam[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  // Fetch leagues on mount
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

  // Fetch tournaments on mount
  useEffect(() => {
    async function fetchTournaments() {
      try {
        const res = await fetch('/api/tournaments');
        if (!res.ok) throw new Error('Failed to fetch tournaments');
        const data = await res.json();
        setTournaments(data.tournaments || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tournaments');
      }
    }
    fetchTournaments();
  }, []);

  // Fetch standings when league changes
  const fetchStandings = useCallback(async () => {
    if (!selectedLeagueId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/standings/${selectedLeagueId}`);
      if (!res.ok) throw new Error('Failed to fetch standings');
      const data = await res.json();
      setStandings(data.standings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load standings');
    } finally {
      setLoading(false);
    }
  }, [selectedLeagueId]);

  useEffect(() => {
    fetchStandings();
  }, [fetchStandings]);

  // Fetch weekly breakdown
  async function handleTournamentClick(tournamentId: string, tournamentName: string) {
    if (selectedTournament?.id === tournamentId) {
      setSelectedTournament(null);
      setBreakdownTeams([]);
      return;
    }

    setSelectedTournament({ id: tournamentId, name: tournamentName });
    setBreakdownLoading(true);
    try {
      const res = await fetch(`/api/standings/${selectedLeagueId}/${tournamentId}`);
      if (!res.ok) throw new Error('Failed to fetch breakdown');
      const data = await res.json();
      const teams: BreakdownTeam[] = (data.breakdown || []).map(
        (team: {
          userId: string;
          username: string;
          totalScore: number;
          picks: {
            golferName: string;
            scoreToPar: number | null;
            isBestFour: boolean;
          }[];
        }) => ({
          userId: team.userId,
          username: team.username,
          totalScore: team.totalScore,
          golfers: team.picks.map(
            (p: { golferName: string; scoreToPar: number | null; isBestFour: boolean }) => ({
              golferName: p.golferName,
              scoreToPar: p.scoreToPar,
              isCounting: p.isBestFour,
            })
          ),
        })
      );
      setBreakdownTeams(teams);
    } catch {
      setBreakdownTeams([]);
    } finally {
      setBreakdownLoading(false);
    }
  }

  const completedTournaments = tournaments.filter((t) => t.isComplete);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 font-serif">Season Standings</h1>

        {/* League selector */}
        {leagues.length > 1 && (
          <div className="flex items-center gap-2">
            <label htmlFor="league-select" className="text-sm font-medium text-gray-600">
              League:
            </label>
            <select
              id="league-select"
              value={selectedLeagueId}
              onChange={(e) => {
                setSelectedLeagueId(e.target.value);
                setSelectedTournament(null);
                setBreakdownTeams([]);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-augusta-green focus:outline-none focus:ring-2 focus:ring-augusta-green/30"
            >
              {leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <Card className="p-4">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      {/* No leagues */}
      {!loading && leagues.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">You haven&apos;t joined any leagues yet.</p>
          <a href="/leagues">
            <Button variant="primary">Join or Create a League</Button>
          </a>
        </Card>
      )}

      {/* Loading */}
      {loading && leagues.length > 0 && (
        <Card className="p-8 text-center">
          <p className="text-gray-500 text-sm">Loading standings...</p>
        </Card>
      )}

      {/* Standings table */}
      {!loading && standings.length > 0 && (
        <div>
          <StandingsTable
            standings={standings}
            tournaments={completedTournaments.map((t) => ({ id: t.id, name: t.name }))}
          />

          {/* Clickable tournament columns hint */}
          {completedTournaments.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs text-gray-400">View breakdown:</span>
              {completedTournaments.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTournamentClick(t.id, t.name)}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${
                    selectedTournament?.id === t.id
                      ? 'bg-augusta-green text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-augusta-green/10 hover:text-augusta-green'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No standings data */}
      {!loading && standings.length === 0 && leagues.length > 0 && (
        <Card className="p-8 text-center">
          <p className="text-gray-500 text-sm">No standings data yet. Check back after the first tournament completes.</p>
        </Card>
      )}

      {/* Weekly breakdown */}
      {selectedTournament && (
        <div className="mt-6">
          {breakdownLoading ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500 text-sm">Loading breakdown...</p>
            </Card>
          ) : (
            <WeeklyBreakdown
              tournamentName={selectedTournament.name}
              teams={breakdownTeams}
            />
          )}
        </div>
      )}
    </div>
  );
}
