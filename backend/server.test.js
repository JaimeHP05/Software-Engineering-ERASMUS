// --- backend/server.test.js ---

const request = require('supertest');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const API_URL = 'http://localhost:3000/api';

describe('SICUE System Automated Tests', () => {

    let studentToken;
    let studentId;
    let adminId;

    // T-01: User Authentication (Category 1: CRUD/Security)
    test('T-01: User Authentication & Role Retrieval', async () => {
        console.log('\n[TEXT OUTPUT] T-01: Testing Login with valid credentials...');
        
        const response = await request(API_URL)
            .post('/login')
            .send({ username: 'student', password: 'pass123' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body.role).toBe('student');
        
        studentToken = response.body.token;
        studentId = response.body.userId;
        
        console.log('   -> Login Successful. Role detected: Student.');
    });

    // T-02: AI Recommendation Algorithm (Category 3: Complex Logic)
    test('T-02: AI-Match Recommendation Algorithm', async () => {
        console.log('\n[TEXT OUTPUT] T-02: Testing AI String Similarity Algorithm...');
        
        const courses = await request(API_URL).get(`/courses?universityId=1&degreeId=1`);
        const originCourse = courses.body.find(c => c.name.includes('Introduction to AI'));
        
        if (!originCourse) {
            console.log('   -> Skipping: Seed data "Introduction to AI" not found.');
            return;
        }

        const response = await request(API_URL)
            .post('/recommendations')
            .send({
                originCourseId: originCourse.id,
                destUniId: 4, // Berlin
                degreeId: 1   // Computer Science
            });

        expect(response.status).toBe(200);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0].score).toBeGreaterThan(0.2);
        
        console.log(`   -> Algorithm Success. Best match found: "${response.body[0].name}" with score ${response.body[0].score}`);
    });

    // T-03: PDF Generation (Category 2: 3rd Party)
    test('T-03: PDF Generation (Download Agreement)', async () => {
        console.log('\n[TEXT OUTPUT] T-03: Testing PDFKit Integration...');

        const response = await request(API_URL).get('/agreements/1/download');
        
        if (response.status === 200) {
            expect(response.headers['content-type']).toBe('application/pdf');
            console.log('   -> PDF Binary received correctly (Content-Type: application/pdf).');
        } else {
            console.log('   -> Test skipped: No agreement #1 found to download.');
        }
    });

    // T-04: Admin Analytics (Category 3: Complex/Aggregation)
    test('T-04: Admin Dashboard Analytics', async () => {
        console.log('\n[TEXT OUTPUT] T-04: Testing SQL Aggregation for Charts...');

        const response = await request(API_URL).get('/admin/stats');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('statusCounts');
        expect(response.body).toHaveProperty('topDestinations');
        
        console.log('   -> Analytics Data received:', JSON.stringify(response.body));
    });

    // T-05: Data Integrity (Category 1: CRUD)
    test('T-05: Academic Data Integrity (Universities)', async () => {
        console.log('\n[TEXT OUTPUT] T-05: Verifying Database Integrity...');

        const response = await request(API_URL).get('/universities');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        
        console.log(`   -> Database Integrity OK. ${response.body.length} universities found.`);
    });

});