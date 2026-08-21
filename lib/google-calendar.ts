import { createSign } from "crypto";

// Espelha agendamentos no Google Agenda da unidade (app -> Google, mão
// única) via uma service account do Google Cloud. Cada unidade compartilha
// sua agenda com o e-mail da service account (permissão "Fazer alterações
// nos eventos") e guarda o calendarId em units.google_calendar_id.
//
// Sem googleapis de propósito — é uma dependência pesada pra só assinar um
// JWT e chamar 2 endpoints REST. Usa crypto nativo do Node.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const SCOPE = "https://www.googleapis.com/auth/calendar";

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function serviceAccountCredentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );
  if (!email || !privateKey) return null;
  return { email, privateKey };
}

async function getAccessToken(): Promise<string | null> {
  const creds = serviceAccountCredentials();
  if (!creds) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: creds.email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  signer.end();
  const signature = base64url(signer.sign(creds.privateKey));
  const assertion = `${header}.${claim}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    console.error("google-calendar: falha ao obter access token", await res.text());
    return null;
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export type CalendarEventInput = {
  calendarId: string;
  eventId: string | null;
  summary: string;
  description: string;
  startISO: string;
  endISO: string;
};

// Cria ou atualiza o evento; retorna o eventId (novo ou o mesmo recebido) ou
// null se a sincronização não está configurada ou falhou. Nunca lança —
// falha de sync não pode derrubar o fluxo de agendamento.
export async function upsertCalendarEvent(
  input: CalendarEventInput
): Promise<string | null> {
  try {
    const token = await getAccessToken();
    if (!token) return null;

    const body = JSON.stringify({
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.startISO },
      end: { dateTime: input.endISO },
    });

    const url = input.eventId
      ? `${CALENDAR_API}/calendars/${encodeURIComponent(input.calendarId)}/events/${input.eventId}`
      : `${CALENDAR_API}/calendars/${encodeURIComponent(input.calendarId)}/events`;

    const res = await fetch(url, {
      method: input.eventId ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
    });

    if (!res.ok) {
      console.error("google-calendar: falha ao salvar evento", await res.text());
      return null;
    }
    const json = (await res.json()) as { id: string };
    return json.id;
  } catch (err) {
    console.error("google-calendar: erro inesperado ao salvar evento", err);
    return null;
  }
}

export async function deleteCalendarEvent(
  calendarId: string,
  eventId: string
): Promise<void> {
  try {
    const token = await getAccessToken();
    if (!token) return;

    const res = await fetch(
      `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      console.error("google-calendar: falha ao apagar evento", await res.text());
    }
  } catch (err) {
    console.error("google-calendar: erro inesperado ao apagar evento", err);
  }
}
