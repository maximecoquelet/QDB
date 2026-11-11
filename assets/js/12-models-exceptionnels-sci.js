/* =====================================================================
   MODÈLES CABINET — MISSIONS COMPTABLES EXCEPTIONNELLES & SCI
   - Évaluation : trame issue de Eval.pdf fourni par le cabinet.
   - Prévisionnel : trame issue de Prévi.pdf fourni par le cabinet.
   - Situation comptable intermédiaire : trame développée pour SERRE à partir
     des besoins usuels d'une situation intermédiaire, sans tarif inventé.
   - SCI : fusion des paramétrages SCI IR.pdf et SCI IS.pdf. Les montants
     récurrents issus des sources mensuelles sont annualisés dans SERRE.
   ===================================================================== */
const MODEL_EXC_ACCOUNTING_VERSION="serre-exceptionnelles-compta-2026-09-14-v2-lm";
const MODEL_EXC_ACCOUNTING_LEGACY=["serre-exceptionnelles-compta-2026-08-29-v1"];
const MODEL_SCI_VERSION="serre-sci-ir-is-2026-08-29-v2-pennylane-annuel";
const MODEL_CARBONE_VERSION="serre-empreinte-carbone-2026-11-09-v1";

function withN(r,n){ r.n=n; return r; }
function condSec(titre,tag,items,showIf){ return Object.assign(SEC(titre,tag,items),{showIf}); }

function modeleMissionsComptablesExceptionnelles(){
  const previ=withN(R("Prévisionnel financier",1500),1);
  previ.clientLabel="Examen d'informations financières prévisionnelles";
  const evalr=withN(R("Évaluation de l'entité ou de ses titres",2250),2);
  evalr.clientLabel="Évaluation de l'entité ou de ses titres";
  const situation=withN(R("Situation comptable intermédiaire",0),3);
  situation.clientLabel="Établissement d'une situation comptable intermédiaire";

  const cPrevi={cle:"mission_exceptionnelle",n:[1]};
  const cEval={cle:"mission_exceptionnelle",n:[2]};
  const cSituation={cle:"mission_exceptionnelle",n:[3]};

  return {
    id:uid(), titre:"DEVIS — MISSIONS COMPTABLES EXCEPTIONNELLES",
    desc:"Prévisionnel · Évaluation · Situation comptable intermédiaire",
    statut:"publie", cats:["Comptabilité","Gestion"], tva:20, devise:"EUR", per:"ponctuelle", lmId:null,
    sourceVersion:MODEL_EXC_ACCOUNTING_VERSION,
    sourceLabel:"Eval.pdf + Prévi.pdf fournis par le cabinet ; situation intermédiaire développée pour SERRE le 29/08/2026",
    calcSource:"Eval.pdf + Prévi.pdf + trame SERRE situation intermédiaire",
    calcVersion:MODEL_EXC_ACCOUNTING_VERSION,
    /* v47 : la lettre de mission est rattachée dynamiquement selon le type de
       mission retenu (voir `lmRules` plus bas). Les zones à compléter et les
       options de rédaction des trames OEC sont pilotées par le questionnaire. */
    lmRules:[
      {cle:"mission_exceptionnelle",n:[1],lmId:null,ref:"previsionnel"},
      {cle:"mission_exceptionnelle",n:[2],lmId:null,ref:"evaluation"},
      {cle:"mission_exceptionnelle",n:[3],lmId:null,ref:"situation"}
    ],
    sections:[
      SEC("Choix de la mission","Comptabilité",[
        I("Type de mission","liste",{
          cle:"mission_exceptionnelle",per:"ponctuelle",tva:20,prix:true,
          aide:"Prévisionnel : 1 500 € HT · Évaluation : 2 250 € HT · Situation : montant à renseigner. Ce choix détermine automatiquement la lettre de mission rattachée au dossier.",
          requirePositivePrice:true,reponses:[previ,evalr,situation]
        })
      ]),

      condSec("Votre entité — Prévisionnel","Présentation",[
        I("Activité principale","texte",{cle:"previ_activite",prix:false}),
        I("Exercice social / date de clôture","texte",{cle:"previ_cloture",prix:false}),
        I("Chiffre d'affaires annuel / objectif de chiffre d'affaires","texte",{cle:"previ_ca",prix:false}),
        I("Effectif actuel ou prévisionnel","nombre",{cle:"previ_effectif",prix:false}),
        I("Organisation de l'entité","texte",{cle:"previ_organisation",prix:false,aide:"Organisation administrative et comptable, moyens matériels et humains."}),
        I("Période concernée","texte",{cle:"previ_periode",prix:false,aide:"Période couverte par les informations prévisionnelles, à saisir sans article car elle s'insère après le mot « période ». Ex. « 2027 à 2029 » ou « du 01/01/2027 au 31/12/2029 »."})
      ],cPrevi),

      /* v47 — zones à compléter et options de rédaction de la trame OEC
         « Mission d'examen d'informations financières prévisionnelles »
         (CNP 03/05/2012, revu 27/09/2016) — norme NP 3400. */
      condSec("Lettre de mission — Prévisionnel (NP 3400)","Présentation",[
        I("Objet de l'examen","liste",{cle:"previ_objet",prix:false,aide:"Choix de rédaction prévu par la trame OEC. Détermine la formulation retenue dans le préambule et dans le paragraphe « livrable ».",reponses:[
          withN(R("Des prévisions budgétaires",0),0),
          withN(R("D'une projection d'informations financières",0),1)
        ]}),
        I("Contexte de la mission","texte",{cle:"previ_contexte",prix:false,aide:"« Cette mission s'inscrit dans le contexte suivant… ». Ex. demande de financement bancaire, entrée d'un investisseur, plan de reprise."}),
        I("Destinataires des informations prévisionnelles","texte",{cle:"previ_destinataires",prix:false,aide:"Personnes ou organismes auxquels les prévisions sont destinées (banque, investisseur, associés…). Zone obligatoire de la trame OEC."}),
        I("Référence de la note d'hypothèses","texte",{cle:"previ_note_hypotheses",prix:false,aide:"Référence du document dans lequel figurent les hypothèses retenues (la trame OEC parle de la « Note X »). Laisser vide si non applicable."}),
        I("Assistance à l'établissement des informations prévisionnelles","ouinon",{cle:"previ_assistance",prix:false,aide:"Prestation complémentaire prévue au § 2.3 de la trame OEC : le cabinet assiste l'entité dans l'élaboration des prévisions qu'il examine ensuite.",reponses:[
          withN(R("Non — les prévisions sont établies par le client",0),0),
          withN(R("Oui — assistance à l'établissement des informations soumises à examen",0),1)
        ]})
      ],cPrevi),
      condSec("Votre projet — Prévisionnel","Présentation",[
        I("Le contexte du projet","paragraphe",{prix:false,html:
`Décrivez ici le projet du client : activité envisagée ou évolution de l'activité existante, implantation, modèle économique, principales sources de revenus, niveau d'investissement, hypothèses commerciales, moyens humains et besoin de financement.

Ce texte est volontairement éditable dossier par dossier afin de reprendre précisément les informations communiquées par le client.`}),
        I("Objet et contenu de la mission","paragraphe",{prix:false,html:
`La mission demandée consiste à établir un **prévisionnel financier** permettant d'apprécier la faisabilité économique du projet, de structurer les hypothèses d'exploitation, de déterminer le seuil de rentabilité, d'analyser le besoin de financement et de préparer les éléments nécessaires à la présentation du dossier auprès des partenaires bancaires et financiers.

Le prévisionnel aura notamment pour objet de formaliser les hypothèses économiques du projet, de les fiabiliser puis de les traduire en données financières cohérentes. Selon les informations disponibles et le périmètre retenu, il comprendra notamment :

- un compte de résultat prévisionnel pluriannuel ;
- un plan de financement initial ;
- un plan de trésorerie ;
- une analyse du besoin en fonds de roulement ;
- une estimation du seuil de rentabilité ;
- une présentation des hypothèses de chiffre d'affaires par activité ;
- une ventilation des charges fixes et variables ;
- une analyse de la masse salariale prévisionnelle ;
- une modélisation des investissements nécessaires ;
- une approche de la capacité d'autofinancement et de remboursement ;
- une synthèse financière destinée aux financeurs.`}),
        I("Accompagnement et livrable","paragraphe",{prix:false,html:
`Le document sera conçu comme un **support de travail évolutif**, susceptible d'être complété et ajusté au fur et à mesure de l'avancement du projet, de la validation des hypothèses commerciales, des devis fournisseurs, des conditions bancaires et des choix juridiques ou fiscaux retenus.

La mission comprend également l'accompagnement dans la préparation et, lorsque cela est convenu, dans la présentation du dossier auprès des banques, partenaires financiers, futurs associés ou investisseurs. Le livrable a vocation à constituer un outil d'aide à la décision et de négociation.`}),
        I("Nature et limites du prévisionnel","paragraphe",{prix:false,html:
`Les informations financières prévisionnelles sont établies à partir des hypothèses, données et estimations communiquées par le client. Elles sont par nature incertaines : les réalisations futures pourront différer, parfois sensiblement, des données prévisionnelles.

Le cabinet ne garantit ni la réalisation des hypothèses retenues, ni l'obtention d'un financement. Toute modification substantielle du projet ou des hypothèses peut nécessiter une actualisation du prévisionnel.`}),
        I("Documents et informations nécessaires","paragraphe",{prix:false,html:
`À adapter au projet : hypothèses de chiffre d'affaires, tarifs et volumes, devis d'investissement, plan de financement envisagé, loyers et charges, masse salariale, conditions d'emprunt, apports, contrats ou projets de contrats significatifs et toute information nécessaire à la modélisation financière.`})
      ],cPrevi),

      condSec("Données de l'entité — Évaluation","Présentation",[
        I("Activité principale","texte",{cle:"eval_activite",prix:false}),
        I("Exercice social / date de clôture","texte",{cle:"eval_cloture",prix:false}),
        I("Chiffre d'affaires","texte",{cle:"eval_ca",prix:false}),
        I("Effectif","nombre",{cle:"eval_effectif",prix:false}),
        I("Principales implantations","paragraphe",{prix:false,html:""}),
        I("Éléments clés de l'organisation comptable et des systèmes d'information","paragraphe",{prix:false,html:
`Précisez notamment qui tient la comptabilité, la nature de la mission comptable existante et les principales modalités de transmission des pièces et informations.`})
      ],cEval),
      /* v47 — options de rédaction de la trame OEC « Mission d'évaluation
         d'une entité ou de ses titres » (CNP 14/10/2015, revu 27/09/2016). */
      condSec("Lettre de mission — Évaluation","Présentation",[
        I("Objet de l'évaluation","liste",{cle:"eval_perimetre",prix:false,aide:"Premier choix de rédaction de la trame OEC : l'évaluation porte-t-elle sur l'entité du client ou sur une entité cible ? Ce choix adapte toute la lettre.",reponses:[
          withN(R("Votre entité",0),0),
          withN(R("Les titres de votre entité",0),1),
          withN(R("Une entité cible",0),2),
          withN(R("Les titres d'une entité cible",0),3)
        ]}),
        I("Situation du cabinet vis-à-vis de l'entité évaluée","liste",{cle:"eval_mission_compta",prix:false,aide:"Second choix de rédaction de la trame OEC. La dernière option déclenche la mention de l'information du confrère prévue à l'article 161 du Code de déontologie.",reponses:[
          withN(R("Nouveau client — aucune mission comptable en cours",0),0),
          withN(R("Le cabinet réalise déjà une mission comptable pour l'entité",0),1),
          withN(R("Un autre expert-comptable réalise la mission comptable (art. 161 — information du confrère)",0),2)
        ]}),
        I("Mission comptable existante — nature et date de la lettre de mission","texte",{cle:"eval_mission_ref",prix:false,aide:"Ex. mission de présentation des comptes définie dans notre lettre de mission du 12/03/2024. Utilisé uniquement si le cabinet réalise déjà une mission comptable."}),
        I("Nom du confrère ou de la consœur à informer","texte",{cle:"eval_confrere_nom",prix:false,aide:"Article 161 du Code de déontologie. Utilisé uniquement si un autre expert-comptable réalise la mission comptable."}),
        I("Échanges avec les responsables de l'entité cible","ouinon",{cle:"eval_cible_echanges",prix:false,aide:"Paragraphe optionnel de la trame OEC, applicable lorsque l'évaluation porte sur une entité cible.",reponses:[
          withN(R("Non prévus",0),0),
          withN(R("Oui — avec votre accord, pour compléter les informations nécessaires",0),1)
        ]}),
        I("Diligences complémentaires sur les données comptables","ouinon",{cle:"eval_diligences_compta",prix:false,aide:"Prévu par la trame OEC lorsque les comptes de l'entité évaluée ne font l'objet d'aucune mission d'assurance : le cabinet peut compléter ses diligences pour obtenir un confort sur les données comptables.",reponses:[
          withN(R("Non — les comptes font l'objet d'une mission d'assurance ou de présentation",0),0),
          withN(R("Oui — diligences spécifiques de confort sur les données comptables",0),1)
        ]}),
        I("Revue des événements postérieurs à la clôture","ouinon",{cle:"eval_post_cloture",prix:false,aide:"Paragraphe optionnel de la trame OEC, pertinent lorsqu'un délai significatif sépare l'arrêté des comptes de la date d'évaluation.",reponses:[
          withN(R("Non prévue",0),0),
          withN(R("Oui — entretiens sur les événements postérieurs et revue des estimations",0),1)
        ]})
      ],cEval),
      condSec("Votre projet — Évaluation","Présentation",[
        I("Contexte de la mission","liste",{cle:"eval_contexte",prix:false,aide:"Contextes prévus par la trame OEC. Le libellé retenu est repris dans le corps de la lettre de mission.",reponses:[
          R("Opération de transmission — cession",0),
          R("Opération de transmission — acquisition",0),
          R("Entrée ou sortie d'associé",0),
          R("Application d'un pacte d'associés ou d'actionnaires",0),
          R("Restructuration interne au groupe — apport partiel d'actif, scission, fusion",0),
          R("Rapprochement d'entreprises — prise de participation",0),
          R("Réorganisation patrimoniale ou familiale",0),
          R("Détermination d'une valeur au regard d'une obligation déclarative",0),
          R("Litige ou contentieux",0),
          R("Corroboration d'une valeur d'assurance",0),
          R("Introduction en bourse",0),
          R("Autre contexte",0)
        ]}),
        I("Informations complémentaires","paragraphe",{cle:"eval_infos",prix:false,html:""}),
        I("Objet et périmètre de la mission","paragraphe",{prix:false,html:
`La mission a pour objet de déterminer une **fourchette de valeur de l'entité ou de ses titres**, dans le contexte indiqué ci-dessus.

Précisez ici le périmètre exact de l'évaluation : pourcentage du capital concerné, hypothèse de continuité d'exploitation, nature des titres, éventuelles particularités de l'opération et date de référence retenue.`}),
        I("Date de référence de l'évaluation","texte",{cle:"eval_date_ref",prix:false,aide:"Date à laquelle la valeur est appréciée. Reprise automatiquement dans le préambule de la lettre de mission."}),
        I("Base documentaire de l'évaluation","paragraphe",{prix:false,html:
`Sauf adaptation du dossier, l'évaluation est établie principalement à partir des données financières disponibles des **trois derniers exercices** : comptes annuels, liasses fiscales, balances générales définitives et grands livres correspondants.

Les informations extracomptables nécessaires aux retraitements ne pourront être prises en compte que si elles sont communiquées et documentées par le client.`}),
        I("Travaux réalisés","paragraphe",{prix:false,html:
`Les travaux pourront notamment consister en :

- l'analyse de l'évolution du chiffre d'affaires, des marges, des charges d'exploitation, de l'excédent brut d'exploitation et du résultat courant sur les exercices étudiés ;
- l'analyse de la structure du bilan : immobilisations, stocks, besoin en fonds de roulement, endettement financier, comptes courants d'associés, capitaux propres et trésorerie nette ;
- le calcul des principaux ratios de rentabilité, de structure et de rotation et, lorsque des données pertinentes sont accessibles, leur rapprochement avec des références sectorielles ;
- les retraitements de normalisation réalisables à partir des données disponibles : éléments exceptionnels, crédit-bail, éléments hors exploitation et autres éléments documentés ;
- une approche patrimoniale et une ou plusieurs approches de rentabilité adaptées à l'entité et aux informations disponibles ;
- le passage, le cas échéant, de la valeur d'entreprise à la valeur des titres après prise en compte de la dette financière nette et du traitement retenu pour les comptes courants d'associés.

Une méthode reposant sur l'actualisation de flux futurs ne sera mise en œuvre que si des données prospectives suffisamment documentées sont intégrées au périmètre convenu.`}),
        I("Livrable","paragraphe",{prix:false,html:
`La mission donnera lieu à la remise d'un **rapport écrit** exposant l'analyse financière réalisée, les retraitements opérés, les méthodes retenues, les hypothèses et paramètres appliqués, ainsi que la fourchette de valeur qui en résulte et les principales limites de l'analyse.`}),
        I("Nature et limites de la mission d'évaluation","paragraphe",{prix:false,html:
`La mission ne comporte l'expression d'**aucune assurance sur les comptes**. Elle ne constitue ni un audit, ni un examen limité, ni un audit d'acquisition. Les informations comptables utilisées sont prises comme base de travail dans les limites du périmètre convenu.

La fourchette de valeur communiquée constitue une **référence financière à une date donnée et non un prix de transaction**. Elle peut être sensiblement affectée par des éléments extracomptables ou par des informations non portées à la connaissance du cabinet.

Le rapport est établi pour la finalité convenue avec le client. Toute utilisation par un tiers ou pour une finalité différente doit faire l'objet d'un accord préalable du cabinet.

Sont notamment exclus, sauf convention distincte : audit d'acquisition, diligences juridiques, assistance à la négociation, recherche de repreneur, structuration juridique ou fiscale de l'opération, calcul de plus-value et droits d'enregistrement.`}),
        I("Documents nécessaires à la mise en œuvre de la mission","paragraphe",{prix:false,html:
`À adapter au dossier : liasses fiscales complètes des exercices étudiés, comptes annuels, balances générales définitives, grands livres, tableaux d'amortissement, détail des dettes financières, comptes courants d'associés et toute information utile aux retraitements ou à l'appréciation des éléments hors exploitation.`})
      ],cEval),

      condSec("Votre entité — Situation comptable intermédiaire","Présentation",[
        I("Activité principale","texte",{cle:"situation_activite",prix:false}),
        I("Date d'arrêté de la situation","texte",{cle:"situation_date",prix:false,aide:"Reprise automatiquement dans le préambule de la lettre de mission."}),
        I("Période couverte","texte",{cle:"situation_periode",prix:false}),
        I("Finalité de la situation","liste",{cle:"situation_finalite",prix:false,aide:"Le libellé retenu est repris dans le corps de la lettre de mission.",reponses:[
          R("Pilotage interne",0),R("Présentation à une banque ou un financeur",0),
          R("Information des associés ou investisseurs",0),R("Préparation d'une décision de gestion",0),R("Autre finalité",0)
        ]})
      ],cSituation),
      condSec("Situation comptable intermédiaire — Périmètre","Comptabilité",[
        I("Contexte et objectif","paragraphe",{prix:false,html:
`La mission a pour objet d'établir une **situation comptable intermédiaire** à la date indiquée, à partir de la comptabilité disponible et des informations communiquées par l'entité.

Cette situation est destinée à fournir une image financière intermédiaire utile au pilotage de l'activité et à la finalité précisée dans le devis. Le niveau de détail des travaux est adapté à l'objectif poursuivi, au délai disponible et à la qualité des informations transmises.`}),
        I("Travaux prévus","paragraphe",{prix:false,html:
`Les travaux pourront notamment comprendre, selon leur pertinence au dossier :

- l'enregistrement ou la prise en compte des pièces comptables disponibles jusqu'à la date d'arrêté ;
- le rapprochement des principaux comptes de trésorerie ;
- la revue des comptes clients et fournisseurs et des principales opérations en attente ;
- la prise en compte des éléments de paie, déclarations fiscales et sociales disponibles ;
- les écritures de rattachement nécessaires à la période : charges et produits constatés d'avance, factures à recevoir ou à établir et autres éléments de cut-off communiqués ;
- les dotations aux amortissements calculées à la date d'arrêté ;
- la prise en compte des stocks, provisions, engagements ou estimations lorsque les informations nécessaires sont fournies par la direction ;
- une revue de cohérence générale des principaux postes significatifs.

Les travaux effectivement réalisés sont déterminés en fonction des informations disponibles et de la finalité de la situation.`}),
        I("Livrables","paragraphe",{prix:false,html:
`Le livrable comprendra, selon le périmètre retenu, un **bilan intermédiaire**, un **compte de résultat intermédiaire** et les états ou commentaires de synthèse convenus avec le client. Une comparaison avec l'exercice précédent ou le budget pourra être ajoutée lorsque les données correspondantes sont disponibles.`}),
        I("Nature et limites de la situation","paragraphe",{prix:false,html:
`La situation comptable intermédiaire ne constitue pas des comptes annuels et n'emporte **aucune assurance** de la part du cabinet. Elle ne constitue ni un audit ni un examen limité, sauf mission distincte expressément convenue.

Les montants reposant sur des inventaires, estimations, provisions, travaux en cours, stocks ou autres données établies par la direction sont retenus à partir des informations communiquées. Une situation réalisée dans un délai court peut ne pas intégrer certains ajustements qui seraient effectués lors de la clôture annuelle.

Le document est établi pour la finalité indiquée dans le devis. Sa communication à un tiers doit tenir compte de ces limites.`}),
        I("Documents et informations nécessaires","paragraphe",{prix:false,html:
`À adapter au dossier : pièces comptables à jour, relevés bancaires, factures clients et fournisseurs, état des encaissements et décaissements, éléments de paie et charges sociales, déclarations fiscales, échéanciers d'emprunts, état des immobilisations, stocks et travaux en cours, informations sur les provisions, charges à payer, produits à recevoir et tout événement significatif intervenu sur la période.`})
      ],cSituation),

      /* v47 — zones à compléter communes aux trois trames OEC : délai,
         planning d'intervention, documents attendus, obligations
         d'identification, annexe 2 et modalités d'honoraires. */
      SEC("Lettre de mission — exécution et honoraires","Présentation",[
        I("Délai de réalisation","texte",{cle:"lm_delai",prix:false,aide:"Zone « … sera réalisée dans un délai maximal de (xx jours) » de la trame OEC. Ex. 30 jours, 6 semaines. Laisser vide pour ne pas engager de délai."}),
        I("Fin de la mission","liste",{cle:"lm_fin",prix:false,aide:"Choix de rédaction de la trame OEC pour la clause de terme de la mission.",reponses:[
          withN(R("À l'émission de notre rapport de mission",0),0),
          withN(R("À l'émission de notre compte rendu de mission",0),1)
        ]}),
        I("Planning d'intervention","paragraphe",{cle:"lm_planning",prix:false,html:"",
          aide:"Zone « (Détailler les dates ou périodes d'intervention ainsi que la nature des travaux…) » de la trame OEC. Laisser vide si le planning n'est pas arrêté à la signature : une formule de repli est alors insérée."}),
        I("Informations et documents nécessaires","paragraphe",{cle:"lm_documents",prix:false,html:"",
          aide:"Zone « (Lister la nature des informations et des documents nécessaires à la mise en œuvre de la mission) » de la trame OEC."}),
        I("Prestations complémentaires","paragraphe",{cle:"lm_complementaires",prix:false,html:"",
          aide:"Prestations venant s'ajouter à la mission. Laisser vide s'il n'y en a pas : l'article disparaît alors de la lettre."}),
        I("Éléments d'identification LCB-FT","liste",{cle:"lm_identification",prix:false,aide:"La trame OEC prévoit que le paragraphe « Obligations d'identification » n'est intégré que si les éléments requis ne sont pas encore en possession du cabinet.",reponses:[
          withN(R("Déjà obtenus — paragraphe non intégré",0),0),
          withN(R("Non encore obtenus — condition suspensive à la mise en œuvre",0),1),
          withN(R("Non encore obtenus — condition résolutoire à la mise en œuvre",0),2)
        ]}),
        I("Annexe 2 — tableau de répartition des obligations","ouinon",{cle:"lm_annexe2",prix:false,aide:"Annexe facultative prévue par les trames OEC (« le cas échéant »).",reponses:[
          withN(R("Non jointe",0),0),
          withN(R("Jointe à la lettre de mission",0),1)
        ]}),
        I("Modalité d'honoraires","liste",{cle:"lm_honoraires_mode",prix:false,aide:"Les deux options de rédaction prévues par les trames OEC. Le montant, lui, reste celui retenu au devis et librement ajustable.",reponses:[
          withN(R("Forfait",0),0),
          withN(R("Temps passé",0),1)
        ]}),
        I("Taux horaires appliqués","paragraphe",{cle:"lm_taux_horaires",prix:false,html:
`- Expert-comptable : … € HT / heure
- Chef de mission : … € HT / heure
- Collaborateur : … € HT / heure`}),
        I("Temps estimé (heures)","texte",{cle:"lm_temps_estime",prix:false,aide:"Utilisé uniquement en mode « temps passé » : « Compte tenu des temps prévus que nous avons estimés à … heures »."}),
        I("Régularisation en cas de dépassement","liste",{cle:"lm_regularisation",prix:false,aide:"Choix de rédaction de la trame OEC : régularisation en cours ou en fin de mission.",reponses:[
          withN(R("En fin de mission",0),0),
          withN(R("En cours de mission",0),1)
        ]})
      ]),

      /* Reprise du titre exact attendu par `lmModalitesHTML`, avec des
         modalités propres à une mission ponctuelle. */
      SEC("Modalités de facturation et de règlement","Présentation",[
        I("Périodicité de facturation","liste",{cle:"periodicite_facturation",prix:false,reponses:[
          R("À la remise du livrable",0),
          R("50 % à la signature, solde à la remise du livrable",0),
          R("À la signature de la lettre de mission",0),
          R("Selon échéancier convenu",0)
        ]}),
        I("Modalité de règlement","liste",{cle:"modalite_reglement",prix:false,reponses:[
          R("Par virement",0),R("Par prélèvement",0),R("Par chèque",0)
        ]}),
        I("Conditions particulières","paragraphe",{prix:false,html:""})
      ])
    ],
    exc:[],deb:[]
  };
}


/* =====================================================================
   MODELE — EMPREINTE CARBONE (démarche volontaire TPE / PME)
   ---------------------------------------------------------------------
   Mission ponctuelle sans assurance, exercée à titre d’activité
   accessoire (articles 2 et 22 de l’ordonnance n° 45-2138 du 19 septembre
   1945). Elle ne vaut pas bilan réglementaire d’émissions de gaz à effet
   de serre au sens de l’article L. 229-25 du code de l’environnement,
   lequel ne vise que les entités de plus de 500 salariés en métropole.

   Choix de dénomination : le modèle parle d’« empreinte carbone » et de
   « bilan d’émissions de gaz à effet de serre ». « Bilan Carbone® » est
   une marque de l’Association pour la transition Bas Carbone, dont
   l’usage suppose formation et licence : le libellé reste modifiable si
   le cabinet obtient cette licence.

   Aucun tarif n’est prérempli : les honoraires sont saisis en prix libre.
   ===================================================================== */
function modeleEmpreinteCarbone(){
  const SCOPES=[
    withN(R("Périmètre 1 et 2 — émissions directes et liées à l’énergie",0),0),
    withN(R("Périmètres 1, 2 et postes significatifs du périmètre 3",0),1),
    withN(R("Périmètres 1, 2 et 3 complet",0),2)
  ];
  SCOPES[0].clientLabel="Émissions directes (périmètre 1) et émissions indirectes liées à l’énergie (périmètre 2)";
  SCOPES[1].clientLabel="Périmètres 1 et 2, complétés des postes significatifs du périmètre 3";
  SCOPES[2].clientLabel="Périmètres 1, 2 et 3, ce dernier dans son intégralité";

  return {
    id:uid(), titre:"DEVIS — EMPREINTE CARBONE",
    desc:"Mission ponctuelle sans assurance — évaluation volontaire des émissions de gaz à effet de serre",
    statut:"publie", cats:["Gestion"], tva:20, devise:"EUR", per:"ponctuelle", lmId:null,
    sourceVersion:MODEL_CARBONE_VERSION,
    sourceLabel:"Trame SERRE — démarche volontaire TPE/PME, hors obligation de l’article L. 229-25 du code de l’environnement",
    calcSource:"Honoraires au forfait, saisis au cas par cas (aucun tarif prérempli)",
    calcVersion:MODEL_CARBONE_VERSION,
    lmRules:[],
    sections:[
      SEC("Mission et honoraires","Gestion",[
        I("Honoraires de la mission","prixlibre",{
          cle:"carbone_honoraires",per:"ponctuelle",tva:20,prix:true,requirePositivePrice:true,
          aide:"Forfait HT de la mission, à saisir dans la colonne de droite. Aucun tarif n’est prérempli : il dépend du périmètre, du nombre de sites et de la disponibilité des données."}),
        I("Remise exceptionnelle","prixlibre",{
          cle:"carbone_remise",per:"ponctuelle",tva:20,prix:true,
          aide:"Facultatif. Saisir un montant négatif : la remise apparaît alors sur le devis, sous le domaine concerné."})
      ]),

      SEC("Votre entité — Empreinte carbone","Présentation",[
        I("Activité principale","texte",{cle:"carbone_activite",prix:false}),
        I("Période de référence","texte",{cle:"carbone_periode",prix:false,
          aide:"Exercice ou année civile sur lequel porte l’évaluation. Repris dans le préambule de la lettre de mission. Ex. « l’exercice clos le 31/12/2026 »."}),
        I("Périmètre organisationnel","texte",{cle:"carbone_organisation",prix:false,
          aide:"Entités, établissements et sites couverts. Ex. « la société et ses deux établissements de Valence et Romans »."}),
        I("Effectif","nombre",{cle:"carbone_effectif",prix:false,
          aide:"Effectif de l’entité. Au-delà de 500 salariés en métropole, l’entité relève du bilan réglementaire de l’article L. 229-25 du code de l’environnement : ce modèle n’est alors pas adapté."}),
        I("Nombre de sites","nombre",{cle:"carbone_sites",prix:false}),
        I("Origine de la demande","liste",{cle:"carbone_contexte",prix:false,
          aide:"Le motif retenu est repris dans le préambule de la lettre de mission.",reponses:[
          withN(R("Démarche volontaire de la direction",0),0),
          withN(R("Demande d’un client ou d’un donneur d’ordre",0),1),
          withN(R("Demande d’un financeur ou d’un assureur",0),2),
          withN(R("Dossier de subvention ou d’aide publique",0),3),
          withN(R("Préparation à un reporting de durabilité",0),4),
          withN(R("Autre motif",0),5)
        ]})
      ]),

      SEC("Empreinte carbone — Périmètre et méthode","Gestion",[
        I("Périmètre d’émission retenu","liste",{cle:"carbone_scopes",prix:false,
          aide:"Repris tel quel dans l’article « Périmètre et méthode retenus » de la lettre de mission.",reponses:SCOPES}),
        I("Postes exclus du périmètre","texte",{cle:"carbone_exclusions",prix:false,
          aide:"Postes volontairement laissés hors évaluation. Laisser vide s’il n’y en a pas : la mention disparaît alors de la lettre."}),
        I("Facteurs d’émission","liste",{cle:"carbone_facteurs",prix:false,
          aide:"Source des facteurs de conversion en équivalent CO₂, citée dans la lettre de mission.",reponses:[
          withN(R("Base Empreinte de l’ADEME",0),0),
          withN(R("Base Empreinte de l’ADEME, complétée de facteurs sectoriels publics",0),1),
          withN(R("Facteurs fournis par l’outil retenu avec le client",0),2)
        ]}),
        I("Contexte et objectif","paragraphe",{prix:false,html:
`La mission a pour objet d’accompagner l’entité dans l’**évaluation de ses émissions de gaz à effet de serre** sur la période de référence indiquée, à partir de ses données comptables et de ses données d’activité.

Il s’agit d’une **démarche volontaire**. Elle ne vaut pas établissement du bilan d’émissions de gaz à effet de serre prévu à l’article L. 229-25 du code de l’environnement, qui ne s’impose qu’aux entités de plus de 500 salariés en métropole et obéit à ses propres règles de contenu, de périodicité et de publication.`}),
        I("Travaux prévus","paragraphe",{prix:false,html:
`Les travaux comprendront, selon le périmètre retenu :

- la définition avec la direction du périmètre organisationnel et de la période de référence ;
- la collecte des données d’activité et des données comptables utiles : énergie, carburants, déplacements, fret, achats de biens et de services, immobilisations, déchets ;
- l’affectation de ces données aux postes d’émission et le choix des facteurs de conversion correspondants ;
- le calcul des émissions et leur restitution par poste et par périmètre ;
- l’identification des postes les plus contributeurs et des principales incertitudes ;
- la remise d’un rapport de restitution et sa présentation à la direction.`}),
        I("Livrables","paragraphe",{prix:false,html:
`Le livrable comprendra un **rapport de restitution** précisant le périmètre organisationnel, la période de référence, les postes retenus et exclus, les facteurs d’émission utilisés et leur source, les résultats par poste exprimés en tonnes équivalent CO₂, ainsi que les principales incertitudes.

Les pistes d’action et le plan de réduction, lorsqu’ils sont demandés, font l’objet d’une mention expresse dans le devis.`}),
        I("Nature et limites de la mission","paragraphe",{prix:false,html:
`L’évaluation repose sur des **données d’activité fournies par l’entité** et sur des **facteurs d’émission moyens**. Les résultats constituent un **ordre de grandeur destiné au pilotage**, non une mesure physique des émissions.

La mission n’emporte **aucune assurance** de la part du cabinet. Elle ne constitue ni un audit, ni un examen limité, ni une vérification par un organisme tiers indépendant, et ne garantit la conformité à aucun référentiel, label ou cahier des charges de donneur d’ordre, sauf mission distincte expressément convenue.

Toute communication externe des résultats relève de la seule responsabilité du client et doit reproduire le périmètre, la méthode et les limites énoncés au rapport.`}),
        I("Documents et informations nécessaires","paragraphe",{prix:false,html:
`À adapter au dossier : balance générale et grand livre de la période, factures d’énergie (électricité, gaz, réseaux de chaleur), relevés de carburants et cartes carburant, état du parc de véhicules, notes de frais et justificatifs de déplacement, état des immobilisations, détail des achats de biens et de services par fournisseur, contrats de fret et de transport, contrats de collecte et bordereaux de déchets, surfaces et modes de chauffage des sites, effectif et modes de déplacement domicile-travail.`})
      ]),

      /* Zones communes aux trames de missions ponctuelles : délai, planning,
         documents, LCB-FT, annexe 2 et modalités d’honoraires. Les clés sont
         celles attendues par `missionPonctuelleVars`. */
      SEC("Lettre de mission — exécution et honoraires","Présentation",[
        I("Délai de réalisation","texte",{cle:"lm_delai",prix:false,aide:"Ex. 45 jours, 3 mois. Laisser vide pour ne pas engager de délai."}),
        I("Fin de la mission","liste",{cle:"lm_fin",prix:false,reponses:[
          withN(R("À l’émission de notre rapport de mission",0),0),
          withN(R("À l’émission de notre compte rendu de mission",0),1)
        ]}),
        I("Planning d’intervention","paragraphe",{cle:"lm_planning",prix:false,html:"",
          aide:"Dates ou périodes d’intervention et nature des travaux. Laisser vide si le planning n’est pas arrêté à la signature."}),
        I("Informations et documents nécessaires","paragraphe",{cle:"lm_documents",prix:false,html:"",
          aide:"Liste reprise dans l’article « Exécution et déroulement de la mission » de la lettre."}),
        I("Prestations complémentaires","paragraphe",{cle:"lm_complementaires",prix:false,html:"",
          aide:"Ex. plan de réduction chiffré, atelier de sensibilisation, actualisation annuelle. Laisser vide s’il n’y en a pas : l’article disparaît de la lettre."}),
        I("Éléments d’identification LCB-FT","liste",{cle:"lm_identification",prix:false,reponses:[
          withN(R("Déjà obtenus — paragraphe non intégré",0),0),
          withN(R("Non encore obtenus — condition suspensive à la mise en œuvre",0),1),
          withN(R("Non encore obtenus — condition résolutoire à la mise en œuvre",0),2)
        ]}),
        I("Annexe 2 — tableau de répartition des obligations","ouinon",{cle:"lm_annexe2",prix:false,reponses:[
          withN(R("Non jointe",0),0),
          withN(R("Jointe à la lettre de mission",0),1)
        ]}),
        I("Modalité d’honoraires","liste",{cle:"lm_honoraires_mode",prix:false,reponses:[
          withN(R("Forfait",0),0),
          withN(R("Temps passé",0),1)
        ]}),
        I("Taux horaires appliqués","paragraphe",{cle:"lm_taux_horaires",prix:false,html:"",
          aide:"À renseigner uniquement en mode « temps passé ». Laissé vide, le bloc n’apparaît ni au devis ni à la lettre."}),
        I("Temps estimé (heures)","texte",{cle:"lm_temps_estime",prix:false,aide:"Utilisé uniquement en mode « temps passé »."}),
        I("Régularisation en cas de dépassement","liste",{cle:"lm_regularisation",prix:false,reponses:[
          withN(R("En fin de mission",0),0),
          withN(R("En cours de mission",0),1)
        ]})
      ]),

      SEC("Modalités de facturation et de règlement","Présentation",[
        I("Périodicité de facturation","liste",{cle:"periodicite_facturation",prix:false,reponses:[
          R("À la remise du livrable",0),
          R("50 % à la signature, solde à la remise du livrable",0),
          R("À la signature de la lettre de mission",0),
          R("Selon échéancier convenu",0)
        ]}),
        I("Modalité de règlement","liste",{cle:"modalite_reglement",prix:false,reponses:[
          R("Par virement",0),R("Par prélèvement",0),R("Par chèque",0)
        ]}),
        I("Conditions particulières","paragraphe",{prix:false,html:""})
      ])
    ],
    exc:[],deb:[]
  };
}

function modeleSCI(){
  const ir=withN(R("IR — Impôt sur le revenu",0),0);
  const is=withN(R("IS — Impôt sur les sociétés",0),1);
  const cIR={cle:"regime_sci",n:[0]}, cIS={cle:"regime_sci",n:[1]};
  const biens=["À renseigner","1 bien immobilier","2 biens immobiliers","3 biens immobiliers","4 biens immobiliers","5 biens immobiliers","6 biens immobiliers","7 biens immobiliers","8 biens immobiliers","9 biens immobiliers","10 biens immobiliers"];
  const biensRep=biens.map((x,i)=>withN(R(x,0),i));
  const comptaAn=[0,600,804,996,1200,1404,1596,1800,2004,2196,2400];

  return {
    id:uid(),titre:"DEVIS SCI",desc:"SCI — choix du régime fiscal IR ou IS",statut:"publie",
    cats:["Comptabilité","Fiscalité","Juridique","Particulier"],tva:20,devise:"EUR",per:"annuelle",lmId:null,
    sourceVersion:MODEL_SCI_VERSION,
    sourceLabel:"SCI IR.pdf + SCI IS.pdf — paramétrages cabinet fusionnés le 29/08/2026",
    calcSource:"SCI IR.pdf + SCI IS.pdf fournis par le cabinet ; tarifs récurrents annualisés",
    calcVersion:MODEL_SCI_VERSION,
    sections:[
      SEC("Votre cabinet d'expertise-comptable","Présentation",[
        I("Présentation du cabinet","paragraphe",{prix:false,html:
`**{{cabinet.nom}} Expertise Comptable — Votre partenaire en matière de gestion et de performance financière**

- **Expertise & conseil** : un accompagnement rigoureux en comptabilité, fiscalité et gestion financières dans le but de sécuriser votre activité.
- **Solutions sur mesure** : suivi comptable et fiscal, juridique, conseil et accompagnement dans l'organisation de votre patrimoine immobilier.
- **Proximité & engagement** : un interlocuteur dédié et un suivi adapté à votre société.`}),
        I("Pourquoi créer une SCI ?","paragraphe",{prix:false,html:
`La **Société Civile Immobilière (SCI)** est une forme de société très attractive. Elle présente certains avantages, mais son cadre légal peut être contraignant et un montage mal préparé peut s'avérer difficile à gérer.

Elle permet notamment d'organiser la détention et la gestion d'un patrimoine immobilier à plusieurs, avec des règles définies par les statuts et une organisation adaptée aux objectifs des associés. La grande liberté d'organisation de la SCI autorise de nombreux montages, tant pour gérer un patrimoine privé que professionnel.`})
      ]),
      SEC("Présentation de l'activité","Présentation",[
        I("Régime fiscal de la SCI","liste",{cle:"regime_sci",prix:false,reponses:[ir,is],aide:"Ce choix pilote automatiquement les questions fiscales et les prestations propres à l'IR ou à l'IS."}),
        I("Vous louez","liste",{cle:"biens_sci",prix:false,reponses:biensRep}),
        I("Date de début de la mission","texte",{prix:false}),
        I("Date de clôture","texte",{cle:"cloture",prix:false}),
        I("Conditions particulières","paragraphe",{prix:false,html:""})
      ]),
      SEC("Accompagnement en comptabilité","Comptabilité",[
        I("Enregistrement des opérations comptables","liste",{per:"annuelle",reponses:[
          RB("Par le cabinet","biens_sci",comptaAn)
        ]})
      ]),
      condSec("Accompagnement en fiscalité — SCI à l'IR","Fiscalité",[
        I("Établissement de la liasse fiscale","liste",{per:"annuelle",reponses:[
          R("Revenus fonciers (2072)",0),
          R("Liasse fiscale revenus fonciers sans comptabilité",0)
        ]}),
        I("Établissement des déclarations de TVA","liste",{per:"annuelle",reponses:[
          R("NA",0),R("TVA mensuelle",0),R("TVA trimestrielle",0),R("TVA annuelle",0)
        ]}),
        I("Déclaration de revenus (IRPP n°2042 et 2044)","ouinon",{per:"annuelle",reponses:[
          R("Établie par le client",0),R("Établie par le cabinet",0)
        ]})
      ],cIR),
      condSec("Outils informatiques — SCI à l'IR","Gestion",[
        I("Accès à Pennylane","ouinon",{per:"annuelle",reponses:[
          R("Non",0),R("Oui",60)
        ],aide:"Source SCI IR : 5 € / mois, annualisé à 60 € / an."})
      ],cIR),
      condSec("Accompagnement en fiscalité — SCI à l'IS","Fiscalité",[
        I("Établissement de la liasse fiscale","liste",{per:"annuelle",reponses:[
          R("Impôt société",0)
        ]}),
        I("Établissement des déclarations de TVA","liste",{per:"annuelle",reponses:[
          R("NA",0),R("TVA annuelle",0),R("TVA trimestrielle",0),R("TVA mensuelle",0)
        ]}),
        I("Déclaration de revenus (IRPP n°2042 et 2044)","ouinon",{per:"annuelle",reponses:[
          R("Établie par le client",0),R("Établie par le cabinet",0)
        ]})
      ],cIS),
      SEC("Accompagnement en juridique","Juridique",[
        I("Rédaction du PV d'assemblée générale annuelle","ouinon",{per:"annuelle",reponses:[
          R("Par le client",0),R("Par le cabinet",300)
        ],aide:"Source SCI IR / IS : 25 € / mois, annualisé à 300 € / an."})
      ]),
      SEC("Modalités de facturation et de règlement","Présentation",[
        I("Périodicité de facturation","liste",{prix:false,reponses:[
          R("À renseigner",0),R("Annuelle",0),R("Semestrielle",0),R("Trimestrielle",0),R("Mensuelle",0)
        ]}),
        I("Modalité de règlement","liste",{prix:false,reponses:[
          R("Par prélèvement",0),R("Par chèque",0),R("Par virement",0)
        ]})
      ]),
      SEC("Notre cabinet vous accompagne pour la gestion de votre SCI","Présentation",[
        I("Accompagnement SCI","paragraphe",{prix:false,html:
`Nous sommes à vos côtés pour gérer votre société civile immobilière et anticiper l'avenir de votre portefeuille immobilier.`})
      ])
    ],
    exc:[
      {id:uid(),label:"Frais de télédéclaration EDI TDFC — TVA simplifiée ou non assujettie",cat:"Comptabilité",prix:100,tva:20,com:"Facturé au premier mois de l'exercice."},
      {id:uid(),label:"Frais de télédéclarations EDI TDFC — TVA mensuelle",cat:"Comptabilité",prix:160,tva:20,com:"Facturé au premier mois de l'exercice."},
      {id:uid(),label:"Forfait démarrage — décomposition / amortissements / travaux",cat:"Comptabilité",prix:150,tva:20,com:""},
      {id:uid(),label:"Outil PENNYLANE",cat:"Gestion",prix:60,tva:20,com:"5 € HT / mois, soit 60 € HT / an.",showIf:cIS},
      {id:uid(),label:"Création SCI",cat:"Juridique",prix:1100,tva:20,com:"",showIf:cIS}
    ],
    deb:[]
  };
}

