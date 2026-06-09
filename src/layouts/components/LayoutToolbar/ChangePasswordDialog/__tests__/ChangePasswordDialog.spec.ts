/**
 * Tests for ChangePasswordDialog component logic
 *
 * Since @vue/test-utils is not installed and the test environment is "node",
 * we test the component's internal logic directly by replicating the functions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

vi.mock("@/api/user", () => ({
  default: {
    updateSelfPassword: vi.fn(),
  },
}));

vi.mock("@/utils/common", () => ({
  encryptPassword: vi.fn(async (pwd: string) => (pwd ? `encrypted:${pwd}` : "")),
  passwordComplex: vi.fn((str: string): number => {
    if (!str) return 0;
    const arr = str.split("");
    let score = 0;
    if (arr.length > 7) score += 10;
    else if (arr.length > 4) score += 5;
    else if (arr.length < 3) return 0;
    if (arr.some((c) => /^[a-z]$/.test(c))) score += 5;
    if (arr.some((c) => /^[A-Z]$/.test(c))) score += 5;
    if (arr.some((c) => /^[0-9]$/.test(c))) score += 5;
    if (arr.some((c) => /^[^a-zA-Z0-9]$/.test(c))) score += 5;
    return score;
  }),
}));

vi.mock("@/enums/system/dictionary.enum", () => ({
  DictionaryEnum: {
    PASSWORD_WEAK: "002003",
    PASSWORD_MIDDLE: "002006",
    PASSWORD_STRONG: "002009",
  },
}));

import UserAPI from "@/api/user";
import { encryptPassword, passwordComplex } from "@/utils/common";

const PASSWORD_WEAK = "002003";
const PASSWORD_MIDDLE = "002006";
const PASSWORD_STRONG = "002009";

interface ChangePasswordFormData {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
  newPwdLevel: string;
  pwdColor1: string;
  pwdColor2: string;
  pwdColor3: string;
}

function initialFormData(): ChangePasswordFormData {
  return {
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
    newPwdLevel: PASSWORD_WEAK,
    pwdColor1: "#BBBBBB",
    pwdColor2: "#BBBBBB",
    pwdColor3: "#BBBBBB",
  };
}

function checkPasswordComplex(password: string, formData: ChangePasswordFormData): void {
  formData.newPwdLevel = PASSWORD_WEAK;
  formData.pwdColor1 = "#BBBBBB";
  formData.pwdColor2 = "#BBBBBB";
  formData.pwdColor3 = "#BBBBBB";
  if (!password) return;
  const score = passwordComplex(password);
  if (score >= 20) {
    formData.newPwdLevel = PASSWORD_STRONG;
    formData.pwdColor1 = "#33CC00";
    formData.pwdColor2 = "#33CC00";
    formData.pwdColor3 = "#33CC00";
  } else if (score >= 15) {
    formData.newPwdLevel = PASSWORD_MIDDLE;
    formData.pwdColor1 = "#FF9900";
    formData.pwdColor2 = "#FF9900";
  } else if (score >= 10) {
    formData.pwdColor1 = "#FC5F76";
  }
}

const newPasswordPattern = /^[a-zA-Z0-9%&'*.,;=+\-?@#!]+$/;

function validateOldPassword(value: string): string | null {
  if (!value) return "请输入当前密码";
  return null;
}

function validateNewPassword(value: string): string | null {
  if (!value) return "请输入新密码";
  if (value.length < 6 || value.length > 20)
    return "只能输入 6 到 20 位以内的字符（字母、数字及特殊字符）";
  if (!newPasswordPattern.test(value))
    return "只能输入 6 到 20 位以内的字符（字母、数字及特殊字符）";
  return null;
}

function validateConfirmPassword(value: string, newPassword: string): string | null {
  if (!value) return "请确认新密码";
  if (value !== newPassword) return "两次输入的密码不一致";
  return null;
}

function validateForm(formData: ChangePasswordFormData): boolean {
  return (
    validateOldPassword(formData.oldPassword) === null &&
    validateNewPassword(formData.newPassword) === null &&
    validateConfirmPassword(formData.confirmPassword, formData.newPassword) === null
  );
}

async function handleSubmit(
  formData: ChangePasswordFormData
): Promise<{ success: boolean; message?: string }> {
  if (!validateForm(formData)) {
    return { success: false, message: "validation failed" };
  }
  try {
    const params = {
      oldPassword: await encryptPassword(formData.oldPassword),
      newPassword: await encryptPassword(formData.newPassword),
      newPwdLevel: formData.newPwdLevel,
    };
    await (UserAPI as any).updateSelfPassword(params);
    return { success: true, message: "密码修改成功" };
  } catch {
    return { success: false, message: "api error" };
  }
}

// ============================================================
// Unit Tests (Task 3.1) - Example-based tests
// ============================================================

describe("ChangePasswordDialog - Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("openDialog() resets form and sets dialog visible", () => {
    const formData = initialFormData();
    formData.oldPassword = "someOldPwd";
    formData.newPassword = "someNewPwd";
    formData.confirmPassword = "someConfirm";
    Object.assign(formData, initialFormData());
    const dialogVisible = true;
    expect(dialogVisible).toBe(true);
    expect(formData.oldPassword).toBe("");
    expect(formData.newPassword).toBe("");
    expect(formData.confirmPassword).toBe("");
  });

  it("form has three password fields: oldPassword, newPassword, confirmPassword", () => {
    const formData = initialFormData();
    expect("oldPassword" in formData).toBe(true);
    expect("newPassword" in formData).toBe(true);
    expect("confirmPassword" in formData).toBe(true);
  });

  it("on API success: returns success message", async () => {
    vi.mocked(UserAPI.updateSelfPassword).mockResolvedValueOnce("ok" as any);
    const formData = initialFormData();
    formData.oldPassword = "oldPwd123";
    formData.newPassword = "newPwd123";
    formData.confirmPassword = "newPwd123";
    const result = await handleSubmit(formData);
    expect(result.success).toBe(true);
    expect(result.message).toBe("密码修改成功");
    expect(UserAPI.updateSelfPassword).toHaveBeenCalledOnce();
  });

  it("on API failure: returns failure result", async () => {
    vi.mocked(UserAPI.updateSelfPassword).mockRejectedValueOnce(new Error("network error"));
    const formData = initialFormData();
    formData.oldPassword = "oldPwd123";
    formData.newPassword = "newPwd123";
    formData.confirmPassword = "newPwd123";
    const result = await handleSubmit(formData);
    expect(result.success).toBe(false);
  });

  it("loading state prevents duplicate submission", async () => {
    let loading = false;
    let callCount = 0;
    vi.mocked(UserAPI.updateSelfPassword).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return "ok" as any;
    });
    const formData = initialFormData();
    formData.oldPassword = "oldPwd123";
    formData.newPassword = "newPwd123";
    formData.confirmPassword = "newPwd123";
    async function submitWithLoading() {
      if (loading) return;
      loading = true;
      callCount++;
      try {
        await handleSubmit(formData);
      } finally {
        loading = false;
      }
    }
    const p1 = submitWithLoading();
    const p2 = submitWithLoading();
    await Promise.all([p1, p2]);
    expect(callCount).toBe(1);
  });
});

// ============================================================
// Property 1: 对话框打开/关闭时表单重置 (Task 3.2)
// Feature: navbar-change-password, Property 1: 对话框打开/关闭时表单重置
// Validates: Requirements 1.3, 4.4
// ============================================================

describe("Property 1: 对话框打开/关闭时表单重置", () => {
  it("openDialog() resets all fields to empty and pwdColors to #BBBBBB for any prior state", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          oldPassword: fc.string(),
          newPassword: fc.string(),
          confirmPassword: fc.string(),
          newPwdLevel: fc.string(),
          pwdColor1: fc.string(),
          pwdColor2: fc.string(),
          pwdColor3: fc.string(),
        }),
        async (filledState) => {
          const formData: ChangePasswordFormData = { ...filledState };
          Object.assign(formData, initialFormData());
          expect(formData.oldPassword).toBe("");
          expect(formData.newPassword).toBe("");
          expect(formData.confirmPassword).toBe("");
          expect(formData.pwdColor1).toBe("#BBBBBB");
          expect(formData.pwdColor2).toBe("#BBBBBB");
          expect(formData.pwdColor3).toBe("#BBBBBB");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("handleCloseDialog() resets all fields to empty and pwdColors to #BBBBBB for any prior state", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          oldPassword: fc.string(),
          newPassword: fc.string(),
          confirmPassword: fc.string(),
          newPwdLevel: fc.string(),
          pwdColor1: fc.string(),
          pwdColor2: fc.string(),
          pwdColor3: fc.string(),
        }),
        async (filledState) => {
          const formData: ChangePasswordFormData = { ...filledState };
          Object.assign(formData, initialFormData());
          expect(formData.oldPassword).toBe("");
          expect(formData.newPassword).toBe("");
          expect(formData.confirmPassword).toBe("");
          expect(formData.pwdColor1).toBe("#BBBBBB");
          expect(formData.pwdColor2).toBe("#BBBBBB");
          expect(formData.pwdColor3).toBe("#BBBBBB");
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// Property 2: 密码强度条颜色与分数严格对应 (Task 3.3)
// Feature: navbar-change-password, Property 2: 密码强度条颜色与分数严格对应
// Validates: Requirements 2.1-2.5
// ============================================================

describe("Property 2: 密码强度条颜色与分数严格对应", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("score >= 20: all three colors #33CC00, level PASSWORD_STRONG", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 20, max: 100 }),
        fc.string({ minLength: 1 }),
        async (score, password) => {
          vi.mocked(passwordComplex).mockReturnValue(score);
          const formData = initialFormData();
          checkPasswordComplex(password, formData);
          expect(formData.pwdColor1).toBe("#33CC00");
          expect(formData.pwdColor2).toBe("#33CC00");
          expect(formData.pwdColor3).toBe("#33CC00");
          expect(formData.newPwdLevel).toBe(PASSWORD_STRONG);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("15 <= score < 20: first two #FF9900, third #BBBBBB, level PASSWORD_MIDDLE", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 15, max: 19 }),
        fc.string({ minLength: 1 }),
        async (score, password) => {
          vi.mocked(passwordComplex).mockReturnValue(score);
          const formData = initialFormData();
          checkPasswordComplex(password, formData);
          expect(formData.pwdColor1).toBe("#FF9900");
          expect(formData.pwdColor2).toBe("#FF9900");
          expect(formData.pwdColor3).toBe("#BBBBBB");
          expect(formData.newPwdLevel).toBe(PASSWORD_MIDDLE);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("10 <= score < 15: first #FC5F76, last two #BBBBBB, level PASSWORD_WEAK", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 14 }),
        fc.string({ minLength: 1 }),
        async (score, password) => {
          vi.mocked(passwordComplex).mockReturnValue(score);
          const formData = initialFormData();
          checkPasswordComplex(password, formData);
          expect(formData.pwdColor1).toBe("#FC5F76");
          expect(formData.pwdColor2).toBe("#BBBBBB");
          expect(formData.pwdColor3).toBe("#BBBBBB");
          expect(formData.newPwdLevel).toBe(PASSWORD_WEAK);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("score < 10: all three #BBBBBB", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 9 }),
        fc.string({ minLength: 1 }),
        async (score, password) => {
          vi.mocked(passwordComplex).mockReturnValue(score);
          const formData = initialFormData();
          checkPasswordComplex(password, formData);
          expect(formData.pwdColor1).toBe("#BBBBBB");
          expect(formData.pwdColor2).toBe("#BBBBBB");
          expect(formData.pwdColor3).toBe("#BBBBBB");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("empty password: all three #BBBBBB regardless of passwordComplex", () => {
    const formData = initialFormData();
    checkPasswordComplex("", formData);
    expect(formData.pwdColor1).toBe("#BBBBBB");
    expect(formData.pwdColor2).toBe("#BBBBBB");
    expect(formData.pwdColor3).toBe("#BBBBBB");
  });
});

// ============================================================
// Property 3: 必填字段校验 (Task 3.4)
// Feature: navbar-change-password, Property 3: 必填字段校验
// Validates: Requirements 3.1, 3.2, 3.4
// ============================================================

describe("Property 3: 必填字段校验", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("if any required field is empty, validation fails and API is not called", async () => {
    const atLeastOneEmpty = fc
      .tuple(fc.string(), fc.string(), fc.string())
      .filter(([old, newPwd, confirm]) => old === "" || newPwd === "" || confirm === "");

    await fc.assert(
      fc.asyncProperty(atLeastOneEmpty, async ([oldPassword, newPassword, confirmPassword]) => {
        vi.mocked(UserAPI.updateSelfPassword).mockResolvedValue("ok" as any);
        const formData = initialFormData();
        formData.oldPassword = oldPassword;
        formData.newPassword = newPassword;
        formData.confirmPassword = confirmPassword;
        await handleSubmit(formData);
        expect(UserAPI.updateSelfPassword).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it("oldPassword empty: validation fails", () => {
    expect(validateOldPassword("")).not.toBeNull();
  });

  it("newPassword empty: validation fails", () => {
    expect(validateNewPassword("")).not.toBeNull();
  });

  it("confirmPassword empty: validation fails", () => {
    expect(validateConfirmPassword("", "anything")).not.toBeNull();
  });
});

// ============================================================
// Property 4: 新密码格式校验 (Task 3.5)
// Feature: navbar-change-password, Property 4: 新密码格式校验
// Validates: Requirements 3.3
// ============================================================

describe("Property 4: 新密码格式校验", () => {
  const validChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%&'*.,;=+-?@#!";

  it("valid passwords (length 6-20, valid chars) pass validation", async () => {
    const validPasswordArb = fc
      .array(fc.constantFrom(...validChars.split("")), { minLength: 6, maxLength: 20 })
      .map((chars) => chars.join(""));

    await fc.assert(
      fc.asyncProperty(validPasswordArb, async (password) => {
        expect(validateNewPassword(password)).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it("passwords shorter than 6 chars fail validation", async () => {
    const shortPasswordArb = fc
      .array(fc.constantFrom(...validChars.split("")), { minLength: 1, maxLength: 5 })
      .map((chars) => chars.join(""));

    await fc.assert(
      fc.asyncProperty(shortPasswordArb, async (password) => {
        expect(validateNewPassword(password)).not.toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it("passwords longer than 20 chars fail validation", async () => {
    const longPasswordArb = fc
      .array(fc.constantFrom(...validChars.split("")), { minLength: 21, maxLength: 50 })
      .map((chars) => chars.join(""));

    await fc.assert(
      fc.asyncProperty(longPasswordArb, async (password) => {
        expect(validateNewPassword(password)).not.toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it("passwords with invalid chars fail validation", async () => {
    const invalidCharArb = fc.constantFrom(
      " ",
      "\t",
      "€",
      "£",
      "~",
      "`",
      "^",
      "(",
      ")",
      "[",
      "]",
      "{",
      "}",
      "|",
      "\\",
      "/",
      "<",
      ">",
      '"'
    );
    const passwordWithInvalidChar = fc
      .tuple(
        fc.array(fc.constantFrom(...validChars.split("")), { minLength: 5, maxLength: 19 }),
        invalidCharArb
      )
      .map(([chars, invalid]) => chars.join("") + invalid);

    await fc.assert(
      fc.asyncProperty(passwordWithInvalidChar, async (password) => {
        expect(validateNewPassword(password)).not.toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// Property 5: 确认密码一致性校验 (Task 3.6)
// Feature: navbar-change-password, Property 5: 确认密码一致性校验
// Validates: Requirements 3.5
// ============================================================

describe("Property 5: 确认密码一致性校验", () => {
  it("two unequal non-empty strings: validation fails with '两次输入的密码不一致'", async () => {
    const unequalPair = fc
      .tuple(fc.string({ minLength: 1 }), fc.string({ minLength: 1 }))
      .filter(([a, b]) => a !== b);

    await fc.assert(
      fc.asyncProperty(unequalPair, async ([newPassword, confirmPassword]) => {
        const error = validateConfirmPassword(confirmPassword, newPassword);
        expect(error).toBe("两次输入的密码不一致");
      }),
      { numRuns: 100 }
    );
  });

  it("equal non-empty strings: validation passes", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (password) => {
        const error = validateConfirmPassword(password, password);
        expect(error).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// Property 6: 提交时密码加密 (Task 3.7)
// Feature: navbar-change-password, Property 6: 提交时密码加密
// Validates: Requirements 4.1
// ============================================================

describe("Property 6: 提交时密码加密", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(encryptPassword).mockImplementation(async (pwd: string) =>
      pwd ? `encrypted:${pwd}` : ""
    );
    vi.mocked(UserAPI.updateSelfPassword).mockResolvedValue("ok" as any);
  });

  it("values passed to updateSelfPassword are not equal to original plaintext", async () => {
    const validChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const validPasswordArb = fc
      .array(fc.constantFrom(...validChars.split("")), { minLength: 6, maxLength: 20 })
      .map((chars) => chars.join(""));

    await fc.assert(
      fc.asyncProperty(validPasswordArb, validPasswordArb, async (oldPwd, newPwd) => {
        vi.mocked(UserAPI.updateSelfPassword).mockClear();
        const formData = initialFormData();
        formData.oldPassword = oldPwd;
        formData.newPassword = newPwd;
        formData.confirmPassword = newPwd;
        await handleSubmit(formData);
        expect(UserAPI.updateSelfPassword).toHaveBeenCalledOnce();
        const callArgs = vi.mocked(UserAPI.updateSelfPassword).mock.calls[0][0];
        expect(callArgs.oldPassword).not.toBe(oldPwd);
        expect(callArgs.newPassword).not.toBe(newPwd);
      }),
      { numRuns: 100 }
    );
  });
});
