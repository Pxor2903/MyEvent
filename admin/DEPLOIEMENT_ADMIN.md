# Déployer l'interface admin sur Vercel

## 1. Installer les dépendances
Dans le dossier admin/ :
  cd admin
  npm install

## 2. Créer un nouveau projet Vercel
- Va sur vercel.com → Add New → Project
- Importe le même repo GitHub (Pxor2903/MyEvent)
- IMPORTANT : dans "Root Directory", mets "admin" (pas la racine)
- Framework : Vite
- Build Command : npm run build
- Output Directory : dist

## 3. Variables d'environnement sur Vercel
Ajoute dans Settings → Environment Variables :
- VITE_SUPABASE_URL = (même que l'app principale)
- VITE_SUPABASE_ANON_KEY = (même que l'app principale)

## 4. Domaine personnalisé
Dans Settings → Domains du projet admin Vercel :
- Ajoute : admin.myevent.app
- Configure le DNS chez ton registrar :
  CNAME admin → cname.vercel-dns.com

## 5. Créer le premier compte admin dans Supabase
Dans Supabase → SQL Editor → New query :
  UPDATE public.profiles
  SET role = 'admin'
  WHERE email = 'ton-email-admin@example.com';

IMPORTANT : remplace par l'email du compte déjà créé sur myEvent.
Ce compte doit exister dans auth.users avant d'exécuter ce SQL.

## 6. Tester
- Ouvre https://admin.myevent.app
- Connecte-toi avec le compte admin
- Tu dois voir le dashboard
