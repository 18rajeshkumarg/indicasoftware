<?php
declare(strict_types=1);

const INDICA_SERVICES = [
    'Custom Full-Stack Web & AI Development',
    'Custom Android and iOS Development',
    'AI Automations / Custom Integrations',
    'Custom Frameworks Development',
    'Side Hustle and Freelancing Support',
    'IT Consulting',
    'Logo Design',
    'Technical Support',
    'Video Editing',
    'Web Design',
];

function indica_storage_dir(): string
{
    $configured = getenv('INDICA_STORAGE_DIR');
    $dir = $configured !== false && $configured !== ''
        ? $configured
        : dirname(dirname(__DIR__)) . DIRECTORY_SEPARATOR . 'indica-private-storage';
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
        throw new RuntimeException('Unable to initialize private storage.');
    }
    $resolved = realpath($dir);
    $documentRoot = realpath((string) ($_SERVER['DOCUMENT_ROOT'] ?? ''));
    if ($resolved !== false && $documentRoot !== false) {
        $rootPrefix = rtrim($documentRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
        if (strncasecmp($resolved . DIRECTORY_SEPARATOR, $rootPrefix, strlen($rootPrefix)) === 0) {
            throw new RuntimeException('INDICA_STORAGE_DIR must be outside the web document root.');
        }
    }
    @chmod($dir, 0700);
    return rtrim($dir, DIRECTORY_SEPARATOR);
}

function indica_json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function indica_read_json(string $filename, array $fallback): array
{
    $path = indica_storage_dir() . DIRECTORY_SEPARATOR . $filename;
    if (!is_file($path)) return $fallback;
    $decoded = json_decode((string) file_get_contents($path), true);
    return is_array($decoded) ? $decoded : $fallback;
}

/** Apply a read/update/write transaction while holding a private file lock. */
function indica_update_json(string $filename, array $fallback, callable $change): mixed
{
    $dir = indica_storage_dir();
    $path = $dir . DIRECTORY_SEPARATOR . $filename;
    $lock = fopen($path . '.lock', 'c');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        throw new RuntimeException('Unable to lock private storage.');
    }
    try {
        $current = is_file($path)
            ? json_decode((string) file_get_contents($path), true)
            : $fallback;
        if (!is_array($current)) $current = $fallback;
        $next = $change($current);
        $temporary = tempnam($dir, 'indica-');
        if ($temporary === false) throw new RuntimeException('Unable to write private storage.');
        file_put_contents(
            $temporary,
            json_encode($next, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            LOCK_EX
        );
        @chmod($temporary, 0600);
        if (!rename($temporary, $path)) {
            @unlink($temporary);
            throw new RuntimeException('Unable to save private storage.');
        }
        @chmod($path, 0600);
        return $next;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function indica_start_admin_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('indica_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function indica_is_admin(): bool
{
    indica_start_admin_session();
    return ($_SESSION['indica_admin'] ?? false) === true;
}

function indica_csrf_token(): string
{
    if (empty($_SESSION['indica_csrf'])) {
        $_SESSION['indica_csrf'] = bin2hex(random_bytes(32));
    }
    return (string) $_SESSION['indica_csrf'];
}

function indica_check_csrf(): bool
{
    $given = (string) ($_POST['_csrf'] ?? '');
    return $given !== '' && hash_equals(indica_csrf_token(), $given);
}

function indica_require_admin(): void
{
    if (!indica_is_admin()) {
        indica_json_response(['error' => 'Authentication required.'], 401);
    }
}

function indica_h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function indica_request_json(): array
{
    $body = json_decode((string) file_get_contents('php://input'), true);
    return is_array($body) ? $body : [];
}
