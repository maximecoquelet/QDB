/* =====================================================================
   v58.1 — TEAMS : devis validé → message dans la conversation du cabinet
   ---------------------------------------------------------------------
   Au passage d'un devis à « signé ou validé » (case du dossier, bouton
   « Devis validé » de la page Juridique, ou signature Yousign), une
   FENÊTRE DE VÉRIFICATION s'ouvre : les informations sont préremplies et
   modifiables, une note peut être ajoutée, puis « Publier dans Teams » ou
   « Ne pas publier ». Rien ne part sans ce clic.

   L'envoi passe par le serveur Render, seul détenteur de l'adresse du
   Workflow Teams. Réservé aux comptes autorisés par le serveur (variable
   TEAMS_UTILISATEURS) : pour les autres, ni fenêtre ni bouton.
   Bouton : onglet Signature, étape « Devis signé ou validé ».
   ===================================================================== */
const TEAMS = { pret:false, verifie:false };
const TEAMS_TYPES = { traditional:"Mission normale", punctual:"Ponctuelle comptable", legal:"Ponctuelle juridique" };
const teamsBase = () => String(st.ys?.proxy||DEFAULT_RENDER_PROXY).replace(/\/$/,"");

/* Teams est-il branché côté serveur ? (une fois par session) */
async function teamsVerifier(){
  if(TEAMS.verifie||!(SB&&SB_USER)) return TEAMS.pret;
  TEAMS.verifie=true;
  try{ const r=await proxyFetch(teamsBase()+"/health/teams"); const j=await r.json().catch(()=>({})); TEAMS.pret=!!(r.ok&&j.devisValide); }catch(_){ TEAMS.pret=false; }
  return TEAMS.pret;
}

function teamsBandeau(message, libelle, action){
  document.querySelectorAll(".fj-annuler").forEach(x=>x.remove());
  const t=document.createElement("div"); t.className="fj-annuler"; t.setAttribute("role","status");
  t.innerHTML=`<span>${esc(message)}</span>${libelle?`<button type="button">${esc(libelle)}</button>`:""}<button type="button" aria-label="Fermer">×</button>`;
  const bs=t.querySelectorAll("button"); if(libelle) bs[0].onclick=()=>{ t.remove(); action(); }; bs[bs.length-1].onclick=()=>t.remove();
  document.body.appendChild(t); setTimeout(()=>t.remove(),20000);
}

const teamsValide = d => !!manualSignState(d?.manualSign).quoteSigned||d?.sign?.statut==="done";

function teamsCharge(d){
  const m=modOf(d), ms=manualSignState(d.manualSign); let t={recAn:0,pon:0};
  try{ t=totaux(d,m); }catch(_){}
  let type=""; try{ type=TEAMS_TYPES[dashboardColorType(d,m)]||""; }catch(_){}
  const titre=intituleDevis(d);
  return {
    client:d.client?.raison||"", siren:d.client?.siren||"", ref:d.ref||"",
    mission:titre&&titre!=="Devis"?titre:(m?.titre||""), type,
    recAn:Math.round((+t.recAn||0)*100)/100, pon:Math.round((+t.pon||0)*100)/100,
    dateDebut:d.dateDebutDossier||"", responsable:(d.ownerEmail||"").split("@")[0]||"",
    dateValidation:ms.quoteSignedDate||d.sign?.signe||today(), commentaire:"",
    lien:location.origin+location.pathname
  };
}

async function teamsEnregistrerDevis(d){ const avant=st.id; st.id=d.id; try{ await saveDev(); }finally{ st.id=avant; } }

/* Fenêtre de vérification. Résout avec la charge modifiée, ou null. */
function teamsFenetre(d, correction){
  return new Promise(resolve=>{
    const c=teamsCharge(d);
    if(correction&&d.teamsNotifie?.charge) Object.assign(c,d.teamsNotifie.charge,{commentaire:""});
    const champ=(k,lib,type="text",extra="")=>`<label class="f"><span>${lib}</span><input type="${type}" data-tm="${k}" value="${esc(c[k]??"")}" ${extra}></label>`;
    const m=document.createElement("div"); m.className="modal modal-confirm fj-modal";
    m.innerHTML=`<div class="box" style="max-width:720px"><div class="modal-titlebar"><h2>${correction?"Publier une correction dans Teams":"Publier le devis validé dans Teams"}</h2><button class="modal-x" type="button">×</button></div>
      <div class="modal-content">
        <p class="hint" style="margin-top:0">Vérifiez et corrigez si besoin. Rien n'est envoyé tant que vous n'avez pas cliqué « Publier ». Le message part dans la conversation Teams du cabinet, jamais au client.</p>
        <div class="grid g2">
          ${champ("client","Client")}${champ("siren","SIREN")}
          ${champ("ref","Devis")}${champ("type","Type")}
          <label class="f" style="grid-column:1/-1"><span>Mission</span><input type="text" data-tm="mission" value="${esc(c.mission)}"></label>
          ${champ("recAn","Honoraires récurrents HT par an (€)","number",'step="0.01" min="0"')}${champ("pon","Honoraires ponctuels HT (€)","number",'step="0.01" min="0"')}
          ${champ("dateDebut","Début de mission","date")}${champ("dateValidation","Validé le","date")}
          ${champ("responsable","Responsable")}
        </div>
        <label class="f" style="margin-top:10px"><span>Note (facultative)</span><textarea data-tm="commentaire" placeholder="ex. acompte reçu, délai à surveiller…">${esc(c.commentaire||"")}</textarea></label>
      </div>
      <div class="modal-actions"><button class="btn" data-no>Ne pas publier</button><button class="btn p" data-yes>Publier dans Teams</button></div></div>`;
    const fin=v=>{ m.remove(); resolve(v); };
    m.querySelector(".modal-x").onclick=()=>fin(null); m.querySelector("[data-no]").onclick=()=>fin(null);
    m.querySelector("[data-yes]").onclick=()=>{ m.querySelectorAll("[data-tm]").forEach(el=>{ c[el.dataset.tm]=el.type==="number"?(+el.value||0):el.value; }); fin(c); };
    document.body.appendChild(m); setTimeout(()=>m.querySelector("[data-yes]")?.focus(),30);
  });
}

async function teamsEnvoyer(d, charge, correction){
  try{
    const r=await proxyFetch(teamsBase()+"/api/teams/devis-valide",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...charge,correction:!!correction})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(j.error||`HTTP ${r.status}`);
    d.teamsNotifie={at:nowISO(),par:SB_USER?.email||"",charge}; delete d.teamsEnAttente;
    document.querySelectorAll(".fj-annuler").forEach(x=>x.remove());
    await teamsEnregistrerDevis(d); render();
    toast(correction?"Correction publiée dans Teams.":`Devis ${d.ref||""} publié dans Teams.`);
    return true;
  }catch(e){
    teamsBandeau(`Message Teams non envoyé (${d.client?.raison||"devis"}) : ${e?.message||e}`,"Réessayer",()=>teamsEnvoyer(d,charge,correction));
    return false;
  }
}

/* Appelé au passage à « validé ». */
async function teamsDevisValide(d){
  if(!d||d.teamsNotifie||!(SB&&SB_USER)) return;
  if(!await teamsVerifier()) return;
  const charge=await teamsFenetre(d,false);
  if(!charge){
    d.teamsEnAttente=true; await teamsEnregistrerDevis(d); render();
    teamsBandeau("Devis non publié dans Teams. Le bouton « Publier dans Teams » reste disponible dans l'onglet Signature du dossier.","",null);
    return;
  }
  await teamsEnvoyer(d,charge,false);
}
async function teamsPublierManuel(d, correction){
  if(!await teamsVerifier()){ toast("Teams n'est pas encore configuré sur le serveur.",true); return; }
  const charge=await teamsFenetre(d,correction); if(charge) await teamsEnvoyer(d,charge,correction);
}

/* Bouton dans le parcours de signature (onglet Signature, étape 2).
   Affiché uniquement si le serveur reconnaît le compte comme autorisé. */
function teamsZoneParcours(d){
  if(!TEAMS.pret||!teamsValide(d)) return "";
  if(!d.teamsNotifie) return `<div class="row" style="margin-top:6px"><button type="button" class="btn sm" data-teams-publier title="Publier ce devis validé dans la conversation Teams du cabinet">Publier dans Teams</button></div>`;
  return `<div class="row" style="margin-top:6px;gap:8px;align-items:center"><span class="tag vert">Publié dans Teams le ${esc(dateFR(String(d.teamsNotifie.at||"").slice(0,10)))}</span><button type="button" class="btn ghost sm" data-teams-correction>Publier une correction</button></div>`;
}
function teamsLier(){
  if(st.view!=="devis1") return;
  const d=curDev(); if(!d) return;
  /* preventDefault : le bouton est dans l'étiquette de la case à cocher. */
  document.querySelectorAll("[data-teams-publier]").forEach(b=>b.onclick=e=>{ e.preventDefault(); e.stopPropagation(); teamsPublierManuel(d,false); });
  document.querySelectorAll("[data-teams-correction]").forEach(b=>b.onclick=e=>{ e.preventDefault(); e.stopPropagation(); teamsPublierManuel(d,true); });
}
