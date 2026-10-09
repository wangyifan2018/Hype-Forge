"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import {
  newId,
  type ContentStyle,
  type EngagementMetrics,
  type PicklistItem,
  type PicklistStatus,
  type PostedRecord,
  type WorkspaceCategory,
  type WorkspacePrefs,
} from "@/lib/forge/local-store";
import type { HotProductLead } from "@/lib/forge/types";

const DEFAULT_PREFS: WorkspacePrefs = {
  category: "streetwear",
  defaultStyle: "cool",
  intelDiscoveryMode: "auto",
  intelAutoScope: "category",
};

interface ForgeStoreState {
  prefs: WorkspacePrefs;
  picklist: PicklistItem[];
  posted: PostedRecord[];
  publishChecklist: Record<string, boolean>;
  engageTemplates: string[];

  updatePrefs: (patch: Partial<WorkspacePrefs>) => void;
  setCategory: (category: WorkspaceCategory) => void;
  setDefaultStyle: (defaultStyle: ContentStyle) => void;
  setModel: (model: string) => void;

  addToPicklist: (lead: HotProductLead) => PicklistItem;
  updatePicklistItem: (id: string, patch: Partial<PicklistItem>) => void;
  removeFromPicklist: (id: string) => void;
  setVerifyChecked: (picklistId: string, stepIndex: number, checked: boolean) => void;

  markPosted: (record: Omit<PostedRecord, "id" | "postedAt"> & { postedAt?: string }) => PostedRecord;
  updateEngagement: (postId: string, engagement: EngagementMetrics) => void;

  setPublishCheck: (itemId: string, checked: boolean) => void;
  setEngageTemplates: (templates: string[]) => void;
  resetPublishChecklist: () => void;
}

export const useForgeStore = create<ForgeStoreState>()(
  persist(
    (set, get) => ({
      prefs: DEFAULT_PREFS,
      picklist: [],
      posted: [],
      publishChecklist: {},
      engageTemplates: [],

      updatePrefs: (patch) =>
        set((state) => ({ prefs: { ...state.prefs, ...patch } })),

      setCategory: (category) =>
        set((state) => ({ prefs: { ...state.prefs, category } })),

      setDefaultStyle: (defaultStyle) =>
        set((state) => ({ prefs: { ...state.prefs, defaultStyle } })),

      setModel: (model) =>
        set((state) => ({ prefs: { ...state.prefs, model } })),

      addToPicklist: (lead) => {
        const state = get();
        const existing = state.picklist.find((p) => p.leadSnapshot.id === lead.id);
        if (existing) return existing;

        const now = new Date().toISOString();
        const item: PicklistItem = {
          id: newId(),
          leadSnapshot: lead,
          status: "idea",
          verifyChecked: {},
          createdAt: now,
          updatedAt: now,
        };
        set({ picklist: [item, ...state.picklist] });
        return item;
      },

      updatePicklistItem: (id, patch) =>
        set((state) => ({
          picklist: state.picklist.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
          ),
        })),

      removeFromPicklist: (id) =>
        set((state) => ({ picklist: state.picklist.filter((p) => p.id !== id) })),

      setVerifyChecked: (picklistId, stepIndex, checked) => {
        const state = get();
        const item = state.picklist.find((p) => p.id === picklistId);
        if (!item) return;

        const key = String(stepIndex);
        const newVerifyChecked = { ...item.verifyChecked, [key]: checked };
        const checkedCount = Object.values(newVerifyChecked).filter(Boolean).length;
        const totalSteps = item.leadSnapshot.verifySteps.length;

        const newStatus: PicklistStatus =
          checked && checkedCount >= totalSteps
            ? "verified"
            : item.status === "posted"
              ? "posted"
              : "idea";

        get().updatePicklistItem(picklistId, { verifyChecked: newVerifyChecked, status: newStatus });
      },

      markPosted: (record) => {
        const state = get();
        const posted: PostedRecord = {
          id: newId(),
          postedAt: record.postedAt ?? new Date().toISOString(),
          productName: record.productName,
          affiliateLink: record.affiliateLink,
          copySnippet: record.copySnippet,
          notes: record.notes,
          picklistId: record.picklistId,
          isHit: false,
        };

        const picklist = record.picklistId
          ? state.picklist.map((p) =>
              p.id === record.picklistId
                ? { ...p, status: "posted" as PicklistStatus, updatedAt: new Date().toISOString() }
                : p
            )
          : state.picklist;

        set({ posted: [posted, ...state.posted].slice(0, 50), picklist });
        return posted;
      },

      updateEngagement: (postId, engagement) =>
        set((state) => ({
          posted: state.posted.map((record) =>
            record.id === postId
              ? { ...record, engagement, updatedAt: new Date().toISOString() }
              : record
          ),
        })),

      setPublishCheck: (itemId, checked) =>
        set((state) => ({ publishChecklist: { ...state.publishChecklist, [itemId]: checked } })),

      setEngageTemplates: (templates) => set({ engageTemplates: templates }),

      resetPublishChecklist: () => set({ publishChecklist: {} }),
    }),
    {
      name: "hype-forge-store",
      partialize: (state) => ({
        prefs: state.prefs,
        picklist: state.picklist,
        posted: state.posted,
        publishChecklist: state.publishChecklist,
        engageTemplates: state.engageTemplates,
      }),
    }
  )
);

// ── Slice selectors ──────────────────────────────────────────────
// Use shallow equality to prevent unnecessary re-renders while
// providing convenient grouped access to related state + actions.

type PrefsSlice = Pick<ForgeStoreState, "prefs" | "updatePrefs" | "setCategory" | "setDefaultStyle" | "setModel">;
type PicklistSlice = Pick<ForgeStoreState, "picklist" | "addToPicklist" | "updatePicklistItem" | "removeFromPicklist" | "setVerifyChecked">;
type PostedSlice = Pick<ForgeStoreState, "posted" | "markPosted" | "updateEngagement">;
type PublishChecklistSlice = Pick<ForgeStoreState, "publishChecklist" | "setPublishCheck" | "setEngageTemplates" | "resetPublishChecklist" | "engageTemplates">;

export const usePrefsStore = (): PrefsSlice =>
  useForgeStore(
    useShallow((s) => ({
      prefs: s.prefs,
      updatePrefs: s.updatePrefs,
      setCategory: s.setCategory,
      setDefaultStyle: s.setDefaultStyle,
      setModel: s.setModel,
    }))
  );

export const usePicklistStore = (): PicklistSlice =>
  useForgeStore(
    useShallow((s) => ({
      picklist: s.picklist,
      addToPicklist: s.addToPicklist,
      updatePicklistItem: s.updatePicklistItem,
      removeFromPicklist: s.removeFromPicklist,
      setVerifyChecked: s.setVerifyChecked,
    }))
  );

export const usePostedStore = (): PostedSlice =>
  useForgeStore(
    useShallow((s) => ({
      posted: s.posted,
      markPosted: s.markPosted,
      updateEngagement: s.updateEngagement,
    }))
  );

export const usePublishChecklistStore = (): PublishChecklistSlice =>
  useForgeStore(
    useShallow((s) => ({
      publishChecklist: s.publishChecklist,
      setPublishCheck: s.setPublishCheck,
      setEngageTemplates: s.setEngageTemplates,
      resetPublishChecklist: s.resetPublishChecklist,
      engageTemplates: s.engageTemplates,
    }))
  );
