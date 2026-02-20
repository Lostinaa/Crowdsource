{{-- Enhanced Analytics Widget Blade --}}
<x-filament-widgets::widget>
    <x-filament::section>
        <x-slot name="heading">
            Enhanced QoE Analytics
        </x-slot>

        @php
            $voice = $this->getVoiceData();
            $data  = $this->getDataAnalytics();
            $fmt = fn($v, $dec = 1) => $v !== null ? number_format($v, $dec) : '—';
            $fmtPct = fn($v) => $v !== null ? number_format($v, 1) . '%' : '—';
        @endphp

        {{-- ─── Voice Analytics ──────────────────────────────────────────── --}}
        <div class="mb-6">
            <h3 class="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                Voice Analytics
            </h3>
            <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table class="w-full text-sm">
                    <thead class="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            @foreach(['Metric','Value'] as $h)
                            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ $h }}</th>
                            @endforeach
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                        @foreach([
                            ['Total Attempts',        $fmt($voice['total_attempts'] ?? null, 0)],
                            ['Total Completed',       $fmt($voice['total_completed'] ?? null, 0)],
                            ['Total Dropped',         $fmt($voice['total_dropped'] ?? null, 0)],
                            ['Call Setup Success Rate (CSSR)', $fmtPct($voice['cssr'] ?? null)],
                            ['Call Drop Rate (CDR)',   $fmtPct($voice['cdr'] ?? null)],
                            ['Avg Setup Time',         ($voice['average_setup_time'] ?? null) !== null ? $fmt(($voice['average_setup_time']) / 1000, 2) . 's' : '—'],
                            ['Avg MOS',                $fmt($voice['average_mos'] ?? null, 2)],
                            ['MOS < 1.6 (%)',          $fmtPct($voice['mos_under_1_6_percentage'] ?? null)],
                            ['Setup Time > 10s (%)',   $fmtPct($voice['setup_time_over_10s_percentage'] ?? null)],
                        ] as [$label, $value])
                        <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td class="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium">{{ $label }}</td>
                            <td class="px-4 py-2 text-gray-900 dark:text-gray-100 font-mono">{{ $value }}</td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </div>

        {{-- ─── Data Analytics ───────────────────────────────────────────── --}}
        @php
            $sections = [
                'Browsing' => [
                    ['Requests',          $fmt($data['browsing']['total_requests'] ?? null, 0)],
                    ['Completed',         $fmt($data['browsing']['total_completed'] ?? null, 0)],
                    ['Success Rate',      $fmtPct($data['browsing']['success_ratio'] ?? null)],
                    ['Avg Duration',      ($data['browsing']['average_duration'] ?? null) !== null ? $fmt(($data['browsing']['average_duration']) / 1000, 2) . 's' : '—'],
                ],
                'Streaming' => [
                    ['Requests',               $fmt($data['streaming']['total_requests'] ?? null, 0)],
                    ['Success Rate',           $fmtPct($data['streaming']['success_ratio'] ?? null)],
                    ['Avg MOS',                $fmt($data['streaming']['average_mos'] ?? null, 2)],
                    ['Avg Setup Time',         ($data['streaming']['average_setup_time'] ?? null) !== null ? $fmt(($data['streaming']['average_setup_time']) / 1000, 2) . 's' : '—'],
                    ['MOS < 3.8 (%)',          $fmtPct($data['streaming']['mos_under_3_8_percentage'] ?? null)],
                    ['Setup > 5s (%)',         $fmtPct($data['streaming']['setup_time_over_5s_percentage'] ?? null)],
                ],
                'HTTP Download' => [
                    ['Requests',        $fmt($data['http']['download']['total_requests'] ?? null, 0)],
                    ['Success Rate',    $fmtPct($data['http']['download']['success_ratio'] ?? null)],
                    ['Avg Throughput',  ($data['http']['download']['average_throughput'] ?? null) !== null ? $fmt($data['http']['download']['average_throughput'], 2) . ' Mbps' : '—'],
                    ['10th Pct',        ($data['http']['download']['percentile_10th'] ?? null) !== null ? $fmt($data['http']['download']['percentile_10th'], 2) . ' Mbps' : '—'],
                    ['90th Pct',        ($data['http']['download']['percentile_90th'] ?? null) !== null ? $fmt($data['http']['download']['percentile_90th'], 2) . ' Mbps' : '—'],
                ],
                'HTTP Upload' => [
                    ['Requests',        $fmt($data['http']['upload']['total_requests'] ?? null, 0)],
                    ['Success Rate',    $fmtPct($data['http']['upload']['success_ratio'] ?? null)],
                    ['Avg Throughput',  ($data['http']['upload']['average_throughput'] ?? null) !== null ? $fmt($data['http']['upload']['average_throughput'], 2) . ' Mbps' : '—'],
                    ['10th Pct',        ($data['http']['upload']['percentile_10th'] ?? null) !== null ? $fmt($data['http']['upload']['percentile_10th'], 2) . ' Mbps' : '—'],
                    ['90th Pct',        ($data['http']['upload']['percentile_90th'] ?? null) !== null ? $fmt($data['http']['upload']['percentile_90th'], 2) . ' Mbps' : '—'],
                ],
                'FTP Download' => [
                    ['Requests',        $fmt($data['ftp']['download']['total_requests'] ?? null, 0)],
                    ['Success Rate',    $fmtPct($data['ftp']['download']['success_ratio'] ?? null)],
                    ['Avg Throughput',  ($data['ftp']['download']['average_throughput'] ?? null) !== null ? $fmt(($data['ftp']['download']['average_throughput']) / 1000, 2) . ' Mbps' : '—'],
                    ['90th Pct',        ($data['ftp']['download']['percentile_90th'] ?? null) !== null ? $fmt(($data['ftp']['download']['percentile_90th']) / 1000, 2) . ' Mbps' : '—'],
                ],
                'FTP Upload' => [
                    ['Requests',        $fmt($data['ftp']['upload']['total_requests'] ?? null, 0)],
                    ['Success Rate',    $fmtPct($data['ftp']['upload']['success_ratio'] ?? null)],
                    ['Avg Throughput',  ($data['ftp']['upload']['average_throughput'] ?? null) !== null ? $fmt(($data['ftp']['upload']['average_throughput']) / 1000, 2) . ' Mbps' : '—'],
                ],
                'Social Media' => [
                    ['Requests',             $fmt($data['social']['total_requests'] ?? null, 0)],
                    ['Success Rate',         $fmtPct($data['social']['success_ratio'] ?? null)],
                    ['Avg Load Time',        ($data['social']['average_duration'] ?? null) !== null ? $fmt(($data['social']['average_duration']) / 1000, 2) . 's' : '—'],
                    ['Load > 5s (%)',        $fmtPct($data['social']['duration_over_5s_percentage'] ?? null)],
                ],
                'Latency / Interactivity' => [
                    ['Requests',                $fmt($data['latency']['total_requests'] ?? null, 0)],
                    ['Success Rate',            $fmtPct($data['latency']['success_ratio'] ?? null)],
                    ['Avg Interactivity Score', $fmt($data['latency']['average_score'] ?? null, 1)],
                    ['Score > 25 (%)',          $fmtPct($data['latency']['interactivity_success_ratio'] ?? null)],
                ],
            ];
        @endphp

        <div class="mb-2">
            <h3 class="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                Data Analytics
            </h3>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @foreach($sections as $title => $rows)
            <div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div class="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{{ $title }}</span>
                </div>
                <table class="w-full text-sm">
                    <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                        @foreach($rows as [$label, $value])
                        <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td class="px-3 py-1.5 text-gray-600 dark:text-gray-400">{{ $label }}</td>
                            <td class="px-3 py-1.5 text-right font-mono text-gray-900 dark:text-gray-100">{{ $value }}</td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            @endforeach
        </div>

    </x-filament::section>
</x-filament-widgets::widget>
