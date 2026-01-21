<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CoverageSample extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'timestamp',
        'latitude',
        'longitude',
        'accuracy',
        'network_type',
        'network_category',
        'rsrp',
        'rsrq',
        'rssnr',
        'cqi',
        'enb',
        'cell_id',
        'pci',
        'tac',
        'eci',
        'raw',
    ];

    protected $casts = [
        'timestamp' => 'datetime',
        'raw' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}


