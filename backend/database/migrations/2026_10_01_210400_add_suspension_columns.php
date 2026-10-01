<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->timestamp('suspended_at')->nullable());
        Schema::table('seller_profiles', fn (Blueprint $t) => $t->timestamp('suspended_at')->nullable());
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('suspended_at'));
        Schema::table('seller_profiles', fn (Blueprint $t) => $t->dropColumn('suspended_at'));
    }
};
