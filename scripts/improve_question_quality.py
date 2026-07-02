import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
QUESTIONS_PATH = ROOT / "data" / "questions.json"
DATA_JS_PATH = ROOT / "data" / "data.js"

TYPE_MAP = {
    "best_choice": "scenario",
    "incorrect_choice": "negative",
}

PROJECTS = [
    "スマートフォン決済アプリ",
    "在庫管理サービス",
    "医療予約システム",
    "保険申込ワークフロー",
    "社内経費精算システム",
    "ECサイトの注文機能",
    "物流追跡ダッシュボード",
    "銀行向け本人確認機能",
    "学習管理サイト",
    "自治体申請ポータル",
    "IoT監視サービス",
    "コールセンター支援ツール",
    "サブスクリプション課金機能",
    "航空券予約サイト",
    "データ移行プロジェクト",
]

CONSTRAINTS = [
    "リリースまで残り3日で、確認できる人数も限られている",
    "前回障害の再発防止を重視し、証跡も残す必要がある",
    "利用者影響の大きい機能から優先順位を付ける必要がある",
    "仕様変更が続いており、関係者間の認識差が残っている",
    "外部委託チームを含むため、成果物と責務を明確にしたい",
    "自動テスト環境は一部だけ整備済みで、保守工数も制約されている",
    "規制対応の監査で、判断理由を説明できることが求められている",
    "過去の欠陥傾向があり、同じ種類の見落としを避けたい",
    "利用者代表が受け入れ判断に使える情報を求めている",
    "短い反復開発の中で、早いフィードバックが必要になっている",
    "複数チームが同じ成果物を参照するため、変更影響を追跡したい",
    "本番データに近い条件で、リスクの高い経路を先に確認したい",
]

STAKEHOLDERS = [
    "テストリーダー",
    "プロダクトオーナー",
    "開発担当者",
    "レビューリーダー",
    "ビジネス側代表者",
    "運用担当者",
    "自動化担当者",
    "品質保証担当者",
]

SECTION_CONTEXTS = [
    (r"^4\.2\.1", "入力値を年齢や金額の範囲で分け、代表値を選ぶ必要がある"),
    (r"^4\.2\.2", "下限と上限の近くで欠陥が出やすく、境界の内外を確認したい"),
    (r"^4\.2\.3", "会員区分、購入金額、クーポン有無で期待結果が変わる"),
    (r"^4\.2\.4", "注文状態ごとに許可される操作と禁止される操作が異なる"),
    (r"^4\.5\.3", "受け入れ基準を具体例に落とし込み、利用者代表と合意したい"),
    (r"^5\.1\.4", "過去実績と今回の差分を使ってテスト工数を見積もる必要がある"),
    (r"^5\.1\.5", "すべてを同じ深さで確認する時間はなく、テスト順序を決める必要がある"),
    (r"^5\.5\.1", "欠陥報告の情報が不足しており、再現と優先度判断に支障が出ている"),
    (r"^6\.1\.1", "複数のツール候補があり、支援できる活動と制約を比較している"),
    (r"^6\.2\.1", "反復回帰テストを自動化したいが、対象の安定性と保守コストに差がある"),
    (r"^3\.", "レビュー対象の成果物に認識違いがあり、実行前に欠陥を見つけたい"),
    (r"^2\.", "開発ライフサイクルに合わせて、テストレベルとテストタイプを選ぶ必要がある"),
    (r"^1\.", "テストの目的と限界を関係者に説明し、期待値を合わせる必要がある"),
    (r"^5\.", "リスク、進捗、制約を踏まえてテスト活動を調整する必要がある"),
    (r"^4\.", "仕様や構造、経験に応じてテスト技法を選び、抜けを減らしたい"),
]

RIGHT_REASON_KEYWORDS = [
    ("テスト目的", "欠陥を見つけ、品質に関する情報を提供するという目的に沿っている"),
    ("テストとデバッグ", "テストは問題の発見、デバッグは原因特定と修正という役割を分けている"),
    ("テストが必要な理由", "欠陥による利用者、事業、社会への影響を下げる目的に合っている"),
    ("境界", "境界の直前・直後や上限・下限に欠陥が集中しやすい条件を狙えている"),
    ("同値", "同じ扱いになる入力をまとめ、代表値で効率よく確認できる"),
    ("代表値", "同じ結果が期待できる範囲から代表を選び、重複した確認を避けられる"),
    ("デシジョン", "条件の組み合わせと期待結果を対応付けて漏れを見つけやすい"),
    ("条件", "条件の組み合わせが結果に影響するため、表で整理する判断が妥当である"),
    ("状態", "状態とイベントの関係を確認することで、許可されない遷移を検出できる"),
    ("遷移", "状態変化の前後関係を使って、抜けや不正な経路を確認できる"),
    ("リスク", "発生可能性と影響度に応じて、深さや順序を変える考え方に合っている"),
    ("優先", "限られた時間で影響の大きい対象から確認する判断になっている"),
    ("見積", "根拠のある情報を使って作業量を判断している"),
    ("欠陥", "再現、影響、期待結果を明確にし、修正と確認につなげられる"),
    ("レビュー", "実行前に成果物の問題を見つけ、関係者の理解をそろえられる"),
    ("静的", "成果物を実行せずに早期に問題を見つける目的に合っている"),
    ("自動化", "反復性、安定性、保守コストを考慮して自動化対象を選んでいる"),
    ("ツール", "ツールが支援できる活動と制約を分けて判断している"),
    ("トレーサビリティ", "要求、テスト、欠陥、結果の関連を追えるため変更影響を説明できる"),
]

WRONG_REASON_KEYWORDS = [
    ("すべて", "完全性を保証できるという前提に寄っており、テストの限界を無視している"),
    ("完全", "完全な保証を置いている点が不適切である"),
    ("不要", "必要な確認や保守活動を省略している"),
    ("しなくてよい", "判断に必要な前提や制約を無視している"),
    ("考慮しなくてよい", "リスクや制約を考慮しない点が不適切である"),
    ("保守しなくてよい", "自動化資産にも保守が必要である点を見落としている"),
    ("だけ", "目的や対象を一つに狭めすぎている"),
    ("後まで", "早期フィードバックの機会を失う"),
    ("開始せず", "早期テストの価値を失わせる"),
    ("関係なく", "目的やリスクに応じた調整をしていない"),
    ("同じ深さ", "リスク差や優先順位を反映していない"),
    ("証明", "品質改善より責任追及に寄っている"),
    ("止める", "変更管理とテスト目的を混同している"),
    ("記録", "追跡や説明責任に必要な情報を軽視している"),
    ("経験だけ", "根拠や合意を残さない判断になっている"),
]

DISTRACTOR_SUFFIXES = [
    "、そのため判断根拠や影響範囲を記録しない",
    "、関係者への説明やトレーサビリティも残さない",
    "、リスク差や制約条件を見落としたまま進める",
    "、対象の優先度を確認せず一律に扱う",
    "、期待結果や再現条件を確認しないまま完了とする",
    "、変更影響を追跡せず後工程でまとめて確認する",
    "、利用者影響より作業件数だけを判断材料にする",
    "、保守やレビューに必要な情報を残さない",
    "、早期フィードバックの機会を意図的に減らす",
    "、テスト目的との対応を確認しない",
]

ANSWER_VARIANTS = {
    "リスクや目的に関係なく、すべての項目を同じ深さでテストする": [
        "リスクを見ずに全項目を同じ深さで確認する",
        "重要度に関係なく全機能へ同じテスト量を割り当てる",
        "事業影響を考慮せず全テストを一律に実施する",
        "優先順位を付けず全項目を同じ詳しさで確認する",
        "目的を確認せず全範囲に同じテスト深度を適用する",
        "リスク評価を使わず、すべてを均等に確認する",
        "影響度の差を無視して全ケースを同じ順序で実行する",
        "高リスク領域と低リスク領域を区別せず確認する",
    ],
    "開発完了後までテスト活動を開始せず、早期のフィードバックを避ける": [
        "開発完了後まで確認を遅らせ、早期フィードバックを得ない",
        "実装がすべて終わるまでレビューやテスト設計を始めない",
        "後工程まで欠陥発見を待ち、手戻りリスクを高める",
        "早い段階の確認を避け、最後にまとめて問題を探す",
        "要求や設計の段階では確認せず、実行テストだけに頼る",
        "開発終盤までテスト観点を作らず、欠陥の早期発見を逃す",
    ],
    "管理ツールは計画、進捗、欠陥、構成、トレーサビリティを支援する": [
        "管理系ツールは計画、進捗、欠陥、構成の追跡を支援する",
        "テスト管理ツールは進捗、欠陥、構成、関連付けの管理に役立つ",
        "管理ツールは計画情報と実行状況を結び付けて可視化できる",
        "計画、結果、欠陥、構成の情報管理をツールで支援できる",
    ],
    "テスト実行ツールは自動実行や結果比較を支援する": [
        "テスト実行ツールは反復実行と実際結果の比較を支援する",
        "自動実行ツールは同じ確認の繰り返しと結果照合に役立つ",
        "テスト実行支援ツールは実行手順と結果比較を自動化できる",
    ],
    "自動化は反復実行、フィードバック短縮、人的ミス低減に役立つ": [
        "自動化は反復確認を速くし、フィードバック時間を短縮できる",
        "自動化により繰り返し実行の負荷と人的な実行ミスを減らせる",
        "安定した反復テストでは自動化が実行時間とばらつきを減らす",
    ],
    "非現実的な期待や過度な依存は自動化のリスクである": [
        "自動化への過度な期待や依存は導入時のリスクになる",
        "自動化で全問題が解決すると考えることはリスクである",
        "保守負荷を見ない自動化依存は失敗要因になり得る",
    ],
}


def topic_from_explanation(q):
    first = q.get("explanation", "").splitlines()[0] if q.get("explanation") else ""
    match = re.match(r"\[(\d+(?:\.\d+)*)\s+(.+?)\]", first)
    if match:
        return match.group(2)
    text = q.get("question", "")
    for sep in ("について", "に関する", "の観点"):
        if sep in text:
            return text.split(sep, 1)[0].replace("状況:", "").strip()[-24:]
    return q.get("section", "JSTQB")


def base_context(section):
    for pattern, context in SECTION_CONTEXTS:
        if re.search(pattern, section or ""):
            return context
    return "テスト活動の目的と制約を踏まえて判断する必要がある"


def make_context(q, index, topic):
    project = PROJECTS[index % len(PROJECTS)]
    constraint = CONSTRAINTS[(index // len(PROJECTS)) % len(CONSTRAINTS)]
    stakeholder = STAKEHOLDERS[(index // 7) % len(STAKEHOLDERS)]
    base = base_context(q.get("section", ""))
    return f"{project}で、{base}。{constraint}。{stakeholder}は{topic}に基づく判断を求めている。"


def right_reason(answer, topic, is_scenario, context):
    for keyword, reason in RIGHT_REASON_KEYWORDS:
        if keyword in answer or keyword in topic:
            if is_scenario:
                return f"状況では{context.split('。')[0]}ため、{reason}。"
            return f"{reason}ため、{topic}の考え方に合っている。"
    if is_scenario:
        return f"状況で示された制約と関係者の判断目的に対して、正答は{topic}で重視する目的、対象、タイミングを満たしている。"
    return f"正答は{topic}で重視する目的、対象、タイミングを過不足なく扱っている。"


def wrong_reason(option):
    for keyword, reason in WRONG_REASON_KEYWORDS:
        if keyword in option:
            return reason
    return "正答と比べると、扱う対象、時期、責務、または根拠の置き方が具体的な判断条件と合わない"


def make_explanation(q, topic, is_scenario, context):
    answer = q["answer"]
    wrongs = [option for option in q["options"] if option != answer]
    wrong_bits = [f"「{option}」は{wrong_reason(option)}" for option in wrongs[:3]]
    focus = re.sub(r"\s+", " ", q.get("question", "")).strip()
    if len(focus) > 110:
        focus = focus[:107] + "..."
    scenario_line = f"\n状況根拠: {context}" if is_scenario and context else ""
    return (
        f"[{q.get('section', '')} {topic}]\n"
        f"正解は「{answer}」。\n"
        f"設問条件: {focus}\n"
        f"理由: {right_reason(answer, topic, is_scenario, context)}"
        f"{scenario_line}\n"
        f"主な誤答: {'。'.join(wrong_bits)}。\n"
        f"根拠: JSTQB Foundation Level シラバス Version 2023V4.0.J02 の {q.get('section', '')} に基づくオリジナル問題。"
    )


def rotate_answer_variants(questions):
    counts = Counter(q["answer"] for q in questions)
    seen = Counter()
    changed = 0
    for q in questions:
        answer = q["answer"]
        if counts[answer] <= 10 or answer not in ANSWER_VARIANTS:
            continue
        pool = ANSWER_VARIANTS[answer]
        replacement = pool[seen[answer] % len(pool)]
        seen[answer] += 1
        idx = q["options"].index(answer)
        q["options"][idx] = replacement
        q["answer"] = replacement
        q["correctIndex"] = idx
        changed += 1
    return changed


def normalize_types_and_scenarios(questions):
    changed_types = 0
    changed_scenarios = 0
    for index, q in enumerate(questions):
        old_type = q.get("questionType")
        if old_type in TYPE_MAP:
            q["questionType"] = TYPE_MAP[old_type]
            changed_types += 1
        qtype = q.get("questionType")
        is_scenario = qtype in {"scenario", "negative"}
        topic = topic_from_explanation(q)
        context = ""
        if is_scenario:
            context = make_context(q, index, topic)
            tail = "誤っている判断はどれか。" if qtype == "negative" else "最も適切な判断はどれか。"
            q["question"] = f"状況: {context} この状況で{tail}"
            changed_scenarios += 1
        q["explanation"] = make_explanation(q, topic, is_scenario, context)
    return changed_types, changed_scenarios


def reduce_answer_length_bias(questions):
    changed = 0
    for index, q in enumerate(questions):
        answer = q["answer"]
        answer_len = len(answer)
        lengths = [len(option) for option in q["options"]]
        if lengths[q["correctIndex"]] < max(lengths):
            continue
        wrong_indices = [i for i in range(4) if i != q["correctIndex"]]
        target = min(wrong_indices, key=lambda i: len(q["options"][i]))
        suffix = DISTRACTOR_SUFFIXES[index % len(DISTRACTOR_SUFFIXES)]
        candidate = q["options"][target]
        if suffix not in candidate:
            candidate = candidate + suffix
        if len(candidate) <= answer_len:
            candidate = candidate + "。この判断では設問の条件と期待結果の対応も確認しない"
        if candidate not in q["options"]:
            q["options"][target] = candidate
            changed += 1
    return changed


def strip_added_suffix(option):
    extra = "。この判断では設問の条件と期待結果の対応も確認しない"
    if option.endswith(extra):
        option = option[: -len(extra)]
    for suffix in DISTRACTOR_SUFFIXES:
        if option.endswith(suffix):
            return option[: -len(suffix)]
    return option


def rebalance_answer_length_bias(questions, target_ratio=0.42):
    target = int(len(questions) * target_ratio)

    def answer_longest_count():
        count = 0
        for item in questions:
            lengths = [len(option) for option in item["options"]]
            if lengths[item["correctIndex"]] == max(lengths):
                count += 1
        return count

    current = answer_longest_count()
    changed = 0
    if current >= target:
        return changed

    for q in questions:
        if current >= target:
            break
        for idx, option in enumerate(q["options"]):
            if idx == q["correctIndex"]:
                continue
            stripped = strip_added_suffix(option)
            if stripped == option or stripped in q["options"]:
                continue
            old = q["options"][idx]
            q["options"][idx] = stripped
            lengths = [len(candidate) for candidate in q["options"]]
            if lengths[q["correctIndex"]] == max(lengths):
                current += 1
                changed += 1
                break
            q["options"][idx] = old
    return changed


def validate(data):
    questions = data["questions"]
    assert data["meta"]["questionCount"] == 2000
    assert len(questions) == 2000
    ids = [q["id"] for q in questions]
    assert len(ids) == len(set(ids))
    allowed = {"definition", "purpose", "distinction", "process", "example", "scenario", "calculation", "misconception", "negative"}
    for q in questions:
        assert q["questionType"] in allowed, q["id"]
        assert isinstance(q["options"], list) and len(q["options"]) == 4, q["id"]
        assert len(set(q["options"])) == 4, q["id"]
        assert q["answer"] in q["options"], q["id"]
        assert isinstance(q["correctIndex"], int) and 0 <= q["correctIndex"] < 4, q["id"]
        assert q["options"][q["correctIndex"]] == q["answer"], q["id"]
        assert q["question"].strip() and q["explanation"].strip(), q["id"]
        assert all(str(option).strip() for option in q["options"]), q["id"]


def sync_data_js(data):
    text = DATA_JS_PATH.read_text(encoding="utf-8")
    suffix = ""
    marker = ";\nwindow.INITIAL_LOGS"
    if marker in text:
        suffix = text[text.index(marker) + 1 :]
    DATA_JS_PATH.write_text(
        "window.EMBEDDED_QUESTIONS = "
        + json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        + ";"
        + suffix,
        encoding="utf-8",
        newline="\n",
    )


def main():
    data = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
    questions = data["questions"]
    answer_variant_changes = rotate_answer_variants(questions)
    type_changes, scenario_changes = normalize_types_and_scenarios(questions)
    length_changes = reduce_answer_length_bias(questions)
    rebalance_changes = rebalance_answer_length_bias(questions)
    _, refreshed_scenarios = normalize_types_and_scenarios(questions)
    data["meta"]["createdAt"] = datetime.now().replace(microsecond=0).isoformat()
    data["meta"]["questionCount"] = len(questions)
    validate(data)
    QUESTIONS_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    sync_data_js(data)
    print("answer_variant_changes", answer_variant_changes)
    print("question_type_changes", type_changes)
    print("scenario_rewrites", scenario_changes)
    print("distractor_length_changes", length_changes)
    print("length_rebalance_changes", rebalance_changes)
    print("explanation_refresh_scenarios", refreshed_scenarios)


if __name__ == "__main__":
    main()
