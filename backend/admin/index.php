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
  <h2>Case studies</h2>
  <div class="grid">
  <?php foreach (array_merge([['id'=>'','company'=>'','title'=>'','profile'=>'','description'=>'','services'=>'','website'=>'','image'=>'','published'=>true]], $content['case_studies'] ?? []) as $study): ?>
    <form class="item" method="post" enctype="multipart/form-data"><input type="hidden" name="_csrf" value="<?= indica_h($csrf) ?>"><input type="hidden" name="action" value="save_study"><input type="hidden" name="id" value="<?= indica_h((string)($study['id'] ?? '')) ?>"><h3><?= ($study['id'] ?? '') === '' ? 'Add a case study' : 'Edit case study' ?></h3>
      <label class="field">Client company<input name="company" maxlength="160" value="<?= indica_h((string)($study['company'] ?? '')) ?>" required></label><label class="field">Project title<input name="title" maxlength="180" value="<?= indica_h((string)($study['title'] ?? '')) ?>" required></label><label class="field">Company profile<textarea name="profile" maxlength="3000" required><?= indica_h((string)($study['profile'] ?? '')) ?></textarea></label><label class="field">Case study description<textarea name="description" maxlength="6000" required><?= indica_h((string)($study['description'] ?? '')) ?></textarea></label><label class="field">Services provided<input name="services" maxlength="500" value="<?= indica_h((string)($study['services'] ?? '')) ?>"></label><label class="field">Client website (optional)<input name="website" type="url" maxlength="500" value="<?= indica_h((string)($study['website'] ?? '')) ?>"></label><label class="field">Client image (JPG, PNG, WebP; max 5 MB)<input name="image" type="file" accept="image/jpeg,image/png,image/webp"></label><?php if (!empty($study['image'])): ?><img class="thumb" src="/api/media.php?name=<?= rawurlencode((string)$study['image']) ?>" alt="Client project image"><?php endif; ?><label class="check"><input type="checkbox" name="published" value="1" <?= !empty($study['published']) ? 'checked' : '' ?>> Published</label><div class="actions" style="margin-top:1rem"><button>Save case study</button><?php if (($study['id'] ?? '') !== ''): ?><button class="danger" name="action" value="delete_study" formnovalidate>Delete</button><?php endif; ?></div>
    </form>
  <?php endforeach; ?>
  </div>

  <h2>Client reviews</h2>
  <div class="grid">
  <?php foreach (array_merge([['id'=>'','client'=>'','role'=>'','company'=>'','quote'=>'','rating'=>5,'published'=>true]], $content['testimonials'] ?? []) as $review): ?>
    <form class="item" method="post"><input type="hidden" name="_csrf" value="<?= indica_h($csrf) ?>"><input type="hidden" name="action" value="save_testimonial"><input type="hidden" name="id" value="<?= indica_h((string)($review['id'] ?? '')) ?>"><h3><?= ($review['id'] ?? '') === '' ? 'Add a client review' : 'Edit client review' ?></h3><div class="row"><label class="field">Client name<input name="client" maxlength="120" value="<?= indica_h((string)($review['client'] ?? '')) ?>" required></label><label class="field">Role<input name="role" maxlength="120" value="<?= indica_h((string)($review['role'] ?? '')) ?>"></label><label class="field">Company<input name="company" maxlength="160" value="<?= indica_h((string)($review['company'] ?? '')) ?>"></label><label class="field">Rating out of 5.0<input name="rating" type="number" min="1" max="5" step="0.1" value="<?= indica_h((string)($review['rating'] ?? 5)) ?>" required></label></div><label class="field">Review<textarea name="quote" maxlength="3000" required><?= indica_h((string)($review['quote'] ?? '')) ?></textarea></label><label class="check"><input type="checkbox" name="published" value="1" <?= !empty($review['published']) ? 'checked' : '' ?>> Published</label><div class="actions" style="margin-top:1rem"><button>Save review</button><?php if (($review['id'] ?? '') !== ''): ?><button class="danger" name="action" value="delete_testimonial" formnovalidate>Delete</button><?php endif; ?></div></form>
  <?php endforeach; ?>
  </div>

  <h2>Client inquiries <small>(<?= count($inquiries) ?>)</small></h2>
  <section class="panel">
  <?php if (!$inquiries): ?><p class="muted">No inquiries received yet.</p><?php endif; ?>
  <?php foreach ($inquiries as $inquiry): ?><article class="inquiry"><strong><?= indica_h((string)($inquiry['company_name'] ?? '')) ?></strong> · <a href="tel:<?= indica_h((string)($inquiry['mobile_number'] ?? '')) ?>"><?= indica_h((string)($inquiry['mobile_number'] ?? '')) ?></a><br><small><?= indica_h((string)($inquiry['created_at'] ?? '')) ?> · <?= indica_h(implode(', ', $inquiry['services'] ?? [])) ?></small><p><?= indica_h((string)($inquiry['query'] ?? '')) ?></p></article><?php endforeach; ?>
  </section>
<?php endif; ?>
</main>
</body>
</html>
