import {
  FaceAngry,
  FaceExpressionless,
  FaceGrinning,
  FaceSlightlyFrowning,
  FaceSlightlySmiling,
  type LucideIcon,
} from "lucide-react";

/** Star count of a review, which also keys its label, face and colours. */
export type RatingLevel = 1 | 2 | 3 | 4 | 5;

export const RATINGS: Record<
  RatingLevel,
  { label: string; icon: LucideIcon; className: string }
> = {
  5: {
    label: "Sangat Puas",
    icon: FaceGrinning,
    className: "bg-rating-5-soft text-rating-5",
  },
  4: {
    label: "Puas",
    icon: FaceSlightlySmiling,
    className: "bg-rating-4-soft text-rating-4",
  },
  3: {
    label: "Cukup",
    icon: FaceExpressionless,
    className: "bg-rating-3-soft text-rating-3",
  },
  2: {
    label: "Tidak Puas",
    icon: FaceSlightlyFrowning,
    className: "bg-rating-2-soft text-rating-2",
  },
  1: {
    label: "Sangat Tidak Puas",
    icon: FaceAngry,
    className: "bg-rating-1-soft text-rating-1",
  },
};

/** Best first — the order both the breakdown and the rating filter follow. */
export const RATING_LEVELS: RatingLevel[] = [5, 4, 3, 2, 1];

export const ratingStars = (rating: RatingLevel) => "⭐ ".repeat(rating).trim();
