interface GolferRowProps {
  name: string;
  position: number | null;
  scoreToPar: number | null;
  r1: number | null;
  r2: number | null;
  r3: number | null;
  r4: number | null;
  isDropped: boolean;
  status: string;
}

function formatScore(score: number | null): string {
  if (score == null) return '--';
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : `${score}`;
}

function formatRound(score: number | null): string {
  return score != null ? String(score) : '--';
}

export default function GolferRow({
  name,
  position,
  scoreToPar,
  r1,
  r2,
  r3,
  r4,
  isDropped,
  status,
}: GolferRowProps) {
  const isCut = status === 'CUT' || status === 'WD' || status === 'DQ';

  return (
    <div
      className={`flex items-center gap-2 py-2 px-3 rounded-md text-sm ${
        isDropped ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-900'
      }`}
    >
      {/* Position */}
      <span className={`w-8 text-center font-medium text-xs ${isDropped ? 'text-gray-400' : 'text-gray-500'}`}>
        {isCut ? status : position != null ? `T${position}` : '--'}
      </span>

      {/* Name */}
      <span className="flex-1 font-medium truncate">{name}</span>

      {/* Round scores */}
      <div className="hidden sm:flex items-center gap-0">
        {[r1, r2, r3, r4].map((r, i) => (
          <span
            key={i}
            className={`w-9 text-center text-xs ${isDropped ? 'text-gray-300' : 'text-gray-500'}`}
          >
            {formatRound(r)}
          </span>
        ))}
      </div>

      {/* Total score */}
      <span
        className={`w-12 text-right font-bold ${
          isDropped
            ? 'text-gray-400'
            : scoreToPar != null && scoreToPar < 0
            ? 'text-red-600'
            : scoreToPar != null && scoreToPar > 0
            ? 'text-gray-700'
            : 'text-augusta-green'
        }`}
      >
        {formatScore(scoreToPar)}
      </span>
    </div>
  );
}
