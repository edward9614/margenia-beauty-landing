import { existsSync } from "fs";
import { join } from "path";
import type { ReactNode } from "react";
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

const dashboardStats = [
  ["Ventas", "$3.450.000"],
  ["Gastos", "$420.000"],
  ["Por cobrar", "4 clientas"],
];

const inventoryRows = [
  ["Pestañina viral", "3 disp.", "Stock bajo"],
  ["Labial nude", "18 disp.", "OK"],
  ["Shampoo reparación", "0 disp.", "Agotado"],
];

const cashMovements = [
  ["Venta skincare", "+$120.000"],
  ["Empaques", "-$35.000"],
  ["Abono Natalia", "+$50.000"],
];

const comboBreakdown = [
  ["Costo", "$45.000"],
  ["Ganancia estimada", "$44.900"],
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
    <section className="relative overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_28%,#ede9fe_64%,#faf5ff_100%)] px-5 py-12 sm:px-6 lg:px-8 lg:py-10">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(124,58,237,0.07)_1px,transparent_1px),linear-gradient(180deg,rgba(124,58,237,0.07)_1px,transparent_1px)] bg-[size:58px_58px] opacity-40" />
      <div className="absolute inset-x-0 top-1/3 h-72 bg-[linear-gradient(90deg,rgba(79,70,229,0)_0%,rgba(124,58,237,0.18)_42%,rgba(192,38,211,0.14)_58%,rgba(79,70,229,0)_100%)] blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[0.4fr_0.6fr] lg:items-center">
          <div className="max-w-xl lg:max-w-none">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#7c3aed]">
              Margenia está tomando forma
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#111827] sm:text-4xl lg:text-5xl">
              El control que tu negocio necesitaba está naciendo aquí
            </h2>
            <p className="mt-5 text-base leading-7 text-[#4b5563] sm:text-lg">
              Empezamos ayudándote a calcular precios y combos rentables. Ahora
              estamos desarrollando un ecosistema para que puedas ver tus
              ventas, inventario, caja, gastos, pagos pendientes y utilidad real
              con la claridad que tu negocio merece.
            </p>
            <p className="mt-5 rounded-2xl border border-[#ddd6fe] bg-white/75 px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-[#6d28d9] shadow-sm backdrop-blur">
              Vista previa conceptual. Algunas funciones están en desarrollo y
              se integrarán progresivamente en Margenia.
            </p>
          </div>

          <div className="-mx-5 overflow-x-auto px-5 pb-7 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:h-[560px] lg:overflow-visible lg:pb-0">
            <div className="relative flex min-w-max items-center gap-5 px-1 [perspective:1200px] [perspective-origin:center_center] [transform-style:preserve-3d] sm:justify-center lg:h-full lg:min-w-0 lg:block lg:px-0">
              <div className="absolute bottom-12 left-1/2 hidden h-16 w-[72%] -translate-x-1/2 rounded-[999px] bg-[linear-gradient(90deg,rgba(79,70,229,0.12),rgba(124,58,237,0.18),rgba(192,38,211,0.11))] blur-3xl lg:block" />
              <PhoneMockup
                title="Resumen"
                badge="Preview"
                featured
                side="both"
                className="lg:absolute lg:left-1/2 lg:top-0 lg:z-40 lg:[transform:translateX(-50%)_rotateY(-1deg)_rotateX(1deg)_translateZ(64px)_scale(0.96)]"
              >
                <DashboardScreen />
              </PhoneMockup>
              <PhoneMockup
                title="Inventario"
                badge="Próximamente"
                side="right"
                className="lg:absolute lg:left-[-2%] lg:top-32 lg:z-20 lg:[transform:rotateY(8deg)_rotateX(2deg)_rotateZ(-3deg)_translateZ(2px)_scale(0.72)]"
              >
                <InventoryScreen />
              </PhoneMockup>
              <PhoneMockup
                title="Caja"
                badge="Beta"
                side="left"
                className="lg:absolute lg:left-[46%] lg:top-52 lg:z-10 lg:opacity-90 lg:[transform:rotateY(-4deg)_rotateX(1deg)_translateZ(-12px)_scale(0.62)]"
              >
                <CashScreen />
              </PhoneMockup>
              <PhoneMockup
                title="Combos"
                badge="Concepto"
                side="left"
                className="lg:absolute lg:right-[-2%] lg:top-32 lg:z-20 lg:[transform:rotateY(-8deg)_rotateX(2deg)_rotateZ(3deg)_translateZ(2px)_scale(0.72)]"
              >
                <CombosScreen />
              </PhoneMockup>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PhoneMockup({
  title,
  badge,
  children,
  featured = false,
  side = "both",
  className = "",
}: {
  title: string;
  badge: string;
  children: ReactNode;
  featured?: boolean;
  side?: "left" | "right" | "both";
  className?: string;
}) {
  const showLeftSide = side === "left" || side === "both";
  const showRightSide = side === "right" || side === "both";

  return (
    <article
      className={`relative w-[238px] shrink-0 rounded-[2.45rem] [transform-style:preserve-3d] [will-change:transform] ${featured ? "sm:w-[292px]" : "sm:w-[245px]"} ${className}`}
    >
      {featured ? (
        <div className="absolute -inset-7 -z-10 bg-[linear-gradient(135deg,rgba(79,70,229,0.2),rgba(124,58,237,0.2),rgba(192,38,211,0.15))] blur-3xl" />
      ) : null}
      <div className="absolute inset-x-5 bottom-[-18px] h-10 rounded-[999px] bg-[rgba(17,24,39,0.22)] blur-2xl lg:[transform:translateZ(-22px)]" />
      <div className="relative rounded-[2.35rem] bg-[linear-gradient(145deg,#030712_0%,#111827_46%,#374151_100%)] p-2 shadow-[0_34px_78px_rgba(17,24,39,0.24),0_14px_32px_rgba(124,58,237,0.15)] ring-1 ring-white/70 lg:[transform:translateZ(18px)]">
        <div className="absolute inset-0 -z-10 rounded-[2.35rem] bg-[#030712] opacity-60 lg:[transform:translate3d(7px,10px,-12px)]" />
        <div
          className={`pointer-events-none absolute inset-y-7 -left-1.5 w-3 rounded-l-[2rem] bg-[linear-gradient(180deg,#374151_0%,#111827_48%,#030712_100%)] shadow-[inset_2px_0_5px_rgba(255,255,255,0.08)] ${showLeftSide ? "opacity-90" : "opacity-25"}`}
        />
        <div
          className={`pointer-events-none absolute inset-y-7 -right-1.5 w-3 rounded-r-[2rem] bg-[linear-gradient(180deg,#111827_0%,#374151_42%,#030712_100%)] shadow-[inset_-2px_0_5px_rgba(255,255,255,0.08)] ${showRightSide ? "opacity-90" : "opacity-25"}`}
        />
        <div className="pointer-events-none absolute inset-1 rounded-[2rem] ring-1 ring-white/10" />
        <div className="relative z-10 aspect-[9/19] overflow-hidden rounded-[1.82rem] bg-[#f8fafc] ring-1 ring-white/20">
          <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-[#111827] shadow-sm">
            <span className="absolute right-3 top-1.5 h-2 w-2 rounded-full bg-[#374151]" />
          </div>
          <div className="flex items-center justify-between px-5 pt-8 text-[10px] font-black text-[#111827]">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-3 rounded-full bg-[#111827]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#111827]" />
            </div>
          </div>
          <div className="flex items-center justify-between px-5 pt-5">
            <h3 className="text-lg font-black text-[#111827]">{title}</h3>
            <span className="rounded-full bg-[#ede9fe] px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-[#6d28d9]">
              {badge}
            </span>
          </div>
          <div className="px-5 pb-16 pt-4">{children}</div>
          <BottomNav />
        </div>
      </div>
    </article>
  );
}

function DashboardScreen() {
  return (
    <div>
      <p className="text-sm font-bold text-[#6b7280]">Hola, Laura</p>
      <div className="mt-3 rounded-3xl bg-[linear-gradient(135deg,#4f46e5_0%,#7c3aed_55%,#c026d3_100%)] p-4 text-white shadow-lg shadow-[#7c3aed]/25">
        <p className="text-xs font-bold opacity-85">Utilidad estimada</p>
        <p className="mt-2 text-2xl font-black">$1.380.000</p>
      </div>
      <div className="mt-3 grid gap-2">
        {dashboardStats.map(([label, value]) => (
          <MiniStatCard key={label} label={label} value={value} />
        ))}
      </div>
      <MiniChart />
    </div>
  );
}

function InventoryScreen() {
  return (
    <div>
      <div className="rounded-full bg-white px-3 py-2 text-xs font-bold text-[#9ca3af] ring-1 ring-[#e5e7eb]">
        Buscar producto
      </div>
      <div className="mt-4 space-y-2">
        {inventoryRows.map(([name, amount, status]) => (
          <MiniRow key={name} label={name} value={amount} status={status} />
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-[#faf5ff] p-3 ring-1 ring-[#ddd6fe]">
        <p className="text-xs font-bold text-[#6b7280]">Dinero quieto</p>
        <p className="mt-1 text-lg font-black text-[#6d28d9]">$420.000</p>
      </div>
    </div>
  );
}

function CashScreen() {
  return (
    <div>
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-[#e5e7eb]">
        <p className="text-xs font-bold text-[#6b7280]">Saldo del día</p>
        <p className="mt-2 text-2xl font-black text-[#111827]">$334.000</p>
      </div>
      <div className="mt-4 space-y-2">
        {cashMovements.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-2xl bg-white px-3 py-2.5 ring-1 ring-[#e5e7eb]"
          >
            <span className="text-xs font-black text-[#111827]">{label}</span>
            <span className={`text-xs font-black ${value.startsWith("+") ? "text-[#047857]" : "text-[#b91c1c]"}`}>
              {value}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-full bg-[#111827] px-4 py-3 text-center text-xs font-black text-white">
        + Registrar movimiento
      </div>
    </div>
  );
}

function CombosScreen() {
  return (
    <div>
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-[#e5e7eb]">
        <p className="text-sm font-black text-[#111827]">Kit glow</p>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold text-[#6b7280]">Precio sugerido</p>
            <p className="mt-1 text-2xl font-black text-[#111827]">$89.900</p>
          </div>
          <span className="rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-black text-[#047857]">
            49%
          </span>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {comboBreakdown.map(([label, value]) => (
          <MiniStatCard key={label} label={label} value={value} />
        ))}
      </div>
      <p className="mt-4 rounded-2xl bg-[#ecfdf5] px-3 py-2 text-center text-xs font-black text-[#047857] ring-1 ring-[#bbf7d0]">
        Combo rentable
      </p>
    </div>
  );
}

function MiniStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2.5 ring-1 ring-[#e5e7eb]">
      <span className="text-xs font-bold text-[#6b7280]">{label}</span>
      <span className="text-xs font-black text-[#111827]">{value}</span>
    </div>
  );
}

function MiniRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: string;
}) {
  const isLow = status === "Stock bajo";
  const isOut = status === "Agotado";

  return (
    <div className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-[#e5e7eb]">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-black text-[#111827]">{label}</span>
        <span className="shrink-0 text-xs font-bold text-[#6b7280]">{value}</span>
      </div>
      <span
        className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.04em] ${
          isOut
            ? "bg-[#fee2e2] text-[#b91c1c]"
            : isLow
              ? "bg-[#fef3c7] text-[#92400e]"
              : "bg-[#dcfce7] text-[#047857]"
        }`}
      >
        {status}
      </span>
    </div>
  );
}

function MiniChart() {
  const bars = ["h-8", "h-12", "h-10", "h-16", "h-14", "h-20"];

  return (
    <div className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-[#e5e7eb]">
      <div className="flex h-24 items-end gap-2">
        {bars.map((height, index) => (
          <span
            key={`${height}-${index}`}
            className={`${height} flex-1 rounded-t-full bg-[linear-gradient(180deg,#c026d3_0%,#7c3aed_55%,#4f46e5_100%)]`}
          />
        ))}
      </div>
    </div>
  );
}

function BottomNav() {
  return (
    <div className="absolute inset-x-5 bottom-4 rounded-full bg-white/90 px-4 py-3 shadow-lg shadow-[#111827]/5 ring-1 ring-[#e5e7eb] backdrop-blur">
      <div className="flex items-center justify-between">
        {[0, 1, 2, 3].map((item) => (
          <span
            key={item}
            className={`h-2.5 w-2.5 rounded-full ${item === 0 ? "bg-[#7c3aed]" : "bg-[#d1d5db]"}`}
          />
        ))}
      </div>
    </div>
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
