"use client";

import { motion } from "motion/react";
import { analyzeVirality, getViralityColor } from "@/lib/forge/virality-score";
import type { ViralityComposite } from "@/lib/forge/types";

interface ViralityCardProps {
  composite: ViralityComposite;
}

export function ViralityCard({ composite }: ViralityCardProps) {
  const analysis = analyzeVirality(composite);
  const color = getViralityColor(analysis.level);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-lg border bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-xl"
    >
      {/* 标题与等级 */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">爆款指数</h3>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
          className="flex h-12 w-12 items-center justify-center rounded-full text-2xl font-bold"
          style={{ backgroundColor: color }}
        >
          {analysis.level}
        </motion.div>
      </div>

      {/* 总分 */}
      <div className="mb-6">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm text-slate-400">综合评分</span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold"
          >
            {analysis.totalScore}
          </motion.span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-700">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${analysis.totalScore}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            className="h-full"
            style={{ backgroundColor: color }}
          />
        </div>
      </div>

      {/* 6 维评分 */}
      <div className="space-y-3">
        {analysis.dimensions.map((dim, index) => (
          <motion.div
            key={dim.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.05 }}
          >
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span>{dim.icon}</span>
                <span>{dim.label}</span>
              </span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                className="font-medium"
              >
                {dim.score}
              </motion.span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${dim.score}%` }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.5 + index * 0.05 }}
                className="h-full"
                style={{
                  backgroundColor:
                    dim.score >= 80
                      ? "#4ade80"
                      : dim.score >= 60
                        ? "#fbbf24"
                        : "#f87171",
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* 洞察建议 */}
      {analysis.insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-6 rounded-lg bg-slate-800/50 p-4"
        >
          <h4 className="mb-2 text-sm font-medium text-slate-300">
            优化建议
          </h4>
          <ul className="space-y-1 text-sm text-slate-400">
            {analysis.insights.map((insight, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + i * 0.1 }}
              >
                {insight}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
}
