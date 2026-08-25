export interface TitleCase {
  name: string;
  message: string;
  /** A substring the title has to contain, case-insensitively. */
  destination: string;
}

export const TITLE_CASES: TitleCase[] = [
  {
    name: "explicit-city",
    message: "Plan a 10-day trip to Lisbon in October with a mid-range budget. I like food and architecture.",
    destination: "Lisbon",
  },
  {
    name: "country-only",
    message: "I want to spend two weeks backpacking around Vietnam sometime next spring.",
    destination: "Vietnam",
  },
  {
    name: "city-buried-mid-sentence",
    message: "My partner and I have four days free and we were thinking Kyoto, mostly temples and food.",
    destination: "Kyoto",
  },
  {
    name: "trip-type-first",
    message: "Looking for a luxury honeymoon, about a week, somewhere in the Maldives.",
    destination: "Maldives",
  },
  {
    name: "family-trip",
    message: "Family of five, 6 nights in Rome over Easter, we need something the kids won't hate.",
    destination: "Rome",
  },
  {
    name: "multi-city",
    message: "Two weeks in Spain - Madrid, Seville and Barcelona. Trains between them.",
    destination: "Spain",
  },
  {
    name: "terse",
    message: "Weekend in Porto?",
    destination: "Porto",
  },
  {
    name: "activity-led",
    message: "I want to do a hiking trip in Patagonia, roughly 12 days, camping where possible.",
    destination: "Patagonia",
  },
];
