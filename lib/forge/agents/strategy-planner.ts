/**
 * 策略策划 Agent
 * 综合趋势、商品、历史策略权重，输出爆款策划简报
 */

import { runViralBrief } from "@/lib/forge/service";
import type {
  ForgeInput,
  ProductBrief,
  ViralBrief,
} from "@/lib/forge/types";

export interface StrategyPlannerInput {
  input: ForgeInput;
  brief?: ProductBrief | null;
  signal?: AbortSignal;
}

export async function runStrategyPlanner(
  params: StrategyPlannerInput
): Promise<ViralBrief> {
  const { input, brief, signal } = params;
  return runViralBrief(input, brief, signal);
}
