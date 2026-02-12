@php
    $heading = $this->getHeading();
    $description = $this->getDescription();
    $columns = $this->getColumns('default') ?? 3;
@endphp

<x-filament-widgets::widget>
    <div>
        @if ($heading)
            <div style="padding: 1rem 1rem 0.5rem 1rem;">
                <h2 style="font-size: 1.25rem; font-weight: 800; letter-spacing: -0.025em; color: inherit; margin: 0;">
                    {{ $heading }}
                </h2>
                @if ($description)
                    <p style="font-size: 0.875rem; color: #6b7280; margin: 0.25rem 0 0 0;">
                        {{ $description }}
                    </p>
                @endif
            </div>
        @endif

        <div @class([
            'fi-wi-stats-overview-stats-ctn grid gap-6',
            'md:grid-cols-1' => $columns === 1,
            'md:grid-cols-2' => $columns === 2,
            'md:grid-cols-3' => $columns === 3,
            'md:grid-cols-4' => $columns === 4,
        ])>
            @foreach ($this->getCachedStats() as $stat)
                {{ $stat }}
            @endforeach
        </div>
    </div>
</x-filament-widgets::widget>