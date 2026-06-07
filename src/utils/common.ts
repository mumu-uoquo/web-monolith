import { useDictStore, useReturnCodeStore } from "@/stores";

/**
 * 解析返回码
 */
export function parseReturnCode(code: string | undefined): string {
  if (!code) return "";
  const returnCodeStore = useReturnCodeStore();
  const value = returnCodeStore.getReturnCode(code);
  return value || code || "";
}

/**
 * 解析字典码
 */
export function parseDictCode(code: string | undefined): string {
  if (!code) return "";
  const dictStore = useDictStore();
  const value = dictStore.getDictionary(code);
  return value?.dicValue || code || "";
}

/**
 * 断言
 */
export function assert(condition: any, message = "Assertion failed") {
  if (!condition) {
    ElMessage.error(message);
    throw new Error(message);
  }
}

/**
 * 日期范围
 * @param days 天数
 * @param end 默认当天
 */
export function getRangeDate(days: number = -7, end: Date = new Date()): [Date, Date] {
  // 结束日期
  end.setMinutes(59);
  end.setSeconds(59);
  // 起始日期
  const start = new Date();
  start.setTime(end.getTime() + 3600 * 1000 * 24 * days);
  start.setHours(0);
  start.setMinutes(0);
  start.setSeconds(0);
  return [start, end];
}

/**
 * 生成唯一标识
 */
export function guid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 密码强度判断
 * 极弱：<10, 弱：<20, 中：<30, 强：<40, 极强：>50
 */
export function passwordComplex(str: string): number {
  let score = 0;
  if (!str) {
    return score;
  }
  const pwdArr = str.split("");
  // 长度判断
  if (pwdArr.length > 7) {
    score += 10; // 长度在7以上，加10分
  } else if (pwdArr.length > 4) {
    score += 5; // 长度在4-7之间，加5分
  } else if (pwdArr.length < 3) {
    return 0; // 密码长度必须大于3
  }
  // console.log("score", str, pwdArr.length, score);
  // 小写字母
  if (
    pwdArr.some((item) => {
      return /^[a-z]$/.test(item);
    })
  ) {
    score += 5; // 加5分
  }
  // console.log("score", str, pwdArr.length, score);
  // 大写字母
  if (
    pwdArr.some((item) => {
      return /^[A-Z]$/.test(item);
    })
  ) {
    score += 5; // 加5分
  }
  // console.log("score", str, pwdArr.length, score);
  // 数字
  if (
    pwdArr.some((item) => {
      return /^[0-9]$/.test(item);
    })
  ) {
    // 判断数字出现的次数
    let count = 0;
    pwdArr.forEach((item) => {
      if (/^[0-9]$/.test(item)) {
        count++;
      }
    });
    // console.log("数字", str, count);
    score += count >= 3 ? 10 : 5; // 出现3个以上，加10分，否则加5分
  }
  // console.log("score", str, pwdArr.length, score);
  // 特殊字符
  if (
    pwdArr.some((item) => {
      return /^[\^%&'*.,;=+\-?@#!$\x22]$/.test(item);
    })
  ) {
    let count = 0;
    pwdArr.forEach((item) => {
      if (/^[\^%&'*.,;=+\-?@#!$\x22]$/.test(item)) {
        count++;
      }
    });
    // console.log("特殊", str, count);
    score += count >= 2 ? 15 : 5; // 出现2个以上，加15分，否则加5分
  }
  // console.log("score", str, pwdArr.length, score);
  // 是否连续
  let isContinued: boolean = false;
  let countinuedCount: number = 0;
  for (let i = 1; i < pwdArr.length - 1; i++) {
    const a = pwdArr[i - 1];
    const b = pwdArr[i];
    const c = pwdArr[i + 1];
    if (b.charCodeAt(0) - 1 == a.charCodeAt(0) || b.charCodeAt(0) + 1 == c.charCodeAt(0)) {
      isContinued = true; // 开始记录连续
      countinuedCount++; // 记录连续次数
    } else if (isContinued) {
      if (countinuedCount >= 3) {
        // console.log("存在连续3个字符时，分数为0", str);
        return 0; // 存在连续3个字符时，分数为0
      }
      isContinued = false;
      score -= countinuedCount; // 结束当前连续时，分数扣掉连续次数
      countinuedCount = 0;
    }
  }
  score -= countinuedCount;
  if (countinuedCount >= 3) {
    // console.log("存在连续3个字符时，分数为0", str);
    return 0; // 存在连续3个字符时，分数为0
  }
  // 单一字符
  for (let i = 0; i < pwdArr.length - 1; i++) {
    if (pwdArr[i] != pwdArr[i + 1]) {
      break;
    }
    // console.log("单一", str, pwdArr.length, i);
    if (i == pwdArr.length - 2) {
      // console.log("单一字符构成，分数为0", str);
      score = 0; // 单一字符构成，分数为0
    }
  }
  return score;
}
