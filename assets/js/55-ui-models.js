/* ============================================= éditeur de modèles */
function modelDatesHTML(m){ return `<span class="model-dates">${m.modifiedAt?`Modifié ${dateTimeFR(m.modifiedAt)}`:""}${m.publishedAt?` · Publié ${dateTimeFR(m.publishedAt)}`:""}</span>`; }
function conditionHuman(m,node){
  const rule=Array.isArray(node?.showIf)?node.showIf[0]:node?.showIf;
  if(!rule?.cle) return "";
  const src=m?.sections?.flatMap(s=>s.items||[]).find(it=>(it.cle||slug(it.label))===rule.cle);
  if(!src) return `si ${rule.cle}`;
  if(Array.isArray(rule.n)){
    const labels=(src.reponses||[]).filter((r,i)=>rule.n.map(Number).includes(Number(r.n!==null&&r.n!==undefined&&r.n!==""?r.n:i))).map(r=>r.label);
    return `si ${src.label} = ${labels.join(" / ")||rule.n.join("/")}`;
  }
  return `si ${src.label}`;
}
function conditionBadge(m,node){
  const x=conditionHuman(m,node); return x?`<span class="tag gris" style="padding:1px 5px;text-transform:none;letter-spacing:0" title="Affichage conditionnel">${esc(x)}</span>`:"";
}

function conditionNode(kind){
  const m=curMod();if(!m)return null;
  if(kind==="section")return m.sections.find(s=>s.id===st.secId)||null;
  const s=m.sections.find(s=>s.id===st.secId);return s?.items.find(i=>i.id===st.itemId)||null;
}
function conditionEditorHTML(m,node,kind){
  const rule=Array.isArray(node?.showIf)?node.showIf[0]:(node?.showIf||null),sources=m.sections.flatMap(s=>s.items||[]).filter(it=>it!==node&&["liste","ouinon","nombre"].includes(it.type)),src=rule?.cle?sources.find(it=>(it.cle||slug(it.label))===rule.cle):null;
  return `<div class="condition-editor"><div class="title">Règle d'affichage ${helpTip("La section ou prestation ne s'affiche que si la condition est satisfaite. Cette règle est également prise en compte dans les calculs.")}</div>
    <div class="grid g2"><label class="f"><span>Question source</span><select data-act="condSource" data-kind="${kind}"><option value="">— Toujours afficher —</option>${sources.map(it=>`<option value="${esc(it.cle||slug(it.label))}" ${rule?.cle===(it.cle||slug(it.label))?"selected":""}>${esc(it.label)}</option>`).join("")}</select></label>
    ${src&&["liste","ouinon"].includes(src.type)?`<div class="f"><span>Réponses autorisées</span><div class="var-group">${(src.reponses||[]).map((r,i)=>{const n=Number(r.n!==null&&r.n!==undefined&&r.n!==""?r.n:i),on=Array.isArray(rule?.n)&&rule.n.map(Number).includes(n);return `<label class="chk" style="margin:0"><input type="checkbox" data-act="condValue" data-kind="${kind}" data-n="${n}" ${on?"checked":""}><span>${esc(r.label)}</span></label>`;}).join("")}</div></div>`:""}
    ${src?.type==="nombre"?`<label class="f"><span>Minimum</span><input type="number" data-act="condRange" data-kind="${kind}" data-k="min" value="${rule?.min??""}"></label><label class="f"><span>Maximum</span><input type="number" data-act="condRange" data-kind="${kind}" data-k="max" value="${rule?.max??""}"></label>`:""}</div>
    ${rule?.cle?`<div class="row" style="margin-top:7px"><span class="hint">${esc(conditionHuman(m,node))}</span><button class="btn ghost sm" data-act="condClear" data-kind="${kind}">Supprimer la condition</button></div>`:""}
  </div>`;
}

/* =====================================================================
   v52 — UNE LISTE AVANT L'ÉDITEUR
   ---------------------------------------------------------------------
   On atterrissait directement dans l'éditeur du premier modèle, sans
   avoir vu ce que contenait le référentiel. La liste montre d'abord les
   modèles, leur état et leur dernière modification ; l'éditeur ne s'ouvre
   que sur celui qu'on a choisi. Brouillon, publication et archivage sont
   inchangés.
   ===================================================================== */
function ligneReferentiel({id,nom,statut,maj,info,actions}){
  const lib=statut==="publie"?"Publié":statut==="archive"?"Archivé":"Brouillon";
  const cls=statut==="publie"?"vert":statut==="archive"?"gris":"ocre";
  return `<tr><td><b>${esc(nom)}</b>${info?`<div class="dim" style="font-size:12.5px">${info}</div>`:""}</td>
    <td><span class="tag ${cls}">${lib}</span></td>
    <td class="dim">${maj?dateTimeFR(maj):"—"}</td>
    <td class="r"><div class="row" style="gap:6px;justify-content:flex-end">${actions}</div></td></tr>`;
}
function listeReferentielHTML({titre,sous,recherche,attrRecherche,lignes,actionsEntete,vide}){
  return `<div class="top"><h1>${esc(titre)}</h1><span class="sub">${esc(sous)}</span><span class="spacer"></span>${actionsEntete}</div>
  <div class="wrap"><div class="card"><div class="bd">
    <label class="f" style="max-width:340px;margin-bottom:11px"><span>Rechercher</span><input type="text" ${attrRecherche} value="${esc(recherche||"")}" placeholder="Nom, état…" autocomplete="off"></label>
    ${lignes.length?`<table class="referentiel-table"><thead><tr><th>Nom</th><th>État</th><th>Dernière modification</th><th></th></tr></thead><tbody>${lignes.join("")}</tbody></table>`
      :`<div class="empty-state"><b>${esc(vide)}</b><small>Ajustez la recherche ou créez un nouvel élément.</small></div>`}
  </div></div></div>`;
}
VIEWS.modeles = () => {
  if(st.modVue!=="editeur"){
    const q=normLabel(st.modListeQ||"");
    const arr=[...st.modeles].filter(m=>!q||normLabel(`${m.titre} ${m.desc} ${m.statut}`).includes(q))
      .sort((a,b)=>String(b.modifiedAt||"").localeCompare(String(a.modifiedAt||"")));
    const lignes=arr.map(m=>{
      const nb=st.devis.filter(d=>d.modeleId===m.id).length;
      return ligneReferentiel({id:m.id,nom:m.titre,statut:m.statut,maj:m.modifiedAt,
        info:`${esc(m.desc||"")}${m.desc?" · ":""}${(m.sections||[]).length} section(s) · ${nb} dossier(s)`,
        actions:`<button class="btn sm p" data-act="modOuvrir" data-id="${m.id}">Ouvrir</button><button class="btn sm" data-act="modRenommer" data-id="${m.id}">Renommer</button><button class="btn sm" data-act="modDup" data-id="${m.id}">Dupliquer</button>`});
    });
    return listeReferentielHTML({titre:"Modèles de devis",sous:`${st.modeles.length} modèle(s) au référentiel`,
      recherche:st.modListeQ,attrRecherche:'data-mod-liste-q',lignes,
      actionsEntete:`<button class="btn p" data-act="modNew">Nouveau modèle</button>`,vide:"Aucun modèle ne correspond"});
  }
  const m=curMod(); if(!m) return `<div class="top"><h1>Modèles de devis</h1><span class="spacer"></span><button class="btn p" data-act="modNew">Nouveau modèle</button></div><div class="wrap"><div class="empty"><b>Aucun modèle</b></div></div>`;
  const sec=m.sections.find(s=>s.id===st.secId), item=sec?sec.items.find(i=>i.id===st.itemId):null, q=normLabel(st.modSearch);
  const visibleSections=m.sections.filter(s=>!q||normLabel(`${s.titre} ${s.tag}`).includes(q)||s.items.some(it=>normLabel(`${it.label} ${it.type} ${it.cle}`).includes(q)));
  const statusLabel=m.statut==="publie"?"Publié":m.statut==="archive"?"Archivé":"Brouillon", statusClass=m.statut==="publie"?"vert":"gris";
  return `<div class="top"><button class="btn sm ghost" data-act="modListe">← Tous les modèles</button><h1>Édition de modèle de devis</h1><span class="tag ${statusClass}">${statusLabel}</span>${m.replacesModelId&&m.statut==="brouillon"?`<span class="tag ocre">Version de test</span>`:""}${modelDatesHTML(m)}<span class="spacer"></span>${saveIndicatorHTML()}
    <select data-act="modPick" style="width:230px">${st.modeles.map(x=>`<option value="${x.id}" ${x.id===m.id?"selected":""}>${esc(x.titre)}${x.statut==="archive"?" · archivé":""}</option>`).join("")}</select>
    ${m.statut==="publie"?`<button class="btn" data-act="modDraftVersion">Créer version de test</button>`:m.statut==="archive"?`<span class="hint">Version archivée — utilisée uniquement par les dossiers historiques.</span>`:`<button class="btn" data-act="modPub">Publier</button>`}
    <button class="btn" data-act="modDup">Dupliquer</button><button class="btn" data-act="modNew">Nouveau</button><label class="btn" style="cursor:pointer">Importer Excel<input type="file" accept=".xlsx,.xls,.csv" data-act="modelExcelImport" style="display:none"></label><button class="btn ghost sm" data-act="modelExcelTemplate">Format Excel</button>${st.modeles.length>1?`<button class="btn danger sm" data-act="modDel">Corbeille</button>`:""}</div>
  <div class="wrap"><div class="card" style="margin-bottom:14px"><div class="bd grid g2"><label class="f"><span>Titre du modèle de devis</span><input type="text" data-act="modF" data-k="titre" value="${esc(m.titre)}"></label><label class="f"><span>Description</span><input type="text" data-act="modF" data-k="desc" value="${esc(m.desc||"")}"></label><label class="f"><span>Lettre de mission rattachée ${helpTip("La lettre marquée OEC 2025 est la trame recommandée. Le modèle conserve son propre rattachement.")}</span><select data-act="modF" data-k="lmId"><option value="">— aucune —</option>${st.lettres.filter(l=>l.statut==="publie"||l.id===m.lmId).map(l=>`<option value="${l.id}" ${m.lmId===l.id?"selected":""}>${esc(l.nom)}${l.statut!=="publie"?" — BROUILLON":l.sourceVersion===LM_VERSION?" — RECOMMANDÉE / OEC 2025":" — personnalisée"}</option>`).join("")}</select><div class="hint">Sauf besoin volontaire d'une trame personnalisée, choisissez la lettre marquée <b>RECOMMANDÉE / OEC 2025</b>. Les anciennes lettres sont conservées pour ne pas écraser vos personnalisations.</div></label><div class="grid g3"><label class="f"><span>TVA par défaut</span><select data-act="modF" data-k="tva">${[0,5.5,10,20].map(t=>`<option value="${t}" ${+m.tva===t?"selected":""}>${t} %</option>`).join("")}</select></label><label class="f"><span>Devise</span><select data-act="modF" data-k="devise"><option>EUR</option></select></label><label class="f"><span>Périodicité des prestations paramétrables</span><select data-act="modF" data-k="per">${PERS.map(([a,b])=>`<option value="${a}" ${m.per===a?"selected":""}>${b}</option>`).join("")}</select></label></div></div></div>
    ${lmRulesCardHTML(m)}
    ${modelConsistencyHTML(m)}
    <div class="ed"><div class="card tree"><div class="hd">Sections et prestations <span class="spacer"></span><span class="hint" style="text-transform:none;letter-spacing:0">Glisser-déposer pour réordonner</span></div><div class="tree-tools"><input data-mod-search type="text" value="${esc(st.modSearch)}" placeholder="Rechercher une section ou une prestation…"></div>
      ${visibleSections.map((s,si0)=>{const si=m.sections.indexOf(s),collapsed=!!st.modCollapsed[s.id]&&!q, items=s.items.filter(it=>!q||normLabel(`${it.label} ${it.type} ${it.cle}`).includes(q)||normLabel(`${s.titre} ${s.tag}`).includes(q));return `<div class="tsec" draggable="true" data-drag-sec="${s.id}" data-drop-sec="${s.id}"><div class="t ${st.secId===s.id&&!st.itemId?"on":""}" data-act="selSec" data-s="${s.id}"><span class="drag-handle" title="Déplacer">⋮⋮</span><button class="collapse-btn" data-act="secCollapse" data-sid="${s.id}" title="Replier/déplier">${collapsed?"▶":"▼"}</button><span class="t">${esc(s.titre)} ${conditionBadge(m,s)}</span><span class="mv"><button data-act="secDup" data-sid="${s.id}" title="Dupliquer">⧉</button><button data-act="secUp" data-s="${si}">▲</button><button data-act="secDown" data-s="${si}">▼</button></span></div>${collapsed?"":items.map(it=>{const ii=s.items.indexOf(it);return `<div class="titem ${st.itemId===it.id?"on":""}" draggable="true" data-drag-item="${it.id}" data-drag-item-sec="${s.id}" data-act="selItem" data-s="${s.id}" data-i="${it.id}"><span class="drag-handle">⋮⋮</span><span class="ty">${it.type.slice(0,4)}</span><span class="t">${esc(it.label)} ${conditionBadge(m,it)}</span>${it.prix?`<span class="tag gris" style="padding:0 4px">€</span>`:""}<span class="mv"><button data-act="itDup" data-sid="${s.id}" data-iid="${it.id}" title="Dupliquer">⧉</button><button data-act="itUp" data-s="${si}" data-x="${ii}">▲</button><button data-act="itDown" data-s="${si}" data-x="${ii}">▼</button></span></div>`;}).join("")}<div style="padding:6px 10px 8px 20px"><button class="btn sm" data-act="itAdd" data-s="${s.id}">+ prestation</button></div></div>`;}).join("")||`<div class="tree-empty">Aucun résultat.</div>`}
      <div style="padding:10px"><button class="btn sm" data-act="secAdd">+ Ajouter une section</button></div></div><div>${item?edItem(m,sec,item):sec?edSec(m,sec):`<div class="card"><div class="bd dim">Choisissez une section ou une prestation à gauche.</div></div>`}${edExc(m)}${edDeb(m)}${auditCard(m,"Historique du modèle")}</div></div></div>`;
};
/* =====================================================================
   v47 — RATTACHEMENT CONDITIONNEL DE LA LETTRE DE MISSION
   ---------------------------------------------------------------------
   Un modèle qui couvre plusieurs missions (ex. « Missions comptables
   exceptionnelles ») ne peut pas se contenter d'une lettre unique : la
   réponse au questionnaire détermine la trame applicable. Ce panneau
   expose les règles et permet de changer la lettre visée sans toucher au
   code, la condition elle-même restant définie par le modèle source.
   ===================================================================== */
function lmRuleLabel(m,r){
  const item=(m.sections||[]).flatMap(s=>s.items||[]).find(x=>(x.cle||slug(x.label))===r.cle);
  if(!item) return `Clé « ${r.cle} » absente du questionnaire`;
  const ns=Array.isArray(r.n)?r.n.map(Number):(r.n!==undefined?[Number(r.n)]:[]);
  const labels=(item.reponses||[]).filter((rep,i)=>{
    const n=(rep.n!==null&&rep.n!==undefined&&rep.n!=="")?+rep.n:i;
    return ns.includes(n);
  }).map(rep=>rep.label);
  return `${item.label} = ${labels.length?labels.join(" ou "):ns.join(", ")}`;
}
function lmRulesCardHTML(m){
  const rules=m.lmRules||[];
  if(!rules.length) return "";
  const choix=st.lettres.filter(l=>l.statut==="publie");
  return `<div class="card" style="margin-bottom:14px"><div class="hd">Lettres de mission conditionnelles ${helpTip("La première règle satisfaite par les réponses du dossier l'emporte. Si aucune ne s'applique, le rattachement fixe ci-dessus est utilisé.")}</div><div class="bd">
    <div class="hint" style="margin-bottom:9px">Ce modèle couvre plusieurs missions : la lettre rattachée au dossier est déterminée par la réponse au questionnaire, avant même l'ouverture de l'onglet « Devis et lettre de mission ».</div>
    <table><thead><tr><th>Condition sur le questionnaire</th><th>Lettre de mission appliquée</th></tr></thead><tbody>
    ${rules.map((r,i)=>{
      const L=st.lettres.find(x=>x.id===r.lmId);
      const opts=choix.filter(l=>l.statut==="publie"||l.id===r.lmId);
      return `<tr><td>${esc(lmRuleLabel(m,r))}</td><td><select data-act="modLmRule" data-i="${i}"><option value="">— aucune —</option>${opts.map(l=>`<option value="${l.id}" ${r.lmId===l.id?"selected":""}>${esc(l.nom)}</option>`).join("")}</select>${L&&L.statut!=="publie"?`<div class="hint">Lettre non publiée.</div>`:""}</td></tr>`;
    }).join("")}
    </tbody></table></div></div>`;
}
function edSec(m,s){
  return `<div class="card" style="margin-bottom:14px"><div class="hd">Section</div><div class="bd grid g2">
    <label class="f"><span>Titre de la section</span><input type="text" data-act="secF" data-k="titre" value="${esc(s.titre)}"></label>
    <label class="f"><span>Catégorie</span><select data-act="secF" data-k="tag">
      ${CATS.map(c=>`<option ${s.tag===c?"selected":""}>${c}</option>`).join("")}</select></label>
    <div style="grid-column:1/-1">${conditionEditorHTML(m,s,"section")}</div>
    <div style="grid-column:1/-1"><button class="btn danger sm" data-act="secDel">Retirer la section</button></div>
  </div></div>`;
}
function srcItems(m, sauf){
  return m.sections.flatMap(s=>s.items).filter(it=>it.id!==sauf&&["nombre","liste","ouinon"].includes(it.type));
}
function edItem(m,s,it){
  const reps=["liste","ouinon"].includes(it.type);
  const srcs=srcItems(m,it.id);
  return `<div class="card" style="margin-bottom:14px"><div class="hd">Prestation — ${esc(s.titre)}</div><div class="bd">
    ${conditionEditorHTML(m,it,"item")}
    <div class="grid g2">
      <label class="f"><span>Libellé</span><input type="text" data-act="itF" data-k="label" value="${esc(it.label)}"></label>
      <label class="f"><span>Clé de calcul</span><input type="text" data-act="itF" data-k="cle" value="${esc(it.cle)}">
        <div class="hint">Nom sous lequel ce champ est référencé par les fonctions.</div></label>
      <label class="f"><span>Type de champ</span><select data-act="itF" data-k="type">
        ${TYPES.map(([a,b])=>`<option value="${a}" ${it.type===a?"selected":""}>${b}</option>`).join("")}</select></label>
      <label class="f"><span>Périodicité</span><select data-act="itF" data-k="per">
        ${PERS.map(([a,b])=>`<option value="${a}" ${it.per===a?"selected":""}>${b}</option>`).join("")}</select></label>
      <label class="f"><span>TVA</span><select data-act="itF" data-k="tva">
        ${[0,5.5,10,20].map(t=>`<option value="${t}" ${+it.tva===t?"selected":""}>${t} %</option>`).join("")}</select></label>
      <label class="f"><span>Note interne / aide collaborateur</span><input type="text" data-act="itF" data-k="aide" value="${esc(it.aide||"")}"><div class="hint">Visible uniquement dans l'application, jamais dans le document client.</div></label>
      <label class="f" style="grid-column:1/-1"><span>Texte client sous la prestation (facultatif)</span><textarea data-act="itF" data-k="clientText" style="min-height:70px" placeholder="Précision de périmètre affichée sous la prestation sur le devis">${esc(it.clientText||"")}</textarea><div class="hint">Texte client uniquement. Les variables et la mise en forme simple **gras** sont acceptées.</div></label>
    </div>
    ${it.type==="paragraphe"
      ? `<div class="notice vert" style="margin-top:10px"><b>Bloc de texte</b> — un paragraphe ne porte pas de prix. Il sera éditable dossier par dossier lors de la préparation du devis.</div>`
      : `<label class="chk"><input type="checkbox" data-act="itPrix" ${it.prix?"checked":""}>
          <span><b>Cette prestation porte un prix</b><div class="dim" style="font-size:12px">Décochez pour un champ de renseignement (volumétrie, dates, forme juridique…).</div></span></label>
        ${it.prix?`<label class="chk"><input type="checkbox" data-act="itDebours" ${it.debours?"checked":""}>
          <span><b>Ce montant est un débours, facturé en sus des honoraires</b><div class="dim" style="font-size:12px">Frais de greffe, annonce légale, INPI, enregistrement… Le montant reste saisi au questionnaire, mais il sort des honoraires : il est présenté à part sur le devis et n'entre pas dans le total.</div></span></label>`:""}`}

    ${it.type==="paragraphe"?`<div class="f rich-editor"><span>Texte affiché au client</span>
      <div class="rich-toolbar" role="toolbar" aria-label="Mise en forme du texte">
        <button type="button" data-act="fmtModel" data-fmt="bold" title="Mettre la sélection en gras"><b>Gras</b></button>
        <button type="button" data-act="fmtModel" data-fmt="italic" title="Mettre la sélection en italique"><i>Italique</i></button>
        <button type="button" data-act="fmtModel" data-fmt="underline" title="Souligner la sélection"><u>Souligné</u></button>
        <button type="button" data-act="fmtModel" data-fmt="bullet" title="Créer une liste à puces">• Puces</button>
        <button type="button" data-act="fmtModel" data-fmt="number" title="Créer une liste numérotée">1. Liste</button>
        <button type="button" data-act="fmtModel" data-fmt="paragraph" title="Insérer un nouveau paragraphe">¶ Paragraphe</button>
        <button type="button" class="clause-btn" data-act="clauseLibrary" data-scope="model" title="Insérer un texte depuis la bibliothèque">📚 Bibliothèque</button>${canRole("admin")?`<button type="button" data-act="clauseSaveSelection" data-scope="model" title="Enregistrer la sélection dans la bibliothèque du cabinet">☆ Mémoriser</button>`:""}<span class="tool-sep"></span>
        <button type="button" data-act="fmtModel" data-fmt="undo" title="Annuler (Ctrl+Z)">↶</button><button type="button" data-act="fmtModel" data-fmt="redo" title="Rétablir (Ctrl+Y)">↷</button><button type="button" data-act="fmtModel" data-fmt="clear" title="Effacer la mise en forme">Effacer format</button>
        <select class="style-select" data-act="textStyleModel" title="Appliquer un style contrôlé"><option value="">Style</option><option value="normal">Texte normal</option><option value="subtitle">Intertitre</option><option value="small">Petit texte</option></select>
        <select data-act="fontSizeModel" data-font-size="1" title="Modifier la taille du texte sélectionné">
          <option value="">Taille</option><option value="8">8 pt</option><option value="9">9 pt</option><option value="9.6">9,6 pt · standard</option><option value="10">10 pt</option><option value="11">11 pt</option><option value="12">12 pt</option><option value="14">14 pt</option><option value="16">16 pt</option><option value="18">18 pt</option>
        </select>
      </div>
      <div class="rich-content" data-rich-model="1" contenteditable="true" data-placeholder="Rédigez ici le texte qui apparaîtra dans le devis…" spellcheck="true">${legacyEditorHTML(it.html||"")}</div>
      <div class="hint">Mise en forme directe : <b>gras</b>, <i>italique</i>, <u>souligné</u>, listes à puces ou numérotées et taille de police. Sélectionnez le texte concerné puis choisissez une taille. Les variables restent disponibles ci-dessous.</div></div>
      <div class="vars">${variableLibraryHTML("insVar")}</div>`:""}

    ${(it.type==="nombre"||it.type==="prixlibre")?`<div style="margin-top:12px">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:var(--encre-55);font-weight:600;margin-bottom:6px">
        Prix conseillé ${it.type==="prixlibre"?"(facultatif — sinon prix entièrement libre)":""}</div>
      ${edFn(it.fn, srcs, m, {act:"itFn"})}</div>`:""}

    ${reps?`<div style="margin-top:14px">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:var(--encre-55);font-weight:600;margin-bottom:6px">
        Réponses — montant fixe ou fonction</div>
      ${it.reponses.map((r,ri)=>`<div class="rep">
        <div class="l1">
          <div class="i">${it.type==="ouinon"?(ri?"Oui":"Non"):(ri+1)+" -"}</div>
          <div><input type="text" data-act="repF" data-x="${ri}" data-k="label" value="${esc(r.label)}" placeholder="Libellé de la réponse"></div>
          <div><span class="seg">
            <button data-act="repMode" data-x="${ri}" data-m="montant" class="${r.mode!=="fonction"?"on":""}">Montant</button>
            <button data-act="repMode" data-x="${ri}" data-m="fonction" class="${r.mode==="fonction"?"on":""}">Fonction</button></span></div>
          <div>${r.mode==="fonction"
            ? `<input type="number" value="${esc(Math.round(evalFn(r.fn,ctxApercu(m))*100)/100)}" disabled title="Aperçu du calcul" style="text-align:right;color:var(--encre-55)">`
            : `<input type="number" step="0.01" data-act="repF" data-x="${ri}" data-k="val" value="${esc(r.val)}" style="text-align:right">`}</div>
          <div><button class="btn ghost sm" data-act="repDel" data-x="${ri}">✕</button></div>
        </div>
        <div style="margin:5px 0 2px 31px"><input type="text" data-act="repF" data-x="${ri}" data-k="clientLabel" value="${esc(r.clientLabel||"")}" placeholder="Libellé client (vide = simplification automatique : ${esc(defaultClientLabel(r.label))})"><div class="hint">Le libellé interne peut conserver le barème ; ce libellé est celui imprimé sur le devis et la lettre de mission.</div></div>
        ${r.mode==="fonction"?`<div class="fnb">${edFn(r.fn, srcs, m, {act:"repFn", x:ri})}</div>`:""}
        <div class="l1" style="grid-template-columns:24px 1fr;margin-top:4px">
          <div></div><div class="hint">Valeur de calcul de cette réponse (utilisée par les expressions) :
            <input type="number" step="0.01" data-act="repF" data-x="${ri}" data-k="n" value="${esc(r.n??"")}" placeholder="—" style="width:100px;display:inline-block;margin-left:6px"></div>
        </div>
      </div>`).join("")}
      <div style="padding:8px 0"><button class="btn sm" data-act="repAdd">+ Ajouter une réponse</button></div>
    </div>`:""}
    <div style="margin-top:14px"><button class="btn danger sm" data-act="itDel">Supprimer la prestation</button></div>
  </div></div>`;
}
/* éditeur de fonction : champ source + multiplicateur, barème, ou expression */
function edFn(fn, srcs, m, o){
  fn = fn || { type:"mult", src:(srcs[0]?(srcs[0].cle||slug(srcs[0].label)):""), k:1 };
  const dx = o.x!==undefined?`data-x="${o.x}"`:"";
  const A = k => `data-act="${o.act}" ${dx} data-fk="${k}"`;
  const srcSel = `<label class="f"><span>Champ source</span><select ${A("src")}>
    ${srcs.map(it=>{const c=it.cle||slug(it.label);return `<option value="${c}" ${fn.src===c?"selected":""}>${esc(it.label)}</option>`;}).join("")}
  </select></label>`;
  const typeSel = `<label class="f"><span>Mode de calcul</span><select ${A("type")}>
    ${FN_TYPES.map(([a,b])=>`<option value="${a}" ${fn.type===a?"selected":""}>${b}</option>`).join("")}</select></label>`;
  if(fn.type==="expr"){
    return `<div class="r1" style="display:grid;grid-template-columns:1fr 150px;gap:7px;align-items:end">
      <label class="f"><span>Expression</span><input type="text" ${A("expr")} value="${esc(fn.expr||"")}" placeholder="effectif * 30"></label>
      ${typeSel}</div>
      <div class="hint">Variables des champs de volumétrie, plus <span class="mono">palier(ca, 100000,57, 200000,74)</span>,
      <span class="mono">si(is,a,b)</span>, <span class="mono">min</span>, <span class="mono">max</span>, <span class="mono">arrondi</span>.</div>`;
  }
  if(fn.type==="bareme"){
    const src=srcs.find(it=>(it.cle||slug(it.label))===fn.src);
    const reps=src?src.reponses:[];
    return `<div class="r1">${srcSel}${typeSel}<div></div></div>
      ${src&&src.type==="nombre"?`<div class="notice rouge" style="margin-top:6px">Un barème demande un champ à réponses. Choisissez une liste ou un oui/non.</div>`
      :reps.map((r,i)=>`<div class="bar"><span>${esc(r.label)}</span>
        <input type="number" step="0.01" ${A("bar."+i)} value="${esc((fn.vals||[])[i]??"")}" style="text-align:right"></div>`).join("")}`;
  }
  return `<div class="r1">${srcSel}${typeSel}
    <label class="f"><span>Multiplié par</span><input type="number" step="0.01" ${A("k")} value="${esc(fn.k??"")}"></label></div>`;
}
function ctxApercu(m){ const d=curDev(); return d?ctxDe(d,m):{vars:{},idx:{},mod:m}; }
function edExc(m){
  return `<div class="card" style="margin-bottom:14px"><div class="hd">Prestations exceptionnelles</div><div class="bd">
    ${(m.exc||[]).map((e,i)=>`<div class="rep"><div class="l1" style="grid-template-columns:1fr 150px 96px 84px 28px">
      <div><input type="text" data-act="excF" data-x="${i}" data-k="label" value="${esc(e.label)}"></div>
      <div><select data-act="excF" data-x="${i}" data-k="cat">${HONOR_CATS.map(c=>`<option value="${c}" ${exceptionalCategory(e)===c?"selected":""}>${c}</option>`).join("")}</select></div>
      <div><input type="number" data-act="excF" data-x="${i}" data-k="prix" value="${esc(e.prix)}" style="text-align:right"></div>
      <div><select data-act="excF" data-x="${i}" data-k="tva">${[0,5.5,10,20].map(t=>`<option value="${t}" ${+e.tva===t?"selected":""}>${t} %</option>`).join("")}</select></div>
      <div><button class="btn ghost sm" data-act="excDel" data-x="${i}">✕</button></div></div>
      <div style="margin-top:5px"><input type="text" data-act="excF" data-x="${i}" data-k="com" value="${esc(e.com||"")}" placeholder="Commentaire imprimé sur le devis"></div>
      <label class="chk" style="margin-top:4px"><input type="checkbox" data-act="excDebours" data-x="${i}" ${e.debours?"checked":""}><span>Débours, facturé en sus des honoraires</span></label>
    </div>`).join("")}
    <div style="padding:8px 0"><button class="btn sm" data-act="excAdd">+ Ajouter une prestation</button></div>
  </div></div>`;
}
function edDeb(m){
  return `<div class="card"><div class="hd">Débours proposés par défaut</div><div class="bd">
    ${(m.deb||[]).map((e,i)=>`<div class="rep"><div class="l1" style="grid-template-columns:1fr 96px 28px">
      <div><input type="text" data-act="mdebF" data-x="${i}" data-k="label" value="${esc(e.label)}"></div>
      <div><input type="number" data-act="mdebF" data-x="${i}" data-k="prix" value="${esc(e.prix)}" style="text-align:right"></div>
      <div><button class="btn ghost sm" data-act="mdebDel" data-x="${i}">✕</button></div></div></div>`).join("")}
    <div style="padding:8px 0"><button class="btn sm" data-act="mdebAdd">+ Ajouter un débours</button></div>
  </div></div>`;
}

