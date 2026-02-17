const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LENGTH = 8;

/** Génère un mot de passe aléatoire pour l’invitation (partage). */
export function generateSharePassword(): string {
  return Array.from({ length: LENGTH }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}
