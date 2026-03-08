# Envoi SMS groupé en un clic – Guide détaillé

Un seul clic envoie le même message (texte + lien du document) par **SMS** à **tous** les invités ayant un numéro. Aucun WhatsApp Business ni vérification d’entreprise : juste Twilio.

---

## Résumé en 4 étapes

1. **Twilio** : récupérer (ou acheter) un numéro qui envoie des SMS, et noter Account SID + Auth Token.
2. **Vercel** : ajouter 4 variables d’environnement.
3. **Vercel** : redéployer le projet.
4. **MyEvent** : tester « Envoyer par SMS à tous ».

---

## Étape 1 : Twilio – numéro d’envoi SMS

Tu as déjà un compte Twilio (utilisé pour WhatsApp). Il te faut un **numéro Twilio** qui peut envoyer des SMS.

### 1.1 Te connecter à Twilio

1. Va sur **[console.twilio.com](https://console.twilio.com)** et connecte-toi.
2. Sur le **Dashboard**, note (ou vérifie) :
   - **Account SID** (commence par `AC...`)
   - **Auth Token** (clique sur **Show** pour l’afficher, puis copie-le)

### 1.2 Vérifier si tu as déjà un numéro (compte trial)

1. Dans le menu de gauche, clique sur **Phone Numbers** → **Manage** → **Active numbers** (ou **Numéros actifs**).
2. Si tu vois **au moins un numéro** :
   - Clique dessus.
   - Vérifie qu’il a la capacité **SMS** (ou **Voice and SMS**). Si oui, note ce numéro au format **E.164** : `+1XXXXXXXXXX` ou `+33XXXXXXXXX` (sans espace). C’est la valeur pour `TWILIO_SMS_FROM`.
3. Si tu n’as **aucun numéro** : passe à l’étape 1.3.

### 1.3 Acheter un numéro (si tu n’en as pas)

1. Menu de gauche → **Phone Numbers** → **Manage** → **Buy a number** (ou **Buy**).
2. Coche **SMS** (et **Voice** si tu veux).
3. **Pays** : pour éviter les exigences réglementaires lourdes (ex. France qui demande un « Regulatory Bundle » avec SIRET, etc.), choisis par ex. **United States** (+1). Les SMS partent quand même vers des numéros français (+33) ; seul le **numéro d’envoi** (affiché chez le destinataire) sera +1.
4. Clique sur **Search**. Choisis un numéro dans la liste puis **Buy**.
5. Note le numéro au format **E.164** (ex. `+14155551234`), **sans espace**. Ce sera `TWILIO_SMS_FROM`.

**Si tu choisis un numéro français (+33)** : Twilio affiche « Comply with Regulatory Requirements » et demande d’assigner un **FRANCE NATIONAL BUSINESS Regulatory Bundle**. Sans société créée, tu n’as en général pas les pièces. Dans ce cas, annule (**Back**) et achète plutôt un numéro **US** (ou un autre pays sans bundle obligatoire) pour tester.

**Numéro US et mention « A2P 10DLC required »** : cette règle s’applique uniquement à l’envoi **vers des numéros aux États‑Unis**. Envoyer **vers la France** (ou d’autres pays) depuis un numéro US Twilio fonctionne sans enregistrement 10DLC. Tu peux acheter le numéro et l’utiliser pour envoyer à tes invités en +33.

**Compte trial** : en mode trial, Twilio peut te donner un numéro de test ; tu ne pourras envoyer des SMS **qu’aux numéros que tu as ajoutés** dans la section « Verified Caller IDs ». Pour envoyer à n’importe quel numéro (tes invités), il faut **upgrader** le compte (compte payant). Tu peux quand même tester en ajoutant ton propre numéro (et celui de proches) en « Verified Caller IDs ».

### 1.4 (Optionnel) Vérifier des numéros en trial

Si ton compte est en **trial** et que tu veux tester sans upgrader tout de suite :

1. Twilio Console → **Phone Numbers** → **Manage** → **Verified Caller IDs** (ou **Try it out** → **Verify your phone number**).
2. Ajoute les numéros qui recevront les SMS de test (ton numéro, celui d’un invité de test). Tu recevras un code à saisir pour chaque numéro.

---

## Étape 2 : Vercel – variables d’environnement

1. Va sur **[vercel.com](https://vercel.com)** → connecte-toi → ouvre ton **projet** (celui qui héberge MyEvent, ex. `my-event-lilac`).
2. Clique sur l’onglet **Settings** (Paramètres).
3. Dans le menu de gauche, clique sur **Environment Variables**.

Ajoute ou vérifie **chaque** variable ci-dessous. Pour chacune :
- Clique sur **Add New** (ou **Edit** si elle existe déjà).
- **Name** = le nom exact (sensible à la casse).
- **Value** = la valeur (colle sans espace en trop).
- Coche **Production** (et **Preview** si tu testes en preview). Coche **Development** seulement si tu veux tester en local.
- Clique sur **Save**.

| Name (nom exact) | Value (exemple) | Où la trouver |
|------------------|-----------------|----------------|
| `TWILIO_ACCOUNT_SID` | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Twilio Dashboard, en haut (Account SID). Tu l’as déjà si WhatsApp était configuré. |
| `TWILIO_AUTH_TOKEN` | La chaîne secrète affichée après « Show » | Twilio Dashboard, même zone (Auth Token). Déjà là si WhatsApp était configuré. |
| `TWILIO_SMS_FROM` | `+14155551234` ou `+33612345678` | Le numéro Twilio de l’étape 1 (E.164, **sans espace**, avec le `+`). |
| `VITE_SMS_API_URL` | `https://my-event-lilac.vercel.app/api/send-sms` | Remplace `my-event-lilac.vercel.app` par **ton** domaine Vercel. **HTTPS**, **sans slash à la fin**. |

**Important pour `VITE_SMS_API_URL`** :  
- Utilise bien **ton** URL de déploiement (ex. `https://mon-projet.vercel.app/api/send-sms`).  
- Pas de slash final : `https://.../api/send-sms` et non `https://.../api/send-sms/`.

---

## Étape 3 : Redéployer sur Vercel

Les variables sont prises en compte **au build**. Il faut déclencher un nouveau déploiement.

1. Dans ton projet Vercel, va dans l’onglet **Deployments**.
2. Sur le **dernier déploiement** (en haut de la liste), clique sur les **trois points** (⋮) à droite.
3. Choisis **Redeploy**.
4. Dans la fenêtre, laisse les options par défaut et clique sur **Redeploy**.
5. Attends la fin du build (quelques minutes). Le statut doit passer à **Ready**.

---

## Étape 4 : Tester dans MyEvent

1. Ouvre ton app dans le navigateur (l’URL Vercel, ex. `https://my-event-lilac.vercel.app`).
2. Va sur un **événement** qui a des invités avec un **numéro de téléphone**.
3. Clique sur l’onglet **Documents** (ou la section Documents d’une séquence).
4. Clique sur **Partager aux invités** pour un document (ou sélectionne un document à partager).
5. Dans la modale « Envoyer … aux invités », descends jusqu’à la section **« En un clic via l’API (optionnel) »**.
6. Tu dois voir un bouton **bleu** (ou secondaire) : **« Envoyer par SMS à tous (N invités) »**.
7. Clique dessus. Le message (texte + lien du document) est envoyé par SMS à tous les numéros. Un encadré affiche « Envoyé à X contact(s) » (et éventuellement des échecs avec le détail).

**Si le bouton « Envoyer par SMS à tous » n’apparaît pas** : la variable `VITE_SMS_API_URL` n’est pas prise en compte au build. Vérifie qu’elle est bien enregistrée dans Vercel (Settings → Environment Variables), puis refais un **Redeploy** (Étape 3).

---

## Récap – Checklist

- [ ] Twilio : Account SID et Auth Token notés
- [ ] Twilio : un numéro avec SMS noté au format E.164 (ex. `+14155551234`)
- [ ] Vercel : `TWILIO_ACCOUNT_SID` défini
- [ ] Vercel : `TWILIO_AUTH_TOKEN` défini
- [ ] Vercel : `TWILIO_SMS_FROM` = numéro E.164 sans espace
- [ ] Vercel : `VITE_SMS_API_URL` = `https://TON-DOMAINE.vercel.app/api/send-sms` (sans slash final)
- [ ] Vercel : Redeploy effectué
- [ ] MyEvent : test « Envoyer par SMS à tous » sur un événement avec invités

---

## Coût

Twilio facture les SMS au forfait (quelques centimes par SMS selon le pays). Voir la [grille Twilio](https://www.twilio.com/sms/pricing). En trial, l’envoi est limité aux numéros vérifiés.

---

## Dépannage

| Problème | Solution |
|----------|----------|
| Le bouton « Envoyer par SMS à tous » n’apparaît pas | `VITE_SMS_API_URL` doit être défini et le projet **redéployé** après l’avoir ajouté. |
| Erreur 405 (Method not allowed) | L’URL doit être en **HTTPS** et **sans slash à la fin** (`/api/send-sms` pas `/api/send-sms/`). |
| Erreur « Twilio SMS non configuré » | Vérifie que `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` et `TWILIO_SMS_FROM` sont bien définis sur Vercel. |
| Compte trial : message non envoyé à un numéro | En trial, seuls les numéros ajoutés dans **Verified Caller IDs** peuvent recevoir des SMS. Ajoute le numéro ou upgrade le compte. |
| Message « Unable to create record » (Twilio) | Vérifie que le numéro `TWILIO_SMS_FROM` est bien un numéro Twilio actif et qu’il a la capacité SMS. |
