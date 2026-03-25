# BALTIC SUPER-MARKETPLACE - PRECIZAIS REALIZĀCIJAS PLĀNS

Šis dokuments kalpo kā galvenais projekta izpildes ceļvedis (Roadmap). Tas ir sadalīts secīgos etapos un apakšpunktos, ietverot pilnīgi visas apstiprinātās funkcijas, biznesa loģiku un tehnoloģiskos risinājumus. Plāns ir veidots kā kontrolsaraksts (checklist), lai mēs varētu sekot līdzi progresam.

---

## ETAPS 1: Infrastruktūras Bāze un Datu Arhitektūra
**Mērķis:** Izveidot stabilu, mērogojamu pamatu visām platformas daļām (Web, Mobile, Backend).

- [ ] **1.1. Monorepo un Vides Uzstādīšana**
  - [ ] Next.js (Web) un React Native / Expo (Mobile) repozitoriju inicializācija.
  - [ ] Tailwind CSS un Shadcn UI konfigurācija.
  - [ ] Vercel (Frontend) un CI/CD konveijera uzstādīšana.
- [ ] **1.2. Backend un Datubāzes (Supabase) Konfigurācija**
  - [ ] Supabase projekta izveide (PostgreSQL, Auth, Storage).
  - [ ] Datu bāzes shēmu izstrāde (Users, Listings, Categories, Bids, Messages, Transactions, Points).
  - [ ] RLS (Row Level Security) drošības noteikumu definēšana.
- [ ] **1.3. Meklēšanas Dziņa Integrācijas Pamati**
  - [ ] Elasticsearch (vai Algolia/Typesense) klastera izveide.
  - [ ] Datu sinhronizācijas loģika starp PostgreSQL un meklēšanas dzini.

## ETAPS 2: Autentifikācija un "Trust" Sistēma
**Mērķis:** Ieviest drošu lietotāju reģistrāciju un verifikāciju, atdalot C2C un B2B lietotājus.

- [ ] **2.1. Pamata Autentifikācija**
  - [ ] Obligātā SMS reģistrācija / pieteikšanās (Twilio integrācija).
  - [ ] Lietotāja profila izveide (Vārds, kontakti, iestatījumi).
- [ ] **2.2. Padziļinātā Verifikācija (Smart-ID / BankLink)**
  - [ ] Dokobit (vai alternatīva) API integrācija Smart-ID un BankLink atbalstam.
  - [ ] Verifikācijas statusa ("Verified Badge") piešķiršana profilam.
  - [ ] Bonusa punktu (+300) piešķiršanas loģika par veiksmīgu verifikāciju.
- [ ] **2.3. Lietotāju Lomu Sistēma**
  - [ ] C2C (Privātpersonas) un B2B (Uzņēmumi) lomu atdalīšana datubāzē.

## ETAPS 3: Sludinājumu Sistēmas Kodols (Auto un NĪ)
**Mērķis:** Izveidot pilnu sludinājumu pievienošanas un attēlošanas ciklu.

- [ ] **3.1. Kategoriju un Atribūtu Koks**
  - [ ] Auto kategorijas datu modelis (Marka, modelis, gads, nobraukums, dzinējs utt.).
  - [ ] NĪ kategorijas datu modelis (Tips, platība, istabas, stāvs, ērtības utt.).
- [ ] **3.2. Sludinājuma Pievienošanas Plūsma (Multi-step)**
  - [ ] Dinamiskas formas izveide atkarībā no izvēlētās kategorijas.
  - [ ] Attēlu augšupielāde, kompresija un saglabāšana (Supabase Storage).
  - [ ] autoDNA API integrācija (VIN koda automātiska atpazīšana un datu ielāde).
- [ ] **3.3. Sludinājuma Skats (Listing Details)**
  - [ ] Attēlu galerijas un informācijas bloku izstrāde.
  - [ ] Pārdevēja informācijas bloks (ar "Click-to-reveal" telefona numuru).
  - [ ] Publiskais "Social Proof" (Skatījumu skaits, saglabāto reižu skaits).

## ETAPS 4: Meklēšana, Filtri un AI Integrācija
**Mērķis:** Nodrošināt ātru, precīzu meklēšanu un AI atbalstu satura kvalitātei.

- [ ] **4.1. Paplašinātā Meklēšana un Hibrīda UI**
  - [ ] Detalizētu filtru izstrāde (Cena, gads, platība utt.).
  - [ ] Skatu pārslēgšana: Saraksts / Kartītes / Karte (Google Maps API integrācija NĪ).
  - [ ] "Zero Results" stratēģija (Poga "Saglabāt meklējumu un saņemt paziņojumus").
- [ ] **4.2. AI Asistents (OpenAI / Gemini Integrācija)**
  - [ ] Auto sludinājumu aprakstu automātiska ģenerēšana no parametriem.
  - [ ] Automātiska sludinājumu tulkošana (LV, LT, EE, EN, RU).
- [ ] **4.3. AI Post-Moderācija**
  - [ ] Attēlu analīze (NSFW satura bloķēšana, kvalitātes pārbaude).
  - [ ] Teksta analīze (Aizliegto vārdu, neadekvātu cenu filtrēšana fonā).

## ETAPS 5: Komunikācija un "Make an Offer"
**Mērķis:** Droša pircēju un pārdevēju saziņa platformas iekšienē.

- [ ] **5.1. Reāllaika Čats**
  - [ ] Supabase Realtime WebSockets integrācija ziņojumiem.
  - [ ] Čata saskarnes izstrāde (Inbox, aktīvās sarunas).
  - [ ] AI Phishing aizsardzība (Aizdomīgu saišu un krāpniecības frāžu detektēšana, brīdinājumi).
- [ ] **5.2. "Make an Offer" Sistēma**
  - [ ] Pircēja plūsma: Anonīma cenas piedāvājuma iesniegšana.
  - [ ] Pārdevēja plūsma: Piedāvājuma apstiprināšana, noraidīšana vai pretpiedāvājums.
  - [ ] Publiskā indikācija sludinājumā (Piem., "Saņemti 3 piedāvājumi").

## ETAPS 6: Izsoļu Sistēma
**Mērķis:** Ieviest pilnvērtīgu, reāllaika izsoļu mehāniku ar finansiālu drošību.

- [ ] **6.1. Izsoles Izveide un Loģika**
  - [ ] Sākuma cenas, minimālā soļa un rezerves cenas (Reserve Price) iestatīšana.
  - [ ] Atklātās rezerves cenas indikators (Sarkans/Zaļš atkarībā no tā, vai sasniegta).
- [ ] **6.2. Reāllaika Solīšana un "Soft Close"**
  - [ ] Reāllaika likmju atjaunošana visiem lietotājiem (WebSockets).
  - [ ] "Soft Close" mehānisms (Automātisks 3 minūšu pagarinājums pēc pēdējās likmes).
- [ ] **6.3. Drošība un Maksājumi Izsolēs**
  - [ ] Obligāta Smart-ID verifikācija, lai piedalītos izsolē.
  - [ ] Stripe Hold integrācija (50 EUR depozīta rezervācija pirms solīšanas).
  - [ ] Uzvarētāja noteikšana un automātiska rēķina/komisijas ģenerēšana.

## ETAPS 7: Monetizācija, B2B Rīki un Tokenomika
**Mērķis:** Ieviest platformas peļņas modeļus un lojalitātes sistēmu.

- [ ] **7.1. Maksājumu Sistēma (Stripe)**
  - [ ] Stripe Checkout integrācija (Kartes, Apple Pay, Google Pay).
  - [ ] Maksas pakalpojumu loģika (Papildu sludinājumi, izcelšana, pacelšana).
- [ ] **7.2. Punktu Sistēma (Tokenomics C2C lietotājiem)**
  - [ ] Iekšējās valūtas loģika (100 Punkti = 1 EUR).
  - [ ] Punktu pelnīšanas trigeri (Reģistrācija, sludinājumi, izsoles).
  - [ ] Punktu tērēšanas loģika (100% apmaksa par sludinājumu, max 50% par izcelšanu).
  - [ ] Dinamiskais derīguma termiņš (12 mēneši, pagarinās pie aktivitātes).
- [ ] **7.3. B2B "Pro" Rīki un Abonementi**
  - [ ] B2B SaaS abonementu plānu izveide (Stripe Billing).
  - [ ] XML/API datu importa rīks masveida sludinājumu pievienošanai.
  - [ ] "Sniper / Early Access" funkcija (15 minūšu agrīna piekļuve jauniem sludinājumiem).

## ETAPS 8: Admin Panelis un Pārvaldība
**Mērķis:** Nodrošināt platformas īpašniekiem pilnu kontroli pār sistēmu.

- [ ] **8.1. Satura un Lietotāju Pārvaldība**
  - [ ] Lietotāju saraksts, bloķēšana, lomu maiņa.
  - [ ] Sludinājumu un izsoļu manuāla rediģēšana/dzēšana.
- [ ] **8.2. Moderācija un Finanses**
  - [ ] AI atzīmēto (flagged) sludinājumu un čatu manuālās pārbaudes rinda.
  - [ ] Finanšu atskaites (Stripe ienākumi, izsniegtie punkti, izsoļu komisijas).
- [ ] **8.3. Analītikas Panelis**
  - [ ] Galveno KPI atspoguļošana (MAU, jauni sludinājumi, konversijas).

## ETAPS 9: Mobilās Lietotnes (React Native) Pabeigšana
**Mērķis:** Nodrošināt nevainojamu pieredzi iOS un Android lietotājiem.

- [ ] **9.1. UI/UX Pielāgošana**
  - [ ] Navigācijas un skatu optimizācija skārienekrāniem.
  - [ ] Kameras un foto galerijas natīvā integrācija sludinājumu pievienošanai.
- [ ] **9.2. Push Paziņojumi**
  - [ ] Integrācija ar Firebase Cloud Messaging (FCM) vai Expo Push Notifications.
  - [ ] Paziņojumi par jauniem čata ziņojumiem, pārsolīšanu izsolēs, saglabātajiem meklējumiem.
- [ ] **9.3. Publicēšana**
  - [ ] Sagatavošanās App Store un Google Play Store prasībām.

## ETAPS 10: Testēšana, QA un "The Big Bang" Palaišana
**Mērķis:** Pārbaudīt sistēmas stabilitāti un veikt veiksmīgu relīzi 3 valstīs.

- [ ] **10.1. Kvalitātes Kontrole (QA)**
  - [ ] End-to-End (E2E) testēšana visām kritiskajām plūsmām (Maksājumi, Izsoles, Čats).
  - [ ] Slodzes testēšana (Load testing) reāllaika izsolēm un meklēšanai.
- [ ] **10.2. Drošības un Lokalizācijas Audits**
  - [ ] Smart-ID un Stripe integrāciju drošības pārbaude.
  - [ ] Visu tulkojumu (LV, LT, EE, EN, RU) un valūtu/nodokļu formātu pārbaude.
- [ ] **10.3. "The Big Bang" Palaišana**
  - [ ] Produkcijas (Production) vides uzstādīšana un domēnu konfigurācija.
  - [ ] Mārketinga kampaņu sinhronizācija ar platformas atvēršanu.
  - [ ] Platformas atvēršana lietotājiem!

---
*Šis fails tiks izmantots kā galvenais atskaites punkts (Source of Truth) visā izstrādes ciklā.*
