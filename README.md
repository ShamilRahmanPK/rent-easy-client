# RentEasy web app

React, TypeScript and Vite. Talks to the API in `../server`.

```
npm install
npm run dev        # http://localhost:5173
npm run build      # production files in dist/
# API_URL=http://localhost:4100 npm run dev   # point the dev server at a different API
```

Start the API first (`cd ../server && npm run dev`). In development, Vite forwards `/api` and `/uploads` to `http://localhost:4000`, so the login cookie works without any CORS setup.

## Screens

| Area | Pages |
| --- | --- |
| Public | Home page (search, popular cities, latest homes by price), all homes with filters, home detail with photos and request to rent, sign in, create account, verify email, forgot and reset password |
| Account | Profile, identity and ID document, password, notification preferences, notifications, my rentals |
| Owner | List a property in four steps (details, photos, verification, review), my properties with continue-draft, manage a property (details, photos, ownership documents, units, show or hide) |
| Admin | Review desk, all properties and approval, rent requests, tenancies, people and roles, announcements, audit log |
| Super admin | Email server (SMTP) with test send, email wording, mail log, currency |

## Maps

Maps use [MapLibre GL](https://maplibre.org) with free [OpenFreeMap](https://openfreemap.org) vector tiles. No account or key is needed.

- **Owners** pin the exact spot while listing: click the map, drag the pin, search an address, or use their location.
- **Renters** see where a home is only if they ask: each home's page has a "Show on map" button that reveals the map. The homes list has no map view.
- **Address search** uses OpenStreetMap's free Nominatim service, only when the person presses Search. It is meant for light use (about one request a second). For a busy site, use a paid geocoder.
- **Another map provider** (MapTiler, Stadia, your own tiles): set `VITE_MAP_STYLE` to its style URL in `client/.env` and rebuild.
- The map code loads only on screens that show a map, so other pages stay light. If a browser cannot run WebGL, owners can type the coordinates and renters use the list view.

## Deploying

`npm run build`, then serve `dist/` with Nginx and proxy `/api` and `/uploads` to the API on the same domain. See `../server/README.md`.

## Structure

```
src/api         fetch wrapper with readable error messages
src/auth        signed-in user, shared across the app
src/components  layout, shared UI pieces, forms
src/pages       one file per screen (admin/ and owner/ for the staff and owner areas)
src/styles      design tokens and styles
```
