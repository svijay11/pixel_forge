from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class AssessRequest(BaseModel):
    address: str
    lat: float
    lon: float


class EscapeRouteRequest(BaseModel):
    startLat: float
    startLon: float
    endLat: float
    endLon: float


class EscapeRouteResponse(BaseModel):
    geometry: Optional[dict] = None


class ChecklistItem(BaseModel):
    item: str
    why: Optional[str] = None
    focus: Optional[str] = None
    verified: bool


class BriefBeat(BaseModel):
    title: str
    body: str


class Hotspot(BaseModel):
    lat: float
    lon: float
    brightness: Optional[float] = None
    frp: Optional[float] = None
    acq_date: Optional[str] = None
    satellite: Optional[str] = None
    miles: Optional[float] = None


class Incident(BaseModel):
    name: str
    county: Optional[str] = None
    acres: Optional[float] = None
    contained: Optional[float] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    miles: Optional[float] = None
    url: Optional[str] = None
    active: Optional[bool] = None


class Wind(BaseModel):
    speed: Optional[str] = None
    direction: Optional[str] = None


class Alert(BaseModel):
    event: str
    headline: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None


class AssessResponse(BaseModel):
    riskBrief: str
    headline: Optional[str] = None
    beats: List[BriefBeat] = Field(default_factory=list)
    checklist: List[ChecklistItem]
    hazardZone: str
    nearbyHotspots: List[Hotspot] = Field(default_factory=list)
    nearbyIncidents: List[Incident] = Field(default_factory=list)
    wind: Wind
    alerts: List[Alert] = Field(default_factory=list)
    address: Optional[str] = None
    threatRing: Optional[str] = None
    threatLabel: Optional[str] = None
