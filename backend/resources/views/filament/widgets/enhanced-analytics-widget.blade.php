<x-filament-widgets::widget>
    @php
        $voice = $this->getVoiceData();
        $data = $this->getDataAnalytics();
    @endphp

    <x-filament::section>
        <x-slot name="heading">
            Enhanced QoE Analytics
        </x-slot>

        <div class="space-y-6">
            <!-- Voice Analytics Card -->
            <x-filament::section>
                <x-slot name="heading">
                    Voice Analytics
                </x-slot>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <x-filament::card>
                        <div class="space-y-1">
                            <div class="text-sm font-medium text-gray-500">CSSR</div>
                            <div class="text-3xl font-bold text-primary-600">{{ number_format($voice['cssr'] ?? 0, 1) }}%</div>
                            <div class="text-xs text-gray-400">Call Setup Success Ratio</div>
                        </div>
                    </x-filament::card>
                    <x-filament::card>
                        <div class="space-y-1">
                            <div class="text-sm font-medium text-gray-500">CDR</div>
                            <div class="text-3xl font-bold text-danger-600">{{ number_format($voice['cdr'] ?? 0, 1) }}%</div>
                            <div class="text-xs text-gray-400">Call Drop Ratio</div>
                        </div>
                    </x-filament::card>
                    <x-filament::card>
                        <div class="space-y-1">
                            <div class="text-sm font-medium text-gray-500">MOS &lt; 1.6%</div>
                            <div class="text-3xl font-bold text-warning-600">
                                {{ $voice['mos_under_1_6_percentage'] !== null ? number_format($voice['mos_under_1_6_percentage'], 1) . '%' : 'N/A' }}
                            </div>
                            <div class="text-xs text-gray-400">Poor Quality Calls</div>
                        </div>
                    </x-filament::card>
                    <x-filament::card>
                        <div class="space-y-1">
                            <div class="text-sm font-medium text-gray-500">Setup Time &gt; 10s%</div>
                            <div class="text-3xl font-bold text-warning-600">
                                {{ $voice['setup_time_over_10s_percentage'] !== null ? number_format($voice['setup_time_over_10s_percentage'], 1) . '%' : 'N/A' }}
                            </div>
                            <div class="text-xs text-gray-400">Slow Setup Calls</div>
                        </div>
                    </x-filament::card>
                </div>
            </x-filament::section>

            <!-- Data Analytics -->
            <x-filament::section>
                <x-slot name="heading">
                    Data Analytics
                </x-slot>
                <div class="space-y-4">
                <!-- Browsing Table -->
                <x-filament::section>
                    <x-slot name="heading">
                        Browsing Performance
                    </x-slot>
                    <div class="overflow-x-auto">
                        <table class="w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead class="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Success Ratio</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        <span class="font-bold text-success-600 dark:text-success-400">
                                            {{ $data['browsing']['success_ratio'] !== null ? number_format($data['browsing']['success_ratio'], 1) . '%' : 'N/A' }}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Total Requests</td>
                                    <td class="px-4 py-3 whitespace-nowrap">{{ $data['browsing']['total_requests'] ?? 0 }}</td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Completed</td>
                                    <td class="px-4 py-3 whitespace-nowrap">{{ $data['browsing']['total_completed'] ?? 0 }}</td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Average Duration</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        {{ $data['browsing']['average_duration'] !== null ? number_format($data['browsing']['average_duration'] / 1000, 2) . 's' : 'N/A' }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </x-filament::section>

                <!-- Streaming Table -->
                <x-filament::section>
                    <x-slot name="heading">
                        Video Streaming Performance
                    </x-slot>
                    <div class="overflow-x-auto">
                        <table class="w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead class="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Success Ratio</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        <span class="font-bold text-success-600 dark:text-success-400">
                                            {{ $data['streaming']['success_ratio'] !== null ? number_format($data['streaming']['success_ratio'], 1) . '%' : 'N/A' }}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Average MOS</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        <span class="font-bold">
                                            {{ $data['streaming']['average_mos'] !== null ? number_format($data['streaming']['average_mos'], 2) : 'N/A' }}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">MOS &lt; 3.8%</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        <span class="font-bold text-warning-600 dark:text-warning-400">
                                            {{ $data['streaming']['mos_under_3_8_percentage'] !== null ? number_format($data['streaming']['mos_under_3_8_percentage'], 1) . '%' : 'N/A' }}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Setup Time &gt; 5s%</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        <span class="font-bold text-warning-600 dark:text-warning-400">
                                            {{ $data['streaming']['setup_time_over_5s_percentage'] !== null ? number_format($data['streaming']['setup_time_over_5s_percentage'], 1) . '%' : 'N/A' }}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Average Setup Time</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        {{ $data['streaming']['average_setup_time'] !== null ? number_format($data['streaming']['average_setup_time'] / 1000, 2) . 's' : 'N/A' }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </x-filament::section>

                <!-- HTTP Download Table -->
                <x-filament::section>
                    <x-slot name="heading">
                        HTTP Download Performance
                    </x-slot>
                    <div class="overflow-x-auto">
                        <table class="w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead class="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Success Ratio</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        <span class="font-bold text-success-600 dark:text-success-400">
                                            {{ $data['http']['download']['success_ratio'] !== null ? number_format($data['http']['download']['success_ratio'], 1) . '%' : 'N/A' }}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Average Throughput</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        <span class="font-bold text-primary-600 dark:text-primary-400">
                                            {{ $data['http']['download']['average_throughput'] !== null ? number_format($data['http']['download']['average_throughput'], 2) . ' Mbps' : 'N/A' }}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">10th Percentile</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        {{ $data['http']['download']['percentile_10th'] !== null ? number_format($data['http']['download']['percentile_10th'], 2) . ' Mbps' : 'N/A' }}
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">90th Percentile</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        {{ $data['http']['download']['percentile_90th'] !== null ? number_format($data['http']['download']['percentile_90th'], 2) . ' Mbps' : 'N/A' }}
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Total Requests</td>
                                    <td class="px-4 py-3 whitespace-nowrap">{{ $data['http']['download']['total_requests'] ?? 0 }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </x-filament::section>

                <!-- FTP Download Table -->
                <x-filament::section>
                    <x-slot name="heading">
                        FTP Download Performance
                    </x-slot>
                    <div class="overflow-x-auto">
                        <table class="w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead class="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Success Ratio</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        <span class="font-bold text-success-600 dark:text-success-400">
                                            {{ $data['ftp']['download']['success_ratio'] !== null ? number_format($data['ftp']['download']['success_ratio'], 1) . '%' : 'N/A' }}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Average Throughput</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        <span class="font-bold text-primary-600 dark:text-primary-400">
                                            {{ $data['ftp']['download']['average_throughput'] !== null ? number_format($data['ftp']['download']['average_throughput'], 2) . ' Mbps' : 'N/A' }}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">10th Percentile</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        {{ $data['ftp']['download']['percentile_10th'] !== null ? number_format($data['ftp']['download']['percentile_10th'], 2) . ' Mbps' : 'N/A' }}
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">90th Percentile</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        {{ $data['ftp']['download']['percentile_90th'] !== null ? number_format($data['ftp']['download']['percentile_90th'], 2) . ' Mbps' : 'N/A' }}
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Total Requests</td>
                                    <td class="px-4 py-3 whitespace-nowrap">{{ $data['ftp']['download']['total_requests'] ?? 0 }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </x-filament::section>

                <!-- Social Media Table -->
                <x-filament::section>
                    <x-slot name="heading">
                        Social Media Performance
                    </x-slot>
                    <div class="overflow-x-auto">
                        <table class="w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead class="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Success Ratio</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        <span class="font-bold text-success-600 dark:text-success-400">
                                            {{ $data['social']['success_ratio'] !== null ? number_format($data['social']['success_ratio'], 1) . '%' : 'N/A' }}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Duration &gt; 5s%</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        <span class="font-bold text-warning-600 dark:text-warning-400">
                                            {{ $data['social']['duration_over_5s_percentage'] !== null ? number_format($data['social']['duration_over_5s_percentage'], 1) . '%' : 'N/A' }}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Average Duration</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        {{ $data['social']['average_duration'] !== null ? number_format($data['social']['average_duration'] / 1000, 2) . 's' : 'N/A' }}
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Total Requests</td>
                                    <td class="px-4 py-3 whitespace-nowrap">{{ $data['social']['total_requests'] ?? 0 }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </x-filament::section>

                <!-- Latency Table -->
                <x-filament::section>
                    <x-slot name="heading">
                        Latency & Interactivity Performance
                    </x-slot>
                    <div class="overflow-x-auto">
                        <table class="w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead class="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Success Ratio</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        <span class="font-bold text-success-600 dark:text-success-400">
                                            {{ $data['latency']['success_ratio'] !== null ? number_format($data['latency']['success_ratio'], 1) . '%' : 'N/A' }}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Interactivity Success Ratio</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        <span class="font-bold text-primary-600 dark:text-primary-400">
                                            {{ $data['latency']['interactivity_success_ratio'] !== null ? number_format($data['latency']['interactivity_success_ratio'], 1) . '%' : 'N/A' }}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Average Score</td>
                                    <td class="px-4 py-3 whitespace-nowrap">
                                        <span class="font-bold">
                                            {{ $data['latency']['average_score'] !== null ? number_format($data['latency']['average_score'], 1) : 'N/A' }}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-4 py-3 whitespace-nowrap font-medium">Total Requests</td>
                                    <td class="px-4 py-3 whitespace-nowrap">{{ $data['latency']['total_requests'] ?? 0 }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </x-filament::section>
                </div>
            </x-filament::section>
        </div>
    </x-filament::section>
</x-filament-widgets::widget>
