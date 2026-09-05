import RatingFace from "./RatingFace";
import { RATINGS, ratingStars, type RatingLevel } from "./ratings";

export type ReviewCardProps = {
  rating: RatingLevel;
  comment: string;
  service: string;
  counter: string;
  /** Relative time the review came in, e.g. "5 menit lalu". */
  time: string;
};

export default function ReviewCard({
  rating,
  comment,
  service,
  counter,
  time,
}: ReviewCardProps) {
  return (
    <article className="flex flex-col gap-5 rounded-[10px] border border-board p-5 shadow-inset-soft">
      <div className="flex items-center gap-[15px]">
        <RatingFace rating={rating} size="sm" />
        <div className="flex flex-col gap-2">
          <span className="font-display text-[14px] font-medium text-muted">
            {RATINGS[rating].label}
          </span>
          <span className="font-display text-[16px] font-medium text-muted">
            {ratingStars(rating)}
          </span>
        </div>
      </div>

      <p className="font-display text-[18px] font-medium text-ink">{comment}</p>

      <div className="flex justify-between">
        <span className="font-display text-[14px] font-medium text-brand">
          {service}&nbsp;&nbsp;&bull;&nbsp;&nbsp;{counter}
        </span>
        <span className="font-display text-[14px] font-medium text-queue-idle">
          {time}
        </span>
      </div>
    </article>
  );
}
