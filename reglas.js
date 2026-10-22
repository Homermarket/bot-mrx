const path = require('path');

const reglas = [
    {
        id: 'saludo_inicial',
        regex: /^(hola|buenas|buen d[ií]a|buenas tardes|buenas noches|ola|hello|que tal|qu[eé] tal|saludos|info|informaci[oó]n|servicios|qu[eé] servicios ofrecen|hola qu[eé] servicios tienen|hola quiero info|mas info)$/i,
        respuesta: "¡Hola! Somos MR.X 💻\nServicio Técnico de Computadoras - Cix\n\n✅ Reparación de bisagras y bases\n✅ Reconstrucción de carcasas\n✅ Venta y cambio de pantallas y teclados\n✅ Instalación programas de ingeniería\n✅ Formateo y mantenimiento\n\n🤝 Atención personalizada.\n📍 Estamos en el centro de Chiclayo (Elias Aguirre 331, piso 3).\n\n¿En qué te podemos ayudar hoy?",
        media: '' // Vacío porque el saludo no lleva imagen
    },
    {
        id: 'plotters',
        regex: /\b(plotter|plotters|designjet)\b/i,
        respuesta: "🖨️ *Soporte Técnico de Plotters HP | Mr. X*\n\nBrindamos mantenimiento, reparación y venta de repuestos especializados para dejar tu plotter como nuevo.\n\n✅ *Mantenimiento preventivo:*\n• Limpieza y lubricación de engranajes.\n• Limpieza de bandejas, rieles y cuchillas.\n• Limpieza de caja de mantenimiento y rodillos.\n\n🔧 *Reparación y repuestos:*\n• Cajas de mantenimiento.\n• Cabezales de impresión y cuchillas.\n• Motores, engranajes y paneles de control.\n\n📩 Indícanos el modelo exacto de tu plotter para darte una cotización. ¿Deseas agendar una visita técnica a tu oficina (+S/ 20.00 a domicilio) o prefieres enviarnos fotos del problema para una evaluación previa? 👨‍🔧",
        media: path.resolve(__dirname, 'assets', 'banner-plotters.png')
    },
    {
        id: 'estructura_laptop',
        regex: /\b(bisagra|bisagras|carcasa|carcasas|case|pl[áa]stico roto|pantalla separada|puerto usb|puerto hdmi|tipo c|soldadura|reconstrucci[óo]n)\b/i,
        respuesta: "💻 *Estructura y Reparación Física | Mr. X*\n\n¡Salvamos la estructura de tu laptop! Reparamos y reconstruimos carcasas, bisagras y puertos dañados.\n\n🔧 *Servicios especializados:*\n✅ Reparación de bisagras rotas o desprendidas.\n✅ Reconstrucción y refuerzo de bases.\n✅ Reparación y pintado de case (carcasa).\n✅ Reemplazo de puertos USB, HDMI y Tipo C.\n\n🛠️ *Ideal si tu equipo tiene:*\n• Bisagras duras o que crujen al abrir.\n• Pantalla que se separa de la base.\n• Puertos que no leen nada.\n\n📩 Para darte un presupuesto exacto, envíanos un par de fotos del daño. ¿Prefieres traer tu equipo al taller hoy mismo (Elias Aguirre 331, piso 3) para que lo revise un especialista? 🛠️",
        media: path.resolve(__dirname, 'assets', 'banner-reparacion-laptops.png') 
    },
    {
        id: 'impresoras',
        regex: /\b(impresora|impresoras|epson|brother|canon|tinta|cabezal|cabezales|almohadillas)\b/i,
        respuesta: "🖨️ *Servicio Técnico de Impresoras | Mr. X*\n\nEspecialistas en sistema continuo e inyección de tinta: Epson, HP, Brother y Canon.\n\n✅ *Mantenimiento preventivo:*\n• Limpieza y lubricación de engranajes.\n• Mantenimiento de bandejas, rieles y caja de tinta.\n• Limpieza de rodillos de alimentación.\n\n🔧 *Reparación y repuestos originales:*\n• Escáneres y cabezales de impresión.\n• Bombas de succión, almohadillas y engranajes.\n• Rodillos de papel.\n\n📩 Envíanos la marca y modelo de tu impresora para darte el costo exacto. ¿Te gustaría traerla a nuestro taller o coordinamos recojo/visita a domicilio? 🚐",
        media: path.resolve(__dirname, 'assets', 'banner-impresoras.png')
    },
    {
        id: 'mantenimiento_pc',
        regex: /(mantenimiento.*(pc|laptop|computadora)|limpieza.*(pc|laptop)|\b(calienta|temperatura|pasta t[eé]rmica|se apaga|suena fuerte|ruido|ventilador)\b)/i,
        respuesta: "🛠️ *Mantenimiento Preventivo VIP | Mr. X*\n\nAlargamos la vida útil de tu equipo, evitamos que se apague de la nada y lo dejamos trabajando fresco.\n\n✅ Limpieza física profunda de polvo y pelusas.\n✅ Cambio de pasta térmica de alta conductividad.\n✅ Limpieza y lubricación de ventiladores.\n\n💰 *Inversión referencial:*\n• Uso Normal / Oficina: S/ 45.00\n• Línea Gamer / Diseño: S/ 120.00\n\n📩 Coméntanos: ¿tu equipo es de uso normal o es Gamer/Diseño? Confírmanos para pasarte con un especialista y coordinar la agenda. 👨‍🔧",
        media: path.resolve(__dirname, 'assets', 'banner-mantenimiento-pc.png')
    },
    {
        id: 'formateo_software',
        regex: /\b(formateo|formatear|instalar windows|virus|muy lenta|est[áa] lenta|demora en prender|se cuelga|se congela|sistema operativo|instalar office)\b/i,
        respuesta: "💻 *Optimización y Formateo | Mr. X*\n\n¡Le devolvemos la velocidad a tu equipo y borramos todo lo malo!\n\n✅ Formateo e instalación de Windows (10 u 11).\n✅ Instalación de Office, utilitarios y programas listos para usar.\n✅ Eliminación total de virus, publicidad molesta y lentitud.\n\n💡 *Dato Experto:* Al recibirla, le daremos una mirada rápida para confirmar si solo es el sistema o si necesita algo más para que vuele.\n\n📩 ¿Tienes fotos o documentos importantes que necesitemos guardar (backup) antes de borrar todo? Confírmanos para darte el costo exacto y ver los horarios disponibles. 🚀",
        media: path.resolve(__dirname, 'assets', 'banner-mantenimiento-pc.png')
    },
    {
        id: 'repotenciacion',
        regex: /\b(repotenciaci[óo]n|repotenciar|actualizar.*(pc|laptop)|disco s[óo]lido|ssd|nvme|memoria ram|cooler|refrigeraci[óo]n l[íi]quida|fuente de poder)\b/i,
        respuesta: "🚀 *Repotenciación de Hardware | Mr. X*\n\n¡Haz que tu equipo vuele! Actualizamos tus componentes para llevar el rendimiento al máximo.\n\n🔹 *Más velocidad:* Cambio a Disco SSD (SATA, M.2 o NVMe).\n🔹 *Más capacidad:* Ampliación de Memoria RAM (DDR3, DDR4, DDR5).\n🔹 *Mejor temperatura:* Cooler de torre o refrigeración líquida.\n🔹 *Actualización de Setup:* Cambio de case y fuentes certificadas.\n\n📩 Coméntanos qué mejora tienes en mente o el modelo de tu equipo para cotizar tus componentes ahora mismo. ⚡",
        media: path.resolve(__dirname, 'assets', 'banner-repotenciacion.png')
    }
];

module.exports = reglas;