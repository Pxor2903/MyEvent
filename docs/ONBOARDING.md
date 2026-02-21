# Onboarding — Nouveaux développeurs

Ce guide permet de comprendre rapidement le projet MyEvent et de commencer à contribuer.

---

## 1. Ce que fait l’app

- **Gestion d’événements** : créer, modifier, partager (lien + mot de passe), rejoindre via code.
- **Invités** : ajout à la main, import depuis fichier (CSV/vCard), import depuis Google, ou depuis les contacts de l’appareil (Capacitor / Contact Picker selon la plateforme).
- **Séquences / sous-événements** : découpage d’un événement en jalons (dates, lieux).
- **Chat** : messagerie par événement / canal, temps réel (Supabase Realtime).
- **Auth** : email/mot de passe + Google / Apple (Supabase Auth).

---

## 2. Où est le code sur lequel on travaille ?

- **Tout le code applicatif (web)** est à la **racine** du repo : `App.tsx`, `components/`, `api/`, `core/`, `hooks/`, `utils/`, etc.
- **`ios/`** et **`android/`** sont les projets **Capacitor** : ils embarquent le build web (`dist/`) dans une WebView. On ne modifie la logique métier que dans la racine.
- **`MyEventNative/`** est une **autre application** (Swift, Xcode), séparée. Même produit, autre codebase ; ne pas la confondre avec l’app web.

Détail : **[docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)**.

---

## 3. Premiers pas

1. **Node.js** installé, puis à la racine :
   ```bash
   npm install
   ```
2. Créer un **`.env`** avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (voir README ou `.env.example`).
3. Lancer **`npm run dev`** et ouvrir l’URL affichée (HTTPS).
4. Parcourir **`docs/ARCHITECTURE.md`** pour les conventions d’import (`@/core/types`, `@/api`, etc.).

---

## 4. Conventions d’import

- **Types** : `import type { Event, User } from '@/core/types'`
- **Constantes / Logo** : `import { Logo } from '@/core/constants'`
- **API / données** : `import { dbService, authService, supabase } from '@/api'`
- **Hooks** : `import { useEvents } from '@/hooks/useEvents'`
- **Utilitaires** : `import { … } from '@/utils/...'`

Éviter les chemins relatifs vers `../types` ou `../constants` ; préférer `@/core/types` et `@/core/constants`.

---

## 5. Fichiers importants

| Besoin | Fichier(s) |
|--------|------------|
| Types partagés | `core/types/index.ts` + modules dans `core/types/` |
| Appels Supabase (auth, events, messages) | `api/auth.ts`, `api/events.ts`, `api/messages.ts`, `api/profiles.ts` |
| Écran d’accueil | `components/Home.tsx` |
| Détail d’un événement (onglets, invités, chat) | `components/EventDetail.tsx` |
| Import d’invités (fichier, Google, appareil) | `utils/contactImportService.ts`, `utils/contactImport.ts`, `utils/nativeContacts.ts` |
| Design system (couleurs, espacements) | `index.css` (variables CSS) |

---

## 6. Tests manuels

- **Web** : `npm run dev` → créer un compte, un événement, ajouter des invités (fichier ou à la main), chat.
- **Mobile (Capacitor)** : `npm run build && npx cap sync ios` puis ouvrir le projet dans Xcode et lancer sur simulateur ou appareil. L’app dans le WebView est la même que la web.

---

## 7. Où poser des questions

- **Structure / architecture** : `docs/PROJECT_STRUCTURE.md`, `docs/ARCHITECTURE.md`.
- **Auth / Supabase** : `docs/AUTH_ET_PROFILES.md`, `docs/CONFIGURATION.md`.
- **Déploiement** : `docs/VERCEL.md`, `docs/DEPLOIEMENT.md`.
- **Permissions / contacts** : `docs/PERMISSIONS-AND-NATIVE.md`, `docs/PARITY-WEB-NATIVE.md`.
