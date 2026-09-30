from services.legal_dictionary_service import (
    get_term_service,
    search_terms_service,
)


def search_terms_controller(
    db,
    query: str,
    page: int,
    limit: int,
):
    return search_terms_service(
        db=db,
        query=query,
        page=page,
        limit=limit,
    )


def get_term_controller(db, term_id: int):
    return get_term_service(
        db=db,
        term_id=term_id,
    )
