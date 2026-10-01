<?php

namespace App\Ai;

use App\Models\Bundle;
use App\Models\Product;
use Illuminate\Support\Str;

/**
 * « Suggestion DigiNova IA » (bêta) — V1 à base de règles mots-clés → produits / packs.
 * Interface stable : remplaçable plus tard par un vrai modèle sans changer l'API.
 */
final class Recommender
{
    /** @var array<int, array{keywords: array<int, string>, context: string, products: array<int, string>, bundle: ?string}> */
    private const RULES = [
        ['keywords' => ['boutique', 'vêtement', 'vetement', 'commerce', 'magasin', 'détail'], 'context' => 'Vous lancez une boutique de vêtements ?',
            'products' => ['business-plan-pro', 'dashboard-excel-gestion-stock'], 'bundle' => 'pack-entrepreneur'],
        ['keywords' => ['restaurant', 'maquis', 'menu', 'cuisine'], 'context' => 'Vous ouvrez un restaurant ?',
            'products' => ['business-plan-pro', 'templates-menus-restaurant'], 'bundle' => 'pack-entrepreneur'],
        ['keywords' => ['instagram', 'réseaux', 'reseaux', 'tiktok', 'facebook', 'contenu'], 'context' => 'Vous animez des réseaux sociaux ?',
            'products' => ['pack-30-templates-instagram', 'calendrier-editorial-2027'], 'bundle' => 'pack-createur-contenu'],
        ['keywords' => ['facture', 'ohada', 'devis', 'comptabilité', 'comptabilite'], 'context' => 'Vous facturez vos clients ?',
            'products' => ['modeles-factures-ohada', 'dashboard-excel-gestion-stock'], 'bundle' => 'pack-entrepreneur'],
        ['keywords' => ['cv', 'emploi', 'lettre', 'entretien', 'stage'], 'context' => 'Vous cherchez un emploi ?',
            'products' => ['kit-cv-lettre-motivation', 'questions-entretien-embauche'], 'bundle' => null],
        ['keywords' => ['ia', 'chatgpt', 'prompt', 'prompts'], 'context' => 'Vous voulez gagner du temps avec l’IA ?',
            'products' => ['pack-500-prompts-ia', 'guide-chatgpt-pme'], 'bundle' => 'pack-createur-contenu'],
        ['keywords' => ['business', 'plan', 'banque', 'financement', 'projet'], 'context' => 'Vous préparez un dossier de financement ?',
            'products' => ['business-plan-pro', 'modeles-factures-ohada'], 'bundle' => 'pack-entrepreneur'],
    ];

    /** @return array{message: string, products: array<int, array{slug:string,title:string}>, bundle: ?array{slug:string,title:string}}|null */
    public function suggest(string $query): ?array
    {
        $q = Str::lower($query);
        foreach (self::RULES as $rule) {
            if (! collect($rule['keywords'])->contains(fn ($k) => str_contains($q, $k))) {
                continue;
            }
            $products = Product::published()->whereIn('slug', $rule['products'])->get(['slug', 'title'])
                ->sortBy(fn ($p) => array_search($p->slug, $rule['products'], true))->values();
            if ($products->isEmpty()) {
                continue;
            }
            $bundle = $rule['bundle'] ? Bundle::where('slug', $rule['bundle'])->where('active', true)->first(['slug', 'title']) : null;
            $first = $products->first();
            $message = $rule['context'].' Commencez par le '.Str::before($first->title, ' —')
                .($products->count() > 1 ? ', puis complétez avec '.Str::before($products[1]->title, ' —') : '').'.'
                .($bundle ? ' Le '.$bundle->title.' regroupe l’essentiel à prix réduit.' : '');

            return [
                'message' => $message,
                'products' => $products->map(fn ($p) => ['slug' => $p->slug, 'title' => $p->title])->all(),
                'bundle' => $bundle ? ['slug' => $bundle->slug, 'title' => $bundle->title] : null,
            ];
        }

        return null;
    }
}
