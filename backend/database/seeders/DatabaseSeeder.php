<?php

namespace Database\Seeders;

use App\Enums\ApplicationStatus;
use App\Enums\CouponScope;
use App\Enums\CouponType;
use App\Enums\License;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\PayoutStatus;
use App\Enums\ProductStatus;
use App\Enums\Role;
use App\Enums\ScanStatus;
use App\Enums\SellerPlan;
use App\Enums\TicketStatus;
use App\Models\AdminAlert;
use App\Models\BlogPost;
use App\Models\Bundle;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\CreatorApplication;
use App\Models\Favorite;
use App\Models\HelpArticle;
use App\Models\LedgerEntry;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Report;
use App\Models\Review;
use App\Models\SellerProfile;
use App\Models\Setting;
use App\Models\SupportTicket;
use App\Models\User;
use App\Notifications\AppNotification;
use App\Payments\MockProvider;
use App\Services\FulfillmentService;
use App\Services\LedgerService;
use App\Services\OrderService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Recrée les données visibles dans les maquettes Figma (écrans 01 à 67).
 * Mot de passe de tous les comptes de démonstration : « password ».
 */
class DatabaseSeeder extends Seeder
{
    /** @var array<string, Category> */
    private array $categories = [];

    /** @var array<string, Product> */
    private array $products = [];

    /** @var array<string, User> */
    private array $users = [];

    private int $orderSeq = 100;

    private CarbonImmutable $now;

    public function run(): void
    {
        ini_set('memory_limit', '512M');
        $this->now = CarbonImmutable::now();
        mt_srand(2026);
        Storage::disk('products')->deleteDirectory('demo');
        $data = require __DIR__.'/data/catalog.php';

        DB::transaction(function () use ($data) {
            foreach (Setting::DEFAULTS as $key => $value) {
                Setting::put($key, $value);
            }
            $this->seedUsers($data);
            $this->seedCategories($data['categories']);
            $this->seedProducts($data);
            $this->seedBundleAndCoupons();
            $this->seedSalesHistory();
            $this->seedAichaAccount();
            $this->seedAdminOrders();
            $this->seedReviews();
            $this->seedTickets();
            $this->seedApplications();
            $this->seedPayouts();
            $this->seedContent();
            $this->seedAlerts();
        });
    }

    // ───────────────────────────── Utilisateurs

    private function seedUsers(array $data): void
    {
        $u = fn (string $key, array $attrs) => $this->users[$key] = User::create($attrs + [
            'password' => 'password', 'email_verified_at' => $this->now, 'country' => 'CI', 'city' => 'Abidjan',
        ]);

        $u('admin', ['name' => 'Bakayoko K.', 'email' => 'admin@diginova.ci', 'role' => Role::ADMIN, 'phone' => '+2250700000001']);
        $u('support', ['name' => 'Mariam Diabaté', 'email' => 'mariam@diginova.ci', 'role' => Role::MODERATOR, 'phone' => '+2250700000002']);
        $u('aicha', ['name' => 'Aïcha Koné', 'email' => 'aicha.kone@exemple.ci', 'role' => Role::CLIENT, 'phone' => '+2250708421855', 'phone_verified_at' => $this->now]);
        $u('jean', ['name' => 'Jean Kouassi', 'email' => 'jean.kouassi@exemple.ci', 'role' => Role::CREATOR, 'phone' => '+2250708421800', 'phone_verified_at' => $this->now]);
        $u('studio', ['name' => 'DigiNova Studio', 'email' => 'studio@diginova.ci', 'role' => Role::CREATOR]);

        foreach ($data['clients'] as $i => [$name, $email, $city]) {
            $u(Str::slug($name), ['name' => $name, 'email' => $email, 'role' => Role::CLIENT, 'city' => $city,
                'created_at' => $this->now->subDays(10 + $i * 17)]);
        }
        foreach (range(1, 28) as $i) {
            $u("client$i", ['name' => fake('fr_FR')->firstName().' '.fake('fr_FR')->lastName(), 'email' => "client$i@exemple.ci",
                'role' => Role::CLIENT, 'created_at' => $this->now->subDays(mt_rand(1, 300))]);
        }

        $this->users['aicha']->notificationPreference()->create(['newsletter' => false]);
        $this->users['aicha']->update(['created_at' => $this->now->subMonths(5), 'two_factor_enabled' => false]);
    }

    // ───────────────────────────── Catalogue

    private function seedCategories(array $rows): void
    {
        foreach ($rows as $pos => [$name, $label, $slug, $description, $icon, $cover, $children]) {
            $cat = Category::create(compact('name', 'label', 'slug', 'description', 'icon') + ['cover_type' => $cover, 'position' => $pos]);
            $this->categories[$slug] = $cat;
            foreach ($children as $i => $child) {
                $this->categories[$slug.'/'.$child] = Category::create([
                    'name' => $child, 'label' => mb_strtoupper($child), 'slug' => $slug.'-'.Str::slug($child),
                    'parent_id' => $cat->id, 'position' => $i, 'cover_type' => $cover,
                ]);
            }
        }
    }

    private function seller(User $user, string $name, string $slug, array $attrs = []): SellerProfile
    {
        return SellerProfile::create($attrs + [
            'user_id' => $user->id, 'display_name' => $name, 'slug' => $slug, 'verified' => true,
            'plan' => SellerPlan::STANDARD, 'commission_rate' => 15, 'country' => 'CI',
            'created_at' => $this->now->setDate(2026, 1, 15),
        ]);
    }

    private function seedProducts(array $data): void
    {
        $studio = $this->seller($this->users['studio'], 'DigiNova Studio', 'diginova-studio', [
            'bio' => 'Les modèles maison de DigiNova, conçus avec des experts-comptables et entrepreneurs d’Afrique de l’Ouest.',
            'plan' => SellerPlan::PRO, 'commission_rate' => 0,
        ]);
        $jean = $this->seller($this->users['jean'], 'Jean Kouassi', 'jean-kouassi', [
            'bio' => 'Formateur Excel et designer depuis 8 ans. J’aide les PME à mieux gérer leur activité avec des outils simples.',
            'plan' => SellerPlan::PRO, 'commission_rate' => 10, 'payout_method' => 'WAVE',
        ]);
        $jean->payoutAccounts()->createMany([
            ['method' => 'WAVE', 'label' => 'Wave', 'account' => '+2250708421855', 'masked' => '07 08 42 18 55', 'is_default' => true],
            ['method' => 'ORANGE_MONEY', 'label' => 'Orange Money', 'account' => '+2250711000090', 'masked' => '07 11 •• •• 90'],
            ['method' => 'BANK', 'label' => 'Compte bancaire', 'account' => 'CI93 CI008 01234 567890124410 55', 'masked' => 'SGCI ••4410'],
        ]);

        foreach ($data['studio_products'] as $slug => $p) {
            $this->products[$slug] = $this->product($studio, $slug, $p[0], $p[1], $p[2], $p[3], $p[4], $p[5], $p[6], $p[7], 'PUBLISHED', [
                'version' => $p[8], 'sales_count' => $p[9], 'formats' => $p[10], 'badge' => $p[11],
                'published_at' => $this->now->subDays(mt_rand(40, 200)),
            ]);
        }
        $this->enrichBusinessPlan();

        $i = 0;
        foreach ($data['jean_products'] as $slug => $p) {
            $extra = ['published_at' => $p[8] === 'PUBLISHED' ? $this->now->subDays(30 + $i * 9) : null];
            if ($p[8] === 'PENDING_REVIEW') {
                $extra['submitted_at'] = $this->now->subHours(41);
            }
            if ($p[8] === 'REJECTED') {
                $extra['rejection_reason'] = 'Les aperçus ne montrent pas le contenu réel du fichier. Ajoutez 3 captures du tableau puis soumettez à nouveau.';
                $extra['submitted_at'] = $this->now->subDays(4);
            }
            $this->products[$slug] = $this->product($jean, $slug, $p[0], $p[1], $p[2], $p[3], $p[4], $p[5], $p[6], $p[7], $p[8], $extra);
            $i++;
        }
        $this->products['pack-notion-etudiant']->update([
            'description' => 'Un espace Notion complet pour organiser vos cours, planifier vos révisions et suivre vos notes. Inclut 6 tableaux prêts à dupliquer et un guide vidéo de prise en main.',
            'tags' => ['notion', 'étudiant', 'révisions', 'planning'],
            'commercial_price' => 9000,
        ]);
        $this->files($this->products['pack-notion-etudiant'], [['pack-notion-etudiant.zip', ScanStatus::CLEAN], ['guide-prise-en-main.pdf', ScanStatus::CLEAN]], replace: true);

        $sellers = ['diginova-studio' => $studio, 'jean-kouassi' => $jean];
        foreach ($data['other_creators'] as [$name, $email, $studioName, $slug, $country, $city]) {
            $user = $this->users[$slug] = User::create(['name' => $name, 'email' => $email, 'password' => 'password',
                'role' => Role::CREATOR, 'country' => $country, 'city' => $city, 'email_verified_at' => $this->now]);
            $sellers[$slug] = $this->seller($user, $studioName, $slug, ['country' => $country, 'bio' => "Créations digitales depuis $city."]);
        }
        foreach ($data['other_products'] as [$slug, $title, $cat, $sub, $price, $compare, $rating, $count, $cover, $status, $seller, $hours]) {
            $extra = [];
            if ($status === 'PUBLISHED') {
                $extra = ['published_at' => $this->now->subDays(mt_rand(5, 120)), 'sales_count' => $count * 3];
            } else {
                $extra['submitted_at'] = $this->now->subHours($hours);
            }
            if ($status === 'REJECTED') {
                $extra['rejection_reason'] = 'Contenu non conforme aux règles de la plateforme (droits non détenus ou promesse trompeuse).';
            }
            if ($status === 'CHANGES_REQUESTED') {
                $extra['rejection_reason'] = 'Merci d’ajouter des aperçus montrant le contenu réel et de préciser les formats livrés.';
            }
            $this->products[$slug] = $this->product($sellers[$seller], $slug, $title, $cat, $sub, $price, $compare, $rating, $count, $cover, $status, $extra);
        }
    }

    private function product(SellerProfile $seller, string $slug, string $title, string $cat, string $sub, int $price, ?int $compare,
        float $rating, int $count, string $cover, string $status, array $extra = []): Product
    {
        $category = $this->categories[$cat];
        $formats = $extra['formats'] ?? match ($cover) {
            'sheet' => ['XLSX'], 'doc' => ['DOCX', 'PDF'], 'book' => ['PDF'], 'grid', 'brand' => ['Canva', 'PNG'],
            'notion' => ['Notion'], 'chat' => ['PDF', 'Notion'], default => ['PDF', 'XLSX'],
        };
        $product = Product::create(array_merge([
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'subcategory_id' => $this->categories[$cat.'/'.$sub]->id ?? null,
            'title' => $title,
            'slug' => $slug,
            'short_description' => $this->shortDescription($title, $category->name),
            'description' => $this->shortDescription($title, $category->name)."\n\nConçu pour le contexte ouest-africain : montants en FCFA, exemples locaux et mise en route en quelques minutes. Les mises à jour sont incluses à vie.",
            'price' => $price,
            'compare_at_price' => $compare,
            'status' => ProductStatus::from($status),
            'cover_type' => $cover,
            'tags' => array_values(array_unique([Str::lower($category->name), Str::lower($sub), ...explode(' ', Str::lower(Str::before($title, ' —')))])),
            'formats' => $formats,
            'includes' => [[
                'title' => Str::before($title, ' —'),
                'description' => 'Fichiers prêts à l’emploi, modifiables et documentés.',
                'format' => implode(' · ', $formats),
            ]],
            'compatibility' => in_array('XLSX', $formats, true) || in_array('DOCX', $formats, true)
                ? 'Word, Excel, Google Docs, LibreOffice' : (in_array('Canva', $formats, true) ? 'Canva (gratuit)' : 'Tout lecteur PDF'),
            'rating_avg' => $rating,
            'rating_count' => $count,
            'rating_distribution' => $count ? $this->distribution($rating) : null,
            'sales_count' => (int) ($count * 6.5),
            'views_count' => (int) ($count * 190),
            'preview_pages' => 6,
            'faq' => $this->defaultFaq(),
            'version_updated_at' => $this->now->subDays(mt_rand(10, 60)),
            'created_at' => $this->now->subDays(mt_rand(60, 260)),
        ], $extra));

        $ext = match ($cover) {
            'sheet' => 'xlsx', 'doc' => 'docx', 'book' => 'pdf', default => 'zip'
        };
        $this->files($product, [[$slug.'.'.$ext, $status === 'DRAFT' ? ScanStatus::PENDING : ScanStatus::CLEAN]]);

        return $product;
    }

    /** @param  array<int, array{0:string, 1:ScanStatus}>  $files */
    private function files(Product $product, array $files, bool $replace = false): void
    {
        if ($replace) {
            $product->files()->delete();
        }
        foreach ($files as [$name, $scan]) {
            $key = "demo/{$product->id}/".Str::random(8)."/$name";
            $size = DemoFiles::make($key, $name, $product->title);
            $product->files()->create([
                'storage_key' => $key, 'file_name' => $name, 'size' => $size,
                'format' => strtoupper(pathinfo($name, PATHINFO_EXTENSION)), 'version' => $product->version ?? '1.0', 'scan_status' => $scan,
            ]);
        }
    }

    private function enrichBusinessPlan(): void
    {
        $p = $this->products['business-plan-pro'];
        $p->update([
            'short_description' => 'Le business plan prêt à remplir qu’attendent les banques et les investisseurs : 42 pages structurées, prévisionnel financier sur 3 ans et 10 exemples adaptés au marché ouest-africain.',
            'description' => "Rédiger un business plan prend des semaines. Ce modèle vous guide section par section : résumé exécutif, étude de marché, stratégie commerciale, organisation et plan de financement.\n\nLe prévisionnel Excel calcule automatiquement vos marges, votre trésorerie et votre seuil de rentabilité en FCFA. Il suffit de saisir vos hypothèses de ventes et de charges.",
            'commercial_price' => 18000,
            'version_updated_at' => CarbonImmutable::create(2026, 9, 12),
            'compatibility' => 'Word, Excel, Google Docs, LibreOffice',
            'formats' => ['ZIP', 'DOCX', 'XLSX', 'PDF'],
            'video_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'video_duration' => '1:24',
            'preview_pages' => 6,
            'rating_distribution' => [5 => 88, 4 => 9, 3 => 2, 2 => 1, 1 => 0],
            'tags' => ['business plan', 'prévisionnel', 'banque', 'investisseurs', 'boutique', 'commerce', 'restaurant'],
            'includes' => [
                ['title' => 'Modèle de business plan', 'description' => '42 pages structurées, prêtes à remplir', 'format' => 'DOCX · PDF'],
                ['title' => 'Prévisionnel financier sur 3 ans', 'description' => 'Compte de résultat, trésorerie, seuil de rentabilité automatiques', 'format' => 'XLSX'],
                ['title' => 'Guide de rédaction', 'description' => '28 pages de conseils et d’exemples rédigés', 'format' => 'PDF'],
                ['title' => '10 exemples sectoriels', 'description' => 'Commerce, restauration, transport, agriculture, services…', 'format' => 'DOCX'],
                ['title' => 'Bonus : pitch deck investisseurs', 'description' => '12 slides au format présentation', 'format' => 'PPTX · Canva'],
            ],
        ]);
        $this->files($p, [
            ['business-plan-pro.docx', ScanStatus::CLEAN], ['previsionnel-3-ans.xlsx', ScanStatus::CLEAN], ['guide-redaction.pdf', ScanStatus::CLEAN],
            ['exemples-sectoriels.zip', ScanStatus::CLEAN], ['pitch-deck.pdf', ScanStatus::CLEAN],
        ], replace: true);
        $this->products['pack-30-templates-instagram']->update(['version_updated_at' => $this->now->subDays(3)]);
    }

    private function shortDescription(string $title, string $category): string
    {
        return Str::before($title, ' —').' : une ressource '.Str::lower($category).' professionnelle, prête à l’emploi et pensée pour les entrepreneurs d’Afrique francophone.';
    }

    /** @return array<int, int> */
    private function distribution(float $rating): array
    {
        $five = (int) max(40, min(92, round(($rating - 4) * 100 - 2)));
        $four = (int) min(100 - $five, round((100 - $five) * 0.7));
        $three = (int) round((100 - $five - $four) * 0.6);
        $two = (int) round((100 - $five - $four - $three) * 0.7);

        return [5 => $five, 4 => $four, 3 => $three, 2 => $two, 1 => 100 - $five - $four - $three - $two];
    }

    /** @return array<int, array{q:string, a:string}> */
    private function defaultFaq(): array
    {
        return [
            ['q' => 'Comment vais-je recevoir le fichier ?', 'a' => 'Dès la confirmation du paiement, un bouton de téléchargement s’affiche, un email vous est envoyé et le produit est ajouté à votre bibliothèque, accessible à vie.'],
            ['q' => 'Puis-je l’utiliser pour mes clients ?', 'a' => 'Oui, avec la licence commerciale. La licence personnelle couvre uniquement votre propre entreprise.'],
            ['q' => 'Le modèle fonctionne-t-il sur Google Docs ?', 'a' => 'Oui. Les fichiers Word et Excel s’ouvrent dans Google Docs, Google Sheets et LibreOffice.'],
            ['q' => 'Que se passe-t-il si le fichier est défectueux ?', 'a' => 'Vous êtes remboursé sous 7 jours. Ouvrez un ticket depuis votre commande, notre équipe répond en moins de 24 h.'],
        ];
    }

    private function seedBundleAndCoupons(): void
    {
        $bundle = Bundle::create([
            'title' => 'Pack Entrepreneur', 'slug' => 'pack-entrepreneur', 'price' => 25000, 'value' => 45000, 'featured' => true,
            'tagline' => 'Tout pour lancer et piloter votre activité : business plan, tableaux de gestion, factures OHADA et templates réseaux sociaux.',
            'description' => "Business Plan Pro + prévisionnel financier\n3 tableaux Excel de gestion\n25 modèles de factures et devis OHADA\n30 templates Instagram",
        ]);
        $bundle->products()->attach(collect(['business-plan-pro', 'dashboard-excel-gestion-stock', 'modeles-factures-ohada', 'pack-30-templates-instagram'])
            ->map(fn ($s) => $this->products[$s]->id));

        Bundle::create([
            'title' => 'Pack Créateur de contenu', 'slug' => 'pack-createur-contenu', 'price' => 9000, 'value' => 15500, 'cover_type' => 'grid',
            'tagline' => 'Templates Instagram, calendrier éditorial et prompts IA pour publier chaque jour sans y passer des heures.',
            'description' => "30 templates Instagram\nCalendrier éditorial 2027\n500 prompts IA",
        ])->products()->attach(collect(['pack-30-templates-instagram', 'calendrier-editorial-2027', 'pack-500-prompts-ia'])->map(fn ($s) => $this->products[$s]->id));

        Coupon::create(['code' => 'LANCEMENT', 'description' => '-10 % sur tout le site', 'type' => CouponType::PERCENT, 'value' => 10,
            'scope' => CouponScope::ALL, 'expires_at' => $this->now->addDays(5)->endOfDay()]);
        Coupon::create(['code' => 'BIENVENUE', 'description' => '-20 % sur tous les packs', 'type' => CouponType::PERCENT, 'value' => 20,
            'scope' => CouponScope::PACKS, 'expires_at' => $this->now->addMonths(2)]);
        Coupon::create(['code' => 'PACK5000', 'description' => '-5 000 F sur un pack', 'type' => CouponType::FIXED, 'value' => 5000,
            'scope' => CouponScope::PACKS, 'min_amount' => 9000, 'expires_at' => CarbonImmutable::create($this->now->year, 12, 31, 23, 59)]);
    }

    // ───────────────────────────── Commandes

    /**
     * Crée une commande (et sa livraison si payée) puis l'antidate.
     *
     * @param  array<int, array{0:Product, 1?:License}>  $items
     */
    private function order(User $user, array $items, PaymentMethod $method, OrderStatus $status, CarbonImmutable $at,
        ?Coupon $coupon = null, ?string $number = null, ?string $webhook = null, ?int $bundlePrice = null): Order
    {
        $lines = collect($items)->map(fn ($i) => ['type' => 'product', 'product' => $i[0], 'license' => ($i[1] ?? License::PERSONAL)->value,
            'price' => $i[0]->priceFor(($i[1] ?? License::PERSONAL)->value), 'bundle_id' => null, 'product_id' => $i[0]->id]);
        if ($bundlePrice !== null) {
            $bundle = Bundle::where('slug', 'pack-entrepreneur')->first();
            $lines = collect([['type' => 'bundle', 'bundle' => $bundle->load('products'), 'bundle_id' => $bundle->id, 'product_id' => null, 'price' => $bundlePrice, 'license' => 'PERSONAL']]);
        }
        $subtotal = (int) $lines->sum('price');
        $discount = $coupon ? (int) round($subtotal * $coupon->value / 100) : 0;

        $order = Order::create([
            'number' => $number ?? sprintf('DN-%d-%06d', $at->year, $this->orderSeq++),
            'user_id' => $user->id, 'email' => $user->email, 'phone' => $user->phone ?? '+2250700000000',
            'subtotal' => $subtotal, 'discount' => $discount, 'total' => $subtotal - $discount,
            'status' => OrderStatus::PENDING, 'coupon_id' => $coupon?->id, 'payment_method' => $method,
            'payment_phone' => $user->phone, 'access_token' => Str::random(48), 'expires_at' => $at->addMinutes(5),
        ]);
        app(OrderService::class)->createItems($order, $lines->all(), $subtotal, $discount);

        $prefix = MockProvider::PREFIXES[$method->value];
        $paymentStatus = match ($status) {
            OrderStatus::PAID, OrderStatus::REFUNDED => PaymentStatus::SUCCEEDED,
            OrderStatus::FAILED => PaymentStatus::FAILED,
            OrderStatus::EXPIRED => PaymentStatus::EXPIRED,
            default => PaymentStatus::PENDING,
        };
        $order->payments()->create([
            'provider' => 'mock', 'method' => $method, 'provider_ref' => $prefix.'_'.Str::lower(Str::random(14)),
            'amount' => $order->total, 'status' => $paymentStatus, 'attempts' => 1,
            'webhook_status' => $webhook ?? match ($status) {
                OrderStatus::PAID, OrderStatus::REFUNDED => 'Vérifié', OrderStatus::FAILED => 'Refusé',
                OrderStatus::EXPIRED => 'Expiré', default => 'En attente',
            },
            'verified_at' => $paymentStatus === PaymentStatus::SUCCEEDED ? $at->addSeconds(48) : null,
            'created_at' => $at, 'updated_at' => $at,
        ]);
        $order->events()->create(['type' => 'created', 'label' => 'Commande créée', 'created_at' => $at]);
        $order->events()->create(['type' => 'payment_initiated', 'label' => 'Paiement initié · '.$method->label(), 'created_at' => $at->addSeconds(5)]);

        if (in_array($status, [OrderStatus::PAID, OrderStatus::REFUNDED], true)) {
            app(FulfillmentService::class)->markPaid($order, notify: false);
            $paidAt = $at->addSeconds(48);
            $order->update(['paid_at' => $paidAt]);
            $order->events()->update(['created_at' => $paidAt]);
            $order->events()->whereIn('type', ['created'])->update(['created_at' => $at]);
            foreach ($order->items as $item) {
                $item->libraryItem?->update(['granted_at' => $paidAt, 'created_at' => $paidAt]);
                LedgerEntry::where('order_item_id', $item->id)->update(['available_at' => $paidAt->addDays(7), 'created_at' => $paidAt]);
            }
            if ($status === OrderStatus::REFUNDED) {
                app(FulfillmentService::class)->refund($order->fresh('items.libraryItem', 'items.seller'));
            }
        } else {
            $order->update(['status' => $status]);
        }
        $order->update(['created_at' => $at, 'updated_at' => $at]);
        $order->items()->update(['created_at' => $at, 'updated_at' => $at]);
        $order->invoice?->update(['created_at' => $at]);

        return $order;
    }

    private function seedSalesHistory(): void
    {
        $methods = [PaymentMethod::WAVE, PaymentMethod::WAVE, PaymentMethod::ORANGE_MONEY, PaymentMethod::ORANGE_MONEY,
            PaymentMethod::MTN_MOMO, PaymentMethod::MOOV_MONEY, PaymentMethod::CARD];
        $buyers = collect($this->users)->filter(fn (User $u) => $u->role === Role::CLIENT && $u->email !== 'aicha.kone@exemple.ci')->values();

        $jeanTop = ['template-cv-moderne' => 28, 'pack-canva-restaurant' => 21, 'excel-business-complet' => 15, 'e-book-facturer-ses-clients' => 12];
        $jeanOther = ['kit-excel-facturation', 'planning-hebdo-notion', 'pack-flyers-evenements', 'contrat-travail-ci', 'tableau-de-bord-rh',
            'e-book-vendre-sur-whatsapp', 'budget-familial-excel', 'pack-icones-afrique'];
        $studio = ['business-plan-pro', 'pack-500-prompts-ia', 'pack-30-templates-instagram', 'dashboard-excel-gestion-stock',
            'kit-cv-lettre-motivation', 'guide-lancer-boutique-en-ligne', 'modeles-factures-ohada', 'pack-logos-charte-graphique', 'planner-notion-entrepreneur'];

        // 30 derniers jours : volumes des écrans 41 et 43.
        foreach ($jeanTop as $slug => $count) {
            for ($i = 0; $i < $count; $i++) {
                $this->order($buyers->random(), [[$this->products[$slug]]], Arr::random($methods), OrderStatus::PAID,
                    $this->now->subMinutes(mt_rand(8, 60 * 24 * 29)));
            }
        }
        for ($i = 0; $i < 8; $i++) {
            $this->order($buyers->random(), [[$this->products[Arr::random($jeanOther)]]], Arr::random($methods), OrderStatus::PAID,
                $this->now->subMinutes(mt_rand(60, 60 * 24 * 29)));
        }
        // Historique 2026 (janvier → septembre), croissance progressive.
        $cutoff = $this->now->subDays(31);
        for ($m = 1; $m <= 9; $m++) {
            $volume = 8 + $m * 6;
            for ($i = 0; $i < $volume; $i++) {
                $slug = mt_rand(0, 2) ? Arr::random(array_keys($jeanTop)) : Arr::random($jeanOther);
                $this->order($buyers->random(), [[$this->products[$slug]]], Arr::random($methods), OrderStatus::PAID,
                    CarbonImmutable::create(2026, $m, mt_rand(1, 28), mt_rand(7, 22), mt_rand(0, 59))->min($cutoff->subHours(mt_rand(1, 300))));
            }
        }
        // Ventes DigiNova Studio + autres créateurs (tableau de bord admin, 30 jours).
        $jeanId = $this->users['jean']->sellerProfile->id;
        $others = collect($this->products)->filter(fn (Product $p) => $p->status === ProductStatus::PUBLISHED && $p->seller_id !== $jeanId)->keys()->all();
        for ($i = 0; $i < 140; $i++) {
            $slug = mt_rand(0, 3) ? Arr::random($studio) : Arr::random($others);
            $status = Arr::random([OrderStatus::PAID, OrderStatus::PAID, OrderStatus::PAID, OrderStatus::PAID, OrderStatus::PAID,
                OrderStatus::PAID, OrderStatus::PAID, OrderStatus::PAID, OrderStatus::PAID, OrderStatus::FAILED, OrderStatus::EXPIRED]);
            $this->order($buyers->random(), [[$this->products[$slug], mt_rand(0, 6) ? License::PERSONAL : License::COMMERCIAL]],
                Arr::random($methods), $status, $this->now->subMinutes(mt_rand(30, 60 * 24 * 30)));
        }
    }

    private function seedAichaAccount(): void
    {
        $a = $this->users['aicha'];
        $p = $this->products;
        $lancement = Coupon::where('code', 'LANCEMENT')->first();
        $d = fn (int $m, int $day, int $h = 10, int $min = 12) => CarbonImmutable::create(2026, $m, $day, $h, $min);

        $this->order($a, [[$p['business-plan-pro']], [$p['dashboard-excel-gestion-stock']]], PaymentMethod::WAVE, OrderStatus::PAID,
            $this->now->subMinutes(40), $lancement, 'DN-2026-004812');
        $this->order($a, [], PaymentMethod::ORANGE_MONEY, OrderStatus::FAILED, $this->now->subDays(0)->subHours(3), null, 'DN-2026-004790', bundlePrice: 25000);
        $this->order($a, [[$p['pack-30-templates-instagram']]], PaymentMethod::MTN_MOMO, OrderStatus::PAID, $d(9, 14), null, 'DN-2026-003977');
        $this->order($a, [[$p['kit-cv-lettre-motivation']]], PaymentMethod::WAVE, OrderStatus::REFUNDED, $d(8, 28), null, 'DN-2026-003120');
        $this->order($a, [[$p['pack-500-prompts-ia']]], PaymentMethod::CARD, OrderStatus::PAID, $d(8, 2), null, 'DN-2026-002644');
        $this->order($a, [[$p['planner-notion-entrepreneur']]], PaymentMethod::MOOV_MONEY, OrderStatus::PAID, $d(7, 19), null, 'DN-2026-002011');
        $this->order($a, [[$p['guide-lancer-boutique-en-ligne']]], PaymentMethod::ORANGE_MONEY, OrderStatus::AWAITING_CONFIRMATION, $d(7, 3), null, 'DN-2026-001502');
        // Achats plus anciens pour atteindre 12 produits en bibliothèque.
        $older = [['pack-logos-charte-graphique', 6, 21], ['template-cv-moderne', 6, 2], ['pack-canva-restaurant', 5, 18],
            ['e-book-vendre-sur-whatsapp', 5, 3], ['budget-familial-excel', 4, 22], ['statuts-sarl-ohada', 4, 9], ['prompts-marketing-afrique', 3, 30]];
        foreach ($older as $i => [$slug, $m, $day]) {
            $this->order($a, [[$p[$slug]]], [PaymentMethod::WAVE, PaymentMethod::ORANGE_MONEY][$i % 2], OrderStatus::PAID, $d($m, $day), null, sprintf('DN-2026-%06d', 1450 - $i * 40));
        }

        // Bibliothèque : compteur de téléchargements de l'écran 31 et mise à jour v2.0 de l'écran 30.
        $a->libraryItems()->where('product_id', $p['business-plan-pro']->id)->update(['download_count' => 3]);
        $a->libraryItems()->where('product_id', $p['pack-30-templates-instagram']->id)->update(['seen_version' => '1.0']);
        $a->libraryItems()->inRandomOrder()->limit(6)->get()->each(fn ($li) => $li->download_count ?: $li->update(['download_count' => mt_rand(1, 4)]));
        // Journal cohérent avec les compteurs (28 téléchargements dont 3 cette semaine, écran 30).
        $a->libraryItems()->with('product.files')->get()->each(function ($li) {
            for ($i = 0; $i < $li->download_count; $i++) {
                $li->downloads()->create(['product_file_id' => $li->product->files->first()?->id, 'ip' => '102.67.'.mt_rand(1, 250).'.'.mt_rand(1, 250),
                    'user_agent' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 'created_at' => $li->granted_at->copy()->addDays(mt_rand(0, 20))->min($this->now->subDays(8))]);
            }
        });
        $recent = $a->libraryItems()->latest('granted_at')->first();
        foreach (range(1, 3) as $i) {
            $recent->downloads()->create(['ip' => '102.67.12.4', 'user_agent' => 'Mozilla/5.0 (Windows NT 10.0) Chrome/128', 'created_at' => $this->now->subDays($i)]);
        }
        $extra = 28 - $a->libraryItems()->withCount('downloads')->get()->sum('downloads_count');
        for ($i = 0; $i < $extra; $i++) {
            $li = $a->libraryItems()->inRandomOrder()->first();
            $li->downloads()->create(['ip' => '102.67.12.4', 'user_agent' => 'Mozilla/5.0', 'created_at' => $this->now->subDays(mt_rand(9, 90))]);
        }

        // Coupons attribués + favoris avec baisse de prix (écrans 30 et 33).
        $a->coupons()->attach(Coupon::whereIn('code', ['LANCEMENT', 'PACK5000'])->pluck('id'));
        $fav = fn (string $slug, int $saved) => Favorite::create(['user_id' => $a->id, 'product_id' => $p[$slug]->id, 'price_at_save' => $saved]);
        $fav('guide-lancer-boutique-en-ligne', 6000);
        $fav('modeles-factures-ohada', 5000);
        $fav('pack-logos-charte-graphique', 15000);
        $fav('pack-500-prompts-ia', 7500);
        $fav('planner-notion-entrepreneur', 8000);
        $fav('calendrier-editorial-2027', 3000);

        $a->notify(new AppNotification('update', 'Mise à jour disponible',
            'Pack 30 templates Instagram passe en v2.0 : 10 nouveaux modèles inclus gratuitement.', '/compte/bibliotheque'));
    }

    private function seedAdminOrders(): void
    {
        $p = $this->products;
        $u = $this->users;
        $at = fn (int $h, int $m, int $s = 0) => $this->now->setTime($h, $m, $s);

        $serge = $this->order($u['serge-tano'], [[$p['business-plan-pro']]], PaymentMethod::CARD, OrderStatus::NEEDS_REVIEW,
            $at(13, 41, 7)->min($this->now), null, 'DN-2026-004809', 'Échec signature');
        $base = $serge->created_at->toImmutable();
        $serge->events()->delete();
        foreach ([
            ['created', 'Commande créée', null, 'info', 0],
            ['payment_initiated', 'Paiement initié · carte 3-D Secure', null, 'info', 5],
            ['webhook', 'Webhook reçu', $base->addSeconds(83)->format('H:i:s').' · signature invalide', 'danger', 83],
            ['webhook', 'Nouvel essai webhook (3/3)', $base->addSeconds(683)->format('H:i:s').' · signature invalide', 'danger', 683],
            ['counter_check', 'Contre-vérification API', 'En attente d’action manuelle', 'warning', 690],
        ] as [$type, $label, $detail, $level, $offset]) {
            $serge->events()->create(compact('type', 'label', 'detail', 'level') + ['created_at' => $base->addSeconds($offset)]);
        }
        $serge->latestPayment()->first()->update(['attempts' => 3, 'provider_ref' => 'ch_3Q'.Str::random(10).'8fK']);
        app(MockProvider::class)->store($serge->latestPayment()->first()->provider_ref, ['status' => 'SUCCEEDED', 'amount' => 12000]);

        $this->order($u['koffi-bamba'], [[$p['pack-500-prompts-ia']]], PaymentMethod::ORANGE_MONEY, OrderStatus::AWAITING_CONFIRMATION, $this->now->subMinutes(6), null, 'DN-2026-004811');
        $this->order($u['fatou-diallo'], [], PaymentMethod::MTN_MOMO, OrderStatus::AWAITING_CONFIRMATION, $this->now->subMinutes(9), null, 'DN-2026-004810', bundlePrice: 25000);
        $this->order($u['awa-sangare'], [[$p['guide-lancer-boutique-en-ligne']]], PaymentMethod::WAVE, OrderStatus::PAID, $this->now->subMinutes(55), null, 'DN-2026-004808');
        $this->order($u['yao-kouame'], [[$p['planner-notion-entrepreneur']]], PaymentMethod::MOOV_MONEY, OrderStatus::EXPIRED, $this->now->subMinutes(70), null, 'DN-2026-004807');
        $this->order($u['mariam-sylla'], [[$p['pack-logos-charte-graphique']]], PaymentMethod::WAVE, OrderStatus::PAID, $this->now->subMinutes(95), null, 'DN-2026-004806');
        $this->order($u['ibrahim-kone'], [[$p['kit-cv-lettre-motivation']]], PaymentMethod::ORANGE_MONEY, OrderStatus::PAID, $this->now->subMinutes(120), null, 'DN-2026-004805');

        foreach (Order::whereIn('status', [OrderStatus::AWAITING_CONFIRMATION])->with('latestPayment')->get() as $o) {
            app(MockProvider::class)->store($o->latestPayment->provider_ref, ['status' => 'PENDING', 'amount' => $o->total, 'order' => $o->number, 'method' => $o->payment_method->value]);
        }
        // 2 demandes de remboursement en attente (badge admin).
        foreach (Order::where('status', OrderStatus::PAID)->where('user_id', '!=', $u['aicha']->id)->inRandomOrder()->limit(2)->get() as $o) {
            $o->refundRequests()->create(['user_id' => $o->user_id, 'reason' => 'Le fichier ne s’ouvre pas sur mon téléphone.']);
        }
    }

    private function seedReviews(): void
    {
        $bpp = $this->products['business-plan-pro'];
        $review = function (string $userKey, Product $product, int $rating, string $comment, CarbonImmutable $at, ?string $reply = null) {
            $user = $this->users[$userKey];
            $item = OrderItem::whereHas('order', fn ($q) => $q->where('user_id', $user->id)->where('status', OrderStatus::PAID))
                ->where('product_id', $product->id)->first()
                ?? $this->order($user, [[$product]], PaymentMethod::WAVE, OrderStatus::PAID, $at->subDays(2))->items->first();
            Review::create(['user_id' => $user->id, 'product_id' => $product->id, 'order_item_id' => $item->id, 'rating' => $rating,
                'comment' => $comment, 'seller_reply' => $reply, 'seller_replied_at' => $reply ? $at->addDay() : null,
                'created_at' => $at, 'updated_at' => $at]);
        };
        $review('aminata-kabore', $bpp, 5, 'Présenté à ma banque sans rien refaire. Le prévisionnel Excel m’a évité de payer un consultant.', $this->now->subDays(3));
        $review('serge-tano', $bpp, 4, 'Très complet. Les exemples sectoriels m’ont aidé pour mon projet de transport. J’aurais aimé un exemple agricole de plus.', $this->now->subWeeks(2),
            'Merci Serge ! Un exemple agricole arrive dans la prochaine mise à jour, gratuite pour vous.');
        $review('christelle-nguessan', $bpp, 5, 'Clair, structuré et adapté à nos réalités. Je recommande.', $this->now->subWeeks(3));
        $review('koffi-bamba', $this->products['dashboard-excel-gestion-stock'], 5, 'Les tableaux Excel ont remplacé mon cahier. Je vois enfin mon stock et mes marges en temps réel.', $this->now->subWeeks(1));
        $review('fatou-diallo', $this->products['pack-30-templates-instagram'], 5, 'Les templates Instagram m’ont fait gagner des heures chaque semaine pour mes clients.', $this->now->subDays(10));
        // Avis sans réponse côté Jean (écran 41 : « 2 avis sans réponse »).
        $review('moussa-traore', $this->products['template-cv-moderne'], 5, 'Super modèle, j’ai décroché un entretien la semaine suivante.', $this->now->subDays(2));
        $review('adjoa-mensah', $this->products['pack-canva-restaurant'], 4, 'Beaux visuels, il manque un format pour les stories.', $this->now->subDays(4));
        $review('brice-ahouansou', $this->products['excel-business-complet'], 5, 'Indispensable pour suivre ma trésorerie.', $this->now->subDays(20), 'Merci Brice !');

        Report::create(['product_id' => $this->products['pack-tiktok-commerce']->id, 'reporter_id' => $this->users['yao-kouame']->id,
            'reason' => 'Contenu copié', 'details' => 'Les visuels ressemblent à un pack vendu sur un autre site.']);
    }

    private function seedTickets(): void
    {
        $a = $this->users['aicha'];
        $staff = $this->users['support'];
        $order = Order::where('number', 'DN-2026-004812')->first();
        $t = SupportTicket::create(['number' => 1048, 'user_id' => $a->id, 'order_id' => $order->id, 'assignee_id' => $staff->id,
            'subject' => 'Lien de téléchargement expiré', 'status' => TicketStatus::IN_PROGRESS, 'last_message_at' => $this->now->subMinutes(12)]);
        $base = $this->now->setTime(14, 2)->min($this->now->subMinutes(20));
        $t->messages()->create(['author_id' => $a->id, 'body' => 'Bonjour, le lien reçu par email ne fonctionne plus, il affiche « lien expiré ».',
            'attachments' => [['name' => 'capture-erreur.png', 'size' => 184000]], 'created_at' => $base]);
        $t->messages()->create(['author_id' => $staff->id, 'from_staff' => true, 'created_at' => $base->addMinutes(7),
            'body' => 'Bonjour Aïcha, les liens email expirent après 15 minutes pour protéger vos fichiers. Vous pouvez en générer un nouveau à tout moment depuis Ma bibliothèque.']);
        $t->messages()->create(['author_id' => $staff->id, 'from_staff' => true, 'created_at' => $base->addMinutes(8),
            'body' => 'J’ai réinitialisé votre compteur de téléchargements (0/10). Le bouton « Télécharger » de votre bibliothèque génère un lien valable 15 minutes.']);

        foreach ([[1012, 'Facture au nom de mon entreprise', 9, 12], [987, 'Paiement Orange Money en attente', 8, 28], [950, 'Question sur la licence commerciale', 8, 2]] as [$n, $subject, $m, $d]) {
            $at = CarbonImmutable::create(2026, $m, $d, 11);
            $tk = SupportTicket::create(['number' => $n, 'user_id' => $a->id, 'subject' => $subject, 'status' => TicketStatus::RESOLVED,
                'assignee_id' => $staff->id, 'last_message_at' => $at, 'created_at' => $at, 'updated_at' => $at]);
            $tk->messages()->create(['author_id' => $a->id, 'body' => "Bonjour, $subject.", 'created_at' => $at]);
            $tk->messages()->create(['author_id' => $staff->id, 'from_staff' => true, 'body' => 'C’est réglé, merci pour votre patience !', 'created_at' => $at->addHours(2)]);
        }
        // Tickets ouverts d'autres clients (badge admin « 9 »).
        foreach (range(1, 8) as $i) {
            $user = $this->users['client'.$i];
            $tk = SupportTicket::create(['number' => 1048 + $i, 'user_id' => $user->id, 'subject' => Arr::random([
                'Je n’ai pas reçu mon fichier', 'Paiement débité deux fois', 'Code SMS non reçu', 'Changer l’email de mon compte', 'Licence pour mon agence',
            ]), 'status' => TicketStatus::OPEN, 'last_message_at' => $this->now->subHours($i * 3)]);
            $tk->messages()->create(['author_id' => $user->id, 'body' => 'Bonjour, pouvez-vous m’aider ? Merci.', 'created_at' => $this->now->subHours($i * 3)]);
        }
    }

    private function seedApplications(): void
    {
        $apps = [
            ['Jean Kouassi Design', 'jean.design@exemple.ci', 'CI', 'Abidjan', 'Formateur Excel et designer depuis 8 ans. J’aide les PME à mieux gérer leur activité avec des outils simples.', ['Business', 'Design', 'E-books & formations'], 'VERIFIED', 'WAVE', true, 52, 'behance.net/jeankouassi'],
            ['Mariam Sylla Studio', 'mariam.studio@exemple.sn', 'SN', 'Dakar', 'Community manager, 40 marques accompagnées.', ['Réseaux sociaux', 'Design'], 'VERIFIED', 'ORANGE_MONEY', true, 30, null],
            ['Compta Express', 'compta.express@exemple.ci', 'CI', 'Bouaké', 'Cabinet comptable, modèles de paie et fiscalité.', ['Business', 'Finance'], 'BLURRY', 'BANK', false, 12, null],
            ['Ibrahim Koné', 'ibrahim.agro@exemple.tg', 'TG', 'Lomé', 'Guides pratiques sur l’élevage et l’agriculture.', ['E-books & formations'], 'MISSING', 'MTN_MOMO', true, 3, null],
        ];
        foreach ($apps as [$studio, $email, $country, $city, $bio, $cats, $idStatus, $payout, $payoutOk, $hours, $portfolio]) {
            $user = User::create(['name' => $studio, 'email' => $email, 'password' => 'password', 'role' => Role::CLIENT,
                'country' => $country, 'city' => $city, 'email_verified_at' => $this->now]);
            CreatorApplication::create([
                'user_id' => $user->id, 'step' => 4, 'studio_name' => $studio, 'country' => $country, 'city' => $city, 'bio' => $bio,
                'categories' => $cats, 'portfolio_url' => $portfolio, 'id_status' => $idStatus, 'id_document_key' => $idStatus === 'MISSING' ? null : 'demo/id/'.Str::slug($studio).'.jpg',
                'sample_files' => [['name' => 'exemple-1.pdf'], ['name' => 'exemple-2.png']], 'payout_method' => $payout, 'payout_account' => '+22507000000',
                'payout_verified' => $payoutOk, 'status' => ApplicationStatus::SUBMITTED, 'submitted_at' => $this->now->subHours($hours),
            ]);
        }
        foreach (range(1, 11) as $i) {
            $user = $this->users['client'.(10 + $i)];
            CreatorApplication::create(['user_id' => $user->id, 'step' => 4, 'studio_name' => $user->name, 'country' => 'CI', 'bio' => 'Créateur indépendant.',
                'categories' => ['Design'], 'id_status' => 'VERIFIED', 'payout_method' => 'WAVE', 'payout_verified' => true,
                'status' => $i <= 7 ? ApplicationStatus::APPROVED : ApplicationStatus::REJECTED, 'submitted_at' => $this->now->subDays(10 + $i),
                'reviewed_at' => $this->now->subDays(8 + $i), 'reviewer_id' => $this->users['admin']->id]);
        }
    }

    private function seedPayouts(): void
    {
        $jean = $this->users['jean']->sellerProfile;
        $accounts = $jean->payoutAccounts->keyBy('method');
        $rows = [
            ['PO-2026-0112', 250000, 'WAVE', PayoutStatus::PROCESSING, [9, 30]], ['PO-2026-0098', 180000, 'WAVE', PayoutStatus::PAID, [9, 15]],
            ['PO-2026-0081', 210000, 'ORANGE_MONEY', PayoutStatus::PAID, [8, 31]], ['PO-2026-0067', 300000, 'BANK', PayoutStatus::PAID, [8, 14]],
            ['PO-2026-0055', 160000, 'WAVE', PayoutStatus::PAID, [7, 30]], ['PO-2026-0048', 140000, 'WAVE', PayoutStatus::PAID, [7, 12]],
            ['PO-2026-0039', 130000, 'ORANGE_MONEY', PayoutStatus::PAID, [6, 28]], ['PO-2026-0031', 120000, 'WAVE', PayoutStatus::PAID, [6, 5]],
            ['PO-2026-0024', 100000, 'WAVE', PayoutStatus::PAID, [5, 20]], ['PO-2026-0017', 90000, 'WAVE', PayoutStatus::PAID, [4, 25]],
            ['PO-2026-0011', 85000, 'ORANGE_MONEY', PayoutStatus::PAID, [3, 30]], ['PO-2026-0006', 75000, 'WAVE', PayoutStatus::PAID, [2, 27]],
        ];
        foreach ($rows as [$ref, $amount, $method, $status, [$m, $d]]) {
            $at = CarbonImmutable::create(2026, $m, $d, 9);
            $acc = $accounts[$method];
            $payout = $jean->payouts()->create(['payout_account_id' => $acc->id, 'reference' => $ref, 'amount' => $amount, 'method' => $method,
                'account_label' => $acc->label.' · '.$acc->masked, 'status' => $status, 'processed_at' => $status === PayoutStatus::PAID ? $at->addDays(2) : null,
                'created_at' => $at, 'updated_at' => $at]);
            $jean->ledgerEntries()->create(['payout_id' => $payout->id, 'amount' => -$amount, 'type' => 'PAYOUT', 'description' => "Retrait $ref",
                'available_at' => $at, 'created_at' => $at]);
        }
        // Solde d'ouverture : aligne le solde disponible sur l'écran 44 (312 000 FCFA).
        $balances = app(LedgerService::class)->balances($jean);
        $jean->ledgerEntries()->create(['amount' => 312000 - $balances['available'], 'type' => 'ADJUSTMENT',
            'description' => 'Solde d’ouverture (reprise de l’historique)', 'available_at' => CarbonImmutable::create(2026, 1, 1), 'created_at' => CarbonImmutable::create(2026, 1, 1)]);

        foreach (['teranga-studio', 'agro-guides', 'compta-facile', 'juris-facile'] as $i => $slug) {
            $seller = SellerProfile::where('slug', $slug)->first();
            $acc = $seller->payoutAccounts()->create(['method' => 'WAVE', 'label' => 'Wave', 'account' => '+22507000001'.$i, 'masked' => '07 •• •• 1'.$i, 'is_default' => true]);
            $seller->ledgerEntries()->create(['amount' => 60000 + $i * 15000, 'type' => 'ADJUSTMENT', 'description' => 'Solde d’ouverture', 'available_at' => $this->now->subMonth()]);
            $p = $seller->payouts()->create(['payout_account_id' => $acc->id, 'reference' => sprintf('PO-2026-%04d', 113 + $i), 'amount' => 20000 + $i * 5000,
                'method' => 'WAVE', 'account_label' => 'Wave · '.$acc->masked, 'status' => PayoutStatus::REQUESTED]);
            $seller->ledgerEntries()->create(['payout_id' => $p->id, 'amount' => -$p->amount, 'type' => 'PAYOUT', 'description' => "Retrait {$p->reference}", 'available_at' => $this->now]);
        }
    }

    private function seedContent(): void
    {
        $articles = [
            'paiement' => ['J’ai payé mais je n’ai pas reçu mon fichier', 'Mon paiement Orange Money est « en attente »', 'Quels moyens de paiement sont acceptés ?', 'Mon paiement a échoué : que faire ?'],
            'telechargements' => ['Comment retrouver mes achats dans ma bibliothèque ?', 'Mon lien de téléchargement a expiré', 'Quels logiciels pour ouvrir mes fichiers ?'],
            'compte' => ['Je n’ai pas reçu mon code de connexion', 'Changer mon adresse email', 'Activer la validation en deux étapes'],
            'remboursements' => ['Comment demander un remboursement ?', 'Délais de remboursement Mobile Money'],
            'licences' => ['Puis-je utiliser un produit pour un client ?', 'Licence personnelle ou commerciale : quelle différence ?'],
            'createurs' => ['Comment devenir créateur ?', 'Commissions et retraits', 'Délai de modération des produits'],
        ];
        $popular = ['J’ai payé mais je n’ai pas reçu mon fichier', 'Mon paiement Orange Money est « en attente »', 'Comment retrouver mes achats dans ma bibliothèque ?',
            'Puis-je utiliser un produit pour un client ?', 'Comment demander un remboursement ?', 'Je n’ai pas reçu mon code de connexion'];
        foreach ($articles as $cat => $titles) {
            foreach ($titles as $i => $title) {
                HelpArticle::create(['category' => $cat, 'title' => $title, 'slug' => Str::slug($title), 'position' => array_search($title, $popular, true) !== false ? array_search($title, $popular, true) : 10 + $i,
                    'is_faq' => in_array($title, $popular, true),
                    'body' => "$title ?\n\nVoici la marche à suivre. Dans la plupart des cas, la solution prend moins de deux minutes.\n\n1. Connectez-vous à votre compte DigiNova.\n2. Ouvrez Ma bibliothèque ou Commandes & factures.\n3. Si le problème persiste, contactez le support en indiquant votre numéro de commande (DN-…).\n\nNotre équipe répond sous 24 h ouvrées, 7j/7 sur WhatsApp."]);
            }
        }
        $posts = [
            ['Business plan : les 7 sections qu’attend votre banque', 'chart'], ['Vendre sur Instagram depuis Abidjan : le guide 2026', 'grid'],
            ['Factures OHADA : les mentions obligatoires', 'doc'], ['5 usages de l’IA pour les petites entreprises', 'chat'],
        ];
        foreach ($posts as $i => [$title, $cover]) {
            BlogPost::create(['title' => $title, 'slug' => Str::slug($title), 'cover_type' => $cover, 'author' => 'L’équipe DigiNova',
                'excerpt' => 'Conseils pratiques, exemples locaux et modèles à télécharger pour passer à l’action dès aujourd’hui.',
                'body' => "Introduction.\n\n## Pourquoi c’est important\n\nUn bon outil fait gagner des heures chaque semaine.\n\n## Par où commencer\n\nCommencez simple, mesurez, puis améliorez.\n\n## À retenir\n\nLes modèles DigiNova vous donnent une base solide, adaptée au contexte africain.",
                'published_at' => $this->now->subDays(5 + $i * 12)]);
        }
    }

    private function seedAlerts(): void
    {
        AdminAlert::create(['type' => 'provider', 'title' => 'Orange Money : +4 pts d’échecs', 'detail' => 'Depuis 18 h · surveiller le prestataire', 'level' => 'warning']);
        AdminAlert::create(['type' => 'webhooks', 'title' => '3 webhooks en échec', 'detail' => 'Paiements carte · relance automatique en cours', 'level' => 'danger']);
    }
}
