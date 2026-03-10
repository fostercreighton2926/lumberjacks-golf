'use client';

import { useState, useMemo } from 'react';
import Input from '../ui/Input';
import GolferCard from './GolferCard';

interface Golfer {
  id: string;
  name: string;
  ranking: number | null;
}

interface GolferSearchProps {
  golfers: Golfer[];
  selectedIds: Set<string>;
  onToggle: (golferId: string) => void;
}

export default function GolferSearch({ golfers, selectedIds, onToggle }: GolferSearchProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return golfers;
    const lower = query.toLowerCase();
    return golfers.filter((g) => g.name.toLowerCase().includes(lower));
  }, [golfers, query]);

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search golfers..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="sticky top-0"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No golfers found.</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {filtered.map((golfer) => (
            <GolferCard
              key={golfer.id}
              golfer={golfer}
              isSelected={selectedIds.has(golfer.id)}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
