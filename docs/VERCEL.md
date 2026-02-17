# Déployer EventMaster sur Vercel – Ce que tu dois faire maintenant

Guide pas à pas pour avoir une **URL fixe** (ex. `https://myevent.vercel.app`) en gratuit.

---

## Étape 1 : Récupérer les clés Supabase

1. Ouvre [supabase.com](https://supabase.com) → ton projet **MyEvent**.
2. Menu de gauche : **Settings** (roue dentée) → **API**.
3. Note quelque part :
   - **Project URL** (ex. `https://abcdefgh.supabase.co`) → ce sera **VITE_SUPABASE_URL**
   - **Project API keys** → **anon** **public** (bouton "Reveal" puis copie) → ce sera **VITE_SUPABASE_ANON_KEY**

Tu en auras besoin à l’étape 4.

---

## Étape 2 : Mettre le projet sur GitHub

Si le projet est **déjà** sur GitHub, passe à l’étape 3.

Sinon, dans un terminal à la racine du projet (`MyEvent`) :

```bash
git init
git add .
git commit -m "Initial commit - EventMaster"
```

Ensuite :

1. Va sur [github.com](https://github.com) → connecte-toi → **New repository**.
2. Nom du repo : par ex. `MyEvent` (ou `eventmaster`).
3. Laisse **Public**, ne coche pas "Add a README" si tu as déjà des fichiers.
4. Crée le repo. GitHub te donne une URL du type `https://github.com/TON_USER/MyEvent.git`.
5. Dans ton terminal (toujours à la racine du projet) :

```bash
git remote add origin https://github.com/TON_USER/MyEvent.git
git branch -M main
git push -u origin main
```

Remplace `TON_USER/MyEvent` par ton compte et le nom du repo. Si on te demande un login, utilise ton compte GitHub (ou un token).

---

## Étape 3 : Créer un compte Vercel et importer le projet

1. Va sur [vercel.com](https://vercel.com).
2. Clique sur **Sign Up** et connecte-toi avec **GitHub** (le plus simple pour importer le repo).
3. Une fois connecté : **Add New…** → **Project**.
4. Tu vois la liste de tes repos GitHub. Choisis **MyEvent** (ou le nom du repo).
5. Clique sur **Import** à côté du repo.

---

## Étape 4 : Configurer le projet et les variables

Sur l’écran **Configure Project** :

1. **Project Name** : laisse tel quel (ex. `my-event`) ou change si tu veux.
2. **Framework Preset** : doit être **Vite**. Si ce n’est pas le cas, choisis **Vite**.
3. **Root Directory** : laisse vide (`.`).
4. **Build and Output Settings** (souvent déjà bons) :
   - Build Command : `npm run build`
   - Output Directory : `dist`
5. **Environment Variables** (très important) :
   - Clique sur **Add** (ou "Environment Variable").
   - **Name** : `VITE_SUPABASE_URL`  
     **Value** : colle l’URL Supabase (étape 1).  
     Laisse **Production** (et Preview si tu veux les deux).  
     Clique **Add**.
   - **Name** : `VITE_SUPABASE_ANON_KEY`  
     **Value** : colle la clé **anon public** (étape 1).  
     **Add**.
6. Clique sur **Deploy**.

Vercel lance le build. Attends 1 à 2 minutes.

---

## Étape 5 : Récupérer l’URL du site

Quand le déploiement est **Ready** :

1. Tu vois un écran de succès avec un lien du type **Visit** ou l’URL du projet.
2. Clique dessus ou copie l’URL : elle ressemble à `https://my-event-xxx.vercel.app` (ou un autre sous-domaine).
3. **Garde cette URL** : c’est ton URL fixe.

---

## Étape 6 : Configurer Supabase pour cette URL

Sans ça, la connexion (surtout Google) ne fonctionnera pas sur l’URL Vercel.

1. Retourne sur **Supabase** → ton projet.
2. **Authentication** → **URL Configuration**.
3. **Site URL** : remplace par ton URL Vercel (avec `https://`), ex. :  
   `https://my-event-xxx.vercel.app`
4. **Redirect URLs** : assure-toi d’avoir au moins :
   - `https://my-event-xxx.vercel.app/`
   - `https://my-event-xxx.vercel.app/**`  
   (remplace par **ton** sous-domaine Vercel).
5. Clique sur **Save** (ou "Save changes").

---

## Étape 7 : Tester

1. Ouvre l’URL Vercel dans ton navigateur (ex. `https://my-event-xxx.vercel.app`).
2. Tu dois voir l’écran de connexion EventMaster.
3. Connecte-toi avec **email / mot de passe** ou **Continuer avec Google**.
4. Si tout est bon : tu es redirigé correctement et tu restes sur l’URL Vercel.

Tu peux utiliser cette URL depuis n’importe quel réseau (4G, autre Wi‑Fi, etc.) : elle ne change pas.

---

## Si le build échoue sur Vercel

- Vérifie dans l’onglet **Build Logs** l’erreur affichée.
- Vérifie que les deux variables **VITE_SUPABASE_URL** et **VITE_SUPABASE_ANON_KEY** sont bien définies ( **Project** → **Settings** → **Environment Variables** ).
- En local, lance `npm run build` : si ça échoue, corrige l’erreur avant de redéployer.

---

## Mises à jour après coup

À chaque `git push` sur la branche connectée (souvent `main`), Vercel redéploie automatiquement. Tu n’as rien à refaire côté Vercel ou Supabase tant que l’URL du projet ne change pas.

**Récap** : GitHub → Vercel (Import + variables) → Déploy → noter l’URL → Supabase (Site URL + Redirect URLs) → tester.
