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
      { name: "Master Dokumen", description: "Katalog master dokumen layanan (service_documents) untuk persyaratan dan output" },
      { name: "Layanan & Prasyarat", description: "Katalog layanan instansi dan evaluasi kelengkapan dokumen cross-agency" },
      { name: "Antrean (Queues)", description: "Manajemen tiket antrean, booking, check-in kios, panggilan loket, dan reschedule" },
      { name: "Ulasan & Rating", description: "Pengumpulan dan pembacaan feedback/rating kepuasan masyarakat" },
      { name: "Analitik Operasional", description: "Metrik performa antrean harian dan kepuasan masyarakat per cabang" },
      { name: "AI Chatbot", description: "Asisten AI berbasis RAG untuk panduan prosedur dan persyaratan layanan" },
    ],
    paths: {
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
                    evaluation: {
                      is_ready_to_book: false,
                      total_requirements: 3,
                      fulfilled_count: 1,
                      missing_count: 2,
                      missing_documents: [
                        {
                          requirement: "Surat Pengantar RT/RW",
                          type: "external",
                          is_cross_agency: false,
                          guidance: "Bawa Surat Pengantar RT/RW setempat.",
                        },
                      ],
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
          summary: "Cross-agency prerequisites discovery",
          description: "Mengevaluasi alur lintas instansi untuk multi-appointment.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["service_id"],
                  properties: {
                    service_id: { type: "integer", example: 4 },
                    owned_documents: {
                      type: "array",
                      items: { type: "string" },
                      example: ["KTP Asli"],
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Alur cross-agency berhasil disusun." },
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
                    time_block: { type: "string", nullable: true, example: "08:00 - 09:00", description: "Opsional" },
                    location_id: { type: "integer", nullable: true, example: 1, description: "ID Cabang fisik" },
                    nik: { type: "string", minLength: 16, maxLength: 16, example: "3578012345670001" },
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
