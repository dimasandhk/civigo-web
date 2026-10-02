export async function GET() {
  const openApiSpec = {
    openapi: "3.1.0",
    info: {
      title: "CiviGo Public Service & Queue API",
      version: "1.0.0",
      description:
        "Dokumentasi resmi API CiviGo untuk platform pelayanan publik, antrean dinamis multi-cabang (Mall Pelayanan Publik), katalog persyaratan dokumen cross-agency, ulasan warga, dan asisten AI Chatbot.",
      contact: {
        name: "Tim Pengembang CiviGo",
        email: "support@civigo.com",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development Server",
      },
      {
        url: "https://civigo-web.vercel.app",
        description: "Staging / Production Server",
      },
    ],
    tags: [
      { name: "Autentikasi", description: "Endpoint pengelolaan kata sandi dan autentikasi pengguna/petugas" },
      { name: "Master Instansi", description: "Katalog instansi pemerintah, jam operasional, dan lokasi cabang MPP" },
      { name: "Master Dokumen", description: "Katalog master dokumen layanan (service_documents) untuk persyaratan dan output" },
      { name: "Anggota Keluarga", description: "Manajemen data anggota keluarga untuk pendaftaran layanan perwakilan" },
      { name: "Layanan & Prasyarat", description: "Katalog layanan instansi dan evaluasi kelengkapan dokumen cross-agency" },
      { name: "Antrean (Queues)", description: "Manajemen tiket antrean, booking, check-in kios, panggilan loket, postpone, dan reschedule" },
      { name: "Ulasan & Rating", description: "Pengumpulan dan pembacaan feedback/rating kepuasan masyarakat" },
      { name: "Analitik Operasional", description: "Metrik performa antrean harian dan kepuasan masyarakat per cabang" },
      { name: "AI Chatbot", description: "Asisten AI berbasis RAG untuk panduan prosedur dan persyaratan layanan" },
    ],
    paths: {
      "/api/auth/register": {
        post: {
          tags: ["Autentikasi"],
          summary: "Registrasi akun warga baru (Mobile & Web)",
          description: "Mendaftarkan warga baru dengan email, kata sandi, NIK 16 digit, dan nama lengkap.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "nik", "full_name"],
                  properties: {
                    email: { type: "string", format: "email", example: "warga.baru@civigo.com" },
                    password: { type: "string", minLength: 8, example: "Password123!" },
                    nik: { type: "string", pattern: "^[0-9]{16}$", example: "3578012345678901" },
                    full_name: { type: "string", example: "Budi Santoso" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Pendaftaran akun berhasil.",
              content: {
                "application/json": {
                  example: {
                    ok: true,
                    message: "Pendaftaran akun berhasil. Selamat datang di CiviGo!",
                    user: {
                      id: "842f8f38-e83a-48c9-b4f8-96d0789f5832",
                      email: "warga.baru@civigo.com",
                      nik: "3578012345678901",
                      full_name: "Budi Santoso",
                      role: "user",
                    },
                    session: {
                      access_token: "eyJhbGciOi...",
                      refresh_token: "v-87as...",
                      token_type: "bearer",
                    },
                  },
                },
              },
            },
            "400": { description: "Format input tidak valid (misal NIK bukan 16 digit atau kata sandi kurang dari 8 karakter)." },
            "409": { description: "NIK atau email sudah terdaftar sebelumnya." },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Autentikasi"],
          summary: "Login universal (Mobile & Web)",
          description: "Autentikasi menggunakan email, NIK 16 digit (warga), atau username instansi (petugas). Mengembalikan user profile dan token Bearer session.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["password"],
                  properties: {
                    email: { type: "string", example: "warga1@civigo.com", description: "Bisa diisi email, NIK 16 digit, atau username instansi" },
                    password: { type: "string", example: "Password123!" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Login berhasil, token dan profil dikembalikan.",
              content: {
                "application/json": {
                  example: {
                    ok: true,
                    message: "Login berhasil.",
                    user: {
                      id: "842f8f38-e83a-48c9-b4f8-96d0789f5832",
                      email: "warga1@civigo.com",
                      nik: "0000999999999999",
                      full_name: "Warga 1",
                      role: "user",
                    },
                    session: {
                      access_token: "eyJhbGciOi...",
                      refresh_token: "v-87as...",
                      expires_in: 3600,
                      token_type: "bearer",
                    },
                  },
                },
              },
            },
            "401": { description: "Email/NIK atau kata sandi tidak sesuai." },
          },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Autentikasi"],
          summary: "Ambil profil akun login saat ini",
          description: "Mendeteksi token Bearer pada header Authorization atau Cookie session untuk mengambil profil user aktif.",
          parameters: [
            {
              name: "Authorization",
              in: "header",
              required: false,
              schema: { type: "string", example: "Bearer eyJhbGci..." },
              description: "Token akses Supabase Auth JWT",
            },
          ],
          responses: {
            "200": {
              description: "Profil user aktif.",
              content: {
                "application/json": {
                  example: {
                    ok: true,
                    user: {
                      id: "842f8f38-e83a-48c9-b4f8-96d0789f5832",
                      email: "warga1@civigo.com",
                      nik: "0000999999999999",
                      full_name: "Warga 1",
                      role: "user",
                    },
                  },
                },
              },
            },
            "401": { description: "Sesi tidak valid atau telah kedaluwarsa." },
          },
        },
      },
      "/api/auth/forgot-password": {
        post: {
          tags: ["Autentikasi"],
          summary: "Request link reset password",
          description: "Mengirimkan email tautan/token reset kata sandi ke pengguna terdaftar via Supabase Auth.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: {
                    email: { type: "string", format: "email", example: "warga@example.com" },
                    redirectTo: { type: "string", format: "uri", example: "https://civigo.com/reset-password" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Tautan reset kata sandi berhasil dikirim ke email.",
              content: {
                "application/json": {
                  example: {
                    ok: true,
                    message: "Tautan reset kata sandi telah berhasil dikirim ke email Anda.",
                  },
                },
              },
            },
            "400": { description: "Format email tidak valid atau email tidak terdaftar." },
          },
        },
      },
      "/api/auth/reset-password": {
        post: {
          tags: ["Autentikasi"],
          summary: "Setel kata sandi baru",
          description: "Memperbarui password pengguna yang sedang berada dalam sesi pemulihan (recovery session).",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["password"],
                  properties: {
                    password: { type: "string", minLength: 8, example: "KataSandiBaru#2026" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Kata sandi berhasil diperbarui.",
              content: {
                "application/json": {
                  example: {
                    ok: true,
                    message: "Kata sandi Anda berhasil diperbarui. Silakan login kembali.",
                  },
                },
              },
            },
            "401": { description: "Sesi reset kata sandi tidak valid atau telah kedaluwarsa." },
          },
        },
      },
      "/api/agencies": {
        get: {
          tags: ["Master Instansi"],
          summary: "Katalog seluruh instansi & cabang layanan",
          description: "Mengambil daftar seluruh instansi/lembaga pengampu layanan di CiviGo, lengkap dengan hari dan jam operasional, lokasi cabang/MPP terafiliasi, serta ringkasan layanan yang diselenggarakan.",
          parameters: [
            {
              name: "location_id",
              in: "query",
              required: false,
              schema: { type: "integer" },
              description: "Filter instansi yang beroperasi di lokasi fisik tertentu",
            },
            {
              name: "q",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Pencarian nama atau deskripsi instansi",
            },
          ],
          responses: {
            "200": {
              description: "Daftar instansi berhasil diambil.",
              content: {
                "application/json": {
                  example: {
                    ok: true,
                    count: 1,
                    agencies: [
                      {
                        id: 1,
                        name: "Dinas Kependudukan dan Pencatatan Sipil",
                        description: "Layanan administrasi kependudukan dan pencatatan sipil",
                        open_time: "08:00:00",
                        close_time: "15:00:00",
                        operating_days: [1, 2, 3, 4, 5],
                        locations: [
                          {
                            id: 1,
                            name: "Mall Pelayanan Publik Siola",
                            address: "Jl. Tunjungan No. 1-3",
                            city: "Surabaya",
                            type: "MPP",
                          },
                        ],
                        services_count: 5,
                        services: [
                          { id: 1, name: "Pembuatan KTP Baru", estimated_time: 15 },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      "/api/agencies/{id}": {
        get: {
          tags: ["Master Instansi"],
          summary: "Detail lengkap instansi",
          description: "Mengambil informasi detail satu instansi beserta daftar lokasi cabang, katalog layanan lengkap, dan loket pelayanan aktif.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "ID Instansi",
            },
          ],
          responses: {
            "200": {
              description: "Detail instansi ditemukan.",
              content: {
                "application/json": {
                  example: {
                    ok: true,
                    agency: {
                      id: 1,
                      name: "Dinas Kependudukan dan Pencatatan Sipil",
                      open_time: "08:00:00",
                      close_time: "15:00:00",
                      operating_days: [1, 2, 3, 4, 5],
                      locations: [{ id: 1, name: "MPP Siola", address: "Jl. Tunjungan No. 1-3" }],
                      services: [{ id: 1, name: "Pembuatan KTP Baru", estimated_time: 15 }],
                      counters: [{ id: 1, counter_name: "Loket 1", status: "active" }],
                    },
                  },
                },
              },
            },
            "404": { description: "Instansi tidak ditemukan." },
          },
        },
      },
      "/api/documents": {
        get: {
          tags: ["Master Dokumen"],
          summary: "Ambil katalog master dokumen",
          description: "Mengambil daftar master dokumen persyaratan dan output resmi (service_documents) di CiviGo.",
          parameters: [
            {
              name: "agency_id",
              in: "query",
              required: false,
              schema: { type: "integer" },
              description: "Filter dokumen berdasarkan ID instansi penerbit/pengampu",
            },
          ],
          responses: {
            "200": {
              description: "Daftar master dokumen berhasil dimuat.",
              content: {
                "application/json": {
                  example: {
                    ok: true,
                    count: 3,
                    documents: [
                      { id: 1, name: "KTP-el Fisik", agency_id: 1, description: "KTP elektronik fisik pemohon" },
                      { id: 2, name: "KTP Asli", agency_id: 1, description: "KTP asli pemohon" },
                      { id: 3, name: "Fotokopi KK", agency_id: 1, description: "Fotokopi Kartu Keluarga terbaru" },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      "/api/services": {
        get: {
          tags: ["Layanan & Prasyarat"],
          summary: "Katalog seluruh layanan publik",
          description: "Mengambil daftar layanan lengkap dengan persyaratan dokumen, output documents, dan jam kerja instansi.",
          parameters: [
            {
              name: "agency_id",
              in: "query",
              required: false,
              schema: { type: "integer" },
              description: "Filter layanan berdasarkan ID instansi",
            },
          ],
          responses: {
            "200": {
              description: "Katalog layanan berhasil dimuat.",
              content: {
                "application/json": {
                  example: {
                    ok: true,
                    count: 2,
                    services: [
                      {
                        id: 1,
                        agency_id: 1,
                        name: "Pembuatan KTP Baru",
                        requirements: ["Fotokopi KK", "Surat Pengantar RT/RW", "Berusia 17 Tahun"],
                        output_documents: ["KTP-el Fisik", "KTP Asli"],
                        estimated_time: 15,
                        agency: {
                          id: 1,
                          name: "Dinas Kependudukan & Pencatatan Sipil",
                          open_time: "08:00",
                          close_time: "16:00",
                          operating_days: [1, 2, 3, 4, 5],
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      "/api/services/{id}": {
        get: {
          tags: ["Layanan & Prasyarat"],
          summary: "Detail satu layanan publik",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "ID Layanan",
            },
          ],
          responses: {
            "200": { description: "Detail layanan ditemukan." },
            "404": { description: "Layanan tidak ditemukan." },
          },
        },
      },
      "/api/services/{id}/prerequisites": {
        get: {
          tags: ["Layanan & Prasyarat"],
          summary: "Evaluasi kelayakan booking layanan",
          description: "Menganalisis dokumen yang dimiliki warga terhadap persyaratan layanan target, mendeteksi dokumen yang kurang, dan memberikan rekomendasi layanan instansi lain yang dapat menerbitkan dokumen tersebut.",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "integer" } },
            {
              name: "owned_documents",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Daftar nama dokumen yang sudah dimiliki, dipisahkan tanda koma (misal: 'Fotokopi KK,KTP')",
            },
          ],
          responses: {
            "200": {
              description: "Hasil evaluasi dokumen persyaratan.",
              content: {
                "application/json": {
                  example: {
                    ok: true,
                    service_id: 1,
                    service_name: "Pembuatan KTP Baru",
                    agency_id: 1,
                    is_ready_to_book: false,
                    requirements: [
                      { name: "Fotokopi KK", agency_id: 1, type: "dokumen" },
                      { name: "Surat Pengantar RT/RW", agency_id: 1, type: "dokumen" },
                      { name: "Berusia 17 Tahun", agency_id: 1, type: "kondisi" },
                    ],
                    evaluation: {
                      is_ready_to_book: false,
                      total_requirements: 3,
                      fulfilled_count: 1,
                      missing_count: 2,
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/services/cross-agency": {
        post: {
          tags: ["Layanan & Prasyarat"],
          summary: "Evaluasi prasyarat dokumen lintas-instansi (Cross-Agency)",
          description: "Mengevaluasi alur lintas instansi untuk multi-appointment. Mendukung 3 status dokumen: 'sudah_tersedia', 'belum_memiliki', dan 'hilang_rusak' (yang memerlukan SKTLK Kepolisian atau bukti fisik).",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["target_service_id"],
                  properties: {
                    target_service_id: { type: "integer", example: 4, description: "ID layanan tujuan akhir" },
                    documents: {
                      type: "array",
                      description: "Daftar status 3-kondisi kelengkapan dokumen pemohon",
                      items: {
                        type: "object",
                        required: ["name", "status"],
                        properties: {
                          name: { type: "string", example: "Kartu Keluarga" },
                          status: {
                            type: "string",
                            enum: ["sudah_tersedia", "belum_memiliki", "hilang_rusak"],
                            example: "hilang_rusak",
                          },
                        },
                      },
                    },
                    owned_documents: {
                      type: "array",
                      items: { type: "string" },
                      example: ["KTP Asli"],
                      description: "Format alternatif untuk daftar dokumen yang sudah dimiliki (backward compatible)",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Alur cross-agency dan evaluasi dokumen berhasil disusun.",
              content: {
                "application/json": {
                  example: {
                    ok: true,
                    evaluation: {
                      is_ready_to_book: false,
                      summary: "Terdapat 1 dokumen berstatus HILANG/RUSAK. Harap urus SKTLK di Polsek atau penggantian di Disdukcapil.",
                      total_requirements: 2,
                      fulfilled_count: 1,
                      missing_count: 1,
                      fulfilled_documents: [{ requirement: "KTP", matched_with: "KTP Asli" }],
                      missing_documents: [
                        {
                          requirement: "Kartu Keluarga",
                          type: "cross_agency",
                          is_cross_agency: true,
                          condition: "hilang_rusak",
                          requires_police_report: true,
                          guidance: "Persyaratan Kartu Keluarga berstatus HILANG/RUSAK. Siapkan SKTLK Polsek sebelum mengurus penggantian di Disdukcapil.",
                          recommended_service: {
                            id: 2,
                            name: "Cetak Kartu Keluarga",
                            agency_id: 1,
                            agency_name: "Dinas Kependudukan dan Pencatatan Sipil",
                            estimated_time: 15,
                            output_document: "Kartu Keluarga (KK)",
                          },
                        },
                      ],
                      suggested_flow: [
                        {
                          step: 1,
                          type: "external",
                          title: "Lapor Kehilangan di Kepolisian (SKTLK) / Bukti Fisik Rusak",
                          description: "Buat SKTLK di Polsek terdekat untuk dokumen yang hilang.",
                        },
                        {
                          step: 2,
                          type: "agency",
                          agency_id: 1,
                          title: "Kunjungi Dinas Kependudukan dan Pencatatan Sipil",
                          description: "Lengkapi dokumen prasyarat sebelum menuju ke Kantor Imigrasi.",
                        },
                        {
                          step: 3,
                          type: "target",
                          title: "Kunjungi Kantor Imigrasi (Layanan Tujuan)",
                          description: "Setelah melengkapi prasyarat di langkah sebelumnya, Anda siap mengajukan antrean Pembuatan Paspor Baru.",
                        },
                      ],
                    },
                  },
                },
              },
            },
            "400": { description: "ID layanan tujuan tidak valid." },
            "404": { description: "Layanan tidak ditemukan." },
          },
        },
      },
      "/api/family-members": {
        get: {
          tags: ["Anggota Keluarga"],
          summary: "Daftar anggota keluarga pengguna",
          description: "Mengambil seluruh data anggota keluarga yang didaftarkan oleh akun pengguna yang login.",
          parameters: [
            {
              name: "user_id",
              in: "query",
              required: false,
              schema: { type: "string", format: "uuid" },
              description: "Target user ID (opsional untuk admin/service role)",
            },
          ],
          responses: {
            "200": {
              description: "Daftar anggota keluarga berhasil dimuat.",
              content: {
                "application/json": {
                  example: {
                    ok: true,
                    count: 1,
                    family_members: [
                      {
                        id: 1,
                        user_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                        full_name: "Siti Rahmawati",
                        nik: "3578012345670002",
                        relationship: "Istri",
                        created_at: "2026-09-27T10:00:00Z",
                      },
                    ],
                  },
                },
              },
            },
            "401": { description: "Belum terautentikasi." },
          },
        },
        post: {
          tags: ["Anggota Keluarga"],
          summary: "Tambah anggota keluarga baru",
          description: "Mendaftarkan anggota keluarga baru untuk keperluan booking layanan perwakilan (menguruskan antrean orang tua, anak, dsb).",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["full_name", "nik", "relationship"],
                  properties: {
                    full_name: { type: "string", example: "Budi Santoso" },
                    nik: { type: "string", minLength: 16, maxLength: 16, example: "3578012345670003" },
                    relationship: { type: "string", example: "Anak Kandung" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Anggota keluarga berhasil ditambahkan.",
              content: {
                "application/json": {
                  example: {
                    ok: true,
                    message: "Anggota keluarga berhasil ditambahkan.",
                    family_member: {
                      id: 2,
                      full_name: "Budi Santoso",
                      nik: "3578012345670003",
                      relationship: "Anak Kandung",
                    },
                  },
                },
              },
            },
            "400": { description: "NIK tidak 16 digit atau data tidak lengkap." },
          },
        },
      },
      "/api/family-members/{id}": {
        delete: {
          tags: ["Anggota Keluarga"],
          summary: "Hapus anggota keluarga",
          description: "Menghapus relasi anggota keluarga milik pengguna.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "ID anggota keluarga",
            },
          ],
          responses: {
            "200": { description: "Anggota keluarga berhasil dihapus." },
            "404": { description: "Anggota keluarga tidak ditemukan." },
          },
        },
      },
      "/api/queue/my": {
        get: {
          tags: ["Antrean (Queues)"],
          summary: "Riwayat tiket antrean warga (aktif & lampau)",
          description: "Mengambil daftar seluruh tiket antrean warga, otomatis dipisahkan menjadi `active_tickets` (hari ini/mendatang) dan `history_tickets` (selesai atau hangus). Tiket yang dilewati/hangus memiliki flag `can_reschedule: true` untuk tombol reschedule.",
          parameters: [
            {
              name: "user_id",
              in: "query",
              required: false,
              schema: { type: "string", format: "uuid" },
              description: "User ID akun warga",
            },
            {
              name: "nik",
              in: "query",
              required: false,
              schema: { type: "string", minLength: 16, maxLength: 16 },
              description: "NIK warga (berguna untuk tiket walk-in atau kiosk)",
            },
          ],
          responses: {
            "200": {
              description: "Riwayat tiket antrean berhasil diambil.",
              content: {
                "application/json": {
                  example: {
                    ok: true,
                    today: "2026-09-28",
                    total_tickets: 2,
                    active_count: 1,
                    history_count: 1,
                    active_tickets: [
                      {
                        id: "b2d2f1f0-4592-4f70-985e-998811223344",
                        queue_number: "A-008",
                        status: "present",
                        schedule_date: "2026-09-28",
                        time_block: null,
                        postponed: false,
                        can_reschedule: false,
                        is_for_family: true,
                        family_member: { id: 1, full_name: "Siti Rahmawati", relationship: "Istri" },
                        service: { id: 1, name: "Pembuatan KTP Baru" },
                      },
                    ],
                    history_tickets: [
                      {
                        id: "a1a1f1f0-4592-4f70-985e-112233445566",
                        queue_number: "A-003",
                        status: "skipped",
                        schedule_date: "2026-09-28",
                        can_reschedule: true,
                        is_for_family: false,
                      },
                    ],
                  },
                },
              },
            },
            "401": { description: "Belum login dan NIK tidak diberikan." },
          },
        },
      },
      "/api/queue/book": {
        post: {
          tags: ["Antrean (Queues)"],
          summary: "Ambil / Booking nomor antrean baru",
          description: "Menerbitkan nomor antrean baru untuk warga atau kios fisik. Blok waktu (time_block) bersifat opsional karena menggunakan dynamic slot allocation.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["service_id", "schedule_date", "nik"],
                  properties: {
                    service_id: { type: "integer", example: 1 },
                    schedule_date: { type: "string", format: "date", example: "2026-09-28" },
                    time_block: { type: "string", nullable: true, example: "08:00 - 09:00", description: "Opsional (dynamic pooling)" },
                    location_id: { type: "integer", nullable: true, example: 1, description: "ID Cabang fisik" },
                    nik: { type: "string", minLength: 16, maxLength: 16, example: "3578012345670001" },
                    family_member_id: { type: "integer", nullable: true, example: 2, description: "ID anggota keluarga jika menguruskan antrean orang lain" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Nomor antrean berhasil diterbitkan.",
              content: {
                "application/json": {
                  example: {
                    ok: true,
                    ticket: {
                      id: "b2d2f1f0-4592-4f70-985e-998811223344",
                      queue_number: "A-008",
                      status: "scheduled",
                      schedule_date: "2026-09-28",
                      time_block: null,
                      location_id: 1,
                      service: { id: 1, name: "Pembuatan KTP Baru" },
                      agency: { id: 1, name: "Disdukcapil" },
                    },
                  },
                },
              },
            },
            "400": { description: "Parameter tidak valid atau instansi libur." },
          },
        },
      },
      "/api/queue/{id}/status": {
        get: {
          tags: ["Antrean (Queues)"],
          summary: "Cek status tiket antrean",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": { description: "Status tiket ditemukan." },
            "404": { description: "Tiket tidak ditemukan." },
          },
        },
        patch: {
          tags: ["Antrean (Queues)"],
          summary: "Update status tiket antrean",
          description: "Mengubah status antrean (misal: dilayani, selesai, atau dilewati/hangus).",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: {
                    status: {
                      type: "string",
                      enum: ["present", "served", "completed", "skipped"],
                    },
                    counter_id: { type: "integer", nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Status tiket berhasil diubah." },
          },
        },
      },
      "/api/queue/{id}/postpone": {
        post: {
          tags: ["Antrean (Queues)"],
          summary: "Mundurkan antrean ke urutan paling akhir",
          description: "Opsi petugas loket untuk memundurkan nomor antrean pemohon yang belum siap atau izin sebentar. Tiket ditandai 'postponed = true' dan diletakkan di paling akhir antrean menunggu, tanpa menghanguskannya.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
              description: "UUID tiket antrean",
            },
          ],
          responses: {
            "200": {
              description: "Antrean berhasil dimundurkan ke urutan paling akhir.",
              content: {
                "application/json": {
                  example: {
                    ok: true,
                    message: "Tiket A-003 berhasil dimundurkan ke paling akhir antrean menunggu.",
                    ticket: {
                      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                      queue_number: "A-003",
                      status: "present",
                      postponed: true,
                      postponed_at: "2026-09-28T09:15:00Z",
                    },
                  },
                },
              },
            },
            "400": { description: "ID tiket tidak valid." },
            "404": { description: "Tiket tidak ditemukan." },
            "409": { description: "Tiket tidak dalam status antrean aktif untuk dimundurkan." },
          },
        },
      },
      "/api/queue/{id}/reschedule": {
        post: {
          tags: ["Antrean (Queues)"],
          summary: "Jadwalkan ulang tiket yang hangus (skipped)",
          description: "Menerbitkan tiket pengganti baru untuk tiket yang dilewati/hangus oleh petugas.",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": { description: "Tiket berhasil dijadwalkan ulang." },
            "422": { description: "Tiket belum berstatus skipped atau tidak ada kuota tersisa hari ini." },
          },
        },
      },
      "/api/queue/check-in": {
        post: {
          tags: ["Antrean (Queues)"],
          summary: "Check-in antrean di kios fisik",
          description: "Mengonfirmasi kehadiran fisik warga di lokasi (mengubah status scheduled -> present).",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["ticket_id"],
                  properties: {
                    ticket_id: { type: "string", format: "uuid" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Check-in berhasil, status tiket kini 'present'." },
          },
        },
      },
      "/api/queue/call-next": {
        post: {
          tags: ["Antrean (Queues)"],
          summary: "Petugas loket memanggil antrean berikutnya",
          description: "Mengambil antrean prioritas tertinggi yang berstatus 'present' / 'waiting' untuk loket bersangkutan.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["counter_id"],
                  properties: {
                    counter_id: { type: "integer", example: 1 },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Antrean berhasil dipanggil ke loket." },
            "404": { description: "Tidak ada antrean yang sedang menunggu." },
          },
        },
      },
      "/api/reviews": {
        get: {
          tags: ["Ulasan & Rating"],
          summary: "Ambil daftar ulasan instansi",
          parameters: [
            { name: "agency_id", in: "query", required: false, schema: { type: "integer" } },
          ],
          responses: {
            "200": { description: "Daftar ulasan berhasil dimuat." },
          },
        },
        post: {
          tags: ["Ulasan & Rating"],
          summary: "Kirim ulasan dan rating layanan",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["agency_id", "rating"],
                  properties: {
                    agency_id: { type: "integer", example: 1 },
                    service_id: { type: "integer", nullable: true, example: 1 },
                    counter_id: { type: "integer", nullable: true, example: 1 },
                    queue_id: { type: "string", format: "uuid", nullable: true },
                    rating: { type: "integer", minimum: 1, maximum: 5, example: 5 },
                    comment: { type: "string", example: "Petugas sangat cepat dan ramah!" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Ulasan berhasil disimpan." },
            "400": { description: "Rating, id, atau queue_id tidak valid (INVALID_RATING, INVALID_ID, INVALID_QUEUE_ID), atau instansi tidak diketahui (AGENCY_REQUIRED)." },
            "404": { description: "Layanan, loket, atau antrean tidak ditemukan (SERVICE_NOT_FOUND, COUNTER_NOT_FOUND, QUEUE_NOT_FOUND)." },
            "422": { description: "Layanan, loket, atau antrean bukan milik agency_id ulasan (SERVICE_AGENCY_MISMATCH, COUNTER_AGENCY_MISMATCH, QUEUE_AGENCY_MISMATCH)." },
          },
        },
      },
      "/api/analytics": {
        get: {
          tags: ["Analitik Operasional"],
          summary: "Ringkasan metrik antrean & kepuasan masyarakat",
          description: "Menyajikan statistik rating ulasan, breakdown bintang 1-5, rasio kehadiran, jumlah tiket per status (waiting, serving, completed, skipped, postponed), dan popularitas layanan.",
          parameters: [
            { name: "agency_id", in: "query", required: false, schema: { type: "integer", default: 1 } },
            { name: "location_id", in: "query", required: false, schema: { type: "integer" }, description: "Filter cabang fisik" },
            { name: "date", in: "query", required: false, schema: { type: "string", format: "date" }, description: "Tanggal antrean (default: hari ini)" },
          ],
          responses: {
            "200": {
              description: "Data analitik berhasil dihitung.",
              content: {
                "application/json": {
                  example: {
                    ok: true,
                    agency_id: 1,
                    location_id: 1,
                    date: "2026-09-28",
                    satisfaction: {
                      total_reviews: 6,
                      average_rating: 4.3,
                      satisfaction_percentage: 83.3,
                      breakdown: { star_1: 0, star_2: 0, star_3: 1, star_4: 2, star_5: 3 },
                    },
                    queue_metrics: {
                      date: "2026-09-28",
                      total_today: 12,
                      waiting: 3,
                      calling: 1,
                      serving: 2,
                      completed: 5,
                      skipped: 1,
                      postponed: 0,
                      active_counters: 6,
                      attendance_rate: 41.7,
                    },
                    service_distribution: [
                      { service_name: "Pembuatan KTP Baru", count: 8, percentage: 67 },
                      { service_name: "Cetak Kartu Keluarga", count: 4, percentage: 33 },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      "/api/chatbot": {
        post: {
          tags: ["AI Chatbot"],
          summary: "Tanya jawab dengan Asisten AI MPP",
          description: "Menerima pertanyaan seputar persyaratan, jam kerja, atau prosedur layanan MPP dan merespons menggunakan OpenAI embedding + Supabase pgvector.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["pertanyaan"],
                  properties: {
                    pertanyaan: { type: "string", example: "Apa saja syarat membuat KTP baru bagi yang baru berusia 17 tahun?" },
                    riwayat: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          role: { type: "string", enum: ["user", "assistant"] },
                          content: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Jawaban asisten AI berhasil dihasilkan.",
              content: {
                "application/json": {
                  example: {
                    status: "success",
                    jawaban: "Untuk membuat KTP baru bagi pemohon berusia 17 tahun, syarat yang harus dibawa adalah: Fotokopi KK, Surat Pengantar RT/RW, dan hadir langsung ke loket untuk perekaman biometrik.",
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  return Response.json(openApiSpec, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
}
