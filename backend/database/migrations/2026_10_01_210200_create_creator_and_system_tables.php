<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('creator_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('step')->default(1);
            $table->string('studio_name')->nullable();
            $table->string('country', 2)->default('CI');
            $table->string('city')->nullable();
            $table->string('phone', 20)->nullable();
            $table->text('bio')->nullable();
            $table->json('categories')->nullable();
            $table->string('portfolio_url')->nullable();
            $table->json('sample_files')->nullable();
            $table->string('id_document_key')->nullable();
            $table->string('id_status', 20)->default('MISSING');
            $table->string('payout_method', 20)->nullable();
            $table->text('payout_account')->nullable();
            $table->boolean('payout_verified')->default(false);
            $table->string('status', 20)->default('SUBMITTED')->index();
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('reviewer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('review_note')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('payout_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('seller_profiles')->cascadeOnDelete();
            $table->string('method', 20);
            $table->string('label');
            $table->text('account');
            $table->string('masked', 40);
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        Schema::create('payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('seller_profiles')->cascadeOnDelete();
            $table->foreignId('payout_account_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reference', 20)->unique();
            $table->unsignedInteger('amount');
            $table->string('method', 20);
            $table->string('account_label');
            $table->string('status', 20)->default('REQUESTED')->index();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('ledger_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('seller_profiles')->cascadeOnDelete();
            $table->foreignId('order_item_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('payout_id')->nullable()->constrained()->nullOnDelete();
            $table->integer('amount');
            $table->string('type', 20);
            $table->string('description')->nullable();
            $table->timestamp('available_at');
            $table->timestamps();
            $table->index(['seller_id', 'available_at']);
        });

        Schema::create('support_tickets', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('number')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('subject');
            $table->string('status', 20)->default('OPEN')->index();
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();
        });

        Schema::create('ticket_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('support_ticket_id')->constrained()->cascadeOnDelete();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('from_staff')->default(false);
            $table->text('body');
            $table->json('attachments')->nullable();
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->boolean('order_confirmation')->default(true);
            $table->boolean('product_updates')->default(true);
            $table->boolean('price_drops')->default(true);
            $table->boolean('newsletter')->default(false);
            $table->boolean('magic_link_login')->default(true);
            $table->timestamps();
        });

        Schema::create('newsletter_subscribers', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('admin_alerts', function (Blueprint $table) {
            $table->id();
            $table->string('type', 40);
            $table->string('title');
            $table->string('detail')->nullable();
            $table->string('level', 10)->default('warning');
            $table->nullableMorphs('subject');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 60);
            $table->string('entity', 60);
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->json('metadata')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['entity', 'entity_id']);
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->json('value');
            $table->timestamps();
        });

        Schema::create('blog_posts', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('excerpt', 300);
            $table->longText('body');
            $table->string('cover_type', 20)->default('doc');
            $table->string('author');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });

        Schema::create('help_articles', function (Blueprint $table) {
            $table->id();
            $table->string('category');
            $table->string('title');
            $table->string('slug')->unique();
            $table->longText('body');
            $table->boolean('is_faq')->default(false);
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('contact_messages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->string('subject');
            $table->string('order_number')->nullable();
            $table->text('message');
            $table->string('attachment_key')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['contact_messages', 'help_articles', 'blog_posts', 'settings', 'audit_logs', 'admin_alerts', 'newsletter_subscribers', 'notification_preferences', 'notifications', 'ticket_messages', 'support_tickets', 'ledger_entries', 'payouts', 'payout_accounts', 'creator_applications'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
