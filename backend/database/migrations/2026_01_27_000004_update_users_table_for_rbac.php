<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Check if role column exists before trying to migrate
        if (Schema::hasColumn('users', 'role')) {
            // First, add role_id column
            Schema::table('users', function (Blueprint $table) {
                $table->foreignId('role_id')->nullable()->after('email');
            });

            // Migrate existing role strings to role_id
            $adminRoleId = DB::table('roles')->where('name', 'admin')->value('id');
            $userRoleId = DB::table('roles')->where('name', 'viewer')->value('id'); // Default to viewer

            if ($adminRoleId && $userRoleId) {
                DB::table('users')->where('role', 'admin')->update(['role_id' => $adminRoleId]);
                DB::table('users')->where('role', '!=', 'admin')->orWhereNull('role')->update(['role_id' => $userRoleId]);
            }

            // Now drop old role column
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('role');
            });
        } else {
            // Role column doesn't exist, just add role_id
            Schema::table('users', function (Blueprint $table) {
                $table->foreignId('role_id')->nullable()->after('email');
            });
        }

        // Add foreign key constraint
        Schema::table('users', function (Blueprint $table) {
            $table->foreign('role_id')->references('id')->on('roles')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropColumn('role_id');
            $table->string('role')->default('user')->after('email');
        });
    }
};
