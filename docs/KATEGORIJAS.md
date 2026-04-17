# BalticMarket — Kategoriju, Apakškategoriju un Filtru Struktūra

> Sagatavots: 2026-04-17  
> Pamatots uz: ss.lv, city24.lv, kleinanzeigen.de, leboncoin.fr, blocket.se, finn.no  
> Transports — jau implementēts, šeit nav iekļauts

---

## SATURA RĀDĪTĀJS

1. [Nekustamais īpašums](#1-nekustamais-īpašums)
2. [Elektronika](#2-elektronika)
3. [Darbs un pakalpojumi](#3-darbs-un-pakalpojumi)
4. [Pakalpojumi](#4-pakalpojumi-jauna-kategorija)
5. [Mājai un dārzam](#5-mājai-un-dārzam)
6. [Mode un stils](#6-mode-un-stils)
7. [Bērniem](#7-bērniem)
8. [Sports un hobiji](#8-sports-un-hobiji)
9. [Dzīvnieki](#9-dzīvnieki)
10. [Pārtika un lauksaimniecība](#10-pārtika-un-lauksaimniecība-jauna-kategorija)
11. [Cits](#11-cits)

---

## 1. NEKUSTAMAIS ĪPAŠUMS

### Struktūra (2 līmeņi)

```
Nekustamais īpašums
├── Pārdošana
│   ├── Dzīvokļi
│   ├── Mājas un vasarnīcas
│   ├── Zeme un mežs
│   ├── Komerctelpas
│   └── Garāžas un stāvvietas
└── Īre
    ├── Dzīvokļi
    ├── Mājas
    ├── Istabas
    ├── Komerctelpas
    └── Garāžas un stāvvietas
```

---

### 1.1 Pārdošana → Dzīvokļi

| Lauks | Tips | Opcijas |
|---|---|---|
| pilsēta | select | Rīga, Jūrmala, Jelgava, Liepāja, Daugavpils, Ventspils, Valmiera, Rēzekne, Jēkabpils, Ogre, Tukums, Sigulda, Cēsis, Saldus, Talsi, Bauska, Limbaži, Cits |
| rajons_riga | select (tikai Rīgai) | Centrs, Āgenskalns, Aplokciems, Berģi, Bieriņi, Bolderāja, Brekši, Čiekurkalns, Dārzciems, Daugavgrīva, Dreiliņi, Dzegužkalns, Grīziņkalns, Iļģuciems, Imanta, Jaunciems, Jaunmīlgrāvis, Jugla, Katlakalns, Ķengarags, Ķīpsala, Klīversala, Krasta rajons, Kundziņsala, Latgales priekšpilsēta, Mangaļi, Mangaļsala, Mežaparks, Mežciems, Pļavnieki, Purvciems, Šampēteris-Pleskodāle, Sarkandaugava, Šķirotava, Teika, Torņakalns, Trīsciems, VEF, Vecāķi, Vecmīlgrāvis, Vecrīga, Zaķusala, Zasulauks, Ziepniekkalns, Zolitūde, Cits |
| istabu_skaits | select | Studija/Istabiņa, 1, 2, 3, 4, 5, 6+ |
| platiba_m2 | range | min–max (m²) |
| stavs | range | min–max |
| ekas_stavi | range | min–max (kopējais stāvu skaits) |
| majas_serija | select | Jaunais projekts, 103. sērija, 104. sērija, 119. sērija, 467. sērija, 602. sērija, Čehu projekts, Hruščovka, LT projekts (Lietuviešu), Mazģimeņu projekts, Franču projekts, Speciālprojekts, Staļinas laika, Pirmskara, Renovēta, Privātmāja, Cits |
| ekas_materialas | select | Ķieģeļu, Paneļu, Monolīts, Koka, Ķieģeļu-paneļu, Cits |
| stavoklis | select | Lielisks, Labā stāvoklī, Nepieciešams kosmētiskais remonts, Nepieciešams kapitālais remonts, Nepabeigtā remontā |
| apkure | select | Centrālā, Autonomā gāzes, Elektriskā, Krāsns, Silta grīda, Cita |
| balkons | checkbox | Balkons / Lodžija |
| lifts | checkbox | — |
| garaza | checkbox | Garāža / Stāvvieta |
| pagrabstavs | checkbox | — |
| mebeletas | select | Mēbelēts, Daļēji mēbelēts, Bez mēbelēm |
| cena | range | min–max (€) |
| cena_m2 | range | min–max (€/m²) |

---

### 1.2 Pārdošana → Mājas un vasarnīcas

| Lauks | Tips | Opcijas |
|---|---|---|
| pilsēta | select | (sk. 1.1) |
| majas_tips | select | Privātmāja, Vasarnīca, Rindu māja, Divģimeņu māja, Lauku māja, Cita |
| platiba_m2 | range | min–max (m²) |
| zemes_platiba | range | min–max (m²) |
| istabu_skaits | select | 1, 2, 3, 4, 5, 6, 7+ |
| stavi | select | 1, 2, 3, Cits |
| ekas_materialas | select | Ķieģeļu, Koka, Monolīts, Rāmja, Bloku, Cits |
| stavoklis | select | Lielisks, Labā stāvoklī, Nepieciešams kosmētiskais remonts, Nepieciešams kapitālais remonts, Neizbūvēta |
| apkure | select | Centrālā, Gāzes, Elektriskā, Malkas/Krāsns, Silta grīda, Siltuma sūknis, Cita |
| kanalizacija | select | Centralizēta, Autonomā (septiks), Nav |
| udens | select | Centralizēts, Artēziskais aka, Aka, Nav |
| garaza | checkbox | — |
| pagrabs | checkbox | — |
| terase | checkbox | — |
| pirts | checkbox | — |
| baseins | checkbox | — |
| cena | range | min–max (€) |

---

### 1.3 Pārdošana → Zeme un mežs

| Lauks | Tips | Opcijas |
|---|---|---|
| pilsēta | select | (sk. 1.1) |
| zemes_tips | select | Apbūves zeme, Lauksaimniecības zeme, Meža zeme, Komerciālās apbūves zeme, Dārzkopības, Cita |
| platiba | range | min–max (m²) |
| komunikacijas | checkbox[] | Elektrība, Gāze, Ūdens, Kanalizācija |
| cena | range | min–max (€) |

---

### 1.4 Pārdošana → Komerctelpas

| Lauks | Tips | Opcijas |
|---|---|---|
| pilsēta | select | (sk. 1.1) |
| telpu_tips | select | Birojs, Tirdzniecības telpa, Noliktava, Ražošanas telpa, Viesnīca/Hostel, Restorāns/Kafejnīca, Cita |
| platiba_m2 | range | min–max (m²) |
| stavoklis | select | Lielisks, Labā stāvoklī, Nepieciešams remonts |
| stavi | range | (stāvs ēkā) |
| cena | range | min–max (€) |

---

### 1.5 Pārdošana → Garāžas un stāvvietas

| Lauks | Tips | Opcijas |
|---|---|---|
| pilsēta | select | (sk. 1.1) |
| tips | select | Garāža, Stāvvieta, Garāžu kooperatīvs, Pazemes stāvvieta |
| platiba_m2 | range | min–max (m²) |
| apkure | checkbox | Apkurināma |
| elektriba | checkbox | — |
| cena | range | min–max (€) |

---

### 1.6 Īre → Dzīvokļi

| Lauks | Tips | Opcijas |
|---|---|---|
| *(visi 1.1 lauki)* | — | — |
| menesa_cena | range | min–max (€/mēn.) |
| komunalie | select | Iekļauti cenā, Atsevišķi, Daļēji iekļauti |
| depozits | select | Nav, 0.5 mēn., 1 mēn., 2 mēn., Pēc vienošanās |
| min_termins | select | Bez ierobežojuma, 1 mēnesis, 3 mēneši, 6 mēneši, 1 gads |
| pieejams_no | date | — |
| dzivnieki | select | Atļauti, Nav atļauti, Pēc vienošanās |
| studenti | checkbox | Atļauts studentiem |

---

### 1.7 Īre → Istabas

| Lauks | Tips | Opcijas |
|---|---|---|
| pilsēta | select | (sk. 1.1) |
| rajons_riga | select | (sk. 1.1) |
| istabu_skaits_kopeja | select | 2-istabu dzīvoklis, 3-istabu, 4-istabu, 5+ |
| menesa_cena | range | min–max (€/mēn.) |
| komunalie | select | Iekļauti, Atsevišķi |
| pieejams_no | date | — |
| dzivnieki | select | Atļauti, Nav atļauti |
| studenti | checkbox | — |

---

### 1.8 Īre → Komerctelpas

| Lauks | Tips | Opcijas |
|---|---|---|
| pilsēta | select | (sk. 1.1) |
| telpu_tips | select | Birojs, Tirdzniecības telpa, Noliktava, Ražošanas telpa, Cita |
| platiba_m2 | range | min–max (m²) |
| menesa_cena | range | min–max (€/mēn.) |
| stavoklis | select | Lielisks, Labs, Nepieciešams remonts |

---

## 2. ELEKTRONIKA

### Struktūra (2 līmeņi)

```
Elektronika
├── Mobilie telefoni
│   ├── Viedtālruņi
│   └── Aksesuāri telefoniem
├── Datori
│   ├── Portatīvie datori (Laptopi)
│   ├── Stacionārie datori
│   ├── Planšetdatori
│   ├── Datoru komponentes
│   └── Perifērija un aksesuāri
├── Audio, Video, Foto
│   ├── Televizori
│   ├── Fotoaparāti un kameras
│   ├── Austiņas un skaļruņi
│   ├── Projektori
│   └── Droni
├── Sadzīves tehnika
│   ├── Veļas mašīnas un žāvētāji
│   ├── Ledusskapji un saldētāji
│   ├── Virtuves tehnika
│   ├── Putekļusūcēji un tīrīšana
│   └── Cita sadzīves tehnika
└── Spēles un izklaides
    ├── Spēļu konsoles
    ├── Videospēles
    └── VR un AR aprīkojums
```

---

### 2.1 Mobilie telefoni → Viedtālruņi

| Lauks | Tips | Opcijas |
|---|---|---|
| zimols | select | Apple, Samsung, Xiaomi, Huawei, Sony, Nokia, Motorola, OnePlus, Google Pixel, Realme, OPPO, Honor, Vivo, HTC, LG, Cits |
| modelis | text | (autocomplete) |
| atmina_gb | select | 16, 32, 64, 128, 256, 512, 1024 |
| ram_gb | select | 2, 3, 4, 6, 8, 12, 16 |
| stavoklis | select | Jauns, Kā jauns, Ļoti labs, Labs, Pieņemams, Bojāts (rezerves daļām) |
| operators_blokeets | select | Nav bloķēts, Bloķēts (LMT), Bloķēts (Tele2), Bloķēts (BITE), Cits operators |
| garantija | checkbox | Garantija spēkā |
| icloud_google_lock | checkbox | Izlogots / Atbloķēts |
| cena | range | min–max (€) |

---

### 2.2 Mobilie telefoni → Aksesuāri telefoniem

| Lauks | Tips | Opcijas |
|---|---|---|
| tips | select | Maciņi un vāciņi, Ekrāna aizsargstikli, Lādētāji un kabeļi, Austiņas, Baterijas, Power bank, Cits |
| saderiba | text | (piem., "iPhone 15 Pro") |
| stavoklis | select | Jauns, Lietots |
| cena | range | min–max (€) |

---

### 2.3 Datori → Portatīvie datori (Laptopi)

| Lauks | Tips | Opcijas |
|---|---|---|
| zimols | select | Apple (MacBook), Asus, Acer, Dell, HP, Lenovo, MSI, Samsung, Sony, Toshiba, Fujitsu, Gigabyte, Razer, Huawei, Cits |
| modelis | text | (autocomplete) |
| ekrans_colas | select | 11", 12", 13", 13.3", 14", 15", 15.6", 16", 17", 17.3" |
| procesors | select | Intel Core i3, Intel Core i5, Intel Core i7, Intel Core i9, Intel Core Ultra 5, Intel Core Ultra 7, AMD Ryzen 3, AMD Ryzen 5, AMD Ryzen 7, AMD Ryzen 9, Apple M1, Apple M2, Apple M3, Apple M4, Intel Celeron, Intel Pentium, Cits |
| ram_gb | select | 4, 8, 16, 32, 64 |
| hdd_ssd_gb | select | 128, 256, 512, 1000, 2000, 4000 |
| diska_tips | select | SSD, HDD, SSD + HDD, M.2 NVMe |
| gpu | select | Integrētā, NVIDIA GeForce GTX, NVIDIA GeForce RTX, AMD Radeon, Apple GPU, Cita |
| os | select | Windows 10 Home, Windows 10 Pro, Windows 11 Home, Windows 11 Pro, macOS, Linux, Bez OS |
| stavoklis | select | Jauns, Kā jauns, Ļoti labs, Labs, Pieņemams, Bojāts |
| garantija | checkbox | — |
| cena | range | min–max (€) |

---

### 2.4 Datori → Stacionārie datori

| Lauks | Tips | Opcijas |
|---|---|---|
| tips | select | Gaming PC, Darba stacija (Workstation), Biroja dators, Media Center, Server, Mini PC |
| procesors | select | (sk. 2.3 procesors) |
| ram_gb | select | 4, 8, 16, 32, 64, 128 |
| hdd_ssd_gb | select | 256, 512, 1000, 2000, 4000, 8000 |
| gpu | select | (sk. 2.3 gpu, + NVIDIA RTX 3060/3070/3080/4070/4080/4090) |
| os | select | (sk. 2.3 os) |
| stavoklis | select | Jauns, Kā jauns, Ļoti labs, Labs, Bojāts |
| komplektacija | checkbox[] | Monitors iekļauts, Tastatūra, Pele |
| cena | range | min–max (€) |

---

### 2.5 Datori → Planšetdatori

| Lauks | Tips | Opcijas |
|---|---|---|
| zimols | select | Apple (iPad), Samsung, Lenovo, Huawei, Amazon, Microsoft (Surface), Xiaomi, Cits |
| modelis | text | — |
| ekrans_colas | select | 7", 8", 10", 10.5", 11", 12", 12.9", 13" |
| atmina_gb | select | 16, 32, 64, 128, 256, 512 |
| sim_esim | checkbox | SIM/eSIM (LTE) |
| os | select | iPadOS, Android, Windows |
| stavoklis | select | Jauns, Kā jauns, Ļoti labs, Labs, Bojāts |
| cena | range | min–max (€) |

---

### 2.6 Datori → Datoru komponentes

| Lauks | Tips | Opcijas |
|---|---|---|
| tips | select | Procesors (CPU), Grafiskā karte (GPU), Operatīvā atmiņa (RAM), SSD/HDD, Mātes plate, Barošanas bloks (PSU), Dzesēšanas sistēma, Korpuss, Cits |
| zimols | text | — |
| modelis | text | — |
| stavoklis | select | Jauns, Kā jauns, Lietots, Bojāts |
| cena | range | min–max (€) |

---

### 2.7 Audio, Video, Foto → Televizori

| Lauks | Tips | Opcijas |
|---|---|---|
| zimols | select | Samsung, LG, Sony, Philips, Hisense, TCL, Sharp, Panasonic, Xiaomi, Thomson, Grundig, Cits |
| ekrans_colas | select | 24", 28", 32", 40", 43", 49", 50", 55", 58", 60", 65", 70", 75", 77", 85", Cits |
| izskirtspeja | select | HD (720p), Full HD (1080p), 4K / UHD, 8K |
| smart_tv | checkbox | Smart TV |
| ekrana_tips | select | LED, OLED, QLED, QNED, LCD, Plazma, Mini LED |
| atsvaidzes_hz | select | 50Hz, 60Hz, 100Hz, 120Hz, 144Hz |
| stavoklis | select | Jauns, Kā jauns, Ļoti labs, Labs, Bojāts |
| cena | range | min–max (€) |

---

### 2.8 Audio, Video, Foto → Fotoaparāti un kameras

| Lauks | Tips | Opcijas |
|---|---|---|
| tips | select | Spoguļkamera (DSLR), Bezspoguļa (Mirrorless), Kompakta kamera, Videokamera, Sporta/Action kamera, Drošības kamera, Cita |
| zimols | select | Canon, Nikon, Sony, Fujifilm, Panasonic, Olympus, Pentax, DJI, GoPro, Cits |
| megapiksel | range | min–max (MP) |
| stavoklis | select | Jauns, Kā jauns, Ļoti labs, Labs, Bojāts |
| komplektacija | checkbox[] | Objektīvs iekļauts, Soma, Baterija, Lādētājs |
| cena | range | min–max (€) |

---

### 2.9 Audio, Video, Foto → Austiņas un skaļruņi

| Lauks | Tips | Opcijas |
|---|---|---|
| tips | select | Austiņas (over-ear), Austiņas (in-ear/TWS), Soundbar, Mājas kino sistēma, Bezvadu skaļrunis, Hi-Fi sistēma, Cits |
| zimols | select | Sony, Bose, JBL, Sennheiser, Apple (AirPods), Samsung, Philips, Harman Kardon, Bang & Olufsen, Cits |
| savienojums | select | Vadu, Bluetooth, Vadu + Bluetooth |
| aktiva_troksnu_slapsana | checkbox | ANC |
| stavoklis | select | Jauns, Kā jauns, Ļoti labs, Labs, Bojāts |
| cena | range | min–max (€) |

---

### 2.10 Audio, Video, Foto → Droni

| Lauks | Tips | Opcijas |
|---|---|---|
| zimols | select | DJI, Autel, Parrot, Skydio, Cits |
| modelis | text | — |
| kategorija | select | Patērētāju (hobijs), Profesionālais, FPV |
| kamera | checkbox | Ar kameru |
| lidojuma_laiks | range | min–max (min.) |
| stavoklis | select | Jauns, Kā jauns, Ļoti labs, Labs, Bojāts |
| cena | range | min–max (€) |

---

### 2.11 Sadzīves tehnika → Veļas mašīnas un žāvētāji

| Lauks | Tips | Opcijas |
|---|---|---|
| tips | select | Veļas mašīna, Žāvētājs, Veļas mašīna ar žāvētāju |
| zimols | select | Bosch, LG, Samsung, Siemens, AEG, Miele, Electrolux, Beko, Indesit, Candy, Whirlpool, Zanussi, Gorenje, Haier, Cits |
| iekrausana | select | Frontālā, Vertikālā (no augšas) |
| ietilpiba_kg | select | 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 |
| izmers | select | Šaurā (45cm), Standarta (60cm) |
| energoklase | select | A, A+, A++, A+++, B, C |
| apgr_min | select | 800, 1000, 1200, 1400, 1600 |
| stavoklis | select | Jauns, Kā jauns, Labs, Bojāts |
| cena | range | min–max (€) |

---

### 2.12 Sadzīves tehnika → Ledusskapji un saldētāji

| Lauks | Tips | Opcijas |
|---|---|---|
| tips | select | Ledusskapis, Saldētājs, Ledusskapis ar saldētāju (2-kamera), Side-by-Side |
| zimols | select | Bosch, LG, Samsung, Siemens, AEG, Miele, Electrolux, Beko, Indesit, Gorenje, Liebherr, Cits |
| augstums_cm | range | min–max (cm) |
| tilpums_l | range | min–max (litri) |
| no_frost | checkbox | No Frost |
| energoklase | select | A, A+, A++, A+++, B, C |
| stavoklis | select | Jauns, Kā jauns, Labs, Bojāts |
| cena | range | min–max (€) |

---

### 2.13 Sadzīves tehnika → Virtuves tehnika

| Lauks | Tips | Opcijas |
|---|---|---|
| tips | select | Mikroviļņu krāsns, Cepeškrāsns, Plīts virsma, Kafijas automāts, Kafijas kapsula automāts, Tosteris, Blendera, Kuhāra mašīna, Trauku mazgājamā, Tvaika nosūcējs, Cita |
| zimols | select | Bosch, Siemens, AEG, Electrolux, Philips, DeLonghi, Nespresso, SMEG, Gorenje, Cits |
| stavoklis | select | Jauns, Kā jauns, Labs, Bojāts |
| cena | range | min–max (€) |

---

### 2.14 Spēles → Spēļu konsoles

| Lauks | Tips | Opcijas |
|---|---|---|
| platforma | select | PlayStation 5, PlayStation 4, Xbox Series X/S, Xbox One, Nintendo Switch, Nintendo Switch Lite, PC (Steam Deck), Retro konsole, Cita |
| komplektacija | checkbox[] | Kontrolieris, Spēles iekļautas, Oriģināls iepakojums |
| stavoklis | select | Jauns, Kā jauns, Labs, Bojāts |
| cena | range | min–max (€) |

---

### 2.15 Spēles → Videospēles

| Lauks | Tips | Opcijas |
|---|---|---|
| platforma | select | PS5, PS4, Xbox Series, Xbox One, Nintendo Switch, PC (fiziska), PC (digitāla kods), Retro, Cita |
| zanrs | select | Akcija, Sports, Sacīkstes, RPG, Stratēģija, Simulācija, Šaušana (FPS), Bērniem, Cits |
| stavoklis | select | Jauns, Labs, Bojāts |
| cena | range | min–max (€) |

---

## 3. DARBS UN PAKALPOJUMI

### Struktūra (1 līmenis)

```
Darbs un pakalpojumi
├── Vakances (Piedāvā darbu)
├── Meklē darbu
└── Kursi un izglītība
```

---

### 3.1 Vakances (Piedāvā darbu)

| Lauks | Tips | Opcijas |
|---|---|---|
| nozare | select | IT un telekomunikācijas, Būvniecība un nekustamais, Tirdzniecība un mazumtirdzniecība, Transports un loģistika, Ēdināšana un viesmīlība, Ražošana, Klientu apkalpošana, Izglītība, Veselības aprūpe, Finanses un grāmatvedība, Mārketings un reklāma, Juridiskie pakalpojumi, Lauksaimniecība, Cita |
| amats | text | — |
| pilseta | select | Rīga, Jūrmala, Jelgava, Liepāja, Daugavpils, Ventspils, Valmiera, Attālināti, Cita |
| slodze | select | Pilna slodze, Pusslodze, Gabaldarbs, Maiņu darbs, Sezonāls darbs |
| attalinats | checkbox | Attālināta darba iespēja |
| pieredze | select | Nav nepieciešama, Līdz 1 gadam, 1–3 gadi, 3–5 gadi, 5+ gadi |
| alga_min | number | € (bruto/mēn.) |
| alga_max | number | € (bruto/mēn.) |
| alga_nav_nordita | checkbox | Pēc vienošanās |
| sakuma_datums | date | — |

---

### 3.2 Meklē darbu

| Lauks | Tips | Opcijas |
|---|---|---|
| nozare | select | (sk. 3.1) |
| velams_amats | text | — |
| pilseta | select | (sk. 3.1) |
| slodze | select | (sk. 3.1) |
| attalinats | checkbox | — |
| pieredze | select | (sk. 3.1) |
| velama_alga | range | min–max (€/mēn.) |

---

### 3.3 Kursi un izglītība

| Lauks | Tips | Opcijas |
|---|---|---|
| tips | select | Valodu kursi, IT un programmēšana, Autoskola, Mācību centrs/skola, Profesionālie kursi, Sports un deja, Māksla un radošums, Augstākā izglītība, Citi |
| formāts | select | Klātiene, Tiešsaiste (online), Hibrīds |
| pilseta | select | (sk. 3.1, + Tiešsaiste) |
| ilgums | select | Viens semestris, Viens gads, 2+ gadi, Intensīvs kurss, Pēc vienošanās |
| cena | range | min–max (€) |

---

## 4. PAKALPOJUMI *(jauna kategorija)*

### Struktūra (1 līmenis)

```
Pakalpojumi
├── Mājas remonts un būvniecība
├── Auto pakalpojumi
├── IT un digitālie pakalpojumi
├── Skaistumkopšana un veselība
├── Tīrīšana un uzkopšana
├── Juridiskais un finanses
├── Tulkošana un rediģēšana
├── Mājdzīvnieku aprūpe
├── Loģistika un pārvākšanās
├── Foto un video pakalpojumi
└── Citi pakalpojumi
```

---

### 4.1 Mājas remonts un būvniecība

| Lauks | Tips | Opcijas |
|---|---|---|
| pakalpojuma_tips | select | Istabu remonts, Vannas istabas remonts, Virtuves remonts, Jumta remonts, Fasādes remonts, Elektroinstalācija, Santehnika, Logu/durvju montāža, Grīdu montāža, Flīzēšana, Krāsošana, Ģipškartons, Cits |
| pilseta | select | (sk. 3.1) |
| pieredze_gadi | select | 1–3, 3–5, 5–10, 10+ |
| cenas_tips | select | Stundas likme (€/h), Par darba dienu, Par projektu, Pēc vienošanās |
| cena | range | min–max (€) |
| garantija | checkbox | Garantija uz darbu |

---

### 4.2 Auto pakalpojumi

| Lauks | Tips | Opcijas |
|---|---|---|
| pakalpojuma_tips | select | Tehniskā apkope, Virsbūves remonts, Krāsošana, Riepu montāža, Diagnostika, Elektriskie darbi, Klimata sistēma, Motora remonts, Cits |
| pilseta | select | (sk. 3.1) |
| cenas_tips | select | Stundas likme, Par pakalpojumu, Pēc vienošanās |
| cena | range | min–max (€) |

---

### 4.3 IT un digitālie pakalpojumi

| Lauks | Tips | Opcijas |
|---|---|---|
| pakalpojuma_tips | select | Web izstrāde, Mob. aplikāciju izstrāde, SEO, Grafiskais dizains, IT atbalsts un remonts, Datu atgūšana, Kiberdrošība, Cits |
| formāts | select | Attālināti, Klātiene, Abi |
| cenas_tips | select | Stundas likme (€/h), Par projektu, Ikmēneša abonements |
| cena | range | min–max (€) |

---

## 5. MĀJAI UN DĀRZAM

### Struktūra (2 līmeņi)

```
Mājai un dārzam
├── Mēbeles un interjers
│   ├── Guļamistabai
│   ├── Dzīvojamai istabai
│   ├── Ēdamistabai
│   ├── Virtuvei
│   ├── Birojam / darba telpai
│   ├── Bērnistabai
│   └── Dekorācija un tekstils
├── Būvmateriāli un instrumenti
│   ├── Būvmateriāli
│   ├── Elektromontāžas materiāli
│   ├── Logi un durvis
│   ├── Grīdas segumi
│   └── Instrumenti un iekārtas
├── Dārzam un pagalmam
│   ├── Dārza tehnika
│   ├── Augi un stādi
│   ├── Dārza mēbeles
│   ├── Siltumnīcas un tuneļi
│   └── Grilli un ārā gatavošana
└── Santehnika un apkure
    ├── Vannas istabai
    ├── Apkures sistēmas
    └── Caurules un armatūra
```

---

### 5.1 Mēbeles → (visas apakšsadaļas — kopēji lauki)

| Lauks | Tips | Opcijas |
|---|---|---|
| tips | select | (atkarīgs no apakšsadaļas — piem. Gultas, Dīvāni, Galdi, Skapji...) |
| materialas | select | Koks (masīvkoks), MDF/Laminēts, Metāls, Ādas, Audums, Stikls, Plastmasa, Maisījums, Cits |
| krasa | text | — |
| stavoklis | select | Jauns, Kā jauns, Labs, Nepieciešams remonts |
| izmeri_cm | text | G × P × A (cm) |
| zimols | text | (piem., IKEA, Bodzio, Cits) |
| cena | range | min–max (€) |

---

### 5.2 Büvmateriāli un instrumenti → Instrumenti

| Lauks | Tips | Opcijas |
|---|---|---|
| tips | select | Elektroinstrumenti, Rokas instrumenti, Mērinstrumenti, Celtniecības iekārtas, Dārza tehnika, Cits |
| zimols | select | Bosch, Makita, DeWalt, Hilti, Stanley, Black+Decker, Einhell, Cits |
| stavoklis | select | Jauns, Kā jauns, Labs, Bojāts |
| cena | range | min–max (€) |

---

### 5.3 Dārzam → Dārza tehnika

| Lauks | Tips | Opcijas |
|---|---|---|
| tips | select | Zālāja pļāvējs, Robots pļāvējs, Trimmēris, Koku zāģis, Laistīšanas sistēma, Kompresors, Mini traktors, Cita |
| zimols | select | Husqvarna, Gardena, Bosch, Makita, STIHL, Honda, Cits |
| stavoklis | select | Jauns, Kā jauns, Labs, Bojāts |
| cena | range | min–max (€) |

---

## 6. MODE UN STILS

### Struktūra (2 līmeņi)

```
Mode un stils
├── Sieviešu apģērbi
│   ├── Kleitas un kombinezoni
│   ├── Virsdrēbes (jakas, mēteļi)
│   ├── Bikses un šorti
│   ├── Krekli, blūzes un topi
│   └── Sporta apģērbs
├── Vīriešu apģērbi
│   ├── Virsdrēbes
│   ├── Bikses un šorti
│   ├── Krekli un T-krekli
│   └── Uzvalki un formālie
├── Apavi
│   ├── Sieviešu apavi
│   ├── Vīriešu apavi
│   └── Sporta apavi
├── Aksesuāri
│   ├── Somas un mugursomas
│   ├── Pulksteņi
│   ├── Rotaslietas un juvelierizstrādājumi
│   └── Cepures, šalles, cimdi
└── Skaistumkopšana
    ├── Kosmētika
    ├── Smaržas
    └── Matu kopšana
```

---

### 6.1 Apģērbi — kopēji lauki

| Lauks | Tips | Opcijas |
|---|---|---|
| tips | select | (apakšsadaļas specifisks) |
| izmers | select | XS, S, M, L, XL, XXL, XXXL, 34, 36, 38, 40, 42, 44, 46, 48, 50, Cits |
| zimols | text | (autocomplete: Zara, H&M, Mango, Vero Moda, Only, Puma, Nike, Adidas...) |
| krasa | select | Melna, Balta, Pelēka, Zila, Sarkana, Zaļa, Dzeltena, Rozā, Brūna, Bēša, Raksts, Cita |
| materialas | select | Kokvilna, Lins, Vilna, Kašmirs, Poliesteris, Zīds, Džinss, Ādas, Cits |
| stavoklis | select | Jauns (ar etiķeti), Jauns (bez etiķetes), Kā jauns, Labs, Ar sīkumiem |
| sezonalitate | select | Vasaras, Rudens/Pavasara, Ziemas, Visu sezonu |
| cena | range | min–max (€) |

---

### 6.2 Apavi

| Lauks | Tips | Opcijas |
|---|---|---|
| dzimums | select | Sieviešu, Vīriešu, Unisex |
| izmers_eu | select | 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48 |
| tips | select | Ikdienas, Sporta, Officiālie/Elegancie, Sandales, Zābaki, Mājas čības |
| zimols | text | (Nike, Adidas, Puma, Ecco, Geox, Timberland, Cits) |
| stavoklis | select | Jauns, Kā jauns, Labs, Ar nolietojumu |
| cena | range | min–max (€) |

---

### 6.3 Pulksteņi

| Lauks | Tips | Opcijas |
|---|---|---|
| dzimums | select | Vīriešu, Sieviešu, Unisex |
| tips | select | Rokas pulkstenis, Viedpulkstenis (Smartwatch), Kabatas pulkstenis, Sienas pulkstenis |
| zimols | text | (Casio, Seiko, Tissot, Garmin, Apple Watch, Samsung, Cits) |
| mehhanisms | select | Kvarca, Mehāniskais, Automātiskais, Digitālais |
| materialas_rokassiksna | select | Ādas, Metāla, Gumija/Silikons, Audums, Cits |
| stavoklis | select | Jauns, Kā jauns, Labs, Bojāts |
| cena | range | min–max (€) |

---

## 7. BĒRNIEM

### Struktūra (1 līmenis)

```
Bērniem
├── Apģērbi un apavi
├── Rotaļlietas un spēles
├── Ratiņi un autokrēsliņi
├── Bērnu mēbeles
├── Zīdaiņu preces
└── Grāmatas un izglītojošie materiāli
```

---

### 7.1 Apģērbi un apavi

| Lauks | Tips | Opcijas |
|---|---|---|
| dzimums | select | Meitenēm, Zēniem, Unisex |
| vecums_izmers | select | 0–3 mēn. (50–56), 3–6 mēn. (62–68), 6–12 mēn. (74–80), 1–2 g. (86–92), 2–3 g. (98), 3–4 g. (104), 5–6 g. (110–116), 7–8 g. (122–128), 9–10 g. (134–140), 11–12 g. (146–152), 13–14 g. (158–164) |
| tips | select | Apģērbs, Apavi, Cepures un aksesuāri, Komplekts |
| stavoklis | select | Jauns, Kā jauns, Labs, Ar nolietojumu |
| cena | range | min–max (€) |

---

### 7.2 Rotaļlietas un spēles

| Lauks | Tips | Opcijas |
|---|---|---|
| vecuma_grupa | select | 0–1 gads, 1–3 gadi, 3–6 gadi, 6–12 gadi, 12+ gadi |
| tips | select | Mīkstās rotaļlietas, Konstruktori un LEGO, Galda spēles, Attīstošās rotaļlietas, Lelles un aksesuāri, Auto un tehnika, Āra rotaļlietas, Puzzles, Radošuma komplekti, Citas |
| stavoklis | select | Jauns, Kā jauns, Labs, Bojāts |
| cena | range | min–max (€) |

---

### 7.3 Ratiņi un autokrēsliņi

| Lauks | Tips | Opcijas |
|---|---|---|
| tips | select | Bērnu ratiņi (pilna sistēma), Sporta ratiņi (buggy), Autokrēsliņš, Kombinētie ratiņi |
| vecuma_grupa | select | No dzimšanas, 0–6 mēn., 6–18 mēn., 15–36 kg, 9–36 kg, 15–36 kg |
| zimols | text | (Bugaboo, Joolz, Cybex, Chicco, Britax, Joie, Cits) |
| stavoklis | select | Jauns, Kā jauns, Labs, Bojāts |
| cena | range | min–max (€) |

---

## 8. SPORTS UN HOBIJI

### Struktūra (1 līmenis)

```
Sports un hobiji
├── Sporta inventārs
├── Velosipēdi un skūteri
├── Medības un makšķerēšana
├── Tūrisms un kempings
├── Mūzikas instrumenti
├── Grāmatas un žurnāli
├── Kolekcionēšana un antikvariāts
└── Māksla un radošums
```

---

### 8.1 Sporta inventārs

| Lauks | Tips | Opcijas |
|---|---|---|
| sporta_veids | select | Fitness un trenažieri, Futbols, Basketbols, Teniss/Badmintons, Peldēšana, Slēpošana/Snovbords, Dambrete/Šahs, Bokss/Cīņas māksla, Golf, Cits |
| stavoklis | select | Jauns, Kā jauns, Labs, Nolietots |
| cena | range | min–max (€) |

---

### 8.2 Mūzikas instrumenti

| Lauks | Tips | Opcijas |
|---|---|---|
| tips | select | Ģitāra (akustiskā), Ģitāra (elektriskā), Bass ģitāra, Klavieres/Keyboard, Bungas un perkusijas, Pūšaminstruments, Stīgu instruments (vijole u.c.), DJ aprīkojums, Studijas tehnika, Cits |
| zimols | text | — |
| stavoklis | select | Jauns, Kā jauns, Labs, Bojāts |
| cena | range | min–max (€) |

---

### 8.3 Medības un makšķerēšana

| Lauks | Tips | Opcijas |
|---|---|---|
| tips | select | Makšķerēšanas rīki, Ēsmas un mānekļi, Medību apģērbs, Medību piederumi, Laivas un airēšana, Cits |
| stavoklis | select | Jauns, Kā jauns, Labs |
| cena | range | min–max (€) |

---

### 8.4 Grāmatas un žurnāli

| Lauks | Tips | Opcijas |
|---|---|---|
| zanrs | select | Daiļliteratūra, Bērnu literatūra, Zinātne un izglītība, Vēsture, Psiholoģija, Bizness, Māksla un dizains, Ceļveži, Žurnāli, Cits |
| valoda | select | Latviešu, Angļu, Krievu, Vācu, Cita |
| stavoklis | select | Jauns, Labs, Ar nolietojumu |
| cena | range | min–max (€) |

---

## 9. DZĪVNIEKI

### Struktūra (1 līmenis)

```
Dzīvnieki
├── Suņi un kucēni
├── Kaķi un kaķēni
├── Putni
├── Zivis un akvāriji
├── Grauzēji un truši
├── Rāpuļi un eksotiskie
├── Lauksaimniecības dzīvnieki
└── Dzīvnieku barība un piederumi
```

---

### 9.1 Suņi un kucēni

| Lauks | Tips | Opcijas |
|---|---|---|
| darījuma_veids | select | Pārdod, Dod bez maksas, Meklē mājas |
| skirne | text | (autocomplete) |
| vecums | select | Līdz 3 mēn. (kucēns), 3–12 mēn., 1–3 gadi, 3–7 gadi, 7+ gadi |
| dzimums | select | Tēviņš, Mātīte |
| ciltsraksti | select | Ar ciltsrakstiem (FCI), Bez ciltsrakstiem |
| vakcinets | checkbox | Vakcinēts |
| cipsets | checkbox | Čipēts |
| kastreets | checkbox | Kastrēts/Sterilizēts |
| cena | range | min–max (€) |

---

### 9.2 Kaķi un kaķēni

| Lauks | Tips | Opcijas |
|---|---|---|
| darījuma_veids | select | Pārdod, Dod bez maksas, Meklē mājas |
| skirne | text | (autocomplete) |
| vecums | select | Līdz 3 mēn., 3–12 mēn., 1–5 gadi, 5+ gadi |
| dzimums | select | Tēviņš, Mātīte |
| ciltsraksti | select | Ar ciltsrakstiem, Bez ciltsrakstiem |
| vakcinets | checkbox | — |
| cipsets | checkbox | — |
| kastreets | checkbox | — |
| cena | range | min–max (€) |

---

### 9.3 Dzīvnieku barība un piederumi

| Lauks | Tips | Opcijas |
|---|---|---|
| dzivnieka_veids | select | Suņiem, Kaķiem, Putniem, Zivīm, Grauzējiem, Cits |
| tips | select | Barība (sausā), Barība (konservēta), Uzkodas un kārumi, Gultas un nami, Rotaļlietas, Apģērbi, Pavadas un siksnas, Akvāriji un piederumi, Cits |
| zimols | text | — |
| stavoklis | select | Jauns, Atvērts (nelietots), Daļēji izlietots |
| cena | range | min–max (€) |

---

## 10. PĀRTIKA UN LAUKSAIMNIECĪBA *(jauna kategorija)*

### Struktūra (1 līmenis)

```
Pārtika un lauksaimniecība
├── Dārzeņi un augļi
├── Piena produkti un olas
├── Gaļa un zivis
├── Medus un bišu produkti
├── Mājas konservi un marmelādes
├── Sēklas un stādi
├── Dzērieni (vīns, sula, cits)
└── Citi pārtikas produkti
```

---

### 10.1 Kopēji lauki (pārtika)

| Lauks | Tips | Opcijas |
|---|---|---|
| tips | select | (apakšsadaļas specifisks) |
| izcelsme | select | Mājas ražots, Saimniecības ražots, Bio/Ekosertificēts, Cits |
| pilseta_apgabals | select | (sk. 1.1 pilsēta saraksts) |
| daudzums | text | (kg, gab., litri) |
| cena | range | min–max (€) |
| organiks | checkbox | Bio/Eko |
| piegade | checkbox | Piegāde pieejama |

---

### 10.2 Sēklas un stādi

| Lauks | Tips | Opcijas |
|---|---|---|
| tips | select | Dārzeņu sēklas, Ziedu sēklas, Augļu koki, Ogulāji, Dekoratīvie augi, Iekštelpu augi, Cits |
| izcelsme | select | Mājas audzēts, Sertificēts, Imports |
| stavoklis | select | Jauns (iepakojumā), Sagatavots stādīšanai |
| cena | range | min–max (€) |

---

## 11. CITS

### Struktūra (1 līmenis)

```
Cits
└── Dažādi
```

### 11.1 Dažādi

| Lauks | Tips | Opcijas |
|---|---|---|
| tips | text | Brīvs apraksts |
| stavoklis | select | Jauns, Lietots, Bojāts |
| cena | range | min–max (€) |

---

## GLOBĀLIE FILTRI (visām kategorijām)

Šie filtri pieejami visos meklēšanas vaicājumos:

| Lauks | Tips | Piezīmes |
|---|---|---|
| cena | range | min–max (€) |
| pilseta | select + text | Latvijas pilsētas |
| publiceshanas_datums | select | Pēdējā stundā, 24h, 7 dienas, 30 dienas |
| stavoklis | select | Jauns, Lietots, Bojāts |
| pardosanas_veids | select | Privātpersona, Uzņēmums |
| ar_foto | checkbox | Tikai ar fotoattēliem |

---

## IMPLEMENTĀCIJAS PRIORITĀTES

### 🔴 1. prioritāte (augsta trafika kategorijas)
1. **Nekustamais īpašums** — sadalīt Pārdošana/Īre, pievienot mājas sērijas, rajonus, detalizētus filtrus
2. **Elektronika** — 2 līmeņu struktūra, detalizēti filtri Mobilie/Laptopi/TV/Sadzīves tehnika
3. **Mode un stils** — izmēru sistēma, zīmolu autocomplete

### 🟡 2. prioritāte
4. **Mājai un dārzam** — 2 līmeņu mēbeles, precīzāki lauki
5. **Bērniem** — vecuma/izmēra sistēma
6. **Darbs** — algu diapazona filtrs

### 🟢 3. prioritāte (jaunas kategorijas)
7. **Pakalpojumi** — jauna galvenā kategorija
8. **Pārtika un lauksaimniecība** — jauna galvenā kategorija
9. **Dzīvnieki** — veterinārijas lauki, ciltsrakstu filtrs
