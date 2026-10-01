<?php

namespace App\Enums;

enum ProductStatus: string
{
    case DRAFT = 'DRAFT';
    case PENDING_REVIEW = 'PENDING_REVIEW';
    case CHANGES_REQUESTED = 'CHANGES_REQUESTED';
    case PUBLISHED = 'PUBLISHED';
    case REJECTED = 'REJECTED';
    case ARCHIVED = 'ARCHIVED';

    public function label(): string
    {
        return match ($this) {
            self::DRAFT => 'Brouillon',
            self::PENDING_REVIEW => 'En modération',
            self::CHANGES_REQUESTED => 'Modifications demandées',
            self::PUBLISHED => 'Publié',
            self::REJECTED => 'Refusé',
            self::ARCHIVED => 'Archivé',
        };
    }
}
