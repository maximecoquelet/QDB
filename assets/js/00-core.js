
/* v42 : pièces d'acceptation à la mise en page des devis, signées par le seul signataire du cabinet ; parcours réservé aux missions comptables normales. */

"use strict";

/* ======================================================================
   Stockage partagé Supabase. Les paramètres de signature restent locaux.
   La clé publishable est volontairement publique ; les droits sont assurés
   par Supabase Auth + Row Level Security (RLS).
   ====================================================================== */
const SUPABASE_URL = "https://ueuhedaqpzxmjrcjktmw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_QH-5FvLviSJJZD3Fne_CPQ_KeYWDrGm";
const APP_VERSION = "55.0-interne";
const APP_BUILD_DATE = "2026-11-11";

/* v54 — Lien d'invitation ou de réinitialisation reçu par e-mail.
   Supabase renvoie vers l'application avec `type=invite` ou `type=recovery`
   dans l'adresse, puis efface ce fragment dès l'ouverture de la session. On
   le lit donc AVANT de créer le client : l'écran de choix du mot de passe
   doit s'afficher, au lieu d'ouvrir directement l'application. */
const LIEN_AUTH_TYPE = (()=>{
  try{
    const m=/[#&?]type=(invite|recovery)\b/.exec(String(window.location.hash||"")+String(window.location.search||""));
    return m ? m[1] : "";
  }catch(_){ return ""; }
})();

/* v54 — Service Render (PDF, Yousign, RNE). Chaque appel porte désormais le
   jeton de session Supabase : le service peut ainsi refuser tout appel qui
   ne vient pas d'un utilisateur connecté du cabinet.
   Passer à `false` seulement si le service Render n'a pas encore reçu la
   vérification du jeton (voir serveur-render/LISEZMOI.md) et refuse
   l'en-tête `Authorization` (erreur CORS dans la console). */
const PROXY_ENVOIE_JETON = true;

const SB = (window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;
let SB_USER = null;
let SB_PROFILE = null;
let SB_PROFILES = [];
let ACCESS_BACKEND_READY = false;
let ACCESS_BACKEND_ERROR = "";

/* v54 — Appel au service Render avec le jeton de l'utilisateur connecté. */
async function proxyFetch(url, options={}){
  const headers={...(options.headers||{})};
  if(PROXY_ENVOIE_JETON && SB){
    try{
      const {data}=await SB.auth.getSession();
      const jeton=data?.session?.access_token;
      if(jeton) headers.Authorization="Bearer "+jeton;
    }catch(_){}
  }
  return fetch(url,{...options,headers});
}

const MEM = {};
let HAS_LOCAL = false;
try { HAS_LOCAL = typeof window !== "undefined" && !!window.localStorage; } catch(e) {}

/* v41 : le parcours administratif comporte, entre la validation du devis et
   la signature de la lettre de mission, la signature de la lettre
   d'acceptation de la mission. L'étape « questionnaire LAB rempli » n'est pas
   une coche : elle est déduite du questionnaire de la fiche client
   (voir labRempliPour). */
/* v42 : la lettre d'acceptation et le questionnaire anti-blanchiment ne font
   partie du parcours que pour les missions comptables « normales » (missions
   récurrentes). Les ponctuelles, comptables comme juridiques, en sont
   dispensées : leur parcours reste devis → lettre de mission → classement. */
function parcoursAcceptation(d){
  try{ const m=modOf(d); return !!(m && dashboardSectionType(d,m)==="traditional"); }catch(_){ return false; }
}
function manualSignState(ms){
  const raw=ms||{};
  let sent=!!(raw.sent ?? raw.uploaded);
  let quoteSigned=!!(raw.quoteSigned ?? raw.signed);
  let lmSigned=!!(raw.lmSigned ?? raw.signed);
  const filed=!!raw.filed;
  /* L'acceptation n'est jamais déduite d'une étape ultérieure : une mission
     ponctuelle, dispensée de cette étape, peut être signée et classée sans
     que l'étape soit marquée — et elle ne doit pas apparaître franchie si le
     modèle du dossier devient plus tard une mission normale.
     Seuls les dossiers antérieurs à la v41, qui n'ont pas ce champ, sont
     réputés l'avoir franchie lorsqu'ils sont déjà signés ou classés, pour ne
     pas rouvrir des parcours terminés. */
  const champConnu=Object.prototype.hasOwnProperty.call(raw,"accepted");
  let accepted=!!raw.accepted;
  if(!champConnu && (filed||lmSigned)) accepted=true;
  if(filed){ sent=true; quoteSigned=true; lmSigned=true; }
  else if(lmSigned){ sent=true; quoteSigned=true; }
  else if(accepted){ sent=true; quoteSigned=true; }
  else if(quoteSigned) sent=true;
  return {
    sent, sentDate:raw.sentDate||raw.uploadedDate||"",
    quoteSigned, quoteSignedDate:raw.quoteSignedDate||raw.signedDate||"",
    accepted, acceptedDate:raw.acceptedDate||"",
    lmSigned, lmSignedDate:raw.lmSignedDate||raw.signedDate||"",
    filed, filedDate:raw.filedDate||""
  };
}
/* Le questionnaire anti-blanchiment de la fiche client est-il complet ?
   Défini ici pour rester disponible dès le noyau ; l'implémentation réelle
   vit dans 41-questionnaires.js. */
function labRempliPour(d){
  try{ const c=clientMasterOf(d); return !!(c && labState(c).complet); }catch(_){ return false; }
}
function workflowStatut(d){
  const ms=manualSignState(d?.manualSign);
  const avecLm=hasLettreMission(d);
  if(ms.filed) return "classe";
  if(avecLm && ms.lmSigned) return "signe";
  if(ms.quoteSigned) return avecLm ? "valide" : "signe";
  if(ms.sent) return "envoye";
  if(d?.sign?.statut==="done") return "signe";
  if(d?.sign?.statut==="declined") return "refuse";
  if(d?.sign?.statut==="expired") return "expire";
  return d?.statut||"brouillon";
}
function devisRow(d){
  const ms=manualSignState(d.manualSign);
  return {
    id:d.id, reference:d.ref||null, reference_lm:hasLettreMission(d)?(d.refLm||null):null,
    statut:workflowStatut(d),
    client_nom:d.client?.raison||null, client_email:d.client?.email||null,
    signature_provider:d.sign?.provider||(d.sign?.id?"yousign":(ms.sent?"yousign_manual":null)),
    signature_request_id:d.sign?.id||null,
    signature_status:d.sign?.statut||(ms.filed?"manual_filed":((hasLettreMission(d)&&ms.lmSigned)?"manual_lm_signed":(ms.quoteSigned?"manual_devis_signed":(ms.sent?"manual_sent":null)))),
    data:d, updated_at:new Date().toISOString()
  };
}

/* =====================================================================
   v49.1 — UNE LECTURE RATÉE NE DOIT JAMAIS DEVENIR UNE ÉCRITURE
   ---------------------------------------------------------------------
   `S.get` renvoyait `null` aussi bien pour « la clé n'existe pas » que
   pour « la lecture a échoué ». Le démarrage interprétait le second cas
   comme le premier : référentiel absent, donc à initialiser — et il
   réécrivait des valeurs par défaut par-dessus les données du cabinet.
   Une micro-coupure au mauvais moment suffisait à effacer le fichier
   clients ou le catalogue de modèles.

   Désormais une lecture en échec est mémorisée. Si elle portait sur une
   clé structurante, la session passe en lecture seule : l'utilisateur
   voit et travaille, mais rien ne part en base tant qu'il n'a pas
   rechargé la page sur une connexion saine.
   ===================================================================== */
const CLES_STRUCTURANTES = new Set(["cab:identite","cab:modeles","cab:lettres","cab:devis","cab:clients","cab:reglages"]);
let MODE_LECTURE_SEULE = false;
let MOTIF_LECTURE_SEULE = "";
const MSG_LECTURE_SEULE = "Session en lecture seule : les données n'ont pas pu être lues au démarrage. Rechargez la page avant de modifier quoi que ce soit.";

/* =====================================================================
   v50 — TRAVAILLER À PLUSIEURS SANS S'EFFACER
   ---------------------------------------------------------------------
   Trois mécanismes complémentaires, tous facultatifs : l'application
   détecte au démarrage ce que la base sait faire et se rabat sur
   l'ancien fonctionnement si le script v50 n'a pas encore été exécuté.

   · `rev` sur les dossiers — on n'écrit que si la révision détenue est
     encore celle de la base. Sinon on prévient, on n'écrase pas.
   · Fiches clients en table, une ligne par fiche — deux créations
     simultanées ne se chassent plus l'une l'autre.
   · Écritures ciblées — on n'enregistre que ce qui a changé, jamais
     tout le portefeuille d'un coup depuis la mémoire de l'onglet.
   ===================================================================== */
const CAPACITES = { revisionDossiers:false, clientsEnTable:false };

async function detecterCapacites(){
  if(!(SB && SB_USER)) return CAPACITES;
  try{ const {error}=await SB.from("devis").select("rev").limit(1);   CAPACITES.revisionDossiers = !error; }catch(_){ CAPACITES.revisionDossiers=false; }
  try{ const {error}=await SB.from("clients").select("id").limit(1);  CAPACITES.clientsEnTable   = !error; }catch(_){ CAPACITES.clientsEnTable=false; }
  return CAPACITES;
}
function socleIncomplet(){
  if(!(SB && SB_USER)) return [];
  const manque=[];
  if(!CAPACITES.revisionDossiers) manque.push("révision des dossiers");
  if(!CAPACITES.clientsEnTable)   manque.push("fiches clients en table");
  return manque;
}

/* Colonnes en clair de la fiche client : listes, recherches et contrôles
   d'intégrité s'appuient dessus sans désérialiser `data`. */
function clientRow(c){
  return { id:c.id, raison:c.raison||null, siren:c.siren||null, email:c.email||null,
    ville:c.ville||null, archive:!!c.archive, data:c, updated_at:new Date().toISOString() };
}
/* Empreinte du dernier état connu de chaque fiche : elle permet de
   n'écrire que les fiches réellement modifiées, sans toucher à aucun des
   appelants existants de `saveClients`. */
const CLIENTS_EMPREINTE = new Map();
const empreinteClient = c => JSON.stringify(c);
function memoriserEmpreintesClients(liste){
  CLIENTS_EMPREINTE.clear();
  for(const c of liste||[]) if(c?.id) CLIENTS_EMPREINTE.set(c.id, empreinteClient(c));
}

const S = {
  ok: !!SB || HAS_LOCAL,
  mode: SB ? "supabase" : (HAS_LOCAL ? "local" : "memoire"),
  lecturesEnEchec: new Set(),

  async get(k, sh){
    if(sh && SB && SB_USER){
      try{
        if(k==="cab:devis"){
          const cols=CAPACITES.revisionDossiers?"data,created_at,rev":"data,created_at";
          const {data,error}=await SB.from("devis").select(cols).order("created_at",{ascending:false});
          if(error) throw error;
          return JSON.stringify((data||[]).map(r=>CAPACITES.revisionDossiers?{...r.data,rev:r.rev}:r.data));
        }
        if(k==="cab:clients" && CAPACITES.clientsEnTable){
          const {data,error}=await SB.from("clients").select("data,rev");
          if(error) throw error;
          const liste=(data||[]).map(r=>({...r.data,rev:r.rev}));
          if(liste.length){ memoriserEmpreintesClients(liste); return JSON.stringify(liste); }
          /* Table vide : soit le cabinet n'a aucune fiche, soit la reprise
             du script v50 n'a pas eu lieu. On relit l'ancien emplacement,
             et on laisse les empreintes vides pour que le premier
             enregistrement verse les fiches dans la table. */
          const {data:ancien,error:e0}=await SB.from("app_state").select("data").eq("key","cab:clients").maybeSingle();
          if(e0) throw e0;
          const reprise=Array.isArray(ancien?.data)?ancien.data:[];
          CLIENTS_EMPREINTE.clear();
          if(reprise.length) console.warn("Fiches clients reprises depuis l'ancien emplacement : exécutez le script v50.");
          return JSON.stringify(reprise);
        }
        const {data,error}=await SB.from("app_state").select("data").eq("key",k).maybeSingle();
        if(error) throw error;
        return data ? JSON.stringify(data.data) : null;
      }catch(e){
        console.error("Supabase lecture",e);
        this.lecturesEnEchec.add(k);
        if(CLES_STRUCTURANTES.has(k)){
          MODE_LECTURE_SEULE=true;
          MOTIF_LECTURE_SEULE=`${k} — ${e.message||e}`;
        }
        toast("Lecture des données partagées impossible : "+e.message,true);
        return undefined;   /* `undefined` = échec ; `null` = clé absente */
      }
    }
    if(HAS_LOCAL){ try{ return window.localStorage.getItem(k); }catch(e){ return null; } }
    return MEM[k] ?? null;
  },

  async set(k, v, sh){
    /* Verrou de sûreté : aucune écriture partagée tant que la lecture de
       départ est incomplète — voir MODE_LECTURE_SEULE ci-dessus. */
    if(MODE_LECTURE_SEULE && sh){ toast(MSG_LECTURE_SEULE,true); return false; }
    if(sh && SB && SB_USER){
      try{
        if(k==="cab:devis") return await this.upsertDevisMany(JSON.parse(v)||[]);
        if(k==="cab:clients" && CAPACITES.clientsEnTable) return await this.enregistrerClients(JSON.parse(v)||[]);
        const {error}=await SB.from("app_state").upsert({key:k,data:JSON.parse(v),updated_by:SB_USER.id},{onConflict:"key"});
        if(error) throw error;
        return true;
      }catch(e){ console.error("Supabase écriture",e); toast("Enregistrement partagé impossible : "+e.message,true); return false; }
    }
    if(HAS_LOCAL){ try{ window.localStorage.setItem(k, v); return true; }catch(e){ toast("Stockage local saturé ou interdit.", true); return false; } }
    MEM[k]=v; return true;
  },

  /* ---------------------------------------------------------------- dossiers */
  async upsertDevis(d){
    if(MODE_LECTURE_SEULE){ toast(MSG_LECTURE_SEULE,true); return false; }
    if(!(SB && SB_USER)) return this.set("cab:devis",JSON.stringify(st.devis),true);
    try{
      if(!CAPACITES.revisionDossiers){
        const {error}=await SB.from("devis").upsert(devisRow(d),{onConflict:"id"});
        if(error) throw error;
        return true;
      }
      const precedente=+d.rev||0, row=devisRow(d);
      if(precedente>0){
        /* Écriture conditionnelle : la mise à jour ne s'applique que si la
           ligne porte encore la révision que nous avons lue. */
        const {data,error}=await SB.from("devis").update({...row,rev:precedente+1})
          .eq("id",d.id).eq("rev",precedente).select("rev");
        if(error) throw error;
        if(data && data.length){ d.rev=data[0].rev; return true; }
        const {data:distant,error:e2}=await SB.from("devis").select("rev,data").eq("id",d.id).maybeSingle();
        if(e2) throw e2;
        if(distant){
          /* Quelqu'un d'autre a enregistré entre-temps. On n'écrase pas :
             on rend la main à l'utilisateur. */
          try{ annoncerConflitDossier(d,distant); }catch(_){ toast("Ce dossier a été modifié ailleurs. Rechargez la page avant de continuer.",true); }
          return false;
        }
      }
      const {data,error}=await SB.from("devis").upsert({...row,rev:precedente+1},{onConflict:"id"}).select("rev");
      if(error) throw error;
      d.rev=data?.[0]?.rev ?? (precedente+1);
      return true;
    }catch(e){ console.error("Supabase devis",e); toast("Enregistrement du devis impossible : "+e.message,true); return false; }
  },

  /* Enregistre une liste de dossiers réellement modifiés. Remplace les
     réécritures globales du portefeuille : un onglet ouvert depuis le
     matin ne repose plus son état sur les dossiers des autres. */
  async upsertDevisMany(liste){
    if(MODE_LECTURE_SEULE){ toast(MSG_LECTURE_SEULE,true); return false; }
    const arr=(liste||[]).filter(Boolean);
    if(!arr.length) return true;
    if(!(SB && SB_USER)) return this.set(K.dev,JSON.stringify(st.devis),false);
    try{
      const lignes=arr.map(d=>CAPACITES.revisionDossiers?{...devisRow(d),rev:(+d.rev||0)+1}:devisRow(d));
      const {data,error}=await SB.from("devis").upsert(lignes,{onConflict:"id"}).select("id,rev");
      if(error) throw error;
      if(CAPACITES.revisionDossiers){
        const parId=new Map((data||[]).map(r=>[r.id,r.rev]));
        for(const d of arr) if(parId.has(d.id)) d.rev=parId.get(d.id);
      }
      return true;
    }catch(e){ console.error("Supabase devis (lot)",e); toast("Enregistrement des dossiers impossible : "+e.message,true); return false; }
  },

  async removeDevisPermanently(id){
    if(MODE_LECTURE_SEULE) throw new Error("Session en lecture seule : rechargez la page.");
    if(SB && SB_USER){
      const {data,error}=await SB.from("devis").delete().eq("id",id).select("id");
      if(error) throw error;
      if(!data?.some(row=>row.id===id)) throw new Error("Suppression du dossier non confirmée. Vérifiez vos droits puis rechargez les données.");
      return true;
    }
    return this.set(K.dev,JSON.stringify(st.devis.filter(d=>d.id!==id)),true);
  },
  async removeDevis(id){
    if(MODE_LECTURE_SEULE){ toast("Session en lecture seule : suppression refusée. Rechargez la page.",true); return false; }
    if(SB && SB_USER){
      try{ const {error}=await SB.from("devis").delete().eq("id",id); if(error) throw error; return true; }
      catch(e){ console.error("Supabase suppression",e); toast("Suppression distante impossible : "+e.message,true); return false; }
    }
    return true;
  },

  /* ---------------------------------------------------------------- clients */
  /* Reçoit la liste complète, n'écrit que les fiches dont l'empreinte a
     changé et ne supprime que celles qui ont réellement disparu. Les
     appelants continuent d'appeler `saveClients()` sans rien savoir. */
  async enregistrerClients(liste){
    if(MODE_LECTURE_SEULE){ toast(MSG_LECTURE_SEULE,true); return false; }
    const arr=(liste||[]).filter(c=>c&&c.id);
    if(!(SB && SB_USER && CAPACITES.clientsEnTable)){
      if(HAS_LOCAL){ try{ window.localStorage.setItem(K.cli,JSON.stringify(arr)); return true; }catch(e){ return false; } }
      MEM[K.cli]=JSON.stringify(arr); return true;
    }
    const aEcrire=[], presents=new Set();
    for(const c of arr){
      presents.add(c.id);
      if(CLIENTS_EMPREINTE.get(c.id)!==empreinteClient(c)) aEcrire.push(c);
    }
    const aSupprimer=[...CLIENTS_EMPREINTE.keys()].filter(id=>!presents.has(id));
    if(!aEcrire.length && !aSupprimer.length) return true;
    try{
      if(aEcrire.length){
        const {error}=await SB.from("clients").upsert(aEcrire.map(clientRow),{onConflict:"id"});
        if(error) throw error;
      }
      if(aSupprimer.length){
        const {error}=await SB.from("clients").delete().in("id",aSupprimer);
        if(error) throw error;
      }
      for(const c of arr) CLIENTS_EMPREINTE.set(c.id,empreinteClient(c));
      for(const id of aSupprimer) CLIENTS_EMPREINTE.delete(id);
      return true;
    }catch(e){ console.error("Supabase clients",e); toast("Enregistrement des fiches clients impossible : "+e.message,true); return false; }
  }
};
const K = { cab:"cab:identite", mod:"cab:modeles", lm:"cab:lettres", dev:"cab:devis", cli:"cab:clients", reg:"cab:reglages", ys:"user:yousign",
  audit:"cab:audit-log", trash:"cab:trash", errors:"cab:error-log" };

let SEQ = 0;
const uid = () => Date.now().toString(36) + (SEQ++).toString(36) + Math.random().toString(36).slice(2,5);
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const eur = n => (Math.round((+n||0)*100)/100).toLocaleString("fr-FR",{style:"currency",currency:"EUR",minimumFractionDigits:2});
const eur0 = n => Math.round(+n||0).toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0});
const nb = n => (+n||0).toLocaleString("fr-FR");
const dateFR = s => { if(!s) return ""; const p=String(s).split("-"); return p[2]?`${p[2]}/${p[1]}/${p[0]}`:s; };
const today = () => new Date().toISOString().slice(0,10);
const addDays = (s,n) => { const d=new Date(s); d.setDate(d.getDate()+(+n||0)); return d.toISOString().slice(0,10); };
const slug = s => String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
  .replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").replace(/^(\d)/,"v$1").slice(0,40) || "champ";
function sirenOk(v){ const s=String(v||"").replace(/\D/g,""); if(s.length!==9&&s.length!==14) return false;
  let t=0; for(let i=0;i<s.length;i++){ let x=+s[s.length-1-i]; if(i%2){ x*=2; if(x>9) x-=9; } t+=x; } return t%10===0; }
const emailOk = v => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(v||"").trim());
let tT; function toast(m,e){ document.querySelectorAll(".toast").forEach(t=>t.remove());
  const d=document.createElement("div"); d.className="toast"+(e?" err":""); d.textContent=m;
  document.body.appendChild(d); clearTimeout(tT); tT=setTimeout(()=>d.remove(),4200); }

