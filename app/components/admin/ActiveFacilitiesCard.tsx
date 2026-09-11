export type ActiveFacilitiesCardProps = {
  activeCounters: number;
  activeServices: number;
};

export default function ActiveFacilitiesCard({
  activeCounters,
  activeServices,
}: ActiveFacilitiesCardProps) {
  return (
    <div className="flex flex-1 items-center justify-around rounded-[15px] bg-white p-5 shadow-soft lg:max-w-[310px]">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-[15px] font-medium text-ink">Loket Aktif</span>
        <span className="font-display text-[36px] font-bold text-ink">
          {activeCounters}
        </span>
      </div>
      <div className="h-14 w-[1px] bg-line" />
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-[15px] font-medium text-ink">Layanan Aktif</span>
        <span className="font-display text-[36px] font-bold text-ink">
          {activeServices}
        </span>
      </div>
    </div>
  );
}
