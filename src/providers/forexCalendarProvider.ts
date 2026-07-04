import axios from 'axios';

type RawForexCalendarEvent = {
  date?: string;
  time?: string;
  currency?: string;
  event?: string;
  actual?: string;
  forecast?: string;
  previous?: string;
};

type TransformedForexCalendarEvent = RawForexCalendarEvent & {
  id: string;
  country: string;
  impact: 'High' | 'Medium' | 'Low';
};

const API_HOST = process.env.RAPID_API_FOREX_CALENDAR_HOST || 'forex-calendar.p.rapidapi.com';
const API_KEY = process.env.RAPIDAPI_KEY;

if (!API_KEY) {
  throw new Error('RAPIDAPI_KEY is not configured in .env');
}

const client = axios.create({
  baseURL: `https://${API_HOST}`,
  timeout: 15000,
  headers: {
    'x-rapidapi-host': API_HOST,
    'x-rapidapi-key': API_KEY,
    'Content-Type': 'application/json',
  },
});

const HIGH_IMPACT_PATTERNS = /interest rate|rate decision|non farm payroll|nfp|unemployment|inflation|cpi|ppi|gdp|central bank|fed|ecb|bank of england|boe|bank of japan|boj/i;
const MEDIUM_IMPACT_PATTERNS = /consumer|retail|manufacturing|industrial|services|business|pmi|inventory|trade|balance|confidence|survey/i;

function normalizeImpact(event?: string, currency?: string): 'High' | 'Medium' | 'Low' {
  const text = `${event ?? ''} ${currency ?? ''}`;
  if (HIGH_IMPACT_PATTERNS.test(text)) return 'High';
  if (MEDIUM_IMPACT_PATTERNS.test(text)) return 'Medium';
  return 'Low';
}

function buildId(event: RawForexCalendarEvent, index: number): string {
  const safeDate = event.date?.replace(/[^0-9]/g, '') ?? 'unknown';
  const safeTime = event.time?.replace(/[^0-9apmAPM:]/g, '') ?? 'unknown';
  const safeCurrency = event.currency?.replace(/[^A-Z]/gi, '') ?? 'GLOBAL';
  const safeName = event.event?.replace(/[^a-zA-Z0-9]/g, '-') ?? 'event';
  return `${safeDate}-${safeTime}-${safeCurrency}-${safeName}-${index}`;
}

function normalizeEvent(event: RawForexCalendarEvent, index: number): TransformedForexCalendarEvent {
  const country = event.currency?.trim() || 'GLOBAL';
  return {
    id: buildId(event, index),
    country,
    impact: normalizeImpact(event.event, event.currency),
    date: event.date ?? '',
    time: event.time ?? '',
    currency: event.currency ?? '',
    event: event.event ?? '',
    actual: event.actual ?? '',
    forecast: event.forecast ?? '',
    previous: event.previous ?? '',
  };
}

export async function fetchForexCalendar(timezone = 'America/New_York'): Promise<TransformedForexCalendarEvent[]> {
  const response = await client.get('/api/v1/forex_calendar/forex_calendar', {
    params: {
      use_12h: true,
      target_timezone: timezone,
    },
  });

  const payload = response.data;
  const calendar = Array.isArray(payload?.calendar) ? payload.calendar : [];
  return calendar.map((item: RawForexCalendarEvent, index: number) => normalizeEvent(item, index));
}
