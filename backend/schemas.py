"""The /api/v1 contract: what the frontend may rely on (docs/TEAM_HANDOFF.md section 5).

Reports and map fields allow extra keys, so the pipeline can add a field without breaking the API.
`backend/openapi.v1.json` is the reviewed copy of this contract; `test_contract.py` fails when it drifts.
"""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Open(BaseModel):
    """A model that keeps fields it doesn't list (the pipeline may add some)."""
    model_config = ConfigDict(extra="allow")


# ---- errors -------------------------------------------------------------------------------------------------------
class ErrorDetail(BaseModel):
    code: str          # stable, for code: invalid_input, not_found, not_built, upstream_unavailable, internal
    message: str       # one plain sentence for people; never a path or an exception


class ErrorOut(BaseModel):
    error: ErrorDetail


# ---- small things -------------------------------------------------------------------------------------------------
class Health(BaseModel):
    ok: bool
    store: Literal["postgres", "files"]


class Place(BaseModel):
    name: str
    lat: float
    lon: float


class Suggestion(Place):
    kind: str                                   # State, City, Town, ZIP code, Village, County, Address, Street,
                                                # Neighborhood, Small place, Landmark, Picked spot
    main: str | None = None                     # the first line ("Spokane", "98101", "1600 Pennsylvania Avenue NW")
    secondary: str | None = None                # the second line ("WA", "Seattle, WA", "United States")
    extent: list[float] | None = None           # west, south, east, north: frame the map on a state, county or city
    region: str | None = None                   # a state's postal code, so a state pick can open the state view


class RegionOutline(BaseModel):
    code: str
    name: str
    bbox: list[float]                            # west, south, east, north
    rings: list[list[list[float]]]               # [lon, lat] rings (Census cartographic outline, simplified)


class Demo(BaseModel):
    name: str
    lat: float
    lon: float
    conditions: list[str]
    age_groups: list[str]


# ---- the report ---------------------------------------------------------------------------------------------------
class YearValue(BaseModel):
    year: int
    value: float | None = None


class TrendPoint(BaseModel):
    year: int
    trend: float | None = None
    lo95: float | None = None
    hi95: float | None = None


class MonthValue(BaseModel):
    month: str         # "2001-07"
    value: float | None = None
    anomaly: float | None = None
    z: float | None = None                       # how unusual for its calendar month (SD units); null if that month never varies


class Decade(BaseModel):
    decade: str
    years: list[int]
    average: float | None = None
    n_years: int


class Highlights(Open):
    worst_year: YearValue | None = None
    best_year: YearValue | None = None
    top3_worst: list[YearValue] = []


class Timeline(Open):
    rolling_5yr: list[YearValue] = []
    decades: list[Decade] = []
    highlights: Highlights | None = None
    unusual_years: list[YearValue] = []


class Limits(Open):
    caution_from: float | None = None
    high_from: float | None = None
    source: str | None = None
    high_source: str | None = None
    reference_only: float | None = None      # a reference line drawn without a level (PM2.5: the WHO guideline, 5)


class Story(Open):
    happened: str | None = None
    is_it_real: str | None = None
    why_it_matters: str | None = None
    what_it_likely_means: str | None = None


class SourceLink(Open):
    name: str | None = None
    url: str | None = None


class HealthFlag(Open):
    level: str | None = None
    groups: list[str] = []
    text: str | None = None


class MonthlyClasses(BaseModel):
    value: list[float] = []     # equal-count edges of the monthly values (heatmap colours)
    anomaly: list[float] = []   # edges of anomaly size, used on both sides of zero


class SeasonalOverall(BaseModel):
    slope_per_year: float
    slope_per_decade: float                      # same unit as the yearly headline (counts: per year total)
    p: float
    p_label: str
    clear: bool                                  # p < 0.05 and a non-zero rate
    n_years: int                                 # complete years (a year missing a month is left out)
    method: str


class SeasonalTrend(BaseModel):
    name: str                                    # winter, spring, summer, autumn, or Jan..Dec
    available: bool
    slope_per_decade: float | None = None
    p: float | None = None
    q: float | None = None                       # Benjamini-Hochberg across the 4 seasons or the 12 months
    clear: bool | None = None                    # q < 0.05
    n_years: int | None = None


class AnomalyTest(BaseModel):
    p: float
    p_label: str
    slope_per_decade: float
    method: str                                  # Hamed-Rao, pre-whitening, or no change


class YearsNeeded(BaseModel):
    even_odds: int                               # years for a 50% chance of a clear result (Weatherhead 1998)
    likely: int                                  # years for a 90% chance
    sigma: float
    phi: float


class MonthNormal(BaseModel):
    month: int                                   # 1..12
    p10: float | None = None                     # the calendar month's usual range over the period
    p25: float | None = None
    p50: float | None = None
    p75: float | None = None
    p90: float | None = None


class Seasonal(BaseModel):
    overall: SeasonalOverall
    seasons: list[SeasonalTrend]
    months: list[SeasonalTrend]
    anomaly_test: AnomalyTest
    years_needed: YearsNeeded | None = None      # null when the rate is zero
    normals: list[MonthNormal] = []              # usual range per calendar month ("this year vs normal")
    season_agg: Literal["sum", "mean", "max"]


class LeaveOneOutYear(BaseModel):
    year: int
    p: float
    clear: bool
    slope_per_decade: float                      # Sen's slope without that year


class LeaveOneOut(BaseModel):
    clear: bool                                  # the yearly Mann-Kendall verdict with every year
    years: list[LeaveOneOutYear]                 # the same test with each year left out
    flips: list[int]                             # years whose removal changes the verdict


class Factor(Open):
    key: str
    label: str
    available: bool
    reason: str | None = None                    # why it isn't available
    parent: str | None = None
    constant: bool = False
    unit: str | None = None
    unit_short: str | None = None
    data_source: str | None = None
    definition: str | None = None
    caveat: str | None = None
    period: list[int] = []
    n_years: int | None = None
    then_years: list[int] = []
    now_years: list[int] = []
    then: float | None = None
    now: float | None = None
    change_then_to_now: float | None = None
    slope_per_decade: float | None = None        # OLS rate per decade
    slope_ci95_per_decade: list[float | None] = []
    mk_p: float | None = None                    # Mann-Kendall p
    significant: bool | None = None
    significance_label: str | None = None
    p_label: str | None = None
    usual_range: list[float | None] = []
    level: str | None = None                     # suitable, caution, high_risk; null = trend only
    trend_direction: Literal["worsening", "improving", "no_clear_trend"] | None = None
    points: list[YearValue] = []
    line: list[TrendPoint] = []
    monthly: list[MonthValue] = []
    monthly_classes: MonthlyClasses | None = None
    seasonal: Seasonal | None = None             # monthly and seasonal tests (A2); null with too few complete years
    leave_one_out: LeaveOneOut | None = None     # "without 2023 the trend is ..." (A2 events page)
    limits: Limits | None = None
    story: Story | None = None
    timeline: Timeline | None = None
    source: SourceLink | None = None
    priority_for_user: bool | None = None
    affects: list[str] = []
    health_flag: HealthFlag | None = None


class Location(Open):
    lat: float
    lon: float
    name: str | None = None


class UserProfile(Open):
    conditions: list[str] = []
    condition_labels: list[str] = []
    age_groups: list[str] = []
    age_group_labels: list[str] = []


class NotableYear(BaseModel):
    year: int
    factors: list[str]
    text: str


class Action(Open):
    factor: str
    label: str
    actions: list[str] = []
    source: SourceLink | None = None


class OtherCheck(Open):
    label: str
    text: str
    url: str | None = None


class GroupNote(Open):
    group: str
    factors: list[str] = []
    text: str


class Report(Open):
    location: Location
    user: UserProfile
    period: list[int]
    overall: str | None = None
    overall_drivers: list[str] = []
    worsening_factors: list[str] = []
    verdict_rule: str | None = None
    card_order: list[str] = []
    notable_years: list[NotableYear] = []
    factors: dict[str, Factor]
    actions: list[Action] = []
    other_checks: list[OtherCheck] = []
    not_good_for: list[GroupNote] = []
    data_status: dict[str, str] = {}
    data_quality: dict = {}
    thresholds_version: str | None = None


# ---- the US map field ---------------------------------------------------------------------------------------------
class Grid(BaseModel):
    lats: list[float]
    lons: list[float]
    dlat: float
    dlon: float


class Strongest(Open):
    lat: float
    lon: float
    slope_per_decade: float
    where: str


class FieldSummary(Open):
    cells: int
    rising_pct: float
    falling_pct: float
    rising_fdr_pct: float
    falling_fdr_pct: float
    strongest_rise: Strongest | None = None
    strongest_fall: Strongest | None = None


class TrendField(Open):
    factor: Literal["pm25", "no2", "fires", "smoke_days", "aod"]
    label: str
    unit: str
    higher_is_worse: bool = True
    period: list[int]
    then_years: list[int]
    now_years: list[int]
    grid: Grid
    breaks: list[float]                 # change-per-decade colour edges (4, symmetric)
    level_breaks: list[float] = []      # Then/Now colour edges
    alpha: float
    alpha_fdr: float
    slope: list[float | None]           # one per cell, row-major (lats × lons); null = no data
    p: list[float | None]
    then: list[float | None]
    now: list[float | None]
    sig: list[int]                      # p < alpha
    fdr: list[int]                      # also passes the map-wide false-discovery check
    summary: FieldSummary
    source: str


# --- A2: state averages and events -------------------------------------------------------------------------------

class RegionInfo(BaseModel):
    code: str                                    # postal code, e.g. "WI"
    name: str
    bbox: list[float]                            # west, south, east, north


class RegionVariable(BaseModel):
    key: str
    label: str
    unit: str
    definition: str | None = None
    first_year: int                              # 1981 for NASA POWER weather; 2001 PM2.5; 2005 NO2


class RegionList(BaseModel):
    regions: list[RegionInfo]
    variables: list[RegionVariable]
    periods: list[int]                           # 45 = 1981-2025, NASA POWER weather only


class RegionRef(RegionInfo):
    kind: Literal["state"]


class RegionSeries(Open):
    region: RegionRef
    variable: str
    period_years: int | None = None              # None when the dataset doesn't cover this state (its grid is the lower 48)
    first_year_available: int | None = None
    factor: Factor                               # the same card shape as a report's factors


class EventSource(BaseModel):
    name: str
    url: str


class Event(BaseModel):
    id: str
    title: str
    type: Literal["smoke", "heat", "cold", "rain", "drought", "fire"]
    start: str                                   # "2023-06-01"
    end: str
    precision: Literal["day", "month"]
    states: list[str]
    variables: list[str]                         # which cards should show it
    summary: str
    source: EventSource


class EventList(BaseModel):
    region: str | None = None                    # the state used to filter, if any
    events: list[Event]


# --- A3: place comparison ------------------------------------------------------------------------------------------

class CompareCell(BaseModel):
    now: float | None = None                     # 2021-2025 mean
    then: float | None = None                    # 2001-2005 mean
    slope_per_decade: float | None = None
    p: float | None = None                       # this city's own Mann-Kendall p
    q: float | None = None                       # Benjamini-Hochberg across all cities for this factor
    clear: bool | None = None                    # q < 0.05 and a non-zero rate
    level: str | None = None
    direction: str | None = None
    last5: list[YearValue] = []


class CompareCity(BaseModel):
    name: str
    state: str
    lat: float
    lon: float
    factors: dict[str, CompareCell]


class CompareFactor(BaseModel):
    key: str
    label: str
    unit: str
    unit_short: str
    decimals: int = 1
    caution_from: float | None = None
    high_from: float | None = None
    higher_is_worse: bool = True


class CompareTable(BaseModel):
    period: list[int]
    cities: list[CompareCity]
    factors: list[CompareFactor]
    thresholds_version: str | None = None


# --- A3: week by week ----------------------------------------------------------------------------------------------

class WeekBlock(BaseModel):
    week: int                                    # 1-52, fixed 7-day blocks from 1 January
    start: str                                   # "06-25"
    end: str
    value: float | None = None
    p10: float | None = None
    p25: float | None = None
    p50: float | None = None
    p75: float | None = None
    p90: float | None = None
    unusual: Literal["high", "low"] | None = None   # outside the 10th-90th percentile range


class Weekly(BaseModel):
    variable: str
    label: str
    unit: str
    about: str
    year: int
    period: list[int]
    location: dict[str, float]
    source: str
    blocks: list[WeekBlock]


# --- A4: patterns and signs of change ------------------------------------------------------------------------------

class Relation(BaseModel):
    a: str                                       # leads (or the first of the pair when lag is 0)
    b: str
    lag: int                                     # months by which a leads b
    r: float                                     # Spearman, on calendar-month z-scores
    p: float                                     # with an effective sample size for month-to-month memory
    q: float                                     # Benjamini-Hochberg across every pair and lag tested
    n: int
    clear: bool                                  # q < 0.05 and |r| >= 0.2
    same_source: bool = False                    # both from one dataset: partly built in, not a finding
    sentence: str
    lead_hits: dict | None = None                # clear cross-dataset links with a lead: hit rate vs 1 in 10 by chance


class MapFrames(Open):
    factor: str
    label: str
    unit: str
    grid: dict                                   # lats, lons, dlat, dlon (as on the trend field)
    years: list[int]                             # the last year of each frame
    span: int = 1                                # years per frame: 3 = trailing 3-year mean (fires, smoke days)
    base_years: list[int]                        # [first, last] of the early years that "change" is measured from
    level_breaks: list[float]                    # one set of colour classes for every year
    change_breaks: list[float]                   # four symmetric edges for the change view
    values: list[list[float | None]]             # [year][cell], row by row; None outside the US or with no data
    change: list[list[float | None]]             # [year][cell]: value minus the cell's early-years mean
    us_mean: list[float | None]                  # area-weighted US mean per year
    us_change: list[float | None]                # area-weighted US mean of change per year


class PatternPair(BaseModel):
    a: str
    b: str
    months: list[dict]                           # {month: 'YYYY-MM', a, b}: detrended calendar-month z, 3-month mean


class WinterValue(Open):
    year: int                                    # a winter is named by its January (2016 = Dec 2015 to Feb 2016)
    phase: str                                   # el_nino | la_nina | neutral
    value: float                                 # the record's Dec-Feb mean with its straight-line trend taken out


class WinterPhase(Open):
    phase: str
    n: int                                       # winters of this phase
    above: int                                   # of them, above the other winters' median
    below: int
    diff: float                                  # median of this phase minus the others' median, in the record's unit
    p: float                                     # Mann-Whitney U, two-sided
    q: float                                     # Benjamini-Hochberg across every record and phase tested
    clear: bool
    sentence: str


class WinterRecord(Open):
    key: str
    label: str
    unit: str | None = None
    values: list[WinterValue]
    phases: list[WinterPhase]


class Winter(Open):
    year: int
    phase: str
    index: float                                 # Dec-Feb RONI


class Winters(Open):
    """El Nino and La Nina winters (round 4, D42): how a place's records sat in each phase's winters against the other
    winters, detrended, 2001-2025. Describes the past; not a seasonal outlook."""
    index: str
    edge: float
    first: int | None = None
    last: int | None = None
    winters: list[Winter]
    records: list[WinterRecord]
    tested: int


class Patterns(Open):
    place: dict
    period: list[int] | None = None
    relations: list[Relation]
    relations_tested: int                        # tests in the Benjamini-Hochberg correction (pairs x lags x directions)
    labels: dict[str, str] = {}                  # variable key -> its label
    units: dict[str, str | None] = {}
    warnings: list[dict]                         # per variable: rolling variance and memory, and exceedance
    compound: list[dict]                         # compound extremes per year with a trend
    complete: bool = True                        # False when a source didn't answer: counts can change next time (L9)
    winters: Winters | None = None               # None when the index file isn't there


class ReportRequest(BaseModel):
    """POST /reports: the point, the period and the household. The household rides in the body so it is never in a URL
    or an access log (D38). Keys are from data_pipeline/config/conditions.json; the service checks them."""
    model_config = ConfigDict(extra="forbid")
    lat: float = Field(ge=18, le=72)                 # US incl. Alaska, Hawaii
    lon: float = Field(ge=-180, le=-65)
    conditions: list[str] = Field(default=["none"], min_length=1, max_length=10)
    age_groups: list[str] = Field(default=["18_64"], min_length=1, max_length=4)
    period: int = 25
    start: int | None = None
    end: int | None = None
