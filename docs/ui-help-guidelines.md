# Guía de Ayuda Contextual

Margenia usa ayudas con `?` para explicar decisiones de negocio sin interrumpir el flujo principal. Deben aclarar qué significa un campo, cómo afecta los cálculos o qué pasa al ejecutar una acción.

## Cuándo Usarla

- Campos que influyen en precio, utilidad, stock, ventas o caja.
- Acciones que tienen consecuencias importantes, como archivar, restaurar, registrar una venta o hacer un conteo físico.
- Métricas que pueden confundirse, como utilidad real, inventario, caja o rendimiento.
- Estados que dependen de reglas internas, como bajo stock, pendiente o archivado.

## Cuándo No Usarla

- Campos obvios como nombre, si el contexto ya es suficiente.
- Botones secundarios simples como cancelar o volver.
- Textos repetidos que no agregan claridad.
- Explicaciones técnicas de base de datos, RLS, RPC o implementación.

## Estilo De Redacción

- Escribe para una emprendedora, no para un equipo técnico.
- Usa frases cortas y directas.
- Explica el impacto práctico en el negocio.
- Incluye un ejemplo cuando ayude a tomar una decisión.
- Evita prometer funciones que aún no existen.

## Estructura Recomendada

Cada ayuda vive en `lib/help-content.ts` y debe usar:

```ts
{
  title: "Pregunta o concepto claro",
  content: "Explicación breve orientada a negocio.",
  example: "Ej: caso real o referencia opcional.",
}
```

## Componentes

- `HelpTooltip`: botón base con el signo `?`.
- `FieldLabel`: etiqueta de formulario con ayuda opcional.
- `ActionHelp`: ayuda junto a botones o acciones.
- `TableHeaderHelp`: ayuda para columnas de tablas.

## Buen Ejemplo

```ts
{
  title: "¿Qué es utilidad real?",
  content: "Es lo que te queda después de restar costos, descuentos y comisiones.",
  example: "Ej: si vendes $100.000 y tus costos son $65.000, tu utilidad estimada es $35.000.",
}
```

## Mal Ejemplo

```ts
{
  title: "gross_profit",
  content: "Valor calculado desde sale_items con RPC y RLS.",
}
```

La ayuda debe reducir dudas, no explicar la arquitectura.
