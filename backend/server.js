// --- backend/server.js ---

// 1. IMPORTAR LIBRERÍAS
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const pdfkit = require('pdfkit');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const stringSimilarity = require('string-similarity');

// 2. CONFIGURACIÓN INICIAL
const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'database', 'agreements.db');

// Crear el directorio 'database' si no existe
if (!fs.existsSync(path.join(__dirname, 'database'))) {
  fs.mkdirSync(path.join(__dirname, 'database'));
}

// 3. CONECTAR A LA BASE DE DATOS
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    createTables();
  }
});

// 4. MIDDLEWARE
app.use(cors());
app.use(express.json());

// 5. CONFIGURACIÓN DE CORREO (GMAIL REAL)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'jaimehpproyect@gmail.com', 
        pass: 'odfs neee fzih xqge' 
    }
});

// 6. FUNCIÓN PARA CREAR TABLAS
function createTables() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, name TEXT, email TEXT, dni TEXT, dob TEXT, role TEXT NOT NULL DEFAULT 'student', degree_id INTEGER, university_id INTEGER, FOREIGN KEY (degree_id) REFERENCES degrees (id), FOREIGN KEY (university_id) REFERENCES universities (id))`);
    db.run(`CREATE TABLE IF NOT EXISTS universities (id INTEGER PRIMARY KEY, name TEXT NOT NULL)`);
    db.run(`CREATE TABLE IF NOT EXISTS degrees (id INTEGER PRIMARY KEY, name TEXT NOT NULL)`);
    db.run(`CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, credits REAL DEFAULT 6, period TEXT DEFAULT 'S1', degree_id INTEGER, university_id INTEGER, FOREIGN KEY (degree_id) REFERENCES degrees (id), FOREIGN KEY (university_id) REFERENCES universities (id))`);
    db.run(`CREATE TABLE IF NOT EXISTS agreements (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, origin_university_id INTEGER, destination_university_id INTEGER, duration TEXT DEFAULT 'One Semester', status TEXT DEFAULT 'Draft', created_at DATE DEFAULT (datetime('now','localtime')), FOREIGN KEY (user_id) REFERENCES users (id), FOREIGN KEY (origin_university_id) REFERENCES universities (id), FOREIGN KEY (destination_university_id) REFERENCES universities (id))`);
    db.run(`CREATE TABLE IF NOT EXISTS agreement_courses (id INTEGER PRIMARY KEY AUTOINCREMENT, agreement_id INTEGER, origin_course_id INTEGER, destination_course_id INTEGER, FOREIGN KEY (agreement_id) REFERENCES agreements (id), FOREIGN KEY (origin_course_id) REFERENCES courses (id), FOREIGN KEY (destination_course_id) REFERENCES courses (id))`);
    db.run(`CREATE TABLE IF NOT EXISTS announcements (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, image_url TEXT, created_at DATE DEFAULT (datetime('now','localtime')), user_id INTEGER, target_degree_id INTEGER, target_university_id INTEGER, FOREIGN KEY (user_id) REFERENCES users (id), FOREIGN KEY (target_degree_id) REFERENCES degrees (id), FOREIGN KEY (target_university_id) REFERENCES universities (id))`);

    console.log('Tables checked/created successfully.');
    seedDatabase();
  });
}

// 7. DATOS DE EJEMPLO (SEED)
function seedDatabase() {
    db.get("SELECT count(*) as count FROM users", (err, row) => {
        if (row.count > 0) return; 
        console.log("Seeding database...");
        
        const universities = [ { name: "University of Madrid" }, { name: "University of Barcelona" }, { name: "Sorbonne University" }, { name: "University of Berlin" } ];
        const degrees = [ { name: "Computer Science" }, { name: "Business Administration" } ];
        
        universities.forEach(u => db.run("INSERT INTO universities (name) VALUES (?)", [u.name]));
        degrees.forEach(d => db.run("INSERT INTO degrees (name) VALUES (?)", [d.name]));

        const courses = [
            { name: "Fundamentos de Programación", credits: 6, period: 'S1', degree_id: 1, university_id: 1 },
            { name: "Cálculo", credits: 6, period: 'S1', degree_id: 1, university_id: 1 },
            { name: "Introduction to AI", credits: 5, period: 'S1', degree_id: 1, university_id: 3 },
            { name: "Software Engineering", credits: 6, period: 'S2', degree_id: 1, university_id: 4 } 
        ];
        courses.forEach(c => {
            db.run("INSERT INTO courses (name, credits, period, degree_id, university_id) VALUES (?, ?, ?, ?, ?)", 
            [c.name, c.credits, c.period, c.degree_id, c.university_id]);
        });

        const users = [
            { username: 'student', password: 'pass123', name: 'John Doe', email: 'jaimehpproyect@gmail.com', dni: '12345678A', dob: '1995-05-15', role: 'student', degree_id: 1, university_id: 1 },
            { username: 'admin', password: 'admin123', name: 'Admin User', email: 'jaimehpproyect@gmail.com', dni: '00000000A', dob: '1980-01-01', role: 'admin', degree_id: null, university_id: 1 }
        ];
        users.forEach(u => {
            db.run("INSERT INTO users (username, password, name, email, dni, dob, role, degree_id, university_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [u.username, u.password, u.name, u.email, u.dni, u.dob, u.role, u.degree_id, u.university_id]);
        });

        db.run("INSERT INTO announcements (title, content, image_url, user_id) VALUES (?, ?, ?, ?)", 
            ['Welcome!', 'Welcome to the new portal.', null, 2]); 
    });
}

// 8. GENERADOR DE PDF PROFESIONAL (CORREGIDO)
function generateAgreementPDFDoc(data) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new pdfkit({ margin: 40, size: 'A4' });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // --- 1. ENCABEZADO ---
            doc.fontSize(16).font('Helvetica-Bold').text('UNIVERSITY AGREEMENTS PORTAL', { align: 'center' });
            doc.fontSize(12).font('Helvetica').text('LEARNING AGREEMENT / ACUERDO DE ESTUDIOS', { align: 'center' });
            doc.fontSize(10).text('Student Mobility Program', { align: 'center' });
            doc.moveDown(2);

            // --- 2. DATOS DEL ESTUDIANTE ---
            const startY = doc.y;
            doc.rect(40, startY, 515, 95).stroke(); 
            
            doc.font('Helvetica-Bold').fontSize(10);
            doc.text('STUDENT DATA / DATOS DEL ESTUDIANTE', 50, startY + 10);
            doc.moveDown(0.5);

            const col1X = 50;
            const col2X = 300;
            let currentY = doc.y;

            doc.font('Helvetica').fontSize(9);
            doc.text(`Name: ${data.studentName}`, col1X, currentY);
            doc.text(`DNI/ID: ${data.studentDni}`, col2X, currentY);
            currentY += 15;
            doc.text(`Email: ${data.studentEmail}`, col1X, currentY);
            doc.text(`DOB: ${data.dob || 'N/A'}`, col2X, currentY);
            currentY += 15;
            doc.text(`Origin Institution: ${data.originUni}`, col1X, currentY);
            currentY += 15;
            doc.text(`Destination Institution: ${data.destUni}`, col1X, currentY);
            currentY += 15;
            doc.text(`Duration: ${data.duration}`, col1X, currentY);
            
            doc.moveDown(4);

            // --- 3. ESTADO DEL ACUERDO ---
            let statusColor = data.status === 'Approved' ? 'green' : (data.status === 'Rejected' ? 'red' : 'grey');
            doc.font('Helvetica-Bold').fontSize(12).fillColor(statusColor)
               .text(`STATUS: ${data.status.toUpperCase()}`, { align: 'right' });
            doc.fillColor('black').moveDown();

            // --- 4. TABLA DE ASIGNATURAS ---
            const tableTop = doc.y;
            const itemHeight = 20;
            
            const colCodeDest = 40;
            const colNameDest = 90;
            const colCredDest = 250;
            const colCodeOrig = 290;
            const colNameOrig = 340;
            const colCredOrig = 510;

            // Cabecera
            doc.rect(40, tableTop, 515, 30).fill('#e0e0e0').stroke();
            doc.fillColor('black').font('Helvetica-Bold').fontSize(8);
            
            doc.text('DESTINATION UNIVERSITY', colCodeDest + 5, tableTop + 5);
            doc.text('ORIGIN UNIVERSITY (Recognition)', colCodeOrig + 5, tableTop + 5);
            
            doc.text('Code', colCodeDest + 5, tableTop + 18);
            doc.text('Subject Name', colNameDest + 5, tableTop + 18);
            doc.text('ECTS', colCredDest + 5, tableTop + 18);
            
            doc.text('Code', colCodeOrig + 5, tableTop + 18);
            doc.text('Subject Name', colNameOrig + 5, tableTop + 18);
            doc.text('ECTS', colCredOrig + 5, tableTop + 18);

            let yPosition = tableTop + 30;
            
            // VARIABLES CORREGIDAS PARA SUMA INDEPENDIENTE
            let totalDestCredits = 0;
            let totalOrigCredits = 0;

            doc.font('Helvetica').fontSize(8);
            
            if (data.courses_list && data.courses_list.length > 0) {
                data.courses_list.forEach((pair, i) => {
                    // Caja de fila
                    doc.rect(40, yPosition, 515, itemHeight).stroke();
                    
                    // Datos Destino
                    const destCred = pair.destination_credits || 6.0; // Valor por defecto si es null
                    doc.text(pair.destination_course_id, colCodeDest + 5, yPosition + 6);
                    doc.text(pair.destination_name.substring(0, 35), colNameDest + 5, yPosition + 6);
                    doc.text(destCred.toFixed(1), colCredDest + 5, yPosition + 6);
                    
                    // Datos Origen
                    const origCred = pair.origin_credits || 6.0; // Valor por defecto si es null
                    doc.text(pair.origin_course_id, colCodeOrig + 5, yPosition + 6);
                    doc.text(pair.origin_name.substring(0, 35), colNameOrig + 5, yPosition + 6);
                    doc.text(origCred.toFixed(1), colCredOrig + 5, yPosition + 6);

                    // Suma independiente
                    totalDestCredits += destCred;
                    totalOrigCredits += origCred;

                    yPosition += itemHeight;
                });
            } else {
                doc.rect(40, yPosition, 515, itemHeight).stroke();
                doc.text('No courses selected', colNameDest + 5, yPosition + 6);
                yPosition += itemHeight;
            }

            // --- 5. TOTALES (CORREGIDO) ---
            doc.rect(40, yPosition, 515, 20).fill('#f0f0f0').stroke();
            doc.fillColor('black').font('Helvetica-Bold');
            doc.text('TOTAL CREDITS:', colNameDest + 5, yPosition + 6);
            
            // Mostrar los totales independientes
            doc.text(totalDestCredits.toFixed(1), colCredDest + 5, yPosition + 6);
            doc.text(totalOrigCredits.toFixed(1), colCredOrig + 5, yPosition + 6);

            // --- 6. FIRMAS ---
            const bottomY = 700; 
            doc.fontSize(10).font('Helvetica');
            doc.text('Date: ' + new Date().toLocaleDateString(), 40, bottomY - 20);

            doc.text('__________________________', 60, bottomY);
            doc.text('Student Signature', 80, bottomY + 10);
            
            doc.text('__________________________', 350, bottomY);
            doc.text('Coordinator Signature', 370, bottomY + 10);

            doc.end();
        } catch (err) { reject(err); }
    });
}

// 9. HELPER: Obtener datos completos del acuerdo
function getFullAgreementData(agreementId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT a.id, a.status, a.created_at, a.duration, 
                   o.name as originUni, d.name as destUni,
                   u.name as studentName, u.email as studentEmail, u.dni as studentDni, u.dob
            FROM agreements a
            JOIN universities o ON a.origin_university_id = o.id
            JOIN universities d ON a.destination_university_id = d.id
            JOIN users u ON a.user_id = u.id
            WHERE a.id = ?
        `;
        db.get(sql, [agreementId], (err, row) => {
            if (err) return reject(err);
            if (!row) return reject(new Error('Agreement not found'));
            
            const coursesSql = `
                SELECT 
                    o.id as origin_course_id, o.name as origin_name, o.credits as origin_credits,
                    d.id as destination_course_id, d.name as destination_name, d.credits as destination_credits
                FROM agreement_courses ac
                JOIN courses o ON ac.origin_course_id = o.id
                JOIN courses d ON ac.destination_course_id = d.id
                WHERE ac.agreement_id = ?
            `;
            db.all(coursesSql, [agreementId], (err, courses) => {
                if (err) return reject(err);
                row.courses_list = courses;
                row.created = new Date(row.created_at).toLocaleDateString();
                resolve(row);
            });
        });
    });
}

// 10. HELPER: getCoursePairsForAgreement
function getCoursePairsForAgreement(agreementId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT o.name as origin_name, d.name as destination_name
      FROM agreement_courses ac
      JOIN courses o ON ac.origin_course_id = o.id
      JOIN courses d ON ac.destination_course_id = d.id
      WHERE ac.agreement_id = ?
    `;
    db.all(sql, [agreementId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// ==========================================
// ENDPOINTS API
// ==========================================

// LOGIN
app.post('/api/login', (req, res) => {
  db.get("SELECT * FROM users WHERE username = ? AND password = ?", [req.body.username, req.body.password], (err, user) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (!user) return res.status(401).json({ message: 'Invalid username or password.' });
    res.json({ userId: user.id, role: user.role, token: `fake-jwt-token-for-user-${user.id}` });
  });
});

// PROFILE
app.get('/api/profile/:userId', (req, res) => {
  const sql = `
    SELECT u.name, u.username, u.email, u.dni, u.dob, u.role, 
           d.id as degree_id, d.name as degree_name, 
           uni.id as university_id, uni.name as university_name
    FROM users u
    LEFT JOIN degrees d ON u.degree_id = d.id
    LEFT JOIN universities uni ON u.university_id = uni.id
    WHERE u.id = ?
  `;
  db.get(sql, [req.params.userId], (err, row) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (!row) return res.status(404).json({ message: 'User not found' });
    
    res.json({
      name: row.name, username: row.username, email: row.email, dni: row.dni, dob: row.dob, role: row.role,
      degree: row.degree_id ? { id: row.degree_id, name: row.degree_name } : null,
      university: { id: row.university_id, name: row.university_name }
    });
  });
});

// GET DATA
app.get('/api/universities', (req, res) => { db.all("SELECT * FROM universities ORDER BY name", [], (err, rows) => res.json(rows)); });
app.get('/api/degrees', (req, res) => { db.all("SELECT * FROM degrees ORDER BY name", [], (err, rows) => res.json(rows)); });
app.get('/api/courses', (req, res) => {
    const { degreeId, universityId } = req.query;
    if (!degreeId || !universityId) return res.status(400).json({ message: 'Missing params' });
    db.all("SELECT id, name, credits, period FROM courses WHERE degree_id = ? AND university_id = ?", [degreeId, universityId], (err, rows) => {
        res.json(rows);
    });
});

// ANNOUNCEMENTS
app.get('/api/announcements', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'UserId required' });

    db.get("SELECT role, degree_id, university_id FROM users WHERE id = ?", [userId], (err, user) => {
        if (!user) return res.status(404).json({ message: 'User not found' });

        let sql = `
            SELECT a.id, a.title, a.content, a.image_url, a.created_at, u.name as authorName,
                   td.name as targetDegreeName, tu.name as targetUniversityName
            FROM announcements a
            JOIN users u ON a.user_id = u.id
            LEFT JOIN degrees td ON a.target_degree_id = td.id
            LEFT JOIN universities tu ON a.target_university_id = tu.id
        `;
        
        const params = [];
        if (user.role !== 'admin') {
            sql += ` WHERE (a.target_degree_id IS NULL AND a.target_university_id IS NULL) 
                     OR (a.target_degree_id = ?) OR (a.target_university_id = ?)`;
            params.push(user.degree_id, user.university_id);
        }
        sql += ' ORDER BY a.created_at DESC';

        db.all(sql, params, (err, rows) => {
            const announcements = rows.map(row => ({
                ...row,
                created_at: new Date(row.created_at).toLocaleDateString()
            }));
            res.json(announcements);
        });
    });
});

// STUDENT AGREEMENTS
app.get('/api/agreements/:userId', async (req, res) => {
  const sql = `SELECT a.id, a.status, a.created_at, a.duration, o.name as originUni, d.name as destUni FROM agreements a JOIN universities o ON a.origin_university_id = o.id JOIN universities d ON a.destination_university_id = d.id WHERE a.user_id = ? ORDER BY a.created_at DESC`;
  db.all(sql, [req.params.userId], async (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error' });
    try {
      const agreements = await Promise.all(rows.map(async (row) => {
        const coursePairs = await getCoursePairsForAgreement(row.id);
        return { ...row, courses_list: coursePairs, created: new Date(row.created_at).toLocaleDateString() };
      }));
      res.json(agreements);
    } catch (error) { res.status(500).json({ message: 'Error' }); }
  });
});

// POST AGREEMENT
app.post('/api/agreements', (req, res) => {
    const { userId, originUniversity, destinationUniversity, duration, coursePairs } = req.body;
    const agreementSql = "INSERT INTO agreements (user_id, origin_university_id, destination_university_id, duration, status) VALUES (?, ?, ?, ?, 'Draft')";
    
    db.run(agreementSql, [userId, originUniversity, destinationUniversity, duration], function(err) {
        if (err) return res.status(500).json({ message: 'DB Error' });
        const agreementId = this.lastID;

        const stmt = db.prepare("INSERT INTO agreement_courses (agreement_id, origin_course_id, destination_course_id) VALUES (?, ?, ?)");
        coursePairs.forEach(p => stmt.run(agreementId, p.originId, p.destId));
        
        stmt.finalize(async () => {
            try {
                const fullData = await getFullAgreementData(agreementId);
                const pdfBuffer = await generateAgreementPDFDoc(fullData);

                if (fullData.studentEmail) {
                    await transporter.sendMail({
                        from: '"University Agreements" <jaimehpproyect@gmail.com>',
                        to: fullData.studentEmail,
                        subject: `Agreement Created #${agreementId}`,
                        text: `Hello ${fullData.studentName},\n\nAgreement created. PDF attached.`,
                        attachments: [{ filename: `Agreement_${agreementId}.pdf`, content: pdfBuffer }]
                    });
                }
                res.status(201).json({ message: 'Created', agreementId });
            } catch (e) {
                console.error("Email error:", e);
                res.status(201).json({ message: 'Created (Email failed)', agreementId });
            }
        });
    });
});

// DOWNLOAD PDF
app.get('/api/agreements/:id/download', async (req, res) => {
    try {
        const data = await getFullAgreementData(req.params.id);
        const pdf = await generateAgreementPDFDoc(data);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Agreement_${req.params.id}.pdf`);
        res.send(pdf);
    } catch (e) { res.status(500).send('Error generating PDF'); }
});

// ADMIN SEARCH
app.get('/api/admin/agreements/search', (req, res) => {
  const { query } = req.query;
  let sql = `SELECT a.id, a.status, a.created_at, a.duration, o.name as originUni, d.name as destUni, s.name as studentName FROM agreements a JOIN universities o ON a.origin_university_id = o.id JOIN universities d ON a.destination_university_id = d.id JOIN users s ON a.user_id = s.id`;
  const params = [];
  if (query) { sql += ' WHERE (s.name LIKE ? OR s.username LIKE ?)'; params.push(`%${query}%`, `%${query}%`); } 
  else { sql += ' WHERE a.status = ?'; params.push('Draft'); }
  sql += ' ORDER BY a.created_at DESC';

  db.all(sql, params, async (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error' });
    const agreements = await Promise.all(rows.map(async (row) => {
        const coursePairs = await getCoursePairsForAgreement(row.id);
        return { ...row, courses_list: coursePairs, created: new Date(row.created_at).toLocaleDateString() };
    }));
    res.json(agreements);
  });
});

// ADMIN UPDATE STATUS
app.put('/api/admin/agreements/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.run("UPDATE agreements SET status = ? WHERE id = ?", [status, id], async function(err) {
        if (err) return res.status(500).json({ message: 'Error' });
        try {
            const fullData = await getFullAgreementData(id);
            const pdfBuffer = await generateAgreementPDFDoc(fullData);
            if (fullData.studentEmail) {
                await transporter.sendMail({
                    from: '"University Agreements" <jaimehpproyect@gmail.com>',
                    to: fullData.studentEmail,
                    subject: `Status Update: ${status}`,
                    text: `Status updated to ${status}. PDF attached.`,
                    attachments: [{ filename: `Agreement_${id}.pdf`, content: pdfBuffer }]
                });
            }
            res.json({ message: 'Updated' });
        } catch (e) { res.json({ message: 'Updated (Email failed)' }); }
    });
});

// ADMIN CREATIONS
app.post('/api/admin/courses/new', (req, res) => {
    const { name, degree_id, university_id, credits, period } = req.body;
    db.run("INSERT INTO courses (name, degree_id, university_id, credits, period) VALUES (?, ?, ?, ?, ?)", [name, degree_id, university_id, credits, period], function(err){
        if(err) return res.status(500).json({message:'Error'}); res.json({message:'Created', id: this.lastID});
    });
});
app.post('/api/admin/users/new', (req, res) => {
    const { username, password, name, email, dni, dob, role, degree_id, university_id } = req.body;
    db.run("INSERT INTO users (username, password, name, email, dni, dob, role, degree_id, university_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
           [username, password, name, email, dni, dob, role, role==='student'?degree_id:null, university_id],
           function(err) { if(err) return res.status(500).json({message:'Error'}); res.json({message:'Created', id: this.lastID}); });
});
app.post('/api/admin/universities/new', (req, res) => {
    db.run("INSERT INTO universities (name) VALUES (?)", [req.body.name], function(err){ res.json({message:'Created', id: this.lastID}); });
});
app.post('/api/admin/degrees/new', (req, res) => {
    db.run("INSERT INTO degrees (name) VALUES (?)", [req.body.name], function(err){ res.json({message:'Created', id: this.lastID}); });
});
app.post('/api/admin/announcements/new', (req, res) => {
    const { title, content, image_url, user_id, target_degree_id, target_university_id } = req.body;
    db.run("INSERT INTO announcements (title, content, image_url, user_id, target_degree_id, target_university_id) VALUES (?, ?, ?, ?, ?, ?)",
           [title, content, image_url, user_id, target_degree_id || null, target_university_id || null],
           function(err){ res.json({message:'Created', id: this.lastID}); });
});
app.delete('/api/admin/announcements/:id', (req, res) => {
    db.run("DELETE FROM announcements WHERE id = ?", [req.params.id], function(err){ res.json({message:'Deleted'}); });
});

// --- ALGORITMO DE RECOMENDACIÓN (COMPLEX FUNCTIONALITY + 3RD PARTY) ---
app.post('/api/recommendations', (req, res) => {
    const { originCourseId, destUniId } = req.body;

    if (!originCourseId || !destUniId) {
        return res.status(400).json({ message: 'Missing params' });
    }

    // 1. Obtener el nombre del curso de origen
    db.get("SELECT name FROM courses WHERE id = ?", [originCourseId], (err, originCourse) => {
        if (err || !originCourse) return res.status(404).json({ message: 'Origin course not found' });

        // 2. Obtener todos los cursos de la universidad de destino
        db.all("SELECT id, name, credits FROM courses WHERE university_id = ?", [destUniId], (err, destCourses) => {
            if (err) return res.status(500).json({ message: 'DB Error' });
            if (destCourses.length === 0) return res.json([]);

            // 3. LÓGICA COMPLEJA: Algoritmo de Coincidencia (String Matching)
            const matches = stringSimilarity.findBestMatch(
                originCourse.name, 
                destCourses.map(c => c.name)
            );

            // 4. Filtrar y Enriquecer resultados
            // Solo devolvemos cursos con cierta similitud (> 0.3) o los 3 mejores si no hay nada muy bueno
            const recommendations = matches.ratings
                .map((rating, index) => ({
                    ...destCourses[index],
                    score: rating.rating // Valor entre 0 y 1
                }))
                .filter(item => item.score > 0.2) // Umbral de corte (Heurística)
                .sort((a, b) => b.score - a.score) // Ordenar por mejor coincidencia
                .slice(0, 3); // Top 3

            res.json(recommendations);
        });
    });
});

// --- NUEVO: ESTADÍSTICAS PARA ADMIN (Chart.js Support) ---
app.get('/api/admin/stats', (req, res) => {
    const stats = {
        statusCounts: {},
        topDestinations: []
    };

    // 1. Contar acuerdos por estado (Draft, Approved, Rejected)
    db.all("SELECT status, COUNT(*) as count FROM agreements GROUP BY status", [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error stats' });
        
        rows.forEach(row => {
            stats.statusCounts[row.status] = row.count;
        });

        // 2. Contar destinos más populares
        const sqlDest = `
            SELECT u.name, COUNT(*) as count 
            FROM agreements a
            JOIN universities u ON a.destination_university_id = u.id
            GROUP BY u.name
            ORDER BY count DESC
            LIMIT 5
        `;
        db.all(sqlDest, [], (err, destRows) => {
            if (err) return res.status(500).json({ message: 'Error stats' });
            stats.topDestinations = destRows;
            
            res.json(stats);
        });
    });
});

// 11. INICIAR
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});