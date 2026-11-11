/* -------- questionnaire : conseillé / appliqué / écart / exclusion --- */
/* =====================================================================
   v49 — COMPLÉTUDE DU QUESTIONNAIRE
   ---------------------------------------------------------------------
   On passait au devis sans savoir ce qui restait en suspens, et les zones
   manquantes n'apparaissaient qu'à la relecture du document. Le décompte
   ne porte que sur les questions réellement applicables : sections
   retenues, prestations non masquées, conditions satisfaites.
   ===================================================================== */
const TYPES_A_REPONDRE=new Set(["texte","nombre","ouinon","liste","choix",""]);
function questionSansReponse(d,it){
  if(["paragraphe","prixlibre"].includes(it.type)) return false;
  if(!TYPES_A_REPONDRE.has(it.type||"")&&!Array.isArray(it.reponses)) return false;
  const v=d.rep?.[it.id];
  return v===undefined||v===null||String(v).trim()==="";
}
function completudeQuestionnaire(d,m){
  const vide={total:0,repondu:0,manquants:[]};
  if(!d||!m) return vide;
  let total=0,repondu=0; const manquants=[];
  for(const s of (m.sections||[])){
    if(!modelNodeApplicable(d,m,s)||d.offSec?.[s.id]) continue;
    for(const it of (s.items||[])){
      if(!itemApplicableForClient(d,s,it)||!modelNodeApplicable(d,m,it)) continue;
      if(d.off?.[it.id]) continue;
      if(["paragraphe","prixlibre"].includes(it.type)) continue;
      total++;
      if(questionSansReponse(d,it)){ if(manquants.length<6) manquants.push({section:s.titre,label:it.label,id:it.id}); }
      else repondu++;
    }
  }
  return {total,repondu,manquants};
}
function completudeBarreHTML(d,m){
  const c=completudeQuestionnaire(d,m);
  if(!c.total) return "";
  const pct=Math.round(c.repondu/c.total*100), reste=c.total-c.repondu;
  const suivante=reste?premiereQuestionSansReponse(d,m):null;
  return `<div class="quest-progress">
    <span><b>${c.repondu}</b> / ${c.total} question(s) renseignée(s)</span>
    <span class="bar"><i style="width:${pct}%"></i></span>
    <span class="${reste?"row-late":"dim"}">${reste?`${reste} en attente`:"Questionnaire complet"}</span>
    ${suivante?`<button class="btn sm" data-qsec-question="${esc(suivante.itemId)}" data-qsec-section="${esc(suivante.sectionId)}" title="${esc(suivante.section)} — ${esc(suivante.label)}">Question suivante →</button>`:""}</div>`;
}
/* Rappel affiché dans l'onglet des documents : ce qui manque, et où. */
function completudeNoticeHTML(d,m,{compact=false}={}){
  const c=completudeQuestionnaire(d,m);
  if(!c.total||!c.manquants.length) return "";
  const reste=c.total-c.repondu;
  /* v52 : sur l'onglet Documents, la liste détaillée repoussait l'aperçu de
     sept lignes. Le décompte et le renvoi suffisent : le détail appartient
     au questionnaire, où l'on va de toute façon pour y répondre. */
  if(compact) return `<div class="notice" style="margin-bottom:13px"><b>${reste} question(s) sans réponse au questionnaire</b> — le devis peut être produit, mais restera incomplet. <button class="btn sm" data-jump-tab="quest">Compléter le questionnaire</button></div>`;
  return `<div class="notice" style="margin-bottom:13px"><b>${reste} question(s) sans réponse au questionnaire</b>
    <div style="margin-top:5px">${c.manquants.map(x=>`<div>· ${esc(x.section)} — ${esc(x.label)}</div>`).join("")}${reste>c.manquants.length?`<div class="dim">… et ${reste-c.manquants.length} autre(s).</div>`:""}</div>
    <div style="margin-top:7px"><button class="btn sm" data-jump-tab="quest">Revenir au questionnaire</button></div></div>`;
}
/* =====================================================================
   v51 — SE REPÉRER DANS UN QUESTIONNAIRE DE QUARANTE QUESTIONS
   ---------------------------------------------------------------------
   Le questionnaire se parcourait d'un seul défilement, sans sommaire, sans
   repli et sans moyen d'atteindre la question suivante restée vide —
   alors que l'éditeur de modèles, lui, sait replier ses sections. Trois
   ajouts : un sommaire cliquable, un saut vers la prochaine question sans
   réponse, et des sections repliables dont les blocs purement rédactionnels
   (présentation du cabinet, valeurs) arrivent fermés, puisqu'ils sont
   identiques d'un dossier à l'autre et qu'on les faisait défiler chaque
   fois pour atteindre les vraies questions.
   ===================================================================== */
/* =====================================================================
   v52 — FILTRER LE QUESTIONNAIRE
   ---------------------------------------------------------------------
   Trois questions reviennent sans cesse : que reste-t-il à renseigner,
   quels prix ai-je touchés, qu'ai-je exclu du devis ? Elles se répondaient
   en parcourant les quarante lignes. Les filtres n'altèrent aucun calcul :
   ils masquent à l'écran, rien de plus — le devis reste construit sur
   l'ensemble des prestations retenues.
   ===================================================================== */
const FILTRES_QUEST=[
  ["","Tout afficher"],
  ["sansreponse","Sans réponse"],
  ["prix","Prix modifiés"],
  ["exclues","Prestations exclues"]
];
function prixModifie(d,it){
  const v=d?.prix?.[it.id];
  return v!==undefined && v!==null && String(v).trim()!=="";
}
function itemPasseFiltre(d,s,it){
  const f=st.questFiltre||"";
  if(!f) return true;
  if(f==="exclues") return !!d.off?.[it.id]||!!d.offSec?.[s.id];
  if(d.off?.[it.id]) return false;
  if(f==="sansreponse") return !["paragraphe","prixlibre"].includes(it.type) && questionSansReponse(d,it);
  if(f==="prix") return prixModifie(d,it)||!!d.excPrix?.[it.id];
  return true;
}
function compteFiltre(d,m,cle){
  let n=0;
  for(const s of (m?.sections||[])){
    if(!modelNodeApplicable(d,m,s)) continue;
    for(const it of (s.items||[])){
      if(!itemApplicableForClient(d,s,it)||!modelNodeApplicable(d,m,it)) continue;
      const sauve=st.questFiltre; st.questFiltre=cle;
      if(itemPasseFiltre(d,s,it)) n++;
      st.questFiltre=sauve;
    }
  }
  return n;
}
function filtresQuestHTML(d,m){
  return `<div class="quest-filtres" role="group" aria-label="Filtrer les prestations affichées">${FILTRES_QUEST.map(([cle,lib])=>{
    const n=cle?compteFiltre(d,m,cle):0;
    return `<button class="filtre-onglet ${(st.questFiltre||"")===cle?"on":""}" data-quest-filtre="${cle}">${esc(lib)}${cle&&n?`<span class="vue-compte">${n}</span>`:""}</button>`;
  }).join("")}<span class="spacer"></span><label class="chk detail-calcul"><input type="checkbox" data-quest-detail ${st.questDetail?"checked":""}><span>Afficher le détail du calcul</span></label></div>`;
}
const QSEC_STORAGE="serre.ui.quest-sections.v1";
const AIDE_QUEST_STORAGE="serre.ui.aide-questionnaire.v1";
function aideQuestionnaireMasquee(){ try{ return localStorage.getItem(AIDE_QUEST_STORAGE)==="0"; }catch(_){ return false; } }
function qsecEtats(){ try{ return JSON.parse(localStorage.getItem(QSEC_STORAGE)||"{}")||{}; }catch(_){ return {}; } }
function qsecEnregistrer(id,ouvert){ try{ const x=qsecEtats(); x[id]=!!ouvert; localStorage.setItem(QSEC_STORAGE,JSON.stringify(x)); }catch(_){} }
/* Une section entièrement rédactionnelle n'appelle aucune réponse : elle
   arrive repliée tant que l'utilisateur ne l'a pas ouverte lui-même. */
const sectionRedactionnelle = items => items.length>0 && items.every(it=>it.type==="paragraphe");
function qsecOuverte(s,items){
  const memo=qsecEtats();
  if(Object.prototype.hasOwnProperty.call(memo,s.id)) return memo[s.id];
  return !sectionRedactionnelle(items);
}
/* Avancement d'une section, pour le sommaire. */
function completudeSection(d,m,s){
  let total=0,repondu=0;
  for(const it of (s.items||[])){
    if(!itemApplicableForClient(d,s,it)||!modelNodeApplicable(d,m,it)) continue;
    if(d.off?.[it.id]) continue;
    if(["paragraphe","prixlibre"].includes(it.type)) continue;
    total++; if(!questionSansReponse(d,it)) repondu++;
  }
  return {total,repondu};
}
/* Première question applicable restée sans réponse, dans l'ordre de lecture. */
function premiereQuestionSansReponse(d,m){
  for(const s of (m?.sections||[])){
    if(!modelNodeApplicable(d,m,s)||d.offSec?.[s.id]) continue;
    for(const it of (s.items||[])){
      if(!itemApplicableForClient(d,s,it)||!modelNodeApplicable(d,m,it)) continue;
      if(d.off?.[it.id]) continue;
      if(["paragraphe","prixlibre"].includes(it.type)) continue;
      if(questionSansReponse(d,it)) return {sectionId:s.id,itemId:it.id,label:it.label,section:s.titre};
    }
  }
  return null;
}
function sommaireQuestionnaireHTML(d,m){
  const sections=(m.sections||[]).filter(s=>modelNodeApplicable(d,m,s));
  if(sections.length<3) return "";
  return `<details class="card quest-sommaire" ${st.sommaireOuvert?"open":""} data-quest-sommaire>
    <summary class="hd"><span class="q-title">Sommaire du questionnaire</span><span class="spacer"></span><span class="dim" style="font-size:11.5px">${sections.length} sections</span></summary>
    <div class="bd"><div class="sommaire-grid">${sections.map(s=>{
      const off=!!d.offSec[s.id], c=completudeSection(d,m,s), reste=c.total-c.repondu;
      return `<button type="button" class="sommaire-item ${off?"off":reste?"reste":"ok"}" data-qsec-aller="${s.id}">
        <span class="sommaire-titre">${esc(s.titre)}</span>
        <span class="sommaire-etat">${off?"masquée":c.total?`${c.repondu}/${c.total}`:"rédaction"}</span></button>`;
    }).join("")}</div></div></details>`;
}
function tabQuest(d, m){
  if(!m) return `<div class="notice rouge">Aucun modèle disponible.</div>`;
  const ctx=ctxDe(d,m), seuil=+st.cab.ecartMax||0;
  const nOff=Object.values(d.off).filter(Boolean).length+Object.values(d.offSec).filter(Boolean).length;
  return `
  ${completudeBarreHTML(d,m)}
  ${aideQuestionnaireMasquee()?`<div class="aide-repliee">${nOff?`<b>${nOff} élément(s) masqué(s).</b> `:""}<button class="btn sm ghost" data-aide-quest="1">Revoir le mode d'emploi</button></div>`:`<div class="notice" style="margin-bottom:14px">
    <button class="notice-fermer" type="button" data-aide-quest="0" title="Masquer ce mode d'emploi">×</button>
    Décochez une ligne pour <b>ne pas en tenir compte</b> : elle sort du calcul et n'apparaît pas sur le devis remis au client.
    La case du bandeau retire la section entière.${nOff?` <b>${nOff} élément(s) actuellement masqué(s).</b>`:""}
    <div style="margin-top:5px">Prix conseillé = montant du modèle ou résultat de la fonction. Le champ <b>Appliqué</b> reste libre ; au-delà de ${seuil} % d'écart, un motif est demandé.</div>
  </div>`}
  ${sommaireQuestionnaireHTML(d,m)}
  ${filtresQuestHTML(d,m)}
  ${st.questFiltre?`<div class="notice" style="margin-bottom:12px"><b>Affichage filtré</b> — « ${esc((FILTRES_QUEST.find(x=>x[0]===st.questFiltre)||[])[1]||"")} ». Le calcul et le devis portent toujours sur l'ensemble des prestations retenues. <button class="btn sm" data-quest-filtre="">Tout afficher</button></div>`:""}
  ${m.sections.filter(s=>modelNodeApplicable(d,m,s)).map(s=>{
    const off=!!d.offSec[s.id];
    const tousItems=s.items.filter(it=>itemApplicableForClient(d,s,it)&&modelNodeApplicable(d,m,it));
    const items=tousItems.filter(it=>itemPasseFiltre(d,s,it));
    const autoHidden=s.items.length-tousItems.length;
    if(st.questFiltre && !items.length) return "";
    const ouverte=(st.questFiltre?true:qsecOuverte(s,tousItems)), cs=completudeSection(d,m,s);
    return `<div class="qsec ${off?"off":""} ${ouverte?"":"replie"}" id="qsec-${s.id}">
      <div class="hd" data-qsec-bar="${s.id}" role="button" tabindex="0" aria-expanded="${ouverte?"true":"false"}" title="${ouverte?"Replier l'affichage de cette section":"Déplier l'affichage de cette section"}">
        <span class="qsec-plier"><span class="qsec-chevron">${ouverte?"▾":"▸"}</span><b>${esc(s.titre)}</b></span>
        ${s.tag?categoryBadge(s.tag):""}
        <span class="spacer"></span>
        ${cs.total?`<span class="qsec-compte ${cs.repondu<cs.total?"reste":""}">${cs.repondu}/${cs.total}</span>`:`<span class="qsec-compte dim">rédaction</span>`}
        <label class="qsec-exclure ${off?"exclue":""}" title="${off?"Cette section ne figure pas sur le devis remis au client":"Retirer cette section du devis remis au client"}"><input type="checkbox" data-act="offSec" data-s="${s.id}" ${off?"":"checked"} ${isDevisLocked(d)?"disabled":""}><span>${off?"exclue du devis":"au devis"}</span></label>
      </div>
      <div class="bd">
        ${autoHidden&&isLegalSection(s)?`<div class="notice vert" style="margin:8px 0;font-size:11.5px"><b>Filtrage automatique :</b> ${autoHidden} prestation(s) sans objet pour ${esc(clientFormLabel(d))} ont été masquées. Elles ne sont ni calculées ni reprises dans le devis.</div>`:""}
        ${items.length?items.map(it=>qItem(d,m,s,it,ctx,seuil)).join(""):`<div class="dim" style="padding:12px 0">Aucune prestation standard applicable à ${esc(clientFormLabel(d))} dans cette section.</div>`}
      </div>
    </div>`;
  }).join("")}
  ${blocExc(d,m)}${blocDeb(d,m)}`;
}
function normLabel(x){
  return String(x||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[’']/g," ").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}
function isExpertiseItem(s,it){
  return normLabel(it&&it.label).includes("domaines d expertise") || normLabel(s&&s.titre).includes("domaines d expertise");
}
function isValuesItem(s,it){
  return normLabel(it&&it.label).includes("nos valeurs") || normLabel(s&&s.titre).includes("notre accompagnement et nos valeurs");
}
function isFreeParagraphItem(s,it){
  return !!(it && it.type==="paragraphe" && !isExpertiseItem(s,it) && !isValuesItem(s,it) && !String(it.html||"").trim());
}
function expertiseVisualHTML(){
  return `<div class="expertise-visual" style="margin:4px 0;background:#fff;padding:8px;text-align:center"><img src="${EXPERTISE_VISUAL}" alt="Tenue de la comptabilité ; gestion de la paie avec un partenaire spécialisé ; gestion du juridique et conseil en structuration ; consolidation et reporting ; conseil et formation en gestion" style="display:block;width:100%;max-width:100%;height:auto;margin:0 auto;object-fit:contain"></div>`;
}
function valuesVisualHTML(){
  return `<div class="values-visual" style="margin:4px 0;background:#fff;padding:8px;text-align:center"><img src="${VALUES_VISUAL}" alt="Accompagnement global ; expertise technique et actualité ; outils digitaux facilitant les échanges" style="display:block;width:100%;max-width:100%;height:auto;margin:0 auto;object-fit:contain"></div>`;
}
const RICH_WRAP_RE=/^\s*<div\s+data-serre-rich=["']1["']\s*>([\s\S]*)<\/div>\s*$/i;
function unpackRichText(v){ const m=String(v??"").match(RICH_WRAP_RE); return m?m[1]:null; }
function sanitizeRichHTML(html){
  const tpl=document.createElement("template"); tpl.innerHTML=String(html??"");
  const allowed=new Set(["P","DIV","BR","STRONG","B","EM","I","U","UL","OL","LI","SPAN"]);
  const dangerous=new Set(["SCRIPT","STYLE","IFRAME","OBJECT","EMBED","LINK","META"]);
  const fontSizeOk=v=>/^(?:8|9|9\.6|10|11|12|14|16|18)pt$/.test(String(v||"").trim());
  const clean=root=>{ [...root.childNodes].forEach(n=>{
    if(n.nodeType!==1) return; const tag=n.tagName;
    if(dangerous.has(tag)){ n.remove(); return; }
    clean(n);
    if(!allowed.has(tag)){ n.replaceWith(...n.childNodes); return; }
    if(tag==="SPAN"){
      const fs=n.style?.fontSize||"";
      [...n.attributes].forEach(a=>n.removeAttribute(a.name));
      if(fontSizeOk(fs)) n.setAttribute("style",`font-size:${fs}`);
      else n.replaceWith(...n.childNodes);
      return;
    }
    [...n.attributes].forEach(a=>n.removeAttribute(a.name));
  }); };
  clean(tpl.content); return tpl.innerHTML;
}
function packRichText(html){ return `<div data-serre-rich="1">${sanitizeRichHTML(html)}</div>`; }
function legacyEditorHTML(v){
  const raw=String(v??""), packed=unpackRichText(raw);
  if(packed!==null) return sanitizeRichHTML(packed);
  if(!raw.trim()) return "";
  const safe=esc(raw).replace(/\r\n?/g,"\n");
  return safe.split(/\n{2,}/).map(p=>{
    const L=p.split("\n"), nz=L.filter(l=>l.trim());
    if(nz.length&&nz.every(l=>/^(?:-|•)\s+/.test(l.trim()))) return "<ul>"+nz.map(l=>`<li>${inlineRich(l.replace(/^\s*(?:-|•)\s+/,""))}</li>`).join("")+"</ul>";
    if(nz.length&&nz.every(l=>/^\d+[.)]\s+/.test(l.trim()))) return "<ol>"+nz.map(l=>`<li>${inlineRich(l.replace(/^\s*\d+[.)]\s+/,""))}</li>`).join("")+"</ol>";
    return `<p>${inlineRich(L.join("<br>"))}</p>`;
  }).join("");
}
function richTextHasContent(v){
  const packed=unpackRichText(v); if(packed===null) return !!String(v??"").trim();
  const box=document.createElement("div"); box.innerHTML=sanitizeRichHTML(packed);
  return !!box.textContent.trim() || !!box.querySelector("li");
}

const DEFAULT_TEXT_CLAUSES = [
  {id:"gen-complement",cat:"Général",title:"Prestations complémentaires sur demande",tags:"complément devis périmètre",
   html:`<p>Toute prestation qui ne figure pas expressément dans le périmètre retenu pourra être réalisée à votre demande. Son contenu, son calendrier et ses honoraires feront, lorsque cela est nécessaire, l’objet d’un accord préalable.</p>`},
  {id:"gen-volume",cat:"Général",title:"Évolution du volume ou de la complexité",tags:"volume complexité honoraires révision",
   html:`<p>La présente proposition a été établie sur la base des informations et volumes connus à ce jour. Une évolution significative du volume d’activité, de l’organisation, du nombre d’entités ou de la complexité des opérations pourra conduire à revoir le périmètre d’intervention et les honoraires, après échange avec vous.</p>`},
  {id:"gen-cooperation",cat:"Général",title:"Coopération et transmission des informations",tags:"délais documents collaboration",
   html:`<p>La bonne réalisation de nos travaux suppose la transmission, dans les délais convenus, d’informations complètes et des pièces nécessaires. Nous vous invitons à nous signaler sans délai tout événement inhabituel ou toute opération susceptible d’avoir une incidence sur les travaux confiés.</p>`},
  {id:"gen-interlocuteur",cat:"Général",title:"Interlocuteur privilégié",tags:"contact interlocuteur échanges",
   html:`<p>Un interlocuteur du cabinet assure le suivi courant de votre dossier et centralise vos demandes. Les sujets nécessitant une expertise particulière peuvent être traités avec les spécialistes du cabinet concernés.</p>`},
  {id:"gen-situation-offerte",cat:"Général",title:"Situation intermédiaire offerte",tags:"situation intermédiaire offerte",
   html:`<p><strong>Une situation intermédiaire au 30/06 est incluse dans notre accompagnement, sans honoraire complémentaire.</strong></p>`},
  {id:"gen-rdv-annuel",cat:"Général",title:"Rendez-vous annuel de restitution",tags:"bilan restitution rendez-vous",
   html:`<p>Un rendez-vous annuel de restitution est prévu afin de commenter les comptes, les principaux indicateurs et les points d’attention identifiés au cours de nos travaux.</p>`},

  {id:"compta-transmission",cat:"Comptabilité",title:"Transmission dématérialisée des pièces",tags:"pièces factures portail dématérialisation",
   html:`<p>Les pièces comptables sont transmises de manière dématérialisée au moyen des outils convenus avec le cabinet. Une transmission régulière facilite la tenue à jour du dossier et le respect des échéances déclaratives.</p>`},
  {id:"compta-inventaires",cat:"Comptabilité",title:"Inventaires physiques",tags:"stocks immobilisations caisse inventaire",
   html:`<p>Les inventaires physiques des stocks, immobilisations, espèces et autres actifs restent réalisés sous votre responsabilité. Vous nous communiquez les états d’inventaire et les éléments nécessaires à leur traduction comptable.</p>`},
  {id:"compta-caisse",cat:"Comptabilité",title:"Suivi de caisse",tags:"caisse espèces justificatifs",
   html:`<p>Lorsque l’activité comporte des encaissements en espèces, vous assurez la tenue et le contrôle de la caisse ainsi que la conservation des justificatifs correspondants. Les états de caisse sont transmis au cabinet selon la périodicité convenue.</p>`},
  {id:"compta-justificatifs",cat:"Comptabilité",title:"Pièces justificatives manquantes",tags:"justificatifs pièces manquantes",
   html:`<p>Les pièces justificatives manquantes ou incomplètes susceptibles d’affecter le traitement comptable ou fiscal vous sont signalées lorsqu’elles sont identifiées. Leur obtention et leur conservation restent de votre responsabilité.</p>`},
  {id:"compta-situation",cat:"Comptabilité",title:"Situation comptable intermédiaire",tags:"situation arrêté intermédiaire",
   html:`<p>Une situation comptable intermédiaire peut être établie à partir des éléments disponibles à la date d’arrêté. Sa fiabilité dépend notamment de la complétude des pièces transmises et des informations relatives aux opérations d’inventaire.</p>`},
  {id:"compta-immo",cat:"Comptabilité",title:"Immobilisations et investissements",tags:"immobilisation investissement facture financement",
   html:`<p>Vous nous informez des investissements, cessions d’actifs et financements intervenus au cours de la période et nous transmettez les factures, contrats et tableaux d’amortissement correspondants.</p>`},
  {id:"compta-cloture",cat:"Comptabilité",title:"Préparation de la clôture annuelle",tags:"clôture comptes annuels inventaire",
   html:`<p>En amont de la clôture, le cabinet vous communique les principaux éléments à réunir afin de préparer les comptes annuels dans de bonnes conditions : inventaires, créances et dettes à régulariser, engagements, financements et événements significatifs.</p>`},

  {id:"fisc-tva",cat:"Fiscalité",title:"Déclarations de TVA",tags:"tva déclaration échéance",
   html:`<p>Les déclarations de TVA sont établies à partir des éléments comptables disponibles et des informations que vous nous communiquez. Les opérations particulières ou inhabituelles doivent être signalées au cabinet afin d’en apprécier le traitement fiscal.</p>`},
  {id:"fisc-annuel",cat:"Fiscalité",title:"Déclarations fiscales annuelles",tags:"liasse impôt résultat fiscal",
   html:`<p>Le cabinet prépare les déclarations fiscales annuelles comprises dans la mission à partir des comptes et informations disponibles. Les choix ou options nécessitant votre décision vous sont présentés lorsqu’ils sont identifiés.</p>`},
  {id:"fisc-exception",cat:"Fiscalité",title:"Opérations fiscales exceptionnelles",tags:"exceptionnel restructuration international plus-value",
   html:`<p>Les opérations présentant un caractère exceptionnel ou nécessitant une analyse fiscale spécifique — notamment restructuration, cession, opération internationale ou régime particulier — ne sont pas présumées comprises dans les travaux courants et font l’objet d’un échange dédié.</p>`},
  {id:"fisc-controle",cat:"Fiscalité",title:"Assistance en cas de contrôle fiscal",tags:"contrôle fiscal vérification assistance",
   html:`<p>En cas de contrôle ou de demande particulière de l’administration fiscale, le cabinet peut vous assister dans la préparation des réponses et le suivi des échanges. L’étendue de cette assistance est définie avec vous en fonction de la procédure concernée.</p>`},

  {id:"social-variables",cat:"Social",title:"Transmission des variables de paie",tags:"paie variables salaires délai",
   html:`<p>Les variables de paie sont transmises au cabinet selon le calendrier convenu. Elles comprennent notamment les absences, primes, heures, avantages, changements de situation et tout élément ayant une incidence sur le bulletin.</p>`},
  {id:"social-entrees",cat:"Social",title:"Entrées et sorties des salariés",tags:"embauche départ contrat rupture",
   html:`<p>Les embauches, départs et modifications contractuelles sont signalés au cabinet suffisamment en amont, avec les informations nécessaires à l’établissement des documents et déclarations relevant du périmètre confié.</p>`},
  {id:"social-dsn",cat:"Social",title:"DSN et déclarations sociales",tags:"dsn déclarations sociales",
   html:`<p>Les déclarations sociales comprises dans la mission sont préparées à partir des éléments de paie et des informations transmis par l’entreprise. Toute correction liée à une information tardive ou rectifiée peut nécessiter un traitement complémentaire.</p>`},
  {id:"social-exception",cat:"Social",title:"Événements sociaux exceptionnels",tags:"rupture licenciement contrôle urssaf contentieux",
   html:`<p>Les procédures ou événements sociaux exceptionnels — rupture complexe, procédure disciplinaire, contrôle, contentieux ou étude spécifique — font l’objet d’un cadrage distinct lorsque leur traitement excède la production sociale courante.</p>`},
  {id:"social-rh",cat:"Social",title:"Conseil RH complémentaire",tags:"rh ressources humaines conseil",
   html:`<p>Toute mission complémentaire d’assistance ou de conseil en matière sociale et de ressources humaines peut être réalisée à votre demande, après définition du besoin et du périmètre d’intervention.</p>`},

  {id:"jur-secretariat",cat:"Juridique",title:"Secrétariat juridique annuel",tags:"juridique annuel assemblée approbation comptes",
   html:`<p>Le secrétariat juridique annuel comprend les travaux expressément retenus dans le devis, notamment la préparation des actes courants liés à l’approbation annuelle des comptes lorsque cette prestation est confiée au cabinet.</p>`},
  {id:"jur-ago",cat:"Juridique",title:"Approbation annuelle des comptes",tags:"ago assemblée approbation affectation résultat",
   html:`<p>Pour l’approbation annuelle des comptes, vous nous communiquez les informations nécessaires concernant les associés, dirigeants, conventions, événements de l’exercice et proposition d’affectation du résultat.</p>`},
  {id:"jur-exception",cat:"Juridique",title:"Opérations juridiques exceptionnelles",tags:"capital siège dirigeant transformation cession",
   html:`<p>Les opérations juridiques exceptionnelles — notamment modification du capital, transfert de siège, changement de dirigeant, transformation, cession ou restructuration — sont traitées séparément du secrétariat juridique annuel, après définition de l’opération et de ses formalités.</p>`},
  {id:"jur-formalites",cat:"Juridique",title:"Formalités, greffe et annonces",tags:"greffe annonce légale formalité débours",
   html:`<p>Les frais de greffe, d’annonces légales, d’enregistrement et plus généralement les débours nécessaires aux formalités sont distincts des honoraires du cabinet et sont refacturés selon les conditions indiquées dans le devis.</p>`},
  {id:"jur-delais",cat:"Juridique",title:"Transmission des éléments juridiques",tags:"associés registre délais juridique",
   html:`<p>Vous nous informez de toute modification concernant la société, ses dirigeants, associés ou bénéficiaires effectifs et nous transmettez les documents utiles suffisamment en amont des échéances ou opérations envisagées.</p>`},

  {id:"gest-tableau",cat:"Gestion",title:"Tableau de bord",tags:"tableau bord indicateurs pilotage",
   html:`<p>Le tableau de bord est construit à partir des données disponibles et des indicateurs retenus avec vous. Il constitue un outil de pilotage et doit être analysé en tenant compte du contexte opérationnel de l’entreprise.</p>`},
  {id:"gest-prev",cat:"Gestion",title:"Prévisionnel",tags:"prévisionnel budget trésorerie",
   html:`<p>Les prévisions reposent sur les hypothèses communiquées et validées avec l’entreprise. Elles constituent un outil d’aide à la décision et sont susceptibles d’évoluer en fonction des réalisations et des événements futurs.</p>`},
  {id:"gest-rdv",cat:"Gestion",title:"Rendez-vous de pilotage",tags:"pilotage rendez-vous indicateurs",
   html:`<p>Les rendez-vous de pilotage permettent d’analyser les indicateurs disponibles, les écarts par rapport aux objectifs et les principales décisions à anticiper. La fréquence est adaptée aux besoins retenus dans la mission.</p>`},
  {id:"gest-financement",cat:"Gestion",title:"Accompagnement financement",tags:"banque financement dossier",
   html:`<p>Le cabinet peut vous assister dans la préparation d’un dossier de financement et la présentation des données financières. La décision de financement et ses conditions relèvent exclusivement de l’établissement financeur.</p>`},

  {id:"outil-portail",cat:"Outils & organisation",title:"Portail collaboratif",tags:"portail outil accès documents",
   html:`<p>Les outils collaboratifs mis à disposition facilitent la transmission des documents et les échanges avec le cabinet. Chaque utilisateur veille à préserver la confidentialité de ses accès et à signaler rapidement toute difficulté d’utilisation.</p>`},
  {id:"outil-dematerialisation",cat:"Outils & organisation",title:"Organisation dématérialisée",tags:"dématérialisation numérique processus",
   html:`<p>L’organisation proposée privilégie les échanges dématérialisés afin de fluidifier la collecte des pièces, le suivi du dossier et le partage des documents produits par le cabinet.</p>`},
  {id:"outil-planning",cat:"Outils & organisation",title:"Calendrier de transmission",tags:"planning calendrier échéances",
   html:`<p>Un rythme régulier de transmission des informations permet de respecter les échéances et de limiter les travaux de régularisation. Les dates convenues peuvent être adaptées en fonction de l’organisation de l’entreprise et des contraintes du dossier.</p>`},

  {id:"hon-debours",cat:"Honoraires & frais",title:"Débours refacturés au réel",tags:"débours frais greffe annonce",
   html:`<p>Les débours engagés pour le compte du client sont refacturés au réel sur justificatifs, indépendamment des honoraires du cabinet.</p>`},
  {id:"hon-volume",cat:"Honoraires & frais",title:"Réexamen des honoraires en cas d’évolution",tags:"honoraires volume révision",
   html:`<p>Si les conditions d’exécution de la mission évoluent de façon significative par rapport aux hypothèses retenues pour établir la proposition, les parties se rapprochent afin d’adapter, si nécessaire, le périmètre et les honoraires.</p>`},
  {id:"hon-deplacement",cat:"Honoraires & frais",title:"Déplacements exceptionnels",tags:"déplacement frais intervention",
   html:`<p>Les déplacements ou interventions sur site qui ne sont pas prévus dans le fonctionnement habituel de la mission peuvent faire l’objet d’une facturation complémentaire convenue préalablement avec vous.</p>`},

  {id:"lim-audit",cat:"Limites & précisions",title:"La mission ne constitue pas un audit",tags:"audit assurance contrôle exhaustif",
   html:`<p>Les travaux réalisés dans le cadre de la présente prestation ne constituent pas un audit ni un contrôle exhaustif des opérations. Leur nature et leur étendue sont celles définies par la mission retenue.</p>`},
  {id:"lim-infos",cat:"Limites & précisions",title:"Fiabilité des informations transmises",tags:"responsabilité informations données",
   html:`<p>Nos travaux s’appuient sur les documents, informations et explications qui nous sont communiqués. Vous nous informez de tout élément susceptible d’en modifier l’interprétation ou d’avoir une incidence significative sur le dossier.</p>`},
  {id:"lim-horsperimetre",cat:"Limites & précisions",title:"Sujet hors périmètre identifié en cours de mission",tags:"hors périmètre complément",
   html:`<p>Lorsqu’un besoin est identifié en cours de mission mais n’entre pas dans le périmètre initialement convenu, nous vous en informons afin de déterminer ensemble les suites à donner et, le cas échéant, les conditions d’une intervention complémentaire.</p>`},

  {id:"gen-demarrage",cat:"Général",title:"Démarrage de la mission",tags:"démarrage reprise dossier organisation",
   html:`<p>Au démarrage de la mission, nous convenons avec vous des modalités pratiques de collaboration, des interlocuteurs, du calendrier de transmission et des accès nécessaires. Les éventuels travaux de reprise ou de régularisation antérieurs sont identifiés séparément lorsqu’ils dépassent le périmètre courant.</p>`},
  {id:"gen-changement",cat:"Général",title:"Changement d’organisation ou d’activité",tags:"organisation activité changement périmètre",
   html:`<p>Vous nous informez de tout changement significatif affectant l’activité, l’organisation, les flux, les outils, les établissements ou les responsabilités internes. Ces évolutions peuvent nécessiter une adaptation des travaux et du calendrier d’intervention.</p>`},
  {id:"gen-urgence",cat:"Général",title:"Demande urgente ou hors calendrier",tags:"urgence délai demande exceptionnelle",
   html:`<p>Les demandes nécessitant un traitement dans un délai sensiblement plus court que le calendrier habituel sont examinées en fonction des informations disponibles et des contraintes de production du cabinet. Lorsque la demande nécessite une organisation spécifique, ses modalités sont convenues avec vous au préalable.</p>`},
  {id:"gen-tiers",cat:"Général",title:"Documents destinés à un tiers",tags:"banque investisseur tiers document",
   html:`<p>Lorsque des documents ou analyses sont destinés à un tiers identifié, nous vous invitons à nous préciser leur finalité et leur destinataire afin d’adapter, si nécessaire, la nature de notre intervention et les mentions accompagnant les documents remis.</p>`},
  {id:"gen-reunions",cat:"Général",title:"Réunions complémentaires",tags:"réunion échange rendez-vous complémentaire",
   html:`<p>Des réunions complémentaires peuvent être organisées à votre demande pour approfondir un sujet particulier ou préparer une décision. Leur objet et, le cas échéant, leurs conditions d’intervention sont définis avant la réunion.</p>`},
  {id:"gen-donnees",cat:"Général",title:"Qualité des données transmises",tags:"données fichiers import qualité",
   html:`<p>Lorsque nos travaux reposent sur des fichiers, exports ou données issus de vos outils, leur exhaustivité et leur cohérence conditionnent la qualité des traitements réalisés. Toute modification de format, de paramétrage ou de source de données doit nous être signalée.</p>`},
  {id:"compta-banques",cat:"Comptabilité",title:"Rapprochements bancaires",tags:"banque rapprochement relevés",
   html:`<p>Les rapprochements bancaires sont réalisés à partir des relevés et informations disponibles. Les opérations non identifiées, virements internes, prélèvements ou encaissements nécessitant une affectation particulière doivent être précisés par l’entreprise.</p>`},
  {id:"compta-clients",cat:"Comptabilité",title:"Suivi des comptes clients",tags:"clients lettrage créances",
   html:`<p>Le suivi comptable des comptes clients repose sur les factures, avoirs et règlements transmis. L’appréciation du caractère recouvrable des créances et les décisions de relance, contentieux ou abandon relèvent de la direction de l’entreprise.</p>`},
  {id:"compta-fournisseurs",cat:"Comptabilité",title:"Suivi des comptes fournisseurs",tags:"fournisseurs dettes lettrage",
   html:`<p>Le suivi comptable des comptes fournisseurs est effectué à partir des pièces reçues. Vous nous signalez les litiges, avoirs attendus, factures non parvenues et opérations nécessitant un traitement particulier.</p>`},
  {id:"compta-cutoff",cat:"Comptabilité",title:"Rattachement des charges et produits",tags:"cut-off clôture charges produits",
   html:`<p>Pour permettre le rattachement des charges et produits à la bonne période, vous nous communiquez les éléments relatifs aux prestations réalisées ou reçues non encore facturées, aux produits à recevoir et aux charges payées ou facturées d’avance.</p>`},
  {id:"compta-notesfrais",cat:"Comptabilité",title:"Notes de frais",tags:"notes frais justificatifs dépenses",
   html:`<p>Les notes de frais doivent être accompagnées des justificatifs correspondants et préciser la nature professionnelle des dépenses lorsque celle-ci n’est pas immédiatement identifiable. Les règles internes de validation et de remboursement restent sous la responsabilité de l’entreprise.</p>`},
  {id:"compta-emprunts",cat:"Comptabilité",title:"Emprunts, crédits-baux et financements",tags:"emprunt crédit bail financement tableau amortissement",
   html:`<p>Vous nous transmettez les contrats de financement, tableaux d’amortissement, échéanciers et avenants relatifs aux emprunts, crédits-baux et autres financements afin de permettre leur traitement comptable approprié.</p>`},
  {id:"compta-stocks",cat:"Comptabilité",title:"Valorisation des stocks",tags:"stocks inventaire valorisation",
   html:`<p>La détermination des quantités en stock, l’organisation de l’inventaire et le choix des données de valorisation relèvent de l’entreprise. Le cabinet traite comptablement les éléments d’inventaire qui lui sont communiqués et peut attirer votre attention sur les incohérences identifiées.</p>`},
  {id:"compta-analytique",cat:"Comptabilité",title:"Comptabilité analytique",tags:"analytique axes centres coûts",
   html:`<p>Lorsque des axes analytiques sont utilisés, leur pertinence dépend de la qualité des règles d’affectation et de leur application régulière. Toute évolution des axes, centres ou clés de répartition est définie avec vous avant sa mise en œuvre.</p>`},
  {id:"compta-reprise",cat:"Comptabilité",title:"Reprise d’une comptabilité existante",tags:"reprise historique migration ancien cabinet",
   html:`<p>La reprise d’un dossier existant est réalisée à partir des balances, grands livres, états de rapprochement et justificatifs disponibles. Les anomalies ou écarts antérieurs identifiés lors de la reprise peuvent nécessiter des travaux de régularisation distincts.</p>`},
  {id:"fisc-is",cat:"Fiscalité",title:"Impôt sur les bénéfices et acomptes",tags:"is impôt bénéfices acomptes",
   html:`<p>Le cabinet établit les éléments déclaratifs relatifs à l’impôt sur les bénéfices compris dans la mission à partir du résultat fiscal déterminé et des informations disponibles. Les acomptes et soldes sont suivis selon les données communiquées et les échéances applicables au dossier.</p>`},
  {id:"fisc-taxeslocales",cat:"Fiscalité",title:"Taxes et impositions locales",tags:"cfe taxes locales établissement",
   html:`<p>Les impositions locales comprises dans la mission sont traitées à partir des informations connues du cabinet. Vous nous signalez toute création, fermeture ou modification d’établissement, changement de locaux ou événement susceptible d’affecter ces impositions.</p>`},
  {id:"fisc-credit",cat:"Fiscalité",title:"Crédits et réductions d’impôt",tags:"crédit impôt réduction justificatifs",
   html:`<p>La mise en œuvre d’un crédit, d’une réduction ou d’un régime fiscal particulier suppose que les conditions applicables soient documentées. Les éléments justificatifs nécessaires doivent être conservés et communiqués au cabinet afin d’apprécier le traitement retenu.</p>`},
  {id:"fisc-dividendes",cat:"Fiscalité",title:"Fiscalité des distributions",tags:"dividendes distribution prélèvements",
   html:`<p>Lorsqu’une distribution est envisagée, le cabinet peut vous présenter les principaux traitements déclaratifs relevant de la mission. Les décisions de distribution sont prises par les organes compétents de la société sur la base des informations juridiques et financières disponibles.</p>`},
  {id:"fisc-nonresident",cat:"Fiscalité",title:"Opérations avec l’étranger",tags:"international étranger retenue source",
   html:`<p>Les opérations réalisées avec des personnes ou entités situées à l’étranger doivent être signalées au cabinet, notamment lorsqu’elles présentent un caractère inhabituel. Une analyse spécifique peut être nécessaire en présence de retenues à la source, d’établissements étrangers ou de règles internationales.</p>`},
  {id:"fisc-immobilier",cat:"Fiscalité",title:"Opérations immobilières particulières",tags:"immobilier tva plus value fiscalité",
   html:`<p>Les acquisitions, cessions, travaux importants, changements d’affectation ou opérations immobilières atypiques sont signalés au cabinet avant leur réalisation lorsque cela est possible, afin d’identifier les traitements fiscaux nécessitant une analyse particulière.</p>`},
  {id:"social-contrats",cat:"Social",title:"Contrats et avenants de travail",tags:"contrat avenant salarié",
   html:`<p>La préparation des contrats et avenants compris dans la mission est réalisée à partir des informations communiquées par l’employeur. Toute particularité liée au poste, au temps de travail, à la rémunération ou au statut du salarié doit être signalée avant l’établissement du document.</p>`},
  {id:"social-absences",cat:"Social",title:"Absences et arrêts de travail",tags:"absence arrêt maladie paie",
   html:`<p>Les absences, arrêts de travail, congés et reprises sont transmis au cabinet dès que possible avec les justificatifs nécessaires. Une information tardive peut entraîner une régularisation sur une paie ou une déclaration ultérieure.</p>`},
  {id:"social-conges",cat:"Social",title:"Congés payés",tags:"congés payés compteur paie",
   html:`<p>L’employeur reste responsable de l’organisation, de la validation et du suivi des congés. Le cabinet traite les éléments communiqués pour la paie et attire votre attention sur les incohérences de compteur identifiées dans les données disponibles.</p>`},
  {id:"social-primes",cat:"Social",title:"Primes et éléments variables",tags:"prime variable bonus paie",
   html:`<p>Les primes, commissions, bonus et autres éléments variables sont transmis avec leur nature, leur montant et leur période de rattachement. Il appartient à l’employeur de valider leur attribution avant la date de préparation de la paie.</p>`},
  {id:"social-avantages",cat:"Social",title:"Avantages en nature et frais professionnels",tags:"avantage nature véhicule repas frais",
   html:`<p>Vous nous signalez les avantages en nature, mises à disposition de véhicules, logements, repas ou autres avantages ainsi que les modalités de remboursement des frais professionnels afin qu’ils puissent être traités dans la paie selon les informations communiquées.</p>`},
  {id:"social-mutuelle",cat:"Social",title:"Mutuelle et prévoyance",tags:"mutuelle prévoyance affiliation",
   html:`<p>Les affiliations, dispenses et changements relatifs aux régimes de frais de santé et de prévoyance sont communiqués au cabinet avec les justificatifs utiles. L’entreprise conserve les documents nécessaires à la justification des situations individuelles.</p>`},
  {id:"social-solde",cat:"Social",title:"Solde de tout compte",tags:"départ solde documents fin contrat",
   html:`<p>Pour préparer les éléments de fin de contrat, vous nous communiquez la date et le motif de départ, les éléments de rémunération restant dus, les congés, éventuelles indemnités et toute information utile. Les délais de traitement dépendent de la complétude de ces éléments.</p>`},
  {id:"social-urssaf",cat:"Social",title:"Assistance contrôle URSSAF",tags:"urssaf contrôle social assistance",
   html:`<p>En cas de contrôle d’un organisme social, le cabinet peut vous assister dans la collecte des pièces, l’analyse des demandes et la préparation des réponses. L’étendue de cette intervention est définie selon la procédure et les périodes concernées.</p>`},
  {id:"social-effectif",cat:"Social",title:"Évolution de l’effectif",tags:"effectif croissance paie volume",
   html:`<p>Une évolution significative de l’effectif, du nombre d’établissements, des conventions collectives ou de la complexité des éléments de paie peut conduire à adapter l’organisation de la mission et les honoraires correspondants.</p>`},
  {id:"social-epargne",cat:"Social",title:"Épargne salariale et dispositifs collectifs",tags:"intéressement participation pee épargne",
   html:`<p>La mise en place ou la modification d’un dispositif d’épargne salariale, d’intéressement ou d’avantage collectif constitue un sujet spécifique. Le besoin est cadré avec vous avant toute intervention afin de déterminer les travaux nécessaires.</p>`},
  {id:"jur-conventions",cat:"Juridique",title:"Conventions réglementées ou situations particulières",tags:"conventions réglementées dirigeant associé",
   html:`<p>Vous nous signalez les conventions, opérations ou flux intervenus entre la société et ses dirigeants, associés ou entités liées afin de permettre, lorsque cela relève du périmètre confié, leur prise en compte dans les documents juridiques annuels.</p>`},
  {id:"jur-dividendes",cat:"Juridique",title:"Décision de distribution de dividendes",tags:"dividendes distribution assemblée",
   html:`<p>Lorsqu’une distribution de dividendes est envisagée, les informations relatives au montant distribuable, aux bénéficiaires et aux modalités de versement sont arrêtées avec vous avant la préparation des actes correspondants.</p>`},
  {id:"jur-registres",cat:"Juridique",title:"Registres et documentation sociale",tags:"registre décisions assemblée juridique",
   html:`<p>Les registres, procès-verbaux et documents sociaux doivent être conservés de manière à assurer la continuité de la documentation juridique de la société. Les documents préparés par le cabinet vous sont remis pour conservation selon l’organisation convenue.</p>`},
  {id:"jur-be",cat:"Juridique",title:"Bénéficiaires effectifs",tags:"bénéficiaire effectif registre modification",
   html:`<p>Vous nous informez sans délai de toute évolution susceptible de modifier l’identité ou les modalités de contrôle des bénéficiaires effectifs. Les formalités correspondantes sont réalisées lorsqu’elles sont comprises dans le périmètre confié.</p>`},
  {id:"jur-dirigeant",cat:"Juridique",title:"Changement de dirigeant",tags:"président gérant dirigeant changement",
   html:`<p>Un changement de dirigeant nécessite la communication des informations et justificatifs relatifs au dirigeant entrant et sortant ainsi que des décisions envisagées. Les actes et formalités sont préparés après validation des éléments de l’opération.</p>`},
  {id:"jur-siege",cat:"Juridique",title:"Transfert de siège",tags:"siège transfert adresse formalité",
   html:`<p>En cas de transfert de siège, vous nous communiquez la nouvelle adresse, le justificatif d’occupation des locaux et les informations utiles à la préparation de la décision et des formalités correspondantes.</p>`},
  {id:"jur-capital",cat:"Juridique",title:"Modification du capital",tags:"capital augmentation réduction formalité",
   html:`<p>Les opérations affectant le capital nécessitent un cadrage préalable de leurs objectifs, modalités, calendrier et intervenants. Les travaux juridiques et formalités sont définis en fonction de l’opération effectivement retenue.</p>`},
  {id:"jur-transformation",cat:"Juridique",title:"Transformation de la société",tags:"transformation forme juridique sas sarl",
   html:`<p>Une transformation de la société implique une analyse préalable des conséquences juridiques, fiscales, sociales et organisationnelles de la nouvelle forme. Les actes et formalités sont préparés après validation de la structure retenue et des éventuels intervenants requis.</p>`},
  {id:"jur-cession",cat:"Juridique",title:"Cession de titres",tags:"cession actions parts associés",
   html:`<p>Une cession de titres fait l’objet d’un cadrage spécifique portant notamment sur les parties, le nombre de titres, le prix, les éventuelles clauses statutaires et les formalités nécessaires. Les aspects d’évaluation ou de négociation sont distingués des travaux de rédaction et de formalités.</p>`},
  {id:"jur-dissolution",cat:"Juridique",title:"Dissolution et liquidation",tags:"dissolution liquidation fermeture société",
   html:`<p>La dissolution et la liquidation d’une société constituent une opération distincte nécessitant la définition des étapes, du calendrier, de la situation comptable et des formalités à accomplir. Les travaux sont organisés en fonction de la situation effective de la société.</p>`},
  {id:"gest-tresorerie",cat:"Gestion",title:"Prévision de trésorerie",tags:"trésorerie cash prévision",
   html:`<p>La prévision de trésorerie est établie à partir des hypothèses d’encaissements, décaissements et événements communiqués. Elle doit être actualisée régulièrement pour rester pertinente comme outil de pilotage.</p>`},
  {id:"gest-seuil",cat:"Gestion",title:"Seuil de rentabilité",tags:"seuil rentabilité marge point mort",
   html:`<p>L’analyse du seuil de rentabilité repose sur la ventilation retenue entre charges variables et charges fixes ainsi que sur les hypothèses d’activité. Elle constitue un outil d’aide au pilotage et doit être interprétée avec les particularités économiques de l’entreprise.</p>`},
  {id:"gest-budget",cat:"Gestion",title:"Budget annuel",tags:"budget objectifs prévision",
   html:`<p>Le budget annuel traduit les hypothèses d’activité, de marge, de charges et d’investissement retenues avec la direction. Il sert de référence au suivi des écarts et peut être révisé lorsque les conditions d’exploitation évoluent significativement.</p>`},
  {id:"gest-marge",cat:"Gestion",title:"Analyse des marges",tags:"marge rentabilité produit activité",
   html:`<p>L’analyse des marges nécessite des données suffisamment détaillées et des règles d’affectation cohérentes. Les conclusions sont appréciées au regard des volumes, prix, coûts et conditions d’exploitation observés.</p>`},
  {id:"gest-planfin",cat:"Gestion",title:"Plan de financement",tags:"financement investissement plan",
   html:`<p>Le plan de financement présente les besoins et ressources associés au projet sur la base des hypothèses retenues. Il constitue un support de décision et de discussion avec les financeurs, sans préjuger de leur décision.</p>`},
  {id:"gest-scenario",cat:"Gestion",title:"Analyse de scénarios",tags:"scénario hypothèses simulation",
   html:`<p>Les simulations sont construites à partir d’hypothèses explicites afin de mesurer l’incidence de différents scénarios. Elles ne constituent pas une prévision certaine et doivent être actualisées lorsque les hypothèses changent.</p>`},
  {id:"outil-securite",cat:"Outils & organisation",title:"Sécurité des accès aux outils",tags:"sécurité mot passe accès utilisateur",
   html:`<p>Les identifiants d’accès aux outils mis à disposition sont personnels. Chaque utilisateur veille à la confidentialité de ses accès, à la mise à jour de ses coordonnées et au retrait rapide des droits des personnes qui n’ont plus à accéder aux données de l’entreprise.</p>`},
  {id:"outil-connecteurs",cat:"Outils & organisation",title:"Connexions bancaires et connecteurs",tags:"connecteur banque synchronisation",
   html:`<p>Les connexions automatisées aux banques ou applications facilitent la collecte des données mais ne dispensent pas d’un contrôle des flux importés. Toute rupture de connexion ou anomalie de synchronisation doit être signalée afin d’éviter des données manquantes.</p>`},
  {id:"outil-changement",cat:"Outils & organisation",title:"Changement de logiciel ou de processus",tags:"logiciel migration outil processus",
   html:`<p>Tout changement de logiciel de facturation, de paie, de caisse, de gestion ou de processus de transmission est signalé au cabinet en amont afin d’anticiper les impacts sur les interfaces, données attendues et contrôles à réaliser.</p>`},
  {id:"outil-documents",cat:"Outils & organisation",title:"Classement et conservation des documents",tags:"archivage classement document justificatif",
   html:`<p>L’entreprise conserve les originaux et documents dont elle a la responsabilité pendant les durées applicables à sa situation. Les outils du cabinet peuvent faciliter les échanges et le classement mais ne se substituent pas nécessairement à vos obligations propres de conservation.</p>`},
  {id:"hon-acompte",cat:"Honoraires & frais",title:"Acompte sur mission exceptionnelle",tags:"acompte honoraire mission ponctuelle",
   html:`<p>Pour certaines missions ponctuelles ou exceptionnelles, un acompte peut être demandé avant le démarrage des travaux. Le solde est facturé selon l’avancement ou à l’achèvement de l’intervention, conformément aux conditions convenues.</p>`},
  {id:"hon-reprise",cat:"Honoraires & frais",title:"Travaux de reprise ou de régularisation",tags:"reprise régularisation ancien exercice honoraires",
   html:`<p>Les travaux nécessaires pour reprendre, corriger ou régulariser des périodes antérieures ne sont pas automatiquement compris dans les honoraires courants. Lorsqu’ils sont significatifs, leur périmètre et leur traitement sont définis séparément.</p>`},
  {id:"hon-multientite",cat:"Honoraires & frais",title:"Périmètre multi-entités",tags:"groupe filiale entité honoraires",
   html:`<p>Les honoraires sont établis pour le périmètre d’entités identifié dans la proposition. Toute création, acquisition, intégration ou sortie d’une entité peut conduire à réexaminer l’organisation des travaux et les honoraires.</p>`},
  {id:"hon-exception",cat:"Honoraires & frais",title:"Intervention exceptionnelle sur demande",tags:"exceptionnel urgence complément honoraires",
   html:`<p>Une demande exceptionnelle nécessitant des recherches, simulations, réunions ou travaux spécifiques non prévus au périmètre courant peut faire l’objet d’une proposition complémentaire avant intervention.</p>`},
  {id:"lim-decision",cat:"Limites & précisions",title:"Décisions de gestion",tags:"décision gestion responsabilité dirigeant",
   html:`<p>Les analyses, simulations et recommandations fournies constituent des éléments d’aide à la décision. Les choix de gestion, d’investissement, de financement, de recrutement ou d’organisation demeurent de la responsabilité de la direction.</p>`},
  {id:"lim-previsions",cat:"Limites & précisions",title:"Données prévisionnelles",tags:"prévision hypothèse incertitude",
   html:`<p>Les données prévisionnelles sont par nature incertaines et dépendent des hypothèses retenues. Les réalisations futures peuvent différer sensiblement des estimations présentées, notamment en raison d’événements ou de décisions non connus à la date de leur établissement.</p>`},
  {id:"lim-tiers",cat:"Limites & précisions",title:"Utilisation par des tiers",tags:"tiers document destinataire responsabilité",
   html:`<p>Les documents établis pour les besoins de la mission sont conçus au regard de leur finalité convenue. Toute utilisation pour une autre finalité ou communication à un tiers peut nécessiter une appréciation préalable de leur caractère adapté.</p>`},
  {id:"lim-estimation",cat:"Limites & précisions",title:"Estimations et jugements de la direction",tags:"estimation provision jugement",
   html:`<p>Les estimations comptables et hypothèses de gestion nécessitent des appréciations de la direction sur la base des informations disponibles. Le cabinet peut en examiner la cohérence dans le cadre de sa mission sans se substituer aux décisions relevant de l’entreprise.</p>`},
  {id:"crea-choixforme",cat:"Création & développement",title:"Choix de la forme juridique",tags:"création forme juridique sas sarl ei",
   html:`<p>Le choix de la forme juridique est apprécié au regard du projet, de la gouvernance souhaitée, du nombre d’associés, des modalités de rémunération, du financement et des perspectives d’évolution. Les caractéristiques retenues sont validées avant la préparation des actes.</p>`},
  {id:"crea-businessplan",cat:"Création & développement",title:"Business plan de création",tags:"création business plan prévisionnel",
   html:`<p>Le business plan est construit à partir des hypothèses du porteur de projet et des éléments économiques disponibles. Il constitue un support de réflexion et de présentation du projet et doit être actualisé lorsque les hypothèses évoluent.</p>`},
  {id:"crea-apports",cat:"Création & développement",title:"Apports et financement initial",tags:"apport capital compte courant financement",
   html:`<p>Les modalités d’apport en capital, en compte courant ou de financement initial sont définies en cohérence avec les besoins du projet. Les justificatifs et informations nécessaires aux actes et à la comptabilisation sont communiqués avant la réalisation des opérations.</p>`},
  {id:"crea-demarrage",cat:"Création & développement",title:"Démarrage administratif de l’activité",tags:"création démarrage formalité administration",
   html:`<p>Au démarrage de l’activité, nous vous accompagnons sur les démarches comprises dans la mission et sur l’organisation des premiers échanges. Les inscriptions, autorisations ou démarches propres à l’activité qui ne relèvent pas du périmètre retenu restent à organiser avec les interlocuteurs compétents.</p>`},
  {id:"crea-reprise",cat:"Création & développement",title:"Projet de reprise d’entreprise",tags:"reprise acquisition cible audit",
   html:`<p>Un projet de reprise nécessite de distinguer l’analyse économique et financière, la structuration de l’acquisition, le financement, les aspects juridiques et les éventuelles diligences spécifiques. Le périmètre de notre intervention est défini en fonction de la phase du projet et des informations accessibles.</p>`},
  {id:"crea-croissance",cat:"Création & développement",title:"Croissance et changement d’échelle",tags:"croissance organisation recrutement processus",
   html:`<p>Une phase de croissance rapide peut modifier les besoins en organisation comptable, pilotage, paie, contrôle interne et financement. Nous pouvons réexaminer avec vous les outils et le périmètre d’accompagnement afin de les adapter à la nouvelle dimension de l’entreprise.</p>`},
  {id:"immo-loyers",cat:"Immobilier",title:"Suivi des loyers et charges",tags:"immobilier loyers charges locatives",
   html:`<p>Le suivi comptable des loyers et charges repose sur les baux, appels, quittances et règlements transmis. Les évolutions de loyer, franchises, dépôts de garantie et régularisations de charges doivent être signalés au cabinet.</p>`},
  {id:"immo-travaux",cat:"Immobilier",title:"Travaux immobiliers",tags:"immobilier travaux immobilisation charge",
   html:`<p>Les travaux immobiliers significatifs doivent être documentés par les devis, factures et éléments décrivant leur nature. Leur traitement peut dépendre de leur objet, de l’immeuble concerné et des conditions de réalisation.</p>`},
  {id:"immo-cession",cat:"Immobilier",title:"Cession d’un actif immobilier",tags:"immobilier cession plus-value",
   html:`<p>La cession d’un actif immobilier doit être signalée au cabinet suffisamment en amont lorsque cela est possible afin d’identifier les informations nécessaires au traitement comptable et fiscal de l’opération.</p>`},
  {id:"immo-financement",cat:"Immobilier",title:"Financement immobilier",tags:"immobilier emprunt financement",
   html:`<p>Les acquisitions financées nécessitent la transmission de l’acte, du décompte, du contrat de financement et de l’échéancier. Les frais liés à l’opération sont analysés à partir des documents disponibles.</p>`},
  {id:"asso-subventions",cat:"Associations",title:"Subventions et financements affectés",tags:"association subvention convention financeur",
   html:`<p>Les subventions, aides et financements affectés sont comptabilisés à partir des décisions d’attribution, conventions et conditions d’utilisation transmises. Les obligations de justification ou de compte rendu propres au financeur restent à identifier pour chaque dispositif.</p>`},
  {id:"asso-dons",cat:"Associations",title:"Dons, adhésions et ressources",tags:"association dons adhésion ressources",
   html:`<p>Les dons, cotisations, adhésions et autres ressources sont suivis à partir des informations et justificatifs transmis. Les règles d’émission des reçus ou attestations doivent être appréciées au regard de la situation propre de l’organisme.</p>`},
  {id:"asso-projets",cat:"Associations",title:"Suivi par projet ou activité",tags:"association projet analytique financeur",
   html:`<p>Lorsque l’association suit plusieurs projets ou financements, une organisation analytique peut être mise en place afin de rapprocher les ressources et dépenses des actions concernées. La qualité de ce suivi dépend des informations d’affectation communiquées.</p>`},
  {id:"asso-gouvernance",cat:"Associations",title:"Gouvernance associative",tags:"association conseil administration assemblée",
   html:`<p>Les décisions des organes de l’association et les évolutions de gouvernance doivent être formalisées et conservées selon les règles applicables à ses statuts et à son organisation. Les travaux juridiques éventuellement confiés au cabinet sont définis séparément.</p>`}
];

function customTextClauses(){
  return Array.isArray(st.settings?.customTextClauses)?st.settings.customTextClauses:[];
}
function builtinClauseOverrides(){
  const x=st.settings?.builtinClauseOverrides;
  return x&&typeof x==="object"&&!Array.isArray(x)?x:{};
}
function hiddenBuiltinClauseIds(){
  return Array.isArray(st.settings?.hiddenBuiltinClauseIds)?st.settings.hiddenBuiltinClauseIds:[];
}
function defaultClauseById(id){ return DEFAULT_TEXT_CLAUSES.find(x=>x.id===id)||null; }
function textClauseLibrary(){
  const overrides=builtinClauseOverrides(), hidden=new Set(hiddenBuiltinClauseIds());
  const built=DEFAULT_TEXT_CLAUSES.filter(x=>!hidden.has(x.id)).map(x=>{
    const o=overrides[x.id];
    return {...x,...(o||{}),id:x.id,builtin:true,modified:!!o};
  });
  const custom=customTextClauses().map(x=>({...x,builtin:false,modified:true}));
  return [...built,...custom];
}
function clauseLibraryStats(){
  return {visible:textClauseLibrary().length,custom:customTextClauses().length,modified:Object.keys(builtinClauseOverrides()).length,hidden:hiddenBuiltinClauseIds().length};
}
let CLAUSE_TARGET=null;
function clauseTargetEditor(scope,id){
  if(scope==="devis") return document.querySelector(`[data-rich-devis="${id}"]`);
  if(scope==="model") return document.querySelector('[data-rich-model="1"]');
  return null;
}
function selectedRichFragment(t){
  if(!t) return ""; restoreRichSelection(t);
  const sel=window.getSelection?.(); if(!sel||!sel.rangeCount) return "";
  const r=sel.getRangeAt(0);
  if(r.collapsed||(!t.contains(r.commonAncestorContainer)&&r.commonAncestorContainer!==t)) return "";
  const box=document.createElement("div"); box.appendChild(r.cloneContents());
  return sanitizeRichHTML(box.innerHTML);
}
function insertRichHTML(t,html){
  if(!t) return false;
  t.focus();
  let restored=restoreRichSelection(t);
  if(!restored){
    const r=document.createRange(); r.selectNodeContents(t); r.collapse(false);
    const s=window.getSelection?.(); if(s){s.removeAllRanges();s.addRange(r);}
  }
  try{ document.execCommand("insertHTML",false,sanitizeRichHTML(html)); }
  catch(e){
    const s=window.getSelection?.(); if(!s||!s.rangeCount) return false;
    const r=s.getRangeAt(0),frag=r.createContextualFragment(sanitizeRichHTML(html)); r.deleteContents(); r.insertNode(frag); r.collapse(false);
  }
  rememberRichSelection(t); return true;
}
function syncClauseTarget(){
  if(!CLAUSE_TARGET) return;
  const {scope,id,editor}=CLAUSE_TARGET;
  if(scope==="devis"){
    const d=curDev(); if(d&&!isDevisLocked(d)){ d.rep[id]=packRichText(editor.innerHTML); logAudit(d,"Clause insérée",findItem(id)?.label||"Texte libre"); saveDev(); }
  }else if(scope==="model"){
    const it=findItem(st.itemId); if(it){ it.html=packRichText(editor.innerHTML); logAudit(curMod(),"Clause insérée",it.label||"Texte libre"); saveMod(); }
  }
}
function clausePreviewText(x){
  const box=document.createElement("div"); box.innerHTML=sanitizeRichHTML(x.html||"");
  return `${x.title||""} ${x.cat||""} ${x.tags||""} ${box.textContent||""}`.toLowerCase();
}
function clauseEditorToolbarHTML(){
  return `<div class="rich-toolbar">
    <button type="button" data-ce-fmt="undo" title="Annuler">↶</button><button type="button" data-ce-fmt="redo" title="Rétablir">↷</button><span class="tool-sep"></span>
    <button type="button" data-ce-fmt="bold"><b>Gras</b></button><button type="button" data-ce-fmt="italic"><i>Italique</i></button><button type="button" data-ce-fmt="underline"><u>Souligné</u></button>
    <button type="button" data-ce-fmt="bullet">• Puces</button><button type="button" data-ce-fmt="number">1. Liste</button><button type="button" data-ce-fmt="paragraph">¶ Paragraphe</button><span class="tool-sep"></span>
    <select data-ce-size title="Taille de police"><option value="">Taille</option>${[8,9,9.6,10,11,12,14,16,18].map(x=>`<option value="${x}">${String(x).replace(".",",")} pt</option>`).join("")}</select>
    <button type="button" data-ce-fmt="clear">Effacer la mise en forme</button>
  </div>`;
}
function openClauseEditorModal(clause,onDone){
  if(!canRole("admin")){ toast("Action réservée à l'administrateur.",true); return; }
  const current=clause?{...clause}:{id:"",cat:"Général",title:"",tags:"",html:"<p></p>",builtin:false};
  const isBuiltin=!!current.builtin, isNew=!clause;
  const modal=document.createElement("div"); modal.className="modal clause-edit-modal";
  modal.innerHTML=`<div class="box">
    <div class="clause-head"><h2>${isNew?"Nouvelle clause":"Modifier la clause"}</h2><span class="dim">Les modifications s'appliqueront aux insertions futures. Les textes déjà insérés dans les dossiers restent indépendants.</span><span class="spacer"></span><button class="btn sm" data-ce-close>Fermer</button></div>
    <div class="clause-edit-form">
      <label class="f"><span>Titre</span><input type="text" data-ce-title value="${esc(current.title||"")}" placeholder="Ex. Transmission des variables de paie"></label>
      <label class="f"><span>Catégorie</span><input type="text" data-ce-cat value="${esc(current.cat||"Général")}" placeholder="Comptabilité, Social, Juridique…"></label>
      <label class="f wide"><span>Mots-clés de recherche</span><input type="text" data-ce-tags value="${esc(current.tags||"")}" placeholder="Mots-clés séparés par des espaces"></label>
      <div class="wide"><div class="f" style="margin-bottom:4px"><span>Texte de la clause</span></div><div class="clause-edit-editor">${clauseEditorToolbarHTML()}<div class="rich-content" contenteditable="true" data-ce-editor>${sanitizeRichHTML(current.html||"")}</div></div><div class="hint" style="margin-top:5px">Le texte reste entièrement modifiable après son insertion dans un devis ou un modèle.</div></div>
    </div>
    <div class="clause-edit-foot">${isBuiltin&&current.modified?`<button class="btn" data-ce-reset>Rétablir la version d'origine</button><span class="spacer"></span>`:"<span class=\"spacer\"></span>"}<button class="btn" data-ce-cancel>Annuler</button><button class="btn p" data-ce-save>${isNew?"Ajouter à la bibliothèque":"Enregistrer les modifications"}</button></div>
  </div>`;
  document.body.appendChild(modal);
  const ed=modal.querySelector("[data-ce-editor]");
  ed.onmouseup=ed.onkeyup=()=>rememberRichSelection(ed);
  modal.querySelectorAll("[data-ce-fmt]").forEach(b=>{ b.onmousedown=e=>e.preventDefault(); b.onclick=()=>applyEditorFormat(ed,b.dataset.ceFmt); });
  const size=modal.querySelector("[data-ce-size]"); size.onmousedown=()=>rememberRichSelection(ed); size.onchange=()=>{ if(size.value) applyEditorFontSize(ed,size.value); size.value=""; };
  const close=()=>modal.remove(); modal.querySelector("[data-ce-close]").onclick=close; modal.querySelector("[data-ce-cancel]").onclick=close; modal.onclick=e=>{if(e.target===modal)close();};
  const reset=modal.querySelector("[data-ce-reset]"); if(reset) reset.onclick=async()=>{
    if(!await askConfirm("Rétablir la clause",`Rétablir la version d'origine de « ${current.title} » ?`,{confirmLabel:"Rétablir"})) return;
    const o={...builtinClauseOverrides()}; delete o[current.id]; st.settings.builtinClauseOverrides=o;
    if(await saveSettings()){ close(); onDone?.(); toast("Version d'origine rétablie."); }
  };
  modal.querySelector("[data-ce-save]").onclick=async()=>{
    const title=modal.querySelector("[data-ce-title]").value.trim(), cat=modal.querySelector("[data-ce-cat]").value.trim()||"Général", tags=modal.querySelector("[data-ce-tags]").value.trim();
    const html=sanitizeRichHTML(ed.innerHTML);
    if(!title){ toast("Renseignez un titre pour la clause.",true); modal.querySelector("[data-ce-title]").focus(); return; }
    const probe=document.createElement("div"); probe.innerHTML=html; if(!probe.textContent.trim()&&!probe.querySelector("li")){ toast("Le texte de la clause est vide.",true); return; }
    if(isBuiltin){
      const o={...builtinClauseOverrides()}; o[current.id]={title,cat,tags,html}; st.settings.builtinClauseOverrides=o;
    }else{
      const arr=customTextClauses().slice(), data={id:current.id||("custom_"+uid()),title,cat,tags,html};
      const i=arr.findIndex(x=>x.id===current.id); if(i>=0) arr[i]=data; else arr.push(data); st.settings.customTextClauses=arr;
    }
    if(await saveSettings()){ close(); onDone?.(); toast(`Clause « ${title} » ${isNew?"ajoutée":"modifiée"}.`); }
  };
  setTimeout(()=>modal.querySelector("[data-ce-title]")?.focus(),20);
}
function openClauseLibrary(scope,id){
  const manage=scope==="manage", editor=manage?null:clauseTargetEditor(scope,id);
  if(!manage&&!editor) return;
  if(editor){ rememberRichSelection(editor); CLAUSE_TARGET={scope,id,editor}; } else CLAUSE_TARGET=null;
  document.querySelectorAll(".clause-modal").forEach(x=>x.remove());
  const modal=document.createElement("div"); modal.className="modal clause-modal";
  const stt=clauseLibraryStats();
  modal.innerHTML=`<div class="box">
    <div class="clause-head"><h2>${manage?"Gestion de la bibliothèque":"Bibliothèque de textes"}</h2><span class="dim">${manage?"Bibliothèque partagée du cabinet.":"Insérer une base puis l'adapter librement dans le devis."}</span><span class="spacer"></span>${canRole("admin")?`<span class="admin-actions"><button class="btn p sm" data-clause-new>+ Nouvelle clause</button>${stt.hidden?`<button class="btn sm" data-clause-restore>Restaurer ${stt.hidden} clause(s) d'origine supprimée(s)</button>`:""}</span>`:""}<button class="btn sm" data-clause-close>Fermer</button></div>
    <div class="clause-tools"><input type="text" data-clause-search placeholder="Rechercher une clause, un thème, un mot…"><select data-clause-cat></select></div>
    <div class="clause-body" data-clause-list></div>
    <div class="clause-foot">${manage?"Les modifications de la bibliothèque concernent uniquement les <b>insertions futures</b>. Les clauses déjà insérées dans un devis ou un modèle restent inchangées.":"L'insertion crée une <b>copie indépendante</b> dans le texte courant : elle peut être immédiatement réécrite, raccourcie, complétée ou mise en forme sans modifier la bibliothèque."}</div>
  </div>`;
  document.body.appendChild(modal);
  const refreshCats=()=>{
    const sel=modal.querySelector("[data-clause-cat]"), keep=sel.value;
    const cats=[...new Set(textClauseLibrary().map(x=>x.cat).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));
    sel.innerHTML=`<option value="">Toutes les catégories</option>${cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("")}`;
    if([...sel.options].some(o=>o.value===keep)) sel.value=keep;
  };
  const draw=()=>{
    refreshCats();
    const q=(modal.querySelector("[data-clause-search]")?.value||"").trim().toLowerCase(), cat=modal.querySelector("[data-clause-cat]")?.value||"";
    const a=textClauseLibrary().filter(x=>(!cat||x.cat===cat)&&(!q||clausePreviewText(x).includes(q)));
    const list=modal.querySelector("[data-clause-list]");
    list.innerHTML=a.length?a.map(x=>`<div class="clause-card">
      <div class="clause-meta"><span class="clause-cat">${esc(x.cat)}</span>${x.builtin?`<span class="tag gris">Origine</span>${x.modified?`<span class="tag ocre">Modifiée</span>`:""}`:`<span class="tag vert">Cabinet</span>`}</div>
      <div class="clause-title">${esc(x.title)}</div>
      <div class="clause-preview">${sanitizeRichHTML(x.html||"")}</div>
      <div class="clause-actions">${!manage?`<button class="btn p sm" data-clause-insert="${esc(x.id)}">Insérer</button>`:""}${canRole("admin")?`<button class="btn sm" data-clause-edit="${esc(x.id)}">Modifier</button><button class="btn danger sm" data-clause-delete="${esc(x.id)}">Supprimer</button>${x.builtin&&x.modified?`<button class="btn ghost sm" data-clause-reset="${esc(x.id)}">Rétablir l'origine</button>`:""}`:""}</div>
    </div>`).join(""):`<div class="empty" style="grid-column:1/-1;padding:28px"><b>Aucune clause trouvée</b>Modifiez votre recherche ou ajoutez une nouvelle clause.</div>`;
    list.querySelectorAll("[data-clause-insert]").forEach(b=>b.onclick=()=>{
      const c=textClauseLibrary().find(x=>x.id===b.dataset.clauseInsert); if(!c||!editor) return;
      if(insertRichHTML(editor,c.html)){ st.settings.clauseUsage={...(st.settings.clauseUsage||{}),[c.id]:(+(st.settings.clauseUsage||{})[c.id]||0)+1}; saveSettings(); auditGlobal("Clause insérée",c.title,"clause",c.id); syncClauseTarget(); modal.remove(); toast(`Clause « ${c.title} » insérée. Vous pouvez la modifier librement.`); }
    });
    list.querySelectorAll("[data-clause-edit]").forEach(b=>b.onclick=()=>{ const c=textClauseLibrary().find(x=>x.id===b.dataset.clauseEdit); if(c) openClauseEditorModal(c,draw); });
    list.querySelectorAll("[data-clause-reset]").forEach(b=>b.onclick=async()=>{
      if(!canRole("admin")) return; const c=textClauseLibrary().find(x=>x.id===b.dataset.clauseReset); if(!c?.builtin) return;
      if(!await askConfirm("Rétablir la clause",`Rétablir la version d'origine de « ${c.title} » ?`,{confirmLabel:"Rétablir"})) return;
      const o={...builtinClauseOverrides()}; delete o[c.id]; st.settings.builtinClauseOverrides=o; await saveSettings(); draw(); toast("Clause d'origine rétablie.");
    });
    list.querySelectorAll("[data-clause-delete]").forEach(b=>b.onclick=async()=>{
      if(!canRole("admin")) return; const c=textClauseLibrary().find(x=>x.id===b.dataset.clauseDelete); if(!c) return;
      if(!await askConfirm("Supprimer la clause",`Supprimer la clause « ${c.title} » de la bibliothèque du cabinet ?\n\nLes textes déjà insérés dans des devis ou modèles ne seront pas modifiés.`,{confirmLabel:"Supprimer",danger:true})) return;
      trashPush("clause",c,c.title||"Clause");
      if(c.builtin){
        const hidden=new Set(hiddenBuiltinClauseIds()); hidden.add(c.id); st.settings.hiddenBuiltinClauseIds=[...hidden];
        const o={...builtinClauseOverrides()}; delete o[c.id]; st.settings.builtinClauseOverrides=o;
      }else st.settings.customTextClauses=customTextClauses().filter(x=>x.id!==c.id);
      await saveSettings(); draw(); toast("Clause placée dans la corbeille.");
    });
  };
  modal.querySelector("[data-clause-close]").onclick=()=>modal.remove(); modal.onclick=e=>{if(e.target===modal)modal.remove();};
  modal.querySelector("[data-clause-search]").oninput=draw; modal.querySelector("[data-clause-cat]").onchange=draw;
  const add=modal.querySelector("[data-clause-new]"); if(add) add.onclick=()=>openClauseEditorModal(null,draw);
  const restore=modal.querySelector("[data-clause-restore]"); if(restore) restore.onclick=async()=>{ if(!await askConfirm("Restaurer les clauses","Réafficher toutes les clauses d'origine supprimées ?",{confirmLabel:"Restaurer"})) return; st.settings.hiddenBuiltinClauseIds=[]; await saveSettings(); modal.remove(); openClauseLibrary(scope,id); toast("Clauses d'origine réaffichées."); };
  draw(); setTimeout(()=>modal.querySelector("[data-clause-search]")?.focus(),20);
}
function paragraphHasOwnValue(d,it){
  return !!(d&&d.rep&&Object.prototype.hasOwnProperty.call(d.rep,it.id));
}
function paragraphSource(d,it){
  return paragraphHasOwnValue(d,it) ? String(d.rep[it.id]??"") : String((it&&it.html)||"");
}
function paragraphHasContent(d,m,s,it){
  if(isExpertiseItem(s,it) || isValuesItem(s,it)) return true;
  return richTextHasContent(paragraphSource(d,it));
}
function paragrapheHTML(d,m,s,it){
  const v=LMVARS(d,m);
  if(isExpertiseItem(s,it)) return expertiseVisualHTML();
  if(isValuesItem(s,it)) return valuesVisualHTML();
  if(paragraphHasOwnValue(d,it)){
    const txt=String(d.rep[it.id]??"");
    return txt.trim()?texteLibreHTML(txt,v):"";
  }
  return (it&&it.html)?bloc2html(it.html,v):"";
}
function quoteParagraphEditor(d,s,it,dis){
  const value=paragraphSource(d,it);
  const overridden=paragraphHasOwnValue(d,it);
  const missionText=hasLettreMission(d)?"Le texte ajusté sera repris sur le devis et, lorsqu’il est utilisé par la trame, dans la lettre de mission.":"Le texte ajusté sera repris sur le devis.";
  return `<div class="quote-rich-wrap"><div class="f rich-editor quote-rich-editor">
    <div class="rich-toolbar" role="toolbar" aria-label="Mise en forme du texte du devis">
      <button type="button" data-act="fmtDevis" data-i="${it.id}" data-fmt="bold" ${dis} title="Mettre la sélection en gras"><b>Gras</b></button>
      <button type="button" data-act="fmtDevis" data-i="${it.id}" data-fmt="italic" ${dis} title="Mettre la sélection en italique"><i>Italique</i></button>
      <button type="button" data-act="fmtDevis" data-i="${it.id}" data-fmt="underline" ${dis} title="Souligner la sélection"><u>Souligné</u></button>
      <button type="button" data-act="fmtDevis" data-i="${it.id}" data-fmt="bullet" ${dis} title="Créer une liste à puces">• Puces</button>
      <button type="button" data-act="fmtDevis" data-i="${it.id}" data-fmt="number" ${dis} title="Créer une liste numérotée">1. Liste</button>
      <button type="button" data-act="fmtDevis" data-i="${it.id}" data-fmt="paragraph" ${dis} title="Insérer un nouveau paragraphe">¶ Paragraphe</button>
      <button type="button" class="clause-btn" data-act="clauseLibrary" data-scope="devis" data-i="${it.id}" ${dis} title="Insérer un texte depuis la bibliothèque">📚 Bibliothèque</button>${canRole("admin")?`<button type="button" data-act="clauseSaveSelection" data-scope="devis" data-i="${it.id}" ${dis} title="Enregistrer la sélection dans la bibliothèque du cabinet">☆ Mémoriser</button>`:""}<span class="tool-sep"></span>
      <button type="button" data-act="fmtDevis" data-i="${it.id}" data-fmt="undo" ${dis} title="Annuler (Ctrl+Z)">↶</button><button type="button" data-act="fmtDevis" data-i="${it.id}" data-fmt="redo" ${dis} title="Rétablir (Ctrl+Y)">↷</button><button type="button" data-act="fmtDevis" data-i="${it.id}" data-fmt="clear" ${dis} title="Effacer la mise en forme">Effacer format</button>
      <select class="style-select" data-act="textStyleDevis" data-i="${it.id}" ${dis} title="Appliquer un style contrôlé"><option value="">Style</option><option value="normal">Texte normal</option><option value="subtitle">Intertitre</option><option value="small">Petit texte</option></select>
      <select data-act="fontSizeDevis" data-i="${it.id}" data-font-size="1" ${dis} title="Modifier la taille du texte sélectionné">
        <option value="">Taille</option><option value="8">8 pt</option><option value="9">9 pt</option><option value="9.6">9,6 pt · standard</option><option value="10">10 pt</option><option value="11">11 pt</option><option value="12">12 pt</option><option value="14">14 pt</option><option value="16">16 pt</option><option value="18">18 pt</option>
      </select>
      <button type="button" class="reset-model" data-act="paragraphReset" data-i="${it.id}" ${dis} title="Reprendre exactement le texte du modèle">↺ Reprendre le modèle</button>
    </div>
    <div class="rich-content" data-rich-devis="${it.id}" contenteditable="${dis?"false":"true"}" data-placeholder="Saisir le texte à faire apparaître dans le devis…" spellcheck="true">${legacyEditorHTML(value)}</div>
    <div class="hint">${missionText} Le modèle sert de point de départ : toute modification est propre à ce devis. La mise en forme et la taille de police apparaissent directement dans le texte, sans astérisques ni balises visibles.</div>
  </div></div>`;
}
/* v52 : le détail du calcul, replié par défaut. Il répond à « d'où sort ce
   montant ? » sans encombrer la ligne pour ceux qui ne se le demandent pas.
   Aucune valeur n'est recalculée ici : tout provient de `ligne()`. */
function detailCalculHTML(d,m,it,l){
  const lignes=[
    ["Origine du montant", l.source||"—"],
    ["Périodicité", l.per==="ponctuelle"?"ponctuelle":l.per==="mensuelle"?"mensuelle (annualisée × 12)":"annuelle"],
    ["Montant conseillé", Number.isFinite(l.conseil)?eur(l.conseil):"aucun"],
    ["Montant appliqué", eur(l.applique)],
    ["Prix forcé", l.force?"oui — saisie manuelle":"non — valeur du modèle"],
    ["Écart au conseil", l.ecart===null?"—":`${l.ecart>0?"+":""}${l.ecart.toFixed(1)} %`],
    ["Retenue au devis", l.retenue?"oui":"non — prestation écartée"],
    ["TVA", `${nb(it.tva??m.tva)} %`],
    ["Clé technique", it.cle||slug(it.label)]
  ];
  return `<div class="calcul-detail"><b>Détail du calcul</b><dl>${lignes.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(String(v))}</dd></div>`).join("")}</dl></div>`;
}
function qItem(d, m, s, it, ctx, seuil){
  const off = !!d.off[it.id];
  const dis = off || d.offSec[s.id] || isDevisLocked(d) ? "disabled" : "";
  const val = d.rep[it.id];
  const cb = `<div class="cb"><input type="checkbox" data-act="off" data-i="${it.id}" ${off?"":"checked"} ${isDevisLocked(d)?"disabled":""} title="${off?"Réintégrer":"Ne pas tenir compte et masquer au client"}"></div>`;

  /* Tous les paragraphes textuels restent modifiables au niveau du devis,
     même lorsqu'un texte par défaut est déjà renseigné dans le modèle. */
  if(it.type==="paragraphe"){
    if(isExpertiseItem(s,it) || isValuesItem(s,it)){
      const para=paragraphHasContent(d,m,s,it)?paragrapheHTML(d,m,s,it):"";
      return `<div class="q ${off?"hidden":""}">${cb}
        <div class="ql"><b>${esc(it.label)}</b>${it.aide?`<small>${esc(it.aide)}</small>`:""}</div>
        <div></div><div></div><div></div><div></div>
        ${para?`<div class="para">${para}</div>`:""}</div>`;
    }
    return `<div class="q quote-paragraph ${off?"hidden":""}">${cb}
      <div class="ql"><b>${esc(it.label)}</b>${it.aide?`<small>${esc(it.aide)}</small>`:""}</div>
      ${quoteParagraphEditor(d,s,it,dis)}</div>`;
  }

  let champ="";
  if(it.type==="texte") champ=`<input type="text" data-act="rep" data-i="${it.id}" value="${esc(val||"")}" ${dis}>`;
  else if(it.type==="nombre") champ=`<input type="number" data-act="rep" data-i="${it.id}" value="${esc(val??"")}" step="1" min="0" ${dis}>`;
  else if(it.type==="prixlibre") champ=`<div class="dim" style="font-size:11.5px;padding-top:7px">Prix libre — saisir le montant à droite</div>`;
  else if(it.type==="ouinon" && Array.isArray(it.reponses) && it.reponses.length<=4) champ=`<div class="seg-control" role="group" aria-label="${esc(it.label)}">
    ${it.reponses.map(r=>`<button type="button" data-act="repChoice" data-i="${it.id}" data-v="${r.id}" class="${val===r.id?"on":""}" aria-pressed="${val===r.id?"true":"false"}" ${dis}>${esc(r.label)}</button>`).join("")}
  </div>`;
  else champ=`<select data-act="rep" data-i="${it.id}" ${dis}><option value="">— choisir —</option>
    ${it.reponses.map(r=>`<option value="${r.id}" ${val===r.id?"selected":""}>${esc(r.label)}</option>`).join("")}</select>`;

  if(!it.prix){
    return `<div class="q ${off?"hidden":""}">${cb}
      <div class="ql"><b>${esc(it.label)}</b>${it.aide?`<small>${esc(it.aide)}</small>`:""}</div>
      <div>${champ}</div><div></div><div></div><div></div></div>`;
  }
  const l=ligne(d,m,it,ctx);
  const c=l.conseil, ok=Number.isFinite(c);
  const hors = l.force && l.ecart!==null && Math.abs(l.ecart)>seuil;
  const annuel = l.per==="ponctuelle" ? 0 : montantAnnuelUI(l.applique,l.per);
  const conseilAffiche = ok ? montantAnnuelUI(c,l.per) : c;
  const appliqueAffiche = montantAnnuelUI(l.applique,l.per);
  const recurrent = l.per!=="ponctuelle";
  return `<div class="q ${off?"hidden":""}">${cb}
    <div class="ql"><b>${esc(it.label)}</b>
      <small>${recurrent?"montant annuel":"ponctuel"} · TVA ${nb(it.tva??m.tva)} %${it.aide?" · "+esc(it.aide):""}</small></div>
    <div>${champ}</div>
    <div class="cons">${ok?`<b>${eur(conseilAffiche)}</b><span class="fk">${esc(l.source)}${l.per==="mensuelle"?" · annualisé × 12":""}</span>
        ${l.force?`<button data-act="conseil" data-i="${it.id}">appliquer</button>`:""}`
      :`<span class="dim" style="font-size:11.5px">${c===null?"pas de conseil":"fonction en erreur"}<span class="fk">${esc(l.source)}</span></span>`}</div>
    <div><input type="number" step="0.01" class="pu ${l.force?"forced":""}" data-act="prix" data-i="${it.id}" ${dis} title="${recurrent?"Saisir le montant annuel HT":"Saisir le montant HT"}"
      value="${l.force?Math.round(appliqueAffiche*100)/100:(ok?Math.round(conseilAffiche*100)/100:"")}" placeholder="${ok?"":(recurrent?"montant annuel HT":"montant HT")}"></div>
    <div class="ec ${l.force?(hors?"h":""):"n"}">${l.force&&l.ecart!==null?(l.ecart>0?"+":"")+l.ecart.toFixed(0)+" %":l.force?"libre":"modèle"}</div>
    <div class="tot">${!off&&l.retenue&&annuel?eur0(annuel)+"<br>/ an":""}</div>
    ${hors&&!off?`<div class="motif"><span>Écart ${l.ecart>0?"+":""}${l.ecart.toFixed(0)} % — motif</span>
      <input type="text" data-act="motif" data-i="${it.id}" value="${esc(l.motif)}" placeholder="Concurrence, volume, complexité non prévue par le modèle…"></div>`:""}
    ${st.questDetail?detailCalculHTML(d,m,it,l):""}
  </div>`;
}
function blocExc(d,m){
  return `<div class="qsec"><div class="hd"><b>Prestations exceptionnelles</b></div><div class="bd" style="padding:6px 15px">
    ${(m.exc||[]).filter(e=>exceptionalApplicable(d,m,e)).map(e=>{ const v=d.excPrix&&d.excPrix[e.id]!==undefined&&d.excPrix[e.id]!=="" ? +d.excPrix[e.id] : (+e.prix||0); return `<div class="q" style="grid-template-columns:26px 1fr 120px">
      <div class="cb"><input type="checkbox" data-act="exc" data-i="${e.id}" ${d.exc[e.id]?"checked":""}></div>
      <div class="ql"><b>${esc(e.label)}</b>${e.com?`<small>${esc(e.com)}</small>`:""}</div>
      <div><input type="number" step="0.01" data-act="excPrix" data-i="${e.id}" value="${v}" style="text-align:right"></div></div>`; }).join("")
      ||`<div class="dim" style="padding:10px 0">Aucune prestation exceptionnelle au modèle.</div>`}
  </div></div>`;
}
function blocDeb(d,m){
  return `<div class="qsec"><div class="hd"><b>Débours</b></div><div class="bd" style="padding:6px 15px">
    <div class="dim" style="font-size:12px;padding:6px 0">Frais avancés pour le compte du client, refacturés au réel. Le montant saisi n'est qu'une estimation communiquée au client.</div>
    ${(d.deb||[]).map((x,i)=>`<div class="q" style="grid-template-columns:1fr 120px 34px">
      <div><input type="text" data-act="debL" data-i="${i}" value="${esc(x.label)}" placeholder="Libellé"></div>
      <div><input type="number" data-act="debP" data-i="${i}" value="${esc(x.prix)}" step="1"></div>
      <div><button class="btn ghost sm" data-act="debDel" data-i="${i}">✕</button></div></div>`).join("")}
    <div style="padding:8px 0"><button class="btn sm" data-act="debAdd">+ Ajouter un débours</button></div>
  </div></div>`;
}
function ledger(d){
  const m=modOf(d); if(!m) return ""; const t=totaux(d,m), nOff=Object.values(d.off).filter(Boolean).length+Object.values(d.offSec).filter(Boolean).length;
  const hasRec=t.recAn>0, hasPon=t.pon>0;
  return `<div class="ledger"><div class="lh">Récapitulatif d'honoraires</div>${hasRec?`<div class="mens"><span>Récurrent mensuel HT</span><b>${eur(t.recMens)}</b></div>`:""}<div class="rows">
    ${hasRec?`<div class="lrow"><span>Récurrent annuel</span><b>${eur(t.recAn)}</b></div>`:""}${hasPon?`<div class="lrow"><span>Prestations ponctuelles</span><b>${eur(t.pon)}</b></div>`:""}
    <div class="lrow rule"><span>Total honoraires HT</span><b>${eur(t.ht)}</b></div><div class="lrow"><span>TVA</span><b>${eur(t.tva)}</b></div><div class="lrow big"><span>Total TTC</span><b>${eur(t.ttc)}</b></div></div>
    ${t.deb?`<div class="ledger-debours"><span>Débours, en sus</span><b>${eur(t.deb)}</b><small>Facturés au réel, hors total ci-dessus.</small></div>`:""}
    <div style="padding:9px 14px;border-top:1px solid var(--reglure);font-size:11px;color:var(--encre-55)">${t.lignes.length} ligne(s) retenue(s) · ${t.lignes.filter(l=>l.force).length} prix forcé(s)${(t.debLignes||[]).length?` · ${t.debLignes.length} débours`:""}${nOff?` · ${nOff} masqué(s)`:""}</div></div>`;
}

function missionContradictions(d,m,t=null){
  if(!d||!m||!hasLettreMission(d))return [];
  t=t||totaux(d,m);const out=[];
  const chunks=[];
  for(const l of (t.lignes||[])){
    chunks.push(`${l.it?.label||""} ${l.repLabel||""} ${l.it?.clientText||""}`);
    if(l.it?.type==="paragraphe")chunks.push(paragraphSource(d,l.it));
  }
  const corpus=normLabel(chunks.join(" "));
  const add=s=>{if(!out.includes(s))out.push(s);};
  /* v47 : on raisonne sur la nature effectivement applicable, qui peut être
     imposée par la lettre rattachée au type de mission retenu. */
  const natureEff=(typeof natureKeyOf==="function")?natureKeyOf(d):d.nature;
  if(natureEff==="TENUE"){
    if(/presentation des comptes|attestation de presentation|examen limite|assurance moderee|assurance raisonnable/.test(corpus))add("Mission sans assurance : le périmètre sélectionné contient une formulation pouvant promettre une présentation, un examen limité ou une assurance.");
  }else if(natureEff==="NP2300"){
    if(/examen limite|assurance moderee/.test(corpus))add("NP 2300 : une prestation sélectionnée semble relever d'un examen limité / d'une assurance modérée.");
    if(/sans assurance/.test(corpus))add("NP 2300 : une formulation « sans assurance » apparaît dans le périmètre sélectionné.");
  }else if(natureEff==="NP2400"){
    if(/presentation des comptes|attestation de presentation/.test(corpus))add("NP 2400 : une formulation de présentation des comptes apparaît dans le périmètre sélectionné.");
    if(/sans assurance/.test(corpus))add("NP 2400 : une formulation « sans assurance » apparaît dans le périmètre sélectionné.");
  }
  return out;
}

function warn(d){
  const m=modOf(d), t=totaux(d,m), seuil=+st.cab.ecartMax||0, w=[];
  if(!d.client.raison) w.push({text:"Dénomination du client manquante.",tab:"client",focus:'[data-d="client.raison"]'});
  if(!d.dateDebutDossier) w.push({text:"Date de début du dossier manquante.",tab:"client",focus:'[data-d="dateDebutDossier"]'});
  /* v47 : une mission ponctuelle n'a ni exercice couvert ni date de début
     contractuelle — le délai de réalisation tient lieu d'échéancier. */
  const missionPonctuelle=(typeof natureKeyOf==="function")&&estNaturePonctuelle(natureKeyOf(d));
  if(hasLettreMission(d)&&!missionPonctuelle&&!d.debut) w.push({text:"Date de début de la mission manquante.",tab:"client",focus:'[data-d="debut"]'});
  if(!d.client.email||!emailOk(d.client.email)) w.push({text:"Courriel du signataire manquant ou invalide.",tab:"client",focus:'[data-d="client.email"]'});
  if(d.client.siren&&!sirenOk(d.client.siren)) w.push({text:"SIREN invalide.",tab:"client",focus:'[data-d="client.siren"]'});
  if(!st.cab.nom) w.push({text:"Identité du cabinet non renseignée.",nav:"cabinet",focus:'[data-c="nom"]'});
  if(hasLettreMission(d)&&!String(d.referentiel||"").trim()) w.push({text:"Référentiel comptable à préciser dans la lettre de mission.",tab:"doc",focus:'[data-d="referentiel"]'});
  if(hasLettreMission(d)&&!String(d.rgpdMode||"").trim()) w.push({text:"Qualification RGPD à définir.",tab:"doc",focus:'[data-d="rgpdMode"]'});
  if(hasLettreMission(d)&&m){
    const comptesItem=m.sections.flatMap(s=>s.items).find(it=>normLabel(it.label).includes("creation revision et edition des comptes annuels"));
    const choix=comptesItem?String(repLu(d,comptesItem)||""):"";
    const nat=(typeof natureKeyOf==="function")?natureKeyOf(d):d.nature;
    if(nat==="TENUE" && /avec présentation/i.test(choix)) w.push({text:"Incohérence : mission sans assurance mais prestation « avec présentation » retenue.",tab:"quest"});
    if(nat==="NP2300" && /sans présentation/i.test(choix)) w.push({text:"Incohérence : NP 2300 sélectionnée mais prestation « sans présentation » retenue.",tab:"quest"});
  }
  for(const c of missionContradictions(d,m,t)) w.push({text:`Contradiction de mission : ${c}`,tab:"quest"});
  /* Le détail des points d'acceptation vit sur la fiche client : ici une
     seule ligne, qui y renvoie directement. */
  const master=clientMasterOf(d), blocages=controleConformite(d);
  if(blocages.length) w.push({
    text:master?`Dossier d'acceptation du client à finaliser : ${blocages.length} point(s).`:"Dénomination du client à renseigner pour ouvrir son dossier d'acceptation.",
    client:master?.id||"", tab:master?"":"client", focus:master?"":'[data-d="client.raison"]'
  });
  const hh=honorairesParCategorie(d,m); for(const cat of HONOR_CATS){ const c=hh.cats[cat]; for(const kind of ["recAn","pon"]){ const base=kind==="recAn"?c.baseRecAn:c.basePon,val=kind==="recAn"?c.recAn:c.pon; if(!(base>0)) continue; const dd=commercialDelta(base,val); if(dd.pct!==null&&Math.abs(dd.pct)>seuil&&!String(d.catPrix?.[cat]?.[commercialReasonKey(kind)]||"").trim()) w.push({text:`Motif commercial manquant : ${cat} (${dd.pct>0?"+":""}${dd.pct.toFixed(1)} %).`,tab:"quest"}); } }
  for(const s of (m?.sections||[])) for(const it of (s.items||[])){
    if(!it.requirePositivePrice || masque(d,s,it)) continue;
    const l=ligne(d,m,it,t.ctx);
    if(l.repondu && !(l.applique>0)) w.push({text:`Honoraires à renseigner pour « ${it.label} ».`,tab:"quest"});
  }
  if(t.err.length) w.push({text:`Fonction en erreur, prix conseillé indisponible : ${t.err.map(l=>l.it.label).join(", ")}.`,tab:"quest"});
  const sansMotif=t.lignes.filter(l=>l.force&&l.ecart!==null&&Math.abs(l.ecart)>seuil&&!l.motif.trim()); if(sansMotif.length) w.push({text:`Écart à justifier : ${sansMotif.map(l=>l.it.label).join(", ")}.`,tab:"quest"});
  if(!w.length) return `<div class="notice vert">${hasLettreMission(d)?"Dossier complet. Le devis et la lettre de mission peuvent être établis.":"Dossier complet. Le devis peut être établi."}</div>`;
  return `<div class="notice"><b>À compléter</b><ul class="warn-actions">${w.map(x=>`<li><button ${x.tab?`data-jump-tab="${x.tab}"`:""} ${x.nav?`data-jump-nav="${x.nav}"`:""} ${x.client?`data-jump-client="${x.client}"`:""} ${x.focus?`data-focus='${esc(x.focus)}'`:""}>${esc(x.text)} →</button></li>`).join("")}</ul></div>`;
}


function ysTemplateKey(d,m){
  const c=dashboardColorType(d,m);return c==="legal"?"legal":dashboardSectionType(d,m)==="punctual"?"punctual":"traditional";
}
function signatureMessageFor(d,m){
  const key=ysTemplateKey(d,m),tpl=st.settings?.ysMessageTemplates?.[key]||SETTINGS_DEFAULT.ysMessageTemplates[key]||"";
  return fill(tpl,LMVARS(d,m)).replace(/<[^>]+>/g,"");
}
