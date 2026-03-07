/**
 * Ouvre la feuille de partage native (Share) pour partager un document.
 * Un clic → partage système → l’utilisateur choisit WhatsApp (ou Mail, etc.) et peut
 * ensuite sélectionner plusieurs conversations (comme quand on partage une photo à plusieurs).
 */
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export async function shareDocumentViaSheet(options: {
  title: string;
  text: string;
  url?: string;
  dialogTitle?: string;
}): Promise<void> {
  const { title, text, url, dialogTitle } = options;
  const fullText = url ? `${text}\n\n${url}` : text;

  if (Capacitor.isNativePlatform()) {
    await Share.share({
      title,
      text: fullText,
      url: url || undefined,
      dialogTitle: dialogTitle ?? title
    });
  } else if (typeof navigator !== 'undefined' && navigator.share) {
    await navigator.share({
      title,
      text: fullText,
      url: url || undefined
    });
  } else {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    await navigator.clipboard.writeText(fullText);
    alert('Lien copié dans le presse-papiers. Collez-le dans WhatsApp ou un message pour le partager.');
  }
}
