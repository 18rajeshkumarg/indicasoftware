<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
indica_handle_cors();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    indica_json_response(['error' => 'Method not allowed.'], 405);
}

$type = (string) ($_GET['type'] ?? '');
$data = indica_read_json('content.json', [
    'case_studies' => [],
    'testimonials' => [],
    'team' => [],
    'about_video' => null,
]);
if ($type === 'about-video') {
    $video = $data['about_video'] ?? null;
    indica_json_response([
        'item' => is_array($video) && (($video['removed'] ?? false) || ($video['published'] ?? true) === true)
            ? $video
            : null,
    ]);
}
if (!in_array($type, ['case-studies', 'testimonials', 'team'], true)) {
    indica_json_response(['error' => 'Unknown content type.'], 404);
}
$key = match ($type) {
    'case-studies' => 'case_studies',
    'team' => 'team',
    default => 'testimonials',
};
$items = array_values(array_filter(
    $data[$key] ?? [],
    static fn ($item) => is_array($item) && ($item['published'] ?? true) === true
));
indica_json_response(['items' => $items]);
