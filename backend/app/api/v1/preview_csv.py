"""
POST /preview-csv

Parses a CSV upload, classifies each row, and returns SearchResultLeads
WITHOUT writing anything to the database. The caller decides what to save
via POST /import-batch.
"""
from fastapi import APIRouter, UploadFile

from app.schemas.business import SearchResultLead
from app.services.csv_parser import read_csv_upload, parse_csv_rows

router = APIRouter()


@router.post("/preview-csv", response_model=list[SearchResultLead])
async def preview_csv(file: UploadFile) -> list[SearchResultLead]:
    text = await read_csv_upload(file)
    rows = parse_csv_rows(text)

    return [
        SearchResultLead(
            name=lead.name,
            phone=lead.phone,
            email=lead.email,
            website=lead.website,
            website_status=classified.website_status,
            address=lead.address,
            city=lead.city,
            country=lead.country,
            category=lead.category,
            rating=lead.rating,
            review_count=lead.review_count,
            lead_score=classified.lead_score,
            opportunity_reason=classified.opportunity_reason,
            google_maps_url=lead.google_maps_url,
            facebook_url=lead.facebook_url,
            instagram_url=lead.instagram_url,
            linkedin_url=lead.linkedin_url,
        )
        for lead, classified in rows
    ]
