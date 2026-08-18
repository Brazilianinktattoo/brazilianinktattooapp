import type { CsvRow } from "@/lib/csv";
import { normalizePhone } from "@/lib/phone";

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

function normalizeKey(s: string) {
  return s
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .trim();
}

const NAME_KEYS = ["nome", "nome completo", "name", "full name", "cliente", "client name"];
const PHONE_KEYS = [
  "telefone",
  "telefone celular",
  "celular",
  "whatsapp",
  "fone",
  "phone",
  "contato",
  "telefone/whatsapp",
];
const BIRTHDAY_KEYS = [
  "aniversario",
  "data de nascimento",
  "nascimento",
  "data nascimento",
  "dob",
  "birthday",
];
const NOTES_KEYS = ["observacoes", "observacao", "obs", "notes", "notas"];

function findValue(row: CsvRow, keys: string[]): string {
  const normalizedRow: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    normalizedRow[normalizeKey(k)] = v;
  }
  for (const key of keys) {
    if (normalizedRow[key]) return normalizedRow[key];
  }
  return "";
}

export function parseBirthdayValue(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  let m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  m = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  m = value.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (m) {
    const [, d, mo] = m;
    return `1900-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

export type MappedClientRow = {
  name: string;
  phone: string;
  birthday: string | null;
  notes: string;
};

export function mapCsvRow(row: CsvRow): MappedClientRow {
  return {
    name: findValue(row, NAME_KEYS),
    phone: normalizePhone(findValue(row, PHONE_KEYS)),
    birthday: parseBirthdayValue(findValue(row, BIRTHDAY_KEYS)),
    notes: findValue(row, NOTES_KEYS),
  };
}
