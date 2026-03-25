# 🚀 BALTIC SUPER-MARKETPLACE: REALIZĒŠANAS PLĀNS

Šis dokuments kalpo kā galvenais projekta izstrādes ceļvedis (Master Specification & Roadmap).

## ETAPS 1: Infrastruktūras Bāze un Datu Arhitektūra (1. mēnesis)
*Mērķis: Uzstādīt drošu, mērogojamu pamatu un datubāzes struktūru, kas atbalstīs gan Web, gan Mobile platformas.*

*   **1.1. Repozitoriju un CI/CD uzstādīšana**
    *   Izveidot Monorepo arhitektūru.
    *   Uzstādīt **Next.js (App Router)** Web versijai un **React Native (Expo)** iOS/Android lietotnēm.
    *   Konfigurēt Vercel (Frontend) un Supabase (Backend/DB) automatizētai koda publicēšanai.
*   **1.2. Datubāzes (PostgreSQL) un Datu Modeļa izveide**
    *   Izveidot relāciju tabulas pamatdatiem (Core Data: ID, cena, lokācija, statuss).
    *   Izveidot **JSONB** kolonnas specifiskajiem atribūtiem (Auto un NĪ), lai nodrošinātu nākotnes mērogojamību.
    *   Iestrādāt **"Sniper / Early Access"** laika zīmogu loģiku (`created_at` un `public_at = created_at + 15 min`).
*   **1.3. Autentifikācijas un Lomu sistēma**
    *   Integrēt Supabase Auth (Reģistrācija ar OTP SMS un sociālajiem tīkliem).
    *   Izveidot lomu bāzētu piekļuvi (RBAC): Viesis, Reģistrēts (C2C), Verificēts, B2B (Uzņēmums), Moderators, Admin.

## ETAPS 2: B2B Ekosistēma un Satura Agregācija (2. mēnesis)
*Mērķis: Izveidot rīkus, lai dīleri un aģentūras varētu automātiski piepildīt platformu ar sludinājumiem pirms publiskās palaišanas.*

*   **2.1. B2B Kontu un Verifikācijas modulis**
    *   Izveidot "Pro" uzņēmuma konta reģistrāciju (1 login per company MVP fāzē).
    *   Integrēt Lursoft/Rekvizitai.lt API automātiskai uzņēmuma datu un PVN statusa pārbaudei.
*   **2.2. XML/API Importa Dzinējs**
    *   Izstrādāt skriptus un API galapunktus masveida sludinājumu importam no dīleru/aģentūru noliktavu sistēmām.
    *   Izveidot datu kartēšanas (mapping) loģiku, lai ārējos datus pielāgotu mūsu JSONB struktūrai.
*   **2.3. B2B "Pro" Panelis un Rēķini**
    *   Izveidot B2B informācijas paneli (Dashboard) ar statistiku (skatījumi, "Click-to-reveal" telefona atvēršanas reizes).
    *   Integrēt Stripe B2B abonementu (SaaS fee) un "Pay-per-listing" apjoma atlaižu (Tiers) rēķinu automātiskai izrakstīšanai.
    *   Pievienot "Premium Pircēja Abonementa" (49 EUR/mēn) iegādes iespēju "Sniper" 15 minūšu agrīnajai piekļuvei.

## ETAPS 3: C2C Pieredze, UX/UI un AI Integrācija (3.-4. mēnesis)
*Mērķis: Izveidot "Clean & Trustworthy" lietotāja saskarni un integrēt AI rīkus maksimālai ērtībai.*

*   **3.1. Galveno Lapu Karkass (Web & Mobile)**
    *   **Sākumlapa:** "Kategoriju stils" (Directory-first) ar skaidriem blokiem, Social Proof joslu un "Karsto izsoļu" slīdritni.
    *   **Sludinājuma lapa:** "Immersive" dizains (Airbnb stils) ar edge-to-edge attēlu galeriju, skaidru Action Bar (Rakstīt, Piedāvāt, Rādīt numuru) un Pārdevēja Trust Card.
    *   **Navigācija:** Mobilajās ierīcēs ieviest uz darbību vērstu apakšējo joslu ar izceltu "Pievienot" pogu centrā.
*   **3.2. "Step-by-step" Sludinājumu Vednis un API Integrācijas**
    *   Izveidot 5 soļu ievades vedni.
    *   **Auto:** Integrēt autoDNA/carVertical API (Datu automātiska aizpilde pēc VIN/Numura zīmes).
    *   **NĪ:** Integrēt Google Maps API (Adrešu autocomplete, precīzas Lat/Lng koordinātas).
*   **3.3. AI Tekstu Ģenerators un Cenas Rekomendācija**
    *   Integrēt OpenAI/Gemini API, kas no VIN datiem un lietotāja atzīmēm uzģenerē profesionālu pārdošanas tekstu.
    *   Izveidot algoritmu, kas aprēķina un iesaka "Tirgus vidējo cenu".
*   **3.4. AI Post-Moderācijas Dzinējs (The Shield)**
    *   Izveidot fona procesu: tiklīdz sludinājums publicēts, AI skenē attēlus (Reverse image search, NSFW) un tekstu (aizliegti vārdi, neadekvāta cena).
    *   Ja Risk Score > 70%, automātiski paslēpt sludinājumu un nosūtīt uz Admin paneļa "Moderatora rindu".

## ETAPS 4: Tirdzniecības Dzinēji un Droša Saziņa (5.-6. mēnesis)
*Mērķis: Ieviest platformas sarežģītāko biznesa loģiku – izsoles, kaulēšanos un uzticības mehānismus.*

*   **4.1. Uzticības (Trust) Slānis un Smart-ID**
    *   Integrēt Dokobit/Veriff API brīvprātīgai (bet izsolēm obligātai) Smart-ID/BankLink verifikācijai.
    *   Pievienot "Verified" zaļo ķeksīti profilam un algoritmā piešķirt SEO prioritāti verificētiem sludinājumiem.
*   **4.2. Iekšējais Čats un Phishing Aizsardzība**
    *   Izveidot reāllaika čatu, izmantojot Supabase Realtime (WebSockets).
    *   Iestrādāt AI filtru: Hard-block zināmām krāpnieku saitēm (viltus kurjeri) un Soft-warning sarkanus banerus uz atslēgvārdiem ("pārskaiti avansu").
    *   Izveidot "Click-to-reveal" telefona numura loģiku (pēc noklusējuma slēpts).
*   **4.3. "Make an Offer" Dzinējs**
    *   Izveidot privāto piedāvājumu plūsmu čatā (Accept / Decline / Counter-offer).
    *   Izveidot publisko "Social Proof" logrīku sludinājuma lapā (piem., "3 piedāvājumi 24h laikā. Augstākais noraidītais: 8500 EUR").
*   **4.4. Izsoļu Dzinējs (Auction Engine)**
    *   **Stripe Hold:** Integrēt Stripe, lai iesaldētu 50 EUR depozītu pirms pirmās likmes veikšanas.
    *   **Concurrency Control:** Ieviest PostgreSQL Pessimistic Locking (`FOR UPDATE`), lai novērstu dubultas likmes pēdējās sekundēs.
    *   **Soft Close:** Ieprogrammēt taimera automātisku pagarināšanu par 3 minūtēm, ja likme veikta pēdējās 3 minūtēs.
    *   **Hybrid Reserve Price:** Izveidot slēptās rezerves cenas loģiku ar publisku Red/Green indikatoru ("Rezerves cena nav/IR sasniegta").
    *   **Sodu sistēma:** Automatizēt 50 EUR ieturēšanu (25€ platformai, 25€ pārdevējam) un "Strike" piešķiršanu, ja uzvarētājs atsakās pirkt.

## ETAPS 5: Meklēšana, Tokenomika un Admin Panelis (7. mēnesis)
*Mērķis: Pabeigt lietotāju noturēšanas (Retention) mehānismus un iekšējos pārvaldības rīkus.*

*   **5.1. Zibenīga Meklēšana un Filtri**
    *   Uzstādīt Elasticsearch (vai Algolia/Typesense) un sinhronizēt ar PostgreSQL.
    *   Izveidot Hibrīda UI (Saraksts / Kartītes / Karte).
    *   **Zero Results loģika:** Ja nav rezultātu, rādīt "Saglabāt meklējumu" un "Līdzīgi piedāvājumi" (ārpus filtriem).
    *   **Paziņojumi:** Ieviest saglabāto meklējumu e-pastu/Push sūtīšanu (lietotāja izvēle: Uzreiz vai Reizi dienā).
*   **5.2. Bonusu Ekonomika (Tokenomics)**
    *   Izveidot iekšējo "Wallet" (100 punkti = 1 EUR).
    *   Ieprogrammēt Inflow trigerus: Reģistrācija (+100), Smart-ID (+300), 1. sludinājums (+200), Pārdota izsole (+500).
    *   Ieprogrammēt Referral loģiku (Punkti abiem TIKAI pēc drauga Smart-ID verifikācijas vai 1. sludinājuma).
    *   Ieprogrammēt Outflow loģiku: 100% apmaksa bāzes sludinājumiem, Max 50% apmaksa Premium izcelšanai/Auto-Bump.
    *   **MAU Booster:** Ieprogrammēt 12 mēnešu derīguma termiņu ar automātisku +12 mēnešu pagarinājumu, ja lietotājs ielogojas reizi 90 dienās.
*   **5.3. Sludinājuma Dzīves Cikls**
    *   Ieviest dabisko slīdēšanu uz leju un "Auto-Bump" maksas funkciju.
    *   Izveidot 30 dienu cikla paziņojumus ("Vai vēl pārdodat?") ar automātisku paslēpšanu, ja nav atbildes.
*   **5.4. Pilns Admin Panelis (Backoffice)**
    *   Izveidot CRM moduli (Lietotāju profili, IP, Strikes).
    *   Izveidot Moderācijas rindu (Approve/Ban ar e-pasta paziņojumu).
    *   Izveidot Finanšu un Tokenomikas paneli (Cenu matricas maiņa, punktu emisijas kontrole, KPI mērinstrumenti).

## ETAPS 6: Testēšana, Soft Launch un The Big Bang (8. mēnesis)
*Mērķis: Pārbaudīt sistēmas izturību, iegūt sākotnējo saturu un veikt publisko palaišanu 3 valstīs.*

*   **6.1. Slodzes un Drošības Testēšana (QA)**
    *   Veikt "Stress test" izsoļu dzinējam (simulēt 10 000 vienlaicīgus pieprasījumus pēdējā minūtē).
    *   Pārbaudīt Stripe Hold atbrīvošanas un ieturēšanas automatizāciju.
*   **6.2. Lietotņu Iesniegšana (App Stores)**
    *   Sagatavot un iesniegt React Native (Expo) aplikācijas Apple App Store un Google Play Store (ņemot vērā Apple vadlīnijas par digitālajiem maksājumiem un punktiem).
*   **6.3. B2B Soft Launch (Satura uzpilde)**
    *   Atvērt platformu izvēlētiem B2B partneriem (Dīleriem/Aģentūrām).
    *   Palaist XML importus, lai platformā parādītos pirmie tūkstoši sludinājumu.
*   **6.4. Public Launch (The Big Bang)**
    *   Aktivizēt C2C reģistrāciju.
    *   Palaist mārketinga kampaņas LV, LT, EE ar uzsaukumu: *"Pievienojies jaunajam standartam. Ieliec sludinājumu bez maksas un saņem 500 Bonusa punktus!"*
    *   Palaist pirmās "PR Izsoles" (sadarbībā ar partneriem) trafika ģenerēšanai.
