// Stop-by-stop routes for the seed tours whose content files only record a
// meeting point. Each stop is a place named in that tour's own description,
// in the order the description visits them. The tour page splits on "→" to
// draw the itinerary; an optional leading "HH:MM - " is the start time used by
// the e-ticket.

export const SEED_ROUTES = {
  'baku-old-city': 'Fountain Square → Palace of the Shirvanshahs → Maiden Tower → Icheri Sheher (Old City) → Baku Boulevard',
  'baku-restaurant-evening': 'Nizami Mall → Traditional restaurant → Live music and folk dance',
  'baku-caspian-boat': 'Hotel pickup → Baku Bay boat trip → Flame Towers and Maiden Tower views → Crystal Hall and Flag Square → Drop-off',
  'baku-cooking-class': '1 Fikret Amirov, Baku → Welcome tea → Dolma, plov, shepherd’s salad and qutab → Shared meal',
  'baku-food-tour-market-teahouse': 'Taza Bazaar → Traditional tea house → Qutab and plov tasting → Shirvanshah Restaurant',
  'baku-flavors-tasting': 'Baku Mall → Five tasting stops → Tea session',
  'baku-street-food': 'Double Gates, Icherisheher → Street food stalls → Food markets → Hidden local eateries',
  'baku-bazaar-tour': 'Local market → Carpet, ceramics and textile shops → Artisan workshops → Sweet shops',
  'baku-best-of-walking': 'Highland Park → Martyrs’ Lane → Baku Funicular → Carpet Museum → Baku Boulevard → Mini-Venice → Philharmonia Garden → Old City → Bukhara and Multani Caravanserais → Fountain Square → Nizami Street',
  'gobustan-mud-volcanoes-ateshgah': 'Baku → Bibi-Heybat Mosque → Gobustan National Park → Mud volcanoes → Ateshgah Fire Temple → Yanardag → Baku',
  'lahij-village-city-of-masters': 'Baku → Diri Baba Mausoleum → Shamakhi Juma Mosque → Suspension bridge → Lahij → Baku',
  'shirvan-eco-tour': '08:00 - Baku → Sangachal Caravanserai → Shirvan National Park → Local home lunch → Baku',
  'sheki-old-town-khans-palace': 'Baku → Shamakhi → Ismayilli forests → Sheki Khans’ Palace → Sheki Caravanserai → Sheki Panoramic Park → Kish → Baku',
  'sheki-old-town-walking': 'Khan’s Palace → Ceramic House → Round Temple → History and Ethnographic Museum → Craftsmen House → Upper Caravanserai → Khan’s Mosque → Local bazaar',
  'sheki-private-unesco': 'Baku → Sheki Khans’ Palace → Caravanserai → Sheki bazaar → Juma Mosque → Artisan workshops → Baku',
  'sheki-sparkling-wine-2day': 'Baku → Tea break → Sheki → Winery tasting → Wine house (overnight) → Sheki Khan’s Palace → Baku',
  'shamakhi-basgal-lahij-private': 'Baku → Shamakhi Juma Mosque → Basgal → Lahij → Hanging Bridge → Baku',
  'shamakhi-alpaca-farm': 'Pickup point → Shamakhi → Alpaca farm → Drop-off',
  'guba-khinalig-candy-cane': 'Baku → Beshbarmag Mountain → Candy Cane Mountain → Gachrash Forest → Red Settlement → Gudyalchay canyon road → Eagle Mountain → Khinalig → Baku',
  'shahdag-2day-quba-gecresh': 'Baku → Khizi striped hills → Gecresh Forest → Red Settlement → Chenlibel Lake → Shahdag Mountain Resort (overnight) → Laza waterfalls → Baku',
  'karabakh-khankendi-shusha': 'Baku → Khankendi → Shusha → Shusha Fortress → Jidir Duzu → Isa Bulagi → Baku',
  'gabala-day-trip': 'Baku → Shamakhi → Lake Nohur → Seven Beauties waterfall → Tufandag cable car → Gabala Sport Club → Baku',
};
