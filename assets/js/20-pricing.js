/* ============================================================= calcul */
const HELPERS = {
  si:(c,a,b)=>c?a:b, min:Math.min, max:Math.max,
  arrondi:(v,p)=>{ const k=Math.pow(10,p||0); return Math.round((+v||0)*k)/k; },
  palier(v){ const a=[...arguments].slice(1);
    for(let i=0;i<a.length;i+=2) if((+v||0)<=+a[i]) return +a[i+1]||0;
    return +a[a.length-1]||0; }
};
const FN_CACHE = new Map();
function evalExpr(expr, vars){
  if(!String(expr||"").trim()) return 0;
  const hk=Object.keys(HELPERS), vk=Object.keys(vars), key=expr+"|"+vk.join(",");
  try{
    let f=FN_CACHE.get(key);
    if(!f){ f=new Function(...hk,...vk,"return ("+expr+");"); FN_CACHE.set(key,f); }
    const r=f(...hk.map(k=>HELPERS[k]),...vk.map(k=>vars[k]));
    return Number.isFinite(+r)?+r:NaN;
  }catch(e){ return NaN; }
}
/* contexte : valeur numérique et index de réponse pour chaque clé */
function ctxDe(dev, mod){
  const vars={}, idx={};
  mod.sections.forEach(s=>s.items.forEach(it=>{
    const cle=it.cle||slug(it.label), a=dev.rep[it.id];
    if(it.type==="nombre"){ vars[cle]=+a||0; idx[cle]=-1; }
    else if(it.type==="liste"||it.type==="ouinon"){
      const i=it.reponses.findIndex(r=>r.id===a);
      idx[cle]=i;
      const r=it.reponses[i];
      vars[cle]= r ? (r.n!==null&&r.n!==undefined&&r.n!==""?+r.n:i) : 0;
    }
    else if(it.type==="prixlibre"){ vars[cle]=+a||0; idx[cle]=-1; }
    else { vars[cle]=0; idx[cle]=-1; }
  }));
  return { vars, idx, mod };
}
function evalFn(fn, ctx){
  if(!fn) return 0;
  if(fn.type==="mult"){ const v=ctx.vars[fn.src]; return v===undefined?NaN:(+v||0)*(+fn.k||0); }
  if(fn.type==="bareme"){
    const i=ctx.idx[fn.src];
    if(i===undefined) return NaN;
    if(i<0) return 0;
    const v=(fn.vals||[])[i];
    return v===undefined?0:+v||0;
  }
  if(fn.type==="expr") return evalExpr(fn.expr, ctx.vars);
  return NaN;
}
function libelleFn(fn, mod){
  if(!fn) return "";
  const nomSrc = c => { for(const s of mod.sections) for(const it of s.items) if((it.cle||slug(it.label))===c) return it.label; return c; };
  if(fn.type==="mult") return `${nomSrc(fn.src)} × ${nb(fn.k)}`;
  if(fn.type==="bareme") return `barème sur « ${nomSrc(fn.src)} »`;
  if(fn.type==="expr") return fn.expr;
  return "";
}
/* prix conseillé, appliqué, écart */
function conseil(dev, mod, it, ctx){
  if(!it.prix) return null;
  if(it.type==="prixlibre"||it.type==="nombre") return it.fn?evalFn(it.fn,ctx):null;
  const r=it.reponses.find(r=>r.id===dev.rep[it.id]);
  if(!r) return null;
  return r.mode==="fonction" ? evalFn(r.fn,ctx) : (+r.val||0);
}
/* Les honoraires récurrents sont présentés et saisis en montant annuel dans l'interface.
   Le moteur conserve sa base historique (mensuelle pour les lignes mensuelles) afin de
   préserver les calculs et les devis existants. */
function montantAnnuelUI(v, per){
  const n=+v||0;
  return per==="mensuelle" ? n*12 : n;
}
function montantInterneDepuisAnnuel(v, per){
  const n=+v||0;
  return per==="mensuelle" ? n/12 : n;
}

function ligne(dev, mod, it, ctx){
  const c=conseil(dev,mod,it,ctx);
  const ov=dev.prix[it.id];
  const force = ov && ov.val!=="" && ov.val!==undefined && ov.val!==null;
  const applique = force ? +ov.val : (Number.isFinite(c)?c:0);
  const rep = it.reponses.find(r=>r.id===dev.rep[it.id]);
  const repondu = it.type==="prixlibre"||it.type==="nombre" ? (dev.rep[it.id]!==undefined&&dev.rep[it.id]!=="") : !!rep;
  return { it, conseil:c, applique, force, motif:(ov&&ov.motif)||"",
    ecart: Number.isFinite(c)&&c ? (applique-c)/c*100 : null,
    repLabel: rep?rep.label:(it.type==="nombre"?nb(dev.rep[it.id]||0):""),
    repLabelClient: rep?responseClientLabel(rep):(it.type==="nombre"?nb(dev.rep[it.id]||0):""),
    repondu, retenue: repondu && (applique!==0||force),
    per:it.per, tva:it.tva??mod.tva,
    source: it.type==="prixlibre"||it.type==="nombre"
      ? (it.fn?libelleFn(it.fn,mod):"prix libre")
      : rep ? (rep.mode==="fonction"?libelleFn(rep.fn,mod):"montant du modèle") : "—" };
}
function conditionSource(dev,mod,cle){
  const it=mod?.sections?.flatMap(s=>s.items||[]).find(x=>(x.cle||slug(x.label))===cle);
  if(!it) return {found:false,answered:false,n:null,label:"",raw:null,item:null};
  const raw=dev?.rep?.[it.id];
  if(it.type==="liste"||it.type==="ouinon"){
    const i=(it.reponses||[]).findIndex(r=>r.id===raw);
    const r=i>=0?it.reponses[i]:null;
    return {found:true,answered:!!r,n:r?(r.n!==null&&r.n!==undefined&&r.n!==""?+r.n:i):null,label:r?.label||"",raw,item:it,index:i,response:r};
  }
  if(it.type==="nombre"||it.type==="prixlibre"){
    const answered=raw!==undefined&&raw!==null&&raw!=="";
    return {found:true,answered,n:answered?(+raw||0):null,label:answered?String(raw):"",raw,item:it,index:-1};
  }
  const answered=raw!==undefined&&raw!==null&&String(raw)!=="";
  return {found:true,answered,n:null,label:answered?String(raw):"",raw,item:it,index:-1};
}
function conditionApplies(dev,mod,rule){
  if(!rule) return true;
  const rules=Array.isArray(rule)?rule:[rule];
  return rules.every(r=>{
    if(!r||!r.cle) return true;
    const v=conditionSource(dev,mod,r.cle);
    if(r.allowEmpty && !v.answered) return true;
    if(!v.found || !v.answered) return false;
    if(Array.isArray(r.n) && !r.n.map(Number).includes(Number(v.n))) return false;
    if(r.n!==undefined && !Array.isArray(r.n) && Number(v.n)!==Number(r.n)) return false;
    if(Array.isArray(r.values)){
      const x=normLabel(v.label||v.raw||"");
      if(!r.values.map(normLabel).includes(x)) return false;
    }
    if(Array.isArray(r.notValues)){
      const x=normLabel(v.label||v.raw||"");
      if(r.notValues.map(normLabel).includes(x)) return false;
    }
    if(r.min!==undefined && !(Number(v.n)>=Number(r.min))) return false;
    if(r.max!==undefined && !(Number(v.n)<=Number(r.max))) return false;
    return true;
  });
}
function modelNodeApplicable(dev,mod,node){ return conditionApplies(dev,mod,node?.showIf); }
function exceptionalApplicable(dev,mod,e){ return modelNodeApplicable(dev,mod,e); }
const masque = (dev, s, it) => !!(
  dev.offSec[s.id] || dev.off[it.id] ||
  !itemApplicableForClient(dev,s,it) ||
  !modelNodeApplicable(dev,modOf(dev),s) ||
  !modelNodeApplicable(dev,modOf(dev),it)
);

/* v41 : une prestation ou un exceptionnel peut être marqué « débours »
   (`debours:true`). Ces lignes conservent leur saisie au questionnaire mais
   sortent des honoraires : elles ne sont ni dans `lignes`, ni dans `exc`, ni
   dans aucun total d'honoraires. Elles sont regroupées dans `debLignes` et
   totalisées dans `deb`, facturées en sus. */
const estDebours = x => !!(x && x.debours);
function totauxBase(dev, mod){
  const ctx=ctxDe(dev,mod);
  const lignes=[], debLignes=[], err=[];
  mod.sections.forEach(s=>s.items.forEach(it=>{
    if(!it.prix || masque(dev,s,it)) return;
    const l=ligne(dev,mod,it,ctx);
    if(l.conseil!==null && !Number.isFinite(l.conseil)) err.push(l);
    if(!l.retenue) return;
    const enrichie={...l, section:s.titre, sectionTag:s.tag||"", secId:s.id};
    if(estDebours(it)) debLignes.push({label:it.label,montant:+l.applique||0,tva:+l.tva||0,com:String(it.clientText||"").trim(),source:"prestation"});
    else lignes.push(enrichie);
  }));
  const excRetenus=(mod.exc||[]).filter(e=>exceptionalApplicable(dev,mod,e)&&dev.exc[e.id]).map(e=>({ ...e, prix:(dev.excPrix&&dev.excPrix[e.id]!==undefined&&dev.excPrix[e.id]!=="" ? +dev.excPrix[e.id] : (+e.prix||0)) }));
  const exc=excRetenus.filter(e=>!estDebours(e));
  for(const e of excRetenus.filter(estDebours)) debLignes.push({label:e.label,montant:+e.prix||0,tva:+(e.tva??mod.tva)||0,com:String(e.com||"").trim(),source:"exceptionnelle"});
  /* Débours saisis à la main sur le dossier. */
  for(const x of (dev.deb||[])) debLignes.push({label:x.label,montant:+x.prix||0,tva:+mod.tva||0,com:"",source:"saisie"});

  let recMens=0, recAn=0, pon=0, tva=0;
  lignes.forEach(l=>{
    if(l.per==="ponctuelle"){ pon+=l.applique; tva+=l.applique*l.tva/100; return; }
    const an = l.per==="mensuelle" ? l.applique*12 : l.applique;
    recAn+=an; recMens += l.per==="mensuelle" ? l.applique : l.applique/12;
    tva+=an*l.tva/100;
  });
  exc.forEach(e=>{ pon+=+e.prix||0; tva+=(+e.prix||0)*(e.tva??mod.tva)/100; });

  /* Les débours sont facturés en sus : ils n'entrent pas dans le total HT
     de la proposition, qui ne porte que les honoraires. */
  const debT=debLignes.reduce((s,x)=>s+(+x.montant||0),0);
  const debTva=debLignes.reduce((s,x)=>s+(+x.montant||0)*(+x.tva||0)/100,0);
  const ht=recAn+pon;
  return { ctx, lignes, debLignes, err, exc, recMens, recAn, pon,
    deb:debT, debTva, debTtc:debT+debTva, ht, tva, ttc:ht+tva };
}

const HONOR_CATS=["Comptabilité","Social","Juridique","Gestion"];
function inferHonorCategory(label){
  const x=String(label||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  if(/social|paie|salar|dsn|bulletin/.test(x)) return "Social";
  if(/jurid|sasu|eurl|sarl|\bsa\b|conjoint|statut/.test(x)) return "Juridique";
  if(/gestion|budget|banque|situation|tableau de bord|administrat|pilotage|reporting/.test(x)) return "Gestion";
  return "Comptabilité";
}
function honorCategory(tag,label){
  if(tag==="Fiscalité") return "Comptabilité";
  if(HONOR_CATS.includes(tag)) return tag;
  return inferHonorCategory(label);
}
function exceptionalCategory(e){ return honorCategory(e?.cat||"",e?.label||""); }
function honorairesParCategorieBase(dev,mod,t=totauxBase(dev,mod)){
  const cats=Object.fromEntries(HONOR_CATS.map(c=>[c,{recAn:0,pon:0,tvaRec:0,tvaPon:0,lignes:[]}]))
  t.lignes.forEach(l=>{
    const cat=honorCategory(l.sectionTag,l.section||l.it?.label);
    const v=l.per==="ponctuelle"?l.applique:(l.per==="mensuelle"?l.applique*12:l.applique);
    if(l.per==="ponctuelle"){ cats[cat].pon+=v; cats[cat].tvaPon+=v*(+l.tva||0)/100; }
    else { cats[cat].recAn+=v; cats[cat].tvaRec+=v*(+l.tva||0)/100; }
    cats[cat].lignes.push({label:l.it.label,per:l.per,montant:v,tva:l.tva});
  });
  t.exc.forEach(e=>{ const cat=exceptionalCategory(e),v=+e.prix||0; cats[cat].pon+=v; cats[cat].tvaPon+=v*(e.tva??mod.tva)/100; cats[cat].lignes.push({label:e.label,per:"ponctuelle",montant:v,tva:e.tva??mod.tva,exceptionnelle:true}); });
  return {cats,t};
}
function categoryOverrideValue(dev,cat,kind,base){
  if(!(base>0)) return base;
  const v=dev.catPrix?.[cat]?.[kind];
  return v!==undefined&&v!==null&&v!=="" ? Math.max(0,+v||0) : base;
}
function totaux(dev,mod){
  const base=totauxBase(dev,mod), raw=honorairesParCategorieBase(dev,mod,base).cats;
  let recAn=0, pon=0, tvaHonoraires=0;
  for(const cat of HONOR_CATS){
    const c=raw[cat], r=categoryOverrideValue(dev,cat,"recAn",c.recAn), p=categoryOverrideValue(dev,cat,"pon",c.pon);
    recAn+=r; pon+=p;
    const tauxRec=c.recAn>0?c.tvaRec/c.recAn:(+mod.tva||0)/100;
    const tauxPon=c.pon>0?c.tvaPon/c.pon:(+mod.tva||0)/100;
    tvaHonoraires+=r*tauxRec+p*tauxPon;
  }
  /* Le total de la proposition ne porte que les honoraires ; les débours
     sont repris à part, en sus (voir totauxBase). */
  const ht=recAn+pon, tva=tvaHonoraires;
  return {...base,recAn,recMens:recAn/12,pon,ht,tva,ttc:ht+tva};
}
function honorairesParCategorie(dev,mod){
  const base=totauxBase(dev,mod), raw=honorairesParCategorieBase(dev,mod,base).cats, t=totaux(dev,mod);
  const cats={};
  for(const cat of HONOR_CATS){
    const c=raw[cat];
    cats[cat]={...c,baseRecAn:c.recAn,basePon:c.pon,
      recAn:categoryOverrideValue(dev,cat,"recAn",c.recAn),
      pon:categoryOverrideValue(dev,cat,"pon",c.pon),
      adjustedRec:!!(c.recAn>0&&dev.catPrix?.[cat]?.recAn!==undefined&&dev.catPrix?.[cat]?.recAn!==""),
      adjustedPon:!!(c.pon>0&&dev.catPrix?.[cat]?.pon!==undefined&&dev.catPrix?.[cat]?.pon!=="")};
  }
  return {cats,t,base};
}
function hasLegalExceptional(dev,mod){ return totaux(dev,mod).exc.some(e=>exceptionalCategory(e)==="Juridique"); }
function dashboardSectionType(dev,mod){ const t=totaux(dev,mod); return t.recAn>0||!t.pon?"traditional":"punctual"; }
function dashboardColorType(dev,mod){
  const section=dashboardSectionType(dev,mod);
  if(section==="traditional") return "traditional";
  if(dossierMarkers(dev,mod).includes("Juridique")) return "legal";
  return hasLegalExceptional(dev,mod)?"legal":"punctual";
}

