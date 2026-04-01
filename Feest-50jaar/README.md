# Feest 50 jaar - Save the Date + RSVP

Kleine Node.js app met:
- publieke pagina: `/` (save the date + RSVP formulier)
- admin pagina: `/admin` (overzicht reacties)
- API endpoint: `POST /api/rsvp`
- reset endpoint: `POST /api/admin/reset` (alleen met admin token)

## 1) Installeren

```bash
cd Feest-50jaar
npm install
```

## 2) Configureren

```bash
cp .env.example .env
```

Kies in `.env` een sterk token:

```env
PORT=3000
ADMIN_TOKEN=hier-een-lang-geheim-token
```

## 3) Starten

```bash
npm start
```

Open:
- http://localhost:3000/
- http://localhost:3000/admin

## 4) Aanpassen

- Save-the-date tekst: `public/index.html`
- Styling: `public/style.css`
- Event-data (agenda knop): `public/app.js`
- Backend validatie/opslag: `server.js`

## Deploy tips

- Deploy op Render of Railway als Node web service.
- Zet `ADMIN_TOKEN` als environment variable in je hosting.
- Deel alleen de publieke URL van `/` via WhatsApp.

## Ingebouwde bescherming

- Honeypot botcheck in het formulier (`website` veld, verborgen voor echte bezoekers).
- Simpele rate limit op RSVP endpoint (max 8 verzoeken per IP per 10 minuten).
