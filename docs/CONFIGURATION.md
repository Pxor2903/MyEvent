# Configuration et accès depuis le réseau

## Certificat reconnu par le navigateur (plus d’avertissement)

L’app utilise **mkcert** pour générer un certificat HTTPS que ton navigateur peut reconnaître (sans message « Connexion non sécurisée »).

**À faire une seule fois sur ta machine :**

1. **Installer mkcert**  
   - **Mac** : `brew install mkcert`  
   - **Windows** : avec [Chocolatey](https://chocolatey.org/) : `choco install mkcert` ; ou avec [Scoop](https://scoop.sh/) : `scoop bucket add extras` puis `scoop install mkcert`  
   - **Linux** : voir [github.com/FiloSottile/mkcert](https://github.com/FiloSottile/mkcert#installation)

2. **Installer la « racine » mkcert** (pour que le navigateur fasse confiance aux certificats générés) :
   ```bash
   mkcert -install
   ```

Après ça, quand tu lances `npm run dev`, le certificat est généré automatiquement pour `localhost` et l’IP de ta machine. Ton navigateur le reconnaîtra **sans avertissement** sur ce PC.

**Depuis un autre appareil** (téléphone, autre PC) : le certificat ne sera pas reconnu tant que tu n’as pas installé la même racine mkcert sur cet appareil (possible sur mobile, un peu plus technique). Sinon, tu peux utiliser un tunnel (ex. Cloudflare Tunnel, ngrok) pour avoir une URL publique avec un vrai certificat.

## HTTPS en développement

L’app tourne en **HTTPS** en dev (`npm run dev`). Cela permet :

- d’accéder à l’app depuis un autre appareil sur le réseau (ex. `https://192.168.1.10:3000`) ;
- d’éviter les blocages des navigateurs ou pare-feu sur le trafic HTTP non sécurisé ;
- de faire fonctionner correctement les cookies de session et Supabase Auth.

## Supabase – URLs autorisées (obligatoire pour Google / connexion depuis l’IP)

Si tu te connectes **depuis l’adresse IP** (ex. `https://192.168.1.42:3000`) et que après Google tu es renvoyé sur **localhost**, c’est que Supabase n’a pas cette IP dans les URLs autorisées. Il utilise alors la « Site URL » (souvent localhost) pour la redirection.

**À faire :**

1. Ouvre le **Dashboard Supabase** → ton projet.
2. Va dans **Authentication** → **URL Configuration**.
3. **Site URL**  
   - En dev sur ta machine : tu peux laisser `https://localhost:3000` ou mettre l’URL par laquelle tu ouvres l’app le plus souvent.
   - Si tu testes surtout depuis l’IP, mets la même URL que celle que tu utilises (ex. `https://192.168.1.42:3000`).
4. **Redirect URLs**  
   Ajoute **toutes** les URLs possibles. **L’URL doit correspondre exactement** à celle envoyée par l’app, sinon Supabase redirige vers la Site URL (localhost).
   - `https://localhost:3000/**`
   - `http://localhost:3000/**`
   - **Pour l’accès depuis l’IP** : ajoute **les deux** (pour couvrir tous les cas) :
     - `https://192.168.1.XX:3000/`  
     - `https://192.168.1.XX:3000/**`  
     (remplace par ton IP réelle, ex. `https://192.168.1.42:3000/` et `https://192.168.1.42:3000/**`).
   - En production : `https://tondomaine.com/**`

   Sur l’écran de connexion (quand tu es sur l’IP), l’app affiche l’URL exacte à ajouter. Tu peux aussi ouvrir la console du navigateur (F12) avant de cliquer sur « Continuer avec Google » : un message indique le `redirectTo` envoyé.
   Clique sur **Save**. Après ça, réessaie la connexion Google depuis l’URL en IP.

## Variables d’environnement

- Ne **commite jamais** `.env` ou `.env.local` (ils sont dans `.gitignore`).
- Crée un fichier `.env` à la racine avec :
  - `VITE_SUPABASE_URL` = l’URL de ton projet Supabase
  - `VITE_SUPABASE_ANON_KEY` = la clé anon (publique) du projet

La clé anon est faite pour être utilisée côté client ; la sécurité repose sur les **RLS** (Row Level Security) dans Supabase.

## En production

- Héberge l’app en **HTTPS** (Vercel, Netlify, etc. le font par défaut).
- Dans Supabase, **Redirect URLs** et **Site URL** doivent pointer vers ton domaine de production (ex. `https://monapp.vercel.app/**`).
