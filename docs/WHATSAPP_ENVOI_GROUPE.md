# Envoi WhatsApp groupé – Guide détaillé

## Deux façons d’envoyer par WhatsApp

1. **Depuis votre numéro WhatsApp** (recommandé, sans configuration)  
   Dans l’app, option **« Depuis votre numéro WhatsApp »** : le message part de **votre** téléphone. Une conversation s’ouvre à la fois ; vous envoyez, puis vous revenez dans l’app pour ouvrir la suivante. **Aucune configuration** n’est nécessaire. Tous les utilisateurs de MyEvent (organisateurs, admin, etc.) peuvent utiliser cette option sans rien configurer — pas besoin de Twilio.

2. **En un clic via l’API (optionnel)**  
   Si l’administrateur du déploiement a configuré Twilio (ce guide), un bouton **« Envoyer à tous en un clic »** apparaît. Un seul clic envoie le message à tous les invités via l’API. En **mode sandbox** Twilio, les destinataires doivent avoir rejoint le sandbox ; pour envoyer à n’importe quel numéro sans ça, il faut un compte WhatsApp Business approuvé par Twilio.

**En résumé** : chaque personne qui utilise l’app peut envoyer depuis son propre WhatsApp sans configuration. Seul l’admin du déploiement peut, s’il le souhaite, configurer Twilio pour activer l’envoi « à tous en un clic ».

---

## Configurer l’envoi « à tous en un clic » (Twilio)

Ce qui suit explique **étape par étape** comment configurer Twilio et Vercel pour que le bouton **« Envoyer à tous en un clic »** soit disponible (envoi groupé sans ouvrir chaque conversation).

---

## Partie 1 : Créer et configurer Twilio

### 1.1 Créer un compte Twilio

1. Va sur **[twilio.com](https://www.twilio.com)**.
2. Clique sur **Sign up** (S’inscrire).
3. Renseigne ton **email**, un **mot de passe**, ton **prénom**, **nom**, et (optionnel) ton **pays**.
4. Twilio peut te demander de **vérifier ton numéro** : entre le code reçu par SMS.
5. Une fois connecté, tu arrives sur le **Console Dashboard** (tableau de bord).

---

### 1.2 Récupérer l’Account SID et l’Auth Token

1. Sur le dashboard Twilio, en haut de la page (ou dans la zone **Account**), tu vois :
   - **Account SID** : une chaîne du type `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (commence par `AC`).
   - **Auth Token** : clique sur **Show** pour l’afficher, puis copie-le (il est secret).
2. **Garde ces deux valeurs** : tu en auras besoin pour Vercel.
3. Ne partage jamais l’Auth Token (comme un mot de passe).

---

### 1.3 Activer WhatsApp (sandbox pour tester)

1. Dans le menu de gauche Twilio, va dans **Messaging** (ou **Explore Products** → **Messaging**).
2. Clique sur **Try it out** → **Send a WhatsApp message** (ou cherche **WhatsApp** dans le menu).
3. Tu arrives sur la page **WhatsApp Sandbox** (sandbox = environnement de test).
4. Tu vois un numéro Twilio (ex. **+1 415 523 8886**) et un **code à rejoindre** (ex. « join \<mot\> »).
5. **Sur ton téléphone** (avec WhatsApp installé) :
   - Ouvre WhatsApp.
   - Envoie un message au numéro indiqué (ex. `+1 415 523 8886`) avec exactement le texte demandé (ex. `join <le-mot-affiché>`).
   - Twilio confirme que ton numéro est « connecté » au sandbox.
6. **Important** : note le **numéro d’envoi** affiché (ex. `+14155238886`, sans espace). On l’utilisera au format **`whatsapp:+14155238886`** (avec le préfixe `whatsapp:`).

**Résumé à garder :**

- **Account SID** : `AC...`
- **Auth Token** : (celui affiché après « Show »)
- **Numéro WhatsApp (FROM)** : `whatsapp:+14155238886` (remplace par ton numéro sandbox si différent)

---

## Partie 2 : Configurer les variables sur Vercel

Tu dois ajouter des **variables d’environnement** pour que la fonction serverless `api/send-whatsapp` puisse appeler Twilio, et que le front sache où appeler cette API.

### 2.1 Où aller sur Vercel

1. Va sur **[vercel.com](https://vercel.com)** et connecte-toi.
2. Ouvre ton **projet** (celui qui héberge MyEvent, ex. `my-event-lilac` ou le nom que tu lui as donné).
3. Clique sur l’onglet **Settings** (Paramètres).
4. Dans le menu de gauche, clique sur **Environment Variables**.

---

### 2.2 Variables pour le backend (fonction `/api/send-whatsapp`)

Ces variables sont lues **uniquement par la fonction serverless** qui envoie les messages via Twilio. Elles ne sont **pas** exposées dans le navigateur.

Pour **chaque** variable ci-dessous :

1. Clique sur **Add New** (ou **Add**).
2. **Name** = le nom exact (sensible à la casse).
3. **Value** = la valeur (colle celle que tu as notée).
4. Coche **Production**, **Preview** et **Development** si tu veux que ça marche partout (sinon au minimum **Production**).
5. Valide avec **Save**.

À créer :

| Name (nom) | Value (valeur) | Où tu la trouves |
|------------|----------------|-------------------|
| `TWILIO_ACCOUNT_SID` | `ACxxxxxxxx...` | Twilio Dashboard, zone Account (Account SID). |
| `TWILIO_AUTH_TOKEN` | Le token affiché après « Show » | Twilio Dashboard, même zone (Auth Token). |
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` | Numéro du sandbox WhatsApp (avec le préfixe `whatsapp:`). Remplace par ton numéro si différent. |

Optionnel (sécurité) :

| Name | Value |
|------|--------|
| `ALLOW_ORIGIN` | `https://ton-domaine.vercel.app` |

Remplace `ton-domaine.vercel.app` par l’URL réelle de ton app (ex. `https://my-event-lilac.vercel.app`). Ça limite qui peut appeler ton API. Si tu ne mets rien, la fonction accepte toutes les origines (`*`).

---

### 2.3 Variable pour le front (build) : `VITE_WHATSAPP_API_URL`

Le **front** (React) doit savoir **quelle URL appeler** quand tu cliques sur « Envoyer par WhatsApp à tous ». Cette URL est celle de **ta** fonction sur Vercel.

1. Toujours dans **Settings** → **Environment Variables** du projet Vercel.
2. **Add New**.
3. **Name** : `VITE_WHATSAPP_API_URL`
4. **Value** : `https://TON-DOMAINE.vercel.app/api/send-whatsapp`

Exemple : si ton site est `https://my-event-lilac.vercel.app`, alors :

- **Value** = `https://my-event-lilac.vercel.app/api/send-whatsapp`

5. **Important** : pour que le front la reçoive, elle doit être disponible **au moment du build**. Coche au minimum **Production** (et éventuellement Preview/Development).
6. **Save**.

**Pourquoi « VITE_ » ?**  
Les variables qui commencent par `VITE_` sont injectées dans le code front au **build**. C’est pour ça qu’il faudra **redéployer** après les avoir ajoutées ou modifiées.

---

## Partie 3 : Redéployer l’app sur Vercel

Les variables sont prises en compte au **déploiement**. Il faut donc déclencher un nouveau build.

### 3.1 Redéploiement

1. Dans ton projet Vercel, va dans l’onglet **Deployments**.
2. Sur le **dernier déploiement**, clique sur les **trois points** (⋮) à droite.
3. Choisis **Redeploy**.
4. Confirme **Redeploy** (tu peux laisser les options par défaut).
5. Attends la fin du build (quelques minutes).

**Alternative** : si tu utilises Git, fais un **commit vide** puis un **push** ; Vercel déclenchera un nouveau déploiement.

### 3.2 Vérifier que la route API existe

1. Une fois le déploiement terminé, ouvre l’URL de ton site (ex. `https://my-event-lilac.vercel.app`).
2. Dans un nouvel onglet, va sur :  
   `https://TON-DOMAINE.vercel.app/api/send-whatsapp`  
   (remplace par ton domaine).
3. Tu ne dois **pas** voir la page d’accueil de l’app, mais soit :
   - une réponse JSON (ex. erreur « Method not allowed » ou « JSON invalide »),  
   - soit une page d’erreur type 405/400.  

Ça confirme que la **route** `/api/send-whatsapp` existe bien. Un vrai envoi ne se fera que depuis le bouton de l’app (POST avec les numéros et le message).

---

## Partie 4 : Tester dans MyEvent

1. Ouvre ton app (l’URL Vercel après redéploiement).
2. Va sur un **événement** → onglet **Documents** (ou une séquence → Documents).
3. Clique sur **Partager aux invités** pour un document.
4. En haut, l’option **« Depuis votre numéro WhatsApp »** permet d’envoyer depuis votre téléphone (sans config). Si Twilio est configuré, tu vois aussi le **bouton vert** : **« Envoyer à tous en un clic (X invités) »**.
5. En cliquant sur ce bouton vert : l’app envoie une requête à `https://TON-DOMAINE.vercel.app/api/send-whatsapp` avec la liste des numéros et le message.
6. Si tout est bien configuré : message **« Envoyé à X contacts »**. Les invités reçoivent le WhatsApp (sandbox : seuls les numéros « join » au sandbox peuvent recevoir).

**Si le bouton vert « Envoyer à tous en un clic » n’apparaît pas** : la variable `VITE_WHATSAPP_API_URL` n’est pas prise en compte au build. Vérifie qu’elle est bien définie dans Vercel (Settings → Environment Variables) et **redéploie** encore une fois. Tu peux en attendant utiliser **« Depuis votre numéro WhatsApp »** pour envoyer à chaque invité depuis ton téléphone.

**Si tu as une erreur (alert ou message)** : ouvre la **console** du navigateur (F12 → Console) et regarde la réponse de l’API (erreur 500, 400, ou message renvoyé par la fonction). Vérifie alors les variables Twilio (SID, Token, `TWILIO_WHATSAPP_FROM`) et que le sandbox WhatsApp est bien activé.

**L’app affiche « Envoyé à X contacts » mais personne ne reçoit** : en **mode sandbox** Twilio, **seuls les numéros qui ont rejoint le sandbox** peuvent recevoir des messages. Chaque invité doit, **une seule fois**, ouvrir WhatsApp et envoyer au numéro Twilio (ex. +1 415 523 8886) le message exact affiché dans la console Twilio, par ex. `join super-code`. Une fois « connecté » au sandbox, il recevra les messages envoyés depuis l’app. Pour envoyer à n’importe quel numéro sans cette étape, il faut passer sur un compte WhatsApp Business approuvé par Twilio (hors sandbox).

---

## Dépannage

### « Erreur d’API » ou message d’erreur à l’envoi

1. **Ouvre la console** du navigateur (F12 → onglet Console). Après avoir cliqué sur « Envoyer par WhatsApp à tous », un message `[WhatsApp API]` s’affiche avec le détail de l’erreur.
2. **Si tu vois** « L’URL WhatsApp renvoie une page web au lieu de l’API » : l’app reçoit du HTML (souvent la page d’accueil) au lieu de JSON. Vérifie que :
   - `VITE_WHATSAPP_API_URL` = `https://TON-DOMAINE.vercel.app/api/send-whatsapp` (sans faute, avec `/api/send-whatsapp`).
   - Le fichier `vercel.json` contient bien le rewrite qui exclut `/api/` du fallback SPA (voir ci‑dessous).
   - Tu as **redéployé** après avoir modifié les variables ou `vercel.json`.
3. **Si tu vois** « Twilio non configuré » : ajoute sur Vercel les variables `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` et redéploie.
4. **Si tu vois** une erreur réseau (CORS, timeout, etc.) : vérifie que tu ouvres l’app depuis le **même domaine** que celui configuré (ou que `ALLOW_ORIGIN` inclut ton domaine).
5. **Erreur 405 (Method not allowed)** : le serveur reçoit une requête en GET au lieu de POST. Souvent à cause d’une **redirection** (l’URL avec un slash final ou en `http://` est redirigée, et le navigateur transforme le POST en GET). **À faire** :
   - Sur Vercel, définis `VITE_WHATSAPP_API_URL` **exactement** ainsi : `https://ton-domaine.vercel.app/api/send-whatsapp` (en **HTTPS**, **sans slash** à la fin).
   - Redéploie, puis refais un build de l’app (y compris mobile : `npm run build` puis `npx cap sync ios` et relance depuis Xcode).

### L’app sur téléphone ne montre pas les changements

L’app mobile (Capacitor) charge le **build** copié dans le projet iOS. Pour voir les derniers changements (dont le bouton WhatsApp) :

1. Sur ton ordi : `npm run build` puis `npx cap sync ios`.
2. Ouvre le projet iOS dans Xcode : `npx cap open ios` (ou ouvre `ios/App/App.xcworkspace`).
3. Lance l’app sur ton téléphone (Run).
4. Si rien ne change : **supprime l’app** du téléphone, puis relance depuis Xcode pour une réinstallation propre.

---

## Récapitulatif

| Étape | Où | Quoi |
|-------|-----|-----|
| 1 | Twilio | Compte + WhatsApp Sandbox activé + numéro d’envoi noté |
| 2 | Twilio | Account SID et Auth Token copiés |
| 3 | Vercel → Settings → Environment Variables | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` |
| 4 | Vercel → Settings → Environment Variables | `VITE_WHATSAPP_API_URL` = `https://ton-domaine.vercel.app/api/send-whatsapp` |
| 5 | Vercel → Deployments | Redeploy du projet |
| 6 | MyEvent | Ouvrir Documents → Partager aux invités → « Envoyer par WhatsApp à tous » |

Après ça, **un clic** envoie bien le document par WhatsApp à **tous** les invités qui ont un numéro, sans ressélection.
