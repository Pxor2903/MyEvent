# Ce que tu dois faire : exécuter la migration « chat »

Les changements dans le code (profil Google, messagerie mobile, etc.) sont déjà en place.  
Il reste **une seule chose à faire** pour que la nouvelle structure des messages soit active en base : **exécuter la migration SQL** sur ton projet Supabase.

---

## C’est quoi la migration ?

C’est un fichier SQL qui :

- ajoute un **index** pour que les requêtes de messages soient plus rapides ;
- crée une table **`chat_channels`** qui garde pour chaque canal la date et l’aperçu du **dernier message** (comme une liste de conversations) ;
- ajoute un **trigger** : à chaque nouveau message, cette table est mise à jour automatiquement.

Sans exécuter cette migration, l’app continue de fonctionner comme avant, mais ces optimisations ne seront pas actives.

---

## Étapes à suivre

### 1. Ouvre ton projet Supabase

1. Va sur [supabase.com](https://supabase.com) et connecte-toi.
2. Ouvre le projet **MyEvent** (celui que tu utilises pour l’app).

### 2. Ouvre l’éditeur SQL

1. Dans le menu de gauche, clique sur **« SQL Editor »** (ou **Éditeur SQL**).
2. Clique sur **« New query »** (Nouvelle requête).

### 3. Copie le contenu de la migration

1. Sur ton ordinateur, ouvre le fichier du projet :
   **`supabase/migrations/20250218_chat_structure.sql`**
2. Sélectionne **tout** le contenu du fichier (Ctrl+A ou Cmd+A) et copie-le (Ctrl+C ou Cmd+C).

### 4. Colle et exécute dans Supabase

1. Dans l’éditeur SQL de Supabase, colle le code que tu viens de copier (Ctrl+V ou Cmd+V).
2. Clique sur le bouton **« Run »** (ou **Exécuter**), en bas à droite.

### 5. Vérifier le résultat

- Si tout s’est bien passé, tu vois un message du type **« Success »** (Succès) et éventuellement le nombre de lignes affectées.
- En cas d’erreur, Supabase affiche le message en rouge. Dans ce cas, copie le message d’erreur et on pourra le corriger.

Une fois la migration exécutée, tu n’as **rien d’autre à faire** : les prochains messages mettront à jour la table `chat_channels` automatiquement.

---

## Récap en une phrase

**Ouvre Supabase → SQL Editor → New query → colle le contenu de `supabase/migrations/20250218_chat_structure.sql` → Run.**

C’est tout.
