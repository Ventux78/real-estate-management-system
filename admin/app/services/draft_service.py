"""
app/services/draft_service.py
==============================
Amaç:
    Yeni ilan oluşturma formunun taslak (draft) verilerini yerel diske
    JSON formatında kaydeder ve geri yükler.

    Backend kullanılmaz. Taslak yalnızca admin panel tarafında yaşar.

Tasarım Notları:
    - Tüm dosya I/O tek bir serviste toplandı; view katmanı ham dosya
      işlemlerine dokunmaz.
    - Debounce mantığı view katmanında (QTimer) yönetilir; bu servis
      sadece atomik okuma/yazma yapar.
    - JSON bozulmuşsa load_draft() None döndürür; uygulama çökmez.
    - Magic string: tüm JSON anahtarları DraftKeys sınıfında tanımlıdır.
    - Singleton pattern: uygulama genelinde tek instance kullanılır.

Kaydedilmeyen alanlar (kapsam dışı):
    - JWT token veya kullanıcı bilgisi
    - API cevapları veya loading durumları
    - Geçici UI değişkenleri

Mimari içindeki görevi:
    View → DraftService → Disk (JSON)
"""

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.dialogs.property_create_dialog import PropertyCreateDialog

logger = logging.getLogger(__name__)


def _resolve_draft_dir() -> Path:
    """
    Draft dosyasının saklanacağı dizini belirler.

    Windows'ta %APPDATA%\\GayrimenkulAdmin\\Drafts\\,
    diğer platformlarda ~/.GayrimenkulAdmin/Drafts/ kullanılır.

    Returns:
        Dizin yolu (Path nesnesi). Dizin henüz oluşturulmamış olabilir.
    """
    appdata = os.environ.get("APPDATA")
    if appdata:
        return Path(appdata) / "GayrimenkulAdmin" / "Drafts"
    return Path.home() / ".GayrimenkulAdmin" / "Drafts"


# ─── Sabitler ─────────────────────────────────────────────────────────────────

DRAFT_DIR: Path = _resolve_draft_dir()
DRAFT_FILE_PATH: Path = DRAFT_DIR / "property_draft.json"


class DraftKeys:
    """
    Draft JSON dosyasındaki tüm anahtar isimleri.

    Magic string kullanımını önler; tek noktadan yönetim sağlar.
    """

    # Meta
    LAST_SAVED_AT = "last_saved_at"

    # Temel Bilgiler
    TITLE = "title"
    PRICE = "price"
    LISTING_TYPE = "listing_type"
    PROPERTY_TYPE = "property_type"
    DESCRIPTION = "description"

    # Konut Detayları
    GROSS_AREA = "gross_area"
    NET_AREA = "net_area"
    ROOM_COUNT = "room_count"
    LIVING_ROOM_COUNT = "living_room_count"
    BATHROOM_COUNT = "bathroom_count"
    FLOOR = "floor"
    TOTAL_FLOOR = "total_floor"
    BUILDING_AGE = "building_age"
    UNITS_PER_FLOOR = "units_per_floor"
    KITCHEN_TYPE = "kitchen_type"
    EXTRA_ROOM = "extra_room"
    WC_TYPE = "wc_type"
    HEATING_TYPE = "heating_type"
    DUES = "dues"
    DEED_STATUS = "deed_status"
    IN_COMPLEX = "in_complex"
    COMPLEX_NAME = "complex_name"

    # Özellikler
    FURNISHED = "furnished"
    BALCONY = "balcony"
    ELEVATOR = "elevator"
    PARKING = "parking"
    ELIGIBLE_FOR_CREDIT = "eligible_for_credit"
    EXCHANGE_AVAILABLE = "exchange_available"
    IS_FEATURED = "is_featured"
    SOCIAL_AMENITIES = "social_amenities"

    # Konum & Harita
    PROVINCE = "province"
    DISTRICT = "district"
    NEIGHBORHOOD = "neighborhood"
    ADDRESS = "address"
    MAP_URL = "map_url"
    MAP_MODE = "map_mode"   # "auto" | "manual"


class DraftService:
    """
    Taslak yönetim servisi.

    Tüm disk okuma/yazma işlemlerini encapsulate eder.
    View katmanı yalnızca bu servisi çağırır.
    """

    # ─── Sorgu ────────────────────────────────────────────────────────────────

    def has_draft(self) -> bool:
        """
        Geçerli bir taslak dosyasının var olup olmadığını kontrol eder.

        Returns:
            bool: Dosya mevcutsa ve okunabilirse True.
        """
        if not DRAFT_FILE_PATH.exists():
            return False
        data = self.load_draft()
        return data is not None

    # ─── Yükleme ──────────────────────────────────────────────────────────────

    def load_draft(self) -> dict[str, Any] | None:
        """
        Taslak dosyasını okur.

        JSON parse hatası veya başka bir hata olursa None döndürür;
        uygulama çökmez, sessizce loglanır.

        Returns:
            dict: Taslak verisi. Hata durumunda None.
        """
        try:
            if not DRAFT_FILE_PATH.exists():
                return None
            with DRAFT_FILE_PATH.open("r", encoding="utf-8") as fh:
                data = json.load(fh)
            if not isinstance(data, dict):
                logger.warning("DraftService: Taslak verisi dict değil, atlanıyor.")
                return None
            logger.debug("DraftService: Taslak yüklendi.")
            return data
        except json.JSONDecodeError as exc:
            logger.warning(f"DraftService: JSON parse hatası — {exc}")
            return None
        except OSError as exc:
            logger.warning(f"DraftService: Dosya okuma hatası — {exc}")
            return None
        except Exception as exc:
            logger.error(f"DraftService: Beklenmeyen yükleme hatası — {exc}")
            return None

    # ─── Kaydetme ─────────────────────────────────────────────────────────────

    def save_draft(self, data: dict[str, Any]) -> None:
        """
        Taslak verisini diske yazar.

        Dizin yoksa oluşturur. Hata olursa sessizce loglanır; UI donmaz.

        Args:
            data: Kaydedilecek taslak sözlüğü.
        """
        try:
            DRAFT_DIR.mkdir(parents=True, exist_ok=True)
            # last_saved_at ekle / güncelle
            data[DraftKeys.LAST_SAVED_AT] = datetime.now(tz=timezone.utc).isoformat()
            with DRAFT_FILE_PATH.open("w", encoding="utf-8") as fh:
                json.dump(data, fh, ensure_ascii=False, indent=2)
            logger.debug(f"DraftService: Taslak kaydedildi → {DRAFT_FILE_PATH}")
        except OSError as exc:
            logger.error(f"DraftService: Dosya yazma hatası — {exc}")
        except Exception as exc:
            logger.error(f"DraftService: Beklenmeyen kaydetme hatası — {exc}")

    # ─── Silme ────────────────────────────────────────────────────────────────

    def delete_draft(self) -> None:
        """
        Taslak dosyasını siler.

        Dosya yoksa sessizce geçer; hata fırlatmaz.
        """
        try:
            if DRAFT_FILE_PATH.exists():
                DRAFT_FILE_PATH.unlink()
                logger.info("DraftService: Taslak silindi.")
        except OSError as exc:
            logger.warning(f"DraftService: Taslak silinirken hata — {exc}")
        except Exception as exc:
            logger.error(f"DraftService: Beklenmeyen silme hatası — {exc}")

    # ─── Form ↔ Dict Dönüşümleri ──────────────────────────────────────────────

    def build_draft_data(self, dialog: "PropertyCreateDialog") -> dict[str, Any]:
        """
        PropertyCreateDialog'dan tüm form değerlerini toplayarak
        kaydedilebilir bir sözlük oluşturur.

        JWT token, kullanıcı bilgisi veya geçici UI değişkenleri
        dahil edilmez.

        Args:
            dialog: Form değerlerinin okunacağı dialog instance'ı.

        Returns:
            dict: JSON'a yazılmaya hazır taslak verisi.
        """
        k = DraftKeys
        map_mode = "auto" if dialog._map_auto_radio.isChecked() else "manual"

        data: dict[str, Any] = {
            # Temel Bilgiler
            k.TITLE:               dialog._title_input.text(),
            k.PRICE:               dialog._price_input.text(),
            k.LISTING_TYPE:        dialog._listing_type_combo.currentData() or "",
            k.PROPERTY_TYPE:       dialog._property_type_combo.currentData() or "",
            k.DESCRIPTION:         dialog._description_input.toPlainText(),

            # Konut Detayları
            k.GROSS_AREA:          dialog._gross_area_input.text(),
            k.NET_AREA:            dialog._net_area_input.text(),
            k.ROOM_COUNT:          dialog._room_count_input.text(),
            k.LIVING_ROOM_COUNT:   dialog._living_room_count_input.text(),
            k.BATHROOM_COUNT:      dialog._bathroom_count_input.text(),
            k.FLOOR:               dialog._floor_input.text(),
            k.TOTAL_FLOOR:         dialog._total_floor_input.text(),
            k.BUILDING_AGE:        dialog._building_age_input.text(),
            k.UNITS_PER_FLOOR:     dialog._units_per_floor_input.text(),
            k.KITCHEN_TYPE:        dialog._kitchen_type_combo.currentData() or "",
            k.EXTRA_ROOM:          dialog._extra_room_input.text(),
            k.WC_TYPE:             dialog._wc_type_combo.currentData() or "",
            k.HEATING_TYPE:        dialog._heating_type_combo.currentData() or "",
            k.DUES:                dialog._dues_input.text(),
            k.DEED_STATUS:         dialog._deed_status_combo.currentData() or "",
            k.IN_COMPLEX:          dialog._in_complex_check.isChecked(),
            k.COMPLEX_NAME:        dialog._complex_name_input.text(),

            # Özellikler
            k.FURNISHED:           dialog._furnished_check.isChecked(),
            k.BALCONY:             dialog._balcony_check.isChecked(),
            k.ELEVATOR:            dialog._elevator_check.isChecked(),
            k.PARKING:             dialog._parking_check.isChecked(),
            k.ELIGIBLE_FOR_CREDIT: dialog._eligible_for_credit_check.isChecked(),
            k.EXCHANGE_AVAILABLE:  dialog._exchange_available_check.isChecked(),
            k.IS_FEATURED:         dialog._is_featured_check.isChecked(),
            k.SOCIAL_AMENITIES:    dialog._social_amenities_input.toPlainText(),

            # Konum & Harita
            k.PROVINCE:            dialog._province_combo.currentData() or "",
            k.DISTRICT:            dialog._district_combo.currentData() or "",
            k.NEIGHBORHOOD:        dialog._neighborhood_combo.currentData() or "",
            k.ADDRESS:             dialog._address_input.text(),
            k.MAP_URL:             dialog._map_url_input.text(),
            k.MAP_MODE:            map_mode,
        }
        return data

    def restore_draft(self, dialog: "PropertyCreateDialog", data: dict[str, Any]) -> None:
        """
        Taslak sözlüğündeki değerleri PropertyCreateDialog form alanlarına
        geri yükler.

        Konum seçimlerinde sinyaller geçici olarak bloke edilir; bu sayede
        iç içe tetikleme döngüsü oluşmaz. Mevcut olmayan fotoğraf yolları
        sessizce atlanır, uygulama çökmez.

        Args:
            dialog: Değerlerin yazılacağı dialog instance'ı.
            data:   load_draft() ile okunan sözlük.
        """
        k = DraftKeys

        # ── Temel Bilgiler ────────────────────────────────────────────────
        dialog._title_input.setText(data.get(k.TITLE, ""))
        dialog._price_input.setText(data.get(k.PRICE, ""))
        dialog._description_input.setPlainText(data.get(k.DESCRIPTION, ""))

        self._set_combo_by_data(dialog._listing_type_combo, data.get(k.LISTING_TYPE, ""))
        self._set_combo_by_data(dialog._property_type_combo, data.get(k.PROPERTY_TYPE, ""))

        # ── Konut Detayları ───────────────────────────────────────────────
        dialog._gross_area_input.setText(data.get(k.GROSS_AREA, ""))
        dialog._net_area_input.setText(data.get(k.NET_AREA, ""))
        dialog._room_count_input.setText(data.get(k.ROOM_COUNT, ""))
        dialog._living_room_count_input.setText(data.get(k.LIVING_ROOM_COUNT, ""))
        dialog._bathroom_count_input.setText(data.get(k.BATHROOM_COUNT, ""))
        dialog._floor_input.setText(data.get(k.FLOOR, ""))
        dialog._total_floor_input.setText(data.get(k.TOTAL_FLOOR, ""))
        dialog._building_age_input.setText(data.get(k.BUILDING_AGE, ""))
        dialog._units_per_floor_input.setText(data.get(k.UNITS_PER_FLOOR, ""))
        self._set_combo_by_data(dialog._kitchen_type_combo, data.get(k.KITCHEN_TYPE, ""))
        dialog._extra_room_input.setText(data.get(k.EXTRA_ROOM, ""))
        self._set_combo_by_data(dialog._wc_type_combo, data.get(k.WC_TYPE, ""))
        self._set_combo_by_data(dialog._heating_type_combo, data.get(k.HEATING_TYPE, ""))
        dialog._dues_input.setText(data.get(k.DUES, ""))
        self._set_combo_by_data(dialog._deed_status_combo, data.get(k.DEED_STATUS, ""))
        dialog._in_complex_check.setChecked(bool(data.get(k.IN_COMPLEX, False)))
        dialog._complex_name_input.setText(data.get(k.COMPLEX_NAME, ""))

        # ── Özellikler ────────────────────────────────────────────────────
        dialog._furnished_check.setChecked(bool(data.get(k.FURNISHED, False)))
        dialog._balcony_check.setChecked(bool(data.get(k.BALCONY, False)))
        dialog._elevator_check.setChecked(bool(data.get(k.ELEVATOR, False)))
        dialog._parking_check.setChecked(bool(data.get(k.PARKING, False)))
        dialog._eligible_for_credit_check.setChecked(bool(data.get(k.ELIGIBLE_FOR_CREDIT, False)))
        dialog._exchange_available_check.setChecked(bool(data.get(k.EXCHANGE_AVAILABLE, False)))
        dialog._is_featured_check.setChecked(bool(data.get(k.IS_FEATURED, False)))
        dialog._social_amenities_input.setPlainText(data.get(k.SOCIAL_AMENITIES, ""))

        # ── Konum (sinyaller bloke edilir) ────────────────────────────────
        self._restore_location(dialog, data)

        # ── Harita modu ───────────────────────────────────────────────────
        map_mode = data.get(k.MAP_MODE, "auto")
        if map_mode == "manual":
            dialog._map_manual_radio.setChecked(True)
            dialog._map_url_input.setReadOnly(False)
            dialog._map_url_input.setText(data.get(k.MAP_URL, ""))
        else:
            dialog._map_auto_radio.setChecked(True)
            dialog._map_url_input.setReadOnly(True)
            # Otomatik URL konum alanlarından üretilir
            dialog._update_auto_map_url()

        dialog._update_map_button_state()
        logger.info("DraftService: Taslak form alanlarına yüklendi.")

    # ─── Yardımcı Metodlar ────────────────────────────────────────────────────

    @staticmethod
    def _set_combo_by_data(combo, value: str) -> None:
        """
        Combo box'ı belirtilen userData değerine göre seçer.

        Değer bulunamazsa seçim değişmez (ilk öğe kalır).

        Args:
            combo: QComboBox instance'ı.
            value: userData olarak aranacak string.
        """
        if not value:
            return
        for i in range(combo.count()):
            if combo.itemData(i) == value:
                combo.setCurrentIndex(i)
                return

    def _restore_location(
        self,
        dialog: "PropertyCreateDialog",
        data: dict[str, Any],
    ) -> None:
        """
        İl → İlçe → Mahalle seçimlerini geri yükler.

        Konum combobox'ları cascade bağımlı olduğundan,
        önce İl seçilip ilçeler doldurulur, sonra İlçe seçilip
        mahalleler doldurulur ve son olarak Mahalle seçilir.

        Args:
            dialog: Form dialog'u.
            data:   Taslak sözlüğü.
        """
        from app.services.location_service import location_service

        k = DraftKeys
        province = data.get(k.PROVINCE, "")
        district = data.get(k.DISTRICT, "")
        neighborhood = data.get(k.NEIGHBORHOOD, "")

        # --- İl ---
        if province:
            # Sinyal bağlı olduğu için önce bloklayıp sonra seçiyoruz
            dialog._province_combo.blockSignals(True)
            self._set_combo_by_data(dialog._province_combo, province)
            dialog._province_combo.blockSignals(False)

            # İlçeleri doldur
            dialog._district_combo.blockSignals(True)
            dialog._district_combo.clear()
            dialog._district_combo.addItem("-- İlçe Seçin --", "")
            for d in location_service.get_districts(province):
                dialog._district_combo.addItem(d, d)
            dialog._district_combo.setEnabled(True)
            dialog._district_combo.blockSignals(False)

        # --- İlçe ---
        if district and province:
            dialog._district_combo.blockSignals(True)
            self._set_combo_by_data(dialog._district_combo, district)
            dialog._district_combo.blockSignals(False)

            # Mahalleleri doldur
            dialog._neighborhood_combo.blockSignals(True)
            dialog._neighborhood_combo.clear()
            dialog._neighborhood_combo.addItem("-- Mahalle Seçin --", "")
            for n in location_service.get_neighborhoods(province, district):
                dialog._neighborhood_combo.addItem(n, n)
            dialog._neighborhood_combo.setEnabled(True)
            dialog._neighborhood_combo.blockSignals(False)

        # --- Mahalle ---
        if neighborhood:
            dialog._neighborhood_combo.blockSignals(True)
            self._set_combo_by_data(dialog._neighborhood_combo, neighborhood)
            dialog._neighborhood_combo.blockSignals(False)

        # --- Adres ---
        dialog._address_input.setText(data.get(k.ADDRESS, ""))


# Singleton instance
draft_service = DraftService()
