import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { employees } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/admin/employees/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const employeeId = parseInt(id);

        const [employee] = await db
            .select()
            .from(employees)
            .where(eq(employees.id, employeeId))
            .limit(1);

        if (!employee) {
            return NextResponse.json(
                { error: 'Employee not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(employee);
    } catch (error) {
        console.error('Get employee error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT /api/admin/employees/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const employeeId = parseInt(id);
        const body = await request.json();

        const [updated] = await db
            .update(employees)
            .set({
                name: body.name,
                email: body.email?.toLowerCase(),
                phone: body.phone,
                position: body.position,
                department: body.department,
                hireDate: body.hireDate ? new Date(body.hireDate) : undefined,
                salary: body.salary,
                status: body.status,
                avatar: body.avatar,
            })
            .where(eq(employees.id, employeeId))
            .returning();

        if (!updated) {
            return NextResponse.json(
                { error: 'Employee not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Update employee error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/employees/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const employeeId = parseInt(id);

        const [deleted] = await db
            .delete(employees)
            .where(eq(employees.id, employeeId))
            .returning();

        if (!deleted) {
            return NextResponse.json(
                { error: 'Employee not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete employee error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
