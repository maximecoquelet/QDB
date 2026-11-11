/* ------------------------------------------------------- liste devis */

/* v49 : l'ordre du portefeuille tel qu'il vient d'être affiché. Il sert au
   déplacement « dossier précédent / suivant » depuis l'intérieur d'un
   dossier : les flèches suivent la liste que l'utilisateur avait sous les
   yeux, filtres et tri compris, et non un ordre arbitraire. */
let PORTEFEUILLE_ORDRE=[];
function memoriserOrdrePortefeuille(blocs){
  PORTEFEUILLE_ORDRE=blocs.flat().map(d=>d.id);
}
function dossiersVoisins(d){
  if(!d) return {prev:null,next:null,index:-1,total:0};
  let ids=PORTEFEUILLE_ORDRE.filter(id=>st.devis.some(x=>x.id===id));
  if(!ids.includes(d.id)) ids=sortDashboardRows(st.devis.filter(x=>!isArchivedDevis(x))).map(x=>x.id);
  const i=ids.indexOf(d.id);
  if(i<0) return {prev:null,next:null,index:-1,total:0};
  return {prev:i>0?ids[i-1]:null,next:i<ids.length-1?ids[i+1]:null,index:i,total:ids.length};
}

/* v49 — repérage des dossiers qui traînent.
   Un devis envoyé et sans retour se signale de lui-même : au-delà d'une
   semaine une relance s'impose, au-delà de sa durée de validité la
   proposition est caduque et doit être réémise. */
const RELANCE_JOURS=7;
const dateEnvoiDe = d => d?.sign?.envoye||d?.manualSign?.sentDate||"";
/* v51 : une relance effectuée se déclare. Sans cela, le dossier que l'on
   vient d'aller chercher au téléphone réapparaît identique le lendemain,
   et la liste finit par ne plus être lue. Une relance repousse le rappel
   d'une semaine ; elle ne masque jamais une validité dépassée, qui appelle
   une nouvelle proposition et non un coup de fil. */
const relancesDe = d => Array.isArray(d?.relances)?d.relances:[];
const derniereRelance = d => relancesDe(d).slice(-1)[0]?.at||"";
function etatRetard(d){
  if(workflowStatut(d)!=="envoye") return null;
  const envoi=dateEnvoiDe(d); if(!envoi) return null;
  const j=daysSince(envoi), v=+d.validite||30;
  const rel=derniereRelance(d), jr=rel?daysSince(rel):null;
  if(j>v)                                return {niveau:"expire", j, jr, txt:`Validité dépassée · ${j} j`};
  if(jr!==null && jr<RELANCE_JOURS)      return {niveau:"", j, jr, txt:jr===0?"Relancé aujourd'hui":`Relancé il y a ${jr} j`};
  if(j>=RELANCE_JOURS)                   return {niveau:"relance",j, jr, txt:`Sans retour · ${j} j${relancesDe(d).length?` · ${relancesDe(d).length} relance(s)`:""}`};
  return {niveau:"", j, jr, txt:`Envoyé il y a ${j} j`};
}
const estEnRetard = d => { const e=etatRetard(d); return !!e&&e.niveau!==""; };
/* Dossiers qui appellent réellement une relance, du plus ancien au plus récent. */
function dossiersARelancer(){
  return st.devis.filter(d=>!isArchivedDevis(d)).map(ensureInternalState)
    .map(d=>({d,e:etatRetard(d)}))
    .filter(x=>x.e&&x.e.niveau)
    .sort((a,b)=>b.e.j-a.e.j);
}

/* =====================================================================
   v52 — VUES ENREGISTRÉES DU PORTEFEUILLE
   ---------------------------------------------------------------------
   Cinq façons de regarder le portefeuille couvrent l'essentiel des usages
   quotidiens. Chacune n'est qu'une combinaison des filtres déjà existants :
   aucun mécanisme parallèle, et les pastilles de filtre continuent de
   montrer exactement ce qui est appliqué, de sorte qu'on peut partir d'une
   vue et l'ajuster librement.
   ===================================================================== */
const VUES_PORTEFEUILLE=[
  {cle:"tous",     nom:"Tout le portefeuille", aide:"Tous les dossiers en cours",
   filtres:()=>({...FILTRES_DEFAUT}),
   compte:()=>st.devis.filter(d=>!isArchivedDevis(d)&&workflowStatut(d)!=="classe").length},
  {cle:"mine",     nom:"Mes dossiers", aide:"Les dossiers dont je suis responsable",
   filtres:()=>({...FILTRES_DEFAUT,owner:SB_USER?.email||""}),
   compte:()=>st.devis.filter(d=>!isArchivedDevis(d)&&d.ownerEmail===(SB_USER?.email||"")&&workflowStatut(d)!=="classe").length},
  {cle:"preparer", nom:"À préparer", aide:"Brouillons et devis établis, non encore envoyés",
   filtres:()=>({...FILTRES_DEFAUT,statuts:"brouillon,genere"}),
   compte:()=>st.devis.filter(d=>!isArchivedDevis(d)&&["brouillon","genere"].includes(workflowStatut(d))).length},
  {cle:"relancer", nom:"À relancer", aide:"Envoyés sans retour au-delà du délai, ou validité dépassée",
   filtres:()=>({...FILTRES_DEFAUT,retard:"1"}),
   compte:()=>dossiersARelancer().length},
  {cle:"signature",nom:"En signature", aide:"Devis partis chez le client et en attente de réponse",
   filtres:()=>({...FILTRES_DEFAUT,status:"envoye"}),
   compte:()=>st.devis.filter(d=>!isArchivedDevis(d)&&workflowStatut(d)==="envoye").length}
];
const signatureFiltres = f => JSON.stringify(Object.keys(FILTRES_DEFAUT).sort().map(k=>[k,String(f?.[k]??FILTRES_DEFAUT[k]??"")]));
function vuePortefeuilleActive(){
  const courant=signatureFiltres(st.portFilters);
  const v=VUES_PORTEFEUILLE.find(v=>signatureFiltres(v.filtres())===courant);
  return v?v.cle:"";
}

const devisCreatedAt = d => String(d?.creeAt||d?.cree||"");
function sortDashboardRows(rows){const {key,dir}=st.portSort||{key:"cree",dir:"desc"},mul=dir==="desc"?-1:1;return [...rows].sort((a,b)=>{const ma=modOf(a),mb=modOf(b),ta=totaux(a,ma),tb=totaux(b,mb);let A="",B="";if(key==="client"){A=a.client?.raison||"";B=b.client?.raison||"";}else if(key==="ref"){A=a.ref||"";B=b.ref||"";}else if(key==="model"){A=ma?.titre||"";B=mb?.titre||"";}else if(key==="cree"){return String(devisCreatedAt(a)).localeCompare(String(devisCreatedAt(b)))*mul;}else if(key==="amount"){return((ta.recAn||ta.pon||0)-(tb.recAn||tb.pon||0))*mul;}else if(key==="status"){A=STATUTS[workflowStatut(a)]?.[0]||"";B=STATUTS[workflowStatut(b)]?.[0]||"";}return String(A).localeCompare(String(B),"fr",{sensitivity:"base"})*mul;});}
function sortClientRows(rows){const {key,dir}=st.clientSort||{key:"client",dir:"asc"},mul=dir==="desc"?-1:1;return [...rows].sort((a,b)=>{const A=key==="client"?(a.raison||""):clientStats(a).rec,B=key==="client"?(b.raison||""):clientStats(b).rec;if(typeof A==="number")return(A-B)*mul;return String(A).localeCompare(String(B),"fr",{sensitivity:"base"})*mul;});}
function missionRowLabel(d,m){
  const color=dashboardColorType(d,m);
  if(color==="legal") return "Ponctuelle juridique";
  return dashboardSectionType(d,m)==="punctual"?"Ponctuelle comptable":"Mission normale";
}
function dashboardEmptyHTML(type){
  const what=type==="traditional"?"mission normale":type==="classed"?"dossier classé":"mission ponctuelle";
  return `<div class="empty-state"><div class="empty-mark">✓</div><b>Aucune ${what}</b><small>Aucun dossier ne correspond aux filtres actuellement sélectionnés.</small></div>`;
}
function dashboardRows(rows,type){
  if(!rows.length) return dashboardEmptyHTML(type);
  rows=sortDashboardRows(rows);
  const cols=uiColumns(), punctual=type==="punctual";
  const showPunctualCol=cols.amount&&!punctual&&rows.some(d=>totaux(d,modOf(d)).pon>0);
  const ids=rows.map(d=>d.id), allSelected=ids.every(id=>st.bulkIds.includes(id));
  const head=`<tr><th class="bulk-check"><input type="checkbox" data-act="bulkAll" data-ids="${esc(ids.join(","))}" ${allSelected?"checked":""} title="Sélectionner ce bloc"></th>`
    +`<th>${sortButton("client","Client")}</th>`
    +`<th>${sortButton("cree","Date de création")}</th>`
    +(cols.model?`<th>${sortButton("model","Modèle")}</th>`:"")
    +`<th>Responsable</th>`
    +(cols.amount?(punctual?`<th class="r">${sortButton("amount","Montant HT")}</th>`
      :`<th class="r">${sortButton("amount","Annuel HT")}</th>${showPunctualCol?`<th class="r">Ponctuel HT</th>`:""}`):"")
    +(cols.status?`<th>${sortButton("status","Statut")}</th>`:"")
    +(type==="classed"?"":`<th>Suivi</th>`)
    +`<th></th></tr>`;
  const body=rows.map(d0=>{
    const d=ensureInternalState(d0), m=modOf(d), t=totaux(d,m), ws=workflowStatut(d);
    const arch=isArchivedDevis(d), c=clientMasterOf(d), color=dashboardColorType(d,m), label=missionRowLabel(d,m);
    return `<tr class="mission-${color}" data-row-open="${d.id}" title="Cliquer pour ouvrir le dossier">`
      +`<td class="bulk-check"><input type="checkbox" data-act="bulkToggle" data-id="${d.id}" ${st.bulkIds.includes(d.id)?"checked":""}></td>`
      +`<td><b>${esc(d.client.raison||"— sans nom —")}</b>${arch?` <span class="tag gris">Archivé</span>`:""}`
        +(intitulePersonnalise(d)?`<div style="font-size:12px;font-weight:600">${esc(intituleDevis(d))}</div>`:"")
        +`<div class="dim">${esc(d.client.forme)} ${esc(d.client.ville||"")}</div>`
        +`<div class="dim">Début mission : ${d.debut?dateFR(d.debut):"à renseigner"}</div>`
        +`<div class="mission-kind"><span class="dot"></span>${label}</div>`
        +`<div class="row-markers">${dossierMarkers(d,m).map(markerBadge).join("")}</div></td>`
      +`<td class="dim" style="font-size:12px">${dateFR(devisCreatedAt(d).slice(0,10))||"—"}</td>`
      +(cols.model?`<td class="dim" style="font-size:12px">${esc((m||{}).titre||"—")}</td>`:"")
      +`<td><span class="owner-chip">${esc((d.ownerEmail||"").split("@")[0]||"Non affecté")}</span></td>`
      +(cols.amount?(punctual?`<td class="r num money-strong">${t.pon?eur0(t.pon):""}</td>`
        :`<td class="r num money-strong">${t.recAn?eur0(t.recAn):""}</td>${showPunctualCol?`<td class="r num money-strong">${t.pon?eur0(t.pon):""}</td>`:""}`):"")
      +(cols.status?`<td><span class="tag status-tag ${STATUTS[ws]?.[1]||"gris"}">${STATUTS[ws]?.[0]||esc(ws)}</span></td>`:"")
      +(type==="classed"?"":`<td class="dim" style="font-size:11.5px">${(()=>{const e=etatRetard(d);return e?`<span class="${e.niveau?"row-late":""}">${esc(e.txt)}</span>`:"—";})()}</td>`)
      +`<td class="r"><div class="row-actions"><button class="btn sm" data-open="${d.id}">Ouvrir</button>`
        +`<details class="row-menu"><summary title="Autres actions">•••</summary><div class="menu-pop">`
        +(c?`<button data-client-open="${c.id}">Voir la fiche client</button><button data-act="devNewClient" data-client="${c.id}">Nouveau devis pour ce client</button><button data-act="clientArchive" data-client="${c.id}" data-to="${arch?0:1}">${arch?"Réactiver le client":"Archiver le client"}</button>`:"")
        +`<button class="danger" data-act="devDelList" data-id="${d.id}">Mettre le devis à la corbeille</button></div></details></div></td></tr>`;
  }).join("");
  return `<table class="mission-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}
/* ======================================================================
   v43 — Les trois blocs de travail du portefeuille se replient, comme les
   dossiers classés depuis la v37. L'état est mémorisé pour la session ;
   une clé absente vaut « déployé ». Un bloc se rouvre de lui-même quand
   une recherche est en cours ou quand le filtre de type le désigne, pour
   qu'aucun résultat ne reste caché derrière un volet fermé.
   ====================================================================== */
const PORT_PANELS=[
  ["traditional","Missions normales","traditional","traditional-card"],
  ["punctual","Ponctuelles comptables","punctual","punctual-card"],
  ["legal","Ponctuelles juridiques","legal","legal-card"]
];
function portPanelOpen(key){ return (st.portPanels||{})[key]!==false; }
function portPanelsAnyOpen(){ return PORT_PANELS.some(([k])=>portPanelOpen(k)); }
function missionPanelHTML({key,titre,swatch,cls,rows,type,force}){
  const ouvert=force||portPanelOpen(key);
  return `<details class="card mission-card ${cls}" data-mission-panel="${key}" ${ouvert?"open":""}>
    <summary class="hd"><span class="mission-title"><i class="mission-swatch ${swatch}"></i>${esc(titre)}</span><span>${rows.length} devis</span></summary>
    ${dashboardRows(rows,type)}</details>`;
}
VIEWS.devis = () => {
  const q=st.q.toLowerCase().trim(), f=st.portFilters||{}, years=[...new Set(st.devis.map(d=>String(d.dateDevis||d.cree||"").slice(0,4)).filter(Boolean))].sort().reverse();
  const archiveBase=st.devis.filter(d=>f.archive==="all"?true:f.archive==="archived"?isArchivedDevis(d):!isArchivedDevis(d));
  const filtered=archiveBase.filter(d=>{
    ensureInternalState(d);
    const m=modOf(d), ws=workflowStatut(d), color=dashboardColorType(d,m), section=dashboardSectionType(d,m), yr=String(d.dateDevis||d.cree||"").slice(0,4);
    const text=(d.client.raison+" "+d.client.siren+" "+d.ref+" "+(m?.titre||"")+" "+(d.ownerEmail||"")).toLowerCase();
    return (!q||text.includes(q)) && (!f.status||ws===f.status) && (!f.model||d.modeleId===f.model) && (!f.year||yr===f.year) && (!f.owner||d.ownerEmail===f.owner) && (!f.type||(f.type==="traditional"?section==="traditional":color===f.type)) && (!f.retard||estEnRetard(d));
  });
  /* Les dossiers classés sont mis de côté dans un bloc replié en bas de page :
     ils restent consultables sans encombrer les listes de travail. */
  const classed=filtered.filter(d=>workflowStatut(d)==="classe");
  const live=filtered.filter(d=>workflowStatut(d)!=="classe");
  const classedOpen=!!st.portClassedOpen||f.status==="classe";
  const traditional=live.filter(d=>dashboardSectionType(d,modOf(d))==="traditional");
  const punctualAll=live.filter(d=>dashboardSectionType(d,modOf(d))==="punctual");
  const punctualAccounting=punctualAll.filter(d=>dashboardColorType(d,modOf(d))==="punctual");
  const punctualLegal=punctualAll.filter(d=>dashboardColorType(d,modOf(d))==="legal");
  const active=st.devis.filter(d=>!isArchivedDevis(d));
  const activeClassed=active.filter(d=>workflowStatut(d)==="classe").length;
  const eligible=active.filter(d=>!["refuse","expire"].includes(workflowStatut(d)));
  /* v52 : deux natures d'honoraires, longtemps confondues sous un seul
     total. « Proposé » = ce qui est parti chez le client et attend sa
     réponse (statuts devis établi et envoyé). « Contractualisé » = ce que
     le client a accepté (validé, signé, classé). Un refusé ou un expiré
     n'entre dans aucun des deux. */
  const STATUTS_PROPOSES=new Set(["genere","envoye"]);
  const STATUTS_CONTRACTUALISES=new Set(["valide","signe","classe"]);
  const proposeRec=active.filter(d=>STATUTS_PROPOSES.has(workflowStatut(d))).reduce((s,d)=>s+totaux(d,modOf(d)).recAn,0);
  const signeRec=active.filter(d=>STATUTS_CONTRACTUALISES.has(workflowStatut(d))).reduce((s,d)=>s+totaux(d,modOf(d)).recAn,0);
  const somme=eligible.reduce((s,d)=>s+totaux(d,modOf(d)).recAn,0), ponctuel=eligible.reduce((s,d)=>s+totaux(d,modOf(d)).pon,0), attente=active.filter(d=>workflowStatut(d)==="envoye").length, finalises=active.filter(d=>["valide","signe","classe"].includes(workflowStatut(d))).length, actions=active.filter(d=>["brouillon","genere","envoye"].includes(workflowStatut(d))).length;
  const selected=st.bulkIds.filter(id=>st.devis.some(d=>d.id===id));
  const vueActive=vuePortefeuilleActive();
  memoriserOrdrePortefeuille([sortDashboardRows(traditional),sortDashboardRows(punctualAccounting),sortDashboardRows(punctualLegal),sortDashboardRows(classed)]);
  const retards=archiveBase.filter(estEnRetard).length;
  const chips=filtresActifs();
  const LIB_FILTRE={status:"Statut",type:"Type",model:"Modèle",year:"Année",archive:"Clients",owner:"Responsable",retard:"Suivi"};
  const valeurFiltre=(k,v)=>k==="status"?(STATUTS[v]?.[0]||v)
    :k==="type"?({traditional:"Mission normale",punctual:"Ponctuelle comptable",legal:"Ponctuelle juridique"}[v]||v)
    :k==="model"?(st.modeles.find(m=>m.id===v)?.titre||v)
    :k==="archive"?({archived:"Archivés",all:"Tous"}[v]||v)
    :k==="owner"?(String(v).split("@")[0]||v)
    :k==="retard"?"En retard uniquement":v;
  const chipsHTML=chips.length?`<div class="filter-chips"><span class="dim" style="font-size:11.5px">Filtres actifs :</span>${chips.map(([k,v])=>`<span class="filter-chip"><b>${esc(LIB_FILTRE[k]||k)}</b> ${esc(valeurFiltre(k,v))}<button type="button" data-act="filtreRetirer" data-k="${esc(k)}" title="Retirer ce filtre">×</button></span>`).join("")}<button class="btn sm ghost" data-act="filtresReset">Tout réinitialiser</button></div>`:"";
  return `<div class="top"><h1>Portefeuille</h1><span class="sub">${active.length-activeClassed} dossier(s) en cours · ${finalises} finalisé(s)${activeClassed?` · ${activeClassed} classé(s) mis de côté`:""}</span><span class="spacer"></span>
    <input type="text" id="q" placeholder="Rechercher un client, une référence…" value="${esc(st.q)}" style="width:250px">
    ${menuAffichageHTML()}
    <details class="row-menu menu-entete"><summary class="btn sm" title="Autres actions">Autres actions</summary><div class="menu-pop">
      <button data-global-search>Recherche globale (Ctrl K)</button>
      <button data-refresh>Actualiser depuis le serveur</button>
      ${canRole("admin")?`<button data-act="ouvrirCorbeille">Corbeille${st.trash?.length?` (${st.trash.length})`:""}</button>`:""}
      ${canRole("manager")?`<button data-act="bulkExport">Exporter la sélection en JSON</button>`:""}
    </div></details>
    <button class="btn p" data-nav="nouveau">Nouveau dossier</button></div>
  <div class="wrap"><div class="kpi-grid">${kpi("Dossiers affichés",String(live.length),`Sur ${active.length-activeClassed} en cours dans le cabinet${chips.length||q?" · liste filtrée":""}`)}${kpi("Récurrent proposé HT / an",eur0(proposeRec),`Devis établis ou envoyés, non encore signés · cabinet entier`)}${kpi("Récurrent contractualisé HT / an",eur0(signeRec),"Devis signés, lettres signées et dossiers classés · cabinet entier")}${kpi("À traiter",String(actions),`${attente} en attente de signature${retards?` · ${retards} à relancer`:""} · cabinet entier`)}</div>
    <div class="vues-barre">${VUES_PORTEFEUILLE.map(v=>`<button class="vue-onglet ${vueActive===v.cle?"on":""}" data-vue="${v.cle}" title="${esc(v.aide)}">${esc(v.nom)}${(()=>{const n=v.compte?v.compte():0;return n?`<span class="vue-compte">${n}</span>`:"";})()}</button>`).join("")}</div>
    ${chipsHTML}
    <div class="filterbar"><label><span>Statut</span><select data-filter="status"><option value="">Tous</option>${Object.entries(STATUTS).map(([k,v])=>`<option value="${k}" ${f.status===k?"selected":""}>${v[0]}</option>`).join("")}</select></label>
      <label><span>Type de mission</span><select data-filter="type"><option value="">Tous</option><option value="traditional" ${f.type==="traditional"?"selected":""}>Mission normale</option><option value="punctual" ${f.type==="punctual"?"selected":""}>Ponctuelle comptable</option><option value="legal" ${f.type==="legal"?"selected":""}>Ponctuelle juridique</option></select></label>
      <label><span>Modèle</span><select data-filter="model"><option value="">Tous</option>${st.modeles.map(m=>`<option value="${m.id}" ${f.model===m.id?"selected":""}>${esc(m.titre)}</option>`).join("")}</select></label>
      <label><span>Responsable</span><select data-filter="owner">${profileOptions(f.owner,true)}</select></label>

      <label><span>Année</span><select data-filter="year"><option value="">Toutes</option>${years.map(y=>`<option ${f.year===y?"selected":""}>${y}</option>`).join("")}</select></label>
      <label><span>Clients</span><select data-filter="archive"><option value="active" ${f.archive==="active"?"selected":""}>Actifs</option><option value="archived" ${f.archive==="archived"?"selected":""}>Archivés</option><option value="all" ${f.archive==="all"?"selected":""}>Tous</option></select></label>
      <div class="hint" style="margin-left:auto;padding-bottom:7px">${live.length} devis affiché(s)${classed.length?` · ${classed.length} classé(s) en bas de page`:""}</div></div>
    ${missionPanelHTML({key:"traditional",titre:"Missions normales",swatch:"traditional",cls:"traditional-card",
      rows:traditional,type:"traditional",force:!!q||f.type==="traditional"})}
    ${missionPanelHTML({key:"punctual",titre:"Ponctuelles comptables",swatch:"punctual",cls:"punctual-card",
      rows:punctualAccounting,type:"punctual",force:!!q||f.type==="punctual"})}
    ${missionPanelHTML({key:"legal",titre:"Ponctuelles juridiques",swatch:"legal",cls:"legal-card",
      rows:punctualLegal,type:"punctual",force:!!q||f.type==="legal"||f.type==="punctual"})}
    ${classed.length?`<details class="card mission-card classed-card" data-classed-panel ${classedOpen?"open":""}><summary class="hd"><span class="mission-title"><i class="mission-swatch classed"></i>Dossiers classés<span class="classed-hint">mis de côté</span></span><span>${classed.length} devis</span></summary>${dashboardRows(classed,"classed")}</details>`:""}
  </div>
  ${selected.length?`<div class="bulk-bar"><b>${selected.length} dossier(s) sélectionné(s)</b><select data-bulk-owner>${profileOptions("",true)}</select><button class="btn sm" data-act="bulkAssign">Affecter</button><button class="btn sm" data-act="bulkArchive">Archiver les clients</button><button class="btn sm" data-act="bulkExport">Exporter JSON</button><button class="btn ghost sm" data-act="bulkClear">Annuler la sélection</button></div>`:""}`;
};
const kpi=(t,v,s)=>`<div class="card kpi-card"><div class="bd">
  <div class="kpi-label">${t}</div>
  <div class="kpi-value">${v}</div>
  <div class="kpi-help">${s}</div></div></div>`;
function clientStats(c){ const ds=st.devis.filter(d=>d.clientId===c.id), active=ds.filter(d=>!["refuse","expire"].includes(workflowStatut(d))), rec=active.reduce((n,d)=>n+totaux(d,modOf(d)).recAn,0), pon=active.reduce((n,d)=>n+totaux(d,modOf(d)).pon,0), last=[...ds].sort((a,b)=>String(b.majAt||b.maj||b.cree||"").localeCompare(String(a.majAt||a.maj||a.cree||"")))[0]; return {ds,active,rec,pon,last}; }
VIEWS.clients=()=>{ const q=normClient(st.clientQ), f=st.portFilters?.archive||"active"; const arr=sortClientRows([...st.clients].filter(c=>(f==="all"?true:f==="archived"?c.archive:!c.archive)&&(!q||normClient(`${c.raison} ${c.siren} ${c.ville} ${c.contact} ${c.email}`).includes(q)))); return `<div class="top"><h1>Clients</h1><span class="sub">${arr.length} fiche(s)</span><span class="spacer"></span><input data-client-search type="text" placeholder="Rechercher un client…" value="${esc(st.clientQ)}" style="width:260px">${blankQuestionnaireMenuHTML()}<button class="btn sm density-toggle" data-act="uiDensity">${uiDensity()==="compact"?"Vue confortable":"Vue compacte"}</button><button class="btn p" data-nav="nouveau">Nouveau devis</button></div><div class="wrap"><div class="filterbar"><label><span>Afficher</span><select data-filter="archive"><option value="active" ${f==="active"?"selected":""}>Clients actifs</option><option value="archived" ${f==="archived"?"selected":""}>Clients archivés</option><option value="all" ${f==="all"?"selected":""}>Tous les clients</option></select></label></div><div class="card"><table class="client-table"><thead><tr><th><button class="sort-btn" data-client-sort="client">Client${st.clientSort.key==="client"?(st.clientSort.dir==="asc"?" ↑":" ↓"):""}</button></th><th>Contact</th><th class="r">Missions</th><th class="r"><button class="sort-btn" data-client-sort="rec">Récurrent HT/an${st.clientSort.key==="rec"?(st.clientSort.dir==="asc"?" ↑":" ↓"):""}</button></th><th>Dernier devis</th><th></th></tr></thead><tbody>${arr.map(c=>{const x=clientStats(c);return `<tr data-client-row="${c.id}" title="Cliquer pour ouvrir la fiche client"><td><span class="client-name">${esc(c.raison||"Sans nom")}</span>${c.archive?` <span class="tag gris">Archivé</span>`:""}<div class="dim">${esc(c.forme||"")} ${esc(c.siren||"")} · ${esc(c.ville||"")}</div></td><td>${esc(c.contact||"—")}<div class="dim">${esc(c.email||"")}</div></td><td class="r num">${x.active.length}</td><td class="r num money-strong">${x.rec?eur0(x.rec):"—"}</td><td>${x.last?`${esc(x.last.ref||"Brouillon")}<div class="dim">${dateFR(x.last.dateDevis||x.last.cree)}</div>`:"—"}</td><td class="r"><button class="btn sm" data-client-open="${c.id}">Ouvrir</button>${c.archive&&canRole("manager")?` <button class="btn sm danger" data-act="clientDeletePermanent" data-client="${c.id}">Supprimer définitivement</button>`:""}</td></tr>`;}).join("")||`<tr><td colspan="6"><div class="empty-state"><div class="empty-mark">＋</div><b>Aucun client à afficher</b><small>Créez un devis pour créer automatiquement la fiche client correspondante.</small><button class="btn p" data-nav="nouveau" style="margin-top:12px">Nouveau devis</button></div></td></tr>`}</tbody></table></div></div>`; };
/* ------------------------------------------------ fiche client : notes */
function clientNotesCardHTML(c){
  const notes=ensureClientInternals(c).notes;
  return `<div class="card" data-client-notes-card><div class="hd">Notes internes ${helpTip("Notes de travail partagées dans SERRE, communes à tous les devis du client et invisibles du client.")}<span class="spacer"></span><span class="tag gris">${notes.length}</span></div><div class="bd">
    <label class="f"><span>Nouvelle note</span><textarea data-client-note placeholder="Ex. Valider le forfait social avec le manager avant le prochain devis."></textarea></label>
    <div class="row"><button class="btn p sm" data-act="clientNoteAdd" data-client="${c.id}">Ajouter la note</button></div>
    <div style="margin-top:10px">${notes.length?notes.map((n,i)=>`<div class="internal-comment"><b>${esc(n.author||"Utilisateur")}</b><small>${dateTimeFR(n.at)}${n.origin?` · ${esc(n.origin)}`:""}</small><p>${esc(n.text||"")}</p>${canRole("manager")?`<button class="btn ghost sm" data-act="clientNoteDel" data-client="${c.id}" data-x="${i}">Supprimer</button>`:""}</div>`).join(""):`<div class="empty-state" style="padding:18px"><b>Aucune note interne</b><small>Les notes ajoutées ici restent strictement internes au cabinet.</small></div>`}</div>
  </div></div>`;
}
VIEWS.client1=()=>{
  const c=st.clients.find(x=>x.id===st.clientViewId);
  if(!c){ st.view="clients"; return VIEWS.clients(); }
  ensureClientInternals(c);
  const x=clientStats(c), pr=acceptationProgres(c), lab=labState(c), acc=acceptState(c), onglet=clientTab();
  const fields=[["raison","Dénomination"],["forme","Forme juridique"],["siren","SIREN / SIRET"],["adresse","Adresse"],["cp","Code postal"],["ville","Ville"],["contact","Contact"],["fonction","Qualité"],["email","Courriel"],["tel","Téléphone"]];
  const coordonnees=`<div class="card"><div class="hd">Coordonnées</div><div class="bd grid g2">${fields.map(([k,l])=>{const copy=["siren","email","tel"].includes(k);return `<label class="f"><span>${l}</span>${copy?`<div class="copy-field">`:""}<input type="${k==="email"?"email":"text"}" data-client-field="${k}" data-client-id="${c.id}" value="${esc(c[k]||"")}">${copy?`<button type="button" class="btn sm copy-btn" data-copy="${esc(c[k]||"")}" title="Copier ${esc(l.toLowerCase())}">Copier</button></div>`:""}</label>`;}).join("")}</div></div>`;
  const historique=`<div class="card"><div class="hd">Historique des devis</div><div class="bd">${x.ds.length?`<table><thead><tr><th>Date</th><th>Référence</th><th>Mission</th><th>Statut</th><th></th></tr></thead><tbody>${[...x.ds].sort((a,b)=>String(b.cree).localeCompare(String(a.cree))).map(d=>{const ws=workflowStatut(d);return `<tr data-history-open="${d.id}" title="Cliquer pour ouvrir le dossier"><td>${dateFR(d.dateDevis||d.cree)}</td><td class="mono">${esc(d.ref||"Brouillon")}</td><td>${intitulePersonnalise(d)?`<b>${esc(intituleDevis(d))}</b><div class="dim" style="font-size:11px">${esc(modOf(d)?.titre||"")}</div>`:esc(modOf(d)?.titre||"—")}</td><td><span class="tag status-tag ${STATUTS[ws]?.[1]||"gris"}">${STATUTS[ws]?.[0]||ws}</span></td><td class="r"><button class="btn sm" data-open="${d.id}">Ouvrir</button></td></tr>`;}).join("")}</tbody></table>`:`<div class="empty"><b>Aucun devis</b></div>`}</div></div>`;
  const corps=
    onglet==="accept" ? acceptQuestionnaireFormHTML(c) :
    onglet==="lab"    ? labQuestionnaireFormHTML(c) :
    `<div class="grid g2" style="align-items:start"><div>${coordonnees}${clientNotesCardHTML(c)}</div><div class="client-side">${historique}${clientAcceptationSummaryHTML(c)}${auditCard(c,"Historique de la fiche client")||""}</div></div>`;
  /* v50.1 : le fil d'Ariane de la v49 manquait ici. On pouvait aller du
     dossier vers la fiche client, jamais revenir sur ses pas. */
  const retour=st.devis.find(x=>x.id===st.id&&x.clientId===c.id);
  return `<div class="top"><div class="case-title-block">
    <div class="breadcrumb"><button type="button" data-nav="clients">Clients</button><span class="sep">›</span>${retour?`<button type="button" data-open="${retour.id}">${esc(intitulePersonnalise(retour)?intituleDevis(retour):(retour.ref||"Dossier en cours"))}</button><span class="sep">›</span>`:""}<span class="here">${esc(c.raison||"Fiche client")}</span></div>
    <h1>${esc(c.raison||"Fiche client")}</h1></div>${c.archive?`<span class="tag gris">Archivé</span>`:""}<span class="spacer"></span><button class="btn ghost" data-nav="clients">← Clients</button>${blankQuestionnaireMenuHTML()}<button class="btn p" data-act="devNewClient" data-client="${c.id}">Nouveau devis</button><button class="btn" data-act="clientArchive" data-client="${c.id}" data-to="${c.archive?0:1}">${c.archive?"Réactiver":"Archiver"}</button>${c.archive&&canRole("manager")?`<button class="btn danger" data-act="clientDeletePermanent" data-client="${c.id}">Supprimer définitivement</button>`:""}</div>
  <div class="wrap">
    <div class="client-kpis">${kpi("Missions actives",String(x.active.length),`${x.ds.length} devis au total`)}${kpi("Récurrent HT / an",x.rec?eur0(x.rec):"—","Missions actives")}${kpi("Ponctuel HT",x.pon?eur0(x.pon):"—","Prestations ponctuelles actives")}${kpi("Dossier d'acceptation",`${pr.pct} %`,acc.decision?`${esc(acc.decision.label)}${lab.synthese?` · risque ${esc(labRiskLabel(lab.synthese).toLowerCase())}`:""}`:"Décision d'acceptation à formaliser")}</div>
    ${clientTabsHTML(c)}
    ${corps}
  </div>`;
};

/* =====================================================================
   v53 — CHIFFRE D'AFFAIRES SIGNÉ
   ---------------------------------------------------------------------
   L'accueil additionnait le récurrent et le ponctuel de tous les dossiers
   « non refusés » : un devis en brouillon, jamais présenté au client,
   pesait donc autant qu'une mission signée. Le chiffre était faux au sens
   où il ne mesurait pas ce qu'il annonçait.

   Ici on ne retient qu'un dossier dont la case « Devis signé ou validé »
   est cochée — ou dont la signature électronique est revenue complète,
   ce qui est le même événement par une autre voie. Rien d'autre ne compte.

   Deux natures de chiffre, qui ne se lisent pas de la même façon :

   · le RÉCURRENT est un stock. Il répond à « que rapporte le portefeuille
     sur douze mois, en l'état ». Il ne se filtre donc pas par année : une
     mission signée en 2024 et toujours en cours produit encore du chiffre
     en 2026. Il n'existe pas de date de fin de mission dans l'application :
     seul l'archivage de la FICHE CLIENT fait sortir ses dossiers du calcul.
     Une mission arrêtée chez un client par ailleurs actif reste donc
     comptée — limite connue, à lever le jour où le dossier portera une
     date de fin.

   · le PONCTUEL est un flux. Il répond à « qu'a-t-on signé cette
     année ». Il se filtre par année de signature, et c'est le seul
     chiffre auquel le sélecteur d'année s'applique.
   ===================================================================== */
const CA_CATS_VISIBLES=["Comptabilité","Juridique","Social"];

/* Le fait générateur : la case « Devis signé ou validé », ou son
   équivalent électronique. `manualSignState` rend la coche monotone —
   un dossier classé ou dont la lettre est signée l'a forcément franchie. */
function caRetenu(d){
  if(!d || isArchivedDevis(d)) return false;
  if(["refuse","expire"].includes(workflowStatut(d))) return false;
  return !!(manualSignState(d.manualSign).quoteSigned || d.sign?.statut==="done");
}
function dateSignatureDe(d){
  const ms=manualSignState(d?.manualSign);
  return ms.quoteSignedDate || d?.sign?.signe || ms.acceptedDate || ms.sentDate || d?.sign?.envoye || d?.dateDevis || d?.cree || "";
}
const anneeDe = s => String(s||"").slice(0,4);

function anneesCA(){
  const a=new Set(st.devis.filter(caRetenu).map(d=>anneeDe(dateSignatureDe(d))).filter(x=>/^\d{4}$/.test(x)));
  a.add(String(new Date().getFullYear()));
  return [...a].sort().reverse();
}
function anneeCA(){
  const dispo=anneesCA();
  return dispo.includes(st.caAnnee)?st.caAnnee:(dispo[0]||String(new Date().getFullYear()));
}

/* Un seul parcours des dossiers signés : le tableau par catégorie et le
   détail dossier par dossier sortent du même calcul, ils ne peuvent donc
   pas diverger. */
function recapCA(annee){
  const cats=Object.fromEntries(HONOR_CATS.map(c=>[c,{recAn:0,pon:0}]));
  const lignes=[]; let nbSignes=0, nbAnnee=0, fraisTotal=0;
  for(const d of st.devis){
    if(!caRetenu(d)) continue;
    nbSignes++;
    const m=modOf(d), h=honorairesParCategorie(d,m).cats, dateSig=dateSignatureDe(d);
    const dansAnnee=anneeDe(dateSig)===annee;
    if(dansAnnee) nbAnnee++;
    let recD=0, ponD=0, ponBrut=0, fraisD=0, fraisIgnore=0;
    const catsD=Object.fromEntries(HONOR_CATS.map(c=>[c,{recAn:0,pon:0,ponBrut:0,frais:0}]));
    for(const c of HONOR_CATS){
      const brutRec=+h[c].recAn||0, brutPon=+h[c].pon||0, frais=caFraisCat(d,c);
      /* Le retraitement s'applique sur le brut de la catégorie, que le
         dossier entre ou non dans l'année retenue : le récurrent est un
         stock, il doit être net de frais quelle que soit l'année lue. */
      const net=imputerFrais(brutRec,brutPon,frais);
      cats[c].recAn+=net.recAn; recD+=net.recAn;
      catsD[c].recAn=net.recAn; catsD[c].ponBrut=net.pon; catsD[c].frais=frais;
      ponBrut+=net.pon; fraisD+=frais-net.ignore; fraisIgnore+=net.ignore;
      if(dansAnnee){ cats[c].pon+=net.pon; ponD+=net.pon; catsD[c].pon=net.pon; }
    }
    fraisTotal+=fraisD;
    lignes.push({d, dateSig, rec:recD, pon:ponD, ponBrut, frais:fraisD, fraisIgnore, cats:catsD, dansAnnee});
  }
  const totRec=HONOR_CATS.reduce((s,c)=>s+cats[c].recAn,0);
  const totPon=HONOR_CATS.reduce((s,c)=>s+cats[c].pon,0);
  lignes.sort((a,b)=>(b.rec+b.pon)-(a.rec+a.pon));
  return {cats, totRec, totPon, total:totRec+totPon, nbSignes, nbAnnee, fraisTotal, lignes, annee};
}

/* v53.1 — la même ventilation par catégorie, mais dossier par dossier.
   Le tableau du haut répond à « d'où vient le chiffre du cabinet » ; celui-ci
   répond à « d'où vient le chiffre de ce client-là », qui est la question
   que l'on se pose en préparant un rendez-vous. Le repli est fermé par
   défaut : quatorze dossiers dépliés feraient soixante lignes. */
/* =====================================================================
   v53.6 — FRAIS ET DÉBOURS INCLUS DANS D'ANCIENS DOSSIERS
   ---------------------------------------------------------------------
   Les dossiers signés avant la dissociation honoraires / débours portent
   des frais de greffe, d'annonces légales et de formalités à l'intérieur
   du prix de la prestation. Ils gonflent donc le chiffre d'affaires d'un
   montant qui n'a jamais été un produit du cabinet.

   Ces dossiers sont signés : leur devis, leur lettre et leur instantané
   sont figés et ne doivent pas bouger d'un octet. Le montant que le
   client a accepté reste celui qu'il a accepté.

   On ajoute donc un retraitement de GESTION, qui ne vit que dans l'onglet
   Chiffre d'affaires : une part de frais déclarée par catégorie, retirée
   du seul calcul du CA. Elle ne touche ni `prix`, ni `catPrix`, ni les
   documents, ni les totaux du dossier. Un dossier verrouillé l'accepte,
   puisqu'elle ne modifie aucun élément contractuel.

   Les débours correctement déclarés dans le modèle restent, eux, exclus
   en amont par le moteur de tarification : ce retraitement ne les
   concerne pas et ne fait pas double emploi avec eux.
   ===================================================================== */
const caFraisDe = d => (d && typeof d.caFrais==="object" && d.caFrais) ? d.caFrais : {};
const caFraisCat = (d,cat) => Math.max(0, +caFraisDe(d)[cat] || 0);
const caFraisTotal = d => HONOR_CATS.reduce((s,c)=>s+caFraisCat(d,c),0);

/* La déduction s'impute sur le ponctuel de la catégorie — un débours est
   par nature non récurrent. Si la catégorie n'a pas de ponctuel, elle
   s'impute sur le récurrent plutôt que d'être perdue. Dans les deux cas
   elle est plafonnée au montant disponible : un retraitement ne peut pas
   rendre un chiffre d'affaires négatif. */
function imputerFrais(recAn,pon,frais){
  if(!(frais>0)) return {recAn,pon,retirePon:0,retireRec:0,ignore:0};
  const retirePon=Math.min(frais,pon), reste=frais-retirePon;
  const retireRec=Math.min(reste,recAn);
  return {recAn:recAn-retireRec, pon:pon-retirePon, retirePon, retireRec, ignore:reste-retireRec};
}

/* v53.2 — un seul volet ouvert à la fois, et toute la barre est cliquable.
   Viser un chevron de 26 px pour lire une ventilation est un coût inutile ;
   et deux volets ouverts obligent à faire défiler pour comparer. Cliquer
   une barre ouvre la sienne et referme la précédente, comme un accordéon.
   Cet onglet ne renvoie pas au dossier : c'est un écran de lecture
   comptable, on y consulte des montants, on n'y modifie pas de devis. La
   barre n'a donc qu'un seul effet possible, et aucune cible à disputer. */
const caOuvert = () => String(st.caOuvert||"");
function ligneDetailCA(l,annee){
  const {d,dateSig,rec,pon,ponBrut,frais,fraisIgnore,cats,dansAnnee}=l;
  const ouvert=caOuvert()===d.id;
  const nonNul=HONOR_CATS.filter(c=>cats[c].recAn||cats[c].ponBrut);
  const vide=`<span class="dim">—</span>`;
  const principale=`<tr class="ca-ligne${ouvert?" ouverte":""}" data-ca-ligne="${d.id}" tabindex="0" role="button" aria-expanded="${ouvert}" title="${ouvert?"Replier":"Voir la ventilation par catégorie"}">
    <td class="ca-plier"><span class="ca-chevron" aria-hidden="true">${ouvert?"▾":"▸"}</span></td>
    <td><b>${esc(d.client?.raison||"Dossier sans nom")}</b>${intitulePersonnalise(d)?`<div class="dim">${esc(intituleDevis(d))}</div>`:""}</td>
    <td>${esc(d.ref||"—")}</td>
    <td>${dateSig?dateFR(dateSig):"—"}${dansAnnee?"":`<div class="dim">hors ${annee}</div>`}</td>
    <td class="r num">${rec?eur0(rec):vide}</td>
    <td class="r num">${pon?eur0(pon):vide}${frais?`<div class="ca-retrait" title="Frais et débours retirés du chiffre d'affaires sur ce dossier">− ${eur0(frais)} de frais</div>`:""}</td></tr>`;
  if(!ouvert) return principale;
  /* La colonne « dont frais et débours » est saisissable ici, y compris sur
     un dossier signé : elle ne modifie aucun document, seulement la lecture
     du chiffre d'affaires. */
  const champ=(c)=>`<input type="number" min="0" step="1" class="ca-frais-champ" data-ca-frais="${d.id}" data-cat="${esc(c)}" value="${cats[c].frais||""}" placeholder="0" title="Part de frais et débours incluse dans ce montant — retirée du chiffre d'affaires, sans toucher au devis">`;
  const corps = nonNul.length
    ? `<table class="ca-sous-table">
        <thead><tr><th>Catégorie</th><th class="r">Récurrent HT / an</th><th class="r">Ponctuel HT</th><th class="r">dont frais et débours</th></tr></thead>
        <tbody>${nonNul.map(c=>`<tr><td>${esc(c)}</td><td class="r num">${cats[c].recAn?eur0(cats[c].recAn):vide}</td><td class="r num">${cats[c].pon?eur0(cats[c].pon):vide}</td><td class="r">${champ(c)}</td></tr>`).join("")}</tbody>
        <tfoot><tr class="total"><td><b>Total</b></td><td class="r num"><b>${rec?eur0(rec):vide}</b></td><td class="r num"><b>${pon?eur0(pon):vide}</b></td><td class="r num">${frais?`<b>− ${eur0(frais)}</b>`:vide}</td></tr></tfoot>
       </table>
       <div class="hint" style="margin-top:7px">Montants nets du retraitement. Déclarez ici la part de frais de greffe, d'annonces légales ou de formalités comprise dans le prix : elle sort du chiffre d'affaires et ne modifie ni le devis, ni la lettre, ni le total du dossier.${fraisIgnore?` <b>${eur0(fraisIgnore)} n'ont pas pu être retirés</b> : le montant déclaré dépasse les honoraires de la catégorie.`:""}</div>`
    : `<div class="hint">Aucun honoraire ventilé sur ce dossier.</div>`;
  const note=(!dansAnnee&&ponBrut)?`<div class="hint" style="margin-top:7px">Ponctuel de ${esc(anneeDe(dateSig))} non compté dans le total ${annee} : ${eur0(ponBrut)}.</div>`:"";
  const sous=`<tr class="ca-sous"><td></td><td colspan="5">${corps}${note}</td></tr>`;
  return principale+sous;
}

VIEWS.ca=()=>{
  const annee=anneeCA(), r=recapCA(annee), annees=anneesCA();
  /* Les trois catégories demandées restent affichées même à zéro : une
     ligne vide se lit, une ligne absente laisse croire à un oubli. Les
     autres n'apparaissent que si elles portent un montant, afin qu'aucun
     euro ne sorte du tableau sans être vu. */
  const visibles=HONOR_CATS.filter(c=>CA_CATS_VISIBLES.includes(c)||r.cats[c].recAn||r.cats[c].pon);
  const cell=v=>v?eur0(v):`<span class="dim">—</span>`;
  const rang=(c)=>{const x=r.cats[c],t=x.recAn+x.pon;return `<tr><td>${esc(c)}</td><td class="r num money-strong">${cell(x.recAn)}</td><td class="r num money-strong">${cell(x.pon)}</td><td class="r num money-strong">${cell(t)}</td></tr>`;};

  return `<div class="top"><h1>Chiffre d'affaires</h1><span class="sub">Dossiers dont le devis est signé ou validé</span><span class="spacer"></span>
    <label class="ca-annee"><span>Ponctuel de l'année</span><select data-ca-annee>${annees.map(a=>`<option value="${a}" ${a===annee?"selected":""}>${a}</option>`).join("")}</select></label>
    <button class="btn" data-act="caExport">Exporter en CSV</button></div>
  <div class="wrap">
    <div class="kpi-grid">
      ${kpi("Récurrent HT / an",eur0(r.totRec),`Base installée · ${r.nbSignes} dossier(s) signé(s)`)}
      ${kpi(`Ponctuel HT · ${annee}`,eur0(r.totPon),`${r.nbAnnee} dossier(s) signé(s) en ${annee}`)}
      ${kpi("Total HT",eur0(r.total),`Récurrent annuel + ponctuel ${annee}`)}
      ${kpi("Dossiers signés",String(r.nbSignes),`Devis signés ou validés, hors archivés${r.fraisTotal?` · ${eur0(r.fraisTotal)} de frais retirés`:""}`)}
    </div>
    <div class="card">
      <div class="hd">Répartition par catégorie</div>
      <div class="bd">
        <table class="synthese-table ca-table">
          <thead><tr><th>Catégorie</th><th class="r">Récurrent HT / an</th><th class="r">Ponctuel HT · ${annee}</th><th class="r">Total HT</th></tr></thead>
          <tbody>${visibles.map(rang).join("")}</tbody>
          <tfoot><tr class="total"><td><b>Total</b></td><td class="r num money-strong"><b>${eur0(r.totRec)}</b></td><td class="r num money-strong"><b>${eur0(r.totPon)}</b></td><td class="r num money-strong"><b>${eur0(r.total)}</b></td></tr></tfoot>
        </table>
        <div class="hint" style="margin-top:11px">Le récurrent est une base installée : il couvre toutes les missions signées encore actives, quelle que soit leur année de signature. Une mission terminée n'en sort qu'en archivant la fiche client — l'archivage ne se fait pas mission par mission. Le ponctuel, lui, ne retient que ce qui a été signé en ${annee}. Montants hors taxes, débours exclus.${r.fraisTotal?` <b>${eur0(r.fraisTotal)}</b> de frais et débours ont été retirés au titre du retraitement déclaré dossier par dossier : les devis signés, eux, restent inchangés.`:""}</div>
      </div>
    </div>
    <details class="card ca-detail" ${st.caListeOuverte?"open":""} data-ca-liste><summary class="hd">Détail par dossier <span class="tag gris">${r.lignes.length}</span></summary><div class="bd">
      ${r.lignes.length?`<table class="mission-table ca-table ca-detail-table"><thead><tr><th></th><th>Client</th><th>Référence</th><th>Signé le</th><th class="r">Récurrent HT / an</th><th class="r">Ponctuel HT</th></tr></thead><tbody>
        ${r.lignes.map(l=>ligneDetailCA(l,annee)).join("")}
      </tbody></table>
      <div class="hint" style="margin-top:9px">Le ponctuel n'est compté que pour les dossiers signés en ${annee} ; les autres apparaissent ici pour leur récurrent, qui reste au portefeuille. Cliquez une ligne pour voir sa ventilation par catégorie.</div>`
      :`<div class="empty-state" style="padding:24px"><div class="empty-mark">—</div><b>Aucun dossier signé</b><small>Le chiffre d'affaires se remplit dès qu'un dossier porte la coche « Devis signé ou validé ».</small></div>`}
    </div></details>
  </div>`;
};
