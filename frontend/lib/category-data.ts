/**
 * Shared category configuration used by Lead Finder and Campaigns.
 * Single source of truth — edit here, both pages pick up the change.
 */

export interface CategoryGroup {
  group: string;
  key: string;
  categories: string[];
}

export const ALL_GROUP_PREFIX = "__ALL__";

export const UK_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    group: "Home Services", key: "home_services",
    categories: [
      "Plumber", "Emergency Plumber", "Boiler Repair", "Gas Engineer",
      "Heating Engineer", "Electrician", "Emergency Electrician",
      "Builder", "Bricklayer", "Roofer", "Carpenter", "Joiner",
      "Kitchen Fitter", "Bathroom Installer", "Painter & Decorator",
      "Plasterer", "Tiler", "Flooring Contractor",
      "Landscaper", "Gardener", "Tree Surgeon", "Fencing Contractor",
      "Driveway Contractor", "Window Cleaner", "Gutter Cleaning",
      "Pressure Washing", "Chimney Sweep", "Locksmith", "Handyman",
      "Pest Control", "Conservatory Builder", "Patio Layer",
      "Roof Cleaning", "HVAC Engineer",
    ],
  },
  {
    group: "Automotive", key: "automotive",
    categories: [
      "Mechanic", "Mobile Mechanic", "Auto Repair", "Car Wash",
      "Car Detailing", "Mobile Valeting", "MOT Centre", "Tyre Shop",
      "Motorcycle Repair", "Body Shop", "Windscreen Repair", "Van Hire",
    ],
  },
  {
    group: "Beauty & Wellness", key: "beauty",
    categories: [
      "Hair Salon", "Barber", "Beauty Salon", "Nail Salon",
      "Tattoo Studio", "Massage Therapist", "Spa", "Cosmetic Clinic",
      "Eyebrow Threading", "Tanning Studio",
    ],
  },
  {
    group: "Food & Hospitality", key: "food",
    categories: [
      "Restaurant", "Cafe", "Bakery", "Pizza", "Coffee Shop",
      "Fish & Chips", "Pub", "Bar", "Chinese Takeaway",
      "Indian Restaurant", "Italian Restaurant", "Turkish Restaurant",
      "Sushi Restaurant", "Vegan Cafe", "Hotel", "Bed & Breakfast", "Takeaway",
    ],
  },
  {
    group: "Professional Services", key: "professional",
    categories: [
      "Accountant", "Solicitor", "Estate Agent", "Mortgage Broker",
      "Insurance Broker", "Financial Advisor", "Architect", "Surveyor",
      "IT Support", "Marketing Agency", "Web Designer",
      "Graphic Designer", "PR Agency",
    ],
  },
  {
    group: "Education", key: "education",
    categories: [
      "Driving School", "Tutor", "Nursery", "Music School",
      "Language School", "Dance School",
    ],
  },
  {
    group: "Health & Medical", key: "health",
    categories: [
      "Dentist", "Physiotherapist", "Chiropractor", "Optician",
      "Pharmacy", "Osteopath", "Psychologist", "Counsellor",
      "Nutritionist", "Acupuncturist", "Massage Clinic", "Hypnotherapist",
    ],
  },
  {
    group: "Pets", key: "pets",
    categories: [
      "Dog Groomer", "Veterinary Clinic", "Pet Shop",
      "Dog Walker", "Dog Trainer",
    ],
  },
  {
    group: "Fitness", key: "fitness",
    categories: [
      "Gym", "Personal Trainer", "Yoga Studio", "Pilates Studio",
      "Boxing Club", "Martial Arts", "CrossFit", "Swimming School",
    ],
  },
  {
    group: "Cleaning", key: "cleaning",
    categories: [
      "Cleaning Services", "Carpet Cleaner", "End of Tenancy Cleaning",
      "Oven Cleaning", "Commercial Cleaning",
    ],
  },
  {
    group: "Construction & Improvement", key: "construction",
    categories: [
      "Skip Hire", "Scaffolding", "CCTV Installation", "Alarm Installer",
      "Double Glazing", "Loft Conversion", "Extension Builder",
      "Garage Conversion", "Solar Panels",
    ],
  },
  {
    group: "Events & Photography", key: "events",
    categories: [
      "Wedding Photographer", "Event Planner", "Catering",
      "Wedding Venue", "DJ", "Videographer", "Party Planner",
      "Photo Booth Hire",
    ],
  },
  {
    group: "Retail", key: "retail",
    categories: [
      "Jeweller", "Florist", "Furniture Shop",
      "Clothing Boutique", "Gift Shop", "Antiques Shop", "Bookshop",
    ],
  },
];

export const BULGARIA_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    group: "Home Services", key: "home_services",
    categories: [
      "ВиК", "Водопроводчик", "Електротехник", "Ел услуги",
      "Строителни услуги", "Строителна фирма", "Майстор",
      "Покриви", "Дограма", "Гипсокартон",
      "Боядисване", "Теракот", "Озеленяване",
      "Почистване", "Миене на прозорци",
    ],
  },
  {
    group: "Automotive", key: "automotive",
    categories: ["Автосервиз", "Автомивка", "Автокозметика", "Детайлинг", "Гуми"],
  },
  {
    group: "Beauty & Wellness", key: "beauty",
    categories: ["Фризьор", "Бръснар", "Маникюр", "Козметик", "Масаж", "Спа център"],
  },
  {
    group: "Food & Hospitality", key: "food",
    categories: ["Ресторант", "Пицария", "Кафене", "Сладкарница", "Пекарна"],
  },
  {
    group: "Health & Medical", key: "health",
    categories: ["Зъболекар", "Физиотерапия", "Оптика", "Аптека"],
  },
  {
    group: "Professional Services", key: "professional",
    categories: ["Счетоводител", "Адвокат", "Имоти", "Застраховател"],
  },
  {
    group: "Fitness", key: "fitness",
    categories: ["Фитнес", "Йога"],
  },
  {
    group: "Pets", key: "pets",
    categories: ["Ветеринар", "Зоомагазин"],
  },
];

export const CATEGORY_GROUPS_BY_COUNTRY: Record<string, CategoryGroup[]> = {
  "United Kingdom": UK_CATEGORY_GROUPS,
  Bulgaria: BULGARIA_CATEGORY_GROUPS,
};

export const MAJOR_CITIES: Record<string, string[]> = {
  "United Kingdom": [
    "London", "Manchester", "Birmingham", "Leeds", "Liverpool",
    "Bristol", "Sheffield", "Glasgow", "Edinburgh", "Cardiff",
  ],
  Bulgaria: [
    "Sofia", "Varna", "Plovdiv", "Burgas", "Ruse",
    "Stara Zagora", "Pleven", "Sliven",
  ],
};

export const SMALL_TOWNS: Record<string, string[]> = {
  "United Kingdom": [
    "Rochdale", "Bolton", "Oldham", "Wigan", "Stockport",
    "Slough", "Reading", "Luton",
  ],
  Bulgaria: [
    "Перник", "Дупница", "Самоков", "Казанлък",
    "Търговище", "Габрово", "Ловеч", "Видин",
  ],
};

/** Mirrors backend neighbors.py — used only for UI preview text */
export const NEIGHBOR_CITIES: Record<string, string[]> = {
  Glasgow:     ["Paisley", "Clydebank", "East Kilbride", "Renfrew", "Bearsden"],
  Edinburgh:   ["Livingston", "Kirkcaldy", "Dunfermline", "Musselburgh", "Dalkeith"],
  Manchester:  ["Salford", "Stockport", "Oldham", "Bolton", "Rochdale", "Wigan"],
  Liverpool:   ["Birkenhead", "Runcorn", "Warrington", "St Helens", "Bootle"],
  Leeds:       ["Bradford", "Wakefield", "Huddersfield", "Halifax", "Batley"],
  Sheffield:   ["Rotherham", "Barnsley", "Doncaster", "Chesterfield"],
  Birmingham:  ["Solihull", "Wolverhampton", "Coventry", "Walsall", "West Bromwich"],
  Nottingham:  ["Derby", "Leicester", "Loughborough", "Ilkeston"],
  London:      ["Croydon", "Bromley", "Enfield", "Harrow", "Romford"],
  Reading:     ["Slough", "Maidenhead", "Wokingham", "Bracknell"],
  Bristol:     ["Bath", "Weston-super-Mare", "Gloucester", "Cheltenham"],
  Cardiff:     ["Newport", "Barry", "Bridgend", "Pontypridd"],
  Newcastle:   ["Gateshead", "Sunderland", "Durham", "Middlesbrough"],
  Southampton: ["Portsmouth", "Fareham", "Eastleigh", "Totton"],
  Brighton:    ["Hove", "Worthing", "Eastbourne", "Lewes"],
  // Bulgaria
  Sofia:       ["Pernik", "Dupnitsa", "Samokov", "Botevgrad", "Bozhurishte"],
  Varna:       ["Devnya", "Beloslav", "Aksakovo", "Provadiya"],
  Plovdiv:     ["Asenovgrad", "Rakovski", "Stamboliyski", "Karlovo"],
  Burgas:      ["Nesebar", "Aytos", "Pomorie", "Sredets"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getGroupCategories(groupKey: string, groups: CategoryGroup[]): string[] {
  return groups.find(g => g.key === groupKey)?.categories ?? [];
}

export function getGroupDisplayName(groupKey: string, groups: CategoryGroup[]): string {
  return groups.find(g => g.key === groupKey)?.group ?? groupKey;
}

export function getAllCategories(groups: CategoryGroup[]): string[] {
  return groups.flatMap(g => g.categories);
}
