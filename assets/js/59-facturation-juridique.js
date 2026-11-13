/* =====================================================================
   v55 — FACTURATION JURIDIQUE (accès réservé)
   ---------------------------------------------------------------------
   Suivi des missions juridiques, du projet à la facturation : dépôt au
   greffe, fin de formalité, mois de facturation.

   CONFIDENTIALITÉ. Les lignes vivent dans la table Supabase
   `facturation_juridique`, dont les politiques RLS ne laissent passer que
   les comptes inscrits dans `facturation_juridique_acces` (script v55).
   Ce module n'affiche l'écran qu'à ces comptes ; mais la protection réelle
   est celle de la base, pas celle de l'écran.
   En conséquence, rien de ce module n'est écrit dans les journaux partagés
   (audit, erreurs), ni dans `app_state`, ni dans les sauvegardes globales.
   ===================================================================== */

const FJ = {
  acces: false,        /* réponse de la base : ce compte est-il autorisé ? */
  lignes: [],
  erreur: "",
  onglet: "encours",   /* encours | factures | stats */
  filtreEtape: "",     /* étape d'avancement filtrée dans « Dossiers en cours » */
  exerciceFactures: null,
  recherche: "",
  tri: "facturation",
  colonneEcarte: false, /* script v55.1 passé : les retraits sont conservés en base */
  colonneEtat: false,   /* script v55.4 passé : état, avancement, débours */
  colonneClient: false, /* script v55.9 passé : rattachement à la fiche client */
  reglagesEnBase: false,
  reglages: { types: null, modeles: null, familles: null, etapes: null, options: null },  /* null = valeurs par défaut */
  exercice: null,      /* année de début de l'exercice affiché (juin → mai) */
  derniereSync: 0
};

/* Liste fermée par défaut (types relevés dans le fichier du cabinet) ;
   remplacée par la liste enregistrée dans « Gérer les listes ». */
const FJ_TYPES = [
  "2777 et dividendes", "AGOA", "Conventions (tréso / MF / C.C / obligations / bail)", "CAMP",
  "Cession d'actions / parts sociales", "Constitution Uni", "Constitution Pluri", "Constitution SCI",
  "Constitution par apport", "Dépôt marque", "Dissolution / Liquidation", "Evaluation",
  "Etablissement supplémentaire", "JLT", "Modif date de clôture", "Modification d'objet social",
  "Modification Présidence", "Modifications multiples", "Opérations capitalistiques",
  "Transformation en SAS", "Transformation en SARL", "Transfert de siège", "TUP / Fusion"
];

const FJ_MASQUES_STORAGE = "serre:fj:dossiers-ignores";

/* ------------------------------------------------------------ données */
async function fjInitialiser(){
  FJ.acces=false; FJ.lignes=[]; FJ.erreur="";
  if(!(SB && SB_USER)) return;
  try{
    const {data,error}=await SB.rpc("a_acces_facturation_juridique");
    if(error || data!==true) return;   /* fonction absente ou compte non autorisé : rien ne s'affiche */
    FJ.acces=true;
    try{ const {error:e2}=await SB.from("facturation_juridique").select("ecarte").limit(1); FJ.colonneEcarte=!e2; }catch(_){ FJ.colonneEcarte=false; }
    try{ const {error:e3}=await SB.from("facturation_juridique").select("etat,avancement,debours_jal").limit(1); FJ.colonneEtat=!e3; }catch(_){ FJ.colonneEtat=false; }
    try{ const {error:e4}=await SB.from("facturation_juridique").select("client_id").limit(1); FJ.colonneClient=!e4; }catch(_){ FJ.colonneClient=false; }
    await fjChargerReglages();
    await fjCharger();
    const n=await fjSynchroniser();
    if(n) setTimeout(()=>toast(`Facturation juridique : ${n} dossier(s) reclassé(s) transféré(s) automatiquement.`),1200);
  }catch(_){ FJ.acces=false; }
}

/* Lignes affichées : hors dossiers retirés du suivi. */
const fjVisibles = () => FJ.lignes.filter(l=>!l.ecarte);

/* =====================================================================
   v55.2 — RÉGLAGES : liste fermée des types, modèles transférés
   ===================================================================== */
async function fjChargerReglages(){
  try{
    const {data,error}=await SB.from("facturation_juridique_reglages").select("cle,valeur");
    if(error){ FJ.reglagesEnBase=false; return; }
    FJ.reglagesEnBase=true;
    for(const r of data||[]) if(r.cle in FJ.reglages) FJ.reglages[r.cle]=r.valeur;
  }catch(_){ FJ.reglagesEnBase=false; }
}
async function fjEnregistrerReglage(cle,valeur){
  if(!FJ.reglagesEnBase){ toast("Relancez le script v55 dans Supabase pour enregistrer ces réglages.",true); return false; }
  const {error}=await SB.from("facturation_juridique_reglages").upsert({cle,valeur,updated_at:new Date().toISOString()},{onConflict:"cle"});
  if(error){ toast("Réglage non enregistré : "+error.message,true); return false; }
  FJ.reglages[cle]=valeur; return true;
}
const fjTypes = () => Array.isArray(FJ.reglages.types)&&FJ.reglages.types.length ? FJ.reglages.types : FJ_TYPES;

/* Modèles « Mission juridique exceptionnelle » : choisis dans les réglages ;
   à défaut, tout modèle dont le titre contient « juridique exceptionnel ». */
function fjModeleParDefaut(m){ return /juridique exceptionnel/.test(normClient(m?.titre||"")); }
function fjModeleRetenu(m){
  if(!m) return false;
  if(Array.isArray(FJ.reglages.modeles)) return FJ.reglages.modeles.includes(m.id);
  return fjModeleParDefaut(m);
}

/* =====================================================================
   v55.2 — TRANSFERT AUTOMATIQUE
   Un dossier établi sur le modèle « Mission juridique exceptionnelle »
   reçoit sa ligne de suivi dès qu'il est RECLASSÉ dans l'outil (étape
   « Dossier classé »), quel que soit le collaborateur qui l'a classé.
   Les devis classiques ne sont jamais transférés (pas d'AGOA).

   Le transfert se fait depuis le compte autorisé : au chargement de
   l'application, puis à chaque retour sur l'écran. Seuls les dossiers
   classés à partir de la mise en service sont transférés d'office ; les
   plus anciens sont proposés dans la liste « non encore suivis ».
   Aucun rapprochement automatique avec les lignes existantes : un client
   peut avoir plusieurs opérations, le lien se fait à la main.
   ===================================================================== */
function fjDateDepart(){
  const dates=FJ.lignes.map(l=>String(l.created_at||"").slice(0,10)).filter(Boolean).sort();
  return dates[0]||today();
}

async function fjSynchroniser(){
  FJ.derniereSync=Date.now();
  if(!FJ.acces) return 0;
  const depart=fjDateDepart();
  const candidats=fjDossiersASuivre().filter(x=>String(x.date||"").slice(0,10)>=depart);
  let n=0;
  for(const {d} of candidats){
    /* Plusieurs comptes ont accès : on revérifie en base, juste avant la
       création, qu'un autre ne vient pas de transférer ce dossier. */
    try{ const {data:deja}=await SB.from("facturation_juridique").select("id").eq("devis_id",d.id).limit(1); if(deja?.length){ await fjCharger(); continue; } }catch(_){}
    const {data,error}=await SB.from("facturation_juridique").insert(fjLigneVersBase(fjDepuisDossier(d))).select();
    if(error){ console.warn("Transfert juridique",error.message); continue; }
    if(data?.[0]){ FJ.lignes.push(data[0]); n++; }
  }
  return n;
}

async function fjCharger(){
  const {data,error}=await SB.from("facturation_juridique").select("*").order("created_at",{ascending:true});
  if(error){ FJ.erreur=error.message; return false; }
  FJ.lignes=data||[]; FJ.erreur=""; return true;
}

function fjLigneVersBase(l){
  const num=v=>{ const n=fjMontant(v); return Number.isFinite(n)?n:null; };
  const d=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||""))?v:null;
  /* Firefox n'a pas de sélecteur de mois : on accepte aussi « 10/2026 », « oct-26 ». */
  const mois=v=>{ const x=/^\d{4}-\d{2}/.test(String(v||""))?String(v).slice(0,7):fjLireMois(v); return x?x+"-01":null; };
  const t=v=>{ const s=String(v??"").trim(); return s||null; };
  return {
    dossier:String(l.dossier||"").trim(),
    type_operation:t(l.type_operation), mission:t(l.mission), honoraires:num(l.honoraires),
    date_projet:d(l.date_projet), date_signature:d(l.date_signature),
    date_depot_gtc:d(l.date_depot_gtc), date_fin_formalite:d(l.date_fin_formalite),
    mois_facturation:mois(l.mois_facturation), commentaires:t(l.commentaires),
    devis_id:t(l.devis_id),
    ...(l.ecarte===true?{ecarte:true}:{}),
    ...(FJ.colonneClient?{client_id:t(l.client_id)}:{}),
    ...(FJ.colonneEtat?{
      etat:l.etat==="facture"?"facture":"encours",
      avancement:t(l.avancement),
      debours_greffe_tva:num(l.debours_greffe_tva), debours_greffe_hors_tva:num(l.debours_greffe_hors_tva),
      debours_jal:num(l.debours_jal), debours_enregistrement:num(l.debours_enregistrement)
    }:{})
  };
}

async function fjEnregistrer(ligne){
  const row=fjLigneVersBase(ligne);
  if(!row.dossier){ toast("Le nom du dossier est obligatoire.",true); return false; }
  const q=ligne.id
    ? SB.from("facturation_juridique").update(row).eq("id",ligne.id).select()
    : SB.from("facturation_juridique").insert(row).select();
  const {data,error}=await q;
  if(error){ toast("Enregistrement impossible : "+error.message,true); return false; }
  const enreg=data?.[0];
  if(!enreg){ toast("Enregistrement refusé par la base (droits).",true); return false; }
  const i=FJ.lignes.findIndex(x=>x.id===enreg.id);
  if(i>=0) FJ.lignes[i]=enreg; else FJ.lignes.push(enreg);
  return true;
}

async function fjSupprimer(id){
  const l=FJ.lignes.find(x=>x.id===id);
  /* Ligne liée à un dossier de devis : on la marque retirée au lieu de
     l'effacer, sinon le transfert automatique la recréerait. */
  if(l?.devis_id){
    if(FJ.colonneEcarte){
      const {data,error}=await SB.from("facturation_juridique").update({ecarte:true}).eq("id",id).select();
      if(error||!data?.length){ toast("Retrait impossible"+(error?" : "+error.message:"."),true); return false; }
      Object.assign(l,data[0]); return true;
    }
    fjMasquer(l.devis_id);
  }
  const {data,error}=await SB.from("facturation_juridique").delete().eq("id",id).select("id");
  if(error||!data?.length){ toast("Suppression impossible"+(error?" : "+error.message:"."),true); return false; }
  FJ.lignes=FJ.lignes.filter(x=>x.id!==id); return true;
}

/* ------------------------------------------------------------ calculs */
function fjMontant(v){
  if(v===null||v===undefined||v==="") return NaN;
  if(typeof v==="number") return v;
  const s=String(v).replace(/[\s €]/g,"").replace(/\.(?=\d{3}(\D|$))/g,"").replace(",",".");
  return s===""?NaN:Number(s);
}
const fjMois = iso => { if(!iso) return ""; const [a,m]=String(iso).split("-"); return `${m}/${a}`; };
const fjMoisLong = iso => { if(!iso) return ""; const d=new Date(String(iso).slice(0,7)+"-01T00:00:00"); return d.toLocaleDateString("fr-FR",{month:"long",year:"numeric"}); };

/* =====================================================================
   v55.3 — EXERCICE DE JUIN À MAI ET TABLEAUX DE BORD
   Reprend les feuilles « Données » du classeur : totaux par mois avec
   comparaison N-1 et part JLT, totaux par type, totaux par famille.
   Le mois retenu est le mois de rattachement (colonne Facturation).
   ===================================================================== */
const FJ_FAMILLES_DEFAUT = {
  "Constitution":["Constitution par apport","Constitution Pluri","Constitution SCI","Constitution Uni"],
  "Transformation":["Transformation en SARL","Transformation en SAS"],
  "AGOA + Dividendes":["2777 et dividendes","AGOA"],
  "Dissolution - Liquidation - TUP":["Dissolution / Liquidation","CAMP","TUP / Fusion"],
  "Evaluation":["Evaluation"],
  "Modifications statutaires":["Modif date de clôture","Modification d'objet social","Modification Présidence","Modifications multiples","Transfert de siège","Opérations capitalistiques"],
  "JLT":["JLT"],
  "Conventions + Cessions de titres":["Cession d'actions / parts sociales","Conventions (tréso / MF / C.C / obligations / bail)"],
  "Autres":["Dépôt marque","Etablissement supplémentaire"]
};
const fjFamilles = () => FJ.reglages.familles&&typeof FJ.reglages.familles==="object"&&Object.keys(FJ.reglages.familles).length ? FJ.reglages.familles : FJ_FAMILLES_DEFAUT;
function fjFamilleDe(type){ for(const [f,ts] of Object.entries(fjFamilles())) if((ts||[]).includes(type)) return f; return type?"Non classé":"Sans type"; }

/* Exercice : de juin N à mai N+1, désigné par N. */
const fjExerciceDe = iso => { const [a,m]=String(iso).split("-").map(Number); return m>=6?a:a-1; };
const fjLibelleExercice = n => `06.${String(n).slice(2)} au 05.${String(n+1).slice(2)}`;
const fjMoisExercice = n => Array.from({length:12},(_,i)=>{ const m=(5+i)%12+1, a=i<7?n:n+1; return `${a}-${String(m).padStart(2,"0")}`; });
const fjEstJlt = l => l.type_operation==="JLT" || normClient(l.dossier)==="jlt";

function fjExercicesDisponibles(){
  const set=new Set(fjVisibles().filter(l=>l.mois_facturation).map(l=>fjExerciceDe(l.mois_facturation)));
  set.add(fjExerciceDe(today()));
  return [...set].sort((a,b)=>b-a);
}

/* --------------------------------------------------------------- vue */
/* =====================================================================
   v55.4 — TROIS ONGLETS : dossiers en cours · facturés · statistiques
   - L'état (en cours / facturé) se décide à la main : « Passer en
     facturation » ouvre la saisie du mois de rattachement et des débours.
   - Les statistiques ne comptent que les lignes facturées.
   - Code couleur d'avancement entièrement paramétrable (Gérer les listes).
   ===================================================================== */
const fjEtatsDe = l => l.etat==="facture" ? "facture" : "encours";
const fjEncours = () => fjVisibles().filter(l=>fjEtatsDe(l)==="encours");
const fjFactures = () => fjVisibles().filter(l=>fjEtatsDe(l)==="facture");
const FJ_DEBOURS = [
  ["debours_greffe_tva","Frais de greffe soumis à TVA"],
  ["debours_greffe_hors_tva","Frais de greffe non soumis à TVA"],
  ["debours_jal","JAL"],
  ["debours_enregistrement","Enregistrement"]
];
const FJ_DEBOURS_COURTS = { debours_greffe_tva:"Greffe TVA", debours_greffe_hors_tva:"Greffe hors TVA", debours_jal:"JAL", debours_enregistrement:"Enreg." };
const fjTotalDebours = l => FJ_DEBOURS.reduce((a,[k])=>a+(+l[k]||0),0);
const FJ_CHAMPS_DATE = [["","— Aucune (à choisir à la main) —"],["date_projet","Envoi du projet d'acte"],["date_signature","Signature des actes"],["date_depot_gtc","Dépôt GTC"],["date_fin_formalite","Fin de formalité"]];
const FJ_ETAPES_DEFAUT = [
  {id:"a_demarrer", libelle:"À démarrer",          couleur:"#9AA3A0", date:""},
  {id:"projet",     libelle:"Projet envoyé",       couleur:"#3B82C4", date:"date_projet"},
  {id:"signe",      libelle:"Actes signés",        couleur:"#7C5CC4", date:"date_signature"},
  {id:"depose",     libelle:"Déposé au greffe",    couleur:"#D98A1F", date:"date_depot_gtc"},
  {id:"termine",    libelle:"Formalité terminée",  couleur:"#2E9D62", date:"date_fin_formalite"}
];
const fjEtapes = () => Array.isArray(FJ.reglages.etapes)&&FJ.reglages.etapes.length ? FJ.reglages.etapes : FJ_ETAPES_DEFAUT;
/* Étape d'une ligne : choisie à la main si elle l'a été, sinon la plus
   avancée dont la date associée est renseignée, sinon la première. */
function fjEtapeDe(l){
  const E=fjEtapes();
  if(l.avancement){ const e=E.find(x=>x.id===l.avancement); if(e) return e; }
  let r=E[0];
  for(const e of E) if(e.date && l[e.date]) r=e;
  return r;
}
const fjCouleurSure = c => /^#[0-9a-fA-F]{6}$/.test(String(c||"")) ? c : "#9AA3A0";
const fjPastille = e => `<span class="fj-pastille" style="--fj-c:${fjCouleurSure(e?.couleur)}">${esc(e?.libelle||"")}</span>`;

function fjSynthese(){
  const moisCourant=today().slice(0,7), ex=fjExerciceDe(today());
  const s={encours:{n:0,m:0},moisCourant:0,exercice:0,exerciceN1MemePeriode:0,parEtape:{}};
  const moisEcoules=new Set(fjMoisExercice(ex).filter(m=>m<=moisCourant).map(m=>`${+m.slice(0,4)-1}${m.slice(4)}`));
  for(const l of fjEncours()){ s.encours.n++; s.encours.m+=+l.honoraires||0; const e=fjEtapeDe(l); s.parEtape[e.id]=(s.parEtape[e.id]||0)+1; }
  for(const l of fjFactures()){
    if(!l.mois_facturation) continue;
    const h=+l.honoraires||0, m=String(l.mois_facturation).slice(0,7);
    if(m===moisCourant) s.moisCourant+=h;
    if(fjExerciceDe(m)===ex) s.exercice+=h;
    if(moisEcoules.has(m)) s.exerciceN1MemePeriode+=h;
  }
  return s;
}

function fjTableauExercice(n){
  const mois=fjMoisExercice(n), base=fjFactures().filter(l=>l.mois_facturation);
  const lignes=base.filter(l=>fjExerciceDe(l.mois_facturation)===n), precedentes=base.filter(l=>fjExerciceDe(l.mois_facturation)===n-1);
  const parMois=mois.map(m=>{
    const du=lignes.filter(l=>String(l.mois_facturation).slice(0,7)===m), n1=precedentes.filter(l=>String(l.mois_facturation).slice(0,7)===`${+m.slice(0,4)-1}${m.slice(4)}`);
    const t=du.reduce((a,l)=>a+(+l.honoraires||0),0), j=du.filter(fjEstJlt).reduce((a,l)=>a+(+l.honoraires||0),0), p=n1.reduce((a,l)=>a+(+l.honoraires||0),0);
    return {m,t,j,p};
  });
  const total=parMois.reduce((a,x)=>a+x.t,0);
  const types={}, familles={}, debours=Object.fromEntries(FJ_DEBOURS.map(([k])=>[k,0]));
  for(const l of lignes){
    const t=l.type_operation||"Sans type", h=+l.honoraires||0;
    types[t]=types[t]||{h:0,n:0}; types[t].h+=h; types[t].n++;
    const f=fjFamilleDe(l.type_operation); familles[f]=(familles[f]||0)+h;
    for(const [k] of FJ_DEBOURS) debours[k]+=+l[k]||0;
  }
  return {parMois,total,types,familles,debours,nb:lignes.length};
}

/* Missions juridiques exceptionnelles reclassées dans l'outil, pas encore suivies. */
function fjMasques(){ try{ return new Set(JSON.parse(localStorage.getItem(FJ_MASQUES_STORAGE)||"[]")); }catch(_){ return new Set(); } }
function fjMasquer(id){ try{ const s=fjMasques(); s.add(id); localStorage.setItem(FJ_MASQUES_STORAGE,JSON.stringify([...s])); }catch(_){} }

function fjDossiersASuivre(){
  const suivis=new Set(FJ.lignes.map(l=>l.devis_id).filter(Boolean)), masques=fjMasques();
  const out=[];
  for(const d of (st.devis||[])){
    if(suivis.has(d.id)||masques.has(d.id)) continue;
    try{
      if(workflowStatut(d)!=="classe") continue;
      const m=modOf(d); if(!fjModeleRetenu(m)) continue;
      const ms=manualSignState(d.manualSign);
      out.push({d, montant:+totaux(d,m).ht||0, date:ms.filedDate||dateSignatureDe(d)});
    }catch(_){}
  }
  return out.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}

/* Ligne créée pour un dossier reclassé : elle arrive EN COURS. Dates, type
   et débours restent à saisir : l'outil de devis ne les connaît pas. */
function fjDepuisDossier(d){
  const m=modOf(d), t=totaux(d,m), cats=honorairesParCategorie(d,m).cats||{};
  const libelles=[...new Set(Object.values(cats).flatMap(c=>(c.lignes||[])).filter(x=>(+x.montant||0)>0).map(x=>String(x.label||"").trim()).filter(Boolean))];
  const titre=intituleDevis(d), libre=titre&&titre!=="Devis"?titre:"";
  return { dossier:d.client?.raison||"", type_operation:"", mission:(libre||libelles.join(" + ")).slice(0,300),
           honoraires:Math.round((+t.ht||0)*100)/100, devis_id:d.id, etat:"encours" };
}

/* =====================================================================
   v55.9 — FICHE CLIENT
   Fiche choisie à la main sur la ligne ; à défaut, celle du devis lié ;
   à défaut, la seule fiche dont la dénomination est exactement le nom du
   dossier. Aucun rattachement approximatif.
   ===================================================================== */
function fjClientDe(l){
  const cl=st.clients||[];
  if(l.client_id){ const c=cl.find(x=>x.id===l.client_id); if(c) return c; }
  if(l.devis_id){ const d=(st.devis||[]).find(x=>x.id===l.devis_id); const c=d&&clientMasterOf(d); if(c) return c; }
  const n=normClient(l.dossier||""); if(!n) return null;
  const memes=cl.filter(c=>normClient(c.raison||"")===n);
  return memes.length===1?memes[0]:null;
}
function fjNomClient(l){
  const c=fjClientDe(l);
  return c?`<button type="button" class="fj-client fj-lien" data-fj-client="${esc(c.id)}" title="Ouvrir la fiche client">${esc(l.dossier)}</button>`:`<span class="fj-client">${esc(l.dossier)}</span>`;
}

/* =====================================================================
   v55.9 — À FACTURER : formalités terminées, pas encore facturées.
   Une ligne y figure dès que la fin de formalité est saisie, ou que son
   avancement est la dernière étape du parcours.
   ===================================================================== */
function fjAFacturer(){
  const E=fjEtapes(), derniere=E[E.length-1]?.id;
  return fjEncours().filter(l=>l.date_fin_formalite||fjEtapeDe(l).id===derniere);
}
function fjVueAFacturer(){
  const auj=new Date(today()+"T00:00:00");
  const jours=iso=>iso?Math.round((auj-new Date(String(iso).slice(0,10)+"T00:00:00"))/86400000):null;
  const lignes=fjTrier(fjAFacturer().filter(fjFiltreTexte),"afacturer",FJ_TRI_VALEURS,(a,b)=>String(a.date_fin_formalite||"9").localeCompare(String(b.date_fin_formalite||"9")));
  const total=lignes.reduce((t,l)=>t+(+l.honoraires||0),0);
  return `<div class="card"><div class="bd">
      ${fjBarreRecherche(`<div class="hint" style="margin:0">Formalités terminées, pas encore passées en facturation — de la plus ancienne à la plus récente.</div>`)}
      <div style="overflow-x:auto"><table class="synthese-table fj-table">
        <thead><tr>${fjTh("afacturer","dossier","Dossier")}${fjTh("afacturer","fin","Fin form.")}<th>Depuis</th>${fjTh("afacturer","type","Type")}${fjTh("afacturer","mission","Mission")}${fjTh("afacturer","honoraires","Honoraires HT","r")}${fjTh("afacturer","facturation","Factur.","","Mois de rattachement prévu")}<th class="fj-actions"></th></tr></thead>
        <tbody>${lignes.map(l=>{const j=jours(l.date_fin_formalite);return `<tr class="fj-cliquable" data-fj-ligne="${esc(l.id)}" tabindex="0">
          <td>${fjNomClient(l)}${l.commentaires?`<div class="hint">${esc(l.commentaires)}</div>`:""}</td>
          <td>${fjDt(l.date_fin_formalite)}</td>
          <td>${j==null?`<span class="dim">—</span>`:`<span class="tag ${j>30?"rouge":j>15?"ocre":"gris"}">${j} j</span>`}</td>
          <td>${esc(l.type_operation||"")}</td><td>${esc(l.mission||"")}</td>
          <td class="r num">${l.honoraires!=null?eur(l.honoraires):`<span class="dim">—</span>`}</td>
          <td>${l.mois_facturation?esc(fjMois(l.mois_facturation)):`<span class="dim">—</span>`}</td>
          <td class="fj-actions"><div class="fj-boutons"><button class="btn sm p" data-fj-facturer="${esc(l.id)}">Facturer</button><button class="btn sm" data-fj-modifier="${esc(l.id)}">Modifier</button></div></td></tr>`;}).join("")||`<tr><td colspan="8"><div class="empty-state"><b>Rien à facturer</b><small>Toutes les formalités terminées ont été passées en facturation.</small></div></td></tr>`}</tbody>
        <tfoot><tr class="total"><td colspan="5"><b>Total à facturer (${lignes.length})</b></td><td class="r num"><b>${eur(total)}</b></td><td></td><td class="fj-actions"></td></tr></tfoot>
      </table></div>
      <div class="hint" style="margin-top:8px">« Depuis » : jours écoulés depuis la fin de formalité — gris jusqu'à 15 jours, orange au-delà, rouge après 30 jours.</div>
    </div></div>`;
}

VIEWS.juridique = () => {
  if(!FJ.acces) return `<div class="top"><h1>Facturation juridique</h1></div><div class="wrap"><div class="notice">Accès non autorisé.</div></div>`;
  const onglet=["encours","afacturer","envoyes","factures","stats"].includes(FJ.onglet)?FJ.onglet:"encours";
  const nb={encours:fjEncours().length,factures:fjFactures().length,envoyes:fjDevisEnvoyes().length,afacturer:fjAFacturer().length};
  const tab=(k,l,n)=>`<button class="vue-onglet ${onglet===k?"on":""}" data-fj-onglet="${k}">${l}${n!=null?` <span class="vue-compte">${n}</span>`:""}</button>`;
  const manque=!(FJ.colonneEcarte&&FJ.reglagesEnBase&&FJ.colonneEtat);
  return `<div class="top"><h1>Facturation juridique</h1><span class="sub">Accès réservé — invisible des autres comptes${manque?` · <b>relancer le script v55 dans Supabase (mise à jour)</b>`:""}</span><span class="spacer"></span>
    <button class="btn fj-bureau" data-fj-listes>Paramètres</button>
    <button class="btn fj-bureau" data-fj-import>Importer</button>
    <button class="btn fj-bureau" data-fj-export>Exporter en CSV</button>
    <button class="btn p" data-fj-nouveau>Nouvelle ligne</button>
    <input type="file" data-fj-fichier accept=".csv,.txt,.xlsx,.xls" hidden></div>
  <div class="wrap fj-page">
    ${FJ.erreur?`<div class="notice rouge" style="margin-bottom:12px">${esc(FJ.erreur)}</div>`:""}
    <div class="vues-barre" style="margin-bottom:14px">${tab("encours","Dossiers en cours",nb.encours)}${tab("afacturer","À facturer",nb.afacturer)}${tab("envoyes","Devis envoyés",nb.envoyes)}${tab("factures","Facturés",nb.factures)}${tab("stats","Statistiques")}</div>
    ${onglet==="stats"?fjTableauDeBordHTML():onglet==="factures"?fjVueFactures():onglet==="envoyes"?fjVueDevisEnvoyes():onglet==="afacturer"?fjVueAFacturer():fjVueEncours()}
  </div>`;
};

function fjBarreRecherche(extra=""){
  return `<div class="row" style="justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px">${extra}
    <input type="search" data-fj-recherche placeholder="Rechercher un dossier, une mission…" value="${esc(FJ.recherche)}" style="width:260px;max-width:100%"></div>`;
}
const fjFiltreTexte = l => { const q=normClient(FJ.recherche||""); return !q||normClient(`${l.dossier} ${l.type_operation||""} ${l.mission||""} ${l.commentaires||""}`).includes(q); };
const fjDt = v => { if(!v) return `<span class="dim">—</span>`; const [a,m,j]=String(v).slice(0,10).split("-"); return `<span title="${esc(dateFR(v))}">${j}/${m}/${String(a).slice(2)}</span>`; };

/* =====================================================================
   v56 — ERGONOMIE
   - tri au clic sur les en-têtes (chaque onglet garde le sien) ;
   - frise d'avancement : les 4 dates en 4 points cliquables ;
   - étape choisie d'un clic sur la pastille de couleur ;
   - « Terminée » : fin de formalité à la date du jour ;
   - indicateurs repliables, mémorisés sur ce poste.
   ===================================================================== */
const FJ_FRISE = [["date_projet","P","Envoi du projet d'acte"],["date_signature","S","Signature des actes"],["date_depot_gtc","D","Dépôt GTC"],["date_fin_formalite","F","Fin de formalité"]];
FJ.tris = FJ.tris || {};

/* Valeur de tri d'une colonne ; null pour les vides, toujours placés en fin. */
const FJ_TRI_VALEURS = {
  dossier:l=>normClient(l.dossier||""), type:l=>normClient(l.type_operation||""), mission:l=>normClient(l.mission||""),
  honoraires:l=>l.honoraires==null?null:+l.honoraires, facturation:l=>l.mois_facturation||null,
  fin:l=>l.date_fin_formalite||null, avancement:l=>{ const E=fjEtapes(); return E.findIndex(e=>e.id===fjEtapeDe(l).id); },
  debours:l=>fjTotalDebours(l)||null
};
function fjTrier(liste, onglet, getters, defaut){
  const t=FJ.tris[onglet];
  if(!t||!getters[t.k]) return liste.sort(defaut);
  const g=getters[t.k], sens=t.dir==="desc"?-1:1;
  return liste.sort((a,b)=>{ const x=g(a), y=g(b);
    if(x==null&&y==null) return 0; if(x==null) return 1; if(y==null) return -1;
    return (typeof x==="number"&&typeof y==="number"?x-y:String(x).localeCompare(String(y),"fr"))*sens; });
}
function fjTh(onglet,k,lib,cls="",titre=""){
  const t=FJ.tris[onglet], actif=t&&t.k===k;
  return `<th class="${cls} fj-triable${actif?" fj-tri-actif":""}" data-fj-trier="${onglet}:${k}" ${titre?`title="${esc(titre)}"`:""} aria-sort="${actif?(t.dir==="desc"?"descending":"ascending"):"none"}">${lib}<span class="fj-fleche">${actif?(t.dir==="desc"?"▼":"▲"):"↕"}</span></th>`;
}

function fjFrise(l){
  return `<span class="fj-frise">${FJ_FRISE.map(([k,lettre,lib])=>{ const v=l[k]; return `<button type="button" class="fj-jalon${v?" fait":""}" data-fj-jalon="${esc(l.id)}:${k}" title="${esc(lib)} : ${v?dateFR(v):"non renseignée"} — cliquer pour ${v?"modifier":"saisir"}">${lettre}</button>`; }).join("")}</span>`;
}

function fjIndicateurs(html){
  let ouvert=true; try{ ouvert=localStorage.getItem("serre:fj:indicateurs")!=="0"; }catch(_){}
  return `<details class="fj-indicateurs" data-fj-indicateurs ${ouvert?"open":""}><summary>Indicateurs</summary>${html}</details>`;
}

function fjVueEncours(){
  const s=fjSynthese(), aSuivre=fjDossiersASuivre(), E=fjEtapes();
  const filtre=E.some(e=>e.id===FJ.filtreEtape)?FJ.filtreEtape:"";
  const rang=l=>E.findIndex(e=>e.id===fjEtapeDe(l).id);
  const lignes=fjTrier(fjEncours().filter(fjFiltreTexte).filter(l=>!filtre||fjEtapeDe(l).id===filtre),"encours",FJ_TRI_VALEURS,
    (a,b)=>(rang(b)-rang(a))||String(b.date_fin_formalite||b.date_depot_gtc||b.date_signature||b.date_projet||b.created_at||"").localeCompare(String(a.date_fin_formalite||a.date_depot_gtc||a.date_signature||a.date_projet||a.created_at||"")));
  const total=lignes.reduce((t,l)=>t+(+l.honoraires||0),0);
  const reperes=!!FJ.reglages.options?.reperes;
  const filtres=`<div class="vues-barre" style="margin:0"><button class="vue-onglet ${!filtre?"on":""}" data-fj-etape="">Toutes <span class="vue-compte">${s.encours.n}</span></button>${E.map((e,i)=>`<button class="vue-onglet ${filtre===e.id?"on":""}" data-fj-etape="${esc(e.id)}"><span class="fj-point" style="--fj-c:${fjCouleurSure(e.couleur)}">${reperes?i+1:""}</span>${esc(e.libelle)} <span class="vue-compte">${s.parEtape[e.id]||0}</span></button>`).join("")}</div>`;
  return `${fjIndicateurs(`<div class="kpi-grid">
      ${kpi("En cours",eur0(s.encours.m),`${s.encours.n} dossier(s)`)}
      ${kpi("Facturé ce mois",eur0(s.moisCourant),esc(fjMoisLong(today())))}
      ${kpi(`Exercice ${fjLibelleExercice(fjExerciceDe(today()))}`,eur0(s.exercice),s.exerciceN1MemePeriode?`N-1 à date : ${eur0(s.exerciceN1MemePeriode)} (${s.exercice>=s.exerciceN1MemePeriode?"+":""}${Math.round((s.exercice-s.exerciceN1MemePeriode)/s.exerciceN1MemePeriode*100)} %)`:"Juin à mai")}
      ${kpi("Nouveaux dossiers de l'outil",String(aSuivre.length),"Missions juridiques exceptionnelles reclassées, non suivies")}
    </div>`)}
    ${aSuivre.length?`<details class="card" style="margin-bottom:14px" ${aSuivre.length<=5?"open":""}><summary class="hd" style="cursor:pointer">Missions juridiques exceptionnelles reclassées dans l'outil, non encore suivies <span class="tag ocre">${aSuivre.length}</span></summary><div class="bd">
      <table class="synthese-table"><thead><tr><th>Client</th><th>Devis</th><th>Classé le</th><th class="r">Honoraires HT</th><th></th></tr></thead><tbody>
      ${aSuivre.slice(0,30).map(x=>`<tr><td>${esc(x.d.client?.raison||"Dossier")}</td><td>${esc(x.d.ref||intituleDevis(x.d))}</td><td>${fjDt(String(x.date||"").slice(0,10))}</td><td class="r num">${eur(x.montant)}</td>
        <td class="r"><button class="btn sm p" data-fj-suivre="${esc(x.d.id)}">Ajouter au suivi</button> <button class="btn sm" data-fj-ignorer="${esc(x.d.id)}" title="Ne plus proposer ce dossier">Ignorer</button></td></tr>`).join("")}
      </tbody></table></div></details>`:""}
    <div class="card"><div class="bd">
      ${fjBarreRecherche(filtres)}
      <div style="overflow-x:auto"><table class="synthese-table fj-table">
        <thead><tr>${fjTh("encours","dossier","Dossier")}${fjTh("encours","type","Type")}${fjTh("encours","mission","Mission")}${fjTh("encours","honoraires","Honoraires HT","r")}${fjTh("encours","avancement","Avancement","","P : projet · S : signature · D : dépôt · F : fin de formalité")}${fjTh("encours","facturation","Factur.","","Mois de rattachement")}<th class="fj-actions"></th></tr></thead>
        <tbody>${lignes.map(l=>{const e=fjEtapeDe(l), n=E.findIndex(x=>x.id===e.id)+1;return `<tr class="fj-ligne fj-cliquable" data-fj-ligne="${esc(l.id)}" tabindex="0" style="--fj-c:${fjCouleurSure(e.couleur)}">
          <td><div class="fj-nom"><button type="button" class="fj-etape-choix" data-fj-etape-choix="${esc(l.id)}" title="${esc(e.libelle)}${l.avancement?" (choisie à la main)":""} — changer l'étape">${reperes?n:""}</button>${fjNomClient(l)}${l.devis_id&&st.devis.some(d=>d.id===l.devis_id)?` <button class="btn sm" data-fj-devis="${esc(l.devis_id)}" title="Ouvrir le dossier dans l'outil de devis">Devis</button>`:""}</div>${l.commentaires?`<div class="hint">${esc(l.commentaires)}</div>`:""}</td>
          <td>${esc(l.type_operation||"")}${l.type_operation&&!fjTypes().includes(l.type_operation)?` <span class="tag rouge">hors liste</span>`:""}</td><td>${esc(l.mission||"")}</td>
          <td class="r num">${l.honoraires!=null?eur(l.honoraires):`<span class="dim">—</span>`}</td>
          <td>${fjFrise(l)}</td>
          <td>${l.mois_facturation?esc(fjMois(l.mois_facturation)):`<span class="dim">—</span>`}</td>
          <td class="fj-actions"><div class="fj-boutons">${l.date_fin_formalite?"":`<button class="btn sm" data-fj-terminee="${esc(l.id)}" title="Fin de formalité à la date du jour">Terminée</button>`}<button class="btn sm p" data-fj-facturer="${esc(l.id)}" title="Passer en facturation">Facturer</button><button class="btn sm" data-fj-modifier="${esc(l.id)}" title="Modifier la ligne">Modifier</button></div></td></tr>`;}).join("")||`<tr><td colspan="7"><div class="empty-state"><b>Aucun dossier en cours</b></div></td></tr>`}</tbody>
        <tfoot><tr class="total"><td colspan="3"><b>Total (${lignes.length})</b></td><td class="r num"><b>${eur(total)}</b></td><td colspan="2"></td><td class="fj-actions"></td></tr></tfoot>
      </table></div>
      <div class="hint" style="margin-top:8px">Cliquez sur un point P · S · D · F pour saisir la date, sur le carré de couleur pour changer l'étape, sur un en-tête pour trier.</div>
    </div></div>`;
}

/* =====================================================================
   v55.7 — DEVIS ENVOYÉS, NON ACCEPTÉS
   Devis établis sur les modèles retenus (« Mission juridique
   exceptionnelle ») envoyés au client mais pas encore acceptés : même
   statut « Envoyé » que dans le portefeuille. Accès au devis en un clic.
   Lecture seule : l'acceptation se coche dans l'outil de devis.
   ===================================================================== */
function fjDevisEnvoyes(){
  const out=[];
  for(const d of (st.devis||[])){
    try{
      if(isArchivedDevis(d)) continue;
      if(workflowStatut(d)!=="envoye") continue;
      const m=modOf(d); if(!fjModeleRetenu(m)) continue;
      const ms=manualSignState(d.manualSign);
      const envoi=String(ms.sentDate||d.sign?.envoye||"").slice(0,10);
      out.push({d,m,envoi,ht:+totaux(d,m).ht||0,yousign:!!d.sign?.id});
    }catch(_){}
  }
  return out.sort((a,b)=>String(a.envoi||"9").localeCompare(String(b.envoi||"9")));
}

function fjVueDevisEnvoyes(){
  const q=normClient(FJ.recherche||"");
  const liste=fjTrier(fjDevisEnvoyes().filter(x=>!q||normClient(`${x.d.client?.raison||""} ${x.d.ref||""} ${intituleDevis(x.d)}`).includes(q)),"envoyes",
    {envoi:x=>x.envoi||null, client:x=>normClient(x.d.client?.raison||""), ref:x=>x.d.ref||null, honoraires:x=>x.ht},(a,b)=>String(a.envoi||"9").localeCompare(String(b.envoi||"9")));
  const auj=new Date(today()+"T00:00:00");
  const jours=iso=>iso?Math.round((auj-new Date(iso+"T00:00:00"))/86400000):null;
  const total=liste.reduce((t,x)=>t+x.ht,0);
  return `<div class="card"><div class="bd">
      ${fjBarreRecherche(`<div class="hint" style="margin:0">Devis « Mission juridique exceptionnelle » envoyés, en attente d'acceptation. L'acceptation se coche dans le dossier.</div>`)}
      <div style="overflow-x:auto"><table class="synthese-table fj-table">
        <thead><tr>${fjTh("envoyes","envoi","Envoyé le")}<th>Attente</th>${fjTh("envoyes","client","Client")}${fjTh("envoyes","ref","Devis")}<th>Intitulé</th>${fjTh("envoyes","honoraires","Honoraires HT","r")}<th>Envoi</th><th class="fj-actions"></th></tr></thead>
        <tbody>${liste.map(x=>{const j=jours(x.envoi);return `<tr>
          <td>${fjDt(x.envoi)}</td>
          <td>${j==null?`<span class="dim">—</span>`:`<span class="tag ${j>30?"rouge":j>15?"ocre":"gris"}">${j} j</span>`}</td>
          <td><span class="fj-client">${esc(x.d.client?.raison||"Dossier")}</span></td>
          <td>${esc(x.d.ref||"—")}</td>
          <td>${esc(intituleDevis(x.d)!=="Devis"?intituleDevis(x.d):(x.m?.titre||""))}</td>
          <td class="r num">${eur(x.ht)}</td>
          <td>${x.yousign?"Yousign":"Manuel"}</td>
          <td class="fj-actions"><div class="fj-boutons"><button class="btn sm p" data-fj-valider="${esc(x.d.id)}" title="Cocher « Devis signé ou validé » dans le dossier">Devis validé</button><button class="btn sm" data-fj-sans-suite="${esc(x.d.id)}" title="Le client n'a pas donné suite">Sans suite</button><button class="btn sm" data-fj-devis="${esc(x.d.id)}">Ouvrir</button></div></td></tr>`;}).join("")||`<tr><td colspan="8"><div class="empty-state"><b>Aucun devis en attente d'acceptation</b></div></td></tr>`}</tbody>
        <tfoot><tr class="total"><td colspan="5"><b>Total (${liste.length})</b></td><td class="r num"><b>${eur(total)}</b></td><td></td><td class="fj-actions"></td></tr></tfoot>
      </table></div>
      <div class="hint" style="margin-top:8px">Attente : gris jusqu'à 15 jours, orange au-delà, rouge après 30 jours. « Devis validé » coche « Devis signé ou validé » dans le dossier ; la ligne arrivera dans « Dossiers en cours » au reclassement du dossier.</div>
    </div></div>
    ${(()=>{ const ss=fjDevisSansSuite(); return ss.length?`<details class="card" style="margin-top:14px"><summary class="hd" style="cursor:pointer">Devis classés sans suite <span class="tag gris">${ss.length}</span></summary><div class="bd">
      <table class="synthese-table fj-table"><thead><tr><th>Sans suite le</th><th>Client</th><th>Devis</th><th class="r">Honoraires HT</th><th class="fj-actions"></th></tr></thead><tbody>
      ${ss.map(x=>`<tr><td>${fjDt(x.d.sansSuite?.date)}</td><td><span class="fj-client">${esc(x.d.client?.raison||"Dossier")}</span></td><td>${esc(x.d.ref||"—")}</td><td class="r num">${eur(x.ht)}</td>
        <td class="fj-actions"><div class="fj-boutons"><button class="btn sm" data-fj-reactiver="${esc(x.d.id)}" title="Remettre le devis en attente de réponse">Réactiver</button></div></td></tr>`).join("")}
      </tbody></table></div></details>`:""; })()}`;
}

function fjDevisSansSuite(){
  const out=[];
  for(const d of (st.devis||[])){
    try{
      if(!d.sansSuite||isArchivedDevis(d)) continue;
      const m=modOf(d); if(!fjModeleRetenu(m)) continue;
      out.push({d,ht:+totaux(d,m).ht||0});
    }catch(_){}
  }
  return out.sort((a,b)=>String(b.d.sansSuite?.date||"").localeCompare(String(a.d.sansSuite?.date||"")));
}

/* Actions sur un devis depuis la facturation juridique : mêmes règles,
   même journal et même enregistrement que depuis le dossier lui-même. */
async function fjSurDevis(id, action){
  const d=st.devis.find(x=>x.id===id); if(!d) return;
  const avant=st.id; st.id=id;
  try{ await action(d); }
  finally{ st.id=avant; render(); }
}

function fjVueFactures(){
  const dispo=fjExercicesDisponibles();
  const n=FJ.exerciceFactures==="tous"?"tous":(dispo.includes(FJ.exerciceFactures)?FJ.exerciceFactures:dispo[0]);
  let lignes=fjFactures().filter(fjFiltreTexte).filter(l=>n==="tous"||(l.mois_facturation&&fjExerciceDe(l.mois_facturation)===n));
  const dbx=Object.fromEntries(FJ_DEBOURS.map(([k])=>[k,l=>l[k]==null||l[k]===""?null:+l[k]]));
  fjTrier(lignes,"factures",{...FJ_TRI_VALEURS,...dbx},(a,b)=>String(b.mois_facturation||"").localeCompare(String(a.mois_facturation||""))||String(a.dossier).localeCompare(String(b.dossier),"fr"));
  const tot=k=>lignes.reduce((t,l)=>t+(+l[k]||0),0);
  const sel=`<label class="row" style="gap:8px">Exercice <select data-fj-exercice-factures style="width:auto"><option value="tous" ${n==="tous"?"selected":""}>Tous</option>${dispo.map(x=>`<option value="${x}" ${x===n?"selected":""}>${fjLibelleExercice(x)}</option>`).join("")}</select></label>`;
  const m=v=>v!=null&&v!==""?eur(v):`<span class="dim">—</span>`;
  return `<div class="card"><div class="bd">
      ${fjBarreRecherche(sel)}
      <div style="overflow-x:auto"><table class="synthese-table fj-table">
        <thead><tr>${fjTh("factures","facturation","Facturation")}${fjTh("factures","dossier","Dossier")}${fjTh("factures","type","Type")}${fjTh("factures","mission","Mission")}${fjTh("factures","honoraires","Honoraires HT","r fj-th-court")}${FJ_DEBOURS.map(([k,lib])=>fjTh("factures",k,esc(FJ_DEBOURS_COURTS[k]),"r fj-th-court",lib)).join("")}${fjTh("factures","debours","Total débours","r fj-th-court")}<th class="fj-actions"></th></tr></thead>
        <tbody>${lignes.map(l=>`<tr class="fj-cliquable" data-fj-ligne="${esc(l.id)}" tabindex="0">
          <td>${l.mois_facturation?esc(fjMois(l.mois_facturation)):`<span class="dim">—</span>`}</td>
          <td>${fjNomClient(l)}${l.commentaires?`<div class="hint">${esc(l.commentaires)}</div>`:""}</td>
          <td>${esc(l.type_operation||"")}</td><td>${esc(l.mission||"")}</td>
          <td class="r num">${m(l.honoraires)}</td>${FJ_DEBOURS.map(([k])=>`<td class="r num">${m(l[k])}</td>`).join("")}<td class="r num">${fjTotalDebours(l)?eur(fjTotalDebours(l)):`<span class="dim">—</span>`}</td>
          <td class="fj-actions"><div class="fj-boutons"><button class="btn sm" data-fj-debours="${esc(l.id)}">Débours</button><button class="btn sm" data-fj-modifier="${esc(l.id)}">Modifier</button></div></td></tr>`).join("")||`<tr><td colspan="${7+FJ_DEBOURS.length}"><div class="empty-state"><b>Aucune ligne facturée</b></div></td></tr>`}</tbody>
        <tfoot><tr class="total"><td colspan="4"><b>Total (${lignes.length})</b></td><td class="r num"><b>${eur(tot("honoraires"))}</b></td>${FJ_DEBOURS.map(([k])=>`<td class="r num">${eur(tot(k))}</td>`).join("")}<td class="r num"><b>${eur(lignes.reduce((t,l)=>t+fjTotalDebours(l),0))}</b></td><td class="fj-actions"></td></tr></tfoot>
      </table></div>
    </div></div>`;
}

/* v56 — Graphique : honoraires facturés par mois, exercice et N-1 côte à
   côte. Deux séries, couleurs validées (contraste et daltonisme) en mode
   clair et sombre ; le tableau sous le graphique en est la version texte. */
function fjGraphiqueMois(d, n){
  const W=720, H=230, g=44, dr=12, haut=14, bas=34, pw=W-g-dr, ph=H-haut-bas;
  const max=Math.max(1,...d.parMois.map(x=>Math.max(x.t,x.p)));
  const pas=[1,2,2.5,5,10].map(k=>k*Math.pow(10,Math.floor(Math.log10(max/4)))).find(v=>max/v<=5)||max/4;
  const top=Math.ceil(max/pas)*pas, y=v=>haut+ph-(v/top)*ph, slot=pw/12, bw=Math.max(6,Math.min(18,(slot-10)/2));
  const barre=(x,v,cls)=>{ if(!v) return ""; const y0=y(v), h=haut+ph-y0, r=Math.min(4,h,bw/2);
    return `<path class="${cls}" d="M${x},${haut+ph}V${y0+r}Q${x},${y0} ${x+r},${y0}H${x+bw-r}Q${x+bw},${y0} ${x+bw},${y0+r}V${haut+ph}Z"/>`; };
  const k=v=>v>=1000?`${Math.round(v/100)/10} k€`.replace(".",","):`${Math.round(v)} €`;
  let svg=`<svg class="fj-graph" viewBox="0 0 ${W} ${H}" role="img" aria-label="Honoraires facturés par mois, exercice ${fjLibelleExercice(n)} et exercice précédent">`;
  for(let v=0; v<=top+1e-9; v+=pas){ svg+=`<line class="fj-graph-grille" x1="${g}" x2="${W-dr}" y1="${y(v)}" y2="${y(v)}"/><text class="fj-graph-axe" x="${g-6}" y="${y(v)+4}" text-anchor="end">${k(v)}</text>`; }
  d.parMois.forEach((x,i)=>{
    const cx=g+slot*i+slot/2, mois=new Date(x.m+"-01T00:00:00").toLocaleDateString("fr-FR",{month:"short"}).replace(".","");
    svg+=barre(cx-bw-1,x.p,"fj-graph-n1")+barre(cx+1,x.t,"fj-graph-n");
    svg+=`<text class="fj-graph-axe" x="${cx}" y="${H-bas+16}" text-anchor="middle">${esc(mois)}</text>`;
    svg+=`<rect class="fj-graph-zone" x="${g+slot*i}" y="${haut}" width="${slot}" height="${ph}" data-fj-graph="${i}"/>`;
  });
  svg+=`<line class="fj-graph-base" x1="${g}" x2="${W-dr}" y1="${haut+ph}" y2="${haut+ph}"/></svg>`;
  return `<div class="fj-graph-cadre" data-fj-graph-donnees='${esc(JSON.stringify(d.parMois.map(x=>({m:x.m,t:x.t,p:x.p}))))}'>
    <div class="fj-graph-legende"><span><i class="fj-graph-n"></i>Exercice ${esc(fjLibelleExercice(n))}</span><span><i class="fj-graph-n1"></i>Exercice ${esc(fjLibelleExercice(n-1))}</span></div>
    ${svg}<div class="fj-graph-bulle" hidden></div></div>`;
}

function fjTableauDeBordHTML(){
  const dispo=fjExercicesDisponibles();
  const n=dispo.includes(FJ.exercice)?FJ.exercice:dispo[0];
  const d=fjTableauExercice(n), pct=(a,b)=>b?`${Math.round(a/b*1000)/10} %`:"—";
  const ecart=(t,p)=>p?`<span class="${t>=p?"":"dim"}">${t>=p?"+":""}${Math.round((t-p)/p*100)} %</span>`:`<span class="dim">—</span>`;
  const totP=d.parMois.reduce((a,x)=>a+x.p,0), totJ=d.parMois.reduce((a,x)=>a+x.j,0);
  const types=Object.entries(d.types).sort((a,b)=>b[1].h-a[1].h);
  const fams=Object.keys(fjFamilles()).map(f=>[f,d.familles[f]||0]);
  for(const f of ["Non classé","Sans type"]) if(d.familles[f]) fams.push([f,d.familles[f]]);
  const totDeb=Object.values(d.debours).reduce((a,b)=>a+b,0);
  return `<div class="card"><div class="hd" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">Exercice
      <select data-fj-exercice style="width:auto;min-width:150px">${dispo.map(x=>`<option value="${x}" ${x===n?"selected":""}>${fjLibelleExercice(x)}</option>`).join("")}</select>
      <span class="dim" style="font-weight:400">${d.nb} ligne(s) facturée(s) · ${eur0(d.total)} HT</span></div>
    <div class="bd">${fjGraphiqueMois(d,n)}<div class="grid g2" style="align-items:start;gap:18px;margin-top:14px">
      <div style="overflow-x:auto"><table class="synthese-table fj-stats"><thead><tr><th>Mois</th><th class="r">Honoraires</th><th class="r">Dont JLT</th><th class="r">%</th><th class="r">N-1</th><th class="r">Écart</th></tr></thead><tbody>
        ${d.parMois.map(x=>`<tr><td>${esc(fjMoisLong(x.m))}</td><td class="r num">${x.t?eur0(x.t):`<span class="dim">—</span>`}</td><td class="r num">${x.j?eur0(x.j):`<span class="dim">—</span>`}</td><td class="r num">${x.t?pct(x.j,x.t):"—"}</td><td class="r num">${x.p?eur0(x.p):`<span class="dim">—</span>`}</td><td class="r num">${x.m>today().slice(0,7)?"":(x.t||x.p?ecart(x.t,x.p):"")}</td></tr>`).join("")}
      </tbody><tfoot><tr class="total"><td><b>Total</b></td><td class="r num"><b>${eur0(d.total)}</b></td><td class="r num">${eur0(totJ)}</td><td class="r num">${pct(totJ,d.total)}</td><td class="r num">${eur0(totP)}</td><td class="r num">${ecart(d.total,totP)}</td></tr></tfoot></table>
      <div class="hint">Lignes facturées uniquement, au mois de rattachement. N-1 : même mois de l'exercice précédent.</div></div>
      <div>
        <table class="synthese-table"><thead><tr><th>Famille</th><th class="r">Honoraires</th><th class="r">%</th></tr></thead><tbody>
          ${fams.map(([f,h])=>`<tr><td>${esc(f)}</td><td class="r num">${h?eur0(h):`<span class="dim">—</span>`}</td><td class="r num">${pct(h,d.total)}</td></tr>`).join("")}
        </tbody></table>
        <table class="synthese-table" style="margin-top:14px"><thead><tr><th>Débours de l'exercice</th><th class="r">Montant</th></tr></thead><tbody>
          ${FJ_DEBOURS.map(([k,lib])=>`<tr><td>${esc(lib)}</td><td class="r num">${d.debours[k]?eur(d.debours[k]):`<span class="dim">—</span>`}</td></tr>`).join("")}
        </tbody><tfoot><tr class="total"><td><b>Total</b></td><td class="r num"><b>${eur(totDeb)}</b></td></tr></tfoot></table>
        <details style="margin-top:12px"><summary style="cursor:pointer"><b>Par type d'opération</b> (${types.length})</summary>
        <table class="synthese-table"><thead><tr><th>Type</th><th class="r">Honoraires</th><th class="r">Nombre</th><th class="r">%</th></tr></thead><tbody>
          ${types.map(([t,v])=>`<tr><td>${esc(t)}</td><td class="r num">${eur0(v.h)}</td><td class="r num">${v.n}</td><td class="r num">${pct(v.h,d.total)}</td></tr>`).join("")}
        </tbody></table></details>
      </div>
    </div></div></div>`;
}

/* ------------------------------------------------------- formulaire */
function fjFormulaire(ligne, titre){
  return new Promise(resolve=>{
    const l={etat:"encours",...ligne};
    const types=fjTypes(), E=fjEtapes();
    const champ=(k,lib,type="text",extra="")=>`<label class="f"><span>${lib}</span><input type="${type}" data-fjf="${k}" value="${esc(type==="month"?String(l[k]||"").slice(0,7):(l[k]??""))}" ${extra}></label>`;
    const m=document.createElement("div"); m.className="modal modal-confirm fj-modal";
    m.innerHTML=`<div class="box" style="max-width:820px"><div class="modal-titlebar"><h2>${esc(titre)}</h2><button class="modal-x" type="button">×</button></div>
      <div class="modal-content"><div class="grid g2">
        ${champ("dossier","Dossier (client)","text","required")}
        <label class="f"><span>Type d'opération</span><select data-fjf="type_operation"><option value="">— À choisir —</option>${types.map(t=>`<option value="${esc(t)}" ${l.type_operation===t?"selected":""}>${esc(t)}</option>`).join("")}${l.type_operation&&!types.includes(l.type_operation)?`<option value="${esc(l.type_operation)}" selected>${esc(l.type_operation)} (hors liste)</option>`:""}</select></label>
        ${champ("mission","Mission")}
        ${champ("honoraires","Honoraires HT (€)","number",'step="0.01" min="0"')}
        <label class="f"><span>État</span><select data-fjf="etat"><option value="encours" ${l.etat!=="facture"?"selected":""}>En cours</option><option value="facture" ${l.etat==="facture"?"selected":""}>Facturé</option></select></label>
        <label class="f"><span>Avancement</span><select data-fjf="avancement"><option value="">Automatique, selon les dates (${esc(fjEtapeDe({...l,avancement:""}).libelle)})</option>${E.map(e=>`<option value="${esc(e.id)}" ${l.avancement===e.id?"selected":""}>${esc(e.libelle)}</option>`).join("")}</select></label>
        ${champ("date_projet","Envoi du projet d'acte","date")}
        ${champ("date_signature","Signature des actes","date")}
        ${champ("date_depot_gtc","Dépôt GTC","date")}
        ${champ("date_fin_formalite","Fin de formalité","date")}
        ${champ("mois_facturation","Facturation — mois de rattachement","month",'placeholder="mm/aaaa"')}
        ${FJ.colonneClient?`<label class="f"><span>Fiche client</span><select data-fjf="client_id"><option value="">${(()=>{const c=fjClientDe({...l,client_id:""});return c?`Automatique : ${esc(c.raison||"")}`:"— Aucune —";})()}</option>${(st.clients||[]).filter(c=>!c.archive||c.id===l.client_id).slice().sort((a,b)=>String(a.raison||"").localeCompare(String(b.raison||""),"fr")).map(c=>`<option value="${esc(c.id)}" ${l.client_id===c.id?"selected":""}>${esc(c.raison||"Client")}${c.siren?` · ${esc(c.siren)}`:""}</option>`).join("")}</select></label>`:""}
        <label class="f"><span>Dossier de l'outil de devis</span><select data-fjf="devis_id"><option value="">— Aucun —</option>${(st.devis||[]).filter(d=>!isArchivedDevis(d)||d.id===l.devis_id).map(d=>`<option value="${esc(d.id)}" ${l.devis_id===d.id?"selected":""}>${esc((d.client?.raison||"Dossier")+(d.ref?" · "+d.ref:""))}</option>`).join("")}</select></label>
      </div>
      <fieldset data-fj-bloc-debours style="margin-top:12px;border:1px solid var(--reglure);border-radius:8px;padding:10px 12px;${l.etat==="facture"?"":"display:none"}"><legend style="padding:0 6px"><b>Débours</b></legend>
        <div class="grid g2">${FJ_DEBOURS.map(([k,lib])=>champ(k,lib+" (€)","number",'step="0.01" min="0"')).join("")}</div></fieldset>
      <label class="f" style="margin-top:12px"><span>Commentaires</span><textarea data-fjf="commentaires">${esc(l.commentaires||"")}</textarea></label>
      </div>
      <div class="modal-actions">${l.id?`<button class="btn" data-fj-suppr style="color:var(--rouge)">Supprimer</button><button class="btn" data-fj-scinder title="Créer une seconde ligne pour le même dossier (une ligne par opération)">Dupliquer la ligne</button>${typeof ENR!=="undefined"&&ENR.acces?`<button class="btn" data-fj-creer-enr style="margin-right:auto" title="Créer l'enregistrement aux impôts de ce dossier">${typeof enrLiesA==="function"&&enrLiesA(l.id).length?`Enregistrement (${enrLiesA(l.id).length}) +`:"Créer l'enregistrement"}</button>`:`<span style="margin-right:auto"></span>`}`:""}<button class="btn" data-no>Annuler</button><button class="btn p" data-yes>Enregistrer</button></div></div>`;
    const lire=()=>m.querySelectorAll("[data-fjf]").forEach(el=>{ l[el.dataset.fjf]=el.value; });
    const fin=v=>{ m.remove(); resolve(v); };
    m.querySelector("[data-fjf='etat']").onchange=e=>{ m.querySelector("[data-fj-bloc-debours]").style.display=e.target.value==="facture"?"":"none"; };
    m.querySelector(".modal-x").onclick=()=>fin(null);
    m.querySelector("[data-no]").onclick=()=>fin(null);
    m.querySelector("[data-yes]").onclick=()=>{ lire(); if(l.etat==="facture"&&!l.mois_facturation){ toast("Indiquez le mois de rattachement de la facturation.",true); return; } fin(l); };
    const sup=m.querySelector("[data-fj-suppr]"); if(sup) sup.onclick=()=>fin({...l,__supprimer:true});
    const sc=m.querySelector("[data-fj-scinder]"); if(sc) sc.onclick=()=>{ lire(); fin({...l,__scinder:true}); };
    const ce=m.querySelector("[data-fj-creer-enr]"); if(ce) ce.onclick=()=>{ fin(null); enrEditer({dossier:l.dossier,fj_id:l.id,client_id:l.client_id||"",motif:l.mission||l.type_operation||""},"Nouvel enregistrement"); };
    document.body.appendChild(m); setTimeout(()=>m.querySelector("[data-fjf='dossier']")?.focus(),20);
  });
}

async function fjEditer(ligne,titre){
  const r=await fjFormulaire(ligne,titre);
  if(!r) return;
  if(r.__supprimer){
    if(!await askConfirm("Supprimer la ligne",r.devis_id?`La ligne « ${r.dossier} » sera retirée du suivi. Le dossier de devis lié ne sera plus transféré.`:`La ligne « ${r.dossier} » sera supprimée définitivement.`,{confirmLabel:"Supprimer",danger:true})) return;
    if(await fjSupprimer(r.id)){ toast("Ligne supprimée."); render(); }
    return;
  }
  if(r.__scinder){
    const {__scinder,...orig}=r;
    if(!await fjEnregistrer(orig)) return;
    const {id,created_at,updated_at,...copie}=orig;
    await fjEditer({...copie,mission:"",honoraires:"",date_depot_gtc:"",date_fin_formalite:"",mois_facturation:"",etat:"encours",avancement:"",...Object.fromEntries(FJ_DEBOURS.map(([k])=>[k,""]))},"Nouvelle ligne pour le même dossier");
    return;
  }
  const avant=r.id?FJ.lignes.find(x=>x.id===r.id):null;
  if(avant){ await fjEnregistrerAnnulable(avant,r,`Ligne enregistrée — ${r.dossier}`); return; }
  if(await fjEnregistrer(r)){ toast("Ligne enregistrée."); render(); }
}

/* Passage en facturation : mois de rattachement + débours, puis la ligne
   rejoint l'onglet « Facturés ». Sert aussi à modifier les débours. */
function fjSaisieFacturation(l, passage){
  const m=document.createElement("div"); m.className="modal modal-confirm fj-modal";
  /* v57 : droits des enregistrements liés reportés dans le débours « Enregistrement » s'il est vide. */
  const droits=typeof enrDroitsLies==="function"?enrDroitsLies(l.id):0, nbEnr=typeof enrLiesA==="function"?enrLiesA(l.id).length:0;
  const v=k=>(k==="debours_enregistrement"&&(l[k]==null||l[k]==="")&&droits)?droits:(l[k]??"");
  m.innerHTML=`<div class="box" style="max-width:560px"><div class="modal-titlebar"><h2>${passage?"Passer en facturation":"Débours"} — ${esc(l.dossier)}</h2><button class="modal-x" type="button">×</button></div>
    <div class="modal-content"><div class="grid g2">
      <label class="f"><span>Mois de rattachement</span><input type="month" data-fjs="mois_facturation" value="${esc(String(l.mois_facturation||(passage?today():"")).slice(0,7))}" placeholder="mm/aaaa"></label>
      <label class="f"><span>Honoraires HT (€)</span><input type="number" step="0.01" min="0" data-fjs="honoraires" value="${esc(v("honoraires"))}"></label>
      ${FJ_DEBOURS.map(([k,lib])=>`<label class="f"><span>${esc(lib)} (€)</span><input type="number" step="0.01" min="0" data-fjs="${k}" value="${esc(v(k))}"></label>`).join("")}
    </div>${nbEnr?`<div class="hint" style="margin-top:8px">Enregistrement : ${nbEnr} acte(s) lié(s) dans Juridique › Enregistrements, ${eur(droits)} de droits${(l.debours_enregistrement==null||l.debours_enregistrement==="")?" — montant reporté ci-dessus":""}.</div>`:""}<div class="hint" style="margin-top:8px">Les débours peuvent être complétés plus tard depuis l'onglet « Facturés ».</div></div>
    <div class="modal-actions"><button class="btn" data-no>Annuler</button><button class="btn p" data-yes>${passage?"Passer en facturation":"Enregistrer"}</button></div></div>`;
  const fermer=()=>m.remove();
  m.querySelector(".modal-x").onclick=fermer; m.querySelector("[data-no]").onclick=fermer;
  m.querySelector("[data-yes]").onclick=async()=>{
    const x={...l}; m.querySelectorAll("[data-fjs]").forEach(el=>{ x[el.dataset.fjs]=el.value; });
    if(!x.mois_facturation){ toast("Indiquez le mois de rattachement.",true); return; }
    x.etat="facture";
    if(await fjEnregistrerAnnulable(l,x,passage?`${l.dossier} passé en facturation (${fjMois(x.mois_facturation.length===7?x.mois_facturation+"-01":x.mois_facturation)})`:`Débours enregistrés — ${l.dossier}`)) fermer();
  };
  document.body.appendChild(m);
}

/* --------------------------------------------------- paramètres */
function fjGererListes(){
  const modeles=(st.modeles||[]).slice().sort((a,b)=>String(a.titre).localeCompare(String(b.titre),"fr"));
  let etapes=fjEtapes().map(e=>({...e}));
  const m=document.createElement("div"); m.className="modal modal-confirm fj-modal";
  const ligneEtape=(e,i)=>`<div class="row" style="gap:8px;margin:5px 0;flex-wrap:nowrap" data-fj-etape-ligne="${i}">
      <input type="color" data-fje="couleur" value="${fjCouleurSure(e.couleur)}" style="width:44px;padding:2px" title="Couleur">
      <input type="text" data-fje="libelle" value="${esc(e.libelle)}" placeholder="Libellé" style="flex:1">
      <select data-fje="date" style="width:auto" title="Date qui fait passer automatiquement à cette étape">${FJ_CHAMPS_DATE.map(([k,lib])=>`<option value="${k}" ${e.date===k?"selected":""}>${esc(lib)}</option>`).join("")}</select>
      <button class="btn sm" data-fje-haut="${i}" title="Monter" ${i===0?"disabled":""}>↑</button><button class="btn sm" data-fje-bas="${i}" title="Descendre" ${i===etapes.length-1?"disabled":""}>↓</button><button class="btn sm" data-fje-suppr="${i}" title="Supprimer" ${etapes.length<=1?"disabled":""}>✕</button></div>`;
  const lireEtapes=()=>{ m.querySelectorAll("[data-fj-etape-ligne]").forEach(row=>{ const i=+row.dataset.fjEtapeLigne; row.querySelectorAll("[data-fje]").forEach(el=>{ etapes[i][el.dataset.fje]=el.value; }); }); };
  const dessinerEtapes=()=>{
    const zone=m.querySelector("[data-fj-etapes]"); zone.innerHTML=etapes.map(ligneEtape).join("");
    zone.querySelectorAll("[data-fje-haut]").forEach(b=>b.onclick=()=>{ lireEtapes(); const i=+b.dataset.fjeHaut; [etapes[i-1],etapes[i]]=[etapes[i],etapes[i-1]]; dessinerEtapes(); });
    zone.querySelectorAll("[data-fje-bas]").forEach(b=>b.onclick=()=>{ lireEtapes(); const i=+b.dataset.fjeBas; [etapes[i+1],etapes[i]]=[etapes[i],etapes[i+1]]; dessinerEtapes(); });
    zone.querySelectorAll("[data-fje-suppr]").forEach(b=>b.onclick=()=>{ lireEtapes(); etapes.splice(+b.dataset.fjeSuppr,1); dessinerEtapes(); });
  };
  m.innerHTML=`<div class="box" style="max-width:820px"><div class="modal-titlebar"><h2>Paramètres de la facturation juridique</h2><button class="modal-x" type="button">×</button></div>
    <div class="modal-content">
      <label style="display:flex;gap:8px;align-items:center;margin-bottom:12px"><input type="checkbox" data-fj-opt-reperes ${FJ.reglages.options?.reperes?"checked":""}> Afficher le numéro de l'étape dans le carré de couleur (repère pour les personnes qui distinguent mal les couleurs)</label>
      <div class="f"><span><b>Avancement — étapes et couleurs</b></span>
        <div class="hint">Dans l'ordre du parcours. Une étape liée à une date est atteinte dès que cette date est saisie ; l'avancement peut aussi être choisi à la main sur chaque ligne.</div>
        <div data-fj-etapes></div><button class="btn sm" data-fj-etape-ajout style="margin-top:4px">Ajouter une étape</button></div>
      <label class="f" style="margin-top:16px"><span><b>Types d'opération</b> — liste fermée, un par ligne</span><textarea data-fj-types style="min-height:200px">${esc(fjTypes().join("\n"))}</textarea>
      <div class="hint">Un type retiré de la liste reste affiché sur les lignes qui le portent, signalé « hors liste ».</div></label>
      <label class="f" style="margin-top:12px"><span><b>Familles</b> — une par ligne : « Famille : type ; type ; … »</span><textarea data-fj-familles style="min-height:170px">${esc(Object.entries(fjFamilles()).map(([f,ts])=>`${f} : ${(ts||[]).join(" ; ")}`).join("\n"))}</textarea></label>
      <div class="f" style="margin-top:12px"><span><b>Modèles de devis transférés</b> au reclassement du dossier</span>
        ${modeles.map(x=>`<label style="display:flex;gap:8px;align-items:center;margin:4px 0"><input type="checkbox" data-fj-modele="${esc(x.id)}" ${fjModeleRetenu(x)?"checked":""}> ${esc(x.titre||"Modèle")}</label>`).join("")}
      </div>
    </div>
    <div class="modal-actions"><button class="btn" data-no>Annuler</button><button class="btn p" data-yes>Enregistrer</button></div></div>`;
  document.body.appendChild(m); dessinerEtapes();
  m.querySelector("[data-fj-etape-ajout]").onclick=()=>{ lireEtapes(); etapes.push({id:"e"+Date.now().toString(36),libelle:"Nouvelle étape",couleur:"#607D8B",date:""}); dessinerEtapes(); };
  const fermer=()=>m.remove();
  m.querySelector(".modal-x").onclick=fermer; m.querySelector("[data-no]").onclick=fermer;
  m.querySelector("[data-yes]").onclick=async()=>{
    lireEtapes();
    etapes=etapes.map(e=>({id:e.id||("e"+Date.now().toString(36)),libelle:String(e.libelle||"").trim(),couleur:fjCouleurSure(e.couleur),date:FJ_CHAMPS_DATE.some(([k])=>k===e.date)?e.date:""})).filter(e=>e.libelle);
    if(!etapes.length){ toast("Il faut au moins une étape d'avancement.",true); return; }
    const types=[...new Set(m.querySelector("[data-fj-types]").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean))];
    if(!types.length){ toast("La liste des types ne peut pas être vide.",true); return; }
    const familles={};
    for(const ligne of m.querySelector("[data-fj-familles]").value.split(/\r?\n/)){
      const i=ligne.indexOf(":"); if(i<0) continue;
      const f=ligne.slice(0,i).trim(), ts=ligne.slice(i+1).split(";").map(x=>x.trim()).filter(Boolean);
      if(f) familles[f]=ts;
    }
    const inconnus=Object.values(familles).flat().filter(t=>!types.includes(t));
    if(inconnus.length){ toast("Types inconnus dans les familles : "+inconnus.join(", "),true); return; }
    const mods=[...m.querySelectorAll("[data-fj-modele]")].filter(x=>x.checked).map(x=>x.dataset.fjModele);
    const options={...(FJ.reglages.options||{}),reperes:!!m.querySelector("[data-fj-opt-reperes]").checked};
    if(await fjEnregistrerReglage("options",options) && await fjEnregistrerReglage("etapes",etapes) && await fjEnregistrerReglage("types",types) && await fjEnregistrerReglage("familles",familles) && await fjEnregistrerReglage("modeles",mods)){ fermer(); toast("Paramètres enregistrés."); render(); }
  };
}

/* ------------------------------------------------------------ import */
const FJ_MOIS_FR = {janv:1,jan:1,janvier:1,fevr:2,fev:2,fevrier:2,mars:3,mar:3,avr:4,avril:4,mai:5,juin:6,juil:7,juillet:7,aout:8,sept:9,sep:9,septembre:9,oct:10,octobre:10,nov:11,novembre:11,dec:12,decembre:12};
const fjSansAccent = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
const fjIso = (a,m,j) => `${a}-${String(m).padStart(2,"0")}-${String(j).padStart(2,"0")}`;
const fjDateValide = (a,m,j) => { const d=new Date(Date.UTC(a,m-1,j)); return d.getUTCFullYear()===a&&d.getUTCMonth()===m-1&&d.getUTCDate()===j; };

/* Mois de facturation : « oct-26 », « févr.-2026 », « 10/2026 », date Excel… */
function fjLireMois(v){
  if(v===null||v===undefined||v==="") return "";
  if(typeof v==="number"&&v>20000){ const d=new Date(Math.round((v-25569)*86400000)); return d.toISOString().slice(0,7); }
  const s=fjSansAccent(v).replace(/\./g,"");
  let m=/^([a-z]+)[\s\-\/]*(\d{2}|\d{4})$/.exec(s);
  if(m&&FJ_MOIS_FR[m[1]]){ const a=m[2].length===2?2000+(+m[2]):+m[2]; return `${a}-${String(FJ_MOIS_FR[m[1]]).padStart(2,"0")}`; }
  m=/^(\d{1,2})[\/\-.](\d{4})$/.exec(s); if(m&&+m[1]>=1&&+m[1]<=12) return `${m[2]}-${String(+m[1]).padStart(2,"0")}`;
  m=/^(\d{4})-(\d{2})/.exec(s); if(m) return `${m[1]}-${m[2]}`;
  m=/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s); if(m){ const a=m[3].length===2?2000+(+m[3]):+m[3]; return `${a}-${String(+m[2]).padStart(2,"0")}`; }
  return null;
}

/* Date : « 23-sept » (année absente), « 23/09/2025 », ISO, date Excel…
   Sans année, on retient la date la plus récente qui ne dépasse pas la fin
   du mois de référence (mois de facturation de la ligne, sinon aujourd'hui). */
function fjLireDate(v, refMois){
  if(v===null||v===undefined||v==="") return {iso:""};
  if(typeof v==="number"&&v>20000){ const d=new Date(Math.round((v-25569)*86400000)); return {iso:d.toISOString().slice(0,10)}; }
  const s=fjSansAccent(v).replace(/\.(?=\D)/g,"");
  let m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s); if(m) return {iso:`${m[1]}-${m[2]}-${m[3]}`};
  m=/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/.exec(s);
  if(m){ const a=m[3].length===2?2000+(+m[3]):+m[3]; if(fjDateValide(a,+m[2],+m[1])) return {iso:fjIso(a,+m[2],+m[1])}; return {iso:null}; }
  let j,mo;
  m=/^(\d{1,2})[\s\-\/]*([a-z]+)$/.exec(s); if(m&&FJ_MOIS_FR[m[2]]){ j=+m[1]; mo=FJ_MOIS_FR[m[2]]; }
  m=/^(\d{1,2})[\/\-.](\d{1,2})$/.exec(s); if(m){ j=+m[1]; mo=+m[2]; }
  if(!j||!mo) return {iso:null};
  const ref=refMois||today().slice(0,7), [ra,rm]=ref.split("-").map(Number);
  let a=(mo<=rm)?ra:ra-1;
  if(!fjDateValide(a,mo,j)) return {iso:null};
  return {iso:fjIso(a,mo,j), deduite:true};
}

function fjDecoderTexte(buf){
  try{ return new TextDecoder("utf-8",{fatal:true}).decode(buf).replace(/^﻿/,""); }
  catch(_){ return new TextDecoder("windows-1252").decode(buf); }
}
function fjParserCsv(texte){
  const premiere=texte.split(/\r?\n/)[0]||"";
  const sep=(premiere.match(/;/g)||[]).length>=(premiere.match(/,/g)||[]).length?";":",";
  const lignes=[]; let ligne=[], champ="", guillemets=false;
  for(let i=0;i<texte.length;i++){
    const c=texte[i];
    if(guillemets){ if(c==='"'){ if(texte[i+1]==='"'){ champ+='"'; i++; } else guillemets=false; } else champ+=c; continue; }
    if(c==='"') guillemets=true;
    else if(c===sep){ ligne.push(champ); champ=""; }
    else if(c==="\n"){ ligne.push(champ.replace(/\r$/,"")); lignes.push(ligne); ligne=[]; champ=""; }
    else champ+=c;
  }
  if(champ!==""||ligne.length){ ligne.push(champ); lignes.push(ligne); }
  return lignes;
}

/* Fautes de frappe relevées dans le fichier du cabinet, corrigées à l'import
   (à compléter au fil des reprises). */
const FJ_CORRECTIONS = [[/\bEvalution\b/g,"Évaluation"],[/\bAugemtation\b/g,"Augmentation"],[/\bAugementation\b/g,"Augmentation"]];
const fjCorriger = v => FJ_CORRECTIONS.reduce((t,[re,bon])=>t.replace(re,bon),String(v??"").trim());

const FJ_COLONNES = [
  ["dossier",/^(dossier|client)/],["type_operation",/^type/],["mission",/^mission/],["honoraires",/^honoraire/],
  ["date_projet",/^projet/],["date_signature",/^signature/],["date_depot_gtc",/^depot/],["date_fin_formalite",/^fin/],
  ["mois_facturation",/^factur/],["commentaires",/^comment/]
];

function fjAnalyserTableau(tab){
  const entete=(tab[0]||[]).map(fjSansAccent);
  const pos={};
  for(const [cle,re] of FJ_COLONNES){ const i=entete.findIndex(h=>re.test(h)); if(i>=0) pos[cle]=i; }
  if(pos.dossier===undefined) throw new Error("Colonne « Dossier » introuvable sur la première ligne du fichier.");
  const existants=new Set(FJ.lignes.map(l=>fjSansAccent(`${l.dossier}|${l.mission||""}|${+l.honoraires||0}`)));
  const lignes=[], alertes=[]; let doublons=0;
  tab.slice(1).forEach((r,idx)=>{
    const val=k=>pos[k]===undefined?"":r[pos[k]];
    const dossier=String(val("dossier")??"").trim();
    if(!dossier) return;
    const n=idx+2, l={dossier};
    l.type_operation=String(val("type_operation")??"").trim();
    l.mission=fjCorriger(val("mission"));
    l.commentaires=fjCorriger(val("commentaires"));
    const h=fjMontant(val("honoraires")); l.honoraires=Number.isFinite(h)?h:null;
    if(val("honoraires")!==""&&!Number.isFinite(h)) alertes.push(`Ligne ${n} (${dossier}) : honoraires illisibles « ${val("honoraires")} ».`);
    const mf=fjLireMois(val("mois_facturation"));
    if(mf===null){ alertes.push(`Ligne ${n} (${dossier}) : mois de facturation illisible « ${val("mois_facturation")} ».`); l.mois_facturation=""; }
    else l.mois_facturation=mf;
    l.__deduites=[];
    for(const k of ["date_projet","date_signature","date_depot_gtc","date_fin_formalite"]){
      const brut=val(k), r_=fjLireDate(brut,l.mois_facturation||"");
      if(r_.iso===null){ alertes.push(`Ligne ${n} (${dossier}) : date illisible « ${brut} ».`); l[k]=""; }
      else { l[k]=r_.iso; if(r_.deduite) l.__deduites.push(k); }
    }
    if(existants.has(fjSansAccent(`${l.dossier}|${l.mission||""}|${+l.honoraires||0}`))){ doublons++; return; }
    lignes.push(l);
  });
  return {lignes, alertes, doublons};
}

async function fjImporterFichier(f){
  try{
    /* Classeur Excel : TOUTES les feuilles qui portent une colonne
       « Dossier » sont reprises (historique compris) ; les autres sont
       ignorées et signalées. */
    let feuilles=[];
    if(/\.xlsx?$/i.test(f.name)){
      const wb=XLSX.read(await f.arrayBuffer(),{type:"array",cellDates:false});
      feuilles=wb.SheetNames.map(nom=>({nom,tab:XLSX.utils.sheet_to_json(wb.Sheets[nom],{header:1,raw:true,defval:""})}));
    }else feuilles=[{nom:f.name,tab:fjParserCsv(fjDecoderTexte(await f.arrayBuffer()))}];
    const lignes=[], alertes=[], ignorees=[]; let doublons=0;
    const vus=new Set();
    for(const fe of feuilles){
      let r;
      try{ r=fjAnalyserTableau(fe.tab); }catch(_){ ignorees.push(fe.nom); continue; }
      for(const l of r.lignes){
        const cle=fjSansAccent(`${l.dossier}|${l.mission||""}|${+l.honoraires||0}|${l.mois_facturation||""}`);
        if(vus.has(cle)){ doublons++; continue; }   /* même ligne sur deux feuilles */
        vus.add(cle); l.__feuille=fe.nom; lignes.push(l);
      }
      alertes.push(...r.alertes.map(a=>feuilles.length>1?`[${fe.nom}] ${a}`:a)); doublons+=r.doublons;
    }
    const horsListe=[...new Set(lignes.map(l=>l.type_operation).filter(t=>t&&!fjTypes().includes(t)))];
    if(horsListe.length) alertes.push(`Types absents de la liste fermée (à ajouter dans « Gérer les listes » ou à corriger) : ${horsListe.join(", ")}.`);
    if(ignorees.length) alertes.push(`Feuille(s) sans colonne « Dossier », non importée(s) : ${ignorees.join(", ")}.`);
    const nbDeduites=lignes.filter(l=>l.__deduites.length).length;
    const total=lignes.reduce((t,l)=>t+(+l.honoraires||0),0);
    const m=document.createElement("div"); m.className="modal";
    m.innerHTML=`<div class="box" style="max-width:1100px"><div class="modal-titlebar"><h2>Import — ${esc(f.name)}</h2><button class="modal-x" type="button">×</button></div>
      <div class="modal-content">
        <p><b>${lignes.length}</b> ligne(s) à importer · ${eur(total)} HT${doublons?` · ${doublons} ligne(s) déjà présente(s), ignorée(s)`:""}.</p>
        ${nbDeduites?`<div class="notice" style="margin-bottom:10px">Les dates sans année (ex. « 23-sept ») ont été datées automatiquement : la date la plus récente qui ne dépasse pas le mois de facturation de la ligne, ou aujourd'hui à défaut. Elles sont marquées <b>*</b> ci-dessous ; vérifiez-les.</div>`:""}
        ${alertes.length?`<div class="notice rouge" style="margin-bottom:10px">${alertes.map(esc).join("<br>")}</div>`:""}
        <div style="overflow:auto;max-height:52vh"><table class="synthese-table"><thead><tr><th>Dossier</th><th>Type</th><th>Mission</th><th class="r">Honoraires</th><th>Projet</th><th>Signature</th><th>Dépôt GTC</th><th>Fin formalité</th><th>Facturation</th>${feuilles.length>1?"<th>Feuille</th>":""}</tr></thead><tbody>
        ${lignes.map(l=>{const d=k=>l[k]?dateFR(l[k])+(l.__deduites.includes(k)?" *":""):"";return `<tr><td>${esc(l.dossier)}</td><td>${esc(l.type_operation)}</td><td>${esc(l.mission)}</td><td class="r num">${l.honoraires!=null?eur(l.honoraires):""}</td><td>${d("date_projet")}</td><td>${d("date_signature")}</td><td>${d("date_depot_gtc")}</td><td>${d("date_fin_formalite")}</td><td>${esc(fjMois(l.mois_facturation))}</td>${feuilles.length>1?`<td>${esc(l.__feuille)}</td>`:""}</tr>`;}).join("")}
        </tbody></table></div>
      </div>
      <div class="modal-actions"><label class="row" style="gap:6px;margin-right:auto">Importer comme <select data-fj-import-etat style="width:auto"><option value="encours">dossiers en cours</option><option value="facture">lignes facturées</option></select></label><button class="btn" data-no>Annuler</button><button class="btn p" data-yes ${lignes.length?"":"disabled"}>Importer ${lignes.length} ligne(s)</button></div></div>`;
    const fermer=()=>m.remove();
    m.querySelector(".modal-x").onclick=fermer; m.querySelector("[data-no]").onclick=fermer;
    m.querySelector("[data-yes]").onclick=async()=>{
      const etat=m.querySelector("[data-fj-import-etat]").value;
      if(etat==="facture"&&lignes.some(l=>!l.mois_facturation)){ toast("Des lignes n'ont pas de mois de facturation : importez-les comme dossiers en cours.",true); return; }
      const rows=lignes.map(l=>fjLigneVersBase({...l,etat}));
      const {data,error}=await SB.from("facturation_juridique").insert(rows).select();
      if(error){ toast("Import impossible : "+error.message,true); return; }
      FJ.lignes.push(...(data||[])); fermer(); render(); toast(`${data?.length||0} ligne(s) importée(s).`);
    };
    document.body.appendChild(m);
  }catch(e){ toast("Lecture du fichier impossible : "+(e?.message||e),true); }
}

/* ------------------------------------------------------------ export */
function fjExporter(){
  const q=v=>`"${String(v??"").replace(/"/g,'""')}"`, nb=v=>v==null?"":String(v).replace(".",",");
  const L=[["État","Avancement","Dossier","Type","Mission","Honoraires","Projet","Signature","Dépôt GTC","Fin Formalité","Facturation",...FJ_DEBOURS.map(([,lib])=>lib),"Commentaires"].map(q).join(";")];
  for(const l of fjVisibles()) L.push([q(fjEtatsDe(l)==="facture"?"Facturé":"En cours"),q(fjEtatsDe(l)==="facture"?"":fjEtapeDe(l).libelle),q(l.dossier),q(l.type_operation),q(l.mission),nb(l.honoraires),q(dateFR(l.date_projet)),q(dateFR(l.date_signature)),q(dateFR(l.date_depot_gtc)),q(dateFR(l.date_fin_formalite)),q(fjMois(l.mois_facturation)),...FJ_DEBOURS.map(([k])=>nb(l[k])),q(l.commentaires)].join(";"));
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob(["﻿"+L.join("\r\n")],{type:"text/csv;charset=utf-8"}));
  a.download=`facturation-juridique-${today()}.csv`; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1200);
}

/* =====================================================================
   v56 — INTERACTIONS
   ===================================================================== */
/* « Annuler » pendant 8 secondes après une action. */
let FJ_ANNULER_MINUTEUR=null;
function fjAnnulable(message, annuler){
  document.querySelectorAll(".fj-annuler").forEach(x=>x.remove()); clearTimeout(FJ_ANNULER_MINUTEUR);
  const t=document.createElement("div"); t.className="fj-annuler"; t.setAttribute("role","status");
  t.innerHTML=`<span>${esc(message)}</span><button type="button">Annuler</button>`;
  t.querySelector("button").onclick=async()=>{ t.remove(); clearTimeout(FJ_ANNULER_MINUTEUR); try{ await annuler(); toast("Action annulée."); }catch(e){ toast("Annulation impossible : "+(e?.message||e),true); } render(); };
  document.body.appendChild(t);
  FJ_ANNULER_MINUTEUR=setTimeout(()=>t.remove(),8000);
}
/* Enregistre une ligne modifiée et propose de revenir à l'état précédent. */
async function fjEnregistrerAnnulable(avant, apres, message){
  const copie={...avant};
  if(!await fjEnregistrer(apres)) return false;
  render(); fjAnnulable(message, async()=>{ if(!await fjEnregistrer(copie)) throw new Error("enregistrement refusé"); });
  return true;
}

/* Petite fenêtre accrochée à un élément (date d'un jalon, choix d'étape). */
function fjPopover(ancre, html, brancher){
  document.querySelectorAll(".fj-pop").forEach(x=>x.remove());
  const p=document.createElement("div"); p.className="fj-pop"; p.innerHTML=html; document.body.appendChild(p);
  const r=ancre.getBoundingClientRect(), w=p.offsetWidth, h=p.offsetHeight;
  let left=Math.min(Math.max(8,r.left+window.scrollX), window.scrollX+document.documentElement.clientWidth-w-8);
  let top=r.bottom+window.scrollY+6; if(r.bottom+h+12>window.innerHeight) top=r.top+window.scrollY-h-6;
  p.style.left=left+"px"; p.style.top=top+"px";
  const fermer=()=>{ p.remove(); document.removeEventListener("mousedown",dehors,true); document.removeEventListener("keydown",clavier,true); };
  const dehors=e=>{ if(!p.contains(e.target)&&e.target!==ancre) fermer(); };
  const clavier=e=>{ if(e.key==="Escape"){ e.stopPropagation(); fermer(); ancre.focus?.(); } };
  setTimeout(()=>{ document.addEventListener("mousedown",dehors,true); document.addEventListener("keydown",clavier,true); },0);
  brancher(p,fermer);
  p.querySelector("input,button")?.focus();
}

function fjOuvrirJalon(btn){
  const [id,k]=btn.dataset.fjJalon.split(":"); const l=FJ.lignes.find(x=>x.id===id); if(!l) return;
  const lib=(FJ_FRISE.find(x=>x[0]===k)||[])[2]||"Date";
  fjPopover(btn,`<div class="fj-pop-titre">${esc(lib)} — ${esc(l.dossier)}</div>
    <input type="date" data-pop-date value="${esc(l[k]||"")}">
    <div class="fj-pop-actions"><button type="button" class="btn sm" data-pop-auj>Aujourd'hui</button>${l[k]?`<button type="button" class="btn sm" data-pop-eff>Effacer</button>`:""}<button type="button" class="btn sm p" data-pop-ok>Enregistrer</button></div>`,
  (p,fermer)=>{
    const valider=async v=>{ fermer(); if((l[k]||"")===(v||"")) return; await fjEnregistrerAnnulable(l,{...l,[k]:v||""},`${lib} : ${v?dateFR(v):"effacée"} — ${l.dossier}`); };
    const inp=p.querySelector("[data-pop-date]");
    inp.onkeydown=e=>{ if(e.key==="Enter"){ e.preventDefault(); valider(inp.value); } };
    p.querySelector("[data-pop-ok]").onclick=()=>valider(inp.value);
    p.querySelector("[data-pop-auj]").onclick=()=>valider(today());
    const eff=p.querySelector("[data-pop-eff]"); if(eff) eff.onclick=()=>valider("");
  });
}

function fjOuvrirEtape(btn){
  const l=FJ.lignes.find(x=>x.id===btn.dataset.fjEtapeChoix); if(!l) return;
  const E=fjEtapes(), auto=fjEtapeDe({...l,avancement:""});
  fjPopover(btn,`<div class="fj-pop-titre">Étape — ${esc(l.dossier)}</div>
    <button type="button" class="fj-pop-ligne${!l.avancement?" on":""}" data-pop-etape=""><span class="fj-point" style="--fj-c:${fjCouleurSure(auto.couleur)}"></span>Automatique, selon les dates (${esc(auto.libelle)})</button>
    ${E.map(e=>`<button type="button" class="fj-pop-ligne${l.avancement===e.id?" on":""}" data-pop-etape="${esc(e.id)}"><span class="fj-point" style="--fj-c:${fjCouleurSure(e.couleur)}"></span>${esc(e.libelle)}</button>`).join("")}`,
  (p,fermer)=>{
    p.querySelectorAll("[data-pop-etape]").forEach(b=>b.onclick=async()=>{
      fermer(); const v=b.dataset.popEtape; if((l.avancement||"")===v) return;
      const lib=v?(E.find(e=>e.id===v)?.libelle||""):"automatique";
      await fjEnregistrerAnnulable(l,{...l,avancement:v},`Étape : ${lib} — ${l.dossier}`);
    });
  });
}

/* Clavier dans les fenêtres : Échap ferme, Entrée valide (hors zone de texte). */
if(!window.__fjClavier){
  window.__fjClavier=true;
  document.addEventListener("keydown",e=>{
    if(document.querySelector(".fj-pop")) return;
    const modales=[...document.querySelectorAll(".modal")]; const m=modales[modales.length-1]; if(!m) return;
    if(e.key==="Escape"){ const x=m.querySelector(".modal-x,[data-no],[data-x]"); if(x){ e.preventDefault(); x.click(); } return; }
    if(e.key==="Enter"&&m.classList.contains("fj-modal")){
      const t=e.target; if(t&&(t.tagName==="TEXTAREA"||t.tagName==="BUTTON"||t.tagName==="SELECT")) return;
      const ok=m.querySelector("[data-yes]"); if(ok&&!ok.disabled){ e.preventDefault(); ok.click(); }
    }
  });
}

/* ----------------------------------------------------- liaisons écran */
/* Sur téléphone, chaque ligne devient une fiche : chaque cellule reçoit le
   libellé de sa colonne, et les cellules vides sont masquées. */
/* v58.5 : étendu aux tableaux de l'ensemble de l'application (portefeuille,
   clients, historique, référentiels, audit) — appelé à chaque affichage. */
const TABLES_FICHES = ".fj-table, .mission-table:not(.ca-table), .client-table, .referentiel-table, .audit-table, .client-side table, .table-fiches";
function fjEtiqueterTables(){
  document.querySelectorAll(TABLES_FICHES).forEach(t=>{
    t.classList.add("en-fiches");
    const premiere=[...(t.tBodies[0]?.rows[0]?.cells||[])].find(c=>!c.classList.contains("bulk-check"));
    const titres=[...t.querySelectorAll("thead th")].map(th=>{ const c=th.cloneNode(true); c.querySelectorAll(".fj-fleche").forEach(x=>x.remove()); return c.textContent.trim(); });
    const iTitre=premiere?premiere.cellIndex:0;
    t.querySelectorAll("tbody tr").forEach(tr=>[...tr.cells].forEach(td=>{
      if(td.colSpan>1) return;
      td.dataset.l=titres[td.cellIndex]||"";
      if(td.cellIndex===iTitre) td.classList.add("cell-titre");
      const vide=!td.querySelector("input,button,select,img,svg,a,details");
      if(vide&&(td.textContent.trim()==="—"||td.textContent.trim()==="")) td.classList.add("fj-vide");
    }));
  });
}

function fjLier(){
  if(st.view!=="juridique"||!FJ.acces) return;
  fjEtiqueterTables();
  const un=(sel,f)=>document.querySelectorAll(sel).forEach(f);
  un("[data-fj-onglet]",b=>b.onclick=()=>{ FJ.onglet=b.dataset.fjOnglet; render(); });
  /* v56.1 : un clic sur la ligne ouvre sa modification, comme « Modifier ».
     Les éléments qui ont leur propre action (boutons, frise, étape, nom du
     client, liens, champs) la gardent. Entrée fait de même au clavier. */
  un("[data-fj-ligne]",tr=>{
    const ouvrir=()=>{ const l=FJ.lignes.find(x=>x.id===tr.dataset.fjLigne); if(l) fjEditer(l,"Modifier la ligne"); };
    tr.onclick=e=>{
      if(e.target.closest("button,a,input,select,textarea,label,.fj-pop")) return;
      if(String(window.getSelection?.()||"").trim()) return;   /* sélection de texte pour copier : pas d'ouverture */
      ouvrir();
    };
    /* stopPropagation : sans cela, la même frappe Entrée validerait aussitôt la fenêtre ouverte. */
    tr.onkeydown=e=>{ if(e.key==="Enter"&&e.target===tr){ e.preventDefault(); e.stopPropagation(); ouvrir(); } };
  });
  un("[data-fj-trier]",th=>th.onclick=()=>{ const [o,k]=th.dataset.fjTrier.split(":"); const t=FJ.tris[o]; FJ.tris[o]=t&&t.k===k?{k,dir:t.dir==="asc"?"desc":"asc"}:{k,dir:"asc"}; render(); });
  un("[data-fj-jalon]",b=>b.onclick=e=>{ e.stopPropagation(); fjOuvrirJalon(b); });
  un("[data-fj-etape-choix]",b=>b.onclick=e=>{ e.stopPropagation(); fjOuvrirEtape(b); });
  un("[data-fj-terminee]",b=>b.onclick=async()=>{ const l=FJ.lignes.find(x=>x.id===b.dataset.fjTerminee); if(!l) return;
    await fjEnregistrerAnnulable(l,{...l,date_fin_formalite:today(),avancement:""},`Formalité terminée le ${dateFR(today())} — ${l.dossier}`); });
  un("[data-fj-graph-donnees]",cadre=>{
    const data=JSON.parse(cadre.dataset.fjGraphDonnees||"[]"), bulle=cadre.querySelector(".fj-graph-bulle");
    cadre.querySelectorAll("[data-fj-graph]").forEach(z=>{
      const montrer=()=>{ const x=data[+z.dataset.fjGraph]; if(!x) return;
        const ec=x.p?`${x.t>=x.p?"+":""}${Math.round((x.t-x.p)/x.p*100)} %`:"—";
        bulle.innerHTML=`<b>${esc(fjMoisLong(x.m))}</b><div><i class="fj-graph-n"></i>Exercice : ${eur0(x.t)}</div><div><i class="fj-graph-n1"></i>N-1 : ${eur0(x.p)}</div><div class="dim">Écart : ${ec}</div>`;
        bulle.hidden=false; const rc=cadre.getBoundingClientRect(), rz=z.getBoundingClientRect();
        let gx=rz.left-rc.left+rz.width/2-bulle.offsetWidth/2; gx=Math.max(0,Math.min(gx,rc.width-bulle.offsetWidth));
        bulle.style.left=gx+"px"; bulle.style.top="34px"; z.classList.add("survol"); };
      const cacher=()=>{ bulle.hidden=true; z.classList.remove("survol"); };
      z.addEventListener("mouseenter",montrer); z.addEventListener("mouseleave",cacher);
      z.addEventListener("click",montrer);
    });
  });
  un("[data-fj-indicateurs]",d=>d.ontoggle=()=>{ try{ localStorage.setItem("serre:fj:indicateurs",d.open?"1":"0"); }catch(_){} });
  un("[data-fj-client]",b=>b.onclick=e=>{ e.stopPropagation(); st.clientViewId=b.dataset.fjClient; st.view="client1"; render(); });
  un("[data-fj-etape]",b=>b.onclick=()=>{ FJ.filtreEtape=b.dataset.fjEtape; render(); });
  un("[data-fj-exercice-factures]",x=>x.onchange=()=>{ FJ.exerciceFactures=x.value==="tous"?"tous":+x.value; render(); });
  un("[data-fj-recherche]",i=>i.oninput=()=>{ FJ.recherche=i.value; const pos=i.selectionStart; render(); const n=document.querySelector("[data-fj-recherche]"); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(_){} } });
  un("[data-fj-nouveau]",b=>b.onclick=()=>fjEditer({dossier:"",etat:"encours"},"Nouvelle ligne"));
  un("[data-fj-modifier]",b=>b.onclick=()=>{ const l=FJ.lignes.find(x=>x.id===b.dataset.fjModifier); if(l) fjEditer(l,"Modifier la ligne"); });
  un("[data-fj-facturer]",b=>b.onclick=()=>{ const l=FJ.lignes.find(x=>x.id===b.dataset.fjFacturer); if(l) fjSaisieFacturation(l,true); });
  un("[data-fj-debours]",b=>b.onclick=()=>{ const l=FJ.lignes.find(x=>x.id===b.dataset.fjDebours); if(l) fjSaisieFacturation(l,false); });
  un("[data-fj-suivre]",b=>b.onclick=()=>{ const d=st.devis.find(x=>x.id===b.dataset.fjSuivre); if(d) fjEditer(fjDepuisDossier(d),"Ajouter au suivi"); });
  un("[data-fj-ignorer]",b=>b.onclick=async()=>{
    const d=st.devis.find(x=>x.id===b.dataset.fjIgnorer);
    if(FJ.colonneEcarte&&d){ await fjEnregistrer({...fjDepuisDossier(d),ecarte:true}); }
    else fjMasquer(b.dataset.fjIgnorer);
    render();
  });
  /* Retour sur l'écran : transfert des dossiers validés entre-temps. */
  if(Date.now()-FJ.derniereSync>30000) fjSynchroniser().then(n=>{ if(n){ toast(`${n} dossier(s) reclassé(s) transféré(s) dans les dossiers en cours.`); render(); } });
  un("[data-fj-valider]",b=>b.onclick=async()=>{
    const d=st.devis.find(x=>x.id===b.dataset.fjValider); if(!d) return;
    if(!await askConfirm("Devis validé",`Le devis ${d.ref||""} de ${d.client?.raison||"ce client"} sera marqué « signé ou validé » à la date du jour. Les documents du dossier seront figés, comme depuis le dossier lui-même.`,{confirmLabel:"Valider le devis"})) return;
    const avant=JSON.parse(JSON.stringify(d));
    await fjSurDevis(d.id, async()=>{ await ACTS.manualSignStep({dataset:{step:"quoteSigned"},checked:true}); });
    if(d.manualSign?.quoteSigned) fjAnnulable(`Devis ${d.ref||""} validé — ${d.client?.raison||""}`, async()=>{
      await fjSurDevis(d.id, async(x)=>{ for(const k of Object.keys(x)) if(k!=="rev") delete x[k]; Object.assign(x,{...avant,rev:x.rev}); logAudit(x,"Validation du devis annulée",""); await saveDev(); });
    });
  });
  un("[data-fj-sans-suite]",b=>b.onclick=async()=>{
    const d=st.devis.find(x=>x.id===b.dataset.fjSansSuite); if(!d) return;
    if(!await askConfirm("Devis sans suite",`Le devis ${d.ref||""} de ${d.client?.raison||"ce client"} sera classé « sans suite ». Il quitte la liste des devis envoyés et les relances ; il reste consultable et peut être réactivé.`,{confirmLabel:"Classer sans suite"})) return;
    await fjSurDevis(d.id, async(x)=>{ x.sansSuite={date:today(),par:actorName()}; x.statut="sans_suite"; logAudit(x,"Devis classé sans suite",""); await saveDev(); });
    fjAnnulable(`Devis ${d.ref||""} classé sans suite — ${d.client?.raison||""}`, async()=>{
      await fjSurDevis(d.id, async(x)=>{ delete x.sansSuite; x.statut=workflowStatut(x); logAudit(x,"Devis réactivé (sans suite annulé)",""); await saveDev(); });
    });
  });
  un("[data-fj-reactiver]",b=>b.onclick=async()=>{
    const d=st.devis.find(x=>x.id===b.dataset.fjReactiver); if(!d) return;
    await fjSurDevis(d.id, async(x)=>{ delete x.sansSuite; x.statut=workflowStatut(x); logAudit(x,"Devis réactivé (sans suite annulé)",""); await saveDev(); toast("Devis remis en attente de réponse."); });
  });
  un("[data-fj-devis]",b=>b.onclick=()=>{ st.id=b.dataset.fjDevis; st.view="devis1"; st.tab=rememberedTab(st.id); render(); });
  un("[data-fj-export]",b=>b.onclick=fjExporter);
  un("[data-fj-listes]",b=>b.onclick=fjGererListes);
  un("[data-fj-exercice]",x=>x.onchange=()=>{ FJ.exercice=+x.value; render(); });
  const fichier=document.querySelector("[data-fj-fichier]");
  un("[data-fj-import]",b=>b.onclick=()=>fichier?.click());
  if(fichier) fichier.onchange=()=>{ const f=fichier.files?.[0]; fichier.value=""; if(f) fjImporterFichier(f); };
}
