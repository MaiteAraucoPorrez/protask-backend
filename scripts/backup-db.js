const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuración
const BACKUP_DIR = path.join(process.cwd(), 'backups', 'postgres');
const LOG_FILE = path.join(BACKUP_DIR, 'backup.log');
const MAX_BACKUPS = 30; // días

// Crear directorio si no existe
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function log(message) {
    const timestamp = new Date().toISOString().replace('T', '_').replace(/:/g, '-').slice(0, 19);
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

async function runBackup() {
    try {
        log('Iniciando backup de la base de datos...');

        // Leer variables del .env
        const envContent = fs.readFileSync('.env', 'utf8');
        const envVars = {};
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) envVars[key.trim()] = value.trim();
        });

        // Generar nombre del archivo
        const now = new Date();
        const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        const backupFile = path.join(BACKUP_DIR, `protask_backup_${timestamp}.sql`);
        const compressedFile = `${backupFile}.gz`;

        // Ejecutar pg_dump dentro del contenedor Docker
        log('Ejecutando pg_dump...');
        const { stdout, stderr } = await execAsync(
            `docker exec protask-backend-postgres-1 pg_dump -U ${envVars.DATABASE_USER} -d ${envVars.DATABASE_NAME}`
        );

        if (stderr && !stderr.includes('password')) {
            log(`Advertencia: ${stderr}`);
        }

        // Guardar el backup
        fs.writeFileSync(backupFile, stdout);
        log(`Backup guardado: ${backupFile}`);

        // Comprimir
        log('Comprimiendo backup...');
        const readStream = fs.createReadStream(backupFile);
        const writeStream = fs.createWriteStream(compressedFile);
        const gzip = zlib.createGzip();

        await new Promise((resolve, reject) => {
            readStream.pipe(gzip).pipe(writeStream);
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        // Eliminar archivo sin comprimir
        fs.unlinkSync(backupFile);
        log(`Backup comprimido: ${compressedFile}`);

        // Eliminar backups antiguos
        const files = fs.readdirSync(BACKUP_DIR);
        const nowMs = Date.now();
        const maxAgeMs = MAX_BACKUPS * 24 * 60 * 60 * 1000;

        let deletedCount = 0;
        files.forEach(file => {
            if (file.endsWith('.gz')) {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filePath);
                if (nowMs - stats.mtimeMs > maxAgeMs) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                }
            }
        });
        log(`Eliminados ${deletedCount} backups antiguos (más de ${MAX_BACKUPS} días)`);

        log('Backup completado exitosamente');
        
        // Mostrar tamaño del backup
        const stats = fs.statSync(compressedFile);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        log(`Tamaño del backup: ${sizeMB} MB`);

    } catch (error) {
        log(`ERROR: ${error.message}`);
        process.exit(1);
    }
}

// Ejecutar backup
runBackup();