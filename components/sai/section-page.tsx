type Props = {
  title: string;
  subtitle: string;
  description: string;
  children?: React.ReactNode;
};

export function SectionPage({ title, subtitle, description, children }: Props) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300/70">
          {subtitle}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">{description}</p>
      </header>
      {children}
    </div>
  );
}
