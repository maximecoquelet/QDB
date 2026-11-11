/* ======================================================================
   v38 — Saisie et édition des questionnaires d'acceptation et LAB.

   Deux rendus pour un même jeu de données :
   - un formulaire de saisie sur la fiche client ;
   - un document imprimable reprenant la mise en page des imprimés du
     cabinet, destiné au dossier de travail.
   ====================================================================== */

/* --------------------------------------------------------- saisie écran */
function qBadge(n,total){ return `<span class="tag ${n>=total?"vert":"ocre"}">${n} / ${total}</span>`; }

function qAnswerCell(kind,q,value,options){
  return `<div class="q-opts">${options.map(([v,l])=>`<label class="q-opt ${value===v?"on":""}">
    <input type="radio" name="q_${esc(q.id)}" data-q-answer="${kind}" data-qid="${esc(q.id)}" value="${v}" ${value===v?"checked":""}>
    <span>${l}</span></label>`).join("")}</div>`;
}
function qRiskCell(kind,critere,value,levels){
  return `<div class="q-opts">${levels.map(([v,l])=>`<label class="q-opt ${value===v?"on":""}">
    <input type="radio" name="qr_${kind}_${esc(critere)}" data-q-risk="${kind}" data-critere="${esc(critere)}" value="${v}" ${value===v?"checked":""}>
    <span>${l}</span></label>`).join("")}</div>`;
}

/* ======================================================================
   v40 — La fiche client est organisée en onglets : l'identité, chacun des
   deux questionnaires, puis les notes et l'historique. Les compteurs sont
   portés par les onglets eux-mêmes, pour lire l'état sans les ouvrir.
   ====================================================================== */
const CLIENT_TABS=[
  ["identite","Identité et missions","1"],
  ["accept","Acceptation de la mission","2"],
  ["lab","Lutte anti-blanchiment","3"]
];
function clientTab(){ return CLIENT_TABS.some(t=>t[0]===st.clientTab)?st.clientTab:"identite"; }
function clientTabsHTML(c){
  const cur=clientTab(), acc=acceptState(c), lab=labState(c);
  const badge=key=>{
    if(key==="accept") return `<i class="tab-count ${acc.complet?"ok":""}">${acc.repondues}/${acc.total}</i>`;
    if(key==="lab") return `<i class="tab-count ${lab.complet?"ok":""}">${lab.repondues}/${lab.total}</i>`;
    return "";
  };
  return `<div class="tabs sticky-tabs">${CLIENT_TABS.map(([k,l,n])=>`<button data-client-tab="${k}" class="${cur===k?"on":""}"><i class="n">${n}</i>${esc(l)}${badge(k)}</button>`).join("")}</div>`;
}

/* Barre d'édition d'un questionnaire : document renseigné, ou exemplaire
   vierge à remplir à la main. */
function qDocActionsHTML(kind){
  return `<div class="q-doc-actions">
    <button class="btn sm" data-act="qPrint" data-q="${kind}">Imprimer / enregistrer en PDF</button>
    <button class="btn sm" data-act="qPdf" data-q="${kind}">Télécharger le PDF</button>
    <button class="btn ghost sm" data-act="qPreview" data-q="${kind}">Aperçu du document</button>
    <span class="spacer"></span>
    <button class="btn ghost sm" data-act="qPrint" data-q="${kind}" data-vierge="1" title="Imprimer l'imprimé à remplir à la main, sans aucune réponse">Exemplaire vierge</button>
  </div>`;
}
/* Menu « Imprimer un vierge », accessible sans ouvrir de fiche client. */
function blankQuestionnaireMenuHTML(){
  return `<details class="column-menu"><summary class="btn sm">Imprimés vierges</summary><div class="column-pop blank-pop">
    <button data-act="qPrint" data-q="accept" data-vierge="1">Acceptation de la mission</button>
    <button data-act="qPrint" data-q="lab" data-vierge="1">Lutte anti-blanchiment</button>
    <button data-act="qPrint" data-q="both" data-vierge="1">Les deux questionnaires</button>
    <button data-act="qPdf" data-q="accept" data-vierge="1">Acceptation — PDF</button>
    <button data-act="qPdf" data-q="lab" data-vierge="1">Anti-blanchiment — PDF</button>
  </div></details>`;
}

/* Questionnaire d'acceptation et de maintien — formulaire */
/* =====================================================================
   v52 — SOMMAIRE, REPLI ET COMPTEURS SUR LES DEUX QUESTIONNAIRES CLIENT
   ---------------------------------------------------------------------
   Le questionnaire de devis avait reçu ces repères ; l'acceptation et le
   LAB, plus longs encore, s'en passaient. Même mécanique, même mémoire de
   repli par poste. Rien des règles d'acceptation, de vigilance ou de
   complétude n'est touché : ce sont des aides de lecture.
   ===================================================================== */
const QCLI_STORAGE="serre.ui.q-client-sections.v1";
function qcliEtats(){ try{ return JSON.parse(localStorage.getItem(QCLI_STORAGE)||"{}")||{}; }catch(_){ return {}; } }
function qcliEnregistrer(id,ouvert){ try{ const x=qcliEtats(); x[id]=!!ouvert; localStorage.setItem(QCLI_STORAGE,JSON.stringify(x)); }catch(_){} }
function qcliOuverte(id){ const m=qcliEtats(); return Object.prototype.hasOwnProperty.call(m,id)?m[id]:true; }
/* Bloc de section repliable, commun aux deux questionnaires. */
function qSectionBloc(id,titre,corps,{compte=null,total=null,intro="",alerte=0}={}){
  const ouverte=qcliOuverte(id);
  const etat=total===null?"":`<span class="qsec-compte ${compte<total?"reste":""}">${compte}/${total}</span>`;
  return `<div class="q-section ${ouverte?"":"replie"}" id="qs-${esc(id)}">
    <div class="q-section-hd" data-qcli-bar="${esc(id)}" role="button" tabindex="0" aria-expanded="${ouverte?"true":"false"}" title="${ouverte?"Replier cette partie":"Déplier cette partie"}">
      <span class="qsec-plier"><span class="qsec-chevron">${ouverte?"▾":"▸"}</span><b>${esc(titre)}</b></span>
      <span class="spacer"></span>${alerte?`<span class="tag ocre">${alerte} vigilance(s)</span>`:""}${etat}
    </div>
    <div class="q-section-bd">${intro?`<div class="hint" style="margin:0 0 6px">${esc(intro)}</div>`:""}${corps}</div></div>`;
}
function qSommaireBloc(entrees){
  if(entrees.length<3) return "";
  return `<div class="q-sommaire"><span class="q-sommaire-titre">Sommaire</span><div class="sommaire-grid">${entrees.map(e=>`<button type="button" class="sommaire-item ${e.total===null?"":(e.compte<e.total?"reste":"ok")}" data-qcli-aller="${esc(e.id)}"><span class="sommaire-titre">${esc(e.titre)}</span><span class="sommaire-etat">${e.total===null?"":`${e.compte}/${e.total}`}</span></button>`).join("")}</div></div>`;
}
function acceptQuestionnaireFormHTML(c){
  ensureQuestionnaires(c);
  const acc=c.accept, s=acceptState(c), manager=canRole("manager");
  const sectionsHTML=ACCEPT_SECTIONS.map(sec=>{
    const rows=sec.questions.map(q=>{
      const applicable=acceptApplicable(c,q), value=acceptAnswerOf(c,q);
      if(!applicable) return `<div class="q-row muted"><div class="q-label">${esc(q.label)}<div class="hint">Sans objet : la question précédente n'est pas « Oui ».</div></div></div>`;
      return `<div class="q-row"><div class="q-label">${esc(q.label)}</div>
        <div class="q-answer">${qAnswerCell("accept",q,value,QA_OUI_NON)}</div>
        <div class="q-obs"><textarea rows="1" data-auto-haut data-q-obs="accept" data-qid="${esc(q.id)}" placeholder="Observations ou renvoi vers une feuille de travail">${esc(acc.observations[q.id]||"")}</textarea></div></div>`;
    }).join("");
    const app=sec.questions.filter(q=>acceptApplicable(c,q));
    const rep=app.filter(q=>acceptAnswerOf(c,q)).length;
    return {id:"acc-"+slug(sec.titre), titre:sec.titre, compte:rep, total:app.length,
      html:qSectionBloc("acc-"+slug(sec.titre),sec.titre,`<div class="q-rows">${rows}</div>`,{compte:rep,total:app.length,intro:sec.intro||""})};
  });

  const risquesFaits=ACCEPT_RISK_CRITERIA.filter(([k])=>acc.risk[k]).length;
  const risques={id:"acc-risques", titre:"Analyse des risques du client", compte:risquesFaits, total:ACCEPT_RISK_CRITERIA.length,
    html:qSectionBloc("acc-risques","Analyse des risques du client",
      `<div class="q-rows">${ACCEPT_RISK_CRITERIA.map(([k,l])=>`<div class="q-row"><div class="q-label">${esc(l)}</div>
      <div class="q-answer">${qRiskCell("accept",k,acc.risk[k]||"",ACCEPT_RISK_LEVELS)}</div>
      <div class="q-obs"><textarea rows="1" data-auto-haut data-q-riskcomment="accept" data-critere="${esc(k)}" placeholder="Commentaires">${esc(acc.riskComments[k]||"")}</textarea></div></div>`).join("")}</div>`,
      {compte:risquesFaits,total:ACCEPT_RISK_CRITERIA.length,intro:"Niveau de risque — E : élevé · M : moyen · F : faible"})};

  /* L'analyse des risques s'intercale après la prise de connaissance,
     comme dans le classeur du cabinet. */
  const sections=[...sectionsHTML];
  sections.splice(1,0,risques);
  const sommaire=qSommaireBloc(sections.map(x=>({id:x.id,titre:x.titre,compte:x.compte,total:x.total})));

  const groupes=[...new Set(ACCEPT_DECISIONS.map(x=>x.groupe))];
  const decision=`<div class="q-section"><div class="q-section-hd">Décision d'acceptation de la mission</div>
    <div class="hint" style="margin:0 0 8px">Partie réservée à l'expert-comptable. Après avoir pris connaissance des réponses formulées et des niveaux de risque identifiés :</div>
    ${manager?"":`<div class="notice" style="margin-bottom:8px">La décision est réservée à un manager / associé.</div>`}
    <div class="q-decision">${groupes.map(g=>`<div class="q-decision-group"><b>${esc(g)}</b>
      ${ACCEPT_DECISIONS.filter(x=>x.groupe===g).map(x=>`<label class="chk ${acc.decision===x.id?"on":""}"><input type="radio" name="q_decision" data-q-decision value="${x.id}" ${acc.decision===x.id?"checked":""} ${manager?"":"disabled"}><span>${esc(x.label)}</span></label>`).join("")}
    </div>`).join("")}</div>
    ${acc.decision?`<div class="hint" style="margin-top:7px">Décision enregistrée le ${acc.decisionAt?dateTimeFR(acc.decisionAt):"—"}${acc.decisionBy?` par ${esc(acc.decisionBy)}`:""}.</div>`:""}
    <label class="f" style="margin-top:10px"><span>Observations générales</span><textarea data-q-text="accept.observationsGenerales" placeholder="Observations générales sur l'acceptation ou le maintien du dossier">${esc(acc.observationsGenerales||"")}</textarea></label>
  </div>`;

  return `<div class="card questionnaire-card" data-q-panel="accept">
    <div class="hd"><span class="q-title">Questionnaire d'acceptation et de maintien de la mission</span><span class="spacer"></span>
      ${qBadge(s.repondues,s.total)}${s.decision?`<span class="tag ${s.favorable?"vert":"rouge"}">${esc(s.decision.label)}</span>`:`<span class="tag gris">Décision à prendre</span>`}</div>
    <div class="bd">
      ${qDocActionsHTML("accept")}
      ${sommaire}
      ${sections.map(x=>x.html).join("")}
      ${decision}
    </div></div>`;
}

/* Questionnaire de lutte contre le blanchiment — formulaire */
function labQuestionnaireFormHTML(c){
  ensureQuestionnaires(c);
  const lab=c.lab, s=labState(c), vig=labVigilancePoints(c);
  const sections=LAB_SECTIONS.map(sec=>{
    let alertes=0;
    const rows=sec.questions.map(q=>{
      const value=lab.answers[q.id]||"", alerte=value&&value!=="na"&&LAB_VIGILANCE[q.id]&&value!==LAB_VIGILANCE[q.id];
      if(alerte) alertes++;
      return `<div class="q-row ${alerte?"vigilance":""}" id="qrow-lab-${esc(q.id)}"><div class="q-label">${esc(q.label)}${alerte?`<div class="q-flag">Point de vigilance — à commenter et à pondérer dans le niveau de risque.</div>`:""}</div>
        <div class="q-answer">${qAnswerCell("lab",q,value,QA_OUI_NON_NA)}</div>
        <div class="q-obs q-obs-2"><textarea rows="1" data-auto-haut data-q-impact="lab" data-qid="${esc(q.id)}" placeholder="Impact">${esc(lab.impacts[q.id]||"")}</textarea><textarea rows="1" data-auto-haut data-q-obs="lab" data-qid="${esc(q.id)}" placeholder="Observations">${esc(lab.observations[q.id]||"")}</textarea></div></div>`;
    }).join("");
    const rep=sec.questions.filter(q=>lab.answers[q.id]).length;
    return {id:"lab-"+slug(sec.titre), titre:sec.titre, compte:rep, total:sec.questions.length, alertes,
      html:qSectionBloc("lab-"+slug(sec.titre),sec.titre,`<div class="q-rows">${rows}</div>`,{compte:rep,total:sec.questions.length,alerte:alertes})};
  });

  const risquesFaits=LAB_RISK_CRITERIA.filter(([k])=>lab.risk[k]).length;
  const risques={id:"lab-risques", titre:"Détermination du niveau de risque", compte:risquesFaits, total:LAB_RISK_CRITERIA.length,
    html:qSectionBloc("lab-risques","Détermination du niveau de risque",
      `<div class="q-rows">${LAB_RISK_CRITERIA.map(([k,l])=>`<div class="q-row ${k==="synthese"?"synthese":""}"><div class="q-label">${k==="synthese"?`<b>${esc(l)}</b>`:esc(l)}</div>
      <div class="q-answer">${qRiskCell("lab",k,lab.risk[k]||"",LAB_RISK_LEVELS)}</div>
      <div class="q-obs"><textarea rows="1" data-auto-haut data-q-riskcomment="lab" data-critere="${esc(k)}" placeholder="Commentaires">${esc(lab.riskComments[k]||"")}</textarea></div></div>`).join("")}</div>`,
      {compte:risquesFaits,total:LAB_RISK_CRITERIA.length})};

  return `<div class="card questionnaire-card" data-q-panel="lab">
    <div class="hd"><span class="q-title">Questionnaire en matière de lutte contre le blanchiment</span><span class="spacer"></span>
      ${qBadge(s.repondues,s.total)}${s.synthese?`<span class="tag ${LAB_RISK_RANK[s.synthese]>=2?"rouge":LAB_RISK_RANK[s.synthese]===1?"ocre":"vert"}">Risque ${esc(labRiskLabel(s.synthese).toLowerCase())}</span>`:`<span class="tag gris">Risque à déterminer</span>`}</div>
    <div class="bd">
      ${qDocActionsHTML("lab")}
      ${vig.length?`<div class="notice notice-vigilance" style="margin-bottom:11px"><b>${vig.length} point(s) de vigilance</b><br>Une réponse s'écarte de la situation attendue : renseignez l'impact et pondérez le niveau de risque en conséquence.
        <div class="vig-liste">${vig.map(q=>`<button type="button" class="btn sm" data-vig-aller="${esc(q.id)}" title="${esc(q.label)}">${esc(String(q.label).slice(0,54))}${String(q.label).length>54?"…":""}</button>`).join("")}</div></div>`:""}
      ${qSommaireBloc([...sections,risques].map(x=>({id:x.id,titre:x.titre,compte:x.compte,total:x.total})))}
      ${sections.map(x=>x.html).join("")}
      ${risques.html}
      <div class="q-section"><div class="q-section-hd">Conclusion</div>
        <label class="f"><span>Conclusion du questionnaire <span class="dim" style="font-weight:400">— facultatif</span></span><textarea data-q-text="lab.conclusion" placeholder="Conclusion sur le risque de blanchiment et les mesures de vigilance retenues">${esc(lab.conclusion||"")}</textarea><div class="hint">Commentaire libre de l'expert-comptable. Le questionnaire est réputé complet sans lui : il ne bloque ni le parcours de signature, ni le classement.</div></label>
        <div class="grid g2" style="margin-top:8px">
          <label class="f"><span>Fait le</span><input type="date" data-q-text="lab.faitLe" value="${esc(lab.faitLe||"")}"></label>
          <label class="f"><span>Signature et qualité du signataire</span><input type="text" data-q-text="lab.signataire" value="${esc(lab.signataire||"")}" placeholder="${esc(st.cab.signataire||"Nom et qualité")}"></label>
        </div>
      </div>
    </div></div>`;
}

/* Synthèse compacte, affichée sur la fiche client et reprise dans le devis */
function clientAcceptationSummaryHTML(c){
  ensureQuestionnaires(c);
  const lab=labState(c), acc=acceptState(c), pr=acceptationProgres(c);
  const etat=acceptationEtat({clientId:c.id}), blocages=etat.blocages, rappels=etat.rappels;
  return `<div class="card" data-acceptation-card><div class="hd">Acceptation et conformité du client ${helpTip("L'acceptation repose sur le questionnaire d'acceptation et sur une décision favorable de l'expert-comptable. Le questionnaire anti-blanchiment, établi dans le même mouvement, est rappelé ici sans bloquer l'envoi en signature.")}<span class="spacer"></span><span class="tag ${blocages.length?"ocre":"vert"}">${pr.pct} %</span></div><div class="bd">
    <div class="create-summary-row"><span>Questionnaire d'acceptation</span><b>${acc.repondues} / ${acc.total} réponses</b></div>
    <div class="create-summary-row"><span>Analyse des risques du client</span><b>${ACCEPT_RISK_CRITERIA.length-acc.risquesManquants.length} / ${ACCEPT_RISK_CRITERIA.length}</b></div>
    <div class="create-summary-row"><span>Questionnaire anti-blanchiment</span><b>${lab.repondues} / ${lab.total} réponses</b></div>
    <div class="create-summary-row"><span>Risque anti-blanchiment</span><b>${lab.synthese?esc(labRiskLabel(lab.synthese)):"À déterminer"}</b></div>
    <div class="create-summary-row"><span>Décision</span><b>${acc.decision?esc(acc.decision.label):"À formaliser"}</b></div>
    ${blocages.length?`<div class="notice" style="margin-top:11px"><b>À finaliser avant signature</b><ul class="q-blocs">${blocages.map(x=>`<li>${esc(confCap(x))}</li>`).join("")}</ul></div>`
      :`<div class="notice vert" style="margin-top:11px"><b>Dossier d'acceptation complet</b><br>Les devis de ce client peuvent être envoyés en signature.</div>`}
    ${rappels.length?`<div class="notice" style="margin-top:9px"><b>Questionnaire anti-blanchiment — à terminer</b><ul class="q-blocs">${rappels.map(x=>`<li>${esc(confCap(x))}</li>`).join("")}</ul><div class="hint" style="margin-top:5px">Ce rappel n'empêche ni l'acceptation, ni l'envoi en signature. Il reste une étape du parcours de signature.</div></div>`:""}
    <div class="row" style="margin-top:11px"><button class="btn sm" data-client-tab="accept">Ouvrir le questionnaire d'acceptation</button><button class="btn sm" data-client-tab="lab">Ouvrir le questionnaire LAB</button></div>
  </div></div>`;
}

/* ==============================================================
   v42 — Documents à la mise en page des devis.

   Les trois pièces (questionnaire d'acceptation, questionnaire LAB, lettre
   d'acceptation de la mission) reprennent l'en-tête, la zone destinataire,
   les sections et le pied des devis. Elles sont signées par le seul
   signataire du cabinet, avec l'ancre Yousign correspondante.
   ============================================================== */
const QUESTIONNAIRE_DOC_CSS = `
.doc .q-doc-note{font-family:var(--sans);font-size:7.6pt;color:var(--ink-70);line-height:1.5;margin:0 0 7pt}
.doc .q-tbl{width:100%;border-collapse:collapse;font-family:var(--sans);font-size:8pt}
.doc .q-tbl thead th{
  font-size:5.9pt;text-transform:uppercase;letter-spacing:.13em;font-weight:600;
  color:var(--accent);border-bottom:.6pt solid var(--rule);padding:0 4pt 4pt;text-align:left;
}
.doc .q-tbl thead th.c{text-align:center;width:8%}
.doc .q-tbl thead th.w-imp{width:15%}
.doc .q-tbl thead th.w-obs{width:23%}
.doc .q-tbl tbody td{border-bottom:.4pt solid var(--rule-2,#e8e2da);padding:4.5pt 4pt;vertical-align:top;line-height:1.42}
.doc .q-tbl tbody tr:last-child td{border-bottom:0}
.doc .q-tbl td.c{text-align:center}
.doc .q-tbl td.q-lbl{width:46%;color:var(--ink)}
.doc .q-tbl .q-sub{display:block;font-size:7pt;color:var(--graphite);margin-top:1.5pt}
.doc .q-mark{display:inline-block;box-sizing:border-box;width:9pt;height:9pt;border:.6pt solid var(--rule);
  border-radius:1.5pt;line-height:8pt;text-align:center;font-size:7pt;font-weight:700;color:var(--accent)}
.doc .q-mark.on{border-color:var(--accent);background:var(--accent-tint)}
.doc .q-field{display:block;min-height:9pt;border-bottom:.4pt dotted var(--rule);font-size:7.4pt}
.doc .q-risk-head{font-size:5.9pt;text-transform:uppercase;letter-spacing:.13em;font-weight:600;color:var(--accent)}
/* v45 — une rubrique n'est jamais coupée par un saut de page. L'insécable
   est porté par un bloc intérieur : la rubrique bascule d'un seul tenant à
   la page suivante, sans laisser derrière elle le filet d'accent de son
   titre — ce que faisait un insécable posé sur la section elle-même. */
.doc .rubrique{break-inside:avoid;page-break-inside:avoid}
/* Le filet d'accent est peint sous le titre, en fin de bloc, et non
   au-dessus : un moteur d'impression qui repousse la rubrique à la page
   suivante peint malgré tout ce qui se trouve en tête de bloc, et laissait
   un trait orphelin au bas de la page précédente. */
.doc .rubrique>h2{padding-top:0;margin:22pt 0 7pt}
.doc .rubrique>h2::before{content:none!important}
.doc .rubrique>h2::after{content:"";display:block;width:13mm;height:1.8pt;background:var(--accent);margin-top:5pt}
.doc .rubrique:first-of-type>h2,.doc .offer-section:first-of-type>.rubrique>h2{margin-top:14pt}
.doc .q-free{break-inside:avoid;page-break-inside:avoid;border:.6pt solid var(--rule);background:var(--paper-2);padding:7pt 8pt;font-family:var(--sans);
  font-size:8pt;line-height:1.5;white-space:pre-wrap;min-height:22mm;color:var(--ink-70)}
.doc .q-free.tall{min-height:46mm}
.doc .q-flagged td.q-lbl{color:var(--ink)}
.doc .q-flagged td.q-lbl .q-sub{color:var(--accent)}
.doc .q-lettre p{font-family:var(--sans);font-size:8.6pt;line-height:1.62;margin:0 0 7pt;color:var(--ink-70)}
.doc .q-lettre p strong,.doc .q-lettre p b{color:var(--ink)}
.doc .q-lettre ul{font-family:var(--sans);font-size:8.4pt;line-height:1.55;margin:0 0 8pt;padding-left:12pt}
.doc .q-lettre li{margin:0 0 3pt}
.doc .q-recap{width:100%;border-collapse:collapse;font-family:var(--sans);font-size:8pt;margin:0 0 8pt}
.doc .q-recap td{border-bottom:.4pt solid var(--rule);padding:4pt 4pt}
.doc .q-recap td:last-child{text-align:right;font-weight:600;color:var(--ink)}
`;

const qMark = on => `<span class="q-mark ${on?"on":""}">${on?"X":"&nbsp;"}</span>`;
/* Exemplaire vierge : une fiche client neuve, jamais enregistrée. */
function blankQuestionnaireClient(){ return ensureQuestionnaires({id:"",raison:""}); }
/* « maxime.coquelet » → « Maxime Coquelet » pour les lignes de signature. */
function qdSignataire(v){
  const x=String(v||"").split("@")[0].replace(/[._-]+/g," ").trim();
  return x?x.replace(/\b\p{L}/gu,ch=>ch.toUpperCase()):"";
}
/* Formule d'appel : « Monsieur Pierre Martin » quand la civilité est connue,
   « Madame, Monsieur » sinon. */
function qdocSalutation(d,vierge){
  if(vierge) return "Madame, Monsieur";
  const civ=String(d?.client?.civilite||"").trim(), nom=String(d?.client?.contact||"").trim();
  if(nom && (civ==="Madame"||civ==="Monsieur")) return `${civ} ${nom}`;
  return civ||"Madame, Monsieur";
}
/* Signataire unique de ces pièces : celui du cabinet. */
function docSignataire(){ return String(st.cab.signataire||"").trim()||CAB_DEF.signataire; }

/* Zone destinataire, reprise du devis mais pilotée par la fiche client. */
function qdocAddressHTML(c,dateStr,vierge){
  const parts=[];
  if(!vierge){
    if(c?.contact) parts.push(`${esc(c.contact)}${c.fonction?`, ${esc(c.fonction)}`:""}`);
    if(c?.adresse) parts.push(esc(c.adresse));
    if(c?.cp||c?.ville) parts.push(`${esc(c.cp||"")} ${esc(c.ville||"")}`.trim());
    if(c?.siren) parts.push(`SIREN ${esc(sirenKey(c.siren))}`);
  }
  const lieu=st.cab.ville?esc(st.cab.ville):"";
  const pd=vierge?`${lieu?lieu+", le ":"Le "}…………………`:(dateStr?`${lieu?lieu+", le ":"Le "}${dateStr}`:"");
  return `<div class="doc-address">
    <div class="doc-place-date">${pd}</div>
    <div class="doc-recipient"><span class="label">Client concerné</span><strong>${vierge?"&nbsp;":esc(c?.raison||"[Client]")}</strong>${parts.join("<br>")}</div>
  </div>`;
}
/* Bloc de signature du cabinet, seul signataire, avec l'ancre Yousign. */
function qdocSignatureHTML({titre,mention,ancre=true,date=""}){
  return approvalSectionHTML(titre,[approvalBoxHTML({
    label:"Pour le cabinet — signataire unique",
    nom:docSignataire()||"—",
    sous:[st.cab.qualite||"Expert-comptable",date?`Fait à ${st.cab.ville||"…"}, le ${date}`:""],
    mention:mention||"Date et signature",
    ancre
  })]);
}
function qdocHeroHTML({kicker,titre,ref,meta=[]}){
  return `<section class="doc-hero">
    <div class="doc-kicker">${esc(kicker)}</div>
    <div class="doc-title-row"><h1>${esc(titre)}</h1>${ref?`<div class="doc-ref-box"><span>Référence</span><strong>${esc(ref)}</strong></div>`:""}</div>
    ${meta.length?`<div class="doc-meta-grid">${meta.map(([l,v])=>`<div class="doc-meta-item"><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join("")}</div>`:""}
  </section>`;
}

/* --------------------------- questionnaire d'acceptation (interne) ---- */
function acceptQuestionnaireDocHTML(c,vierge){
  ensureQuestionnaires(c);
  const acc=vierge?acceptDefaults():c.accept, s=vierge?null:acceptState(c);
  const dec=vierge?null:acceptDecision(acc.decision);
  const bloc=sec=>{
    const rows=sec.questions.map(q=>{
      const value=vierge?"":acceptAnswerOf(c,q);
      const applicable=vierge||acceptApplicable(c,q);
      return `<tr><td class="q-lbl">${esc(q.label)}</td>
        <td class="c">${qMark(applicable&&value==="oui")}</td>
        <td class="c">${qMark(applicable&&value==="non")}</td>
        <td>${vierge?`<span class="q-field">&nbsp;</span>`:esc(acc.observations[q.id]||"")}</td></tr>`;
    }).join("");
    return `<section class="offer-section"><div class="rubrique"><h2>${esc(sec.titre)}</h2>
      ${sec.intro?`<div class="q-doc-note">${esc(sec.intro)}</div>`:""}
      <table class="q-tbl"><thead><tr><th>Question</th><th class="c">Oui</th><th class="c">Non</th><th class="w-obs">Observations</th></tr></thead>
      <tbody>${rows}</tbody></table></div></section>`;
  };
  const risques=`<section class="offer-section"><div class="rubrique"><h2>Analyse des risques du client</h2>
    <div class="q-doc-note">Niveau de risque — E : élevé · M : moyen · F : faible</div>
    <table class="q-tbl"><thead><tr><th>Critère</th>${ACCEPT_RISK_LEVELS.map(([v])=>`<th class="c">${v}</th>`).join("")}<th class="w-obs">Commentaires</th></tr></thead>
    <tbody>${ACCEPT_RISK_CRITERIA.map(([k,l])=>`<tr><td class="q-lbl">${esc(l)}</td>
      ${ACCEPT_RISK_LEVELS.map(([v])=>`<td class="c">${qMark(!vierge&&acc.risk[k]===v)}</td>`).join("")}
      <td>${vierge?`<span class="q-field">&nbsp;</span>`:esc(acc.riskComments[k]||"")}</td></tr>`).join("")}</tbody></table></div></section>`;
  const bySec=id=>bloc(ACCEPT_SECTIONS.find(x=>x.id===id));
  const groupes=[...new Set(ACCEPT_DECISIONS.map(x=>x.groupe))];
  return `<div class="doc${vierge?" qd-vierge":""}">${enTete()}
    ${qdocHeroHTML({kicker:"Pièce du dossier de travail",titre:"Acceptation et maintien de la mission",
      meta:[["Cabinet",st.cab.nom||"—"],["Avancement",vierge?"exemplaire vierge":`${s.repondues} / ${s.total} réponses`]]})}
    ${qdocAddressHTML(c,dateFR(today()),vierge)}
    ${bySec("connaissance")}
    ${risques}
    ${bySec("besoins")}
    ${bySec("faisabilite")}
    ${bySec("blanchiment")}
    ${bySec("confrere")}
    <section class="offer-section"><div class="rubrique"><h2>Décision d'acceptation de la mission</h2>
      <div class="q-doc-note">Partie réservée à l'expert-comptable. Après avoir pris connaissance des réponses formulées sur ce questionnaire, compte tenu de la connaissance acquise de l'entité et notamment des zones et des niveaux de risque identifiés :</div>
      <table class="q-tbl"><tbody>${groupes.map(g=>`<tr><td class="q-lbl"><b>${esc(g)}</b></td><td colspan="3">${ACCEPT_DECISIONS.filter(x=>x.groupe===g).map(x=>`<div>${qMark(!vierge&&acc.decision===x.id)} ${esc(x.label)}</div>`).join("")}</td></tr>`).join("")}</tbody></table>
    </div></section>
    <section class="offer-section"><div class="rubrique"><h2>Observations générales</h2><div class="q-free tall">${vierge?"":esc(acc.observationsGenerales||"")}</div></div></section>
    ${qdocSignatureHTML({titre:"Décision de l'expert-comptable",mention:dec&&!vierge?`Décision : ${dec.label}`:"Date et signature",date:(!vierge&&acc.decisionAt)?dateFR(String(acc.decisionAt).slice(0,10)):""})}
    ${pied()}</div>`;
}

/* ----------------------- questionnaire anti-blanchiment (interne) ----- */
function labQuestionnaireDocHTML(c,vierge){
  ensureQuestionnaires(c);
  const lab=vierge?labDefaults():c.lab, s=vierge?null:labState(c);
  const bloc=sec=>{
    const rows=sec.questions.map(q=>{
      const value=vierge?"":(lab.answers[q.id]||"");
      const alerte=!vierge&&value&&value!=="na"&&LAB_VIGILANCE[q.id]&&value!==LAB_VIGILANCE[q.id];
      return `<tr class="${alerte?"q-flagged":""}"><td class="q-lbl">${esc(q.label)}${alerte?`<span class="q-sub">Point de vigilance — pondéré dans le niveau de risque.</span>`:""}</td>
        <td class="c">${qMark(value==="oui")}</td><td class="c">${qMark(value==="non")}</td><td class="c">${qMark(value==="na")}</td>
        <td>${vierge?`<span class="q-field">&nbsp;</span>`:esc(lab.impacts[q.id]||"")}</td>
        <td>${vierge?`<span class="q-field">&nbsp;</span>`:esc(lab.observations[q.id]||"")}</td></tr>`;
    }).join("");
    return `<section class="offer-section"><div class="rubrique"><h2>${esc(sec.titre)}</h2>
      <table class="q-tbl"><thead><tr><th>Point de vigilance</th><th class="c">Oui</th><th class="c">Non</th><th class="c">NA</th><th class="w-imp">Impact</th><th class="w-obs">Observations</th></tr></thead>
      <tbody>${rows}</tbody></table></div></section>`;
  };
  return `<div class="doc${vierge?" qd-vierge":""}">${enTete()}
    ${qdocHeroHTML({kicker:"Pièce du dossier de travail",titre:"Lutte contre le blanchiment",
      meta:[["Cabinet",st.cab.nom||"—"],["Avancement",vierge?"exemplaire vierge":`${s.repondues} / ${s.total} réponses`],
            ["Risque retenu",vierge?"—":(s.synthese?labRiskLabel(s.synthese):"à déterminer")]]})}
    ${qdocAddressHTML(c,vierge?"":(lab.faitLe?dateFR(lab.faitLe):dateFR(today())),vierge)}
    ${LAB_SECTIONS.map(bloc).join("")}
    <section class="offer-section"><div class="rubrique"><h2>Détermination du niveau de risque</h2>
      <table class="q-tbl"><thead><tr><th>Critère</th>${LAB_RISK_LEVELS.map(([,l])=>`<th class="c">${l}</th>`).join("")}<th class="w-obs">Commentaires</th></tr></thead>
      <tbody>${LAB_RISK_CRITERIA.map(([k,l])=>`<tr><td class="q-lbl">${k==="synthese"?`<b>${esc(l)}</b>`:esc(l)}</td>
        ${LAB_RISK_LEVELS.map(([v])=>`<td class="c">${qMark(!vierge&&lab.risk[k]===v)}</td>`).join("")}
        <td>${vierge?`<span class="q-field">&nbsp;</span>`:esc(lab.riskComments[k]||"")}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="offer-section"><div class="rubrique"><h2>Conclusion</h2><div class="q-free tall">${vierge?"":esc(lab.conclusion||"")}</div></div></section>
    ${qdocSignatureHTML({titre:"Conclusion de l'expert-comptable",mention:"Signature et qualité du signataire",date:(!vierge&&lab.faitLe)?dateFR(lab.faitLe):""})}
    ${pied()}</div>`;
}

/* v43 : deux pièces, et deux seulement. Elles sont portées par la fiche
   client — aucun document d'acceptation n'est établi au niveau du dossier.
   L'étape « lettre d'acceptation » du parcours de signature édite la pièce
   d'acceptation de la fiche client, pas une autre. */
const QUESTIONNAIRE_DOCS = {
  lab:{ titre:"Questionnaire anti-blanchiment", fichier:"questionnaire-lab", html:labQuestionnaireDocHTML },
  accept:{ titre:"Questionnaire d'acceptation", fichier:"questionnaire-acceptation", html:acceptQuestionnaireDocHTML }
};
/* `vierge` produit l'imprimé à remplir à la main : aucune réponse, identité
   du client à compléter, et toutes les questions présentes. */
function questionnaireDocHTML(kind,c,vierge){
  const def=QUESTIONNAIRE_DOCS[kind];
  if(!def) return "";
  const cible=vierge?blankQuestionnaireClient():c;
  return cible?def.html(cible,!!vierge):"";
}
function questionnaireDocFilename(kind,c,vierge){
  const def=QUESTIONNAIRE_DOCS[kind]||{fichier:"questionnaire"};
  if(vierge) return `${def.fichier}-vierge`;
  const nom=normClient(c?.raison||"client").replace(/\s+/g,"-").slice(0,40)||"client";
  return `${def.fichier}-${nom}`;
}
