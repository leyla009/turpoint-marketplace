import type { Locale } from './translations';

// Starting points offered in the homepage "From" dropdown (stored
// Azerbaijani names). Baku is the default.
export const DEPARTURE_CITIES = ['Bakı', 'Gəncə', 'Naxçıvan'];

// Every city/district offered in the homepage "To" dropdown - Azerbaijan's
// districts and republic-level cities, each listed once (a district and
// the city of the same name, e.g. Lənkəran, share one entry because tours
// store a single place name). Values are the Azerbaijani names exactly as
// stored in tours.location, which /tours?location= filters on; the
// dropdown sorts them A-Z by their name in the reader's language.
// Qəbələ and Kürdəmir are included too - both are real districts and Qəbələ
// has tours.
export const AZERBAIJAN_PLACES: string[] = [
  'Abşeron',
  'Ağdaş',
  'Ağdam',
  'Ağdərə',
  'Ağcabədi',
  'Ağstafa',
  'Ağsu',
  'Astara',
  'Babək',
  'Bakı',
  'Balakən',
  'Bərdə',
  'Beyləqan',
  'Biləsuvar',
  'Culfa',
  'Daşkəsən',
  'Füzuli',
  'Gədəbəy',
  'Gəncə',
  'Qobustan',
  'Goranboy',
  'Göyçay',
  'Göygöl',
  'Hacıqabul',
  'İmişli',
  'İsmayıllı',
  'Cəbrayıl',
  'Cəlilabad',
  'Kəlbəcər',
  'Kəngərli',
  'Xaçmaz',
  'Xankəndi',
  'Xızı',
  'Xocalı',
  'Xocavənd',
  'Laçın',
  'Lənkəran',
  'Lerik',
  'Masallı',
  'Mingəçevir',
  'Naftalan',
  'Naxçıvan',
  'Neftçala',
  'Oğuz',
  'Ordubad',
  'Qax',
  'Qazax',
  'Quba',
  'Qubadlı',
  'Qusar',
  'Saatlı',
  'Sabirabad',
  'Sədərək',
  'Salyan',
  'Samux',
  'Şabran',
  'Şahbuz',
  'Şəki',
  'Şamaxı',
  'Şəmkir',
  'Şərur',
  'Şirvan',
  'Şuşa',
  'Siyəzən',
  'Sumqayıt',
  'Tərtər',
  'Tovuz',
  'Ucar',
  'Yardımlı',
  'Yevlax',
  'Zaqatala',
  'Zəngilan',
  'Zərdab',
  'Qəbələ',
  'Kürdəmir',
];

// Azerbaijan's 14 official economic regions and the cities/districts in
// each one's scope. The region name is only ever a group heading - what
// travelers pick is a place. `places` are the Azerbaijani names as stored
// in tours.location, which is what /tours?location= filters on.
export const ECONOMIC_REGIONS: { slug: string; label: Record<Locale, string>; places: string[] }[] = [
  { slug: 'baku', label: { az: 'Bakı iqtisadi rayonu', en: 'Baku Economic Region', ru: 'Бакинский экономический район' }, places: ['Bakı'] },
  { slug: 'absheron-khizi', label: { az: 'Abşeron-Xızı iqtisadi rayonu', en: 'Absheron-Khizi Economic Region', ru: 'Апшерон-Хызынский экономический район' }, places: ['Abşeron', 'Xızı', 'Sumqayıt'] },
  { slug: 'guba-khachmaz', label: { az: 'Quba-Xaçmaz iqtisadi rayonu', en: 'Guba-Khachmaz Economic Region', ru: 'Губа-Хачмазский экономический район' }, places: ['Quba', 'Qusar', 'Xaçmaz', 'Şabran', 'Siyəzən'] },
  { slug: 'mountainous-shirvan', label: { az: 'Dağlıq Şirvan iqtisadi rayonu', en: 'Mountainous Shirvan Economic Region', ru: 'Горно-Ширванский экономический район' }, places: ['Şamaxı', 'İsmayıllı', 'Ağsu', 'Qobustan'] },
  { slug: 'shaki-zagatala', label: { az: 'Şəki-Zaqatala iqtisadi rayonu', en: 'Shaki-Zagatala Economic Region', ru: 'Шеки-Загатальский экономический район' }, places: ['Şəki', 'Qəbələ', 'Zaqatala', 'Qax', 'Balakən', 'Oğuz'] },
  { slug: 'ganja-dashkasan', label: { az: 'Gəncə-Daşkəsən iqtisadi rayonu', en: 'Ganja-Dashkasan Economic Region', ru: 'Гянджа-Дашкесанский экономический район' }, places: ['Gəncə', 'Naftalan', 'Daşkəsən', 'Goranboy', 'Göygöl', 'Samux'] },
  { slug: 'gazakh-tovuz', label: { az: 'Qazax-Tovuz iqtisadi rayonu', en: 'Gazakh-Tovuz Economic Region', ru: 'Газах-Товузский экономический район' }, places: ['Qazax', 'Tovuz', 'Ağstafa', 'Gədəbəy', 'Şəmkir'] },
  { slug: 'lankaran-astara', label: { az: 'Lənkəran-Astara iqtisadi rayonu', en: 'Lankaran-Astara Economic Region', ru: 'Ленкорань-Астаринский экономический район' }, places: ['Lənkəran', 'Astara', 'Cəlilabad', 'Lerik', 'Masallı', 'Yardımlı'] },
  { slug: 'central-aran', label: { az: 'Mərkəzi Aran iqtisadi rayonu', en: 'Central Aran Economic Region', ru: 'Центрально-Аранский экономический район' }, places: ['Mingəçevir', 'Ağdaş', 'Göyçay', 'Kürdəmir', 'Ucar', 'Yevlax', 'Zərdab'] },
  { slug: 'mil-mughan', label: { az: 'Mil-Muğan iqtisadi rayonu', en: 'Mil-Mughan Economic Region', ru: 'Миль-Муганский экономический район' }, places: ['Beyləqan', 'İmişli', 'Saatlı', 'Sabirabad'] },
  { slug: 'shirvan-salyan', label: { az: 'Şirvan-Salyan iqtisadi rayonu', en: 'Shirvan-Salyan Economic Region', ru: 'Ширван-Сальянский экономический район' }, places: ['Şirvan', 'Biləsuvar', 'Hacıqabul', 'Neftçala', 'Salyan'] },
  { slug: 'karabakh', label: { az: 'Qarabağ iqtisadi rayonu', en: 'Karabakh Economic Region', ru: 'Карабахский экономический район' }, places: ['Xankəndi', 'Ağcabədi', 'Ağdam', 'Ağdərə', 'Bərdə', 'Füzuli', 'Xocalı', 'Xocavənd', 'Şuşa', 'Tərtər'] },
  { slug: 'east-zangezur', label: { az: 'Şərqi Zəngəzur iqtisadi rayonu', en: 'East Zangezur Economic Region', ru: 'Восточно-Зангезурский экономический район' }, places: ['Kəlbəcər', 'Laçın', 'Cəbrayıl', 'Qubadlı', 'Zəngilan'] },
  { slug: 'nakhchivan', label: { az: 'Naxçıvan Muxtar Respublikası', en: 'Nakhchivan Autonomous Republic', ru: 'Нахичеванская Автономная Республика' }, places: ['Naxçıvan', 'Babək', 'Culfa', 'Kəngərli', 'Ordubad', 'Sədərək', 'Şahbuz', 'Şərur'] },
];

/** "Shaki-Zagatala Economic Region" -> "Shaki-Zagatala", for group headings. */
export function regionShortLabel(label: string): string {
  return label.replace(/\s+(Economic Region|iqtisadi rayonu|экономический район)$/u, '');
}

/** The economic region a stored place name belongs to, if any. */
export function regionOfPlace(place: string) {
  return ECONOMIC_REGIONS.find((r) => r.places.includes(place));
}
