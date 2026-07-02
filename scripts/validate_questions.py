import json
import re
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
QUESTIONS_PATH = ROOT / "data" / "questions.json"
DATA_JS_PATH = ROOT / "data" / "data.js"
ALLOWED_CHAPTERS = ["1章", "2章", "3章", "4章", "5章", "6章"]
ALLOWED_QUESTION_TYPES = {
    "definition",
    "purpose",
    "distinction",
    "process",
    "example",
    "scenario",
    "calculation",
    "misconception",
    "negative",
}


def normalize(text):
    return re.sub(r"\s+", "", str(text))


def load_embedded():
    text = DATA_JS_PATH.read_text(encoding="utf-8")
    prefix = "window.EMBEDDED_QUESTIONS = "
    start = text.index(prefix) + len(prefix)
    decoder = json.JSONDecoder()
    embedded, _ = decoder.raw_decode(text[start:].lstrip())
    return embedded


SELF_REPORT_MARKERS = [
    "判断根拠が弱くなる",
    "確認対象、判断基準、残リスクの三点が関係者に伝わりにくい",
    "関係者に伝わりにくい",
    "根拠が弱くなる",
    "この選び方では",
    "重要な側面を見落としている",
    "残リスクが説明できない",
    "追跡できない状態にする",
    "記録しない",
    "考慮しなくてよい",
    "プロセス改善は不要である",
]


def has_marker(text):
    return any(marker in text for marker in SELF_REPORT_MARKERS)


def common_prefix_len(strings):
    if not strings:
        return 0
    prefix = strings[0]
    for value in strings[1:]:
        while not value.startswith(prefix) and prefix:
            prefix = prefix[:-1]
    return len(prefix)


def compact_signature(text):
    text = normalize(text)
    text = re.sub(r"第\d+スプリント", "第Nスプリント", text)
    text = re.sub(r"\d+", "N", text)
    return text[:120]


def main():
    data = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
    embedded = load_embedded()
    errors = []

    if data != embedded:
        errors.append("data/questions.json and data/data.js are not synchronized")

    questions = data.get("questions")
    if not isinstance(questions, list):
        errors.append("questions is not a list")
        questions = []

    if data.get("meta", {}).get("questionCount") != len(questions):
        errors.append("meta.questionCount does not match questions length")

    if not (1900 <= len(questions) <= 2100):
        errors.append(f"question count is outside expected range: {len(questions)}")

    ids = [q.get("id") for q in questions]
    duplicate_ids = [qid for qid, count in Counter(ids).items() if count > 1]
    if duplicate_ids:
        errors.append(f"duplicate ids: {duplicate_ids[:10]}")

    required = {"id", "chapter", "question", "options", "answer", "correctIndex", "explanation"}
    duplicate_options = []
    non4 = []
    answer_mismatch = []
    index_mismatch = []
    blank_fields = []
    invalid_question_types = []
    marker_questions = []
    distractor_only_markers = []
    negative_answer_only_markers = []
    answer_shortest = 0
    answer_longest = 0
    common_prefix_total = 0
    long_definition_like = []
    correct_index_counter = Counter()
    option_lengths = []
    explanation_lengths = []

    for q in questions:
        qid = q.get("id", "<missing-id>")
        missing = required - set(q)
        if missing:
            errors.append(f"{qid}: missing required keys {sorted(missing)}")
            continue
        if q["chapter"] not in ALLOWED_CHAPTERS:
            errors.append(f"{qid}: invalid chapter {q['chapter']}")
        if q.get("questionType") not in ALLOWED_QUESTION_TYPES:
            invalid_question_types.append(qid)
        options = q["options"]
        if not isinstance(options, list) or len(options) != 4:
            non4.append(qid)
            continue
        all_text = json.dumps(q, ensure_ascii=False)
        if has_marker(all_text):
            marker_questions.append(qid)
        if len(set(options)) != 4:
            duplicate_options.append(qid)
        if q["answer"] not in options:
            answer_mismatch.append(qid)
        if not isinstance(q["correctIndex"], int) or not (0 <= q["correctIndex"] < 4):
            index_mismatch.append(qid)
        elif options[q["correctIndex"]] != q["answer"]:
            index_mismatch.append(qid)
        else:
            correct_index_counter[q["correctIndex"]] += 1
            answer_index = q["correctIndex"]
            lengths = [len(option) for option in options]
            if lengths[answer_index] == min(lengths):
                answer_shortest += 1
            if lengths[answer_index] == max(lengths):
                answer_longest += 1
            answer_has_marker = has_marker(options[answer_index])
            distractors_have_marker = [
                has_marker(option) for i, option in enumerate(options) if i != answer_index
            ]
            if not answer_has_marker and all(distractors_have_marker):
                distractor_only_markers.append(qid)
            if q.get("questionType") == "negative" and answer_has_marker and not any(distractors_have_marker):
                negative_answer_only_markers.append(qid)
            common_prefix_total += common_prefix_len(options)
            option_lengths.extend(lengths)
            explanation_lengths.append(len(str(q.get("explanation", ""))))
            if q.get("questionType") in {"definition", "purpose", "distinction"} and max(lengths) > 100:
                long_definition_like.append(qid)
        if not str(q["question"]).strip() or not str(q["explanation"]).strip() or any(not str(o).strip() for o in options):
            blank_fields.append(qid)

    if non4:
        errors.append(f"questions with options.length != 4: {non4[:20]}")
    if duplicate_options:
        errors.append(f"questions with duplicate options: {duplicate_options[:20]}")
    if answer_mismatch:
        errors.append(f"answer not in options: {answer_mismatch[:20]}")
    if index_mismatch:
        errors.append(f"correctIndex mismatch: {index_mismatch[:20]}")
    if blank_fields:
        errors.append(f"blank question/option/explanation: {blank_fields[:20]}")
    if invalid_question_types:
        errors.append(f"invalid questionType values: {invalid_question_types[:20]}")

    question_texts = defaultdict(list)
    qa_signatures = defaultdict(list)
    for q in questions:
        question_texts[normalize(q.get("question", ""))].append(q.get("id"))
        qa_signatures[
            normalize(q.get("question", "")) + "|" + normalize(q.get("answer", ""))
        ].append(q.get("id"))
    duplicate_question_texts = [ids for ids in question_texts.values() if len(ids) > 1]
    duplicate_qa = [ids for ids in qa_signatures.values() if len(ids) > 1]
    if duplicate_question_texts:
        errors.append(f"duplicate exact question texts: {duplicate_question_texts[:10]}")
    if duplicate_qa:
        errors.append(f"duplicate exact question+answer pairs: {duplicate_qa[:10]}")

    print("question_count", len(questions))
    print("chapter_counts", dict(Counter(q["chapter"] for q in questions)))
    print("section_counts", dict(sorted(Counter(q.get("section", "") for q in questions).items())[:5]), "...")
    print("k_counts", dict(Counter(q.get("kLevel", "") for q in questions)))
    print("type_counts", dict(Counter(q.get("questionType", "") for q in questions)))
    print("duplicate_exact_question_texts", len(duplicate_question_texts))
    print("duplicate_exact_question_answer_pairs", len(duplicate_qa))
    print("self_report_marker_questions", len(marker_questions))
    print("distractor_only_marker_questions", len(distractor_only_markers))
    print("negative_answer_only_marker_questions", len(negative_answer_only_markers))
    print("answer_shortest_rate", round(answer_shortest / len(questions), 4) if questions else 0)
    print("answer_longest_rate", round(answer_longest / len(questions), 4) if questions else 0)
    print("average_option_common_prefix_len", round(common_prefix_total / len(questions), 2) if questions else 0)
    print("long_definition_purpose_distinction_options", len(long_definition_like))
    print("correct_index_counts", dict(correct_index_counter))
    if option_lengths:
        print("average_option_length", round(sum(option_lengths) / len(option_lengths), 2))
    if explanation_lengths:
        sorted_exp = sorted(explanation_lengths)
        print("median_explanation_length", sorted_exp[len(sorted_exp) // 2])
    print("ellipsis_count", sum(json.dumps(q, ensure_ascii=False).count("...") for q in questions))
    print("legacy_context_marker_count", sum(json.dumps(q, ensure_ascii=False).count(token) for q in questions for token in ["文脈:", "確認観点:", "派生条件"]))
    answer_signatures = Counter(compact_signature(q.get("answer", "")) for q in questions)
    print("top_answer_signatures", answer_signatures.most_common(5))

    if errors:
        raise SystemExit("\n".join(errors))

    print("validation_ok")


if __name__ == "__main__":
    main()
