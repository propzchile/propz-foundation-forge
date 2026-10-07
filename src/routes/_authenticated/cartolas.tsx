import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, EmptyState } from "@/components/propz/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/propz/session";
import { contractUnitIds, useAllUnits, useContracts, useTenants } from "@/lib/propz/queries";
import { formatDate, formatMoney, tenantName } from "@/lib/propz/domain";
import { CHARGE_CONCEPTS, type ChargeConcept } from "@/lib/propz/obligations";
import {
  extractBill,
  extractStatement,
  fileKind,
  normalizeRut,
  sha256,
  type ExtractedBill,
  type ExtractedTxn,
} from "@/lib/propz/statement-extract";

export const Route = createFileRoute("/_authenticated/cartolas")({
  head: () => ({
    meta: [
      { title: "Cartolas y boletas — Propz" },
      { name: "description", content: "Carga cartolas bancarias y boletas de servicios, y revisa los datos extraídos." },
      { property: "og:title", content: "Cartolas y boletas — Propz" },
      { property: "og:description", content: "Carga de cartolas y boletas con trazabilidad del documento original." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartolasPage,
});

type Kind = "cartola" | ChargeConcept;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type DocRow = { id: string; kind: Kind; file_name: string; file_path: string; bank: string | null; account: string | null; status: string; created_at: string };
type TxnRow = { id: string; txn_date: string | null; amount: number; description: string; payer_rut: string | null; payer_name: string | null; match_status: string; suggested_contract_id: string | null };
type BillRow = { id: string; concept: ChargeConcept; company: string | null; customer_id: string | null; period: string | null; due_date: string | null; amount: number | null; status: string; document_id: string };

function useDocs() {
  return useQuery({
    queryKey: ["propz", "payment-docs"],
    queryFn: async () => {
      const [d, t, b] = await Promise.all([
        db.from("payment_documents").select("*").order("created_at", { ascending: false }),
        db.from("bank_transactions").select("*").order("txn_date", { ascending: false }),
        db.from("utility_bills").select("*").order("created_at", { ascending: false }),
      ]);
      if (d.error) throw d.error;
      if (t.error) throw t.error;
      if (b.error) throw b.error;
      return { docs: d.data as DocRow[], txns: t.data as TxnRow[], bills: b.data as BillRow[] };
    },
  });
}

function CartolasPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const data = useDocs();
  const tenants = useTenants();
  const contracts = useContracts({});
  const units = useAllUnits();

  const [kind, setKind] = useState<Kind>("cartola");
  const [bank, setBank] = useState("");
  const [account, setAccount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState("");
  const [txns, setTxns] = useState<ExtractedTxn[] | null>(null);
  const [bill, setBill] = useState<(ExtractedBill & { unit_id: string }) | null>(null);
  const [busy, setBusy] = useState(false);

  const active = (contracts.data ?? []).filter((c) => c.status === "ACTIVO");
  const unitLabel = new Map((units.data ?? []).map((u) => [u.id, u.alias || u.identifier]));
  const contractLabel = (id: string) => {
    const c = active.find((x) => x.id === id) ?? (contracts.data ?? []).find((x) => x.id === id);
    if (!c) return "—";
    return `${c.tenants ? tenantName(c.tenants) : "?"} · ${contractUnitIds(c).map((u) => unitLabel.get(u) ?? "").join(" + ")}`;
  };

  /** Sugerencia solo si el RUT coincide con un arrendatario con UN único contrato activo cuyo monto calza; si hay dudas, no se sugiere. */
  function suggest(t: ExtractedTxn): string | null {
    const rut = normalizeRut(t.payer_rut);
    if (!rut) return null;
    const tenantIds = (tenants.data ?? []).filter((x) => normalizeRut(x.tax_id) === rut).map((x) => x.id);
    const cs = active.filter((c) => tenantIds.includes(c.tenant_id));
    if (cs.length === 1) return cs[0]!.id;
    const exact = cs.filter((c) => Number(c.rent_amount) === t.amount);
    return exact.length === 1 ? exact[0]!.id : null;
  }

  async function analyze(f: File) {
    setFile(f);
    setTxns(null);
    setBill(null);
    setBusy(true);
    try {
      const h = await sha256(f);
      setHash(h);
      const { data: dup } = await db.from("payment_documents").select("id, file_name").eq("file_hash", h).maybeSingle();
      if (dup) {
        toast.error(`Este documento ya fue cargado (${dup.file_name}).`);
        setFile(null);
        return;
      }
      if (kind === "cartola") {
        const rows = await extractStatement(f);
        setTxns(rows);
        if (!rows.length) toast.message(fileKind(f) === "image" ? "Las imágenes requieren ingreso manual." : "No se detectaron abonos; puedes agregarlos a mano.");
      } else {
        const b = await extractBill(f);
        setBill({ ...b, unit_id: "" });
        if (fileKind(f) !== "pdf") toast.message("Las imágenes requieren ingreso manual de los datos.");
      }
    } catch (e) {
      toast.error(`No se pudo leer el archivo: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!file || !user) throw new Error("Selecciona un archivo");
      const path = `${user.id}/${hash}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("payment-documents").upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (up.error && !/exists/i.test(up.error.message)) throw up.error;
      const { data: doc, error } = await db
        .from("payment_documents")
        .insert({ kind, file_path: path, file_name: file.name, mime_type: file.type, file_hash: hash, bank: bank || null, account: account || null })
        .select("id")
        .single();
      if (error) throw error.code === "23505" ? new Error("Este documento ya fue cargado.") : error;

      if (kind === "cartola") {
        const seen = new Map<string, number>();
        const rows = (txns ?? []).filter((t) => t.amount > 0).map((t) => {
          const base = `${t.txn_date}|${t.amount}|${t.description.trim().toLowerCase()}`;
          const n = (seen.get(base) ?? 0) + 1;
          seen.set(base, n);
          const sug = suggest(t);
          return {
            document_id: doc.id, txn_date: t.txn_date, amount: t.amount, description: t.description,
            payer_rut: normalizeRut(t.payer_rut), payer_name: t.payer_name, bank: bank || null, account: account || null,
            row_hash: `${base}#${n}`, suggested_contract_id: sug, match_status: sug ? "sugerido" : "sin_asignar",
          };
        });
        if (rows.length) {
          const r = await db.from("bank_transactions").upsert(rows, { onConflict: "uploaded_by,row_hash", ignoreDuplicates: true });
          if (r.error) throw r.error;
        }
        return `Cartola guardada: ${rows.length} abonos por revisar`;
      }
      const b = bill!;
      const r = await db.from("utility_bills").insert({
        document_id: doc.id, concept: kind, unit_id: b.unit_id || null, company: b.company, customer_id: b.customer_id,
        period: b.period, issue_date: b.issue_date, due_date: b.due_date, amount: b.amount,
      });
      if (r.error) throw r.error;
      return "Boleta guardada para revisión";
    },
    onSuccess: (msg) => {
      toast.success(msg);
      setFile(null); setTxns(null); setBill(null); setHash("");
      qc.invalidateQueries({ queryKey: ["propz", "payment-docs"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  async function openOriginal(path: string) {
    const { data: s, error } = await supabase.storage.from("payment-documents").createSignedUrl(path, 120);
    if (error) return toast.error(error.message);
    window.open(s.signedUrl, "_blank", "noopener");
  }

  const updTxn = (i: number, patch: Partial<ExtractedTxn>) => setTxns((p) => p!.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const primaryUnits = (units.data ?? []).filter((u) => u.status !== "archivado" && u.rental_mode !== "parte_de_conjunto");

  return (
    <AppShell title="Cartolas y boletas" description="Carga de documentos y extracción de pagos para revisión." crumbs={[{ label: "Cartolas" }]}>
      <section className="surface-card space-y-4 p-5">
        <h2 className="text-base font-semibold">Subir documento</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(v) => { setKind(v as Kind); setFile(null); setTxns(null); setBill(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cartola">Cartola bancaria</SelectItem>
                {CHARGE_CONCEPTS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {kind === "cartola" && (
            <>
              <div className="grid gap-1.5"><Label>Banco (opcional)</Label><Input value={bank} onChange={(e) => setBank(e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>Cuenta (opcional)</Label><Input value={account} onChange={(e) => setAccount(e.target.value)} /></div>
            </>
          )}
        </div>
        <Input
          type="file"
          accept={kind === "cartola" ? ".pdf,.xlsx,.xls,.csv,image/*" : ".pdf,image/*"}
          disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void analyze(f); e.target.value = ""; }}
        />
        {busy && <p className="text-sm text-muted-foreground">Leyendo documento…</p>}

        {file && txns && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{file.name}: {txns.length} abonos detectados. Revisa y corrige antes de guardar.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr><th className="p-1">Fecha</th><th className="p-1">Monto</th><th className="p-1">Glosa</th><th className="p-1">RUT</th><th className="p-1">Nombre</th><th className="p-1">Sugerencia</th><th /></tr>
                </thead>
                <tbody>
                  {txns.map((t, i) => {
                    const s = suggest(t);
                    return (
                      <tr key={i} className="border-t border-border">
                        <td className="p-1"><Input type="date" value={t.txn_date ?? ""} onChange={(e) => updTxn(i, { txn_date: e.target.value || null })} /></td>
                        <td className="p-1"><Input type="number" className="w-28" value={t.amount} onChange={(e) => updTxn(i, { amount: Number(e.target.value) })} /></td>
                        <td className="p-1"><Input value={t.description} onChange={(e) => updTxn(i, { description: e.target.value })} /></td>
                        <td className="p-1"><Input className="w-32" value={t.payer_rut ?? ""} onChange={(e) => updTxn(i, { payer_rut: e.target.value || null })} /></td>
                        <td className="p-1"><Input value={t.payer_name ?? ""} onChange={(e) => updTxn(i, { payer_name: e.target.value || null })} /></td>
                        <td className="p-1 text-xs">{s ? contractLabel(s) : <span className="text-muted-foreground">Sin asignar</span>}</td>
                        <td className="p-1"><Button size="sm" variant="ghost" onClick={() => setTxns((p) => p!.filter((_, j) => j !== i))}>Quitar</Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setTxns((p) => [...(p ?? []), { txn_date: null, amount: 0, description: "", payer_rut: null, payer_name: null }])}>Agregar fila</Button>
              <Button disabled={save.isPending} onClick={() => save.mutate()}>Guardar cartola</Button>
            </div>
          </div>
        )}

        {file && bill && (
          <div className="space-y-3">
            <p className="text-sm font-medium">{file.name}: revisa los datos detectados.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {([["company", "Empresa"], ["customer_id", "N° cliente / identificador"], ["period", "Período"]] as const).map(([k, l]) => (
                <div key={k} className="grid gap-1.5"><Label>{l}</Label><Input value={bill[k] ?? ""} onChange={(e) => setBill({ ...bill, [k]: e.target.value || null })} /></div>
              ))}
              <div className="grid gap-1.5"><Label>Emisión</Label><Input type="date" value={bill.issue_date ?? ""} onChange={(e) => setBill({ ...bill, issue_date: e.target.value || null })} /></div>
              <div className="grid gap-1.5"><Label>Vencimiento</Label><Input type="date" value={bill.due_date ?? ""} onChange={(e) => setBill({ ...bill, due_date: e.target.value || null })} /></div>
              <div className="grid gap-1.5"><Label>Monto</Label><Input type="number" value={bill.amount ?? ""} onChange={(e) => setBill({ ...bill, amount: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              <div className="grid gap-1.5 sm:col-span-3">
                <Label>Unidad principal (opcional)</Label>
                <Select value={bill.unit_id} onValueChange={(v) => setBill({ ...bill, unit_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                  <SelectContent>{primaryUnits.map((u) => <SelectItem key={u.id} value={u.id}>{u.alias || u.identifier}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>Guardar boleta</Button>
          </div>
        )}
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Abonos por revisar</h2>
        {(data.data?.txns ?? []).length === 0 ? <EmptyState title="Sin movimientos cargados" /> : (
          <div className="surface-card divide-y divide-border">
            {data.data!.txns.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{formatMoney(Number(t.amount))} · {formatDate(t.txn_date)}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.description} {t.payer_rut ? `· ${t.payer_rut}` : ""} {t.payer_name ? `· ${t.payer_name}` : ""}</p>
                </div>
                <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${t.suggested_contract_id ? "bg-warning/15 text-warning-foreground" : "bg-muted text-muted-foreground"}`}>
                  {t.suggested_contract_id ? `Sugerido: ${contractLabel(t.suggested_contract_id)}` : "Sin asignar"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Boletas de servicios</h2>
        {(data.data?.bills ?? []).length === 0 ? <EmptyState title="Sin boletas cargadas" /> : (
          <div className="surface-card divide-y divide-border">
            {data.data!.bills.map((b) => (
              <div key={b.id} className="flex flex-wrap justify-between gap-2 p-3 text-sm">
                <span className="font-medium">{CHARGE_CONCEPTS.find((c) => c.value === b.concept)?.label} · {b.company ?? "—"}</span>
                <span className="text-muted-foreground">{b.period ?? "—"} · vence {formatDate(b.due_date)} · {b.amount != null ? formatMoney(Number(b.amount)) : "—"}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Documentos originales</h2>
        {(data.data?.docs ?? []).length === 0 ? <EmptyState title="Sin documentos" /> : (
          <div className="surface-card divide-y divide-border">
            {data.data!.docs.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span>{d.file_name} <span className="text-xs text-muted-foreground">· {d.kind === "cartola" ? "Cartola" : CHARGE_CONCEPTS.find((c) => c.value === d.kind)?.label} · {formatDate(d.created_at)}</span></span>
                <Button size="sm" variant="outline" onClick={() => openOriginal(d.file_path)}>Ver original</Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
