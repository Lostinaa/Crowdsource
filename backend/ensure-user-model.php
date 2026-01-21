<?php

/**
 * Helper script to ensure User model has HasApiTokens trait for Sanctum
 * Run this after setup: php ensure-user-model.php
 */

$userModelPath = __DIR__ . '/app/Models/User.php';

if (!file_exists($userModelPath)) {
    echo "❌ User model not found. Creating default User model...\n";
    
    // Create the User model with Sanctum support
    $userModelContent = <<<'PHP'
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}

PHP;
    
    file_put_contents($userModelPath, $userModelContent);
    echo "✅ User model created successfully!\n";
    exit(0);
}

$content = file_get_contents($userModelPath);

// Check if HasApiTokens is already present
if (strpos($content, 'HasApiTokens') !== false) {
    echo "✅ User model already has HasApiTokens trait.\n";
    exit(0);
}

// Check if Laravel\Sanctum\HasApiTokens use statement exists
if (strpos($content, 'use Laravel\Sanctum\HasApiTokens;') === false) {
    // Add the use statement after other use statements
    $content = str_replace(
        "use Illuminate\Notifications\Notifiable;",
        "use Illuminate\Notifications\Notifiable;\nuse Laravel\Sanctum\HasApiTokens;",
        $content
    );
}

// Add HasApiTokens to the use traits (we know it's not there because we checked earlier)
// Find the trait usage line and add HasApiTokens
$patterns = [
    '/use (HasFactory, Notifiable);/' => 'use HasApiTokens, $1;',
    '/use HasFactory, Notifiable;/' => 'use HasApiTokens, HasFactory, Notifiable;',
    '/use\s+HasFactory,\s+Notifiable;/' => 'use HasApiTokens, HasFactory, Notifiable;',
];

$replaced = false;
foreach ($patterns as $pattern => $replacement) {
    if (preg_match($pattern, $content)) {
        $content = preg_replace($pattern, $replacement, $content);
        $replaced = true;
        break;
    }
}

// If no pattern matched, try to insert after the class declaration
if (!$replaced) {
    if (preg_match('/class User[^{]*\{/', $content, $matches, PREG_OFFSET_CAPTURE)) {
        $pos = $matches[0][1] + strlen($matches[0][0]);
        $content = substr_replace($content, "\n    use HasApiTokens, HasFactory, Notifiable;\n", $pos, 0);
        $replaced = true;
    }
}

// Also ensure 'role' is in fillable
if (strpos($content, "'role',") === false && strpos($content, '"role",') === false) {
    // Add role to fillable array
    $content = preg_replace(
        "/protected \$fillable = \[([^\]]+)\];/",
        "protected \$fillable = [\$1        'role',\n    ];",
        $content
    );
}

file_put_contents($userModelPath, $content);
echo "✅ User model updated with HasApiTokens trait and role field!\n";

