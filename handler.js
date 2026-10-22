const fs = require('fs');
const { MessageMedia } = require('whatsapp-web.js');
const { obtenerRespuestaMrX } = require('./ai.js'); 
const reglas = require('./reglas.js');

// ⚙️ CONFIGURACIÓN GLOBAL
const NUMERO_MONITOR = '59895668179@c.us'; // <-- TU NÚMERO DE ALERTAS AQUÍ
const tiempoInicio = Date.now() / 1000;
const buffersMensajes = {};
const procesandoChat = new Set();
const memoriaChats = {}; 
const botHablando = {}; 
const chatsEnModoManual = new Set(); 
const ultimoAgradecimiento = {};
const enviandoPorBot = new Set(); 
const bannersEnviados = {}; 

// 📤 Función auxiliar blindada contra falsos positivos de intervención humana
async function enviarMensajeBot(client, chatID, contenido, opciones = {}) {
    enviandoPorBot.add(chatID);
    try {
        return await client.sendMessage(chatID, contenido, opciones);
    } finally {
        setTimeout(() => enviandoPorBot.delete(chatID), 5000);
    }
}

// 📱 Función maestra para extraer el NÚMERO REAL aunque WhatsApp envíe un @lid
async function obtenerDatosCliente(message, client) {
    const chatID = message.from;
    let numero = chatID.split('@')[0];
    let nombre = (message._data && message._data.notifyName) ? message._data.notifyName : 'Cliente';
    let contactoObj = null;

    if (!chatID.includes('@lid') && numero.length <= 13) {
        return { numero, nombre, contactoObj };
    }

    try {
        const contact = await message.getContact();
        if (contact) {
            contactoObj = contact;
            if (contact.pushname || contact.name) nombre = contact.pushname || contact.name;
            if (contact.number && !String(contact.number).includes('lid') && String(contact.number).length <= 13) {
                return { numero: contact.number, nombre, contactoObj };
            }
        }
    } catch (e) {}

    try {
        if (typeof client.getContactLidAndPhone === 'function') {
            const lidData = await client.getContactLidAndPhone([chatID]);
            if (lidData && lidData.length > 0 && lidData[0].pn) {
                const numLimpio = lidData[0].pn.split('@')[0];
                if (numLimpio) return { numero: numLimpio, nombre, contactoObj };
            }
        }
    } catch (e) {}

    if (message._data) {
        const posibles = [
            message._data.sender?.id?.user,
            message._data.author?.user,
            message._data.id?.participant?.user
        ];
        for (const pos of posibles) {
            if (pos && !String(pos).includes('lid') && String(pos).length <= 13) {
                return { numero: pos, nombre, contactoObj };
            }
        }
    }

    return { numero, nombre, contactoObj };
}

// ==============================================================
// 🤖 FUNCIÓN 1: MANEJO DE MENSAJES DE CLIENTES 
// ==============================================================
async function manejarMensaje(message, client) {
    if (message.from === 'status@broadcast' || message.from.endsWith('@g.us')) return;
    if (message.timestamp < tiempoInicio || message.fromMe || message.isGroupMsg) return;

    const tiposValidos = ['chat', 'image', 'document', 'audio', 'ptt'];
    if (!tiposValidos.includes(message.type) || (!message.body && !message.hasMedia)) return;

    const chatID = message.from; 

    if (chatsEnModoManual.has(chatID)) return;

    const datosCliente = await obtenerDatosCliente(message, client);
    const numeroTel = datosCliente.numero;
    const nombreCliente = datosCliente.nombre;

    if (!buffersMensajes[chatID]) {
        buffersMensajes[chatID] = { colaMensajes: [], timer: null, datosCliente };
    } else {
        buffersMensajes[chatID].datosCliente = datosCliente;
    }

    console.log(`📩 Recibiendo mensaje de: +${numeroTel} (${nombreCliente})... agrupando.`);

    const abierto = true;
    buffersMensajes[chatID].colaMensajes.push(message);

    if (buffersMensajes[chatID].timer) clearTimeout(buffersMensajes[chatID].timer);
    
    const ejecutarBuffer = async () => {
        if (procesandoChat.has(chatID)) {
            buffersMensajes[chatID].timer = setTimeout(ejecutarBuffer, 3000);
            return;
        }
        procesandoChat.add(chatID);

        try { 
            const mensajesAgrupados = buffersMensajes[chatID].colaMensajes.splice(0);
            if (mensajesAgrupados.length === 0) {
                procesandoChat.delete(chatID);
                return;
            }

            const infoCliente = buffersMensajes[chatID].datosCliente || { numero: numeroTel, nombre: nombreCliente };
            let textoFinal = "";
            let partesMultimedia = [];

            for (const msg of mensajesAgrupados) {
                if (msg.hasMedia && (msg.type === 'image' || msg.type === 'audio' || msg.type === 'ptt')) {
                    try {
                        const media = await msg.downloadMedia();
                        if (media) {
                            partesMultimedia.push({ inlineData: { data: media.data, mimeType: media.mimetype } });
                            textoFinal += msg.type === 'image' 
                                ? ` [FOTO ENVIADA]` 
                                : ` [AUDIO DE VOZ ENVIADO - ESCÚCHALO Y RESPONDE]`;
                        }
                    } catch (e) { 
                        console.error("Error al descargar multimedia:", e); 
                    }
                } else if (msg.type === 'document') {
                    textoFinal += ` [DOCUMENTO ENVIADO: ${msg.body || 'Archivo'}]`;
                }
                if (msg.body) textoFinal += ` ${msg.body}`;
            }

            const textoLimpio = textoFinal.trim();
            if (!textoLimpio && partesMultimedia.length === 0) {
                procesandoChat.delete(chatID);
                return;
            }

            if (!memoriaChats[chatID]) memoriaChats[chatID] = [];
            memoriaChats[chatID].push(`Cliente: ${textoLimpio}`);
            if (memoriaChats[chatID].length > 10) memoriaChats[chatID].shift(); 

            if (!bannersEnviados[chatID]) bannersEnviados[chatID] = new Set();

            for (const regla of reglas) {
                const idRegla = regla.id || regla.media;
                if (regla.regex.test(textoLimpio) && !bannersEnviados[chatID].has(idRegla)) {
                    bannersEnviados[chatID].add(idRegla);
                    try {
                        if (fs.existsSync(regla.media)) {
                            const media = MessageMedia.fromFilePath(regla.media);
                            await enviarMensajeBot(client, chatID, media, { caption: regla.respuesta });
                        } else {
                            await enviarMensajeBot(client, chatID, regla.respuesta);
                        }
                    } catch (error) {
                        await enviarMensajeBot(client, chatID, regla.respuesta); 
                    }
                    memoriaChats[chatID].push(`Mr X: ${regla.respuesta}`);
                    procesandoChat.delete(chatID);
                    return; 
                }
            }

            const textoSinSignos = textoLimpio.replace(/[.,!¡¿?]/g, '').trim();
            const saludoRegex = /^(hola|buenas|buen d[ií]a|buenas tardes|buenas noches|ola|hello|que tal|qu[eé] tal|saludos|info|informaci[oó]n|servicios|qu[eé] servicios ofrecen|hola qu[eé] servicios tienen|hola quiero info|mas info)$/i;
            
            if (saludoRegex.test(textoSinSignos) && partesMultimedia.length === 0) {
                const menuFijo = `¡Hola! Somos MR.X 💻\nServicio Técnico de Computadoras - Cix\n\n✅ Reparación de bisagras y bases\n✅ Reconstrucción de carcasas\n✅ Venta y cambio de pantallas y teclados\n✅ Instalación programas de ingeniería\n✅ Formateo y mantenimiento\n\n🤝 Atención personalizada.\n📍 Estamos en el centro de Chiclayo (Elias Aguirre 331, piso 3).\n\n¿En qué te podemos ayudar hoy?`;
                const yaSeDijo = memoriaChats[chatID].some(msg => msg.includes("Somos MR.X"));
                
                if (!yaSeDijo) {
                    await enviarMensajeBot(client, chatID, menuFijo);
                    memoriaChats[chatID].push(`Mr X: ${menuFijo}`);
                    procesandoChat.delete(chatID);
                    return; 
                }
            }
            
            const cortesiaRegex = /^(?:(?:ok|dale|sisi|si|listo|pronto|buenisimo|genial|perfecto|joya|impecable|excelente|oka|chau|hasta ma[ñn]ana|hasta luego|buenas noches|buenas tardes|buen dia|gracias a ti|de nada|muchas gracias|mil gracias|gracias|graciass+)\s*)+[.\s!🙏👍😊🚀🙌]*$/i;
            const ultimoMensajeBot = memoriaChats[chatID].slice().reverse().find(m => m.startsWith('Mr X:'));
            const botHizoPregunta = ultimoMensajeBot && ultimoMensajeBot.includes('?');

            if (cortesiaRegex.test(textoSinSignos) && partesMultimedia.length === 0 && !botHizoPregunta) {
                if (ultimoAgradecimiento[infoCliente.numero] && (Date.now() - ultimoAgradecimiento[infoCliente.numero] < 14400000)) { 
                    procesandoChat.delete(chatID); 
                    return;
                }
                ultimoAgradecimiento[infoCliente.numero] = Date.now();
                await enviarMensajeBot(client, chatID, "¡A ti! 🙌 Cualquier cosita estamos en Elias Aguirre 331, piso 3. ¡Que tengas buen día!");
                memoriaChats[chatID].push(`Mr X: ¡A ti! 🙌...`);
                procesandoChat.delete(chatID);
                return;
            }

            try {
                if (!chatID.includes('@lid')) {
                    const chat = await client.getChatById(chatID);
                    await chat.sendStateTyping();
                }
            } catch (errTyping) {}
            
            const historialParaIA = memoriaChats[chatID].slice(-6).join("\n");
            
            let rIA = await obtenerRespuestaMrX(
                textoLimpio, 
                historialParaIA, 
                abierto, 
                partesMultimedia.length > 0 ? partesMultimedia : null
            );
            rIA = rIA.trim();

            const requiereHumano = /ALERTA:\s*(HUMANO|HARDWARE)/i.test(rIA);
            rIA = rIA.replace(/\[?ALERTA:.*?(\]|$)/gi, "").trim();

            if (requiereHumano) {
                chatsEnModoManual.add(chatID); 
                
                const numeroReal = infoCliente.numero;
                const esNumeroReal = !String(numeroReal).includes('lid') && String(numeroReal).length <= 13;
                const linkDirecto = esNumeroReal ? `\n🔗 https://wa.me/${numeroReal}` : '';

                console.log(`🚨 Derivación a Humano en chat +${numeroReal} (${infoCliente.nombre}). Bot silenciado.`);

                const mensajeAlerta = `🚨 *REQ. HUMANO:* +${numeroReal} (${infoCliente.nombre})${linkDirecto}\n⏸️ Bot pausado.`;
                
                try {
                    await enviarMensajeBot(client, NUMERO_MONITOR, mensajeAlerta);
                } catch (e) {
                    console.error("⚠️ Error al enviar alerta minimalista:", e.message);
                }
            }
            
            botHablando[chatID] = Date.now(); 
            if (rIA.length > 2) {
                await enviarMensajeBot(client, chatID, rIA);
                memoriaChats[chatID].push(`Mr X: ${rIA}`);
            }

        } catch (error) {
            console.error('❌ Error en ejecución de IA:', error);
            await enviarMensajeBot(client, chatID, "Un momento por favor, el técnico de *Mr. X* 💻 ya te atiende.");
        } finally {
            procesandoChat.delete(chatID);
            if (buffersMensajes[chatID] && buffersMensajes[chatID].colaMensajes.length > 0) {
                buffersMensajes[chatID].timer = setTimeout(ejecutarBuffer, 2000);
            }
        }
    };

    buffersMensajes[chatID].timer = setTimeout(ejecutarBuffer, 8000); 
}

// ==============================================================
// 🛠️ FUNCIÓN 2: COMANDOS DE ADMIN (!pausa, !bot, !limpiar)
// ==============================================================
async function manejarMensajePropio(message, client) {
    try {
        if (!message || !message.fromMe) return;
        if (message.timestamp < tiempoInicio) return;

        const chatID = message.to;
        if (!chatID || chatID === 'status@broadcast' || chatID.endsWith('@g.us')) return; 

        if (enviandoPorBot.has(chatID)) return;

        const t = (message.body && typeof message.body === 'string' ? message.body : "").toLowerCase().trim();

        if (t === '!limpiar') {
            try { await message.delete(true); } catch(e) {}
            delete memoriaChats[chatID]; 
            delete bannersEnviados[chatID];
            console.log(`🧹 Memoria borrada en ${chatID}`);
            await enviarMensajeBot(client, NUMERO_MONITOR, `🧹 *Memoria y banners reiniciados* para el chat ${chatID.split('@')[0]}.`);
            return;
        }

        if (t === '!pausa') {
            try { await message.delete(true); } catch(e) {}
            chatsEnModoManual.add(chatID);
            console.log(`⏸️ Bot pausado manualmente con !pausa en ${chatID}`);
            await enviarMensajeBot(client, NUMERO_MONITOR, `⏸️ *Modo Manual activado* en ${chatID.split('@')[0]}.`);
            return;
        }
        
        if (t === '!bot') { 
            try { await message.delete(true); } catch(e) {}
            chatsEnModoManual.delete(chatID); 
            console.log(`🤖 Bot reactivado con !bot en ${chatID}`);
            await enviarMensajeBot(client, NUMERO_MONITOR, `🤖 *Modo Automático reactivado* en ${chatID.split('@')[0]}.`);
            return; 
        }

        if (!memoriaChats[chatID]) memoriaChats[chatID] = [];
        if (message.body && typeof message.body === 'string' && !t.startsWith('!')) {
            memoriaChats[chatID].push(`Mr X (Humano): ${message.body}`);
            if (memoriaChats[chatID].length > 10) memoriaChats[chatID].shift();
        }

    } catch (errorGeneral) {
        console.error("❌ Error atrapado en manejarMensajePropio:", errorGeneral.message);
    }
}

setInterval(() => {
    const ahora = Date.now();
    for (const chat in botHablando) {
        if (ahora - botHablando[chat] > 43200000) { 
            delete botHablando[chat];
            delete memoriaChats[chat];
            delete bannersEnviados[chat];
            chatsEnModoManual.delete(chat); 
        }
    }
}, 3600000);

module.exports = { manejarMensaje, manejarMensajePropio };