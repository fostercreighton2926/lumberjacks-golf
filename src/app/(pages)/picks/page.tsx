'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import GolferSearch from '@/components/picks/GolferSearch';
import PickSlot from '@/components/picks/PickSlot';
import { isBeforeDeadline } from '@/lib/utils';

interface Tournament {
  id: string;
  name: string;
  courseName: string;
  startDate: string;
  endDate: string;
  pickDeadline: string;
  isComplete: boolean;
  field: FieldGolfer[];
  results?: TournamentResult[];
}

interface FieldGolfer {
  id: string;
  golferId: string;
  golferName: string;
  ranking: number | null;
}

interface TournamentResult {
  golferId: string;
  golferName: string;
  position: number;
  scoreToPar: number;
  status: string;
}

interface League {
  id: string;
  name: string;
  inviteCode: string;
  season: { id: string; name: string; year: number };
  members: { userId: string; username: string }[];
}

interface ExistingPick {
  id: string;
  golferId: string;
  golferName: string;
  pickOrder: number;
}

interface MemberPicks {
  userId: string;
  username: string;
  hasPicked: boolean;
  picks: ExistingPick[];
}

interface SelectedGolfer {
  golferId: string;
  golferName: string;
}

const MAX_PICKS = 7;

export default function PicksPage() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [selectedGolfers, setSelectedGolfers] = useState<SelectedGolfer[]>([]);
  const [leagueMemberPicks, setLeagueMemberPicks] = useState<MemberPicks[]>([]);
  const [userId, setUserId] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const picksOpen = tournament
    ? isBeforeDeadline(new Date(tournament.pickDeadline))
    : false;
  const tournamentLive =
    tournament &&
    !tournament.isComplete &&
    !picksOpen &&
    new Date(tournament.endDate) >= new Date();

  // Initial data fetch
  useEffect(() => {
    async function fetchInitialData() {
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

        const meData = await meRes.json();
        setUserId(meData.user.id);

        if (!tournamentRes.ok) {
          setTournament(null);
          setLoading(false);
          return;
        }

        const tournamentData = await tournamentRes.json();
        if (!tournamentData.tournament) {
          setTournament(null);
          setLoading(false);
          return;
        }

        // If tournament exists, fetch full details (for results data)
        const detailRes = await fetch(`/api/tournaments/${tournamentData.tournament.id}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          setTournament(detailData);
        } else {
          setTournament(tournamentData.tournament);
        }

        if (leaguesRes.ok) {
          const leaguesData = await leaguesRes.json();
          setLeagues(leaguesData.leagues);
          if (leaguesData.leagues.length > 0) {
            setSelectedLeagueId(leaguesData.leagues[0].id);
          }
        }
      } catch {
        setError('Failed to load picks data');
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();
  }, []);

  // Fetch existing picks when league or tournament changes
  useEffect(() => {
    if (!selectedLeagueId || !tournament) return;

    async function fetchPicks() {
      try {
        // Fetch user's own picks
        const picksRes = await fetch(
          `/api/picks/${tournament!.id}?leagueId=${selectedLeagueId}`
        );
        if (picksRes.ok) {
          const picksData = await picksRes.json();
          if (picksData.picks && picksData.picks.length > 0) {
            setSelectedGolfers(
              picksData.picks.map((p: ExistingPick) => ({
                golferId: p.golferId,
                golferName: p.golferName,
              }))
            );
          } else {
            setSelectedGolfers([]);
          }
        }

        // Fetch league members' picks (visible after deadline)
        const leaguePicksRes = await fetch(
          `/api/picks/${tournament!.id}/league/${selectedLeagueId}`
        );
        if (leaguePicksRes.ok) {
          const leaguePicksData = await leaguePicksRes.json();
          setLeagueMemberPicks(leaguePicksData.members || []);
        }
      } catch (err) {
        console.error('Failed to fetch picks:', err);
      }
    }

    fetchPicks();
  }, [selectedLeagueId, tournament]);

  const handleToggleGolfer = useCallback(
    (golferId: string) => {
      if (!picksOpen) return;

      setSelectedGolfers((prev) => {
        const exists = prev.find((g) => g.golferId === golferId);
        if (exists) {
          return prev.filter((g) => g.golferId !== golferId);
        }
        if (prev.length >= MAX_PICKS) return prev;

        const fieldGolfer = tournament?.field.find((f) => f.golferId === golferId);
        if (!fieldGolfer) return prev;

        return [...prev, { golferId, golferName: fieldGolfer.golferName }];
      });

      setSubmitMessage(null);
    },
    [picksOpen, tournament]
  );

  const handleRemoveGolfer = useCallback(
    (golferId: string) => {
      if (!picksOpen) return;
      setSelectedGolfers((prev) => prev.filter((g) => g.golferId !== golferId));
      setSubmitMessage(null);
    },
    [picksOpen]
  );

  const handleSubmit = async () => {
    if (!tournament || !selectedLeagueId) return;
    if (selectedGolfers.length !== MAX_PICKS) return;

    setSubmitting(true);
    setSubmitMessage(null);

    try {
      const res = await fetch(`/api/picks/${tournament.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: selectedLeagueId,
          picks: selectedGolfers.map((g, index) => ({
            golferId: g.golferId,
            pickOrder: index + 1,
          })),
        }),
      });

      if (res.ok) {
        setSubmitMessage({ type: 'success', text: 'Picks submitted successfully!' });
      } else {
        const data = await res.json();
        setSubmitMessage({
          type: 'error',
          text: data.error || 'Failed to submit picks',
        });
      }
    } catch {
      setSubmitMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Build results lookup for live scoring
  const resultsMap = new Map<string, TournamentResult>();
  if (tournament?.results) {
    for (const r of tournament.results) {
      resultsMap.set(r.golferId, r);
    }
  }

  // Build pick slot data with optional scores
  const pickSlots = Array.from({ length: MAX_PICKS }, (_, i) => {
    const golfer = selectedGolfers[i] || null;
    if (!golfer) return null;

    const result = resultsMap.get(golfer.golferId);
    return {
      golferId: golfer.golferId,
      golferName: golfer.golferName,
      scoreToPar: result?.scoreToPar ?? null,
      status: result?.status ?? undefined,
    };
  });

  // Determine which picks are "counting" (best 5 of 7)
  const countingIndices = new Set<number>();
  if (tournamentLive || tournament?.isComplete) {
    const scored = pickSlots
      .map((slot, i) => ({ slot, index: i }))
      .filter((s) => s.slot?.scoreToPar != null);
    scored.sort((a, b) => (a.slot!.scoreToPar as number) - (b.slot!.scoreToPar as number));
    scored.slice(0, 5).forEach((s) => countingIndices.add(s.index));
  }

  const selectedIdSet = new Set(selectedGolfers.map((g) => g.golferId));

  const golferList =
    tournament?.field.map((f) => ({
      id: f.golferId,
      name: f.golferName,
      ranking: f.ranking,
    })) ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-augusta-green" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center max-w-md">
          <p className="text-red-600 font-medium">{error}</p>
          <Link href="/login" className="text-augusta-green underline mt-2 inline-block text-sm">
            Go to Login
          </Link>
        </Card>
      </div>
    );
  }

  // No leagues
  if (leagues.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Leagues Yet</h2>
          <p className="text-gray-500 mb-6">
            You need to join or create a league before making picks.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/leagues/create">
              <Button variant="primary">Create a League</Button>
            </Link>
            <Link href="/leagues/join">
              <Button variant="secondary">Join a League</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // No tournament
  if (!tournament) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Upcoming Tournament</h2>
          <p className="text-gray-500 mb-6">
            There is no active tournament at this time. Check back later.
          </p>
          <Link href="/dashboard">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const otherMemberPicks = leagueMemberPicks.filter((m) => m.userId !== userId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Tournament Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-augusta-green">{tournament.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{tournament.courseName}</p>
          <p className="text-sm text-gray-500">
            Deadline:{' '}
            {new Date(tournament.pickDeadline).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}{' '}
            at{' '}
            {new Date(tournament.pickDeadline).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* League Selector */}
        {leagues.length > 1 && (
          <div className="flex items-center gap-2">
            <label htmlFor="league-select" className="text-sm font-medium text-gray-700">
              League:
            </label>
            <select
              id="league-select"
              value={selectedLeagueId}
              onChange={(e) => setSelectedLeagueId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-augusta-green focus:border-transparent"
            >
              {leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {!picksOpen && (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 bg-gray-100 px-4 py-2 rounded-lg self-start">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Picks Locked
          </span>
        )}
      </div>

      {/* Main Content: Search + Slots */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Golfer Search */}
        <div className="lg:col-span-3">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              {picksOpen ? 'Select Golfers' : 'Tournament Field'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {picksOpen
                ? `Choose ${MAX_PICKS} golfers for your team. ${selectedGolfers.length}/${MAX_PICKS} selected.`
                : 'Picks are locked for this tournament.'}
            </p>
            <GolferSearch
              golfers={golferList}
              selectedIds={selectedIdSet}
              onToggle={handleToggleGolfer}
            />
          </Card>
        </div>

        {/* Right: Pick Slots + Submit */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Your Picks
            </h2>
            <div className="space-y-2">
              {pickSlots.map((slot, i) => (
                <PickSlot
                  key={i}
                  slotNumber={i + 1}
                  pick={slot}
                  isCounting={countingIndices.has(i) ? true : slot ? false : undefined}
                  onRemove={picksOpen ? handleRemoveGolfer : undefined}
                  isLocked={!picksOpen}
                />
              ))}
            </div>

            {/* Submit */}
            {picksOpen && (
              <div className="mt-5 space-y-3">
                <Button
                  variant="gold"
                  size="lg"
                  className="w-full"
                  disabled={selectedGolfers.length !== MAX_PICKS}
                  loading={submitting}
                  onClick={handleSubmit}
                >
                  {selectedGolfers.length === MAX_PICKS
                    ? 'Submit Picks'
                    : `Select ${MAX_PICKS - selectedGolfers.length} more golfer${MAX_PICKS - selectedGolfers.length !== 1 ? 's' : ''}`}
                </Button>
                {submitMessage && (
                  <p
                    className={`text-sm text-center font-medium ${
                      submitMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {submitMessage.text}
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* League Members' Picks (after deadline) */}
      {!picksOpen && otherMemberPicks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            League Members&apos; Picks
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherMemberPicks.map((member) => (
              <Card key={member.userId} className="p-5">
                <h3 className="font-semibold text-gray-900 mb-3">{member.username}</h3>
                {member.hasPicked ? (
                  member.picks.length > 0 ? (
                    <div className="space-y-1.5">
                      {member.picks.map((pick, i) => {
                        const result = resultsMap.get(pick.golferId);
                        return (
                          <div
                            key={pick.golferId}
                            className="flex items-center justify-between text-sm py-1 px-2 rounded bg-gray-50"
                          >
                            <span className="text-gray-700 truncate">
                              <span className="text-xs text-gray-400 mr-1.5">{i + 1}.</span>
                              {pick.golferName}
                            </span>
                            {result && (
                              <span
                                className={`text-xs font-semibold ml-2 ${
                                  result.scoreToPar < 0
                                    ? 'text-red-600'
                                    : result.scoreToPar > 0
                                    ? 'text-gray-500'
                                    : 'text-gray-700'
                                }`}
                              >
                                {result.scoreToPar === 0
                                  ? 'E'
                                  : result.scoreToPar > 0
                                  ? `+${result.scoreToPar}`
                                  : result.scoreToPar}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Picks hidden</p>
                  )
                ) : (
                  <p className="text-sm text-gray-400 italic">No picks submitted</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
