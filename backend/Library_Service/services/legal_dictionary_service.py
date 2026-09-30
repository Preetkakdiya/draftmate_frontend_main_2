from sqlalchemy import text


def search_terms_service(
    db,
    query: str,
    page: int,
    limit: int,
):
    normalized_query = query.strip().lower()
    offset = (page - 1) * limit

    if not normalized_query:
        total = (
            db.execute(
                text("SELECT COUNT(*) FROM legal_terms WHERE status = 'active'")
            ).scalar()
            or 0
        )

        rows = (
            db.execute(
                text("""
                SELECT id, term, 'BROWSE' AS "matchType"
                FROM legal_terms
                WHERE status = 'active'
                ORDER BY normalized_term ASC
                LIMIT :limit OFFSET :offset
            """),
                {"limit": limit, "offset": offset},
            )
            .mappings()
            .all()
        )

        return {
            "items": [dict(r) for r in rows],
            "total": total,
            "page": page,
            "limit": limit,
        }
    # user ke % ya _ ko wildcard banne se rokne ke liye escape
    escaped = (
        normalized_query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    )
    prefix = f"{escaped}%"

    params = {"query": normalized_query, "prefix": prefix}

    total = (
        db.execute(
            text(
                """
                SELECT COUNT(*)
                FROM legal_terms
                WHERE status = 'active'
                  AND (
                      normalized_term = :query
                      OR normalized_term ILIKE :prefix
                      OR similarity(normalized_term, :query) >= 0.2
                  )
                """
            ),
            params,
        ).scalar()
        or 0
    )

    rows = (
        db.execute(
            text(
                """
                SELECT
                    id,
                    term,
                    CASE
                        WHEN normalized_term = :query THEN 'EXACT'
                        ELSE 'SIMILAR'
                    END AS "matchType"
                FROM legal_terms
                WHERE status = 'active'
                  AND (
                      normalized_term = :query
                      OR normalized_term ILIKE :prefix
                      OR similarity(normalized_term, :query) >= 0.2
                  )
                ORDER BY
                    CASE
                        WHEN normalized_term = :query THEN 0
                        WHEN normalized_term ILIKE :prefix THEN 1
                        ELSE 2
                    END,
                    similarity(normalized_term, :query) DESC,
                    normalized_term ASC
                LIMIT :limit OFFSET :offset
                """
            ),
            {**params, "limit": limit, "offset": offset},
        )
        .mappings()
        .all()
    )

    return {
        "items": [dict(row) for row in rows],
        "total": total,
        "page": page,
        "limit": limit,
    }


def get_term_service(db, term_id: int):
    row = (
        db.execute(
            text(
                """
            SELECT
                id,
                term,
                normalized_term,
                explanation,
                status,
                created_at,
                updated_at
            FROM legal_terms
            WHERE id = :term_id
            """
            ),
            {"term_id": term_id},
        )
        .mappings()
        .first()
    )

    return dict(row) if row else None
