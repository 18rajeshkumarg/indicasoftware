<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
indica_handle_cors();

$name = (string) ($_GET['name'] ?? '');
if (!preg_match('/^[a-f0-9]{32}\.(?:jpg|png|webp)$/', $name)) {
    http_response_code(404);
    exit;
}
$content = indica_read_json('content.json', ['case_studies' => [], 'testimonials' => []]);
$isReferenced = false;
foreach ($content['case_studies'] ?? [] as $study) {
    if (is_array($study) && ($study['image'] ?? '') === $name && ($study['published'] ?? true) === true) {
        $isReferenced = true;
        break;
    }
}
if (!$isReferenced) {
    http_response_code(404);
    exit;
}
$path = indica_storage_dir() . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . $name;
if (!is_file($path)) {
    http_response_code(404);
    exit;
}
$image = @getimagesize($path);
$mime = is_array($image) ? (string) ($image['mime'] ?? '') : '';
if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
    http_response_code(415);
    exit;
}
header('Content-Type: ' . $mime);
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=86400, immutable');
header('Content-Length: ' . filesize($path));
readfile($path);
