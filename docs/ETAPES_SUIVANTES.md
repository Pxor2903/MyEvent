# Étapes à faire après la configuration

## 0. (Recommandé) Certificat reconnu – plus d’avertissement du navigateur

Pour que le navigateur ne affiche plus « Connexion non sécurisée », fais **une seule fois** :

1. **Installe mkcert**  
   - Mac : `brew install mkcert`  
   - Windows : `choco install mkcert` ou Scoop (voir [mkcert](https://github.com/FiloSottile/mkcert))

2. **Installe la racine de confiance** :
   ```bash
   mkcert -install
   ```

Ensuite, quand tu lances l’app, le certificat sera reconnu automatiquement sur ta machine (plus d’avertissement).  
Si tu ne fais pas cette étape, tu pourras quand même accéder au site en cliquant sur « Avancé » puis « Accéder au site ».

---

## 1. Lancer l’app en local

Dans le dossier du projet, ouvre un terminal et exécute :

```bash
npm run dev
```

Tu dois voir une adresse du type :
- `https://localhost:3000`
- et souvent aussi `https://192.168.x.x:3000` (l’IP de ton PC sur le réseau)

Ouvre **https://localhost:3000** dans ton navigateur.

- **Si tu as fait l’étape 0 (mkcert)** : la page s’affiche sans avertissement.
- **Sinon** : le navigateur peut afficher « Connexion non sécurisée ». Clique sur **« Avancé »** puis **« Accéder au site »** (une fois par appareil).

---

## 2. Configurer Supabase pour accepter tes URLs

Sans cette étape, la connexion (surtout depuis un autre appareil) peut échouer.

1. Va sur [supabase.com](https://supabase.com) et connecte-toi.
2. Ouvre ton **projet** (celui utilisé par EventMaster).
3. Dans le menu de gauche : **Authentication** → **URL Configuration**.
4. Dans **Redirect URLs**, tu dois avoir une liste d’URLs. **Ajoute** les suivantes (une par ligne, en gardant celles déjà présentes) :
   - `https://localhost:3000/**`
   - `http://localhost:3000/**`
   - Si tu veux ouvrir l’app depuis ton téléphone ou un autre PC sur le même Wi‑Fi : ajoute aussi  
     `https://TA_IP:3000/**`  
     en remplaçant **TA_IP** par l’adresse affichée dans le terminal (ex. `192.168.1.42`), donc par ex. :  
     `https://192.168.1.42:3000/**`
5. Clique sur **Save** pour enregistrer.

---

## 3. Tester la connexion

- Sur ton PC : va sur **https://localhost:3000**, connecte-toi avec ton compte (email / mot de passe ou Google). Ça doit fonctionner.
- Depuis un autre appareil (téléphone, autre PC) sur le **même Wi‑Fi** :
  - Dans le terminal où tourne `npm run dev`, repère l’URL du type `https://192.168.x.x:3000`.
  - Sur l’autre appareil, ouvre le navigateur et va à **cette même URL**.
  - Accepte l’avertissement de certificat une fois (« Avancé » → « Accéder au site »).
  - Tu devrais pouvoir te connecter comme sur ton PC.

---

## 4. Si après Google tu es redirigé vers localhost au lieu de l’IP

C’est que l’URL de ton IP n’est pas dans les **Redirect URLs** Supabase. Supabase renvoie alors vers la **Site URL** (souvent localhost).

- Va dans **Authentication** → **URL Configuration**.
- Ajoute dans **Redirect URLs** : `https://TON_IP:3000/**` (avec l’IP affichée dans le terminal).
- Clique sur **Save**, puis réessaie la connexion Google en ouvrant l’app **depuis l’URL en IP** (pas depuis localhost).

## 5. Si ça ne marche pas (général)

- Vérifie que tu as bien **ajouté toutes les URLs** (localhost + ton IP) dans **Redirect URLs** et cliqué sur **Save**.
- Vérifie que tu utilises **https://** (et pas http) pour l’accès depuis le réseau.
- Vérifie que ton fichier **.env** contient bien `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (les mêmes que dans le dashboard Supabase).

En résumé : **lancer l’app** → **ajouter les URLs (dont l’IP) dans Supabase Redirect URLs** → **tester en https**. Si tu te connectes depuis l’IP, ouvre l’app avec l’URL en IP (pas localhost) pour que la redirection après Google reste sur l’IP.
