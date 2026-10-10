<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    indica_json_response(['error' => 'Method not allowed.'], 405);
}

$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
$host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
if ($origin !== '' && strtolower((string) parse_url($origin, PHP_URL_HOST)) !== preg_replace('/:\d+$/', '', $host)) {
    indica_json_response(['error' => 'Request origin is not allowed.'], 403);
}

$input = str_contains(strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? '')), 'application/json')
    ? indica_request_json()
    : $_POST;
if (!empty($input['website'])) {
    indica_json_response(['ok' => true]); // honeypot
}

$company = trim((string) ($input['company_name'] ?? ''));
$phone = trim((string) ($input['mobile_number'] ?? ''));
$query = trim((string) ($input['query'] ?? ''));
$services = $input['services'] ?? [];
if (!is_array($services)) $services = [$services];
$services = array_values(array_unique(array_filter(
    array_map(static fn ($value) => trim((string) $value), $services),
    static fn ($value) => in_array($value, INDICA_SERVICES, true)
)));
$digits = preg_replace('/\D/', '', $phone);

if ($company === '' || strlen($company) > 640) {
    indica_json_response(['error' => 'Enter a valid company name.'], 422);
}
if ($phone === '' || strlen((string) $digits) < 7 || strlen((string) $digits) > 15 || !preg_match('/^[+0-9().\s-]+$/', $phone)) {
    indica_json_response(['error' => 'Enter a valid mobile number with country code if needed.'], 422);
}
if ($query === '' || strlen($query) > 20000) {
    indica_json_response(['error' => 'Enter your query (up to 5,000 characters).'], 422);
}
if (!$services) {
    indica_json_response(['error' => 'Select at least one service.'], 422);
}

$rateKey = hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
$now = time();
$rateLimited = false;
$rates = indica_update_json('inquiry-rate.json', [], static function (array $current) use ($rateKey, $now, &$rateLimited): array {
    $recent = array_values(array_filter($current[$rateKey] ?? [], static fn ($t) => is_int($t) && $t > $now - 3600));
    if (count($recent) >= 10) {
        $rateLimited = true;
        return $current;
    }
    $recent[] = $now;
    $current[$rateKey] = $recent;
    return $current;
});
if ($rateLimited) {
    indica_json_response(['error' => 'Please wait before sending another inquiry.'], 429);
}

$record = [
    'id' => bin2hex(random_bytes(12)),
    'created_at' => gmdate(DATE_ATOM),
    'company_name' => $company,
    'mobile_number' => $phone,
    'services' => $services,
    'query' => $query,
    'status' => 'new',
];
indica_update_json('inquiries.json', [], static function (array $items) use ($record): array {
    array_unshift($items, $record);
    return $items;
});
indica_json_response(['ok' => true, 'message' => 'Your inquiry has been received. Our team will be in touch.'], 201);
