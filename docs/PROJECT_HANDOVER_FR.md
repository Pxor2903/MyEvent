# MyEvent — Dossier de passation projet (FR)

Ce document sert à expliquer rapidement et clairement le projet à une nouvelle personne (dev, chef de projet, partenaire), avec:

- l'objectif produit,
- l'architecture technique,
- ce qui a été implémenté,
- pourquoi ces choix ont été faits,
- ce qu'il reste à finaliser.

---

## 1) Vision du produit

`MyEvent` est une plateforme de gestion d'événements qui permet:

- de créer et organiser des événements et sous-événements,
- de gérer les invités (import, suivi des réponses, relances),
- de diffuser des invitations (SMS/WhatsApp/email),
- de centraliser documents, budget, missions et chat temps réel,
- d'offrir une expérience web + app mobile (Capacitor).

Objectif UX global: une interface simple côté invité, et un cockpit complet côté organisateur.

---

## 2) Stack technique et architecture

### Frontend

- React + TypeScript + Vite
- Tailwind (classes utilitaires)
- Router: `react-router-dom`

### Backend / Data

- Supabase (Postgres + Auth + Realtime + Storage)
- API serverless (dossier `api/`) pour les flux publics / envoi

### Mobile

- Capacitor (`ios/`, `android/`) pour empaqueter l'app web

### Structure de code (simplifiée)

- `components/` : UI V1 historique
- `components/V2/` : nouvelle UI/UX (refonte)
- `api/` : endpoints invitation, réponses, envois, etc.
- `hooks/` : hooks métiers (ex: événements où l'utilisateur est invité)
- `docs/` : documentation projet / configuration

---

## 3) Objectif de la refonte V2 (optique produit)

La V1 fonctionnait mais restait lourde côté ergonomie et structure.  
La V2 a été engagée avec une contrainte forte:

- garder les fonctionnalités,
- refondre l'interface et la navigation de façon plus "produit commercial".

Décision structurante prise: **Option B**  
=> ne plus dépendre du composant historique `EventDetail` pour la V2, et reconstruire les écrans principaux avec leur propre logique de navigation et d'état.

---

## 4) Ce qui a été fait (fonctionnel)

## 4.1 Infrastructure V2 et navigation

- ajout de `react-router-dom`,
- mise en place de `V2Router` avec routes dédiées:
  - `/`
  - `/event/:eventId`
  - `/event/:eventId/sub/:subEventId`
  - `/guest/event/:eventId`
  - `/repondre`
- ajout d'un toggle V1/V2 sur l'accueil (persisté via `localStorage`).

**Pourquoi:** découpler les pages, améliorer les perfs perçues et la lisibilité du produit.

---

## 4.2 Refonte des écrans cœur V2

- `EventV2` réécrit sans `EventDetail`,
- `SubEventV2New` réécrit sans `EventDetail`,
- shell V2 modernisé (header, sidebar desktop, nav mobile, sections),
- intégration des modules métiers (invités, documents, budget, missions, chat).

**Pourquoi:** obtenir une base scalable et proprement maintenable pour une version commerciale.

---

## 4.3 Sécurisation UX des actions asynchrones

- création du hook `useAsyncAction`,
- prévention des doubles clics / double soumission,
- états de chargement et désactivation des boutons sur actions critiques.

**Pourquoi:** éviter les doublons (ex: double création d'événement) et fiabiliser l'expérience.

---

## 4.4 Flux invitation / réponse enrichi

- `api/invitation.js` enrichi:
  - renvoie les sous-événements pertinents pour l'invité,
  - pré-remplit les réponses existantes,
  - priorise les documents d'invitation selon le contexte invité.
- `api/invitation-respond.js` rendu rétrocompatible:
  - ancien format (global),
  - nouveau format (`subResponses` par sous-événement).
- UI RSVP mise à jour V1 + V2:
  - réponses par sous-événement,
  - validation des champs,
  - meilleure gestion des nombres.

**Pourquoi:** couvrir les cas réels d'événements composés de plusieurs séquences avec réponses distinctes.

---

## 4.5 Diffusion des invitations / pièces jointes

- logique d'envoi adaptée pour ne pas polluer les messages invitation avec des URLs de documents,
- affichage du document directement sur la page de réponse,
- ajout d'une relance ciblée "invités en attente" côté documents/gestion.

**Pourquoi:** améliorer le taux de réponse et la clarté du parcours invité.

---

## 4.6 Espace invité dédié (V2)

- ajout d'une vue `GuestEventV2`:
  - informations événement,
  - accès au chat global et chats de sous-événements.
- ajout du hook `useGuestEvents` + service `getGuestEventsByUser`.

**Pourquoi:** donner une vraie expérience "invité connecté", distincte de l'organisateur.

---

## 4.7 Deep-linking web <-> app (en cours de finalisation)

Implémenté:

- bouton "Ouvrir dans l'application" sur pages RSVP V1/V2,
- tentative auto mobile + fallback web,
- écoute native `appUrlOpen` + `getLaunchUrl` dans `App.tsx`,
- config URL scheme:
  - Android intent filters (`myevent://...` + HTTPS host),
  - iOS `CFBundleURLTypes`,
- ajout des fichiers:
  - `public/.well-known/apple-app-site-association`
  - `public/.well-known/assetlinks.json`
- doc: `docs/DEEP_LINKS.md`

**Pourquoi:** basculer naturellement l'invité vers l'app quand elle est installée.

---

## 5) Ce qui a été fait côté qualité

- builds vérifiés régulièrement (`npm run build`) après modifications majeures,
- corrections TypeScript/imports,
- contrôle linter sur fichiers touchés,
- maintien de la compatibilité V1 pendant la montée en puissance V2.

---

## 6) Ce qu'il reste à faire (priorisé)

## Priorité 1 — Finaliser Universal Links / App Links en production

À compléter manuellement:

- remplacer `TEAM_ID` dans `apple-app-site-association`,
- remplacer la SHA-256 release dans `assetlinks.json`,
- configurer `Associated Domains` dans Xcode,
- vérifier que les endpoints `.well-known` sont bien servis en HTTPS (200).

Résultat attendu: `https://<domaine>/repondre?token=...` ouvre l'app installée, sinon web.

---

## Priorité 2 — Polissage multi-documents d'invitation

- améliorer encore la présentation quand plusieurs cartes/documents sont liés (fusion visuelle, ordre métier plus explicite, labels enrichis).

---

## Priorité 3 — QA produit bout-en-bout

- tests manuels complets multi-profils (owner, organizer, guest),
- tests mobile réels (iOS/Android) sur liens d'invitation,
- vérification relance "pending guests",
- vérification permissions Supabase/RLS (suppression événement, accès team).

---

## Priorité 4 — Performance perçue et découpage

- continuer à découper certains chunks front,
- optimiser chargement des écrans les plus lourds,
- surveiller les warnings bundle Vite en production.

---

## 7) Guide rapide "comment lancer"

Depuis la racine:

- dev: `npm install` puis `npm run dev`
- build: `npm run build`
- preview build: `npm run preview`
- sync mobile: `npm run cap:sync`

---

## 8) Fichiers clés à connaître

- `App.tsx` (point d'entrée UI + auth + routage V1/V2 + deep link handling)
- `components/V2/V2Router.tsx`
- `components/V2/EventV2.tsx`
- `components/V2/SubEventV2New.tsx`
- `components/V2/RespondToInvitationV2.tsx`
- `components/RespondToInvitation.tsx`
- `api/invitation.js`
- `api/invitation-respond.js`
- `components/EventDocumentsTab.tsx`
- `docs/DEEP_LINKS.md`

---

## 9) Résumé exécutable (en une phrase)

Le projet est passé d'une base V1 monolithique à une architecture V2 routée et plus professionnelle, avec parité fonctionnelle majeure atteinte, flux RSVP multi-sous-événements opérationnel, et passerelle web->app presque finalisée (il reste la configuration de signature/association en production).
