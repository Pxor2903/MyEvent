# Créer le bucket Supabase pour les documents (event-files)

L’onglet **Documents** de MyEvent envoie les fichiers (PDF, images) dans un bucket Supabase nommé **`event-files`**. Sans ce bucket, l’upload affiche une erreur du type : *« Le bucket "event-files" n'existe pas »*.

## Étapes dans le dashboard Supabase

1. **Ouvre ton projet** sur [supabase.com](https://supabase.com) → **Dashboard** → ton projet.

2. **Va dans Storage**  
   Menu de gauche → **Storage**.

3. **Créer un nouveau bucket**
   - Clique sur **New bucket**.
   - **Name** : `event-files` (exactement ce nom, l’app le cherche).
   - **Public bucket** : coche **Public**.  
     Les liens de téléchargement des documents seront alors accessibles sans connexion (idéal pour partager par WhatsApp/email). Si tu préfères des liens privés, laisse décoché et il faudra plus tard utiliser des *signed URLs* côté code.
   - **Allowed MIME types** (optionnel) : tu peux restreindre, par ex. `application/pdf`, `image/jpeg`, `image/png`, `image/gif`, `image/webp` pour n’accepter que PDF et images.
   - **File size limit** (optionnel) : ex. `5MB` ou `10MB` pour limiter la taille des fichiers.
   - Valide avec **Create bucket**.

4. **Policies Storage (RLS)**  
   Sans policy, l’upload renvoie *« new row violates row-level security policy »*. Il faut autoriser les opérations sur le bucket. Deux options :

   **Option 1 – Exécuter la migration (recommandé)**  
   Dans le **SQL Editor** du dashboard, exécute la requête du fichier :
   `supabase/migrations/20250128_storage_event_files_policies.sql`  
   (elle crée les policies : upload et suppression pour les utilisateurs connectés, lecture publique).

   **Option 2 – Créer les policies à la main**  
   Dashboard → **Storage** → bucket **event-files** → onglet **Policies** → **New policy** :
   - **Insert** : pour les rôles **authenticated**, condition `bucket_id = 'event-files'`.
   - **Select** : pour **public** (ou **anon** + **authenticated**), condition `bucket_id = 'event-files'`.
   - **Delete** : pour **authenticated**, condition `bucket_id = 'event-files'`.

5. **Vérification**  
   Dans l’app, ouvre un événement → onglet **Documents** → **Ajouter un document** et envoie un petit PDF ou une image. Si le bucket est bien créé et public, le fichier doit s’uploader et le lien doit s’ouvrir.

## Résumé

| Paramètre      | Valeur recommandée                          |
|----------------|---------------------------------------------|
| Nom du bucket  | `event-files`                               |
| Public         | Oui (pour liens partageables)               |
| MIME types     | Optionnel : pdf, jpeg, png, gif, webp       |
| Taille max     | Optionnel : ex. 5 MB ou 10 MB               |

Une fois le bucket créé, l’onglet Documents fonctionne sans changement de code.
