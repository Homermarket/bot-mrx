const client = require('./whatsapp');
const { manejarMensaje, manejarMensajePropio } = require('./handler');

// Escuchar mensajes entrantes de clientes
client.on('message', async (message) => {
    await manejarMensaje(message, client);
});

// Escuchar mensajes enviados por ti mismo (Comandos !pausa, !bot y detección manual)
client.on('message_create', async (message) => {
    if (message.fromMe) {
        await manejarMensajePropio(message, client);
    }
});

client.initialize();