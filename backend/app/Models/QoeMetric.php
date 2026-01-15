<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QoeMetric extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'timestamp',
        'device_info',
        'location',
        'metrics',
        'scores',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'timestamp' => 'datetime',
        'device_info' => 'array',
        'location' => 'array',
        'metrics' => 'array',
        'scores' => 'array',
    ];

    /**
     * Get the user that owns the metric
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

