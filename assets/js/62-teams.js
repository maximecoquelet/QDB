/* =====================================================================
   v58 — TEAMS : devis validé → message dans la conversation du cabinet
   ---------------------------------------------------------------------
   Au passage d'un devis à « signé ou validé » (case du dossier, bouton
   « Devis validé » de la page Juridique, ou signature Yousign), une carte
   reprenant les informations principales part dans la conversation Teams,
   via le serveur Render (qui seul détient l'adresse du Workflow Teams).

   Une seule fois par devis (`d.teamsNotifie`). Tant que l'adresse n'est
   pas configurée sur Render, rien n'est envoyé et rien n'est signalé.
   ===================================================================== */
const TEAMS_TYPES = { traditional:"Mission normale", punctual:"Ponctuelle comptable", legal:"Ponctuelle juridique" };

function teamsBandeau(message, libelle, action){
  document.querySelectorAll(".fj-annuler").forEach(x=>x.remove());
  const t=document.createElement("div"); t.className="fj-annuler"; t.setAttribute("role","status");
  t.innerHTML=`<span>${esc(message)}</span><button type="button">${esc(libelle)}</button><button type="button" aria-label="Fermer">×</button>`;
  const [b,x]=t.querySelectorAll("button"); b.onclick=()=>{ t.remove(); action(); }; x.onclick=()=>t.remove();
  document.body.appendChild(t); setTimeout(()=>t.remove(),20000);
}

function teamsCharge(d){
  const m=modOf(d), ms=manualSignState(d.manualSign); let t={recAn:0,pon:0};
  try{ t=totaux(d,m); }catch(_){}
  let type=""; try{ type=TEAMS_TYPES[dashboardColorType(d,m)]||""; }catch(_){}
  const titre=intituleDevis(d);
  return {
    client:d.client?.raison||"", siren:d.client?.siren||"", ref:d.ref||"",
    mission:titre&&titre!=="Devis"?titre:(m?.titre||""), type,
    recAn:Math.round((+t.recAn||0)*100)/100, pon:Math.round((+t.pon||0)*100)/100,
    responsable:(d.ownerEmail||"").split("@")[0]||"", dateValidation:ms.quoteSignedDate||d.sign?.signe||today(),
    lien:location.origin+location.pathname
  };
}

async function teamsDevisValide(d, {force=false}={}){
  if(!d||(!force&&d.teamsNotifie)||!(SB&&SB_USER)) return;
  const base=String(st.ys?.proxy||DEFAULT_RENDER_PROXY).replace(/\/$/,"");
  try{
    const r=await proxyFetch(base+"/api/teams/devis-valide",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(teamsCharge(d))});
    const j=await r.json().catch(()=>({}));
    if(r.status===503&&j.nonConfigure) return;                      /* Teams pas encore branché : silence */
    if(!r.ok) throw new Error(j.error||`HTTP ${r.status}`);
    d.teamsNotifie={at:nowISO(),par:SB_USER?.email||""};
    const avant=st.id; st.id=d.id; try{ await saveDev(); }finally{ st.id=avant; }
    toast(`Devis ${d.ref||""} publié dans Teams.`);
  }catch(e){
    teamsBandeau(`Message Teams non envoyé (${d.client?.raison||"devis"}) : ${e?.message||e}`,"Réessayer",()=>teamsDevisValide(d,{force:true}));
  }
}
