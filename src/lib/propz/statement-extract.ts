// Extracción determinista (sin IA) de cartolas y boletas, ejecutada en el navegador.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export type ExtractedTxn = {
  txn_date: string | null;
  amount: number;
  description: string;
  payer_rut: string | null;
  payer_name: string | null;
};

export type ExtractedBill = {
  company: string | null;
  customer_id: string | null;
  period: string | null;
  issue_date: string | null;
  due_date: string | null;
  amount: number | null;
};

export async function sha256(file: File) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function fileKind(file: File): "pdf" | "excel" | "csv" | "image" | "otro" {
  const n = file.name.toLowerCase();
  if (n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".xlsx") || n.endsWith(".xls")) return "excel";
  if (n.endsWith(".csv") || n.endsWith(".txt")) return "csv";
  if (file.type.startsWith("image/")) return "image";
  return "otro";
}

const RUT_RE = /\b(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])\b/;
const DATE_RE = /\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/;
const AMOUNT_RE = /-?\$?\s?\d{1,3}(?:\.\d{3})+(?:,\d+)?|-?\$?\s?\d{4,}(?:,\d+)?/g;

export function normalizeRut(v: string | null | undefined) {
  if (!v) return null;
  const s = v.replace(/[^\dkK]/g, "").toUpperCase();
  return s.length >= 2 ? `${s.slice(0, -1)}-${s.slice(-1)}` : null;
}

function parseAmount(raw: unknown): number | null {
  if (typeof raw === "number") return raw;
  if (raw == null) return null;
  const s = String(raw).replace(/[$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) && s !== "" ? n : null;
}

function parseDate(raw: unknown): string | null {
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw.toISOString().slice(0, 10);
  if (typeof raw === "number" && raw > 20000 && raw < 80000) {
    return new Date(Math.round((raw - 25569) * 86400000)).toISOString().slice(0, 10);
  }
  const m = String(raw ?? "").match(DATE_RE);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  let y = m[3] ? Number(m[3]) : new Date().getFullYear();
  if (y < 100) y += 2000;
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const RUT_LOOSE_RE = /(?:rut\s*:?\s*)?\b(\d{1,2}\.?\d{3}\.?\d{3}\s?-\s?[\dkK]|0*\d{7,8}[\dkK])\b/i;
const NOISE_WORDS = new Set(
  "TRANSF TRANSFERENCIA TRANSFERENCIAS TRASPASO TEF DE DESDE A PARA RUT ABONO DEPOSITO DEPÓSITO PAGO RECIBIDA RECIBIDO OTROS BANCOS BANCO OTRO EN LINEA LÍNEA INTERNET ELECTRONICA ELECTRÓNICA CTA CTE CUENTA VISTA RUTA NRO N° DESDE: FONDOS TERCEROS MISMO DIA SPEI CHILE ESTADO SANTANDER BCI ITAU ITAÚ SCOTIABANK SECURITY FALABELLA RIPLEY BICE CONSORCIO MACH TENPO MERCADOPAGO COOPEUCH INTERNACIONAL S.A. SA SPA LTDA"
    .split(" "),
);

function payerFrom(desc: string) {
  const m = desc.match(RUT_RE) ?? desc.match(RUT_LOOSE_RE);
  const rawRut = m?.[1] ?? null;
  let rest = desc;
  if (m) rest = rest.replace(m[0], " ");
  // Nombre + apellido: secuencia de palabras alfabéticas que no sean términos bancarios.
  const words = rest
    .replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !NOISE_WORDS.has(w.toUpperCase()));
  const name = words.length >= 2 ? words.slice(0, 4).join(" ").toUpperCase() : null;
  return { payer_rut: normalizeRut(rawRut?.replace(/^0+/, "") ?? null), payer_name: name };
}

export function normalizeName(v: string | null | undefined) {
  return (v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/* -------------------------------- Tablas -------------------------------- */

function fromRows(rows: unknown[][]): ExtractedTxn[] {
  const norm = (v: unknown) =>
    String(v ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const headerIdx = rows.findIndex((r) => {
    const cells = r.map(norm);
    return cells.some((c) => c.includes("fecha")) && cells.some((c) => /monto|abono|deposito|glosa|descrip|detalle/.test(c));
  });
  if (headerIdx < 0) return [];
  const h = rows[headerIdx]!.map(norm);
  const col = (re: RegExp) => h.findIndex((c) => re.test(c));
  const cDate = col(/fecha/);
  const cDesc = col(/glosa|descrip|detalle|concepto/);
  const cCredit = h.findIndex((c) => /abono|deposito|credito/.test(c) && !/cargo|debito|giro/.test(c));
  const cAmount = cCredit >= 0 ? -1 : col(/monto|importe/);
  const cRut = col(/rut/);
  const cName = col(/nombre|origen|ordenante/);
  const out: ExtractedTxn[] = [];
  for (const r of rows.slice(headerIdx + 1)) {
    const amount = parseAmount(cCredit >= 0 ? r[cCredit] : cAmount >= 0 ? r[cAmount] : null);
    if (!amount || amount <= 0) continue;
    const description = cDesc >= 0 ? String(r[cDesc] ?? "").trim() : "";
    const p = payerFrom(description);
    out.push({
      txn_date: parseDate(r[cDate]),
      amount,
      description,
      payer_rut: normalizeRut(cRut >= 0 ? String(r[cRut] ?? "") : null) ?? p.payer_rut,
      payer_name: (cName >= 0 ? String(r[cName] ?? "").trim() || null : null) ?? p.payer_name,
    });
  }
  return out;
}

async function tableRows(file: File): Promise<unknown[][]> {
  if (fileKind(file) === "csv") {
    const Papa = (await import("papaparse")).default;
    const text = await file.text();
    return Papa.parse<unknown[]>(text, { skipEmptyLines: true }).data;
  }
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]!]!;
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true });
}

/* ---------------------------------- PDF ---------------------------------- */

type PdfRow = { text: string; parts: { x: number; s: string }[] };

export async function pdfLines(file: File): Promise<string[]> {
  return (await pdfRows(file)).map((r) => r.text);
}

async function pdfRows(file: File): Promise<PdfRow[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const lines: PdfRow[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const byY = new Map<number, { x: number; s: string }[]>();
    for (const it of content.items as { str: string; transform: number[] }[]) {
      if (!it.str?.trim()) continue;
      const y = Math.round(it.transform[5]!);
      const arr = byY.get(y) ?? [];
      arr.push({ x: it.transform[4]!, s: it.str });
      byY.set(y, arr);
    }
    [...byY.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, parts]) => {
        const sorted = parts.sort((a, b) => a.x - b.x);
        lines.push({ text: sorted.map((p) => p.s).join(" "), parts: sorted });
      });
  }
  return lines;
}

const AMOUNT_ONLY_RE = /^-?\$?\s?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/;

function txnsFromRows(rows: PdfRow[]): ExtractedTxn[] {
  // Ubica las columnas por el encabezado (Abonos / Cargos / Saldo) para leer el monto por fila.
  const header = rows.find((r) => r.parts.some((p) => /abono|dep[oó]sito|cr[eé]dito/i.test(p.s)));
  const colX = (re: RegExp) => header?.parts.find((p) => re.test(p.s))?.x ?? null;
  const abonoX = colX(/abono|dep[oó]sito|cr[eé]dito/i);
  const others = [colX(/cargo|d[eé]bito|giro/i), colX(/saldo/i)].filter((x): x is number => x != null);
  const out: ExtractedTxn[] = [];
  for (const row of rows) {
    if (row === header) continue;
    const date = parseDate(row.text.match(DATE_RE)?.[0]);
    if (!date) continue;
    const amountParts = row.parts.filter((p) => AMOUNT_ONLY_RE.test(p.s.trim()) && /\d{3}/.test(p.s));
    let amount: number | null = null;
    if (abonoX != null) {
      const inAbono = amountParts.filter((p) => others.every((o) => Math.abs(p.x - abonoX) < Math.abs(p.x - o)));
      amount = inAbono.length ? parseAmount(inAbono[0]!.s) : null;
    } else {
      amount = parseAmount(row.text.match(AMOUNT_RE)?.[0]);
    }
    if (!amount || amount <= 0) continue;
    const description = row.parts
      .filter((p) => !amountParts.includes(p) && !DATE_RE.test(p.s.trim()))
      .map((p) => p.s)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    out.push({ txn_date: date, amount, description, ...payerFrom(description) });
  }
  return out;
}

/** Devuelve los abonos detectados. Imágenes no se procesan (requieren ingreso manual). */
export async function extractStatement(file: File): Promise<ExtractedTxn[]> {
  const k = fileKind(file);
  if (k === "csv" || k === "excel") return fromRows(await tableRows(file));
  if (k === "pdf") return txnsFromRows(await pdfRows(file));
  return [];
}

/* -------------------------------- Boletas -------------------------------- */

const COMPANIES = [
  "Enel", "CGE", "Chilquinta", "Saesa", "Frontel", "Aguas Andinas", "Essbio", "Esval",
  "Aguas del Valle", "Nuevosur", "SMAPA", "Metrogas", "Abastible", "Lipigas", "Gasco",
  "Gasvalpo", "Edifito", "ComunidadFeliz", "Kastor",
];
const MONTHS = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre";

export async function extractBill(file: File): Promise<ExtractedBill> {
  const empty: ExtractedBill = { company: null, customer_id: null, period: null, issue_date: null, due_date: null, amount: null };
  if (fileKind(file) !== "pdf") return empty;
  const lines = await pdfLines(file);
  const text = lines.join("\n");
  const lower = text.toLowerCase();
  const near = (re: RegExp) => {
    const i = lines.findIndex((l) => re.test(l));
    return i < 0 ? "" : `${lines[i]} ${lines[i + 1] ?? ""}`;
  };
  const totalLine = near(/total\s+a\s+pagar|monto\s+a\s+pagar|total\s+gasto|total\s+mes/i);
  const amount = parseAmount(totalLine.match(AMOUNT_RE)?.[0]);
  return {
    company: COMPANIES.find((c) => lower.includes(c.toLowerCase())) ?? null,
    customer_id:
      text.match(/(?:n[°ºo.]?\s*(?:de\s*)?(?:cliente|cuenta|servicio|suministro)|depto\.?|unidad)\s*:?\s*([\w-]{3,})/i)?.[1] ?? null,
    period: text.match(new RegExp(`(${MONTHS})\\s*(?:de\\s*)?(\\d{4})`, "i"))?.[0] ?? null,
    issue_date: parseDate(near(/emisi[oó]n|fecha\s+de\s+emisi/i).match(DATE_RE)?.[0]),
    due_date: parseDate(near(/vencimiento|vence|pagar\s+hasta/i).match(DATE_RE)?.[0]),
    amount: amount && amount > 0 ? amount : null,
  };
}
