from fastapi import APIRouter, Depends, HTTPException, Query, status

from database import get_db

print("LEGAL DICTIONARY ROUTER LOADED")

from controllers.legal_dictionary_controller import (
    get_term_controller,
    search_terms_controller,
)

from schemas import (
    TermDetailResponse,
    TermSearchPaginatedResponse,
)


router = APIRouter(
    prefix="/api/v1/library/terms",
    tags=["Legal Dictionary"],
)


@router.get(
    "",
    response_model=TermSearchPaginatedResponse,
)
def search_terms(
    db=Depends(get_db),
    query: str = Query("", max_length=20),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    return search_terms_controller(
        db=db,
        # query=query,
        query=query.strip(),
        page=page,
        limit=limit,
    )


@router.get(
    "/{term_id}",
    response_model=TermDetailResponse,
)
def get_term(
    term_id: int,
    db=Depends(get_db),
):
    term = get_term_controller(
        db=db,
        term_id=term_id,
    )

    if term is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Legal term not found",
        )

    return term
