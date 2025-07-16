def calculate_total(row: dict) -> int:
    stations = [
        "vflash1", "hipot1", "ats1",
        "heatup", "burnin", "hipot2",
        "ats2","vflash2", "ats3"
    ]
    return sum(row.get(station, 0) for station in stations)