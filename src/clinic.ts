// Public sundhed.dk "Find behandler" API (found via the browser network tab on
// https://www.sundhed.dk/borger/guides/find-behandler/?orgId=<id>). No auth needed.
export const clinicApiUrl = (clinicId: string) =>
  `https://www.sundhed.dk/app/findbehandlerv2/api/v1/findbehandlerv2/klinik/${encodeURIComponent(clinicId)}`;

export const clinicPageUrl = (clinicId: string) =>
  `https://www.sundhed.dk/borger/guides/find-behandler/?orgId=${encodeURIComponent(clinicId)}&hideNewSearch=1`;

export interface Clinic {
  Identifier: number;
  Navn: string;
  Adresse?: string;
  Postnummer?: string;
  By?: string;
  /** true when the practice is open for new patients ("åben for tilgang"). */
  AabenForTilgang: boolean;
  OevrigeOplysninger?: { Tekst: string }[];
  SidstOpdateret?: string;
}

/** Throws if the response doesn't look like what we expect, so a silent API change surfaces as a Lambda error. */
export function parseClinic(body: unknown): Clinic {
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Clinic).AabenForTilgang !== "boolean" ||
    typeof (body as Clinic).Navn !== "string"
  ) {
    throw new Error(`Unexpected clinic API response: ${JSON.stringify(body)?.slice(0, 500)}`);
  }
  return body as Clinic;
}

export const isAcceptingNewPatients = (clinic: Clinic) => clinic.AabenForTilgang === true;

export async function fetchClinic(clinicId: string, fetchImpl: typeof fetch = fetch): Promise<Clinic> {
  const res = await fetchImpl(clinicApiUrl(clinicId), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`Clinic API returned HTTP ${res.status} ${res.statusText}`);
  }
  return parseClinic(await res.json());
}
