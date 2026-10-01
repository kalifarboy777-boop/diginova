# Écran 20 — Panier (nœud 10:2) — « Contenu panier »
Source : export CSS Figma fourni par l'utilisateur (le 2026-10-01). Seul le bloc « Contenu panier » a été fourni (pas le header, ni le titre, ni le footer).

## Mise en page
- Conteneur : row, `padding: 24px 80px 56px`, gap 32, largeur 1440, `align-items: flex-start`.
- Colonne gauche « Stack » : column, gap 16, flex-grow 1 (828 px).
- Colonne droite « Stack » : column, gap 16, largeur fixe 420 px.

## Ligne d'article (×N)
- Carte : row, padding 20, gap 20, fond surface, bordure 1 px border/default, rayon 20, hauteur 190.
- Visuel : 160×120, rayon 14, fond selon coverType (`chart` → brand/subtle #EEEDFF ; `sheet` → success/subtle #DCFCE7). Contenu : ProductCover (document blanc 85.7×100.6 avec ombre 0 4.57 11.43 rgba(18,23,51,.14) décalé + feuille arrière blanche 55 %).
  - chart : barre titre primaire, ligne grise, 5 barres primaires d'opacité .35→.87.
  - sheet : barre titre success, ligne grise, grille 3×6 de cellules (1re ligne success 80 %, autres success/subtle).
- Infos (flex-grow 1, column, gap 8) :
  1. Overline catégorie (`BUSINESS`) text/tertiary.
  2. Titre H4 text/primary.
  3. Row gap 12 : « par {vendeur} » Body/Small text/secondary + Note (étoile 14 px amber, note Label/Small text/primary « 4,9 », « (127) » Caption text/tertiary, gap 4).
  4. Sélecteur licence : padding 8×12, gap 8, bordure 1 px border/strong, rayon 8, « Licence personnelle » Label/Small + chevron 14 px.
  5. Row padding-top 4, gap 20 : [heart 14] « Sauvegarder pour plus tard » et [trash 14] « Retirer » — Label/Small text/secondary, gap 6.
- Prix (column, align end, gap 4) : prix Price/Default text/primary ; ancien prix Body/Small barré text/tertiary.

## Upsell pack
- Row, padding 24, gap 20, fond brand/deep #1E1B4B, rayon 20, items centrés.
- Pastille 52×52 brand/primary rayon 14, icône gift 24 blanche.
- Texte : « Passez au Pack Entrepreneur » H4 blanc ; « Vos 2 articles + factures OHADA + 30 tem… » Body/Small #C7D2FE (indigo-200), 2 lignes.
- Bouton Blanc : padding 12×18, rayon 10, « Voir le pack » Label text/primary.

## Info livraison
- Row, padding 16×20, gap 12, surface, bordure border/default, rayon 14. Icône info 18 brand/primary. Texte Body/Small text/secondary « Produits numériques : aucune livraison p… ».

## Récapitulatif (colonne droite)
- Carte : padding 28, gap 16, surface, bordure, rayon 20.
- « Récapitulatif » H4.
- Coupon appliqué : padding 10×12, gap 8, fond success/subtle, rayon 10, icône tag 16 + « LANCEMENT appliqué » Label success (flex 1) + icône x 16 (retirer).
- Lignes (hauteur 24) : libellé Body text/secondary flex 1 · valeur Label text/primary.
  - « Sous-total (2 articles) » 20 000 FCFA
  - « Réduction LANCEMENT » − 2 000 FCFA (success)
  - « Frais de paiement » Offerts (success)
- Séparateur 1 px border/default.
- Total : « Total » Label + montant Price/Large (30/36, −1 %).
- Bouton Primaire grand : padding 16×26, rayon 10, hauteur 52, « Passer au paiement » + flèche 18.
- Bouton Fantôme : padding 12×20, rayon 10, hauteur 44, « Continuer mes achats » brand/primary.
- Réassurance : fond bg/page, rayon 12, padding 16, gap 10 ; lignes icône 16 success + Body/Small text/secondary :
  - zap — « Téléchargement immédiat après paiement »
  - shield — « Remboursement sous 7 jours si fichier dé[fectueux…] »
  - lock — « Paiement chiffré, aucune donnée bancaire […] »
- Sous la carte : PaymentChips (wrap, gap 6) : pastille 10 px + nom Caption text/secondary, padding 6×10, surface, bordure, rayon 8 — Orange Money, MTN MoMo, Wave, Moov Money, Carte bancaire (brand/primary).

## Textes tronqués à confirmer via MCP
Description de l'upsell, texte d'info livraison, fins des lignes de réassurance.
