import fs from 'node:fs';
import crypto from 'node:crypto';

const QUESTIONS_PATH = 'data/questions.json';
const DATA_JS_PATH = 'data/data.js';

const ALLOWED_TYPES = new Set([
  'definition',
  'purpose',
  'distinction',
  'process',
  'example',
  'scenario',
  'calculation',
  'misconception',
  'negative',
]);
const ALLOWED_CHAPTERS = new Set(['1章', '2章', '3章', '4章', '5章', '6章']);
const ASSERTIVE_WORDS = ['すべて', '必ず', '常に', 'だけ', '一切', '不要', '無視', '考慮しなくてよい', '関係なく'];
const FILLERS = ['文脈:', '確認観点:', '派生条件'];
const ABSURD_PATTERNS = [
  '記録しなくてよい',
  '追跡できない状態にする',
  'すべて無視する',
  '必ず不要である',
  '常に実施しない',
  'ツールを導入すればプロセス改善は不要である',
  '制約やサポート状況は考慮しなくてよい',
  'リスクや目的に関係なく、すべて同じ深さでテストする',
  '対象や目的を一部に限定しすぎており、他の重要な側面を見落としている',
];

function countBy(items) {
  const counts = new Map();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'ja')));
}

function topEntries(items, limit = 10) {
  const counts = new Map();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'ja')).slice(0, limit);
}

function loadEmbedded() {
  const text = fs.readFileSync(DATA_JS_PATH, 'utf8');
  const match = text.match(/^window\.EMBEDDED_QUESTIONS = (.+);$/m);
  if (!match) return null;
  return JSON.parse(match[1]);
}

function hasNumber(text) {
  return /[0-9０-９]/.test(text);
}

function wrongSideAssertive(q) {
  const answerHas = ASSERTIVE_WORDS.some((w) => q.answer.includes(w));
  const wrongHas = q.options.some((o, i) => i !== q.correctIndex && ASSERTIVE_WORDS.some((w) => o.includes(w)));
  return wrongHas && !answerHas;
}

function looksLikeScenarioQuestion(q) {
  return /プロジェクト|チーム|サービス|アプリ|システム|リリース|変更|障害|リスク|制約|時間|品質|利用者|レビュー/.test(q.question);
}

function looksLikeK3(q) {
  return /次の|場合|状況|条件|表|リスク|優先|入力|境界|同値|判定|状態|遷移|カバレッジ|見積|工数|残り|選ぶ|判断/.test(q.question);
}

function structureErrors(data, embedded) {
  const errors = [];
  const qs = data.questions;
  if (!Array.isArray(qs)) errors.push('questions is not an array');
  if (data.meta?.questionCount !== qs.length) errors.push(`meta.questionCount ${data.meta?.questionCount} != actual ${qs.length}`);
  const ids = new Set();
  for (const q of qs) {
    if (ids.has(q.id)) errors.push(`duplicate id: ${q.id}`);
    ids.add(q.id);
    if (!ALLOWED_CHAPTERS.has(q.chapter)) errors.push(`${q.id}: invalid chapter ${q.chapter}`);
    if (!Array.isArray(q.options) || q.options.length !== 4) errors.push(`${q.id}: options length is not 4`);
    if (new Set(q.options ?? []).size !== (q.options ?? []).length) errors.push(`${q.id}: duplicate options`);
    if (!q.options?.includes(q.answer)) errors.push(`${q.id}: answer not in options`);
    if (!Number.isInteger(q.correctIndex) || q.options?.[q.correctIndex] !== q.answer) errors.push(`${q.id}: correctIndex mismatch`);
    if (!q.question?.trim()) errors.push(`${q.id}: empty question`);
    if (!q.explanation?.trim()) errors.push(`${q.id}: empty explanation`);
    if (!ALLOWED_TYPES.has(q.questionType)) errors.push(`${q.id}: invalid questionType ${q.questionType}`);
  }
  if (embedded === null) errors.push('data.js EMBEDDED_QUESTIONS could not be parsed');
  else if (crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex') !== crypto.createHash('sha256').update(JSON.stringify(embedded)).digest('hex')) {
    errors.push('data/questions.json and data/data.js are not synchronized');
  }
  return errors;
}

function audit() {
  const data = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf8'));
  const embedded = loadEmbedded();
  const qs = data.questions;
  const optionAnswerKeys = qs.map((q) => JSON.stringify({ options: q.options, answer: q.answer }));
  const optionAnswerTop = topEntries(optionAnswerKeys, 10);
  const duplicateGroups = topEntries(optionAnswerKeys, qs.length).filter(([, n]) => n > 1);
  const answerCounts = topEntries(qs.map((q) => q.answer), 10);
  let answerLongest = 0;
  for (const q of qs) {
    const lengths = q.options.map((o) => o.length);
    if (lengths[q.correctIndex] === Math.max(...lengths)) answerLongest += 1;
  }

  const report = {
    structure: {
      jsonValid: true,
      actualQuestionCount: qs.length,
      metaQuestionCount: data.meta?.questionCount,
      structureErrorCount: structureErrors(data, embedded).length,
      structureErrors: structureErrors(data, embedded).slice(0, 30),
      dataJsSynchronized: structureErrors(data, embedded).every((e) => !e.includes('synchronized')),
    },
    quality: {
      suspectedMultipleAnswerIds: qs
        .filter((q) => q.questionType === 'negative' && q.options.some((o, i) => i !== q.correctIndex && /しない|せず|残さない|無視|頼る|だけ/.test(o)))
        .map((q) => q.id),
      ellipsisExplanations: qs.filter((q) => q.explanation.includes('...')).length,
      fillerCounts: Object.fromEntries(FILLERS.map((f) => [f, qs.filter((q) => q.question.includes(f) || q.explanation.includes(f)).length])),
      duplicateOptionAnswerGroups: duplicateGroups.length,
      duplicateOptionAnswerItems: duplicateGroups.reduce((sum, [, n]) => sum + n, 0),
      duplicateOptionAnswerMaxGroupSize: duplicateGroups[0]?.[1] ?? 1,
      topRepeatedAnswers: answerCounts,
      assertiveWordsOnlyWrongSide: qs.filter(wrongSideAssertive).length,
      absurdPatternCounts: Object.fromEntries(ABSURD_PATTERNS.map((p) => [p, qs.filter((q) => q.options.some((o) => o.includes(p)) || q.explanation.includes(p)).length])),
      calculationWithoutNumber: qs.filter((q) => q.questionType === 'calculation' && !hasNumber(q.question + q.options.join('') + q.explanation)).length,
      scenarioWeakContext: qs.filter((q) => q.questionType === 'scenario' && !looksLikeScenarioQuestion(q)).length,
      k3WeakApplication: qs.filter((q) => q.kLevel === 'K3' && !looksLikeK3(q)).length,
      scenarioK1: qs.filter((q) => q.questionType === 'scenario' && q.kLevel === 'K1').length,
      answerLongestCount: answerLongest,
      answerLongestRatio: Number((answerLongest / qs.length).toFixed(4)),
      correctIndexDistribution: countBy(qs.map((q) => q.correctIndex)),
      chapterCounts: countBy(qs.map((q) => q.chapter)),
      questionTypeCounts: countBy(qs.map((q) => q.questionType)),
      kLevelCounts: countBy(qs.map((q) => q.kLevel)),
      topDuplicateOptionAnswerGroups: optionAnswerTop.map(([key, count]) => ({ count, key: key.slice(0, 180) })),
    },
  };
  return report;
}

const report = audit();
console.log(JSON.stringify(report, null, 2));
if (report.structure.structureErrorCount > 0) process.exitCode = 1;
