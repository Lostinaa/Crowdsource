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
        Schema::create('coverage_samples', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->timestamp('timestamp');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->float('accuracy')->nullable();
            $table->string('network_type')->nullable(); // e.g. "5G NR", "4G LTE"
            $table->string('network_category', 10)->nullable(); // e.g. "5G", "4G"
            $table->string('rsrp')->nullable();
            $table->string('rsrq')->nullable();
            $table->string('rssnr')->nullable();
            $table->string('cqi')->nullable();
            $table->string('enb')->nullable();
            $table->string('cell_id')->nullable();
            $table->string('pci')->nullable();
            $table->string('tac')->nullable();
            $table->string('eci')->nullable();
            $table->json('raw')->nullable();
            $table->timestamps();

            $table->index('timestamp');
            $table->index(['latitude', 'longitude']);
            $table->index(['network_category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coverage_samples');
    }
};





