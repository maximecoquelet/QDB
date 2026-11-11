/* ---------------------------------------------------------- un devis */
/* v39 : les onglets « Conditions et conformité » et « Suivi interne » ont été
   retirés. Les paramètres contractuels ont rejoint l'onglet des documents,
   et le dossier d'acceptation vit sur la fiche client. */
/* =====================================================================
   v52 — ORDRE DU PARCOURS
   ---------------------------------------------------------------------
   Le dossier se construit dans cet ordre : on identifie le client, on
   répond au questionnaire, on arrête les honoraires, on produit les
   documents, on suit la signature. Les honoraires précèdent désormais les
   documents : on ne met pas en page un devis dont le prix n'est pas
   arrêté. Les identifiants d'onglet sont inchangés, de sorte que le
   dernier onglet mémorisé par poste reste valable.
   Quatrième valeur : l'action que propose la barre du bas pour passer à
   l'étape suivante — « Vérifier les honoraires » dit ce qu'on va faire,
   « Bilan des honoraires → » ne disait que la destination.
   ===================================================================== */
const TABS=[
  ["client","Client","1","Remplir le questionnaire"],
  ["quest","Questionnaire","2","Vérifier les honoraires"],
  ["honoraires","Honoraires","3","Préparer les documents"],
  ["doc","Documents","4","Suivre la signature"],
  ["sign","Signature","5",""]
];
/* Pastille d'avancement sur chaque onglet : dire où l'on en est sans
   ouvrir l'onglet. Volontairement discrète — un compteur ou une coche,
   jamais une alerte. */
function etatOnglet(d,m,onglet){
  const pastille=(txt,cls)=>`<span class="tab-etat ${cls||""}">${txt}</span>`;
  try{
    if(onglet==="client"){
      const ok=String(d.client?.raison||"").trim() && emailOk(d.client?.email);
      return ok?pastille("✓","ok"):pastille("!","reste");
    }
    if(onglet==="quest"){
      const c=completudeQuestionnaire(d,m); if(!c.total) return "";
      return c.repondu>=c.total?pastille("✓","ok"):pastille(`${c.repondu}/${c.total}`,"reste");
    }
    if(onglet==="honoraires"){
      const t=totaux(d,m); return (t.ht>0)?pastille("✓","ok"):pastille("—","");
    }
    if(onglet==="doc"){
      const avecLm=hasLettreMission(d);
      return (d.ref&&(!avecLm||d.refLm))?pastille("✓","ok"):pastille("—","");
    }
    if(onglet==="sign"){
      const ms=manualSignState(d.manualSign), avecLm=hasLettreMission(d);
      const acc=parcoursAcceptation(d);
      const faits=(ms.sent?1:0)+(ms.quoteSigned?1:0)+(acc?((ms.accepted?1:0)+(labRempliPour(d)?1:0)):0)+(avecLm&&ms.lmSigned?1:0)+(ms.filed?1:0);
      const total=(avecLm?4:3)+(acc?2:0);
      return ms.filed?pastille("✓","ok"):faits?pastille(`${faits}/${total}`,"reste"):"";
    }
  }catch(_){}
  return "";
}
VIEWS.devis1 = () => {
  const d=curDev(); if(!d){ st.view="devis"; return VIEWS.devis(); }
  const m=modOf(d), tt=totaux(d,m), ws=workflowStatut(d);
  const corps = st.tab==="client"?tabClient(d):st.tab==="quest"?tabQuest(d,m):st.tab==="doc"?tabDoc(d,m):st.tab==="honoraires"?tabHonoraires(d,m):tabSign(d,m);
  const locked=isDevisLocked(d), lockClass=locked&&!['doc','sign'].includes(st.tab)?"devis-locked":"";
  const avecLedger = !["doc","honoraires"].includes(st.tab);
  const dossierAmount=tt.recAn>0?`${eur0(tt.recAn)} HT / an`:(tt.pon>0?`${eur0(tt.pon)} HT`:"—");
  const secondaryAmount=tt.recAn>0&&tt.pon>0?`${eur0(tt.pon)} ponctuel`:"";
  /* v49 : fil d'Ariane, intitulé du dossier et déplacement de dossier en
     dossier. On arrivait ici sans savoir d'où l'on venait, et l'unique
     sortie renvoyait au portefeuille — jamais à la fiche client. */
  const master=clientMasterOf(d), voisins=dossiersVoisins(d), ongletCourant=TABS.find(x=>x[0]===st.tab);
  /* v52 : l'en-tête ne porte plus que ce qui identifie le dossier — client,
     mission, statut, montant — et son état d'enregistrement. Aperçu reste
     l'action principale ; dupliquer, archiver et supprimer, qui ne servent
     qu'exceptionnellement, passent dans un menu. Le retour au portefeuille
     est assuré par le fil d'Ariane, le bouton faisait doublon. */
  return `
  <div class="top top-dossier">
    <div class="case-head"><div class="case-title-block">
      <div class="breadcrumb">
        <button type="button" data-nav="devis">Portefeuille</button><span class="sep">›</span>
        ${master?`<button type="button" data-jump-client="${master.id}" data-jump-client-tab="identite">${esc(d.client.raison||"Client")}</button>`:`<span>${esc(d.client.raison||"Client à renseigner")}</span>`}<span class="sep">›</span>
        <span class="here">${esc(ongletCourant?.[1]||"Dossier")}</span>
      </div>
      <h1>${esc(d.client.raison||"Nouveau devis")}</h1>
      <div class="case-meta">${intitulePersonnalise(d)?`<span class="case-intitule">${esc(intituleDevis(d))}</span><span class="sep-dot">${esc(m?.titre||"")}</span>`:`<span>${esc(m?.titre||"Mission à choisir")}</span>`}<span class="sep-dot mono">${esc(d.ref||"réf. à générer")}</span>${numeroVersion(d)>1?`<span class="sep-dot">version ${numeroVersion(d)}</span>`:""}</div>
    </div>
    <span class="tag status-tag ${STATUTS[ws]?.[1]||"gris"}">${STATUTS[ws]?.[0]||esc(ws)}</span>
    <div class="case-total"><b>${dossierAmount}</b><span>${secondaryAmount||"Honoraires du dossier"}</span></div></div>
    ${saveIndicatorHTML()}
    ${voisins.total>1?`<span class="sibling-nav">
      <button class="btn sm" ${voisins.prev?`data-sibling="${voisins.prev}"`:"disabled"} title="Dossier précédent du portefeuille (Alt + ↑)" aria-label="Dossier précédent">↑</button>
      <span class="position">${voisins.index+1} / ${voisins.total}</span>
      <button class="btn sm" ${voisins.next?`data-sibling="${voisins.next}"`:"disabled"} title="Dossier suivant du portefeuille (Alt + ↓)" aria-label="Dossier suivant">↓</button></span>`:""}
    <button class="btn p" data-act="previewQuote">Aperçu</button>
    <details class="row-menu menu-entete"><summary class="btn" title="Autres actions">Autres actions</summary><div class="menu-pop">
      <button data-act="devDup">Dupliquer le dossier</button>
      ${master?`<button data-act="clientArchive" data-client="${master.id}" data-to="${master.archive?0:1}">${master.archive?"Réactiver le client":"Archiver le client"}</button>`:""}
      <button data-act="print">Imprimer le document affiché</button>
      ${canRole("admin")?`<button data-act="comparePdf" title="Diagnostic : compare l'aperçu à l'écran et le PDF rendu par le serveur">Diagnostic — comparer aperçu et PDF</button>`:""}
      <button class="danger" data-act="devDel">Mettre le dossier à la corbeille</button>
    </div></details></div>
  <div class="wrap has-context-bar">
    ${lockedBannerHTML(d)}
    <div class="tabs sticky-tabs">${TABS.map(([t,l,n])=>`<button data-tab="${t}" class="${st.tab===t?"on":""}" title="${esc(l)} — touche ${n}"><i class="n">${n}</i>${l}${etatOnglet(d,m,t)}</button>`).join("")}</div>
    <div class="${lockClass}">${avecLedger?`<div class="grid" style="grid-template-columns:1fr 312px;align-items:start">
      <div>${corps}</div>
      <div><div id="ledger">${ledger(d)}</div><div id="warn" style="margin-top:13px">${warn(d)}</div>${auditCard(d)}</div></div>`:corps}</div>
    ${contextBarHTML(d)}
  </div>`;
};
const inp=(o,path,label,opt={})=>{
  const v=path.split(".").reduce((x,k)=>x?.[k],o)??"";
  return `<label class="f"><span>${label}</span><input type="${opt.type||"text"}" data-d="${path}" ${opt.re?'data-re="1"':""}
    value="${esc(v)}" placeholder="${esc(opt.ph||"")}" class="${opt.err?"err":""}">
    ${opt.hint?`<div class="hint">${opt.hint}</div>`:""}</label>`;
};
const inpCopy=(o,path,label,opt={})=>{
  const v=path.split(".").reduce((x,k)=>x?.[k],o)??"";
  return `<label class="f"><span>${label}</span><div class="copy-field"><input type="${opt.type||"text"}" data-d="${path}" ${opt.re?'data-re="1"':""}
    value="${esc(v)}" placeholder="${esc(opt.ph||"")}" class="${opt.err?"err":""}"><button type="button" class="btn sm copy-btn" data-copy="${esc(v)}" title="Copier ${esc(label.toLowerCase())}">Copier</button></div>
    ${opt.hint?`<div class="hint">${opt.hint}</div>`:""}</label>`;
};
const selD=(o,path,label,opts,opt={})=>{
  const v=path.split(".").reduce((x,k)=>x?.[k],o)??"";
  return `<label class="f"><span>${label}</span><select data-d="${path}" data-re="1">
    ${opts.map(x=>{const[a,b]=Array.isArray(x)?x:[x,x];return `<option value="${esc(a)}" ${String(v)===String(a)?"selected":""}>${esc(b)}</option>`;}).join("")}
  </select>${opt.hint?`<div class="hint">${opt.hint}</div>`:""}</label>`;
};
/* =====================================================================
   v52 — CE QUI APPARTIENT AU CLIENT, CE QUI APPARTIENT À LA MISSION
   ---------------------------------------------------------------------
   L'onglet mêlait sans le dire deux natures de données : la dénomination,
   le siège et le représentant légal sont communs à toutes les missions du
   client et se propagent à ses autres dossiers non verrouillés ; les
   dates, le modèle et les marqueurs ne concernent que ce dossier. Chaque
   bloc porte désormais sa portée, et l'historique détaillé est replié pour
   rapprocher les champs utiles du haut de page. Le mécanisme de
   synchronisation existant est inchangé.
   ===================================================================== */
function portee(txt,cls){ return `<span class="portee ${cls||""}" title="${esc(txt)}">${esc(txt)}</span>`; }
function tabClient(d){
  const pub=st.modeles.filter(m=>m.statut==="publie"||m.id===d.modeleId);
  const master=clientMasterOf(d), hist=clientHistory(d);
  const rs=rneStateFor(d);
  const q=normClient(st.clientPickQ||"");
  const correspondants=q?[...st.clients].filter(c=>normClient(`${c.raison} ${c.siren} ${c.ville}`).includes(q)).slice(0,8):[];
  const autresDossiers=master?st.devis.filter(x=>x.clientId===master.id&&x.id!==d.id&&!isDevisLocked(x)).length:0;
  return `
  <div class="card" style="margin-bottom:13px"><div class="hd">Cette mission ${portee("propre à ce dossier","dossier")}</div><div class="bd">
    <div class="grid g2">
      ${selD(d,"modeleId","Modèle de devis",pub.map(m=>[m.id,m.titre+(m.statut==="publie"?"":" (brouillon)")]))}
      ${inp(d,"debut","Date de début de la mission",{type:"date",re:1,hint:hasLettreMission(d)?"Date contractuelle reprise dans la lettre de mission.":"Date prévue de prise d’effet de la prestation."})}
      ${inp(d,"dateDebutDossier","Ouverture interne du dossier",{type:"date",re:1,hint:"Date utilisée par le personnel administratif."})}
      <label class="f"><span>Créé le</span><input type="text" value="${dateFR(d.cree)}" disabled><div class="hint">Création du devis dans l'application.</div></label>
    </div>
    <div class="hint" style="margin-top:4px">${esc((modOf(d)||{}).desc||"")}${(modOf(d)||{}).per?` — périodicité : ${esc((modOf(d)||{}).per)}`:""}</div>
    <div style="margin-top:13px"><div class="sous-titre">Marqueurs du dossier</div>${markerPickerHTML(dossierMarkers(d,modOf(d)),"devisMarkerToggle")}<div class="hint">Classement interne du portefeuille. Plusieurs marqueurs possibles.</div></div>
  </div></div>

  <div class="card" style="margin-bottom:13px"><div class="hd">Client ${portee(master?"commun à ses dossiers":"non rattaché","client")}<span class="spacer"></span>${master?`<span class="hint">${autresDossiers?`${autresDossiers} autre(s) dossier(s) modifiable(s) seront mis à jour`:"aucun autre dossier modifiable"}</span>`:""}</div><div class="bd">
    <div class="grid" style="grid-template-columns:minmax(240px,1fr) minmax(240px,1fr);gap:11px;align-items:start">
      <label class="f"><span>Rechercher un client déjà enregistré</span>
        <input type="text" data-client-filtre value="${esc(st.clientPickQ||"")}" placeholder="Nom, SIREN ou ville…" autocomplete="off">
        <div class="hint">${master?`Rattaché à <b>${esc(master.raison||"une fiche")}</b>.`:"Aucune fiche rattachée : les coordonnées ci-dessous restent propres à ce devis."}</div></label>
      <label class="f"><span>Préremplissage RNE / INPI</span>
        <div class="copy-field"><input type="text" data-rne-query value="${esc(rs.query)}" placeholder="Ex. 824821490 ou SOCIATAX"><button class="btn" data-act="rneSearch" ${rs.loading?"disabled":""}>${rs.loading?"Import…":"Importer"}</button></div>
        <div class="hint">Identité, siège, forme et représentant légal repris du registre national.</div></label>
    </div>
    ${q?`<div class="create-results" style="margin-top:9px">${correspondants.length?correspondants.map(c=>`<div class="create-result"><div class="grow"><b>${esc(c.raison||"Sans nom")}</b><div class="hint">${esc(c.forme||"")} ${esc(c.siren||"")} · ${esc(c.ville||"")}${c.archive?" · archivé":""}</div></div><button class="btn sm ${d.clientId===c.id?"":"p"}" data-act="clientPick" data-id="${c.id}" ${d.clientId===c.id?"disabled":""}>${d.clientId===c.id?"Déjà rattaché":"Rattacher"}</button></div>`).join(""):`<div class="hint">Aucune fiche ne correspond. Saisissez librement les coordonnées ci-dessous : la fiche sera créée.</div>`}</div>`:""}
    ${rnePreviewHTML(d)}
    <div class="row" style="margin-top:10px;gap:8px">${master?`<button class="btn sm" data-act="clientArchive" data-client="${master.id}" data-to="${master.archive?0:1}">${master.archive?"Réactiver la fiche":"Archiver la fiche"}</button><button class="btn sm ghost" data-act="clientDetacher">Détacher ce dossier de la fiche</button><button class="btn sm ghost" data-jump-client="${master.id}" data-jump-client-tab="identite">Ouvrir la fiche client</button>`:`<span class="hint">La fiche sera créée dès que la dénomination sera renseignée.</span>`}</div>
  </div></div>

  <div class="card" style="margin-bottom:13px"><div class="hd">Identification ${portee("commun à ses dossiers","client")}</div><div class="bd grid g2">
    ${inp(d,"client.raison","Dénomination sociale",{re:1,ph:"SAS Martin & Fils"})}
    ${inp(d,"client.forme","Forme juridique")}
    ${inpCopy(d,"client.siren","SIREN / SIRET",{err:d.client.siren&&!sirenOk(d.client.siren),
      hint:d.client.siren&&!sirenOk(d.client.siren)?"Clé de contrôle invalide.":"Vérifiable sur annuaire-entreprises.data.gouv.fr"})}
    ${inp(d,"client.adresse","Adresse du siège")}
    ${inp(d,"client.cp","Code postal")}${inp(d,"client.ville","Ville")}
    <div style="grid-column:1/-1">${rneImportedInfoHTML(d)}</div>
  </div></div>

  <div class="card" style="margin-bottom:13px"><div class="hd">Signataire ${portee("commun à ses dossiers","client")}</div><div class="bd grid g2">
    ${selD(d,"client.civilite","Civilité",[["Madame, Monsieur","Madame, Monsieur"],["Madame","Madame"],["Monsieur","Monsieur"]])}
    ${inp(d,"client.contact","Nom et prénom")}
    ${inp(d,"client.fonction","Qualité",{hint:"Proposée d'après le RNE et la forme sociale ; reste modifiable."})}
    ${inpCopy(d,"client.email","Courriel",{type:"email",err:d.client.email&&!emailOk(d.client.email),hint:"Adresse utilisée pour la signature électronique."})}
    ${inpCopy(d,"client.tel","Téléphone mobile",{ph:"+33 6 12 34 56 78"})}
  </div></div>

  ${master&&hist.length?`<details class="card"><summary class="hd"><span class="q-title">Historique des devis du client</span><span class="spacer"></span><span class="tag gris">${hist.length}</span></summary><div class="bd">
    <table><thead><tr><th>Date</th><th>Référence</th><th>Mission</th><th>Statut</th><th></th></tr></thead><tbody>${hist.map(x=>{const ws=workflowStatut(x);return `<tr ${x.id===d.id?"":`data-history-open="${x.id}" title="Cliquer pour ouvrir ce dossier"`}><td>${dateFR(x.cree)}</td><td class="mono">${esc(x.ref||"Brouillon")}</td><td>${intitulePersonnalise(x)?`<b>${esc(intituleDevis(x))}</b><div class="dim" style="font-size:11px">${esc((modOf(x)||{}).titre||"")}</div>`:esc((modOf(x)||{}).titre||"—")}</td><td><span class="tag status-tag ${STATUTS[ws]?.[1]||"gris"}">${STATUTS[ws]?.[0]||esc(ws)}</span></td><td class="r">${x.id===d.id?"<span class='dim'>Devis ouvert</span>":`<button class="btn sm" data-open="${x.id}">Ouvrir</button>`}</td></tr>`;}).join("")}</tbody></table>
  </div></details>`:""}`;
}

function categoryPricingEditorHTML(d,m){
  const h=honorairesParCategorie(d,m), names={"Comptabilité":"Comptabilité","Social":"Social","Juridique":"Juridique","Gestion":"Gestion"};
  const cats=HONOR_CATS.filter(cat=>h.cats[cat].baseRecAn>0||h.cats[cat].basePon>0), canAdjust=canRole("manager"), seuil=+st.cab.ecartMax||0;
  if(!cats.length) return "";
  const field=(cat,c,kind,label,base,value,adjusted)=>{ const {delta,pct}=commercialDelta(base,value), hors=pct!==null&&Math.abs(pct)>seuil, key=commercialReasonKey(kind), motif=String(d.catPrix?.[cat]?.[key]||"");
    const deltaTxt=`${delta>=0?"+":""}${eur(delta)}${pct===null?"":` (${pct>=0?"+":""}${pct.toFixed(1).replace(".",",")} %)`}`;
    return `<label class="f" style="margin-top:7px"><span>${label}</span><input type="number" step="0.01" min="0" data-act="catPrix" data-cat="${esc(cat)}" data-kind="${kind}" value="${esc(Math.round(value*100)/100)}" ${canAdjust&&!isDevisLocked(d)?"":"disabled"}><div class="hint">Calcul interne : ${eur(base)}${adjusted?" · montant commercial ajusté":""}</div></label>
      <div class="pricing-delta ${hors?"bad":adjusted?"warn":"good"}">Écart commercial : ${deltaTxt}</div>
      <div class="motif-slot">${hors?`<label class="f" style="margin-top:6px"><span>Motif de l'écart > ${nb(seuil)} %</span><input type="text" data-act="catPrixMotif" data-cat="${esc(cat)}" data-kind="${kind}" value="${esc(motif)}" placeholder="Remise commerciale, complexité, volume, concurrence…" ${canAdjust&&!isDevisLocked(d)?"":"disabled"}>${motif?"":`<div class="hint" style="color:var(--rouge)">Motif à renseigner pour la traçabilité interne.</div>`}</label>`:""}</div>`; };
  return `<div class="card" style="margin-bottom:14px"><div class="hd">Montants commerciaux par domaine ${helpTip("Le montant commercial remplace le total calculé pour le domaine. Un motif est demandé lorsque l'écart dépasse le seuil défini par le cabinet.")}</div><div class="bd">
    <div class="hint" style="margin:0 0 10px">Le calcul interne reste distinct du montant présenté au client. ${canAdjust?`Vous pouvez ajuster le montant global par domaine ; au-delà de ${nb(seuil)} % d'écart, un motif interne est demandé.`:"Les ajustements sont réservés à un manager / associé."}</div>
    <div class="honor-grid">${cats.map(cat=>{const c=h.cats[cat],adj=c.adjustedRec||c.adjustedPon;return `<div class="honor-card">
      <div class="name" style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span>${esc(names[cat])}</span>${adj&&canAdjust&&!isDevisLocked(d)?`<button class="btn sm" data-act="catPrixReset" data-cat="${esc(cat)}">Reprendre le calcul</button>`:""}</div>
      ${c.baseRecAn>0?field(cat,c,"recAn","Honoraires annuels HT",c.baseRecAn,c.recAn,c.adjustedRec):""}
      ${c.basePon>0?field(cat,c,"pon","Honoraires ponctuels HT",c.basePon,c.pon,c.adjustedPon):""}
    </div>`;}).join("")}</div>
  </div></div>`;
}

