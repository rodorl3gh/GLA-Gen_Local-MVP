import { DEFAULT_SYSTEM_PROMPT } from "./system-prompt";
import { getAgentValue, setAgentValue, getCatalog, getEnabledPaymentMethods } from "./db";

export function getActivePrompt(): string {
  const override = getAgentValue("system_prompt");
  const base = (override && override.trim().length > 0) ? override : DEFAULT_SYSTEM_PROMPT;
  return base;
}

export function getActivePromptWithContext(): string {
  const base = getActivePrompt();

  const catalog = getCatalog();
  let catalogSection = "\n\n**CATALOGO ACTUAL EN TIEMPO REAL:**\n";
  const cats: Record<string, any[]> = {};
  for (const item of catalog) {
    const cat = item.category || "General";
    if (!cats[cat]) cats[cat] = [];
    cats[cat].push(item);
  }
  for (const [cat, items] of Object.entries(cats)) {
    catalogSection += `\n*${cat}:*\n`;
    for (const item of items) {
      catalogSection += `  - ${item.name} ($${item.price.toFixed(0)})`;
      if (item.description) catalogSection += ` — ${item.description}`;
      catalogSection += "\n";
    }
  }

  const paymentMethods = getEnabledPaymentMethods();
  let paymentSection = "\n\n**METODOS DE PAGO DISPONIBLES:**\n";
  if (paymentMethods.length === 0) {
    paymentSection += "  No hay metodos configurados.\n";
  } else {
    for (const pm of paymentMethods) {
      paymentSection += `\n*${pm.name}:*\n`;
      for (const d of pm.details) {
        paymentSection += `  ${d}\n`;
      }
    }
  }

  return base + catalogSection + paymentSection;
}

export function saveAgentPrompt(prompt: string) {
  setAgentValue("system_prompt", prompt);
}

export function resetPromptToDefault() {
  setAgentValue("system_prompt", DEFAULT_SYSTEM_PROMPT);
}
