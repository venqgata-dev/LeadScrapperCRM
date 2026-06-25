"""
Keyword expansion for lead searches.

Two independent layers:

  1. English expansions — related search terms that boost volume for ANY country.
     A "Plumber" search becomes multiple separate queries, giving more raw results
     before deduplication.

  2. Bulgarian translations — Cyrillic variants stacked on top of the English list
     only when country = Bulgaria, because Google Maps listings there are often
     in the local language.

Cyrillic category names (sent from the frontend Bulgarian presets) are mapped
back to their English equivalents before expansion so all keyword lists are used.
"""

# ---------------------------------------------------------------------------
# English related-search expansions (all countries)
# ---------------------------------------------------------------------------
_ENGLISH_EXPANSIONS: dict[str, list[str]] = {

    # ── Home Services ─────────────────────────────────────────────────────────
    "plumber": [
        "plumber", "emergency plumber", "plumbing services",
        "heating engineer", "boiler repair", "drainage services",
        "pipe repair", "leak detection",
    ],
    "emergency plumber": [
        "emergency plumber", "24 hour plumber", "plumbing emergency",
        "burst pipe repair", "emergency plumbing services",
    ],
    "boiler repair": [
        "boiler repair", "boiler service", "boiler installation",
        "combi boiler service", "central heating repair",
        "gas boiler repair",
    ],
    "gas engineer": [
        "gas engineer", "gas safe engineer", "gas installation",
        "gas appliance repair", "gas cooker installation",
    ],
    "heating engineer": [
        "heating engineer", "central heating installation",
        "underfloor heating", "radiator installation",
        "heat pump installer", "boiler engineer",
    ],
    "electrician": [
        "electrician", "electrical contractor", "emergency electrician",
        "electrical services", "electrical installation",
        "rewiring services", "fuse board replacement",
    ],
    "emergency electrician": [
        "emergency electrician", "24 hour electrician",
        "electrical emergency", "power failure repair",
    ],
    "builder": [
        "builder", "construction company", "renovations",
        "property maintenance", "building contractor",
        "general builder", "home builder",
    ],
    "bricklayer": [
        "bricklayer", "bricklaying services", "brickwork",
        "pointing", "brick repair", "stone mason",
    ],
    "roofer": [
        "roofer", "roofing contractor", "roof repair",
        "flat roofing", "roof installation", "roofing services",
        "chimney repair",
    ],
    "carpenter": [
        "carpenter", "joiner", "carpentry services",
        "fitted wardrobes", "bespoke furniture", "woodworking",
    ],
    "joiner": [
        "joiner", "joiners", "joinery services",
        "door fitting", "staircase repair", "wooden flooring",
    ],
    "kitchen fitter": [
        "kitchen fitter", "kitchen installation", "kitchen design",
        "kitchen renovation", "fitted kitchen", "kitchen installer",
    ],
    "bathroom installer": [
        "bathroom installer", "bathroom fitter", "bathroom renovation",
        "bathroom design", "wet room installation",
    ],
    "painter decorator": [
        "painter decorator", "painting services",
        "interior decorator", "exterior painting",
        "wallpaper hanging", "commercial painting",
    ],
    "painter & decorator": [
        "painter decorator", "painting services",
        "interior decorator", "exterior painting",
        "wallpaper hanging",
    ],
    "plasterer": [
        "plasterer", "plastering services",
        "rendering services", "skimming", "dry lining",
    ],
    "tiler": [
        "tiler", "tiling services", "floor tiling",
        "wall tiling", "bathroom tiling", "kitchen tiling",
    ],
    "flooring contractor": [
        "flooring contractor", "floor installer",
        "hardwood flooring", "laminate flooring",
        "vinyl flooring", "carpet fitting",
    ],
    "landscaper": [
        "landscaper", "garden design", "landscaping services",
        "gardening services", "garden makeover",
    ],
    "gardener": [
        "gardener", "garden maintenance",
        "grass cutting", "hedge trimming",
        "lawn care", "garden clearance",
    ],
    "tree surgeon": [
        "tree surgeon", "arborist", "tree removal",
        "tree pruning", "stump grinding", "tree felling",
    ],
    "fencing contractor": [
        "fencing contractor", "fence installation",
        "garden fencing", "commercial fencing",
        "gates installer", "fence repair",
    ],
    "driveway contractor": [
        "driveway contractor", "driveway installation",
        "block paving", "resin driveway",
        "tarmac driveway", "patio installer",
    ],
    "window cleaner": [
        "window cleaner", "window cleaning services",
        "commercial window cleaning", "gutter cleaning",
        "conservatory cleaning",
    ],
    "gutter cleaning": [
        "gutter cleaning", "gutter clearing",
        "gutter repair", "gutter installation",
        "fascia soffit",
    ],
    "pressure washing": [
        "pressure washing", "jet washing",
        "driveway cleaning", "patio cleaning",
        "exterior cleaning",
    ],
    "chimney sweep": [
        "chimney sweep", "chimney cleaning",
        "chimney repair", "flue cleaning",
    ],
    "locksmith": [
        "locksmith", "emergency locksmith",
        "lock repair", "lock change",
        "key cutting", "burglary repair",
    ],
    "handyman": [
        "handyman", "odd jobs", "home repairs",
        "property maintenance", "home improvements",
    ],
    "pest control": [
        "pest control", "exterminator",
        "rat removal", "mice control",
        "wasp removal", "bed bug treatment",
        "rodent control",
    ],
    "conservatory builder": [
        "conservatory builder", "conservatory installation",
        "orangery", "garden room", "sunroom",
    ],
    "patio layer": [
        "patio layer", "patio installation",
        "patio contractor", "garden paving", "paving slabs",
    ],
    "roof cleaning": [
        "roof cleaning", "moss removal",
        "roof treatment", "algae removal roof",
        "roof maintenance",
    ],
    "hvac engineer": [
        "hvac engineer", "hvac maintenance",
        "heating cooling", "ventilation engineer",
        "air handling unit",
    ],

    # ── Automotive ────────────────────────────────────────────────────────────
    "mechanic": [
        "mechanic", "car mechanic", "auto repair",
        "mot garage", "vehicle repair",
    ],
    "mobile mechanic": [
        "mobile mechanic", "mobile car repair",
        "roadside repair", "call-out mechanic",
        "mobile vehicle repair",
    ],
    "auto repair": [
        "auto repair", "car mechanic", "car garage",
        "mot centre", "auto service", "vehicle maintenance",
    ],
    "car wash": [
        "car wash", "hand car wash",
        "car valeting", "car detailing",
        "vehicle cleaning",
    ],
    "car detailing": [
        "car detailing", "auto detailing",
        "paint correction", "ceramic coating",
        "vehicle detailing", "car valet",
    ],
    "mobile valeting": [
        "mobile valeting", "mobile car valet",
        "mobile detailing", "car valet at home",
    ],
    "mot centre": [
        "mot centre", "mot station", "mot test",
        "car service", "vehicle inspection", "annual service",
    ],
    "tyre shop": [
        "tyre shop", "tyre fitting",
        "tyre replacement", "wheel balancing",
        "wheel alignment", "tyres",
    ],
    "motorcycle repair": [
        "motorcycle repair", "bike mechanic",
        "motorbike service", "motorcycle mot",
        "scooter repair",
    ],
    "body shop": [
        "body shop", "car body repair",
        "panel beater", "paintwork repair",
        "dent removal", "accident repair",
    ],
    "windscreen repair": [
        "windscreen repair", "windscreen replacement",
        "chip repair", "glass repair", "auto glass",
    ],
    "van hire": [
        "van hire", "van rental",
        "vehicle hire", "cargo van",
        "man with a van",
    ],

    # ── Beauty & Wellness ─────────────────────────────────────────────────────
    "hair salon": [
        "hair salon", "barber", "hairdresser",
        "beauty salon", "hair cutting",
    ],
    "barber": [
        "barber", "barber shop", "mens hairdresser",
        "traditional barber", "mens grooming",
    ],
    "beauty salon": [
        "beauty salon", "nail salon",
        "beauty therapist", "spa", "beauty treatments",
    ],
    "nail salon": [
        "nail salon", "nail art", "manicure",
        "pedicure", "acrylic nails", "gel nails",
    ],
    "tattoo studio": [
        "tattoo studio", "tattoo parlour",
        "tattooist", "piercing studio", "body art",
    ],
    "massage therapist": [
        "massage therapist", "massage therapy",
        "sports massage", "deep tissue massage",
        "relaxation massage", "remedial massage",
    ],
    "spa": [
        "spa", "day spa", "spa treatments",
        "beauty spa", "holistic therapies", "facial treatments",
    ],
    "cosmetic clinic": [
        "cosmetic clinic", "aesthetic clinic",
        "botox", "dermal fillers",
        "laser treatment", "skin clinic",
    ],
    "eyebrow threading": [
        "eyebrow threading", "eyebrow waxing",
        "microblading", "brow bar", "lash extension",
    ],
    "tanning studio": [
        "tanning studio", "sunbed salon",
        "spray tan", "fake tan", "tanning salon",
    ],

    # ── Food & Hospitality ────────────────────────────────────────────────────
    "restaurant": [
        "restaurant", "dining", "eatery", "bistro",
    ],
    "cafe": [
        "cafe", "coffee shop", "tea room", "snack bar",
    ],
    "bakery": [
        "bakery", "bread shop", "cake shop",
        "patisserie", "artisan bakery",
    ],
    "pizza": [
        "pizza", "pizza shop", "pizzeria",
        "pizza delivery", "italian pizza",
    ],
    "coffee shop": [
        "coffee shop", "speciality coffee",
        "espresso bar", "coffee bar", "artisan coffee",
    ],
    "fish chips": [
        "fish and chips", "fish chip shop",
        "chippy", "fried fish", "fish supper",
    ],
    "fish & chips": [
        "fish and chips", "fish chip shop",
        "chippy", "fried fish",
    ],
    "pub": [
        "pub", "public house", "free house",
        "local pub", "gastro pub",
    ],
    "bar": [
        "bar", "cocktail bar", "wine bar",
        "nightclub", "lounge bar",
    ],
    "chinese takeaway": [
        "chinese takeaway", "chinese restaurant",
        "chinese food", "oriental takeaway",
    ],
    "indian restaurant": [
        "indian restaurant", "curry house",
        "indian takeaway", "bangladeshi restaurant",
        "south asian cuisine",
    ],
    "hotel": [
        "hotel", "bed and breakfast",
        "guest house", "boutique hotel",
    ],
    "bed breakfast": [
        "bed and breakfast", "b&b", "guesthouse",
        "holiday accommodation",
    ],
    "bed & breakfast": [
        "bed and breakfast", "b&b", "guesthouse",
        "holiday accommodation",
    ],
    "takeaway": [
        "takeaway", "fast food", "food delivery",
        "kebab shop", "burger restaurant",
    ],
    "italian restaurant": [
        "italian restaurant", "italian food",
        "pasta restaurant", "trattoria",
    ],
    "turkish restaurant": [
        "turkish restaurant", "kebab restaurant",
        "mediterranean food", "shisha lounge",
    ],
    "sushi restaurant": [
        "sushi restaurant", "japanese restaurant",
        "sushi bar", "ramen shop",
    ],
    "vegan cafe": [
        "vegan cafe", "vegan restaurant",
        "plant based food", "vegetarian restaurant",
    ],

    # ── Professional Services ─────────────────────────────────────────────────
    "accountant": [
        "accountant", "accounting firm", "bookkeeper",
        "tax advisor", "chartered accountant",
    ],
    "solicitor": [
        "solicitor", "law firm", "legal services",
        "lawyer", "legal advisor",
    ],
    "estate agent": [
        "estate agent", "property agent",
        "letting agent", "property management",
        "real estate",
    ],
    "mortgage broker": [
        "mortgage broker", "mortgage advisor",
        "mortgage services", "home loans", "remortgage",
    ],
    "insurance broker": [
        "insurance broker", "insurance agent",
        "insurance services", "business insurance",
    ],
    "financial advisor": [
        "financial advisor", "financial planner",
        "wealth management", "investment advisor",
        "ifa",
    ],
    "architect": [
        "architect", "architectural services",
        "building design", "planning permission",
        "architectural firm",
    ],
    "surveyor": [
        "surveyor", "building surveyor",
        "quantity surveyor", "property survey",
        "structural survey",
    ],
    "it support": [
        "it support", "computer repair",
        "it services", "tech support",
        "managed it", "network support",
    ],
    "marketing agency": [
        "marketing agency", "digital marketing",
        "seo agency", "social media marketing",
        "online marketing",
    ],
    "web designer": [
        "web designer", "web design agency",
        "website development", "web developer",
        "website designer",
    ],
    "graphic designer": [
        "graphic designer", "graphic design",
        "logo design", "brand design", "print design",
    ],
    "pr agency": [
        "pr agency", "public relations",
        "communications agency", "brand pr",
    ],

    # ── Education ─────────────────────────────────────────────────────────────
    "driving school": [
        "driving school", "driving instructor",
        "driving lessons", "pass plus",
    ],
    "tutor": [
        "tutor", "private tutor", "home tutoring",
        "academic tutoring", "maths tutor", "english tutor",
    ],
    "nursery": [
        "nursery", "day nursery", "childcare",
        "preschool", "creche",
    ],
    "music school": [
        "music school", "music lessons",
        "guitar lessons", "piano lessons", "singing lessons",
    ],
    "language school": [
        "language school", "english classes",
        "language lessons", "esl teacher", "language tutor",
    ],
    "dance school": [
        "dance school", "dance studio",
        "dance lessons", "ballroom dancing", "dance classes",
    ],

    # ── Health & Medical ──────────────────────────────────────────────────────
    "dentist": [
        "dentist", "dental practice",
        "dental clinic", "private dentist", "dental surgery",
    ],
    "physiotherapist": [
        "physiotherapist", "physiotherapy",
        "sports physio", "physio clinic", "rehab clinic",
    ],
    "chiropractor": [
        "chiropractor", "chiropractic clinic",
        "back pain specialist", "spinal care",
    ],
    "optician": [
        "optician", "optometrist", "eye test",
        "glasses", "contact lenses",
    ],
    "pharmacy": [
        "pharmacy", "chemist",
        "dispensing pharmacy", "local pharmacy",
    ],
    "osteopath": [
        "osteopath", "osteopathy",
        "back specialist", "holistic medicine",
    ],
    "psychologist": [
        "psychologist", "therapist",
        "counselling", "cbt therapy", "mental health clinic",
    ],
    "counsellor": [
        "counsellor", "counselling services",
        "therapist", "psychotherapy", "talking therapy",
    ],
    "nutritionist": [
        "nutritionist", "dietitian",
        "nutrition consultant", "weight loss specialist",
    ],
    "acupuncturist": [
        "acupuncturist", "acupuncture",
        "traditional chinese medicine", "tcm clinic",
    ],
    "massage clinic": [
        "massage clinic", "massage centre",
        "therapeutic massage", "holistic massage",
    ],
    "hypnotherapist": [
        "hypnotherapist", "hypnotherapy",
        "stop smoking hypnosis", "weight loss hypnotherapy",
    ],

    # ── Pets ──────────────────────────────────────────────────────────────────
    "dog groomer": [
        "dog groomer", "dog grooming",
        "pet grooming", "dog salon",
    ],
    "veterinary clinic": [
        "veterinary clinic", "vet",
        "animal hospital", "pet clinic", "emergency vet",
    ],
    "pet shop": [
        "pet shop", "pet store",
        "pet supplies", "aquarium shop",
    ],
    "dog walker": [
        "dog walker", "dog walking services",
        "pet sitter", "dog day care",
    ],
    "dog trainer": [
        "dog trainer", "dog training",
        "obedience training", "puppy classes",
    ],

    # ── Fitness ───────────────────────────────────────────────────────────────
    "gym": [
        "gym", "fitness centre",
        "personal trainer", "crossfit",
    ],
    "personal trainer": [
        "personal trainer", "fitness coach",
        "pt", "strength training", "fitness training",
    ],
    "yoga studio": [
        "yoga studio", "yoga classes",
        "hot yoga", "mindfulness yoga",
    ],
    "pilates studio": [
        "pilates studio", "pilates classes",
        "reformer pilates", "mat pilates",
    ],
    "boxing club": [
        "boxing club", "boxing gym",
        "amateur boxing", "fitness boxing",
    ],
    "martial arts": [
        "martial arts", "karate club",
        "mma gym", "taekwondo", "judo",
    ],
    "crossfit": [
        "crossfit", "crossfit box",
        "functional fitness", "hiit gym",
    ],
    "swimming school": [
        "swimming school", "swimming lessons",
        "swim coaching", "adult swimming lessons",
    ],

    # ── Cleaning ──────────────────────────────────────────────────────────────
    "cleaning services": [
        "cleaning services", "domestic cleaning",
        "commercial cleaning", "office cleaning",
        "regular cleaning",
    ],
    "carpet cleaner": [
        "carpet cleaner", "carpet cleaning",
        "upholstery cleaning", "rug cleaning", "steam cleaning",
    ],
    "end of tenancy cleaning": [
        "end of tenancy cleaning", "move out cleaning",
        "deep cleaning", "bond cleaning",
    ],
    "oven cleaning": [
        "oven cleaning", "kitchen appliance cleaning",
        "deep oven clean",
    ],
    "commercial cleaning": [
        "commercial cleaning", "office cleaning",
        "industrial cleaning", "factory cleaning",
    ],

    # ── Construction & Home Improvement ──────────────────────────────────────
    "skip hire": [
        "skip hire", "waste removal", "rubbish clearance",
        "skip rental", "skip delivery",
    ],
    "scaffolding": [
        "scaffolding", "scaffold hire",
        "scaffolding services", "temporary access",
    ],
    "cctv installation": [
        "cctv installation", "cctv systems",
        "security cameras", "surveillance systems", "home security",
    ],
    "alarm installer": [
        "alarm installer", "burglar alarm",
        "security alarm", "intruder alarm", "fire alarm",
    ],
    "double glazing": [
        "double glazing", "upvc windows",
        "window installation", "window replacement",
        "doors windows",
    ],
    "loft conversion": [
        "loft conversion", "attic conversion",
        "loft room", "dormer extension",
    ],
    "extension builder": [
        "extension builder", "home extension",
        "rear extension", "single storey extension",
        "house extension",
    ],
    "garage conversion": [
        "garage conversion", "garage renovation",
        "garage refurbishment",
    ],
    "solar panels": [
        "solar panels", "solar pv",
        "solar installation", "solar energy company",
        "solar panel installer",
    ],

    # ── Events & Photography ──────────────────────────────────────────────────
    "wedding photographer": [
        "wedding photographer", "wedding photography",
        "wedding videographer", "event photographer",
    ],
    "event planner": [
        "event planner", "event management",
        "corporate events", "party planner",
    ],
    "catering": [
        "catering", "event catering",
        "mobile catering", "outside catering", "hog roast",
    ],
    "wedding venue": [
        "wedding venue", "function room",
        "event venue", "banqueting hall",
    ],
    "dj": [
        "dj", "mobile dj",
        "wedding dj", "party dj", "event dj",
    ],
    "videographer": [
        "videographer", "video production",
        "video filming", "corporate videography",
    ],
    "party planner": [
        "party planner", "party organiser",
        "children's party", "birthday party planning",
    ],
    "photo booth hire": [
        "photo booth hire", "selfie booth",
        "photo booth rental", "event photos",
    ],

    # ── Retail ────────────────────────────────────────────────────────────────
    "jeweller": [
        "jeweller", "jewellery shop",
        "watch repair", "ring resizing", "custom jewellery",
    ],
    "florist": [
        "florist", "flower shop",
        "flowers", "wedding flowers", "funeral flowers",
    ],
    "furniture shop": [
        "furniture shop", "furniture store",
        "second hand furniture", "bespoke furniture",
    ],
    "clothing boutique": [
        "clothing boutique", "fashion boutique",
        "women's clothing", "dress shop", "clothing shop",
    ],
    "gift shop": [
        "gift shop", "gift store",
        "personalised gifts", "novelty shop",
    ],
    "antiques shop": [
        "antiques shop", "antique dealer",
        "vintage shop", "bric a brac",
    ],
    "bookshop": [
        "bookshop", "bookstore",
        "second hand books", "independent bookshop",
    ],

    # ── Backward-compat aliases ───────────────────────────────────────────────
    "physio": [
        "physio", "physiotherapist",
        "sports therapist", "osteopath",
    ],
    "solar panel installer": [
        "solar panel installer", "solar panels",
        "solar installation", "solar energy", "solar pv",
    ],
    "air conditioning": [
        "air conditioning", "air conditioning installation",
        "ac repair", "hvac", "heat pump", "climate control",
    ],
    "underfloor heating": [
        "underfloor heating", "underfloor heating installation",
        "electric underfloor heating", "wet underfloor heating",
    ],
    "decking installer": [
        "decking installer", "decking construction",
        "garden decking", "composite decking",
    ],
    "trampolining centre": [
        "trampolining centre", "trampoline park",
        "gymnastics", "acrobatics",
    ],
    "sports coaching": [
        "sports coaching", "fitness coaching",
        "sports academy", "athletic training",
    ],
}

# ---------------------------------------------------------------------------
# Bulgarian Cyrillic translations (appended on top for Bulgaria only)
# ---------------------------------------------------------------------------
_BULGARIA_TRANSLATIONS: dict[str, list[str]] = {
    # Home Services
    "plumber":              ["водопроводчик", "ВиК услуги", "авариен водопроводчик", "бойлери"],
    "electrician":          ["електротехник", "ел услуги", "електроинсталации"],
    "roofer":               ["покривар", "покривни услуги", "покриви"],
    "builder":              ["строителни услуги", "строителна фирма", "ремонти", "майстор"],
    "painter decorator":    ["бояджия", "бояджийски услуги", "боядисване"],
    "plasterer":            ["мазач", "мазилки", "гипсокартон"],
    "carpenter":            ["дърводелец", "дърводелски услуги"],
    "tiler":                ["теракот", "полагане на теракот", "фаянс"],
    "landscaper":           ["озеленяване", "градинар", "градинарство"],
    "gardener":             ["градинар", "косене на трева", "поддръжка на градина"],
    "window cleaner":       ["миене на прозорци", "почистване на прозорци"],
    "double glazing":       ["дограма", "PVC дограма", "алуминиева дограма"],
    "locksmith":            ["ключар", "смяна на ключалки"],
    "cleaning services":    ["почистване", "почистваща фирма", "домашно почистване"],
    "pest control":         ["дезинсекция", "дератизация", "унищожаване на хлебарки"],
    "flooring contractor":  ["паркет", "ламинат", "поставяне на паркет"],
    "chimney sweep":        ["коминочистач", "почистване на комин"],

    # Automotive
    "auto repair":          ["автосервиз", "автомонтьор", "ремонт на автомобили"],
    "mechanic":             ["автомеханик", "автосервиз"],
    "car wash":             ["автомивка", "миене на коли"],
    "car detailing":        ["автокозметика", "детайлинг", "полиране на автомобили"],
    "tyre shop":            ["гуми", "смяна на гуми", "вулканизатор"],
    "mot centre":           ["годишен технически преглед", "технически преглед"],

    # Beauty
    "hair salon":           ["фризьорски салон", "фризьор", "салон за красота"],
    "barber":               ["бръснар", "барбершоп", "мъжки фризьор"],
    "beauty salon":         ["козметичен салон", "козметика", "козметик"],
    "nail salon":           ["маникюр", "педикюр", "нокти"],
    "massage therapist":    ["масаж", "масажен кабинет", "спортен масаж"],
    "spa":                  ["спа", "спа център", "козметични процедури"],
    "tattoo studio":        ["татуировки", "пиърсинг"],

    # Food
    "restaurant":           ["ресторант"],
    "cafe":                 ["кафе", "кафене"],
    "bakery":               ["пекарна", "сладкарница", "хлебарница"],
    "pizza":                ["пицария"],

    # Health
    "dentist":              ["зъболекар", "дентален кабинет", "зъболекарски кабинет"],
    "physiotherapist":      ["физиотерапевт", "физиотерапия", "рехабилитация"],
    "optician":             ["оптика", "очна оптика"],
    "pharmacy":             ["аптека"],
    "psychologist":         ["психолог", "психотерапевт"],

    # Professional
    "accountant":           ["счетоводител", "счетоводна кантора", "счетоводство"],
    "solicitor":            ["адвокат", "адвокатска кантора"],
    "estate agent":         ["имоти", "агенция за недвижими имоти", "недвижими имоти"],
    "insurance broker":     ["застраховател", "застрахователен агент"],

    # Fitness / Leisure
    "gym":                  ["фитнес", "фитнес зала", "силова зала"],
    "yoga studio":          ["йога", "йога студио"],
    "veterinary clinic":    ["ветеринар", "ветеринарна клиника"],
    "pet shop":             ["зоомагазин", "зоологически магазин"],

    # Backward-compat
    "hotel":                ["хотел"],
    "window cleaner":       ["миене на прозорци"],
    "handyman":             ["майстор", "ремонти"],
    "carpet cleaner":       ["пране на килими", "почистване на мокети"],
    "dog groomer":          ["грумиране на кучета", "кучешки салон"],
    "physio":               ["физиотерапевт", "рехабилитация"],
}

# ---------------------------------------------------------------------------
# Cyrillic → English reverse mapping
# When the frontend sends a Bulgarian Cyrillic category, map it to the English
# key so the full expansion table is used.
# ---------------------------------------------------------------------------
_CYRILLIC_TO_ENGLISH: dict[str, str] = {
    # Home Services
    "вик":                      "plumber",
    "вик услуги":               "plumber",
    "водопроводчик":            "plumber",
    "електротехник":            "electrician",
    "ел услуги":                "electrician",
    "строителни услуги":        "builder",
    "строителна фирма":         "builder",
    "майстор":                  "builder",
    "покриви":                  "roofer",
    "дограма":                  "double glazing",
    "гипсокартон":              "plasterer",
    "боядисване":               "painter decorator",
    "теракот":                  "tiler",
    "озеленяване":              "landscaper",
    "почистване":               "cleaning services",
    "миене на прозорци":        "window cleaner",
    "ключар":                   "locksmith",

    # Automotive
    "автосервиз":               "auto repair",
    "автомивка":                "car wash",
    "автокозметика":            "car detailing",
    "детайлинг":                "car detailing",
    "гуми":                     "tyre shop",

    # Beauty
    "фризьор":                  "hair salon",
    "бръснар":                  "barber",
    "маникюр":                  "nail salon",
    "козметик":                 "beauty salon",
    "козметичен салон":         "beauty salon",
    "масаж":                    "massage therapist",
    "спа център":               "spa",

    # Food
    "ресторант":                "restaurant",
    "пицария":                  "pizza",
    "кафене":                   "cafe",
    "сладкарница":              "bakery",
    "пекарна":                  "bakery",

    # Health
    "зъболекар":                "dentist",
    "физиотерапия":             "physiotherapist",
    "оптика":                   "optician",
    "аптека":                   "pharmacy",

    # Professional
    "счетоводител":             "accountant",
    "адвокат":                  "solicitor",
    "имоти":                    "estate agent",
    "застраховател":            "insurance broker",

    # Fitness / Leisure
    "фитнес":                   "gym",
    "йога":                     "yoga studio",
    "ветеринар":                "veterinary clinic",
    "зоомагазин":               "pet shop",

    # Backward-compat
    "хотел":                    "hotel",
}


_COUNTRY_LANGUAGE: dict[str, str] = {
    "bulgaria": "bg",
    "germany": "de",
    "france": "fr",
    "spain": "es",
    "italy": "it",
    "portugal": "pt",
    "poland": "pl",
    "czech republic": "cs",
    "romania": "ro",
    "hungary": "hu",
    "greece": "el",
    "netherlands": "nl",
    "belgium": "nl",
    "austria": "de",
    "switzerland": "de",
    "sweden": "sv",
    "norway": "no",
    "denmark": "da",
    "finland": "fi",
}


def get_language_code(country: str | None) -> str:
    """Return the BCP-47 language code for a country, defaulting to 'en'."""
    if not country:
        return "en"
    return _COUNTRY_LANGUAGE.get(country.strip().lower(), "en")


def expand_keywords(keyword: str, country: str | None) -> list[str]:
    """
    Return an ordered list of search keywords for the given country.

    1. Normalise the keyword (strip, lower, collapse '&').
    2. If it is a known Cyrillic category name, map to the English key.
    3. Apply English expansions (all countries).
    4. For Bulgaria, append Cyrillic translations on top.

    Falls back to ``[keyword]`` for any unmapped category.
    """
    lower = keyword.strip().lower()

    # Normalise "Painter & Decorator" → "painter decorator"
    lower = lower.replace(" & ", " ")

    # Map Cyrillic frontend preset to English key
    english_key = _CYRILLIC_TO_ENGLISH.get(lower, lower)

    # Layer 1: English related searches (all countries)
    result = list(_ENGLISH_EXPANSIONS.get(english_key, [keyword.strip()]))

    # Layer 2: Bulgarian Cyrillic on top (Bulgaria only)
    if country and "bulgaria" in country.strip().lower():
        result += _BULGARIA_TRANSLATIONS.get(english_key, [])

    return result
