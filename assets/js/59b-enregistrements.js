/* =====================================================================
   v57 — JURIDIQUE › ENREGISTREMENTS AUX IMPÔTS (accès réservé)
   ---------------------------------------------------------------------
   Suivi des actes présentés à l'enregistrement : droits, demande de
   virement, virement effectué, envoi au SIE, retour de l'acte enregistré.
   Table `enregistrements`, même cloisonnement que la facturation
   juridique (script v57). Rien n'est écrit dans les journaux partagés.
   ===================================================================== */
const ENR = { acces:false, lignes:[], table:false, onglet:"encours", etat:"", recherche:"" };

const ENR_ETATS_DEFAUT = [
  {id:"a_preparer",       libelle:"À préparer",         couleur:"#9AA3A0", date:""},
  {id:"virement_demande", libelle:"Virement demandé",   couleur:"#3B82C4", date:"date_demande_virement"},
  {id:"virement_fait",    libelle:"Virement effectué",  couleur:"#7C5CC4", date:"date_virement"},
  {id:"envoye",           libelle:"Envoyé au SIE",      couleur:"#D98A1F", date:"date_envoi_sie"},
  {id:"enregistre",       libelle:"Enregistré",         couleur:"#2E9D62", date:"date_retour"}
];
const enrOptions = () => ({ destVirement:"Mélanie", delaiRetour:30, couleurs:{}, ...(FJ.reglages.options?.enr||{}) });
const enrEtats = () => { const c=enrOptions().couleurs||{}; return ENR_ETATS_DEFAUT.map(e=>({...e,couleur:fjCouleurSure(c[e.id]||e.couleur)})); };
function enrEtatDe(l){ const E=enrEtats(); let r=E[0]; for(const e of E) if(e.date&&l[e.date]) r=e; return r; }
const ENR_JALONS = () => [["date_demande_virement","V",`Demande de virement${enrOptions().destVirement?" à "+enrOptions().destVirement:""}`],["date_virement","P","Virement effectué"],["date_envoi_sie","E","Envoi au SIE"],["date_retour","R","Retour de l'acte enregistré"]];
const enrJours = iso => iso?Math.round((new Date(today()+"T00:00:00")-new Date(String(iso).slice(0,10)+"T00:00:00"))/86400000):null;

/* ------------------------------------------------------------ données */
/* Accès propre : facturation juridique OU liste enregistrements_acces. */
async function enrInitialiser(){
  ENR.acces=false; ENR.lignes=[]; ENR.table=false;
  if(!(SB&&SB_USER)) return;
  try{ const {data,error}=await SB.rpc("a_acces_enregistrements"); ENR.acces=!error&&data===true; }catch(_){ ENR.acces=false; }
  if(!ENR.acces&&FJ.acces) ENR.acces=true;   /* script v57 pas encore passé : repli sur l'accès juridique */
  if(ENR.acces) await enrCharger();
}
async function enrCharger(){
  ENR.lignes=[]; ENR.table=false;
  if(!ENR.acces) return;
  const {data,error}=await SB.from("enregistrements").select("*").order("created_at",{ascending:true});
  if(error) return;
  ENR.table=true; ENR.lignes=data||[];
}
function enrVersBase(l){
  const num=v=>{ const n=fjMontant(v); return Number.isFinite(n)?n:null; };
  const d=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||""))?v:null;
  const t=v=>{ const s=String(v??"").trim(); return s||null; };
  return { dossier:String(l.dossier||"").trim(), motif:t(l.motif), montant:num(l.montant),
    date_demande_virement:d(l.date_demande_virement), date_virement:d(l.date_virement), date_envoi_sie:d(l.date_envoi_sie),
    sie:t(l.sie), date_retour:d(l.date_retour), commentaires:t(l.commentaires), client_id:t(l.client_id),
    /* Le lien vers la facturation n'est modifiable que par qui la voit. */
    ...(FJ.acces?{fj_id:t(l.fj_id)}:{}) };
}
async function enrEnregistrer(l){
  const row=enrVersBase(l);
  if(!row.dossier){ toast("Le nom du dossier est obligatoire.",true); return false; }
  const q=l.id?SB.from("enregistrements").update(row).eq("id",l.id).select():SB.from("enregistrements").insert(row).select();
  const {data,error}=await q;
  if(error||!data?.[0]){ toast("Enregistrement impossible"+(error?" : "+error.message:" (droits)."),true); return false; }
  const i=ENR.lignes.findIndex(x=>x.id===data[0].id); if(i>=0) ENR.lignes[i]=data[0]; else ENR.lignes.push(data[0]);
  return data[0];
}
async function enrSupprimer(id){
  const {data,error}=await SB.from("enregistrements").delete().eq("id",id).select("id");
  if(error||!data?.length){ toast("Suppression impossible"+(error?" : "+error.message:"."),true); return false; }
  ENR.lignes=ENR.lignes.filter(x=>x.id!==id); return true;
}
async function enrEnregistrerAnnulable(avant,apres,message){
  const copie={...avant};
  if(!await enrEnregistrer(apres)) return false;
  render(); fjAnnulable(message, async()=>{ if(!await enrEnregistrer(copie)) throw new Error("enregistrement refusé"); });
  return true;
}
/* Droits d'enregistrement des actes liés à une ligne de facturation. */
const enrLiesA = fjId => ENR.lignes.filter(e=>e.fj_id===fjId);
const enrDroitsLies = fjId => enrLiesA(fjId).reduce((t,e)=>t+(+e.montant||0),0);

/* --------------------------------------------------------------- vue */
VIEWS.enregistrements = () => {
  if(!ENR.acces) return `<div class="top"><h1>Juridique</h1></div><div class="wrap"><div class="notice">Accès non autorisé.</div></div>`;
  const E=enrEtats(), o=enrOptions(), visibles=ENR.lignes;
  const encours=visibles.filter(l=>!l.date_retour), faits=visibles.filter(l=>l.date_retour);
  const onglet=["encours","enregistres","tous"].includes(ENR.onglet)?ENR.onglet:"encours";
  let base=onglet==="encours"?encours:onglet==="enregistres"?faits:visibles;
  const nbEtat={}; for(const l of base){ const e=enrEtatDe(l); nbEtat[e.id]=(nbEtat[e.id]||0)+1; }
  const etat=E.some(e=>e.id===ENR.etat)?ENR.etat:"";
  const q=normClient(ENR.recherche||"");
  let lignes=base.filter(l=>(!etat||enrEtatDe(l).id===etat)&&(!q||normClient(`${l.dossier} ${l.motif||""} ${l.sie||""} ${l.commentaires||""}`).includes(q)));
  const rang=l=>E.findIndex(e=>e.id===enrEtatDe(l).id);
  fjTrier(lignes,"enr",{dossier:l=>normClient(l.dossier||""),motif:l=>normClient(l.motif||""),montant:l=>l.montant==null?null:+l.montant,sie:l=>normClient(l.sie||"")||null,
    suivi:l=>rang(l),attente:l=>l.date_envoi_sie&&!l.date_retour?enrJours(l.date_envoi_sie):null},
    (a,b)=>(rang(a)-rang(b))||String(a.date_envoi_sie||a.date_demande_virement||a.created_at||"").localeCompare(String(b.date_envoi_sie||b.date_demande_virement||b.created_at||"")));
  const aDemander=encours.filter(l=>!l.date_demande_virement&&!l.date_virement&&!l.date_envoi_sie);
  const attente=encours.filter(l=>l.date_envoi_sie);
  const enRetard=attente.filter(l=>enrJours(l.date_envoi_sie)>(+o.delaiRetour||30));
  const annee=today().slice(0,4), faitsAnnee=faits.filter(l=>String(l.date_retour).slice(0,4)===annee);
  const somme=a=>a.reduce((t,l)=>t+(+l.montant||0),0);
  const total=somme(lignes);
  const tab=(k,l,n)=>`<button class="vue-onglet ${onglet===k?"on":""}" data-enr-onglet="${k}">${l} <span class="vue-compte">${n}</span></button>`;
  return `<div class="top"><h1>Juridique</h1><span class="sub">Enregistrements aux impôts — accès réservé</span><span class="spacer"></span>
    ${FJ.acces?`<button class="btn fj-bureau" data-enr-param>Paramètres</button>`:""}
    <button class="btn fj-bureau" data-enr-export>Exporter en CSV</button>
    <button class="btn p" data-enr-nouveau>Nouvel enregistrement</button></div>
  <div class="wrap fj-page">
    ${ENR.table?"":`<div class="notice rouge" style="margin-bottom:12px">Table des enregistrements absente : exécuter le script v57 dans Supabase.</div>`}
    ${fjIndicateurs(`<div class="kpi-grid">
      ${kpi("Virements à demander",String(aDemander.length),aDemander.length?`${eur0(somme(aDemander))} de droits`:"Aucun")}
      ${kpi("En attente de retour du SIE",String(attente.length),enRetard.length?`dont ${enRetard.length} depuis plus de ${o.delaiRetour} jours`:"Aucun retard")}
      ${kpi("Enregistrés en "+annee,String(faitsAnnee.length),`${eur0(somme(faitsAnnee))} de droits`)}
      ${kpi("En cours",String(encours.length),`${eur0(somme(encours))} de droits`)}
    </div>`)}
    <div class="vues-barre" style="margin-bottom:12px">${tab("encours","En cours",encours.length)}${tab("enregistres","Enregistrés",faits.length)}${tab("tous","Tous",visibles.length)}</div>
    <div class="card"><div class="bd">
      <div class="row" style="justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px">
        <div class="vues-barre" style="margin:0"><button class="vue-onglet ${!etat?"on":""}" data-enr-etat="">Tous <span class="vue-compte">${base.length}</span></button>${E.filter(e=>nbEtat[e.id]||etat===e.id).map(e=>`<button class="vue-onglet ${etat===e.id?"on":""}" data-enr-etat="${e.id}"><span class="fj-point" style="--fj-c:${e.couleur}"></span>${esc(e.libelle)} <span class="vue-compte">${nbEtat[e.id]||0}</span></button>`).join("")}</div>
        <input type="search" data-enr-recherche placeholder="Rechercher un dossier, un motif, un SIE…" value="${esc(ENR.recherche)}" style="width:280px;max-width:100%">
      </div>
      <div style="overflow-x:auto"><table class="synthese-table fj-table enr-table">
        <thead><tr>${fjTh("enr","dossier","Dossier")}${fjTh("enr","motif","Motif")}${fjTh("enr","montant","Droits","r")}${fjTh("enr","suivi","Suivi","",`V : demande de virement · P : virement effectué · E : envoi au SIE · R : retour`)}${fjTh("enr","sie","SIE")}${fjTh("enr","attente","Attente","","Jours écoulés depuis l'envoi au SIE, tant que l'acte n'est pas revenu")}<th class="fj-actions"></th></tr></thead>
        <tbody>${lignes.map(l=>{ const e=enrEtatDe(l), j=l.date_envoi_sie&&!l.date_retour?enrJours(l.date_envoi_sie):null, c=fjClientDe(l), fj=l.fj_id?FJ.lignes.find(x=>x.id===l.fj_id):null;
          return `<tr class="fj-ligne fj-cliquable" data-enr-ligne="${esc(l.id)}" tabindex="0" style="--fj-c:${e.couleur}" title="${esc(e.libelle)}">
          <td><div class="fj-nom">${c?`<button type="button" class="fj-client fj-lien" data-fj-client="${esc(c.id)}" title="Ouvrir la fiche client">${esc(l.dossier)}</button>`:`<span class="fj-client">${esc(l.dossier)}</span>`}${fj?` <span class="tag gris" title="Lié à la ligne de facturation juridique « ${esc(fj.mission||fj.type_operation||"")} »">facturation</span>`:""}</div>${l.commentaires?`<div class="hint">${esc(l.commentaires)}</div>`:""}</td>
          <td>${esc(l.motif||"")}</td>
          <td class="r num">${l.montant!=null?eur(l.montant):`<span class="dim">—</span>`}</td>
          <td><span class="fj-frise">${ENR_JALONS().map(([k,lettre,lib])=>`<button type="button" class="fj-jalon${l[k]?" fait":""}" data-enr-jalon="${esc(l.id)}:${k}" title="${esc(lib)} : ${l[k]?dateFR(l[k]):"non renseignée"}">${lettre}</button>`).join("")}</span></td>
          <td>${esc(l.sie||"")}</td>
          <td>${j==null?`<span class="dim">—</span>`:`<span class="tag ${j>(+o.delaiRetour||30)?"rouge":j>(+o.delaiRetour||30)/2?"ocre":"gris"}">${j} j</span>`}</td>
          <td class="fj-actions"><div class="fj-boutons">${!l.date_retour&&l.date_envoi_sie?`<button class="btn sm p" data-enr-retour="${esc(l.id)}" title="Acte revenu enregistré aujourd'hui">Retour reçu</button>`:""}${!l.date_envoi_sie&&!l.date_retour?`<button class="btn sm" data-enr-envoi="${esc(l.id)}" title="Envoyé au SIE aujourd'hui">Envoyé</button>`:""}<button class="btn sm" data-enr-modifier="${esc(l.id)}">Modifier</button></div></td></tr>`; }).join("")||`<tr><td colspan="7"><div class="empty-state"><b>Aucun enregistrement</b></div></td></tr>`}</tbody>
        <tfoot><tr class="total"><td colspan="2"><b>Total (${lignes.length})</b></td><td class="r num"><b>${eur(total)}</b></td><td colspan="3"></td><td class="fj-actions"></td></tr></tfoot>
      </table></div>
      <div class="hint" style="margin-top:8px">Cliquez sur un point V · P · E · R pour saisir la date, sur la ligne pour la modifier, sur un en-tête pour trier. Attente : rouge au-delà de ${o.delaiRetour} jours sans retour.</div>
    </div></div>
  </div>`;
};

/* ------------------------------------------------------- formulaire */
function enrFormulaire(ligne,titre){
  return new Promise(resolve=>{
    const l={...ligne};
    const motifs=[...new Set(ENR.lignes.map(x=>x.motif).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
    const sies=[...new Set(ENR.lignes.map(x=>x.sie).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
    const fjs=FJ.lignes.filter(x=>!x.ecarte).slice().sort((a,b)=>String(a.dossier).localeCompare(String(b.dossier),"fr"));
    const champ=(k,lib,type="text",extra="")=>`<label class="f"><span>${lib}</span><input type="${type}" data-enrf="${k}" value="${esc(l[k]??"")}" ${extra}></label>`;
    const m=document.createElement("div"); m.className="modal modal-confirm fj-modal";
    m.innerHTML=`<div class="box" style="max-width:760px"><div class="modal-titlebar"><h2>${esc(titre)}</h2><button class="modal-x" type="button">×</button></div>
      <div class="modal-content"><div class="grid g2">
        ${champ("dossier","Dossier (client)","text","required")}
        <label class="f"><span>Motif d'enregistrement</span><input type="text" data-enrf="motif" list="enr-motifs" value="${esc(l.motif||"")}"><datalist id="enr-motifs">${motifs.map(x=>`<option value="${esc(x)}">`).join("")}</datalist></label>
        ${champ("montant","Droits d'enregistrement (€)","number",'step="0.01" min="0"')}
        <label class="f"><span>SIE</span><input type="text" data-enrf="sie" list="enr-sies" value="${esc(l.sie||"")}" placeholder="ex. BAYONNE"><datalist id="enr-sies">${sies.map(x=>`<option value="${esc(x)}">`).join("")}</datalist></label>
        ${champ("date_demande_virement",`Demande de virement${enrOptions().destVirement?" à "+esc(enrOptions().destVirement):""}`,"date")}
        ${champ("date_virement","Virement effectué","date")}
        ${champ("date_envoi_sie","Envoi au SIE","date")}
        ${champ("date_retour","Retour de l'acte enregistré","date")}
        ${FJ.acces?`<label class="f"><span>Ligne de facturation juridique liée</span><select data-enrf="fj_id"><option value="">— Aucune —</option>${fjs.map(x=>`<option value="${esc(x.id)}" ${l.fj_id===x.id?"selected":""}>${esc(x.dossier)}${x.mission?" · "+esc(x.mission):x.type_operation?" · "+esc(x.type_operation):""}${x.etat==="facture"?" (facturé)":""}</option>`).join("")}</select></label>`:""}
        <label class="f"><span>Fiche client</span><select data-enrf="client_id"><option value="">${(()=>{const c=fjClientDe({...l,client_id:""});return c?`Automatique : ${esc(c.raison||"")}`:"— Aucune —";})()}</option>${(st.clients||[]).filter(c=>!c.archive||c.id===l.client_id).slice().sort((a,b)=>String(a.raison||"").localeCompare(String(b.raison||""),"fr")).map(c=>`<option value="${esc(c.id)}" ${l.client_id===c.id?"selected":""}>${esc(c.raison||"Client")}</option>`).join("")}</select></label>
      </div>
      <label class="f" style="margin-top:12px"><span>Commentaires</span><textarea data-enrf="commentaires">${esc(l.commentaires||"")}</textarea></label>
      <div class="hint" style="margin-top:6px;${FJ.acces?"":"display:none"}">Une ligne liée à la facturation juridique reporte ses droits dans le débours « Enregistrement » au passage en facturation.</div></div>
      <div class="modal-actions">${l.id?`<button class="btn" data-enr-suppr style="margin-right:auto;color:var(--rouge)">Supprimer</button>`:""}<button class="btn" data-no>Annuler</button><button class="btn p" data-yes>Enregistrer</button></div></div>`;
    const lire=()=>m.querySelectorAll("[data-enrf]").forEach(el=>{ l[el.dataset.enrf]=el.value; });
    const fin=v=>{ m.remove(); resolve(v); };
    const selFj=m.querySelector("[data-enrf='fj_id']"); if(selFj) selFj.onchange=e=>{ const x=FJ.lignes.find(y=>y.id===e.target.value); const dos=m.querySelector("[data-enrf='dossier']"); if(x&&!dos.value.trim()) dos.value=x.dossier; };
    m.querySelector(".modal-x").onclick=()=>fin(null); m.querySelector("[data-no]").onclick=()=>fin(null);
    m.querySelector("[data-yes]").onclick=()=>{ lire(); fin(l); };
    const sup=m.querySelector("[data-enr-suppr]"); if(sup) sup.onclick=()=>fin({...l,__supprimer:true});
    document.body.appendChild(m); setTimeout(()=>m.querySelector("[data-enrf='dossier']")?.focus(),20);
  });
}
async function enrEditer(ligne,titre){
  const r=await enrFormulaire(ligne,titre); if(!r) return;
  if(r.__supprimer){
    if(!await askConfirm("Supprimer l'enregistrement",`L'enregistrement « ${r.dossier} » sera supprimé définitivement.`,{confirmLabel:"Supprimer",danger:true})) return;
    if(await enrSupprimer(r.id)){ toast("Enregistrement supprimé."); render(); } return;
  }
  const avant=r.id?ENR.lignes.find(x=>x.id===r.id):null;
  if(avant){ await enrEnregistrerAnnulable(avant,r,`Enregistrement modifié — ${r.dossier}`); return; }
  if(await enrEnregistrer(r)){ toast("Enregistrement créé."); render(); }
}

function enrParametres(){
  const o=enrOptions(), E=enrEtats();
  const m=document.createElement("div"); m.className="modal modal-confirm fj-modal";
  m.innerHTML=`<div class="box" style="max-width:600px"><div class="modal-titlebar"><h2>Paramètres des enregistrements</h2><button class="modal-x" type="button">×</button></div>
    <div class="modal-content"><div class="grid g2">
      <label class="f"><span>Destinataire des demandes de virement</span><input type="text" data-enrp="destVirement" value="${esc(o.destVirement||"")}"></label>
      <label class="f"><span>Alerte si pas de retour du SIE après (jours)</span><input type="number" min="1" data-enrp="delaiRetour" value="${esc(o.delaiRetour)}"></label>
    </div>
    <div class="f" style="margin-top:12px"><span><b>Couleurs des états</b></span>
      ${E.map(e=>`<label class="row" style="gap:10px;margin:5px 0"><input type="color" data-enrc="${e.id}" value="${e.couleur}" style="width:44px;padding:2px"> ${esc(e.libelle)}</label>`).join("")}
    </div></div>
    <div class="modal-actions"><button class="btn" data-no>Annuler</button><button class="btn p" data-yes>Enregistrer</button></div></div>`;
  const fermer=()=>m.remove();
  m.querySelector(".modal-x").onclick=fermer; m.querySelector("[data-no]").onclick=fermer;
  m.querySelector("[data-yes]").onclick=async()=>{
    const couleurs={}; m.querySelectorAll("[data-enrc]").forEach(i=>couleurs[i.dataset.enrc]=fjCouleurSure(i.value));
    const enr={destVirement:m.querySelector("[data-enrp='destVirement']").value.trim(),delaiRetour:Math.max(1,+m.querySelector("[data-enrp='delaiRetour']").value||30),couleurs};
    if(await fjEnregistrerReglage("options",{...(FJ.reglages.options||{}),enr})){ fermer(); toast("Paramètres enregistrés."); render(); }
  };
  document.body.appendChild(m);
}

function enrExporter(){
  const q=v=>`"${String(v??"").replace(/"/g,'""')}"`, nb=v=>v==null?"":String(v).replace(".",",");
  const L=[["Dossier","Motif d'enregistrement","Montant",`Demande virement${enrOptions().destVirement?" à "+enrOptions().destVirement:""}`,"Virement effectué","Envoi SIE","Lieu","Retour","État","Commentaires"].map(q).join(";")];
  for(const l of ENR.lignes) L.push([q(l.dossier),q(l.motif),nb(l.montant),q(dateFR(l.date_demande_virement)),q(dateFR(l.date_virement)),q(dateFR(l.date_envoi_sie)),q(l.sie),q(dateFR(l.date_retour)),q(enrEtatDe(l).libelle),q(l.commentaires)].join(";"));
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob(["﻿"+L.join("\r\n")],{type:"text/csv;charset=utf-8"}));
  a.download=`enregistrements-${today()}.csv`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1200);
}

/* ----------------------------------------------------- liaisons écran */
function enrLier(){
  if(st.view!=="enregistrements"||!ENR.acces) return;
  const un=(sel,f)=>document.querySelectorAll(sel).forEach(f);
  fjEtiqueterTables();
  un("[data-enr-onglet]",b=>b.onclick=()=>{ ENR.onglet=b.dataset.enrOnglet; ENR.etat=""; render(); });
  un("[data-enr-etat]",b=>b.onclick=()=>{ ENR.etat=b.dataset.enrEtat; render(); });
  un("[data-enr-recherche]",i=>i.oninput=()=>{ ENR.recherche=i.value; const pos=i.selectionStart; render(); const n=document.querySelector("[data-enr-recherche]"); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(_){} } });
  un("[data-fj-trier]",th=>th.onclick=()=>{ const [o,k]=th.dataset.fjTrier.split(":"); const t=FJ.tris[o]; FJ.tris[o]=t&&t.k===k?{k,dir:t.dir==="asc"?"desc":"asc"}:{k,dir:"asc"}; render(); });
  un("[data-fj-client]",b=>b.onclick=e=>{ e.stopPropagation(); st.clientViewId=b.dataset.fjClient; st.view="client1"; render(); });
  un("[data-fj-indicateurs]",d=>d.ontoggle=()=>{ try{ localStorage.setItem("serre:fj:indicateurs",d.open?"1":"0"); }catch(_){} });
  un("[data-enr-nouveau]",b=>b.onclick=()=>enrEditer({dossier:""},"Nouvel enregistrement"));
  un("[data-enr-param]",b=>b.onclick=enrParametres);
  un("[data-enr-export]",b=>b.onclick=enrExporter);
  un("[data-enr-modifier]",b=>b.onclick=e=>{ e.stopPropagation(); const l=ENR.lignes.find(x=>x.id===b.dataset.enrModifier); if(l) enrEditer(l,"Modifier l'enregistrement"); });
  un("[data-enr-retour]",b=>b.onclick=async e=>{ e.stopPropagation(); const l=ENR.lignes.find(x=>x.id===b.dataset.enrRetour); if(l) await enrEnregistrerAnnulable(l,{...l,date_retour:today()},`Retour enregistré le ${dateFR(today())} — ${l.dossier}`); });
  un("[data-enr-envoi]",b=>b.onclick=async e=>{ e.stopPropagation(); const l=ENR.lignes.find(x=>x.id===b.dataset.enrEnvoi); if(l) await enrEnregistrerAnnulable(l,{...l,date_envoi_sie:today()},`Envoyé au SIE le ${dateFR(today())} — ${l.dossier}`); });
  un("[data-enr-jalon]",b=>b.onclick=e=>{ e.stopPropagation();
    const [id,k]=b.dataset.enrJalon.split(":"); const l=ENR.lignes.find(x=>x.id===id); if(!l) return;
    const lib=(ENR_JALONS().find(x=>x[0]===k)||[])[2]||"Date";
    fjPopover(b,`<div class="fj-pop-titre">${esc(lib)} — ${esc(l.dossier)}</div><input type="date" data-pop-date value="${esc(l[k]||"")}">
      <div class="fj-pop-actions"><button type="button" class="btn sm" data-pop-auj>Aujourd'hui</button>${l[k]?`<button type="button" class="btn sm" data-pop-eff>Effacer</button>`:""}<button type="button" class="btn sm p" data-pop-ok>Enregistrer</button></div>`,
    (p,fermer)=>{ const valider=async v=>{ fermer(); if((l[k]||"")===(v||"")) return; await enrEnregistrerAnnulable(l,{...l,[k]:v||""},`${lib} : ${v?dateFR(v):"effacée"} — ${l.dossier}`); };
      const inp=p.querySelector("[data-pop-date]"); inp.onkeydown=ev=>{ if(ev.key==="Enter"){ ev.preventDefault(); valider(inp.value); } };
      p.querySelector("[data-pop-ok]").onclick=()=>valider(inp.value); p.querySelector("[data-pop-auj]").onclick=()=>valider(today());
      const eff=p.querySelector("[data-pop-eff]"); if(eff) eff.onclick=()=>valider(""); });
  });
  un("[data-enr-ligne]",tr=>{
    const ouvrir=()=>{ const l=ENR.lignes.find(x=>x.id===tr.dataset.enrLigne); if(l) enrEditer(l,"Modifier l'enregistrement"); };
    tr.onclick=e=>{ if(e.target.closest("button,a,input,select,textarea,label,.fj-pop")) return; if(String(window.getSelection?.()||"").trim()) return; ouvrir(); };
    tr.onkeydown=e=>{ if(e.key==="Enter"&&e.target===tr){ e.preventDefault(); e.stopPropagation(); ouvrir(); } };
  });
}
