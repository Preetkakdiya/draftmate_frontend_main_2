import argparse
import re
from pathlib import Path
from sqlalchemy import text

from database import SessionLocal


DEFAULT_FILE_PATH = (
    Path(__file__).parent / "dictionary_data" / "indian_legal_explanations.txt"
)


def parse_terms(file_path: Path):
    with file_path.open("r", encoding="utf-8") as file:
        content = file.read()

    pattern = r"TERM:\s*(.*?)\s*EXPLANATION:\s*(.*?)(?=\n\s*TERM:|\Z)"

    matches = re.findall(pattern, content, flags=re.DOTALL)

    terms = []

    for term, explanation in matches:
        term = term.strip()
        explanation = explanation.strip()

        if term and explanation:
            terms.append((term, term.casefold(), explanation))

    return terms


def main(file_path: Path):
    terms = parse_terms(file_path)

    print(f"Parsed terms from {file_path}: {len(terms)}")

    db = SessionLocal()

    inserted = 0
    skipped = 0

    try:
        for term, normalized_term, explanation in terms:
            result = db.execute(
                text(
                    """
                    INSERT INTO legal_terms
                        (term, normalized_term, explanation, status)
                    VALUES
                        (:term, :normalized_term, :explanation, 'active')
                    ON CONFLICT (normalized_term) DO NOTHING
                    """
                ),
                {
                    "term": term,
                    "normalized_term": normalized_term,
                    "explanation": explanation,
                },
            )
            if result.rowcount:
                inserted += 1
            else:
                skipped += 1
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    print(f"Inserted: {inserted}")
    print(f"Skipped duplicates: {skipped}")
    print("Import completed successfully!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import legal dictionary terms.")
    parser.add_argument(
        "file_path",
        nargs="?",
        type=Path,
        default=DEFAULT_FILE_PATH,
        help="Path to the TERM/EXPLANATION text file.",
    )
    args = parser.parse_args()
    main(args.file_path)
