<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
indica_start_admin_session();
indica_require_admin();
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    header('Allow: GET');
    indica_json_response(['error' => 'Method not allowed.'], 405);
}

$afterId = (string) ($_GET['after_id'] ?? '');
$items = indica_read_json('inquiries.json', []);
$newItems = $items;
if ($afterId !== '' && preg_match('/^[a-f0-9]{24}$/', $afterId)) {
    $lastSeenIndex = null;
    foreach ($items as $index => $item) {
        if (($item['id'] ?? '') === $afterId) {
            $lastSeenIndex = $index;
            break;
        }
    }
    if ($lastSeenIndex !== null) $newItems = array_slice($items, 0, $lastSeenIndex);
}
indica_json_response([
    'items' => array_values(array_filter($newItems, 'is_array')),
    'count' => count($items),
]);
