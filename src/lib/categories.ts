export interface CategoryField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  placeholder?: string;
}

export interface SubcategorySchema {
  name: string;
  group?: string;
  fields: CategoryField[];
}

export interface CategorySchema {
  name: string;
  subcategories: Record<string, SubcategorySchema>;
}

const CITIES = ['Rīga', 'Jūrmala', 'Jelgava', 'Liepāja', 'Daugavpils', 'Ventspils', 'Valmiera', 'Rēzekne', 'Jēkabpils', 'Ogre', 'Tukums', 'Sigulda', 'Cēsis', 'Saldus', 'Talsi', 'Bauska', 'Limbaži', 'Cits'];

const RIGA_DISTRICTS = ['Centrs', 'Āgenskalns', 'Aplokciems', 'Berģi', 'Bieriņi', 'Bolderāja', 'Brekši', 'Čiekurkalns', 'Dārzciems', 'Daugavgrīva', 'Dreiliņi', 'Dzegužkalns', 'Grīziņkalns', 'Iļģuciems', 'Imanta', 'Jaunciems', 'Jaunmīlgrāvis', 'Jugla', 'Katlakalns', 'Ķengarags', 'Ķīpsala', 'Klīversala', 'Krasta rajons', 'Kundziņsala', 'Latgales priekšpilsēta', 'Mangaļi', 'Mangaļsala', 'Mežaparks', 'Mežciems', 'Pļavnieki', 'Purvciems', 'Šampēteris-Pleskodāle', 'Sarkandaugava', 'Šķirotava', 'Teika', 'Torņakalns', 'Trīsciems', 'VEF', 'Vecāķi', 'Vecmīlgrāvis', 'Vecrīga', 'Zaķusala', 'Zasulauks', 'Ziepniekkalns', 'Zolitūde', 'Cits'];

const MAJAS_SERIJAS = ['Jaunais projekts', '103. sērija', '104. sērija', '119. sērija', '467. sērija', '602. sērija', 'Čehu projekts', 'Hruščovka', 'LT projekts (Lietuviešu)', 'Mazģimeņu projekts', 'Franču projekts', 'Speciālprojekts', 'Staļinas laika', 'Pirmskara', 'Renovēta', 'Privātmāja', 'Cita'];

const STAVOKLIS_DZIVOKLIS = ['Lielisks', 'Labā stāvoklī', 'Nepieciešams kosmētiskais remonts', 'Nepieciešams kapitālais remonts', 'Nepabeigtā remontā'];

const APKURE = ['Centrālā', 'Autonomā gāzes', 'Elektriskā', 'Krāsns', 'Silta grīda', 'Cita'];

const EKAS_MATERIALS = ['Ķieģeļu', 'Paneļu', 'Monolīts', 'Koka', 'Ķieģeļu-paneļu', 'Cits'];

const DARBA_NOZARES = ['IT un telekomunikācijas', 'Būvniecība un nekustamais', 'Tirdzniecība un mazumtirdzniecība', 'Transports un loģistika', 'Ēdināšana un viesmīlība', 'Ražošana', 'Klientu apkalpošana', 'Izglītība', 'Veselības aprūpe', 'Finanses un grāmatvedība', 'Mārketings un reklāma', 'Juridiskie pakalpojumi', 'Lauksaimniecība', 'Cita'];

const DARBA_PILSETAS = ['Rīga', 'Jūrmala', 'Jelgava', 'Liepāja', 'Daugavpils', 'Ventspils', 'Valmiera', 'Attālināti', 'Cita'];

export const CATEGORY_SCHEMAS: Record<string, CategorySchema> = {
  'Transports': {
    name: 'Transports',
    subcategories: {
      'Vieglie auto': {
        name: 'Vieglie auto',
        fields: [
          { name: 'brand', label: 'Marka', type: 'text', placeholder: 'Piem., BMW, Audi, Volvo' },
          { name: 'model', label: 'Modelis', type: 'text', placeholder: 'Piem., X5, A4, XC60' },
          { name: 'year', label: 'Izlaiduma gads', type: 'number', placeholder: 'Piem., 2015' },
          { name: 'engine', label: 'Dzinēja tilpums un tips', type: 'text', placeholder: 'Piem., 2.0 Dīzelis' },
          { name: 'transmission', label: 'Ātrumkārba', type: 'select', options: ['Automāts', 'Manuāla'] },
          { name: 'mileage', label: 'Nobraukums (km)', type: 'number', placeholder: 'Piem., 150000' },
          { name: 'bodyType', label: 'Virsbūves tips', type: 'select', options: ['Sedans', 'Universāls', 'Apvidus (SUV)', 'Hečbeks', 'Kupeja', 'Minivens', 'Pikaps', 'Cits'] },
          { name: 'color', label: 'Krāsa', type: 'text', placeholder: 'Piem., Melna, Balta' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Lietots', 'Jauns', 'Bojāts', 'Rezerves daļām'] },
        ]
      },
      'Motocikli un kvadricikli': {
        name: 'Motocikli un kvadricikli',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Motocikls', 'Kvadricikls', 'Motorolleris', 'Mopēds'] },
          { name: 'brand', label: 'Marka', type: 'text', placeholder: 'Piem., Yamaha, Honda' },
          { name: 'year', label: 'Izlaiduma gads', type: 'number', placeholder: 'Piem., 2018' },
          { name: 'engine', label: 'Dzinēja tilpums (cm³)', type: 'number', placeholder: 'Piem., 600' },
          { name: 'mileage', label: 'Nobraukums (km)', type: 'number' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots', 'Bojāts'] },
        ]
      },
      'Velosipēdi un skrejriteņi': {
        name: 'Velosipēdi un skrejriteņi',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Kalnu (MTB)', 'Pilsētas', 'Šosejas', 'Elektriskais velosipēds', 'Elektriskais skrejritenis', 'Bērnu'] },
          { name: 'brand', label: 'Marka', type: 'text', placeholder: 'Piem., Trek, Merida, Xiaomi' },
          { name: 'frameSize', label: 'Rāmja izmērs (collas)', type: 'text', placeholder: 'Piem., 19", M' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Lietots'] },
        ]
      },
      'Kempeļi un dzīvojamās mašīnas': {
        name: 'Kempeļi un dzīvojamās mašīnas',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Dzīvojamā mašīna', 'Kempelis', 'Dzīvojamā piekabe', 'Cits'] },
          { name: 'brand', label: 'Marka', type: 'text', placeholder: 'Piem., Hymer, Adria, Dethleffs' },
          { name: 'year', label: 'Izlaiduma gads', type: 'number', placeholder: 'Piem., 2015' },
          { name: 'length', label: 'Garums (m)', type: 'number' },
          { name: 'berths', label: 'Gultas vietu skaits', type: 'number' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots', 'Bojāts'] },
        ]
      },
      'Mikroautobusi un vani': {
        name: 'Mikroautobusi un vani',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Pasažieru mikroautobuss', 'Kravas furgons', 'Minivens', 'Cits'] },
          { name: 'brand', label: 'Marka', type: 'text', placeholder: 'Piem., Mercedes, VW, Ford' },
          { name: 'year', label: 'Izlaiduma gads', type: 'number' },
          { name: 'mileage', label: 'Nobraukums (km)', type: 'number' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots', 'Bojāts'] },
        ]
      },
      'Kravas auto un tehnika': {
        name: 'Kravas auto un tehnika',
        fields: [
          { name: 'brand', label: 'Marka', type: 'text', placeholder: 'Piem., Volvo, Scania, MAN' },
          { name: 'year', label: 'Izlaiduma gads', type: 'number' },
          { name: 'mileage', label: 'Nobraukums (km)', type: 'number' },
          { name: 'weight', label: 'Pilna masa (kg)', type: 'number', placeholder: 'Piem., 18000' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots', 'Bojāts'] },
        ]
      },
      'Vilcēji (Toņas)': {
        name: 'Vilcēji (Toņas)',
        fields: [
          { name: 'brand', label: 'Marka', type: 'text', placeholder: 'Piem., Scania, Volvo, MAN' },
          { name: 'year', label: 'Izlaiduma gads', type: 'number' },
          { name: 'mileage', label: 'Nobraukums (km)', type: 'number' },
          { name: 'axles', label: 'Asu skaits', type: 'select', options: ['4x2', '6x2', '6x4', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots', 'Bojāts'] },
        ]
      },
      'Puspiekabes un piekabes': {
        name: 'Puspiekabes un piekabes',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Puspiekabe', 'Tenta puspiekabe', 'Refrižerators', 'Piekabe', 'Lauksaimniecības piekabe', 'Cits'] },
          { name: 'brand', label: 'Marka', type: 'text' },
          { name: 'year', label: 'Izlaiduma gads', type: 'number' },
          { name: 'length', label: 'Garums (m)', type: 'number' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots', 'Bojāts'] },
        ]
      },
      'Autobusi': {
        name: 'Autobusi',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Pilsētas autobuss', 'Tūristu autobuss', 'Minibuss', 'Cits'] },
          { name: 'brand', label: 'Marka', type: 'text', placeholder: 'Piem., Volvo, MAN, Mercedes' },
          { name: 'year', label: 'Izlaiduma gads', type: 'number' },
          { name: 'seats', label: 'Sēdvietu skaits', type: 'number' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots', 'Bojāts'] },
        ]
      },
      'Traktori un lauksaimniecības tehnika': {
        name: 'Traktori un lauksaimniecības tehnika',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Traktors', 'Kombains', 'Pļaujmašīna', 'Kultivators', 'Cits'] },
          { name: 'brand', label: 'Marka', type: 'text', placeholder: 'Piem., John Deere, New Holland, Fendt' },
          { name: 'year', label: 'Izlaiduma gads', type: 'number' },
          { name: 'power', label: 'Jauda (ZS)', type: 'number' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots', 'Bojāts'] },
        ]
      },
      'Ekskavatori un darba tehnika': {
        name: 'Ekskavatori un darba tehnika',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Ekskavators', 'Buldozers', 'Grantskrāvējs', 'Celtnis', 'Cits'] },
          { name: 'brand', label: 'Marka', type: 'text', placeholder: 'Piem., Komatsu, Caterpillar, Volvo' },
          { name: 'year', label: 'Izlaiduma gads', type: 'number' },
          { name: 'weight', label: 'Svars (t)', type: 'number' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots', 'Bojāts'] },
        ]
      },
      'Iekrāvēji un loģistikas tehnika': {
        name: 'Iekrāvēji un loģistikas tehnika',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Pacēlājs-iekrāvējs', 'Elektriskais iekrāvējs', 'Palešu iekrāvējs', 'Platforma', 'Cits'] },
          { name: 'brand', label: 'Marka', type: 'text', placeholder: 'Piem., Toyota, Linde, Still' },
          { name: 'year', label: 'Izlaiduma gads', type: 'number' },
          { name: 'liftCapacity', label: 'Celtspēja (kg)', type: 'number' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots', 'Bojāts'] },
        ]
      },
      'Ūdens transports': {
        name: 'Ūdens transports',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Motorlaiva', 'Kuteris', 'Ūdens motocikls', 'Jahta', 'Piepūšamā laiva', 'Cits'] },
          { name: 'brand', label: 'Marka', type: 'text' },
          { name: 'year', label: 'Izlaiduma gads', type: 'number' },
          { name: 'length', label: 'Garums (m)', type: 'number' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots', 'Bojāts'] },
        ]
      },
      'Rezerves daļas un piederumi': {
        name: 'Rezerves daļas un piederumi',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Auto rezerves daļas', 'Moto rezerves daļas', 'Riepas un diski', 'Audio un navigācija', 'Eļļas un šķidrumi', 'Aksesuāri', 'Cits'] },
          { name: 'brand', label: 'Saderīgs ar marku', type: 'text', placeholder: 'Piem., BMW, Volkswagen' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots', 'Bojāts'] },
        ]
      }
    }
  },

  'Nekustamais īpašums': {
    name: 'Nekustamais īpašums',
    subcategories: {
      'Dzīvokļi (pārdošana)': {
        name: 'Dzīvokļi',
        group: 'Pārdošana',
        fields: [
          { name: 'city', label: 'Pilsēta', type: 'select', options: CITIES },
          { name: 'district', label: 'Rīgas rajons', type: 'select', options: RIGA_DISTRICTS },
          { name: 'rooms', label: 'Istabu skaits', type: 'select', options: ['Studija/Istabiņa', '1', '2', '3', '4', '5', '6+'] },
          { name: 'area', label: 'Platība (m²)', type: 'number', placeholder: 'Piem., 55' },
          { name: 'floor', label: 'Stāvs', type: 'number', placeholder: 'Piem., 3' },
          { name: 'totalFloors', label: 'Stāvu skaits ēkā', type: 'number', placeholder: 'Piem., 5' },
          { name: 'series', label: 'Mājas sērija', type: 'select', options: MAJAS_SERIJAS },
          { name: 'material', label: 'Ēkas materiāls', type: 'select', options: EKAS_MATERIALS },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: STAVOKLIS_DZIVOKLIS },
          { name: 'heating', label: 'Apkure', type: 'select', options: APKURE },
          { name: 'balcony', label: 'Balkons/Lodžija', type: 'select', options: ['Ir', 'Nav'] },
          { name: 'lift', label: 'Lifts', type: 'select', options: ['Ir', 'Nav'] },
          { name: 'furnished', label: 'Mēbelēts', type: 'select', options: ['Mēbelēts', 'Daļēji mēbelēts', 'Bez mēbelēm'] },
        ]
      },
      'Mājas un vasarnīcas (pārdošana)': {
        name: 'Mājas un vasarnīcas',
        group: 'Pārdošana',
        fields: [
          { name: 'city', label: 'Pilsēta/Novads', type: 'select', options: CITIES },
          { name: 'houseType', label: 'Mājas tips', type: 'select', options: ['Privātmāja', 'Vasarnīca', 'Rindu māja', 'Divģimeņu māja', 'Lauku māja', 'Cita'] },
          { name: 'area', label: 'Mājas platība (m²)', type: 'number', placeholder: 'Piem., 150' },
          { name: 'landArea', label: 'Zemes platība (m²)', type: 'number', placeholder: 'Piem., 1200' },
          { name: 'rooms', label: 'Istabu skaits', type: 'number', placeholder: 'Piem., 4' },
          { name: 'floors', label: 'Stāvu skaits', type: 'select', options: ['1', '2', '3', 'Cits'] },
          { name: 'material', label: 'Ēkas materiāls', type: 'select', options: ['Ķieģeļu', 'Koka', 'Monolīts', 'Rāmja', 'Bloku', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Lielisks', 'Labā stāvoklī', 'Nepieciešams kosmētiskais remonts', 'Nepieciešams kapitālais remonts', 'Neizbūvēta'] },
          { name: 'heating', label: 'Apkure', type: 'select', options: ['Centrālā', 'Gāzes', 'Elektriskā', 'Malkas/Krāsns', 'Silta grīda', 'Siltuma sūknis', 'Cita'] },
          { name: 'sewage', label: 'Kanalizācija', type: 'select', options: ['Centralizēta', 'Autonomā (septiks)', 'Nav'] },
          { name: 'water', label: 'Ūdens', type: 'select', options: ['Centralizēts', 'Artēziskais', 'Aka', 'Nav'] },
        ]
      },
      'Zeme un mežs': {
        name: 'Zeme un mežs',
        group: 'Pārdošana',
        fields: [
          { name: 'city', label: 'Pilsēta/Novads', type: 'select', options: CITIES },
          { name: 'landType', label: 'Zemes tips', type: 'select', options: ['Apbūves zeme', 'Lauksaimniecības zeme', 'Meža zeme', 'Komerciālās apbūves zeme', 'Dārzkopības', 'Cita'] },
          { name: 'area', label: 'Platība (m²)', type: 'number', placeholder: 'Piem., 5000' },
          { name: 'communications', label: 'Komunikācijas', type: 'text', placeholder: 'Piem., Elektrība, Ūdens' },
        ]
      },
      'Komerctelpas (pārdošana)': {
        name: 'Komerctelpas',
        group: 'Pārdošana',
        fields: [
          { name: 'city', label: 'Pilsēta', type: 'select', options: CITIES },
          { name: 'type', label: 'Telpu tips', type: 'select', options: ['Birojs', 'Tirdzniecības telpa', 'Noliktava', 'Ražošanas telpa', 'Viesnīca/Hostel', 'Restorāns/Kafejnīca', 'Cita'] },
          { name: 'area', label: 'Platība (m²)', type: 'number', placeholder: 'Piem., 200' },
          { name: 'floor', label: 'Stāvs', type: 'number' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Lielisks', 'Labā stāvoklī', 'Nepieciešams remonts'] },
        ]
      },
      'Garāžas un stāvvietas (pārdošana)': {
        name: 'Garāžas un stāvvietas',
        group: 'Pārdošana',
        fields: [
          { name: 'city', label: 'Pilsēta', type: 'select', options: CITIES },
          { name: 'type', label: 'Tips', type: 'select', options: ['Garāža', 'Stāvvieta', 'Garāžu kooperatīvs', 'Pazemes stāvvieta'] },
          { name: 'area', label: 'Platība (m²)', type: 'number' },
          { name: 'heating', label: 'Apkure', type: 'select', options: ['Ir', 'Nav'] },
          { name: 'electricity', label: 'Elektrība', type: 'select', options: ['Ir', 'Nav'] },
        ]
      },
      'Dzīvokļi (īre)': {
        name: 'Dzīvokļi',
        group: 'Īre',
        fields: [
          { name: 'city', label: 'Pilsēta', type: 'select', options: CITIES },
          { name: 'district', label: 'Rīgas rajons', type: 'select', options: RIGA_DISTRICTS },
          { name: 'rooms', label: 'Istabu skaits', type: 'select', options: ['Studija/Istabiņa', '1', '2', '3', '4', '5', '6+'] },
          { name: 'area', label: 'Platība (m²)', type: 'number', placeholder: 'Piem., 55' },
          { name: 'floor', label: 'Stāvs', type: 'number' },
          { name: 'series', label: 'Mājas sērija', type: 'select', options: MAJAS_SERIJAS },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: STAVOKLIS_DZIVOKLIS },
          { name: 'heating', label: 'Apkure', type: 'select', options: APKURE },
          { name: 'furnished', label: 'Mēbelēts', type: 'select', options: ['Mēbelēts', 'Daļēji mēbelēts', 'Bez mēbelēm'] },
          { name: 'utilities', label: 'Komunālie maksājumi', type: 'select', options: ['Iekļauti cenā', 'Atsevišķi', 'Daļēji iekļauti'] },
          { name: 'deposit', label: 'Depozīts', type: 'select', options: ['Nav', '0.5 mēn.', '1 mēn.', '2 mēn.', 'Pēc vienošanās'] },
          { name: 'minTerm', label: 'Min. īres termiņš', type: 'select', options: ['Bez ierobežojuma', '1 mēnesis', '3 mēneši', '6 mēneši', '1 gads'] },
          { name: 'pets', label: 'Mājdzīvnieki', type: 'select', options: ['Atļauti', 'Nav atļauti', 'Pēc vienošanās'] },
        ]
      },
      'Mājas (īre)': {
        name: 'Mājas',
        group: 'Īre',
        fields: [
          { name: 'city', label: 'Pilsēta/Novads', type: 'select', options: CITIES },
          { name: 'area', label: 'Mājas platība (m²)', type: 'number' },
          { name: 'rooms', label: 'Istabu skaits', type: 'number' },
          { name: 'furnished', label: 'Mēbelēts', type: 'select', options: ['Mēbelēts', 'Daļēji mēbelēts', 'Bez mēbelēm'] },
          { name: 'utilities', label: 'Komunālie maksājumi', type: 'select', options: ['Iekļauti cenā', 'Atsevišķi', 'Daļēji iekļauti'] },
          { name: 'pets', label: 'Mājdzīvnieki', type: 'select', options: ['Atļauti', 'Nav atļauti', 'Pēc vienošanās'] },
        ]
      },
      'Istabas (īre)': {
        name: 'Istabas',
        group: 'Īre',
        fields: [
          { name: 'city', label: 'Pilsēta', type: 'select', options: CITIES },
          { name: 'district', label: 'Rīgas rajons', type: 'select', options: RIGA_DISTRICTS },
          { name: 'apartmentRooms', label: 'Dzīvokļa kopējais istabu skaits', type: 'select', options: ['2-istabu dzīvoklis', '3-istabu', '4-istabu', '5+'] },
          { name: 'utilities', label: 'Komunālie maksājumi', type: 'select', options: ['Iekļauti', 'Atsevišķi'] },
          { name: 'pets', label: 'Mājdzīvnieki', type: 'select', options: ['Atļauti', 'Nav atļauti'] },
        ]
      },
      'Komerctelpas (īre)': {
        name: 'Komerctelpas',
        group: 'Īre',
        fields: [
          { name: 'city', label: 'Pilsēta', type: 'select', options: CITIES },
          { name: 'type', label: 'Telpu tips', type: 'select', options: ['Birojs', 'Tirdzniecības telpa', 'Noliktava', 'Ražošanas telpa', 'Cita'] },
          { name: 'area', label: 'Platība (m²)', type: 'number' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Lielisks', 'Labs', 'Nepieciešams remonts'] },
        ]
      },
      'Garāžas un stāvvietas (īre)': {
        name: 'Garāžas un stāvvietas',
        group: 'Īre',
        fields: [
          { name: 'city', label: 'Pilsēta', type: 'select', options: CITIES },
          { name: 'type', label: 'Tips', type: 'select', options: ['Garāža', 'Stāvvieta', 'Pazemes stāvvieta'] },
          { name: 'area', label: 'Platība (m²)', type: 'number' },
        ]
      },
    }
  },

  'Elektronika': {
    name: 'Elektronika',
    subcategories: {
      'Viedtālruņi': {
        name: 'Viedtālruņi',
        group: 'Mobilie telefoni',
        fields: [
          { name: 'brand', label: 'Ražotājs', type: 'select', options: ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'Sony', 'Nokia', 'Motorola', 'OnePlus', 'Google Pixel', 'Realme', 'OPPO', 'Honor', 'HTC', 'LG', 'Cits'] },
          { name: 'model', label: 'Modelis', type: 'text', placeholder: 'Piem., iPhone 15 Pro' },
          { name: 'storage', label: 'Iekšējā atmiņa (GB)', type: 'select', options: ['16', '32', '64', '128', '256', '512', '1024'] },
          { name: 'ram', label: 'RAM (GB)', type: 'select', options: ['2', '3', '4', '6', '8', '12', '16'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Ļoti labs', 'Labs', 'Pieņemams', 'Bojāts (rezerves daļām)'] },
          { name: 'locked', label: 'Operators', type: 'select', options: ['Nav bloķēts', 'Bloķēts (LMT)', 'Bloķēts (Tele2)', 'Bloķēts (BITE)', 'Cits operators'] },
        ]
      },
      'Aksesuāri telefoniem': {
        name: 'Aksesuāri telefoniem',
        group: 'Mobilie telefoni',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Maciņi un vāciņi', 'Ekrāna aizsargstikli', 'Lādētāji un kabeļi', 'Austiņas', 'Baterijas', 'Power bank', 'Cits'] },
          { name: 'compatibility', label: 'Saderība', type: 'text', placeholder: 'Piem., iPhone 15 Pro' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots'] },
        ]
      },
      'Portatīvie datori': {
        name: 'Portatīvie datori',
        group: 'Datori',
        fields: [
          { name: 'brand', label: 'Ražotājs', type: 'select', options: ['Apple (MacBook)', 'Asus', 'Acer', 'Dell', 'HP', 'Lenovo', 'MSI', 'Samsung', 'Fujitsu', 'Gigabyte', 'Razer', 'Huawei', 'Cits'] },
          { name: 'model', label: 'Modelis', type: 'text', placeholder: 'Piem., MacBook Pro, ThinkPad X1' },
          { name: 'screen', label: 'Ekrāna izmērs (collas)', type: 'select', options: ['11"', '12"', '13"', '13.3"', '14"', '15"', '15.6"', '16"', '17"', '17.3"'] },
          { name: 'cpu', label: 'Procesors', type: 'select', options: ['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'Intel Core Ultra 5', 'Intel Core Ultra 7', 'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9', 'Apple M1', 'Apple M2', 'Apple M3', 'Apple M4', 'Intel Celeron', 'Intel Pentium', 'Cits'] },
          { name: 'ram', label: 'RAM (GB)', type: 'select', options: ['4', '8', '16', '32', '64'] },
          { name: 'storage', label: 'Disks (GB)', type: 'select', options: ['128', '256', '512', '1000', '2000', '4000'] },
          { name: 'storageType', label: 'Diska tips', type: 'select', options: ['SSD', 'HDD', 'SSD + HDD', 'M.2 NVMe'] },
          { name: 'os', label: 'Operētājsistēma', type: 'select', options: ['Windows 11 Home', 'Windows 11 Pro', 'Windows 10', 'macOS', 'Linux', 'Bez OS'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Ļoti labs', 'Labs', 'Pieņemams', 'Bojāts'] },
        ]
      },
      'Stacionārie datori': {
        name: 'Stacionārie datori',
        group: 'Datori',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Gaming PC', 'Darba stacija', 'Biroja dators', 'Mini PC', 'Server', 'Cits'] },
          { name: 'cpu', label: 'Procesors', type: 'select', options: ['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9', 'Intel Celeron', 'Intel Pentium', 'Cits'] },
          { name: 'ram', label: 'RAM (GB)', type: 'select', options: ['4', '8', '16', '32', '64', '128'] },
          { name: 'storage', label: 'Disks (GB)', type: 'select', options: ['256', '512', '1000', '2000', '4000', '8000'] },
          { name: 'gpu', label: 'Grafiskā karte', type: 'text', placeholder: 'Piem., RTX 4070, RX 7600' },
          { name: 'os', label: 'Operētājsistēma', type: 'select', options: ['Windows 11', 'Windows 10', 'Linux', 'Bez OS'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Ļoti labs', 'Labs', 'Bojāts'] },
        ]
      },
      'Planšetdatori': {
        name: 'Planšetdatori',
        group: 'Datori',
        fields: [
          { name: 'brand', label: 'Ražotājs', type: 'select', options: ['Apple (iPad)', 'Samsung', 'Lenovo', 'Huawei', 'Amazon', 'Microsoft (Surface)', 'Xiaomi', 'Cits'] },
          { name: 'model', label: 'Modelis', type: 'text', placeholder: 'Piem., iPad Air 5, Galaxy Tab S9' },
          { name: 'screen', label: 'Ekrāna izmērs (collas)', type: 'select', options: ['7"', '8"', '10"', '10.5"', '11"', '12"', '12.9"', '13"'] },
          { name: 'storage', label: 'Atmiņa (GB)', type: 'select', options: ['16', '32', '64', '128', '256', '512'] },
          { name: 'os', label: 'Operētājsistēma', type: 'select', options: ['iPadOS', 'Android', 'Windows'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Ļoti labs', 'Labs', 'Bojāts'] },
        ]
      },
      'Datoru komponentes': {
        name: 'Datoru komponentes',
        group: 'Datori',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Procesors (CPU)', 'Grafiskā karte (GPU)', 'Operatīvā atmiņa (RAM)', 'SSD/HDD', 'Mātes plate', 'Barošanas bloks (PSU)', 'Dzesēšanas sistēma', 'Korpuss', 'Cits'] },
          { name: 'brand', label: 'Ražotājs', type: 'text', placeholder: 'Piem., Intel, AMD, ASUS' },
          { name: 'model', label: 'Modelis', type: 'text' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Lietots', 'Bojāts'] },
        ]
      },
      'Televizori': {
        name: 'Televizori',
        group: 'Audio, Video, Foto',
        fields: [
          { name: 'brand', label: 'Ražotājs', type: 'select', options: ['Samsung', 'LG', 'Sony', 'Philips', 'Hisense', 'TCL', 'Sharp', 'Panasonic', 'Xiaomi', 'Thomson', 'Cits'] },
          { name: 'screen', label: 'Ekrāna izmērs (collas)', type: 'select', options: ['24"', '28"', '32"', '40"', '43"', '49"', '50"', '55"', '58"', '65"', '70"', '75"', '77"', '85"', 'Cits'] },
          { name: 'resolution', label: 'Izšķirtspēja', type: 'select', options: ['HD (720p)', 'Full HD (1080p)', '4K / UHD', '8K'] },
          { name: 'panelType', label: 'Ekrāna tips', type: 'select', options: ['LED', 'OLED', 'QLED', 'QNED', 'Mini LED', 'LCD', 'Cits'] },
          { name: 'smartTv', label: 'Smart TV', type: 'select', options: ['Jā', 'Nē'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Ļoti labs', 'Labs', 'Bojāts'] },
        ]
      },
      'Fotoaparāti un kameras': {
        name: 'Fotoaparāti un kameras',
        group: 'Audio, Video, Foto',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Spoguļkamera (DSLR)', 'Bezspoguļa (Mirrorless)', 'Kompakta kamera', 'Videokamera', 'Sporta/Action kamera', 'Drošības kamera', 'Cita'] },
          { name: 'brand', label: 'Ražotājs', type: 'select', options: ['Canon', 'Nikon', 'Sony', 'Fujifilm', 'Panasonic', 'Olympus', 'Pentax', 'DJI', 'GoPro', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Ļoti labs', 'Labs', 'Bojāts'] },
        ]
      },
      'Austiņas un skaļruņi': {
        name: 'Austiņas un skaļruņi',
        group: 'Audio, Video, Foto',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Austiņas (over-ear)', 'Austiņas (in-ear/TWS)', 'Soundbar', 'Mājas kino sistēma', 'Bezvadu skaļrunis', 'Hi-Fi sistēma', 'Cits'] },
          { name: 'brand', label: 'Ražotājs', type: 'select', options: ['Sony', 'Bose', 'JBL', 'Sennheiser', 'Apple (AirPods)', 'Samsung', 'Philips', 'Harman Kardon', 'Bang & Olufsen', 'Cits'] },
          { name: 'connection', label: 'Savienojums', type: 'select', options: ['Vadu', 'Bluetooth', 'Vadu + Bluetooth'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Ļoti labs', 'Labs', 'Bojāts'] },
        ]
      },
      'Droni': {
        name: 'Droni',
        group: 'Audio, Video, Foto',
        fields: [
          { name: 'brand', label: 'Ražotājs', type: 'select', options: ['DJI', 'Autel', 'Parrot', 'Skydio', 'Cits'] },
          { name: 'model', label: 'Modelis', type: 'text', placeholder: 'Piem., DJI Mini 4 Pro' },
          { name: 'category', label: 'Kategorija', type: 'select', options: ['Patērētāju (hobijs)', 'Profesionālais', 'FPV'] },
          { name: 'flightTime', label: 'Lidojuma laiks (min.)', type: 'number' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Ļoti labs', 'Labs', 'Bojāts'] },
        ]
      },
      'Veļas mašīnas un žāvētāji': {
        name: 'Veļas mašīnas un žāvētāji',
        group: 'Sadzīves tehnika',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Veļas mašīna', 'Žāvētājs', 'Veļas mašīna ar žāvētāju'] },
          { name: 'brand', label: 'Ražotājs', type: 'select', options: ['Bosch', 'LG', 'Samsung', 'Siemens', 'AEG', 'Miele', 'Electrolux', 'Beko', 'Indesit', 'Candy', 'Whirlpool', 'Zanussi', 'Gorenje', 'Haier', 'Cits'] },
          { name: 'loading', label: 'Iekraušana', type: 'select', options: ['Frontālā', 'Vertikālā (no augšas)'] },
          { name: 'capacity', label: 'Ietilpība (kg)', type: 'select', options: ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] },
          { name: 'width', label: 'Platums', type: 'select', options: ['Šaurā (45cm)', 'Standarta (60cm)'] },
          { name: 'energyClass', label: 'Energoklase', type: 'select', options: ['A', 'A+', 'A++', 'A+++', 'B', 'C'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Bojāts'] },
        ]
      },
      'Ledusskapji un saldētāji': {
        name: 'Ledusskapji un saldētāji',
        group: 'Sadzīves tehnika',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Ledusskapis', 'Saldētājs', 'Ledusskapis ar saldētāju', 'Side-by-Side'] },
          { name: 'brand', label: 'Ražotājs', type: 'select', options: ['Bosch', 'LG', 'Samsung', 'Siemens', 'AEG', 'Miele', 'Electrolux', 'Beko', 'Gorenje', 'Liebherr', 'Cits'] },
          { name: 'energyClass', label: 'Energoklase', type: 'select', options: ['A', 'A+', 'A++', 'A+++', 'B', 'C'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Bojāts'] },
        ]
      },
      'Virtuves tehnika': {
        name: 'Virtuves tehnika',
        group: 'Sadzīves tehnika',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Mikroviļņu krāsns', 'Cepeškrāsns', 'Plīts virsma', 'Kafijas automāts', 'Kafijas kapsula automāts', 'Tosteris', 'Blenderis', 'Trauku mazgājamā', 'Tvaika nosūcējs', 'Cita'] },
          { name: 'brand', label: 'Ražotājs', type: 'select', options: ['Bosch', 'Siemens', 'AEG', 'Electrolux', 'Philips', 'DeLonghi', 'Nespresso', 'SMEG', 'Gorenje', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Bojāts'] },
        ]
      },
      'Spēļu konsoles': {
        name: 'Spēļu konsoles',
        group: 'Spēles un izklaides',
        fields: [
          { name: 'platform', label: 'Platforma', type: 'select', options: ['PlayStation 5', 'PlayStation 4', 'Xbox Series X/S', 'Xbox One', 'Nintendo Switch', 'Nintendo Switch Lite', 'Steam Deck', 'Retro konsole', 'Cita'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Bojāts'] },
        ]
      },
      'Videospēles': {
        name: 'Videospēles',
        group: 'Spēles un izklaides',
        fields: [
          { name: 'platform', label: 'Platforma', type: 'select', options: ['PS5', 'PS4', 'Xbox Series', 'Xbox One', 'Nintendo Switch', 'PC (fiziska)', 'PC (digitāls kods)', 'Retro', 'Cita'] },
          { name: 'genre', label: 'Žanrs', type: 'select', options: ['Akcija', 'Sports', 'Sacīkstes', 'RPG', 'Stratēģija', 'Simulācija', 'Šaušana (FPS)', 'Bērniem', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Labs', 'Bojāts'] },
        ]
      },
    }
  },

  'Darbs un pakalpojumi': {
    name: 'Darbs un pakalpojumi',
    subcategories: {
      'Vakances (Piedāvā darbu)': {
        name: 'Vakances (Piedāvā darbu)',
        fields: [
          { name: 'industry', label: 'Nozare', type: 'select', options: DARBA_NOZARES },
          { name: 'position', label: 'Amats', type: 'text', placeholder: 'Piem., Programmētājs, Pārdevējs' },
          { name: 'city', label: 'Pilsēta', type: 'select', options: DARBA_PILSETAS },
          { name: 'workload', label: 'Slodze', type: 'select', options: ['Pilna slodze', 'Pusslodze', 'Gabaldarbs', 'Maiņu darbs', 'Sezonāls darbs'] },
          { name: 'experience', label: 'Nepieciešamā pieredze', type: 'select', options: ['Nav nepieciešama', 'Līdz 1 gadam', '1–3 gadi', '3–5 gadi', '5+ gadi'] },
          { name: 'salaryMin', label: 'Alga no (€ bruto/mēn.)', type: 'number', placeholder: 'Piem., 1500' },
          { name: 'salaryMax', label: 'Alga līdz (€ bruto/mēn.)', type: 'number', placeholder: 'Piem., 2000' },
        ]
      },
      'Meklē darbu': {
        name: 'Meklē darbu',
        fields: [
          { name: 'industry', label: 'Vēlamā nozare', type: 'select', options: DARBA_NOZARES },
          { name: 'position', label: 'Vēlamais amats', type: 'text', placeholder: 'Piem., Projektu vadītājs' },
          { name: 'city', label: 'Pilsēta', type: 'select', options: DARBA_PILSETAS },
          { name: 'workload', label: 'Vēlamā slodze', type: 'select', options: ['Pilna slodze', 'Pusslodze', 'Gabaldarbs', 'Maiņu darbs'] },
          { name: 'experience', label: 'Pieredze', type: 'select', options: ['Bez pieredzes', 'Līdz 1 gadam', '1–3 gadi', '3–5 gadi', '5+ gadi'] },
        ]
      },
      'Kursi un izglītība': {
        name: 'Kursi un izglītība',
        fields: [
          { name: 'type', label: 'Kursa tips', type: 'select', options: ['Valodu kursi', 'IT un programmēšana', 'Autoskola', 'Profesionālie kursi', 'Sports un deja', 'Māksla un radošums', 'Augstākā izglītība', 'Citi'] },
          { name: 'format', label: 'Formāts', type: 'select', options: ['Klātiene', 'Tiešsaiste (online)', 'Hibrīds'] },
          { name: 'city', label: 'Pilsēta', type: 'select', options: [...DARBA_PILSETAS, 'Tiešsaiste'] },
          { name: 'duration', label: 'Ilgums', type: 'select', options: ['Viens semestris', 'Viens gads', '2+ gadi', 'Intensīvs kurss', 'Pēc vienošanās'] },
        ]
      }
    }
  },

  'Pakalpojumi': {
    name: 'Pakalpojumi',
    subcategories: {
      'Mājas remonts un būvniecība': {
        name: 'Mājas remonts un būvniecība',
        fields: [
          { name: 'type', label: 'Pakalpojuma tips', type: 'select', options: ['Istabu remonts', 'Vannas istabas remonts', 'Virtuves remonts', 'Jumta remonts', 'Fasādes remonts', 'Elektroinstalācija', 'Santehnika', 'Logu/durvju montāža', 'Grīdu montāža', 'Flīzēšana', 'Krāsošana', 'Ģipškartons', 'Cits'] },
          { name: 'city', label: 'Pilsēta', type: 'select', options: DARBA_PILSETAS },
          { name: 'priceType', label: 'Cenas veids', type: 'select', options: ['Stundas likme (€/h)', 'Par darba dienu', 'Par projektu', 'Pēc vienošanās'] },
          { name: 'experience', label: 'Pieredze', type: 'select', options: ['1–3 gadi', '3–5 gadi', '5–10 gadi', '10+ gadi'] },
        ]
      },
      'Auto pakalpojumi': {
        name: 'Auto pakalpojumi',
        fields: [
          { name: 'type', label: 'Pakalpojuma tips', type: 'select', options: ['Tehniskā apkope', 'Virsbūves remonts', 'Krāsošana', 'Riepu montāža', 'Diagnostika', 'Elektriskie darbi', 'Klimata sistēma', 'Motora remonts', 'Cits'] },
          { name: 'city', label: 'Pilsēta', type: 'select', options: DARBA_PILSETAS },
          { name: 'priceType', label: 'Cenas veids', type: 'select', options: ['Stundas likme', 'Par pakalpojumu', 'Pēc vienošanās'] },
        ]
      },
      'IT un digitālie pakalpojumi': {
        name: 'IT un digitālie pakalpojumi',
        fields: [
          { name: 'type', label: 'Pakalpojuma tips', type: 'select', options: ['Web izstrāde', 'Mobilās aplikācijas', 'SEO un digitālais mārketings', 'Grafiskais dizains', 'IT atbalsts un remonts', 'Datu atgūšana', 'Kiberdrošība', 'Cits'] },
          { name: 'format', label: 'Darba formāts', type: 'select', options: ['Attālināti', 'Klātiene', 'Abi'] },
          { name: 'priceType', label: 'Cenas veids', type: 'select', options: ['Stundas likme (€/h)', 'Par projektu', 'Ikmēneša abonements'] },
        ]
      },
      'Skaistumkopšana un veselība': {
        name: 'Skaistumkopšana un veselība',
        fields: [
          { name: 'type', label: 'Pakalpojuma tips', type: 'select', options: ['Friziera pakalpojumi', 'Nagu dizains', 'Kosmētika un sejas kopšana', 'Masāža', 'Uzacu/skropstu kopšana', 'Permanent Make-up', 'Cits'] },
          { name: 'city', label: 'Pilsēta', type: 'select', options: DARBA_PILSETAS },
          { name: 'priceType', label: 'Cenas veids', type: 'select', options: ['Par pakalpojumu', 'Stundas likme', 'Pēc vienošanās'] },
        ]
      },
      'Tīrīšana un uzkopšana': {
        name: 'Tīrīšana un uzkopšana',
        fields: [
          { name: 'type', label: 'Pakalpojuma tips', type: 'select', options: ['Dzīvokļa uzkopšana', 'Biroja uzkopšana', 'Pēcremonta tīrīšana', 'Logu tīrīšana', 'Paklāju tīrīšana', 'Cits'] },
          { name: 'city', label: 'Pilsēta', type: 'select', options: DARBA_PILSETAS },
          { name: 'priceType', label: 'Cenas veids', type: 'select', options: ['Par stundu', 'Par apmeklējumu', 'Pēc vienošanās'] },
        ]
      },
      'Loģistika un pārvākšanās': {
        name: 'Loģistika un pārvākšanās',
        fields: [
          { name: 'type', label: 'Pakalpojuma tips', type: 'select', options: ['Pārvākšanās', 'Kravas pārvadāšana', 'Kurjera pakalpojumi', 'Mēbeļu montāža', 'Cits'] },
          { name: 'city', label: 'Pilsēta', type: 'select', options: DARBA_PILSETAS },
          { name: 'priceType', label: 'Cenas veids', type: 'select', options: ['Par stundu', 'Par km', 'Par projektu', 'Pēc vienošanās'] },
        ]
      },
      'Foto un video pakalpojumi': {
        name: 'Foto un video pakalpojumi',
        fields: [
          { name: 'type', label: 'Pakalpojuma tips', type: 'select', options: ['Kāzu fotografēšana', 'Portretfotogrāfija', 'Produktu fotogrāfija', 'Videografija', 'Aerofilmēšana (droni)', 'Fotogrāfiju apstrāde', 'Cits'] },
          { name: 'city', label: 'Pilsēta', type: 'select', options: DARBA_PILSETAS },
          { name: 'priceType', label: 'Cenas veids', type: 'select', options: ['Par stundu', 'Par pasākumu', 'Par projektu', 'Pēc vienošanās'] },
        ]
      },
      'Citi pakalpojumi': {
        name: 'Citi pakalpojumi',
        fields: [
          { name: 'type', label: 'Pakalpojuma tips', type: 'text', placeholder: 'Aprakstiet pakalpojumu' },
          { name: 'city', label: 'Pilsēta', type: 'select', options: DARBA_PILSETAS },
          { name: 'priceType', label: 'Cenas veids', type: 'select', options: ['Stundas likme', 'Par pakalpojumu', 'Pēc vienošanās'] },
        ]
      },
    }
  },

  'Mājai un dārzam': {
    name: 'Mājai un dārzam',
    subcategories: {
      'Guļamistabai': {
        name: 'Guļamistabai',
        group: 'Mēbeles un interjers',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Gulta', 'Matracis', 'Skapis', 'Naktsgaldiņš', 'Plaukts', 'Cits'] },
          { name: 'material', label: 'Materiāls', type: 'select', options: ['Koks (masīvkoks)', 'MDF/Laminēts', 'Metāls', 'Ādas', 'Audums', 'Maisījums', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Nepieciešams remonts'] },
          { name: 'dimensions', label: 'Izmēri (G×P×A cm)', type: 'text', placeholder: 'Piem., 200×160×90' },
          { name: 'brand', label: 'Zīmols', type: 'text', placeholder: 'Piem., IKEA, Cits' },
        ]
      },
      'Dzīvojamai istabai': {
        name: 'Dzīvojamai istabai',
        group: 'Mēbeles un interjers',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Dīvāns', 'Krēsls', 'Kafijas galdiņš', 'TV racks', 'Plaukts', 'Plafons/Lampa', 'Cits'] },
          { name: 'material', label: 'Materiāls', type: 'select', options: ['Koks (masīvkoks)', 'MDF/Laminēts', 'Metāls', 'Ādas', 'Audums', 'Stikls', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Nepieciešams remonts'] },
          { name: 'brand', label: 'Zīmols', type: 'text', placeholder: 'Piem., IKEA, Cits' },
        ]
      },
      'Virtuvei': {
        name: 'Virtuvei',
        group: 'Mēbeles un interjers',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Virtuves komplekts', 'Ēdamgalds', 'Krēsli', 'Bāra lete', 'Cits'] },
          { name: 'material', label: 'Materiāls', type: 'select', options: ['Koks', 'MDF', 'Metāls', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Nepieciešams remonts'] },
        ]
      },
      'Dekorācija un tekstils': {
        name: 'Dekorācija un tekstils',
        group: 'Mēbeles un interjers',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Aizkari un žalūzijas', 'Paklāji', 'Spilveni un pledi', 'Gleznas un plakāti', 'Pulksteņi', 'Sveces un aromasvielas', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs'] },
        ]
      },
      'Būvmateriāli': {
        name: 'Būvmateriāli',
        group: 'Būvmateriāli un instrumenti',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Ķieģeļi un bloki', 'Cements un betona maisījumi', 'Sausa apmetums', 'Ģipškartons', 'Jumta segums', 'Siltumizolācija', 'Logi un durvis', 'Grīdas segums', 'Flīzes', 'Krāsas un lakas', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots'] },
        ]
      },
      'Instrumenti un iekārtas': {
        name: 'Instrumenti un iekārtas',
        group: 'Būvmateriāli un instrumenti',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Elektroinstrumenti', 'Rokas instrumenti', 'Mērinstrumenti', 'Celtniecības iekārtas', 'Kompresori', 'Cits'] },
          { name: 'brand', label: 'Ražotājs', type: 'select', options: ['Bosch', 'Makita', 'DeWalt', 'Hilti', 'Stanley', 'Black+Decker', 'Einhell', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Bojāts'] },
        ]
      },
      'Dārza tehnika': {
        name: 'Dārza tehnika',
        group: 'Dārzam un pagalmam',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Zālāja pļāvējs', 'Robots pļāvējs', 'Trimmēris', 'Koku zāģis', 'Laistīšanas sistēma', 'Mini traktors', 'Cita'] },
          { name: 'brand', label: 'Ražotājs', type: 'select', options: ['Husqvarna', 'Gardena', 'Bosch', 'Makita', 'STIHL', 'Honda', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Bojāts'] },
        ]
      },
      'Augi un stādi': {
        name: 'Augi un stādi',
        group: 'Dārzam un pagalmam',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Iekštelpu augi', 'Dārza augi', 'Augļu koki', 'Ogulāji', 'Dekoratīvie krūmi', 'Ziedu sīpoli', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns (stādāms)', 'Pieaudzis', 'Puķu pods'] },
        ]
      },
      'Dārza mēbeles un grilli': {
        name: 'Dārza mēbeles un grilli',
        group: 'Dārzam un pagalmam',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Dārza galdiņš un krēsli', 'Šūpoles un hamaks', 'Sauļošanās krēsls', 'Grills (ogļu)', 'Grills (gāzes)', 'Smokers/BBQ', 'Nojume/Paviljons', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Bojāts'] },
        ]
      },
      'Santehnika un apkure': {
        name: 'Santehnika un apkure',
        group: 'Būvmateriāli un instrumenti',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Vannas un dušas kabīnes', 'Sanitārtehniskās ierīces', 'Apkures katli', 'Radiatori', 'Silta grīda', 'Caurules un armatūra', 'Cits'] },
          { name: 'brand', label: 'Ražotājs', type: 'text' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots'] },
        ]
      },
    }
  },

  'Mode un stils': {
    name: 'Mode un stils',
    subcategories: {
      'Sieviešu apģērbi': {
        name: 'Sieviešu apģērbi',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Kleitas un kombinezoni', 'Virsdrēbes (jakas, mēteļi)', 'Bikses un šorti', 'Krekli, blūzes un topi', 'Sporta apģērbs', 'Apakšveļa', 'Cits'] },
          { name: 'size', label: 'Izmērs', type: 'select', options: ['XS (32–34)', 'S (36–38)', 'M (40–42)', 'L (44–46)', 'XL (48–50)', 'XXL (52–54)', 'XXXL (56+)', 'Cits'] },
          { name: 'brand', label: 'Zīmols', type: 'text', placeholder: 'Piem., Zara, H&M, Mango' },
          { name: 'color', label: 'Krāsa', type: 'select', options: ['Melna', 'Balta', 'Pelēka', 'Zila', 'Sarkana', 'Zaļa', 'Dzeltena', 'Rozā', 'Brūna', 'Bēša', 'Raksts', 'Cita'] },
          { name: 'season', label: 'Sezona', type: 'select', options: ['Vasaras', 'Rudens/Pavasara', 'Ziemas', 'Visu sezonu'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns (ar etiķeti)', 'Jauns (bez etiķetes)', 'Kā jauns', 'Labs', 'Ar sīkumiem'] },
        ]
      },
      'Vīriešu apģērbi': {
        name: 'Vīriešu apģērbi',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Virsdrēbes (jakas, mēteļi)', 'Bikses un šorti', 'Krekli un T-krekli', 'Uzvalki un formālie', 'Sporta apģērbs', 'Cits'] },
          { name: 'size', label: 'Izmērs', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Cits'] },
          { name: 'brand', label: 'Zīmols', type: 'text', placeholder: 'Piem., Zara, Hugo Boss, Tommy Hilfiger' },
          { name: 'color', label: 'Krāsa', type: 'select', options: ['Melna', 'Balta', 'Pelēka', 'Zila', 'Sarkana', 'Zaļa', 'Brūna', 'Bēša', 'Raksts', 'Cita'] },
          { name: 'season', label: 'Sezona', type: 'select', options: ['Vasaras', 'Rudens/Pavasara', 'Ziemas', 'Visu sezonu'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns (ar etiķeti)', 'Jauns (bez etiķetes)', 'Kā jauns', 'Labs', 'Ar sīkumiem'] },
        ]
      },
      'Apavi': {
        name: 'Apavi',
        fields: [
          { name: 'gender', label: 'Dzimums', type: 'select', options: ['Sieviešu', 'Vīriešu', 'Unisex'] },
          { name: 'size', label: 'Izmērs (EU)', type: 'select', options: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48'] },
          { name: 'type', label: 'Tips', type: 'select', options: ['Ikdienas', 'Sporta', 'Formālie/Elegantie', 'Sandales', 'Zābaki', 'Mājas čības'] },
          { name: 'brand', label: 'Zīmols', type: 'text', placeholder: 'Piem., Nike, Adidas, Ecco' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Ar nolietojumu'] },
        ]
      },
      'Somas un aksesuāri': {
        name: 'Somas un aksesuāri',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Rokas soma', 'Mugursoma', 'Ceļojumu soma', 'Portfelis', 'Jostas soma', 'Cepures un cepurītes', 'Šalles un cimdi', 'Cits'] },
          { name: 'brand', label: 'Zīmols', type: 'text' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Ar nolietojumu'] },
        ]
      },
      'Pulksteņi un rotaslietas': {
        name: 'Pulksteņi un rotaslietas',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Rokas pulkstenis', 'Viedpulkstenis', 'Kabatas pulkstenis', 'Rotaslietas', 'Juvelierizstrādājumi'] },
          { name: 'gender', label: 'Dzimums', type: 'select', options: ['Vīriešu', 'Sieviešu', 'Unisex'] },
          { name: 'brand', label: 'Zīmols', type: 'text', placeholder: 'Piem., Casio, Tissot, Garmin' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Bojāts'] },
        ]
      },
      'Skaistumkopšana': {
        name: 'Skaistumkopšana',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Kosmētika', 'Smaržas', 'Matu kopšana', 'Ādas kopšana', 'Nagu kopšana', 'Cits'] },
          { name: 'brand', label: 'Zīmols', type: 'text' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Atvērts (nelietots)', 'Daļēji izlietots'] },
        ]
      },
    }
  },

  'Bērniem': {
    name: 'Bērniem',
    subcategories: {
      'Apģērbi un apavi': {
        name: 'Apģērbi un apavi',
        fields: [
          { name: 'gender', label: 'Dzimums', type: 'select', options: ['Meitenēm', 'Zēniem', 'Unisex'] },
          { name: 'ageSize', label: 'Vecums/Izmērs', type: 'select', options: ['0–3 mēn. (50–56)', '3–6 mēn. (62–68)', '6–12 mēn. (74–80)', '1–2 g. (86–92)', '2–3 g. (98)', '3–4 g. (104)', '5–6 g. (110–116)', '7–8 g. (122–128)', '9–10 g. (134–140)', '11–12 g. (146–152)', '13–14 g. (158–164)'] },
          { name: 'type', label: 'Tips', type: 'select', options: ['Apģērbs', 'Apavi', 'Cepures un aksesuāri', 'Komplekts'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Ar nolietojumu'] },
        ]
      },
      'Rotaļlietas un spēles': {
        name: 'Rotaļlietas un spēles',
        fields: [
          { name: 'ageGroup', label: 'Vecuma grupa', type: 'select', options: ['0–1 gads', '1–3 gadi', '3–6 gadi', '6–12 gadi', '12+ gadi'] },
          { name: 'type', label: 'Tips', type: 'select', options: ['Mīkstās rotaļlietas', 'Konstruktori un LEGO', 'Galda spēles', 'Attīstošās rotaļlietas', 'Lelles un aksesuāri', 'Auto un tehnika', 'Āra rotaļlietas', 'Puzzles', 'Radošuma komplekti', 'Citas'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Bojāts'] },
        ]
      },
      'Ratiņi un autokrēsliņi': {
        name: 'Ratiņi un autokrēsliņi',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Bērnu ratiņi (pilna sistēma)', 'Sporta ratiņi (buggy)', 'Autokrēsliņš', 'Kombinētie ratiņi'] },
          { name: 'ageGroup', label: 'Vecuma grupa', type: 'select', options: ['No dzimšanas', '0–6 mēn.', '6–18 mēn.', '0–18 kg', '9–36 kg', '15–36 kg'] },
          { name: 'brand', label: 'Zīmols', type: 'text', placeholder: 'Piem., Bugaboo, Cybex, Chicco' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Bojāts'] },
        ]
      },
      'Bērnu mēbeles': {
        name: 'Bērnu mēbeles',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Gultiņa', 'Barošanas krēsliņš', 'Rakstāmgalds', 'Bērnu krēsls', 'Plaukts', 'Cits'] },
          { name: 'ageGroup', label: 'Piemērots', type: 'select', options: ['Zīdaiņiem (0–1 g.)', 'Maziem bērniem (1–3 g.)', 'Pirmsskolas vecumam (3–6 g.)', 'Skolas vecumam (6+ g.)'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Bojāts'] },
        ]
      },
      'Zīdaiņu preces': {
        name: 'Zīdaiņu preces',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Higiēna un vanniņas', 'Barošana (pudeliņas, krūzītes)', 'Monitora un drošības ierīces', 'Savienotāji un ietinēji', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs'] },
        ]
      },
      'Grāmatas un izglītojošie materiāli': {
        name: 'Grāmatas un izglītojošie materiāli',
        fields: [
          { name: 'ageGroup', label: 'Vecuma grupa', type: 'select', options: ['0–3 gadi', '3–6 gadi', '6–10 gadi', '10–14 gadi'] },
          { name: 'type', label: 'Tips', type: 'select', options: ['Grāmatas', 'Mācību materiāli', 'Muzikālie materiāli', 'Zīmēšanas un mākslas komplekti', 'Cits'] },
          { name: 'language', label: 'Valoda', type: 'select', options: ['Latviešu', 'Angļu', 'Krievu', 'Cita'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Labs', 'Ar nolietojumu'] },
        ]
      },
    }
  },

  'Sports un hobiji': {
    name: 'Sports un hobiji',
    subcategories: {
      'Sporta inventārs': {
        name: 'Sporta inventārs',
        fields: [
          { name: 'sportType', label: 'Sporta veids', type: 'select', options: ['Fitness un trenažieri', 'Futbols', 'Basketbols', 'Teniss/Badmintons', 'Peldēšana', 'Slēpošana/Snovbords', 'Bokss/Cīņas māksla', 'Golf', 'Vieglatlētika', 'Velobraukšana', 'Ūdenssports', 'Cits'] },
          { name: 'brand', label: 'Zīmols', type: 'text' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Nolietots'] },
        ]
      },
      'Velosipēdi un skūteri': {
        name: 'Velosipēdi un skūteri',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Kalnu (MTB)', 'Pilsētas', 'Šosejas', 'Elektriskais velosipēds', 'BMX', 'Skūteris', 'Elektriskais skūteris', 'Bērnu velosipēds'] },
          { name: 'brand', label: 'Marka', type: 'text', placeholder: 'Piem., Trek, Specialized, Xiaomi' },
          { name: 'frameSize', label: 'Rāmja izmērs', type: 'text', placeholder: 'Piem., 19", M' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Lietots'] },
        ]
      },
      'Medības un makšķerēšana': {
        name: 'Medības un makšķerēšana',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Makšķerēšanas rīki', 'Ēsmas un mānekļi', 'Medību apģērbs', 'Medību piederumi', 'Laivas un airēšana', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs'] },
        ]
      },
      'Tūrisms un kempings': {
        name: 'Tūrisms un kempings',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Teltis', 'Guļammaisie', 'Mugursomas', 'Gājēju apģērbs', 'Apakšzoles un alpīnisms', 'Kempinga piederumi', 'Ceļojumu aksesuāri', 'Cits'] },
          { name: 'brand', label: 'Zīmols', type: 'text' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Nolietots'] },
        ]
      },
      'Mūzikas instrumenti': {
        name: 'Mūzikas instrumenti',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Ģitāra (akustiskā)', 'Ģitāra (elektriskā)', 'Bass ģitāra', 'Klavieres/Keyboard', 'Bungas un perkusijas', 'Pūšaminstruments', 'Vijole un stīgu', 'DJ aprīkojums', 'Studijas tehnika', 'Cits'] },
          { name: 'brand', label: 'Zīmols', type: 'text' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Labs', 'Bojāts'] },
        ]
      },
      'Grāmatas un žurnāli': {
        name: 'Grāmatas un žurnāli',
        fields: [
          { name: 'genre', label: 'Žanrs', type: 'select', options: ['Daiļliteratūra', 'Bērnu literatūra', 'Zinātne un izglītība', 'Vēsture', 'Psiholoģija', 'Bizness', 'Māksla un dizains', 'Ceļveži', 'Žurnāli', 'Cits'] },
          { name: 'language', label: 'Valoda', type: 'select', options: ['Latviešu', 'Angļu', 'Krievu', 'Vācu', 'Cita'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Labs', 'Ar nolietojumu'] },
        ]
      },
      'Kolekcionēšana un antikvariāts': {
        name: 'Kolekcionēšana un antikvariāts',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Monētas un banknotes', 'Pastmarkas', 'Antikvariāts', 'Gleznas un mākslas darbi', 'Figūriņas un modeļi', 'Plakāti un vintāža', 'Vinila plates', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Teicams', 'Labs', 'Pieņemams', 'Restaurēts'] },
        ]
      },
      'Māksla un radošums': {
        name: 'Māksla un radošums',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Zīmēšanas piederumi', 'Akvareļi un eļļas krāsas', 'Rokdarbu piederumi', 'Šūšanas piederumi', 'Keramika', 'Foto un video (hobijs)', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots'] },
        ]
      },
    }
  },

  'Dzīvnieki': {
    name: 'Dzīvnieki',
    subcategories: {
      'Suņi un kucēni': {
        name: 'Suņi un kucēni',
        fields: [
          { name: 'dealType', label: 'Darījuma veids', type: 'select', options: ['Pārdod', 'Dod bez maksas', 'Meklē mājas'] },
          { name: 'breed', label: 'Šķirne', type: 'text', placeholder: 'Piem., Labrador, Vācu aitu suns' },
          { name: 'age', label: 'Vecums', type: 'select', options: ['Līdz 3 mēn. (kucēns)', '3–12 mēn.', '1–3 gadi', '3–7 gadi', '7+ gadi'] },
          { name: 'gender', label: 'Dzimums', type: 'select', options: ['Tēviņš', 'Mātīte'] },
          { name: 'pedigree', label: 'Ciltsraksti', type: 'select', options: ['Ar ciltsrakstiem (FCI)', 'Bez ciltsrakstiem'] },
          { name: 'vaccinated', label: 'Vakcinēts', type: 'select', options: ['Jā', 'Daļēji', 'Nē'] },
          { name: 'chipped', label: 'Čipēts', type: 'select', options: ['Jā', 'Nē'] },
          { name: 'neutered', label: 'Kastrēts/Sterilizēts', type: 'select', options: ['Jā', 'Nē'] },
        ]
      },
      'Kaķi un kaķēni': {
        name: 'Kaķi un kaķēni',
        fields: [
          { name: 'dealType', label: 'Darījuma veids', type: 'select', options: ['Pārdod', 'Dod bez maksas', 'Meklē mājas'] },
          { name: 'breed', label: 'Šķirne', type: 'text', placeholder: 'Piem., Maine Coon, Persijas, Maisījums' },
          { name: 'age', label: 'Vecums', type: 'select', options: ['Līdz 3 mēn.', '3–12 mēn.', '1–5 gadi', '5+ gadi'] },
          { name: 'gender', label: 'Dzimums', type: 'select', options: ['Tēviņš', 'Mātīte'] },
          { name: 'pedigree', label: 'Ciltsraksti', type: 'select', options: ['Ar ciltsrakstiem', 'Bez ciltsrakstiem'] },
          { name: 'vaccinated', label: 'Vakcinēts', type: 'select', options: ['Jā', 'Daļēji', 'Nē'] },
          { name: 'neutered', label: 'Kastrēts/Sterilizēts', type: 'select', options: ['Jā', 'Nē'] },
        ]
      },
      'Putni': {
        name: 'Putni',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Papagailis', 'Kanārijputns', 'Zīlīte', 'Cits dekoratīvs putns'] },
          { name: 'age', label: 'Vecums', type: 'text' },
          { name: 'dealType', label: 'Darījuma veids', type: 'select', options: ['Pārdod', 'Dod bez maksas'] },
        ]
      },
      'Zivis un akvāriji': {
        name: 'Zivis un akvāriji',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Akvārija zivis', 'Akvārijs', 'Filtrēšanas sistēma', 'Akvārija dekors', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Labs'] },
        ]
      },
      'Grauzēji un truši': {
        name: 'Grauzēji un truši',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Trusis', 'Jūrascūciņa', 'Kāmis', 'Žurka', 'Šinšilla', 'Cits'] },
          { name: 'dealType', label: 'Darījuma veids', type: 'select', options: ['Pārdod', 'Dod bez maksas'] },
        ]
      },
      'Lauksaimniecības dzīvnieki': {
        name: 'Lauksaimniecības dzīvnieki',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Liellopi', 'Cūkas', 'Aitas un kazas', 'Mājputni', 'Zirgi', 'Trušu audzēšana', 'Cits'] },
          { name: 'age', label: 'Vecums', type: 'text' },
          { name: 'count', label: 'Daudzums', type: 'number', placeholder: 'Piem., 5' },
        ]
      },
      'Dzīvnieku barība un piederumi': {
        name: 'Dzīvnieku barība un piederumi',
        fields: [
          { name: 'animalType', label: 'Dzīvnieka veids', type: 'select', options: ['Suņiem', 'Kaķiem', 'Putniem', 'Zivīm', 'Grauzējiem', 'Zirģiem', 'Cits'] },
          { name: 'type', label: 'Tips', type: 'select', options: ['Barība (sausā)', 'Barība (konservēta)', 'Uzkodas un kārumi', 'Guļas un nami', 'Rotaļlietas', 'Apģērbi un aksesuāri', 'Pavadas un siksnas', 'Akvāriji un piederumi', 'Cits'] },
          { name: 'brand', label: 'Zīmols', type: 'text' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Atvērts (nelietots)', 'Daļēji izlietots'] },
        ]
      },
    }
  },

  'Pārtika un lauksaimniecība': {
    name: 'Pārtika un lauksaimniecība',
    subcategories: {
      'Dārzeņi un augļi': {
        name: 'Dārzeņi un augļi',
        fields: [
          { name: 'type', label: 'Tips', type: 'text', placeholder: 'Piem., Tomāti, Kartupeļi, Āboli' },
          { name: 'origin', label: 'Izcelsme', type: 'select', options: ['Mājas ražots', 'Saimniecības ražots', 'Bio/Ekosertificēts', 'Cits'] },
          { name: 'city', label: 'Pilsēta/Apgabals', type: 'select', options: CITIES },
          { name: 'quantity', label: 'Daudzums', type: 'text', placeholder: 'Piem., 5 kg, 1 maiss' },
          { name: 'delivery', label: 'Piegāde', type: 'select', options: ['Pieejama', 'Tikai paņemšana uz vietas'] },
        ]
      },
      'Piena produkti un olas': {
        name: 'Piena produkti un olas',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Piens', 'Biezpiens', 'Siers', 'Jogurts', 'Krējums', 'Sviests', 'Olas', 'Cits'] },
          { name: 'origin', label: 'Izcelsme', type: 'select', options: ['Mājas ražots', 'Saimniecības ražots', 'Bio/Ekosertificēts'] },
          { name: 'city', label: 'Pilsēta/Apgabals', type: 'select', options: CITIES },
          { name: 'quantity', label: 'Daudzums', type: 'text', placeholder: 'Piem., 1 litrs, 10 gab.' },
        ]
      },
      'Gaļa un zivis': {
        name: 'Gaļa un zivis',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Cūkgaļa', 'Liellopu gaļa', 'Vistas gaļa', 'Jēra gaļa', 'Medījuma gaļa', 'Zivis (svaigas)', 'Zivis (kūpinātas)', 'Cits'] },
          { name: 'origin', label: 'Izcelsme', type: 'select', options: ['Mājas ražots', 'Saimniecības ražots', 'Bio/Ekosertificēts'] },
          { name: 'city', label: 'Pilsēta/Apgabals', type: 'select', options: CITIES },
          { name: 'quantity', label: 'Daudzums (kg)', type: 'number' },
        ]
      },
      'Medus un bišu produkti': {
        name: 'Medus un bišu produkti',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Medus', 'Bišu vasks', 'Mātes pieniņš', 'Bišu maize', 'Propolis', 'Cits'] },
          { name: 'honeyType', label: 'Medus veids', type: 'select', options: ['Linden (liepziedu)', 'Nektāra', 'Griķu', 'Ainas', 'Jaukts', 'Cits'] },
          { name: 'origin', label: 'Izcelsme', type: 'select', options: ['Mājas ražots', 'Bio/Ekosertificēts'] },
          { name: 'city', label: 'Pilsēta/Apgabals', type: 'select', options: CITIES },
          { name: 'quantity', label: 'Daudzums', type: 'text', placeholder: 'Piem., 500g, 1 kg' },
        ]
      },
      'Mājas konservi un marmelādes': {
        name: 'Mājas konservi un marmelādes',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Ievārījums un džems', 'Marinēti dārzeņi', 'Kompoti', 'Sulas', 'Mērces', 'Cits'] },
          { name: 'origin', label: 'Izcelsme', type: 'select', options: ['Mājas ražots', 'Bez konservantiem'] },
          { name: 'city', label: 'Pilsēta/Apgabals', type: 'select', options: CITIES },
          { name: 'quantity', label: 'Daudzums', type: 'text', placeholder: 'Piem., 3 burkas x 0.5 l' },
        ]
      },
      'Sēklas un stādi': {
        name: 'Sēklas un stādi',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Dārzeņu sēklas', 'Ziedu sēklas', 'Augļu koki', 'Ogulāji', 'Dekoratīvie augi', 'Iekštelpu augi', 'Sēņu micēlijs', 'Cits'] },
          { name: 'origin', label: 'Izcelsme', type: 'select', options: ['Mājas audzēts', 'Sertificēts', 'Imports'] },
          { name: 'city', label: 'Pilsēta/Apgabals', type: 'select', options: CITIES },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns (iepakojumā)', 'Sagatavots stādīšanai'] },
        ]
      },
      'Dzērieni': {
        name: 'Dzērieni',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Vīns (mājas)', 'Sulas un nektāri', 'Alus (mājas)', 'Kvass', 'Tējas un zāļu tējas', 'Cits'] },
          { name: 'origin', label: 'Izcelsme', type: 'select', options: ['Mājas ražots', 'Bio/Ekosertificēts'] },
          { name: 'city', label: 'Pilsēta/Apgabals', type: 'select', options: CITIES },
          { name: 'quantity', label: 'Daudzums', type: 'text', placeholder: 'Piem., 1 l, 6 pudeles' },
        ]
      },
      'Citi pārtikas produkti': {
        name: 'Citi pārtikas produkti',
        fields: [
          { name: 'type', label: 'Produkts', type: 'text', placeholder: 'Aprakstiet produktu' },
          { name: 'origin', label: 'Izcelsme', type: 'select', options: ['Mājas ražots', 'Saimniecības ražots', 'Bio/Ekosertificēts', 'Cits'] },
          { name: 'city', label: 'Pilsēta/Apgabals', type: 'select', options: CITIES },
          { name: 'quantity', label: 'Daudzums', type: 'text' },
        ]
      },
    }
  },

  'Cits': {
    name: 'Cits',
    subcategories: {
      'Dažādi': {
        name: 'Dažādi',
        fields: [
          { name: 'type', label: 'Produkta veids', type: 'text', placeholder: 'Brīvs apraksts' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots', 'Bojāts'] },
        ]
      }
    }
  }
};

export const CATEGORY_NAMES = Object.keys(CATEGORY_SCHEMAS);
