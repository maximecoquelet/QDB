/* ============================================================================
   CHARTE DOCUMENTAIRE — source unique (apercu ecran + PDF client + e-signature)
   Modifier UNIQUEMENT cette constante pour faire evoluer le rendu des documents.
   ============================================================================ */
const DOC_FONTS_HREF = "https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&display=swap";
const DOC_CHARTE_CSS = `
/* ============================================================================
   CHARTE DOCUMENTAIRE SERRE — v2 (2026)
   Feuille de style UNIQUE des documents client (devis + lettre de mission).
   Utilisée à l'identique pour l'aperçu écran et pour le rendu PDF : aucune
   extraction de document.styleSheets, aucune duplication de règles.

   Principes
   - Unités en pt : le document est un imprimé A4, pas une page web.
   - Deux familles seulement : serif pour la prose, sans pour les données.
   - Une seule couleur d'accent (vert registre) + filets gris. Aucun aplat noir
     plein page : moins d'encre, rendu plus haut de gamme, meilleure photocopie.
   - Convention comptable : montants en chiffres tabulaires, alignés à droite,
     total souligné d'un double filet.
   ============================================================================ */

.doc{
  /* — Palette SERRE — */
  --ink:#141414;          /* noir principal : titres, textes, pictogrammes */
  --ink-70:#3d3d3d;       /* texte courant */
  --graphite:#646464;     /* texte secondaire, libellés, mentions */
  --accent:#d94613;       /* orange SERRE : couleur d'accent principale */
  --accent-dk:#b0350c;    /* orange assombri (petits corps, contraste) */
  --accent-tint:#fdefe8;  /* orange très dilué */
  --paper:#ffffff;        /* fond principal */
  --paper-2:#f7f5f2;      /* fond chaud documentaire : cartouches, en-têtes */
  --rule:#c2c2c2;         /* séparateurs */
  --rule-soft:#dedcd8;    /* filet de tableau */
  --rule-hair:#eeecea;    /* filet le plus discret */
  /* Accents secondaires de la charte, à utiliser avec parcimonie. */
  --jaune:#f5c326;        /* juridique / outils */
  --bleu:#5383ff;         /* consolidation / reporting */
  --vert:#8dbb70;         /* conseil / pilotage */

  /* — Typographie — */
  --serif:"Source Serif 4","Spectral","Liberation Serif",Georgia,"Times New Roman",serif;
  --sans:"Inter","Liberation Sans",Arial,Helvetica,sans-serif;

  color:var(--ink);
  font-family:var(--serif);
  font-size:9.6pt;
  line-height:1.5;
  text-rendering:optimizeLegibility;
  -webkit-font-smoothing:antialiased;
}

/* Aperçu écran : feuille de papier posée sur le fond de l'application.
   En impression, ces règles sont annulées plus bas. */
@media screen{
  .doc{
    max-width:210mm;
    margin:0 auto;
    padding:20mm 18mm;
    background:var(--paper);
    border:1px solid #e0e3df;
    box-shadow:0 18px 44px rgba(16,22,28,.10);
  }
}

.doc *{box-sizing:border-box}
.doc p{margin:0 0 6pt;text-align:justify;hyphens:auto;-webkit-hyphens:auto}
.doc ul{margin:4pt 0 7pt;padding-left:13pt;list-style:none}
.doc li{margin:0 0 2.5pt;position:relative;text-align:justify;hyphens:auto}
.doc li::before{content:"";position:absolute;left:-9pt;top:.58em;width:4pt;height:.7pt;background:var(--accent)}
.doc b,.doc strong{font-weight:600}
.doc .dim{color:var(--graphite)}
.doc .lm-empty,.doc .source-note{display:none!important}
/* Ancre de signature electronique Yousign : doit rester dans le flux du texte,
   a sa taille reelle, pour que le positionnement du champ soit correct. */
.doc .ys-anchor{display:block;font-family:Arial,Helvetica,sans-serif;font-size:10px;
  line-height:1;color:#fff!important;white-space:nowrap;margin-top:6pt;overflow:visible}

/* Sur-titres et libellés : capitales espacées, petit corps. Niveau 3 de la
   hiérarchie — jamais utilisé pour un titre de section. */
.doc .doc-kicker,.doc .lm-annex-head .kicker,.doc .approval-title{
  font-family:var(--sans);
  text-transform:uppercase;
  letter-spacing:.13em;
  font-weight:600;
}

/* ---------------------------------------------------------------- en-tête -- */
/* L'en-tête ne porte QUE l'identité et les coordonnées utiles.
   Les mentions légales (forme, capital, SIREN, RCS, TVA, EUID) sont
   exclusivement en pied de document. */
.doc .doc-header{
  display:grid;grid-template-columns:1fr auto;gap:14mm;align-items:flex-end;
  border-top:2.4pt solid var(--accent);
  border-bottom:.6pt solid var(--rule);
  padding:7pt 0 6pt;margin:0 0 11pt;
}
.doc .doc-brand{padding:0}
.doc .doc-brand-name{
  font-family:var(--sans);font-size:15pt;font-weight:700;
  letter-spacing:.20em;line-height:1;color:var(--ink);
}
.doc .doc-brand-tag{
  font-family:var(--sans);font-size:6.2pt;font-weight:600;
  text-transform:uppercase;letter-spacing:.19em;color:var(--accent);
  margin-top:3.5pt;
}
.doc .doc-head-contact{
  font-family:var(--sans);font-size:6.9pt;line-height:1.75;
  color:var(--graphite);text-align:right;font-variant-numeric:tabular-nums;
  max-width:72mm;
}
.doc .doc-head-contact b{color:var(--ink-70);font-weight:600}

/* ------------------------------------------------- titre du document (hero) */
.doc .doc-hero{
  margin:0 0 12pt;padding:0;background:none;border:0;
  break-inside:avoid;page-break-inside:avoid;
}
.doc .doc-kicker{font-size:6.4pt;color:var(--accent);margin:0 0 5pt;letter-spacing:.16em}
.doc .doc-title-row{
  display:grid;grid-template-columns:1fr auto;gap:10mm;align-items:baseline;
  border-bottom:.6pt solid var(--rule-soft);padding-bottom:6pt;
}
.doc .doc-title-row h1,.doc .doc-hero h1{
  font-family:var(--serif);font-size:23pt;line-height:1.05;font-weight:600;
  letter-spacing:-.015em;color:var(--ink);margin:0;text-transform:none;
}
.doc .doc-ref-box{text-align:right;font-family:var(--sans);min-width:34mm}
.doc .doc-ref-box span{
  display:block;font-size:5.9pt;text-transform:uppercase;
  letter-spacing:.15em;color:var(--graphite);font-weight:600;
}
.doc .doc-ref-box strong{
  display:block;margin-top:2pt;font-size:11pt;font-weight:600;
  letter-spacing:.05em;color:var(--accent);font-variant-numeric:tabular-nums;
}

/* Bandeau de métadonnées : filets verticaux, pas de boîtes. */
.doc .doc-meta-grid{
  display:flex;gap:0;margin:8pt 0 0;
  border-bottom:.6pt solid var(--rule-soft);
}
.doc .doc-meta-item{
  flex:1 1 0;min-width:0;padding:0 5mm 7pt 0;border:0;background:none;
  font-family:var(--sans);
}
.doc .doc-meta-item+.doc-meta-item{border-left:.6pt solid var(--rule-soft);padding-left:5mm}
.doc .doc-meta-item span{
  display:block;font-size:5.9pt;text-transform:uppercase;letter-spacing:.14em;
  color:var(--graphite);font-weight:600;margin-bottom:2.5pt;
}
.doc .doc-meta-item b{
  display:block;font-size:8.2pt;line-height:1.3;color:var(--ink);font-weight:600;
}

/* ------------------------------------------------- zone d'adressage (envoi) --
   Disposition de lettre : lieu et date à gauche, bloc destinataire à droite,
   dans la zone d'adresse d'une enveloppe à fenêtre (norme NF Z 11-001).
   Bloc sans cadre ni filet vertical : il doit se lire comme une adresse. */
.doc .doc-address{
  display:grid;grid-template-columns:1fr 80mm;gap:8mm;align-items:start;
  margin:13pt 0 16pt;break-inside:avoid;page-break-inside:avoid;
}
.doc .doc-place-date{
  font-family:var(--sans);font-size:8.2pt;line-height:1.5;color:var(--ink-70);
  padding-top:12pt;
}
.doc .doc-recipient{
  font-family:var(--sans);font-size:8.6pt;line-height:1.6;color:var(--ink-70);
  border-top:.6pt solid var(--rule);padding-top:7pt;
}
.doc .doc-recipient .label{
  display:block;font-size:5.9pt;text-transform:uppercase;letter-spacing:.15em;
  color:var(--accent);font-weight:600;margin-bottom:5pt;
}
.doc .doc-recipient strong{
  display:block;font-family:var(--serif);font-size:12pt;font-weight:600;
  color:var(--ink);letter-spacing:0;margin-bottom:2pt;
}
/* Compatibilité : ancien bloc destinataire encadré (documents déjà générés). */
.doc .recipient-card{
  display:grid;grid-template-columns:26mm 1fr;gap:6mm;margin:11pt 0 14pt;
  padding:8pt 0;font-family:var(--sans);break-inside:avoid;
}
.doc .recipient-card .label{
  font-size:5.9pt;text-transform:uppercase;letter-spacing:.15em;
  color:var(--graphite);font-weight:600;
}
.doc .recipient-card .recipient-main{font-size:8.6pt;line-height:1.6;color:var(--ink-70)}
.doc .recipient-card .recipient-main strong{
  display:block;font-family:var(--serif);font-size:12pt;font-weight:600;
  color:var(--ink);margin-bottom:2pt;
}

/* ---------------------------------------------------------------- sections  */
/* Niveau 2 de la hiérarchie : titre de section. Corps large, casse normale,
   noir — il doit se distinguer immédiatement des libellés en capitales.
   Repère structurel : un filet orange court, posé au-dessus du titre. */
.doc .offer-section,.doc .lm-article{margin:0 0 4pt}
.doc .offer-section h2,.doc .lm-article>.art-title,.doc .doc-section-title{
  position:relative;
  font-family:var(--sans);font-size:11.5pt;font-weight:700;line-height:1.25;
  letter-spacing:-.005em;text-transform:none;color:var(--ink);
  margin:22pt 0 8pt;padding:8pt 0 0;border:0;
  break-after:avoid;page-break-after:avoid;
}
.doc .offer-section h2::before,.doc .lm-article>.art-title::before,
.doc .doc-section-title::before{
  content:"";position:absolute;left:0;top:0;width:13mm;height:1.8pt;
  background:var(--accent);
}
.doc .offer-section:first-of-type h2{margin-top:14pt}
.doc .offer-section p,.doc .lm-article p{margin:0 0 6pt}

/* Visuels du cabinet : restitués dans leurs couleurs de charte, simplement
   cadrés et bornés en hauteur. */
.doc .offer-section img{
  display:block;width:auto!important;max-width:100%!important;height:auto!important;
  max-height:36mm!important;object-fit:contain;margin:7pt auto;
  filter:none;opacity:1;
}
.doc .expertise-visual,.doc .values-visual{
  margin:6pt 0 10pt!important;padding:6pt 0!important;background:none!important;
  border-top:.6pt solid var(--rule-hair);border-bottom:.6pt solid var(--rule-hair);
  break-inside:avoid;page-break-inside:avoid;
}

/* Fiche d'identification de l'entité (deux colonnes). */
.doc .fiche{
  columns:2;column-gap:8mm;column-rule:.6pt solid var(--rule-soft);
  background:var(--paper-2);border:0;border-left:2pt solid var(--rule);
  padding:7pt 9pt;font-family:var(--sans);font-size:7.8pt;line-height:1.5;
  break-inside:avoid;page-break-inside:avoid;
}
.doc .fiche div{break-inside:avoid}
.doc .fiche b{color:var(--ink);font-weight:600}

/* Listes de prestations reprises dans la lettre de mission. */
.doc .lm-dyn{margin:5pt 0 7pt}
.doc .lm-dyn ul{margin:0;padding-left:13pt}
.doc .lm-dyn li{font-size:9.2pt}
.doc .lm-dyn li b{color:var(--ink)}
.doc .lm-article.entite .lm-dyn{
  padding:7pt 9pt;background:var(--paper-2);border-left:2pt solid var(--rule);
}
.doc .lm-article.entite .lm-dyn ul{padding-left:12pt}

/* ----------------------------------------------------------- tableaux prix  */
.doc table{border-collapse:collapse;width:100%}
.doc table.pricing-table,.doc table.lm-hono{
  margin:7pt 0 11pt;border:0;border-top:1.1pt solid var(--ink);
  font-family:var(--sans);font-size:8.1pt;
  font-variant-numeric:tabular-nums;
}
.doc table.pricing-table th,.doc table.lm-hono th{
  background:var(--paper-2);color:var(--ink);border:0;
  border-bottom:.6pt solid var(--rule);
  padding:5.5pt 6pt;font-size:5.9pt;font-weight:600;
  text-transform:uppercase;letter-spacing:.13em;text-align:left;
}
/* v47 : l'alignement à droite vise la colonne de montants. Dans un tableau
   à une seule colonne, la première cellule est aussi la dernière : sans cette
   réserve, le libellé se retrouvait collé au bord droit. */
.doc table.pricing-table th:last-child:not(:first-child),.doc table.lm-hono th:last-child:not(:first-child){text-align:right}
.doc table.pricing-table td,.doc table.lm-hono td{
  padding:4.5pt 6pt;border:0;border-bottom:.6pt solid var(--rule-soft);
  vertical-align:top;color:var(--ink-70);
}
.doc table.pricing-table td b{color:var(--ink);font-weight:600}
.doc table.pricing-table td:last-child:not(:first-child),.doc table.lm-hono td:last-child:not(:first-child),
.doc table.pricing-table .num{
  text-align:right;white-space:nowrap;width:24mm;color:var(--ink);font-weight:500;
}
.doc .table-note{
  font-family:var(--sans);font-size:6.8pt;line-height:1.45;color:var(--graphite);
  margin:-5pt 0 10pt;
}
.doc .line-note{font-size:6.9pt;color:var(--graphite);margin-top:1.5pt;font-weight:400}
/* Colonne des montants : l'annuel porte, le mensuel est le rappel. */
.doc .amount-year{display:block;font-weight:600;color:var(--ink)}
.doc .amount-month{display:block;font-size:6.9pt;font-weight:400;color:var(--graphite);margin-top:1pt}

/* Totaux : filet fort au-dessus du total HT, double filet sous le TTC. */
.doc .lm-hono tr.total-ht td{
  font-weight:600;color:var(--ink);background:none!important;
  border-top:1.1pt solid var(--ink);border-bottom:.6pt solid var(--rule-soft);
}
.doc .lm-hono tr.total-ttc td{
  font-weight:700;color:var(--accent-dk);background:none!important;
  font-size:9.4pt;border-bottom:3pt double var(--ink);padding-top:5.5pt;
}

/* ------------------------------------------------- proposition financière   */
.doc .price-summary{
  display:grid;grid-template-columns:1fr 1fr;gap:9mm;align-items:start;
  margin:9pt 0 13pt;break-inside:avoid;page-break-inside:avoid;
}
.doc .price-highlight{
  background:none;color:var(--ink);padding:8pt 0 9pt;min-height:0;
  border-top:1.1pt solid var(--accent);border-bottom:3pt double var(--accent);
  font-family:var(--sans);display:block;
}
.doc .price-highlight span{
  display:block;font-size:6.2pt;text-transform:uppercase;letter-spacing:.15em;
  color:var(--accent);font-weight:700;
}
.doc .price-highlight strong{
  display:block;font-family:var(--serif);font-size:26pt;line-height:1;
  font-weight:600;letter-spacing:-.02em;margin:6pt 0 4pt;color:var(--ink);
  font-variant-numeric:tabular-nums;
}
.doc .price-highlight small{display:block;font-size:7.4pt;color:var(--graphite)}
.doc .summary-table{
  width:100%;margin:0!important;font-family:var(--sans);font-size:8.1pt;
  font-variant-numeric:tabular-nums;border-collapse:collapse!important;
  border-top:1.1pt solid var(--accent);
}
.doc .summary-table tr:first-child td{padding-top:8pt!important}
.doc .summary-table td{
  border:0!important;border-bottom:.6pt solid var(--rule-soft)!important;
  padding:4.5pt 0!important;color:var(--ink-70);
}
.doc .summary-table td:last-child{text-align:right;color:var(--ink);white-space:nowrap}
.doc .summary-table tr:last-child td{
  border-bottom:3pt double var(--ink)!important;
  border-top:1.1pt solid var(--ink)!important;
  padding-top:5.5pt!important;font-size:10pt;font-weight:700;color:var(--ink);
}

/* -------------------------------------------------------- conditions cadre  */
.doc .terms-card{
  margin:6pt 0 13pt;padding:8pt 10pt;background:var(--paper-2);
  border:0;border-left:2pt solid var(--rule);
  font-family:var(--sans);font-size:7.9pt;line-height:1.5;
  break-inside:avoid;page-break-inside:avoid;
}
.doc .terms-card ul{margin:0;padding-left:12pt}
.doc .terms-card li{margin:0 0 3pt;text-align:left}
.doc .terms-card li::before{background:var(--graphite)}

/* --------------------------------------------------------------- signature  */
.doc .approval-section,.doc .lm-acceptance{
  margin-top:16pt;padding-top:9pt;border-top:1.1pt solid var(--ink);
  background:none;break-inside:avoid;page-break-inside:avoid;
}
.doc .approval-title{font-size:7.4pt;color:var(--accent);margin-bottom:8pt}
.doc .lm-acceptance{border-top:2.4pt solid var(--accent);padding-top:10pt}
.doc .lm-acceptance h2{
  font-family:var(--serif);font-size:15pt;font-weight:600;letter-spacing:-.01em;
  text-transform:none;color:var(--ink);border:0;margin:0 0 6pt;padding:0;
}
.doc .lm-acceptance .acceptance-note{
  font-family:var(--serif);font-size:9.2pt;line-height:1.5;color:var(--ink-70);
  margin-bottom:9pt;text-align:justify;
}
.doc .annex-list{display:flex;gap:5pt;flex-wrap:wrap;margin:7pt 0 11pt}
.doc .annex-pill{
  font-family:var(--sans);font-size:6.2pt;text-transform:uppercase;
  letter-spacing:.11em;font-weight:600;color:var(--ink);
  border:.6pt solid var(--rule);background:var(--paper-2);padding:4pt 6pt;
}
/* v43 — Bloc de signature aéré. Trois strates lisibles : qui signe, un
   espace franc pour signer, puis le trait et sa mention. Les colonnes
   s'étirent et l'espace de signature absorbe la différence, si bien que les
   traits de deux blocs voisins s'alignent quel que soit le texte au-dessus. */
.doc .approval-grid{display:grid;grid-template-columns:1fr 1fr;gap:11mm;align-items:stretch}
.doc .approval-box{
  border:0;border-top:.7pt solid var(--rule);padding:10pt 0 0;background:none;
  font-family:var(--sans);font-size:8.4pt;line-height:1.6;color:var(--ink-70);
  display:flex;flex-direction:column;min-height:40mm;
}
.doc .approval-grid.solo{grid-template-columns:1fr;max-width:112mm}
.doc .approval-box .approval-label{
  font-size:6.2pt;text-transform:uppercase;letter-spacing:.15em;
  color:var(--accent);font-weight:600;margin-bottom:8pt;
}
.doc .approval-box strong,.doc .approval-who{
  font-family:var(--serif);font-size:11.4pt;line-height:1.3;color:var(--ink);font-weight:600;
  display:block;margin-bottom:2pt;
}
.doc .approval-sub{font-size:8.4pt;line-height:1.55;color:var(--ink-70)}
/* Espace de signature : c'est lui qui donne de l'air au bloc et qui pousse
   le trait en bas. L'ancre Yousign se place à son sommet, pour que le champ
   se dessine dans le vide, au-dessus du trait, et non par-dessus la mention. */
.doc .sign-space{flex:1 1 auto;min-height:22mm;margin-top:9pt}
.doc .signature-line{
  margin-top:0;border-top:.6pt solid var(--ink);padding-top:5pt;
  font-size:6.8pt;line-height:1.4;color:var(--graphite);letter-spacing:.02em;
}
.doc .ys-zone{display:block}

/* -------------------------------------------------------- pied de document  --
   Mentions légales du cabinet : en bas du document, jamais en en-tête.
   Volontairement dans le flux (pas de position:fixed, qui se superpose au
   contenu selon les moteurs de rendu). Pour une répétition sur chaque feuille,
   utiliser le footerTemplate du service PDF (voir REFONTE-DOCUMENTS.md). */
.doc .pied{
  margin-top:16pt;border-top:.6pt solid var(--rule);padding-top:5pt;
  font-family:var(--sans);font-size:5.8pt;line-height:1.5;
  color:var(--graphite);text-align:center;
  break-inside:avoid;page-break-inside:avoid;
}
.doc .pied b{color:var(--ink-70);font-weight:600}

/* ================================================ LETTRE DE MISSION — corps */
.doc .lm-intro{font-size:9.8pt;line-height:1.55;margin:0 0 12pt}
.doc .lm-intro p{margin:0 0 7pt}
.doc .lm-summary{
  display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:0;margin:0 0 14pt;
  border-top:1.1pt solid var(--ink);border-bottom:.6pt solid var(--rule);
  break-inside:avoid;page-break-inside:avoid;
}
.doc .lm-summary>div{
  border:0;background:none;padding:7pt 5mm 7pt 0;font-family:var(--sans);
}
.doc .lm-summary>div+div{border-left:.6pt solid var(--rule-soft);padding-left:5mm}
.doc .lm-summary span{
  display:block;font-size:5.9pt;text-transform:uppercase;letter-spacing:.14em;
  color:var(--accent);font-weight:600;margin-bottom:2.5pt;
}
.doc .lm-summary b{display:block;font-size:8.2pt;line-height:1.35;color:var(--ink);font-weight:600}
.doc .lm-summary small{display:block;margin-top:2pt;font-size:6.5pt;line-height:1.3;color:var(--graphite);font-weight:400;text-transform:none;letter-spacing:0}
.doc .lm-article{break-inside:auto;page-break-inside:auto}
.doc .lm-hono{margin-top:7pt!important}

/* ------------------------------------------------------------- annexes LM   */
.doc .lm-annex-section,.doc .lm-cg{
  border:0;break-before:page;page-break-before:always;
}
.doc .lm-annex-head{
  border:0;border-top:2.4pt solid var(--accent);
  border-bottom:.6pt solid var(--rule);
  padding:7pt 0 6pt;margin:0 0 9pt;
}
.doc .lm-annex-head .kicker{font-size:6.2pt;color:var(--accent);letter-spacing:.16em}
.doc .lm-annex-head h2{
  font-family:var(--serif);font-size:17pt;line-height:1.1;font-weight:600;
  letter-spacing:-.015em;color:var(--ink);text-transform:none;
  border:0;margin:4pt 0 0;padding:0;
}
.doc .lm-annex-intro,.doc .lm-note{
  font-family:var(--sans);font-size:7.4pt;line-height:1.5;color:var(--graphite);
  margin:0 0 8pt;
}

/* Tableau de répartition des obligations : un tableau par grande rubrique,
   chacun insécable, pour éviter qu'une ou deux lignes se retrouvent seules
   sous un en-tête répété en haut de page. */
.doc .lm-oblig-group{margin:0 0 14pt;break-inside:avoid;page-break-inside:avoid}
.doc .lm-oblig-title{
  font-family:var(--sans);font-size:9.6pt;font-weight:700;color:var(--ink);
  margin:0 0 5pt;padding:7pt 0 0;position:relative;
  break-after:avoid;page-break-after:avoid;
}
.doc .lm-oblig-title::before{
  content:"";position:absolute;left:0;top:0;width:13mm;height:1.8pt;background:var(--accent);
}
.doc table.lm-oblig{
  font-family:var(--sans);font-size:7.6pt;border:0;
  border-top:1.1pt solid var(--ink);margin:0;
}
.doc .lm-oblig thead th{
  background:var(--paper-2);color:var(--ink);border:0;border-bottom:.6pt solid var(--rule);
  padding:5pt 6pt;font-size:5.9pt;font-weight:600;text-transform:uppercase;
  letter-spacing:.13em;text-align:left;vertical-align:bottom;
}
.doc .lm-oblig thead th.role{text-align:center;width:19mm}
.doc .lm-oblig td{
  padding:4pt 6pt;border:0;border-bottom:.6pt solid var(--rule-soft);
  vertical-align:top;color:var(--ink-70);
}
.doc .lm-oblig td+td{text-align:center;width:19mm}
.doc .lm-oblig tr.duty.alt td{background:var(--paper-2)}
.doc .lm-oblig tr.grp td{
  background:none!important;color:var(--ink);font-weight:700;
  font-size:6.6pt;text-transform:uppercase;letter-spacing:.13em;
  border-top:1.1pt solid var(--accent);border-bottom:.6pt solid var(--rule);
  padding-top:8pt;
}
.doc .lm-oblig tr.subgrp td{
  color:var(--ink);font-weight:600;background:none!important;
}
.doc .lm-oblig .lm-check{color:var(--ink);font-weight:700;font-size:8.4pt}
.doc .lm-oblig .lm-sub{margin-top:2pt;color:var(--graphite);font-size:6.9pt;line-height:1.45}
.doc .lm-oblig .lm-sub div{padding-left:7pt;position:relative}
.doc .lm-oblig .lm-sub div::before{
  content:"";position:absolute;left:0;top:.5em;width:3pt;height:.6pt;background:var(--rule);
}

/* Conditions générales : deux colonnes justifiées. */
.doc .lm-cg{font-size:7.9pt;line-height:1.48}
.doc .lm-cg-columns{column-count:2;column-gap:8mm;column-rule:.6pt solid var(--rule-soft)}
.doc .lm-cg-article{margin:0 0 8pt;break-inside:auto;page-break-inside:auto}
.doc .lm-cg-article>.cg-title{
  font-family:var(--sans);font-size:7.2pt;font-weight:700;line-height:1.3;
  color:var(--ink);margin:0 0 3.5pt;padding:0;text-transform:none;
  letter-spacing:.01em;break-after:avoid;page-break-after:avoid;
}
.doc .lm-cg-article p{font-size:7.9pt;line-height:1.48;margin:0 0 5pt}
.doc .lm-cg-article ul{font-size:7.9pt;line-height:1.44;margin:3pt 0 5pt;padding-left:10pt}
.doc .lm-cg-article li{margin:0 0 1.5pt}
.doc .lm-cg-article li::before{left:-7pt;width:2.5pt}
.doc .lm-cg-article b{font-weight:600;color:var(--ink)}

/* ============================================================ IMPRESSION == */
@page{size:A4;margin:17mm 16mm 20mm}

@media print{
  html,body{margin:0!important;padding:0!important;background:#fff!important}
  body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .doc{
    max-width:none!important;width:auto!important;
    margin:0!important;padding:0!important;
    border:0!important;box-shadow:none!important;
  }
  .doc table{break-inside:auto;page-break-inside:auto}
  .doc thead{display:table-header-group}
  .doc tfoot{display:table-footer-group}
  .doc tr{break-inside:avoid!important;page-break-inside:avoid!important}
  .doc h1,.doc h2,.doc .art-title,.doc .cg-title,.doc .doc-section-title{
    break-after:avoid!important;page-break-after:avoid!important;
  }
  .doc p,.doc li{orphans:3;widows:3}
  .doc .doc-header,.doc .doc-hero,.doc .doc-address,.doc .recipient-card,.doc .price-summary,
  .doc .terms-card,.doc .approval-section,.doc .lm-summary,.doc .lm-acceptance,
  .doc .fiche,.doc .expertise-visual,.doc .values-visual{
    break-inside:avoid!important;page-break-inside:avoid!important;
  }
  .doc .offer-section,.doc .lm-article{break-inside:auto!important;page-break-inside:auto!important}
  /* v45 : les rubriques marquées « keep » et les encadrés de texte libre
     restent d'un seul tenant, même dans un document qui, lui, se pagine. */
  .doc .rubrique,.doc .q-free{break-inside:avoid!important;page-break-inside:avoid!important}
  .doc .lm-annex-section,.doc .lm-cg{break-before:page!important;page-break-before:always!important}
}
`;
/* ======================================================================
   v43 — Un seul gabarit de bloc de signature pour tous les documents :
   le devis (client seul), la lettre de mission (cabinet et client) et les
   pièces d'acceptation (cabinet seul). Même respiration partout, et une
   ancre Yousign toujours placée dans l'espace de signature.
   ====================================================================== */
const YS_ANCHOR_TAG = `<span class="ys-anchor">{{s1|signature|115|50|detailed|dd/MM/yyyy|f|f}}</span>`;
function approvalBoxHTML({label,nom,sous=[],mention,ancre=false}){
  const lignes=sous.filter(x=>x!==undefined&&x!==null&&String(x).trim()!=="");
  return `<div class="approval-box">
    <div class="approval-label">${esc(label)}</div>
    <div class="approval-who">${esc(nom||"—")}</div>
    ${lignes.map(l=>`<div class="approval-sub">${esc(l)}</div>`).join("")}
    <div class="sign-space"><span class="ys-zone">${ancre?YS_ANCHOR_TAG:""}</span></div>
    <div class="signature-line">${esc(mention||"Date et signature")}</div>
  </div>`;
}
function approvalSectionHTML(titre,boxes){
  return `<section class="approval-section"><div class="approval-title">${esc(titre)}</div>
    <div class="approval-grid${boxes.length<2?" solo":""}">${boxes.join("")}</div></section>`;
}
/* Injection dans la page : l'apercu ecran et le PDF partagent exactement la meme feuille. */
(function injecteCharte(){
  if(!document.getElementById("doc-fonts")){
    const l=document.createElement("link"); l.id="doc-fonts"; l.rel="stylesheet"; l.href=DOC_FONTS_HREF;
    document.head.appendChild(l);
  }
  if(!document.getElementById("doc-charte")){
    const s=document.createElement("style"); s.id="doc-charte"; s.textContent=DOC_CHARTE_CSS+QUESTIONNAIRE_DOC_CSS;
    document.head.appendChild(s);
  }
})();
/* Regles d'impression repetees hors @media print : certains services de rendu
   PDF emulent le media "screen". */
const DOC_PRINT_HARDENING = `
  html,body{margin:0!important;padding:0!important;background:#fff!important}
  body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .doc{max-width:none!important;width:auto!important;margin:0!important;padding:0!important;
       border:0!important;box-shadow:none!important}
  .doc thead{display:table-header-group}.doc tfoot{display:table-footer-group}
  .doc tr{break-inside:avoid!important;page-break-inside:avoid!important}
  .doc h1,.doc h2,.doc .art-title,.doc .cg-title,.doc .doc-section-title{break-after:avoid!important;page-break-after:avoid!important}
  .doc p,.doc li{orphans:3;widows:3}
  .doc .doc-header,.doc .doc-hero,.doc .doc-address,.doc .recipient-card,.doc .price-summary,.doc .terms-card,
  .doc .approval-section,.doc .lm-summary,.doc .lm-acceptance,.doc .fiche,
  .doc .expertise-visual,.doc .values-visual{break-inside:avoid!important;page-break-inside:avoid!important}
  .doc .offer-section,.doc .lm-article{break-inside:auto!important;page-break-inside:auto!important}
  .doc .rubrique,.doc .q-free{break-inside:avoid!important;page-break-inside:avoid!important}
  .doc .lm-annex-section,.doc .lm-cg{break-before:page!important;page-break-before:always!important}
`;
/* v53.4 : la substitution visait les trois valeurs d'accent écrites en dur.
   Le jour où la charte documentaire change de couleur — c'est le cas entre
   les deux cabinets — plus rien ne correspondait, et la couleur choisie dans
   Réglages › Apparence était silencieusement ignorée sur les documents. On
   cible désormais la déclaration, pas sa valeur. */
function brandedDocCSS(){
  const b=brandData(), dark=mixColor(b.primary,"#000000",.20), tint=mixColor(b.primary,"#ffffff",.90);
  return DOC_CHARTE_CSS
    .replace(/--accent:\s*#[0-9a-fA-F]{3,8};/, `--accent:${b.primary};`)
    .replace(/--accent-dk:\s*#[0-9a-fA-F]{3,8};/, `--accent-dk:${dark};`)
    .replace(/--accent-tint:\s*#[0-9a-fA-F]{3,8};/, `--accent-tint:${tint};`);
}
function docCSS(){return brandedDocCSS()+QUESTIONNAIRE_DOC_CSS+"\nbody{background:#fff;margin:0;padding:0}";}
function pdfCSS(){return brandedDocCSS()+QUESTIONNAIRE_DOC_CSS+DOC_PRINT_HARDENING;}
function pdfDocumentHTML(type,d,m){
  const body=type==="lm"?lmHTML(d,m):devisHTML(d,m);
  const titre=type==="lm"?`Lettre de mission ${d.refLm||""}`:`Devis ${d.ref||""}`;
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titre)}</title><link rel="stylesheet" href="${DOC_FONTS_HREF}"><style>${pdfCSS()}</style></head><body>${body}</body></html>`;
}

async function fetchPdfBlob(type,d=curDev(),m=d&&modOf(d)){
  if(!d||!m)throw new Error("Dossier introuvable.");
  const pdfProxy=String(st.ys.proxy||DEFAULT_RENDER_PROXY).trim()||DEFAULT_RENDER_PROXY,filename=`${nomFichierDocument(d,type)}.pdf`,html=pdfDocumentHTML(type,d,m);
  const r=await fetch(pdfProxy.replace(/\/$/,"")+"/api/pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({filename,html,document_type:type})});
  if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.error||`HTTP ${r.status}`);}
  const ct=(r.headers.get("content-type")||"").toLowerCase(),buf=await r.arrayBuffer(),head=new TextDecoder("ascii").decode(buf.slice(0,5));
  if(!ct.includes("application/pdf")||head!=="%PDF-")throw new Error("Le serveur n'a pas renvoyé un PDF valide.");
  return {blob:new Blob([buf],{type:"application/pdf"}),filename,html};
}
async function openPdfCompare(type){
  const d=curDev(),m=d&&modOf(d);if(!d||!m)return;if(type==="lm"&&!hasLettreMission(d))return toast("Aucune lettre de mission rattachée.",true);
  try{
    toast("Génération du PDF de comparaison…");const {blob,html}=await fetchPdfBlob(type,d,m),url=URL.createObjectURL(blob),sourceHash=(await sha256Text(html)).slice(0,16);
    const modal=document.createElement("div");modal.className="modal preview-modal";modal.innerHTML=`<div class="box"><div class="preview-head"><b>Contrôle aperçu / PDF — ${type==="lm"?"Lettre de mission":"Devis"}</b><span class="hint">Même source HTML · empreinte ${sourceHash}</span><span class="spacer"></span><button class="btn" data-preview-close>Fermer</button></div><div class="preview-compare"><div><div class="preview-compare-head"><b>Aperçu SERRE</b><span>HTML de référence</span></div><div class="html-pane">${type==="lm"?lmHTML(d,m):devisHTML(d,m)}</div></div><div><div class="preview-compare-head"><b>PDF rendu</b><span>Render / Chromium</span></div><iframe class="pdf-pane" src="${url}" title="PDF de comparaison"></iframe></div></div></div>`;
    document.body.appendChild(modal);const close=()=>{URL.revokeObjectURL(url);modal.remove();};modal.querySelector("[data-preview-close]").onclick=close;modal.onclick=e=>{if(e.target===modal)close();};auditGlobal("Comparaison aperçu / PDF",`${type} · source ${sourceHash}`,"document",d.id);
  }catch(e){captureAppError(e,"pdf.compare");toast("Comparaison impossible : "+e.message,true);}
}

async function downloadPdfDocument(type){
  const d=curDev(), m=modOf(d);
  if(!d||!m){ toast("Dossier introuvable.",true); return; }
  if(type==="lm"&&!hasLettreMission(d)){ toast("Aucune lettre de mission n’est rattachée à ce devis.",true); return; }
  const pdfProxy=String(st.ys.proxy||DEFAULT_RENDER_PROXY).trim()||DEFAULT_RENDER_PROXY;
  const filename=`${nomFichierDocument(d,type)}.pdf`;
  try{
    toast(type==="lm"?"Génération de la lettre de mission PDF…":"Génération du devis PDF…");
    const r=await fetch(pdfProxy.replace(/\/$/,"")+"/api/pdf",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({filename,html:pdfDocumentHTML(type,d,m),document_type:type})
    });
    if(!r.ok){ const j=await r.json().catch(()=>({})); throw new Error(j.error||`HTTP ${r.status}`); }
    const ct=(r.headers.get("content-type")||"").toLowerCase();
    const buf=await r.arrayBuffer();
    const head=new TextDecoder("ascii").decode(buf.slice(0,5));
    if(!ct.includes("application/pdf")||head!=="%PDF-"){
      const msg=new TextDecoder("utf-8").decode(buf.slice(0,1000));
      throw new Error("Le serveur n’a pas renvoyé un PDF valide"+(msg?" — "+msg.slice(0,180):""));
    }
    const blob=new Blob([buf],{type:"application/pdf"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=filename;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),2500);
    toast(`${filename} téléchargé.`);
  }catch(e){
    /* « Failed to fetch » ne dit rien à personne : c'est le message du
       navigateur quand la requête n'atteint pas le service (origine non
       autorisée, service arrêté, réseau coupé). On nomme la cause probable
       et on renvoie vers « Imprimer », qui produit le même document. */
    const bloque=/failed to fetch|load failed|networkerror/i.test(String(e.message||""));
    toast(bloque
      ? "Le service de rendu PDF n'a pas pu être appelé depuis ce site. Utilisez « Imprimer » puis « Enregistrer au format PDF » : le document est identique. Diagnostic dans Outils internes."
      : "PDF impossible : "+e.message, true);
  }
}
function payload(d, full){
  const m=modOf(d), t=totaux(d,m), avecLm=hasLettreMission(d);
  const wrap=h=>`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><link rel="stylesheet" href="${DOC_FONTS_HREF}"><style>${docCSS()}</style></head><body>${h}</body></html>`;
  const dv=wrap(devisHTML(d,m));
  const documents=[];
  if(avecLm){ const lm=wrap(lmHTML(d,m)); documents.push({filename:`${d.refLm||"lettre-de-mission"}.pdf`,html:full?lm:lm.slice(0,120)+"…"}); }
  documents.push({filename:`${d.ref||"devis"}.pdf`,html:full?dv:dv.slice(0,120)+"…"});
  return { env:st.ys.env, reference:d.ref, name:`${d.ref} — ${d.client.raison}`,
    signer:{ first_name:(d.client.contact||"").split(" ")[0]||"Client",
      last_name:(d.client.contact||"").split(" ").slice(1).join(" ")||d.client.raison||"Client",
      email:d.client.email, phone_number:d.client.tel||null, locale:"fr" },
    authentication:st.ys.auth, documents,
    metadata:{ devis:d.id, modele:m.titre, mensuel:Math.round(t.recMens*100)/100,
      ht:Math.round(t.ht*100)/100, ttc:Math.round(t.ttc*100)/100 } };
}

function askConfirm(title,message,{confirmLabel="Confirmer",danger=false}={}){
  return new Promise(resolve=>{
    const m=document.createElement("div");m.className="modal modal-confirm";
    m.innerHTML=`<div class="box"><div class="modal-titlebar"><h2>${esc(title)}</h2><button class="modal-x" type="button">×</button></div><div class="modal-content">${esc(String(message||"")).replace(/\n/g,"<br>")}</div><div class="modal-actions"><button class="btn" data-no>Annuler</button><button class="btn ${danger?"danger":"p"}" data-yes>${esc(confirmLabel)}</button></div></div>`;
    const done=v=>{m.remove();resolve(v);};m.querySelector("[data-no]").onclick=()=>done(false);m.querySelector("[data-yes]").onclick=()=>done(true);m.querySelector(".modal-x").onclick=()=>done(false);m.onclick=e=>{if(e.target===m)done(false);};document.body.appendChild(m);setTimeout(()=>m.querySelector("[data-yes]")?.focus(),20);
  });
}

/* Saisie d’une ligne de texte, même facture que `askConfirm`.
   Résout sur la valeur saisie, ou sur null si l’utilisateur renonce. */
function askText(title,message,{value="",label="",confirmLabel="Enregistrer",placeholder=""}={}){
  return new Promise(resolve=>{
    const m=document.createElement("div");m.className="modal modal-confirm";
    m.innerHTML=`<div class="box"><div class="modal-titlebar"><h2>${esc(title)}</h2><button class="modal-x" type="button">×</button></div>
      <div class="modal-content">${message?`<p>${esc(String(message)).replace(/\n/g,"<br>")}</p>`:""}
        <label class="f"><span>${esc(label||title)}</span><input type="text" data-val value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off"></label></div>
      <div class="modal-actions"><button class="btn" data-no>Annuler</button><button class="btn p" data-yes>${esc(confirmLabel)}</button></div></div>`;
    const champ=m.querySelector("[data-val]");
    const done=v=>{m.remove();resolve(v);};
    m.querySelector("[data-no]").onclick=()=>done(null);
    m.querySelector(".modal-x").onclick=()=>done(null);
    m.querySelector("[data-yes]").onclick=()=>done(String(champ.value||"").trim());
    champ.onkeydown=e=>{ if(e.key==="Enter"){e.preventDefault();done(String(champ.value||"").trim());} if(e.key==="Escape") done(null); };
    m.onclick=e=>{if(e.target===m)done(null);};
    document.body.appendChild(m);
    setTimeout(()=>{champ.focus();champ.select();},20);
  });
}

/* =====================================================================
   v50 — Conflit d'enregistrement entre deux collaborateurs
   ---------------------------------------------------------------------
   Le dossier a changé en base pendant la saisie. L'écriture a été
   refusée plutôt qu'appliquée : c'est ici que l'utilisateur choisit quoi
   en faire. Les deux versions existent encore à cet instant — la sienne
   à l'écran, celle de la base dans `distant` — et aucune n'est perdue
   tant qu'il n'a pas tranché.
   ===================================================================== */
function conflitAuteur(distant){
  const a=distant?.data?.audit?.[0];
  const qui=a?.actor||distant?.data?.majPar||"";
  const quand=a?.at||distant?.data?.majAt||"";
  if(qui&&quand) return `${qui}, ${dateTimeFR(quand)}`;
  if(qui) return qui;
  if(quand) return dateTimeFR(quand);
  return "un autre poste";
}
function annoncerConflitDossier(d,distant){
  if(!d||!distant) return;
  if(document.querySelector("[data-conflit]")) return;   /* une seule boîte */
  const m=document.createElement("div");
  m.className="modal modal-confirm"; m.setAttribute("data-conflit","1");
  m.innerHTML=`<div class="box"><div class="modal-titlebar"><h2>Ce dossier a changé pendant votre saisie</h2></div>
    <div class="modal-content">
      <p>Le dossier ${d.ref?`<b class="mono">${esc(d.ref)}</b> `:""}a été enregistré entre-temps par <b>${esc(conflitAuteur(distant))}</b>. Votre modification n'a <b>pas</b> été écrite : elle aurait effacé la sienne.</p>
      <div class="choice-block"><b>Reprendre la version enregistrée</b>
        <div>Recharge le dossier tel qu'il est en base. Ce que vous veniez de saisir est abandonné — refaites-le ensuite sur la version à jour. C'est le choix sûr.</div></div>
      <div class="choice-block"><b>Imposer ma version</b>
        <div>Écrit votre version par-dessus et efface la modification de ${esc(conflitAuteur(distant))}. À ne retenir que si vous savez ce que contenait la sienne.</div></div>
    </div>
    <div class="modal-actions"><button class="btn" data-forcer>Imposer ma version</button><button class="btn p" data-recharger>Reprendre la version enregistrée</button></div></div>`;
  const fermer=()=>m.remove();
  m.querySelector("[data-recharger]").onclick=async()=>{
    fermer();
    const i=st.devis.findIndex(x=>x.id===d.id);
    const frais={...distant.data,rev:distant.rev};
    if(i>=0) st.devis[i]=ensureInternalState(frais); else st.devis.unshift(ensureInternalState(frais));
    SAVE_UI.state="saved"; SAVE_UI.at=nowISO();
    logAudit(curDev()||frais,"Version du serveur reprise après conflit",conflitAuteur(distant));
    render(); toast("Dossier rechargé dans sa version enregistrée.");
  };
  m.querySelector("[data-forcer]").onclick=async()=>{
    fermer();
    d.rev=distant.rev;                    /* on repart de la révision en base */
    logAudit(d,"Version locale imposée après conflit",`Écrase la modification de ${conflitAuteur(distant)}`);
    const ok=await saveDev();
    toast(ok?"Votre version a été enregistrée.":"Enregistrement toujours impossible.",!ok);
    render();
  };
  document.body.appendChild(m);
  setTimeout(()=>m.querySelector("[data-recharger]")?.focus(),20);
}

/* =====================================================================
   v49 — Que faire d'un dossier verrouillé
   ---------------------------------------------------------------------
   Remplace le message fugace « Dupliquez-le pour établir une nouvelle
   proposition », qui énonçait une solution sans l'offrir. Les deux issues
   sont ici présentées avec leurs conséquences, et actionnables.
   ===================================================================== */
function proposerDeblocage(){
  const d=curDev(); if(!d) return;
  const manager=canRole("manager"), n=numeroVersion(d);
  /* Un même champ peut émettre deux événements : la boîte reste unique. */
  if(document.querySelector("[data-deblocage]")) return;
  const m=document.createElement("div"); m.className="modal modal-confirm"; m.setAttribute("data-deblocage","1");
  m.innerHTML=`<div class="box"><div class="modal-titlebar"><h2>Dossier verrouillé</h2><button class="modal-x" type="button">×</button></div>
    <div class="modal-content">
      <p>Le devis ${d.ref?`<b class="mono">${esc(d.ref)}</b> `:""}est signé : son périmètre, ses prix et ses clauses sont immobilisés depuis le ${esc(dateTimeFR(d.frozenAt))}.</p>
      <div class="choice-block"><b>Dupliquer le dossier</b>
        <div>Crée une nouvelle proposition, avec sa propre référence. Le dossier signé reste intact. À retenir pour un avenant, une mission complémentaire ou un renouvellement.</div></div>
      <div class="choice-block"><b>Reprendre la main</b>
        <div>Rouvre <i>ce</i> dossier pour le corriger. La version ${n} signée est archivée et reste consultable, le suivi de signature revient à « envoyé », et le motif est inscrit au journal. ${manager?"":"<b>Réservé à un manager / associé.</b>"}</div></div>
    </div>
    <div class="modal-actions"><button class="btn" data-no>Annuler</button><button class="btn" data-dup>Dupliquer le dossier</button><button class="btn p" data-reprise ${manager?"":"disabled"}>Reprendre la main</button></div></div>`;
  const close=()=>m.remove();
  m.querySelector("[data-no]").onclick=close;
  m.querySelector(".modal-x").onclick=close;
  m.onclick=e=>{ if(e.target===m) close(); };
  m.querySelector("[data-dup]").onclick=()=>{ close(); ACTS.devDup(); };
  m.querySelector("[data-reprise]").onclick=()=>{ if(!manager) return; close(); ACTS.reprendreLaMain(); };
  document.body.appendChild(m);
  setTimeout(()=>m.querySelector(manager?"[data-reprise]":"[data-dup]")?.focus(),20);
}

function askFields(title,fields,{confirmLabel="Valider"}={}){
  return new Promise(resolve=>{
    const m=document.createElement("div");m.className="modal modal-confirm";
    m.innerHTML=`<div class="box"><div class="modal-titlebar"><h2>${esc(title)}</h2><button class="modal-x" type="button">×</button></div>
      <div class="modal-content"><div class="grid">${fields.map((f,i)=>`<label class="f"><span>${esc(f.label)}</span>${Array.isArray(f.options)?`<select data-af="${i}">${f.options.map(o=>{const v=Array.isArray(o)?o[0]:o,l=Array.isArray(o)?o[1]:o;return `<option value="${esc(v)}" ${String(f.value??"")===String(v)?"selected":""}>${esc(l)}</option>`;}).join("")}</select>`:f.type==="textarea"?`<textarea data-af="${i}" placeholder="${esc(f.placeholder||"")}">${esc(f.value||"")}</textarea>`:`<input data-af="${i}" type="${esc(f.type||"text")}" value="${esc(f.value||"")}" placeholder="${esc(f.placeholder||"")}">`}</label>`).join("")}</div></div>
      <div class="modal-actions"><button class="btn" data-no>Annuler</button><button class="btn p" data-yes>${esc(confirmLabel)}</button></div></div>`;
    const done=v=>{m.remove();resolve(v);};m.querySelector("[data-no]").onclick=()=>done(null);m.querySelector(".modal-x").onclick=()=>done(null);m.onclick=e=>{if(e.target===m)done(null);};
    m.querySelector("[data-yes]").onclick=()=>done(fields.map((f,i)=>m.querySelector(`[data-af="${i}"]`)?.value||""));
    document.body.appendChild(m);setTimeout(()=>m.querySelector("[data-af='0']")?.focus(),20);
  });
}
function openGlobalSearch(initial=""){
  document.querySelectorAll(".command-modal").forEach(x=>x.remove());
  const m=document.createElement("div");m.className="modal command-modal";m.innerHTML=`<div class="box"><div class="command-head"><input class="command-input" data-command-q type="text" placeholder="Client, SIREN, devis, référence, modèle, clause…" value="${esc(initial)}"></div><div class="command-body" data-command-body></div></div>`;document.body.appendChild(m);
  const input=m.querySelector("[data-command-q]"),body=m.querySelector("[data-command-body]");
  const draw=()=>{
    const q=normClient(input.value),cli=q?st.clients.filter(c=>normClient(`${c.raison} ${c.siren} ${c.ville} ${c.contact} ${c.email}`).includes(q)).slice(0,6):st.clients.slice(0,4),dev=q?st.devis.filter(d=>normClient(`${d.client?.raison} ${d.client?.siren} ${d.ref} ${modOf(d)?.titre}`).includes(q)).slice(0,6):recentDevis(4),mods=canRole("manager")?(q?st.modeles.filter(x=>normClient(`${x.titre} ${x.desc} ${(x.sections||[]).map(s=>`${s.titre} ${(s.items||[]).map(i=>i.label).join(" ")}`).join(" ")}`).includes(q)).slice(0,6):[]):[],clauses=q?textClauseLibrary().filter(c=>normClient(`${c.title} ${c.cat} ${c.tags} ${clausePreviewText(c)}`).includes(q)).slice(0,6):[];
    const blocks=[];
    if(dev.length)blocks.push(`<div class="command-section">Dossiers</div>${dev.map(x=>`<div class="command-result" data-gs-devis="${x.id}"><span class="ci">D</span><div><b>${esc(x.client?.raison||"Dossier")}</b><small>${esc(x.ref||"Brouillon")} · ${esc(modOf(x)?.titre||"")}</small></div><span class="dim">Dossier</span></div>`).join("")}`);
    if(cli.length)blocks.push(`<div class="command-section">Clients</div>${cli.map(x=>`<div class="command-result" data-gs-client="${x.id}"><span class="ci">C</span><div><b>${esc(x.raison||"Client")}</b><small>${esc(x.siren||"")} ${esc(x.ville||"")}</small></div><span class="dim">Client</span></div>`).join("")}`);
    if(mods.length)blocks.push(`<div class="command-section">Modèles</div>${mods.map(x=>`<div class="command-result" data-gs-model="${x.id}"><span class="ci">M</span><div><b>${esc(x.titre)}</b><small>${esc(x.desc||"")}</small></div><span class="dim">Modèle</span></div>`).join("")}`);
    if(clauses.length)blocks.push(`<div class="command-section">Clauses</div>${clauses.map(x=>`<div class="command-result" data-gs-clause="${esc(x.id)}"><span class="ci">§</span><div><b>${esc(x.title)}</b><small>${esc(x.cat||"")} · ${esc(clausePreviewText(x).slice(0,110))}</small></div><span class="dim">Clause</span></div>`).join("")}`);
    body.innerHTML=blocks.join("")||`<div class="empty-state"><b>Aucun résultat</b><small>Essayez un autre nom, SIREN, numéro de devis, modèle ou clause.</small></div>`;
    body.querySelectorAll("[data-gs-devis]").forEach(x=>x.onclick=()=>{st.id=x.dataset.gsDevis;st.view="devis1";st.tab=rememberedTab(st.id);m.remove();render();});
    body.querySelectorAll("[data-gs-client]").forEach(x=>x.onclick=()=>{st.clientViewId=x.dataset.gsClient;st.view="client1";m.remove();render();});
    body.querySelectorAll("[data-gs-model]").forEach(x=>x.onclick=()=>{st.modId=x.dataset.gsModel;st.view="modeles";m.remove();render();});
    body.querySelectorAll("[data-gs-clause]").forEach(x=>x.onclick=()=>{const id=x.dataset.gsClause,c=textClauseLibrary().find(z=>z.id===id);m.remove();openClauseLibrary("manage","");setTimeout(()=>{const q=document.querySelector("[data-clause-search]");if(q&&c){q.value=c.title;q.dispatchEvent(new Event("input",{bubbles:true}));}},40);});
  };
  input.oninput=draw;m.onclick=e=>{if(e.target===m)m.remove();};draw();setTimeout(()=>input.focus(),20);
}
function modal(t,b){
  const m=document.createElement("div"); m.className="modal";
  m.innerHTML=`<div class="box"><div class="modal-titlebar"><h2>${esc(t)}</h2><button class="modal-x" data-x type="button" aria-label="Fermer">×</button></div><div class="modal-content">${b}</div><div class="modal-actions"><button class="btn" data-x>Fermer</button></div></div>`;
  m.onclick=e=>{ if(e.target===m||e.target.hasAttribute("data-x")) m.remove(); };
  document.body.appendChild(m);
}
function renderLogin(msg=""){
  const root=document.getElementById("app"),b=cachedBrandData();document.documentElement.style.setProperty("--vert",b.primary);document.documentElement.style.setProperty("--rail-bg",b.rail);document.title=`${b.product} — Connexion`;root.className="";
  root.innerHTML=`<div class="auth-page"><div class="auth-shell"><section class="auth-showcase">${b.logo?`<img class="auth-logo" src="${esc(b.logo)}" alt="">`:`<div class="auth-brand" style="font-size:22px;font-weight:750;letter-spacing:.16em">${esc(b.product)}</div>`}<h1>Devis, missions et signatures dans un seul espace.</h1><p>Une interface métier conçue pour structurer le parcours commercial du cabinet, de l'identification RNE à la signature.</p><div class="auth-feature">Référentiel de modèles et lettres de mission</div><div class="auth-feature">Calcul et présentation des honoraires</div><div class="auth-feature">RNE / INPI et signature électronique</div></section>
  <form class="auth-box" id="login-form">${b.logo?`<img class="auth-logo" src="${esc(b.logo)}" alt="">`:""}<div class="auth-brand">${esc(b.product)}</div><div class="auth-sub">${esc(b.subtitle)}</div><label>Adresse e-mail</label><input type="email" id="login-email" autocomplete="username" required autofocus><label>Mot de passe</label><input type="password" id="login-password" autocomplete="current-password" required><button class="auth-forgot" type="button" id="forgot-password">Mot de passe oublié ?</button><button class="btn p" type="submit" style="width:100%;justify-content:center;margin-top:16px">Se connecter</button><div class="auth-msg" id="login-msg">${esc(msg)}</div><div class="auth-help">Accès sécurisé réservé aux utilisateurs autorisés par le cabinet.</div></form></div></div>`;
  document.getElementById("login-form").onsubmit=async e=>{e.preventDefault();const m=document.getElementById("login-msg");m.textContent="Connexion…";const email=document.getElementById("login-email").value.trim(),password=document.getElementById("login-password").value;try{const {error}=await SB.auth.signInWithPassword({email,password});if(error)throw error;location.reload();}catch(err){m.textContent="Connexion impossible : "+err.message;}};
  document.getElementById("forgot-password").onclick=async()=>{const email=document.getElementById("login-email").value.trim(),m=document.getElementById("login-msg");if(!email){m.textContent="Renseignez d'abord votre adresse e-mail.";return;}try{const {error}=await SB.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+window.location.pathname});if(error)throw error;m.style.color="var(--encre-55)";m.textContent="Un courriel de réinitialisation a été demandé. Vérifiez votre boîte de réception.";}catch(err){m.textContent="Réinitialisation impossible : "+err.message;}};
}
/* =====================================================================
   v47 — PREMIÈRE CONNEXION : CHOIX DU MOT DE PASSE
   ---------------------------------------------------------------------
   Un compte créé par le cabinet part d'un mot de passe provisoire commun.
   Tant que `profiles.must_change_password` est vrai, l'application ne
   s'ouvre pas : cet écran remplace l'interface et n'en libère l'accès
   qu'une fois le mot de passe remplacé.

   Le drapeau est levé par la fonction SQL `finish_password_change()`, qui
   est verrouillée sur l'utilisateur connecté : le collaborateur ne peut ni
   lever le drapeau d'un autre compte, ni modifier son propre rôle.
   ===================================================================== */
const MDP_LONGUEUR_MIN = 12;

function forceMdpDiagnostic(mdp){
  const s=String(mdp||"");
  const classes=[/[a-z]/,/[A-Z]/,/[0-9]/,/[^A-Za-z0-9]/].filter(r=>r.test(s)).length;
  if(s.length<MDP_LONGUEUR_MIN) return `Le mot de passe doit comporter au moins ${MDP_LONGUEUR_MIN} caractères.`;
  if(classes<3) return "Le mot de passe doit combiner au moins trois types de caractères : minuscules, majuscules, chiffres, signes.";
  return "";
}

function renderPasswordSetup(){
  const root=document.getElementById("app"), b=cachedBrandData();
  document.documentElement.style.setProperty("--vert",b.primary);
  document.documentElement.style.setProperty("--rail-bg",b.rail);
  document.title=`${b.product} — Choix du mot de passe`;
  root.className="";
  root.innerHTML=`<div class="auth-page"><div class="auth-shell">
    <section class="auth-showcase">${b.logo?`<img class="auth-logo" src="${esc(b.logo)}" alt="">`:`<div class="auth-brand" style="font-size:22px;font-weight:750;letter-spacing:.16em">${esc(b.product)}</div>`}
      <h1>Première connexion : choisissez votre mot de passe.</h1>
      <p>Votre compte a été ouvert par le cabinet avec un mot de passe provisoire, commun à tous les nouveaux accès. Il doit être remplacé avant toute utilisation.</p>
      <div class="auth-feature">Au moins ${MDP_LONGUEUR_MIN} caractères</div>
      <div class="auth-feature">Minuscules, majuscules, chiffres ou signes — trois types au minimum</div>
      <div class="auth-feature">Connu de vous seul : le cabinet n'y a pas accès</div>
    </section>
    <form class="auth-box" id="mdp-form">
      ${b.logo?`<img class="auth-logo" src="${esc(b.logo)}" alt="">`:""}
      <div class="auth-brand">${esc(b.product)}</div>
      <div class="auth-sub">${esc(SB_USER?.email||"")}</div>
      <label>Nouveau mot de passe</label>
      <input type="password" id="mdp-1" autocomplete="new-password" required autofocus>
      <label>Confirmation</label>
      <input type="password" id="mdp-2" autocomplete="new-password" required>
      <button class="btn p" type="submit" style="width:100%;justify-content:center;margin-top:16px">Enregistrer et ouvrir l'application</button>
      <div class="auth-msg" id="mdp-msg"></div>
      <button class="auth-forgot" type="button" id="mdp-logout">Se déconnecter</button>
    </form></div></div>`;

  document.getElementById("mdp-logout").onclick=()=>logoutSupabase();
  document.getElementById("mdp-form").onsubmit=async e=>{
    e.preventDefault();
    const msg=document.getElementById("mdp-msg");
    const a=document.getElementById("mdp-1").value, z=document.getElementById("mdp-2").value;
    msg.style.color="";
    const probleme=forceMdpDiagnostic(a);
    if(probleme){ msg.textContent=probleme; return; }
    if(a!==z){ msg.textContent="Les deux saisies ne correspondent pas."; return; }
    msg.style.color="var(--encre-55)";
    msg.textContent="Enregistrement…";
    try{
      const {error}=await SB.auth.updateUser({password:a});
      /* Supabase refuse un mot de passe identique au précédent : c'est
         exactement le cas qu'on veut empêcher ici, on le dit clairement. */
      if(error) throw new Error(/same|différent|identical/i.test(error.message)
        ? "Ce mot de passe est celui qui vous a été communiqué. Choisissez-en un autre."
        : error.message);
      const {error:rpcError}=await SB.rpc("finish_password_change");
      if(rpcError) throw rpcError;
      location.reload();
    }catch(err){
      msg.style.color="";
      msg.textContent="Enregistrement impossible : "+(err?.message||err);
    }
  };
}
async function logoutSupabase(){ if(SB) await SB.auth.signOut(); location.reload(); }

