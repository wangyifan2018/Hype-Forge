import { describe, expect, it } from "vitest";
import {
  applySignal,
  buildPreferenceHints,
  EMPTY_PROFILE,
  PREFERENCE_MIN_COUNT,
  profileRuleSummary,
  rulesForSignal,
  titleChoiceRules,
} from "@/lib/forge/edit-preferences";

describe("Remix 偏好信号", () => {
  it("识别各选项对应的规则", () => {
    expect(rulesForSignal({ kind: "remix", option: "shorter" })).toEqual([
      "remix.shorter",
    ]);
    expect(
      rulesForSignal({ kind: "remix", option: "more_professional" })
    ).toEqual(["remix.more_professional"]);
  });
});

describe("标题选择偏好", () => {
  it("明显更短/更长的选择才产生规则", () => {
    expect(
      titleChoiceRules("通勤实测", ["通勤实测这双北卡蓝真的绝了", "白蓝配色实测"])
    ).toEqual(["title.shorter"]);
    expect(
      titleChoiceRules("通勤实测这双北卡蓝真的绝了", ["通勤实测", "白蓝"])
    ).toEqual(["title.longer"]);
  });

  it("长度接近时不产生长度偏好（避免把随机点击当偏好）", () => {
    expect(titleChoiceRules("通勤实测一双", ["通勤实测两双"])).toEqual([]);
  });

  it("emoji / 数字 / 疑问句特征", () => {
    expect(titleChoiceRules("通勤实测", ["通勤实测😮‍💨", "白蓝实测🔥"])).toContain(
      "title.no_emoji"
    );
    expect(titleChoiceRules("3 天通勤实测", ["通勤实测", "白蓝实测"])).toContain(
      "title.with_number"
    );
    expect(titleChoiceRules("这双值得买吗", ["这双值得买", "白蓝实测"])).toContain(
      "title.with_question"
    );
  });

  it("没有备选时不产生规则", () => {
    expect(titleChoiceRules("通勤实测", [])).toEqual([]);
    expect(titleChoiceRules("通勤实测", ["通勤实测"])).toEqual([]);
  });
});

describe("偏好画像累积", () => {
  it("同一规则命中两次才达到注入阈值", () => {
    let profile = EMPTY_PROFILE;
    profile = applySignal(profile, { kind: "remix", option: "shorter" });
    expect(buildPreferenceHints(profile)).toEqual([]);

    profile = applySignal(profile, { kind: "remix", option: "shorter" });
    expect(buildPreferenceHints(profile)).toEqual([
      "文案尽量更短、节奏更快（你多次选择「更短」）",
    ]);
    expect(profile.samples).toBe(2);
  });

  it("无规则的信号不改变画像", () => {
    const profile = applySignal(EMPTY_PROFILE, {
      kind: "title_choice",
      chosen: "通勤实测一双",
      alternatives: ["通勤实测两双"],
    });
    expect(profile).toBe(EMPTY_PROFILE);
  });

  it("提示按命中次数排序并限制条数", () => {
    let profile = EMPTY_PROFILE;
    for (let i = 0; i < 3; i++) {
      profile = applySignal(profile, { kind: "remix", option: "hookier" });
    }
    for (let i = 0; i < PREFERENCE_MIN_COUNT; i++) {
      profile = applySignal(profile, { kind: "remix", option: "shorter" });
    }
    const hints = buildPreferenceHints(profile);
    expect(hints[0]).toContain("更炸");
    expect(hints[1]).toContain("更短");

    const summary = profileRuleSummary(profile);
    expect(summary[0]).toMatchObject({ id: "remix.hookier", count: 3 });
  });
});
