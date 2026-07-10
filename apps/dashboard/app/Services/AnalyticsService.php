<?php

namespace App\Services;

use Carbon\Carbon;
use InvalidArgumentException;

class AnalyticsService
{
    public function __construct(
        private readonly ClickHouseClient $clickHouse,
    ) {}

    /**
     * @return array{errors: int, logs: int, total: int}
     */
    public function counts(?string $from = null, ?string $to = null): array
    {
        [$fromDate, $toDate] = $this->resolveDateRange($from, $to);
        $dateFilter = $this->dateFilterSql($fromDate, $toDate);

        $errors = (int) ($this->clickHouse->selectOne(
            "SELECT count() AS c FROM errors WHERE {$dateFilter}"
        )['c'] ?? 0);

        $logs = (int) ($this->clickHouse->selectOne(
            "SELECT count() AS c FROM events WHERE {$dateFilter}"
        )['c'] ?? 0);

        return [
            'errors' => $errors,
            'logs' => $logs,
            'total' => $errors + $logs,
        ];
    }

    /**
     * @return array{
     *     data: list<array<string, mixed>>,
     *     meta: array{page: int, per_page: int, total: int, last_page: int}
     * }
     */
    public function logs(
        ?string $type = null,
        ?string $from = null,
        ?string $to = null,
        int $page = 1,
        int $perPage = 25,
        ?string $sessionId = null,
        ?string $userId = null,
    ): array {
        $page = max(1, $page);
        $perPage = min(100, max(1, $perPage));
        $offset = ($page - 1) * $perPage;

        [$fromDate, $toDate] = $this->resolveDateRange($from, $to);
        $normalizedType = $this->normalizeType($type);
        $normalizedSessionId = $this->normalizeIdentifier($sessionId, 'session_id');
        $normalizedUserId = $this->normalizeIdentifier($userId, 'user_id');

        $unionSql = $this->unionSql(
            $normalizedType,
            $fromDate,
            $toDate,
            $normalizedSessionId,
            $normalizedUserId,
        );

        $total = (int) ($this->clickHouse->selectOne(
            "SELECT count() AS c FROM ({$unionSql})"
        )['c'] ?? 0);

        $rows = $this->clickHouse->select(
            "SELECT * FROM ({$unionSql}) ORDER BY timestamp DESC LIMIT {$perPage} OFFSET {$offset}"
        );

        $data = array_map(fn (array $row): array => [
            'id' => (string) ($row['id'] ?? ''),
            'type' => (string) ($row['type'] ?? ''),
            'timestamp' => (string) ($row['timestamp'] ?? ''),
            'message' => (string) ($row['message'] ?? ''),
            'name' => (string) ($row['name'] ?? ''),
            'url' => (string) ($row['url'] ?? ''),
            'browser' => (string) ($row['browser'] ?? ''),
            'os' => (string) ($row['os'] ?? ''),
        ], $rows);

        return [
            'data' => $data,
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => max(1, (int) ceil($total / $perPage)),
            ],
        ];
    }

    /**
     * Full event payload for the detail drawer (Datadog-style).
     *
     * @return array<string, mixed>|null
     */
    public function findLog(string $type, string $id): ?array
    {
        $normalizedType = $this->normalizeDetailType($type);
        $eventId = $this->assertUuid($id);

        if ($normalizedType === 'error') {
            $row = $this->clickHouse->selectOne(
                <<<SQL
SELECT
    toString(event_id) AS id,
    'error' AS type,
    timestamp,
    message,
    stack_trace,
    error_type,
    url,
    referrer,
    session_id,
    user_id,
    user_agent,
    browser,
    os,
    extra
FROM errors
WHERE event_id = toUUID('{$eventId}')
LIMIT 1
SQL
            );

            if ($row === null) {
                return null;
            }

            return [
                'id' => (string) ($row['id'] ?? ''),
                'type' => 'error',
                'timestamp' => (string) ($row['timestamp'] ?? ''),
                'message' => (string) ($row['message'] ?? ''),
                'name' => (string) ($row['error_type'] ?? ''),
                'stack_trace' => (string) ($row['stack_trace'] ?? ''),
                'url' => (string) ($row['url'] ?? ''),
                'referrer' => (string) ($row['referrer'] ?? ''),
                'session_id' => (string) ($row['session_id'] ?? ''),
                'user_id' => (string) ($row['user_id'] ?? ''),
                'user_agent' => (string) ($row['user_agent'] ?? ''),
                'browser' => (string) ($row['browser'] ?? ''),
                'os' => (string) ($row['os'] ?? ''),
                'extra' => $this->decodeJsonField((string) ($row['extra'] ?? '{}')),
            ];
        }

        $row = $this->clickHouse->selectOne(
            <<<SQL
SELECT
    toString(event_id) AS id,
    'log' AS type,
    timestamp,
    event_name,
    event_type,
    url,
    session_id,
    user_id,
    properties
FROM events
WHERE event_id = toUUID('{$eventId}')
LIMIT 1
SQL
        );

        if ($row === null) {
            return null;
        }

        return [
            'id' => (string) ($row['id'] ?? ''),
            'type' => 'log',
            'timestamp' => (string) ($row['timestamp'] ?? ''),
            'message' => (string) ($row['event_name'] ?? ''),
            'name' => (string) ($row['event_type'] ?? ''),
            'stack_trace' => '',
            'url' => (string) ($row['url'] ?? ''),
            'referrer' => '',
            'session_id' => (string) ($row['session_id'] ?? ''),
            'user_id' => (string) ($row['user_id'] ?? ''),
            'user_agent' => '',
            'browser' => '',
            'os' => '',
            'extra' => $this->decodeJsonField((string) ($row['properties'] ?? '{}')),
        ];
    }

    private function normalizeType(?string $type): ?string
    {
        if ($type === null || $type === '' || $type === 'all') {
            return null;
        }

        $type = strtolower($type);

        if (! in_array($type, ['error', 'log'], true)) {
            throw new InvalidArgumentException('Invalid type. Allowed: error, log, all.');
        }

        return $type;
    }

    private function normalizeDetailType(string $type): string
    {
        $type = strtolower($type);

        if (! in_array($type, ['error', 'log'], true)) {
            throw new InvalidArgumentException('Invalid type. Allowed: error, log.');
        }

        return $type;
    }

    private function assertUuid(string $id): string
    {
        if (! preg_match('/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/', $id)) {
            throw new InvalidArgumentException('Invalid event id.');
        }

        return strtolower($id);
    }

    private function normalizeIdentifier(?string $value, string $field): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $value = trim($value);

        if (! preg_match('/^[a-zA-Z0-9_-]{1,128}$/', $value)) {
            throw new InvalidArgumentException("Invalid {$field}.");
        }

        return $value;
    }

    private function escapeSqlString(string $value): string
    {
        return str_replace("'", "''", $value);
    }

    private function equalityFilter(string $column, ?string $value): string
    {
        return $value !== null
            ? " AND {$column} = '".$this->escapeSqlString($value)."'"
            : '';
    }

    /**
     * @return array<string, mixed>|list<mixed>
     */
    private function decodeJsonField(string $value): array
    {
        if ($value === '') {
            return [];
        }

        try {
            $decoded = json_decode($value, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return ['_raw' => $value];
        }

        return is_array($decoded) ? $decoded : ['_value' => $decoded];
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function resolveDateRange(?string $from, ?string $to): array
    {
        $toDate = $to
            ? Carbon::parse($to)->utc()
            : Carbon::now('UTC');

        $fromDate = $from
            ? Carbon::parse($from)->utc()
            : $toDate->copy()->subDays(7)->startOfDay();

        if ($fromDate->greaterThan($toDate)) {
            throw new InvalidArgumentException('from must be before or equal to to.');
        }

        return [$fromDate, $toDate];
    }

    private function dateFilterSql(Carbon $from, Carbon $to): string
    {
        $fromSql = $from->format('Y-m-d H:i:s.v');
        $toSql = $to->format('Y-m-d H:i:s.v');

        return "timestamp >= toDateTime64('{$fromSql}', 3, 'UTC') AND timestamp <= toDateTime64('{$toSql}', 3, 'UTC')";
    }

    private function unionSql(
        ?string $type,
        Carbon $from,
        Carbon $to,
        ?string $sessionId = null,
        ?string $userId = null,
    ): string {
        $dateFilter = $this->dateFilterSql($from, $to);
        $sessionFilter = $this->equalityFilter('session_id', $sessionId);
        $userFilter = $this->equalityFilter('user_id', $userId);
        $extraFilters = "{$sessionFilter}{$userFilter}";

        $errorsSql = <<<SQL
SELECT
    toString(event_id) AS id,
    'error' AS type,
    timestamp,
    message,
    error_type AS name,
    url,
    browser,
    os
FROM errors
WHERE {$dateFilter}{$extraFilters}
SQL;

        $logsSql = <<<SQL
SELECT
    toString(event_id) AS id,
    'log' AS type,
    timestamp,
    event_name AS message,
    event_type AS name,
    url,
    '' AS browser,
    '' AS os
FROM events
WHERE {$dateFilter}{$extraFilters}
SQL;

        return match ($type) {
            'error' => $errorsSql,
            'log' => $logsSql,
            default => "{$errorsSql} UNION ALL {$logsSql}",
        };
    }
}
