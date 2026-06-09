import { existsSync } from "fs";
import { join } from "path";
import Image from "next/image";
import { BrandLogo } from "@/components/brand-logo";
import { primaryButtonClass, secondaryButtonClass } from "@/components/button-classes";
import { ComboCalculator } from "@/components/combo-calculator";
import { PriceCalculator } from "@/components/price-calculator";
import { WaitlistForm } from "@/components/waitlist-form";

const hasHeroImage = existsSync(join(process.cwd(), "public/images/hero-beauty.png"));
const hasLogoImage = existsSync(join(process.cwd(), "public/images/logo-margenia-nav.png"));

const pains = [
  "Vendes por Instagram o WhatsApp y no sabes cuánto dinero te queda.",
  "Armas combos al ojo y no sabes si ganas o pierdes.",
  "Das descuentos sin saber si afectan tu margen.",
  "Mezclas la plata del negocio con tus gastos personales.",
  "Tienes clientas pendientes por pagar y se te olvida cobrarles.",
  "Tienes productos quietos o agotados y no te das cuenta a tiempo.",
];

const benefits = [
  "Acceso anticipado al ecosistema Margenia antes del lanzamiento público.",
  "Precio fundador con beneficio especial por entrar primero.",
  "Primer acceso a funciones de inventario, caja, ventas, combos y utilidad real.",
  "Acompañamiento cercano para adaptar Margenia a negocios reales como el tuyo.",
  "Influencia directa en las próximas funciones de la plataforma.",
];

const ecosystemCards = [
  {
    title: "Precios rentables",
    text: "Calcula precios considerando costos, empaque, descuentos, envíos y comisiones.",
  },
  {
    title: "Combos inteligentes",
    text: "Crea promociones y kits sin perder margen.",
  },
  {
    title: "Inventario simple",
    text: "Controla qué tienes, qué se está agotando y qué productos no rotan.",
  },
  {
    title: "Caja y ventas",
    text: "Registra entradas, salidas y ventas diarias sin depender de cuadernos.",
  },
  {
    title: "Gastos del negocio",
    text: "Separa tus gastos personales de los gastos reales de tu emprendimiento.",
  },
  {
    title: "Utilidad real",
    text: "Entiende cuánto te queda después de costos, descuentos y comisiones.",
  },
];

type PreviewModule =
  | {
      variant: "stats";
      title: string;
      badge: string;
      stats: [string, string][];
      footnote: string;
    }
  | {
      variant: "rows";
      title: string;
      badge: string;
      rows: [string, string, string][];
    };

const previewModules: PreviewModule[] = [
  {
    variant: "stats",
    title: "Utilidad real",
    badge: "Preview",
    stats: [
      ["Ventas del mes", "$3.450.000"],
      ["Utilidad estimada", "$1.380.000"],
      ["Salud del negocio", "Rentable esta semana"],
    ],
    footnote: "4 cuentas por cobrar pendientes",
  },
  {
    variant: "rows",
    title: "Inventario",
    badge: "Próximamente",
    rows: [
      ["Pestañina viral", "3 disp.", "Stock bajo"],
      ["Labial nude", "18 disp.", "OK"],
      ["Shampoo reparación", "0 disp.", "Agotado"],
    ],
  },
  {
    variant: "stats",
    title: "Caja",
    badge: "Beta",
    stats: [
      ["Ingresos del día", "$420.000"],
      ["Gastos del día", "$86.000"],
      ["Saldo estimado", "$334.000"],
    ],
    footnote: "Últimos movimientos listos para revisar",
  },
  {
    variant: "rows",
    title: "Combos",
    badge: "Concepto",
    rows: [
      ["Kit glow", "$89.900", "49% margen"],
      ["Crema facial", "$32.500", "Rentable"],
      ["Combo capilar", "$79.900", "Combo OK"],
    ],
  },
];

const socialLinks = [
  { label: "Instagram", href: "https://instagram.com/margenia.app", external: true },
  { label: "TikTok", href: "#" },
  { label: "WhatsApp", href: "#" },
  { label: "Correo", href: "mailto:hola@margenia.com" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#1f2937]">
      <Hero />
      <PainSection />
      <EcosystemPreviewSection />
      <EcosystemSection />
      <section
        id="calculadora"
        className="border-y border-[#e5e7eb] bg-white px-5 py-14 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#7c3aed]">
              Calcula antes de vender
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Empieza con la primera herramienta gratuita de Margenia
            </h2>
            <p className="mt-4 text-base leading-7 text-[#625862]">
              Antes de construir todo el ecosistema, queremos ayudarte con uno
              de los dolores más comunes: saber si tus productos y combos
              realmente dejan ganancia.
            </p>
          </div>
          <div className="mt-9 grid gap-6 lg:grid-cols-2">
            <PriceCalculator />
            <ComboCalculator />
          </div>
        </div>
      </section>
      <WaitlistForm />
      <FounderBeta />
      <Footer />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative min-h-[92svh] overflow-hidden px-5 py-5 sm:px-6 lg:px-8">
      {hasHeroImage ? (
        <Image
          src="/images/hero-beauty.png"
          alt="Productos de belleza y una pantalla con cálculos de rentabilidad"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_18%,#ddd6fe_0,#ddd6fe00_34%),linear-gradient(135deg,#ffffff_0%,#f8fafc_45%,#ede9fe_100%)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/78 to-[#f8fafc]/96 sm:bg-gradient-to-r sm:from-white/94 sm:via-white/78 sm:to-white/28" />
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-3 py-4 sm:py-5">
        <a href="#" className="flex min-w-0 items-center gap-3">
          <BrandLogo showImage={hasLogoImage} />
          <span className="hidden shrink-0 rounded-full border border-[#ddd6fe] bg-white/85 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#5b21b6] shadow-sm backdrop-blur sm:inline-flex">
            Beauty Beta
          </span>
        </a>
        <div className="flex shrink-0 items-center gap-4">
          <a
            href="https://instagram.com/margenia.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-sm font-bold text-[#5b21b6] transition hover:text-[#7c3aed] sm:inline-flex"
          >
            Instagram
          </a>
          <a
            href="#beta"
            className="rounded-full bg-white/90 px-4 py-2.5 text-sm font-black text-[#5b21b6] shadow-sm ring-1 ring-[#d1d5db] backdrop-blur transition-all duration-300 hover:bg-[#f5f3ff] hover:ring-[#c4b5fd] sm:px-5 sm:py-3"
          >
            Ser fundadora
          </a>
        </div>
      </nav>
      <div className="relative z-10 mx-auto flex min-h-[78svh] max-w-6xl items-center">
        <div className="max-w-3xl pt-12">
          <p className="inline-flex rounded-full bg-[#ede9fe]/90 px-4 py-2 text-sm font-bold text-[#5b21b6]">
            Calculadora gratis para emprendedoras de belleza
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.03] text-[#111827] sm:text-6xl">
            Deja de manejar tu negocio a ciegas
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#4b5563] sm:text-xl">
            Margenia nace como un ecosistema para ayudarte a controlar precios,
            combos, inventario, caja, ventas y utilidad real desde un solo
            lugar. Empieza gratis con nuestra calculadora para emprendedoras de
            belleza.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#calculadora"
              className={primaryButtonClass}
            >
              Calcular mi precio gratis
            </a>
            <a
              href="#lista-espera"
              className={secondaryButtonClass}
            >
              Unirme a la beta
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function PainSection() {
  return (
    <section className="bg-[#f8fafc] px-5 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#7c3aed]">
            Lo que pasa todos los días
          </p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            Vender mucho no siempre significa ganar bien.
          </h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pains.map((pain, index) => (
            <article
              key={pain}
              className="rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ede9fe] text-sm font-black text-[#6d28d9]">
                {index + 1}
              </span>
              <p className="mt-4 text-base leading-7 text-[#4b5563]">{pain}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function EcosystemPreviewSection() {
  return (
    <section className="overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_52%,#f5f3ff_100%)] px-5 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#7c3aed]">
              Lo que estamos construyendo
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#111827] sm:text-5xl">
              Controla lo que vendes, lo que gastas y lo que realmente ganas
            </h2>
            <p className="mt-5 text-base leading-7 text-[#4b5563] sm:text-lg">
              Empieza hoy organizando tus precios y combos con nuestra
              herramienta gratuita. Mientras tanto, estamos construyendo el
              ecosistema Margenia: una plataforma para que puedas visualizar
              inventario, caja, ventas, gastos, pagos pendientes y utilidad real
              desde un solo lugar.
            </p>
            <p className="mt-4 text-base leading-7 text-[#625862]">
              Estamos diseñando cada módulo a partir de los problemas reales que
              viven las emprendedoras: cuentas en cuadernos, productos sin
              control, pagos pendientes, combos hechos al ojo y dinero que entra
              pero no siempre se ve reflejado en la ganancia.
            </p>
            <p className="mt-6 inline-flex rounded-full border border-[#ddd6fe] bg-[#f5f3ff] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#6d28d9]">
              Vista previa conceptual. Algunas funciones aún están en desarrollo y se integrarán de forma progresiva en Margenia.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/70 p-3 shadow-2xl shadow-[#7c3aed]/15 ring-1 ring-[#ddd6fe]/70 backdrop-blur sm:p-4">
            <div className="rounded-[22px] border border-[#eef2f7] bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-4 border-b border-[#eef2f7] pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7c3aed]">
                    Margenia OS
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#111827] sm:text-sm">
                    Panel conceptual de tu negocio
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[linear-gradient(135deg,#4f46e5_0%,#7c3aed_55%,#c026d3_100%)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-md shadow-[#7c3aed]/20">
                  Beta futura
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {previewModules.map((module) => (
                  <article
                    key={module.title}
                    className="rounded-2xl border border-[#e5e7eb] bg-[linear-gradient(180deg,#ffffff_0%,#fbfbff_100%)] p-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#c4b5fd] hover:shadow-lg hover:shadow-[#7c3aed]/10 sm:p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="truncate text-base font-black text-[#111827] sm:text-lg">
                        {module.title}
                      </h3>
                      <span className="shrink-0 rounded-full bg-[#ede9fe] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#6d28d9] sm:text-[10px]">
                        {module.badge}
                      </span>
                    </div>

                    {module.variant === "stats" ? (
                      <div className="mt-4 space-y-3">
                        {module.stats.map(([label, value]) => (
                          <div
                            key={label}
                            className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-[#eef2f7]"
                          >
                            <span className="text-xs font-bold leading-5 text-[#6b7280]">
                              {label}
                            </span>
                            <span className="text-right text-sm font-black text-[#111827]">
                              {value}
                            </span>
                          </div>
                        ))}
                        <p className="rounded-xl bg-[#fef3c7] px-3 py-2 text-xs font-black leading-5 text-[#92400e]">
                          {module.footnote}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2">
                        {module.rows.map(([name, value, status]) => (
                          <div
                            key={name}
                            className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-[#eef2f7]"
                          >
                            <span className="truncate text-xs font-black text-[#111827]">
                              {name}
                            </span>
                            <span className="text-xs font-bold text-[#6b7280]">
                              {value}
                            </span>
                            <span className="col-span-2 rounded-full bg-[#f5f3ff] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.04em] text-[#6d28d9]">
                              {status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EcosystemSection() {
  return (
    <section className="bg-white px-5 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#7c3aed]">
            Lo que estamos construyendo
          </p>
          <h2 className="mt-3 text-3xl font-bold text-[#111827] sm:text-4xl">
            Un ecosistema para controlar tu negocio con claridad
          </h2>
          <p className="mt-4 text-base leading-7 text-[#625862]">
            Cada módulo responde a un problema concreto del día a día: vender
            con margen, cuidar tu inventario, ordenar la caja y entender la
            utilidad que realmente queda.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ecosystemCards.map((card, index) => (
            <article
              key={card.title}
              className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#c4b5fd] hover:bg-white hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#4f46e5_0%,#7c3aed_55%,#c026d3_100%)] text-sm font-black text-white shadow-md shadow-[#7c3aed]/20">
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-black text-[#111827]">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#4b5563]">
                {card.text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FounderBeta() {
  return (
    <section id="beta" className="bg-[#111827] px-5 py-14 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c4b5fd]">
            PREVENTA
          </p>
          <h2 className="mt-3 text-3xl font-black sm:text-5xl">
            Beta Fundadoras
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#f6e8ef]">
            Únete al grupo de fundadoras y entra antes que nadie al ecosistema
            Margenia. Estamos creando una plataforma para que emprendedoras
            puedan controlar precios, ventas, inventario, caja, combos, gastos
            y utilidad real desde un solo lugar.
          </p>
          <div className="mt-7 inline-flex rounded-full bg-white px-5 py-3 text-xl font-black text-[#6d28d9]">
            Precio especial de fundadora: &#36;49.900 COP por 3 meses
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 text-[#1f2937]">
          <ul className="space-y-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex gap-3 text-base">
                <span className="mt-1 h-3 w-3 rounded-full bg-[#7c3aed]" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
          <a
            href="?intent=fundadora#lista-espera"
            className={`mt-7 block ${primaryButtonClass}`}
          >
            Quiero mi acceso fundador
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#e5e7eb] bg-white px-5 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-start">
          <div className="max-w-2xl">
            <p className="text-2xl font-black tracking-tight text-[#111827]">
              Margenia
            </p>
            <p className="mt-4 text-xl font-black leading-8 text-[#1f2937]">
              Hecha con amor para quienes están construyendo su negocio desde
              cero.
            </p>
            <p className="mt-3 text-base leading-7 text-[#6b7280]">
              Un ecosistema para vender con más claridad, calcular mejor tus
              precios y entender cuánto estás ganando realmente.
            </p>
          </div>

          <nav
            aria-label="Redes sociales"
            className="flex flex-wrap gap-3 md:justify-end"
          >
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className="rounded-full bg-[#f9fafb] px-4 py-2 text-sm font-bold text-[#374151] ring-1 ring-[#e5e7eb] transition-all duration-300 ease-out hover:bg-[#f5f3ff] hover:text-[#6d28d9] hover:ring-[#c4b5fd]"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-[#e5e7eb] pt-6 text-sm text-[#6b7280] sm:flex-row sm:items-center sm:justify-between">
          <p>Primera versión en beta para emprendedoras de belleza.</p>
          <p>© 2026 Margenia. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
