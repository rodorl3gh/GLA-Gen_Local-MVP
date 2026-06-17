import { getEnabledPaymentMethods } from "./db";

export function getPaymentMethods(): { id: number; name: string; details: string[] }[] {
  return getEnabledPaymentMethods();
}

export function formatPaymentMethods(): string {
  const methods = getEnabledPaymentMethods();

  if (methods.length === 0) {
    return "Por el momento no hay metodos de pago configurados. Contacta al administrador.";
  }

  let text = "*Formas de Pago:*\n\n";
  for (const m of methods) {
    text += `*${m.name}:*\n`;
    for (const d of m.details) {
      text += `  ${d}\n`;
    }
    text += "\n";
  }

  text += "Envia tu comprobante de pago por este medio una vez realizado. Gracias!";
  return text;
}

export function formatPaymentMethodById(id: number): string | null {
  const methods = getEnabledPaymentMethods();
  const method = methods.find((m) => m.id === id);
  if (!method) return null;

  let text = `*Pago con ${method.name}:*\n`;
  for (const d of method.details) {
    text += `  ${d}\n`;
  }
  return text;
}
