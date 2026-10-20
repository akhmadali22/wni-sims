# WNI SIMS Gameplay Foundation

Dokumen ini menetapkan kontrak minimum untuk pengembangan gameplay berikutnya.
Ia tidak menggantikan rulebook dan tidak mengubah topology provisional yang ada.

## Status verifikasi

- `SOURCE_CONFIRMED`: perilaku atau data terbukti ada di source saat ini.
- `REFERENCE_CONFIRMED`: aturan dinyatakan dalam referensi gameplay proyek.
- `PENDING_RULEBOOK`: lokasi, nilai, atau detail belum dapat ditetapkan tanpa rulebook asli.

Penanda `verified: true` di source hanya berarti dikonfirmasi oleh source. Penanda itu
tidak dengan sendirinya membuktikan kesesuaian dengan rulebook asli.

## Invariant board

- Board adalah satu jalur melingkar, bukan lima board terpisah.
- Topology saat ini tetap provisional: 45 petak, index internal `0..44`.
- Urutan traversal mengikuti kenaikan index dan kembali dari `44` ke `0`.
- Lima pulau adalah Sumatra, Kalimantan, Sulawesi, Papua, dan Jawa.
- Target referensi adalah 25 property di lima pulau, tetapi lokasi property belum
  dipetakan dan tetap `PENDING_RULEBOOK`.
- Geometry SVG dan urutan tile tidak boleh menjadi tempat penyimpanan state gameplay.

### Manifest canonical provisional

| Index | ID | Definisi source | Wilayah/sisi | Source | Rulebook |
|---|---|---|---|---|---|
| 0 | `tile-0` | Start (`start`) | corner vertex 2 | `SOURCE_CONFIRMED` | `PENDING_RULEBOOK` |
| 1–8 | `tile-1`…`tile-8` | Sumatra 1–8 (`unknown`) | Sumatra/side 2 | `SOURCE_CONFIRMED` | `PENDING_RULEBOOK` |
| 9 | `tile-9` | Penjara (`jail`) | corner vertex 3 | `SOURCE_CONFIRMED` | `PENDING_RULEBOOK` |
| 10–17 | `tile-10`…`tile-17` | Kalimantan 1–8 (`unknown`) | Kalimantan/side 3 | `SOURCE_CONFIRMED` | `PENDING_RULEBOOK` |
| 18 | `tile-18` | Pajak Tahunan (`tax`) | corner vertex 4 | `SOURCE_CONFIRMED` | `PENDING_RULEBOOK` |
| 19–26 | `tile-19`…`tile-26` | Sulawesi 1–8 (`unknown`) | Sulawesi/side 4 | `SOURCE_CONFIRMED` | `PENDING_RULEBOOK` |
| 27 | `tile-27` | Pengadilan (`court`) | corner vertex 0 | `SOURCE_CONFIRMED` | `PENDING_RULEBOOK` |
| 28–35 | `tile-28`…`tile-35` | Papua 1–8 (`unknown`) | Papua/side 0 | `SOURCE_CONFIRMED` | `PENDING_RULEBOOK` |
| 36 | `tile-36` | Parkiran Pungli (`pungli`) | corner vertex 1 | `SOURCE_CONFIRMED` | `PENDING_RULEBOOK` |
| 37–44 | `tile-37`…`tile-44` | Jawa 1–8 (`unknown`) | Jawa/side 1 | `SOURCE_CONFIRMED` | `PENDING_RULEBOOK` |

Harga, rent, house cost, isi kartu, dan penempatan type lain tidak boleh diisi sampai
rulebook memberikan bukti yang cukup.

## Static definition dan runtime state

Static board definition bersifat immutable dan memuat identitas serta topology:
`id`, `index`, nama, type, island, side, side position, dan corner. Runtime tile state
disimpan terpisah berdasarkan `tileId` dan hanya memuat data yang berubah selama game.

Untuk property, runtime state menjadi satu-satunya source of truth ownership:

```text
PropertyState {
  tileId
  owner: "state" | PlayerId
  housingLevel
}
```

Daftar property milik pemain harus dihitung dari `PropertyState`, bukan disalin ke
struktur mutable lain. Field `Player.propertyIds` saat ini adalah scaffold lama dan
tidak boleh menjadi ownership store kedua ketika P1 diimplementasikan.

## Player, negara, dan transaksi

Runtime player minimal memerlukan `cash`, `position`, `status`, `completedLaps`,
prison state, dan inventory. Asset property berasal dari selector ownership, bukan
array mutable pada player.

Negara adalah owner dan pihak transaksi eksplisit dengan ID stabil `state`. Semua
perubahan uang dilakukan melalui satu operasi transaksi yang mencatat payer, payee,
amount, reason, dan source action/tile/card. Saldo tidak boleh dimutasi langsung oleh
resolver fitur yang berbeda.

Saldo yang tidak mampu memenuhi pending payment harus masuk alur bankruptcy yang
terdefinisi; detail likuidasi asset tetap `PENDING_RULEBOOK`.

## Turn, action, dan resolution order

Action pemain harus divalidasi terhadap phase dan pending state. Alur minimum target:

```text
awaiting_roll
→ moving
→ resolving_start
→ resolving_housing
→ resolving_destination
→ resolving_doubles_destiny
→ awaiting_end_turn
→ checking_game_over
```

Phase boleh berhenti pada `pendingDecision` atau `pendingPayment`; hanya action yang
menyelesaikan pending state tersebut yang diterima.

Aturan urutan yang sudah `REFERENCE_CONFIRMED`:

1. Salary Start dan kesempatan housing diselesaikan sebelum efek destination tile.
2. Doubles tidak memberi extra turn.
3. Efek Takdir dari doubles diselesaikan setelah efek destination tile dan sebelum
   akhir giliran.
4. `completedLaps` dimiliki per pemain dan berbeda dari global round count.
5. Jailed player tetap masuk rotasi dan menerima prison turn khusus.
6. Hanya bankrupt player yang dilewati dalam rotasi normal.
7. Teleportasi toll mengubah posisi tanpa salary Start dan tanpa menambah lap.
8. Setelah seluruh pemain bankrupt, phase menjadi `finished` dan pemenang adalah
   negara (`state`).

Pergerakan harus membawa sebab eksplisit, misalnya `dice`, `card`, atau
`toll_teleport`. Hanya traversal yang diizinkan rule yang boleh menghasilkan salary
dan penambahan lap; perbandingan index saja tidak cukup untuk teleportasi.

## Pending state

`pendingDecision` harus berupa pilihan terstruktur dengan actor, jenis keputusan,
opsi yang valid, dan source. `pendingPayment` harus memuat payer, payee, amount,
reason, serta source. Keduanya bersifat mutually exclusive kecuali rulebook kemudian
menetapkan alur bertingkat yang eksplisit.

## Card dan random deterministik

Setiap deck menyimpan draw pile dan discard pile sebagai ID kartu. Draw memindahkan
ID dari draw pile ke discard pile; reshuffle hanya terjadi sesuai aturan yang sudah
divalidasi. Random source harus di-inject atau state hasil shuffle harus disimpan agar
unit test dapat mengulang hasil yang sama. Isi kartu dan aturan reshuffle masih
`PENDING_RULEBOOK`.

## Batas implementasi P0

P0 hanya menstabilkan konfigurasi, test movement, dan invariant topology. Model target
di atas adalah kontrak P1, bukan klaim bahwa mekaniknya sudah diimplementasikan.
