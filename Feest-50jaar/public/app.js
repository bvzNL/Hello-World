const form = document.getElementById('rsvpForm');
const formMessage = document.getElementById('formMessage');
const copyBtn = document.getElementById('copyBtn');
const shareText = document.getElementById('shareText');
const calendarBtn = document.getElementById('calendarBtn');
const heroTitle = document.getElementById('heroTitle');
const locationText = document.getElementById('locationText');
const timeText = document.getElementById('timeText');

const partyConfig = {
  hostName: 'Bart van der Zwan',
  location: '[LOCATIE INVULLEN]',
  dateLabel: 'zaterdag 20 juni 2026',
  birthdayLabel: '10 juni 2026',
  startTimeLabel: 'tussen 14:00 en 15:00 (nog te bevestigen)',
  endTimeLabel: 'rond 23:00 (nog te bevestigen)'
};

const eventConfig = {
  title: `50e verjaardagsfeest van ${partyConfig.hostName}`,
  location: partyConfig.location,
  details: `Inloop vanaf ${partyConfig.startTimeLabel}, einde rond ${partyConfig.endTimeLabel}. Om 19:00 aandacht voor de wedstrijd van Oranje.`,
  startIsoUtc: '20260620T123000Z',
  endIsoUtc: '20260620T210000Z'
};

heroTitle.textContent = `50 jaar feest op ${partyConfig.dateLabel}`;
locationText.textContent = partyConfig.location;
timeText.textContent = `Verwachte start: ${partyConfig.startTimeLabel}. Verwachte eindtijd: ${partyConfig.endTimeLabel}.`;

shareText.value = `Save the Date: op ${partyConfig.dateLabel} vier ik mijn 50e verjaardag.\nIk ben jarig op ${partyConfig.birthdayLabel} en hoop dat je erbij bent.\nInloop vanaf ${partyConfig.startTimeLabel}, tot ongeveer ${partyConfig.endTimeLabel}.\nOm 19:00 is er aandacht voor Oranje.\nRSVP via: ${window.location.origin}/`;

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(shareText.value);
    copyBtn.textContent = 'Gekopieerd';
    setTimeout(() => { copyBtn.textContent = 'Kopieer tekst'; }, 1500);
  } catch {
    copyBtn.textContent = 'Kopieren mislukt';
  }
});

calendarBtn.addEventListener('click', () => {
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', eventConfig.title);
  url.searchParams.set('dates', `${eventConfig.startIsoUtc}/${eventConfig.endIsoUtc}`);
  url.searchParams.set('location', eventConfig.location);
  url.searchParams.set('details', eventConfig.details);
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    fullName: form.fullName.value.trim(),
    attendance: form.attendance.value,
    guests: Number(form.guests.value),
    contact: form.contact.value.trim(),
    notes: form.notes.value.trim(),
    website: form.website.value.trim()
  };

  formMessage.textContent = 'Bezig met versturen...';
  formMessage.className = 'form-message';

  try {
    const response = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      const msg = data.errors?.join(' ') || data.error || 'Er ging iets mis.';
      throw new Error(msg);
    }

    form.reset();
    form.guests.value = 1;
    formMessage.textContent = 'Dankjewel, je RSVP is opgeslagen!';
    formMessage.className = 'form-message ok';
  } catch (error) {
    formMessage.textContent = error.message || 'Opslaan is mislukt. Probeer opnieuw.';
    formMessage.className = 'form-message err';
  }
});
