<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('qoe_metrics', 'serving_cell')) {
            Schema::table('qoe_metrics', function (Blueprint $table) {
                $table->json('serving_cell')->nullable()->after('scores');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('qoe_metrics', function (Blueprint $table) {
            $table->dropColumn('serving_cell');
        });
    }
};