// 検証スクリプト(Node版)
// 実行: node scripts/validate_questions.mjs
// 構造検証に加えて、P1レビューで指摘された解説品質の検証を行う:
//  - negative問題で正しい選択肢を誤答扱いする解説が残っていないか
//  - 欠陥レポート系の説明が 5.5.1 以外に混入していないか
//  - リスクベースドテスト系の説明が 5.2.x 以外に混入していないか
import fs from 'node:fs';

const errors = [];
const warn = [];

const raw = fs.readFileSync('data/questions.json', 'utf8');
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error('NG: questions.json がJSONとしてパースできない: ' + e.message);
  process.exit(1);
}

const qs = data.questions;
const VALID_TYPES = [
  'definition', 'purpose', 'distinction', 'process', 'example',
  'scenario', 'calculation', 'misconception', 'negative',
];
const VALID_CHAPTERS = ['1章', '2章', '3章', '4章', '5章', '6章'];

if (qs.length !== 2000) errors.push(`問題数が2000ではない: ${qs.length}`);
if (data.meta.questionCount !== qs.length) {
  errors.push(`meta.questionCount(${data.meta.questionCount}) と実問題数(${qs.length})が不一致`);
}

const ids = new Set();
for (const q of qs) {
  const id = q.id;
  if (ids.has(id)) errors.push(`ID重複: ${id}`);
  ids.add(id);
  if (!VALID_CHAPTERS.includes(q.chapter)) errors.push(`${id}: chapter不正: ${q.chapter}`);
  if (!Array.isArray(q.options) || q.options.length !== 4) errors.push(`${id}: 4択ではない`);
  if (new Set(q.options).size !== q.options.length) errors.push(`${id}: 選択肢重複`);
  if (!q.options.includes(q.answer)) errors.push(`${id}: answerがoptionsにない`);
  if (!Number.isInteger(q.correctIndex) || q.options[q.correctIndex] !== q.answer) {
    errors.push(`${id}: options[correctIndex] !== answer`);
  }
  if (!q.question || !q.question.trim()) errors.push(`${id}: 問題文が空`);
  if (!q.explanation || !q.explanation.trim()) errors.push(`${id}: 解説が空`);
  for (const o of q.options) if (!o || !o.trim()) errors.push(`${id}: 空の選択肢`);
  if (!VALID_TYPES.includes(q.questionType)) errors.push(`${id}: questionType不正: ${q.questionType}`);

  // --- P1: negative問題の解説構造 ---
  if (q.questionType === 'negative') {
    if (q.explanation.includes('主な誤答')) {
      errors.push(`${id}: negative問題の解説に「主な誤答」が残っている`);
    }
    if (q.explanation.includes('正答と比べると')) {
      errors.push(`${id}: negative問題の解説に汎用比較文が残っている`);
    }
    if (!q.explanation.includes('を選ぶ問題')) {
      errors.push(`${id}: negative問題の解説が否定形問題の構造になっていない`);
    }
    if (!q.explanation.includes('他の選択肢:')) {
      errors.push(`${id}: negative問題の解説に他の選択肢が正しい旨の説明がない`);
    }
  }

  // --- P1: 別論点テンプレートの混入 ---
  const expl = q.explanation;
  if (/再現(手順)?、影響、期待結果|修正と確認につなげ/.test(expl) && q.section !== '5.5.1') {
    errors.push(`${id}(${q.section}): 欠陥レポート系の説明が該当節外に混入`);
  }
  if (/発生可能性と影響度/.test(expl) && !String(q.section).startsWith('5.2')) {
    errors.push(`${id}(${q.section}): リスクベースドテスト系の説明が該当節外に混入`);
  }
  if (expl.includes('正答と比べると、扱う対象、時期、責務')) {
    warn.push(`${id}: 汎用比較文が残存`);
  }
}

// --- data.js 同期確認 ---
const djs = fs.readFileSync('data/data.js', 'utf8');
const m = djs.match(/^window\.EMBEDDED_QUESTIONS = (.+);$/m);
if (!m) {
  errors.push('data.js から EMBEDDED_QUESTIONS を抽出できない');
} else {
  try {
    const embedded = JSON.parse(m[1]);
    if (JSON.stringify(embedded) !== JSON.stringify(data)) {
      errors.push('data/questions.json と data/data.js が同期していない');
    }
  } catch (e) {
    errors.push('data.js のEMBEDDED_QUESTIONSがJSONとして不正: ' + e.message);
  }
}

if (warn.length) {
  console.log(`警告 ${warn.length} 件`);
  for (const w of warn.slice(0, 10)) console.log('  WARN: ' + w);
}
if (errors.length) {
  console.error(`NG: ${errors.length} 件のエラー`);
  for (const e of errors.slice(0, 40)) console.error('  ' + e);
  process.exit(1);
}
console.log(`OK: 全${qs.length}問の構造検証・P1検証・data.js同期確認をパス`);
