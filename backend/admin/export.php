<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
indica_start_admin_session();
indica_require_admin();
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    header('Allow: GET');
    indica_json_response(['error' => 'Method not allowed.'], 405);
}

$format = strtolower((string) ($_GET['format'] ?? ''));
$inquiries = indica_read_json('inquiries.json', []);
$columns = [
    'id' => 'Inquiry ID',
    'created_at' => 'Submitted (UTC)',
    'page' => 'Page',
    'company_name' => 'Company',
    'mobile_number' => 'Mobile number',
    'services' => 'Services',
    'query' => 'Query',
    'user_agent' => 'Browser user agent',
    'platform' => 'Device platform',
    'language' => 'Language',
    'timezone' => 'Timezone',
    'screen' => 'Screen resolution',
    'viewport' => 'Browser viewport',
    'status' => 'Status',
];
$rows = [array_values($columns)];
foreach ($inquiries as $item) {
    if (!is_array($item)) continue;
    $device = is_array($item['device'] ?? null) ? $item['device'] : [];
    $rows[] = [
        (string) ($item['id'] ?? ''),
        (string) ($item['created_at'] ?? ''),
        (string) ($item['page'] ?? ''),
        (string) ($item['company_name'] ?? ''),
        (string) ($item['mobile_number'] ?? ''),
        implode(', ', is_array($item['services'] ?? null) ? $item['services'] : []),
        (string) ($item['query'] ?? ''),
        (string) ($device['user_agent'] ?? ''),
        (string) ($device['platform'] ?? ''),
        (string) ($device['language'] ?? ''),
        (string) ($device['timezone'] ?? ''),
        (string) ($device['screen'] ?? ''),
        (string) ($device['viewport'] ?? ''),
        (string) ($item['status'] ?? ''),
    ];
}

function export_pdf_text(string $value): string
{
    $value = preg_replace('/\s+/u', ' ', $value) ?? $value;
    if (function_exists('iconv')) {
        $converted = @iconv('UTF-8', 'Windows-1252//TRANSLIT//IGNORE', $value);
        if ($converted !== false) $value = $converted;
    } else {
        $value = preg_replace('/[^\x20-\x7E]/', '?', $value) ?? '';
    }
    return str_replace(["\\", '(', ')'], ["\\\\", '\\(', '\\)'], $value);
}

function export_pdf(array $rows): string
{
    $lines = ['Indica Software - submitted inquiries', 'Generated ' . gmdate('Y-m-d H:i') . ' UTC', ''];
    array_shift($rows);
    foreach ($rows as $index => $row) {
        $lines[] = 'Inquiry ' . ($index + 1);
        foreach ($row as $column => $value) {
            $label = ['ID', 'Submitted UTC', 'Page', 'Company', 'Mobile', 'Services', 'Query', 'Browser', 'Platform', 'Language', 'Timezone', 'Screen', 'Viewport', 'Status'][$column] ?? 'Details';
            foreach (explode("\n", wordwrap((string) $value, 88, "\n", true)) as $line) {
                $lines[] = $label . ': ' . $line;
                $label = '  ';
            }
        }
        $lines[] = '';
    }
    if (count($lines) === 3) $lines[] = 'No inquiries have been submitted.';
    $pages = array_chunk($lines, 48);
    $fontId = 3 + count($pages) * 2;
    $objects = [1 => '<< /Type /Catalog /Pages 2 0 R >>'];
    $kids = [];
    foreach ($pages as $i => $pageLines) {
        $pageId = 3 + $i * 2;
        $streamId = $pageId + 1;
        $kids[] = $pageId . ' 0 R';
        $stream = "BT\n/F1 9 Tf\n40 752 Td\n";
        foreach ($pageLines as $lineIndex => $line) {
            if ($lineIndex > 0) $stream .= "0 -14 Td\n";
            $stream .= '(' . export_pdf_text((string) $line) . ") Tj\n";
        }
        $stream .= 'ET';
        $objects[$pageId] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ' . $fontId . ' 0 R >> >> /Contents ' . $streamId . ' 0 R >>';
        $objects[$streamId] = '<< /Length ' . strlen($stream) . ">>\nstream\n" . $stream . "\nendstream";
    }
    $objects[2] = '<< /Type /Pages /Kids [' . implode(' ', $kids) . '] /Count ' . count($pages) . ' >>';
    $objects[$fontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';
    ksort($objects);
    $pdf = "%PDF-1.4\n";
    $offsets = [0];
    foreach ($objects as $id => $body) {
        $offsets[$id] = strlen($pdf);
        $pdf .= $id . " 0 obj\n" . $body . "\nendobj\n";
    }
    $xref = strlen($pdf);
    $size = max(array_keys($objects)) + 1;
    $pdf .= "xref\n0 {$size}\n0000000000 65535 f \n";
    for ($id = 1; $id < $size; $id++) $pdf .= sprintf("%010d 00000 n \n", $offsets[$id] ?? 0);
    $pdf .= "trailer\n<< /Size {$size} /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF";
    return $pdf;
}

function export_xlsx(array $rows): string
{
    $columnName = static function (int $number): string {
        $name = '';
        while ($number > 0) {
            $number--;
            $name = chr(65 + ($number % 26)) . $name;
            $number = intdiv($number, 26);
        }
        return $name;
    };
    $sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    $sheet .= '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
    foreach ($rows as $rowIndex => $row) {
        $excelRow = $rowIndex + 1;
        $sheet .= '<row r="' . $excelRow . '">';
        foreach ($row as $columnIndex => $value) {
            $reference = $columnName($columnIndex + 1) . $excelRow;
            $text = htmlspecialchars((string) $value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
            $sheet .= '<c r="' . $reference . '" t="inlineStr"><is><t xml:space="preserve">' . $text . '</t></is></c>';
        }
        $sheet .= '</row>';
    }
    $sheet .= '</sheetData></worksheet>';

    $parts = [
        '[Content_Types].xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
        '_rels/.rels' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
        'xl/workbook.xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Inquiries" sheetId="1" r:id="rId1"/></sheets></workbook>',
        'xl/_rels/workbook.xml.rels' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
        'xl/worksheets/sheet1.xml' => $sheet,
    ];
    $path = tempnam(sys_get_temp_dir(), 'indica-xlsx-');
    if ($path === false) throw new RuntimeException('Unable to prepare the Excel export.');
    $zip = new ZipArchive();
    if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        @unlink($path);
        throw new RuntimeException('Unable to create the Excel export.');
    }
    foreach ($parts as $name => $body) $zip->addFromString($name, $body);
    $zip->close();
    $data = file_get_contents($path);
    @unlink($path);
    if ($data === false) throw new RuntimeException('Unable to read the Excel export.');
    return $data;
}

header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
if ($format === 'csv') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="indica-inquiries.csv"');
    echo "\xEF\xBB\xBF";
    $output = fopen('php://output', 'wb');
    foreach ($rows as $row) {
        $safe = array_map(static function ($value): string {
            $value = (string) $value;
            return preg_match('/^[\s]*[=+@\-]/', $value) ? "'" . $value : $value;
        }, $row);
        fputcsv($output, $safe);
    }
    fclose($output);
    exit;
}
if ($format === 'xls') {
    header('Content-Type: application/vnd.ms-excel; charset=utf-8');
    header('Content-Disposition: attachment; filename="indica-inquiries.xls"');
    echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    echo '<?mso-application progid="Excel.Sheet"?>' . "\n";
    echo '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Inquiries"><Table>';
    foreach ($rows as $row) {
        echo '<Row>';
        foreach ($row as $value) echo '<Cell><Data ss:Type="String">' . htmlspecialchars((string) $value, ENT_XML1 | ENT_QUOTES, 'UTF-8') . '</Data></Cell>';
        echo '</Row>';
    }
    echo '</Table></Worksheet></Workbook>';
    exit;
}
if ($format === 'xlsx') {
    if (!class_exists('ZipArchive')) {
        indica_json_response(['error' => 'Excel export is unavailable because PHP ZipArchive is not installed.'], 500);
    }
    $data = export_xlsx($rows);
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="indica-inquiries.xlsx"');
    header('Content-Length: ' . strlen($data));
    echo $data;
    exit;
}
if ($format === 'pdf') {
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="indica-inquiries.pdf"');
    echo export_pdf($rows);
    exit;
}
indica_json_response(['error' => 'Unknown export format.'], 404);
