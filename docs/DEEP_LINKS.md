# Deep Links (Web -> App)

Ce projet supporte maintenant:

- **Custom scheme**: `myevent://repondre?token=...`
- **Universal Links / App Links**: `https://myevent.app/repondre?token=...`

## Ce qui est déjà prêt dans le code

- `App.tsx`: écoute `appUrlOpen` + `getLaunchUrl` pour extraire `token` et ouvrir l'écran RSVP.
- Android: intent-filters ajoutés dans `android/app/src/main/AndroidManifest.xml`.
- iOS: URL scheme `myevent` ajouté dans `ios/App/App/Info.plist`.
- Web: fichiers de vérification ajoutés:
  - `public/.well-known/apple-app-site-association`
  - `public/.well-known/assetlinks.json`

## Ce qu'il reste à configurer (obligatoire)

### 1) Domaine

Si ton domaine final n'est pas `myevent.app`, remplace:

- dans `android/app/src/main/AndroidManifest.xml` la valeur `android:host="myevent.app"`
- dans tous les docs/liens publics d'invitation

### 2) iOS (Associated Domains)

Dans Xcode:

1. Target `App` -> `Signing & Capabilities`
2. Ajouter la capability **Associated Domains**
3. Ajouter:
   - `applinks:myevent.app`

Puis remplacer dans `public/.well-known/apple-app-site-association`:

- `TEAM_ID` par l'Apple Team ID réel.

### 3) Android (App Links)

Récupérer la fingerprint SHA-256 du certificat de signature release et remplacer:

- `REPLACE_WITH_RELEASE_SHA256_FINGERPRINT` dans `public/.well-known/assetlinks.json`

### 4) Déployer le site

Les fichiers suivants doivent être publiquement accessibles:

- `https://myevent.app/.well-known/apple-app-site-association`
- `https://myevent.app/.well-known/assetlinks.json`

## Vérification rapide

- Cliquer un lien `https://myevent.app/repondre?token=...` depuis mobile:
  - app installée + association OK -> ouverture dans l'app
  - sinon -> ouverture web
- Cliquer `Ouvrir dans l'application` sur la page web RSVP:
  - tente `myevent://...`
  - fallback web si non installée
