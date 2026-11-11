/* ======================================================================
   v38 — Questionnaires d'acceptation et de lutte anti-blanchiment.

   Les deux questionnaires sont portés par la FICHE CLIENT : ils constituent
   le dossier permanent d'acceptation et remplacent l'ancien contrôle
   « conformité » en cinq cases qui existait au niveau du devis.

   - Questionnaire d'acceptation et de maintien : prise de connaissance,
     analyse des risques (E / M / F), besoins, faisabilité, lettre au
     confrère, décision d'accepter / maintenir.
   - Questionnaire de lutte contre le blanchiment (LAB) : vigilance entité,
     bénéficiaire, actionnariat, dirigeants, structure, opérations, puis
     détermination du niveau de risque (Faible / Normal / Élevé / Très élevé).

   Les deux échelles de risque sont conservées telles quelles : elles
   proviennent des imprimés du cabinet et les documents édités doivent
   pouvoir être classés au dossier de travail à l'identique.
   ====================================================================== */

/* --------------------------------------------------- réponses possibles */
const QA_OUI_NON_NA = [["oui","Oui"],["non","Non"],["na","NA"]];
const QA_OUI_NON = [["oui","Oui"],["non","Non"]];

/* -------------------------------------------- questionnaire LAB (3 pages) */
const LAB_SECTIONS = [
  { id:"entite", titre:"Vigilance vis-à-vis de l'entité", questions:[
    { id:"lab_ent_1", label:"Le dossier contient-il des documents officiels d'identité actualisés (K-Bis et autres) ?" },
    { id:"lab_ent_2", label:"Existe-t-il des changements juridiques fréquents de structures ou d'associés/dirigeants ?" },
    { id:"lab_ent_3", label:"L'entité a-t-elle subi un contrôle fiscal avec des redressements importants ?" }
  ]},
  { id:"beneficiaire", titre:"Vigilance vis-à-vis du bénéficiaire", questions:[
    { id:"lab_ben_1", label:"Connaissons-nous les associés directs détenant plus de 25 % des droits de vote ou du capital ou les dirigeants ?" },
    { id:"lab_ben_2", label:"Avons-nous rencontré le(s) dirigeant(s) effectif(s) ?" },
    { id:"lab_ben_3", label:"Existe-t-il fréquemment des changements de représentant légal ?" }
  ]},
  { id:"actionnariat", titre:"Informations sur l'actionnariat", questions:[
    { id:"lab_act_1", label:"Existe-t-il parmi les actionnaires ou dirigeants des personnes politiquement exposées (PPE) ?" },
    { id:"lab_act_2", label:"Existe-t-il une part de capital détenue par des actionnaires inconnus et/ou physiquement absents ?" },
    { id:"lab_act_3", label:"Existe-t-il des doutes sur l'intégrité et la réputation des actionnaires ou dirigeants ?" }
  ]},
  { id:"dirigeants", titre:"Informations sur les dirigeants", questions:[
    { id:"lab_dir_1", label:"Existe-t-il des éléments ou des indices permettant de penser que la direction pourrait être amenée à fausser délibérément les résultats de l'entité ?" },
    { id:"lab_dir_2", label:"Des personnes clés ont-elles quitté l'entité récemment ?" },
    { id:"lab_dir_3", label:"Les dirigeants changent-ils souvent de banque, d'avocat, d'expert-comptable ?" }
  ]},
  { id:"structure", titre:"Structure de l'entité", questions:[
    { id:"lab_str_1", label:"La structure de l'entité est-elle complexe ?" },
    { id:"lab_str_2", label:"Existe-t-il des opérations, des filiales ou des comptes bancaires significatifs dans des pays étrangers qui n'ont en apparence aucun lien commercial évident avec l'entité ?" }
  ]},
  { id:"operations", titre:"Vigilance liée aux opérations", questions:[
    { id:"lab_ope_1", label:"Existe-t-il des opérations complexes ?" },
    { id:"lab_ope_2", label:"L'entité exerce-t-elle une activité générant d'importants mouvements d'argent liquide ?" },
    { id:"lab_ope_3", label:"L'entité exerce-t-elle dans un secteur sensible / favorable au blanchiment (casinos, immobilier, négoce de pierres précieuses, antiquités ou œuvres d'art, opérateurs de jeux ou de paris autorisés, secteur associatif, etc.) ?" },
    { id:"lab_ope_4", label:"Existe-t-il des montants anormalement élevés ?" },
    { id:"lab_ope_5", label:"Existe-t-il des opérations sans justification économique ?" },
    { id:"lab_ope_6", label:"L'origine des fonds est-elle suffisamment justifiée ?" },
    { id:"lab_ope_7", label:"Existe-t-il des transactions avec des pays faisant partie de la liste des pays nécessitant une vigilance ?" }
  ]}
];
const LAB_QUESTIONS = LAB_SECTIONS.flatMap(s=>s.questions.map(q=>({...q,section:s.id,sectionTitre:s.titre})));
/* Découpage d'origine de l'imprimé : quatre blocs en page 1, deux en page 2. */
const LAB_PAGE_1 = ["entite","beneficiaire","actionnariat","dirigeants"];
const LAB_PAGE_2 = ["structure","operations"];

/* Détermination du niveau de risque (page 3 de l'imprimé). */
const LAB_RISK_LEVELS = [["faible","Faible"],["normal","Normal"],["eleve","Élevé"],["tres_eleve","Très élevé"]];
const LAB_RISK_CRITERIA = [
  ["client","Client"],
  ["activite","Activité"],
  ["localisation","Localisation"],
  ["mission","Nature de la mission"],
  ["synthese","Synthèse"]
];
const LAB_RISK_RANK = { faible:0, normal:1, eleve:2, tres_eleve:3 };
const labRiskLabel = v => (LAB_RISK_LEVELS.find(x=>x[0]===String(v||""))||[,""])[1];

/* ------------------------- questionnaire d'acceptation et de maintien */
const ACCEPT_RISK_LEVELS = [["E","E"],["M","M"],["F","F"]];
const ACCEPT_RISK_CRITERIA = [
  ["activite","Activité"],
  ["juridique","Caractéristiques juridiques (structure juridique, détenteurs du capital, dirigeants de l'entité…)"],
  ["si","Système d'information (fiabilité, conformité par rapport à la législation, sécurité…)"],
  ["comptable","Organisation comptable (existence et importance de la fonction comptable, qualification du personnel comptable, nature et qualité des travaux pris en charge…)"],
  ["historique","Historique fiscal et social du client (contrôles fiscaux, contrôles Urssaf…)"]
];
const ACCEPT_SECTIONS = [
  { id:"connaissance", titre:"Prise de connaissance", questions:[
    { id:"acc_con_1", label:"Le cabinet a-t-il rencontré le client pour prendre connaissance de ses besoins et découvrir l'entreprise ?" },
    { id:"acc_con_2", label:"Joindre au dossier une présentation de l'entité (plaquette, notes prises lors de l'entretien avec le client, budgets ou tableaux de bord…)" }
  ]},
  { id:"besoins", titre:"Analyse des besoins du client", intro:"Les informations suivantes ont-elles été collectées ?", questions:[
    { id:"acc_bes_1", label:"La répartition des travaux comptables entre le client et le cabinet" },
    { id:"acc_bes_2", label:"Le volume d'écritures comptables" },
    { id:"acc_bes_3", label:"Les spécificités comptables, fiscales et sociales relatives à l'activité et pouvant nécessiter des travaux approfondis ou spécifiques : valorisation, détermination de provisions, etc." },
    { id:"acc_bes_4", label:"Les délais spécifiques à respecter (demande particulière du client…)" }
  ]},
  { id:"faisabilite", titre:"Analyse de la faisabilité de la mission", questions:[
    { id:"acc_fai_1", label:"Le cabinet est-il indépendant vis-à-vis du client ?" },
    { id:"acc_fai_2", label:"Le cabinet a-t-il la compétence pour réaliser cette mission ?" },
    { id:"acc_fai_3", label:"Le cabinet dispose-t-il des moyens adéquats pour assurer cette mission dans de bonnes conditions (notamment de délai) ?" }
  ]},
  { id:"blanchiment", titre:"Analyse des dispositions de la loi anti-blanchiment",
    intro:"Le questionnaire anti-blanchiment est établi dans le même mouvement que la présente pièce.", questions:[
    /* v45 — Question ordinaire, répondue à la main comme les autres : elle
       n'est plus déduite de l'achèvement du questionnaire LAB. */
    { id:"acc_lab_1", label:"Le questionnaire sur la lutte anti-blanchiment a-t-il été complété ?" }
  ]},
  { id:"confrere", titre:"Lettre au confrère", questions:[
    { id:"acc_confrere_1", label:"Le client fait-il déjà appel aux services d'un professionnel de l'expertise comptable ?" },
    { id:"acc_confrere_2", label:"…la lettre au confrère (prévue à l'article 163 du Code de déontologie intégré au décret du 30 mars 2012 relatif à l'exercice de l'activité d'expertise comptable) a-t-elle été envoyée ?", siOui:"acc_confrere_1" },
    { id:"acc_confrere_3", label:"…existe-t-il une opposition à notre entrée en fonction ou des remarques ont-elles été formulées par le confrère ?", siOui:"acc_confrere_1" }
  ]}
];
const ACCEPT_QUESTIONS = ACCEPT_SECTIONS.flatMap(s=>s.questions.map(q=>({...q,section:s.id,sectionTitre:s.titre})));

/* Décision de l'expert-comptable : quatre issues, deux favorables. */
const ACCEPT_DECISIONS = [
  { id:"accepter",    groupe:"Nouveau client", label:"J'accepte la mission de présentation",            favorable:true },
  { id:"refuser",     groupe:"Nouveau client", label:"Je refuse la mission de présentation",            favorable:false },
  { id:"maintenir",   groupe:"Ancien client",  label:"Je maintiens la mission de présentation",         favorable:true },
  { id:"non_maintien",groupe:"Ancien client",  label:"Je ne maintiens pas la mission de présentation",  favorable:false }
];
const acceptDecision = id => ACCEPT_DECISIONS.find(x=>x.id===String(id||""))||null;

/* ================================================== état par fiche client */
const labDefaults = () => ({ answers:{}, impacts:{}, observations:{}, conclusion:"", risk:{}, riskComments:{}, faitLe:"", signataire:"", majAt:"", majBy:"" });
const acceptDefaults = () => ({ answers:{}, observations:{}, risk:{}, riskComments:{}, decision:"", decisionAt:"", decisionBy:"", observationsGenerales:"", majAt:"", majBy:"" });
function ensureQuestionnaires(c){
  if(!c) return null;
  c.lab={...labDefaults(),...(c.lab||{})};
  c.accept={...acceptDefaults(),...(c.accept||{})};
  for(const k of ["answers","impacts","observations","risk","riskComments"]) if(!c.lab[k]||typeof c.lab[k]!=="object") c.lab[k]={};
  for(const k of ["answers","observations","risk","riskComments"]) if(!c.accept[k]||typeof c.accept[k]!=="object") c.accept[k]={};
  return c;
}

/* ------------------------------------------------------- achèvement LAB */
function labState(c){
  const lab=ensureQuestionnaires(c)?.lab||labDefaults();
  const manquantes=LAB_QUESTIONS.filter(q=>!lab.answers[q.id]);
  const risquesManquants=LAB_RISK_CRITERIA.filter(([k])=>!lab.risk[k]).map(([,l])=>l);
  const conclusionManquante=!String(lab.conclusion||"").trim();
  return {
    lab,
    total:LAB_QUESTIONS.length,
    repondues:LAB_QUESTIONS.length-manquantes.length,
    manquantes, risquesManquants, conclusionManquante,
    synthese:lab.risk.synthese||"",
    /* v51 : la conclusion rédigée ne conditionne pas l'achèvement du
       questionnaire. Le questionnaire est complet lorsque toutes les
       questions sont répondues et tous les niveaux de risque déterminés ;
       la conclusion est le commentaire de l'expert-comptable, utile mais
       facultatif. La faire bloquer le parcours de signature revenait à
       exiger une rédaction là où une grille de réponses suffit. Elle reste
       rappelée dans `rappels`, jamais dans `blocages`. */
    complet:!manquantes.length && !risquesManquants.length
  };
}
/* Réponse « attendue » d'un point de vigilance : une réponse contraire
   n'est pas une erreur, mais un point à commenter et à pondérer. */
const LAB_VIGILANCE = {
  lab_ent_1:"oui", lab_ent_2:"non", lab_ent_3:"non",
  lab_ben_1:"oui", lab_ben_2:"oui", lab_ben_3:"non",
  lab_act_1:"non", lab_act_2:"non", lab_act_3:"non",
  lab_dir_1:"non", lab_dir_2:"non", lab_dir_3:"non",
  lab_str_1:"non", lab_str_2:"non",
  lab_ope_1:"non", lab_ope_2:"non", lab_ope_3:"non", lab_ope_4:"non", lab_ope_5:"non", lab_ope_6:"oui", lab_ope_7:"non"
};
function labVigilancePoints(c){
  const lab=ensureQuestionnaires(c)?.lab||labDefaults();
  return LAB_QUESTIONS.filter(q=>{
    const a=lab.answers[q.id];
    return a && a!=="na" && LAB_VIGILANCE[q.id] && a!==LAB_VIGILANCE[q.id];
  });
}

/* ----------------------------------------------- achèvement acceptation */
/* Une question conditionnelle « Si oui… » ne s'applique que si la question
   dont elle dépend a été répondue « oui ». */
function acceptApplicable(c,q){
  if(!q.siOui) return true;
  const a=ensureQuestionnaires(c)?.accept?.answers?.[q.siOui];
  return a==="oui";
}
/* v45 : toutes les questions d'acceptation se répondent de la même façon —
   Oui / Non, à la main. L'état du questionnaire LAB est rappelé ailleurs
   (`acceptationEtat().rappels`, étape 4 du parcours de signature), il n'est
   plus injecté comme réponse. */
function acceptAnswerOf(c,q){
  return ensureQuestionnaires(c)?.accept?.answers?.[q.id]||"";
}
function acceptState(c){
  ensureQuestionnaires(c);
  const acc=c?.accept||acceptDefaults();
  const applicables=ACCEPT_QUESTIONS.filter(q=>acceptApplicable(c,q));
  const manquantes=applicables.filter(q=>!acceptAnswerOf(c,q));
  const risquesManquants=ACCEPT_RISK_CRITERIA.filter(([k])=>!acc.risk[k]).map(([,l])=>l);
  const dec=acceptDecision(acc.decision);
  return {
    accept:acc,
    total:applicables.length,
    repondues:applicables.length-manquantes.length,
    manquantes, risquesManquants,
    decision:dec,
    favorable:!!dec?.favorable,
    complet:!manquantes.length && !risquesManquants.length && !!dec
  };
}

/* ============================================ synthèse pour l'application */
/* Remplace intégralement l'ancien contrôle en cinq cases : l'acceptation
   d'un client repose désormais sur l'achèvement des deux questionnaires
   et sur une décision favorable de l'expert-comptable. */
/* v45 — Le questionnaire anti-blanchiment ne bloque plus : les deux pièces
   sont établies dans le même mouvement, et la question « le questionnaire
   LAB a-t-il été complété ? » n'est qu'un état d'avancement, pas une
   condition. Ce qui reste dû au titre du LAB est retourné à part, dans
   `rappels` : toujours affiché, jamais bloquant. Le parcours de signature,
   lui, conserve son étape « Questionnaire LAB rempli ». */
function acceptationEtat(d){
  const c=clientMasterOf(d);
  if(!c) return { client:null, lab:labState(null), accept:acceptState(null), complet:false,
                  blocages:["compléter l'identification du client pour ouvrir sa fiche"], rappels:[] };
  const lab=labState(c), accept=acceptState(c), blocages=[], rappels=[];
  if(accept.manquantes.length) blocages.push(`questionnaire d'acceptation : ${accept.manquantes.length} question(s) sans réponse`);
  if(accept.risquesManquants.length) blocages.push("analyse des risques du client à compléter");
  if(!accept.decision) blocages.push("décision d'acceptation à formaliser");
  else if(!accept.favorable) blocages.push(`décision défavorable : « ${accept.decision.label.toLowerCase()} »`);
  if(lab.manquantes.length) rappels.push(`questionnaire anti-blanchiment : ${lab.manquantes.length} question(s) sans réponse`);
  if(lab.risquesManquants.length) rappels.push("niveau de risque anti-blanchiment à déterminer");
  if(lab.conclusionManquante) rappels.push("conclusion du questionnaire anti-blanchiment à rédiger (facultatif)");
  return { client:c, lab, accept, complet:!blocages.length, blocages, rappels };
}
/* Avancement global, utilisé par les indicateurs et les badges. */
function acceptationProgres(c){
  const lab=labState(c), accept=acceptState(c);
  /* v51 : la conclusion LAB, facultative, ne compte plus dans l'avancement. */
  const total=lab.total+LAB_RISK_CRITERIA.length+accept.total+ACCEPT_RISK_CRITERIA.length+1;
  const faits=lab.repondues+(LAB_RISK_CRITERIA.length-lab.risquesManquants.length)
    +accept.repondues+(ACCEPT_RISK_CRITERIA.length-accept.risquesManquants.length)+(accept.decision?1:0);
  return { faits, total, pct:total?Math.round(faits*100/total):0 };
}
