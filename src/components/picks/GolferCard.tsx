'use client';

interface GolferCardProps {
  golfer: {
    id: string;
    name: string;
    ranking: number | null;
  };
  isSelected: boolean;
  onToggle: (golferId: string) => void;
}

export default function GolferCard({ golfer, isSelected, onToggle }: GolferCardProps) {
  return (
    <button
      onClick={() => onToggle(golfer.id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all duration-150 ${
        isSelected
          ? 'border-augusta-green bg-augusta-green/5 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {/* Checkbox area */}
      <div
        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
          isSelected
            ? 'bg-augusta-green border-augusta-green text-white'
            : 'border-gray-300 bg-white'
        }`}
      >
        {isSelected && (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Golfer info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-augusta-green' : 'text-gray-900'}`}>
          {golfer.name}
        </p>
      </div>

      {/* Ranking */}
      {golfer.ranking && (
        <span className="flex-shrink-0 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          #{golfer.ranking}
        </span>
      )}
    </button>
  );
}
