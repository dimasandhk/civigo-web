import type { Metadata } from "next";
import { Fragment } from "react";
import PageHeader from "../../components/admin/PageHeader";
import RatingBar from "../../components/admin/RatingBar";
import ReviewCard from "../../components/admin/ReviewCard";
import ReviewFilters from "../../components/admin/ReviewFilters";
import ReviewStat from "../../components/admin/ReviewStat";
import { RATINGS, RATING_LEVELS, type RatingLevel } from "../../components/admin/ratings";

import {
  getAdminReviews,
  getReviewFilterOptions,
  resolveAgencyId,
} from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Ulasan — CiviGo",
};

const RATING_OPTIONS = [
  { value: "", label: "Semua Rating" },
  ...RATING_LEVELS.map((level) => ({ value: String(level), label: RATINGS[level].label })),
];

const PANEL = "rounded-[20px] bg-white shadow-soft";

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function UlasanPage({ searchParams }: PageProps<"/admin/ulasan">) {
  const agencyId = await resolveAgencyId();
  const [params, options] = await Promise.all([
    searchParams,
    getReviewFilterOptions(agencyId),
  ]);

  // Nilai yang tidak ada di opsi instansi ini (id layanan instansi lain, rating
  // 7, teks acak) diperlakukan sebagai "Semua", supaya dropdown dan data yang
  // disaring selalu sepakat.
  const pick = (raw: string, allowed: { value: string }[]) =>
    allowed.some((option) => option.value === raw) ? raw : "";

  const current = {
    layanan: pick(firstParam(params.layanan), options.services),
    loket: pick(firstParam(params.loket), options.counters),
    rating: pick(firstParam(params.rating), RATING_OPTIONS.slice(1)),
  };

  const { stats, breakdown, reviews } = await getAdminReviews(agencyId, {
    serviceId: current.layanan ? Number(current.layanan) : null,
    counterId: current.loket ? Number(current.loket) : null,
    rating: current.rating ? (Number(current.rating) as RatingLevel) : null,
  });

  const hasFilter = Object.values(current).some(Boolean);

  return (
    <div className="flex flex-col gap-[35px]">
      <PageHeader
        title="Ulasan"
        description="Lihat penilaian dan masukan pengguna terhadap layanan"
      />

      <ReviewFilters
        serviceOptions={[{ value: "", label: "Semua Layanan" }, ...options.services]}
        counterOptions={[{ value: "", label: "Semua Loket" }, ...options.counters]}
        ratingOptions={RATING_OPTIONS}
        current={current}
      />

      <section
        className={`grid grid-cols-2 gap-6 p-6 sm:flex sm:flex-wrap sm:items-center sm:justify-around sm:px-[60px] sm:py-5 ${PANEL}`}
      >
        {stats.map((stat, index) => (
          <Fragment key={stat.label}>
            {index > 0 && (
              <span aria-hidden className="hidden h-[80px] w-0.5 bg-line lg:block" />
            )}
            <ReviewStat {...stat} />
          </Fragment>
        ))}
      </section>

      <div className="flex flex-col gap-[25px] lg:flex-row">
        <section
          className={`flex flex-col gap-[25px] p-6 sm:px-[30px] sm:py-5 lg:w-[380px] lg:shrink-0 ${PANEL}`}
        >
          <h2 className="font-display text-[22px] font-medium text-ink">
            Rating Layanan
          </h2>
          <div className="flex flex-col justify-center gap-5">
            {RATING_LEVELS.map((level) => (
              <RatingBar
                key={level}
                rating={level}
                percentage={breakdown[level] || 0}
              />
            ))}
          </div>
        </section>

        <section
          className={`flex flex-1 flex-col gap-[25px] p-6 sm:px-[30px] sm:py-5 ${PANEL}`}
        >
          <h2 className="font-display text-[22px] font-medium text-ink">
            Ulasan Terbaru
          </h2>
          {reviews.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-line px-6 py-12 text-center">
              <p className="font-display text-[18px] font-medium text-ink">
                {hasFilter ? "Tidak ada ulasan yang cocok" : "Belum ada ulasan"}
              </p>
              <p className="font-display text-[14px] text-queue-idle">
                {hasFilter
                  ? "Coba ubah atau reset filter layanan, loket, dan rating."
                  : "Ulasan warga akan muncul di sini setelah layanan diselesaikan dan dinilai."}
              </p>
            </div>
          ) : (
            reviews.map((review) => <ReviewCard key={review.id} {...review} />)
          )}
        </section>
      </div>
    </div>
  );
}
