<?php

namespace App\Console\Commands;

use App\Models\QoeMetric;
use App\Models\CoverageSample;
use App\Services\RegionHelper;
use Illuminate\Console\Command;

class ReassignRegions extends Command
{
    protected $signature = 'regions:reassign {--dry-run : Show what would change without updating}';
    protected $description = 'Re-assign Ethio Telecom zone codes for all records using updated RegionHelper';

    public function handle()
    {
        $dryRun = $this->option('dry-run');
        $this->info($dryRun ? '🔍 Dry run mode — no changes will be made' : '🔄 Reassigning regions...');

        // Process QoeMetrics
        $metrics = QoeMetric::all();
        $metricsUpdated = 0;
        $metricsSkipped = 0;

        $this->info("Processing {$metrics->count()} QoE metrics...");
        foreach ($metrics as $metric) {
            $lat = $metric->location['latitude'] ?? null;
            $lon = $metric->location['longitude'] ?? null;

            if (!$lat || !$lon) {
                $metricsSkipped++;
                continue;
            }

            $newRegion = RegionHelper::getRegion($lat, $lon);
            if ($metric->region !== $newRegion) {
                if (!$dryRun) {
                    $metric->region = $newRegion;
                    $metric->save();
                }
                $metricsUpdated++;
                if ($dryRun) {
                    $this->line("  Metric #{$metric->id}: {$metric->region} → {$newRegion} (lat={$lat}, lon={$lon})");
                }
            }
        }

        $this->info("QoE Metrics: {$metricsUpdated} updated, {$metricsSkipped} skipped (no location)");

        // Process CoverageSamples
        $samples = CoverageSample::all();
        $samplesUpdated = 0;
        $samplesSkipped = 0;

        $this->info("Processing {$samples->count()} coverage samples...");
        foreach ($samples as $sample) {
            $lat = $sample->latitude ?? null;
            $lon = $sample->longitude ?? null;

            if (!$lat || !$lon) {
                $samplesSkipped++;
                continue;
            }

            $newRegion = RegionHelper::getRegion($lat, $lon);
            if ($sample->region !== $newRegion) {
                if (!$dryRun) {
                    $sample->region = $newRegion;
                    $sample->save();
                }
                $samplesUpdated++;
                if ($dryRun) {
                    $this->line("  Sample #{$sample->id}: {$sample->region} → {$newRegion} (lat={$lat}, lon={$lon})");
                }
            }
        }

        $this->info("Coverage Samples: {$samplesUpdated} updated, {$samplesSkipped} skipped (no location)");

        if ($dryRun) {
            $this->warn('Run without --dry-run to apply changes.');
        } else {
            $this->info('✅ All regions reassigned successfully!');
        }

        return 0;
    }
}
