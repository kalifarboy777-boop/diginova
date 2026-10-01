<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('otp_codes', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 20)->index();
            $table->string('purpose', 30)->default('login');
            $table->string('code_hash');
            $table->timestamp('expires_at');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('social_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 30);
            $table->string('provider_id');
            $table->timestamps();
            $table->unique(['provider', 'provider_id']);
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('name');
            $table->string('label')->nullable();
            $table->string('slug')->unique();
            $table->string('description')->nullable();
            $table->string('icon')->nullable();
            $table->string('cover_type', 20)->default('doc');
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('seller_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('display_name');
            $table->string('slug')->unique();
            $table->text('bio')->nullable();
            $table->string('country', 2)->default('CI');
            $table->boolean('verified')->default(false);
            $table->string('plan', 20)->default('STANDARD');
            $table->unsignedTinyInteger('commission_rate')->default(15);
            $table->string('payout_method', 20)->nullable();
            $table->text('payout_account')->nullable();
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('seller_profiles')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->foreignId('subcategory_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('short_description', 300)->nullable();
            $table->text('description')->nullable();
            $table->unsignedInteger('price');
            $table->unsignedInteger('compare_at_price')->nullable();
            $table->unsignedInteger('commercial_price')->nullable();
            $table->string('status', 30)->default('DRAFT')->index();
            $table->string('badge', 30)->nullable();
            $table->string('cover_type', 20)->default('doc');
            $table->string('cover_image_key')->nullable();
            $table->string('video_url')->nullable();
            $table->json('tags')->nullable();
            $table->json('formats')->nullable();
            $table->json('highlights')->nullable();
            $table->json('includes')->nullable();
            $table->string('version', 20)->default('1.0');
            $table->timestamp('version_updated_at')->nullable();
            $table->string('compatibility')->nullable();
            $table->string('language', 30)->default('Français');
            $table->unsignedSmallInteger('preview_pages')->default(0);
            $table->string('video_duration', 10)->nullable();
            $table->json('faq')->nullable();
            $table->unsignedInteger('sales_count')->default(0);
            $table->unsignedInteger('views_count')->default(0);
            $table->decimal('rating_avg', 2, 1)->default(0);
            $table->unsignedInteger('rating_count')->default(0);
            $table->json('rating_distribution')->nullable();
            $table->timestamp('published_at')->nullable()->index();
            $table->timestamp('submitted_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->json('draft_data')->nullable();
            $table->timestamps();
            $table->index(['status', 'category_id']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
            DB::statement("CREATE INDEX products_search_idx ON products USING GIN (to_tsvector('french', coalesce(title,'') || ' ' || coalesce(short_description,'') || ' ' || coalesce(description,'')))");
            DB::statement('CREATE INDEX products_title_trgm_idx ON products USING GIN (title gin_trgm_ops)');
        }

        Schema::create('product_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('storage_key');
            $table->string('file_name');
            $table->unsignedBigInteger('size');
            $table->string('format', 20);
            $table->string('version', 20)->default('1.0');
            $table->string('scan_status', 20)->default('PENDING');
            $table->timestamps();
        });

        Schema::create('product_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('key');
            $table->unsignedTinyInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('bundles', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('tagline')->nullable();
            $table->text('description')->nullable();
            $table->unsignedInteger('price');
            $table->unsignedInteger('value');
            $table->string('cover_type', 20)->default('brand');
            $table->boolean('featured')->default(false);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('bundle_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bundle_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->unique(['bundle_id', 'product_id']);
        });
    }

    public function down(): void
    {
        foreach (['bundle_items', 'bundles', 'product_images', 'product_files', 'products', 'seller_profiles', 'categories', 'social_accounts', 'otp_codes'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
