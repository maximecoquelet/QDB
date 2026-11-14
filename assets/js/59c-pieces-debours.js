/* =====================================================================
   v58.15 — PIÈCES DE DÉBOURS
   Dépôt (glisser-déposer ou bouton) des reçus de paiement INPI (guichet
   unique des formalités) et des factures du journal d'annonces légales.
   La pièce est lue dans le navigateur (pdf.js, hébergé avec l'application) :
   elle n'est ni envoyée ni conservée. Seuls sont retenus les montants HT,
   reportés après validation dans les débours de la ligne choisie, et la
   référence de la pièce, pour signaler un second dépôt.
   ===================================================================== */
const PDB = { lib:null, enCours:false };
const PDB_PDFJS = "assets/vendor/pdf-4.10.38.min.js";
const PDB_WORKER = "assets/vendor/pdf.worker-4.10.38.min.js";

async function pdbPdfjs(){
  if(PDB.lib) return PDB.lib;
  const lib=await import(new URL(PDB_PDFJS,location.href).href);
  lib.GlobalWorkerOptions.workerSrc=new URL(PDB_WORKER,location.href).href;
  return PDB.lib=lib;
}

/* Texte de la pièce, ligne par ligne (éléments regroupés par hauteur). */
async function pdbLignes(file){
  const lib=await pdbPdfjs();
  /* isEvalSupported:false — aucune exécution de code issu du PDF. */
  const doc=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,enableXfa:false}).promise;
  const lignes=[];
  try{
    for(let n=1;n<=Math.min(doc.numPages,6);n++){
      const tc=await (await doc.getPage(n)).getTextContent();
      const items=tc.items.filter(i=>i.str&&i.str.trim()).map(i=>({x:i.transform[4],y:i.transform[5],s:i.str,h:Math.abs(i.transform[3])||8}));
      items.sort((a,b)=>b.y-a.y||a.x-b.x);
      const page=[]; let cur=null;
      for(const it of items){
        if(cur&&Math.abs(cur.y-it.y)<=Math.max(2,it.h*0.45)) cur.items.push(it);
        else { cur={y:it.y,items:[it]}; page.push(cur); }
      }
      for(const l of page) lignes.push(l.items.sort((a,b)=>a.x-b.x).map(i=>i.s.trim()).join("  ").trim());
    }
  }finally{ try{ await doc.destroy(); }catch(_){} }
  return lignes;
}

const PDB_MONTANT = "(\\d{1,3}(?:[ \\u00a0\\u202f.]\\d{3})*,\\d{2})";
const pdbNombre = s => { const n=+String(s||"").replace(/[   .]/g,"").replace(",","."); return Number.isFinite(n)?Math.round(n*100)/100:null; };
const pdbDateFr = s => { const m=String(s||"").match(/(\d{2})[\/.](\d{2})[\/.](\d{2,4})/); if(!m) return ""; const a=m[3].length===2?"20"+m[3]:m[3]; return `${a}-${m[2]}-${m[1]}`; };

/* Reçu de paiement INPI : sous-totaux HT soumis et non soumis à TVA. */
function pdbLireInpi(T){
  if(!/RECU DE PAIEMENT/i.test(T)||!/inpi/i.test(T)) return null;
  const g=re=>{ const m=T.match(re); return m?m[1].trim():""; };
  const soc=g(/Désignation de la société\s*:\s*([^\n]+)/i), sm=soc.match(/^(\d{9})\s+(.+)$/);
  const commande=g(/Commande n°\s*(\d+)/i), formalite=g(/Détail de la formalité\s*:\s*(\S+)/i);
  return {
    type:"inpi", libelle:"Reçu INPI (greffe)", cle:"inpi:"+(commande||formalite),
    numero:formalite?`Formalité ${formalite}`:(commande?`Commande ${commande}`:""),
    societe:sm?sm[2]:soc, siren:sm?sm[1]:"",
    reference:g(/Référence Client\s*:\s*([^\n]+)/i),
    date:pdbDateFr(g(/Date d.effet du paiement\s*:\s*(\d{2}\/\d{2}\/\d{4})/i)||g(/le\s+(\d{2}\/\d{2}\/\d{4})/i)),
    montants:{
      debours_greffe_tva:pdbNombre(g(new RegExp("Sous-total soumis à TVA\\s+"+PDB_MONTANT,"i"))),
      debours_greffe_hors_tva:pdbNombre(g(new RegExp("Sous-total non soumis à TVA\\s+"+PDB_MONTANT,"i")))
    }
  };
}

/* Facture du journal d'annonces légales : total HT (frais annexes compris). */
function pdbLireJal(T,L){
  if(!/N°\s*Facture/i.test(T)||!/Parution/i.test(T)||!/TOTAL\s*H\.?\s*T/i.test(T)) return null;
  const num=((T.match(/N°\s*Facture\s*:\s*([\d ]+)/i)||[])[1]||"").replace(/\s/g,"");
  const ht=(T.match(new RegExp("TOTAL\\s*H\\.?\\s*T\\.?\\s+"+PDB_MONTANT,"i"))||[])[1];
  const i=L.findIndex(l=>/^Parution/i.test(l)); let societe="", nature="";
  if(i>=0){ const suite=L.slice(i+1).filter(Boolean); societe=suite[0]||""; nature=(suite[1]||"").replace(/\s+\d[\d\s,.]*$/,"").trim(); }
  const dm=T.match(/Date\s*:\s*(\d{2}\.\d{2}\.\d{2,4})/i);
  return {
    type:"jal", libelle:"Facture JAL", cle:"jal:"+num, numero:num?`Facture ${num}`:"",
    societe, siren:"", reference:nature, date:pdbDateFr(dm?dm[1]:""),
    montants:{ debours_jal:pdbNombre(ht) }
  };
}

async function pdbAnalyser(file){
  try{
    if(!/\.pdf$/i.test(file.name)&&file.type!=="application/pdf") return {fichier:file.name,erreur:"Ce n'est pas un PDF."};
    const L=await pdbLignes(file), T=L.join("\n");
    if(!T.trim()) return {fichier:file.name,erreur:"PDF sans texte (document scanné ?) : saisissez les montants à la main."};
    const p=pdbLireInpi(T)||pdbLireJal(T,L);
    if(!p) return {fichier:file.name,erreur:"Pièce non reconnue (ni reçu INPI, ni facture JAL)."};
    for(const [k,v] of Object.entries(p.montants)) if(!(v>0)) delete p.montants[k];   /* sous-total nul : rien à reporter */
    if(!Object.keys(p.montants).length) return {fichier:file.name,erreur:`${p.libelle} : aucun montant à reporter.`};
    return {fichier:file.name,...p};
  }catch(e){ return {fichier:file.name,erreur:"Lecture impossible : "+(e?.message||e)}; }
}

/* Rapprochement avec les lignes du suivi : SIREN de la fiche client, puis
   nom (forme juridique ignorée), puis type d'opération évoqué par la pièce. */
const PDB_FORMES = /\b(sas|sasu|sarl|eurl|sci|sa|snc|selarl|selas|selafa|scp|scm|sccv|earl|gaec|sc|societe|ste)\b/g;
const pdbNom = s => normClient(s).replace(PDB_FORMES," ").replace(/\s+/g," ").trim();
function pdbCandidats(p){
  const n=pdbNom(p.societe), mots=normClient(p.reference||"").split(" ").filter(w=>w.length>5);
  return fjVisibles().map(l=>{
    const c=fjClientDe(l); let sc=0;
    if(p.siren&&c?.siren&&String(c.siren).replace(/\D/g,"").slice(0,9)===p.siren) sc=100;
    const noms=[pdbNom(l.dossier),pdbNom(c?.raison||"")].filter(Boolean);
    if(n&&noms.includes(n)) sc=Math.max(sc,90);
    else if(n&&n.length>2&&noms.some(x=>x.length>2&&(` ${x} `.includes(` ${n} `)||` ${n} `.includes(` ${x} `)))) sc=Math.max(sc,60);
    if(!sc) return null;
    const t=normClient(`${l.type_operation||""} ${l.mission||""}`);
    if(mots.some(w=>t.includes(w.slice(0,6)))) sc+=8;
    if(fjEtatsDe(l)==="encours") sc+=4;
    return {l,sc};
  }).filter(Boolean).sort((a,b)=>b.sc-a.sc||String(b.l.created_at||"").localeCompare(String(a.l.created_at||"")));
}

const pdbDejaDeposees = () => (FJ.reglages.pieces&&typeof FJ.reglages.pieces==="object")?FJ.reglages.pieces:{};

async function pdbDeposer(fichiers){
  const pdfs=[...(fichiers||[])]; if(!pdfs.length||PDB.enCours) return;
  PDB.enCours=true; toast(`Lecture de ${pdfs.length} pièce(s)…`);
  try{
    const pieces=[];
    for(const f of pdfs) pieces.push(await pdbAnalyser(f));
    pdbFenetre(pieces);
  }finally{ PDB.enCours=false; }
}

function pdbFenetre(pieces){
  const deja=pdbDejaDeposees(), toutes=fjVisibles().slice().sort((a,b)=>String(a.dossier).localeCompare(String(b.dossier),"fr"));
  const libEtat=l=>fjEtatsDe(l)==="facture"?`facturé ${l.mois_facturation?fjMois(l.mois_facturation):""}`:"en cours";
  const optLigne=(l,sel)=>`<option value="${esc(l.id)}" ${sel?"selected":""}>${esc(l.dossier)}${l.type_operation?` — ${esc(l.type_operation)}`:""} (${esc(libEtat(l))})</option>`;
  pieces.forEach((p,i)=>{ p.i=i; if(p.erreur) return; p.cands=pdbCandidats(p); p.ligne=p.cands[0]?.l?.id||""; p.doublon=deja[p.cle]||null; });
  const bloc=p=>{
    if(p.erreur) return `<div class="pdb-piece pdb-ko"><b>${esc(p.fichier)}</b><div class="notice rouge" style="margin-top:6px">${esc(p.erreur)}</div></div>`;
    const ids=new Set(p.cands.map(c=>c.l.id));
    return `<div class="pdb-piece" data-pdb="${p.i}">
      <label class="pdb-tete"><input type="checkbox" data-pdb-ok ${p.doublon||!p.ligne?"":"checked"}> <b>${esc(p.libelle)}</b> · ${esc(p.societe||"société non lue")}${p.siren?` <span class="dim">(${esc(p.siren)})</span>`:""}</label>
      <div class="hint">${esc([p.reference,p.numero,p.date?dateFR(p.date):""].filter(Boolean).join(" · "))} · <span class="dim">${esc(p.fichier)}</span></div>
      ${p.doublon?`<div class="notice" style="margin:6px 0">Pièce déjà déposée le ${esc(dateFR(p.doublon.le||""))}${p.doublon.dossier?` sur « ${esc(p.doublon.dossier)} »`:""}. Cochez-la pour la reporter quand même.</div>`:""}
      <label class="f" style="margin-top:6px"><span>Ligne du suivi</span><select data-pdb-ligne>
        <option value="">— Choisir la ligne —</option>
        ${p.cands.length?`<optgroup label="Correspondances">${p.cands.map(c=>optLigne(c.l,c.l.id===p.ligne)).join("")}</optgroup>`:""}
        <optgroup label="Toutes les lignes">${toutes.filter(l=>!ids.has(l.id)).map(l=>optLigne(l,false)).join("")}</optgroup>
      </select></label>
      ${p.cands.length?"":`<div class="hint" style="color:var(--rouge)">Aucune ligne au nom de « ${esc(p.societe)} » : choisissez-la.</div>`}
      <div class="pdb-montants">${Object.entries(p.montants).filter(([,v])=>v!=null).map(([k,v])=>`<div class="pdb-montant" data-pdb-k="${k}">
        <span>${esc(FJ_DEBOURS.find(([x])=>x===k)?.[1]||k)} — HT</span>
        <input type="number" step="0.01" min="0" data-pdb-v value="${v}">
        <select data-pdb-mode style="width:auto"></select></div>`).join("")}</div>
    </div>`;
  };
  const m=document.createElement("div"); m.className="modal modal-confirm fj-modal";
  const lisibles=pieces.filter(p=>!p.erreur).length;
  m.innerHTML=`<div class="box" style="max-width:760px"><div class="modal-titlebar"><h2>Pièces de débours (${lisibles}/${pieces.length} lue${lisibles>1?"s":""})</h2><button class="modal-x" type="button">×</button></div>
    <div class="modal-content">
      <div class="hint" style="margin-bottom:10px">Montants hors taxes lus sur les pièces. Vérifiez la ligne et les montants, puis validez. Les pièces ne sont pas conservées.</div>
      ${pieces.map(bloc).join("")}
    </div>
    <div class="modal-actions"><button class="btn" data-no>Annuler</button><button class="btn p" data-yes ${lisibles?"":"disabled"}>Reporter dans les débours</button></div></div>`;
  /* Ajouter / remplacer, selon le montant déjà saisi sur la ligne choisie. */
  const majModes=bl=>{
    const l=FJ.lignes.find(x=>x.id===bl.querySelector("[data-pdb-ligne]").value);
    bl.querySelectorAll(".pdb-montant").forEach(z=>{
      const k=z.dataset.pdbK, ex=l?(+l[k]||0):0, v=+z.querySelector("[data-pdb-v]").value||0, sel=z.querySelector("[data-pdb-mode]");
      sel.innerHTML=ex?`<option value="ajouter">Ajouter aux ${esc(eur(ex))} déjà saisis</option><option value="remplacer">Remplacer les ${esc(eur(ex))}</option>`:`<option value="remplacer">Nouveau montant</option>`;
      sel.value=ex&&Math.abs(ex-v)<0.005?"remplacer":(ex?"ajouter":"remplacer");
      sel.disabled=!ex;
    });
  };
  m.querySelectorAll("[data-pdb]").forEach(bl=>{
    majModes(bl);
    bl.querySelector("[data-pdb-ligne]").onchange=()=>{ majModes(bl); if(bl.querySelector("[data-pdb-ligne]").value&&!pieces[+bl.dataset.pdb].doublon) bl.querySelector("[data-pdb-ok]").checked=true; };
  });
  const fermer=()=>m.remove();
  m.querySelector(".modal-x").onclick=fermer; m.querySelector("[data-no]").onclick=fermer;
  m.querySelector("[data-yes]").onclick=async()=>{
    const parLigne=new Map(), retenues=[];
    for(const bl of m.querySelectorAll("[data-pdb]")){
      if(!bl.querySelector("[data-pdb-ok]").checked) continue;
      const p=pieces[+bl.dataset.pdb], id=bl.querySelector("[data-pdb-ligne]").value;
      if(!id){ toast(`Choisissez la ligne du suivi pour « ${p.societe||p.fichier} ».`,true); return; }
      const base=FJ.lignes.find(x=>x.id===id); if(!base) continue;
      const x=parLigne.get(id)||{...base}; parLigne.set(id,x);
      bl.querySelectorAll(".pdb-montant").forEach(z=>{
        const k=z.dataset.pdbK, v=Math.round((+z.querySelector("[data-pdb-v]").value||0)*100)/100;
        x[k]=z.querySelector("[data-pdb-mode]").value==="ajouter"||x.__pdbTouche?.[k]?Math.round(((+x[k]||0)+v)*100)/100:v;
        (x.__pdbTouche||(x.__pdbTouche={}))[k]=true;
      });
      retenues.push({p,dossier:base.dossier,id});
    }
    if(!retenues.length){ toast("Aucune pièce cochée.",true); return; }
    let ok=0;
    for(const x of parLigne.values()){ delete x.__pdbTouche; if(await fjEnregistrer(x)) ok++; }
    const reg={...pdbDejaDeposees()};
    for(const r of retenues) reg[r.p.cle]={le:today(),dossier:r.dossier,ligne:r.id};
    const cles=Object.keys(reg); for(const k of cles.slice(0,Math.max(0,cles.length-1500))) delete reg[k];
    if(FJ.reglagesEnBase) await fjEnregistrerReglage("pieces",reg);
    fermer(); render();
    toast(`${retenues.length} pièce(s) reportée(s) sur ${ok} ligne(s).`);
  };
  document.body.appendChild(m);
}

/* Bouton « Déposer des pièces » et glisser-déposer sur la page Juridique › Facturation. */
function pdbLier(){
  if(st.view!=="juridique"||!FJ.acces) return;
  const input=document.querySelector("[data-pdb-fichiers]");
  document.querySelectorAll("[data-pdb-deposer]").forEach(b=>b.onclick=()=>input?.click());
  if(input) input.onchange=()=>{ const f=[...input.files]; input.value=""; pdbDeposer(f); };
  const zone=document.querySelector(".fj-page"); if(!zone||zone.__pdb) return; zone.__pdb=true;
  const avecFichiers=e=>[...(e.dataTransfer?.types||[])].includes("Files");
  zone.addEventListener("dragover",e=>{ if(!avecFichiers(e)) return; e.preventDefault(); zone.classList.add("pdb-survol"); });
  zone.addEventListener("dragleave",e=>{ if(!zone.contains(e.relatedTarget)) zone.classList.remove("pdb-survol"); });
  zone.addEventListener("drop",e=>{ if(!avecFichiers(e)) return; e.preventDefault(); zone.classList.remove("pdb-survol");
    const f=[...e.dataTransfer.files].filter(x=>/\.pdf$/i.test(x.name)||x.type==="application/pdf");
    if(f.length) pdbDeposer(f); else toast("Déposez des fichiers PDF.",true); });
}
