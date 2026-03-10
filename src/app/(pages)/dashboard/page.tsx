'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { isBeforeDeadline } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
}

interface Tournament {
  id: string;
  name: string;
  courseName: string;
  startDate: string;
  endDate: string;
  pickDeadline: string;
  isComplete: boolean;
}

interface League {
  id: string;
  name: string;
  inviteCode: string;
  season: { id: string; name: string; year: number };
  members: { userId: string; username: string }[];
}

interface Standing {
  userId: string;
  username: string;
  totalPoints: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
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

        const meData = await meRes.json();
        setUser(meData.user);

        if (tournamentRes.ok) {
          const tournamentData = await tournamentRes.json();
          setTournament(tournamentData.tournament);
        }

        if (leaguesRes.ok) {
          const leaguesData = await leaguesRes.json();
          setLeagues(leaguesData.leagues);

          // Fetch standings for the first league
          if (leaguesData.leagues.length > 0) {
            const standingsRes = await fetch(
              `/api/standings/${leaguesData.leagues[0].id}`
            );
            if (standingsRes.ok) {
              const standingsData = await standingsRes.json();
              setStandings(standingsData.standings);
            }
          }
        }
      } catch {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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

  const picksOpen = tournament && isBeforeDeadline(new Date(tournament.pickDeadline));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, <span className="text-augusta-green">{user?.username}</span>
        </h1>
        <p className="text-gray-500 mt-1">
          Here is your fantasy golf overview.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Tournament */}
        <div className="lg:col-span-2">
          <Card goldBorder className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Current Tournament
            </h2>
            {tournament ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xl font-bold text-augusta-green">
                    {tournament.name}
                  </p>
                  <p className="text-sm text-gray-500">{tournament.courseName}</p>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                  <div>
                    <span className="font-medium text-gray-900">Dates: </span>
                    {new Date(tournament.startDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    &ndash;{' '}
                    {new Date(tournament.endDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Pick Deadline: </span>
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
                  </div>
                </div>

                <div className="pt-2">
                  {picksOpen ? (
                    <Link href="/picks">
                      <Button variant="primary" size="lg">
                        Make Your Picks
                      </Button>
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 bg-gray-100 px-4 py-2 rounded-lg">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Picks are locked
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No upcoming tournament scheduled.</p>
            )}
          </Card>
        </div>

        {/* Quick Standings */}
        <div className="lg:col-span-1">
          <Card className="p-6 h-full">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Standings
            </h2>
            {standings.length > 0 ? (
              <div className="space-y-2">
                {standings.slice(0, 5).map((entry, index) => (
                  <div
                    key={entry.userId}
                    className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                      entry.userId === user?.id
                        ? 'bg-augusta-green/5 border border-augusta-green/20'
                        : index % 2 === 0
                        ? 'bg-gray-50'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                          index === 0
                            ? 'bg-augusta-gold text-gray-900'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                        {entry.username}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-augusta-green">
                      {entry.totalPoints} pts
                    </span>
                  </div>
                ))}
                {leagues.length > 0 && (
                  <Link
                    href={`/standings/${leagues[0].id}`}
                    className="block text-center text-sm text-augusta-green hover:underline mt-3"
                  >
                    View Full Standings
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                {leagues.length === 0
                  ? 'Join a league to see standings.'
                  : 'No standings data yet.'}
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* Draft Link */}
      <Card className="p-5 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐍</span>
            <div>
              <h3 className="font-semibold text-gray-900">Snake Draft</h3>
              <p className="text-xs text-gray-500">Draft your golfers in snake order</p>
            </div>
          </div>
          <Link href="/draft">
            <Button variant="primary" size="sm">
              Go to Draft
            </Button>
          </Link>
        </div>
      </Card>

      {/* Your Leagues */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Leagues</h2>
        {leagues.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {leagues.map((league) => (
              <Card key={league.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{league.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {league.season.name} {league.season.year}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {league.members.length} member{league.members.length !== 1 ? 's' : ''}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">
                      {league.inviteCode}
                    </span>
                    <Link href={`/standings/${league.id}`}>
                      <Button variant="secondary" size="sm">
                        Standings
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-gray-500 mb-4">
              You are not in any leagues yet.
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
        )}
      </div>
    </div>
  );
}
