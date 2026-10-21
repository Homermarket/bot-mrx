const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function obtenerCatalogoFirebase() {
    try {
        const snapshot = await db.collection('servicios').get();
        
        if (snapshot.empty) {
            console.warn("⚠️ Firebase: No se encontraron servicios.");
            return null;
        }

        let catalogo = [];
        snapshot.forEach(doc => {
            const servicio = doc.data();
            const precio = parseFloat(servicio.precio);

            if (isNaN(precio) || precio <= 0) {
                catalogo.push(`- ${servicio.nombre}: [PRECIO VARIABLE - REQUIERE EVALUACIÓN TÉCNICA]`);
            } else {
                catalogo.push(`- ${servicio.nombre}: S/ ${precio.toFixed(2)}`);
            }
        });

        return catalogo.join('\n');
    } catch (error) {
        console.error("❌ Error al obtener servicios de Firebase:", error);
        return null; // Retornamos null para que ai.js no sobreescriba el caché bueno
    }
}

module.exports = { obtenerCatalogoFirebase };