# DigiNova — Mémoire du projet pour Claude Code

## 1. Le projet en une phrase
DigiNova est une marketplace de produits numériques pour l'Afrique francophone (templates, business plans, e-books, packs IA…). On paie en Mobile Money (Wave, Orange Money, MTN MoMo, Moov Money) ou par carte, on télécharge immédiatement, et chaque achat reste à vie dans la bibliothèque du client. En V2, des créateurs tiers vendent via un studio, avec une commission prélevée par la plateforme.

Signature : « Le meilleur du digital, à portée de clic. »
Langue de l'interface : **français uniquement**. Locale `fr-CI`. Devise : **XOF (FCFA), nombres entiers, pas de centimes**.

## 2. Source de vérité : le fichier Figma
- Fichier : https://www.figma.com/design/xbuf3GlVh1Kg3PJ4LkNr1D/DigiNova — fileKey `xbuf3GlVh1Kg3PJ4LkNr1D`
- Le Figma est **la référence visuelle absolue** : mise en page, espacements, tailles, couleurs, rayons, ombres, états, textes. On n'invente pas de style.
- Les nombres des maquettes sont des **données d'exemple** : en code, ils viennent de l'API (base + seed).
- Le MCP Figma est déclaré dans `.mcp.json` (serveur distant `https://mcp.figma.com/mcp`, authentification via `/mcp`).

### 2.1 Règles d'utilisation du MCP Figma (quota limité)
1. Avant chaque appel, regarder `design/figma-cache/`. Si la réponse existe, utiliser le cache.
2. Par écran : **un** `get_design_context` + **un** `get_screenshot`, enregistrés dans `design/figma-cache/<numéro>-<slug>.md` et `.png`.
3. Tokens : **un** `get_variable_defs` sur `20:2` → `design/figma-cache/tokens.json`.
4. Le code renvoyé est une **référence** : l'adapter aux composants de `frontend/components/ui` et aux classes Tailwind liées aux tokens. Jamais de positions absolues ni de valeurs en dur.
5. MCP indisponible ou quota épuisé : continuer avec `design/screens/*.png`, les exports CSS de l'utilisateur dans `design/figma-cache/*.css|md` et ce fichier ; le signaler dans le compte rendu.

### 2.2 Table des écrans → nœuds Figma → routes (frontend Next.js)
Lien direct : `https://www.figma.com/design/xbuf3GlVh1Kg3PJ4LkNr1D/DigiNova?node-id=<nodeId avec un tiret>`

| N° | Écran | nodeId | Route |
|---|---|---|---|
| DS | Design System | `20:2` | — |
| UX | Parcours utilisateurs | `22:2` | — |
| 01 | Accueil | `2:2` | `/` |
| 02 | Boutique — catégorie | `3:2` | `/boutique`, `/categorie/[slug]` |
| 03 | Recherche | `3:531` | `/recherche?q=` (+ suggestions header) |
| 04 | Fiche produit | `6:2` | `/produit/[slug]` |
| 05 | Devenir créateur | `7:2` | `/devenir-createur` |
| 06 | Centre d'aide & contact | `7:271` | `/aide` (+ `/aide/[article]`) |
| 10 | Connexion | `9:2` | `/connexion` |
| 11 | Inscription | `9:130` | `/inscription` |
| 12 | Vérification par code | `9:279` | `/verification` |
| 13 | Mot de passe oublié | `9:383` | `/mot-de-passe-oublie` |
| 14 | Lien envoyé | `9:481` | `/mot-de-passe-oublie/envoye` |
| 20 | Panier | `10:2` | `/panier` |
| 21 | Checkout — paiement | `10:331` | `/checkout` |
| 22 | Paiement en attente | `11:2` | `/checkout/[orderId]/attente` |
| 23 | Paiement réussi | `11:99` | `/checkout/[orderId]/succes` |
| 24 | Paiement échoué | `11:238` | `/checkout/[orderId]/echec` |
| 25 | Email de confirmation | `11:343` | `backend/resources/views/mail/order-confirmation.blade.php` |
| 30 | Compte — tableau de bord | `12:2` | `/compte` |
| 31 | Ma bibliothèque | `12:319` | `/compte/bibliotheque` |
| 32 | Commandes & factures | `12:733` | `/compte/commandes` |
| 33 | Favoris | `13:8` | `/compte/favoris` |
| 34 | Profil & sécurité | `13:276` | `/compte/profil` |
| 35 | Support — tickets | `13:513` | `/compte/support` (+ `[ticketId]`) |
| 40 | Candidature créateur | `15:2` | `/studio/candidature` |
| 41 | Studio — tableau de bord | `14:7` | `/studio` |
| 42 | Studio — ajouter un produit | `14:367` | `/studio/produits/nouveau`, `/studio/produits/[id]/modifier` |
| 43 | Studio — mes produits | `15:162` | `/studio/produits` |
| 44 | Studio — revenus & retraits | `15:499` | `/studio/revenus` |
| 50 | Admin — tableau de bord | `16:11` | `/admin` |
| 51 | Admin — modération produits | `16:372` | `/admin/produits` |
| 52 | Admin — commandes & paiements | `17:8` | `/admin/paiements` |
| 53 | Admin — candidatures créateurs | `17:343` | `/admin/createurs` |
| 60–67 | Versions mobiles | `18:2`, `18:174`, `18:276`, `18:357`, `19:2`, `19:81`, `19:253`, `19:292` | responsive des pages 01, 04, 21, 22, 23, 31, 10, 41 |

Sous 768 px : barre d'onglets fixe en bas (Accueil, Boutique, Recherche, Favoris, Compte ; studio : Accueil, Produits, Ajouter, Revenus, Profil) et barre d'action collée en bas sur la fiche produit et le checkout.

### 2.3 Pages absentes du Figma (même style, mêmes composants)
`/packs`, `/packs/[slug]`, `/nouveautes`, `/meilleures-ventes`, `/createur/[slug]`, `/a-propos`, `/blog`, `/blog/[slug]`, `/contact` (→ `/aide#contact`), pages légales (`/cgu`, `/cgv`, `/licences`, `/confidentialite`, `/mentions-legales`, texte modèle à faire relire), `not-found`, `error`, `loading` par section, états vides, studio (`ventes`, `clients`, `statistiques`, `coupons`, `profil`), admin (`categories`, `commandes`, `remboursements`, `coupons`, `utilisateurs`, `avis`, `tickets`, `commissions`, `parametres`) en tableaux + tiroirs dans le style des écrans 52/53.

## 3. Architecture et stack (imposées)
Monorepo à deux dossiers :

### `backend/` — API Laravel
- **Laravel 13**, PHP 8.4, API JSON uniquement (`routes/api.php`, préfixe `/api`), **Sanctum** (auth SPA par cookie, même domaine parent que le frontend).
- Base : **PostgreSQL 16** (Docker) ; **SQLite** accepté en dev tant que Docker n'est pas installé (`DB_CONNECTION=sqlite`). Recherche plein texte : `pg_trgm` en Postgres, repli `LIKE` en SQLite.
- Validation : **Form Requests** sur chaque endpoint. Autorisation : **Policies** + middleware de rôle.
- Mots de passe : `Hash` (argon2id si disponible, sinon bcrypt). OTP SMS, lien magique, Google OAuth (**Socialite**).
- Fichiers : disque S3 (MinIO en local, R2 en prod), buckets privés, `temporaryUrl()` 15 min. Repli disque `local` privé sans Docker.
- Emails : Mailables Blade (Mailpit en local, Resend en prod). Factures PDF : **barryvdh/laravel-dompdf**. Filigrane PDF : **setasign/fpdi**.
- Files d'attente : `database` driver (emails, filigrane, notifications).
- Tests : **Pest**. Qualité : **Pint**, **Larastan**.
- Ressources API : `JsonResource` ; montants en entiers XOF.

### `frontend/` — Next.js
- **Next.js 15** (App Router, Server Components), **React 19**, **TypeScript strict**, **pnpm**.
- **Tailwind CSS v4** (tokens en variables CSS) + **shadcn/ui** restylé selon le Figma.
- Polices **Manrope** (titres) et **Inter** (texte, chiffres tabulaires) via `next/font/google`. Icônes **lucide-react**.
- Formulaires **react-hook-form** + **zod**. Données : client `lib/api.ts` (fetch vers Laravel, cookies Sanctum, CSRF `XSRF-TOKEN`), Server Components pour la vitrine (ISR), TanStack Query pour les espaces connectés.
- Graphiques **Recharts**. Tests **Vitest** + **Playwright** (e2e + captures visuelles).
- Le frontend ne contient **aucune** règle métier sensible (prix, paiement, droits) : tout est décidé par l'API.

`docker-compose.yml` (racine) : `postgres`, `minio` (+ buckets `products-private`, `public-assets`), `mailpit`.

## 4. Design system (depuis le Figma)
Valeurs exactes via `get_variable_defs` sur `20:2`. Référence (Clair / Sombre) :

| Token | Clair | Sombre |
|---|---|---|
| brand/primary | #635BFF | #7C75FF |
| brand/primary-hover | #4F46E5 | #635BFF |
| brand/subtle | #EEEDFF | #1E1B4B |
| brand/deep | #1E1B4B | #0B0F1A |
| text/primary | #111827 | #F9FAFB |
| text/secondary | #4B5563 | #9CA3AF |
| text/tertiary | #9CA3AF | #6B7280 |
| text/on-brand | #FFFFFF | #FFFFFF |
| bg/page | #F8F9FC | #0B0F1A |
| bg/surface | #FFFFFF | #111827 |
| bg/subtle | #F3F4F6 | #1F2937 |
| bg/inverse | #0B0F1A | #000000 |
| border/default | #E5E7EB | #1F2937 |
| border/strong | #D1D5DB | #374151 |
| status/success · subtle | #16A34A · #DCFCE7 | #22C55E · #052E16 |
| status/warning · subtle | #D97706 · #FEF3C7 | #F59E0B · #451A03 |
| status/danger · subtle | #DC2626 · #FEE2E2 | #EF4444 · #450A0A |
| accent/amber | #F59E0B | #FBBF24 |

- Variables CSS dans `frontend/app/globals.css` (`.dark` + `prefers-color-scheme`), exposées à Tailwind (`bg-brand-primary`, `text-text-secondary`…).
- Moyens de paiement : Orange Money #FF7900, MTN MoMo #FFCC00, Wave #1DC8F2, Moov Money #0066B3, Carte = brand/primary. Pastille + nom tant que les logos officiels manquent (`frontend/public/payment-logos/`).
- Styles de texte : Display Manrope 800 60/68 −2 % · H1 800 40/48 −1,5 % · H2 700 32/40 −1 % · H3 700 24/32 −0,5 % · H4 700 18/26 · Body/Large Inter 400 18/28 · Body 400 15/24 · Body/Medium 500 15/24 · Body/Small 400 13/20 · Label 600 14/20 · Label/Small 600 12/16 · Caption 500 12/16 · Overline 700 11/16 +8 % majuscules · Price/Large 700 30/36 −1 % · Price 700 16/24. Utilitaires `text-display`, `text-h1`… `text-price`.
- Grille 8 px. Rayons observés : 8 / 10 (boutons) / 12 / 14 (visuels) / 16 / 20 (cartes) / 24 / complet. Conteneur 1280 px, marges 80 px desktop, 20 px mobile.
- Ombres : douce (0 4 16 −4, 6 %), flottante (0 16 40 −4, 14 %).

### 4.1 Composants (`frontend/components/ui`)
Button (Primaire/Secondaire/Sombre/Doux/Fantôme/Blanc/Danger × L/M/S, icônes, chargement, désactivé) · Badge · Input, Textarea, Select, PhoneInput (+225 défaut ; CI/SN/TG/BJ/CM/BF/ML), OtpInput (6), PasswordInput (jauge), Checkbox, Radio, Toggle · ProductCard · ProductCover (SVG `chart`, `grid`, `chat`, `sheet`, `doc`, `notion`, `book`, `brand`) · PaymentOption, PaymentChips · Header, Footer, AnnouncementBar, CheckoutHeader, MobileTabBar, StickyActionBar · AppShell (client / studio / admin sombre) · StatCard, DataTable, Tabs, Stepper, Timeline, EmptyState, Skeleton, Toast, Dialog, Drawer, Accordion, RatingStars, RatingDistribution, PriceTag, Breadcrumb, Pagination, FileDropzone, Avatar · page `/_design` (dev uniquement).

## 5. Modèle de données (migrations + modèles Eloquent)
Enums PHP : `Role` (CLIENT, CREATOR, MODERATOR, ADMIN) · `ProductStatus` (DRAFT, PENDING_REVIEW, CHANGES_REQUESTED, PUBLISHED, REJECTED, ARCHIVED) · `OrderStatus` (PENDING, AWAITING_CONFIRMATION, PAID, FAILED, EXPIRED, REFUNDED, NEEDS_REVIEW) · `PaymentMethod` (WAVE, ORANGE_MONEY, MTN_MOMO, MOOV_MONEY, CARD) · `PaymentStatus` (INITIATED, PENDING, SUCCEEDED, FAILED, EXPIRED) · `License` (PERSONAL, COMMERCIAL) · `PayoutStatus` (REQUESTED, PROCESSING, PAID, FAILED) · `ApplicationStatus` (SUBMITTED, NEEDS_DOCUMENT, APPROVED, REJECTED) · `TicketStatus` (OPEN, IN_PROGRESS, RESOLVED) · `CouponType` (PERCENT, FIXED).

Tables (index, clés étrangères, timestamps) : users (+ phone, role, phone_verified_at, avatar, country, city, two_factor_enabled, marketing_opt_in) · otp_codes · social_accounts · categories (parent_id, icon, cover_type, position) · seller_profiles (plan STANDARD/PRO, commission_rate, payout_account chiffré via cast `encrypted`) · creator_applications · products · product_files (scan_status) · product_images · bundles / bundle_items · carts / cart_items (invité par jeton cookie ou user_id) · coupons · orders (numéro `DN-AAAA-NNNNNN`) · order_items (commission) · payments · webhook_events (event_id unique) · library_items (download_limit 10, revoked_at) · download_logs · invoices · favorites (price_at_save) · reviews (order_item_id obligatoire) · reports · ledger_entries (available_at = vente + 7 j) · payouts (`PO-AAAA-NNNN`) · refund_requests · support_tickets / ticket_messages (`#NNNN`) · notifications (Laravel) · audit_logs · settings (commission 15 %, Pro 10 %, garantie 7 j, retrait min 5 000, lien 15 min, 10 téléchargements).

Seed (`database/seeders`) fidèle aux maquettes : Aïcha Koné (cliente, aicha.kone@exemple.ci), Jean Kouassi (créateur Pro vérifié), Bakayoko K. (admin), ~10 clients, 4 candidatures (Jean Kouassi Design, Mariam Sylla Studio, Compta Express, Ibrahim Koné) ; catégories Business, Design, Réseaux sociaux, E-books & formations, Productivité, IA & prompts, Carrière, Web & Tech, Audio, Vidéo ; produits Business Plan Pro — modèle complet (12 000 / 18 000, note 4,9 (127)), Pack 30 templates Instagram (5 000), Pack 500 prompts IA pour entrepreneurs (7 500), Dashboard Excel — gestion de stock (8 000 / 12 000, 4,7 (68)), Kit CV & lettre de motivation (3 500), Planner Notion de l'entrepreneur (6 000), Guide : lancer sa boutique en ligne (4 500), Pack logos & charte graphique (15 000), Modèles de factures OHADA (5 000) + produits du studio de Jean ; Pack Entrepreneur (valeur 45 000, prix 25 000) ; coupons `LANCEMENT` (−10 %), `BIENVENUE` (−20 % packs), `PACK5000` ; commandes, paiements, bibliothèque, avis, tickets, retraits cohérents avec les écrans 30–53 ; un fichier de démo par produit.

## 6. Règles métier (non négociables)
- Montants entiers XOF ; affichage `12 000 FCFA` (`Intl.NumberFormat('fr-FR')`), `12 000 F` dans les tableaux denses. Dates `1 oct. 2026`, `14:02`, fuseau `Africa/Abidjan`.
- Licence commerciale = prix + 50 % par défaut (modifiable par le créateur).
- Panier invité (jeton cookie signé) fusionné au compte à la connexion. Coupons : validité, dates, limite, minimum, portée ; réduction en vert.
- Checkout sans compte : email + téléphone → compte CLIENT créé sans mot de passe + lien pour le définir.
- Upsell : « Souvent achetés ensemble » (fiche), Pack Entrepreneur (panier).
- **Paiement** : interface `App\Payments\PaymentProvider` (`createPayment`, `verifyWebhook`, `fetchPaymentStatus`) ; `MockProvider` (page dev `/dev/mock-payment/[ref]` : confirmer / refuser / expirer, webhook HMAC-SHA256) et adaptateur `CinetPayProvider` ; choix via `PAYMENT_PROVIDER`. Commande PAYÉE **uniquement si** signature valide + contre-vérification `fetchPaymentStatus` (statut et montant exacts) + `event_id` jamais traité. La redirection navigateur ne vaut jamais confirmation. Sinon `NEEDS_REVIEW` + alerte admin, rien livré.
- Page d'attente : polling `/api/orders/{id}/status` toutes les 3 s, compte à rebours 5 min, renvoyer / changer de moyen ; expiration → EXPIRED → écran 24.
- À la confirmation, **une transaction DB** : library_items, ledger_entries (commission selon plan, +7 j), facture PDF ; puis email (écran 25) et notifications créateurs (en file).
- **Téléchargement** : `GET /api/library/{item}/files/{file}/download` : session, propriété, limite 10, révocation, journal ; URL signée 15 min. PDF filigranés (email acheteur), mis en cache. > 5 IP en 24 h → alerte admin. Nouvelle version → badge « Mise à jour » + notification.
- **Auth** : email + mot de passe, lien magique, code SMS 6 chiffres (5 essais, 10 min, renvoi 60 s, option WhatsApp prévue ; en dev le code va dans le log et Mailpit), Google. Mot de passe oublié : lien 30 min. 2FA SMS optionnelle, sessions révocables. `/compte/*` connectés, `/studio/*` CREATOR (sauf candidature), `/admin/*` MODERATOR/ADMIN (modérateurs sans paiements, commissions, paramètres) — appliqué **côté API** (middleware + policies) et reflété côté frontend (`middleware.ts`).
- **Créateurs** : candidature 4 étapes (Profil → Activité → Paiement → Vérification), réponse sous 72 h, « Approuver » inactif tant que l'identité n'est pas vérifiée. Ajout produit 5 étapes avec brouillon auto (Informations → Fichiers (upload direct par URL signée + scan `App\Scan\Scanner`, simulé en dev) → Aperçus 3–8 → Prix & licence → Publication), soumission inactive tant que la checklist n'est pas complète. Modération : file par ancienneté, temps restant sur 72 h, checklist, message obligatoire en refus/modifs.
- **Revenus** : disponible = écritures dont `available_at` est passé ; le reste en garantie. Retrait ≥ 5 000 FCFA, ≤ solde, confirmation SMS. Remboursements débités. Commission 15 % Standard, 10 % Pro (bascule admin en V1).
- Avis réservés aux acheteurs (« Achat vérifié »), une réponse créateur. Favoris avec alerte « Prix en baisse ». Tickets avec messages, pièces jointes, commande liée.
- **Recherche** : plein texte (titre, description, tags, catégorie), filtres (sous-catégorie, prix, note, format, licence), tri (Popularité, Nouveautés, Prix ↑/↓, Note), pagination ; suggestions header (récents en localStorage, suggestions, 2 produits) ; bloc « Suggestion DigiNova IA » (règles mots-clés, `App\Ai\Recommender`, badge « Bêta »).

## 7. Sécurité, performance, qualité
Form Request sur chaque endpoint, policy sur chaque ressource. Cookies httpOnly/secure/sameSite=lax, CSRF Sanctum. Rate limiting (connexion, OTP, checkout, téléchargements, contact) via `RateLimiter`. En-têtes de sécurité (CSP, HSTS, X-Frame-Options, Referrer-Policy) dans `next.config.ts` et middleware Laravel. Journal d'audit pour toute action admin. Aucun secret dans le code (`.env.example` documentés des deux côtés). WCAG 2.1 AA (focus violet, `aria-live` sur l'attente). Lighthouse mobile ≥ 90 sur `/`, `/boutique`, `/produit/[slug]`. SEO : métadonnées, Open Graph, sitemap, robots, JSON-LD `Product` + `AggregateRating`. Analytics `frontend/lib/analytics` désactivé par défaut.

## 8. Arborescence
```
backend/   app/{Enums,Models,Http/Controllers/Api,Http/Requests,Http/Resources,Policies,Payments,Scan,Sms,Ai,Services}
           database/{migrations,seeders,factories}  routes/api.php  resources/views/{mail,pdf}  tests/
frontend/  app/(vitrine) (auth) (checkout) compte/ studio/ admin/ dev/mock-payment/[ref]/ _design/
           components/{ui,layout,product,checkout,dashboard,studio,admin}  lib/{api,money,dates,analytics}  tests/{unit,e2e,visual}
design/    figma-cache/ screens/
docs/      DECISIONS.md
```

## 9. Méthode de travail
1. Travailler par phases (§10). Fin de phase : `pnpm lint && pnpm typecheck && pnpm test` (frontend) et `composer test` + `vendor/bin/pint --test` (backend) au vert, commit `feat(phase-X): …`, compte rendu court (fait / reste / écarts Figma / décisions), puis **attendre « OK phase suivante »**.
2. Par écran : cache ou MCP → implémentation avec composants partagés → capture Playwright 1440 px (+ 390 px si mobile) → comparaison avec le Figma → corrections.
3. Données toujours issues de l'API (seed), jamais en dur dans les pages.
4. Chaque écran gère chargement, vide, erreur et tous les états interactifs du Figma.
5. Info manquante : choisir le plus fidèle au Figma, noter dans `docs/DECISIONS.md`, continuer.
6. Ne jamais supprimer une fonctionnalité pour simplifier sans demander.

## 10. Phases
0 Socle · 1 Design system (frontend) · 2 Données (migrations, modèles, seed, API de base) · 3 Vitrine (01–06, 60, 61, pages §2.3) · 4 Authentification (10–14, 66) · 5 Achat & livraison (20–25, 62–64) · 6 Espace client (30–35, 65) · 7 Studio (40–44, 67) · 8 Admin (50–53 + complémentaires) · 9 Finitions (sombre, a11y, SEO, perf, légal) · 10 Tests e2e & livraison (README, DECISIONS, reste à brancher).

## 11. Commandes
Outils installés hors sudo : PHP/Composer dans `~/.local/bin`, Node via nvm (`. ~/.nvm/nvm.sh`).
- Backend : `cd backend && php artisan serve` (port 8000) · `php artisan migrate:fresh --seed` · `composer test` · `vendor/bin/pint`
- Frontend : `cd frontend && pnpm dev` (port 3000) · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:e2e`
- Services : `docker compose up -d` (quand Docker est installé)
