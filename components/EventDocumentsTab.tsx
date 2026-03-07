/**
 * Onglet Documents : liste, upload, partage à tous (niveau sous-événement), contacts à compléter.
 */
import React, { useState, useEffect, useCallback } from 'react';
import type { Event, EventAttachment, Guest, SubEvent } from '@/core/types';
import { dbService } from '@/api';
import { ATTACHMENT_TYPE_LABELS } from '@/api/attachments';
import {
  getShareToAllData,
  type ShareChannel,
  type ShareToAllGuestEntry,
  type PendingContactUpdate
} from '@/utils/shareInvitation';

const CHANNEL_LABELS: Record<ShareChannel, string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'Email'
};

interface EventDocumentsTabProps {
  event: Event;
  currentUserId: string;
  subEventId: string | null;
  subEvent?: SubEvent | null;
  canManage: boolean;
  /** Invités du sous-événement (si subEventId) pour "Partager à tous". */
  guestsForSub?: Guest[];
  onGuestClick?: (guest: Guest) => void;
}

export const EventDocumentsTab: React.FC<EventDocumentsTabProps> = ({
  event,
  currentUserId,
  subEventId,
  subEvent,
  canManage,
  guestsForSub = [],
  onGuestClick
}) => {
  const [attachments, setAttachments] = useState<EventAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState<string>('other');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [shareDoc, setShareDoc] = useState<EventAttachment | null>(null);
  const [shareMessage, setShareMessage] = useState(`Bonjour,\n\nVoici un document pour ${subEvent?.title ?? event.title}.\n`);

  const loadAttachments = useCallback(async () => {
    setLoading(true);
    try {
      const list = subEventId
        ? await dbService.listAttachments(event.id, subEventId)
        : await dbService.listAllAttachments(event.id).then((all) => all.filter((a) => !a.subEventId));
      setAttachments(list);
    } catch (e) {
      console.error(e);
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  }, [event.id, subEventId]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !canManage) return;
    setUploading(true);
    try {
      await dbService.uploadAttachment(event.id, uploadFile, {
        name: uploadName || uploadFile.name,
        type: uploadType,
        subEventId: subEventId ?? undefined,
        userId: currentUserId
      });
      setUploadName('');
      setUploadType('other');
      setUploadFile(null);
      setShowUpload(false);
      loadAttachments();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Erreur lors de l’upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (att: EventAttachment) => {
    if (!canManage || !confirm('Supprimer ce document ?')) return;
    try {
      await dbService.deleteAttachment(att.id);
      loadAttachments();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
    }
  };

  const isGlobal = !subEventId;
  const onlyChannel = event.shareChannelPreference && event.shareChannelPreference !== 'all' ? event.shareChannelPreference : undefined;
  const shareData = shareDoc
    ? getShareToAllData(guestsForSub, shareMessage, {
        subject: `${event.title} – Document`,
        documentUrl: shareDoc.url,
        onlyChannel
      })
    : { entries: [] as ShareToAllGuestEntry[], pending: [] as PendingContactUpdate[] };

  const openShare = (entry: ShareToAllGuestEntry) => {
    const url = entry.whatsappUrl ?? entry.smsUrl ?? entry.emailUrl;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          {isGlobal ? 'Documents du projet' : `Documents – ${subEvent?.title ?? 'Séquence'}`}
        </h3>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Ajouter un document
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Chargement…</p>
      ) : attachments.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-center text-slate-500 text-sm">
          Aucun document. {canManage && 'Cliquez sur « Ajouter un document » pour en déposer.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {attachments.map((att) => (
            <li key={att.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900 truncate">{att.name}</p>
                <p className="text-xs text-slate-500">{ATTACHMENT_TYPE_LABELS[att.type] ?? att.type}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={att.url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">
                  Télécharger
                </a>
                {canManage && guestsForSub.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setShareDoc(att); setShareMessage(`Bonjour,\n\nVoici un document pour ${subEvent?.title ?? event.title}.\n`); }}
                    className="px-3 py-2 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 text-sm font-medium hover:bg-teal-100"
                  >
                    Partager aux invités
                  </button>
                )}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleDelete(att)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Supprimer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal Partager aux invités */}
      {shareDoc && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShareDoc(null)}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h4 className="font-semibold text-slate-900">Envoyer « {shareDoc.name} » aux invités</h4>
              <button type="button" onClick={() => setShareDoc(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">×</button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <textarea
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                rows={3}
                placeholder="Message accompagnant le lien du document…"
                value={shareMessage}
                onChange={e => setShareMessage(e.target.value)}
              />
              {shareData.entries.filter(e => e.canShare).length > 0 && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const withEmail = shareData.entries.filter(e => e.canShare && e.emailUrl);
                      if (withEmail.length === 0) return null;
                      const subject = `${event.title} – Document`;
                      const body = shareMessage + (shareDoc ? `\n\n${shareDoc.url}` : '');
                      const mailtoUrl = `mailto:${withEmail.map(e => encodeURIComponent((e.guest.email ?? '').trim())).filter(Boolean).join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                      return (
                        <button
                          type="button"
                          onClick={() => window.open(mailtoUrl, '_blank', 'noopener,noreferrer')}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          Envoyer par email à tous ({withEmail.length} invité{withEmail.length > 1 ? 's' : ''})
                        </button>
                      );
                    })()}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Ou envoyer individuellement (WhatsApp, SMS, email)</p>
                    <ul className="space-y-2">
                      {shareData.entries.filter(e => e.canShare).map((entry) => (
                        <li key={entry.guest.id} className="flex items-center justify-between gap-2 py-2 border-b border-slate-100 last:border-0">
                          <span className="text-sm text-slate-800 truncate">
                            {entry.guest.firstName} {entry.guest.lastName}
                          </span>
                          <button
                            type="button"
                            onClick={() => openShare(entry)}
                            className="shrink-0 px-3 py-1.5 rounded-lg bg-teal-100 text-teal-700 text-xs font-medium hover:bg-teal-200"
                          >
                            {CHANNEL_LABELS[entry.preferred]}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
              {shareData.entries.filter(e => e.canShare).length === 0 && (
                <p className="text-sm text-slate-500">Aucun invité avec email ou téléphone renseigné. Complétez les contacts dans l’onglet Invités.</p>
              )}
              {shareData.pending.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h5 className="text-sm font-semibold text-amber-800 mb-2">Contacts à compléter</h5>
                  <p className="text-xs text-amber-700 mb-2">Ces invités n’ont ni téléphone ni email. Complétez leurs infos dans l’onglet Invités pour pouvoir leur envoyer le document.</p>
                  <ul className="space-y-1">
                    {shareData.pending.map(({ guest, missing }) => (
                      <li key={guest.id} className="flex items-center justify-between gap-2">
                        <span className="text-sm text-amber-900">
                          {guest.firstName} {guest.lastName}
                          {missing.length > 0 && <span className="text-amber-600 ml-1">(manque : {missing.join(', ')})</span>}
                        </span>
                        {onGuestClick && (
                          <button type="button" onClick={() => { onGuestClick(guest); setShareDoc(null); }} className="text-xs font-medium text-amber-700 hover:underline">
                            Modifier
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload */}
      {showUpload && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => !uploading && setShowUpload(false)}>
          <form
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
            onSubmit={handleUpload}
          >
            <h4 className="font-semibold text-slate-900">Ajouter un document</h4>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
              className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-50 file:text-teal-700"
              onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
            />
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
              placeholder="Nom du document"
              value={uploadName}
              onChange={e => setUploadName(e.target.value)}
            />
            <select
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
              value={uploadType}
              onChange={e => setUploadType(e.target.value)}
            >
              {Object.entries(ATTACHMENT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => !uploading && setShowUpload(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium">
                Annuler
              </button>
              <button type="submit" disabled={!uploadFile || uploading} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-medium disabled:opacity-50">
                {uploading ? 'Envoi…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
