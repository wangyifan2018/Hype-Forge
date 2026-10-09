import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DEFAULT_DEWU_TREND_ID } from "@/lib/forge/trends";

/**
 * Step3 表单唯一契约。
 *
 * ⚠️ 不要在组件里另建一份 schema + useForm：
 * Dashboard 与 InputPanel 曾各自 `useForm`，导致卖家在 Step3 粘贴的
 * productPaste / productLink / platform 永远进不了 `buildForgeInput`，
 * Execute 实际吃到 `parseProductPaste` 的兜底值「商品」。
 * 现在由 Dashboard 创建唯一表单实例，用 `<FormProvider>` 下发，
 * InputPanel 通过 `useFormContext()` 读写同一份状态。
 */
export const inputFormSchema = z.object({
  trendId: z.string().min(1, "请选择趋势"),
  productPaste: z.string().min(10, "商品文案至少 10 个字符"),
  /** 得物商品链接（仅作 AI 上下文）：允许留空，也允许贴非 URL 的货号/口令 */
  productLink: z.string().optional(),
  platform: z.enum(["xiaohongshu", "dewu"]),
});

export type InputFormValues = z.infer<typeof inputFormSchema>;

/** 兼容旧命名 */
export type InputFormState = InputFormValues;

export const inputFormResolver = zodResolver(inputFormSchema);

export const DEFAULT_INPUT_FORM_VALUES: InputFormValues = {
  trendId: DEFAULT_DEWU_TREND_ID,
  productPaste: "",
  productLink: "",
  platform: "dewu",
};
