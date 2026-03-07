/**
 * Onglet Documents : liste, upload, partage à tous (niveau sous-événement), contacts à compléter.
 */
import React, { useState, useEffect, useCallback } from 'react';
import type { Event, EventAttachment, Guest, SubEvent } from '@/core/types';
import { dbService } from '@/api';
import { ATTACHMENT_TYPE_LABELS } from '@/api/attachments';
import {
  getShareToAllData,
  toE164,
  type ShareChannel,
  type ShareToAllGuestEntry,
  type PendingContactUpdate
} from '@/utils/shareInvitation';
import { openExternalUrl } from '@/utils/openExternalUrl';
import { shareDocumentViaSheet } from '@/utils/shareDocument';
import { isWhatsAppApiConfigured, sendWhatsAppToMany } from '@/utils/sendWhatsAppApi';

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
  /** Pour WhatsApp : index de la prochaine conversation à ouvrir (0 = déjà ouverte la première). Permet "Ouvrir la suivante". */
  const [whatsAppNextIndex, setWhatsAppNextIndex] = useState<number | null>(null);
  const [whatsAppSending, setWhatsAppSending] = useState(false);
  const [whatsAppResult, setWhatsAppResult] = useState<{ sent: number; failed?: number; error?: string } | null>(null);

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

  useEffect(() => {
    if (!shareDoc) {
      setWhatsAppNextIndex(null);
      setWhatsAppResult(null);
    }
  }, [shareDoc]);


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
    if (url) openExternalUrl(url);
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
                  {(() => {
                    const withWhatsApp = shareData.entries.filter(e => e.canShare && e.whatsappUrl);
                    const phoneNumbers = withWhatsApp.map((e) => toE164((e.guest.phone ?? '').trim())).filter((n) => n);
                    const fullMessage = shareMessage + (shareDoc ? `\n\n${shareDoc.url}` : '');
                    const apiConfigured = isWhatsAppApiConfigured();
                    return (
                      <div className="flex flex-col gap-4">
                        {/* 1. Depuis votre numéro WhatsApp — pour tout le monde, sans config */}
                        {withWhatsApp.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <p className="text-sm font-medium text-slate-700">
                              Depuis votre numéro WhatsApp
                            </p>
                            <p className="text-xs text-slate-500">
                              Le message part de votre téléphone. Une conversation s’ouvre à la fois : envoyez, puis revenez ici pour la suivante. Aucune configuration requise.
                            </p>
                            {whatsAppNextIndex === null ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const first = withWhatsApp[0];
                                  if (first?.whatsappUrl) {
                                    openExternalUrl(first.whatsappUrl);
                                    setWhatsAppNextIndex(withWhatsApp.length > 1 ? 1 : null);
                                  }
                                }}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:opacity-90"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                Ouvrir la 1re conversation ({withWhatsApp.length} invité{withWhatsApp.length > 1 ? 's' : ''})
                              </button>
                            ) : whatsAppNextIndex < withWhatsApp.length ? (
                              <div className="rounded-xl border border-[#25D366]/30 bg-[#25D366]/5 p-4 space-y-2">
                                <p className="text-sm font-medium text-slate-700">
                                  Conversation {whatsAppNextIndex + 1} sur {withWhatsApp.length} – {withWhatsApp[whatsAppNextIndex]?.guest.firstName} {withWhatsApp[whatsAppNextIndex]?.guest.lastName}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const entry = withWhatsApp[whatsAppNextIndex];
                                    if (entry?.whatsappUrl) openExternalUrl(entry.whatsappUrl);
                                    setWhatsAppNextIndex(whatsAppNextIndex >= withWhatsApp.length - 1 ? null : whatsAppNextIndex + 1);
                                  }}
                                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:opacity-90"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                  {whatsAppNextIndex >= withWhatsApp.length - 1 ? 'Ouvrir la dernière conversation' : 'Ouvrir la conversation suivante'}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        )}

                        {/* 2. En un clic via l’API (optionnel, config Twilio) */}
                        {apiConfigured && phoneNumbers.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <p className="text-sm font-medium text-slate-700">
                              En un clic via l’API (optionnel)
                            </p>
                            <p className="text-xs text-slate-500">
                              Envoi groupé sans ouvrir chaque conversation. Nécessite une configuration Twilio par l’administrateur du déploiement. En mode sandbox, les destinataires doivent avoir rejoint le sandbox.
                            </p>
                            <button
                              type="button"
                              disabled={whatsAppSending}
                              onClick={async () => {
                                setWhatsAppResult(null);
                                setWhatsAppSending(true);
                                try {
                                  const result = await sendWhatsAppToMany(phoneNumbers, fullMessage);
                                  if (result.ok) {
                                    setWhatsAppResult({
                                      sent: result.sent ?? phoneNumbers.length,
                                      failed: result.failed,
                                      error: result.error
                                    });
                                  } else {
                                    const errMsg = result.error ?? 'Erreur d’envoi';
                                    console.error('[WhatsApp]', errMsg);
                                    alert(errMsg);
                                  }
                                } finally {
                                  setWhatsAppSending(false);
                                }
                              }}
                              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#25D366]/90 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 border border-[#25D366]"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                              {whatsAppSending ? 'Envoi en cours…' : `Envoyer à tous en un clic (${phoneNumbers.length} invité${phoneNumbers.length > 1 ? 's' : ''})`}
                            </button>
                            {whatsAppResult && (
                              <div className="flex flex-col gap-2">
                                <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                                  Envoyé à {whatsAppResult.sent} contact{whatsAppResult.sent > 1 ? 's' : ''}
                                  {whatsAppResult.failed ? `, ${whatsAppResult.failed} échec(s)` : ''}.
                                </p>
                                {whatsAppResult.failed && whatsAppResult.error && (
                                  <p className="text-xs text-amber-800 bg-amber-50 px-3 py-2 rounded-lg">
                                    Détails : {whatsAppResult.error}
                                  </p>
                                )}
                                <p className="text-xs text-slate-500">
                                  En mode test (sandbox Twilio), seuls les numéros ayant rejoint le sandbox reçoivent les messages.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 3. Partager le document (natif) */}
                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-medium text-slate-700">
                            Ou partager via l’appareil
                          </p>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await shareDocumentViaSheet({
                                  title: `${event.title} – ${shareDoc?.name ?? 'Document'}`,
                                  text: shareMessage,
                                  url: shareDoc?.url,
                                  dialogTitle: 'Partager le document'
                                });
                              } catch (e) {
                                if ((e as Error)?.name !== 'AbortError') console.error(e);
                              }
                            }}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                            Partager le document (choisir les conversations)
                          </button>
                        </div>
                      </div>
                    );
                  })()}
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
                          onClick={() => openExternalUrl(mailtoUrl)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          Envoyer par email à tous ({withEmail.length} invité{withEmail.length > 1 ? 's' : ''})
                        </button>
                      );
                    })()}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Ou ouvrir une conversation à la fois</p>
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
