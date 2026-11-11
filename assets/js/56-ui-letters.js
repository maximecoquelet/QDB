/* ==================================== éditeur lettres de mission */
VIEWS.lettres = () => {
  /* v52 : liste d'abord, éditeur ensuite — et un aperçu sur données
     fictives, pour relire une trame sans ouvrir un dossier réel. */
  if(st.lmVue!=="editeur"){
    const q=normLabel(st.lmListeQ||"");
    const arr=[...st.lettres].filter(L=>!q||normLabel(`${L.nom} ${L.sourceLabel} ${L.statut}`).includes(q))
      .sort((a,b)=>String(b.modifiedAt||"").localeCompare(String(a.modifiedAt||"")));
    const lignes=arr.map(L=>{
      const rattaches=st.modeles.filter(m=>m.lmId===L.id||(m.lmRules||[]).some(r=>r.lmId===L.id)).length;
      return ligneReferentiel({id:L.id,nom:L.nom,statut:L.statut,maj:L.modifiedAt,
        info:`${(L.articles||[]).length} article(s) · ${rattaches} modèle(s) rattaché(s)${L.sourceVersion===LM_VERSION?" · trame OEC 2025":""}`,
        actions:`<button class="btn sm p" data-act="lmOuvrir" data-id="${L.id}">Ouvrir</button><button class="btn sm" data-act="lmApercu" data-id="${L.id}">Aperçu</button>`});
    });
    return listeReferentielHTML({titre:"Lettres de mission",sous:`${st.lettres.length} trame(s) au référentiel`,
      recherche:st.lmListeQ,attrRecherche:'data-lm-liste-q',lignes,
      actionsEntete:`<button class="btn p" data-act="lmNew">Nouvelle lettre</button>`,vide:"Aucune lettre ne correspond"});
  }
  const L=st.lettres.find(x=>x.id===st.lmId)||st.lettres[0];
  if(!L) return `<div class="top"><h1>Lettres de mission</h1><span class="spacer"></span><button class="btn p" data-act="lmNew">Nouvelle</button></div><div class="wrap"><div class="empty"><b>Aucune lettre</b></div></div>`;
  normalizeLetterUx(L);st.lmId=L.id;
  const blocs=[["intro","Préambule"],...L.articles.map((a,i)=>["a"+i,a.titre]),["mentions","Mentions du devis"]];
  const cur = st.lmBlk==="intro"?{titre:"Préambule",corps:L.intro,fixe:1}:st.lmBlk==="mentions"?{titre:"Mentions du devis",corps:L.mentions,fixe:1}:L.articles[+st.lmBlk.slice(1)]||{titre:"",corps:""};
  const statusLabel=L.statut==="publie"?"Publiée":L.statut==="archive"?"Archivée":"Brouillon",statusClass=L.statut==="publie"?"vert":"gris";
  /* v47 : un modèle peut rattacher la lettre de façon fixe (`lmId`) ou
     conditionnelle (`lmRules`). Les deux comptent comme un rattachement. */
  const linked=st.modeles.filter(m=>m.lmId===L.id||(m.lmRules||[]).some(r=>r.lmId===L.id));
  return `<div class="top"><button class="btn sm ghost" data-act="lmListe">← Toutes les lettres</button><h1>Lettres de mission</h1><span class="tag ${statusClass}">${statusLabel}</span>${L.replacesLetterId&&L.statut==="brouillon"?`<span class="tag ocre">Version de test</span>`:""}<span class="spacer"></span>
    <select data-act="lmPick" style="width:330px">${st.lettres.map(x=>`<option value="${x.id}" ${x.id===L.id?"selected":""}>${esc(x.nom)} — ${x.statut==="publie"?"publiée":x.statut==="archive"?"archivée":"brouillon"}${x.sourceVersion===LM_VERSION?" / OEC 2025":""}</option>`).join("")}</select>
    ${L.statut==="publie"?`<button class="btn" data-act="lmDraftVersion">Créer version de test</button>`:L.statut==="brouillon"?`<button class="btn p" data-act="lmPub">Publier</button>`:`<span class="hint">Version archivée</span>`}
    <button class="btn" data-act="lmDup">Dupliquer</button><button class="btn" data-act="lmNew">Nouvelle</button>${st.lettres.length>1?`<button class="btn danger sm" data-act="lmDel">Supprimer</button>`:""}</div>
  <div class="wrap">
    <div class="card" style="margin-bottom:14px"><div class="bd"><div class="row"><label class="f" style="flex:1;min-width:230px"><span>Nom de la lettre</span><input type="text" data-act="lmNom" value="${esc(L.nom)}" ${L.statut!=="brouillon"?"readonly":""}></label><div style="align-self:end">${L.statut==="brouillon"?`<button class="btn" data-act="lmReset">Rétablir la trame OEC 2025</button>`:""}</div></div>
      <div class="legal-source" style="margin-top:10px"><b>Trame de référence</b> — ${esc(L.sourceLabel||"Lettre personnalisée / héritée")}. ${L.sourceVersion===LM_VERSION?"Contenu de référence SERRE OEC 2025.":"Lettre personnalisée ou antérieure."}
        ${(()=>{const e=articlesHorsTrame(L);return e.length?`<div class="notice" style="margin:9px 0 0">
          <b>Articles en retard sur la trame</b> — ${esc(e.map(x=>x.titre).join(" · "))}. Leur rédaction diffère de la trame de référence : soit vous les avez retouchés volontairement, soit ils datent d'une version antérieure.
          <div style="margin-top:7px"><button class="btn sm" data-act="lmMajArticles">Remplacer ces articles par la trame de référence</button></div></div>`:"";})()}
        <div style="margin-top:7px"><button class="btn sm" data-act="lmSerre">Créer une copie OEC 2025 en brouillon</button></div></div>
      <div class="hint" style="margin-top:9px">${L.statut==="brouillon"?"Cette version n’est proposée à aucun nouveau modèle tant qu’elle n’est pas publiée.":L.statut==="publie"?`Lecture seule. Créez une version de test pour modifier cette lettre sans affecter les modèles en production${linked.length?` · ${linked.length} modèle(s) actuellement rattaché(s)`:""}.`:"Version archivée en lecture seule, conservée pour l’historique."}</div>
    </div></div>
    <div class="ed"><div class="card tree"><div class="hd">Blocs</div>${blocs.map(([k,t])=>{const a=(k!=="intro"&&k!=="mentions")?L.articles[+k.slice(1)]:null;return `<div class="titem ${st.lmBlk===k?"on":""}" data-act="lmSel" data-k="${k}">${a?`<input type="checkbox" data-act="lmTog" data-x="${+k.slice(1)}" ${a.actif!==false?"checked":""} ${L.statut!=="brouillon"?"disabled":""}>`:`<span style="width:13px"></span>`}<span class="t">${esc(t)}</span>${a&&L.statut==="brouillon"?`<span class="mv"><button data-act="lmUp" data-x="${+k.slice(1)}">▲</button><button data-act="lmDown" data-x="${+k.slice(1)}">▼</button></span>`:""}</div>`;}).join("")}<div style="padding:10px">${L.statut==="brouillon"?`<button class="btn sm" data-act="lmAdd">+ Ajouter un article</button>`:`<span class="hint">Lecture seule</span>`}</div></div>
      <div class="card"><div class="hd">Contenu</div><div class="bd">${cur.fixe?"":`<label class="f" style="margin-bottom:11px"><span>Titre de l'article</span><input type="text" id="blkTit" data-act="lmTit" value="${esc(cur.titre)}" ${L.statut!=="brouillon"?"readonly":""}></label>`}<label class="f"><span>Texte</span><textarea id="blkTxt" data-act="lmTxt" style="min-height:250px;font-family:var(--mono);font-size:12px" ${L.statut!=="brouillon"?"readonly":""}>${esc(cur.corps)}</textarea></label>${L.statut==="brouillon"?`<div class="vars">${variableLibraryHTML("insVarLm")}</div>`:""}</div></div>
    </div></div>`;
};

