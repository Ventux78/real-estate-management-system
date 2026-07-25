"""
app/models/property.py
======================
Amaç:
    Property domain'ine ait veri modellerini tanımlar.

Neden bu şekilde tasarlandı:
    - Backend TypeScript interface'leriyle (property.types.ts) birebir eşleşir.
    - Property dataclass: tüm alanlar tip güvenli, None-safe.
    - PaginatedResult: sayfalama meta bilgisini taşır.
    - CreatePropertyRequest: form verilerini API'ye gönderilecek dict'e çevirir.
    - from_dict() factory: service katmanı JSON → model dönüşümünü bir satırda yapar.

Mimari içindeki görevi:
    Service katmanı ApiClient → dict → bu modellere dönüştürür.
    View katmanı bu modelleri tüketir; dict anahtarlarıyla uğraşmaz.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class PropertyStats:
    """
    İlan istatistikleri modeli.

    Backend: GET /api/v1/properties/stats
    Tek Prisma transaction'ında 4 COUNT sorgusu çalışır.
    """

    total: int
    published: int
    unpublished: int
    deleted: int

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "PropertyStats":
        """
        Backend JSON'undan PropertyStats oluşturur.

        Args:
            data: { "total": int, "published": int, "unpublished": int, "deleted": int }

        Returns:
            PropertyStats instance.
        """
        return cls(
            total=data.get("total", 0),
            published=data.get("published", 0),
            unpublished=data.get("unpublished", 0),
            deleted=data.get("deleted", 0),
        )


@dataclass
class Property:
    """
    Gayrimenkul ilanı veri modeli.

    Backend: PropertyDto (property.types.ts)
    Tüm Decimal alanlar backend tarafından number'a çevrilmiş gelir.
    """

    id: str
    slug: str
    title: str
    listing_type: str        # 'FOR_SALE' | 'FOR_RENT'
    property_type: str       # 'APARTMENT' | 'HOUSE' | ...
    price: float
    city: str
    district: str
    address: str
    is_published: bool
    created_at: str
    updated_at: str

    # Opsiyonel alanlar
    description: str | None = None
    neighborhood: str | None = None
    gross_area: float | None = None
    net_area: float | None = None
    room_count: int | None = None
    living_room_count: int | None = None
    bathroom_count: int | None = None
    floor: int | None = None
    total_floor: int | None = None
    building_age: int | None = None
    heating_type: str | None = None
    dues: float | None = None
    deed_status: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    video_url: str | None = None
    virtual_tour_url: str | None = None
    map_url: str | None = None
    is_map_url_manual: bool = False
    furnished: bool = False
    balcony: bool = False
    elevator: bool = False
    parking: bool = False
    eligible_for_credit: bool = False
    exchange_available: bool = False
    is_featured: bool = False
    created_by_id: str = ""
    images: list["PropertyImage"] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Property":
        """
        Backend JSON'undan Property oluşturur.

        Args:
            data: Backend'den gelen property dict'i.

        Returns:
            Property instance.
        """
        return cls(
            id=data["id"],
            slug=data.get("slug", ""),
            title=data["title"],
            listing_type=data["listingType"],
            property_type=data["propertyType"],
            price=float(data["price"]),
            city=data["city"],
            district=data["district"],
            address=data.get("address", ""),
            is_published=data.get("isPublished", False),
            created_at=data.get("createdAt", ""),
            updated_at=data.get("updatedAt", ""),
            description=data.get("description"),
            neighborhood=data.get("neighborhood"),
            gross_area=float(data["grossArea"]) if data.get("grossArea") is not None else None,
            net_area=float(data["netArea"]) if data.get("netArea") is not None else None,
            room_count=data.get("roomCount"),
            living_room_count=data.get("livingRoomCount"),
            bathroom_count=data.get("bathroomCount"),
            floor=data.get("floor"),
            total_floor=data.get("totalFloor"),
            building_age=data.get("buildingAge"),
            heating_type=data.get("heatingType"),
            dues=float(data["dues"]) if data.get("dues") is not None else None,
            deed_status=data.get("deedStatus"),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            video_url=data.get("videoUrl"),
            virtual_tour_url=data.get("virtualTourUrl"),
            map_url=data.get("mapUrl"),
            is_map_url_manual=data.get("isMapUrlManual", False),
            furnished=data.get("furnished", False),
            balcony=data.get("balcony", False),
            elevator=data.get("elevator", False),
            parking=data.get("parking", False),
            eligible_for_credit=data.get("eligibleForCredit", False),
            exchange_available=data.get("exchangeAvailable", False),
            is_featured=data.get("isFeatured", False),
            created_by_id=data.get("createdById", ""),
            images=[PropertyImage.from_dict(img) for img in data.get("images", [])],
        )

    @property
    def province(self) -> str:
        """İl (province/city) alias."""
        return self.city


@dataclass
class PaginationMeta:
    """
    Sayfalama meta bilgisi.

    Attributes:
        page: Mevcut sayfa numarası.
        limit: Sayfa başına kayıt sayısı.
        total: Toplam kayıt sayısı.
        pages: Toplam sayfa sayısı.
    """

    page: int
    limit: int
    total: int
    pages: int

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "PaginationMeta":
        return cls(
            page=data["page"],
            limit=data["limit"],
            total=data["total"],
            pages=data["pages"],
        )


@dataclass(frozen=True)
class PropertyImage:
    id: str
    url: str
    public_id: str
    width: int
    height: int
    format: str
    bytes: int
    display_order: int
    is_cover: bool

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "PropertyImage":
        return cls(
            id=data.get("id", ""),
            url=data.get("imageUrl", data.get("url", "")),
            public_id=data.get("publicId", ""),
            width=data.get("width", 0),
            height=data.get("height", 0),
            format=data.get("format", ""),
            bytes=data.get("bytes", 0),
            display_order=data.get("displayOrder", 0),
            is_cover=data.get("isCover", False),
        )


@dataclass
class PaginatedPropertyResult:
    """
    Sayfalanmış property listesi.

    Backend: PaginatedPropertyResult (property.types.ts)

    Attributes:
        data: Property listesi.
        pagination: Sayfalama meta bilgisi.
    """

    data: list[Property] = field(default_factory=list)
    pagination: PaginationMeta | None = None

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "PaginatedPropertyResult":
        """
        Backend JSON'undan PaginatedPropertyResult oluşturur.

        Args:
            raw: Backend'den gelen paginated yanıt dict'i.

        Returns:
            PaginatedPropertyResult instance.
        """
        properties = [Property.from_dict(p) for p in raw.get("data", [])]
        pagination = PaginationMeta.from_dict(raw["pagination"]) if "pagination" in raw else None
        return cls(data=properties, pagination=pagination)


@dataclass
class CreatePropertyRequest:
    """
    Yeni ilan oluşturma isteği.

    Backend: createPropertySchema (property.validation.ts)
    """

    title: str
    listing_type: str    # 'FOR_SALE' | 'FOR_RENT'
    property_type: str   # 'APARTMENT' | 'HOUSE' | ...
    price: float
    city: str            # province / il
    district: str        # ilçe
    neighborhood: str    # mahalle
    address: str         # adres detayı
    description: str | None = None
    province: str | None = None
    map_url: str | None = None
    is_map_url_manual: bool = False
    gross_area: float | None = None
    net_area: float | None = None
    room_count: int | None = None
    living_room_count: int | None = None
    bathroom_count: int | None = None
    floor: int | None = None
    total_floor: int | None = None
    building_age: int | None = None
    heating_type: str | None = None
    dues: float | None = None
    deed_status: str | None = None
    video_url: str | None = None
    virtual_tour_url: str | None = None
    furnished: bool = False
    balcony: bool = False
    elevator: bool = False
    parking: bool = False
    eligible_for_credit: bool = False
    exchange_available: bool = False
    is_featured: bool = False

    def to_dict(self) -> dict[str, Any]:
        """
        Backend'e gönderilecek JSON dict'ini oluşturur.

        Returns:
            camelCase anahtar isimli dict (backend beklentisiyle uyumlu).
        """
        target_province = self.province or self.city
        payload: dict[str, Any] = {
            "title": self.title,
            "listingType": self.listing_type,
            "propertyType": self.property_type,
            "price": self.price,
            "city": target_province,
            "province": target_province,
            "district": self.district,
            "neighborhood": self.neighborhood,
            "address": self.address,
            "mapUrl": self.map_url,
            "isMapUrlManual": self.is_map_url_manual,
            "furnished": self.furnished,
            "balcony": self.balcony,
            "elevator": self.elevator,
            "parking": self.parking,
            "eligibleForCredit": self.eligible_for_credit,
            "exchangeAvailable": self.exchange_available,
            "isFeatured": self.is_featured,
        }
        if self.description:
            payload["description"] = self.description
        if self.gross_area is not None:
            payload["grossArea"] = self.gross_area
        if self.net_area is not None:
            payload["netArea"] = self.net_area
        if self.room_count is not None:
            payload["roomCount"] = self.room_count
        if self.living_room_count is not None:
            payload["livingRoomCount"] = self.living_room_count
        if self.bathroom_count is not None:
            payload["bathroomCount"] = self.bathroom_count
        if self.floor is not None:
            payload["floor"] = self.floor
        if self.total_floor is not None:
            payload["totalFloor"] = self.total_floor
        if self.building_age is not None:
            payload["buildingAge"] = self.building_age
        if self.heating_type:
            payload["heatingType"] = self.heating_type
        if self.dues is not None:
            payload["dues"] = self.dues
        if self.deed_status:
            payload["deedStatus"] = self.deed_status
        if self.video_url:
            payload["videoUrl"] = self.video_url
        if self.virtual_tour_url:
            payload["virtualTourUrl"] = self.virtual_tour_url
        return payload


