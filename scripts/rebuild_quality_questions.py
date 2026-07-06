"""Compatibility wrapper for rebuilding the quality-controlled question bank.

The previous implementation in this file generated structural tells such as
filler context phrases, distractor-only padding, and answer-only two-sentence
patterns.  Keep this entry point for existing workflows, but delegate to the
single maintained generator.
"""

from build_question_bank import main


if __name__ == "__main__":
    main()
