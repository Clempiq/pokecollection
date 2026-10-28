# PokéCollection Tracker

> Une app web pour suivre sa collection de produits Pokémon scellés, sa valeur réelle et la partager avec ses amis.

**Démo :** [pokemon-collection-tracker.vercel.app](https://pokemon-collection-tracker.vercel.app)

## Le problème

Les collectionneurs de produits Pokémon scellés (boosters, coffrets, ETB) investissent parfois des sommes importantes sans savoir ce que vaut leur collection aujourd'hui. Ils suivent tout dans un tableur, oublient les dates de sortie et n'ont aucun moyen simple de montrer leur collection ou leur liste d'envies.

**Pour qui :** les collectionneurs qui veulent savoir combien ils ont investi, combien ça vaut et ce qu'il leur manque, avec un côté social pour échanger entre amis.

## Fonctionnalités clés

- **Collection** : ajout guidé d'un produit (recherche, puis formulaire), quantité, état, prix d'achat, photos, notes.
- **Prix du marché** : récupérés via l'API Pokémon TCG (Cardmarket) par une Edge Function Supabase, avec cache en base et quota journalier pour maîtriser les coûts.
- **Tableau de bord financier** : investissement total, valeur actuelle, plus ou moins-value.
- **Wishlist** partageable par lien public.
- **Social** : amis, profils, collections communes, historique d'échanges.
- **Calendrier des sorties** à venir.
- **Badges** de progression et notifications push.
- **Onboarding** et visite guidée au premier lancement.
- **Back-office admin** : utilisateurs, extensions, types de produits, synchronisation des données.
- **PWA** installable, interface en français et en anglais, mode sombre.

## Stack

| Catégorie | Technologie |
|---|---|
| Front | React 18, Vite 5, React Router 6, Tailwind CSS 3 |
| Back | Supabase (PostgreSQL avec RLS, Auth, Storage, Edge Functions) |
| Données | API Pokémon TCG via RapidAPI, sprites PokeAPI |
| Emails | Resend |
| Tests | Vitest + Testing Library (unitaires), Playwright (bout en bout) |
| Déploiement | Vercel |

## Installation

```bash
git clone https://github.com/Clempiq/pokecollection.git
cd pokecollection
npm install
cp .env.example .env   # renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
npm run dev
```

Les migrations SQL sont dans `supabase/migrations/` et les Edge Functions dans `supabase/functions/`. Dans Supabase, penser à ajouter l'URL du site et `http://localhost:5173` dans **Authentication > URL Configuration**.

La sécurité repose sur les règles RLS : chaque utilisateur ne voit que ses propres données, sauf ce qu'il partage volontairement.

### Tests

```bash
npm run test       # tests unitaires (Vitest)
npm run test:e2e   # tests bout en bout (Playwright)
npm run test:all   # les deux
```

## Statut

✅ **V1 en production.** Deux audits complets ont été menés en conditions réelles (parcours depuis l'inscription), voir [AUDIT.md](AUDIT.md) et [AUDIT_UX_UI_v2.txt](AUDIT_UX_UI_v2.txt), puis les bugs critiques et problèmes UX ont été priorisés et corrigés.

## Ce que j'ai appris

- **Auditer avant d'ajouter** : tester l'app comme un nouvel utilisateur a révélé des bugs bloquants invisibles en développement (profil non créé à l'inscription, effets en cascade sur les amis).
- **Prioriser** les retours en critique, majeur et confort, comme un backlog.
- **Maîtriser une API payante** : cache en base, quota journalier et message clair quand la limite est atteinte.
- **Sécuriser les données multi-utilisateurs** avec les règles RLS de PostgreSQL.
- **Mettre en place des tests** unitaires et bout en bout sur un projet perso.
