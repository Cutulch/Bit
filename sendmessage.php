<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

const NAME_MAX_LENGTH = 60;
const MESSAGE_MAX_LENGTH = 400;

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
  respond(405, false, 'Метод не поддерживается.');
}

$name = normalizeInput(getPostValue(['Имя', 'name']));
$phoneRaw = normalizeInput(getPostValue(['Телефон', 'phone']));
$phone = normalizePhone($phoneRaw);
$message = normalizeInput(getPostValue(['Сообщение', 'message']));
$instrument = normalizeInput(getPostValue(['Инструмент', 'instrument']));

if ($name === '' || $phoneRaw === '') {
  respond(422, false, 'Заполните обязательные поля: имя и телефон.');
}

if (containsLink($name)) {
  respond(422, false, 'Поле "Имя" не должно содержать ссылки.');
}

if (str_contains($name, '_')) {
  respond(422, false, 'Поле "Имя" не должно содержать символ "_".');
}

$nameWordsCount = countWords($name);
if ($nameWordsCount < 1 || $nameWordsCount > 3) {
  respond(422, false, 'Поле "Имя" должно содержать от 1 до 3 слов.');
}

if (stringLength($name) > NAME_MAX_LENGTH) {
  respond(422, false, 'Поле "Имя" слишком длинное.');
}

if (!preg_match('/^[\p{L}\s]+$/u', $name)) {
  respond(422, false, 'Поле "Имя" может содержать только буквы и пробелы.');
}

if ($phone === '' || !preg_match('/^\+?\d{10,15}$/', $phone)) {
  respond(422, false, 'Поле "Телефон" должно содержать 10-15 цифр. Допускаются пробелы, скобки, дефисы и "+" в начале.');
}

if ($instrument !== '') {
  if (stringLength($instrument) > 80) {
    respond(422, false, 'Поле "Инструмент" слишком длинное.');
  }

  if (containsLink($instrument)) {
    respond(422, false, 'Поле "Инструмент" не должно содержать ссылки.');
  }

  if (!preg_match('/^[\p{L}\s(),-]+$/u', $instrument)) {
    respond(422, false, 'Поле "Инструмент" содержит недопустимые символы.');
  }
}

if ($message !== '') {
  if (stringLength($message) > MESSAGE_MAX_LENGTH) {
    respond(422, false, 'Поле "Сообщение" слишком длинное. Максимум 400 символов.');
  }

  if (containsLink($message)) {
    respond(422, false, 'Поле "Сообщение" не должно содержать ссылки.');
  }

  if (!preg_match('/^[\p{L}\p{N}\s.,!?():;"-]+$/u', $message)) {
    respond(422, false, 'Поле "Сообщение" содержит недопустимые символы.');
  }
}

if ($message === '' && $instrument === '') {
  respond(422, false, 'Заполните поле "Сообщение" или "Инструмент".');
}

$contentParts = [
  '<b>Сообщение с сайта БИТ:</b>',
  '<b>Имя</b>: <i>' . escapeHtml($name) . '</i>',
  '<b>Телефон</b>: <i>' . escapeHtml($phone) . '</i>',
];

if ($instrument !== '') {
  $contentParts[] = '<b>Инструмент</b>: <i>' . escapeHtml($instrument) . '</i>';
}

if ($message !== '') {
  $contentParts[] = '<b>Сообщение</b>: <i>' . escapeHtml($message) . '</i>';
}

$apiToken = '6560849098:AAF8Onwn-kuqwoabxK1FzrcmfVIXsIoKxeo';
$data = [
  'chat_id' => '-1002078304770',
  'text' => implode("\n", $contentParts),
  'parse_mode' => 'HTML',
];

$url = 'https://api.telegram.org/bot' . $apiToken . '/sendMessage?' . http_build_query($data);
$response = @file_get_contents($url);

if ($response === false) {
  respond(500, false, 'Не удалось отправить сообщение. Попробуйте позже.');
}

respond(200, true, 'Сообщение отправлено.');

function respond(int $statusCode, bool $success, string $message): void
{
  http_response_code($statusCode);
  echo json_encode([
    'success' => $success,
    'message' => $message,
  ], JSON_UNESCAPED_UNICODE);
  exit;
}

function getPostValue(array $keys): string
{
  foreach ($keys as $key) {
    $value = $_POST[$key] ?? null;
    if (!is_string($value)) {
      continue;
    }

    return $value;
  }

  return '';
}

function normalizeInput(string $value): string
{
  $value = trim($value);
  return preg_replace('/\s+/u', ' ', $value) ?? '';
}

function normalizePhone(string $value): string
{
  if ($value === '') {
    return '';
  }

  if (!preg_match('/^\+?[\d\s()-]+$/u', $value)) {
    return '';
  }

  $normalized = preg_replace('/[\s()-]+/u', '', $value);
  if (!is_string($normalized) || $normalized === '') {
    return '';
  }

  if (substr_count($normalized, '+') > 1) {
    return '';
  }

  if (strpos($normalized, '+') > 0) {
    return '';
  }

  $digits = str_replace('+', '', $normalized);
  if ($digits === '' || !ctype_digit($digits)) {
    return '';
  }

  return str_starts_with($normalized, '+') ? '+' . $digits : $digits;
}

function containsLink(string $value): bool
{
  return (bool) preg_match('/(?:https?:\/\/|www\.|t\.me\/|telegram\.me\/|(?:[a-z0-9-]+\.)+[a-z]{2,})/iu', $value);
}

function countWords(string $value): int
{
  $parts = preg_split('/\s+/u', trim($value), -1, PREG_SPLIT_NO_EMPTY);
  if ($parts === false) {
    return 0;
  }

  return count($parts);
}

function stringLength(string $value): int
{
  if (function_exists('mb_strlen')) {
    return mb_strlen($value);
  }

  return strlen($value);
}

function escapeHtml(string $value): string
{
  return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
