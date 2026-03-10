'use client';

import Card from '../ui/Card';

interface WeeklyGolfer {
  golferName: string;
  scoreToPar: number | null;
  isCounting: boolean;
}

interface WeeklyTeam {
  userId: string;
  username: string;
  totalScore: number;
  golfers: WeeklyGolfer[];
}

interface WeeklyBreakdownProps {
  tournamentName: string;
  teams: WeeklyTeam[];
}

function formatScore(score: number | null): string {
  if (score == null) return '--';
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : `${score}`;
}

export default function WeeklyBreakdown({ tournamentName, teams }: WeeklyBreakdownProps) {
  const sorted = [...teams].sort((a, b) => a.totalScore - b.totalScore);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">{tournamentName}</h3>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500">No results available.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((team, index) => (
            <Card key={team.userId} goldBorder={index === 0}>
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                    <span className="font-semibold text-gray-900">{team.username}</span>
                  </div>
                  <span className="text-sm font-bold text-augusta-green">
                    {formatScore(team.totalScore)}
                  </span>
                </div>

                {/* Golfers */}
                <div className="space-y-1.5">
                  {team.golfers
                    .sort((a, b) => (a.scoreToPar ?? 999) - (b.scoreToPar ?? 999))
                    .map((golfer, gi) => (
                      <div
                        key={gi}
                        className={`flex items-center justify-between text-sm py-1 px-2 rounded ${
                          golfer.isCounting
                            ? 'text-gray-900'
                            : 'text-gray-400 line-through'
                        }`}
                      >
                        <span className="truncate">{golfer.golferName}</span>
                        <span className={`font-medium ml-2 ${golfer.isCounting ? 'text-augusta-green' : ''}`}>
                          {formatScore(golfer.scoreToPar)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
