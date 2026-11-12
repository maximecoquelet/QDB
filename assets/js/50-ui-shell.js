/* ============================================================== rendu */
const PRIMARY_NAV=[["home","Accueil","home"],["devis","Portefeuille","portfolio"],["ca","Chiffre d'affaires","euro"],["juridique","Facturation juridique","balance"],["clients","Clients","clients"],["notifications","Notifications","bell"],["nouveau","Nouveau dossier","plus"]];
const ADMIN_NAV=[["modeles","Modèles de devis","models"],["lettres","Lettres de mission","doc"],["cabinet","Identité du cabinet","building"],["yousign","Signature Yousign","signature"],["outils","Outils internes","health"],["reglages","Réglages","settings"]];
const ADMIN_VIEWS=new Set(ADMIN_NAV.map(x=>x[0]));
const VIEWS = {};

function uiIcon(name){
  const p={balance:'<path d="M10 3v14"/><path d="M6 17h8"/><path d="M4 6h12"/><path d="M4 6 2 11a2.2 2.2 0 0 0 4 0L4 6"/><path d="M16 6l-2 5a2.2 2.2 0 0 0 4 0l-2-5"/>',home:'<path d="M3 10.5 10 4l7 6.5"/><path d="M5.5 9.5V18h9V9.5"/><path d="M8.5 18v-5h3v5"/>',portfolio:'<rect x="3" y="5" width="14" height="12" rx="2"/><path d="M7 5V3h6v2"/><path d="M3 10h14"/>',clients:'<circle cx="8" cy="7" r="3"/><path d="M2.5 17c.6-3 2.5-4.5 5.5-4.5S12.9 14 13.5 17"/><path d="M14 5.5a3 3 0 0 1 0 5.5"/><path d="M15 13c1.7.5 2.7 1.8 3 4"/>',plus:'<path d="M10 3v14M3 10h14"/>',models:'<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/>',doc:'<path d="M5 2.5h7l3 3V18H5z"/><path d="M12 2.5V6h3M7.5 10h5M7.5 13h5"/>',building:'<path d="M4 18V4l6-2v16M10 6h6v12M2 18h16"/><path d="M6.5 6h1M6.5 9h1M6.5 12h1M12.5 9h1M12.5 12h1"/>',signature:'<path d="M3 15c2-4 3-6 4-6 1.5 0-.2 5 1.5 5 1.2 0 2-3 3-3 1 0 .2 3 1.5 3 1 0 1.5-1 4-1"/><path d="M3 18h14"/>',settings:'<circle cx="10" cy="10" r="3"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4"/>',bell:'<path d="M5 8a5 5 0 0 1 10 0c0 5 2 5 2 7H3c0-2 2-2 2-7"/><path d="M8 17h4"/>',health:'<path d="M2.5 10h3l1.5-4 3 8 2-5 1.5 1H18"/>',euro:'<path d="M14.5 5.5a5.5 5.5 0 1 0 0 9"/><path d="M3.5 8.5h7M3.5 11.5h7"/>',search:'<circle cx="8.5" cy="8.5" r="5"/><path d="m12.3 12.3 4 4"/>'}[name]||'<circle cx="10" cy="10" r="5"/>';
  return `<span class="nav-ico"><svg viewBox="0 0 20 20" aria-hidden="true">${p}</svg></span>`;
}
function userDisplayName(){const email=String(SB_USER?.email||"").split("@")[0].replace(/[._-]+/g," ").trim();return email?email.replace(/\b\w/g,c=>c.toUpperCase()):"";}
function daysSince(v){const t=new Date(v||"").getTime();return Number.isFinite(t)?Math.floor((Date.now()-t)/86400000):0;}
function appNotifications(){
  const a=[];
  for(const d0 of st.devis.filter(x=>!isArchivedDevis(x))){
    const d=ensureInternalState(d0),ws=workflowStatut(d),name=d.client?.raison||"Dossier sans nom";
    if(ws==="envoye"){
      const sent=d.sign?.envoye||d.manualSign?.sentDate||"";
      const age=sent?daysSince(sent):0;
      a.push({level:age>=7?"red":"blue",title:`Signature en attente — ${name}`,help:`Envoyé ${sent?dateFR(sent):"au client"}${age>=7?` · relance conseillée (${age} j)`:""}`,id:d.id,tab:"sign",kind:"signature"});
    }else if(ws==="genere") a.push({level:"green",title:`Prêt à envoyer — ${name}`,help:d.ref||"Devis généré",id:d.id,tab:"sign",kind:"ready"});
    else if(ws==="brouillon"&&daysSince(d.majAt||d.cree)>=7) a.push({level:"",title:`Brouillon à reprendre — ${name}`,help:`Sans modification depuis ${daysSince(d.majAt||d.cree)} jours`,id:d.id,tab:"client",kind:"draft"});
    /* Dossier d'acceptation incomplet : le devis ne pourra pas être signé. */
    if(["genere","envoye"].includes(ws)){
      const blocages=controleConformite(d);
      if(blocages.length) a.push({level:"red",title:`Acceptation à finaliser — ${name}`,help:blocages.map(confCap).join(" · "),id:d.id,tab:"sign",kind:"acceptation"});
    }
  }
  return a.sort((x,y)=>(x.level==="red"?0:x.level==="blue"?1:2)-(y.level==="red"?0:y.level==="blue"?1:2)).slice(0,80);
}
function recentDevis(limit=6){return [...st.devis].sort((a,b)=>String(b.majAt||b.maj||b.cree||"").localeCompare(String(a.majAt||a.maj||a.cree||""))).slice(0,limit);}
function categoryBadge(cat){const x=normLabel(cat||""),c=x.includes("compt")?"cat-compta":x.includes("fiscal")?"cat-fiscal":x.includes("social")?"cat-social":x.includes("jurid")?"cat-juridique":x.includes("gestion")?"cat-gestion":"";return `<span class="category-chip ${c}">${esc(cat||"Général")}</span>`;}

function markerCssClass(marker){const x=normLabel(marker||"");return x.includes("compt")?"cat-compta":x.includes("fiscal")?"cat-fiscal":x.includes("social")?"cat-social":x.includes("jurid")?"cat-juridique":x.includes("gestion")?"cat-gestion":"";}
function markerBadge(marker){return `<span class="marker-badge ${markerCssClass(marker)}">${esc(marker)}</span>`;}
function markerPickerHTML(selected,action){const on=normalizeDevisMarkers(selected||[]);return `<div class="marker-picker">${DEVIS_MARKERS.map(m=>`<button type="button" class="marker-toggle ${markerCssClass(m)} ${on.includes(m)?"on":""}" data-act="${action}" data-marker="${esc(m)}" aria-pressed="${on.includes(m)?"true":"false"}">${esc(m)}</button>`).join("")}</div>`;}

/* v52 : colonnes, densité et repli des blocs relevaient de trois boutons
   distincts dans l'en-tête. Ce sont trois réglages d'affichage : un seul
   menu les rassemble et rend l'en-tête lisible. */
function menuAffichageHTML(){
  const c=uiColumns(), rows=[["model","Colonne Modèle"],["amount","Colonnes Montants"],["status","Colonne Statut"]];
  return `<details class="column-menu"><summary class="btn sm">Affichage</summary><div class="column-pop">
    <div class="pop-titre">Colonnes</div>
    ${rows.map(([k,l])=>`<label><input type="checkbox" data-ui-col="${k}" ${c[k]?"checked":""}> ${l}</label>`).join("")}
    <div class="pop-titre">Densité</div>
    <label><input type="radio" name="densite" data-ui-densite="comfortable" ${uiDensity()!=="compact"?"checked":""}> Confortable</label>
    <label><input type="radio" name="densite" data-ui-densite="compact" ${uiDensity()==="compact"?"checked":""}> Compacte</label>
    <div class="pop-titre">Blocs de mission</div>
    <button class="btn sm" data-act="portPanels" data-to="${portPanelsAnyOpen()?"fold":"unfold"}" style="width:100%;justify-content:center">${portPanelsAnyOpen()?"Replier les blocs":"Déployer les blocs"}</button>
  </div></details>`;
}
function portfolioColumnsMenu(){const c=uiColumns(),rows=[["model","Modèle"],["amount","Montants"],["status","Statut"]];return `<details class="column-menu"><summary class="btn sm">Colonnes</summary><div class="column-pop">${rows.map(([k,l])=>`<label><input type="checkbox" data-ui-col="${k}" ${c[k]?"checked":""}> ${l}</label>`).join("")}</div></details>`;}
function sortButton(key,label,current=st.portSort){const on=current?.key===key,arrow=on?(current.dir==="asc"?" ↑":" ↓"):"";return `<button class="sort-btn" data-sort="${key}">${label}${arrow}</button>`;}


/* ==============================================================
   Ergonomie v24 : état purement local d'interface.
   Rien ici ne modifie les données métier ou les droits Supabase.
================================================================ */
let LAST_RENDER_VIEW="";
let LAST_RENDER_TAB="";
const UI_BUSY=new Map();
const UI_TAB_STORAGE="serre.ui.last-tabs.v1";
const UI_DENSITY_STORAGE="serre.ui.density.v1";
const UI_THEME_STORAGE="serre.ui.theme.v1";
const UI_COLUMNS_STORAGE="serre.ui.port-columns.v1";
function uiDensity(){try{return localStorage.getItem(UI_DENSITY_STORAGE)==="compact"?"compact":"comfortable";}catch(_){return "comfortable";}}
function uiTheme(){try{return localStorage.getItem(UI_THEME_STORAGE)==="dark"?"dark":"light";}catch(_){return "light";}}
function uiColumns(){try{return {ref:true,cree:true,model:true,amount:true,status:true,...JSON.parse(localStorage.getItem(UI_COLUMNS_STORAGE)||"{}")};}catch(_){return {ref:true,cree:true,model:true,amount:true,status:true};}}
function applyUiDensity(){document.body.classList.toggle("density-compact",uiDensity()==="compact");document.body.classList.toggle("theme-dark",uiTheme()==="dark");}

function loadUiTabs(){
  try{ return JSON.parse(localStorage.getItem(UI_TAB_STORAGE)||"{}")||{}; }catch(_){ return {}; }
}
function rememberedTab(id){
  const x=loadUiTabs()[id];
  return TABS?.some?.(t=>t[0]===x)?x:"client";
}
function rememberTab(id,tab){
  if(!id||!tab) return;
  try{
    const x=loadUiTabs(); x[id]=tab;
    const ids=new Set(st.devis.map(d=>d.id));
    for(const k of Object.keys(x)) if(!ids.has(k)) delete x[k];
    localStorage.setItem(UI_TAB_STORAGE,JSON.stringify(x));
  }catch(_){}
}
/* =====================================================================
   v50 — RELECTURE DES DONNÉES PARTAGÉES
   ---------------------------------------------------------------------
   Rien n'était jamais relu après le démarrage. Un onglet ouvert le matin
   affichait un portefeuille faux toute la journée, et servait de source
   aux enregistrements — d'où les écrasements. On relit désormais les
   dossiers et les fiches clients quand l'onglet reprend la main, et à
   intervalle régulier tant qu'il reste visible.

   Deux règles de prudence : on ne relit jamais pendant une saisie (champ
   actif, boîte de dialogue ouverte, enregistrement en cours), et une
   lecture en échec ne remplace rien — on garde ce qu'on a.
   ===================================================================== */
const RELECTURE_INTERVALLE_MS = 5*60*1000;
const RELECTURE_MIN_MS = 45*1000;
let DERNIERE_RELECTURE = Date.now();
let RELECTURE_EN_COURS = false;

function saisieEnCours(){
  const a=document.activeElement;
  if(a && a.matches && a.matches("input,textarea,select,[contenteditable=true]")) return true;
  if(document.querySelector(".modal")) return true;
  if(SAVE_UI.state==="saving"||SAVE_UI.state==="error") return true;
  return false;
}

async function relireDonneesPartagees({force=false}={}){
  if(!(SB && SB_USER) || MODE_LECTURE_SEULE || RELECTURE_EN_COURS) return false;
  if(!force && saisieEnCours()) return false;
  if(!force && Date.now()-DERNIERE_RELECTURE < RELECTURE_MIN_MS) return false;
  RELECTURE_EN_COURS=true;
  try{
    /* Seuls les dossiers et les fiches clients sont relus : ce sont eux qui
       bougent d'un poste à l'autre. Modèles, lettres et identité du cabinet
       passent par des migrations au démarrage — les rafraîchir à chaud
       demanderait de rejouer ces migrations, ce qui ne se fait pas en
       arrière-plan. Un rechargement de page reste la voie pour ceux-là. */
    const [dev,cli]=await Promise.all([S.get(K.dev,true),S.get(K.cli,true)]);
    if(dev===undefined||cli===undefined) return false;   /* lecture en échec */
    DERNIERE_RELECTURE=Date.now();
    let changement=false;
    if(dev!=null){
      const frais=JSON.parse(dev)||[];
      if(JSON.stringify(frais.map(x=>[x.id,x.rev??null]))!==JSON.stringify(st.devis.map(x=>[x.id,x.rev??null]))) changement=true;
      st.devis=frais; st.devis.forEach(ensureInternalState);
    }
    if(cli!=null){
      const frais=JSON.parse(cli)||[];
      if(frais.length!==st.clients.length) changement=true;
      st.clients=frais; st.clients.forEach(ensureClientInternals);
    }
    /* Le dossier ou la fiche ouverte a pu être supprimée ailleurs. */
    if(st.view==="devis1" && st.id && !st.devis.some(d=>d.id===st.id)){
      st.view="devis"; st.id=null;
      toast("Le dossier que vous consultiez a été supprimé par un autre poste.",true);
    }
    if(st.view==="client1" && st.clientViewId && !st.clients.some(c=>c.id===st.clientViewId)){
      st.view="clients"; st.clientViewId=null;
      toast("La fiche client que vous consultiez a été supprimée par un autre poste.",true);
    }
    if(changement){ render(); return true; }
    return false;
  }catch(e){ console.warn("Relecture impossible",e); return false; }
  finally{ RELECTURE_EN_COURS=false; }
}

/* =====================================================================
   v49 — HISTORIQUE DU NAVIGATEUR
   ---------------------------------------------------------------------
   L'application est une page unique : le bouton « Précédent », Alt+←, le
   bouton latéral de la souris et le geste de retour du pavé tactile en
   sortaient purement et simplement. Chaque changement d'écran empile
   désormais une entrée d'historique. L'adresse n'est pas modifiée — rien
   à reconfigurer côté hébergement — seul l'état de navigation voyage.
   ===================================================================== */
let NAV_RESTAURATION=false, NAV_SIGNATURE="";
const etatNavigation = () => ({view:st.view,id:st.id,tab:st.tab,clientViewId:st.clientViewId,clientTab:st.clientTab});
const signatureNavigation = (e=etatNavigation()) => [e.view,e.id||"",e.tab||"",e.clientViewId||"",e.clientTab||""].join("|");
function majHistorique(){
  const sig=signatureNavigation();
  if(NAV_RESTAURATION||sig===NAV_SIGNATURE){ NAV_SIGNATURE=sig; return; }
  const premier=!NAV_SIGNATURE;
  NAV_SIGNATURE=sig;
  try{ premier?history.replaceState(etatNavigation(),""):history.pushState(etatNavigation(),""); }catch(_){}
}
function restaurerNavigation(e){
  if(!e||typeof e!=="object") return;
  NAV_RESTAURATION=true;
  try{
    if(e.view&&canView(e.view)) st.view=e.view;
    if(e.id&&st.devis.some(d=>d.id===e.id)) st.id=e.id;
    if(e.tab) st.tab=e.tab;
    if(e.clientViewId) st.clientViewId=e.clientViewId;
    if(e.clientTab) st.clientTab=e.clientTab;
    if(st.view==="devis1"&&!curDev()) st.view="devis";
    if(st.view==="client1"&&!st.clients.some(c=>c.id===st.clientViewId)) st.view="clients";
    render();
  } finally { NAV_RESTAURATION=false; }
}

/* Défilement des listes : revenir au portefeuille doit rendre la page
   telle qu'on l'avait quittée, pas son sommet. */
const VUES_LISTES=new Set(["devis","clients","home","notifications"]);
const SCROLL_LISTES={};

/* Passer d'un dossier au suivant sans repasser par la liste : on revoit
   dix devis d'affilée bien plus souvent qu'un seul. */
function ouvrirDossierVoisin(id){
  if(!id||!st.devis.some(d=>d.id===id)) return;
  st.id=id; st.view="devis1"; st.tab=rememberedTab(id); render();
}
function deplacerVersVoisin(sens){
  const d=curDev(); if(!d||st.view!=="devis1") return false;
  const v=dossiersVoisins(d), cible=sens<0?v.prev:v.next;
  if(!cible){ toast(sens<0?"Premier dossier de la liste.":"Dernier dossier de la liste."); return true; }
  ouvrirDossierVoisin(cible); return true;
}

function syncStickyOffsets(){
  const top=document.querySelector(".top");
  if(top) document.documentElement.style.setProperty("--serre-top-h",`${Math.ceil(top.getBoundingClientRect().height)}px`);
}
function busyLabel(act){
  return ({
    rneSearch:"Recherche…",rneUse:"Import…",pdfDevis:"PDF…",pdfLm:"PDF…",qPdf:"PDF…",
    ysTest:"Test…",send:"Envoi…",statut:"Actualisation…",downloadSigned:"Téléchargement…",
    valide:"Validation…"
  })[act]||"En cours…";
}
const LONG_ACTS=new Set(["clientDeletePermanent","rneSearch","rneUse","createRneSearch","createStart","pdfDevis","pdfLm","qPdf","comparePdf","ysTest","send","statut","downloadSigned","valide","healthCheck","backupSelfTest","modelExcelImport"]);
function applyBusyState(){
  for(const [act,label] of UI_BUSY.entries()){
    document.querySelectorAll(`[data-act="${act}"]`).forEach(el=>{
      if(!el.dataset.busyOriginal) el.dataset.busyOriginal=el.textContent;
      el.disabled=true; el.classList.add("busy"); el.textContent=label;
    });
  }
}
async function runBusyAction(act,work){
  if(UI_BUSY.has(act)) return;
  const label=busyLabel(act); UI_BUSY.set(act,label); applyBusyState();
  try{ return await work(); }
  finally{
    UI_BUSY.delete(act);
    document.querySelectorAll(`[data-act="${act}"]`).forEach(el=>{
      el.disabled=false; el.classList.remove("busy");
      if(el.dataset.busyOriginal){ el.textContent=el.dataset.busyOriginal; delete el.dataset.busyOriginal; }
    });
  }
}
async function copyTextValue(value){
  const v=String(value||"").trim(); if(!v){toast("Aucune valeur à copier.",true);return;}
  try{
    if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(v);
    else{
      const ta=document.createElement("textarea"); ta.value=v; ta.style.position="fixed"; ta.style.opacity="0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    toast("Copié dans le presse-papiers.");
  }catch(_){ toast("Copie impossible dans ce navigateur.",true); }
}
/* =====================================================================
   v52 — Barre du bas : dire ce qu'on va faire, pas où l'on va
   ---------------------------------------------------------------------
   Elle affichait « Bilan des honoraires → », c'est-à-dire la destination.
   Elle annonce désormais l'action — « Vérifier les honoraires »,
   « Préparer les documents » — et n'expose que les commandes utiles à
   l'étape en cours.
   ===================================================================== */
function contextBarHTML(d){
  if(!d) return "";
  const idx=Math.max(0,TABS.findIndex(x=>x[0]===st.tab));
  const prev=TABS[idx-1], next=TABS[idx+1], actionSuivante=TABS[idx]?.[3]||"";
  let actions=`${prev?`<button class="btn sm" data-tab="${prev[0]}">← ${esc(prev[1])}</button>`:""}
    ${next?`<button class="btn sm p" data-tab="${next[0]}">${esc(actionSuivante||next[1])} →</button>`:""}`;
  if(st.tab==="doc"){
    actions+=`<span class="spacer"></span><button class="btn sm" data-act="pdfDevis">PDF du devis</button>${hasLettreMission(d)?`<button class="btn sm" data-act="pdfLm">PDF de la lettre</button>`:""}`;
  }else if(st.tab==="sign"){
    actions+=`<span class="spacer"></span>${d.sign?.id?`<button class="btn sm" data-act="statut">Actualiser le suivi</button>`:""}`;
  }else if(st.tab==="honoraires"){
    actions+=`<span class="spacer"></span><button class="btn sm" data-act="previewQuote">Aperçu du devis</button>`;
  }else{
    actions+=`<span class="spacer"></span><button class="btn sm" data-act="previewQuote">Aperçu</button>`;
  }
  return `<div class="context-bar"><span class="context-label">${esc(d.client?.raison||"Dossier")} · ${esc(TABS[idx]?.[1]||"")}</span>${actions}</div>`;
}

function render(){
  const oldY=window.scrollY||document.documentElement.scrollTop||0;
  if(!canView(st.view)) st.view="devis";
  const d=curDev();
  const changedView=!!LAST_RENDER_VIEW && LAST_RENDER_VIEW!==st.view;
  const changedTab=st.view==="devis1" && !!LAST_RENDER_TAB && LAST_RENDER_TAB!==st.tab;
  const resetScroll=changedView||changedTab;
  const app=$("#app");
  applyBranding();
  setMissionCssPalette(app,"trad",safeColor(st.settings.missionTraditional,SETTINGS_DEFAULT.missionTraditional));
  setMissionCssPalette(app,"ponc",safeColor(st.settings.missionPunctual,SETTINGS_DEFAULT.missionPunctual));
  setMissionCssPalette(app,"legal",safeColor(st.settings.missionLegal,SETTINGS_DEFAULT.missionLegal));
  app.innerHTML = `
  <aside class="rail">
    <div class="brand"><div class="brandmark">${brandMarkHTML()}</div><span class="brand-caption">${esc(brandData().subtitle)} · ${esc(st.cab.nom||"Cabinet")}</span></div>
    <div class="rail-quick"><button data-global-search>${uiIcon("search")}<span class="nav-label">Recherche globale</span><span class="rail-shortcut">Ctrl K</span></button></div>
    <nav class="nav">
      ${PRIMARY_NAV.filter(([v])=>v!=="juridique"||(typeof FJ!=="undefined"&&FJ.acces)).map(([v,l,ico])=>`<button data-nav="${v}" class="${st.view===v?"on":""}">${uiIcon(ico)}<span class="nav-label">${l}</span>${(()=>{const n=v==="home"?dossiersARelancer().length:v==="notifications"?notificationsParDossier().length:0;return n?`<span class="nav-badge">${Math.min(99,n)}</span>`:"";})()}</button>`).join("")}
      ${(()=>{
        /* v49 : le rail n'épinglait qu'un dossier. On travaille rarement
           sur un seul : les quatre derniers ouverts restent à portée. */
        const recents=recentDevis(4);
        if(d&&!recents.some(x=>x.id===d.id)) recents.unshift(d);
        const liste=recents.slice(0,4);
        return liste.length?`<div class="sep"></div>${liste.map(x=>`<button data-open-rail="${x.id}" class="${st.view==="devis1"&&st.id===x.id?"on":""}" title="${esc(x.client?.raison||"Dossier")}${intitulePersonnalise(x)?` — ${esc(intituleDevis(x))}`:""}">${uiIcon("doc")}<span class="nav-label">${esc(intitulePersonnalise(x)?intituleDevis(x):(x.client?.raison||"Dossier sans nom"))}</span></button>`).join("")}`:"";
      })()}
      <details class="nav-admin" ${ADMIN_VIEWS.has(st.view)?"open":""}><summary>Administration</summary><div class="admin-links">
        ${ADMIN_NAV.filter(([v])=>canView(v)).map(([v,l,ico])=>`<button data-nav="${v}" class="${st.view===v?"on":""}">${uiIcon(ico)}<span class="nav-label">${l}</span></button>`).join("")}
      </div></details>
    </nav>
    <div class="rail-foot">${S.mode==="supabase"?`Données partagées · ${esc(SB_USER?.email||"")}`:S.mode==="local"?"Données conservées dans ce navigateur.":"Session temporaire : exportez une sauvegarde."}<span class="role-badge">${esc(ROLE_LABEL[currentRole()]||currentRole())}</span><div class="rail-foot-actions"><button data-act="uiTheme">${uiTheme()==="dark"?"Mode clair":"Mode sombre"}</button>${S.mode==="supabase"?`<button class="logout" data-logout>Déconnexion</button>`:""}</div></div>
  </aside>
  <div class="rail-voile" data-menu-fermer></div>
  <button class="menu-mobile" data-menu-mobile aria-label="Ouvrir le menu" title="Menu">☰</button>
  <main class="main">${(()=>{const m=canRole("admin")?socleIncomplet():[];return m.length?`<div class="socle-banner"><b>Base de données à mettre à jour</b> — ${esc(m.join(" et "))} : le script <span class="mono">v50-clients-et-revisions.sql</span> n'a pas encore été exécuté dans Supabase. L'application fonctionne, mais deux collaborateurs qui travaillent en même temps peuvent encore s'écraser.</div>`:"";})()}${MODE_LECTURE_SEULE?`<div class="readonly-banner"><b>Session en lecture seule</b> — le chargement des données partagées a échoué (${esc(MOTIF_LECTURE_SEULE)}). Rien n'est enregistré tant que la page n'a pas été rechargée sur une connexion saine.<button class="btn sm" data-reload>Recharger</button></div>`:""}${VIEWS[st.view]?VIEWS[st.view]():""}</main>`;
  bind();
  if(VUES_LISTES.has(LAST_RENDER_VIEW)) SCROLL_LISTES[LAST_RENDER_VIEW]=oldY;
  LAST_RENDER_VIEW=st.view; LAST_RENDER_TAB=st.tab;
  majHistorique();
  /* Retour sur une liste : on retrouve sa position ; changement d'onglet
     dans un dossier : on repart du haut. */
  const cible=resetScroll?(VUES_LISTES.has(st.view)?(SCROLL_LISTES[st.view]||0):0):oldY;
  requestAnimationFrame(()=>{
    syncStickyOffsets(); applyBusyState(); applyUiDensity();
    window.scrollTo({left:0,top:cible,behavior:"auto"});
    signalerLigneRevenue();
  });
}
/* Souligner brièvement la ligne du dossier que l'on vient de quitter :
   sans ce repère, on cherche des yeux où l'on en était. */
function signalerLigneRevenue(){
  const id=st.flashDevisId; if(!id) return;
  st.flashDevisId=null;
  const row=document.querySelector(`[data-row-open="${CSS.escape(id)}"]`);
  if(!row) return;
  row.classList.add("row-flash");
  const r=row.getBoundingClientRect();
  if(r.top<80||r.bottom>window.innerHeight-40) row.scrollIntoView({block:"center",behavior:"auto"});
  setTimeout(()=>row.classList.remove("row-flash"),1700);
}
function bind(){
  const lo=document.querySelector("[data-logout]"); if(lo) lo.onclick=logoutSupabase;
  const rl=document.querySelector("[data-reload]"); if(rl) rl.onclick=()=>location.reload();
  /* v52 — tiroir de navigation sur petit écran. */
  const mm=document.querySelector("[data-menu-mobile]");
  if(mm) mm.onclick=()=>{ document.body.classList.toggle("menu-ouvert"); mm.setAttribute("aria-expanded",document.body.classList.contains("menu-ouvert")?"true":"false"); };
  const voile=document.querySelector("[data-menu-fermer]");
  if(voile) voile.onclick=()=>document.body.classList.remove("menu-ouvert");
  document.querySelectorAll(".rail [data-nav],.rail [data-open-rail],.rail [data-global-search]").forEach(b=>{
    const avant=b.onclick;
    b.onclick=e=>{ document.body.classList.remove("menu-ouvert"); if(avant) return avant.call(b,e); };
  });
  document.querySelectorAll("[data-refresh]").forEach(b=>b.onclick=async()=>{
    b.disabled=true; const t=b.textContent; b.textContent="Actualisation…";
    const change=await relireDonneesPartagees({force:true});
    if(!change){ b.disabled=false; b.textContent=t; toast("Portefeuille déjà à jour."); }
  });
  document.querySelectorAll("[data-global-search]").forEach(b=>b.onclick=()=>openGlobalSearch());
  document.querySelectorAll("[data-nav]").forEach(b=>b.onclick=()=>{ const v=b.dataset.nav;
    /* v55.6 : la facturation juridique s'ouvre toujours sur les dossiers en cours. */
    if(v==="juridique"&&typeof FJ!=="undefined"){ FJ.onglet="encours"; FJ.filtreEtape=""; }
    if(v==="nouveau"){ nouveauDevis(); return; } if(!canView(v)){toast("Accès réservé selon votre rôle.",true);return;}
    /* Quitter un dossier pour la liste : on repère la ligne au retour. */
    if(v==="devis"&&st.view==="devis1"&&st.id) st.flashDevisId=st.id;
    st.view=v; render(); });
  document.querySelectorAll("[data-open-rail]").forEach(b=>b.onclick=()=>{ st.id=b.dataset.openRail; st.view="devis1"; st.tab=rememberedTab(st.id); render(); });
  document.querySelectorAll("[data-sibling]").forEach(b=>b.onclick=()=>ouvrirDossierVoisin(b.dataset.sibling));
  document.querySelectorAll("[data-vue]").forEach(b=>b.onclick=()=>{
    const v=VUES_PORTEFEUILLE.find(x=>x.cle===b.dataset.vue); if(!v) return;
    st.portFilters=v.filtres(); enregistrerFiltresPortefeuille(); render();
  });
  document.querySelectorAll("[data-ui-densite]").forEach(b=>b.onchange=()=>{
    try{ localStorage.setItem(UI_DENSITY_STORAGE,b.dataset.uiDensite==="compact"?"compact":"comfortable"); }catch(_){}
    applyUiDensity();
  });
  document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{ st.tab=b.dataset.tab; const d=curDev(); if(d) rememberTab(d.id,st.tab); render(); });
  document.querySelectorAll("[data-open]").forEach(b=>b.onclick=e=>{ e?.stopPropagation?.(); st.id=b.dataset.open; st.view="devis1"; st.tab=rememberedTab(st.id); render(); });
  document.querySelectorAll("[data-client-open]").forEach(b=>b.onclick=e=>{ e?.stopPropagation?.(); st.clientViewId=b.dataset.clientOpen; st.view="client1"; st.clientTab=b.dataset.clientOpenTab||"identite"; render(); });
  document.querySelectorAll("[data-row-open]").forEach(row=>{ row.tabIndex=0; const open=e=>{
    if(e.type==="keydown"&&!["Enter"," "].includes(e.key)) return;
    if(e.target.closest("button,a,input,select,textarea,summary,details,[data-act],[data-client-open]")) return;
    if(e.type==="keydown") e.preventDefault();
    st.id=row.dataset.rowOpen; st.view="devis1"; st.tab=rememberedTab(st.id); render();
  }; row.onclick=open; row.onkeydown=open; });
  document.querySelectorAll("[data-client-row]").forEach(row=>{ row.tabIndex=0; const open=e=>{
    if(e.type==="keydown"&&!["Enter"," "].includes(e.key)) return;
    if(e.target.closest("button,a,input,select,textarea,summary,details,[data-act],[data-client-open]")) return;
    if(e.type==="keydown") e.preventDefault();
    st.clientViewId=row.dataset.clientRow; st.view="client1"; render();
  }; row.onclick=open; row.onkeydown=open; });
  document.querySelectorAll("[data-home-open]").forEach(el=>{el.onclick=e=>{e.stopPropagation();st.id=el.dataset.homeOpen;st.view="devis1";st.tab=el.dataset.homeTab||rememberedTab(st.id);render();};});
  document.querySelectorAll("[data-history-open]").forEach(row=>{ row.tabIndex=0; const open=e=>{
    if(e.type==="keydown"&&!["Enter"," "].includes(e.key)) return;
    if(e.target.closest("button,a,input,select,textarea,[data-act]")) return;
    if(e.type==="keydown") e.preventDefault();
    st.id=row.dataset.historyOpen; st.view="devis1"; st.tab=rememberedTab(st.id); render();
  }; row.onclick=open; row.onkeydown=open; });
  document.querySelectorAll("[data-copy]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); copyTextValue(b.dataset.copy); });
  document.querySelectorAll(".row-menu").forEach(menu=>{
    menu.addEventListener("toggle",()=>{
      if(!menu.open){ menu.classList.remove("drop-up"); return; }
      document.querySelectorAll(".row-menu[open]").forEach(other=>{ if(other!==menu) other.open=false; });
      requestAnimationFrame(()=>{
        const pop=menu.querySelector(".menu-pop"); if(!pop) return;
        menu.classList.remove("drop-up");
        const r=pop.getBoundingClientRect(), mr=menu.getBoundingClientRect();
        if(r.bottom>window.innerHeight-10 && mr.top>r.height+12) menu.classList.add("drop-up");
      });
    });
  });
  /* Gestion globale ajoutée une seule fois malgré les nombreux render(). */
  if(!window.__SERRE_ERGO_GLOBAL){
    window.__SERRE_ERGO_GLOBAL=true;
    document.addEventListener("click",e=>{
      if(!e.target.closest(".row-menu")) document.querySelectorAll(".row-menu[open]").forEach(menu=>{ menu.open=false; });
    });
    window.addEventListener("popstate",ev=>{ if(ev.state) restaurerNavigation(ev.state); });
    /* v50 : l'onglet reprend la main — on se resynchronise avant que
       l'utilisateur ne travaille sur un portefeuille périmé. */
    document.addEventListener("visibilitychange",()=>{ if(!document.hidden) relireDonneesPartagees(); });
    window.addEventListener("online",()=>relireDonneesPartagees());
    setInterval(()=>{ if(!document.hidden) relireDonneesPartagees(); },RELECTURE_INTERVALLE_MS);
    /* Un enregistrement en échec ne doit pas partir en silence. */
    window.addEventListener("beforeunload",ev=>{
      if(SAVE_UI.state!=="error"&&SAVE_UI.state!=="saving") return;
      ev.preventDefault(); ev.returnValue="";
    });
    document.addEventListener("keydown",e=>{
      const target=e.target;
      const saisie=target instanceof HTMLElement && target.matches("input,textarea,select,[contenteditable=true]");
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();openGlobalSearch();return;}
      /* v49 — raccourcis du dossier. Les chiffres affichés sur les onglets
         annonçaient un raccourci qui n'existait pas ; il existe. */
      if(st.view==="devis1"&&!saisie&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!document.querySelector(".modal")){
        const i=["1","2","3","4","5"].indexOf(e.key);
        if(i>=0&&TABS[i]){ e.preventDefault(); st.tab=TABS[i][0]; const dd=curDev(); if(dd) rememberTab(dd.id,st.tab); render(); return; }
      }
      if(e.altKey&&!e.ctrlKey&&!e.metaKey&&["ArrowUp","ArrowDown"].includes(e.key)&&st.view==="devis1"){
        if(deplacerVersVoisin(e.key==="ArrowUp"?-1:1)){ e.preventDefault(); return; }
      }
      if(e.key==="Escape"){
        if(document.body.classList.contains("menu-ouvert")){ document.body.classList.remove("menu-ouvert"); e.preventDefault(); return; }
        document.querySelectorAll(".row-menu[open]").forEach(menu=>{ menu.open=false; });
        const modals=[...document.querySelectorAll(".modal")]; const top=modals[modals.length-1];
        if(top){ e.preventDefault(); top.remove(); return; }
        if(target instanceof HTMLElement && target.matches("input,textarea,select,[contenteditable=true]")) target.blur?.();
        return;
      }
      if(e.key!=="Enter"||e.shiftKey||e.ctrlKey||e.metaKey||e.altKey) return;
      if(target?.matches?.("textarea,[contenteditable=true]")) return;
      if(target?.matches?.("[data-rne-query]")) return; /* géré spécifiquement */
      const modal=target?.closest?.(".modal");
      if(modal){
        if(target?.matches?.("[data-clause-search]")) return; /* recherche instantanée */
        const primary=modal.querySelector("[data-ce-save],button.btn.p:not([data-clause-new])");
        if(primary){ e.preventDefault(); primary.click(); }
        return;
      }
      if(target?.matches?.("input:not([type=checkbox]):not([type=radio])")){
        /* Dans les fiches, Entrée valide le champ en déclenchant onchange via blur. */
        e.preventDefault(); target.blur();
      }
    });
  }
  document.querySelectorAll("[data-filter]").forEach(el=>el.onchange=()=>{st.portFilters[el.dataset.filter]=el.value;enregistrerFiltresPortefeuille();render();});
  document.querySelectorAll("[data-sort]").forEach(el=>el.onclick=e=>{e.stopPropagation();const k=el.dataset.sort;if(st.portSort.key===k)st.portSort.dir=st.portSort.dir==="asc"?"desc":"asc";else st.portSort={key:k,dir:k==="cree"?"desc":"asc"};render();});
  document.querySelectorAll("[data-client-sort]").forEach(el=>el.onclick=e=>{e.stopPropagation();const k=el.dataset.clientSort;if(st.clientSort.key===k)st.clientSort.dir=st.clientSort.dir==="asc"?"desc":"asc";else st.clientSort={key:k,dir:"asc"};render();});
  document.querySelectorAll("[data-ui-col]").forEach(el=>el.onchange=()=>{const c=uiColumns();c[el.dataset.uiCol]=el.checked;try{localStorage.setItem(UI_COLUMNS_STORAGE,JSON.stringify(c));}catch(_){}render();});
  const cq=document.querySelector("[data-client-search]"); if(cq) cq.oninput=()=>{ st.clientQ=cq.value; const v=cq.value; render(); const n=document.querySelector("[data-client-search]"); if(n){n.focus();n.setSelectionRange(v.length,v.length);} };
  const msq=document.querySelector("[data-mod-search]"); if(msq) msq.oninput=()=>{ st.modSearch=msq.value; const v=msq.value; render(); const n=document.querySelector("[data-mod-search]"); if(n){n.focus();n.setSelectionRange(v.length,v.length);} };
  const rq=document.querySelector("[data-rne-query]"); if(rq){
    rq.oninput=()=>{ const d=curDev(); if(d) rneStateFor(d).query=rq.value; };
    rq.onkeydown=e=>{ if(e.key==="Enter"){ e.preventDefault(); ACTS.rneSearch(rq); } };
  }
  const cf=document.querySelector("[data-client-filtre]");
  if(cf){ let t=null; cf.oninput=()=>{ clearTimeout(t); t=setTimeout(()=>ACTS.clientRecherche(cf),280); }; }
  const mlq=document.querySelector("[data-mod-liste-q]");
  if(mlq){ let t=null; mlq.oninput=()=>{ clearTimeout(t); t=setTimeout(()=>{ st.modListeQ=mlq.value; render(); const x=document.querySelector("[data-mod-liste-q]"); if(x){x.focus();x.setSelectionRange(x.value.length,x.value.length);} },280); }; }
  const llq=document.querySelector("[data-lm-liste-q]");
  if(llq){ let t=null; llq.oninput=()=>{ clearTimeout(t); t=setTimeout(()=>{ st.lmListeQ=llq.value; render(); const x=document.querySelector("[data-lm-liste-q]"); if(x){x.focus();x.setSelectionRange(x.value.length,x.value.length);} },280); }; }
  const crq=document.querySelector("[data-create-rne]");if(crq){crq.oninput=()=>{st.create.query=crq.value;};crq.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();ACTS.createRneSearch(crq);}};}
  document.querySelectorAll("[data-client-field]").forEach(el=>el.onchange=async()=>{ const c=st.clients.find(x=>x.id===el.dataset.clientId); if(!c) return; c[el.dataset.clientField]=el.value; c.maj=today(); c.majAt=nowISO(); logAudit(c,`Fiche client modifiée`,el.dataset.clientField); const touches=st.devis.filter(x=>x.clientId===c.id&&!isDevisLocked(x)); for(const d of touches) d.client=clientPublicData(c); await Promise.all([saveClients(),saveDevisCibles(touches)]); render(); });
  /* Questionnaires d'acceptation et anti-blanchiment : portés par la fiche
     client et partagés par tous ses devis. */
  const qClient=()=>st.clients.find(x=>x.id===st.clientViewId)||null;
  const qStore=(c,kind)=>kind==="lab"?ensureQuestionnaires(c).lab:ensureQuestionnaires(c).accept;
  const qTouch=(c,label,detail)=>{ c.maj=today(); c.majAt=nowISO(); logAudit(c,label,detail); };
  const qSave=(rerender)=>{ const p=saveClients(); if(rerender) p.then(()=>render()); return p; };
  document.querySelectorAll("[data-q-answer]").forEach(el=>el.onchange=()=>{
    const c=qClient(); if(!c) return; const kind=el.dataset.qAnswer, q=(kind==="lab"?LAB_QUESTIONS:ACCEPT_QUESTIONS).find(x=>x.id===el.dataset.qid);
    qStore(c,kind).answers[el.dataset.qid]=el.value;
    qTouch(c,kind==="lab"?"Questionnaire anti-blanchiment modifié":"Questionnaire d'acceptation modifié",`${q?q.label.slice(0,90):el.dataset.qid} : ${el.value.toUpperCase()}`);
    qSave(true);
  });
  document.querySelectorAll("[data-q-risk]").forEach(el=>el.onchange=()=>{
    const c=qClient(); if(!c) return; const kind=el.dataset.qRisk;
    qStore(c,kind).risk[el.dataset.critere]=el.value;
    qTouch(c,kind==="lab"?"Niveau de risque anti-blanchiment modifié":"Analyse des risques du client modifiée",`${el.dataset.critere} : ${el.value}`);
    qSave(true);
  });
  document.querySelectorAll("[data-q-obs]").forEach(el=>el.onchange=()=>{
    const c=qClient(); if(!c) return; qStore(c,el.dataset.qObs).observations[el.dataset.qid]=el.value; qTouch(c,"Observation de questionnaire modifiée",el.dataset.qid); qSave(false);
  });
  document.querySelectorAll("[data-q-impact]").forEach(el=>el.onchange=()=>{
    const c=qClient(); if(!c) return; qStore(c,el.dataset.qImpact).impacts[el.dataset.qid]=el.value; qTouch(c,"Impact de questionnaire modifié",el.dataset.qid); qSave(false);
  });
  document.querySelectorAll("[data-q-riskcomment]").forEach(el=>el.onchange=()=>{
    const c=qClient(); if(!c) return; qStore(c,el.dataset.qRiskcomment).riskComments[el.dataset.critere]=el.value; qTouch(c,"Commentaire de risque modifié",el.dataset.critere); qSave(false);
  });
  document.querySelectorAll("[data-q-text]").forEach(el=>el.onchange=()=>{
    const c=qClient(); if(!c) return;
    const [kind,champ]=String(el.dataset.qText).split(".");
    qStore(c,kind)[champ]=el.value;
    qTouch(c,kind==="lab"?"Questionnaire anti-blanchiment modifié":"Questionnaire d'acceptation modifié",champ);
    qSave(champ==="conclusion");
  });
  document.querySelectorAll("[data-q-decision]").forEach(el=>el.onchange=async()=>{
    const c=qClient(); if(!c) return;
    if(!canRole("manager")){ toast("La décision d'acceptation est réservée à un manager / associé.",true); render(); return; }
    const acc=ensureQuestionnaires(c).accept, dec=acceptDecision(el.value);
    acc.decision=el.value; acc.decisionAt=nowISO(); acc.decisionBy=actorName();
    qTouch(c,"Décision d'acceptation enregistrée",dec?dec.label:el.value);
    await saveClients(); render();
    toast(dec?.favorable?"Décision enregistrée : mission acceptée.":"Décision enregistrée : les devis de ce client ne pourront pas être envoyés en signature.",!dec?.favorable);
  });
  /* Panneaux dépliables des questionnaires : l'état d'ouverture est conservé. */
  /* Onglets de la fiche client. */
  document.querySelectorAll("[data-client-tab]").forEach(el=>el.onclick=e=>{ e.stopPropagation(); st.clientTab=el.dataset.clientTab; render(); });
  document.querySelectorAll("[data-doc-params]").forEach(el=>el.ontoggle=()=>{ st.docParamsOpen=!!el.open; });
  document.querySelectorAll("[data-versions-card]").forEach(el=>el.ontoggle=()=>{ st.versionsOpen=!!el.open; });
  document.querySelectorAll("[data-quest-sommaire]").forEach(el=>el.ontoggle=()=>{ st.sommaireOuvert=!!el.open; });
  /* v52 — repli, sommaire et points de vigilance des questionnaires client. */
  /* v53.3 : toute la barre de titre bascule le repli, plus seulement la
     flèche. Viser un chevron pour ouvrir une partie était un coût inutile. */
  document.querySelectorAll("[data-qcli-bar]").forEach(barre=>{
    const bascule=e=>{
      if(e.target.closest("input,select,textarea,button,a,label")) return;
      const id=barre.dataset.qcliBar, sec=document.getElementById("qs-"+id); if(!sec) return;
      const ouvrir=sec.classList.contains("replie");
      sec.classList.toggle("replie",!ouvrir);
      const chev=barre.querySelector(".qsec-chevron"); if(chev) chev.textContent=ouvrir?"▾":"▸";
      barre.setAttribute("aria-expanded",ouvrir?"true":"false");
      barre.title=ouvrir?"Replier cette partie":"Déplier cette partie";
      qcliEnregistrer(id,ouvrir);
    };
    barre.onclick=bascule;
    barre.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); bascule(e); } };
  });
  const atteindreQcli=(id,rowId)=>{
    const sec=document.getElementById("qs-"+id);
    if(sec&&sec.classList.contains("replie")){
      sec.classList.remove("replie"); qcliEnregistrer(id,true);
      const chev=sec.querySelector(".qsec-chevron"); if(chev) chev.textContent="▾";
    }
    const cible=rowId?document.getElementById(rowId):sec;
    if(!cible) return;
    cible.scrollIntoView({behavior:"smooth",block:"center"});
    cible.classList.add("row-flash"); setTimeout(()=>cible.classList.remove("row-flash"),1700);
  };
  document.querySelectorAll("[data-qcli-aller]").forEach(b=>b.onclick=()=>atteindreQcli(b.dataset.qcliAller,null));
  document.querySelectorAll("[data-vig-aller]").forEach(b=>b.onclick=()=>{
    const row=document.getElementById("qrow-lab-"+b.dataset.vigAller);
    const sec=row?row.closest(".q-section"):null;
    atteindreQcli(sec?String(sec.id).replace(/^qs-/,""):"", row?row.id:null);
  });
  /* Champs d'observation extensibles : ils grandissent avec le texte
     plutôt que de le faire défiler dans une ligne unique. */
  const ajusterHauteur=el=>{ el.style.height="auto"; el.style.height=Math.min(el.scrollHeight+2,260)+"px"; };
  document.querySelectorAll("[data-auto-haut]").forEach(el=>{
    ajusterHauteur(el);
    el.addEventListener("input",()=>ajusterHauteur(el));
  });
  document.querySelectorAll("[data-quest-filtre]").forEach(b=>b.onclick=()=>{ st.questFiltre=b.dataset.questFiltre||""; render(); });
  document.querySelectorAll("[data-quest-detail]").forEach(b=>b.onchange=()=>{ st.questDetail=!!b.checked; render(); });
  document.querySelectorAll("[data-reglages-rub]").forEach(b=>b.onclick=()=>{ st.reglagesRub=b.dataset.reglagesRub; render(); });
  if(typeof fjLier==="function") fjLier();
  document.querySelectorAll("[data-ca-annee]").forEach(sel=>sel.onchange=()=>{ st.caAnnee=sel.value; render(); });
  document.querySelectorAll("[data-ca-liste]").forEach(el=>el.ontoggle=()=>{ st.caListeOuverte=el.open; });
  /* v53.6 : retraitement des frais et débours. Il porte sur le dossier
     désigné par la ligne, pas sur le dossier courant, et reste permis sur
     un dossier signé : aucun élément contractuel n'est touché. */
  document.querySelectorAll("[data-ca-frais]").forEach(inp=>{
    inp.onclick=e=>e.stopPropagation();
    inp.onkeydown=e=>e.stopPropagation();
    inp.onchange=async()=>{
      const dossier=st.devis.find(x=>x.id===inp.dataset.caFrais); if(!dossier) return;
      const cat=inp.dataset.cat, v=Math.max(0,Math.round(+inp.value||0));
      const avant=Math.max(0,+((dossier.caFrais||{})[cat])||0);
      if(v===avant) return;
      dossier.caFrais={...(dossier.caFrais||{})};
      if(v>0) dossier.caFrais[cat]=v; else delete dossier.caFrais[cat];
      if(!Object.keys(dossier.caFrais).length) delete dossier.caFrais;
      logAudit(dossier,"Retraitement des frais et débours",`${cat} : ${avant} \u2192 ${v} \u20ac (chiffre d'affaires uniquement)`);
      await saveDevisCibles([dossier]);
      render();
    };
  });
  document.querySelectorAll("tr[data-ca-ligne]").forEach(tr=>{
    const bascule=e=>{ e.stopPropagation(); const id=tr.dataset.caLigne;
      st.caOuvert = String(st.caOuvert||"")===id ? "" : id; render(); };
    tr.onclick=bascule;
    tr.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); bascule(e); } };
  });
  document.querySelectorAll("[data-chrono]").forEach(el=>el.ontoggle=()=>{ st.chronoOuverte=!!el.open; });
  document.querySelectorAll("[data-mode-signature]").forEach(b=>b.onclick=async()=>{
    const d=curDev(); if(!d) return;
    d.modeSignature=b.dataset.modeSignature||"";
    logAudit(d,"Mode de signature choisi",d.modeSignature==="app"?"Envoi depuis SERRE":d.modeSignature==="hors"?"Envoi hors SERRE":"non défini");
    await saveDev(); render();
  });
  document.querySelectorAll("[data-doc-tiroir]").forEach(b=>b.onclick=()=>{ const k=b.dataset.docTiroir||""; st.docTiroir=(st.docTiroir===k)?"":k; render(); });
  /* v51 — repli, sommaire et saut vers la question suivante du questionnaire. */
  /* v53.3 : la barre entière replie la section. Le contrôle « au devis »
     garde son propre effet — il porte une décision commerciale, pas un
     affichage — et ne doit donc jamais replier au passage. */
  document.querySelectorAll("[data-qsec-bar]").forEach(barre=>{
    const bascule=e=>{
      if(e.target.closest(".qsec-exclure,input,select,textarea,button,a")) return;
      const id=barre.dataset.qsecBar, sec=document.getElementById("qsec-"+id);
      if(!sec) return;
      const ouvrir=sec.classList.contains("replie");
      sec.classList.toggle("replie",!ouvrir);
      const chev=barre.querySelector(".qsec-chevron"); if(chev) chev.textContent=ouvrir?"▾":"▸";
      barre.setAttribute("aria-expanded",ouvrir?"true":"false");
      barre.title=ouvrir?"Replier l'affichage de cette section":"Déplier l'affichage de cette section";
      qsecEnregistrer(id,ouvrir);
    };
    barre.onclick=bascule;
    barre.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); bascule(e); } };
  });
  const ouvrirEtAtteindre=(sectionId,itemId)=>{
    const sec=document.getElementById("qsec-"+sectionId);
    if(!sec) return;
    if(sec.classList.contains("replie")){
      sec.classList.remove("replie"); qsecEnregistrer(sectionId,true);
      const barre=sec.querySelector("[data-qsec-bar]"), chev=sec.querySelector(".qsec-chevron");
      if(chev) chev.textContent="▾";
      if(barre) barre.setAttribute("aria-expanded","true");
    }
    const cible=itemId?(sec.querySelector(`[data-i="${CSS.escape(itemId)}"]`)?.closest(".q")||sec):sec;
    cible.scrollIntoView({behavior:"smooth",block:"center"});
    cible.classList.add("row-flash"); setTimeout(()=>cible.classList.remove("row-flash"),1700);
    const champ=cible.querySelector("select,input[type=text],input[type=number],button[data-act='repChoice']");
    if(champ&&champ.focus) setTimeout(()=>champ.focus({preventScroll:true}),320);
  };
  document.querySelectorAll("[data-qsec-aller]").forEach(b=>b.onclick=()=>ouvrirEtAtteindre(b.dataset.qsecAller,null));
  document.querySelectorAll("[data-qsec-question]").forEach(b=>b.onclick=()=>ouvrirEtAtteindre(b.dataset.qsecSection,b.dataset.qsecQuestion));
  document.querySelectorAll("[data-aide-quest]").forEach(b=>b.onclick=()=>{
    try{ localStorage.setItem(AIDE_QUEST_STORAGE,b.dataset.aideQuest==="1"?"1":"0"); }catch(_){}
    render();
  });
  /* Le bloc « Dossiers classés » garde son état d'ouverture entre deux rendus. */
  document.querySelectorAll("[data-classed-panel]").forEach(el=>el.ontoggle=()=>{ st.portClassedOpen=!!el.open; });
  /* v43 : mêmes volets pour les trois blocs de travail du portefeuille. */
  document.querySelectorAll("[data-mission-panel]").forEach(el=>el.ontoggle=()=>{
    st.portPanels={...(st.portPanels||{}),[el.dataset.missionPanel]:!!el.open};
  });
  document.querySelectorAll("[data-jump-tab]").forEach(b=>b.onclick=()=>{ st.tab=b.dataset.jumpTab; render(); const sel=b.dataset.focus; if(sel) setTimeout(()=>{ const x=document.querySelector(sel); if(x){x.scrollIntoView({behavior:"smooth",block:"center"}); x.focus?.();}},30); });
  document.querySelectorAll("[data-jump-client]").forEach(b=>b.onclick=()=>{ st.clientViewId=b.dataset.jumpClient; st.view="client1"; st.clientTab=b.dataset.jumpClientTab||"accept"; render(); });
  document.querySelectorAll("[data-jump-nav]").forEach(b=>b.onclick=()=>{ st.view=b.dataset.jumpNav; render(); const sel=b.dataset.focus; if(sel) setTimeout(()=>{ const x=document.querySelector(sel); if(x){x.scrollIntoView({behavior:"smooth",block:"center"}); x.focus?.();}},30); });
  document.querySelectorAll("[data-act]").forEach(el=>{
    const f=e=>{ if(el.matches(".mv button,.collapse-btn")) e?.stopPropagation(); const act=el.dataset.act;
      const managerActs=new Set(["reprendreLaMain","modListe","modOuvrir","lmListe","lmOuvrir","lmApercu","clientDeletePermanent","catPrix","catPrixReset","catPrixMotif","valide","send","manualSignStep","manuel","bulkAssign","bulkArchive","bulkExport","devDel","devDelList","modPub","modDup","modNew","modDel","modF","modLmRule","selSec","selItem","secCollapse","secDup","secUp","secDown","itDup","itUp","itDown","itAdd","secAdd","secF","secDel","itF","itPrix","itDebours","excDebours","fmtModel","fontSizeModel","textStyleModel","repF","repMode","repFn","repAdd","repDel","excAdd","excDel","excF","mdebAdd","mdebDel","mdebF","insVar","lmPick","lmSel","lmNom","lmTxt","lmTit","lmTog","lmUp","lmDown","lmAdd","lmNew","lmSerre","lmDup","lmDel","lmReset","lmDraftVersion","lmPub","insVarLm","condSource","condValue","condRange","condClear","modelExcelImport","modelExcelTemplate","modDraftVersion"]);
      const adminActs=new Set(["ouvrirCorbeille","accesCreer","accesReinit","settingColor","settingBrandText","settingBrandColor","settingsReset","profileRole","cabSerre","ysTest","clauseSaveSelection","clauseLibraryManage","toolsTab","healthCheck","mergeDuplicateGroup","trashRestore","auditExport","errorsClear","backupSelfTest","toolOpenDevis","toolOpenModel","ysTemplate"]);
      if(adminActs.has(act)&&!canRole("admin")){toast("Action réservée à l'administrateur.",true);return;}
      if(managerActs.has(act)&&!canRole("manager")){toast("Action réservée à un manager / associé.",true);return;}
      const lockedAllowed=new Set(["docT","pdfDevis","pdfLm","print","previewQuote","statut","downloadSigned","payload","manualSignStep","devDup","clientArchive","qPrint","qPdf","qPreview","relanceFaite","reprendreLaMain","versionOuvrir","comparePdf","dl","copySignMessage"]);
      /* v49 : un blocage ne se solde plus par un message fugace. L'utilisateur
         se voit proposer les deux seules issues réelles — dupliquer, ou
         reprendre la main sur le dossier. */
      if(st.view==="devis1"&&isDevisLocked(curDev())&&!lockedAllowed.has(act)){ proposerDeblocage(); return; }
      if(!ACTS[act]) return;
      if(LONG_ACTS.has(act)) return runBusyAction(act,()=>ACTS[act](el));
      return ACTS[act](el); };
    if(el.tagName==="INPUT"&&el.type!=="checkbox") el.onchange=f;
    else if(el.tagName==="SELECT"||el.tagName==="TEXTAREA") el.onchange=f;
    else el.onclick=f;
  });
  /* Editeurs WYSIWYG : le clic sur les boutons ne doit pas faire perdre la sélection.
     Pour le sélecteur de taille, on mémorise la sélection avant l'ouverture de la liste. */
  document.querySelectorAll(".rich-toolbar [data-fmt], .vars [data-act='insVar'], .rich-toolbar [data-act='clauseLibrary'], .rich-toolbar [data-act='clauseSaveSelection']").forEach(b=>b.onmousedown=e=>e.preventDefault());
  document.querySelectorAll(".rich-toolbar select[data-font-size], .rich-toolbar select.style-select").forEach(sel=>sel.onmousedown=()=>{
    const editor=sel.closest(".rich-editor")?.querySelector(".rich-content"); rememberRichSelection(editor);
  });
  document.querySelectorAll("[data-rich-devis]").forEach(el=>{
    let timer=null; const id=el.dataset.richDevis;
    const sync=()=>{ const d=curDev(); if(d&&!isDevisLocked(d)) d.rep[id]=packRichText(el.innerHTML); };
    el.onmouseup=el.onkeyup=()=>rememberRichSelection(el);
    el.onkeydown=e=>{ if((e.ctrlKey||e.metaKey)&&["b","i","u"].includes(e.key.toLowerCase())){ e.preventDefault(); applyEditorFormat(el,{b:"bold",i:"italic",u:"underline"}[e.key.toLowerCase()]); sync(); saveDev(); } };
    el.oninput=()=>{ sync(); rememberRichSelection(el); clearTimeout(timer); timer=setTimeout(()=>saveDev(),450); };
    el.onblur=()=>{ sync(); clearTimeout(timer); const d=curDev(); if(d) logAudit(d,"Texte libre modifié",el.closest(".q")?.querySelector(".ql b")?.textContent||""); saveDev(); };
  });
  document.querySelectorAll("[data-rich-model]").forEach(el=>{
    let timer=null; const sync=()=>{ const it=findItem(st.itemId); if(it) it.html=packRichText(el.innerHTML); };
    el.onmouseup=el.onkeyup=()=>rememberRichSelection(el);
    el.onkeydown=e=>{ if((e.ctrlKey||e.metaKey)&&["b","i","u"].includes(e.key.toLowerCase())){ e.preventDefault(); applyEditorFormat(el,{b:"bold",i:"italic",u:"underline"}[e.key.toLowerCase()]); sync(); saveMod(); } };
    el.oninput=()=>{ sync(); rememberRichSelection(el); clearTimeout(timer); timer=setTimeout(()=>saveMod(),450); };
    el.onblur=()=>{ sync(); clearTimeout(timer); const m=curMod(); if(m) logAudit(m,"Texte du modèle modifié",findItem(st.itemId)?.label||""); saveMod(); };
  });
  document.querySelectorAll("[data-c]").forEach(el=>el.onchange=()=>{ if(!canRole("admin")){toast("Action réservée à l’administrateur.",true);render();return;} st.cab[el.dataset.c]=el.type==="number"?+el.value:el.value; saveCab(); });
  document.querySelectorAll("[data-y]").forEach(el=>el.onchange=()=>{ if(!canRole("admin")){toast("Action réservée à l’administrateur.",true);render();return;} st.ys[el.dataset.y]=el.value; auditGlobal("Paramètre Yousign modifié",el.dataset.y,"yousign",""); S.set(K.ys,JSON.stringify(st.ys),true); });
  document.querySelectorAll("[data-d]").forEach(el=>{
    const commitField=async()=>{
      if(el.type==="date" && (!el.validity.valid || el.value===el.defaultValue)) return;
      const d=curDev(); if(!d) return;
      /* v48 : quelques champs échappent au verrou — voir CHAMPS_MODIFIABLES_APRES_GEL. */
      const apresGel=isDevisLocked(d)&&CHAMPS_MODIFIABLES_APRES_GEL.has(el.dataset.d);
      if(isDevisLocked(d)&&!apresGel){ render(); proposerDeblocage(); return; } const p=el.dataset.d.split("."); let o=d;
      while(p.length>1) o=o[p.shift()];
      o[p[0]] = el.type==="checkbox"?el.checked:(el.type==="number"?(el.value===""?"":+el.value):el.value);
      if(el.dataset.d==="modeleId"){ d.catPrix={}; syncClientFormToModel(d,modOf(d)); }
      if(el.dataset.d==="client.siren"){
        const dup=duplicateClientBySiren(d.client,d.clientId);
        if(dup){
          const oldMaster=clientMasterOf(d);
          const use=await askConfirm("Client déjà existant",`Ce SIREN existe déjà pour « ${dup.raison||"ce client"} ».\n\nUtiliser sa fiche existante afin de conserver un historique client unique ?`,{confirmLabel:"Utiliser la fiche"});
          if(use){
            if(oldMaster && oldMaster.id!==dup.id && !st.devis.some(x=>x.id!==d.id&&x.clientId===oldMaster.id)){
              st.clients=st.clients.filter(x=>x.id!==oldMaster.id);
            }
            applyClientToDevis(d,dup); syncClientFormToModel(d,modOf(d));
            logAudit(d,"Client existant réutilisé",dup.raison||dup.siren||"");
            Promise.all([saveClients(),saveDev()]); render(); toast(`Fiche client « ${dup.raison||"existante"} » réutilisée.`); return;
          }
          d.client.siren="";
          logAudit(d,"Doublon SIREN évité",dup.raison||dup.siren||"");
          saveDev(); render(); toast("SIREN retiré pour éviter la création d'un doublon. Vous pouvez sélectionner la fiche existante dans la liste.",true); return;
        }
      }
      if(el.dataset.d==="client.forme"){
        syncClientFormToModel(d,modOf(d));
        syncAutomaticQuality(d,true);
      }
      if(el.dataset.d==="client.civilite") syncAutomaticQuality(d,false);
      if(el.dataset.d.startsWith("client.")){ ensureClientForDevis(d,true); saveClients(); }
      const lab=el.closest("label")?.querySelector("span")?.textContent?.trim()||el.dataset.d;
      if(apresGel){
        /* Les documents verrouillés sont réémis à partir de leurs propres
           instantanés : seul le champ modifié change, le contenu
           contractuel reste identique. */
        const refait=regenererDocumentsFiges(d);
        const valeur=el.dataset.d==="dateLm"?dateFR(dateLettre(d)):String(el.value||"").trim()||"(vide)";
        logAudit(d,`${lab} — modifié après verrouillage`,
          `${valeur}${refait?"":" — documents verrouillés non réémis"}`);
        if(!refait) toast("Modification enregistrée, mais les documents verrouillés n'ont pas pu être réémis.",true);
      } else logAudit(d,"Champ modifié",lab);
      saveDev();
      if(el.type==="date"){ el.defaultValue=el.value; majLedger(); }
      else if(el.dataset.re||el.dataset.d==="client.forme") render(); else majLedger(); };
    // Les champs date natifs émettent change pendant la saisie de chaque segment.
    // Attendre la sortie évite de remplacer le champ après le premier chiffre.
    if(el.type==="date") el.onblur=commitField;
    else el.onchange=commitField;
  });
  const q=$("#q"); if(q) q.oninput=()=>{ st.q=q.value; const v=q.value; render(); const n=$("#q"); if(n){ n.focus(); n.setSelectionRange(v.length,v.length); } };
  /* Glisser-déposer dans l'éditeur de modèle. */
  document.querySelectorAll("[data-drag-sec]").forEach(el=>{
    el.ondragstart=e=>{ if(e.target.closest("[data-drag-item]")){ return; } e.dataTransfer.setData("application/x-serre-section",el.dataset.dragSec); el.classList.add("dragging"); };
    el.ondragend=()=>el.classList.remove("dragging");
    el.ondragover=e=>{ if(e.dataTransfer.types.includes("application/x-serre-section")){ e.preventDefault(); el.classList.add("drag-over"); } };
    el.ondragleave=()=>el.classList.remove("drag-over");
    el.ondrop=e=>{ const id=e.dataTransfer.getData("application/x-serre-section"); if(!id) return; e.preventDefault(); e.stopPropagation(); el.classList.remove("drag-over"); const m=curMod(), from=m.sections.findIndex(x=>x.id===id), to=m.sections.findIndex(x=>x.id===el.dataset.dragSec); if(from<0||to<0||from===to) return; const [x]=m.sections.splice(from,1); m.sections.splice(to,0,x); logAudit(m,"Section déplacée",x.titre); saveMod(); render(); };
  });
  document.querySelectorAll("[data-drag-item]").forEach(el=>{
    el.ondragstart=e=>{ e.stopPropagation(); e.dataTransfer.setData("application/x-serre-item",JSON.stringify({sec:el.dataset.dragItemSec,id:el.dataset.dragItem})); el.classList.add("dragging"); };
    el.ondragend=()=>el.classList.remove("dragging");
    el.ondragover=e=>{ if(e.dataTransfer.types.includes("application/x-serre-item")){ e.preventDefault(); e.stopPropagation(); el.classList.add("drag-over"); } };
    el.ondragleave=()=>el.classList.remove("drag-over");
    el.ondrop=e=>{ const raw=e.dataTransfer.getData("application/x-serre-item"); if(!raw) return; e.preventDefault(); e.stopPropagation(); el.classList.remove("drag-over"); let p; try{p=JSON.parse(raw)}catch(_){return} const m=curMod(), fs=m.sections.find(x=>x.id===p.sec), ts=m.sections.find(x=>x.id===el.dataset.dragItemSec); if(!fs||!ts) return; const fi=fs.items.findIndex(x=>x.id===p.id), ti=ts.items.findIndex(x=>x.id===el.dataset.dragItem); if(fi<0||ti<0) return; const [x]=fs.items.splice(fi,1); const ins=ts===fs&&fi<ti?ti-1:ti; ts.items.splice(ins,0,x); st.secId=ts.id; st.itemId=x.id; logAudit(m,"Prestation déplacée",x.label); saveMod(); render(); };
  });
  document.querySelectorAll("[data-drop-sec]").forEach(el=>el.ondragover=e=>{ if(e.dataTransfer.types.includes("application/x-serre-item")) e.preventDefault(); });
  syncStickyOffsets(); applyBusyState();
}
function majLedger(){ const d=curDev(); if(!d) return;
  const e=$("#ledger"); if(e) e.innerHTML=ledger(d);
  const w=$("#warn"); if(w){ w.innerHTML=warn(d); w.querySelectorAll("[data-jump-tab]").forEach(b=>b.onclick=()=>{st.tab=b.dataset.jumpTab;render();const sel=b.dataset.focus;if(sel)setTimeout(()=>{const x=document.querySelector(sel);if(x){x.scrollIntoView({behavior:"smooth",block:"center"});x.focus?.();}},30);}); w.querySelectorAll("[data-jump-client]").forEach(b=>b.onclick=()=>{st.clientViewId=b.dataset.jumpClient;st.view="client1";st.clientTab=b.dataset.jumpClientTab||"accept";render();}); w.querySelectorAll("[data-jump-nav]").forEach(b=>b.onclick=()=>{st.view=b.dataset.jumpNav;render();const sel=b.dataset.focus;if(sel)setTimeout(()=>{const x=document.querySelector(sel);if(x){x.scrollIntoView({behavior:"smooth",block:"center"});x.focus?.();}},30);}); } }
function nouveauDevis(clientId=""){
  if(!st.modeles.length){toast("Créez d'abord un modèle.",true);st.view="modeles";render();return;}
  const published=st.modeles.filter(x=>x.statut==="publie"),first=published[0]||st.modeles[0]||null;st.create={query:"",loading:false,error:"",results:[],company:null,clientId:clientId||"",modelId:first?.id||"",markers:defaultMarkersForModel(first)};
  const c=clientId?st.clients.find(x=>x.id===clientId):null;if(c)st.create.query=c.siren||c.raison||"";st.view="nouveau";render();
}


VIEWS.home=()=>{
  const active=st.devis.filter(d=>!isArchivedDevis(d)),notifs=appNotifications(),relances=dossiersARelancer(),autres=notifs.filter(n=>n.kind!=="signature"),recent=recentDevis(6),signed=active.filter(d=>["signe","classe"].includes(workflowStatut(d))).length;
  const hour=new Date().getHours(),hello=hour<12?"Bonjour":hour<18?"Bon après-midi":"Bonsoir";
  return `<div class="top"><h1>Accueil</h1><span class="sub">Vue d'ensemble du cabinet</span><span class="spacer"></span><button class="btn top-command" data-global-search>Rechercher partout <span class="spacer"></span><kbd>Ctrl K</kbd></button><button class="btn p" data-nav="nouveau">Nouveau dossier</button></div>
  <div class="wrap"><div class="cockpit-hero"><div class="card welcome-card"><div class="bd"><div class="welcome-title">${hello}${userDisplayName()?`, ${esc(userDisplayName())}`:""}.</div><div class="welcome-sub">${relances.length?`${relances.length} dossier(s) à relancer aujourd'hui.`:(autres.length?`Aucune relance à faire. ${autres.length} élément(s) de suivi vous attendent dans les notifications.`:"Le portefeuille est à jour. Vous pouvez créer un dossier ou reprendre un dossier récent.")}</div><div class="quick-actions"><button class="btn p" data-nav="nouveau">Créer un dossier</button><button class="btn" data-nav="devis">Voir le portefeuille</button></div></div></div><div class="card"><div class="hd">Activité</div><div class="bd"><div class="create-summary-row"><span>Dossiers actifs</span><b>${active.length}</b></div><div class="create-summary-row"><span>Finalisés</span><b>${signed}</b></div><div class="create-summary-row"><span>Relances à faire</span><b>${relances.length}</b></div><div class="create-summary-row"><span>Autres suivis</span><b>${autres.length}</b></div><div class="create-summary-row"><span>Signatures en attente</span><b>${active.filter(d=>workflowStatut(d)==="envoye").length}</b></div></div></div></div>
  <div class="cockpit-grid"><div class="card"><div class="hd">Relances à faire <span class="spacer"></span><span class="tag ${relances.length?"ocre":"gris"}">${relances.length}</span></div><div class="bd">${relances.length?`<div class="action-list">${relances.slice(0,8).map(({d,e})=>`<div class="action-item"><span class="action-dot ${e.niveau==="expire"?"red":"blue"}"></span><div><b>${esc(d.client?.raison||"Dossier sans nom")}${intitulePersonnalise(d)?` — ${esc(intituleDevis(d))}`:""}</b><small>${esc(e.txt)} · envoyé ${dateFR(dateEnvoiDe(d))}${e.niveau==="expire"?" · une nouvelle proposition est nécessaire":""}</small></div><div class="row" style="gap:6px">${e.niveau==="relance"?`<button class="btn sm" data-act="relanceFaite" data-id="${d.id}" title="Enregistrer que le client a été relancé">J'ai relancé</button>`:""}<button class="btn sm" data-home-open="${d.id}" data-home-tab="sign">Ouvrir</button></div></div>`).join("")}</div>${relances.length>8?`<div class="hint" style="margin-top:8px">${relances.length-8} autre(s) relance(s) — voir le portefeuille, filtre « En retard ».</div>`:""}`:`<div class="empty-state" style="padding:24px"><div class="empty-mark">✓</div><b>Aucune relance à faire</b><small>Aucun devis envoyé ne reste sans retour au-delà de ${RELANCE_JOURS} jours.</small></div>`}
    ${autres.length?`<div class="hint" style="margin-top:12px;border-top:1px solid var(--reglure-f);padding-top:9px">${autres.length} autre(s) élément(s) de suivi — acceptations à finaliser, devis prêts à envoyer, brouillons anciens. <button class="btn sm" data-nav="notifications">Voir les notifications</button></div>`:""}</div></div>
  <div class="card"><div class="hd">Dossiers récents</div><div class="bd"><div class="recent-list">${recent.map(d=>`<div class="recent-item" data-home-open="${d.id}" data-home-tab="${rememberedTab(d.id)}"><b>${esc(d.client?.raison||"Dossier sans nom")}</b><small>${esc(d.ref||"Brouillon")} · <span class="tag status-tag ${STATUTS[workflowStatut(d)]?.[1]||"gris"}">${STATUTS[workflowStatut(d)]?.[0]||""}</span> · ${dateTimeFR(d.majAt||d.cree)}</small></div>`).join("")||`<div class="empty-state" style="padding:20px"><b>Aucun dossier</b><small>Créez votre premier dossier.</small></div>`}</div></div></div></div></div>`;
};

/* =====================================================================
   v51 — Notifications regroupées par dossier
   ---------------------------------------------------------------------
   La liste alignait une ligne par motif : un même dossier y figurait deux
   ou trois fois, sous des titres différents. Six alertes pour trois
   dossiers, et l'impression d'un arriéré qui n'existait pas. Un dossier,
   une carte, ses motifs en dessous.

   L'accueil, lui, ne montre plus que les relances : c'est la seule chose
   qui demande une action vers l'extérieur et qui se périme.
   ===================================================================== */
const NOTIF_RANG={acceptation:0,signature:1,ready:2,draft:3};
function notificationsParDossier(){
  const parId=new Map();
  for(const n of appNotifications()){
    if(!parId.has(n.id)) parId.set(n.id,{id:n.id,motifs:[],niveau:2});
    const g=parId.get(n.id);
    g.motifs.push(n);
    const rang=n.level==="red"?0:n.level==="blue"?1:2;
    if(rang<g.niveau) g.niveau=rang;
  }
  return [...parId.values()]
    .map(g=>({...g, d:st.devis.find(x=>x.id===g.id), motifs:g.motifs.sort((a,b)=>(NOTIF_RANG[a.kind]??9)-(NOTIF_RANG[b.kind]??9))}))
    .filter(g=>g.d)
    .sort((a,b)=>a.niveau-b.niveau);
}
VIEWS.notifications=()=>{
  const groupes=notificationsParDossier();
  const nMotifs=groupes.reduce((n,g)=>n+g.motifs.length,0);
  const carte=g=>{
    const e=etatRetard(g.d), aRelancer=!!e&&e.niveau==="relance";
    const onglet=g.motifs[0]?.tab||"client";
    return `<div class="notification-card">
      <span class="action-dot ${g.niveau===0?"red":g.niveau===1?"blue":""}"></span>
      <div>
        <b>${esc(g.d.client?.raison||"Dossier sans nom")}${intitulePersonnalise(g.d)?` — ${esc(intituleDevis(g.d))}`:""}</b>
        <div class="notif-ref">${esc(g.d.ref||"Brouillon")}${e?` · ${esc(e.txt)}`:""}</div>
        <ul class="notif-motifs">${g.motifs.map(n=>`<li><b>${esc(n.title.split(" — ")[0])}</b>${n.help?` — ${esc(n.help)}`:""}</li>`).join("")}</ul>
      </div>
      <div class="row" style="gap:6px;align-items:flex-start">
        ${aRelancer?`<button class="btn sm" data-act="relanceFaite" data-id="${g.d.id}" title="Enregistrer que le client a été relancé">J'ai relancé</button>`:""}
        <button class="btn sm" data-home-open="${g.d.id}" data-home-tab="${esc(onglet)}">Ouvrir</button>
      </div></div>`;
  };
  return `<div class="top"><h1>Notifications</h1><span class="sub">Suivi interne, relances et dossiers à reprendre</span><span class="spacer"></span><button class="btn" data-act="notificationsRefresh">Actualiser</button></div>
  <div class="wrap"><div class="card"><div class="hd">Dossiers à suivre <span class="spacer"></span><span class="tag gris">${groupes.length} dossier(s) · ${nMotifs} motif(s)</span></div><div class="bd">
    ${groupes.length?`<div class="notification-page-list">${groupes.map(carte).join("")}</div>`:`<div class="empty-state"><div class="empty-mark">✓</div><b>Aucune notification</b><small>Aucun rappel arrivé à échéance et aucun dossier nécessitant une relance.</small></div>`}
  </div></div></div>`;
};


function createSelectedClient(){return st.create.clientId?st.clients.find(c=>c.id===st.create.clientId)||null:null;}
function createSelectedModel(){return st.modeles.find(m=>m.id===st.create.modelId)||null;}
VIEWS.nouveau=()=>{
  const cs=st.create||{},client=createSelectedClient(),company=cs.company,model=createSelectedModel(),published=st.modeles.filter(m=>m.statut==="publie"),markers=normalizeDevisMarkers(cs.markers||[]);
  return `<div class="top"><h1>Nouveau dossier</h1><span class="sub">Client <i>(facultatif)</i> → mission → marqueurs → création</span><span class="spacer"></span><button class="btn ghost" data-nav="home">Annuler</button></div><div class="wrap"><div class="create-layout"><div class="create-main">
  <div class="card create-step"><div class="hd"><span class="step-no">1</span> Identifier le client</div><div class="bd"><div class="grid g2"><label class="f"><span>RNE / INPI — SIREN, SIRET ou dénomination ${helpTip("Recherche les données publiques de l'entreprise et peut importer automatiquement forme, adresse et représentant légal.")}</span><div class="copy-field"><input data-create-rne type="text" value="${esc(cs.query||"")}" placeholder="Ex. 824821490 ou SOCIATAX"><button class="btn p" data-act="createRneSearch" ${cs.loading?"disabled":""}>${cs.loading?"Recherche…":"Rechercher"}</button></div><div class="hint">Le représentant légal disponible au RNE sera repris automatiquement.</div></label>
  <label class="f"><span>Ou reprendre un client existant</span><select data-act="createClientPick"><option value="">— Nouveau client / saisie libre —</option>${[...st.clients].filter(c=>!c.archive).sort((a,b)=>String(a.raison||"").localeCompare(String(b.raison||""),"fr")).map(c=>`<option value="${c.id}" ${cs.clientId===c.id?"selected":""}>${esc(c.raison||"Client")} ${c.siren?`· ${esc(c.siren)}`:""}</option>`).join("")}</select></label></div>
  ${cs.loading?`<div class="rne-skeleton"><div class="skeleton skeleton-line lg"></div><div class="skeleton skeleton-line md"></div><div class="skeleton skeleton-line sm"></div></div>`:""}${cs.error?`<div class="notice rouge" style="margin-top:10px">${esc(cs.error)}</div>`:""}
  ${company?`<div class="create-company"><b>${esc(company.denomination||"Entreprise")}</b><div class="meta">${esc(rneCompanySummary(company))}</div>${rnePrimaryLeader(company)?`<div class="hint">Représentant proposé : ${esc([rnePrimaryLeader(company).civilite,rnePrimaryLeader(company).nom].filter(Boolean).join(" "))}</div>`:""}</div>`:""}
  ${!company&&cs.results?.length?`<div class="create-results">${cs.results.map((x,i)=>`<div class="create-result" data-act="createRneUse" data-index="${i}"><div class="grow"><b>${esc(x.denomination||"Entreprise")}</b><div class="hint">${esc(rneCompanySummary(x))}</div></div><button class="btn sm p" data-act="createRneUse" data-index="${i}">Utiliser</button></div>`).join("")}</div>`:""}${client?`<div class="create-company"><b>Client existant : ${esc(client.raison||"Client")}</b><div class="meta">${esc(client.forme||"")} ${esc(client.siren||"")} · ${esc(client.ville||"")}</div></div>`:""}</div></div>

  <div class="card create-step"><div class="hd"><span class="step-no">2</span> Choisir la mission</div><div class="bd"><div class="model-choice-grid">${published.map(m=>{const defaults=defaultMarkersForModel(m);return `<button class="model-choice ${cs.modelId===m.id?"on":""}" data-act="createModelPick" data-id="${m.id}"><span class="model-check">${cs.modelId===m.id?"✓":""}</span><b>${esc(m.titre)}</b><small>${esc(m.desc||"")} · ${m.per==="annuelle"?"Annuel":m.per==="ponctuelle"?"Ponctuel":"Récurrent"}</small><div style="margin-top:8px">${defaults.map(markerBadge).join(" ")}</div></button>`;}).join("")}</div><div class="hint" style="margin-top:10px">Les badges affichés sur les modèles sont les marqueurs proposés par défaut : ils se cochent d'eux-mêmes à l'étape 3 dès que la mission est choisie.</div>${!model?`<div class="notice rouge" style="margin-top:10px">Choisissez une mission pour poursuivre.</div>`:""}</div></div>

  <div class="card create-step"><div class="hd"><span class="step-no">3</span> Marqueurs du dossier${model?`<span class="spacer"></span><button class="btn sm" data-act="createMarkersReset" title="Revenir aux marqueurs proposés par la mission">Marqueurs du modèle</button>`:""}</div><div class="bd"><div class="hint">Repris de la mission choisie ; ils servent au classement visuel du portefeuille et restent modifiables après la création.</div>${markerPickerHTML(markers,"createMarkerToggle")}${!model?`<div class="hint" style="margin-top:10px">Ils se rempliront dès que la mission de l'étape 2 sera choisie.</div>`:!markers.length?`<div class="notice rouge" style="margin-top:10px">Vous les avez tous décochés : gardez-en au moins un, ou rétablissez ceux du modèle.</div>`:""}</div></div>
  </div>

  <aside class="card create-summary"><div class="hd">Résumé</div><div class="bd"><div class="create-summary-row"><span>Client</span><b>${esc(client?.raison||company?.denomination||"À renseigner")}</b></div><div class="create-summary-row"><span>Mission</span><b>${esc(model?.titre||"À choisir")}</b></div><div class="create-summary-row"><span>Marqueurs</span><div style="margin-top:5px">${markers.length?markers.map(markerBadge).join(" "):"<b>À choisir</b>"}</div></div><div class="create-summary-row"><span>Source client</span><b>${client?"Fiche existante":company?"RNE / INPI":"Saisie libre"}</b></div><button class="btn p" style="width:100%;justify-content:center;margin-top:14px" data-act="createStart" ${!model||!markers.length?"disabled":""} title="${!model?"Choisissez d'abord une mission à l'étape 2":!markers.length?"Gardez au moins un marqueur à l'étape 3":"Créer le dossier"}">Créer le dossier</button><div class="hint" style="margin-top:8px">${!model?"<b>Il manque la mission</b> — étape 2.":!markers.length?"<b>Il manque un marqueur</b> — étape 3.":"L'identification du client est facultative : elle peut être complétée ensuite dans l'onglet Client."}</div></div></aside></div></div>`;
};

