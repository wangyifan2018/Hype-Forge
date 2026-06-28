"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PostedRecord, EngagementMetrics } from "@/lib/forge/local-store";
import { calculateEngagementRate, isHitPost } from "@/lib/forge/strategy-learner";

interface EngagementRecorderProps {
  post: PostedRecord;
  onUpdate: (postId: string, engagement: EngagementMetrics) => void;
}

export function EngagementRecorder({ post, onUpdate }: EngagementRecorderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [likes, setLikes] = useState(post.engagement?.likes || 0);
  const [comments, setComments] = useState(post.engagement?.comments || 0);
  const [shares, setShares] = useState(post.engagement?.shares || 0);
  const [saves, setSaves] = useState(post.engagement?.saves || 0);
  const [views, setViews] = useState(post.engagement?.views || 0);

  const handleSave = () => {
    const engagement: EngagementMetrics = {
      likes,
      comments,
      shares,
      saves,
      views,
      recordedAt: new Date().toISOString(),
    };
    onUpdate(post.id, engagement);
    setIsEditing(false);
  };

  const engagementRate = post.engagement
    ? calculateEngagementRate(post.engagement, post.engagement.views)
    : 0;
  const isHit = isHitPost(post);

  if (!isEditing && !post.engagement) {
    return (
      <div className="rounded-lg border border-dashed border-slate-600 p-3">
        <p className="text-xs text-slate-400 mb-2">记录互动数据以追踪效果</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsEditing(true)}
          className="w-full"
        >
          录入数据
        </Button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="rounded-lg border border-slate-700 p-3 space-y-2">
        <p className="text-xs font-medium text-slate-300">录入互动数据</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400">点赞</label>
            <Input
              type="number"
              value={likes}
              onChange={(e) => setLikes(Number(e.target.value))}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">评论</label>
            <Input
              type="number"
              value={comments}
              onChange={(e) => setComments(Number(e.target.value))}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">分享</label>
            <Input
              type="number"
              value={shares}
              onChange={(e) => setShares(Number(e.target.value))}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">收藏</label>
            <Input
              type="number"
              value={saves}
              onChange={(e) => setSaves(Number(e.target.value))}
              className="h-7 text-xs"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-slate-400">浏览量（可选）</label>
            <Input
              type="number"
              value={views}
              onChange={(e) => setViews(Number(e.target.value))}
              className="h-7 text-xs"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} className="flex-1 h-7 text-xs">
            保存
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(false)}
            className="h-7 text-xs"
          >
            取消
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-slate-300">互动数据</p>
        {isHit && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
            🔥 爆款
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-sm font-bold text-slate-200">{post.engagement?.likes || 0}</p>
          <p className="text-[10px] text-slate-400">点赞</p>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-200">{post.engagement?.comments || 0}</p>
          <p className="text-[10px] text-slate-400">评论</p>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-200">{post.engagement?.shares || 0}</p>
          <p className="text-[10px] text-slate-400">分享</p>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-200">{post.engagement?.saves || 0}</p>
          <p className="text-[10px] text-slate-400">收藏</p>
        </div>
      </div>
      {post.engagement?.views ? (
        <div className="mt-2 pt-2 border-t border-slate-700">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">互动率</span>
            <span className={engagementRate >= 0.05 ? "text-emerald-400" : "text-slate-300"}>
              {(engagementRate * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      ) : null}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="w-full mt-2 h-6 text-[10px]"
      >
        更新数据
      </Button>
    </div>
  );
}
