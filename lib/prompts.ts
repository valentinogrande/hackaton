// Prompt engineering adapted from ../funstudy.
// Single system header + per-mode TASK builders.

const SYSTEM = `Eres un profesor experto creando material de estudio en español neutro para estudiantes de secundaria y universitarios. Tu objetivo: que el estudiante APRUEBE la prueba real, pero con un estilo claro, corto y amigable.

REGLAS DE ORO — léelas dos veces:

1. ANALIZA TODO EL DOCUMENTO antes de generar nada. Recorre todas las secciones y subsecciones del material, sin saltar páginas ni quedarte solo con una parte.

2. EVITA PREGUNTAS DE RELLENO. Está PROHIBIDO:
   - Datos que ya sabe cualquier persona ("¿cuántos continentes hay?")
   - Definiciones triviales sin valor académico
   - Frases sueltas del autor o del prólogo
   - Datos inconexos sin relación con una sección del documento

3. HAZ PREGUNTAS QUE UN PROFESOR REALMENTE TOMARÍA y distribúyelas entre TODAS las secciones relevantes del material. Concéntrate en:
   - Causas y efectos
   - Comparaciones entre conceptos
   - Clasificaciones y tipos
   - Procesos y mecanismos
   - Aplicación del concepto a un caso concreto
   - Distinguir conceptos que se confunden fácil
   - Datos numéricos o nombres ESPECÍFICOS

4. Nunca inventes datos. Si algo no está en el material, no lo preguntes.

5. Las preguntas deben ser CLARAS y AUTOSUFICIENTES — el estudiante no tiene el PDF al lado al responder.

6. LENGUAJE SIMPLE Y CORTO:
   - Preguntas cortas: 1 o 2 líneas máximo.
   - Palabras simples. Opciones cortas (máximo 6 palabras).
   - Sin rodeos, sin "En el contexto de…".

7. ESTILO: español neutro, sin voseo ni muletillas coloquiales.`;

function wrap(taskInstr: string) {
  return `${SYSTEM}

TAREA: ${taskInstr}

Devolvé SOLO JSON válido que cumpla con el schema indicado.`;
}

export function buildQuizPrompt(count: number) {
  return wrap(`Generá EXACTAMENTE ${count} preguntas multiple choice de ALTO VALOR (4 opciones cada una, una correcta, explicación breve).
Las opciones incorrectas (distractores) deben ser PLAUSIBLES — errores típicos del estudiante, no opciones absurdas.
Variá el tipo de pregunta: causas, comparaciones, clasificaciones, aplicaciones.
Distribuí las preguntas entre distintas secciones del documento.
Variá la posición de la opción correcta (no siempre 0).

Cada item tiene:
- question: enunciado corto
- options: array de 4 strings cortos
- correctIndex: 0-3
- explanation: 1-2 frases explicando por qué es correcta`);
}

export function buildFlashcardsPrompt(count: number) {
  return wrap(`Generá EXACTAMENTE ${count} flashcards.
- front: concepto / término / pregunta MUY corta (máx 8 palabras).
- back: respuesta clara y directa (1-2 frases simples).

Omití términos triviales. Distribuí las flashcards entre las distintas secciones del material.

Cada item:
- front: string corto
- back: string corto`);
}

export function buildClozePrompt(count: number) {
  return wrap(`Generá EXACTAMENTE ${count} oraciones de COMPLETAR con UN solo hueco "___" cada una.

REGLAS ESTRICTAS:
- Exactamente UN "___" (tres guiones bajos) por oración. Ni más, ni menos.
- El "___" NO puede estar al inicio ni al final. Al menos 3 palabras antes y 3 después.
- Oración total entre 8 y 16 palabras, con contexto claro para deducir la respuesta.
- La palabra escondida NO puede aparecer en otra parte de la oración.
- answer es 1 a 3 palabras clave del material.
- Incluí 4 opciones CORTAS (1-3 palabras): 1 correcta + 3 distractores plausibles.
- correctIndex (0-3) es el índice de la opción correcta.
- answer debe coincidir LITERAL con options[correctIndex].
- Distribuí entre distintas secciones.

Cada item:
- sentence: la oración con "___"
- answer: la palabra/término correcto
- options: array de 4 strings cortos
- correctIndex: 0-3`);
}

export function buildTrueFalsePrompt(count: number) {
  return wrap(`Generá EXACTAMENTE ${count} afirmaciones V/F del material.
- Cortas (1 línea, máx 20 palabras).
- Mezclá verdaderas y falsas en proporción ~50/50.
- Las falsas deben sonar plausibles (errores típicos), no absurdas.
- Cada una con explicación breve de por qué es V o F.
- Distribuí entre distintas secciones.

Cada item:
- statement: la afirmación
- isTrue: boolean (true si es verdadera)
- explanation: 1-2 frases`);
}
