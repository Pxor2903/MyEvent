# MyEvent

Application de gestion d'événements : création, partage, invités, séquences et messagerie temps réel. Auth Supabase (email + OAuth Google/Apple), déploiement web et app mobile via **Capacitor** (iOS/Android).

---

## Deux parties du dépôt

- **Application web (celle-ci)** — À la **racine** : Vite + React + TypeScript. App principale (responsive, PWA, base pour Capacitor). **C’est sur cette base que l’équipe travaille.**
- **Application native Swift (optionnelle)** — Dossier **`MyEventNative/`** : projet Xcode séparé. Ne pas confondre avec **`ios/`** qui est le shell Capacitor (WebView) pour l’app web.

Voir **[docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)** pour la structure et le rôle de chaque dossier.

---

## Prérequis

Node.js (LTS). Compte Supabase (URL + clé anon).

---

## Installation et lancement

1. `npm install`
2. Créer un fichier **`.env`** à la racine avec :
   - `VITE_SUPABASE_URL=https://xxx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=eyJ...`
3. Appliquer le schéma/migrations dans **`supabase/`** (voir [docs/CONFIGURATION.md](docs/CONFIGURATION.md)).
4. `npm run dev`

L’app tourne en **HTTPS** (port 3000). Accepter le certificat au premier lancement si demandé.  
**Réseau local** : utiliser l’URL affichée (ex. `https://192.168.x.x:3000`) et configurer les Redirect URLs dans Supabase.

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build production → `dist/` |
| `npm run preview` | Prévisualisation du build |
| `npm run cap:sync` | Build + sync Capacitor (ios/android) |
| `npm run cap:ios` | Sync + ouvrir Xcode |
| `npm run cap:android` | Sync + ouvrir Android |

---

## Déploiement

- **Vercel** : [docs/VERCEL.md](docs/VERCEL.md)
- **Netlify** : config dans `netlify.toml`

---

## Documentation

- **[docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)** — Où est quoi (web vs native).
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Organisation du code (api, core, components).
- **[docs/ONBOARDING.md](docs/ONBOARDING.md)** — Prise en main pour nouveaux devs.
- **[docs/CONFIGURATION.md](docs/CONFIGURATION.md)** — Supabase, auth, redirects.
- **[docs/DEPENDENCIES.md](docs/DEPENDENCIES.md)** — Paquets npm et variables d’environnement.
