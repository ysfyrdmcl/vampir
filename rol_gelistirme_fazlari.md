# Vampir Koylu Rol Gelistirme Fazlari

Bu plan `yeni_gelistirmeler.md` temel alinarak hazirlandi. Amacimiz oyunun mevcut stabil akisini bozmadan rol sistemini adim adim buyutmek.

## Faz 1 - Rol Rehberi ve Kart Altyapisi
Durum: `Tamamlandi`

- Rol rehberi ekrani (`Roller ve Kurallar`)
- Standart kart semasi (rol, takim, aktivasyon, kurallar, ipucu)
- Ana menu ve lobi icinden rehbere giris
- Rol gorselleri icin sabit klasor ve dosya isimleri

## Faz 2 - Merkezi Role Registry ve Preset Sistemi
Durum: `Tamamlandi (bu turda)`

- Shared katmanda merkezi `ROLE_DEFINITIONS` ve `ROLE_PRESETS`
- Sunucu rol dagitim motorunun shared deck fonksiyonuna baglanmasi
- Oda konfigunda `rolePreset` tasinmasi (create/start/snapshot)
- Mobil lobide preset secimi (`Baslangic`, `Klasik+`, `Sosyal Kaos`)
- Rol rehberinin aktif rolleri preset + oyuncu sayisina gore gostermesi

## Faz 3 - Avci
Durum: `Tamamlandi`

- Avci rol atamasi acilacak
- Gunduze ozel `onDeath` aksiyon penceresi
- Olum pipeline: elenme -> avci atisi -> zincir kontrol -> win check
- Event/log ekleri: `role.hunter.triggered`, `role.hunter.shot`

## Faz 4 - Belediye Baskani (Makam Mekanigi)
Durum: `Tamamlandi`

- Gunduz basinda baskan secim akisi
- Baskan oyu `2` sayilacak
- Baskan olumunde yeniden secim
- Oylama UI ve sonuc ekranlarinda baskan etkisi gorunecek

## Faz 5 - Gardiyan
Durum: `Tamamlandi`

- Oyun basina 1 kez gunduz koruma
- Korunan oyuncunun oylama disi birakilmasi
- Hedeflenemeyen oyuncu UI gosterimi
- Event/log ekleri: `role.guard.protect`, `role.guard.block_vote`

## Faz 6 - Asiklar
Durum: `Tamamlandi`

- Gizli bag olusturma
- Zincir olum cozumleyicisi
- Oyun sonu tablolarinda bag bilgisini aciklama
- Event/log ekleri: `role.lovers.linked`, `role.lovers.chain_death`

## Faz 7 - Denge, Simulasyon ve Son UX Polisaji
Durum: `Tamamlandi`

- 4/6/8/10/12+ denge turleri
- Oylama/beraberlik istatistik raporlari
- Kritik metinlerin sadeleştirilmesi
- Faz gecislerinde UI tutarliligi ve performans kontrolu
