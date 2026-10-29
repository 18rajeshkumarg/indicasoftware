<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
indica_handle_cors();

$name = (string) ($_GET['name'] ?? '');
$type = (string) ($_GET['type'] ?? 'image');
$isVideo = $type === 'video';
$pattern = $isVideo
    ? '/^[a-f0-9]{32}\.(?:mp4|webm)$/i'
    : '/^[a-f0-9]{32}\.(?:jpg|png|webp)$/i';
if (!in_array($type, ['image', 'video'], true) || !preg_match($pattern, $name)) {
    http_response_code(404);
    exit;
}
$content = indica_read_json('content.json', ['case_studies' => [], 'testimonials' => [], 'team' => [], 'about_video' => null]);
$isReferenced = false;
if ($isVideo) {
    $video = $content['about_video'] ?? null;
    $isReferenced = is_array($video)
        && ($video['name'] ?? '') === $name
        && ($video['published'] ?? false) === true
        && !($video['removed'] ?? false);
} else {
    foreach (['case_studies', 'team'] as $key) {
        foreach ($content[$key] ?? [] as $item) {
            if (is_array($item) && ($item['image'] ?? '') === $name && ($item['published'] ?? true) === true) {
                $isReferenced = true;
                break 2;
            }
        }
    }
}
if (!$isReferenced) {
    http_response_code(404);
    exit;
}
$path = indica_storage_dir()
    . DIRECTORY_SEPARATOR
    . ($isVideo ? 'videos' : 'uploads')
    . DIRECTORY_SEPARATOR
    . $name;
if (!is_file($path)) {
    http_response_code(404);
    exit;
}
$image = $isVideo ? null : @getimagesize($path);
$mime = $isVideo
    ? (strtolower(pathinfo($name, PATHINFO_EXTENSION)) === 'mp4' ? 'video/mp4' : 'video/webm')
    : (is_array($image) ? (string) ($image['mime'] ?? '') : '');
$allowed = $isVideo
    ? ['video/mp4', 'video/webm']
    : ['image/jpeg', 'image/png', 'image/webp'];
if (!in_array($mime, $allowed, true)) {
    http_response_code(415);
    exit;
}
header('Content-Type: ' . $mime);
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=86400, immutable');
$size = filesize($path);
$start = 0;
$end = $size - 1;
header('Accept-Ranges: bytes');
if ($isVideo && isset($_SERVER['HTTP_RANGE']) && preg_match('/bytes=(\d*)-(\d*)/', (string) $_SERVER['HTTP_RANGE'], $matches)) {
    if ($matches[1] === '' && $matches[2] !== '') {
        $start = max(0, $size - (int) $matches[2]);
    } else {
        $start = (int) ($matches[1] ?: 0);
        if ($matches[2] !== '') $end = min($end, (int) $matches[2]);
    }
    if ($start > $end || $start >= $size) {
        http_response_code(416);
        header('Content-Range: bytes */' . $size);
        exit;
    }
    http_response_code(206);
    header("Content-Range: bytes {$start}-{$end}/{$size}");
}
$length = $end - $start + 1;
header('Content-Length: ' . $length);
$handle = fopen($path, 'rb');
if ($handle === false) {
    http_response_code(404);
    exit;
}
fseek($handle, $start);
while ($length > 0 && !feof($handle)) {
    $chunk = fread($handle, min(8192, $length));
    if ($chunk === false || $chunk === '') break;
    echo $chunk;
    $length -= strlen($chunk);
}
fclose($handle);
