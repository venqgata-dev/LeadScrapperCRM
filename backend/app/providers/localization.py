"""
Keyword expansion for lead searches.

Two independent layers:

  1. English expansions — related search terms that boost volume for ANY country.
     A "Plumber" search becomes 6 separate queries, giving up to 6× more raw results
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
    # Trades
    "plumber": [
        "plumber",
        "emergency plumber",
        "plumbing services",
        "heating engineer",
        "boiler repair",
        "drainage services",
    ],
    "electrician": [
        "electrician",
        "electrical contractor",
        "emergency electrician",
        "electrical services",
    ],
    "roofer": [
        "roofer",
        "roofing contractor",
        "roof repair",
        "flat roofing",
    ],
    "builder": [
        "builder",
        "construction company",
        "renovations",
        "property maintenance",
        "building contractor",
    ],
    "painter decorator": [
        "painter decorator",
        "painting services",
        "interior decorator",
        "exterior painting",
    ],
    "landscaper": [
        "landscaper",
        "garden design",
        "landscaping services",
        "gardening services",
    ],
    "locksmith": [
        "locksmith",
        "emergency locksmith",
        "lock repair",
    ],
    "plasterer": [
        "plasterer",
        "plastering services",
        "rendering services",
    ],
    "carpenter": [
        "carpenter",
        "joiner",
        "carpentry services",
        "fitted wardrobes",
    ],
    # Opportunity-rich UK trades (tend to be sole traders without websites)
    "window cleaner": [
        "window cleaner",
        "window cleaning services",
        "commercial window cleaning",
        "gutter cleaning",
    ],
    "gardener": [
        "gardener",
        "garden maintenance",
        "grass cutting",
        "hedge trimming",
    ],
    "handyman": [
        "handyman",
        "odd jobs",
        "home repairs",
        "property maintenance",
    ],
    "carpet cleaner": [
        "carpet cleaner",
        "carpet cleaning",
        "upholstery cleaning",
        "rug cleaning",
    ],
    "mobile mechanic": [
        "mobile mechanic",
        "mobile car repair",
        "roadside repair",
        "call-out mechanic",
    ],
    "dog groomer": [
        "dog groomer",
        "dog grooming",
        "pet grooming",
        "dog salon",
    ],
    # Hospitality
    "restaurant": [
        "restaurant",
        "takeaway",
        "cafe",
    ],
    "cafe": [
        "cafe",
        "coffee shop",
        "tea room",
    ],
    # Personal care
    "hair salon": [
        "hair salon",
        "barber",
        "hairdresser",
        "beauty salon",
    ],
    "beauty salon": [
        "beauty salon",
        "nail salon",
        "beauty therapist",
        "spa",
    ],
    "barber": [
        "barber",
        "barber shop",
        "mens hairdresser",
    ],
    # Automotive
    "auto repair": [
        "auto repair",
        "car mechanic",
        "car garage",
        "mot centre",
        "auto service",
    ],
    "mechanic": [
        "mechanic",
        "car mechanic",
        "auto repair",
        "mot garage",
    ],
    "car wash": [
        "car wash",
        "hand car wash",
        "car valeting",
        "car detailing",
    ],
    # Professional services
    "dentist": [
        "dentist",
        "dental practice",
        "dental clinic",
    ],
    "accountant": [
        "accountant",
        "accounting firm",
        "bookkeeper",
        "tax advisor",
    ],
    "solicitor": [
        "solicitor",
        "law firm",
        "legal services",
        "lawyer",
    ],
    "estate agent": [
        "estate agent",
        "property agent",
        "letting agent",
        "property management",
    ],
    "cleaning services": [
        "cleaning services",
        "domestic cleaning",
        "commercial cleaning",
        "office cleaning",
    ],
    "gym": [
        "gym",
        "fitness centre",
        "personal trainer",
        "crossfit",
    ],
    "physio": [
        "physio",
        "physiotherapist",
        "sports therapist",
        "osteopath",
    ],
    "hotel": [
        "hotel",
        "bed and breakfast",
        "guest house",
        "boutique hotel",
    ],
}

# ---------------------------------------------------------------------------
# Bulgarian Cyrillic translations (added on top for Bulgaria only)
# ---------------------------------------------------------------------------
_BULGARIA_TRANSLATIONS: dict[str, list[str]] = {
    "plumber":           ["водопроводчик", "ВиК услуги", "аварийни ВиК услуги"],
    "electrician":       ["електротехник", "ел услуги"],
    "roofer":            ["покривар", "покривни услуги"],
    "builder":           ["строителни услуги", "строителна фирма", "ремонти"],
    "painter decorator": ["бояджия", "бояджийски услуги"],
    "landscaper":        ["озеленяване", "градинар"],
    "locksmith":         ["ключар"],
    "plasterer":         ["мазач", "мазилки"],
    "carpenter":         ["дърводелец", "дърводелски услуги"],
    "restaurant":        ["ресторант"],
    "cafe":              ["кафе", "кафене"],
    "hair salon":        ["фризьорски салон", "салон за красота"],
    "beauty salon":      ["козметичен салон", "козметика"],
    "barber":            ["бръснар", "барбершоп"],
    "auto repair":       ["автосервиз"],
    "mechanic":          ["автомеханик", "автосервиз"],
    "car wash":          ["автомивка"],
    "dentist":           ["зъболекар", "дентален кабинет"],
    "accountant":        ["счетоводител", "счетоводна кантора"],
    "solicitor":         ["адвокат", "адвокатска кантора"],
    "estate agent":      ["имоти", "агенция за недвижими имоти"],
    "cleaning services": ["почистване", "почистваща фирма"],
    "gym":               ["фитнес", "фитнес зала"],
    "physio":            ["физиотерапевт", "рехабилитация"],
    "hotel":             ["хотел"],
    # New opportunity-rich categories
    "window cleaner":    ["миене на прозорци"],
    "gardener":          ["градинар", "озеленяване"],
    "handyman":          ["майстор", "ремонти"],
    "carpet cleaner":    ["пране на килими"],
    "dog groomer":       ["грумиране на кучета", "кучешки салон"],
}

# ---------------------------------------------------------------------------
# Cyrillic → English reverse mapping
# When the frontend sends a Bulgarian Cyrillic category (e.g. "Фризьор"),
# map it to the English key so the full expansion table is used.
# ---------------------------------------------------------------------------
_CYRILLIC_TO_ENGLISH: dict[str, str] = {
    "фризьор":          "hair salon",
    "козметичен салон": "beauty salon",
    "автосервиз":       "auto repair",
    "ключар":           "locksmith",
    "озеленяване":      "landscaper",
    "почистване":       "cleaning services",
    "майстор":          "builder",
    "вик услуги":       "plumber",
    "ресторант":        "restaurant",
    "хотел":            "hotel",
    "зъболекар":        "dentist",
    "фитнес":           "gym",
    "автомивка":        "car wash",
}


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

    # Normalise "painter & decorator" → "painter decorator"
    lower = lower.replace(" & ", " ")

    # Map Cyrillic frontend preset to English key
    english_key = _CYRILLIC_TO_ENGLISH.get(lower, lower)

    # Layer 1: English related searches (all countries)
    result = list(_ENGLISH_EXPANSIONS.get(english_key, [keyword.strip()]))

    # Layer 2: Bulgarian Cyrillic on top (Bulgaria only)
    if country and "bulgaria" in country.strip().lower():
        result += _BULGARIA_TRANSLATIONS.get(english_key, [])

    return result
