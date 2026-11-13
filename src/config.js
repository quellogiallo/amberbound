// Impostazioni principali del gioco "Ambra". Qui puoi cambiare numeri e file audio senza toccare il resto.
window.PZ = window.PZ || {};

PZ.CONFIG = {
  // Colori usati anche dal ragazzo e dalla bicicletta (presi dal videoclip: non cambiarli)
  colori: {
    nero: 0x02040a, bluNotte: 0x0a1634, bluOrizzonte: 0x16295a, nebbia: 0x0c1838,
    grigioFreddo: 0x8fa0c4, lunaChiara: 0xe3ebff, giallo: 0xe4ff1a
  },
  tremolioVertici: false,
  schermo: { larghezzaInterna: 360, altezzaInterna: 640 },   // formato verticale 9:16, ingrandito a pixel netti

  // AUDIO. Per usare un tuo suono per la scatola musicale: metti il file nella cartella "audio" e scrivi qui il nome,
  // per esempio  scatolaMusicale: 'audio/scatola-musicale.mp3'.  Con null suona un suono di prova generato dal gioco.
  // (fase 28) COLONNA SONORA della corsa: "AMBRA e OCCHI ADDOSSO" (versione videogioco), dal secondo 3:52 della canzone
  // (file audio/colonna-corsa.mp3: il suo secondo 0 è 3:52). loopDa/loopA: il loop, in secondi del file (4:02.290 e
  // 7:27.090 della canzone = 64 battute a 75 BPM); battito0: un battere (per lampioni, insegne e frammenti a tempo).
  // volume: rispetto al volume generale (la musica è protagonista).
  audio: { colonna: { file: 'audio/colonna-corsa.mp3', loopDa: 10.29, loopA: 215.09, bpm: 75, battito0: 10.29, volume: 0.759 },
    // (fase 35) il pezzo a parte della O Ave Maria è tolto (null): durante il volo continua la colonna principale
    aveMaria: null, volumeAveMaria: 0.475,
    // (fase 42) la musica della cameretta (loop cupo); (fase 43) mentre suona il carillon si interrompe
    cameretta: { file: 'audio/cameretta-loop.mp3', volume: 0.49 },   // (fase 44) -18%
    // (fase 36) il finale sulla scogliera: Pezzidicarne da 2:44 (rallentato come un nastro se la scena dura di più)
    finale: 'audio/pezzidicarne-finale.mp3', volumeFinale: 0.6,
    scatolaMusicale: 'audio/carillon.mp3', volumeCarillon: 0.3,   // (fase 24) carillon al 30%
    volume: 0.8,
    // (fase 14) il colpo d'orchestra con l'archetto che stride: quando compare il demone nella scena iniziale e nel
    // jumpscare quando ti prende. Per cambiarlo metti un altro file nella cartella "audio" e scrivi qui il nome.
    stingerDemone: 'audio/demone-stinger.mp3', volumeStinger: 0.95,
    // PARANOIA (src/strada/paranoia.js): oggi i bisbigli, i respiri, la risatina e il suono del jumpscare sono SINTETICI
    // (rumore filtrato e onde generate dal browser: non sono voci vere). Per usare registrazioni vere metti i file nella
    // cartella audio/paranoia/ e scrivi qui i nomi, per esempio
    //   bisbigli: ['audio/paranoia/bisbiglio1.mp3', 'audio/paranoia/bisbiglio2.mp3'],
    // Con le liste vuote (e jumpscare: null) il gioco non cerca nessun file e usa i suoni sintetici.
    paranoia: { bisbigli: [], respiri: [], risate: [], jumpscare: null } },

  // (fase 60) I PENSIERI DEL PROTAGONISTA, scritti sotto gli oggetti della cameretta guardati da vicino.
  // Si possono cambiare qui liberamente (sigaretteDopo: dopo la sagoma nera che compare per un attimo)
  pensieri: {
    sveglia: 'Le lancette si sono bloccate nel momento in cui lei è finita a terra.',
    sigarette: 'Le sue. Diceva sempre che avrebbe smesso a gennaio. Ogni gennaio.',
    sigaretteDopo: 'Una sagoma nera, dietro il pacchetto. Poi niente.',
    carillon: 'Avrei impedito a chiunque di portarti via, persino al tempo stesso.',
    pietra: 'È calda, come se respirasse. In un angolo c\'è una macchia rossa che non va via. Adesso lei resterà mia per sempre.',
    telefono: 'Sua madre continua a scriverle. Nessuno le ha ancora detto niente.',
    felpa: 'Gliel\'avevo regalata io. Profuma ancora di lei.'
  },

  // Movimento
  giocatore: { velocita: 1.7, raggio: 0.27 },
  // Distanza (in metri) entro cui compare "INTERAGISCI"
  interazione: { raggio: 1.15 },

  // STRADA (scena 2): scena iniziale e corsa in bicicletta a tre corsie inseguiti dal demone
  strada: {
    larghezzaCorsia: 1.8,      // metri
    distanzaComparsa: 100,     // auto e transenne compaiono così lontano (nella foschia) e si avvicinano
    durataCambioCorsia: 0.24,  // secondi per passare da una corsia all'altra
    campoVisivo: 66,           // apertura della telecamera (gradi)
    intro: true,               // false = niente scena iniziale (si parte subito in bici)

    // DIFFICOLTÀ (tutto in un posto solo; la usa src/strada/difficolta.js). Cresce senza scatti in tre fasi:
    //  APPRENDIMENTO: i primi secondi restano ai valori iniziali (si prende confidenza con le corsie);
    //  PRESSIONE e FUGA: da apprendimento a tempoMassimo la difficoltà sale da 0 a 1, prima in fretta e poi più piano
    //    (curva: più alto = parte più piano); velocità, frequenza degli ostacoli, auto doppie, transenne e sagome;
    //  OLTRE: dopo tempoMassimo la velocità continua a crescere piano fino a velocitaOltre (in tempoOltre secondi).
    // Il generatore controlla sempre che ogni sequenza sia superabile, a qualsiasi velocità.
    difficolta: {
      velocitaIniziale: 9,     // m/s della bici all'inizio (circa 32 km/h)...
      velocitaMassima: 17.5,   // ...alla massima difficoltà (circa 63 km/h)...
      velocitaOltre: 20.5,     // ...e nella fase 4 (76-100 frammenti) fino a qui (74 km/h)
      // FASE 7: la velocità VERA della bici segue i METRI percorsi (non i frammenti). [metri, m/s]: si parte a 43 km/h
      // (fase 8: niente tratto lento), a 300 m circa 49 km/h, poi sale in fretta; a 750 m circa 63 km/h; a 1.500 m 100 km/h; poi continua a salire
      // di "oltre" m/s ogni metro, SENZA limite (a 2.500 m circa 132 km/h). (velocitaMassima e velocitaOltre qui sopra
      // non decidono più la velocità: restano per il campo visivo della telecamera.)
      // (fase 8: avvio rapido) si parte subito a 43 km/h, niente tratto lento all'inizio
      velocitaMetri: { punti: [[0, 12], [300, 13.6], [750, 17.5], [1500, 27.8]], oltre: 0.009 },
      apprendimento: 4,        // secondi iniziali senza aumenti
      tempoMassimo: 75,        // secondi per arrivare alla massima difficoltà
      tempoOltre: 90,          // secondi per passare da velocitaMassima a velocitaOltre
      curva: 0.9,              // sotto 1: la difficoltà sale subito in fretta
      velocitaAuto: 7,         // m/s delle auto che vengono incontro (crescono in proporzione alla bici)
      intervalloIniziale: [1.45, 2.3],  // secondi tra un gruppo di ostacoli e il successivo all'inizio...
      intervalloFinale: [0.66, 1.05],   // ...e alla massima difficoltà (più frequenti)
      doppieIniziali: 0.3, doppieFinali: 0.8,                  // probabilità di due auto affiancate
      transenne: { da: 3, iniziale: 0.26, finale: 0.5 },       // da quanti secondi compaiono e probabilità per gruppo
      sagome: { da: 12, iniziale: 0.1, finale: 0.24 },         // la ragazza in piedi che sbarra una corsia
      // FASE 6: la difficoltà segue i FRAMMENTI raccolti (src/strada/difficolta.js). punti = [frammenti, difficoltà]:
      // fase 1 (0-25) fino a 0,3; fase 2 (26-50) fino a 0,58; fase 3 (51-75) fino a 0,85; fase 4 (76-100) fino a 1.
      // tempo = quanto conta il tempo di corsa (al massimo il 35%). pause = ogni quante file una pausa (inizio, fine)
      // e quanto dura in più (s); calda = corsia "pericolosa" per qualche fila (ogni quante file, quante file, peso);
      // cambia = quanto si preferiscono file che chiudono la corsia libera della fila prima (costringono a spostarsi)
      frammenti: { punti: [[0, 0], [25, 0.3], [50, 0.58], [75, 0.85], [92, 1]], tempo: 0.35 },
      // (fase 57) FRENESIA, solo nella storia: dai 15 frammenti ai 100 la bici va fino al +20% più veloce e le file
      // di ostacoli arrivano fino al +25% più fitte (sale morbida, nessuno scatto)
      frenesia: { da: 15, a: 100, velocita: 0.2, ostacoli: 0.25 },
      // (fase 64) +13% di difficoltà in TUTTA la storia (non nell'arcade): file di ostacoli più vicine del 13%, bici
      // più veloce del 6%. I frammenti per fila calano in proporzione, così in tutto restano gli stessi
      // (fase 69) -8% di difficoltà nella storia: i due valori di prima (1,06 e 1,13) moltiplicati per 0,92
      // -> bici 2,5% più lenta della base, file di ostacoli 4% più fitte della base (prima +6% e +13%)
      storia: { velocita: -0.025, ostacoli: 0.04 },
      pause: { ogni: [[9, 14], [15, 21]], durata: [2.4, 1.2] },
      calda: { ogni: 11, file: [3, 6], peso: 2.2, da: 0.25 },
      cambia: 1.3,
      // FASE 9: da 50 frammenti più ostacoli, fino al pieno a 75: file più vicine (file = quanto si accorcia l'intervallo,
      // 0,2 = 20%), più auto doppie e più transenne (probabilità in più)
      // (menoFrammenti: ogni fila offre fino al 10% di frammenti in meno, così con più file i frammenti non aumentano)
      dopo50: { da: 50, pieno: 75, file: 0.2, doppie: 0.3, transenne: 0.06, menoFrammenti: 0.1 },
      apparizioni: { da: 8, iniziale: 0.05, finale: 0.25 }      // sagome solo da vedere: quante al secondo
    },

    // IL FANTASMA DELLA RAGAZZA: in piedi (saluta, ti fissa, ti tende le braccia) al posto delle sagome che sbarrano
    // una corsia; a terra (seduta, in ginocchio, rannicchiata: si salta) al posto di una transenna in una parte delle
    // file con transenne. salto = probabilità per fila con transenne; pausa = secondi minimi tra una ragazza e l'altra.
    // daMetri: la ragazza come ostacolo compare solo dopo questi metri di corsa
    ragazza: { salto: 0.3, pausa: 9, daMetri: 750 },
    // la luna in fondo alla strada: inizia a girarsi a gira[0] metri e mostra tutto il volto a gira[1]; poi il ghigno
    // si allarga da ghigno[0] a ghigno[1] metri
    luna: { gira: [1100, 1700], ghigno: [1600, 2800] },

    // EVENTI (src/strada/eventi.js). Diventano più frequenti e più lunghi con la difficoltà; mai due insieme.
    //  BLACKOUT: la città si spegne per qualche secondo (restano fari, lampeggianti, occhi, la luce della bici).
    //  SENSI DI COLPA: scritta, lacrime sullo schermo, vista appannata e comandi destra/sinistra invertiti, sempre.
    // daMetri: prima di questi metri nessun evento; primoDopo: secondi [da, a] tra quel momento e il primo evento;
    // ogni: secondi tra un evento e il successivo dello stesso tipo [inizio, massima difficoltà];
    // durata: secondi [inizio, massima difficoltà]
    eventi: {
      daMetri: 520,
      primoDopo: [2, 5],
      // (fase 59) max = quante volte al massimo per run
      blackout: { ogni: [42, 24], durata: [3.5, 6.5], max: 3 },
      colpa: { ogni: [34, 19], durata: [3.2, 5.5], max: 3 },
      pausa: 6                 // secondi minimi tra la fine di un evento e l'inizio del successivo
    },

    // FRAMMENTI D'AMBRA da raccogliere correndo: a obiettivo si sblocca il finale sulla scogliera.
    // Probabilità per ogni fila di ostacoli: scia = una fila di frammenti in una corsia libera (facili);
    // salto = un frammento in alto sopra una transenna (si prende solo saltando); rischio = uno accanto a un'auto
    // o a una sagoma, o subito dopo un'auto nella stessa corsia (più difficile, mai obbligatorio).
    // cambio = (quando non c'è la scia) una fila che a metà passa nella corsia accanto: invita a cambiare corsia
    // FASE 6: con la difficoltà le scie facili (una corsia, tanti frammenti) si fanno più rare e corte e crescono quelli
    // che chiedono un cambio di corsia o un rischio: scia/sciaMax/cambio/rischio = [all'inizio, alla massima difficoltà]
    // (fase 9: circa il 17% di frammenti in meno: prima scia [0.5, 0.22], sciaMax [4, 2], cambio [0.5, 0.75], salto 0.85, rischio [0.4, 0.7])
    // (fase 58) quanti: 0.84 = il 16% di frammenti in meno in strada (l'obiettivo resta 100)
    frammenti: { quanti: 0.84, obiettivo: 100, scia: [0.42, 0.18], sciaMax: [4, 2], passoScia: 0.24, cambio: [0.42, 0.62], salto: 0.7, rischio: [0.33, 0.58] },

    // PARANOIA (src/strada/paranoia.js): l'intensità segue la vicinanza del demone. da = metri prima dei quali non succede
    // niente; ragazzaDa = da qui la ragazza può comparire come allucinazione; jumpscareDa = da qui il jumpscare è
    // possibile; pausaJumpscare = secondi minimi [da, a] tra un jumpscare e il successivo
    paranoia: { da: 150, ragazzaDa: 350, jumpscareDa: 800, jumpscareSicuro: 1100,   /* (fase 65) a 1.100 m ne parte uno se non c'è ancora stato */ pausaJumpscare: [35, 75] },

    // OROLOGIO DALINIANO (src/strada/orologio.js): raro. probabilita = che in una partita ce ne sia almeno uno; primo =
    // tra quanti secondi di corsa [da, a]; secondo = probabilità di un secondo orologio, distanza = quanti secondi dopo
    // il primo [da, a]. Mai più di 2 per partita. Raccolto: per "durata" secondi VERI il mondo va a "lento" (0,15 = 15%
    // della velocità normale); per i primi "gelo" secondi il mondo è quasi fermo (gelo = velocità in quell'attimo).
    // Il demone, intanto, perde terreno: "demoneFuga" metri al secondo, fino a "demoneMax" metri oltre la sua distanza.
    // La città diventa gialla e nera e si scioglie (src/strada/sciogli.js).
    // attivo: false = RIMOSSO dal gioco (non compare mai; il codice resta, pronto per un nuovo potere o per rimetterlo)
    // LA MANATA DEL DEMONE (src/strada/manata.js): da "da" frammenti in su; la prima dopo prima[0..1] secondi, poi una
    // ogni pausa[0..1] secondi (dopo "fase4" frammenti ogni pausa4: più spesso). Solo se il generatore la trova superabile.
    // FASE 7: ogni 6-10 s dopo 60 frammenti, ogni 4-7 s dopo 75 (sempre una alla volta: la prossima si conta da quando
    // finisce quella di prima). soloSalto / soloSalto4 = probabilità che la terza corsia sia chiusa da un'auto o da una
    // ragazza: allora l'unico modo di passare è saltare la mano.
    manata: { da: 60, fase4: 75, prima: [2, 4], pausa: [6, 10], pausa4: [4, 7], scala: 1.6, soloSalto: 0.3, soloSalto4: 0.45 },
    // (fase 51) DI NUOVO ATTIVO: compare UNA sola volta per partita, quando hai raccolto tra frammenti[0] e frammenti[1]
    // frammenti (a caso; nell'arcade conta il livello). Per "durata" secondi il mondo va al "lento" (6%: congelato),
    // il ragazzo no; la colonna sonora rallenta come un nastro fino a "nastro" (50%)
    orologio: { attivo: true, frammenti: [60, 70], durata: 5, lento: 0.06, nastro: 0.5,
      gelo: [0.2, 0.015], demoneFuga: 3.6, demoneMax: 13 },

    // O AVE MARIA (src/strada/salvia.js): da 2 a 4 per partita, nella storia mai più di 3 (quante = probabilità di 2, 3, 4). La prima quando hai
    // raccolto tra il 42% e il 55% dell'obiettivo ("quando"), le altre a caso tra il 30% e il 92% ("altre"), distanti
    // almeno "distanza" frammenti. Nascono in punti rischiosi: sopra una transenna ad altezza "altoSalto" (va presa
    // saltando) o accanto a un ostacolo dopo una corsia chiusa (mai in punti tranquilli).
    // Se non la prendi non torna. Presa, la bici vola per "durata" [min, max] secondi VERI (a caso a ogni volo) a
    // "altezza" metri (sopra auto e transenne); "salita" e "discesa" in secondi; finito il tempo scende
    // solo quando la corsia è libera (al massimo "attesaMax" secondi dopo); "grazia": secondi senza urti dopo
    // l'atterraggio ("graziaForzata" se è dovuto scendere in una corsia occupata). In volo il demone resta indietro ("demoneFuga" m/s, fino a "demoneMax" m oltre la sua distanza).
    salvia: { boostBasso: 0.4, basso: 2.0,   // (fase 35) il boost: sul primo colpo di basso della colonna dopo 2 s di volo (+40%)
       attiva: true, quando: [0.42, 0.55], quante: [0.55, 0.43, 0.02, 0],   /* (fase 52) 1 = 55%, 2 = 43%, 3 = 2% (rarissimo) */ altre: [0.3, 0.92], distanza: 12, altoSalto: 2.15,
      durata: [6, 7], altezza: 2.5, salita: 0.55, discesa: 0.9, attesaMax: 3, grazia: 0.3, graziaForzata: 1.2,
      demoneFuga: 2.0, demoneMax: 8 },

    // SALTO: durata in aria (secondi) e altezza massima delle ruote (metri). Le transenne sono alte 0,82 m.
    // Con questi valori il salto riesce se premi SALTA da circa mezzo secondo a un decimo di secondo prima che la
    // transenna arrivi alla ruota davanti (il pulsante si illumina proprio in quel momento).
    salto: { durata: 0.86, altezza: 1.35 },

    // DEMONE che insegue (distanze in metri dietro al ragazzo)
    demone: {
      distanzaIniziale: 28,       // quando parte la corsa
      distanzaStabile: 22,        // se non sbagli resta più o meno qui...
      distanzaMinimaStabile: 13,  // ...e con la difficoltà si avvicina fino a qui (fasi 3 e 4: ti sta addosso)
      distanzaMinima: 8,          // la distanza "stabile" non scende mai sotto questa
      recupero: 0.12,             // quanto in fretta riprendi terreno dopo un errore (più alto = più facile)
      perdite: { auto: 12, transenna: 5, sagoma: 6, manata: 8 },  // metri che guadagna a ogni errore (sagoma = la ragazza in piedi)
      // INVESTITO da un'auto: il demone ti arriva comunque a cattura + margine metri (alle calcagna) e ci resta per
      // durata secondi, al massimo dell'aggressività: un altro errore qualsiasi in quel tempo e ti prende
      investimento: { margine: 2.2, durata: 7 },
      aggressivita: 0.35,         // errori ravvicinati: ognuno gli fa guadagnare il 35% in più
      cattura: 3.5,               // sotto questa distanza ti prende
      dopoCattura: 14,            // dopo averti preso viene respinto fin qui...
      margineRidotto: 4, tempoMargineRidotto: 25   // ...ma per 25 secondi resta 4 m più vicino
    },

    // CLACSON: un'auto ogni ogni[0]-ogni[1] (a caso) suona mentre viene incontro: si sente da "da" metri, sfuma in
    // "dopo" metri dopo che è passata
    clacson: { ogni: [6, 9], da: 70, dopo: 18 },

    // SPECCHIETTO in alto: mostra il demone alle tue spalle quando si avvicina o dopo un errore
    specchietto: { attivo: true, ogniFotogrammi: 3 }
  },

  // SCOGLIERA (finale, dal videoclip Pezzidicarne): quota del mare, la luna (posizione rispetto alla camera, raggio,
  // colore oro) e la direzione della sua luce
  livelloMare: -20,
  luna: { posizione: [-100, 124, -630], raggio: 34, gialla: true },
  luce: { direzione: [-0.15, 0.30, -0.94] },

  // (fase 16) MODALITÀ ARCADE (src/strada/arcade.js): corsa infinita, si sblocca finendo la storia.
  // metriPerLivello: la difficoltà (ostacoli, manata, demone) sale con i metri: ogni tanti metri vale come un frammento
  // della storia (25 = il massimo a 2.500 m); la velocità continua comunque a salire senza limite.
  // Ogni potereOgni (50) frammenti si sceglie un potere: CUORE (una vita in più, al massimo cuoriMax) o FURIA (furia secondi
  // invincibile, sfonda gli ostacoli, il demone resta indietro a demoneFuga m/s, i metri contano doppio).
  // classifica: quanti nomi si vedono (se ne salvano 30, sul dispositivo).
  arcade: { metriPerLivello: 25, potereOgni: 50, cuoriMax: 3, furia: 8, demoneFuga: 4, demoneMax: 14, classifica: 10 },

  // (fase 65) CLASSIFICA ONLINE (src/strada/online.js): le chiavi del progetto Firebase "ambra-7e8ad".
  // Non sono segrete (servono al browser); a proteggere il database sono le regole scritte nella console Firebase.
  firebase: {
    apiKey: 'AIzaSyAV8M0hXTQS8ee0FuQGPB0DmKCxRuTMTS4',
    authDomain: 'ambra-7e8ad.firebaseapp.com',
    projectId: 'ambra-7e8ad',
    storageBucket: 'ambra-7e8ad.firebasestorage.app',
    messagingSenderId: '113979068057',
    appId: '1:113979068057:web:60bd338376cdbfac8e3208'
  },

  // PROVE: true = nella schermata iniziale c'è il pulsante "Prova la strada" (e funziona l'indirizzo #strada).
  // Per la versione finale si può mettere false.
  test: { scorciatoiaStrada: false }
};
