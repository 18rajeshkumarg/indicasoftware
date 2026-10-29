<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
indica_start_admin_session();

$configuredUser = getenv('INDICA_ADMIN_USERNAME') ?: '';
$passwordHash = getenv('INDICA_ADMIN_PASSWORD_HASH') ?: '';
$ready = $configuredUser !== '' && $passwordHash !== '';
$error = '';

function admin_redirect(string $message): never
{
    $_SESSION['indica_flash'] = $message;
    header('Location: /admin/');
    exit;
}

function admin_upload(?array $upload, string $old = ''): string
{
    if (!$upload || ($upload['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return $old;
    if (($upload['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK || ($upload['size'] ?? 0) > 5 * 1024 * 1024) {
        throw new RuntimeException('Images must be smaller than 5 MB.');
    }
    $image = @getimagesize((string) $upload['tmp_name']);
    $extensions = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'];
    $imageType = is_array($image) ? ($image[2] ?? 0) : 0;
    if (!isset($extensions[$imageType])) throw new RuntimeException('Use a valid JPG, PNG, or WebP image.');
    if (($image[0] ?? 0) > 10000 || ($image[1] ?? 0) > 10000 || ($image[0] ?? 0) * ($image[1] ?? 0) > 50000000) {
        throw new RuntimeException('Image dimensions must be 10,000 px or less per side.');
    }
    $name = bin2hex(random_bytes(16)) . '.' . $extensions[$imageType];
    $dir = indica_storage_dir() . DIRECTORY_SEPARATOR . 'uploads';
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
        throw new RuntimeException('Unable to prepare image storage.');
    }
    if (!move_uploaded_file((string) $upload['tmp_name'], $dir . DIRECTORY_SEPARATOR . $name)) {
        throw new RuntimeException('Unable to save the uploaded image.');
    }
    @chmod($dir . DIRECTORY_SEPARATOR . $name, 0600);
    return $name;
}

function admin_upload_video(?array $upload): string
{
    if (!$upload || ($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        throw new RuntimeException('Choose an MP4 or WebM video smaller than 45 MB.');
    }
    if (($upload['size'] ?? 0) > 45 * 1024 * 1024) {
        throw new RuntimeException('Videos must be smaller than 45 MB.');
    }
    $extension = strtolower(pathinfo((string) ($upload['name'] ?? ''), PATHINFO_EXTENSION));
    $handle = @fopen((string) $upload['tmp_name'], 'rb');
    $signature = $handle ? (string) fread($handle, 16) : '';
    if ($handle) fclose($handle);
    $isMp4 = $extension === 'mp4' && strlen($signature) >= 8 && substr($signature, 4, 4) === 'ftyp';
    $isWebm = $extension === 'webm' && str_starts_with($signature, "\x1A\x45\xDF\xA3");
    if (!$isMp4 && !$isWebm) {
        throw new RuntimeException('Use a valid MP4 or WebM video.');
    }
    $name = bin2hex(random_bytes(16)) . '.' . $extension;
    $dir = indica_storage_dir() . DIRECTORY_SEPARATOR . 'videos';
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
        throw new RuntimeException('Unable to prepare video storage.');
    }
    if (!move_uploaded_file((string) $upload['tmp_name'], $dir . DIRECTORY_SEPARATOR . $name)) {
        throw new RuntimeException('Unable to save the video.');
    }
    @chmod($dir . DIRECTORY_SEPARATOR . $name, 0600);
    return $name;
}

function admin_delete_video_file(?array $video): void
{
    $name = (string) ($video['name'] ?? '');
    if (!preg_match('/^[a-f0-9]{32}\.(?:mp4|webm)$/', $name)) return;
    $path = indica_storage_dir() . DIRECTORY_SEPARATOR . 'videos' . DIRECTORY_SEPARATOR . $name;
    if (is_file($path)) @unlink($path);
}

function admin_https_url(string $value, string $label): string
{
    $value = trim($value);
    if ($value === '') return '';
    $url = filter_var($value, FILTER_VALIDATE_URL);
    if ($url === false || strtolower((string) parse_url($value, PHP_URL_SCHEME)) !== 'https') {
        throw new RuntimeException($label . ' must be a valid HTTPS link.');
    }
    return $value;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!indica_check_csrf()) {
        http_response_code(403);
        $error = 'This form expired. Reload and try again.';
    } else {
        $action = (string) ($_POST['action'] ?? '');
        if ($action === 'login') {
            $username = (string) ($_POST['username'] ?? '');
            $password = (string) ($_POST['password'] ?? '');
            if (!$ready || !hash_equals($configuredUser, $username) || !password_verify($password, $passwordHash)) {
                usleep(400000);
                $error = 'The username or password is incorrect.';
            } else {
                session_regenerate_id(true);
                $_SESSION['indica_admin'] = true;
                $_SESSION['indica_csrf'] = bin2hex(random_bytes(32));
                admin_redirect('Signed in successfully.');
            }
        } elseif (indica_is_admin()) {
            try {
                if ($action === 'logout') {
                    $_SESSION = [];
                    session_destroy();
                    header('Location: /admin/');
                    exit;
                }

                if ($action === 'save_study') {
                    $id = trim((string) ($_POST['id'] ?? '')) ?: bin2hex(random_bytes(12));
                    $oldContent = indica_read_json('content.json', ['case_studies' => [], 'testimonials' => []]);
                    $oldImage = '';
                    foreach ($oldContent['case_studies'] ?? [] as $oldItem) {
                        if (($oldItem['id'] ?? '') === $id) $oldImage = (string) ($oldItem['image'] ?? '');
                    }
                    $image = admin_upload($_FILES['image'] ?? null, $oldImage);
                    $item = [
                        'id' => $id,
                        'company' => trim((string) ($_POST['company'] ?? '')),
                        'title' => trim((string) ($_POST['title'] ?? '')),
                        'profile' => trim((string) ($_POST['profile'] ?? '')),
                        'description' => trim((string) ($_POST['description'] ?? '')),
                        'services' => trim((string) ($_POST['services'] ?? '')),
                        'website' => trim((string) ($_POST['website'] ?? '')),
                        'image' => $image,
                        'published' => isset($_POST['published']),
                        'updated_at' => gmdate(DATE_ATOM),
                    ];
                    if ($item['company'] === '' || $item['title'] === '' || $item['profile'] === '' || $item['description'] === '') {
                        throw new RuntimeException('Company, project title, company profile, and description are required.');
                    }
                    if (strlen($item['company']) > 640 || strlen($item['title']) > 720 || strlen($item['profile']) > 12000 || strlen($item['description']) > 24000 || strlen($item['services']) > 2000 || strlen($item['website']) > 2000) {
                        throw new RuntimeException('One or more case study fields are too long.');
                    }
                    indica_update_json('content.json', ['case_studies' => [], 'testimonials' => []], static function (array $content) use ($item): array {
                        $items = $content['case_studies'] ?? [];
                        $found = false;
                        foreach ($items as $index => $existing) {
                            if (($existing['id'] ?? '') === $item['id']) {
                                $items[$index] = $item;
                                $found = true;
                                break;
                            }
                        }
                        if (!$found) array_unshift($items, $item);
                        $content['case_studies'] = $items;
                        $content['testimonials'] ??= [];
                        return $content;
                    });
                    admin_redirect('Case study saved.');
                }

                if ($action === 'delete_study' || $action === 'delete_testimonial') {
                    $id = (string) ($_POST['id'] ?? '');
                    $key = $action === 'delete_study' ? 'case_studies' : 'testimonials';
                    indica_update_json('content.json', ['case_studies' => [], 'testimonials' => []], static function (array $content) use ($key, $id): array {
                        $content[$key] = array_values(array_filter(
                            $content[$key] ?? [],
                            static fn ($item) => ($item['id'] ?? '') !== $id
                        ));
                        return $content;
                    });
                    admin_redirect($key === 'case_studies' ? 'Case study deleted.' : 'Review deleted.');
                }

                if ($action === 'save_team_member') {
                    $id = trim((string) ($_POST['id'] ?? '')) ?: bin2hex(random_bytes(12));
                    $oldContent = indica_read_json('content.json', ['team' => []]);
                    $oldImage = '';
                    foreach ($oldContent['team'] ?? [] as $member) {
                        if (($member['id'] ?? '') === $id) $oldImage = (string) ($member['image'] ?? '');
                    }
                    $item = [
                        'id' => $id,
                        'name' => trim((string) ($_POST['name'] ?? '')),
                        'position' => trim((string) ($_POST['position'] ?? '')),
                        'profession' => trim((string) ($_POST['profession'] ?? '')),
                        'description' => trim((string) ($_POST['description'] ?? '')),
                        'email' => trim((string) ($_POST['email'] ?? '')),
                        'phone' => trim((string) ($_POST['phone'] ?? '')),
                        'linkedin' => admin_https_url((string) ($_POST['linkedin'] ?? ''), 'LinkedIn'),
                        'instagram' => admin_https_url((string) ($_POST['instagram'] ?? ''), 'Instagram'),
                        'website' => admin_https_url((string) ($_POST['website'] ?? ''), 'Website'),
                        'image' => admin_upload($_FILES['image'] ?? null, $oldImage),
                        'published' => isset($_POST['published']),
                        'updated_at' => gmdate(DATE_ATOM),
                    ];
                    if ($item['name'] === '' || $item['position'] === '' || $item['profession'] === '' || $item['description'] === '') {
                        throw new RuntimeException('Name, position, profession, and description are required.');
                    }
                    if ($item['image'] === '') throw new RuntimeException('Upload a photo for this team member.');
                    if (strlen($item['name']) > 120 || strlen($item['position']) > 120 || strlen($item['profession']) > 180 || strlen($item['description']) > 4000 || strlen($item['email']) > 254 || strlen($item['phone']) > 40 || strlen($item['linkedin']) > 1000 || strlen($item['instagram']) > 1000 || strlen($item['website']) > 1000) {
                        throw new RuntimeException('One or more team member fields are too long.');
                    }
                    if ($item['email'] !== '' && !filter_var($item['email'], FILTER_VALIDATE_EMAIL)) {
                        throw new RuntimeException('Enter a valid team member email address.');
                    }
                    if ($item['phone'] !== '' && !preg_match('/^[+0-9().\s-]{5,40}$/', $item['phone'])) {
                        throw new RuntimeException('Enter a valid team member phone number.');
                    }
                    indica_update_json('content.json', ['team' => [], 'case_studies' => [], 'testimonials' => []], static function (array $content) use ($item): array {
                        $items = $content['team'] ?? [];
                        $found = false;
                        foreach ($items as $index => $existing) {
                            if (($existing['id'] ?? '') === $item['id']) {
                                $items[$index] = $item;
                                $found = true;
                                break;
                            }
                        }
                        if (!$found) array_unshift($items, $item);
                        $content['team'] = $items;
                        return $content;
                    });
                    admin_redirect('Team member saved.');
                }

                if ($action === 'delete_team_member') {
                    $id = (string) ($_POST['id'] ?? '');
                    if (!preg_match('/^[a-f0-9]{24}$/', $id)) throw new RuntimeException('Choose a valid team member to delete.');
                    indica_update_json('content.json', ['team' => []], static function (array $content) use ($id): array {
                        $content['team'] = array_values(array_filter($content['team'] ?? [], static fn ($item) => ($item['id'] ?? '') !== $id));
                        return $content;
                    });
                    admin_redirect('Team member deleted.');
                }

                if ($action === 'save_about_video') {
                    $title = trim((string) ($_POST['video_title'] ?? ''));
                    if (strlen($title) > 160) throw new RuntimeException('The video title is too long.');
                    $name = admin_upload_video($_FILES['video'] ?? null);
                    $oldContent = indica_read_json('content.json', []);
                    $oldVideo = is_array($oldContent['about_video'] ?? null) ? $oldContent['about_video'] : null;
                    indica_update_json('content.json', [], static function (array $content) use ($name, $title): array {
                        $content['about_video'] = ['name' => $name, 'title' => $title, 'published' => true, 'updated_at' => gmdate(DATE_ATOM)];
                        return $content;
                    });
                    admin_delete_video_file($oldVideo);
                    admin_redirect('About Us video published.');
                }

                if ($action === 'remove_about_video') {
                    $oldContent = indica_read_json('content.json', []);
                    $oldVideo = is_array($oldContent['about_video'] ?? null) ? $oldContent['about_video'] : null;
                    indica_update_json('content.json', [], static function (array $content): array {
                        $content['about_video'] = ['removed' => true, 'published' => true, 'updated_at' => gmdate(DATE_ATOM)];
                        return $content;
                    });
                    admin_delete_video_file($oldVideo);
                    admin_redirect('About Us video removed.');
                }

                if ($action === 'delete_inquiry') {
                    $id = (string) ($_POST['id'] ?? '');
                    if (!preg_match('/^[a-f0-9]{24}$/', $id)) throw new RuntimeException('Choose a valid inquiry to delete.');
                    indica_update_json('inquiries.json', [], static function (array $items) use ($id): array {
                        return array_values(array_filter($items, static fn ($item) => ($item['id'] ?? '') !== $id));
                    });
                    admin_redirect('Inquiry deleted.');
                }

                if ($action === 'save_testimonial') {
                    $rating = (float) ($_POST['rating'] ?? 0);
                    $item = [
                        'id' => trim((string) ($_POST['id'] ?? '')) ?: bin2hex(random_bytes(12)),
                        'client' => trim((string) ($_POST['client'] ?? '')),
                        'role' => trim((string) ($_POST['role'] ?? '')),
                        'company' => trim((string) ($_POST['company'] ?? '')),
                        'quote' => trim((string) ($_POST['quote'] ?? '')),
                        'rating' => round($rating, 1),
                        'published' => isset($_POST['published']),
                        'updated_at' => gmdate(DATE_ATOM),
                    ];
                    if ($item['client'] === '' || $item['quote'] === '' || $rating < 1 || $rating > 5) {
                        throw new RuntimeException('Client name, review, and a rating from 1.0 to 5.0 are required.');
                    }
                    if (strlen($item['client']) > 480 || strlen($item['role']) > 480 || strlen($item['company']) > 640 || strlen($item['quote']) > 12000 || !is_finite($rating)) {
                        throw new RuntimeException('One or more review fields are too long or invalid.');
                    }
                    indica_update_json('content.json', ['case_studies' => [], 'testimonials' => []], static function (array $content) use ($item): array {
                        $items = $content['testimonials'] ?? [];
                        $found = false;
                        foreach ($items as $index => $existing) {
                            if (($existing['id'] ?? '') === $item['id']) {
                                $items[$index] = $item;
                                $found = true;
                                break;
                            }
                        }
                        if (!$found) array_unshift($items, $item);
                        $content['testimonials'] = $items;
                        $content['case_studies'] ??= [];
                        return $content;
                    });
                    admin_redirect('Review saved.');
                }
            } catch (Throwable $exception) {
                $error = $exception->getMessage();
            }
        }
    }
}

$content = indica_read_json('content.json', ['case_studies' => [], 'testimonials' => []]);
$inquiries = indica_read_json('inquiries.json', []);
$teamMembers = $content['team'] ?? [];
$aboutVideo = is_array($content['about_video'] ?? null) ? $content['about_video'] : null;
$flash = (string) ($_SESSION['indica_flash'] ?? '');
unset($_SESSION['indica_flash']);
$csrf = indica_csrf_token();
$loggedIn = indica_is_admin();
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header("Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'");
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Indica Site Admin</title>
  <style>
    :root{font-family:Inter,system-ui,sans-serif;color:#201a35;background:#f4f2f9}*{box-sizing:border-box}body{margin:0}header{padding:1.2rem clamp(1rem,4vw,3rem);background:#241052;color:white;display:flex;justify-content:space-between;align-items:center;gap:1rem}main{max-width:1100px;margin:2rem auto;padding:0 1rem 4rem}h1,h2,h3{line-height:1.2}h1{margin:0;font-size:1.25rem}h2{margin-top:2.5rem;color:#31136c}h3{margin:.2rem 0 1rem}.panel,.item{background:white;border:1px solid #e3deed;border-radius:14px;padding:1.25rem;margin:1rem 0;box-shadow:0 8px 28px #31136c0d}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:1rem}.field{display:grid;gap:.4rem;margin:.8rem 0}label{font-weight:650}input,textarea,select{width:100%;padding:.7rem .8rem;border:1px solid #c9c2d7;border-radius:8px;font:inherit}textarea{min-height:110px;resize:vertical}.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:.8rem}button{border:0;border-radius:8px;padding:.75rem 1.1rem;background:#31136c;color:#fff;font:inherit;font-weight:650;cursor:pointer}button.secondary{background:#665a7e}button.danger{background:#a32d46}.muted{color:#645e70}.notice{padding:.9rem 1rem;background:#eaf8ee;border-radius:8px}.error{padding:.9rem 1rem;background:#fff0f1;color:#8a1630;border-radius:8px}.actions{display:flex;gap:.6rem;flex-wrap:wrap;align-items:center}.thumb{width:100%;max-height:220px;object-fit:cover;border-radius:8px}.check{display:flex;gap:.5rem;align-items:center}.check input{width:auto}.review,.inquiry{border-top:1px solid #e6e1ed;padding:1rem 0}.inquiry p,.review p{white-space:pre-wrap;overflow-wrap:anywhere}small{color:#726b7e}
  </style>
  <style>.export-links{display:flex;gap:.65rem;flex-wrap:wrap}.export-links a{display:inline-block;padding:.7rem 1rem;background:#ede8f6;color:#31136c;border-radius:8px;font-weight:650;text-decoration:none}.meta{display:block;margin:.4rem 0;color:#645e70;font-size:.86rem}.member-photo{max-width:180px;max-height:180px;object-fit:cover;border-radius:10px}</style>
</head>
<body>
<header><h1>Indica Software · Content Admin</h1><?php if ($loggedIn): ?><form method="post"><input type="hidden" name="_csrf" value="<?= indica_h($csrf) ?>"><input type="hidden" name="action" value="logout"><button class="secondary">Sign out</button></form><?php endif; ?></header>
<main>
<?php if ($flash !== ''): ?><p class="notice"><?= indica_h($flash) ?></p><?php endif; ?>
<?php if ($error !== ''): ?><p class="error"><?= indica_h($error) ?></p><?php endif; ?>
<?php if (!$ready): ?>
  <section class="panel"><h2>Admin login is not configured</h2><p>Set <code>INDICA_ADMIN_USERNAME</code> and <code>INDICA_ADMIN_PASSWORD_HASH</code> in the PHP server environment. Generate a password hash with <code>php -r "echo password_hash('your-password', PASSWORD_DEFAULT), PHP_EOL;"</code>.</p></section>
<?php elseif (!$loggedIn): ?>
  <form class="panel" method="post" autocomplete="on"><h2>Sign in</h2><input type="hidden" name="_csrf" value="<?= indica_h($csrf) ?>"><input type="hidden" name="action" value="login"><label class="field">Username<input name="username" autocomplete="username" required></label><label class="field">Password<input name="password" type="password" autocomplete="current-password" required></label><button>Sign in</button></form>
<?php else: ?>
  <p class="muted">Published items appear on the public Case Studies page. Unpublished items remain saved here.</p>
  <section class="panel"><h2>Inquiry downloads</h2><p class="muted">Exports contain submitted form details and the basic browser/device information disclosed to visitors.</p><nav class="export-links" aria-label="Download inquiries"><a href="/admin/export.php?format=csv">Download CSV</a><a href="/admin/export.php?format=xlsx">Download Excel (.xlsx)</a><a href="/admin/export.php?format=pdf">Download PDF</a></nav></section>
  <h2>Case studies</h2>
  <div class="grid">
  <?php foreach (array_merge([['id'=>'','company'=>'','title'=>'','profile'=>'','description'=>'','services'=>'','website'=>'','image'=>'','published'=>true]], $content['case_studies'] ?? []) as $study): ?>
    <form class="item" method="post" enctype="multipart/form-data"><input type="hidden" name="_csrf" value="<?= indica_h($csrf) ?>"><input type="hidden" name="action" value="save_study"><input type="hidden" name="id" value="<?= indica_h((string)($study['id'] ?? '')) ?>"><h3><?= ($study['id'] ?? '') === '' ? 'Add a case study' : 'Edit case study' ?></h3>
      <label class="field">Client company<input name="company" maxlength="160" value="<?= indica_h((string)($study['company'] ?? '')) ?>" required></label><label class="field">Project title<input name="title" maxlength="180" value="<?= indica_h((string)($study['title'] ?? '')) ?>" required></label><label class="field">Company profile<textarea name="profile" maxlength="3000" required><?= indica_h((string)($study['profile'] ?? '')) ?></textarea></label><label class="field">Case study description<textarea name="description" maxlength="6000" required><?= indica_h((string)($study['description'] ?? '')) ?></textarea></label><label class="field">Services provided<input name="services" maxlength="500" value="<?= indica_h((string)($study['services'] ?? '')) ?>"></label><label class="field">Client website (optional)<input name="website" type="url" maxlength="500" value="<?= indica_h((string)($study['website'] ?? '')) ?>"></label><label class="field">Client image (JPG, PNG, WebP; max 5 MB)<input name="image" type="file" accept="image/jpeg,image/png,image/webp"></label><?php if (!empty($study['image'])): ?><img class="thumb" src="/api/media.php?name=<?= rawurlencode((string)$study['image']) ?>" alt="Client project image"><?php endif; ?><label class="check"><input type="checkbox" name="published" value="1" <?= !empty($study['published']) ? 'checked' : '' ?>> Published</label><div class="actions" style="margin-top:1rem"><button>Save case study</button><?php if (($study['id'] ?? '') !== ''): ?><button class="danger" name="action" value="delete_study" formnovalidate>Delete</button><?php endif; ?></div>
    </form>
  <?php endforeach; ?>
  </div>

  <h2>About Us video</h2>
  <section class="panel">
    <p class="muted"><?php if ($aboutVideo && !empty($aboutVideo['name'])): ?>Current managed video: <?= indica_h((string)$aboutVideo['name']) ?><?php elseif ($aboutVideo && !empty($aboutVideo['removed'])): ?>The video is currently removed from the About Us page.<?php else: ?>The existing About Us video is shown until you publish a replacement.<?php endif; ?></p>
    <?php if ($aboutVideo && !empty($aboutVideo['name'])): ?><video class="thumb" controls preload="metadata" src="/api/media.php?type=video&amp;name=<?= rawurlencode((string)$aboutVideo['name']) ?>"></video><?php endif; ?>
    <form method="post" enctype="multipart/form-data"><input type="hidden" name="_csrf" value="<?= indica_h($csrf) ?>"><input type="hidden" name="action" value="save_about_video"><label class="field">Video title (optional)<input name="video_title" maxlength="160" value="<?= indica_h((string)($aboutVideo['title'] ?? '')) ?>"></label><label class="field">Upload MP4 or WebM video (max 45 MB)<input name="video" type="file" accept="video/mp4,video/webm" required></label><button>Upload and publish video</button></form>
    <form method="post" style="margin-top:1rem"><input type="hidden" name="_csrf" value="<?= indica_h($csrf) ?>"><input type="hidden" name="action" value="remove_about_video"><button class="danger">Remove About Us video</button></form>
  </section>

  <h2>About Us team members</h2>
  <div class="grid">
  <?php foreach (array_merge([['id'=>'','name'=>'','position'=>'','profession'=>'','description'=>'','email'=>'','phone'=>'','linkedin'=>'','instagram'=>'','website'=>'','image'=>'','published'=>true]], $teamMembers) as $member): ?>
    <form class="item" method="post" enctype="multipart/form-data"><input type="hidden" name="_csrf" value="<?= indica_h($csrf) ?>"><input type="hidden" name="action" value="save_team_member"><input type="hidden" name="id" value="<?= indica_h((string)($member['id'] ?? '')) ?>"><h3><?= ($member['id'] ?? '') === '' ? 'Add a team member' : 'Edit team member' ?></h3><label class="field">Name<input name="name" maxlength="120" value="<?= indica_h((string)($member['name'] ?? '')) ?>" required></label><label class="field">Position<input name="position" maxlength="120" placeholder="e.g. Product Designer" value="<?= indica_h((string)($member['position'] ?? '')) ?>" required></label><label class="field">Profession<input name="profession" maxlength="180" placeholder="e.g. UX and product design" value="<?= indica_h((string)($member['profession'] ?? '')) ?>" required></label><label class="field">Professional description<textarea name="description" maxlength="4000" required><?= indica_h((string)($member['description'] ?? '')) ?></textarea></label><label class="field">Photo (JPG, PNG, WebP; max 5 MB)<input name="image" type="file" accept="image/jpeg,image/png,image/webp"></label><?php if (!empty($member['image'])): ?><img class="member-photo" src="/api/media.php?name=<?= rawurlencode((string)$member['image']) ?>" alt="<?= indica_h((string)$member['name']) ?> profile photo"><?php endif; ?><div class="row"><label class="field">Email<input name="email" type="email" maxlength="254" value="<?= indica_h((string)($member['email'] ?? '')) ?>"></label><label class="field">Phone<input name="phone" type="tel" maxlength="40" value="<?= indica_h((string)($member['phone'] ?? '')) ?>"></label><label class="field">LinkedIn URL<input name="linkedin" type="url" value="<?= indica_h((string)($member['linkedin'] ?? '')) ?>"></label><label class="field">Instagram URL<input name="instagram" type="url" value="<?= indica_h((string)($member['instagram'] ?? '')) ?>"></label><label class="field">Website URL<input name="website" type="url" value="<?= indica_h((string)($member['website'] ?? '')) ?>"></label></div><label class="check"><input type="checkbox" name="published" value="1" <?= !empty($member['published']) ? 'checked' : '' ?>> Published</label><div class="actions" style="margin-top:1rem"><button>Save team member</button><?php if (($member['id'] ?? '') !== ''): ?><button class="danger" name="action" value="delete_team_member" formnovalidate>Delete</button><?php endif; ?></div></form>
  <?php endforeach; ?>
  </div>

  <h2>Client reviews</h2>
  <div class="grid">
  <?php foreach (array_merge([['id'=>'','client'=>'','role'=>'','company'=>'','quote'=>'','rating'=>5,'published'=>true]], $content['testimonials'] ?? []) as $review): ?>
    <form class="item" method="post"><input type="hidden" name="_csrf" value="<?= indica_h($csrf) ?>"><input type="hidden" name="action" value="save_testimonial"><input type="hidden" name="id" value="<?= indica_h((string)($review['id'] ?? '')) ?>"><h3><?= ($review['id'] ?? '') === '' ? 'Add a client review' : 'Edit client review' ?></h3><div class="row"><label class="field">Client name<input name="client" maxlength="120" value="<?= indica_h((string)($review['client'] ?? '')) ?>" required></label><label class="field">Role<input name="role" maxlength="120" value="<?= indica_h((string)($review['role'] ?? '')) ?>"></label><label class="field">Company<input name="company" maxlength="160" value="<?= indica_h((string)($review['company'] ?? '')) ?>"></label><label class="field">Rating out of 5.0<input name="rating" type="number" min="1" max="5" step="0.1" value="<?= indica_h((string)($review['rating'] ?? 5)) ?>" required></label></div><label class="field">Review<textarea name="quote" maxlength="3000" required><?= indica_h((string)($review['quote'] ?? '')) ?></textarea></label><label class="check"><input type="checkbox" name="published" value="1" <?= !empty($review['published']) ? 'checked' : '' ?>> Published</label><div class="actions" style="margin-top:1rem"><button>Save review</button><?php if (($review['id'] ?? '') !== ''): ?><button class="danger" name="action" value="delete_testimonial" formnovalidate>Delete</button><?php endif; ?></div></form>
  <?php endforeach; ?>
  </div>

  <h2>Client inquiries <small>(<span id="inquiry-count"><?= count($inquiries) ?></span>) — updates every 30 seconds</small></h2>
  <section class="panel" data-inquiry-list data-csrf="<?= indica_h($csrf) ?>">
  <?php if (!$inquiries): ?><p class="muted" data-empty-inquiries>No inquiries received yet.</p><?php endif; ?>
  <?php foreach ($inquiries as $inquiry): $device = is_array($inquiry['device'] ?? null) ? $inquiry['device'] : []; ?><article class="inquiry" data-inquiry-id="<?= indica_h((string)($inquiry['id'] ?? '')) ?>"><strong><?= indica_h((string)($inquiry['company_name'] ?? '')) ?></strong> · <a href="tel:<?= indica_h((string)($inquiry['mobile_number'] ?? '')) ?>"><?= indica_h((string)($inquiry['mobile_number'] ?? '')) ?></a><br><small><?= indica_h((string)($inquiry['created_at'] ?? '')) ?> · <?= indica_h(implode(', ', is_array($inquiry['services'] ?? null) ? $inquiry['services'] : [])) ?> · Page <?= indica_h((string)($inquiry['page'] ?? '')) ?></small><p><?= indica_h((string)($inquiry['query'] ?? '')) ?></p><span class="meta">Device: <?= indica_h((string)($device['platform'] ?? 'Unknown')) ?> · Screen <?= indica_h((string)($device['screen'] ?? 'Unknown')) ?> · Viewport <?= indica_h((string)($device['viewport'] ?? 'Unknown')) ?> · <?= indica_h((string)($device['language'] ?? '')) ?> · <?= indica_h((string)($device['timezone'] ?? '')) ?><br>Browser: <?= indica_h((string)($device['user_agent'] ?? 'Not available')) ?></span><form method="post" onsubmit="return confirm('Delete this inquiry? This cannot be undone.');"><input type="hidden" name="_csrf" value="<?= indica_h($csrf) ?>"><input type="hidden" name="action" value="delete_inquiry"><input type="hidden" name="id" value="<?= indica_h((string)($inquiry['id'] ?? '')) ?>"><button class="danger">Delete inquiry</button></form></article><?php endforeach; ?>
  </section>
<?php endif; ?>
</main>
<script src="/admin/admin.js" defer></script>
</body>
</html>
