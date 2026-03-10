'use client';

import TeamCard from './TeamCard';

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

interface LiveScoreboardProps {
  tournament: {
    name: string;
    course: string;
    startDate: string;
    endDate: string;
    isComplete: boolean;
  };
  teams: ScoreboardTeam[];
}

export default function LiveScoreboard({ tournament, teams }: LiveScoreboardProps) {
  const sorted = [...teams].sort((a, b) => a.totalScore - b.totalScore);

  return (
    <div className="space-y-6">
      {/* Tournament header */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-gray-900 font-serif">
          {tournament.name}
        </h2>
        <p className="text-sm text-gray-500">{tournament.course}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          {tournament.isComplete ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              Final
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-augusta-green bg-augusta-green/10 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-augusta-green animate-pulse" />
              Live
            </span>
          )}
        </div>
        {!tournament.isComplete && (
          <p className="text-[11px] text-gray-400 mt-1">
            Scores refresh automatically
          </p>
        )}
      </div>

      {/* Teams */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          No teams to display.
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((team, index) => (
            <TeamCard
              key={team.userId}
              username={team.username}
              totalScore={team.totalScore}
              golfers={team.golfers}
              rank={index + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
