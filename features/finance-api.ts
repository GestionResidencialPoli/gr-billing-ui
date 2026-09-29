import { ApiClientError } from "@gestionresidencial/auth-client";

export type Apartment = {
  apartamentoId: number;
  torre: string;
  numero: string;
  pendiente: string;
  vencido: string;
};
export type Portfolio = {
  fechaCorte: string;
  apartamentos: Apartment[];
  totalPendiente: string;
  totalVencido: string;
};
export type Charge = {
  id: number;
  periodo: string;
  capital: string;
  intereses: string;
  pendiente: string;
  fechaVencimiento: string;
};
export type Statement = {
  apartamento: { id: number; torre: string; numero: string };
  saldoTotal: string;
  saldoVencido: string;
  saldoAFavor: string;
  pazYSalvo: boolean;
  cobros: Charge[];
  pagos: { id: number; valor: string; fechaPago: string; origen: string }[];
};
export type Proof = {
  id: number;
  apartamentoId: number;
  valorDeclarado: string;
  fechaTransferencia: string;
  banco: string;
  referencia: string;
  estado: string;
  verificacion: string;
  hallazgos: string[];
};

export function moneyCOP(value: string): string {
  const negative = value.startsWith("-");
  const [whole, fraction = "00"] = (negative ? value.slice(1) : value).split(
    ".",
  );
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}$ ${grouped},${fraction.padEnd(2, "0")}`;
}

export function hasBalance(value: string): boolean {
  return /^-?\d*(?:\.\d*)?$/.test(value) && BigInt(value.replace(".", "")) > 0n;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    const body = error.body as { error?: { message?: string } } | null;
    return body?.error?.message || `La operación falló (${error.status}).`;
  }
  if (error instanceof Error) return error.message;
  return "No hay conexión con el servicio. Inténtalo de nuevo.";
}
