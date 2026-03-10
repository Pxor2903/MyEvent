# Migrations SQL Supabase

Certaines fonctionnalités (ex. **Missions**) nécessitent des colonnes ajoutées par des migrations.

## Appliquer une migration

### Méthode 1 : SQL Editor (recommandé)

1. Va sur [Supabase Dashboard](https://supabase.com/dashboard) → ton projet.
2. Dans le menu de gauche : **SQL Editor**.
3. Clique sur **New query**.
4. Colle le SQL de la migration ci-dessous.
5. Clique sur **Run** (ou Ctrl+Entrée).

### Méthode 2 : Supabase CLI

Si le projet est lié à Supabase CLI :
```bash
supabase db push
```

---

## Migration Missions (20250602)

Pour activer l'onglet **Missions** (création de tâches, assignation aux organisateurs) :

```sql
alter table events add column if not exists missions jsonb default '[]'::jsonb;
```

Après avoir exécuté ce SQL, la sauvegarde des missions fonctionnera.
