import { existsSync } from "fs";
import { join } from "path";
import Image from "next/image";
import { BrandLogo } from "@/components/brand-logo";
import { primaryButtonClass, secondaryButtonClass } from "@/components/button-classes";
import { InteractiveCalculator } from "@/components/interactive-calculator";
import { TrackedLink } from "@/components/tracked-link";
import { WaitlistForm } from "@/components/waitlist-form";

const hasLogoImage = existsSync(join(process.cwd(), "public/images/logo-margenia-nav.png"));

const pains = [
  "Vendes por Instagram o WhatsApp y no sabes cuánto dinero te queda.",
  "Armas combos al ojo y no sabes si ganas o pierdes.",
  "Das descuentos sin saber si afectan tu margen.",
  "Mezclas la plata del negocio con tus gastos personales.",
  "Tienes clientes pendientes por pagar y se te olvida cobrarles.",
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

const socialLinks = [
  { label: "Instagram", href: "https://instagram.com/margenia.app", external: true },
  { label: "TikTok", href: "#" },
  { label: "WhatsApp", href: "#" },
  { label: "Correo", href: "mailto:hola@margenia.com" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#0F172A]">
      <Hero />
      <PainSection />
      <EcosystemPreviewSection />
      <EcosystemSection />
      <section
        id="calculadora"
        className="border-y border-[#E2E8F0] bg-white px-5 py-14 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#2563EB]">
              Primera herramienta gratuita
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Calcula cuánto deberías cobrar para ganar de verdad
            </h2>
            <p className="mt-4 text-base leading-7 text-[#475569]">
              Configura tus costos, descuentos y margen deseado. Margenia te
              muestra al instante si tu precio es rentable.
            </p>
            <p className="mt-3 text-sm font-bold text-[#2563EB]">
              Esta calculadora es el primer paso del ecosistema Margenia para
              ayudarte a vender con más claridad.
            </p>
          </div>
          <div className="mt-9">
            <InteractiveCalculator />
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,#E0F7FA_0%,transparent_32%),radial-gradient(circle_at_20%_80%,#DBEAFE_0%,transparent_34%),linear-gradient(135deg,#FFFFFF_0%,#F8FAFC_48%,#EFF6FF_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#E2E8F0_1px,transparent_1px),linear-gradient(to_bottom,#E2E8F0_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
      <div className="absolute right-[-10rem] top-20 h-80 w-80 rounded-full bg-[#06B6D4]/10 blur-3xl" />
      <div className="absolute bottom-10 left-[-8rem] h-72 w-72 rounded-full bg-[#2563EB]/10 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/88 via-white/70 to-[#f8fafc]/96 sm:bg-gradient-to-r sm:from-white/92 sm:via-white/72 sm:to-white/20" />
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-3 py-4 sm:py-5">
        <a href="#" className="flex min-w-0 items-center gap-3">
          <BrandLogo showImage={hasLogoImage} />
          <span className="hidden shrink-0 rounded-full border border-[#BFDBFE] bg-white/85 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#2563EB] shadow-sm backdrop-blur sm:inline-flex">
            Beta
          </span>
        </a>
        <div className="flex shrink-0 items-center gap-4">
          <TrackedLink
            href="https://instagram.com/margenia.app"
            target="_blank"
            rel="noopener noreferrer"
            events={[
              {
                name: "click_instagram",
                params: { location: "navbar", cta_text: "Instagram" },
              },
            ]}
            className="hidden text-sm font-bold text-[#2563EB] transition hover:text-[#1D4ED8] sm:inline-flex"
          >
            Instagram
          </TrackedLink>
          <TrackedLink
            href="#beta"
            events={[
              {
                name: "click_beta",
                params: { location: "navbar", cta_text: "Ser fundador" },
              },
              {
                name: "click_fundadora",
                params: { location: "navbar", cta_text: "Ser fundador" },
              },
            ]}
            className="rounded-full bg-white/90 px-4 py-2.5 text-sm font-black text-[#2563EB] shadow-sm ring-1 ring-[#E2E8F0] backdrop-blur transition-all duration-300 hover:bg-[#EFF6FF] hover:text-[#1D4ED8] hover:ring-[#BFDBFE] sm:px-5 sm:py-3"
          >
            Ser fundador
          </TrackedLink>
        </div>
      </nav>
      <div className="relative z-10 mx-auto flex min-h-[78svh] max-w-6xl items-center">
        <div className="max-w-3xl pt-12">
          <p className="inline-flex rounded-full bg-[#EFF6FF]/90 px-4 py-2 text-sm font-bold text-[#2563EB]">
            Primera herramienta gratuita de Margenia
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.03] text-[#0F172A] sm:text-6xl">
            Deja de manejar tu negocio a ciegas
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#475569] sm:text-xl">
            Margenia te ayuda a calcular precios, crear combos rentables y
            entender cuánto estás ganando realmente. Estamos construyendo un
            ecosistema para controlar ventas, inventario, caja, pagos pendientes
            y utilidad real desde un solo lugar.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <TrackedLink
              href="#calculadora"
              events={[
                {
                  name: "click_calculadora",
                  params: {
                    location: "hero",
                    cta_text: "Calcular mi precio gratis",
                  },
                },
              ]}
              className={primaryButtonClass}
            >
              Calcular mi precio gratis
            </TrackedLink>
            <TrackedLink
              href="#beta"
              events={[
                {
                  name: "click_beta",
                  params: { location: "hero", cta_text: "Unirme a la beta" },
                },
              ]}
              className={secondaryButtonClass}
            >
              Unirme a la beta
            </TrackedLink>
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
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#2563EB]">
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
              className="rounded-lg border border-[#E2E8F0] bg-white p-5 shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF6FF] text-sm font-black text-[#2563EB]">
                {index + 1}
              </span>
              <p className="mt-4 text-base leading-7 text-[#475569]">{pain}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function EcosystemPreviewSection() {
  return (
    <section className="bg-[#f8fafc] px-5 py-10 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-6xl overflow-hidden lg:min-h-[500px]">
        <Image
          src="/images/margenia-showcase.png"
          alt="Vista conceptual del ecosistema Margenia en dispositivos móviles"
          fill
          sizes="(min-width: 1024px) 1152px, 100vw"
          className="hidden object-cover object-right lg:block"
          priority={false}
        />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-[#f8fafc] via-[#f8fafc]/90 to-transparent lg:block" />

        <div className="relative z-10 lg:flex lg:min-h-[500px] lg:items-center">
          <div className="max-w-lg">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#2563EB]">
              Margenia está tomando forma
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#0F172A] sm:text-4xl lg:text-[2.8rem]">
              El control que tu negocio necesitaba está naciendo aquí
            </h2>
            <p className="mt-5 text-base leading-7 text-[#475569] sm:text-lg">
              Empezamos ayudándote a calcular precios y combos rentables. Ahora
              estamos desarrollando un ecosistema para que puedas ver tus ventas,
              inventario, caja, gastos, pagos pendientes y utilidad real con la
              claridad que tu negocio merece.
            </p>
            <p className="mt-5 rounded-2xl border border-[#BFDBFE] bg-white/75 px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-[#2563EB] backdrop-blur">
              Vista previa conceptual. Algunas funciones están en desarrollo y se
              integrarán progresivamente en Margenia.
            </p>
          </div>
        </div>

        <div className="relative mt-5 h-[280px] overflow-hidden rounded-[28px] sm:h-[320px] lg:hidden">
          <Image
            src="/images/margenia-showcase.png"
            alt="Vista conceptual del ecosistema Margenia en dispositivos móviles"
            fill
            sizes="100vw"
            className="object-cover object-[74%_center]"
            priority={false}
          />
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
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#2563EB]">
            Lo que estamos construyendo
          </p>
          <h2 className="mt-3 text-3xl font-bold text-[#0F172A] sm:text-4xl">
            Un ecosistema para controlar tu negocio con claridad
          </h2>
          <p className="mt-4 text-base leading-7 text-[#475569]">
            Cada módulo responde a un problema concreto del día a día: vender
            con margen, cuidar tu inventario, ordenar la caja y entender la
            utilidad que realmente queda.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ecosystemCards.map((card, index) => (
            <article
              key={card.title}
              className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#BFDBFE] hover:bg-white hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#06B6D4_100%)] text-sm font-black text-white shadow-md shadow-[#2563EB]/20">
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-black text-[#0F172A]">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#475569]">
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
    <section id="beta" className="bg-[#0F172A] px-5 py-14 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#BFDBFE]">
            PREVENTA
          </p>
          <h2 className="mt-3 text-3xl font-black sm:text-5xl">
            Beta Fundadores
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#CBD5E1]">
            Únete al grupo fundador y entra antes que nadie al ecosistema
            Margenia. Estamos creando una plataforma para que emprendedores
            puedan controlar precios, ventas, inventario, caja, combos, gastos
            y utilidad real desde un solo lugar.
          </p>
          <div className="mt-7 inline-flex rounded-full bg-white px-5 py-3 text-xl font-black text-[#2563EB]">
            Precio especial de fundador: &#36;49.900 COP por 3 meses
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 text-[#0F172A]">
          <ul className="space-y-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex gap-3 text-base">
                <span className="mt-1 h-3 w-3 rounded-full bg-[#2563EB]" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
          <TrackedLink
            href="?intent=fundadora#lista-espera"
            events={[
              {
                name: "click_beta",
                params: {
                  location: "founder_beta",
                  cta_text: "Quiero mi acceso fundador",
                },
              },
              {
                name: "click_fundadora",
                params: {
                  location: "founder_beta",
                  cta_text: "Quiero mi acceso fundador",
                },
              },
            ]}
            className={`mt-7 block ${primaryButtonClass}`}
          >
            Quiero mi acceso fundador
          </TrackedLink>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#E2E8F0] bg-white px-5 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-start">
          <div className="max-w-2xl">
            <p className="text-2xl font-black tracking-tight text-[#0F172A]">
              Margenia
            </p>
            <p className="mt-4 text-xl font-black leading-8 text-[#0F172A]">
              Hecha con amor para quienes están construyendo su negocio desde
              cero.
            </p>
            <p className="mt-3 text-base leading-7 text-[#475569]">
              Un ecosistema para vender con más claridad, calcular mejor tus
              precios y entender cuánto estás ganando realmente.
            </p>
          </div>

          <nav
            aria-label="Redes sociales"
            className="flex flex-wrap gap-3 md:justify-end"
          >
            {socialLinks.map((link) =>
              link.label === "Instagram" ? (
                <TrackedLink
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  events={[
                    {
                      name: "click_instagram",
                      params: { location: "footer", cta_text: "Instagram" },
                    },
                  ]}
                  className="rounded-full bg-[#F8FAFC] px-4 py-2 text-sm font-bold text-[#475569] ring-1 ring-[#E2E8F0] transition-all duration-300 ease-out hover:bg-[#EFF6FF] hover:text-[#1D4ED8] hover:ring-[#BFDBFE]"
                >
                  {link.label}
                </TrackedLink>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className="rounded-full bg-[#F8FAFC] px-4 py-2 text-sm font-bold text-[#475569] ring-1 ring-[#E2E8F0] transition-all duration-300 ease-out hover:bg-[#EFF6FF] hover:text-[#1D4ED8] hover:ring-[#BFDBFE]"
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-[#E2E8F0] pt-6 text-sm text-[#475569] sm:flex-row sm:items-center sm:justify-between">
          <p>Beta inicial para negocios que venden productos.</p>
git status
git add "components/dashboard/business-performance-panel.tsx" "components/dashboard/performance-date-filter.tsx"
git commit -m "Mejora controles y tooltip del grafico"
git push origin main          <p>© 2026 Margenia. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
