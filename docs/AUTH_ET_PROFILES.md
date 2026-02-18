# Lien entre « Users » (Auth) et la table `profiles`

## Les deux endroits où apparaissent les utilisateurs

1. **Authentication → Users** (dans Supabase)  
   C’est la table **`auth.users`**. Un nouvel utilisateur y est créé dès qu’il :
   - s’inscrit (email / mot de passe),
   - ou se connecte avec Google (ou un autre fournisseur).

2. **Table `public.profiles`**  
   C’est **ta** table métier : prénom, nom, email, avatar, etc. Elle est utilisée par l’app (événements, équipe, messagerie).  
   Chaque ligne de `profiles` correspond à un utilisateur : **`profiles.id` = `auth.users.id`**.

Sans ligne dans `profiles`, l’app peut quand même avoir une « session » (grâce à `auth.users`), mais tout ce qui repose sur `profiles` (création d’événements, équipe, etc.) peut poser problème. D’où l’importance de garder **Users** et **profiles** synchronisés.

## Ce qui a été mis en place

### 1. Trigger automatique (recommandé)

Une migration **`20250218_auth_sync_profiles.sql`** :

- Crée une fonction **`handle_new_auth_user()`** qui :
  - s’exécute **à chaque nouvel enregistrement** dans `auth.users`,
  - insère une ligne dans `public.profiles` avec le même `id`, l’email et les infos tirées de `raw_user_meta_data` (prénom, nom, avatar, etc.).
- Crée un **trigger** sur `auth.users` qui appelle cette fonction après chaque `INSERT`.
- Fait un **backfill** : une requête qui insère dans `profiles` les utilisateurs qui sont déjà dans `auth.users` mais pas encore dans `profiles`.

Résultat : dès qu’un utilisateur apparaît dans **Users** (inscription ou connexion Google), une ligne est créée (ou mise à jour) dans **profiles**. L’app continue en plus à faire des upserts côté client si besoin (pour mettre à jour le profil).

### 2. Côté app

Déjà en place :

- À la connexion (email ou Google), l’app appelle `getCurrentUser()` qui lit ou crée le profil en base.
- Avec le trigger, même si cet appel échoue ou arrive un peu tard, le profil aura déjà été créé par le trigger.

## Ce que tu dois faire

1. **Exécuter la migration**  
   Dans Supabase : **SQL Editor** → **New query** → coller le contenu de **`supabase/migrations/20250218_auth_sync_profiles.sql`** → **Run**.

2. **Vérifier**  
   - Va dans **Table Editor** → **profiles** : tu devrais voir une ligne par utilisateur qui existe dans **Authentication → Users** (y compris ceux créés avant la migration, grâce au backfill).

3. **Ensuite**  
   Tout nouveau compte (email ou Google) aura automatiquement une ligne dans **profiles** grâce au trigger.

## En résumé

| Où | Rôle |
|----|------|
| **auth.users** (Users dans Supabase) | Gestion de la connexion (mot de passe, OAuth). |
| **public.profiles** | Données métier de l’app (nom, prénom, etc.). |
| **Lien** | `profiles.id` = `auth.users.id`. |
| **Synchronisation** | Trigger sur `auth.users` qui crée/met à jour `profiles` + backfill pour les anciens comptes. |

Une fois la migration exécutée, les utilisateurs qui se connectent (avec ou sans Google) auront bien une entrée dans **profiles**.
