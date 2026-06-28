import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const inputFormSchema = z.object({
  trendId: z.string().min(1, "请选择趋势"),
  productPaste: z.string().min(10, "商品文案至少 10 个字符"),
  productLink: z.string().url("请输入有效的链接").optional().or(z.literal("")),
  platform: z.enum(["xiaohongshu", "dewu"]),
});

export type InputFormValues = z.infer<typeof inputFormSchema>;

export const inputFormResolver = zodResolver(inputFormSchema);

export const DEFAULT_INPUT_FORM_VALUES: InputFormValues = {
  trendId: "dewu-sneaker",
  productPaste: "",
  productLink: "",
  platform: "dewu",
};
