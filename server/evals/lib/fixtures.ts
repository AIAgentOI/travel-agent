// Deterministic stand-ins for the three network tools (Open-Meteo geocoding,
// Open-Meteo forecast, OSM Overpass). Evals that grade *behaviour* - which
// tools the agent reaches for, and what it writes with the results - should
// not also be grading whether Overpass was up that morning.

export interface FixtureCity {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  /** Highs cycled through the forecast window, in Celsius. */
  highs: number[];
  lows: number[];
  conditions: string[];
  pois: Record<string, string[]>;
}

/** Anchors the stubbed forecast so eval runs are reproducible across days. */
export const FIXTURE_TODAY = "2026-10-05";

export const FIXTURE_CITIES: FixtureCity[] = [
  {
    name: "Lisbon",
    region: "Lisbon",
    country: "Portugal",
    latitude: 38.71667,
    longitude: -9.13333,
    timezone: "Europe/Lisbon",
    highs: [24, 25, 22, 21, 23, 26, 25],
    lows: [16, 17, 15, 14, 15, 17, 17],
    conditions: ["clear sky", "mainly clear", "slight rain", "overcast", "partly cloudy", "clear sky", "clear sky"],
    pois: {
      food: ["Cervejaria Ramiro", "Time Out Market", "Mercado de Campo de Ourique", "Solar dos Presuntos", "A Cevicheria"],
      history: ["Jeronimos Monastery", "Belem Tower", "Sao Jorge Castle", "Lisbon Cathedral", "Carmo Convent"],
      museums: ["Calouste Gulbenkian Museum", "MAAT", "National Tile Museum", "Berardo Collection", "Museu do Fado"],
      nature: ["Eduardo VII Park", "Jardim da Estrela", "Monsanto Forest Park", "Miradouro da Senhora do Monte", "Praia de Carcavelos"],
      nightlife: ["Pensao Amor", "Park Bar", "Lux Fragil", "Bairro Alto", "Cinco Lounge"],
      landmarks: ["Praca do Comercio", "Santa Justa Lift", "25 de Abril Bridge", "Rossio Square", "Miradouro de Santa Luzia"],
      religion: ["Sao Roque Church", "Basilica da Estrela", "Se de Lisboa"],
      shopping: ["Feira da Ladra", "Centro Colombo", "Mercado da Ribeira"],
    },
  },
  {
    name: "Kyoto",
    region: "Kyoto",
    country: "Japan",
    latitude: 35.01167,
    longitude: 135.76833,
    timezone: "Asia/Tokyo",
    highs: [23, 22, 20, 19, 21, 24, 23],
    lows: [14, 13, 12, 11, 12, 14, 14],
    conditions: ["partly cloudy", "moderate rain", "overcast", "mainly clear", "clear sky", "clear sky", "light drizzle"],
    pois: {
      food: ["Nishiki Market", "Gion Karyo", "Honke Owariya", "Ippudo Nishikikoji", "Kikunoi"],
      history: ["Kinkaku-ji", "Nijo Castle", "Ginkaku-ji", "Toji Temple", "Sanjusangendo"],
      museums: ["Kyoto National Museum", "Kyoto Railway Museum", "Museum of Kyoto", "Kyocera Museum of Art", "Kahitsukan"],
      nature: ["Arashiyama Bamboo Grove", "Maruyama Park", "Philosopher's Path", "Kyoto Botanical Gardens", "Mount Inari Trail"],
      nightlife: ["Pontocho Alley", "Bar Rocking Chair", "Kissa Master", "L'Escamoteur", "Gion Nawate"],
      landmarks: ["Fushimi Inari Taisha", "Kiyomizu-dera", "Yasaka Shrine", "Togetsukyo Bridge", "Kyoto Tower"],
      religion: ["Higashi Honganji", "Nanzen-ji", "Heian Shrine"],
      shopping: ["Teramachi Arcade", "Kyoto Handicraft Center", "Nishiki Market"],
    },
  },
  {
    name: "Porto",
    region: "Porto",
    country: "Portugal",
    latitude: 41.14961,
    longitude: -8.61099,
    timezone: "Europe/Lisbon",
    highs: [21, 22, 19, 18, 20, 22, 21],
    lows: [14, 15, 13, 12, 13, 15, 14],
    conditions: ["overcast", "slight rain", "partly cloudy", "clear sky", "mainly clear", "slight rain", "partly cloudy"],
    pois: {
      food: ["Cafe Santiago", "Mercado do Bolhao", "Cantinho do Avillez", "Casa Guedes", "Taberna dos Mercadores"],
      history: ["Porto Cathedral", "Palacio da Bolsa", "Igreja de Sao Francisco", "Torre dos Clerigos", "Casa do Infante"],
      museums: ["Serralves Museum", "Soares dos Reis National Museum", "World of Discoveries", "Museu do Carro Electrico", "Casa da Musica"],
      nature: ["Jardins do Palacio de Cristal", "Parque da Cidade", "Praia de Matosinhos", "Jardim do Morro", "Douro Riverfront"],
      nightlife: ["Galerias de Paris", "Cafe Candelabro", "Plano B", "Maus Habitos", "Base Porto"],
      landmarks: ["Dom Luis I Bridge", "Livraria Lello", "Ribeira Square", "Sao Bento Station", "Vila Nova de Gaia Cellars"],
      religion: ["Capela das Almas", "Igreja do Carmo", "Se do Porto"],
      shopping: ["Rua de Santa Catarina", "Mercado do Bolhao", "Centro Comercial Bombarda"],
    },
  },
  {
    name: "Rome",
    region: "Lazio",
    country: "Italy",
    latitude: 41.89193,
    longitude: 12.51133,
    timezone: "Europe/Rome",
    highs: [26, 27, 24, 23, 25, 27, 26],
    lows: [16, 17, 15, 14, 15, 17, 16],
    conditions: ["clear sky", "clear sky", "slight rain", "overcast", "partly cloudy", "mainly clear", "clear sky"],
    pois: {
      food: ["Roscioli", "Testaccio Market", "Da Enzo al 29", "Armando al Pantheon", "Pizzarium"],
      history: ["Colosseum", "Roman Forum", "Pantheon", "Palatine Hill", "Baths of Caracalla"],
      museums: ["Vatican Museums", "Galleria Borghese", "Capitoline Museums", "MAXXI", "Palazzo Massimo"],
      nature: ["Villa Borghese", "Villa Doria Pamphili", "Orange Garden", "Appian Way Park", "Botanical Garden of Rome"],
      nightlife: ["Freni e Frizioni", "Jerry Thomas Project", "Trastevere", "Blackmarket Hall", "Salotto 42"],
      landmarks: ["Trevi Fountain", "Spanish Steps", "Piazza Navona", "Castel Sant'Angelo", "St Peter's Square"],
      religion: ["St Peter's Basilica", "Santa Maria Maggiore", "San Clemente"],
      shopping: ["Via del Corso", "Porta Portese Market", "Via Condotti"],
    },
  },
];

/** Fuzzy name lookup, mirroring what the real geocoder tolerates. */
export function findCityByName(place: string): FixtureCity | undefined {
  const q = place.trim().toLowerCase();
  return FIXTURE_CITIES.find((c) => q.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(q));
}

/** Attractions/weather receive coordinates, not names - map them back. */
export function findCityByCoords(latitude: number, longitude: number): FixtureCity | undefined {
  let best: FixtureCity | undefined;
  let bestDist = Infinity;
  for (const c of FIXTURE_CITIES) {
    const d = Math.hypot(c.latitude - latitude, c.longitude - longitude);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  // ~1 degree of slack: enough for a coordinate the model rounded, not enough
  // to silently answer for a city that has no fixture.
  return bestDist <= 1 ? best : undefined;
}

export function fixtureDate(offsetDays: number): string {
  const d = new Date(`${FIXTURE_TODAY}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
