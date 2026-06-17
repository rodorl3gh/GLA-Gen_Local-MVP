import { getAgentValue, setAgentValue } from "./db";

export interface AgentConfig {
  burstDelayMs: number;
  temperature: number;
  maxHistory: number;
  openaiModel: string;
  theme: string;
}

const DEFAULTS: AgentConfig = {
  burstDelayMs: 12000,
  temperature: 0.4,
  maxHistory: 20,
  openaiModel: "gpt-4o-mini",
  theme: "dark",
};

export function getActiveConfig(): AgentConfig {
  return {
    burstDelayMs: parseInt(getAgentValue("burst_delay_ms") || String(DEFAULTS.burstDelayMs)),
    temperature: parseFloat(getAgentValue("temperature") || String(DEFAULTS.temperature)),
    maxHistory: parseInt(getAgentValue("max_history") || String(DEFAULTS.maxHistory)),
    openaiModel: getAgentValue("openai_model") || DEFAULTS.openaiModel,
    theme: getAgentValue("theme") || DEFAULTS.theme,
  };
}

export function updateAgentConfig(partial: Partial<AgentConfig>) {
  if (partial.burstDelayMs !== undefined) setAgentValue("burst_delay_ms", String(partial.burstDelayMs));
  if (partial.temperature !== undefined) setAgentValue("temperature", String(partial.temperature));
  if (partial.maxHistory !== undefined) setAgentValue("max_history", String(partial.maxHistory));
  if (partial.openaiModel !== undefined) setAgentValue("openai_model", partial.openaiModel);
  if (partial.theme !== undefined) setAgentValue("theme", partial.theme);
}
