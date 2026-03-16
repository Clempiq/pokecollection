# PokéCollection Tracker

Application de suivi de collection d'items Pokémon scellés — React + Vite + Supabase.

## Fonctionnalités

- Authentification multi-utilisateurs (Supabase Auth)
- Ajout / modification / suppression d'items scellés
- Champs : nom, extension, type, quantité, état, prix d'achat, valeur actuelle, image, notes
- Dashboard avec stats : total items, sets, investissement, P&L
- Filtres par type, recherche par nom/set, tri

---

## 🚀 Déploiement : GitHub → Vercel

### Étape 1 — Installer les dépendances localement (optionnel, pour tester)

```bash
cd pokemon-collection-tracker
npm install
npm run dev
```

### Étape 2 — Pousser sur GitHub

```bash
cd pokemon-collection-tracker
git init
git add .
git commit -m "Initial commit - PokéCollection Tracker"
```

Crée un nouveau repo sur [github.com/new](https://github.com/new), puis :

```bash
git remote add origin https://github.com/TON_USERNAME/pokemon-collection-tracker.git
git branch -M main
git push -u origin main
```

### Étape 3 — Déployer sur Vercel

1. Va sur [vercel.com](https://vercel.com) → **Add New Project**
2. Importe ton repo GitHub `pokemon-collection-tracker`
3. Vercel détecte automatiquement Vite ✅
4. Dans **Environment Variables**, ajoute :

| Variable | Valeur |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://ikrouqkiqacgpqdfjsnu.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (voir `.env.example`) |

5. Clique **Deploy** 🎉

### Étape 4 — Configurer Supabase Auth (important !)

1. Va sur [supabase.com](https://supabase.com) → ton projet `pokemon-collection-tracker`
2. **Authentication → URL Configuration**
3. Ajoute ton URL Vercel dans **Site URL** (ex: `https://pokemon-collection-tracker.vercel.app`)
4. Ajoute aussi `http://localhost:5173` pour le dev local

---

## Variables d'environnement

Copie `.env.example` en `.env` pour le dev local (le `.env` est déjà fourni avec les valeurs).

Le `.env` est dans `.gitignore` — les valeurs seront à entrer manuellement dans Vercel.

---

## Structure du projet

```
src/
├── lib/supabase.js          # Client Supabase
├── contexts/AuthContext.jsx  # Auth state global
├── components/
│   ├── Navbar.jsx
│   ├── ProtectedRoute.jsx
│   ├── ItemCard.jsx
│   └── ItemFormModal.jsx
└── pages/
    ├── Login.jsx
    ├── Register.jsx
    ├── Dashboard.jsx
    └── Collection.jsx
```

## Base de données Supabase

Table `items` avec RLS activé — chaque utilisateur ne voit que ses propres items.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Clé primaire |
| user_id | UUID | Référence auth.users |
| name | TEXT | Nom de l'item |
| set_name | TEXT | Extension Pokémon |
| item_type | TEXT | Booster Box, ETB, Tin... |
| quantity | INT | Quantité possédée |
| condition | TEXT | Mint, Near Mint... |
| purchase_price | NUMERIC | Prix d'achat unitaire |
| current_value | NUMERIC | Valeur actuelle unitaire |
| image_url | TEXT | URL image (optionnel) |
| notes | TEXT | Notes libres |
| created_at | TIMESTAMPTZ | Date de création |
| updated_at | TIMESTAMPTZ | Date de modification |
