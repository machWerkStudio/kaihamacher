<?php
// Kontaktformular Hamacher Marketing – Muster wie mein-fw.de/contact.php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
date_default_timezone_set('Europe/Berlin');

function reply(int $status, bool $ok, string $message = ''): void
{
    http_response_code($status);
    echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

// Antworttexte in der Sprache der Seite (DE/EN-Umschalter)
$en = ($_POST['lang'] ?? '') === 'en';
function t(bool $en, string $de, string $english): string
{
    return $en ? $english : $de;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    reply(405, false, 'Method not allowed');
}

// Nur Anfragen von der eigenen Seite annehmen (Browser senden den Origin-Header mit)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== parse_url('//' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST)) {
    reply(403, false, 'Forbidden');
}

// Mindest-Ausfüllzeit: Das Skript setzt beim Laden einen Zeitstempel; Bots schicken sofort oder gar keinen
$ts = (int)($_POST['ts'] ?? 0);
$age = time() - intdiv($ts, 1000);
if ($ts === 0 || $age < 3 || $age > 86400) {
    reply(400, false, t($en, 'Bitte lade die Seite neu und versuche es noch einmal.', 'Please reload the page and try again.'));
}

// Einfache Begrenzung: höchstens 5 Nachrichten pro 15 Minuten je Absender (IP nur als Hash, kurzlebig)
$saltFile = sys_get_temp_dir() . '/hm-contact-salt';
if (!@is_file($saltFile)) {
    @file_put_contents($saltFile, bin2hex(random_bytes(32)), LOCK_EX);
}
$salt = (string)@file_get_contents($saltFile);
$limitFile = sys_get_temp_dir() . '/hm-contact-' . hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? '', $salt . __FILE__);
$hits = array_filter(
    @is_file($limitFile) ? array_map('intval', explode(",", (string)@file_get_contents($limitFile))) : [],
    fn(int $t): bool => $t > time() - 900
);
if (count($hits) >= 5) {
    reply(429, false, t($en, 'Zu viele Nachrichten in kurzer Zeit. Bitte versuche es später noch einmal.', 'Too many messages in a short time. Please try again later.'));
}

// Honeypot: Bots füllen das versteckte Feld aus – still "erfolgreich" antworten
if (trim((string)($_POST['website'] ?? '')) !== '') {
    reply(200, true, t($en, 'Danke, deine Nachricht wurde gesendet.', 'Thank you, your message has been sent.'));
}

$topics = ['Content Creation', 'Design & Print', 'Guerilla-Marketing', 'Stände & Aktionen', 'Plakate & Flyer', 'Streetfood', 'Etwas anderes'];

$name = trim((string)($_POST['name'] ?? ''));
$email = trim((string)($_POST['email'] ?? ''));
$phone = trim((string)($_POST['phone'] ?? ''));
$topic = trim((string)($_POST['topic'] ?? ''));
$message = trim((string)($_POST['message'] ?? ''));

if ($name === '' || $email === '' || $message === '') {
    reply(422, false, t($en, 'Bitte Name, E-Mail und Nachricht ausfüllen.', 'Please fill in your name, email and message.'));
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    reply(422, false, t($en, 'Bitte eine gültige E-Mail-Adresse eingeben.', 'Please enter a valid email address.'));
}
if (mb_strlen($name) > 120 || mb_strlen($phone) > 40 || mb_strlen($message) > 5000) {
    reply(422, false, t($en, 'Die Eingabe ist zu lang.', 'Your input is too long.'));
}
if (!in_array($topic, $topics, true)) {
    $topic = 'Etwas anderes';
}

// Zeilenumbrüche aus Header-Werten entfernen (Header-Injection)
$name = preg_replace('/[\r\n]+/', ' ', $name);
$email = preg_replace('/[\r\n]+/', '', $email);
$phone = preg_replace('/[\r\n]+/', ' ', $phone);
$message = str_replace(["\r\n", "\r"], "\n", $message);

$to = 'info@hamacher-marketing.de';
$subject = mb_encode_mimeheader("Anfrage: {$topic} – {$name}", 'UTF-8');
$body = "Neue Anfrage über die digitale Visitenkarte" . ($en ? " (englische Seite)" : "") . "\n\n";
$body .= "Thema: {$topic}\n";
$body .= "Name: {$name}\n";
$body .= "E-Mail: {$email}\n";
$body .= 'Telefon: ' . ($phone !== '' ? $phone : '–') . "\n";
$body .= 'Zeit: ' . date('d.m.Y H:i') . "\n\n";
$body .= "Nachricht:\n{$message}\n";

$headers = [
    'From: ' . mb_encode_mimeheader('Hamacher Marketing Website', 'UTF-8') . ' <info@hamacher-marketing.de>',
    'Reply-To: ' . mb_encode_mimeheader($name, 'UTF-8') . ' <' . $email . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
];

$hits[] = time();
@file_put_contents($limitFile, implode(',', $hits), LOCK_EX);

$sent = mail($to, $subject, $body, implode("\r\n", $headers), '-f info@hamacher-marketing.de');

if (!$sent) {
    reply(500, false, t($en, 'Die Nachricht konnte nicht gesendet werden.', 'Your message could not be sent.'));
}

reply(200, true, t($en, 'Danke! Deine Nachricht ist angekommen – wir melden uns bei dir.', "Thank you! Your message has arrived – we'll get back to you."));
