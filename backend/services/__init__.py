"""Use cases. Routes call these; these call the store and the data pipeline. Nothing here knows about HTTP."""
from dataclasses import dataclass

from backend.services.maps import MapService
from backend.services.patterns import PatternsService
from backend.services.places import PlaceService
from backend.services.regions import EventService, RegionService
from backend.services.weekly import WeeklyService
from backend.services.reports import ReportService
from backend.store import make_store


@dataclass
class Services:
    store: object
    reports: ReportService
    places: PlaceService
    maps: MapService
    regions: RegionService | None = None
    events: EventService | None = None
    weekly: WeeklyService | None = None
    patterns: PatternsService | None = None


def make_services(store=None):
    import pipeline
    from sources import modis_lst
    from paths import load_json
    from sources import power_region
    from tools.export_demo import DEMOS

    store = store or make_store()
    reports = ReportService(store, pipeline.build_neutral_report, lambda lat, lon: modis_lst.cache_file(lat, lon).exists(),
                            personalize=pipeline.apply_household)
    states = power_region.load_states()
    regions = RegionService(store, pipeline.build_region, states)
    return Services(
        store=store,
        reports=reports,
        places=PlaceService(store),
        maps=MapService(store, DEMOS),
        regions=regions,
        events=EventService(load_json("events.json")["events"], power_region.state_at, states),
        weekly=WeeklyService(pipeline.build_weekly, list(pipeline.WEEKLY_VARS)),
        patterns=PatternsService(reports, regions),
    )
