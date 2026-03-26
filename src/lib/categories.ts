export interface CategoryField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  placeholder?: string;
}

export interface SubcategorySchema {
  name: string;
  fields: CategoryField[];
}

export interface CategorySchema {
  name: string;
  subcategories: Record<string, SubcategorySchema>;
}

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
      'Kravas auto un tehnika': {
        name: 'Kravas auto un tehnika',
        fields: [
          { name: 'type', label: 'Tehnikas tips', type: 'select', options: ['Kravas auto', 'Traktors', 'Piekabe', 'Ekskavators', 'Cits'] },
          { name: 'brand', label: 'Marka', type: 'text', placeholder: 'Piem., Volvo, Scania, John Deere' },
          { name: 'year', label: 'Izlaiduma gads', type: 'number', placeholder: 'Piem., 2010' },
          { name: 'weight', label: 'Pilna masa (kg)', type: 'number', placeholder: 'Piem., 18000' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Lietots', 'Jauns', 'Bojāts'] },
        ]
      },
      'Motocikli un kvadricikli': {
        name: 'Motocikli un kvadricikli',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Motocikls', 'Kvadricikls', 'Motorolleris', 'Mopēds'] },
          { name: 'brand', label: 'Marka', type: 'text', placeholder: 'Piem., Yamaha, Honda' },
          { name: 'year', label: 'Izlaiduma gads', type: 'number', placeholder: 'Piem., 2018' },
          { name: 'engine', label: 'Dzinēja tilpums (cm³)', type: 'number', placeholder: 'Piem., 600' },
        ]
      },
      'Velosipēdi un skrejriteņi': {
        name: 'Velosipēdi un skrejriteņi',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Kalnu (MTB)', 'Pilsētas', 'Šosejas', 'Elektriskais velosipēds', 'Elektriskais skrejritenis', 'Bērnu'] },
          { name: 'brand', label: 'Marka', type: 'text', placeholder: 'Piem., Trek, Merida, Xiaomi' },
          { name: 'frameSize', label: 'Rāmja izmērs', type: 'text', placeholder: 'Piem., L, 19"' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Lietots', 'Jauns'] },
        ]
      }
    }
  },
  'Nekustamais īpašums': {
    name: 'Nekustamais īpašums',
    subcategories: {
      'Dzīvokļi': {
        name: 'Dzīvokļi',
        fields: [
          { name: 'action', label: 'Darījuma veids', type: 'select', options: ['Pārdod', 'Izīrē', 'Pērk', 'Īrē'] },
          { name: 'city', label: 'Pilsēta/Novads', type: 'text', placeholder: 'Piem., Rīga, Jūrmala, Mārupes nov.' },
          { name: 'district', label: 'Rajons/Pagasts', type: 'text', placeholder: 'Piem., Centrs, Purvciems' },
          { name: 'rooms', label: 'Istabu skaits', type: 'number', placeholder: 'Piem., 2' },
          { name: 'area', label: 'Platība (m²)', type: 'number', placeholder: 'Piem., 55' },
          { name: 'floor', label: 'Stāvs', type: 'text', placeholder: 'Piem., 3/5' },
          { name: 'series', label: 'Mājas sērija', type: 'select', options: ['Jaunais projekts', 'Pirmskara', 'Renovēta', '119. sērija', '103. sērija', '104. sērija', 'Hruščova', 'Lietuviešu', 'Specprojekts', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Lielisks', 'Gatavs dzīvošanai', 'Nepieciešams kosmētiskais', 'Nepieciešams kapitālais'] },
        ]
      },
      'Mājas un vasarnīcas': {
        name: 'Mājas un vasarnīcas',
        fields: [
          { name: 'action', label: 'Darījuma veids', type: 'select', options: ['Pārdod', 'Izīrē', 'Pērk', 'Īrē'] },
          { name: 'city', label: 'Pilsēta/Novads', type: 'text', placeholder: 'Piem., Rīga, Jūrmala, Mārupes nov.' },
          { name: 'district', label: 'Rajons/Pagasts', type: 'text', placeholder: 'Piem., Centrs, Purvciems' },
          { name: 'area', label: 'Mājas platība (m²)', type: 'number', placeholder: 'Piem., 150' },
          { name: 'landArea', label: 'Zemes platība (m²)', type: 'number', placeholder: 'Piem., 1200' },
          { name: 'floors', label: 'Stāvu skaits', type: 'number', placeholder: 'Piem., 2' },
          { name: 'rooms', label: 'Istabu skaits', type: 'number', placeholder: 'Piem., 4' },
        ]
      },
      'Zeme': {
        name: 'Zeme',
        fields: [
          { name: 'action', label: 'Darījuma veids', type: 'select', options: ['Pārdod', 'Izīrē', 'Pērk'] },
          { name: 'city', label: 'Pilsēta/Novads', type: 'text', placeholder: 'Piem., Rīga, Jūrmala, Mārupes nov.' },
          { name: 'district', label: 'Rajons/Pagasts', type: 'text', placeholder: 'Piem., Centrs, Purvciems' },
          { name: 'area', label: 'Platība (m²)', type: 'number', placeholder: 'Piem., 1500' },
          { name: 'purpose', label: 'Pielietojums', type: 'select', options: ['Apbūvei', 'Lauksaimniecībai', 'Mežs', 'Komerciālai apbūvei', 'Cits'] },
        ]
      },
      'Komerctelpas': {
        name: 'Komerctelpas',
        fields: [
          { name: 'action', label: 'Darījuma veids', type: 'select', options: ['Pārdod', 'Izīrē', 'Pērk', 'Īrē'] },
          { name: 'type', label: 'Telpu tips', type: 'select', options: ['Birojs', 'Tirdzniecības', 'Noliktava', 'Ražošana', 'Cits'] },
          { name: 'city', label: 'Pilsēta/Novads', type: 'text', placeholder: 'Piem., Rīga' },
          { name: 'area', label: 'Platība (m²)', type: 'number', placeholder: 'Piem., 200' },
        ]
      }
    }
  },
  'Elektronika': {
    name: 'Elektronika',
    subcategories: {
      'Mobilie telefoni': {
        name: 'Mobilie telefoni',
        fields: [
          { name: 'brand', label: 'Ražotājs', type: 'text', placeholder: 'Piem., Apple, Samsung, Xiaomi' },
          { name: 'model', label: 'Modelis', type: 'text', placeholder: 'Piem., iPhone 13 Pro' },
          { name: 'storage', label: 'Atmiņa (GB)', type: 'select', options: ['64', '128', '256', '512', '1024'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots (Kā jauns)', 'Lietots', 'Bojāts'] },
          { name: 'warranty', label: 'Garantija', type: 'select', options: ['Ir', 'Nav'] },
        ]
      },
      'Datori un planšetdatori': {
        name: 'Datori un planšetdatori',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Portatīvais dators', 'Stacionārais dators', 'Planšetdators', 'Komponentes', 'Cits'] },
          { name: 'brand', label: 'Ražotājs', type: 'text', placeholder: 'Piem., Apple, Lenovo, Asus' },
          { name: 'processor', label: 'Procesors (CPU)', type: 'text', placeholder: 'Piem., Intel Core i5, Apple M1' },
          { name: 'ram', label: 'Operatīvā atmiņa (RAM)', type: 'select', options: ['4 GB', '8 GB', '16 GB', '32 GB', '64 GB+'] },
          { name: 'storage', label: 'Atmiņa (SSD/HDD)', type: 'text', placeholder: 'Piem., 512 GB SSD' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots (Kā jauns)', 'Lietots', 'Bojāts'] },
        ]
      },
      'Sadzīves tehnika': {
        name: 'Sadzīves tehnika',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Veļas mašīnas', 'Ledusskapji', 'Plītis un cepeškrāsnis', 'Trauku mazgājamās mašīnas', 'Putekļusūcēji', 'Cits'] },
          { name: 'brand', label: 'Ražotājs', type: 'text', placeholder: 'Piem., Bosch, Samsung, LG' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots', 'Bojāts'] },
        ]
      },
      'Audio, Video, Foto': {
        name: 'Audio, Video, Foto',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Televizori', 'Audio tehnika', 'Fotoaparāti', 'Droni', 'Cits'] },
          { name: 'brand', label: 'Ražotājs', type: 'text', placeholder: 'Piem., Sony, Canon, DJI' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots', 'Bojāts'] },
        ]
      }
    }
  },
  'Darbs un pakalpojumi': {
    name: 'Darbs un pakalpojumi',
    subcategories: {
      'Piedāvā darbu (Vakances)': {
        name: 'Piedāvā darbu (Vakances)',
        fields: [
          { name: 'industry', label: 'Nozare', type: 'select', options: ['IT un telekomunikācijas', 'Būvniecība', 'Tirdzniecība', 'Transports un loģistika', 'Ēdināšana', 'Ražošana', 'Klientu apkalpošana', 'Cits'] },
          { name: 'position', label: 'Amats', type: 'text', placeholder: 'Piem., Programmētājs, Pārdevējs' },
          { name: 'salary', label: 'Alga (Bruto)', type: 'text', placeholder: 'Piem., 1500 - 2000 EUR' },
          { name: 'workload', label: 'Slodze', type: 'select', options: ['Pilna slodze', 'Pusslodze', 'Gabaldarbs', 'Maiņu darbs'] },
          { name: 'location', label: 'Darba vieta', type: 'text', placeholder: 'Piem., Rīga, Attālināti' },
        ]
      },
      'Meklē darbu': {
        name: 'Meklē darbu',
        fields: [
          { name: 'industry', label: 'Vēlamā nozare', type: 'select', options: ['IT un telekomunikācijas', 'Būvniecība', 'Tirdzniecība', 'Transports un loģistika', 'Ēdināšana', 'Ražošana', 'Klientu apkalpošana', 'Cits'] },
          { name: 'position', label: 'Vēlamais amats', type: 'text', placeholder: 'Piem., Projektu vadītājs' },
          { name: 'experience', label: 'Pieredze', type: 'select', options: ['Bez pieredzes', 'Līdz 1 gadam', '1-3 gadi', '3-5 gadi', 'Vairāk kā 5 gadi'] },
          { name: 'education', label: 'Izglītība', type: 'select', options: ['Pamatizglītība', 'Vidējā', 'Vidējā profesionālā', 'Augstākā', 'Cits'] },
        ]
      },
      'Pakalpojumi': {
        name: 'Pakalpojumi',
        fields: [
          { name: 'industry', label: 'Nozare', type: 'select', options: ['Būvniecība un remonts', 'Auto remonts', 'Skaistumkopšana', 'Tīrīšana un uzkopšana', 'IT un dizains', 'Juridiskie pakalpojumi', 'Cits'] },
          { name: 'serviceType', label: 'Pakalpojuma veids', type: 'text', placeholder: 'Piem., Santehniķis, Grāmatvedis' },
          { name: 'priceType', label: 'Cenas veids', type: 'select', options: ['Stundas likme', 'Par gabaldarbu', 'Pēc vienošanās'] },
          { name: 'location', label: 'Pakalpojuma sniegšanas vieta', type: 'text', placeholder: 'Piem., Rīga un Pierīga' },
        ]
      }
    }
  },
  'Mājai un dārzam': {
    name: 'Mājai un dārzam',
    subcategories: {
      'Mēbeles un interjers': {
        name: 'Mēbeles un interjers',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Dīvāni un gultas', 'Skapji un plaukti', 'Galdi un krēsli', 'Virtuves mēbeles', 'Interjera priekšmeti', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots', 'Restaurēts'] },
          { name: 'material', label: 'Materiāls', type: 'text', placeholder: 'Piem., Koks, Āda, Metāls' },
        ]
      },
      'Būvmateriāli un instrumenti': {
        name: 'Būvmateriāli un instrumenti',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Būvmateriāli', 'Santehnika', 'Apkure un ventilācija', 'Elektromateriāli', 'Instrumenti', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots'] },
        ]
      },
      'Dārzam': {
        name: 'Dārzam',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Dārza tehnika', 'Augi un stādi', 'Dārza mēbeles', 'Siltumnīcas', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots'] },
        ]
      }
    }
  },
  'Cits': {
    name: 'Cits',
    subcategories: {
      'Dažādi': {
        name: 'Dažādi',
        fields: [
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots', 'Bojāts'] },
        ]
      }
    }
  }
};

export const CATEGORY_NAMES = Object.keys(CATEGORY_SCHEMAS);
