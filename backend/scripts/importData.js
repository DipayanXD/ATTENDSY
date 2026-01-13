const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('Usage: node importData.js <data.json>');
        process.exit(1);
    }

    const filePath = path.resolve(args[0]);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log('[IMPORT] Starting import...');

    // Handle different formats
    const users = data.users || (Array.isArray(data) ? data : []);
    const courses = data.courses || [];
    const enrollments = data.enrollments || [];

    // Import Users
    if (users.length > 0) {
        console.log(`[IMPORT] Importing ${users.length} users...`);
        for (const user of users) {
            await prisma.user.upsert({
                where: { email: user.email },
                update: {
                    full_name: user.full_name,
                    role: user.role || 'student',
                    device_id: user.device_id
                },
                create: {
                    full_name: user.full_name,
                    email: user.email,
                    password_hash: user.password || 'temporary_password',
                    role: user.role || 'student',
                    device_id: user.device_id
                }
            });
        }
        console.log(`[IMPORT] ✓ Imported ${users.length} users`);
    }

    // Import Courses
    if (courses.length > 0) {
        console.log(`[IMPORT] Importing ${courses.length} courses...`);
        for (const course of courses) {
            // Find teacher by email if provided, otherwise get first teacher
            let teacher;
            if (course.teacher_email) {
                teacher = await prisma.user.findUnique({
                    where: { email: course.teacher_email }
                });
            }

            if (!teacher) {
                teacher = await prisma.user.findFirst({
                    where: { role: 'teacher' }
                });
            }

            if (!teacher) {
                console.warn('[IMPORT] No teacher found to assign course to. Skipping course:', course.course_code);
                continue;
            }

            await prisma.course.upsert({
                where: { course_code: course.course_code },
                update: {
                    course_name: course.course_name,
                    description: course.description,
                    teacher_id: teacher.id
                },
                create: {
                    course_name: course.course_name,
                    course_code: course.course_code,
                    description: course.description,
                    teacher_id: teacher.id
                }
            });
        }
        console.log(`[IMPORT] ✓ Imported ${courses.length} courses`);
    }

    // Import Enrollments
    if (enrollments.length > 0) {
        console.log(`[IMPORT] Importing enrollments...`);
        let enrollmentCount = 0;

        for (const enrollment of enrollments) {
            const course = await prisma.course.findUnique({
                where: { course_code: enrollment.course_code }
            });

            if (!course) {
                console.warn(`[IMPORT] Course ${enrollment.course_code} not found. Skipping enrollments.`);
                continue;
            }

            for (const studentEmail of enrollment.student_emails) {
                const student = await prisma.user.findUnique({
                    where: { email: studentEmail }
                });

                if (!student) {
                    console.warn(`[IMPORT] Student ${studentEmail} not found. Skipping.`);
                    continue;
                }

                try {
                    await prisma.enrollment.upsert({
                        where: {
                            course_id_student_id: {
                                course_id: course.id,
                                student_id: student.id
                            }
                        },
                        update: {},
                        create: {
                            course_id: course.id,
                            student_id: student.id
                        }
                    });
                    enrollmentCount++;
                } catch (e) {
                    // Ignore duplicate enrollment errors
                    if (!e.code || e.code !== 'P2002') {
                        console.warn(`[IMPORT] Error enrolling ${studentEmail} to ${enrollment.course_code}:`, e.message);
                    }
                }
            }
        }
        console.log(`[IMPORT] ✓ Processed ${enrollmentCount} enrollments`);
    }

    console.log('[IMPORT] ✅ Completed successfully.');
}

main()
    .catch(e => {
        console.error('[IMPORT] Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
