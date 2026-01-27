<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // e.g., 'view_metrics', 'manage_users'
            $table->string('display_name');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Insert default permissions
        $permissions = [
            ['name' => 'view_dashboard', 'display_name' => 'View Dashboard', 'description' => 'Access dashboard'],
            ['name' => 'view_metrics', 'display_name' => 'View Metrics', 'description' => 'View QoE metrics'],
            ['name' => 'manage_metrics', 'display_name' => 'Manage Metrics', 'description' => 'Create/edit/delete metrics'],
            ['name' => 'view_coverage', 'display_name' => 'View Coverage', 'description' => 'View coverage samples'],
            ['name' => 'manage_coverage', 'display_name' => 'Manage Coverage', 'description' => 'Create/edit/delete coverage samples'],
            ['name' => 'view_analytics', 'display_name' => 'View Analytics', 'description' => 'View analytics reports'],
            ['name' => 'manage_users', 'display_name' => 'Manage Users', 'description' => 'Create/edit/delete users'],
            ['name' => 'manage_roles', 'display_name' => 'Manage Roles', 'description' => 'Manage roles and permissions'],
            ['name' => 'export_data', 'display_name' => 'Export Data', 'description' => 'Export reports and data'],
            ['name' => 'view_audit_logs', 'display_name' => 'View Audit Logs', 'description' => 'View audit logs'],
        ];

        foreach ($permissions as $permission) {
            DB::table('permissions')->insert([
                ...$permission,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('permissions');
    }
};
