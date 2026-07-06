"""Compatibility wrapper for the maintained question-bank generator.

Legacy versions of this script performed string-level post-processing and could
reintroduce option-shape tells.  The quality workflow now rebuilds and syncs the
bank through build_question_bank.py.
"""

from build_question_bank import main


if __name__ == "__main__":
    main()
