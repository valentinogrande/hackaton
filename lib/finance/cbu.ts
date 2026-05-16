// CBU/CVU validation — 22 digits + BCRA checksum.
// Reference: BCRA Comunicación "A" 2559, Anexo.

const WEIGHTS_BLOCK1 = [7, 1, 3, 9, 7, 1, 3];
const WEIGHTS_BLOCK2 = [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3];

function checksumDigit(digits: string, weights: number[]): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += Number(digits[i]) * weights[i];
  }
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
}

export function isValidCbuCvu(raw: string): boolean {
  const s = String(raw ?? "").replace(/\s+/g, "");
  if (!/^\d{22}$/.test(s)) return false;

  const block1 = s.slice(0, 7);
  const dv1 = Number(s[7]);
  const block2 = s.slice(8, 21);
  const dv2 = Number(s[21]);

  return (
    checksumDigit(block1, WEIGHTS_BLOCK1) === dv1 &&
    checksumDigit(block2, WEIGHTS_BLOCK2) === dv2
  );
}

export type Destination =
  | { type: "cbu" | "cvu"; value: string }
  | { type: "alias"; value: string };

export function validateDestination(
  d: Destination,
): { ok: true } | { ok: false; error: string } {
  if (!d || typeof d !== "object") return { ok: false, error: "Destino inválido" };
  if (d.type === "alias") {
    const v = String(d.value ?? "").trim();
    if (!/^[A-Za-z0-9.\-]{6,20}$/.test(v))
      return { ok: false, error: "Alias inválido (6-20 caracteres alfanuméricos)" };
    return { ok: true };
  }
  if (d.type === "cbu" || d.type === "cvu") {
    if (!isValidCbuCvu(d.value)) return { ok: false, error: "CBU/CVU inválido" };
    return { ok: true };
  }
  return { ok: false, error: "Tipo de destino desconocido" };
}
