# Mettre le projet MyEvent sur GitHub

Deux façons de faire : **avec le terminal** (recommandé) ou **sans terminal** (glisser-déposer).

---

## Méthode 1 : Avec le terminal (recommandé)

### 1. Créer un compte GitHub (si besoin)

- Va sur [github.com](https://github.com) et crée un compte (gratuit).

### 2. Créer un nouveau dépôt (repo) sur GitHub

1. Connecte-toi sur GitHub.
2. Clique sur le **+** en haut à droite → **New repository**.
3. **Repository name** : par exemple `MyEvent` ou `eventmaster`.
4. **Description** : optionnel (ex. "App gestion d'événements").
5. Choisis **Public**.
6. **Ne coche pas** "Add a README file", "Add .gitignore", ni "Choose a license" (ton projet a déjà des fichiers).
7. Clique sur **Create repository**.

Tu arrives sur une page avec des commandes. **Ne les exécute pas encore** si ton projet existe déjà en local (on fait les commandes ci-dessous).

### 3. Dans le terminal, à la racine du projet

Ouvre un terminal (Cursor, VS Code, ou Terminal.app) et va dans le dossier du projet :

```bash
cd /Users/aaronmimoun/Desktop/DevPerso/MyEvent
```

Ensuite, exécute ces commandes **une par une** :

**a) Initialiser Git (si pas déjà fait)**  
Si tu n’as jamais fait `git init` dans ce dossier :

```bash
git init
```

**b) Tout ajouter et faire un premier commit**

```bash
git add .
git commit -m "Initial commit - EventMaster"
```

**c) Branche principale**

```bash
git branch -M main
```

**d) Relier le projet à ton repo GitHub**

Remplace `TON_PSEUDO` par ton identifiant GitHub et `MyEvent` par le nom exact du repo que tu as créé :

```bash
git remote add origin https://github.com/TON_PSEUDO/MyEvent.git
```

Exemple si ton pseudo est `aaronmimoun` et le repo `MyEvent` :

```bash
git remote add origin https://github.com/aaronmimoun/MyEvent.git
```

**e) Envoyer le code sur GitHub**

```bash
git push -u origin main
```

On te demandera peut-être de te connecter (login GitHub ou token). Une fois fait, le code est sur GitHub.

---

## Si tu as déjà fait `git init` ou des commits

Si tu vois une erreur du type **"remote origin already exists"** :

- Supprimer l’ancien `origin` :  
  `git remote remove origin`
- Puis refaire :  
  `git remote add origin https://github.com/TON_PSEUDO/MyEvent.git`  
  et  
  `git push -u origin main`

---

## Méthode 2 : Sans terminal (glisser-déposer)

Si tu ne veux pas utiliser le terminal :

1. Va sur [github.com](https://github.com) → connecte-toi.
2. **New repository** → nomme-le (ex. `MyEvent`) → **Create repository** (sans README, sans .gitignore).
3. Sur la page du repo, clique sur **"uploading an existing file"** (ou le lien pour upload des fichiers).
4. Glisse **tout le contenu** du dossier `MyEvent` (fichiers et dossiers : `src`, `public`, `package.json`, etc.) **sauf** le dossier `node_modules` (ne l’envoie pas).
5. En bas de page : **Commit changes**.

Attention : avec cette méthode, il n’y a pas d’historique Git sur ton PC et les prochains déploiements Vercel se feront plutôt en "upload" qu’en "push". Pour Vercel, la **méthode 1 (terminal)** est préférable.

---

## Vérifier que c’est en ligne

Ouvre dans le navigateur :  
`https://github.com/TON_PSEUDO/MyEvent`  
Tu dois voir tes fichiers (dont `package.json`, `index.html`, dossiers `components`, `api`, etc.).

Ensuite tu peux suivre [docs/VERCEL.md](VERCEL.md) à partir de l’étape 3 (importer le projet depuis GitHub vers Vercel).
