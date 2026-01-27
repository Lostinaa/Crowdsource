<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained()->onDelete('cascade');
            $table->foreignId('permission_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            $table->unique(['role_id', 'permission_id']);
        });

        // Assign permissions to roles
        $rolePermissions = [
            // Admin gets all permissions
            'admin' => [
                'view_dashboard', 'view_metrics', 'manage_metrics',
                'view_coverage', 'manage_coverage', 'view_analytics',
                'manage_users', 'manage_roles', 'export_data', 'view_audit_logs',
            ],
            // Operator gets most permissions except user/role management
            'operator' => [
                'view_dashboard', 'view_metrics', 'manage_metrics',
                'view_coverage', 'manage_coverage', 'view_analytics',
                'export_data',
            ],
            // Viewer gets read-only permissions
            'viewer' => [
                'view_dashboard', 'view_metrics', 'view_coverage', 'view_analytics',
            ],
        ];

        foreach ($rolePermissions as $roleName => $permissionNames) {
            $roleId = DB::table('roles')->where('name', $roleName)->value('id');
            foreach ($permissionNames as $permissionName) {
                $permissionId = DB::table('permissions')->where('name', $permissionName)->value('id');
                if ($roleId && $permissionId) {
                    DB::table('role_permissions')->insert([
                        'role_id' => $roleId,
                        'permission_id' => $permissionId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('role_permissions');
    }
};
