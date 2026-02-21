
import type { Event } from '@/core/types';

export const notificationService = {
  async notifyGuestsOfUpdate(event: Event, changeDescription: string): Promise<void> {
    console.log(`[Notification Service] Début de l'envoi pour l'événement : ${event.title}`);
    console.log(`[Description] : ${changeDescription}`);
    
    // Simulation d'un délai d'envoi réseau
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const guestCount = event.guests?.length || 0;
    console.log(`[Statut] Succès : ${guestCount} emails et notifications push envoyés.`);
    
    // Dans une application réelle, on appellerait une API comme Twilio, SendGrid ou Firebase Cloud Messaging
  },

  async notifyGuestsOfNewFile(event: Event, fileName: string, isGlobal: boolean, subEventTitle?: string): Promise<void> {
    const scope = isGlobal ? "l'événement global" : `le segment "${subEventTitle}"`;
    console.log(`[Notification Service] Nouveau document disponible pour ${scope} : ${fileName}`);
    
    await new Promise(resolve => setTimeout(resolve, 800));
  }
};
