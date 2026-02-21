# Dépendances du projet (app web)

Référence rapide des paquets npm et de leur rôle.

---

## Production

| Paquet | Rôle |
|--------|------|
| **react** / **react-dom** | UI (React 19). |
| **@supabase/supabase-js** | Client Supabase : auth, base de données, Realtime. |
| **@capacitor/core** | Runtime Capacitor (détection plateforme, pont natif). |
| **@capacitor/ios** / **@capacitor/android** | Projets natifs iOS/Android (shell WebView). |
| **@capacitor/cli** | CLI : `cap sync`, `cap open ios/android`. |
| **@capacitor-community/contacts** | Plugin Contacts pour Capacitor (lecture contacts appareil en app emballée). |

---

## Développement

| Paquet | Rôle |
|--------|------|
| **vite** | Build et serveur de dev. |
| **@vitejs/plugin-react** | Support React (JSX, HMR). |
| **typescript** | Typage. |
| **@types/node** | Types Node pour Vite (path, etc.). |
| **vite-plugin-mkcert** / **@vitejs/plugin-basic-ssl** | HTTPS en dev (certificat local). |

---

## Scripts (package.json)

- **dev** : `vite` — serveur de dev (port 3000, HTTPS).
- **build** : `vite build` — sortie dans `dist/`.
- **preview** : `vite preview` — prévisualisation du build.
- **cap:sync** : build + `npx cap sync` — met à jour ios/android avec le contenu de `dist/`.
- **cap:ios** / **cap:android** : sync + ouverture du projet natif.

---

## Variables d’environnement

- **VITE_SUPABASE_URL** : URL du projet Supabase.
- **VITE_SUPABASE_ANON_KEY** : clé anonyme (publique) du projet.

Définies dans `.env` (non versionné). Voir `.env.example` en modèle.
