import React, { useEffect, useState } from 'react';
import { X, Copy, Share2, Check, Link2, Sparkles } from 'lucide-react';
const ShareModal = ({ open, onClose, type, item, label }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!open || !item) return null;

  const shareUrl = `${window.location.origin}/?${type}=${item._id}`;
  const coverUrl = item.coverUrl || item.songs?.[0]?.coverUrl || '';
  const title = item.title || item.name || 'RTN Music';
  const subtitle = type === 'song'
    ? [item.artist?.username, ...(item.collaborators || []).map((c) => c?.userId?.username || c?.name)].filter(Boolean).join(' · ')
    : type === 'album'
      ? `${item.artist?.username || 'Artista'} · ${item.songs?.length || 0} canciones`
      : `${item.creator?.username || 'RTN Music'} · ${item.songs?.length || 0} canciones`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (_) {}
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `RTN Music — ${title}`,
          text: `Escucha ${label || title} en RTN Music`,
          url: shareUrl,
        });
        onClose();
      } else {
        await handleCopy();
      }
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6">
      <button type="button" className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} aria-label="Cerrar" />
      <div className="relative w-full max-w-md animate-in slide-in-from-bottom-8 fade-in duration-300">
        <div className="relative overflow-hidden rounded-t-[32px] md:rounded-[32px] border border-white/10 bg-gradient-to-b from-[#1a1408] via-[#0a0a0a] to-black shadow-[0_0_80px_rgba(250,204,21,0.12)]">
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-yellow-400/20 to-transparent pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-yellow-400/10 blur-3xl pointer-events-none" />

          <div className="relative p-6 pb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-yellow-400/80 flex items-center gap-2">
                  <Sparkles size={12} /> Compartir
                </p>
                <h3 className="text-xl font-black mt-1">Lleva el flow fuera de RTN</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative rounded-[28px] overflow-hidden border border-white/10 mb-6 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/30 via-transparent to-black/60 pointer-events-none z-10" />
              {coverUrl ? (
                <img src={coverUrl} alt={title} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square bg-gradient-to-br from-yellow-500/30 to-black flex items-center justify-center">
                  <Link2 size={48} className="text-yellow-400/50" />
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 p-5 z-20 bg-gradient-to-t from-black via-black/80 to-transparent">
                <p className="text-lg font-black leading-tight truncate">{title}</p>
                <p className="text-xs text-yellow-300/80 font-bold uppercase tracking-widest truncate mt-1">{subtitle}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/50 p-3 mb-5">
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Enlace</p>
              <p className="text-xs text-gray-300 break-all font-mono leading-relaxed">{shareUrl}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${copied ? 'bg-green-500 text-black' : 'bg-white/10 hover:bg-white/15 text-white'}`}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-yellow-400 text-black font-black text-sm uppercase tracking-widest hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20"
              >
                <Share2 size={18} />
                Compartir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
