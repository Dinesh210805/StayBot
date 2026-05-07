export interface Destination {
  slug: string;
  name: string;
  native: string;
  tagline: string;
  hero: string;
  accent: string;
  coordinate: string;
  intro: string;
  story: string[];
  neighborhoods: { name: string; vibe: string; image: string }[];
  rituals: { time: string; place: string; note: string }[];
  gallery: string[];
  bestTime: string;
  language: string;
  currency: string;
  flightHours: string;
  listingCount?: number;
}

export const DESTINATIONS: Destination[] = [
  {
    slug: "bangkok",
    name: "Bangkok",
    native: "กรุงเทพมหานคร",
    tagline: "City of Angels, City of Light",
    hero: "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=2400&q=85",
    accent: "#E9B26C",
    coordinate: "13.7563° N · 100.5018° E",
    intro:
      "Bangkok hums in two registers — the gilded baritone of its temples and the electric soprano of its markets. Stay here long enough and the city teaches you how to listen.",
    story: [
      "It starts before sunrise. Saffron robes drift along the Chao Phraya like falling leaves. Steam curls from a row of bronze pots. Somewhere upriver, a longtail engine clears its throat.",
      "By midmorning the city is fully awake. Tuk-tuks thread between sleek black sedans. Office towers wear ancient temples like jewelry. Vendors arrange mangoes into perfect ascending pyramids.",
      "By night, Bangkok softens. Rooftop lounges glitter against a velvet sky. A monk lights three incense sticks in a doorway. The river is black ink. The city has no off switch — just a dimmer.",
    ],
    neighborhoods: [
      {
        name: "Phra Nakhon",
        vibe: "Old Bangkok. Royal palaces, narrow lanes, and the city's oldest temples.",
        image: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200&q=85",
      },
      {
        name: "Thonglor",
        vibe: "Modern, affluent, design-forward. Cocktail bars, ramen, and concept stores.",
        image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200&q=85",
      },
      {
        name: "Riverside",
        vibe: "Slow boats, old hotels, and golden light on the water at dusk.",
        image: "https://images.unsplash.com/photo-1528181304800-26298f6dadce?w=1200&q=85",
      },
    ],
    rituals: [
      { time: "06:00", place: "Wat Pho", note: "Almsgiving rounds — silence, then bells." },
      { time: "11:30", place: "Or Tor Kor Market", note: "Mango sticky rice, before the lunch rush." },
      { time: "18:30", place: "Saxophone Bar", note: "A glass of Mekhong on the rocks. Brass section warming up." },
    ],
    gallery: [
      "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200&q=85",
      "https://images.unsplash.com/photo-1528181304800-26298f6dadce?w=1200&q=85",
      "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200&q=85",
      "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=1200&q=85",
    ],
    bestTime: "Nov – Feb",
    language: "Thai · English",
    currency: "THB",
    flightHours: "11h from London · 14h from Cape Town",
    listingCount: 180,
  },
  {
    slug: "london",
    name: "London",
    native: "Lundúnir",
    tagline: "The Great Metropolis",
    hero: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=2400&q=85",
    accent: "#6E94D6",
    coordinate: "51.5074° N · 0.1278° W",
    intro:
      "London is an argument between centuries. Stay here long enough and you start to hear it — the Roman wall under the office block, the old river under the new road, the ghost coffee house on the corner of the bank.",
    story: [
      "Morning fog over the Thames at first light. The river so still you could write on it. A heron stands like a question mark on the south bank. Big Ben strikes the hour and the city remembers it has work to do.",
      "By midmorning the espresso machines are screaming and the buses are red and everything is on schedule and slightly behind. A queue forms outside a bakery that has been there since 1810.",
      "At night the lamps come on along the embankment, gold against the black water. Soho hums. A pub on a corner has been pouring the same ale to different generations for two hundred years. Nothing here ever truly closes.",
    ],
    neighborhoods: [
      {
        name: "Marylebone",
        vibe: "Quiet streets, antique shops, and the gentlest version of central London.",
        image: "https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=1200&q=85",
      },
      {
        name: "Shoreditch",
        vibe: "Warehouses, murals, and a cocktail bar inside almost every door.",
        image: "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?w=1200&q=85",
      },
      {
        name: "South Bank",
        vibe: "River walks, theatre, and the Thames at golden hour.",
        image: "https://images.unsplash.com/photo-1543832923-44667a44c804?w=1200&q=85",
      },
    ],
    rituals: [
      { time: "07:30", place: "Borough Market", note: "Flat white, sourdough, the first stallholders' jokes." },
      { time: "16:00", place: "Sky Garden", note: "Tea above the city. The Shard exactly where you left it." },
      { time: "21:00", place: "The French House, Soho", note: "House wine. No phones. A corner table." },
    ],
    gallery: [
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=85",
      "https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=1200&q=85",
      "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?w=1200&q=85",
      "https://images.unsplash.com/photo-1543832923-44667a44c804?w=1200&q=85",
    ],
    bestTime: "May – Sep",
    language: "English",
    currency: "GBP",
    flightHours: "11h to Bangkok · 11h to Cape Town",
    listingCount: 165,
  },
  {
    slug: "cape-town",
    name: "Cape Town",
    native: "Kaapstad · iKapa",
    tagline: "Where Two Oceans Meet",
    hero: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=2400&q=85",
    accent: "#6FB89A",
    coordinate: "33.9249° S · 18.4241° E",
    intro:
      "Cape Town is geography first, city second. The mountain decides where the streets can go. The ocean decides what the light will do. You don't visit it so much as stay out of its way.",
    story: [
      "Dawn at Camps Bay — the Atlantic the color of slate, the sand the color of bone. A surfer in a black wetsuit walks down toward water that you would not, under any circumstances, willingly enter.",
      "By midday the mountain has its hat on — a flat white cloud that locals call the tablecloth — and the southeaster is tearing through the bowl. Bo-Kaap glitters in pinks and greens above the city.",
      "At night you eat outside. Of course you do. The fynbos smells of honey and salt. A line of waves comes in from the south, where there is nothing between you and Antarctica but a few thousand kilometres of ocean.",
    ],
    neighborhoods: [
      {
        name: "Bo-Kaap",
        vibe: "Pastel houses on cobbled streets at the foot of Signal Hill.",
        image: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1200&q=85",
      },
      {
        name: "Sea Point",
        vibe: "Promenade walks, pre-war apartment blocks, and Atlantic spray.",
        image: "https://images.unsplash.com/photo-1591789638128-5e2bcd95f9cf?w=1200&q=85",
      },
      {
        name: "Constantia",
        vibe: "Wine country fifteen minutes from the city. Oaks, vineyards, slow lunches.",
        image: "https://images.unsplash.com/photo-1528127269322-539801943592?w=1200&q=85",
      },
    ],
    rituals: [
      { time: "06:30", place: "Lion's Head", note: "Hike up for sunrise. The whole peninsula visible." },
      { time: "13:00", place: "Kalk Bay harbour", note: "Linefish, lemon, white wine. Watch the seals." },
      { time: "19:30", place: "Camps Bay", note: "Sundowners. Twelve Apostles glowing pink behind you." },
    ],
    gallery: [
      "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1200&q=85",
      "https://images.unsplash.com/photo-1591789638128-5e2bcd95f9cf?w=1200&q=85",
      "https://images.unsplash.com/photo-1528127269322-539801943592?w=1200&q=85",
      "https://images.unsplash.com/photo-1567176453050-31a52015ae37?w=1200&q=85",
    ],
    bestTime: "Oct – Apr",
    language: "English · Afrikaans · Xhosa",
    currency: "ZAR",
    flightHours: "14h from Bangkok · 11h from London",
    listingCount: 105,
  },
];

export function getDestination(slug: string): Destination | undefined {
  return DESTINATIONS.find((d) => d.slug === slug);
}
