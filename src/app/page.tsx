import { ReportForm } from '@/components/forms/ReportForm';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f3f4f6]">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 md:px-10">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8">
              <span className="absolute left-0 top-0 h-4 w-4 bg-municipality-green" />
              <span className="absolute bottom-0 right-0 h-4 w-4 bg-municipality-green" />
            </div>
            <p className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Coatepec Reporta
            </p>
          </div>
          <div className="hidden items-center gap-4 md:flex">
            <span className="text-lg text-slate-600">Bienvenido, Ciudadano</span>
            <div className="h-12 w-12 rounded-full border-2 border-rose-100 bg-[#f6ddd3]" />
          </div>
        </div>
      </header>

      <section className="px-4 py-8 md:py-14">
        <ReportForm />
      </section>
    </main>
  );
}
