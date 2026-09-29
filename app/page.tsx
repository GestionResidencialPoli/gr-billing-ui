"use client";
import { useEffect, useState } from "react";
import { AuthenticatedShell } from "@/features/auth/authenticated-shell";

type Apartment = { apartamentoId: number; torre: string; numero: string; pendiente: string; vencido: string };
type Portfolio = { fechaCorte: string; apartamentos: Apartment[]; totalPendiente: string };

export default function BillingHome() {
  const [data, setData] = useState<Portfolio | null>(null); const [error, setError] = useState("");
  useEffect(() => { fetch("/api/v1/finanzas/cartera?fechaCorte=" + new Date().toISOString().slice(0, 10), { credentials: "include" }).then(async response => { if (!response.ok) throw new Error("No fue posible cargar la cartera"); const body = await response.json(); setData(body.payload); }).catch(reason => setError(reason.message)); }, []);
  return <AuthenticatedShell requiredRole="ADMINISTRACION"><main><section className="intro"><p className="eyebrow">Panel financiero</p><h1>Una cartera que se entiende.</h1><p>Consulta saldos, identifica vencidos y explica con claridad cuándo una unidad está a paz y salvo.</p></section><section className="panel"><div className="panel-head"><div><span className="label">Total pendiente</span><strong>{data ? `$ ${Number(data.totalPendiente).toLocaleString("es-CO")}` : "—"}</strong></div><div className="cutoff">Corte {data?.fechaCorte || "cargando"}</div></div>{error && <div className="error">{error}. Inicia sesión con administración para consultar la cartera.</div>}{!error && !data && <div className="empty">Cargando cartera…</div>}{data && <table><thead><tr><th>Unidad</th><th>Pendiente</th><th>Vencido</th><th>Estado</th></tr></thead><tbody>{data.apartamentos.map(row => <tr key={row.apartamentoId}><td>{row.torre} - {row.numero}</td><td>$ {Number(row.pendiente).toLocaleString("es-CO")}</td><td>$ {Number(row.vencido).toLocaleString("es-CO")}</td><td><span className={Number(row.vencido) > 0 ? "badge danger" : "badge ok"}>{Number(row.vencido) > 0 ? "En mora" : "Al día"}</span></td></tr>)}</tbody></table>}</section></main></AuthenticatedShell>;
}
