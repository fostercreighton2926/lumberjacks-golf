'use client';

import { StandingsRow } from '@/types';

interface StandingsTableProps {
  standings: StandingsRow[];
  tournaments: { id: string; name: string }[];
}

export default function StandingsTable({ standings, tournaments }: StandingsTableProps) {
  const sorted = [...standings].sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-augusta-green text-white">
            <th className="sticky left-0 z-10 bg-augusta-green px-4 py-3 text-left font-semibold w-12">
              #
            </th>
            <th className="sticky left-12 z-10 bg-augusta-green px-4 py-3 text-left font-semibold min-w-[140px]">
              Player
            </th>
            <th className="px-4 py-3 text-center font-semibold min-w-[80px]">
              Total
            </th>
            {tournaments.map((t) => (
              <th
                key={t.id}
                className="px-3 py-3 text-center font-medium min-w-[80px] text-white/80 text-xs"
              >
                {t.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((row, index) => {
            const rank = index + 1;
            const isLeader = rank === 1;

            return (
              <tr
                key={row.userId}
                className={`transition-colors hover:bg-gray-50 ${
                  isLeader ? 'bg-augusta-gold/10' : ''
                }`}
              >
                <td className={`sticky left-0 z-10 px-4 py-3 font-bold text-gray-500 ${isLeader ? 'bg-augusta-gold/10' : 'bg-white'}`}>
                  {rank}
                </td>
                <td className={`sticky left-12 z-10 px-4 py-3 font-semibold text-gray-900 ${isLeader ? 'bg-augusta-gold/10' : 'bg-white'}`}>
                  <div className="flex items-center gap-2">
                    {isLeader && <span className="text-augusta-gold text-base">&#9679;</span>}
                    {row.username}
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-bold text-augusta-green">
                  {row.totalPoints}
                </td>
                {tournaments.map((t) => {
                  const result = row.weeklyResults.find((r) => r.tournamentId === t.id);
                  return (
                    <td key={t.id} className="px-3 py-3 text-center text-gray-600">
                      {result ? result.points : '--'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {sorted.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-sm">
          No standings data yet.
        </div>
      )}
    </div>
  );
}
