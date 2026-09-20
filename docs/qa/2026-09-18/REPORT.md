# Vampir Köylü — oynanış ve mantık testi

Tarih: 18 Eylül 2026. İncelenen sürüm: mevcut yerel çalışma ağacı; test başlangıcında kaydedilmemiş değişiklikler vardı. Oyun kaynak kodunda düzeltme yapılmadı.

## Kapsam ve sınırlar

- Çalışan `localhost:3000` sunucusuna gerçek Socket.IO istemcileri bağlandı. Yalnızca yeni QA odaları kullanıldı.
- Son kanıt setinde 2 kontrollü dört oyunculu maç ve 3 adet dokuz oyunculu bot maçı tamamlandı. Fazlar hızlandırmak için host tarafından manuel ilerletildi. Bunlar ekrana dokunarak oynanmış maçlar değildir.
- Mevcut sunucu testlerinin tamamı geçti: 24 dosya, 152 test.
- Expo CLI ile SDK 57 uyumlu Expo Go 57.0.9 kuruldu; iOS 26.4 / iPhone 17 Pro Max üzerinde uygulama açıldı. Metro kaydında `app.bootstrap.done` ve `socket.connected` görüldü. Test Metro adresi: `http://localhost:8082`.
- Xcode Device Hub penceresine erişen bilgisayar kontrol aracı tekrar tekrar `timeoutReached` verdi. Bu nedenle görsel yerleşim, gerçek dokunmatik akış, animasyon, arka plan/ön plan ve fiziksel ağ kesintisi doğrulanamadı.
- Bot AI/LLM ayarları kapalıydı. Gerçek bot kararları çalıştırıldı; LLM konuşma kalitesi değerlendirilmedi. Hızlandırılmış maçlarda bot konuşması kaydedilmedi; bu tek başına konuşma hatası değildir.

## 1. P1 — Boş oy beraberliği süresiz oylamayı kilitliyor

**Doğrulama:** Gerçek sunucuda tekrar üretildi.

1. Dört oyuncuyla Güvenli İlk Gece modunu aç; “Kimseyi gönderme” etkin, süreler 0 olsun.
2. İlk gündüzde A oyuncusuna 2, “Kimseyi gönderme” seçeneğine 2 oy ver.
3. Tekrar oylama adayları A ve `__NO_LYNCH__` oluyor.
4. Tekrar oylamada boş oy `TARGET_NOT_IN_REVOTE`, A'nın kendine oyu `INVALID_TARGET` ile reddediliyor.
5. Diğer üç oyuncu A'ya oy verse de host ilerletince `PHASE_ACTIONS_PENDING` alıyor. `phaseEndsAt: null` olduğu için süreyle çıkış da yok.

**Etki:** A için geçerli seçim kalmıyor; maç bu fazda duruyor. Süreli oylamada da boş oy seçeneği ikinci turdan haksız biçimde kaldırılmış oluyor.

**Neden:** `apps/server/src/game/game-engine.ts:400` tekrar turunda boş oyu koşulsuz reddediyor. Aynı dosyanın `hasRequiredActionInPhase` kontrolü tekrar turunun gerçek aday listesini dikkate almıyor. `apps/mobile/src/screens/VoteScreen.tsx:90` da tekrar turunda boş oy seçeneğini kaldırıyor.

**Ek belirti:** Sunucu sonuç mesajında kullanıcıya dönük etiket yerine `Oylar eşitlendi: __NO_LYNCH__, QA Host` gönderiyor.

**Öneri:** Beraberlik adayları arasında boş oy varsa onu geçerli tut; zorunlu aksiyon kontrolünü aynı yasal hedef hesabıyla yap. Teknik işaretçiyi kullanıcı metnine çevirmek gerekir.

## 2. P1 — Reddedilen gece aksiyonu istemcide kilitleniyor

**Doğrulama:** Sunucunun ret/kabul davranışı gerçek bağlantıyla; istemcinin kilitleme davranışı kaynak koduyla doğrulandı. Cihazda dokunarak tekrar üretilemedi.

1. Doktorun kendini korumasını kapat.
2. Doktor ekranında kendini seçmek hâlâ mümkün: `NightScreen.tsx:239` doktor için kendini seçme koşulunu doğrudan `true` yapıyor; oda kuralları bu listeye uygulanmıyor.
3. Onayla. Sunucu `SELF_PROTECT_BLOCKED` döndürüyor.
4. Buna rağmen `NightScreen.tsx:303` gönderimden hemen sonra `submittedActionKeyRef` değerini kilitliyor ve “Kararın kilitlendi” mesajını gösteriyor.
5. Hata nedeniyle yeniden render sonrası aynı fazda yasal bir hedefe geçip tekrar gönderme engelleniyor. Ref yalnızca aksiyon/faz anahtarı değişince temizleniyor.

**Etki:** Oyuncunun sunucuda geçerli kararı yokken ekran karar verilmiş gibi davranıyor. Süreli oyunda doktor korumasını kaybedebilir; süresiz oyunda faz ilerleyemeyebilir. Ardışık hedef yasağı da hedef listesinde uygulanmıyor.

**Aynı kök nedene bağlı başka durum:** `emitGameAction` duraklatılmış veya bağlantısız oyunda gönderim yapmadan dönebiliyor; çağıran ekran yine başarı gösterip kilitliyor.

**Kanıt:** Aynı sunucu fazında yasak self hedefi reddedildikten sonra test istemcisinin yasal hedefi `{accepted:true}` aldı. Sunucu düzeltmeye izin veriyor; istemci erken kilitliyor.

**Öneri:** Kilidi ve başarı mesajını sunucunun kabul cevabına bağla. Ret/bağlantı hatasında yeniden denemeye izin ver. Doktor hedeflerini oda kuralları ve önceki koruma bilgisiyle filtrele.

## 3. P2 — “Oy kilitlendi” ifadesi gerçek gündüz davranışıyla uyuşmuyor

**Doğrulama:** Aynı oyuncunun aynı fazda iki farklı hedefe gönderdiği oy gerçek sunucuda iki kez `{accepted:true}` aldı; son oy öncekinin yerini alıyor.

`VoteScreen.tsx:132` onaydan sonra “Kararın kilitlendi” diyor fakat hedef seçme ve yeniden onaylamayı kapatmıyor. `GameEngine.submitAction` aynı oyuncunun önceki kararını değiştiriyor. Buna karşılık gece ekranı yerel kilit kullanıyor.

**Etki:** Oyuncu kararının kesinleşip kesinleşmediğini anlayamıyor; gece/gündüz davranışı tutarsız. Bağlantısız veya duraklatılmış durumda gündüz ekranı da gönderim gerçekleşmeden başarı gösterebiliyor.

**Öneri:** Tasarım kararını netleştir: Oy değiştirilebiliyorsa “Oy gönderildi, süre bitene kadar değiştirebilirsin” de; kesin kilitse sunucu tarafında da uygula. Başarı mesajı kabul cevabından sonra gösterilmeli.

## Başarıyla geçen senaryolar

| Senaryo | Sonuç |
| --- | --- |
| Kontrollü köylü galibiyeti | `GameOver`, `winner: Villagers` |
| Kontrollü vampir galibiyeti | `GameOver`, `winner: Vampires` |
| İki maçtan sonra lobiye dönüş | Roller temizlendi, oyuncular hazır değil |
| İki kez yeniden maç başlatma | `RoleReveal`, tur 1 |
| Host bağlantısının kesilmesi | Yetki başka oyuncuya geçti |
| Aynı oturumla yeniden bağlanma | Oyuncu kimliği, rol ve faz geri geldi |
| Duraklatılmış oyunda aksiyon | Sunucu `GAME_PAUSED` ile reddetti |
| Doktor yasak hedefi / yasal düzeltme | Ret ve sonrasında kabul |
| Random, 8 bot + 1 istemci | 3. tur, vampir galibiyeti, engelleyici hata yok |
| Balanced, 8 bot + 1 istemci | 3. tur, köylü galibiyeti, engelleyici hata yok |
| Deceptive, 8 bot + 1 istemci | 3. tur, köylü galibiyeti, engelleyici hata yok |

Bot maçlarında başkan seçimi, gardiyan koruması, dedektif ve doktor fazları; deceptive maçta ayrıca avcı son nefes fazı çalıştı. Üç maç, istatistiksel denge veya uzun süreli bot kalitesi değerlendirmesi için yeterli değildir.

## Kanıtları yeniden çalıştırma

Çalışan yerel sunucu ve kurulu bağımlılıklar gerekir. Scriptler yeni QA odaları oluşturur; mevcut odalara katılmaz. Bot testi çalıştırılırken AI/LLM bayraklarını kapalı tutmak harici API kullanımını önler.

```sh
node docs/qa/2026-09-18/vampir-qa.cjs
node docs/qa/2026-09-18/vampir-qa-extra.cjs
```

Sonuçlar aynı klasördeki `vampir-qa-results.json` ve `vampir-qa-extra-results.json` dosyalarına yazılır. Botların rastgele kararları nedeniyle sonraki çalıştırmada kazananlar değişebilir. Scriptler gözlem kaydedicidir; bütün bulguları otomatik assertion olarak değerlendiren regresyon testleri değildir.
