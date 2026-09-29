"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@gestionresidencial/auth-client";
import {
  errorMessage,
  hasBalance,
  moneyCOP,
  type Portfolio,
  type Proof,
} from "./finance-api";
import { colombiaToday, periodOptions } from "./periods";

type Parameter = {
  id: number;
  baseValue: string;
  monthlyLateRate: string;
  dueDays: number;
  effectiveFrom: string;
};

export function AdminDashboard() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [generationProgress, setGenerationProgress] = useState<{
    processed: number;
    total: number;
  } | null>(null);
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const paymentKey = useRef<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [cartera, parametros, comprobantes] = await Promise.all([
        apiFetch<{ payload: Portfolio }>("/api/v1/finanzas/cartera"),
        apiFetch<{ payload: Parameter[] }>("/api/v1/finanzas/parametros"),
        apiFetch<{ payload: Proof[] }>("/api/v1/finanzas/comprobantes"),
      ]);
      setPortfolio(cartera.payload);
      setParameters(parametros.payload);
      setProofs(comprobantes.payload);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(reload);
  }, [reload]);

  async function mutate(action: () => Promise<string>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setNotice(await action());
      await reload();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  function saveParameters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void mutate(async () => {
      await apiFetch("/api/v1/finanzas/parametros", {
        method: "PUT",
        body: {
          base_value: data.get("baseValue"),
          monthly_late_rate: data.get("monthlyLateRate"),
          due_days: Number(data.get("dueDays")),
          effective_from: `${data.get("effectiveFrom")}-01`,
        },
      });
      form.reset();
      return "Parámetros guardados.";
    });
  }

  function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void mutate(async () => {
      const period = String(data.get("periodo"));
      const result = await apiFetch<{ payload: { generacionId: number } }>(
        `/api/v1/finanzas/cobros/generar?periodo=${encodeURIComponent(period)}`,
        { method: "POST" },
      );
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const report = await apiFetch<{
          payload: {
            generated: number;
            skipped: number;
            failed: number;
            processed: number;
            total: number;
            status: string;
            error: string | null;
          };
        }>(
          `/api/v1/finanzas/cobros/generaciones/${result.payload.generacionId}`,
        );
        setGenerationProgress({
          processed: report.payload.processed,
          total: report.payload.total,
        });
        if (report.payload.status === "COMPLETADA") {
          setGenerationProgress(null);
          return `Generación: ${report.payload.generated} cobros, ${report.payload.skipped} omitidos y ${report.payload.failed} sin valor configurado.`;
        }
        if (report.payload.status === "FALLIDA") {
          setGenerationProgress(null);
          throw new Error(
            `La generación falló (${report.payload.error || "error interno"}).`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      setGenerationProgress(null);
      throw new Error(
        "La generación sigue en proceso. Puedes revisar el estado e intentarlo de nuevo más tarde.",
      );
    });
  }

  function applyInterest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void mutate(async () => {
      const result = await apiFetch<{ payload: { causados: number } }>(
        "/api/v1/finanzas/intereses/aplicar",
        { method: "POST", body: { periodo: data.get("periodo") } },
      );
      return `${result.payload.causados} intereses causados.`;
    });
  }

  function registerPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    paymentKey.current ??= crypto.randomUUID();
    void mutate(async () => {
      const result = await apiFetch<{ payload: { id: number } }>(
        "/api/v1/finanzas/pagos",
        {
          method: "POST",
          headers: { "Idempotency-Key": paymentKey.current! },
          body: {
            apartment_id: Number(data.get("apartamentoId")),
            value: data.get("valor"),
            paid_at: data.get("fechaPago"),
            method: data.get("medio"),
            reference: data.get("referencia") || null,
          },
        },
      );
      paymentKey.current = null;
      form.reset();
      return `Pago ${result.payload.id} registrado.`;
    });
  }

  function review(id: number, approval: boolean) {
    void mutate(async () => {
      await apiFetch(
        `/api/v1/finanzas/comprobantes/${id}/${approval ? "aprobacion" : "rechazo"}`,
        {
          method: "PATCH",
          ...(!approval ? { body: { reason: reasons[id] } } : {}),
        },
      );
      return approval
        ? "Comprobante aprobado y pago aplicado."
        : "Comprobante rechazado.";
    });
  }

  const today = colombiaToday();
  const period = today.slice(0, 7);
  const pastPeriods = periodOptions(24);
  const validityPeriods = periodOptions(12, 12);
  return (
    <div className="billing">
      <section className="intro">
        <p className="eyebrow">Administración</p>
        <h1>Finanzas de la comunidad</h1>
        <p>Consulta cartera y registra los movimientos de administración.</p>
      </section>
      {loading && (
        <p className="empty" role="status">
          Cargando finanzas…
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {generationProgress && (
        <p className="empty" role="status">
          Generando cobros: {generationProgress.processed} de{" "}
          {generationProgress.total} apartamentos.
        </p>
      )}
      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="label">Total pendiente</span>
            <strong>
              {portfolio ? moneyCOP(portfolio.totalPendiente) : "—"}
            </strong>
          </div>
          <span className="cutoff">Corte {portfolio?.fechaCorte || "—"}</span>
        </div>
        {portfolio && portfolio.apartamentos.length === 0 && (
          <p className="empty">No hay apartamentos en cartera.</p>
        )}
        {portfolio && portfolio.apartamentos.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Unidad</th>
                  <th>Pendiente</th>
                  <th>Vencido</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.apartamentos.map((row) => (
                  <tr key={row.apartamentoId}>
                    <td>
                      {row.torre} - {row.numero}
                    </td>
                    <td>{moneyCOP(row.pendiente)}</td>
                    <td>{moneyCOP(row.vencido)}</td>
                    <td>
                      <span
                        className={
                          hasBalance(row.vencido) ? "badge danger" : "badge ok"
                        }
                      >
                        {hasBalance(row.vencido) ? "En mora" : "Al día"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <div className="finance-grid">
        <section className="panel form-panel">
          <h2>Parámetros</h2>
          <p>
            Vigencia actual: {parameters[0]?.effectiveFrom || "sin configurar"}
          </p>
          <form onSubmit={saveParameters}>
            <label>
              Valor base
              <input
                name="baseValue"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </label>
            <label>
              Tasa mensual (decimal)
              <input
                name="monthlyLateRate"
                type="number"
                min="0"
                step="0.00001"
                required
              />
            </label>
            <label>
              Días para vencer
              <input name="dueDays" type="number" min="0" max="90" required />
            </label>
            <label>
              Vigente desde
              <select name="effectiveFrom" defaultValue={period} required>
                {validityPeriods.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={busy}>Guardar parámetros</button>
          </form>
        </section>
        <section className="panel form-panel">
          <h2>Cobros e intereses</h2>
          <form onSubmit={generate}>
            <label>
              Período de cobro
              <select name="periodo" defaultValue={period} required>
                {pastPeriods.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={busy}>Generar cobros</button>
          </form>
          <form onSubmit={applyInterest}>
            <label>
              Período de interés
              <select name="periodo" defaultValue={period} required>
                {pastPeriods.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={busy}>Aplicar intereses</button>
          </form>
        </section>
        <section className="panel form-panel">
          <h2>Registrar pago</h2>
          <form
            onSubmit={registerPayment}
            onChange={() => {
              paymentKey.current = null;
            }}
          >
            <label>
              ID del apartamento
              <input name="apartamentoId" type="number" min="1" required />
            </label>
            <label>
              Valor
              <input
                name="valor"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </label>
            <label>
              Fecha de pago
              <input
                name="fechaPago"
                type="date"
                min={`${pastPeriods[pastPeriods.length - 1].value}-01`}
                max={today}
                required
              />
            </label>
            <label>
              Medio
              <select name="medio">
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="CONSIGNACION">Consignación</option>
                <option value="OTRO">Otro</option>
              </select>
            </label>
            <label>
              Referencia
              <input name="referencia" maxLength={80} />
            </label>
            <button disabled={busy}>Registrar pago</button>
          </form>
        </section>
        <section className="panel form-panel">
          <h2>Reportes</h2>
          <p>Descarga información consolidada de la copropiedad.</p>
          <a href="/api/v1/finanzas/reportes/cartera.csv">Cartera CSV</a>
          <a href="/api/v1/finanzas/reportes/cartera.pdf">Cartera PDF</a>
          <a
            href={`/api/v1/finanzas/reportes/recaudo.csv?desde=${period}-01&hasta=${today}`}
          >
            Recaudo CSV
          </a>
          <a
            href={`/api/v1/finanzas/reportes/comprobantes.csv?desde=${period}-01&hasta=${today}`}
          >
            Comprobantes CSV
          </a>
        </section>
      </div>
      <section className="panel form-panel">
        <h2>Comprobantes</h2>
        {proofs.length === 0 && <p>No hay comprobantes.</p>}
        {proofs.map((proof) => (
          <article className="proof" key={proof.id}>
            <div>
              <strong>
                #{proof.id} · {moneyCOP(proof.valorDeclarado)}
              </strong>
              <p>
                {proof.banco} · {proof.referencia} · {proof.estado}
              </p>
              <small>
                Verificación simulada; la aprobación requiere revisión
                administrativa.
              </small>
              <p>
                <a href={`/api/v1/finanzas/comprobantes/${proof.id}/archivo`}>
                  Ver archivo
                </a>
              </p>
            </div>
            {proof.estado === "EN_REVISION" && (
              <div className="proof-actions">
                <button disabled={busy} onClick={() => review(proof.id, true)}>
                  Aprobar
                </button>
                <label>
                  Motivo de rechazo
                  <input
                    value={reasons[proof.id] || ""}
                    onChange={(event) =>
                      setReasons({ ...reasons, [proof.id]: event.target.value })
                    }
                    minLength={3}
                  />
                </label>
                <button
                  disabled={busy || (reasons[proof.id] || "").length < 3}
                  onClick={() => review(proof.id, false)}
                >
                  Rechazar
                </button>
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
