// round3: 節別知識プール(scripts/pools/)に基づく問題再構築
//
// round2の問題点(誤答の自己申告文、全選択肢の共通シナリオ冒頭、汎用正答骨格の
// 使い回し)を解消する。id / chapter / section / kLevel / questionType /
// difficulty / sourceBasis は既存のまま維持し、question / options / answer /
// correctIndex / explanation を再生成する。
//
// - 記述系(definition/purpose/distinction/misconception)は st プールから、
//   行動系(process/example/scenario)は act プールから正答と誤答を構成する。
// - negative は誤答プールから正答を取り、正しい記述3つを誤答側に置く。
// - calculation は数値パラメータを問題ごとに変えて再生成する(誤答は誤計算値)。
// - 同一節内で (正答, 選択肢セット) が重複しないよう組み合わせを回転させる。
//
// 実行: node scripts/improve_quality_round3.mjs
import fs from 'node:fs';
import ch1 from './pools/ch1.mjs';
import ch2 from './pools/ch2.mjs';
import ch3 from './pools/ch3.mjs';
import ch4 from './pools/ch4.mjs';
import ch5 from './pools/ch5.mjs';
import ch6 from './pools/ch6.mjs';

const QUESTIONS_PATH = 'data/questions.json';
const DATA_JS_PATH = 'data/data.js';

const POOLS = { ...ch1, ...ch2, ...ch3, ...ch4, ...ch5, ...ch6 };

const SECTION_TITLES = {
  '1.1.1': 'テストの目的', '1.1.2': 'テストとデバッグの違い', '1.2.1': 'テストの必要性',
  '1.2.2': 'テストと品質保証', '1.2.3': 'エラー、欠陥、故障、根本原因', '1.3.1': 'テストの7原則',
  '1.4.1': 'テスト活動とタスク', '1.4.2': 'テストプロセスの文脈依存性', '1.4.3': 'テストウェア',
  '1.4.4': 'テストベースとテスト成果物のトレーサビリティ', '1.4.5': 'テストにおける役割',
  '1.5.1': 'テスト担当者のスキル', '1.5.2': 'チーム全体のアプローチ', '1.5.3': 'テストの独立性',
  '2.1.1': 'ソフトウェア開発ライフサイクルとテスト', '2.1.2': '優れたテスト実践',
  '2.1.3': 'テストファーストアプローチ', '2.1.4': 'DevOpsとテスト', '2.1.5': 'シフトレフト',
  '2.1.6': 'レトロスペクティブとプロセス改善', '2.2.1': 'テストレベル', '2.2.2': 'テストタイプ',
  '2.2.3': '確認テストとリグレッションテスト', '2.3.1': '保守テスト',
  '3.1.1': '静的テストの基本', '3.1.2': '静的テストの価値', '3.1.3': '静的テストと動的テストの違い',
  '3.2.1': 'レビューの利点', '3.2.2': 'レビューのプロセス', '3.2.3': 'レビューの役割',
  '3.2.4': 'レビュータイプ', '3.2.5': 'レビューの成功要因',
  '4.1.1': 'テスト技法の分類', '4.2.1': '同値分割法', '4.2.2': '境界値分析',
  '4.2.3': 'デシジョンテーブルテスト', '4.2.4': '状態遷移テスト',
  '4.3.1': 'ステートメントテストとカバレッジ', '4.3.2': 'ブランチテストとカバレッジ',
  '4.3.3': 'ホワイトボックステストの価値', '4.4.1': 'エラー推測', '4.4.2': '探索的テスト',
  '4.4.3': 'チェックリストベースドテスト', '4.5.1': 'ユーザーストーリー', '4.5.2': '受け入れ基準',
  '4.5.3': 'ATDD',
  '5.1.1': 'テスト計画', '5.1.2': 'リリース計画とイテレーション計画', '5.1.3': '開始基準と終了基準',
  '5.1.4': '見積り技法', '5.1.5': 'テストケースの優先順位付け', '5.1.6': 'テストピラミッド',
  '5.1.7': 'テスト四象限', '5.2.1': 'リスクレベル', '5.2.2': 'プロジェクトリスクとプロダクトリスク',
  '5.2.3': 'プロダクトリスク分析', '5.2.4': 'リスクベースドテスト',
  '5.3.1': 'テストモニタリングのメトリクス', '5.3.2': 'テストレポート', '5.3.3': 'コミュニケーション',
  '5.4.1': '構成管理', '5.5.1': '欠陥管理',
  '6.1.1': 'テストツールの支援', '6.2.1': 'ツール導入の利点とリスク',
};

const ST_TYPES = new Set(['definition', 'purpose', 'distinction', 'misconception']);

const STEMS = {
  definition: [
    (t) => `${t}の説明として、最も適切なものはどれか。`,
    (t) => `${t}に関する記述として、最も適切なものはどれか。`,
    (t) => `${t}の理解として、最も適切なものはどれか。`,
  ],
  purpose: [
    (t) => `${t}の目的や価値の説明として、最も適切なものはどれか。`,
    (t) => `${t}が果たす役割の説明として、最も適切なものはどれか。`,
  ],
  distinction: [
    (t) => `${t}と関連する概念の違いに関する記述として、最も適切なものはどれか。`,
    (t) => `${t}を関連する概念と区別する説明として、最も適切なものはどれか。`,
  ],
  misconception: [
    (t) => `${t}について、正しい理解を示す記述はどれか。`,
    (t) => `${t}に関する次の記述のうち、適切なものはどれか。`,
  ],
  process: [
    (t) => `${t}の進め方として、最も適切なものはどれか。`,
    (t) => `${t}を実務で進めるときの対応として、最も適切なものはどれか。`,
    (t) => `${t}に関する実務上の対応として、最も適切なものはどれか。`,
  ],
  example: [
    (t) => `${t}の考え方に沿った行動の例として、最も適切なものはどれか。`,
    (t) => `${t}を適用した行動の例として、最も適切なものはどれか。`,
  ],
  scenario: [
    (t) => `${t}の考え方を実務の場面で適用するとき、最も適切な対応はどれか。`,
    (t) => `${t}に基づく判断として、最も適切なものはどれか。`,
    (t) => `${t}を適用する場面での対応として、最も適切なものはどれか。`,
  ],
  negative_st: [
    (t) => `${t}に関する記述のうち、適切でないものはどれか。`,
    (t) => `${t}の考え方として、適切でないものはどれか。`,
  ],
  negative_act: [
    (t) => `${t}への取り組み方として、適切でないものはどれか。`,
    (t) => `${t}を実務で扱う対応のうち、適切でないものはどれか。`,
  ],
};

const GENERIC_ST_STEMS = [
  (t) => `${t}に関する記述として、最も適切なものはどれか。`,
  (t) => `${t}の説明として、最も適切なものはどれか。`,
];

// n個からr個選ぶ組み合わせの列挙(辞書順)
function combinations(n, r) {
  const result = [];
  const idx = Array.from({ length: r }, (_, i) => i);
  while (true) {
    result.push([...idx]);
    let i = r - 1;
    while (i >= 0 && idx[i] === n - r + i) i -= 1;
    if (i < 0) break;
    idx[i] += 1;
    for (let j = i + 1; j < r; j += 1) idx[j] = idx[j - 1] + 1;
  }
  return result;
}

// ---- 計算問題(節ごとにパラメータを変えて一意化) ----

const SYSTEMS = [
  'ECサイトの注文機能', 'スマートフォン決済アプリ', '医療予約システム', '社内勤怠管理サービス',
  'オンライン学習サイト', '航空券予約サイト', 'IoT監視サービス', '自治体申請ポータル',
  'サブスクリプション課金機能', 'データ移行プロジェクト', '在庫管理システム', 'チャットサポート機能',
  '保険見積りサービス', '配送追跡アプリ', '会員認証基盤', 'ポイント管理機能',
  '帳票出力バッチ', '検索API', '不正検知ダッシュボード', '予約キャンセル機能',
];

// 4.2.3用: 条件名を持つ業務ルール(選択肢文面の一意性を条件名で担保する)
const DT_RULES = [
  { rule: '送料無料の判定', conds: ['会員である', '購入金額が1万円以上である'], result: '送料無料' },
  { rule: '送金可否の判定', conds: ['本人確認が済んでいる', '残高が不足していない'], result: '送金可' },
  { rule: '公開操作の許可判定', conds: ['管理者権限がある', '対象が承認済みである'], result: '公開可' },
  { rule: '割引適用の判定', conds: ['クーポンを保有している', '対象商品である', 'セール期間内である'], result: '割引適用' },
  { rule: '融資可否の一次判定', conds: ['年収基準を満たす', '延滞履歴がない', '勤続年数基準を満たす'], result: '一次通過' },
  { rule: '入場可否の判定', conds: ['予約がある', '身分証を提示できる'], result: '入場可' },
  { rule: '再検査要否の判定', conds: ['測定値が基準範囲外である', '前回も範囲外だった'], result: '再検査' },
  { rule: '通知送信の判定', conds: ['通知を許可している', '重要度が高である', '営業時間内である'], result: '通知送信' },
  { rule: 'ポイント付与の判定', conds: ['会員ランクが対象である', '対象カテゴリの購入である'], result: 'ポイント付与' },
  { rule: '自動承認の判定', conds: ['申請額が上限未満である', '必須書類がそろっている', '申請者が在籍中である'], result: '自動承認' },
  { rule: 'アラート発報の判定', conds: ['閾値を超過している', '既知の計画作業ではない'], result: 'アラート発報' },
  { rule: '返品受付の判定', conds: ['購入から30日以内である', '未使用である', 'レシートがある'], result: '返品受付' },
];

function buildCalc(section, c) {
  const sys = SYSTEMS[c % SYSTEMS.length];
  if (section === '4.2.1') {
    const low = 1 + (c % 17);
    const high = low + 6 + (c % 5) * 2;
    const correct = `${low}以上${high}以下を有効同値クラス、${low - 1}以下と${high + 1}以上を無効同値クラスとして代表値を選ぶ`;
    return {
      question: `${sys}の入力欄は${low}以上${high}以下を有効とする。同値分割法の適用として最も適切なものはどれか。`,
      correct,
      wrongs: [
        `${low - 1}を有効同値クラスの代表値として選ぶ`,
        `${high + 1}を有効同値クラスの代表値として選ぶ`,
        `${low}から${high}の各値をそれぞれ別の同値クラスとして扱う`,
      ],
      reason: `有効範囲が${low}以上${high}以下なので、範囲内を有効同値クラス、範囲の外側(${low - 1}以下、${high + 1}以上)を無効同値クラスとして識別し、各クラスの代表値を選ぶ。`,
      wrongNote: `${low - 1}や${high + 1}は無効同値クラスに属する値であり、有効同値クラスの代表値にはならない。また、範囲内の各値を別クラスに分けると同値分割による効率化の意味が失われる。`,
    };
  }
  if (section === '4.2.2') {
    const low = 5 + ((c * 3) % 40);
    const high = low + 12 + (c % 7);
    const mid = Math.floor((low + high) / 2);
    const correct = `${low - 1}、${low}、${high}、${high + 1}を確認する`;
    return {
      question: `${sys}の入力欄は${low}以上${high}以下を有効とする。2値の境界値分析で確認する値の組として、最も適切なものはどれか。`,
      correct,
      wrongs: [
        `${low}、${mid}、${high}を確認する`,
        `${low - 2}、${low - 1}、${high + 1}、${high + 2}を確認する`,
        `${low}と${high}の2値を確認する`,
      ],
      reason: `2値の境界値分析では、各境界について境界値とそれに隣接する無効側の値を使う。下限${low}の外側は${low - 1}、上限${high}の外側は${high + 1}であるため、${low - 1}、${low}、${high}、${high + 1}を確認する。`,
      wrongNote: `中央値${mid}を含む組は境界を狙えておらず、${low - 2}や${high + 2}から始まる組は境界値そのものと内側の境界を外している。境界値${low}と${high}の2値では、無効側の隣接値による誤受理の確認ができない。`,
    };
  }
  if (section === '4.2.3') {
    const r = DT_RULES[c % DT_RULES.length];
    const n = r.conds.length;
    const combos = 2 ** n;
    const form = Math.floor(c / DT_RULES.length) % 3;
    const condsText = `「${r.conds.join('」「')}」`;
    if (form === 1) {
      const k = 1 + (c % 2);
      const correct = `${condsText}の組み合わせ${combos}通りから、起こり得ない${k}列を除いた${combos - k}列を確認する`;
      return {
        question: `${sys}の${r.rule}は、${condsText}の${n}個の真偽条件で決まる。業務上起こり得ない組み合わせが${k}通りあるとき、デシジョンテーブルで確認する列の数として最も適切なものはどれか。`,
        correct,
        wrongs: [
          `起こり得ない列も含めて${combos}列を確認する`,
          `${condsText}の組み合わせに${k}列を加えた${combos + k}列を確認する`,
          `${condsText}の組み合わせから${k + 1}列を除いた${combos - k - 1}列を確認する`,
        ],
        reason: `真偽${n}条件の組み合わせは2の${n}乗で${combos}通りであり、業務上起こり得ない${k}列は根拠を記録した上で除外するため、確認対象は${combos - k}列になる。`,
        wrongNote: `${combos}列は実現不能な列を除いておらず、${combos + k}列と${combos - k - 1}列は組み合わせ数または除外数の計算を誤っている。`,
      };
    }
    if (form === 2) {
      const correct = `各列に少なくとも1件を対応付け、最少${combos}件のテストケースを作る`;
      return {
        question: `${sys}の${r.rule}は、${condsText}の${n}個の真偽条件で決まる。デシジョンテーブルの各列を少なくとも1回確認する場合、最少のテストケース数として正しいものはどれか。`,
        correct,
        wrongs: [
          `条件の数と同じ${n}件のテストケースで確認できる`,
          `${combos - 1}件のテストケースで各列を確認できる`,
          `各列に2件ずつ、${combos * 2}件のテストケースが最少になる`,
        ],
        reason: `真偽${n}条件の組み合わせは2の${n}乗で${combos}列あり、各列を少なくとも1回確認する最少のテストケース数は列数と同じ${combos}件である。`,
        wrongNote: `${n}件では列の大半が未確認になり、${combos - 1}件では1列が漏れる。${combos * 2}件は各列1件で足りる最少数の条件に合わない。`,
      };
    }
    const correct = `${condsText}の真偽の組み合わせ${combos}通りごとに${r.result}かどうかを定めて確認する`;
    return {
      question: `${sys}の${r.rule}は、${condsText}の${n}個の真偽条件で決まる。デシジョンテーブルテストの適用として最も適切なものはどれか。`,
      correct,
      wrongs: [
        `条件ごとに1列ずつ、${n}列の表で確認する`,
        `代表的な組み合わせ${n + 1}通りに絞って表を作り、残りは対象にしない`,
        `組み合わせ${combos}通りに条件数を加えた${combos + n}列の表で確認する`,
      ],
      reason: `真偽${n}条件の組み合わせは2の${n}乗で${combos}通りであり、各組み合わせに対して${r.result}になるかどうかの期待結果を定めて確認する。`,
      wrongNote: `${n}列の表は条件単独の確認にとどまり組み合わせを扱えない。根拠なく${n + 1}通りに絞ると漏れが生じ、${combos + n}列は組み合わせ数の計算を誤っている。`,
    };
  }
  // 5.1.4 三点見積り
  const o = 2 + (c % 6);
  const m = o + 1 + (c % 4);
  let p = m + 2 + (c % 5);
  if (2 * m === o + p) p += 1; // 単純平均と期待値が一致するパラメータを避ける
  const e = ((o + 4 * m + p) / 6).toFixed(1);
  const avg = ((o + m + p) / 3).toFixed(1);
  const correct = `(${o}+4×${m}+${p})÷6で約${e}人日と見積もる`;
  return {
    question: `${sys}のテスト作業を三点見積りで見積もる。楽観値${o}人日、最頻値${m}人日、悲観値${p}人日のとき、期待値として最も適切なものはどれか。`,
    correct,
    wrongs: [
      `単純平均の(${o}+${m}+${p})÷3で約${avg}人日と見積もる`,
      `悲観値を採用して${p}人日と見積もる`,
      `最頻値を採用して${m}人日と見積もる`,
    ],
    reason: `三点見積りの期待値は(楽観値+4×最頻値+悲観値)÷6で求めるため、(${o}+4×${m}+${p})÷6=約${e}人日となる。最頻値に重みを付けることで、単純平均よりも分布の偏りを反映できる。`,
    wrongNote: `単純平均(約${avg}人日)は三点見積りの重み付けを使っていない。悲観値${p}人日や最頻値${m}人日の一点採用は、三つの値を使って不確実性を織り込むというこの技法の考え方に合わない。`,
  };
}

// ---- 選択肢の構成 ----

function placeCorrect(correct, wrongs, targetIndex) {
  const options = [];
  let w = 0;
  for (let i = 0; i < 4; i += 1) options.push(i === targetIndex ? correct : wrongs[w++]);
  return options;
}

function buildExplanation(q, title, parts) {
  return parts.join('\n') + `\n根拠: JSTQB Foundation Level シラバス Version 2023V4.0.J02 の ${q.section}(${title})に基づくオリジナル問題。`;
}

// ---- メイン ----

const data = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf8'));

const counters = new Map(); // key -> 連番
function nextCount(key) {
  const v = counters.get(key) ?? 0;
  counters.set(key, v + 1);
  return v;
}

const usedPerSection = new Map(); // section -> Set(正答+選択肢セット)
function isUsed(section, answer, options) {
  const key = `${answer}||${[...options].sort().join('|')}`;
  let set = usedPerSection.get(section);
  if (!set) { set = new Set(); usedPerSection.set(section, set); }
  if (set.has(key)) return true;
  set.add(key);
  return false;
}

let changed = 0;
data.questions.forEach((q, index) => {
  const title = SECTION_TITLES[q.section] ?? q.section;
  const targetIndex = index % 4;

  if (q.questionType === 'calculation') {
    const c = nextCount(`${q.section}|calc`);
    const calc = buildCalc(q.section, c);
    q.question = calc.question;
    q.options = placeCorrect(calc.correct, calc.wrongs, targetIndex);
    q.answer = calc.correct;
    q.correctIndex = targetIndex;
    q.explanation = buildExplanation(q, title, [
      `[${q.section} ${title}]`,
      `正解は「${calc.correct}」。`,
      `理由: ${calc.reason}`,
      `他の選択肢: ${calc.wrongNote}`,
    ]);
    changed += 1;
    return;
  }

  const pool = POOLS[q.section];
  if (!pool) throw new Error(`プール未定義: ${q.section}`);
  const kind = ST_TYPES.has(q.questionType)
    ? 'st'
    : q.questionType === 'negative'
      ? (pool.st ? 'st' : 'act')
      : 'act';
  const kp = pool[kind];
  if (!kp) throw new Error(`${q.section} に ${kind} プールがない (type=${q.questionType})`);

  if (q.questionType === 'negative') {
    const k = nextCount(`${q.section}|neg`);
    const ans = kp.bads[k % kp.bads.length];
    const combos = combinations(kp.goods.length, 3);
    let cc = nextCount(`${q.section}|negCombo`);
    let goods;
    for (let attempt = 0; ; attempt += 1) {
      goods = combos[(cc + attempt) % combos.length].map((i) => kp.goods[i]);
      if (!isUsed(q.section, ans.t, [ans.t, ...goods.map((g) => g.t)])) break;
      if (attempt > combos.length) throw new Error(`組み合わせ枯渇: ${q.section} negative`);
    }
    const stems = kind === 'st' ? STEMS.negative_st : STEMS.negative_act;
    q.question = stems[Math.floor(k / kp.bads.length) % stems.length](title);
    q.options = placeCorrect(ans.t, goods.map((g) => g.t), targetIndex);
    q.answer = ans.t;
    q.correctIndex = targetIndex;
    q.explanation = buildExplanation(q, title, [
      `[${q.section} ${title}]`,
      `この問題は、適切でないものを選ぶ問題である。`,
      `正解(適切でないもの)は「${ans.t}」。`,
      `理由: ${ans.why}。`,
      `他の選択肢: 「${goods[0].t}」「${goods[1].t}」「${goods[2].t}」は、いずれも${title}の考え方に沿った適切な内容である。`,
    ]);
    changed += 1;
    return;
  }

  // 肯定形(st/act)
  const type = q.questionType;
  const k = nextCount(`${q.section}|${type}`);
  let answerPool = kp.goods;
  let stems = STEMS[type] ?? GENERIC_ST_STEMS;
  if (type === 'purpose' || type === 'distinction') {
    const tag = type === 'purpose' ? 'purpose' : 'dist';
    const tagged = kp.goods.filter((g) => g.tags?.includes(tag));
    if (tagged.length > 0) {
      answerPool = tagged;
    } else {
      stems = GENERIC_ST_STEMS;
    }
  }
  const ans = answerPool[k % answerPool.length];
  const combos = combinations(kp.bads.length, 3);
  const cc = nextCount(`${q.section}|${kind}Combo`);
  let wrongs;
  for (let attempt = 0; ; attempt += 1) {
    wrongs = combos[(cc + attempt) % combos.length].map((i) => kp.bads[i]);
    if (!isUsed(q.section, ans.t, [ans.t, ...wrongs.map((w) => w.t)])) break;
    if (attempt > combos.length) throw new Error(`組み合わせ枯渇: ${q.section} ${type}`);
  }
  q.question = stems[Math.floor(k / answerPool.length) % stems.length](title);
  q.options = placeCorrect(ans.t, wrongs.map((w) => w.t), targetIndex);
  q.answer = ans.t;
  q.correctIndex = targetIndex;
  q.explanation = buildExplanation(q, title, [
    `[${q.section} ${title}]`,
    `正解は「${ans.t}」。`,
    `理由: ${ans.why}。`,
    `他の選択肢: 「${wrongs[0].t}」は、${wrongs[0].why}。「${wrongs[1].t}」は、${wrongs[1].why}。「${wrongs[2].t}」は、${wrongs[2].why}。`,
  ]);
  changed += 1;
});

data.meta.questionCount = data.questions.length;
data.meta.createdAt = new Date().toISOString().slice(0, 19);

// data.js は window.INITIAL_LOGS の行を保持したまま同期する
const oldDjs = fs.readFileSync(DATA_JS_PATH, 'utf8');
const logsMatch = oldDjs.match(/^window\.INITIAL_LOGS = .*$/m);
const logsLine = logsMatch ? logsMatch[0] : 'window.INITIAL_LOGS = {"version":1,"sessions":[],"answers":[],"stats":{"total":0,"correct":0,"incorrect":0,"accuracy":0}};';

fs.writeFileSync(QUESTIONS_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
fs.writeFileSync(DATA_JS_PATH, `window.EMBEDDED_QUESTIONS = ${JSON.stringify(data)};\n${logsLine}\n`, 'utf8');

console.log(`updated ${changed} questions`);
