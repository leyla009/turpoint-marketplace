import { useState } from "react";
import {
  MapPin, Search, Star, Users, Clock, ChevronRight, ChevronLeft,
  Check, Plus, Minus, Home, BookOpen, BarChart2, Calendar,
  Wifi, Wind, Package, Leaf, Landmark, Music, Utensils,
  Download, CalendarPlus, Eye, Edit2, Zap, Upload, X,
  CheckCircle, CreditCard, Ticket, TrendingDown, Globe,
  Phone, Mail, Filter, Settings,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "all" | "nature" | "history" | "entertainment" | "food";
type Page =
  | "home" | "detail" | "booking" | "confirmation" | "comparison" | "planner"
  | "op-dashboard" | "op-profile" | "op-add-tour" | "op-bookings";
type Mode = "traveler" | "operator";
type NavigateFn = (p: Page, t?: Tour) => void;

interface Tour {
  id: string;
  title: string;
  location: string;
  category: "nature" | "history" | "entertainment" | "food";
  operator: { name: string; initials: string; rating: number; reviews: number };
  soloPrice: number;
  groupPrice: number;
  minGroup: number;
  maxGroup: number;
  currentGroup: number;
  duration: string;
  image: string;
  images: string[];
  lastMinuteDeal?: boolean;
  amenities: string[];
  description: string;
  itinerary: string[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const TOURS: Tour[] = [
  {
    id: "1", title: "Goygol Lake & Forest Hike", location: "Goygol, Azerbaijan",
    category: "nature",
    operator: { name: "AzAdventure Co.", initials: "AZ", rating: 4.9, reviews: 84 },
    soloPrice: 75, groupPrice: 48, minGroup: 2, maxGroup: 6, currentGroup: 3,
    duration: "1 day",
    image: "https://images.unsplash.com/photo-1632742707012-4c69a38f8b42?w=800&h=500&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1632742707012-4c69a38f8b42?w=900&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1581545089841-9423c2ec0548?w=900&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1626948688703-0136bc0a90da?w=900&h=500&fit=crop&auto=format",
    ],
    lastMinuteDeal: true, amenities: ["wifi", "ac", "luggage"],
    description: "Discover the crystal-clear Goygol Lake, formed by a 12th-century earthquake. Wind through forested trails of rare oriental spruce and enjoy a traditional Azerbaijani lunch at a mountain teahouse overlooking the valley.",
    itinerary: [
      "07:00 — Depart from Baku (Fountains Square pickup)",
      "10:30 — Arrive Goygol National Park",
      "11:00 — Lakeside hike (3 km easy trail)",
      "13:00 — Traditional lunch at Dağ Çayı teahouse",
      "14:30 — Forest ridge trail (5 km moderate)",
      "17:00 — Return journey to Baku",
    ],
  },
  {
    id: "2", title: "Qobustan Rock Art & Mud Volcanoes", location: "Qobustan, Azerbaijan",
    category: "history",
    operator: { name: "Baku Explorer Tours", initials: "BE", rating: 4.7, reviews: 213 },
    soloPrice: 65, groupPrice: 42, minGroup: 2, maxGroup: 4, currentGroup: 2,
    duration: "1 day",
    image: "https://images.unsplash.com/photo-1445452916036-9022dfd33aa8?w=800&h=500&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1445452916036-9022dfd33aa8?w=900&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1604223190546-a43e4c7f29d7?w=900&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1498591100911-8c4880f7c580?w=900&h=500&fit=crop&auto=format",
    ],
    lastMinuteDeal: false, amenities: ["ac", "luggage"],
    description: "Step 12,000 years back in time at Qobustan's UNESCO-listed rock art site, then witness the alien landscape of Azerbaijan's famous mud volcanoes — the world's highest concentration of over 400 in one region.",
    itinerary: [
      "09:00 — Pickup from central Baku",
      "10:30 — Qobustan Rock Art State Reserve",
      "12:30 — Picnic lunch (included)",
      "14:00 — Mud volcano field exploration",
      "16:00 — Return to Baku",
    ],
  },
  {
    id: "3", title: "Sheki Palace & Silk Road Bazaar", location: "Sheki, Azerbaijan",
    category: "history",
    operator: { name: "Silk Road Journeys", initials: "SR", rating: 4.8, reviews: 156 },
    soloPrice: 140, groupPrice: 95, minGroup: 4, maxGroup: 8, currentGroup: 1,
    duration: "2 days",
    image: "https://images.unsplash.com/photo-1758549949355-5f7232b5389e?w=800&h=500&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1758549949355-5f7232b5389e?w=900&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1716458264756-e223a81eb8e1?w=900&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1784768143279-30c72ff3ae39?w=900&h=500&fit=crop&auto=format",
    ],
    lastMinuteDeal: false, amenities: ["wifi", "ac", "luggage"],
    description: "Overnight journey to Sheki, one of the most beautiful cities in the Caucasus. Visit the Khan's Palace with its extraordinary shebeke stained glass, explore the old bazaar and the historic caravanserai.",
    itinerary: [
      "Day 1 — 07:00 Baku departure via scenic Caucasus route",
      "Day 1 — 13:00 Khan's Palace tour",
      "Day 1 — 15:00 Old City walk & caravanserai",
      "Day 1 — 19:00 Traditional dinner at Şəki Sarayı",
      "Day 2 — 09:00 Local bazaar & halvah workshop",
      "Day 2 — 14:00 Return journey to Baku",
    ],
  },
  {
    id: "4", title: "Baku Street Food Safari", location: "Baku, Azerbaijan",
    category: "food",
    operator: { name: "Taste of Baku", initials: "TB", rating: 4.9, reviews: 341 },
    soloPrice: 40, groupPrice: 28, minGroup: 3, maxGroup: 8, currentGroup: 5,
    duration: "3 hours",
    image: "https://images.unsplash.com/photo-1768162126000-b6060d02f4bb?w=800&h=500&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1768162126000-b6060d02f4bb?w=900&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1763703396043-cc821fcc4bc2?w=900&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1766662538481-2f0de36fc4af?w=900&h=500&fit=crop&auto=format",
    ],
    lastMinuteDeal: true, amenities: ["wifi"],
    description: "Walk the winding lanes of Icherisheher with a local food writer. Stop at hole-in-the-wall spots for qutab, pakhlava, şəkərbura, and çay. An evening of flavors you won't find in any guidebook.",
    itinerary: [
      "18:00 — Meet at Fountain Square (Nizami St. side)",
      "18:15 — Qutab stop at Natasha's kitchen",
      "18:45 — Old City lane walk",
      "19:15 — Pakhlava & tea tasting at Şirvan sweets",
      "20:00 — Traditional plov dinner",
      "21:00 — Tour ends at Nizami Street",
    ],
  },
  {
    id: "5", title: "Old City & Flame Towers Sunset", location: "Baku, Azerbaijan",
    category: "history",
    operator: { name: "Baku Explorer Tours", initials: "BE", rating: 4.7, reviews: 213 },
    soloPrice: 38, groupPrice: 25, minGroup: 2, maxGroup: 10, currentGroup: 4,
    duration: "3 hours",
    image: "https://images.unsplash.com/photo-1716458264756-e223a81eb8e1?w=800&h=500&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1716458264756-e223a81eb8e1?w=900&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1685470934582-3636319a3be9?w=900&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1765034841805-8330b54bfdb7?w=900&h=500&fit=crop&auto=format",
    ],
    lastMinuteDeal: false, amenities: ["wifi"],
    description: "Explore the UNESCO-listed Icherisheher (Old City), the medieval Maiden Tower, and Shirvanshah's Palace, ending with golden-hour views of the iconic Flame Towers reflecting on the Caspian sea.",
    itinerary: [
      "10:00 — Maiden Tower (exterior + views)",
      "11:00 — Old City lanes & carpet shops",
      "12:00 — Shirvanshah's Palace complex",
      "13:00 — Flame Towers viewpoint (Upland Park)",
      "13:30 — Tour ends",
    ],
  },
  {
    id: "6", title: "Lahij Copper Village Trek", location: "Lahij, Azerbaijan",
    category: "nature",
    operator: { name: "AzAdventure Co.", initials: "AZ", rating: 4.9, reviews: 84 },
    soloPrice: 70, groupPrice: 50, minGroup: 2, maxGroup: 6, currentGroup: 2,
    duration: "1 day",
    image: "https://images.unsplash.com/photo-1581545089841-9423c2ec0548?w=800&h=500&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1581545089841-9423c2ec0548?w=900&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1612211894605-52469ab1e7a8?w=900&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1626948688703-0136bc0a90da?w=900&h=500&fit=crop&auto=format",
    ],
    lastMinuteDeal: false, amenities: ["ac", "luggage"],
    description: "Visit Lahij, a medieval village perched in the Caucasus mountains, famous for copper craftsmanship. Shop directly from master coppersmiths, then hike the scenic Girdimancay river gorge.",
    itinerary: [
      "08:00 — Baku departure",
      "11:00 — Arrive Lahij village",
      "11:30 — Coppersmith workshop visits",
      "13:00 — Local lunch at village house",
      "14:30 — Girdimancay river gorge hike (3 km)",
      "16:30 — Return journey to Baku",
    ],
  },
];

const SAMPLE_REVIEWS = [
  { name: "Leyla M.", rating: 5, date: "Oct 2025", text: "Absolutely breathtaking. Our guide was knowledgeable and the group size was perfect. The lake views at sunrise were worth every manat." },
  { name: "James K.", rating: 5, date: "Sep 2025", text: "Joined a group of strangers and left as friends. Group pricing saved us each ₼27 vs booking solo. Brilliant concept." },
  { name: "Aynur Q.", rating: 4, date: "Aug 2025", text: "Well-organized with a punctual driver and excellent lunch stop. Slightly rushed at the end, but overall a top experience." },
];

const OPERATOR_BOOKINGS_DATA = [
  { name: "Leyla Mammadova", seats: 2, payment: "paid" },
  { name: "James Karimov", seats: 1, payment: "paid" },
  { name: "Aynur Quliyeva", seats: 1, payment: "pending" },
  { name: "Murad Hasanov", seats: 1, payment: "paid" },
  { name: "Elnara Rzayeva", seats: 2, payment: "paid" },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; Icon: React.ElementType }> = {
  all: { label: "All", Icon: Filter },
  nature: { label: "Nature", Icon: Leaf },
  history: { label: "History", Icon: Landmark },
  entertainment: { label: "Entertainment", Icon: Music },
  food: { label: "Food", Icon: Utensils },
};

const AMENITY_CONFIG: Record<string, { label: string; Icon: React.ElementType }> = {
  wifi: { label: "WiFi", Icon: Wifi },
  ac: { label: "A/C", Icon: Wind },
  luggage: { label: "Luggage", Icon: Package },
};

const TOUR_STATUSES = ["active", "forming", "active", "active", "forming", "draft"];

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  forming: "bg-amber-100 text-amber-800",
  draft: "bg-muted text-muted-foreground",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGroupPrice(tour: Tour, groupSize: number): number {
  if (groupSize <= 1) return tour.soloPrice;
  const ratio = Math.min((groupSize - 1) / (tour.maxGroup - 1), 1);
  return Math.round(tour.soloPrice - (tour.soloPrice - tour.groupPrice) * ratio);
}

// ─── Reusable Components ──────────────────────────────────────────────────────

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground opacity-30"}
        />
      ))}
    </span>
  );
}

function TourCard({ tour, onClick, compact = false }: { tour: Tour; onClick: () => void; compact?: boolean }) {
  const currentPrice = getGroupPrice(tour, tour.currentGroup + 1);
  return (
    <div
      onClick={onClick}
      className="bg-card rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
    >
      <div className={`relative overflow-hidden bg-muted ${compact ? "h-36" : "h-48"}`}>
        <img
          src={tour.image}
          alt={tour.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {tour.lastMinuteDeal && (
          <span className="absolute top-2 left-2 flex items-center gap-1 bg-accent text-accent-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <Zap size={9} /> Last-minute deal
          </span>
        )}
        <span className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/55 text-white text-[10px] px-2 py-0.5 rounded-full">
          <Clock size={9} /> {tour.duration}
        </span>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-semibold text-foreground leading-snug mb-1">{tour.title}</h3>
        <p className="flex items-center gap-1 text-xs text-muted-foreground mb-2.5">
          <MapPin size={11} /> {tour.location}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
              {tour.operator.initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{tour.operator.name}</p>
              <div className="flex items-center gap-0.5">
                <Stars rating={tour.operator.rating} size={10} />
                <span className="text-[10px] text-muted-foreground">({tour.operator.reviews})</span>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground line-through">₼{tour.soloPrice}</p>
            <p className="text-sm font-bold text-primary">
              ₼{currentPrice}<span className="text-[10px] font-normal text-muted-foreground">/pp</span>
            </p>
          </div>
        </div>
        {!compact && (
          <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Users size={11} className="shrink-0" />
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/50 rounded-full"
                style={{ width: `${(tour.currentGroup / tour.maxGroup) * 100}%` }}
              />
            </div>
            <span>{tour.currentGroup}/{tour.maxGroup} joined</span>
          </div>
        )}
      </div>
    </div>
  );
}

function QRCodePlaceholder() {
  const rows = [
    "1111111001010",
    "1000001010101",
    "1011101001001",
    "1011101010110",
    "1011101001010",
    "1000001011010",
    "1111111010101",
    "0000000101010",
    "1010101111001",
    "0101010000101",
    "1001011010110",
    "0101000101001",
    "1010110111111",
  ];
  const cells = rows.join("").split("");
  return (
    <div className="w-28 h-28 bg-white p-1.5 border border-muted rounded-xl">
      <div className="grid h-full" style={{ gridTemplateColumns: "repeat(13, 1fr)", gap: 1.5 }}>
        {cells.map((bit, i) => (
          <div key={i} className={`rounded-[1px] ${bit === "1" ? "bg-foreground" : "bg-white"}`} />
        ))}
      </div>
    </div>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────

function HomeScreen({
  tours,
  navigate,
  activeCategory,
  setActiveCategory,
  searchQuery,
  setSearchQuery,
}: {
  tours: Tour[];
  navigate: NavigateFn;
  activeCategory: Category;
  setActiveCategory: (c: Category) => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
}) {
  const filtered = tours.filter((t) => {
    const matchCat = activeCategory === "all" || t.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchQ = q === "" || t.title.toLowerCase().includes(q) || t.location.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const categories: Category[] = ["all", "nature", "history", "entertainment", "food"];

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-primary px-4 pt-6 pb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-white opacity-[0.04] rounded-full translate-x-20 -translate-y-20" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-white opacity-[0.04] rounded-full -translate-x-12 translate-y-12" />
        <div className="relative">
          <p className="text-primary-foreground/60 text-sm mb-1">Good morning, Nigar ☀️</p>
          <h1
            className="text-2xl font-bold text-primary-foreground mb-4"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Where to next?
          </h1>
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 shadow-sm">
            <Search size={15} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tours or destinations..."
              className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-3 py-1.5 text-primary-foreground/80 text-xs">
              <Calendar size={11} />
              Sep 15 – Sep 20, 2025
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-3">
        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {categories.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const Icon = cfg.Icon;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-foreground border-border hover:border-primary/30"
                }`}
              >
                <Icon size={12} />
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div className="mt-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">
              {filtered.length} tour{filtered.length !== 1 ? "s" : ""} available
            </h2>
            <button
              onClick={() => navigate("comparison")}
              className="text-xs text-accent font-semibold hover:underline"
            >
              Compare tours →
            </button>
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <Search size={30} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No tours match your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map((tour) => (
                <TourCard key={tour.id} tour={tour} onClick={() => navigate("detail", tour)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TourDetailScreen ─────────────────────────────────────────────────────────

function TourDetailScreen({ tour, navigate }: { tour: Tour; navigate: NavigateFn }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [seats, setSeats] = useState(1);

  const effectiveGroup = tour.currentGroup + seats;
  const pricePerPerson = getGroupPrice(tour, effectiveGroup);
  const discount = Math.round(((tour.soloPrice - pricePerPerson) / tour.soloPrice) * 100);
  const subtotal = pricePerPerson * seats;
  const maxSeats = Math.max(1, tour.maxGroup - tour.currentGroup);

  const nextImg = () => setImgIdx((i) => (i + 1) % tour.images.length);
  const prevImg = () => setImgIdx((i) => (i - 1 + tour.images.length) % tour.images.length);

  return (
    <div className="min-h-full pb-28 md:pb-20">
      {/* Hero carousel */}
      <div className="relative h-72 bg-muted overflow-hidden">
        <img
          src={tour.images[imgIdx]}
          alt={tour.title}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        <button
          onClick={() => navigate("home")}
          className="absolute top-4 left-4 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 backdrop-blur-sm transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <button onClick={prevImg} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 backdrop-blur-sm transition-colors">
          <ChevronLeft size={14} />
        </button>
        <button onClick={nextImg} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 backdrop-blur-sm transition-colors">
          <ChevronRight size={14} />
        </button>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {tour.images.map((_, i) => (
            <button
              key={i}
              onClick={() => setImgIdx(i)}
              className={`h-1.5 rounded-full transition-all ${i === imgIdx ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
            />
          ))}
        </div>
        {tour.lastMinuteDeal && (
          <span className="absolute top-4 right-4 flex items-center gap-1 bg-accent text-accent-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <Zap size={9} /> Last-minute deal
          </span>
        )}
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Title */}
        <div>
          <h1
            className="text-xl font-bold text-foreground leading-tight mb-1.5"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {tour.title}
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin size={13} />{tour.location}</span>
            <span className="flex items-center gap-1"><Clock size={13} />{tour.duration}</span>
          </div>
        </div>

        {/* Operator */}
        <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
            {tour.operator.initials}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{tour.operator.name}</p>
            <div className="flex items-center gap-1.5">
              <Stars rating={tour.operator.rating} size={12} />
              <span className="text-xs text-muted-foreground">{tour.operator.rating} · {tour.operator.reviews} reviews</span>
            </div>
          </div>
          <div className="flex gap-1.5">
            {tour.amenities.map((a) => {
              const cfg = AMENITY_CONFIG[a];
              if (!cfg) return null;
              const Icon = cfg.Icon;
              return (
                <span key={a} title={cfg.label} className="p-1.5 bg-card rounded-lg border border-border text-muted-foreground">
                  <Icon size={13} />
                </span>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <section>
          <h2 className="text-base font-semibold mb-1.5">About this tour</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{tour.description}</p>
        </section>

        {/* Itinerary */}
        <section>
          <h2 className="text-base font-semibold mb-2">Itinerary</h2>
          <div>
            {tour.itinerary.map((step, i) => (
              <div key={i} className="flex gap-3 pb-3 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                    {i + 1}
                  </div>
                  {i < tour.itinerary.length - 1 && <div className="flex-1 w-px bg-border mt-1" />}
                </div>
                <p className="text-sm text-foreground pt-0.5 pb-1">{step}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ GROUP PRICING CARD — key differentiator ═══ */}
        <section>
          <div className="bg-primary rounded-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-4">
              <div className="flex items-center gap-2 mb-4">
                <Users size={16} className="text-primary-foreground/70" />
                <h2 className="text-base font-bold text-primary-foreground">Join a Group · Save Together</h2>
              </div>

              {/* Participant circles */}
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex -space-x-2">
                  {Array.from({ length: Math.min(tour.maxGroup, 7) }).map((_, i) => {
                    const joined = i < tour.currentGroup;
                    const initials = ["L", "J", "A", "M", "E", "R", "S"][i] ?? "?";
                    return (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center text-xs font-bold transition-all ${
                          joined ? "bg-accent text-accent-foreground" : "bg-white/15 text-white/40"
                        }`}
                      >
                        {joined ? initials : "+"}
                      </div>
                    );
                  })}
                </div>
                <span className="text-primary-foreground/60 text-xs">
                  {tour.currentGroup} of {tour.maxGroup} joined
                </span>
              </div>

              <div className="h-1.5 bg-white/15 rounded-full mb-4 overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${(tour.currentGroup / tour.maxGroup) * 100}%` }}
                />
              </div>

              {/* Price display */}
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-primary-foreground/50 text-xs mb-0.5">Price per person</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-primary-foreground/40 text-sm line-through">₼{tour.soloPrice}</span>
                    <span className="text-3xl font-bold text-primary-foreground">₼{pricePerPerson}</span>
                  </div>
                  <p className="text-primary-foreground/50 text-[10px] mt-0.5">
                    Drops to ₼{tour.groupPrice} at full group
                  </p>
                </div>
                {discount > 0 && (
                  <span className="flex items-center gap-1 bg-accent text-accent-foreground text-xs font-bold px-2.5 py-1.5 rounded-xl">
                    <TrendingDown size={12} />
                    {discount}% off
                  </span>
                )}
              </div>

              {/* Seats stepper */}
              <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3 mb-1">
                <div>
                  <p className="text-primary-foreground/70 text-xs font-medium">Your seats</p>
                  <p className="text-primary-foreground/50 text-xs">Subtotal: ₼{subtotal}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSeats((s) => Math.max(1, s - 1))}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-white font-bold text-lg w-5 text-center">{seats}</span>
                  <button
                    onClick={() => setSeats((s) => Math.min(maxSeats, s + 1))}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("booking", tour)}
              className="w-full py-4 bg-accent hover:bg-accent/90 text-accent-foreground font-bold flex items-center justify-center gap-2 transition-colors text-sm"
            >
              Book Now — Join This Group
              <ChevronRight size={16} />
            </button>
          </div>
        </section>

        {/* Reviews */}
        <section className="pb-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Reviews</h2>
            <div className="flex items-center gap-1.5">
              <Stars rating={tour.operator.rating} size={13} />
              <span className="text-sm font-semibold">{tour.operator.rating}</span>
              <span className="text-xs text-muted-foreground">({tour.operator.reviews})</span>
            </div>
          </div>
          <div className="mb-4 space-y-1.5">
            {[5, 4, 3, 2, 1].map((s) => {
              const pct = [68, 22, 7, 2, 1][5 - s];
              return (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-muted-foreground text-right">{s}</span>
                  <Star size={10} className="fill-amber-400 text-amber-400 shrink-0" />
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-right text-muted-foreground">{pct}%</span>
                </div>
              );
            })}
          </div>
          <div className="space-y-3">
            {SAMPLE_REVIEWS.map((r, i) => (
              <div key={i} className="bg-secondary rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      {r.name[0]}
                    </div>
                    <p className="text-sm font-semibold">{r.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Stars rating={r.rating} size={10} />
                    <span className="text-[10px] text-muted-foreground">{r.date}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-20 md:bottom-0 left-0 right-0 md:left-56 bg-card/95 backdrop-blur-sm border-t border-border px-4 py-3 flex items-center gap-3 z-40">
        <div>
          <p className="text-[10px] text-muted-foreground">from</p>
          <p className="text-lg font-bold text-primary">
            ₼{pricePerPerson}<span className="text-xs font-normal text-muted-foreground">/pp</span>
          </p>
        </div>
        <button
          onClick={() => navigate("booking", tour)}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          Book Now <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── BookingScreen ────────────────────────────────────────────────────────────

function BookingScreen({ tour, navigate }: { tour: Tour; navigate: NavigateFn }) {
  const [step, setStep] = useState(1);
  const [seats, setSeats] = useState(1);
  const [card, setCard] = useState({ name: "", number: "", expiry: "", cvv: "" });

  const pricePerPerson = getGroupPrice(tour, tour.currentGroup + seats);
  const originalTotal = tour.soloPrice * seats;
  const total = pricePerPerson * seats;
  const discount = originalTotal - total;
  const maxSeats = Math.max(1, tour.maxGroup - tour.currentGroup);

  const STEPS = ["Select Seats", "Payment", "Confirmation"];

  return (
    <div className="min-h-full pb-6">
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => (step > 1 ? setStep((s) => s - 1) : navigate("detail", tour))}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <p className="text-sm font-bold">{tour.title}</p>
          <p className="text-xs text-muted-foreground">Step {step} of 3 — {STEPS[step - 1]}</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="px-4 py-5">
        <div className="flex items-center">
          {STEPS.map((label, i) => {
            const n = i + 1;
            return (
              <div key={i} className={`flex items-center ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                      n < step ? "bg-primary text-primary-foreground" :
                      n === step ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                      "bg-muted text-muted-foreground"
                    }`}
                  >
                    {n < step ? <Check size={13} /> : n}
                  </div>
                  <p className={`text-[10px] font-medium whitespace-nowrap ${n === step ? "text-foreground" : "text-muted-foreground"}`}>
                    {label}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 mb-5 transition-colors ${n < step ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4">
        {/* ── Step 1: Seats ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex gap-3 bg-secondary rounded-xl p-3">
              <img src={tour.image} alt={tour.title} className="w-20 h-16 object-cover rounded-lg shrink-0 bg-muted" />
              <div>
                <p className="text-sm font-semibold">{tour.title}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin size={11} />{tour.location}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Calendar size={11} />Sep 15, 2025</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Number of seats</p>
                  <p className="text-xs text-muted-foreground">{tour.currentGroup} others already joined</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSeats((s) => Math.max(1, s - 1))}
                    className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-bold text-xl w-6 text-center">{seats}</span>
                  <button
                    onClick={() => setSeats((s) => Math.min(maxSeats, s + 1))}
                    className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-semibold mb-1">Price summary</h3>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>₼{tour.soloPrice} × {seats} seat{seats > 1 ? "s" : ""} (solo rate)</span>
                <span>₼{originalTotal}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-700 font-medium">
                  <span className="flex items-center gap-1"><TrendingDown size={13} />Group discount</span>
                  <span>−₼{discount}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary">₼{total}</span>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              Continue to Payment <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── Step 2: Payment ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-xs">
              <CreditCard size={14} className="shrink-0" />
              <span><strong>Demo mode</strong> — no real payment will be processed.</span>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold block mb-1.5">Cardholder name</label>
                <input
                  type="text"
                  value={card.name}
                  onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))}
                  placeholder="Nigar Huseynova"
                  className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-input-background outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5">Card number</label>
                <input
                  type="text"
                  value={card.number}
                  onChange={(e) => setCard((c) => ({ ...c, number: e.target.value }))}
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                  className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-input-background outline-none focus:border-primary font-mono transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1.5">Expiry</label>
                  <input
                    type="text"
                    value={card.expiry}
                    onChange={(e) => setCard((c) => ({ ...c, expiry: e.target.value }))}
                    placeholder="MM / YY"
                    className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-input-background outline-none focus:border-primary font-mono transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5">CVV</label>
                  <input
                    type="text"
                    value={card.cvv}
                    onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value }))}
                    placeholder="•••"
                    maxLength={4}
                    className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-input-background outline-none focus:border-primary font-mono transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-primary/10 rounded-xl px-4 py-3">
              <span className="text-sm font-semibold">Total to pay</span>
              <span className="text-xl font-bold text-primary">₼{total}</span>
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              Pay ₼{total} — Confirm Booking <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── Step 3: Confirmation ── */}
        {step === 3 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-emerald-600" />
            </div>
            <h2
              className="text-xl font-bold mb-1"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Booking Confirmed!
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              You're joining {tour.currentGroup} others on this tour.
            </p>
            <div className="bg-secondary rounded-xl p-4 text-left mb-6 space-y-2.5">
              {[
                { label: "Tour", value: tour.title },
                { label: "Date", value: "Sep 15, 2025 · 07:00" },
                { label: "Operator", value: tour.operator.name },
                { label: "Seats", value: `${seats} person${seats > 1 ? "s" : ""}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2.5 flex justify-between">
                <span className="text-sm font-semibold">Total paid</span>
                <span className="text-base font-bold text-primary">₼{total}</span>
              </div>
            </div>
            <button
              onClick={() => navigate("confirmation", tour)}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              View E-Ticket <Ticket size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ConfirmationScreen ───────────────────────────────────────────────────────

function ConfirmationScreen({ tour, navigate }: { tour: Tour; navigate: NavigateFn }) {
  const price = getGroupPrice(tour, tour.currentGroup + 1);

  return (
    <div className="min-h-full p-4 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("home")} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-bold">My E-Ticket</h1>
      </div>

      {/* Ticket card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg mb-5">
        {/* Header stripe */}
        <div className="bg-primary px-4 py-3.5 flex items-center justify-between">
          <div>
            <p
              className="text-primary-foreground/50 text-xs tracking-widest font-semibold"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              VOYAJ
            </p>
            <p className="text-primary-foreground font-bold text-sm mt-0.5">{tour.title}</p>
          </div>
          <Ticket size={22} className="text-primary-foreground/40" />
        </div>

        {/* Torn edge */}
        <div className="relative bg-primary h-4">
          <svg viewBox="0 0 400 16" className="w-full h-full text-card fill-current" preserveAspectRatio="none">
            <path d="M0,0 C25,16 35,16 60,0 C85,16 95,16 120,0 C145,16 155,16 180,0 C205,16 215,16 240,0 C265,16 275,16 300,0 C325,16 335,16 360,0 C385,16 395,16 400,0 L400,16 L0,16 Z" />
          </svg>
        </div>

        <div className="px-4 py-4">
          <div className="flex gap-4">
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Operator</p>
                <p className="text-sm font-semibold">{tour.operator.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Date & Time</p>
                <p className="text-sm font-semibold">Sep 15, 2025 · 07:00</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pickup</p>
                <p className="text-sm font-semibold">Fountains Square, Baku</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Seats</p>
                <p className="text-sm font-semibold">1 person</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total paid</p>
                <p className="text-lg font-bold text-primary">₼{price}</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2.5">
              <QRCodePlaceholder />
              <p className="text-[9px] text-muted-foreground font-mono tracking-wide">
                VYJ-{tour.id}839-AZ25
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-dashed border-border mx-4" />
        <div className="px-4 py-3 bg-secondary/40 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Ticket code</p>
          <p className="text-xs font-mono font-bold">VOYAJ-{tour.id.padStart(4, "0")}-AZ25</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Add to Calendar", Icon: CalendarPlus },
          { label: "Download", Icon: Download },
          { label: "View Booking", Icon: Eye },
        ].map(({ label, Icon }) => (
          <button
            key={label}
            className="flex flex-col items-center gap-1.5 p-3 bg-card border border-border rounded-xl hover:bg-secondary transition-colors"
          >
            <Icon size={18} className="text-primary" />
            <span className="text-[10px] font-medium text-center leading-snug">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── ComparisonScreen ─────────────────────────────────────────────────────────

function ComparisonScreen({ allTours, navigate }: { allTours: Tour[]; navigate: NavigateFn }) {
  const [selectedIds, setSelectedIds] = useState<string[]>(["1", "2", "3"]);

  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : prev.length < 3 ? [...prev, id] : [...prev.slice(1), id]
    );

  const compared = allTours.filter((t) => selectedIds.includes(t.id));
  const AMENITIES = ["wifi", "ac", "luggage"];

  return (
    <div className="min-h-full p-4 pb-8">
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => navigate("home")} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft size={20} />
        </button>
        <h1
          className="text-xl font-bold"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Compare Tours
        </h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4 ml-9">Select up to 3 tours to compare side-by-side.</p>

      <div className="flex flex-wrap gap-2 mb-5">
        {allTours.map((t) => (
          <button
            key={t.id}
            onClick={() => toggle(t.id)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
              selectedIds.includes(t.id)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-foreground hover:border-primary/40"
            }`}
          >
            {t.title.length > 22 ? t.title.slice(0, 22) + "…" : t.title}
          </button>
        ))}
      </div>

      {compared.length > 0 && (
        <div
          className="grid gap-3 overflow-x-auto pb-2"
          style={{ gridTemplateColumns: `repeat(${compared.length}, minmax(160px, 1fr))` }}
        >
          {compared.map((tour) => {
            const price = getGroupPrice(tour, tour.currentGroup + 1);
            return (
              <div key={tour.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="h-32 bg-muted overflow-hidden">
                  <img src={tour.image} alt={tour.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-3 space-y-3">
                  <p className="text-xs font-bold leading-snug">{tour.title}</p>

                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Price/person</p>
                    <p className="text-base font-bold text-primary">₼{price}</p>
                    <p className="text-[10px] text-muted-foreground line-through">₼{tour.soloPrice} solo</p>
                  </div>

                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Rating</p>
                    <div className="flex items-center gap-1">
                      <Stars rating={tour.operator.rating} size={10} />
                      <span className="text-xs font-semibold">{tour.operator.rating}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Duration</p>
                    <p className="text-xs font-medium">{tour.duration}</p>
                  </div>

                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Group size</p>
                    <p className="text-xs font-medium">{tour.minGroup}–{tour.maxGroup} people</p>
                  </div>

                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Amenities</p>
                    <div className="flex gap-1.5">
                      {AMENITIES.map((a) => {
                        const cfg = AMENITY_CONFIG[a];
                        const Icon = cfg.Icon;
                        const has = tour.amenities.includes(a);
                        return (
                          <span
                            key={a}
                            title={cfg.label}
                            className={`p-1 rounded ${has ? "text-primary" : "text-muted-foreground opacity-20"}`}
                          >
                            <Icon size={13} />
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => navigate("detail", tour)}
                    className="w-full py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Select
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── PlannerScreen ────────────────────────────────────────────────────────────

function PlannerScreen({ allTours, navigate }: { allTours: Tour[]; navigate: NavigateFn }) {
  const [budget, setBudget] = useState(250);
  const [days, setDays] = useState(3);
  const [interests, setInterests] = useState<Set<string>>(new Set(["nature", "history"]));
  const [plan, setPlan] = useState<Array<{ tour: Tour; reason: string }> | null>(null);

  const toggleInterest = (cat: string) =>
    setInterests((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });

  const generatePlan = () => {
    const cats = Array.from(interests);
    const eligible = allTours
      .filter((t) => cats.includes(t.category))
      .sort((a, b) => getGroupPrice(a, a.currentGroup + 1) - getGroupPrice(b, b.currentGroup + 1));

    const result: Array<{ tour: Tour; reason: string }> = [];
    let remaining = budget;

    for (const tour of eligible) {
      if (result.length >= days) break;
      const price = getGroupPrice(tour, tour.currentGroup + 1);
      if (price <= remaining) {
        result.push({ tour, reason: `Matches your ${tour.category} interest` });
        remaining -= price;
      }
    }

    if (result.length < days) {
      for (const tour of allTours) {
        if (result.length >= days) break;
        if (result.some((r) => r.tour.id === tour.id)) continue;
        const price = getGroupPrice(tour, tour.currentGroup + 1);
        if (price <= remaining) {
          result.push({ tour, reason: "Best value within budget" });
          remaining -= price;
        }
      }
    }

    setPlan(result);
  };

  const planTotal = plan
    ? plan.reduce((sum, { tour }) => sum + getGroupPrice(tour, tour.currentGroup + 1), 0)
    : 0;

  const cats: Array<Exclude<Category, "all">> = ["nature", "history", "entertainment", "food"];

  return (
    <div className="min-h-full p-4 pb-8">
      <h1
        className="text-xl font-bold mb-0.5"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        Smart Trip Planner
      </h1>
      <p className="text-sm text-muted-foreground mb-5">Tell us your budget and interests — we'll build your ideal itinerary.</p>

      <div className="bg-card border border-border rounded-2xl p-4 mb-4 space-y-5">
        {/* Budget */}
        <div>
          <label className="text-sm font-semibold block mb-2">Budget (₼)</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setBudget((b) => Math.max(50, b - 50))}
              className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors shrink-0"
            >
              <Minus size={14} />
            </button>
            <div className="flex-1 text-center text-3xl font-bold text-primary">₼{budget}</div>
            <button
              onClick={() => setBudget((b) => Math.min(2000, b + 50))}
              className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors shrink-0"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Days */}
        <div>
          <label className="text-sm font-semibold block mb-2">Number of days</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDays((d) => Math.max(1, d - 1))}
              className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors shrink-0"
            >
              <Minus size={14} />
            </button>
            <div className="flex-1 text-center">
              <span className="text-3xl font-bold text-primary">{days}</span>
              <span className="text-muted-foreground text-sm ml-1">day{days > 1 ? "s" : ""}</span>
            </div>
            <button
              onClick={() => setDays((d) => Math.min(7, d + 1))}
              className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors shrink-0"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Interests */}
        <div>
          <label className="text-sm font-semibold block mb-2">Interests</label>
          <div className="grid grid-cols-2 gap-2">
            {cats.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const Icon = cfg.Icon;
              const active = interests.has(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleInterest(cat)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-foreground hover:border-primary/30"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      active ? "bg-primary-foreground border-primary-foreground" : "border-muted-foreground/40"
                    }`}
                  >
                    {active && <Check size={11} className="text-primary" />}
                  </div>
                  <Icon size={14} />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button
        onClick={generatePlan}
        disabled={interests.size === 0}
        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-bold py-3 rounded-xl mb-6 transition-colors"
      >
        Generate My Plan
      </button>

      {plan && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold">Your {plan.length}-day itinerary</h2>
            <span className="text-sm text-muted-foreground">₼{planTotal} / ₼{budget}</span>
          </div>
          <div className="h-2 bg-muted rounded-full mb-5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${planTotal > budget ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${Math.min((planTotal / budget) * 100, 100)}%` }}
            />
          </div>

          {plan.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No tours fit your criteria. Try raising your budget or adding more interests.
            </p>
          ) : (
            <div className="space-y-3">
              {plan.map(({ tour, reason }, i) => {
                const price = getGroupPrice(tour, tour.currentGroup + 1);
                return (
                  <div key={tour.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="flex items-start gap-3 p-3">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <img
                        src={tour.image}
                        alt={tour.title}
                        className="w-16 h-14 object-cover rounded-lg shrink-0 bg-muted"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold leading-snug truncate">{tour.title}</p>
                        <p className="text-[10px] text-muted-foreground mb-1">{tour.location} · {tour.duration}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-primary">₼{price}</span>
                          <button
                            onClick={() => navigate("detail", tour)}
                            className="text-[10px] text-accent underline font-medium"
                          >
                            View tour →
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="bg-secondary/50 px-3 py-1.5 flex items-center gap-1.5 border-t border-border">
                      <Check size={10} className="text-primary shrink-0" />
                      <span className="text-[10px] text-muted-foreground">{reason}</span>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between bg-primary text-primary-foreground rounded-xl px-4 py-3 mt-2">
                <span className="text-sm font-semibold">Total trip cost</span>
                <span className="text-lg font-bold">₼{planTotal}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── OperatorDashboard ────────────────────────────────────────────────────────

function OperatorDashboard({ tours, navigate }: { tours: Tour[]; navigate: NavigateFn }) {
  const stats = [
    { label: "Total Tours", value: String(tours.length), Icon: Ticket, colorClass: "text-primary" },
    { label: "Upcoming Bookings", value: "12", Icon: Calendar, colorClass: "text-amber-600" },
    { label: "Avg Rating", value: "4.8 ★", Icon: Star, colorClass: "text-amber-500" },
    { label: "This Month", value: "₼3,240", Icon: TrendingDown, colorClass: "text-emerald-600" },
  ];

  return (
    <div className="min-h-full p-4 pb-8">
      <h1
        className="text-xl font-bold mb-0.5"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        Dashboard
      </h1>
      <p className="text-sm text-muted-foreground mb-5">Welcome back, Nigar. Here's your overview.</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map(({ label, value, Icon, colorClass }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon size={13} className={colorClass} />
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">My Tours</h2>
          <button
            onClick={() => navigate("op-add-tour")}
            className="flex items-center gap-1 text-xs text-accent font-semibold hover:underline"
          >
            <Plus size={12} /> Add Tour
          </button>
        </div>

        <div className="divide-y divide-border">
          {tours.map((tour, i) => {
            const status = TOUR_STATUSES[i] || "active";
            const price = getGroupPrice(tour, tour.currentGroup + 1);
            return (
              <div key={tour.id} className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-3">
                  <img
                    src={tour.image}
                    alt={tour.title}
                    className="w-10 h-10 rounded-lg object-cover bg-muted shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{tour.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {tour.currentGroup}/{tour.maxGroup} joined · ₼{price}/pp
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 capitalize ${STATUS_STYLE[status]}`}>
                    {status}
                  </span>
                </div>
                <div className="flex items-center gap-2 pl-[52px]">
                  <button
                    onClick={() => navigate("op-add-tour")}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <Edit2 size={9} /> Edit
                  </button>
                  <button
                    onClick={() => navigate("op-bookings", tour)}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <Eye size={9} /> Bookings
                  </button>
                  <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors">
                    <Zap size={9} /> Last-minute Deal
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── OperatorAddTour ──────────────────────────────────────────────────────────

function OperatorAddTour({ navigate }: { navigate: NavigateFn }) {
  const [form, setForm] = useState({
    title: "", category: "nature", location: "", description: "",
    itinerary: "", price: "", date: "", duration: "", minGroup: 2, maxGroup: 8,
  });

  const update = (field: string, val: string | number) =>
    setForm((f) => ({ ...f, [field]: val }));

  return (
    <div className="min-h-full p-4 pb-10">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate("op-dashboard")} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-bold">New Tour</h1>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold block mb-1.5">Tour title</label>
          <input
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. Goygol Lake Morning Hike"
            className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-input-background outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold block mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-input-background outline-none focus:border-primary transition-colors"
            >
              <option value="nature">Nature</option>
              <option value="history">History</option>
              <option value="entertainment">Entertainment</option>
              <option value="food">Food</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5">Duration</label>
            <input
              value={form.duration}
              onChange={(e) => update("duration", e.target.value)}
              placeholder="e.g. 1 day"
              className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-input-background outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5">Location</label>
          <div className="relative">
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="e.g. Goygol, Azerbaijan"
              className="w-full text-sm border border-border rounded-xl pl-8 pr-3 py-2.5 bg-input-background outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Describe the tour experience..."
            rows={3}
            className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-input-background outline-none focus:border-primary resize-none transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5">Route / Itinerary</label>
          <textarea
            value={form.itinerary}
            onChange={(e) => update("itinerary", e.target.value)}
            placeholder={"07:00 — Baku pickup\n10:00 — Arrive at destination\n..."}
            rows={4}
            className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-input-background outline-none focus:border-primary resize-none font-mono transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold block mb-1.5">Group price (₼/pp)</label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
              placeholder="45"
              className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-input-background outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-input-background outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="bg-secondary rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Participant Limits</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Minimum participants</span>
                <span className="font-bold">{form.minGroup}</span>
              </div>
              <input
                type="range"
                min={1}
                max={form.maxGroup}
                value={form.minGroup}
                onChange={(e) => update("minGroup", parseInt(e.target.value))}
                className="w-full accent-primary h-1.5"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Maximum participants</span>
                <span className="font-bold">{form.maxGroup}</span>
              </div>
              <input
                type="range"
                min={form.minGroup}
                max={20}
                value={form.maxGroup}
                onChange={(e) => update("maxGroup", parseInt(e.target.value))}
                className="w-full accent-primary h-1.5"
              />
            </div>
          </div>
        </div>

        <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
          Publish Tour <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── OperatorProfile ──────────────────────────────────────────────────────────

function OperatorProfile({ navigate }: { navigate: NavigateFn }) {
  const [languages, setLanguages] = useState(new Set(["Azerbaijani", "English", "Russian"]));
  const [features, setFeatures] = useState({ wifi: true, ac: true, charging: false, luggage: true });

  const ALL_LANGS = ["Azerbaijani", "English", "Russian", "Turkish", "French", "German"];
  const FEATURE_LIST: Array<{ key: keyof typeof features; label: string; Icon: React.ElementType }> = [
    { key: "wifi", label: "WiFi", Icon: Wifi },
    { key: "ac", label: "Air Conditioning", Icon: Wind },
    { key: "charging", label: "USB Charging", Icon: Zap },
    { key: "luggage", label: "Luggage Space", Icon: Package },
  ];

  const toggleLang = (lang: string) =>
    setLanguages((prev) => {
      const next = new Set(prev);
      next.has(lang) ? next.delete(lang) : next.add(lang);
      return next;
    });

  return (
    <div className="min-h-full p-4 pb-10">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate("op-dashboard")} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-bold">Operator Profile</h1>
      </div>

      <div className="space-y-5">
        {/* Photo */}
        <div className="flex flex-col items-center py-2">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
              AZ
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center border-2 border-card">
              <Upload size={12} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Tap to upload photo</p>
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5">Operator name</label>
          <input
            defaultValue="AzAdventure Co."
            className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-input-background outline-none focus:border-primary transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5">Bio</label>
          <textarea
            defaultValue="We specialize in small-group nature and adventure tours across Azerbaijan. Founded in 2019, our local guides are certified mountaineers and historians."
            rows={3}
            className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-input-background outline-none focus:border-primary resize-none transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-semibold block mb-2">Languages spoken</label>
          <div className="flex flex-wrap gap-2">
            {ALL_LANGS.map((lang) => (
              <button
                key={lang}
                onClick={() => toggleLang(lang)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  languages.has(lang)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-foreground hover:border-primary/30"
                }`}
              >
                <Globe size={11} />
                {lang}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold block mb-2">Vehicle features</label>
          <div className="grid grid-cols-2 gap-2">
            {FEATURE_LIST.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setFeatures((f) => ({ ...f, [key]: !f[key] }))}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                  features[key]
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-card border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                <Icon size={14} />
                <span className="text-xs font-medium flex-1 text-left">{label}</span>
                {features[key] && <Check size={12} />}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              defaultValue="+994 50 123 45 67"
              className="w-full text-sm border border-border rounded-xl pl-8 pr-3 py-2.5 bg-input-background outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              defaultValue="info@azadventure.az"
              className="w-full text-sm border border-border rounded-xl pl-8 pr-3 py-2.5 bg-input-background outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="relative">
            <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              defaultValue="www.azadventure.az"
              className="w-full text-sm border border-border rounded-xl pl-8 pr-3 py-2.5 bg-input-background outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
          Save Profile <Check size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── OperatorBookings ─────────────────────────────────────────────────────────

function OperatorBookings({
  tours,
  selectedTour,
  navigate,
}: {
  tours: Tour[];
  selectedTour: Tour | null;
  navigate: NavigateFn;
}) {
  const [tourId, setTourId] = useState(selectedTour?.id || tours[0]?.id || "");
  const tour = tours.find((t) => t.id === tourId) || tours[0];

  const bookings = OPERATOR_BOOKINGS_DATA.slice(0, Math.min(tour?.currentGroup ?? 0, OPERATOR_BOOKINGS_DATA.length));

  const totalJoined = bookings.length;
  const minNeeded = tour?.minGroup ?? 2;
  const maxGroup = tour?.maxGroup ?? 6;

  const statusInfo =
    totalJoined >= maxGroup
      ? { label: "Confirmed", className: "bg-emerald-100 text-emerald-800" }
      : totalJoined >= minNeeded
      ? { label: "Forming", className: "bg-amber-100 text-amber-800" }
      : { label: "Waiting", className: "bg-muted text-muted-foreground" };

  return (
    <div className="min-h-full p-4 pb-8">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate("op-dashboard")} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-bold">Bookings</h1>
      </div>

      <select
        value={tourId}
        onChange={(e) => setTourId(e.target.value)}
        className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-input-background outline-none focus:border-primary mb-4 transition-colors"
      >
        {tours.map((t) => (
          <option key={t.id} value={t.id}>{t.title}</option>
        ))}
      </select>

      {tour && (
        <>
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold">{tour.title}</p>
                <p className="text-xs text-muted-foreground">{tour.location} · {tour.duration}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusInfo.className}`}>
                {statusInfo.label}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <Users size={12} />
              <span>{totalJoined} of {minNeeded} minimum joined · {maxGroup} max</span>
            </div>

            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${totalJoined >= minNeeded ? "bg-emerald-500" : "bg-amber-400"}`}
                style={{ width: `${Math.min((totalJoined / minNeeded) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border grid grid-cols-4 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              <span className="col-span-2">Participant</span>
              <span className="text-center">Payment</span>
              <span className="text-center">Status</span>
            </div>

            <div className="divide-y divide-border">
              {bookings.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No bookings yet for this tour.
                </div>
              ) : (
                bookings.map((b, i) => (
                  <div key={i} className="px-4 py-3 grid grid-cols-4 items-center text-xs">
                    <div className="col-span-2 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-secondary text-foreground flex items-center justify-center text-xs font-bold shrink-0">
                        {b.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold">{b.name}</p>
                        <p className="text-[10px] text-muted-foreground">{b.seats} seat{b.seats > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <span
                      className={`text-center font-semibold ${b.payment === "paid" ? "text-emerald-600" : "text-amber-600"}`}
                    >
                      {b.payment === "paid" ? "✓ Paid" : "⏳ Pending"}
                    </span>
                    <span
                      className={`text-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full justify-self-center ${
                        b.payment === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {b.payment === "paid" ? "Confirmed" : "Waiting"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────

const TRAVELER_NAV = [
  { id: "home" as Page, label: "Home", Icon: Home },
  { id: "comparison" as Page, label: "Compare", Icon: TrendingDown },
  { id: "planner" as Page, label: "Planner", Icon: Calendar },
  { id: "confirmation" as Page, label: "Bookings", Icon: Ticket },
];

const OPERATOR_NAV = [
  { id: "op-dashboard" as Page, label: "Dashboard", Icon: BarChart2 },
  { id: "op-add-tour" as Page, label: "Add Tour", Icon: Plus },
  { id: "op-bookings" as Page, label: "Bookings", Icon: BookOpen },
  { id: "op-profile" as Page, label: "Profile", Icon: Settings },
];

function isHomeFamily(page: Page) {
  return ["detail", "booking", "confirmation"].includes(page);
}

function Sidebar({
  page, mode, navigate, setMode,
}: {
  page: Page;
  mode: Mode;
  navigate: (p: Page) => void;
  setMode: (m: Mode) => void;
}) {
  const navItems = mode === "traveler" ? TRAVELER_NAV : OPERATOR_NAV;

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-card h-full">
      <div className="px-4 py-5 border-b border-border">
        <h2
          className="text-xl font-bold text-primary"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          TurPoint
        </h2>
        <p className="text-[10px] text-muted-foreground tracking-wide mt-0.5">Azerbaijan Tour Marketplace</p>
      </div>

      <div className="px-3 pt-4 pb-2">
        <div className="flex bg-muted rounded-xl p-0.5">
          {(["traveler", "operator"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 text-xs rounded-lg font-semibold capitalize transition-all ${
                mode === m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {navItems.map(({ id, label, Icon }) => {
          const active = page === id || (id === "home" && isHomeFamily(page));
          return (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
            N
          </div>
          <div>
            <p className="text-xs font-semibold">Nigar H.</p>
            <p className="text-[10px] text-muted-foreground capitalize">{mode}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function BottomNav({
  page, mode, navigate, setMode,
}: {
  page: Page;
  mode: Mode;
  navigate: (p: Page) => void;
  setMode: (m: Mode) => void;
}) {
  const navItems = mode === "traveler" ? TRAVELER_NAV : OPERATOR_NAV;

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-card/95 backdrop-blur-sm border-t border-border z-50">
      <div className="flex border-b border-border">
        {(["traveler", "operator"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-1 text-[10px] font-bold capitalize tracking-wide transition-colors ${
              mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="flex">
        {navItems.map(({ id, label, Icon }) => {
          const active = page === id || (id === "home" && isHomeFamily(page));
          return (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={20} />
              <span className="text-[9px] font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [mode, setMode] = useState<Mode>("traveler");
  const [selectedTour, setSelectedTour] = useState<Tour>(TOURS[0]);
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const navigate: NavigateFn = (p, tour) => {
    if (tour) setSelectedTour(tour);
    setPage(p);
  };

  const handleSetMode = (m: Mode) => {
    setMode(m);
    setPage(m === "operator" ? "op-dashboard" : "home");
  };

  return (
    <div
      className="flex h-screen overflow-hidden bg-background"
      style={{ fontFamily: "'Nunito', system-ui, sans-serif" }}
    >
      <Sidebar page={page} mode={mode} navigate={(p) => navigate(p)} setMode={handleSetMode} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {mode === "traveler" ? (
            <>
              {page === "home" && (
                <HomeScreen
                  tours={TOURS}
                  navigate={navigate}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              )}
              {page === "detail" && <TourDetailScreen tour={selectedTour} navigate={navigate} />}
              {page === "booking" && <BookingScreen tour={selectedTour} navigate={navigate} />}
              {page === "confirmation" && <ConfirmationScreen tour={selectedTour} navigate={navigate} />}
              {page === "comparison" && <ComparisonScreen allTours={TOURS} navigate={navigate} />}
              {page === "planner" && <PlannerScreen allTours={TOURS} navigate={navigate} />}
            </>
          ) : (
            <>
              {page === "op-dashboard" && <OperatorDashboard tours={TOURS} navigate={navigate} />}
              {page === "op-add-tour" && <OperatorAddTour navigate={navigate} />}
              {page === "op-profile" && <OperatorProfile navigate={navigate} />}
              {page === "op-bookings" && (
                <OperatorBookings tours={TOURS} selectedTour={selectedTour} navigate={navigate} />
              )}
            </>
          )}
        </main>
      </div>

      <BottomNav page={page} mode={mode} navigate={(p) => navigate(p)} setMode={handleSetMode} />
    </div>
  );
}
