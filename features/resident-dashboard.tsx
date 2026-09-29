"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@gestionresidencial/auth-client";
import {
  errorMessage,
  hasBalance,
  moneyCOP,
  type Proof,
  type Statement,
} from "./finance-api";

export function ResidentDashboard() {
  const [statement, setStatement] = useState<Statement | null>(null);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const proofKey = useRef<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [account, receipts] = await Promise.all([
        apiFetch<{ payload: Statement }>("/api/v1/finanzas/estado-cuenta"),
        apiFetch<{ payload: Proof[] }>("/api/v1/finanzas/comprobantes/mios"),
      ]);
      setStatement(account.payload);
      setProofs(receipts.payload);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(reload);
  }, [reload]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    proofKey.current ??= crypto.randomUUID();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiFetch("/api/v1/finanzas/comprobantes", {
        method: "POST",
        headers: { "Idempotency-Key": proofKey.current },
        body: data,
      });
      proofKey.current = null;
      form.reset();
      setNotice(
        "Comprobante recibido. La verificación es simulada y queda pendiente de revisión administrativa.",
      );
      await reload();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="billing">
      <section className="intro">
        <p className="eyebrow">Propietario</p>
        <h1>Tu estado de cuenta</h1>
        <p>
          Consulta cobros y presenta comprobantes de transferencia para
          revisión.
        </p>
      </section>
      {loading && (
        <p className="empty" role="status">
          Cargando tu cuenta…
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
      {statement && (
        <>
          <section className="panel">
            <div className="panel-head">
              <div>
                <span className="label">Saldo pendiente</span>
                <strong>{moneyCOP(statement.saldoTotal)}</strong>
              </div>
              <span
                className={statement.pazYSalvo ? "badge ok" : "badge danger"}
              >
                {statement.pazYSalvo ? "Paz y salvo" : "Saldo vencido"}
              </span>
            </div>
            <div className="summary">
              <span>
                Unidad {statement.apartamento.torre}-
                {statement.apartamento.numero}
              </span>
              <span>Vencido: {moneyCOP(statement.saldoVencido)}</span>
              <span>A favor: {moneyCOP(statement.saldoAFavor)}</span>
            </div>
          </section>
          <section className="panel form-panel">
            <h2>Cobros</h2>
            {statement.cobros.length === 0 ? (
              <p>Aún no hay cobros registrados.</p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Período</th>
                      <th>Capital</th>
                      <th>Intereses pendientes</th>
                      <th>Pendiente</th>
                      <th>Recibo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.cobros.map((charge) => (
                      <tr key={charge.id}>
                        <td>{charge.periodo}</td>
                        <td>{moneyCOP(charge.capital)}</td>
                        <td>{moneyCOP(charge.intereses)}</td>
                        <td>{moneyCOP(charge.pendiente)}</td>
                        <td>
                          {hasBalance(charge.pendiente) ? (
                            "Pendiente"
                          ) : (
                            <a
                              href={`/api/v1/finanzas/cobros/${charge.id}/recibo`}
                            >
                              PDF
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
      <div className="finance-grid">
        <section className="panel form-panel">
          <h2>Subir comprobante</h2>
          <p>
            Se aceptan JPG, PNG y PDF hasta 5 MB. El sistema no verifica la
            transacción con el banco.
          </p>
          <form
            onSubmit={(event) => void upload(event)}
            onChange={() => {
              proofKey.current = null;
            }}
          >
            <label>
              Valor transferido
              <input
                name="valorDeclarado"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </label>
            <label>
              Fecha de transferencia
              <input
                name="fechaTransferencia"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                required
              />
            </label>
            <label>
              Banco
              <input name="banco" maxLength={100} required />
            </label>
            <label>
              Referencia
              <input name="referencia" maxLength={100} required />
            </label>
            <label>
              Archivo
              <input
                name="archivo"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                required
              />
            </label>
            <button disabled={busy}>
              {busy ? "Enviando…" : "Enviar comprobante"}
            </button>
          </form>
        </section>
        <section className="panel form-panel">
          <h2>Mis comprobantes</h2>
          {proofs.length === 0 && <p>No has enviado comprobantes.</p>}
          {proofs.map((proof) => (
            <div className="proof" key={proof.id}>
              <strong>
                #{proof.id} · {moneyCOP(proof.valorDeclarado)}
              </strong>
              <p>
                {proof.banco} · {proof.referencia}
              </p>
              <span className="badge">{proof.estado.replace("_", " ")}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
