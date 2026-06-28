import type { PsychologyTrigger } from "@/lib/forge/types";

export const PSYCHOLOGY_LABELS: Record<PsychologyTrigger, string> = {
  identity: "身份认同",
  novelty: "新奇感",
  community: "社区归属",
  emotion: "情绪共鸣",
  fomo: "错失恐惧",
  social_proof: "社会认同",
  transformation: "蜕变渴望",
  nostalgia: "怀旧情结",
  aspiration: "理想投射",
  belonging: "圈层融入",
};

export const PSYCHOLOGY_COLORS: Record<PsychologyTrigger, string> = {
  identity: "border-purple-400/50 text-purple-300 bg-purple-500/10",
  novelty: "border-cyan-400/50 text-cyan-300 bg-cyan-500/10",
  community: "border-green-400/50 text-green-300 bg-green-500/10",
  emotion: "border-rose-400/50 text-rose-300 bg-rose-500/10",
  fomo: "border-orange-400/50 text-orange-300 bg-orange-500/10",
  social_proof: "border-blue-400/50 text-blue-300 bg-blue-500/10",
  transformation: "border-amber-400/50 text-amber-300 bg-amber-500/10",
  nostalgia: "border-yellow-400/50 text-yellow-300 bg-yellow-500/10",
  aspiration: "border-indigo-400/50 text-indigo-300 bg-indigo-500/10",
  belonging: "border-teal-400/50 text-teal-300 bg-teal-500/10",
};
