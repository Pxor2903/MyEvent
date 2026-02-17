# EventMaster Pro

Application de gestion d'événements avec authentification Supabase, stockage persistant et messagerie temps réel.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a local `.env` file
3. Apply the SQL schema in `supabase/schema.sql` to your Supabase project
4. Run the app:
   `npm run dev`

L’app tourne en **HTTPS** en dev. Au premier lancement, accepte le certificat dans le navigateur si demandé.

**Accès depuis le réseau (autre appareil)** : utilise l’URL affichée dans le terminal (ex. `https://192.168.x.x:3000`). Configure les **Redirect URLs** dans Supabase pour cette URL → voir [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

## Déploiement gratuit sur Vercel (URL fixe)

Pour avoir une URL fixe utilisable partout : **suis le guide pas à pas** → [docs/VERCEL.md](docs/VERCEL.md)  
(De GitHub → Vercel → variables d’environnement → Supabase → test.)
