import type { Metadata } from "next";
import { Fragment } from "react";
import FilterSelect from "../../components/FilterSelect";
import PageHeader from "../../components/admin/PageHeader";
import RatingBar from "../../components/admin/RatingBar";
import ReviewCard from "../../components/admin/ReviewCard";
import ReviewStat from "../../components/admin/ReviewStat";
import { RATINGS, RATING_LEVELS } from "../../components/admin/ratings";

import { getAdminReviews } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Ulasan — CiviGo",
};

const LAYANAN_OPTIONS = [
  "Semua Layanan",
  "Pembuatan KTP-el",
  "Aktivasi Identitas Kependudukan Digital",
  "Konsultasi Administrasi Kependudukan",
  "Layanan Administrasi Kependudukan",
];

const LOKET_OPTIONS = [
  "Semua Loket",
  "Loket 1",
  "Loket 2",
  "Loket 3",
  "Loket 4",
  "Loket 5",
];

const RATING_OPTIONS = [
  "Semua Rating",
  ...RATING_LEVELS.map((level) => RATINGS[level].label),
];

const PANEL = "rounded-[20px] bg-white shadow-soft";

export default async function UlasanPage() {
  const { stats, breakdown, reviews } = await getAdminReviews(1);
  return (
    <div className="flex flex-col gap-[35px]">
      <PageHeader
        title="Ulasan"
        description="Lihat penilaian dan masukan pengguna terhadap layanan"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap lg:justify-between lg:gap-5">
        <FilterSelect
          id="filter-layanan"
          label="Saring menurut layanan"
          options={LAYANAN_OPTIONS}
          containerClassName="w-full sm:w-auto sm:flex-1 min-w-[200px]"
        />
        <FilterSelect
          id="filter-loket"
          label="Saring menurut loket"
          options={LOKET_OPTIONS}
          containerClassName="w-full sm:w-auto sm:flex-1 min-w-[200px]"
        />
        <FilterSelect
          id="filter-rating"
          label="Saring menurut rating"
          options={RATING_OPTIONS}
          containerClassName="w-full sm:w-auto sm:flex-1 min-w-[200px]"
        />
      </div>

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
          {reviews.map((review) => (
            <ReviewCard key={review.id} {...review} />
          ))}
        </section>
      </div>
    </div>
  );
}
