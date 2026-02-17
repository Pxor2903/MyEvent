# Déployer EventMaster en gratuit (Vercel ou Netlify)

Une fois déployé, tu auras une **URL fixe** (ex. `https://myevent.vercel.app`) utilisable partout, sans dépendre de ton IP.

---

## Variables d’environnement

Tu en auras besoin sur les deux plateformes. Récupère-les depuis ton **Dashboard Supabase** → ton projet → **Settings** → **API** :

- **VITE_SUPABASE_URL** : l’URL du projet (ex. `https://xxxxx.supabase.co`)
- **VITE_SUPABASE_ANON_KEY** : la clé « anon » publique

---

## Option 1 : Vercel (recommandé, gratuit)

**Guide détaillé pas à pas : [VERCEL.md](VERCEL.md)** – à suivre en priorité.

### 1. Compte et repo

1. Va sur [vercel.com](https://vercel.com) et crée un compte (gratuit, avec GitHub/GitLab/Email).
2. Pousse ton projet sur **GitHub** (ou GitLab/Bitbucket) si ce n’est pas déjà fait :
   - Crée un repo sur GitHub, puis dans ton projet en local :
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/TON_USER/TON_REPO.git
   git branch -M main
   git push -u origin main
   ```

### 2. Importer le projet sur Vercel

1. Sur [vercel.com](https://vercel.com), clique sur **Add New** → **Project**.
2. **Import** ton repo GitHub (ou déploie avec **Vercel CLI** sans GitHub, voir plus bas).
3. **Configure le projet** :
   - **Framework Preset** : Vite (détecté automatiquement si le repo contient `vite.config.ts`).
   - **Root Directory** : laisse vide si tout le projet est à la racine.
   - **Build Command** : `npm run build` (souvent déjà rempli).
   - **Output Directory** : `dist`.
4. **Environment Variables** : ajoute :
   - `VITE_SUPABASE_URL` = ton URL Supabase  
   - `VITE_SUPABASE_ANON_KEY` = ta clé anon  
   Clique sur **Add** pour chaque, puis **Deploy**.

### 3. Après le déploiement

- Vercel te donne une URL du type `https://ton-projet.vercel.app`.
- Va dans **Supabase** → **Authentication** → **URL Configuration** :
  - **Site URL** : `https://ton-projet.vercel.app`
  - **Redirect URLs** : ajoute `https://ton-projet.vercel.app/**` et `https://ton-projet.vercel.app/`
- Sauvegarde. Tu peux maintenant te connecter (y compris avec Google) depuis cette URL fixe.

### Déployer sans GitHub (Vercel CLI)

```bash
npm i -g vercel
cd /chemin/vers/MyEvent
vercel
```

Suis les questions (link to existing project ou nouveau). Quand on te demande les variables, ajoute `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`. À la fin, note l’URL fournie et mets-la dans Supabase comme ci‑dessus.

---

## Option 2 : Netlify (gratuit)

### 1. Compte et repo

1. Va sur [netlify.com](https://netlify.com) et crée un compte.
2. Ton projet doit être sur **GitHub** (ou GitLab/Bitbucket), comme pour Vercel.

### 2. Nouveau site

1. **Add new site** → **Import an existing project**.
2. Choisis **GitHub** et autorise Netlify, puis sélectionne ton repo.
3. **Build settings** (souvent pré-remplis grâce à `netlify.toml`) :
   - **Build command** : `npm run build`
   - **Publish directory** : `dist`
4. **Environment variables** → **Add variables** → **Add single variable** :
   - `VITE_SUPABASE_URL` = ton URL Supabase  
   - `VITE_SUPABASE_ANON_KEY` = ta clé anon  
5. **Deploy site**.

### 3. Après le déploiement

- Netlify te donne une URL du type `https://nom-aleatoire.netlify.app`.
- Dans **Supabase** → **Authentication** → **URL Configuration** :
  - **Site URL** : `https://nom-aleatoire.netlify.app`
  - **Redirect URLs** : `https://nom-aleatoire.netlify.app/**` et `https://nom-aleatoire.netlify.app/`
- Sauvegarde. Connexion et Google fonctionnent depuis cette URL fixe.

### Déployer sans Git (Netlify « drag & drop »)

1. En local : `npm run build`
2. Sur [app.netlify.com](https://app.netlify.com) : **Add new site** → **Deploy manually**.
3. Glisse le dossier **dist** dans la zone de dépôt.
4. Les variables d’environnement ne sont pas injectées dans un build « drag & drop ». Pour Supabase en prod, il vaut mieux utiliser **Import from Git** et définir les variables dans Netlify, puis redéployer. Sinon, tu peux build en local avec un `.env.production` puis déployer le `dist`, mais ce n’est pas idéal pour la clé.

Donc pour une config propre et gratuite : **Import from Git** + variables dans Netlify.

---

## Récap

| Étape | Vercel | Netlify |
|--------|--------|--------|
| 1 | Compte + repo GitHub | Compte + repo GitHub |
| 2 | Import project → ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` | Add new site → Import → ajouter les mêmes variables |
| 3 | Deploy → récupérer l’URL | Deploy → récupérer l’URL |
| 4 | Supabase : Site URL + Redirect URLs = cette URL | Idem |

Les deux offrent un **plan gratuit** suffisant pour ce projet. Une fois l’URL de prod configurée dans Supabase, tu n’as plus besoin de l’IP locale pour te connecter.
