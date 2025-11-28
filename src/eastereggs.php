<?php
// /api/eastereggs.php

header("Content-Type: application/json; charset=utf-8");

// Opcjonalne, jezeli panel i api sa na tej samej domenie, mozesz pominac CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// Konfiguracja bazy
$db_host = "localhost";
$db_name = "srv51934_zecer_mkal";
$db_user = "srv51934_zecer_mkal";
$db_pass = "A9SNNj9M4hzZTXwTX5Z7";

// Polacz z baza
try {
    $pdo = new PDO(
        "mysql:host={$db_host};dbname={$db_name};charset=utf8mb4",
        $db_user,
        $db_pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection error"]);
    exit;
}

// GET - zwroc liste easter eggow
if ($_SERVER["REQUEST_METHOD"] === "GET") {
    try {
        $stmt = $pdo->query("SELECT id, trigger_word AS trigger, url FROM zecer_eastereggs ORDER BY id ASC");
        $eggs = $stmt->fetchAll();
        echo json_encode($eggs);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "DB query error"]);
    }
    exit;
}

// POST - zapisz nowa liste easter eggow
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $raw = file_get_contents("php://input");
    if (!$raw) {
        http_response_code(400);
        echo json_encode(["error" => "Empty body"]);
        exit;
    }

    $data = json_decode($raw, true);
    if (!is_array($data) || !isset($data["eggs"]) || !is_array($data["eggs"])) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid payload"]);
        exit;
    }

    $eggs = [];
    foreach ($data["eggs"] as $row) {
        $trigger = isset($row["trigger"]) ? trim($row["trigger"]) : "";
        $url = isset($row["url"]) ? trim($row["url"]) : "";
        if ($trigger !== "" && $url !== "") {
            $eggs[] = [
                "trigger" => $trigger,
                "url" => $url,
            ];
        }
    }

    try {
        $pdo->beginTransaction();

        // najprostszy model: kasujemy stare, wstawiamy aktualna konfiguracje
        $pdo->exec("DELETE FROM zecer_eastereggs");

        if (!empty($eggs)) {
            $stmt = $pdo->prepare(
                "INSERT INTO zecer_eastereggs (trigger_word, url) VALUES (:trigger_word, :url)"
            );

            foreach ($eggs as $e) {
                $stmt->execute([
                    ":trigger_word" => $e["trigger"],
                    ":url" => $e["url"],
                ]);
            }
        }

        $pdo->commit();

        // zwroc to, co faktycznie siedzi w bazie
        $stmt = $pdo->query("SELECT id, trigger_word AS trigger, url FROM zecer_eastereggs ORDER BY id ASC");
        $saved = $stmt->fetchAll();
        echo json_encode($saved);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode(["error" => "DB write error"]);
    }

    exit;
}

// inne metody
http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);