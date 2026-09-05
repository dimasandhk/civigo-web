import { RATINGS, type RatingLevel } from "./ratings";

export type RatingFaceSize = "sm" | "lg";

const SIZES: Record<RatingFaceSize, { box: string; icon: number }> = {
  sm: { box: "size-[45px]", icon: 30 },
  lg: { box: "size-[50px]", icon: 35 },
};

export type RatingFaceProps = {
  rating: RatingLevel;
  size?: RatingFaceSize;
};

export default function RatingFace({ rating, size = "lg" }: RatingFaceProps) {
  const { icon: Icon, className } = RATINGS[rating];
  const { box, icon } = SIZES[size];

  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-[10px] ${className} ${box}`}
    >
      <Icon size={icon} />
    </span>
  );
}
