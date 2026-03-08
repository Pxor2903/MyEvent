# Envoi WhatsApp groupé – Guide détaillé

## Deux façons d’envoyer par WhatsApp

1. **Depuis votre numéro WhatsApp** (recommandé, sans configuration)  
   Dans l’app, option **« Depuis votre numéro WhatsApp »** : le message part de **votre** téléphone. Une conversation s’ouvre à la fois ; vous envoyez, puis vous revenez dans l’app pour ouvrir la suivante. **Aucune configuration** n’est nécessaire. Tous les utilisateurs de MyEvent (organisateurs, admin, etc.) peuvent utiliser cette option sans rien configurer — pas besoin de Twilio.

2. **En un clic via l’API (optionnel)**  
   Si l’administrateur du déploiement a configuré Twilio (ce guide), un bouton **« Envoyer à tous en un clic »** apparaît. Les messages partent d’**un numéro global** (un seul numéro pour toute l’app, configuré une fois). Un seul clic envoie le message à tous les invités via l’API. En **mode sandbox** Twilio, les destinataires doivent avoir rejoint le sandbox ; pour envoyer à n’importe quel numéro sans ça, il faut un compte WhatsApp Business approuvé par Twilio.

**En résumé** : chaque personne qui utilise l’app peut envoyer depuis son propre WhatsApp sans configuration. Seul l’admin du déploiement peut, s’il le souhaite, configurer Twilio pour activer l’envoi « à tous en un clic ».

---

## Pourquoi on ne peut pas envoyer à tout le monde d’un coup depuis son propre numéro ?

**Limitation technique (WhatsApp + OS)** : il n’existe pas de moyen, pour une app ou un site, d’envoyer en **un seul clic** des messages **depuis ton numéro WhatsApp** à une liste de contacts.

- **WhatsApp** ne fournit pas d’API pour envoyer des messages à partir du compte personnel d’un utilisateur. Les APIs (Twilio, etc.) envoient depuis un **numéro professionnel / Business**, pas depuis le téléphone de l’utilisateur.
- **Navigateur et téléphone** : pour des raisons de sécurité et de vie privée, une action utilisateur (un clic) ne peut ouvrir qu’**une seule** fenêtre ou app externe. On ne peut donc pas ouvrir 10 conversations WhatsApp d’un coup depuis une page web ou une app.

**Ce qu’on peut faire** : envoyer **depuis ton numéro**, mais **une conversation à la fois** — tu ouvres la 1re, tu envoies, tu reviens dans l’app, tu ouvres la 2e, etc. C’est l’option **« Depuis votre numéro WhatsApp »** dans MyEvent. Il n’y a pas de contournement technique pour faire « tout le monde en un clic depuis mon numéro ».

**Pour envoyer à tous en un clic** : il faut passer par une API (Twilio) qui envoie depuis un **numéro WhatsApp Business** (pas ton numéro perso). Les destinataires n’ont rien à configurer si tu es en **production** (voir ci‑dessous).

---

## Peut-on lier automatiquement le numéro de chaque utilisateur à Twilio à la connexion ?

**Non : on ne peut pas avoir « chaque utilisateur a son numéro lié à Twilio automatiquement, sans rien faire, juste en se connectant ».**

### Pourquoi ce n’est pas possible

1. **WhatsApp / Twilio = numéros Business uniquement**  
   L’API WhatsApp (via Twilio) ne permet pas d’envoyer des messages **depuis le compte WhatsApp personnel** d’un utilisateur. Elle ne travaille qu’avec des **numéros WhatsApp Business** enregistrés et vérifiés auprès de Meta. Il n’existe pas d’équivalent « OAuth » où l’utilisateur clique sur « Se connecter avec WhatsApp » et l’app envoie ensuite à sa place depuis son numéro perso.

2. **Vérification obligatoire pour chaque numéro d’envoi**  
   Meta exige une **vérification de propriété** pour chaque numéro utilisé comme expéditeur : réception d’un **code OTP** par SMS ou appel vocal, puis validation. Donc même si on voulait « un numéro par utilisateur », chaque utilisateur devrait **au minimum** recevoir un code et le saisir dans l’app. Ce n’est pas « rien à faire », et ce n’est pas déclenché « juste » par la connexion à MyEvent.

3. **Un seul compte Twilio = un (ou quelques) numéros partagés**  
   Aujourd’hui, la config Twilio (Account SID, Auth Token, numéro d’envoi) est définie **une fois** au niveau du déploiement (variables d’environnement Vercel). Tous les utilisateurs de cette instance partagent donc **le même numéro d’envoi**. C’est le modèle prévu pour une app comme MyEvent : un numéro « organisateur / événement » pour les envois groupés.

4. **Multi-tenant « un numéro par utilisateur »**  
   Twilio propose une [Senders API](https://www.twilio.com/docs/whatsapp/register-senders-using-api) pour enregistrer **plusieurs numéros** (plusieurs expéditeurs) sur un même compte. On pourrait en théorie faire : chaque utilisateur **ajoute son numéro** → reçoit un OTP → le saisit → son numéro est enregistré comme expéditeur pour son compte. Mais :
   - Ce numéro doit être un **numéro WhatsApp Business** (vérification Meta), pas un simple WhatsApp perso ;
   - L’utilisateur doit quand même faire **au moins** l’étape OTP (et souvent plus pour un vrai Business) ;
   - Ce n’est donc pas « automatiquement lié à la connexion sans rien faire ».

### En résumé

| Souhait | Réalité |
|--------|---------|
| Chaque utilisateur a son numéro lié à Twilio **automatiquement à la connexion, sans rien faire** | **Impossible** : pas d’API « envoi depuis le compte perso », et chaque numéro d’envoi doit être vérifié (OTP au minimum). |
| Un seul numéro pour toute l’app (config actuelle) | **Possible** : un compte Twilio, un numéro (sandbox ou production), tous les envois « en un clic » partent de ce numéro. |
| Un numéro par utilisateur, avec une étape de vérification (ex. OTP) | **Possible en théorie** (Senders API, flux « ajouter mon numéro » + OTP), mais ce n’est pas « juste par connexion » et le numéro doit être éligible WhatsApp Business. |

Donc aujourd’hui, le modèle réaliste reste : **un numéro partagé** configuré par l’admin (sandbox ou production), **ou** l’option **« Depuis votre numéro WhatsApp »** (une conversation à la fois, sans Twilio).

---

## Configurer l’envoi « à tous en un clic » (Twilio)

**Modèle retenu : un numéro global.** Un seul numéro WhatsApp (Twilio sandbox ou production) est configuré pour toute l’application. Tous les utilisateurs de l’app utilisent ce même numéro pour les envois « à tous en un clic ». Aucune configuration par utilisateur : seul l’admin du déploiement configure Twilio une fois.

Ce qui suit explique **étape par étape** comment configurer ce numéro global sur Twilio et Vercel pour que le bouton **« Envoyer à tous en un clic »** soit disponible (envoi groupé sans ouvrir chaque conversation).

---

## Tu n’as pas encore créé / vérifié ton entreprise ? (pas d’impasse)

Si tu es en train de **développer** l’app et que tu **ne veux pas** lancer la vérification Meta (ou créer ton entreprise) tout de suite, tu peux quand même **tester l’envoi « à tous en un clic »** avec le **sandbox WhatsApp Twilio**. Aucun compte Meta ni vérification d’entreprise nécessaires.

**À faire :**

1. **Twilio** → **Messaging** → **Try it out** → **Send a WhatsApp message** (ou menu **WhatsApp** → **Sandbox**). Tu vois un **numéro Twilio** (ex. +1 415 523 8886) et un **code à rejoindre** (ex. « join hello-world »).
2. **Sur Vercel** (Settings → Environment Variables) :
   - **`TWILIO_WHATSAPP_FROM`** = **le numéro du sandbox** au format `whatsapp:+14155238886` (remplace par le numéro affiché dans la page Sandbox Twilio, sans espace).
   - **Supprime** la variable **`TWILIO_WHATSAPP_CONTENT_SID`** (ou laisse-la vide). Sans Content SID, l’API envoie en mode **texte libre** (Body), ce qui fonctionne en sandbox et ne demande pas de template ni de vérification Meta.
3. **Redéploie** le projet sur Vercel.
4. **Destinataires de test** : chaque personne qui doit recevoir les messages doit **une fois** envoyer sur WhatsApp au numéro du sandbox le message indiqué par Twilio (ex. `join hello-world`). Après ça, elle recevra les messages envoyés depuis MyEvent.

**Résumé** : en dev, utilise le **numéro sandbox** + **pas de CONTENT_SID**. Tu peux finir ton app, tester l’envoi groupé, et plus tard seulement créer/vérifier ton entreprise Meta et passer en production (numéro perso + template + `TWILIO_WHATSAPP_CONTENT_SID`).

**Alternative sans WhatsApp du tout** : en attendant d’ouvrir ta société, tu peux utiliser **uniquement l’envoi par SMS** (« Envoyer par SMS à tous »). Aucun compte Meta ni WhatsApp Business nécessaire — juste Twilio (même compte) avec un numéro SMS. Voir `docs/SMS_ENVOI_GROUPE.md`.

---

## Par où commencer (tu as déjà ton compte Meta)

Tu as ton **compte Meta professionnel** : tu peux choisir l’une de ces deux voies.

**Option A – Démarrer en sandbox (le plus rapide pour tester)**  
1. Crée un **compte Twilio** (Partie 1.1).  
2. Active le **sandbox WhatsApp** dans Twilio (Partie 1.4) et note le numéro d’envoi.  
3. Configure les **variables sur Vercel** (Partie 2) — **sans** `TWILIO_WHATSAPP_CONTENT_SID` — et redéploie.  
4. Teste dans MyEvent : le bouton « Envoyer à tous en un clic » apparaît. Les destinataires devront envoyer « join &lt;code&gt; » au numéro Twilio pour recevoir (limitation du sandbox).  
→ Tu n’utilises pas encore ton compte Meta ; c’est pour valider que tout fonctionne.

**Option B – Passer directement en production (avec ton compte Meta)**  
→ Suis le guide **« Passer en production directement »** ci‑dessous. Les invités reçoivent sans rien faire.

**Conseil** : si tu hésites, commence par l’**option A** (sandbox) pour vérifier Twilio + Vercel en quelques minutes, puis passe au guide production.

---

## Passer en production directement (guide pas à pas)

Tu as déjà ton **compte Meta professionnel**. Voici les étapes dans l’ordre.

### Étape 1 : Compte Twilio et upgrade

1. Va sur **[twilio.com](https://www.twilio.com)** et crée un compte (ou connecte-toi).
2. **Upgrade** le compte (compte payant) : dans la console Twilio, clique sur **Upgrade** en haut, ou **Admin** → **Account** → **Upgrade account**. Un compte payant est requis pour enregistrer un expéditeur WhatsApp en production.
3. Note ton **Account SID** et ton **Auth Token** (dashboard, zone Account).

### Étape 2 : Enregistrer ton numéro WhatsApp (lier Meta + Twilio)

1. Dans Twilio : **Messaging** (menu gauche) → **Senders** → **WhatsApp Senders** (ou [console.twilio.com → WhatsApp Senders](https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders)).
2. Clique sur **Create new sender**.
3. Choisis un **numéro** : Twilio ou ton propre numéro (non-Twilio). Ce numéro ne doit pas être déjà utilisé sur WhatsApp perso ; il doit pouvoir recevoir un **SMS ou un appel** pour le code de vérification.
4. Clique sur **Continue with Facebook**. Une fenêtre pop-up s’ouvre.
5. **Connecte-toi avec Facebook** (ton compte lié à ton Meta Business).
6. **Crée un nouveau Meta Business Portfolio** ou sélectionne celui que tu viens de créer.
7. **Crée un nouveau WhatsApp Business Account (WABA)** ou sélectionne-en un existant.
8. Renseigne le **profil WhatsApp Business** (nom affiché, catégorie, etc.).
9. **Ajoute et vérifie ton numéro** : entre le numéro, choisis **SMS** ou **appel** pour recevoir le code OTP, saisis le code. Une fois validé, le numéro est enregistré comme expéditeur.
10. Valide les accords et ferme la pop-up. Twilio affiche ton expéditeur WhatsApp (statut **Online** quand tout est ok).
11. Note le **numéro d’envoi** au format **`whatsapp:+33...`** (avec l’indicatif pays, sans espace). C’est la valeur pour `TWILIO_WHATSAPP_FROM`.

Si Meta demande la **vérification d’entreprise** (Business Verification), suis les instructions ; elle peut être nécessaire pour passer en production ou augmenter les limites.

### Étape 3 : Créer un template de message (Content Template Builder)

En production, WhatsApp n’accepte que des **messages basés sur un template approuvé**.

**Tu veux envoyer du texte + un document en pièce jointe ?**  
→ Il faut choisir **Media** (pas Text), puis configurer le document et le texte avec deux variables.

1. Dans Twilio : **Messaging** → **Content** → **Content Template Builder** (ou [Content](https://console.twilio.com/us1/develop/content)).
2. **Create new** (nouveau template).
3. **Template Name** : ex. `document_invitation` (minuscules, chiffres et `_` uniquement).
4. **Template Language** : ex. French.
5. **Content Type** :  
   - Si tu veux **texte + document en pièce jointe** : choisis **Media** (pas Text).  
   - Si tu veux **seulement du texte** (avec le lien du document dans le message) : choisis **Text**.
6. Clique sur **Create**.

**Si tu as choisi Media (texte + document) :**

7. Dans l’écran suivant, Twilio te demande de configurer le média :
   - **Type de média** : Document (ou équivalent pour fichier PDF, etc.).
   - **URL du document** : mets la variable **`{{2}}`** (l’app enverra l’URL du document dans cette variable).
   - **Corps du message / caption** : mets le texte avec **`{{1}}`**, par ex. `Bonjour, {{1}}` ou `Bonjour, voici un document pour votre événement. {{1}}` (l’app envoie le message personnalisé dans `{{1}}`).
8. Twilio peut demander une **URL d’exemple** pour la variable média (pour la validation Meta) : mets une URL publique vers un PDF de test, ex. `https://example.com/doc.pdf`.
9. Enregistre et **soumis à approbation**. Une fois approuvé, récupère le **Content SID** (commence par `HX...`) pour `TWILIO_WHATSAPP_CONTENT_SID`.

**Si tu as choisi Text (message avec lien uniquement) :**

7. Dans le corps du message : `Bonjour, voici un document pour votre événement : {{1}}`. L’app envoie le message complet (texte + lien) dans `{{1}}`.
8. Enregistre, soumis à approbation, puis copie le **Content SID** (`HX...`).

Dans les deux cas, une fois le template approuvé, utilise son **Content SID** dans la variable Vercel `TWILIO_WHATSAPP_CONTENT_SID`.

### Étape 4 : Variables d’environnement sur Vercel

Dans ton projet Vercel → **Settings** → **Environment Variables**, ajoute (ou modifie) :

| Name | Value |
|------|--------|
| `TWILIO_ACCOUNT_SID` | Ton Account SID Twilio |
| `TWILIO_AUTH_TOKEN` | Ton Auth Token Twilio |
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+33xxxxxxxxx` (ton numéro production, sans espace) |
| `TWILIO_WHATSAPP_CONTENT_SID` | `HXxxxxxxxx...` (Content SID du template, ex. HX...) |
| `VITE_WHATSAPP_API_URL` | `https://ton-domaine.vercel.app/api/send-whatsapp` (sans slash final) |

Coche **Production** (et Preview si tu veux) puis **Save**.

### Étape 5 : Redéployer

1. **Deployments** → sur le dernier déploiement → **⋮** → **Redeploy**.
2. Attends la fin du build.

### Étape 6 : Tester dans MyEvent

1. Ouvre ton app (URL Vercel).
2. Va sur un événement → **Documents** → **Partager aux invités** pour un document.
3. Clique sur **« Envoyer à tous en un clic »**. Les invités reçoivent le message (texte + lien) sur leur WhatsApp **sans avoir rien à faire** (pas de « join »).

**Résumé production** : Twilio (payant) + numéro enregistré via « Continue with Facebook » (Meta + WABA) + template avec variable `{{1}}` + `TWILIO_WHATSAPP_CONTENT_SID` sur Vercel + redéploiement.

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

### 1.3 Meta Business ou juste WhatsApp Business ?

- **Mode sandbox (test)**  
  Tu n’as **pas besoin** de compte Meta Business ni de compte WhatsApp Business. Un **compte Twilio** suffit : tu actives le sandbox WhatsApp dans Twilio et tu utilises le numéro fourni par Twilio. C’est ce que décrit la section 1.4 ci‑dessous.

- **Mode production** (envoyer à n’importe quel numéro sans « join »)  
  Là, il faut enregistrer un **numéro** comme expéditeur WhatsApp. Ce numéro est géré via le **WhatsApp Business Platform** (l’API), pas via l’app mobile « WhatsApp Business ». Et ce plateau est géré par **Meta** : le **WhatsApp Business Account (WABA)** se crée et se lie **via Meta Business** (Business Manager / Meta Business Portfolio).  
  Donc en production, **il faut un compte Meta Business** (ou en créer un pendant le processus Twilio « Continue with Facebook »). On ne peut pas faire « seulement » un compte WhatsApp Business sans passer par Meta : le WABA pour l’API est toujours créé ou lié **via** Meta Business.

**En bref** : sandbox = **Twilio seul**. Production = **Twilio + Meta Business** (et WABA créé via Meta).

---

### 1.4 Activer WhatsApp (sandbox pour tester)

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

### 1.5 Envoyer à tout le monde avec Twilio sans que les invités fassent quoi que ce soit

En **mode sandbox** (test), les destinataires doivent envoyer « join &lt;code&gt; » au numéro Twilio pour recevoir les messages — c’est une règle WhatsApp/Twilio pour les tests.

Pour **envoyer à n’importe quel numéro sans que les invités aient quoi que ce soit à faire** (pas de « join », pas de config de leur part), il faut passer en **production** avec le **WhatsApp Business API** :

1. **Compte Meta Business**  
   Crée ou utilise un compte sur [business.facebook.com](https://business.facebook.com). Vérifie ton entreprise si demandé.

2. **WhatsApp Business Account (WABA)**  
   Dans Meta Business Manager, ajoute le produit **WhatsApp** et crée un compte WhatsApp Business. Associe un **numéro de téléphone** dédié (qui ne doit pas être déjà utilisé sur WhatsApp perso).

3. **Vérification du numéro**  
   WhatsApp envoie un code par SMS ou appel sur ce numéro. Une fois vérifié, ce numéro devient ton **numéro d’envoi** professionnel.

4. **Lier Twilio à ton compte WhatsApp Business**  
   Dans la [console Twilio](https://console.twilio.com), section **Messaging** → **WhatsApp** : tu peux connecter ton compte WhatsApp Business (WABA) à Twilio. Suis les étapes Twilio pour l’approbation et la liaison du numéro.

5. **Modèles de message (templates)**  
   En production, WhatsApp n’accepte que des **messages basés sur des modèles approuvés**. Tu dois créer un template dans Meta Business Manager (ex. « Bonjour, voici un document pour votre événement : {{1}}. »), le faire approuver, puis l’utiliser dans l’API Twilio en remplaçant {{1}} par le lien du document.  
   Notre API actuelle envoie du texte libre ; pour la production, il faudrait adapter `api/send-whatsapp.js` pour utiliser un **template approuvé** au lieu de `Body: message`. Voir la [doc Twilio WhatsApp](https://www.twilio.com/docs/whatsapp/api#send-whatsapp-message-with-template).

6. **Variables Vercel**  
   Une fois le numéro production connecté à Twilio, utilise ce numéro dans `TWILIO_WHATSAPP_FROM` (format `whatsapp:+33...`) au lieu du numéro sandbox. Redéploie.

**Résumé** : en **sandbox**, seuls les numéros qui ont rejoint le sandbox reçoivent les messages. En **production** (WhatsApp Business + numéro vérifié + templates approuvés), tu peux envoyer à **tout le monde** sans que les invités aient quoi que ce soit à faire — ils reçoivent directement sur leur WhatsApp, sans configuration de leur part.

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
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` ou `whatsapp:+33...` | Sandbox : numéro Twilio (ex. +14155238886). Production : ton numéro enregistré (ex. +33...). Toujours avec le préfixe `whatsapp:`. |
| `TWILIO_WHATSAPP_CONTENT_SID` | `HXxxxxxxxx...` | **Production uniquement.** Content SID du template (Content Template Builder Twilio), avec une variable `{{1}}` pour le message. Si non défini, l’API envoie en mode sandbox (Body libre). |

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

### Messages « Failed » ou « Undelivered » dans les logs Twilio

L’app affiche « Envoyé à X contacts » mais dans **Twilio** (Monitor → Logs → Messaging) les messages sont en **Failed** ou **Undelivered**. Twilio accepte l’envoi, mais WhatsApp/Meta refuse ou ne livre pas.

**1. Récupérer le code d’erreur exact**

- Dans Twilio : **Monitor** → **Logs** → **Messaging**.
- Clique sur **un message en Failed ou Undelivered** (ou sur **Troubleshoot** à côté du statut).
- Note le **code d’erreur** et le **message** (ex. 63016, 131047, « Media download failed », etc.). C’est indispensable pour cibler la cause.

**2. Vérifier l’URL du document (template avec pièce jointe)**

Si tu envoies **avec un document** (template média avec variable `{{2}}`) :

- Les serveurs **WhatsApp** doivent pouvoir **télécharger** l’URL du document. Si l’URL renvoie 403 (accès refusé) ou n’est pas accessible en HTTPS public, le message échoue.
- **À faire** : le bucket Supabase **event-files** doit être **Public** (voir `docs/STORAGE_BUCKET_DOCUMENTS.md`). En navigation privée, ouvre l’URL du document dans le navigateur : le fichier doit se télécharger sans demande de connexion.
- Si le bucket est privé, soit tu le passes en Public (et tu configures les policies pour que seuls les uploads soient protégés si besoin), soit pour l’envoi WhatsApp « à tous en un clic » il faudrait générer une **URL signée temporaire** et l’utiliser comme `documentUrl` (à mettre en place côté code si tu restes en privé).

**3. Tester sans document**

Pour savoir si le problème vient du **média** ou du **template / destinataires** :

- Dans MyEvent, envoie **sans** sélectionner de document à partager (ou avec un message seul, sans pièce jointe). Si les messages sont livrés dans ce cas, le souci vient très probablement de l’URL du document (accessibilité ou type de fichier).

**4. Template et production**

- Vérifie que le template (ex. « texteinvitation ») est **Approved** dans Meta et que le **Content SID** sur Vercel (`TWILIO_WHATSAPP_CONTENT_SID`) correspond bien à ce template.
- Les numéros doivent être au format **E.164** (ex. `+33612345678`).

**Erreur 63112 (compte désactivé par Meta)**  
« The Meta and/or WhatsApp Business Accounts connected to this Sender were disabled by Meta » — le **numéro d’envoi** ou le **compte WhatsApp Business (WABA)** lié à Twilio a été **désactivé par Meta**, ou la **vérification d’entreprise** est en attente. Ce n’est pas un bug de l’app ni de l’URL du document. À faire :
- Connexion à [Meta Business](https://business.facebook.com/) → section **WhatsApp** : vérifier les alertes et le statut du numéro / WABA.
- **Business verification** : Business Settings → Security Center → suivre la procédure de vérification si elle est en attente.
- Si tu as supprimé puis réenregistré un expéditeur : WhatsApp Manager → ce numéro → Two-step verification → **désactiver** la 2FA avant de réenregistrer.
- Si tu estimes que la désactivation est une erreur : [WhatsApp Business Help Center](https://www.whatsapp.com/business/help) → soumettre un recours (appeal) avec les explications demandées.

Une fois le **code d’erreur** Twilio en main, tu peux le chercher dans la [doc Twilio](https://www.twilio.com/docs/api/errors) ou [WhatsApp Business](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/) pour appliquer la correction adaptée.

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
