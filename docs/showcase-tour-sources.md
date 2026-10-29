# Showcase tour source notes

The eight additional showcase itineraries use destination facts and route ideas from Azerbaijan Travel and the Azerbaijan Tourism Board. They are not copied offers from a particular operator. Prices, dates, availability, inclusions, and meeting arrangements in TurPoint are sample values for a local demonstration and should be confirmed by a real Tour Operator before publication.

| Showcase listing | Public source used |
| --- | --- |
| Red Settlement & Mountain Jewish Heritage | [Azerbaijan Travel: Red Settlement](https://azerbaijan.travel/introduction-to-jewish-heritage-in-the-red-settlement) — location opposite Guba, community history, Mountain Jews Museum, synagogue, and visitor centre. |
| Lake Goygol & Helenendorf Heritage | [Azerbaijan Travel: Goygol](https://azerbaijan.travel/trip-to-goygol) and [German heritage in Goygol](https://azerbaijan.travel/follow-traces-german-heritage-goygol-azerbaijan) — Lake Goygol beneath Mount Kapaz, Maralgol, Helenendorf founded in 1819, and surviving heritage sites. Its cover photo is from [Azerbaijan Travel’s Lake Goygol page](https://azerbaijan.travel/be-inspired-lake-goygol). |
| Khinalig–Galakhudat Mountain Trail | [Azerbaijan Travel: trail details](https://nakhchivan.azerbaijan.travel/khinalig-galakhudat-trail) — 8.2 km route, 370 m ascent, elevation range, expected walking time, and trail safety notes. Cover photo from the [official trail page](https://azerbaijan.travel/galakhudat-khinalig-trail). |
| Shahdag Mountain Heights & Laza Waterfalls | [Azerbaijan Tourism Board: regional tour itinerary PDF](https://azerbaijan.travel/storage/COP29_6_tours_eng_web.pdf) and [Shahdag National Park](https://azerbaijan.travel/shahdags-wild-thrills-and-placid-pauses) — sample Baku day-trip schedule, resort activities, Laza, and mountain landscape. |
| Ganja Old Town & Nizami Heritage Walk | [Azerbaijan Travel: Ganja](https://azerbaijan.travel/trip-to-ganja) and [Nizami Ganjavi Mausoleum and Museum](https://azerbaijan.travel/nizami-ganjavi-mausoleum-and-museum) — historic city landmarks, Nizami complex, and museum context. Cover photo from the [official Nizami page](https://azerbaijan.travel/nizami-ganjavi-mausoleum-and-museum). |
| Lankaran Tea Country & Hirkan Forest Edge | [Azerbaijan Travel: Lankaran](https://azerbaijan.travel/trip-to-lankaran) and [Lankaran tea](https://azerbaijan.travel/lankaran-tea) — tea-growing region, Talysh Mountains, Hirkan forest, and local tea culture. |
| Diri Baba Mausoleum & Shamakhi Heritage | [Azerbaijan Tourism Board: regional tour itinerary PDF](https://azerbaijan.travel/storage/COP29_6_tours_eng_web.pdf) — Diri Baba, Shamakhi Juma Mosque, and the regional day-trip structure. Cover photo from [Azerbaijan Travel’s Diri Baba page](https://azerbaijan.travel/heritage-of-history-diri-baba-mausoleum). |
| Nakhchivan City & Momine Khatun Mausoleum | [Azerbaijan Travel: Momine Khatun Mausoleum](https://nakhchivan.azerbaijan.travel/mausoleum-momine-khatin-at-nakhchivan) — 12th-century monument, Ajemi Nakhchivani, and Nakhchivan-school architectural details. Cover photo from the same official page. |

Five location-specific cover photos are stored locally from official Azerbaijan Travel pages: Goygol, Khinalig–Galakhudat, Ganja, Diri Baba, and Nakhchivan. The remaining new listings use existing regional or landscape covers shipped under `frontend/public/seed/`. No remote image hotlinks are required for the demo.

## Wellness and multi-day additions (`backend/src/db/seedToursExtra.js`)

Six more listings: four in the wellness category ("Sağlamlıq və istirahət") and two multi-day heritage tours. Facts, fees and opening hours come from the pages below. Each cover photo was taken from that place's own official gallery and resized to 1600 px. No photo is shared with another tour.

| Showcase listing | Public source used | Cover photo |
| --- | --- | --- |
| Duzdag Salt Caves & Speleotherapy Visit | [Duzdag miraculous healing](https://azerbaijan.travel/duzdag-miraculous-healing): 12 km from Nakhchivan city, caves up to 110 m, conditions treated, Duzdag Hotel facilities, contacts | `duzdag-official.jpg`, a salt-mine gallery |
| Daridag Arsenic Thermal Springs & Ashabi-Kahf | [Thermal waters at Daridag](https://azerbaijan.travel/thermal-waters-at-daridag) (52°C at source, 37–41°C baths, sanatorium since 1978) and [Ashabi-Kahf](https://azerbaijan.travel/ancient-ashabi-kehf-cave) (12 km east of the city, stairs, Seven Sleepers) | `daridag-official.jpg`, the sanatorium under the Daridag cliffs |
| Lankaran Hot Springs: Haftoni & Istisu | [Lankaran hot springs](https://azerbaijan.travel/lankaran-hot-springs-soothe-and-restore): Istisu (3 AZN, 09:00–20:00) and Lankaran Springs Wellness Resort in Haftoni | `lankaran-springs-official.jpg`, Lankaran Springs Wellness Resort in Haftoni, a stop on the route |
| Old City Hammam Afternoon & Tea in Baku | [Baku's traditional hammams](https://azerbaijan.travel/traditional-hammams-baku): Agha Mikayil (18th c., Kichik Gala St., separate women's and men's days) and Agha Zeynal (19th c., Gulle St., men only) | `baku-hammam-official.jpg`, hammam domes in Icherisheher |
| 2-Day Old Gabala & Sheki Silk Road Tour | [Old Gabala](https://azerbaijan.travel/soak-up-history-old-gabala) (Chukhur Gabala, 15 km SW, 25 ha, towers of the southern gate, digs since 1929) and [Discover Gabala](https://azerbaijan.travel/trip-to-gabala) (Nij and the Udi people) | `old-gabala-official.jpg`, the brick walls at the southern gate |
| 3-Day Nakhchivan: Khans' Palace, Alinja & Ashabi-Kahf | [Nakhchivan Khans' Palace](https://azerbaijan.travel/eye-catching-nakhchivan-khans-palace) (museum since 2010), [Alinja Fortress](https://azerbaijan.travel/discover-the-alinja-fortress) (museum, about 1,500 steps, reconstruction), Ashabi-Kahf (see above) | `nakhchivan-khans-palace-official.jpg`, the palace building |

Masalli Istisu (open May–October) and Yanardagh (May–September) were left out because the showcase dates fall outside their seasons.

`npm run seed:extra` adds these tours to an existing showcase database. It also fills the stop-by-stop routes from `backend/src/db/seedRoutes.js`, moves every showcase tour to dates from tomorrow onwards, and adds last-minute deals to the five soonest tours.
