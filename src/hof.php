<?php
// api/hof.php

header('Content-Type: application/json; charset=utf-8');

// opcjonalnie, jesli frontend i backend na tym samym hostcie, CORS nie jest wymagany
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// dane bazy
$dbHost = 'localhost';
$dbName = 'srv51934_zecer_mkal';
$dbUser = 'srv51934_zecer_mkal';
$dbPass = 'A9SNNj9M4hzZTXwTX5Z7';

try {
    $pdo = new PDO(
        "mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4",
        $dbUser,
        $dbPass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'DB_CONNECTION_FAILED',
        'message' => $e->getMessage(),
    ]);
    exit;
}

// upewniamy się ze tabela istnieje
$pdo->exec("
CREATE TABLE IF NOT EXISTS zecer_hof (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  letters INT UNSIGNED NOT NULL,
  time_ms INT UNSIGNED NOT NULL,
  accuracy TINYINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

function getTop10(PDO $pdo) {
    $stmt = $pdo->query("
        SELECT id, name, letters, time_ms, accuracy, created_at
        FROM zecer_hof
        ORDER BY accuracy DESC, letters DESC, time_ms ASC
        LIMIT 10
    ");
    return $stmt->fetchAll();
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    echo json_encode(getTop10($pdo));
    exit;
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode([
            'error' => 'INVALID_JSON',
            'raw' => $raw,
        ]);
        exit;
    }

    $name = isset($data['name']) ? trim($data['name']) : '';
    $letters = isset($data['letters']) ? (int)$data['letters'] : 0;
    $timeMs = isset($data['timeMs']) ? (int)$data['timeMs'] : 0;
    $accuracy = isset($data['accuracy']) ? (int)$data['accuracy'] : -1;

    if ($name === '' || $letters <= 0 || $timeMs <= 0 || $accuracy < 0 || $accuracy > 100) {
        http_response_code(400);
        echo json_encode([
            'error' => 'INVALID_FIELDS',
            'received' => [
                'name' => $name,
                'letters' => $letters,
                'timeMs' => $timeMs,
                'accuracy' => $accuracy,
            ],
        ]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO zecer_hof (name, letters, time_ms, accuracy)
            VALUES (:name, :letters, :time_ms, :accuracy)
        ");
        $stmt->execute([
            ':name' => $name,
            ':letters' => $letters,
            ':time_ms' => $timeMs,
            ':accuracy' => $accuracy,
        ]);

        $top10 = getTop10($pdo);

        echo json_encode([
            'status' => 'ok',
            'top10' => $top10,
        ]);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'error' => 'DB_INSERT_FAILED',
            'message' => $e->getMessage(),
        ]);
        exit;
    }
}

http_response_code(405);
echo json_encode(['error' => 'METHOD_NOT_ALLOWED']);