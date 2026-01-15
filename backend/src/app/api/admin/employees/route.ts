import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { employees } from '@/db/schema';
import { desc, like, or, eq } from 'drizzle-orm';

// GET /api/admin/employees - List all employees
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const department = searchParams.get('department');
        const status = searchParams.get('status');

        let conditions = [];
        if (search) {
            conditions.push(
                or(
                    like(employees.name, `%${search}%`),
                    like(employees.email, `%${search}%`),
                    like(employees.position, `%${search}%`)
                )
            );
        }
        if (department) {
            conditions.push(eq(employees.department, department));
        }
        if (status) {
            conditions.push(eq(employees.status, status));
        }

        const result = await db
            .select()
            .from(employees)
            .orderBy(desc(employees.createdAt));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Get employees error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/admin/employees - Create new employee
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, phone, position, department, hireDate, salary, status, avatar } = body;

        if (!name) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            );
        }

        const [newEmployee] = await db
            .insert(employees)
            .values({
                name,
                email: email?.toLowerCase(),
                phone,
                position,
                department,
                hireDate: hireDate ? new Date(hireDate) : undefined,
                salary,
                status: status || 'active',
                avatar,
            })
            .returning();

        return NextResponse.json(newEmployee, { status: 201 });
    } catch (error: any) {
        if (error.code === '23505') {
            return NextResponse.json(
                { error: 'Employee with this email already exists' },
                { status: 409 }
            );
        }
        console.error('Create employee error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
