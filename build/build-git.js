import { createRequire } from "module";
const require = createRequire(import.meta.url);

const fs = require("fs"); // 引入文件系统
const execSync = require("child_process").execSync; // 开启一个同步子进程
const dayjs = require("dayjs");

async function start() {
  // 执行npm打包命令
  console.log("获取GIT信息...");
  // 获取当前git分支名称
  // let branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  const branch = execSync(`git branch --show-current`).toString().trim();
  // 打包时间
  const buildTime = dayjs().format("YYYY-MM-DD HH:mm:ss");

  // 需要获取的GIT信息命令集合
  const gitDataMap = {
    "git.branch": "git rev-parse --abbrev-ref HEAD",
    "git.commit.id": `git rev-parse --verify ${branch ? "origin/" + branch : "HEAD"}`,
    "git.commit.id.abbrev": `git rev-parse --short ${branch ? "origin/" + branch : "HEAD"}`,
    "git.commit.message.full": `git log -1 ${branch ? "origin/" + branch : ""} --format="%B"`,
    "git.commit.message.short": `git log -1 ${branch ? "origin/" + branch : ""} --format="%s"`,
    "git.commit.time": `git log -1 ${branch ? "origin/" + branch : ""} --format="%cd" --date=format:"%Y-%m-%d %H:%M:%S"`,
    "git.commit.user.email": `git log -1 ${branch ? "origin/" + branch : ""} --format="%ae"`,
    "git.commit.user.name": `git log -1 ${branch ? "origin/" + branch : ""} --format="%an"`,
    "git.dirty": "git status --porcelain",
    "git.remote.origin.url": "git remote get-url origin",
    "git.total.commit.count": "git rev-list --count HEAD",
  };
  const info = { "build.time": buildTime };
  Object.keys(gitDataMap).forEach((value) => {
    const text = execSync(gitDataMap[value]);
    info[value] = text.toString().trim();
  });
  // 内容输出
  const content = JSON.stringify(info, null, 2);
  console.log(content);
  // 写入文件（目录必须存在）
  try {
    fs.writeFileSync("./dist/gitinfo.json", content, "utf-8");
    console.log("GIT信息已成功写入");
  } catch (err) {
    console.error("GIT信息写入文件时出错:", err);
  }
}

// 执行任务
start();
