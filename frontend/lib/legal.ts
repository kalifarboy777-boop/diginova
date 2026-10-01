/**
 * Textes juridiques MODÈLES — à faire relire et valider par un juriste avant la mise en production
 * (droit ivoirien, Acte uniforme OHADA, loi n° 2013-450 relative à la protection des données personnelles).
 */
export type LegalDoc = { title: string; updated: string; sections: { h: string; p: string[] }[] };

export const LEGAL: Record<string, LegalDoc> = {
  cgu: {
    title: "Conditions générales d’utilisation",
    updated: "1 oct. 2026",
    sections: [
      { h: "1. Objet", p: ["Les présentes conditions encadrent l’accès et l’utilisation de la plateforme DigiNova, marketplace de produits numériques accessible à l’adresse diginova.ci."] },
      { h: "2. Compte", p: ["La création d’un compte est gratuite. Un compte est créé automatiquement lors d’un premier achat ; l’utilisateur peut ensuite définir un mot de passe.", "L’utilisateur est responsable de la confidentialité de ses identifiants et des codes reçus par SMS."] },
      { h: "3. Utilisation des produits", p: ["Les produits achetés sont utilisés conformément à la licence choisie (personnelle ou commerciale). La revente ou la redistribution des fichiers est interdite."] },
      { h: "4. Créateurs", p: ["Les créateurs garantissent détenir l’ensemble des droits sur les contenus publiés. Chaque produit est modéré avant publication."] },
      { h: "5. Responsabilité", p: ["DigiNova met tout en œuvre pour assurer la disponibilité du service mais ne peut garantir une disponibilité ininterrompue."] },
      { h: "6. Droit applicable", p: ["Les présentes conditions sont soumises au droit ivoirien. Tout litige relève des tribunaux d’Abidjan, après tentative de règlement amiable."] },
    ],
  },
  cgv: {
    title: "Conditions générales de vente",
    updated: "1 oct. 2026",
    sections: [
      { h: "1. Prix", p: ["Les prix sont indiqués en francs CFA (XOF), toutes taxes comprises. Les frais de paiement Mobile Money sont pris en charge par DigiNova."] },
      { h: "2. Paiement", p: ["Le paiement s’effectue par Wave, Orange Money, MTN MoMo, Moov Money ou carte bancaire via un prestataire agréé. La commande est validée uniquement après confirmation du paiement par le prestataire."] },
      { h: "3. Livraison", p: ["Les produits sont livrés immédiatement après confirmation du paiement : téléchargement, email de confirmation et ajout à la bibliothèque du client, accessible à vie."] },
      { h: "4. Garantie et remboursement", p: ["En cas de fichier défectueux ou non conforme à sa description, le client peut demander un remboursement dans un délai de 7 jours suivant l’achat, depuis son espace client ou le support."] },
      { h: "5. Téléchargements", p: ["Chaque achat permet 10 téléchargements via des liens sécurisés valables 15 minutes. Le compteur peut être réinitialisé par le support."] },
    ],
  },
  licences: {
    title: "Licences",
    updated: "1 oct. 2026",
    sections: [
      { h: "Licence personnelle", p: ["Utilisation pour votre propre activité ou entreprise. Modification autorisée. Revente, partage ou utilisation pour le compte de clients interdits."] },
      { h: "Licence commerciale", p: ["Inclut la licence personnelle et autorise l’utilisation pour des clients (consultants, agences, freelances), dans le cadre de prestations. La revente du fichier en l’état reste interdite."] },
      { h: "Filigrane", p: ["Les fichiers PDF sont personnalisés avec l’adresse email de l’acheteur afin de lutter contre la diffusion non autorisée."] },
    ],
  },
  confidentialite: {
    title: "Politique de confidentialité",
    updated: "1 oct. 2026",
    sections: [
      { h: "Données collectées", p: ["Nom, email, téléphone, historique d’achats et de téléchargements, adresses IP des téléchargements (prévention de la fraude)."] },
      { h: "Finalités", p: ["Exécution des commandes, livraison sécurisée, support client, prévention de la fraude et, avec votre accord, envoi de la newsletter."] },
      { h: "Paiement", p: ["DigiNova ne stocke aucune donnée bancaire ni code Mobile Money : le paiement est traité par le prestataire de paiement."] },
      { h: "Vos droits", p: ["Vous pouvez accéder à vos données, les rectifier ou supprimer votre compte depuis Profil & sécurité, ou en écrivant à support@diginova.ci."] },
    ],
  },
  "mentions-legales": {
    title: "Mentions légales",
    updated: "1 oct. 2026",
    sections: [
      { h: "Éditeur", p: ["DigiNova SAS (dénomination provisoire) — Abidjan, Côte d’Ivoire. RCCM et capital : à compléter."] },
      { h: "Hébergement", p: ["Hébergeur : à compléter lors du déploiement."] },
      { h: "Contact", p: ["support@diginova.ci · WhatsApp +225 07 00 00 00 00."] },
    ],
  },
};
