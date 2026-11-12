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
  filtre: "tous",      /* tous | encours | afacturer | facture */
  recherche: "",
  tri: "facturation",
  colonneEcarte: false, /* script v55.1 passé : les retraits sont conservés en base */
  reglagesEnBase: false,
  reglages: { types: null, modeles: null, familles: null },  /* null = valeurs par défaut */
  exercice: null,      /* année de début de l'exercice affiché (juin → mai) */
  derniereSync: 0
};

/* Liste fermée par défaut (types relevés dans le fichier du cabinet) ;
   remplacée par la liste enregistrée dans « Gérer les listes ». */
const FJ_TYPES = [
  "Constitution Uni", "Constitution SCI", "Constitution par apport",
  "Cession d'actions / parts sociales", "Modifications multiples",
  "Opérations capitalistiques", "Etablissement supplémentaire",
  "Conventions (tréso / MF / C.C / obligations / bail)", "TUP / Fusion",
  "AGOA", "2777 et dividendes"
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
    ...(l.ecarte===true?{ecarte:true}:{})
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
function fjStatut(l){
  if(l.mois_facturation) return "facture";
  if(l.date_fin_formalite) return "afacturer";
  return "encours";
}
const FJ_STATUTS = { encours:["En cours","gris"], afacturer:["À facturer","ocre"], facture:["Facturé","vert"] };

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

function fjSynthese(){
  const moisCourant=today().slice(0,7), ex=fjExerciceDe(today());
  const s={encours:{n:0,m:0},afacturer:{n:0,m:0},moisCourant:0,exercice:0,exerciceN1MemePeriode:0,parMois:{}};
  /* N-1 à période comparable : mêmes mois écoulés de l'exercice précédent. */
  const moisEcoules=new Set(fjMoisExercice(ex).filter(m=>m<=moisCourant).map(m=>`${+m.slice(0,4)-1}${m.slice(4)}`));
  for(const l of fjVisibles()){
    const h=+l.honoraires||0, st_=fjStatut(l);
    if(st_==="encours"){ s.encours.n++; s.encours.m+=h; }
    if(st_==="afacturer"){ s.afacturer.n++; s.afacturer.m+=h; }
    if(l.mois_facturation){
      const m=String(l.mois_facturation).slice(0,7);
      s.parMois[m]=(s.parMois[m]||0)+h;
      if(m===moisCourant) s.moisCourant+=h;
      if(fjExerciceDe(m)===ex) s.exercice+=h;
      if(moisEcoules.has(m)) s.exerciceN1MemePeriode+=h;
    }
  }
  return s;
}

function fjTableauExercice(n){
  const mois=fjMoisExercice(n), lignes=fjVisibles().filter(l=>l.mois_facturation&&fjExerciceDe(l.mois_facturation)===n);
  const precedentes=fjVisibles().filter(l=>l.mois_facturation&&fjExerciceDe(l.mois_facturation)===n-1);
  const parMois=mois.map(m=>{
    const du=lignes.filter(l=>String(l.mois_facturation).slice(0,7)===m), n1=precedentes.filter(l=>String(l.mois_facturation).slice(0,7)===`${+m.slice(0,4)-1}${m.slice(4)}`);
    const t=du.reduce((a,l)=>a+(+l.honoraires||0),0), j=du.filter(fjEstJlt).reduce((a,l)=>a+(+l.honoraires||0),0), p=n1.reduce((a,l)=>a+(+l.honoraires||0),0);
    return {m,t,j,p};
  });
  const total=parMois.reduce((a,x)=>a+x.t,0);
  const types={}, familles={};
  for(const l of lignes){
    const t=l.type_operation||"Sans type", h=+l.honoraires||0;
    types[t]=types[t]||{h:0,n:0}; types[t].h+=h; types[t].n++;
    const f=fjFamilleDe(l.type_operation); familles[f]=(familles[f]||0)+h;
  }
  return {parMois,total,types,familles,nb:lignes.length};
}

/* Dossiers juridiques signés dans l'outil de devis, pas encore suivis ici. */
function fjMasques(){ try{ return new Set(JSON.parse(localStorage.getItem(FJ_MASQUES_STORAGE)||"[]")); }catch(_){ return new Set(); } }
function fjMasquer(id){ try{ const s=fjMasques(); s.add(id); localStorage.setItem(FJ_MASQUES_STORAGE,JSON.stringify([...s])); }catch(_){} }

function fjDossiersASuivre(){
  /* Un dossier déjà lié à une ligne (même retirée ou scindée) n'est plus proposé. */
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

/* Ligne proposée pour un dossier reclassé. Les dates (projet, signature des
   actes, dépôt, fin de formalité) et le type restent à saisir : l'outil de
   devis ne les connaît pas. */
function fjDepuisDossier(d){
  const m=modOf(d), t=totaux(d,m), cats=honorairesParCategorie(d,m).cats||{};
  const libelles=[...new Set(Object.values(cats).flatMap(c=>(c.lignes||[])).filter(x=>(+x.montant||0)>0).map(x=>String(x.label||"").trim()).filter(Boolean))];
  const titre=intituleDevis(d);
  const libre=titre&&titre!=="Devis"?titre:"";
  return {
    dossier:d.client?.raison||"", type_operation:"",
    mission:(libre||libelles.join(" + ")).slice(0,300),
    honoraires:Math.round((+t.ht||0)*100)/100,
    devis_id:d.id
  };
}

/* --------------------------------------------------------------- vue */
VIEWS.juridique = () => {
  if(!FJ.acces) return `<div class="top"><h1>Facturation juridique</h1></div><div class="wrap"><div class="notice">Accès non autorisé.</div></div>`;
  const s=fjSynthese(), aSuivre=fjDossiersASuivre();
  const q=normClient(FJ.recherche||"");
  let lignes=fjVisibles().filter(l=>FJ.filtre==="tous"||fjStatut(l)===FJ.filtre);
  if(q) lignes=lignes.filter(l=>normClient(`${l.dossier} ${l.type_operation||""} ${l.mission||""} ${l.commentaires||""}`).includes(q));
  const ordre={encours:0,afacturer:1,facture:2};
  lignes.sort((a,b)=>FJ.tri==="dossier"
    ? String(a.dossier).localeCompare(String(b.dossier),"fr")
    : (ordre[fjStatut(a)]-ordre[fjStatut(b)]) || String(b.mois_facturation||b.date_fin_formalite||b.date_signature||"").localeCompare(String(a.mois_facturation||a.date_fin_formalite||a.date_signature||"")));
  const total=lignes.reduce((t,l)=>t+(+l.honoraires||0),0);
  const compte=f=>f==="tous"?fjVisibles().length:fjVisibles().filter(l=>fjStatut(l)===f).length;
  const onglet=(f,l)=>`<button class="vue-onglet ${FJ.filtre===f?"on":""}" data-fj-filtre="${f}">${l} <span class="vue-compte">${compte(f)}</span></button>`;
  const dt=v=>v?dateFR(v):`<span class="dim">—</span>`;

  return `<div class="top"><h1>Facturation juridique</h1><span class="sub">Accès réservé — invisible des autres comptes${FJ.colonneEcarte&&FJ.reglagesEnBase?"":` · <b>relancer le script v55 dans Supabase (mise à jour)</b>`}</span><span class="spacer"></span>
    <button class="btn" data-fj-listes>Gérer les listes</button>
    <button class="btn" data-fj-import>Importer un fichier</button>
    <button class="btn" data-fj-export>Exporter en CSV</button>
    <button class="btn p" data-fj-nouveau>Nouvelle ligne</button>
    <input type="file" data-fj-fichier accept=".csv,.txt,.xlsx,.xls" hidden></div>
  <div class="wrap">
    ${FJ.erreur?`<div class="notice rouge" style="margin-bottom:12px">${esc(FJ.erreur)}</div>`:""}
    <div class="kpi-grid">
      ${kpi("En cours",eur0(s.encours.m),`${s.encours.n} mission(s), formalité non terminée`)}
      ${kpi("À facturer",eur0(s.afacturer.m),`${s.afacturer.n} mission(s), formalité terminée`)}
      ${kpi("Facturé ce mois",eur0(s.moisCourant),esc(fjMoisLong(today())))}
      ${kpi(`Exercice ${fjLibelleExercice(fjExerciceDe(today()))}`,eur0(s.exercice),s.exerciceN1MemePeriode?`N-1 à date : ${eur0(s.exerciceN1MemePeriode)} (${s.exercice>=s.exerciceN1MemePeriode?"+":""}${Math.round((s.exercice-s.exerciceN1MemePeriode)/s.exerciceN1MemePeriode*100)} %)`:"Juin à mai")}
    </div>
    ${aSuivre.length?`<details class="card" style="margin-bottom:14px" ${aSuivre.length<=5?"open":""}><summary class="hd" style="cursor:pointer">Missions juridiques exceptionnelles reclassées dans l'outil, non encore suivies ici <span class="tag ocre">${aSuivre.length}</span></summary><div class="bd">
      <table class="synthese-table"><thead><tr><th>Client</th><th>Devis</th><th>Classé le</th><th class="r">Honoraires HT</th><th></th></tr></thead><tbody>
      ${aSuivre.slice(0,30).map(x=>`<tr><td>${esc(x.d.client?.raison||"Dossier")}</td><td>${esc(x.d.ref||intituleDevis(x.d))}</td><td>${dt(String(x.date||"").slice(0,10))}</td><td class="r num">${eur(x.montant)}</td>
        <td class="r"><button class="btn sm p" data-fj-suivre="${esc(x.d.id)}">Ajouter au suivi</button> <button class="btn sm" data-fj-ignorer="${esc(x.d.id)}" title="Ne plus proposer ce dossier">Ignorer</button></td></tr>`).join("")}
      </tbody></table>${aSuivre.length>30?`<div class="hint">… et ${aSuivre.length-30} autre(s).</div>`:""}</div></details>`:""}
    <div class="card"><div class="bd">
      <div class="row" style="justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px">
        <div class="vues-barre" style="margin:0">${onglet("tous","Toutes")}${onglet("encours","En cours")}${onglet("afacturer","À facturer")}${onglet("facture","Facturées")}</div>
        <div class="row" style="gap:8px"><input type="search" data-fj-recherche placeholder="Rechercher un dossier, une mission…" value="${esc(FJ.recherche)}" style="min-width:240px">
        <select data-fj-tri><option value="facturation" ${FJ.tri!=="dossier"?"selected":""}>Tri : statut puis date</option><option value="dossier" ${FJ.tri==="dossier"?"selected":""}>Tri : dossier</option></select></div>
      </div>
      <div style="overflow-x:auto"><table class="synthese-table fj-table">
        <thead><tr><th>Dossier</th><th>Type</th><th>Mission</th><th class="r">Honoraires HT</th><th title="Envoi du projet d'acte">Projet</th><th title="Signature des actes">Signature</th><th>Dépôt GTC</th><th>Fin formalité</th><th title="Mois de rattachement de la facturation">Facturation</th><th>Statut</th><th></th></tr></thead>
        <tbody>${lignes.map(l=>{const [lib,coul]=FJ_STATUTS[fjStatut(l)];return `<tr>
          <td><b>${esc(l.dossier)}</b>${l.devis_id&&st.devis.some(d=>d.id===l.devis_id)?` <button class="btn sm" data-fj-devis="${esc(l.devis_id)}" title="Ouvrir le dossier dans l'outil de devis">Devis</button>`:""}${l.commentaires?`<div class="hint">${esc(l.commentaires)}</div>`:""}</td>
          <td>${esc(l.type_operation||"")}${l.type_operation&&!fjTypes().includes(l.type_operation)?` <span class="tag rouge" title="Type absent de la liste fermée">hors liste</span>`:""}</td><td>${esc(l.mission||"")}</td>
          <td class="r num">${l.honoraires!=null?eur(l.honoraires):`<span class="dim">—</span>`}</td>
          <td>${dt(l.date_projet)}</td><td>${dt(l.date_signature)}</td><td>${dt(l.date_depot_gtc)}</td><td>${dt(l.date_fin_formalite)}</td>
          <td>${l.mois_facturation?esc(fjMois(l.mois_facturation)):`<span class="dim">—</span>`}</td>
          <td><span class="tag ${coul}">${lib}</span></td>
          <td class="r" style="white-space:nowrap">${fjStatut(l)==="afacturer"?`<button class="btn sm p" data-fj-facturer="${esc(l.id)}" title="Facturé ce mois-ci">Facturé</button> `:""}<button class="btn sm" data-fj-modifier="${esc(l.id)}">Modifier</button></td></tr>`;}).join("")||`<tr><td colspan="11"><div class="empty-state"><b>Aucune ligne</b><small>Importez votre fichier ou ajoutez une ligne.</small></div></td></tr>`}</tbody>
        <tfoot><tr class="total"><td colspan="3"><b>Total (${lignes.length} ligne(s) affichée(s))</b></td><td class="r num"><b>${eur(total)}</b></td><td colspan="7"></td></tr></tfoot>
      </table></div>
    </div></div>
    ${fjTableauDeBordHTML()}
  </div>`;
};

function fjTableauDeBordHTML(){
  const dispo=fjExercicesDisponibles();
  const n=dispo.includes(FJ.exercice)?FJ.exercice:dispo[0];
  const d=fjTableauExercice(n), pct=(a,b)=>b?`${Math.round(a/b*1000)/10} %`:"—";
  const ecart=(t,p)=>p?`<span class="${t>=p?"":"dim"}">${t>=p?"+":""}${Math.round((t-p)/p*100)} %</span>`:`<span class="dim">—</span>`;
  const totP=d.parMois.reduce((a,x)=>a+x.p,0), totJ=d.parMois.reduce((a,x)=>a+x.j,0);
  const types=Object.entries(d.types).sort((a,b)=>b[1].h-a[1].h);
  const fams=Object.keys(fjFamilles()).map(f=>[f,d.familles[f]||0]);
  for(const f of ["Non classé","Sans type"]) if(d.familles[f]) fams.push([f,d.familles[f]]);
  return `<div class="card" style="margin-top:14px"><div class="hd" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">Tableau de bord — exercice
      <select data-fj-exercice style="width:auto;min-width:150px">${dispo.map(x=>`<option value="${x}" ${x===n?"selected":""}>${fjLibelleExercice(x)}</option>`).join("")}</select>
      <span class="dim" style="font-weight:400">${d.nb} ligne(s) · ${eur0(d.total)} HT</span></div>
    <div class="bd"><div class="grid g2" style="align-items:start;gap:18px">
      <div style="overflow-x:auto"><table class="synthese-table fj-table"><thead><tr><th>Mois</th><th class="r">Honoraires</th><th class="r">Dont JLT</th><th class="r">%</th><th class="r">N-1</th><th class="r">Écart</th></tr></thead><tbody>
        ${d.parMois.map(x=>`<tr><td>${esc(fjMoisLong(x.m))}</td><td class="r num">${x.t?eur0(x.t):`<span class="dim">—</span>`}</td><td class="r num">${x.j?eur0(x.j):`<span class="dim">—</span>`}</td><td class="r num">${x.t?pct(x.j,x.t):"—"}</td><td class="r num">${x.p?eur0(x.p):`<span class="dim">—</span>`}</td><td class="r num">${x.m>today().slice(0,7)?"":(x.t||x.p?ecart(x.t,x.p):"")}</td></tr>`).join("")}
      </tbody><tfoot><tr class="total"><td><b>Total</b></td><td class="r num"><b>${eur0(d.total)}</b></td><td class="r num">${eur0(totJ)}</td><td class="r num">${pct(totJ,d.total)}</td><td class="r num">${eur0(totP)}</td><td class="r num">${ecart(d.total,totP)}</td></tr></tfoot></table>
      <div class="hint">N-1 : même mois de l'exercice précédent. Écart sur l'année complète ; pour l'exercice en cours, voir l'indicateur « N-1 à date » en haut.</div></div>
      <div>
        <table class="synthese-table"><thead><tr><th>Famille</th><th class="r">Honoraires</th><th class="r">%</th></tr></thead><tbody>
          ${fams.map(([f,h])=>`<tr><td>${esc(f)}</td><td class="r num">${h?eur0(h):`<span class="dim">—</span>`}</td><td class="r num">${pct(h,d.total)}</td></tr>`).join("")}
        </tbody></table>
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
    const l={...ligne};
    const types=fjTypes();
    const champ=(k,lib,type="text",extra="")=>`<label class="f"><span>${lib}</span><input type="${type}" data-fjf="${k}" value="${esc(type==="month"?String(l[k]||"").slice(0,7):(l[k]??""))}" ${extra}></label>`;
    const m=document.createElement("div"); m.className="modal modal-confirm";
    m.innerHTML=`<div class="box" style="max-width:760px"><div class="modal-titlebar"><h2>${esc(titre)}</h2><button class="modal-x" type="button">×</button></div>
      <div class="modal-content"><div class="grid g2">
        ${champ("dossier","Dossier (client)","text","required")}
        <label class="f"><span>Type d'opération</span><select data-fjf="type_operation"><option value="">— À choisir —</option>${types.map(t=>`<option value="${esc(t)}" ${l.type_operation===t?"selected":""}>${esc(t)}</option>`).join("")}${l.type_operation&&!types.includes(l.type_operation)?`<option value="${esc(l.type_operation)}" selected>${esc(l.type_operation)} (hors liste)</option>`:""}</select></label>
        ${champ("mission","Mission")}
        ${champ("honoraires","Honoraires HT (€)","number",'step="0.01" min="0"')}
        ${champ("date_projet","Envoi du projet d'acte","date")}
        ${champ("date_signature","Signature des actes","date")}
        ${champ("date_depot_gtc","Dépôt GTC","date")}
        ${champ("date_fin_formalite","Fin de formalité","date")}
        ${champ("mois_facturation","Facturation — mois de rattachement","month",'placeholder="mm/aaaa"')}
        <label class="f"><span>Dossier de l'outil de devis</span><select data-fjf="devis_id"><option value="">— Aucun —</option>${(st.devis||[]).filter(d=>!isArchivedDevis(d)).map(d=>`<option value="${esc(d.id)}" ${l.devis_id===d.id?"selected":""}>${esc((d.client?.raison||"Dossier")+(d.ref?" · "+d.ref:""))}</option>`).join("")}</select></label>
        <label class="f" style="grid-column:1/-1"><span>Commentaires</span><textarea data-fjf="commentaires">${esc(l.commentaires||"")}</textarea></label>
      </div></div>
      <div class="modal-actions">${l.id?`<button class="btn" data-fj-suppr style="color:var(--rouge)">Supprimer</button><button class="btn" data-fj-scinder style="margin-right:auto" title="Créer une seconde ligne pour le même dossier (une ligne par opération)">Dupliquer la ligne</button>`:""}<button class="btn" data-no>Annuler</button><button class="btn p" data-yes>Enregistrer</button></div></div>`;
    const fin=v=>{ m.remove(); resolve(v); };
    m.querySelector(".modal-x").onclick=()=>fin(null);
    m.querySelector("[data-no]").onclick=()=>fin(null);
    m.querySelector("[data-yes]").onclick=()=>{ m.querySelectorAll("[data-fjf]").forEach(el=>{ l[el.dataset.fjf]=el.value; }); fin(l); };
    const sup=m.querySelector("[data-fj-suppr]"); if(sup) sup.onclick=()=>fin({...l,__supprimer:true});
    const sc=m.querySelector("[data-fj-scinder]"); if(sc) sc.onclick=()=>{ m.querySelectorAll("[data-fjf]").forEach(el=>{ l[el.dataset.fjf]=el.value; }); fin({...l,__scinder:true}); };
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
    /* La ligne d'origine est enregistrée telle quelle ; la copie part sans
       montant ni dates d'avancement, à compléter. */
    const {__scinder,...orig}=r;
    if(!await fjEnregistrer(orig)) return;
    const {id,created_at,updated_at,...copie}=orig;
    await fjEditer({...copie,mission:"",honoraires:"",date_depot_gtc:"",date_fin_formalite:"",mois_facturation:""},"Nouvelle ligne pour le même dossier");
    return;
  }
  if(await fjEnregistrer(r)){ toast("Ligne enregistrée."); render(); }
}

/* --------------------------------------------------- gérer les listes */
function fjGererListes(){
  const modeles=(st.modeles||[]).slice().sort((a,b)=>String(a.titre).localeCompare(String(b.titre),"fr"));
  const m=document.createElement("div"); m.className="modal modal-confirm";
  m.innerHTML=`<div class="box" style="max-width:720px"><div class="modal-titlebar"><h2>Gérer les listes</h2><button class="modal-x" type="button">×</button></div>
    <div class="modal-content">
      <label class="f"><span>Types d'opération — liste fermée, un par ligne</span><textarea data-fj-types style="min-height:220px">${esc(fjTypes().join("\n"))}</textarea>
      <div class="hint">Un type retiré de la liste reste affiché sur les lignes qui le portent, signalé « hors liste ».</div></label>
      <label class="f" style="margin-top:12px"><span>Familles — une par ligne, au format « Famille : type ; type ; … »</span><textarea data-fj-familles style="min-height:180px">${esc(Object.entries(fjFamilles()).map(([f,ts])=>`${f} : ${(ts||[]).join(" ; ")}`).join("\n"))}</textarea>
      <div class="hint">Un type absent de toutes les familles apparaît en « Non classé » dans le tableau de bord.</div></label>
      <div class="f" style="margin-top:12px"><span>Modèles de devis dont les dossiers reclassés sont transférés automatiquement</span>
        ${modeles.map(x=>`<label style="display:flex;gap:8px;align-items:center;margin:4px 0"><input type="checkbox" data-fj-modele="${esc(x.id)}" ${fjModeleRetenu(x)?"checked":""}> ${esc(x.titre||"Modèle")}</label>`).join("")}
      </div>
    </div>
    <div class="modal-actions"><button class="btn" data-no>Annuler</button><button class="btn p" data-yes>Enregistrer</button></div></div>`;
  const fermer=()=>m.remove();
  m.querySelector(".modal-x").onclick=fermer; m.querySelector("[data-no]").onclick=fermer;
  m.querySelector("[data-yes]").onclick=async()=>{
    const types=[...new Set(m.querySelector("[data-fj-types]").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean))];
    const mods=[...m.querySelectorAll("[data-fj-modele]")].filter(x=>x.checked).map(x=>x.dataset.fjModele);
    if(!types.length){ toast("La liste des types ne peut pas être vide.",true); return; }
    const familles={};
    for(const ligne of m.querySelector("[data-fj-familles]").value.split(/\r?\n/)){
      const i=ligne.indexOf(":"); if(i<0) continue;
      const f=ligne.slice(0,i).trim(), ts=ligne.slice(i+1).split(";").map(x=>x.trim()).filter(Boolean);
      if(f) familles[f]=ts;
    }
    const inconnus=Object.values(familles).flat().filter(t=>!types.includes(t));
    if(inconnus.length){ toast("Types inconnus dans les familles : "+inconnus.join(", "),true); return; }
    if(await fjEnregistrerReglage("types",types) && await fjEnregistrerReglage("familles",familles) && await fjEnregistrerReglage("modeles",mods)){ fermer(); toast("Listes enregistrées."); render(); }
  };
  document.body.appendChild(m);
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
      <div class="modal-actions"><button class="btn" data-no>Annuler</button><button class="btn p" data-yes ${lignes.length?"":"disabled"}>Importer ${lignes.length} ligne(s)</button></div></div>`;
    const fermer=()=>m.remove();
    m.querySelector(".modal-x").onclick=fermer; m.querySelector("[data-no]").onclick=fermer;
    m.querySelector("[data-yes]").onclick=async()=>{
      const rows=lignes.map(fjLigneVersBase);
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
  const L=[["Dossier","Type","Mission","Honoraires","Projet","Signature","Dépôt GTC","Fin Formalité","Facturation","Statut","Commentaires"].map(q).join(";")];
  for(const l of FJ.lignes) L.push([q(l.dossier),q(l.type_operation),q(l.mission),nb(l.honoraires),q(dateFR(l.date_projet)),q(dateFR(l.date_signature)),q(dateFR(l.date_depot_gtc)),q(dateFR(l.date_fin_formalite)),q(fjMois(l.mois_facturation)),q(FJ_STATUTS[fjStatut(l)][0]),q(l.commentaires)].join(";"));
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob(["﻿"+L.join("\r\n")],{type:"text/csv;charset=utf-8"}));
  a.download=`facturation-juridique-${today()}.csv`; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1200);
}

/* ----------------------------------------------------- liaisons écran */
function fjLier(){
  if(st.view!=="juridique"||!FJ.acces) return;
  const un=(sel,f)=>document.querySelectorAll(sel).forEach(f);
  un("[data-fj-filtre]",b=>b.onclick=()=>{ FJ.filtre=b.dataset.fjFiltre; render(); });
  un("[data-fj-tri]",s=>s.onchange=()=>{ FJ.tri=s.value; render(); });
  un("[data-fj-recherche]",i=>i.oninput=()=>{ FJ.recherche=i.value; const pos=i.selectionStart; render(); const n=document.querySelector("[data-fj-recherche]"); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(_){} } });
  un("[data-fj-nouveau]",b=>b.onclick=()=>fjEditer({dossier:""},"Nouvelle ligne"));
  un("[data-fj-modifier]",b=>b.onclick=()=>{ const l=FJ.lignes.find(x=>x.id===b.dataset.fjModifier); if(l) fjEditer(l,"Modifier la ligne"); });
  un("[data-fj-facturer]",b=>b.onclick=async()=>{ const l=FJ.lignes.find(x=>x.id===b.dataset.fjFacturer); if(!l) return; if(await fjEnregistrer({...l,mois_facturation:today().slice(0,7)})){ toast("Marqué facturé ce mois-ci."); render(); } });
  un("[data-fj-suivre]",b=>b.onclick=()=>{ const d=st.devis.find(x=>x.id===b.dataset.fjSuivre); if(d) fjEditer(fjDepuisDossier(d),"Ajouter au suivi"); });
  un("[data-fj-ignorer]",b=>b.onclick=async()=>{
    const d=st.devis.find(x=>x.id===b.dataset.fjIgnorer);
    if(FJ.colonneEcarte&&d){ await fjEnregistrer({...fjDepuisDossier(d),ecarte:true}); }
    else fjMasquer(b.dataset.fjIgnorer);
    render();
  });
  /* Retour sur l'écran : transfert des dossiers validés entre-temps. */
  if(Date.now()-FJ.derniereSync>30000) fjSynchroniser().then(n=>{ if(n){ toast(`${n} dossier(s) validé(s) transféré(s) automatiquement.`); render(); } });
  un("[data-fj-devis]",b=>b.onclick=()=>{ st.id=b.dataset.fjDevis; st.view="devis1"; st.tab=rememberedTab(st.id); render(); });
  un("[data-fj-export]",b=>b.onclick=fjExporter);
  un("[data-fj-listes]",b=>b.onclick=fjGererListes);
  un("[data-fj-exercice]",x=>x.onchange=()=>{ FJ.exercice=+x.value; render(); });
  const fichier=document.querySelector("[data-fj-fichier]");
  un("[data-fj-import]",b=>b.onclick=()=>fichier?.click());
  if(fichier) fichier.onchange=()=>{ const f=fichier.files?.[0]; fichier.value=""; if(f) fjImporterFichier(f); };
}
