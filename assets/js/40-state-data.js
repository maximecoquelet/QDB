/* ================================================================ état */
const CAB_DEF = {
  nom:"SERRE", forme:"Société par actions simplifiée (SAS)", capital:"100 000", siren:"897434874",
  rcs:"897 434 874 R.C.S. Romans", tva:"FR85897434874", euid:"FR2602.897434874", naf:"6920Z",
  gestion:"2021B00568", adresse:"370 Avenue de Chabeuil", cp:"26000", ville:"Valence",
  tel:"04 75 81 87 07", email:"contact@cabinetserre.fr", site:"https://www.cabinetserre.fr/",
  activite:"La profession d'expert-comptable.", cloture:"31 août",
  president:"LA GABINIERE — SARL, RCS Romans 932 652 175", region:"Auvergne Rhône-Alpes", ordre:"", rcp:"",
  signataire:"Clément SERRE", qualite:"Expert-comptable", sourceLegale:"Extrait Kbis à jour au 7 juin 2026", dateKbis:"2026-06-07",
  mediateur:"médiateur de la consommation désigné par le Conseil national de l'ordre des experts-comptables",
  penalites:"3 fois le taux d'intérêt légal", recouvrement:40, indemniteResiliation:50, revisionHonoraires:5,
  indexation:"Les honoraires sont révisés chaque année au 1er janvier selon la variation de l'indice Syntec, sans que la révision puisse être inférieure à 2 %.",
  /* v53.14 — le cadre « Conditions financières » du devis. Une condition
     par ligne ; les variables sont celles des documents. Vide = la section
     disparaît du devis. Un dossier peut y déroger (`devis.conditionsFi`). */
  conditionsFinancieres:[
    "Facturation {{conditions.periodicite}}, règlement {{conditions.reglement}}.",
    "En cas de retard de paiement : pénalités au taux de {{cabinet.penalites}} et indemnité forfaitaire de recouvrement de {{cabinet.recouvrement}} €."
  ].join("\n"),
  ecartMax:10
};
const DEFAULT_RENDER_PROXY = "https://serre-yousign-server.onrender.com";
const SETTINGS_DEFAULT = {
  missionTraditional:"#F2F7EE", missionPunctual:"#EEF4FF", missionLegal:"#F5EEFF",
  brandProduct:"Q.D.B.", brandSubtitle:"SERRE",
  brandPrimary:"#D94613", brandRail:"#282624", brandLogoUrl:"",
  documentTagline:"Expertise comptable · Conseil",
  modelesRetires:[],
  ysMessageTemplates:{
    traditional:"Bonjour {{client.contact}},\n\nVous trouverez notre proposition {{devis.ref}} relative à la mission {{mission.modele}} pour {{client.raison}}.\n\nNous restons à votre disposition pour toute question avant validation.\n\nBien cordialement,\n{{responsable.nom}}",
    punctual:"Bonjour {{client.contact}},\n\nVous trouverez notre proposition {{devis.ref}} relative à la mission ponctuelle {{mission.modele}} pour {{client.raison}}.\n\nNous restons disponibles pour préciser le périmètre si nécessaire.\n\nBien cordialement,\n{{responsable.nom}}",
    legal:"Bonjour {{client.contact}},\n\nVous trouverez notre proposition {{devis.ref}} relative à l'intervention juridique {{mission.modele}} pour {{client.raison}}.\n\nNous restons à votre disposition pour toute précision.\n\nBien cordialement,\n{{responsable.nom}}"
  }
};
const safeColor=(v,f)=>/^#[0-9a-f]{6}$/i.test(String(v||""))?String(v):f;
function hexRgb(hex){
  const h=safeColor(hex,"#ffffff").slice(1);
  return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)};
}
function rgbHex({r,g,b}){
  const q=n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,"0");
  return `#${q(r)}${q(g)}${q(b)}`;
}
function mixColor(a,b,bWeight=.5){
  const A=hexRgb(a),B=hexRgb(b),w=Math.max(0,Math.min(1,Number(bWeight)||0));
  return rgbHex({r:A.r*(1-w)+B.r*w,g:A.g*(1-w)+B.g*w,b:A.b*(1-w)+B.b*w});
}
function colorLuma(hex){
  const {r,g,b}=hexRgb(hex);
  const lin=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);};
  return .2126*lin(r)+.7152*lin(g)+.0722*lin(b);
}
function missionPalette(bg){
  bg=safeColor(bg,"#f4f4f4");
  const dark=colorLuma(bg)<.34;
  const ink=dark?"#ffffff":"#201d1a";
  const accent=mixColor(bg,dark?"#ffffff":"#000000",dark?.34:.42);
  const muted=mixColor(ink,bg,.34);
  const hover=mixColor(bg,dark?"#ffffff":"#000000",.055);
  const badge=mixColor(bg,dark?"#000000":"#ffffff",dark?.20:.28);
  return {bg,ink,accent,muted,hover,badge};
}
function setMissionCssPalette(app,key,bg){
  const p=missionPalette(bg);
  app.style.setProperty(`--mission-${key}`,p.bg);
  app.style.setProperty(`--mission-${key}-ink`,p.ink);
  app.style.setProperty(`--mission-${key}-accent`,p.accent);
  app.style.setProperty(`--mission-${key}-muted`,p.muted);
  app.style.setProperty(`--mission-${key}-hover`,p.hover);
  app.style.setProperty(`--mission-${key}-badge`,p.badge);
}
const BRAND_CACHE_KEY="serre.brand.public.v1";
function safeImageUrl(v){const x=String(v||"").trim();return /^(https?:\/\/|data:image\/(?:png|jpeg|jpg|webp|svg\+xml);base64,)/i.test(x)?x:"";}
function brandData(source=st.settings){return {product:String(source?.brandProduct||SETTINGS_DEFAULT.brandProduct).trim()||SETTINGS_DEFAULT.brandProduct,subtitle:String(source?.brandSubtitle||SETTINGS_DEFAULT.brandSubtitle).trim()||SETTINGS_DEFAULT.brandSubtitle,primary:safeColor(source?.brandPrimary,SETTINGS_DEFAULT.brandPrimary),rail:safeColor(source?.brandRail,SETTINGS_DEFAULT.brandRail),logo:safeImageUrl(source?.brandLogoUrl),documentTagline:String(source?.documentTagline||SETTINGS_DEFAULT.documentTagline).trim()||SETTINGS_DEFAULT.documentTagline};}
function cacheBranding(){try{localStorage.setItem(BRAND_CACHE_KEY,JSON.stringify(brandData()));}catch(_){}}
function cachedBrandData(){try{return brandData({...SETTINGS_DEFAULT,...JSON.parse(localStorage.getItem(BRAND_CACHE_KEY)||"{}")});}catch(_){return brandData(SETTINGS_DEFAULT);}}
function applyBranding(){const b=brandData(),root=document.documentElement;root.style.setProperty("--vert",b.primary);root.style.setProperty("--vert-c",mixColor(b.primary,"#ffffff",.90));root.style.setProperty("--rail-bg",b.rail);document.title=`${b.product} — ${b.subtitle}`;}
function brandMarkHTML(b=brandData()){return `${b.logo?`<img class="brand-logo" src="${esc(b.logo)}" alt="">`:`<i class="rings"></i>`}<b>${esc(b.product)}</b>`;}

/* =====================================================================
   v49 — Les filtres du portefeuille survivent à la session
   ---------------------------------------------------------------------
   Reposer chaque matin les mêmes quatre filtres est un coût invisible
   mais réel. Ils sont conservés localement, par poste : ce sont des
   préférences d'affichage, pas des données du cabinet.
   ===================================================================== */
const FILTRES_DEFAUT={status:"",statuts:"",type:"",model:"",year:"",archive:"active",owner:"",retard:""};
const FILTRES_STORAGE="serre.ui.port-filters.v1";
function chargerFiltresPortefeuille(){
  try{ return {...FILTRES_DEFAUT,...(JSON.parse(localStorage.getItem(FILTRES_STORAGE)||"{}")||{})}; }
  catch(_){ return {...FILTRES_DEFAUT}; }
}
function enregistrerFiltresPortefeuille(){
  try{ localStorage.setItem(FILTRES_STORAGE,JSON.stringify(st.portFilters||FILTRES_DEFAUT)); }catch(_){}
}
const filtresActifs = () => Object.entries(st.portFilters||{})
  .filter(([k,v])=>String(v||"")!==String(FILTRES_DEFAUT[k]||""));

const st = {
  view:"home", tab:"client", id:null, q:"", docType:"devis", clientViewId:null, clientQ:"",
  portFilters:chargerFiltresPortefeuille(),
  portSort:{key:"cree",dir:"desc"}, clientSort:{key:"client",dir:"asc"}, portClassedOpen:false, clientTab:"identite", docParamsOpen:false, versionsOpen:false, sommaireOuvert:false, docTiroir:"", questFiltre:"", questDetail:false, clientPickQ:"", chronoOuverte:false, modVue:"liste", modListeQ:"", lmVue:"liste", lmListeQ:"", reglagesRub:"apparence", caAnnee:"", caOuvert:"", caListeOuverte:false,
  /* v43 — les trois blocs du portefeuille se replient comme les classés.
     Une clé absente vaut « déployé » : les listes de travail restent
     ouvertes par défaut. */
  portPanels:{},
  create:{query:"",loading:false,error:"",results:[],company:null,clientId:"",modelId:"",markers:[]},
  modId:null, secId:null, itemId:null, lmId:null, lmBlk:"intro", modSearch:"", modCollapsed:{},
  toolsTab:"health", bulkIds:[], auditLog:[], trash:[], errorLog:[], systemHealth:null, importPreview:null, flashDevisId:null,
  cab:{...CAB_DEF}, modeles:[], lettres:[], devis:[], clients:[], showArchived:false, settings:{...SETTINGS_DEFAULT}, ys:{proxy:DEFAULT_RENDER_PROXY,env:"sandbox",auth:"otp_email"},
  rne:{devId:"",query:"",loading:false,error:"",results:[],selected:null}
};
const $ = s => document.querySelector(s);
const curDev = () => st.devis.find(d=>d.id===st.id);
/* =====================================================================
   v53.8 — CONCORDANCE PRÉAVIS / RÉSILIATION DANS LA LETTRE DE MISSION
   ---------------------------------------------------------------------
   L'en-tête de la lettre annonçait « Préavis — N mois » tandis que
   l'article 7 des conditions générales s'ouvrait sur « En cas de
   résiliation par le client au cours d'un exercice comptable… », ce qui
   se lisait comme un droit de résilier à tout moment moyennant paiement
   des travaux faits. Les deux articles disaient donc deux choses
   différentes du même engagement.

   La trame est corrigée ; mais les lettres déjà créées vivent en base,
   pas dans le code : sans reprise, la correction ne les atteindrait
   jamais. Cette migration réécrit les deux articles UNIQUEMENT lorsque
   le texte stocké est encore, au caractère près, l'ancien texte de
   référence. Une lettre que le cabinet a retouchée n'est pas touchée :
   on ne réécrit pas par surprise une clause que quelqu'un a voulue.
   ===================================================================== */
/* Les corps COMPLETS des deux articles, dans chacun de leurs états
   antérieurs. Ils sont extraits des archives livrées, jamais retapés :
   la reprise compare le corps entier, et un fragment ne correspondrait
   jamais — c'est le défaut qui avait rendu la v53.8 sans effet. */
const LM_ETATS_ANTERIEURS = {
  duree: [
    "La mission est conclue pour la durée de l’exercice comptable. Pour cet exercice, elle couvre la période comprise entre la date d’effet de la lettre de mission et la date de clôture de l’exercice comptable, date d’échéance du contrat.\n\nLa mission est renouvelée par tacite reconduction, à chaque fois pour l’exercice suivant, sauf dénonciation par lettre recommandée avec accusé de réception {{conditions.preavis}} mois avant la date de clôture de l’exercice comptable.",
    "La mission est conclue pour la durée de l’exercice comptable. Pour cet exercice, elle couvre la période comprise entre la date d’effet de la lettre de mission et la date de clôture de l’exercice comptable, date d’échéance du contrat.\n\nLa mission est renouvelée par tacite reconduction, à chaque fois pour l’exercice suivant, sauf dénonciation par lettre recommandée avec accusé de réception {{conditions.preavis}} mois avant la date de clôture de l’exercice comptable.\n\nÀ défaut de dénonciation dans ce délai, la mission se poursuit pour l’exercice suivant ; une dénonciation notifiée hors délai ne prend effet qu’à l’échéance suivante. Les conditions dans lesquelles il peut être mis fin à la mission avant son terme sont fixées à l’article « 7. Résiliation de la mission » des conditions générales."
  ],
  cg7: [
    "En cas de résiliation par le client au cours d’un exercice comptable ou pendant une mission ponctuelle, et sauf faute grave imputable au cabinet, les honoraires correspondant aux travaux déjà effectués restent dus. L’indemnité de résiliation éventuellement prévue au contrat est également applicable dans les limites admises par les textes et la jurisprudence.\n\nEn cas de manquement du client à l’une de ses obligations, le cabinet peut mettre fin à sa mission après mise en demeure restée sans effet lorsque celle-ci est requise.\n\nDès la survenance d’un événement susceptible de placer le professionnel dans une situation d’incompatibilité, de conflit d’intérêts ou de porter atteinte à son indépendance, le cabinet prend les mesures appropriées et, si nécessaire, met fin à la mission.",
    "Lorsque la mission est conclue pour la durée de l’exercice et renouvelée par tacite reconduction, elle prend fin à son échéance par l’effet de la dénonciation prévue à l’article « Durée de la mission », notifiée par lettre recommandée avec accusé de réception dans le délai de préavis qui y est stipulé. Lorsque la mission est ponctuelle, elle prend fin par l’achèvement des travaux qui en sont l’objet. En dehors de ces hypothèses, et sauf accord des parties, la mission se poursuit jusqu’à son terme.\n\nSi le client met néanmoins fin à la mission avant son terme, au cours d’un exercice comptable ou pendant une mission ponctuelle, et sauf faute grave imputable au cabinet, les honoraires correspondant aux travaux déjà effectués restent dus. L’indemnité de résiliation éventuellement prévue au contrat est également applicable dans les limites admises par les textes et la jurisprudence.\n\nEn cas de manquement du client à l’une de ses obligations, le cabinet peut mettre fin à sa mission après mise en demeure restée sans effet lorsque celle-ci est requise.\n\nDès la survenance d’un événement susceptible de placer le professionnel dans une situation d’incompatibilité, de conflit d’intérêts ou de porter atteinte à son indépendance, le cabinet prend les mesures appropriées et, si nécessaire, met fin à la mission."
  ],
  /* v53.14 : corps de l’article 5 avant l’ajout de la clause de révision
     annuelle. Extrait de l’archive v53.13 livrée, jamais retapé. */
  cg5: [
    "Le cabinet reçoit du client des honoraires librement convenus. Il est remboursé de ses frais de déplacement et débours selon les conditions prévues au devis. Des acomptes sur honoraires peuvent être demandés périodiquement.\n\nLes honoraires sont payés à leur date d’échéance. En cas de paiement anticipé, aucun escompte n’est accordé. En cas de retard de paiement, les pénalités prévues au contrat et les indemnités légales de recouvrement sont exigibles dans les conditions prévues par les textes en vigueur.\n\nToute contestation d’une facture doit être formulée dans un délai raisonnable à compter de sa réception, identifier la prestation concernée et être motivée. Elle ne dispense pas du paiement des prestations non contestées.\n\nLe non-paiement des honoraires pourra, après mise en demeure restée sans effet lorsque celle-ci est requise, entraîner la suspension des travaux ou la résiliation de la mission.\n\nEn cas de changement des modalités de facturation, le client en est informé préalablement.\n\nEn cas de rupture du contrat, une assistance au transfert du dossier pourra être réalisée à la demande du client, selon les conditions convenues entre les parties.\n\nEn cas d’usage du droit de rétention prévu par les textes professionnels, le Conseil régional de l’Ordre compétent est informé dans les conditions réglementaires."
  ]
};
/* v53.15 — la révision des honoraires ne figure plus qu’à l’article 5 des
   conditions générales. Le modèle de conditions financières du devis livré
   en v53.14 comportait une troisième ligne d’indexation : on la retire, mais
   seulement si le cabinet n’a pas déjà écrit son propre texte. */
const CF_MODELE_V5314 = [
  "Facturation {{conditions.periodicite}}, règlement {{conditions.reglement}}.",
  "En cas de retard de paiement : pénalités au taux de {{cabinet.penalites}} et indemnité forfaitaire de recouvrement de {{cabinet.recouvrement}} €.",
  "{{conditions.indexation}}"
].join("\n");
function upgradeConditionsFinancieresSansIndexation(){
  const actuel=st.cab?.conditionsFinancieres;
  if(typeof actuel!=="string") return false;                       /* jamais enregistré : CAB_DEF suffit */
  if(actuel.trim()!==CF_MODELE_V5314.trim()) return false;         /* texte propre au cabinet : intact */
  st.cab.conditionsFinancieres=CAB_DEF.conditionsFinancieres;
  return true;
}

/* Articles de la trame que la reprise automatique sait mettre à jour. */
const LM_ARTICLES_MIGRES = ["duree","cg7","cg5"];

/* Quels articles d'une lettre s'écartent de la trame de référence ?
   La reprise automatique ne touche que les textes restés strictement
   conformes à un état antérieur connu. Tout le reste — rédaction propre
   au cabinet, ou version trop ancienne pour être reconnue — reste en
   place, et doit donc pouvoir être repris à la main en connaissance de
   cause. */
function articlesHorsTrame(L){
  if(!L || !Array.isArray(L.articles)) return [];
  const ref={}; (lettreDef().articles||[]).forEach(a=>{ ref[a.id]=a.corps; });
  return LM_ARTICLES_MIGRES.map(id=>{
    const art=L.articles.find(a=>a.id===id);
    if(!art || ref[id]===undefined) return null;
    return String(art.corps||"").trim()===String(ref[id]).trim() ? null : {id, titre:art.titre||id};
  }).filter(Boolean);
}

function upgradeLettresPreavisResiliation(){
  const neuve=lettreDef();
  const ref={};
  (neuve.articles||[]).forEach(a=>{ ref[a.id]=a.corps; });
  let touchees=0;
  for(const L of (st.lettres||[])){
    if(!Array.isArray(L.articles)) continue;
    let modifiee=false;
    /* Plusieurs états antérieurs peuvent coexister selon la date de la
       dernière mise en service. On reprend n'importe lequel d'entre eux,
       et aucun autre. */
    const ETATS=LM_ETATS_ANTERIEURS;
    for(const id of LM_ARTICLES_MIGRES){
      const art=L.articles.find(a=>a.id===id);
      if(!art || !ref[id]) continue;
      const actuel=String(art.corps||"").trim();
      if(actuel===String(ref[id]).trim()) continue;                  /* déjà à jour */
      if(!ETATS[id].some(x=>actuel===String(x).trim())) continue;    /* texte retouché : on n'y touche pas */
      art.corps=ref[id];
      modifiee=true;
    }
    if(modifiee){ L.modifiedAt=nowISO(); touchees++; }
  }
  return touchees;
}

function upgradeCabinetBncToAnnual(linkedLmId=null){
  const oldVersions=new Set(["serre-bnc-source-2026-08-29-v1","serre-bnc-source-2026-08-29-v2-annuel"]);
  const i=st.modeles.findIndex(m=>oldVersions.has(m?.sourceVersion));
  if(i<0) return false;
  const old=st.modeles[i], fresh=modeleBNC();
  /* On conserve l'identité du modèle et son rattachement de lettre de mission. */
  fresh.id=old.id;
  fresh.lmId=old.lmId||linkedLmId||null;
  fresh.statut=old.statut||"publie";
  st.modeles[i]=fresh;
  return true;
}

function upgradeCabinetSciPennylaneToAnnual(linkedLmId=null){
  const oldVersions=new Set(["serre-sci-ir-is-2026-08-29-v1"]);
  const i=st.modeles.findIndex(m=>
    oldVersions.has(m?.sourceVersion) ||
    (normLabel(m?.titre)==="devis sci" && (m?.exc||[]).some(e=>normLabel(e.label)==="outil pennylane" && Number(e.prix)===5))
  );
  if(i<0) return false;

  const old=st.modeles[i], fresh=modeleSCI();
  fresh.id=old.id;
  fresh.lmId=old.lmId||linkedLmId||null;
  fresh.statut=old.statut||"publie";

  /* Conserver les personnalisations de libellé/commentaire des exceptionnels
     autres que Pennylane quand elles existent. */
  const oldByLabel=new Map((old.exc||[]).map(e=>[normLabel(e.label),e]));
  fresh.exc=(fresh.exc||[]).map(e=>{
    const prev=oldByLabel.get(normLabel(e.label));
    if(!prev) return e;
    if(normLabel(e.label)==="outil pennylane"){
      return {...e,id:prev.id||e.id,prix:60,com:"5 € HT / mois, soit 60 € HT / an."};
    }
    return {...e,id:prev.id||e.id,label:prev.label||e.label,com:prev.com??e.com};
  });

  st.modeles[i]=fresh;
  return true;
}

function ensureCabinetSourceModels(linkedLmId=null){
  let changed=false;
  const hasBnc=st.modeles.some(m=>m.sourceVersion===MODEL_BNC_VERSION || normLabel(m.titre)==="devis compta bnc");
  if(!hasBnc){
    const m=modeleBNC(); m.lmId=linkedLmId||null; st.modeles.push(m); changed=true;
  }
  const hasLmnp=st.modeles.some(m=>m.sourceVersion===MODEL_LMNP_VERSION || /devis.*lmnp|loueur meuble non professionnel/i.test(normLabel(m.titre)));
  if(!hasLmnp){
    const m=modeleLMNP(); m.lmId=linkedLmId||null; st.modeles.push(m); changed=true;
  }
  const hasExc=st.modeles.some(m=>m.sourceVersion===MODEL_EXC_ACCOUNTING_VERSION || MODEL_EXC_ACCOUNTING_LEGACY.includes(m.sourceVersion) || normLabel(m.titre)==="devis missions comptables exceptionnelles");
  if(!hasExc){
    const m=modeleMissionsComptablesExceptionnelles(); m.lmId=null; st.modeles.push(m); changed=true;
  }
  const hasSci=st.modeles.some(m=>m.sourceVersion===MODEL_SCI_VERSION || normLabel(m.titre)==="devis sci");
  if(!hasSci){
    const m=modeleSCI(); m.lmId=linkedLmId||null; st.modeles.push(m); changed=true;
  }
  return changed;
}

/* v53.13 — modèle « Empreinte carbone » et sa lettre dédiée.
   La détection porte sur `sourceVersion`, jamais sur le titre : le cabinet
   doit pouvoir renommer le modèle sans qu’un doublon ressurgisse au
   chargement suivant. Un modèle supprimé délibérément ne revient pas non
   plus : la suppression est tracée dans `st.settings.modelesRetires`. */
function ensureEmpreinteCarboneModel(letterIds){
  let changed=false;
  const lmId=letterIds&&letterIds.carbone||null;
  const retire=(st.settings?.modelesRetires||[]).includes(MODEL_CARBONE_VERSION);
  let m=st.modeles.find(x=>x?.sourceVersion===MODEL_CARBONE_VERSION);
  if(!m && !retire){
    m=modeleEmpreinteCarbone(); m.lmId=lmId; st.modeles.push(m); changed=true;
  }
  /* Rattachement de la lettre : posé à la création, puis seulement si le
     cabinet ne l’a pas lui-même redirigé vers une autre trame. */
  if(m && lmId && (!m.lmId || !st.lettres.some(l=>l.id===m.lmId))){ m.lmId=lmId; changed=true; }
  return changed;
}
/* =====================================================================
   v47 — MISSIONS PONCTUELLES : LETTRES DE MISSION DÉDIÉES
   ---------------------------------------------------------------------
   Trois trames sont ajoutées au référentiel du cabinet :
     · Prévisionnel — examen d'informations financières prévisionnelles
       (trame OEC, norme NP 3400) ;
     · Évaluation d'une entité ou de ses titres (trame OEC 2015) ;
     · Situation comptable intermédiaire (mission sans assurance).
   Elles sont ensuite rattachées conditionnellement au modèle « Missions
   comptables exceptionnelles » selon la réponse à « Type de mission ».
   ===================================================================== */
function ensureMissionLetters(){
  let changed=false;
  const byVersion={};
  for(const spec of MISSION_LETTER_DEFS){
    let L=st.lettres.find(x=>x.sourceVersion===spec.version);
    if(!L){ L=spec.def(); st.lettres.push(L); changed=true; }
    /* Les lettres livrées avant l'ajout du périmètre de natures sont
       complétées sans écraser une personnalisation du cabinet. */
    const ref=spec.def();
    if(!Array.isArray(L.natures)||!L.natures.length){ L.natures=ref.natures; changed=true; }
    if(!L.natureDefault){ L.natureDefault=ref.natureDefault; changed=true; }
    byVersion[spec.key]=L.id;
  }
  return {changed,byVersion};
}

/* Les réponses d'un dossier sont indexées par l'identifiant de la prestation
   (`d.rep[item.id]`) et, pour les listes, par celui de la réponse retenue.
   Remplacer un modèle par une version neuve invaliderait donc les dossiers en
   cours. On réaligne les identifiants de la nouvelle version sur ceux de
   l'ancienne à chaque fois qu'on retrouve la même section, la même prestation
   ou la même réponse : les devis déjà saisis restent intacts. */
function preserveModelIdentifiers(fresh,old){
  const keyItem=it=>String(it.cle||slug(it.label)||"");
  const oldSecs=new Map((old.sections||[]).map(s=>[normLabel(s.titre),s]));
  for(const s of (fresh.sections||[])){
    const os=oldSecs.get(normLabel(s.titre));
    if(!os) continue;
    s.id=os.id;
    const oldItems=new Map((os.items||[]).map(it=>[keyItem(it),it]));
    for(const it of (s.items||[])){
      const oi=oldItems.get(keyItem(it));
      if(!oi) continue;
      it.id=oi.id;
      const oldReps=new Map((oi.reponses||[]).map(r=>[normLabel(r.label),r]));
      for(const r of (it.reponses||[])){
        const or=oldReps.get(normLabel(r.label));
        if(or) r.id=or.id;
      }
    }
  }
  const oldExc=new Map((old.exc||[]).map(e=>[normLabel(e.label),e]));
  for(const e of (fresh.exc||[])){
    const oe=oldExc.get(normLabel(e.label));
    if(oe) e.id=oe.id;
  }
  return fresh;
}

/* Remplace le modèle « Missions comptables exceptionnelles » par sa version
   v47 en conservant son identité, son statut et ses rattachements, puis
   câble les règles de rattachement conditionnel sur les lettres réelles. */
function upgradeExceptionnellesToLinkedLetters(letterIds){
  let changed=false;
  const i=st.modeles.findIndex(m=>
    MODEL_EXC_ACCOUNTING_LEGACY.includes(m?.sourceVersion) ||
    (m?.sourceVersion!==MODEL_EXC_ACCOUNTING_VERSION && normLabel(m?.titre)==="devis missions comptables exceptionnelles")
  );
  if(i>=0){
    const old=st.modeles[i], fresh=preserveModelIdentifiers(modeleMissionsComptablesExceptionnelles(),old);
    fresh.id=old.id;
    fresh.statut=old.statut||"publie";
    fresh.lmId=old.lmId||null;
    st.modeles[i]=fresh;
    changed=true;
  }
  for(const m of st.modeles){
    if(m?.sourceVersion!==MODEL_EXC_ACCOUNTING_VERSION) continue;
    for(const r of (m.lmRules||[])){
      const want=letterIds[r.ref];
      if(want && r.lmId!==want){ r.lmId=want; changed=true; }
    }
  }
  return changed;
}
const curMod = () => st.modeles.find(m=>m.id===st.modId) || st.modeles[0];
const modOf = d => d?.frozenModel || st.modeles.find(m=>m.id===d.modeleId) || st.modeles[0];
/* v47 : rattachement conditionnel de la lettre de mission.
   Un modèle peut porter des `lmRules` : la première règle dont la condition
   est satisfaite par les réponses du dossier désigne la lettre à utiliser.
   À défaut de règle applicable, on retombe sur le rattachement fixe `lmId`.
   Le mécanisme de condition est celui des sections (`showIf`) : même moteur,
   mêmes clés, donc aucune divergence de comportement possible. */
function letterIdFor(d,m){
  m=m||modOf(d);
  if(!m) return null;
  for(const r of (m.lmRules||[])){
    if(!r||!r.lmId) continue;
    const {lmId,ref,...cond}=r;
    if(conditionApplies(d,m,cond)) return lmId;
  }
  return m.lmId||null;
}
const lettreOf = d => { if(d?.frozenLetter) return d.frozenLetter; const m=modOf(d); const id=letterIdFor(d,m); return id ? (st.lettres.find(l=>l.id===id)||null) : null; };
const hasLettreMission = d => !!(d?.frozenDocs?.lm || lettreOf(d));
const ROLE_LEVEL={collaborateur:1,manager:2,admin:3};
const ROLE_LABEL={collaborateur:"Collaborateur",manager:"Manager / associé",admin:"Administrateur"};
function currentRole(){
  if(S.mode!=="supabase" || !SB_USER) return "admin";
  return ["collaborateur","manager","admin"].includes(SB_PROFILE?.role)?SB_PROFILE.role:"collaborateur";
}
function canRole(min){ return (ROLE_LEVEL[currentRole()]||0)>=(ROLE_LEVEL[min]||0); }
async function loadSupabaseAccess(){
  ACCESS_BACKEND_READY=false; ACCESS_BACKEND_ERROR=""; SB_PROFILE=null; SB_PROFILES=[];
  if(!SB||!SB_USER) return;
  try{
    /* v47 : sélection large plutôt qu'énumérée, pour que l'application
       continue de fonctionner si la migration SQL n'a pas encore ajouté les
       colonnes de suivi du mot de passe. */
    const {data:me,error}=await SB.from("profiles").select("*").eq("id",SB_USER.id).maybeSingle();
    if(error) throw error;
    SB_PROFILE=me||{id:SB_USER.id,email:SB_USER.email||"",role:"collaborateur"};
    if(canRole("manager")){
      const {data:list,error:listError}=await SB.from("profiles").select("*").order("email",{ascending:true});
      if(listError) throw listError;
      SB_PROFILES=list||[];
    } else SB_PROFILES=[SB_PROFILE];
    ACCESS_BACKEND_READY=true;
  }catch(e){
    ACCESS_BACKEND_ERROR=e?.message||String(e);
    console.warn("Gestion des rôles Supabase non initialisée",e);
    /* Compatibilité transitoire : tant que le SQL v14 n'a pas été appliqué,
       l'application reste utilisable par le compte connecté. Une alerte visible
       rappelle que cette situation n'est pas une barrière de sécurité. */
    SB_PROFILE={id:SB_USER.id,email:SB_USER.email||"",role:"admin",legacy:true};
    SB_PROFILES=[SB_PROFILE];
  }
}
function canView(v){ if(v==="juridique") return typeof FJ!=="undefined"&&FJ.acces; if(v==="enregistrements") return typeof ENR!=="undefined"&&ENR.acces; if(["modeles","lettres"].includes(v)) return canRole("manager"); if(["cabinet","yousign","outils","reglages"].includes(v)) return canRole("admin"); return true; }
/* =====================================================================
   v49 — L'INSTANTANÉ ET LE VERROU SONT DEUX CHOSES DIFFÉRENTES
   ---------------------------------------------------------------------
   Jusqu'ici, cocher « Devis envoyé au client » verrouillait le dossier :
   une case de suivi produisait un effet irréversible. Or l'instantané des
   documents et le verrou d'édition ne servent pas le même but.

   · L'instantané a une valeur probante : il établit ce que le client a
     reçu. Il est pris à chaque envoi et à chaque signature, et il n'est
     jamais détruit — il s'empile dans `d.versions`.
   · Le verrou protège le contenu contractuel une fois le devis signé.
     Avant la signature, rien ne justifie d'empêcher une correction : la
     proposition circule, elle se discute, elle s'ajuste.

   `frozenAt` continue de porter le verrou ; ce qui change, c'est le
   moment où il est posé — à la signature du devis, non plus à l'envoi.
   ===================================================================== */
function devisSigne(d){
  if(!d) return false;
  const ms=manualSignState(d.manualSign);
  return !!(ms.quoteSigned||ms.lmSigned||ms.filed||d.sign?.signe||d.sign?.statut==="done");
}
function isDevisLocked(d){ return !!d?.frozenAt; }
function lockedBannerHTML(d){
  if(!isDevisLocked(d)) return "";
  const n=numeroVersion(d), peutReprendre=canRole("manager");
  return `<div class="locked-banner"><div>
    <b>Dossier verrouillé — version ${n} signée</b> : le périmètre, les prix et les clauses ne sont plus modifiables.
    <div class="locked-exceptions">Restent possibles sans reprise en main : la <b>date de la lettre de mission</b>, l'<b>intitulé des documents</b>, le suivi de signature, les notes internes de la fiche client, l'aperçu et les téléchargements.</div>
  </div>
  <div class="locked-side"><span class="mono">${esc(dateTimeFR(d.frozenAt))}</span>${peutReprendre?`<button class="btn sm" data-act="reprendreLaMain">Reprendre la main</button>`:`<span class="hint">La reprise en main est réservée à un manager / associé.</span>`}</div></div>`;
}
function defaultClientLabel(label){
  let x=String(label||"").trim();
  if(!x) return "";
  if(/par le cabinet/i.test(x) && /€/.test(x)) return "Par le cabinet";
  if(/par le client/i.test(x) && /€/.test(x)) return "Par le client";
  x=x.replace(/\s*(?:—|-|,)?\s*(?:soit\s*)?\d+(?:[.,]\d+)?\s*€\s*(?:HT)?(?:\s*\/\s*[a-zà-ÿ]+)?.*$/i,"").trim();
  return x||String(label||"").trim();
}
function responseClientLabel(r){ return String(r?.clientLabel||"").trim()||defaultClientLabel(r?.label||""); }
function repLuClient(d,it){
  const a=d.rep[it.id]; if(a===undefined||a==="") return "";
  if(it.type==="liste"||it.type==="ouinon"){ const r=it.reponses.find(r=>r.id===a); return r?responseClientLabel(r):""; }
  return String(a);
}
function commercialReasonKey(kind){ return kind==="recAn"?"motifRecAn":"motifPon"; }
function normalizeModelUx(m){ if(!m?.sections) return; for(const sec of m.sections) for(const it of sec.items||[]){ if(it.clientText==null) it.clientText=""; if(it.aide==null) it.aide=""; for(const r of it.reponses||[]) if(r.clientLabel==null) r.clientLabel=""; } }
function commercialDelta(base,value){ const b=+base||0,v=+value||0,delta=v-b,pct=b?delta/b*100:null; return {delta,pct}; }
const SAVE_UI={state:"saved",at:null};
const nowISO=()=>new Date().toISOString();
function actorName(){ return SB_USER?.email || "Utilisateur local"; }
function dateTimeFR(v){ if(!v) return ""; const d=new Date(v); return Number.isNaN(d.getTime())?String(v):d.toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"}); }
/* v49 : un échec d'enregistrement se voit — texte en clair sur fond rouge,
   et l'indicateur explique quoi faire plutôt que de constater la panne. */
const saveIndicatorText = () => SAVE_UI.state==="saving"?"Enregistrement…"
  :SAVE_UI.state==="error"?"⚠ Non enregistré — ne fermez pas la page"
  :`Enregistré${SAVE_UI.at?" à "+new Date(SAVE_UI.at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}):""}`;
function updateSaveIndicator(){ const el=document.getElementById("save-state"); if(!el) return; el.className=`save-state ${SAVE_UI.state}`; el.textContent=saveIndicatorText(); el.title=SAVE_UI.state==="error"?"La dernière modification n'a pas été enregistrée sur le serveur. Vérifiez votre connexion ; la modification suivante relancera l'enregistrement.":""; }
function trackSave(p){ SAVE_UI.state="saving"; updateSaveIndicator(); return Promise.resolve(p).then(v=>{ if(v===false) throw new Error("save failed"); SAVE_UI.state="saved"; SAVE_UI.at=nowISO(); updateSaveIndicator(); return v; }).catch(e=>{ SAVE_UI.state="error"; updateSaveIndicator(); console.error(e); return false; }); }

let AUDIT_SAVE_TIMER=null, ERROR_SAVE_TIMER=null;
function saveAuditLogSoon(){
  clearTimeout(AUDIT_SAVE_TIMER);
  if(SB&&SB_USER) return; /* En ligne : serre_audit_log est append-only. */
  AUDIT_SAVE_TIMER=setTimeout(()=>S.set(K.audit,JSON.stringify(st.auditLog.slice(0,1000)),true),700);
}
function saveErrorLogSoon(){
  clearTimeout(ERROR_SAVE_TIMER);
  if(SB&&SB_USER) return; /* En ligne : serre_error_log centralise les erreurs. */
  ERROR_SAVE_TIMER=setTimeout(()=>S.set(K.errors,JSON.stringify(st.errorLog.slice(0,300)),true),900);
}
function auditGlobal(label,detail="",entity="application",entityId=""){
  if(!label) return;
  const entry={id:uid(),at:nowISO(),actor:actorName(),label:String(label),detail:String(detail||""),entity:String(entity||"application"),entityId:String(entityId||"")};
  const last=st.auditLog?.[0];
  if(last&&last.label===entry.label&&last.actor===entry.actor&&last.entity===entry.entity&&last.entityId===entry.entityId&&Date.now()-new Date(last.at).getTime()<12000){
    last.at=entry.at;if(entry.detail)last.detail=entry.detail;
  }else{
    st.auditLog=Array.isArray(st.auditLog)?st.auditLog:[];
    st.auditLog.unshift(entry);st.auditLog=st.auditLog.slice(0,1000);
  }
  saveAuditLogSoon();
  if(SB&&SB_USER){
    SB.from("serre_audit_log").insert({actor_id:SB_USER.id,actor_email:SB_USER.email||null,action:entry.label,detail:entry.detail||null,entity_type:entry.entity,entity_id:entry.entityId||null})
      .then(({error})=>{if(error&&!["42P01","PGRST205"].includes(error.code))console.warn("Audit SQL",error.message);}).catch(()=>{});
  }
}
function captureAppError(err,context="frontend"){
  const message=String(err?.message||err||"Erreur inconnue").slice(0,1200), stack=String(err?.stack||"").slice(0,5000);
  const entry={id:uid(),at:nowISO(),actor:actorName(),context,message,stack,view:st.view||"",devisId:st.id||""};
  st.errorLog=Array.isArray(st.errorLog)?st.errorLog:[];
  const last=st.errorLog[0];
  if(last&&last.message===entry.message&&Date.now()-new Date(last.at).getTime()<30000) last.at=entry.at;
  else st.errorLog.unshift(entry);
  st.errorLog=st.errorLog.slice(0,300);saveErrorLogSoon();
  if(SB&&SB_USER){
    SB.from("serre_error_log").insert({user_id:SB_USER.id,user_email:SB_USER.email||null,context,view_name:entry.view,devis_id:entry.devisId||null,message,stack:stack||null})
      .then(({error})=>{if(error&&!["42P01","PGRST205"].includes(error.code))console.warn("Error log SQL",error.message);}).catch(()=>{});
  }
}
function installErrorMonitoring(){
  if(window.__SERRE_ERROR_MONITOR)return;window.__SERRE_ERROR_MONITOR=true;
  window.addEventListener("error",e=>captureAppError(e.error||e.message,"window.error"));
  window.addEventListener("unhandledrejection",e=>captureAppError(e.reason,"unhandledrejection"));
}

async function loadStructuredLogs(){
  if(!SB||!SB_USER)return;
  try{
    const {data,error}=await SB.from("serre_audit_log").select("id,created_at,actor_email,action,detail,entity_type,entity_id").order("created_at",{ascending:false}).limit(1000);
    if(!error&&Array.isArray(data)&&data.length)st.auditLog=data.map(x=>({id:x.id,at:x.created_at,actor:x.actor_email||"Utilisateur",label:x.action||"",detail:x.detail||"",entity:x.entity_type||"",entityId:x.entity_id||""}));
  }catch(_){}
  try{
    const {data,error}=await SB.from("serre_error_log").select("id,created_at,user_email,context,view_name,devis_id,message,stack").order("created_at",{ascending:false}).limit(300);
    if(!error&&Array.isArray(data)&&data.length)st.errorLog=data.map(x=>({id:x.id,at:x.created_at,actor:x.user_email||"",context:x.context||"",view:x.view_name||"",devisId:x.devis_id||"",message:x.message||"",stack:x.stack||""}));
  }catch(_){}
}
/* v49.1 : l'écriture de la corbeille n'était pas attendue. Si elle
   échouait alors que la suppression réussissait, l'élément disparaissait
   sans copie de sauvegarde, et l'indicateur restait au vert. La fonction
   est désormais asynchrone et rend compte de son succès : l'appelant doit
   renoncer à supprimer si elle échoue. */
async function trashPush(type,data,label){
  const avant=Array.isArray(st.trash)?st.trash:[];
  const suivant=[{id:uid(),type,label:label||type,deletedAt:nowISO(),deletedBy:actorName(),data:JSON.parse(JSON.stringify(data))},...avant].slice(0,300);
  st.trash=suivant;
  const ok=await trackSave(S.set(K.trash,JSON.stringify(st.trash),true));
  if(!ok){ st.trash=avant; return false; }
  auditGlobal("Élément placé dans la corbeille",label||type,type,data?.id||"");
  return true;
}
function trashSave(){return trackSave(S.set(K.trash,JSON.stringify(st.trash),true));}
function helpTip(text){return `<span class="help-tip" title="${esc(text)}" aria-label="${esc(text)}">?</span>`;}
function profileOptions(selected="",includeEmpty=true){
  const rows=(SB_PROFILES||[]).filter(p=>p?.email);
  return `${includeEmpty?`<option value="">— Non affecté —</option>`:""}${rows.map(p=>`<option value="${esc(p.email)}" ${selected===p.email?"selected":""}>${esc(p.email)} · ${esc(ROLE_LABEL[p.role]||p.role||"")}</option>`).join("")}`;
}

const DEVIS_MARKERS=["Comptabilité","Fiscalité","Social","Juridique","Gestion"];
function normalizeDevisMarkers(values){
  const arr=Array.isArray(values)?values:[];
  return DEVIS_MARKERS.filter(x=>arr.some(v=>normLabel(v)===normLabel(x)));
}
function defaultMarkersForModel(m){
  if(!m)return ["Comptabilité"];
  const title=normLabel(`${m.titre||""} ${m.desc||""}`);
  if(title.includes("juridique")) return ["Juridique"];
  if(title.includes("social") && !title.includes("compta") && !title.includes("comptabil")) return ["Social"];
  const fromCats=normalizeDevisMarkers(m.cats||[]);
  if(fromCats.length) return fromCats;
  if(title.includes("previsionnel")||title.includes("evaluation")||title.includes("situation")) return ["Gestion"];
  return ["Comptabilité"];
}
function dossierMarkers(d,mod=modOf(d)){
  const x=normalizeDevisMarkers(d?.markers||[]);
  return x.length?x:defaultMarkersForModel(mod);
}

/* v39 : la checklist et les rappels par dossier ont été retirés ; le suivi
   d'un dossier repose sur son statut, les notifications et les notes du
   client. Le responsable reste porté par le devis et s'affecte depuis le
   portefeuille (sélection multiple → « Affecter »). */
function ensureInternalState(d){
  if(!d)return d;
  if(d.ownerEmail==null)d.ownerEmail="";
  if(!Array.isArray(d.markers)||!normalizeDevisMarkers(d.markers).length)d.markers=defaultMarkersForModel(modOf(d));
  else d.markers=normalizeDevisMarkers(d.markers);
  return d;
}

function logAudit(obj,label,detail=""){
  if(!obj||!label) return; const ts=nowISO(), actor=actorName(); obj.audit=Array.isArray(obj.audit)?obj.audit:[];
  const last=obj.audit[0]; if(last&&last.label===label&&last.actor===actor&&Date.now()-new Date(last.at).getTime()<45000){ last.at=ts; if(detail) last.detail=detail; }
  else obj.audit.unshift({at:ts,actor,label,detail}); obj.audit=obj.audit.slice(0,30);
  auditGlobal(label,detail,obj===curDev()?"devis":obj?.titre?"modele":obj?.raison?"client":"objet",obj?.id||"");
}
function saveIndicatorHTML(){ return `<span id="save-state" class="save-state ${SAVE_UI.state}">${esc(saveIndicatorText())}</span>`; }
function genericAuditIfNeeded(obj,label){ const last=obj?.audit?.[0], recent=last&&Date.now()-new Date(last.at).getTime()<1800; if(obj&&!recent) logAudit(obj,label); }
const saveDev = () => { const d=curDev(); if(d){ d.maj=today(); d.majAt=nowISO(); genericAuditIfNeeded(d,"Devis modifié"); return trackSave(S.upsertDevis(d)); } return Promise.resolve(true); };
/* v50 : enregistre uniquement les dossiers réellement touchés. Les six
   appels qui réécrivaient tout le portefeuille depuis la mémoire de
   l'onglet passent désormais par ici : un onglet resté ouvert ne repose
   plus son état du matin sur le travail des autres. */
const saveDevisCibles = (liste) => {
  const arr=(liste||[]).filter(Boolean);
  if(!arr.length) return Promise.resolve(true);
  const ts=nowISO();
  for(const d of arr){ d.maj=today(); d.majAt=ts; }
  return trackSave(S.upsertDevisMany(arr));
};
const saveMod = (touch=true) => { const m=curMod(); if(touch&&m){ m.modifiedAt=nowISO(); genericAuditIfNeeded(m,"Modèle modifié"); } return trackSave(S.set(K.mod,JSON.stringify(st.modeles),true)); };
const saveLm  = () => { auditGlobal("Lettres de mission enregistrées","","lettres",""); return trackSave(S.set(K.lm,JSON.stringify(st.lettres),true)); };
const saveCab = () => { auditGlobal("Identité cabinet enregistrée","","cabinet",""); return trackSave(S.set(K.cab,JSON.stringify(st.cab),true)); };
const saveClients = () => trackSave(S.set(K.cli,JSON.stringify(st.clients),true));
const saveSettings = () => { auditGlobal("Réglages enregistrés","","reglages",""); return trackSave(S.set(K.reg,JSON.stringify(st.settings),true)).then(v=>{if(v)cacheBranding();return v;}); };
function auditCard(obj,title="Dernières modifications"){
  const a=(obj?.audit||[]).slice(0,6); if(!a.length) return "";
  return `<details class="card audit-card"><summary class="hd" style="cursor:pointer">${esc(title)}</summary><div class="bd audit-list">${a.map(x=>`<div class="audit-row"><b>${esc(x.label)}</b>${x.detail?`<div>${esc(x.detail)}</div>`:""}<small>${dateTimeFR(x.at)} · ${esc(x.actor||"Utilisateur")}</small></div>`).join("")}</div></details>`;
}
function packFrozenHTML(html){ return String(html||"").split(EXPERTISE_VISUAL).join("__SERRE_EXPERTISE_VISUAL__").split(VALUES_VISUAL).join("__SERRE_VALUES_VISUAL__"); }
function thawFrozenHTML(html){ return String(html||"").split("__SERRE_EXPERTISE_VISUAL__").join(EXPERTISE_VISUAL).split("__SERRE_VALUES_VISUAL__").join(VALUES_VISUAL); }
/* ---------------------------------------------------------------------
   Versions successives des documents

   `d.versions` conserve, dans l'ordre, chaque état transmis au client.
   `d.reouvertures` compte les reprises en main : le numéro de la version
   courante en découle. Les six versions les plus récentes gardent leur
   document complet ; au-delà, seule la fiche signalétique subsiste, pour
   que le dossier ne gonfle pas indéfiniment en base.
   ------------------------------------------------------------------- */
const VERSIONS_COMPLETES_CONSERVEES = 6;
const numeroVersion = d => (+d?.reouvertures||0)+1;

function instantaneDocuments(d,type){
  const m=st.modeles.find(x=>x.id===d.modeleId)||st.modeles[0]; if(!m) return null;
  /* v47 : la résolution de la lettre passe par `letterIdFor` afin que
     l'instantané respecte le rattachement conditionnel visible à l'écran. */
  const liveId=letterIdFor(d,m);
  const L=liveId?(st.lettres.find(l=>l.id===liveId)||null):null;
  return {
    n:numeroVersion(d), type, at:nowISO(), by:actorName(),
    ref:d.ref||"", refLm:d.refLm||"",
    intitule:intituleDevis(d), intituleLm:intituleLettre(d),
    model:JSON.parse(JSON.stringify(m)),
    letter:L?JSON.parse(JSON.stringify(L)):null,
    docs:{devis:packFrozenHTML(devisHTML(d,m)),lm:L?packFrozenHTML(lmHTML(d,m)):""}
  };
}
function elaguerVersions(d){
  const v=d.versions||[];
  if(v.length<=VERSIONS_COMPLETES_CONSERVEES) return;
  for(let i=0;i<v.length-VERSIONS_COMPLETES_CONSERVEES;i++){
    if(v[i]&&v[i].docs){ delete v[i].docs; delete v[i].model; delete v[i].letter; v[i].elaguee=true; }
  }
}
function enregistrerVersion(d,type){
  if(!d) return null;
  const v=instantaneDocuments(d,type); if(!v) return null;
  d.versions=Array.isArray(d.versions)?d.versions:[];
  /* Un même couple (numéro, nature) ne figure qu'une fois : renvoyer deux
     fois le même devis remplace l'instantané au lieu de l'empiler. */
  d.versions=d.versions.filter(x=>!(x&&x.n===v.n&&x.type===type));
  d.versions.push(v);
  d.versions.sort((a,b)=>(a.n-b.n)||String(a.at).localeCompare(String(b.at)));
  elaguerVersions(d);
  return v;
}
/* Instantané d'envoi : trace ce que le client a reçu, sans rien verrouiller. */
function enregistrerEnvoi(d){
  const v=enregistrerVersion(d,"envoi");
  if(v) logAudit(d,"Documents transmis au client",`Version ${v.n} archivée — ${v.ref||"sans référence"}`);
  return v;
}
/* Verrou : posé à la signature du devis, il immobilise le contenu contractuel. */
function freezeDocuments(d){
  if(!d||d.frozenAt) return;
  const v=enregistrerVersion(d,"signature"); if(!v) return;
  d.frozenModel=v.model; d.frozenLetter=v.letter;
  d.frozenDocs={devis:v.docs.devis,lm:v.docs.lm};
  d.frozenAt=v.at; d.frozenBy=v.by;
  logAudit(d,"Dossier verrouillé",`Version ${v.n} signée — contenu contractuel immobilisé`);
}
/* Reprise en main : le verrou tombe, l'instantané est conservé, et le
   parcours de signature revient à l'état « envoyé ». Un devis que l'on
   rouvre pour le modifier n'est plus le devis qui a été signé : le suivi
   doit le dire, sans quoi le tableau de bord mentirait. */
function rouvrirDossier(d,motif){
  if(!d?.frozenAt) return false;
  const n=numeroVersion(d);
  d.versions=Array.isArray(d.versions)?d.versions:[];
  const close=[...d.versions].reverse().find(x=>x&&x.n===n);
  if(close) close.motifReouverture=motif;
  else {
    /* Dossier verrouillé avant la v49 : il n'a pas d'historique de versions.
       On en fabrique une à partir de ses propres instantanés — jamais d'un
       recalcul — pour ne pas perdre ce qui a été transmis au client. */
    d.versions.push({n,type:"signature",at:d.frozenAt,by:d.frozenBy||"",
      ref:d.ref||"",refLm:d.refLm||"",intitule:intituleDevis(d),intituleLm:intituleLettre(d),
      model:d.frozenModel?JSON.parse(JSON.stringify(d.frozenModel)):null,
      letter:d.frozenLetter?JSON.parse(JSON.stringify(d.frozenLetter)):null,
      docs:{devis:d.frozenDocs?.devis||"",lm:d.frozenDocs?.lm||""},
      motifReouverture:motif});
  }
  delete d.frozenAt; delete d.frozenBy; delete d.frozenDocs; delete d.frozenModel; delete d.frozenLetter;
  d.reouvertures=(+d.reouvertures||0)+1;
  const ms=d.manualSign=manualSignState(d.manualSign);
  ms.quoteSigned=false; ms.quoteSignedDate=""; ms.accepted=false; ms.acceptedDate="";
  ms.lmSigned=false;    ms.lmSignedDate="";    ms.filed=false;    ms.filedDate="";
  if(d.sign) d.sign={...d.sign,statut:"",signe:""};
  d.statut=ms.sent?"envoye":(d.ref?"genere":"brouillon");
  logAudit(d,"Reprise en main du dossier",`Version ${n} archivée · nouvelle version ${numeroVersion(d)} · motif : ${motif}`);
  return true;
}
function versionsTransmises(d){ return (d?.versions||[]).filter(Boolean).slice().reverse(); }
/* =====================================================================
   v48 — DATE PROPRE À LA LETTRE DE MISSION
   ---------------------------------------------------------------------
   Le devis et la lettre ne sont pas datés du même jour : la proposition
   part à une date, la lettre est signée à une autre, parfois des semaines
   plus tard. `d.dateLm` porte cette seconde date ; laissée vide, la lettre
   reprend la date du devis, ce qui préserve le comportement antérieur.
   ===================================================================== */
const dateLettre = d => (d && String(d.dateLm||"").trim()) || d?.dateDevis || "";

/* Le champ ci-dessous reste modifiable après l'envoi au client. Le gel
   protège le CONTENU contractuel — périmètre, prix, clauses — figé dans
   `frozenModel` et `frozenLetter`. La date de signature de la lettre, elle,
   n'est connue qu'après coup : la verrouiller obligerait à dupliquer le
   dossier pour une mention purement calendaire. */
const CHAMPS_MODIFIABLES_APRES_GEL = new Set(["dateLm","intitule","intituleLm"]);

/* =====================================================================
   v49 — INTITULÉ LIBRE DU DEVIS ET DE LA LETTRE
   ---------------------------------------------------------------------
   Le titre des documents était figé à « Devis » et « Lettre de mission ».
   Un cabinet qui suit plusieurs missions pour un même client a besoin de
   les distinguer d'un coup d'œil, dans le portefeuille comme dans le
   dossier archivé du client. `d.intitule` et `d.intituleLm` portent ce
   nom ; laissés vides, les libellés d'origine s'appliquent, de sorte que
   les dossiers antérieurs sont inchangés.
   ===================================================================== */
const INTITULE_MAX = 120;
const intituleDevis  = d => String(d?.intitule  ||"").trim().slice(0,INTITULE_MAX) || "Devis";
const intituleLettre = d => String(d?.intituleLm||"").trim().slice(0,INTITULE_MAX) || "Lettre de mission";
/* Intitulé personnalisé ou non : sert au portefeuille et aux listes. */
const intitulePersonnalise = d => !!String(d?.intitule||"").trim();
/* Proposition d'intitulé, affichée en filigrane du champ de saisie. */
function intituleSuggere(d){
  const m=modOf(d), c=String(d?.client?.raison||"").trim();
  const base=m?.titre||"Devis";
  return c?`${base} — ${c}`:base;
}
const nomFichierSain = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"")
  .replace(/[‐-―]/g,"-")                 /* tirets typographiques */
  .replace(/[‘’“”]/g,"'")      /* apostrophes et guillemets courbes */
  .replace(/[\\/:*?"<>|]+/g," ").replace(/\s+/g," ").replace(/\s*-\s*/g," - ").trim().slice(0,70);
function nomFichierDocument(d,type){
  const perso=type==="lm"?String(d?.intituleLm||"").trim():String(d?.intitule||"").trim();
  const ref=type==="lm"?(d?.refLm||""):(d?.ref||"");
  const parts=[ref,nomFichierSain(perso)].filter(Boolean);
  return parts.join(" - ")||(type==="lm"?"lettre-de-mission":"devis");
}

/* Réémet les documents verrouillés à partir des seuls instantanés du
   dossier. Les documents produits sont rigoureusement identiques aux
   précédents, aux champs modifiables près : ni le modèle, ni la trame,
   ni les prix ne sont relus — ils proviennent de `frozenModel` et
   `frozenLetter`, immobilisés à la signature. */
function regenererDocumentsFiges(d){
  if(!d?.frozenAt || !d.frozenDocs || !d.frozenModel) return false;
  const precedent={...d.frozenDocs};
  let ok=false;
  if(precedent.devis){
    d.frozenDocs={...d.frozenDocs,devis:""};
    try{ d.frozenDocs={...d.frozenDocs,devis:packFrozenHTML(devisHTML(d,d.frozenModel))}; ok=true; }
    catch(e){ d.frozenDocs={...d.frozenDocs,devis:precedent.devis}; captureAppError(e,"devis.regeneration"); }
  }
  if(precedent.lm && d.frozenLetter){
    d.frozenDocs={...d.frozenDocs,lm:""};
    try{ d.frozenDocs={...d.frozenDocs,lm:packFrozenHTML(lmHTML(d,d.frozenModel))}; ok=true; }
    catch(e){ d.frozenDocs={...d.frozenDocs,lm:precedent.lm}; captureAppError(e,"lettre.regeneration"); }
  }
  return ok;
}
/* Nom conservé pour les appels antérieurs à la v49. */
const regenererLettreFigee = regenererDocumentsFiges;
const clientDefaults = () => ({ raison:"", forme:"SAS", siren:"", adresse:"", cp:"", ville:"", civilite:"Madame, Monsieur", contact:"", fonction:"Président", email:"", tel:"", rne:null });
const clientPublicData = c => { const x={...clientDefaults()}; for(const k of Object.keys(x)) if(c && c[k]!=null) x[k]=c[k]; return x; };
const normClient = s => String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
function clientMasterOf(d){ return d?.clientId ? st.clients.find(c=>c.id===d.clientId)||null : null; }

/* ==============================================================
   v37 / v38 : la conformité et les notes internes sont portées par la
   fiche client, et non plus par chaque devis. Depuis la v38, la
   conformité prend la forme des deux questionnaires du cabinet
   (acceptation et lutte anti-blanchiment) définis dans 41-questionnaires.
================================================================ */
function ensureClientInternals(c){
  if(!c) return null;
  if(!Array.isArray(c.notes)) c.notes=[];
  ensureQuestionnaires(c);
  return c;
}
function clientNotesOf(d){
  const c=clientMasterOf(d);
  return c?ensureClientInternals(c).notes:[];
}
const confCap = t => String(t||"").charAt(0).toUpperCase()+String(t||"").slice(1);
/* Correspondance de l'ancien contrôle en cinq cases vers les questionnaires. */
const CONF_LEGACY_MAP = { identite:["lab","lab_ent_1"], kbis:["lab","lab_ent_1"], be:["lab","lab_ben_1"], incompat:["accept","acc_fai_1"] };
const CONF_LEGACY_RISK = { faible:"faible", standard:"normal", eleve:"eleve" };
/* Reprise de l'ancien contrôle en cinq cases vers les questionnaires :
   une case cochée vaut une réponse « Oui » à la question correspondante,
   l'ancienne acceptation par l'associé vaut une décision d'acceptation, et
   l'ancien niveau de risque alimente la synthèse anti-blanchiment. Rien
   n'est écrasé : seules les réponses encore vides sont préremplies. */
function applyLegacyConfToQuestionnaires(c,legacyConf){
  if(!c||!legacyConf) return false;
  ensureQuestionnaires(c);
  let changed=false;
  for(const [k,[cible,qid]] of Object.entries(CONF_LEGACY_MAP)){
    if(!legacyConf[k]) continue;
    const store=cible==="lab"?c.lab.answers:c.accept.answers;
    if(!store[qid]){ store[qid]="oui"; changed=true; }
  }
  if(legacyConf.accept && !c.accept.decision){
    c.accept.decision="accepter";
    c.accept.decisionAt=c.accept.decisionAt||nowISO();
    c.accept.decisionBy=c.accept.decisionBy||"Reprise automatique";
    changed=true;
  }
  const r=CONF_LEGACY_RISK[String(legacyConf.risque||"")]||"";
  if(r && (LAB_RISK_RANK[r]??0)>(LAB_RISK_RANK[c.lab.risk.synthese]??-1)){
    c.lab.risk.synthese=r; changed=true;
  }
  return changed;
}
/* Reprise des données historiques : conformité et notes des devis remontent
   sur la fiche client correspondante, puis sont retirées du devis. */
function migrateInternalsToClients(){
  let changedDevis=false, changedClients=false;
  for(const c of st.clients||[]){
    if(!Array.isArray(c.notes) || !c.lab || !c.accept){ ensureClientInternals(c); changedClients=true; }
    /* Contrôle hérité stocké sur la fiche client par la v37. */
    if(c.conf && typeof c.conf==="object"){
      applyLegacyConfToQuestionnaires(c,c.conf);
      delete c.conf; changedClients=true;
    }
  }
  for(const d of st.devis||[]){
    const legacyConf=(d.conf && typeof d.conf==="object")?d.conf:null;
    const legacyNote=typeof d.notes==="string"?d.notes.trim():"";
    const legacyComments=Array.isArray(d.internalComments)?d.internalComments:[];
    const legacySuivi=("checklist" in d) || ("reminder" in d);
    if(!legacyConf && !legacyNote && !legacyComments.length && !legacySuivi) continue;
    const c=clientMasterOf(d);
    if(!c) continue; /* pas encore de fiche client : on conserve l'existant tel quel */
    ensureClientInternals(c);
    if(legacyConf) applyLegacyConfToQuestionnaires(c,legacyConf);
    const add=[];
    for(const x of legacyComments) add.push({id:x.id||uid(),at:x.at||d.majAt||d.cree||nowISO(),author:x.author||"Utilisateur",text:String(x.text||""),origin:d.ref||""});
    /* v39 : un rappel encore ouvert ne doit pas disparaître silencieusement. */
    const rem=d.reminder&&typeof d.reminder==="object"?d.reminder:null;
    if(rem && !rem.done && (rem.date||String(rem.note||"").trim())){
      const bits=[rem.date?`échéance ${dateFR(rem.date)}`:"",rem.channel?`canal ${rem.channel}`:"",String(rem.note||"").trim()].filter(Boolean);
      add.push({id:uid(),at:d.majAt||d.cree||nowISO(),author:"Reprise automatique",text:`Rappel repris de l'ancien suivi interne — ${bits.join(" · ")}`,origin:d.ref||""});
    }
    if(legacyNote) add.push({id:uid(),at:d.majAt||d.cree||nowISO(),author:"Reprise automatique",text:legacyNote,origin:d.ref||""});
    const seen=new Set(c.notes.map(n=>`${n.at}|${n.text}`));
    for(const n of add){ const k=`${n.at}|${n.text}`; if(String(n.text).trim() && !seen.has(k)){ c.notes.push(n); seen.add(k); } }
    c.notes.sort((a,b)=>String(b.at||"").localeCompare(String(a.at||"")));
    c.notes=c.notes.slice(0,200);
    delete d.conf; delete d.notes; delete d.internalComments;
    delete d.checklist; delete d.reminder;
    changedClients=true; changedDevis=true;
  }
  return {changedDevis,changedClients};
}
/* ======================================================================
   v41 — Pré-marquage des débours dans les modèles existants.

   Une prestation dont le libellé désigne sans ambiguïté un débours (frais de
   greffe, annonce légale, INPI, BODACC, enregistrement, formalités…) est
   marquée `debours:true` une seule fois, à la première ouverture. Le marqueur
   de version posé sur le modèle garantit qu'un décochage manuel n'est jamais
   réécrasé.
   ====================================================================== */
const DEBOURS_DETECT_VERSION = "v41-debours-1";
const DEBOURS_MOTIFS = [
  /\bgreffe/, /annonce\s*l[eé]gale/, /\bbodacc\b/, /\binpi\b/,
  /journal\s+d[eu]?\s*annonces/, /frais\s+d.enregistrement/, /droit[s]?\s+d.enregistrement/,
  /frais\s+de\s+formalit/, /d[eé]bours/, /publication\s+l[eé]gale/, /\bcfe\b/,
  /frais\s+de\s+publicit[eé]/, /frais\s+de\s+d[eé]p[oô]t/
];
const libelleEstDebours = label => {
  const x=String(label||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
  return DEBOURS_MOTIFS.some(re=>re.test(x));
};
function preMarquerDeboursModeles(){
  const touchees=[];
  let changed=false;
  for(const m of st.modeles||[]){
    if(m.deboursDetectVersion===DEBOURS_DETECT_VERSION) continue;
    for(const sec of m.sections||[]) for(const it of sec.items||[]){
      if(it.prix && it.debours===undefined && libelleEstDebours(it.label)){
        it.debours=true; touchees.push(`${m.titre} · ${it.label}`);
      }
    }
    for(const e of m.exc||[]){
      if(e.debours===undefined && libelleEstDebours(e.label)){
        e.debours=true; touchees.push(`${m.titre} · ${e.label} (exceptionnelle)`);
      }
    }
    m.deboursDetectVersion=DEBOURS_DETECT_VERSION;
    changed=true;
  }
  if(touchees.length) auditGlobal("Lignes pré-marquées comme débours",touchees.join(" | "),"modeles","");
  return {changed,touchees};
}
function sirenKey(v){
  const s=String(v||"").replace(/\D/g,"");
  return s.length>=9 ? s.slice(0,9) : s;
}
function duplicateClientBySiren(data, excludeId=""){
  const key=sirenKey(data?.siren);
  if(key.length!==9) return null;
  return st.clients.find(c=>c.id!==excludeId && sirenKey(c.siren)===key)||null;
}
function sameClient(a,b){
  if(!a||!b) return false;
  const sa=sirenKey(a.siren), sb=sirenKey(b.siren);
  if(sa.length===9 && sb.length===9) return sa===sb;
  const na=normClient(a.raison), nb=normClient(b.raison);
  if(!na||na!==nb) return false;
  const ea=String(a.email||"").trim().toLowerCase(), eb=String(b.email||"").trim().toLowerCase();
  const ca=String(a.cp||"").trim(), cb=String(b.cp||"").trim();
  return (!ea||!eb||ea===eb) && (!ca||!cb||ca===cb);
}
function clientFormCode(d){
  const x=normLabel(d?.client?.forme||"");
  if(!x) return "";
  if(/association/.test(x)) return "ASSOCIATION";
  if(/selasu/.test(x)) return "SASU";
  if(/selas/.test(x)) return "SAS";
  if(/sasu|actions simplifiee unipersonnelle/.test(x)) return "SASU";
  if(/eurl|responsabilite limitee unipersonnelle/.test(x)) return "EURL";
  if(/selarl/.test(x)) return "SELARL";
  if(/sarl|responsabilite limitee/.test(x)) return "SARL";
  if(/\bsas\b|actions simplifiee/.test(x)) return "SAS";
  if(/\bsa\b|societe anonyme/.test(x)) return "SA";
  if(/snc|nom collectif/.test(x)) return "SNC";
  if(/societe civile|\bsci\b/.test(x)) return "CIVILE";
  if(/entreprise individuelle|\be i\b|\bei\b/.test(x)) return "EI";
  return "";
}
function clientFormLabel(d){
  return ({EI:"Entreprise individuelle",EURL:"EURL",SARL:"SARL",SASU:"SASU",SAS:"SAS",SA:"SA",SELARL:"SELARL",SNC:"SNC",CIVILE:"Société civile",ASSOCIATION:"Association"})[clientFormCode(d)]||String(d?.client?.forme||"").trim()||"la forme renseignée";
}

const AUTO_QUALITIES = new Set([
  "gérant","gérante","président","présidente","entrepreneur individuel",
  "entrepreneuse individuelle","représentant légal","représentante légale"
]);
function autoQualityBase(forme){
  const x=normLabel(forme||"");
  if(/entreprise individuelle|\bei\b/.test(x)) return "ENTREPRENEUR";
  if(/eurl|sarl|selarl|snc|societe civile|\bsci\b/.test(x)) return "GERANT";
  if(/sasu|\bsas\b|selas|\bsa\b|association/.test(x)) return "PRESIDENT";
  return "REPRESENTANT";
}
function genderedQuality(base,civilite){
  const fem=String(civilite||"")==="Madame";
  if(base==="GERANT") return fem?"Gérante":"Gérant";
  if(base==="PRESIDENT") return fem?"Présidente":"Président";
  if(base==="ENTREPRENEUR") return fem?"Entrepreneuse individuelle":"Entrepreneur individuel";
  return fem?"Représentante légale":"Représentant légal";
}
function qualityFromForm(forme,civilite){
  return genderedQuality(autoQualityBase(forme),civilite);
}
function isAutoQuality(v){
  return !String(v||"").trim() || AUTO_QUALITIES.has(String(v||"").trim().toLowerCase());
}
function qualityMatchesForm(role,forme){
  const r=normLabel(role||""), b=autoQualityBase(forme);
  if(!r) return false;
  if(b==="GERANT") return /gerant|cogerant/.test(r);
  if(b==="PRESIDENT") return /president/.test(r);
  if(b==="ENTREPRENEUR") return /entrepreneur|exploitant/.test(r);
  return /representant legal/.test(r);
}
function rnePrimaryLeader(c){
  const list=Array.isArray(c?.dirigeants)?c.dirigeants.filter(p=>p&&p.nom):[];
  if(!list.length) return null;
  const individuals=list.filter(p=>String(p.typePersonne||"").toUpperCase()!=="ENTREPRISE");
  const pool=individuals.length?individuals:list;
  return pool.find(p=>qualityMatchesForm(p.role,c?.formeJuridique)) ||
         pool.find(p=>/president|gerant|entrepreneur|representant legal/.test(normLabel(p.role||""))) ||
         pool[0] || null;
}
function applyAutomaticSignatory(d,company,{forceContact=true,forceQuality=true}={}){
  if(!d?.client) return null;
  const p=rnePrimaryLeader(company);
  if(p && forceContact && p.nom) d.client.contact=p.nom;
  if(p?.civilite) d.client.civilite=p.civilite;

  const rneRole=(p?.role && !/^\d+$/.test(String(p.role)))?String(p.role).trim():"";
  if(forceQuality || isAutoQuality(d.client.fonction)){
    d.client.fonction = rneRole && qualityMatchesForm(rneRole,company?.formeJuridique||d.client.forme)
      ? rneRole
      : qualityFromForm(company?.formeJuridique||d.client.forme,d.client.civilite);
  }
  return p;
}
function syncAutomaticQuality(d, force=false){
  if(!d?.client) return;
  if(force || isAutoQuality(d.client.fonction)){
    d.client.fonction=qualityFromForm(d.client.forme,d.client.civilite);
  }
}
function isLegalSection(s){
  return normLabel(`${s?.titre||""} ${s?.tag||""}`).includes("juridique");
}
function itemApplicableForClient(d,s,it){
  if(!isLegalSection(s)) return true;
  const code=clientFormCode(d), l=normLabel(it?.label||"");
  if(!code) return true;
  if(l.includes("conditions particulieres")) return true;
  /* EI : pas de secrétariat juridique sociétaire standard. */
  if(code==="EI") return false;
  /* Structures unipersonnelles : pas de convocation/assistance à une assemblée
     pluraliste dans le questionnaire standard ; les décisions de l'associé unique
     restent couvertes par le secrétariat juridique annuel. */
  if((code==="SASU"||code==="EURL") && (/convocation|assemblee generale/.test(l))) return false;
  /* Association : pas de formalité annuelle de publicité des comptes par défaut
     dans cette trame générique. Les obligations spécifiques restent ajoutables
     via le modèle ou un texte libre. */
  if(code==="ASSOCIATION" && /publicite annuelle/.test(l)) return false;
  return true;
}
function syncClientFormToModel(d,m){
  if(!d||!m) return;
  const code=clientFormCode(d); if(!code) return;
  const aliases={
    EI:["e i","ei","entreprise individuelle"], EURL:["eurl"], SARL:["sarl"],
    SASU:["sasu"], SAS:["sas"], SA:["sa"], SELARL:["selarl"], SNC:["snc"],
    ASSOCIATION:["association"]
  };
  const it=m.sections.flatMap(s=>s.items).find(x=>(x.cle||"")==="forme" || normLabel(x.label).includes("forme juridique"));
  if(!it || !["liste","ouinon"].includes(it.type)) return;
  const wanted=aliases[code]||[];
  const r=it.reponses.find(r=>wanted.includes(normLabel(r.label)));
  if(r) d.rep[it.id]=r.id;
}
function ensureClientForDevis(d, create=true, updateMaster=true){
  if(!d) return null;
  d.client={...clientDefaults(),...(d.client||{})};
  let c=clientMasterOf(d);
  if(!c && d.client.raison) c=st.clients.find(x=>sameClient(x,d.client))||null;
  if(!c && create && d.client.raison){
    c={id:uid(),...clientPublicData(d.client),archive:false,cree:d.cree||today(),maj:d.maj||today()};
    ensureClientInternals(c);
    st.clients.push(c);
  }
  if(c){
    ensureClientInternals(c);
    d.clientId=c.id;
    if(updateMaster){
      const keepArchive=!!c.archive, keepCree=c.cree||d.cree||today();
      Object.assign(c,clientPublicData(d.client),{id:c.id,archive:keepArchive,cree:keepCree,maj:today()});
    }
  }
  return c;
}
function applyClientToDevis(d,c){
  if(!d||!c) return;
  d.clientId=c.id; d.client=clientPublicData(c);
}

function rneStateFor(d){
  if(!st.rne || st.rne.devId!==d?.id){
    st.rne={devId:d?.id||"",query:String(d?.client?.siren||d?.client?.raison||""),loading:false,error:"",results:[],selected:null};
  }
  return st.rne;
}
function rneAddr(c){
  const a=c?.adresse||{};
  return [a.ligne1,a.ligne2].filter(Boolean).join(", ");
}
function rneCapital(c){
  const n=Number(c?.capital);
  if(!Number.isFinite(n)) return "";
  return `${new Intl.NumberFormat("fr-FR",{maximumFractionDigits:2}).format(n)} ${c?.deviseCapital||"EUR"}`;
}
function rneDate(v){
  if(!v) return "";
  const d=new Date(v);
  return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString("fr-FR");
}
function rneCompanySummary(c){
  return [c?.formeJuridique,c?.siren?`SIREN ${c.siren}`:"",c?.adresse?.cp,c?.adresse?.ville].filter(Boolean).join(" · ");
}
function rnePreviewHTML(d){
  const rs=rneStateFor(d);
  if(rs.loading) return `<div class="rne-skeleton" aria-label="Recherche RNE en cours">
    <div class="skeleton skeleton-line lg"></div>
    <div class="skeleton skeleton-line md"></div>
    <div class="skeleton skeleton-line sm"></div>
    <div class="hint" style="margin-top:10px">Recherche et import RNE en cours… Le premier appel peut être plus long si Render sort de veille.</div>
  </div>`;
  if(rs.error) return `<div class="notice bad" style="margin-top:12px"><b>Recherche RNE impossible</b><br>${esc(rs.error)}</div>`;
  if(rs.results.length){
    return `<div style="margin-top:12px">
      <div class="hint" style="margin-bottom:7px">Plusieurs entreprises correspondent à la recherche. Cliquez simplement sur la bonne entreprise : toutes les données RNE disponibles seront importées automatiquement, représentant légal inclus.</div>
      <table><thead><tr><th>Entreprise trouvée</th><th>Identification</th><th></th></tr></thead><tbody>
        ${rs.results.map((x,i)=>`<tr style="cursor:pointer" data-act="rneUse" data-index="${i}" title="Importer cette entreprise">
          <td><b>${esc(x.denomination||"Entreprise")}</b>${x.nomCommercial?`<div class="dim">${esc(x.nomCommercial)}</div>`:""}</td>
          <td>${esc(rneCompanySummary(x)||"—")}</td>
          <td class="r"><button class="btn sm p" data-act="rneUse" data-index="${i}">Utiliser</button></td>
        </tr>`).join("")}
      </tbody></table>
    </div>`;
  }
  return "";
}
function rneImportedInfoHTML(d){
  const r=d?.client?.rne;
  if(!r) return "";
  const bits=[
    r.dateCreation?`Création ${rneDate(r.dateCreation)}`:"",
    r.codeApe?`APE ${r.codeApe}`:"",
    r.capital!=null?`Capital ${rneCapital(r)}`:"",
    r.activite?`Activité : ${r.activite}`:""
  ].filter(Boolean);
  if(!bits.length) return "";
  return `<div class="notice vert" style="margin-top:10px"><b>Données RNE importées</b><br>${bits.map(esc).join(" · ")}<div class="hint" style="margin-top:4px">Source : RNE / INPI · ${r.importedAt?dateTimeFR(r.importedAt):""}</div></div>`;
}
/* v58.9 : un devis « sans suite » est archivé au même titre qu'un dossier
   dont la fiche client est archivée : il sort du portefeuille actif, de
   l'accueil, des notifications et des relances ; le filtre « Archivés »
   du portefeuille le retrouve. « Réactiver » le remet en service. */
function isArchivedDevis(d){ return !!clientMasterOf(d)?.archive || !!d?.sansSuite; }
function clientHistory(d){
  const c=clientMasterOf(d);
  if(!c) return [];
  return st.devis.filter(x=>x.clientId===c.id).sort((a,b)=>String(b.cree||"").localeCompare(String(a.cree||"")));
}

function newDevis(modeleId){
  const d={ id:uid(), modeleId, statut:"brouillon", ref:"", refLm:"", cree:today(), creeAt:nowISO(), maj:today(), majAt:nowISO(), clientId:"",
    client:clientDefaults(),
    rep:{}, prix:{}, catPrix:{}, off:{}, offSec:{}, exc:{}, excPrix:{}, deb:[],
    dateDevis:today(), dateLm:"", validite:30, duree:12, dateDebutDossier:"", debut:"", preavis:3, tacite:true, nature:"NP2300", referentiel:REFERENTIEL_DEFAULT, rgpdMode:"mixte", justifSeuilEnabled:false, justifSeuil:100,
    intitule:"", intituleLm:"", versions:[], reouvertures:0,
    markers:[], ownerEmail:SB_USER?.email||"",
    sign:{ id:"", statut:"", envoye:"", signe:"" },
    manualSign:{ sent:false, sentDate:"", quoteSigned:false, quoteSignedDate:"", accepted:false, acceptedDate:"", lmSigned:false, lmSignedDate:"", filed:false, filedDate:"" } };
  d.markers=defaultMarkersForModel(modOf(d));
  syncClientFormToModel(d,modOf(d));
  syncAutomaticQuality(d,true);
  logAudit(d,"Devis créé"); return d;
}
const STATUTS = { brouillon:["Brouillon","gris"], genere:["Devis établi","ocre"], envoye:["Envoyé pour signature","ocre"],
  valide:["Validé par le client","vert"], signe:["Signé","vert"], classe:["Classé","vert"], refuse:["Refusé","rouge"], expire:["Expiré","rouge"], sans_suite:["Sans suite","gris"] };
/* Points restant à traiter avant de pouvoir engager la mission : ils
   proviennent des questionnaires d'acceptation et anti-blanchiment. */
function controleConformite(d){
  return acceptationEtat(d).blocages;
}
/* v45 — La question « le questionnaire LAB a-t-il été complété ? » du
   questionnaire d'acceptation était déduite ; elle se répond désormais à la
   main, comme toutes les autres. Pour ne pas rouvrir des dossiers déjà
   terminés, on inscrit « Oui » là où le questionnaire LAB est complet et où
   la réponse est encore vide. Rien d'autre n'est touché. */
function migrerReponseLabAcceptation(){
  let n=0;
  for(const c of (st.clients||[])){
    ensureQuestionnaires(c);
    if(!c.accept.answers.acc_lab_1 && labState(c).complet){ c.accept.answers.acc_lab_1="oui"; n++; }
  }
  return n;
}
/* v45 : ce qui reste à faire au titre du LAB — signalé partout, bloquant
   nulle part, les deux pièces étant établies ensemble. */
function rappelsConformite(d){
  return acceptationEtat(d).rappels||[];
}
function blocagesSignature(d){
  const b=[], avecLm=hasLettreMission(d);
  if(!d.ref || (avecLm&&!d.refLm)) b.push(avecLm?"valider le devis pour attribuer les références DEV et LM":"valider le devis pour attribuer la référence DEV");
  if(!d.client?.email||!emailOk(d.client.email)) b.push("renseigner un courriel valide");
  if(!st.cab.nom) b.push("renseigner l'identité du cabinet");
  if(st.ys.auth==="otp_sms"&&!String(d.client?.tel||"").trim()) b.push("renseigner le mobile pour le code SMS");
  for(const x of controleConformite(d)) b.push(x);
  return b;
}
function refsLocales(){
  const y=new Date().getFullYear();
  let max=0;
  for(const x of st.devis){ const m=String(x.ref||"").match(new RegExp(`^DEV-${y}-(\\d+)$`)); if(m) max=Math.max(max,+m[1]||0); }
  const n=String(max+1).padStart(4,"0");
  return {devis:`DEV-${y}-${n}`,lm:`LM-${y}-${n}`};
}

