from enum import Enum


class WebsiteStatus(str, Enum):
    NO_WEBSITE = "NO_WEBSITE"
    FACEBOOK_ONLY = "FACEBOOK_ONLY"
    FREE_BUILDER = "FREE_BUILDER"
    BROKEN_WEBSITE = "BROKEN_WEBSITE"
    HAS_WEBSITE = "HAS_WEBSITE"


class ContactStatus(str, Enum):
    NEW = "NEW"
    CALLED = "CALLED"
    NO_ANSWER = "NO_ANSWER"
    INTERESTED = "INTERESTED"
    FOLLOW_UP = "FOLLOW_UP"
    PROPOSAL_SENT = "PROPOSAL_SENT"
    WON = "WON"
    LOST = "LOST"
    # Legacy value kept for backward compatibility with existing rows
    CONTACTED = "CONTACTED"


class CallOutcome(str, Enum):
    ANSWERED = "ANSWERED"
    NO_ANSWER = "NO_ANSWER"
    VOICEMAIL = "VOICEMAIL"
    BUSY = "BUSY"
