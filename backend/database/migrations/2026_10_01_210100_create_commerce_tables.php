<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('description')->nullable();
            $table->string('type', 10);
            $table->unsignedInteger('value');
            $table->unsignedInteger('min_amount')->default(0);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('used_count')->default(0);
            $table->string('scope', 10)->default('ALL');
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('seller_id')->nullable()->constrained('seller_profiles')->nullOnDelete();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('coupon_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
            $table->unique(['coupon_id', 'user_id']);
        });

        Schema::create('carts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->unique()->constrained()->cascadeOnDelete();
            $table->string('token', 64)->nullable()->unique();
            $table->foreignId('coupon_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cart_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('bundle_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('license', 20)->default('PERSONAL');
            $table->timestamps();
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('number', 20)->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('email');
            $table->string('phone', 20)->nullable();
            $table->unsignedInteger('subtotal');
            $table->unsignedInteger('discount')->default(0);
            $table->unsignedInteger('total');
            $table->string('currency', 3)->default('XOF');
            $table->string('status', 30)->default('PENDING')->index();
            $table->foreignId('coupon_id')->nullable()->constrained()->nullOnDelete();
            $table->string('payment_method', 20)->nullable();
            $table->string('payment_phone', 20)->nullable();
            $table->string('access_token', 64)->unique();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('seller_id')->constrained('seller_profiles')->restrictOnDelete();
            $table->foreignId('bundle_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->string('license', 20)->default('PERSONAL');
            $table->unsignedInteger('list_price');
            $table->unsignedInteger('unit_price');
            $table->unsignedTinyInteger('commission_rate');
            $table->unsignedInteger('commission_amount');
            $table->unsignedInteger('seller_amount');
            $table->timestamps();
        });

        Schema::create('order_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('type', 40);
            $table->string('label');
            $table->string('detail')->nullable();
            $table->string('level', 10)->default('info');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 30);
            $table->string('method', 20);
            $table->string('provider_ref')->nullable()->unique();
            $table->unsignedInteger('amount');
            $table->string('status', 20)->default('INITIATED');
            $table->json('raw_payload')->nullable();
            $table->string('webhook_status', 30)->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamps();
        });

        Schema::create('webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 30);
            $table->string('event_id')->unique();
            $table->boolean('signature_valid');
            $table->json('payload');
            $table->timestamp('processed_at')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();
        });

        Schema::create('library_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('order_item_id')->constrained()->cascadeOnDelete();
            $table->string('license', 20)->default('PERSONAL');
            $table->timestamp('granted_at');
            $table->unsignedSmallInteger('download_count')->default(0);
            $table->unsignedSmallInteger('download_limit')->default(10);
            $table->string('seen_version', 20)->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'granted_at']);
        });

        Schema::create('download_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('library_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_file_id')->nullable()->constrained()->nullOnDelete();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('number', 30)->unique();
            $table->string('pdf_key')->nullable();
            $table->timestamps();
        });

        Schema::create('favorites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('price_at_save');
            $table->timestamps();
            $table->unique(['user_id', 'product_id']);
        });

        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_item_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();
            $table->string('status', 20)->default('PUBLISHED');
            $table->text('seller_reply')->nullable();
            $table->timestamp('seller_replied_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'product_id']);
        });

        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('review_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('reporter_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason');
            $table->text('details')->nullable();
            $table->string('status', 20)->default('OPEN');
            $table->timestamps();
        });

        Schema::create('refund_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->text('reason');
            $table->string('status', 20)->default('REQUESTED');
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['refund_requests', 'reports', 'reviews', 'favorites', 'invoices', 'download_logs', 'library_items', 'webhook_events', 'payments', 'order_events', 'order_items', 'orders', 'cart_items', 'carts', 'coupon_user', 'coupons'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
