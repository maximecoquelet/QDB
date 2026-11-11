/* =====================================================================
   MODÈLES CABINET — BNC & LMNP
   Reprise des paramétrages fournis par le cabinet dans BNC.pdf et lmnp.pdf.
   Les montants laissés vides dans les documents source sont conservés à 0 :
   aucune tarification n'est inventée.
   ===================================================================== */
const MODEL_BNC_VERSION="serre-bnc-source-2026-08-29-v3-annuel-periodes";
const MODEL_LMNP_VERSION="serre-lmnp-source-2026-08-29-v1";

function modeleBNC(){
  const honoraires=[
    (()=>{const r=R("À renseigner",0);r.n=0;return r;})(),
    (()=>{const r=R("< 50 K€ TTC",0);r.n=50000;return r;})(),
    (()=>{const r=R("50 <> 100 K€ TTC",0);r.n=100000;return r;})(),
    (()=>{const r=R("100 <> 150 K€ TTC",0);r.n=150000;return r;})(),
    (()=>{const r=R("> 150 K€ TTC",0);r.n=200000;return r;})()
  ];
  const immeubles2044=[
    R("À renseigner",0),R("1 immeuble",0),R("2 immeubles",0),R("3 immeubles",0),
    R("4 immeubles",0),R("5 immeubles",0),R("+ de 5 immeubles — forfait",0),R("Établie par le client",0)
  ];
  const ifi=[
    R("À renseigner",0),R("Patrimoine < 3 M€",0),R("Patrimoine 3 <> 5 M€",0),
    R("Patrimoine 5 <> 10 M€",0),R("Patrimoine > 10 M€",0),R("Établie par le client",0)
  ];
  return {
    id:uid(), titre:"DEVIS COMPTA BNC", desc:"ANNUEL — EN FONCTION DE LA VOLUMÉTRIE", statut:"publie",
    cats:["Comptabilité","Fiscalité","Social","Juridique"],
    tva:20, devise:"EUR", per:"annuelle", lmId:null,
    sourceVersion:MODEL_BNC_VERSION, sourceLabel:"BNC.pdf — paramétrage cabinet transmis le 29/08/2026",
    calcSource:"BNC.pdf fourni par le cabinet", calcVersion:MODEL_BNC_VERSION,
    sections:[
      SEC("Votre cabinet d'expertise-comptable","Présentation",[
        I("Présentation du cabinet","paragraphe",{prix:false,html:
`**{{cabinet.nom}} Expertise Comptable — Votre partenaire en matière de gestion et de performance financière**

- **Expertise & conseil** : un accompagnement rigoureux en comptabilité, fiscalité et gestion financières dans le but de sécuriser votre activité.
- **Solutions sur mesure** : création d'entreprise, suivi comptable & juridique, consolidation, assistance à la direction financière.
- **Proximité & engagement** : un interlocuteur dédié, des conseils adaptés et un suivi réactif pour vous aider à piloter votre entreprise en toute sérénité.

Notre mission : optimiser votre gestion, anticiper vos enjeux et vous accompagner vers une croissance maîtrisée.`})
      ]),
      SEC("Présentation de l'activité","Présentation",[
        I("Activité","texte",{prix:false}),
        I("Forme juridique","liste",{cle:"forme_bnc",prix:false,reponses:[R("En nom propre",0),R("En société",0)]}),
        I("Honoraires annuels","liste",{cle:"honoraires_annuels",prix:false,reponses:honoraires}),
        I("Nombre de pages de relevé bancaire par mois","nombre",{cle:"pages_banque_bnc",prix:false}),
        I("Nombre de salariés","nombre",{cle:"effectif",prix:false}),
        I("Date de début de la mission","texte",{prix:false}),
        I("Date de clôture","texte",{cle:"cloture",prix:false})
      ]),
      SEC("Accompagnement en comptabilité","Comptabilité",[
        I("Enregistrement de la banque","ouinon",{per:"annuelle",reponses:[
          RM("Par le client","pages_banque_bnc",66),
          RM("Par le cabinet","pages_banque_bnc",120)
        ]}),
        I("Établissement du dossier du centre de gestion","ouinon",{per:"annuelle",reponses:[
          R("Non",0),R("Oui",84)
        ]})
      ]),
      SEC("Accompagnement en fiscalité","Fiscalité",[
        I("Établissement de la liasse fiscale","ouinon",{per:"annuelle",reponses:[
          R("Par le client",0),
          RB("Par le cabinet","honoraires_annuels",[0,132,198,264,363])
        ]}),
        I("Établissement des documents CGA ou AGA","ouinon",{per:"annuelle",reponses:[
          R("Par le client",0),R("Par le cabinet",98.52)
        ]}),
        I("Établissement des déclarations de TVA","liste",{per:"annuelle",reponses:[
          R("Par le cabinet : TVA simplifiée",0),
          R("Par le cabinet : TVA trimestrielle",0),
          R("Par le cabinet : TVA mensuelle",0),
          R("Non applicable",0)
        ]}),
        I("Déclaration de revenus (IRPP uniquement n°2042)","ouinon",{per:"annuelle",reponses:[
          R("Établie par le client",0),R("Établie par le cabinet",0)
        ]}),
        I("Déclaration des revenus fonciers (n°2044)","liste",{per:"annuelle",reponses:immeubles2044}),
        I("Déclaration IFI","liste",{per:"annuelle",reponses:ifi})
      ]),
      SEC("Accompagnement en social","Social",[
        I("Établissement des fiches de paie","liste",{per:"annuelle",reponses:[
          R("Par le client",0),
          RM("Par le cabinet, moins de 10 salariés soit 30 € HT / bulletin","effectif",360),
          RM("Par le cabinet, 10 à 50 salariés soit 20 € HT / bulletin","effectif",240),
          RM("Par le cabinet, plus de 50 salariés soit 18 € HT / bulletin","effectif",216)
        ]}),
        I("Établissement des charges sociales (DSN)","liste",{per:"annuelle",reponses:[R("Inclus",0)]}),
        I("Gestion du prélèvement à la source","liste",{per:"annuelle",reponses:[R("Inclus",0)]}),
        I("Coffre-fort électronique","liste",{per:"annuelle",reponses:[
          RM("Obligatoire, soit 2,00 € HT / salarié / mois","effectif",24),
          R("Non applicable",0)
        ]}),
        I("Paie assistée : Formule « Liberté »","ouinon",{per:"annuelle",reponses:[
          R("Non",0),RM("Oui, soit 8 € HT / bulletin","effectif",96)
        ]}),
        I("Paie assistée : Formule « Confort »","ouinon",{per:"annuelle",reponses:[
          R("Non",0),RM("Oui, soit 14 € HT / bulletin","effectif",168)
        ]}),
        I("Mise à disposition SILAE","ouinon",{per:"annuelle",reponses:[
          R("Sur option",0),RM("Oui, soit 5 € / salarié","effectif",60)
        ]}),
        I("Échéancier des cotisations TNS","ouinon",{per:"annuelle",reponses:[
          R("Non",0),R("Oui",180)
        ]}),
        I("Hotline sociale","ouinon",{per:"annuelle",reponses:[
          R("Non",0),R("Oui, soit 27 €",324)
        ]}),
        I("Mission complémentaire en social","paragraphe",{prix:false,html:
`*Toute autre mission complémentaire d'assistance et de conseil dans le domaine social et des ressources humaines, pour répondre à vos besoins, pourra être réalisée à votre demande. À titre indicatif, vous pouvez consulter notre grille tarifaire.*`})
      ]),
      SEC("Modalités de facturation et de règlement","Présentation",[
        I("Périodicité de facturation","liste",{cle:"periodicite_facturation",prix:false,reponses:[
          R("À renseigner",0),R("Annuelle",0),R("Semestrielle",0),R("Trimestrielle",0),R("Mensuelle",0)
        ]}),
        I("Modalité de règlement","liste",{cle:"modalite_reglement",prix:false,reponses:[
          R("Par prélèvement",0),R("Par chèque",0),R("Par virement",0)
        ]}),
        I("Conditions particulières","paragraphe",{prix:false,html:""})
      ])
    ],
    exc:[
      {id:uid(),label:"Frais de paramétrage dossier comptable",cat:"Comptabilité",prix:130,tva:20,com:"Conformité LAB (Lutte Anti-Blanchiment), création et paramétrage du dossier."},
      {id:uid(),label:"Frais de paramétrage dossier social",cat:"Social",prix:249,tva:20,com:"Création, paramétrage dossier, adhésion aux organismes sociaux."},
      {id:uid(),label:"Audit prévoyance et contrat Madelin",cat:"Social",prix:850,tva:20,com:""},
      {id:uid(),label:"Audit du statut du conjoint",cat:"Juridique",prix:750,tva:20,com:""},
      {id:uid(),label:"Audit passage en société",cat:"Juridique",prix:1460,tva:20,com:""}
    ],
    deb:[]
  };
}

function modeleLMNP(){
  const biens=["À renseigner","1 bien immobilier","2 biens immobiliers","3 biens immobiliers","4 biens immobiliers","5 biens immobiliers","6 biens immobiliers","7 biens immobiliers","8 biens immobiliers","9 biens immobiliers","10 biens immobiliers"];
  const biensRep=biens.map((x,i)=>{const r=R(x,0);r.n=i;return r;});
  const ca=[
    "À renseigner","Inférieur à 23.000€","Compris entre 23.000€ et 50.000€",
    "Compris entre 50.000€ et 80.000€","Compris entre 80.000€ et 100.000€",
    "Compris entre 100.000€ et 150.000€","Compris entre 150.000€ et 200.000€",
    "Au-delà de 200.000€"
  ];
  const ifi=[
    R("À renseigner",0),R("Patrimoine < 3 M€",0),R("Patrimoine 3 <> 5 M€",0),
    R("Patrimoine 5 <> 10 M€",0),R("Patrimoine > 10 M€",0),R("Établie par le client",0)
  ];
  return {
    id:uid(), titre:"DEVIS LMNP — LOUEUR MEUBLÉ NON-PROFESSIONNEL", desc:"ANNUEL", statut:"publie",
    cats:["Comptabilité","Fiscalité","Social"],
    tva:20, devise:"EUR", per:"annuelle", lmId:null,
    sourceVersion:MODEL_LMNP_VERSION, sourceLabel:"lmnp.pdf — paramétrage cabinet transmis le 29/08/2026",
    calcSource:"lmnp.pdf fourni par le cabinet", calcVersion:MODEL_LMNP_VERSION,
    sections:[
      SEC("Votre cabinet d'expertise-comptable","Présentation",[
        I("Présentation du cabinet","paragraphe",{prix:false,html:
`**{{cabinet.nom}} Expertise Comptable — Votre partenaire en matière de gestion et de performance financière**

- **Expertise & conseil** : un accompagnement rigoureux en comptabilité, fiscalité et gestion financières dans le but de sécuriser votre activité.
- **Solutions sur mesure** : création d'entreprise, suivi comptable & juridique, consolidation, assistance à la direction financière.
- **Proximité & engagement** : un interlocuteur dédié, des conseils adaptés et un suivi réactif pour vous aider à piloter votre entreprise en toute sérénité.

Notre mission : optimiser votre gestion, anticiper vos enjeux et vous accompagner vers une croissance maîtrisée.`}),
        I("Présentation du LMNP","paragraphe",{prix:false,html:
`La location en Loueur Meublé Non Professionnel est un régime fiscal permettant d'investir dans l'immobilier tout en bénéficiant d'une fiscalité plus avantageuse que la location nue : réductions d'impôts et possibilité de récupérer la TVA.

Un investissement en LMNP est un investissement de type immobilier locatif, consistant à acheter un bien exclusivement dans le but de le louer. Le bien loué devra être considéré comme meublé, c'est-à-dire être équipé de manière à répondre aux besoins essentiels des locataires qui devront pouvoir y vivre avec leurs seuls effets personnels.`})
      ]),
      SEC("Présentation de l'activité","Présentation",[
        I("Vous louez","liste",{cle:"biens_loues",prix:false,reponses:biensRep}),
        I("Chiffre d'affaires annuel TTC","liste",{cle:"ca_lmnp",prix:false,reponses:ca.map(x=>R(x,0))}),
        I("Forme juridique","texte",{prix:false}),
        I("Régime fiscal","ouinon",{cle:"is",prix:false,reponses:[
          (()=>{const r=R("IR",0);r.n=0;return r;})(),
          (()=>{const r=R("IS",0);r.n=1;return r;})()
        ]}),
        I("Date de début de la mission","texte",{prix:false}),
        I("Date de clôture","texte",{cle:"cloture",prix:false})
      ]),
      SEC("Accompagnement en comptabilité et fiscalité","Comptabilité",[
        I("Enregistrement des opérations comptables","liste",{per:"annuelle",reponses:[
          RB("Par le cabinet","biens_loues",[0,500,650,800,950,1100,1250,1400,1550,1700,1850])
        ]}),
        I("Établissement du dossier du centre de gestion","ouinon",{per:"annuelle",reponses:[
          R("Non",0),R("Oui",0)
        ]}),
        I("Établissement de la liasse fiscale","ouinon",{per:"annuelle",reponses:[
          R("Non",0),R("Oui",0)
        ]}),
        I("Établissement des déclarations de TVA","liste",{per:"annuelle",reponses:[
          R("Non applicable",0),R("TVA simplifiée",0),R("TVA semestrielle",0),R("TVA trimestrielle",0)
        ]}),
        I("Déclaration de revenus (IRPP uniquement n°2042)","ouinon",{per:"annuelle",reponses:[
          R("Non",0),R("Oui",0)
        ]}),
        I("Déclaration IFI","liste",{per:"annuelle",reponses:ifi})
      ]),
      SEC("Accompagnement en social","Social",[
        I("Échéancier des cotisations TNS","ouinon",{per:"annuelle",reponses:[
          R("Par le client",0),R("Par le cabinet",0)
        ]})
      ]),
      SEC("Modalités de facturation et de règlement","Présentation",[
        I("Périodicité de facturation","liste",{cle:"periodicite_facturation",prix:false,reponses:[
          R("À renseigner",0),R("Annuelle",0),R("Semestrielle",0),R("Trimestrielle",0),R("Mensuelle",0)
        ]}),
        I("Modalité de règlement","liste",{cle:"modalite_reglement",prix:false,reponses:[
          R("Par prélèvement",0),R("Par chèque",0),R("Par virement",0)
        ]}),
        I("Conditions particulières","paragraphe",{prix:false,html:""})
      ]),
      SEC("Notre cabinet vous accompagne pour la gestion de vos LMP / LMNP","Présentation",[
        I("Accompagnement immobilier","paragraphe",{prix:false,html:
`Nous sommes à vos côtés pour gérer votre Location Meublée et anticiper l'avenir de votre portefeuille immobilier.`})
      ])
    ],
    exc:[
      {id:uid(),label:"Frais de paramétrage dossier comptable",cat:"Comptabilité",prix:130,tva:20,com:"Conformité LAB (Lutte Anti-Blanchiment), création et paramétrage du dossier."},
      {id:uid(),label:"Frais de paramétrage dossier social",cat:"Social",prix:249,tva:20,com:"Création, paramétrage dossier, adhésion aux organismes sociaux."},
      {id:uid(),label:"Frais de télédéclarations EDI TDFC",cat:"Comptabilité",prix:58,tva:20,com:"Facturé au premier mois de l'exercice."}
    ],
    deb:[]
  };
}


