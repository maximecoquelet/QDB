/* -------------------------------------------------------- documents */
function openQuotePreview(){ const d=curDev(),m=d&&modOf(d); if(!d||!m) return; document.querySelectorAll(".preview-modal").forEach(x=>x.remove()); const modal=document.createElement("div"); modal.className="modal preview-modal"; modal.innerHTML=`<div class="box"><div class="preview-head"><b>Aperçu du devis</b><span class="spacer"></span><button class="btn" data-preview-print>Imprimer</button><button class="btn" data-preview-close>Fermer</button></div><div class="preview-body">${devisHTML(d,m)}</div></div>`; document.body.appendChild(modal); modal.querySelector("[data-preview-close]").onclick=()=>modal.remove(); modal.onclick=e=>{if(e.target===modal) modal.remove();}; modal.querySelector("[data-preview-print]").onclick=()=>{ modal.remove(); st.docType="devis"; ACTS.print(); }; }
/* v39 : paramètres contractuels du devis et de la lettre de mission.
   Ils vivaient dans l'onglet « Conditions et conformité », supprimé : ils
   sont désormais au-dessus de l'aperçu, dans un panneau dépliable. */
function docParamsHTML(d){
  const avecLm=hasLettreMission(d);
  const nature=natureOf(d);
  /* v47 : la lettre rattachée peut restreindre les natures proposées.
     Une trame ponctuelle (NP 3400, évaluation, situation) n'offre pas les
     natures comptables, qui produiraient un contrat incohérent. */
  const L=lettreOf(d);
  const natureOpts=NATURE_OPTIONS.filter(([k])=>letterNatures(L).includes(k));
  const natureFige=natureOpts.length<=1;
  const natureKey=natureKeyOf(d);
  const ponctuel=avecLm&&estNaturePonctuelle(natureKey);
  return `${avecLm?`<div class="card" style="margin-bottom:13px"><div class="hd">Cadre contractuel et normatif</div><div class="bd">
    <div class="grid g2">
      ${natureFige
        ? `<label class="f"><span>Nature de la mission</span><input type="text" value="${esc(nature.t)}" disabled><div class="hint">Déterminée par la lettre de mission rattachée au type de mission retenu au questionnaire.</div></label>`
        : selD(d,"nature","Nature de la mission",natureOpts)}
      ${inp(d,"referentiel","Référentiel comptable",{ph:REFERENTIEL_DEFAULT,hint:"Requis pour les missions NP 2300 et NP 2400 ; à adapter si le client relève d'un référentiel particulier."})}
      ${selD(d,"rgpdMode","Qualification RGPD",RGPD_MODES,{hint:"La qualification doit correspondre à la réalité des traitements. Le mode mixte distingue les traitements sur instructions du client des obligations propres du cabinet."})}
      <label class="f"><span>Référence normative</span><input type="text" value="${esc(nature.norme)}" disabled><div class="hint">Référentiel normatif OEC — édition août 2025.</div></label>
    </div>
    <div class="notice vert" style="margin-top:12px"><b>Rédaction dynamique</b><br>Le préambule, les limites de mission, le livrable et le tableau d'obligations s'adaptent automatiquement à la nature de mission retenue.</div>
    ${natureKey==="NP2400"?`<div class="notice" style="margin-top:10px"><b>Point de vigilance</b><br>Le choix NP 2400 adapte le contrat mais ne crée pas automatiquement des diligences ou un tarif d'examen limité dans le modèle de devis. Vérifiez que le périmètre et le prix retenus correspondent bien à cette mission.</div>`:""}
    ${["TENUE","EVAL","SITUATION"].includes(natureKey)?`<div class="notice" style="margin-top:10px"><b>Mission sans assurance</b><br>Vérifiez qu'aucune prestation retenue au devis ne promet une présentation des comptes, un examen limité ou une attestation d'assurance.</div>`:""}
    ${natureKey==="NP3400"?`<div class="notice" style="margin-top:10px"><b>Mission d'assurance de niveau modéré</b><br>La NP 3400 aboutit à une conclusion exprimée sous forme négative sur le caractère raisonnable des hypothèses, leur traduction chiffrée et les principes comptables retenus. Les hypothèses elles-mêmes relèvent de la responsabilité du client : elles doivent être documentées avant le démarrage des travaux.</div>`:""}
    ${ponctuel?`<div class="notice" style="margin-top:10px"><b>Rédaction pilotée par le questionnaire</b><br>Les zones à compléter de la trame OEC (période, destinataires, planning, documents attendus, honoraires, obligations d'identification) et ses options de rédaction sont renseignées dans la section « Lettre de mission » de l'onglet <b>Questionnaire et prix</b>.</div>`:""}
  </div></div>`:""}
  <div class="card" style="margin-bottom:13px"><div class="hd">${avecLm?(ponctuel?"Validité de la proposition":"Durée et validité"):"Paramètres du devis"} ${helpTip("Ces paramètres alimentent le devis et, lorsqu'une lettre est rattachée, les clauses contractuelles correspondantes.")}</div><div class="bd grid g2">${inp(d,"dateDevis","Date du devis",{type:"date"})}${inp(d,"validite","Validité (jours)",{type:"number"})}${avecLm?inp(d,"dateLm","Date de la lettre de mission",{type:"date",hint:`Laissez vide pour reprendre la date du devis. ${isDevisLocked(d)?"<b>Ce champ reste modifiable après l'envoi</b> : la lettre est signée à une date que l'on ne connaît pas au moment du devis.":"La lettre est souvent signée plus tard que le devis."}`}):""}${avecLm&&!ponctuel?`${inp(d,"debut","Premier exercice couvert — début",{type:"date"})}${inp(d,"duree","Durée initiale (mois)",{type:"number"})}${inp(d,"preavis","Préavis de résiliation (mois)",{type:"number"})}<label class="chk"><input type="checkbox" data-d="tacite" ${d.tacite?"checked":""}><span><b>Tacite reconduction annuelle</b></span></label>`:""}</div>${ponctuel?`<div class="bd"><div class="hint">Mission ponctuelle : ni durée d'exercice, ni préavis, ni tacite reconduction. Le délai de réalisation et le terme de la mission se renseignent au questionnaire.</div></div>`:""}</div>
  ${conditionsFinancieresDossierHTML(d)}
  ${avecLm?`<div class="card" style="margin-bottom:13px"><div class="hd">Politique documentaire optionnelle</div><div class="bd">
    <label class="chk"><input type="checkbox" data-d="justifSeuilEnabled" data-re="1" ${d.justifSeuilEnabled?"checked":""}><span><b>Insérer une clause relative aux petits justificatifs manquants</b><div class="hint">Option contractuelle du cabinet — elle n'est pas une exigence de la NP 2300/2400.</div></span></label>
    ${d.justifSeuilEnabled?`<div style="max-width:330px;margin-top:8px">${inp(d,"justifSeuil","Seuil TTC (€)",{type:"number",hint:"À valider au regard de la politique interne du cabinet et du dossier."})}</div>`:""}
  </div></div>`:""}
  `;
}
/* v53.14 — dérogation du dossier au cadre « Conditions financières ».
   Tant que la case est décochée, le devis suit le modèle du cabinet et
   bénéficie de ses mises à jour. La cocher fige une copie propre au
   dossier : c’est voulu, une dérogation ne doit pas bouger toute seule. */
/* Aperçu tel que le client le lira : variables substituées avec les
   réponses du dossier, et non le modèle brut. */
function devisConditionsFinancieresApercuHTML(d){
  const m=modOf(d); if(!m) return "";
  return devisConditionsFinancieresHTML(d,LMVARS(d,m))
    .replace(/^[\s\S]*?<div class="terms-card">/,'<div class="terms-card">')
    .replace(/<\/section>\s*$/,"");
}
function conditionsFinancieresDossierHTML(d){
  const deroge=dossierDerogeConditions(d);
  const apercu=conditionsFinancieresLignes(d);
  return `<div class="card" style="margin-bottom:13px"><div class="hd">Conditions financières du devis</div><div class="bd">
    <label class="chk"><input type="checkbox" data-act="cfDeroger" ${deroge?"checked":""}><span><b>Écrire des conditions propres à ce dossier</b>
      <div class="hint">Décochée, la case laisse le devis suivre le modèle du cabinet (Administration › Identité du cabinet).</div></span></label>
    ${deroge
      ? `<label class="f" style="margin-top:9px"><span>Conditions de ce dossier</span>
          <textarea data-d="conditionsFi" data-re="1" rows="4">${esc(d.conditionsFi||"")}</textarea>
          ${typeof conditionsFinancieresAideHTML==="function"?conditionsFinancieresAideHTML():""}</label>`
      : (apercu.length
          ? `<div style="margin-top:9px">${devisConditionsFinancieresApercuHTML(d)}</div>`
          : `<div class="hint" style="margin-top:9px">Modèle vide : la section « Conditions financières » ne figurera pas sur le devis.</div>`)}
  </div></div>`;
}
function docParamsPanelHTML(d){
  const corps=docParamsHTML(d).trim();
  if(!corps) return "";
  return `<details class="card doc-params-card" data-doc-params ${st.docParamsOpen?"open":""}>
    <summary class="hd"><span class="q-title">Paramètres du devis et de la lettre de mission</span><span class="spacer"></span><span class="dim" style="font-size:11.5px">${esc(natureOf(d)?.t||"")} · validité ${nb(d.validite)} j${hasLettreMission(d)?` · ${nb(d.duree)} mois`:""}</span></summary>
    <div class="bd">${corps}</div></details>`;
}

/* =====================================================================
   v49 — Versions transmises au client
   ---------------------------------------------------------------------
   Chaque envoi et chaque signature laisse un instantané. Ce bloc les
   restitue : c'est lui qui rend la reprise en main acceptable, puisque
   rien de ce qui a circulé chez le client n'est perdu.
   ===================================================================== */
/* v49 : intitulé libre des deux documents. Il figure en tête de l'onglet,
   et non dans le panneau replié des paramètres : c'est la première chose
   que l'on règle en ouvrant un devis, pas un réglage avancé. Le champ
   reste modifiable après verrouillage — nommer une pièce n'en change pas
   le contenu. */
function intitulesCardHTML(d){
  const avecLm=hasLettreMission(d), suggestion=intituleSuggere(d);
  return `<div class="card" style="margin-bottom:13px"><div class="hd">Intitulé des documents ${helpTip("Titre affiché en tête du document et repris dans le nom du fichier PDF. Laissé vide, le libellé d'origine s'applique : « Devis » et « Lettre de mission ».")}</div><div class="bd grid g2">
    ${inp(d,"intitule","Intitulé du devis",{ph:suggestion,hint:`Remplace « Devis » en tête du document et nomme le fichier PDF. Proposition : ${esc(suggestion)}`})}
    ${avecLm?inp(d,"intituleLm","Intitulé de la lettre de mission",{ph:"Lettre de mission",hint:"Laissez vide pour conserver « Lettre de mission »."}):""}
  </div></div>`;
}

const VERSION_LIBELLE={envoi:"Transmis au client",signature:"Signé"};
function versionsCardHTML(d){
  const vs=versionsTransmises(d);
  if(!vs.length) return "";
  const ligne=v=>{
    const dispo=!!v.docs, lm=!!(v.docs&&v.docs.lm);
    return `<div class="version-row">
      <div class="version-id"><b>Version ${esc(v.n)}</b><span class="tag ${v.type==="signature"?"vert":"gris"}">${esc(VERSION_LIBELLE[v.type]||v.type)}</span></div>
      <div class="version-meta">${esc(dateTimeFR(v.at))} · ${esc(v.by||"Utilisateur")}${v.ref?` · <span class="mono">${esc(v.ref)}</span>`:""}
        ${v.intitule&&v.intitule!=="Devis"?`<div class="dim">${esc(v.intitule)}</div>`:""}
        ${v.motifReouverture?`<div class="version-motif"><b>Rouverte</b> — ${esc(v.motifReouverture)}</div>`:""}</div>
      <div class="version-actions">${dispo
        ? `<button class="btn sm" data-act="versionOuvrir" data-n="${esc(v.n)}" data-type="${esc(v.type)}" data-doc="devis">Devis</button>${lm?`<button class="btn sm" data-act="versionOuvrir" data-n="${esc(v.n)}" data-type="${esc(v.type)}" data-doc="lm">Lettre</button>`:""}`
        : `<span class="hint">Document élagué — seule la trace subsiste</span>`}</div>
    </div>`;
  };
  return `<details class="card versions-card" ${st.versionsOpen?"open":""} data-versions-card>
    <summary class="hd"><span class="q-title">Versions transmises au client</span><span class="spacer"></span><span class="tag gris">${vs.length}</span></summary>
    <div class="bd">
      <div class="hint" style="margin-bottom:10px">Chaque envoi et chaque signature conserve le document tel qu'il a été produit. Ces instantanés ne sont jamais modifiés, y compris après une reprise en main.</div>
      ${vs.map(ligne).join("")}
    </div></details>`;
}
/* Le meme contenu, sans la carte : utilise par le tiroir de l'onglet Documents. */
function versionsCorpsHTML(d){
  const html=versionsCardHTML(d);
  if(!html) return "";
  const i=html.indexOf('<div class="bd">'), j=html.lastIndexOf("</div></details>");
  return i<0||j<0 ? html : html.slice(i+16,j);
}
/* =====================================================================
   v52 — Les ajustements commerciaux n'ont plus qu'un seul domicile
   ---------------------------------------------------------------------
   Le bloc « Montants commerciaux par domaine » figurait dans trois
   onglets : questionnaire, honoraires et documents. Trois endroits pour
   une meme decision, donc trois occasions de se contredire et aucun
   endroit qui fasse autorite. Il ne subsiste que dans l'onglet
   Honoraires. Le questionnaire garde le calcul detaille par prestation,
   les documents recoivent une synthese en lecture seule.
   Les regles de calcul, les droits d'ajustement et le motif au-dela du
   seuil sont inchanges : seul l'emplacement du bloc change.
   ===================================================================== */
function syntheseHonorairesHTML(d,m){
  const h=honorairesParCategorie(d,m), t=h.t;
  const cats=HONOR_CATS.filter(cat=>h.cats[cat].recAn||h.cats[cat].pon);
  if(!cats.length) return "";
  const ajuste=cats.some(cat=>h.cats[cat].adjustedRec||h.cats[cat].adjustedPon);
  return `<div class="card synthese-honoraires" style="margin-bottom:13px"><div class="hd">Honoraires retenus <span class="spacer"></span>${canRole("manager")&&!isDevisLocked(d)?`<button class="btn sm" data-tab="honoraires">Modifier les honoraires</button>`:`<span class="hint">Modifiables depuis l'onglet Honoraires</span>`}</div><div class="bd">
    <table class="synthese-table"><tbody>
      ${cats.map(cat=>{const c=h.cats[cat];return `<tr><td>${esc(cat)}${(c.adjustedRec||c.adjustedPon)?` <span class="tag ocre">ajusté</span>`:""}</td><td class="r num">${c.recAn?`${eur(c.recAn)} / an`:""}</td><td class="r num">${c.pon?eur(c.pon):""}</td></tr>`;}).join("")}
      <tr class="total"><td><b>Total HT</b></td><td class="r num">${t.recAn?`<b>${eur(t.recAn)} / an</b>`:""}</td><td class="r num">${t.pon?`<b>${eur(t.pon)}</b>`:""}</td></tr>
    </tbody></table>
    <div class="hint" style="margin-top:8px">Lecture seule. ${ajuste?"Certains montants ont été ajustés commercialement — le détail et les motifs figurent dans l'onglet Honoraires.":"Montants issus du calcul du questionnaire."}</div>
  </div></div>`;
}
/* =====================================================================
   v52 — L'onglet Documents montre le document
   ---------------------------------------------------------------------
   Sept blocs s'intercalaient avant l'apercu : barre a six boutons,
   avertissements, intitules, versions, parametres, adresse du service PDF,
   synthese. On venait voir le devis, on faisait defiler. Il reste une
   barre courte — choisir le document, le telecharger, l'imprimer — et
   l'apercu. Intitules, parametres contractuels et versions transmises
   sont reunis dans un tiroir unique, replie par defaut ; l'adresse du
   service PDF et la comparaison technique apercu/PDF sont parties dans
   Outils internes, ou elles relevent du diagnostic et non du travail
   quotidien. References, exports et versions historiques sont inchanges.
   ===================================================================== */
const DOC_TIROIRS=[["intitules","Intitulés"],["params","Paramètres du devis et de la lettre"],["versions","Versions transmises"]];
function tiroirDocHTML(d){
  const versions=versionsTransmises(d).length;
  const actif=st.docTiroir||"";
  const onglet=(k,l)=>`<button class="tiroir-onglet ${actif===k?"on":""}" data-doc-tiroir="${k}">${esc(l)}${k==="versions"&&versions?` <span class="tag gris">${versions}</span>`:""}</button>`;
  const corps=actif==="intitules"?intitulesCardHTML(d)
    :actif==="params"?(docParamsHTML(d).trim()||`<div class="hint">Aucun paramètre pour ce type de mission.</div>`)
    :actif==="versions"?(versionsCorpsHTML(d)||`<div class="hint">Aucune version n'a encore été transmise au client.</div>`)
    :"";
  return `<div class="card doc-tiroir">
    <div class="tiroir-barre">${DOC_TIROIRS.filter(([k])=>k!=="versions"||versions).map(([k,l])=>onglet(k,l)).join("")}<span class="spacer"></span>${actif?`<button class="btn sm ghost" data-doc-tiroir="">Replier</button>`:`<span class="hint">Intitulés, paramètres contractuels et historique des envois</span>`}</div>
    ${actif?`<div class="bd tiroir-corps">${corps}</div>`:""}</div>`;
}
function tabDoc(d,m){
  const avecLm=hasLettreMission(d);
  if(!avecLm && st.docType==="lm") st.docType="devis";
  const refsFaites=!!(d.ref&&(!avecLm||d.refLm));
  return `<div class="doc-barre">
    <div class="seg">
      <button data-act="docT" data-t="devis" class="${st.docType==="devis"?"on":""}">Devis</button>
      ${avecLm?`<button data-act="docT" data-t="lm" class="${st.docType==="lm"?"on":""}">Lettre de mission</button>`:""}</div>
    <span class="spacer"></span>
    <button class="btn" data-act="${st.docType==="lm"?"pdfLm":"pdfDevis"}">Télécharger en PDF</button>
    <button class="btn" data-act="print">Imprimer</button>
    ${refsFaites?`<span class="ref-attribuee" title="Références définitives attribuées">Réf. ${esc(st.docType==="lm"?d.refLm:d.ref)}</span>`
      :`<button class="btn p" data-act="valide" ${canRole("manager")?"":"disabled"} title="${canRole("manager")?"Attribue la référence définitive du devis"+(avecLm?" et de la lettre de mission":"")+". N'immobilise rien : le dossier reste modifiable jusqu'à la signature.":"Réservé à un manager / associé"}">Attribuer les références</button>`}
  </div>
  ${!st.cab.nom?`<div class="notice rouge" style="margin-bottom:13px"><b>Identité du cabinet manquante</b> — renseignez-la avant d'éditer un document opposable.</div>`:""}
  ${isDevisLocked(d)?"":completudeNoticeHTML(d,m,{compact:true})}
  ${tiroirDocHTML(d)}
  ${st.docType==="devis"?syntheseHonorairesHTML(d,m):""}
  <div id="apercu">${st.docType==="devis"?devisHTML(d,m):lmHTML(d,m)}</div>`;
}

function enTete(d){
  const c=st.cab;
  /* En-tête : identité + coordonnées utiles uniquement.
     Les mentions légales (forme, capital, SIREN, RCS, TVA, EUID) figurent
     exclusivement dans le pied de document — voir pied(). */
  const contact=[
    [esc(c.adresse),`${esc(c.cp)} ${esc(c.ville)}`.trim()].filter(Boolean).join(" · "),
    [c.tel?esc(c.tel):"",c.email?esc(c.email):""].filter(Boolean).join(" · "),
    c.site?esc(c.site.replace(/^https?:\/\//,"").replace(/\/$/,"")):""
  ].filter(Boolean);
  return `<header class="doc-header">
    <div class="doc-brand"><div class="doc-brand-name">${esc(c.nom||"[Cabinet]")}</div><div class="doc-brand-tag">${esc(brandData().documentTagline)}</div></div>
    <div class="doc-head-contact">${contact.join("<br>")}</div>
  </header>`;
}
function clientCardHTML(d, dateDoc){
  /* Disposition de lettre : lieu et date à gauche, destinataire à droite,
     dans la zone d'adresse d'une enveloppe à fenêtre. */
  const parts=[];
  if(d.client.contact) parts.push(`${esc(d.client.contact)}${d.client.fonction?`, ${esc(d.client.fonction)}`:""}`);
  if(d.client.adresse) parts.push(esc(d.client.adresse));
  if(d.client.cp||d.client.ville) parts.push(`${esc(d.client.cp)} ${esc(d.client.ville)}`.trim());
  if(d.client.siren) parts.push(`SIREN ${esc(d.client.siren)}`);
  const lieu=st.cab.ville?esc(st.cab.ville):"";
  const dt=dateFR(dateDoc||d.dateDevis);
  const pd=dt?`${lieu?lieu+", le ":"Le "}${dt}`:"";
  return `<div class="doc-address">
    <div class="doc-place-date">${pd}</div>
    <div class="doc-recipient"><span class="label">Destinataire</span><strong>${esc(d.client.raison||"[Client]")}</strong>${parts.join("<br>")}</div>
  </div>`;
}
function pied(){
  const c=st.cab;
  return `<footer class="pied"><b>${esc(c.nom||"[Cabinet]")}</b> · Société d'expertise comptable inscrite au tableau de l'Ordre des experts-comptables${c.region?` · ${esc(c.region)}`:""}${c.ordre?` · ${esc(c.ordre)}`:""}<br>
    ${esc(c.adresse)} · ${esc(c.cp)} ${esc(c.ville)} · ${esc(c.forme)}${c.capital?` · Capital ${esc(c.capital)} €`:""} · SIREN ${esc(c.siren||"—")}${c.rcs?` · ${esc(c.rcs)}`:""}${c.naf?` · NAF ${esc(c.naf)}`:""}${c.tva?` · TVA ${esc(c.tva)}`:""}${c.euid?` · EUID ${esc(c.euid)}`:""}${c.site?` · ${esc(c.site.replace(/^https?:\/\//,""))}`:""}</footer>`;
}
/* Colonne des montants : l'annuel en premier, la mensualité en rappel. */
function montantLigneHTML(l){
  const v=+l.applique||0;
  if(l.per==="mensuelle") return `<span class="amount-year">${eur(v*12)}</span><span class="amount-month">soit ${eur(v)} / mois</span>`;
  if(l.per==="annuelle")  return `<span class="amount-year">${eur(v)}</span>`;
  return `<span class="amount-year">${eur(v)}</span><span class="amount-month">ponctuel</span>`;
}
/* v41 : les débours regroupent les prestations marquées comme telles, les
   exceptionnelles marquées, et les débours saisis sur le dossier. Ils sont
   présentés à part, hors du total des honoraires. */
function deboursSectionHTML(t){
  const rows=(t.debLignes||[]).filter(x=>String(x.label||"").trim()||(+x.montant||0));
  if(!rows.length) return "";
  return `<section class="offer-section"><h2>Débours et frais refacturés</h2>
    <table class="pricing-table"><tbody>${rows.map(x=>`<tr><td>${esc(x.label)}${x.com?`<div class="line-note">${esc(x.com)}</div>`:""}</td><td style="text-align:right" class="num">${eur(x.montant)}</td></tr>`).join("")}
    <tr class="total-ht"><td><b>Total des débours HT</b></td><td style="text-align:right"><b>${eur(t.deb)}</b></td></tr></tbody></table>
    <div class="table-note">Ces frais sont <b>facturés en sus des honoraires</b>, au réel et sur justificatifs. Les montants indiqués sont estimatifs, selon les tarifs en vigueur.</div></section>`;
}
/* Tableau de périmètre : il énumère les prestations retenues et la modalité
   choisie pour chacune. Il ne porte pas de montant — ceux-ci sont regroupés
   par domaine plus bas, et les débours ont leur propre section.

   v47 : deux cas où ce tableau n'apprenait rien au client et encombrait le
   devis, notamment sur les missions ponctuelles.
     1. Les lignes de débours y figuraient en double, alors qu'elles sont
        déjà détaillées avec leur montant dans « Débours et frais refacturés ».
     2. Une fois ces lignes retirées, il ne restait parfois qu'une liste de
        libellés sans modalité ni précision : le tableau est alors supprimé. */
function devisPricingTableHTML(lignes,d,m){
  lignes=(lignes||[]).filter(l=>!estDebours(l.it));
  if(!lignes.length) return "";
  const showModalite=lignes.some(l=>String(l.repLabelClient||"").trim()), vars=LMVARS(d,m);
  const aUnePrecision=lignes.some(l=>String(l.it.clientText||"").trim());
  if(!showModalite && !aUnePrecision) return "";
  return `<table class="pricing-table"><thead><tr><th>Prestation</th>${showModalite?"<th>Modalité retenue</th>":""}</tr></thead><tbody>
    ${lignes.map(l=>`<tr><td><b>${esc(l.it.label)}</b>${String(l.it.clientText||"").trim()?`<div class="client-note">${bloc2html(l.it.clientText,vars)}</div>`:""}</td>${showModalite?`<td>${esc(l.repLabelClient)}</td>`:""}</tr>`).join("")}</tbody></table>`;
}
/* v53.12 — Lignes négatives (remises, gestes commerciaux) rendues visibles.

   Le devis présente les honoraires agrégés par domaine : une ligne de prix
   libre négative saisie au questionnaire se fondait donc dans le total et le
   client ne voyait pas la remise consentie. On détaille désormais, pour les
   seuls domaines qui en comportent une, le montant avant remise puis chaque
   ligne négative avec son propre libellé. Le total du domaine et le total
   général sont inchangés : seule la lecture change.

   Deux réserves :
     - si le montant du domaine a été forcé à la main (catPrix), le détail ne
       s'additionnerait plus au total affiché : on ne l'affiche pas ;
     - les montants récurrents sont déjà annualisés par honorairesParCategorieBase. */
function devisRemiseRowsHTML(c,hasRec,hasPon){
  const out=[];
  const blocs=[
    {col:"rec",actif:hasRec,garde:l=>l.per!=="ponctuelle",ajuste:c.adjustedRec},
    {col:"pon",actif:hasPon,garde:l=>l.per==="ponctuelle",ajuste:c.adjustedPon}
  ];
  for(const b of blocs){
    if(!b.actif||b.ajuste) continue;
    const lignes=(c.lignes||[]).filter(b.garde);
    const neg=lignes.filter(l=>(+l.montant||0)<0);
    if(!neg.length) continue;
    const brut=lignes.reduce((s,l)=>s+((+l.montant||0)>0?+l.montant:0),0);
    const mnt=v=>`<td style="text-align:right" class="num"><span class="amount-month" style="margin-top:0">${eur(v)}</span></td>`;
    const vide=`<td style="text-align:right" class="num"></td>`;
    const row=(lab,v)=>`<tr><td><div class="line-note" style="margin-top:0;padding-left:9pt">${esc(lab)}</div></td>`
      +(hasRec?(b.col==="rec"?mnt(v):vide):"")+(hasPon?(b.col==="pon"?mnt(v):vide):"")+`</tr>`;
    out.push(row("Honoraires avant remise",brut));
    neg.forEach(l=>out.push(row(l.label||"Remise",+l.montant||0)));
  }
  return out.join("");
}
function devisCategorySummaryHTML(d,m){
  const h=honorairesParCategorie(d,m), cats=HONOR_CATS.filter(cat=>h.cats[cat].recAn>0||h.cats[cat].pon>0);
  if(!cats.length) return "";
  const hasRec=cats.some(cat=>h.cats[cat].recAn>0), hasPon=cats.some(cat=>h.cats[cat].pon>0);
  return `<section class="offer-section"><h2>Honoraires par domaine</h2><table class="pricing-table"><thead><tr><th>Domaine</th>${hasRec?`<th style="text-align:right">Montant HT annuel</th>`:""}${hasPon?`<th style="text-align:right">Montant HT ponctuel</th>`:""}</tr></thead><tbody>
    ${cats.map(cat=>{const c=h.cats[cat];return `<tr><td><b>${esc(cat)}</b></td>${hasRec?`<td style="text-align:right" class="num">${c.recAn?eur(c.recAn):"—"}</td>`:""}${hasPon?`<td style="text-align:right" class="num">${c.pon?eur(c.pon):"—"}</td>`:""}</tr>`+devisRemiseRowsHTML(c,hasRec,hasPon);}).join("")}
    <tr class="total-ht"><td><b>Total honoraires HT</b></td>${hasRec?`<td style="text-align:right"><b>${eur(h.t.recAn)}</b></td>`:""}${hasPon?`<td style="text-align:right"><b>${eur(h.t.pon)}</b></td>`:""}</tr>
  </tbody></table></section>`;
}
function devisScopeLineVisible(l){
  if(!l || !l.repondu) return false;
  /* Une prestation peut faire partie du périmètre sans porter de coût propre
     (ex. DSN incluse, prélèvement à la source inclus, formalité juridique incluse).
     Elle doit alors rester visible dans le devis, puisque la tarification est
     désormais négociée globalement par domaine. Seules les réponses qui
     signifient explicitement une absence de prestation sont masquées. */
  const r=normLabel(l.repLabel||"");
  if(!r) return true;
  return !(/^(a renseigner|non applicable|non retenu|non retenue|sur option|aucun|aucune|neant|n a|na)$/.test(r));
}
function devisSectionHTML(d,m,s,t){
  if(d.offSec[s.id]) return "";
  const ctx=ctxDe(d,m);
  const byItem=new Map();
  for(const it of s.items){
    if(masque(d,s,it) || !it.prix) continue;
    const l=ligne(d,m,it,ctx);
    if(devisScopeLineVisible(l)) byItem.set(it.id,{...l,section:s.titre,sectionTag:s.tag||"",secId:s.id});
  }
  const blocks=[]; let prices=[], infos=[];
  /* v53.13 : `devisPricingTableHTML` renvoie une chaîne vide quand le tableau
     de périmètre n’apprend rien au client (lignes à prix libre sans modalité
     ni précision). Empiler cette chaîne suffisait à rendre la section non
     vide : on obtenait un titre de section seul, sans rien dessous. */
  const flushPrices=()=>{ if(prices.length){ const html=devisPricingTableHTML(prices,d,m); if(html) blocks.push(html); prices=[]; } };
  const flushInfos=()=>{ if(infos.length){ blocks.push(`<div class="fiche">${infos.map(it=>`<div><b>${esc(it.label)}</b> : ${esc(repLu(d,it))}</div>`).join("")}</div>`); infos=[]; } };
  for(const it of s.items){
    if(masque(d,s,it)) continue;
    const line=byItem.get(it.id);
    if(line){ flushInfos(); prices.push(line); continue; }
    if(it.type==="paragraphe" && paragraphHasContent(d,m,s,it)){
      flushPrices(); flushInfos(); blocks.push(paragrapheHTML(d,m,s,it)); continue;
    }
    if(!it.prix && it.type!=="paragraphe" && repLu(d,it)){
      flushPrices(); infos.push(it); continue;
    }
  }
  flushPrices(); flushInfos();
  return blocks.length?`<section class="offer-section"><h2>${esc(s.titre)}</h2>${blocks.join("")}</section>`:"";
}
/* =====================================================================
   v53.14 — LE CADRE « CONDITIONS FINANCIÈRES » DEVIENT MODIFIABLE
   ---------------------------------------------------------------------
   Ses trois lignes étaient écrites dans le code : seuls le taux de
   pénalités, l’indemnité de recouvrement et la clause d’indexation
   pouvaient bouger. Le texte vient désormais d’un modèle de cabinet
   (Identité du cabinet), auquel un dossier peut déroger.

   Une condition par ligne. Les variables des documents sont acceptées,
   la saisie est échappée avant substitution — un chevron tapé dans le
   texte reste un chevron, il ne devient pas une balise. Modèle vide : la
   section disparaît du devis. Les dossiers figés gardent leur HTML
   archivé et ne bougent pas. */
function conditionsFinancieresModele(){
  const v=st.cab?.conditionsFinancieres;
  return typeof v==="string" ? v : String(CAB_DEF.conditionsFinancieres||"");
}
const dossierDerogeConditions = d => typeof d?.conditionsFi==="string";
function conditionsFinancieresDe(d){
  return dossierDerogeConditions(d) ? d.conditionsFi : conditionsFinancieresModele();
}
function conditionsFinancieresLignes(d){
  return String(conditionsFinancieresDe(d)||"").split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
}
function devisConditionsFinancieresHTML(d,v){
  const lignes=conditionsFinancieresLignes(d);
  if(!lignes.length) return "";
  const rendu=l=>{
    const safe=esc(l).replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi,(x,k)=>{
      const y=v[k];
      if(y===undefined) return `<span style="background:#FBE9A0">[${k}]</span>`;
      if(y===null) return "";
      /* La valeur est échappée elle aussi : plusieurs de ces variables sont
         des champs libres saisis en administration. */
      return y===""?"\u2026":esc(String(y));
    });
    return inlineRich(safe);
  };
  return `<section class="offer-section"><h2>Conditions financières</h2><div class="terms-card"><ul>
      ${lignes.map(l=>`<li>${rendu(l)}</li>`).join("\n      ")}
    </ul></div></section>`;
}
function devisHTML(d,m){
  if(d?.frozenDocs?.devis) return thawFrozenHTML(d.frozenDocs.devis);
  const t=totaux(d,m), v=LMVARS(d,m);
  const corps=m.sections.map(s=>devisSectionHTML(d,m,s,t)).join("");
  const validity=dateFR(addDays(d.dateDevis,d.validite));
  return `<div class="doc devis-doc">${enTete(d)}
    <section class="doc-hero">
      <div class="doc-kicker">Proposition d'honoraires</div>
      <div class="doc-title-row"><h1>${esc(intituleDevis(d))}</h1><div class="doc-ref-box"><span>Référence</span><strong>${esc(d.ref||"À valider")}</strong>${numeroVersion(d)>1?`<span class="doc-version">Version ${numeroVersion(d)}</span>`:""}</div></div>
      <div class="doc-meta-grid">
        <div class="doc-meta-item"><span>Validité</span><b>${nb(d.validite)} jours · jusqu'au ${validity}</b></div>
        <div class="doc-meta-item"><span>Modèle de mission</span><b>${esc(m.titre)}</b></div>
      </div>
    </section>
    ${clientCardHTML(d)}
    ${devisCategorySummaryHTML(d,m)}
    ${corps}
    ${t.exc.length?`<section class="offer-section"><h2>Prestations exceptionnelles</h2><table class="pricing-table"><thead><tr><th>Prestation</th></tr></thead><tbody>${t.exc.map(e=>`<tr><td><b>${esc(e.label)}</b>${e.com?`<div class="line-note">${esc(e.com)}</div>`:""}</td></tr>`).join("")}</tbody></table></section>`:""}
    ${deboursSectionHTML(t)}
    <section class="offer-section"><h2>Total de la proposition</h2>
      <div class="price-summary"><table class="summary-table"><tbody>
          <tr><td><b>Total honoraires HT</b></td><td style="text-align:right"><b>${eur(t.ht)}</b></td></tr>
          <tr><td>TVA</td><td style="text-align:right">${eur(t.tva)}</td></tr>
          <tr><td><b>Total honoraires TTC</b></td><td style="text-align:right"><b>${eur(t.ttc)}</b></td></tr>
        </tbody></table></div>
      ${t.deb?`<div class="table-note"><b>Débours et frais : ${eur(t.deb)} HT</b> — facturés en sus des honoraires, au réel et sur justificatifs. Ils ne sont pas compris dans le total ci-dessus.</div>`:""}
    </section>
    ${devisConditionsFinancieresHTML(d,v)}
    ${(lettreOf(d)&&lettreOf(d).mentions)?`<section class="offer-section"><h2>Dispositions particulières</h2>${bloc2html(lettreOf(d).mentions,v)}</section>`:""}
    <!-- v43 : le devis n'est signé que par le client ou le prospect. -->
    ${approvalSectionHTML("Acceptation du devis",[approvalBoxHTML({
      label:"Pour le client - Bon pour accord",
      nom:d.client.contact||"—",
      sous:[d.client.fonction||"",d.client.raison||""],
      mention:"Date, mention « Bon pour accord » et signature",
      ancre:true
    })])}
    ${pied()}</div>`;
}
function repLu(d,it){
  const a=d.rep[it.id];
  if(a===undefined||a==="") return "";
  if(it.type==="liste"||it.type==="ouinon"){ const r=it.reponses.find(r=>r.id===a); return r?r.label:""; }
  return String(a);
}
function repLabelOf(d,m,cle){
  for(const s of m.sections) for(const it of s.items) if((it.cle||"")===cle) return repLu(d,it);
  return "";
}
/* Libellé client de la réponse retenue : c'est lui qui part dans les documents
   remis au client, quand le libellé interne est trop technique. */
function repClientLabelOf(d,m,cle){
  for(const s of m.sections) for(const it of s.items) if((it.cle||"")===cle) return repLuClient(d,it);
  return "";
}
function lmSectionRows(d,m,sectionTitle){
  const s=m.sections.find(x=>x.titre===sectionTitle); if(!s||d.offSec[s.id]) return [];
  const ctx=ctxDe(d,m), rows=[];
  for(const it of s.items){
    if(masque(d,s,it)) continue;
    if(it.type==="paragraphe"){
      const answer=repLuClient(d,it);
      if(isFreeParagraphItem(s,it) && answer) rows.push({label:it.label,detail:answer});
      continue;
    }
    const answer=repLuClient(d,it);
    const l=ligne(d,m,it,ctx);
    const answered = answer!=="" || (it.type==="prixlibre" && d.rep[it.id]!==undefined && d.rep[it.id]!=="");
    if(!answered) continue;
    /* Le détail contractuel décrit la prestation et sa modalité, mais pas son prix ligne par ligne.
       Les honoraires sont regroupés par domaine dans le tableau financier afin d'éviter une
       ventilation commerciale contradictoire avec un éventuel ajustement global de catégorie. */
    const detail=answer;
    rows.push({label:it.label,detail});
  }
  return rows;
}
function lmRowsHTML(rows, empty=""){
  if(!rows.length) return empty?`<div class="lm-dyn lm-empty">${esc(empty)}</div>`:"";
  return `<div class="lm-dyn"><ul>${rows.map(r=>`<li><b>${esc(r.label)}</b>${r.detail?` : ${esc(r.detail)}`:""}</li>`).join("")}</ul></div>`;
}
function lmPresentationHTML(d,m){
  const rows=lmSectionRows(d,m,"Présentation de votre entreprise");
  if(rows.length) return lmRowsHTML(rows);
  const fallback=[];
  if(d.client.forme) fallback.push({label:"Forme juridique",detail:d.client.forme});
  if(d.client.siren) fallback.push({label:"SIREN",detail:d.client.siren});
  const adr=[d.client.adresse,[d.client.cp,d.client.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  if(adr) fallback.push({label:"Adresse",detail:adr});
  return lmRowsHTML(fallback);
}
function lmSectionHTML(d,m,title){ return lmRowsHTML(lmSectionRows(d,m,title)); }
function lmExcHTML(d,m){
  const t=totaux(d,m);
  if(!t.exc.length) return `<div class="lm-dyn dim">Aucune prestation exceptionnelle retenue.</div>`;
  return `<div class="lm-dyn"><ul>${t.exc.map(e=>`<li><b>${esc(e.label)}</b>${e.com?` — ${esc(e.com)}`:""}</li>`).join("")}</ul></div>`;
}
function lmDeboursHTML(d){
  const t0=totaux(d,modOf(d)||{sections:[],tva:20});
  const a=(t0.debLignes||[]).filter(x=>String(x.label||"").trim()||(+x.montant||0)).map(x=>({label:x.label,prix:x.montant}));
  if(!a.length) return `<div class="lm-dyn dim">Aucun débours estimé à ce stade.</div>`;
  return `<div class="lm-dyn"><ul>${a.map(x=>`<li><b>${esc(x.label||"Débours")}</b> : ${eur(+x.prix||0)} estimés, refacturés au réel sur justificatifs.</li>`).join("")}</ul></div>`;
}
function lmHonorairesHTML(d,m){
  const h=honorairesParCategorie(d,m);
  const cats=HONOR_CATS.filter(cat=>h.cats[cat].recAn>0);
  if(!cats.length) return `<div class="lm-dyn dim">Aucun honoraire annuel récurrent prévu au titre de la présente mission.</div>`;
  const annualHT=cats.reduce((sum,cat)=>sum+(+h.cats[cat].recAn||0),0);
  const annualTVA=cats.reduce((sum,cat)=>{
    const c=h.cats[cat], base=+c.baseRecAn||0;
    const rate=base>0?(+c.tvaRec||0)/base:0;
    return sum+(+c.recAn||0)*rate;
  },0);
  return `<table class="lm-hono"><thead><tr><th>Domaine</th><th style="text-align:right">Montant HT annuel</th></tr></thead><tbody>
    ${cats.map(cat=>{const c=h.cats[cat];return `<tr><td><b>${esc(cat)}</b></td><td style="text-align:right">${eur(c.recAn)}</td></tr>`+devisRemiseRowsHTML(c,true,false);}).join("")}
    <tr class="total-ht"><td>Total annuel HT</td><td style="text-align:right">${eur(annualHT)}</td></tr>
    <tr><td>TVA sur honoraires annuels</td><td style="text-align:right">${eur(annualTVA)}</td></tr>
    <tr class="total-ttc"><td>Total annuel TTC</td><td style="text-align:right">${eur(annualHT+annualTVA)}</td></tr>
  </tbody></table>`;
}
function lmModalitesHTML(d,m){
  const p=repLabelOf(d,m,"periodicite_facturation")||"À renseigner";
  const r=repLabelOf(d,m,"modalite_reglement")||"À renseigner";
  const rows=[{label:"Périodicité de facturation",detail:p},{label:"Modalité de règlement",detail:r}];
  const s=m.sections.find(x=>x.titre==="Modalités de facturation et de règlement");
  if(s&&!d.offSec[s.id]){
    for(const it of s.items){
      const txt=String(repLu(d,it)||it.html||"").trim();
      if(it.type!=="paragraphe"||d.off[it.id]||!txt) continue;
      rows.push({label:"Conditions particulières",detail:txt.replace(/\*\*/g,"").replace(/\n+/g," ")});
    }
  }
  return lmRowsHTML(rows);
}
function lmObligationsHTML(d){
  const mark=v=>v?`<span class="lm-check" aria-label="Attribué">✓</span>`:"";
  let dutyIndex=0;
  const row=(label,cab=false,cli=false)=>{ const alt=(dutyIndex++%2)?" alt":""; return `<tr class="duty${alt}"><td>${label}</td><td>${mark(cab)}</td><td>${mark(cli)}</td></tr>`; };
  const sub=label=>`<tr class="subgrp"><td colspan="3">${label}</td></tr>`;
  const subs=items=>`<div class="lm-sub">${items.map(x=>`<div>${esc(x)}</div>`).join("")}</div>`;
  const groupe=(titre,corps)=>`<div class="lm-oblig-group">
    <div class="lm-oblig-title">${titre}</div>
    <table class="lm-oblig"><thead>
      <tr><th rowspan="2">Nature des obligations respectives</th><th class="role" colspan="2">Responsable des travaux</th></tr>
      <tr><th class="role">Cabinet</th><th class="role">Client</th></tr>
    </thead><tbody>${corps}</tbody></table>
  </div>`;

  const nature=(typeof natureKeyOf==="function"&&d)?natureKeyOf(d):(d?.nature||"NP2300");
  let titre1="", g1="";
  /* v47 — répartitions propres aux missions ponctuelles. Elles reprennent la
     ligne de partage posée par les trames OEC : le client fournit et assume
     les données, le cabinet met en œuvre les diligences et rédige le livrable. */
  if(nature==="NP3400"){
    titre1="1. Examen d’informations financières prévisionnelles — NP 3400";
    g1=[
      row("Choix et documentation des hypothèses retenues",false,true),
      row("Établissement des informations financières prévisionnelles",false,true),
      row("Transmission des informations financières historiques et des données nécessaires",false,true),
      row("Prise de connaissance des activités et recensement des hypothèses significatives",true,false),
      row("Prise de connaissance du processus d’élaboration des informations prévisionnelles",true,false),
      row("Évaluation de la fiabilité des informations financières historiques de référence",true,false),
      row("Vérification de la préparation des informations sur la base des hypothèses retenues",true,false),
      row("Analyse des domaines sensibles aux variations d’hypothèses",true,false),
      row("Information sur tout fait nouveau affectant les hypothèses avant l’émission du rapport",false,true),
      row("Établissement du rapport d’examen et conclusion sous forme négative",true,false)
    ].join("");
  }else if(nature==="EVAL"){
    titre1="1. Mission d’évaluation — mission sans assurance";
    g1=[
      row("Mise à disposition des comptes annuels, liasses fiscales, balances et grands livres",false,true),
      row("Communication du plan d’affaires et des hypothèses qui le sous-tendent",false,true),
      row("Fiabilité, exhaustivité et exactitude des informations transmises",false,true),
      row("Prise de connaissance générale de l’entité et de son environnement",true,false),
      row("Entretiens avec la direction et les responsables désignés",true,true),
      row(`Analyse financière des exercices étudiés :${subs(["évolution de l’activité et des marges","structure de bilan et endettement","ratios et retraitements de normalisation"])}`,true,false),
      row("Choix et mise en œuvre des méthodes d’évaluation selon une approche multicritère",true,false),
      row("Analyses de sensibilité aux hypothèses et paramètres financiers",true,false),
      row("Recours éventuel à des expertises externes",true,true),
      row("Remise, le cas échéant, d’une lettre d’affirmation",false,true),
      row("Rédaction du rapport d’évaluation et de la fourchette de valeurs",true,false),
      row("Décisions de négociation et suites données à l’évaluation",false,true)
    ].join("");
  }else if(nature==="SITUATION"){
    titre1="1. Situation comptable intermédiaire — mission sans assurance";
    g1=[
      row("Transmission des pièces comptables et relevés jusqu’à la date d’arrêté",false,true),
      row("Communication des stocks, travaux en cours, provisions et estimations",false,true),
      row("Enregistrement ou intégration des écritures jusqu’à la date d’arrêté",true,false),
      row("Rapprochements bancaires et revue des comptes de tiers",true,false),
      row("Écritures de rattachement à la période et cut-off",true,false),
      row("Calcul des dotations aux amortissements à la date d’arrêté",true,false),
      row("Revue de cohérence des principaux postes significatifs",true,false),
      row("Établissement du bilan et du compte de résultat intermédiaires",true,false),
      row("Validation des options, estimations et décisions de gestion",false,true),
      row("Aucune attestation ni conclusion d’assurance sur la situation",true,true)
    ].join("");
  }else if(nature==="NP2400"){
    titre1="1. Mission d’examen limité des comptes — NP 2400";
    g1=[
      row("Établissement et arrêté des comptes conformément au référentiel comptable applicable",false,true),
      row("Définition et maintien du contrôle interne nécessaire à l’établissement des comptes",false,true),
      row("Prise de connaissance de l’entité, de son environnement et de son système comptable",true,false),
      row("Prise de connaissance des procédures de contrôle interne concourant à l’élaboration des comptes",true,false),
      row("Examen des principes et pratiques comptables suivis par l’entité",true,false),
      row("Demandes d’informations et entretiens avec la direction",true,true),
      row("Mise en œuvre de procédures analytiques",true,false),
      row("Lecture des procès-verbaux et éléments susceptibles d’avoir une incidence sur les comptes",true,true),
      row("Information sur les événements postérieurs significatifs avant la date du rapport",false,true),
      row("Établissement du rapport d’examen limité",true,false)
    ].join("");
  }else if(nature==="TENUE"){
    titre1="1. Travaux comptables et déclaratifs — mission sans assurance";
    g1=[
      row("Définition de l’organisation administrative et validation des procédures internes",false,true),
      row("Transmission complète et dans les délais des pièces et informations nécessaires",false,true),
      row("Tenue ou intégration des écritures comptables prévues au devis",true,false),
      row("Rapprochements bancaires et contrôles comptables prévus au devis",true,false),
      row("Collecte et validation des informations nécessaires aux écritures d’inventaire",true,true),
      row("Établissement des déclarations comprises dans le périmètre contractuel",true,false),
      row("Validation des options, estimations et décisions de gestion",false,true),
      row("Conservation des pièces justificatives et documents originaux",false,true),
      row("Aucune attestation ou conclusion d’assurance sur les comptes",true,true)
    ].join("");
  }else{
    titre1="1. Mission de présentation des comptes — NP 2300";
    g1=[
      row("Organisation de la comptabilité",false,true),
      row("Tenue du fichier des immobilisations et amortissements",true,false),
      row(`Stock :${subs(["inventaire physique","valorisation des stocks"])}`,false,true),
      row(`Collecte des éléments concourant aux écritures d’inventaire de fin d’exercice et enregistrement${subs(["Dépréciation d’actifs","Montant des provisions","etc."])}`,true,false),
      row(`Contrôles par épreuves de pièces justificatives :${subs(["Rapprochement avec les pièces justificatives externes","Recoupement avec les pièces justificatives internes"])}`,true,false),
      row("Justification des soldes et contrôles de cohérence des principaux comptes",true,false),
      row("Examen de la cohérence et de la vraisemblance des comptes pris dans leur ensemble",true,false),
      row("Participation à l’établissement des comptes annuels (bilan, compte de résultat et annexe comptable)",true,false),
      row("Appréciation de la régularité en la forme de la comptabilité",true,false),
      row(`Documents comptables (journaux, grands livres, balances) :${subs(["édition","archivage selon le périmètre convenu"])}`,true,false)
    ].join("");
  }

  const m=modOf(d), totals=m?totaux(d,m):null;
  const taskRows=[];
  for(const l of (totals?.lignes||[])){
    const detail=String(l.repLabel||"").trim();
    const byClient=/\bpar le client\b|\bclient\b/i.test(detail) && !/\bpar le cabinet\b/i.test(detail);
    taskRows.push(row(`${esc(l.it.label)}${detail?` — ${esc(detail)}`:""}`,!byClient,byClient));
  }
  for(const e of (totals?.exc||[])) taskRows.push(row(`${esc(e.label)} — prestation exceptionnelle`,true,false));
  const g2=taskRows.length?taskRows.join(""):row("Aucune intervention complémentaire sélectionnée au devis",false,false);

  return groupe(titre1,g1)+groupe("2. Prestations effectivement retenues au devis",g2);
}
/* =====================================================================
   v47 — VARIABLES DES MISSIONS PONCTUELLES
   ---------------------------------------------------------------------
   Les trames OEC « examen d'informations financières prévisionnelles »
   (NP 3400), « évaluation d'une entité ou de ses titres » et la trame
   SERRE « situation comptable intermédiaire » comportent des zones à
   compléter et des options de rédaction. Elles sont résolues ici à partir
   des réponses du questionnaire du devis : aucune saisie n'est dupliquée.

   Convention : une zone non renseignée produit une chaîne vide, ce qui
   fait disparaître le paragraphe optionnel plutôt que d'afficher un blanc
   contractuellement ambigu.
   ===================================================================== */

/* Index de réponse (rang `n`) d'un champ liste/oui-non, ou null. */
function repIndexOf(d,m,cle){
  const v=conditionSource(d,m,cle);
  return (v.found&&v.answered)?Number(v.n):null;
}
/* Texte brut saisi (champ texte/nombre) ou libellé retenu (liste). */
function repTexteOf(d,m,cle){
  const v=conditionSource(d,m,cle);
  if(!v.found||!v.answered) return "";
  return String(v.label||"").trim();
}
/* Contenu d'un paragraphe : texte rédigé au dossier s'il existe, sinon texte
   par défaut du modèle — c'est la sémantique déjà appliquée au devis, donc le
   contrat et la proposition disent exactement la même chose. Un paragraphe
   masqué par une condition ne remonte pas. */
function repParaOf(d,m,cle){
  const it=(m?.sections||[]).flatMap(s=>s.items||[]).find(x=>(x.cle||slug(x.label))===cle);
  if(!it) return "";
  const s=(m.sections||[]).find(x=>(x.items||[]).includes(it));
  if(s&&masque(d,s,it)) return "";
  return String(paragraphSource(d,it)||"").trim();
}

function missionPonctuelleVars(d,m){
  const R=(cle)=>repTexteOf(d,m,cle);
  const N=(cle)=>repIndexOf(d,m,cle);
  const P=(cle)=>repParaOf(d,m,cle);
  const t=totaux(d,m);
  const v={};

  /* ---------------------------------------------- exécution et déroulement */
  v["mission.signataire"]=st.cab.signataire||"l’expert-comptable signataire";
  const planning=P("lm_planning");
  v["mission.planning"]=planning
    ? `Nous vous proposons d’intervenir selon le planning suivant :\n\n${planning}`
    : "Le calendrier d’intervention sera arrêté d’un commun accord dès la signature de la présente lettre.";
  const docs=P("lm_documents");
  v["mission.documents"]=docs||"Les informations et documents nécessaires vous seront précisés au démarrage de la mission.";

  const delai=R("lm_delai");
  v["mission.delai"]=delai?`Elle sera réalisée dans un délai maximal de **${delai}** à compter de cette date.`:null;
  const finN=N("lm_fin");
  const finTxt=finN===1?"à l’émission de notre compte rendu de mission":"à l’émission de notre rapport de mission";
  v["mission.fin"]=`Elle prendra fin ${finTxt}. Elle pourra être complétée par les missions complémentaires que vous voudrez bien nous confier.`;

  /* -------------------------------------------------- annexes et LCB-FT */
  const annexe2=N("lm_annexe2")===1;
  v["mission.annexe2"]=annexe2
    ? ", ainsi que par le tableau de répartition des obligations respectives entre votre entité et notre cabinet (annexe 2)"
    : null;
  v["mission.annexe2_active"]=annexe2?"1":"";

  const idN=N("lm_identification");
  const idCondition=idN===2?"condition résolutoire":"condition suspensive";
  v["mission.identification"]=(idN===1||idN===2)
    ? `Dans le cadre des obligations qui nous incombent en application des dispositions du Code monétaire et financier relatives à la lutte contre le blanchiment de capitaux et le financement du terrorisme, nous vous informons qu’à la date de la présente les informations et les documents requis en matière d’identification, relatés au paragraphe 4 des conditions générales jointes, ne nous sont pas parvenus et que leur obtention constitue une **${idCondition}** pour la mise en œuvre de la mission que vous souhaitez nous confier.`
    : `Les informations et documents requis en matière d’identification du client, des personnes agissant pour son compte et, le cas échéant, des bénéficiaires effectifs, prévus au paragraphe 4 des conditions générales jointes, ont été obtenus préalablement à l’entrée en relation, conformément à la norme professionnelle relative à la lutte contre le blanchiment des capitaux et le financement du terrorisme (NPLAB).`;

  /* ------------------------------------------ prestations complémentaires */
  const compl=[];
  const complLibre=P("lm_complementaires");
  if(complLibre) compl.push(complLibre);
  if(N("previ_assistance")===1) compl.push(`**Assistance à l’établissement des informations financières prévisionnelles.** Vous avez souhaité que nous vous assistions dans l’élaboration des informations prévisionnelles soumises à notre examen. Cette assistance est distincte de la mission d’examen et ne modifie ni son objet, ni le niveau d’assurance qui s’y attache.`);
  v["mission.complementaires"]=compl.length?compl.join("\n\n"):null;
  /* Les prestations exceptionnelles du devis ne sont reprises que si le
     dossier en retient effectivement : la mention « aucune » n'a pas de sens
     dans un contrat ponctuel. */
  v["mission.exceptionnelles"]=t.exc.length?lmExcHTML(d,m):null;

  /* ------------------------------------------------------------ honoraires */
  const modeTemps=N("lm_honoraires_mode")===1;
  const montant=eur(t.ht);
  if(modeTemps){
    const taux=P("lm_taux_horaires");
    const temps=R("lm_temps_estime");
    const regul=N("lm_regularisation")===1?"en cours de mission":"en fin de mission";
    v["honoraires.clause"]=[
      `Nos honoraires seront calculés **au temps passé**.`,
      taux?`Les taux horaires appliqués sont les suivants :\n\n${taux}`:"",
      temps?`Compte tenu des temps prévus, que nous avons estimés à **${temps} heures**, nos honoraires devraient s’élever à **${montant} HT**.`
           :`Sur la base des temps prévus, nos honoraires sont estimés à **${montant} HT**.`,
      `En cas de dépassement des temps prévus, dont nous vous informerions dans les meilleurs délais, une régularisation des honoraires sera effectuée ${regul}.`
    ].filter(Boolean).join("\n\n");
  }else{
    v["honoraires.clause"]=`Nos honoraires seront facturés **au forfait**, soit **${montant} HT**.\n\nCe forfait couvre les travaux décrits dans la présente lettre et au devis annexé. Toute prestation nouvelle ou tout élargissement du périmètre fera l’objet d’un accord préalable entre les parties.`;
  }
  /* Récapitulatif financier propre aux missions ponctuelles : le tableau
     d'honoraires standard ne présente que des montants récurrents annuels,
     sans objet ici. */
  const debRows=(t.debLignes||[]).filter(x=>String(x.label||"").trim()||(+x.montant||0));
  v["honoraires.recap"]=`<table class="lm-honor-table"><tbody>
    <tr><td>Honoraires de la mission — HT</td><td class="r num"><b>${eur(t.ht)}</b></td></tr>
    <tr><td>TVA (${nb(m?.tva??20)} %)</td><td class="r num">${eur(t.tva)}</td></tr>
    <tr><td><b>Total TTC</b></td><td class="r num"><b>${eur(t.ttc)}</b></td></tr>
    ${debRows.length?`<tr><td>Débours et frais refacturés au réel (en sus)</td><td class="r num">${eur(t.deb)}</td></tr>`:""}
  </tbody></table>`;

  /* -------------------------------------------------- prévisionnel NP 3400 */
  const previN=N("previ_objet");
  v["previ.objet"]=previN===1?"d’une projection d’informations financières":"des prévisions budgétaires";
  v["previ.rapport"]=previN===1?"la projection d’informations financières":"les prévisions budgétaires";
  v["previ.periode"]=R("previ_periode")||"à préciser";
  const previCtx=R("previ_contexte");
  v["previ.contexte"]=previCtx?`Cette mission s’inscrit dans le contexte suivant : ${previCtx}.`:null;
  v["previ.destinataires"]=R("previ_destinataires")||"la direction de votre entité";
  const note=R("previ_note_hypotheses");
  v["previ.hypotheses"]=note?`Ces hypothèses figurent dans ${note}.`:null;

  /* ------------------------------------------------------------ évaluation */
  const perimN=N("eval_perimetre");
  const PERIM=[
    ["de votre entité","votre entité"],
    ["des titres de votre entité","les titres de votre entité"],
    ["de l’entité cible","l’entité cible"],
    ["des titres de l’entité cible","les titres de l’entité cible"]
  ];
  const perim=PERIM[perimN]||PERIM[0];
  v["eval.perimetre"]=perim[0];
  v["eval.objet"]=perim[1];
  v["eval.date"]=R("eval_date_ref")||"à préciser";

  const situationN=N("eval_mission_compta");
  const missionRef=R("eval_mission_ref");
  v["eval.mission_existante"]=situationN===1
    ? `Nous effectuons actuellement pour votre entité une mission comptable${missionRef?` — ${missionRef}`:""}. **Cette mission d’évaluation répond à un besoin ponctuel** et les termes de la lettre de mission relative à la mission comptable restent inchangés.`
    : null;
  const confrere=R("eval_confrere_nom");
  v["eval.confrere"]=situationN===2
    ? `Nous vous précisons par ailleurs qu’en application de l’**article 161 du Code de déontologie**, nous informons notre confrère${confrere?` ${confrere}`:""} de la nature de la mission que vous nous confiez.`
    : null;
  v["eval.contexte_detail"]=P("eval_infos")||null;

  const limites=[];
  if(situationN===1) limites.push(`En conséquence, nous ne procéderons pas à des contrôles complémentaires sur les données historiques du dernier exercice ayant fait l’objet de notre mission comptable.`);
  if(N("eval_post_cloture")===1) limites.push(`Dans le cadre de notre mission ponctuelle d’évaluation, nous nous entretiendrons avec la direction et ses principaux responsables sur les événements intervenus postérieurement à la clôture. Nous apprécierons la nécessité de revoir, pour les besoins de l’évaluation, certaines des estimations fournies.`);
  if(N("eval_diligences_compta")===1) limites.push(`Les comptes de l’entité évaluée ne faisant l’objet d’aucune mission d’assurance, ni par un commissaire aux comptes ni par un expert-comptable, nous compléterons les diligences rappelées ci-dessus par des **diligences spécifiques nous permettant d’obtenir un confort sur les données comptables**.`);
  v["eval.limite_presentation"]=limites.length?limites.join("\n\n"):null;

  v["eval.entite_cible"]=N("eval_cible_echanges")===1
    ? `Nous pourrons être amenés, avec votre accord et dans la mesure où cette démarche s’avérera opportune, à échanger avec les responsables de l’entité cible, dont vous voudrez bien nous communiquer les noms et coordonnées, afin de compléter les informations nécessaires à notre mission.`
    : null;

  /* ------------------------------------------- situation intermédiaire */
  v["situ.date"]=R("situation_date")||"à préciser";
  v["situ.periode"]=R("situation_periode")||null;

  /* ---------------------------------------------------- empreinte carbone */
  v["carbone.periode"]=R("carbone_periode")||"à préciser";
  v["carbone.perimetre"]=repClientLabelOf(d,m,"carbone_scopes")||"à préciser";
  const carbFacteurs=[
    "issus de la **Base Empreinte de l’ADEME**",
    "issus de la **Base Empreinte de l’ADEME**, complétés de facteurs sectoriels publics",
    "fournis par l’outil de calcul retenu avec le client"
  ];
  const carbFactN=N("carbone_facteurs");
  v["carbone.facteurs"]=carbFacteurs[carbFactN>=0?carbFactN:0]||carbFacteurs[0];
  const carbExcl=R("carbone_exclusions");
  v["carbone.exclusions"]=carbExcl
    ? `**Postes exclus du périmètre :** ${carbExcl}. Cette exclusion est rappelée dans le rapport de restitution.`
    : null;
  const CARB_CONTEXTE=[
    null,
    "Cette démarche répond à la demande d’un client ou d’un donneur d’ordre.",
    "Cette démarche répond à la demande d’un financeur ou d’un assureur.",
    "Cette démarche s’inscrit dans la constitution d’un dossier de subvention ou d’aide publique.",
    "Cette démarche s’inscrit dans la préparation d’un reporting de durabilité.",
    null
  ];
  const carbCtxN=N("carbone_contexte");
  v["carbone.contexte"]=carbCtxN>=0?(CARB_CONTEXTE[carbCtxN]||null):null;

  /* --------------------------------------------------- sections dédiées */
  const sec=(titre)=>lmSectionHTML(d,m,titre)||null;
  v["section.entite_previ"]=sec("Votre entité — Prévisionnel");
  v["section.projet_previ"]=sec("Votre projet — Prévisionnel");
  v["section.entite_eval"]=sec("Données de l'entité — Évaluation");
  v["section.projet_eval"]=sec("Votre projet — Évaluation");
  v["section.entite_situ"]=sec("Votre entité — Situation comptable intermédiaire");
  v["section.perimetre_situ"]=sec("Situation comptable intermédiaire — Périmètre");
  v["section.entite_carbone"]=sec("Votre entité — Empreinte carbone");
  v["section.perimetre_carbone"]=sec("Empreinte carbone — Périmètre et méthode");

  return v;
}

function LMVARS(d,m){
  m=m||modOf(d);
  const c=st.cab, t=totaux(d,m), n=natureOf(d);
  const seuil=Math.max(0,+d.justifSeuil||100);
  const justif=d.justifSeuilEnabled
    ? `Dans le cadre de la politique documentaire convenue avec le client, le cabinet ne procède pas à des relances systématiques pour les justificatifs manquants dont le montant unitaire est inférieur à **${eur(seuil)} TTC**. Le traitement comptable et fiscal de ces opérations est effectué au regard des informations disponibles, sans préjudice de l’obligation du client de conserver les pièces justificatives et de les produire en cas de demande ou de contrôle.`
    : "";
  const v={
    "cabinet.nom":c.nom,"cabinet.forme":c.forme,"cabinet.capital":c.capital,"cabinet.adresse":c.adresse,
    "cabinet.cp":c.cp,"cabinet.ville":c.ville,"cabinet.siren":c.siren,"cabinet.email":c.email,"cabinet.tel":c.tel,
    "cabinet.site":c.site,"cabinet.tva":c.tva,"cabinet.rcs":c.rcs,"cabinet.naf":c.naf,"cabinet.euid":c.euid,
    "cabinet.region":c.region,"cabinet.signataire":c.signataire,"cabinet.qualite":c.qualite,
    "cabinet.rcp":c.rcp||"un assureur agréé","cabinet.penalites":c.penalites,"cabinet.recouvrement":nb(c.recouvrement),
    "cabinet.mediateur":c.mediateur,
    "asset.expertise":EXPERTISE_VISUAL,
    "client.raison":d.client.raison,"client.forme":d.client.forme,"client.siren":d.client.siren,
    "client.adresse":d.client.adresse,"client.cp":d.client.cp,"client.ville":d.client.ville,
    "client.civilite":d.client.civilite||"Madame, Monsieur","client.contact":d.client.contact,"client.fonction":d.client.fonction,
    "client.email":d.client.email||"","client.tel":d.client.tel||"","client.siret":d.client.rne?.siret||"","client.code_ape":d.client.rne?.codeApe||"",
    "responsable.email":d.ownerEmail||"","responsable.nom":(d.ownerEmail||"").split("@")[0].replace(/[._-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase()),
    "devis.ref":d.ref||"à valider","devis.date":dateFR(d.dateDevis),"devis.validite":nb(d.validite),
    "devis.statut":STATUTS[workflowStatut(d)]?.[0]||workflowStatut(d),"devis.date_creation":dateFR(d.cree),"devis.date_modification":dateTimeFR(d.majAt||d.maj),
    "mission.modele":m?.titre||"",
    "devis.echeance":dateFR(addDays(d.dateDevis,d.validite)),"lm.ref":d.refLm||"à valider","lm.date":dateFR(dateLettre(d)),
    "mission.nature":n.t,"mission.norme":n.norme,"mission.intro":n.intro,"mission.cadre":n.cadre,
    "mission.assurance":n.p,"mission.limites":n.limites,"mission.execution":n.execution,
    "mission.referentiel":String(d.referentiel||REFERENTIEL_DEFAULT),"mission.justificatifs":justif,
    "mission.liste":"<ul>"+t.lignes.map(l=>`<li>${esc(l.it.label)}${l.repLabel?` — ${esc(l.repLabel)}`:""}</li>`).join("")+"</ul>",
    "honoraires.mensuel":eur(t.recMens),"honoraires.recurrent":eur(t.recAn),"honoraires.ponctuel":eur(t.pon),
    "honoraires.ht":eur(t.ht),"honoraires.ttc":eur(t.ttc),
    "conditions.duree":nb(d.duree),"conditions.debut":d.debut?dateFR(d.debut):"premier jour de l'exercice comptable en cours",
    "conditions.preavis":nb(d.preavis),"conditions.indexation":c.indexation,"conditions.revision":nb(c.revisionHonoraires??5),
    "conditions.indemniteResiliation":nb(st.cab.indemniteResiliation??50),
    "conditions.tacite":d.tacite?"Elle se renouvelle ensuite par tacite reconduction par périodes d'un an.":"Elle prend fin de plein droit à son terme.",
    "conditions.periodicite":(repLabelOf(d,m,"periodicite_facturation")||"selon convention").toLowerCase(),
    "conditions.reglement":(repLabelOf(d,m,"modalite_reglement")||"par prélèvement").toLowerCase(),
    "rgpd.clause":rgpdClause(d),
    "section.presentation":lmPresentationHTML(d,m),
    "section.exceptionnelles":lmExcHTML(d,m),
    "section.comptabilite":lmSectionHTML(d,m,"Accompagnement en comptabilité"),
    "section.gestion":lmSectionHTML(d,m,"Nos outils collaboratifs et notre accompagnement en gestion"),
    "section.social":lmSectionHTML(d,m,"Accompagnement en social"),
    "section.juridique":lmSectionHTML(d,m,"Accompagnement en juridique"),
    "section.debours":lmDeboursHTML(d),
    "section.modalites":lmModalitesHTML(d,m),
    "honoraires.table":lmHonorairesHTML(d,m),
    "annexe.obligations":lmObligationsHTML(d)
  };
  m.sections.forEach(s=>s.items.forEach(it=>{ v["rep."+(it.cle||slug(it.label))]=repLu(d,it); }));
  /* v47 : les variables des missions ponctuelles sont calculées en dernier
     afin de pouvoir surcharger une valeur générique (honoraires, exécution)
     par la rédaction propre à la trame OEC retenue. */
  Object.assign(v,missionPonctuelleVars(d,m));
  return v;
}
const VARS_LIST=["asset.expertise","cabinet.nom","cabinet.forme","cabinet.capital","cabinet.adresse","cabinet.cp","cabinet.ville","cabinet.siren","cabinet.rcs","cabinet.tva","cabinet.naf","cabinet.euid","cabinet.site","cabinet.email","cabinet.tel","cabinet.region","cabinet.signataire","cabinet.qualite","cabinet.rcp","cabinet.penalites","cabinet.recouvrement","cabinet.mediateur","client.raison","client.forme","client.siren","client.siret","client.code_ape","client.adresse","client.cp","client.ville","client.civilite","client.contact","client.fonction","client.email","client.tel","responsable.nom","responsable.email","devis.ref","devis.date","devis.date_creation","devis.date_modification","devis.echeance","devis.statut","lm.ref","lm.date","mission.modele","mission.nature","mission.norme","mission.intro","mission.cadre","mission.assurance","mission.limites","mission.execution","mission.referentiel","mission.justificatifs","mission.liste","honoraires.mensuel","honoraires.recurrent","honoraires.ponctuel","honoraires.ht","honoraires.ttc","honoraires.table","conditions.duree","conditions.debut","conditions.preavis","conditions.tacite","conditions.periodicite","conditions.reglement","conditions.indexation","conditions.revision","section.presentation","section.exceptionnelles","section.comptabilite","section.gestion","section.social","section.juridique","section.debours","section.modalites","rgpd.clause","annexe.obligations","rep.ca","rep.effectif","rep.cloture",
/* v47 — missions ponctuelles (prévisionnel NP 3400, évaluation, situation) */
"mission.signataire","mission.planning","mission.documents","mission.delai","mission.fin","mission.annexe2","mission.identification","mission.complementaires","honoraires.clause",
"previ.objet","previ.rapport","previ.periode","previ.contexte","previ.destinataires","previ.hypotheses",
"eval.perimetre","eval.objet","eval.date","eval.mission_existante","eval.confrere","eval.contexte_detail","eval.limite_presentation","eval.entite_cible",
"situ.date","situ.periode",
"carbone.periode","carbone.perimetre","carbone.facteurs","carbone.exclusions","carbone.contexte",
"section.entite_previ","section.projet_previ","section.entite_eval","section.projet_eval","section.entite_situ","section.perimetre_situ","section.entite_carbone","section.perimetre_carbone"];

function variableLibraryHTML(action){
  const groups=[["Cabinet","cabinet."],["Client","client."],["Responsable","responsable."],["Devis","devis."],["Mission","mission."],["Honoraires","honoraires."],["Conditions","conditions."],["Prévisionnel (NP 3400)","previ."],["Évaluation","eval."],["Situation intermédiaire","situ."],["Empreinte carbone","carbone."],["Sections","section."],["Réponses","rep."],["Autres","asset."]];
  return groups.map(([label,prefix])=>{const a=VARS_LIST.filter(v=>v.startsWith(prefix));return a.length?`<div class="var-group"><span class="label">${label}</span>${a.map(v=>`<button data-act="${action}" data-v="${v}">{{${v}}}</button>`).join("")}</div>`:"";}).join("");
}

function inlineRich(s){
  return String(s??"")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/__(.+?)__/g,"<u>$1</u>")
    .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g,"$1<em>$2</em>");
}
const gras = inlineRich;
function texteLibreHTML(txt,v){
  const packed=unpackRichText(txt);
  if(packed!==null){ const clean=sanitizeRichHTML(packed); return v?fill(clean,v):clean; }
  let safe=esc(String(txt||"")).replace(/\r\n?/g,"\n");
  if(v) safe=safe.replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi,(x,k)=>{
    const y=v[k];
    if(y===undefined) return `<span style="background:#FBE9A0">[${k}]</span>`;
    if(y===null) return "";
    return y===""?"…":String(y);
  });
  return safe.split(/\n{2,}/).map(p=>{
    const z=p.trim();
    if(/^<(div|table|section|ul|ol)\b/i.test(z)) return z;
    const L=p.split("\n"), nz=L.filter(l=>l.trim());
    if(nz.length&&nz.every(l=>/^(?:-|•)\s+/.test(l.trim())))
      return "<ul>"+nz.map(l=>`<li>${inlineRich(l.replace(/^\s*(?:-|•)\s+/,""))}</li>`).join("")+"</ul>";
    if(nz.length&&nz.every(l=>/^\d+[.)]\s+/.test(l.trim())))
      return "<ol>"+nz.map(l=>`<li>${inlineRich(l.replace(/^\s*\d+[.)]\s+/,""))}</li>`).join("")+"</ol>";
    return `<p>${inlineRich(L.join("<br>"))}</p>`;
  }).join("");
}
function fill(txt,v){
  let out=String(txt||"");
  for(let pass=0;pass<4;pass++){
    let changed=false;
    out=out.replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi,(x,k)=>{
      const y=v[k];
      if(y===undefined) return `<span style="background:#FBE9A0">[${k}]</span>`;
      changed=true;
      /* v47 : trois états distincts. `undefined` = variable inconnue (signalée
         en jaune) ; `""` = zone à compléter restée vide (marquée « … » pour
         que le lecteur voie qu'il manque une information) ; `null` = clause
         optionnelle volontairement écartée, qui disparaît sans trace. */
      if(y===null) return "";
      return y===""?"…":String(y);
    });
    if(!changed || !/\{\{\s*[a-z0-9_.]+\s*\}\}/i.test(out)) break;
  }
  return out;
}
function bloc2html(txt,v){
  const packed=unpackRichText(txt);
  if(packed!==null) return fill(sanitizeRichHTML(packed),v);
  return fill(txt,v).split(/\n{2,}/).map(p=>{
    const z=p.trim();
    if(/^<(div|table|section|ul|ol)\b/i.test(z)) return z;
    const L=p.split("\n"), nz=L.filter(l=>l.trim());
    if(nz.length&&nz.every(l=>/^(?:-|•)\s+/.test(l.trim())))
      return "<ul>"+nz.map(l=>`<li>${inlineRich(l.replace(/^\s*(?:-|•)\s+/,""))}</li>`).join("")+"</ul>";
    if(nz.length&&nz.every(l=>/^\d+[.)]\s+/.test(l.trim())))
      return "<ol>"+nz.map(l=>`<li>${inlineRich(l.replace(/^\s*\d+[.)]\s+/,""))}</li>`).join("")+"</ol>";
    return `<p>${inlineRich(L.join("<br>"))}</p>`;
  }).join("");
}
/* v47 : `opts.withObligations=false` retire le tableau de répartition des
   obligations. Les trames OEC des missions ponctuelles ne le prévoient qu'à
   titre facultatif (« le cas échéant ») ; les conditions générales prennent
   alors le rang d'annexe 1, conformément à ces trames. */
function lmContractAnnexesHTML(L,v,opts={}){
  const withObligations=opts.withObligations!==false;
  /* Les trames OEC des missions ponctuelles numérotent les conditions
     générales en annexe 1 et le tableau d'obligations, facultatif, en
     annexe 2. La trame comptable SERRE conserve l'ordre inverse. */
  const cgFirst=!!opts.cgFirst;
  const articles=(L?.articles||[]).filter(a=>a.actif!==false);
  const cgs=articles.filter(a=>/^cg\d+$/i.test(a.id||""));
  const tableArticle=articles.find(a=>a.id==="annexe");
  const tableTitle=tableArticle?fill(tableArticle.titre,v):"Tableau de répartition des obligations respectives";
  const rangCg=(cgFirst||!withObligations)?1:2;
  const rangTable=cgFirst?2:1;
  const blocTable=withObligations?`<section class="lm-annex-section">
      <div class="lm-annex-head"><div class="kicker">Annexe contractuelle ${rangTable}</div><h2>${tableTitle.replace(/^Annexes?\s*\d*\s*[—-]\s*/i,"")}</h2></div>
      <div class="lm-annex-intro">Répartition opérationnelle des travaux entre le cabinet et le client. Cette annexe fait partie intégrante de la lettre de mission.</div>
      ${v["annexe.obligations"]||lmObligationsHTML(null)}
    </section>`:"";
  return `<div class="lm-contract-annexes">
    ${cgFirst?"":blocTable}
    <section class="lm-cg">
      <div class="lm-annex-head"><div class="kicker">Annexe contractuelle ${rangCg}</div><h2>Conditions générales de la mission</h2></div>
      <div class="lm-annex-intro">Les présentes conditions générales font partie intégrante de la lettre de mission et s'appliquent avec les éventuelles stipulations particulières convenues entre les parties.</div>
      <div class="lm-cg-columns">${cgs.map(a=>{
        const titre=fill(a.titre,v).replace(/^Conditions générales\s*[—-]\s*/i,"");
        return `<article class="lm-cg-article"><div class="cg-title">${titre}</div>${bloc2html(a.corps,v)}</article>`;
      }).join("")}</div>
    </section>
    ${cgFirst?blocTable:""}
  </div>`;
}
function lmHTML(d,m){
  if(d?.frozenDocs?.lm) return thawFrozenHTML(d.frozenDocs.lm);
  const L=lettreOf(d); if(!L) return `<div class="doc">Aucune lettre de mission rattachée à ce modèle.</div>`;
  const v=LMVARS(d,m), c=st.cab, t=totaux(d,m);
  /* v47 : une trame ponctuelle (NP 3400, évaluation, situation) ne comporte
     ni durée d'exercice, ni tacite reconduction, ni préavis. */
  const ponctuelle=estNaturePonctuelle(natureKeyOf(d));
  /* Le tableau de répartition des obligations est facultatif dans les trames
     OEC ponctuelles : il n'est joint que si le dossier l'a retenu. */
  const avecObligations=!ponctuelle||!!v["mission.annexe2_active"];
  const skip=new Set(["annexe","conclusion"]);
  if(!t.exc.length && !String(v["mission.complementaires"]||"").trim()) skip.add("complementaires");
  if(!lmSectionRows(d,m,"Accompagnement en comptabilité").length) skip.add("compta");
  if(!lmSectionRows(d,m,"Nos outils collaboratifs et notre accompagnement en gestion").length) skip.add("gestion");
  if(!lmSectionRows(d,m,"Accompagnement en social").length) skip.add("social");
  if(!lmSectionRows(d,m,"Accompagnement en juridique").length) skip.add("juridique");
  if(!(totaux(d,m).debLignes||[]).some(x=>String(x.label||"").trim()||(+x.montant||0))) skip.add("debours");
  const articles=L.articles.filter(a=>a.actif!==false&&!/^cg\d+$/i.test(a.id||"")&&!skip.has(a.id));
  const conclusion=L.articles.find(a=>a.id==="conclusion"&&a.actif!==false);
  return `<div class="doc lm-doc">${enTete(d)}
    <section class="doc-hero">
      <div class="doc-kicker">Contrat écrit · Article 151 du code de déontologie</div>
      <div class="doc-title-row"><h1>${esc(intituleLettre(d))}</h1><div class="doc-ref-box"><span>Référence</span><strong>${esc(d.refLm||"À valider")}</strong>${numeroVersion(d)>1?`<span class="doc-version">Version ${numeroVersion(d)}</span>`:""}</div></div>
    </section>
    ${clientCardHTML(d, dateLettre(d))}
    <div class="lm-intro">${bloc2html(L.intro,v)}</div>
    <div class="lm-summary">
      <div><span>Nature de la mission</span><b>${esc(natureOf(d).t)}<small>Référentiel : ${esc(d.referentiel||REFERENTIEL_DEFAULT)}</small></b></div>
      ${ponctuelle
        ? `<div><span>Durée</span><b>Mission ponctuelle</b></div><div><span>Norme applicable</span><b>${esc(natureOf(d).norme.split(" — ")[0])}</b></div>`
        : `<div><span>Durée</span><b>${nb(d.duree)} mois${d.tacite?" · reconduction tacite":""}</b></div>`}
    </div>
    ${articles.map(a=>`<section class="lm-article ${esc(a.id||"")}"><div class="art-title">${fill(a.titre,v)}</div>${bloc2html(a.corps,v)}</section>`).join("")}
    <section class="lm-acceptance">
      <h2>Conclusion et acceptation de la mission</h2>
      <div class="acceptance-note">${conclusion?bloc2html(conclusion.corps,v):"La signature de la présente lettre emporte acceptation de ses annexes contractuelles."}</div>
      <div class="annex-list">${ponctuelle
        ? `<span class="annex-pill">Annexe 1 · Conditions générales</span>${avecObligations?`<span class="annex-pill">Annexe 2 · Répartition des obligations</span>`:""}`
        : `<span class="annex-pill">Annexe 1 · Répartition des obligations</span><span class="annex-pill">Annexe 2 · Conditions générales</span>`}</div>
      <div class="approval-grid">
        ${approvalBoxHTML({label:"Pour le cabinet",nom:c.signataire||"—",
          sous:[c.qualite||"",`Fait à ${c.ville||"…"}, le ${dateFR(dateLettre(d))}`],
          mention:"Signature"})}
        ${approvalBoxHTML({label:"Pour le client - Bon pour accord",nom:d.client.contact||"—",
          sous:[d.client.fonction||"",d.client.raison||""],
          mention:"Date, mention « Bon pour accord » et signature",ancre:true})}
      </div>
    </section>
    ${lmContractAnnexesHTML(L,v,{withObligations:avecObligations,cgFirst:ponctuelle})}
    ${pied()}</div>`;
}
function tabHonoraires(d,m){
  const h=honorairesParCategorie(d,m), t=h.t, names={"Comptabilité":"Honoraires comptables","Social":"Honoraires sociaux","Juridique":"Honoraires juridiques","Gestion":"Honoraires de gestion"}, cats=HONOR_CATS.filter(cat=>h.cats[cat].recAn||h.cats[cat].pon);
  return `<div class="notice" style="margin-bottom:13px">Cet onglet est le <b>seul endroit</b> où les honoraires se corrigent. Le questionnaire détermine le calcul prestation par prestation ; l’onglet Documents n’en donne qu’une synthèse en lecture seule.</div>
  ${categoryPricingEditorHTML(d,m)}<div class="card" style="margin-bottom:13px"><div class="hd">Bilan des honoraires par domaine</div><div class="bd"><div class="honor-grid">${cats.length?cats.map(cat=>{const c=h.cats[cat];return `<div class="honor-card"><div class="name">${names[cat]}</div>${c.recAn?`<div class="honor-row"><span>Récurrent annuel HT</span><b>${eur(c.recAn)}</b></div>`:""}${c.pon?`<div class="honor-row"><span>Ponctuel HT</span><b>${eur(c.pon)}</b></div>`:""}</div>`;}).join(""):`<div class="honor-empty">Aucun honoraire retenu.</div>`}</div></div></div>
  <div class="card"><div class="hd">Synthèse générale</div><div class="bd"><table>${t.recAn?`<tr><td>Honoraires récurrents annuels HT</td><td class="r num"><b>${eur(t.recAn)}</b></td></tr>`:""}${t.pon?`<tr><td>Missions ponctuelles HT</td><td class="r num"><b>${eur(t.pon)}</b></td></tr>`:""}<tr><td><b>Total honoraires HT</b></td><td class="r num"><b>${eur(t.ht)}</b></td></tr><tr><td>TVA</td><td class="r num">${eur(t.tva)}</td></tr><tr><td><b>Total honoraires TTC</b></td><td class="r num"><b>${eur(t.ttc)}</b></td></tr></table>
    ${t.deb?`<div class="notice" style="margin-top:11px"><b>Débours et frais refacturés : ${eur(t.deb)} HT</b><br>Facturés en sus des honoraires, hors total ci-dessus.${(t.debLignes||[]).length?`<ul style="margin:6px 0 0;padding-left:16px">${t.debLignes.filter(x=>String(x.label||"").trim()||(+x.montant||0)).map(x=>`<li>${esc(x.label)} — ${eur(x.montant)}</li>`).join("")}</ul>`:""}</div>`:""}</div></div>`;
}
/* =====================================================================
   v52 — DEUX FAÇONS DE FAIRE SIGNER, DITES CLAIREMENT
   ---------------------------------------------------------------------
   L'écran empilait un « suivi de signature — hors API » et une
   « signature automatisée — API », sans dire que ce sont deux chemins
   exclusifs pour un même dossier. On lisait donc les commandes des deux,
   dont la plupart sans objet. Le mode est désormais choisi explicitement
   et n'affiche que ses propres commandes.

   Le vocabulaire technique quitte le parcours métier : « API » devient
   « signature électronique », « payload » et « statut API » passent en
   diagnostic. Les contrôles et prérequis d'envoi — blocagesSignature,
   droits manager, verrou du dossier, enchaînement des étapes — sont
   rigoureusement les mêmes.
   ===================================================================== */
const MODES_SIGNATURE=[
  ["app","Envoi depuis SERRE","Le devis et la lettre partent d'ici en signature électronique ; les étapes se cochent d'elles-mêmes au retour."],
  ["hors","Envoi réalisé hors de SERRE","Courrier, courriel ou signature en rendez-vous : vous déclarez ici ce qui a été fait."]
];
function modeSignature(d){
  if(d?.modeSignature) return d.modeSignature;
  if(d?.sign?.id) return "app";
  if(manualSignState(d?.manualSign).sent) return "hors";
  return "";
}
/* Chronologie : ce que quelqu'un a déclaré d'un côté, ce que le service de
   signature a confirmé de l'autre. Les deux n'ont pas la même valeur et
   ne doivent pas se lire pareil. */
function chronologieSignature(d){
  const ms=manualSignState(d.manualSign), ev=[];
  const dec=(date,label)=>{ if(date) ev.push({date,label,source:"declare"}); };
  dec(ms.sentDate,"Documents transmis au client");
  dec(ms.quoteSignedDate,"Devis signé ou validé");
  dec(ms.acceptedDate,"Lettre d'acceptation signée");
  dec(ms.lmSignedDate,"Lettre de mission signée");
  dec(ms.filedDate,"Dossier classé");
  if(d.sign?.envoye) ev.push({date:d.sign.envoye,label:"Demande de signature électronique envoyée",source:"yousign"});
  if(d.sign?.signe)  ev.push({date:d.sign.signe,label:"Signature confirmée par le service de signature",source:"yousign"});
  for(const v of (d.versions||[])) if(v&&v.at) ev.push({date:String(v.at).slice(0,10),label:v.type==="signature"?`Version ${v.n} archivée à la signature`:`Version ${v.n} transmise au client`,source:"systeme"});
  return ev.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
}
function chronologieHTML(d){
  const ev=chronologieSignature(d);
  if(!ev.length) return "";
  const pastille={declare:["Déclaré","declare"],yousign:["Confirmé","confirme"],systeme:["Automatique","systeme"]};
  return `<details class="card" style="margin-bottom:13px" ${st.chronoOuverte?"open":""} data-chrono><summary class="hd"><span class="q-title">Chronologie du dossier</span><span class="spacer"></span><span class="tag gris">${ev.length}</span></summary><div class="bd">
    <div class="hint" style="margin-bottom:9px">« Déclaré » : saisi à la main par le cabinet. « Confirmé » : retourné par le service de signature électronique. « Automatique » : produit par l'application.</div>
    <ol class="chrono">${ev.map(e=>`<li class="chrono-${pastille[e.source][1]}"><span class="chrono-date mono">${dateFR(e.date)}</span><span class="chrono-label">${esc(e.label)}</span><span class="chrono-src">${pastille[e.source][0]}</span></li>`).join("")}</ol>
  </div></details>`;
}
function tabSign(d,m){
  const t=totaux(d,m), blocages=blocagesSignature(d), pret=blocages.length===0, avecLm=hasLettreMission(d);
  const ms=manualSignState(d.manualSign);
  const acceptationRequise=parcoursAcceptation(d);
  const labOk=labRempliPour(d), master=clientMasterOf(d);
  const nbEtapes=(ms.sent?1:0)+(ms.quoteSigned?1:0)+(acceptationRequise?((ms.accepted?1:0)+(labOk?1:0)):0)+(avecLm&&ms.lmSigned?1:0)+(ms.filed?1:0);
  const totalEtapes=(avecLm?4:3)+(acceptationRequise?2:0);
  const acceptationOk=!acceptationRequise||(ms.accepted&&labOk);
  const etat=ms.filed?["Parcours terminé","vert"]
    :(avecLm&&ms.lmSigned)?["À classer","ocre"]
    :(ms.quoteSigned&&acceptationOk)?[avecLm?"Lettre de mission à signer":"À classer","ocre"]
    :ms.quoteSigned?["Acceptation à formaliser","ocre"]
    :ms.sent?["Retour du client attendu","ocre"]:["Devis à envoyer","gris"];
  const prealableLm=ms.quoteSigned&&acceptationOk;
  const n=(()=>{ let i=2; const o={}; if(acceptationRequise){ o.accepted=++i; o.lab=++i; } o.lm=++i; o.filed=avecLm?++i:i; return o; })();
  const dateStep=v=>v?`<span class="ms-date">le ${dateFR(v)}</span>`:`<span class="ms-date">—</span>`;
  const signMessage=signatureMessageFor(d,m);
  const mode=modeSignature(d);
  const libelleEnvoi=mode==="app"?"Devis envoyé en signature électronique":"Devis transmis au client";

  const choixMode=`<div class="card" style="margin-bottom:13px"><div class="hd">Comment ce devis est-il signé ?</div><div class="bd">
    <div class="modes-signature">${MODES_SIGNATURE.map(([cle,titre,aide])=>`
      <button type="button" class="mode-carte ${mode===cle?"on":""}" data-mode-signature="${cle}" aria-pressed="${mode===cle?"true":"false"}">
        <span class="mode-titre">${esc(titre)}</span><span class="mode-aide">${esc(aide)}</span></button>`).join("")}</div>
    ${mode?`<div class="hint" style="margin-top:9px">${mode==="app"?"Les commandes d'envoi électronique sont affichées ci-dessous.":"Vous déclarez les étapes à la main ; aucun envoi n'est effectué depuis l'application."} <button class="btn sm ghost" data-mode-signature="">Changer de mode</button></div>`
      :`<div class="notice" style="margin-top:9px">Choisissez un mode pour n'afficher que les commandes correspondantes. Le parcours ci-dessous reste le même dans les deux cas.</div>`}
  </div></div>`;

  const parcours=`<div class="card" style="margin-bottom:13px">
    <div class="hd">Parcours administratif</div>
    <div class="bd">
      <div class="manual-head">
        <div><div class="hint">${mode==="app"?"Les étapes se cochent au retour du service de signature ; elles restent corrigibles à la main.":"Étapes déclarées par le cabinet, partagées entre les utilisateurs."}</div></div>
        <div class="manual-state"><span class="dim" style="font-size:11px">${ms.filed?"":"Prochaine étape"}</span><span class="tag ${etat[1]}">${etat[0]}</span><span class="mono">${nbEtapes}/${totalEtapes}</span></div>
      </div>
      <div class="manual-flow">
        <label class="manual-step ${ms.sent?"done":""}">
          <input type="checkbox" data-act="manualSignStep" data-step="sent" ${ms.sent?"checked":""} ${canRole("manager")?"":"disabled"}>
          <div><div class="ms-title">1. ${esc(libelleEnvoi)}</div><div class="ms-help">${canRole("manager")?"Le devis est parti chez le client.":"Réservé à un manager / associé."}</div></div>
          ${dateStep(ms.sentDate)}
        </label>
        <label class="manual-step ${ms.quoteSigned?"done":""}">
          <input type="checkbox" data-act="manualSignStep" data-step="quoteSigned" ${ms.quoteSigned?"checked":""} ${(ms.sent&&canRole("manager"))?"":"disabled"}>
          <div><div class="ms-title">2. Devis signé ou validé</div><div class="ms-help">${ms.sent?"Le devis a été signé ou validé par le client.":"À cocher une fois le devis transmis."}</div></div>
          ${dateStep(ms.quoteSignedDate)}
        </label>
        ${acceptationRequise?`<label class="manual-step ${ms.accepted?"done":""}">
          <input type="checkbox" data-act="manualSignStep" data-step="accepted" ${ms.accepted?"checked":""} ${(ms.quoteSigned&&canRole("manager"))?"":"disabled"}>
          <div><div class="ms-title">${n.accepted}. Lettre d'acceptation de la mission signée</div><div class="ms-help">${master?`La pièce d'acceptation de la fiche client, signée par ${esc(docSignataire()||"l'expert-comptable")}. Aucun autre document n'est établi ici.`
            :"Renseignez la dénomination du client pour créer sa fiche et établir l'acceptation de la mission."}</div>
            <div class="row" style="margin-top:6px">${master?`<button class="btn sm" data-client-open="${master.id}" data-client-open-tab="accept">Ouvrir l'acceptation</button><button class="btn ghost sm" data-act="qPrint" data-q="accept" data-devis="${d.id}">Imprimer</button><button class="btn ghost sm" data-act="qPdf" data-q="accept" data-devis="${d.id}">Télécharger en PDF</button>`
              :`<button class="btn sm" data-jump-tab="client" data-focus='[data-d="client.raison"]'>Compléter l'identification →</button>`}</div>
          </div>
          ${dateStep(ms.acceptedDate)}
        </label>
        <div class="manual-step derived ${labOk?"done":""}">
          <span class="ms-mark">${labOk?"✓":"—"}</span>
          <div><div class="ms-title">${n.lab}. Questionnaire anti-blanchiment rempli</div><div class="ms-help">${labOk?"Le questionnaire de la fiche client est complet."
            :master?`Questionnaire incomplet : ${labState(master).manquantes.length} question(s) sans réponse${labState(master).risquesManquants.length?`, ${labState(master).risquesManquants.length} niveau(x) de risque à déterminer`:""}.`
            :"Renseignez la dénomination du client pour créer sa fiche et remplir le questionnaire."}</div>
            ${labOk?"":`<div class="row" style="margin-top:6px">${master?`<button class="btn sm" data-client-open="${master.id}" data-client-open-tab="lab">Ouvrir le questionnaire</button>`:`<button class="btn sm" data-jump-tab="client" data-focus='[data-d="client.raison"]'>Compléter l'identification →</button>`}</div>`}
          </div>
          <span class="ms-date">${labOk?"déduit de la fiche client":"à compléter"}</span>
        </div>`:`<div class="notice" style="margin:0 0 9px">La lettre d'acceptation et le questionnaire anti-blanchiment ne font pas partie du parcours des missions ponctuelles, comptables comme juridiques.</div>`}
        ${avecLm?`<label class="manual-step ${ms.lmSigned?"done":""}">
          <input type="checkbox" data-act="manualSignStep" data-step="lmSigned" ${ms.lmSigned?"checked":""} ${(prealableLm&&canRole("manager"))?"":"disabled"}>
          <div><div class="ms-title">${n.lm}. Lettre de mission signée</div><div class="ms-help">La lettre de mission a été signée par le client.${(ms.quoteSigned&&!prealableLm)?" <b>Les deux étapes précédentes doivent être achevées.</b>":""}</div></div>
          ${dateStep(ms.lmSignedDate)}
        </label>`:""}
        <label class="manual-step ${ms.filed?"done":""}">
          <input type="checkbox" data-act="manualSignStep" data-step="filed" ${ms.filed?"checked":""} ${(((avecLm?ms.lmSigned:ms.quoteSigned)&&acceptationOk)&&canRole("manager"))?"":"disabled"}>
          <div><div class="ms-title">${n.filed}. Classé</div><div class="ms-help">Le dossier et les documents signés ont été classés.</div></div>
          ${dateStep(ms.filedDate)}
        </label>
      </div>
      ${!d.ref?`<div class="notice" style="margin-top:12px">Les références ${avecLm?"DEV et LM":"DEV"} doivent être attribuées avant un envoi en signature — onglet Documents. Le téléchargement PDF, lui, ne les attend pas.</div>`:""}
    </div>
  </div>`;

  const blocHors=`<div class="card" style="margin-bottom:13px"><div class="hd">Message d'accompagnement</div><div class="bd">
    <div class="hint" style="margin-bottom:7px">À coller dans votre courriel ou dans l'outil de signature que vous utilisez.</div>
    <div class="message-template">${esc(signMessage)}</div>
    <div class="row" style="margin-top:8px"><button class="btn sm p" data-act="copySignMessage">Copier le message</button>${canRole("admin")?`<button class="btn ghost sm" data-nav="yousign">Modifier les modèles</button>`:""}</div>
  </div></div>`;

  const blocApp=`<div class="card" style="margin-bottom:13px"><div class="hd">Signature électronique</div><div class="bd">
    <table class="synthese-table"><tbody>
      <tr><td>Signataire</td><td><b>${esc(d.client.contact||"—")}</b> · ${esc(d.client.email||"—")}${d.client.tel?` · ${esc(d.client.tel)}`:""}</td></tr>
      <tr><td>Documents</td><td>${avecLm?`Devis ${esc(d.ref||"—")} et lettre de mission ${esc(d.refLm||"—")}`:`Devis ${esc(d.ref||"—")}`}</td></tr>
      <tr><td>Montant</td><td class="num">${t.recMens?`${eur(t.recMens)} HT/mois · `:""}${eur(t.ht)} HT · ${eur(t.ttc)} TTC</td></tr>
      <tr><td>Vérification d'identité</td><td>${({no_otp:"Lien reçu par courriel",otp_email:"Code par courriel",otp_sms:"Code par SMS"})[st.ys.auth]||"—"}</td></tr>
      <tr><td>État de la demande</td><td>${d.sign.id?`<span class="tag ocre">${esc(d.sign.statut||"envoyée")}</span>${canRole("admin")?` <span class="mono dim">${esc(d.sign.id)}</span>`:""}`:"<span class='dim'>Aucune demande en cours</span>"}${st.ys.env!=="production"?` <span class="tag ocre" title="Les envois ne partent pas réellement">bac à sable</span>`:""}</td></tr>
    </tbody></table>
    ${!st.ys.proxy?`<div class="notice" style="margin-top:11px"><b>Service de signature non configuré</b><br>Le suivi déclaratif reste entièrement utilisable. ${canRole("admin")?`<button class="btn sm" data-nav="yousign">Configurer</button>`:"Voyez avec l'administrateur."}</div>`:""}
    ${st.ys.proxy&&blocages.length?`<div class="notice" style="margin-top:11px"><b>À compléter avant l'envoi</b><ul style="margin:6px 0 0 16px;padding:0">${blocages.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`:""}
    <div class="row" style="margin-top:11px">
      <button class="btn p" data-act="send" ${st.ys.proxy&&pret&&canRole("manager")&&!isDevisLocked(d)?"":"disabled"} title="${!st.ys.proxy?"Service non configuré":!canRole("manager")?"Réservé à un manager / associé":!pret?"Des éléments restent à compléter":isDevisLocked(d)?"Dossier verrouillé":"Transmettre au client pour signature"}">Envoyer en signature</button>
      <button class="btn" data-act="statut" ${d.sign.id?"":"disabled"} title="${d.sign.id?"Interroger le service de signature":"Aucune demande envoyée"}">Actualiser le suivi</button>
      <button class="btn" data-act="downloadSigned" ${d.sign.id&&d.sign.statut==="done"?"":"disabled"} title="${d.sign.id&&d.sign.statut==="done"?"Récupérer les documents signés":"Disponible une fois la signature achevée"}">Documents signés</button>
      ${canRole("admin")?`<details class="row-menu"><summary class="btn sm" title="Diagnostic">Diagnostic</summary><div class="menu-pop"><button data-act="payload">Voir la requête envoyée</button><button data-nav="outils">Ouvrir les outils internes</button></div></details>`:""}
    </div>
  </div></div>`;

  return `${choixMode}${parcours}${chronologieHTML(d)}${mode==="app"?blocApp:mode==="hors"?blocHors:""}`;
}
