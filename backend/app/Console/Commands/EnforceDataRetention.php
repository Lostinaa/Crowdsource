<?php

namespace App\Console\Commands;

use App\Models\QoeMetric;
use App\Models\CoverageSample;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class EnforceDataRetention extends Command
{
    protected $signature = 'data:enforce-retention {--months=18 : Number of months to retain data}';
    protected $description = 'Enforce data retention policy by archiving/deleting old data';

    public function handle(): int
    {
        $months = (int) $this->option('months');
        $cutoffDate = Carbon::now()->subMonths($months);

        $this->info("Enforcing data retention: deleting data older than {$months} months (before {$cutoffDate->format('Y-m-d')})");

        // Archive old QoE metrics
        $deletedMetrics = QoeMetric::where('created_at', '<', $cutoffDate)->delete();
        $this->info("Deleted {$deletedMetrics} old QoE metrics");

        // Archive old coverage samples
        $deletedSamples = CoverageSample::where('created_at', '<', $cutoffDate)->delete();
        $this->info("Deleted {$deletedSamples} old coverage samples");

        // Optionally archive audit logs older than 12 months
        $auditCutoff = Carbon::now()->subMonths(12);
        $deletedAudits = DB::table('audit_logs')->where('created_at', '<', $auditCutoff)->delete();
        $this->info("Deleted {$deletedAudits} old audit logs");

        $this->info("Data retention enforcement completed.");
        return Command::SUCCESS;
    }
}
