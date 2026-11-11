/* --------------------------------------------------------- cabinet */
const ci=(k,l,ph)=>`<label class="f"><span>${l}</span><input type="text" data-c="${k}" value="${esc(st.cab[k]||"")}" placeholder="${esc(ph||"")}"></label>`;
/* v53.14 — le cadre « Conditions financières » du devis.
   Une condition par ligne. Le même éditeur sert au modèle du cabinet et,
   dans l’onglet Documents, à la dérogation d’un dossier. */
const CF_VARIABLES = [
  ["conditions.periodicite","périodicité de facturation retenue au questionnaire"],
  ["conditions.reglement","modalité de règlement retenue au questionnaire"],
  ["cabinet.penalites","taux de pénalités de retard ci-dessus"],
  ["cabinet.recouvrement","indemnité forfaitaire de recouvrement ci-dessus"],
  ["conditions.indexation","clause d’indexation ci-dessus"],
  ["honoraires.ht","total des honoraires HT du devis"],
  ["devis.echeance","date de fin de validité du devis"]
];
function conditionsFinancieresAideHTML(){
  return `<div class="hint" style="margin-top:6px">Une condition par ligne — chaque ligne devient une puce du cadre « Conditions financières » du devis.
    Laisser vide retire la section du devis. <b>**gras**</b> accepté.
    Variables : ${CF_VARIABLES.map(([k,t])=>`<code title="${esc(t)}">{{${k}}}</code>`).join(" · ")}</div>`;
}
function conditionsFinancieresEditeurHTML(){
  return `<label class="f" style="grid-column:1/-1"><span>Conditions financières du devis</span>
    <textarea data-c="conditionsFinancieres" rows="4">${esc(conditionsFinancieresModele())}</textarea>
    ${conditionsFinancieresAideHTML()}</label>`;
}

VIEWS.cabinet = () => `
  <div class="top"><h1>Identité du cabinet</h1><span class="sub">Reprise sur tous les documents</span></div>
  <div class="wrap"><div class="grid g2">
    <div class="card"><div class="hd">Structure et mentions légales</div><div class="bd grid g2">
      ${ci("nom","Dénomination","SERRE")}${ci("forme","Forme sociale","Société par actions simplifiée (SAS)")}
      ${ci("capital","Capital social (€)")}${ci("siren","SIREN")}${ci("rcs","RCS")}${ci("tva","TVA intracommunautaire")}
      ${ci("naf","Code NAF / APE")}${ci("euid","EUID")}${ci("gestion","N° de gestion RCS")}${ci("cloture","Clôture de l'exercice")}
      ${ci("adresse","Adresse")}<div class="grid g2">${ci("cp","Code postal")}${ci("ville","Ville")}</div>
      ${ci("tel","Téléphone")}${ci("email","Courriel")}${ci("site","Site internet")}${ci("activite","Activité principale")}
      <label class="f" style="grid-column:1/-1"><span>Présidence / représentant légal</span><input type="text" data-c="president" value="${esc(st.cab.president||"")}"></label>
      <div class="legal-source" style="grid-column:1/-1"><b>Référentiel SERRE</b> — ${esc(st.cab.sourceLegale||"Kbis à contrôler")}. Les champs officiels peuvent être réappliqués sans toucher aux paramètres de prix, à la RCP ni au signataire.<div style="margin-top:8px"><button class="btn sm" data-act="cabSerre">Réappliquer les données SERRE 2026</button></div></div>
    </div></div>
    <div class="card"><div class="hd">Mentions professionnelles et politique de prix</div><div class="bd grid g2">
      ${ci("region","Conseil régional de l'ordre")}${ci("ordre","Numéro d'inscription")}
      ${ci("rcp","Assureur RCP et police")}${ci("signataire","Associé signataire")}
      ${ci("qualite","Qualité")}${ci("penalites","Pénalités de retard")}
      <label class="f"><span>Indemnité de recouvrement (€)</span><input type="number" data-c="recouvrement" value="${esc(st.cab.recouvrement)}"></label>
      <label class="f"><span>Indemnité de résiliation anticipée (% des honoraires)</span><input type="number" min="0" max="100" step="1" data-c="indemniteResiliation" value="${esc(st.cab.indemniteResiliation)}" title="Pourcentage des honoraires de l'exercice dû par le client qui met fin à la mission sans respecter le préavis. Figure à l'article 7 des conditions générales."></label>
      <label class="f"><span>Révision annuelle des honoraires (%)</span><input type="number" min="0" max="100" step="0.5" data-c="revisionHonoraires" value="${esc(st.cab.revisionHonoraires)}">
        <div class="hint">Revalorisation appliquée de plein droit à chaque reconduction. Figure à l’article 5 des conditions générales de la lettre de mission, et nulle part sur le devis.</div></label>
      <label class="f"><span>Écart de prix toléré sans motif (%)</span><input type="number" data-c="ecartMax" value="${esc(st.cab.ecartMax)}">
        <div class="hint">Au-delà, un motif est exigé sur la ligne du devis.</div></label>
      <label class="f" style="grid-column:1/-1"><span>Médiateur de la consommation</span><input type="text" data-c="mediateur" value="${esc(st.cab.mediateur)}"></label>
      <label class="f" style="grid-column:1/-1"><span>Clause d'indexation</span><textarea data-c="indexation">${esc(st.cab.indexation)}</textarea>
        <div class="hint">Depuis la v53.15, la révision des honoraires est traitée à l’article 5 des conditions générales et ne figure plus sur le devis. Ce texte n’est repris que si vous appelez <code>{{conditions.indexation}}</code> dans les conditions financières ci-dessous.</div></label>
      ${conditionsFinancieresEditeurHTML()}
    </div></div></div>
  <div class="legal-source" style="margin-top:16px"><b>Source légale prioritaire :</b> l'extrait Kbis du 7 juin 2026. Le pied de page du site public affiche encore des mentions historiques (SASU / 3 000 €) : elles ne sont pas reprises dans les documents générés par cette version.</div>
  <div class="card" style="margin-top:16px"><div class="hd">Sauvegarde et reprise</div><div class="bd">
    <div class="row"><button class="btn" data-act="exportData">Exporter les données (.json)</button>
      <label class="btn" style="cursor:pointer">Importer une sauvegarde<input type="file" accept="application/json,.json" data-act="importData" style="display:none"></label></div>
    <div class="hint" style="margin-top:8px">L'export contient l'identité du cabinet, les modèles, les lettres, les devis, les clients et les réglages d'affichage. Les paramètres personnels Yousign ne sont pas exportés.</div>
    ${S.mode==="local"?`<div class="notice" style="margin-top:10px">Cette version utilise le stockage local du navigateur : les données ne sont pas partagées entre collaborateurs. Utilisez l'export JSON pour sauvegarder ou transférer le référentiel.</div>`:""}
  </div></div>
  <div class="notice" style="margin-top:16px">Pour un client personne physique agissant hors activité professionnelle s'ajoutent
    l'information précontractuelle et l'affichage TTC du code de la consommation, ainsi que la mention du médiateur.</div>
  </div>`;

/* --------------------------------------------------------- réglages */


function excelVal(row,names){
  for(const n of names){if(Object.prototype.hasOwnProperty.call(row,n)&&String(row[n]??"").trim()!=="")return row[n];}
  const keys=Object.keys(row),target=names.map(normLabel);for(const k of keys)if(target.includes(normLabel(k)))return row[k];
  return "";
}
function parseMoney(v){if(typeof v==="number")return v;const s=String(v??"").replace(/\s/g,"").replace(/[€$]/g,"").replace(",",".");const n=Number(s);return Number.isFinite(n)?n:0;}
function modelFromExcelRows(rows,{title,desc,per,lmId}){
  const m={id:uid(),titre:title||"Modèle importé",desc:desc||"Import Excel",statut:"brouillon",cats:[],tva:20,devise:"EUR",per:per||"annuelle",lmId:lmId||null,sections:[],exc:[],deb:[],createdAt:nowISO(),modifiedAt:nowISO(),sourceLabel:"Import Excel"};
  const sectionMap=new Map(),itemMap=new Map();
  for(const row of rows){
    const secTitle=String(excelVal(row,["Section","Rubrique"])||"Prestations").trim(),cat=String(excelVal(row,["Catégorie","Categorie","Domaine"])||"Comptabilité").trim()||"Comptabilité",label=String(excelVal(row,["Prestation","Question","Libellé","Libelle"])||"").trim();
    if(!label)continue;
    let sec=sectionMap.get(secTitle);if(!sec){sec=SEC(secTitle,cat,[]);m.sections.push(sec);sectionMap.set(secTitle,sec);if(!m.cats.includes(cat))m.cats.push(cat);}
    const key=sec.id+"|"+label.toLowerCase(),typeRaw=normLabel(excelVal(row,["Type","Type de champ"])),response=String(excelVal(row,["Réponse","Reponse","Choix"])||"").trim();
    let type=typeRaw.includes("parag")?"paragraphe":typeRaw.includes("oui")?"ouinon":typeRaw.includes("nombre")?"nombre":typeRaw.includes("prix")?"prixlibre":typeRaw.includes("texte")?"texte":response?"liste":"texte";
    let it=itemMap.get(key);
    if(!it){
      const cle=String(excelVal(row,["Clé","Cle","Key"])||slug(label)).trim(),tva=Number(excelVal(row,["TVA","Tva"])||20),itemPer=String(excelVal(row,["Périodicité","Periodicite","Periode"])||per||"annuelle").trim().toLowerCase();
      it=I(label,type,{cle,per:["mensuelle","annuelle","ponctuelle"].includes(itemPer)?itemPer:(per||"annuelle"),tva:Number.isFinite(tva)?tva:20,prix:!["texte","paragraphe"].includes(type),aide:String(excelVal(row,["Aide","Note interne"])||""),clientText:String(excelVal(row,["Texte client","Précision client","Precision client"])||"")});
      if(type==="paragraphe"){it.prix=false;it.html=String(excelVal(row,["Texte","Texte client","Contenu"])||"");}
      sec.items.push(it);itemMap.set(key,it);
      const condCle=String(excelVal(row,["Condition clé","Condition cle","Si clé","Si cle"])||"").trim(),condVal=String(excelVal(row,["Condition valeur","Valeur condition","Si valeur"])||"").trim();
      if(condCle){it.showIf={cle:condCle};if(condVal)it.showIf.values=condVal.split("|").map(x=>x.trim()).filter(Boolean);}
    }
    if(["liste","ouinon"].includes(it.type)&&response){
      const price=parseMoney(excelVal(row,["Prix","Montant","Tarif"])),r=R(response,price);it.reponses.push(r);
    }else if(["nombre","prixlibre"].includes(it.type)){
      const price=parseMoney(excelVal(row,["Prix","Montant","Tarif"]));if(price)it.fn={type:"expr",expr:String(price)};
    }
  }
  if(!m.sections.length)m.sections=[SEC("Prestations","Comptabilité",[])];
  return m;
}

function buildBackupData(){
  return {format:"grille-mission",version:33,appVersion:APP_VERSION,exporteLe:nowISO(),cabinet:st.cab,modeles:st.modeles,lettres:st.lettres,devis:st.devis,clients:st.clients,reglages:st.settings,yousign:st.ys,auditLog:st.auditLog,trash:st.trash,errorLog:st.errorLog};
}
function backupSummary(data){
  return {
    date:data?.exporteLe?dateTimeFR(data.exporteLe):"Date inconnue",
    modeles:Array.isArray(data?.modeles)?data.modeles.length:0,
    lettres:Array.isArray(data?.lettres)?data.lettres.length:0,
    devis:Array.isArray(data?.devis)?data.devis.length:0,
    clients:Array.isArray(data?.clients)?data.clients.length:0,
    audit:Array.isArray(data?.auditLog)?data.auditLog.length:0,
    corbeille:Array.isArray(data?.trash)?data.trash.length:0
  };
}
async function sha256Text(s){
  if(!crypto?.subtle)return "";
  const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(s)));
  return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function showIfRules(node){
  if(!node?.showIf)return [];
  return Array.isArray(node.showIf)?node.showIf.filter(Boolean):[node.showIf];
}
function modelItemEntries(m){
  const out=[];
  for(const section of (m?.sections||[])) for(const item of (section.items||[])){
    out.push({item,section,rules:[...showIfRules(section),...showIfRules(item)]});
  }
  return out;
}
function ruleNumberSet(rule){
  if(!rule||rule.n===undefined||rule.n===null)return null;
  const a=Array.isArray(rule.n)?rule.n:[rule.n];
  return new Set(a.map(Number).filter(Number.isFinite));
}
function ruleValueSet(rule,key="values"){
  const a=Array.isArray(rule?.[key])?rule[key]:null;
  return a?new Set(a.map(normLabel)):null;
}
function setsDisjoint(a,b){
  if(!a||!b)return false;
  for(const x of a)if(b.has(x))return false;
  return true;
}
function rulePairExclusive(a,b){
  if(!a||!b||a.cle!==b.cle||a.allowEmpty||b.allowEmpty)return false;
  const an=ruleNumberSet(a),bn=ruleNumberSet(b);
  if(an&&bn&&setsDisjoint(an,bn))return true;
  const av=ruleValueSet(a),bv=ruleValueSet(b);
  if(av&&bv&&setsDisjoint(av,bv))return true;
  const anot=ruleValueSet(a,"notValues"),bnot=ruleValueSet(b,"notValues");
  if(av&&bnot&&[...av].every(x=>bnot.has(x)))return true;
  if(bv&&anot&&[...bv].every(x=>anot.has(x)))return true;
  const amin=a.min===undefined?-Infinity:Number(a.min),amax=a.max===undefined?Infinity:Number(a.max);
  const bmin=b.min===undefined?-Infinity:Number(b.min),bmax=b.max===undefined?Infinity:Number(b.max);
  if(Number.isFinite(amax)&&Number.isFinite(bmin)&&amax<bmin)return true;
  if(Number.isFinite(bmax)&&Number.isFinite(amin)&&bmax<amin)return true;
  if(an&&(b.min!==undefined||b.max!==undefined)){
    const ok=[...an].some(x=>x>=bmin&&x<=bmax);if(!ok)return true;
  }
  if(bn&&(a.min!==undefined||a.max!==undefined)){
    const ok=[...bn].some(x=>x>=amin&&x<=amax);if(!ok)return true;
  }
  return false;
}
function entriesMutuallyExclusive(a,b){
  for(const ra of (a?.rules||[])) for(const rb of (b?.rules||[])) if(rulePairExclusive(ra,rb))return true;
  return false;
}
function duplicateGroupIsExclusive(group){
  for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++)if(!entriesMutuallyExclusive(group[i],group[j]))return false;
  return true;
}
function duplicateKeyIsProvisional(key,group){
  const k=String(key||"");
  if(["nouvelle_prestation","champ","prestation"].includes(k))return true;
  return group.every(e=>String(e.item?.cle||"")===slug(e.item?.label||"")) && group.every(e=>normLabel(e.item?.label||"").includes("nouvelle prestation"));
}
function modelIssues(m){
  const out=[];if(!m)return [{level:"error",text:"Modèle introuvable."}];
  if(!String(m.titre||"").trim())out.push({level:"error",text:"Le modèle n'a pas de titre."});
  if(!Array.isArray(m.sections)||!m.sections.length)out.push({level:"error",text:"Le modèle ne contient aucune section."});
  const entries=modelItemEntries(m),all=entries.map(e=>e.item),groups=new Map();
  for(const e of entries){const k=e.item.cle||slug(e.item.label);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e);}
  for(const [k,group] of groups){
    if(group.length<2||duplicateGroupIsExclusive(group))continue;
    if(duplicateKeyIsProvisional(k,group))out.push({level:"warn",text:`Clé provisoire répétée : ${k}. Renommez les prestations concernées ; SERRE générera ensuite une clé technique unique.`});
    else out.push({level:"error",text:`Clé de calcul dupliquée hors branches exclusives : ${k}.`});
  }
  for(const e of entries){const it=e.item;
    if(["liste","ouinon"].includes(it.type)&&!(it.reponses||[]).length)out.push({level:"warn",text:`« ${it.label} » n'a aucune réponse.`});
    if(it.prix&&["liste","ouinon"].includes(it.type)&&(it.reponses||[]).every(r=>!(+r.val||r.fn)))out.push({level:"warn",text:`« ${it.label} » porte un prix mais toutes les réponses sont à 0 €.`});
    const fns=[it.fn,...(it.reponses||[]).map(r=>r.fn)].filter(Boolean);
    for(const fn of fns){
      if(!fn.src)continue;
      const srcGroup=groups.get(fn.src)||[];
      if(!srcGroup.length)out.push({level:"error",text:`« ${it.label} » dépend de la clé inexistante « ${fn.src} ».`});
      else if(srcGroup.length>1&&!duplicateGroupIsExclusive(srcGroup)&&!duplicateKeyIsProvisional(fn.src,srcGroup))out.push({level:"error",text:`« ${it.label} » dépend de la clé ambiguë « ${fn.src} ».`});
    }
  }
  const nodes=[...(m.sections||[]),...all,...(m.exc||[])];
  for(const node of nodes){
    const rules=showIfRules(node);
    for(const rule of rules){
      const srcGroup=groups.get(rule?.cle)||[];
      if(rule?.cle&&!srcGroup.length)out.push({level:"error",text:`Condition invalide sur « ${node.titre||node.label} » : source « ${rule.cle} » absente.`});
      if(srcGroup.length&&Array.isArray(rule.n)){
        const nums=new Set();for(const src of srcGroup)for(const [i,r] of (src.item.reponses||[]).entries())nums.add(Number(r.n!==null&&r.n!==undefined&&r.n!==""?r.n:i));
        const bad=rule.n.filter(n=>!nums.has(Number(n)));if(bad.length)out.push({level:"error",text:`Condition invalide sur « ${node.titre||node.label} » : réponse(s) ${bad.join(", ")} inexistante(s).`});
      }
    }
  }
  return out;
}
function modelConsistencyHTML(m){
  const issues=modelIssues(m), errors=issues.filter(x=>x.level==="error").length;
  return `<div class="model-health ${errors?"err":""}"><b>${errors?`${errors} erreur(s) de cohérence`:`Modèle cohérent`}</b>${issues.length?issues.map(x=>`<div class="issue"><span class="tag ${x.level==="error"?"rouge":"ocre"}">${x.level==="error"?"Erreur":"Alerte"}</span> ${esc(x.text)}</div>`).join(""):`<div class="hint">Aucune incohérence structurelle détectée.</div>`}</div>`;
}
function duplicateClientGroups(){
  const g=new Map();for(const c of st.clients){const k=sirenKey(c.siren||"");if(!k||k.length!==9)continue;if(!g.has(k))g.set(k,[]);g.get(k).push(c);}
  return [...g.entries()].filter(([,a])=>a.length>1).map(([siren,clients])=>({siren,clients}));
}
function integrityReport(){
  const out=[], clientIds=new Set(st.clients.map(c=>c.id)), modelIds=new Set(st.modeles.map(m=>m.id));
  for(const g of duplicateClientGroups())out.push({level:"warn",type:"duplicate",text:`SIREN ${g.siren} présent sur ${g.clients.length} fiches client.`,data:g});
  for(const d of st.devis){
    if(d.clientId&&!clientIds.has(d.clientId))out.push({level:"error",type:"orphan-client",text:`Dossier ${d.ref||d.id} rattaché à une fiche client inexistante.`,devisId:d.id});
    if(!d.frozenModel&&d.modeleId&&!modelIds.has(d.modeleId))out.push({level:"error",type:"orphan-model",text:`Dossier ${d.ref||d.id} utilise un modèle supprimé sans snapshot figé.`,devisId:d.id});
    if(!String(d.client?.raison||"").trim())out.push({level:"warn",type:"client-name",text:`Dossier ${d.ref||d.id} sans dénomination client.`,devisId:d.id});
  }
  const refs=new Map();for(const d of st.devis){if(!d.ref)continue;if(refs.has(d.ref))out.push({level:"error",type:"duplicate-ref",text:`Référence de devis dupliquée : ${d.ref}.`,devisId:d.id});else refs.set(d.ref,d.id);}
  for(const m of st.modeles){
    for(const issue of modelIssues(m).filter(x=>x.level==="error"))out.push({level:"error",type:"model",text:`${m.titre} : ${issue.text}`,modelId:m.id});
    if(m.lmId){const L=st.lettres.find(x=>x.id===m.lmId);if(!L)out.push({level:"error",type:"missing-letter",text:`${m.titre} : lettre de mission introuvable.`,modelId:m.id});else if(L.statut!=="publie")out.push({level:"warn",type:"letter-not-published",text:`${m.titre} : lettre « ${L.nom} » non publiée (${L.statut}).`,modelId:m.id});}
    /* v47 : contrôle des rattachements conditionnels de lettre de mission. */
    for(const r of (m.lmRules||[])){
      const item=(m.sections||[]).flatMap(s=>s.items||[]).find(x=>(x.cle||slug(x.label))===r.cle);
      if(!item){out.push({level:"error",type:"lm-rule-key",text:`${m.titre} : règle de lettre de mission fondée sur la clé « ${r.cle} », absente du questionnaire.`,modelId:m.id});continue;}
      if(!r.lmId){out.push({level:"error",type:"lm-rule-empty",text:`${m.titre} : règle « ${r.cle} » sans lettre de mission désignée.`,modelId:m.id});continue;}
      const L=st.lettres.find(x=>x.id===r.lmId);
      if(!L)out.push({level:"error",type:"missing-letter",text:`${m.titre} : lettre conditionnelle introuvable pour la règle « ${r.cle} ».`,modelId:m.id});
      else if(L.statut!=="publie")out.push({level:"warn",type:"letter-not-published",text:`${m.titre} : lettre conditionnelle « ${L.nom} » non publiée (${L.statut}).`,modelId:m.id});
    }
  }
  return out;
}
/* Ancienneté d'un accès resté sur le mot de passe provisoire : c'est la
   durée pendant laquelle un mot de passe commun et connu ouvre ce compte. */
function accesAnciennete(r){
  if(!r?.invited_at) return "";
  const jours=Math.floor((Date.now()-new Date(r.invited_at).getTime())/86400000);
  if(!Number.isFinite(jours)||jours<0) return "";
  return jours<1?" · depuis aujourd'hui":jours===1?" · depuis 1 jour":` · depuis ${jours} jours`;
}
function modelUsageStats(){
  return st.modeles.map(m=>{
    const ds=st.devis.filter(d=>d.modeleId===m.id||d.frozenModel?.id===m.id||d.frozenModel?.sourceVersion===m.sourceVersion);
    return {m,count:ds.length,signed:ds.filter(d=>["signe","classe"].includes(workflowStatut(d))).length,last:ds.sort((a,b)=>String(b.majAt||b.cree).localeCompare(String(a.majAt||a.cree)))[0]};
  }).sort((a,b)=>b.count-a.count);
}
function clauseUsageStats(){
  const usage=st.settings?.clauseUsage||{};
  return textClauseLibrary().map(c=>({c,count:+usage[c.id]||0})).sort((a,b)=>b.count-a.count);
}
function healthCard(name,x){
  const state=x?.ok===true?"OK":x?.ok===false?"ERREUR":"Non testé",cls=x?.ok===true?"ok":x?.ok===false?"bad":"";
  return `<div class="health-card"><div class="name">${esc(name)}</div><div class="state ${cls}">${state}</div><small>${esc(x?.detail||"Lancer le diagnostic.")}</small></div>`;
}
function toolsTabButton(id,label){return `<button data-act="toolsTab" data-tab="${id}" class="${st.toolsTab===id?"on":""}">${label}</button>`;}
function toolsContent(){
  const tab=st.toolsTab||"health";
  if(tab==="health"){
    const h=st.systemHealth||{};
    return `<div class="card"><div class="hd">Santé du système <span class="spacer"></span><button class="btn p sm" data-act="healthCheck">Lancer tous les tests</button></div><div class="bd"><div class="health-grid">${healthCard("Application",{ok:true,detail:`v${APP_VERSION} · ${APP_BUILD_DATE}`})}${healthCard("Supabase",h.supabase)}${healthCard("RNE / INPI",h.rne)}${healthCard("Yousign",h.yousign)}${healthCard("Rendu PDF",h.pdf)}</div><div class="hint" style="margin-top:10px">Le diagnostic ne modifie aucune donnée et peut être exécuté à tout moment.</div></div></div>
    <div class="card" style="margin-top:13px"><div class="hd">Service de rendu PDF et de signature</div><div class="bd">
      <div class="create-summary-row"><span>Adresse du service</span><b class="mono">${esc(st.ys.proxy||DEFAULT_RENDER_PROXY)}</b></div>
      <div class="create-summary-row"><span>Environnement de signature</span><b>${esc(st.ys.env||"—")}</b></div>
      <div class="hint" style="margin-top:9px">Cette adresse figurait en tête de l'onglet Documents de chaque dossier. Elle relève du diagnostic : elle est identique pour tous les dossiers et ne change qu'en cas d'incident. Elle se modifie dans Administration &gt; Signature Yousign.</div>
      <div class="row" style="margin-top:10px;gap:8px"><button class="btn sm" data-act="ysTest">Tester la disponibilité</button><button class="btn sm" data-nav="yousign">Modifier la configuration</button></div>
    </div></div>`;
  }
  if(tab==="integrity"){
    const issues=integrityReport(),dups=duplicateClientGroups();
    return `<div class="card"><div class="hd">Contrôles d'intégrité <span class="spacer"></span><span class="tag ${issues.some(x=>x.level==="error")?"rouge":"vert"}">${issues.length} anomalie(s)</span></div><div class="bd">${issues.length?`<div class="integrity-list">${issues.map(x=>`<div class="integrity-item"><span class="integrity-sev ${x.level==="error"?"err":"warn"}">${x.level==="error"?"!":"?"}</span><div><b>${esc(x.text)}</b></div>${x.devisId?`<button class="btn sm" data-act="toolOpenDevis" data-id="${x.devisId}">Ouvrir</button>`:x.modelId?`<button class="btn sm" data-act="toolOpenModel" data-id="${x.modelId}">Modèle</button>`:""}</div>`).join("")}</div>`:`<div class="notice vert"><b>Aucune anomalie structurelle détectée.</b></div>`}
      ${dups.length?`<div style="margin-top:16px"><h3>Doublons SIREN</h3>${dups.map(g=>`<div class="trash-item"><div><b>${esc(g.siren)}</b><div class="hint">${g.clients.map(c=>c.raison||"Sans nom").join(" · ")}</div></div><button class="btn sm" data-act="mergeDuplicateGroup" data-siren="${g.siren}">Fusionner</button></div>`).join("")}</div>`:""}</div></div>`;
  }
  if(tab==="trash"){
    return `<div class="card"><div class="hd">Corbeille <span class="spacer"></span><span class="tag gris">${st.trash.length}</span></div><div class="bd">${st.trash.length?st.trash.map(x=>`<div class="trash-item"><div><b>${esc(x.label||x.type)}</b><div class="hint">${esc(x.type)} · supprimé ${dateTimeFR(x.deletedAt)} par ${esc(x.deletedBy||"")}</div></div><button class="btn sm" data-act="trashRestore" data-id="${x.id}">Restaurer</button></div>`).join(""):`<div class="empty-state"><b>Corbeille vide</b><small>Les devis, modèles, lettres, sections, prestations et clauses supprimés apparaîtront ici.</small></div>`}</div></div>`;
  }
  if(tab==="audit"){
    const a=(st.auditLog||[]).slice(0,300);
    return `<div class="card"><div class="hd">Journal d'audit <span class="spacer"></span><button class="btn sm" data-act="auditExport">Exporter CSV</button></div><div class="bd">${a.length?`<table class="audit-table"><thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Objet</th><th>Détail</th></tr></thead><tbody>${a.map(x=>`<tr><td class="mono">${dateTimeFR(x.at)}</td><td>${esc(x.actor||"")}</td><td><b>${esc(x.label||"")}</b></td><td>${esc(x.entity||"")}</td><td>${esc(x.detail||"")}</td></tr>`).join("")}</tbody></table>`:`<div class="empty-state"><b>Aucun événement</b></div>`}</div></div>`;
  }
  if(tab==="errors"){
    const a=(st.errorLog||[]).slice(0,200);
    return `<div class="card"><div class="hd">Erreurs applicatives <span class="spacer"></span><button class="btn sm" data-act="errorsClear">Vider le journal local</button></div><div class="bd">${a.length?`<table class="audit-table"><thead><tr><th>Date</th><th>Contexte</th><th>Vue</th><th>Message</th></tr></thead><tbody>${a.map(x=>`<tr><td class="mono">${dateTimeFR(x.at)}</td><td><span class="error-code">${esc(x.context)}</span></td><td>${esc(x.view||"")}</td><td>${esc(x.message||"")}</td></tr>`).join("")}</tbody></table>`:`<div class="empty-state"><b>Aucune erreur enregistrée</b><small>Les erreurs JavaScript et promesses non gérées sont collectées ici.</small></div>`}</div></div>`;
  }
  if(tab==="backup"){
    return `<div class="card"><div class="hd">Sauvegarde & restauration</div><div class="bd"><div class="grid g2"><div><b>Export complet</b><p class="hint">Inclut cabinet, modèles, lettres, devis, clients, réglages, audit, corbeille et erreurs.</p><div class="row"><button class="btn p" data-act="exportData">Exporter la sauvegarde</button><button class="btn" data-act="backupSelfTest">Tester l'export à blanc</button></div></div><div><b>Restauration</b><p class="hint">L'import affiche un résumé complet avant toute écriture. Conservez une copie de l'état courant avant de restaurer.</p><label class="btn" style="cursor:pointer">Choisir une sauvegarde<input type="file" accept="application/json,.json" data-act="importData" style="display:none"></label></div></div></div></div>`;
  }
  if(tab==="stats"){
    const mods=modelUsageStats(),clauses=clauseUsageStats();
    return `<div class="grid g2" style="align-items:start"><div class="card"><div class="hd">Utilisation des modèles</div><div class="bd">${mods.map(x=>`<div class="trash-item"><div><b>${esc(x.m.titre)}</b><div class="hint">${x.count} dossier(s) · ${x.signed} signé(s)${x.last?` · dernier ${dateFR(x.last.dateDevis||x.last.cree)}`:""}</div></div><span class="tag ${x.m.statut==="publie"?"vert":"gris"}">${esc(x.m.statut||"")}</span></div>`).join("")}</div></div><div class="card"><div class="hd">Utilisation des clauses</div><div class="bd">${clauses.slice(0,40).map(x=>`<div class="trash-item"><div><b>${esc(x.c.title)}</b><div class="hint">${esc(x.c.cat||"")}</div></div><span class="tag gris">${x.count}</span></div>`).join("")}</div></div></div>`;
  }
  return "";
}
VIEWS.outils=()=>`<div class="top"><h1>Outils internes</h1><span class="sub">Santé, audit, intégrité, sauvegardes et maintenance</span><span class="spacer"></span><span class="mono">SERRE v${APP_VERSION}</span></div><div class="wrap"><div class="tools-tabs">${toolsTabButton("health","Santé")}${toolsTabButton("integrity","Intégrité")}${toolsTabButton("trash","Corbeille")}${toolsTabButton("audit","Audit")}${toolsTabButton("errors","Erreurs")}${toolsTabButton("backup","Sauvegardes")}${toolsTabButton("stats","Statistiques")}</div>${toolsContent()}</div>`;

VIEWS.reglages = () => {
  const rows=[
    ["missionTraditional","Missions normales","Couleur de fond appliquée aux lignes et à l'en-tête des missions récurrentes."],
    ["missionPunctual","Ponctuelles comptables","Couleur de fond appliquée aux missions uniquement ponctuelles comptables."],
    ["missionLegal","Ponctuelles juridiques","Couleur de fond appliquée aux missions ponctuelles à dominante juridique."]
  ], roles=SB_PROFILES||[],
  /* v47 : comptes ouverts par le cabinet dont le mot de passe provisoire
     n'a pas encore été remplacé par le collaborateur. */
  attente=roles.filter(r=>r.must_change_password);
  const b=brandData();
  /* v52 : les réglages tenaient sur une seule page longue. Quatre
     rubriques, une à la fois — l'apparence, les utilisateurs, la
     bibliothèque de textes et les connexions externes. */
  const RUBRIQUES=[["apparence","Apparence"],["utilisateurs","Utilisateurs"],["textes","Bibliothèque de textes"],["connexions","Connexions"]];
  const RUB=RUBRIQUES.some(x=>x[0]===st.reglagesRub)?st.reglagesRub:"apparence";
  return `<div class="top"><h1>Réglages</h1><span class="sub">${esc((RUBRIQUES.find(x=>x[0]===RUB)||[])[1]||"")}</span></div>
  <div class="wrap reglages" data-rub-actif="${RUB}">
    <div class="vues-barre">${RUBRIQUES.map(([k,l])=>`<button class="vue-onglet ${RUB===k?"on":""}" data-reglages-rub="${k}">${esc(l)}</button>`).join("")}</div>
    <div class="card" data-rub="apparence" style="max-width:900px;margin-bottom:14px"><div class="hd">Identité de l'application — marque blanche</div><div class="bd"><div class="settings-brand-grid">
    <label class="f"><span>Nom de l'application</span><input type="text" data-act="settingBrandText" data-k="brandProduct" value="${esc(b.product)}"></label>
    <label class="f"><span>Sous-titre</span><input type="text" data-act="settingBrandText" data-k="brandSubtitle" value="${esc(b.subtitle)}"></label>
    <label class="f"><span>Couleur principale</span><input type="color" data-act="settingBrandColor" data-k="brandPrimary" value="${esc(b.primary)}"></label>
    <label class="f"><span>Couleur de la barre latérale</span><input type="color" data-act="settingBrandColor" data-k="brandRail" value="${esc(b.rail)}"></label>
    <label class="f wide"><span>URL du logo (optionnel)</span><input type="text" data-act="settingBrandText" data-k="brandLogoUrl" value="${esc(b.logo)}" placeholder="https://.../logo.png"><div class="hint">PNG, JPG, WebP ou SVG accessible en HTTPS.</div></label>
    <label class="f wide"><span>Sous-titre des documents</span><input type="text" data-act="settingBrandText" data-k="documentTagline" value="${esc(b.documentTagline)}"></label></div>
    <div class="brand-preview" style="margin-top:14px;background:${esc(b.rail)}">${b.logo?`<img class="brand-preview-logo" src="${esc(b.logo)}" alt="">`:`<i class="rings"></i>`}<div><b>${esc(b.product)}</b><small>${esc(b.subtitle)} · ${esc(st.cab.nom||"Cabinet")}</small></div></div>
    <div class="hint" style="margin-top:10px">Cette couche prépare la marque blanche. Une commercialisation multi-cabinet sur une instance Supabase unique nécessitera ensuite une isolation multi-tenant des données.</div></div></div>
  <div class="card" data-rub="apparence" style="max-width:900px;margin-bottom:14px"><div class="hd">Couleurs des types de mission</div><div class="bd">
    <div class="color-settings">${rows.map(([k,l,h])=>{const v=safeColor(st.settings[k],SETTINGS_DEFAULT[k]);return `<label class="color-setting"><div><b>${l}</b><div class="hint">${h}</div></div><input type="color" data-act="settingColor" data-k="${k}" value="${v}" title="Choisir la couleur"><span class="color-chip" style="background:${v}"></span></label>`;}).join("")}</div>
    <div class="hint" style="margin-top:10px">La couleur choisie est utilisée directement dans le portefeuille. ${esc(brandData().product)} calcule automatiquement un texte, un liseré, un badge et un survol lisibles à partir de votre couleur.</div>
    <div class="row" style="margin-top:14px"><button class="btn" data-act="settingsReset">Rétablir les couleurs par défaut</button></div>
  </div></div>
  <div class="card" data-rub="textes" style="max-width:900px;margin-bottom:14px"><div class="hd">Bibliothèque de textes du cabinet</div><div class="bd">
    ${(()=>{const x=clauseLibraryStats();return `<div class="row" style="justify-content:space-between"><div><b>${x.visible} clause(s) disponible(s)</b><div class="hint">${DEFAULT_TEXT_CLAUSES.length} clauses d'origine · ${x.custom} clause(s) ajoutée(s) par le cabinet · ${x.modified} clause(s) d'origine modifiée(s)${x.hidden?` · ${x.hidden} supprimée(s)`:""}.</div></div><button class="btn p" data-act="clauseLibraryManage">Gérer la bibliothèque</button></div>`;})()}
    <div class="hint" style="margin-top:10px">Réservé aux administrateurs : ajouter, modifier ou supprimer des clauses. Les textes déjà insérés dans les devis et modèles restent indépendants et ne sont jamais réécrits rétroactivement.</div>
  </div></div>
  <div class="card" data-rub="connexions" style="max-width:900px;margin-bottom:14px"><div class="hd">Connexions externes</div><div class="bd">
    <div class="create-summary-row"><span>Base de données partagée</span><b>${S.mode==="supabase"?"Supabase — connectée":S.mode==="local"?"Navigateur seul":"Session temporaire"}</b></div>
    <div class="create-summary-row"><span>Service de rendu PDF et signature</span><b class="mono">${esc(st.ys.proxy||DEFAULT_RENDER_PROXY)}</b></div>
    <div class="create-summary-row"><span>Environnement de signature</span><b>${st.ys.env==="production"?"Production":"Bac à sable"}</b></div>
    <div class="row" style="margin-top:11px;gap:8px"><button class="btn sm" data-nav="yousign">Configurer la signature</button><button class="btn sm" data-nav="outils">Diagnostic des services</button></div>
    <div class="hint" style="margin-top:9px">Le référentiel RNE / INPI et le rendu PDF passent par ce même service.</div>
  </div></div>
  <div class="card" data-rub="utilisateurs" style="max-width:900px"><div class="hd">Droits utilisateurs — Supabase</div><div class="bd">
    <div class="hint" style="margin-bottom:10px">Collaborateur = préparation des dossiers ; Manager / associé = ajustements commerciaux, modèles, lettres et envoi ; Administrateur = identité du cabinet, connecteurs, réglages et droits.</div>
    ${ACCESS_BACKEND_READY?`<div class="row" style="margin-bottom:12px"><button class="btn p" data-act="accesCreer">Ouvrir un accès collaborateur</button>${attente.length?`<span class="tag ocre">${attente.length} mot(s) de passe provisoire(s) en circulation</span>`:""}</div>
      <div class="role-grid">${roles.map(r=>`<div class="role-row"><div><b>${esc(r.email||"Utilisateur")}</b>${r.id===SB_USER?.id?` <span class="tag gris">Vous</span>`:""}${r.must_change_password?` <span class="tag ocre" title="Le collaborateur ne s'est pas encore connecté pour choisir son mot de passe.">Mot de passe provisoire${accesAnciennete(r)}</span>`:""}</div><select data-act="profileRole" data-id="${esc(r.id)}"><option value="collaborateur" ${r.role==="collaborateur"?"selected":""}>Collaborateur</option><option value="manager" ${r.role==="manager"?"selected":""}>Manager / associé</option><option value="admin" ${r.role==="admin"?"selected":""}>Administrateur</option></select><span class="tag ${r.role==="admin"?"ocre":r.role==="manager"?"vert":"gris"}">${esc(ROLE_LABEL[r.role]||r.role)}</span>${r.id===SB_USER?.id?"":`<button class="btn sm" data-act="accesReinit" data-email="${esc(r.email||"")}" title="Replacer ce compte sur le mot de passe provisoire">Réinitialiser</button>`}</div>`).join("")||`<div class="notice">Aucun profil Supabase n'est encore enregistré.</div>`}</div>
      ${attente.length?`<div class="notice" style="margin-top:12px"><b>Accès ouverts mais jamais utilisés.</b><br>Le mot de passe provisoire est commun à tous les nouveaux comptes : tant qu'il n'a pas été remplacé, quiconque le connaît peut se connecter à la place du collaborateur et fixer son mot de passe. Relancez ces comptes, ou réinitialisez-les si l'arrivée est reportée.<ul style="margin:7px 0 0;padding-left:17px">${attente.map(r=>`<li>${esc(r.email||r.id)}${accesAnciennete(r)}</li>`).join("")}</ul></div>`:""}
      <div class="notice vert" style="margin-top:12px"><b>Sécurité active :</b> le rôle provient de la table <span class="mono">profiles</span> et les politiques RLS limitent les écritures côté base. La création d'un compte passe par la fonction <span class="mono">acces-collaborateur</span>, seule détentrice de la clé d'administration : elle revérifie côté serveur que vous êtes administrateur. La suppression définitive d'un compte reste dans Supabase → Authentication → Users.</div>`
      :`<div class="notice rouge"><b>Configuration Supabase à terminer.</b><br>La table <span class="mono">profiles</span> / les politiques RLS v14 ne sont pas encore accessibles. L'application fonctionne temporairement en mode administrateur de compatibilité. Appliquez le fichier SQL fourni avec la v14.<div class="hint" style="margin-top:6px">${esc(ACCESS_BACKEND_ERROR||"")}</div></div>`}
  </div></div></div>`;
};

/* --------------------------------------------------------- yousign */
VIEWS.yousign = () => {
  const t={...SETTINGS_DEFAULT.ysMessageTemplates,...(st.settings.ysMessageTemplates||{})};
  return `<div class="top"><h1>Signature Yousign</h1><span class="sub">Connecteur et messages d'accompagnement</span></div>
  <div class="wrap"><div class="grid g2" style="align-items:start">
    <div class="card"><div class="hd">Paramètres ${helpTip("La clé API reste uniquement sur Render. SERRE ne stocke jamais la clé Yousign dans le navigateur.")}</div><div class="bd grid" style="gap:13px">
      <label class="f"><span>URL du service interne</span><input type="text" data-y="proxy" value="${esc(st.ys.proxy)}" placeholder="https://signature.cabinet.fr">
        <div class="hint">Service Render du cabinet. Il détient seul la clé API.</div></label>
      <label class="f"><span>Environnement</span><select data-y="env"><option value="sandbox" ${st.ys.env==="sandbox"?"selected":""}>Bac à sable</option><option value="production" ${st.ys.env==="production"?"selected":""}>Production</option></select></label>
      <label class="f"><span>Authentification du signataire</span><select data-y="auth"><option value="no_otp" ${st.ys.auth==="no_otp"?"selected":""}>Lien reçu par courriel</option><option value="otp_email" ${st.ys.auth==="otp_email"?"selected":""}>Code par courriel</option><option value="otp_sms" ${st.ys.auth==="otp_sms"?"selected":""}>Code par SMS</option></select></label>
      <div><button class="btn" data-act="ysTest">Tester la connexion</button></div>
    </div></div>
    <div class="card"><div class="hd">Principe de fonctionnement</div><div class="bd"><ol style="margin:0 0 10px 18px;padding:0"><li>Conversion du devis et de la lettre de mission en PDF.</li><li>Création de la demande de signature.</li><li>Ajout du signataire et des champs.</li><li>Retour du statut dans SERRE.</li></ol><div class="notice">Le suivi manuel reste utilisable lorsque l'envoi Yousign est effectué hors de SERRE.</div></div></div>
  </div>
  <div class="card" style="margin-top:14px"><div class="hd">Modèles de messages ${helpTip("Ces textes peuvent être copiés même lorsque vous créez ou envoyez la demande Yousign manuellement.")}</div><div class="bd grid">
    <label class="f"><span>Mission normale</span><textarea data-act="ysTemplate" data-k="traditional" style="min-height:120px">${esc(t.traditional)}</textarea></label>
    <label class="f"><span>Ponctuelle comptable</span><textarea data-act="ysTemplate" data-k="punctual" style="min-height:120px">${esc(t.punctual)}</textarea></label>
    <label class="f"><span>Ponctuelle juridique</span><textarea data-act="ysTemplate" data-k="legal" style="min-height:120px">${esc(t.legal)}</textarea></label>
    <div class="hint">Variables disponibles : {{client.contact}}, {{client.raison}}, {{devis.ref}}, {{mission.modele}}, {{responsable.nom}}, etc.</div>
  </div></div></div>`;
};

