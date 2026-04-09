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
      'Motocikli un kvadricikli': {
        name: 'Motocikli un kvadricikli',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Motocikls', 'Kvadricikls', 'Motorolleris', 'Mopēds'] },
          { name: 'brand', label: 'Marka', type: 'text', placeholder: 'Piem., Yamaha, Honda' },
          { name: 'year', label: 'Izlaiduma gads', type: 'number', placeholder: 'Piem., 2018' },
          { name: 'engine', label: 'Dzinēja tilpums (cm³)', type: 'number', placeholder: 'Piem., 600' },
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
      'Velosipēdi un skrejriteņi': {
        name: 'Velosipēdi un skrejriteņi',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Kalnu (MTB)', 'Pilsētas', 'Šosejas', 'Elektriskais velosipēds', 'Elektriskais skrejritenis', 'Bērnu'] },
          { name: 'brand', label: 'Marka', type: 'text', placeholder: 'Piem., Trek, Merida, Xiaomi' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Lietots', 'Jauns'] },
        ]
      },
      'Ūdens transports': {
        name: 'Ūdens transports',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Motorlaiva', 'Kuteris', 'Ūdens motocikls', 'Jahta', 'Piepūšamā laiva', 'Cits'] },
          { name: 'year', label: 'Izlaiduma gads', type: 'number' },
          { name: 'length', label: 'Garums (m)', type: 'number' },
        ]
      },
      'Rezerves daļas un piederumi': {
        name: 'Rezerves daļas un piederumi',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Auto rezerves daļas', 'Moto rezerves daļas', 'Riepas un diski', 'Audio un piederumi', 'Eļļas un šķidrumi', 'Cits'] },
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
          { name: 'area', label: 'Mājas platība (m²)', type: 'number', placeholder: 'Piem., 150' },
          { name: 'landArea', label: 'Zemes platība (m²)', type: 'number', placeholder: 'Piem., 1200' },
          { name: 'rooms', label: 'Istabu skaits', type: 'number', placeholder: 'Piem., 4' },
        ]
      },
      'Zeme un mežs': {
        name: 'Zeme un mežs',
        fields: [
          { name: 'action', label: 'Darījuma veids', type: 'select', options: ['Pārdod', 'Pērk'] },
          { name: 'purpose', label: 'Pielietojums', type: 'select', options: ['Apbūvei', 'Lauksaimniecībai', 'Mežs', 'Komerciālai apbūvei', 'Cits'] },
          { name: 'area', label: 'Platība (m²)', type: 'number', placeholder: 'Piem., 1500' },
        ]
      },
      'Komerctelpas': {
        name: 'Komerctelpas',
        fields: [
          { name: 'action', label: 'Darījuma veids', type: 'select', options: ['Pārdod', 'Izīrē', 'Pērk', 'Īrē'] },
          { name: 'type', label: 'Telpu tips', type: 'select', options: ['Birojs', 'Tirdzniecības', 'Noliktava', 'Ražošana', 'Cits'] },
          { name: 'area', label: 'Platība (m²)', type: 'number', placeholder: 'Piem., 200' },
        ]
      },
      'Garāžas un stāvvietas': {
        name: 'Garāžas un stāvvietas',
        fields: [
          { name: 'action', label: 'Darījuma veids', type: 'select', options: ['Pārdod', 'Izīrē', 'Pērk', 'Īrē'] },
          { name: 'location', label: 'Atrašanās vieta', type: 'text' },
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
        ]
      },
      'Datori un planšetdatori': {
        name: 'Datori un planšetdatori',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Portatīvais dators', 'Stacionārais dators', 'Planšetdators', 'Komponentes', 'Cits'] },
          { name: 'brand', label: 'Ražotājs', type: 'text', placeholder: 'Piem., Apple, Lenovo, Asus' },
          { name: 'processor', label: 'Procesors (CPU)', type: 'text', placeholder: 'Piem., Intel Core i5, Apple M1' },
          { name: 'ram', label: 'Operatīvā atmiņa (RAM)', type: 'select', options: ['4 GB', '8 GB', '16 GB', '32 GB', '64 GB+'] },
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
      },
      'Spēļu konsoles un spēles': {
        name: 'Spēļu konsoles un spēles',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Konsole', 'Spēle', 'Piederumi'] },
          { name: 'platform', label: 'Platforma', type: 'select', options: ['PlayStation', 'Xbox', 'Nintendo', 'PC', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots'] },
        ]
      }
    }
  },
  'Darbs un pakalpojumi': {
    name: 'Darbs un pakalpojumi',
    subcategories: {
      'Vakances (Piedāvā darbu)': {
        name: 'Vakances (Piedāvā darbu)',
        fields: [
          { name: 'industry', label: 'Nozare', type: 'select', options: ['IT un telekomunikācijas', 'Būvniecība', 'Tirdzniecība', 'Transports un loģistika', 'Ēdināšana', 'Ražošana', 'Klientu apkalpošana', 'Cits'] },
          { name: 'position', label: 'Amats', type: 'text', placeholder: 'Piem., Programmētājs, Pārdevējs' },
          { name: 'salary', label: 'Alga (Bruto)', type: 'text', placeholder: 'Piem., 1500 - 2000 EUR' },
          { name: 'workload', label: 'Slodze', type: 'select', options: ['Pilna slodze', 'Pusslodze', 'Gabaldarbs', 'Maiņu darbs'] },
        ]
      },
      'Meklē darbu': {
        name: 'Meklē darbu',
        fields: [
          { name: 'industry', label: 'Vēlamā nozare', type: 'select', options: ['IT un telekomunikācijas', 'Būvniecība', 'Tirdzniecība', 'Transports un loģistika', 'Ēdināšana', 'Ražošana', 'Klientu apkalpošana', 'Cits'] },
          { name: 'position', label: 'Vēlamais amats', type: 'text', placeholder: 'Piem., Projektu vadītājs' },
          { name: 'experience', label: 'Pieredze', type: 'select', options: ['Bez pieredzes', 'Līdz 1 gadam', '1-3 gadi', '3-5 gadi', 'Vairāk kā 5 gadi'] },
        ]
      },
      'Pakalpojumi': {
        name: 'Pakalpojumi',
        fields: [
          { name: 'industry', label: 'Nozare', type: 'select', options: ['Būvniecība un remonts', 'Auto remonts', 'Skaistumkopšana', 'Tīrīšana un uzkopšana', 'IT un dizains', 'Juridiskie pakalpojumi', 'Cits'] },
          { name: 'priceType', label: 'Cenas veids', type: 'select', options: ['Stundas likme', 'Par gabaldarbu', 'Pēc vienošanās'] },
        ]
      },
      'Kursi un izglītība': {
        name: 'Kursi un izglītība',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Valodu kursi', 'IT apmācības', 'Autoskola', 'Augstākā izglītība', 'Cits'] },
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
      'Dārzam un pagalmam': {
        name: 'Dārzam un pagalmam',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Dārza tehnika', 'Augi un stādi', 'Dārza mēbeles', 'Siltumnīcas', 'Cits'] },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots'] },
        ]
      },
      'Santehnika un apkure': {
        name: 'Santehnika un apkure',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Vannas istabai', 'Virtuvei', 'Apkures katli', 'Radiatori', 'Cits'] },
        ]
      }
    }
  },
  'Mode un stils': {
    name: 'Mode un stils',
    subcategories: {
      'Sieviešu apģērbi': {
        name: 'Sieviešu apģērbi',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Kleitas', 'Virsdrēbes', 'Bikses', 'Krekli un blūzes', 'Cits'] },
          { name: 'size', label: 'Izmērs', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Cits'] },
          { name: 'brand', label: 'Zīmols', type: 'text' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Lietots'] },
        ]
      },
      'Vīriešu apģērbi': {
        name: 'Vīriešu apģērbi',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Virsdrēbes', 'Bikses', 'Krekli', 'Uzlvalki', 'Cits'] },
          { name: 'size', label: 'Izmērs', type: 'select', options: ['S', 'M', 'L', 'XL', 'XXL', 'Cits'] },
          { name: 'brand', label: 'Zīmols', type: 'text' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Lietots'] },
        ]
      },
      'Apavi': {
        name: 'Apavi',
        fields: [
          { name: 'gender', label: 'Dzimums', type: 'select', options: ['Sieviešu', 'Vīriešu', 'Unisex'] },
          { name: 'size', label: 'Izmērs', type: 'number' },
          { name: 'brand', label: 'Zīmols', type: 'text' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Kā jauns', 'Lietots'] },
        ]
      },
      'Aksesuāri un rotaslietas': {
        name: 'Aksesuāri un rotaslietas',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Somas', 'Pulksteņi', 'Rotaslietas', 'Saulesbrilles', 'Cits'] },
        ]
      },
      'Skaistumkopšana un veselība': {
        name: 'Skaistumkopšana un veselība',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Kosmētika', 'Smaržas', 'Veselības preces', 'Cits'] },
        ]
      }
    }
  },
  'Bērniem': {
    name: 'Bērniem',
    subcategories: {
      'Apģērbi un apavi': {
        name: 'Apģērbi un apavi',
        fields: [
          { name: 'gender', label: 'Dzimums', type: 'select', options: ['Meitenēm', 'Zēniem', 'Unisex'] },
          { name: 'age', label: 'Vecums/Izmērs', type: 'text' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots'] },
        ]
      },
      'Rotaļlietas un spēles': {
        name: 'Rotaļlietas un spēles',
        fields: [
          { name: 'ageGroup', label: 'Vecuma grupa', type: 'select', options: ['0-3 mēn', '3-12 mēn', '1-3 gadi', '3-6 gadi', '6+ gadi'] },
          { name: 'type', label: 'Tips', type: 'select', options: ['Mīkstās rotaļlietas', 'Konstruktori', 'Galda spēles', 'Lelles', 'Mašīnas', 'Cits'] },
        ]
      },
      'Ratiņi un mēbeles': {
        name: 'Ratiņi un mēbeles',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Bērnu ratiņi', 'Autokrēsliņi', 'Gultiņas', 'Barošanas krēsliņi', 'Cits'] },
        ]
      },
      'Zīdaiņu preces': {
        name: 'Zīdaiņu preces',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Higiēna', 'Barošana', 'Cits'] },
        ]
      }
    }
  },
  'Sports un hobiji': {
    name: 'Sports un hobiji',
    subcategories: {
      'Sporta inventārs': {
        name: 'Sporta inventārs',
        fields: [
          { name: 'type', label: 'Sporta veids', type: 'text', placeholder: 'Piem., Fitness, Futbols, Teniss' },
          { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots'] },
        ]
      },
      'Medības un makšķerēšana': {
        name: 'Medības un makšķerēšana',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Makšķerēšana', 'Medības', 'Apģērbs un apavi', 'Cits'] },
        ]
      },
      'Mūzikas instrumenti': {
        name: 'Mūzikas instrumenti',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Ģitāras', 'Taustiņinstrumenti', 'Sitamie instrumenti', 'Audio tehnika', 'Cits'] },
        ]
      },
      'Grāmatas un žurnāli': {
        name: 'Grāmatas un žurnāli',
        fields: [
          { name: 'genre', label: 'Žanrs', type: 'text' },
          { name: 'language', label: 'Valoda', type: 'select', options: ['Latviešu', 'Angļu', 'Krievu', 'Cita'] },
        ]
      },
      'Kolekcionēšana': {
        name: 'Kolekcionēšana',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Monētas un banknotes', 'Pastmarkas', 'Antikvariāts', 'Modeļi', 'Cits'] },
        ]
      }
    }
  },
  'Dzīvnieki': {
    name: 'Dzīvnieki',
    subcategories: {
      'Suņi un kucēni': {
        name: 'Suņi un kucēni',
        fields: [
          { name: 'breed', label: 'Šķirne', type: 'text' },
          { name: 'age', label: 'Vecums', type: 'text' },
        ]
      },
      'Kaķi un kaķēni': {
        name: 'Kaķi un kaķēni',
        fields: [
          { name: 'breed', label: 'Šķirne', type: 'text' },
          { name: 'age', label: 'Vecums', type: 'text' },
        ]
      },
      'Lauksaimniecības dzīvnieki': {
        name: 'Lauksaimniecības dzīvnieki',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Liellopi', 'Cūkas', 'Aitas un kazas', 'Mājputni', 'Zirgi', 'Cits'] },
        ]
      },
      'Barība un piederumi': {
        name: 'Barība un piederumi',
        fields: [
          { name: 'type', label: 'Tips', type: 'select', options: ['Barība', 'Aksesuāri', 'Higiēna', 'Cits'] },
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
