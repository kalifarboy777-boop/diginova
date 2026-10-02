# Décisions

- **2026-10-01 — Architecture en deux dossiers** : `backend/` (API Laravel 13 + Sanctum) et `frontend/` (Next.js 15), à la demande de l'utilisateur. Cela remplace Prisma / Auth.js / Server Actions de la spécification initiale par Eloquent / Sanctum / API REST. Les règles métier restent identiques.
- **2026-10-01 — Base de données en dev** : Docker n'est pas encore installé dans WSL, donc le backend tourne sur SQLite (`database/database.sqlite`). Il passera sur PostgreSQL 16 (`docker compose up -d`) dès que Docker sera disponible. La recherche `pg_trgm` aura un repli `LIKE` sous SQLite.
- **2026-10-01 — Outils sans sudo** : PHP 8.4 statique et Composer installés dans `~/.local/bin`, Node 22 + pnpm via nvm.
- **2026-10-01 — Rayons supplémentaires** : l'export CSS du panier utilise 10 px (boutons, coupon), 14 px (visuels, bandeau info) et 20 px (cartes). Ces rayons sont ajoutés aux tokens (`rounded-btn`, `rounded-cover`, `rounded-card`).
- **2026-10-01 — Texte de l'upsell** : il utilise #C7D2FE sur brand/deep, ajouté en token `brand-deep-muted`.

## Design et Figma

- **Récupération des maquettes** : le siège Figma de l'utilisateur est « View », ce qui limite le MCP à 6 appels par mois. Les 42 écrans ont donc été exportés en un seul appel à l'API REST Figma (PNG 2x, `design/screens/`). Les données des nœuds ont été récupérées en un autre appel (`design/figma-cache/nodes.json`), puis converties en fiches lisibles (`*.spec.txt`) avec la géométrie exacte des visuels (`covers.spec.txt`).
- **Visuels produits** : `ProductCover` reproduit en SVG les 8 visuels du Figma (chart, grid, chat, sheet, doc, notion, book, brand) à partir de la géométrie exacte du cadre 302 × 227. Une image d'aperçu réelle la remplace dès qu'un créateur en téléverse une.
- **Séparateur de milliers** : Intl `fr-FR` produit une espace fine insécable (U+202F) sans chasse dans Inter. On utilise l'espace insécable U+00A0, ce qui donne bien « 12 000 FCFA » comme dans le Figma.
- **Illustration du hero « Devenir créateur »** : le mini-tableau de bord (« Bonjour Jean », 420 000 F) est une illustration marketing figée (aria-hidden). Les chiffres réels (commission, délais) viennent de l'API.
- **Avis de l'accueil** : les maquettes indiquaient « Avis d'exemple ». On affiche de vrais avis 5★ du seed, un par produit phare.
- **Indicateur admin** : le 6ᵉ indicateur de l'écran 50 est le **taux de remboursement**, et non la conversion.

## Données (seed)

- **Emails des personas** : `@exemple.ci` au lieu des adresses Gmail des maquettes, pour éviter d'écrire à de vraies boîtes.
- **Candidatures de l'écran 53** : Jean Kouassi est déjà créateur Pro (écran 41). La candidature « Jean Kouassi Design » appartient donc à un compte distinct (`jean.design@exemple.ci`), de même pour Mariam Sylla Studio, Compta Express et Ibrahim Koné. La file de modération (écran 51) utilise d'autres studios fictifs (Teranga Studio, Agro Guides, Compta Facile, Juris Facile).
- **Soldes du studio de Jean** : l'historique des ventes est généré, puis une écriture « Solde d'ouverture » aligne le solde disponible sur la maquette (312 000 FCFA). 12 retraits totalisent 1 840 000 FCFA. Les 30 derniers jours comptent 84 ventes (+12, +18 %).
- **Volumes affichés** (184 produits Business, 1 126 commandes…) : ce sont les **données réelles du seed**, plus modestes que les chiffres d'exemple des maquettes.
- **Fichiers de démonstration** : de vrais PDF, ZIP, DOCX et XLSX, très légers et générés au seed. Les tailles affichées sont les tailles réelles.

## Règles métier ajoutées ou précisées

- **Panier conservé en cas d'échec** (écran 24) : la commande garde une référence au panier, qui n'est vidé qu'à la confirmation du paiement.
- **« Souvent achetés ensemble »** : les articles ajoutés ensemble forment un groupe remisé de 15 % (paramètre `bundle_discount_percent`) tant que le groupe reste complet en licence personnelle. Le panier et la commande appliquent réellement la remise affichée sur la fiche produit.
- **Comptes de retrait multiples** (écran 44) : table `payout_accounts` (Wave, Orange Money, banque), numéros chiffrés au repos.
- **Chronologie de commande** (écran 52) : table `order_events`. Les actions admin manuelles (marquer payée, annuler, rembourser, contre-vérifier) sont aussi tracées dans `audit_logs`.
- **Accès aux téléchargements d'un invité** : un jeton de commande aléatoire est déposé en cookie httpOnly sur le navigateur qui a passé commande. Il donne accès uniquement aux fichiers de **cette** commande. Le compte complet s'ouvre par le lien « Définir un mot de passe » ou par lien magique, envoyés à l'email de l'acheteur. On ne connecte jamais automatiquement quelqu'un qui a seulement saisi un email.
- **Panier invité** : jeton aléatoire de 48 caractères en cookie httpOnly (non chiffré, illisible depuis JavaScript), fusionné au panier du compte à la connexion.
- **Prestataire simulé** : la page de développement déclenche le traitement du webhook dans le même processus, sans requête HTTP vers soi-même (le serveur `artisan serve` est mono-thread). Le webhook reste construit et signé exactement comme celui du prestataire.
- **Files d'attente** : `QUEUE_CONNECTION=sync` en développement (emails envoyés immédiatement). En production, utiliser `database` ou `redis` avec un worker.
- **Antivirus simulé** : le fichier reste « Analyse en cours » 4 secondes, puis devient « Sain » sauf s'il contient la signature de test EICAR (« Menace détectée »).
- **Suppression de compte** : les commandes sont anonymisées, pas supprimées (obligation comptable). L'accès à la bibliothèque est révoqué.
- **Pièces jointes des tickets** : disque public avec noms aléatoires. Elles sont à déplacer sur le disque privé avec URL signées avant la production (voir README).

## Divers

- **Next.js plutôt que Vite** : choix fait pour le rendu serveur et l'ISR de la vitrine (SEO des fiches produit).
- **Mode sombre** : les tokens basculent avec la préférence système ou le choix explicite (sélecteur dans le pied de page et dans les espaces connectés).
- **Google OAuth** : le bouton est visible mais affiche un message tant que `NEXT_PUBLIC_GOOGLE_AUTH=1` n'est pas défini avec les identifiants côté backend.
