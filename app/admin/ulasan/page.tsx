import type { Metadata } from "next";
import { Fragment } from "react";
import FilterSelect from "../../components/FilterSelect";
import PageHeader from "../../components/admin/PageHeader";
import RatingBar from "../../components/admin/RatingBar";
import ReviewCard, {
  type ReviewCardProps,
} from "../../components/admin/ReviewCard";
import ReviewStat, {
  type ReviewStatProps,
} from "../../components/admin/ReviewStat";
import {
  RATINGS,
  RATING_LEVELS,
  type RatingLevel,
} from "../../components/admin/ratings";

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
  "Loket 2",
  "Loket 3",
  "Loket 4",
  "Loket 5",
];

const RATING_OPTIONS = [
  "Semua Rating",
  ...RATING_LEVELS.map((level) => RATINGS[level].label),
];

const STATS: ReviewStatProps[] = [
  { label: "Total Ulasan", value: "500" },
  { label: "Rata-rata", value: "4.6", unit: "/5" },
  { label: "Sangat Puas", value: "78", unit: "%" },
  { label: "Bulan Ini", value: "4.8" },
];

/** Share of reviews per star count, in percent. */
const BREAKDOWN: Record<RatingLevel, number> = {
  5: 78,
  4: 14,
  3: 5,
  2: 2,
  1: 1,
};

const REVIEWS: (ReviewCardProps & { id: string })[] = [
  {
    id: "1",
    rating: 5,
    comment: "Pelayanannya sangat cepat dan petugasnya ramah.",
    service: "Pembuatan KTP-el",
    counter: "Loket 2",
    time: "5 menit lalu",
  },
  {
    id: "2",
    rating: 4,
    comment: "Pelayanannya sudah bagus dan cukup membantu",
    service: "Aktivasi Identitas Kependudukan Digital",
    counter: "Loket 3",
    time: "10 menit lalu",
  },
];

const PANEL = "rounded-[20px] bg-white shadow-soft";

export default function UlasanPage() {
  return (
    <div className="flex flex-col gap-[35px]">
      <PageHeader
        title="Ulasan"
        description="Lihat penilaian dan masukan pengguna terhadap layanan"
      />

      <div className="flex justify-between gap-5">
        <FilterSelect
          id="filter-layanan"
          label="Saring menurut layanan"
          options={LAYANAN_OPTIONS}
          containerClassName="w-[291px]"
        />
        <FilterSelect
          id="filter-loket"
          label="Saring menurut loket"
          options={LOKET_OPTIONS}
          containerClassName="w-[291px]"
        />
        <FilterSelect
          id="filter-rating"
          label="Saring menurut rating"
          options={RATING_OPTIONS}
          containerClassName="w-[291px]"
        />
      </div>

      <section
        className={`flex flex-wrap items-center justify-between px-[60px] py-5 ${PANEL}`}
      >
        {STATS.map((stat, index) => (
          <Fragment key={stat.label}>
            {index > 0 && (
              <span aria-hidden className="h-[100px] w-0.5 bg-line" />
            )}
            <ReviewStat {...stat} />
          </Fragment>
        ))}
      </section>

      <div className="flex gap-[25px]">
        <section
          className={`flex shrink-0 flex-col gap-[25px] px-[30px] py-5 ${PANEL}`}
        >
          <h2 className="font-display text-[22px] font-medium text-ink">
            Rating Layanan
          </h2>
          <div className="flex flex-col justify-center gap-5">
            {RATING_LEVELS.map((level) => (
              <RatingBar
                key={level}
                rating={level}
                percentage={BREAKDOWN[level]}
              />
            ))}
          </div>
        </section>

        <section
          className={`flex flex-1 flex-col gap-[25px] px-[30px] py-5 ${PANEL}`}
        >
          <h2 className="font-display text-[22px] font-medium text-ink">
            Ulasan Terbaru
          </h2>
          {REVIEWS.map((review) => (
            <ReviewCard key={review.id} {...review} />
          ))}
        </section>
      </div>
    </div>
  );
}
