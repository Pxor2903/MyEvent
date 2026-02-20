# Générer le projet avec XcodeGen (nouveaux fichiers, PhotosUI)

Si tu utilises **XcodeGen** pour générer le projet Xcode à partir de `project.yml` :

1. **Installer XcodeGen** (une seule fois)  
   Si Homebrew est installé :
   ```bash
   brew install xcodegen
   ```
   Si `brew` n’est pas reconnu, charge d’abord Homebrew :
   ```bash
   eval "$(/opt/homebrew/bin/brew shellenv)"
   ```
   puis relance `brew install xcodegen`.

2. **Aller dans le dossier du projet natif** :
   ```bash
   cd /Users/aaronmimoun/Desktop/DevPerso/MyEvent/MyEventNative
   ```
   (ou ouvre ce dossier dans le Terminal.)

3. **Générer le projet Xcode** :
   ```bash
   xcodegen generate
   ```

4. **Ouvrir le projet**  
   Ouvre **`MyEventNative.xcodeproj`** dans Xcode (Fichier > Ouvrir, ou double-clic sur le fichier).

Les nouveaux fichiers (Theme, ChatService, EventSettingsSheet, JoinEventSheet, etc.) et le framework **PhotosUI** seront inclus dans la cible.

---

# Si le projet Xcode affiche « damaged » ou « parse error »

Certaines versions de Xcode (notamment 16+) tentent d’ouvrir le `project.pbxproj` comme du JSON et refusent le format texte classique. Si tu vois une erreur du type **« The project 'MyEventNative' is damaged and cannot be opened due to a parse error »**, utilise l’une des solutions ci‑dessous.

## 1. Vérifier le dossier d’ouverture

Ouvre **uniquement le dossier qui contient le `.xcodeproj`** :

- Bon : ouvrir le dossier **`MyEventNative`** (celui où se trouve `MyEventNative.xcodeproj`).
- Mauvais : ouvrir la racine du repo **`MyEvent`** comme projet Xcode.

Dans Xcode : **Fichier > Ouvrir** → choisis le dossier **`MyEventNative`** → sélectionne **`MyEventNative.xcodeproj`**.

## 2. Recréer le projet dans Xcode (si l’erreur persiste)

1. Ouvre Xcode (sans ouvrir notre projet).
2. **Fichier > Nouveau > Projet**.
3. Choisis **iOS > Application** (App).
4. Options :
   - Interface : **SwiftUI**
   - Langage : **Swift**
   - Nom du projet : **MyEventNative**
   - Organisation : ce que tu veux
   - **Enregistrer dans** : va dans le dossier **`MyEventNative`** du repo et **remplace** le dossier `MyEventNative` généré par Xcode (ou enregistre à la racine de `MyEventNative` et supprime le sous-dossier créé par Xcode si besoin).
5. Une fois le projet créé :
   - Dans le **Project Navigator** (gauche), supprime le fichier **`ContentView.swift`** (ou garde-le et supprime son contenu).
   - Clic droit sur le groupe **MyEventNative** (le groupe bleu) → **Add Files to "MyEventNative"…**
   - Sélectionne **tout le contenu** du dossier **`MyEventNative`** (tous les dossiers : Core, Services, Components, Features, etc., et les fichiers à la racine comme `MyEventNativeApp.swift`, `RootView.swift`, `Info.plist`).
   - Coche **Copy items if needed** si tu veux, et **Create groups**.
   - Coche la cible **MyEventNative** pour tous les fichiers à ajouter.
6. **Point d’entrée** : dans le groupe du projet, renomme ou remplace le point d’entrée pour que ce soit **`MyEventNativeApp.swift`** (avec `@main`). Supprime l’ancien `@main` s’il y a deux `@main`.
7. **Info.plist** : ouvre **Info.plist** du projet et ajoute :
   - `SUPABASE_URL` (string) : ton URL Supabase
   - `SUPABASE_ANON_KEY`` (string) : ta clé anon
   - `NSContactsUsageDescription` (string) : *MyEvent utilise tes contacts pour inviter des personnes à tes événements.*
8. **Contacts** : dans l’onglet **Build Phases** de la cible, section **Link Binary With Libraries**, ajoute **Contacts.framework**.
9. **Signing** : dans l’onglet **Signing & Capabilities**, choisis ton **Team** pour pouvoir lancer sur un appareil.

Tu peux ensuite lancer le projet (Cmd+R). Les chemins et noms de dossiers doivent correspondre à ceux du repo (Core, Services, Features, etc.) pour que les imports Swift restent valides.
