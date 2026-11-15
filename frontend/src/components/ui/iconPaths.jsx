// Icons: Lucide (https://lucide.dev, ISC License) through lucide-react, which Next.js tree-shakes to the icons used.
// Names here are the app's own, so swapping a drawing never touches the pages.
import {
  Activity, ChevronLeft, Pause, Play, RotateCcw, ArrowDownRight, ArrowUp, ArrowUpRight, Calendar, Car, ChartScatter, Check, ChevronDown, ChevronRight, CloudFog, CloudRain,
  Building2, Droplets, ExternalLink, Eye, Flame, Gauge, GitCompareArrows, Hash, Haze, History, House, Info, Layers, Link2, Map as MapIcon, MapPin, Menu, Minus, Moon,
  MousePointerClick, PanelLeftClose, PanelLeftOpen, Plus, Route, Satellite, Scale, Search, Snowflake, Sun, Thermometer, TriangleAlert, Users, Waves, Wind, X,
} from 'lucide-react'

export const PATHS = {
  search: Search, x: X, map: MapIcon, building: Building2, hash: Hash, route: Route, history: History, 'panel-close': PanelLeftClose, 'panel-open': PanelLeftOpen, 'arrow-up': ArrowUp, 'chevron-down': ChevronDown, 'chevron-right': ChevronRight, check: Check, info: Info, menu: Menu,
  'map-pin': MapPin, users: Users, calendar: Calendar, layers: Layers, scale: Scale, 'external-link': ExternalLink,
  'trend-up': ArrowUpRight, 'trend-down': ArrowDownRight, minus: Minus, thermometer: Thermometer, moon: Moon, sun: Sun,
  snowflake: Snowflake, droplets: Droplets, 'cloud-rain': CloudRain, 'cloud-fog': CloudFog, wind: Wind, flame: Flame, car: Car,
  // A3/A4 additions
  waves: Waves, haze: Haze, satellite: Satellite, activity: Activity, warning: TriangleAlert, link: Link2, scatter: ChartScatter,
  compare: GitCompareArrows, home: House, plus: Plus, eye: Eye, gauge: Gauge, pointer: MousePointerClick,
  // D36: the animated map's player
  play: Play, pause: Pause, replay: RotateCcw, 'chevron-left': ChevronLeft,
}

// eslint-disable-next-line react-refresh/only-export-components -- a list of names for /kit, beside the icon table
export const ICONS = Object.keys(PATHS)
