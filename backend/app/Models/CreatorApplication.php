<?php

namespace App\Models;

use App\Enums\ApplicationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CreatorApplication extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['payout_account', 'id_document_key'];

    protected function casts(): array
    {
        return ['status' => ApplicationStatus::class, 'categories' => 'array', 'sample_files' => 'array', 'payout_account' => 'encrypted', 'payout_verified' => 'boolean', 'submitted_at' => 'datetime', 'reviewed_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}
