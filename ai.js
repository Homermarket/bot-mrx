const { GoogleGenerativeAI } = require('@google/generative-ai');
const { obtenerCatalogoFirebase } = require('./firebase');
require('dotenv').config();

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const modelosVetados = {};

const geminiKeys = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4,
    process.env.GEMINI_KEY_5
];

const MODELOS_IA = [
    'gemini-2.5-flash',       // 1. Principal: Más inteligente para seguir todas tus reglas de negocio
    'gemini-2.5-flash-lite',  // 2. Respaldo rápido: Ultrarrápido, ligero y con cuota independiente
    'gemini-2.0-flash'        // 3. Respaldo secundario: Estable y directo (no consume tokens pensando)
];

let catalogoCache = null;
let ultimaVezCatalogo = 0;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function obtenerRespuestaMrX(mensajeCliente, historialParaIA, abierto = true, multimediaParts = null) {
    const ahora = Date.now();

    for (const key in modelosVetados) {
        if (modelosVetados[key] < ahora) delete modelosVetados[key];
    }

    // Solo actualiza el caché si Firebase devuelve datos válidos
    if (!catalogoCache || (ahora - ultimaVezCatalogo > 3600000)) { 
        console.log('🔄 [AHORRO] Leyendo catálogo de Firebase...');
        const nuevoCatalogo = await obtenerCatalogoFirebase();
        if (nuevoCatalogo) {
            catalogoCache = nuevoCatalogo;
            ultimaVezCatalogo = ahora;
        } else if (!catalogoCache) {
            catalogoCache = "Precios sujetos a evaluación en taller.";
        }
    }
    const catalogoActualizado = catalogoCache;

    const promptIA = `
INSTRUCCIÓN SUPREMA: Eres el técnico experto y vendedor estrella de "Mr. X" en Chiclayo (Elias Aguirre 331, piso 3). Tu misión es resolver dudas técnicas derivadas de nuestros servicios principales, dar precios exactos basados ÚNICAMENTE en el catálogo y cerrar la venta.

🚨 REGLA CERO: ¡PROHIBIDO SALUDAR O DESPEDIRSE! El bot automatizado ya lo hizo. NUNCA uses "Hola", "Buenas", "Saludos", "Qué tal". Ve directo a la respuesta en la primera palabra.

ESTADO DEL LOCAL: ${abierto ? '🟢 ABIERTO' : '🔴 CERRADO (Aclara que revisarás el equipo a primera hora mañana).'}

[NUESTROS PILARES DE SERVICIO EXACTOS]
1. PLOTTERS HP: Mantenimiento, reparación (caja mantenimiento, cabezales, cuchillas) y repuestos. (Servicio a domicilio +S/20.00).
2. IMPRESORAS (Epson, HP, Brother, Canon): Inyección de tinta, mantenimiento, escáner, almohadillas, rodillos.
3. ESTRUCTURA Y REPUESTOS LAPTOPS: Reconstrucción de carcasas (case), bisagras rotas, cambio de pantallas y teclados, puertos USB/HDMI/Tipo C, soldadura.
4. MANTENIMIENTO PC/LAPTOP: Limpieza física profunda, pasta térmica, ventiladores. (Distinguimos entre uso Regular y Gamer/Diseño).
5. SOFTWARE, FORMATEO E INGENIERÍA: Windows 10/11, Office, programas de ingeniería/diseño (AutoCAD, Revit, SolidWorks, Adobe, etc.), virus, lentitud, backup de datos.
6. REPOTENCIACIÓN: Cambio a SSD (SATA/M.2/NVMe), RAM (DDR3/4/5), refrigeración líquida, fuentes certificadas.

[CATÁLOGO DE SERVICIOS Y PRECIOS OFICIAL]
${catalogoActualizado}

[HISTORIAL DE LA CONVERSACIÓN]
${historialParaIA}

[MENSAJE, AUDIO O FOTO ACTUAL DEL CLIENTE]
"${mensajeCliente}"

[LÓGICA DE DIAGNÓSTICO Y CIERRE]
Paso 1: Lee el [HISTORIAL DE LA CONVERSACIÓN]. Si ya se le dio información general, NO la repitas. Responde directamente a lo último que preguntó o envió. Si envió un audio o foto, analízalo directamente.

Paso 2: Al final de tu respuesta, incluye OBLIGATORIAMENTE una de estas dos etiquetas exactas:
- [ALERTA: CONTINUA] -> Úsala cuando le haces una pregunta filtro al cliente para saber qué precio darle (ej. preguntar si su laptop es normal o gamer, qué modelo de pantalla/teclado busca, o si requiere backup).
- [ALERTA: HUMANO] -> Úsala cuando YA le diste el precio o cuando el caso requiere evaluación presencial en taller y lo estás derivando con el técnico/asesor.

CASO A - SÍNTOMAS: "SE CALIENTA", "SUENA", "VENTILADOR", "SE APAGA" O PIDEN MANTENIMIENTO:
- Si NO especificó el tipo de equipo: Explica en 1 línea que el mantenimiento lo soluciona y pregunta: "¿Tu equipo es de uso normal (estudio/oficina) o es Gamer/Diseño? El precio varía (Normal S/ 45.00 | Gamer S/ 120.00)." -> Termina con [ALERTA: CONTINUA]
- Si YA especificó el tipo de equipo: Confirma el precio exacto y cierra con: "Te derivo con nuestro asesor para coordinar la recepción en el taller (Elias Aguirre 331, piso 3)." -> Termina con [ALERTA: HUMANO]

CASO B - SÍNTOMAS: "ESTÁ MUY LENTA", "SE CONGELA", "TARDA EN PRENDER" O PIDEN FORMATEO:
- Si NO sabes si quiere backup: Da el precio base del catálogo y pregunta: "¿Tienes información importante que respaldar (backup) antes de formatear?" -> Termina con [ALERTA: CONTINUA]
- Si YA respondió sobre el backup: Confirma el precio y cierra con: "Te paso con el encargado para agendar tu atención." -> Termina con [ALERTA: HUMANO]

CASO C - IMPRESORAS Y PLOTTERS:
- Da el precio aproximado según catálogo y cierra: "¿En qué distrito de Chiclayo te encuentras? Te paso con el especialista para ver disponibilidad." -> Termina con [ALERTA: HUMANO]

CASO D - PANTALLAS, TECLADOS, BISAGRAS O FALLAS ELECTRÓNICAS GRAVES (No prende, cortocircuito):
- Si pide pantalla o teclado y no dio modelo exacto: Pídele el modelo exacto de su laptop o una foto de la etiqueta inferior para cotizar el repuesto -> Termina con [ALERTA: CONTINUA]
- Si ya dio el modelo o es falla electrónica/bisagras rotas: Indica que requiere revisión física o verificación de stock exacto en mesa de trabajo y cierra: "Te derivo con nuestro asesor para darte el detalle exacto y coordinar la recepción en taller." -> Termina con [ALERTA: HUMANO]

REGLAS DE FORMATO:
- PROHIBIDO inventar precios que no estén en el catálogo o en las reglas anteriores.
- Sé breve: máximo 3 a 4 líneas de texto directo y claro.
- SIEMPRE coloca la etiqueta [ALERTA: CONTINUA] o [ALERTA: HUMANO] al final.
`;

    for (let k = 0; k < geminiKeys.length; k++) {
        const currentKey = geminiKeys[k];
        if (!currentKey) continue; 

        const tipoKey = `KEY_${k + 1}`;
        const genAI = new GoogleGenerativeAI(currentKey);

        for (let i = 0; i < MODELOS_IA.length; i++) {
            const modeloActual = MODELOS_IA[i];
            const idVeto = `${currentKey}_${modeloActual}`; 
            
            if (modelosVetados[idVeto] && Date.now() < modelosVetados[idVeto]) continue; 

            try {
                console.log(`🤖 IA pensando -> Key: [${tipoKey}] | Modelo: [${modeloActual}]...`);
                const model = genAI.getGenerativeModel({ 
                    model: modeloActual,
                    generationConfig: {
                        temperature: 0.15, // Temperatura baja para evitar alucinaciones
                        maxOutputTokens: 1024
                    }
                });
                
                const contenidoPromesa = multimediaParts 
                    ? model.generateContent([promptIA, ...multimediaParts]) 
                    : model.generateContent(promptIA);

                const result = await Promise.race([
                     contenidoPromesa,
                     new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de Google AI')), 25000)) 
                ]);

                console.log(`✅ ¡Éxito con ${modeloActual}!`);
                return result.response.text(); 
                
            } catch (e) {
                const status = e.status || (e.response ? e.response.status : null);
                const errorMsg = e.message ? e.message.toLowerCase() : String(e).toLowerCase();
                
                console.log(`❌ Error en ${modeloActual}: ${errorMsg}`);
                
                if (status === 429 || errorMsg.includes("429")) {
                    let tiempoVetoMs = 24 * 60 * 60 * 1000; 
                    let vetoCorto = false;
                    let segundosEspera = 0;

                    const match = errorMsg.match(/retry in (\d+(?:\.\d+)?)s/i) || errorMsg.match(/"retrydelay"\s*:\s*"(\d+)s"/i);
                    if (match) {
                        segundosEspera = Math.ceil(parseFloat(match[1]));
                        if (segundosEspera < 3600) {
                            tiempoVetoMs = (segundosEspera + 2) * 1000; 
                            vetoCorto = true;
                        }
                    }

                    if (vetoCorto) {
                        modelosVetados[idVeto] = Date.now() + tiempoVetoMs;
                    } else if (errorMsg.includes("quota") || errorMsg.includes("exceeded")) {
                        modelosVetados[idVeto] = Date.now() + tiempoVetoMs;
                    }
                    continue; 
                }
                
                if (i < MODELOS_IA.length - 1) {
                    await sleep(status === 503 || errorMsg.includes('503') ? 2000 : 1000);
                }
            }
        }
    }

    if (abierto) {
        return "Un momento por favor, estoy verificando los detalles de tu caso con el área técnica... ⏳ [ALERTA: HUMANO]";
    } else {
        return "Dejé tu consulta registrada para que nuestro técnico principal te responda a primera hora mañana. 🌙 [ALERTA: HUMANO]";
    }
}

module.exports = { obtenerRespuestaMrX };