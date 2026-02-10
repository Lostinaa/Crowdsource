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
        Schema::table('qoe_metrics', function (Blueprint $table) {
            $table->string('region')->nullable()->index()->after('location');
        });

        Schema::table('coverage_samples', function (Blueprint $table) {
            $table->string('region')->nullable()->index()->after('enb');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('qoe_metrics', function (Blueprint $table) {
            $table->dropColumn('region');
        });

        Schema::table('coverage_samples', function (Blueprint $table) {
            $table->dropColumn('region');
        });
    }
};
