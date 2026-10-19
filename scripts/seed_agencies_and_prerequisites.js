const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env" });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log("=================================================");
  console.log("🚀 Starting Seeding: Agencies, Locations, Services, and Prerequisites");
  console.log("=================================================\n");

  // 1. Bersihkan dokumen lelucon / testing (Dimas Asli, tinggi badan)
  console.log("🧹 1. Membersihkan dokumen dummy testing...");
  const { error: delErr } = await db
    .from("service_documents")
    .delete()
    .in("name", ["Dimas Asli", "tinggi badan di atas 200cm"]);
  if (delErr) {
    console.warn("   Peringatan saat menghapus dokumen dummy:", delErr.message);
  } else {
    console.log("   ✅ Dokumen dummy dihapus.");
  }

  // 2. Standardisasi Data 5 Instansi (Agencies)
  console.log("\n🏢 2. Standardisasi Data Instansi...");
  const agencies = [
    {
      id: 1,
      name: "Dispendukcapil (Dinas Kependudukan & Pencatatan Sipil)",
      description: "Layanan administrasi kependudukan: KTP-el, Kartu Keluarga, Akta Kelahiran, dan Identitas Kependudukan Digital (IKD).",
      open_time: "08:00:00",
      close_time: "16:00:00",
      operating_days: [1, 2, 3, 4, 5],
    },
    {
      id: 2,
      name: "Samsat (Badan Pendapatan Daerah)",
      description: "Sistem Administrasi Manunggal Satu Atap: Pembayaran Pajak Kendaraan Bermotor (PKB), STNK Tahunan, dan 5 Tahunan.",
      open_time: "08:00:00",
      close_time: "15:00:00",
      operating_days: [1, 2, 3, 4, 5],
    },
    {
      id: 3,
      name: "Kantor Imigrasi",
      description: "Pelayanan paspor Republik Indonesia (permohonan baru dewasa/anak dan penggantian paspor habis masa berlaku).",
      open_time: "08:00:00",
      close_time: "16:00:00",
      operating_days: [1, 2, 3, 4, 5],
    },
    {
      id: 4,
      name: "Kepolisian Resor (Satpas & Intelkam)",
      description: "Pelayanan perpanjangan Surat Izin Mengemudi (SIM A & C) dan penerbitan Surat Keterangan Catatan Kepolisian (SKCK).",
      open_time: "08:00:00",
      close_time: "15:30:00",
      operating_days: [1, 2, 3, 4, 5],
    },
    {
      id: 5,
      name: "BPJS Kesehatan",
      description: "Pelayanan pendaftaran peserta JKN-KIS mandiri baru, perubahan fasilitas kesehatan primer (faskes), dan update data keluarga.",
      open_time: "08:00:00",
      close_time: "15:00:00",
      operating_days: [1, 2, 3, 4, 5],
    },
  ];

  for (const a of agencies) {
    const { error: aErr } = await db.from("agencies").upsert(a, { onConflict: "id" });
    if (aErr) {
      console.error(`   ❌ Gagal update instansi ${a.id}:`, aErr.message);
    } else {
      console.log(`   ✅ Instansi ${a.id}: ${a.name}`);
    }
  }

  // 3. Pastikan Lokasi Cabang Lengkap untuk Seluruh Kota
  console.log("\n📍 3. Memeriksa & Menambahkan Lokasi Cabang / MPP...");
  const locationsToEnsure = [
    // Surabaya
    {
      id: 5,
      name: "Mall Pelayanan Publik Siola",
      address: "Jl. Tunjungan No. 1-3, Genteng",
      city: "Surabaya",
      type: "mpp",
      latitude: -7.255661,
      longitude: 112.737016,
    },
    {
      id: 6,
      name: "Kantor Dispendukcapil Kota Surabaya",
      address: "Gedung Siola Lt. 3, Jl. Tunjungan No. 1-3, Genteng",
      city: "Surabaya",
      type: "kantor_induk",
      latitude: -7.255661,
      longitude: 112.737016,
    },
    {
      id: 7,
      name: "Kantor Bersama Samsat Surabaya Timur",
      address: "Jl. Manyar Kertoarjo No. 1, Manyar Sabrangan",
      city: "Surabaya",
      type: "kantor_induk",
      latitude: -7.279812,
      longitude: 112.768142,
    },
    {
      id: 8,
      name: "Satpas SIM Colombo Polrestabes Surabaya",
      address: "Jl. Ikan Kerapu No. 2-4, Perak Barat, Krembangan",
      city: "Surabaya",
      type: "kantor_induk",
      latitude: -7.218521,
      longitude: 112.731456,
    },
    {
      id: 9,
      name: "Kantor Imigrasi Kelas I Khusus TPI Surabaya",
      address: "Jl. Raya Juanda KM 3-4, Sedati, Sidoarjo",
      city: "Surabaya",
      type: "kantor_induk",
      latitude: -7.37521,
      longitude: 112.77123,
    },
    {
      id: 10,
      name: "Kantor BPJS Kesehatan Cabang Surabaya",
      address: "Jl. Dharmahusada No. 2, Mojo, Gubeng",
      city: "Surabaya",
      type: "kantor_induk",
      latitude: -7.26789,
      longitude: 112.75945,
    },
    // Bandung
    {
      id: 1,
      name: "Mall Pelayanan Publik Grha Sawala",
      address: "Jl. Cianjur No. 34, Batununggal",
      city: "Bandung",
      type: "mpp",
      latitude: -6.9189,
      longitude: 107.6321,
    },
    {
      id: 2,
      name: "Kantor Disdukcapil Kota Bandung",
      address: "Jl. Ambon No. 1B, Citarum",
      city: "Bandung",
      type: "kantor_induk",
      latitude: -6.9082,
      longitude: 107.6189,
    },
    {
      id: 3,
      name: "Kantor Samsat Bandung Timur",
      address: "Jl. Soekarno-Hatta No. 528",
      city: "Bandung",
      type: "kantor_induk",
      latitude: -6.9452,
      longitude: 107.6433,
    },
    {
      id: 4,
      name: "Kantor Imigrasi Kelas I TPI Bandung",
      address: "Jl. Surapati No. 82",
      city: "Bandung",
      type: "kantor_induk",
      latitude: -6.8998,
      longitude: 107.6254,
    },
    // Jakarta Pusat
    {
      id: 11,
      name: "Mall Pelayanan Publik Provinsi DKI Jakarta",
      address: "Jl. HR Rasuna Said Kav. C-22, Karet Kuningan",
      city: "Jakarta Pusat",
      type: "mpp",
      latitude: -6.2198,
      longitude: 106.8327,
    },
    // Serang
    {
      id: 12,
      name: "Mall Pelayanan Publik Kota Serang",
      address: "Jl. Jenderal Sudirman No. 5, Sumurpecung",
      city: "Serang",
      type: "mpp",
      latitude: -6.1158,
      longitude: 106.1685,
    },
  ];

  for (const loc of locationsToEnsure) {
    const { error: locErr } = await db.from("locations").upsert(loc, { onConflict: "id" });
    if (locErr) {
      console.error(`   ❌ Gagal simpan lokasi ${loc.name}:`, locErr.message);
    } else {
      console.log(`   ✅ Lokasi [${loc.id}] ${loc.name} (${loc.city})`);
    }
  }

  // 4. Hubungkan Seluruh Instansi ke Lokasi (agency_locations)
  console.log("\n🔗 4. Menghubungkan Instansi ke Lokasi Layanan (agency_locations)...");
  const agencyLocations = [
    // Surabaya MPP Siola (Semua Instansi)
    { agency_id: 1, location_id: 5 },
    { agency_id: 2, location_id: 5 },
    { agency_id: 3, location_id: 5 },
    { agency_id: 4, location_id: 5 },
    { agency_id: 5, location_id: 5 },
    // Surabaya Kantor Induk
    { agency_id: 1, location_id: 6 },
    { agency_id: 2, location_id: 7 },
    { agency_id: 4, location_id: 8 },
    { agency_id: 3, location_id: 9 },
    { agency_id: 5, location_id: 10 },

    // Bandung MPP Grha Sawala (Semua Instansi)
    { agency_id: 1, location_id: 1 },
    { agency_id: 2, location_id: 1 },
    { agency_id: 3, location_id: 1 },
    { agency_id: 4, location_id: 1 },
    { agency_id: 5, location_id: 1 },
    // Bandung Kantor Induk
    { agency_id: 1, location_id: 2 },
    { agency_id: 2, location_id: 3 },
    { agency_id: 3, location_id: 4 },

    // Jakarta Pusat MPP
    { agency_id: 1, location_id: 11 },
    { agency_id: 2, location_id: 11 },
    { agency_id: 3, location_id: 11 },
    { agency_id: 4, location_id: 11 },
    { agency_id: 5, location_id: 11 },

    // Serang MPP
    { agency_id: 1, location_id: 12 },
    { agency_id: 2, location_id: 12 },
    { agency_id: 3, location_id: 12 },
    { agency_id: 4, location_id: 12 },
    { agency_id: 5, location_id: 12 },
  ];

  for (const al of agencyLocations) {
    const { error: alErr } = await db
      .from("agency_locations")
      .upsert(al, { onConflict: "agency_id,location_id" });
    if (alErr) {
      console.warn(`   ⚠️ Warning agency_locations (${al.agency_id}, ${al.location_id}):`, alErr.message);
    }
  }
  console.log(`   ✅ ${agencyLocations.length} relasi instansi-lokasi terdaftar.`);

  // 5. Pastikan Loket Aktif (Counters) Tersedia di Setiap Lokasi
  console.log("\n🎫 5. Memeriksa & Menyiapkan Loket Aktif (Counters)...");
  for (const al of agencyLocations) {
    const { data: existingCounters } = await db
      .from("counters")
      .select("id, counter_name")
      .eq("agency_id", al.agency_id)
      .eq("location_id", al.location_id);

    if (!existingCounters || existingCounters.length === 0) {
      const countersToInsert = [
        {
          agency_id: al.agency_id,
          location_id: al.location_id,
          counter_name: "Loket 1",
          status: "active",
        },
        {
          agency_id: al.agency_id,
          location_id: al.location_id,
          counter_name: "Loket 2",
          status: "active",
        },
      ];
      const { error: cErr } = await db.from("counters").insert(countersToInsert);
      if (cErr) {
        console.warn(`   ⚠️ Warning loket (Agency ${al.agency_id}, Loc ${al.location_id}):`, cErr.message);
      } else {
        console.log(`   + Dibuat 2 Loket aktif untuk Agency ${al.agency_id} di Location ${al.location_id}`);
      }
    }
  }

  // 6. Standardisasi Katalog Dokumen Persyaratan (service_documents)
  console.log("\n📄 6. Standardisasi Master Dokumen Persyaratan...");
  const masterDocuments = [
    { id: 1, name: "KTP-el Fisik", type: "dokumen", agency_id: 1, description: "Kartu Tanda Penduduk Elektronik fisik pemohon" },
    { id: 2, name: "KTP Asli", type: "dokumen", agency_id: 1, description: "e-KTP Asli pemohon / warga bersangkutan" },
    { id: 3, name: "Fotokopi KK", type: "dokumen", agency_id: 1, description: "Salinan fotokopi Kartu Keluarga terbaru" },
    { id: 4, name: "Kartu Keluarga (KK)", type: "dokumen", agency_id: 1, description: "Lembar Kartu Keluarga resmi ber-barcode TTE" },
    { id: 5, name: "KK Asli", type: "dokumen", agency_id: 1, description: "Kartu Keluarga Asli pemohon" },
    { id: 6, name: "Surat Pengantar RT/RW", type: "dokumen", agency_id: 1, description: "Surat pengantar resmi dari RT/RW setempat" },
    { id: 7, name: "Berusia 17 Tahun", type: "kondisi", agency_id: 1, description: "Syarat usia minimal pemohon perekaman KTP baru" },
    { id: 8, name: "Buku Nikah", type: "dokumen", agency_id: 1, description: "Buku Nikah / Akta Perkawinan orang tua atau pemohon" },
    { id: 9, name: "KTP Suami Istri", type: "dokumen", agency_id: 1, description: "e-KTP asli dari kedua orang tua / suami & istri" },
    { id: 10, name: "STNK Asli", type: "dokumen", agency_id: 2, description: "Surat Tanda Nomor Kendaraan Asli yang masih berlaku" },
    { id: 11, name: "STNK yang Disahkan (SKPD)", type: "dokumen", agency_id: 2, description: "Surat Ketetapan Pajak Daerah / Pengesahan STNK baru" },
    { id: 12, name: "BPKB Asli", type: "dokumen", agency_id: 2, description: "Buku Pemilik Kendaraan Bermotor Asli" },
    { id: 13, name: "Paspor RI", type: "dokumen", agency_id: 3, description: "Buku Paspor Republik Indonesia 48 Halaman" },
    { id: 14, name: "Akta Kelahiran / Ijazah", type: "dokumen", agency_id: 1, description: "Kutipan Akta Kelahiran atau Ijazah pendidikan terakhir" },
    { id: 15, name: "Smartphone dengan koneksi internet", type: "kondisi", agency_id: 1, description: "Perangkat ponsel pintar untuk memuat aplikasi IKD" },
    { id: 16, name: "Email aktif", type: "kondisi", agency_id: 1, description: "Alamat surel aktif untuk menerima kode verifikasi" },
    { id: 17, name: "KTP Pemohon", type: "dokumen", agency_id: 1, description: "Kartu Tanda Penduduk milik pemohon langsung" },
    { id: 18, name: "Dokumen berkas terkait", type: "dokumen", agency_id: 1, description: "Berkas lampiran penunjang konsultasi kependudukan" },
    { id: 19, name: "Identitas Kependudukan Digital (IKD)", type: "dokumen", agency_id: 1, description: "KTP digital terverifikasi dalam aplikasi Ditjen Dukcapil" },
    { id: 20, name: "Surat Rekomendasi Adminduk", type: "dokumen", agency_id: 1, description: "Lembar rekomendasi penyelesaian administrasi kependudukan" },
    { id: 32, name: "Buku Nikah / Akta Perkawinan", type: "dokumen", agency_id: 1, description: "Akta perkawinan resmi dari KUA / Disdukcapil" },
    { id: 34, name: "Surat Keterangan Lahir (RS/Bidan)", type: "dokumen", agency_id: 1, description: "Surat kelahiran asli dari dokter, rumah sakit, atau bidan" },
    { id: 35, name: "Kutipan Akta Kelahiran", type: "dokumen", agency_id: 1, description: "Kutipan Akta Kelahiran resmi ber-barcode TTE Dukcapil" },
    { id: 45, name: "Hasil Cek Fisik Kendaraan", type: "dokumen", agency_id: 2, description: "Lembar gesek nomor rangka & nomor mesin yang disahkan" },
    { id: 48, name: "Paspor Lama Asli", type: "dokumen", agency_id: 3, description: "Paspor RI lama fisik yang telah habis masa berlakunya" },
    { id: 49, name: "SIM Lama yang Masih Berlaku", type: "dokumen", agency_id: 4, description: "Kartu SIM fisik yang belum melewati masa kedaluwarsa" },
    { id: 50, name: "Surat Keterangan Kesehatan Dokter", type: "dokumen", agency_id: 4, description: "Surat hasil uji kesehatan jasmani dari dokter terakreditasi" },
    { id: 51, name: "Surat Hasil Tes Psikologi SIM", type: "dokumen", agency_id: 4, description: "Surat rekomendasi psikologi pengemudi dari lembaga resmi" },
    { id: 52, name: "Surat Izin Mengemudi (SIM Baru)", type: "dokumen", agency_id: 4, description: "Kartu Smart SIM baru yang telah dicetak" },
    { id: 53, name: "Pas Foto 4x6 Latar Merah (4 Lembar)", type: "dokumen", agency_id: 4, description: "Foto paspor formal 4x6 latar belakang merah" },
    { id: 54, name: "SKCK Resmi", type: "dokumen", agency_id: 4, description: "Surat Keterangan Catatan Kepolisian resmi berlegalisir" },
    { id: 55, name: "Buku Rekening Tabungan Aktif", type: "dokumen", agency_id: 5, description: "Buku tabungan bank BNI/BRI/Mandiri/BCA untuk autodebet" },
    { id: 56, name: "Kartu BPJS / KIS Lama", type: "dokumen", agency_id: 5, description: "Kartu peserta BPJS Kesehatan atau KIS fisik lama" },
    { id: 57, name: "Kartu Indonesia Sehat (KIS)", type: "dokumen", agency_id: 5, description: "Kartu kepesertaan JKN-KIS resmi digital atau fisik" },
    { id: 58, name: "Kartu Keluarga (KK) Lama / Fotokopi", type: "dokumen", agency_id: 1, description: "KK fisik lama sebelum pembaruan data anggota keluarga" },
  ];

  for (const doc of masterDocuments) {
    const { error: dErr } = await db.from("service_documents").upsert(doc, { onConflict: "id" });
    if (dErr) {
      console.warn(`   ⚠️ Warning doc ${doc.id} (${doc.name}):`, dErr.message);
    }
  }
  console.log(`   ✅ ${masterDocuments.length} master dokumen persyaratan terverifikasi.`);

  // 7. Standardisasi 13 Layanan (Services) dengan Persyaratan Akurat
  console.log("\n📋 7. Standardisasi Daftar Layanan & Persyaratannya...");
  const servicesToUpdate = [
    {
      id: 1,
      agency_id: 1,
      name: "Pembuatan KTP-el Baru / Penggantian",
      estimated_time: 15,
      requirements: ["Fotokopi KK", "Surat Pengantar RT/RW", "Berusia 17 Tahun"],
      requirement_doc_ids: [3, 6, 7],
      output_documents: ["KTP-el Fisik", "KTP Asli"],
      output_doc_ids: [1, 2],
      info_procedure: "Pemohon mengambil antrean, membawa berkas persyaratan ke loket, perekaman foto biometrik & sidik jari, dan KTP-el langsung dicetak.",
    },
    {
      id: 2,
      agency_id: 1,
      name: "Cetak Kartu Keluarga (KK)",
      estimated_time: 10,
      requirements: ["Kartu Keluarga (KK) Lama / Fotokopi", "KTP Pemohon"],
      requirement_doc_ids: [58, 17],
      output_documents: ["Kartu Keluarga (KK)", "KK Asli"],
      output_doc_ids: [4, 5],
      info_procedure: "Verifikasi berkas kependudukan oleh petugas loket, penerbitan draf KK dengan barcode TTE, dan pencetakan lembar Kartu Keluarga baru.",
    },
    {
      id: 3,
      agency_id: 2,
      name: "Perpanjangan STNK Tahunan (PKB)",
      estimated_time: 10,
      requirements: ["STNK Asli", "KTP Asli", "BPKB Asli"],
      requirement_doc_ids: [10, 2, 12],
      output_documents: ["STNK yang Disahkan (SKPD)", "STNK Asli"],
      output_doc_ids: [11, 10],
      info_procedure: "Serahkan STNK & KTP asli di loket pendaftaran, pembayaran PKB & SWDKLLJ di loket kasir, dan pengesahan lembar SKPD baru.",
    },
    {
      id: 4,
      agency_id: 3,
      name: "Permohonan Paspor Baru (Dewasa)",
      estimated_time: 20,
      requirements: ["KTP Asli", "KK Asli", "Akta Kelahiran / Ijazah"],
      requirement_doc_ids: [2, 5, 14],
      output_documents: ["Paspor RI"],
      output_doc_ids: [13],
      info_procedure: "Pemeriksaan berkas asli di loket, wawancara tujuan perjalanan, pengambilan foto biometrik 10 sidik jari, dan pembayaran kode billing MPN.",
    },
    {
      id: 5,
      agency_id: 1,
      name: "Aktivasi Identitas Kependudukan Digital (IKD)",
      estimated_time: 10,
      requirements: ["KTP-el Fisik", "Smartphone dengan koneksi internet", "Email aktif"],
      requirement_doc_ids: [1, 15, 16],
      output_documents: ["Identitas Kependudukan Digital (IKD)"],
      output_doc_ids: [19],
      info_procedure: "Unduh aplikasi IKD, isi NIK dan email, verifikasi wajah (face recognition), dan lakukan pemindaian QR code aktivasi di loket pelayanan.",
    },
    {
      id: 6,
      agency_id: 1,
      name: "Konsultasi Administrasi Kependudukan",
      estimated_time: 15,
      requirements: ["KTP Pemohon", "Dokumen berkas terkait"],
      requirement_doc_ids: [17, 18],
      output_documents: ["Surat Rekomendasi Adminduk"],
      output_doc_ids: [20],
      info_procedure: "Konsultasi tatap muka terkait kendala NIK ganda, pindah datang antar-daerah, dan legalisir dokumen adminduk.",
    },
    {
      id: 8,
      agency_id: 4,
      name: "Perpanjangan SIM A & C (SIM Corner)",
      estimated_time: 15,
      requirements: ["SIM Lama yang Masih Berlaku", "KTP Asli", "Surat Keterangan Kesehatan Dokter", "Surat Hasil Tes Psikologi SIM"],
      requirement_doc_ids: [49, 2, 50, 51],
      output_documents: ["Surat Izin Mengemudi (SIM Baru)"],
      output_doc_ids: [52],
      info_procedure: "Pemeriksaan surat kesehatan & psikologi, verifikasi formulir di loket pendaftaran, foto digital, dan cetak Smart SIM langsung jadi.",
    },
    {
      id: 9,
      agency_id: 4,
      name: "Penerbitan SKCK Baru / Perpanjangan",
      estimated_time: 15,
      requirements: ["KTP Asli", "Fotokopi KK", "Akta Kelahiran / Ijazah", "Pas Foto 4x6 Latar Merah (4 Lembar)"],
      requirement_doc_ids: [2, 3, 14, 53],
      output_documents: ["SKCK Resmi"],
      output_doc_ids: [54],
      info_procedure: "Perekaman rumus sidik jari (untuk baru), validasi catatan kepolisian di loket SKCK, pembayaran PNBP, dan penyerahan lembar SKCK resmi.",
    },
    {
      id: 10,
      agency_id: 1,
      name: "Penerbitan Akta Kelahiran",
      estimated_time: 15,
      requirements: ["Surat Keterangan Lahir (RS/Bidan)", "Buku Nikah / Akta Perkawinan", "KTP Suami Istri", "KK Asli"],
      requirement_doc_ids: [34, 32, 9, 5],
      output_documents: ["Kutipan Akta Kelahiran", "Kartu Keluarga (KK)"],
      output_doc_ids: [35, 4],
      info_procedure: "Penyerahan berkas kelahiran, pencatatan data saksi, verifikasi berkas, dan penerbitan Kutipan Akta Kelahiran resmi ber-barcode TTE.",
    },
    {
      id: 11,
      agency_id: 2,
      name: "Perpanjangan STNK 5 Tahunan & Ganti Plat",
      estimated_time: 25,
      requirements: ["STNK Asli", "BPKB Asli", "KTP Asli", "Hasil Cek Fisik Kendaraan"],
      requirement_doc_ids: [10, 12, 2, 45],
      output_documents: ["STNK Asli", "STNK yang Disahkan (SKPD)"],
      output_doc_ids: [10, 11],
      info_procedure: "Cek fisik nomor rangka & mesin di area cek fisik, validasi formulir di loket, pembayaran PNBP plat nomor, dan pencetakan plat TNKB baru.",
    },
    {
      id: 12,
      agency_id: 3,
      name: "Penggantian Paspor Habis Masa Berlaku",
      estimated_time: 15,
      requirements: ["KTP Asli", "Paspor Lama Asli"],
      requirement_doc_ids: [2, 48],
      output_documents: ["Paspor RI"],
      output_doc_ids: [13],
      info_procedure: "Khusus paspor terbitan tahun 2009 ke atas: cukup membawa e-KTP dan paspor lama asli untuk verifikasi berkas dan foto biometrik.",
    },
    {
      id: 13,
      agency_id: 5,
      name: "Pendaftaran Peserta Mandiri PBPU Baru",
      estimated_time: 15,
      requirements: ["KK Asli", "KTP Asli", "Buku Rekening Tabungan Aktif"],
      requirement_doc_ids: [5, 2, 55],
      output_documents: ["Kartu Indonesia Sehat (KIS)"],
      output_doc_ids: [57],
      info_procedure: "Pengisian formulir kepesertaan mandiri, pemilihan faskes tingkat pertama, pendaftaran autodebet bank, dan aktivasi kepesertaan BPJS.",
    },
    {
      id: 14,
      agency_id: 5,
      name: "Perubahan Faskes & Pembaruan Data BPJS",
      estimated_time: 10,
      requirements: ["Kartu BPJS / KIS Lama", "KTP Asli", "KK Asli"],
      requirement_doc_ids: [56, 2, 5],
      output_documents: ["Kartu Indonesia Sehat (KIS)"],
      output_doc_ids: [57],
      info_procedure: "Pindah fasilitas kesehatan tingkat pertama atau pembaruan data susunan keluarga langsung pada sistem master database BPJS Kesehatan.",
    },
  ];

  for (const s of servicesToUpdate) {
    const { error: sErr } = await db.from("services").upsert(s, { onConflict: "id" });
    if (sErr) {
      console.error(`   ❌ Gagal update layanan [${s.id}] ${s.name}:`, sErr.message);
    } else {
      console.log(`   ✅ Layanan [${s.id}] ${s.name} (Agency ${s.agency_id})`);
    }
  }

  console.log("\n=================================================");
  console.log("🎉 SEEDING SELESAI DENGAN SUKSES!");
  console.log("=================================================");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
