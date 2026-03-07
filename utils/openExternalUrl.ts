/**
 * Ouvre une URL en dehors de l’app (WhatsApp, email, SMS).
 * Sur téléphone (Capacitor) : utilise le plugin Browser pour que le système ouvre
 * l’app concernée (WhatsApp, Mail, Messages). Sur web : window.open.
 */
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export async function openExternalUrl(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
