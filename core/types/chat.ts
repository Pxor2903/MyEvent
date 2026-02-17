export interface ChatMessage {
  id: string;
  eventId: string;
  channelId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  role: 'owner' | 'organizer' | 'guest';
}
