import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Upload } from "lucide-react";

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
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
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
        const { error } = await (supabase.from(config.table) as any).insert(r.data);
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
              <div className="rounded border border-dashed border-border p-4">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
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
