import Card from '../ui/Card';
import GolferRow from './GolferRow';

interface TeamGolfer {
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

interface TeamCardProps {
  username: string;
  totalScore: number;
  golfers: TeamGolfer[];
  rank: number;
}

function formatScore(score: number): string {
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : `${score}`;
}

export default function TeamCard({ username, totalScore, golfers, rank }: TeamCardProps) {
  const sorted = [...golfers].sort((a, b) => {
    // Counting golfers first, then by score
    if (a.isCounting !== b.isCounting) return a.isCounting ? -1 : 1;
    return (a.scoreToPar ?? 999) - (b.scoreToPar ?? 999);
  });

  return (
    <Card goldBorder={rank === 1} className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-augusta-green text-white text-xs font-bold flex items-center justify-center">
            {rank}
          </span>
          <span className="font-semibold text-gray-900">{username}</span>
        </div>
        <span
          className={`text-lg font-bold ${
            totalScore < 0
              ? 'text-red-600'
              : totalScore > 0
              ? 'text-gray-700'
              : 'text-augusta-green'
          }`}
        >
          {formatScore(totalScore)}
        </span>
      </div>

      {/* Round header (desktop) */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50">
        <span className="w-8 text-center">Pos</span>
        <span className="flex-1">Golfer</span>
        <div className="flex items-center gap-0">
          {['R1', 'R2', 'R3', 'R4'].map((r) => (
            <span key={r} className="w-9 text-center">{r}</span>
          ))}
        </div>
        <span className="w-12 text-right">Tot</span>
      </div>

      {/* Golfers */}
      <div className="divide-y divide-gray-50">
        {sorted.map((g, i) => (
          <GolferRow
            key={i}
            name={g.name}
            position={g.position}
            scoreToPar={g.scoreToPar}
            r1={g.r1}
            r2={g.r2}
            r3={g.r3}
            r4={g.r4}
            isDropped={!g.isCounting}
            status={g.status}
          />
        ))}
      </div>
    </Card>
  );
}
