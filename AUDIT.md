# 📋 Rapport d'audit complet — PokéCollection
**Date :** 24 mars 2026
**Méthode :** Test en conditions réelles via Claude in Chrome, compte test créé from scratch (AuditTester), parcours complet depuis l'inscription.

---

## 🔴 CRITIQUE — Bugs bloquants

### 1. Profil non créé à l'inscription
**Fichier concerné :** trigger Supabase `handle_new_user`
**Impact :** MAJEUR — bloque plusieurs fonctionnalités en cascade

Le trigger Supabase censé créer automatiquement une ligne dans la table `profiles` lors d'une inscription ne fonctionne pas. Conséquences :
- Le username saisi à l'inscription (ex: "AuditTester") est perdu
- La navbar affiche l'email tronqué au lieu du pseudo
- La page profil affiche "@..." avec un avatar "?" au lieu de l'initiale
- Les demandes d'amis échouent silencieusement (violation de contrainte FK sur `profiles`)

**Correction :** Vérifier/recréer le trigger `handle_new_user` sur `auth.users` :
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```
S'assurer aussi que lors de l'inscription (`Register.jsx`), le `username` est bien passé dans `options.data` de `supabase.auth.signUp()`.

---

### 2. Demandes d'amis échouent silencieusement
**Fichier concerné :** `src/pages/Friends.jsx` → fonction `sendRequest`
**Impact :** MAJEUR — fonctionnalité sociale inutilisable pour les nouveaux comptes

L'insert dans `friendships` échoue sans message d'erreur visible. L'UI ne donne aucun retour à l'utilisateur (pas de toast d'erreur, pas de section "Demandes envoyées" qui apparaît). La cause racine est le bug #1 (pas de profil = FK violation), mais même une fois ce bug corrigé, la gestion d'erreur dans `sendRequest` doit être renforcée.

**Correction :** Ajouter un `try/catch` explicite avec toast d'erreur :
```javascript
const sendRequest = async (addresseeId) => {
  try {
    const { error } = await supabase.from('friendships').insert({
      requester_id: user.id,
      addressee_id: addresseeId,
      status: 'pending'
    })
    if (error) throw error
    // ... notification push
    showToast('Demande envoyée !', 'success')
  } catch (err) {
    showToast('Erreur lors de l\'envoi de la demande.', 'error')
    console.error(err)
  }
  fetchFriendships()
}
```

---

### 3. Bug de clé dupliquée dans Toast.jsx
**Fichier concerné :** `src/components/Toast.jsx`
**Impact :** MOYEN — les notifications peuvent se dupliquer ou disparaître

La console affiche 6+ fois :
`Warning: Encountered two children with the same key (1774381923137)`
Les toasts utilisent `Date.now()` comme clé. Si deux notifications se déclenchent dans la même milliseconde, les clés sont identiques et React perd le tracking des composants.

**Correction :** Utiliser un compteur ou `crypto.randomUUID()` au lieu de `Date.now()` :
```javascript
// Au lieu de : id: Date.now()
id: crypto.randomUUID()
// ou : id: `toast-${Date.now()}-${Math.random()}`
```

---

## 🟠 IMPORTANT — Fonctionnel mais problématique

### 4. Noms de produits et sets toujours en anglais
**Fichiers concernés :** `src/pages/Collection.jsx`, `src/pages/Dashboard.jsx`, `src/pages/FriendCollection.jsx`, `src/components/item-form/SearchStep.jsx`
**Impact :** MOYEN — incohérence avec l'objectif de localisation FR

Malgré le travail effectué sur `name_fr` en base de données, les noms s'affichent en anglais dans :
- La liste de collection (nom de l'item + nom du set)
- Le dashboard "Derniers ajouts" (colonnes ITEM et SET)
- La page collection ami `/friend/:userId`
- Les résultats de recherche dans le formulaire d'ajout
- Le champ "Extension" dans le formulaire détail

Le `name_fr` existe dans la DB mais le `full_data` JSONB stocké dans `collection_items` ne contient probablement pas `name_fr` pour les items déjà ajoutés. Les nouveaux items ajoutés après la migration du trigger devraient l'avoir.

**Correction :** Pour les items existants, mettre à jour le `full_data` JSONB avec `name_fr`. Pour l'affichage, utiliser systématiquement `item.full_data?.name_fr || item.full_data?.name` dans tous les composants qui affichent des noms de produits.

---

### 5. Classement de pertinence de la recherche sous-optimal
**Fichier concerné :** `src/lib/pokemonApi.js` → `searchProductsFromCache`
**Impact :** MOYEN — UX de recherche dégradée

En cherchant "Flamme Blanche ETB" (nom FR exact du White Flare ETB), le résultat attendu arrive en 5ème position. Des items avec correspondance partielle (Ascended Heroes, Mega Evolution) apparaissent avant.

Analyse : La logique AND par mot fonctionne, mais le score de pertinence favorise trop les items où "ETB" correspond à "Elite Trainer Box" dans plusieurs noms différents. Le score ne bénéficie pas suffisamment à la correspondance exacte du nom de set FR.

**Correction suggérée :** Ajouter un bonus fort (+300 pts) quand le `name_fr` contient tous les mots de la requête, et augmenter la pénalité de longueur pour déprioritiser les noms trop génériques.

---

### 6. Item "Sans nom" dans les Collections Communes
**Fichier concerné :** `src/pages/SharedCollection.jsx` ou composant d'item
**Impact :** MOYEN — donnée incohérente visible par tous les membres de la collection

Un item Booster de "Méga Evolution (ME01)" dans la collection commune "fefvsd" s'affiche comme "Sans nom" avec une valeur marché à 0€ (P&L -100%). Le nom du produit n'est pas récupéré ou stocké lors de l'ajout à une collection commune.

**Correction :** Vérifier que lors de l'ajout d'un item à une collection commune, le `name` (et `name_fr`) du produit est bien sauvegardé dans la table correspondante.

---

## 🟡 UX — Améliorations souhaitables

### 7. Pas de redirection après inscription
**Fichier concerné :** `src/pages/Register.jsx`

Après la création du compte, le formulaire reste affiché avec le message de succès. L'utilisateur doit chercher le lien "Se connecter" tout en bas. Rediriger automatiquement vers `/login` après 2–3 secondes, ou proposer un CTA centré et visible "→ Me connecter".

---

### 8. Autocomplete navigateur pollue le champ PSEUDO
**Fichier concerné :** `src/pages/Register.jsx`

À l'ouverture de `/register`, le gestionnaire de mots de passe du navigateur injecte automatiquement l'email dans le champ PSEUDO, déclenchant immédiatement l'erreur rouge de validation. Solution rapide :
```jsx
<input
  name="username"
  autoComplete="username"   // ou "off"
  ...
/>
```

---

### 9. Prix d'achat potentiellement visible dans la collection d'un ami
**Fichier concerné :** `src/pages/FriendCollection.jsx`

Sur `/friend/:userId`, les colonnes ACHAT et VALEUR affichent les prix d'achat de l'ami. Ce n'est pas forcément souhaitable — un ami peut ne pas vouloir exposer combien il a payé ses items. Envisager de masquer le prix d'achat sur la vue ami et n'afficher que la valeur marché actuelle.

---

### 10. Bio absente sur la page profil ami
**Fichier concerné :** `src/pages/FriendProfile.jsx`

La page `/profile/:userId` affiche les badges (pokémon, type, style, année) mais pas la bio texte libre, même quand elle est remplie. Ajouter l'affichage du champ `bio` sous le nom d'utilisateur.

---

## 🟢 MINEUR — Petits détails

### 11. React Router future flag warnings
**Fichier concerné :** `src/main.jsx` ou fichier de config du router

Deux avertissements console au démarrage :
- `v7_startTransition`
- `v7_relativeSplatPath`

**Correction :**
```jsx
<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
```

---

### 12. "Méga Évolution" sans trait d'union sur la page Sorties
**Impact :** Cosmétique — le nom officiel FR est "Méga-Évolution" (avec trait d'union)
À corriger dans les données de la table des releases.

---

### 13. Images génériques sur la page Sorties
Les extensions à venir affichent une icône de presse-papiers (📋) au lieu d'une vraie image de set. Si des images officielles sont disponibles via le TCG API, les afficher ici améliorerait considérablement l'aspect visuel de la page.

---

### 14. Légère incohérence de valeur entre Collection et Dashboard
La page Collection affichait 656€ tandis que le Dashboard affichait 682€ pour le même compte. Probablement un périmètre de calcul différent (items scellés uniquement vs tous les items). À documenter ou harmoniser.

---

## ✅ Ce qui fonctionne très bien

| Fonctionnalité | Statut |
|---|---|
| Interface générale — design soigné, cohérent, professionnel | ✅ |
| Connexion / déconnexion fluide | ✅ |
| Formulaire d'inscription : validation pseudo en temps réel (disponible/indisponible) | ✅ |
| Indicateur de force du mot de passe (4/4) | ✅ |
| Ajout d'item : récupération auto du prix Cardmarket FR | ✅ |
| Ajout d'item : image réelle du produit dans les résultats | ✅ |
| Fiche détail item : image HD, P&L, date d'achat, boutons Vendre/Desceller | ✅ |
| Vue liste et vue grille de la collection | ✅ |
| Filtres par type dans la collection (ETB, Tin, Blister…) | ✅ |
| Dashboard avec graphe d'évolution de valeur | ✅ |
| Calendrier des sorties avec compte à rebours (J-3, J-10…) | ✅ |
| Collections Communes : liste, détail, ajout d'item | ✅ |
| Page profil ami `/profile/:userId` : bannière, badges, stats, grille 4 items | ✅ |
| Boutons "👤 Profil" et "👥 Collection" sur la page Amis | ✅ |
| Navigation Amis → Profil → "Voir la collection complète" | ✅ |
| Page collection ami `/friend/:userId` : filtres, photos, badges état | ✅ |
| Recherche produit en français (fonctionne via `name_fr`) | ✅ |
| Recherche d'amis en temps réel avec debounce 300ms | ✅ |
| Autocomplétion Pokémon dans le profil dresseur (Pikachu #0025…) | ✅ |
| Sauvegarde du profil dresseur (bio, pokémon favori, type, style, année) | ✅ |

---

## 📊 Résumé par priorité

| # | Problème | Priorité | Effort estimé |
|---|---|---|---|
| 1 | Profil non créé à l'inscription (trigger manquant) | 🔴 CRITIQUE | 30 min |
| 2 | Demandes d'amis échouent silencieusement | 🔴 CRITIQUE | 1h |
| 3 | Bug clé dupliquée Toast.jsx | 🔴 CRITIQUE | 15 min |
| 4 | Noms produits/sets toujours en anglais | 🟠 IMPORTANT | 2–3h |
| 5 | Pertinence recherche sous-optimale | 🟠 IMPORTANT | 1–2h |
| 6 | "Sans nom" dans Collections Communes | 🟠 IMPORTANT | 1h |
| 7 | Pas de redirection après inscription | 🟡 UX | 15 min |
| 8 | Autocomplete PSEUDO pollué par navigateur | 🟡 UX | 5 min |
| 9 | Prix d'achat visible chez un ami | 🟡 UX | 30 min |
| 10 | Bio absente sur page profil ami | 🟡 UX | 15 min |
| 11 | React Router future flag warnings | 🟢 MINEUR | 5 min |
| 12 | "Méga Évolution" sans trait d'union | 🟢 MINEUR | 5 min |
| 13 | Images génériques sur page Sorties | 🟢 MINEUR | variable |
| 14 | Incohérence valeur Collection vs Dashboard | 🟢 MINEUR | 30 min |
