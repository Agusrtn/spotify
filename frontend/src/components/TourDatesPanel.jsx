import React, { useState } from 'react';
import { Calendar, MapPin, Plus, Trash2, ExternalLink, Save } from 'lucide-react';

const emptyDate = () => ({
  city: '',
  venue: '',
  date: '',
  ticketUrl: '',
});

const formatTourDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (_) {
    return dateStr;
  }
};

const sortTourDates = (dates) => [...(dates || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

const TourDatesPanel = ({ tourDates = [], editable = false, onSave, saving = false, compact = false }) => {
  const [draft, setDraft] = useState([]);
  const [editing, setEditing] = useState(false);

  const upcoming = sortTourDates(tourDates).filter((item) => {
    if (!item?.date) return false;
    const d = new Date(item.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today;
  });

  const startEdit = () => {
    setDraft(tourDates.length ? tourDates.map((d) => ({ ...d, date: d.date ? new Date(d.date).toISOString().slice(0, 16) : '' })) : [emptyDate()]);
    setEditing(true);
  };

  const updateDraft = (index, field, value) => {
    setDraft((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  };

  const addRow = () => setDraft((prev) => [...prev, emptyDate()]);
  const removeRow = (index) => setDraft((prev) => prev.filter((_, idx) => idx !== index));

  const handleSave = async () => {
    const cleaned = draft
      .filter((item) => item.city.trim() && item.date)
      .map((item) => ({
        city: item.city.trim(),
        venue: String(item.venue || '').trim(),
        date: new Date(item.date).toISOString(),
        ticketUrl: String(item.ticketUrl || '').trim(),
      }));
    await onSave?.(cleaned);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className={`${compact ? '' : 'bg-white/5 border border-white/5 rounded-[32px] p-5 md:p-8'}`}>
        {!compact && (
          <p className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-5">Gestionar fechas de tour</p>
        )}
        <div className="space-y-3">
          {draft.map((item, index) => (
            <div key={`tour-edit-${index}`} className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-black/30 border border-white/10 rounded-2xl p-3">
              <input
                value={item.city}
                onChange={(e) => updateDraft(index, 'city', e.target.value)}
                placeholder="Ciudad"
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400"
              />
              <input
                value={item.venue}
                onChange={(e) => updateDraft(index, 'venue', e.target.value)}
                placeholder="Venue / sala"
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400"
              />
              <input
                type="datetime-local"
                value={item.date}
                onChange={(e) => updateDraft(index, 'date', e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400 md:col-span-2"
              />
              <input
                value={item.ticketUrl}
                onChange={(e) => updateDraft(index, 'ticketUrl', e.target.value)}
                placeholder="URL entradas (opcional)"
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400 md:col-span-2"
              />
              <button type="button" onClick={() => removeRow(index)} className="md:col-span-2 text-red-400 text-xs font-bold flex items-center gap-1 justify-end">
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button type="button" onClick={addRow} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <Plus size={14} /> Añadir fecha
          </button>
          <button type="button" disabled={saving} onClick={handleSave} className="px-4 py-2 rounded-xl bg-yellow-400 text-black text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-60">
            <Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl bg-white/5 text-xs font-bold uppercase tracking-widest">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${compact ? '' : 'bg-white/5 border border-white/5 rounded-[32px] p-5 md:p-8'}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2">
          <Calendar size={14} className="text-yellow-400" />
          {compact ? 'Próximas fechas' : 'Fechas de tour'}
        </p>
        {editable && (
          <button type="button" onClick={startEdit} className="text-yellow-400 text-xs font-black uppercase tracking-widest hover:underline">
            {tourDates.length ? 'Editar' : '+ Añadir'}
          </button>
        )}
      </div>

      {upcoming.length ? (
        <div className={`space-y-2 ${compact ? 'max-h-48 overflow-y-auto pr-1' : ''}`}>
          {upcoming.map((item, index) => (
            <div
              key={`${item.city}-${item.date}-${index}`}
              className="flex items-center gap-3 bg-black/30 border border-white/10 rounded-2xl px-4 py-3 hover:border-yellow-400/30 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-yellow-400/15 border border-yellow-400/20 flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-black text-yellow-300 uppercase">
                  {new Date(item.date).toLocaleDateString('es-ES', { month: 'short' })}
                </span>
                <span className="text-lg font-black leading-none">{new Date(item.date).getDate()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black truncate">{item.city}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                  <MapPin size={11} /> {item.venue || formatTourDate(item.date)}
                </p>
              </div>
              {item.ticketUrl ? (
                <a
                  href={item.ticketUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center text-yellow-300 hover:bg-yellow-400 hover:text-black transition-all"
                >
                  <ExternalLink size={14} />
                </a>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          {editable ? 'Aún no hay fechas publicadas. Añade la primera.' : 'Sin fechas de tour próximas.'}
        </p>
      )}
    </div>
  );
};

export default TourDatesPanel;
