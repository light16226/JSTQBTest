import json
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
QUESTIONS_PATH = ROOT / "data" / "questions.json"
DATA_JS_PATH = ROOT / "data" / "data.js"

ALLOWED_TYPES = {
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

GENERIC_EXPLANATION_PATTERNS = [
    "目的、対象、タイミング、責務、またはリスクの扱いがこの学習目的とずれている",
    "他の選択肢: 目的、対象、タイミング、責務、またはリスクの扱い",
]


def load_embedded():
    text = DATA_JS_PATH.read_text(encoding="utf-8")
    prefix = "window.EMBEDDED_QUESTIONS = "
    start = text.index(prefix) + len(prefix)
    end_marker = ";\nwindow.INITIAL_LOGS"
    end = text.index(end_marker, start) if end_marker in text[start:] else text.rindex(";")
    return json.loads(text[start:end])


def scenario_context(question):
    marker = "状況:" if "状況:" in question else "文脈:" if "文脈:" in question else ""
    if not marker:
        return ""
    text = question.split(marker, 1)[1]
    for stop in ("確認観点:", "この状況で", "\n"):
        if stop in text:
            text = text.split(stop, 1)[0]
    return text.strip()


def main():
    data = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
    embedded = load_embedded()
    questions = data["questions"]
    explanations = Counter(q.get("explanation", "") for q in questions)
    answer_counts = Counter(q.get("answer", "") for q in questions)
    contexts = Counter(
        scenario_context(q.get("question", ""))
        for q in questions
        if q.get("questionType") in {"scenario", "negative", "best_choice", "incorrect_choice"}
    )
    longest = 0
    for q in questions:
        lengths = [len(o) for o in q["options"]]
        if lengths[q["correctIndex"]] == max(lengths):
            longest += 1

    invalid_types = Counter(q.get("questionType") for q in questions if q.get("questionType") not in ALLOWED_TYPES)
    generic_count = sum(
        1
        for q in questions
        if any(pattern in q.get("explanation", "") for pattern in GENERIC_EXPLANATION_PATTERNS)
    )

    print("question_count", len(questions))
    print("meta_question_count", data["meta"].get("questionCount"))
    print("data_js_synchronized", data == embedded)
    print("chapter_counts", dict(Counter(q["chapter"] for q in questions)))
    print("question_type_counts", dict(Counter(q.get("questionType", "") for q in questions)))
    print("invalid_question_types", dict(invalid_types))
    print("generic_template_explanations", generic_count)
    print("duplicate_explanation_groups", sum(1 for count in explanations.values() if count > 1))
    print("duplicate_explanation_max", max(explanations.values()))
    print("answer_longest_count", longest)
    print("answer_longest_ratio", round(longest / len(questions), 4))
    print("top_repeated_answers", answer_counts.most_common(10))
    print("scenario_context_unique", len(contexts))
    print("scenario_context_duplicate_groups", sum(1 for count in contexts.values() if count > 1))
    print("top_scenario_contexts", contexts.most_common(10))
    print("learning_objective_counts_top", Counter(q.get("learningObjective", "") for q in questions).most_common(10))


if __name__ == "__main__":
    main()
