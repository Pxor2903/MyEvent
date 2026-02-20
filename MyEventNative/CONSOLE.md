# Commandes console — MyEvent Native

Toutes les commandes à lancer dans le terminal pour installer les outils, générer le projet Xcode et le lancer. À exécuter depuis la **racine du repo** `MyEvent` (ou depuis `MyEventNative` selon l’étape).

**État du projet :** le dépôt contient déjà un `MyEventNative.xcodeproj` et un schéma partagé `MyEventNative`. Tu peux tenter d’ouvrir directement le projet (étape 5). En cas d’erreur « project damaged », utilise XcodeGen (étapes 2–3) ou la création manuelle (voir `CREATE_PROJECT.md`).

---

## 1. Aller dans le dossier du projet natif

```bash
cd /Users/aaronmimoun/Desktop/DevPerso/MyEvent/MyEventNative
```

---

## 2. Installer XcodeGen (une seule fois)

XcodeGen génère un projet Xcode valide à partir de `project.yml` (évite l’erreur « project damaged »).

```bash
brew install xcodegen
```

Si Homebrew n’est pas installé :

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Puis relancer :

```bash
brew install xcodegen
```

---

## 3. Générer le projet Xcode

À exécuter depuis le dossier **MyEventNative** :

```bash
cd /Users/aaronmimoun/Desktop/DevPerso/MyEvent/MyEventNative
xcodegen generate
```

Cela crée (ou écrase) **MyEventNative.xcodeproj** avec un format reconnu par Xcode.

---

## 4. Configurer Supabase (optionnel)

Éditer les clés Supabase dans le plist avant de lancer l’app :

```bash
cd /Users/aaronmimoun/Desktop/DevPerso/MyEvent/MyEventNative
# Remplacer YOUR_PROJECT et YOUR_ANON_KEY dans le fichier
/usr/bin/sed -i '' 's|https://YOUR_PROJECT.supabase.co|https://TON_PROJET.supabase.co|g' MyEventNative/Info.plist
/usr/bin/sed -i '' 's|YOUR_ANON_KEY|ta_cle_anon_ici|g' MyEventNative/Info.plist
```

Ou ouvrir le fichier et modifier à la main :

```bash
open -a Xcode MyEventNative/Info.plist
# ou
open -e MyEventNative/Info.plist
```

---

## 5. Ouvrir le projet dans Xcode

```bash
cd /Users/aaronmimoun/Desktop/DevPerso/MyEvent/MyEventNative
open MyEventNative.xcodeproj
```

---

## 6. Lancer l’app (simulateur ou appareil)

Depuis le terminal, après avoir ouvert le projet une fois et choisi un simulateur/schéma :

```bash
cd /Users/aaronmimoun/Desktop/DevPerso/MyEvent/MyEventNative
xcodebuild -project MyEventNative.xcodeproj -scheme MyEventNative -destination 'platform=iOS Simulator,name=iPhone 16' build
```

Puis lancer le simulateur avec l’app :

```bash
xcrun simctl boot "iPhone 16" 2>/dev/null || true
xcodebuild -project MyEventNative.xcodeproj -scheme MyEventNative -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath build run
```

Ou simplement : ouvrir le projet dans Xcode et appuyer sur **Cmd+R**.

---

## 7. Nettoyer le build

```bash
cd /Users/aaronmimoun/Desktop/DevPerso/MyEvent/MyEventNative
xcodebuild -project MyEventNative.xcodeproj -scheme MyEventNative clean
rm -rf build
```

---

## 8. Réinitialiser le projet généré (régénérer de zéro)

```bash
cd /Users/aaronmimoun/Desktop/DevPerso/MyEvent/MyEventNative
rm -rf MyEventNative.xcodeproj
xcodegen generate
open MyEventNative.xcodeproj
```

---

## Récapitulatif minimal (copier-coller)

À faire une première fois (avec Homebrew et Xcode installés) :

```bash
cd /Users/aaronmimoun/Desktop/DevPerso/MyEvent/MyEventNative
brew install xcodegen
xcodegen generate
open MyEventNative.xcodeproj
```

Ensuite, dans Xcode : choisir un simulateur (ou un appareil), puis **Cmd+R** pour lancer l’app.

---

## Script tout-en-un

Un script `scripts/setup-and-open.sh` est fourni pour enchaîner : vérification de XcodeGen → génération → ouverture du projet. Voir ci-dessous.
