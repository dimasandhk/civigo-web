import RatingFace from "./RatingFace";
import { RATINGS, ratingStars, type RatingLevel } from "./ratings";

export type RatingBarProps = {
  rating: RatingLevel;
  /** Share of all reviews sitting at this rating, 0-100. */
  percentage: number;
};

export default function RatingBar({ rating, percentage }: RatingBarProps) {
  return (
    <div className="flex items-center gap-2">
      <RatingFace rating={rating} />

      <div className="flex flex-col gap-[5px]">
        <span className="flex gap-2 font-display text-[14px] font-medium text-muted">
          {RATINGS[rating].label}
          <span>{ratingStars(rating)}</span>
        </span>

        <div className="flex items-center gap-2">
          <div aria-hidden className="h-1 w-[150px] rounded-[4px] bg-track">
            <div
              className="h-full rounded-[4px] bg-ink"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="font-display text-[10px] font-medium text-ink">
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
}
