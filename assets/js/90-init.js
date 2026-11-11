/* ============================================================= départ */
(async function init(){
  if(!SB){ renderLogin("Bibliothèque Supabase indisponible."); return; }
  const {data:sessionData,error:sessionError}=await SB.auth.getSession();
  if(sessionError){ renderLogin(sessionError.message); return; }
  if(!sessionData?.session?.user){ renderLogin(); return; }
  SB_USER=sessionData.session.user;
  await loadSupabaseAccess();
  /* v47 : un compte ouvert par le cabinet démarre sur le mot de passe
     provisoire. Tant qu'il n'a pas été remplacé, rien d'autre ne se charge :
     ni les dossiers, ni les modèles, ni l'identité du cabinet. */
  /* v54 : un lien d'invitation ou de réinitialisation ouvre une session
     sans mot de passe. On impose le choix d'un mot de passe avant tout. */
  if(LIEN_AUTH_TYPE){ renderPasswordSetup(LIEN_AUTH_TYPE); return; }
  if(SB_PROFILE?.must_change_password){ renderPasswordSetup(); return; }
  /* v50 : on interroge d'abord la base sur ce qu'elle sait faire. Tant que
     le script v50 n'a pas été exécuté, l'application fonctionne comme avant
     et le signale aux administrateurs. */
  await detecterCapacites();
  const [cab,mod,lm,dev,cli,reg,ys,audit,trash,errors]=await Promise.all([S.get(K.cab,true),S.get(K.mod,true),S.get(K.lm,true),S.get(K.dev,true),S.get(K.cli,true),S.get(K.reg,true),S.get(K.ys,true),S.get(K.audit,true),S.get(K.trash,true),S.get(K.errors,true)]);
  try{ if(cab) st.cab={...CAB_DEF,...JSON.parse(cab)}; }catch(e){}
  try{ if(mod) st.modeles=JSON.parse(mod)||[]; st.modeles.forEach(normalizeModelUx); }catch(e){}
  try{ if(lm) st.lettres=JSON.parse(lm)||[]; st.lettres.forEach(normalizeLetterUx); }catch(e){}
  try{ if(dev) st.devis=JSON.parse(dev)||[]; st.devis.forEach(ensureInternalState); }catch(e){}
  try{ if(cli) st.clients=JSON.parse(cli)||[]; }catch(e){}
  try{ if(reg) st.settings={...SETTINGS_DEFAULT,...JSON.parse(reg)}; delete st.settings.userRoles; }catch(e){}
  cacheBranding();
  try{ if(ys) st.ys={...st.ys,...JSON.parse(ys)}; }catch(e){}
  try{ if(audit) st.auditLog=JSON.parse(audit)||[]; }catch(e){}
  try{ if(trash) st.trash=JSON.parse(trash)||[]; }catch(e){}
  try{ if(errors) st.errorLog=JSON.parse(errors)||[]; }catch(e){}
  installErrorMonitoring();
  await loadStructuredLogs();
  if(!String(st.ys.proxy||"").trim()) st.ys.proxy=DEFAULT_RENDER_PROXY;
  if(!ys && HAS_LOCAL){
    try{ const localYs=window.localStorage.getItem(K.ys); if(localYs){ st.ys={...st.ys,...JSON.parse(localYs)}; if(!SB_USER||canRole("admin")) await S.set(K.ys,JSON.stringify(st.ys),true); } }catch(e){}
  }
  let mig=false;
  if(!st.lettres.length){ st.lettres=[lettreDef()]; mig=true; }
  for(const L of st.lettres)normalizeLetterUx(L);
  let serreLm=st.lettres.find(x=>x.sourceVersion===LM_VERSION&&x.statut==="publie");
  if(!serreLm){ serreLm=lettreDef("BIC — SERRE (OEC 2025)"); st.lettres.push(serreLm); mig=true; }
  if(!st.modeles.length){ const m=modeleBIC(); m.lmId=serreLm.id; st.modeles=[m]; mig=true; }
  if(upgradeCabinetBncToAnnual(serreLm.id)) mig=true;
  if(upgradeCabinetSciPennylaneToAnnual(serreLm.id)) mig=true;
  if(ensureCabinetSourceModels(serreLm.id)) mig=true;
  /* v53.8 : concordance préavis / résiliation, puis v53.14 : clause de
     révision annuelle à l’article 5, sur les lettres déjà en base. */
  /* v53.15 : la révision des honoraires quitte le devis pour l’article 5. */
  /* v54 : l'identité du cabinet n'est modifiable que par un administrateur
     côté base ; les mises à niveau restent appliquées en mémoire pour les
     autres et sont enregistrées au passage du premier administrateur. */
  if(upgradeConditionsFinancieresSansIndexation()){ mig=true; if(!SB_USER||canRole("admin")) await saveCab(); auditGlobal("Conditions financières du devis","révision des honoraires retirée du devis","cabinet",""); }
  const lmPreavis=upgradeLettresPreavisResiliation();
  if(lmPreavis){ mig=true; auditGlobal("Lettre de mission — articles repris sur la trame",`${lmPreavis} lettre(s) mise(s) à jour`,"lettre",""); }
  /* v47 : trames des missions ponctuelles puis câblage conditionnel du
     modèle « Missions comptables exceptionnelles ». */
  const missionLetters=ensureMissionLetters();
  if(missionLetters.changed) mig=true;
  if(upgradeExceptionnellesToLinkedLetters(missionLetters.byVersion)) mig=true;
  /* v53.13 : modèle « Empreinte carbone », rattaché à sa lettre dédiée. */
  if(ensureEmpreinteCarboneModel(missionLetters.byVersion)) mig=true;
  const bic=st.modeles.find(m=>m.titre==="DEVIS COMPTA BIC");
  if(bic){ const liee=st.lettres.find(l=>l.id===bic.lmId); const serreLegacy=liee&&/^serre-(?:ldm|oec)/i.test(String(liee.sourceVersion||"")); if(!liee||serreLegacy){ if(!liee||liee.sourceVersion!==LM_VERSION){ bic.lmId=serreLm.id; mig=true; } } }
  for(const mm of st.modeles.filter(m=>[MODEL_BNC_VERSION,MODEL_LMNP_VERSION].includes(m.sourceVersion))){
    if(!mm.lmId || !st.lettres.some(l=>l.id===mm.lmId)){ mm.lmId=serreLm.id; mig=true; }
  }
  for(const mm of st.modeles) for(const e of (mm.exc||[])){
    if(!HONOR_CATS.includes(e.cat)){ e.cat=exceptionalCategory(e); mig=true; }
  }

  /* Normalisation éditoriale : un élément de type paragraphe ne doit jamais
     conserver le statut tarifaire d'un ancien type de champ. */
  const paragraphItemsByModel=new Map();
  for(const mm of st.modeles){
    const map=new Map();
    for(const sec of (mm.sections||[])) for(const it of (sec.items||[])){
      if(it.type!=="paragraphe") continue;
      map.set(it.id,it);
      if(it.prix!==false){ it.prix=false; mig=true; }
      if(it.fn){ it.fn=null; mig=true; }
    }
    paragraphItemsByModel.set(mm.id,map);
  }

  /* ======================================================================
     Référentiel de calcul Devizen
     Source principale : Devizen.pdf communiqué par le cabinet.
     Complément : tarifs des déclarations de TVA (27 / 47 / 37 €) communiqués
     séparément par capture, les champs correspondants étant vides dans le PDF.

     Cette migration s'applique une seule fois au modèle canonique
     « DEVIS COMPTA BIC » afin d'aligner aussi les modèles déjà stockés dans le
     navigateur. Les identifiants des questions/réponses sont conservés : les
     devis existants gardent donc leurs sélections.
     ====================================================================== */
  const CALC_VERSION="devizen-2026-08-28-v2-annuel";
  function syncCalcDevizen(m){
    if(!m || m.titre!=="DEVIS COMPTA BIC" || m.calcVersion===CALC_VERSION) return false;
    let ch=false;
    const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
    const put=(o,k,v)=>{ if(!eq(o[k],v)){ o[k]=v; ch=true; } };
    const item=re=>{ for(const sec of (m.sections||[])) for(const it of (sec.items||[])) if(re.test(it.label||"")) return it; return null; };
    const rep=(it,i)=>it&&it.reponses&&it.reponses[i];
    const montant=(it,i,v)=>{ const r=rep(it,i); if(!r) return; put(r,"mode","montant"); put(r,"val",+v||0); put(r,"fn",null); };
    const fonction=(it,i,fn)=>{ const r=rep(it,i); if(!r) return; put(r,"mode","fonction"); put(r,"val",0); put(r,"fn",fn); };
    const bareme=(it,i,src,vals)=>fonction(it,i,{type:"bareme",src,vals:[...vals]});
    const mult=(it,i,src,k)=>fonction(it,i,{type:"mult",src,k});
    const nums=(it,vals)=>{ (it?.reponses||[]).forEach((r,i)=>{ if(i<vals.length) put(r,"n",vals[i]); }); };
    const standard=(it)=>{ if(!it) return; put(it,"per","mensuelle"); put(it,"tva",20); };

    /* Volumétries utilisées comme sources des fonctions. */
    nums(item(/^Chiffre d'affaires annuel en euros$/i),[0,100000,200000,300000,500000,800000,1000000,1500000,3000000,5000000,8000000]);
    nums(item(/^Nombre de factures de vente mensuel$/i),[3,7,15,30,55,85,125,180,0]);
    nums(item(/^Nombre de factures d'achat mensuel$/i),[3,7,15,30,55,85,125,180,0]);
    nums(item(/^Nombre d'opérations de caisse mensuel$/i),[15,30,50,80,0]);
    nums(item(/^Régime fiscal$/i),[0,1]);

    let it;
    it=item(/^Enregistrement des factures de vente$/i); standard(it);
    montant(it,0,0); bareme(it,1,"fv",[3,7,14,28,49,72,105,140,0]); bareme(it,2,"fv",[7,14,28,56,98,112,157,253,0]); montant(it,3,0); montant(it,4,0);

    it=item(/^Pointage et révision des comptes clients$/i); standard(it);
    montant(it,0,0); bareme(it,1,"fv",[4,9,17,37,68,85,127,187,0]);

    it=item(/^Enregistrement des factures d'achat$/i); standard(it);
    montant(it,0,0); bareme(it,1,"fa",[3,7,15,28,49,72,105,140,0]); bareme(it,2,"fa",[7,14,28,56,98,112,157,253,0]); montant(it,3,0); montant(it,4,0);

    it=item(/^Pointage et révision des comptes fournisseurs$/i); standard(it);
    montant(it,0,0); bareme(it,1,"fa",[4,9,17,37,68,85,127,187,0]);

    it=item(/^Enregistrement de la banque$/i); standard(it);
    montant(it,0,0); mult(it,1,"pages_banque",9.5); mult(it,2,"pages_banque",18.5); mult(it,3,"pages_banque",8.5); montant(it,4,0);

    it=item(/^Enregistrement de la caisse$/i); standard(it);
    montant(it,0,0); bareme(it,1,"caisse",[7,8,10,13,0]); bareme(it,2,"caisse",[20,25,30,35,0]); montant(it,3,0); montant(it,4,0); montant(it,5,0);

    it=item(/^Gestion des TNS$/i); standard(it); montant(it,0,0); montant(it,1,15);

    /* Complément tarifaire communiqué par capture : le PDF Devizen laisse ces champs vides. */
    it=item(/^Établissement des déclarations de TVA$/i); standard(it);
    montant(it,0,0); montant(it,1,0); montant(it,2,27); montant(it,3,47); montant(it,4,37); montant(it,5,0);

    it=item(/^TVA sur les débits ou sur les encaissements$/i); standard(it); montant(it,0,0); montant(it,1,17);

    it=item(/^Création, révision et édition des comptes annuels$/i); standard(it);
    montant(it,0,0); bareme(it,1,"ca",[0,57,74,86,108,139,147,179,197,219,250]); bareme(it,2,"ca",[0,47,57,74,86,108,139,147,179,197,219]);

    it=item(/^Accès à DEXT$/i); standard(it); montant(it,0,0); montant(it,1,0);
    it=item(/^Accès à Pennylane$/i); standard(it); montant(it,0,0); montant(it,1,10);
    it=item(/^Accès à Mon Expert en Gestion$/i); standard(it); montant(it,0,0); montant(it,1,20);
    it=item(/^Accès à iSuite de ACD$/i); standard(it); montant(it,0,0); montant(it,1,35);

    it=item(/^Établissement des fiches de paie$/i); standard(it);
    montant(it,0,0); mult(it,1,"effectif",30); mult(it,2,"effectif",20); mult(it,3,"effectif",18);
    it=item(/^Établissement des charges sociales \(DSN\)$/i); standard(it); montant(it,0,0);
    it=item(/^Gestion du prélèvement à la source$/i); standard(it); montant(it,0,0);
    it=item(/^Coffre-fort électronique$/i); standard(it); mult(it,0,"effectif",2); montant(it,1,0);
    it=item(/^Paie assistée : formule « Liberté »$/i); standard(it); montant(it,0,0); mult(it,1,"effectif",8);
    it=item(/^Paie assistée : formule « Confort »$/i); standard(it); montant(it,0,0); mult(it,1,"effectif",14);
    it=item(/^Mise à disposition SILAE$/i); standard(it); montant(it,0,0); mult(it,1,"effectif",5);
    it=item(/^Hotline sociale$/i); standard(it); montant(it,0,0); montant(it,1,27);

    it=item(/^Secrétariat juridique annuel$/i); standard(it); if(it) put(it,"per","annuelle");
    montant(it,0,0); bareme(it,1,"forme",[0,0,500,500,500,500,500,500,500,500]);
    for(const re of [/^Assistance à convocation et préparation des assemblées$/i,/^Réalisation des formalités de publicité annuelle$/i,/^Mise à jour des registres obligatoires$/i,/^Assistance à l'assemblée générale$/i]){
      it=item(re); standard(it); montant(it,0,0); montant(it,1,0);
    }

    /* Prestations exceptionnelles : montants ponctuels HT du référentiel. */
    const ex=[
      [/^Frais de paramétrage dossier comptable$/i,300],
      [/^Frais de paramétrage dossier social$/i,250],
      [/^Frais de paramétrage dossier juridique$/i,240],
      [/^Choix du statut juridique de l'entreprise$/i,840],
      [/^Statut du conjoint collaborateur$/i,730],
      [/^Création de la SASU, EURL$/i,900],
      [/^Création de la SAS, SARL$/i,1100],
      [/^Création de la SA$/i,1550],
      [/^Établissement du budget prévisionnel$/i,850],
      [/^Accompagnement à la banque$/i,350]
    ];
    for(const e of (m.exc||[])){
      const x=ex.find(([re])=>re.test(e.label||""));
      if(x){ put(e,"prix",x[1]); put(e,"tva",20); }
    }

    put(m,"tva",20); put(m,"per","mensuelle"); put(m,"devise","EUR");
    put(m,"calcSource","Devizen.pdf + tarifs TVA communiqués par capture");
    put(m,"calcVersion",CALC_VERSION);
    return ch;
  }
  if(syncCalcDevizen(bic)){ mig=true; }

  /* Correctif de compatibilité des anciens modèles : le secrétariat juridique
     annuel était historiquement stocké à 41,67 € (équivalent mensuel de 500 €)
     alors que sa périodicité pouvait déjà être « annuelle ». Cela produisait
     41,67 € / an et un faux écart de +1100 % lorsqu'on saisissait 500 €.
     On corrige uniquement cette signature tarifaire historique, sans écraser
     les tarifs personnalisés du cabinet. */
  const ANNUAL_LEGACY_FIX_VERSION="annual-pricing-2026-08-28-v3";
  let annualLegacyDevisChanged=false;
  function syncLegacyAnnualPricing(m){
    if(!m || m.annualPricingVersion===ANNUAL_LEGACY_FIX_VERSION) return false;
    let changed=false;
    const near=(a,b,tol=.06)=>Number.isFinite(+a)&&Math.abs((+a)-b)<=tol;
    const normalize500=v=>near(v,41.67)||near(v,41.6666667);
    for(const sec of (m.sections||[])){
      for(const it of (sec.items||[])){
        if(normLabel(it.label)!=="secretariat juridique annuel") continue;
        const oldPer=it.per;
        let legacy=false;
        for(const r of (it.reponses||[])){
          if(r.mode==="fonction" && r.fn?.type==="bareme" && r.fn.src==="forme"){
            const vals=[...(r.fn.vals||[])];
            if(vals.some(v=>normalize500(v))){
              r.fn={...r.fn,vals:vals.map(v=>normalize500(v)?500:v)};
              legacy=true; changed=true;
            }
          }else if(r.mode!=="fonction" && normalize500(r.val)){
            r.val=500; legacy=true; changed=true;
          }
        }
        /* Le libellé désigne explicitement un forfait annuel : on ne change la
           périodicité que si l'on a reconnu l'ancien tarif 41,67 €. */
        if(legacy && oldPer!=="annuelle"){
          it.per="annuelle"; changed=true;
          /* Les prix forcés des devis étaient alors stockés en base mensuelle.
             On les annualise une seule fois pour conserver le montant visible. */
          for(const d of (st.devis||[])){
            if(d.modeleId!==m.id) continue;
            const o=d.prix&&d.prix[it.id];
            if(o && o.val!=="" && o.val!==undefined && o.val!==null && Number.isFinite(+o.val)){
              o.val=Math.round((+o.val)*12*100)/100;
              annualLegacyDevisChanged=true;
            }
          }
        }
      }
    }
    if(m.annualPricingVersion!==ANNUAL_LEGACY_FIX_VERSION){ m.annualPricingVersion=ANNUAL_LEGACY_FIX_VERSION; changed=true; }
    return changed;
  }
  for(const mm of st.modeles){ if(syncLegacyAnnualPricing(mm)) mig=true; }

  const EXPERTISE_VISUAL_VERSION="expertise-visual-2026-08-28-v2";
  function syncExpertiseVisual(m){
    if(!m || m.expertiseVisualVersion===EXPERTISE_VISUAL_VERSION) return false;
    let changed=false;
    for(const sec of (m.sections||[])){
      for(const it of (sec.items||[])){
        if(!isExpertiseItem(sec,it)) continue;
        it.type="paragraphe";
        it.prix=false;
        it.html=`<div class="expertise-visual"><img src="{{asset.expertise}}" alt="Tenue de la comptabilité ; gestion de la paie avec un partenaire spécialisé ; gestion du juridique et conseil en structuration ; consolidation et reporting ; conseil et formation en gestion"></div>`;
        changed=true;
      }
    }
    if(changed) m.expertiseVisualVersion=EXPERTISE_VISUAL_VERSION;
    return changed;
  }
  for(const mm of st.modeles){ if(syncExpertiseVisual(mm)) mig=true; }

  /* Regroupement des outils collaboratifs et de l'accompagnement en gestion.
     Le section « Accompagnement en gestion » conserve son identifiant afin de
     préserver les prix, réponses et exclusions des devis déjà enregistrés. */
  const GESTION_MERGE_VERSION="outils-gestion-2026-08-28-v2";
  const gestionMergeMaps=[];
  function mergeOutilsGestion(m){
    if(!m || m.gestionMergeVersion===GESTION_MERGE_VERSION) return false;
    const norm=x=>normLabel(x);
    const sections=m.sections||[];
    const outils=sections.find(s=>norm(s.titre)==="nos outils collaboratifs");
    let gestion=sections.find(s=>norm(s.titre)==="accompagnement en gestion" || norm(s.titre)==="nos outils collaboratifs accompagnement en gestion" || norm(s.titre)==="nos outils collaboratifs et l accompagnement en gestion" || norm(s.titre)==="nos outils collaboratifs et notre accompagnement en gestion");
    let changed=false;
    if(outils && gestion && outils!==gestion){
      const moved=(outils.items||[]).map(it=>it.id);
      const seen=new Set((outils.items||[]).map(it=>it.id));
      gestion.items=[...(outils.items||[]),...(gestion.items||[]).filter(it=>!seen.has(it.id))];
      gestionMergeMaps.push({modelId:m.id,oldOutilsId:outils.id,newGestionId:gestion.id,movedIds:moved});
      m.sections=sections.filter(s=>s!==outils);
      changed=true;
    } else if(outils && !gestion){
      gestion=outils;
    }
    if(gestion){
      if(gestion.titre!=="Nos outils collaboratifs et notre accompagnement en gestion"){ gestion.titre="Nos outils collaboratifs et notre accompagnement en gestion"; changed=true; }
      if(gestion.tag!=="Gestion"){ gestion.tag="Gestion"; changed=true; }
    }
    m.gestionMergeVersion=GESTION_MERGE_VERSION;
    return changed;
  }
  for(const mm of st.modeles){ if(mergeOutilsGestion(mm)) mig=true; }
  /* v42 : signataire unique du cabinet, si aucun n'a été renseigné. */
  if(!String(st.cab.signataire||"").trim()){
    st.cab.signataire=CAB_DEF.signataire;
    if(!SB_USER||canRole("admin")){ auditGlobal("Signataire du cabinet renseigné",st.cab.signataire,"cabinet",""); await saveCab(); }
  }
  /* v41 : pré-marquage des débours dans les modèles du cabinet. */
  const preDeb=preMarquerDeboursModeles();
  if(preDeb.changed) mig=true;
  if(preDeb.touchees.length) setTimeout(()=>toast(`${preDeb.touchees.length} ligne(s) de frais reclassée(s) en débours, hors honoraires. Vérifiez-les dans Modèles de devis.`),1200);

  /* v49.1 : une migration ne s'exécute que sur un état complet. Si une
     lecture a échoué, l'application est déjà en lecture seule (voir
     MODE_LECTURE_SEULE) ; on n'essaie même pas d'écrire. */
  /* v54 : modèles et lettres ne sont plus modifiables par un collaborateur
     côté base (script v54). La mise à niveau reste appliquée en mémoire et
     sera enregistrée par le premier manager ou administrateur connecté. */
  if(mig && !MODE_LECTURE_SEULE && (!SB_USER || canRole("manager"))) await Promise.all([saveLm(),saveMod()]);
  st.modId=st.modeles[0].id; st.lmId=(bic&&bic.lmId)||st.lettres[0].id;
  let migDev=annualLegacyDevisChanged, migClients=!cli;
  st.clients=(st.clients||[]).map(c=>({archive:false,cree:c.cree||today(),maj:c.maj||today(),...c}));
  st.clients.forEach(ensureClientInternals);
  st.devis.forEach(d=>{ d.rep=d.rep||{}; d.prix=d.prix||{}; d.catPrix=d.catPrix||{}; d.off=d.off||{}; d.offSec=d.offSec||{};
    d.exc=d.exc||{}; d.excPrix=d.excPrix||{}; d.deb=d.deb||[];
    d.sign={id:"",statut:"",envoye:"",signe:"",...(d.sign||{})};
    const oldManual=d.manualSign||{};
    if("uploaded" in oldManual || "uploadedDate" in oldManual || "signed" in oldManual || "signedDate" in oldManual) migDev=true;
    d.manualSign=manualSignState(oldManual);
    d.client={...clientDefaults(),...(d.client||{})}; d.client.civilite=d.client.civilite||"Madame, Monsieur";
    if(d.dateDebutDossier==null){ d.dateDebutDossier=d.debut||""; migDev=true; }
    if(d.referentiel==null){ d.referentiel=REFERENTIEL_DEFAULT; migDev=true; }
    if(!d.rgpdMode){ d.rgpdMode="mixte"; migDev=true; }
    if(d.justifSeuilEnabled==null){ d.justifSeuilEnabled=false; migDev=true; }
    if(d.justifSeuil==null){ d.justifSeuil=100; migDev=true; }
    const beforeId=d.clientId||"";
    const c=ensureClientForDevis(d,true,false);
    if(c && d.clientId!==beforeId){ migDev=true; migClients=true; }
    const ws=workflowStatut(d); if(d.statut!==ws){ d.statut=ws; migDev=true; }
    const pmap=paragraphItemsByModel.get(d.modeleId);
    if(pmap){
      for(const [pid,pit] of pmap){
        if(Object.prototype.hasOwnProperty.call(d.prix,pid)){ delete d.prix[pid]; migDev=true; }
        const rv=d.rep[pid];
        if(Object.prototype.hasOwnProperty.call(d.rep,pid) && (pit.reponses||[]).some(r=>r.id===rv)){
          delete d.rep[pid]; migDev=true;
        }
      }
    }
    const gm=gestionMergeMaps.find(x=>x.modelId===d.modeleId);
    if(gm && d.offSec[gm.oldOutilsId]){
      for(const id of gm.movedIds) d.off[id]=true;
      delete d.offSec[gm.oldOutilsId];
      migDev=true;
    }
  });
  /* v45 : réponse LAB de l'acceptation reprise là où le questionnaire
     anti-blanchiment est déjà complet. */
  if(migrerReponseLabAcceptation()>0) migClients=true;
  /* v37 : conformité LCB-FT et notes internes remontées sur la fiche client. */
  const moved=migrateInternalsToClients();
  if(moved.changedDevis) migDev=true;
  if(moved.changedClients) migClients=true;
  if(migDev && !MODE_LECTURE_SEULE) await S.set(K.dev,JSON.stringify(st.devis),true);
  if(migClients && !MODE_LECTURE_SEULE) await saveClients();
  render();
  if(MODE_LECTURE_SEULE) toast("Certaines données n'ont pas pu être lues : la session est en lecture seule. Rechargez la page.",true);
  if(!st.cab.nom) toast("Commencez par renseigner l'identité du cabinet.");
})();
