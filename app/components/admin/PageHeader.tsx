export type PageHeaderProps = {
  title: string;
  description: string;
};

export default function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3">
      <h1 className="text-[28px] font-bold leading-6 text-ink">{title}</h1>
      <p className="text-[16px] font-semibold leading-6 text-muted">
        {description}
      </p>
    </header>
  );
}
