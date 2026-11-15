# NASA Space App

**Found a great home? Don't forget your health.**

A web app that helps people check the long-term climate and air quality around a home they are considering. You tell the app who will live there and where the home is, and it builds a report that shows which environmental factors may matter most for your household's health.

> **Status:** work in progress. The frontend currently runs in **demo mode** with sample data. See [Demo mode](#demo-mode).

## How it works

The app is a short four-step flow:

1. **Health:** add each household member, choose an age group, and select any health conditions (asthma or lung disease, heart disease or high blood pressure, allergies, diabetes, kidney disease, or other).
2. **Location:** search for the address or place of the home. The result is pinned on an interactive map.
3. **Loading:** an animated four-season view while the app reviews a year of climate data and compares it with WHO / CDC limits.
4. **Report:** your result, including:
   - an overall assessment (High risk / Caution / Suitable) and a count of factors in each level
   - who may be most affected, based on the household profile
   - factor cards such as PM2.5, days per year at or above 95°F, heavy rain days and very dry days
   - annual trend and monthly comparison charts, with a slider to compare a past year with the latest data
   - recommended action
