# Structure du projet MyEvent

Ce document décrit où se trouve chaque partie du projet pour ne pas confondre l’**application web responsive** (celle sur laquelle on travaille au quotidien) et l’**application native Swift** (projet Xcode séparé).

---

## Deux applications distinctes

| Application | Emplacement | Technos | Usage |
|-------------|-------------|---------|--------|
| **MyEvent Web (responsive + PWA)** | **Racine du repo** | Vite, React, TypeScript, Supabase | App principale : navigateur, PWA, et **emballage Capacitor** pour iOS/Android. C’est celle qu’on développe en priorité. |
| **MyEvent Native (Swift)** | **`MyEventNative/`** | Swift, SwiftUI, Xcode, Supabase | App iOS native séparée (même produit, autre codebase). Optionnelle ; parité fonctionnelle avec la web. |

Ne pas confondre :
- **`ios/`** et **`android/`** = projets **Capacitor** qui embarquent le build **web** (`dist/`) dans un WebView. Ils **ne contiennent pas** le code métier : tout est dans la racine (components, api, etc.).
- **`MyEventNative/`** = **autre application** (Swift), avec son propre `.xcodeproj`, ses vues Swift, etc.

---

## Racine : application web (Vite + React)

```
├── index.html          # Point d’entrée HTML (charge index.tsx)
├── index.tsx           # Point d’entrée JS (monte <App />)
├── index.css           # Styles globaux + variables design system
├── App.tsx             # Composant racine (auth, routing implicite Home / Auth)
├── types.ts            # Réexport @/core/types (compatibilité)
├── constants.tsx       # Réexport @/core/constants (compatibilité)
│
├── api/                # Couche données (Supabase)
├── components/         # Composants React (écrans, formulaires, UI)
├── core/               # Types TypeScript + constantes / branding
├── hooks/              # Hooks React (ex. useEvents)
├── services/           # Réexports vers @/api (compatibilité)
├── utils/              # Utilitaires (contacts, partage, etc.)
│
├── public/             # Fichiers statiques (icône, manifest PWA)
├── dist/               # Build de production (généré par Vite) → utilisé par Capacitor
├── docs/               # Documentation (architecture, déploiement, etc.)
├── supabase/           # Schéma SQL et migrations
└── scripts/            # Scripts shell (ex. push)
```

---

## Dossiers détaillés

### `api/`
- **client.ts** : client Supabase (création, config auth).
- **auth.ts** : login, register, OAuth (Google/Apple), getCurrentUser.
- **profiles.ts** : CRUD profils utilisateur.
- **events.ts** : CRUD événements, partage, join par code/mot de passe.
- **messages.ts** : messages du chat (par événement / canal).
- **index.ts** : exports `supabase`, `dbService`, `authApi`, `eventsApi`, etc.

### `components/`
- Composants d’écran : **Home**, **EventDetail**, **EventForm**, **EventCard**.
- Auth : **AuthLayout**, **LoginForm**, **RegisterForm**.
- UI : **Input**, **Toast**, **Footer**.

### `core/`
- **types/** : types partagés (User, Event, Guest, SubEvent, ChatMessage, etc.).
- **constants/** : branding (Logo), textes, config (auth, chat, event).

### `utils/`
- **contactImport.ts** : parsing vCard/CSV, Contact Picker API, normalisation E.164, déduplication.
- **contactImportService.ts** : service unifié (device, Google, fichier) pour l’import d’invités.
- **nativeContacts.ts** : plugin Capacitor Contacts (précharge, loadNativeContacts).
- **sharePassword.ts** : génération du mot de passe de partage.

### `ios/` et `android/`
- Projets **Capacitor** : shell natif (WebView) qui charge l’app web buildée (`dist/`).
- **Ne pas** y mettre la logique métier ; tout le code applicatif est à la racine.
- Après `npm run build && npx cap sync`, le contenu de `dist/` est copié dans les assets du projet natif.

### `MyEventNative/`
- **Application iOS native en Swift** (SwiftUI, Xcode).
- Structure : Features (Auth, Home, EventDetail, Contacts, Sequence), Core (Models, Supabase), Services.
- Indépendante de l’app web ; même backend Supabase, autre codebase.

---

## Fichiers de configuration (racine)

| Fichier | Rôle |
|--------|------|
| **package.json** | Dépendances npm, scripts (dev, build, cap:sync, cap:ios, cap:android). |
| **vite.config.ts** | Vite : port, HTTPS, alias `@` → racine. |
| **tsconfig.json** | TypeScript : chemins `@/*`, JSX, cible ESNext. |
| **capacitor.config.ts** | Capacitor : appId, appName, webDir = `dist`. |
| **env.d.ts** | Déclarations de types (Vite, `VITE_*`). |
| **.env** | Variables d’environnement (non versionné) : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. |
| **netlify.toml** / **vercel.json** | Déploiement web (build, publish `dist`). |

---

## Imports recommandés

- Types : `import type { Event, User } from '@/core/types'`
- Constantes / Logo : `import { Logo } from '@/core/constants'`
- API / Auth : `import { dbService, authService, supabase } from '@/api'`
- Hooks : `import { useEvents } from '@/hooks/useEvents'`
- Utilitaires : `import { … } from '@/utils/...'`

Les fichiers **types.ts** et **constants.tsx** à la racine réexportent `@/core/types` et `@/core/constants` pour compatibilité ; préférer importer depuis `@/core/*`.

---

## Résumé

- **App principale** = tout ce qui est à la **racine** (Vite + React). Build → `dist/` ; Capacitor utilise `dist/` pour iOS/Android.
- **App native Swift** = **MyEventNative/** uniquement ; ne pas mélanger avec `ios/App` (Capacitor).
- **Doublons** : pas de doublon de code ; deux produits (web et Swift) partagent le même domaine métier et la même doc (dans `docs/`).
