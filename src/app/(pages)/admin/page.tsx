'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';

interface Season {
  id: string;
  name: string;
  year: number;
}

interface Tournament {
  id: string;
  name: string;
  course: string;
  location: string;
  startDate: string;
  endDate: string;
  pickDeadline: string;
  isComplete: boolean;
  seasonId: string;
}

interface Golfer {
  id: string;
  name: string;
  ranking: number | null;
}

interface FieldGolfer {
  id: string;
  golferId: string;
  golferName: string;
  ranking: number | null;
}

interface ResultRow {
  golferId: string;
  golferName: string;
  position: number | null;
  scoreToPar: number | null;
  r1Score: number | null;
  r2Score: number | null;
  r3Score: number | null;
  r4Score: number | null;
  status: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function toInputDate(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 16);
}

export default function AdminPage() {
  // Tournament list
  const [season, setSeason] = useState<Season | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  // Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create/Edit tournament form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    course: '',
    location: '',
    startDate: '',
    endDate: '',
    pickDeadline: '',
  });
  const [saving, setSaving] = useState(false);

  // Field editor modal
  const [fieldModalTournament, setFieldModalTournament] = useState<Tournament | null>(null);
  const [fieldGolfers, setFieldGolfers] = useState<FieldGolfer[]>([]);
  const [golferSearch, setGolferSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Golfer[]>([]);
  const [fieldLoading, setFieldLoading] = useState(false);

  // Results editor modal
  const [resultsModalTournament, setResultsModalTournament] = useState<Tournament | null>(null);
  const [resultRows, setResultRows] = useState<ResultRow[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [syncingResults, setSyncingResults] = useState(false);

  // Seed golfers
  const [seeding, setSeeding] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [seedText, setSeedText] = useState('');

  // Fetch tournaments
  async function fetchTournaments() {
    try {
      const res = await fetch('/api/tournaments');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSeason(data.season);
      setTournaments(data.tournaments || []);
    } catch {
      showFeedback('error', 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTournaments();
  }, []);

  function showFeedback(type: 'success' | 'error', message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  }

  // --- Tournament Create/Edit ---

  function openCreateForm() {
    setEditingId(null);
    setFormData({ name: '', course: '', location: '', startDate: '', endDate: '', pickDeadline: '' });
    setShowForm(true);
  }

  function openEditForm(t: Tournament) {
    setEditingId(t.id);
    setFormData({
      name: t.name,
      course: t.course,
      location: t.location,
      startDate: toInputDate(t.startDate),
      endDate: toInputDate(t.endDate),
      pickDeadline: toInputDate(t.pickDeadline),
    });
    setShowForm(true);
  }

  async function handleSaveTournament() {
    if (!formData.name || !formData.course || !formData.location || !formData.startDate || !formData.endDate || !formData.pickDeadline) {
      showFeedback('error', 'All fields are required');
      return;
    }
    if (!season) {
      showFeedback('error', 'No active season found');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          name: formData.name,
          course: formData.course,
          location: formData.location,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
          pickDeadline: new Date(formData.pickDeadline).toISOString(),
          seasonId: season.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.error || 'Failed to save tournament');
        return;
      }
      showFeedback('success', editingId ? 'Tournament updated' : 'Tournament created');
      setShowForm(false);
      await fetchTournaments();
    } catch {
      showFeedback('error', 'Failed to save tournament');
    } finally {
      setSaving(false);
    }
  }

  // --- Field Editor ---

  async function openFieldEditor(tournament: Tournament) {
    setFieldModalTournament(tournament);
    setFieldLoading(true);
    setGolferSearch('');
    setSearchResults([]);
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setFieldGolfers(data.field || []);
    } catch {
      setFieldGolfers([]);
      showFeedback('error', 'Failed to load field');
    } finally {
      setFieldLoading(false);
    }
  }

  async function handleGolferSearch(query: string) {
    setGolferSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/admin/seed-golfers?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.golfers || []);
      }
    } catch {
      // silently fail search
    }
  }

  async function saveField() {
    if (!fieldModalTournament || !season) return;
    setFieldLoading(true);
    try {
      const res = await fetch('/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: fieldModalTournament.id,
          name: fieldModalTournament.name,
          course: fieldModalTournament.course,
          location: fieldModalTournament.location,
          startDate: fieldModalTournament.startDate,
          endDate: fieldModalTournament.endDate,
          pickDeadline: fieldModalTournament.pickDeadline,
          seasonId: season.id,
          field: fieldGolfers.map((g) => g.golferId),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        showFeedback('error', data.error || 'Failed to save field');
        return;
      }
      showFeedback('success', `Field updated (${fieldGolfers.length} golfers)`);
      setFieldModalTournament(null);
    } catch {
      showFeedback('error', 'Failed to save field');
    } finally {
      setFieldLoading(false);
    }
  }

  function addGolferToField(golfer: Golfer) {
    if (fieldGolfers.some((g) => g.golferId === golfer.id)) return;
    setFieldGolfers((prev) => [
      ...prev,
      { id: '', golferId: golfer.id, golferName: golfer.name, ranking: golfer.ranking },
    ]);
    setGolferSearch('');
    setSearchResults([]);
  }

  function removeGolferFromField(golferId: string) {
    setFieldGolfers((prev) => prev.filter((g) => g.golferId !== golferId));
  }

  // --- Results Editor ---

  async function openResultsEditor(tournament: Tournament) {
    setResultsModalTournament(tournament);
    setResultsLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      // Build result rows from field, merging existing results
      const existingResults = new Map<string, ResultRow>(
        (data.results || []).map((r: ResultRow) => [r.golferId, r])
      );

      const rows: ResultRow[] = (data.field || []).map((f: FieldGolfer) => {
        const existing = existingResults.get(f.golferId);
        return {
          golferId: f.golferId,
          golferName: f.golferName,
          position: existing?.position ?? null,
          scoreToPar: existing?.scoreToPar ?? null,
          r1Score: existing?.r1Score ?? null,
          r2Score: existing?.r2Score ?? null,
          r3Score: existing?.r3Score ?? null,
          r4Score: existing?.r4Score ?? null,
          status: existing?.status ?? 'active',
        };
      });

      setResultRows(rows);
    } catch {
      setResultRows([]);
      showFeedback('error', 'Failed to load tournament data');
    } finally {
      setResultsLoading(false);
    }
  }

  function updateResultRow(index: number, field: keyof ResultRow, value: string) {
    setResultRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index] };

      if (field === 'status' || field === 'golferName' || field === 'golferId') {
        (row[field] as string) = value;
      } else {
        (row[field] as number | null) = value === '' ? null : parseInt(value, 10);
      }

      updated[index] = row;
      return updated;
    });
  }

  async function handleSyncResults() {
    if (!resultsModalTournament) return;
    setSyncingResults(true);
    try {
      const res = await fetch(`/api/admin/sync-results/${resultsModalTournament.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results: resultRows.map((r) => ({
            golferId: r.golferId,
            position: r.position,
            scoreToPar: r.scoreToPar,
            r1Score: r.r1Score,
            r2Score: r.r2Score,
            r3Score: r.r3Score,
            r4Score: r.r4Score,
            status: r.status,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.error || 'Failed to sync results');
        return;
      }
      showFeedback('success', `Results synced: ${data.resultsUpdated} golfers, ${data.leaguesRecalculated} leagues recalculated`);
      setResultsModalTournament(null);
    } catch {
      showFeedback('error', 'Failed to sync results');
    } finally {
      setSyncingResults(false);
    }
  }

  // --- Mark Complete ---

  async function handleMarkComplete(tournament: Tournament) {
    if (!season) return;
    try {
      const res = await fetch('/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tournament.id,
          name: tournament.name,
          course: tournament.course,
          location: tournament.location,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          pickDeadline: tournament.pickDeadline,
          seasonId: season.id,
          isComplete: true,
        }),
      });
      if (!res.ok) {
        showFeedback('error', 'Failed to mark complete');
        return;
      }
      showFeedback('success', `${tournament.name} marked as complete`);
      await fetchTournaments();
    } catch {
      showFeedback('error', 'Failed to mark complete');
    }
  }

  // --- Seed Golfers ---

  async function handleSeedGolfers() {
    if (!seedText.trim()) {
      showFeedback('error', 'Enter golfers (one per line: Name, Ranking)');
      return;
    }
    setSeeding(true);
    try {
      const lines = seedText.trim().split('\n').filter((l) => l.trim());
      const golfers = lines.map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        return {
          name: parts[0],
          ranking: parts[1] ? parseInt(parts[1], 10) : undefined,
        };
      });

      const res = await fetch('/api/admin/seed-golfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ golfers }),
      });
      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.error || 'Failed to seed golfers');
        return;
      }
      showFeedback('success', `Seeded ${data.count} golfers`);
      setShowSeedModal(false);
      setSeedText('');
    } catch {
      showFeedback('error', 'Failed to seed golfers');
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Admin Dashboard</h1>
          {season && (
            <p className="text-sm text-gray-500 mt-1">
              {season.name} {season.year}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="gold" size="sm" onClick={() => setShowSeedModal(true)}>
            Seed Golfers
          </Button>
          <Button variant="primary" size="sm" onClick={openCreateForm}>
            Create Tournament
          </Button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-augusta-green/10 text-augusta-green'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <Card className="p-8 text-center">
          <p className="text-gray-500 text-sm">Loading tournaments...</p>
        </Card>
      )}

      {/* Tournament Create/Edit Form */}
      {showForm && (
        <Card goldBorder>
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? 'Edit Tournament' : 'Create Tournament'}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Tournament Name"
                placeholder="e.g., The Masters"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                label="Course"
                placeholder="e.g., Augusta National"
                value={formData.course}
                onChange={(e) => setFormData((f) => ({ ...f, course: e.target.value }))}
              />
              <Input
                label="Location"
                placeholder="e.g., Augusta, GA"
                value={formData.location}
                onChange={(e) => setFormData((f) => ({ ...f, location: e.target.value }))}
              />
              <div /> {/* spacer */}
              <Input
                label="Start Date"
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData((f) => ({ ...f, startDate: e.target.value }))}
              />
              <Input
                label="End Date"
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData((f) => ({ ...f, endDate: e.target.value }))}
              />
              <Input
                label="Pick Deadline"
                type="datetime-local"
                value={formData.pickDeadline}
                onChange={(e) => setFormData((f) => ({ ...f, pickDeadline: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={saving} onClick={handleSaveTournament}>
                {editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tournament List */}
      {!loading && tournaments.length === 0 && !showForm && (
        <Card className="p-8 text-center">
          <p className="text-gray-500 text-sm">No tournaments yet. Create the first one.</p>
        </Card>
      )}

      {tournaments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Tournaments</h2>
          <div className="space-y-3">
            {tournaments.map((t) => (
              <Card key={t.id} className="overflow-hidden">
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {/* Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{t.name}</h3>
                        {t.isComplete ? (
                          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            Complete
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-augusta-green bg-augusta-green/10 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {t.course} &middot; {t.location}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(t.startDate)} &ndash; {formatDate(t.endDate)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEditForm(t)}>
                        Edit
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => openFieldEditor(t)}>
                        Field
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => openResultsEditor(t)}>
                        Results
                      </Button>
                      {!t.isComplete && (
                        <Button variant="gold" size="sm" onClick={() => handleMarkComplete(t)}>
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Field Editor Modal */}
      <Modal
        isOpen={!!fieldModalTournament}
        onClose={() => setFieldModalTournament(null)}
        title={`Field: ${fieldModalTournament?.name || ''}`}
      >
        <div className="space-y-4">
          {/* Search */}
          <Input
            label="Search Golfers"
            placeholder="Type golfer name..."
            value={golferSearch}
            onChange={(e) => handleGolferSearch(e.target.value)}
          />

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
              {searchResults.map((g) => (
                <button
                  key={g.id}
                  onClick={() => addGolferToField(g)}
                  disabled={fieldGolfers.some((fg) => fg.golferId === g.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>{g.name}</span>
                  {g.ranking && (
                    <span className="text-xs text-gray-400">#{g.ranking}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Current field */}
          {fieldLoading ? (
            <p className="text-sm text-gray-500 text-center py-4">Loading field...</p>
          ) : (
            <>
              <div className="text-xs text-gray-500">
                {fieldGolfers.length} golfers in field
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {fieldGolfers
                  .sort((a, b) => (a.ranking ?? 999) - (b.ranking ?? 999))
                  .map((g) => (
                    <div
                      key={g.golferId}
                      className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {g.ranking && (
                          <span className="text-xs text-gray-400 w-6">#{g.ranking}</span>
                        )}
                        <span>{g.golferName}</span>
                      </div>
                      <button
                        onClick={() => removeGolferFromField(g.golferId)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setFieldModalTournament(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={fieldLoading} onClick={saveField}>
              Save Field
            </Button>
          </div>
        </div>
      </Modal>

      {/* Results Editor Modal */}
      <Modal
        isOpen={!!resultsModalTournament}
        onClose={() => setResultsModalTournament(null)}
        title={`Results: ${resultsModalTournament?.name || ''}`}
      >
        <div className="space-y-4">
          {resultsLoading ? (
            <p className="text-sm text-gray-500 text-center py-4">Loading results...</p>
          ) : resultRows.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No golfers in field. Add golfers to the field first.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {/* Header */}
              <div className="grid grid-cols-[1fr_50px_50px_40px_40px_40px_40px_60px] gap-1 text-[10px] font-semibold text-gray-400 uppercase px-1">
                <span>Golfer</span>
                <span>Pos</span>
                <span>Tot</span>
                <span>R1</span>
                <span>R2</span>
                <span>R3</span>
                <span>R4</span>
                <span>Status</span>
              </div>

              {resultRows.map((row, index) => (
                <div
                  key={row.golferId}
                  className="grid grid-cols-[1fr_50px_50px_40px_40px_40px_40px_60px] gap-1 items-center"
                >
                  <span className="text-xs font-medium text-gray-900 truncate pr-1">
                    {row.golferName}
                  </span>
                  <input
                    type="number"
                    value={row.position ?? ''}
                    onChange={(e) => updateResultRow(index, 'position', e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded px-1 py-1 text-center"
                    placeholder="--"
                  />
                  <input
                    type="number"
                    value={row.scoreToPar ?? ''}
                    onChange={(e) => updateResultRow(index, 'scoreToPar', e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded px-1 py-1 text-center"
                    placeholder="--"
                  />
                  <input
                    type="number"
                    value={row.r1Score ?? ''}
                    onChange={(e) => updateResultRow(index, 'r1Score', e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded px-1 py-1 text-center"
                    placeholder="--"
                  />
                  <input
                    type="number"
                    value={row.r2Score ?? ''}
                    onChange={(e) => updateResultRow(index, 'r2Score', e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded px-1 py-1 text-center"
                    placeholder="--"
                  />
                  <input
                    type="number"
                    value={row.r3Score ?? ''}
                    onChange={(e) => updateResultRow(index, 'r3Score', e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded px-1 py-1 text-center"
                    placeholder="--"
                  />
                  <input
                    type="number"
                    value={row.r4Score ?? ''}
                    onChange={(e) => updateResultRow(index, 'r4Score', e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded px-1 py-1 text-center"
                    placeholder="--"
                  />
                  <select
                    value={row.status}
                    onChange={(e) => updateResultRow(index, 'status', e.target.value)}
                    className="w-full text-[10px] border border-gray-200 rounded px-0.5 py-1"
                  >
                    <option value="active">Active</option>
                    <option value="cut">CUT</option>
                    <option value="wd">WD</option>
                    <option value="dq">DQ</option>
                  </select>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setResultsModalTournament(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={syncingResults}
              onClick={handleSyncResults}
              disabled={resultRows.length === 0}
            >
              Sync Results
            </Button>
          </div>
        </div>
      </Modal>

      {/* Seed Golfers Modal */}
      <Modal
        isOpen={showSeedModal}
        onClose={() => { setShowSeedModal(false); setSeedText(''); }}
        title="Seed Golfers"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter golfers, one per line. Format: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">Name, Ranking</code>
          </p>
          <textarea
            value={seedText}
            onChange={(e) => setSeedText(e.target.value)}
            rows={10}
            placeholder={`Scottie Scheffler, 1\nRory McIlroy, 3\nJon Rahm, 5`}
            className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-augusta-green focus:outline-none focus:ring-2 focus:ring-augusta-green/30 font-mono"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => { setShowSeedModal(false); setSeedText(''); }}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={seeding} onClick={handleSeedGolfers}>
              Seed Golfers
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
