// One colour per compared place, in the order the places are listed, shared by every chart in Side by side (the slope
// chart, the yearly lines and the legend), so a place keeps its colour from chart to chart. Names and dashes go with
// it, so colour is never the only cue.
export const PLACE_COLORS = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)']
export const placeColor = (i) => PLACE_COLORS[i % PLACE_COLORS.length]
