import { useMemo, useRef, useState } from "react";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value && value.text != null) return String(value.text);
    if ("result" in value) return cellToString(value.result as ExcelJS.CellValue);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((t) => t.text).join("");
    }
    if ("hyperlink" in value && "text" in value) return String((value as { text: string }).text);
  }
  return String(value);
}

function parseCsv(text: string): Record<string, unknown>[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return [];

  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        cells.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    return cells;
  };

  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

async function sheetToJson(file: File): Promise<Record<string, unknown>[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    return parseCsv(await file.text());
  }
  if (name.endsWith(".xls") && !name.endsWith(".xlsx")) {
    throw new Error("Legacy .xls files are not supported. Please save as .xlsx or .csv.");
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount === 0) return [];

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = cellToString(cell.value);
  });
  if (headers.length === 0 || headers.every((h) => !h)) return [];

  const rows: Record<string, unknown>[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, unknown> = {};
    let hasValue = false;
    headers.forEach((h, i) => {
      if (!h) return;
      const val = cellToString(row.getCell(i + 1).value);
      obj[h] = val;
      if (val !== "") hasValue = true;
    });
    if (hasValue) rows.push(obj);
  });
  return rows;
}

async function downloadXlsx(filename: string, sheetName: string, headers: string[], example: Record<string, string>) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = headers.map((h) => ({
    header: h,
    key: h,
    width: Math.max(14, h.length + 2),
  }));
  sheet.addRow(example);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type ImportFieldSpec = {
  key: string;
  label: string;
  required?: boolean;
  aliases?: string[];
  transform?: (v: unknown) => unknown;
};

export type BulkImportConfig = {
  table: "customers" | "products";
  entityLabel: string; // "customer" | "product"
  fields: ImportFieldSpec[];
  /** Applied on insert when a column is omitted from the import file */
  insertDefaults?: Record<string, unknown>;
  /** Column used to detect duplicates (e.g. "code" or "account_code"|"name") */
  dedupeKey: string;
  /** Optional: allow duplicate detection to fall back to another field */
  dedupeFallbackKey?: string;
};

type ParsedRow = {
  index: number;
  data: Record<string, unknown>;
  errors: string[];
  duplicate: boolean;
  duplicateOfId?: string;
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function exampleValueFor(entity: string, key: string): string {
  const isCustomer = entity === "customer";
  const map: Record<string, string> = isCustomer
    ? {
        name: "Acme Trading Co.",
        account_code: "ACM001",
        delivery_address: "12 Warehouse Rd\nSpringfield, 2000",
        reference: "PO-2025-001",
        tax_number: "VAT123456789",
        tax_rate: "15",
        sales_code: "REP-04",
      }
    : {
        code: "SKU-001",
        description: "Example product",
      };
  return map[key] ?? "";
}

function matchField(header: string, fields: ImportFieldSpec[]): ImportFieldSpec | null {
  const norm = normalizeHeader(header);
  for (const f of fields) {
    const candidates = [f.key, f.label, ...(f.aliases ?? [])].map(normalizeHeader);
    if (candidates.includes(norm)) return f;
  }
  return null;
}

export function BulkImportDialog({ config, onImported }: { config: BulkImportConfig; onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({}); // header -> field key
  const [mode, setMode] = useState<"skip" | "overwrite">("skip");
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<{ added: number; updated: number; skipped: number; errors: { row: number; reason: string }[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setRows([]);
    setHeaders([]);
    setMapping({});
    setSummary(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFile(file: File) {
    reset();
    let json: Record<string, unknown>[];
    try {
      json = await sheetToJson(file);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to read file");
      return;
    }
    if (json.length === 0) {
      toast.error("File is empty");
      return;
    }
    const hdrs = Object.keys(json[0]);
    setHeaders(hdrs);
    const map: Record<string, string | null> = {};
    for (const h of hdrs) {
      const f = matchField(h, config.fields);
      map[h] = f ? f.key : null;
    }
    setMapping(map);

    // Fetch existing rows for dedupe
    const selectCols = `id, ${config.dedupeKey}${config.dedupeFallbackKey ? `, ${config.dedupeFallbackKey}` : ""}`;
    const { data: existing } = await (supabase.from(config.table) as any).select(selectCols);
    const existingMap = new Map<string, string>();
    for (const row of (existing ?? []) as Array<Record<string, unknown>>) {
      const k = row[config.dedupeKey];
      if (k != null && String(k).trim() !== "") existingMap.set(String(k).trim().toLowerCase(), row.id as string);
      if (config.dedupeFallbackKey) {
        const fk = row[config.dedupeFallbackKey];
        if (fk != null && String(fk).trim() !== "") {
          const key = String(fk).trim().toLowerCase();
          if (!existingMap.has(key)) existingMap.set(key, row.id as string);
        }
      }
    }

    const seenInFile = new Set<string>();
    const parsed: ParsedRow[] = json.map((raw, i) => {
      const data: Record<string, unknown> = {};
      for (const h of hdrs) {
        const fieldKey = map[h];
        if (!fieldKey) continue;
        const field = config.fields.find((f) => f.key === fieldKey)!;
        const val = raw[h];
        const clean = typeof val === "string" ? val.trim() : val;
        data[fieldKey] = field.transform ? field.transform(clean) : clean === "" ? null : clean;
      }
      const errors: string[] = [];
      for (const f of config.fields) {
        if (f.required && (data[f.key] == null || String(data[f.key]).trim() === "")) {
          errors.push(`${f.label} is required`);
        }
      }
      const dedupeVal = data[config.dedupeKey] ?? (config.dedupeFallbackKey ? data[config.dedupeFallbackKey] : null);
      const dkey = dedupeVal != null ? String(dedupeVal).trim().toLowerCase() : "";
      let duplicate = false;
      let duplicateOfId: string | undefined;
      if (dkey) {
        if (seenInFile.has(dkey)) {
          errors.push("Duplicate row within file");
        } else {
          seenInFile.add(dkey);
        }
        if (existingMap.has(dkey)) {
          duplicate = true;
          duplicateOfId = existingMap.get(dkey);
        }
      }
      return { index: i + 2, data, errors, duplicate, duplicateOfId };
    });
    setRows(parsed);
  }

  const stats = useMemo(() => {
    const total = rows.length;
    const invalid = rows.filter((r) => r.errors.length > 0).length;
    const dupes = rows.filter((r) => r.duplicate).length;
    return { total, invalid, dupes };
  }, [rows]);

  async function runImport() {
    setImporting(true);
    let added = 0;
    let updated = 0;
    let skipped = 0;
    const errors: { row: number; reason: string }[] = [];

    for (const r of rows) {
      if (r.errors.length > 0) {
        errors.push({ row: r.index, reason: r.errors.join("; ") });
        continue;
      }
      if (r.duplicate) {
        if (mode === "skip") {
          skipped++;
          continue;
        }
        const { error } = await (supabase.from(config.table) as any).update(r.data).eq("id", r.duplicateOfId!);
        if (error) errors.push({ row: r.index, reason: error.message });
        else updated++;
      } else {
        const payload = { ...config.insertDefaults, ...r.data };
        const { error } = await (supabase.from(config.table) as any).insert(payload);
        if (error) errors.push({ row: r.index, reason: error.message });
        else added++;
      }
    }
    setImporting(false);
    setSummary({ added, updated, skipped, errors });
    if (errors.length === 0) toast.success(`Imported ${added + updated} ${config.entityLabel}(s)`);
    else toast.warning(`Import finished with ${errors.length} error(s)`);
    onImported();
  }

  function downloadTemplate() {
    const headers = config.fields.map((f) => f.label + (f.required ? " *" : ""));
    const example: Record<string, string> = {};
    for (const f of config.fields) {
      const h = f.label + (f.required ? " *" : "");
      example[h] = exampleValueFor(config.entityLabel, f.key);
    }
    void downloadXlsx(
      `${config.entityLabel}s-template.xlsx`,
      `${config.entityLabel}s`,
      headers,
      example,
    );
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Upload className="mr-1 h-4 w-4" /> Upload Excel/CSV
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk import {config.entityLabel}s</DialogTitle>
          </DialogHeader>

          {!summary && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4">
                <div className="flex-1">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleFile(f);
                    }}
                    className="block text-sm"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Expected columns: {config.fields.map((f) => f.label + (f.required ? "*" : "")).join(", ")}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="mr-1 h-4 w-4" /> Template
                </Button>
              </div>

              {rows.length > 0 && (
                <>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span>Total rows: <strong>{stats.total}</strong></span>
                    <span className="text-destructive">Invalid: <strong>{stats.invalid}</strong></span>
                    <span className="text-amber-600">Duplicates: <strong>{stats.dupes}</strong></span>
                  </div>

                  <div>
                    <Label className="mb-2 block text-xs uppercase text-muted-foreground">
                      When duplicate found
                    </Label>
                    <RadioGroup value={mode} onValueChange={(v) => setMode(v as "skip" | "overwrite")} className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="skip" id="skip" />
                        <Label htmlFor="skip" className="font-normal">Skip duplicates</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="overwrite" id="overwrite" />
                        <Label htmlFor="overwrite" className="font-normal">Overwrite existing</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="overflow-x-auto rounded border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-2 text-left">Row</th>
                          <th className="p-2 text-left">Status</th>
                          {config.fields.map((f) => (
                            <th key={f.key} className="p-2 text-left">{f.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 100).map((r) => (
                          <tr key={r.index} className="border-t border-border">
                            <td className="p-2">{r.index}</td>
                            <td className="p-2">
                              {r.errors.length > 0 ? (
                                <span className="text-destructive" title={r.errors.join("; ")}>
                                  ✗ {r.errors[0]}
                                </span>
                              ) : r.duplicate ? (
                                <span className="text-amber-600">⚠ Duplicate</span>
                              ) : (
                                <span className="text-green-600">✓ New</span>
                              )}
                            </td>
                            {config.fields.map((f) => (
                              <td key={f.key} className="p-2">{String(r.data[f.key] ?? "")}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {rows.length > 100 && (
                      <div className="p-2 text-center text-xs text-muted-foreground">
                        Showing first 100 of {rows.length} rows
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Mapped columns: {headers.map((h) => `${h} → ${mapping[h] ?? "(ignored)"}`).join(", ")}
                  </div>
                </>
              )}
            </div>
          )}

          {summary && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded border border-border p-3">
                  <div className="text-2xl font-semibold text-green-600">{summary.added}</div>
                  <div className="text-xs text-muted-foreground">Added</div>
                </div>
                <div className="rounded border border-border p-3">
                  <div className="text-2xl font-semibold text-blue-600">{summary.updated}</div>
                  <div className="text-xs text-muted-foreground">Updated</div>
                </div>
                <div className="rounded border border-border p-3">
                  <div className="text-2xl font-semibold text-amber-600">{summary.skipped}</div>
                  <div className="text-xs text-muted-foreground">Skipped</div>
                </div>
              </div>
              {summary.errors.length > 0 && (
                <div>
                  <div className="mb-2 text-sm font-medium text-destructive">
                    {summary.errors.length} error(s)
                  </div>
                  <div className="max-h-60 overflow-y-auto rounded border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-2 text-left">Row</th>
                          <th className="p-2 text-left">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.errors.map((e, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="p-2">{e.row}</td>
                            <td className="p-2">{e.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {summary ? (
              <Button onClick={() => setOpen(false)}>Close</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  onClick={runImport}
                  disabled={importing || rows.length === 0 || rows.every((r) => r.errors.length > 0)}
                >
                  {importing ? "Importing…" : `Import ${rows.filter((r) => r.errors.length === 0 && (!r.duplicate || mode === "overwrite")).length} row(s)`}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
