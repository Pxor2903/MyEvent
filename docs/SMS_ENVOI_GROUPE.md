# Envoi SMS groupé en un clic

Un seul clic envoie le même message (texte + lien du document) par **SMS** à **tous** les invités ayant un numéro, sans confirmation manuelle. Utilise l’API Twilio (même compte que pour WhatsApp si tu en as un).

## Prérequis

- Un **compte Twilio** ([twilio.com](https://www.twilio.com))
- Un **numéro Twilio** capable d’envoyer des SMS (fourni en trial, ou acheté après upgrade)

## 1. Créer un compte Twilio et récupérer un numéro

1. Inscris-toi sur [twilio.com](https://www.twilio.com).
2. Note ton **Account SID** et ton **Auth Token** (dashboard).
3. Pour envoyer des SMS, il faut un **numéro d’envoi** :
   - **Compte trial** : Twilio te donne un numéro de test ; tu ne peux envoyer qu’aux numéros que tu as vérifiés dans la console.
   - **Compte payant** : achète un numéro (Phone Numbers → Buy a number) qui supporte les SMS, ou utilise ton numéro trial.

Note le numéro au format **E.164** (ex. `+33612345678` ou `+14155551234`), sans espace.

## 2. Variables d’environnement sur Vercel

Dans ton projet Vercel → **Settings** → **Environment Variables**, ajoute :

| Name | Value |
|------|--------|
| `TWILIO_ACCOUNT_SID` | Ton Account SID (déjà présent si tu as configuré WhatsApp) |
| `TWILIO_AUTH_TOKEN` | Ton Auth Token |
| `TWILIO_SMS_FROM` | Ton numéro d’envoi SMS au format E.164 (ex. `+33612345678`) |
| `VITE_SMS_API_URL` | `https://ton-domaine.vercel.app/api/send-sms` (sans slash final) |

Coche **Production** (et Preview si besoin), puis **Save**.

## 3. Redéployer

**Deployments** → **Redeploy** du dernier déploiement pour que les variables et la route `/api/send-sms` soient pris en compte.

## 4. Dans MyEvent

1. Va sur un événement → **Documents** → **Partager aux invités** pour un document.
2. Le bouton **« Envoyer par SMS à tous (N invités) »** apparaît si `VITE_SMS_API_URL` est configuré.
3. Un clic envoie le message (texte + lien du document) à tous les numéros. Aucune action manuelle par destinataire.

## Coût

Twilio facture les SMS au forfait (quelques centimes par SMS selon le pays). Vérifie la [grille Twilio](https://www.twilio.com/sms/pricing).

## Dépannage

- **Le bouton n’apparaît pas** : vérifie que `VITE_SMS_API_URL` est bien défini sur Vercel et que tu as **redéployé** après l’avoir ajouté.
- **Erreur 405** : comme pour WhatsApp, utilise une URL en HTTPS et sans slash final.
- **Erreur Twilio** : en trial, tu ne peux envoyer qu’aux numéros vérifiés dans la console Twilio. Passe en compte payant pour envoyer à n’importe quel numéro.
