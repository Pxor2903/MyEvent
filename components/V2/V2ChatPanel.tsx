import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage, User } from '@/core/types';
import { dbService, supabase } from '@/api';

interface V2ChatPanelProps {
  eventId: string;
  channelId: string;
  user: User;
  role: 'owner' | 'organizer';
  canSend: boolean;
}

export const V2ChatPanel: React.FC<V2ChatPanelProps> = ({ eventId, channelId, user, role, canSend }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingNames, setTypingNames] = useState<string[]>([]);

  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const chatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapRealtimeMessage = useCallback((row: any): ChatMessage => {
    return {
      id: row.id,
      eventId: row.event_id,
      channelId: row.channel_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      text: row.text,
      timestamp: row.created_at,
      role: row.role
    };
  }, []);

  const loadMessages = useCallback(async () => {
    const msgs = await dbService.getMessages(eventId, channelId);
    setMessages(msgs);
  }, [eventId, channelId]);

  const mergeMessagesFromServer = useCallback(async () => {
    const msgs = await dbService.getMessages(eventId, channelId);
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      msgs.forEach((m) => byId.set(m.id, m));
      return Array.from(byId.values()).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });
  }, [eventId, channelId]);

  // Realtime + présence typing
  useEffect(() => {
    let isMounted = true;
    let cancelled = false;

    (async () => {
      try {
        await loadMessages();
      } catch {
        // On laisse le chat fonctionner même si le chargement initial échoue.
      }
    })();

    const channelName = `chat:${eventId}:${channelId}`;
    const realtime = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = (payload as any).new as any;
          if (!row || row.channel_id !== channelId) return;
          if (!isMounted) return;
          const incoming = mapRealtimeMessage(row);
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
        }
      )
      .on('presence', { event: 'sync' }, () => {
        if (!isMounted) return;
        const state = realtime.presenceState();
        const presences = (Object.values(state) as Array<Array<{ userId?: string; userName?: string; typing?: boolean }>>).flat();
        const names = [
          ...new Set(
            presences
              .filter((p) => p.typing === true && p.userId !== user.id && p.userName)
              .map((p) => p.userName as string)
          )
        ];
        setTypingNames(names);
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          void mergeMessagesFromServer();
        }
        if (status === 'SUBSCRIBED') {
          if (cancelled) return;
          chatChannelRef.current = realtime;
          realtime.track({
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            typing: false
          });
        }
      });

    return () => {
      cancelled = true;
      isMounted = false;
      chatChannelRef.current = null;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      setTypingNames([]);
      supabase.removeChannel(realtime);
    };
  }, [eventId, channelId, user.id, user.firstName, user.lastName, mapRealtimeMessage, loadMessages, mergeMessagesFromServer]);

  // Auto scroll to bottom
  useEffect(() => {
    const el = chatScrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const reportTyping = useCallback(() => {
    if (!canSend) return;
    const ch = chatChannelRef.current;
    if (!ch) return;

    const payload = {
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      typing: true
    };

    ch.track(payload);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
      chatChannelRef.current?.track({ ...payload, typing: false });
    }, 3000);
  }, [canSend, user.id, user.firstName, user.lastName]);

  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSend) return;

      const text = newMessage.trim();
      if (!text) return;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      chatChannelRef.current?.track({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        typing: false
      });

      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        eventId,
        channelId,
        senderId: user.id,
        senderName: `${user.firstName} ${user.lastName}`,
        text,
        timestamp: new Date().toISOString(),
        role
      };

      setNewMessage('');
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));

      try {
        await dbService.saveMessage(msg);
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        setNewMessage(text);
      }
    },
    [canSend, newMessage, user.id, user.firstName, user.lastName, eventId, channelId, role]
  );

  const typingText = useMemo(() => {
    if (typingNames.length === 0) return null;
    if (typingNames.length === 1) return `${typingNames[0]} écrit…`;
    if (typingNames.length === 2) return `${typingNames[0]} et ${typingNames[1]} écrivent…`;
    return `${typingNames[0]} et ${typingNames.length - 1} autre(s) écrivent…`;
  }, [typingNames]);

  return (
    <section className="flex flex-col h-full min-h-0 rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Messagerie</h3>
          <p className="text-xs text-slate-500 mt-1 truncate">{channelId === 'global' ? 'Global' : 'Séquence'}</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${canSend ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
          {canSend ? 'Accès' : 'Lecture seule'}
        </span>
      </div>

      {typingText && (
        <div className="px-5 py-3 border-b border-slate-100 bg-teal-50/70 text-teal-800 text-sm font-semibold">
          {typingText}
        </div>
      )}

      <div
        ref={chatScrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-4 bg-white"
      >
        {messages.length === 0 ? (
          <div className="text-sm text-slate-500 py-10 text-center">
            Aucun message pour le moment.
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm break-words border ${
                  m.senderId === user.id
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-slate-50 text-slate-800 border-slate-100'
                }`}
              >
                <div className="text-[11px] font-black uppercase tracking-widest opacity-80 mb-1">
                  {m.senderName}
                </div>
                <div className="text-sm whitespace-pre-wrap">{m.text}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-slate-50 flex gap-2 items-end">
        <textarea
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            reportTyping();
          }}
          placeholder={canSend ? 'Écrire un message…' : 'Accès restreint'}
          disabled={!canSend}
          className="flex-1 min-h-[46px] max-h-[120px] resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-white outline-none focus:border-teal-400 disabled:opacity-60 disabled:cursor-not-allowed"
          rows={1}
        />
        <button
          type="submit"
          disabled={!canSend}
          className="min-w-[46px] h-[46px] rounded-2xl bg-teal-600 text-white font-black shadow-lg shadow-teal-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="Envoyer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9-7-9-7-9 7 9 7z" />
          </svg>
        </button>
      </form>
    </section>
  );
};

