# Envoyer les modifications sur GitHub

**Je ne pousse pas automatiquement les modifications sur GitHub.** Seules les fichiers de ton projet sont modifiés sur ton ordinateur. C’est à toi de faire un **commit** puis un **push** pour que les changements soient sur GitHub (et que Vercel redéploie si le projet est connecté).

---

## Méthode 1 : Script rapide

À la racine du projet, dans un terminal :

```bash
sh scripts/push-to-github.sh "Description de tes changements"
```

Exemple :

```bash
sh scripts/push-to-github.sh "Amélioration ergonomie et correctifs"
```

Le script ajoute tous les fichiers modifiés, crée un commit avec le message que tu donnes, puis pousse sur la branche `main`.

---

## Méthode 2 : Commandes manuelles

```bash
git add -A
git status
git commit -m "Ta description ici"
git push origin main
```

---

## Méthode 3 : Depuis Cursor / VS Code

1. Ouvre le panneau **Source Control** (icône branche à gauche, ou Ctrl+Shift+G).
2. Tu vois la liste des fichiers modifiés.
3. Écris un message de commit en haut, puis clique sur **Commit** (✓).
4. Clique sur **Sync** ou **Push** pour envoyer sur GitHub.

---

Une fois le push fait, si ton projet Vercel est relié au repo GitHub, le prochain déploiement se lancera automatiquement.
