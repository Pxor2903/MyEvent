export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export type HomeView =
  | 'dashboard'
  | 'all-upcoming'
  | 'all-past'
  | 'create-event'
  | 'event-detail'
  | 'about'
  | 'contact';
