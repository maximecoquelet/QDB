/* =====================================================================
   LETTRES DE MISSION — MISSIONS PONCTUELLES (v47)

   Trames OEC intégrées :
   - Prévisionnel : « La mission d'examen d'informations financières
     prévisionnelles » — exemple de lettre de mission adopté par la
     Commission des normes professionnelles du CSOEC le 3 mai 2012,
     revu le 27 septembre 2016 (norme professionnelle NP 3400).
     → mission d'ASSURANCE de niveau MODÉRÉ, conclusion sous forme négative.
   - Évaluation : « Mission d'évaluation d'une entité ou de ses titres » —
     exemple élaboré par le comité « Évaluation » du CSOEC et adopté par la
     CNP le 14 octobre 2015, revu le 27 septembre 2016.
     → autre prestation SANS ASSURANCE, aucune opinion exprimée.
   - Situation comptable intermédiaire : trame SERRE bâtie sur le cadre de
     référence OEC des missions sans assurance (aucune trame OEC dédiée).

   Les zones à compléter et les options de rédaction des trames OEC sont
   pilotées par le questionnaire du devis « Missions comptables
   exceptionnelles » : chaque choix alimente une variable {{rep.xxx}} et les
   paragraphes optionnels apparaissent ou disparaissent automatiquement.
   ===================================================================== */

const LM_PREVI_VERSION = "serre-oec-np3400-previsionnel-2026-v1";
const LM_EVAL_VERSION  = "serre-oec-evaluation-2026-v1";
const LM_SITU_VERSION  = "serre-situation-intermediaire-2026-v1";
const LM_CARBONE_VERSION = "serre-empreinte-carbone-2026-v1";

const LM_PREVI_SOURCE = "Trame SERRE — exemple de lettre de mission OEC « La mission d'examen d'informations financières prévisionnelles » (CNP 03/05/2012, revu 27/09/2016) — NP 3400";
const LM_EVAL_SOURCE  = "Trame SERRE — exemple de lettre de mission OEC « Mission d'évaluation d'une entité ou de ses titres » (comité Évaluation, CNP 14/10/2015, revu 27/09/2016)";
const LM_SITU_SOURCE  = "Trame SERRE — mission sans assurance d'établissement d'une situation comptable intermédiaire, bâtie sur le cadre de référence OEC des missions sans assurance";
const LM_CARBONE_SOURCE = "Trame SERRE — mission sans assurance d'accompagnement à l'évaluation de l'empreinte carbone (activité accessoire : articles 2 et 22 de l'ordonnance n° 45-2138 du 19 septembre 1945 ; norme professionnelle relative aux activités accessoires, arrêté du 12 mars 2021)";

/* ---------------------------------------------------------------------
   Natures de mission ajoutées au référentiel normatif de l'outil.
   Elles complètent NP2300 / NP2400 / TENUE définies dans 30-letter-content.js.
   --------------------------------------------------------------------- */
const NATURE_MISSIONS_PONCTUELLES = {
  NP3400:{
    t:"mission d’examen d’informations financières prévisionnelles",
    norme:"NP 3400 — norme professionnelle applicable à la mission d’examen d’informations financières prévisionnelles",
    intro:`{{client.civilite}} {{client.contact}},

Nous vous remercions de la confiance que vous nous témoignez en envisageant de nous confier, en qualité d’expert-comptable, une **mission d’examen {{previ.objet}}** de votre entité portant sur la période {{previ.periode}}.

{{previ.contexte}}

La présente lettre de mission reprend les termes de nos échanges et définit nos obligations respectives.`,
    cadre:`La mission sera réalisée dans le respect des dispositions de la **norme professionnelle du Conseil supérieur de l’Ordre des experts-comptables applicable à la mission d’examen d’informations financières prévisionnelles (NP 3400)**, du **Code de déontologie des professionnels de l’expertise comptable** et des textes légaux et réglementaires applicables aux experts-comptables.

Nous attirons votre attention sur le fait que **ces informations prévisionnelles et les hypothèses sur la base desquelles elles ont été établies relèvent de votre responsabilité**. {{previ.hypotheses}} Elles sont destinées à être présentées à {{previ.destinataires}}. Il nous appartient, sur la base de notre examen, d’exprimer notre conclusion sur ces informations prévisionnelles.`,
    p:`Il s’agit d’une **mission d’assurance de niveau modéré** aboutissant à une conclusion exprimée sous une forme négative portant sur :

- le caractère raisonnable des hypothèses ayant servi de base à l’élaboration des informations prévisionnelles ;
- la traduction chiffrée de ces hypothèses ;
- la préparation de ces informations sur la base de principes comptables appropriés.

L’objectif de cette mission consiste, sur la base des diligences définies par la NP 3400, à conclure que nous n’avons pas relevé d’éléments qui nous conduisent à penser :

- que les hypothèses retenues ne constituent pas une base raisonnable pour élaborer les informations prévisionnelles ; ou
- que la traduction chiffrée de ces hypothèses est erronée ; ou
- que les informations ne sont pas préparées de manière cohérente avec les états financiers historiques, sur la base de principes comptables appropriés.

Cette mission **n’a pas pour objectif de déceler des erreurs, actes illégaux ou autres irrégularités** pouvant ou ayant eu lieu dans votre entité, par exemple des fraudes ou malversations éventuelles.`,
    limites:`**La nature des travaux.** Nos travaux comporteront notamment :

- une prise de connaissance des activités de votre entité afin d’apprécier si toutes les hypothèses significatives requises pour la préparation des informations financières prévisionnelles ont été recensées ;
- une prise de connaissance du processus d’élaboration des informations financières prévisionnelles et une évaluation des procédures mises en place pour le choix des hypothèses et l’établissement de ces informations ;
- une évaluation de la fiabilité des informations financières historiques, afin de déterminer si les informations prévisionnelles sont cohérentes avec celles-ci et si ces dernières peuvent servir de référence pour apprécier les hypothèses retenues par la direction ;
- la vérification que les informations prévisionnelles sont correctement préparées sur la base des hypothèses retenues par la direction ;
- l’analyse des domaines particulièrement sensibles aux variations susceptibles d’avoir une incidence significative sur les résultats présentés.

**Les limites des travaux.** Il n’entre pas dans notre mission d’actualiser notre conclusion sur ces informations prévisionnelles pour tenir compte des faits et circonstances postérieurs à l’émission de notre rapport ; en outre, **nous ne pouvons apporter aucune assurance sur leur réalisation**.

S’agissant de prévisions présentant par nature un caractère incertain, **les réalisations différeront, parfois de manière significative, des informations prévisionnelles présentées**.

La direction demeure responsable des informations prévisionnelles, des hypothèses retenues et de la fiabilité, de l’exhaustivité et de l’exactitude des informations communiquées au cabinet.`,
    execution:`Notre mission sera exécutée sous la direction de {{mission.signataire}}, expert-comptable, qui pourra se faire assister en cas de besoin par d’autres intervenants du cabinet.

{{mission.planning}}

Nous comptons sur votre coopération et sur celle de vos équipes pour nous communiquer les informations et documents nécessaires à la bonne exécution de notre mission, à savoir notamment :

{{mission.documents}}

À l’issue de nos travaux, nous établirons un **rapport sur {{previ.rapport}}** de votre entité couvrant la période {{previ.periode}} ; ces informations prévisionnelles seront jointes en annexe à notre rapport.`,
    assurance:""
  },
  EVAL:{
    t:"mission d’évaluation d’une entité ou de ses titres",
    norme:"Mission sans assurance — cadre de référence OEC des missions de l’expert-comptable (mission d’évaluation)",
    intro:`{{client.civilite}} {{client.contact}},

Nous vous remercions de la confiance que vous nous témoignez en envisageant de nous confier, en qualité d’expert-comptable, une **mission d’évaluation {{eval.perimetre}}** au {{eval.date}}.

{{eval.confrere}}

La présente lettre de mission reprend les termes de nos échanges et définit nos obligations respectives.`,
    cadre:`La mission que vous envisagez de nous confier, **qui ne constitue ni un audit, ni un examen limité, ni une présentation de comptes**, sera effectuée dans le respect des dispositions des textes légaux et réglementaires applicables aux experts-comptables et du **Code de déontologie des professionnels de l’expertise comptable**.

Au regard du cadre de référence des missions de l’expert-comptable, cette mission d’évaluation s’inscrit parmi les **autres prestations fournies à l’entité — mission sans assurance**, à l’issue de laquelle l’expert-comptable **n’exprime pas d’opinion**.`,
    p:`{{eval.mission_existante}}

Vous nous avez demandé une évaluation {{eval.perimetre}} dans le contexte suivant : **{{rep.eval_contexte}}**.

{{eval.contexte_detail}}

Notre mission a pour but de vous fournir une **fourchette de valeurs** {{eval.perimetre}} à la date du {{eval.date}}, liée au contexte de l’évaluation et déterminée en fonction des informations financières disponibles.

Cette mission **n’a pas pour objectif de déceler des erreurs, actes illégaux ou autres irrégularités** pouvant ou ayant eu lieu dans l’entité évaluée.`,
    limites:`**La nature des travaux.** Nos travaux consisteront notamment en :

- une prise de connaissance générale nous permettant d’acquérir la compréhension de l’entité (forme juridique, historique, activité, positionnement sur le marché, clientèle, secteur, savoir-faire, concurrence, évaluations précédentes, management, actionnariat) ;
- des entretiens avec la direction et, le cas échéant, avec les collaborateurs que vous nous désignerez, pour comprendre les perspectives d’avenir et les hypothèses ayant prévalu à l’établissement du plan d’affaires ;
- une collecte et une revue des diagnostics stratégique, commercial, industriel, comptable, financier et ressources humaines, effectués par l’entité ou à sa demande ;
- l’identification des principaux points forts et points faibles de l’entité (marché, concurrence, outil industriel, principaux partenaires, hommes-clés, compétences) ;
- une identification et une analyse des hypothèses opérationnelles clés du plan d’affaires et de leur cohérence, incluant l’étude des écarts entre le budget et le réel ;
- une analyse des paramètres financiers ;
- l’identification des méthodes d’évaluation les plus appropriées compte tenu du contexte et du projet, leur mise en œuvre selon une **approche multicritère**, la justification des choix opérés et des méthodes ou critères écartés ;
- des analyses de sensibilité aux hypothèses opérationnelles clés et aux paramètres financiers retenus ;
- le recours à des expertises externes le cas échéant ;
- l’obtention, le cas échéant, d’une lettre d’affirmation reprenant les principales déclarations orales qui nous auront été faites ;
- la rédaction d’un rapport circonstancié.

**Les limites de nos travaux.** Nous sommes tenus à une **simple obligation de moyens**.

Nous ne nous prononcerons pas sur la régularité et la sincérité des informations qui nous seront transmises et que nous utiliserons dans nos travaux, qu’il s’agisse de données historiques ou prévisionnelles, ni sur la légalité et la fiabilité des documents qui nous seront présentés. Nous n’effectuerons qu’une **revue de cohérence et de vraisemblance** des données financières communiquées.

{{eval.limite_presentation}}

Les dirigeants de l’entité évaluée restent responsables de la fiabilité, de l’exhaustivité et de l’exactitude des informations qui nous seront transmises.

Notre mission prenant fin à la date de remise de notre rapport, **il n’entrera pas dans son cadre de procéder à un suivi de la valeur** qui ressortira de nos travaux.`,
    execution:`Notre mission sera exécutée sous la direction de {{mission.signataire}}, expert-comptable, qui pourra se faire assister en cas de besoin par d’autres intervenants du cabinet.

{{mission.planning}}

Nous comptons sur votre coopération et sur celle de vos équipes pour nous communiquer les informations et documents nécessaires à la bonne exécution de notre mission, à savoir notamment :

{{mission.documents}}

{{eval.entite_cible}}

À l’issue de nos travaux, nous établirons un **rapport d’évaluation**.`,
    assurance:""
  },
  SITUATION:{
    t:"mission d’établissement d’une situation comptable intermédiaire",
    norme:"Mission sans assurance — cadre de référence OEC et normes professionnelles d’application générale",
    intro:`{{client.civilite}} {{client.contact}},

Nous vous remercions de la confiance que vous nous témoignez en envisageant de nous confier une **mission d’établissement d’une situation comptable intermédiaire** arrêtée au {{situ.date}}.

La présente lettre de mission reprend les termes de nos échanges et définit nos obligations respectives.`,
    cadre:`La mission sera réalisée conformément au **Code de déontologie des professionnels de l’expertise comptable**, au cadre de référence de l’Ordre et aux normes professionnelles d’application générale, notamment la **NPMQ** et la **NPLAB**.

Il s’agit d’une **mission sans assurance**. Elle ne constitue ni un audit, ni un examen limité, ni une mission de présentation des comptes, et **n’aboutit à l’expression d’aucune assurance** sur la situation établie.`,
    p:`La mission a pour objet d’établir une **situation comptable intermédiaire** à la date indiquée, à partir de la comptabilité disponible et des informations communiquées par l’entité.

Cette situation est destinée à la finalité suivante : **{{rep.situation_finalite}}**. Le niveau de détail des travaux est adapté à cet objectif, au délai disponible et à la qualité des informations transmises.

Le client demeure responsable de ses décisions de gestion et de la fiabilité, de l’exhaustivité et de l’exactitude des informations transmises au cabinet. **Aucune opinion, conclusion d’assurance ou attestation de présentation des comptes n’est délivrée** au titre de cette mission.`,
    limites:`Les travaux pourront notamment comprendre, selon leur pertinence au dossier : la prise en compte des pièces comptables disponibles jusqu’à la date d’arrêté, le rapprochement des principaux comptes de trésorerie, la revue des comptes clients et fournisseurs, la prise en compte des éléments de paie et des déclarations fiscales et sociales disponibles, les écritures de rattachement nécessaires à la période, les dotations aux amortissements calculées à la date d’arrêté, la prise en compte des stocks, provisions et estimations communiqués par la direction, et une revue de cohérence générale des principaux postes significatifs.

La situation comptable intermédiaire **ne constitue pas des comptes annuels**. Les montants reposant sur des inventaires, estimations, provisions, travaux en cours ou autres données établies par la direction sont retenus à partir des seules informations communiquées.

Une situation réalisée dans un délai court peut ne pas intégrer certains ajustements qui seraient effectués lors de l’arrêté annuel des comptes. Le document est établi pour la finalité indiquée ci-dessus : sa communication à un tiers doit tenir compte de ces limites.`,
    execution:`Notre mission sera exécutée sous la direction de {{mission.signataire}}, expert-comptable, qui pourra se faire assister en cas de besoin par d’autres intervenants du cabinet.

{{mission.planning}}

Nous comptons sur votre coopération pour nous communiquer les informations et documents nécessaires à la bonne exécution de notre mission, à savoir notamment :

{{mission.documents}}

À l’issue de nos travaux, nous remettrons un **bilan intermédiaire**, un **compte de résultat intermédiaire** et les états ou commentaires de synthèse convenus. **Aucun rapport d’assurance ni aucune attestation de présentation des comptes n’est émis** au titre de cette mission.`,
    assurance:""
  },
  CARBONE:{
    t:"mission d’accompagnement à l’évaluation de l’empreinte carbone",
    norme:"Mission sans assurance — activité accessoire au sens des articles 2 et 22 de l’ordonnance n° 45-2138 du 19 septembre 1945",
    intro:`{{client.civilite}} {{client.contact}},

Nous vous remercions de la confiance que vous nous témoignez en envisageant de nous confier une **mission d’accompagnement à l’évaluation de l’empreinte carbone de votre entité**, portant sur l’exercice ou la période de référence {{carbone.periode}}.

{{carbone.contexte}}

La présente lettre de mission reprend les termes de nos échanges et définit nos obligations respectives.`,
    cadre:`La mission sera réalisée conformément au **Code de déontologie des professionnels de l’expertise comptable**, au **cadre de référence des missions du professionnel de l’expertise comptable** et aux normes professionnelles d’application générale, notamment la **NPMQ** et la **NPLAB**.

Elle relève des **activités accessoires** que le professionnel de l’expertise comptable peut exercer en application des **articles 2 et 22 de l’ordonnance n° 45-2138 du 19 septembre 1945** et de la **norme professionnelle relative aux activités accessoires** : elle ne constitue pas son activité principale et s’inscrit dans le prolongement des travaux comptables qui nous sont confiés.

Il s’agit d’une **mission sans assurance**. Elle ne constitue ni un audit, ni un examen limité, ni une mission de présentation des comptes, et **n’aboutit à l’expression d’aucune assurance** sur les données d’émission restituées.`,
    p:`La mission a pour objet de vous accompagner dans l’**évaluation des émissions de gaz à effet de serre** de votre entité sur la période de référence retenue, à partir de vos données comptables et de vos données d’activité.

Les émissions sont converties en équivalent CO₂ par application de **facteurs d’émission publics**, {{carbone.facteurs}}. Le périmètre retenu est celui décrit à l’article « Périmètre et méthode retenus ».

**Il s’agit d’une démarche volontaire.** Elle ne vaut pas établissement du bilan d’émissions de gaz à effet de serre prévu à l’**article L. 229-25 du code de l’environnement**, qui ne s’impose qu’aux personnes morales de droit privé employant plus de cinq cents personnes en métropole (plus de deux cent cinquante dans les régions et départements d’outre-mer) et obéit à ses propres règles de contenu, de périodicité et de publication. Elle ne constitue pas davantage une **vérification par un organisme tiers indépendant**.

Le client demeure responsable de ses décisions de gestion, du choix du périmètre, ainsi que de la fiabilité, de l’exhaustivité et de l’exactitude des informations transmises au cabinet.`,
    limites:`**La nature des travaux.** Nos travaux comporteront notamment :

- la définition avec vous du périmètre organisationnel et de la période de référence ;
- la collecte des données d’activité et des données comptables utiles (énergie, déplacements, achats, fret, immobilisations, déchets, selon le périmètre retenu) ;
- l’affectation de ces données aux postes d’émission et le choix des facteurs d’émission correspondants ;
- le calcul des émissions et leur restitution par poste et par périmètre ;
- l’identification des postes les plus contributeurs et, le cas échéant, la formalisation de pistes d’action ;
- la remise d’un rapport de restitution et sa présentation à la direction.

**Les limites des travaux.** Une évaluation d’empreinte carbone repose sur des **données d’activité fournies par l’entité** et sur des **facteurs d’émission moyens**, par nature approximatifs. Les résultats constituent un **ordre de grandeur destiné au pilotage**, non une mesure physique des émissions ; ils ne sauraient être présentés comme certifiés.

Lorsque certaines données ne sont pas disponibles, nous recourons à des **estimations ou à des ratios monétaires** dont la source et la portée sont indiquées dans le rapport. Les postes exclus du périmètre y sont également mentionnés.

Nous sommes tenus à une **simple obligation de moyens**. Nous ne procéderons à aucun contrôle de la régularité ou de la sincérité des données communiquées, ni à aucune vérification sur site. La mission n’emporte **aucune garantie de conformité** à une réglementation, à un référentiel de reporting de durabilité, à un label ou à un cahier des charges de donneur d’ordre, sauf mission distincte expressément convenue.

Toute communication externe des résultats relève de votre seule responsabilité et doit reproduire le périmètre, la méthode et les limites énoncés dans notre rapport. Nous appelons votre attention sur l’encadrement des **allégations environnementales** en matière de pratiques commerciales.`,
    execution:`Notre mission sera exécutée sous la direction de {{mission.signataire}}, expert-comptable, qui pourra se faire assister en cas de besoin par d’autres intervenants du cabinet.

{{mission.planning}}

Nous comptons sur votre coopération et sur celle de vos équipes pour nous communiquer les informations et documents nécessaires à la bonne exécution de notre mission, à savoir notamment :

{{mission.documents}}

À l’issue de nos travaux, nous remettrons un **rapport de restitution** présentant le périmètre retenu, la méthode et les facteurs d’émission utilisés, les résultats par poste, les principales incertitudes et les postes exclus. **Aucun rapport d’assurance n’est émis** au titre de cette mission.`,
    assurance:""
  }
};
for(const k of Object.keys(NATURE_MISSIONS_PONCTUELLES)){
  const n=NATURE_MISSIONS_PONCTUELLES[k];
  n.assurance=n.p;
  NATURE[k]=n;
}

/* Libellés du sélecteur « Nature de la mission » (onglet Devis et lettre). */
const NATURE_OPTIONS = [
  ["NP2300","Présentation des comptes annuels — NP 2300"],
  ["NP2400","Examen limité des comptes annuels — NP 2400"],
  ["NP3400","Examen d’informations financières prévisionnelles — NP 3400"],
  ["EVAL","Évaluation d’une entité ou de ses titres — sans assurance"],
  ["SITUATION","Situation comptable intermédiaire — sans assurance"],
  ["CARBONE","Empreinte carbone — accompagnement sans assurance"],
  ["TENUE","Tenue et travaux comptables — sans assurance"]
];

/* =====================================================================
   Articles communs aux trois missions ponctuelles.
   Les conditions générales (cg1…cg11) sont reprises de la trame SERRE :
   elles sont génériques et s'appliquent à toute mission contractuelle.
   ===================================================================== */
const LM_CG_ART = () => JSON.parse(JSON.stringify(LM_ART.filter(a=>/^cg\d+$/i.test(a.id||""))));

const ART_PONCTUEL_COMMUN = [
  { id:"duree", titre:"Durée de la mission", corps:
`La mission est **ponctuelle**.

Elle débutera dès que vous aurez signé la présente lettre de mission et que nous aurons recueilli les documents nécessaires, en particulier ceux prévus au paragraphe 4 des conditions générales figurant en annexe.

{{mission.delai}}

{{mission.fin}}` },
  { id:"nature", titre:"Nature et objectif de la mission", corps:`{{mission.assurance}}` },
  { id:"limites", titre:"Nature et limites des travaux à mettre en œuvre", corps:`{{mission.limites}}` },
  { id:"complementaires", titre:"Prestations complémentaires", corps:
`Les prestations suivantes viennent s’ajouter à notre mission :

{{mission.complementaires}}

{{mission.exceptionnelles}}` },
  { id:"execution", titre:"Exécution et déroulement de la mission", corps:`{{mission.execution}}` },
  { id:"relationnelles", titre:"Modalités relationnelles", corps:
`Nos relations seront réglées sur le plan juridique tant par les termes de la présente lettre que par les conditions générales jointes (annexe 1){{mission.annexe2}}.

Tout aménagement devant éventuellement être apporté à la mission définie ci-dessus sera préalablement arrêté d’un commun accord et formalisé lorsque sa nature le requiert.` },
  { id:"identification", titre:"Obligations d’identification et LCB-FT", corps:`{{mission.identification}}` },
  { id:"honoraires", titre:"Honoraires", corps:
`{{honoraires.clause}}

{{honoraires.recap}}` },
  { id:"modalites", titre:"Modalités de facturation et de règlement", corps:`{{section.modalites}}` },
  { id:"modifs", titre:"Modifications apportées aux conditions générales", corps:
`Les parties, après en avoir discuté, sont convenues de n’apporter aucune dérogation aux conditions générales, sauf mention expresse portée dans la présente lettre ou dans une annexe signée par les parties.` },
  { id:"conclusion", titre:"Conclusion", corps:
`Nous vous serions obligés de bien vouloir nous retourner un exemplaire de la présente lettre et des annexes jointes, dont les conditions générales qui font partie intégrante de la lettre de mission, revêtues de votre signature, attestant de votre prise de connaissance et de votre acceptation de la mission, de ses conditions générales et de ses annexes.

Nous vous prions de croire, {{client.civilite}} {{client.contact}}, en l’expression de nos salutations distinguées.` }
];

const ART_ANNEXE_OBLIGATIONS = { id:"annexe", titre:"Annexe 2 — Tableau de répartition des obligations respectives", pageBreak:true, corps:
`*Nota : ce tableau précise la répartition opérationnelle des travaux entre le cabinet et le client. Il doit être adapté au périmètre effectivement convenu.*

{{annexe.obligations}}` };

function artPonctuels(entite, mission, extra=[]){
  return [entite, mission, ...JSON.parse(JSON.stringify(ART_PONCTUEL_COMMUN)), ...extra, ART_ANNEXE_OBLIGATIONS, ...LM_CG_ART()];
}

/* --------------------------------------------------- PRÉVISIONNEL (NP 3400) */
const LM_ART_PREVI = () => artPonctuels(
  { id:"entite", titre:"1. Votre entité", corps:
`Nous avons repris ci-dessous les caractéristiques actualisées de votre entité, telles qu’elles ressortent de nos échanges.

{{section.presentation}}

{{section.entite_previ}}` },
  { id:"mission", titre:"2. Notre mission", corps:
`{{mission.cadre}}

**Référentiel comptable retenu :** {{mission.referentiel}}

{{section.projet_previ}}` }
);

/* ------------------------------------------------------------ ÉVALUATION */
const LM_ART_EVAL = () => artPonctuels(
  { id:"entite", titre:"1. Votre entité", corps:
`Nous avons repris ci-dessous les caractéristiques actualisées de l’entité concernée par l’évaluation, telles qu’elles ressortent des documents consultés et des informations communiquées par la direction.

{{section.presentation}}

{{section.entite_eval}}` },
  { id:"mission", titre:"2. Notre mission", corps:
`Notre mission consistera à évaluer {{eval.objet}}.

{{mission.cadre}}

**Référentiel comptable de l’entité évaluée :** {{mission.referentiel}}` },
  [{ id:"projet", titre:"Périmètre et méthodologie retenus", corps:`{{section.projet_eval}}` }]
);

/* ------------------------------------ SITUATION COMPTABLE INTERMÉDIAIRE */
const LM_ART_SITU = () => artPonctuels(
  { id:"entite", titre:"1. Votre entité", corps:
`Nous avons repris ci-dessous les éléments essentiels concernant votre entité et la période couverte par la situation.

{{section.presentation}}

{{section.entite_situ}}` },
  { id:"mission", titre:"2. Notre mission", corps:
`{{mission.cadre}}

**Référentiel comptable retenu :** {{mission.referentiel}}` },
  [{ id:"perimetre", titre:"Périmètre des travaux", corps:`{{section.perimetre_situ}}` }]
);


/* ----------------------------------------------- EMPREINTE CARBONE (volontaire) */
const LM_ART_CARBONE = () => artPonctuels(
  { id:"entite", titre:"1. Votre entité", corps:
`Nous avons repris ci-dessous les caractéristiques de votre entité et le périmètre organisationnel concerné par l’évaluation.

{{section.presentation}}

{{section.entite_carbone}}` },
  { id:"mission", titre:"2. Notre mission", corps:
`{{mission.cadre}}

**Référentiel comptable de l’entité :** {{mission.referentiel}}` },
  [{ id:"perimetre", titre:"Périmètre et méthode retenus", corps:
`**Périmètre d’émission retenu :** {{carbone.perimetre}}

**Période de référence :** {{carbone.periode}}

{{carbone.exclusions}}

{{section.perimetre_carbone}}` }]
);

/* =====================================================================
   Fabriques de lettres
   ===================================================================== */
function missionLetterDef(nom, version, source, articles, natures, natureDefault){
  return { id:uid(), nom, statut:"publie", sourceVersion:version, sourceLabel:source,
    natures, natureDefault,
    intro:LM_INTRO, mentions:LM_MENTIONS,
    articles:articles.map(a=>({...a,id:a.id||uid(),actif:true})),
    createdAt:nowISO(), modifiedAt:nowISO(), publishedAt:nowISO() };
}

const lettrePrevisionnelDef = (nom="Prévisionnel — examen d’informations financières prévisionnelles (NP 3400)") =>
  missionLetterDef(nom, LM_PREVI_VERSION, LM_PREVI_SOURCE, LM_ART_PREVI(), ["NP3400"], "NP3400");

const lettreEvaluationDef = (nom="Évaluation d’une entité ou de ses titres (OEC 2015)") =>
  missionLetterDef(nom, LM_EVAL_VERSION, LM_EVAL_SOURCE, LM_ART_EVAL(), ["EVAL"], "EVAL");

const lettreSituationDef = (nom="Situation comptable intermédiaire (mission sans assurance)") =>
  missionLetterDef(nom, LM_SITU_VERSION, LM_SITU_SOURCE, LM_ART_SITU(), ["SITUATION","TENUE"], "SITUATION");

const lettreEmpreinteCarboneDef = (nom="Empreinte carbone — accompagnement volontaire (mission sans assurance)") =>
  missionLetterDef(nom, LM_CARBONE_VERSION, LM_CARBONE_SOURCE, LM_ART_CARBONE(), ["CARBONE"], "CARBONE");

const MISSION_LETTER_DEFS = [
  {version:LM_PREVI_VERSION, def:lettrePrevisionnelDef, key:"previsionnel"},
  {version:LM_EVAL_VERSION,  def:lettreEvaluationDef,   key:"evaluation"},
  {version:LM_SITU_VERSION,  def:lettreSituationDef,    key:"situation"},
  {version:LM_CARBONE_VERSION, def:lettreEmpreinteCarboneDef, key:"carbone"}
];

/* =====================================================================
   Natures autorisées par lettre
   ---------------------------------------------------------------------
   Une lettre peut restreindre les natures de mission proposées dans
   l'onglet « Devis et lettre de mission ». À défaut (trame BIC historique),
   toutes les natures comptables restent disponibles.
   ===================================================================== */
const NATURES_COMPTABLES = ["NP2300","NP2400","TENUE"];
/* Natures de mission ponctuelles : pas de durée d’exercice, pas de tacite
   reconduction, pas de préavis. Une seule liste, pour que l’ajout d’une
   trame ponctuelle n’oublie aucun des endroits qui la consultent. */
const NATURES_PONCTUELLES = ["NP3400","EVAL","SITUATION","CARBONE"];
const estNaturePonctuelle = k => NATURES_PONCTUELLES.includes(k);

function letterNatures(L){
  const a=(L&&Array.isArray(L.natures)&&L.natures.length)?L.natures:NATURES_COMPTABLES;
  return a.filter(k=>NATURE[k]);
}
function letterNatureDefault(L){
  const a=letterNatures(L);
  const d=L&&L.natureDefault;
  return (d&&a.includes(d))?d:a[0];
}
/* Nature effectivement applicable au dossier : si la lettre rattachée ne
   propose pas la nature enregistrée, on retombe sur sa nature par défaut.
   Le dossier figé conserve toujours la nature figée. */
function natureKeyOf(d){
  const k=d?.nature||"NP2300";
  if(d?.frozenDocs?.lm) return NATURE[k]?k:"NP2300";
  const L=(typeof lettreOf==="function")?lettreOf(d):null;
  if(!L) return NATURE[k]?k:"NP2300";
  const allowed=letterNatures(L);
  return allowed.includes(k)?k:letterNatureDefault(L);
}
function natureOf(d){ return NATURE[natureKeyOf(d)]||NATURE.NP2300; }
