import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Event, User, ChatMessage, SubEvent, Guest, Organizer, Permission, KeyMoment } from '@/core/types';
import { dbService, supabase } from '@/api';
import { generateSharePassword } from '@/utils/sharePassword';
import { isContactComplete, deduplicateContacts, type ImportedContact } from '@/utils/contactImport';
import {
  getAvailableSources,
  importFromDevice,
  importFromFile,
  importFromGoogle
} from '@/utils/contactImportService';
import { Input } from './Input';

interface EventDetailProps {
  event: Event;
  user: User;
  onBack: () => void;
  onUpdate: (updated: Event | null) => void;
}

export const EventDetail: React.FC<EventDetailProps> = ({ event, user, onBack, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'program' | 'chat' | 'settings' | 'budget'>('overview');
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'sequence' | 'chat'>('sequence');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingNames, setTypingNames] = useState<string[]>([]);

  const chatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modals
  const [showMomentModal, setShowMomentModal] = useState(false);
  const [momentForm, setMomentForm] = useState({ time: '', label: '' });
  const [showSequenceModal, setShowSequenceModal] = useState(false);
  const [seqForm, setSeqForm] = useState({ title: '', date: '', location: '' });
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestForm, setGuestForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [showSubEventSettingsModal, setShowSubEventSettingsModal] = useState(false);
  const [subEventEditForm, setSubEventEditForm] = useState({ title: '', date: '', location: '' });
  const [showImportGuestsModal, setShowImportGuestsModal] = useState(false);
  const [importedContacts, setImportedContacts] = useState<ImportedContact[]>([]);
  const [showExportHelp, setShowExportHelp] = useState(false);
  const [deviceContactList, setDeviceContactList] = useState<ImportedContact[] | null>(null);
  const [deviceContactSelected, setDeviceContactSelected] = useState<Set<number>>(new Set());
  const [deviceContactSearch, setDeviceContactSearch] = useState('');
  const [loadingNativeContacts, setLoadingNativeContacts] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [showEventSettingsModal, setShowEventSettingsModal] = useState(false);
  const [eventSettingsTab, setEventSettingsTab] = useState<'general' | 'appearance'>('general');
  const [imageUploading, setImageUploading] = useState(false);
  const eventImageInputRef = useRef<HTMLInputElement>(null);
  const [eventEditForm, setEventEditForm] = useState({
    title: '',
    isDateTBD: false,
    startDate: '',
    location: '',
    budget: '',
    image: ''
  });
  const [approveModalOrganizer, setApproveModalOrganizer] = useState<Organizer | null>(null);
  const [approvePermissions, setApprovePermissions] = useState<Permission[]>(['access_organizer_chat']);
  const [approveSubEventIds, setApproveSubEventIds] = useState<string[]>([]);
  const [editRightsOrganizer, setEditRightsOrganizer] = useState<Organizer | null>(null);
  const [editRightsPermissions, setEditRightsPermissions] = useState<Permission[]>([]);
  const [editRightsSubEventIds, setEditRightsSubEventIds] = useState<string[]>([]);
  const [copiedField, setCopiedField] = useState<'code' | 'password' | null>(null);
  const [editingPassword, setEditingPassword] = useState(false);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback((value: string, field: 'code' | 'password') => {
    navigator.clipboard.writeText(String(value).trim()).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }, []);

  const startEditPassword = () => {
    setNewPasswordValue(generateSharePassword());
    setEditingPassword(true);
  };
  const cancelEditPassword = () => {
    setEditingPassword(false);
    setNewPasswordValue('');
  };
  const saveNewPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = newPasswordValue.trim();
    if (!trimmed) return;
    if (savingPassword) return;
    setSavingPassword(true);
    try {
      const updated = await dbService.updateEventAtomic(event.id, (evt) => ({ ...evt, sharePassword: trimmed }));
      onUpdate(updated);
    } catch (err) {
      console.error(err);
      alert('Impossible de modifier le mot de passe. Vérifie que la base contient la colonne share_password (migration).');
    } finally {
      setSavingPassword(false);
      setEditingPassword(false);
      setNewPasswordValue('');
    }
  };

  const PERMISSION_LABELS: Record<Permission, string> = {
    edit_details: 'Modifier le projet (nom, date, lieu, budget, photo)',
    manage_subevents: 'Gérer le programme (séquences, jalons)',
    manage_guests: 'Gérer les invités',
    access_organizer_chat: 'Accès à la messagerie équipe',
    view_budget: 'Voir le budget',
    all: 'Tout autoriser'
  };

  const isOwner = event.creatorId === user.id;
  const currentSub = event.subEvents.find(s => s.id === selectedSubId);
  const pendingOrganizers = event.organizers?.filter(o => o.status === 'pending') || [];
  const activeOrganizers = event.organizers?.filter(o => o.status === 'confirmed') || [];
  const currentOrganizer = activeOrganizers.find(o => o.userId === user.id);
  const permissions = currentOrganizer?.permissions || [];
  const hasPermission = (perm: Permission) => isOwner || permissions.includes(perm) || permissions.includes('all');
  const canManageProgram = hasPermission('manage_subevents');
  const canManageGuests = hasPermission('manage_guests');
  const canChat = hasPermission('access_organizer_chat');
  const canEditEvent = hasPermission('edit_details');
  const canViewBudget = hasPermission('view_budget');
  const allowedSubIds = currentOrganizer?.allowedSubEventIds;
  const canManageSubEvent = (subId: string) =>
    !allowedSubIds?.length || allowedSubIds.includes(subId);
  const canManageProgramHere = canManageProgram && (!selectedSubId || canManageSubEvent(selectedSubId));
  const canManageGuestsHere = canManageGuests && (!selectedSubId || canManageSubEvent(selectedSubId));
  const canChatForCurrentSubEvent = !!selectedSubId && (isOwner || (canChat && canManageSubEvent(selectedSubId)));
  const canSendChat = selectedSubId ? canChatForCurrentSubEvent : canChat;

  // Chargement + abonnement Realtime pour la messagerie (mise à jour en direct sans recharger)
  useEffect(() => {
    let isMounted = true;
    const channelId = selectedSubId || 'global';

    const loadMessages = async () => {
      const msgs = await dbService.getMessages(event.id, channelId);
      if (isMounted) setMessages(msgs);
    };

    const mergeMessagesFromServer = async () => {
      const msgs = await dbService.getMessages(event.id, channelId);
      if (!isMounted) return;
      setMessages((prev) => {
        const byId = new Map(prev.map((m) => [m.id, m]));
        msgs.forEach((m) => byId.set(m.id, m));
        return Array.from(byId.values()).sort(
          (a: ChatMessage, b: ChatMessage) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
    };

    const mapRealtimeMessage = (row: any): ChatMessage => ({
      id: row.id,
      eventId: row.event_id,
      channelId: row.channel_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      text: row.text,
      timestamp: row.created_at,
      role: row.role
    });

    loadMessages();

    const channelName = `chat:${event.id}:${channelId}`;
    const realtime = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `event_id=eq.${event.id}` },
        (payload) => {
          const row = payload.new as any;
          if (!row || row.channel_id !== channelId) return;
          const incoming = mapRealtimeMessage(row);
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
        }
      )
      .on('presence', { event: 'sync' }, () => {
        if (!isMounted) return;
        const state = realtime.presenceState();
        const presences = (Object.values(state) as Array<Array<{ userId?: string; userName?: string; typing?: boolean }>>).flat();
        const names = [...new Set(
          presences
            .filter((p) => p.typing === true && p.userId !== user.id && p.userName)
            .map((p) => p.userName as string)
        )];
        setTypingNames(names);
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          mergeMessagesFromServer();
        }
        if (status === 'SUBSCRIBED') {
          chatChannelRef.current = realtime;
          realtime.track({ userId: user.id, userName: `${user.firstName} ${user.lastName}`, typing: false });
        }
      });

    return () => {
      isMounted = false;
      chatChannelRef.current = null;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      setTypingNames([]);
      supabase.removeChannel(realtime);
    };
  }, [event.id, selectedSubId, user.id, user.firstName, user.lastName]);

  // Polling de secours : quand l’onglet Chat est actif, rafraîchir les messages toutes les 3s
  // pour que le destinataire voie les nouveaux messages même si Realtime ne se déclenche pas
  useEffect(() => {
    if (activeTab !== 'chat') return;
    const channelId = selectedSubId || 'global';
    const poll = async () => {
      const msgs = await dbService.getMessages(event.id, channelId);
      setMessages((prev) => {
        const byId = new Map(prev.map((m) => [m.id, m]));
        msgs.forEach((m) => byId.set(m.id, m));
        return Array.from(byId.values()).sort(
          (a: ChatMessage, b: ChatMessage) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
    };
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [activeTab, event.id, selectedSubId]);

  useEffect(() => {
    const el = chatScrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleShare = async () => {
    const text = [
      `Invitation co-organisateur – ${event.title}`,
      '',
      'Pour rejoindre ce projet sur myEvent :',
      '1. Ouvre l’app et clique sur « Rejoindre »',
      "2. Saisis la clé et le mot de passe ci-dessous (ou « Coller l'invitation ») :",
      '',
      `Clé de partage : ${event.shareCode.trim()}`,
      `Mot de passe : ${(event.sharePassword ?? '').trim()}`,
      '',
      '— myEvent'
    ].join('\n');
    if (navigator.share) {
      try { await navigator.share({ title: `Invitation – ${event.title}`, text }); } catch (e) {}
    } else {
      await navigator.clipboard.writeText(text);
      alert('Invitation copiée dans le presse-papier.');
    }
  };

  const handleAddSequence = async () => {
    if (!canManageProgram) return;
    if (!seqForm.title) return;
    const newSeq: SubEvent = { 
      id: crypto.randomUUID(), 
      ...seqForm, 
      estimatedGuests: 0, 
      keyMoments: [] 
    };
    const updated = await dbService.updateEventAtomic(event.id, (evt) => ({
      ...evt,
      subEvents: [...evt.subEvents, newSeq]
    }));
    onUpdate(updated);
    setShowSequenceModal(false);
    setSeqForm({ title: '', date: '', location: '' });
  };

  const importSources = getAvailableSources();

  /** Import depuis l’appareil (Picker ou liste native Capacitor). */
  const handleImportFromDevice = async () => {
    setLoadingNativeContacts(true);
    try {
      const result = await importFromDevice();
      if (result.type === 'native') {
        if (result.permissionDenied) {
          alert('Accès aux contacts refusé. Tu peux l’autoriser dans Réglages du téléphone, ou ajouter des invités à la main.');
          return;
        }
        setDeviceContactList(result.contacts);
        setDeviceContactSelected(new Set());
        setDeviceContactSearch('');
      } else {
        if (result.contacts.length) setImportedContacts(result.contacts);
        else alert('Aucun contact sélectionné ou accès non disponible. Utilisez l’import de fichier ou l’ajout à la main.');
      }
    } catch (e) {
      console.error(e);
      alert('Impossible d’accéder aux contacts. Utilisez l’import de fichier ou l’ajout à la main.');
    } finally {
      setLoadingNativeContacts(false);
    }
  };

  /** Import depuis Google (People API). */
  const handleImportFromGoogle = async () => {
    setLoadingNativeContacts(true);
    try {
      const { contacts, error } = await importFromGoogle();
      if (error) {
        alert(error);
        return;
      }
      if (contacts.length) setImportedContacts(contacts);
      else alert('Aucun contact trouvé dans votre compte Google.');
    } catch (e) {
      console.error(e);
      alert('Impossible d’importer depuis Google.');
    } finally {
      setLoadingNativeContacts(false);
    }
  };
  const toggleDeviceContact = (index: number) => {
    setDeviceContactSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };
  const confirmDeviceSelection = () => {
    if (!deviceContactList) return;
    const selected = Array.from(deviceContactSelected)
      .map(i => deviceContactList[i])
      .filter(Boolean);
    setImportedContacts(deduplicateContacts(selected));
    setDeviceContactList(null);
    setDeviceContactSelected(new Set());
    setDeviceContactSearch('');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const contacts = await importFromFile(file);
      if (contacts.length) setImportedContacts(contacts);
      else alert('Aucun contact trouvé dans le fichier.');
    } catch (err) {
      console.error(err);
      alert('Fichier invalide ou impossible à lire.');
    }
  };

  const updateImportedContact = (index: number, field: keyof ImportedContact, value: string) => {
    setImportedContacts(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const handleAddAllImportedGuests = async () => {
    if (!canManageGuestsHere || !selectedSubId) return;
    const toAdd = importedContacts.map(c => ({
      id: crypto.randomUUID(),
      firstName: (c.firstName || '').trim() || 'Prénom',
      lastName: (c.lastName || '').trim() || 'Nom',
      email: (c.email || '').trim(),
      phone: (c.phone || '').trim() || undefined,
      status: 'pending' as const,
      companions: [],
      linkedSubEventIds: [selectedSubId]
    })) as Guest[];
    try {
      const updated = await dbService.updateEventAtomic(event.id, (evt) => ({
        ...evt,
        guests: [...(evt.guests || []), ...toAdd]
      }));
      onUpdate(updated);
      setImportedContacts([]);
      setShowImportGuestsModal(false);
    } catch (err) {
      console.error(err);
      alert('Impossible d\'ajouter les invités.');
    }
  };

  const handleAddGuest = async () => {
    if (!canManageGuestsHere || !selectedSubId) return;
    if (!guestForm.firstName.trim()) return;
    const newGuest: Guest = {
      id: crypto.randomUUID(),
      firstName: guestForm.firstName.trim(),
      lastName: (guestForm.lastName || '').trim(),
      email: (guestForm.email || '').trim(),
      phone: guestForm.phone?.trim() || undefined,
      status: 'confirmed',
      companions: [],
      linkedSubEventIds: [selectedSubId]
    };
    const updated = await dbService.updateEventAtomic(event.id, (evt) => ({
      ...evt,
      guests: [...(evt.guests || []), newGuest]
    }));
    onUpdate(updated);
    setShowGuestModal(false);
    setGuestForm({ firstName: '', lastName: '', email: '', phone: '' });
  };

  const handleApprove = async (userId: string, approve: boolean, permissions?: Permission[], allowedSubEventIds?: string[]) => {
    const updated = await dbService.updateEventAtomic(event.id, (evt) => {
      if (!approve) return { ...evt, organizers: evt.organizers.filter(o => o.userId !== userId) };
      return {
        ...evt,
        organizers: evt.organizers.map(o =>
          o.userId === userId
            ? { ...o, status: 'confirmed' as const, permissions: permissions ?? o.permissions, allowedSubEventIds }
            : o
        )
      };
    });
    onUpdate(updated);
    setApproveModalOrganizer(null);
  };

  const openApproveModal = (organizer: Organizer) => {
    setApproveModalOrganizer(organizer);
    setApprovePermissions(['access_organizer_chat']);
    setApproveSubEventIds([]);
  };

  const handleSaveEditRights = async () => {
    if (!editRightsOrganizer) return;
    const updated = await dbService.updateEventAtomic(event.id, (evt) => ({
      ...evt,
      organizers: evt.organizers.map(o =>
        o.userId === editRightsOrganizer.userId
          ? { ...o, permissions: editRightsPermissions, allowedSubEventIds: editRightsSubEventIds.length > 0 ? editRightsSubEventIds : undefined }
          : o
      )
    }));
    onUpdate(updated);
    setEditRightsOrganizer(null);
  };

  const togglePermission = (p: Permission, current: Permission[], set: (arr: Permission[]) => void) => {
    if (p === 'all') {
      set(current.includes('all') ? [] : (['all'] as Permission[]));
      return;
    }
    if (current.includes('all')) {
      set(current.filter(x => x !== 'all'));
      return;
    }
    if (current.includes(p)) set(current.filter(x => x !== p));
    else set([...current, p]);
  };

  const toggleSubEvent = (subId: string, current: string[], set: (arr: string[]) => void) => {
    if (current.includes(subId)) set(current.filter(id => id !== subId));
    else set([...current, subId]);
  };

  const handleAddKeyMoment = async () => {
    if (!canManageProgramHere || !selectedSubId) return;
    if (!momentForm.label) return;
    const newMoment: KeyMoment = { id: crypto.randomUUID(), ...momentForm };
    const updated = await dbService.updateEventAtomic(event.id, (evt) => ({
      ...evt,
      subEvents: evt.subEvents.map(s => s.id === selectedSubId ? { ...s, keyMoments: [...s.keyMoments, newMoment] } : s)
    }));
    onUpdate(updated);
    setShowMomentModal(false);
    setMomentForm({ time: '', label: '' });
  };

  const reportTyping = useCallback(() => {
    if (!canChat) return;
    const ch = chatChannelRef.current;
    if (!ch) return;
    const payload = { userId: user.id, userName: `${user.firstName} ${user.lastName}`, typing: true };
    ch.track(payload);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
      chatChannelRef.current?.track({ ...payload, typing: false });
    }, 3000);
  }, [canChat, user.id, user.firstName, user.lastName]);

  const openSubEventSettings = () => {
    if (!currentSub) return;
    setSubEventEditForm({
      title: currentSub.title ?? '',
      date: currentSub.date ? currentSub.date.slice(0, 16) : '',
      location: currentSub.location ?? ''
    });
    setShowSubEventSettingsModal(true);
  };

  const handleSaveSubEventSettings = async () => {
    if (!selectedSubId) return;
    try {
      const updated = await dbService.updateEventAtomic(event.id, (evt) => ({
        ...evt,
        subEvents: evt.subEvents.map((s) =>
          s.id === selectedSubId
            ? {
                ...s,
                title: subEventEditForm.title.trim() || s.title,
                date: subEventEditForm.date || undefined,
                location: subEventEditForm.location.trim() || undefined
              }
            : s
        )
      }));
      onUpdate(updated);
      setShowSubEventSettingsModal(false);
    } catch (err) {
      console.error(err);
      alert('Impossible d\'enregistrer.');
    }
  };

  const handleDeleteSubEvent = async () => {
    if (!canManageProgramHere || !selectedSubId) return;
    if (!confirm('Supprimer cette séquence ? Les jalons et participants liés ne seront plus associés à cette séquence.')) return;
    try {
      const updated = await dbService.updateEventAtomic(event.id, (evt) => ({
        ...evt,
        subEvents: evt.subEvents.filter((s) => s.id !== selectedSubId)
      }));
      onUpdate(updated);
      setSelectedSubId(null);
      setShowSubEventSettingsModal(false);
    } catch (err) {
      console.error(err);
      alert('Impossible de supprimer la séquence.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSendChat) return;
    const text = newMessage.trim();
    if (!text) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    chatChannelRef.current?.track({ userId: user.id, userName: `${user.firstName} ${user.lastName}`, typing: false });
    const channelId = selectedSubId || 'global';
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      eventId: event.id,
      channelId,
      senderId: user.id,
      senderName: `${user.firstName} ${user.lastName}`,
      text,
      timestamp: new Date().toISOString(),
      role: isOwner ? 'owner' : 'organizer'
    };
    setNewMessage('');
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    try {
      await dbService.saveMessage(msg);
    } catch (err) {
      console.error('Envoi message', err);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      setNewMessage(text);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "À confirmer";
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  };

  const openEventSettings = () => {
    setEventEditForm({
      title: event.title,
      isDateTBD: event.isDateTBD,
      startDate: event.startDate ? event.startDate.slice(0, 16) : '',
      location: event.location || '',
      budget: String(event.budget || 0),
      image: event.image || ''
    });
    setEventSettingsTab('general');
    setShowEventSettingsModal(true);
  };

  const processEventImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageUploading(true);
    try {
      const { data, error } = await supabase.storage
        .from('event-images')
        .upload(`${event.id}/${Date.now()}_${file.name}`, file, { upsert: true });
      if (!error && data?.path) {
        const { data: urlData } = supabase.storage.from('event-images').getPublicUrl(data.path);
        setEventEditForm(prev => ({ ...prev, image: urlData.publicUrl }));
      } else {
        const reader = new FileReader();
        reader.onload = () => setEventEditForm(prev => ({ ...prev, image: String(reader.result) }));
        reader.readAsDataURL(file);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => setEventEditForm(prev => ({ ...prev, image: String(reader.result) }));
      reader.readAsDataURL(file);
    } finally {
      setImageUploading(false);
    }
  }, [event.id]);

  const handleEventImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processEventImageFile(file);
  }, [processEventImageFile]);

  const handleEventImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processEventImageFile(file);
    e.target.value = '';
  }, [processEventImageFile]);

  const handleSaveEventSettings = async () => {
    if (!canEditEvent) return;
    const startDate = eventEditForm.isDateTBD ? undefined : (eventEditForm.startDate || undefined);
    const updated = await dbService.updateEventAtomic(event.id, (evt) => ({
      ...evt,
      title: eventEditForm.title.trim() || evt.title,
      isDateTBD: eventEditForm.isDateTBD,
      startDate: startDate ?? evt.startDate,
      location: eventEditForm.location.trim() || evt.location,
      budget: parseFloat(eventEditForm.budget) || 0,
      image: eventEditForm.image.trim() || undefined,
      date: startDate ?? evt.date
    }));
    onUpdate(updated);
    setShowEventSettingsModal(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
      {/* HEADER */}
      <div className="relative h-40 sm:h-48 flex-shrink-0">
        <img src={event.image || `https://picsum.photos/seed/${event.id}/1200/400`} className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
        <button type="button" onClick={onBack} className="absolute top-3 left-3 sm:top-4 sm:left-4 p-3 sm:p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/90 text-slate-800 rounded-xl hover:bg-white" aria-label="Retour">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        {canEditEvent && (
          <button type="button" onClick={openEventSettings} className="absolute top-3 right-3 sm:top-4 sm:right-4 p-3 sm:p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/90 text-slate-800 rounded-xl hover:bg-white" title="Réglages">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </button>
        )}
        <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-white truncate">{event.title}</h1>
          <p className="text-white/80 text-xs sm:text-sm mt-0.5 truncate">{event.isDateTBD ? "À confirmer" : formatDate(event.startDate)} · {event.location || "Lieu à définir"}</p>
        </div>
      </div>

      {!selectedSubId ? (
        <>
          <nav className="flex gap-0 sm:gap-1 px-2 sm:px-4 pt-2 pb-1 border-b border-slate-200 overflow-x-auto no-scrollbar overflow-y-hidden" style={{ WebkitOverflowScrolling: 'touch' }} aria-label="Onglets">
            {[
              { id: 'overview', label: "Vue d'ensemble" },
              { id: 'program', label: 'Programme' },
              { id: 'chat', label: 'Chat' },
              { id: 'settings', label: 'Équipe' },
              ...(canViewBudget ? [{ id: 'budget', label: 'Budget' }] : [])
            ].map(tab => (
              (tab.id !== 'settings' || isOwner) && (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id as any)} className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium rounded-t-lg whitespace-nowrap relative min-h-[44px] flex items-center ${activeTab === tab.id ? 'text-indigo-600 bg-slate-50' : 'text-slate-500 hover:text-slate-700'}`}>
                  {tab.label}
                  {tab.id === 'settings' && pendingOrganizers.length > 0 && <span className="absolute top-2 right-1 w-2 h-2 bg-red-500 rounded-full" />}
                  {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t" />}
                </button>
              )
            ))}
          </nav>

          <div className="flex-1 p-4 sm:p-6 overflow-y-auto min-w-0 space-y-4 sm:space-y-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 p-5 rounded-xl border border-slate-200 bg-slate-50/30">
                    <h3 className="text-base font-semibold text-slate-900 mb-2">Description du projet</h3>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{event.description || "Aucune description."}</p>
                  </div>
                  <div className="p-5 rounded-xl border border-slate-200 bg-white">
                    <h3 className="text-base font-semibold text-slate-900 mb-4">Invités</h3>
                    {(() => {
                      const guests = event.guests || [];
                      const confirmed = guests.filter(g => g.status === 'confirmed').length;
                      const declined = guests.filter(g => g.status === 'declined').length;
                      const pending = guests.filter(g => g.status === 'pending').length;
                      const responded = confirmed + declined;
                      return (
                        <div className="space-y-4">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm text-slate-500">Viennent</span>
                            <span className="text-xl font-semibold text-emerald-600">{confirmed}</span>
                          </div>
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm text-slate-500">Invitations répondues</span>
                            <span className="text-lg font-semibold text-slate-900">{responded}</span>
                          </div>
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm text-slate-500">Non répondu</span>
                            <span className="text-lg font-semibold text-slate-400">{pending}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <button type="button" onClick={() => { setActiveTab('program'); setSelectedSubId(null); }} className="w-full text-left px-4 py-3 border-b border-slate-100 flex items-center justify-between group hover:bg-slate-50">
                      <h3 className="text-sm font-semibold text-slate-900">Programme</h3>
                      <span className="text-xs text-slate-500 group-hover:text-indigo-600">Voir tout →</span>
                    </button>
                    <div className="p-2 max-h-[320px] overflow-y-auto">
                      {(() => {
                        const sorted = [...event.subEvents].sort((a, b) => ((a.date ? new Date(a.date).getTime() : 0) - (b.date ? new Date(b.date).getTime() : 0)));
                        if (sorted.length === 0) return <p className="p-4 text-slate-400 text-sm">Aucun créneau au programme.</p>;
                        return (
                          <ul className="relative space-y-0 pl-1">
                            <div className="absolute left-5 top-3 bottom-3 w-px bg-slate-200" aria-hidden />
                            {sorted.map((sub) => (
                              <li key={sub.id}>
                                <button type="button" onClick={() => { setSelectedSubId(sub.id); setActiveTab('program'); setSubTab('sequence'); }} className="w-full text-left flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors relative">
                                  <span className="flex flex-col items-center shrink-0 w-12 pt-0.5 relative z-10">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{sub.date ? new Date(sub.date).toLocaleDateString('fr-FR', { weekday: 'short' }) : '—'}</span>
                                    <span className="text-lg font-bold text-slate-800 leading-tight">{sub.date ? new Date(sub.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'TBD'}</span>
                                  </span>
                                  <div className="min-w-0 flex-1 border-l border-slate-200 pl-3">
                                    <p className="font-medium text-slate-900 truncate">{sub.title || 'Sans titre'}</p>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">{sub.date && new Date(sub.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}{sub.location && ` · ${sub.location}`}</p>
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        );
                      })()}
                    </div>
                  </div>
                  {canViewBudget && (
                    <div className="lg:col-span-2">
                      <button type="button" onClick={() => setActiveTab('budget')} className="w-full h-full min-h-[240px] rounded-xl border border-slate-200 bg-white p-4 flex flex-col items-center justify-center gap-3 hover:border-indigo-200 hover:shadow-md transition-all">
                        <h3 className="text-sm font-semibold text-slate-900 w-full">Budget</h3>
                        {event.budget > 0 ? (
                          <>
                            <div
                              className="w-32 h-32 rounded-full flex-shrink-0 border-4 border-white shadow-md"
                              style={{ background: `conic-gradient(#6366f1 0deg 360deg)` }}
                              aria-hidden
                            />
                            <p className="text-xl font-semibold text-slate-900">{event.budget.toLocaleString('fr-FR')} €</p>
                            <p className="text-xs text-slate-500">Cliquer pour le détail</p>
                          </>
                        ) : (
                          <>
                            <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center" aria-hidden><span className="text-3xl text-slate-300">€</span></div>
                            <p className="text-sm text-slate-500">Aucun budget renseigné</p>
                            <p className="text-xs text-slate-400">Cliquer pour gérer</p>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-5 rounded-xl border border-indigo-100 bg-indigo-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-indigo-900">Inviter des co-organisateurs</p>
                    <p className="text-xs text-indigo-600 mt-0.5">Partagez l'accès pour travailler à plusieurs.</p>
                  </div>
                  <button type="button" onClick={handleShare} className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 shrink-0">Partager l'invitation</button>
                </div>
              </div>
            )}

            {activeTab === 'budget' && canViewBudget && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Budget du projet</h2>
                  <button type="button" onClick={() => setActiveTab('overview')} className="text-sm text-indigo-600 font-medium hover:underline">← Vue d'ensemble</button>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <p className="text-sm text-slate-500 mb-2">Budget total</p>
                  <p className="text-3xl font-semibold text-slate-900">{event.budget.toLocaleString('fr-FR')} €</p>
                  <p className="mt-4 text-xs text-slate-400">La répartition des dépenses par poste sera disponible dans une prochaine version.</p>
                </div>
              </div>
            )}

            {activeTab === 'program' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Programme</h3>
                  <button type="button" onClick={() => setShowSequenceModal(true)} disabled={!canManageProgram} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">+ Séquence</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {event.subEvents.map(sub => (
                    <button key={sub.id} type="button" onClick={() => { setSelectedSubId(sub.id); setSubTab('sequence'); }} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md text-left transition-all">
                      <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{sub.date ? new Date(sub.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}</span>
                      <h4 className="text-base font-semibold text-slate-900 mt-2 truncate">{sub.title}</h4>
                      <p className="text-slate-500 text-xs mt-1 truncate flex items-center gap-1"><svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>{sub.location || "Lieu global"}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'settings' && isOwner && (
              <div className="space-y-8">
                 <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                    <h3 className="text-xl font-black">Accès & invitation</h3>
                    <p className="text-sm text-gray-500">Partage ces informations pour qu’un co-organisateur envoie une demande depuis la page d’accueil (Rejoindre).</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="p-4 bg-gray-50 rounded-2xl flex items-start justify-between gap-2">
                          <div className="min-w-0">
                             <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Clé de partage</p>
                             <p className="font-black text-indigo-600 text-lg break-all">{event.shareCode}</p>
                          </div>
                          <button type="button" onClick={() => handleCopy(event.shareCode, 'code')} className="p-2 rounded-xl text-gray-400 hover:bg-gray-200 hover:text-indigo-600 flex-shrink-0" title="Copier">
                            {copiedField === 'code' ? (
                              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h2m8 0h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2m-8 0H6m8 0h8"/></svg>
                            )}
                          </button>
                       </div>
                       <div className="p-4 bg-gray-50 rounded-2xl flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                             <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Mot de passe</p>
                             {editingPassword ? (
                               <div className="space-y-2 mt-2" onClick={e => e.stopPropagation()}>
                                 <div className="flex gap-2 items-end">
                                   <div className="flex-1 min-w-0">
                                     <Input label="" placeholder="Nouveau mot de passe" value={newPasswordValue} onChange={e => setNewPasswordValue(e.target.value)} type="text" autoComplete="off" />
                                   </div>
                                   <button type="button" onClick={() => setNewPasswordValue(generateSharePassword())} className="px-3 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 text-xs font-black uppercase hover:border-indigo-300 hover:text-indigo-600 whitespace-nowrap">Générer</button>
                                 </div>
                                 <div className="flex gap-2">
                                   <button type="button" onClick={cancelEditPassword} disabled={savingPassword} className="px-3 py-1.5 text-gray-500 text-xs font-bold uppercase disabled:opacity-50">Annuler</button>
                                   <button type="button" onClick={saveNewPassword} disabled={savingPassword} className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase disabled:opacity-50">
                                     {savingPassword ? 'Enregistrement…' : 'Enregistrer'}
                                   </button>
                                 </div>
                               </div>
                             ) : (
                               <>
                                 <p className="font-black text-indigo-600 text-lg break-all">{event.sharePassword ?? ''}</p>
                                 <button type="button" onClick={startEditPassword} className="mt-2 text-indigo-600 text-[10px] font-black uppercase hover:underline">Modifier le mot de passe</button>
                               </>
                             )}
                          </div>
                          {!editingPassword && (
                            <button type="button" onClick={() => handleCopy(event.sharePassword ?? '', 'password')} className="p-2 rounded-xl text-gray-400 hover:bg-gray-200 hover:text-indigo-600 flex-shrink-0" title="Copier">
                              {copiedField === 'password' ? (
                                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h2m8 0h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2m-8 0H6m8 0h8"/></svg>
                              )}
                            </button>
                          )}
                       </div>
                    </div>
                    <button onClick={handleShare} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-indigo-100 active:scale-95">
                      Partager l’invitation
                    </button>
                 </div>

                 {pendingOrganizers.length > 0 && (
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-red-500 uppercase px-2">Demandes en attente ({pendingOrganizers.length})</h4>
                      <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                         {pendingOrganizers.map(o => (
                           <div key={o.userId} className="bg-white p-5 rounded-3xl border-2 border-amber-100 flex items-center justify-between gap-4 flex-shrink-0">
                              <div className="flex items-center gap-3 min-w-0">
                                 <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-black text-sm flex-shrink-0">
                                   {o.firstName.charAt(0)}{o.lastName.charAt(0)}
                                 </div>
                                 <p className="font-bold text-gray-900 truncate">{o.firstName} {o.lastName}</p>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                 <button onClick={() => handleApprove(o.userId, false)} className="px-4 py-2 text-gray-400 font-bold text-[10px] uppercase rounded-xl hover:bg-gray-100">Refuser</button>
                                 <button onClick={() => openApproveModal(o)} className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase">Approuver</button>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                 )}

                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase px-2">Équipe confirmée</h4>
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden">
                       <table className="w-full text-left">
                          <thead className="bg-gray-50 border-b border-gray-100">
                             <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Membre</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">Rôle</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">Droits</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                             <tr>
                                <td className="px-6 py-4 font-black text-indigo-600">{user.firstName} (Vous)</td>
                                <td className="px-6 py-4 text-[10px] font-black text-gray-300 uppercase">Propriétaire</td>
                                <td className="px-6 py-4 text-[10px] text-gray-300">—</td>
                             </tr>
                             {activeOrganizers.map(o => (
                               <tr key={o.userId}>
                                  <td className="px-6 py-4 font-bold text-gray-800">{o.firstName} {o.lastName}</td>
                                  <td className="px-6 py-4 text-[10px] font-black text-emerald-600 uppercase">Co-organisateur</td>
                                  <td className="px-6 py-4 text-right">
                                    <button
                                      onClick={() => {
                                        setEditRightsOrganizer(o);
                                        setEditRightsPermissions(o.permissions || []);
                                        setEditRightsSubEventIds(o.allowedSubEventIds || []);
                                      }}
                                      className="text-indigo-600 font-bold text-[10px] uppercase hover:underline"
                                    >
                                      Modifier
                                    </button>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="flex flex-col bg-white rounded-2xl sm:rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm min-h-[280px] h-[min(500px,70dvh)] sm:h-[500px] max-h-[calc(100dvh-12rem)]">
                 {typingNames.length > 0 && (
                   <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-50/80 border-b border-indigo-100 text-xs sm:text-sm text-indigo-700 shrink-0">
                     <span className="inline-flex gap-1" aria-hidden>
                       <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                       <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                       <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                     </span>
                     <span className="font-medium truncate">
                       {typingNames.length === 1
                         ? `${typingNames[0]} est en train d'écrire`
                         : typingNames.length === 2
                           ? `${typingNames[0]} et ${typingNames[1]} sont en train d'écrire`
                           : `${typingNames[0]} et ${typingNames.length - 1} autre(s) sont en train d'écrire`}
                     </span>
                   </div>
                 )}
                 <div ref={chatScrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-0 overscroll-behavior-contain">
                    {messages.map(m => (
                      <div key={m.id} className={`flex flex-col ${m.senderId === user.id ? 'items-end' : 'items-start'}`}>
                         <span className="text-[9px] font-black text-gray-300 mb-1 uppercase">{m.senderName}</span>
                         <div className={`px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl max-w-[85%] text-sm shadow-sm break-words ${m.senderId === user.id ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-700'}`}>
                            {m.text}
                         </div>
                      </div>
                    ))}
                 </div>
                 <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-gray-50/50 border-t border-gray-100 flex gap-2 sm:gap-3 shrink-0 pb-[env(safe-area-inset-bottom)] sm:pb-4">
                    <input
                      className="flex-1 min-w-0 bg-white border-2 border-gray-100 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-6 text-base sm:text-sm outline-none focus:border-indigo-500 transition-all disabled:opacity-60"
                      placeholder={canSendChat ? "Message d'équipe..." : "Accès messagerie restreint"}
                      value={newMessage}
                      onChange={e => {
                        setNewMessage(e.target.value);
                        reportTyping();
                      }}
                      disabled={!canSendChat}
                      aria-label="Message"
                    />
                    <button
                      type="submit"
                      disabled={!canSendChat}
                      className="min-w-[44px] min-h-[44px] p-3 sm:p-4 bg-indigo-600 text-white rounded-xl sm:rounded-2xl shadow-lg shadow-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                      aria-label="Envoyer"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9-2-9-18-9 18 9-2zm0 0v-8"/></svg>
                    </button>
                 </form>
              </div>
            )}
          </div>
        </>
      ) : (
        /* VUE SÉQUENCE */
        <div className="flex-1 flex flex-col bg-white min-w-0 animate-in slide-in-from-right-8 duration-500">
           <header className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 bg-gray-900 text-white flex items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
                 <button type="button" onClick={() => setSelectedSubId(null)} className="min-w-[44px] min-h-[44px] p-3 flex items-center justify-center bg-white/10 rounded-xl sm:rounded-2xl hover:bg-white/20 transition-all" aria-label="Retour au programme">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
                 </button>
                 <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-black truncate">{currentSub?.title}</h2>
                    <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Séquence du programme</p>
                 </div>
              </div>
              {canManageProgramHere && (
                <button type="button" onClick={openSubEventSettings} className="p-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-colors shrink-0" title="Réglages de la séquence">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </button>
              )}
           </header>

           <nav className="flex px-2 sm:px-4 border-b border-gray-100 bg-gray-50/30 overflow-x-auto no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
              <button key="sequence" type="button" onClick={() => setSubTab('sequence')} className={`py-4 sm:py-5 px-4 sm:px-6 text-[10px] font-black uppercase tracking-widest relative whitespace-nowrap min-h-[44px] flex items-center ${subTab === 'sequence' ? 'text-indigo-600' : 'text-gray-400'}`}>
                Séquence
                {subTab === 'sequence' && <div className="absolute bottom-0 left-4 right-4 h-1 bg-indigo-600 rounded-t-full" />}
              </button>
              {canChatForCurrentSubEvent && (
                <button key="chat" type="button" onClick={() => setSubTab('chat')} className={`py-4 sm:py-5 px-4 sm:px-6 text-[10px] font-black uppercase tracking-widest relative whitespace-nowrap min-h-[44px] flex items-center ${subTab === 'chat' ? 'text-indigo-600' : 'text-gray-400'}`}>
                  Chat
                  {subTab === 'chat' && <div className="absolute bottom-0 left-4 right-4 h-1 bg-indigo-600 rounded-t-full" />}
                </button>
              )}
           </nav>

           <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto min-w-0 space-y-6 sm:space-y-10">
              {subTab === 'sequence' && (
                <>
                  {/* Infos */}
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Infos</h3>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <p className="font-semibold text-slate-900">{currentSub?.title || 'Sans titre'}</p>
                      <p className="text-sm text-slate-600 mt-1">{currentSub?.date ? new Date(currentSub.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Date à définir'}</p>
                      <p className="text-sm text-slate-600">{currentSub?.location || 'Lieu à définir'}</p>
                    </div>
                  </section>

                  {/* Timeline */}
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Déroulé précis</h3>
                      <button type="button" onClick={() => setShowMomentModal(true)} disabled={!canManageProgramHere} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-40">
                        + Jalon
                      </button>
                    </div>
                    <div className="relative space-y-4 pl-1">
                      <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-200" aria-hidden />
                      {currentSub?.keyMoments.map(m => (
                        <div key={m.id} className="relative pl-8 flex items-center gap-4">
                          <span className="absolute left-0 w-4 h-4 bg-indigo-600 rounded-full border-2 border-white shadow" />
                          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md min-w-[4rem] text-center">{m.time || '--:--'}</span>
                          <p className="font-medium text-slate-800">{m.label}</p>
                        </div>
                      ))}
                      {(!currentSub?.keyMoments || currentSub.keyMoments.length === 0) && <div className="pl-8 text-slate-400 text-sm italic py-6">Aucun moment clé.</div>}
                    </div>
                  </section>

                  {/* Participants */}
                  <section className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Participants</h3>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setShowImportGuestsModal(true)} disabled={!canManageGuestsHere} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 disabled:opacity-40">
                          Importer contacts
                        </button>
                        <button type="button" onClick={() => setShowGuestModal(true)} disabled={!canManageGuestsHere} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold disabled:opacity-40">
                          + Invité
                        </button>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-4 py-3 font-semibold text-slate-600">Nom</th><th className="px-4 py-3 font-semibold text-slate-600">Contact</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {event.guests?.filter(g => g.linkedSubEventIds.includes(selectedSubId!)).map(g => (
                            <tr key={g.id}><td className="px-4 py-3 font-medium text-slate-900">{g.firstName} {g.lastName}</td><td className="px-4 py-3 text-slate-500">{g.email || g.phone || '—'}</td></tr>
                          ))}
                          {event.guests?.filter(g => g.linkedSubEventIds.includes(selectedSubId!)).length === 0 && <tr><td colSpan={2} className="px-4 py-12 text-center text-slate-400">Aucun participant.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}

              {subTab === 'chat' && canChatForCurrentSubEvent && (
                <div className="flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm min-h-[280px] h-[min(400px,60dvh)]">
                  <p className="px-4 py-2 text-xs text-slate-500 border-b border-slate-100">Chat réservé aux admins de cette séquence.</p>
                  {typingNames.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50/80 border-b border-indigo-100 text-xs text-indigo-700 shrink-0">
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                      <span className="font-medium truncate">{typingNames.length === 1 ? `${typingNames[0]} écrit...` : `${typingNames[0]} et ${typingNames.length - 1} autre(s) écrivent...`}</span>
                    </div>
                  )}
                  <div ref={chatScrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 min-h-0">
                    {messages.map(m => (
                      <div key={m.id} className={`flex flex-col ${m.senderId === user.id ? 'items-end' : 'items-start'}`}>
                        <span className="text-[9px] font-medium text-slate-400 mb-1">{m.senderName}</span>
                        <div className={`px-4 py-2.5 rounded-xl max-w-[85%] text-sm break-words ${m.senderId === user.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'}`}>{m.text}</div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSendMessage} className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2 shrink-0">
                    <input
                      className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 disabled:opacity-60"
                      placeholder="Message..."
                      value={newMessage}
                      onChange={e => { setNewMessage(e.target.value); reportTyping(); }}
                      disabled={!canSendChat}
                      aria-label="Message"
                    />
                    <button type="submit" disabled={!canSendChat} className="min-w-[44px] min-h-[44px] p-3 bg-indigo-600 text-white rounded-xl disabled:opacity-40 flex items-center justify-center" aria-label="Envoyer">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9-2-9-18-9 18 9-2zm0 0v-8"/></svg>
                    </button>
                  </form>
                </div>
              )}
           </div>
        </div>
      )}

      {/* MODALS */}
      {showEventSettingsModal && (
        <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-gray-900/80 backdrop-blur-xl">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-[3rem] shadow-2xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col pb-[env(safe-area-inset-bottom)]">
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 px-5 sm:px-10 pt-6 sm:pt-10 pb-3 sm:pb-4">Réglages du projet</h3>
            <nav className="flex px-4 sm:px-6 border-b border-gray-100">
              {(['general', 'appearance'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setEventSettingsTab(tab)}
                  className={`py-4 px-6 text-[11px] font-black uppercase tracking-widest border-b-2 transition-colors ${
                    eventSettingsTab === tab
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab === 'general' ? 'Général' : 'Apparence'}
                </button>
              ))}
            </nav>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 space-y-6">
              {eventSettingsTab === 'general' && (
                <>
                  <Input
                    label="Nom du projet"
                    placeholder="Ex: Mariage de Sarah & Marc"
                    value={eventEditForm.title}
                    onChange={e => setEventEditForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={eventEditForm.isDateTBD}
                        onChange={e => setEventEditForm(prev => ({ ...prev, isDateTBD: e.target.checked }))}
                      />
                      <span className="text-sm font-bold text-gray-700">Date à confirmer</span>
                    </label>
                    {!eventEditForm.isDateTBD && (
                      <Input
                        label="Date et heure"
                        type="datetime-local"
                        value={eventEditForm.startDate}
                        onChange={e => setEventEditForm(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    )}
                  </div>
                  <Input
                    label="Lieu"
                    placeholder="Adresse ou lieu à confirmer"
                    value={eventEditForm.location}
                    onChange={e => setEventEditForm(prev => ({ ...prev, location: e.target.value }))}
                  />
                  <Input
                    label="Budget (€)"
                    type="number"
                    min="0"
                    value={eventEditForm.budget}
                    onChange={e => setEventEditForm(prev => ({ ...prev, budget: e.target.value }))}
                  />
                </>
              )}
              {eventSettingsTab === 'appearance' && (
                <>
                  <input
                    ref={eventImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleEventImageSelect}
                  />
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-50/50'); }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-50/50'); }}
                    onDrop={handleEventImageDrop}
                    onClick={() => eventImageInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-300 hover:bg-gray-50/50 transition-all min-h-[180px] flex flex-col items-center justify-center gap-3"
                  >
                    {imageUploading ? (
                      <div className="w-10 h-10 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                    ) : eventEditForm.image ? (
                      <div className="w-full rounded-xl overflow-hidden border border-gray-100 h-32">
                        <img src={eventEditForm.image} alt="Aperçu" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    ) : null}
                    <span className="text-sm font-bold text-gray-500">
                      {eventEditForm.image && !imageUploading ? 'Cliquer ou glisser une autre image' : 'Glisser une image ici ou cliquer pour parcourir'}
                    </span>
                    <span className="text-xs text-gray-400">Fichiers ou photos depuis l’appareil</span>
                  </div>
                  <Input
                    label="Ou coller une URL d’image"
                    placeholder="https://..."
                    value={eventEditForm.image?.startsWith('http') ? eventEditForm.image : ''}
                    onChange={e => setEventEditForm(prev => ({ ...prev, image: e.target.value }))}
                  />
                </>
              )}
            </div>
            <div className="flex gap-4 p-10 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setShowEventSettingsModal(false)} className="flex-1 py-4 font-bold text-gray-400 text-[10px] uppercase rounded-2xl border border-gray-200">
                Annuler
              </button>
              <button type="button" onClick={handleSaveEventSettings} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-indigo-100">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {approveModalOrganizer && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-6 bg-gray-900/80 backdrop-blur-xl">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black">Droits du co-organisateur</h3>
            <p className="text-sm text-gray-500">Choisis les droits pour {approveModalOrganizer.firstName} {approveModalOrganizer.lastName}.</p>
            <div className="space-y-3">
              {(['edit_details', 'manage_subevents', 'manage_guests', 'access_organizer_chat', 'view_budget', 'all'] as Permission[]).map((p) => (
                <label key={p} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600"
                    checked={approvePermissions.includes(p)}
                    onChange={() => togglePermission(p, approvePermissions, setApprovePermissions)}
                  />
                  <span className="text-sm font-medium text-gray-700">{PERMISSION_LABELS[p]}</span>
                </label>
              ))}
            </div>
            {event.subEvents.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-black text-gray-500 uppercase">Limiter à certaines séquences (optionnel)</p>
                <div className="max-h-32 overflow-y-auto space-y-2 pl-1">
                  {event.subEvents.map((sub) => (
                    <label key={sub.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                        checked={approveSubEventIds.includes(sub.id)}
                        onChange={() => toggleSubEvent(sub.id, approveSubEventIds, setApproveSubEventIds)}
                      />
                      <span className="text-sm text-gray-700">{sub.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-4 pt-2">
              <button type="button" onClick={() => setApproveModalOrganizer(null)} className="flex-1 py-3 font-bold text-gray-400 text-[10px] uppercase rounded-2xl border border-gray-200">Annuler</button>
              <button
                type="button"
                onClick={() => handleApprove(approveModalOrganizer.userId, true, approvePermissions.length ? approvePermissions : ['access_organizer_chat'], approveSubEventIds.length > 0 ? approveSubEventIds : undefined)}
                className="flex-[2] py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase"
              >
                Approuver
              </button>
            </div>
          </div>
        </div>
      )}

      {editRightsOrganizer && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-6 bg-gray-900/80 backdrop-blur-xl">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black">Modifier les droits</h3>
            <p className="text-sm text-gray-500">{editRightsOrganizer.firstName} {editRightsOrganizer.lastName}</p>
            <div className="space-y-3">
              {(['edit_details', 'manage_subevents', 'manage_guests', 'access_organizer_chat', 'view_budget', 'all'] as Permission[]).map((p) => (
                <label key={p} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600"
                    checked={editRightsPermissions.includes(p)}
                    onChange={() => togglePermission(p, editRightsPermissions, setEditRightsPermissions)}
                  />
                  <span className="text-sm font-medium text-gray-700">{PERMISSION_LABELS[p]}</span>
                </label>
              ))}
            </div>
            {event.subEvents.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-black text-gray-500 uppercase">Limiter à certaines séquences (optionnel)</p>
                <div className="max-h-32 overflow-y-auto space-y-2 pl-1">
                  {event.subEvents.map((sub) => (
                    <label key={sub.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                        checked={editRightsSubEventIds.includes(sub.id)}
                        onChange={() => toggleSubEvent(sub.id, editRightsSubEventIds, setEditRightsSubEventIds)}
                      />
                      <span className="text-sm text-gray-700">{sub.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-4 pt-2">
              <button type="button" onClick={() => setEditRightsOrganizer(null)} className="flex-1 py-3 font-bold text-gray-400 text-[10px] uppercase rounded-2xl border border-gray-200">Annuler</button>
              <button type="button" onClick={handleSaveEditRights} className="flex-[2] py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {showSubEventSettingsModal && currentSub && (
        <div className="fixed inset-0 z-[240] flex items-center justify-center p-6 bg-gray-900/80 backdrop-blur-xl">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Réglages de la séquence</h3>
            <div className="space-y-4">
              <Input label="Titre" value={subEventEditForm.title} onChange={e => setSubEventEditForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Cocktail" />
              <Input label="Date & heure" type="datetime-local" value={subEventEditForm.date} onChange={e => setSubEventEditForm(f => ({ ...f, date: e.target.value }))} />
              <Input label="Lieu" value={subEventEditForm.location} onChange={e => setSubEventEditForm(f => ({ ...f, location: e.target.value }))} placeholder="Lieu ou à définir" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowSubEventSettingsModal(false)} className="flex-1 py-2.5 text-slate-600 text-sm font-medium rounded-xl border border-slate-200">Annuler</button>
              <button type="button" onClick={handleSaveSubEventSettings} className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl">Enregistrer</button>
            </div>
            {canManageProgramHere && (
              <button type="button" onClick={handleDeleteSubEvent} className="w-full py-2.5 text-red-600 text-sm font-medium rounded-xl border border-red-200 hover:bg-red-50">
                Supprimer la séquence
              </button>
            )}
          </div>
        </div>
      )}

      {showSequenceModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-gray-900/80 backdrop-blur-xl">
           <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-[3rem] p-6 sm:p-10 space-y-5 sm:space-y-6 shadow-2xl pb-[env(safe-area-inset-bottom)]">
              <h3 className="text-2xl font-black">Nouvelle Séquence</h3>
              <div className="space-y-4">
                 <Input label="Titre de la séquence" placeholder="Ex: Cocktail de bienvenue" value={seqForm.title} onChange={e => setSeqForm({...seqForm, title: e.target.value})} />
                 <Input label="Date & Heure" type="datetime-local" value={seqForm.date} onChange={e => setSeqForm({...seqForm, date: e.target.value})} />
                 <Input label="Lieu spécifique" placeholder="Ex: Salon panoramique" value={seqForm.location} onChange={e => setSeqForm({...seqForm, location: e.target.value})} />
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setShowSequenceModal(false)} className="flex-1 py-4 font-bold text-gray-400 text-[10px] uppercase">Annuler</button>
                 <button onClick={handleAddSequence} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-indigo-100">Ajouter</button>
              </div>
           </div>
        </div>
      )}

      {showGuestModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-gray-900/80 backdrop-blur-xl">
           <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 space-y-5 sm:space-y-6 shadow-xl pb-[env(safe-area-inset-bottom)]">
              <h3 className="text-lg font-semibold text-slate-900">Ajouter un participant</h3>
              <div className="space-y-4">
                 <Input label="Prénom" value={guestForm.firstName} onChange={e => setGuestForm({...guestForm, firstName: e.target.value})} />
                 <Input label="Nom" value={guestForm.lastName} onChange={e => setGuestForm({...guestForm, lastName: e.target.value})} />
                 <Input label="Email" type="email" value={guestForm.email} onChange={e => setGuestForm({...guestForm, email: e.target.value})} />
                 <Input label="Téléphone" type="tel" value={guestForm.phone} onChange={e => setGuestForm({...guestForm, phone: e.target.value})} />
              </div>
              <div className="flex gap-3">
                 <button type="button" onClick={() => setShowGuestModal(false)} className="flex-1 py-2.5 text-slate-600 text-sm font-medium rounded-xl border border-slate-200">Annuler</button>
                 <button type="button" onClick={handleAddGuest} className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl">Enregistrer</button>
              </div>
           </div>
        </div>
      )}

      {showImportGuestsModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-gray-900/80 backdrop-blur-xl">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col pb-[env(safe-area-inset-bottom)]">
            {/* Étape : liste native avec cases à cocher */}
            {deviceContactList !== null ? (
              <>
                <div className="p-4 sm:p-5 border-b border-slate-200 shrink-0">
                  <h3 className="text-lg font-semibold text-slate-900">Choisir des contacts</h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">Coche les invités à ajouter, puis valide.</p>
                  <input
                    type="text"
                    placeholder="Rechercher…"
                    value={deviceContactSearch}
                    onChange={e => setDeviceContactSearch(e.target.value)}
                    className="mt-3 w-full px-4 py-3 sm:py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div className="flex-1 overflow-y-auto p-2 sm:p-3 min-h-0">
                  {deviceContactList
                    .map((c, idx) => ({ c, idx }))
                    .filter(({ c }) => {
                      const q = deviceContactSearch.trim().toLowerCase();
                      if (!q) return true;
                      const s = `${c.firstName} ${c.lastName} ${c.email} ${c.phone}`.toLowerCase();
                      return s.includes(q);
                    })
                    .map(({ c, idx }) => {
                      const selected = deviceContactSelected.has(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleDeviceContact(idx)}
                          className={`w-full flex items-center gap-3 px-4 py-3.5 sm:py-3 rounded-xl text-left border min-h-[52px] sm:min-h-0 ${selected ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 hover:bg-slate-50'}`}
                        >
                          <span className={`w-6 h-6 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center shrink-0 ${selected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                            {selected && <svg className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-900 truncate">{c.firstName} {c.lastName}</p>
                            <p className="text-xs text-slate-500 truncate">{c.email || c.phone || '—'}</p>
                          </div>
                        </button>
                      );
                    })}
                </div>
                <div className="p-4 border-t border-slate-200 flex gap-3 shrink-0">
                  <button type="button" onClick={() => { setDeviceContactList(null); setDeviceContactSelected(new Set()); setDeviceContactSearch(''); }} className="flex-1 min-h-[48px] py-2.5 text-slate-600 text-sm font-medium rounded-xl border border-slate-200">Annuler</button>
                  <button type="button" onClick={confirmDeviceSelection} disabled={deviceContactSelected.size === 0} className="flex-1 min-h-[48px] py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">
                    Valider ({deviceContactSelected.size})
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-5 sm:p-6 border-b border-slate-200 shrink-0">
                  <h2 className="text-xl font-bold text-slate-900">Ajouter des invités</h2>
                  <p className="text-sm text-slate-500 mt-1">Importez depuis un fichier, depuis les contacts de l’appareil (si disponible) ou ajoutez à la main.</p>
                  {importedContacts.length === 0 ? (
                    <div className="mt-5 space-y-4">
                      <input ref={importFileInputRef} type="file" accept=".vcf,.csv,.txt,text/vcard,text/csv,text/plain" className="hidden" onChange={handleImportFile} />
                      <button
                        type="button"
                        onClick={() => importFileInputRef.current?.click()}
                        className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        Importer depuis un fichier (CSV ou vCard)
                      </button>
                      <p className="text-xs text-slate-500">Colonnes : Prénom, Nom, Email, Téléphone, Adresse. Optionnel : Accompagnants.</p>

                      {importSources.fromDevice ? (
                        <button
                          type="button"
                          disabled={loadingNativeContacts}
                          onClick={handleImportFromDevice}
                          className="w-full min-h-[48px] py-3 px-4 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                          {loadingNativeContacts ? 'Chargement…' : 'Depuis mon téléphone'}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        disabled={loadingNativeContacts}
                        onClick={handleImportFromGoogle}
                        className="w-full min-h-[48px] py-3 px-4 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 disabled:opacity-70 flex items-center justify-center gap-2"
                      >
                        {loadingNativeContacts ? 'Chargement…' : 'Importer depuis Google'}
                      </button>

                      {!importSources.fromDevice ? (
                        <div className="rounded-xl bg-slate-100 border border-slate-200 p-3 text-xs text-slate-600">
                          <p className="font-medium text-slate-700">Sur cet appareil</p>
                          <p className="mt-1">L’accès direct au carnet n’est pas disponible (Safari, ordinateur…). Utilisez un fichier, Google ou l’ajout à la main.</p>
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-2 pt-1">
                        <button type="button" onClick={() => { setShowImportGuestsModal(false); setShowGuestModal(true); }} className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">
                          Ajouter un invité à la main
                        </button>
                        <button type="button" onClick={handleShare} className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">
                          Partager l’invitation (lien)
                        </button>
                      </div>

                      <details className="group">
                        <summary className="text-xs font-medium text-indigo-600 cursor-pointer list-none py-1">Comment exporter mes contacts ?</summary>
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-2">
                          <p><strong>Exporter depuis iCloud / iPhone :</strong> App Contacts → Sélectionner → Partager → Fichier .vcf.</p>
                          <p><strong>Exporter depuis Google :</strong> contacts.google.com → Exporter → vCard ou CSV.</p>
                          <p><strong>Excel / Google Sheets :</strong> Fichier → Télécharger → CSV (colonnes Prénom, Nom, Email, Tél).</p>
                          <p><strong>Mac / PC :</strong> Contacts ou Outlook → Exporter en .vcf ou .csv.</p>
                        </div>
                      </details>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-slate-600 mt-1">{importedContacts.length} contact(s) importé(s).</p>
                      {importedContacts.some(c => !isContactComplete(c)) && (
                        <p className="text-xs text-amber-600 mt-1">Complète les champs manquants (nom, prénom, et au moins email ou tél) pour les contacts ci-dessous.</p>
                      )}
                    </>
                  )}
                </div>
                {importedContacts.length > 0 && (
                  <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                      {importedContacts.map((c, i) => (
                        <div key={i} className={`rounded-xl border p-4 space-y-2 ${isContactComplete(c) ? 'border-slate-200 bg-slate-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                            <Input label="Prénom" value={c.firstName} onChange={e => updateImportedContact(i, 'firstName', e.target.value)} />
                            <Input label="Nom" value={c.lastName} onChange={e => updateImportedContact(i, 'lastName', e.target.value)} />
                            <Input label="Email" type="email" value={c.email} onChange={e => updateImportedContact(i, 'email', e.target.value)} className="sm:col-span-2" />
                            <Input label="Téléphone" type="tel" value={c.phone} onChange={e => updateImportedContact(i, 'phone', e.target.value)} className="sm:col-span-2" />
                          </div>
                          {!isContactComplete(c) && <span className="text-xs text-amber-600">À compléter</span>}
                        </div>
                      ))}
                    </div>
                    <div className="p-4 border-t border-slate-200 flex gap-3 shrink-0">
                      <button type="button" onClick={() => { setImportedContacts([]); setShowExportHelp(false); setDeviceContactList(null); setShowImportGuestsModal(false); }} className="flex-1 min-h-[48px] py-2.5 text-slate-600 text-sm font-medium rounded-xl border border-slate-200">Annuler</button>
                      <button type="button" onClick={handleAddAllImportedGuests} className="flex-1 min-h-[48px] py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl">Ajouter tous à la séquence</button>
                    </div>
                  </>
                )}
                {importedContacts.length === 0 && (
                  <div className="p-4 border-t border-slate-200 shrink-0">
                    <button type="button" onClick={() => { setShowExportHelp(false); setDeviceContactList(null); setShowImportGuestsModal(false); }} className="w-full min-h-[48px] py-2.5 text-slate-600 text-sm font-medium rounded-xl border border-slate-200">Fermer</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {showMomentModal && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-gray-900/80 backdrop-blur-xl">
           <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-[3rem] p-6 sm:p-10 space-y-5 sm:space-y-6 shadow-2xl pb-[env(safe-area-inset-bottom)]">
              <h3 className="text-2xl font-black">Nouveau Jalon</h3>
              <div className="space-y-4">
                 <Input label="Heure précise" type="time" value={momentForm.time} onChange={e => setMomentForm({...momentForm, time: e.target.value})} />
                 <Input label="Description" placeholder="Ex: Arrivée du photographe" value={momentForm.label} onChange={e => setMomentForm({...momentForm, label: e.target.value})} />
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setShowMomentModal(false)} className="flex-1 py-4 font-bold text-gray-400 text-[10px] uppercase">Annuler</button>
                 <button onClick={handleAddKeyMoment} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-indigo-100">Confirmer</button>
              </div>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};
