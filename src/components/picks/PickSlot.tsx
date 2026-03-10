'use client';

interface PickSlotProps {
  pick?: {
    golferId: string;
    golferName: string;
    scoreToPar?: number | null;
    status?: string;
  } | null;
  slotNumber: number;
  isCounting?: boolean;
  onRemove?: (golferId: string) => void;
  isLocked?: boolean;
}

function formatScore(score: number | null | undefined): string {
  if (score == null) return '--';
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : `${score}`;
}

export default function PickSlot({
  pick,
  slotNumber,
  isCounting,
  onRemove,
  isLocked = false,
}: PickSlotProps) {
  const hasPick = pick && pick.golferName;
  const hasScore = pick?.scoreToPar != null;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
        hasPick
          ? 'bg-white border-gray-200'
          : 'bg-gray-50 border-dashed border-gray-300'
      }`}
    >
      {/* Slot number */}
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-augusta-green/10 text-augusta-green text-xs font-bold flex items-center justify-center">
        {slotNumber}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {hasPick ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {pick.golferName}
            </span>
            {hasScore && (
              <span
                className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                  isCounting
                    ? 'bg-augusta-green/10 text-augusta-green'
                    : 'bg-gray-100 text-gray-400 line-through'
                }`}
              >
                {formatScore(pick.scoreToPar)}
              </span>
            )}
            {hasScore && isCounting !== undefined && (
              <span className={`text-[10px] font-medium ${isCounting ? 'text-augusta-green' : 'text-gray-400'}`}>
                {isCounting ? 'Counting' : 'Dropped'}
              </span>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-400 italic">Empty Slot</span>
        )}
      </div>

      {/* Remove button */}
      {hasPick && !isLocked && onRemove && (
        <button
          onClick={() => onRemove(pick.golferId)}
          className="flex-shrink-0 w-6 h-6 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
          aria-label={`Remove ${pick.golferName}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
