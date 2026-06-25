"""
Static neighbor-town mappings for multi-city search expansion.

When expand_neighbors=True, a search for a major city is automatically
extended to its surrounding towns, giving broader coverage with a single
search request.
"""

_UK_NEIGHBORS: dict[str, list[str]] = {
    # Scotland
    "glasgow":     ["Paisley", "Clydebank", "East Kilbride", "Renfrew", "Bearsden"],
    "edinburgh":   ["Livingston", "Kirkcaldy", "Dunfermline", "Musselburgh", "Dalkeith"],
    # North West England
    "manchester":  ["Salford", "Stockport", "Oldham", "Bolton", "Rochdale", "Wigan"],
    "liverpool":   ["Birkenhead", "Runcorn", "Warrington", "St Helens", "Bootle"],
    # Yorkshire
    "leeds":       ["Bradford", "Wakefield", "Huddersfield", "Halifax", "Batley"],
    "sheffield":   ["Rotherham", "Barnsley", "Doncaster", "Chesterfield"],
    # Midlands
    "birmingham":  ["Solihull", "Wolverhampton", "Coventry", "Walsall", "West Bromwich"],
    "nottingham":  ["Derby", "Leicester", "Loughborough", "Ilkeston"],
    # London + South East
    "london":      ["Croydon", "Bromley", "Enfield", "Harrow", "Romford"],
    "reading":     ["Slough", "Maidenhead", "Wokingham", "Bracknell"],
    # South West
    "bristol":     ["Bath", "Weston-super-Mare", "Gloucester", "Cheltenham"],
    # Wales
    "cardiff":     ["Newport", "Barry", "Bridgend", "Pontypridd"],
    # North East
    "newcastle":   ["Gateshead", "Sunderland", "Durham", "Middlesbrough"],
    # South
    "southampton": ["Portsmouth", "Fareham", "Eastleigh", "Totton"],
    "brighton":    ["Hove", "Worthing", "Eastbourne", "Lewes"],
}

_BULGARIA_NEIGHBORS: dict[str, list[str]] = {
    "sofia":   ["Pernik", "Dupnitsa", "Samokov", "Botevgrad", "Bozhurishte"],
    "varna":   ["Devnya", "Beloslav", "Aksakovo", "Provadiya"],
    "plovdiv": ["Asenovgrad", "Rakovski", "Stamboliyski", "Karlovo"],
    "burgas":  ["Nesebar", "Aytos", "Pomorie", "Sredets"],
    "ruse":    ["Byala", "Tsenovo", "Ivanovo"],
}


def get_neighbors(city: str, country: str | None = None) -> list[str]:
    """Return neighboring towns for the given city, or [] if unknown."""
    key = city.strip().lower()
    if country and "bulgaria" in country.lower():
        return list(_BULGARIA_NEIGHBORS.get(key, []))
    return list(_UK_NEIGHBORS.get(key, []))
