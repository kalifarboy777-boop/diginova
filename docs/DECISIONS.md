# Décisions

- **2026-10-01 — Architecture en deux dossiers** : `backend/` (API Laravel 13 + Sanctum) et `frontend/` (Next.js 15), à la demande de l'utilisateur. Cela remplace Prisma / Auth.js / Server Actions de la spécification initiale par Eloquent / Sanctum / API REST. Les règles métier restent identiques.
- **2026-10-01 — Base de données en dev** : Docker n'est pas encore installé dans WSL, donc le backend tourne sur SQLite (`database/database.sqlite`). Il passera sur PostgreSQL 16 (`docker compose up -d`) dès que Docker sera disponible. La recherche `pg_trgm` aura un repli `LIKE` sous SQLite.
- **2026-10-01 — Outils sans sudo** : PHP 8.4 statique et Composer installés dans `~/.local/bin`, Node 22 + pnpm via nvm.
- **2026-10-01 — Rayons supplémentaires** : l'export CSS du panier utilise 10 px (boutons, coupon), 14 px (visuels, bandeau info) et 20 px (cartes). Ces rayons sont ajoutés aux tokens (`rounded-btn`, `rounded-cover`, `rounded-card`).
- **2026-10-01 — Texte de l'upsell** : il utilise #C7D2FE sur brand/deep, ajouté en token `brand-deep-muted`.
