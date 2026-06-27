# Scraping & Lead Sources

## Provider System

All lead sources implement a common base in `providers/base.py`. The provider registry (`providers/registry.py`) maps provider names to their classes and returns availability status.

```
GET /providers
→ [{ source, label, available, note }, ...]
```

---

## Google Maps Places API

**File:** `providers/google_maps.py`

Uses the Places API (New) Text Search endpoint:
```
POST https://places.googleapis.com/v1/places:searchText
```

Key behaviours:
- Requests up to 60 results per city (3 pages × 20)
- Passes `languageCode` to get localized results (English for UK, Bulgarian for Bulgaria)
- Each result is normalized to a `ProviderLead` struct
- Results are then classified by `imports.py` to determine website status

**Cost:** ~$0.032 per API call. A single-city campaign ≈ 3 calls = ~$0.10.

### Required setup

1. Enable **Places API (New)** in [Google Cloud Console](https://console.cloud.google.com/)
2. Create an API key with Places API access
3. Set `GOOGLE_MAPS_API_KEY` in `.env`

---

## Yell.com Scraper

**File:** `providers/yell.py`

Scrapes `https://www.yell.com/ucs/UcsSearchAction.do?keywords={}&location={}` with BeautifulSoup.

- Supports up to 4 result pages
- Extracts: name, phone, address, website, category
- UK only
- May break if Yell changes their HTML structure

---

## FreeIndex Scraper

**File:** `providers/freeindex.py`

Scrapes `https://www.freeindex.co.uk/search.htm?k={keyword}%21{location}&v=a%21b`.

⚠️ The URL requires a literal `!` character (`%21` encoded). Must be built as a string — `httpx` params encoding breaks it.

---

## Website Status Classification

**File:** `services/imports.py` — `classify_website()`

Every imported business is classified into one of five statuses:

| Status | Criteria |
|--------|---------|
| `NO_WEBSITE` | No website field, or clearly not a real website |
| `FACEBOOK_ONLY` | URL contains `facebook.com` |
| `FREE_BUILDER` | Domain is Wix, Weebly, Site123, Yola, Jimdo, GoDaddy Sites, etc. |
| `BROKEN_WEBSITE` | Site unreachable (HTTP error or connection timeout) — checked at import time |
| `HAS_WEBSITE` | All other cases |

Only leads with status `NO_WEBSITE`, `FACEBOOK_ONLY`, `FREE_BUILDER`, or `BROKEN_WEBSITE` are considered "opportunities".

---

## Localization

**File:** `providers/localization.py`

### Keyword Expansion

For each category, `_ENGLISH_EXPANSIONS` maps it to related search terms:

```python
"Plumbers": ["plumber", "emergency plumber", "boiler repair", "heating engineer", "drain unblocking"]
"Hair Salons": ["hair salon", "hairdresser", "barber", "barbershop", "hair stylist"]
```

156 entries covering all UK categories.

### Bulgarian Translations

`_BULGARIA_TRANSLATIONS` maps English category names to Bulgarian:

```python
"Plumbers": "ВиК майстор",
"Hair Salons": "Фризьор",
"Restaurants": "Ресторант",
```

`_CYRILLIC_TO_ENGLISH` maps Cyrillic search terms back to English for classification.

---

## Category System

**File:** `frontend/lib/category-data.ts`

All categories are defined once in this file. **Never duplicate them in page components.**

### UK Categories (150+)

Organized into 13 groups:

| Group | Example categories |
|-------|-------------------|
| Home Trades | Plumbers, Electricians, Roofers, Builders |
| Automotive | Mechanics, MOT Centres, Car Washes, Tyre Shops |
| Health & Beauty | Hair Salons, Barbers, Dentists, Physios |
| Food & Drink | Restaurants, Cafes, Takeaways, Bakeries |
| Professional | Accountants, Solicitors, Estate Agents |
| Retail | Florists, Pet Shops, Jewellers |
| Fitness | Gyms, Personal Trainers, Martial Arts |
| Events | Wedding Venues, Photographers, Caterers |
| Cleaning | Domestic Cleaning, Carpet Cleaning, Window Cleaners |
| Education | Tutors, Driving Instructors, Music Teachers |
| Pets | Vets, Dog Groomers, Pet Boarding |
| Childcare | Nurseries, After School Clubs |
| Other | Locksmiths, Skip Hire, Storage |

### Bulgaria Categories (43)

8 groups with Cyrillic names, Google Maps language set to Bulgarian.

---

## CSV Import Format

The CSV import accepts any delimiter (auto-detected). Required column names (case-insensitive):

| Column | Required | Notes |
|--------|----------|-------|
| `name` / `business name` | ✅ | |
| `phone` | ❌ | |
| `email` | ❌ | |
| `website` | ❌ | Used for classification |
| `address` | ❌ | |
| `city` | ❌ | |
| `country` | ❌ | |
| `category` | ❌ | |
| `rating` | ❌ | Numeric 0–5 |
| `review_count` / `reviews` | ❌ | |

Rows with duplicate phone or name+address are skipped on import.
