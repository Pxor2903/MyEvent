# Architecture du projet MyEvent (app web)

Ce document décrit l’organisation du **code web** (Vite + React) à la racine du repo.  
Pour la distinction **app web** vs **app native Swift** (MyEventNative) et les dossiers **ios/** / **android/** (Capacitor), voir **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)**.

## Principes

- **Séparation des responsabilités** : types, API, hooks, utils et UI sont séparés.
- **Un seul point d’entrée par couche** : on importe depuis `@/core/types`, `@/api`, etc.
- **Compatibilité** : les anciens chemins (`services/dbService`, `types`) réexportent les nouveaux modules.

## Structure des dossiers

```
├── api/                    # Couche d’accès aux données (Supabase)
│   ├── client.ts           # Client Supabase (auth, realtime)
│   ├── auth.ts             # Authentification (login, register, logout)
│   ├── profiles.ts         # Profils utilisateur (CRUD)
│   ├── events.ts           # Événements (CRUD, partage, join)
│   ├── messages.ts         # Messages du chat
│   └── index.ts            # Exports : dbService, authService, supabase
│
├── core/                   # Cœur métier (types, constantes)
│   ├── types/              # Types TypeScript
│   │   ├── user.ts
│   │   ├── event.ts
│   │   ├── auth.ts
│   │   ├── chat.ts
│   │   ├── misc.ts
│   │   └── index.ts
│   └── constants/          # Constantes et branding
│       ├── branding.tsx    # Logo, nom app
│       └── index.ts
│
├── hooks/                  # Hooks React réutilisables
│   └── useEvents.ts        # Liste d’événements + Realtime
│
├── utils/                  # Fonctions pures (sans dépendances UI/API)
│   └── sharePassword.ts   # Génération mot de passe partage
│
├── components/             # Composants React (UI)
│   ├── ui/                 # (optionnel) Input, Toast, etc.
│   ├── EventCard.tsx
│   ├── EventDetail.tsx
│   ├── EventForm.tsx
│   ├── Home.tsx
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── ...
│
├── services/               # Réexport vers @/api (compatibilité)
├── types.ts                # Réexport vers @/core/types
├── constants.tsx           # Réexport vers @/core/constants
└── App.tsx
```

## Imports recommandés

| Besoin            | Import |
|-------------------|--------|
| Types             | `import type { Event, User } from '@/core/types'` |
| Constantes / Logo | `import { Logo } from '@/core/constants'` |
| Données / Auth    | `import { dbService, authService, supabase } from '@/api'` |
| Hook événements   | `import { useEvents } from '@/hooks/useEvents'` |
| Utilitaires       | `import { generateSharePassword } from '@/utils/sharePassword'` |

## Modifier sans casser

- **Changer un type** : modifier le fichier dans `core/types/` (ex. `event.ts`). Toute l’app utilise ces types.
- **Changer la logique événements** : modifier `api/events.ts`. Les composants passent par `dbService` ou `eventsApi`.
- **Changer l’auth** : modifier `api/auth.ts`. Les composants utilisent `authService`.
- **Ajouter un hook** : créer un fichier dans `hooks/` et l’utiliser dans les composants.
- **Nouvelle constante** : l’ajouter dans `core/constants/` et réexporter dans `index.ts`.

## Alias `@/`

L’alias `@/` pointe vers la racine du projet (`vite.config.ts` et `tsconfig.json`).  
Exemple : `@/api` → dossier `api/` à la racine.
