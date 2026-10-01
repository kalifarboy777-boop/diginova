<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DownloadLog extends Model
{
    protected $guarded = ['id'];

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function libraryItem(): BelongsTo
    {
        return $this->belongsTo(LibraryItem::class);
    }

    public function file(): BelongsTo
    {
        return $this->belongsTo(ProductFile::class, 'product_file_id');
    }
}
