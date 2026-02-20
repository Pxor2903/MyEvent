# Autorisations et accès natif (Contacts, Calendrier)

## Principe

Sur chaque plateforme, l’app **demande l’autorisation** au moment où l’utilisateur en a besoin (ex. au clic sur « Importer des contacts »). Une fois l’accès accordé, on utilise les **APIs natives** pour ouvrir le sélecteur système (Contacts, Calendrier) : l’utilisateur **sélectionne** dans l’app native, puis on **importe** les données.

---

## iOS (app native Swift)

### Contacts
- **Autorisation** : `NSContactsUsageDescription` dans `Info.plist` (déjà configuré). Demande au premier clic sur « Ouvrir l’app Contacts ».
- **Sélecteur natif** : `CNContactPickerViewController` (ContactsUI). L’utilisateur choisit un ou plusieurs contacts dans l’interface système, puis valide → l’app reçoit les contacts et les convertit en invités.
- **Fallback** : option « Voir ma liste ici » qui charge la liste dans l’app (même comportement qu’avant).

### Calendrier (à venir)
- **Autorisation** : `NSCalendarsUsageDescription` et éventuellement `NSCalendarsFullAccessUsageDescription` (iOS 17+).
- **API** : `EventKit` (`EKEventStore`). Après autorisation, on peut :
  - **Lire** les événements du calendrier.
  - **Créer / modifier** des événements (dates de l’événement ou sous‑événements) pour les ajouter au calendrier de l’appareil.
- Flux prévu : bouton « Ajouter au calendrier » → demande d’accès → création d’un `EKEvent` avec date/lieu/titre → l’événement apparaît dans l’app Calendrier.

---

## Web (navigateur)

- **Contacts** : pas d’accès au carnet complet. Possibilités :
  - **Contact Picker API** (Chrome Android) : ouvre un sélecteur proche du natif, sélection puis import.
  - **Import fichier** : CSV / vCard (recommandé sur desktop et Safari).
- **Calendrier** : pas d’API standard pour lire/écrire dans le calendrier système. Pistes :
  - Export **iCal / .ics** que l’utilisateur télécharge et ouvre dans son app Calendrier.
  - Sur **Capacitor** (web embarquée iOS/Android), un plugin natif peut appeler EventKit / CalendarContract pour ajouter des événements après autorisation.

---

## Capacitor (web dans coque native)

- **Contacts** : plugin `@capacitor-community/contacts` → demande de permission puis `getContacts()`. Pour un **sélecteur natif** comme sur l’app Swift, il faudrait un plugin personnalisé qui affiche `CNContactPickerViewController` (iOS) et l’équivalent Android, puis renvoie les contacts sélectionnés.
- **Calendrier** : pas de plugin officiel « calendrier ». Un plugin custom peut utiliser EventKit (iOS) et `CalendarContract` (Android) pour demander l’accès et créer des événements.

---

## Résumé

| Plateforme        | Contacts (sélecteur natif)     | Calendrier (ajout de dates)        |
|-------------------|--------------------------------|------------------------------------|
| **iOS (Swift)**   | Oui (CNContactPickerViewController) | Prévu (EventKit)                  |
| **Web**           | Limité (Contact Picker / fichier)  | Export .ics / plugin custom       |
| **Capacitor**     | Plugin custom pour picker natif    | Plugin custom EventKit/Android    |

L’app native iOS est déjà en place pour le flux **autorisation → app Contacts native → sélection → import**. Le même schéma sera utilisé pour le calendrier : **autorisation → création d’événements dans le calendrier système**.
