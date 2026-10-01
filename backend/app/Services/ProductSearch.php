<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Recherche plein texte + filtres de la page Boutique (titre, description, tags, catégorie). */
final class ProductSearch
{
    public const SORTS = ['popularite', 'nouveautes', 'prix-asc', 'prix-desc', 'note', 'pertinence'];

    /** @param  array<string, mixed>  $f */
    public function query(array $f): Builder
    {
        $q = Product::published()->with(['category', 'seller']);

        if (! empty($f['category'])) {
            $cat = Category::where('slug', $f['category'])->first();
            $cat ? $q->where(fn ($w) => $w->where('category_id', $cat->id)->orWhere('subcategory_id', $cat->id)) : $q->whereRaw('1 = 0');
        }
        if (! empty($f['sub'])) {
            $subs = Category::whereIn('slug', (array) $f['sub'])->pluck('id');
            $q->whereIn('subcategory_id', $subs);
        }
        if (isset($f['min']) && $f['min'] !== '') {
            $q->where('price', '>=', (int) $f['min']);
        }
        if (isset($f['max']) && $f['max'] !== '') {
            $q->where('price', '<=', (int) $f['max']);
        }
        if (! empty($f['rating'])) {
            $q->where('rating_avg', '>=', (float) $f['rating']);
        }
        if (! empty($f['format'])) {
            $q->where(function ($w) use ($f) {
                foreach ((array) $f['format'] as $fmt) {
                    $w->orWhere('formats', 'like', '%"'.Str::upper($fmt).'"%');
                }
            });
        }
        if (($f['license'] ?? null) === 'commercial') {
            $q->whereNotNull('commercial_price');
        }
        if (! empty($f['q'])) {
            $this->applyText($q, (string) $f['q']);
        }

        return match ($f['sort'] ?? (empty($f['q']) ? 'popularite' : 'pertinence')) {
            'nouveautes' => $q->orderByDesc('published_at'),
            'prix-asc' => $q->orderBy('price'),
            'prix-desc' => $q->orderByDesc('price'),
            'note' => $q->orderByDesc('rating_avg')->orderByDesc('rating_count'),
            'pertinence' => empty($f['q']) ? $q->orderByDesc('sales_count') : $q,
            default => $q->orderByDesc('sales_count'),
        };
    }

    private function applyText(Builder $q, string $text): void
    {
        $terms = collect(preg_split('/\s+/', Str::lower(trim($text))))->filter(fn ($t) => mb_strlen($t) >= 2)->take(6);

        if (DB::getDriverName() === 'pgsql') {
            $q->where(function ($w) use ($text) {
                $w->whereRaw("to_tsvector('french', coalesce(title,'') || ' ' || coalesce(short_description,'') || ' ' || coalesce(description,'') || ' ' || coalesce(tags::text,'')) @@ plainto_tsquery('french', ?)", [$text])
                    ->orWhereRaw('similarity(title, ?) > 0.2', [$text]);
            })->orderByRaw("ts_rank(to_tsvector('french', coalesce(title,'') || ' ' || coalesce(tags::text,'')), plainto_tsquery('french', ?)) DESC, similarity(title, ?) DESC", [$text, $text]);

            return;
        }

        // Repli SQLite : au moins un terme dans le titre, la description, les tags ou la catégorie ; classement par nombre de termes trouvés.
        $catIds = Category::where(function ($w) use ($terms) {
            foreach ($terms as $t) {
                $w->orWhereRaw('lower(name) like ?', ["%$t%"]);
            }
        })->pluck('id')->all();

        $q->where(function ($w) use ($terms, $catIds) {
            foreach ($terms as $t) {
                $w->orWhereRaw('lower(title) like ?', ["%$t%"])
                    ->orWhereRaw('lower(tags) like ?', ["%$t%"])
                    ->orWhereRaw('lower(short_description) like ?', ["%$t%"]);
            }
            if ($catIds) {
                $w->orWhereIn('subcategory_id', $catIds)->orWhereIn('category_id', $catIds);
            }
        });
        $score = $terms->map(fn () => '(CASE WHEN lower(title) LIKE ? THEN 3 ELSE 0 END + CASE WHEN lower(tags) LIKE ? THEN 2 ELSE 0 END)')->implode(' + ');
        $bindings = $terms->flatMap(fn ($t) => ["%$t%", "%$t%"])->all();
        if ($score) {
            $q->orderByRaw("($score) DESC", $bindings);
        }
        $q->orderByDesc('sales_count');
    }

    /** Compteurs par sous-catégorie et par format pour les filtres. @return array<string, mixed> */
    public function facets(array $f): array
    {
        $base = fn () => $this->query(array_diff_key($f, array_flip(['sub', 'format', 'sort', 'page'])))->reorder();

        $subs = (clone $base())->whereNotNull('subcategory_id')->selectRaw('subcategory_id, count(*) as c')->groupBy('subcategory_id')->pluck('c', 'subcategory_id');
        $formats = [];
        foreach (['XLSX', 'DOCX', 'PDF', 'CANVA'] as $fmt) {
            $formats[$fmt] = (clone $base())->where('formats', 'like', '%"'.($fmt === 'CANVA' ? 'Canva' : $fmt).'"%')->count();
        }
        $categories = (clone $base())->selectRaw('category_id, count(*) as c')->groupBy('category_id')->pluck('c', 'category_id');

        return ['subcategories' => $subs, 'formats' => $formats, 'categories' => $categories, 'total' => (clone $base())->count()];
    }
}
