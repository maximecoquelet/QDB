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
  tri: "facturation"
};

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
    await fjCharger();
  }catch(_){ FJ.acces=false; }
}

async function fjCharger(){
  const {data,error}=await SB.from("facturation_juridique").select("*").order("created_at",{ascending:true});
  if(error){ FJ.erreur=error.message; return false; }
  FJ.lignes=data||[]; FJ.erreur=""; return true;
}

function fjLigneVersBase(l){
  const num=v=>{ const n=fjMontant(v); return Number.isFinite(n)?n:null; };
  const d=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||""))?v:null;
  const mois=v=>/^\d{4}-\d{2}$/.test(String(v||""))?v+"-01":(/^\d{4}-\d{2}-\d{2}$/.test(String(v||""))?String(v).slice(0,7)+"-01":null);
  const t=v=>{ const s=String(v??"").trim(); return s||null; };
  return {
    dossier:String(l.dossier||"").trim(),
    type_operation:t(l.type_operation), mission:t(l.mission), honoraires:num(l.honoraires),
    date_projet:d(l.date_projet), date_signature:d(l.date_signature),
    date_depot_gtc:d(l.date_depot_gtc), date_fin_formalite:d(l.date_fin_formalite),
    mois_facturation:mois(l.mois_facturation), commentaires:t(l.commentaires),
    devis_id:t(l.devis_id)
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

function fjSynthese(){
  const moisCourant=today().slice(0,7), annee=today().slice(0,4);
  const s={encours:{n:0,m:0},afacturer:{n:0,m:0},moisCourant:0,annee:0,parMois:{}};
  for(const l of FJ.lignes){
    const h=+l.honoraires||0, st_=fjStatut(l);
    if(st_==="encours"){ s.encours.n++; s.encours.m+=h; }
    if(st_==="afacturer"){ s.afacturer.n++; s.afacturer.m+=h; }
    if(l.mois_facturation){
      const m=String(l.mois_facturation).slice(0,7);
      s.parMois[m]=(s.parMois[m]||0)+h;
      if(m===moisCourant) s.moisCourant+=h;
      if(m.slice(0,4)===annee) s.annee+=h;
    }
  }
  return s;
}

/* Dossiers juridiques signés dans l'outil de devis, pas encore suivis ici. */
function fjMasques(){ try{ return new Set(JSON.parse(localStorage.getItem(FJ_MASQUES_STORAGE)||"[]")); }catch(_){ return new Set(); } }
function fjMasquer(id){ try{ const s=fjMasques(); s.add(id); localStorage.setItem(FJ_MASQUES_STORAGE,JSON.stringify([...s])); }catch(_){} }

function fjDossiersASuivre(){
  const suivis=new Set(FJ.lignes.map(l=>l.devis_id).filter(Boolean)), masques=fjMasques();
  const out=[];
  for(const d of (st.devis||[])){
    if(suivis.has(d.id)||masques.has(d.id)) continue;
    try{
      if(!caRetenu(d)) continue;
      const m=modOf(d); if(!m) continue;
      const jur=+honorairesParCategorie(d,m).cats?.Juridique?.pon||0;
      if(jur<=0) continue;
      out.push({d, montant:jur, date:dateSignatureDe(d)});
    }catch(_){}
  }
  return out.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}

function fjDepuisDossier(d){
  const m=modOf(d), jur=+honorairesParCategorie(d,m).cats?.Juridique?.pon||0;
  const titre=intituleDevis(d);
  return {
    dossier:d.client?.raison||"", type_operation:"",
    mission:titre&&titre!=="Devis"?titre:(m?.titre||""),
    honoraires:Math.round(jur*100)/100,
    date_signature:String(dateSignatureDe(d)||"").slice(0,10),
    devis_id:d.id
  };
}

/* --------------------------------------------------------------- vue */
VIEWS.juridique = () => {
  if(!FJ.acces) return `<div class="top"><h1>Facturation juridique</h1></div><div class="wrap"><div class="notice">Accès non autorisé.</div></div>`;
  const s=fjSynthese(), aSuivre=fjDossiersASuivre();
  const q=normClient(FJ.recherche||"");
  let lignes=FJ.lignes.filter(l=>FJ.filtre==="tous"||fjStatut(l)===FJ.filtre);
  if(q) lignes=lignes.filter(l=>normClient(`${l.dossier} ${l.type_operation||""} ${l.mission||""} ${l.commentaires||""}`).includes(q));
  const ordre={encours:0,afacturer:1,facture:2};
  lignes.sort((a,b)=>FJ.tri==="dossier"
    ? String(a.dossier).localeCompare(String(b.dossier),"fr")
    : (ordre[fjStatut(a)]-ordre[fjStatut(b)]) || String(b.mois_facturation||b.date_fin_formalite||b.date_signature||"").localeCompare(String(a.mois_facturation||a.date_fin_formalite||a.date_signature||"")));
  const total=lignes.reduce((t,l)=>t+(+l.honoraires||0),0);
  const compte=f=>f==="tous"?FJ.lignes.length:FJ.lignes.filter(l=>fjStatut(l)===f).length;
  const onglet=(f,l)=>`<button class="vue-onglet ${FJ.filtre===f?"on":""}" data-fj-filtre="${f}">${l} <span class="vue-compte">${compte(f)}</span></button>`;
  const dt=v=>v?dateFR(v):`<span class="dim">—</span>`;
  const moisRecents=Object.keys(s.parMois).sort().reverse().slice(0,12);

  return `<div class="top"><h1>Facturation juridique</h1><span class="sub">Accès réservé — invisible des autres comptes</span><span class="spacer"></span>
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
      ${kpi(`Facturé ${today().slice(0,4)}`,eur0(s.annee),"Cumul de l'année civile")}
    </div>
    ${aSuivre.length?`<details class="card" style="margin-bottom:14px" ${aSuivre.length<=5?"open":""}><summary class="hd" style="cursor:pointer">Dossiers juridiques signés dans l'outil, non encore suivis ici <span class="tag ocre">${aSuivre.length}</span></summary><div class="bd">
      <table class="synthese-table"><thead><tr><th>Client</th><th>Devis</th><th>Signé le</th><th class="r">Honoraires juridiques HT</th><th></th></tr></thead><tbody>
      ${aSuivre.slice(0,30).map(x=>`<tr><td>${esc(x.d.client?.raison||"Dossier")}</td><td>${esc(x.d.ref||intituleDevis(x.d))}</td><td>${dt(String(x.date||"").slice(0,10))}</td><td class="r num">${eur(x.montant)}</td>
        <td class="r"><button class="btn sm p" data-fj-suivre="${esc(x.d.id)}">Ajouter au suivi</button> <button class="btn sm" data-fj-ignorer="${esc(x.d.id)}" title="Ne plus proposer ce dossier sur ce poste">Ignorer</button></td></tr>`).join("")}
      </tbody></table>${aSuivre.length>30?`<div class="hint">… et ${aSuivre.length-30} autre(s).</div>`:""}</div></details>`:""}
    <div class="card"><div class="bd">
      <div class="row" style="justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px">
        <div class="vues-barre" style="margin:0">${onglet("tous","Toutes")}${onglet("encours","En cours")}${onglet("afacturer","À facturer")}${onglet("facture","Facturées")}</div>
        <div class="row" style="gap:8px"><input type="search" data-fj-recherche placeholder="Rechercher un dossier, une mission…" value="${esc(FJ.recherche)}" style="min-width:240px">
        <select data-fj-tri><option value="facturation" ${FJ.tri!=="dossier"?"selected":""}>Tri : statut puis date</option><option value="dossier" ${FJ.tri==="dossier"?"selected":""}>Tri : dossier</option></select></div>
      </div>
      <div style="overflow-x:auto"><table class="synthese-table fj-table">
        <thead><tr><th>Dossier</th><th>Type</th><th>Mission</th><th class="r">Honoraires HT</th><th>Projet</th><th>Signature</th><th>Dépôt GTC</th><th>Fin formalité</th><th>Facturation</th><th>Statut</th><th></th></tr></thead>
        <tbody>${lignes.map(l=>{const [lib,coul]=FJ_STATUTS[fjStatut(l)];return `<tr>
          <td><b>${esc(l.dossier)}</b>${l.devis_id&&st.devis.some(d=>d.id===l.devis_id)?` <button class="btn sm" data-fj-devis="${esc(l.devis_id)}" title="Ouvrir le dossier dans l'outil de devis">Devis</button>`:""}${l.commentaires?`<div class="hint">${esc(l.commentaires)}</div>`:""}</td>
          <td>${esc(l.type_operation||"")}</td><td>${esc(l.mission||"")}</td>
          <td class="r num">${l.honoraires!=null?eur(l.honoraires):`<span class="dim">—</span>`}</td>
          <td>${dt(l.date_projet)}</td><td>${dt(l.date_signature)}</td><td>${dt(l.date_depot_gtc)}</td><td>${dt(l.date_fin_formalite)}</td>
          <td>${l.mois_facturation?esc(fjMois(l.mois_facturation)):`<span class="dim">—</span>`}</td>
          <td><span class="tag ${coul}">${lib}</span></td>
          <td class="r" style="white-space:nowrap">${fjStatut(l)==="afacturer"?`<button class="btn sm p" data-fj-facturer="${esc(l.id)}" title="Facturé ce mois-ci">Facturé</button> `:""}<button class="btn sm" data-fj-modifier="${esc(l.id)}">Modifier</button></td></tr>`;}).join("")||`<tr><td colspan="11"><div class="empty-state"><b>Aucune ligne</b><small>Importez votre fichier ou ajoutez une ligne.</small></div></td></tr>`}</tbody>
        <tfoot><tr class="total"><td colspan="3"><b>Total (${lignes.length} ligne(s) affichée(s))</b></td><td class="r num"><b>${eur(total)}</b></td><td colspan="7"></td></tr></tfoot>
      </table></div>
    </div></div>
    ${moisRecents.length?`<div class="card" style="margin-top:14px;max-width:520px"><div class="hd">Facturé par mois</div><div class="bd"><table class="synthese-table"><tbody>
      ${moisRecents.map(m=>`<tr><td>${esc(fjMoisLong(m))}</td><td class="r num money-strong">${eur0(s.parMois[m])}</td></tr>`).join("")}
    </tbody></table></div></div>`:""}
  </div>`;
};

/* ------------------------------------------------------- formulaire */
function fjFormulaire(ligne, titre){
  return new Promise(resolve=>{
    const l={...ligne};
    const types=[...new Set([...FJ_TYPES,...FJ.lignes.map(x=>x.type_operation).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,"fr"));
    const champ=(k,lib,type="text",extra="")=>`<label class="f"><span>${lib}</span><input type="${type}" data-fjf="${k}" value="${esc(type==="month"?String(l[k]||"").slice(0,7):(l[k]??""))}" ${extra}></label>`;
    const m=document.createElement("div"); m.className="modal modal-confirm";
    m.innerHTML=`<div class="box" style="max-width:760px"><div class="modal-titlebar"><h2>${esc(titre)}</h2><button class="modal-x" type="button">×</button></div>
      <div class="modal-content"><div class="grid g2">
        ${champ("dossier","Dossier (client)","text","required")}
        <label class="f"><span>Type d'opération</span><input type="text" data-fjf="type_operation" list="fj-types" value="${esc(l.type_operation||"")}"><datalist id="fj-types">${types.map(t=>`<option value="${esc(t)}">`).join("")}</datalist></label>
        ${champ("mission","Mission")}
        ${champ("honoraires","Honoraires HT (€)","number",'step="0.01" min="0"')}
        ${champ("date_projet","Projet","date")}
        ${champ("date_signature","Signature","date")}
        ${champ("date_depot_gtc","Dépôt GTC","date")}
        ${champ("date_fin_formalite","Fin de formalité","date")}
        ${champ("mois_facturation","Mois de facturation","month")}
        <label class="f"><span>Dossier de l'outil de devis</span><select data-fjf="devis_id"><option value="">— Aucun —</option>${(st.devis||[]).filter(d=>!isArchivedDevis(d)).map(d=>`<option value="${esc(d.id)}" ${l.devis_id===d.id?"selected":""}>${esc((d.client?.raison||"Dossier")+(d.ref?" · "+d.ref:""))}</option>`).join("")}</select></label>
        <label class="f" style="grid-column:1/-1"><span>Commentaires</span><textarea data-fjf="commentaires">${esc(l.commentaires||"")}</textarea></label>
      </div></div>
      <div class="modal-actions">${l.id?`<button class="btn" data-fj-suppr style="margin-right:auto;color:var(--rouge)">Supprimer</button>`:""}<button class="btn" data-no>Annuler</button><button class="btn p" data-yes>Enregistrer</button></div></div>`;
    const fin=v=>{ m.remove(); resolve(v); };
    m.querySelector(".modal-x").onclick=()=>fin(null);
    m.querySelector("[data-no]").onclick=()=>fin(null);
    m.querySelector("[data-yes]").onclick=()=>{ m.querySelectorAll("[data-fjf]").forEach(el=>{ l[el.dataset.fjf]=el.value; }); fin(l); };
    const sup=m.querySelector("[data-fj-suppr]"); if(sup) sup.onclick=()=>fin({...l,__supprimer:true});
    document.body.appendChild(m); setTimeout(()=>m.querySelector("[data-fjf='dossier']")?.focus(),20);
  });
}

async function fjEditer(ligne,titre){
  const r=await fjFormulaire(ligne,titre);
  if(!r) return;
  if(r.__supprimer){
    if(!await askConfirm("Supprimer la ligne",`La ligne « ${r.dossier} » sera supprimée définitivement.`,{confirmLabel:"Supprimer",danger:true})) return;
    if(await fjSupprimer(r.id)){ toast("Ligne supprimée."); render(); }
    return;
  }
  if(await fjEnregistrer(r)){ toast("Ligne enregistrée."); render(); }
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
    l.mission=String(val("mission")??"").trim();
    l.commentaires=String(val("commentaires")??"").trim();
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
    /* Rattachement automatique à un dossier signé de l'outil, s'il n'y en a qu'un pour ce client. */
    const cands=(st.devis||[]).filter(d=>!isArchivedDevis(d)&&normClient(d.client?.raison||"")===normClient(dossier));
    if(cands.length===1) l.devis_id=cands[0].id;
    lignes.push(l);
  });
  return {lignes, alertes, doublons};
}

async function fjImporterFichier(f){
  try{
    let tab;
    if(/\.xlsx?$/i.test(f.name)){
      const wb=XLSX.read(await f.arrayBuffer(),{type:"array",cellDates:false});
      tab=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:""});
    }else tab=fjParserCsv(fjDecoderTexte(await f.arrayBuffer()));
    const {lignes,alertes,doublons}=fjAnalyserTableau(tab);
    const nbDeduites=lignes.filter(l=>l.__deduites.length).length;
    const total=lignes.reduce((t,l)=>t+(+l.honoraires||0),0);
    const m=document.createElement("div"); m.className="modal";
    m.innerHTML=`<div class="box" style="max-width:1100px"><div class="modal-titlebar"><h2>Import — ${esc(f.name)}</h2><button class="modal-x" type="button">×</button></div>
      <div class="modal-content">
        <p><b>${lignes.length}</b> ligne(s) à importer · ${eur(total)} HT${doublons?` · ${doublons} ligne(s) déjà présente(s), ignorée(s)`:""}.</p>
        ${nbDeduites?`<div class="notice" style="margin-bottom:10px">Les dates sans année (ex. « 23-sept ») ont été datées automatiquement : la date la plus récente qui ne dépasse pas le mois de facturation de la ligne, ou aujourd'hui à défaut. Elles sont marquées <b>*</b> ci-dessous ; vérifiez-les.</div>`:""}
        ${alertes.length?`<div class="notice rouge" style="margin-bottom:10px">${alertes.map(esc).join("<br>")}</div>`:""}
        <div style="overflow:auto;max-height:52vh"><table class="synthese-table"><thead><tr><th>Dossier</th><th>Type</th><th>Mission</th><th class="r">Honoraires</th><th>Projet</th><th>Signature</th><th>Dépôt GTC</th><th>Fin formalité</th><th>Facturation</th><th>Devis lié</th></tr></thead><tbody>
        ${lignes.map(l=>{const d=k=>l[k]?dateFR(l[k])+(l.__deduites.includes(k)?" *":""):"";return `<tr><td>${esc(l.dossier)}</td><td>${esc(l.type_operation)}</td><td>${esc(l.mission)}</td><td class="r num">${l.honoraires!=null?eur(l.honoraires):""}</td><td>${d("date_projet")}</td><td>${d("date_signature")}</td><td>${d("date_depot_gtc")}</td><td>${d("date_fin_formalite")}</td><td>${esc(fjMois(l.mois_facturation))}</td><td>${l.devis_id?"oui":""}</td></tr>`;}).join("")}
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
  un("[data-fj-ignorer]",b=>b.onclick=()=>{ fjMasquer(b.dataset.fjIgnorer); render(); });
  un("[data-fj-devis]",b=>b.onclick=()=>{ st.id=b.dataset.fjDevis; st.view="devis1"; st.tab=rememberedTab(st.id); render(); });
  un("[data-fj-export]",b=>b.onclick=fjExporter);
  const fichier=document.querySelector("[data-fj-fichier]");
  un("[data-fj-import]",b=>b.onclick=()=>fichier?.click());
  if(fichier) fichier.onchange=()=>{ const f=fichier.files?.[0]; fichier.value=""; if(f) fjImporterFichier(f); };
}
