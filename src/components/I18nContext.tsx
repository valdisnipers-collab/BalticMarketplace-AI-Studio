import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'LV' | 'LT' | 'EE' | 'EN' | 'RU';

interface Translations {
  [key: string]: {
    [key in Language]: string;
  };
}

const translations: Translations = {
  'nav.sell': { LV: 'Pārdot', LT: 'Parduoti', EE: 'Müü', EN: 'Sell', RU: 'Продать' },
  'nav.inform': { LV: 'Informācija', LT: 'Informacija', EE: 'Info', EN: 'Inform', RU: 'Инфо' },
  'home.hero.title_mobile': { LV: 'Atrodi visu nepieciešamo. Baltijas lielākais sludinājumu portāls.', LT: 'Raskite viską, ko jums reikia. Didžiausias Baltijos šalių skelbimų portalas.', EE: 'Leia kõik vajalik ühest kohast. Baltikumi suurim kuulutusteportaal.', EN: 'Find everything you need. The largest classifieds portal in the Baltics.', RU: 'Найдите все, что вам нужно. Крупнейший портал объявлений в Балтии.' },
  'home.hero.ai_search': { LV: 'AI-Meklēšana. Atrodi visu ātrāk.', LT: 'AI-Paieška. Raskite viską greičiau.', EE: 'AI-Otsing. Leia kõik kiiremini.', EN: 'AI-Search. Find everything faster.', RU: 'AI-Поиск. Найдите все быстрее.' },
  'home.deals.title': { LV: 'TOP PIEDĀVĀJUMI tev', LT: 'TOP PASIŪLYMAI tau', EE: 'TOP PAKKUMISED sulle', EN: 'Top DEALS for you', RU: 'ТОП ПРЕДЛОЖЕНИЯ для вас' },
  'nav.discover': { LV: 'Atklāt', LT: 'Atrasti', EE: 'Avasta', EN: 'Discover', RU: 'Открывать' },
  'nav.auto': { LV: 'Auto', LT: 'Auto', EE: 'Auto', EN: 'Auto', RU: 'Авто' },
  'nav.realEstate': { LV: 'Īpašumi', LT: 'Nekilnojamasis turtas', EE: 'Kinnisvara', EN: 'Real Estate', RU: 'Недвижимость' },
  'nav.addListing': { LV: 'Pievienot', LT: 'Pridėti', EE: 'Lisa', EN: 'Add', RU: 'Добавить' },
  'nav.login': { LV: 'Ienākt', LT: 'Prisijungti', EE: 'Logi sisse', EN: 'Login', RU: 'Войти' },
  'nav.profile': { LV: 'Profils', LT: 'Profilis', EE: 'Profiil', EN: 'Profile', RU: 'Профиль' },
  'nav.logout': { LV: 'Iziet', LT: 'Atsijungti', EE: 'Logi välja', EN: 'Logout', RU: 'Выйти' },
  'nav.register': { LV: 'Reģistrēties', LT: 'Registruotis', EE: 'Registreeru', EN: 'Register', RU: 'Регистрация' },
  'home.hero.title': { LV: 'Atklājiet Baltijas labākos piedāvājumus', LT: 'Atraskite geriausius Baltijos šalių pasiūlymus', EE: 'Avastage Baltikumi parimad pakkumised', EN: 'Discover the best deals in the Baltics', RU: 'Откройте для себя лучшие предложения в Балтии' },
  'home.hero.subtitle': { LV: 'Ekskluzīvi auto, nekustamie īpašumi un luksusa preces vienuviet.', LT: 'Išskirtiniai automobiliai, nekilnojamasis turtas ir prabangos prekės vienoje vietoje.', EE: 'Eksklusiivsed autod, kinnisvara ja luksuskaubad ühes kohas.', EN: 'Exclusive cars, real estate and luxury goods in one place.', RU: 'Эксклюзивные автомобили, недвижимость и предметы роскоши в одном месте.' },
  'home.search.placeholder': { LV: 'Meklēt...', LT: 'Ieškoti...', EE: 'Otsi...', EN: 'Search...', RU: 'Поиск...' },
  'home.categories.title': { LV: 'Kategorijas', LT: 'Kategorijos', EE: 'Kategooriad', EN: 'Categories', RU: 'Категории' },
  'home.featured.title': { LV: 'Izceltie Piedāvājumi', LT: 'Panašūs Pasiūlymai', EE: 'Esiletõstetud Pakkumised', EN: 'Featured Offers', RU: 'Рекомендуемые Предложения' },
  'home.latest.title': { LV: 'Jaunumi', LT: 'Naujienos', EE: 'Uudised', EN: 'Latest', RU: 'Новинки' },
  'home.auctions.title': { LV: 'Aktīvās Izsoles', LT: 'Aktyvūs Aukcionai', EE: 'Aktiivsed Oksjonid', EN: 'Active Auctions', RU: 'Активные Аукционы' },
  'home.viewAll': { LV: 'Skatīt visus', LT: 'Žiūrėti visus', EE: 'Vaata kõiki', EN: 'View all', RU: 'Смотреть все' },
  'listing.price': { LV: 'Cena', LT: 'Kaina', EE: 'Hind', EN: 'Price', RU: 'Цена' },
  'listing.auction': { LV: 'Izsole', LT: 'Aukcionas', EE: 'Oksjon', EN: 'Auction', RU: 'Аукцион' },
  'listing.currentBid': { LV: 'Pašreizējā cena', LT: 'Dabartinė kaina', EE: 'Praegune hind', EN: 'Current Bid', RU: 'Текущая ставка' },
  'listing.buyNow': { LV: 'Pirkt tūlīt', LT: 'Pirkti dabar', EE: 'Osta kohe', EN: 'Buy Now', RU: 'Купить сейчас' },
  'listing.contactSeller': { LV: 'Sazināties ar pārdevēju', LT: 'Susisiekti su pardavėju', EE: 'Võta müüjaga ühendust', EN: 'Contact Seller', RU: 'Связаться с продавцом' },
  'listing.description': { LV: 'Apraksts', LT: 'Aprašymas', EE: 'Kirjeldus', EN: 'Description', RU: 'Описание' },
  'listing.attributes': { LV: 'Specifikācija', LT: 'Specifikacija', EE: 'Spetsifikatsioon', EN: 'Specification', RU: 'Спецификация' },
  'listing.seller': { LV: 'Pārdevējs', LT: 'Pardavėjas', EE: 'Müüja', EN: 'Seller', RU: 'Продавец' },
  'listing.showPhone': { LV: 'Rādīt telefona numuru', LT: 'Rodyti telefono numerį', EE: 'Näita telefoninumbrit', EN: 'Show phone number', RU: 'Показать номер телефона' },
  'listing.makeOffer': { LV: 'Piedāvāt savu cenu', LT: 'Pasiūlyti savo kainą', EE: 'Paku oma hind', EN: 'Make an offer', RU: 'Предложить свою цену' },
  'listing.placeBid': { LV: 'Solīt tagad', LT: 'Siūlyti dabar', EE: 'Tee pakkumine', EN: 'Place bid', RU: 'Сделать ставку' },
  'listing.bids': { LV: 'solījumi', LT: 'statymai', EE: 'pakkumised', EN: 'bids', RU: 'ставки' },
  'listing.startingPrice': { LV: 'Sākuma cena', LT: 'Pradinė kaina', EE: 'Alghind', EN: 'Starting price', RU: 'Начальная цена' },
  'listing.auctionEnded': { LV: 'Izsole ir noslēgusies', LT: 'Aukcionas baigėsi', EE: 'Oksjon on lõppenud', EN: 'Auction has ended', RU: 'Аукцион завершен' },
  'listing.marketAnalysis': { LV: 'Tirgus analīze', LT: 'Rinkos analizė', EE: 'Turu analüüs', EN: 'Market analysis', RU: 'Анализ рынка' },
  'listing.creditCalculator': { LV: 'Kredīta kalkulators', LT: 'Kredito skaičiuoklė', EE: 'Krediidikalkulaator', EN: 'Credit calculator', RU: 'Кредитный калькулятор' },
  'listing.reviews': { LV: 'Pārdevēja atsauksmes', LT: 'Pardavėjo atsiliepimai', EE: 'Müüja arvustused', EN: 'Seller reviews', RU: 'Отзывы о продавце' },
  'listing.addReview': { LV: 'Pievienot atsauksmi', LT: 'Pridėti atsiliepimą', EE: 'Lisa arvustus', EN: 'Add review', RU: 'Добавить отзыв' },
  'listing.rating': { LV: 'Vērtējums', LT: 'Įvertinimas', EE: 'Hinnang', EN: 'Rating', RU: 'Рейтинг' },
  'listing.comment': { LV: 'Komentārs', LT: 'Komentaras', EE: 'Kommentaar', EN: 'Comment', RU: 'Комментарий' },
  'listing.submitReview': { LV: 'Pievienot', LT: 'Pridėti', EE: 'Lisa', EN: 'Submit', RU: 'Отправить' },
  'listing.submitting': { LV: 'Pievieno...', LT: 'Pridedama...', EE: 'Lisamine...', EN: 'Submitting...', RU: 'Отправка...' },
  'listing.noReviews': { LV: 'Šim pārdevējam vēl nav atsauksmju.', LT: 'Šis pardavėjas dar neturi atsiliepimų.', EE: 'Sellel müüjal pole veel arvustusi.', EN: 'This seller has no reviews yet.', RU: 'У этого продавца пока нет отзывов.' },
  'search.filters': { LV: 'Filtri', LT: 'Filtrai', EE: 'Filtrid', EN: 'Filters', RU: 'Фильтры' },
  'search.sort': { LV: 'Kārtot', LT: 'Rūšiuoti', EE: 'Sorteeri', EN: 'Sort', RU: 'Сортировать' },
  'search.newest': { LV: 'Jaunākie', LT: 'Naujausi', EE: 'Uusimad', EN: 'Newest', RU: 'Новейшие' },
  'search.priceLow': { LV: 'Cena: no zemākās', LT: 'Kaina: nuo mažiausios', EE: 'Hind: madalaimast', EN: 'Price: Low to High', RU: 'Цена: от низкой' },
  'search.priceHigh': { LV: 'Cena: no augstākās', LT: 'Kaina: nuo aukščiausios', EE: 'Hind: kõrgeimast', EN: 'Price: High to Low', RU: 'Цена: от высокой' },
  'search.location': { LV: 'Atrašanās vieta', LT: 'Vieta', EE: 'Asukoht', EN: 'Location', RU: 'Местоположение' },
  'search.minPrice': { LV: 'Min. cena', LT: 'Min. kaina', EE: 'Min. hind', EN: 'Min Price', RU: 'Мин. цена' },
  'search.maxPrice': { LV: 'Max. cena', LT: 'Max. kaina', EE: 'Max. hind', EN: 'Max Price', RU: 'Макс. цена' },
  'search.apply': { LV: 'Pielietot', LT: 'Taikyti', EE: 'Rakenda', EN: 'Apply', RU: 'Применить' },
  'search.reset': { LV: 'Notīrīt', LT: 'Išvalyti', EE: 'Tühjenda', EN: 'Reset', RU: 'Сбросить' },
  'search.noResults': { LV: 'Nekas netika atrasts', LT: 'Nieko nerasta', EE: 'Tulemusi ei leitud', EN: 'No results found', RU: 'Ничего не найдено' },
  'add.title': { LV: 'Pievienot sludinājumu', LT: 'Pridėti skelbimą', EE: 'Lisa kuulutus', EN: 'Add Listing', RU: 'Добавить объявление' },
  'add.step1': { LV: 'Kategorija', LT: 'Kategorija', EE: 'Kategooria', EN: 'Category', RU: 'Категория' },
  'add.step2': { LV: 'Informācija', LT: 'Informacija', EE: 'Info', EN: 'Information', RU: 'Информация' },
  'add.step3': { LV: 'Attēli', LT: 'Nuotraukos', EE: 'Pildid', EN: 'Images', RU: 'Изображения' },
  'add.step4': { LV: 'Pārskats', LT: 'Peržiūra', EE: 'Ülevaade', EN: 'Review', RU: 'Обзор' },
  'add.next': { LV: 'Turpināt', LT: 'Tęsti', EE: 'Jätka', EN: 'Next', RU: 'Далее' },
  'add.back': { LV: 'Atpakaļ', LT: 'Atgal', EE: 'Tagasi', EN: 'Back', RU: 'Назад' },
  'add.submit': { LV: 'Publicēt', LT: 'Paskelbti', EE: 'Avalda', EN: 'Publish', RU: 'Опубликовать' },
  'add.aiTitle': { LV: 'AI Uzlabošana', LT: 'AI Patobulinimas', EE: 'AI Täiustamine', EN: 'AI Enhancement', RU: 'AI Улучшение' },
  'add.aiDesc': { LV: 'Mūsu AI palīdzēs jums izveidot pievilcīgāku sludinājuma aprakstu.', LT: 'Mūsų AI padės jums sukurti patrauklesnį skelbimo aprašymą.', EE: 'Meie AI aitab teil luua atraktiivsema kuulutuse kirjelduse.', EN: 'Our AI will help you create a more attractive listing description.', RU: 'Наш AI поможет вам создать более привлекательное описание объявления.' },
  'profile.myListings': { LV: 'Mani sludinājumi', LT: 'Mano skelbimai', EE: 'Minu kuulutused', EN: 'My Listings', RU: 'Мои объявления' },
  'profile.favorites': { LV: 'Favorīti', LT: 'Mėgstamiausi', EE: 'Lemmikud', EN: 'Favorites', RU: 'Избранное' },
  'profile.wallet': { LV: 'Maciņš', LT: 'Piniginė', EE: 'Rahakott', EN: 'Wallet', RU: 'Кошелек' },
  'profile.ads': { LV: 'Reklāmas', LT: 'Reklamos', EE: 'Reklaamid', EN: 'Ads', RU: 'Реклама' },
  'profile.offers': { LV: 'Piedāvājumi', LT: 'Pasiūlymai', EE: 'Pakkumised', EN: 'Offers', RU: 'Предложения' },
  'profile.settings': { LV: 'Iestatījumi', LT: 'Nustatymai', EE: 'Seaded', EN: 'Settings', RU: 'Настройки' },
  'profile.notifications': { LV: 'Paziņojumi', LT: 'Pranešimai', EE: 'Teavitused', EN: 'Notifications', RU: 'Уведомления' },
  'profile.savedSearches': { LV: 'Saglabātie meklējumi', LT: 'Išsaugoti ieškojimai', EE: 'Salvestatud otsingud', EN: 'Saved Searches', RU: 'Сохраненные поиски' },
  'chat.title': { LV: 'Ziņojumi', LT: 'Žinutės', EE: 'Sõnumid', EN: 'Messages', RU: 'Сообщения' },
  'chat.noConversations': { LV: 'Jums vēl nav nevienas sarunas.', LT: 'Jūs dar neturite jokių pokalbių.', EE: 'Teil pole veel ühtegi vestlust.', EN: 'You have no conversations yet.', RU: 'У вас пока нет диалогов.' },
  'chat.typeMessage': { LV: 'Rakstiet ziņu...', LT: 'Rašykite žinutę...', EE: 'Kirjuta sõnum...', EN: 'Type a message...', RU: 'Введите сообщение...' },
  'chat.makeOffer': { LV: 'Izteikt piedāvājumu', LT: 'Pateikti pasiūlymą', EE: 'Tee pakkumine', EN: 'Make an offer', RU: 'Сделать предложение' },
  'chat.accept': { LV: 'Pieņemt', LT: 'Priimti', EE: 'Võta vastu', EN: 'Accept', RU: 'Принять' },
  'chat.reject': { LV: 'Noraidīt', LT: 'Atmesti', EE: 'Lükka tagasi', EN: 'Reject', RU: 'Отклонить' },
  'home.search.location': { LV: 'Kur?', LT: 'Kur?', EE: 'Kus?', EN: 'Where?', RU: 'Где?' },
  'home.search.button': { LV: 'Meklēt', LT: 'Ieškoti', EE: 'Otsi', EN: 'Search', RU: 'Поиск' },
  'home.trust.verified': { LV: 'Pārbaudīti pārdevēji', LT: 'Patikrinti pardavėjai', EE: 'Kontrollitud müüjad', EN: 'Verified Sellers', RU: 'Проверенные продавцы' },
  'home.trust.verifiedDesc': { LV: 'Droši darījumi ar verificētiem lietotājiem.', LT: 'Saugūs sandoriai su patikrintais vartotojais.', EE: 'Turvalised tehingud kontrollitud kasutajatega.', EN: 'Secure transactions with verified users.', RU: 'Безопасные сделки с проверенными пользователями.' },
  'home.trust.payments': { LV: 'Droši maksājumi', LT: 'Saugūs mokėjimai', EE: 'Turvalised maksed', EN: 'Secure Payments', RU: 'Безопасные платежи' },
  'home.trust.paymentsDesc': { LV: 'Jūsu dati un nauda ir drošībā.', LT: 'Jūsų duomenys ir pinigai yra saugūs.', EE: 'Teie andmed ja raha on kaitstud.', EN: 'Your data and money are safe.', RU: 'Ваши данные и деньги в безопасности.' },
  'home.trust.support': { LV: 'Atbalsts 24/7', LT: 'Pagalba 24/7', EE: 'Tugi 24/7', EN: 'Support 24/7', RU: 'Поддержка 24/7' },
  'home.trust.supportDesc': { LV: 'Mēs esam šeit, lai palīdzētu jebkurā laikā.', LT: 'Mes esame čia, kad padėtume bet kuriuo metu.', EE: 'Oleme siin, et aidata igal ajal.', EN: 'We are here to help anytime.', RU: 'Мы здесь, чтобы помочь в любое время.' },
};

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>('LV');

  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') as Language;
    if (savedLang && ['LV', 'LT', 'EE', 'EN', 'RU'].includes(savedLang)) {
      setLangState(savedLang);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  const t = (key: string): string => {
    if (translations[key] && translations[key][lang]) {
      return translations[key][lang];
    }
    return key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
