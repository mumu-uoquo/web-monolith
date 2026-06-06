// const package = require("../package.json");
// const fs = require("fs");
// const dayjs = require('dayjs');
// const zipper = require("zip-local");

// let buildTime = dayjs().format('YYYYMMDDHHmm');

// let zipName = `build${package.name ? "-" + package.name + "-v" + package.versions : ""}-${buildTime}.zip`;

// if (fs.existsSync("./dist")) {
//   zipper.sync.zip("./dist").compress().save(zipName);
//   console.log(
//     chalk.hex("#00d684").bold(`Zip completed, package name: "${zipName}"`)
//   );
// }
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const fs = require("fs");
const archiver = require("archiver");
const pkg = require("../package.json");
const dayjs = require("dayjs");

// 指定打包压缩后的文件名
const buildTime = dayjs().format("YYYYMMDDHHmm");
const outputFileName = `build-${pkg.projectName ? pkg.projectName : pkg.name}-v${pkg.version}-${buildTime}.zip`;

// 创建一个新的压缩包
const archive = archiver("zip", { zlib: { level: 9 } });

// 将压缩包输出到文件
const stream = fs.createWriteStream(outputFileName);
archive.pipe(stream);

// 打包压缩的目录或文件
archive.directory("./dist", false);

// 完成压缩操作
archive.finalize();
