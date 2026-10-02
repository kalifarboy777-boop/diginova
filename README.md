# DigiNova

Marketplace de produits numériques pour l’Afrique francophone : templates, business plans, e-books, packs IA. Paiement Mobile Money (Wave, Orange Money, MTN MoMo, Moov Money) ou carte, téléchargement immédiat, bibliothèque à vie, studio créateur et console d’administration.

> « Le meilleur du digital, à portée de clic. »

| Dossier | Rôle | Stack |
|---|---|---|
| `backend/` | API JSON, règles métier, paiements, livraison des fichiers | Laravel 13 · PHP 8.4 · Sanctum · Pest |
| `frontend/` | Site, espace client, studio, admin (42 écrans Figma) | Next.js 15 · React 19 · Tailwind v4 · TanStack Query · Recharts · Playwright |
| `design/` | Exports Figma (PNG 2x) et fiches de spécification par écran | — |
| `docs/` | Décisions d’architecture et écarts | — |

---

## 1. Installation locale

Prérequis : PHP ≥ 8.4 (extensions pdo_sqlite ou pdo_pgsql, gd, zip, mbstring), Composer, Node ≥ 20, pnpm. Docker est optionnel : sans lui, la base est SQLite et les fichiers sont stockés sur le disque local privé.

```bash
# Backend
cd backend
composer install
cp .env.example .env && php artisan key:generate
touch database/database.sqlite
php artisan migrate:fresh --seed     # données des maquettes (≈ 20 s)
php artisan storage:link
php artisan serve --port=8000        # http://127.0.0.1:8000

# Frontend (autre terminal)
cd frontend
pnpm install
cp .env.example .env.local
pnpm dev                             # http://localhost:3000
```

Le frontend appelle l’API par un proxy de même origine (`/api`, `/sanctum`, `/files`, `/storage` → Laravel, voir `next.config.ts`). Les cookies de session Sanctum et le jeton CSRF fonctionnent donc sans configuration CORS.

### Avec Docker (PostgreSQL, MinIO, Mailpit)

```bash
docker compose up -d
```

Puis dans `backend/.env` :

```dotenv
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=diginova
DB_USERNAME=diginova
DB_PASSWORD=diginova

MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=1025                       # emails visibles sur http://localhost:8025

PRODUCTS_DISK_DRIVER=s3              # fichiers vendus dans MinIO (bucket privé)
AWS_ACCESS_KEY_ID=diginova
AWS_SECRET_ACCESS_KEY=diginova-secret
AWS_ENDPOINT=http://127.0.0.1:9000
AWS_DEFAULT_REGION=us-east-1
AWS_USE_PATH_STYLE_ENDPOINT=true
```

Avec PostgreSQL, la recherche utilise le plein texte français et `pg_trgm` (tolérance aux fautes). Sous SQLite, elle se replie sur une recherche par mots-clés pondérée.

## 2. Comptes de démonstration

Mot de passe de tous les comptes : `password`.

| Rôle | Email | Ce qu’il voit |
|---|---|---|
| Cliente | `aicha.kone@exemple.ci` | Écrans 30 à 35 : 12 produits, 14 commandes, tickets |
| Créateur Pro | `jean.kouassi@exemple.ci` | Écrans 41 à 44 : 17 produits, 312 000 FCFA disponibles |
| Administrateur | `admin@diginova.ci` | Écrans 50 à 53 et pages admin |
| Modératrice | `mariam@diginova.ci` | Admin sans paiements, commissions ni paramètres |

Codes promo : `LANCEMENT` (-10 %), `BIENVENUE` (-20 % sur les packs), `PACK5000`.

## 3. Tester un paiement en local

`PAYMENT_PROVIDER=mock` (valeur par défaut) active un prestataire simulé :

1. Passez commande (Wave, Orange Money, MTN, Moov ou carte).
2. La page d’attente affiche, en développement, le lien « simuler la réponse de l’opérateur ».
3. Sur `/dev/mock-payment/{référence}`, choisissez : confirmer, refuser, laisser expirer, ou les scénarios de sécurité (signature invalide, montant différent).

Chaque action envoie un **webhook signé HMAC-SHA256**, traité par le même code qu’en production. Une commande n’est payée que si les trois conditions sont réunies : signature valide, contre-vérification du statut et du montant auprès du prestataire, événement jamais traité.

Les codes SMS (connexion, vérification, retrait) sont écrits dans `backend/storage/logs/laravel.log`. Ils sont aussi exposés en développement sur `GET /api/dev/sms/{téléphone}`, utilisé par les tests e2e.

## 4. Scripts

| Où | Commande | Effet |
|---|---|---|
| backend | `php artisan migrate:fresh --seed` | Recrée la base avec les données des maquettes |
| backend | `php artisan test` | 19 tests Pest (webhooks, idempotence, coupons, droits, OTP, grand livre) |
| backend | `vendor/bin/pint` | Formatage PHP |
| backend | `php artisan queue:work` | Files d’attente (emails, notifications) si `QUEUE_CONNECTION=database` |
| frontend | `pnpm dev` / `pnpm build` / `pnpm start` | Développement / production |
| frontend | `pnpm lint` · `pnpm typecheck` · `pnpm test` | ESLint · TypeScript strict · Vitest |
| frontend | `pnpm test:e2e` | Playwright : achat Wave, échec puis nouvel essai, fraude webhook, parcours créateur complet, retrait SMS (backend seedé requis) |
| frontend | `node tests/visual/shot.mjs /chemin sortie.png 1440` | Capture pour la comparaison avec le Figma |

## 5. Variables d’environnement

Elles sont toutes documentées dans `backend/.env.example` et `frontend/.env.example`. Les principales :

| Variable | Rôle |
|---|---|
| `FRONTEND_URL` | Liens des emails, redirections OAuth |
| `SANCTUM_STATEFUL_DOMAINS` | Domaine(s) du frontend autorisés à utiliser la session |
| `PAYMENT_PROVIDER` | `mock` (développement) ou `cinetpay` |
| `MOCK_PAYMENT_SECRET` | Secret HMAC du prestataire simulé |
| `CINETPAY_API_KEY` / `CINETPAY_SITE_ID` / `CINETPAY_SECRET_KEY` | Identifiants du prestataire réel |
| `PRODUCTS_DISK_DRIVER` | `local` ou `s3` (MinIO, Cloudflare R2) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Connexion Google (et `NEXT_PUBLIC_GOOGLE_AUTH=1` côté frontend) |
| `BACKEND_URL` (frontend) | URL interne de l’API pour le proxy et les Server Components |
| `NEXT_PUBLIC_SITE_URL` | URL publique (sitemap, Open Graph) |

## 6. Déploiement

Architecture recommandée :

- **Frontend sur Vercel** : `BACKEND_URL=https://api.diginova.ci` et `NEXT_PUBLIC_SITE_URL=https://diginova.ci`. Les rewrites gardent l’API sur la même origine, donc les cookies restent first-party.
- **Backend Laravel** : Laravel Cloud, Forge ou VPS (PHP-FPM + Nginx), avec :
  - `APP_ENV=production` et `APP_DEBUG=false` ;
  - `SESSION_SECURE_COOKIE=true` et `SESSION_DOMAIN=.diginova.ci` ;
  - un worker `php artisan queue:work` supervisé ;
  - `php artisan schedule:work`.
- **Base** : PostgreSQL 16 managé (Neon, Supabase, RDS…). Lancez ensuite `php artisan migrate --force`, **sans** seed.
- **Fichiers** : Cloudflare R2 en bucket **privé** (`PRODUCTS_DISK_DRIVER=s3`, `AWS_ENDPOINT=https://<compte>.r2.cloudflarestorage.com`). Les téléchargements passent par des URL signées valables 15 minutes.
- **Emails** : Resend (`MAIL_MAILER=resend`, `RESEND_KEY`) avec un domaine vérifié.
- **Webhook du prestataire** : `https://api.diginova.ci/api/webhooks/cinetpay`.

## 7. Ce qu’il reste à brancher pour la production

Ces éléments ne peuvent pas être réalisés sans comptes ou validations externes :

1. **Prestataire de paiement réel** : ouvrir le compte marchand (CinetPay, ou PayDunya / Wave Business selon le choix), renseigner les clés, puis **valider l’adaptateur `CinetPayProvider`** avec la documentation officielle (champs, canaux par pays, format de la signature `x-token`) en environnement de test du prestataire.
2. **Fournisseur SMS / WhatsApp** : implémenter `App\Sms\SmsSender` (Orange SMS API, Twilio, Infobip, WhatsApp Business) à la place de `LogSmsSender`.
3. **Antivirus réel** : implémenter `App\Scan\Scanner`, par exemple avec ClamAV ou un service d’analyse, à la place de `SimulatedScanner`.
4. **Logos officiels** des moyens de paiement (`frontend/public/payment-logos/`) : à obtenir auprès des opérateurs ou du prestataire. Des pastilles de couleur les remplacent en attendant.
5. **Textes légaux** (CGU, CGV, licences, confidentialité, mentions légales) : ce sont des **modèles** à faire relire et valider par un juriste (droit ivoirien, OHADA, loi 2013-450 sur les données personnelles), puis à compléter (RCCM, hébergeur).
6. **Nom de domaine**, certificats et adresses email (`support@`, `bonjour@`).
7. **Google OAuth** : créer le client OAuth et renseigner les identifiants.
8. **Rate limiting distribué** : le cache par défaut convient à un seul serveur. Passer `CACHE_STORE=redis` au-delà.
9. **Abonnement Créateur Pro** : en V1, le passage au plan Pro est une simple bascule admin. L’encaissement mensuel reste à brancher.

Voir aussi `docs/DECISIONS.md`.
