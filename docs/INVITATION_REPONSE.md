# Réponse des invités à une invitation

Quand un document de **type « Carte d’invitation »** est envoyé aux invités (SMS ou WhatsApp « Envoyer à tous »), chaque invité reçoit un **lien unique** pour répondre. En cliquant sur le lien, il peut confirmer sa présence et indiquer le nombre de personnes. La base est mise à jour automatiquement.

---

## Exécuter la migration Supabase (étape par étape)

Pour activer les tables **invitation_links** et **invitation_responses**, il faut exécuter la migration SQL dans ton projet Supabase.

### 1. Ouvre ton projet Supabase

1. Va sur **[supabase.com](https://supabase.com)** et connecte-toi.
2. Clique sur ton **projet** (celui utilisé par MyEvent).

### 2. Ouvre l’éditeur SQL

1. Dans le **menu de gauche**, clique sur **SQL Editor** (ou **Éditeur SQL**).
2. Clique sur **New query** (ou **Nouvelle requête**) pour créer une requête vide.

### 3. Copier le SQL de la migration

1. Sur ton ordinateur, ouvre le fichier :  
   **`supabase/migrations/20250628_invitation_links_and_responses.sql`** (dans le projet MyEvent).
2. Ouvre-le avec un éditeur de texte (Cursor, VS Code, Bloc-notes, etc.).
3. **Sélectionne tout** le contenu du fichier (Ctrl+A / Cmd+A) puis **copie** (Ctrl+C / Cmd+C).

### 4. Coller et exécuter dans Supabase

1. Dans l’éditeur SQL de Supabase, **colle** tout le SQL que tu viens de copier (Ctrl+V / Cmd+V).
2. En bas à droite, clique sur **Run** (ou **Exécuter**), ou utilise le raccourci **Ctrl+Entrée** (Windows/Linux) / **Cmd+Entrée** (Mac).

### 5. Vérifier le résultat

- Si tout s’est bien passé : un message du type **Success. No rows returned** (ou équivalent) s’affiche en bas.
- Si une erreur s’affiche : vérifie que tu es bien sur le **bon projet** Supabase (celui qui contient déjà la table **events**). Si la table **events** n’existe pas encore, exécute d’abord les migrations de base du projet (voir `supabase/schema.sql` ou tes autres migrations).

Une fois la migration exécutée, les tables **invitation_links** et **invitation_responses** existent et les politiques RLS sont actives. Tu peux passer à la configuration des variables sur Vercel (voir plus bas).

---

## Flux

1. **Organisateur** : Dans l’onglet Documents, il sélectionne un document dont la catégorie est **Carte d’invitation** (type `invitation`). Il clique sur « Envoyer à tous » (SMS ou WhatsApp).
2. **Envoi** : Chaque invité reçoit le message + le lien du document + **un lien personnel** du type `https://votre-app.vercel.app/repondre?token=xxx`.
3. **Invité** : Il ouvre le lien (sans se connecter), voit le nom de l’événement et un formulaire : **Je viens / Je ne peux pas**, **Nombre de personnes**, **Message optionnel**. Il envoie sa réponse.
4. **Mise à jour** : Le statut de l’invité dans l’événement passe à **Confirmé** ou **Décliné**, le **nombre de personnes** est enregistré, et une ligne est ajoutée dans le tableau **invitation_responses** (historique des réponses).

## Base de données

- **invitation_links** : un token par invité et par événement (lien unique). Créé au premier envoi d’invitation pour cet invité.
- **invitation_responses** : une ligne par invité ayant répondu (confirmed, guest_count, message, responded_at). La colonne **guests** de l’événement est aussi mise à jour (status, guestCount).

## APIs (Vercel)

- **GET /api/invitation?token=xxx** (public) : retourne les infos pour afficher le formulaire (titre événement, nom invité).  
  Variables : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

- **POST /api/invitation-respond** (public) : body `{ token, confirmed, guestCount?, message? }`. Met à jour l’invité dans `events.guests` et enregistre dans `invitation_responses`.  
  Mêmes variables.

## Configuration Vercel (étape par étape)

Les APIs **invitation** et **invitation-respond** ont besoin de deux variables d’environnement sur Vercel. Voici comment les récupérer et les configurer.

### 1. Récupérer l’URL et la clé dans Supabase

1. Va sur **[supabase.com](https://supabase.com)** → ouvre ton **projet** MyEvent.
2. Dans le menu de gauche, clique sur l’icône **engrenage** en bas → **Project Settings** (Paramètres du projet).
3. Dans le sous-menu de gauche, clique sur **API**.
4. Tu verras :
   - **Project URL** : c’est ta **SUPABASE_URL** (ex. `https://abcdefgh.supabase.co`). Copie-la.
   - **Project API keys** : deux clés sont affichées.
     - **anon** (public) : ne pas utiliser pour les APIs invitation.
     - **service_role** : c’est ta **SUPABASE_SERVICE_ROLE_KEY**. Clique sur **Reveal** puis copie la clé (elle est secrète, ne la partage jamais et ne la mets pas dans le code front).

### 2. Ajouter les variables sur Vercel

1. Va sur **[vercel.com](https://vercel.com)** → connecte-toi → ouvre le **projet** MyEvent (celui déployé pour cette app).
2. Onglet **Settings** (Paramètres) du projet.
3. Dans le menu de gauche : **Environment Variables**.
4. Ajoute deux variables :

   | Name | Value | Environnements |
   |------|--------|----------------|
   | `SUPABASE_URL` | Colle l’URL copiée (ex. `https://xxx.supabase.co`) | Coche **Production**, **Preview**, **Development** (ou au minimum Production) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Colle la clé **service_role** copiée | Idem |

   Pour chaque variable : clique sur **Add**, saisis le **Name** et la **Value**, coche les environnements, puis **Save**.

### 3. Redéployer

Les variables ne sont prises en compte qu’au prochain déploiement.

1. Onglet **Deployments** du projet Vercel.
2. Sur le dernier déploiement, clique sur les **trois points** (⋯) → **Redeploy** (ou déclenche un nouveau déploiement en poussant un commit sur Git).

Après le redéploiement, les liens d’invitation (`/api/invitation?token=...` et `/api/invitation-respond`) fonctionneront avec ta base Supabase.

---

**Résumé des variables**

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | URL du projet Supabase (Project URL dans Supabase → Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé **service_role** (Project API keys → service_role), pas la clé anon |

La clé **service_role** permet à l’API de lire et mettre à jour les événements et les tables invitation sans authentification utilisateur (nécessaire pour la page publique « Répondre à l’invitation »).

## Dépannage : « Je ne reçois pas le lien de réponse »

- **Le document doit être de type « Carte d’invitation »** : à l’ajout du document, choisir **Carte d’invitation** dans la liste (type `invitation` en base). Seuls ces documents déclenchent l’ajout du lien « Répondre à l’invitation » dans le SMS/WhatsApp.
- **Migration exécutée** : les tables `invitation_links` et `invitation_responses` doivent exister (voir section « Exécuter la migration Supabase »). Sinon, un message d’erreur s’affiche au clic sur « Envoyer à tous ».
- **Droits organisateur** : tu dois être connecté comme **créateur** ou **organisateur confirmé** de l’événement. Sinon la création des liens est refusée (RLS) et une alerte s’affiche.
- Si une alerte apparaît au moment de l’envoi, lire le message : il indique soit un problème de migration, soit un problème de droits.

## Voir les réponses

Les réponses sont visibles côté organisateur : le **statut** et le **nombre de personnes** de chaque invité sont mis à jour dans l’onglet Invités. La colonne **Présents** (par séquence) est directement liée à la réponse : **Décliné** → 0, **Confirmé** → nombre de personnes indiqué (ex. « vient à 2 » → 2), comme dans la fiche détail de l’invité. Le tableau **invitation_responses** peut être interrogé (Supabase SQL ou une future vue « Réponses reçues ») pour l’historique et les messages libres.
