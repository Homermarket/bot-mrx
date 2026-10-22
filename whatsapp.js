const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const esLinux = process.platform === 'linux';

const argsPuppeteer = [
    '--no-sandbox', 
    '--disable-setuid-sandbox', 
    '--disable-gpu',                
    '--disable-dev-shm-usage', 
    '--no-first-run', 
    '--disable-extensions'          
];

// Estos dos argumentos ayudan en servidores Linux pequeños, pero en Mac causan fallos en Puppeteer
if (esLinux) {
    argsPuppeteer.push('--no-zygote');
}

const opcionesConfig = {
    authStrategy: new LocalAuth({ clientId: 'mrx-session' }), 
    puppeteer: {
        headless: true,
        args: argsPuppeteer,
        executablePath: esLinux ? '/usr/bin/chromium-browser' : undefined
    }
};

const client = new Client(opcionesConfig);

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('📱 Escanea este QR con el WhatsApp Business de Mr X.');
});

client.on('ready', () => {
    console.log('✅ Recepcionista Híbrido de Mr X ONLINE 🚀');
});

client.on('disconnected', (reason) => {
    console.log('⚠️ El bot se desconectó:', reason);
    process.exit(1); 
});

module.exports = client;