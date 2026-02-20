# Parité Web / App native MyEvent

Ce document rappelle la règle de cohérence entre l’app **web (React/Vite/Supabase)** et l’app **iOS native (Swift/SwiftUI)**.

## Principe

Toute **option à modifier** ou **fonctionnalité à ajouter** doit être implémentée **à la fois** :

- dans l’app **web** (`src/`, `components/`, `api/`, `core/types/`, etc.) ;
- dans l’app **native** (`MyEventNative/` : modèles, services, vues SwiftUI).

Objectif : même comportement métier et même modèle de données (événements, invités, séquences, etc.) sur tous les clients.

## Où faire les changements

| Domaine        | Web (React)                    | Native (Swift)                          |
|----------------|--------------------------------|----------------------------------------|
| Modèles        | `core/types/` (event, user…)  | `MyEventNative/.../Core/Models/`        |
| API / Backend  | `api/` (client Supabase, RPC)  | `MyEventNative/.../Core/Supabase/`, `Services/` |
| Auth           | `api/auth.ts`, écrans login    | `AuthService`, `LoginView`, `RegisterView` |
| Événements     | `EventDetail.tsx`, `api/events.ts` | `EventDetailView`, `EventsService`     |
| Invités        | Composants invités + import    | `GuestsTab`, `AddGuestSheet`, `ContactImportSheet` |
| Séquences      | Détail séquence / programme   | `ProgramTab`, `SequenceDetailView`     |
| Import contacts | Web : Contact Picker / CSV  | Native : `CNContactStore` + liste + cases à cocher |

## Exemple

Si tu ajoutes un champ **“Nombre de places max”** sur un événement :

1. **Types** : ajouter le champ dans `core/types/event.ts` (web) et dans `EventModels.swift` (native), avec `CodingKeys` si besoin pour l’API.
2. **API** : le backend Supabase (table `events`) doit exposer ce champ ; pas de changement côté `api/` si déjà envoyé/reçu.
3. **Web** : afficher/éditer le champ dans `EventDetail` (ou formulaire de création).
4. **Native** : afficher/éditer le champ dans `EventDetailView` / `OverviewTab` et dans `CreateEventSheet` si pertinent.

En suivant cette règle, les évolutions restent cohérentes partout.
