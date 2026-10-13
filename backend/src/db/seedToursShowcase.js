// Eight additional showcase itineraries based on destination facts and routes
// published by Azerbaijan Travel / the Azerbaijan Tourism Board. These are
// sample marketplace listings: prices, availability, inclusions, and dates are
// illustrative and must be confirmed by a real Tour Operator before use.

const COMMON = {
  en: {
    includes: ['Guided visit along the listed route', 'Planned stops at the featured sights', 'Time for photos and short breaks'],
    excludes: ['Museum, park, or attraction admission unless stated', 'Meals and personal purchases'],
    bring: ['Comfortable shoes', 'Water and weather-appropriate clothing'],
  },
  az: {
    includes: ['Göstərilən marşrut üzrə bələdçi müşayiəti', 'Qeyd olunan görməli yerlərdə dayanacaqlar', 'Şəkil və qısa fasilələr üçün vaxt'],
    excludes: ['Ayrıca qeyd edilmədikdə muzey, park və məkan biletləri', 'Yemək və şəxsi alış-veriş'],
    bring: ['Rahat ayaqqabı', 'Su və havaya uyğun geyim'],
  },
  ru: {
    includes: ['Сопровождение гида по указанному маршруту', 'Остановки у описанных достопримечательностей', 'Время для фотографий и коротких перерывов'],
    excludes: ['Билеты в музеи, парки и достопримечательности, если не указано иное', 'Питание и личные покупки'],
    bring: ['Удобная обувь', 'Вода и одежда по погоде'],
  },
};

function showcaseTour({ key, location, category, photo, price, hours, route, pickup, group = 8, content }) {
  const i18n = {};
  for (const locale of ['en', 'az', 'ru']) {
    const copy = COMMON[locale];
    i18n[locale] = {
      ...content[locale],
      excludes: copy.excludes,
      notSuitable: [],
      bring: copy.bring,
      notAllowed: [],
      ...copy,
    };
  }

  return {
    key,
    operator: 'TurPoint Showcase',
    location,
    category,
    photo,
    price,
    duration_days: 1,
    min_participants: 1,
    max_participants: group,
    features: 'guide',
    vehicle_features: pickup ? 'ac' : null,
    facts: { duration_hours: hours, guide_languages: ['az', 'en', 'ru'], pickup, private: false },
    route,
    i18n,
  };
}

export const ADDITIONAL_SHOWCASE_TOURS = [
  showcaseTour({
    key: 'guba-red-settlement-heritage', location: 'Quba', category: 'history', photo: '/seed/guba-khinalig-candy-cane.jpg',
    price: 38, hours: 7, pickup: true, route: '09:00 - Guba city centre → Red Settlement → Mountain Jews Museum',
    content: {
      en: {
        title: 'Red Settlement & Mountain Jewish Heritage',
        summary: 'Cross the Gudyalchay River from Guba to explore the history, architecture, and living traditions of Red Settlement.',
        highlights: ['Walk the red-roofed streets of Red Settlement', 'Learn about Mountain Jewish history and Juhuri culture', 'Visit the Mountain Jews Museum and local synagogue area'],
        description: ['Meet in Guba and cross the Gudyalchay River to Red Settlement, a historic Mountain Jewish community founded in the mid-18th century. A local guide introduces the settlement’s streets, distinctive homes, and community history.', 'Visit the Mountain Jews Museum and allow time to explore the village respectfully. Museum opening hours and admission can change, so confirm them before travel.'],
        know: ['Red Settlement is opposite Guba on the northern bank of the Gudyalchay River. Museum and synagogue access is subject to opening hours and local arrangements.'],
        meeting: 'Meet at an agreed central point in Guba; pickup from Baku can be arranged for this sample itinerary.',
      },
      az: {
        title: 'Qırmızı Qəsəbə və Dağ Yəhudilərinin irsi',
        summary: 'Quba şəhərindən Qudyalçayın o biri sahilinə keçərək Qırmızı Qəsəbənin tarixini, memarlığını və yaşayan ənənələrini kəşf edin.',
        highlights: ['Qırmızı Qəsəbənin qırmızı kirəmitli küçələrində gəzin', 'Dağ yəhudilərinin tarixi və cuhuri mədəniyyəti ilə tanış olun', 'Dağ Yəhudiləri Muzeyinə və sinaqoq ətrafına baş çəkin'],
        description: ['Qubada görüşüb Qudyalçay çayını keçərək XVIII əsrin ortalarında yaranmış Dağ yəhudiləri icmasının yaşadığı Qırmızı Qəsəbəyə yollanın. Bələdçi qəsəbənin küçələri, fərqli evləri və icmanın tarixi haqqında məlumat verir.', 'Dağ Yəhudiləri Muzeyinə baş çəkin və qəsəbəni hörmətlə gəzmək üçün vaxt ayırın. Muzeyin iş saatları və giriş qaydaları dəyişə bilər; səfərdən əvvəl dəqiqləşdirin.'],
        know: ['Qırmızı Qəsəbə Qudyalçayın şimal sahilində, Quba şəhərinin qarşısında yerləşir. Muzey və sinaqoqa giriş iş saatlarından və yerli razılaşmalardan asılıdır.'],
        meeting: 'Qubada əvvəlcədən razılaşdırılmış mərkəzi görüş yerində toplaşın; bu nümunə marşrut üçün Bakıdan transfer də təşkil oluna bilər.',
      },
      ru: {
        title: 'Красная Слобода и наследие горских евреев',
        summary: 'Пересеките реку Гудиалчай из Губы и познакомьтесь с историей, архитектурой и традициями Красной Слободы.',
        highlights: ['Прогулка по улицам Красной Слободы с красными крышами', 'Знакомство с историей горских евреев и языком джуури', 'Посещение Музея горских евреев и района синагоги'],
        description: ['Встреча в Губе и переезд через Гудиалчай в Красную Слободу — историческое поселение горских евреев, основанное в середине XVIII века. Гид расскажет об улицах, характерных домах и истории местной общины.', 'Посетите Музей горских евреев и оставьте время для уважительного знакомства с поселением. Часы работы и правила посещения музея могут меняться; уточните их перед поездкой.'],
        know: ['Красная Слобода расположена напротив Губы, на северном берегу Гудиалчая. Доступ в музей и синагогу зависит от часов работы и местных договорённостей.'],
        meeting: 'Встреча в заранее согласованном месте в центре Губы; в рамках этого примерного маршрута можно организовать трансфер из Баку.',
      },
    },
  }),
  showcaseTour({
    key: 'goygol-lake-helenendorf', location: 'Göygöl', category: 'nature', photo: '/seed/goygol-lake-official.jpg',
    price: 55, hours: 8, pickup: true, route: '09:00 - Ganja → Goygol National Park → Helenendorf heritage walk',
    content: {
      en: {
        title: 'Lake Goygol & Helenendorf Heritage',
        summary: 'Pair a forest-framed mountain lake with the German heritage streets and landmarks of historic Helenendorf, now Goygol.',
        highlights: ['See Lake Goygol beneath Mount Kapaz', 'Explore the historic German-settler town of Helenendorf', 'Choose an easy forest viewpoint walk when park access allows'],
        description: ['Travel from Ganja into the Goygol area, where Lake Goygol sits beneath Mount Kapaz and is surrounded by forest. Enjoy the lakeside viewpoints and learn about the protected landscape and nearby Maralgol.', 'Return to Goygol town for a walk among the former Helenendorf streets. The town was founded by settlers from Württemberg in 1819; remaining heritage buildings include the Lutheran church and Victor Klein House Museum.'],
        know: ['Lake access is controlled by Goygol National Park and can be affected by weather or seasonal rules. Park entry, museum opening, and transport inside the protected area are not included unless confirmed.'],
        meeting: 'Pickup in Ganja or meet at the agreed city-centre point; the route finishes in Ganja.',
      },
      az: {
        title: 'Göygöl gölü və Helenendorf irsi',
        summary: 'Meşələrlə əhatələnmiş dağ gölünü tarixi Helenendorf, indiki Göygöl şəhərinin alman irsi küçələri və abidələri ilə birləşdirin.',
        highlights: ['Kəpəz dağının ətəyində Göygöl gölünü görün', 'Helenendorfun tarixi alman məskəni ilə tanış olun', 'Milli parkın giriş qaydaları imkan verərsə meşə mənzərə nöqtəsinə yüngül yürüş edin'],
        description: ['Gəncədən Göygöl ərazisinə yollanın. Kəpəz dağının ətəyində, meşələrlə əhatələnmiş Göygöl gölünün mənzərə nöqtələrində vaxt keçirin və qorunan təbiət ərazisi, yaxınlıqdakı Maralgöl haqqında məlumat alın.', 'Göygöl şəhərinə qayıdaraq keçmiş Helenendorf küçələrində gəzin. Şəhər 1819-cu ildə Vürtemberqdən gələn köçkünlər tərəfindən salınıb; lüteran kilsəsi və Viktor Klaynın ev-muzeyi qorunan irs nümunələrindəndir.'],
        know: ['Gölə giriş Göygöl Milli Parkının qaydaları ilə tənzimlənir və hava və mövsümdən asılı ola bilər. Əvvəlcədən təsdiqlənməyibsə, park bileti, muzey və qoruq daxilində nəqliyyat qiymətə daxil deyil.'],
        meeting: 'Gəncədə transfer və ya əvvəlcədən razılaşdırılmış mərkəzi görüş; marşrut Gəncədə başa çatır.',
      },
      ru: {
        title: 'Озеро Гёйгёль и наследие Хеленендорфа',
        summary: 'Совместите горное озеро среди лесов с прогулкой по улицам и памятным местам немецкого Хеленендорфа, ныне Гёйгёля.',
        highlights: ['Увидеть озеро Гёйгёль у подножия горы Кяпаз', 'Познакомиться с историей немецкого поселения Хеленендорф', 'Прогуляться к лесной обзорной точке, если правила парка это позволяют'],
        description: ['Из Гянджи отправляйтесь в район Гёйгёля. Озеро расположено у подножия горы Кяпаз среди лесов; на обзорных площадках можно полюбоваться пейзажем и узнать о национальном парке и соседнем озере Маралгёль.', 'Затем вернитесь в город Гёйгёль и прогуляйтесь по бывшим улицам Хеленендорфа. Поселение основали выходцы из Вюртемберга в 1819 году; среди сохранившихся памятников — лютеранская церковь и дом-музей Виктора Кляйна.'],
        know: ['Доступ к озеру регулируется администрацией национального парка и может зависеть от погоды и сезона. Вход в парк, музей и транспорт внутри охраняемой территории не включены без отдельного подтверждения.'],
        meeting: 'Трансфер или встреча в заранее согласованном месте в Гяндже; окончание маршрута в Гяндже.',
      },
    },
  }),
  showcaseTour({
    key: 'khinalig-galakhudat-trail', location: 'Quba–Xınalıq', category: 'nature', photo: '/seed/khinalig-trail-official.jpg',
    price: 48, hours: 5, pickup: false, route: '08:30 - Khinalig village → Galakhudat trail → Khinalig',
    content: {
      en: {
        title: 'Khinalig–Galakhudat Mountain Trail',
        summary: 'Hike a high Caucasus route above the Gudyalchay valley with broad views of the Gizilgaya cliffs and traditional villages.',
        highlights: ['Follow the marked 8.2 km Khinalig–Galakhudat trail', 'See the Gudyalchay valley and Mount Gizilgaya', 'Hear local stories about Khinalig and its distinct language'],
        description: ['Meet in Khinalig for a guided walk toward neighbouring Galakhudat. The published trail is about 8.2 km, with 370 m of ascent and a high point around 2,300 m; allow roughly three hours of walking, plus stops.', 'The route crosses open mountain terrain with views of steep cliffs, terraces, and the Gudyalchay valley. A local guide helps with route-finding and village context; conditions can change quickly at altitude.'],
        know: ['There are no restaurants along the trail; carry water and food. The official trail page recommends 1.5–2 litres of water. This is a point-to-point hike; return transport from Galakhudat must be arranged in advance.'],
        meeting: 'Meet your guide in Khinalig village. Transport from Guba to the trailhead and return from Galakhudat must be agreed separately.',
      },
      az: {
        title: 'Xınalıq–Qalaxudat dağ cığırı',
        summary: 'Qudyalçay vadisi üzərindəki Qafqaz marşrutunda yürüyüş edin; Qızılqaya qayalarına və ənənəvi kəndlərə geniş mənzərələr açılır.',
        highlights: ['Xınalıq–Qalaxudatın nişanlanmış 8,2 km cığırı ilə gedin', 'Qudyalçay vadisini və Qızılqaya dağını görün', 'Xınalıq və onun özünəməxsus dili barədə yerli hekayələri dinləyin'],
        description: ['Qalaxudata doğru bələdçili yürüş üçün Xınalıqda görüşün. Rəsmi cığır təxminən 8,2 km-dir, 370 m yüksəklik fərqi və təxminən 2300 m ən yüksək nöqtəsi var; dayanacaqlarla birlikdə təxminən üç saat piyada yol planlaşdırın.', 'Marşrut dik qayalara, terraslara və Qudyalçay vadisinə mənzərəsi olan açıq dağ ərazisindən keçir. Yerli bələdçi istiqamətdə kömək edir və kəndlər haqqında məlumat verir; yüksəklikdə hava tez dəyişə bilər.'],
        know: ['Cığır boyunca restoran yoxdur; su və yemək götürün. Rəsmi marşrut məlumatında 1,5–2 litr su tövsiyə olunur. Bu, bir istiqamətli yürüşdür; Qalaxudatdan geri nəqliyyatı əvvəlcədən razılaşdırın.'],
        meeting: 'Bələdçi ilə Xınalıq kəndində görüşün. Qubadan başlanğıca və Qalaxudatdan geri nəqliyyat ayrıca razılaşdırılmalıdır.',
      },
      ru: {
        title: 'Горный маршрут Хыналыг–Галахудат',
        summary: 'Пройдите по высокогорной тропе Большого Кавказа с видами на долину Гудиалчая, скалы Гызылгая и традиционные сёла.',
        highlights: ['Пройти по размеченной тропе Хыналыг–Галахудат длиной 8,2 км', 'Увидеть долину Гудиалчая и гору Гызылгая', 'Узнать местные истории о Хыналыге и его особом языке'],
        description: ['Встреча в Хыналыге и поход с гидом в сторону соседнего Галахудата. По опубликованным данным, маршрут составляет около 8,2 км, набор высоты — 370 м, максимальная высота — около 2300 м; с остановками выделите примерно три часа на пешую часть.', 'Тропа проходит по открытой горной местности с видами на крутые скалы, террасы и долину Гудиалчая. Местный гид поможет с ориентированием и расскажет о сёлах; погода на высоте может быстро меняться.'],
        know: ['На маршруте нет кафе и ресторанов; возьмите воду и еду. Официальное описание рекомендует 1,5–2 литра воды. Это маршрут в одну сторону; обратный транспорт из Галахудата нужно согласовать заранее.'],
        meeting: 'Встреча с гидом в селе Хыналыг. Трансфер из Губы к началу маршрута и обратный транспорт из Галахудата согласуются отдельно.',
      },
    },
  }),
  showcaseTour({
    key: 'shahdag-laza-mountain-day', location: 'Qusar', category: 'entertainment', photo: '/seed/tour-03.jpg',
    price: 72, hours: 11, pickup: true, group: 12, route: '08:00 - Baku → Shahdag Mountain Resort → Laza village',
    content: {
      en: {
        title: 'Shahdag Mountain Heights & Laza Waterfalls',
        summary: 'Spend a full day among Shahdag’s mountain scenery, with optional resort activities and a stop at the waterfalls near Laza.',
        highlights: ['Visit Shahdag Mountain Resort near Gusar', 'Choose optional cable-car, coaster, or outdoor activities', 'Walk to the waterfalls around Laza village'],
        description: ['Travel north from Baku to Shahdag Mountain Resort, set in the Greater Caucasus near Gusar. Take in the mountain landscape and choose from the resort’s activities, which may include a pedestrian cable car, coaster, zipline, or other options at extra cost.', 'Continue to Laza village for a short walk to nearby waterfalls before returning to Baku. The Tourism Board’s sample itinerary lists an approximately 11-hour round trip; the actual schedule depends on traffic, weather, and activity availability.'],
        know: ['Adventure activities are optional and usually cost extra. Paragliding depends on weather; late autumn and winter conditions may limit it. Lunch and activity tickets are not included unless confirmed.'],
        meeting: 'Pickup in Baku or meet at an agreed central point. The day ends back in Baku.',
      },
      az: {
        title: 'Şahdağın zirvələri və Laza şəlalələri',
        summary: 'Şahdağın dağ mənzərələri arasında tam gün keçirin; istəyə bağlı kurort fəaliyyətləri və Laza yaxınlığındakı şəlalələrə dayanacaq daxildir.',
        highlights: ['Qusar yaxınlığındakı Şahdağ Dağ Kurortuna baş çəkin', 'İstəyə görə kanat, roller-koster və açıq hava fəaliyyətləri seçin', 'Laza kəndi ətrafındakı şəlalələrə piyada gedin'],
        description: ['Bakıdan şimala, Qusar yaxınlığındakı Böyük Qafqaz dağlarında yerləşən Şahdağ Dağ Kurortuna yollanın. Dağ mənzərələrindən zövq alın və əlavə ödənişlə piyada kanat, roller-koster, zipline və ya digər mövcud fəaliyyətlərdən birini seçin.', 'Laza kəndinə davam edərək yaxınlıqdakı şəlalələrə qısa piyada yürüş edin, sonra Bakıya qayıdın. Turizm Şurasının nümunə marşrutu təxminən 11 saatlıq gediş-gəliş göstərir; faktiki cədvəl tıxacdan, havadan və fəaliyyətlərin əlçatanlığından asılıdır.'],
        know: ['Macəra fəaliyyətləri istəyə bağlıdır və adətən əlavə ödənişlidir. Yamac paraşütü havadan asılıdır; payızın sonu və qışda məhdudlaşa bilər. Təsdiqlənməyibsə, nahar və fəaliyyət biletləri daxil deyil.'],
        meeting: 'Bakıda transfer və ya əvvəlcədən razılaşdırılmış mərkəzi görüş. Günün sonunda Bakıya qayıdış.',
      },
      ru: {
        title: 'Горные высоты Шахдага и водопады Лазы',
        summary: 'Проведите день среди горных пейзажей Шахдага, выберите развлечения на курорте и посетите водопады у села Лаза.',
        highlights: ['Посетить горный курорт Шахдаг рядом с Гусаром', 'Выбрать канатную дорогу, аттракцион или активный отдых', 'Прогуляться к водопадам возле села Лаза'],
        description: ['Отправляйтесь из Баку на север, к курорту Шахдаг в Большом Кавказе рядом с Гусаром. Полюбуйтесь горами и выберите доступные активности — например, пешеходную канатную дорогу, coaster, zipline или другие развлечения за дополнительную плату.', 'Затем отправляйтесь в Лазу и прогуляйтесь к ближайшим водопадам, после чего возвращайтесь в Баку. В примерном маршруте Туристического совета указана поездка около 11 часов; расписание зависит от пробок, погоды и доступности развлечений.'],
        know: ['Развлечения на курорте предлагаются по желанию и обычно оплачиваются отдельно. Параплан зависит от погоды и может быть недоступен поздней осенью и зимой. Обед и билеты на активности не включены без подтверждения.'],
        meeting: 'Трансфер в Баку или встреча в согласованном месте в центре. Возвращение в Баку в конце дня.',
      },
    },
  }),
  showcaseTour({
    key: 'ganja-nizami-heritage-walk', location: 'Gəncə', category: 'history', photo: '/seed/ganja-nizami-official.jpg',
    price: 32, hours: 4, pickup: false, route: '10:00 - Ganja city centre → Shah Abbas Square → Nizami heritage sites',
    content: {
      en: {
        title: 'Ganja Old Town & Nizami Heritage Walk',
        summary: 'Explore Ganja’s historic centre, its Safavid-era landmarks, red-brick streets, and the legacy of poet Nizami Ganjavi.',
        highlights: ['Walk around Shah Abbas Square and the historic centre', 'Learn about Nizami Ganjavi at his mausoleum complex', 'See layers of Safavid, khanate, and Russian-era architecture'],
        description: ['Meet in central Ganja for a guided walk through the city’s historic core. The route introduces the Safavid-era Shah Abbas Mosque and bathhouse area, old red-brick architecture, and the changing character of the city.', 'Continue to the Nizami Ganjavi Mausoleum and museum area to learn about the 12th-century poet and his literary legacy. Museum entry is optional and subject to opening hours.'],
        know: ['The mausoleum grounds are listed as free admission by the official tourism page; museum entry has a separate fee. Confirm museum opening times locally.'],
        meeting: 'Meet your guide at an agreed landmark in central Ganja; this is a walking tour with no hotel or intercity transfer.',
      },
      az: {
        title: 'Gəncənin köhnə şəhəri və Nizami irsi',
        summary: 'Gəncənin tarixi mərkəzini, Səfəvi dövrünün abidələrini, qırmızı kərpicli küçələri və Nizami Gəncəvinin irsini kəşf edin.',
        highlights: ['Şah Abbas meydanı və tarixi mərkəzdə gəzin', 'Məqbərə kompleksində Nizami Gəncəvi haqqında öyrənin', 'Səfəvi, xanlıq və Rusiya dövrlərinin memarlıq izlərini görün'],
        description: ['Gəncənin tarixi mərkəzində bələdçili piyada marşrutu üçün görüşün. Marşrut Şah Abbas məscidi və hamamı ətrafındakı Səfəvi dövrü irsini, qırmızı kərpicli tikililəri və şəhərin dəyişən simasını təqdim edir.', 'XII əsr şairi və ədəbi irsi haqqında məlumat almaq üçün Nizami Gəncəvi məqbərəsi və muzeyi ərazisinə davam edin. Muzeyə giriş istəyə bağlıdır və iş saatlarından asılıdır.'],
        know: ['Rəsmi turizm səhifəsində məqbərə ərazisinə giriş ödənişsiz göstərilir; muzey üçün ayrıca bilet tələb olunur. Muzeyin iş saatlarını yerində dəqiqləşdirin.'],
        meeting: 'Gəncənin mərkəzində əvvəlcədən razılaşdırılmış nişanlı yerdə bələdçi ilə görüşün; bu, şəhərlərarası transfer və otel xidməti olmayan piyada turudur.',
      },
      ru: {
        title: 'Старый центр Гянджи и наследие Низами',
        summary: 'Исследуйте исторический центр Гянджи, памятники эпохи Сефевидов, улицы из красного кирпича и наследие поэта Низами Гянджеви.',
        highlights: ['Прогуляться по площади Шах Аббаса и историческому центру', 'Узнать о Низами Гянджеви у его мавзолейного комплекса', 'Увидеть архитектурные слои эпох Сефевидов, ханства и Российской империи'],
        description: ['Встреча в центре Гянджи и пешеходная экскурсия по исторической части города. Маршрут знакомит с наследием эпохи Сефевидов у мечети и бани Шах Аббаса, старой кирпичной застройкой и историей развития города.', 'Затем посетите район мавзолея и музея Низами Гянджеви, чтобы узнать о поэте XII века и его литературном наследии. Вход в музей необязателен и зависит от часов работы.'],
        know: ['По официальной туристической странице вход на территорию мавзолея бесплатный; музей оплачивается отдельно. Уточняйте время работы музея на месте.'],
        meeting: 'Встреча с гидом у согласованного ориентира в центре Гянджи; это пешеходная экскурсия без гостиничного или междугороднего трансфера.',
      },
    },
  }),
  showcaseTour({
    key: 'lankaran-tea-hirkan-nature', location: 'Lənkəran', category: 'nature', photo: '/seed/tour-13.jpg',
    price: 58, hours: 8, pickup: true, route: '09:00 - Lankaran → tea-growing countryside → Hirkan forest viewpoints',
    content: {
      en: {
        title: 'Lankaran Tea Country & Hirkan Forest Edge',
        summary: 'Discover the subtropical landscapes and tea culture of Lankaran, with a guided nature stop near the Hirkan forest.',
        highlights: ['Learn how tea is grown in Lankaran’s subtropical climate', 'See the meeting of the Caspian coast and Talysh foothills', 'Explore a forest viewpoint near Hirkan National Park'],
        description: ['Begin in Lankaran, between the Caspian Sea and the Talysh Mountains. A local host introduces the region’s tea-growing tradition, citrus-rich cuisine, and subtropical landscape before a scenic drive toward the forested south.', 'Finish with a guided nature walk at an agreed viewpoint near Hirkan National Park. The protected forest is known for ancient ironwood trees and rich biodiversity; access to trails and protected zones depends on local rules and conditions.'],
        know: ['This itinerary does not include entry to protected zones or a tea-factory tasting unless arranged in advance. Stay on permitted trails and follow park guidance.'],
        meeting: 'Meet or collect in central Lankaran; the route returns to the city.',
      },
      az: {
        title: 'Lənkəranın çay diyarı və Hirkan meşəsi',
        summary: 'Hirkan meşəsinin yaxınlığında bələdçili təbiət dayanacağı ilə Lənkəranın subtropik mənzərələrini və çay mədəniyyətini kəşf edin.',
        highlights: ['Lənkəranın subtropik iqlimində çayın yetişdirilməsi ilə tanış olun', 'Xəzər sahili ilə Talış dağətəyi ərazilərinin qovuşmasını görün', 'Hirkan Milli Parkının yaxınlığında meşə mənzərə nöqtəsinə gedin'],
        description: ['Xəzər dənizi ilə Talış dağları arasında yerləşən Lənkəranda başlayın. Yerli bələdçi cənuba, meşəlik əraziyə doğru mənzərəli yol öncəsi çayçılıq ənənəsi, sitrus meyvələri ilə zəngin mətbəx və subtropik təbiət haqqında danışır.', 'Hirkan Milli Parkı yaxınlığında razılaşdırılmış mənzərə nöqtəsində bələdçili təbiət gəzintisi ilə tamamlayın. Qorunan meşə qədim dəmirağacları və biomüxtəlifliyi ilə tanınır; cığırlara və qoruq ərazilərinə giriş yerli qayda və şəraitdən asılıdır.'],
        know: ['Əvvəlcədən razılaşdırılmayıbsa, qoruq ərazilərinə giriş və çay zavodunda dadım daxil deyil. İcazə verilən cığırlardan kənara çıxmayın və parkın göstərişlərinə əməl edin.'],
        meeting: 'Lənkəran mərkəzində görüş və ya transfer; marşrut şəhərə qayıdır.',
      },
      ru: {
        title: 'Чайные окрестности Ленкорани и лес Гиркана',
        summary: 'Познакомьтесь с субтропическими пейзажами и чайной культурой Ленкорани, а также посетите природную смотровую точку у леса Гиркан.',
        highlights: ['Узнать о выращивании чая в субтропическом климате Ленкорани', 'Увидеть, как Каспийское побережье переходит в предгорья Талыша', 'Посетить лесную обзорную точку рядом с национальным парком Гиркан'],
        description: ['Начните в Ленкорани, между Каспийским морем и Талышскими горами. Местный гид расскажет о выращивании чая, кухне с цитрусовыми и субтропической природе региона, после чего вы отправитесь по живописной дороге на юг.', 'Завершите прогулкой с гидом у согласованной обзорной точки рядом с национальным парком Гиркан. Заповедный лес известен древними железными деревьями и богатым биоразнообразием; доступ к тропам и охраняемым зонам зависит от местных правил и условий.'],
        know: ['Вход в охраняемые зоны и дегустация на чайном производстве не включены без предварительной договорённости. Не сходите с разрешённых троп и следуйте указаниям парка.'],
        meeting: 'Встреча или трансфер в центре Ленкорани; маршрут заканчивается в городе.',
      },
    },
  }),
  showcaseTour({
    key: 'shamakhi-diri-baba-heritage', location: 'Şamaxı', category: 'history', photo: '/seed/diri-baba-official.jpg',
    price: 62, hours: 9, pickup: true, route: '08:30 - Baku → Diri Baba Mausoleum → Shamakhi Juma Mosque',
    content: {
      en: {
        title: 'Diri Baba Mausoleum & Shamakhi Heritage',
        summary: 'Follow a historic route from Baku to Diri Baba’s cliffside mausoleum and Shamakhi’s landmark Juma Mosque.',
        highlights: ['See the two-storey Diri Baba Mausoleum at Maraza', 'Visit Shamakhi Juma Mosque and its historic setting', 'Pause for mountain and vineyard views along the route'],
        description: ['Leave Baku for Maraza and view the Diri Baba Mausoleum, a two-storey monument built into a steep rock face in 1402. Learn about the site’s architecture and its place on the historic route through the region.', 'Continue to Shamakhi and visit the Juma Mosque, a major landmark in one of Azerbaijan’s historic cities. Stop for landscape views on the return drive; access inside religious sites follows local visitor rules.'],
        know: ['This sample route draws on the Azerbaijan Tourism Board’s Baku–Shamakhi itinerary. Dress respectfully at religious sites; admission and meal costs are not included unless confirmed.'],
        meeting: 'Pickup in Baku or meet at the agreed central point; return to Baku in the evening.',
      },
      az: {
        title: 'Diri Baba türbəsi və Şamaxı irsi',
        summary: 'Bakından qayalıqdakı Diri Baba türbəsinə və Şamaxının məşhur Cümə məscidinə uzanan tarixi marşrutla gedin.',
        highlights: ['Mərəzədə qayaya bitişik ikimərtəbəli Diri Baba türbəsini görün', 'Şamaxı Cümə məscidini və tarixi ətrafını ziyarət edin', 'Yolboyu dağ və üzüm bağları mənzərələrində dayanın'],
        description: ['Bakından Mərəzəyə yola düşərək 1402-ci ildə dik qayalıqda tikilmiş ikimərtəbəli Diri Baba türbəsinə baxın. Abidənin memarlığı və regionun tarixi yolu üzərindəki əhəmiyyəti barədə məlumat alın.', 'Şamaxıya davam edib Azərbaycanın tarixi şəhərlərindən birinin mühüm abidəsi olan Cümə məscidini ziyarət edin. Geri dönərkən mənzərəli yerlərdə dayanın; dini məkanlara giriş yerli ziyarət qaydalarına tabedir.'],
        know: ['Bu nümunə marşrut Azərbaycan Turizm Bürosunun Bakı–Şamaxı marşrutundan hazırlanıb. Dini məkanlarda geyim qaydalarına riayət edin; ayrıca təsdiqlənməyibsə giriş və yemək xərcləri daxil deyil.'],
        meeting: 'Bakıda transfer və ya razılaşdırılmış mərkəzi görüş; axşam Bakıya qayıdış.',
      },
      ru: {
        title: 'Мавзолей Дири-Баба и наследие Шемахи',
        summary: 'Отправьтесь из Баку к скальному мавзолею Дири-Баба и знаменитой Джума-мечети в исторической Шемахе.',
        highlights: ['Увидеть двухэтажный мавзолей Дири-Баба у Маразы', 'Посетить Джума-мечеть Шемахи и её исторический район', 'Остановиться у горных пейзажей и виноградников по пути'],
        description: ['Из Баку отправляйтесь в Мараз, чтобы увидеть мавзолей Дири-Баба — двухэтажный памятник, встроенный в крутой склон скалы в 1402 году. Узнайте об архитектуре комплекса и его месте на историческом маршруте региона.', 'Продолжите путь в Шемаху и посетите Джума-мечеть — одну из главных достопримечательностей древнего города. По дороге обратно предусмотрены остановки у пейзажных точек; посещение религиозных объектов регулируется местными правилами.'],
        know: ['Маршрут составлен по материалам Туристического совета Азербайджана о поездке Баку–Шемаха. В религиозных местах соблюдайте требования к одежде; входные билеты и питание не включены без подтверждения.'],
        meeting: 'Трансфер из Баку или встреча в согласованном месте в центре; вечером возвращение в Баку.',
      },
    },
  }),
  showcaseTour({
    key: 'nakhchivan-city-monuments', location: 'Naxçıvan', category: 'history', photo: '/seed/nakhchivan-momine-khatun.jpg',
    price: 30, hours: 4, pickup: false, route: '10:00 - Nakhchivan city centre → Momine Khatun Mausoleum → historic quarter',
    content: {
      en: {
        title: 'Nakhchivan City & Momine Khatun Mausoleum',
        summary: 'Discover the medieval architecture of Nakhchivan, including the celebrated 12th-century Momine Khatun Mausoleum.',
        highlights: ['Study the mausoleum’s brickwork, turquoise tiles, and geometry', 'Learn about architect Ajemi Nakhchivani and the Nakhchivan school', 'Walk between central monuments with a local guide'],
        description: ['Meet in Nakhchivan city for a relaxed heritage walk. The centerpiece is the 12th-century Momine Khatun Mausoleum, built by architect Ajemi Nakhchivani and known for its brickwork, turquoise tiles, and geometric design.', 'Continue through the historic centre to see the city’s architectural context and hear how its monuments connect to regional history. The itinerary is designed as a city visit and does not include intercity or flight transport.'],
        know: ['The mausoleum is an active heritage site; opening, photography, and entry arrangements should be checked locally. Travel to Nakhchivan is not included in this city tour.'],
        meeting: 'Meet your guide at an agreed landmark in Nakhchivan city; finish in the central area.',
      },
      az: {
        title: 'Naxçıvan şəhəri və Möminə Xatun türbəsi',
        summary: 'XII əsrə aid məşhur Möminə Xatun türbəsi də daxil olmaqla Naxçıvanın orta əsr memarlığını kəşf edin.',
        highlights: ['Türbənin kərpic işlərini, firuzəyi kaşılarını və həndəsəsini araşdırın', 'Memar Əcəmi Naxçıvani və Naxçıvan memarlıq məktəbi haqqında öyrənin', 'Yerli bələdçi ilə mərkəzdəki abidələr arasında gəzin'],
        description: ['Naxçıvan şəhərində rahat irs gəzintisi üçün görüşün. Marşrutun əsas hissəsi memar Əcəmi Naxçıvaninin yaratdığı, kərpic quruluşu, firuzəyi kaşıları və həndəsi naxışları ilə tanınan XII əsr Möminə Xatun türbəsidir.', 'Şəhərin memarlıq mühitini görmək və abidələrin regional tarixlə əlaqəsini dinləmək üçün tarixi mərkəzdə davam edin. Bu, şəhər gəzintisidir; şəhərlərarası və ya aviadaşınma daxil deyil.'],
        know: ['Türbə qorunan irs məkanıdır; iş vaxtı, fotoqrafiya və giriş qaydalarını yerində yoxlayın. Naxçıvana səfər bu şəhər turuna daxil deyil.'],
        meeting: 'Naxçıvan şəhərində əvvəlcədən razılaşdırılmış nişanlı yerdə bələdçi ilə görüşün; tur mərkəzdə başa çatır.',
      },
      ru: {
        title: 'Город Нахчыван и мавзолей Момине-хатун',
        summary: 'Познакомьтесь со средневековой архитектурой Нахчывана, включая знаменитый мавзолей Момине-хатун XII века.',
        highlights: ['Рассмотреть кирпичную кладку, бирюзовые изразцы и геометрию мавзолея', 'Узнать об архитекторе Аджеми Нахчывани и нахчыванской школе', 'Прогуляться между центральными памятниками с местным гидом'],
        description: ['Встреча в городе Нахчыван и спокойная прогулка по историческим местам. Главная остановка — мавзолей Момине-хатун XII века, созданный архитектором Аджеми Нахчывани и известный кирпичной кладкой, бирюзовыми изразцами и геометрическим декором.', 'Продолжите путь по историческому центру, чтобы увидеть архитектурное окружение и узнать, как памятники связаны с историей региона. Это экскурсия по городу без междугороднего или авиаперелёта.'],
        know: ['Мавзолей — охраняемый объект наследия; часы работы, фотосъёмку и условия посещения уточняйте на месте. Проезд до Нахчывана не входит в городскую экскурсию.'],
        meeting: 'Встреча с гидом у согласованного ориентира в городе Нахчыван; окончание в центральной части.',
      },
    },
  }),
];
