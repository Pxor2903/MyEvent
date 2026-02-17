import type { ChatMessage } from '@/core/types';
import { supabase } from './client';

const TABLE = 'chat_messages';

type DbRow = {
  id: string;
  event_id: string;
  channel_id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  role: ChatMessage['role'];
  created_at: string;
};

function fromDb(row: DbRow): ChatMessage {
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
}

function toDb(msg: ChatMessage): DbRow {
  return {
    id: msg.id,
    event_id: msg.eventId,
    channel_id: msg.channelId,
    sender_id: msg.senderId,
    sender_name: msg.senderName,
    text: msg.text,
    role: msg.role,
    created_at: msg.timestamp
  };
}

export const messagesApi = {
  async get(eventId: string, channelId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('event_id', eventId)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return (data as DbRow[]).map(fromDb);
  },

  async save(msg: ChatMessage): Promise<void> {
    const payload = toDb(msg);
    const { error } = await supabase.from(TABLE).insert(payload);
    if (error) throw new Error(error.message);
  }
};
