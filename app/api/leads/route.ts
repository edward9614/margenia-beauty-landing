import { NextResponse } from "next/server";

type LeadPayload = {
  name: string;
  whatsapp: string;
  instagram?: string;
  sells: string;
  controlMethod: string;
  wantsBeta: string;
  intent?: string;
};

function normalizeInstagram(value?: string) {
  const trimmed = value?.trim() || "";

  if (!trimmed) {
    return "";
  }

  return `@${trimmed.replace(/^@+/, "")}`;
}

function normalizeIntent(value?: string) {
  return value === "fundadora" ? "fundadora" : "lista_espera";
}

export async function POST(request: Request) {
  try {
    let payload: Partial<LeadPayload>;

    try {
      payload = (await request.json()) as Partial<LeadPayload>;
    } catch {
      return NextResponse.json(
        { message: "Faltan datos obligatorios." },
        { status: 400 },
      );
    }

    const lead = {
      name: payload.name?.trim() || "",
      whatsapp: payload.whatsapp?.trim() || "",
      instagram: normalizeInstagram(payload.instagram),
      sells: payload.sells?.trim() || "",
      controlMethod: payload.controlMethod?.trim() || "",
      wantsBeta: payload.wantsBeta?.trim() || "",
      intent: normalizeIntent(payload.intent),
    };

    if (
      !lead.name ||
      !lead.whatsapp ||
      !lead.sells ||
      !lead.controlMethod ||
      !lead.wantsBeta
    ) {
      return NextResponse.json(
        { message: "Faltan datos obligatorios." },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { message: "Supabase no está configurado. Revisa .env.local." },
        { status: 500 },
      );
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/beauty_leads`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        name: lead.name,
        whatsapp: lead.whatsapp,
        instagram: lead.instagram,
        sells: lead.sells,
        control_method: lead.controlMethod,
        wants_beta: lead.wantsBeta,
        intent: lead.intent,
      }),
    });

    if (!response.ok) {
      console.error("Supabase error:", await response.text());

      return NextResponse.json(
        { message: "No pudimos guardar el registro." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "¡Listo! Te avisaremos cuando abramos la beta de Margenia Beauty.",
    });
  } catch (error) {
    console.error("Error inesperado en /api/leads:", error);

    return NextResponse.json(
      { message: "No pudimos guardar el registro." },
      { status: 500 },
    );
  }
}
