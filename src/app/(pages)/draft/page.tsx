'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Player {
  userId: string;
  username: string;
}

interface DraftPickData {
  userId: string;
  golferId: string;
  golferName: string;
  pickNumber: number;
}

interface AvailableGolfer {
  golferId: string;
  name: string;
  ranking: number | null;
}

interface DraftState {
  id: string;
  leagueId: string;
  tournamentId: string;
  tournamentName: string;
  status: string;
  currentRound: number;
  currentPickIndex: number;
  draftOrder: string[];
  players: Player[];
  picksByRound: Record<number, DraftPickData[]>;
  availableGolfers: AvailableGolfer[];
  currentDrafter: string | null;
  totalPicks: number;
  fullSnakeOrder: { round: number; position: number; userId: string }[];
}

interface User {
  id: string;
  username: string;
  isAdmin: boolean;
}

interface League {
  id: string;
  name: string;
}

interface Tournament {
  id: string;
  name: string;
}

export default function DraftPage() {
  const [user, setUser] = useState<User | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  // Admin create draft state
  const [leagues, setLeagues] = useState<League[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [selectedTournament, setSelectedTournament] = useState('');
  const [creating, setCreating] = useState(false);
  const [noDraft, setNoDraft] = useState(false);

  const fetchDraft = useCallback(async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) return;
      const meData = await meRes.json();
      setUser(meData.user);

      // Get current tournament
      const tournamentRes = await fetch('/api/tournaments/current');
      if (!tournamentRes.ok) {
        setNoDraft(true);
        setLoading(false);
        return;
      }
      const tournamentData = await tournamentRes.json();
      const tournamentId = tournamentData.tournament?.id;
      if (!tournamentId) {
        setNoDraft(true);
        setLoading(false);
        return;
      }

      const draftRes = await fetch(`/api/draft/${tournamentId}`);
      if (draftRes.ok) {
        const draftData = await draftRes.json();
        setDraft(draftData.draft);
        setNoDraft(false);
      } else {
        setNoDraft(true);
        // Load leagues and tournaments for admin to create draft
        if (meData.user.isAdmin) {
          const [leaguesRes, tournamentsRes] = await Promise.all([
            fetch('/api/leagues'),
            fetch('/api/tournaments'),
          ]);
          if (leaguesRes.ok) {
            const ld = await leaguesRes.json();
            setLeagues(ld.leagues || []);
          }
          if (tournamentsRes.ok) {
            const td = await tournamentsRes.json();
            setTournaments(td.tournaments || []);
            // Pre-select current tournament
            setSelectedTournament(tournamentId);
          }
        }
      }
    } catch {
      setError('Failed to load draft');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDraft();
  }, [fetchDraft]);

  // Auto-refresh every 5 seconds
  const draftTournamentId = draft?.tournamentId;
  const draftLeagueId = draft?.leagueId;
  const draftStatus = draft?.status;
  useEffect(() => {
    if (!draftTournamentId || !draftLeagueId || draftStatus !== 'active') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/draft/${draftTournamentId}?leagueId=${draftLeagueId}`);
        if (res.ok) {
          const data = await res.json();
          setDraft(data.draft);
        }
      } catch {
        // Silently fail on refresh
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [draftTournamentId, draftLeagueId, draftStatus]);

  const handleCreateDraft = async () => {
    if (!selectedLeague || !selectedTournament) return;
    setCreating(true);
    try {
      const res = await fetch('/api/draft/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: selectedLeague,
          tournamentId: selectedTournament,
        }),
      });
      if (res.ok) {
        await fetchDraft();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create draft');
      }
    } catch {
      setError('Failed to create draft');
    } finally {
      setCreating(false);
    }
  };

  const handlePick = async (golferId: string) => {
    if (!draft || picking) return;
    setPicking(true);
    setPickError(null);
    try {
      const res = await fetch('/api/draft/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: draft.id, golferId }),
      });
      if (res.ok) {
        // Refresh draft state
        const draftRes = await fetch(`/api/draft/${draft.tournamentId}?leagueId=${draft.leagueId}`);
        if (draftRes.ok) {
          const data = await draftRes.json();
          setDraft(data.draft);
        }
        setSearch('');
      } else {
        const data = await res.json();
        setPickError(data.error || 'Failed to make pick');
      }
    } catch {
      setPickError('Failed to make pick');
    } finally {
      setPicking(false);
    }
  };

  const handleRandomize = async () => {
    if (!draft) return;
    try {
      const res = await fetch('/api/draft/randomize-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: draft.id }),
      });
      if (res.ok) {
        await fetchDraft();
      }
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-augusta-green" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <p className="text-red-600 font-medium">{error}</p>
        </Card>
      </div>
    );
  }

  // No draft yet - show create UI for admin or waiting message
  if (noDraft && !draft) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Snake Draft</h1>
        {user?.isAdmin ? (
          <Card goldBorder className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Create a Draft</h2>
            <p className="text-sm text-gray-500">
              Set up a snake draft for a league and tournament.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  League
                </label>
                <select
                  value={selectedLeague}
                  onChange={(e) => setSelectedLeague(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-augusta-green"
                >
                  <option value="">Select league...</option>
                  {leagues.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tournament
                </label>
                <select
                  value={selectedTournament}
                  onChange={(e) => setSelectedTournament(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-augusta-green"
                >
                  <option value="">Select tournament...</option>
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={handleCreateDraft}
              loading={creating}
              disabled={!selectedLeague || !selectedTournament}
            >
              Create Draft
            </Button>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No active draft for the current tournament.</p>
            <p className="text-sm text-gray-400 mt-1">
              Waiting for the commissioner to set up the draft.
            </p>
          </Card>
        )}
      </div>
    );
  }

  if (!draft) return null;

  const isMyTurn = draft.currentDrafter === user?.id;
  const currentDrafterName =
    draft.players.find((p) => p.userId === draft.currentDrafter)?.username || '';

  // Build the draft board grid
  // Columns = players in draft order (round 1 order)
  const columnOrder = draft.draftOrder;

  // Get golfer pick for a specific round and userId
  function getPickForCell(round: number, userId: string): DraftPickData | undefined {
    return draft!.picksByRound[round]?.find((p) => p.userId === userId);
  }

  // Check if a cell is the current pick
  function isCurrentPick(round: number, positionInRound: number): boolean {
    if (draft!.status !== 'active') return false;
    const overallIndex = (round - 1) * 4 + positionInRound;
    return overallIndex === draft!.currentPickIndex;
  }

  // Get position in round for a user
  function getPositionInRound(round: number, userId: string): number {
    const roundOrder =
      round % 2 === 0 ? [...columnOrder].reverse() : [...columnOrder];
    return roundOrder.indexOf(userId);
  }

  // Filter available golfers by search
  const filteredGolfers = draft.availableGolfers.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Snake Draft</h1>
          <p className="text-sm text-gray-500 mt-1">{draft.tournamentName}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              draft.status === 'active'
                ? 'bg-green-100 text-green-800'
                : draft.status === 'complete'
                ? 'bg-gray-100 text-gray-600'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {draft.status === 'active' && (
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            )}
            {draft.status.charAt(0).toUpperCase() + draft.status.slice(1)}
          </span>
          <span className="text-sm text-gray-500">
            Round {draft.currentRound} of 7 &middot; Pick{' '}
            {draft.totalPicks + 1 > 28 ? 28 : draft.totalPicks + 1} of 28
          </span>
        </div>
      </div>

      {/* Current turn banner */}
      {draft.status === 'active' && (
        <div
          className={`rounded-lg px-4 py-3 text-center font-medium ${
            isMyTurn
              ? 'bg-augusta-gold/20 text-augusta-green border border-augusta-gold'
              : 'bg-gray-50 text-gray-600 border border-gray-200'
          }`}
        >
          {isMyTurn ? (
            <>You are on the clock! Make your pick.</>
          ) : (
            <>Waiting for <span className="font-bold">{currentDrafterName}</span> to pick...</>
          )}
        </div>
      )}

      {draft.status === 'complete' && (
        <div className="rounded-lg px-4 py-3 text-center font-medium bg-augusta-green/10 text-augusta-green border border-augusta-green/20">
          Draft complete! All 28 picks have been made.
        </div>
      )}

      {/* Admin controls */}
      {user?.isAdmin && draft.status === 'active' && draft.totalPicks === 0 && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={handleRandomize}>
            Re-randomize Order
          </Button>
        </div>
      )}

      {/* Draft Board */}
      <Card className="overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Column headers - player names */}
          <div className="grid grid-cols-[60px_repeat(4,1fr)] border-b border-gray-200">
            <div className="p-3 text-xs font-semibold text-gray-500 bg-gray-50">Round</div>
            {columnOrder.map((userId) => {
              const player = draft.players.find((p) => p.userId === userId);
              const isCurrent = draft.currentDrafter === userId;
              return (
                <div
                  key={userId}
                  className={`p-3 text-center text-sm font-semibold border-l border-gray-200 ${
                    isCurrent && draft.status === 'active'
                      ? 'bg-augusta-gold/10 text-augusta-green'
                      : 'bg-gray-50 text-gray-700'
                  }`}
                >
                  {player?.username}
                  {userId === user?.id && (
                    <span className="text-xs text-gray-400 ml-1">(you)</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rows - rounds */}
          {[1, 2, 3, 4, 5, 6, 7].map((round) => {
            const isSnakeReverse = round % 2 === 0;
            return (
              <div
                key={round}
                className={`grid grid-cols-[60px_repeat(4,1fr)] border-b border-gray-100 ${
                  round === draft.currentRound && draft.status === 'active'
                    ? 'bg-augusta-green/[0.03]'
                    : ''
                }`}
              >
                {/* Round label */}
                <div className="p-3 flex items-center gap-1 text-sm font-medium text-gray-500 bg-gray-50/50">
                  <span>{round}</span>
                  <span className="text-xs text-gray-400">
                    {isSnakeReverse ? '←' : '→'}
                  </span>
                </div>

                {/* Player cells in column order */}
                {columnOrder.map((userId) => {
                  const pick = getPickForCell(round, userId);
                  const posInRound = getPositionInRound(round, userId);
                  const isCurrent = isCurrentPick(round, posInRound);

                  return (
                    <div
                      key={`${round}-${userId}`}
                      className={`p-2 sm:p-3 border-l border-gray-100 min-h-[52px] flex items-center justify-center transition-colors ${
                        isCurrent
                          ? 'bg-augusta-gold/15 ring-2 ring-inset ring-augusta-gold'
                          : ''
                      }`}
                    >
                      {pick ? (
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                            {pick.golferName}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            #{pick.pickNumber}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">
                          {isCurrent ? '...' : ''}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Pick UI - only show for active drafter */}
      {draft.status === 'active' && isMyTurn && (
        <Card goldBorder className="p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Your Pick &mdash; Round {draft.currentRound}
          </h2>

          {pickError && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {pickError}
            </div>
          )}

          <Input
            label="Search golfers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a golfer name..."
          />

          <div className="max-h-[400px] overflow-y-auto space-y-1">
            {filteredGolfers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No golfers found.
              </p>
            ) : (
              filteredGolfers.map((golfer) => (
                <button
                  key={golfer.golferId}
                  onClick={() => handlePick(golfer.golferId)}
                  disabled={picking}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-200 hover:border-augusta-green hover:bg-augusta-green/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <div className="flex items-center gap-3">
                    {golfer.ranking && (
                      <span className="text-xs font-mono text-gray-400 w-6 text-right">
                        #{golfer.ranking}
                      </span>
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {golfer.name}
                    </span>
                  </div>
                  <span className="text-xs text-augusta-green font-medium">
                    Draft
                  </span>
                </button>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Waiting message for non-active players */}
      {draft.status === 'active' && !isMyTurn && (
        <Card className="p-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-augusta-green border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600">
              Waiting for <span className="font-semibold">{currentDrafterName}</span> to
              pick...
            </p>
            <p className="text-xs text-gray-400">Auto-refreshes every 5 seconds</p>
          </div>
        </Card>
      )}

      {/* Draft summary / pick counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {draft.players.map((player) => {
          const playerPicks = Object.values(draft.picksByRound)
            .flat()
            .filter((p) => p.userId === player.userId);
          return (
            <Card
              key={player.userId}
              className={`p-3 text-center ${
                draft.currentDrafter === player.userId && draft.status === 'active'
                  ? 'ring-2 ring-augusta-gold'
                  : ''
              }`}
            >
              <p className="text-sm font-semibold text-gray-900 truncate">
                {player.username}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {playerPicks.length} / 7 picks
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
