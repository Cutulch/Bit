<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

const NAME_MAX_LENGTH = 60;
const TEACHER_MAX_LENGTH = 60;
const BRANCH_MAX_LENGTH = 80;
const MESSAGE_MAX_LENGTH = 400;
const TELEGRAM_TIMEOUT_SECONDS = 8;

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
  respond(405, false, 'Метод не поддерживается.');
}

$name = normalizeInput(getPostValue(['Имя', 'name']));
$phoneRaw = normalizeInput(getPostValue(['Телефон', 'phone']));
$phone = normalizePhone($phoneRaw);
$message = normalizeInput(getPostValue(['Сообщение', 'message']));
$direction = normalizeInput(getPostValue(['Направление', 'Инструмент', 'direction', 'instrument']));
$teacher = normalizeInput(getPostValue(['Наставник', 'teacher']));
$branch = normalizeInput(getPostValue(['Адрес', 'Филиал', 'branch']));
$consent = normalizeInput(getPostValue(['Согласие', 'agree', 'privacy_agree']));

if ($name === '' || $phoneRaw === '') {
  respond(422, false, 'Заполните обязательные поля: имя и телефон.');
}

if (!isConsentAccepted($consent)) {
  respond(422, false, 'Подтвердите согласие на обработку персональных данных.');
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

if ($direction !== '') {
  if (stringLength($direction) > 80) {
    respond(422, false, 'Поле "Направление" слишком длинное.');
  }

  if (containsLink($direction)) {
    respond(422, false, 'Поле "Направление" не должно содержать ссылки.');
  }

  if (!preg_match('/^[\p{L}\s(),-]+$/u', $direction)) {
    respond(422, false, 'Поле "Направление" содержит недопустимые символы.');
  }
}

if ($teacher !== '') {
  if (stringLength($teacher) > TEACHER_MAX_LENGTH) {
    respond(422, false, 'Поле "Наставник" слишком длинное.');
  }

  if (containsLink($teacher)) {
    respond(422, false, 'Поле "Наставник" не должно содержать ссылки.');
  }

  if (!preg_match('/^[\p{L}\s-]+$/u', $teacher)) {
    respond(422, false, 'Поле "Наставник" содержит недопустимые символы.');
  }
}

if ($branch === '') {
  respond(422, false, 'Выберите адрес филиала.');
}

if (stringLength($branch) > BRANCH_MAX_LENGTH) {
  respond(422, false, 'Поле "Адрес" слишком длинное.');
}

if (containsLink($branch)) {
  respond(422, false, 'Поле "Адрес" не должно содержать ссылки.');
}

if (!preg_match('/^[\p{L}\p{N}\s.,\/-]+$/u', $branch)) {
  respond(422, false, 'Поле "Адрес" содержит недопустимые символы.');
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

if ($message === '' && $direction === '') {
  respond(422, false, 'Заполните поле "Комментарий" или "Направление".');
}

$contentParts = [
  '<b>Сообщение с сайта БИТ:</b>',
  '<b>Имя</b>: <i>' . escapeHtml($name) . '</i>',
  '<b>Телефон</b>: <i>' . escapeHtml($phone) . '</i>',
];

if ($teacher !== '') {
  $contentParts[] = '<b>Наставник</b>: <i>' . escapeHtml($teacher) . '</i>';
}

if ($direction !== '') {
  $contentParts[] = '<b>Направление</b>: <i>' . escapeHtml($direction) . '</i>';
}

$contentParts[] = '<b>Адрес</b>: <i>' . escapeHtml($branch) . '</i>';

if ($message !== '') {
  $contentParts[] = '<b>Сообщение</b>: <i>' . escapeHtml($message) . '</i>';
}

$telegramConfig = loadTelegramConfig(__DIR__ . '/config.private.php');
$apiToken = getConfigValue($telegramConfig, 'TELEGRAM_BOT_TOKEN');
$chatId = getConfigValue($telegramConfig, 'TELEGRAM_CHAT_ID');

if ($apiToken === '' || $chatId === '') {
  respond(500, false, 'Отправка временно недоступна. Не настроены параметры Telegram.');
}

if (!preg_match('/^\d{7,12}:[A-Za-z0-9_-]{30,}$/', $apiToken)) {
  respond(500, false, 'Отправка временно недоступна. Некорректный токен Telegram.');
}

$data = [
  'chat_id' => $chatId,
  'text' => implode("\n", $contentParts),
  'parse_mode' => 'HTML',
];

$telegramResult = sendTelegramMessage($apiToken, $data);

if (!$telegramResult['success']) {
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

function isConsentAccepted(string $value): bool
{
  return in_array(mbStringToLower($value), ['1', 'yes', 'on', 'true', 'да'], true);
}

function loadTelegramConfig(string $path): array
{
  if (!is_file($path)) {
    return [];
  }

  $config = require $path;
  return is_array($config) ? $config : [];
}

function getConfigValue(array $config, string $key): string
{
  $envValue = getenv($key);
  if (is_string($envValue) && trim($envValue) !== '') {
    return trim($envValue);
  }

  $configValue = $config[$key] ?? '';
  if (is_scalar($configValue)) {
    return trim((string) $configValue);
  }

  return '';
}

function sendTelegramMessage(string $apiToken, array $data): array
{
  $url = 'https://api.telegram.org/bot' . $apiToken . '/sendMessage';
  $payload = http_build_query($data);

  if (function_exists('curl_init')) {
    $curl = curl_init($url);
    if ($curl === false) {
      return ['success' => false, 'error' => 'curl_init_failed'];
    }

    curl_setopt_array($curl, [
      CURLOPT_POST => true,
      CURLOPT_POSTFIELDS => $payload,
      CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_CONNECTTIMEOUT => TELEGRAM_TIMEOUT_SECONDS,
      CURLOPT_TIMEOUT => TELEGRAM_TIMEOUT_SECONDS,
    ]);

    $responseBody = curl_exec($curl);
    $curlError = curl_error($curl);
    $httpCode = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);

    if (!is_string($responseBody) || $responseBody === '' || $curlError !== '' || $httpCode >= 400) {
      return ['success' => false, 'error' => 'telegram_request_failed'];
    }

    return parseTelegramResponse($responseBody);
  }

  $context = stream_context_create([
    'http' => [
      'method' => 'POST',
      'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
      'content' => $payload,
      'timeout' => TELEGRAM_TIMEOUT_SECONDS,
      'ignore_errors' => true,
    ],
  ]);

  $responseBody = @file_get_contents($url, false, $context);
  if (!is_string($responseBody) || $responseBody === '') {
    return ['success' => false, 'error' => 'telegram_request_failed'];
  }

  return parseTelegramResponse($responseBody);
}

function parseTelegramResponse(string $responseBody): array
{
  $decoded = json_decode($responseBody, true);
  if (!is_array($decoded) || ($decoded['ok'] ?? false) !== true) {
    return ['success' => false, 'error' => 'telegram_response_not_ok'];
  }

  return ['success' => true];
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

function mbStringToLower(string $value): string
{
  if (function_exists('mb_strtolower')) {
    return mb_strtolower($value, 'UTF-8');
  }

  return strtolower($value);
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
