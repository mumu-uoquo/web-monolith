import CryptoJS from "crypto-js";

/**
 * 加密：MD5
 */
export function encryptMd5(str: string) {
  // 转UTF-8编码的WordArray
  const utf8Text = CryptoJS.enc.Utf8.parse(str);
  // 加密
  const hash = CryptoJS.MD5(utf8Text);
  // 转16进制字符串
  return hash.toString(CryptoJS.enc.Hex);
}

/**
 * 加密：AES
 */
export function encryptAES(str: string, key: string) {
  // key 转16定长字符串
  key = key.padEnd(16, "0");
  // 转UTF-8编码的WordArray
  const iv = CryptoJS.enc.Utf8.parse("");
  const utf8Str = CryptoJS.enc.Utf8.parse(str);
  const utf8Key = CryptoJS.enc.Utf8.parse(key);
  // 加密
  const hash = CryptoJS.AES.encrypt(utf8Str, utf8Key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  // 转16进制字符串
  return hash.ciphertext.toString(CryptoJS.enc.Hex);
}

/**
 * 密码加密
 */
export async function encryptPassword(password: string) {
  if (!password) {
    return "";
  }
  // 1. 先用MD5加密，防止后台得到明文
  let pswd = encryptMd5(password);
  // 2. 采用时间因子作为密钥，进行AES加密，避免直接用MD5值被复用的风险
  // TODO 若担心客户端时间偏差，可以获取服务端时间戳
  const time = new Date().getTime();
  let key1 = Math.floor(time / 5000);
  // 为了防止网络传输延时，导致超过了时间因子有效期，
  // 因此判断若100毫秒后的时间因子有改变，则延迟100ms再重新获取时间因子
  const key2 = Math.floor((time + 100) / 5000);
  if (key1 !== key2) {
    key1 = await new Promise((resolve) => {
      setTimeout(() => {
        resolve(key2);
      }, 150);
    });
  }
  // AES加密
  pswd = encryptAES(pswd, String(key1));
  return pswd;
}
