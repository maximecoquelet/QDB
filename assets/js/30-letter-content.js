/* =================================================== lettre de mission */
const LM_VERSION = "serre-oec-2025-v2";
const LM_SOURCE = "Trame SERRE alignée sur le Référentiel normatif OEC — édition août 2025 (NP 2300 / NP 2400 / mission sans assurance)";
const REFERENTIEL_DEFAULT = "Règlement ANC n° 2014-03 relatif au Plan comptable général";
const REFERENTIELS = [
  [REFERENTIEL_DEFAULT,"PCG — règlement ANC n° 2014-03"],
  ["Règlement ANC n° 2018-06 relatif aux comptes annuels des personnes morales de droit privé à but non lucratif","Entités à but non lucratif — règlement ANC n° 2018-06"],
  ["Autre référentiel comptable applicable — à préciser","Autre — à préciser"]
];
const RGPD_MODES = [
  ["mixte","Selon les traitements — sous-traitant + responsable autonome (recommandé)"],
  ["sous_traitant","Sous-traitant pour les traitements réalisés sur instructions du client"],
  ["conjoint","Responsables conjoints — uniquement si finalités et moyens essentiels sont déterminés conjointement"],
  ["autonome","Responsable de traitement autonome"]
];

const LM_ART = [
  { id:"entite", titre:"Votre entité", corps:
`Suite à nos échanges, nous avons repris dans ce paragraphe les éléments importants concernant les données de votre entreprise.

{{section.presentation}}` },
  { id:"mission", titre:"Notre mission", corps:
`{{mission.cadre}}

**Référentiel comptable retenu :** {{mission.referentiel}}` },
  { id:"duree", titre:"Durée de la mission", corps:
`La mission est conclue pour la durée de l’exercice comptable. Pour cet exercice, elle couvre la période comprise entre la date d’effet de la lettre de mission et la date de clôture de l’exercice comptable, date d’échéance du contrat.

La mission est renouvelée par tacite reconduction, à chaque fois pour l’exercice suivant, sauf dénonciation par lettre recommandée avec accusé de réception {{conditions.preavis}} mois avant la date de clôture de l’exercice comptable.

À défaut de dénonciation dans ce délai, la mission se poursuit pour l’exercice suivant ; une dénonciation notifiée hors délai ne prend effet qu’à l’échéance suivante. Les conditions dans lesquelles il peut être mis fin à la mission avant son terme sont fixées à l’article « 7. Résiliation de la mission » des conditions générales.` },
  { id:"nature", titre:"Nature et objectif de la mission", corps:
`{{mission.assurance}}` },
  { id:"limites", titre:"Nature et limites des travaux à mettre en œuvre", corps:
`{{mission.limites}}` },
  { id:"complementaires", titre:"Missions complémentaires", corps:
`Les prestations suivantes viennent s’ajouter à notre mission, le cas échéant :

{{section.exceptionnelles}}` },
  { id:"execution", titre:"Exécution, déroulement et livrable de la mission", corps:
`{{mission.execution}}

{{mission.justificatifs}}` },
  { id:"relationnelles", titre:"Modalités relationnelles", corps:
`Nos relations seront réglées sur le plan juridique par les termes de la présente lettre, les conditions générales jointes et le tableau de répartition des obligations respectives entre votre entité et notre cabinet.

Tout aménagement apporté au périmètre de la mission ou aux obligations respectives des parties sera préalablement arrêté d’un commun accord et formalisé lorsque sa nature le requiert.` },
  { id:"identification", titre:"Obligations d’identification et LCB-FT", corps:
`Dans le cadre des obligations qui nous incombent en application du Code monétaire et financier et de la norme professionnelle relative à la lutte contre le blanchiment des capitaux et le financement du terrorisme (NPLAB), les informations et documents requis pour l’identification du client, des personnes agissant pour son compte et, le cas échéant, des bénéficiaires effectifs doivent être obtenus avant la mise en œuvre de la mission.

L’obtention de ces éléments constitue une condition préalable à l’entrée en relation et à l’exécution des travaux. En cas d’impossibilité de satisfaire aux obligations de vigilance applicables, le cabinet ne met pas en œuvre la mission ou y met fin conformément aux textes en vigueur.` },
  { id:"honoraires", titre:"Honoraires", corps:
`Voici notre proposition d’honoraires :

{{honoraires.table}}` },
  { id:"compta", titre:"Section du devis : Accompagnement en comptabilité", corps:`{{section.comptabilite}}` },
  { id:"gestion", titre:"Section du devis : Nos outils collaboratifs et notre accompagnement en gestion", corps:`{{section.gestion}}` },
  { id:"social", titre:"Section du devis : Accompagnement en social", corps:`{{section.social}}` },
  { id:"juridique", titre:"Section du devis : Accompagnement en juridique", corps:`{{section.juridique}}` },
  { id:"debours", titre:"Section du devis : Frais de débours", corps:`{{section.debours}}` },
  { id:"modalites", titre:"Modalités de facturation et de règlement", corps:`{{section.modalites}}` },
  { id:"modifs", titre:"Modifications apportées aux conditions générales", corps:
`Les parties, après en avoir discuté, sont convenues de n’apporter aucune dérogation aux conditions générales, sauf mention expresse portée dans la présente lettre ou dans une annexe signée par les parties.` },
  { id:"conclusion", titre:"Conclusion", corps:
`Nous vous remercions de bien vouloir nous retourner un exemplaire de la présente lettre et de ses annexes contractuelles, revêtu de votre signature, attestant de votre prise de connaissance et de votre acceptation de la mission, de ses conditions générales et de ses annexes.

Nous vous prions de croire, {{client.civilite}} {{client.contact}}, en l’expression de nos salutations distinguées.` },
  { id:"annexe", titre:"Annexes — Tableau de répartition des obligations respectives", pageBreak:true, corps:
`*Nota : ce tableau précise la répartition opérationnelle des travaux entre le cabinet et le client. Il doit être adapté au périmètre effectivement convenu.*

{{annexe.obligations}}` },
  { id:"cg1", titre:"Conditions générales — 1. Domaine d’application", pageBreak:true, corps:
`Les présentes conditions générales s’appliquent au contrat de mission conclu entre le cabinet {{cabinet.nom}} et son client. Elles complètent la lettre de mission et ses annexes.

Le client reconnaît contracter en qualité de professionnel pour les besoins de son activité.` },
  { id:"cg2", titre:"2. Définition et périmètre de la mission", corps:
`Les travaux incombant au cabinet sont ceux décrits dans la lettre de mission, le devis qui lui est annexé et le tableau de répartition des obligations respectives. Ils sont strictement limités au périmètre convenu.

La nature normative de la mission est la suivante : **{{mission.norme}}**.` },
  { id:"cg3", titre:"3. Obligations de l’expert-comptable", corps:
`L’expert-comptable effectue la mission qui lui est confiée conformément aux dispositions légales et réglementaires applicables à la profession, au Code de déontologie des professionnels de l’expertise comptable, à la **norme professionnelle de management de la qualité (NPMQ)**, à la norme professionnelle relative aux obligations de la profession d’expertise comptable en matière de lutte contre le blanchiment des capitaux et le financement du terrorisme (NPLAB) et, lorsqu’elle existe, à la norme professionnelle spécifique à la mission considérée.

Il contracte, en raison de cette mission, une obligation de moyens et exerce son jugement professionnel dans le respect des textes applicables.

L’expert-comptable peut se faire assister par les collaborateurs et intervenants de son choix, sous sa responsabilité et dans le respect des règles de confidentialité.

À l’achèvement de sa mission, l’expert-comptable restitue, selon les modalités convenues, les documents appartenant au client que ce dernier lui a confiés pour l’exécution de la mission.

L’expert-comptable est notamment tenu :
- au secret professionnel dans les conditions prévues par les textes applicables ;
- à une obligation de discrétion pour les informations recueillies dans le cadre de la mission ;
- à ses devoirs d’information et de conseil dans les limites du périmètre contractuellement convenu.` },
  { id:"cg4", titre:"4. Obligations du client", corps:
`Le client s’interdit tout acte de nature à porter atteinte à l’indépendance de l’expert-comptable ou de ses collaborateurs.

Le client s’engage à fournir au cabinet, avant le commencement de la mission puis pendant toute sa durée, les informations et documents nécessaires à l’exécution des travaux et au respect des obligations de vigilance prévues par les articles L. 561-1 et suivants du Code monétaire et financier.

La mission ne peut être mise en œuvre tant que les éléments d’identification et de vigilance requis n’ont pas été obtenus. Leur obtention constitue une **condition préalable à l’exécution de la mission**.

Le client s’engage également :
- à mettre à la disposition du cabinet, dans les délais convenus, l’ensemble des documents et informations nécessaires ;
- à réaliser les travaux lui incombant conformément au tableau de répartition des obligations respectives ;
- à respecter les procédures et le calendrier convenus pour la réalisation de la mission ;
- à porter à la connaissance du cabinet les faits nouveaux ou exceptionnels susceptibles d’affecter les travaux ou les comptes ;
- à confirmer par écrit, à la demande du cabinet, le caractère exhaustif et fidèle des informations fournies ;
- à vérifier les documents remis par le cabinet et à signaler sans délai toute anomalie portée à sa connaissance.

Le client demeure responsable de l’établissement de ses comptes, de ses décisions de gestion, de la bonne application des textes qui lui sont applicables et de la fiabilité, de l’exhaustivité et de l’exactitude des informations communiquées au cabinet.

Il prend les mesures nécessaires pour assurer la conservation de ses pièces justificatives, de ses données et de son système d’information conformément aux délais légaux et réglementaires.` },
  { id:"cg5", titre:"5. Honoraires", corps:
`Le cabinet reçoit du client des honoraires librement convenus. Il est remboursé de ses frais de déplacement et débours selon les conditions prévues au devis. Des acomptes sur honoraires peuvent être demandés périodiquement.

Les honoraires convenus font l’objet d’une révision annuelle de {{conditions.revision}} %, applicable de plein droit à chaque reconduction de la mission, au premier jour de l’exercice suivant. Cette révision est distincte de toute modification du périmètre de la mission, laquelle fait l’objet d’un accord séparé entre les parties.

Les honoraires sont payés à leur date d’échéance. En cas de paiement anticipé, aucun escompte n’est accordé. En cas de retard de paiement, les pénalités prévues au contrat et les indemnités légales de recouvrement sont exigibles dans les conditions prévues par les textes en vigueur.

Toute contestation d’une facture doit être formulée dans un délai raisonnable à compter de sa réception, identifier la prestation concernée et être motivée. Elle ne dispense pas du paiement des prestations non contestées.

Le non-paiement des honoraires pourra, après mise en demeure restée sans effet lorsque celle-ci est requise, entraîner la suspension des travaux ou la résiliation de la mission.

En cas de changement des modalités de facturation, le client en est informé préalablement.

En cas de rupture du contrat, une assistance au transfert du dossier pourra être réalisée à la demande du client, selon les conditions convenues entre les parties.

En cas d’usage du droit de rétention prévu par les textes professionnels, le Conseil régional de l’Ordre compétent est informé dans les conditions réglementaires.` },
  { id:"cg6", titre:"6. Responsabilité civile professionnelle de l’expert-comptable", corps:
`La responsabilité civile professionnelle de l’expert-comptable ne peut être mise en jeu que sur une période contractuellement définie à 1 an à compter du jour où le client a connu ou aurait dû connaître les faits lui permettant de la mettre en cause.

Tout événement susceptible d’avoir des conséquences en matière de responsabilité doit être porté sans délai par le client à la connaissance de l’expert-comptable.

La responsabilité contractuelle du Cabinet envers le Client est restreinte aux seuls dommages directs découlant des missions mentionnées dans la lettre de mission, excluant ainsi tout dommage indirect. Cette responsabilité est plafonnée à un montant qui ne peut dépasser les honoraires annuels perçus (hors frais) pour les missions concernées. Toutefois, cette limitation ne s’applique pas en cas de faute lourde ou de dol de la part du Cabinet ou de l’expert-comptable.

La responsabilité civile professionnelle de l’expert-comptable est couverte par un contrat d’assurance.

La responsabilité de l’expert-comptable ne peut notamment être engagée dans l’hypothèse où le préjudice subi par le client est une conséquence :
- d’une information erronée ou d’une faute ou négligence commise par le client ou par ses salariés ;
- du retard ou de la carence du client à fournir une information nécessaire à l’expert-comptable ;
- des fautes commises par des tiers intervenant chez le client.` },
  { id:"cg7", titre:"7. Résiliation de la mission", corps:
`Lorsque la mission est conclue pour la durée de l’exercice et renouvelée par tacite reconduction, elle prend fin à son échéance par l’effet de la dénonciation prévue à l’article « Durée de la mission », notifiée par lettre recommandée avec accusé de réception dans le délai de préavis qui y est stipulé. Lorsque la mission est ponctuelle, elle prend fin par l’achèvement des travaux qui en sont l’objet. En dehors de ces hypothèses, et sauf accord des parties, la mission se poursuit jusqu’à son terme.

Si le client met néanmoins fin à la mission avant son terme, au cours d’un exercice comptable ou pendant une mission ponctuelle, et sauf faute grave imputable au cabinet, les honoraires correspondant aux travaux déjà effectués restent dus.

Le client verse en outre au cabinet une indemnité de résiliation égale à {{conditions.indemniteResiliation}} % des honoraires convenus pour l’exercice en cours ou, s’agissant d’une mission ponctuelle, des honoraires convenus pour la mission. Cette indemnité s’applique dans les limites admises par les textes et la jurisprudence. Elle n’est pas due lorsque la mission prend fin à son échéance dans les conditions de préavis prévues à l’article « Durée de la mission ».

En cas de manquement du client à l’une de ses obligations, le cabinet peut mettre fin à sa mission après mise en demeure restée sans effet lorsque celle-ci est requise.

Dès la survenance d’un événement susceptible de placer le professionnel dans une situation d’incompatibilité, de conflit d’intérêts ou de porter atteinte à son indépendance, le cabinet prend les mesures appropriées et, si nécessaire, met fin à la mission.` },
  { id:"cg8", titre:"8. Suspension de la mission", corps:
`Lorsque la mission est suspendue pour une cause empêchant temporairement son exécution, les délais de réalisation sont adaptés en conséquence, sauf si les circonstances justifient la résiliation du contrat.

En cas de manquement du client à ses obligations, notamment en cas de défaut de paiement ou de défaut de transmission des informations indispensables, le cabinet peut suspendre sa mission après les formalités requises. Il ne peut être tenu responsable des conséquences directement imputables à l’impossibilité d’exécuter les travaux résultant de ce manquement.` },
  { id:"cg9", titre:"9. Différends", corps:
`En cas de contestation des conditions d’exercice de la mission ou de différend sur les honoraires, les parties peuvent rechercher une solution amiable et saisir, lorsque les conditions en sont réunies, les instances ordinales compétentes avant toute action contentieuse.` },
  { id:"cg10", titre:"10. Protection des données personnelles", corps:
`{{rgpd.clause}}` },
  { id:"cg11", titre:"11. Droit applicable et juridiction compétente", corps:
`Le contrat de mission est régi et interprété selon le droit français.

Tout litige relatif à la validité, l’interprétation, l’exécution ou la cessation du contrat relève des juridictions compétentes déterminées conformément aux règles de procédure applicables.` }
];

const LM_INTRO = `{{mission.intro}}`;
const LM_MENTIONS =
`- Le devis annexé fait partie intégrante de la lettre de mission n° {{lm.ref}}.
- Les honoraires et prestations retenus sont ceux figurant au présent devis ; toute modification ultérieure fera l’objet d’un accord entre les parties.
- Les débours sont refacturés au réel sur justificatifs.`;

const NATURE = {
  NP2300:{
    t:"mission de présentation des comptes annuels",
    norme:"NP 2300 — norme professionnelle applicable à la mission de présentation des comptes",
    intro:`{{client.civilite}} {{client.contact}},

Nous vous remercions de la confiance que vous nous témoignez en envisageant de nous confier une **mission de présentation des comptes annuels** de votre entité.

La présente lettre de mission reprend les termes de nos échanges et définit nos obligations respectives.`,
    cadre:`La mission sera réalisée conformément au **Code de déontologie des professionnels de l’expertise comptable**, aux normes professionnelles d’application générale de l’Ordre et à la **norme professionnelle applicable à la mission de présentation des comptes (NP 2300)**.

Cette mission constitue une mission d’assurance de niveau modéré. Elle **ne constitue ni un audit, ni un examen limité**.`,
    p:`La mission de présentation a pour objectif de permettre à l’expert-comptable d’exprimer une assurance de niveau modéré portant sur la **cohérence et la vraisemblance des comptes pris dans leur ensemble**.

Le niveau d’assurance est inférieur à celui d’un audit ou d’un examen limité. La mission n’a pas pour objectif de se prononcer sur la régularité, la sincérité et l’image fidèle des comptes, ni de déceler les erreurs, actes illégaux, fraudes ou autres irrégularités éventuelles.

La direction demeure responsable de l’établissement des comptes conformément au référentiel comptable applicable et de la fiabilité, de l’exhaustivité et de l’exactitude des informations communiquées au cabinet.`,
    limites:`Les diligences mises en œuvre dans le cadre de la NP 2300 comprennent notamment une prise de connaissance générale de l’entité, une appréciation de l’organisation de la comptabilité, une appréciation de la régularité en la forme de la comptabilité, la participation, le cas échéant, à la préparation des comptes et un examen de leur cohérence et de leur vraisemblance.

Elles **ne comprennent ni le contrôle de la réalité et de l’exhaustivité des opérations, ni le contrôle des inventaires physiques des actifs de l’entité à la clôture de l’exercice, ni l’appréciation des procédures de contrôle interne**.

Les contrôles et rapprochements sont réalisés par épreuves, selon le jugement professionnel de l’expert-comptable et en tenant compte du caractère significatif des informations.`,
    execution:`Notre mission est exécutée sous la responsabilité de l’expert-comptable signataire, qui peut se faire assister par les collaborateurs et intervenants du cabinet.

Nous comptons sur votre coopération pour nous communiquer dans les délais convenus les informations, documents et explications nécessaires.

À l’issue de la mission, nous établirons un **rapport d’assurance prenant la forme d’une attestation de présentation des comptes**, comportant une conclusion exprimée sous forme négative sur la cohérence et la vraisemblance des comptes pris dans leur ensemble. Les comptes concernés sont annexés à cette attestation.`,
    assurance:""
  },
  NP2400:{
    t:"mission d’examen limité des comptes annuels",
    norme:"NP 2400 — norme professionnelle applicable à la mission d’examen limité des comptes",
    intro:`{{client.civilite}} {{client.contact}},

Nous vous remercions de la confiance que vous nous témoignez en envisageant de nous confier une **mission d’examen limité des comptes annuels** de votre entité.

La présente lettre de mission reprend les termes de nos échanges et définit nos obligations respectives.`,
    cadre:`La mission sera réalisée conformément au **Code de déontologie des professionnels de l’expertise comptable**, aux normes professionnelles d’application générale de l’Ordre et à la **norme professionnelle applicable à la mission d’examen limité des comptes (NP 2400)**.

Cette mission constitue une mission d’assurance de niveau modéré. Elle **ne constitue pas un audit**.`,
    p:`L’examen limité a pour objectif de permettre à l’expert-comptable d’exprimer une assurance modérée sur les comptes établis conformément au référentiel comptable retenu.

Les procédures d’examen limité sont moins étendues que celles d’un audit et reposent notamment sur la prise de connaissance de l’entité et de son environnement, des demandes d’informations, des entretiens et des procédures analytiques.

La direction demeure responsable de l’établissement des comptes, du contrôle interne qu’elle estime nécessaire et de la fiabilité, de l’exhaustivité et de l’exactitude des informations communiquées au cabinet.`,
    limites:`La mission d’examen limité n’a pas pour objectif de déceler toutes les erreurs, actes illégaux, fraudes ou autres irrégularités pouvant affecter les comptes.

Les procédures mises en œuvre **ne comprennent pas une appréciation des procédures de contrôle interne comparable à celle d’un audit** et ne permettent pas de détecter toutes les anomalies susceptibles d’exister dans les comptes.

Si les travaux mettent en évidence des éléments laissant supposer l’existence d’anomalies significatives, des procédures complémentaires sont mises en œuvre dans les conditions prévues par la NP 2400.`,
    execution:`Notre mission est exécutée sous la responsabilité de l’expert-comptable signataire, qui peut se faire assister par les collaborateurs et intervenants du cabinet.

Nous comptons sur votre coopération pour nous communiquer dans les délais convenus les informations, documents, explications et confirmations nécessaires.

À l’issue de la mission, nous établirons un **rapport d’examen limité** comportant une conclusion d’assurance formulée sous une forme négative sur les comptes établis conformément au référentiel comptable identifié. Ce rapport précisera que l’examen limité ne constitue pas un audit.`,
    assurance:""
  },
  TENUE:{
    t:"mission de tenue et de travaux comptables sans assurance",
    norme:"Mission sans assurance — cadre de référence OEC et normes professionnelles d’application générale",
    intro:`{{client.civilite}} {{client.contact}},

Nous vous remercions de la confiance que vous nous témoignez en envisageant de nous confier une **mission de tenue et de travaux comptables sans assurance**.

La présente lettre de mission reprend les termes de nos échanges et définit précisément les travaux confiés au cabinet et nos obligations respectives.`,
    cadre:`La mission sera réalisée conformément au **Code de déontologie des professionnels de l’expertise comptable**, au cadre de référence de l’Ordre et aux normes professionnelles d’application générale, notamment la NPMQ et la NPLAB.

Il s’agit d’une **mission sans assurance**. Elle ne constitue ni un audit, ni un examen limité, ni une mission de présentation des comptes et n’aboutit pas à l’expression d’une assurance sur les comptes.`,
    p:`Le cabinet réalise exclusivement les travaux comptables, fiscaux, sociaux ou administratifs décrits dans le devis et dans le tableau de répartition des obligations.

Le client demeure responsable de ses décisions de gestion, de l’établissement et de l’arrêté de ses comptes ainsi que de la fiabilité, de l’exhaustivité et de l’exactitude des informations transmises au cabinet.

Aucune opinion, conclusion d’assurance ou attestation de présentation des comptes n’est délivrée au titre de cette mission.`,
    limites:`Les travaux sont limités aux prestations expressément convenues. Ils ne comprennent pas les diligences propres à une mission d’audit, d’examen limité ou de présentation des comptes, sauf si une mission distincte est expressément conclue.

La mission n’a pas pour objectif de rechercher ou de détecter les fraudes, actes illégaux ou autres irrégularités, sans préjudice des obligations légales et professionnelles du cabinet lorsqu’un fait est porté à sa connaissance.`,
    execution:`Notre mission est exécutée sous la responsabilité de l’expert-comptable signataire, qui peut se faire assister par les collaborateurs et intervenants du cabinet.

Nous comptons sur votre coopération pour nous communiquer dans les délais convenus les informations, documents et explications nécessaires.

Les livrables remis au client sont ceux prévus au devis et au tableau de répartition des obligations. **Aucun rapport d’assurance ni aucune attestation de présentation des comptes n’est émis** au titre de cette mission.`,
    assurance:""
  }
};
for(const k of Object.keys(NATURE)) NATURE[k].assurance=NATURE[k].p;

function rgpdClause(d){
  const mode=d?.rgpdMode||"mixte";
  const common=`Chaque partie s’engage à respecter le règlement (UE) 2016/679 (RGPD), la loi n° 78-17 du 6 janvier 1978 modifiée et les autres textes applicables en matière de protection des données personnelles.

Les données sont traitées uniquement pour les finalités nécessaires à l’exécution et au suivi de la mission, à la gestion de la relation client, à la sécurité des systèmes et au respect des obligations légales et professionnelles du cabinet. Les parties mettent en œuvre des mesures techniques et organisationnelles appropriées et respectent les durées de conservation applicables.

Le cabinet traite par ailleurs, en qualité de responsable de traitement autonome, les données nécessaires au respect de ses obligations propres, notamment en matière de déontologie, de lutte contre le blanchiment des capitaux et le financement du terrorisme, de facturation, de sécurité et de défense de ses droits.`;
  const roles={
    mixte:`Pour les traitements réalisés **sur instructions documentées du client** et pour son compte, le cabinet agit en qualité de **sous-traitant** au sens de l’article 28 du RGPD. Pour les traitements dont il détermine lui-même les finalités et moyens essentiels au titre de ses obligations propres, il agit en qualité de **responsable de traitement autonome**. La qualification doit être appréciée traitement par traitement.`,
    sous_traitant:`Pour les traitements réalisés pour le compte du client et sur ses instructions documentées, le cabinet agit principalement en qualité de **sous-traitant** au sens de l’article 28 du RGPD. Le client demeure responsable de traitement pour ces opérations et conserve les obligations qui lui incombent à ce titre.`,
    conjoint:`Pour les traitements pour lesquels le client et le cabinet déterminent conjointement les finalités et les moyens essentiels, ils agissent en qualité de **responsables conjoints de traitement**. La répartition de leurs obligations respectives doit alors être précisée conformément à l’article 26 du RGPD. Cette qualification ne s’applique qu’aux traitements répondant effectivement à ces critères.`,
    autonome:`Pour les traitements compris dans le périmètre de la présente mission pour lesquels le cabinet détermine les finalités et les moyens essentiels, il agit en qualité de **responsable de traitement autonome**. Le client demeure responsable des traitements qu’il détermine pour son propre compte.`
  };
  const processor=`Lorsque le cabinet agit en qualité de sous-traitant, il traite les données uniquement sur instructions documentées du client, veille à ce que les personnes autorisées soient tenues à la confidentialité, met en œuvre les mesures de sécurité appropriées, encadre le recours à d’éventuels sous-traitants ultérieurs, assiste le client dans la mesure prévue par le RGPD et l’informe sans délai injustifié de toute violation de données portée à sa connaissance lorsqu’une telle notification lui incombe.

Les personnes concernées peuvent exercer leurs droits auprès de la partie responsable du traitement concerné. Le cabinet peut être contacté à l’adresse {{cabinet.email}} ou à l’adresse postale {{cabinet.nom}}, {{cabinet.adresse}}, {{cabinet.cp}} {{cabinet.ville}}.`;
  return `${common}

${roles[mode]||roles.mixte}

${processor}`;
}
const lettreDef = (nom="BIC — SERRE") => ({ id:uid(), nom, statut:"publie", sourceVersion:LM_VERSION, sourceLabel:LM_SOURCE, intro:LM_INTRO, mentions:LM_MENTIONS,
  articles:JSON.parse(JSON.stringify(LM_ART)).map(a=>({...a,id:a.id||uid(),actif:true})), createdAt:nowISO(), modifiedAt:nowISO(), publishedAt:nowISO() });
function normalizeLetterUx(L){
  if(!L)return L;
  if(!L.statut)L.statut="publie";
  if(!L.createdAt)L.createdAt=nowISO();
  if(!L.modifiedAt)L.modifiedAt=L.createdAt;
  if(L.statut==="publie"&&!L.publishedAt)L.publishedAt=L.modifiedAt;
  return L;
}
function letterCloneForDraft(src,name){
  const L=JSON.parse(JSON.stringify(src));
  L.id=uid();L.nom=name||`${src.nom} — version de test`;L.statut="brouillon";L.replacesLetterId=src.id;
  L.createdAt=nowISO();L.modifiedAt=nowISO();delete L.publishedAt;delete L.archivedAt;
  L.articles=(L.articles||[]).map(a=>({...a,id:uid()}));
  return L;
}

