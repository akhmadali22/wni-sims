# WNI SIMS Gameplay Foundation

Dokumen ini mencatat kontrak runtime yang sudah diterapkan dan batas aturan yang
belum boleh diimplementasikan tanpa rulebook.

## Status verifikasi

- `SOURCE_CONFIRMED`: terbukti ada pada source dan test saat ini.
- `DATA_AVAILABLE`: data sumber tersedia di repository.
- `SCHEMA_VALIDATED`: bentuk data lolos adapter dan runtime validation.
- `REFERENCE_CONFIRMED`: aturan dinyatakan dalam referensi gameplay proyek.
- `PENDING_RULEBOOK`: isi atau detail aturan belum dikonfirmasi dari rulebook asli.

`SCHEMA_VALIDATED` tidak berarti `REFERENCE_CONFIRMED`.

## Board provisional

Board tetap satu jalur melingkar dengan 45 petak ber-index `0..44`. Urutan canonical:

| Index | Definisi source | Wilayah/sisi | Source | Rulebook |
|---|---|---|---|---|
| 0 | Start | corner vertex 2 | `SOURCE_CONFIRMED` | `PENDING_RULEBOOK` |
| 1–8 | Sumatra 1–8 (`unknown`) | Sumatra/side 2 | `SOURCE_CONFIRMED` | `PENDING_RULEBOOK` |
| 9 | Penjara | corner vertex 3 | `SOURCE_CONFIRMED` | `PENDING_RULEBOOK` |
| 10–17 | Kalimantan 1–8 (`unknown`) | Kalimantan/side 3 | `SOURCE_CONFIRMED` | `PENDING_RULEBOOK` |
| 18 | Pajak Tahunan | corner vertex 4 | `SOURCE_CONFIRMED` | `PENDING_RULEBOOK` |
| 19–26 | Sulawesi 1–8 (`unknown`) | Sulawesi/side 4 | `SOURCE_CONFIRMED` | `PENDING_RULEBOOK` |
| 27 | Pengadilan | corner vertex 0 | `SOURCE_CONFIRMED` | `PENDING_RULEBOOK` |
| 28–35 | Papua 1–8 (`unknown`) | Papua/side 0 | `SOURCE_CONFIRMED` | `PENDING_RULEBOOK` |
| 36 | Parkiran Pungli | corner vertex 1 | `SOURCE_CONFIRMED` | `PENDING_RULEBOOK` |
| 37–44 | Jawa 1–8 (`unknown`) | Jawa/side 1 | `SOURCE_CONFIRMED` | `PENDING_RULEBOOK` |

Target 25 property tersedia sebagai arah produk, tetapi lokasi, harga, rent, dan
housing cost tetap `PENDING_RULEBOOK`. Geometry SVG bukan penyimpan runtime state.

## Runtime state

`GameState` bersifat serializable dan memiliki schema version serta revision. State
memuat pemain, negara dengan ID stabil `state`, property runtime, transaksi, pending
movement/decision/payment, deck draw/discard, processed action IDs, winner, dan end
reason.

Static board definition tetap terpisah dari dynamic `PropertyState`. Ownership hanya
disimpan pada:

```text
PropertyState.owner =
  | { kind: "unowned" }
  | { kind: "player", playerId }
  | { kind: "state" }
```

Asset pemain dihitung dari `PropertyState`; `Player` tidak menyimpan salinan mutable
property IDs. Karena definisi property masih kosong, initial `propertyStates` juga
kosong sampai mapping rulebook tersedia.

Player menyimpan cash, position, completed laps, status, prison counter, dan
inventory. Status bankruptcy tersedia, tetapi aturan deklarasi, likuidasi, dan
pengalihan asset tetap `PENDING_RULEBOOK`.

## Action dan resolution sequence

Semua action gameplay baru harus masuk melalui `dispatchGameAction`. Setiap action
mempunyai ID, divalidasi terhadap phase, dan ID yang sudah diproses ditolak.

Urutan runtime yang sudah tersedia:

```text
awaiting_roll
→ moving
→ resolving_start
→ resolving_housing
→ resolving_destination
→ resolving_doubles_destiny (hanya doubles)
→ awaiting_end_turn
→ checking_game_over
```

Phase housing, destination, dan doubles saat ini maju tanpa efek karena mekaniknya
belum dikonfirmasi. Compatibility wrapper P0 menjalankan phase tanpa input sampai
`awaiting_end_turn` agar UI lama tetap berfungsi.

Aturan fondasi yang sudah diterapkan:

1. Salary dan completed lap hanya berasal dari traversal yang memenuhi syarat.
2. Teleportasi toll tidak menghasilkan salary atau completed lap.
3. Doubles tidak memberi extra turn dan phase Takdir berada setelah destination.
4. Jailed player tetap masuk rotasi melalui `awaiting_prison_turn`.
5. Hanya bankrupt player yang dilewati rotasi.
6. Semua pemain bankrupt menghasilkan winner `state` dengan reason
   `all_players_bankrupt`.

Aturan keluar penjara dan mekanik bankruptcy belum diterapkan.

## Transaksi

`applyFinancialTransaction` adalah satu jalur perubahan saldo. Transaksi sukses
mencatat ID, payer, payee, amount, reason, source, dan turn. Saldo pemain yang tidak
mencukupi tidak menjadi negatif dan tidak otomatis membuat pemain bangkrut; state
menghasilkan structured `pendingPayment` dengan shortfall.

Treasury negara saat ini `null`, yang secara eksplisit berarti belum diperlakukan
sebagai saldo terbatas. Aturan kapasitas treasury tetap `PENDING_RULEBOOK`.

## Randomness dan determinisme

Dice menerima random source yang dapat diinjeksi. Action ID disediakan caller,
processed IDs disimpan di state, dan log ID diturunkan secara deterministik dari
revision/state. Deck tersedia sebagai draw/discard IDs, tetapi shuffle, draw, dan
reshuffle belum diaktifkan.

## Data kartu

- Musibah: 23 record, `DATA_AVAILABLE`, `SCHEMA_VALIDATED`, `PENDING_RULEBOOK`.
- Takdir: 40 record, `DATA_AVAILABLE`, `SCHEMA_VALIDATED`, `PENDING_RULEBOOK`.

Adapter menormalisasi numeric ID menjadi string, `name` menjadi `title`, severity
`ringan/sedang/brutal` menjadi `light/medium/brutal`, dan recipient `negara` menjadi
`state`. JSON sumber tidak diubah. Efek kartu tidak dijalankan oleh engine pada fase
ini.

## Local setup

UI menyediakan setup 2–5 nama pemain. Nama wajib diisi, modal default
Rp10.000.000, dan seluruh pemain mulai pada Start. Gameplay tetap local hot-seat;
network/server-authoritative multiplayer belum diimplementasikan.
