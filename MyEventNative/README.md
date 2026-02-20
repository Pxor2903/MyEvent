# MyEvent — App iOS native (Swift/SwiftUI)

Application iOS 100 % native (Swift/SwiftUI) qui utilise le **même backend Supabase** que l’app web. Toute option ou fonctionnalité ajoutée/modifiée doit être reflétée **à la fois** dans le web et dans cette app pour garder la parité.

## Prérequis

- Xcode 15+ (iOS 17+)
- Compte Supabase (même projet que le web)

## Ouverture du projet

- Ouvre le **dossier** `MyEventNative` (celui qui contient `MyEventNative.xcodeproj`), puis double-clique sur **MyEventNative.xcodeproj**, ou dans Xcode : **Fichier > Ouvrir** et sélectionne le dossier **MyEventNative**.
- Ne pas ouvrir directement le dossier `MyEvent` (racine du repo) comme projet Xcode : le projet est dans `MyEventNative/`.
- **Si Xcode affiche « The project is damaged / parse error »** : utilise **XcodeGen** (voir **CONSOLE.md** : `brew install xcodegen` puis `xcodegen generate`) ou recrée le projet à la main (voir **CREATE_PROJECT.md**).

## Configuration

1. Une fois le projet ouvert dans Xcode.
2. Dans **MyEventNative** > **Info.plist**, remplace :
   - `SUPABASE_URL` : l’URL de ton projet (ex. `https://xxxx.supabase.co`), à copier depuis **Settings → API** dans le dashboard.
   - `SUPABASE_ANON_KEY` : la clé **anon public** (long JWT qui commence par `eyJ...`), dans **Settings → API** → Project API keys → **anon** / **public**. Ne pas utiliser une clé au format « publishable » ou autre.
3. (Optionnel) Renseigne **Signing & Capabilities** avec ton équipe pour lancer sur un appareil.

### En cas d’erreur « A server with the specified hostname could not be found »

- **Vérifier l’URL Supabase** : Ouvre [Supabase Dashboard](https://supabase.com/dashboard) → ton projet → **Settings** → **API**. Copie **Project URL** et colle-la telle quelle dans `Info.plist` (clé `SUPABASE_URL`). Pas d’espace, pas de slash final.
- **Projet en pause** : Les projets gratuits Supabase sont mis en pause après une période d’inactivité. Dans le dashboard, si le projet est « Paused », clique sur **Restore project**.
- **Réseau simulateur** : Vérifie que le simulateur a bien internet (ouvre Safari et charge une page). Redémarre le simulateur si besoin.

### En cas d’erreur « The data couldn't be read because it isn't in the correct format »

- La clé **SUPABASE_ANON_KEY** doit être la clé **anon public** (JWT longue, commence par `eyJ`), pas une clé au format « sb_publishable_... » ou autre. Dans le dashboard Supabase : **Settings** → **API** → **Project API keys** → copier la clé **anon** / **public**.

## Structure du projet

- **Core** : `Config`, modèles (`Event`, `Guest`, `User`, etc.), client Supabase (REST + Auth), Keychain.
- **Services** : `AuthService`, `EventsService`, `ProfilesService` (même logique que le web).
- **Features** : Auth (Login/Register), Home (liste d’événements), EventDetail (onglets Vue d’ensemble, Programme, Invités), Sequence (détail d’une séquence), import contacts natif.
- **Components** : boutons, champs, loading.

## Fonctionnalités

- Connexion / Inscription (email + mot de passe)
- Liste des événements (créateur ou organisateur confirmé)
- Création d’événement
- Détail événement : vue d’ensemble, programme (séquences), invités
- Détail séquence : infos, jalons, invités liés
- **Import contacts natif** : permission Contacts, liste avec recherche, cases à cocher, validation → ajout comme invités (avec accompagnants gérés côté modèle)
- Ajout manuel d’un invité (avec nombre d’accompagnants)

## Règle de parité Web / Native

Lorsqu’une **option** ou une **fonctionnalité** est modifiée ou ajoutée :

1. **Web** : mettre à jour l’app React (composants, API, types).
2. **Native** : faire les mêmes changements ici (modèles, services, vues SwiftUI).

Cela garantit le même comportement et le même modèle de données partout.
