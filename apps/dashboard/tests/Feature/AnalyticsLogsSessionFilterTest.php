<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ClickHouseClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class AnalyticsLogsSessionFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_logs_rejects_invalid_session_id(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/logs?session_id=bad id!');

        $response->assertStatus(422);
    }

    public function test_logs_applies_session_id_filter_in_clickhouse_query(): void
    {
        $user = User::factory()->create();
        $sessionId = 'sess_abc123';
        $capturedSql = [];

        $client = Mockery::mock(ClickHouseClient::class);
        $client->shouldReceive('selectOne')
            ->once()
            ->andReturnUsing(function (string $sql) use (&$capturedSql) {
                $capturedSql[] = $sql;

                return ['c' => 0];
            });
        $client->shouldReceive('select')
            ->once()
            ->andReturnUsing(function (string $sql) use (&$capturedSql) {
                $capturedSql[] = $sql;

                return [];
            });

        $this->app->instance(ClickHouseClient::class, $client);

        $response = $this->actingAs($user)->getJson('/api/logs?session_id='.$sessionId);

        $response->assertOk();
        $this->assertNotEmpty($capturedSql);
        $this->assertStringContainsString(
            "session_id = '{$sessionId}'",
            implode("\n", $capturedSql),
        );
    }

    public function test_logs_accepts_uuid_session_id(): void
    {
        $user = User::factory()->create();
        $sessionId = '550e8400-e29b-41d4-a716-446655440000';
        $capturedSql = [];

        $client = Mockery::mock(ClickHouseClient::class);
        $client->shouldReceive('selectOne')
            ->once()
            ->andReturn(['c' => 0]);
        $client->shouldReceive('select')
            ->once()
            ->andReturnUsing(function (string $sql) use (&$capturedSql) {
                $capturedSql[] = $sql;

                return [];
            });

        $this->app->instance(ClickHouseClient::class, $client);

        $response = $this->actingAs($user)->getJson('/api/logs?session_id='.$sessionId);

        $response->assertOk();
        $this->assertStringContainsString(
            "session_id = '{$sessionId}'",
            implode("\n", $capturedSql),
        );
    }

    public function test_logs_rejects_invalid_user_id(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/logs?user_id=bad id!');

        $response->assertStatus(422);
    }

    public function test_logs_applies_user_id_filter_in_clickhouse_query(): void
    {
        $user = User::factory()->create();
        $userId = 'user_42';
        $capturedSql = [];

        $client = Mockery::mock(ClickHouseClient::class);
        $client->shouldReceive('selectOne')
            ->once()
            ->andReturnUsing(function (string $sql) use (&$capturedSql) {
                $capturedSql[] = $sql;

                return ['c' => 0];
            });
        $client->shouldReceive('select')
            ->once()
            ->andReturnUsing(function (string $sql) use (&$capturedSql) {
                $capturedSql[] = $sql;

                return [];
            });

        $this->app->instance(ClickHouseClient::class, $client);

        $response = $this->actingAs($user)->getJson('/api/logs?user_id='.$userId);

        $response->assertOk();
        $this->assertStringContainsString(
            "user_id = '{$userId}'",
            implode("\n", $capturedSql),
        );
    }

    public function test_logs_applies_session_and_user_filters_together(): void
    {
        $user = User::factory()->create();
        $sessionId = 'sess_abc123';
        $userId = 'user_42';
        $capturedSql = [];

        $client = Mockery::mock(ClickHouseClient::class);
        $client->shouldReceive('selectOne')
            ->once()
            ->andReturn(['c' => 0]);
        $client->shouldReceive('select')
            ->once()
            ->andReturnUsing(function (string $sql) use (&$capturedSql) {
                $capturedSql[] = $sql;

                return [];
            });

        $this->app->instance(ClickHouseClient::class, $client);

        $response = $this->actingAs($user)->getJson(
            '/api/logs?session_id='.$sessionId.'&user_id='.$userId,
        );

        $response->assertOk();
        $sql = implode("\n", $capturedSql);
        $this->assertStringContainsString("session_id = '{$sessionId}'", $sql);
        $this->assertStringContainsString("user_id = '{$userId}'", $sql);
    }
}
