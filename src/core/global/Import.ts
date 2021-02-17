if(typeof Shrewd != "object") throw new Error("BPStudio requires Shrewd.");

const { shrewd } = Shrewd;

/** 效能分析模式 */
const perf = false;
let perfTime: number = 0;

/** 診斷模式 */
const diagnose = true;

/** 接受診斷模式 */
const debugEnabled = true;

/** 全域的 debug 用變數 */
let debug = false;

Shrewd.option.debug = diagnose;
Shrewd.option.autoCommit = false;
