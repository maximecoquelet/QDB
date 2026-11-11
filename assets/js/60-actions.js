/* ============================================================ actions */
function findItem(id){ for(const m of st.modeles) for(const s of m.sections){ const i=s.items.find(x=>x.id===id); if(i) return i; } return null; }
function uniqueModelItemKey(m,base,excludeId=""){
  const root=slug(base||"champ")||"champ",used=new Set((m?.sections||[]).flatMap(s=>s.items||[]).filter(it=>it.id!==excludeId).map(it=>it.cle||slug(it.label)));
  let k=root,n=2;while(used.has(k))k=`${root}_${n++}`;return k;
}
function majFn(cible, el){
  const k=el.dataset.fk;
  let fn=cible.fn;
  if(!fn){ const s=srcItems(curMod()); fn={type:"mult",src:s[0]?(s[0].cle||slug(s[0].label)):"",k:1}; }
  if(k==="type"){
    fn={...fn,type:el.value};
    if(fn.type==="bareme"&&!fn.vals) fn.vals=[];
    if(fn.type==="expr"&&fn.expr===undefined) fn.expr="";
    if(fn.type==="mult"&&fn.k===undefined) fn.k=1;
  }
  else if(k==="src") fn={...fn,src:el.value,vals:fn.type==="bareme"?[]:fn.vals};
  else if(k==="k") fn={...fn,k:+el.value||0};
  else if(k==="expr") fn={...fn,expr:el.value};
  else if(k.startsWith("bar.")){ const i=+k.slice(4); const v=[...(fn.vals||[])]; v[i]=el.value===""?0:+el.value; fn={...fn,vals:v}; }
  cible.fn=fn;
}
let RICH_SAVED_RANGE=null, RICH_SAVED_EDITOR=null;
function rememberRichSelection(t){
  if(!t) return false; const sel=window.getSelection?.();
  if(!sel||!sel.rangeCount) return false; const r=sel.getRangeAt(0);
  if(!t.contains(r.commonAncestorContainer) && r.commonAncestorContainer!==t) return false;
  RICH_SAVED_RANGE=r.cloneRange(); RICH_SAVED_EDITOR=t; return true;
}
function restoreRichSelection(t){
  if(!t||RICH_SAVED_EDITOR!==t||!RICH_SAVED_RANGE) return false;
  const sel=window.getSelection?.(); if(!sel) return false;
  try{ sel.removeAllRanges(); sel.addRange(RICH_SAVED_RANGE.cloneRange()); return true; }catch(e){ return false; }
}
function applyEditorFormat(t,fmt){
  if(!t) return; restoreRichSelection(t); t.focus(); restoreRichSelection(t); try{ document.execCommand("styleWithCSS",false,false); }catch(e){}
  if(fmt==="undo"||fmt==="redo"){ try{document.execCommand(fmt,false,null)}catch(e){} rememberRichSelection(t); return; }
  if(fmt==="clear"){ try{document.execCommand("removeFormat",false,null)}catch(e){} rememberRichSelection(t); return; }
  const cmd=fmt==="bold"?"bold":fmt==="italic"?"italic":fmt==="underline"?"underline":fmt==="bullet"?"insertUnorderedList":fmt==="number"?"insertOrderedList":"formatBlock";
  try{ document.execCommand(cmd,false,fmt==="paragraph"?"p":null); }catch(e){} rememberRichSelection(t);
}
function applyEditorTextStyle(t,style){ if(!t||!style) return false; restoreRichSelection(t); if(style==="normal"){ applyEditorFormat(t,"clear"); return applyEditorFontSize(t,"9.6"); } if(style==="subtitle"){ const ok=applyEditorFontSize(t,"12"); if(ok) applyEditorFormat(t,"bold"); return ok; } if(style==="small") return applyEditorFontSize(t,"8"); return false; }
function applyEditorFontSize(t,size){
  if(!t||!size) return false;
  restoreRichSelection(t); t.focus(); restoreRichSelection(t);
  const sel=window.getSelection?.(); if(!sel||!sel.rangeCount) return false;
  const range=sel.getRangeAt(0);
  if((!t.contains(range.commonAncestorContainer)&&range.commonAncestorContainer!==t)||range.collapsed){
    toast("Sélectionnez le texte dont vous souhaitez modifier la taille."); return false;
  }
  const textNodes=[]; const walker=document.createTreeWalker(t,NodeFilter.SHOW_TEXT); let n;
  while((n=walker.nextNode())){ try{ if(range.intersectsNode(n) && n.nodeValue) textNodes.push(n); }catch(e){} }
  for(let i=textNodes.length-1;i>=0;i--){
    const node=textNodes[i]; let a=0,b=node.nodeValue.length;
    if(node===range.startContainer) a=range.startOffset;
    if(node===range.endContainer) b=range.endOffset;
    if(b<=a) continue;
    const r=document.createRange(); r.setStart(node,a); r.setEnd(node,b);
    const span=document.createElement("span"); span.style.fontSize=`${size}pt`;
    try{ r.surroundContents(span); }catch(e){}
  }
  rememberRichSelection(t); return true;
}
function insertRichText(t,txt){
  if(!t) return; t.focus();
  try{ if(document.execCommand("insertText",false,txt)) return; }catch(e){}
  t.appendChild(document.createTextNode(txt));
}

/* Un menu déroulant se referme dès qu'une de ses entrées est choisie. */
function closeMenuOf(el){ el?.closest?.("details.column-menu")?.removeAttribute("open"); }
/* Le client visé par une action de questionnaire : celui de la fiche
   ouverte, ou celui indiqué explicitement depuis un dossier. */
function questionnaireClientOf(el){
  /* v43 : les deux pièces d'acceptation sont portées par la fiche client.
     Depuis un dossier, la cible est la fiche du client de ce dossier. */
  const depuisDossier=!!el?.dataset?.devis;
  const dev=depuisDossier?st.devis.find(x=>x.id===el.dataset.devis):curDev();
  const id=el?.dataset?.client
    ||(depuisDossier?clientMasterOf(dev)?.id:"")
    ||st.clientViewId||clientMasterOf(dev)?.id||"";
  const c=st.clients.find(x=>x.id===id)||null;
  if(!c) toast("Fiche client introuvable.",true);
  return c?ensureClientInternals(c):null;
}
/* Appel de la fonction « acces-collaborateur » et restitution du mot de passe
   provisoire à l'administrateur. Il n'est affiché qu'ici, dans une fenêtre
   qu'il faut fermer : il n'est jamais enregistré côté application. */
async function accesAppelFonction(corps,titreSucces){
  try{
    const {data,error}=await SB.functions.invoke("acces-collaborateur",{body:corps});
    /* Une erreur métier est renvoyée avec un code HTTP : le SDK la remonte
       comme FunctionsHttpError et le détail utile est dans la réponse. */
    if(error){
      let detail=error.message||String(error);
      try{ const j=await error.context?.json?.(); if(j?.error) detail=j.error; }catch(_){}
      throw new Error(detail);
    }
    if(data?.error) throw new Error(data.error);
    auditGlobal(corps.action==="creer"?"Accès collaborateur créé":"Accès collaborateur réinitialisé",
      `${corps.email}${corps.role?` · ${corps.role}`:""}`,"utilisateur",corps.email);
    modal(titreSucces,`
      <p>${esc(data?.message||"Opération effectuée.")}</p>
      <div class="grid" style="margin-top:12px">
        <label class="f"><span>Adresse e-mail</span><input type="text" value="${esc(data?.email||corps.email)}" readonly></label>
        <label class="f"><span>Mot de passe provisoire</span><input type="text" value="${esc(data?.motDePasseProvisoire||"")}" readonly><div class="hint">Communiquez-le de vive voix ou par un canal distinct de la messagerie. Il est commun à tous les nouveaux accès : tant qu'il n'est pas remplacé, ce compte reste ouvert à quiconque le connaît.</div></label>
      </div>`);
    await loadSupabaseAccess();
    render();
  }catch(e){
    captureAppError(e,"acces.collaborateur");
    toast("Opération impossible : "+(e?.message||e),true);
  }
}
const ACTS = {
  /* questionnaire */
  off(el){ const d=curDev(); if(el.checked) delete d.off[el.dataset.i]; else d.off[el.dataset.i]=true; logAudit(d,el.checked?"Prestation réintégrée":"Prestation masquée",findItem(el.dataset.i)?.label||""); saveDev(); render(); },
  offSec(el){ const d=curDev(); if(el.checked) delete d.offSec[el.dataset.s]; else d.offSec[el.dataset.s]=true; const sec=modOf(d)?.sections.find(x=>x.id===el.dataset.s); logAudit(d,el.checked?"Section réintégrée":"Section masquée",sec?.titre||""); saveDev(); render(); },
  rep(el){ const d=curDev(), it=findItem(el.dataset.i);
    const v=el.type==="number"?(el.value===""?"":+el.value):el.value;
    d.rep[el.dataset.i]=v; logAudit(d,"Réponse modifiée",it?.label||""); saveDev(); render(); },
  repChoice(el){ const d=curDev(), it=findItem(el.dataset.i);
    d.rep[el.dataset.i]=el.dataset.v; logAudit(d,"Réponse modifiée",it?.label||""); saveDev(); render(); },
  repParagraph(){},
  fmtDevis(el){ const d=curDev(), id=el.dataset.i;
    const t=document.querySelector(`[data-rich-devis="${id}"]`); if(!t) return;
    applyEditorFormat(t,el.dataset.fmt); d.rep[id]=packRichText(t.innerHTML); saveDev(); },
  fontSizeDevis(el){ const d=curDev(), id=el.dataset.i, size=el.value;
    const t=document.querySelector(`[data-rich-devis="${id}"]`);
    if(size&&t&&applyEditorFontSize(t,size)){ d.rep[id]=packRichText(t.innerHTML); saveDev(); }
    el.value=""; },
  paragraphReset(el){ const d=curDev(); delete d.rep[el.dataset.i]; logAudit(d,"Texte libre réinitialisé",findItem(el.dataset.i)?.label||""); saveDev(); render(); },
  textStyleDevis(el){ const d=curDev(),id=el.dataset.i,t=document.querySelector(`[data-rich-devis="${id}"]`); if(el.value&&t&&applyEditorTextStyle(t,el.value)){d.rep[id]=packRichText(t.innerHTML);logAudit(d,"Style de texte modifié",findItem(id)?.label||"");saveDev();} el.value=""; },
  previewQuote(){ openQuotePreview(); },
  clauseLibrary(el){ openClauseLibrary(el.dataset.scope||"devis",el.dataset.i||st.itemId); },
  clauseLibraryManage(){ openClauseLibrary("manage",""); },
  async clauseSaveSelection(el){
    if(!canRole("admin")) return;
    const scope=el.dataset.scope||"devis", id=el.dataset.i||st.itemId, t=clauseTargetEditor(scope,id);
    if(!t) return; const html=selectedRichFragment(t);
    if(!html || !html.replace(/<[^>]+>/g,"").trim()){ toast("Sélectionnez d’abord le passage à enregistrer dans la bibliothèque.",true); return; }
    let catDefault="Cabinet";
    if(scope==="model"){ const m=curMod(),sec=m?.sections.find(s=>(s.items||[]).some(i=>i.id===st.itemId)); catDefault=sec?.tag||"Cabinet"; }
    else { const d=curDev(),m=modOf(d),sec=m?.sections.find(s=>(s.items||[]).some(i=>i.id===id)); catDefault=sec?.tag||"Cabinet"; }
    const vals=await askFields("Mémoriser une clause",[{label:"Nom de la clause",value:"Nouvelle clause"},{label:"Catégorie",value:catDefault}],{confirmLabel:"Ajouter à la bibliothèque"});
    if(!vals?.[0]?.trim()) return;
    const [title,cat]=vals;
    const arr=customTextClauses().slice(); arr.push({id:"custom_"+uid(),cat:String(cat||"Cabinet").trim()||"Cabinet",title:title.trim(),tags:"cabinet personnalisée",html:sanitizeRichHTML(html)});
    st.settings.customTextClauses=arr;
    auditGlobal("Clause ajoutée à la bibliothèque",title.trim(),"clause","");
    if(await saveSettings()) toast(`Clause « ${title.trim()} » ajoutée à la bibliothèque du cabinet.`);
  },
  catPrix(el){ const d=curDev(),m=modOf(d),cat=el.dataset.cat,kind=el.dataset.kind; if(!d||!m||!HONOR_CATS.includes(cat)||!["recAn","pon"].includes(kind)) return;
    const h=honorairesParCategorie(d,m), base=kind==="recAn"?h.cats[cat].baseRecAn:h.cats[cat].basePon, v=el.value===""?null:Math.max(0,+el.value||0);
    d.catPrix=d.catPrix||{}; d.catPrix[cat]=d.catPrix[cat]||{};
    if(v===null||Math.abs(v-base)<0.005) delete d.catPrix[cat][kind]; else d.catPrix[cat][kind]=v;
    if(!Object.keys(d.catPrix[cat]).length) delete d.catPrix[cat];
    logAudit(d,"Montant par domaine modifié",`${cat} — ${kind==="recAn"?"annuel":"ponctuel"}`); saveDev(); render(); },
  catPrixMotif(el){ const d=curDev(),cat=el.dataset.cat,kind=el.dataset.kind; if(!d||!HONOR_CATS.includes(cat)||!["recAn","pon"].includes(kind)) return; d.catPrix=d.catPrix||{}; d.catPrix[cat]=d.catPrix[cat]||{}; d.catPrix[cat][commercialReasonKey(kind)]=el.value; logAudit(d,"Motif commercial modifié",cat); saveDev(); },
  catPrixReset(el){ const d=curDev(),cat=el.dataset.cat; if(!d?.catPrix?.[cat]) return; delete d.catPrix[cat]; logAudit(d,"Montant par domaine réinitialisé",cat); saveDev(); render(); },
  prix(el){ const d=curDev(), id=el.dataset.i, it=findItem(id);
    const saisi=el.value===""?"":+el.value;
    const interne=saisi===""?"":montantInterneDepuisAnnuel(saisi,it?.per);
    d.prix[id]={...(d.prix[id]||{}),val:interne}; logAudit(d,"Prix modifié",it?.label||"");
    if(it.type==="prixlibre") d.rep[id]=interne;
    saveDev(); render(); },
  conseil(el){ const d=curDev(); const o=d.prix[el.dataset.i]||{}; delete o.val; d.prix[el.dataset.i]=o; saveDev(); render(); },
  motif(el){ const d=curDev(); d.prix[el.dataset.i]={...(d.prix[el.dataset.i]||{}),motif:el.value}; saveDev(); },
  exc(el){ const d=curDev(); if(el.checked) d.exc[el.dataset.i]=true; else delete d.exc[el.dataset.i]; saveDev(); render(); },
  excPrix(el){ const d=curDev(); d.excPrix=d.excPrix||{}; d.excPrix[el.dataset.i]=el.value===""?"":+el.value; saveDev(); render(); },
  debAdd(){ const d=curDev(); d.deb.push({label:"",prix:0}); saveDev(); render(); },
  debDel(el){ const d=curDev(); d.deb.splice(+el.dataset.i,1); saveDev(); render(); },
  debL(el){ const d=curDev(); d.deb[+el.dataset.i].label=el.value; saveDev(); majLedger(); },
  debP(el){ const d=curDev(); d.deb[+el.dataset.i].prix=+el.value||0; saveDev(); majLedger(); },

  notificationsRefresh(){ render(); },
  /* Notes internes : portées par la fiche client (v37), communes à ses devis. */
  async clientNoteAdd(el){
    const c=st.clients.find(x=>x.id===el.dataset.client), t=document.querySelector("[data-client-note]");
    if(!c||!t||!t.value.trim()) return;
    ensureClientInternals(c);
    c.notes.unshift({id:uid(),at:nowISO(),author:actorName(),text:t.value.trim(),origin:""});
    c.notes=c.notes.slice(0,200); c.maj=today(); c.majAt=nowISO();
    logAudit(c,"Note interne ajoutée",t.value.trim().slice(0,120));
    await saveClients(); render();
  },
  async clientNoteDel(el){
    const c=st.clients.find(x=>x.id===el.dataset.client);
    if(!c) return; ensureClientInternals(c);
    if(!c.notes[+el.dataset.x]) return;
    if(!await askConfirm("Supprimer la note","Supprimer cette note interne ?",{confirmLabel:"Supprimer",danger:true})) return;
    const [x]=c.notes.splice(+el.dataset.x,1);
    c.maj=today(); c.majAt=nowISO();
    logAudit(c,"Note interne supprimée",String(x?.text||"").slice(0,120));
    await saveClients(); render();
  },


  /* v51 — accusé de relance. Ce n'est pas une donnée contractuelle : elle
     reste possible sur un dossier verrouillé, et n'est pas réservée aux
     managers, puisque c'est le collaborateur qui téléphone. */
  async relanceFaite(el){
    const id=el.dataset.id||st.id, d=st.devis.find(x=>x.id===id);
    if(!d){ toast("Dossier introuvable.",true); return; }
    d.relances=Array.isArray(d.relances)?d.relances:[];
    d.relances.push({at:nowISO(),by:actorName()});
    logAudit(d,"Relance client enregistrée",`Relance n° ${d.relances.length} — ${d.client?.raison||""}`);
    await saveDevisCibles([d]); render();
    toast(`Relance enregistrée. ${d.client?.raison||"Le dossier"} ne réapparaîtra qu'au-delà de ${RELANCE_JOURS} jours.`);
  },
  portfolioMine(){st.portFilters.owner=SB_USER?.email||"";enregistrerFiltresPortefeuille();render();},
  portfolioAll(){st.portFilters.owner="";enregistrerFiltresPortefeuille();render();},
  /* v49 — pastilles de filtre : retirer un critère d'un clic, ou tout remettre à plat. */
  filtreRetirer(el){const k=el.dataset.k;if(!(k in FILTRES_DEFAUT))return;st.portFilters[k]=FILTRES_DEFAUT[k];enregistrerFiltresPortefeuille();render();},
  filtresReset(){st.portFilters={...FILTRES_DEFAUT};enregistrerFiltresPortefeuille();render();toast("Filtres remis à zéro.");},
  filtreRetard(){st.portFilters.retard=st.portFilters.retard?"":"1";enregistrerFiltresPortefeuille();render();},
  bulkToggle(el){const id=el.dataset.id;if(el.checked){if(!st.bulkIds.includes(id))st.bulkIds.push(id);}else st.bulkIds=st.bulkIds.filter(x=>x!==id);render();},
  bulkAll(el){const ids=String(el.dataset.ids||"").split(",").filter(Boolean);if(el.checked){st.bulkIds=[...new Set([...st.bulkIds,...ids])];}else st.bulkIds=st.bulkIds.filter(x=>!ids.includes(x));render();},
  bulkClear(){st.bulkIds=[];render();},
  async bulkAssign(){const email=document.querySelector("[data-bulk-owner]")?.value||"";const ds=st.devis.filter(d=>st.bulkIds.includes(d.id));if(!ds.length)return;for(const d of ds){ensureInternalState(d);d.ownerEmail=email;logAudit(d,"Responsable du dossier modifié",email||"Non affecté");}await saveDevisCibles(ds);auditGlobal("Affectation en lot",`${ds.length} dossier(s) → ${email||"Non affecté"}`,"devis","");st.bulkIds=[];render();toast("Responsable appliqué aux dossiers sélectionnés.");},
  async bulkArchive(){const ds=st.devis.filter(d=>st.bulkIds.includes(d.id)),clientIds=[...new Set(ds.map(d=>d.clientId).filter(Boolean))];if(!clientIds.length)return;if(!await askConfirm("Archiver les clients sélectionnés",`Archiver ${clientIds.length} client(s) liés aux dossiers sélectionnés ?`,{confirmLabel:"Archiver"}))return;for(const c of st.clients.filter(c=>clientIds.includes(c.id))){c.archive=true;c.maj=today();c.majAt=nowISO();logAudit(c,"Client archivé","Action en lot");}await saveClients();st.bulkIds=[];render();toast("Clients archivés.");},
  /* v53 : le tableau du chiffre d'affaires s'emporte dans un tableur.
     Point-virgule et BOM : c'est ce qu'Excel en fran\u00e7ais ouvre sans
     \u00e9cran d'import, et les accents y restent lisibles. */
  caExport(){
    const annee=anneeCA(), r=recapCA(annee);
    const q=v=>`"${String(v==null?"":v).replace(/"/g,'""')}"`;
    const nb=v=>String(Math.round(+v||0)).replace(".",",");
    const L=[];
    L.push([q(`Chiffre d'affaires sign\u00e9 \u2014 ${st.cab?.nom||"cabinet"}`),q(`\u00e9dit\u00e9 le ${dateFR(today())}`)].join(";"));
    L.push("");
    L.push(["Cat\u00e9gorie","R\u00e9current HT par an","Ponctuel HT "+annee,"Total HT"].map(q).join(";"));
    for(const c of HONOR_CATS){
      const x=r.cats[c]; if(!(CA_CATS_VISIBLES.includes(c)||x.recAn||x.pon)) continue;
      L.push([q(c),nb(x.recAn),nb(x.pon),nb(x.recAn+x.pon)].join(";"));
    }
    L.push([q("Total"),nb(r.totRec),nb(r.totPon),nb(r.total)].join(";"));
    if(r.fraisTotal) L.push([q("dont frais et d\u00e9bours retir\u00e9s du CA"),q(""),q(""),nb(r.fraisTotal)].join(";"));
    L.push("");
    /* Le d\u00e9tail emporte la ventilation par cat\u00e9gorie : c'est ce qui
       permet de refaire le tableau du haut dans un tableur. */
    L.push(["Client","R\u00e9f\u00e9rence","Sign\u00e9 le","Cat\u00e9gorie","R\u00e9current HT par an","Ponctuel HT","dont frais et d\u00e9bours retir\u00e9s"].map(q).join(";"));
    for(const l of r.lignes){
      const ident=[q(l.d.client?.raison||""),q(l.d.ref||""),q(l.dateSig?dateFR(l.dateSig):"")];
      const nonNul=HONOR_CATS.filter(c=>l.cats[c].recAn||l.cats[c].ponBrut||l.cats[c].frais);
      if(!nonNul.length) L.push([...ident,q(""),nb(0),nb(0),nb(0)].join(";"));
      for(const c of nonNul) L.push([...ident,q(c),nb(l.cats[c].recAn),nb(l.cats[c].pon),nb(l.cats[c].frais)].join(";"));
      L.push([...ident,q("Total du dossier"),nb(l.rec),nb(l.pon),nb(l.frais)].join(";"));
    }
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob(["\ufeff"+L.join("\r\n")],{type:"text/csv;charset=utf-8"}));
    a.download=`chiffre-affaires-${annee}-${today()}.csv`; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1200);
    auditGlobal("Export du chiffre d'affaires",`${r.nbSignes} dossier(s) sign\u00e9(s)`,"ca","");
  },
  bulkExport(){const rows=st.devis.filter(d=>st.bulkIds.includes(d.id));if(!rows.length)return;const data={format:"serre-selection",exporteLe:nowISO(),devis:rows,clients:st.clients.filter(c=>rows.some(d=>d.clientId===c.id))};const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download=`serre-selection-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1200);auditGlobal("Export en lot",`${rows.length} dossier(s)`,"devis","");},

  /* création de dossier */
  async createRneSearch(){
    const q=String(st.create?.query||"").trim();if(q.length<2){toast("Saisissez un SIREN, un SIRET ou une dénomination.",true);return;}const cs=st.create;cs.loading=true;cs.error="";cs.results=[];cs.company=null;cs.clientId="";render();
    try{const base=String(st.ys.proxy||DEFAULT_RENDER_PROXY).replace(/\/$/,""),digits=q.replace(/\D/g,""),exact=digits.length===9||digits.length===14,url=exact?`${base}/api/rne/company/${encodeURIComponent(digits.slice(0,9))}`:`${base}/api/rne/search?q=${encodeURIComponent(q)}&limit=8`,r=await fetch(url,{headers:{Accept:"application/json"}}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.error||`RNE HTTP ${r.status}`);const rows=(Array.isArray(j.results)?j.results:(j.company?[j.company]:[])).filter(Boolean);if(!rows.length){cs.error="Aucune entreprise trouvée.";return;}if(exact||rows.length===1){cs.company=rows[0];cs.query=rows[0].siren||q;}else cs.results=rows;}catch(e){cs.error=e?.message||"Impossible d'interroger le RNE.";}finally{cs.loading=false;render();}
  },
  createRneUse(el){const c=st.create.results[Number(el.dataset.index)];if(!c)return;st.create.company=c;st.create.results=[];st.create.clientId="";st.create.query=c.siren||c.denomination||st.create.query;render();},
  createClientPick(el){st.create.clientId=el.value;st.create.company=null;st.create.results=[];const c=createSelectedClient();if(c)st.create.query=c.siren||c.raison||"";render();},
  createModelPick(el){const m=st.modeles.find(x=>x.id===el.dataset.id);st.create.modelId=el.dataset.id;st.create.markers=defaultMarkersForModel(m);render();},
  createMarkersReset(){const m=createSelectedModel();if(!m)return;st.create.markers=defaultMarkersForModel(m);render();toast("Marqueurs du modèle rétablis.");},
  createMarkerToggle(el){const marker=el.dataset.marker;if(!DEVIS_MARKERS.includes(marker))return;const cur=normalizeDevisMarkers(st.create.markers||[]);st.create.markers=cur.includes(marker)?cur.filter(x=>x!==marker):normalizeDevisMarkers([...cur,marker]);render();},
  async createStart(){
    const m=createSelectedModel();if(!m){toast("Choisissez un modèle de mission.",true);return;}const markers=normalizeDevisMarkers(st.create.markers||[]);if(!markers.length){toast("Choisissez au moins un marqueur.",true);return;}const d=newDevis(m.id),c=createSelectedClient(),company=st.create.company;d.markers=markers;
    if(c){if(c.archive){c.archive=false;c.maj=today();}applyClientToDevis(d,c);syncClientFormToModel(d,m);syncAutomaticQuality(d,false);}
    else if(company){d.client.raison=company.denomination||"";d.client.siren=company.siren||"";d.client.forme=company.formeJuridique||d.client.forme;d.client.adresse=rneAddr(company);d.client.cp=company.adresse?.cp||"";d.client.ville=company.adresse?.ville||"";const sign=applyAutomaticSignatory(d,company,{forceContact:true,forceQuality:true});d.client.rne={source:"RNE / INPI",importedAt:nowISO(),dateCreation:company.dateCreation||"",activite:company.activite||"",codeApe:company.codeApe||"",capital:company.capital??null,deviseCapital:company.deviseCapital||"EUR",siret:company.siret||"",formeJuridiqueCode:company.formeJuridiqueCode||"",dirigeants:Array.isArray(company.dirigeants)?company.dirigeants.slice(0,20):[],signataireAuto:sign?{nom:sign.nom||"",civilite:sign.civilite||"",role:d.client.fonction||""}:null};syncClientFormToModel(d,m);ensureClientForDevis(d,true,true);}
    st.devis.unshift(d);st.id=d.id;st.rne={devId:d.id,query:d.client.siren||d.client.raison||"",loading:false,error:"",results:[],selected:null};st.view="devis1";st.tab="client";rememberTab(d.id,"client");await Promise.all([saveClients(),saveDev()]);render();toast("Dossier créé. Complétez les informations client puis le questionnaire.");
  },

  async devisMarkerToggle(el){const d=curDev();if(!d)return;const marker=el.dataset.marker;if(!DEVIS_MARKERS.includes(marker))return;const cur=dossierMarkers(d,modOf(d));if(cur.includes(marker)&&cur.length===1){toast("Un dossier doit conserver au moins un marqueur.",true);return;}d.markers=cur.includes(marker)?cur.filter(x=>x!==marker):normalizeDevisMarkers([...cur,marker]);logAudit(d,"Marqueurs du dossier modifiés",d.markers.join(", "));await saveDev();render();},

  /* RNE / INPI */
  async rneApplyCompany(c,{silent=false}={}){
    const d=curDev(),m=modOf(d); if(!d||!c) return false;
    const rs=rneStateFor(d);

    /* Si le SIREN existe déjà, on réutilise automatiquement la fiche maître.
       Cela conserve email/téléphone et évite tout doublon sans imposer un clic supplémentaire. */
    const dup=duplicateClientBySiren({siren:c.siren},d.clientId);
    if(dup) applyClientToDevis(d,dup);

    const vals={
      raison:c.denomination||"",
      siren:c.siren||"",
      forme:c.formeJuridique||"",
      adresse:rneAddr(c),
      cp:c.adresse?.cp||"",
      ville:c.adresse?.ville||""
    };
    for(const [k,v] of Object.entries(vals)){
      if(String(v??"").trim()) d.client[k]=v;
    }

    /* Représentant légal : import automatique du meilleur représentant individuel
       publié par le RNE, avec civilité et qualité cohérentes avec la forme sociale. */
    const autoSignataire=applyAutomaticSignatory(d,c,{forceContact:true,forceQuality:true});

    d.client.rne={
      source:"RNE / INPI", importedAt:nowISO(),
      dateCreation:c.dateCreation||"", activite:c.activite||"", codeApe:c.codeApe||"",
      capital:c.capital??null, deviseCapital:c.deviseCapital||"EUR",
      siret:c.siret||"", formeJuridiqueCode:c.formeJuridiqueCode||"",
      dirigeants:Array.isArray(c.dirigeants)?c.dirigeants.slice(0,20):[],
      signataireAuto:autoSignataire?{
        nom:autoSignataire.nom||"",
        civilite:autoSignataire.civilite||d.client.civilite||"",
        role:d.client.fonction||""
      }:null
    };

    syncClientFormToModel(d,m);
    const master=ensureClientForDevis(d,true,true);
    logAudit(d,"Données RNE importées",`${c.denomination||""}${c.siren?` · SIREN ${c.siren}`:""}${autoSignataire?.nom?` · ${autoSignataire.nom}`:""}`);
    await Promise.all([saveClients(),saveDev()]);

    rs.query=d.client.siren||d.client.raison||"";
    rs.results=[];
    rs.selected=null;
    rs.error="";
    if(!silent){
      toast(`RNE importé${master?` · ${master.raison||"client"}`:""}${autoSignataire?.nom?` · représentant : ${autoSignataire.nom} (${d.client.fonction})`:""}.`);
    }
    render();
    return true;
  },
  async rneSearch(){
    const d=curDev(); if(!d) return;
    const rs=rneStateFor(d), q=String(rs.query||"").trim();
    if(q.length<2){ toast("Saisissez un SIREN, un SIRET ou une dénomination.",true); return; }
    if(!String(st.ys.proxy||"").trim()){ toast("Le service Render n'est pas configuré.",true); return; }

    rs.loading=true; rs.error=""; rs.results=[]; rs.selected=null; render();
    try{
      const base=String(st.ys.proxy||DEFAULT_RENDER_PROXY).replace(/\/$/,"");
      const digits=q.replace(/\D/g,"");
      const exact=digits.length===9||digits.length===14;
      const url=exact
        ? `${base}/api/rne/company/${encodeURIComponent(digits.slice(0,9))}`
        : `${base}/api/rne/search?q=${encodeURIComponent(q)}&limit=8`;

      const r=await fetch(url,{headers:{Accept:"application/json"}});
      const j=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(j?.error||`RNE HTTP ${r.status}`);
      const rows=(Array.isArray(j.results)?j.results:(j.company?[j.company]:[])).filter(Boolean);

      if(!rows.length){
        rs.error="Aucune entreprise trouvée pour cette recherche.";
        return;
      }

      /* SIREN/SIRET : le clic sur Rechercher fait directement l'import.
         Recherche par nom : si un seul résultat, import immédiat ; sinon choix d'une ligne. */
      if(exact || rows.length===1){
        rs.loading=false;
        await ACTS.rneApplyCompany(rows[0]);
        return;
      }

      rs.results=rows;
    }catch(e){
      rs.error=e?.message||"Impossible d'interroger le RNE.";
    }finally{
      rs.loading=false;
      render();
    }
  },
  async rneUse(el){
    const d=curDev(),rs=rneStateFor(d),i=Number(el.dataset.index);
    const c=rs.results[i]; if(!c) return;
    rs.loading=true; render();
    try{ await ACTS.rneApplyCompany(c); }
    catch(e){ rs.error=e?.message||"Impossible d'importer cette entreprise."; rs.loading=false; render(); }
  },

  /* interface */
  uiTheme(){try{localStorage.setItem(UI_THEME_STORAGE,uiTheme()==="dark"?"light":"dark");}catch(_){}render();},
  uiDensity(){
    try{ localStorage.setItem(UI_DENSITY_STORAGE,uiDensity()==="compact"?"comfortable":"compact"); }catch(_){}
    render();
  },
  /* v43 : replier ou déployer d'un coup les blocs du portefeuille. */
  portPanels(el){
    const replier=el.dataset.to==="fold";
    const next={}; PORT_PANELS.forEach(([k])=>{ next[k]=!replier; });
    st.portPanels=next; if(replier) st.portClassedOpen=false;
    render();
  },

  /* devis */
  toggleArchives(){ st.showArchived=!st.showArchived; render(); },
  async clientPick(el){
    const d=curDev(); if(!d) return;
    const c=st.clients.find(x=>x.id===(el.dataset.id||el.value));
    if(!c){ d.clientId=""; await saveDev(); render(); return; }
    applyClientToDevis(d,c); syncClientFormToModel(d,modOf(d)); syncAutomaticQuality(d,false); st.rne={devId:d.id,query:d.client.siren||d.client.raison||"",loading:false,error:"",results:[],selected:null}; await saveDev(); render(); toast(`Client ${c.raison||"sélectionné"} repris sur le devis.`);
  },
  /* v52 : la liste deroulante de tous les clients est remplacee par une
     recherche a suggestions — au-dela de quelques dizaines de fiches, une
     liste alphabetique ne se parcourt plus. */
  clientRecherche(el){ st.clientPickQ=el.value; render(); const x=document.querySelector("[data-client-filtre]"); if(x){ x.focus(); x.setSelectionRange(x.value.length,x.value.length); } },
  clientDetacher(){ const d=curDev(); if(!d) return; d.clientId=""; saveDev(); render(); toast("Dossier detache de la fiche client. Les coordonnees saisies restent sur le devis."); },
  async clientArchive(el){
    const id=el.dataset.client||curDev()?.clientId, c=st.clients.find(x=>x.id===id); if(!c) return;
    const to=el.dataset.to==="1";
    if(to && !await askConfirm("Archiver le client",`Archiver le client « ${c.raison||"sans nom"} » ? Il disparaîtra du portefeuille actif mais restera consultable dans les archives.`,{confirmLabel:"Archiver"})) return;
    c.archive=to; c.maj=today(); c.majAt=nowISO(); logAudit(c,to?"Client archivé":"Client réactivé"); await saveClients(); render(); toast(to?"Client archivé. Il reste consultable dans les archives.":"Client réactivé.");
  },
  async clientDeletePermanent(el){
    if(!canRole("manager")){toast("Action réservée à un manager / associé.",true);return;}
    const id=el.dataset.client, c=st.clients.find(x=>x.id===id);
    if(!c?.archive){toast("Seuls les clients archivés peuvent être supprimés définitivement.",true);return;}
    const linkedTrash=x=>(x.type==="client"&&x.data?.id===id)||(x.type==="devis"&&x.data?.clientId===id);
    const dossiers=st.devis.filter(d=>d.clientId===id);
    const trashCount=st.trash.filter(linkedTrash).length;
    if(!await askConfirm("Supprimer définitivement le client",`Supprimer définitivement « ${c.raison||"sans nom"} » ?\n\nLa fiche client, ses notes, ses questionnaires, ${dossiers.length} dossier(s) associé(s) et ${trashCount} élément(s) de la corbeille seront supprimés de SERRE. Cette action est irréversible et ne passe pas par la corbeille.`,{confirmLabel:"Supprimer définitivement",danger:true})) return;
    if(!st.clients.find(x=>x.id===id)?.archive) return;
    let removed=0;
    try{
      // Conserver la fiche jusqu'à confirmation de toutes les suppressions.
      // En cas d'échec partiel, elle reste archivée pour permettre une reprise.
      for(const d of st.devis.filter(d=>d.clientId===id)){
        if(!await S.removeDevisPermanently(d.id)) throw new Error("Enregistrement de la suppression du dossier impossible.");
        st.devis=st.devis.filter(x=>x.id!==d.id); removed++;
        st.bulkIds=st.bulkIds.filter(x=>x!==d.id);
        if(st.id===d.id) st.id=null;
      }
      const nextTrash=st.trash.filter(x=>!linkedTrash(x));
      if(!await S.set(K.trash,JSON.stringify(nextTrash),true)) throw new Error("Suppression des éléments de la corbeille impossible.");
      st.trash=nextTrash;
      const nextClients=st.clients.filter(x=>x.id!==id);
      if(!await S.set(K.cli,JSON.stringify(nextClients),true)) throw new Error("Suppression de la fiche client impossible.");
      st.clients=nextClients;
      if(st.clientViewId===id) st.clientViewId=null;
      if(st.create.clientId===id) st.create={query:"",loading:false,error:"",results:[],company:null,clientId:"",modelId:"",markers:[]};
      st.view="clients"; render(); toast("Client et données associées supprimés définitivement de SERRE.");
    }catch(e){
      render();
      toast(`Suppression incomplète : ${removed} dossier(s) supprimé(s). La fiche reste archivée. ${e.message}`,true);
    }
  },
  async devNewClient(el){const c=st.clients.find(x=>x.id===el.dataset.client);if(!c)return;if(c.archive){c.archive=false;c.maj=today();await saveClients();}nouveauDevis(c.id);},
  devDup(){ const src=curDev(); if(!src) return; const d=JSON.parse(JSON.stringify(src));
    d.id=uid(); d.statut="brouillon"; d.ref=""; d.refLm=""; d.cree=today(); d.maj=today(); d.dateDevis=today();
    d.sign={id:"",statut:"",envoye:"",signe:""}; delete d.frozenAt; delete d.frozenBy; delete d.frozenDocs; delete d.frozenModel; delete d.frozenLetter;
    /* La copie repart d'une page blanche : elle n'hérite ni des versions
       transmises au client, ni du compteur de reprises en main. */
    d.versions=[]; d.reouvertures=0;
    d.manualSign={sent:false,sentDate:"",quoteSigned:false,quoteSignedDate:"",accepted:false,acceptedDate:"",lmSigned:false,lmSignedDate:"",filed:false,filedDate:""};
    delete d.conf; delete d.notes; delete d.internalComments; /* portés par la fiche client */
    st.devis.unshift(d); st.id=d.id; rememberTab(d.id,st.tab||"client");
    logAudit(d,"Devis dupliqué",`Copie de ${src.ref||"brouillon"} créée le ${dateFR(today())}`);
    saveDev(); render(); toast("Copie créée en brouillon, sans référence ni signature."); },
  /* v49 — Reprise en main d'un dossier verrouillé.
     Le motif n'est pas une formalité : c'est lui qui explique, six mois
     plus tard, pourquoi deux versions du même devis circulent. */
  async reprendreLaMain(){
    const d=curDev(); if(!d) return;
    if(!d.frozenAt){ toast("Ce dossier n'est pas verrouillé.",true); return; }
    if(!canRole("manager")){ toast("La reprise en main est réservée à un manager / associé.",true); return; }
    const n=numeroVersion(d);
    const rep=await askFields("Reprendre la main sur le dossier",[
      {label:`Motif de la réouverture de la version ${n}`,type:"textarea",
       placeholder:"Erreur de périmètre, remise accordée après signature, changement de périodicité…"}
    ],{confirmLabel:"Rouvrir le dossier"});
    if(rep===null) return;
    const motif=String(rep[0]||"").trim();
    if(motif.length<5){ toast("Indiquez un motif : il sera conservé au journal du dossier.",true); return; }
    if(!rouvrirDossier(d,motif)) { toast("Reprise en main impossible.",true); return; }
    await saveDev(); render();
    toast(`Dossier rouvert en version ${numeroVersion(d)}. La version ${n} reste archivée et téléchargeable.`);
  },
  /* Téléchargement d'une version archivée, telle qu'elle a été transmise. */
  versionOuvrir(el){
    const d=curDev(); if(!d) return;
    const v=(d.versions||[]).find(x=>x&&String(x.n)===el.dataset.n&&x.type===el.dataset.type);
    if(!v){ toast("Version introuvable.",true); return; }
    const type=el.dataset.doc==="lm"?"lm":"devis";
    const html=thawFrozenHTML(v.docs?.[type]||"");
    if(!html){ toast("Cette version n'a pas conservé ce document.",true); return; }
    const titre=type==="lm"?(v.intituleLm||"Lettre de mission"):(v.intitule||"Devis");
    const page=`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${esc(titre)} — version ${esc(v.n)}</title><style>${docCSS()}</style></head><body>${html}</body></html>`;
    const url=URL.createObjectURL(new Blob([page],{type:"text/html"}));
    const w=window.open(url,"_blank");
    if(!w){ const a=document.createElement("a"); a.href=url; a.download=`${nomFichierSain(titre)} - version ${v.n}.html`; a.click(); }
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    auditGlobal("Version archivée consultée",`${v.ref||d.ref||""} · version ${v.n} · ${type==="lm"?"lettre":"devis"}`,"devis",d.id);
  },
  async devDel(){ const d=curDev(); if(!d)return; if(!await askConfirm("Mettre le devis à la corbeille","Le devis sera retiré du portefeuille mais pourra être restauré depuis Administration > Outils internes.",{confirmLabel:"Mettre à la corbeille",danger:true})) return; const id=d.id; if(!await trashPush("devis",d,d.client?.raison||d.ref||"Devis")){ toast("Mise à la corbeille impossible : rien n'a été supprimé.",true); return; } st.devis=st.devis.filter(x=>x.id!==id); st.id=null; st.view="devis"; await S.removeDevis(id); render(); },
  async devDelList(el){ const id=el.dataset.id, d=st.devis.find(x=>x.id===id); if(!d) return;
    const nom=d.client?.raison?` « ${d.client.raison} »`:"";
    if(!await askConfirm("Mettre le devis à la corbeille",`Retirer ce devis${nom} du portefeuille ? Il restera restaurable depuis les outils internes.`,{confirmLabel:"Mettre à la corbeille",danger:true})) return;
    if(!await trashPush("devis",d,d.client?.raison||d.ref||"Devis")){ toast("Mise à la corbeille impossible : rien n'a été supprimé.",true); return; } st.devis=st.devis.filter(x=>x.id!==id); if(st.id===id) st.id=null;
    await S.removeDevis(id); render(); toast("Devis placé dans la corbeille."); },
  docT(el){ st.docType=el.dataset.t; render(); },
  async valide(){ const d=curDev(), avecLm=hasLettreMission(d);
    if(!d.client.raison){ toast("Renseignez la dénomination du client.",true); return; }
    if(!d.ref || (avecLm&&!d.refLm)){
      let refs=null;
      if(SB && SB_USER){
        try{
          const {data,error}=await SB.rpc("next_references",{p_year:new Date().getFullYear()});
          if(error) throw error;
          const x=Array.isArray(data)?data[0]:data;
          if(x?.devis_ref&&(!avecLm||x?.lm_ref)) refs={devis:x.devis_ref,lm:x.lm_ref||null};
          else throw new Error("référence non retournée");
        }catch(e){
          /* v49.1 : message actionnable. La cause la plus fréquente est
             l'absence de la fonction `next_references` dans le projet
             Supabase — script supabase/sql/v49-numerotation.sql. On ne
             bascule pas sur la numérotation locale : deux postes
             attribueraient la même référence. */
          const absente=/function|not exist|introuvable|404|schema cache/i.test(e.message||"");
          toast(absente
            ? "Numérotation partagée absente de la base : faites exécuter le script v49-numerotation.sql par l'administrateur."
            : "Numérotation partagée indisponible : "+e.message, true);
          return;
        }
      } else if(st.ys.proxy){
        try{ const r=await fetch(st.ys.proxy.replace(/\/$/,"")+"/api/references",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({year:new Date().getFullYear()})});
          const j=await r.json().catch(()=>({})); if(r.ok&&j.devis&&(!avecLm||j.lm)) refs=j; }catch(e){}
      }
      refs=refs||refsLocales();
      if(!d.ref) d.ref=refs.devis;
      if(avecLm && !d.refLm) d.refLm=refs.lm;
    }
    if(!avecLm) d.refLm="";
    if(d.statut==="brouillon") d.statut="genere";
    logAudit(d,"Références attribuées",avecLm?`${d.ref} et ${d.refLm}`:d.ref); await saveDev(); render();
    toast(avecLm?`Références ${d.ref} et ${d.refLm} attribuées. Le dossier reste modifiable jusqu'à la signature.`:`Référence ${d.ref} attribuée. Le dossier reste modifiable jusqu'à la signature.`); },
  /* ------------------------------- questionnaires d'acceptation et LAB */
  qPrint(el){
    closeMenuOf(el);
    const vierge=el.dataset.vierge==="1", kind=el.dataset.q;
    /* Un exemplaire vierge ne dépend d'aucune fiche client. */
    const c=vierge?null:questionnaireClientOf(el);
    if(!vierge&&!c) return;
    const kinds=kind==="both"?["accept","lab"]:[kind];
    $("#print-root").innerHTML=kinds.map(k=>questionnaireDocHTML(k,c,vierge)).join("");
    const titres=kinds.map(k=>QUESTIONNAIRE_DOCS[k]?.titre||k).join(" + ");
    auditGlobal(vierge?"Imprimé vierge généré":"Questionnaire imprimé",`${titres}${c?` · ${c.raison||""}`:""}`,"client",c?.id||"");
    setTimeout(()=>window.print(),60);
  },
  qPreview(el){
    closeMenuOf(el);
    const vierge=el.dataset.vierge==="1";
    const c=vierge?null:questionnaireClientOf(el);
    if(!vierge&&!c) return;
    const kind=el.dataset.q, def=QUESTIONNAIRE_DOCS[kind]||{};
    const modal=document.createElement("div"); modal.className="modal preview-modal";
    modal.innerHTML=`<div class="box"><div class="preview-head"><b>${esc(def.titre||"Questionnaire")} — ${vierge?"exemplaire vierge":esc(c.raison||"Client")}</b><span class="spacer"></span><button class="btn" data-preview-print>Imprimer</button><button class="btn" data-preview-close>Fermer</button></div><div class="html-pane">${questionnaireDocHTML(kind,c,vierge)}</div></div>`;
    document.body.appendChild(modal);
    const close=()=>modal.remove();
    modal.querySelector("[data-preview-close]").onclick=close;
    modal.querySelector("[data-preview-print]").onclick=()=>{ $("#print-root").innerHTML=questionnaireDocHTML(kind,c,vierge); close(); setTimeout(()=>window.print(),60); };
    modal.onclick=e=>{ if(e.target===modal) close(); };
  },
  async qPdf(el){
    closeMenuOf(el);
    const vierge=el.dataset.vierge==="1";
    const c=vierge?null:questionnaireClientOf(el);
    if(!vierge&&!c) return;
    const kind=el.dataset.q, def=QUESTIONNAIRE_DOCS[kind]; if(!def) return;
    const filename=`${questionnaireDocFilename(kind,c,vierge)}.pdf`;
    const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${esc(def.titre)}</title><link rel="stylesheet" href="${DOC_FONTS_HREF}"><style>${pdfCSS()}</style></head><body>${questionnaireDocHTML(kind,c,vierge)}</body></html>`;
    const proxy=String(st.ys.proxy||DEFAULT_RENDER_PROXY).trim()||DEFAULT_RENDER_PROXY;
    try{
      toast("Génération du PDF…");
      const r=await fetch(proxy.replace(/\/$/,"")+"/api/pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({filename,html,document_type:"questionnaire"})});
      if(!r.ok){ const j=await r.json().catch(()=>({})); throw new Error(j.error||`HTTP ${r.status}`); }
      const buf=await r.arrayBuffer();
      if(new TextDecoder("ascii").decode(buf.slice(0,5))!=="%PDF-") throw new Error("réponse non PDF");
      const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([buf],{type:"application/pdf"})); a.download=filename;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),2500);
      auditGlobal(vierge?"Imprimé vierge exporté en PDF":"Questionnaire exporté en PDF",`${def.titre}${c?` · ${c.raison||""}`:""}`,"client",c?.id||"");
      toast(`${filename} téléchargé.`);
    }catch(e){ toast(`PDF indisponible (${e.message}). Utilisez « Imprimer / enregistrer en PDF ».`,true); }
  },
  print(){ const d=curDev(); if(!hasLettreMission(d)) st.docType="devis"; $("#print-root").innerHTML=st.docType==="devis"?devisHTML(d,modOf(d)):lmHTML(d,modOf(d)); setTimeout(()=>window.print(),60); },
  async pdfDevis(){ await downloadPdfDocument("devis"); },
  async pdfLm(){ if(!hasLettreMission(curDev())){ toast("Aucune lettre de mission n’est rattachée à ce devis.",true); return; } await downloadPdfDocument("lm"); },
  async comparePdf(){await openPdfCompare(st.docType==="lm"?"lm":"devis");},
  dl(){ const d=curDev(); if(!hasLettreMission(d)) st.docType="devis";
    const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>${docCSS()}</style></head><body>${st.docType==="devis"?devisHTML(d,modOf(d)):lmHTML(d,modOf(d))}</body></html>`;
    try{ const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([html],{type:"text/html"}));
      a.download=`${nomFichierDocument(d,st.docType==="devis"?"devis":"lm")}.html`; a.click(); URL.revokeObjectURL(a.href);
      toast("Fichier téléchargé. Ouvrez-le puis imprimez en PDF."); }
    catch(e){ toast("Téléchargement bloqué. Utilisez « Imprimer ».",true); } },
  copySignMessage(){const d=curDev();navigator.clipboard?.writeText(signatureMessageFor(d,modOf(d))).then(()=>toast("Message Yousign copié.")).catch(()=>toast("Copie impossible.",true));},
  async manualSignStep(el){
    const d=curDev(); if(!d) return;
    const avecLm=hasLettreMission(d), m=d.manualSign=manualSignState(d.manualSign);
    const step=el.dataset.step, checked=!!el.checked, dt=today();
    /* v49 : un dossier verrouillé ne se déverrouille pas en décochant une
       case de suivi. Revenir en arrière suppose une reprise en main
       explicite, motivée et journalisée. */
    if(d.frozenAt && !checked && ["sent","quoteSigned","lmSigned","filed"].includes(step)){
      toast("Dossier verrouillé : utilisez « Reprendre la main » pour rouvrir le dossier.",true);
      render(); return;
    }
    /* Un document signé sans référence définitive ne peut pas être classé :
       l'instantané porterait la mention « À valider ». */
    if(checked && !d.frozenAt && ["quoteSigned","lmSigned","filed"].includes(step) && (!d.ref||(avecLm&&!d.refLm))){
      toast("Attribuez d'abord les références dans l'onglet « Devis et lettre de mission ».",true);
      render(); return;
    }
    if(step==="sent"){
      /* L'envoi archive une version — il ne verrouille plus rien. */
      if(checked&&!m.sent) enregistrerEnvoi(d);
      m.sent=checked;
      if(checked){ if(!m.sentDate) m.sentDate=dt; }
      else { m.sentDate=""; m.quoteSigned=false; m.quoteSignedDate=""; m.accepted=false; m.acceptedDate=""; m.lmSigned=false; m.lmSignedDate=""; m.filed=false; m.filedDate=""; }
    } else if(step==="quoteSigned"){
      m.quoteSigned=checked;
      if(checked){ m.sent=true; if(!m.sentDate) m.sentDate=dt; if(!m.quoteSignedDate) m.quoteSignedDate=dt; }
      else { m.quoteSignedDate=""; m.accepted=false; m.acceptedDate=""; m.lmSigned=false; m.lmSignedDate=""; m.filed=false; m.filedDate=""; }
    } else if(step==="accepted"){
      m.accepted=checked;
      if(checked){ m.sent=true; m.quoteSigned=true; if(!m.sentDate) m.sentDate=dt; if(!m.quoteSignedDate) m.quoteSignedDate=dt; if(!m.acceptedDate) m.acceptedDate=dt; }
      else { m.acceptedDate=""; m.lmSigned=false; m.lmSignedDate=""; m.filed=false; m.filedDate=""; }
    } else if(step==="lmSigned" && avecLm){
      /* La lettre de mission ne peut être signée qu'après la lettre
         d'acceptation et le questionnaire anti-blanchiment. */
      if(checked && parcoursAcceptation(d) && !(m.accepted && labRempliPour(d))){
        toast(m.accepted?"Complétez d'abord le questionnaire anti-blanchiment de la fiche client.":"La lettre d'acceptation de la mission doit être signée avant la lettre de mission.",true);
        render(); return;
      }
      m.lmSigned=checked;
      if(checked){ m.sent=true; m.quoteSigned=true; if(parcoursAcceptation(d)) m.accepted=true; if(!m.sentDate) m.sentDate=dt; if(!m.quoteSignedDate) m.quoteSignedDate=dt; if(m.accepted&&!m.acceptedDate) m.acceptedDate=dt; if(!m.lmSignedDate) m.lmSignedDate=dt; }
      else { m.lmSignedDate=""; m.filed=false; m.filedDate=""; }
    } else if(step==="filed"){
      if(checked && parcoursAcceptation(d) && !(m.accepted && labRempliPour(d))){
        toast(m.accepted?"Complétez d'abord le questionnaire anti-blanchiment de la fiche client.":"La lettre d'acceptation de la mission doit être signée avant le classement.",true);
        render(); return;
      }
      m.filed=checked;
      if(checked){ m.sent=true; m.quoteSigned=true; if(parcoursAcceptation(d)) m.accepted=true; if(avecLm) m.lmSigned=true; if(!m.sentDate) m.sentDate=dt; if(!m.quoteSignedDate) m.quoteSignedDate=dt; if(m.accepted&&!m.acceptedDate) m.acceptedDate=dt; if(avecLm&&!m.lmSignedDate) m.lmSignedDate=dt; if(!m.filedDate) m.filedDate=dt; }
      else m.filedDate="";
    }
    if(!avecLm){ m.lmSigned=false; m.lmSignedDate=""; }
    /* v49 : le verrou se pose dès que le devis est signé, par quelque
       chemin que ce soit — signature du devis, de la lettre, ou classement
       direct. Avant cela, le dossier reste modifiable. */
    if(!d.frozenAt && (m.quoteSigned||m.lmSigned||m.filed)) freezeDocuments(d);
    if(m.filed) d.statut="classe";
    else if(avecLm&&m.lmSigned) d.statut="signe";
    else if(m.quoteSigned) d.statut=avecLm?"valide":"signe";
    else if(m.sent) d.statut="envoye";
    else if(d.sign?.id){
      d.statut=d.sign.statut==="done"?"signe":d.sign.statut==="declined"?"refuse":d.sign.statut==="expired"?"expire":"envoye";
    } else d.statut=d.ref?"genere":"brouillon";
    logAudit(d,"Suivi de signature modifié",step+" : "+(checked?"oui":"non")); await saveDev(); render();
    const labOk=labRempliPour(d), accReq=parcoursAcceptation(d);
    const msg=m.filed?"Parcours terminé : dossier classé."
      :(avecLm&&m.lmSigned)?"Lettre de mission signée : dossier à classer."
      :(!accReq&&m.quoteSigned)?(avecLm?"Devis signé ou validé : lettre de mission à faire signer.":"Devis signé ou validé : dossier à classer.")
      :(m.accepted&&labOk)?(avecLm?"Acceptation complète : lettre de mission à faire signer.":"Acceptation complète : dossier à classer.")
      :m.accepted?"Lettre d'acceptation signée : reste le questionnaire anti-blanchiment à compléter."
      :m.quoteSigned?"Devis signé ou validé : lettre d'acceptation de la mission à faire signer."
      :m.sent?"Envoi du devis via Yousign enregistré.":"Suivi manuel réinitialisé.";
    toast(msg);
  },
  manuel(){ const d=curDev(); if(!d.frozenAt) freezeDocuments(d); d.statut="signe"; d.sign.signe=today(); logAudit(d,"Devis marqué signé hors ligne"); saveDev(); render(); toast("Devis marqué signé hors ligne."); },
  payload(){ modal("Requête transmise au service interne",`<pre>${esc(JSON.stringify(payload(curDev(),false),null,2))}</pre>`); },
  async ysTemplate(el){st.settings.ysMessageTemplates={...SETTINGS_DEFAULT.ysMessageTemplates,...(st.settings.ysMessageTemplates||{}),[el.dataset.k]:el.value};auditGlobal("Modèle de message Yousign modifié",el.dataset.k,"yousign","");await saveSettings();},
  async ysTest(){ if(!st.ys.proxy){ toast("Renseignez l'URL du service.",true); return; }
    try{ const r=await fetch(st.ys.proxy.replace(/\/$/,"")+"/health/yousign?env="+encodeURIComponent(st.ys.env)); const j=await r.json().catch(()=>({}));
      toast(r.ok?`Service joignable — ${j.env||st.ys.env}.`:`Réponse ${r.status}.`,!r.ok);
    }catch(e){ toast("Service injoignable : vérifiez l'URL, HTTPS et le CORS.",true); } },
  async send(){ const d=curDev();
    if(!st.ys.proxy){ toast("Connecteur non configuré.",true); return; }
    const b=blocagesSignature(d); if(b.length){ toast("Envoi bloqué : "+b[0]+".",true); return; }
    try{ const r=await fetch(st.ys.proxy.replace(/\/$/,"")+"/api/signature-requests",
        {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload(d,true))});
      const j=await r.json(); if(!r.ok) throw new Error(j.error||`HTTP ${r.status}`);
      /* v49 : l'envoi en signature archive une version ; le verrou n'est
         posé qu'au retour signé (voir `statut`). */
      enregistrerEnvoi(d);
      d.sign={id:j.id||"",statut:j.status||"ongoing",envoye:today(),signe:""}; d.statut="envoye"; logAudit(d,"Envoyé en signature",d.client.email||"");
      saveDev(); render(); toast(`Demande transmise à ${d.client.email}.`);
    }catch(e){ toast("Envoi impossible : "+e.message,true); } },
  async statut(){ const d=curDev();
    try{ const r=await fetch(st.ys.proxy.replace(/\/$/,"")+"/api/signature-requests/"+encodeURIComponent(d.sign.id)+"?env="+encodeURIComponent(st.ys.env));
      const j=await r.json(); if(!r.ok) throw new Error(j.error||`HTTP ${r.status}`);
      d.sign.statut=j.status;
      if(j.status==="done"){ d.statut="signe"; d.sign.signe=today(); if(!d.frozenAt) freezeDocuments(d); }
      else if(j.status==="declined") d.statut="refuse"; else if(j.status==="expired") d.statut="expire"; logAudit(d,"Statut Yousign actualisé",j.status);
      saveDev(); render(); toast("Statut Yousign : "+j.status);
    }catch(e){ toast("Statut indisponible : "+e.message,true); } },
  async downloadSigned(){ const d=curDev();
    if(!d.sign.id||d.sign.statut!=="done"){ toast("Les documents ne sont pas encore disponibles en version signée.",true); return; }
    try{
      const u=st.ys.proxy.replace(/\/$/,"")+"/api/signature-requests/"+encodeURIComponent(d.sign.id)+"/documents?env="+encodeURIComponent(st.ys.env)+"&version=completed";
      const r=await fetch(u); if(!r.ok){ const j=await r.json().catch(()=>({})); throw new Error(j.error||`HTTP ${r.status}`); }
      const blob=await r.blob(); const cd=r.headers.get("content-disposition")||"";
      const mm=cd.match(/filename=\"?([^\";]+)\"?/i); const ext=(blob.type||"").includes("zip")?"zip":"pdf";
      const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=mm?mm[1]:`${d.ref||"documents"}-signes.${ext}`; a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),1500); toast("Documents signés téléchargés.");
    }catch(e){ toast("Téléchargement impossible : "+e.message,true); } },
  async settingColor(el){
    const k=el.dataset.k; if(!(k in SETTINGS_DEFAULT)) return;
    st.settings[k]=safeColor(el.value,SETTINGS_DEFAULT[k]); await saveSettings(); render(); toast("Couleur enregistrée.");
  },
  async settingBrandText(el){const k=el.dataset.k;if(!["brandProduct","brandSubtitle","brandLogoUrl","documentTagline"].includes(k))return;st.settings[k]=el.value;await saveSettings();render();},
  async settingBrandColor(el){const k=el.dataset.k;if(!["brandPrimary","brandRail"].includes(k))return;st.settings[k]=safeColor(el.value,SETTINGS_DEFAULT[k]);await saveSettings();render();},
  async settingsReset(){ if(!await askConfirm("Rétablir les couleurs","Rétablir les trois couleurs de mission par défaut ?",{confirmLabel:"Rétablir"})) return; st.settings={...st.settings,missionTraditional:SETTINGS_DEFAULT.missionTraditional,missionPunctual:SETTINGS_DEFAULT.missionPunctual,missionLegal:SETTINGS_DEFAULT.missionLegal}; delete st.settings.userRoles; await saveSettings(); render(); toast("Couleurs par défaut rétablies."); },
  async profileRole(el){
    if(!SB||!ACCESS_BACKEND_READY) return toast("Les rôles Supabase ne sont pas encore configurés.",true);
    const id=el.dataset.id, role=el.value, cur=SB_PROFILES.find(x=>x.id===id); if(!cur) return;
    const otherAdmins=SB_PROFILES.filter(x=>x.id!==id&&x.role==="admin").length;
    if(cur.role==="admin"&&role!=="admin"&&!otherAdmins){ toast("Il doit rester au moins un administrateur.",true); render(); return; }
    const {error}=await SB.from("profiles").update({role,updated_at:new Date().toISOString()}).eq("id",id);
    if(error){ toast("Modification du rôle impossible : "+error.message,true); render(); return; }
    auditGlobal("Rôle utilisateur modifié",`${cur.email||id} : ${cur.role} → ${role}`,"utilisateur",id); await loadSupabaseAccess(); render(); toast("Rôle Supabase mis à jour.");
  },
  /* =================================================================
     v47 — OUVERTURE D'UN ACCÈS COLLABORATEUR
     -----------------------------------------------------------------
     La création d'un compte Supabase exige la clé `service_role`, qui ne
     peut pas vivre dans cette application : son code est public. Tout
     passe donc par la fonction `acces-collaborateur`, qui la détient et
     revérifie côté serveur que l'appelant est bien administrateur.
     ================================================================= */
  async accesCreer(){
    if(!SB||!ACCESS_BACKEND_READY) return toast("Les rôles Supabase ne sont pas encore configurés.",true);
    const vals=await askFields("Ouvrir un accès collaborateur",[
      {label:"Adresse e-mail professionnelle",type:"email",placeholder:"prenom.nom@cabinetserre.fr"},
      {label:"Rôle applicatif",options:[["collaborateur","Collaborateur"],["manager","Manager / associé"],["admin","Administrateur"]],value:"collaborateur"}
    ],{confirmLabel:"Créer le compte"});
    if(!vals) return;
    const [email,role]=vals;
    if(!emailOk(String(email||"").trim())) return toast("Adresse e-mail invalide.",true);
    await accesAppelFonction({action:"creer",email:String(email).trim().toLowerCase(),role},"Compte créé");
  },
  async accesReinit(el){
    if(!SB||!ACCESS_BACKEND_READY) return toast("Les rôles Supabase ne sont pas encore configurés.",true);
    const email=el.dataset.email||"";
    if(!email) return toast("Adresse e-mail inconnue pour ce profil.",true);
    const ok=await askConfirm("Réinitialiser l'accès",
      `Le compte ${email} sera replacé sur le mot de passe provisoire du cabinet. Son mot de passe actuel cessera immédiatement de fonctionner et un nouveau lui sera demandé à la prochaine connexion.`,
      {confirmLabel:"Réinitialiser",danger:true});
    if(!ok) return;
    await accesAppelFonction({action:"reinitialiser",email},"Accès réinitialisé");
  },
  async cabSerre(){
    if(!await askConfirm("Réappliquer les données du cabinet","Réappliquer les informations légales de référence et les coordonnées du site ?",{confirmLabel:"Réappliquer"})) return;
    const garder={rcp:st.cab.rcp,signataire:st.cab.signataire,qualite:st.cab.qualite,ordre:st.cab.ordre,mediateur:st.cab.mediateur,penalites:st.cab.penalites,recouvrement:st.cab.recouvrement,indexation:st.cab.indexation,ecartMax:st.cab.ecartMax};
    st.cab={...CAB_DEF,...garder}; saveCab(); render(); toast("Informations SERRE 2026 réappliquées.");
  },
  async exportData(){
    const data=buildBackupData(),raw=JSON.stringify(data,null,2),hash=await sha256Text(raw);
    data.checksum=hash;const finalRaw=JSON.stringify(data,null,2);
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([finalRaw],{type:"application/json"}));a.download=`serre-sauvegarde-complete-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);auditGlobal("Sauvegarde complète exportée",`${Math.round(finalRaw.length/1024)} Ko · ${st.devis.length} devis`,"sauvegarde","");toast("Sauvegarde complète exportée.");
  },
  async importData(el){
    const f=el.files?.[0];if(!f)return;
    try{
      const raw=await f.text(),data=JSON.parse(raw);
      if(data.format!=="grille-mission"||!Array.isArray(data.modeles)||!Array.isArray(data.lettres)||!Array.isArray(data.devis))throw new Error("format de sauvegarde non reconnu");
      if(data.checksum){
        const copy={...data};delete copy.checksum;const calc=await sha256Text(JSON.stringify(copy,null,2));
        if(calc&&calc!==data.checksum)throw new Error("l'empreinte de la sauvegarde ne correspond pas : fichier potentiellement modifié ou incomplet");
      }
      const incoming=backupSummary(data),current=backupSummary(buildBackupData());
      const msg=`Sauvegarde du ${incoming.date}\n\nÉtat actuel → sauvegarde :\nClients : ${current.clients} → ${incoming.clients}\nDevis : ${current.devis} → ${incoming.devis}\nModèles : ${current.modeles} → ${incoming.modeles}\nLettres : ${current.lettres} → ${incoming.lettres}\nAudit : ${current.audit} → ${incoming.audit}\nCorbeille : ${current.corbeille} → ${incoming.corbeille}\n\nUne sauvegarde de l'état actuel est recommandée avant de poursuivre.`;
      if(!await askConfirm("Aperçu avant restauration",msg,{confirmLabel:"Restaurer cette sauvegarde"})){el.value="";return;}
      st.cab={...CAB_DEF,...(data.cabinet||{})};st.modeles=data.modeles;st.modeles.forEach(normalizeModelUx);st.lettres=data.lettres;st.lettres.forEach(normalizeLetterUx);st.devis=data.devis;st.clients=Array.isArray(data.clients)?data.clients:[];st.settings={...SETTINGS_DEFAULT,...(data.reglages||{})};delete st.settings.userRoles;
      st.auditLog=Array.isArray(data.auditLog)?data.auditLog:[];st.trash=Array.isArray(data.trash)?data.trash:[];st.errorLog=Array.isArray(data.errorLog)?data.errorLog:[];if(data.yousign)st.ys={...st.ys,...data.yousign};
      if(!st.lettres.length)st.lettres=[lettreDef()];
      let importedSerre=st.lettres.find(x=>x.sourceVersion===LM_VERSION&&x.statut==="publie");if(!importedSerre){importedSerre=lettreDef("BIC — SERRE (OEC 2025)");st.lettres.push(importedSerre);}
      if(!st.modeles.length){const m=modeleBIC();m.lmId=importedSerre.id;st.modeles=[m];}
      upgradeCabinetBncToAnnual(importedSerre.id);upgradeCabinetSciPennylaneToAnnual(importedSerre.id);ensureCabinetSourceModels(importedSerre.id);
      const importedBic=st.modeles.find(m=>m.titre==="DEVIS COMPTA BIC");if(importedBic){const linked=st.lettres.find(l=>l.id===importedBic.lmId);if(!linked||/^serre-(?:ldm|oec)/i.test(String(linked.sourceVersion||"")))importedBic.lmId=importedSerre.id;}
      st.devis.forEach(d=>{ensureInternalState(d);d.rep=d.rep||{};d.prix=d.prix||{};d.catPrix=d.catPrix||{};d.off=d.off||{};d.offSec=d.offSec||{};d.exc=d.exc||{};d.excPrix=d.excPrix||{};d.deb=d.deb||[];d.sign={id:"",statut:"",envoye:"",signe:"",...(d.sign||{})};d.manualSign=manualSignState(d.manualSign);d.client={...clientDefaults(),...(d.client||{})};if(d.dateDebutDossier==null)d.dateDebutDossier=d.debut||"";if(d.referentiel==null)d.referentiel=REFERENTIEL_DEFAULT;if(!d.rgpdMode)d.rgpdMode="mixte";if(d.justifSeuilEnabled==null)d.justifSeuilEnabled=false;if(d.justifSeuil==null)d.justifSeuil=100;ensureClientForDevis(d,true,false);d.statut=workflowStatut(d);});
      migrateInternalsToClients();
      preMarquerDeboursModeles();
      st.modId=st.modeles[0]?.id||null;st.lmId=st.lettres[0]?.id||null;st.id=null;st.view="outils";st.toolsTab="backup";st.tab="client";
      await Promise.all([saveCab(),saveMod(),saveLm(),saveClients(),saveSettings(),S.set(K.dev,JSON.stringify(st.devis),true),S.set(K.trash,JSON.stringify(st.trash),true),S.set(K.ys,JSON.stringify(st.ys),true)]);
      if(SB&&SB_USER&&currentRole()==="admin"){
        try{
          if(st.auditLog.length){
            const rows=st.auditLog.slice().reverse().slice(-1000).map(x=>({actor_id:null,actor_email:x.actor||null,action:x.label||"Restauration historique",detail:x.detail||null,entity_type:x.entity||"application",entity_id:x.entityId||null,created_at:x.at||nowISO()}));
            const {error}=await SB.from("serre_audit_log").insert(rows);if(error&&!['42P01','PGRST205'].includes(error.code))throw error;
          }
          if(st.errorLog.length){
            const rows=st.errorLog.slice().reverse().slice(-300).map(x=>({user_id:null,user_email:x.actor||null,context:x.context||"restauration",view_name:x.view||null,devis_id:x.devisId||null,message:x.message||"Erreur importée",stack:x.stack||null,created_at:x.at||nowISO()}));
            const {error}=await SB.from("serre_error_log").insert(rows);if(error&&!['42P01','PGRST205'].includes(error.code))throw error;
          }
        }catch(logErr){captureAppError(logErr,"backup.restore.logs");}
      }else{
        await Promise.all([S.set(K.audit,JSON.stringify(st.auditLog),true),S.set(K.errors,JSON.stringify(st.errorLog),true)]);
      }
      auditGlobal("Sauvegarde restaurée",`Fichier ${f.name} · ${incoming.devis} devis`,"sauvegarde","");render();toast("Sauvegarde restaurée.");
    }catch(e){captureAppError(e,"backup.import");toast("Import impossible : "+e.message,true);}finally{el.value="";}
  },


  /* outils internes */
  /* v52 — navigation liste / éditeur du référentiel, et aperçu de lettre
     sur un dossier fictif jamais enregistré. */
  modListe(){ st.modVue="liste"; render(); },
  modOuvrir(el){ st.modId=el.dataset.id||st.modId; st.modVue="editeur"; st.secId=null; st.itemId=null; render(); },
  /* v53.13 — renommer un modèle sans ouvrir l’éditeur.
     Le titre n’est qu’un libellé : les dossiers pointent sur `modeleId` et
     les migrations livrées reconnaissent les modèles par `sourceVersion`.
     Un modèle renommé n’est donc ni dupliqué ni réinitialisé au
     chargement suivant, et les devis déjà figés gardent leur titre. */
  async modRenommer(el){
    const m=st.modeles.find(x=>x.id===el.dataset.id); if(!m) return;
    const ancien=String(m.titre||"");
    const nom=await askText("Renommer le modèle de devis",
      "Le nouveau nom s’applique immédiatement à la liste, au sélecteur de modèle et aux devis à venir. Les devis déjà figés conservent le nom en vigueur au moment où ils ont été établis.",
      {value:ancien,label:"Nom du modèle",placeholder:"Ex. DEVIS — EMPREINTE CARBONE"});
    if(nom===null) return;
    if(!nom){ toast("Le nom ne peut pas être vide.",true); return; }
    if(nom===ancien) return;
    if(st.modeles.some(x=>x.id!==m.id && normLabel(x.titre)===normLabel(nom))){
      toast("Un autre modèle porte déjà ce nom.",true); return;
    }
    m.titre=nom; m.modifiedAt=nowISO();
    logAudit(m,"Modèle renommé",`${ancien} → ${nom}`);
    saveMod(); render();
  },
  lmListe(){ st.lmVue="liste"; render(); },
  lmOuvrir(el){ st.lmId=el.dataset.id||st.lmId; st.lmVue="editeur"; st.lmBlk="intro"; render(); },
  lmApercu(el){
    const L=st.lettres.find(x=>x.id===el.dataset.id); if(!L){ toast("Lettre introuvable.",true); return; }
    const m=st.modeles.find(x=>x.statut==="publie")||st.modeles[0];
    if(!m){ toast("Aucun modèle disponible pour composer l'aperçu.",true); return; }
    /* Dossier fictif, construit en mémoire et jamais ajouté à st.devis :
       aucune donnée réelle n'est touchée, aucune référence consommée. */
    const faux=JSON.parse(JSON.stringify(newDevis(m.id)));
    faux.id="apercu-"+uid();
    faux.client={...faux.client,raison:"SOCIÉTÉ EXEMPLE",forme:"SAS",siren:"000000000",
      adresse:"1 rue de la Démonstration",cp:"26000",ville:"Valence",
      civilite:"Madame",contact:"Camille EXEMPLE",fonction:"Présidente",
      email:"camille.exemple@exemple.fr",tel:"+33 6 00 00 00 00"};
    faux.ref="DEV-AAAA-0000"; faux.refLm="LM-AAAA-0000";
    faux.dateDevis=today(); faux.debut=today();
    faux.frozenLetter=JSON.parse(JSON.stringify(L));
    let html="";
    try{ html=lmHTML(faux,m); }
    catch(e){ toast("Aperçu impossible : "+e.message,true); return; }
    modal(`Aperçu — ${L.nom} (données fictives)`,
      `<div class="notice" style="margin-bottom:11px">Aperçu composé sur un <b>dossier fictif</b> : société exemple, références AAAA-0000. Aucun dossier réel n'est modifié et aucune référence n'est consommée.</div>
       <div class="apercu-lettre">${html}</div>`);
    auditGlobal("Aperçu de lettre consulté",L.nom||"","lettres",L.id);
  },
  toolsTab(el){st.toolsTab=el.dataset.tab||"health";render();},
  /* v49 — la corbeille était enfouie dans Administration > Outils internes. */
  ouvrirCorbeille(){st.view="outils";st.toolsTab="trash";render();},
  toolOpenDevis(el){st.id=el.dataset.id;st.view="devis1";st.tab=rememberedTab(st.id);render();},
  toolOpenModel(el){st.modId=el.dataset.id;st.view="modeles";st.secId=null;st.itemId=null;render();},
  async healthCheck(){
    st.systemHealth={supabase:{ok:null,detail:"Test…"},rne:{ok:null,detail:"Test…"},yousign:{ok:null,detail:"Test…"},pdf:{ok:null,detail:"Test…"}};render();
    const h={};
    try{const t=performance.now(),{error}=await SB.from("profiles").select("id",{head:true,count:"exact"});if(error)throw error;let logs="";try{const {error:ae}=await SB.from("serre_audit_log").select("id",{head:true,count:"exact"});logs=ae?" · migration v33 à appliquer":" · audit SQL actif";}catch(_){logs=" · migration v33 à vérifier";}h.supabase={ok:true,detail:`Authentification et base joignables · ${Math.round(performance.now()-t)} ms${logs}`};}catch(e){h.supabase={ok:false,detail:"Base indisponible : "+(e?.message||e)};captureAppError(e,"health.supabase");}
    const base=String(st.ys.proxy||DEFAULT_RENDER_PROXY).replace(/\/$/,"");
    try{const t=performance.now(),r=await fetch(base+"/health/rne",{headers:{Accept:"application/json"}}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);h.rne={ok:true,detail:`Connecteur RNE · ${Math.round(performance.now()-t)} ms${j.parser?` · parseur ${j.parser}`:""}`};}catch(e){h.rne={ok:false,detail:"RNE indisponible : "+(e?.message||e)};captureAppError(e,"health.rne");}
    try{const t=performance.now(),r=await fetch(base+"/health/yousign?env="+encodeURIComponent(st.ys.env)),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);h.yousign={ok:true,detail:`Yousign ${j.env||st.ys.env} · ${Math.round(performance.now()-t)} ms`};}catch(e){h.yousign={ok:false,detail:"Yousign indisponible : "+(e?.message||e)};captureAppError(e,"health.yousign");}
    /* v53.5 : le rendu PDF passe par un POST avec un corps JSON, donc par
       une requête préalable CORS — contrairement aux sondes /health, qui
       sont de simples GET. Un service joignable pouvait donc afficher tout
       au vert pendant que « Télécharger en PDF » échouait. On sonde ici le
       point d'entrée réellement utilisé, avec la même méthode. */
    try{
      const t=performance.now();
      const r=await fetch(base+"/api/pdf",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({filename:"diagnostic.pdf",document_type:"diagnostic",
          html:"<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"utf-8\"></head><body>Diagnostic</body></html>"})});
      if(!r.ok){ const j=await r.json().catch(()=>({})); throw new Error(j.error||`HTTP ${r.status}`); }
      const buf=await r.arrayBuffer();
      if(new TextDecoder("ascii").decode(buf.slice(0,5))!=="%PDF-") throw new Error("réponse non PDF");
      h.pdf={ok:true,detail:`Rendu PDF · ${Math.round(performance.now()-t)} ms · ${Math.round(buf.byteLength/1024)} Ko`};
    }catch(e){
      const bloque=/failed to fetch|load failed|networkerror/i.test(String(e.message||""));
      h.pdf={ok:false,detail:bloque
        ? "Requête bloquée avant d'atteindre le service — origine de ce site probablement absente des origines autorisées du service de rendu."
        : String(e.message||"indisponible")};
    }
    st.systemHealth=h;auditGlobal("Diagnostic système exécuté",Object.entries(h).map(([k,v])=>`${k}:${v.ok?"OK":"ERREUR"}`).join(" · "),"systeme","");render();
  },
  async mergeDuplicateGroup(el){
    const siren=el.dataset.siren,g=duplicateClientGroups().find(x=>x.siren===siren);if(!g)return;
    const score=c=>st.devis.filter(d=>d.clientId===c.id).length*100+["raison","forme","adresse","cp","ville","contact","email","tel"].filter(k=>String(c[k]||"").trim()).length;
    const clients=[...g.clients].sort((a,b)=>score(b)-score(a)),primary=clients[0],others=clients.slice(1);
    const dossiersFusionnes=[];
    const msg=`Conserver « ${primary.raison||"Sans nom"} » comme fiche principale et fusionner ${others.length} autre(s) fiche(s) du SIREN ${siren} ?\n\nTous les devis seront rattachés à la fiche principale. Les fiches absorbées seront placées dans la corbeille.`;
    if(!await askConfirm("Fusionner les doublons client",msg,{confirmLabel:"Fusionner"}))return;
    for(const c of others){
      for(const k of ["raison","forme","siren","adresse","cp","ville","civilite","contact","fonction","email","tel"])if(!String(primary[k]||"").trim()&&String(c[k]||"").trim())primary[k]=c[k];
      for(const d of st.devis.filter(d=>d.clientId===c.id)){d.clientId=primary.id;d.client=clientPublicData(primary);logAudit(d,"Fiche client fusionnée",`${c.raison||c.id} → ${primary.raison||primary.id}`);dossiersFusionnes.push(d);}
      if(!await trashPush("client",c,c.raison||`Client ${siren}`)){ toast("Mise à la corbeille impossible : fusion interrompue.",true); return; }
    }
    st.clients=st.clients.filter(c=>!others.some(o=>o.id===c.id));primary.maj=today();primary.majAt=nowISO();logAudit(primary,"Doublons client fusionnés",`${others.length} fiche(s) absorbée(s)`);
    await Promise.all([saveClients(),saveDevisCibles(dossiersFusionnes)]);render();toast("Fusion terminée.");
  },
  async trashRestore(el){
    const i=st.trash.findIndex(x=>x.id===el.dataset.id);if(i<0)return;const x=st.trash[i],d=JSON.parse(JSON.stringify(x.data||{}));
    try{
      if(x.type==="devis"){ensureInternalState(d);if(st.devis.some(z=>z.id===d.id))d.id=uid();st.devis.unshift(d);await S.upsertDevis(d);}
      else if(x.type==="modele"){if(st.modeles.some(z=>z.id===d.id))d.id=uid();st.modeles.push(d);
        /* Restaurer un modèle livré annule son retrait. */
        if(d.sourceVersion && (st.settings.modelesRetires||[]).includes(d.sourceVersion)){
          st.settings.modelesRetires=(st.settings.modelesRetires||[]).filter(v=>v!==d.sourceVersion);
          await saveSettings();
        }
        await S.set(K.mod,JSON.stringify(st.modeles),true);}
      else if(x.type==="lettre"){if(st.lettres.some(z=>z.id===d.id))d.id=uid();st.lettres.push(d);await S.set(K.lm,JSON.stringify(st.lettres),true);}
      else if(x.type==="section"){const m=st.modeles.find(z=>z.id===d.modelId);if(!m)throw new Error("Le modèle d'origine n'existe plus.");delete d.modelId;if(m.sections.some(z=>z.id===d.id))d.id=uid();m.sections.push(d);await S.set(K.mod,JSON.stringify(st.modeles),true);}
      else if(x.type==="prestation"){const m=st.modeles.find(z=>z.id===d.modelId),s=m?.sections.find(z=>z.id===d.sectionId);if(!s)throw new Error("La section d'origine n'existe plus.");delete d.modelId;delete d.sectionId;if(s.items.some(z=>z.id===d.id))d.id=uid();s.items.push(d);await S.set(K.mod,JSON.stringify(st.modeles),true);}
      else if(x.type==="client"){if(st.clients.some(z=>z.id===d.id))d.id=uid();st.clients.push(d);await saveClients();}
      else if(x.type==="clause"){
        if(d.builtin){st.settings.hiddenBuiltinClauseIds=hiddenBuiltinClauseIds().filter(id=>id!==d.id);if(d.modified){const o={...builtinClauseOverrides()};o[d.id]={cat:d.cat,title:d.title,tags:d.tags,html:d.html};st.settings.builtinClauseOverrides=o;}}
        else{const a=customTextClauses().slice();if(!a.some(z=>z.id===d.id))a.push(d);st.settings.customTextClauses=a;}await saveSettings();
      }else throw new Error("Type de corbeille non reconnu.");
      st.trash.splice(i,1);await trashSave();auditGlobal("Élément restauré",x.label||x.type,x.type,d.id||"");render();toast("Élément restauré.");
    }catch(e){captureAppError(e,"trash.restore");toast("Restauration impossible : "+e.message,true);}
  },
  auditExport(){
    const rows=[["Date","Utilisateur","Action","Objet","Identifiant","Détail"],...(st.auditLog||[]).map(x=>[x.at,x.actor,x.label,x.entity,x.entityId,x.detail])];
    const csv=rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(";")).join("\n"),a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download=`serre-audit-${today()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  },
  async errorsClear(){if(!await askConfirm("Vider le journal local","Les erreurs stockées dans l'application seront supprimées. Les éventuelles lignes du journal SQL ne sont pas effacées.",{confirmLabel:"Vider"}))return;st.errorLog=[];await S.set(K.errors,JSON.stringify([]),true);render();},
  async backupSelfTest(){
    try{const data=buildBackupData(),raw=JSON.stringify(data),copy=JSON.parse(raw),sum=backupSummary(copy),hash=await sha256Text(raw);if(copy.format!=="grille-mission"||sum.devis!==st.devis.length)throw new Error("Le contrôle de cohérence a échoué.");auditGlobal("Test de sauvegarde à blanc réussi",`${Math.round(raw.length/1024)} Ko · SHA-256 ${hash.slice(0,16)}…`,"sauvegarde","");modal("Test de sauvegarde réussi",`<div class="notice vert"><b>Export sérialisé et relu correctement.</b></div><table><tr><td>Clients</td><td class="r">${sum.clients}</td></tr><tr><td>Devis</td><td class="r">${sum.devis}</td></tr><tr><td>Modèles</td><td class="r">${sum.modeles}</td></tr><tr><td>Lettres</td><td class="r">${sum.lettres}</td></tr></table><div class="hint">Empreinte SHA-256 : <span class="mono">${hash}</span></div>`);}catch(e){captureAppError(e,"backup.selftest");toast("Test de sauvegarde en échec : "+e.message,true);}
  },


  condSource(el){const node=conditionNode(el.dataset.kind);if(!node)return;const cle=el.value;if(!cle)delete node.showIf;else{const src=curMod().sections.flatMap(s=>s.items||[]).find(it=>(it.cle||slug(it.label))===cle);node.showIf={cle};if(["liste","ouinon"].includes(src?.type))node.showIf.n=[];}logAudit(curMod(),"Condition d'affichage modifiée",conditionHuman(curMod(),node)||"Toujours afficher");saveMod();render();},
  condValue(el){const node=conditionNode(el.dataset.kind);if(!node?.showIf)return;const n=Number(el.dataset.n),arr=Array.isArray(node.showIf.n)?node.showIf.n.map(Number):[];node.showIf.n=el.checked?[...new Set([...arr,n])]:arr.filter(x=>x!==n);logAudit(curMod(),"Condition d'affichage modifiée",conditionHuman(curMod(),node));saveMod();render();},
  condRange(el){const node=conditionNode(el.dataset.kind);if(!node?.showIf)return;const k=el.dataset.k;if(el.value==="")delete node.showIf[k];else node.showIf[k]=Number(el.value);logAudit(curMod(),"Condition d'affichage modifiée",conditionHuman(curMod(),node));saveMod();render();},
  condClear(el){const node=conditionNode(el.dataset.kind);if(!node)return;delete node.showIf;logAudit(curMod(),"Condition d'affichage supprimée",node.titre||node.label||"");saveMod();render();},


  async modelExcelImport(el){
    const f=el.files?.[0];if(!f)return;
    try{
      if(!window.XLSX)throw new Error("Bibliothèque Excel indisponible. Vérifiez la connexion internet puis rechargez la page.");
      const wb=XLSX.read(await f.arrayBuffer(),{type:"array"}),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{defval:""});
      if(!rows.length)throw new Error("Le fichier ne contient aucune ligne exploitable.");
      const vals=await askFields("Importer un modèle depuis Excel",[
        {label:"Titre du modèle",value:f.name.replace(/\.[^.]+$/,"")},
        {label:"Description",value:"Import Excel"},
        {label:"Périodicité par défaut",value:"annuelle",options:PERS},
        {label:"Lettre de mission",value:st.lettres.find(l=>l.sourceVersion===LM_VERSION)?.id||"",options:[["","— aucune —"],...st.lettres.map(l=>[l.id,l.nom])]}
      ],{confirmLabel:"Créer le modèle"});
      if(!vals)return;
      const m=modelFromExcelRows(rows,{title:vals[0],desc:vals[1],per:vals[2],lmId:vals[3]});
      st.modeles.push(m);st.modId=m.id;st.secId=m.sections[0]?.id||null;st.itemId=null;logAudit(m,"Modèle importé depuis Excel",`${rows.length} ligne(s) · ${f.name}`);await saveMod(false);render();toast("Modèle Excel importé en brouillon. Vérifiez les tarifs et les règles avant publication.");
    }catch(e){captureAppError(e,"model.excel");toast("Import Excel impossible : "+e.message,true);}finally{el.value="";}
  },
  modelExcelTemplate(){
    const rows=[["Section","Catégorie","Prestation","Type","Périodicité","Réponse","Prix","TVA","Clé","Texte client","Aide","Condition clé","Condition valeur"],["Présentation","Présentation","Activité","texte","annuelle","","",20,"activite","","","",""],["Comptabilité","Comptabilité","Tenue comptable","liste","annuelle","Par le client",0,20,"tenue","","","",""],["Comptabilité","Comptabilité","Tenue comptable","liste","annuelle","Par le cabinet",1200,20,"tenue","","","",""]];
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";")).join("\n"),a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download="SERRE_modele_import_parametrage.csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  },

  /* modèles */
  modPick(el){ st.modId=el.value; st.secId=null; st.itemId=null; render(); },
  modF(el){ const m=curMod(), k=el.dataset.k;
    m[k]= k==="tva"?+el.value:(k==="lmId"?(el.value||null):el.value); logAudit(m,"Paramètre du modèle modifié",k);
    saveMod(); if(k==="titre"||k==="lmId"||k==="per") render(); },
  /* v47 : changement de la lettre visée par une règle de rattachement
     conditionnel. La condition elle-même reste définie par le modèle. */
  modLmRule(el){ const m=curMod(), i=+el.dataset.i; const r=(m.lmRules||[])[i]; if(!r) return;
    r.lmId=el.value||null;
    logAudit(m,"Lettre de mission conditionnelle modifiée",`Règle ${r.cle}`);
    saveMod(); render(); },
  async modPub(){
    const m=curMod();if(!m||m.statut==="archive")return;
    const errors=modelIssues(m).filter(x=>x.level==="error");if(errors.length){modal("Publication bloquée",`${modelConsistencyHTML(m)}<div class="hint" style="margin-top:10px">Corrigez les erreurs avant de publier le modèle.</div>`);return;}
    if(m.replacesModelId){const old=st.modeles.find(x=>x.id===m.replacesModelId);if(old){old.statut="archive";old.archivedAt=nowISO();logAudit(old,"Modèle remplacé",`Remplacé par ${m.titre}`);}}
    m.statut="publie";m.publishedAt=nowISO();m.modifiedAt=nowISO();logAudit(m,"Modèle publié",m.replacesModelId?"Publication d'une version de test validée":"Publication");await saveMod(false);render();toast("Modèle publié.");
  },
  async modNew(){
    const vals=await askFields("Assistant de création de modèle",[
      {label:"1. Titre du modèle",value:"Nouveau modèle"},
      {label:"2. Description / usage",value:""},
      {label:"3. Périodicité",value:"annuelle",options:PERS},
      {label:"4. Catégorie principale",value:"Comptabilité",options:CATS.map(x=>[x,x])},
      {label:"5. Lettre de mission",value:st.lettres.find(l=>l.sourceVersion===LM_VERSION)?.id||st.lettres[0]?.id||"",options:[["","— aucune —"],...st.lettres.map(l=>[l.id,l.nom])]},
      {label:"6. Première section",value:"Présentation de la mission"},
      {label:"7. Première question / prestation (facultatif)",value:""},
      {label:"8. Type de la première question",value:"texte",options:TYPES}
    ],{confirmLabel:"Créer et ouvrir le modèle"});
    if(!vals?.[0]?.trim())return;
    const [titre,desc,per,cat,lmId,sectionTitle,firstLabel,firstType]=vals,sec=SEC(sectionTitle.trim()||"Présentation",cat||"Comptabilité",[]);
    if(firstLabel?.trim())sec.items.push(I(firstLabel.trim(),firstType||"texte",{cle:slug(firstLabel),per:per||"annuelle",tva:20,prix:!["texte","paragraphe"].includes(firstType)}));
    const m={id:uid(),titre:titre.trim(),desc:desc.trim(),statut:"brouillon",cats:[cat||"Comptabilité"],tva:20,devise:"EUR",per:per||"annuelle",lmId:lmId||null,sections:[sec],exc:[],deb:[],createdAt:nowISO(),modifiedAt:nowISO()};
    st.modeles.push(m);st.modId=m.id;st.secId=sec.id;st.itemId=sec.items[0]?.id||null;logAudit(m,"Modèle créé","Assistant guidé : structure initiale créée");await saveMod(false);render();
  },
  modDraftVersion(){
    const src=curMod();if(!src||src.statut!=="publie")return;
    const m=JSON.parse(JSON.stringify(src));m.id=uid();reId(m);m.statut="brouillon";m.replacesModelId=src.id;m.createdAt=nowISO();m.modifiedAt=nowISO();delete m.publishedAt;delete m.archivedAt;st.modeles.push(m);st.modId=m.id;st.secId=null;st.itemId=null;logAudit(m,"Version de test créée",`À partir de ${src.titre}`);saveMod(false);render();toast("Version de test créée. Les nouveaux dossiers continuent d'utiliser la version publiée tant que vous ne publiez pas celle-ci.");
  },
  modDup(){ const m=JSON.parse(JSON.stringify(curMod())); m.id=uid(); m.titre+=" (copie)"; m.statut="brouillon"; delete m.replacesModelId; delete m.publishedAt; delete m.archivedAt;
    reId(m); st.modeles.push(m); st.modId=m.id; logAudit(m,"Modèle dupliqué","Copie indépendante"); saveMod(); render(); toast("Modèle dupliqué."); },
  async modDel(){ const m=curMod();if(!m)return;if(!await askConfirm("Mettre le modèle à la corbeille","Le modèle sera retiré du référentiel actif. Les dossiers existants conservent leurs données et le modèle pourra être restauré.",{confirmLabel:"Mettre à la corbeille",danger:true})) return;if(!await trashPush("modele",m,m.titre||"Modèle")){ toast("Mise à la corbeille impossible : rien n'a été supprimé.",true); return; }st.modeles=st.modeles.filter(x=>x.id!==m.id);st.modId=st.modeles[0]?.id;
    /* v53.13 : un modèle livré avec l’application et retiré volontairement
       ne doit pas resurgir au chargement suivant. On ne mémorise que le
       retrait ; la restauration depuis la corbeille le rétablit. */
    if(m.sourceVersion===MODEL_CARBONE_VERSION){
      st.settings.modelesRetires=[...new Set([...(st.settings.modelesRetires||[]),m.sourceVersion])];
      saveSettings();
    }
    saveMod();render(); },
  /* v53.14 — dérogation du dossier aux conditions financières du cabinet.
     Cocher recopie le modèle en vigueur pour servir de point de départ ;
     décocher supprime la copie et rend le dossier au modèle. */
  cfDeroger(el){
    const d=curDev(); if(!d) return;
    if(isDevisLocked(d)){ render(); proposerDeblocage(); return; }
    if(el.checked){ d.conditionsFi=conditionsFinancieresModele(); logAudit(d,"Conditions financières","dérogation ouverte sur le dossier"); }
    else { delete d.conditionsFi; logAudit(d,"Conditions financières","retour au modèle du cabinet"); }
    saveDev(); render();
  },
  selSec(el){ st.secId=el.dataset.s; st.itemId=null; render(); },
  selItem(el){ st.secId=el.dataset.s; st.itemId=el.dataset.i; render(); },
  secAdd(){ const m=curMod(); const s=SEC("Nouvelle section","Comptabilité",[]); m.sections.push(s); st.secId=s.id; st.itemId=null; logAudit(m,"Section ajoutée",s.titre); saveMod(); render(); },
  secCollapse(el){ const id=el.dataset.sid; st.modCollapsed[id]=!st.modCollapsed[id]; render(); },
  secDup(el){ const m=curMod(),i=m.sections.findIndex(x=>x.id===el.dataset.sid); if(i<0)return; const original=m.sections[i],s=JSON.parse(JSON.stringify(original)), used=new Set(m.sections.flatMap(x=>x.items.map(it=>it.cle))); const map={}; s.id=uid(); s.titre+=" (copie)"; s.items.forEach((it,j)=>{const old=it.cle||slug(it.label),base=old+"_copie";let k=base,n=2;while(used.has(k))k=base+"_"+(n++);used.add(k);map[old]=k;it.cle=k;it.id=uid();(it.reponses||[]).forEach(r=>r.id=uid());}); const remapFn=fn=>{if(!fn)return;if(fn.src&&map[fn.src])fn.src=map[fn.src];if(fn.type==="expr"&&fn.expr)for(const [a,b] of Object.entries(map))fn.expr=fn.expr.replace(new RegExp(`\b${a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\b`,"g"),b);}; s.items.forEach(it=>{remapFn(it.fn);(it.reponses||[]).forEach(r=>remapFn(r.fn));}); m.sections.splice(i+1,0,s); st.secId=s.id; st.itemId=null; logAudit(m,"Section dupliquée",s.titre); saveMod(); render(); },
  secF(el){ const m=curMod(); const s=m.sections.find(x=>x.id===st.secId); s[el.dataset.k]=el.value; saveMod(); render(); },
  async secDel(){ const m=curMod(),s=m?.sections.find(x=>x.id===st.secId);if(!s)return;if(!await askConfirm("Retirer la section","La section et ses prestations seront placées dans la corbeille.",{confirmLabel:"Retirer",danger:true})) return;if(!await trashPush("section",{...s,modelId:m.id},`${m.titre} — ${s.titre}`)){ toast("Mise à la corbeille impossible : rien n'a été supprimé.",true); return; }m.sections=m.sections.filter(x=>x.id!==st.secId);st.secId=null;st.itemId=null;saveMod();render(); },
  secUp(el){ const m=curMod(), i=+el.dataset.s; if(i<1) return; [m.sections[i-1],m.sections[i]]=[m.sections[i],m.sections[i-1]]; saveMod(); render(); },
  secDown(el){ const m=curMod(), i=+el.dataset.s; if(i>=m.sections.length-1) return; [m.sections[i+1],m.sections[i]]=[m.sections[i],m.sections[i+1]]; saveMod(); render(); },
  itAdd(el){ const m=curMod(); const s=m.sections.find(x=>x.id===el.dataset.s);
    const it=I("Nouvelle prestation","ouinon",{cle:uniqueModelItemKey(m,"nouvelle_prestation"),autoCle:true,per:m.per,tva:m.tva,reponses:[R("Par le client",0),R("Par le cabinet",0)]});
    s.items.push(it); st.secId=s.id; st.itemId=it.id; logAudit(m,"Prestation ajoutée",it.label); saveMod(); render(); },
  itDup(el){ const m=curMod(),s=m.sections.find(x=>x.id===el.dataset.sid); if(!s)return; const i=s.items.findIndex(x=>x.id===el.dataset.iid); if(i<0)return; const it=JSON.parse(JSON.stringify(s.items[i])),used=new Set(m.sections.flatMap(x=>x.items.map(z=>z.cle))),base=(it.cle||slug(it.label))+"_copie";let k=base,n=2;while(used.has(k))k=base+"_"+(n++);it.cle=k;it.id=uid();it.label+=" (copie)";(it.reponses||[]).forEach(r=>r.id=uid());s.items.splice(i+1,0,it);st.secId=s.id;st.itemId=it.id;logAudit(m,"Prestation dupliquée",it.label);saveMod();render(); },
  itF(el){ const it=findItem(st.itemId), k=el.dataset.k, oldType=it.type;
    it[k]= k==="tva"?+el.value:el.value;
    if(k==="cle") it.autoCle=false;
    if(k==="label"&&(it.autoCle||!it.cle||it.cle==="champ"||it.cle==="nouvelle_prestation")){it.cle=uniqueModelItemKey(curMod(),el.value,it.id);it.autoCle=true;}
    if(k==="type"){
      if(el.value==="paragraphe"){
        /* Un paragraphe est toujours un bloc éditorial, jamais une ligne tarifaire. */
        it.prix=false; it.fn=null;
        const responseIds=new Set((it.reponses||[]).map(r=>r.id));
        const touches=[];
        for(const d of st.devis.filter(x=>x.modeleId===curMod().id)){
          d.rep=d.rep||{}; d.prix=d.prix||{}; let change=false;
          if(oldType!=="paragraphe" && Object.prototype.hasOwnProperty.call(d.rep,it.id)){ delete d.rep[it.id]; change=true; }
          else if(responseIds.has(d.rep[it.id])){ delete d.rep[it.id]; change=true; }
          if(Object.prototype.hasOwnProperty.call(d.prix,it.id)){ delete d.prix[it.id]; change=true; }
          if(change) touches.push(d);
        }
        saveDevisCibles(touches);
      } else if(oldType==="paragraphe" && el.value!==oldType){
        /* Une ancienne personnalisation textuelle n'est pas réutilisable comme réponse structurée. */
        const touches=[];
        for(const d of st.devis.filter(x=>x.modeleId===curMod().id)){
          d.rep=d.rep||{}; d.prix=d.prix||{}; let change=false;
          if(Object.prototype.hasOwnProperty.call(d.rep,it.id)){ delete d.rep[it.id]; change=true; }
          if(Object.prototype.hasOwnProperty.call(d.prix,it.id)){ delete d.prix[it.id]; change=true; }
          if(change) touches.push(d);
        }
        saveDevisCibles(touches);
      }
      if(["liste","ouinon"].includes(el.value)&&!it.reponses.length) it.reponses=[R("Par le client",0),R("Par le cabinet",0)];
    }
    saveMod(); render(); },
  itPrix(el){ findItem(st.itemId).prix=el.checked; saveMod(); render(); },
  /* v41 : une prestation tarifée peut être un débours, facturé en sus. */
  itDebours(el){ const it=findItem(st.itemId); it.debours=el.checked; logAudit(curMod(),el.checked?"Prestation marquée débours":"Prestation remise en honoraires",it.label||""); saveMod(); render(); },
  excDebours(el){ const m=curMod(), e=m.exc[+el.dataset.x]; if(!e) return; e.debours=el.checked; logAudit(m,el.checked?"Exceptionnelle marquée débours":"Exceptionnelle remise en honoraires",e.label||""); saveMod(); render(); },
  itFn(el){ majFn(findItem(st.itemId), el); saveMod(); render(); },
  async itDel(){ const m=curMod(),s=m?.sections.find(x=>x.id===st.secId),it=s?.items.find(x=>x.id===st.itemId);if(!it)return;if(!await askConfirm("Retirer la prestation","Cette prestation sera placée dans la corbeille et pourra être restaurée.",{confirmLabel:"Retirer",danger:true})) return;if(!await trashPush("prestation",{...it,modelId:m.id,sectionId:s.id},`${m.titre} — ${it.label}`)){ toast("Mise à la corbeille impossible : rien n'a été supprimé.",true); return; }s.items=s.items.filter(x=>x.id!==st.itemId);st.itemId=null;saveMod();render(); },
  itUp(el){ const s=curMod().sections[+el.dataset.s], i=+el.dataset.x; if(i<1) return;
    [s.items[i-1],s.items[i]]=[s.items[i],s.items[i-1]]; saveMod(); render(); },
  itDown(el){ const s=curMod().sections[+el.dataset.s], i=+el.dataset.x; if(i>=s.items.length-1) return;
    [s.items[i+1],s.items[i]]=[s.items[i],s.items[i+1]]; saveMod(); render(); },
  repAdd(){ findItem(st.itemId).reponses.push(R("Nouvelle réponse",0)); saveMod(); render(); },
  repDel(el){ findItem(st.itemId).reponses.splice(+el.dataset.x,1); saveMod(); render(); },
  repF(el){ const it=findItem(st.itemId), r=it.reponses[+el.dataset.x], k=el.dataset.k;
    r[k]= k==="n"?(el.value===""?null:+el.value) : (k==="val"?(+el.value||0):el.value);
    saveMod(); if(k!=="label") render(); },
  repMode(el){ const it=findItem(st.itemId), r=it.reponses[+el.dataset.x];
    r.mode=el.dataset.m;
    if(r.mode==="fonction"&&!r.fn){ const s=srcItems(curMod(),it.id); r.fn={type:"mult",src:s[0]?(s[0].cle||slug(s[0].label)):"",k:1}; }
    saveMod(); render(); },
  repFn(el){ const it=findItem(st.itemId), r=it.reponses[+el.dataset.x]; majFn(r,el); saveMod(); render(); },
  excAdd(){ const m=curMod(); (m.exc=m.exc||[]).push({id:uid(),label:"Nouvelle prestation",cat:"Comptabilité",prix:0,tva:m.tva,com:""}); saveMod(); render(); },
  excDel(el){ curMod().exc.splice(+el.dataset.x,1); saveMod(); render(); },
  excF(el){ const e=curMod().exc[+el.dataset.x], k=el.dataset.k;
    e[k]=(k==="prix"||k==="tva")?+el.value:el.value; saveMod(); if(k==="tva"||k==="cat") render(); },
  mdebAdd(){ const m=curMod(); (m.deb=m.deb||[]).push({id:uid(),label:"Nouveau débours",prix:0,com:""}); saveMod(); render(); },
  mdebDel(el){ curMod().deb.splice(+el.dataset.x,1); saveMod(); render(); },
  mdebF(el){ const e=curMod().deb[+el.dataset.x]; e[el.dataset.k]= el.dataset.k==="prix"?+el.value:el.value; saveMod(); },
  fmtModel(el){ const t=document.querySelector('[data-rich-model="1"]'); if(!t) return;
    applyEditorFormat(t,el.dataset.fmt); findItem(st.itemId).html=packRichText(t.innerHTML); saveMod(); },
  fontSizeModel(el){ const t=document.querySelector('[data-rich-model="1"]'), size=el.value;
    if(size&&t&&applyEditorFontSize(t,size)){ findItem(st.itemId).html=packRichText(t.innerHTML); saveMod(); }
    el.value=""; },
  textStyleModel(el){ const t=document.querySelector('[data-rich-model="1"]'); if(el.value&&t&&applyEditorTextStyle(t,el.value)){findItem(st.itemId).html=packRichText(t.innerHTML);logAudit(curMod(),"Style de texte modifié",findItem(st.itemId)?.label||"");saveMod();} el.value=""; },
  insVar(el){ const t=document.querySelector('[data-rich-model="1"]'); if(!t) return;
    insertRichText(t,`{{${el.dataset.v}}}`); findItem(st.itemId).html=packRichText(t.innerHTML); saveMod(); },

  /* lettres */
  lmPick(el){ st.lmId=el.value; st.lmBlk="intro"; render(); },
  lmSel(el){ lmLire(); st.lmBlk=el.dataset.k; render(); },
  lmNom(el){ const L=curLm();if(!L||L.statut!=="brouillon")return;L.nom=el.value;L.modifiedAt=nowISO();saveLm(); },
  lmTxt(){ lmLire(); }, lmTit(){ lmLire(); },
  lmTog(el){ const L=curLm();if(!L||L.statut!=="brouillon")return;L.articles[+el.dataset.x].actif=el.checked;L.modifiedAt=nowISO();saveLm(); },
  lmUp(el){ const L=curLm();if(!L||L.statut!=="brouillon")return;lmLire(); const i=+el.dataset.x; if(i<1) return;[L.articles[i-1],L.articles[i]]=[L.articles[i],L.articles[i-1]];L.modifiedAt=nowISO();st.lmBlk="a"+(i-1);saveLm();render(); },
  lmDown(el){ const L=curLm();if(!L||L.statut!=="brouillon")return;lmLire(); const i=+el.dataset.x;if(i>=L.articles.length-1)return;[L.articles[i+1],L.articles[i]]=[L.articles[i],L.articles[i+1]];L.modifiedAt=nowISO();st.lmBlk="a"+(i+1);saveLm();render(); },
  lmAdd(){ const L=curLm();if(!L||L.statut!=="brouillon")return;lmLire();L.articles.push({id:uid(),titre:"Article — intitulé",corps:"Texte.",actif:true});L.modifiedAt=nowISO();st.lmBlk="a"+(L.articles.length-1);saveLm();render(); },
  lmNew(){ const L=lettreDef("Nouvelle lettre");L.statut="brouillon";delete L.publishedAt;L.sourceLabel="Nouvelle lettre en brouillon — base OEC 2025 à adapter";st.lettres.push(L);st.lmId=L.id;st.lmBlk="intro";auditGlobal("Lettre créée en brouillon",L.nom,"lettre",L.id);saveLm();render(); },
  lmSerre(){ lmLire();const L=lettreDef("BIC — SERRE (OEC 2025) — brouillon");L.statut="brouillon";delete L.publishedAt;st.lettres.push(L);st.lmId=L.id;st.lmBlk="intro";auditGlobal("Copie OEC 2025 créée en brouillon",L.nom,"lettre",L.id);saveLm();render();toast("Copie OEC 2025 créée en brouillon. Publiez-la après contrôle."); },
  lmDup(){ lmLire();const src=curLm(),L=JSON.parse(JSON.stringify(src));L.id=uid();L.articles=(L.articles||[]).map(a=>({...a,id:uid()}));L.nom+=" (copie)";L.statut="brouillon";delete L.replacesLetterId;delete L.publishedAt;delete L.archivedAt;L.createdAt=nowISO();L.modifiedAt=nowISO();st.lettres.push(L);st.lmId=L.id;auditGlobal("Lettre dupliquée en brouillon",L.nom,"lettre",L.id);saveLm();render(); },
  lmDraftVersion(){ lmLire();const src=curLm();if(!src||src.statut!=="publie")return;const L=letterCloneForDraft(src);st.lettres.push(L);st.lmId=L.id;st.lmBlk="intro";auditGlobal("Version de test de lettre créée",`À partir de ${src.nom}`,"lettre",L.id);saveLm();render();toast("Version de test créée. Les modèles continuent d'utiliser la lettre publiée."); },
  async lmPub(){ lmLire();const L=curLm();if(!L||L.statut!=="brouillon")return;const empty=[];if(!String(L.nom||"").trim())empty.push("nom");if(!String(L.intro||"").trim())empty.push("préambule");if(!(L.articles||[]).some(a=>a.actif!==false&&String(a.corps||"").trim()))empty.push("article actif");if(empty.length){modal("Publication bloquée",`Complétez : <b>${empty.join(", ")}</b>.`);return;}const old=L.replacesLetterId?st.lettres.find(x=>x.id===L.replacesLetterId):null;L.statut="publie";L.publishedAt=nowISO();L.modifiedAt=nowISO();if(old){old.statut="archive";old.archivedAt=nowISO();for(const m of st.modeles)if(m.lmId===old.id)m.lmId=L.id;}auditGlobal("Lettre publiée",old?`Remplace ${old.nom}`:L.nom,"lettre",L.id);await Promise.all([saveLm(),saveMod(false)]);render();toast("Lettre publiée"+(old?" et modèles rattachés mis à jour.":".")); },
  async lmDel(){ const L=curLm();if(!L)return;const linked=st.modeles.filter(m=>m.lmId===L.id);if(linked.length){modal("Suppression impossible",`Cette lettre est encore rattachée à ${linked.length} modèle(s) :<br><br>${linked.map(m=>`• ${esc(m.titre)}`).join("<br>")}<br><br>Rattachez d'abord ces modèles à une autre lettre.`);return;}if(!await askConfirm("Mettre la lettre à la corbeille","Retirer cette lettre de mission du référentiel actif ?",{confirmLabel:"Mettre à la corbeille",danger:true}))return;if(!await trashPush("lettre",L,L.nom||"Lettre de mission")){ toast("Mise à la corbeille impossible : rien n'a été supprimé.",true); return; }st.lettres=st.lettres.filter(x=>x.id!==st.lmId);st.lmId=st.lettres[0]?.id;saveLm();render(); },
  async lmMajArticles(){
    const L=curLm(); if(!L) return;
    const ecarts=articlesHorsTrame(L); if(!ecarts.length) return;
    const noms=ecarts.map(x=>x.titre).join(" et ");
    if(!await askConfirm("Remplacer par la trame de référence",
      `Les articles suivants seront remplacés par leur rédaction de référence :\n\n${noms}\n\nToute rédaction propre au cabinet sur ces articles sera perdue. Les autres articles ne sont pas touchés.`,
      {confirmLabel:"Remplacer"})) return;
    const ref={}; (lettreDef().articles||[]).forEach(a=>{ ref[a.id]=a.corps; });
    for(const e of ecarts){ const art=L.articles.find(a=>a.id===e.id); if(art&&ref[e.id]!==undefined) art.corps=ref[e.id]; }
    L.modifiedAt=nowISO();
    auditGlobal("Lettre de mission — articles remis à la trame",`${L.nom} · ${noms}`,"lettre",L.id);
    saveLm(); render(); toast(`${ecarts.length} article(s) remis à la trame de référence.`);
  },
  async lmReset(){ const current=curLm();if(!current||current.statut!=="brouillon")return;if(!await askConfirm("Rétablir la trame OEC 2025","Les modifications de cette lettre seront remplacées par la trame OEC 2025.",{confirmLabel:"Rétablir"}))return;const L=current,n=lettreDef(L.nom);L.sourceVersion=LM_VERSION;L.sourceLabel=LM_SOURCE;L.intro=n.intro;L.mentions=n.mentions;L.articles=n.articles;L.modifiedAt=nowISO();saveLm();render(); },
  insVarLm(el){ const L=curLm();if(!L||L.statut!=="brouillon")return;const t=$("#blkTxt");if(!t)return;insertAt(t,`{{${el.dataset.v}}}`);lmLire(); }

};
const curLm = () => st.lettres.find(x=>x.id===st.lmId)||st.lettres[0];
function lmLire(){ const L=curLm(); if(!L) return; const t=$("#blkTxt"); if(!t) return; const ti=$("#blkTit");
  if(st.lmBlk==="intro") L.intro=t.value;
  else if(st.lmBlk==="mentions") L.mentions=t.value;
  else { const a=L.articles[+st.lmBlk.slice(1)]; if(a){ a.corps=t.value; if(ti) a.titre=ti.value; } }
  L.modifiedAt=nowISO();saveLm(); }
function insertAt(t,txt){ const p=t.selectionStart??t.value.length;
  t.value=t.value.slice(0,p)+txt+t.value.slice(t.selectionEnd??p);
  t.focus(); t.setSelectionRange(p+txt.length,p+txt.length); }
function reId(m){ m.sections.forEach(s=>{ s.id=uid(); s.items.forEach(i=>{ i.id=uid(); i.reponses.forEach(r=>r.id=uid()); }); });
  (m.exc||[]).forEach(e=>e.id=uid()); (m.deb||[]).forEach(e=>e.id=uid()); }
