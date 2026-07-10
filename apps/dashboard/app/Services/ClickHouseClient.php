<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class ClickHouseClient
{
    private string $baseUrl;

    private string $database;

    private string $username;

    private string $password;

    private int $timeoutSeconds;

    public function __construct()
    {
        $host = config('services.clickhouse.host', '127.0.0.1');
        $port = config('services.clickhouse.port', 8123);

        $this->baseUrl = "http://{$host}:{$port}";
        $this->database = (string) config('services.clickhouse.database', 'iseeyou');
        $this->username = (string) config('services.clickhouse.username', 'iseeyou');
        $this->password = (string) config('services.clickhouse.password', '');
        $this->timeoutSeconds = (int) config('services.clickhouse.timeout', 30);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function select(string $sql): array
    {
        try {
            $response = Http::timeout($this->timeoutSeconds)
                ->withBasicAuth($this->username, $this->password)
                ->withQueryParameters([
                    'database' => $this->database,
                    'default_format' => 'JSON',
                ])
                ->withBody($sql, 'text/plain')
                ->post($this->baseUrl);
        } catch (ConnectionException $exception) {
            throw new RuntimeException('ClickHouse connection failed: '.$exception->getMessage(), 0, $exception);
        }

        if ($response->failed()) {
            throw new RuntimeException('ClickHouse query failed: '.$response->body());
        }

        /** @var array{data?: list<array<string, mixed>>} $payload */
        $payload = $response->json();

        return $payload['data'] ?? [];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function selectOne(string $sql): ?array
    {
        $rows = $this->select($sql);

        return $rows[0] ?? null;
    }
}
