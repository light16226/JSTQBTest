import fs from 'node:fs';

const QUESTIONS_PATH = 'data/questions.json';
const DATA_JS_PATH = 'data/data.js';

const SECTION_TITLES = {
  '1.1.1': 'テストの目的',
  '1.1.2': 'テストとデバッグの違い',
  '1.2.1': 'テストの必要性',
  '1.2.2': 'テストと品質保証',
  '1.2.3': 'エラー、欠陥、故障、根本原因',
  '1.3.1': 'テストの7原則',
  '1.4.1': 'テスト活動とタスク',
  '1.4.2': 'テストプロセスの文脈依存性',
  '1.4.3': 'テストウェア',
  '1.4.4': 'テストベースとテスト成果物のトレーサビリティ',
  '1.4.5': 'テストにおける役割',
  '1.5.1': 'テスト担当者のスキル',
  '1.5.2': 'チーム全体のアプローチ',
  '1.5.3': 'テストの独立性',
  '2.1.1': 'ソフトウェア開発ライフサイクルとテスト',
  '2.1.2': '優れたテスト実践',
  '2.1.3': 'テストファーストアプローチ',
  '2.1.4': 'DevOpsとテスト',
  '2.1.5': 'シフトレフト',
  '2.1.6': 'レトロスペクティブとプロセス改善',
  '2.2.1': 'テストレベル',
  '2.2.2': 'テストタイプ',
  '2.2.3': '確認テストとリグレッションテスト',
  '2.3.1': '保守テスト',
  '3.1.1': '静的テストの基本',
  '3.1.2': '静的テストの価値',
  '3.1.3': '静的テストと動的テストの違い',
  '3.2.1': 'レビューの利点',
  '3.2.2': 'レビューのプロセス',
  '3.2.3': 'レビューの役割',
  '3.2.4': 'レビュータイプ',
  '3.2.5': 'レビューの成功要因',
  '4.1.1': 'テスト技法の分類',
  '4.2.1': '同値分割法',
  '4.2.2': '境界値分析',
  '4.2.3': 'デシジョンテーブルテスト',
  '4.2.4': '状態遷移テスト',
  '4.3.1': 'ステートメントテストとカバレッジ',
  '4.3.2': 'ブランチテストとカバレッジ',
  '4.3.3': 'ホワイトボックステストの価値',
  '4.4.1': 'エラー推測',
  '4.4.2': '探索的テスト',
  '4.4.3': 'チェックリストベースドテスト',
  '4.5.1': 'ユーザーストーリー',
  '4.5.2': '受け入れ基準',
  '4.5.3': 'ATDD',
  '5.1.1': 'テスト計画',
  '5.1.2': 'リリース計画とイテレーション計画',
  '5.1.3': '開始基準と終了基準',
  '5.1.4': '見積り技法',
  '5.1.5': 'テストケースの優先順位付け',
  '5.1.6': 'テストピラミッド',
  '5.1.7': 'テスト四象限',
  '5.2.1': 'リスクレベル',
  '5.2.2': 'プロジェクトリスクとプロダクトリスク',
  '5.2.3': 'プロダクトリスク分析',
  '5.2.4': 'リスクベースドテスト',
  '5.3.1': 'テストモニタリングのメトリクス',
  '5.3.2': 'テストレポート',
  '5.3.3': 'コミュニケーション',
  '5.4.1': '構成管理',
  '5.5.1': '欠陥管理',
  '6.1.1': 'テストツールの支援',
  '6.2.1': 'ツール導入の利点とリスク',
};

const SECTION_SUMMARIES = {
  '1.1.1': 'テストは欠陥の発見、品質情報の提供、意思決定支援、要求や規制への適合確認に役立つ。',
  '1.1.2': 'テストは故障や欠陥を見つける活動であり、デバッグは原因を特定して修正する開発活動である。',
  '1.2.1': 'テストは欠陥による損失を減らし、品質に関する客観的な情報を関係者へ提供する。',
  '1.2.2': 'テストは品質保証活動の一部であり、品質保証はプロセスを含む広い活動である。',
  '1.2.3': '人のエラーが成果物に欠陥を作り込み、欠陥を含むソフトウェアの実行が故障として現れることがある。',
  '1.3.1': 'テストには全数テストの困難さ、早期テスト、欠陥の偏在、殺虫剤のパラドックスなどの原則がある。',
  '1.4.1': 'テスト活動は計画、モニタリング、分析、設計、実装、実行、完了を文脈に応じて組み合わせる。',
  '1.4.2': 'テストプロセスは開発モデル、リスク、制約、チーム構成などに応じて調整する。',
  '1.4.3': 'テストウェアはテスト活動で作成・利用する成果物であり、管理と更新が必要である。',
  '1.4.4': 'テストベース、テスト条件、テストケース、結果を追跡できると影響分析と説明責任を支援できる。',
  '1.4.5': 'テストマネジメントとテスト実行には異なる責任があり、役割分担を明確にする必要がある。',
  '1.5.1': 'テスト担当者には分析、批判的思考、コミュニケーション、ドメイン理解などが求められる。',
  '1.5.2': '品質はチーム全体で作り込むもので、テスト担当者だけの責任にしない。',
  '1.5.3': '独立した視点は思い込みを減らすが、開発知識とのバランスと協調が必要である。',
  '2.1.1': 'テスト活動の時期と範囲は、逐次型、反復型、アジャイルなど開発ライフサイクルにより変わる。',
  '2.1.2': 'テストを早期から継続的に行い、テストベースと成果物を結び付けることが有効である。',
  '2.1.3': 'テストファーストでは実装前に期待する振る舞いや受け入れ条件を明確にする。',
  '2.1.4': 'DevOpsではCI/CD、監視、自動化を使い、開発から運用まで短いフィードバックを得る。',
  '2.1.5': 'シフトレフトは早い段階でレビューやテストを行い、欠陥の作り込みと手戻りを減らす。',
  '2.1.6': 'レトロスペクティブは経験から改善点を見つけ、次のサイクルのプロセス改善につなげる。',
  '2.2.1': 'テストレベルはコンポーネント、統合、システム、受け入れなど対象と目的で分けられる。',
  '2.2.2': 'テストタイプは機能、非機能、ホワイトボックス、変更関連など確認観点で分けられる。',
  '2.2.3': '確認テストは修正の確認、リグレッションテストは変更による副作用の検出を目的とする。',
  '2.3.1': '保守テストでは変更、移行、廃止などの影響を分析し、必要な範囲を選ぶ。',
  '3.1.1': '静的テストは成果物を実行せずにレビューや静的解析で問題を見つける。',
  '3.1.2': '静的テストは早期に欠陥を見つけ、後工程の修正コストと手戻りを減らす。',
  '3.1.3': '静的テストと動的テストは見つけやすい問題が異なり、互いに補完する。',
  '3.2.1': 'レビューは欠陥発見だけでなく、知識共有、合意形成、品質向上にも役立つ。',
  '3.2.2': 'レビューは計画、開始、個別レビュー、コミュニケーション、修正と報告の流れで進める。',
  '3.2.3': 'レビューでは作成者、レビューア、モデレータ、書記などの役割が異なる。',
  '3.2.4': 'レビュータイプは目的、形式性、参加者、記録の程度に応じて選ぶ。',
  '3.2.5': 'レビュー成功には明確な目的、適切な参加者、十分な準備、建設的な姿勢が必要である。',
  '4.1.1': 'テスト技法はブラックボックス、ホワイトボックス、経験ベースなどの観点で選ぶ。',
  '4.2.1': '同値分割法は同じ扱いになる入力や条件をクラス化し、代表値で効率よく確認する。',
  '4.2.2': '境界値分析は範囲の端や端の直前直後で欠陥が出やすいことに注目する。',
  '4.2.3': 'デシジョンテーブルは複数条件の組み合わせと期待結果を整理する。',
  '4.2.4': '状態遷移テストは状態、イベント、遷移、無効遷移を使って振る舞いを確認する。',
  '4.3.1': 'ステートメントカバレッジは実行したステートメントの割合で測る。',
  '4.3.2': 'ブランチカバレッジは分岐結果をどれだけ実行したかで測る。',
  '4.3.3': 'ホワイトボックステストは内部構造に基づき、仕様ベースだけでは見落としやすい経路を補う。',
  '4.4.1': 'エラー推測は経験や過去の欠陥傾向から欠陥が潜みやすい箇所を狙う。',
  '4.4.2': '探索的テストは学習、設計、実行を並行して行い、結果から次のテストを調整する。',
  '4.4.3': 'チェックリストベースドテストは観点の抜け漏れを抑えつつ、状況に応じた判断も必要とする。',
  '4.5.1': 'ユーザーストーリーは利用者、目的、価値を簡潔に表し、会話と確認の出発点になる。',
  '4.5.2': '受け入れ基準は期待する振る舞いをテスト可能で合意できる形にする。',
  '4.5.3': 'ATDDでは関係者が受け入れ基準と例を共有し、実装前に期待結果を明確にする。',
  '5.1.1': 'テスト計画は目的、範囲、リソース、スケジュール、リスク対応を整理する。',
  '5.1.2': 'リリース計画は長期の範囲、イテレーション計画は短期の具体的作業を扱う。',
  '5.1.3': '開始基準と終了基準は、活動を始める条件と完了を判断する条件を明確にする。',
  '5.1.4': '見積りは過去データ、専門家判断、三点見積りなどの根拠を使って作業量を判断する。',
  '5.1.5': 'テストケースの優先順位はリスク、重要度、依存関係、欠陥検出可能性に基づいて決める。',
  '5.1.6': 'テストピラミッドは低い層に高速で保守しやすいテストを多く置く考え方である。',
  '5.1.7': 'テスト四象限はビジネス面と技術面、チーム支援と製品批評の観点でテストを整理する。',
  '5.2.1': 'リスクレベルは発生可能性と影響度の組み合わせで評価する。',
  '5.2.2': 'プロジェクトリスクは遂行上の不確実性、プロダクトリスクは製品品質への不確実性である。',
  '5.2.3': 'プロダクトリスク分析ではリスクを識別、評価し、テストの焦点を決める。',
  '5.2.4': 'リスクベースドテストでは高リスク領域により多くのテスト努力を割り当てる。',
  '5.3.1': 'メトリクスは進捗、品質、残作業を客観的に把握し制御に使う。',
  '5.3.2': 'テストレポートは対象者の意思決定に必要な進捗、結果、リスク、障害情報を伝える。',
  '5.3.3': 'コミュニケーションは相手の関心と必要な詳細度に合わせて行う。',
  '5.4.1': '構成管理はテスト対象、テストウェア、環境、結果の版と関係を管理する。',
  '5.5.1': '欠陥管理は欠陥の再現手順、期待結果、実際の結果、影響、状態を追跡する。',
  '6.1.1': 'テストツールは活動を支援するが、何を確認すべきかの判断を置き換えるものではない。',
  '6.2.1': 'ツール導入では利点だけでなく、導入コスト、保守、教育、サポート、組織適合性も評価する。',
};

const SYSTEMS = [
  'ECサイトの注文機能',
  'スマートフォン決済アプリ',
  '医療予約システム',
  '社内勤怠管理サービス',
  'オンライン学習サイト',
  '航空券予約サイト',
  'IoT監視サービス',
  '自治体申請ポータル',
  'サブスクリプション課金機能',
  'データ移行プロジェクト',
  '在庫管理システム',
  'チャットサポート機能',
  '保険見積りサービス',
  '配送追跡アプリ',
  '会員認証基盤',
  'ポイント管理機能',
  '帳票出力バッチ',
  '検索API',
  '不正検知ダッシュボード',
  '予約キャンセル機能',
];
const FEATURES = [
  '入力条件が複数あり、仕様変更の影響範囲を確認している',
  '短いリリースサイクルの中で確認範囲を絞る必要がある',
  '過去障害の再発防止と新規変更の確認を両立させたい',
  '関係者の認識差を減らし、判断根拠を説明できるようにしたい',
  '環境利用時間が限られ、優先度の高い確認から進めたい',
  '外部サービス連携があり、インターフェースの影響を見極めたい',
  '非機能面の懸念があり、機能確認とのバランスを取りたい',
  'レビューで見つかった指摘を次のテスト設計に反映したい',
  'データ条件の組み合わせが多く、効率よく代表例を選びたい',
  '修正後の確認と周辺機能への影響確認を分けて考えたい',
  'ビジネス側がリリース可否を判断できる情報を求めている',
  '自動化候補が増えており、保守性と効果を見比べたい',
  '利用者への影響が大きい領域から確認する必要がある',
  'チーム内の経験差があり、確認観点を共有したい',
  '規制や契約上の制約を踏まえて証跡を残したい',
];
const STAKEHOLDERS = ['テストリーダー', 'プロダクトオーナー', '品質保証担当者', '開発リーダー', '業務部門の代表者', '運用担当者'];

const GENERIC_WRONGS = [
  '過去の成功例をそのまま使い、今回変更された条件との差分確認を薄くする',
  '利用できる環境の都合を先に決め、リスクや目的との対応付けを後回しにする',
  '正常系の代表例に寄せ、例外条件や依存関係の確認を浅くする',
  '判断根拠を関係者に説明できる形で残さず、担当者間の口頭確認に寄せる',
  '内部実装の都合を重視し、利用者価値や業務影響の観点を後回しにする',
  '直近で見つかった欠陥に強く寄せ、変更範囲全体との関係を確認しない',
  '確認の深さを作業順で決め、重要度や影響度との対応を弱くする',
  'テスト設計より実行件数を優先し、何を代表している確認かを曖昧にする',
  '自動化しやすい項目を中心に選び、人による判断が必要なリスクを後回しにする',
  '結果の共有を合否の一覧に寄せ、残リスクや未確認範囲を伝えにくくする',
];

const POSITIVE_PATTERNS = [
  (title) => `${title}の目的と対象を明確にし、今回の変更範囲とリスクに対応付けて判断する`,
  (title) => `関係者が判断できるよう、${title}に関する根拠と残リスクを説明できる形にする`,
  (title) => `過去の欠陥傾向と今回の仕様差分を比べ、${title}の観点で優先度を調整する`,
  (title) => `確認結果を追跡できるようにし、${title}に基づく判断を後から検証できる状態にする`,
  (title) => `利用者影響と技術的な制約を合わせて見て、${title}の範囲と深さを決める`,
  (title) => `短いサイクルでも、${title}の目的に合う情報を先に得られる順序で進める`,
];

const CALC_SECTIONS = new Set(['4.2.1', '4.2.2', '4.2.3', '4.3.1', '4.3.2', '5.1.4', '5.2.1']);
const TYPE_ROTATION = ['definition', 'purpose', 'distinction', 'process', 'example', 'scenario', 'misconception', 'negative'];
const K1_TYPES = ['definition', 'purpose', 'distinction', 'process', 'example', 'misconception'];
const K3_TYPES = ['scenario', 'example', 'process', 'calculation', 'negative'];

function pick(arr, n) {
  return arr[((n % arr.length) + arr.length) % arr.length];
}

function uniqueNumber(id) {
  const m = String(id).match(/_(\d+)/);
  return m ? Number(m[1]) : 0;
}

function titleFor(q) {
  return SECTION_TITLES[q.section] ?? q.section ?? 'テスト';
}

function summaryFor(q) {
  return SECTION_SUMMARIES[q.section] ?? `${titleFor(q)}では、目的、対象、リスク、制約を合わせて判断することが重要である。`;
}

function normalizeType(q, n) {
  let type = q.questionType;
  if (type === 'calculation' && !CALC_SECTIONS.has(q.section)) type = pick(['example', 'scenario', 'process'], n);
  if (q.kLevel === 'K1' && (type === 'scenario' || type === 'calculation')) type = pick(K1_TYPES, n);
  if (q.kLevel === 'K3' && !K3_TYPES.includes(type)) type = pick(K3_TYPES, n);
  if (!TYPE_ROTATION.includes(type) && type !== 'calculation') type = pick(TYPE_ROTATION, n);
  return type;
}

function context(n) {
  const system = pick(SYSTEMS, n);
  const feature = pick(FEATURES, Math.floor(n / 2) + n);
  const stakeholder = pick(STAKEHOLDERS, Math.floor(n / 3) + n);
  return {
    system,
    feature,
    stakeholder,
    short: `${system}の第${(n % 97) + 1}スプリントにおける${pick(['変更確認', 'リリース判定', '品質評価', '影響分析', '優先度決定', '改善検討'], n)}`,
    sentence: `${system}で、${feature}。${stakeholder}は判断根拠を説明できる対応を求めている。`,
  };
}

function sanitizeOption(text, fallback) {
  let s = String(text ?? '').replace(/\s+/g, ' ').trim();
  s = s.replace(/、?保守やレビューに必要な情報を残さない/g, '');
  s = s.replace(/テスト結果を記録せず、後から追跡できない状態にする/g, '結果の記録粒度を決めず、後から原因分析しにくい運用にする');
  s = s.replace(/制約やサポート状況は考慮しなくてよい/g, '制約やサポート状況の確認を導入後に回す');
  s = s.replace(/ツールを導入すればプロセス改善は不要である/g, 'ツール導入の効果を、プロセスや教育の見直しと切り離して考える');
  s = s.replace(/すべて/g, '多く');
  s = s.replace(/必ず/g, '原則として');
  s = s.replace(/常に/g, '同じ手順で');
  s = s.replace(/一切/g, '十分に');
  s = s.replace(/だけ/g, '中心');
  s = s.replace(/不要/g, '後回し');
  s = s.replace(/無視/g, '軽視');
  return s || fallback;
}

function makeCorrect(q, n, ctx, type) {
  const title = titleFor(q);
  if (type === 'negative') return makeWrong(q, n, ctx);
  const base = POSITIVE_PATTERNS[n % POSITIVE_PATTERNS.length](title);
  return `${ctx.short}で、${ctx.feature}。${ctx.stakeholder}に対して、${base}`;
}

function makeWrong(q, n, ctx) {
  const title = titleFor(q);
  const wrong = pick(GENERIC_WRONGS, n);
  return `${ctx.short}で、${ctx.feature}。${ctx.stakeholder}への説明では、${wrong}ため、${title}の判断根拠が弱くなる。この選び方では、確認対象、判断基準、残リスクの三点が関係者に伝わりにくい`;
}

function positiveOptions(q, n, ctx) {
  const title = titleFor(q);
  return [0, 1, 2].map((i) => `${ctx.short}で、${ctx.feature}。${ctx.stakeholder}に対して、${POSITIVE_PATTERNS[(n + i) % POSITIVE_PATTERNS.length](title)}。この対応なら、確認対象、判断基準、残リスクを合わせて説明しやすい`);
}

function nonNegativeOptions(q, n, ctx, type) {
  const correct = makeCorrect(q, n, ctx, type);
  const wrongs = [0, 1, 2].map((i) => makeWrong(q, n + i * 3, ctx));
  return placeCorrect(correct, wrongs, n);
}

function negativeOptions(q, n, ctx) {
  const correct = makeWrong(q, n + 5, ctx);
  return placeCorrect(correct, positiveOptions(q, n, ctx), n);
}

function placeCorrect(correct, wrongs, n) {
  const index = n % 4;
  const options = [];
  let w = 0;
  for (let i = 0; i < 4; i += 1) options.push(i === index ? correct : wrongs[w++]);
  return { options, answer: correct, correctIndex: index };
}

function calculationQuestion(q, n, ctx) {
  const title = titleFor(q);
  const prefix = `${ctx.short}で、${ctx.feature}。`;
  if (q.section === '4.2.2') {
    const low = 10 + (n % 30);
    const high = low + 20 + (n % 10);
    const correct = `${prefix}${low - 1}、${low}、${high}、${high + 1}を確認する`;
    return {
      question: `${ctx.system}の入力欄は${low}以上${high}以下を有効とする。境界値分析で下限と上限の直前・境界を確認する場合、最も適切な値の組はどれか。`,
      ...placeCorrect(correct, [
        `${prefix}${low}、${Math.floor((low + high) / 2)}、${high}を中心に確認する`,
        `${prefix}${low - 2}、${low - 1}、${high + 1}、${high + 2}を確認する`,
        `${prefix}${low + 1}、${high - 1}、${high}、${high + 1}を確認する`,
      ], n),
      reason: `有効範囲が${low}以上${high}以下なので、境界値分析では境界の値と隣接する無効側の値を使う。`,
    };
  }
  if (q.section === '4.2.3') {
    const conditions = 2 + (n % 3);
    const combos = 2 ** conditions;
    const correct = `${prefix}${conditions}個の真偽条件なので${combos}通りを基準に考える`;
    return {
      question: `${ctx.system}の割引ルールでは、${conditions}個の条件がそれぞれ真または偽になる。デシジョンテーブルで全組み合わせを基準に考える場合、条件組み合わせは何通りか。`,
      ...placeCorrect(correct, [
        `${prefix}${conditions}通り。条件数と組み合わせ数は同じである`,
        `${prefix}${conditions + 1}通り。期待結果を1つ足して数える`,
        `${prefix}${combos + conditions}通り。条件数を組み合わせ数に加える`,
      ], n),
      reason: `真偽条件が${conditions}個あるため、組み合わせ数は2の${conditions}乗で${combos}通りになる。`,
    };
  }
  if (q.section === '4.3.1') {
    const total = 12 + (n % 7);
    const done = total - (2 + (n % 3));
    const pct = Math.round((done / total) * 100);
    const correct = `${prefix}${done}/${total}なので約${pct}%のステートメントカバレッジである`;
    return {
      question: `${ctx.system}の処理に実行可能なステートメントが${total}個あり、テストで${done}個を実行した。ステートメントカバレッジとして最も近いものはどれか。`,
      ...placeCorrect(correct, [
        `${prefix}${total - done}/${total}なので約${Math.round(((total - done) / total) * 100)}%である`,
        `${prefix}${done}/${total + 2}なので約${Math.round((done / (total + 2)) * 100)}%である`,
        `${prefix}${total}/${done}なので100%を超える値として扱う`,
      ], n),
      reason: `ステートメントカバレッジは実行済みステートメント数を総ステートメント数で割るため、${done}/${total}で計算する。`,
    };
  }
  if (q.section === '4.3.2') {
    const total = 8 + (n % 6) * 2;
    const done = total - 2;
    const pct = Math.round((done / total) * 100);
    const correct = `${prefix}${done}/${total}なので約${pct}%のブランチカバレッジである`;
    return {
      question: `${ctx.system}の条件分岐には分岐結果が合計${total}個あり、テストでは${done}個を通過した。ブランチカバレッジとして最も近いものはどれか。`,
      ...placeCorrect(correct, [
        `${prefix}${total - done}/${total}なので約${Math.round(((total - done) / total) * 100)}%である`,
        `${prefix}${done}/${total + 4}なので約${Math.round((done / (total + 4)) * 100)}%である`,
        `${prefix}${total}/${done}なので100%として扱う`,
      ], n),
      reason: `ブランチカバレッジは通過した分岐結果数を全分岐結果数で割るため、${done}/${total}で計算する。`,
    };
  }
  if (q.section === '5.1.4') {
    const o = 2 + (n % 4);
    const m = o + 2;
    const pessimistic = m + 4;
    const expected = ((o + 4 * m + pessimistic) / 6).toFixed(1);
    const correct = `${prefix}三点見積りでは(${o}+4×${m}+${pessimistic})/6=${expected}人日と見る`;
    return {
      question: `${ctx.system}のテスト設計について、楽観値${o}人日、最頻値${m}人日、悲観値${pessimistic}人日の三点見積りを使う。期待値として最も近いものはどれか。`,
      ...placeCorrect(correct, [
        `${prefix}単純平均として${((o + m + pessimistic) / 3).toFixed(1)}人日と見る`,
        `${prefix}悲観値を優先して${pessimistic}人日と固定する`,
        `${prefix}楽観値を優先して${o}人日と固定する`,
      ], n),
      reason: `三点見積りの期待値は(楽観値+4×最頻値+悲観値)/6で計算するため、(${o}+4×${m}+${pessimistic})/6=${expected}人日となる。`,
    };
  }
  if (q.section === '5.2.1') {
    const likelihood = 2 + (n % 4);
    const impact = 3 + (n % 3);
    const level = likelihood * impact;
    const correct = `${prefix}発生可能性${likelihood}×影響度${impact}=${level}として相対的に評価する`;
    return {
      question: `${ctx.system}で、あるプロダクトリスクの発生可能性を${likelihood}、影響度を${impact}と評価した。単純な積でリスクレベルを比べる場合、最も適切な判断はどれか。`,
      ...placeCorrect(correct, [
        `${prefix}発生可能性を主に見て${likelihood}として扱う`,
        `${prefix}影響度を主に見て${impact}として扱う`,
        `${prefix}足し算で${likelihood + impact}とし、積は使わない`,
      ], n),
      reason: `この設問では発生可能性と影響度の積で比較する条件なので、${likelihood}×${impact}=${level}を使う。`,
    };
  }
  const low = 1 + (n % 5);
  const high = low + 8;
  const correct = `${prefix}${low}以上${high}以下を有効同値クラスとして代表値を選ぶ`;
  return {
    question: `${ctx.system}の入力欄は${low}以上${high}以下を有効とする。同値分割法で有効同値クラスを扱う説明として最も適切なものはどれか。`,
    ...placeCorrect(correct, [
      `${prefix}${low - 1}を有効同値クラスとして扱う`,
      `${prefix}${high + 1}を有効同値クラスとして扱う`,
      `${prefix}入力値を分類せず、表示順に確認する`,
    ], n),
    reason: `同値分割法では同じ扱いになる値をクラス化するため、${low}以上${high}以下を有効同値クラスとして代表値を選ぶ。`,
  };
}

function makeQuestion(q, n, ctx, type) {
  const title = titleFor(q);
  if (type === 'calculation') return calculationQuestion(q, n, ctx).question;
  if (type === 'definition') return `${title}について、最も適切な説明はどれか。`;
  if (type === 'purpose') return `${title}の目的または価値として最も適切なものはどれか。`;
  if (type === 'distinction') return `${title}について、似た概念との違いを最もよく表すものはどれか。`;
  if (type === 'process') return `${ctx.sentence} ${title}を実務で扱う進め方として最も適切なものはどれか。`;
  if (type === 'example') return `${ctx.sentence} ${title}の考え方に最も合う対応はどれか。`;
  if (type === 'misconception') return `${title}について、よくある誤解を避ける説明として最も適切なものはどれか。`;
  if (type === 'negative') return `${ctx.sentence} ${title}の観点で、誤っている判断はどれか。`;
  return `${ctx.sentence} ${title}に基づく判断として最も適切なものはどれか。`;
}

function explanation(q, type, ctx, calcReason = '') {
  const title = titleFor(q);
  const summary = summaryFor(q);
  const wrongs = q.options.filter((_, i) => i !== q.correctIndex);
  if (type === 'negative') {
    return `[${q.section} ${title}]
この問題は、誤っている判断を選ぶ問題である。
正解は「${q.answer}」。
理由: ${summary} この選択肢は、${ctx.feature}という状況で必要な根拠付けや優先度判断を弱めるため不適切である。
他の選択肢: 「${wrongs[0]}」「${wrongs[1]}」「${wrongs[2]}」は、目的、リスク、説明可能性を踏まえており、${title}の考え方に沿う。
根拠: JSTQB Foundation Level シラバス Version 2023V4.0.J02 の ${q.section} に基づくオリジナル問題。`;
  }
  if (type === 'calculation') {
    return `[${q.section} ${title}]
正解は「${q.answer}」。
理由: ${calcReason} 数値条件を使って判断する点がこの問題の中心である。
他の選択肢: 「${wrongs[0]}」「${wrongs[1]}」「${wrongs[2]}」は、分母と分子の取り違え、条件数の読み違え、または代表値の選び方の誤りを含む。
根拠: JSTQB Foundation Level シラバス Version 2023V4.0.J02 の ${q.section} に基づくオリジナル問題。`;
  }
  const scenarioLine = ['scenario', 'example', 'process'].includes(type)
    ? `この状況では、${ctx.feature}ため、${title}を目的とリスクに結び付けて判断する必要がある。`
    : `${title}では、用語の意味だけでなく、目的や隣接概念との違いを押さえる必要がある。`;
  return `[${q.section} ${title}]
正解は「${q.answer}」。
理由: ${summary} ${scenarioLine}
他の選択肢: 「${wrongs[0]}」は判断根拠が弱い。「${wrongs[1]}」は対象範囲または適用タイミングを取り違えている。「${wrongs[2]}」は効率化を優先しすぎ、確認すべきリスクを残しやすい。
根拠: JSTQB Foundation Level シラバス Version 2023V4.0.J02 の ${q.section} に基づくオリジナル問題。`;
}

function dedupeOptions(q) {
  const seen = new Set();
  q.options = q.options.map((o, i) => {
    let v = o.replace(/\s+/g, ' ').trim();
    while (seen.has(v)) v = `${v}（観点${i + 1}）`;
    seen.add(v);
    return v;
  });
  q.answer = q.options[q.correctIndex];
}

function moveAnswerTo(q, targetIndex) {
  const answer = q.answer;
  const wrongs = q.options.filter((o) => o !== answer);
  const next = [];
  let w = 0;
  for (let i = 0; i < 4; i += 1) next.push(i === targetIndex ? answer : wrongs[w++]);
  q.options = next;
  q.correctIndex = targetIndex;
  q.answer = q.options[targetIndex];
}

const data = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf8'));
let changed = 0;

data.questions.forEach((q, index) => {
  const n = uniqueNumber(q.id) + index * 7;
  const ctx = context(n);
  let type = normalizeType(q, n);
  let calc = null;
  if (type === 'calculation') {
    calc = calculationQuestion(q, n, ctx);
    q.question = calc.question;
    q.options = calc.options;
    q.answer = calc.answer;
    q.correctIndex = calc.correctIndex;
  } else {
    q.question = makeQuestion(q, n, ctx, type);
    const choiceSet = type === 'negative' ? negativeOptions(q, n, ctx) : nonNegativeOptions(q, n, ctx, type);
    q.options = choiceSet.options;
    q.answer = choiceSet.answer;
    q.correctIndex = choiceSet.correctIndex;
  }
  q.questionType = type;
  if (q.questionType === 'scenario' && q.kLevel === 'K1') q.kLevel = 'K2';
  if (q.questionType === 'calculation') q.kLevel = 'K3';
  if (q.kLevel === 'K3') q.difficulty = q.questionType === 'calculation' ? 'hard' : 'medium';
  q.explanation = explanation(q, type, ctx, calc?.reason ?? '');
  dedupeOptions(q);
  moveAnswerTo(q, index % 4);
  changed += 1;
});

data.meta.questionCount = data.questions.length;
data.meta.createdAt = new Date().toISOString().slice(0, 19);

fs.writeFileSync(QUESTIONS_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
fs.writeFileSync(DATA_JS_PATH, `window.EMBEDDED_QUESTIONS = ${JSON.stringify(data)};\n`, 'utf8');

console.log(`updated ${changed} questions`);
