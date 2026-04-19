import 'dotenv/config';
import { pool } from '../server/pg';

const listings = [
  // --- TRANSPORTS ---
  {
    title: 'BMW 520d xDrive F10, 2013',
    description: 'Pārdodu savu BMW 520d xDrive automašīnu. Dzinējs 2.0d 184zs, automātiskā ātrumkārba 8 pakāpes. Pilns servisa vēsturiskais žurnāls. Ādas sēdekļi, navigācija, xenona lukturi, atpakaļgaitas kamera. Degvielas patēriņš ~5,5 l/100km. Bez rūsas, nevienā vietā nav sitienu. Tehniskā apskate līdz 2025. gada novembrim. Viens saimnieks no 2016. gada.',
    price: 28900,
    category: 'Transports',
    location: 'Rīga',
    image_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800',
    attributes: JSON.stringify({ make: 'BMW', model: '520d xDrive', year: 2013, mileage: 187000, fuel: 'Dīzelis', transmission: 'Automāts', body: 'Sedans', color: 'Melns', engine: '2.0', power: 184, drive: '4x4', condition: 'Lietots' }),
    is_highlighted: 1,
  },
  {
    title: 'Toyota Corolla Hybrid 2021, 1.8 Hybrid',
    description: 'Lieliski saglabāta Toyota Corolla hibrīds. Pilnīgi jauna baterija, garantija. Patēriņš pilsētā ~3,8 l/100km. Iegādāta jaunā pie oficiālā dīlera, pilns serviss pie Toyota. Bezkontakta atslēga, Apple CarPlay, Android Auto. Adaptīvais kruīza kontrols, joslu uzraudzība, automātiskā stāvēšana. Ideāli piemērota pilsētai un ilgiem ceļojumiem.',
    price: 19500,
    category: 'Transports',
    location: 'Jūrmala',
    image_url: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800',
    attributes: JSON.stringify({ make: 'Toyota', model: 'Corolla Hybrid', year: 2021, mileage: 43000, fuel: 'Hibrīds', transmission: 'Automāts', body: 'Universāls', color: 'Balts', engine: '1.8', power: 122, drive: 'Priekšpiedziņa', condition: 'Lietots' }),
    is_highlighted: 0,
  },
  {
    title: 'Volkswagen Golf 8 GTI Clubsport, 2022',
    description: 'VW Golf 8 GTI Clubsport 300 ZS, DCC adaptīvie amortizatori, diferenciālis ar bloķēšanos. Nopirkts jaunā pie VW Latvia. Garantija līdz 2025. gada augustam. Apkope veikta pie oficiālā dīlera. Harman Kardon audio, panorāmas jumts, digitālais instrumentu panelis. Riepu komplekts ziemas riepām iekļauts cenā.',
    price: 34200,
    category: 'Transports',
    location: 'Rīga',
    image_url: 'https://images.unsplash.com/photo-1606152421802-db97b9c7a11b?w=800',
    attributes: JSON.stringify({ make: 'Volkswagen', model: 'Golf 8 GTI Clubsport', year: 2022, mileage: 22000, fuel: 'Benzīns', transmission: 'Automāts', body: 'Hečbeks', color: 'Pelēks', engine: '2.0', power: 300, drive: 'Priekšpiedziņa', condition: 'Lietots' }),
    is_highlighted: 1,
  },

  // --- NEKUSTAMAIS ĪPAŠUMS ---
  {
    title: '3-istabu dzīvoklis jaunprojektā Teikā, 72m²',
    description: 'Pārdodu 3-istabu dzīvokli jaunprojektā "Teika Residence" (nodots 2022). 72 m², 4. stāvs no 9. Istabas orientētas uz parku. Pilna apdare, iebūvētā virtuve ar Bosch tehnika. Underfloor heating visā dzīvoklī. Divi tualetes. Noliktava pagrabā 4m². Pazemes autostāvvieta iekļauta cenā. 5 minūtes no Teika TPC.',
    price: 189000,
    category: 'Nekustamais īpašums',
    location: 'Rīga, Teika',
    image_url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    attributes: JSON.stringify({ property_type: 'Dzīvoklis', area: 72, rooms: 3, floor: 4, total_floors: 9, series: 'Jaunprojekts', condition: 'Pilna apdare' }),
    is_highlighted: 1,
  },
  {
    title: '2-istabu dzīvoklis Rīgas centrā, Alberta iela, 52m²',
    description: 'Pārdodu 2-istabu dzīvokli Art Nouveau namā Alberta ielā. 52 m², 3. stāvs no 5, ir lifts (2019. gadā uzstādīts). Augstas griesti 3,2m, parkets, krāsns kā dekors. Dzīvoklis renovēts 2020. gadā — jauni vadi, caurules, logi. Virtuve ar Ikea mēbelēm. 10 minūšu gājiens līdz Vecrīgai. Izīrēts par 750 EUR/mēnesī.',
    price: 128000,
    category: 'Nekustamais īpašums',
    location: 'Rīga, Centrs',
    image_url: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
    attributes: JSON.stringify({ property_type: 'Dzīvoklis', area: 52, rooms: 2, floor: 3, total_floors: 5, series: 'Staļina laika', condition: 'Renovēts' }),
    is_highlighted: 0,
  },

  // --- ELEKTRONIKA ---
  {
    title: 'Apple iPhone 15 Pro Max 256GB, Natural Titanium',
    description: 'Pārdodu iPhone 15 Pro Max 256GB Natural Titanium. Nopirkts 2023. gada oktobrī pie Apple Store Rīgā. Garantija līdz 2024. gada oktobrim. Lieliski saglabāts, nav nevienas skrāpes — lietots ar MagSafe vāciņu un rūdīta stikla aizsargu. Oriģinālais kabelis un lādētājs iekļauts. Atbloķēts visiem operatoriem.',
    price: 1150,
    category: 'Elektronika',
    location: 'Rīga',
    image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800',
    attributes: JSON.stringify({ brand: 'Apple', model: 'iPhone 15 Pro Max', storage: '256GB', color: 'Natural Titanium', condition: 'Lieliski', warranty: true }),
    is_highlighted: 0,
  },
  {
    title: 'MacBook Pro 14" M3 Pro, 18GB RAM, 512GB SSD, 2023',
    description: 'Pārdodu MacBook Pro 14 collu ar Apple M3 Pro čipu (11-core CPU, 14-core GPU), 18GB unified memory, 512GB SSD. Nopirkts 2023. gada decembrī. AppleCare+ līdz 2025. gadam. Baterija 98% veselība. Lieliski piemērots programmatūras izstrādei, video rediģēšanai, dizainam. Pievienots arī USB-C hub. Oriģinālais 96W lādētājs iekļauts.',
    price: 2100,
    category: 'Elektronika',
    location: 'Rīga',
    image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
    attributes: JSON.stringify({ brand: 'Apple', model: 'MacBook Pro 14" M3 Pro', storage: '512GB', color: 'Space Black', condition: 'Lieliski', warranty: true }),
    is_highlighted: 0,
  },
  {
    title: 'Sony PlayStation 5 + 4 spēles, DualSense balts',
    description: 'Pārdodu PlayStation 5 (disc versija) komplektā ar 4 spēlēm: Spider-Man 2, God of War Ragnarok, Horizon Forbidden West, FIFA 24. Oriģinālais DualSense kontrolieris, visi kabeļi, oriģinālā kaste. Konsolei 14 mēneši, lieliski stāvoklī. Pārdodu jo esmu nopircis PS5 Pro. Spēles oriģināli (fiziskās diski).',
    price: 480,
    category: 'Elektronika',
    location: 'Jūrmala',
    image_url: 'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=800',
    attributes: JSON.stringify({ brand: 'Sony', model: 'PlayStation 5', storage: '825GB', color: 'Balts', condition: 'Labs', warranty: false }),
    is_highlighted: 0,
  },

  // --- MĀJAI ---
  {
    title: 'Stūra dīvāns ar gultas funkciju, pelēks, 280x180cm',
    description: 'Pārdodu stūra dīvānu ar gultas funkciju. Izmēri: 280x180cm, L-veida konfigurācija (stūris labajā pusē). Pelēks auduma apšuvums (tīrāms). Gultas mehānisms piemērots ikdienas lietošanai. Ietilpīga veļas kaste. Pirms diviem gadiem nopirkts par 1200 EUR. Pārdodu telpas plānojuma maiņas dēļ. Var aplūkot pirms pirkuma.',
    price: 680,
    category: 'Mājai',
    location: 'Rīga, Imanta',
    image_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800',
    attributes: JSON.stringify({ item_type: 'Dīvāns', material: 'Audums', color: 'Pelēks', condition: 'Labs', dimensions: '280x180' }),
    is_highlighted: 0,
  },
  {
    title: 'Masīvkoka ozolkoka galds 200x100cm + 6 krēsli',
    description: 'Pārdodu masīvkoka ozolkoka pusdienu galdu (200x100cm, augstums 75cm) ar 6 atbilstošiem krēsliem. Galds izgatavots pasūtījumā pie Latvijas amatnieka, ozolkoks eļļots ar dabīgu eļļu. Krēsli ar mīkstinātiem sēdekļiem (bēžs audums). 3 gadi ekspluatācijā, lieliski stāvoklī. Pārdodu mājas pārdošanas dēļ.',
    price: 750,
    category: 'Mājai',
    location: 'Sigulda',
    image_url: 'https://images.unsplash.com/photo-1449247709967-d4461a6a6103?w=800',
    attributes: JSON.stringify({ item_type: 'Galds', material: 'Masīvkoks', color: 'Ozols', condition: 'Labs', dimensions: '200x100x75' }),
    is_highlighted: 0,
  },

  // --- BĒRNIEM ---
  {
    title: 'Bugaboo Fox 3 ratiņi, melns, ar piederumiem',
    description: 'Pārdodu Bugaboo Fox 3 ratiņus (2022. gada modelis) melnā krāsā. Komplektā: šūpulis jaundzimušajiem (lieliski stāvoklis), sportiskais sēdeklis, lietus pārsegs, saules sargs. Bērns tos lietojis no dzimšanas līdz 2 gadiem. Regulāri mazgāts un kopēts. Visi regulēšanas mehānismi darbojas nevainojami. Oriģinālā cena ~1400 EUR.',
    price: 650,
    category: 'Bērniem',
    location: 'Rīga',
    image_url: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800',
    attributes: JSON.stringify({ item_type: 'Ratiņi', brand: 'Bugaboo', model: 'Fox 3', age_group: '0-4 gadi', condition: 'Labs', color: 'Melns' }),
    is_highlighted: 0,
  },
  {
    title: 'LEGO Technic 42111 Dodge Charger, jauns kastē',
    description: 'Pārdodu LEGO Technic set 42111 Dodge Charger no Fast & Furious. 1077 detaļas. Kaste atvērta, bet nav nevienas detaļas izņemtas — viss oriģinālajā iepakojumā. Regulārā cena veikalā 100 EUR. Lieliski piemērots LEGO kolekcionāriem vai bērniem no 10 gadiem.',
    price: 75,
    category: 'Bērniem',
    location: 'Rīga, Āgenskalns',
    image_url: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800',
    attributes: JSON.stringify({ item_type: 'Rotaļlieta', brand: 'LEGO', model: 'Technic 42111', age_group: '10+ gadi', condition: 'Jauns', color: 'Daudzkrāsains' }),
    is_highlighted: 0,
  },
  {
    title: 'Bērnu velosipēds Trek Precaliber 20", 6-8 gadi',
    description: 'Pārdodu Trek Precaliber 20" velosipēdu zēnam 6-8 gadu vecumam. Alumīnija rāmis, 7 ātrumi Shimano, disku bremzes. Nopirkts 2022. gadā par 380 EUR. Bērns to lietoja 2 sezonas, tagad jau uzaudzis. Labs stāvoklī, tikai neliels nolietojums. Riteņi uzpūsti, ķēde ieeļļota. Braukšanas pulkstenis un astes gaisma iekļauti.',
    price: 185,
    category: 'Bērniem',
    location: 'Salaspils',
    image_url: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800',
    attributes: JSON.stringify({ item_type: 'Velosipēds', brand: 'Trek', model: 'Precaliber 20"', age_group: '6-8 gadi', condition: 'Labs', color: 'Sarkans/melns' }),
    is_highlighted: 0,
  },
];

async function main() {
  const userRes = await pool.query(`SELECT id FROM users WHERE email = $1`, ['janis.berzins2@test.lv']);
  if (!userRes.rows.length) {
    console.error('User janis.berzins2@test.lv not found!');
    process.exit(1);
  }
  const userId = userRes.rows[0].id;
  console.log(`Using user ID: ${userId}`);

  const del = await pool.query(`DELETE FROM listings WHERE user_id = $1`, [userId]);
  console.log(`Deleted ${del.rowCount} old listings`);

  for (const l of listings) {
    await pool.query(
      `INSERT INTO listings
        (user_id, title, description, price, category, location, image_url, attributes, is_highlighted, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active', NOW() - interval '2 hours' - (random() * interval '28 days'))`,
      [userId, l.title, l.description, l.price, l.category, l.location, l.image_url, l.attributes, l.is_highlighted]
    );
    console.log(`  + ${l.title}`);
  }

  console.log(`\nDone! Inserted ${listings.length} listings.`);
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
