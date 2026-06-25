from datetime import datetime

from pydantic import BaseModel


class CloudTalkStatusResponse(BaseModel):
    configured: bool
    connected: bool
    account_info: dict | None = None
    error: str | None = None


class CloudTalkContactSyncResponse(BaseModel):
    cloudtalk_contact_id: str
    created: bool


class CloudTalkCallInitiateResponse(BaseModel):
    cloudtalk_call_id: str | None = None
    message: str


class CloudTalkCallRead(BaseModel):
    id: int
    business_id: int
    cloudtalk_call_id: str | None
    direction: str
    status: str
    duration: int | None
    started_at: datetime | None
    ended_at: datetime | None
    recording_url: str | None
    agent: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class WebhookPayload(BaseModel):
    event: str
    call: dict | None = None
    contact: dict | None = None
    recording: dict | None = None
