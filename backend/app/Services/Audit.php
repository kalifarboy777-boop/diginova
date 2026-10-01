<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

/** Journal d'audit : toute action manuelle de l'administration est tracée avec son auteur. */
final class Audit
{
    /** @param  array<string, mixed>  $metadata */
    public static function log(string $action, Model $entity, array $metadata = []): void
    {
        AuditLog::create([
            'actor_id' => auth()->id(),
            'action' => $action,
            'entity' => class_basename($entity),
            'entity_id' => $entity->getKey(),
            'metadata' => $metadata,
            'ip' => request()->ip(),
        ]);
    }
}
